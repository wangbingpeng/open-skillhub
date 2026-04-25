import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// 上传技能请求体验证 schema
const uploadSkillSchema = z.object({
  name: z.string().min(1, "技能名称不能为空").max(100, "技能名称不能超过100字符"),
  slug: z.string().min(1, "Slug不能为空").max(100, "Slug不能超过100字符"),
  description: z.string().min(1, "描述不能为空").max(500, "描述不能超过500字符"),
  categoryId: z.string().min(1, "请选择分类"),
  version: z.string().default("1.0.0"),
  tags: z.string().optional(), // JSON 字符串
});

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// 保存上传的文件
async function saveFile(file: File, skillSlug: string): Promise<{ filename: string; filepath: string; size: number; mimeType: string }> {
  await ensureUploadDir();
  
  const timestamp = Date.now();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${timestamp}-${safeFilename}`;
  const skillDir = path.join(UPLOAD_DIR, skillSlug);
  
  if (!existsSync(skillDir)) {
    await mkdir(skillDir, { recursive: true });
  }
  
  const filepath = path.join(skillDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));
  
  return {
    filename: file.name,
    filepath: `/uploads/${skillSlug}/${filename}`,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}

// 读取文件内容（用于 Markdown 文件）
async function readFileContent(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

// 检查文件是否为 Markdown
function isMarkdownFile(filename: string): boolean {
  const ext = filename.toLowerCase();
  return ext.endsWith('.md') || ext.endsWith('.markdown') || ext.endsWith('.txt');
}

// 检查文件是否为主技能文件（优先级最高）
function isMainSkillFile(filename: string): boolean {
  const name = filename.toUpperCase();
  // SKILL.md 或包含 SKILL 的文件
  if (name.includes('SKILL') && !name.includes('EXAMPLE') && !name.includes('EXAMPLES')) {
    return true;
  }
  // README.md 或 INDEX.md
  const baseName = filename.replace(/\.(md|markdown|txt)$/i, '').toUpperCase();
  if (baseName === 'README' || baseName === 'INDEX') {
    return true;
  }
  return false;
}

// 计算文件作为主内容的优先级分数（越高越优先）
function getSkillContentPriority(filename: string): number {
  const name = filename.toUpperCase();
  
  // 最高优先级：SKILL.md 或类似的明确主文件
  if (name.includes('SKILL') && !name.includes('EXAMPLE') && !name.includes('EXAMPLES')) {
    return 100;
  }
  
  // 高优先级：README 或 INDEX
  const baseName = filename.replace(/\.(md|markdown|txt)$/i, '').toUpperCase();
  if (baseName === 'README' || baseName === 'INDEX') {
    return 90;
  }
  
  // 中等优先级：不包含特定关键词的普通文件
  const lowerKeywords = ['EXAMPLE', 'EXAMPLES', 'SAMPLE', 'DEMO', 'TEST', 'DOC', 'DOCS', 'GUIDE', 'TUTORIAL'];
  for (const keyword of lowerKeywords) {
    if (name.includes(keyword)) {
      return 10; // 较低优先级
    }
  }
  
  // 默认优先级
  return 50;
}

// 选择最佳的主内容文件
function selectMainContentFile(files: File[]): File | null {
  const markdownFiles = files.filter(f => isMarkdownFile(f.name));
  
  if (markdownFiles.length === 0) {
    return null;
  }
  
  if (markdownFiles.length === 1) {
    return markdownFiles[0];
  }
  
  // 多个 Markdown 文件时，按优先级选择
  let bestFile: File | null = null;
  let bestPriority = -1;
  
  for (const file of markdownFiles) {
    const priority = getSkillContentPriority(file.name);
    if (priority > bestPriority) {
      bestPriority = priority;
      bestFile = file;
    }
  }
  
  return bestFile;
}

/**
 * POST /api/skills/upload
 * 上传文件创建技能
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否登录
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 解析 multipart/form-data
    const formData = await request.formData();
    
    // 验证表单数据
    const validatedData = uploadSkillSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      categoryId: formData.get("categoryId"),
      version: formData.get("version"),
      tags: formData.get("tags"),
    });

    // 获取所有上传的文件
    const files: File[] = [];
    const formFiles = formData.getAll("files");
    for (const f of formFiles) {
      if (f instanceof File) {
        files.push(f);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "请至少上传一个文件" },
        { status: 400 }
      );
    }

    // 解析标签
    let tagNames: string[] = [];
    try {
      tagNames = JSON.parse(validatedData.tags || "[]");
    } catch {
      tagNames = [];
    }

    // 查找或创建标签
    const tagConnections = await Promise.all(
      tagNames.map(async (tagName) => {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        return { id: tag.id };
      })
    );

    // 智能提取 Markdown 内容
    // 优先选择 SKILL.md 或类似的明确主文件，而非 examples.md 等辅助文件
    const mainContentFile = selectMainContentFile(files);
    let content = "";
    
    if (mainContentFile) {
      content = await readFileContent(mainContentFile);
      console.log(`[Upload] 选择主内容文件: ${mainContentFile.name} (优先级: ${getSkillContentPriority(mainContentFile.name)})`);
    }

    // 如果没有 Markdown 内容，生成默认内容
    if (!content) {
      content = `# ${validatedData.name}\n\n${validatedData.description}\n\n## 附件\n\n`;
      files.forEach((file, index) => {
        content += `${index + 1}. ${file.name}\n`;
      });
    }

    // 预校验：检查分类是否存在
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "所选分类不存在", details: `categoryId: ${validatedData.categoryId}` },
        { status: 400 }
      );
    }

    // 预校验：检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在，请重新登录" },
        { status: 401 }
      );
    }

    // 检查 slug 是否已存在
    const existingSkill = await prisma.skill.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingSkill) {
      return NextResponse.json(
        { error: "技能标识符已存在，请更换" },
        { status: 409 }
      );
    }

    // 保存所有文件并创建附件记录
    const attachmentsData = await Promise.all(
      files.map(async (file) => {
        const saved = await saveFile(file, validatedData.slug);
        return {
          filename: saved.filename,
          filepath: saved.filepath,
          size: saved.size,
          mimeType: saved.mimeType,
        };
      })
    );

    // 创建技能记录
    const skill = await prisma.skill.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        content,
        version: validatedData.version,
        categoryId: validatedData.categoryId,
        authorId: session.user.id,
        status: "PUBLISHED",
        tags: {
          connect: tagConnections,
        },
        attachments: {
          create: attachmentsData,
        },
        versions: {
          create: {
            version: validatedData.version,
            content,
            changelog: "初始版本",
          },
        },
      },
      include: {
        category: true,
        tags: true,
        attachments: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: skill,
      message: "技能发布成功",
    }, { status: 201 });

  } catch (error) {
    console.error("Upload skill error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    // 返回更详细的错误信息（仅在开发环境）
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    
    return NextResponse.json(
      { error: "上传技能失败", details: errorMessage },
      { status: 500 }
    );
  }
}

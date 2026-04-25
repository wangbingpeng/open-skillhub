import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * GET /api/skills/[slug]/download
 * 下载技能全部内容（ZIP 格式），包含技能 Markdown 和所有附件，并增加下载计数
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const skill = await prisma.skill.findUnique({
      where: { slug },
      include: {
        attachments: true,
      },
    });

    if (!skill) {
      return NextResponse.json(
        { error: "技能不存在" },
        { status: 404 }
      );
    }

    // 增加下载计数
    await prisma.skill.update({
      where: { id: skill.id },
      data: { downloads: { increment: 1 } },
    });

    const zip = new JSZip();

    // 1. 添加技能主内容 Markdown
    const safeName = skill.slug || skill.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, "_");

    if (skill.content) {
      zip.file(`${safeName}_SKILL.md`, skill.content);
    }

    if (skill.installation) {
      zip.file(`${safeName}_USAGE.md`, skill.installation);
    }

    // 2. 添加所有附件
    if (skill.attachments && skill.attachments.length > 0) {
      const uploadDir = path.join(process.cwd(), "uploads");

      for (const attachment of skill.attachments) {
        // filepath 格式: /uploads/{slug}/{timestamp}-{filename}
        const relativePath = attachment.filepath.replace(/^\/uploads\//, "");
        const absolutePath = path.join(uploadDir, relativePath);

        if (existsSync(absolutePath)) {
          const fileBuffer = await readFile(absolutePath);
          // 附件 filename 可能含子目录（如 cloud-migration-skill/examples.md），直接保留
          zip.file(attachment.filename, fileBuffer);
        }
      }
    }

    // 3. 生成 ZIP 并返回
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const filename = `${safeName}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Download skill error:", error);
    return NextResponse.json(
      { error: "下载失败" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";
import slugify from "slugify";

// 创建知识库请求体校验
const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称最多100字"),
  description: z.string().max(500, "描述最多500字").optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"),
});

/**
 * GET /api/knowledge - 获取当前用户的知识库列表
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 查询：当前用户自己的知识库 + 所有公共知识库
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: {
        OR: [
          { authorId: session.user.id },
          { visibility: "PUBLIC" },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { documents: true },
        },
        author: {
          select: { id: true, name: true },
        },
      },
    });

    // OR 查询可能导致重复（自己创建的公共知识库），按 id 去重
    const uniqueMap = new Map<string, typeof knowledgeBases[number]>();
    for (const kb of knowledgeBases) {
      uniqueMap.set(kb.id, kb);
    }
    const dedupedBases = Array.from(uniqueMap.values());

    return NextResponse.json({ knowledgeBases: dedupedBases });
  } catch (error) {
    console.error("获取知识库列表失败:", error);
    return NextResponse.json(
      { error: "获取知识库列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge - 创建知识库
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createKnowledgeBaseSchema.parse(body);

    // 生成 slug
    let slug = slugify(validatedData.name, { lower: true, strict: true });

    // 如果 slug 为空（比如纯中文名称），用时间戳作为 slug
    if (!slug) {
      slug = `kb-${Date.now().toString(36)}`;
    }

    // 检查 slug 是否已存在，如果存在则添加随机后缀
    const existing = await prisma.knowledgeBase.findUnique({
      where: { slug },
    });

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // 创建知识库
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || "",
        visibility: validatedData.visibility,
        slug,
        authorId: session.user.id,
      },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_KNOWLEDGE_BASE",
      targetType: "KnowledgeBase",
      targetId: knowledgeBase.id,
      detail: { name: knowledgeBase.name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(knowledgeBase, { status: 201 });
  } catch (error) {
    console.error("创建知识库失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "创建知识库失败" },
      { status: 500 }
    );
  }
}

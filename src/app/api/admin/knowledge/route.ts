import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  keyword: z.string().optional(),
});

/**
 * GET /api/admin/knowledge
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      keyword: searchParams.get("keyword") || undefined,
    });

    const where: any = {};
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }

    const [total, knowledgeBases] = await Promise.all([
      prisma.knowledgeBase.count({ where }),
      prisma.knowledgeBase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          author: { select: { id: true, name: true, username: true } },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: knowledgeBases,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error("Admin knowledge error:", error);
    return NextResponse.json({ error: "获取知识库列表失败" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  role: z.enum(["USER", "EDITOR", "ADMIN"]).optional(),
  keyword: z.string().optional(),
});

/**
 * GET /api/admin/users
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
      role: searchParams.get("role") || undefined,
      keyword: searchParams.get("keyword") || undefined,
    });

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword } },
        { name: { contains: query.keyword } },
        { email: { contains: query.keyword } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true, username: true, name: true, email: true, role: true,
          department: true, avatar: true, createdAt: true,
          _count: { select: { skills: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}

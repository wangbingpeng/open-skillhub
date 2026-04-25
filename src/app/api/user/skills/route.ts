import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/skills - 获取当前用户的技能列表
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      );
    }

    const skills = await prisma.skill.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            favorites: true,
            comments: true,
          },
        },
      },
    });

    return NextResponse.json(skills);
  } catch (error) {
    console.error("Failed to fetch user skills:", error);
    return NextResponse.json(
      { message: "获取技能列表失败" },
      { status: 500 }
    );
  }
}

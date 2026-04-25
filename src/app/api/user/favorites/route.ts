import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/favorites - 获取当前用户的收藏列表
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      );
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            author: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Failed to fetch user favorites:", error);
    return NextResponse.json(
      { message: "获取收藏列表失败" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/skills/[slug]/favorite
 * 获取当前用户是否已收藏，以及收藏总数
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug } = await params;

    // 查找技能
    const skill = await prisma.skill.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!skill) {
      return NextResponse.json(
        { error: "技能不存在" },
        { status: 404 }
      );
    }

    // 获取收藏总数
    const favoritesCount = await prisma.favorite.count({
      where: { skillId: skill.id },
    });

    // 如果用户已登录，检查是否已收藏
    let isFavorited = false;
    if (session?.user?.id) {
      const existingFavorite = await prisma.favorite.findUnique({
        where: {
          skillId_userId: {
            skillId: skill.id,
            userId: session.user.id,
          },
        },
      });
      isFavorited = !!existingFavorite;
    }

    return NextResponse.json({
      data: {
        isFavorited,
        count: favoritesCount,
      },
    });
  } catch (error) {
    console.error("Get favorite status error:", error);
    return NextResponse.json(
      { error: "获取收藏状态失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/skills/[slug]/favorite
 * 收藏/取消收藏（toggle，需要认证）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { slug } = await params;

    // 查找技能
    const skill = await prisma.skill.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!skill) {
      return NextResponse.json(
        { error: "技能不存在" },
        { status: 404 }
      );
    }

    // 检查是否已收藏
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        skillId_userId: {
          skillId: skill.id,
          userId: session.user.id,
        },
      },
    });

    if (existingFavorite) {
      // 已收藏，取消收藏
      await prisma.favorite.delete({
        where: {
          skillId_userId: {
            skillId: skill.id,
            userId: session.user.id,
          },
        },
      });

      // 获取最新的收藏数
      const favoritesCount = await prisma.favorite.count({
        where: { skillId: skill.id },
      });

      return NextResponse.json({
        data: {
          isFavorited: false,
          count: favoritesCount,
        },
        message: "已取消收藏",
      });
    } else {
      // 未收藏，添加收藏
      await prisma.favorite.create({
        data: {
          skillId: skill.id,
          userId: session.user.id,
        },
      });

      // 获取最新的收藏数
      const favoritesCount = await prisma.favorite.count({
        where: { skillId: skill.id },
      });

      return NextResponse.json({
        data: {
          isFavorited: true,
          count: favoritesCount,
        },
        message: "收藏成功",
      });
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return NextResponse.json(
      { error: "操作失败" },
      { status: 500 }
    );
  }
}

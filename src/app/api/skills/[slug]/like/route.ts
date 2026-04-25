import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/skills/[slug]/like
 * 获取当前用户是否已点赞，以及点赞总数
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

    // 获取点赞总数
    const likesCount = await prisma.like.count({
      where: { skillId: skill.id },
    });

    // 如果用户已登录，检查是否已点赞
    let isLiked = false;
    if (session?.user?.id) {
      const existingLike = await prisma.like.findUnique({
        where: {
          skillId_userId: {
            skillId: skill.id,
            userId: session.user.id,
          },
        },
      });
      isLiked = !!existingLike;
    }

    return NextResponse.json({
      data: {
        isLiked,
        count: likesCount,
      },
    });
  } catch (error) {
    console.error("Get like status error:", error);
    return NextResponse.json(
      { error: "获取点赞状态失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/skills/[slug]/like
 * 点赞/取消点赞（toggle，需要认证）
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

    // 检查是否已点赞
    const existingLike = await prisma.like.findUnique({
      where: {
        skillId_userId: {
          skillId: skill.id,
          userId: session.user.id,
        },
      },
    });

    if (existingLike) {
      // 已点赞，取消点赞
      await prisma.like.delete({
        where: {
          skillId_userId: {
            skillId: skill.id,
            userId: session.user.id,
          },
        },
      });

      // 获取最新的点赞数
      const likesCount = await prisma.like.count({
        where: { skillId: skill.id },
      });

      return NextResponse.json({
        data: {
          isLiked: false,
          count: likesCount,
        },
        message: "已取消点赞",
      });
    } else {
      // 未点赞，添加点赞
      await prisma.like.create({
        data: {
          skillId: skill.id,
          userId: session.user.id,
        },
      });

      // 获取最新的点赞数
      const likesCount = await prisma.like.count({
        where: { skillId: skill.id },
      });

      return NextResponse.json({
        data: {
          isLiked: true,
          count: likesCount,
        },
        message: "点赞成功",
      });
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return NextResponse.json(
      { error: "操作失败" },
      { status: 500 }
    );
  }
}

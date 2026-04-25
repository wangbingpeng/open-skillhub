import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Activity {
  id: string;
  type: "skill" | "comment" | "favorite";
  title: string;
  description: string;
  createdAt: Date;
  link?: string;
}

// GET /api/user/activities - 获取当前用户的活动记录
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 获取用户发布的技能
    const skills = await prisma.skill.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    // 获取用户的评论
    const comments = await prisma.comment.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        content: true,
        createdAt: true,
        skill: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    // 获取用户的收藏
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        skill: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    // 合并并排序活动记录
    const activities: Activity[] = [
      ...skills.map((skill) => ({
        id: `skill-${skill.id}`,
        type: "skill" as const,
        title: `发布了技能「${skill.name}」`,
        description: "",
        createdAt: skill.createdAt,
        link: `/skills/${skill.slug}`,
      })),
      ...comments.map((comment) => ({
        id: `comment-${comment.id}`,
        type: "comment" as const,
        title: `评论了技能「${comment.skill.name}」`,
        description: comment.content.slice(0, 100) + (comment.content.length > 100 ? "..." : ""),
        createdAt: comment.createdAt,
        link: `/skills/${comment.skill.slug}`,
      })),
      ...favorites.map((favorite) => ({
        id: `favorite-${favorite.id}`,
        type: "favorite" as const,
        title: `收藏了技能「${favorite.skill.name}」`,
        description: "",
        createdAt: favorite.createdAt,
        link: `/skills/${favorite.skill.slug}`,
      })),
    ];

    // 按时间排序，最新的在前
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 只返回前 20 条
    const limitedActivities = activities.slice(0, 20);

    return NextResponse.json(limitedActivities);
  } catch (error) {
    console.error("Failed to fetch user activities:", error);
    return NextResponse.json(
      { message: "获取活动记录失败" },
      { status: 500 }
    );
  }
}

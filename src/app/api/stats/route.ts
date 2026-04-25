import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/stats
 * 获取平台统计数据（需要认证）
 */
export async function GET() {
  try {
    // 验证用户是否登录
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 1. 概览统计
    const [totalSkills, totalUsers, totalViewsAgg, totalDownloadsAgg] = await Promise.all([
      prisma.skill.count({
        where: { status: "PUBLISHED" },
      }),
      prisma.user.count(),
      prisma.skill.aggregate({
        where: { status: "PUBLISHED" },
        _sum: { views: true },
      }),
      prisma.skill.aggregate({
        where: { status: "PUBLISHED" },
        _sum: { downloads: true },
      }),
    ]);

    const totalViews = totalViewsAgg._sum.views || 0;
    const totalDownloads = totalDownloadsAgg._sum.downloads || 0;

    // 2. 热门技能 Top 10（按浏览量排序）
    const topSkills = await prisma.skill.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 10,
      select: {
        name: true,
        slug: true,
        downloads: true,
        views: true,
        _count: {
          select: { favorites: true },
        },
      },
    });

    const topSkillsFormatted = topSkills.map((skill) => ({
      name: skill.name,
      slug: skill.slug,
      downloads: skill.downloads,
      views: skill.views,
      favorites: skill._count.favorites,
    }));

    // 3. 分类分布（SQLite 兼容的 groupBy）
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { skills: true },
        },
      },
    });

    const categoryDistribution = categories
      .map((cat) => ({
        name: cat.name,
        count: cat._count.skills,
      }))
      .filter((cat) => cat.count > 0)
      .sort((a, b) => b.count - a.count);

    // 4. 贡献排行榜 Top 10
    const topContributors = await prisma.user.findMany({
      where: {
        skills: {
          some: { status: "PUBLISHED" },
        },
      },
      include: {
        _count: {
          select: {
            skills: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
      orderBy: {
        skills: {
          _count: "desc",
        },
      },
      take: 10,
    });

    const topContributorsFormatted = topContributors.map((user) => ({
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      skillCount: user._count.skills,
    }));

    // 5. 最新发布的技能
    const recentSkills = await prisma.skill.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        name: true,
        slug: true,
        createdAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    const recentSkillsFormatted = recentSkills.map((skill) => ({
      name: skill.name,
      slug: skill.slug,
      author: skill.author.name,
      createdAt: skill.createdAt.toISOString(),
    }));

    // 返回统计数据
    return NextResponse.json({
      overview: {
        totalSkills,
        totalUsers,
        totalViews,
        totalDownloads,
      },
      topSkills: topSkillsFormatted,
      categoryDistribution,
      topContributors: topContributorsFormatted,
      recentSkills: recentSkillsFormatted,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}

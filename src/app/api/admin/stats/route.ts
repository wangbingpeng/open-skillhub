import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats
 * 管理员专用统计数据
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const [
      totalUsers,
      totalSkills,
      draftSkills,
      archivedSkills,
      totalKnowledge,
      totalPosts,
      openPosts,
      totalViewsAgg,
      totalDownloadsAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.skill.count(),
      prisma.skill.count({ where: { status: "DRAFT" } }),
      prisma.skill.count({ where: { status: "ARCHIVED" } }),
      prisma.knowledgeBase.count(),
      prisma.forumPost.count(),
      prisma.forumPost.count({ where: { status: "OPEN" } }),
      prisma.skill.aggregate({ _sum: { views: true } }),
      prisma.skill.aggregate({ _sum: { downloads: true } }),
    ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, username: true, name: true, email: true, role: true, createdAt: true },
    });

    const recentSkills = await prisma.skill.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        name: true, slug: true, status: true, createdAt: true,
        author: { select: { name: true } },
      },
    });

    const recentPosts = await prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        title: true, slug: true, type: true, status: true, createdAt: true,
        author: { select: { name: true } },
      },
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        totalSkills,
        draftSkills,
        archivedSkills,
        totalKnowledge,
        totalPosts,
        openPosts,
        totalViews: totalViewsAgg._sum.views || 0,
        totalDownloads: totalDownloadsAgg._sum.downloads || 0,
      },
      recentUsers,
      recentSkills,
      recentPosts,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}

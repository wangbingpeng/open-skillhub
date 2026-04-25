import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mockSkillDetail } from "@/lib/mock-detail-data";

/**
 * GET /api/skills/[slug]/versions
 * 获取指定技能的版本历史列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 先从数据库查找技能
    const skill = await prisma.skill.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (skill) {
      // 获取版本历史
      const versions = await prisma.skillVersion.findMany({
        where: { skillId: skill.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          version: true,
          content: true,
          changelog: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ data: versions });
    }

    // 如果是 mock 数据的 slug，返回 mock 版本历史
    if (slug === mockSkillDetail.slug) {
      return NextResponse.json({
        data: mockSkillDetail.versions.map(v => ({
          id: v.id,
          version: v.version,
          content: v.content,
          changelog: v.changelog,
          createdAt: v.createdAt.toISOString(),
        })),
      });
    }

    return NextResponse.json(
      { error: "技能不存在" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Get skill versions error:", error);
    return NextResponse.json(
      { error: "获取版本历史失败" },
      { status: 500 }
    );
  }
}

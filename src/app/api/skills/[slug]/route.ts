import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { mockSkillDetail } from "@/lib/mock-detail-data";

// 更新技能请求体 schema
const updateSkillSchema = z.object({
  name: z.string().min(1, "技能名称不能为空").max(100, "技能名称不能超过100字符").optional(),
  description: z.string().min(1, "描述不能为空").max(500, "描述不能超过500字符").optional(),
  content: z.string().min(1, "内容不能为空").optional(),
  version: z.string().optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  changelog: z.string().optional(),
});

/**
 * GET /api/skills/[slug]
 * 获取技能详情（包含关联数据：作者、分类、标签、版本历史、统计）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 尝试从数据库获取
    const skill = await prisma.skill.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            role: true,
            department: true,
            bio: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        category: true,
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            likes: true,
            favorites: true,
            comments: true,
          },
        },
      },
    });

    if (skill) {
      // 增加浏览量
      await prisma.skill.update({
        where: { id: skill.id },
        data: { views: { increment: 1 } },
      });

      return NextResponse.json({ data: skill });
    }

    // 数据库没有则返回 mock 数据（仅用于开发测试）
    if (slug === mockSkillDetail.slug) {
      return NextResponse.json({ data: mockSkillDetail });
    }

    return NextResponse.json(
      { error: "技能不存在" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Get skill detail error:", error);
    return NextResponse.json(
      { error: "获取技能详情失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/skills/[slug]
 * 更新技能（需要认证，只有作者或管理员可更新）
 * 更新时自动创建 SkillVersion 记录
 */
export async function PUT(
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
    const existingSkill = await prisma.skill.findUnique({
      where: { slug },
      include: {
        tags: true,
      },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: "技能不存在" },
        { status: 404 }
      );
    }

    // 检查权限（只有作者或管理员可以更新）
    const isAuthor = existingSkill.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "无权更新此技能" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateSkillSchema.parse(body);

    // 提取 changelog 和其他数据
    const { changelog, tagIds, ...skillData } = validatedData;

    // 创建版本历史记录（快照当前内容）
    await prisma.skillVersion.create({
      data: {
        skillId: existingSkill.id,
        version: existingSkill.version,
        content: existingSkill.content,
        changelog: changelog || `自动保存版本 ${existingSkill.version}`,
      },
    });

    // 更新技能
    const updateData: any = {
      ...skillData,
      updatedAt: new Date(),
    };

    // 如果提供了 tagIds，更新标签关联
    if (tagIds !== undefined) {
      updateData.tags = {
        set: tagIds.map((id: string) => ({ id })),
      };
    }

    const updatedSkill = await prisma.skill.update({
      where: { id: existingSkill.id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            role: true,
            department: true,
            bio: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        category: true,
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            likes: true,
            favorites: true,
            comments: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: updatedSkill,
      message: "技能更新成功",
    });
  } catch (error) {
    console.error("Update skill error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新技能失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/skills/[slug]
 * 删除技能（需要认证，只有作者或管理员可删除）
 */
export async function DELETE(
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
    const existingSkill = await prisma.skill.findUnique({
      where: { slug },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: "技能不存在" },
        { status: 404 }
      );
    }

    // 检查权限（只有作者或管理员可以删除）
    const isAuthor = existingSkill.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "无权删除此技能" },
        { status: 403 }
      );
    }

    // 删除技能（关联数据会通过 onDelete: Cascade 自动删除）
    await prisma.skill.delete({
      where: { id: existingSkill.id },
    });

    return NextResponse.json({
      message: "技能删除成功",
    });
  } catch (error) {
    console.error("Delete skill error:", error);
    return NextResponse.json(
      { error: "删除技能失败" },
      { status: 500 }
    );
  }
}

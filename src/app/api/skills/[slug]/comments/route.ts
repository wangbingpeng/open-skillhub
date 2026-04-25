import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 创建评论请求体 schema
const createCommentSchema = z.object({
  content: z.string().min(1, "评论内容不能为空").max(2000, "评论内容不能超过2000字符"),
  parentId: z.string().optional(),
});

/**
 * GET /api/skills/[slug]/comments
 * 获取评论列表（含作者信息，支持嵌套回复）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
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

    // 获取所有评论
    const comments = await prisma.comment.findMany({
      where: { skillId: skill.id },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // 构建嵌套结构：分离顶级评论和回复
    const topLevelComments = comments.filter(c => !c.parentId);
    
    // 格式化评论数据
    const formattedComments = topLevelComments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
      replies: comment.replies.map(reply => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        author: reply.author,
        parentId: reply.parentId,
      })),
    }));

    return NextResponse.json({ data: formattedComments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "获取评论列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/skills/[slug]/comments
 * 发表评论（需要认证），支持 parentId 回复
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

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // 如果提供了 parentId，验证父评论是否存在
    if (validatedData.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "回复的评论不存在" },
          { status: 404 }
        );
      }

      // 确保父评论属于当前技能
      if (parentComment.skillId !== skill.id) {
        return NextResponse.json(
          { error: "回复的评论不属于当前技能" },
          { status: 400 }
        );
      }

      // 禁止嵌套回复（只能回复顶级评论）
      if (parentComment.parentId) {
        return NextResponse.json(
          { error: "只能回复顶级评论" },
          { status: 400 }
        );
      }
    }

    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        skillId: skill.id,
        authorId: session.user.id,
        parentId: validatedData.parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: comment,
      message: "评论发表成功",
    }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "发表评论失败" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";
import { PostStatus } from "@prisma/client";

// 更新帖子请求体验校
const updatePostSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字").optional(),
  content: z.string().min(1, "内容不能为空").optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["OPEN", "CLOSED", "RESOLVED"]).optional(),
});

/**
 * GET /api/forum/[slug] - 获取帖子详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 查找帖子
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        slug: true,
        status: true,
        viewCount: true,
        pinned: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        replies: {
          where: { parentId: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            likeCount: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                role: true,
              },
            },
            children: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                content: true,
                likeCount: true,
                createdAt: true,
                updatedAt: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 自动增加浏览量
    await prisma.forumPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Failed to fetch forum post:", error);
    return NextResponse.json(
      { error: "获取帖子详情失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/forum/[slug] - 更新帖子
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { slug } = await params;

    // 查找帖子
    const existingPost = await prisma.forumPost.findUnique({
      where: { slug },
      select: {
        id: true,
        authorId: true,
        title: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 检查权限（作者或管理员）
    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = existingPost.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "无权修改此帖子" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updatePostSchema.parse(body);

    // 构建更新数据
    const updateData: {
      title?: string;
      content?: string;
      tags?: string;
      status?: PostStatus;
    } = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content;
    }
    if (validatedData.tags !== undefined) {
      updateData.tags = validatedData.tags.join(",");
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    // 更新帖子
    const updatedPost = await prisma.forumPost.update({
      where: { id: existingPost.id },
      data: updateData,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "EDIT_POST",
      targetType: "ForumPost",
      targetId: existingPost.id,
      detail: { 
        title: updatedPost.title,
        changedFields: Object.keys(validatedData),
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Failed to update forum post:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新帖子失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forum/[slug] - 删除帖子
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { slug } = await params;

    // 查找帖子
    const existingPost = await prisma.forumPost.findUnique({
      where: { slug },
      select: {
        id: true,
        authorId: true,
        title: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 检查权限（作者或管理员）
    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = existingPost.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "无权删除此帖子" },
        { status: 403 }
      );
    }

    // 删除帖子（级联删除回复由 Prisma schema 配置处理）
    await prisma.forumPost.delete({
      where: { id: existingPost.id },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_POST",
      targetType: "ForumPost",
      targetId: existingPost.id,
      detail: { title: existingPost.title },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Failed to delete forum post:", error);
    return NextResponse.json(
      { error: "删除帖子失败" },
      { status: 500 }
    );
  }
}

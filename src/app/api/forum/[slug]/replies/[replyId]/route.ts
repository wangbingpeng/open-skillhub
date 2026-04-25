import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

// 编辑回复请求体验校
const updateReplySchema = z.object({
  content: z.string().min(1, "回复内容不能为空"),
});

/**
 * PUT /api/forum/[slug]/replies/[replyId] - 编辑回复
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; replyId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { slug, replyId } = await params;

    // 验证帖子是否存在
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 查找回复
    const existingReply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: {
        id: true,
        authorId: true,
        content: true,
        postId: true,
      },
    });

    if (!existingReply) {
      return NextResponse.json(
        { error: "回复不存在" },
        { status: 404 }
      );
    }

    // 验证回复是否属于该帖子
    if (existingReply.postId !== post.id) {
      return NextResponse.json(
        { error: "回复不属于该帖子" },
        { status: 400 }
      );
    }

    // 检查权限（只有作者可以编辑）
    const isAuthor = existingReply.authorId === session.user.id;

    if (!isAuthor) {
      return NextResponse.json(
        { error: "无权编辑此回复" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateReplySchema.parse(body);

    // 更新回复
    const updatedReply = await prisma.forumReply.update({
      where: { id: replyId },
      data: {
        content: validatedData.content,
      },
      select: {
        id: true,
        content: true,
        likeCount: true,
        createdAt: true,
        updatedAt: true,
        parentId: true,
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
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "EDIT_REPLY",
      targetType: "ForumReply",
      targetId: replyId,
      detail: {
        postId: post.id,
        postTitle: post.title,
        oldContent: existingReply.content,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(updatedReply);
  } catch (error) {
    console.error("Failed to update forum reply:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "编辑回复失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forum/[slug]/replies/[replyId] - 删除回复
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; replyId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { slug, replyId } = await params;

    // 验证帖子是否存在
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 查找回复
    const existingReply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: {
        id: true,
        authorId: true,
        content: true,
        postId: true,
      },
    });

    if (!existingReply) {
      return NextResponse.json(
        { error: "回复不存在" },
        { status: 404 }
      );
    }

    // 验证回复是否属于该帖子
    if (existingReply.postId !== post.id) {
      return NextResponse.json(
        { error: "回复不属于该帖子" },
        { status: 400 }
      );
    }

    // 检查权限（作者或管理员可以删除）
    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = existingReply.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "无权删除此回复" },
        { status: 403 }
      );
    }

    // 删除回复（级联删除子回复由 Prisma schema 配置处理）
    await prisma.forumReply.delete({
      where: { id: replyId },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_REPLY",
      targetType: "ForumReply",
      targetId: replyId,
      detail: {
        postId: post.id,
        postTitle: post.title,
        content: existingReply.content,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Failed to delete forum reply:", error);
    return NextResponse.json(
      { error: "删除回复失败" },
      { status: 500 }
    );
  }
}

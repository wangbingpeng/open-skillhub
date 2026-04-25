import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

// 创建回复请求体验校
const createReplySchema = z.object({
  content: z.string().min(1, "回复内容不能为空"),
  parentId: z.string().optional(),
});

/**
 * GET /api/forum/[slug]/replies - 获取帖子的回复列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 先通过 slug 找到帖子
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 获取顶级回复（parentId 为 null）
    const replies = await prisma.forumReply.findMany({
      where: {
        postId: post.id,
        parentId: null,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        likeCount: true,
        createdAt: true,
        updatedAt: true,
        postId: true,
        parentId: true,
        authorId: true,
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
            postId: true,
            parentId: true,
            authorId: true,
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
    });

    return NextResponse.json({ replies });
  } catch (error) {
    console.error("Failed to fetch forum replies:", error);
    return NextResponse.json(
      { error: "获取回复列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forum/[slug]/replies - 创建回复
 */
export async function POST(
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

    // 先通过 slug 找到帖子
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      select: { 
        id: true, 
        title: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 检查帖子是否已关闭
    if (post.status === "CLOSED") {
      return NextResponse.json(
        { error: "该帖子已关闭，无法回复" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createReplySchema.parse(body);

    // 验证 parentId 是否存在且属于该帖子
    if (validatedData.parentId) {
      const parentReply = await prisma.forumReply.findUnique({
        where: { id: validatedData.parentId },
        select: { postId: true },
      });

      if (!parentReply) {
        return NextResponse.json(
          { error: "父回复不存在" },
          { status: 400 }
        );
      }

      if (parentReply.postId !== post.id) {
        return NextResponse.json(
          { error: "父回复不属于该帖子" },
          { status: 400 }
        );
      }
    }

    // 创建回复
    const reply = await prisma.forumReply.create({
      data: {
        content: validatedData.content,
        authorId: session.user.id,
        postId: post.id,
        parentId: validatedData.parentId || null,
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
      action: "CREATE_REPLY",
      targetType: "ForumReply",
      targetId: reply.id,
      detail: { 
        postId: post.id,
        postTitle: post.title,
        parentId: validatedData.parentId,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error("Failed to create forum reply:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "创建回复失败" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";
import { PostStatus } from "@prisma/client";

// 关闭/重开帖子请求体验校
const closePostSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "RESOLVED"]),
});

/**
 * POST /api/forum/[slug]/close - 切换帖子状态（关闭/重开/标记已解决）
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

    // 查找帖子
    const existingPost = await prisma.forumPost.findUnique({
      where: { slug },
      select: {
        id: true,
        authorId: true,
        title: true,
        status: true,
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
        { error: "无权操作此帖子" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = closePostSchema.parse(body);

    const newStatus = validatedData.status as PostStatus;
    const oldStatus = existingPost.status;

    // 如果状态没有变化，直接返回
    if (oldStatus === newStatus) {
      return NextResponse.json({
        message: "状态未发生变化",
        status: newStatus,
      });
    }

    // 更新帖子状态
    const updatedPost = await prisma.forumPost.update({
      where: { id: existingPost.id },
      data: {
        status: newStatus,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
      },
    });

    // 确定审计日志动作类型
    let action: "CLOSE_POST" | "REOPEN_POST";
    if (newStatus === "OPEN") {
      action = "REOPEN_POST";
    } else {
      action = "CLOSE_POST";
    }

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action,
      targetType: "ForumPost",
      targetId: existingPost.id,
      detail: {
        title: existingPost.title,
        oldStatus,
        newStatus,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      message: newStatus === "OPEN" ? "帖子已重新打开" : 
               newStatus === "RESOLVED" ? "帖子已标记为已解决" : "帖子已关闭",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Failed to update forum post status:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新帖子状态失败" },
      { status: 500 }
    );
  }
}

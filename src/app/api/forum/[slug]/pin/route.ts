import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";

// 置顶帖子请求体验校
const pinPostSchema = z.object({
  pinned: z.boolean(),
});

/**
 * POST /api/forum/[slug]/pin - 置顶/取消置顶帖子
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

    // 检查是否为管理员
    const isAdmin = session.user.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "只有管理员可以置顶帖子" },
        { status: 403 }
      );
    }

    const { slug } = await params;

    // 查找帖子
    const existingPost = await prisma.forumPost.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        pinned: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = pinPostSchema.parse(body);

    const newPinned = validatedData.pinned;
    const oldPinned = existingPost.pinned;

    // 如果状态没有变化，直接返回
    if (oldPinned === newPinned) {
      return NextResponse.json({
        message: "置顶状态未发生变化",
        pinned: newPinned,
      });
    }

    // 更新帖子置顶状态
    const updatedPost = await prisma.forumPost.update({
      where: { id: existingPost.id },
      data: {
        pinned: newPinned,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        pinned: true,
        updatedAt: true,
      },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "PIN_POST",
      targetType: "ForumPost",
      targetId: existingPost.id,
      detail: {
        title: existingPost.title,
        oldPinned,
        newPinned,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      message: newPinned ? "帖子已置顶" : "帖子已取消置顶",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Failed to update forum post pin status:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "更新帖子置顶状态失败" },
      { status: 500 }
    );
  }
}

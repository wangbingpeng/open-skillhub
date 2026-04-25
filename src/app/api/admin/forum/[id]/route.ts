import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateForumSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "RESOLVED"]).optional(),
  pinned: z.boolean().optional(),
});

/**
 * PUT /api/admin/forum/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateForumSchema.parse(body);

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.pinned !== undefined) updateData.pinned = data.pinned;

    const post = await prisma.forumPost.update({
      where: { id },
      data: updateData,
      select: { id: true, title: true, status: true, pinned: true },
    });

    return NextResponse.json({ data: post, message: "帖子更新成功" });
  } catch (error) {
    console.error("Admin update forum error:", error);
    return NextResponse.json({ error: "更新帖子失败" }, { status: 500 });
  }
}

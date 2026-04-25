import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/knowledge/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.knowledgeBase.delete({ where: { id } });

    return NextResponse.json({ message: "知识库删除成功" });
  } catch (error) {
    console.error("Admin delete knowledge error:", error);
    return NextResponse.json({ error: "删除知识库失败" }, { status: 500 });
  }
}

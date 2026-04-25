import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { deleteDocumentChunks } from "@/lib/chroma";

/**
 * DELETE /api/knowledge/[id]/documents/[docId] - 删除单个文档
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id, docId } = await params;

    // 验证知识库存在
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
      select: { id: true, authorId: true, visibility: true },
    });

    if (!knowledgeBase) {
      return NextResponse.json(
        { error: "知识库不存在" },
        { status: 404 }
      );
    }

    // 删除文档仅作者或管理员可操作（公共知识库也只有作者能删）
    const isAdmin = session.user.role === "ADMIN";
    const isOwner = knowledgeBase.authorId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "无权删除此知识库的文档" },
        { status: 403 }
      );
    }

    // 查询文档是否存在且属于该知识库
    const document = await prisma.document.findFirst({
      where: {
        id: docId,
        knowledgeBaseId: id,
      },
      select: {
        id: true,
        originalName: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "文档不存在" },
        { status: 404 }
      );
    }

    // 删除 Chroma 中的向量数据
    await deleteDocumentChunks(id, docId);

    // 删除文档（cascade 删除 chunks）
    await prisma.document.delete({
      where: { id: docId },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_DOCUMENT",
      targetType: "Document",
      targetId: document.id,
      detail: { originalName: document.originalName, knowledgeBaseId: id },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除文档失败:", error);
    return NextResponse.json(
      { error: "删除文档失败" },
      { status: 500 }
    );
  }
}

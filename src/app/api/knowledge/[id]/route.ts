import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { deleteCollection } from "@/lib/chroma";

/**
 * GET /api/knowledge/[id] - 获取知识库详情及文档列表
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 查询知识库详情，包含文档列表
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            status: true,
            error: true,
            createdAt: true,
            updatedAt: true,
            uploader: {
              select: { id: true, name: true, username: true },
            },
            _count: {
              select: { chunks: true },
            },
          },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json(
        { error: "知识库不存在" },
        { status: 404 }
      );
    }

    // 权限校验：私有知识库仅作者可访问，公共知识库所有人可查看
    const isOwner = knowledgeBase.authorId === session.user.id;
    if (!isOwner && knowledgeBase.visibility === "PRIVATE") {
      return NextResponse.json(
        { error: "无权访问此知识库" },
        { status: 403 }
      );
    }

    return NextResponse.json({ ...knowledgeBase, isOwner });
  } catch (error) {
    console.error("获取知识库详情失败:", error);
    return NextResponse.json(
      { error: "获取知识库详情失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/knowledge/[id] - 删除知识库
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 查询知识库
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        authorId: true,
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json(
        { error: "知识库不存在" },
        { status: 404 }
      );
    }

    // 检查权限（作者或管理员）
    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = knowledgeBase.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "无权删除此知识库" },
        { status: 403 }
      );
    }

    // 删除 Chroma 中的 Collection
    await deleteCollection(id);

    // 删除知识库（Prisma cascade 自动删除关联的 documents 和 chunks）
    await prisma.knowledgeBase.delete({
      where: { id },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_KNOWLEDGE_BASE",
      targetType: "KnowledgeBase",
      targetId: knowledgeBase.id,
      detail: { name: knowledgeBase.name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("删除知识库失败:", error);
    return NextResponse.json(
      { error: "删除知识库失败" },
      { status: 500 }
    );
  }
}

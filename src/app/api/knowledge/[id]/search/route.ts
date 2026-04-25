import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding";
import { queryChunks } from "@/lib/chroma";
import { generateRAGAnswer, isAIConfigured } from "@/lib/ai";
import { z } from "zod";

// 搜索请求体校验
const searchSchema = z.object({
  query: z.string().min(1, "查询内容不能为空"),
  topK: z.number().min(1).max(50).default(5),
});

/**
 * POST /api/knowledge/[id]/search - 语义检索
 * query 参数：用户查询
 * topK：返回结果数量
 *
 * 查询参数 mode:
 * - "retrieve" (默认): 只返回检索到的 chunk 列表
 * - "ask": 检索后交给 LLM 流式生成综合回答
 */
export async function POST(
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

    // 权限校验：私有知识库仅作者可搜索，公共知识库所有人可搜索
    const isOwner = knowledgeBase.authorId === session.user.id;
    if (!isOwner && knowledgeBase.visibility === "PRIVATE") {
      return NextResponse.json(
        { error: "无权访问此知识库" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { query, topK } = searchSchema.parse(body);

    // 生成查询向量
    const queryEmbedding = await generateEmbedding(query);

    // 使用 Chroma 进行语义检索
    const matchedChunks = await queryChunks(id, queryEmbedding, topK);

    if (matchedChunks.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 批量查询文档名称
    const documentIds = [...new Set(matchedChunks.map((c) => c.documentId))];
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, originalName: true },
    });
    const docNameMap = new Map(documents.map((d: { id: string; originalName: string }) => [d.id, d.originalName]));

    const results = matchedChunks.map((chunk: { content: string; score: number; documentId: string; chunkIndex: number }) => ({
      content: chunk.content,
      score: chunk.score,
      documentId: chunk.documentId,
      documentName: docNameMap.get(chunk.documentId) ?? "未知文档",
      chunkIndex: chunk.chunkIndex,
    }));

    // 判断是否需要 AI 问答模式
    const mode = new URL(request.url).searchParams.get("mode");
    if (mode === "ask") {
      if (!isAIConfigured()) {
        return NextResponse.json(
          { error: "AI 服务未配置，无法使用智能问答功能" },
          { status: 400 }
        );
      }

      // 流式 SSE 响应
      const encoder = new TextEncoder();
      const sources = results.map((r) => ({
        documentName: r.documentName as string,
        content: r.content,
        score: r.score,
      }));
      const stream = new ReadableStream({
        async start(controller) {
          // 先发送检索结果，供前端展示引用来源
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "sources", results })}\n\n`)
          );

          try {
            // 流式生成 AI 回答
            for await (const chunk of generateRAGAnswer(query, sources)) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "answer", content: chunk })}\n\n`)
              );
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "AI 生成失败";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`)
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 普通检索模式：直接返回结果
    return NextResponse.json({ results });
  } catch (error) {
    console.error("语义检索失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "语义检索失败" },
      { status: 500 }
    );
  }
}

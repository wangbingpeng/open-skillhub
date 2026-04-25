import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isAIConfigured, generateSkillDocument } from "@/lib/ai";

/**
 * POST /api/ai/generate-skill
 * 使用 SSE 流式生成技能文档
 */
export async function POST(request: NextRequest) {
  try {
    // 检查用户是否已登录
    const session = await auth();
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: "请先登录" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 检查 AI 是否已配置
    if (!isAIConfigured()) {
      return new Response(
        JSON.stringify({ error: "AI 服务未配置，请联系管理员配置 DASHSCOPE_API_KEY" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "技能名称不能为空" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "技能描述不能为空" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // 发送开始标记
          controller.enqueue(encoder.encode("data: {\"type\":\"start\"}\n\n"));

          // 流式生成文档
          for await (const chunk of generateSkillDocument(name, description)) {
            const data = JSON.stringify({ type: "chunk", content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // 发送结束标记
          controller.enqueue(encoder.encode("data: {\"type\":\"done\"}\n\n"));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "生成失败";
          const data = JSON.stringify({ type: "error", error: errorMessage });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generate skill document error:", error);
    return new Response(
      JSON.stringify({ error: "服务器内部错误" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

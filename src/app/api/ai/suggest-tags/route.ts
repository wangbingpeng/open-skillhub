import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isAIConfigured, suggestTags } from "@/lib/ai";

/**
 * POST /api/ai/suggest-tags
 * 根据技能信息推荐标签
 */
export async function POST(request: NextRequest) {
  try {
    // 检查用户是否已登录
    const session = await auth();
    if (!session?.user) {
      return Response.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 检查 AI 是否已配置
    if (!isAIConfigured()) {
      return Response.json(
        { error: "AI 服务未配置，请联系管理员配置 DASHSCOPE_API_KEY" },
        { status: 503 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { name, description, content } = body;

    if (!name || typeof name !== "string") {
      return Response.json(
        { error: "技能名称不能为空" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return Response.json(
        { error: "技能描述不能为空" },
        { status: 400 }
      );
    }

    // 调用 AI 推荐标签
    const tags = await suggestTags(name, description, content);

    return Response.json({ tags });
  } catch (error) {
    console.error("Suggest tags error:", error);
    const errorMessage = error instanceof Error ? error.message : "推荐标签失败";
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

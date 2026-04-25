import { isAIConfigured, getAIProvider } from "@/lib/ai";

/**
 * GET /api/ai/status
 * 检查 AI 服务是否已配置
 * 这是一个公开端点，不需要登录验证
 */
export async function GET() {
  const configured = isAIConfigured();
  const provider = getAIProvider();

  return Response.json({
    configured,
    provider: configured ? provider : null,
  });
}

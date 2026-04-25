/**
 * Embedding 服务封装
 * 统一通过 OpenAI 兼容的 /v1/embeddings 接口调用
 * 支持 DashScope、OpenAI 等兼容服务
 */

// Embedding 配置
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "dashscope";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-v3";
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || process.env.DASHSCOPE_API_KEY || "";
const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const EMBEDDING_DIMENSIONS = process.env.EMBEDDING_DIMENSIONS ? parseInt(process.env.EMBEDDING_DIMENSIONS, 10) : undefined;

/** Embedding API 响应类型 */
interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/** Embedding API 错误响应类型 */
interface EmbeddingErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * 检查 Embedding 服务是否已配置
 */
export function isEmbeddingConfigured(): boolean {
  return !!EMBEDDING_API_KEY && EMBEDDING_API_KEY.length > 0;
}

/**
 * 获取当前 Embedding 提供商
 */
export function getEmbeddingProvider(): string {
  return EMBEDDING_PROVIDER;
}

/**
 * 构建 Embedding API 请求体
 */
function buildRequestBody(input: string | string[]): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: EMBEDDING_MODEL,
    input,
  };

  // dimensions 参数可选，env 中没配置就不传
  if (EMBEDDING_DIMENSIONS) {
    body.dimensions = EMBEDDING_DIMENSIONS;
  }

  return body;
}

/**
 * 调用 Embedding API
 * @param input 单个文本或文本数组
 * @returns Embedding 响应
 */
async function callEmbeddingAPI(input: string | string[]): Promise<EmbeddingResponse> {
  if (!isEmbeddingConfigured()) {
    throw new Error(
      "Embedding 服务未配置，请在 .env 中设置 EMBEDDING_API_KEY（或 DASHSCOPE_API_KEY）"
    );
  }

  const url = `${EMBEDDING_BASE_URL}/embeddings`;
  const body = buildRequestBody(input);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EMBEDDING_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Embedding API 网络请求失败: ${message}`);
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData: EmbeddingErrorResponse = await response.json();
      if (errorData.error?.message) {
        errorMessage = `${errorMessage} - ${errorData.error.message}`;
      }
    } catch {
      // 如果无法解析 JSON 错误体，尝试读取纯文本
      try {
        const text = await response.text();
        if (text) errorMessage = `${errorMessage} - ${text}`;
      } catch {
        // 忽略
      }
    }
    throw new Error(`Embedding API 调用失败 (${EMBEDDING_PROVIDER}): ${errorMessage}`);
  }

  let data: EmbeddingResponse;
  try {
    data = await response.json();
  } catch {
    throw new Error("Embedding API 响应解析失败：返回内容不是有效的 JSON");
  }

  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error("Embedding API 返回了空的 embedding 数据");
  }

  return data;
}

/**
 * 生成单个文本的 embedding 向量
 * @param text 输入文本
 * @returns embedding 向量（number 数组）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("输入文本不能为空");
  }

  const response = await callEmbeddingAPI(text);
  return response.data[0].embedding;
}

/**
 * 尝试生成 embedding，如果服务未配置或调用失败则返回 null
 * 用于支持文档上传流程的优雅降级
 * 
 * @param texts 输入文本数组
 * @returns embedding 向量数组，或 null（如果服务不可用）
 */
export async function tryGenerateEmbeddings(texts: string[]): Promise<number[][] | null> {
  // 检查服务是否配置
  if (!isEmbeddingConfigured()) {
    console.warn("[Embedding] 服务未配置，跳过向量生成。请在 .env 中设置 EMBEDDING_API_KEY");
    return null;
  }

  try {
    return await generateEmbeddings(texts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Embedding] 向量生成失败:", message);
    return null;
  }
}

/**
 * 批量生成 embedding 向量
 * DashScope 单次最多 10 个 input，超出则分批调用
 * @param texts 输入文本数组
 * @returns embedding 向量数组
 * @throws 如果服务未配置或调用失败
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    throw new Error("输入文本数组不能为空");
  }

  // 过滤空文本
  const validTexts = texts.filter((t) => t && t.trim().length > 0);
  if (validTexts.length === 0) {
    throw new Error("输入文本数组中没有有效文本");
  }

  // DashScope embedding 单次最多 10 个 input
  const BATCH_SIZE = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE);
    const response = await callEmbeddingAPI(batch);
    // 按 index 排序确保顺序一致
    const sorted = response.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map((item) => item.embedding));
  }

  return allEmbeddings;
}

/**
 * 计算两个向量的余弦相似度
 * @param a 向量 a
 * @param b 向量 b
 * @returns 余弦相似度值，范围 [-1, 1]
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`向量维度不一致: ${a.length} vs ${b.length}`);
  }

  if (a.length === 0) {
    throw new Error("向量不能为空");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

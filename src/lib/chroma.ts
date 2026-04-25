/**
 * Chroma 向量数据库客户端封装
 *
 * 每个知识库对应一个 Chroma Collection（以知识库 ID 命名）
 * Collection 中存储文档分块的向量，metadata 记录 documentId / chunkIndex
 */

import { ChromaClient, Collection } from "chromadb";

// Chroma 配置
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

/** 单例客户端 */
let client: ChromaClient | null = null;

/**
 * 获取 Chroma 客户端（单例）
 */
export function getChromaClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({ path: CHROMA_URL });
  }
  return client;
}

/**
 * 知识库 Collection 命名规则：kb_{knowledgeBaseId}
 * 避免与其他用途的 collection 冲突
 */
function collectionName(knowledgeBaseId: string): string {
  return `kb_${knowledgeBaseId}`;
}

/**
 * 获取（或创建）知识库对应的 Collection
 * 显式使用 cosine 距离函数，确保 distance = 1 - similarity，范围 [0, 2]
 * 如果已有 Collection 距离函数不是 cosine，则删除重建
 */
export async function getOrCreateCollection(knowledgeBaseId: string): Promise<Collection> {
  const chroma = getChromaClient();
  const name = collectionName(knowledgeBaseId);

  try {
    // 尝试获取已有 Collection
    const existing = await chroma.getCollection({ name });
    const metadata = existing.metadata as Record<string, string> | null | undefined;

    // 检查距离函数是否为 cosine
    if (metadata?.["hnsw:space"] === "cosine") {
      return existing;
    }

    // 距离函数不是 cosine，需要删除重建
    console.warn(`[Chroma] Collection ${name} 距离函数不是 cosine，删除重建`);
    await chroma.deleteCollection({ name });
  } catch {
    // Collection 不存在，正常，继续创建
  }

  return chroma.createCollection({
    name,
    metadata: { "hnsw:space": "cosine" },
  });
}

/**
 * 获取知识库对应的 Collection（不创建）
 */
export async function getCollection(knowledgeBaseId: string): Promise<Collection | null> {
  const chroma = getChromaClient();
  try {
    return await chroma.getCollection({ name: collectionName(knowledgeBaseId) });
  } catch {
    return null;
  }
}

/**
 * 添加文档分块向量到 Collection
 *
 * @param knowledgeBaseId 知识库 ID
 * @param chunks 分块数据，每项包含 chunkId / content / embedding / documentId / chunkIndex
 */
export async function addChunks(
  knowledgeBaseId: string,
  chunks: Array<{
    chunkId: string;
    content: string;
    embedding: number[];
    documentId: string;
    chunkIndex: number;
  }>
): Promise<void> {
  if (chunks.length === 0) return;

  const collection = await getOrCreateCollection(knowledgeBaseId);

  await collection.add({
    ids: chunks.map((c) => c.chunkId),
    documents: chunks.map((c) => c.content),
    embeddings: chunks.map((c) => c.embedding),
    metadatas: chunks.map((c) => ({
      documentId: c.documentId,
      chunkIndex: c.chunkIndex,
    })),
  });
}

/**
 * 语义检索：根据查询向量搜索最相似的分块
 *
 * @param knowledgeBaseId 知识库 ID
 * @param queryEmbedding 查询向量
 * @param topK 返回结果数量
 * @returns 匹配的分块列表
 */
export async function queryChunks(
  knowledgeBaseId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<
  Array<{
    chunkId: string;
    content: string;
    score: number;
    documentId: string;
    chunkIndex: number;
  }>
> {
  const collection = await getCollection(knowledgeBaseId);
  if (!collection) return [];

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ["documents", "distances", "metadatas"],
  });

  // Chroma query 返回结构：ids[0], documents[0], distances[0], metadatas[0]
  const ids = result.ids?.[0] ?? [];
  const documents = result.documents?.[0] ?? [];
  const distances = result.distances?.[0] ?? [];
  const metadatas = result.metadatas?.[0] ?? [];

  return ids.map((id, i) => ({
    chunkId: id,
    content: documents[i] ?? "",
    // Chroma cosine 距离: distance = 1 - similarity，范围 [0, 2]
    // 转换为相似度: score = 1 - distance，范围 [-1, 1]，截断到 [0, 1]
    score: Math.max(0, 1 - (distances[i] ?? 1)),
    documentId: (metadatas[i] as Record<string, unknown>)?.documentId as string ?? "",
    chunkIndex: (metadatas[i] as Record<string, unknown>)?.chunkIndex as number ?? 0,
  }));
}

/**
 * 删除指定文档的所有分块向量
 *
 * @param knowledgeBaseId 知识库 ID
 * @param documentId 文档 ID
 */
export async function deleteDocumentChunks(
  knowledgeBaseId: string,
  documentId: string
): Promise<void> {
  const collection = await getCollection(knowledgeBaseId);
  if (!collection) return;

  await collection.delete({
    where: { documentId },
  });
}

/**
 * 删除知识库对应的整个 Collection
 *
 * @param knowledgeBaseId 知识库 ID
 */
export async function deleteCollection(knowledgeBaseId: string): Promise<void> {
  const chroma = getChromaClient();
  try {
    await chroma.deleteCollection({ name: collectionName(knowledgeBaseId) });
  } catch {
    // Collection 可能不存在，忽略错误
  }
}

/**
 * 检查 Chroma 服务是否可用
 */
export async function isChromaAvailable(): Promise<boolean> {
  try {
    const chroma = getChromaClient();
    await chroma.heartbeat();
    return true;
  } catch {
    return false;
  }
}

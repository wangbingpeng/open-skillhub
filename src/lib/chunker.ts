/**
 * 递归文本分块器
 * 将长文本按语义边界递归分割为指定大小的文本块
 * 支持段落、行、句子级别的递归分割策略
 */

// 分块配置，从环境变量读取，提供兜底默认值
const DEFAULT_CHUNK_SIZE = process.env.KNOWLEDGE_CHUNK_SIZE
  ? parseInt(process.env.KNOWLEDGE_CHUNK_SIZE, 10)
  : 500;
const DEFAULT_CHUNK_OVERLAP = process.env.KNOWLEDGE_CHUNK_OVERLAP
  ? parseInt(process.env.KNOWLEDGE_CHUNK_OVERLAP, 10)
  : 50;

/** 分隔符列表，按优先级从高到低排列 */
const SEPARATORS = ["\n\n", "\n", ". ", " "];

/**
 * 按指定分隔符分割文本
 * 保留分隔符在前一个片段的末尾
 */
function splitBySeparator(text: string, separator: string): string[] {
  const parts = text.split(separator);
  // 将分隔符附加回每个片段末尾（最后一个除外）
  return parts.map((part, i) =>
    i < parts.length - 1 ? part + separator : part
  );
}

/**
 * 递归分割文本
 * 依次尝试不同粒度的分隔符，直到所有片段都小于 chunkSize
 */
function recursiveSplit(text: string, chunkSize: number, separatorIndex: number): string[] {
  // 文本已经足够小，直接返回
  if (text.length <= chunkSize) {
    return [text];
  }

  // 所有分隔符都用完了，按字符硬截断
  if (separatorIndex >= SEPARATORS.length) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  const separator = SEPARATORS[separatorIndex];
  const parts = splitBySeparator(text, separator);

  // 如果当前分隔符无法分割（只有一个片段且仍然超长），尝试下一级分隔符
  if (parts.length <= 1) {
    return recursiveSplit(text, chunkSize, separatorIndex + 1);
  }

  const result: string[] = [];

  for (const part of parts) {
    if (part.length <= chunkSize) {
      result.push(part);
    } else {
      // 片段仍然太大，用下一级分隔符继续分割
      const subChunks = recursiveSplit(part, chunkSize, separatorIndex + 1);
      result.push(...subChunks);
    }
  }

  return result;
}

/**
 * 将相邻的小片段合并为不超过 chunkSize 的文本块
 */
function mergeSmallChunks(pieces: string[], chunkSize: number): string[] {
  const merged: string[] = [];
  let current = "";

  for (const piece of pieces) {
    if (current.length + piece.length <= chunkSize) {
      current += piece;
    } else {
      if (current.length > 0) {
        merged.push(current);
      }
      current = piece;
    }
  }

  if (current.length > 0) {
    merged.push(current);
  }

  return merged;
}

/**
 * 为相邻 chunk 添加重叠部分，确保上下文连续性
 */
function applyOverlap(chunks: string[], overlap: number): string[] {
  if (overlap <= 0 || chunks.length <= 1) {
    return chunks;
  }

  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1];
    // 从前一个 chunk 的末尾取 overlap 长度的文本作为当前 chunk 的前缀
    const overlapText = prevChunk.slice(-overlap);
    result.push(overlapText + chunks[i]);
  }

  return result;
}

/**
 * 递归文本分块
 *
 * 分块策略（按优先级递归）：
 * 1. 先尝试按 `\n\n`（段落）分割
 * 2. 如果段落仍然超过 chunkSize，按 `\n`（行）分割
 * 3. 如果行仍然超过，按 `. `（句子）分割
 * 4. 最后按字符截断
 *
 * @param text 输入文本
 * @param chunkSize 每个块的最大字符数，默认从 env KNOWLEDGE_CHUNK_SIZE 读取，兜底 500
 * @param overlap 相邻块之间的重叠字符数，默认从 env KNOWLEDGE_CHUNK_OVERLAP 读取，兜底 50
 * @returns 分块后的文本数组
 */
export function chunkText(
  text: string,
  chunkSize?: number,
  overlap?: number
): string[] {
  const size = chunkSize ?? DEFAULT_CHUNK_SIZE;
  const lap = overlap ?? DEFAULT_CHUNK_OVERLAP;

  // 输入校验
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (size <= 0) {
    throw new Error("chunkSize 必须大于 0");
  }

  if (lap < 0) {
    throw new Error("overlap 不能为负数");
  }

  if (lap >= size) {
    throw new Error("overlap 必须小于 chunkSize");
  }

  // 文本足够短，直接返回
  if (text.length <= size) {
    return [text];
  }

  // 递归分割
  const pieces = recursiveSplit(text, size, 0);

  // 合并过小的片段
  const merged = mergeSmallChunks(pieces, size);

  // 添加重叠
  const withOverlap = applyOverlap(merged, lap);

  // 过滤空白 chunk
  return withOverlap.filter((chunk) => chunk.trim().length > 0);
}

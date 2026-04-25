/**
 * 多格式文件内容解析器
 * 支持 txt、md、pdf、docx、csv、json 文件的文本提取
 */

import mammoth from "mammoth";
import { parse as csvParse } from "csv-parse/sync";
import PDFParser from "pdf2json";

/**
 * 扫描版 PDF 错误类
 * 用于区分普通解析错误和扫描版 PDF（无文本层）
 */
export class ScannedPdfError extends Error {
  constructor(message: string = "PDF 内容提取为空，可能是扫描版 PDF（无文本层）") {
    super(message);
    this.name = "ScannedPdfError";
  }
}

/**
 * 使用 pdf2json 解析 PDF Buffer
 * 纯 Node.js 实现，不依赖浏览器 API 或 Web Worker
 */
function parsePdfWithPdf2json(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try { (pdfParser as any).destroy(); } catch { /* ignore */ }
      reject(new Error("PDF 解析超时（30秒），文件可能过大或格式异常"));
    }, 30000);

    let pdfParser: InstanceType<typeof PDFParser>;
    try {
      pdfParser = new PDFParser(null, true);

      pdfParser.on("pdfParser_dataReady", () => {
        clearTimeout(timeout);
        try {
          // 先提取文本，再 destroy
          const text = pdfParser.getRawTextContent();
          try { (pdfParser as any).destroy(); } catch { /* ignore */ }
          resolve(text || "");
        } catch (err) {
          try { (pdfParser as any).destroy(); } catch { /* ignore */ }
          reject(new Error(`PDF 文本提取失败: ${err instanceof Error ? err.message : String(err)}`));
        }
      });

      pdfParser.on("pdfParser_dataError", (errData) => {
        clearTimeout(timeout);
        try { (pdfParser as any).destroy(); } catch { /* ignore */ }
        const error = (errData as { parserError?: Error })?.parserError || errData;
        reject(error instanceof Error ? error : new Error(String(error)));
      });

      pdfParser.parseBuffer(buffer, 0);
    } catch (err) {
      clearTimeout(timeout);
      reject(new Error(`PDF 解析器初始化失败: ${err instanceof Error ? err.message : String(err)}`));
    }
  });
}

/** 支持的 MIME 类型 */
export const SUPPORTED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/json",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/**
 * 检查 MIME 类型是否受支持
 */
export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType);
}

/**
 * 解析纯文本 / Markdown 文件
 */
function parseTextFile(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

/**
 * 解析 PDF 文件，提取文本内容
 * 使用 pdf2json 库，纯 Node.js 实现，不依赖浏览器 API
 */
async function parsePdfFile(buffer: Buffer): Promise<string> {
  console.log("[PDF Parser] 开始解析 PDF, Buffer 大小:", buffer.length);
  
  // 基本检查
  if (!buffer || buffer.length < 5) {
    throw new Error("PDF 文件内容为空或过小");
  }
  
  // 检查 PDF 文件头
  const header = buffer.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF-")) {
    throw new Error("文件不是有效的 PDF 格式（缺少 %PDF- 头）");
  }

  const text = await parsePdfWithPdf2json(buffer);
  
  if (!text || text.trim().length === 0) {
    console.warn("[PDF Parser] PDF 内容提取为空，可能是扫描版 PDF（无文本层）");
    throw new ScannedPdfError();
  }

  console.log("[PDF Parser] PDF 解析成功, 文本长度:", text.length);
  return text;
}

/**
 * 解析 DOCX 文件，提取纯文本内容
 */
async function parseDocxFile(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`DOCX 解析失败: ${message}`);
  }
}

/**
 * 解析 CSV 文件，转为可读文本格式
 * 每行数据格式为 "列名: 值" 的形式
 */
function parseCsvFile(buffer: Buffer): string {
  try {
    const content = buffer.toString("utf-8");
    const records: string[][] = csvParse(content, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    if (records.length === 0) {
      return "";
    }

    // 第一行作为表头
    const headers = records[0];
    const dataRows = records.slice(1);

    if (dataRows.length === 0) {
      // 只有表头，返回表头信息
      return `表头: ${headers.join(", ")}`;
    }

    // 将每行数据转为 "列名: 值" 格式
    const lines = dataRows.map((row, rowIndex) => {
      const fields = row.map((value, colIndex) => {
        const header = headers[colIndex] || `列${colIndex + 1}`;
        return `${header}: ${value}`;
      });
      return `[第${rowIndex + 1}行] ${fields.join(" | ")}`;
    });

    return lines.join("\n");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`CSV 解析失败: ${message}`);
  }
}

/**
 * 解析 JSON 文件，格式化为可读文本
 */
function parseJsonFile(buffer: Buffer): string {
  try {
    const content = buffer.toString("utf-8");
    const data = JSON.parse(content);
    return JSON.stringify(data, null, 2);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`JSON 解析失败: ${message}`);
  }
}

/**
 * 解析文件内容，根据 MIME 类型提取纯文本
 *
 * @param buffer 文件内容 Buffer
 * @param mimeType 文件 MIME 类型
 * @returns 提取的文本内容
 *
 * 支持的文件类型：
 * - text/plain, text/markdown（.txt, .md）
 * - application/pdf（.pdf）
 * - application/vnd.openxmlformats-officedocument.wordprocessingml.document（.docx）
 * - text/csv（.csv）
 * - application/json（.json）
 */
export async function parseFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error("文件内容为空");
  }

  switch (mimeType) {
    case "text/plain":
    case "text/markdown":
      return parseTextFile(buffer);

    case "application/pdf":
      return parsePdfFile(buffer);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocxFile(buffer);

    case "text/csv":
      return parseCsvFile(buffer);

    case "application/json":
      return parseJsonFile(buffer);

    default:
      throw new Error(
        `不支持的文件类型: ${mimeType}。支持的类型: ${SUPPORTED_MIME_TYPES.join(", ")}`
      );
  }
}

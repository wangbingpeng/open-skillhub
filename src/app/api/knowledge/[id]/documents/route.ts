import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFile, isSupportedMimeType, SUPPORTED_MIME_TYPES, ScannedPdfError } from "@/lib/file-parser";
import { chunkText } from "@/lib/chunker";
import { tryGenerateEmbeddings } from "@/lib/embedding";
import { addChunks, isChromaAvailable } from "@/lib/chroma";
import { extractTextFromScannedPdf, isDashScopeConfigured } from "@/lib/ai";

// 文件大小限制：50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * 根据文件扩展名推断 MIME 类型
 * 浏览器可能无法正确识别某些文件的 MIME 类型（如 .md 文件）
 */
function inferMimeType(filename: string, declaredType: string): string {
  // 如果声明的类型有效且不是通用的二进制类型，直接使用
  if (declaredType && declaredType !== "application/octet-stream" && declaredType !== "") {
    return declaredType;
  }
  
  // 根据文件扩展名推断
  const ext = filename.toLowerCase().split(".").pop();
  
  const mimeTypeMap: Record<string, string> = {
    "txt": "text/plain",
    "md": "text/markdown",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "csv": "text/csv",
    "json": "application/json",
  };
  
  return mimeTypeMap[ext || ""] || declaredType || "application/octet-stream";
}

/**
 * POST /api/knowledge/[id]/documents - 上传文档到知识库
 * 支持多文件上传，自动解析、分块、生成向量
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

    // 权限校验：私有知识库仅作者可上传，公共知识库所有人可上传
    const isOwner = knowledgeBase.authorId === session.user.id;
    if (!isOwner && knowledgeBase.visibility === "PRIVATE") {
      return NextResponse.json(
        { error: "无权操作此知识库" },
        { status: 403 }
      );
    }

    // 解析 FormData
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    console.log("[Document Upload] 收到上传请求, 文件数量:", files.length);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "未找到上传的文件" },
        { status: 400 }
      );
    }

    // 处理结果
    const results: Array<{
      filename: string;
      status: "success" | "failed";
      documentId?: string;
      chunksCount?: number;
      error?: string;
    }> = [];

    for (const file of files) {
      const filename = file.name;
      
      // 推断正确的 MIME 类型
      const mimeType = inferMimeType(filename, file.type);
      console.log(`[Document Upload] 处理文件: ${filename}, MIME: ${mimeType} (原始: ${file.type})`);

      try {
        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
          results.push({
            filename,
            status: "failed",
            error: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
          });
          continue;
        }

        // 验证文件类型
        if (!isSupportedMimeType(mimeType)) {
          console.error(`[Document Upload] 不支持的 MIME 类型: ${mimeType}, 支持的类型: ${SUPPORTED_MIME_TYPES.join(", ")}`);
          results.push({
            filename,
            status: "failed",
            error: `不支持的文件类型: ${mimeType}。支持的类型: .txt, .md, .pdf, .docx, .csv, .json`,
          });
          continue;
        }

        // 读取文件 buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 解析文件内容
        console.log(`[Document Upload] 开始解析文件: ${filename}`);
        let content: string;
        try {
          content = await parseFile(buffer, mimeType);
          console.log(`[Document Upload] 文件解析成功, 内容长度: ${content.length}`);
        } catch (parseError) {
          // 特殊处理扫描版 PDF：自动降级到 DashScope OCR
          if (parseError instanceof ScannedPdfError) {
            console.warn(`[Document Upload] 检测到扫描版 PDF: ${filename}，尝试 OCR 提取...`);

            if (!isDashScopeConfigured()) {
              results.push({
                filename,
                status: "failed",
                error: "该 PDF 是扫描版（图片格式），且未配置 DashScope API Key，无法进行 OCR 提取。请配置 DASHSCOPE_API_KEY 或上传含文本层的 PDF。",
              });
              continue;
            }

            try {
              content = await extractTextFromScannedPdf(buffer, filename);
              console.log(`[Document Upload] OCR 提取成功, 内容长度: ${content.length}`);
            } catch (ocrError) {
              const ocrMsg = ocrError instanceof Error ? ocrError.message : String(ocrError);
              console.error(`[Document Upload] OCR 提取失败: ${ocrMsg}`);
              results.push({
                filename,
                status: "failed",
                error: `扫描版 PDF OCR 提取失败: ${ocrMsg}`,
              });
              continue;
            }
          } else {
            throw parseError;
          }
        }

        if (!content || content.trim().length === 0) {
          results.push({
            filename,
            status: "failed",
            error: "文件内容为空，无法处理",
          });
          continue;
        }

        // 创建文档记录（状态：处理中）
        const document = await prisma.document.create({
          data: {
            filename: `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
            originalName: filename,
            mimeType: file.type,
            size: file.size,
            content,
            knowledgeBaseId: id,
            uploaderId: session.user.id,
            status: "PROCESSING",
          },
        });

        try {
          // 文本分块
          const chunks = chunkText(content);
          const chunksToProcess = chunks.length === 0 ? [content] : chunks;

          // 检查 Chroma 服务是否可用
          const chromaReady = await isChromaAvailable();
          if (!chromaReady) {
            await prisma.document.update({
              where: { id: document.id },
              data: {
                status: "FAILED",
                error: "Chroma 向量数据库服务不可用，请确保 Chroma 服务已启动（默认端口 8000）",
              },
            });

            console.error(`[Document Upload] Chroma 服务不可用，文档 ${filename} 标记为 FAILED`);

            results.push({
              filename,
              status: "failed",
              documentId: document.id,
              error: "Chroma 向量数据库服务不可用，请确保 Chroma 服务已启动（默认端口 8000）",
            });
            continue;
          }

          // 生成向量
          const embeddings = await tryGenerateEmbeddings(chunksToProcess);

          if (embeddings) {
            // 创建分块记录（SQLite 只存内容和元数据，不存向量）
            const chunkRecords = await Promise.all(
              chunksToProcess.map((chunkContent, index) =>
                prisma.documentChunk.create({
                  data: {
                    content: chunkContent,
                    chunkIndex: index,
                    documentId: document.id,
                  },
                })
              )
            );

            // 向量写入 Chroma
            await addChunks(
              id, // knowledgeBaseId
              chunkRecords.map((record, index) => ({
                chunkId: record.id,
                content: chunksToProcess[index],
                embedding: embeddings[index],
                documentId: document.id,
                chunkIndex: index,
              }))
            );

            // 更新文档状态为就绪
            await prisma.document.update({
              where: { id: document.id },
              data: { status: "READY" },
            });

            results.push({
              filename,
              status: "success",
              documentId: document.id,
              chunksCount: chunksToProcess.length,
            });
          } else {
            // 向量生成失败，标记文档为失败状态
            await prisma.document.update({
              where: { id: document.id },
              data: {
                status: "FAILED",
                error: "向量生成失败：Embedding 服务未配置或调用失败，请检查 EMBEDDING_API_KEY 配置后重新上传",
              },
            });

            console.error(`[Document Upload] 文档 ${filename} 向量生成失败，文档标记为 FAILED`);

            results.push({
              filename,
              status: "failed",
              documentId: document.id,
              error: "向量生成失败：Embedding 服务未配置或调用失败，请检查 EMBEDDING_API_KEY 配置后重新上传",
            });
          }
        } catch (processingError) {
          // 处理失败，更新文档状态
          const errorMessage = processingError instanceof Error
            ? processingError.message
            : String(processingError);
          
          console.error(`[Document Upload] 处理文档 ${filename} 失败:`, errorMessage);

          await prisma.document.update({
            where: { id: document.id },
            data: {
              status: "FAILED",
              error: errorMessage,
            },
          });

          results.push({
            filename,
            status: "failed",
            documentId: document.id,
            error: errorMessage,
          });
        }
      } catch (fileError) {
        const errorMessage = fileError instanceof Error
          ? fileError.message
          : String(fileError);

        results.push({
          filename,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    // 统计成功和失败数量
    const successCount = results.filter((r) => r.status === "success").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      message: `处理完成：${successCount} 个成功，${failedCount} 个失败`,
      results,
    }, { status: 200 });
  } catch (error) {
    console.error("[Document Upload] 文档上传处理失败:", error);
    // 打印完整的错误堆栈
    if (error instanceof Error) {
      console.error("[Document Upload] 错误堆栈:", error.stack);
    }
    return NextResponse.json(
      { error: "文档上传处理失败", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

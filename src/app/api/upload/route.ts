import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";

// 允许的文件类型
const ALLOWED_MIME_TYPES = [
  // 图片
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // 文档
  "application/pdf",
  "text/markdown",
  "text/plain",
  "text/x-markdown",
  // 代码文件
  "application/json",
  "text/javascript",
  "text/typescript",
  "text/css",
  "text/html",
  "text/yaml",
  "text/xml",
];

// 文件大小限制：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 上传目录
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(request: NextRequest) {
  try {
    // 确保上传目录存在
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "未找到上传的文件" },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}` },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // 生成文件名：时间戳-原始文件名
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedFilename}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // 读取文件内容并写入
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // 返回文件信息
    return NextResponse.json({
      filename: file.name,
      savedFilename: filename,
      filepath: `/uploads/${filename}`,
      url: `/uploads/${filename}`,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "文件上传失败" },
      { status: 500 }
    );
  }
}

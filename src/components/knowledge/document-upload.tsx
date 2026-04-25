"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  knowledgeBaseId: string;
  onUploadComplete: () => void;
}

const ACCEPTED_FORMATS = ".md,.txt,.pdf,.docx,.csv,.json";

export function DocumentUpload({
  knowledgeBaseId,
  onUploadComplete,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<
    { name: string; success: boolean; error?: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!files.length) return;

      setUploading(true);
      setResults([]);

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      try {
        const response = await fetch(
          `/api/knowledge/${knowledgeBaseId}/documents`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json().catch(() => ({}));

        // 后端即使返回 400（全部文件失败），也会包含 results 详情
        if (data.results && Array.isArray(data.results)) {
          const uploadResults = data.results.map(
            (r: { filename: string; status: string; error?: string }) => ({
              name: r.filename,
              success: r.status === "success",
              error: r.error,
            })
          );
          setResults(uploadResults);

          const successCount = uploadResults.filter((r: { success: boolean }) => r.success).length;
          const failedCount = uploadResults.filter((r: { success: boolean }) => !r.success).length;

          if (successCount > 0) {
            toast.success(`成功上传 ${successCount} 个文件`);
            onUploadComplete();
          }
          if (failedCount > 0 && successCount === 0) {
            toast.error(`${failedCount} 个文件上传失败`);
          }
        } else if (!response.ok) {
          // 没有结果详情的错误（如认证失败等）
          throw new Error(data.error || "上传失败");
        }
      } catch (error) {
        const uploadResults = Array.from(files).map((file) => ({
          name: file.name,
          success: false,
          error: error instanceof Error ? error.message : "上传失败",
        }));
        setResults(uploadResults);
        toast.error(error instanceof Error ? error.message : "文件上传失败");
      } finally {
        setUploading(false);
      }
    },
    [knowledgeBaseId, onUploadComplete]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      handleUpload(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      handleUpload(files);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在上传文件...</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                拖拽文件到此处上传
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                支持 .md, .txt, .pdf, .docx, .csv, .json 格式
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              选择文件
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_FORMATS}
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* 上传结果 */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((result, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{result.name}</span>
              {!result.success && result.error && (
                <span className="ml-auto text-xs text-destructive">
                  {result.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

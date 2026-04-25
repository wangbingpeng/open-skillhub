"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DownloadButtonProps {
  slug: string;
}

export function DownloadButton({ slug }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/skills/${slug}/download`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "下载失败" }));
        throw new Error(errorData.error || "下载失败");
      }

      // 获取文件内容
      const blob = await response.blob();

      // 从 Content-Disposition 提取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${slug}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (match) {
          filename = decodeURIComponent(match[1]);
        } else {
          const fallbackMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (fallbackMatch) {
            filename = fallbackMatch[1];
          }
        }
      }

      // 创建下载链接并触发下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("下载成功");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "下载失败");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button size="sm" className="gap-2" onClick={handleDownload} disabled={isDownloading}>
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">下载</span>
    </Button>
  );
}

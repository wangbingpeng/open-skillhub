"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Trash2, Loader2, Lock, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchPanel } from "@/components/knowledge/search-panel";
import { DocumentUpload } from "@/components/knowledge/document-upload";
import { toast } from "sonner";

interface Document {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  status: string;
  error?: string | null;
  uploader?: { id: string; name: string | null; username: string } | null;
  _count: { chunks: number };
  createdAt: string;
}

interface KnowledgeBaseDetail {
  id: string;
  name: string;
  description: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  isOwner: boolean;
  documents: Document[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string, error?: string | null) {
  switch (status) {
    case "READY":
      return <Badge variant="secondary">Ready</Badge>;
    case "PROCESSING":
      return <Badge variant="default">Processing</Badge>;
    case "FAILED":
      return (
        <Badge variant="destructive" title={error || undefined}>
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const response = await fetch(`/api/knowledge/${id}`);
      if (!response.ok) throw new Error("获取知识库详情失败");
      const data = await response.json();
      setDetail(data.knowledgeBase || data);
    } catch (error) {
      toast.error("获取知识库详情失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDeleteDocument = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      const response = await fetch(
        `/api/knowledge/${id}/documents/${docId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "删除失败");
      }
      toast.success("文档已删除");
      fetchDetail();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除文档失败");
    } finally {
      setDeletingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">知识库不存在或已被删除</p>
        <Link href="/knowledge">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部导航 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/knowledge">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {detail.name}
              </h1>
              <Badge variant={detail.visibility === "PUBLIC" ? "default" : "secondary"} className="gap-1">
                {detail.visibility === "PUBLIC" ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {detail.visibility === "PUBLIC" ? "公共" : "个人"}
              </Badge>
            </div>
            {detail.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 搜索面板 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">语义检索</h2>
        <SearchPanel knowledgeBaseId={id} />
      </div>

      <Separator />

      {/* 文档管理 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">文档列表</h2>
          <Badge variant="secondary">
            {detail.documents.length} 篇文档
          </Badge>
        </div>

        {/* 上传区域 - 公共知识库所有人可上传 */}
        <DocumentUpload knowledgeBaseId={id} onUploadComplete={fetchDetail} />

        {/* 文档列表 */}
        {detail.documents.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/50">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              暂无文档，请上传文件
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {detail.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/50"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {doc.originalName}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {doc._count.chunks} chunks
                    </Badge>
                    {getStatusBadge(doc.status, doc.error)}
                    {doc.status === "FAILED" && doc.error && (
                      <span className="text-xs text-destructive/80 truncate max-w-[200px]" title={doc.error}>
                        {doc.error}
                      </span>
                    )}
                    {doc.uploader && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.uploader.name || doc.uploader.username}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                </div>
                {/* 删除按钮仅 owner 可见 */}
                {detail.isOwner && (
                  <Dialog>
                    <DialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={deletingDocId === doc.id}
                        />
                      }
                    >
                      {deletingDocId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>确认删除文档</DialogTitle>
                        <DialogDescription>
                          确定要删除文档「{doc.originalName}」吗？此操作不可恢复。
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose render={<Button variant="outline" />}>
                          取消
                        </DialogClose>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          确认删除
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

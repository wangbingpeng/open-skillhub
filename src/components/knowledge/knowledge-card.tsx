"use client";

import Link from "next/link";
import { Database, FileText, Trash2, Loader2, Lock, Globe } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface KnowledgeCardProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  isOwner: boolean;
  authorName?: string | null;
  documentCount: number;
  createdAt: string;
  onDelete: (id: string) => Promise<void>;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function KnowledgeCard({
  id,
  name,
  slug,
  description,
  visibility,
  isOwner,
  authorName,
  documentCount,
  createdAt,
  onDelete,
}: KnowledgeCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <Link href={`/knowledge/${id}`} className="block">
      <Card className="group/card transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-4 w-4" />
            </div>
            <CardTitle className="truncate">{name}</CardTitle>
          </div>
          <CardAction>
            {isOwner && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover/card:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </DialogTrigger>
                <DialogContent
                  onClick={(e) => e.stopPropagation()}
                >
                  <DialogHeader>
                    <DialogTitle>确认删除</DialogTitle>
                    <DialogDescription>
                      确定要删除知识库「{name}」吗？此操作不可恢复，所有文档和数据将被永久删除。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="outline" />}
                    >
                      取消
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      确认删除
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardAction>
          {description && (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              {visibility === "PRIVATE" ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {visibility === "PRIVATE" ? "个人" : "公共"}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              {documentCount} 篇文档
            </Badge>
            {!isOwner && authorName && (
              <span className="text-xs text-muted-foreground">
                by {authorName}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              创建于 {formatDate(createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

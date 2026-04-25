"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Database, Loader2, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { KnowledgeCard } from "@/components/knowledge/knowledge-card";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface KnowledgeBase {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  authorId: string;
  author?: { id: string; name: string | null } | null;
  _count: { documents: number };
  createdAt: string;
}

export default function KnowledgePage() {
  const { data: session } = useSession();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");

  const fetchKnowledgeBases = useCallback(async () => {
    try {
      const response = await fetch("/api/knowledge");
      if (!response.ok) throw new Error("获取知识库列表失败");
      const data = await response.json();
      setKnowledgeBases(data.knowledgeBases || []);
    } catch (error) {
      toast.error("获取知识库列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "创建失败");
      }

      toast.success("知识库创建成功");
      setName("");
      setDescription("");
      setVisibility("PRIVATE");
      setDialogOpen(false);
      fetchKnowledgeBases();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建知识库失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "删除失败");
      }

      toast.success("知识库已删除");
      fetchKnowledgeBases();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除知识库失败");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 页面标题 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">知识库</h1>
          <p className="text-sm text-muted-foreground">
            上传文档构建知识库，支持语义检索和智能问答
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2" />
            }
          >
            <Plus className="h-4 w-4" />
            创建知识库
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>创建知识库</DialogTitle>
                <DialogDescription>
                  创建一个新的知识库，然后上传文档进行语义检索。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    名称 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="输入知识库名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    描述
                  </label>
                  <Input
                    placeholder="输入知识库描述（可选）"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    可见性
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={visibility === "PRIVATE" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setVisibility("PRIVATE")}
                    >
                      <Lock className="h-4 w-4" />
                      个人
                    </Button>
                    <Button
                      type="button"
                      variant={visibility === "PUBLIC" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setVisibility("PUBLIC")}
                    >
                      <Globe className="h-4 w-4" />
                      公共
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {visibility === "PRIVATE"
                      ? "仅自己可见和操作"
                      : "所有人可查看和上传文件，仅创建者可管理"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  取消
                </DialogClose>
                <Button type="submit" disabled={creating || !name.trim()}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  创建
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}

      {/* 列表内容 */}
      {!loading && (
        <>
          {knowledgeBases.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/50">
              <Database className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">暂无知识库</p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                创建第一个知识库
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {knowledgeBases.map((kb) => {
                const isOwner = kb.authorId === session?.user?.id;
                return (
                  <KnowledgeCard
                    key={kb.id}
                    id={kb.id}
                    name={kb.name}
                    slug={kb.slug}
                    description={kb.description}
                    visibility={kb.visibility}
                    isOwner={isOwner}
                    authorName={kb.author?.name}
                    documentCount={kb._count.documents}
                    createdAt={kb.createdAt}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

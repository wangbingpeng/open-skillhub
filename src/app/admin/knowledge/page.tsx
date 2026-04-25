"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface KBItem {
  id: string; name: string; slug: string; description: string; visibility: string;
  createdAt: string;
  author: { id: string; name: string; username: string };
  _count: { documents: number };
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

export default function AdminKnowledgePage() {
  const [items, setItems] = useState<KBItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/admin/knowledge?${params}`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setItems(data.data);
      setPagination(data.pagination);
    } catch { toast.error("获取知识库列表失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除该知识库？关联的文档也将被删除。")) return;
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("知识库删除成功");
      fetchData(pagination.page);
    } catch (e: any) { toast.error(e.message || "删除失败"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">知识库管理</h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索知识库名称..." value={keyword}
            onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">名称</th>
                  <th className="px-4 py-3 text-left font-medium">作者</th>
                  <th className="px-4 py-3 text-left font-medium">可见性</th>
                  <th className="px-4 py-3 text-left font-medium">文档数</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">暂无数据</td></tr>
                ) : items.map((kb) => (
                  <tr key={kb.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{kb.name}</p>
                        {kb.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{kb.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{kb.author.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={kb.visibility === "PUBLIC" ? "default" : "secondary"} className="text-xs">
                        {kb.visibility === "PUBLIC" ? "公共" : "个人"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{kb._count.documents}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(kb.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(kb.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {pagination.total} 条</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1}
              onClick={() => fetchData(pagination.page - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchData(pagination.page + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}

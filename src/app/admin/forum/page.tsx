"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Pin, PinOff, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface PostItem {
  id: string; title: string; slug: string; type: string; status: string;
  pinned: boolean; createdAt: string;
  author: { id: string; name: string; username: string };
  _count: { replies: number };
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  OPEN: { label: "开放", variant: "default" },
  CLOSED: { label: "已关闭", variant: "secondary" },
  RESOLVED: { label: "已解决", variant: "outline" },
};

const typeMap: Record<string, string> = {
  DISCUSSION: "讨论",
  REQUEST: "需求",
};

export default function AdminForumPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (keyword) params.set("keyword", keyword);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/forum?${params}`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setPosts(data.data);
      setPagination(data.pagination);
    } catch { toast.error("获取帖子列表失败"); }
    finally { setLoading(false); }
  }, [keyword, statusFilter]);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  const handleStatusChange = async (postId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/forum/${postId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("状态更新成功");
      fetchPosts(pagination.page);
    } catch (e: any) { toast.error(e.message || "更新失败"); }
  };

  const handleTogglePin = async (postId: string, currentPinned: boolean) => {
    try {
      const res = await fetch(`/api/admin/forum/${postId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !currentPinned }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(!currentPinned ? "已置顶" : "已取消置顶");
      fetchPosts(pagination.page);
    } catch (e: any) { toast.error(e.message || "操作失败"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">论坛管理</h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索帖子标题..." value={keyword}
            onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="OPEN">开放</SelectItem>
            <SelectItem value="CLOSED">已关闭</SelectItem>
            <SelectItem value="RESOLVED">已解决</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">标题</th>
                  <th className="px-4 py-3 text-left font-medium">作者</th>
                  <th className="px-4 py-3 text-left font-medium">类型</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">回复</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                ) : posts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">暂无数据</td></tr>
                ) : posts.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        <Link href={`/forum/${p.slug}`} className="font-medium hover:text-primary truncate max-w-xs">{p.title}</Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.author.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{typeMap[p.type] || p.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v ?? "OPEN")}>
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <Badge variant={statusMap[p.status]?.variant || "secondary"} className="text-xs">
                            {statusMap[p.status]?.label || p.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">开放</SelectItem>
                          <SelectItem value="CLOSED">已关闭</SelectItem>
                          <SelectItem value="RESOLVED">已解决</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p._count.replies}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => handleTogglePin(p.id, p.pinned)}
                        title={p.pinned ? "取消置顶" : "置顶"}>
                        {p.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
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
              onClick={() => fetchPosts(pagination.page - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchPosts(pagination.page + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}

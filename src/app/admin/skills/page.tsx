"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Trash2, Loader2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SkillItem {
  id: string; name: string; slug: string; description: string; status: string;
  downloads: number; views: number; createdAt: string;
  author: { id: string; name: string; username: string };
  category: { id: string; name: string };
  _count: { likes: number; favorites: number; comments: number };
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  PUBLISHED: { label: "已发布", variant: "default" },
  ARCHIVED: { label: "已归档", variant: "outline" },
};

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchSkills = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (keyword) params.set("keyword", keyword);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/skills?${params}`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setSkills(data.data);
      setPagination(data.pagination);
    } catch { toast.error("获取技能列表失败"); }
    finally { setLoading(false); }
  }, [keyword, statusFilter]);

  useEffect(() => { fetchSkills(1); }, [fetchSkills]);

  const handleStatusChange = async (skillId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/skills/${skillId}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("状态更新成功");
      fetchSkills(pagination.page);
    } catch (e: any) { toast.error(e.message || "更新失败"); }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("确认删除该技能？此操作不可恢复。")) return;
    try {
      const res = await fetch(`/api/skills/${slug}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("技能删除成功");
      fetchSkills(pagination.page);
    } catch (e: any) { toast.error(e.message || "删除失败"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">技能管理</h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索技能名称..." value={keyword}
            onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="DRAFT">草稿</SelectItem>
            <SelectItem value="PUBLISHED">已发布</SelectItem>
            <SelectItem value="ARCHIVED">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">技能名</th>
                  <th className="px-4 py-3 text-left font-medium">作者</th>
                  <th className="px-4 py-3 text-left font-medium">分类</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">下载</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                ) : skills.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">暂无数据</td></tr>
                ) : skills.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/skills/${s.slug}`} className="font-medium hover:text-primary">{s.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.author.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.category.name}</td>
                    <td className="px-4 py-3">
                      <Select value={s.status} onValueChange={(v) => handleStatusChange(s.id, v ?? "PUBLISHED")}>
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <Badge variant={statusMap[s.status]?.variant || "secondary"} className="text-xs">
                            {statusMap[s.status]?.label || s.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">草稿</SelectItem>
                          <SelectItem value="PUBLISHED">已发布</SelectItem>
                          <SelectItem value="ARCHIVED">已归档</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.downloads}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(s.slug)}>
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
              onClick={() => fetchSkills(pagination.page - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchSkills(pagination.page + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}

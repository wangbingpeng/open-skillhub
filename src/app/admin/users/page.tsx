"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Search, Trash2, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface UserItem {
  id: string; username: string; name: string; email: string; role: string;
  department: string | null; createdAt: string; _count: { skills: number };
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ADMIN: { label: "管理员", variant: "destructive" },
  EDITOR: { label: "编辑", variant: "default" },
  USER: { label: "用户", variant: "secondary" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (keyword) params.set("keyword", keyword);
      if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setUsers(data.data);
      setPagination(data.pagination);
    } catch { toast.error("获取用户列表失败"); }
    finally { setLoading(false); }
  }, [keyword, roleFilter]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("角色更新成功");
      fetchUsers(pagination.page);
    } catch (e: any) { toast.error(e.message || "更新失败"); }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("确认删除该用户？此操作不可恢复。")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("用户删除成功");
      fetchUsers(pagination.page);
    } catch (e: any) { toast.error(e.message || "删除失败"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">用户管理</h1>

      {/* 筛选 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索用户名、昵称、邮箱..." value={keyword}
            onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            <SelectItem value="USER">用户</SelectItem>
            <SelectItem value="EDITOR">编辑</SelectItem>
            <SelectItem value="ADMIN">管理员</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">用户名</th>
                  <th className="px-4 py-3 text-left font-medium">昵称</th>
                  <th className="px-4 py-3 text-left font-medium">邮箱</th>
                  <th className="px-4 py-3 text-left font-medium">角色</th>
                  <th className="px-4 py-3 text-left font-medium">技能数</th>
                  <th className="px-4 py-3 text-left font-medium">注册时间</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">暂无数据</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3">{u.name || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v ?? "USER")}>
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <Badge variant={roleMap[u.role]?.variant || "secondary"} className="text-xs">
                            {roleMap[u.role]?.label || u.role}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">用户</SelectItem>
                          <SelectItem value="EDITOR">编辑</SelectItem>
                          <SelectItem value="ADMIN">管理员</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">{u._count.skills}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(u.id)}>
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

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {pagination.total} 条</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1}
              onClick={() => fetchUsers(pagination.page - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchUsers(pagination.page + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}

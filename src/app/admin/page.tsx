"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, FileText, BookOpen, MessageSquare, Eye, Download,
  TrendingUp, Clock, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Stats {
  overview: {
    totalUsers: number;
    totalSkills: number;
    draftSkills: number;
    archivedSkills: number;
    totalKnowledge: number;
    totalPosts: number;
    openPosts: number;
    totalViews: number;
    totalDownloads: number;
  };
  recentUsers: { id: string; username: string; name: string; email: string; role: string; createdAt: string }[];
  recentSkills: { name: string; slug: string; status: string; createdAt: string; author: { name: string } }[];
  recentPosts: { title: string; slug: string; type: string; status: string; createdAt: string; author: { name: string } }[];
}

function formatNumber(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
  return n.toLocaleString("zh-CN");
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  PUBLISHED: { label: "已发布", variant: "default" },
  ARCHIVED: { label: "已归档", variant: "outline" },
  OPEN: { label: "开放", variant: "default" },
  CLOSED: { label: "已关闭", variant: "secondary" },
  RESOLVED: { label: "已解决", variant: "outline" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return <p className="text-muted-foreground">加载失败</p>;

  const o = stats.overview;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总用户</p>
                <p className="text-2xl font-bold">{formatNumber(o.totalUsers)}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总技能</p>
                <p className="text-2xl font-bold">{formatNumber(o.totalSkills)}</p>
                <p className="text-xs text-muted-foreground">草稿 {o.draftSkills} / 归档 {o.archivedSkills}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总知识库</p>
                <p className="text-2xl font-bold">{formatNumber(o.totalKnowledge)}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总帖子</p>
                <p className="text-2xl font-bold">{formatNumber(o.totalPosts)}</p>
                <p className="text-xs text-muted-foreground">待处理 {o.openPosts}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第二行：浏览/下载 + 最新用户 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总浏览</p>
                <p className="text-2xl font-bold">{formatNumber(o.totalViews)}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总下载</p>
                <p className="text-2xl font-bold">{formatNumber(o.totalDownloads)}</p>
              </div>
              <Download className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最新数据 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 最新用户 */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">最新用户</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{u.name || u.username}</span>
                    <span className="ml-2 text-muted-foreground">{u.email}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最新技能 */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">最新技能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentSkills.map((s) => (
                <div key={s.slug} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <Link href={`/skills/${s.slug}`} className="truncate font-medium hover:text-primary">
                      {s.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{s.author.name}</p>
                  </div>
                  <Badge variant={statusMap[s.status]?.variant || "secondary"} className="text-xs ml-2">
                    {statusMap[s.status]?.label || s.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最新帖子 */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">最新帖子</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentPosts.map((p) => (
                <div key={p.slug} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <Link href={`/forum/${p.slug}`} className="truncate font-medium hover:text-primary">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.author.name} · {formatDate(p.createdAt)}</p>
                  </div>
                  <Badge variant={statusMap[p.status]?.variant || "secondary"} className="text-xs ml-2">
                    {statusMap[p.status]?.label || p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  Eye,
  Download,
  TrendingUp,
  Award,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/charts/stats-card";
import { CategoryChart } from "@/components/charts/category-chart";

// 统计数据类型
interface StatsData {
  overview: {
    totalSkills: number;
    totalUsers: number;
    totalViews: number;
    totalDownloads: number;
  };
  topSkills: {
    name: string;
    slug: string;
    downloads: number;
    views: number;
    favorites: number;
  }[];
  categoryDistribution: {
    name: string;
    count: number;
  }[];
  topContributors: {
    name: string;
    username: string;
    avatar: string | null;
    skillCount: number;
  }[];
  recentSkills: {
    name: string;
    slug: string;
    author: string;
    createdAt: string;
  }[];
}

/**
 * 格式化数字显示
 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    const wan = (num / 10000).toFixed(1);
    return wan.endsWith(".0") ? `${parseInt(wan)}万` : `${wan}万`;
  }
  return num.toLocaleString("zh-CN");
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats");
        if (response.status === 401) {
          // 未登录，跳转到登录页
          router.push("/login?callbackUrl=/dashboard");
          return;
        }
        if (!response.ok) {
          throw new Error("获取统计数据失败");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [router]);

  // 加载状态
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  // 无数据状态
  if (!stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">数据看板</h1>
      </div>

      {/* 概览卡片区域 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="总技能数"
          value={stats.overview.totalSkills}
          icon={FileText}
          description="已发布的技能"
        />
        <StatsCard
          title="总用户数"
          value={stats.overview.totalUsers}
          icon={Users}
          description="平台注册用户"
        />
        <StatsCard
          title="总浏览量"
          value={stats.overview.totalViews}
          icon={Eye}
          description="技能被浏览次数"
        />
        <StatsCard
          title="总下载量"
          value={stats.overview.totalDownloads}
          icon={Download}
          description="技能被下载次数"
        />
      </div>

      {/* 第二行：热门技能 + 分类分布 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 热门技能排行榜 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">热门技能 Top 10</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topSkills.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  暂无数据
                </p>
              ) : (
                stats.topSkills.map((skill, index) => (
                  <Link
                    key={skill.slug}
                    href={`/skills/${skill.slug}`}
                    className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    {/* 排名 */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index < 3
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* 技能信息 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium group-hover:text-primary">
                        {skill.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(skill.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {formatNumber(skill.downloads)}
                        </span>
                      </div>
                    </div>

                    {/* 收藏数 */}
                    <Badge variant="secondary" className="shrink-0">
                      {skill.favorites} 收藏
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 分类分布图 */}
        <CategoryChart data={stats.categoryDistribution} />
      </div>

      {/* 第三行：贡献排行榜 + 最新发布 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 贡献排行榜 */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">贡献排行榜 Top 10</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topContributors.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  暂无数据
                </p>
              ) : (
                stats.topContributors.map((contributor, index) => (
                  <div
                    key={contributor.username}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    {/* 排名 */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index < 3
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* 头像 */}
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                        {contributor.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* 用户信息 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{contributor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        @{contributor.username}
                      </p>
                    </div>

                    {/* 技能数量 */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {contributor.skillCount}
                      </p>
                      <p className="text-xs text-muted-foreground">技能</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 最新发布 */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">最新发布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentSkills.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  暂无数据
                </p>
              ) : (
                stats.recentSkills.map((skill) => (
                  <Link
                    key={skill.slug}
                    href={`/skills/${skill.slug}`}
                    className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    {/* 技能图标 */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>

                    {/* 技能信息 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium group-hover:text-primary">
                        {skill.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        由 {skill.author} 发布
                      </p>
                    </div>

                    {/* 发布时间 */}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(skill.createdAt)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

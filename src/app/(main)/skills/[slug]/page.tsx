import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ChevronRight, 
  Download, 
  Heart, 
  Bookmark, 
  Calendar, 
  Tag,
  Clock,
  GitCommit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { LikeButton } from "@/components/skill/like-button";
import { FavoriteButton } from "@/components/skill/favorite-button";
import { DownloadButton } from "@/components/skill/download-button";
import { CommentSection } from "@/components/skill/comment-section";
import { mockSkillDetail } from "@/lib/mock-detail-data";
import { formatNumber, formatDate } from "@/lib/utils";
import { auth } from "@/lib/auth";

interface SkillDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// 获取技能详情数据（从 API 或 mock）
async function getSkillDetail(slug: string) {
  try {
    // 调用内部 API 获取技能详情
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/skills/${slug}`, {
      cache: "no-store",
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
    
    // API 失败则返回 mock 数据（仅用于开发测试）
    if (slug === mockSkillDetail.slug) {
      return mockSkillDetail;
    }
    
    return null;
  } catch (error) {
    // 网络错误时返回 mock 数据
    if (slug === mockSkillDetail.slug) {
      return mockSkillDetail;
    }
    return null;
  }
}

// 获取版本历史数据
async function getSkillVersions(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/skills/${slug}/versions`, {
      cache: "no-store",
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
    
    // API 失败则返回 mock 数据
    if (slug === mockSkillDetail.slug) {
      return mockSkillDetail.versions;
    }
    
    return [];
  } catch (error) {
    if (slug === mockSkillDetail.slug) {
      return mockSkillDetail.versions;
    }
    return [];
  }
}

export default async function SkillDetailPage({ params }: SkillDetailPageProps) {
  const { slug } = await params;
  const skill = await getSkillDetail(slug);
  const versions = await getSkillVersions(slug);
  
  // 获取当前用户会话
  const session = await auth();
  const isAuthenticated = !!session?.user;

  if (!skill) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* 面包屑导航 */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          首页
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/skills" className="hover:text-foreground transition-colors">
          技能列表
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {skill.name}
        </span>
      </nav>

      {/* 头部信息区 */}
      <div className="space-y-6">
        {/* 标题和描述 */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {skill.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {skill.description}
          </p>
        </div>

        {/* 作者信息和元信息 */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* 作者 */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={skill.author.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {skill.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{skill.author.name}</span>
          </div>

          <Separator orientation="vertical" className="h-4 hidden sm:block" />

          {/* 分类 */}
          <Link href={`/skills?category=${skill.category.slug}`}>
            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
              <Tag className="h-3 w-3 mr-1" />
              {skill.category.name}
            </Badge>
          </Link>

          {/* 版本号 */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <GitCommit className="h-4 w-4" />
            <span>v{skill.version}</span>
          </div>

          {/* 发布时间 */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>发布于 {formatDate(skill.createdAt)}</span>
          </div>
        </div>

        {/* 统计信息和操作按钮 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 统计数据 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              <span>{formatNumber(skill.downloads)} 下载</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{formatNumber(skill._count.likes)} 点赞</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bookmark className="h-4 w-4" />
              <span>{formatNumber(skill._count.favorites)} 收藏</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <LikeButton 
              slug={slug} 
              initialCount={skill._count?.likes || 0} 
              isAuthenticated={isAuthenticated}
            />
            <FavoriteButton 
              slug={slug} 
              initialCount={skill._count?.favorites || 0} 
              isAuthenticated={isAuthenticated}
            />
            <DownloadButton slug={slug} />
          </div>
        </div>

        {/* 标签 */}
        {skill.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {skill.tags.map((tag: { id: string; name: string }) => (
              <Link key={tag.id} href={`/skills?tag=${tag.name}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* 内容选项卡 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none">
            概述
          </TabsTrigger>
          <TabsTrigger value="installation" className="flex-1 sm:flex-none">
            使用说明
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex-1 sm:flex-none">
            版本历史
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 sm:flex-none">
            评论
          </TabsTrigger>
        </TabsList>

        {/* 概述 Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MarkdownRenderer content={skill.content} />
          </div>
        </TabsContent>

        {/* 使用说明 Tab */}
        <TabsContent value="installation" className="space-y-4">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MarkdownRenderer 
              content={skill.installation || "暂无使用说明"} 
            />
          </div>
        </TabsContent>

        {/* 版本历史 Tab */}
        <TabsContent value="versions" className="space-y-4">
          <div className="space-y-4">
            {versions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                暂无版本历史
              </div>
            ) : (
              versions.map((version: any, index: number) => (
                <Card key={version.id} className="relative overflow-hidden">
                  {/* 时间线指示器 */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border hidden sm:block" />
                  <div 
                    className="absolute left-[13px] top-6 h-2.5 w-2.5 rounded-full bg-primary hidden sm:block"
                    style={{ marginTop: 0 }}
                  />
                  
                  <CardContent className="p-6 sm:pl-10">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">
                            v{version.version}
                          </h3>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              最新
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDate(version.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {version.changelog && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {version.changelog}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 评论 Tab */}
        <TabsContent value="comments" className="space-y-4">
          <CommentSection slug={slug} isAuthenticated={isAuthenticated} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Download, MessageSquare, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LikeButton } from "./like-button";
import { FavoriteButton } from "./favorite-button";
import { CommentSection } from "./comment-section";
import { UpdateSkillDialog } from "./update-skill-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SkillCardProps {
  skill: {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: { id: string; name: string; slug: string };
    author: { id: string; name: string; username: string };
    tags: { id: string; name: string }[];
    downloads: number;
    _count: {
      likes: number;
      favorites: number;
      comments: number;
    };
  };
  rank?: number;
  className?: string;
  isAuthenticated?: boolean;
  isOwner?: boolean;
  onUpdate?: () => void;
}

// 根据首字母生成背景色
function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "w";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

export function SkillCard({ skill, rank, className, isAuthenticated = false, isOwner = false, onUpdate }: SkillCardProps) {
  const avatarColor = getAvatarColor(skill.name);
  const firstLetter = skill.name.charAt(0).toUpperCase();
  const [updateOpen, setUpdateOpen] = useState(false);

  // 阻止事件冒泡的处理器
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm",
        className
      )}
    >
      {/* 排名序号 */}
      {rank && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
          {rank}
        </div>
      )}

      {/* 首字母头像 */}
      <Link
        href={`/skills/${skill.slug}`}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white",
          avatarColor
        )}
      >
        {firstLetter}
      </Link>

      {/* 内容区域 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* 技能名 */}
        <Link href={`/skills/${skill.slug}`}>
          <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
            {skill.name}
          </h3>
        </Link>

        {/* 描述 */}
        <Link href={`/skills/${skill.slug}`}>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {skill.description}
          </p>
        </Link>

        {/* 分类标签 */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {skill.category.name}
          </Badge>
          {skill.tags.slice(0, 2).map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-xs">
              {tag.name}
            </Badge>
          ))}
        </div>

        {/* 统计信息和操作按钮 */}
        <div className="mt-2 flex items-center gap-4">
          {/* 下载数 - 静态展示 */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5" />
            {formatNumber(skill.downloads)}
          </span>
          
          {/* 点赞按钮 */}
          <div onClick={handleButtonClick} className="flex items-center">
            <LikeButton
              slug={skill.slug}
              initialCount={skill._count.likes}
              isAuthenticated={isAuthenticated}
            />
          </div>
          
          {/* 收藏按钮 */}
          <div onClick={handleButtonClick} className="flex items-center">
            <FavoriteButton
              slug={skill.slug}
              initialCount={skill._count.favorites}
              isAuthenticated={isAuthenticated}
            />
          </div>
          
          {/* 评论按钮 - 弹出 Dialog */}
          <Dialog>
            <DialogTrigger
              onClick={handleButtonClick}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {formatNumber(skill._count.comments)}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{skill.name} - 评论</DialogTitle>
              </DialogHeader>
              <CommentSection slug={skill.slug} isAuthenticated={isAuthenticated} />
            </DialogContent>
          </Dialog>
          
          <span className="ml-auto text-xs text-muted-foreground">@{skill.author.username}</span>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setUpdateOpen(true);
              }}
              title="更新技能"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 更新技能对话框 */}
      <UpdateSkillDialog
        slug={skill.slug}
        name={skill.name}
        description={skill.description}
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        onSuccess={onUpdate || (() => {})}
      />
    </div>
  );
}

// 紧凑版卡片（用于热榜）
export function SkillCardCompact({
  skill,
  rank,
  className,
  isAuthenticated = false,
}: SkillCardProps) {
  const avatarColor = getAvatarColor(skill.name);
  const firstLetter = skill.name.charAt(0).toUpperCase();

  // 阻止事件冒泡的处理器
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/50 hover:bg-accent/50",
        className
      )}
    >
      {/* 排名序号 */}
      {rank && (
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
            rank <= 3
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {rank}
        </div>
      )}

      {/* 首字母头像 */}
      <Link
        href={`/skills/${skill.slug}`}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
          avatarColor
        )}
      >
        {firstLetter}
      </Link>

      {/* 内容区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/skills/${skill.slug}`}>
          <h3 className="truncate text-sm font-medium text-foreground group-hover:text-primary">
            {skill.name}
          </h3>
        </Link>
        <Link href={`/skills/${skill.slug}`}>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {skill.description}
          </p>
        </Link>
        <div className="mt-1 flex items-center gap-3">
          {/* 下载数 - 静态展示 */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="h-3 w-3" />
            {formatNumber(skill.downloads)}
          </span>
          
          {/* 点赞按钮 - 紧凑版 */}
          <div onClick={handleButtonClick} className="flex items-center">
            <LikeButton
              slug={skill.slug}
              initialCount={skill._count.likes}
              isAuthenticated={isAuthenticated}
            />
          </div>
          
          {/* 收藏按钮 - 紧凑版 */}
          <div onClick={handleButtonClick} className="flex items-center">
            <FavoriteButton
              slug={skill.slug}
              initialCount={skill._count.favorites}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

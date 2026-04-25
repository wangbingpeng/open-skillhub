"use client";

import Link from "next/link";
import { MessageSquare, Eye, Pin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostTypeBadge } from "./post-type-badge";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { ForumPostWithAuthor } from "@/types";

interface PostCardProps {
  post: ForumPostWithAuthor;
  className?: string;
}

export function PostCard({ post, className }: PostCardProps) {
  // 获取内容摘要（前150字）
  const getSummary = (content: string): string => {
    const plainText = content
      .replace(/#+ /g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{3}[\s\S]*?`{3}/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
      .replace(/\n+/g, " ")
      .trim();

    return plainText.slice(0, 150) + (plainText.length > 150 ? "..." : "");
  };

  // 状态标签配置
  const statusConfig = {
    OPEN: {
      label: "开放中",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    },
    CLOSED: {
      label: "已关闭",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    RESOLVED: {
      label: "已解决",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    },
  };

  const { label: statusLabel, className: statusClassName } = statusConfig[post.status];

  return (
    <Card
      className={cn(
        "group transition-all hover:border-primary/50 hover:shadow-sm",
        post.pinned && "border-primary/30 bg-primary/5",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* 顶部标签行 */}
            <div className="flex flex-wrap items-center gap-2">
              <PostTypeBadge type={post.type} />
              <Badge variant="secondary" className={cn("text-xs", statusClassName)}>
                {statusLabel}
              </Badge>
              {post.pinned && (
                <Badge variant="default" className="text-xs gap-1">
                  <Pin className="h-3 w-3" />
                  置顶
                </Badge>
              )}
              {post.skill && (
                <Link href={`/skills/${post.skill.slug}`}>
                  <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                    {post.skill.name}
                  </Badge>
                </Link>
              )}
            </div>

            {/* 标题 */}
            <Link href={`/forum/${post.slug}`}>
              <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary line-clamp-1">
                {post.title}
              </h3>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 内容摘要 */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {getSummary(post.content)}
        </p>

        {/* 底部信息 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 作者信息 */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {(post.author.name || post.author.username).charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{post.author.name || post.author.username}</span>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {formatNumber(post._count?.replies || 0)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatNumber(post.viewCount)}
            </span>
            <span>{formatDate(post.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

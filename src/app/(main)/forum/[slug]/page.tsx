"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Eye,
  Calendar,
  Pencil,
  Trash2,
  Pin,
  Lock,
  Unlock,
  MoreHorizontal,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PostTypeBadge } from "@/components/forum/post-type-badge";
import { ReplyItem } from "@/components/forum/reply-item";
import { ReplyEditor } from "@/components/forum/reply-editor";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import type { ForumPostWithAuthor, ForumReplyWithAuthor } from "@/types";

interface PostDetail extends ForumPostWithAuthor {
  replies: ForumReplyWithAuthor[];
}

interface PostDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function fetchPostDetail(slug: string): Promise<PostDetail> {
  const response = await fetch(`/api/forum/${slug}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("帖子不存在");
    }
    throw new Error("获取帖子详情失败");
  }
  return response.json();
}

async function fetchReplies(slug: string): Promise<ForumReplyWithAuthor[]> {
  const response = await fetch(`/api/forum/${slug}/replies`);
  if (!response.ok) {
    throw new Error("获取回复列表失败");
  }
  const data = await response.json();
  return data.replies;
}

async function deletePost(slug: string) {
  const response = await fetch(`/api/forum/${slug}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "删除失败");
  }
  return response.json();
}

async function togglePinPost(slug: string, pinned: boolean) {
  const response = await fetch(`/api/forum/${slug}/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "操作失败");
  }
  return response.json();
}

async function toggleClosePost(slug: string, status: "OPEN" | "CLOSED") {
  const response = await fetch(`/api/forum/${slug}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "操作失败");
  }
  return response.json();
}

function PostDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [showReplyEditor, setShowReplyEditor] = useState(false);

  const currentUserId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

  const {
    data: post,
    isLoading: isPostLoading,
    error: postError,
  } = useQuery({
    queryKey: ["forum-post", slug],
    queryFn: () => fetchPostDetail(slug),
  });

  const {
    data: replies = [],
    isLoading: isRepliesLoading,
    refetch: refetchReplies,
  } = useQuery({
    queryKey: ["forum-replies", slug],
    queryFn: () => fetchReplies(slug),
    enabled: !!post,
  });

  const isAuthor = currentUserId === post?.authorId;
  const canManage = isAuthor || isAdmin;

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      toast.success("帖子已删除");
      router.push("/forum");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ pinned }: { pinned: boolean }) => togglePinPost(slug, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", slug] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      toast.success(post?.pinned ? "已取消置顶" : "已置顶");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ status }: { status: "OPEN" | "CLOSED" }) =>
      toggleClosePost(slug, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", slug] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      toast.success(variables.status === "CLOSED" ? "帖子已关闭" : "帖子已重新开放");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (!confirm("确定要删除这个帖子吗？此操作不可撤销。")) {
      return;
    }
    deleteMutation.mutate(slug);
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

  if (isPostLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (postError) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          {postError.message === "帖子不存在"
            ? "帖子不存在或已被删除"
            : "加载失败，请稍后重试"}
        </p>
        <Link href="/forum">
          <Button variant="outline">返回论坛</Button>
        </Link>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const { label: statusLabel, className: statusClassName } = statusConfig[post.status];

  return (
    <div className="space-y-8">
      {/* 返回按钮 */}
      <Link
        href="/forum"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        返回论坛
      </Link>

      {/* 帖子头部 */}
      <div className="space-y-4">
        {/* 标签行 */}
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {post.title}
        </h1>

        {/* 作者信息和操作 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {(post.author.name || post.author.username).charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{post.author.name || post.author.username}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(post.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {formatNumber(post.viewCount)} 浏览
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          {canManage && (
            <div className="flex items-center gap-2">
              {isAuthor && (
                <Link href={`/forum/${slug}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Pencil className="h-4 w-4" />
                    编辑
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {isAuthor && post.status === "OPEN" && (
                    <DropdownMenuItem
                      onClick={() => closeMutation.mutate({ status: "CLOSED" })}
                      disabled={closeMutation.isPending}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      关闭帖子
                    </DropdownMenuItem>
                  )}
                  {isAuthor && post.status === "CLOSED" && (
                    <DropdownMenuItem
                      onClick={() => closeMutation.mutate({ status: "OPEN" })}
                      disabled={closeMutation.isPending}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      重新开放
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={() => pinMutation.mutate({ pinned: !post.pinned })}
                      disabled={pinMutation.isPending}
                    >
                      <Pin className="h-4 w-4 mr-2" />
                      {post.pinned ? "取消置顶" : "置顶帖子"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除帖子
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 帖子内容 */}
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <MarkdownRenderer content={post.content} />
      </div>

      {/* 标签 */}
      {post.tags && (
        <div className="flex flex-wrap items-center gap-2">
          {post.tags.split(",").map(
            (tag) =>
              tag.trim() && (
                <Badge key={tag} variant="outline">
                  {tag.trim()}
                </Badge>
              )
          )}
        </div>
      )}

      <Separator />

      {/* 回复区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            回复 ({replies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 回复输入框 */}
          {post.status !== "CLOSED" && (
            <div className="space-y-3">
              {showReplyEditor ? (
                <ReplyEditor
                  postSlug={slug}
                  onSuccess={() => {
                    setShowReplyEditor(false);
                    refetchReplies();
                  }}
                  onCancel={() => setShowReplyEditor(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setShowReplyEditor(true)}
                >
                  写下你的回复...
                </Button>
              )}
            </div>
          )}

          {post.status === "CLOSED" && (
            <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
              该帖子已关闭，无法回复
            </div>
          )}

          {/* 回复列表 */}
          <div className="space-y-0 divide-y">
            {isRepliesLoading ? (
              <div className="text-center text-muted-foreground py-8">
                加载回复中...
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                暂无回复，来发表第一条回复吧
              </div>
            ) : (
              replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  postSlug={slug}
                  currentUserId={currentUserId}
                  isAuthenticated={!!session}
                  onReplySuccess={() => refetchReplies()}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const [slug, setSlug] = useState<string>("");

  // 处理 params Promise
  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  if (!slug) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <PostDetailContent slug={slug} />;
}



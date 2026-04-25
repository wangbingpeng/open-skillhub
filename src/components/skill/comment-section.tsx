"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CommentItem } from "./comment-item";

interface CommentAuthor {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  role: string;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  parentId: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  replies: Reply[];
}

interface CommentSectionProps {
  slug: string;
  isAuthenticated?: boolean;
}

async function fetchComments(slug: string): Promise<Comment[]> {
  const res = await fetch(`/api/skills/${slug}/comments`);
  if (!res.ok) {
    throw new Error("获取评论失败");
  }
  const data = await res.json();
  return data.data;
}

async function postComment(slug: string, content: string) {
  const res = await fetch(`/api/skills/${slug}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (res.status === 401) {
    throw new Error("请先登录");
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "发表评论失败");
  }

  return res.json();
}

export function CommentSection({ slug, isAuthenticated = false }: CommentSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: ["skill-comments", slug],
    queryFn: () => fetchComments(slug),
    staleTime: 1000 * 30, // 30秒
  });

  const mutation = useMutation({
    mutationFn: (content: string) => postComment(slug, content),
    onSuccess: () => {
      setNewComment("");
      toast.success("评论发表成功");
      queryClient.invalidateQueries({ queryKey: ["skill-comments", slug] });
    },
    onError: (error: Error) => {
      if (error.message === "请先登录") {
        toast.error("请先登录", {
          action: {
            label: "去登录",
            onClick: () => router.push("/login"),
          },
        });
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast.error("请先登录", {
        action: {
          label: "去登录",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    if (!newComment.trim()) {
      toast.error("请输入评论内容");
      return;
    }

    mutation.mutate(newComment);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          评论 ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 评论输入框 */}
        <div className="space-y-3">
          <Textarea
            placeholder={isAuthenticated ? "写下你的评论..." : "请先登录后发表评论"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!isAuthenticated || mutation.isPending}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!isAuthenticated || mutation.isPending || !newComment.trim()}
            >
              {mutation.isPending ? "发表中..." : "发表评论"}
            </Button>
          </div>
        </div>

        {/* 评论列表 */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              加载评论中...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无评论，来发表第一条评论吧
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                slug={slug}
                isAuthenticated={isAuthenticated}
                onReplySuccess={() => refetch()}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

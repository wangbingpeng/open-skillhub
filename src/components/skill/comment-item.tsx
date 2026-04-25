"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

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

interface CommentItemProps {
  comment: Comment;
  slug: string;
  isAuthenticated?: boolean;
  onReplySuccess?: () => void;
}

async function postComment(slug: string, content: string, parentId?: string) {
  const res = await fetch(`/api/skills/${slug}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, parentId }),
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

export function CommentItem({ comment, slug, isAuthenticated = false, onReplySuccess }: CommentItemProps) {
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReply = async () => {
    if (!isAuthenticated) {
      toast.error("请先登录", {
        action: {
          label: "去登录",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    if (!replyContent.trim()) {
      toast.error("请输入回复内容");
      return;
    }

    setIsSubmitting(true);
    try {
      await postComment(slug, replyContent, comment.id);
      setReplyContent("");
      setIsReplying(false);
      toast.success("回复成功");
      onReplySuccess?.();
    } catch (error: any) {
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 主评论 */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.author.avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {comment.author.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error("请先登录", {
                    action: {
                      label: "去登录",
                      onClick: () => router.push("/login"),
                    },
                  });
                  return;
                }
                setIsReplying(!isReplying);
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              回复
            </Button>
          </div>

          {/* 回复输入框 */}
          {isReplying && (
            <div className="space-y-2 pt-2">
              <Textarea
                placeholder="写下你的回复..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReplying(false)}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? "提交中..." : "发表回复"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 回复列表 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={reply.author.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {reply.author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{reply.author.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(reply.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

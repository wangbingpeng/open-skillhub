"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ForumReplyWithAuthor } from "@/types";
import { ReplyEditor } from "./reply-editor";

interface ReplyItemProps {
  reply: ForumReplyWithAuthor;
  postSlug: string;
  currentUserId?: string;
  isAuthenticated?: boolean;
  onReplySuccess?: () => void;
  depth?: number;
}

async function deleteReply(postSlug: string, replyId: string) {
  const res = await fetch(`/api/forum/${postSlug}/replies/${replyId}`, {
    method: "DELETE",
  });

  if (res.status === 401) {
    throw new Error("请先登录");
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "删除回复失败");
  }

  return res.json();
}

export function ReplyItem({
  reply,
  postSlug,
  currentUserId,
  isAuthenticated = false,
  onReplySuccess,
  depth = 0,
}: ReplyItemProps) {
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = currentUserId === reply.authorId;

  const handleDelete = async () => {
    if (!isAuthenticated) {
      toast.error("请先登录", {
        action: {
          label: "去登录",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    if (!confirm("确定要删除这条回复吗？")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteReply(postSlug, reply.id);
      toast.success("回复已删除");
      onReplySuccess?.();
    } catch (error) {
      const err = error as Error;
      if (err.message === "请先登录") {
        toast.error("请先登录", {
          action: {
            label: "去登录",
            onClick: () => router.push("/login"),
          },
        });
      } else {
        toast.error(err.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={depth > 0 ? "ml-8 border-l-2 border-border pl-4" : ""}>
      <div className="flex gap-3 py-4">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={reply.author.avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {(reply.author.name || reply.author.username).charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          {/* 头部信息 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{reply.author.name || reply.author.username}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(reply.createdAt)}
              </span>
              {reply.createdAt !== reply.updatedAt && (
                <span className="text-xs text-muted-foreground">(已编辑)</span>
              )}
            </div>

            {/* 操作菜单 */}
            {(isAuthor || isAuthenticated) && (
              <div className="flex items-center gap-1">
                {isAuthenticated && (
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
                )}

                {isAuthor && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>

          {/* 内容 */}
          {isEditing ? (
            <ReplyEditor
              postSlug={postSlug}
              parentId={reply.parentId || undefined}
              initialContent={reply.content}
              replyId={reply.id}
              isEditing={true}
              onSuccess={() => {
                setIsEditing(false);
                onReplySuccess?.();
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={reply.content} />
            </div>
          )}

          {/* 回复输入框 */}
          {isReplying && !isEditing && (
            <div className="pt-2">
              <ReplyEditor
                postSlug={postSlug}
                parentId={reply.id}
                onSuccess={() => {
                  setIsReplying(false);
                  onReplySuccess?.();
                }}
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 嵌套回复 */}
      {reply.children && reply.children.length > 0 && (
        <div className="space-y-0">
          {reply.children.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              postSlug={postSlug}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              onReplySuccess={onReplySuccess}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

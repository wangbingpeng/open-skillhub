"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReplyEditorProps {
  postSlug: string;
  parentId?: string;
  initialContent?: string;
  replyId?: string;
  isEditing?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

async function createReply(
  postSlug: string,
  content: string,
  parentId?: string
) {
  const res = await fetch(`/api/forum/${postSlug}/replies`, {
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
    throw new Error(error.error || "发表回复失败");
  }

  return res.json();
}

async function updateReply(postSlug: string, replyId: string, content: string) {
  const res = await fetch(`/api/forum/${postSlug}/replies/${replyId}`, {
    method: "PUT",
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
    throw new Error(error.error || "更新回复失败");
  }

  return res.json();
}

export function ReplyEditor({
  postSlug,
  parentId,
  initialContent = "",
  replyId,
  isEditing = false,
  onSuccess,
  onCancel,
}: ReplyEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("请输入回复内容");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && replyId) {
        await updateReply(postSlug, replyId, content);
        toast.success("回复已更新");
      } else {
        await createReply(postSlug, content, parentId);
        toast.success("回复发表成功");
        setContent("");
      }
      onSuccess();
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={isEditing ? "编辑回复..." : "写下你的回复..."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isSubmitting}
        className="min-h-[100px] resize-none"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEditing ? "保存中..." : "发表中..."}
            </>
          ) : isEditing ? (
            "保存修改"
          ) : (
            "发表回复"
          )}
        </Button>
      </div>
    </div>
  );
}

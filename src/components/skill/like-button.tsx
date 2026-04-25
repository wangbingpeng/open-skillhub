"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";

interface LikeButtonProps {
  slug: string;
  initialCount?: number;
  isAuthenticated?: boolean;
}

interface LikeStatus {
  isLiked: boolean;
  count: number;
}

async function fetchLikeStatus(slug: string): Promise<LikeStatus> {
  const res = await fetch(`/api/skills/${slug}/like`);
  if (!res.ok) {
    throw new Error("获取点赞状态失败");
  }
  const data = await res.json();
  return data.data;
}

async function toggleLike(slug: string): Promise<LikeStatus> {
  const res = await fetch(`/api/skills/${slug}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (res.status === 401) {
    throw new Error("请先登录");
  }
  
  if (!res.ok) {
    throw new Error("操作失败");
  }
  
  const data = await res.json();
  return data.data;
}

export function LikeButton({ slug, initialCount = 0, isAuthenticated = false }: LikeButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const { data: likeStatus, isLoading } = useQuery({
    queryKey: ["skill-like", slug],
    queryFn: () => fetchLikeStatus(slug),
    initialData: { isLiked: false, count: initialCount },
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: () => toggleLike(slug),
    onMutate: () => {
      // 乐观更新
      const currentLiked = likeStatus?.isLiked ?? false;
      const currentCount = likeStatus?.count ?? 0;
      
      setOptimisticLiked(!currentLiked);
      setOptimisticCount(currentLiked ? currentCount - 1 : currentCount + 1);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["skill-like", slug], data);
      setOptimisticLiked(null);
      setOptimisticCount(null);
      toast.success(data.isLiked ? "点赞成功" : "已取消点赞");
    },
    onError: (error) => {
      setOptimisticLiked(null);
      setOptimisticCount(null);
      
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

  const isLiked = optimisticLiked ?? likeStatus?.isLiked ?? false;
  const count = optimisticCount ?? likeStatus?.count ?? initialCount;

  const handleClick = () => {
    if (!isAuthenticated) {
      toast.error("请先登录", {
        action: {
          label: "去登录",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <Button
      variant={isLiked ? "default" : "outline"}
      size="sm"
      className="gap-2"
      onClick={handleClick}
      disabled={mutation.isPending || isLoading}
    >
      <Heart
        className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
      />
      <span className="hidden sm:inline">{isLiked ? "已点赞" : "点赞"}</span>
      <span>{formatNumber(count)}</span>
    </Button>
  );
}

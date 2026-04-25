"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";

interface FavoriteButtonProps {
  slug: string;
  initialCount?: number;
  isAuthenticated?: boolean;
}

interface FavoriteStatus {
  isFavorited: boolean;
  count: number;
}

async function fetchFavoriteStatus(slug: string): Promise<FavoriteStatus> {
  const res = await fetch(`/api/skills/${slug}/favorite`);
  if (!res.ok) {
    throw new Error("获取收藏状态失败");
  }
  const data = await res.json();
  return data.data;
}

async function toggleFavorite(slug: string): Promise<FavoriteStatus> {
  const res = await fetch(`/api/skills/${slug}/favorite`, {
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

export function FavoriteButton({ slug, initialCount = 0, isAuthenticated = false }: FavoriteButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [optimisticFavorited, setOptimisticFavorited] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const { data: favoriteStatus, isLoading } = useQuery({
    queryKey: ["skill-favorite", slug],
    queryFn: () => fetchFavoriteStatus(slug),
    initialData: { isFavorited: false, count: initialCount },
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: () => toggleFavorite(slug),
    onMutate: () => {
      // 乐观更新
      const currentFavorited = favoriteStatus?.isFavorited ?? false;
      const currentCount = favoriteStatus?.count ?? 0;
      
      setOptimisticFavorited(!currentFavorited);
      setOptimisticCount(currentFavorited ? currentCount - 1 : currentCount + 1);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["skill-favorite", slug], data);
      setOptimisticFavorited(null);
      setOptimisticCount(null);
      toast.success(data.isFavorited ? "收藏成功" : "已取消收藏");
    },
    onError: (error) => {
      setOptimisticFavorited(null);
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

  const isFavorited = optimisticFavorited ?? favoriteStatus?.isFavorited ?? false;
  const count = optimisticCount ?? favoriteStatus?.count ?? initialCount;

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
      variant={isFavorited ? "default" : "outline"}
      size="sm"
      className="gap-2"
      onClick={handleClick}
      disabled={mutation.isPending || isLoading}
    >
      <Bookmark
        className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`}
      />
      <span className="hidden sm:inline">{isFavorited ? "已收藏" : "收藏"}</span>
      <span>{formatNumber(count)}</span>
    </Button>
  );
}

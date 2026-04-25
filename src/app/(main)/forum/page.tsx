"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PostCard } from "@/components/forum/post-card";
import type { ForumPostWithAuthor } from "@/types";

interface ForumListResponse {
  posts: ForumPostWithAuthor[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type PostTypeFilter = "ALL" | "DISCUSSION" | "REQUEST";
type SortOption = "latest" | "popular";

const ITEMS_PER_PAGE = 10;

async function fetchForumPosts(
  page: number,
  type: PostTypeFilter,
  sort: SortOption,
  search: string
): Promise<ForumListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(ITEMS_PER_PAGE));
  params.set("sort", sort);
  if (type !== "ALL") params.set("type", type);
  if (search) params.set("search", search);

  const response = await fetch(`/api/forum?${params.toString()}`);
  if (!response.ok) {
    throw new Error("获取帖子列表失败");
  }
  return response.json();
}

function ForumPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pageParam = Number(searchParams.get("page")) || 1;
  const typeParam = (searchParams.get("type") as PostTypeFilter) || "ALL";
  const sortParam = (searchParams.get("sort") as SortOption) || "latest";
  const searchQueryParam = searchParams.get("search") || "";

  const [page, setPage] = useState(pageParam);
  const [typeFilter, setTypeFilter] = useState<PostTypeFilter>(typeParam);
  const [sort, setSort] = useState<SortOption>(sortParam);
  const [searchQuery, setSearchQuery] = useState(searchQueryParam);

  const { data, isLoading, error } = useQuery({
    queryKey: ["forum-posts", page, typeFilter, sort, searchQueryParam],
    queryFn: () => fetchForumPosts(page, typeFilter, sort, searchQueryParam),
  });

  const updateUrl = (
    newPage: number,
    newType: PostTypeFilter,
    newSort: SortOption,
    newSearch: string
  ) => {
    const params = new URLSearchParams();
    if (newPage > 1) params.set("page", String(newPage));
    if (newType !== "ALL") params.set("type", newType);
    if (newSort !== "latest") params.set("sort", newSort);
    if (newSearch) params.set("search", newSearch);

    const url = `/forum${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(url);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateUrl(1, typeFilter, sort, searchQuery);
  };

  const handleTypeChange = (value: PostTypeFilter) => {
    setTypeFilter(value);
    setPage(1);
    updateUrl(1, value, sort, searchQuery);
  };

  const handleSortChange = (value: SortOption) => {
    setSort(value);
    setPage(1);
    updateUrl(1, typeFilter, value, searchQuery);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(newPage, typeFilter, sort, searchQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 页面标题和搜索 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">社区论坛</h1>
          <p className="text-sm text-muted-foreground">
            讨论 Skill 使用技巧、提出功能需求
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索帖子..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </form>
          <Link href="/forum/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">发布帖子</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 类型筛选 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={typeFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTypeChange("ALL")}
            className="rounded-full"
          >
            全部
          </Button>
          <Button
            variant={typeFilter === "DISCUSSION" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTypeChange("DISCUSSION")}
            className="rounded-full"
          >
            讨论
          </Button>
          <Button
            variant={typeFilter === "REQUEST" ? "default" : "outline"}
            size="sm"
            onClick={() => handleTypeChange("REQUEST")}
            className="rounded-full"
          >
            需求
          </Button>
        </div>

        {/* 排序 */}
        <Select value={sort} onValueChange={(v) => handleSortChange(v as SortOption)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">最新发布</SelectItem>
            <SelectItem value="popular">热门</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 当前筛选标签 */}
      {(typeFilter !== "ALL" || searchQueryParam) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">当前筛选:</span>
          {typeFilter !== "ALL" && (
            <Badge variant="secondary" className="gap-1">
              类型: {typeFilter === "DISCUSSION" ? "讨论" : "需求"}
              <button
                onClick={() => handleTypeChange("ALL")}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          {searchQueryParam && (
            <Badge variant="secondary" className="gap-1">
              搜索: {searchQueryParam}
              <button
                onClick={() => {
                  setSearchQuery("");
                  updateUrl(1, typeFilter, sort, "");
                }}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          <button
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("ALL");
              updateUrl(1, "ALL", sort, "");
            }}
            className="text-sm text-primary hover:underline"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 帖子列表 */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">加载失败，请稍后重试</p>
        </div>
      ) : data?.posts.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/50">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {searchQueryParam ? "未找到匹配的帖子" : "暂无帖子"}
          </p>
          {!searchQueryParam && (
            <Link href="/forum/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                发布第一个帖子
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {data?.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} 页，共 {data.pagination.totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === data.pagination.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// 加载状态
function ForumPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="h-10 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<ForumPageSkeleton />}>
      <ForumPageContent />
    </Suspense>
  );
}

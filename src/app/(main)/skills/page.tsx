"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  SlidersHorizontal,
  Package,
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
import { SkillCard } from "@/components/skill/skill-card";
import { cn } from "@/lib/utils";
import { mockSkills, mockCategories as mockCategoriesData } from "@/lib/mock-data";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  order: number;
}

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  category: Category;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    role: string;
  };
  tags: { id: string; name: string }[];
  status: string;
  downloads: number;
  views: number;
  _count: {
    likes: number;
    favorites: number;
    comments: number;
  };
  createdAt: string;
}

type SortOption = "default" | "downloads" | "favorites" | "newest";

// 排序选项配置
const sortOptions: { value: SortOption; label: string }[] = [
  { value: "default", label: "综合排序" },
  { value: "downloads", label: "下载量最多" },
  { value: "favorites", label: "收藏最多" },
  { value: "newest", label: "最新发布" },
];

function SkillsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // 从 URL 读取参数
  const categoryParam = searchParams.get("category") || "";
  const keywordParam = searchParams.get("keyword") || "";
  const sortParam = (searchParams.get("sort") as SortOption) || "default";

  // 本地状态
  const [searchQuery, setSearchQuery] = useState(keywordParam);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 用户认证状态
  const isAuthenticated = status === "authenticated" && !!session?.user;

  // 获取分类列表
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const result = await response.json();
        if (result.success) {
          setCategories(result.data);
        }
      } catch (err) {
        console.error("获取分类失败:", err);
      }
    }
    fetchCategories();
  }, []);

  // 转换 mock 数据格式以匹配 API 返回格式
  const convertMockSkills = useCallback((): Skill[] => {
    return mockSkills.map((skill) => ({
      ...skill,
      id: `mock-${skill.id}`,
      author: {
        ...skill.author,
        avatar: null,
        role: "USER",
      },
      category: {
        ...skill.category,
        icon: mockCategoriesData.find((c) => c.id === skill.category.id)?.icon || "Box",
        order: mockCategoriesData.find((c) => c.id === skill.category.id)?.order || 99,
      },
    }));
  }, []);

  // 过滤 mock 数据
  const filterMockSkills = useCallback((mockData: Skill[]): Skill[] => {
    return mockData.filter((skill) => {
      // 分类过滤
      if (categoryParam && skill.category.slug !== categoryParam) {
        return false;
      }
      // 关键词搜索
      if (keywordParam) {
        const keyword = keywordParam.toLowerCase();
        const matchName = skill.name.toLowerCase().includes(keyword);
        const matchDesc = skill.description.toLowerCase().includes(keyword);
        const matchTags = skill.tags.some((tag) =>
          tag.name.toLowerCase().includes(keyword)
        );
        if (!matchName && !matchDesc && !matchTags) {
          return false;
        }
      }
      return true;
    });
  }, [categoryParam, keywordParam]);

  // 排序 mock 数据
  const sortMockSkills = useCallback((mockData: Skill[], sort: SortOption): Skill[] => {
    const sorted = [...mockData];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "downloads":
        sorted.sort((a, b) => b.downloads - a.downloads);
        break;
      case "favorites":
        sorted.sort((a, b) => b._count.favorites - a._count.favorites);
        break;
      default:
        // 综合排序：按下载量
        sorted.sort((a, b) => b.downloads - a.downloads);
        break;
    }
    return sorted;
  }, []);

  // 获取技能列表
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryParam) params.set("category", categoryParam);
      if (keywordParam) params.set("keyword", keywordParam);
      if (sortParam && sortParam !== "default") params.set("sort", sortParam);

      const response = await fetch(`/api/skills?${params.toString()}`);
      const result = await response.json();

      // 获取转换后的 mock 数据
      let allMockSkills = convertMockSkills();

      // 过滤 mock 数据
      allMockSkills = filterMockSkills(allMockSkills);

      // 排序 mock 数据
      allMockSkills = sortMockSkills(allMockSkills, sortParam);

      if (response.ok) {
        // 合并真实数据和 mock 数据：真实数据在前，mock 数据在后
        const realSkills = result.data || [];
        setSkills([...realSkills, ...allMockSkills]);
      } else {
        // 如果 API 失败，只显示 mock 数据
        setSkills(allMockSkills);
        setError(result.error || "获取技能列表失败");
      }
    } catch (err) {
      // 网络错误时，只显示 mock 数据
      let allMockSkills = convertMockSkills();
      allMockSkills = filterMockSkills(allMockSkills);
      allMockSkills = sortMockSkills(allMockSkills, sortParam);
      setSkills(allMockSkills);
      setError("网络错误，请稍后重试");
      console.error("获取技能列表失败:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryParam, keywordParam, sortParam, convertMockSkills, filterMockSkills, sortMockSkills]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // 更新 URL 参数
  const updateParams = useCallback(
    (params: { category?: string; keyword?: string; sort?: SortOption }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      if (params.category !== undefined) {
        if (params.category) {
          newParams.set("category", params.category);
        } else {
          newParams.delete("category");
        }
      }

      if (params.keyword !== undefined) {
        if (params.keyword) {
          newParams.set("keyword", params.keyword);
        } else {
          newParams.delete("keyword");
        }
      }

      if (params.sort !== undefined) {
        if (params.sort && params.sort !== "default") {
          newParams.set("sort", params.sort);
        } else {
          newParams.delete("sort");
        }
      }

      const newUrl = `/skills${newParams.toString() ? `?${newParams.toString()}` : ""}`;
      router.push(newUrl);
    },
    [router, searchParams]
  );

  // 处理分类切换
  const handleCategoryChange = (slug: string) => {
    updateParams({ category: slug });
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ keyword: searchQuery });
  };

  // 处理排序
  const handleSortChange = (value: string | null) => {
    if (value) {
      updateParams({ sort: value as SortOption });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 页面标题区 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">全部技能</h1>
          <Badge variant="secondary" className="text-xs">
            {skills.length} 个技能
          </Badge>
        </div>
        <p className="text-muted-foreground">
          快速发现专家技能，让 AI 从通用走向专用
        </p>
      </div>

      {/* 分类筛选栏 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryParam === "" ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryChange("")}
          className="rounded-full"
        >
          全部
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={categoryParam === category.slug ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategoryChange(category.slug)}
            className="rounded-full"
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* 搜索和过滤工具栏 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索 skill 名称、描述、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </form>

        {/* 排序下拉 */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select value={sortParam} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 当前筛选标签 */}
      {(categoryParam || keywordParam) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">当前筛选:</span>
          {categoryParam && (
            <Badge variant="secondary" className="gap-1">
              分类: {categories.find((c) => c.slug === categoryParam)?.name}
              <button
                onClick={() => handleCategoryChange("")}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          {keywordParam && (
            <Badge variant="secondary" className="gap-1">
              关键词: {keywordParam}
              <button
                onClick={() => {
                  setSearchQuery("");
                  updateParams({ keyword: "" });
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
              updateParams({ category: "", keyword: "" });
            }}
            className="text-sm text-primary hover:underline"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            加载失败
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {error}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            重新加载
          </Button>
        </div>
      )}

      {/* 技能卡片列表 */}
      {!loading && !error && (
        <>
          {skills.length > 0 ? (
            <div className="space-y-4">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isAuthenticated={isAuthenticated}
                  isOwner={session?.user?.id === skill.author.id}
                  onUpdate={fetchSkills}
                />
              ))}
            </div>
          ) : (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                没有找到相关技能
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                尝试使用其他关键词搜索，或清除筛选条件查看更多技能
              </p>
              {(categoryParam || keywordParam) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    updateParams({ category: "", keyword: "" });
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 加载状态
function SkillsPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense fallback={<SkillsPageSkeleton />}>
      <SkillsPageContent />
    </Suspense>
  );
}

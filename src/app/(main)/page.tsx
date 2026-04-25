"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Brain,
  Wrench,
  Zap,
  BarChart3,
  PenTool,
  Shield,
  Users,
  Box,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkillCardCompact } from "@/components/skill/skill-card";
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

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  Brain: <Brain className="h-6 w-6" />,
  Wrench: <Wrench className="h-6 w-6" />,
  Zap: <Zap className="h-6 w-6" />,
  BarChart3: <BarChart3 className="h-6 w-6" />,
  PenTool: <PenTool className="h-6 w-6" />,
  Shield: <Shield className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  Box: <Box className="h-6 w-6" />,
};

// 热门标签
const hotTags = ["AI", "自动化", "开发", "效率", "Python", "JavaScript"];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 合并分类：mock 分类（有图标）+ 数据库分类
  const mergeCategories = useCallback((dbCategories: Category[]): Category[] => {
    // 使用 mock 分类作为基础（因为有图标信息）
    const merged = [...mockCategoriesData];
    
    // 添加数据库中 mock 没有的新分类
    dbCategories.forEach((dbCat) => {
      const exists = merged.some((mockCat) => mockCat.slug === dbCat.slug);
      if (!exists) {
        merged.push({
          ...dbCat,
          icon: "Box", // 默认图标
        });
      }
    });
    
    // 按 order 排序
    return merged.sort((a, b) => a.order - b.order);
  }, []);

  // 获取热门技能（按下载量排序，取前5个）
  useEffect(() => {
    async function fetchSkills() {
      try {
        const response = await fetch("/api/skills?sort=downloads&limit=5");
        const result = await response.json();
        
        // 获取转换后的 mock 数据，按下载量排序
        const mockData = convertMockSkills();
        const sortedMockData = mockData.sort((a, b) => b.downloads - a.downloads);
        
        if (response.ok) {
          const realSkills = result.data || [];
          // 合并真实数据和 mock 数据，按下载量排序取前5
          const combinedSkills = [...realSkills, ...sortedMockData];
          combinedSkills.sort((a, b) => b.downloads - a.downloads);
          setSkills(combinedSkills.slice(0, 5));
        } else {
          // API 失败时只显示 mock 数据
          setSkills(sortedMockData.slice(0, 5));
        }
      } catch (err) {
        console.error("获取技能列表失败:", err);
        // 网络错误时显示 mock 数据
        const mockData = convertMockSkills();
        const sortedMockData = mockData.sort((a, b) => b.downloads - a.downloads);
        setSkills(sortedMockData.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, [convertMockSkills]);

  // 获取分类列表
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const result = await response.json();
        if (result.success) {
          // 合并 mock 分类和数据库分类
          const merged = mergeCategories(result.data || []);
          setCategories(merged);
        } else {
          // API 失败时只显示 mock 分类
          setCategories(mockCategoriesData);
        }
      } catch (err) {
        console.error("获取分类失败:", err);
        // 网络错误时显示 mock 分类
        setCategories(mockCategoriesData);
      }
    }
    fetchCategories();
  }, [mergeCategories]);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/skills?keyword=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    router.push(`/skills?keyword=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="flex flex-col">
      {/* Hero 区域 */}
      <section className="relative py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          {/* 大标题 */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            SkillSpace
          </h1>

          {/* 副标题 */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            团队技能沉淀与分享平台，让每个人的经验成为团队的力量
          </p>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="mx-auto mt-10 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索技能名称、描述、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 w-full rounded-2xl border-2 border-border bg-background pl-12 pr-14 text-base shadow-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* 热门标签 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">热门:</span>
            {hotTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 热门技能排行 */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">热门技能</h2>
            </div>
            <Link
              href="/skills?sort=downloads"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              查看全部 →
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-muted"
                />
              ))
            ) : skills.length > 0 ? (
              skills.map((skill, index) => (
                <SkillCardCompact
                  key={skill.id}
                  skill={skill}
                  rank={index + 1}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/50 py-8 text-center">
                <p className="text-sm text-muted-foreground">暂无技能数据</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 分类导航 */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-6 text-xl font-bold text-foreground">探索分类</h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.length > 0 ? (
              categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/skills?category=${category.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-6 transition-all hover:border-primary/50 hover:bg-accent/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {iconMap[category.icon] || <Box className="h-6 w-6" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {category.name}
                  </span>
                </Link>
              ))
            ) : (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6"
                >
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border bg-card p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              探索全部技能
            </h2>
            <p className="max-w-md text-muted-foreground">
              发现更多实用技能，提升工作效率，与团队共同成长
            </p>
            <Link href="/skills">
              <Button size="lg" className="gap-2">
                浏览全部技能
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

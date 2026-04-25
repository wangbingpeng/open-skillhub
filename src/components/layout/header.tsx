"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Lightbulb, Search, Plus, Upload, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/skills", label: "技能" },
  { href: "/forum", label: "论坛" },
  { href: "/knowledge", label: "知识库" },
  { href: "/dashboard", label: "数据看板" },
];

interface HeaderProps {
  isLoggedIn?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

// 发布 Skill 下拉菜单组件
function PublishButton({ mounted }: { mounted: boolean }) {
  if (!mounted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">发布 Skill</span>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors cursor-pointer"
            aria-label="发布 Skill"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">发布 Skill</span>
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-52">
        <a href="/skills/upload">
          <DropdownMenuItem className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
            <Upload className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">上传 Skill</span>
              <span className="text-xs text-muted-foreground">上传文件或文件夹</span>
            </div>
          </DropdownMenuItem>
        </a>
        <a href="/skills/new">
          <DropdownMenuItem className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">生成 Skill</span>
              <span className="text-xs text-muted-foreground">在线编辑生成</span>
            </div>
          </DropdownMenuItem>
        </a>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ isLoggedIn = false, user }: HeaderProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* 左侧：移动端菜单 + Logo */}
        <div className="flex items-center gap-2">
          {/* MobileNav 延迟加载，避免 Sheet 组件的动态 ID 导致 hydration 不匹配 */}
          {mounted && <MobileNav />}
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Lightbulb className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden text-lg font-bold sm:inline-block">
              SkillSpace
            </span>
          </a>
        </div>

        {/* 中间：桌面端导航链接 */}
        <nav className="mx-6 hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = mounted && pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </a>
            );
          })}
        </nav>

        {/* 右侧：搜索 + 创建 + 用户 */}
        <div className="ml-auto flex items-center gap-2">
          <a
            href="/search"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="搜索"
          >
            <Search className="h-4 w-4" />
          </a>

          <PublishButton mounted={mounted} />

          <div className="ml-2">
            {mounted ? (
              <UserMenu isLoggedIn={isLoggedIn} user={user} />
            ) : (
              <span className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground">
                登录
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

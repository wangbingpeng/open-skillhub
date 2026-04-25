"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, Home, Lightbulb, BookOpen, BarChart3, X, Plus, Upload, Sparkles, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "首页",
    icon: Home,
  },
  {
    href: "/skills",
    label: "技能",
    icon: Lightbulb,
  },
  {
    href: "/forum",
    label: "论坛",
    icon: BookOpen,
  },
  {
    href: "/knowledge",
    label: "知识库",
    icon: Database,
  },
  {
    href: "/dashboard",
    label: "数据看板",
    icon: BarChart3,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="打开菜单"
          >
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Lightbulb className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">SkillSpace</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            // 避免 hydration 不匹配：在挂载前不显示激活状态
            const isActive = mounted && pathname === item.href;

            return (
              <SheetClose
                key={item.href}
                render={
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                }
              />
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-4 flex flex-col gap-2">
          <SheetClose
            render={
              <Link
                href="/skills/upload"
                className="inline-flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Upload className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span>上传 Skill</span>
                  <span className="text-xs text-muted-foreground font-normal">上传文件或文件夹</span>
                </div>
              </Link>
            }
          />
          <SheetClose
            render={
              <Link
                href="/skills/new"
                className="inline-flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span>生成 Skill</span>
                  <span className="text-xs text-muted-foreground font-normal">在线编辑生成</span>
                </div>
              </Link>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

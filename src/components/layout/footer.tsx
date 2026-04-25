"use client";

import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Logo 和简介 */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Lightbulb className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">SkillSpace</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              团队技能分享平台，让知识流动起来。
              <br />
              分享你的技能，学习新知识，共同成长。
            </p>
          </div>

          {/* 快捷链接 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">快捷链接</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/announcements"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  公告中心
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  关于我们
                </Link>
              </li>
              <li>
                <Link
                  href="/skills"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  浏览技能
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系方式或额外信息 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">帮助</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/help"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  使用指南
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  反馈建议
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* 版权信息 */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {currentYear} SkillSpace. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              隐私政策
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              服务条款
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

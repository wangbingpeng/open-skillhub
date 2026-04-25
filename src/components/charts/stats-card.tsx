"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * 格式化数字显示
 * 例如: 50000 -> "5万", 1500 -> "1,500"
 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    const wan = (num / 10000).toFixed(1);
    // 去掉末尾的 .0
    return wan.endsWith(".0") ? `${parseInt(wan)}万` : `${wan}万`;
  }
  return num.toLocaleString("zh-CN");
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  iconClassName,
}: StatsCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10",
            iconClassName
          )}
        >
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">
          {formatNumber(value)}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

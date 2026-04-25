"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PostTypeBadgeProps {
  type: "DISCUSSION" | "REQUEST";
  className?: string;
}

export function PostTypeBadge({ type, className }: PostTypeBadgeProps) {
  const config = {
    DISCUSSION: {
      label: "讨论",
      className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
    },
    REQUEST: {
      label: "需求",
      className: "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300",
    },
  };

  const { label, className: badgeClassName } = config[type];

  return (
    <Badge variant="secondary" className={cn(badgeClassName, className)}>
      {label}
    </Badge>
  );
}

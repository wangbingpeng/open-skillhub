"use client";

import { type ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: "light" | "dark" | "system";
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

// 简化的 ThemeProvider，不使用 next-themes
// 避免在 Next.js 16 + React 19 中因 script 标签注入导致的警告
export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  return <>{children}</>;
}

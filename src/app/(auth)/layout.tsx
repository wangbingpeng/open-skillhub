import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { CopyrightYear } from "./copyright-year";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶部 Logo */}
      <header className="px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Lightbulb className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">SkillSpace</span>
        </Link>
      </header>

      {/* 居中内容区域 */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </main>

      {/* 底部版权 */}
      <footer className="border-t px-4 py-4 sm:px-6 lg:px-8">
        <CopyrightYear />
      </footer>
    </div>
  );
}

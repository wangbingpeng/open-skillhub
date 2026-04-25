"use client";

import { signOut } from "next-auth/react";
import { User, LogOut, Settings, BookOpen, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserMenuProps {
  isLoggedIn?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
}

export function UserMenu({ isLoggedIn = false, user }: UserMenuProps) {
  // 未登录状态
  if (!isLoggedIn) {
    return (
      <a
        href="/login"
        className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        登录
      </a>
    );
  }

  // 已登录状态
  const userName = user?.name || "用户";
  const userEmail = user?.email || "";
  const userImage = user?.image;
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userImage || ""} alt={userName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {userName && <p className="font-medium">{userName}</p>}
            {userEmail && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {userEmail}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {user?.role === "ADMIN" && (
          <>
            <a href="/admin">
              <DropdownMenuItem>
                <Shield className="mr-2 h-4 w-4" />
                后台管理
              </DropdownMenuItem>
            </a>
            <DropdownMenuSeparator />
          </>
        )}
        <a href="/profile">
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            个人中心
          </DropdownMenuItem>
        </a>
        <a href="/profile/skills">
          <DropdownMenuItem>
            <BookOpen className="mr-2 h-4 w-4" />
            我的技能
          </DropdownMenuItem>
        </a>
        <a href="/profile/settings">
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            账号设置
          </DropdownMenuItem>
        </a>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

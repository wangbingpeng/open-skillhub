import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// 公开路由（不需要登录）
const publicRoutes = [
  "/",
  "/skills",
  "/forum",
  "/announcements",
  "/login",
  "/register",
];

// 公开路由前缀
const publicPrefixes = [
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/public",
];

// 受保护路由前缀
const protectedPrefixes = [
  "/skills/new",
  "/forum/new",
  "/profile",
  "/dashboard",
  "/admin",
];

// 受保护路由模式（支持通配符）
const protectedPatterns = [
  /^\/skills\/[^/]+\/edit$/, // /skills/[slug]/edit
];

function isPublicRoute(pathname: string): boolean {
  // 检查精确匹配
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // 检查公开前缀
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  // /skills/[slug] 是公开的，但 /skills/new 不是
  if (pathname.startsWith("/skills/")) {
    // 如果是 /skills/new 或 /skills/xxx/edit，不是公开的
    if (pathname === "/skills/new" || pathname.endsWith("/edit")) {
      return false;
    }
    // 其他 /skills/xxx 是公开的
    return true;
  }

  return false;
}

function isProtectedRoute(pathname: string): boolean {
  // 检查受保护前缀
  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  // 检查受保护模式
  if (protectedPatterns.some((pattern) => pattern.test(pathname))) {
    return true;
  }

  return false;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // API 路由不在这里处理
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 公开路由直接通过
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 受保护路由需要登录
  if (isProtectedRoute(pathname)) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // /admin 路由仅 ADMIN 角色可访问
  if (pathname.startsWith("/admin")) {
    const role = req.auth?.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // 已登录用户访问登录/注册页面，重定向到首页
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // 排除静态文件和 API 路由
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

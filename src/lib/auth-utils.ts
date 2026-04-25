import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SafeUser } from "@/types";

/**
 * 服务端获取当前用户信息
 * @returns SafeUser | null 当前用户信息（不含密码），未登录返回 null
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // 从数据库获取最新用户信息
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return null;
  }

  // 返回不含密码的用户信息
  const safeUser: SafeUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    department: user.department,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return safeUser;
}

/**
 * 检查用户是否已登录
 * @returns boolean 是否已登录
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

/**
 * 检查当前用户是否为管理员
 * @returns boolean 是否为管理员
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

/**
 * 检查当前用户是否为编辑或管理员
 * @returns boolean 是否为编辑或管理员
 */
export async function isEditorOrAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";
}

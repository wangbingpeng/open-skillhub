import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SafeUser } from "@/types";

// 注册请求体校验 schema
const registerSchema = z.object({
  username: z
    .string()
    .min(1, "用户名不能为空")
    .max(20, "用户名最多 20 个字符")
    .regex(
      /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/,
      "用户名只能包含中文、字母、数字和下划线"
    ),
  password: z
    .string()
    .min(6, "密码至少需要 6 个字符")
    .max(50, "密码最多 50 个字符"),
  email: z
    .string()
    .min(1, "邮箱不能为空")
    .email("请输入有效的邮箱地址"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 校验请求体
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "参数校验失败",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { username, password, email } = result.data;

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已被注册" },
        { status: 409 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "邮箱已被注册" },
        { status: 409 }
      );
    }

    // 加密密码（12 轮）
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        name: username, // 默认使用用户名作为昵称
      },
    });

    // 返回用户信息（不含密码）
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

    return NextResponse.json(
      {
        message: "注册成功",
        user: safeUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("注册失败:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}

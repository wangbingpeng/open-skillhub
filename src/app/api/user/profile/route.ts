import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 更新资料请求体验校
const updateProfileSchema = z.object({
  name: z.string().min(1, "昵称不能为空").max(50, "昵称最多50字").optional(),
  department: z.string().max(100, "部门最多100字").optional(),
  bio: z.string().max(500, "简介最多500字").optional(),
});

// GET /api/user/profile - 获取当前用户信息
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        department: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json(
      { message: "获取用户信息失败" },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - 更新当前用户信息
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.department !== undefined && {
          department: validatedData.department || null,
        }),
        ...(validatedData.bio !== undefined && {
          bio: validatedData.bio || null,
        }),
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        department: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "数据校验失败", errors: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      { message: "更新用户信息失败" },
      { status: 500 }
    );
  }
}

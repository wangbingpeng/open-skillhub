import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["USER", "EDITOR", "ADMIN"]).optional(),
});

/**
 * PUT /api/admin/users/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    // 不能修改自己的角色
    if (id === session.user.id && data.role && data.role !== "ADMIN") {
      return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: data.role as any },
      select: { id: true, username: true, name: true, role: true },
    });

    return NextResponse.json({ data: user, message: "用户角色更新成功" });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ error: "不能删除自己" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "用户删除成功" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 });
  }
}

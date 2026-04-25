import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

/**
 * PUT /api/admin/skills/[id]/status
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
    const { status } = updateStatusSchema.parse(body);

    const skill = await prisma.skill.update({
      where: { id },
      data: { status: status as any },
      select: { id: true, name: true, status: true },
    });

    return NextResponse.json({ data: skill, message: "技能状态更新成功" });
  } catch (error) {
    console.error("Admin update skill status error:", error);
    return NextResponse.json({ error: "更新技能状态失败" }, { status: 500 });
  }
}

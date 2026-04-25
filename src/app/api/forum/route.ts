import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { z } from "zod";
import slugify from "slugify";
import { PostType, PostStatus } from "@prisma/client";

// 查询参数校验
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  type: z.enum(["DISCUSSION", "REQUEST"]).optional(),
  status: z.enum(["OPEN", "CLOSED", "RESOLVED"]).optional(),
  search: z.string().optional(),
  sort: z.enum(["latest", "popular"]).default("latest"),
});

// 创建帖子请求体验校
const createPostSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字"),
  content: z.string().min(1, "内容不能为空"),
  type: z.enum(["DISCUSSION", "REQUEST"]).default("DISCUSSION"),
  tags: z.array(z.string()).optional(),
  skillId: z.string().optional(),
});

/**
 * GET /api/forum - 获取帖子列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, type, status, search, sort } = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      sort: searchParams.get("sort") || "latest",
    });

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: {
      type?: PostType;
      status?: PostStatus;
      OR?: Array<{
        title?: { contains: string };
        content?: { contains: string };
      }>;
    } = {};

    if (type) {
      where.type = type as PostType;
    }

    if (status) {
      where.status = status as PostStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    // 获取总数
    const total = await prisma.forumPost.count({ where });

    // 构建排序条件
    const orderBy = sort === "popular" 
      ? { viewCount: "desc" as const } 
      : { createdAt: "desc" as const };

    // 获取帖子列表
    const posts = await prisma.forumPost.findMany({
      where,
      orderBy: [
        { pinned: "desc" as const }, // 置顶帖排在前面
        orderBy,
      ],
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        slug: true,
        status: true,
        viewCount: true,
        pinned: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch forum posts:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数错误", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "获取帖子列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forum - 创建帖子
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createPostSchema.parse(body);

    // 生成 slug
    let slug = slugify(validatedData.title, { lower: true, strict: true });
    
    // 检查 slug 是否已存在，如果存在则添加随机后缀
    const existingPost = await prisma.forumPost.findUnique({
      where: { slug },
    });

    if (existingPost) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // 验证 skillId 是否存在
    if (validatedData.skillId) {
      const skill = await prisma.skill.findUnique({
        where: { id: validatedData.skillId },
      });

      if (!skill) {
        return NextResponse.json(
          { error: "关联的技能不存在" },
          { status: 400 }
        );
      }
    }

    // 创建帖子
    const post = await prisma.forumPost.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        type: validatedData.type,
        slug,
        authorId: session.user.id,
        skillId: validatedData.skillId || null,
        tags: validatedData.tags?.join(",") || "",
        status: "OPEN",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 记录审计日志
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_POST",
      targetType: "ForumPost",
      targetId: post.id,
      detail: { title: post.title, type: validatedData.type },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Failed to create forum post:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据校验失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "创建帖子失败" },
      { status: 500 }
    );
  }
}

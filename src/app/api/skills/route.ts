import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 技能列表查询参数 schema
const listQuerySchema = z.object({
  category: z.string().optional(),
  keyword: z.string().optional(),
  sort: z.enum(["default", "newest", "popular", "downloads", "favorites"]).default("default"),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

// 附件 schema
const attachmentSchema = z.object({
  filename: z.string(),
  url: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

// 创建技能请求体 schema
const createSkillSchema = z.object({
  name: z.string().min(1, "技能名称不能为空").max(100, "技能名称不能超过100字符"),
  slug: z.string().min(1, "Slug不能为空").max(100, "Slug不能超过100字符"),
  description: z.string().min(1, "描述不能为空").max(500, "描述不能超过500字符"),
  content: z.string().min(1, "内容不能为空"),
  installation: z.string().optional(),
  version: z.string().default("1.0.0"),
  categoryId: z.string().min(1, "请选择分类"),
  tagIds: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  attachments: z.array(attachmentSchema).default([]),
});

/**
 * GET /api/skills
 * 获取技能列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = listQuerySchema.parse({
      category: searchParams.get("category") || undefined,
      keyword: searchParams.get("keyword") || undefined,
      sort: searchParams.get("sort") || "default",
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    // 构建 where 条件
    const where: any = {
      status: "PUBLISHED", // 只查询已发布的技能
    };

    // 分类过滤
    if (query.category) {
      where.category = {
        slug: query.category,
      };
    }

    // 关键词搜索（SQLite 的 contains 默认大小写不敏感，不支持 mode: "insensitive"）
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
        { tags: { some: { name: { contains: query.keyword } } } },
      ];
    }

    // 构建排序条件
    // 注意：SQLite 不支持 Prisma 的关系计数排序（如 { favorites: { _count: "desc" } }）
    // 对于 favorites 排序，需要在应用层处理
    const needsApplicationSort = query.sort === "favorites";

    let orderBy: any = {};
    switch (query.sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "downloads":
        orderBy = { downloads: "desc" };
        break;
      case "favorites":
        // SQLite 不支持关系计数排序，使用默认排序，后续在应用层排序
        orderBy = { downloads: "desc" };
        break;
      case "popular":
        orderBy = { views: "desc" };
        break;
      default:
        // 综合排序：按下载量 + 收藏数加权
        orderBy = { downloads: "desc" };
        break;
    }

    // 查询总数
    const total = await prisma.skill.count({ where });

    // 查询技能列表
    // 对于 favorites 排序，需要查询所有数据后在应用层排序
    let skills;
    if (needsApplicationSort) {
      // 查询所有匹配的数据
      const allSkills = await prisma.skill.findMany({
        where,
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          _count: {
            select: {
              likes: true,
              favorites: true,
              comments: true,
            },
          },
        },
      });

      // 在应用层按收藏数排序
      allSkills.sort((a, b) => b._count.favorites - a._count.favorites);

      // 手动分页
      const startIndex = (query.page - 1) * query.limit;
      skills = allSkills.slice(startIndex, startIndex + query.limit);
    } else {
      skills = await prisma.skill.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          _count: {
            select: {
              likes: true,
              favorites: true,
              comments: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      data: skills,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error("Get skills error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数错误", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "获取技能列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/skills
 * 创建新技能
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否登录
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createSkillSchema.parse(body);

    // 检查 slug 唯一性
    const existingSlug = await prisma.skill.findUnique({
      where: { slug: validatedData.slug },
      select: { id: true },
    });
    if (existingSlug) {
      return NextResponse.json(
        { error: "该 Slug 已被使用，请更换一个" },
        { status: 409 }
      );
    }

    // 检查 name 唯一性
    const existingName = await prisma.skill.findUnique({
      where: { name: validatedData.name },
      select: { id: true },
    });
    if (existingName) {
      return NextResponse.json(
        { error: "该技能名称已存在，请更换一个" },
        { status: 409 }
      );
    }

    // 验证分类是否存在
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "所选分类不存在" },
        { status: 400 }
      );
    }

    // 处理标签：connectOrCreate（按名称查找或创建）
    const tagConnectOrCreate = validatedData.tagIds.map((tagName) => ({
      where: { name: tagName },
      create: { name: tagName },
    }));

    // 处理附件数据
    const attachmentCreateData = validatedData.attachments.map((att) => ({
      filename: att.filename,
      filepath: att.url,
      size: att.size,
      mimeType: att.mimeType,
    }));

    // 创建技能记录（含关联）
    const newSkill = await prisma.skill.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        content: validatedData.content,
        installation: validatedData.installation || null,
        version: validatedData.version,
        status: validatedData.status,
        categoryId: validatedData.categoryId,
        authorId: session.user.id!,
        tags: {
          connectOrCreate: tagConnectOrCreate,
        },
        attachments: {
          create: attachmentCreateData,
        },
      },
      include: {
        category: true,
        tags: true,
        attachments: true,
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: newSkill,
      message: "技能创建成功",
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create skill error:", error);
    console.error("Error type:", typeof error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "创建技能失败";
    return NextResponse.json(
      { error: "创建技能失败", detail: errorMessage },
      { status: 500 }
    );
  }
}

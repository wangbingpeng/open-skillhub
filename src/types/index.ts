import type { Skill, Category, Tag, User, Comment, SkillVersion } from "@prisma/client"

// 安全的用户类型（不含密码）
export type SafeUser = Omit<User, "password">

// 技能列表项（含作者和分类）
export type SkillWithRelations = Skill & {
  author: SafeUser
  category: Category
  tags: Tag[]
  _count: {
    likes: number
    favorites: number
    comments: number
  }
}

// 技能详情（含更多关联数据）
export type SkillDetail = SkillWithRelations & {
  versions: SkillVersion[]
  comments: (Comment & { author: SafeUser })[]
  installation?: string  // 使用说明/安装指南
}

// 论坛帖子类型
export interface ForumPostWithAuthor {
  id: string
  title: string
  content: string
  type: 'DISCUSSION' | 'REQUEST'
  slug: string
  status: 'OPEN' | 'CLOSED' | 'RESOLVED'
  viewCount: number
  pinned: boolean
  tags: string
  authorId: string
  author: SafeUser
  skillId: string | null
  skill?: { id: string; name: string; slug: string } | null
  replies?: ForumReplyWithAuthor[]
  _count?: { replies: number }
  createdAt: string | Date
  updatedAt: string | Date
}

// 论坛回复类型
export interface ForumReplyWithAuthor {
  id: string
  content: string
  likeCount: number
  authorId: string
  author: SafeUser
  postId: string
  parentId: string | null
  children?: ForumReplyWithAuthor[]
  createdAt: string | Date
  updatedAt: string | Date
}

// 审计日志类型
export interface AuditLogEntry {
  id: string
  action: string
  targetType: 'ForumPost' | 'ForumReply'
  targetId: string
  detail: string | null
  ipAddress: string | null
  userId: string
  user?: SafeUser
  createdAt: string | Date
}

// 论坛帖子列表查询参数
export interface ForumQueryParams {
  page?: number
  limit?: number
  type?: 'DISCUSSION' | 'REQUEST'
  status?: 'OPEN' | 'CLOSED' | 'RESOLVED'
  search?: string
  sort?: 'latest' | 'popular'
}

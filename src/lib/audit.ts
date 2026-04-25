import { prisma } from './prisma'
import { AuditAction } from '@prisma/client'

interface AuditLogParams {
  userId: string
  action: AuditAction
  targetType: 'ForumPost' | 'ForumReply' | 'KnowledgeBase' | 'Document'
  targetId: string
  detail?: Record<string, unknown>
  ipAddress?: string
}

/**
 * 创建审计日志记录
 */
export async function createAuditLog({
  userId,
  action,
  targetType,
  targetId,
  detail,
  ipAddress,
}: AuditLogParams) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      targetType,
      targetId,
      detail: detail ? JSON.stringify(detail) : null,
      ipAddress: ipAddress || null,
    },
  })
}

/**
 * 从 Next.js Request 对象中提取客户端 IP 地址
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return undefined
}

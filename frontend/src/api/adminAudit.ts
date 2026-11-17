import request from '@/utils/request'

// 管理端敏感操作审计记录。
export interface AdminAuditLog {
  _id: string
  operatorUsername: string
  action: string
  targetType?: string
  targetId?: string
  reason?: string
  details?: {
    status?: string
    previousStatus?: string
    daysToKeep?: number
    totalRemoved?: number
    [key: string]: unknown
  }
  ip?: string
  success?: boolean
  createdAt: string
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// 查询审计日志；返回结果由 request 拦截器规范为数组，并保留 pagination。
export function getAdminAuditLogs(params: {
  page: number
  pageSize: number
  action?: string
  operator?: string
  from?: string
  to?: string
}) {
  return request.get<ApiEnvelope<AdminAuditLog[]>>('/admin/audit-logs', { params })
}

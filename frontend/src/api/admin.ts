import request from '@/utils/request'

export type AdminUserStatus = 'active' | 'disabled' | 'pending'
export type AdminUserRole = 'user' | 'admin' | 'manager'

export interface AdminUser {
  _id: string
  username: string
  email?: string
  phone?: string
  role: AdminUserRole
  status: AdminUserStatus
  avatar?: string
  isVerified?: boolean
  createdAt?: string
  createTime?: string
  updatedAt?: string
  totalWords?: number
  currentChapter?: string
  cet4?: {
    learnedWords?: number
    todayStudiedWords?: number
    streakDays?: number
    lastStudyTime?: string
  }
  chapters?: Record<string, {
    level: number
    score: number
    completedWords: number
  }>
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

// request 拦截器会把后端 data.items 规范为 data 数组，并保留 pagination。
export function getAdminUsers(params: { search: string; page: number; pageSize: number }) {
  return request.get<ApiEnvelope<AdminUser[]>>('/admin/users', { params })
}

// 对路径参数编码，避免 ID 中的特殊字符被解释成 URL 结构。
export function getAdminUser(userId: string) {
  return request.get<ApiEnvelope<AdminUser>>(`/admin/users/${encodeURIComponent(userId)}`)
}

// 状态接口只接受启用/禁用；管理员角色不能从这个 API 修改。
export function setAdminUserStatus(userId: string, status: 'active' | 'disabled') {
  return request.patch<ApiEnvelope<AdminUser>>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    { status }
  )
}
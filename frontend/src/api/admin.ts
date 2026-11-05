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

// 管理概况接口返回的平台账号和学习统计。
export interface AdminOverview {
  date: string
  totalUsers: number
  activeAccounts: number
  newUsersToday: number
  todayLearners: number
  todayLearnedWords: number
  totalLearnedWords: number
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

// 获取后台首页概览数据；接口会在服务端确认当前用户拥有后台权限。
export function getAdminOverview() {
  return request.get<ApiEnvelope<AdminOverview>>('/admin/stats')
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
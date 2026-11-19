import request from '@/utils/request'

// 限定日志类型，避免前端拼出后端不支持的日志接口地址。
export type AdminLogType = 'combined' | 'error' | 'access'

// 日志接口统一返回 success、message 和 data 三个字段。
interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

// 根据是否填写关键词，选择“搜索日志”或“读取最近日志”接口。
export function getAdminLogs(params: { type: AdminLogType; keyword: string; lines: number }) {
  if (params.keyword) {
    // 搜索接口通过 query 参数接收日志类型、关键词和最多读取的行数。
    return request.get<ApiEnvelope<string[]>>('/logs/search', {
      params: { keyword: params.keyword, type: params.type, lines: params.lines }
    })
  }

  // 没有关键词时直接读取所选类型的最近日志。
  return request.get<ApiEnvelope<string[]>>(`/logs/${params.type}`, {
    params: { lines: params.lines }
  })
}

// 单个日志文件的清理结果；bytesAfter 用来确认文件确实被重写。
export interface AdminLogCleanFile {
  name: string
  entriesRemoved: number
  entriesKept: number
  bytesBefore: number
  bytesAfter: number
}

// 清理接口返回保留天数、截止时间和逐文件明细。
export interface AdminLogCleanResult {
  daysToKeep: number
  cutoff: string
  totalRemoved: number
  files: AdminLogCleanFile[]
}

// 清理保留天数之前的日志，仅 admin 可调用。
export function cleanAdminLogs(daysToKeep: number) {
  return request.post<ApiEnvelope<AdminLogCleanResult>>('/logs/clean', { daysToKeep })
}

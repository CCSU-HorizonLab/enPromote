import request from '@/utils/request'

// 限定日志类型，避免前端拼出后端不支持的日志接口地址。
export type AdminLogType = 'combined' | 'error' | 'access'

// 日志接口统一返回 success、message 和 data 三个字段。
interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

// 根据是否填写关键词，选择“读取日志”或“搜索日志”接口。
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

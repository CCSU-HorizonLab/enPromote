<template>
  <main class="admin-page">
    <section class="admin-heading">
      <div>
        <p class="eyebrow">WORDWISE / ADMINISTRATION</p>
        <h1>审计日志</h1>
        <p class="intro">查看管理端的账号状态变更、日志清理等敏感操作记录。</p>
      </div>
      <div class="heading-actions">
        <router-link class="back-link" to="/admin">用户管理</router-link>
        <router-link class="back-link" to="/admin/logs">系统日志</router-link>
      </div>
    </section>

    <!-- 筛选条件：动作、操作人和时间范围，提交后从第一页重新查询。 -->
    <form class="filters" role="search" @submit.prevent="applyFilters">
      <label>
        <span>动作</span>
        <select v-model="actionDraft">
          <option value="">全部动作</option>
          <option v-for="item in actionOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>
      <label class="operator-field">
        <span>操作人</span>
        <input v-model="operatorDraft" type="search" placeholder="用户名，支持模糊匹配" />
      </label>
      <label>
        <span>开始日期</span>
        <input v-model="fromDraft" type="date" />
      </label>
      <label>
        <span>结束日期</span>
        <input v-model="toDraft" type="date" />
      </label>
      <button class="search-button" type="submit" :disabled="loading">查询</button>
    </form>

    <p v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
      <button type="button" class="text-button" @click="loadLogs">重试</button>
    </p>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">时间</th>
            <th scope="col">操作人</th>
            <th scope="col">动作</th>
            <th scope="col">目标</th>
            <th scope="col">原因 / 详情</th>
            <th scope="col">结果</th>
            <th scope="col">IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="table-message" colspan="7">正在加载审计日志…</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td class="table-message" colspan="7">没有找到审计记录</td>
          </tr>
          <tr v-for="log in logs" :key="log._id">
            <td>{{ formatTime(log.createdAt) }}</td>
            <td>{{ log.operatorUsername || '—' }}</td>
            <td>{{ actionLabel(log.action) }}</td>
            <td>{{ targetText(log) }}</td>
            <td class="detail-cell">{{ detailText(log) }}</td>
            <td>
              <span class="status" :class="log.success === false ? 'status-disabled' : 'status-active'">
                {{ log.success === false ? '失败' : '成功' }}
              </span>
            </td>
            <td>{{ log.ip || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="pagination-bar">
      <span>共 {{ pagination.total }} 条记录</span>
      <div class="pagination-controls">
        <button type="button" :disabled="loading || pagination.page <= 1" @click="changePage(-1)">上一页</button>
        <span>{{ pagination.page }} / {{ Math.max(pagination.totalPages, 1) }}</span>
        <button type="button" :disabled="loading || pagination.page >= pagination.totalPages" @click="changePage(1)">下一页</button>
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAdminAuditLogs } from '@/api/adminAudit'
import type { AdminAuditLog } from '@/api/adminAudit'

const pageSize = 20
// 目前后端会写入的敏感动作；新增动作时在这里补一项即可。
const actionOptions = [
  { value: 'ADMIN_UPDATE_USER_STATUS', label: '修改账号状态' },
  { value: 'CLEAN_OLD_LOGS', label: '清理日志' }
]
// *Draft 是输入框里的值，*Applied 是真正提交给接口的值。
// 分开保存是为了让用户输入过程中不会自动触发查询，只有点“查询”才生效。
const actionDraft = ref('')
const operatorDraft = ref('')
const fromDraft = ref('')
const toDraft = ref('')
const action = ref('')
const operator = ref('')
const from = ref('')
const to = ref('')
const logs = ref<AdminAuditLog[]>([])
const loading = ref(false)
const errorMessage = ref('')
// 首次加载和接口异常时使用这个默认分页，避免模板里出现 undefined。
const pagination = ref({ page: 1, pageSize, total: 0, totalPages: 0 })

function errorText(error: unknown): string {
  const responseMessage = (error as { response?: { data?: { message?: string } } })
    .response?.data?.message
  return responseMessage || '审计日志加载失败，请稍后重试'
}

// 提交筛选条件时回到第一页，避免当前页超出新结果范围。
function applyFilters() {
  action.value = actionDraft.value
  operator.value = operatorDraft.value.trim()
  from.value = fromDraft.value
  to.value = toDraft.value
  pagination.value.page = 1
  loadLogs()
}

async function loadLogs() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await getAdminAuditLogs({
      page: pagination.value.page,
      pageSize,
      // 空字符串不传给后端，避免后端把空条件当成精确匹配。
      action: action.value || undefined,
      operator: operator.value || undefined,
      from: from.value || undefined,
      to: to.value || undefined
    })
    // request 拦截器会把后端的 data.items 规范成 data 数组，
    // 同时把 data.pagination 提升到顶层。
    logs.value = response.data.data || []
    pagination.value = response.data.pagination || {
      page: 1,
      pageSize,
      total: logs.value.length,
      totalPages: logs.value.length ? 1 : 0
    }
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    loading.value = false
  }
}

function changePage(offset: number) {
  pagination.value.page += offset
  loadLogs()
}

function actionLabel(value: string): string {
  return actionOptions.find(item => item.value === value)?.label || value || '—'
}

function targetText(log: AdminAuditLog): string {
  if (log.targetType === 'user') return `用户 ${log.targetId || '—'}`
  if (log.targetType === 'log') return '系统日志'
  return log.targetType || '—'
}

// 把原因和动作相关字段拼成一行，避免表格里堆原始 JSON。
function detailText(log: AdminAuditLog): string {
  const details = log.details || {}
  const parts: string[] = []
  if (log.reason) parts.push(`原因：${log.reason}`)
  if (log.action === 'ADMIN_UPDATE_USER_STATUS') {
    parts.push(`状态：${details.status === 'active' ? '启用' : '禁用'}`)
  }
  if (log.action === 'CLEAN_OLD_LOGS') {
    if (details.daysToKeep !== undefined) parts.push(`保留 ${details.daysToKeep} 天`)
    if (details.totalRemoved !== undefined) parts.push(`删除 ${details.totalRemoved} 条`)
  }
  return parts.length ? parts.join('；') : '—'
}

function formatTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

onMounted(loadLogs)
</script>

<style scoped>
.admin-page {
  width: min(1180px, calc(100% - 40px));
  min-height: calc(100vh - 72px);
  margin: 0 auto;
  padding: 48px 0 72px;
  color: #20312c;
}

.admin-heading,
.heading-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.admin-heading {
  padding-bottom: 28px;
  border-bottom: 1px solid #dce6df;
}

.heading-actions {
  flex: 0 0 auto;
}

.eyebrow {
  margin: 0;
  color: #64776e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

h1 {
  margin: 10px 0 8px;
  font-size: 34px;
  line-height: 1.15;
}

.intro {
  margin: 0;
  color: #64776e;
  line-height: 1.65;
}

.back-link,
.search-button {
  flex: 0 0 auto;
  padding: 10px 14px;
  border: 1px solid #cbd9d1;
  border-radius: 6px;
  background: #fff;
  color: #205e4d;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.back-link:hover,
.search-button:hover:not(:disabled) {
  background: #eaf3ed;
}

.search-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.filters {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
  margin: 28px 0 18px;
}

.filters label {
  display: grid;
  gap: 6px;
  color: #64776e;
  font-size: 13px;
  font-weight: 700;
}

.filters select,
.filters input {
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #cbd9d1;
  border-radius: 6px;
  background: #fff;
  color: #20312c;
  font: inherit;
}

.operator-field {
  flex: 1;
  min-width: 180px;
}

.error-message {
  margin: 0 0 12px;
  color: #ad493b;
  font-size: 14px;
}

.text-button {
  padding: 4px 6px;
  border: 0;
  background: transparent;
  color: #205e4d;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid #dce6df;
  border-radius: 8px;
  background: #fff;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
}

th,
td {
  padding: 13px 16px;
  border-bottom: 1px solid #edf1ee;
  font-size: 13px;
}

th {
  background: #f3f7f3;
  color: #64776e;
  font-size: 12px;
  font-weight: 700;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.detail-cell {
  max-width: 340px;
  overflow-wrap: anywhere;
  white-space: normal;
}

.status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-active {
  background: #e6f4eb;
  color: #287451;
}

.status-disabled {
  background: #fff0ed;
  color: #ad493b;
}

.table-message {
  height: 112px;
  color: #78877f;
  text-align: center;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 2px;
  color: #64776e;
  font-size: 13px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-controls button {
  padding: 7px 10px;
  border: 1px solid #cbd9d1;
  border-radius: 5px;
  background: #fff;
  color: #205e4d;
  cursor: pointer;
}

.pagination-controls button:disabled {
  color: #9ba8a0;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .admin-page {
    width: min(100% - 28px, 560px);
    padding-top: 30px;
  }

  .admin-heading,
  .filters {
    align-items: stretch;
    flex-direction: column;
  }

  .heading-actions {
    justify-content: flex-start;
  }

  .operator-field {
    min-width: 0;
  }
}
</style>

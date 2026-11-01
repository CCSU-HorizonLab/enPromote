<template>
  <main class="admin-page">
    <section class="admin-heading">
      <div>
        <p class="eyebrow">WORDWISE / ADMINISTRATION</p>
        <h1>用户管理</h1>
        <p class="intro">
          {{ user?.role === 'manager' ? '只读查看平台账号和学习概况。' : '查询账号、查看学习概况，并管理普通用户的访问状态。' }}
        </p>
      </div>
      <div class="heading-actions">
        <router-link class="back-link" to="/admin/logs">查看日志</router-link>
        <router-link class="back-link" to="/">返回学习平台</router-link>
      </div>
    </section>

    <section class="access-panel" aria-label="当前后台用户">
      <span class="access-mark" aria-hidden="true">A</span>
      <div>
        <p class="panel-label">{{ user?.role === 'manager' ? '当前运营人员' : '当前管理员' }}</p>
        <strong>{{ username }}</strong>
      </div>
      <span class="access-status">
        {{ user?.role === 'manager' ? '只读权限已验证' : '管理员权限已验证' }}
      </span>
    </section>

    <!-- 用户目录集中展示检索、分页和账号管理入口。 -->
    <section class="users-section" aria-labelledby="users-title">
      <div class="section-heading">
        <div>
          <p class="panel-label">账号目录</p>
          <h2 id="users-title">平台用户 <span>{{ pagination.total }}</span></h2>
        </div>
        <form class="search-form" role="search" @submit.prevent="applySearch">
          <label class="visually-hidden" for="user-search">搜索用户名、邮箱或手机号</label>
          <input
            id="user-search"
            v-model="searchDraft"
            type="search"
            autocomplete="off"
            placeholder="用户名、邮箱或手机号"
          />
          <button class="search-button" type="submit" :disabled="loading">搜索</button>
        </form>
      </div>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
        <button type="button" class="text-button" @click="loadUsers">重试</button>
      </p>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">用户</th>
              <th scope="col">角色</th>
              <th scope="col">状态</th>
              <th scope="col">累计学习词数</th>
              <th scope="col">注册时间</th>
              <th scope="col"><span class="visually-hidden">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td class="table-message" colspan="6">正在加载用户…</td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td class="table-message" colspan="6">没有找到匹配的用户</td>
            </tr>
            <tr v-for="account in users" :key="account._id">
              <td>
                <button class="user-link" type="button" @click="openDetails(account._id)">
                  <span class="user-name">{{ account.username }}</span>
                  <span class="user-contact">{{ account.email || account.phone || '未填写联系方式' }}</span>
                </button>
              </td>
              <td>{{ roleLabel(account.role) }}</td>
              <td><span class="status" :class="`status-${account.status}`">{{ statusLabel(account.status) }}</span></td>
              <td>{{ account.totalWords ?? account.cet4?.learnedWords ?? 0 }}</td>
              <td>{{ formatDate(account.createdAt || account.createTime) }}</td>
              <td class="actions-cell">
                <button class="text-button" type="button" @click="openDetails(account._id)">详情</button>
                <!-- manager 为只读角色，所以只有 admin 会看到启用/禁用按钮。 -->
                <button
                  v-if="user?.role === 'admin' && account.role === 'user' && account._id !== currentUserId"
                  class="text-button"
                  :class="account.status === 'disabled' ? 'enable-action' : 'disable-action'"
                  type="button"
                  :disabled="pendingUserId === account._id"
                  @click="toggleStatus(account)"
                >
                  {{ pendingUserId === account._id ? '处理中…' : account.status === 'disabled' ? '启用' : '禁用' }}
                </button>
                <span v-else class="protected-label">{{ user?.role === 'manager' ? '只读' : '受保护' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="pagination-bar">
        <span>共 {{ pagination.total }} 个账号</span>
        <div class="pagination-controls">
          <button type="button" aria-label="上一页" :disabled="loading || pagination.page <= 1" @click="changePage(-1)">上一页</button>
          <span>{{ pagination.page }} / {{ Math.max(pagination.totalPages, 1) }}</span>
          <button type="button" aria-label="下一页" :disabled="loading || pagination.page >= pagination.totalPages" @click="changePage(1)">下一页</button>
        </div>
      </footer>
    </section>

    <!-- 详情面板单独请求完整资料，避免列表接口传输不需要的章节数据。 -->
    <div v-if="selectedUser || detailLoading" class="detail-overlay" @click.self="closeDetails">
      <section class="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header class="detail-heading">
          <div>
            <p class="panel-label">账号资料</p>
            <h2 id="detail-title">{{ selectedUser?.username || '用户详情' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="关闭详情" @click="closeDetails">×</button>
        </header>
        <p v-if="detailLoading" class="detail-loading">正在加载…</p>
        <template v-else-if="selectedUser">
          <dl class="detail-list">
            <div><dt>账号角色</dt><dd>{{ roleLabel(selectedUser.role) }}</dd></div>
            <div><dt>账号状态</dt><dd>{{ statusLabel(selectedUser.status) }}</dd></div>
            <div><dt>邮箱</dt><dd>{{ selectedUser.email || '未填写' }}</dd></div>
            <div><dt>手机号</dt><dd>{{ selectedUser.phone || '未填写' }}</dd></div>
            <div><dt>注册时间</dt><dd>{{ formatDate(selectedUser.createdAt || selectedUser.createTime) }}</dd></div>
            <div><dt>累计学习词数</dt><dd>{{ selectedUser.totalWords ?? selectedUser.cet4?.learnedWords ?? 0 }}</dd></div>
            <div><dt>当前章节</dt><dd>{{ selectedUser.currentChapter || '未开始' }}</dd></div>
            <div><dt>连续学习天数</dt><dd>{{ selectedUser.cet4?.streakDays ?? 0 }}</dd></div>
            <div><dt>今日学习词数</dt><dd>{{ selectedUser.cet4?.todayStudiedWords ?? 0 }}</dd></div>
          </dl>
          <div v-if="selectedUser.chapters && Object.keys(selectedUser.chapters).length" class="chapter-progress">
            <h3>章节进度</h3>
            <div v-for="(chapter, chapterId) in selectedUser.chapters" :key="chapterId" class="chapter-row">
              <strong>章节 {{ chapterId }}</strong>
              <span>第 {{ chapter.level }} 关</span>
              <span>{{ chapter.completedWords }} 个完成词</span>
            </div>
          </div>
        </template>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAdminUser, getAdminUsers, setAdminUserStatus } from '@/api/admin'
import type { AdminUser, AdminUserStatus } from '@/api/admin'
import { user } from '@/stores/userStore'

const pageSize = 20
// 当前后台账号的显示信息和 ID；currentUserId 用于避免在列表中操作自己。
const username = user.value?.username || '管理员'
const currentUserId = user.value?._id
// searchDraft 是输入框内容；search 是实际提交给接口的关键词。
const searchDraft = ref('')
const search = ref('')
// 页面状态：列表、请求状态、错误信息和详情弹窗数据。
const users = ref<AdminUser[]>([])
const loading = ref(false)
const errorMessage = ref('')
const pendingUserId = ref('')
const selectedUser = ref<AdminUser | null>(null)
const detailLoading = ref(false)
const pagination = ref({ page: 1, pageSize, total: 0, totalPages: 0 })

// 优先展示服务端返回的业务错误，网络或未知错误则使用统一提示。
function errorText(error: unknown): string {
  const responseMessage = (error as { response?: { data?: { message?: string } } })
    .response?.data?.message
  return responseMessage || '请求失败，请稍后重试'
}

// 根据当前搜索词和页码读取列表，同时接收服务端分页元数据。
async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await getAdminUsers({
      search: search.value,
      page: pagination.value.page,
      pageSize
    })
    users.value = response.data.data || []
    pagination.value = response.data.pagination || {
      page: 1,
      pageSize,
      total: users.value.length,
      totalPages: users.value.length ? 1 : 0
    }
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    loading.value = false
  }
}

// 新检索从第一页开始，避免当前页超出新结果的页数范围。
function applySearch() {
  search.value = searchDraft.value.trim()
  pagination.value.page = 1
  loadUsers()
}

// 翻页按钮会在边界禁用；具体分页仍由服务端执行。
function changePage(offset: number) {
  pagination.value.page += offset
  loadUsers()
}

// 详情按需加载，减少列表首屏的数据量。
async function openDetails(userId: string) {
  detailLoading.value = true
  selectedUser.value = null
  try {
    const response = await getAdminUser(userId)
    selectedUser.value = response.data.data
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    detailLoading.value = false
  }
}

function closeDetails() {
  selectedUser.value = null
  detailLoading.value = false
}

// 修改状态前二次确认，并同步更新列表和已打开的详情。
// 后端还会独立验证 admin 权限，不能只依赖这里隐藏按钮。
async function toggleStatus(account: AdminUser) {
  const nextStatus: 'active' | 'disabled' = account.status === 'disabled' ? 'active' : 'disabled'
  const actionLabel = nextStatus === 'disabled' ? '禁用' : '启用'
  if (!window.confirm(`确定${actionLabel}用户“${account.username}”吗？`)) return

  pendingUserId.value = account._id
  errorMessage.value = ''
  try {
    const response = await setAdminUserStatus(account._id, nextStatus)
    const updatedStatus = response.data.data.status as AdminUserStatus
    const target = users.value.find(item => item._id === account._id)
    if (target) target.status = updatedStatus
    if (selectedUser.value?._id === account._id) selectedUser.value.status = updatedStatus
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    pendingUserId.value = ''
  }
}

function roleLabel(role: AdminUser['role']): string {
  return { user: '普通用户', manager: '运营人员', admin: '管理员' }[role]
}

function statusLabel(status: AdminUserStatus): string {
  return { active: '正常', disabled: '已禁用', pending: '待审核' }[status]
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('zh-CN')
}

// 组件显示后读取第一页用户数据。
onMounted(loadUsers)
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
.section-heading,
.detail-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}

.heading-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

.admin-heading {
  padding-bottom: 28px;
  border-bottom: 1px solid #dce6df;
}

.eyebrow,
.panel-label {
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

.access-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 22px 0 36px;
  padding: 16px 18px;
  border: 1px solid #dce6df;
  border-radius: 8px;
  background: #fff;
}

.access-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  background: #dff0e5;
  color: #205e4d;
  font-weight: 800;
}

.access-panel strong {
  display: block;
  margin-top: 4px;
  font-size: 15px;
}

.access-status {
  margin-left: auto;
  color: #287451;
  font-size: 13px;
  font-weight: 700;
}

.section-heading {
  align-items: center;
  margin-bottom: 18px;
}

h2 {
  margin: 7px 0 0;
  font-size: 22px;
}

h2 span {
  margin-left: 6px;
  color: #718078;
  font-size: 14px;
  font-weight: 500;
}

.search-form {
  display: flex;
  width: min(420px, 100%);
  gap: 8px;
}

.search-form input {
  min-width: 0;
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #cbd9d1;
  border-radius: 6px;
  background: #fff;
  color: #20312c;
  font: inherit;
}

.search-form input:focus {
  border-color: #29896c;
  outline: 2px solid #cce8dc;
}

.search-button:disabled {
  cursor: wait;
  opacity: 0.6;
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

.user-link {
  display: grid;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.user-name {
  color: #205e4d;
  font-weight: 700;
}

.user-contact {
  color: #78877f;
  font-size: 12px;
}

.status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  background: #edf1ee;
  color: #5c6962;
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

.actions-cell {
  text-align: right;
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

.text-button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.disable-action {
  color: #ad493b;
}

.enable-action {
  color: #287451;
}

.protected-label {
  padding: 4px 6px;
  color: #78877f;
  font-size: 12px;
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

.error-message {
  margin: 0 0 12px;
  color: #ad493b;
  font-size: 14px;
}

.detail-overlay {
  position: fixed;
  z-index: 300;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgb(22 35 30 / 38%);
}

.detail-panel {
  width: min(480px, 100%);
  height: 100%;
  overflow-y: auto;
  padding: 32px;
  background: #fffdf8;
  box-shadow: -12px 0 40px rgb(22 35 30 / 16%);
}

.detail-heading {
  align-items: flex-start;
  padding-bottom: 20px;
  border-bottom: 1px solid #dce6df;
}

.close-button {
  width: 34px;
  height: 34px;
  border: 1px solid #dce6df;
  border-radius: 5px;
  background: #fff;
  color: #20312c;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.detail-list {
  margin: 8px 0 0;
}

.detail-list div,
.chapter-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 0;
  border-bottom: 1px solid #edf1ee;
  font-size: 14px;
}

.detail-list dt {
  color: #64776e;
}

.detail-list dd {
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
}

.chapter-progress {
  margin-top: 28px;
}

.chapter-progress h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.chapter-row span {
  color: #64776e;
}

.detail-loading {
  padding: 24px 0;
  color: #64776e;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 700px) {
  .admin-page {
    width: min(100% - 28px, 560px);
    padding-top: 30px;
  }

  .admin-heading,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  h1 {
    font-size: 30px;
  }

  .search-form {
    width: 100%;
  }

  .access-panel {
    flex-wrap: wrap;
  }

  .access-status {
    width: 100%;
    margin-left: 54px;
  }

  .detail-panel {
    padding: 24px 20px;
  }
}
</style>
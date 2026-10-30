<template>
  <main class="admin-page">
    <section class="admin-heading">
      <div>
        <p class="eyebrow">WORDWISE / ADMINISTRATION</p>
        <h1>系统日志</h1>
        <p class="intro">查看平台访问记录和运行日志。</p>
      </div>
      <div class="heading-actions">
        <router-link class="back-link" to="/admin">用户管理</router-link>
        <router-link class="back-link" to="/">返回学习平台</router-link>
      </div>
    </section>

    <!-- 搜索表单控制日志类别和关键词，日志列表显示查询结果。 -->
    <section class="logs-section" aria-label="日志查询">
      <form class="filters" role="search" @submit.prevent="loadLogs">
        <label>
          <span>日志类型</span>
          <select v-model="type">
            <option value="combined">综合日志</option>
            <option value="error">错误日志</option>
            <option value="access">访问日志</option>
          </select>
        </label>
        <label class="keyword-field">
          <span>关键词</span>
          <input v-model="keywordDraft" type="search" placeholder="输入关键词筛选" />
        </label>
        <button class="back-link query-button" type="submit" :disabled="loading">查询</button>
      </form>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
        <button type="button" class="text-button" @click="loadLogs">重试</button>
      </p>

      <div class="log-list" aria-live="polite">
        <p v-if="loading" class="list-message">正在加载日志…</p>
        <p v-else-if="logs.length === 0" class="list-message">没有找到日志记录</p>
        <pre v-for="(line, index) in logs" v-else :key="`${index}-${line}`" class="log-line">{{ line }}</pre>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAdminLogs } from '@/api/adminLogs'
import type { AdminLogType } from '@/api/adminLogs'

// type 决定查看哪类日志；keywordDraft 是输入框值，keyword 是提交查询时的值。
const type = ref<AdminLogType>('combined')
const keywordDraft = ref('')
const keyword = ref('')
const logs = ref<string[]>([])
const loading = ref(false)
const errorMessage = ref('')

// 优先展示后端返回的错误原因；没有服务端信息时提供通用提示。
function errorText(error: unknown): string {
  const responseMessage = (error as { response?: { data?: { message?: string } } })
    .response?.data?.message
  return responseMessage || '日志加载失败，请稍后重试'
}

// 读取最近 100 行；有关键词时由 API 函数改用搜索接口。
async function loadLogs() {
  loading.value = true
  errorMessage.value = ''
  keyword.value = keywordDraft.value.trim()
  try {
    const response = await getAdminLogs({ type: type.value, keyword: keyword.value, lines: 100 })
    logs.value = response.data.data || []
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    loading.value = false
  }
}

// 首次打开页面时自动读取综合日志。
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
.query-button {
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

.query-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.filters {
  display: flex;
  align-items: flex-end;
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

.keyword-field {
  flex: 1;
}

.log-list {
  overflow: auto;
  max-height: 65vh;
  border: 1px solid #dce6df;
  border-radius: 8px;
  background: #fff;
}

.log-line {
  margin: 0;
  padding: 11px 14px;
  border-bottom: 1px solid #edf1ee;
  color: #30443b;
  font: 13px/1.55 Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.log-line:last-child {
  border-bottom: 0;
}

.list-message {
  margin: 0;
  padding: 28px;
  color: #64776e;
  text-align: center;
}

.error-message {
  color: #a33b32;
}

.text-button {
  border: 0;
  background: transparent;
  color: #205e4d;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 640px) {
  .admin-heading,
  .filters {
    align-items: stretch;
    flex-direction: column;
  }

  .heading-actions {
    justify-content: flex-start;
  }
}
</style>

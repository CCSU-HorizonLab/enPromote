<template>
  <main class="admin-page">
    <section class="admin-heading">
      <div>
        <p class="eyebrow">WORDWISE / ADMINISTRATION</p>
        <h1>管理员控制台</h1>
        <p class="intro">管理入口已启用。你可以从这里继续建设平台运营与内容管理功能。</p>
      </div>
      <router-link class="back-link" to="/">返回学习平台</router-link>
    </section>

    <section class="access-panel" aria-label="当前管理员">
      <span class="access-mark" aria-hidden="true">A</span>
      <div>
        <p class="panel-label">当前管理员</p>
        <strong>{{ username }}</strong>
      </div>
      <span class="access-status">管理员权限已验证</span>
    </section>

    <section class="next-step">
      <p class="panel-label">管理模块</p>
      <h2>从用户管理开始</h2>
      <p>用户查询、账号状态管理和运营数据尚未接入。下一步可在此控制台增加用户管理页面，并为对应操作配置管理员专属 API。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { user } from '@/stores/userStore'

const username = computed(() => user.value?.username || '管理员')
</script>

<style scoped>
.admin-page {
  width: min(1080px, calc(100% - 40px));
  min-height: calc(100vh - 72px);
  margin: 0 auto;
  padding: 64px 0 80px;
  color: #20312c;
}

.admin-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  padding-bottom: 32px;
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
  margin: 12px 0 8px;
  font-size: 36px;
  line-height: 1.15;
}

.intro,
.next-step > p:last-child {
  max-width: 620px;
  margin: 0;
  color: #64776e;
  line-height: 1.7;
}

.back-link {
  flex: 0 0 auto;
  padding: 10px 14px;
  border: 1px solid #cbd9d1;
  border-radius: 6px;
  color: #205e4d;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.back-link:hover {
  background: #eaf3ed;
}

.access-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 28px;
  padding: 20px;
  border: 1px solid #dce6df;
  border-radius: 8px;
  background: #fff;
}

.access-mark {
  display: grid;
  width: 42px;
  height: 42px;
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

.next-step {
  margin-top: 44px;
}

.next-step h2 {
  margin: 12px 0 8px;
  font-size: 22px;
}

@media (max-width: 640px) {
  .admin-page {
    width: min(100% - 32px, 520px);
    padding-top: 36px;
  }

  .admin-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  h1 {
    font-size: 30px;
  }

  .access-panel {
    flex-wrap: wrap;
  }

  .access-status {
    width: 100%;
    margin-left: 56px;
  }
}
</style>
<template>
  <div class="checkin-page-view">
    <div class="learn-page">
      <!-- 顶部返回导航 -->
      <nav class="page-top-nav">
        <button class="nav-back-btn" type="button" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>返回学习台</span>
        </button>

        <span class="nav-title-pill">每日习惯 · 签到中心</span>
      </nav>

      <!-- 嵌入式签到面板 -->
      <div class="checkin-container-wrap">
        <CheckIn :embedded="true" @checked-in="onCheckedIn" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import CheckIn from '@/components/CheckIn.vue';

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
};

const onCheckedIn = () => {
  // 可以在签到成功后触发一些全局事件或日志
};
</script>

<style scoped>
.checkin-page-view {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(240, 164, 58, 0.16), transparent 32rem),
    linear-gradient(180deg, #fbf8ef 0%, var(--learn-bg, #f7f4ea) 100%);
  padding-bottom: 40px;
}

.page-top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 4px;
}

.nav-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--learn-surface-strong, #ffffff);
  border: 1px solid rgba(36, 49, 47, 0.12);
  color: var(--learn-ink, #24312f);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(50, 59, 52, 0.05);
  transition: all 0.2s ease;
}

.nav-back-btn svg {
  width: 16px;
  height: 16px;
}

.nav-back-btn:hover {
  background: var(--learn-surface, #fffdf7);
  transform: translateX(-2px);
  border-color: rgba(31, 138, 112, 0.3);
  color: var(--learn-primary-dark, #11614f);
}

.nav-title-pill {
  font-size: 13px;
  font-weight: 700;
  color: var(--learn-primary-dark, #11614f);
  background: rgba(31, 138, 112, 0.08);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(31, 138, 112, 0.15);
}

.checkin-container-wrap {
  display: flex;
  justify-content: center;
  margin: 0 auto;
}
</style>

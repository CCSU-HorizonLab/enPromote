<template>
  <!-- 弹窗模式或内嵌模式 -->
  <Teleport to="body" :disabled="embedded">
    <Transition name="checkin-fade">
      <div 
        v-if="isOpen || embedded" 
        :class="['checkin-wrapper', { 'is-modal': !embedded, 'is-embedded': embedded }]"
        @click="handleOverlayClick"
      >
        <div class="checkin-backdrop" v-if="!embedded"></div>

        <div class="checkin-card" @click.stop>
          <!-- 装饰性光晕背景 -->
          <div class="card-glow-bg"></div>

          <!-- 顶部状态栏 -->
          <div class="checkin-header">
            <div class="header-left">
              <span class="status-kicker">
                <svg class="fire-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C9.5 5 7 8 7 11.5C7 14.5 9.2 17 12 17C14.8 17 17 14.5 17 11.5C17 7 13.5 4 12 2Z" fill="currentColor"/>
                  <path d="M12 10C10.9 11.5 10 13 10 14.2C10 15.3 10.9 16.2 12 16.2C13.1 16.2 14 15.3 14 14.2C14 12.5 12.8 11 12 10Z" fill="#FFF"/>
                </svg>
                习惯养成 · 每日打卡
              </span>
              <h2 class="checkin-title">每日学习签到</h2>
            </div>

            <!-- 关闭按钮 (弹窗模式显示) -->
            <button 
              v-if="!embedded" 
              class="close-btn" 
              type="button" 
              title="关闭" 
              @click="handleClose"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- 核心统计展示区 (Streak Hero) -->
          <div class="streak-hero">
            <div class="streak-metric-main">
              <div class="metric-number-wrapper">
                <span class="streak-fire">🔥</span>
                <span class="streak-number">{{ checkInStatus.continuousCheckInDays || 0 }}</span>
                <span class="streak-unit">天</span>
              </div>
              <p class="streak-caption">连续签到天数</p>
            </div>

            <div class="streak-divider"></div>

            <div class="streak-metric-sub">
              <span class="metric-sub-num">{{ checkInStatus.totalCheckInDays || 0 }}</span>
              <span class="metric-sub-label">累计签到 (天)</span>
            </div>
          </div>

          <!-- 里程碑奖励进度条 -->
          <div class="milestone-track-container">
            <div class="milestone-header">
              <span class="milestone-title">连续签到里程碑</span>
              <span class="milestone-hint">坚持打卡领额外积分</span>
            </div>
            
            <div class="milestone-bar-wrap">
              <div class="milestone-bar-bg">
                <div class="milestone-bar-fill" :style="{ width: milestoneProgressPercent + '%' }"></div>
              </div>
              
              <div class="milestone-nodes">
                <div 
                  class="milestone-node" 
                  :class="{ 'is-achieved': (checkInStatus.continuousCheckInDays || 0) >= 3 }"
                >
                  <div class="node-dot">
                    <span v-if="(checkInStatus.continuousCheckInDays || 0) >= 3">✓</span>
                    <span v-else>3</span>
                  </div>
                  <span class="node-label">3天·+10分</span>
                </div>

                <div 
                  class="milestone-node" 
                  :class="{ 'is-achieved': (checkInStatus.continuousCheckInDays || 0) >= 7 }"
                >
                  <div class="node-dot">
                    <span v-if="(checkInStatus.continuousCheckInDays || 0) >= 7">✓</span>
                    <span v-else>7</span>
                  </div>
                  <span class="node-label">7天·+20分</span>
                </div>

                <div 
                  class="milestone-node" 
                  :class="{ 'is-achieved': (checkInStatus.continuousCheckInDays || 0) >= 14 }"
                >
                  <div class="node-dot">
                    <span v-if="(checkInStatus.continuousCheckInDays || 0) >= 14">✓</span>
                    <span v-else>14</span>
                  </div>
                  <span class="node-label">14天·达人</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 核心打卡操作按钮 -->
          <div class="checkin-action-area">
            <button 
              class="action-btn"
              :class="{ 
                'is-checked': checkInStatus.hasCheckedInToday,
                'is-loading': isLoading 
              }"
              :disabled="checkInStatus.hasCheckedInToday || isLoading"
              @click="handleCheckIn"
            >
              <!-- 加载中 -->
              <span v-if="isLoading" class="btn-spinner"></span>

              <!-- 未签到状态 -->
              <template v-else-if="!checkInStatus.hasCheckedInToday">
                <span class="btn-icon">⚡</span>
                <span class="btn-text">立即签到</span>
                <span class="btn-badge">+10 积分</span>
              </template>

              <!-- 已签到状态 -->
              <template v-else>
                <span class="btn-icon-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <span class="btn-text">今日已签到</span>
                <span class="btn-hint-text">明日可继续打卡</span>
              </template>
            </button>
          </div>

          <!-- 签到成功即时反馈条 (内嵌动画展示) -->
          <Transition name="bounce">
            <div class="reward-banner" v-if="rewardData">
              <div class="reward-badge">🎉 签到成功</div>
              <div class="reward-nums">
                获得 <strong>+{{ rewardData.total || 10 }}</strong> 积分
                <span v-if="rewardData.bonus" class="bonus-tag">含连续加成 +{{ rewardData.bonus }}</span>
              </div>
            </div>
          </Transition>

          <!-- 当月日历视窗 -->
          <div class="calendar-section">
            <div class="calendar-top">
              <span class="calendar-month-text">
                {{ checkInStatus.currentYear }} 年 {{ checkInStatus.currentMonth }} 月
              </span>
              <span class="calendar-meta">
                本月打卡 <strong>{{ checkedDaysCount }}</strong> 天
              </span>
            </div>

            <!-- 星期表头 -->
            <div class="week-header-grid">
              <span v-for="w in weekDaysHeader" :key="w" class="week-name">{{ w }}</span>
            </div>

            <!-- 日期网格 -->
            <div class="calendar-days-grid">
              <!-- 前置空白格 (根据当月1日星期对齐) -->
              <div 
                v-for="blank in leadingEmptyDays" 
                :key="'blank-' + blank" 
                class="day-cell is-empty"
              ></div>

              <!-- 真实日期格 -->
              <div 
                v-for="item in checkInStatus.monthCheckInDays" 
                :key="'day-' + item.date"
                class="day-cell"
                :class="{ 
                  'is-checked': item.checkedIn, 
                  'is-today': item.date === currentTodayDate 
                }"
              >
                <div class="day-number">{{ item.date }}</div>
                <div v-if="item.checkedIn" class="check-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部积分规则简要说明 -->
          <div class="reward-rules-strip">
            <div class="rule-chip">
              <span class="rule-icon">🪙</span>
              <span>每日签到 <strong>+10</strong></span>
            </div>
            <div class="rule-chip">
              <span class="rule-icon">🎯</span>
              <span>连签3天 <strong>额外+10</strong></span>
            </div>
            <div class="rule-chip">
              <span class="rule-icon">🏆</span>
              <span>连签7天 <strong>额外+20</strong></span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { dailyCheckIn, getCheckInStatus } from '@/api/checkin';
import { toast } from '@/utils/toastService';

const props = defineProps({
  // 是否可见 (弹窗模式)
  visible: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: Boolean,
    default: false
  },
  // 是否内嵌显示 (非弹窗模式)
  embedded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible', 'update:modelValue', 'close', 'checked-in']);

// 响应式状态
const isLoading = ref(false);
const rewardData = ref(null);

const checkInStatus = ref({
  continuousCheckInDays: 0,
  totalCheckInDays: 0,
  hasCheckedInToday: false,
  monthCheckInDays: [],
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear()
});

// 计算是否打开
const isOpen = computed(() => props.visible || props.modelValue);

// 当月当天几号
const currentTodayDate = computed(() => new Date().getDate());

// 星期表头
const weekDaysHeader = ['一', '二', '三', '四', '五', '六', '日'];

// 计算本月1号的星期偏移 (以周一为第一天)
const leadingEmptyDays = computed(() => {
  const year = checkInStatus.value.currentYear || new Date().getFullYear();
  const month = (checkInStatus.value.currentMonth || new Date().getMonth() + 1) - 1;
  const firstDay = new Date(year, month, 1).getDay(); // 0(周日) - 6(周六)
  // 转换为周一为0: 周日->6, 周一->0, 周二->1 ...
  return (firstDay + 6) % 7;
});

// 本月已签到天数
const checkedDaysCount = computed(() => {
  if (!checkInStatus.value.monthCheckInDays) return 0;
  return checkInStatus.value.monthCheckInDays.filter(d => d.checkedIn).length;
});

// 里程碑进度百分比 (最高 14 天)
const milestoneProgressPercent = computed(() => {
  const days = checkInStatus.value.continuousCheckInDays || 0;
  if (days <= 0) return 0;
  if (days >= 14) return 100;
  return Math.min(100, Math.round((days / 14) * 100));
});

// 获取签到状态
const fetchCheckInStatus = async () => {
  try {
    const res = await getCheckInStatus();
    if (res.data && res.data.code === 200) {
      checkInStatus.value = res.data.data;
    }
  } catch (error) {
    console.error('获取签到状态失败:', error);
  }
};

// 执行签到
const handleCheckIn = async () => {
  if (checkInStatus.value.hasCheckedInToday || isLoading.value) {
    return;
  }

  isLoading.value = true;
  try {
    const res = await dailyCheckIn();
    if (res.data && res.data.code === 200) {
      const data = res.data.data;
      checkInStatus.value = {
        ...checkInStatus.value,
        ...data
      };

      // 保存奖励信息用于提示
      rewardData.value = data.reward || { coins: 10, bonus: 0, total: 10 };

      // 同步更新日历中当天的签到标记
      const today = currentTodayDate.value;
      if (Array.isArray(checkInStatus.value.monthCheckInDays)) {
        const todayItem = checkInStatus.value.monthCheckInDays.find(d => d.date === today);
        if (todayItem) todayItem.checkedIn = true;
      }

      toast.success(`签到成功！积分 +${rewardData.value.total || 10}`);
      emit('checked-in', data);
    } else {
      toast.error(res.data?.message || '签到失败，请稍后再试');
    }
  } catch (error) {
    console.error('签到失败:', error);
    toast.error('签到异常，请稍后再试');
  } finally {
    isLoading.value = false;
  }
};

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false);
  emit('update:modelValue', false);
  emit('close');
};

// 点击遮罩
const handleOverlayClick = () => {
  if (!props.embedded) {
    handleClose();
  }
};

// 键盘 ESC 监听
const handleKeyDown = (e) => {
  if (e.key === 'Escape' && isOpen.value && !props.embedded) {
    handleClose();
  }
};

// 监听打开状态
watch(isOpen, (newVal) => {
  if (newVal) {
    rewardData.value = null;
    fetchCheckInStatus();
  }
});

onMounted(() => {
  fetchCheckInStatus();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

defineExpose({
  fetchCheckInStatus,
  checkInStatus
});
</script>

<style scoped>
/* 容器及遮罩 */
.checkin-wrapper.is-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.checkin-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(36, 49, 47, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: opacity 0.28s ease;
}

.checkin-wrapper.is-embedded {
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
}

/* 核心卡片主容器 */
.checkin-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 480px;
  max-height: 92vh;
  overflow-y: auto;
  border-radius: var(--learn-radius-lg, 24px);
  background: var(--learn-surface, #fffdf7);
  border: 1px solid rgba(31, 138, 112, 0.16);
  box-shadow: 0 24px 60px rgba(36, 49, 47, 0.22);
  padding: 24px;
  color: var(--learn-ink, #24312f);
  box-sizing: border-box;
}

/* 顶部背景微晕 */
.card-glow-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 140px;
  background: radial-gradient(circle at 50% 0%, rgba(240, 164, 58, 0.16), transparent 70%);
  pointer-events: none;
  border-radius: var(--learn-radius-lg, 24px) var(--learn-radius-lg, 24px) 0 0;
}

/* 头部 */
.checkin-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(31, 138, 112, 0.08);
  border: 1px solid rgba(31, 138, 112, 0.18);
  color: var(--learn-primary-dark, #11614f);
  font-size: 12px;
  font-weight: 700;
  width: fit-content;
}

.fire-icon {
  width: 14px;
  height: 14px;
  color: var(--learn-accent, #f0a43a);
}

.checkin-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--learn-ink, #24312f);
  letter-spacing: -0.02em;
}

.close-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(36, 49, 47, 0.06);
  border: none;
  color: var(--learn-muted, #69736f);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.close-btn:hover {
  background: rgba(36, 49, 47, 0.12);
  color: var(--learn-ink, #24312f);
  transform: rotate(90deg);
}

/* 核心统计区域 */
.streak-hero {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(36, 49, 47, 0.08);
  border-radius: var(--learn-radius-md, 16px);
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(50, 59, 52, 0.04);
}

.streak-metric-main {
  text-align: center;
}

.metric-number-wrapper {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.streak-fire {
  font-size: 26px;
  line-height: 1;
}

.streak-number {
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
  color: var(--learn-primary-dark, #11614f);
  font-family: system-ui, -apple-system, sans-serif;
}

.streak-unit {
  font-size: 14px;
  font-weight: 700;
  color: var(--learn-muted, #69736f);
}

.streak-caption {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--learn-muted, #69736f);
  font-weight: 600;
}

.streak-divider {
  width: 1px;
  height: 42px;
  background: rgba(36, 49, 47, 0.1);
}

.streak-metric-sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.metric-sub-num {
  font-size: 24px;
  font-weight: 800;
  color: var(--learn-ink, #24312f);
  line-height: 1;
}

.metric-sub-label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--learn-muted, #69736f);
  font-weight: 600;
}

/* 里程碑进度条 */
.milestone-track-container {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(36, 49, 47, 0.06);
  border-radius: var(--learn-radius-md, 16px);
  padding: 14px 16px;
  margin-bottom: 20px;
}

.milestone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.milestone-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--learn-ink, #24312f);
}

.milestone-hint {
  font-size: 12px;
  color: var(--learn-accent, #f0a43a);
  font-weight: 600;
}

.milestone-bar-wrap {
  position: relative;
  padding: 10px 10px 4px;
}

.milestone-bar-bg {
  position: absolute;
  top: 19px;
  left: 20px;
  right: 20px;
  height: 6px;
  background: rgba(36, 49, 47, 0.08);
  border-radius: 999px;
}

.milestone-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--learn-primary, #1f8a70), var(--learn-accent, #f0a43a));
  border-radius: 999px;
  transition: width 0.4s ease;
}

.milestone-nodes {
  position: relative;
  display: flex;
  justify-content: space-between;
}

.milestone-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.node-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--learn-surface, #fffdf7);
  border: 2px solid rgba(36, 49, 47, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: var(--learn-muted, #69736f);
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  transition: all 0.25s ease;
}

.milestone-node.is-achieved .node-dot {
  background: var(--learn-primary, #1f8a70);
  border-color: var(--learn-primary, #1f8a70);
  color: #fff;
  box-shadow: 0 4px 10px rgba(31, 138, 112, 0.35);
}

.node-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--learn-muted, #69736f);
}

.milestone-node.is-achieved .node-label {
  color: var(--learn-primary-dark, #11614f);
  font-weight: 700;
}

/* 打卡操作按钮 */
.checkin-action-area {
  margin-bottom: 16px;
}

.action-btn {
  width: 100%;
  height: 52px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--learn-primary, #1f8a70) 0%, var(--learn-primary-dark, #11614f) 100%);
  color: #ffffff;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(31, 138, 112, 0.3);
  transition: all 0.22s ease;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(31, 138, 112, 0.36);
  filter: brightness(1.04);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.action-btn.is-checked {
  background: var(--learn-green-soft, #dff3e8);
  color: var(--learn-primary-dark, #11614f);
  border: 1px solid rgba(31, 138, 112, 0.25);
  box-shadow: none;
  cursor: default;
}

.btn-icon {
  font-size: 18px;
}

.btn-badge {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
}

.btn-icon-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--learn-primary, #1f8a70);
}

.btn-hint-text {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.8;
}

/* 按钮 Loading */
.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 签到成功奖励条 */
.reward-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--learn-amber-soft, #fff1cf);
  border: 1px solid rgba(240, 164, 58, 0.3);
  border-radius: var(--learn-radius-md, 16px);
  color: var(--learn-ink, #24312f);
}

.reward-badge {
  font-size: 13px;
  font-weight: 800;
  color: #a45a00;
}

.reward-nums {
  font-size: 13px;
  font-weight: 600;
}

.bonus-tag {
  margin-left: 6px;
  font-size: 11px;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--learn-coral, #e9685b);
}

/* 日历区域 */
.calendar-section {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(36, 49, 47, 0.08);
  border-radius: var(--learn-radius-md, 16px);
  padding: 16px;
  margin-bottom: 16px;
}

.calendar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.calendar-month-text {
  font-size: 14px;
  font-weight: 800;
  color: var(--learn-ink, #24312f);
}

.calendar-meta {
  font-size: 12px;
  color: var(--learn-muted, #69736f);
}

.calendar-meta strong {
  color: var(--learn-primary-dark, #11614f);
}

.week-header-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8px;
}

.week-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--learn-muted, #69736f);
  padding: 4px 0;
}

.calendar-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--learn-ink, #24312f);
  background: transparent;
  transition: all 0.18s ease;
}

.day-cell.is-empty {
  pointer-events: none;
}

.day-cell.is-today {
  border: 1.5px solid var(--learn-primary, #1f8a70);
  background: rgba(31, 138, 112, 0.06);
}

.day-cell.is-checked {
  background: var(--learn-primary, #1f8a70);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(31, 138, 112, 0.25);
}

.day-number {
  line-height: 1;
}

.check-mark {
  position: absolute;
  bottom: 3px;
  width: 8px;
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-mark svg {
  width: 8px;
  height: 8px;
  stroke: #ffffff;
}

/* 底部规则横条 */
.reward-rules-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 4px;
}

.rule-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border-radius: var(--learn-radius-sm, 10px);
  background: rgba(36, 49, 47, 0.04);
  font-size: 11px;
  color: var(--learn-muted, #69736f);
}

.rule-chip strong {
  color: var(--learn-primary-dark, #11614f);
}

.rule-icon {
  font-size: 12px;
}

/* 动画效果 */
.checkin-fade-enter-active,
.checkin-fade-leave-active {
  transition: all 0.28s ease;
}

.checkin-fade-enter-from,
.checkin-fade-leave-to {
  opacity: 0;
}

.checkin-fade-enter-from .checkin-card {
  transform: scale(0.92) translateY(12px);
}

.checkin-fade-leave-to .checkin-card {
  transform: scale(0.95);
}

.checkin-card {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.bounce-enter-active {
  animation: bounce-in 0.35s ease;
}
.bounce-leave-active {
  animation: bounce-in 0.25s reverse;
}

@keyframes bounce-in {
  0% { transform: scale(0.85); opacity: 0; }
  60% { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); }
}

@media (max-width: 480px) {
  .checkin-card {
    padding: 18px 16px;
  }
  .streak-number {
    font-size: 32px;
  }
}
</style>

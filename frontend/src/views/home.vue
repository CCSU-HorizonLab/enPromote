<template>
  <main class="learn-page home-page">
    <!-- 顶部 HERO 区域 + 今日任务 -->
    <section class="top-hero-section">
      <!-- 左侧大 Banner 欢迎区 -->
      <div class="hero-card learn-card">
        <div class="hero-text-content">
          <div class="hero-text-top">
            <div class="learn-kicker">
              <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v18M12 3C8.5 3 5 6.5 5 11c0 4.5 3.5 7.5 7 10M12 3c3.5 0 7 3.5 7 8 0 4.5-3.5 7.5-7 10" />
              </svg>
              <span>每一次坚持，都是进步</span>
            </div>

            <h1 class="hero-title">
              {{ storeUsername ? `${storeUsername}，今天从这里开始学习吧！` : '今天从这里开始学习吧！' }}
            </h1>

            <p class="hero-subtitle">
              坚持每日学习，积累点滴进步，你正在成为更好的自己。
            </p>
          </div>

          <button class="learn-button hero-btn" type="button" @click="startTodayStudy">
            <span>开始今日任务</span>
            <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <!-- 右侧 SVG 插画占位区域 (用户可替换) -->
        <div class="hero-illustration-slot">
          <!-- 背景装饰弱软光晕，充实右侧区域 -->
          <div class="hero-svg-bg-glow"></div>
          <svg viewBox="90 40 440 440" xmlns="http://www.w3.org/2000/svg" class="hero-svg-illustration">
            <!-- 云朵装饰 (保留) -->
            <g fill="#FFFFFF" opacity="0.9">
              <circle cx="220" cy="120" r="18" />
              <circle cx="245" cy="110" r="22" />
              <circle cx="270" cy="120" r="16" />
              <rect x="220" y="110" width="50" height="28" rx="14" />

              <circle cx="380" cy="90" r="12" />
              <circle cx="400" cy="80" r="18" />
              <circle cx="420" cy="90" r="14" />
              <rect x="380" y="80" width="40" height="24" rx="12" />
            </g>

            <!-- ================= 主体：剪贴板（本子） ================= -->
            <g transform="translate(130, 130) rotate(-3)">
              <!-- 剪贴板深绿色底板 -->
              <rect x="0" y="0" width="280" height="360" rx="16" fill="#69A88F" />

              <!-- 米白色纸张 -->
              <rect x="20" y="20" width="240" height="320" rx="8" fill="#FFFDF8" />
              <!-- 纸张底部微微的阴影感 -->
              <path d="M 20 330 L 260 330 L 260 340 A 8 8 0 0 1 252 348 L 28 348 A 8 8 0 0 1 20 340 Z" fill="#F0ECE1" />

              <!-- 顶部装订孔/夹子细节 -->
              <rect x="70" y="25" width="20" height="25" rx="8" fill="#F4E9D8" />
              <rect x="190" y="25" width="20" height="25" rx="8" fill="#F4E9D8" />

              <!-- Today 标题区域 -->
              <g transform="translate(60, 100)">
                <circle cx="0" cy="-5" r="15" fill="#DCEADD" />
                <path d="M -6 -5 L -2 -1 L 6 -9" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round"
                  stroke-linejoin="round" />
                <text x="25" y="2" fill="#69A88F" font-family="Arial, sans-serif" font-weight="bold"
                  font-size="26">Today</text>
              </g>

              <!-- 纸张上的横线 -->
              <line x1="50" y1="160" x2="230" y2="160" stroke="#F5F0E5" stroke-width="2" stroke-linecap="round" />
              <line x1="50" y1="210" x2="230" y2="210" stroke="#F5F0E5" stroke-width="2" stroke-linecap="round" />
              <line x1="50" y1="260" x2="230" y2="260" stroke="#F5F0E5" stroke-width="2" stroke-linecap="round" />

              <!-- 居中的大打勾图案 -->
              <g transform="translate(140, 210)">
                <circle cx="0" cy="0" r="45" fill="#F4EFE3" />
                <path d="M -18 2 L -4 16 L 20 -12" stroke="#69A88F" stroke-width="10" fill="none" stroke-linecap="round"
                  stroke-linejoin="round" />
              </g>
            </g>

            <!-- ================= 主体：铅笔 ================= -->
            <g transform="translate(420, 250) rotate(12)">
              <rect x="0" y="0" width="30" height="25" rx="4" fill="#3D4B42" />
              <rect x="-1" y="20" width="32" height="6" fill="#F2E6D0" />
              <rect x="0" y="26" width="30" height="180" fill="#7EBA9E" />
              <line x1="10" y1="26" x2="10" y2="206" stroke="#8DC3A9" stroke-width="2" />
              <line x1="20" y1="26" x2="20" y2="206" stroke="#6C9E87" stroke-width="2" />
              <polygon points="0,206 30,206 15,246" fill="#F4E3C5" />
              <polygon points="10.5,234 19.5,234 15,246" fill="#3A3A3A" />
            </g>
          </svg>
        </div>
      </div>

      <!-- 右侧今日任务卡片 -->
      <div class="today-tasks-card learn-card">
        <div class="tasks-card-header">
          <h2 class="tasks-title">今日任务</h2>
          <div class="streak-pill">
            <span>{{ checkInData?.continuousCheckInDays || 0 }} 天连续</span>
          </div>
        </div>

        <div class="tasks-highlight-guide">
          {{ personalizedGuide }}
        </div>

        <div class="tasks-progress-block">
          <div class="progress-info">
            <span class="progress-label">任务完成度</span>
            <span class="progress-count">{{ completedMissionCount }}/{{ missions.length }}</span>
          </div>
          <div class="learn-progress">
            <span :style="{ width: missionProgress + '%' }"></span>
          </div>
        </div>

        <div class="task-items-list">
          <div v-for="mission in missions" :key="mission.key" class="task-item-row" :class="{ 'is-done': mission.done }"
            @click="mission.action">
            <div class="task-icon-circle" :class="{ 'icon-done': mission.done }">
              <svg v-if="mission.done" class="check-done-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="3">
                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span v-else>{{ mission.icon }}</span>
            </div>

            <div class="task-text-meta">
              <div class="task-item-title">{{ mission.title }}</div>
              <div class="task-item-desc">{{ mission.desc }}</div>
            </div>

            <button class="task-action-btn" :class="{ 'btn-done': mission.done }" type="button">
              {{ mission.done ? '已完成' : '去完成' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 中间区域：推荐学习路径 -->
    <section class="learning-path-section">
      <h2 class="section-heading">推荐学习路径</h2>

      <div class="path-cards-container">
        <!-- 步骤 1 -->
        <div class="path-step-card step-green" @click="goToWordReview">
          <div class="step-badge">1</div>
          <h3 class="path-card-title">单词复习</h3>
          <p class="path-card-desc">复习今日推荐的单词，巩固记忆</p>
          <div class="path-card-footer">
            <div class="path-svg-placeholder">
              <svg viewBox="0 0 48 48" fill="none" class="mini-card-svg">
                <rect x="8" y="10" width="32" height="28" rx="6" fill="#B3E6D5" />
                <path d="M16 20h16M16 28h10" stroke="#1F8A70" stroke-width="3" stroke-linecap="round" />
              </svg>
            </div>
            <button class="learn-button secondary path-action-btn" type="button">去复习</button>
          </div>
        </div>

        <div class="path-connector-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(36,49,47,0.2)" stroke-width="2.5">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <!-- 步骤 2 -->
        <div class="path-step-card step-blue" @click="goToChapters">
          <div class="step-badge">2</div>
          <h3 class="path-card-title">闯关学习</h3>
          <p class="path-card-desc">通过场景任务，掌握单词用法</p>
          <div class="path-card-footer">
            <div class="path-svg-placeholder">
              <svg viewBox="0 0 48 48" fill="none" class="mini-card-svg">
                <rect x="10" y="14" width="28" height="24" rx="4" fill="#C5DCF5" />
                <path d="M24 8l12 6v14l-12-6z" fill="#4277B8" />
              </svg>
            </div>
            <button class="learn-button secondary path-action-btn" type="button">去闯关</button>
          </div>
        </div>

        <div class="path-connector-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(36,49,47,0.2)" stroke-width="2.5">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <!-- 步骤 3 -->
        <div class="path-step-card step-yellow" @click="goToFreeChat">
          <div class="step-badge">3</div>
          <h3 class="path-card-title">AI 口语练习</h3>
          <p class="path-card-desc">开口说英语，提升表达能力</p>
          <div class="path-card-footer">
            <div class="path-svg-placeholder">
              <svg viewBox="0 0 48 48" fill="none" class="mini-card-svg">
                <circle cx="24" cy="24" r="16" fill="#FCE1A6" />
                <path d="M18 24h12M24 18v12" stroke="#F0A43A" stroke-width="3" stroke-linecap="round" />
              </svg>
            </div>
            <button class="learn-button secondary path-action-btn" type="button">去练习</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 下方 4 列概览指标卡片 -->
    <section class="overview-grid-section">
      <!-- 卡片 1: 待复习单词 -->
      <div class="overview-card learn-card">
        <span class="card-label">待复习单词</span>
        <div class="card-metric-num">{{ reviewData?.pendingReviewCount ?? 20 }}</div>
        <p class="card-sub-info">
          {{ reviewData?.pendingReviewCount ? '建议先复习再进入新关卡。' : '当前待复习单词不多，保持节奏。' }}
        </p>
        <button class="learn-button secondary card-btn-action" type="button" @click="goToWordReview">
          打开单词复习
        </button>

        <!-- 背景装饰 SVG 水印 -->
        <div class="card-bg-watermark">
          <svg viewBox="0 0 80 60" fill="none" opacity="0.12">
            <rect x="10" y="30" width="12" height="30" rx="3" fill="#1F8A70" />
            <rect x="30" y="20" width="12" height="40" rx="3" fill="#1F8A70" />
            <rect x="50" y="10" width="12" height="50" rx="3" fill="#1F8A70" />
          </svg>
        </div>
      </div>

      <!-- 卡片 2: 学习记录 (7天柱状图) -->
      <div class="overview-card learn-card">
        <span class="card-label">学习记录</span>
        <div class="card-metric-num">{{ checkInData?.continuousCheckInDays || 7 }} 天</div>
        <p class="card-sub-info">本周学习天数</p>

        <div class="week-chart-bars">
          <div v-for="(day, idx) in weekDays" :key="idx" class="chart-bar-item">
            <div class="bar-pill-track">
              <div class="bar-pill-fill" :class="{ 'is-active': idx === currentDayOfWeekIndex }"
                :style="{ height: day.height + '%' }"></div>
            </div>
            <span class="bar-day-name">{{ day.name }}</span>
          </div>
        </div>
      </div>

      <!-- 卡片 3: 签到状态 -->
      <div class="overview-card learn-card">
        <span class="card-label">签到状态</span>
        <div class="card-metric-num text-large">
          {{ checkInData?.hasCheckedInToday ? '已签到' : '待签到' }}
        </div>
        <p class="card-sub-info">连续记录会让每日任务更有反馈感。</p>
        <button class="learn-button secondary card-btn-action" type="button" @click="goToCheckIn">
          {{ checkInData?.hasCheckedInToday ? '查看签到' : '立即签到' }}
        </button>

        <!-- 背景装饰 SVG 打勾水印 -->
        <div class="card-bg-watermark">
          <svg viewBox="0 0 60 60" fill="none" opacity="0.12">
            <circle cx="30" cy="30" r="25" fill="#1F8A70" />
            <path d="M20 30L27 37L40 22" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </div>
      </div>

      <!-- 卡片 4: 今日口语目标 -->
      <div class="overview-card learn-card">
        <span class="card-label">今日口语目标</span>
        <p class="speaking-goal-text">
          用 3 句话介绍一次入住酒店或点餐经历，尽量用上今天复习过的单词。
        </p>
        <button class="learn-button card-btn-action" type="button" @click="goToFreeChat">
          开始练习 5 分钟
        </button>

        <!-- 背景装饰 SVG 耳机 -->
        <div class="card-bg-watermark">
          <svg viewBox="0 0 60 60" fill="none" opacity="0.12">
            <path d="M15 35V28C15 19.7157 21.7157 13 30 13C38.2843 13 45 19.7157 45 28V35" stroke="#1F8A70"
              stroke-width="4" />
            <rect x="10" y="32" width="10" height="16" rx="4" fill="#1F8A70" />
            <rect x="40" y="32" width="10" height="16" rx="4" fill="#1F8A70" />
          </svg>
        </div>
      </div>
    </section>

    <!-- 底部小贴士横条 -->
    <div class="tips-banner">
      <div class="tips-left-content">
        <span class="tips-icon">💡</span>
        <span class="tips-title">小贴士</span>
        <span class="tips-text">每天坚持完成今日任务，学习效果更佳哦！</span>
      </div>
      <svg class="tips-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getUserInfo, username as storeUsername } from '@/stores/userStore'
import { getCheckInStatus } from '@/api/checkin'
import { getReviewWords } from '@/api/word'
import { getDailyStudyReport } from '@/api/report'
import { useRouter } from 'vue-router'

const router = useRouter()
const checkInData = ref(null)
const reviewData = ref(null)

const hasReviewedToday = computed(() => (reviewData.value?.todayReviewedCount || 0) > 0)

// 7天柱状图显示数据与当前天高亮
const weekDays = [
  { name: '一', height: 40 },
  { name: '二', height: 65 },
  { name: '三', height: 45 },
  { name: '四', height: 80 },
  { name: '五', height: 35 },
  { name: '六', height: 90 },
  { name: '日', height: 50 }
]
const currentDayOfWeekIndex = computed(() => {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
})

const missions = computed(() => [
  {
    key: 'checkin',
    icon: '✓',
    title: '完成签到',
    desc: '完成签到学习状态',
    done: Boolean(checkInData.value?.hasCheckedInToday),
    action: goToCheckIn
  },
  {
    key: 'review',
    icon: 'Aa',
    title: '单词复习',
    desc: hasReviewedToday.value
      ? `今天已复习 ${reviewData.value?.todayReviewedCount || 0} 个单词`
      : `${reviewData.value?.pendingReviewCount ?? 20} 个单词等待巩固`,
    done: hasReviewedToday.value || (reviewData.value?.pendingReviewCount ?? 0) === 0,
    action: goToWordReview
  },
  {
    key: 'chapter',
    icon: '➔',
    title: '推进一关',
    desc: '完成一个场景任务，把单词放进语境',
    done: false,
    action: goToChapters
  },
  {
    key: 'chat',
    icon: 'AI',
    title: 'AI 口语热身',
    desc: '用 5 分钟和今天的表达说出来',
    done: false,
    action: goToFreeChat
  }
])

const completedMissionCount = computed(() => missions.value.filter((item) => item.done).length)
const missionProgress = computed(() => Math.round((completedMissionCount.value / missions.value.length) * 100))

const personalizedGuide = computed(() => {
  if (!hasReviewedToday.value && (reviewData.value?.pendingReviewCount ?? 20) > 0) {
    return `先复习 ${Math.min(reviewData.value?.pendingReviewCount || 20, 20)} 个单词，再推进一关`
  }
  if (!checkInData.value?.hasCheckedInToday) {
    return '先签到，再完成一轮闯关和 AI 口语'
  }
  return '今天适合直接推进一关，再用 AI 做口语巩固'
})

onMounted(async () => {
  try {
    const userInfo = await getUserInfo()
    if (userInfo) {
      await Promise.all([fetchCheckInStatus(), fetchReviewData()])
    }
  } catch (error) {
    console.log('首页用户状态获取失败:', error)
  }
})

function startTodayStudy() {
  // 1. 如果未签到，优先引导完成签到
  if (!checkInData.value?.hasCheckedInToday) {
    goToCheckIn()
    return
  }
  // 2. 如果今天尚有待复习单词且未复习，引导去复习
  if (!hasReviewedToday.value && (reviewData.value?.pendingReviewCount || 0) > 0) {
    goToWordReview()
    return
  }
  // 3. 否则引导进入场景闯关主线
  goToChapters()
}

function goToChapters() {
  router.push('/chapters')
}

function goToFreeChat() {
  router.push('/aiChatExer')
}

function goToCheckIn() {
  router.push('/checkin')
}

function goToWordReview() {
  router.push('/flashCardReview')
}

const fetchCheckInStatus = async () => {
  try {
    const res = await getCheckInStatus()
    if (res.data?.code === 200) checkInData.value = res.data.data
  } catch (error) {
    console.error('获取签到状态失败:', error)
  }
}

const fetchReviewData = async () => {
  try {
    const [reviewRes, reportRes] = await Promise.all([
      getReviewWords(),
      getDailyStudyReport()
    ])
    if (reviewRes.data?.code === 200) {
      reviewData.value = {
        pendingReviewCount: reviewRes.data.data.count || 0,
        todayReviewedCount: reportRes.data?.code === 200
          ? reportRes.data.data?.wordsLearned?.reviewWords || 0
          : 0
      }
    }
  } catch (error) {
    console.error('获取复习数据失败:', error)
  }
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ================= 1. 顶部 HERO 区域 ================= */
.top-hero-section {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 20px;
  align-items: stretch;
}

/* 左侧 HERO BANNER 卡片：继承 AdventureStory 的优雅淡雅渐变 */
.hero-card {
  position: relative;
  background: linear-gradient(135deg, rgba(31, 138, 112, 0.12), rgba(240, 164, 58, 0.16)), var(--learn-surface);
  padding: 40px 44px;
  display: flex;
  justify-content: space-between;
  align-items: stretch; /* 占满垂直全高，解决上下留白问题 */
  gap: 32px;
  overflow: hidden;
}

.hero-text-content {
  flex: 1;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 顶、中、底分布，彻底填满垂直高度 */
  z-index: 2;
}

.hero-text-top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.hero-title {
  font-size: clamp(32px, 4.2vw, 42px);
  font-weight: 800;
  line-height: 1.2;
  color: var(--learn-ink);
  margin: 16px 0 12px;
  letter-spacing: -0.3px;
}

.hero-subtitle {
  font-size: 15px;
  line-height: 1.6;
  color: var(--learn-muted);
  margin: 0;
}

.hero-btn {
  align-self: flex-start;
  margin-top: 24px;
  padding: 0 28px;
  height: 48px;
  font-size: 15px;
}

.btn-arrow {
  width: 16px;
  height: 16px;
}

/* SVG 插画容器 (充实右侧排版，填满垂直空间) */
.hero-illustration-slot {
  position: relative;
  width: 290px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}

.hero-svg-bg-glow {
  position: absolute;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(31, 138, 112, 0.22) 0%, rgba(240, 164, 58, 0.12) 60%, transparent 80%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.hero-svg-illustration {
  position: relative;
  width: 100%;
  height: 100%;
  max-height: 340px;
  z-index: 1;
}

/* 右侧今日任务卡片 */
.today-tasks-card {
  padding: 28px;
  display: flex;
  flex-direction: column;
}

.tasks-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.tasks-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--learn-ink);
  margin: 0;
}

.streak-pill {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--learn-amber-soft);
  color: #8a5a07;
  font-weight: 800;
  font-size: 12px;
}

.tasks-highlight-guide {
  font-size: 20px;
  font-weight: 800;
  color: var(--learn-ink);
  line-height: 1.35;
  margin-bottom: 18px;
}

.tasks-progress-block {
  margin-bottom: 18px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--learn-muted);
  margin-bottom: 6px;
}

.progress-count {
  font-weight: 800;
  color: var(--learn-ink);
}

/* 任务条目列表 */
.task-items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--learn-line);
  transition: all 0.18s ease;
  cursor: pointer;
}

.task-item-row:hover {
  background: #ffffff;
  transform: translateX(2px);
}

.task-item-row.is-done {
  background: var(--learn-green-soft);
  border-color: rgba(31, 138, 112, 0.2);
}

.task-icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--learn-ink);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.task-icon-circle.icon-done {
  background: var(--learn-primary);
}

.check-done-icon {
  width: 16px;
  height: 16px;
  stroke: #ffffff;
}

.task-text-meta {
  flex: 1;
}

.task-item-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--learn-ink);
}

.task-item-desc {
  font-size: 12px;
  color: var(--learn-muted);
  margin-top: 2px;
}

.task-action-btn {
  background: transparent;
  color: var(--learn-primary-dark);
  font-size: 13px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.task-action-btn.btn-done {
  color: var(--learn-muted);
  font-weight: 600;
}

/* ================= 2. 推荐学习路径 ================= */
.learning-path-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-heading {
  font-size: 20px;
  font-weight: 800;
  color: var(--learn-ink);
  margin: 0;
}

.path-cards-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.path-step-card {
  flex: 1;
  border-radius: var(--learn-radius-lg);
  padding: 24px;
  border: 1px solid var(--learn-line);
  box-shadow: var(--learn-shadow-soft);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}

.path-step-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--learn-shadow);
}

.path-step-card.step-green {
  background: var(--learn-green-soft);
}

.path-step-card.step-blue {
  background: var(--learn-blue-soft);
}

.path-step-card.step-yellow {
  background: var(--learn-amber-soft);
}

.step-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.8);
}

.step-green .step-badge {
  color: var(--learn-primary-dark);
}

.step-blue .step-badge {
  color: var(--learn-blue);
}

.step-yellow .step-badge {
  color: #8a5a07;
}

.path-card-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--learn-ink);
  margin: 0 0 6px;
}

.path-card-desc {
  font-size: 13px;
  color: var(--learn-muted);
  margin: 0 0 18px;
}

.path-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: auto;
}

.path-svg-placeholder {
  width: 44px;
  height: 44px;
}

.mini-card-svg {
  width: 100%;
  height: 100%;
}

.path-action-btn {
  font-size: 13px;
  min-height: 38px;
  padding: 0 16px;
}

.path-connector-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ================= 3. 下方 4 列概览指标卡片 ================= */
.overview-grid-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.overview-card {
  position: relative;
  padding: 22px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--learn-muted);
  margin-bottom: 10px;
}

.card-metric-num {
  font-size: 34px;
  font-weight: 800;
  color: var(--learn-ink);
  line-height: 1.1;
  margin-bottom: 6px;
}

.card-metric-num.text-large {
  font-size: 26px;
  margin-top: 4px;
}

.card-sub-info {
  font-size: 13px;
  color: var(--learn-muted);
  line-height: 1.4;
  margin: 0 0 18px;
}

.speaking-goal-text {
  font-size: 13px;
  color: var(--learn-ink);
  line-height: 1.5;
  margin: 0 0 18px;
}

.card-btn-action {
  margin-top: auto;
  min-height: 38px;
  font-size: 13px;
  z-index: 2;
}

.card-bg-watermark {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 80px;
  height: 80px;
  pointer-events: none;
  z-index: 1;
}

/* 7天柱状图 */
.week-chart-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 55px;
  margin-top: auto;
  padding-top: 8px;
}

.chart-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.bar-pill-track {
  width: 10px;
  height: 36px;
  background: rgba(36, 49, 47, 0.08);
  border-radius: 99px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-pill-fill {
  width: 100%;
  background: rgba(36, 49, 47, 0.25);
  border-radius: 99px;
}

.bar-pill-fill.is-active {
  background: var(--learn-primary);
}

.bar-day-name {
  font-size: 11px;
  color: var(--learn-muted);
}

/* ================= 4. 底部小贴士横条 ================= */
.tips-banner {
  background: var(--learn-green-soft);
  border-radius: var(--learn-radius-md);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(31, 138, 112, 0.18);
}

.tips-left-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.tips-icon {
  font-size: 16px;
}

.tips-title {
  font-weight: 800;
  color: var(--learn-primary-dark);
}

.tips-text {
  color: var(--learn-ink);
}

.tips-arrow {
  width: 18px;
  height: 18px;
  color: var(--learn-primary-dark);
}

/* ================= 响应式适配 ================= */
@media (max-width: 1024px) {
  .top-hero-section {
    grid-template-columns: 1fr;
  }

  .overview-grid-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .path-cards-container {
    flex-direction: column;
  }

  .path-connector-arrow {
    transform: rotate(90deg);
  }

  .overview-grid-section {
    grid-template-columns: 1fr;
  }

  .hero-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
  }

  .hero-illustration-slot {
    margin-top: 18px;
    width: 100%;
  }
}
</style>

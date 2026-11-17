<template>
  <main class="learn-page adventure-hub-page">
    <!-- 1. 顶部 HERO 指挥台 -->
    <section class="hub-hero">
      <div class="hero-main-card">
        <div class="hero-kicker-row">
          <span class="learn-kicker">SCENARIO CAMPAIGN · 场景闯关与角色实战</span>
          <span v-if="activeChapterData.privilegeExempted" class="hero-privilege-badge">
            🏅 黑金盲听免修特权生效中
          </span>
        </div>

        <h1 class="hero-title">以语境为盾，以博弈破局</h1>
        <p class="hero-subtitle">
          打破传统孤立背词与生硬剧情的割裂：每个场景均由
          <strong>“5 阶梯基础训练（模块 A）”</strong> 与
          <strong>“3 回合真实 NPC 角色博弈（模块 B）”</strong>
          深度咬合而成。学完即用，在真实冲突中锻造交际定力。
        </p>

        <div class="hero-actions">
          <button class="learn-button hero-cta-btn" type="button" @click="enterCurrentAdventure">
            <span>{{ isChapterComplete(currentChapterId) ? '⚔️ 进入 Boss 实战博弈' : `🎯 继续主线：${nextPlayableStep.name}` }}</span>
            <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button class="learn-button secondary hero-ng-btn" type="button" @click="enterBlindListening(currentChapterId)">
            <span>📞 二周目盲听挑战（拿黑金免修）</span>
          </button>

          <button class="hero-ghost-btn" type="button" @click="goToChapterSelection">
            <span>🗺️ 场景大厅</span>
          </button>
        </div>
      </div>

      <!-- 右侧学习战报概览仪表盘 -->
      <aside class="hero-telemetry-card learn-card" aria-label="全域学习态势">
        <div class="telemetry-header">
          <span class="telemetry-kicker">Mission Telemetry</span>
          <span class="telemetry-sub">全域战情</span>
        </div>

        <div class="telemetry-metrics-grid">
          <div class="metric-block">
            <span class="metric-label">当前主线场景</span>
            <strong class="metric-value truncate">{{ activeChapterMeta.shortName }}</strong>
            <small class="metric-hint">{{ activeChapterProgress }}/5 关完成</small>
          </div>

          <div class="metric-block">
            <span class="metric-label">角色博弈总星级</span>
            <strong class="metric-value gold">⭐ {{ totalAvgStars }}<span class="denom">/{{ totalPossibleStars }}</span></strong>
            <small class="metric-hint">{{ completedAvgCount }} 个场景已破局</small>
          </div>

          <div class="metric-block">
            <span class="metric-label">基础关卡总进度</span>
            <strong class="metric-value">{{ totalCompletedLevels }}<span class="denom">/{{ totalStepsCount }}</span></strong>
            <small class="metric-hint">词汇·拼写·听力·AI·实战</small>
          </div>

          <div class="metric-block">
            <span class="metric-label">连续学习</span>
            <strong class="metric-value">{{ streakDays }}<span class="denom">天</span></strong>
            <small class="metric-hint">保持每日行动惯性</small>
          </div>
        </div>
      </aside>
    </section>

    <!-- 2. 当前主线核心作战卡（Active Mission Command Deck） -->
    <section class="active-mission-deck learn-card">
      <div class="deck-header-row">
        <div class="deck-title-group">
          <div class="deck-badges">
            <span class="scene-category-pill">{{ activeChapterMeta.category }}</span>
            <span class="scene-active-pill">🔥 当前主线</span>
            <span v-if="activeChapterData.privilegeExempted" class="scene-exempt-pill">
              🏅 黑金免修全通
            </span>
            <span v-else-if="activeChapterStars > 0" class="scene-stars-pill">
              ⭐ {{ activeChapterStars }}/3 星战绩
            </span>
          </div>
          <h2 class="deck-title">{{ activeChapterMeta.name }}</h2>
          <p class="deck-desc">{{ activeChapterMeta.description }}</p>
        </div>

        <button class="switch-scene-btn" type="button" @click="goToChapterSelection">
          切换主线场景 ➔
        </button>
      </div>

      <!-- 双轨并行作战看板 -->
      <div class="dual-track-container">
        <!-- 轨道 A: 5 阶能力攻防链 (Module A) -->
        <div class="track-card track-a">
          <div class="track-header">
            <div class="track-badge-tag">模块 A · 基础梯级训练</div>
            <h3>5 关能力层层筑基</h3>
            <p>词汇记忆 $\rightarrow$ 拼写查漏 $\rightarrow$ 听力阶梯 $\rightarrow$ AI 语用 $\rightarrow$ 礼宾部热身</p>
          </div>

          <div class="step-nodes-chain">
            <div
              v-for="step in levelSteps"
              :key="step.key"
              class="step-node-item"
              :class="getStepNodeClass(step.key)"
              @click="enterLevelDirectly(step.key)"
            >
              <div class="step-icon-bubble">
                <span v-if="isStepDone(step.key)" class="step-check">✓</span>
                <span v-else class="step-num">{{ step.index }}</span>
              </div>
              <div class="step-info">
                <div class="step-name-row">
                  <strong>{{ step.name }}</strong>
                  <span class="step-tag-pill">{{ step.tag }}</span>
                </div>
                <small>{{ step.desc }}</small>
              </div>
              <div class="step-status-chip">
                {{ isStepDone(step.key) ? '已完成' : (nextPlayableStep.key === step.key ? '当前任务' : '待解锁') }}
              </div>
            </div>
          </div>
        </div>

        <!-- 轨道 B: 角色博弈 Boss 战 (Module B) -->
        <div class="track-card track-b">
          <div class="track-header">
            <div class="track-badge-tag boss">模块 B · 角色剧情实战博弈</div>
            <h3>午夜冲突与好感度谈判</h3>
            <p>将刚练过的核心词汇，放进与真实 NPC 的 3 回合利益交涉中</p>
          </div>

          <div class="boss-dossier-box">
            <div class="boss-profile-head">
              <span class="boss-avatar-badge">{{ activeChapterMeta.bossAvatar }}</span>
              <div class="boss-profile-copy">
                <h4>{{ activeChapterMeta.bossName }}</h4>
                <span class="boss-role-tag">{{ activeChapterMeta.bossRole }}</span>
              </div>
            </div>

            <blockquote class="boss-quote">
              {{ activeChapterMeta.bossQuote }}
            </blockquote>

            <div class="boss-status-banner" :class="{ 'is-completed': activeChapterStars > 0, 'is-exempt': activeChapterData.privilegeExempted }">
              <div v-if="activeChapterData.privilegeExempted">
                <strong>🏅 黑金免修特权已生效</strong>
                <p>二周目盲听定级满分，模块 A 基础关卡享受免修直通特权。</p>
              </div>
              <div v-else-if="activeChapterStars > 0">
                <strong>⭐ 最高战报：{{ activeChapterStars }}/3 星（{{ activeChapterScore }} 分）</strong>
                <p>已达成 {{ activeChapterPrestige || '谈判破局' }}，破局词汇已全量归档复盘池。</p>
              </div>
              <div v-else-if="isChapterComplete(currentChapterId)">
                <strong>🔥 基础关卡已全通！Boss 战随时就绪</strong>
                <p>你的词汇与语用表达已准备就绪，点击下方按钮立即迎战 {{ activeChapterMeta.bossName }}。</p>
              </div>
              <div v-else>
                <strong>🔒 前置 5 关推进中（或直接二周目盲听破关）</strong>
                <p>完成模块 A 全部关卡即可解锁剧情博弈；或点击下方挑战二周目盲听一键免修。</p>
              </div>
            </div>

            <div class="boss-actions-row">
              <button
                class="learn-button boss-battle-btn"
                type="button"
                :disabled="!isChapterComplete(currentChapterId) && !activeChapterData.privilegeExempted"
                @click="enterBossBattle(currentChapterId)"
              >
                {{ isChapterComplete(currentChapterId) || activeChapterData.privilegeExempted ? '⚔️ 迎战 Boss 角色谈判' : '🔒 完成前置训练解锁' }}
              </button>
              <button
                class="learn-button secondary boss-ng-btn"
                type="button"
                @click="enterBlindListening(currentChapterId)"
                title="二周目午夜电话全盲听，0 显露通关拿黑金免修"
              >
                🎧 二周目盲听试炼
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. 场景任务库档案矩阵 (Scenario Campaign Library) -->
    <section class="scenario-library-section">
      <div class="section-heading-row">
        <div>
          <span class="learn-kicker">CAMPAIGN ARCHIVES</span>
          <h2>场景任务库档案</h2>
        </div>
        <p class="section-heading-tip">
          所有场景均支持【5 阶梯基础训练】与【角色博弈 Boss 战】完整闭环，点击卡片即可切换为主线。
        </p>
      </div>

      <div class="scenario-grid">
        <article
          v-for="chapter in CHAPTERS_META"
          :key="chapter.id"
          class="scenario-card learn-card"
          :class="{ 'is-active': chapter.id === currentChapterId, 'is-completed': isChapterComplete(chapter.id) }"
          @click="selectAndSwitchChapter(chapter.id)"
        >
          <div class="scenario-card-top">
            <div class="scenario-tag-cluster">
              <span class="category-pill">{{ chapter.category }}</span>
              <span v-if="chapter.id === currentChapterId" class="current-pill">当前主线</span>
              <span v-if="getChapterData(chapter.id).privilegeExempted" class="privilege-pill">🏅 黑金免修</span>
              <span v-else-if="getAvgStars(chapter.id) > 0" class="star-pill">⭐ {{ getAvgStars(chapter.id) }}/3 星</span>
            </div>
            <span class="scene-id-badge">{{ chapter.id }}</span>
          </div>

          <h3 class="scenario-title">{{ chapter.name }}</h3>
          <p class="scenario-desc">{{ chapter.description }}</p>

          <div class="scenario-npc-row">
            <span class="npc-avatar">{{ chapter.bossAvatar }}</span>
            <div class="npc-meta">
              <strong>对弈对手：{{ chapter.bossName }}</strong>
              <small>{{ chapter.bossRole }}</small>
            </div>
          </div>

          <div class="scenario-words-preview">
            <span class="words-label">破局词库：</span>
            <div class="words-pill-list">
              <span v-for="word in chapter.vocabulary.slice(0, 5)" :key="word" class="vocab-chip">
                {{ word }}
              </span>
              <span v-if="chapter.vocabulary.length > 5" class="vocab-chip more">
                +{{ chapter.vocabulary.length - 5 }}
              </span>
            </div>
          </div>

          <div class="scenario-card-progress">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: getChapterProgressPercent(chapter.id) + '%' }"></div>
            </div>
            <span class="progress-label">
              {{ getChapterCompletedCount(chapter.id) }}/5 关已完成
            </span>
          </div>

          <div class="scenario-card-actions" @click.stop>
            <button class="learn-button" type="button" @click="selectAndSwitchChapter(chapter.id)">
              {{ chapter.id === currentChapterId ? '继续推进' : '切换为主线' }}
            </button>
            <button
              class="learn-button secondary"
              type="button"
              :disabled="!isChapterComplete(chapter.id) && !getChapterData(chapter.id).privilegeExempted"
              @click="enterBossBattle(chapter.id)"
            >
              Boss 实战
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- 4. 双轨合一新玩法解析说明卡 -->
    <section class="gameplay-philosophy-deck learn-card">
      <div class="philosophy-header">
        <span class="learn-kicker">WHY THIS DESIGN</span>
        <h2>为什么将角色扮演与闯关学习合为一体？</h2>
        <p>告别“先背完几千个单词再开口”的传统拖延陷阱，让每一颗语言子弹都有落点。</p>
      </div>

      <div class="philosophy-grid">
        <div class="philosophy-card">
          <div class="phil-num">01</div>
          <h3>梯级基础打磨（稳扎稳打）</h3>
          <p>
            词汇 Anki 闪卡回忆、靶向缺口拼写、盲听台阶进阶与 AI 语用得体度比对，每天 15 分钟闭环强化，牢固筑牢核心语料防线。
          </p>
        </div>

        <div class="philosophy-card">
          <div class="phil-num">02</div>
          <h3>即时角色对抗（学完即战）</h3>
          <p>
            刚掌握的 <code>reservation</code>、<code>complimentary upgrade</code>，立即在午夜前台被主管 Arthur 步步紧逼。好感度动态涨跌，倒逼学习者运用得体策略破局。
          </p>
        </div>

        <div class="philosophy-card">
          <div class="phil-num">03</div>
          <h3>二周目盲听免修（强者跃迁）</h3>
          <p>
            若你已具备扎实的听力与口语功底，无需忍受低阶关卡重复刷题。直接挑战二周目午夜电话全盲听，3 星通过即可享受整章免修特权！
          </p>
        </div>
      </div>
    </section>

    <!-- 5. 联动学情复盘入口横幅 -->
    <section class="review-bridge-banner learn-card">
      <div class="bridge-copy">
        <span class="bridge-icon">📊</span>
        <div>
          <h3>闯关与博弈中的知识缺口，已自动沉淀进复盘池</h3>
          <p>在基础关卡中标记模糊的词汇、拼写错漏点与 Boss 谈判中扣除好感度的薄弱表达，已归档待命。</p>
        </div>
      </div>
      <button class="learn-button bridge-cta-btn" type="button" @click="goToReviewReport">
        前往专属复盘池 ➔
      </button>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo, switchChapter } from '@/api/auth'
import { getDailyStudyReport } from '@/api/report'
import { toast } from '@/utils/toastService'

const router = useRouter()

// 用户态与章节状态
const userInfo = ref(null)
const currentChapterId = ref('A')
const dailyReport = ref(null)

// 基础 5 关能力层级定义
const levelSteps = [
  { key: 'wordP', index: 1, name: '词汇认知', tag: 'Anki闪卡', desc: '掌握核心破局词与搭配' },
  { key: 'spellP', index: 2, name: '靶向拼写', tag: '精准查漏', desc: '强化高频核心词精准拼写' },
  { key: 'listenP', index: 3, name: '听力阶梯', tag: '语流捕捉', desc: '盲听与高频场景挖空听辨' },
  { key: 'customsP', index: 4, name: 'AI 语用', tag: '得体博弈', desc: '委婉语气与得体句式甄别' },
  { key: 'coverP', index: 5, name: '礼宾实战', tag: '口语热身', desc: '与白天前台礼宾真实对话' }
]

// 场景档案库配置
const CHAPTERS_META = [
  {
    id: 'A',
    name: '希尔顿酒店 · 午夜预订危机',
    shortName: '酒店场景',
    category: '旅行出行 · 关键博弈',
    scenarioId: 'scenario_hotel_01',
    description: '深夜抵达前台却遭遇系统查无订单，需核对确认号、交涉临时押金并机智争取升房权益。',
    bossName: 'Arthur',
    bossRole: '希尔顿前台主管 · 严苛照章办事',
    bossAvatar: '🛎️',
    bossQuote: '“先生，系统里确实查不到 Alex 的预订。今晚客房全满，请出示有效凭据。”',
    vocabulary: ['reservation', 'confirmation', 'complimentary', 'upgrade', 'concierge', 'deposit', 'refundable'],
    keyPhrases: [
      'I have a reservation under the name of Alex.',
      'I was wondering if a complimentary upgrade might be possible.',
      'Could you confirm whether the deposit is refundable?'
    ]
  },
  {
    id: 'B',
    name: '米其林星级晚宴 · 商务接待对策',
    shortName: '餐厅场景',
    category: '商务社交 · 宴请礼仪',
    scenarioId: 'scenario_restaurant_01',
    description: '应对重要外宾招待，从核对包厢、特殊忌口沟通、酒水推荐到突发加菜与账单争议处理。',
    bossName: 'Elena',
    bossRole: '餐厅高级领班 · 挑剔细节',
    bossAvatar: '🍷',
    bossQuote: '“今晚主厨推荐的安格斯牛排需提前醒味，请问贵宾有任何忌口或特殊偏好吗？”',
    vocabulary: ['appetizer', 'dietary', 'beverage', 'complimentary', 'split the bill', 'recommendation'],
    keyPhrases: [
      'Could you recommend something lighter for the appetizer?',
      'Are there any dietary restrictions or allergies?',
      'Could we have the bill split between these two cards?'
    ]
  }
]

// 计算属性
const activeChapterMeta = computed(() => {
  return CHAPTERS_META.find(c => c.id === currentChapterId.value) || CHAPTERS_META[0]
})

const getChapterData = (chapterId) => {
  return userInfo.value?.chapters?.[chapterId] || {}
}

const activeChapterData = computed(() => {
  return getChapterData(currentChapterId.value)
})

const activeChapterStars = computed(() => {
  return Number(activeChapterData.value.avgStars || 0)
})

const activeChapterScore = computed(() => {
  return Number(activeChapterData.value.avgScore || 0)
})

const activeChapterPrestige = computed(() => {
  return activeChapterData.value.avgPrestigeTier || ''
})

const isStepDone = (key) => {
  const data = activeChapterData.value
  return Boolean(data[key] || data.privilegeExempted)
}

const isChapterComplete = (chapterId) => {
  const data = getChapterData(chapterId)
  if (data.privilegeExempted) return true
  return levelSteps.every(step => Boolean(data[step.key]))
}

const getChapterCompletedCount = (chapterId) => {
  const data = getChapterData(chapterId)
  if (data.privilegeExempted) return 5
  return levelSteps.reduce((sum, step) => sum + (data[step.key] ? 1 : 0), 0)
}

const getChapterProgressPercent = (chapterId) => {
  const completed = getChapterCompletedCount(chapterId)
  return Math.round((completed / levelSteps.length) * 100)
}

const activeChapterProgress = computed(() => {
  return getChapterCompletedCount(currentChapterId.value)
})

const nextPlayableStep = computed(() => {
  const data = activeChapterData.value
  if (data.privilegeExempted || isChapterComplete(currentChapterId.value)) {
    return { key: 'boss', index: 6, name: 'Boss 实战博弈', tag: '谈判决战', desc: '直通角色剧情攻防' }
  }
  const next = levelSteps.find(step => !data[step.key])
  return next || levelSteps[0]
})

const getStepNodeClass = (key) => {
  const done = isStepDone(key)
  const isCurrent = nextPlayableStep.value.key === key
  return {
    'is-done': done,
    'is-current': isCurrent,
    'is-locked': !done && !isCurrent
  }
}

// 全局战情统计
const totalStepsCount = computed(() => CHAPTERS_META.length * levelSteps.length)
const totalPossibleStars = computed(() => CHAPTERS_META.length * 3)

const totalCompletedLevels = computed(() => {
  return CHAPTERS_META.reduce((sum, c) => sum + getChapterCompletedCount(c.id), 0)
})

const totalAvgStars = computed(() => {
  return CHAPTERS_META.reduce((sum, c) => sum + getAvgStars(c.id), 0)
})

const completedAvgCount = computed(() => {
  return CHAPTERS_META.filter(c => getAvgStars(c.id) > 0 || getChapterData(c.id).privilegeExempted).length
})

const getAvgStars = (chapterId) => {
  return Number(getChapterData(chapterId).avgStars || 0)
}

const streakDays = computed(() => {
  return userInfo.value?.streakDays || userInfo.value?.cet4?.streakDays || 1
})

const hasAnyPrivilege = computed(() => {
  return CHAPTERS_META.some(c => Boolean(getChapterData(c.id).privilegeExempted))
})

// 导航与行动
const enterCurrentAdventure = () => {
  if (isChapterComplete(currentChapterId.value)) {
    enterBossBattle(currentChapterId.value)
  } else {
    router.push({
      path: '/adventure',
      query: { chapter: currentChapterId.value, level: nextPlayableStep.value.key }
    })
  }
}

const enterLevelDirectly = (levelKey) => {
  router.push({
    path: '/adventure',
    query: { chapter: currentChapterId.value, level: levelKey }
  })
}

const enterBossBattle = (chapterId = currentChapterId.value) => {
  const meta = CHAPTERS_META.find(c => c.id === chapterId) || CHAPTERS_META[0]
  router.push({
    path: '/avg-test',
    query: { scenarioId: meta.scenarioId, chapter: chapterId, from: 'adventure-hub' }
  })
}

const enterBlindListening = (chapterId = currentChapterId.value) => {
  const meta = CHAPTERS_META.find(c => c.id === chapterId) || CHAPTERS_META[0]
  router.push({
    path: '/avg-test',
    query: { scenarioId: meta.scenarioId, chapter: chapterId, runMode: 'ng_plus', from: 'adventure-hub' }
  })
}

const selectAndSwitchChapter = async (chapterId) => {
  if (chapterId === currentChapterId.value) {
    enterCurrentAdventure()
    return
  }

  try {
    const res = await switchChapter(chapterId)
    const data = res.data || res
    if (data.code === 200) {
      currentChapterId.value = chapterId
      toast.success(`已切换至主线：${CHAPTERS_META.find(c => c.id === chapterId)?.name}`)
      await fetchUserData()
    } else {
      toast.error(data.message || '切换章节失败')
    }
  } catch (error) {
    console.error('切换章节异常:', error)
    toast.error('切换章节失败，请检查网络')
  }
}

const goToChapterSelection = () => {
  router.push('/chapters')
}

const goToReviewReport = () => {
  router.push('/review-ai-chat')
}

// 数据加载
const fetchUserData = async () => {
  try {
    const [infoRes, reportRes] = await Promise.all([
      getUserInfo(),
      getDailyStudyReport().catch(() => null)
    ])

    if (infoRes.data?.code === 200) {
      userInfo.value = infoRes.data
      currentChapterId.value = infoRes.data.currentChapter || 'A'
    }

    if (reportRes?.data?.code === 200) {
      dailyReport.value = reportRes.data.data
    }
  } catch (error) {
    console.error('加载闯关中枢数据失败:', error)
  }
}

onMounted(() => {
  fetchUserData()
})
</script>

<style scoped>
.adventure-hub-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ================= 1. 顶部 HERO 指挥台 ================= */
.hub-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) 340px;
  gap: 20px;
  align-items: stretch;
}

.hero-main-card {
  padding: 38px 42px;
  border-radius: 30px;
  background:
    radial-gradient(circle at 10% 20%, rgba(31, 138, 112, 0.18), transparent 45%),
    radial-gradient(circle at 90% 80%, rgba(240, 164, 58, 0.14), transparent 40%),
    linear-gradient(135deg, #fffdf8 0%, #fbf8f0 100%);
  border: 1px solid rgba(36, 49, 47, 0.1);
  box-shadow: var(--learn-shadow-soft);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hero-kicker-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.hero-privilege-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: #fcd34d;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #f59e0b;
}

.hero-title {
  margin: 0 0 14px;
  font-size: clamp(30px, 3.8vw, 48px);
  font-weight: 900;
  line-height: 1.15;
  color: var(--learn-ink);
  letter-spacing: -0.5px;
}

.hero-subtitle {
  margin: 0 0 28px;
  color: var(--learn-muted);
  font-size: 16px;
  line-height: 1.65;
  max-width: 680px;
}

.hero-subtitle strong {
  color: var(--learn-primary-dark);
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.hero-cta-btn {
  font-size: 15px;
  padding: 0 24px;
  min-height: 48px;
}

.btn-arrow {
  width: 18px;
  height: 18px;
  margin-left: 2px;
}

.hero-ng-btn {
  min-height: 48px;
  padding: 0 20px;
  font-size: 14px;
}

.hero-ghost-btn {
  background: transparent;
  color: var(--learn-muted);
  font-weight: 700;
  font-size: 14px;
  padding: 0 14px;
  min-height: 48px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}

.hero-ghost-btn:hover {
  background: rgba(36, 49, 47, 0.06);
  color: var(--learn-ink);
}

/* 右侧战报仪表盘 */
.hero-telemetry-card {
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #ffffff;
}

.telemetry-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--learn-line);
}

.telemetry-kicker {
  font-size: 11px;
  letter-spacing: 1px;
  font-weight: 900;
  color: var(--learn-primary);
  text-transform: uppercase;
}

.telemetry-sub {
  font-size: 12px;
  color: var(--learn-muted);
  font-weight: 700;
}

.telemetry-metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 12px;
  margin-top: 18px;
}

.metric-block {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 12px;
  color: var(--learn-muted);
  font-weight: 700;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 26px;
  font-weight: 900;
  line-height: 1.1;
  color: var(--learn-ink);
}

.metric-value.truncate {
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value.gold {
  color: #d97706;
}

.metric-value .denom {
  font-size: 15px;
  color: var(--learn-muted);
  font-weight: 600;
}

.metric-hint {
  font-size: 11px;
  color: var(--learn-muted);
  margin-top: 4px;
}

/* ================= 2. 当前主线核心作战卡 ================= */
.active-mission-deck {
  padding: 32px 36px;
  background: #ffffff;
  border-radius: var(--learn-radius-lg);
  box-shadow: var(--learn-shadow);
  border: 1px solid rgba(31, 138, 112, 0.2);
}

.deck-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--learn-line);
  margin-bottom: 28px;
}

.deck-title-group {
  max-width: 820px;
}

.deck-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.scene-category-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(36, 49, 47, 0.08);
  font-size: 12px;
  font-weight: 700;
  color: var(--learn-ink);
}

.scene-active-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--learn-green-soft);
  color: var(--learn-primary-dark);
  font-size: 12px;
  font-weight: 800;
}

.scene-exempt-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: #111827;
  color: #fbbf24;
  font-size: 12px;
  font-weight: 800;
}

.scene-stars-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-size: 12px;
  font-weight: 800;
}

.deck-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--learn-ink);
  margin: 0 0 8px;
}

.deck-desc {
  margin: 0;
  color: var(--learn-muted);
  font-size: 15px;
  line-height: 1.6;
}

.switch-scene-btn {
  background: transparent;
  color: var(--learn-primary);
  font-size: 14px;
  font-weight: 800;
  padding: 8px 16px;
  border: 1px solid rgba(31, 138, 112, 0.3);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.switch-scene-btn:hover {
  background: var(--learn-green-soft);
  border-color: var(--learn-primary);
}

/* 双轨并行看板 */
.dual-track-container {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 24px;
}

.track-card {
  padding: 24px;
  border-radius: var(--learn-radius-md);
  background: #fbfbf8;
  border: 1px solid var(--learn-line);
}

.track-header {
  margin-bottom: 20px;
}

.track-badge-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 800;
  color: var(--learn-primary);
  margin-bottom: 6px;
}

.track-badge-tag.boss {
  color: #b45309;
}

.track-header h3 {
  margin: 0 0 4px;
  font-size: 20px;
  color: var(--learn-ink);
}

.track-header p {
  margin: 0;
  font-size: 13px;
  color: var(--learn-muted);
}

/* 轨道 A 步骤链 */
.step-nodes-chain {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-node-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid var(--learn-line);
  cursor: pointer;
  transition: all 0.2s;
}

.step-node-item:hover {
  transform: translateX(4px);
  border-color: var(--learn-primary);
}

.step-node-item.is-done {
  background: #f6fcf8;
  border-color: #a7f3d0;
}

.step-node-item.is-current {
  background: #ffffff;
  border: 2px solid var(--learn-primary);
  box-shadow: 0 4px 14px rgba(31, 138, 112, 0.15);
}

.step-icon-bubble {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(36, 49, 47, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  color: var(--learn-muted);
}

.step-node-item.is-done .step-icon-bubble {
  background: #10b981;
  color: #ffffff;
}

.step-node-item.is-current .step-icon-bubble {
  background: var(--learn-primary);
  color: #ffffff;
}

.step-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-name-row strong {
  font-size: 15px;
  color: var(--learn-ink);
}

.step-tag-pill {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(36, 49, 47, 0.06);
  color: var(--learn-muted);
  font-weight: 700;
}

.step-info small {
  display: block;
  font-size: 12px;
  color: var(--learn-muted);
  margin-top: 2px;
}

.step-status-chip {
  font-size: 12px;
  font-weight: 700;
  color: var(--learn-muted);
}

.step-node-item.is-done .step-status-chip {
  color: #059669;
}

.step-node-item.is-current .step-status-chip {
  color: var(--learn-primary);
}

/* 轨道 B Boss 档案 */
.boss-dossier-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.boss-profile-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.boss-avatar-badge {
  font-size: 38px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid var(--learn-line);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--learn-shadow-soft);
}

.boss-profile-copy h4 {
  margin: 0;
  font-size: 18px;
  color: var(--learn-ink);
}

.boss-role-tag {
  font-size: 13px;
  color: var(--learn-muted);
  font-weight: 600;
}

.boss-quote {
  margin: 0;
  padding: 12px 16px;
  border-left: 3px solid var(--learn-accent);
  background: #ffffff;
  border-radius: 0 10px 10px 0;
  font-size: 13px;
  line-height: 1.55;
  color: #475569;
  font-style: italic;
}

.boss-status-banner {
  padding: 14px 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px dashed var(--learn-line);
}

.boss-status-banner.is-completed {
  background: #fefce8;
  border: 1px solid #fde047;
}

.boss-status-banner.is-exempt {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

.boss-status-banner strong {
  display: block;
  font-size: 14px;
  color: var(--learn-ink);
  margin-bottom: 4px;
}

.boss-status-banner p {
  margin: 0;
  font-size: 12px;
  color: var(--learn-muted);
  line-height: 1.5;
}

.boss-actions-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.boss-battle-btn {
  width: 100%;
}

.boss-ng-btn {
  width: 100%;
  font-size: 13px;
}

/* ================= 3. 场景任务库档案矩阵 ================= */
.scenario-library-section {
  margin-top: 12px;
}

.section-heading-row {
  margin-bottom: 20px;
}

.section-heading-row h2 {
  margin: 6px 0 4px;
  font-size: 26px;
  color: var(--learn-ink);
}

.section-heading-tip {
  margin: 0;
  font-size: 14px;
  color: var(--learn-muted);
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 20px;
}

.scenario-card {
  padding: 28px;
  background: #ffffff;
  border-radius: var(--learn-radius-lg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.22s ease;
}

.scenario-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--learn-shadow);
  border-color: rgba(31, 138, 112, 0.3);
}

.scenario-card.is-active {
  border-color: var(--learn-primary);
  background: linear-gradient(180deg, #f7fdfb 0%, #ffffff 100%);
}

.scenario-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.scenario-tag-cluster {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.category-pill {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(36, 49, 47, 0.08);
  color: var(--learn-ink);
  font-weight: 700;
}

.current-pill {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--learn-green-soft);
  color: var(--learn-primary-dark);
  font-weight: 800;
}

.privilege-pill {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #1e293b;
  color: #fbbf24;
  font-weight: 800;
}

.star-pill {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-weight: 800;
}

.scene-id-badge {
  font-size: 20px;
  font-weight: 900;
  color: rgba(36, 49, 47, 0.2);
}

.scenario-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 800;
  color: var(--learn-ink);
}

.scenario-desc {
  margin: 0 0 16px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--learn-muted);
}

.scenario-npc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f8fafc;
  margin-bottom: 16px;
}

.npc-avatar {
  font-size: 24px;
}

.npc-meta strong {
  display: block;
  font-size: 13px;
  color: var(--learn-ink);
}

.npc-meta small {
  font-size: 11px;
  color: var(--learn-muted);
}

.scenario-words-preview {
  margin-bottom: 18px;
}

.words-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--learn-muted);
  margin-bottom: 6px;
}

.words-pill-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.vocab-chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #334155;
  font-weight: 600;
}

.vocab-chip.more {
  background: transparent;
  color: var(--learn-muted);
}

.scenario-card-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--learn-primary);
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--learn-muted);
  white-space: nowrap;
}

.scenario-card-actions {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 10px;
}

/* ================= 4. 双轨合一解析卡 ================= */
.gameplay-philosophy-deck {
  padding: 36px 40px;
  background: #ffffff;
  border-radius: var(--learn-radius-lg);
}

.philosophy-header {
  margin-bottom: 28px;
}

.philosophy-header h2 {
  margin: 8px 0 6px;
  font-size: 26px;
  color: var(--learn-ink);
}

.philosophy-header p {
  margin: 0;
  font-size: 15px;
  color: var(--learn-muted);
}

.philosophy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.philosophy-card {
  padding: 24px;
  border-radius: var(--learn-radius-md);
  background: #fafaf7;
  border: 1px solid var(--learn-line);
}

.phil-num {
  font-size: 28px;
  font-weight: 900;
  color: var(--learn-primary);
  margin-bottom: 8px;
  opacity: 0.85;
}

.philosophy-card h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--learn-ink);
}

.philosophy-card p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--learn-muted);
}

.philosophy-card code {
  background: rgba(36, 49, 47, 0.08);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: monospace;
}

/* ================= 5. 复盘横幅 ================= */
.review-bridge-banner {
  padding: 24px 32px;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  color: #ffffff;
  border-radius: var(--learn-radius-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.bridge-copy {
  display: flex;
  align-items: center;
  gap: 18px;
}

.bridge-icon {
  font-size: 32px;
}

.bridge-copy h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #ffffff;
}

.bridge-copy p {
  margin: 0;
  font-size: 13.5px;
  color: #94a3b8;
}

.bridge-cta-btn {
  background: #ffffff;
  color: #111827;
  box-shadow: none;
  white-space: nowrap;
}

.bridge-cta-btn:hover {
  background: #f8fafc;
  color: #000000;
}

/* 响应式适配 */
@media (max-width: 960px) {
  .hub-hero {
    grid-template-columns: 1fr;
  }

  .dual-track-container {
    grid-template-columns: 1fr;
  }

  .review-bridge-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-main-card {
    padding: 24px 20px;
  }

  .active-mission-deck {
    padding: 20px 16px;
  }

  .scenario-card-actions {
    grid-template-columns: 1fr;
  }
}
</style>

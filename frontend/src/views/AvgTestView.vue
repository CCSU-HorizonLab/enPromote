<template>
  <div class="avg-test-page">
    <!-- 顶部状态栏 -->
    <header class="top-nav">
      <div class="nav-brand">
        <span class="badge-tag">RPG DND AVG · 双轨离散版</span>
        <h1>{{ scenarioData?.title || '正在加载剧本...' }}</h1>
      </div>
      <div class="nav-status" v-if="scenarioData">
        <div class="status-pill dc-pill">
          <span class="label">目标难度</span>
          <span class="val">DC {{ scenarioData.targetDc }}</span>
        </div>
        <div class="status-pill round-pill">
          <span class="label">交流轮次</span>
          <span class="val">{{ currentRound }} 轮</span>
        </div>
        <button class="btn-ghost" @click="resetSession" :disabled="loading">
          🔄 重置对局
        </button>
      </div>
    </header>

    <main class="main-layout" v-if="scenarioData">
      <!-- 左栏：NPC 与双轨明牌指示器 -->
      <aside class="npc-sidebar">
        <!-- 角色立绘与情绪卡 -->
        <div class="npc-card" :class="currentEmotion">
          <div class="avatar-box">
            <div class="avatar-placeholder" :class="currentEmotion">
              <span class="avatar-icon">👩‍🍳</span>
            </div>
            <div class="emotion-badge" :class="currentEmotion">
              {{ emotionLabel }}
            </div>
          </div>
          <div class="npc-info">
            <h2>{{ scenarioData.npc.name }}</h2>
            <span class="npc-title">{{ scenarioData.npc.title }}</span>
            <p class="npc-persona">{{ scenarioData.npc.persona }}</p>
          </div>
        </div>

        <!-- 轨 1：Chloe 耐心槽 (Patience Hearts) -->
        <div class="tracker-card patience-card" :class="{ 'crisis-alert': dualTrack.patienceHearts === 0 }">
          <div class="card-header">
            <span class="icon">⏳</span>
            <h3>Chloe 的耐心 (Patience)</h3>
            <span class="heart-status-tag" :class="dualTrack.patienceHearts > 0 ? 'safe' : 'danger'">
              {{ dualTrack.patienceHearts > 0 ? '尚存耐心' : '已耗尽!' }}
            </span>
          </div>
          <div class="hearts-row">
            <span
              v-for="i in 3"
              :key="i"
              class="heart-icon"
              :class="{ broken: i > dualTrack.patienceHearts }"
            >
              {{ i <= dualTrack.patienceHearts ? '❤️' : '💔' }}
            </span>
          </div>
          <div class="tracker-sub">
            <span v-if="dualTrack.patienceHearts > 0">
              心碎扣减：<strong>-{{ dualTrack.brokenHearts }} 点修正</strong> (粗鲁或超时会碎心)
            </span>
            <span v-else class="text-danger">
              ⚠️ 耐心已耗尽！已触发社交危机，请立即决胜！
            </span>
          </div>
        </div>

        <!-- 轨 2：筹码与印章 (Tokens & Stamps) -->
        <div class="tracker-card tokens-card">
          <div class="card-header">
            <span class="icon">🪙</span>
            <h3>交涉筹码与词汇印章</h3>
          </div>

          <!-- 筹码槽 -->
          <div class="token-slot-row">
            <div class="slot-label">
              <span>语言表现筹码</span>
              <small>{{ dualTrack.persuasionTokens }} / 3 枚</small>
            </div>
            <div class="slots">
              <span
                v-for="i in 3"
                :key="i"
                class="coin-badge"
                :class="{ active: i <= dualTrack.persuasionTokens }"
              >
                {{ i <= dualTrack.persuasionTokens ? '🪙' : '⚪' }}
              </span>
            </div>
          </div>

          <!-- 词汇印章槽 -->
          <div class="token-slot-row">
            <div class="slot-label">
              <span>核心词汇印章</span>
              <small>{{ dualTrack.keywordStampsCount }} / 3 枚</small>
            </div>
            <div class="slots">
              <span
                v-for="i in 3"
                :key="i"
                class="stamp-badge"
                :class="{ active: i <= dualTrack.keywordStampsCount }"
              >
                {{ i <= dualTrack.keywordStampsCount ? '🎯' : '⚪' }}
              </span>
            </div>
          </div>

          <!-- 明牌修正汇总条 -->
          <div class="total-calc-bar">
            <div class="calc-formula">
              <span>+{{ dualTrack.persuasionTokens }} (筹码)</span>
              <span>+{{ dualTrack.keywordStampsCount }} (印章)</span>
              <span>+{{ dualTrack.baseAffinity }} (熟客)</span>
              <span class="text-sub">-{{ dualTrack.brokenHearts }} (心碎)</span>
            </div>
            <div class="calc-result">
              <small>决胜总加成</small>
              <strong :class="dualTrack.totalPendingMod >= 0 ? 'text-positive' : 'text-danger'">
                {{ formatMod(dualTrack.totalPendingMod) }} 点
              </strong>
            </div>
          </div>
        </div>

        <!-- 剧情情境动机 (Dramatic Context) -->
        <div class="context-card">
          <div class="card-header">
            <span class="icon">🎭</span>
            <h3>当前情境动机 (Dramatic Context)</h3>
          </div>
          <div class="context-item">
            <span class="label">前因缘由:</span>
            <p>{{ scenarioData.dramaticContext.whyHere }}</p>
          </div>
          <div class="context-item">
            <span class="label">心理状态:</span>
            <p class="mood-highlight">{{ scenarioData.dramaticContext.currentMentalState }}</p>
          </div>
          <div class="context-item">
            <span class="label">破防软肋:</span>
            <p class="soft-spot">{{ scenarioData.dramaticContext.hiddenSoftSpot }}</p>
          </div>
        </div>
      </aside>

      <!-- 右栏：对话推进舞台与行动区 -->
      <section class="stage-section">
        <!-- 关卡通关目标条与节奏提示 -->
        <div class="objective-banner">
          <div class="target-flag">🎯 关卡目标</div>
          <p>{{ scenarioData.objectiveDescription }}</p>
          <div class="pacing-pill" :class="pacingInfo.phase" v-if="!isCompleted">
            <span>{{ pacingInfo.label }}</span>
            <small>{{ pacingInfo.hint }}</small>
          </div>
        </div>

        <!-- 对话历史回放区 -->
        <div class="chat-viewport" ref="chatViewportRef">
          <!-- 开场白 -->
          <div class="chat-row npc-row">
            <div class="bubble npc-bubble">
              <span class="speaker">{{ scenarioData.npc.name }}</span>
              <p class="speech-text">{{ scenarioData.openingLine }}</p>
            </div>
          </div>

          <!-- 交互历史 -->
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="chat-row"
            :class="msg.role === 'user' ? 'user-row' : 'npc-row'"
          >
            <div class="bubble" :class="msg.role === 'user' ? 'user-bubble' : 'npc-bubble'">
              <span class="speaker">{{ msg.role === 'user' ? 'You' : scenarioData.npc.name }}</span>
              <p class="speech-text">{{ msg.content }}</p>
              
              <!-- 语言即时反馈 (针对用户输入) -->
              <div v-if="msg.evaluation" class="eval-card">
                <div class="eval-chips">
                  <!-- 获得的筹码或碎心标记 -->
                  <span v-if="msg.tokenEarned" class="chip token-chip">🪙 +1 获得交涉筹码！</span>
                  <span v-if="msg.heartBroken" class="chip heart-chip">💔 失去 1 颗耐心！</span>
                  
                  <span class="chip" :class="getModClass(msg.evaluation.toneMod)">
                    语气 {{ formatMod(msg.evaluation.toneMod) }} ({{ msg.evaluation.toneReason }})
                  </span>
                  <span class="chip" :class="getModClass(msg.evaluation.fluencyMod)">
                    地道 {{ formatMod(msg.evaluation.fluencyMod) }}
                  </span>
                  <span v-if="msg.evaluation.keywordsHit?.length" class="chip hit-chip">
                    🎯 盖下印章: {{ msg.evaluation.keywordsHit.join(', ') }}
                  </span>
                </div>
                <div v-if="msg.evaluation.polishTip" class="polish-tip">
                  <span class="polish-kicker">💡 地道说法润色：</span>
                  <strong>"{{ msg.evaluation.polishTip.nativeSentence }}"</strong>
                  <p>{{ msg.evaluation.polishTip.explanation }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 正在思考指示 -->
          <div v-if="loading" class="chat-row npc-row">
            <div class="bubble npc-bubble thinking-bubble">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="thinking-text">{{ scenarioData.npc.name }} 正在打量你...</span>
            </div>
          </div>

          <!-- 决胜结案归档卡片 (检定完成后直接在对话底部封板，不再允许发送新对白) -->
          <div v-if="isCompleted && checkEnding" class="settlement-stage-card" :class="checkEnding.type">
            <div class="settlement-header">
              <span class="settlement-kicker">🎬 剧本单集交涉已落幕</span>
              <h3>{{ checkEnding.title }}</h3>
            </div>
            <p class="settlement-story">{{ checkEnding.storyText }}</p>

            <div class="settlement-quote">
              <span class="speaker-tag">{{ scenarioData.npc.name }} 的最终反应：</span>
              <p>"{{ checkEnding.npcFinalReply }}"</p>
            </div>

            <div class="settlement-takeaway">
              <span class="takeaway-title">📋 本局语言学情复盘</span>
              <p>{{ checkEnding.takeawayTip }}</p>
            </div>

            <div class="settlement-actions">
              <button class="btn-primary" @click="resetSession">🔄 再次挑战本场景</button>
            </div>
          </div>
        </div>

        <!-- 快捷场景词汇支架 (未结算时展示) -->
        <div class="keywords-bar" v-if="!isCompleted">
          <span class="kw-label">推荐核心表达（命中可点亮印章）：</span>
          <div class="kw-chips">
            <button
              v-for="kw in scenarioData.recommendedKeywords"
              :key="kw.word"
              class="kw-btn"
              :class="{ hit: isKeywordHit(kw.word) }"
              @click="insertKeyword(kw.word)"
            >
              <strong>{{ kw.word }}</strong>
              <small>{{ kw.meaning }}</small>
              <span v-if="isKeywordHit(kw.word)" class="stamp-mark">🎯 已盖章</span>
            </button>
          </div>
        </div>

        <!-- 输入交互与行动栏 -->
        <div class="input-panel">
          <!-- 未结算状态：正常输入与发起检定 -->
          <template v-if="!isCompleted">
            <div class="input-row">
              <textarea
                v-model="userInput"
                placeholder="用英语和 Chloe 交流（例如：Could I get an iced latte with oat milk, please?）..."
                rows="2"
                @keydown.enter.prevent="sendMessage"
                :disabled="loading || isChecking || dualTrack.patienceHearts === 0"
              ></textarea>
              <button
                class="btn-send"
                @click="sendMessage"
                :disabled="!userInput.trim() || loading || isChecking || dualTrack.patienceHearts === 0"
              >
                发送对白 ↵
              </button>
            </div>

            <!-- 决胜大检定触发栏 -->
            <div class="climax-action-bar" :class="{ 'highlight-pulse': pacingInfo.phase === 'prime', 'crisis-pulse': dualTrack.patienceHearts === 0 }">
              <div class="climax-info">
                <span>当前决胜总加成：<strong :class="dualTrack.totalPendingMod >= 0 ? 'text-positive' : 'text-danger'">{{ formatMod(dualTrack.totalPendingMod) }} 点</strong></span>
                <small v-if="dualTrack.patienceHearts === 0">⚠️ 耐心已耗尽，请立即掷骰发起终局交涉！</small>
                <small v-else-if="pacingInfo.phase === 'prime'">🔥 黄金交涉窗口！筹码已满，正是提出非标特调的最佳时机！</small>
                <small v-else-if="pacingInfo.phase === 'urgent'">⚠️ 后面队伍在催促，请尽快发起决胜检定！</small>
                <small v-else>已交流 {{ currentRound }} 轮，建议做好铺垫后发起决胜检定</small>
              </div>
              <button
                class="btn-climax"
                @click="triggerClimaxCheck"
                :disabled="loading || isChecking"
              >
                🎲 发起决胜检定 (Roll D20)
              </button>
            </div>
          </template>

          <!-- 已结算状态：锁定输入框，提示交涉已结束，彻底杜绝浪费算力 -->
          <template v-else>
            <div class="completed-lock-panel">
              <span class="lock-icon">🔒</span>
              <div class="lock-text">
                <strong>本关交涉已完成，结局已达成！</strong>
                <p>已生成完整学情复盘，对话已归档。如需尝试其他交涉口吻，请点击“重新挑战”。</p>
              </div>
              <button class="btn-primary" @click="resetSession">🔄 重新挑战</button>
            </div>
          </template>
        </div>
      </section>
    </main>

    <!-- DND 掷骰检定弹窗与结算看板 -->
    <div v-if="showDiceModal" class="dice-modal-overlay">
      <div class="dice-modal-content">
        <div class="modal-header">
          <h2>🎲 DND 决胜交涉检定</h2>
          <p>场景目标 DC 难度：<strong>{{ scenarioData.targetDc }}</strong></p>
        </div>

        <!-- 骰子动画区 -->
        <div class="dice-arena">
          <div class="dice-cube" :class="{ rolling: isRolling }">
            <span class="dice-number">{{ displayedRoll }}</span>
          </div>
          <div class="dice-status-text">
            {{ isRolling ? '正在掷出 D20 骰子...' : '骰点已确定！' }}
          </div>
        </div>

        <!-- 修正计算明细卡 (全明牌离散整数计算) -->
        <div class="breakdown-card" v-if="!isRolling && checkResult">
          <h3>检定修正构成计算 (双轨离散明牌模型)</h3>
          <div class="calc-row">
            <div class="calc-col">
              <span class="sub">基础骰点</span>
              <strong>{{ checkResult.baseRoll }}</strong>
            </div>
            <span class="op">+</span>
            <div class="calc-col">
              <span class="sub">筹码 (语言表现)</span>
              <strong>+{{ checkResult.modifiers.persuasionTokens }}</strong>
            </div>
            <span class="op">+</span>
            <div class="calc-col">
              <span class="sub">印章 (核心词汇)</span>
              <strong>+{{ checkResult.modifiers.keywordStamps }}</strong>
            </div>
            <span class="op">+</span>
            <div class="calc-col">
              <span class="sub">熟客好感</span>
              <strong>+{{ checkResult.modifiers.baseAffinity }}</strong>
            </div>
            <span class="op">-</span>
            <div class="calc-col text-sub">
              <span class="sub">碎心惩罚</span>
              <strong>-{{ checkResult.modifiers.brokenHeartsPenalty }}</strong>
            </div>
            <span class="op">=</span>
            <div class="calc-col total-col">
              <span class="sub">最终总分</span>
              <strong :class="checkResult.isPassed ? 'text-pass' : 'text-fail'">
                {{ checkResult.finalScore }}
              </strong>
            </div>
          </div>
        </div>

        <!-- 结算结局展示 -->
        <div class="outcome-card" v-if="!isRolling && checkEnding" :class="checkEnding.type">
          <div class="outcome-badge">
            {{ getOutcomeBadge(checkEnding.type) }}
          </div>
          <h3 class="outcome-title">{{ checkEnding.title }}</h3>
          <p class="story-desc">{{ checkEnding.storyText }}</p>

          <div class="npc-final-quote">
            <span class="quote-speaker">{{ scenarioData.npc.name }}:</span>
            <p>"{{ checkEnding.npcFinalReply }}"</p>
          </div>

          <div class="takeaway-box">
            <span class="box-title">📋 核心学情复盘</span>
            <p>{{ checkEnding.takeawayTip }}</p>
          </div>
        </div>

        <div class="modal-footer" v-if="!isRolling">
          <button class="btn-primary" @click="finishAndCloseModal">查看全剧复盘</button>
          <button class="btn-ghost" @click="resetSession">重新挑战本关</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';

const scenarioData = ref<any>(null);
const currentRound = ref(0);
const currentEmotion = ref('neutral');
const userInput = ref('');
const loading = ref(false);
const isChecking = ref(false);
const isCompleted = ref(false); // 本关是否已结案落锁
const chatViewportRef = ref<HTMLElement | null>(null);

// 双轨离散状态
const dualTrack = ref({
  patienceHearts: 3,
  brokenHearts: 0,
  persuasionTokens: 0,
  keywordStampsCount: 0,
  stampsList: [] as string[],
  baseAffinity: 1,
  totalPendingMod: 1
});

const pacingInfo = ref({
  phase: 'warmup',
  label: '铺垫破冰期',
  hint: '建议先表达对忙碌的理解，铺垫基础饮品需求，赚取筹码。'
});

const messages = ref<Array<{
  role: 'user' | 'assistant';
  content: string;
  evaluation?: any;
  tokenEarned?: boolean;
  heartBroken?: boolean;
}>>([]);

// 骰子模态框状态
const showDiceModal = ref(false);
const isRolling = ref(false);
const displayedRoll = ref(20);
const checkResult = ref<any>(null);
const checkEnding = ref<any>(null);

const emotionLabel = computed(() => {
  switch (currentEmotion.value) {
    case 'annoyed': return '不耐烦 💢';
    case 'pleased': return '专业赞许 ✨';
    case 'surprised': return '挑眉诧异 😲';
    default: return '外冷专注 ☕';
  }
});

function formatMod(val: number) {
  if (val > 0) return `+${val}`;
  return `${val}`;
}

function getModClass(val: number) {
  if (val > 0) return 'positive';
  if (val < 0) return 'negative';
  return 'neutral';
}

function isKeywordHit(word: string) {
  return dualTrack.value.stampsList.includes(word);
}

function insertKeyword(word: string) {
  if (isCompleted.value || dualTrack.value.patienceHearts === 0) return;
  if (!userInput.value.includes(word)) {
    userInput.value = userInput.value ? `${userInput.value} ${word}` : word;
  }
}

function getOutcomeBadge(type: string) {
  if (type === 'critical_success') return '🌟 CRITICAL SUCCESS (大成功)';
  if (type === 'reluctant_pass') return '🎲 DOG LUCK PASS (狗运涉险过关)';
  if (type === 'success') return '✅ SUCCESS (检定通过)';
  return '🔄 FAIL FORWARD (顺势推进)';
}

async function scrollToBottom() {
  await nextTick();
  if (chatViewportRef.value) {
    chatViewportRef.value.scrollTop = chatViewportRef.value.scrollHeight;
  }
}

// 初始化关卡数据
async function loadInitData() {
  loading.value = true;
  try {
    const res = await fetch('/api/avg-test/init');
    const json = await res.json();
    if (json.success) {
      scenarioData.value = json.data;
      currentRound.value = json.data.currentRound || 0;
      pacingInfo.value = json.data.pacing;
      dualTrack.value = json.data.dualTrack;
      isCompleted.value = json.data.status === 'completed';
      checkResult.value = json.data.checkResult;
      checkEnding.value = json.data.ending;
    }
  } catch (err) {
    console.error('加载剧本失败:', err);
  } finally {
    loading.value = false;
  }
}

// 发送用户对白
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || loading.value || isCompleted.value || dualTrack.value.patienceHearts === 0) return;

  userInput.value = '';
  messages.value.push({ role: 'user', content: text });
  loading.value = true;
  await scrollToBottom();

  try {
    const res = await fetch('/api/avg-test/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const json = await res.json();

    if (json.success && json.data) {
      currentEmotion.value = json.data.emotion || 'neutral';
      currentRound.value = json.data.currentRound;
      pacingInfo.value = json.data.pacing;
      dualTrack.value = json.data.dualTrack;

      // 附加对当前发言的评估与筹码/碎心事件
      const lastUserMsg = messages.value[messages.value.length - 1];
      if (lastUserMsg) {
        lastUserMsg.evaluation = json.data.evaluation;
        lastUserMsg.tokenEarned = json.data.eventTriggers?.tokenEarned;
        lastUserMsg.heartBroken = json.data.eventTriggers?.heartBroken;
      }

      // 添加 NPC 回复
      messages.value.push({
        role: 'assistant',
        content: json.data.npcReply
      });
    } else if (json.isCompleted) {
      isCompleted.value = true;
    }
  } catch (err) {
    console.error('对白请求失败:', err);
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
}

// 发起关键交涉检定
async function triggerClimaxCheck() {
  if (isCompleted.value) return;

  showDiceModal.value = true;
  isRolling.value = true;
  checkResult.value = null;
  checkEnding.value = null;

  // 骰子摇动视觉循环
  const interval = setInterval(() => {
    displayedRoll.value = Math.floor(Math.random() * 20) + 1;
  }, 70);

  try {
    const res = await fetch('/api/avg-test/resolve-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finalStatement: messages.value.length ? messages.value[messages.value.length - 1].content : ''
      })
    });
    const json = await res.json();

    setTimeout(() => {
      clearInterval(interval);
      if (json.success && json.data) {
        checkResult.value = json.data.checkResult;
        checkEnding.value = json.data.ending;
        displayedRoll.value = json.data.checkResult.baseRoll;
        isCompleted.value = true; // 关键：标记结案落锁
        if (json.data.ending.npcFinalEmotion) {
          currentEmotion.value = json.data.ending.npcFinalEmotion;
        }
      }
      isRolling.value = false;
    }, 1200);
  } catch (err) {
    clearInterval(interval);
    isRolling.value = false;
    console.error('检定失败:', err);
  }
}

// 结束弹窗并停留在复盘卡界面
function finishAndCloseModal() {
  showDiceModal.value = false;
  scrollToBottom();
}

// 重置会话
async function resetSession() {
  loading.value = true;
  try {
    await fetch('/api/avg-test/reset', { method: 'POST' });
    messages.value = [];
    currentEmotion.value = 'neutral';
    showDiceModal.value = false;
    isCompleted.value = false;
    checkResult.value = null;
    checkEnding.value = null;
    await loadInitData();
  } catch (err) {
    console.error('重置失败:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadInitData();
});
</script>

<style scoped>
.avg-test-page {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 顶部导航 */
.top-nav {
  height: 64px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.badge-tag {
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.nav-brand h1 {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}
.nav-status {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  background: #0f172a;
  border: 1px solid #334155;
}
.dc-pill {
  border-color: #f59e0b;
}
.dc-pill .val {
  color: #fbbf24;
  font-weight: 700;
}
.round-pill .val {
  color: #38bdf8;
  font-weight: 700;
}
.btn-ghost {
  background: transparent;
  border: 1px solid #475569;
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.btn-ghost:hover {
  background: #334155;
  color: #fff;
}

/* 主布局 */
.main-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  padding: 20px 24px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* 左侧栏 */
.npc-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.npc-card {
  background: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  padding: 16px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  transition: border-color 0.3s;
}
.npc-card.annoyed {
  border-color: #ef4444;
}
.npc-card.pleased {
  border-color: #10b981;
}
.avatar-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  border: 2px solid #475569;
  transition: all 0.3s;
}
.avatar-placeholder.annoyed {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}
.avatar-placeholder.pleased {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}
.emotion-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #0f172a;
  color: #94a3b8;
  font-weight: 600;
}
.emotion-badge.annoyed {
  color: #f87171;
  border: 1px solid #ef4444;
}
.emotion-badge.pleased {
  color: #34d399;
  border: 1px solid #10b981;
}
.npc-info h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: #f8fafc;
}
.npc-title {
  font-size: 12px;
  color: #94a3b8;
}
.npc-persona {
  font-size: 12px;
  color: #cbd5e1;
  margin: 6px 0 0 0;
  line-height: 1.4;
}

/* 双轨指示器卡片 */
.tracker-card {
  background: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  padding: 14px;
}
.patience-card.crisis-alert {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  animation: pulseGlow 1.5s infinite;
}
.heart-status-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: auto;
}
.heart-status-tag.safe { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.heart-status-tag.danger { background: rgba(239, 68, 68, 0.2); color: #f87171; }

.hearts-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  font-size: 32px;
  padding: 8px 0;
}
.heart-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  transition: transform 0.2s;
}
.heart-icon.broken {
  opacity: 0.4;
  filter: grayscale(1);
}
.tracker-sub {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
}
.text-danger {
  color: #f87171 !important;
  font-weight: 700;
}

/* 筹码与印章卡片 */
.token-slot-row {
  background: #0f172a;
  border: 1px solid #334155;
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.slot-label span {
  font-size: 12px;
  color: #cbd5e1;
  display: block;
}
.slot-label small {
  font-size: 10px;
  color: #64748b;
}
.slots {
  display: flex;
  gap: 6px;
  font-size: 20px;
}
.coin-badge, .stamp-badge {
  opacity: 0.3;
  transition: all 0.3s;
}
.coin-badge.active, .stamp-badge.active {
  opacity: 1;
  transform: scale(1.1);
  filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.6));
}

/* 明牌总修正结算条 */
.total-calc-bar {
  margin-top: 10px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.calc-formula {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  gap: 6px;
}
.calc-formula .text-sub {
  color: #f87171;
}
.calc-result {
  text-align: right;
}
.calc-result small {
  font-size: 10px;
  color: #64748b;
  display: block;
}
.calc-result strong {
  font-size: 16px;
}
.text-positive {
  color: #34d399;
}

/* 戏剧动机卡 */
.context-card {
  background: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  padding: 14px;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.card-header h3 {
  font-size: 13px;
  font-weight: 700;
  color: #cbd5e1;
  margin: 0;
}
.context-item {
  margin-bottom: 8px;
}
.context-item:last-child {
  margin-bottom: 0;
}
.context-item .label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  display: block;
}
.context-item p {
  font-size: 12px;
  margin: 2px 0 0 0;
  line-height: 1.4;
  color: #cbd5e1;
}
.mood-highlight {
  color: #f87171 !important;
}
.soft-spot {
  color: #38bdf8 !important;
}

/* 右侧舞台 */
.stage-section {
  display: flex;
  flex-direction: column;
  background: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  overflow: hidden;
  height: calc(100vh - 104px);
}
.objective-banner {
  background: #0f172a;
  padding: 10px 16px;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.target-flag {
  background: #f59e0b;
  color: #000;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.objective-banner p {
  margin: 0;
  font-size: 13px;
  color: #e2e8f0;
  flex: 1;
}
.pacing-pill {
  padding: 4px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  border: 1px solid transparent;
}
.pacing-pill.warmup {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #60a5fa;
}
.pacing-pill.prime {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #34d399;
  animation: pulseGlow 1.5s infinite;
}
.pacing-pill.urgent {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #f87171;
}
.pacing-pill.crisis {
  background: #ef4444;
  color: #fff;
  font-weight: 700;
  animation: pulseGlow 0.8s infinite;
}
@keyframes pulseGlow {
  0% { opacity: 0.8; }
  50% { opacity: 1; filter: brightness(1.2); }
  100% { opacity: 0.8; }
}

/* 对话流 */
.chat-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.chat-row {
  display: flex;
}
.npc-row {
  justify-content: flex-start;
}
.user-row {
  justify-content: flex-end;
}
.bubble {
  max-width: 75%;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
}
.npc-bubble {
  background: #334155;
  border-bottom-left-radius: 2px;
  color: #f8fafc;
}
.user-bubble {
  background: #2563eb;
  border-bottom-right-radius: 2px;
  color: #fff;
}
.speaker {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.7;
  display: block;
  margin-bottom: 4px;
}
.speech-text {
  margin: 0;
}

/* 语言即时评价卡 */
.eval-card {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 12px;
}
.eval-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.chip {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
}
.chip.token-chip {
  background: #f59e0b;
  color: #000;
  font-weight: 800;
}
.chip.heart-chip {
  background: #ef4444;
  color: #fff;
  font-weight: 800;
}
.chip.positive {
  background: #10b981;
  color: #fff;
}
.chip.negative {
  background: #ef4444;
  color: #fff;
}
.chip.hit-chip {
  background: #0ea5e9;
  color: #fff;
}
.polish-tip {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 6px 10px;
  margin-top: 6px;
}
.polish-kicker {
  color: #cbd5e1;
  font-size: 11px;
  display: block;
}
.polish-tip strong {
  color: #fbbf24;
  display: block;
  margin: 2px 0;
}
.polish-tip p {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
}

/* 结算归档卡片 */
.settlement-stage-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  margin-top: 12px;
}
.settlement-stage-card.critical_success {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}
.settlement-stage-card.reluctant_pass {
  border-color: #f97316;
  background: rgba(249, 115, 22, 0.08);
}
.settlement-stage-card.success {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}
.settlement-stage-card.fail_forward {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}
.settlement-kicker {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.settlement-header h3 {
  margin: 4px 0 10px 0;
  font-size: 18px;
  color: #f8fafc;
}
.settlement-story {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: 14px;
}
.settlement-quote {
  background: rgba(0, 0, 0, 0.3);
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 14px;
  border-left: 3px solid #f59e0b;
}
.speaker-tag {
  font-size: 11px;
  color: #94a3b8;
  display: block;
}
.settlement-quote p {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: #fbbf24;
  font-style: italic;
}
.settlement-takeaway {
  background: rgba(59, 130, 246, 0.1);
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.takeaway-title {
  font-size: 12px;
  font-weight: 700;
  color: #60a5fa;
  display: block;
}
.settlement-takeaway p {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.5;
}
.settlement-actions {
  display: flex;
  justify-content: flex-end;
}

/* 关键词支架 */
.keywords-bar {
  background: #131d2e;
  padding: 8px 16px;
  border-top: 1px solid #334155;
  display: flex;
  align-items: center;
  gap: 10px;
}
.kw-label {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}
.kw-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.kw-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  gap: 6px;
  align-items: center;
  transition: all 0.2s;
}
.kw-btn:hover {
  border-color: #3b82f6;
  background: #2563eb;
}
.kw-btn.hit {
  border-color: #0ea5e9;
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
}
.stamp-mark {
  font-size: 10px;
  font-weight: 700;
  color: #38bdf8;
}

/* 输入栏 */
.input-panel {
  background: #0f172a;
  padding: 14px 16px;
  border-top: 1px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.input-row {
  display: flex;
  gap: 10px;
}
.input-row textarea {
  flex: 1;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #fff;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  outline: none;
}
.input-row textarea:focus {
  border-color: #3b82f6;
}
.btn-send {
  background: #3b82f6;
  border: none;
  color: #fff;
  font-weight: 700;
  padding: 0 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-send:hover:not(:disabled) {
  background: #2563eb;
}
.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 决胜检定触发条 */
.climax-action-bar {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.climax-action-bar.highlight-pulse {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
}
.climax-action-bar.crisis-pulse {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}
.climax-info span {
  font-size: 13px;
  color: #fbbf24;
  display: block;
}
.climax-info small {
  font-size: 11px;
  color: #94a3b8;
}
.btn-climax {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  color: #000;
  font-weight: 800;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
  transition: transform 0.1s, box-shadow 0.2s;
}
.btn-climax:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.6);
}

/* 结案锁定面板 */
.completed-lock-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1e293b;
  border: 1px solid #475569;
  padding: 12px 16px;
  border-radius: 8px;
}
.lock-icon {
  font-size: 24px;
  margin-right: 12px;
}
.lock-text strong {
  color: #f8fafc;
  font-size: 14px;
  display: block;
}
.lock-text p {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #94a3b8;
}

/* 弹窗遮罩 */
.dice-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.dice-modal-content {
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}
.modal-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #f8fafc;
}
.modal-header p {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.dice-arena {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}
.dice-cube {
  width: 90px;
  height: 90px;
  background: #f59e0b;
  color: #000;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  font-weight: 900;
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.4);
  transform-origin: center;
}
.dice-cube.rolling {
  animation: diceRoll 0.2s infinite;
}
@keyframes diceRoll {
  0% { transform: rotate(0deg) scale(0.95); }
  50% { transform: rotate(180deg) scale(1.05); }
  100% { transform: rotate(360deg) scale(0.95); }
}
.dice-status-text {
  margin-top: 12px;
  font-size: 13px;
  color: #cbd5e1;
  font-weight: 600;
}

.breakdown-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 16px;
}
.breakdown-card h3 {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #94a3b8;
}
.calc-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  text-align: center;
}
.calc-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.calc-col .sub {
  font-size: 10px;
  color: #64748b;
}
.calc-col strong {
  font-size: 15px;
  color: #f8fafc;
}
.calc-row .op {
  font-size: 14px;
  color: #64748b;
}
.total-col strong {
  font-size: 20px;
}
.text-pass {
  color: #34d399;
}
.text-fail {
  color: #f87171;
}

.outcome-card {
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #334155;
}
.outcome-card.critical_success {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
}
.outcome-card.reluctant_pass {
  background: rgba(249, 115, 22, 0.12);
  border-color: #f97316;
}
.outcome-card.success {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}
.outcome-card.fail_forward {
  background: rgba(245, 158, 11, 0.1);
  border-color: #f59e0b;
}
.outcome-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 6px;
}
.critical_success .outcome-badge { background: #10b981; color: #fff; }
.reluctant_pass .outcome-badge { background: #f97316; color: #fff; }
.success .outcome-badge { background: #3b82f6; color: #fff; }
.fail_forward .outcome-badge { background: #f59e0b; color: #000; }

.outcome-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  color: #f8fafc;
}
.story-desc {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
  margin: 0 0 12px 0;
}
.npc-final-quote {
  background: rgba(0, 0, 0, 0.25);
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 10px;
}
.quote-speaker {
  font-size: 11px;
  color: #94a3b8;
  display: block;
}
.npc-final-quote p {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: #fbbf24;
  font-style: italic;
}
.takeaway-box {
  background: rgba(59, 130, 246, 0.1);
  padding: 10px 12px;
  border-radius: 8px;
}
.box-title {
  font-size: 11px;
  font-weight: 700;
  color: #60a5fa;
  display: block;
}
.takeaway-box p {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #cbd5e1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn-primary {
  background: #3b82f6;
  border: none;
  color: #fff;
  padding: 8px 18px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary:hover {
  background: #2563eb;
}
</style>

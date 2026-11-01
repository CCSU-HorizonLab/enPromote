<template>
  <div class="avg-test-page">
    <!-- 顶部状态栏 -->
    <header class="top-nav">
      <div class="nav-brand">
        <span class="badge-tag">AVG 语用沙盘 · 确定性天平版</span>
        <h1>{{ scenarioData?.title || '正在加载剧本...' }}</h1>
      </div>
      <div class="nav-status" v-if="scenarioData">
        <div class="status-pill score-pill" :class="getScoreClass(liveScore)">
          <span class="label">社交折服度</span>
          <span class="val">{{ liveScore }} / 100</span>
        </div>
        <div class="status-pill round-pill">
          <span class="label">交互轮次</span>
          <span class="val">{{ currentRound }} 轮</span>
        </div>
        <button class="btn-ghost" @click="showDossierModal = true">
          📁 机密情报
        </button>
        <button class="btn-ghost" @click="resetSession" :disabled="loading">
          🔄 重新挑战
        </button>
      </div>
    </header>

    <main class="main-layout" v-if="scenarioData">
      <!-- 左栏：NPC 人设与确定性天平状态 -->
      <aside class="npc-sidebar">
        <!-- 角色立绘与情绪卡 -->
        <div class="npc-card" :class="currentEmotion">
          <div class="avatar-box">
            <div class="avatar-placeholder" :class="currentEmotion">
              <span class="avatar-icon">{{ npcIcon }}</span>
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

        <!-- 确定性社交破防天平 (Rapport Scale Meter) -->
        <div class="tracker-card meter-card">
          <div class="card-header">
            <span class="icon">⚖️</span>
            <h3>社交破防天平 (Rapport Meter)</h3>
            <span class="meter-status-tag" :class="getScoreClass(liveScore)">
              {{ getScoreTitle(liveScore) }}
            </span>
          </div>

          <!-- 刻度能量进度条 -->
          <div class="meter-bar-container">
            <div class="meter-bar-track">
              <div
                class="meter-bar-fill"
                :style="{ width: `${liveScore}%` }"
                :class="getScoreClass(liveScore)"
              ></div>
              <!-- 达标及格线 (65分) 与 高光升房线 (85分) -->
              <div class="marker marker-standard" title="65分及格线 (标准间入住)">
                <span class="marker-label">65 (及格)</span>
              </div>
              <div class="marker marker-penthouse" title="85分高光线 (行政套房升级)">
                <span class="marker-label">85 (升房)</span>
              </div>
            </div>
            <div class="meter-score-text">
              <span class="current-score">{{ liveScore }}</span>
              <span class="total-score">/ 100 实时折服度</span>
            </div>
          </div>

          <!-- 客观得分要素进度盘 -->
          <div class="rubric-breakdown">
            <div class="rubric-item" :class="{ achieved: factsVerified.includes('hasNameStated') }">
              <span class="r-dot">{{ factsVerified.includes('hasNameStated') ? '✅' : '⚪' }}</span>
              <span class="r-text">姓名身份核对 (+20)</span>
            </div>
            <div class="rubric-item" :class="{ achieved: factsVerified.includes('hasProofProvided') }">
              <span class="r-dot">{{ factsVerified.includes('hasProofProvided') ? '✅' : '⚪' }}</span>
              <span class="r-text">凭证/护照出示 (+20)</span>
            </div>
            <div class="rubric-item" :class="{ achieved: weaponsHit.length >= 1 }">
              <span class="r-dot">{{ weaponsHit.length >= 1 ? '🎯' : '⚪' }}</span>
              <span class="r-text">高级词块命中 ({{ Math.min(30, weaponsHit.length * 10) }}/30)</span>
            </div>
          </div>
        </div>

        <!-- 剧情情境动机 (Dramatic Context) -->
        <div class="context-card">
          <div class="card-header">
            <span class="icon">🎭</span>
            <h3>当前情境动机 (Context)</h3>
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
        <!-- 关卡通关目标条与阶段节奏提示 (防一回杀节奏锁) -->
        <div class="objective-banner">
          <div class="target-flag">🎯 任务目标</div>
          <p>{{ scenarioData.objectiveDescription }}</p>
          <div class="pacing-pill" :class="pacingInfo.phase" v-if="!isCompleted">
            <span class="pacing-badge">{{ pacingInfo.label }}</span>
            <span class="pacing-hint">{{ pacingInfo.hint }}</span>
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

              <!-- 极简游戏动态浮标标签 (拒绝大段垃圾语法弹窗) -->
              <div v-if="msg.evaluation" class="eval-card">
                <div class="eval-chips">
                  <span class="chip dynamic-chip" :class="msg.evaluation.dynamicTag?.includes('⚠️') ? 'chip-danger' : 'chip-success'">
                    {{ msg.evaluation.dynamicTag || '⚡ 得体回应' }}
                  </span>
                  <span class="chip tone-chip">
                    🎩 礼貌修养: {{ msg.evaluation.toneScore }}/30 ({{ msg.evaluation.toneFeedback }})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 正在思考指示 -->
          <div v-if="loading" class="chat-row npc-row">
            <div class="bubble npc-bubble thinking-bubble">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="thinking-text">{{ scenarioData.npc.name }} 正在核对终端与审视你的回答...</span>
            </div>
          </div>

          <!-- 结案真实消费小票卡片 (Receipt Card) -->
          <div v-if="isCompleted && settlementData" class="receipt-stage-card" :class="settlementData.outcome">
            <div class="receipt-header">
              <div class="receipt-brand">
                <span class="hotel-emblem">🏰</span>
                <h4>THE ROYAL GARDEN HOTEL</h4>
                <small>LONDON · NIGHT AUDIT NEGOTIATION RECEIPT</small>
              </div>
              <div class="receipt-stars">
                <span v-for="s in 3" :key="s" class="star" :class="{ active: s <= settlementData.stars }">
                  ★
                </span>
                <span class="stars-label">{{ settlementData.stars }} 星评级</span>
              </div>
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-outcome">
              <h3>{{ settlementData.title }}</h3>
              <p class="story-desc">{{ settlementData.storyText }}</p>
            </div>

            <div class="receipt-quote">
              <span class="quote-label">{{ scenarioData.npc.name }} 的结案表态：</span>
              <p>"{{ settlementData.npcFinalReply }}"</p>
            </div>

            <!-- 客观明牌小票得分明细 -->
            <div class="receipt-breakdown">
              <div class="breakdown-title">📊 社交天平实战得分账本 (100% 实力归因)</div>
              <div class="breakdown-grid">
                <div class="b-row">
                  <span>事实信息核验：</span>
                  <strong>+{{ settlementData.scoreBreakdown.factClarityScore }} 分</strong>
                </div>
                <div class="b-row">
                  <span>高级场景词块：</span>
                  <strong>+{{ settlementData.scoreBreakdown.targetChunksScore }} 分</strong>
                </div>
                <div class="b-row">
                  <span>英伦绅士礼仪：</span>
                  <strong>+{{ settlementData.scoreBreakdown.toneScore }} 分</strong>
                </div>
                <div class="b-row penalty-row" v-if="settlementData.scoreBreakdown.deductions > 0">
                  <span>违规/冒犯扣减：</span>
                  <strong>-{{ settlementData.scoreBreakdown.deductions }} 分</strong>
                </div>
                <div class="b-row total-row">
                  <span>最终总折服度：</span>
                  <strong class="highlight-score">{{ settlementData.finalScore }} / 100</strong>
                </div>
              </div>
            </div>

            <!-- 本局唯一带走金句 (One Key Takeaway) -->
            <div class="receipt-takeaway" v-if="settlementData.oneKeyTakeaway">
              <div class="takeaway-head">
                <span class="takeaway-icon">🎯</span>
                <strong>本局破局金句 (One Key Takeaway)</strong>
              </div>
              <p class="takeaway-sentence">"{{ settlementData.oneKeyTakeaway.nativeSentence }}"</p>
              <p class="takeaway-note">{{ settlementData.oneKeyTakeaway.usageNote }}</p>
              <button class="btn-deck-sync" @click="handleSyncDeck" :disabled="isSynced">
                {{ isSynced ? '✅ 已沉淀同步至模块 A 复习词库' : '🎙️ 跟读挑战并同步入库' }}
              </button>
            </div>

            <div class="receipt-actions">
              <button class="btn-primary" @click="resetSession">🔄 再次演练本场景</button>
            </div>
          </div>
        </div>

        <!-- 战术武器库抽屉 (新手拐杖：点击拼装骨架，彻底消灭失语症) -->
        <div class="weapons-bar" v-if="!isCompleted">
          <div class="weapons-title">
            <span>🎒 战术武器库（点击碎片直接填入骨架，杜绝失语）：</span>
          </div>
          <div class="weapon-chips">
            <button
              v-for="w in scenarioData.inventoryWeapons"
              :key="w.phrase"
              class="weapon-btn"
              :class="{
                hit: weaponsHit.includes(w.phrase),
                locked: w.phase === 2 && pacingInfo.phase === 'phase1'
              }"
              @click="handleUseWeapon(w)"
            >
              <div class="wp-top">
                <strong>{{ w.phrase }}</strong>
                <span v-if="weaponsHit.includes(w.phrase)" class="tag-used">🎯 已使用</span>
                <span v-else-if="w.phase === 2 && pacingInfo.phase === 'phase1'" class="tag-lock">🔒 阶段二解锁</span>
              </div>
              <small>{{ w.meaning }}</small>
            </button>
          </div>
        </div>

        <!-- 输入交互栏 -->
        <div class="input-panel">
          <template v-if="!isCompleted">
            <div class="input-row">
              <textarea
                v-model="userInput"
                placeholder="用英语和 Arthur 经理交涉（例如：Good evening. I have a reservation under the name of Alex...）"
                rows="2"
                @keydown.enter.prevent="sendMessage"
                :disabled="loading || isResolving"
              ></textarea>
              <div class="action-buttons">
                <button
                  class="btn-send"
                  @click="sendMessage"
                  :disabled="!userInput.trim() || loading || isResolving"
                >
                  发送对白 ↵
                </button>
                <button
                  v-if="currentRound >= 1"
                  class="btn-resolve"
                  @click="resolveNegotiation"
                  :disabled="loading || isResolving"
                >
                  ⚖️ 结案小票
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="completed-lock-panel">
              <span class="lock-icon">🔒</span>
              <div class="lock-text">
                <strong>本次酒店交涉已结案落幕！</strong>
                <p>已生成真实结案账单与学情金句。点击“重新挑战”即可尝试不同对话策略！</p>
              </div>
              <button class="btn-primary" @click="resetSession">🔄 再次挑战</button>
            </div>
          </template>
        </div>
      </section>
    </main>

    <!-- 特工机密简报弹窗 (Mission Dossier Modal) -->
    <div v-if="showDossierModal && scenarioData" class="dossier-modal-overlay">
      <div class="dossier-card">
        <div class="dossier-header">
          <span class="kicker">📁 TOP SECRET // MISSION DOSSIER</span>
          <h2>{{ scenarioData.title }}</h2>
          <span class="location-tag">📍 {{ scenarioData.sceneVisual.sceneName }}</span>
        </div>
        <div class="dossier-body">
          <div class="dossier-section">
            <h4>🎯 核心任务目标 (Mission Objective)</h4>
            <p>{{ scenarioData.objectiveDescription }}</p>
          </div>
          <div class="dossier-section">
            <h4>👤 交涉目标弱点情报 (Target Intel: {{ scenarioData.npc.name }})</h4>
            <p><strong>当前心境：</strong>{{ scenarioData.dramaticContext.currentMentalState }}</p>
            <p class="highlight-p"><strong>隐藏软肋：</strong>{{ scenarioData.dramaticContext.hiddenSoftSpot }}</p>
          </div>
          <div class="dossier-section">
            <h4>🎒 战术武器库预览 (Tactical Weapons)</h4>
            <div class="dossier-weapons-list">
              <div v-for="w in scenarioData.inventoryWeapons" :key="w.phrase" class="dossier-wp-item">
                <code>{{ w.phrase }}</code>
                <span>{{ w.meaning }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="dossier-footer">
          <button class="btn-primary" @click="showDossierModal = false">
            🔥 接受任务，步入酒店大堂
          </button>
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
const isResolving = ref(false);
const isCompleted = ref(false);
const isSynced = ref(false);
const showDossierModal = ref(false);
const chatViewportRef = ref<HTMLElement | null>(null);

// 确定性天平状态
const liveScore = ref(15);
const factsVerified = ref<string[]>([]);
const weaponsHit = ref<string[]>([]);
const settlementData = ref<any>(null);

const pacingInfo = ref({
  phase: 'phase1',
  label: 'Phase 1: 核实破冰期',
  hint: '⚠️ Arthur 正在查验身份。请先礼貌报出预订姓名与证件/订单号，切勿直接要求升房！'
});

const messages = ref<Array<{
  role: 'user' | 'assistant';
  content: string;
  evaluation?: any;
}>>([]);

const npcIcon = computed(() => {
  if (scenarioData.value?.npc?.npcId === 'arthur') return '👔';
  return '👩‍🍳';
});

const emotionLabel = computed(() => {
  switch (currentEmotion.value) {
    case 'skeptical': return '挑眉审视 🤨';
    case 'annoyed': return '眉头微皱 💢';
    case 'pleased': return '优雅欠身 🎩';
    default: return '一丝不苟 👔';
  }
});

function getScoreClass(score: number) {
  if (score >= 85) return 'score-penthouse';
  if (score >= 65) return 'score-standard';
  return 'score-risk';
}

function getScoreTitle(score: number) {
  if (score >= 85) return '折服升房 (85~100)';
  if (score >= 65) return '标准达标 (65~84)';
  return '濒临拒单 (<65)';
}

async function scrollToBottom() {
  await nextTick();
  if (chatViewportRef.value) {
    chatViewportRef.value.scrollTop = chatViewportRef.value.scrollHeight;
  }
}

// 战术武器点击事件：将半成品脚手架骨架直接填入输入框
function handleUseWeapon(w: any) {
  if (isCompleted.value) return;
  const scaffoldText = w.scaffold || w.phrase;
  if (!userInput.value.includes(scaffoldText)) {
    userInput.value = userInput.value ? `${userInput.value} ${scaffoldText}` : scaffoldText;
  }
}

// 模拟一键跟读入库 (暗度陈仓回流模块 A)
function handleSyncDeck() {
  isSynced.value = true;
  alert('🎉 恭喜！本局破局金句已成功同步沉淀至【模块 A：明日复习计划】！');
}

// 初始化关卡数据
async function loadInitData() {
  loading.value = true;
  try {
    const res = await fetch('/api/avg-test/init');
    const json = await res.json();
    if (json.success && json.data) {
      scenarioData.value = json.data;
      currentRound.value = json.data.currentRound || 0;
      liveScore.value = json.data.liveScore || 15;
      pacingInfo.value = json.data.pacing;
      factsVerified.value = json.data.factsVerified || [];
      weaponsHit.value = json.data.weaponsHit || [];
      isCompleted.value = json.data.status === 'completed';
      settlementData.value = json.data.settlement;
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
  if (!text || loading.value || isCompleted.value) return;

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
      currentRound.value = json.data.currentRound;
      liveScore.value = json.data.liveScore;
      currentEmotion.value = json.data.emotion;
      pacingInfo.value = json.data.pacing;
      factsVerified.value = json.data.factsVerified || [];
      weaponsHit.value = json.data.weaponsHit || [];

      // 给上一条用户对白打上动态浮标标签
      const lastUserMsg = messages.value[messages.value.length - 1];
      if (lastUserMsg) {
        lastUserMsg.evaluation = json.data.evaluation;
      }

      // 添加 NPC 回应
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

// 发起结案结算 (打印小票，彻底取消 D20 骰子)
async function resolveNegotiation() {
  if (isCompleted.value || isResolving.value) return;

  isResolving.value = true;
  loading.value = true;

  try {
    const res = await fetch('/api/avg-test/resolve-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finalStatement: messages.value.length ? messages.value[messages.value.length - 1].content : ''
      })
    });
    const json = await res.json();

    if (json.success && json.data) {
      settlementData.value = json.data.settlement;
      liveScore.value = json.data.settlement.finalScore;
      isCompleted.value = true;
      if (json.data.settlement.npcFinalEmotion) {
        currentEmotion.value = json.data.settlement.npcFinalEmotion;
      }
    }
  } catch (err) {
    console.error('结案结算失败:', err);
  } finally {
    isResolving.value = false;
    loading.value = false;
    await scrollToBottom();
  }
}

// 重置会话
async function resetSession() {
  loading.value = true;
  try {
    await fetch('/api/avg-test/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'default' })
    });
    userInput.value = '';
    messages.value = [];
    currentEmotion.value = 'neutral';
    isCompleted.value = false;
    isSynced.value = false;
    settlementData.value = null;
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
  background: #090e17;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 顶部状态栏 */
.top-nav {
  height: 60px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.badge-tag {
  background: #1e3a5f;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
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
  background: #1e293b;
  padding: 4px 12px;
  border-radius: 20px;
  display: flex;
  gap: 6px;
  font-size: 13px;
}
.status-pill .label {
  color: #94a3b8;
}
.status-pill .val {
  font-weight: 700;
  color: #38bdf8;
}
.score-pill.score-penthouse .val { color: #10b981; }
.score-pill.score-standard .val { color: #38bdf8; }
.score-pill.score-risk .val { color: #f59e0b; }

.btn-ghost {
  background: transparent;
  border: 1px solid #334155;
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.btn-ghost:hover {
  background: #1e293b;
  border-color: #64748b;
}

/* 主体布局 */
.main-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 360px 1fr;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  gap: 20px;
  box-sizing: border-box;
}

/* 左侧栏 */
.npc-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.npc-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 16px;
  align-items: center;
}
.avatar-box {
  position: relative;
}
.avatar-placeholder {
  width: 72px;
  height: 72px;
  background: #1e3a5f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #38bdf8;
}
.avatar-placeholder.skeptical { border-color: #f59e0b; }
.avatar-placeholder.annoyed { border-color: #ef4444; }
.avatar-placeholder.pleased { border-color: #10b981; }

.avatar-icon {
  font-size: 32px;
}
.emotion-badge {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: #0284c7;
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  white-space: nowrap;
}
.npc-info h2 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #f8fafc;
}
.npc-title {
  font-size: 11px;
  color: #38bdf8;
  display: block;
  margin-bottom: 6px;
}
.npc-persona {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
  margin: 0;
}

/* 确定性破防天平卡片 */
.tracker-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-header h3 {
  font-size: 13px;
  margin: 0;
  color: #cbd5e1;
  flex: 1;
  margin-left: 6px;
}
.meter-status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
}
.meter-status-tag.score-penthouse { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.meter-status-tag.score-standard { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
.meter-status-tag.score-risk { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }

.meter-bar-container {
  margin-bottom: 14px;
}
.meter-bar-track {
  height: 16px;
  background: #1e293b;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  margin-bottom: 6px;
}
.meter-bar-fill {
  height: 100%;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.meter-bar-fill.score-penthouse { background: linear-gradient(90deg, #10b981, #34d399); }
.meter-bar-fill.score-standard { background: linear-gradient(90deg, #0284c7, #38bdf8); }
.meter-bar-fill.score-risk { background: linear-gradient(90deg, #d97706, #fbbf24); }

.marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.4);
}
.marker-standard { left: 65%; }
.marker-penthouse { left: 85%; }
.marker-label {
  position: absolute;
  top: -18px;
  transform: translateX(-50%);
  font-size: 9px;
  color: #64748b;
}

.meter-score-text {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.current-score {
  font-size: 24px;
  font-weight: 800;
  color: #f8fafc;
}
.total-score {
  font-size: 11px;
  color: #64748b;
}

.rubric-breakdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px dashed #1e293b;
  padding-top: 10px;
}
.rubric-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}
.rubric-item.achieved {
  color: #38bdf8;
  font-weight: 600;
}

/* 情境卡片 */
.context-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
}
.context-item {
  margin-bottom: 10px;
  font-size: 12px;
}
.context-item .label {
  color: #64748b;
  display: block;
  margin-bottom: 2px;
}
.context-item p {
  margin: 0;
  color: #94a3b8;
  line-height: 1.4;
}
.soft-spot {
  color: #f59e0b !important;
}

/* 右栏：舞台 */
.stage-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 100px);
}

.objective-banner {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.target-flag {
  background: #1e3a5f;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.objective-banner p {
  margin: 0;
  font-size: 13px;
  color: #cbd5e1;
  flex: 1;
}
.pacing-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  padding: 4px 10px;
  border-radius: 6px;
}
.pacing-badge {
  font-size: 11px;
  font-weight: 700;
  color: #f59e0b;
}
.pacing-hint {
  font-size: 11px;
  color: #94a3b8;
}

/* 对话视窗 */
.chat-viewport {
  flex: 1;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.chat-row {
  display: flex;
}
.npc-row { justify-content: flex-start; }
.user-row { justify-content: flex-end; }

.bubble {
  max-width: 75%;
  border-radius: 12px;
  padding: 12px 16px;
}
.npc-bubble {
  background: #1e293b;
  border: 1px solid #334155;
}
.user-bubble {
  background: #1e3a5f;
  border: 1px solid #0284c7;
}
.speaker {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  display: block;
  margin-bottom: 4px;
}
.speech-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #f8fafc;
}

.eval-card {
  margin-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  padding-top: 6px;
}
.eval-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}
.chip-success { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.chip-danger { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.tone-chip { background: #0f172a; color: #94a3b8; border: 1px solid #334155; }

/* 结案账单小票卡片 */
.receipt-stage-card {
  background: #090e17;
  border: 2px dashed #38bdf8;
  border-radius: 12px;
  padding: 24px;
  margin-top: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
}
.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.receipt-brand h4 {
  margin: 4px 0 2px 0;
  color: #f8fafc;
  letter-spacing: 1px;
}
.receipt-brand small {
  color: #64748b;
  font-size: 10px;
}
.receipt-stars {
  display: flex;
  align-items: center;
  gap: 4px;
}
.star {
  font-size: 20px;
  color: #334155;
}
.star.active {
  color: #f59e0b;
}
.stars-label {
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 700;
  margin-left: 6px;
}
.receipt-divider {
  border-bottom: 1px dashed #1e293b;
  margin: 16px 0;
}
.receipt-outcome h3 {
  margin: 0 0 8px 0;
  color: #38bdf8;
  font-size: 18px;
}
.story-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
}
.receipt-quote {
  background: #0f172a;
  border-left: 3px solid #38bdf8;
  padding: 10px 14px;
  border-radius: 4px;
  margin: 16px 0;
}
.quote-label {
  font-size: 11px;
  color: #64748b;
  display: block;
  margin-bottom: 4px;
}
.receipt-quote p {
  margin: 0;
  font-style: italic;
  color: #e2e8f0;
}

.receipt-breakdown {
  background: #0f172a;
  border-radius: 8px;
  padding: 14px;
  margin: 16px 0;
}
.breakdown-title {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
  margin-bottom: 8px;
}
.breakdown-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.b-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #94a3b8;
}
.b-row.total-row {
  border-top: 1px dashed #334155;
  padding-top: 6px;
  margin-top: 4px;
}
.highlight-score {
  font-size: 16px;
  color: #10b981;
}

.receipt-takeaway {
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 16px;
}
.takeaway-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #38bdf8;
  font-size: 13px;
  margin-bottom: 6px;
}
.takeaway-sentence {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 6px 0;
}
.takeaway-note {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
  margin: 0 0 10px 0;
}
.btn-deck-sync {
  background: #0284c7;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-deck-sync:disabled {
  background: #10b981;
  cursor: default;
}

/* 战术武器库抽屉 */
.weapons-bar {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 10px 14px;
}
.weapons-title {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 8px;
}
.weapon-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.weapon-btn {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: all 0.2s;
}
.weapon-btn:hover:not(.locked) {
  border-color: #38bdf8;
  background: #1e3a5f;
}
.weapon-btn.hit {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}
.weapon-btn.locked {
  opacity: 0.5;
  cursor: not-allowed;
}
.wp-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wp-top strong {
  font-size: 12px;
  color: #f8fafc;
}
.tag-used {
  font-size: 9px;
  background: #10b981;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
}
.tag-lock {
  font-size: 9px;
  background: #475569;
  color: #cbd5e1;
  padding: 1px 4px;
  border-radius: 3px;
}
.weapon-btn small {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

/* 输入控制栏 */
.input-panel {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 12px;
}
.input-row {
  display: flex;
  gap: 12px;
}
.input-row textarea {
  flex: 1;
  background: #090e17;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px 14px;
  color: #f8fafc;
  font-size: 14px;
  resize: none;
}
.input-row textarea:focus {
  outline: none;
  border-color: #38bdf8;
}
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.btn-send {
  background: #0284c7;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn-send:hover { background: #0369a1; }
.btn-send:disabled { background: #334155; cursor: not-allowed; }

.btn-resolve {
  background: #1e293b;
  border: 1px solid #f59e0b;
  color: #f59e0b;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn-resolve:hover { background: rgba(245, 158, 11, 0.1); }

.completed-lock-panel {
  display: flex;
  align-items: center;
  gap: 16px;
}
.lock-icon { font-size: 24px; }
.lock-text strong { color: #38bdf8; }
.lock-text p { margin: 2px 0 0 0; font-size: 12px; color: #94a3b8; }
.btn-primary {
  background: #0284c7;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

/* 机密简报弹窗 */
.dossier-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.dossier-card {
  background: #090e17;
  border: 1px solid #38bdf8;
  border-radius: 12px;
  max-width: 580px;
  width: 90%;
  padding: 24px;
}
.dossier-header .kicker {
  font-size: 10px;
  font-weight: 800;
  color: #38bdf8;
  letter-spacing: 1px;
}
.dossier-header h2 {
  margin: 4px 0;
  color: #f8fafc;
}
.location-tag {
  font-size: 12px;
  color: #94a3b8;
  display: block;
  margin-bottom: 16px;
}
.dossier-section {
  margin-bottom: 14px;
  font-size: 13px;
}
.dossier-section h4 {
  margin: 0 0 4px 0;
  color: #cbd5e1;
}
.dossier-section p {
  margin: 0;
  color: #94a3b8;
  line-height: 1.4;
}
.highlight-p {
  color: #f59e0b !important;
  margin-top: 4px !important;
}
.dossier-weapons-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}
.dossier-wp-item {
  display: flex;
  gap: 10px;
  font-size: 12px;
}
.dossier-wp-item code {
  color: #38bdf8;
  background: #0f172a;
  padding: 1px 6px;
  border-radius: 4px;
}
.dossier-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>

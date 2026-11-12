<template>
  <div class="avg-test-page">
    <!-- 顶部状态栏 -->
    <header class="top-nav">
      <div class="nav-brand">
        <span class="badge-tag">AVG 语用沙盘 · 3 回合短平快博弈</span>
        <h1>{{ scenarioData?.title || '正在加载剧本...' }}</h1>
      </div>
      <div class="nav-status" v-if="scenarioData">
        <div class="status-pill score-pill" :class="getScoreClass(liveScore)">
          <span class="label">好感折服度</span>
          <span class="val">{{ liveScore }} / 100</span>
        </div>
        <div class="status-pill round-pill">
          <span class="label">当前进程</span>
          <span class="val">第 {{ Math.min(3, currentRound + 1) }} / 3 回合</span>
        </div>
        <button class="btn-ghost" @click="inputMode = (inputMode === 'cards' ? 'speak' : 'cards')">
          {{ inputMode === 'cards' ? '🎙️ 切换至 Speak 模式' : '🎴 切换至 战术卡牌' }}
        </button>
        <!-- Gemini 3.8 Flash-Lite TTS 语音开关 -->
        <button 
          class="btn-tts-toggle" 
          :class="{ 'tts-active': ttsEnabled }" 
          @click="toggleTTS"
          :title="ttsEnabled ? '点击关闭 Gemini 3.8 Flash-Lite TTS 角色语音朗读' : '点击开启 Gemini 3.8 Flash-Lite TTS 角色语音朗读'"
        >
          <span class="tts-icon">{{ ttsEnabled ? '🔊' : '🔇' }}</span>
          <span class="tts-label">TTS 语音: {{ ttsEnabled ? '开启' : '关闭' }}</span>
          <span class="tts-model-chip">Gemini 3.8</span>
        </button>
        <button class="btn-ghost" @click="showDossierModal = true">
          📁 机密情报
        </button>
        <button class="btn-ghost" @click="resetSession" :disabled="loading">
          🔄 重新演练
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

        <!-- 确定性社交破防天平 (去仪表盘化，突出状态) -->
        <div class="tracker-card meter-card">
          <div class="card-header">
            <span class="icon">⚖️</span>
            <h3>好感天平 (Rapport Meter)</h3>
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
                <span class="marker-label">65 (标间)</span>
              </div>
              <div class="marker marker-penthouse" title="85分高光线 (行政套房升级)">
                <span class="marker-label">85 (套房)</span>
              </div>
            </div>
            <div class="meter-score-text">
              <span class="current-score">{{ liveScore }}</span>
              <span class="total-score">/ 100 实时好感度</span>
            </div>
          </div>

          <!-- 极简目标达成状态 -->
          <div class="rubric-breakdown">
            <div class="rubric-item" :class="{ achieved: factsVerified.includes('hasNameStated') || factsVerified.includes('hasProofProvided') }">
              <span class="r-dot">{{ (factsVerified.includes('hasNameStated') || factsVerified.includes('hasProofProvided')) ? '✅' : '⚪' }}</span>
              <span class="r-text">身份核验状态 ({{ (factsVerified.includes('hasNameStated') || factsVerified.includes('hasProofProvided')) ? '已确认预订' : '待出示凭证/姓名' }})</span>
            </div>
            <div class="rubric-item" :class="{ achieved: liveScore >= 75 }">
              <span class="r-dot">{{ liveScore >= 75 ? '✨' : '⏳' }}</span>
              <span class="r-text">升房契机 ({{ liveScore >= 75 ? '好感充沛，可提升房' : '好感蓄力中，切忌抢跑' }})</span>
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
            <div class="bubble npc-bubble" :class="{ 'speaking-bubble': isPlayingVoice('opening') }">
              <div class="bubble-header-row">
                <span class="speaker">{{ scenarioData.npc.name }}</span>
                <button
                  class="btn-audio-speak"
                  :class="{ 'is-playing': isPlayingVoice('opening'), 'is-loading': isLoadingVoice('opening') }"
                  @click="playSpeech(scenarioData.openingLine, 'opening')"
                  :title="isPlayingVoice('opening') ? '点击停止' : '播放开场语音 (Gemini 3.8 TTS)'"
                >
                  <span v-if="isLoadingVoice('opening')" class="spin-icon">⏳</span>
                  <span v-else-if="isPlayingVoice('opening')" class="wave-icon">🔊 朗读中</span>
                  <span v-else>🔊 朗读</span>
                </button>
              </div>
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
            <div 
              class="bubble" 
              :class="[
                msg.role === 'user' ? 'user-bubble' : 'npc-bubble',
                isPlayingVoice('msg_' + index) ? 'speaking-bubble' : ''
              ]"
            >
              <div class="bubble-header-row" v-if="msg.role === 'assistant'">
                <span class="speaker">{{ scenarioData.npc.name }}</span>
                <button
                  class="btn-audio-speak"
                  :class="{ 'is-playing': isPlayingVoice('msg_' + index), 'is-loading': isLoadingVoice('msg_' + index) }"
                  @click="playSpeech(msg.content, 'msg_' + index, msg.audio)"
                  :title="isPlayingVoice('msg_' + index) ? '点击停止' : '播放语音 (Gemini 3.8 TTS)'"
                >
                  <span v-if="isLoadingVoice('msg_' + index)" class="spin-icon">⏳</span>
                  <span v-else-if="isPlayingVoice('msg_' + index)" class="wave-icon">🔊 朗读中</span>
                  <span v-else>🔊 朗读</span>
                </button>
              </div>
              <div class="user-bubble-header" v-else>
                <span class="speaker">You</span>
                <span v-if="msg.isVoiceInput" class="voice-input-tag">🎙️ 语音脱稿实录</span>
              </div>
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

            <!-- 小抄封顶或脱稿认证印章 -->
            <div class="receipt-stamp" :class="settlementData.scaffoldCapTriggered ? 'stamp-cap' : 'stamp-pro'" v-if="settlementData.scaffoldCapTriggered || settlementData.stars === 3">
              <span v-if="settlementData.scaffoldCapTriggered">📑 ASSISTED DRAFT · 2-STAR CAPPED (已触发小抄封顶)</span>
              <span v-else>🏆 AUTHENTIC NEGOTIATION · 纯脱稿组装认证</span>
            </div>

            <div class="receipt-outcome">
              <h3>{{ settlementData.title }}</h3>
              <p class="story-desc">{{ settlementData.storyText }}</p>
            </div>

            <div class="receipt-quote">
              <div class="quote-header-row">
                <span class="quote-label">{{ scenarioData.npc.name }} 的结案表态：</span>
                <button
                  class="btn-audio-speak btn-audio-mini"
                  :class="{ 'is-playing': isPlayingVoice('receipt_final'), 'is-loading': isLoadingVoice('receipt_final') }"
                  @click="playSpeech(settlementData.npcFinalReply, 'receipt_final')"
                  :title="isPlayingVoice('receipt_final') ? '点击停止' : '听结案表态 (Gemini 3.8 TTS)'"
                >
                  <span v-if="isLoadingVoice('receipt_final')" class="spin-icon">⏳</span>
                  <span v-else-if="isPlayingVoice('receipt_final')" class="wave-icon">🔊 朗读中</span>
                  <span v-else>🔊 听宣读</span>
                </button>
              </div>
              <p>"{{ settlementData.npcFinalReply }}"</p>
            </div>

            <!-- 客观明牌小票得分明细 -->
            <div class="receipt-breakdown">
              <div class="breakdown-title">📊 社交天平实战得分账本 (100% 实力归因)</div>
              <div class="breakdown-grid">
                <div class="b-row">
                  <span>事实信息核验 (姓名/凭证)：</span>
                  <strong>+{{ settlementData.scoreBreakdown.factClarityScore }} 分</strong>
                </div>
                <div class="b-row highlight-stance-row">
                  <span>🛡️ 社交润滑招式 (How · 委婉商量语气)：</span>
                  <strong class="color-stance">+{{ settlementData.scoreBreakdown.pragmaticStanceScore ?? 15 }} 分</strong>
                </div>
                <div class="b-row highlight-chunk-row">
                  <span>📦 场景业务零件 (What · 酒店事实短语)：</span>
                  <strong class="color-chunk">+{{ settlementData.scoreBreakdown.domainChunksScore ?? 15 }} 分</strong>
                </div>
                <div class="b-row">
                  <span>英伦绅士礼仪 (LLM 得体度判定)：</span>
                  <strong>+{{ settlementData.scoreBreakdown.toneScore }} 分</strong>
                </div>
                <div class="b-row penalty-row" v-if="settlementData.scoreBreakdown.deductions > 0">
                  <span>违规/冒犯扣减：</span>
                  <strong>-{{ settlementData.scoreBreakdown.deductions }} 分</strong>
                </div>
                <div class="b-row cap-row" v-if="settlementData.scaffoldCapTriggered">
                  <span>小抄使用封顶规则：</span>
                  <strong class="color-warning">触发封顶 (得分压制至 75 分)</strong>
                </div>
                <div class="b-row total-row">
                  <span>最终总折服度：</span>
                  <strong class="highlight-score">{{ settlementData.finalScore }} / 100</strong>
                </div>
              </div>
            </div>

            <!-- 针对抄小抄的认知复盘建议 -->
            <div class="receipt-pedagogy-tip" v-if="settlementData.scaffoldCapTriggered">
              <div class="ptip-head">💡 认知科学复盘建议</div>
              <p>本局你使用了全句小抄顺利过关。但若想解锁 Arthur 的 <strong>3星【顶层行政套房】</strong>，下一局请尝试仅使用<strong>“装配语块”</strong>拼接短语，靠自己的语法粘合脱稿表达！</p>
            </div>

            <!-- 本局唯一带走金句 (One Key Takeaway) -->
            <div class="receipt-takeaway" v-if="settlementData.oneKeyTakeaway">
              <div class="takeaway-head">
                <span class="takeaway-icon">🎯</span>
                <strong>本局破局金句 (One Key Takeaway)</strong>
                <button
                  class="btn-audio-speak btn-audio-mini"
                  :class="{ 'is-playing': isPlayingVoice('takeaway'), 'is-loading': isLoadingVoice('takeaway') }"
                  @click="playSpeech(settlementData.oneKeyTakeaway.nativeSentence, 'takeaway')"
                  :title="isPlayingVoice('takeaway') ? '点击停止' : '地道朗读 (Gemini 3.8 TTS)'"
                >
                  <span v-if="isLoadingVoice('takeaway')" class="spin-icon">⏳</span>
                  <span v-else-if="isPlayingVoice('takeaway')" class="wave-icon">🔊 朗读中</span>
                  <span v-else>🔊 地道发音</span>
                </button>
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

        <!-- 战术行动区：三色卡牌态势流 vs Speak 自由开火流 -->
        <div class="tactical-action-dock" v-if="!isCompleted">
          <!-- 回合与阶段指示条 -->
          <div class="dock-control-header">
            <div class="dch-left">
              <span class="round-badge">第 {{ Math.min(3, currentRound + 1) }} / 3 回合</span>
              <span class="phase-badge">{{ currentRoundMeta.phaseTitle }}</span>
              <span class="phase-hint-text">{{ currentRoundMeta.phaseHint }}</span>
            </div>
            <div class="dch-right">
              <div class="mode-switcher-pills">
                <button
                  class="mode-pill-btn"
                  :class="{ active: inputMode === 'cards' }"
                  @click="inputMode = 'cards'"
                >
                  🎴 战术卡牌
                </button>
                <button
                  class="mode-pill-btn"
                  :class="{ active: inputMode === 'speak' }"
                  @click="inputMode = 'speak'"
                >
                  🎙️ Speak 自由
                </button>
              </div>
            </div>
          </div>

          <!-- 模式一：三色战术手牌模式 (默认) -->
          <div v-if="inputMode === 'cards'" class="cards-mode-view">
            <div class="tactical-hand-row">
              <div
                v-for="card in currentRoundCards"
                :key="card.id"
                class="tactical-card"
                :class="[`card-${card.color}`, { 'card-loading': loading }]"
                @click="handlePlayCard(card)"
              >
                <div class="tc-header">
                  <span class="tc-tag" :class="`tag-${card.color}`">{{ card.tag }}</span>
                  <strong class="tc-title">{{ card.title }}</strong>
                </div>
                <div class="tc-body">
                  <p class="tc-english">"{{ card.english }}"</p>
                </div>
                <div class="tc-footer">
                  <span class="tc-effect">{{ card.effect }}</span>
                  <button class="btn-play-card" :disabled="loading">
                    ⚡ 出牌 ↵
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 模式二：Speak / 自由输入模式 -->
          <div v-else class="speak-mode-view">
            <!-- 灵感提示折叠条 -->
            <div class="speak-hints-bar">
              <span class="sh-title">💡 本回合战术灵感：</span>
              <div class="sh-chips">
                <span
                  v-for="card in currentRoundCards"
                  :key="card.id"
                  class="sh-chip"
                  :class="`sh-${card.color}`"
                  @click="userInput = card.english"
                  :title="`点击采纳此句参考: ${card.english}`"
                >
                  {{ card.tag }}: {{ card.title }}
                </span>
              </div>
            </div>

            <!-- Gemini 原生多模态语音录入区 -->
            <div class="voice-recorder-bar">
              <div v-if="!isRecording" class="voice-ready-row">
                <button
                  class="btn-voice-rec"
                  @click="startVoiceRecording"
                  :disabled="loading"
                  title="使用麦克风直接说英语，Gemini 将直接理解你的发音、语用与礼貌度！"
                >
                  <span class="rec-icon">🎙️</span>
                  <span class="rec-title">脱稿开麦 · 直接说英文对白</span>
                  <span class="rec-model-chip">Gemini 多模态直听</span>
                </button>
                <span class="voice-tip-text">或在下方键盘打字输入交涉 ↵</span>
              </div>

              <!-- 正在录音交互态 -->
              <div v-else class="voice-recording-row">
                <div class="recording-indicator">
                  <span class="pulsing-live-dot"></span>
                  <span class="rec-status-text">正在录制英文发音...</span>
                  <span class="rec-timer">{{ formatDuration(recordingDuration) }}</span>
                </div>
                <div class="rec-btn-group">
                  <button class="btn-rec-cancel" @click="cancelVoiceRecording">
                    ✕ 放弃重录
                  </button>
                  <button class="btn-rec-submit" @click="stopAndSendVoiceRecording">
                    ⏹️ 停止并直接交涉
                  </button>
                </div>
              </div>
            </div>

            <!-- 输入行 -->
            <div class="speak-input-row" v-if="!isRecording">
              <textarea
                ref="textareaRef"
                v-model="userInput"
                placeholder="键入你的英文交涉对白（可直接点击上方战术灵感填入参考，或点击上方开麦直接说话）..."
                rows="2"
                @keydown.enter.prevent="sendMessage"
                :disabled="loading"
              ></textarea>
              <button
                class="btn-send-speak"
                @click="sendMessage"
                :disabled="!userInput.trim() || loading"
              >
                发送交涉 ↵
              </button>
            </div>
          </div>
        </div>

        <div v-else class="completed-lock-panel">
          <span class="lock-icon">🔒</span>
          <div class="lock-text">
            <strong>本次酒店交涉已结案落幕！</strong>
            <p>已生成真实结案账单与学情金句。可点击上方结案账单中的“再次演练”尝试不同对策！</p>
          </div>
          <button class="btn-primary" @click="resetSession">🔄 重新演练本场景</button>
        </div>
      </section>
    </main>

    <!-- 偷看整句示范与小抄警示弹窗 (Peek Modal) -->
    <div v-if="peekWeapon" class="peek-modal-overlay" @click.self="peekWeapon = null">
      <div class="peek-card">
        <div class="peek-header">
          <div class="peek-badge-row">
            <span class="peek-kicker">🔍 场外战术情报支援</span>
            <span class="peek-warning-tag">⚠️ 抄答案将锁定2星</span>
          </div>
          <h2>{{ peekWeapon.name || peekWeapon.phrase }}</h2>
          <button class="btn-close-peek" @click="peekWeapon = null">✕</button>
        </div>

        <div class="peek-body">
          <div class="peek-group">
            <span class="peek-lbl">🎯 战术沟通意图：</span>
            <p class="peek-txt">{{ peekWeapon.intent || peekWeapon.meaning }}</p>
          </div>

          <div class="peek-group">
            <span class="peek-lbl">🧩 核心承载语块 (建议重点记忆)：</span>
            <div class="chunk-highlight-box">
              <code>{{ peekWeapon.chunk || peekWeapon.phrase }}</code>
            </div>
          </div>

          <div class="peek-group">
            <span class="peek-lbl">📜 地道示范全句 (完整参考)：</span>
            <div class="full-sentence-box">
              "{{ peekWeapon.fullScaffold || peekWeapon.scaffold }}"
            </div>
          </div>

          <div class="peek-rule-box">
            <strong>⚠️ 规则与认知科学警示：</strong>
            <p>
              语言学习的本质在于<strong>“主动提取编码”</strong>。全句直接复制会产生虚假的掌握感。<br>
              • <strong>选择【记住了，自己打】</strong>：不触发任何惩罚，保持 <strong>3星顶层行政套房</strong> 冲击资格！<br>
              • <strong>选择【一键抄入】</strong>：将为你完整填入此句，但本局终局结算<strong>锁死在 2 星及格（标准大床房）</strong>。
            </p>
          </div>
        </div>

        <div class="peek-footer">
          <button class="btn-primary btn-remember" @click="handleRememberAndType">
            💪 我记住了，我自己打 (冲击 3 星)
          </button>
          <button class="btn-ghost btn-copy-cheat" @click="handleApplyFullScaffold">
            📋 实在想不出，一键抄入 (接受 2 星上限)
          </button>
        </div>
      </div>
    </div>

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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

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
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// 小抄与战术语块状态
const usedFullScaffold = ref(false);
const peekWeapon = ref<any>(null);
const actionToast = ref('');
let toastTimer: any = null;

function showToast(msg: string) {
  actionToast.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    actionToast.value = '';
  }, 3800);
}

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
  isVoiceInput?: boolean;
  evaluation?: any;
  audio?: string;
}>>([]);

// --- Gemini 3.8 Flash-Lite TTS 语音朗读控制 ---
const ttsEnabled = ref<boolean>(localStorage.getItem('avg_tts_enabled') !== 'false');
const currentPlayingKey = ref<string | null>(null);
const loadingVoiceKey = ref<string | null>(null);
let currentAudio: HTMLAudioElement | null = null;
const audioCacheMap = new Map<string, string>();

function toggleTTS() {
  ttsEnabled.value = !ttsEnabled.value;
  localStorage.setItem('avg_tts_enabled', ttsEnabled.value ? 'true' : 'false');
  if (ttsEnabled.value) {
    showToast('🔊 已开启 NPC 语音自动朗读 (Gemini 3.8 Flash-Lite TTS)');
  } else {
    stopCurrentAudio();
    showToast('🔇 已关闭 NPC 语音自动朗读');
  }
}

function isPlayingVoice(key: string) {
  return currentPlayingKey.value === key;
}

function isLoadingVoice(key: string) {
  return loadingVoiceKey.value === key;
}

function stopCurrentAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {
      // ignore
    }
    currentAudio = null;
  }
  currentPlayingKey.value = null;
}

async function playSpeech(text: string, key: string, preloadedAudio?: string) {
  if (!text) return;

  // 点击正在播放的按钮 -> 停止播放
  if (currentPlayingKey.value === key) {
    stopCurrentAudio();
    return;
  }

  stopCurrentAudio();

  let audioUrl = preloadedAudio || audioCacheMap.get(key) || audioCacheMap.get(text);

  if (!audioUrl) {
    loadingVoiceKey.value = key;
    try {
      const res = await fetch('/api/avg-test/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: scenarioData.value?.npc?.ttsVoice || 'Charon',
          npcId: scenarioData.value?.npc?.npcId || 'arthur'
        })
      });
      const json = await res.json();
      if (json.success && json.data?.audio) {
        audioUrl = json.data.audio;
        audioCacheMap.set(key, audioUrl);
        audioCacheMap.set(text, audioUrl);
      } else {
        // Fallback: 浏览器原生 SpeechSynthesis 兜底朗读
        speakWithBrowser(text);
        return;
      }
    } catch (e: any) {
      console.warn('TTS request fallback to browser:', e);
      speakWithBrowser(text);
      return;
    } finally {
      loadingVoiceKey.value = null;
    }
  }

  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      currentPlayingKey.value = key;

      audio.onended = () => {
        if (currentPlayingKey.value === key) {
          currentPlayingKey.value = null;
          currentAudio = null;
        }
      };
      audio.onerror = () => {
        if (currentPlayingKey.value === key) {
          currentPlayingKey.value = null;
          currentAudio = null;
        }
      };

      await audio.play();
    } catch (err: any) {
      console.warn('Playback error, falling back to speech synthesis:', err);
      currentPlayingKey.value = null;
      speakWithBrowser(text);
    }
  }
}

// 浏览器 Web Speech API 原生发音兜底
function speakWithBrowser(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Browser speech synthesis error:', e);
    }
  }
}

// --- Gemini 原生多模态录音输入与直传 ---
const isRecording = ref(false);
const recordingDuration = ref(0);
let mediaRecorder: MediaRecorder | null = null;
let recordingMediaStream: MediaStream | null = null;
let audioChunks: Blob[] = [];
let recordingTimer: any = null;

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

async function startVoiceRecording() {
  if (loading.value || isCompleted.value) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    recordingMediaStream = stream;
    audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.start(200);
    isRecording.value = true;
    recordingDuration.value = 0;

    clearInterval(recordingTimer);
    recordingTimer = setInterval(() => {
      recordingDuration.value++;
      if (recordingDuration.value >= 60) {
        stopAndSendVoiceRecording();
      }
    }, 1000);

    showToast('🎙️ 录音中... 请用英文清晰说出对白诉求');
  } catch (err: any) {
    console.error('麦克风权限开启失败:', err);
    showToast('⚠️ 无法获取麦克风，请在浏览器权限设置中允许麦克风访问');
  }
}

function cancelVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recordingMediaStream) {
    recordingMediaStream.getTracks().forEach(t => t.stop());
    recordingMediaStream = null;
  }
  clearInterval(recordingTimer);
  isRecording.value = false;
  recordingDuration.value = 0;
  audioChunks = [];
  showToast('✕ 已取消录音');
}

async function stopAndSendVoiceRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  clearInterval(recordingTimer);
  const recordedSec = recordingDuration.value;
  isRecording.value = false;

  mediaRecorder.onstop = async () => {
    if (recordingMediaStream) {
      recordingMediaStream.getTracks().forEach(t => t.stop());
      recordingMediaStream = null;
    }

    if (audioChunks.length === 0 || recordedSec < 1) {
      showToast('⚠️ 录音时间太短，请清晰说出完整对白');
      return;
    }

    const mimeType = mediaRecorder?.mimeType || 'audio/webm';
    const blob = new Blob(audioChunks, { type: mimeType });
    audioChunks = [];

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      await sendVoiceMessage(base64Audio, mimeType);
    };
    reader.readAsDataURL(blob);
  };

  mediaRecorder.stop();
}

async function sendVoiceMessage(audioBase64: string, mimeType: string) {
  if (loading.value || isCompleted.value) return;

  loading.value = true;
  showToast('⏳ Gemini 正在聆听并解析口语...');

  // 占位消息
  const tempMsgIndex = messages.value.length;
  messages.value.push({
    role: 'user',
    content: '🎙️ [正在解析录音...]',
    isVoiceInput: true
  });
  await scrollToBottom();

  try {
    const res = await fetch('/api/avg-test/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        audioMimeType: mimeType,
        usedFullScaffold: usedFullScaffold.value,
        ttsEnabled: ttsEnabled.value
      })
    });
    const json = await res.json();

    if (json.success && json.data) {
      const userTranscript = json.data.transcription || 'Spoken English Input';
      messages.value[tempMsgIndex].content = userTranscript;
      messages.value[tempMsgIndex].evaluation = json.data.evaluation;

      currentRound.value = json.data.currentRound;
      liveScore.value = json.data.liveScore;
      currentEmotion.value = json.data.emotion;
      pacingInfo.value = json.data.pacing;
      usedFullScaffold.value = !!json.data.usedFullScaffold;
      factsVerified.value = json.data.factsVerified || [];
      weaponsHit.value = json.data.weaponsHit || [];

      // 添加 NPC 回复
      const assistantMsg = {
        role: 'assistant' as const,
        content: json.data.npcReply,
        audio: json.data.audio
      };
      messages.value.push(assistantMsg);

      // 若开启了 TTS，自动朗读
      if (ttsEnabled.value && json.data.audio) {
        const msgKey = 'msg_' + (messages.value.length - 1);
        playSpeech(json.data.npcReply, msgKey, json.data.audio);
      } else if (ttsEnabled.value) {
        speakWithBrowser(json.data.npcReply);
      }

      // 自动结案落锁 (完成 3 回合)
      if (json.data.isCompleted && json.data.settlement) {
        settlementData.value = json.data.settlement;
        liveScore.value = json.data.settlement.finalScore;
        isCompleted.value = true;
        if (json.data.settlement.npcFinalEmotion) {
          currentEmotion.value = json.data.settlement.npcFinalEmotion;
        }
      }
    } else {
      messages.value.splice(tempMsgIndex, 1);
      showToast('⚠️ ' + (json.message || '录音未被成功识别'));
    }
  } catch (err: any) {
    console.error('语音交涉请求失败:', err);
    messages.value.splice(tempMsgIndex, 1);
    showToast('⚠️ 语音请求出错，请重试');
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
}

onBeforeUnmount(() => {
  stopCurrentAudio();
  cancelVoiceRecording();
});

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

// 拆分通用社交招式 (How) 与 场景业务事实零件 (What)
const pragmaticStances = computed(() => {
  return (scenarioData.value?.inventoryWeapons || []).filter((w: any) => w.category === 'pragmatic_stance');
});

const domainChunks = computed(() => {
  return (scenarioData.value?.inventoryWeapons || []).filter((w: any) => w.category !== 'pragmatic_stance');
});

const stancesHitCount = computed(() => {
  const stancePhrases = new Set(pragmaticStances.value.map((w: any) => w.phrase.toLowerCase().trim()));
  return weaponsHit.value.filter((p: string) => stancePhrases.has(p.toLowerCase().trim())).length;
});

const domainChunksHitCount = computed(() => {
  const chunkPhrases = new Set(domainChunks.value.map((w: any) => w.phrase.toLowerCase().trim()));
  return weaponsHit.value.filter((p: string) => chunkPhrases.has(p.toLowerCase().trim())).length;
});

// 战术手牌模式 vs Speak 自由开火模式
const inputMode = ref<'cards' | 'speak'>('cards');

const currentRoundCards = computed(() => {
  const rounds = scenarioData.value?.tacticalRounds || [];
  const idx = Math.min(rounds.length - 1, Math.max(0, currentRound.value));
  return rounds[idx]?.cards || [];
});

const currentRoundMeta = computed(() => {
  const rounds = scenarioData.value?.tacticalRounds || [];
  const idx = Math.min(rounds.length - 1, Math.max(0, currentRound.value));
  return rounds[idx] || {
    phaseTitle: `第 ${Math.min(3, currentRound.value + 1)} 回合`,
    phaseHint: '观察 NPC 态度，打出你的战术卡牌'
  };
});

async function handlePlayCard(card: any) {
  if (loading.value || isCompleted.value) return;
  userInput.value = card.english;
  await sendMessage();
}

// 紧凑装配坞折叠、分类 Tab 与乐高智能磁吸状态
const isDeckCollapsed = ref(false);
const activeDeckTab = ref<'stances' | 'chunks' | 'all'>('stances');
const selectedStance = ref<any | null>(null);
const selectedChunk = ref<any | null>(null);
const isSmartSnapped = ref(false);

const displayedWeapons = computed(() => {
  if (activeDeckTab.value === 'stances') return pragmaticStances.value;
  if (activeDeckTab.value === 'chunks') return domainChunks.value;
  return scenarioData.value?.inventoryWeapons || [];
});

function clearSelection() {
  selectedStance.value = null;
  selectedChunk.value = null;
  isSmartSnapped.value = false;
  userInput.value = '';
  showToast('↺ 已重置装配台，输入框已清空');
}

// 乐高智能磁吸装配：点击招式与零件自动补齐语法胶水，消除机械剪辑疲劳，保留参数微调槽位
function handleInsertChunk(w: any) {
  if (isCompleted.value) return;

  const matrix = scenarioData.value?.smartSnapMatrix || {};

  if (w.category === 'pragmatic_stance') {
    // 点击社交招式卡
    if (selectedStance.value?.id === w.id) {
      // 再次点击取消当前招式
      selectedStance.value = null;
      if (selectedChunk.value) {
        userInput.value = selectedChunk.value.slotFormula || selectedChunk.value.chunk;
        isSmartSnapped.value = false;
      } else {
        userInput.value = '';
      }
      return;
    }

    selectedStance.value = w;

    // 若当前已有就绪的业务零件 -> 瞬间触发智能磁吸合体！
    if (selectedChunk.value && matrix[w.id]?.[selectedChunk.value.id]) {
      userInput.value = matrix[w.id][selectedChunk.value.id];
      isSmartSnapped.value = true;
      showToast(`⚡ 乐高磁吸成功：【${w.name}】+【${selectedChunk.value.name}】！语法胶水已自动补全，可微调括号内容直接发送！`);
    } else {
      userInput.value = w.slotFormula || w.chunk || w.phrase;
      isSmartSnapped.value = false;
      showToast(`🛡️ 社交招式【${w.name}】已就位！请点击右侧【📦 业务零件】完成智能合体！`);
    }
  } else {
    // 点击业务零件卡
    if (selectedChunk.value?.id === w.id) {
      // 再次点击取消当前零件
      selectedChunk.value = null;
      if (selectedStance.value) {
        userInput.value = selectedStance.value.slotFormula || selectedStance.value.chunk;
        isSmartSnapped.value = false;
      } else {
        userInput.value = '';
      }
      return;
    }

    selectedChunk.value = w;

    // 若当前已有就绪的社交招式 -> 瞬间触发智能磁吸合体！
    if (selectedStance.value && matrix[selectedStance.value.id]?.[w.id]) {
      userInput.value = matrix[selectedStance.value.id][w.id];
      isSmartSnapped.value = true;
      showToast(`⚡ 乐高磁吸成功：【${selectedStance.value.name}】+【${w.name}】！语法胶水已自动补全，可微调括号内容直接发送！`);
    } else {
      userInput.value = w.slotFormula || w.chunk || w.phrase;
      isSmartSnapped.value = false;
      showToast(`📦 业务零件【${w.name}】已就位！点击左侧【🛡️ 社交招式】可强化礼貌度与好感！`);
    }
  }

  // 战术策略预警：若在 Phase 1 选择了升房零件，给予即时策略预警（提示动脑，防无脑点）
  if (w.id === 'chunk_upgrade' && pacingInfo.value.phase === 'phase1') {
    showToast('⚠️ 策略警示：Arthur 正在查验身份（Phase 1），此时索要升房会被判定操之过急并扣分！建议先报出姓名与订单号。');
  }

  nextTick(() => {
    textareaRef.value?.focus();
  });
}

// 展开偷看整句示范弹窗
function handleOpenPeek(w: any) {
  peekWeapon.value = w;
}

// 选项A：记住了，自己打（保持3星资格）
function handleRememberAndType() {
  peekWeapon.value = null;
  showToast('💪 坚持自主脱稿输入！3星顶层行政套房冲击资格依然有效！');
  nextTick(() => {
    textareaRef.value?.focus();
  });
}

// 选项B：一键抄入（启用小抄保底，封顶2星）
function handleApplyFullScaffold() {
  if (!peekWeapon.value) return;
  const full = peekWeapon.value.fullScaffold || peekWeapon.value.scaffold;
  userInput.value = full;
  usedFullScaffold.value = true;
  peekWeapon.value = null;
  showToast('⚠️ 已启用全句小抄：本局终局结算上限锁死为 2 星及格！');
  nextTick(() => {
    textareaRef.value?.focus();
  });
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
      usedFullScaffold.value = !!json.data.usedFullScaffold;
      factsVerified.value = json.data.factsVerified || [];
      weaponsHit.value = json.data.weaponsHit || [];
      isCompleted.value = json.data.status === 'completed';
      settlementData.value = json.data.settlement;
      if (json.data.history && json.data.history.length > 0) {
        messages.value = json.data.history;
      }
      await scrollToBottom();
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
  selectedStance.value = null;
  selectedChunk.value = null;
  isSmartSnapped.value = false;
  messages.value.push({ role: 'user', content: text });
  loading.value = true;
  await scrollToBottom();

  try {
    const res = await fetch('/api/avg-test/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        usedFullScaffold: usedFullScaffold.value,
        ttsEnabled: ttsEnabled.value
      })
    });
    const json = await res.json();

    if (json.success && json.data) {
      currentRound.value = json.data.currentRound;
      liveScore.value = json.data.liveScore;
      currentEmotion.value = json.data.emotion;
      pacingInfo.value = json.data.pacing;
      usedFullScaffold.value = !!json.data.usedFullScaffold;
      factsVerified.value = json.data.factsVerified || [];
      weaponsHit.value = json.data.weaponsHit || [];

      // 给上一条用户对白打上动态浮标标签
      const lastUserMsg = messages.value[messages.value.length - 1];
      if (lastUserMsg) {
        lastUserMsg.evaluation = json.data.evaluation;
      }

      // 添加 NPC 回应
      const assistantMsg = {
        role: 'assistant' as const,
        content: json.data.npcReply,
        audio: json.data.audio
      };
      messages.value.push(assistantMsg);

      // 自动播放 NPC 语音 (若开启 TTS 开关)
      if (ttsEnabled.value && json.data.audio) {
        const msgKey = 'msg_' + (messages.value.length - 1);
        playSpeech(json.data.npcReply, msgKey, json.data.audio);
      }

      // 自动结案落锁 (完成 3 回合)
      if (json.data.isCompleted && json.data.settlement) {
        settlementData.value = json.data.settlement;
        liveScore.value = json.data.settlement.finalScore;
        isCompleted.value = true;
        if (json.data.settlement.npcFinalEmotion) {
          currentEmotion.value = json.data.settlement.npcFinalEmotion;
        }
      }
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
  stopCurrentAudio();
  loading.value = true;
  try {
    await fetch('/api/avg-test/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'default' })
    });
    userInput.value = '';
    selectedStance.value = null;
    selectedChunk.value = null;
    isSmartSnapped.value = false;
    messages.value = [];
    currentEmotion.value = 'neutral';
    isCompleted.value = false;
    isSynced.value = false;
    usedFullScaffold.value = false;
    peekWeapon.value = null;
    actionToast.value = '';
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

.mode-pill.mode-pill-cheat {
  border: 1px solid rgba(245, 158, 11, 0.4);
}
.mode-pill.mode-pill-cheat .val {
  color: #f59e0b;
}
.mode-pill.mode-pill-pro {
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.mode-pill.mode-pill-pro .val {
  color: #10b981;
}

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

/* Gemini 3.8 Flash-Lite TTS 语音总开关按钮 */
.btn-tts-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 5px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.25s ease;
}
.btn-tts-toggle:hover {
  border-color: #64748b;
  color: #cbd5e1;
}
.btn-tts-toggle.tts-active {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #34d399;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
}
.tts-model-chip {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #38bdf8;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

/* 对白框头部与 TTS 播放按钮 */
.bubble-header-row, .quote-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.btn-audio-speak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-audio-speak:hover {
  background: #1e293b;
  border-color: #38bdf8;
  color: #38bdf8;
}
.btn-audio-speak.is-playing {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
  animation: pulse-border 1.5s infinite;
}
.btn-audio-speak.is-loading {
  opacity: 0.7;
  cursor: wait;
}
.btn-audio-mini {
  margin-left: 8px;
  font-size: 11px;
  padding: 2px 6px;
}
.speaking-bubble {
  border-color: #10b981 !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.18);
  transition: box-shadow 0.3s ease;
}
.spin-icon {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% { transform: rotate(360deg); }
}
@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
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
  gap: 10px;
  height: calc(100vh - 90px);
  min-height: 540px;
  box-sizing: border-box;
  overflow: hidden;
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
  min-height: 0;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px 20px;
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

.receipt-stamp {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
  text-transform: uppercase;
}
.stamp-cap {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
}
.stamp-pro {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.4);
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
.b-row.cap-row {
  background: rgba(245, 158, 11, 0.1);
  padding: 4px 6px;
  border-radius: 4px;
}
.color-warning {
  color: #f59e0b;
}
.highlight-stance-row {
  background: rgba(245, 158, 11, 0.08);
  padding: 3px 6px;
  border-radius: 4px;
}
.color-stance {
  color: #fbbf24;
}
.highlight-chunk-row {
  background: rgba(56, 189, 248, 0.08);
  padding: 3px 6px;
  border-radius: 4px;
}
.color-chunk {
  color: #38bdf8;
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

.receipt-pedagogy-tip {
  background: rgba(245, 158, 11, 0.08);
  border-left: 3px solid #f59e0b;
  padding: 10px 14px;
  border-radius: 0 6px 6px 0;
  margin-bottom: 14px;
}
.ptip-head {
  font-size: 11px;
  font-weight: 700;
  color: #f59e0b;
  margin-bottom: 4px;
}
.receipt-pedagogy-tip p {
  margin: 0;
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.5;
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

/* 战术行动区：三色战术手牌 vs Speak 模式 */
.tactical-action-dock {
  flex-shrink: 0;
  background: #0d1527;
  border: 1px solid #1e2d4d;
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dock-control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.dch-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.round-badge {
  background: #1e3a5f;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.phase-badge {
  background: #334155;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.phase-hint-text {
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mode-switcher-pills {
  display: flex;
  background: #090e1a;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.mode-pill-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.mode-pill-btn:hover {
  color: #f8fafc;
}
.mode-pill-btn.active {
  background: #1e293b;
  color: #38bdf8;
  font-weight: 700;
}

/* 模式一：三色战术手牌网格 */
.cards-mode-view {
  width: 100%;
}
.tactical-hand-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.tactical-card {
  background: #111b33;
  border: 1px solid #233457;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.tactical-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}
.tactical-card.card-loading {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* 绿卡：高情商委婉 */
.tactical-card.card-green {
  border-left: 3px solid #10b981;
  background: #0c1c24;
}
.tactical-card.card-green:hover {
  border-color: #10b981;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);
}

/* 蓝卡：确凿事实 */
.tactical-card.card-blue {
  border-left: 3px solid #0284c7;
  background: #0d192d;
}
.tactical-card.card-blue:hover {
  border-color: #38bdf8;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.2);
}

/* 紫卡：极速索求 / 绝杀 */
.tactical-card.card-purple {
  border-left: 3px solid #a855f7;
  background: #19142b;
}
.tactical-card.card-purple:hover {
  border-color: #c084fc;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.2);
}

.tc-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tc-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.tag-green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.tag-blue { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
.tag-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
.tc-title {
  font-size: 12px;
  color: #f1f5f9;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tc-body {
  flex: 1;
}
.tc-english {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #e2e8f0;
  font-style: italic;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.tc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
  padding-top: 6px;
}
.tc-effect {
  font-size: 10px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.btn-play-card {
  background: #1e293b;
  border: 1px solid #334155;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.tactical-card.card-green .btn-play-card { color: #34d399; border-color: rgba(16, 185, 129, 0.4); }
.tactical-card.card-purple .btn-play-card { color: #c084fc; border-color: rgba(168, 85, 247, 0.4); }
.tactical-card:hover .btn-play-card {
  background: #0284c7;
  color: #fff;
  border-color: #0284c7;
}
.tactical-card.card-green:hover .btn-play-card {
  background: #10b981;
  color: #fff;
  border-color: #10b981;
}
.tactical-card.card-purple:hover .btn-play-card {
  background: #a855f7;
  color: #fff;
  border-color: #a855f7;
}

/* 模式二：Speak / 自由输入模式 */
.speak-mode-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.speak-hints-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #090e1a;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 4px 8px;
}
.sh-title {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  white-space: nowrap;
}
.sh-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}
.sh-chip {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.sh-chip:hover {
  opacity: 0.85;
  text-decoration: underline;
}
.sh-green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.sh-blue { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
.sh-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

.speak-input-row {
  display: flex;
  gap: 10px;
}
.speak-input-row textarea {
  flex: 1;
  background: #090e17;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px 12px;
  color: #f8fafc;
  font-size: 13.5px;
  line-height: 1.4;
  height: 52px;
  min-height: 48px;
  max-height: 72px;
  resize: none;
}
.speak-input-row textarea:focus {
  outline: none;
  border-color: #38bdf8;
}
.btn-send-speak {
  background: #0284c7;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-send-speak:hover:not(:disabled) {
  background: #0369a1;
}
.btn-send-speak:disabled {
  background: #334155;
  cursor: not-allowed;
}

/* 语音录制条与动效 */
.user-bubble-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 4px;
}
.voice-input-tag {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.voice-recorder-bar {
  background: #090e17;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 8px 12px;
}
.voice-ready-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.btn-voice-rec {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(16, 185, 129, 0.2));
  border: 1px solid #0284c7;
  color: #f8fafc;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.btn-voice-rec:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.4), rgba(16, 185, 129, 0.4));
  border-color: #38bdf8;
  transform: translateY(-1px);
}
.btn-voice-rec .rec-icon {
  font-size: 16px;
}
.rec-model-chip {
  background: #0f172a;
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
}
.voice-tip-text {
  font-size: 11px;
  color: #64748b;
}

.voice-recording-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pulsing-live-dot {
  width: 12px;
  height: 12px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse-live 1s infinite;
}
@keyframes pulse-live {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
.rec-status-text {
  font-size: 13px;
  font-weight: 600;
  color: #f87171;
}
.rec-timer {
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  background: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
}
.rec-btn-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-rec-cancel {
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-rec-cancel:hover {
  background: #1e293b;
  color: #f87171;
  border-color: #ef4444;
}
.btn-rec-submit {
  background: #ef4444;
  border: 1px solid #dc2626;
  color: #fff;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  animation: pulse-border-red 1.5s infinite;
  transition: all 0.2s;
}
.btn-rec-submit:hover {
  background: #dc2626;
}
@keyframes pulse-border-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
}

.completed-lock-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 12px 18px;
  gap: 16px;
}
.lock-icon { font-size: 24px; }
.lock-text strong { color: #38bdf8; font-size: 13px; }
.lock-text p { margin: 2px 0 0 0; font-size: 12px; color: #94a3b8; }

/* 输入控制栏小抄警示与提示条 */
.smart-snap-bar {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  color: #34d399;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  animation: fadeInToast 0.25s ease-out;
}
.ssb-badge {
  font-weight: 800;
  background: rgba(16, 185, 129, 0.25);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.ssb-text {
  color: #a7f3d0;
  flex: 1;
}
.ssb-text code {
  color: #fef08a;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}
.scaffold-warning-bar {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: #f59e0b;
  margin-bottom: 8px;
}
.action-toast-bar {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: #38bdf8;
  margin-bottom: 8px;
  animation: fadeInToast 0.25s ease-out;
}
@keyframes fadeInToast {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 偷看全句弹窗 (Peek Modal) */
.peek-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
  backdrop-filter: blur(5px);
}
.peek-card {
  background: #0d1527;
  border: 1px solid #38bdf8;
  border-radius: 12px;
  max-width: 540px;
  width: 90%;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  animation: scaleInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes scaleInModal {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.peek-header {
  position: relative;
  margin-bottom: 16px;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 12px;
}
.peek-badge-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.peek-kicker {
  font-size: 11px;
  font-weight: 800;
  color: #38bdf8;
  letter-spacing: 1px;
}
.peek-warning-tag {
  font-size: 10px;
  font-weight: 700;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}
.peek-header h2 {
  margin: 0;
  font-size: 18px;
  color: #f8fafc;
}
.btn-close-peek {
  position: absolute;
  top: 0;
  right: 0;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
}
.btn-close-peek:hover {
  color: #f8fafc;
}

.peek-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.peek-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.peek-lbl {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}
.peek-txt {
  margin: 0;
  font-size: 13px;
  color: #cbd5e1;
}
.chunk-highlight-box {
  background: #090e1a;
  border: 1px solid #1e293b;
  padding: 8px 12px;
  border-radius: 6px;
}
.chunk-highlight-box code {
  color: #38bdf8;
  font-size: 13px;
  font-weight: 700;
}
.full-sentence-box {
  background: #111b33;
  border: 1px solid #233457;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
  color: #f1f5f9;
  font-style: italic;
  line-height: 1.5;
}
.peek-rule-box {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 11px;
  color: #cbd5e1;
  line-height: 1.5;
}
.peek-rule-box strong {
  color: #f59e0b;
}

.peek-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.btn-remember {
  flex: 1.2;
  background: #0284c7;
  color: #fff;
  border: none;
  padding: 10px 14px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.btn-remember:hover {
  background: #0369a1;
}
.btn-copy-cheat {
  flex: 1;
  border: 1px solid #475569;
  color: #94a3b8;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
}
.btn-copy-cheat:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

/* 输入控制栏 */
.input-panel {
  flex-shrink: 0;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 10px 14px;
}
.input-row {
  display: flex;
  gap: 12px;
}
.input-row textarea {
  flex: 1;
  height: 58px;
  min-height: 50px;
  max-height: 76px;
  background: #090e17;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px 12px;
  color: #f8fafc;
  font-size: 13.5px;
  line-height: 1.4;
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

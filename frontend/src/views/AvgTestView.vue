<template>
  <div class="avg-test-page" :class="{ 'ng-plus-theme': runMode === 'ng_plus' }">
    <!-- 顶部状态栏 -->
    <header class="top-nav">
      <div class="nav-brand">
        <button class="btn-back-module" @click="goBackToModuleA" title="返回模块 A 词汇/听力/AI题训练台">
          {{ backTargetLabel }}
        </button>
        <span class="badge-tag" :class="{ 'ng-badge-tag': runMode === 'ng_plus' }">
          {{ runMode === 'ng_plus' ? '📞 NG+ 二周目盲听挑战 · 3 回合' : 'AVG 语用沙盘 · 3 回合短平快博弈' }}
        </span>
        <h1>{{ scenarioData?.title || '正在加载剧本...' }}</h1>
      </div>
      <div class="nav-status" v-if="scenarioData">
        <div class="run-mode-switcher">
          <button
            class="run-mode-btn"
            :class="{ active: runMode === 'standard' }"
            @click="switchRunMode('standard')"
            :disabled="loading"
            title="一周目：酒店大堂面谈（有英文台词 + 卡牌/装配支持）"
          >
            👔 一周目·面谈
          </button>
          <button
            class="run-mode-btn ng-btn"
            :class="{ active: runMode === 'ng_plus' }"
            @click="switchRunMode('ng_plus')"
            :disabled="loading"
            title="二周目：午夜电话纯盲听 + 随机突发变故（0 显露台词解锁黑金 3 星与模块 A 免修特权）"
          >
            📞 二周目·盲听
          </button>
        </div>
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
        <!-- 关卡通关目标条与阶段节奏提示 (紧凑两行布局，保证下方对话视窗宽敞不被遮挡) -->
        <div class="objective-banner" :class="{ 'ng-objective-banner': runMode === 'ng_plus' }">
          <div class="objective-top-row">
            <span class="target-flag">
              {{ runMode === 'ng_plus' ? '📞 二周目·午夜盲听' : '🎯 任务目标' }}
            </span>
            <p class="objective-text" v-if="runMode === 'ng_plus'">
              听清来电突发状况并临场拆招 · 全程 0 显露台词拿 3★ 解锁黑金
            </p>
            <p class="objective-text" v-else>{{ scenarioData.objectiveDescription }}</p>
            <div class="ng-blind-status-row" v-if="runMode === 'ng_plus' && !isCompleted">
              <span class="ng-status-chip" :class="subtitleRevealedCount === 0 ? 'chip-gold' : 'chip-warn'">
                {{ subtitleRevealedCount === 0 ? '🎧 0 显露 · 黑金有效' : `👁️ 已显露 ${subtitleRevealedCount} 次` }}
              </span>
              <span class="ng-status-chip" :class="twistAddressed ? 'chip-ok' : 'chip-pending'">
                {{ twistAddressed ? '✅ 已回应变故' : '⚠️ 待破来电变故' }}
              </span>
            </div>
          </div>
          <div class="pacing-pill" :class="pacingInfo.phase" v-if="!isCompleted">
            <span class="pacing-badge">{{ pacingInfo.label }}</span>
            <span class="pacing-hint">{{ pacingInfo.hint }}</span>
          </div>
        </div>

        <!-- 对话历史回放区 -->
        <div class="chat-viewport" ref="chatViewportRef">
          <!-- 二周目盲听：先点击接听开始，再播放第 1 句 -->
          <div v-if="runMode === 'ng_plus' && !ngCallStarted" class="ng-incoming-call-card">
            <div class="incoming-ring-badge">📞 午夜内线来电待接听...</div>
            <h3>{{ scenarioData.npc.name }} 经理正在连线</h3>
            <p>
              本局为<strong>二周目纯盲听挑战</strong>（含随机隐藏突发变故）。请戴好耳机或调高音量，准备就绪后点击下方按钮接听并收听第 1 句来电！
            </p>
            <button class="btn-start-blind-call" @click="startNgPlusCall">
              🎧 点击接听并开始盲听（播放第 1 句）
            </button>
          </div>

          <!-- 开场白 -->
          <div v-else class="chat-row npc-row">
            <div class="bubble npc-bubble" :class="{ 'speaking-bubble': isPlayingVoice('opening'), 'masked-bubble': isBubbleMasked('opening') }">
              <div class="bubble-header-row">
                <span class="speaker">{{ scenarioData.npc.name }} <small v-if="runMode === 'ng_plus'" class="call-tag">📞 午夜内线</small></span>
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
              <div v-if="isBubbleMasked('opening')" class="blind-audio-mask">
                <div class="blind-wave-row" @click="playSpeech(scenarioData.openingLine, 'opening')">
                  <span class="blind-phone-icon">{{ isPlayingVoice('opening') ? '🔊' : '🎧' }}</span>
                  <div class="blind-bars" :class="{ animating: isPlayingVoice('opening') }">
                    <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                  </div>
                  <span class="blind-prompt-text">
                    {{ isPlayingVoice('opening') ? '来电播放中，请听清对方提出的突发状况...' : '点击收听午夜来电语音（文本已盲听遮罩）' }}
                  </span>
                </div>
                <div v-if="peekedClueKeys.includes('opening')" class="blind-clue-strip">
                  <span class="clue-label">💡 要点线索：</span>
                  <span v-for="chip in getClueChipsForBubble('opening', scenarioData.openingLine)" :key="chip" class="clue-chip">
                    {{ chip }}
                  </span>
                </div>
                <div class="blind-actions-row">
                  <button
                    v-if="!peekedClueKeys.includes('opening')"
                    class="btn-peek-clue"
                    @click.stop="peekClue('opening')"
                    title="仅查看要点关键词线索（限1次内可保留黑金，扣5分）"
                  >
                    💡 要点线索 ({{ cluePeekCount === 0 ? '保黑金-5分' : '再看破纯度' }})
                  </button>
                  <button class="btn-reveal-subtitle" @click.stop="revealSubtitle('opening')">
                    👁️ 显露完整台词 (破黑金)
                  </button>
                </div>
              </div>
              <p v-else class="speech-text">{{ scenarioData.openingLine }}</p>
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
                isPlayingVoice('msg_' + index) ? 'speaking-bubble' : '',
                msg.role === 'assistant' && isBubbleMasked('msg_' + index) ? 'masked-bubble' : ''
              ]"
            >
              <div class="bubble-header-row" v-if="msg.role === 'assistant'">
                <span class="speaker">{{ scenarioData.npc.name }} <small v-if="runMode === 'ng_plus'" class="call-tag">📞 午夜内线</small></span>
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
              <div v-if="msg.role === 'assistant' && isBubbleMasked('msg_' + index)" class="blind-audio-mask">
                <div class="blind-wave-row" @click="playSpeech(msg.content, 'msg_' + index, msg.audio)">
                  <span class="blind-phone-icon">{{ isPlayingVoice('msg_' + index) ? '🔊' : '🎧' }}</span>
                  <div class="blind-bars" :class="{ animating: isPlayingVoice('msg_' + index) }">
                    <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                  </div>
                  <span class="blind-prompt-text">
                    {{ isPlayingVoice('msg_' + index) ? 'Arthur 正在电话回应中...' : '点击重听该回合来电语音' }}
                  </span>
                </div>
                <div v-if="peekedClueKeys.includes('msg_' + index)" class="blind-clue-strip">
                  <span class="clue-label">💡 要点线索：</span>
                  <span v-for="chip in getClueChipsForBubble('msg_' + index, msg.content)" :key="chip" class="clue-chip">
                    {{ chip }}
                  </span>
                </div>
                <div class="blind-actions-row">
                  <button
                    v-if="!peekedClueKeys.includes('msg_' + index)"
                    class="btn-peek-clue"
                    @click.stop="peekClue('msg_' + index)"
                    title="仅查看要点关键词线索（限1次内可保留黑金，扣5分）"
                  >
                    💡 要点线索 ({{ cluePeekCount === 0 ? '保黑金-5分' : '再看破纯度' }})
                  </button>
                  <button class="btn-reveal-subtitle" @click.stop="revealSubtitle('msg_' + index)">
                    👁️ 显露完整台词 (破黑金)
                  </button>
                </div>
              </div>
              <p v-else class="speech-text">{{ msg.content }}</p>

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
          <div
            v-if="isCompleted && settlementData"
            class="receipt-stage-card"
            :class="[settlementData.outcome, 'prestige-' + (settlementData.prestigeTier || 'standard')]"
          >
            <div class="receipt-header">
              <div class="receipt-brand">
                <span class="hotel-emblem">{{ settlementData.prestigeTier === 'black_gold' ? '👑' : '🏰' }}</span>
                <h4>THE ROYAL GARDEN HOTEL</h4>
                <small>{{ settlementData.runMode === 'ng_plus' ? 'NG+ MIDNIGHT BLIND-LISTENING RECEIPT' : 'LONDON · NIGHT AUDIT NEGOTIATION RECEIPT' }}</small>
              </div>
              <div class="receipt-stars" :class="{ 'stars-black-gold': settlementData.prestigeTier === 'black_gold' }">
                <span v-for="s in 3" :key="s" class="star" :class="{ active: s <= settlementData.stars }">
                  ★
                </span>
                <span class="stars-label">
                  {{ settlementData.stars }} 星{{ settlementData.prestigeTier === 'black_gold' ? ' · 黑金认证' : '评级' }}
                </span>
              </div>
            </div>

            <div class="receipt-divider"></div>

            <!-- 正交第二维度：含金量材质印章 (黑金 / 银质脱稿 / 铜牌标准 / 辅助受限) -->
            <div class="receipt-stamp" :class="'stamp-' + (settlementData.prestigeTier || 'standard')">
              <div class="stamp-title">{{ settlementData.prestigeLabel || '🥉 标准交涉通关' }}</div>
              <div class="stamp-reason" v-if="settlementData.prestigeReason">{{ settlementData.prestigeReason }}</div>
            </div>

            <!-- 黑金通关专属：模块 A 词库免修 + Boss 直通特权卡 -->
            <div class="receipt-privilege-card" v-if="settlementData.privilegeUnlocked?.unlocked">
              <div class="priv-badge">{{ settlementData.privilegeUnlocked.badge }}</div>
              <div class="priv-body">
                <strong>🎁 实战免修特权已激活 (Module A Linkage)</strong>
                <p>{{ settlementData.privilegeUnlocked.description }}</p>
                <span v-if="settlementData.persistedChapter?.privilegeExempted" class="priv-persisted-tag">
                  ✅ 已永久写入账号档案：模块 A【酒店场景】全关免修直通已点亮
                </span>
              </div>
            </div>

            <!-- 二周目复盘：揭晓本局突发隐藏变故（上方所有来电台词现已自动解锁供复盘） -->
            <div class="ng-twist-recap" v-if="runMode === 'ng_plus' && activeTwist">
              <span class="recap-tag">🔓 全场盲听台词已解锁复盘</span>
              <div><strong>本局突发变故：</strong>{{ activeTwist.title }}</div>
              <p>{{ activeTwist.phoneContextHint }}</p>
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
                <div class="b-row penalty-row" v-if="settlementData.scoreBreakdown.roteMemorizationPenalty > 0">
                  <span>📵 未回应二周目变故 (防死背扣减)：</span>
                  <strong class="color-danger">-{{ settlementData.scoreBreakdown.roteMemorizationPenalty }} 分</strong>
                </div>
                <div class="b-row penalty-row" v-if="(settlementData.scoreBreakdown.cluePeekPenalty || 0) > 0">
                  <span>💡 要点线索缓冲查看扣减：</span>
                  <strong class="color-warning">-{{ settlementData.scoreBreakdown.cluePeekPenalty }} 分</strong>
                </div>
                <div class="b-row penalty-row" v-if="(settlementData.scoreBreakdown.deductions - (settlementData.scoreBreakdown.roteMemorizationPenalty || 0) - (settlementData.scoreBreakdown.cluePeekPenalty || 0)) > 0">
                  <span>违规/操之过急扣减：</span>
                  <strong>-{{ settlementData.scoreBreakdown.deductions - (settlementData.scoreBreakdown.roteMemorizationPenalty || 0) - (settlementData.scoreBreakdown.cluePeekPenalty || 0) }} 分</strong>
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
              <button class="btn-deck-sync" @click="handleSyncDeck" :disabled="isSynced || isSyncingDeck">
                {{
                  isSyncingDeck
                    ? '⏳ 正在同步入库...'
                    : (isSynced ? '✅ 已沉淀同步至模块 A 复习词库' : '🎙️ 将本局核心词同步入模块 A 复习池')
                }}
              </button>
              <div v-if="syncFeedback" class="sync-feedback-box" :class="{ guest: syncFeedback.requiresLogin }">
                <p>{{ syncFeedback.message }}</p>
                <div v-if="syncFeedback.words.length > 0" class="synced-word-chips">
                  <span v-for="w in syncFeedback.words" :key="w" class="synced-chip">+ {{ w }}</span>
                </div>
              </div>
            </div>

            <div class="receipt-actions">
              <button class="btn-primary" @click="resetSession()">🔄 再练一次当前模式</button>
              <button
                v-if="runMode === 'standard'"
                class="btn-ng-challenge"
                @click="switchRunMode('ng_plus')"
              >
                📞 挑战二周目：午夜内线盲听 (赢黑金特权)
              </button>
              <button
                v-else
                class="btn-ghost"
                @click="switchRunMode('standard')"
              >
                👔 返回一周目·面谈模式
              </button>
              <button class="btn-ghost" @click="goBackToModuleA">
                {{ backTargetLabel }}
              </button>
            </div>
          </div>
        </div>

        <!-- 战术行动区：二周目未接听时收起为紧凑待机条；接听后展示卡牌/Speak模式 -->
        <div class="tactical-action-dock" v-if="!isCompleted">
          <div v-if="runMode === 'ng_plus' && !ngCallStarted" class="ng-awaiting-call-dock">
            <span>📵 午夜来电尚未接听 — 请先点击上方【🎧 点击接听并开始盲听】听清第 1 句后再开口或输入</span>
            <button class="btn-start-blind-mini" @click="startNgPlusCall">🎧 立即接听</button>
          </div>
          <template v-else>
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
          </template>
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
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const activeChapter = computed(() => String(route.query.chapter || 'A').toUpperCase());
const entryFrom = computed(() => String(route.query.from || ''));
const backTargetLabel = computed(() => (entryFrom.value === 'chapters' ? '← 返回闯关大厅' : '← 返回模块 A 训练台'));

function goBackToModuleA() {
  router.push(entryFrom.value === 'chapters' ? '/chapters' : '/adventure');
}

const scenarioData = ref<any>(null);
const currentRound = ref(0);
const currentEmotion = ref('neutral');
const userInput = ref('');
const loading = ref(false);
const isResolving = ref(false);
const isCompleted = ref(false);
const isSynced = ref(false);
const isSyncingDeck = ref(false);
const syncFeedback = ref<{ message: string; words: string[]; requiresLogin?: boolean } | null>(null);
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

// 确定性天平与二周目盲听挑战状态
const runMode = ref<'standard' | 'ng_plus'>('standard');
const ngCallStarted = ref(false);
const activeTwist = ref<any>(null);
const revealedBubbles = ref<string[]>([]);
const subtitleRevealedCount = ref(0);
const cluePeekCount = ref(0);
const peekedClueKeys = ref<string[]>([]);
const twistAddressed = ref(true);
const liveScore = ref(15);
const factsVerified = ref<string[]>([]);
const weaponsHit = ref<string[]>([]);
const settlementData = ref<any>(null);

function startNgPlusCall() {
  ngCallStarted.value = true;
  if (!ttsEnabled.value) {
    ttsEnabled.value = true;
    localStorage.setItem('avg_tts_enabled', 'true');
  }
  if (scenarioData.value?.openingLine) {
    playSpeech(scenarioData.value.openingLine, 'opening');
  }
}

function isBubbleMasked(bubbleKey: string) {
  if (runMode.value !== 'ng_plus') return false;
  if (isCompleted.value) return false;
  return !revealedBubbles.value.includes(bubbleKey);
}

function getClueChipsForBubble(bubbleKey: string, content = ''): string[] {
  const chips: string[] = [];
  if (bubbleKey === 'opening' && activeTwist.value) {
    if (activeTwist.value.title) {
      chips.push(activeTwist.value.title.replace(/^突发变故：/, '📌 '));
    }
    const kws = Array.isArray(activeTwist.value.twistKeywords)
      ? activeTwist.value.twistKeywords.slice(0, 4)
      : [];
    if (kws.length > 0) {
      chips.push(`关键词: ${kws.join(' / ')}`);
    }
    return chips;
  }

  const numOrTimeMatches = String(content || '').match(/(?:£\d+|\$\d+|tomorrow|tonight|midnight|\d+\s+nights?|deposit|courtyard|surcharge|smoking|authorization|passport|confirmation)/gi) || [];
  const uniqueMatches = Array.from(new Set(numOrTimeMatches.map(m => m.trim()))).slice(0, 5);
  if (uniqueMatches.length > 0) {
    chips.push(`核心词: ${uniqueMatches.join(' · ')}`);
  } else {
    chips.push('留意对方核实条件与语气要求');
  }
  return chips;
}

async function peekClue(bubbleKey: string) {
  if (peekedClueKeys.value.includes(bubbleKey)) return;
  peekedClueKeys.value = [...peekedClueKeys.value, bubbleKey];
  cluePeekCount.value += 1;
  if (cluePeekCount.value <= 1) {
    showToast('💡 已解锁要点线索（-5分缓冲，未显露原文仍保留黑金冲刺资格！）');
  } else {
    showToast('💡 已查看第 2 次线索（累计查看超 1 次，本局将不再授予黑金纯度）');
  }
  try {
    const res = await fetch('/api/avg-test/peek-clue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'default', bubbleKey })
    });
    const json = await res.json();
    if (json?.success && typeof json?.data?.liveScore === 'number') {
      liveScore.value = json.data.liveScore;
    }
  } catch (err) {
    console.warn('记录查看要点线索失败:', err);
  }
}

async function revealSubtitle(bubbleKey: string) {
  if (revealedBubbles.value.includes(bubbleKey)) return;
  revealedBubbles.value = [...revealedBubbles.value, bubbleKey];
  subtitleRevealedCount.value += 1;
  showToast('👁️ 已显露英文台词（黑金纯度印记已失去，但仍可继续冲击 3 星！）');
  try {
    await fetch('/api/avg-test/reveal-subtitle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'default', bubbleKey })
    });
  } catch (err) {
    console.warn('记录显露台词失败:', err);
  }
}

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
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
  currentPlayingKey.value = null;
}

async function playSpeech(text: string, key: string, preloadedAudio?: string) {
  if (!text) return;

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
        speakWithBrowser(text, key);
        return;
      }
    } catch (e: any) {
      console.warn('TTS request fallback to browser:', e);
      speakWithBrowser(text, key);
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
      speakWithBrowser(text, key);
    }
  }
}

// 浏览器 Web Speech API 原生发音兜底
function speakWithBrowser(text: string, key?: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = 0.95;
      if (key) {
        currentPlayingKey.value = key;
        utterance.onend = () => {
          if (currentPlayingKey.value === key) {
            currentPlayingKey.value = null;
          }
        };
        utterance.onerror = () => {
          if (currentPlayingKey.value === key) {
            currentPlayingKey.value = null;
          }
        };
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Browser speech synthesis error:', e);
      if (key && currentPlayingKey.value === key) {
        currentPlayingKey.value = null;
      }
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
        chapter: activeChapter.value,
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
      twistAddressed.value = json.data.twistAddressed !== false;
      subtitleRevealedCount.value = json.data.subtitleRevealedCount ?? subtitleRevealedCount.value;
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
      const voiceMsgKey = 'msg_' + (messages.value.length - 1);
      if (ttsEnabled.value && json.data.audio) {
        playSpeech(json.data.npcReply, voiceMsgKey, json.data.audio);
      } else if (ttsEnabled.value) {
        speakWithBrowser(json.data.npcReply, voiceMsgKey);
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

// 将破局金句关键词与本局命中词块真实同步至模块 A UserWord 复习池
async function handleSyncDeck() {
  if (isSynced.value || isSyncingDeck.value) return;
  isSyncingDeck.value = true;
  try {
    const res = await fetch('/api/avg-test/sync-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter: activeChapter.value,
        takeaway: settlementData.value?.oneKeyTakeaway?.nativeSentence || ''
      })
    });
    const json = await res.json();
    if (json.success && json.data) {
      if (json.data.requiresLogin) {
        syncFeedback.value = {
          requiresLogin: true,
          message: json.data.message || '当前为独立试玩状态，登录后可永久同步至模块 A 复习计划。',
          words: []
        };
        showToast('💡 当前为未登录试玩模式；登录模块 A 账号后可永久写入复习池！');
      } else {
        isSynced.value = true;
        const wordNames = (json.data.syncedWords || []).map((w: any) => w.word);
        syncFeedback.value = {
          requiresLogin: false,
          message: json.data.message || `已同步 ${wordNames.length} 个核心词到模块 A 复习池`,
          words: wordNames
        };
        showToast(`🎉 已沉淀 ${wordNames.length} 个酒店核心词到【模块 A · 第3关听力 & 复习计划】！`);
      }
    } else {
      showToast('⚠️ ' + (json.message || '同步词库失败'));
    }
  } catch (err) {
    console.error('同步模块 A 词汇失败:', err);
    showToast('⚠️ 网络错误，词汇同步失败');
  } finally {
    isSyncingDeck.value = false;
  }
}

// 初始化关卡数据
async function loadInitData(targetMode?: 'standard' | 'ng_plus') {
  loading.value = true;
  try {
    const modeQuery = targetMode ? `?runMode=${targetMode}` : '';
    const res = await fetch(`/api/avg-test/init${modeQuery}`);
    const json = await res.json();
    if (json.success && json.data) {
      scenarioData.value = json.data;
      runMode.value = json.data.runMode === 'ng_plus' ? 'ng_plus' : 'standard';
      activeTwist.value = json.data.activeTwist || null;
      twistAddressed.value = json.data.twistAddressed !== false;
      subtitleRevealedCount.value = json.data.subtitleRevealedCount || 0;
      revealedBubbles.value = json.data.revealedIndices || [];
      cluePeekCount.value = json.data.cluePeekCount || 0;
      peekedClueKeys.value = json.data.peekedClueKeys || [];
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
      ngCallStarted.value = runMode.value !== 'ng_plus' || currentRound.value > 0 || (json.data.history?.length || 0) > 0 || isCompleted.value;
      if (runMode.value === 'ng_plus' && currentRound.value === 0) {
        inputMode.value = 'speak';
      }
      await scrollToBottom();
    }
  } catch (err) {
    console.error('加载剧本失败:', err);
  } finally {
    loading.value = false;
  }
}

async function switchRunMode(targetMode: 'standard' | 'ng_plus') {
  if (loading.value) return;
  await resetSession(targetMode);
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
        chapter: activeChapter.value,
        message: text,
        usedFullScaffold: usedFullScaffold.value,
        ttsEnabled: ttsEnabled.value,
        inputMode: inputMode.value
      })
    });
    const json = await res.json();

    if (json.success && json.data) {
      currentRound.value = json.data.currentRound;
      liveScore.value = json.data.liveScore;
      currentEmotion.value = json.data.emotion;
      pacingInfo.value = json.data.pacing;
      usedFullScaffold.value = !!json.data.usedFullScaffold;
      twistAddressed.value = json.data.twistAddressed !== false;
      subtitleRevealedCount.value = json.data.subtitleRevealedCount ?? subtitleRevealedCount.value;
      cluePeekCount.value = json.data.cluePeekCount ?? cluePeekCount.value;
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

      // 自动播放 NPC 语音 (若开启 TTS 开关，配额耗尽时自动 fallback 浏览器发音)
      const voiceMsgKey = 'msg_' + (messages.value.length - 1);
      if (ttsEnabled.value && json.data.audio) {
        playSpeech(json.data.npcReply, voiceMsgKey, json.data.audio);
      } else if (ttsEnabled.value) {
        speakWithBrowser(json.data.npcReply, voiceMsgKey);
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
        chapter: activeChapter.value,
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
async function resetSession(targetMode?: 'standard' | 'ng_plus') {
  stopCurrentAudio();
  loading.value = true;
  const nextMode = (typeof targetMode === 'string' ? targetMode : runMode.value) || 'standard';
  try {
    await fetch('/api/avg-test/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'default', runMode: nextMode })
    });
    userInput.value = '';
    selectedStance.value = null;
    selectedChunk.value = null;
    isSmartSnapped.value = false;
    messages.value = [];
    revealedBubbles.value = [];
    subtitleRevealedCount.value = 0;
    cluePeekCount.value = 0;
    peekedClueKeys.value = [];
    twistAddressed.value = nextMode !== 'ng_plus';
    activeTwist.value = null;
    ngCallStarted.value = nextMode !== 'ng_plus';
    currentEmotion.value = 'neutral';
    isCompleted.value = false;
    isSynced.value = false;
    syncFeedback.value = null;
    usedFullScaffold.value = false;
    peekWeapon.value = null;
    actionToast.value = '';
    settlementData.value = null;
    if (nextMode === 'ng_plus') {
      inputMode.value = 'speak';
    } else {
      inputMode.value = 'cards';
    }
    await loadInitData(nextMode);
    if (nextMode === 'ng_plus') {
      showToast('📞 已接入午夜内线盲听模式！点击【🎧 点击接听并开始盲听】播放第 1 句！');
    }
  } catch (err) {
    console.error('重置失败:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const requestedMode = route.query.runMode === 'ng_plus'
    ? 'ng_plus'
    : (route.query.runMode === 'standard' ? 'standard' : undefined);
  await loadInitData(requestedMode);
  if (requestedMode === 'ng_plus' && isCompleted.value && runMode.value !== 'ng_plus') {
    await resetSession('ng_plus');
  }
});
</script>

<style scoped>
.avg-test-page {
  min-height: calc(100vh - 64px);
  background: #090e17;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 顶部状态栏 */
.top-nav {
  min-height: 54px;
  height: auto;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 8px 20px;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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
  font-size: 17px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}
.nav-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
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
  grid-template-columns: 350px 1fr;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 14px 20px;
  gap: 18px;
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
  height: calc(100vh - 155px);
  min-height: 500px;
  box-sizing: border-box;
  overflow: hidden;
}

.objective-banner {
  flex-shrink: 0;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
.objective-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
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
.objective-banner p.objective-text {
  margin: 0;
  font-size: 12.5px;
  color: #cbd5e1;
  flex: 1;
  min-width: 200px;
  line-height: 1.4;
}
.pacing-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: #1e293b;
  padding: 4px 10px;
  border-radius: 6px;
}
.pacing-badge {
  font-size: 11px;
  font-weight: 700;
  color: #f59e0b;
  white-space: nowrap;
}
.pacing-hint {
  font-size: 11px;
  color: #94a3b8;
}

/* 对话视窗 */
.chat-viewport {
  flex: 1;
  min-height: 240px;
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

/* ========================================================
   二周目（NG+）盲听挑战 & 正交材质评价体系（黑金认证 / 特权卡）
   ======================================================== */
.avg-test-page.ng-plus-theme {
  background: radial-gradient(circle at top right, #1b160c 0%, #090e17 55%);
}
.ng-badge-tag {
  background: rgba(245, 158, 11, 0.2) !important;
  color: #fbbf24 !important;
  border: 1px solid rgba(251, 191, 36, 0.45);
}

.run-mode-switcher {
  display: inline-flex;
  background: #090e17;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.run-mode-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.run-mode-btn.active {
  background: #1e3a5f;
  color: #f8fafc;
}
.run-mode-btn.ng-btn.active {
  background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
  color: #fef3c7;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
}

.ng-objective-banner {
  border-color: rgba(245, 158, 11, 0.4) !important;
  background: rgba(120, 53, 15, 0.14) !important;
}
.ng-blind-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}
.ng-status-chip {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}
.chip-gold {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.45);
}
.chip-warn {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.chip-ok {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.chip-pending {
  background: rgba(56, 189, 248, 0.14);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.call-tag {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  margin-left: 4px;
}

.masked-bubble {
  border: 1px solid rgba(245, 158, 11, 0.45) !important;
  background: linear-gradient(135deg, #161822 0%, #1c1917 100%) !important;
}
.blind-audio-mask {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}
.blind-wave-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px dashed rgba(245, 158, 11, 0.45);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.blind-wave-row:hover {
  background: rgba(245, 158, 11, 0.18);
}
.blind-phone-icon {
  font-size: 18px;
}
.blind-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 18px;
}
.blind-bars span {
  display: inline-block;
  width: 3px;
  height: 6px;
  border-radius: 2px;
  background: #fbbf24;
  opacity: 0.65;
}
.blind-bars span:nth-child(2n) { height: 12px; }
.blind-bars span:nth-child(3n) { height: 16px; }
.blind-bars.animating span {
  animation: blindWavePulse 0.8s infinite ease-in-out;
  opacity: 1;
}
.blind-bars.animating span:nth-child(2) { animation-delay: 0.1s; }
.blind-bars.animating span:nth-child(3) { animation-delay: 0.2s; }
.blind-bars.animating span:nth-child(4) { animation-delay: 0.3s; }
.blind-bars.animating span:nth-child(5) { animation-delay: 0.15s; }
.blind-bars.animating span:nth-child(6) { animation-delay: 0.25s; }
@keyframes blindWavePulse {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1.3); }
}
.blind-prompt-text {
  font-size: 12px;
  color: #fde68a;
  font-weight: 600;
}
.blind-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.blind-blurred-preview {
  font-family: monospace;
  font-size: 12px;
  color: #475569;
  letter-spacing: 1px;
  filter: blur(2.5px);
  user-select: none;
}
.btn-reveal-subtitle {
  background: rgba(15, 23, 42, 0.85);
  color: #cbd5e1;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-reveal-subtitle:hover {
  border-color: #f59e0b;
  color: #fbbf24;
}

/* 黑金 & 正交材质结案小票视觉 */
.receipt-stage-card.prestige-black_gold {
  background: linear-gradient(145deg, #0b0b0f 0%, #1a150b 55%, #090e17 100%);
  border: 2px solid #f59e0b;
  box-shadow: 0 0 36px rgba(245, 158, 11, 0.28), inset 0 0 24px rgba(251, 191, 36, 0.08);
}
.stars-black-gold .star.active {
  color: #fde047;
  text-shadow: 0 0 12px rgba(250, 204, 21, 0.85), 0 0 4px #b45309;
}
.stars-black-gold .stars-label {
  color: #fde68a;
}

.receipt-stamp {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-transform: none;
  padding: 10px 14px;
  border-radius: 8px;
}
.stamp-title {
  font-size: 13px;
  font-weight: 800;
}
.stamp-reason {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.9;
}
.stamp-black_gold {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.22), rgba(180, 83, 9, 0.14));
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.65);
}
.stamp-authentic {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.45);
}
.stamp-standard {
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.35);
}
.stamp-assisted {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.receipt-privilege-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(234, 179, 8, 0.08));
  border: 1px solid rgba(251, 191, 36, 0.5);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.priv-badge {
  background: #f59e0b;
  color: #090e17;
  font-size: 11px;
  font-weight: 800;
  padding: 5px 10px;
  border-radius: 6px;
  white-space: nowrap;
}
.priv-body strong {
  display: block;
  font-size: 12px;
  color: #fde68a;
  margin-bottom: 2px;
}
.priv-body p {
  margin: 0;
  font-size: 12px;
  color: #fef3c7;
  line-height: 1.4;
}

.ng-twist-recap {
  background: rgba(30, 41, 59, 0.75);
  border-left: 3px solid #f59e0b;
  border-radius: 0 6px 6px 0;
  padding: 10px 12px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #cbd5e1;
}
.ng-twist-recap .recap-tag {
  display: inline-block;
  font-size: 10px;
  color: #fbbf24;
  font-weight: 700;
  margin-bottom: 4px;
}
.ng-twist-recap p {
  margin: 4px 0 0 0;
  color: #94a3b8;
  line-height: 1.45;
}
.color-danger {
  color: #f87171;
}

.btn-ng-challenge {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: #fffbeb;
  border: 1px solid rgba(251, 191, 36, 0.6);
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
}
.btn-ng-challenge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
}

/* 二周目来电接听前等待卡 & 紧凑操作条 */
.ng-incoming-call-card {
  margin: auto;
  max-width: 480px;
  width: 100%;
  background: linear-gradient(145deg, #16140f 0%, #0f172a 100%);
  border: 1px solid rgba(245, 158, 11, 0.5);
  border-radius: 14px;
  padding: 24px 22px;
  text-align: center;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 0 24px rgba(245, 158, 11, 0.12);
}
.incoming-ring-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(251, 191, 36, 0.45);
  padding: 4px 12px;
  border-radius: 999px;
  margin-bottom: 10px;
}
.ng-incoming-call-card h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #fef3c7;
}
.ng-incoming-call-card p {
  margin: 0 0 18px 0;
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.55;
}
.btn-start-blind-call {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #090e17;
  border: none;
  border-radius: 10px;
  padding: 11px 22px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.35);
  transition: transform 0.15s, box-shadow 0.2s;
}
.btn-start-blind-call:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.5);
}

.ng-awaiting-call-dock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 2px;
  font-size: 12.5px;
  color: #fde68a;
}
.btn-start-blind-mini {
  background: #f59e0b;
  color: #090e17;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 820px) {
  .stage-section {
    height: auto;
    min-height: 460px;
    overflow: visible;
  }
  .chat-viewport {
    min-height: 280px;
    max-height: 58vh;
  }
}

.btn-back-module {
  background: rgba(30, 41, 59, 0.85);
  color: #cbd5e1;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.btn-back-module:hover {
  background: #1e293b;
  color: #f8fafc;
  border-color: #60a5fa;
}

.priv-persisted-tag {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(52, 211, 153, 0.45);
  color: #6ee7b7;
  font-size: 11.5px;
  font-weight: 700;
}

.sync-feedback-box {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #a7f3d0;
  font-size: 12.5px;
}
.sync-feedback-box.guest {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fde68a;
}
.sync-feedback-box p {
  margin: 0;
}
.synced-word-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.synced-chip {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(52, 211, 153, 0.4);
  color: #6ee7b7;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}

.blind-clue-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.35);
}

.clue-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #fde68a;
}

.clue-chip {
  background: rgba(15, 23, 42, 0.85);
  color: #fef08a;
  border: 1px solid rgba(251, 191, 36, 0.4);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}

.btn-peek-clue {
  background: rgba(30, 41, 59, 0.9);
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.5);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-peek-clue:hover {
  background: rgba(245, 158, 11, 0.2);
}
</style>

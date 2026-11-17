<template>
  <div class="avg-test-page" :class="{ 'ng-plus-theme': runMode === 'ng_plus' }">
    <!-- 顶部状态栏（精简去噪） -->
    <header class="top-nav">
      <div class="nav-left">
        <button class="btn-back-module" @click="goBackToModuleA" title="返回训练台">
          <span class="back-arrow">←</span>
          <span class="back-text">{{ entryFrom === 'chapters' ? '大厅' : '训练台' }}</span>
        </button>
        <div class="nav-title-group">
          <h1>{{ scenarioData?.title || '正在加载剧本...' }}</h1>
          <span class="scene-location-chip" v-if="scenarioData?.sceneVisual?.sceneName">
            📍 {{ scenarioData.sceneVisual.sceneName }}
          </span>
        </div>
      </div>

      <div class="nav-center" v-if="scenarioData">
        <!-- 运行模式切换器：面谈 vs 盲听 -->
        <div class="run-mode-segmented">
          <button
            class="seg-btn"
            :class="{ active: runMode === 'standard' }"
            @click="switchRunMode('standard')"
            :disabled="loading"
            title="一周目：大堂面谈（有台词显示与卡牌支持）"
          >
            👔 一周目·面谈
          </button>
          <button
            class="seg-btn ng-seg-btn"
            :class="{ active: runMode === 'ng_plus' }"
            @click="switchRunMode('ng_plus')"
            :disabled="loading"
            title="二周目：午夜纯盲听（0 显露解锁黑金与免修特权）"
          >
            📞 二周目·盲听
          </button>
        </div>
      </div>

      <div class="nav-right" v-if="scenarioData">
        <!-- 回合指示 -->
        <div class="nav-round-badge">
          回合 <strong>{{ Math.min(3, currentRound + 1) }}/3</strong>
        </div>

        <!-- 好感折服度极简胶囊 -->
        <div class="nav-score-badge" :class="getScoreClass(liveScore)" title="实时好感折服度">
          ⚖️ <strong>{{ liveScore }}</strong><small>/100</small>
        </div>

        <!-- 极简控制按钮组 -->
        <button
          class="nav-icon-btn"
          :class="{ active: ttsEnabled }"
          @click="toggleTTS"
          :title="ttsEnabled ? '点击关闭语音朗读' : '点击开启语音朗读'"
        >
          {{ ttsEnabled ? '🔊 语音' : '🔇 静音' }}
        </button>

        <button class="nav-icon-btn" @click="showDossierModal = true" title="查看机密情报档案">
          📁 档案
        </button>

        <button class="nav-icon-btn" @click="resetSession" :disabled="loading" title="重开本局">
          🔄 重开
        </button>
      </div>
    </header>

    <main class="f2f-stage" v-if="scenarioData">
      <!-- 1. 远景：伦敦豪华酒店午夜大堂矢量背景 -->
      <div class="f2f-backdrop">
        <svg viewBox="0 0 1440 900" class="hotel-backdrop-svg" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="wallGlowLeft" cx="16%" cy="35%" r="42%">
              <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
              <stop offset="60%" stop-color="#78350f" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="#060a12" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="wallGlowRight" cx="84%" cy="32%" r="45%">
              <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.2"/>
              <stop offset="70%" stop-color="#78350f" stop-opacity="0.05"/>
              <stop offset="100%" stop-color="#060a12" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="pillarGold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#78350f"/>
              <stop offset="50%" stop-color="#d97706"/>
              <stop offset="100%" stop-color="#451a03"/>
            </linearGradient>
          </defs>

          <!-- 奢华午夜墙面基底 -->
          <rect width="1440" height="900" fill="#070b14"/>

          <!-- 维多利亚暗纹竖条壁纸 -->
          <g opacity="0.05">
            <rect x="0" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="120" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="240" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="360" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="480" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="600" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="720" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="840" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="960" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="1080" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="1200" y="0" width="60" height="900" fill="#f8fafc"/>
            <rect x="1320" y="0" width="60" height="900" fill="#f8fafc"/>
          </g>

          <!-- 左右暖黄壁灯氛围光晕 -->
          <rect width="1440" height="900" fill="url(#wallGlowLeft)"/>
          <rect width="1440" height="900" fill="url(#wallGlowRight)"/>

          <!-- 左侧典雅立柱与黄铜壁灯 -->
          <rect x="80" y="0" width="54" height="720" fill="#0d0704" stroke="#29150b" stroke-width="2"/>
          <rect x="74" y="210" width="66" height="12" fill="url(#pillarGold)"/>
          <rect x="74" y="0" width="66" height="24" fill="url(#pillarGold)"/>
          <path d="M 107 265 L 107 305 L 117 315" stroke="#f59e0b" stroke-width="4" fill="none"/>
          <circle cx="107" cy="255" r="14" fill="#fbbf24" opacity="0.95"/>
          <circle cx="107" cy="255" r="28" fill="#f59e0b" opacity="0.4"/>

          <!-- 右侧立柱与壁灯 -->
          <rect x="1300" y="0" width="54" height="720" fill="#0d0704" stroke="#29150b" stroke-width="2"/>
          <rect x="1294" y="210" width="66" height="12" fill="url(#pillarGold)"/>
          <rect x="1294" y="0" width="66" height="24" fill="url(#pillarGold)"/>
          <path d="M 1327 265 L 1327 305 L 1317 315" stroke="#f59e0b" stroke-width="4" fill="none"/>
          <circle cx="1327" cy="255" r="14" fill="#fbbf24" opacity="0.95"/>
          <circle cx="1327" cy="255" r="28" fill="#f59e0b" opacity="0.4"/>

          <!-- 远景右侧：客房钥匙格橱 (Room Pigeonholes) -->
          <g transform="translate(860, 110)">
            <rect x="0" y="0" width="380" height="210" rx="8" fill="#120905" stroke="#3b1d0e" stroke-width="3"/>
            <rect x="6" y="6" width="368" height="26" fill="#241208"/>
            <text x="190" y="23" font-size="11" font-family="serif" font-weight="900" fill="#d97706" text-anchor="middle" letter-spacing="2">KEY SERVICE · ROOM PIGEONHOLES</text>
            <g fill="#070302" stroke="#2b1409" stroke-width="1.5">
              <!-- 行 1 -->
              <rect x="20" y="42" width="50" height="34" rx="3"/><circle cx="45" cy="54" r="3.5" fill="#f59e0b"/>
              <rect x="80" y="42" width="50" height="34" rx="3"/><circle cx="105" cy="54" r="3.5" fill="#f59e0b"/>
              <rect x="140" y="42" width="50" height="34" rx="3"/>
              <rect x="200" y="42" width="50" height="34" rx="3"/><circle cx="225" cy="54" r="3.5" fill="#f59e0b"/>
              <rect x="260" y="42" width="50" height="34" rx="3"/>
              <rect x="320" y="42" width="40" height="34" rx="3"/><circle cx="340" cy="54" r="3.5" fill="#f59e0b"/>
              <!-- 行 2 -->
              <rect x="20" y="86" width="50" height="34" rx="3"/><circle cx="45" cy="98" r="3.5" fill="#f59e0b"/>
              <rect x="80" y="86" width="50" height="34" rx="3"/>
              <rect x="140" y="86" width="50" height="34" rx="3"/><circle cx="165" cy="98" r="3.5" fill="#f59e0b"/>
              <rect x="200" y="86" width="50" height="34" rx="3"/><circle cx="225" cy="98" r="3.5" fill="#f59e0b"/>
              <rect x="260" y="86" width="50" height="34" rx="3"/><circle cx="285" cy="98" r="3.5" fill="#f59e0b"/>
              <rect x="320" y="86" width="40" height="34" rx="3"/>
              <!-- 行 3 (85分顶层套房锁位) -->
              <rect x="20" y="130" width="50" height="34" rx="3"/>
              <rect x="80" y="130" width="50" height="34" rx="3"/><circle cx="105" cy="142" r="3.5" fill="#f59e0b"/>
              <rect x="140" y="130" width="50" height="34" rx="3"/>
              <rect x="200" y="130" width="50" height="34" rx="3"/><circle cx="225" cy="142" r="3.5" fill="#f59e0b"/>
              <rect x="260" y="130" width="50" height="34" rx="3"/>
              <rect x="320" y="130" width="40" height="34" rx="3" stroke="#f59e0b" stroke-width="2.5"/><circle cx="340" cy="142" r="4.5" fill="#fbbf24"/>
            </g>
          </g>

          <!-- 远景中央：复古罗马大挂钟 (时间固定在午夜 23:45 契合剧情) -->
          <g transform="translate(560, 50)">
            <circle cx="65" cy="65" r="58" fill="#140a06" stroke="#d97706" stroke-width="4"/>
            <circle cx="65" cy="65" r="50" fill="#fef3c7" stroke="#78350f" stroke-width="1.5"/>
            <text x="65" y="32" font-size="12" font-family="serif" font-weight="900" fill="#451a03" text-anchor="middle">XII</text>
            <text x="104" y="70" font-size="11" font-family="serif" font-weight="900" fill="#451a03" text-anchor="middle">III</text>
            <text x="65" y="106" font-size="11" font-family="serif" font-weight="900" fill="#451a03" text-anchor="middle">VI</text>
            <text x="26" y="70" font-size="11" font-family="serif" font-weight="900" fill="#451a03" text-anchor="middle">IX</text>
            <!-- 时针指向 11点与12点之间 (23点) -->
            <line x1="65" y1="65" x2="48" y2="38" stroke="#451a03" stroke-width="3.5" stroke-linecap="round"/>
            <!-- 分针指向 9点 (45分) -->
            <line x1="65" y1="65" x2="30" y2="65" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="65" cy="65" r="4" fill="#d97706"/>
          </g>
        </svg>
      </div>

      <!-- 2. 中近景人物与对白联动舞台 (固定紧邻间距，无论窗口多大始终紧依人物) -->
      <div class="f2f-actor-stage">
        <!-- Arthur 矢量半身立绘 (站在柜台后，眉眼神态动态切换) -->
        <div class="f2f-character-layer" :class="currentEmotion">
        <div class="character-sprite-container">
          <div class="character-glow-aura" :class="currentEmotion"></div>
          <svg viewBox="0 0 420 560" class="arthur-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="suitGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#1e293b"/>
                <stop offset="50%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#090e17"/>
              </linearGradient>
              <linearGradient id="lapelGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#334155"/>
                <stop offset="100%" stop-color="#1e293b"/>
              </linearGradient>
              <linearGradient id="goldPlate" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="50%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#b45309"/>
              </linearGradient>
              <linearGradient id="tieGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#991b1b"/>
                <stop offset="100%" stop-color="#450a0a"/>
              </linearGradient>
              <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f1f5f9"/>
                <stop offset="60%" stop-color="#94a3b8"/>
                <stop offset="100%" stop-color="#64748b"/>
              </linearGradient>
            </defs>

            <!-- 躯干西装与肩线 -->
            <path d="M 60 320 Q 210 280 360 320 L 400 560 L 20 560 Z" fill="url(#suitGrad)"/>

            <!-- 白衬衫与硬领 -->
            <polygon points="175,270 245,270 230,375 190,375" fill="#f8fafc"/>
            <polygon points="160,265 210,310 185,315" fill="#e2e8f0"/>
            <polygon points="260,265 210,310 235,315" fill="#cbd5e1"/>

            <!-- 暗红真丝领带 -->
            <polygon points="202,305 218,305 226,440 210,470 194,440" fill="url(#tieGrad)"/>
            <!-- 黄铜领带夹 -->
            <rect x="200" y="375" width="20" height="4" rx="1" fill="url(#goldPlate)"/>

            <!-- 考究西装驳领 -->
            <path d="M 115 320 L 195 440 L 175 440 L 90 350 Z" fill="url(#lapelGrad)"/>
            <path d="M 305 320 L 225 440 L 245 440 L 330 350 Z" fill="url(#lapelGrad)"/>

            <!-- 胸袋巾与金属工牌 (Arthur - Duty Manager) -->
            <polygon points="280,360 295,348 305,356 290,365" fill="#f8fafc"/>
            <rect x="268" y="375" width="52" height="20" rx="3" fill="url(#goldPlate)" stroke="#78350f" stroke-width="1"/>
            <text x="294" y="386" font-size="7" font-family="sans-serif" font-weight="900" fill="#451a03" text-anchor="middle">ARTHUR</text>
            <text x="294" y="392" font-size="4.8" font-family="sans-serif" font-weight="700" fill="#78350f" text-anchor="middle">DUTY MANAGER</text>

            <!-- 脖颈 -->
            <rect x="185" y="235" width="50" height="45" rx="4" fill="#fcd34d"/>

            <!-- 头部底色 -->
            <ellipse cx="210" cy="180" rx="65" ry="75" fill="#fef08a"/>

            <!-- 耳朵 -->
            <ellipse cx="145" cy="185" rx="9" ry="16" fill="#fcd34d"/>
            <ellipse cx="275" cy="185" rx="9" ry="16" fill="#fcd34d"/>

            <!-- 绅士银灰分头秀发 -->
            <path d="M 142 165 C 140 100, 200 85, 278 120 C 275 100, 250 85, 210 85 C 160 85, 135 120, 142 165 Z" fill="url(#hairGrad)"/>
            <path d="M 140 160 Q 180 120 275 140 C 270 125, 240 105, 190 115 C 150 125, 142 145, 140 160 Z" fill="#ffffff" opacity="0.3"/>

            <!-- 金丝半框眼镜 -->
            <rect x="162" y="166" width="36" height="22" rx="4" fill="none" stroke="#d97706" stroke-width="2.5"/>
            <rect x="222" y="166" width="36" height="22" rx="4" fill="none" stroke="#d97706" stroke-width="2.5"/>
            <line x1="198" y1="174" x2="222" y2="174" stroke="#d97706" stroke-width="2.5"/>
            <line x1="148" y1="172" x2="162" y2="172" stroke="#d97706" stroke-width="1.8"/>
            <line x1="258" y1="172" x2="272" y2="172" stroke="#d97706" stroke-width="1.8"/>
            <!-- 镜片反光 -->
            <line x1="168" y1="184" x2="188" y2="170" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
            <line x1="228" y1="184" x2="248" y2="170" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>

            <!-- 专注目光双眼 -->
            <ellipse cx="180" cy="177" rx="6" ry="4" fill="#0f172a"/>
            <circle cx="182" cy="175" r="1.5" fill="#ffffff"/>
            <ellipse cx="240" cy="177" rx="6" ry="4" fill="#0f172a"/>
            <circle cx="242" cy="175" r="1.5" fill="#ffffff"/>

            <!-- 鼻梁 -->
            <path d="M 210 168 L 206 195 L 214 195 Z" fill="#f59e0b" opacity="0.5"/>

            <!-- 英伦短髭胡子 -->
            <path d="M 188 206 Q 210 200 232 206 Q 220 216 210 210 Q 200 216 188 206 Z" fill="url(#hairGrad)"/>

            <!-- 动态情绪神态：眉毛与唇线切换 -->
            <!-- 情绪 1: 一丝不苟 (Neutral) -->
            <g v-if="currentEmotion === 'neutral'">
              <path d="M 165 158 Q 182 154 196 158" stroke="#475569" stroke-width="3" stroke-linecap="round" fill="none"/>
              <path d="M 224 158 Q 238 154 255 158" stroke="#475569" stroke-width="3" stroke-linecap="round" fill="none"/>
              <line x1="202" y1="222" x2="218" y2="222" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"/>
            </g>

            <!-- 情绪 2: 挑眉审视 (Skeptical) -->
            <g v-else-if="currentEmotion === 'skeptical'">
              <!-- 左眉高挑 -->
              <path d="M 164 148 Q 180 140 196 152" stroke="#475569" stroke-width="3.5" stroke-linecap="round" fill="none"/>
              <!-- 右眉微压 -->
              <path d="M 224 160 Q 240 157 256 162" stroke="#475569" stroke-width="3" stroke-linecap="round" fill="none"/>
              <path d="M 200 224 Q 210 220 220 222" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            </g>

            <!-- 情绪 3: 皱眉严苛 (Annoyed) -->
            <g v-else-if="currentEmotion === 'annoyed'">
              <!-- 双眉倒竖压向眉心 -->
              <path d="M 165 156 Q 185 163 198 165" stroke="#475569" stroke-width="3.5" stroke-linecap="round" fill="none"/>
              <path d="M 222 165 Q 235 163 255 156" stroke="#475569" stroke-width="3.5" stroke-linecap="round" fill="none"/>
              <!-- 紧抿微下垂唇形 -->
              <path d="M 200 226 Q 210 220 220 226" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            </g>

            <!-- 情绪 4: 折服赞许 (Pleased) -->
            <g v-else-if="currentEmotion === 'pleased'">
              <!-- 舒展温和眉毛 -->
              <path d="M 166 154 Q 182 150 197 154" stroke="#475569" stroke-width="3" stroke-linecap="round" fill="none"/>
              <path d="M 223 154 Q 238 150 254 154" stroke="#475569" stroke-width="3" stroke-linecap="round" fill="none"/>
              <!-- 优雅微笑 -->
              <path d="M 200 220 Q 210 229 220 220" stroke="#059669" stroke-width="3" stroke-linecap="round" fill="none"/>
              <!-- 手持 3星顶层套房黑金房卡 -->
              <g transform="translate(100, 420) rotate(-14)">
                <rect x="0" y="0" width="68" height="42" rx="4" fill="#09090b" stroke="#f59e0b" stroke-width="2.5"/>
                <text x="34" y="16" font-size="7" font-family="sans-serif" font-weight="900" fill="#fbbf24" text-anchor="middle">THE RITZ</text>
                <text x="34" y="27" font-size="5.5" font-family="sans-serif" font-weight="700" fill="#fef08a" text-anchor="middle">VIP SUITE ★★★</text>
                <circle cx="58" cy="21" r="3" fill="#10b981"/>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <!-- 3. 中景悬浮语音气泡 (Floating Dialogue Balloon: 居于 Arthur 右侧开阔区域) -->
      <div
        class="f2f-speech-balloon"
        :class="{
          'speaking': isPlayingVoice(latestNpcMessage.key),
          'masked': isBubbleMasked(latestNpcMessage.key)
        }"
      >
        <!-- 指向 Arthur 肩膀的气泡小尾巴 -->
        <div class="balloon-tail"></div>

        <div class="balloon-header">
          <div class="speaker-tag">
            <span class="speaker-avatar-icon">{{ npcIcon }}</span>
            <div class="speaker-name-group">
              <strong>{{ scenarioData.npc.name }}</strong>
              <small>{{ scenarioData.npc.title }}</small>
            </div>
            <span class="emotion-micro-badge" :class="currentEmotion">{{ emotionLabel }}</span>
          </div>

          <div class="balloon-header-actions">
            <!-- TTS 重新朗读按键 -->
            <button
              class="btn-audio-speak"
              :class="{ 'is-playing': isPlayingVoice(latestNpcMessage.key), 'is-loading': isLoadingVoice(latestNpcMessage.key) }"
              @click="playSpeech(latestNpcMessage.content, latestNpcMessage.key, latestNpcMessage.audio)"
              :title="isPlayingVoice(latestNpcMessage.key) ? '点击停止' : '重新播放此句英文发音 (Gemini 3.8 TTS)'"
            >
              <span v-if="isLoadingVoice(latestNpcMessage.key)" class="spin-icon">⏳</span>
              <span v-else-if="isPlayingVoice(latestNpcMessage.key)" class="wave-icon">🔊 朗读中</span>
              <span v-else>🔊 朗读</span>
            </button>

            <!-- 历史对白记录入口 -->
            <button class="btn-history-toggle" @click="showHistoryDrawer = true" title="查看所有轮次交涉历史">
              📜 历史 ({{ messages.length }})
            </button>
          </div>
        </div>

        <!-- NPC 当前神态与心境微标 -->
        <div class="balloon-status-hint">
          <span>🧠 {{ currentStatusPrompt }}</span>
        </div>

        <!-- 盲听模式遮罩态 vs 正常英文台词态 -->
        <div v-if="isBubbleMasked(latestNpcMessage.key)" class="balloon-blind-content">
          <div class="blind-wave-row" @click="playSpeech(latestNpcMessage.content, latestNpcMessage.key, latestNpcMessage.audio)">
            <span class="blind-phone-icon">{{ isPlayingVoice(latestNpcMessage.key) ? '🔊' : '🎧' }}</span>
            <div class="blind-bars" :class="{ animating: isPlayingVoice(latestNpcMessage.key) }">
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <span class="blind-prompt-text">
              {{ isPlayingVoice(latestNpcMessage.key) ? '来电播放中，请听清对方提出的突发变故...' : '点击收听午夜来电语音（文本已盲听遮罩）' }}
            </span>
          </div>
          <div v-if="peekedClueKeys.includes(latestNpcMessage.key)" class="blind-clue-strip">
            <span class="clue-label">💡 要点线索：</span>
            <span v-for="chip in getClueChipsForBubble(latestNpcMessage.key, latestNpcMessage.content)" :key="chip" class="clue-chip">
              {{ chip }}
            </span>
          </div>
          <div class="blind-actions-row">
            <button
              v-if="!peekedClueKeys.includes(latestNpcMessage.key)"
              class="btn-peek-clue"
              @click.stop="peekClue(latestNpcMessage.key)"
              title="仅查看要点关键词线索（限1次内可保留黑金，扣5分）"
            >
              💡 要点线索 ({{ cluePeekCount === 0 ? '保黑金-5分' : '再看破纯度' }})
            </button>
            <button class="btn-reveal-subtitle" @click.stop="revealSubtitle(latestNpcMessage.key)">
              👁️ 显露完整台词 (破黑金)
            </button>
          </div>
        </div>

        <div v-else class="balloon-speech-content">
          <p class="npc-speech-p">"{{ latestNpcMessage.content }}"</p>
        </div>

        <!-- 玩家上一句发言的微缩回声 (Echo)，让交涉有来有往 -->
        <div v-if="latestUserMessage" class="balloon-user-echo">
          <span class="echo-speaker">You:</span>
          <span class="echo-text">"{{ latestUserMessage.content }}"</span>
          <div v-if="latestUserMessage.evaluation" class="echo-eval-tags">
            <span v-if="latestUserMessage.evaluation.stanceIdentified" class="eval-mini-pill pill-ok">
              ⚡ {{ latestUserMessage.evaluation.stanceIdentified }}
            </span>
            <span v-if="latestUserMessage.evaluation.politenessScore" class="eval-mini-pill pill-tone">
              🎩 礼貌 {{ latestUserMessage.evaluation.politenessScore }}/30
            </span>
            <span v-if="latestUserMessage.evaluation.pacingPenalty" class="eval-mini-pill pill-warn">
              ⚠️ 操之过急 -{{ latestUserMessage.evaluation.pacingPenalty }}
            </span>
          </div>
        </div>

        <!-- 正在思考指示 (加载中气泡附带态) -->
        <div v-if="loading" class="balloon-thinking-strip">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="thinking-text">{{ scenarioData.npc.name }} 正在审视并权衡...</span>
        </div>
      </div>
    </div>

    <!-- 4. 浮动结算账单容器 (覆盖在中景大堂上) -->
      <div v-if="isCompleted && settlementData" class="settlement-overlay">

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

            <!-- 客观明牌小票得分明细 (支持一键折叠/展开，默认呈现精练结论) -->
            <div class="receipt-breakdown">
              <div class="breakdown-head-bar" @click="showBreakdownDetails = !showBreakdownDetails">
                <div class="bh-left">
                  <span class="breakdown-title">📊 社交天平实战得分账本</span>
                  <span class="breakdown-score-badge">{{ settlementData.finalScore }} / 100 分</span>
                </div>
                <button type="button" class="btn-toggle-breakdown">
                  {{ showBreakdownDetails ? '收起明细 ▴' : '展开细目 ▾' }}
                </button>
              </div>

              <!-- 展开的明细项 -->
              <div v-if="showBreakdownDetails" class="breakdown-grid">
                <div class="b-row">
                  <span>事实信息核验 (姓名/凭证)：</span>
                  <strong>+{{ settlementData.scoreBreakdown.factClarityScore }} 分</strong>
                </div>
                <div class="b-row highlight-stance-row">
                  <span>🛡️ 社交润滑招式 (委婉商量语气)：</span>
                  <strong class="color-stance">+{{ settlementData.scoreBreakdown.pragmaticStanceScore ?? 15 }} 分</strong>
                </div>
                <div class="b-row highlight-chunk-row">
                  <span>📦 场景业务零件 (酒店事实短语)：</span>
                  <strong class="color-chunk">+{{ settlementData.scoreBreakdown.domainChunksScore ?? 15 }} 分</strong>
                </div>
                <div class="b-row">
                  <span>英伦绅士礼仪 (得体度判定)：</span>
                  <strong>+{{ settlementData.scoreBreakdown.toneScore }} 分</strong>
                </div>
                <div class="b-row penalty-row" v-if="settlementData.scoreBreakdown.roteMemorizationPenalty > 0">
                  <span>📵 未回应二周目变故扣减：</span>
                  <strong class="color-danger">-{{ settlementData.scoreBreakdown.roteMemorizationPenalty }} 分</strong>
                </div>
                <div class="b-row penalty-row" v-if="(settlementData.scoreBreakdown.cluePeekPenalty || 0) > 0">
                  <span>💡 要点线索缓冲查看扣减：</span>
                  <strong class="color-warning">-{{ settlementData.scoreBreakdown.cluePeekPenalty }} 分</strong>
                </div>
                <div class="b-row penalty-row" v-if="(settlementData.scoreBreakdown.deductions - (settlementData.scoreBreakdown.roteMemorizationPenalty || 0) - (settlementData.scoreBreakdown.cluePeekPenalty || 0)) > 0">
                  <span>违规/操之过急扣减：</span>
                  <strong class="color-danger">-{{ settlementData.scoreBreakdown.deductions - (settlementData.scoreBreakdown.roteMemorizationPenalty || 0) - (settlementData.scoreBreakdown.cluePeekPenalty || 0) }} 分</strong>
                </div>
                <div class="b-row cap-row" v-if="settlementData.scaffoldCapTriggered">
                  <span>小抄使用封顶规则：</span>
                  <strong class="color-warning">触发封顶 (得分压制至 75 分)</strong>
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

      <!-- 5. 近景：前台红木大理石柜台与台面道具 (Mahogany Counter) -->
      <div class="f2f-counter-foreground">
        <!-- 柜台台面木纹饰条与金线 -->
        <div class="counter-rim">
          <div class="counter-gold-bevel"></div>
          <div class="counter-accessories">
            <div class="desk-item bell-item" title="前台黄铜服务铃">
              <span class="desk-icon">🛎️</span>
              <span class="desk-item-label">CONCIERGE</span>
            </div>
            <div class="desk-item folio-item" @click="showDossierModal = true" title="点击查阅特工机密简报与 Arthur 软肋">
              <span class="desk-icon">📋</span>
              <span class="desk-item-label">GUEST REGISTER & INTEL</span>
            </div>
            <div class="desk-item terminal-item">
              <span class="terminal-led">● ONLINE</span>
              <span class="desk-item-label">KEYCARD TERMINAL</span>
            </div>
          </div>
        </div>

        <!-- 战术行动操作坞 (直接置于柜台台面上，大气宽敞不拥挤) -->
        <div class="f2f-action-dock" v-if="!isCompleted">
          <!-- 二周目未接听待机态 -->
          <div v-if="runMode === 'ng_plus' && !ngCallStarted" class="ng-awaiting-call-dock">
            <span>📵 午夜来电尚未接听 — 请先点击右侧接听按钮听清第 1 句来电</span>
            <button class="btn-start-blind-mini" @click="startNgPlusCall">🎧 立即接听并播放</button>
          </div>

          <template v-else>
            <!-- 阶段导航与模式切换条 -->
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

            <!-- 卡牌模式：三张战术手牌整齐陈列在柜台台面 -->
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

            <!-- Speak 自由模式：脱稿开麦与键盘交涉 -->
            <div v-else class="speak-mode-view">
              <!-- 战术灵感药丸 -->
              <div class="speak-hints-bar">
                <span class="sh-title">💡 战术灵感：</span>
                <div class="sh-chips">
                  <span
                    v-for="card in currentRoundCards"
                    :key="card.id"
                    class="sh-chip"
                    :class="`sh-${card.color}`"
                    @click="userInput = card.english"
                    :title="`采纳: ${card.english}`"
                  >
                    {{ card.tag }}: {{ card.title }}
                  </span>
                </div>
              </div>

              <!-- 录音条 -->
              <div class="voice-recorder-bar">
                <div v-if="!isRecording" class="voice-ready-row">
                  <button
                    class="btn-voice-rec"
                    @click="startVoiceRecording"
                    :disabled="loading"
                    title="开麦直接说英文"
                  >
                    <span class="rec-icon">🎙️</span>
                    <span class="rec-title">脱稿开麦 · 直接说英文对白</span>
                    <span class="rec-model-chip">Gemini 多模态直听</span>
                  </button>
                  <span class="voice-tip-text">或在下方输入框打字交涉 ↵</span>
                </div>

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

        <!-- 结案锁定条 -->
        <div v-else class="completed-lock-panel">
          <span class="lock-icon">🔒</span>
          <div class="lock-text">
            <strong>本次酒店交涉已结案！</strong>
            <p>已生成真实结案账单。可点击中央账单中的“再次演练”重新挑战！</p>
          </div>
          <button class="btn-primary" @click="resetSession">🔄 重新演练本场景</button>
        </div>
      </div>

      <!-- 6. 历史交涉全流程记录抽屉 (点击 📜 历史 时从侧边滑出) -->
      <div v-if="showHistoryDrawer" class="history-drawer-overlay" @click.self="showHistoryDrawer = false">
        <div class="history-drawer-card">
          <div class="hdc-header">
            <div class="hdc-title-group">
              <span class="hdc-icon">📜</span>
              <h3>交涉历史全景对白</h3>
              <small>共 {{ messages.length + 1 }} 条记录</small>
            </div>
            <button class="btn-close-hdc" @click="showHistoryDrawer = false">✕</button>
          </div>
          <div class="hdc-body">
            <!-- 开场白 -->
            <div class="hdc-row hdc-npc">
              <div class="hdc-speaker-badge">👔 {{ scenarioData.npc.name }} (开场)</div>
              <p class="hdc-text">"{{ scenarioData.openingLine }}"</p>
            </div>
            <!-- 每轮交涉记录 -->
            <div
              v-for="(m, i) in messages"
              :key="i"
              class="hdc-row"
              :class="m.role === 'user' ? 'hdc-user' : 'hdc-npc'"
            >
              <div class="hdc-speaker-badge">
                {{ m.role === 'user' ? '👤 You (第 ' + (Math.floor(i / 2) + 1) + ' 回合)' : '👔 ' + scenarioData.npc.name }}
              </div>
              <p class="hdc-text">"{{ m.content }}"</p>
              <div v-if="m.evaluation" class="hdc-eval-strip">
                <span v-if="m.evaluation.stanceIdentified" class="eval-mini-pill pill-ok">
                  ⚡ {{ m.evaluation.stanceIdentified }}
                </span>
                <span v-if="m.evaluation.politenessScore" class="eval-mini-pill pill-tone">
                  🎩 礼貌 {{ m.evaluation.politenessScore }}/30
                </span>
                <span v-if="m.evaluation.pacingPenalty" class="eval-mini-pill pill-warn">
                  ⚠️ 操之过急 -{{ m.evaluation.pacingPenalty }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
const showContextDetails = ref(false);
const showBreakdownDetails = ref(false);
const chatViewportRef = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const currentStatusPrompt = computed(() => {
  const npcName = scenarioData.value?.npc?.name || 'Arthur';
  if (currentEmotion.value === 'pleased') {
    return `${npcName} 神情舒展，对你的得体沟通颇有好感`;
  }
  if (currentEmotion.value === 'annoyed') {
    return `${npcName} 眉头微皱，感到被冒犯或按规程遇阻`;
  }
  if (currentEmotion.value === 'skeptical') {
    return `${npcName} 目光警惕，正在核对终端与查验证件`;
  }
  return `${npcName} 严苛审视，正按夜班规程与你核实`;
});

const showHistoryDrawer = ref(false);

const latestNpcMessage = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'assistant') {
      return {
        key: `msg_${i}`,
        content: messages.value[i].content,
        audio: messages.value[i].audio
      };
    }
  }
  return {
    key: 'opening',
    content: scenarioData.value?.openingLine || '',
    audio: undefined
  };
});

const latestUserMessage = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      return messages.value[i];
    }
  }
  return null;
});

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

/* 顶部导航控制条 (Sleek Command Strip) */
.top-nav {
  min-height: 48px;
  background: #0d1527;
  border-bottom: 1px solid #1e2d4d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  box-sizing: border-box;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.btn-back-module {
  background: rgba(30, 41, 59, 0.85);
  color: #cbd5e1;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}
.btn-back-module:hover {
  background: #1e293b;
  color: #38bdf8;
  border-color: #38bdf8;
}

.nav-title-group, .scene-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.nav-title-group h1, .scene-main-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-location-chip {
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.25);
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 4px;
  white-space: nowrap;
}

/* 居中分段模式切换器 */
.nav-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.run-mode-segmented {
  display: inline-flex;
  background: #090e17;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.seg-btn, .seg-item {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.seg-btn:hover:not(:disabled), .seg-item:hover:not(:disabled) {
  color: #f1f5f9;
}

.seg-btn.active, .seg-item.active {
  background: #1e3a5f;
  color: #38bdf8;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.seg-btn.ng-seg-btn.active, .seg-item.seg-ng.active {
  background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
  color: #fef3c7;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.35);
}

/* 右侧指示与操作按钮 */
.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.nav-round-badge {
  background: #111b33;
  border: 1px solid #1e3a5f;
  color: #7dd3fc;
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}

.nav-score-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
}
.nav-score-badge.score-penthouse {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
}
.nav-score-badge.score-standard {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}
.nav-score-badge.score-risk {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.nav-icon-btn {
  background: #111b33;
  border: 1px solid #233457;
  color: #cbd5e1;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.nav-icon-btn:hover:not(:disabled) {
  background: #1e293b;
  border-color: #38bdf8;
  color: #f8fafc;
}
.nav-icon-btn.btn-tts-icon.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.45);
  color: #34d399;
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

/* 面对面第一人称 AVG 剧场舞台 (Face-to-Face AVG Stage) */
.f2f-stage {
  position: relative;
  width: 100%;
  height: calc(100vh - 48px);
  min-height: 560px;
  overflow: hidden;
  background: #070b14;
  user-select: none;
}

/* 1. 远景：伦敦豪华酒店午夜大堂矢量背景 */
.f2f-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.hotel-backdrop-svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 中近景人物与对白联动舞台 (The Actor Stage: 居中聚焦，固定紧邻，永不拉远漂移) */
.f2f-actor-stage {
  position: absolute;
  top: 0;
  bottom: 165px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 1140px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0 24px;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 3;
}

/* 2. Arthur 矢量半身立绘 (位于画面左侧偏中，底部坐落在柜台后) */
.f2f-character-layer {
  align-self: flex-end;
  width: 380px;
  max-width: 38vw;
  flex-shrink: 0;
  margin-right: -32px; /* 抵消SVG右侧透明留白，让气泡尾巴直抵 Arthur 右肩 */
  pointer-events: none;
  transition: transform 0.3s ease;
}
.character-sprite-container {
  position: relative;
  width: 100%;
}
.arthur-svg {
  width: 100%;
  height: auto;
  display: block;
  filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.75));
}
.character-glow-aura {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 70%;
  height: 60%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

/* 3. 悬浮语音气泡 (Floating Dialogue Balloon: 紧依 Arthur 头部右侧，永远保持紧凑) */
.f2f-speech-balloon {
  flex: 1;
  max-width: 660px;
  min-width: 320px;
  margin-top: clamp(20px, 4.5vh, 48px);
  position: relative;
  pointer-events: auto;
  background: rgba(13, 21, 39, 0.94);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1.5px solid rgba(56, 189, 248, 0.35);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(56, 189, 248, 0.12);
  padding: 16px 20px;
  box-sizing: border-box;
  color: #f8fafc;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.f2f-speech-balloon.speaking {
  border-color: #10b981;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.28);
}
.f2f-speech-balloon.masked {
  border-color: rgba(245, 158, 11, 0.45);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.15);
}

/* 指向 Arthur 右肩的气泡三角小尾巴 */
.balloon-tail {
  position: absolute;
  left: -18px;
  top: 38px;
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 18px solid rgba(13, 21, 39, 0.94);
}

/* 气泡顶栏 */
.balloon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 10px;
}
.speaker-tag {
  display: flex;
  align-items: center;
  gap: 8px;
}
.speaker-avatar-icon {
  font-size: 20px;
}
.speaker-name-group {
  display: flex;
  flex-direction: column;
}
.speaker-name-group strong {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}
.speaker-name-group small {
  font-size: 10.5px;
  font-weight: 600;
  color: #38bdf8;
  letter-spacing: 0.5px;
}
.emotion-micro-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}
.emotion-micro-badge.neutral {
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.35);
}
.emotion-micro-badge.skeptical {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}
.emotion-micro-badge.annoyed {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.emotion-micro-badge.pleased {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.balloon-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-history-toggle {
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
}
.btn-history-toggle:hover {
  background: #1e293b;
  border-color: #38bdf8;
  color: #38bdf8;
}

/* Arthur 心境提示微标 */
.balloon-status-hint {
  font-size: 11.5px;
  color: #94a3b8;
  margin-bottom: 10px;
  background: rgba(0, 0, 0, 0.28);
  padding: 4px 10px;
  border-radius: 6px;
  border-left: 2px solid #38bdf8;
}

/* 台词文字 */
.balloon-speech-content {
  min-height: 48px;
}
.npc-speech-p {
  margin: 0;
  font-size: 16.5px;
  line-height: 1.55;
  color: #f1f5f9;
  font-family: Georgia, Cambria, "Times New Roman", serif;
  letter-spacing: 0.2px;
}

/* 玩家上一句对白的回声条 (Echo) */
.balloon-user-echo {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.echo-speaker {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}
.echo-text {
  font-size: 13px;
  color: #cbd5e1;
  font-style: italic;
  line-height: 1.4;
}
.echo-eval-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* 正在思考权衡条 */
.balloon-thinking-strip {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #38bdf8;
}
.balloon-thinking-strip .dot {
  width: 6px;
  height: 6px;
  background: #38bdf8;
  border-radius: 50%;
  animation: pulse-dot 1.2s infinite ease-in-out;
}
.balloon-thinking-strip .dot:nth-child(2) { animation-delay: 0.2s; }
.balloon-thinking-strip .dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse-dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1.1); opacity: 1; }
}

/* 盲听状态条 (NG+) */
.balloon-blind-content {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.blind-wave-row {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.08);
  transition: background 0.2s;
}
.blind-wave-row:hover {
  background: rgba(245, 158, 11, 0.16);
}
.blind-phone-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.blind-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
}
.blind-bars span {
  width: 3px;
  height: 6px;
  background: #f59e0b;
  border-radius: 2px;
}
.blind-bars.animating span {
  animation: barWave 0.8s infinite ease-in-out alternate;
}
.blind-bars.animating span:nth-child(2) { animation-delay: 0.1s; height: 14px; }
.blind-bars.animating span:nth-child(3) { animation-delay: 0.2s; height: 18px; }
.blind-bars.animating span:nth-child(4) { animation-delay: 0.3s; height: 12px; }
.blind-bars.animating span:nth-child(5) { animation-delay: 0.15s; height: 16px; }
.blind-bars.animating span:nth-child(6) { animation-delay: 0.25s; height: 8px; }
.blind-bars.animating span:nth-child(7) { animation-delay: 0.35s; height: 15px; }
.blind-bars.animating span:nth-child(8) { animation-delay: 0.05s; height: 10px; }
@keyframes barWave {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1.4); }
}
.blind-prompt-text {
  font-size: 12px;
  color: #fde68a;
  font-weight: 600;
}
.blind-actions-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.btn-reveal-subtitle {
  background: rgba(30, 41, 59, 0.8);
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-reveal-subtitle:hover {
  background: #1e293b;
  color: #f8fafc;
  border-color: #64748b;
}

/* 4. 浮动结算账单容器 (覆盖在中景大堂上) */
.settlement-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(4, 7, 14, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}
.settlement-overlay .receipt-stage-card {
  max-width: 620px;
  width: 100%;
  margin: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.2);
}

/* 5. 近景：前台红木大理石柜台与台面道具 (Mahogany Counter) */
.f2f-counter-foreground {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 4;
  background: linear-gradient(180deg, #1b0e07 0%, #0d0704 30%, #050302 100%);
  border-top: 2px solid #d97706;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.85);
  padding: 8px 24px 14px 24px;
  box-sizing: border-box;
}

/* 柜台边缘与陈列道具条 */
.counter-rim {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(217, 119, 6, 0.2);
  padding-bottom: 6px;
  margin-bottom: 8px;
}
.counter-gold-bevel {
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #d97706 50%, transparent 100%);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
.counter-accessories {
  display: flex;
  align-items: center;
  gap: 16px;
}
.desk-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #fde68a;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(217, 119, 6, 0.3);
  border-radius: 6px;
  padding: 3px 9px;
  user-select: none;
}
.desk-item.folio-item {
  cursor: pointer;
  transition: all 0.2s ease;
}
.desk-item.folio-item:hover {
  background: rgba(245, 158, 11, 0.15);
  border-color: #fbbf24;
  transform: translateY(-1px);
}
.terminal-led {
  color: #34d399;
  font-size: 9.5px;
  font-weight: 800;
}
.desk-item-label {
  letter-spacing: 0.5px;
}

/* 战术操作坞 (置于柜台台面) */
.f2f-action-dock {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

/* 结案锁定条 */
.completed-lock-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 8px;
  padding: 8px 16px;
}
.completed-lock-panel .lock-icon {
  font-size: 20px;
}
.completed-lock-panel .lock-text strong {
  color: #34d399;
  font-size: 13.5px;
  display: block;
}
.completed-lock-panel .lock-text p {
  margin: 2px 0 0 0;
  font-size: 11.5px;
  color: #94a3b8;
}

/* 6. 历史记录全景抽屉 */
.history-drawer-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}
.history-drawer-card {
  width: 480px;
  max-width: 90vw;
  height: 100%;
  background: #090e1a;
  border-left: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 35px rgba(0, 0, 0, 0.7);
  animation: slideDrawer 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideDrawer {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.hdc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #1e293b;
  background: #0d1527;
}
.hdc-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hdc-title-group h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}
.hdc-title-group small {
  font-size: 11px;
  color: #64748b;
}
.btn-close-hdc {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}
.btn-close-hdc:hover {
  color: #f8fafc;
}
.hdc-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hdc-row {
  padding: 10px 14px;
  border-radius: 8px;
}
.hdc-npc {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid #1e293b;
  align-self: flex-start;
  width: 90%;
}
.hdc-user {
  background: rgba(14, 116, 144, 0.15);
  border: 1px solid rgba(14, 116, 144, 0.35);
  align-self: flex-end;
  width: 90%;
}
.hdc-speaker-badge {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
}
.hdc-npc .hdc-speaker-badge { color: #38bdf8; }
.hdc-user .hdc-speaker-badge { color: #22d3ee; }
.hdc-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: #f1f5f9;
  font-family: Georgia, Cambria, serif;
}
.hdc-eval-strip {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

/* 对话微标签 (Micro-pills) */
.eval-mini-strip {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
  padding-top: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}
.eval-mini-pill {
  font-size: 10.5px;
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 600;
}
.pill-ok {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
}
.pill-tone {
  background: rgba(14, 165, 233, 0.15);
  color: #7dd3fc;
}
.pill-warn {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
}
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
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 14px 0;
}
.breakdown-head-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.bh-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.breakdown-title {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}
.breakdown-score-badge {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #34d399;
  font-size: 11px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
}
.btn-toggle-breakdown {
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-toggle-breakdown:hover {
  color: #38bdf8;
  border-color: #38bdf8;
}
.breakdown-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
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

/* 响应式适配：确保各尺寸屏幕下气泡与人物均紧凑贴合 */
@media (max-width: 1024px) {
  .f2f-actor-stage {
    padding: 0 14px;
  }
  .f2f-character-layer {
    width: 320px;
    margin-right: -24px;
  }
}
@media (max-width: 768px) {
  .f2f-character-layer {
    width: 220px;
    margin-right: -16px;
    opacity: 0.9;
  }
  .f2f-speech-balloon {
    min-width: 240px;
    padding: 12px 14px;
    margin-top: 15px;
  }
  .npc-speech-p {
    font-size: 14.5px;
  }
  .counter-accessories {
    display: none;
  }
}
@media (max-height: 750px) {
  .f2f-character-layer {
    width: 300px;
  }
  .f2f-speech-balloon {
    margin-top: 10px;
    padding: 12px 16px;
  }
  .f2f-counter-foreground {
    padding: 6px 16px 10px 16px;
  }
  .tactical-card {
    padding: 8px 10px;
  }
  .tc-english {
    font-size: 12.5px;
  }
}
</style>

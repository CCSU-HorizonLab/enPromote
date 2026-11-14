const express = require('express');
const router = express.Router();
const User = require('../modules/User');
const npcProfiles = require('./data/npcProfiles.json');
const scenarioGraph = require('./data/scenarioGraph.json');
const { inspectMessageObjectiveFeatures, evaluateRapportSettlement } = require('./services/rapportScaleEngine');
const { chatWithNpc, generateSettlementReceipt, transcribeUserAudio } = require('./services/aiService');
const { generateSpeech, TTS_MODEL } = require('./services/ttsService');
const { getSceneWordBank } = require('../config/sceneVocabularies');
const { syncUserWordsForScene } = require('../utils/sceneWordSync');

// 内存会话缓存 (按登录用户隔离，兼容未登录沙盒试玩)
const sessions = new Map();

const PRESTIGE_RANK = {
  assisted: 1,
  standard: 2,
  authentic: 3,
  black_gold: 4
};

function resolveSessionId(req, explicitSessionId = null) {
  const baseId = explicitSessionId || req.body?.sessionId || req.query?.sessionId || 'default';
  if (req.session?.userid) {
    return `${baseId}_user_${req.session.userid}`;
  }
  return baseId;
}

/**
 * 将模块 B 结算星级、荣誉段位与黑金盲听免修特权持久化至模块 A 对应章节进度
 */
async function persistAvgSettlementToChapter({ userId, chapterId = 'A', settlement }) {
  if (!userId || !settlement) {
    return { persisted: false };
  }
  try {
    const user = await User.findById(userId);
    if (!user) return { persisted: false };

    const targetChapter = String(chapterId || 'A').toUpperCase();
    const existing = user.chapters.get(targetChapter) || {
      level: 1,
      score: 0,
      completedWords: 0,
      wordP: false,
      spellP: false,
      listenP: false,
      customsP: false,
      coverP: false,
      avgStars: 0,
      avgScore: 0,
      avgPrestigeTier: '',
      avgCompletedAt: null,
      privilegeExempted: false
    };

    const existingObj = typeof existing.toObject === 'function' ? existing.toObject() : { ...existing };
    const nextStars = Math.max(existingObj.avgStars || 0, settlement.stars || 0);
    const nextScore = Math.max(existingObj.avgScore || 0, settlement.finalScore || 0);
    const currentRank = PRESTIGE_RANK[existingObj.avgPrestigeTier] || 0;
    const incomingRank = PRESTIGE_RANK[settlement.prestigeTier] || 0;
    const nextTier = incomingRank >= currentRank ? (settlement.prestigeTier || existingObj.avgPrestigeTier) : existingObj.avgPrestigeTier;
    const unlockedBlackGold = Boolean(existingObj.privilegeExempted || settlement.prestigeTier === 'black_gold' || settlement.privilegeUnlocked);

    const updated = {
      ...existingObj,
      avgStars: nextStars,
      avgScore: nextScore,
      avgPrestigeTier: nextTier,
      avgCompletedAt: new Date(),
      privilegeExempted: unlockedBlackGold
    };

    // 二周目黑金盲听免修特权：点亮模块 A 酒店篇全关免修通行
    if (unlockedBlackGold) {
      updated.wordP = true;
      updated.spellP = true;
      updated.listenP = true;
      updated.customsP = true;
      updated.coverP = true;
      updated.level = Math.max(updated.level || 1, 6);
    }

    user.chapters.set(targetChapter, updated);
    user.markModified('chapters');
    await user.save();

    return {
      persisted: true,
      chapterId: targetChapter,
      avgStars: updated.avgStars,
      avgScore: updated.avgScore,
      avgPrestigeTier: updated.avgPrestigeTier,
      privilegeExempted: updated.privilegeExempted
    };
  } catch (err) {
    console.warn('[AVG Persist Settlement Warning]:', err.message);
    return { persisted: false, error: err.message };
  }
}

function selectRandomTwist(scenario) {
  const pool = scenario?.ngPlusTwists;
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

function getOrCreateSession(sessionId = 'default', requestedRunMode = null) {
  const scenario = scenarioGraph['scenario_hotel_01'];
  if (!sessions.has(sessionId)) {
    const runMode = requestedRunMode === 'ng_plus' ? 'ng_plus' : 'standard';
    sessions.set(sessionId, {
      scenarioId: 'scenario_hotel_01',
      npcId: 'arthur',
      runMode,
      activeTwist: runMode === 'ng_plus' ? selectRandomTwist(scenario) : null,
      twistAddressed: runMode !== 'ng_plus',
      subtitleRevealedCount: 0,
      revealedIndices: [],
      usedCardsMode: false,
      round: 0,
      status: 'active', // 'active' | 'completed'
      history: [],
      // 确定性天平跟踪状态
      factsVerified: new Set(),     // 已确认事实: 'hasNameStated', 'hasProofProvided'
      allWeaponsHit: new Set(),     // 已命中的武器短语
      toneScores: [],               // 各轮 LLM 礼貌分 (0~30)
      penaltyPoints: 0,             // 累积扣减分 (提前抢跑/粗鲁)
      usedFullScaffold: false,      // 是否启用了保底小抄整句 (若启用则封顶2星及格)
      settlement: null              // 结案小票数据
    });
  } else if (
    requestedRunMode &&
    (requestedRunMode === 'standard' || requestedRunMode === 'ng_plus')
  ) {
    const existing = sessions.get(sessionId);
    if (existing.round === 0 && existing.history.length === 0 && existing.runMode !== requestedRunMode) {
      existing.runMode = requestedRunMode;
      existing.activeTwist = requestedRunMode === 'ng_plus' ? selectRandomTwist(scenario) : null;
      existing.twistAddressed = requestedRunMode !== 'ng_plus';
      existing.subtitleRevealedCount = 0;
      existing.revealedIndices = [];
    }
  }
  return sessions.get(sessionId);
}

// 计算当前交涉阶段节奏 (防一回杀节奏锁)
function getPacingInfo(round, factsVerified) {
  const hasName = factsVerified.has('hasNameStated');
  if (round <= 1 && !hasName) {
    return {
      phase: 'phase1',
      label: 'Phase 1: 核实破冰期',
      hint: '⚠️ Arthur 正在查验身份。请先礼貌报出预订姓名与证件/订单号，切勿直接要求升房！'
    };
  }
  return {
    phase: 'phase2',
    label: 'Phase 2: 权益博弈期',
    hint: '🔥 身份已核实！正是提出【免费升级 complimentary upgrade】与协商权益的最佳时机！'
  };
}

// 实时估算当前破防天平分 (0~100)
function computeLiveRapportScore(session) {
  let factScore = 0;
  if (session.factsVerified.has('hasNameStated')) factScore += 20;
  if (session.factsVerified.has('hasProofProvided')) factScore += 20;

  const chunkScore = Math.min(30, session.allWeaponsHit.size * 10);
  const avgTone = session.toneScores.length > 0
    ? session.toneScores.reduce((a, b) => a + b, 0) / session.toneScores.length
    : 15; // 默认初始15分
  const raw = factScore + chunkScore + Math.round(avgTone) - session.penaltyPoints;
  const score = Math.max(10, Math.min(100, raw));
  // 若启用了全句小抄，实时得分上限压制在 75 (2星标准及格)
  return session.usedFullScaffold ? Math.min(75, score) : score;
}

/**
 * GET /api/avg-test/init
 */
router.get('/init', (req, res) => {
  try {
    const sessionId = resolveSessionId(req, req.query.sessionId);
    const requestedRunMode = req.query.runMode || null;
    const session = getOrCreateSession(sessionId, requestedRunMode);
    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    if (!scenario || !npc) {
      return res.status(404).json({ success: false, message: '场景或角色不存在' });
    }

    const liveScore = computeLiveRapportScore(session);
    const pacing = getPacingInfo(session.round, session.factsVerified);
    const effectiveOpeningLine = (session.runMode === 'ng_plus' && session.activeTwist?.openingLine)
      ? session.activeTwist.openingLine
      : scenario.openingLine;

    res.json({
      success: true,
      data: {
        isLoggedIn: Boolean(req.session?.userid),
        scenarioId: scenario.scenarioId,
        title: scenario.title,
        sceneVisual: scenario.sceneVisual,
        runMode: session.runMode,
        activeTwist: session.activeTwist
          ? {
              twistId: session.activeTwist.twistId,
              title: session.activeTwist.title,
              phoneContextHint: session.activeTwist.phoneContextHint
            }
          : null,
        twistAddressed: session.twistAddressed,
        subtitleRevealedCount: session.subtitleRevealedCount,
        revealedIndices: session.revealedIndices,
        usedCardsMode: session.usedCardsMode,
        npc: {
          npcId: npc.npcId,
          name: npc.name,
          title: npc.title,
          persona: npc.persona,
          ttsVoice: npc.ttsVoice || 'Charon',
          avatarAssets: npc.avatarAssets
        },
        ttsModel: TTS_MODEL,
        dramaticContext: scenario.dramaticContext,
        openingLine: effectiveOpeningLine,
        objectiveDescription: scenario.objectiveDescription,
        inventoryWeapons: scenario.inventoryWeapons,
        smartSnapMatrix: scenario.smartSnapMatrix,
        tacticalRounds: scenario.tacticalRounds || [],
        climaxThresholdRound: scenario.climaxThresholdRound,
        currentRound: session.round,
        status: session.status,
        pacing,
        liveScore,
        usedFullScaffold: session.usedFullScaffold,
        factsVerified: Array.from(session.factsVerified),
        weaponsHit: Array.from(session.allWeaponsHit),
        history: session.history || [],
        settlement: session.settlement
      }
    });
  } catch (error) {
    console.error('[AVG Init Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/chat
 * 推进交涉：防一回杀节奏锁、客观词块捕获、LLM礼貌打分
 */
router.post('/chat', async (req, res) => {
  try {
    const { sessionId: rawSessionId = 'default', chapter = 'A', message, usedFullScaffold, ttsEnabled, audioBase64, audioMimeType, inputMode } = req.body || {};
    const sessionId = resolveSessionId(req, rawSessionId);

    let userMessage = message ? message.trim() : '';
    let isVoiceInput = false;

    // 若上传了语音音频，直接使用 Gemini 原生多模态转写口语
    if (audioBase64) {
      isVoiceInput = true;
      try {
        const transcribed = await transcribeUserAudio({
          audioBase64,
          mimeType: audioMimeType || 'audio/webm'
        });
        if (!transcribed || !transcribed.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Gemini 未能从录音中听到清晰的英文，请尝试大声清晰地重录！'
          });
        }
        userMessage = transcribed.trim();
      } catch (voiceErr) {
        console.error('[AVG Voice Ingest Error]:', voiceErr);
        return res.status(500).json({ success: false, message: '语音解析异常: ' + voiceErr.message });
      }
    }

    if (!userMessage) {
      return res.status(400).json({ success: false, message: '输入内容或录音不能为空' });
    }

    const session = getOrCreateSession(sessionId);
    if (usedFullScaffold === true) {
      session.usedFullScaffold = true;
    }
    if (!isVoiceInput && inputMode === 'cards') {
      session.usedCardsMode = true;
    }

    // 核心拦截：如果已结案落锁，直接拒绝发对白
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '本场景交涉已结案落幕。请点击“重新挑战”再次演练！',
        isCompleted: true
      });
    }

    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    // 1. 客观特征与节奏锁扫描
    const objectiveTriggers = inspectMessageObjectiveFeatures({
      userMessage: userMessage,
      currentRound: session.round,
      inventoryWeapons: scenario.inventoryWeapons,
      accumulatedFacts: session.factsVerified
    });

    if (objectiveTriggers.hasNameStated) {
      session.factsVerified.add('hasNameStated');
    }
    if (objectiveTriggers.hasProofProvided) {
      session.factsVerified.add('hasProofProvided');
    }
    objectiveTriggers.weaponsHit.forEach(w => session.allWeaponsHit.add(w));

    // 防一回杀惩罚触发
    let penaltyTag = null;
    if (objectiveTriggers.prematureUpgradePenalty) {
      session.penaltyPoints += 15;
      penaltyTag = '⚠️ 操之过急 (-15: 未查实即索要升房)';
    }

    const currentPacing = getPacingInfo(session.round, session.factsVerified);

    // 2. 调用 AI 进行深入角色扮演与礼貌打分
    const aiResult = await chatWithNpc({
      scenario,
      npc,
      history: session.history,
      userMessage: userMessage,
      pacingPhase: currentPacing.label,
      runMode: session.runMode,
      activeTwist: session.activeTwist,
      twistAlreadyAddressed: session.twistAddressed
    });

    if (session.runMode === 'ng_plus' && aiResult.evaluation?.twistAddressed === true) {
      session.twistAddressed = true;
    }

    session.round += 1;
    session.history.push({
      role: 'user',
      content: userMessage,
      isVoiceInput,
      evaluation: {
        toneScore: aiResult.evaluation.toneScore,
        toneFeedback: aiResult.evaluation.toneFeedback,
        dynamicTag: penaltyTag || aiResult.evaluation.dynamicTag,
        twistAddressed: aiResult.evaluation.twistAddressed !== false
      }
    });
    session.history.push({
      role: 'assistant',
      content: aiResult.npcReply,
      emotion: aiResult.emotion
    });

    // 记录礼貌分
    const toneScore = Math.max(0, Math.min(30, aiResult.evaluation.toneScore));
    session.toneScores.push(toneScore);

    const liveScore = computeLiveRapportScore(session);
    const updatedPacing = getPacingInfo(session.round, session.factsVerified);

    let autoSettlement = null;
    let isAutoCompleted = false;

    // 当完成第 3 回合对白时，自动触发结案落锁，打印消费结案小票
    if (session.round >= 3) {
      isAutoCompleted = true;
      const statement = userMessage;
      const avgTone = session.toneScores.length > 0
        ? session.toneScores.reduce((a, b) => a + b, 0) / session.toneScores.length
        : 15;

      const settlementMath = evaluateRapportSettlement({
        factsVerified: session.factsVerified,
        allWeaponsHit: session.allWeaponsHit,
        avgToneScore: avgTone,
        penaltyPoints: session.penaltyPoints,
        usedFullScaffold: session.usedFullScaffold,
        usedCardsMode: session.usedCardsMode,
        runMode: session.runMode,
        subtitleRevealedCount: session.subtitleRevealedCount,
        twistAddressed: session.twistAddressed,
        scenario
      });

      const receiptData = await generateSettlementReceipt({
        scenario,
        npc,
        history: session.history,
        finalStatement: statement,
        settlement: settlementMath
      });

      autoSettlement = {
        finalScore: settlementMath.finalScore,
        stars: settlementMath.stars,
        outcome: settlementMath.outcome,
        runMode: settlementMath.runMode,
        prestigeTier: settlementMath.prestigeTier,
        prestigeLabel: settlementMath.prestigeLabel,
        prestigeReason: settlementMath.prestigeReason,
        privilegeUnlocked: settlementMath.privilegeUnlocked,
        twistAddressed: settlementMath.twistAddressed,
        subtitleRevealedCount: settlementMath.subtitleRevealedCount,
        usedCardsMode: settlementMath.usedCardsMode,
        title: settlementMath.title,
        storyText: settlementMath.storyText,
        scaffoldCapTriggered: settlementMath.scaffoldCapTriggered,
        usedFullScaffold: session.usedFullScaffold,
        scoreBreakdown: settlementMath.scoreBreakdown,
        npcFinalReply: receiptData.npcFinalReply,
        npcFinalEmotion: receiptData.npcFinalEmotion,
        oneKeyTakeaway: receiptData.oneKeyTakeaway
      };

      session.status = 'completed';
      session.settlement = autoSettlement;

      if (req.session?.userid) {
        const persisted = await persistAvgSettlementToChapter({
          userId: req.session.userid,
          chapterId: chapter,
          settlement: autoSettlement
        });
        autoSettlement.persistedChapter = persisted;
      }
    }

    // 3. TTS 语音生成（受前端 ttsEnabled 开关控制）
    let audioDataUrl = null;
    if (ttsEnabled === true) {
      try {
        const replyToSpeak = autoSettlement
          ? `${aiResult.npcReply} ${autoSettlement.npcFinalReply || ''}`
          : aiResult.npcReply;
        audioDataUrl = await generateSpeech({
          text: replyToSpeak,
          voiceName: npc.ttsVoice || 'Charon'
        });
        // 回写到最近一条助手记录中
        const lastMsg = session.history[session.history.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.audio = audioDataUrl;
        }
      } catch (ttsErr) {
        console.warn('[AVG Chat TTS Warning]:', ttsErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        transcription: isVoiceInput ? userMessage : null,
        isVoiceInput,
        npcReply: aiResult.npcReply,
        emotion: autoSettlement?.npcFinalEmotion || aiResult.emotion,
        audio: audioDataUrl,
        evaluation: {
          toneScore: aiResult.evaluation.toneScore,
          toneFeedback: aiResult.evaluation.toneFeedback,
          dynamicTag: penaltyTag || aiResult.evaluation.dynamicTag,
          twistAddressed: aiResult.evaluation.twistAddressed !== false
        },
        runMode: session.runMode,
        twistAddressed: session.twistAddressed,
        subtitleRevealedCount: session.subtitleRevealedCount,
        usedCardsMode: session.usedCardsMode,
        currentRound: session.round,
        pacing: updatedPacing,
        liveScore: autoSettlement ? autoSettlement.finalScore : liveScore,
        usedFullScaffold: session.usedFullScaffold,
        factsVerified: Array.from(session.factsVerified),
        weaponsHit: Array.from(session.allWeaponsHit),
        isCompleted: isAutoCompleted,
        settlement: autoSettlement
      }
    });
  } catch (error) {
    console.error('[AVG Chat Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/transcribe
 * 单独使用 Gemini 原生多模态转写上传音频
 */
router.post('/transcribe', async (req, res) => {
  try {
    const { audioBase64, audioMimeType = 'audio/webm' } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ success: false, message: '音频数据不能为空' });
    }
    const transcribed = await transcribeUserAudio({ audioBase64, mimeType: audioMimeType });
    res.json({
      success: true,
      data: {
        text: transcribed
      }
    });
  } catch (error) {
    console.error('[AVG Transcribe Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/tts
 * 手动/点播指定文本的 Gemini 3.8 Flash-Lite TTS 语音
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, voiceName, npcId = 'arthur' } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: '文本内容不能为空' });
    }
    const npc = npcProfiles[npcId];
    const targetVoice = voiceName || npc?.ttsVoice || 'Charon';
    const audioDataUrl = await generateSpeech({ text: text.trim(), voiceName: targetVoice });

    if (!audioDataUrl) {
      return res.status(500).json({ success: false, message: '语音合成失败，请检查网络或 API 配置' });
    }

    res.json({
      success: true,
      data: {
        audio: audioDataUrl,
        voiceName: targetVoice,
        model: TTS_MODEL
      }
    });
  } catch (error) {
    console.error('[AVG TTS Route Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/resolve-check
 * 结案请求：100% 确定性天平计算 + 生成小票明细与单句破局金句
 */
router.post('/resolve-check', async (req, res) => {
  try {
    const { sessionId: rawSessionId = 'default', chapter = 'A', finalStatement } = req.body || {};
    const sessionId = resolveSessionId(req, rawSessionId);
    const session = getOrCreateSession(sessionId);

    if (session.status === 'completed' && session.settlement) {
      if (req.session?.userid && !session.settlement.persistedChapter?.persisted) {
        session.settlement.persistedChapter = await persistAvgSettlementToChapter({
          userId: req.session.userid,
          chapterId: chapter,
          settlement: session.settlement
        });
      }
      return res.json({
        success: true,
        data: {
          settlement: session.settlement,
          alreadyCompleted: true
        }
      });
    }

    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    const statement = finalStatement || (session.history.length > 0 ? session.history[session.history.length - 1].content : "Thank you for looking into my reservation.");

    // 1. 确定性天平纯算
    const avgTone = session.toneScores.length > 0
      ? session.toneScores.reduce((a, b) => a + b, 0) / session.toneScores.length
      : 15;

    const settlementMath = evaluateRapportSettlement({
      factsVerified: session.factsVerified,
      allWeaponsHit: session.allWeaponsHit,
      avgToneScore: avgTone,
      penaltyPoints: session.penaltyPoints,
      usedFullScaffold: session.usedFullScaffold,
      usedCardsMode: session.usedCardsMode,
      runMode: session.runMode,
      subtitleRevealedCount: session.subtitleRevealedCount,
      twistAddressed: session.twistAddressed,
      scenario
    });

    // 2. 生成结案小票 NPC 台词与单句破局金句
    const receiptData = await generateSettlementReceipt({
      scenario,
      npc,
      history: session.history,
      finalStatement: statement,
      settlement: settlementMath
    });

    const fullSettlement = {
      finalScore: settlementMath.finalScore,
      stars: settlementMath.stars,
      outcome: settlementMath.outcome,
      runMode: settlementMath.runMode,
      prestigeTier: settlementMath.prestigeTier,
      prestigeLabel: settlementMath.prestigeLabel,
      prestigeReason: settlementMath.prestigeReason,
      privilegeUnlocked: settlementMath.privilegeUnlocked,
      twistAddressed: settlementMath.twistAddressed,
      subtitleRevealedCount: settlementMath.subtitleRevealedCount,
      usedCardsMode: settlementMath.usedCardsMode,
      title: settlementMath.title,
      storyText: settlementMath.storyText,
      scaffoldCapTriggered: settlementMath.scaffoldCapTriggered,
      usedFullScaffold: session.usedFullScaffold,
      scoreBreakdown: settlementMath.scoreBreakdown,
      npcFinalReply: receiptData.npcFinalReply,
      npcFinalEmotion: receiptData.npcFinalEmotion,
      oneKeyTakeaway: receiptData.oneKeyTakeaway
    };

    // 3. 落锁封板并持久化至登录账号模块 A 章节进度
    session.status = 'completed';
    session.settlement = fullSettlement;

    if (req.session?.userid) {
      fullSettlement.persistedChapter = await persistAvgSettlementToChapter({
        userId: req.session.userid,
        chapterId: chapter,
        settlement: fullSettlement
      });
    }

    res.json({
      success: true,
      data: {
        settlement: fullSettlement
      }
    });
  } catch (error) {
    console.error('[AVG Check Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/sync-words
 * 将本局破局金句中的高频核心词与实战词块同步沉淀至模块 A (UserWord sence=chapter, source='avg_boss')
 */
router.post('/sync-words', async (req, res) => {
  try {
    const { sessionId: rawSessionId = 'default', chapter = 'A', words = [], takeaway = '' } = req.body || {};
    const userId = req.session?.userid;

    if (!userId) {
      return res.json({
        success: true,
        data: {
          loggedIn: false,
          requiresLogin: true,
          syncedCount: 0,
          syncedWords: [],
          message: '当前为独立试玩状态，暂未绑定学习账号；登录后结算即可永久同步至【模块 A：明日复习计划】。'
        }
      });
    }

    const sessionId = resolveSessionId(req, rawSessionId);
    const session = sessions.get(sessionId);

    const candidateWords = [...(Array.isArray(words) ? words : [])];
    const effectiveTakeaway = takeaway || session?.settlement?.oneKeyTakeaway?.nativeSentence || session?.settlement?.oneKeyTakeaway?.english || '';

    // 提取金句与命中词块中的核心英文实词
    const rawTokens = [];
    if (effectiveTakeaway) {
      rawTokens.push(...effectiveTakeaway.toLowerCase().split(/[^a-z]+/));
    }
    if (session?.allWeaponsHit) {
      Array.from(session.allWeaponsHit).forEach(phrase => {
        rawTokens.push(...String(phrase).toLowerCase().split(/[^a-z]+/));
      });
    }

    const bankKeywords = (getSceneWordBank(chapter) || []).map(item => item.word.toLowerCase());
    bankKeywords.forEach(kw => {
      if (rawTokens.includes(kw)) {
        candidateWords.push(kw);
      }
    });

    const syncedWords = await syncUserWordsForScene({
      userId,
      words: candidateWords,
      chapter,
      source: 'avg_boss',
      dueNow: true
    });

    res.json({
      success: true,
      data: {
        loggedIn: true,
        requiresLogin: false,
        chapter: String(chapter || 'A').toUpperCase(),
        syncedCount: syncedWords.length,
        syncedWords,
        message: `已将 ${syncedWords.length} 个本局核心词汇同步至【模块 A：复习计划】！`
      }
    });
  } catch (error) {
    console.error('[AVG Sync Words Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/reveal-subtitle
 * 二周目盲听模式：记录玩家点击“显露台词”次数（触发后剥夺黑金纯度认证）
 */
router.post('/reveal-subtitle', (req, res) => {
  try {
    const { sessionId: rawSessionId = 'default', bubbleKey = 'unknown' } = req.body || {};
    const sessionId = resolveSessionId(req, rawSessionId);
    const session = getOrCreateSession(sessionId);
    if (!session.revealedIndices.includes(bubbleKey)) {
      session.revealedIndices.push(bubbleKey);
      session.subtitleRevealedCount += 1;
    }
    res.json({
      success: true,
      data: {
        subtitleRevealedCount: session.subtitleRevealedCount,
        revealedIndices: session.revealedIndices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/reset
 * GET  /api/avg-test/reset
 */
router.all('/reset', (req, res) => {
  try {
    const rawSessionId = req.body?.sessionId || req.query?.sessionId || 'default';
    const sessionId = resolveSessionId(req, rawSessionId);
    const runMode = req.body?.runMode || req.query?.runMode || null;
    sessions.delete(sessionId);
    if (runMode) {
      getOrCreateSession(sessionId, runMode);
    }
    res.json({ success: true, message: 'Session reset successfully', runMode: runMode || 'standard' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

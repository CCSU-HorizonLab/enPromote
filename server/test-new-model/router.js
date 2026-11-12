const express = require('express');
const router = express.Router();
const npcProfiles = require('./data/npcProfiles.json');
const scenarioGraph = require('./data/scenarioGraph.json');
const { inspectMessageObjectiveFeatures, evaluateRapportSettlement } = require('./services/rapportScaleEngine');
const { chatWithNpc, generateSettlementReceipt, transcribeUserAudio } = require('./services/aiService');
const { generateSpeech, TTS_MODEL } = require('./services/ttsService');

// 内存会话缓存 (用于测试调试)
const sessions = new Map();

function getOrCreateSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      scenarioId: 'scenario_hotel_01',
      npcId: 'arthur',
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
    const sessionId = req.query.sessionId || 'default';
    const session = getOrCreateSession(sessionId);
    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    if (!scenario || !npc) {
      return res.status(404).json({ success: false, message: '场景或角色不存在' });
    }

    const liveScore = computeLiveRapportScore(session);
    const pacing = getPacingInfo(session.round, session.factsVerified);

    res.json({
      success: true,
      data: {
        scenarioId: scenario.scenarioId,
        title: scenario.title,
        sceneVisual: scenario.sceneVisual,
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
        openingLine: scenario.openingLine,
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
    const { sessionId = 'default', message, usedFullScaffold, ttsEnabled, audioBase64, audioMimeType } = req.body || {};

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
      pacingPhase: currentPacing.label
    });

    session.round += 1;
    session.history.push({
      role: 'user',
      content: userMessage,
      isVoiceInput,
      evaluation: {
        toneScore: aiResult.evaluation.toneScore,
        toneFeedback: aiResult.evaluation.toneFeedback,
        dynamicTag: penaltyTag || aiResult.evaluation.dynamicTag
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
      const statement = message.trim();
      const avgTone = session.toneScores.length > 0
        ? session.toneScores.reduce((a, b) => a + b, 0) / session.toneScores.length
        : 15;

      const settlementMath = evaluateRapportSettlement({
        factsVerified: session.factsVerified,
        allWeaponsHit: session.allWeaponsHit,
        avgToneScore: avgTone,
        penaltyPoints: session.penaltyPoints,
        usedFullScaffold: session.usedFullScaffold,
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
          dynamicTag: penaltyTag || aiResult.evaluation.dynamicTag
        },
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
    const { sessionId = 'default', finalStatement } = req.body || {};
    const session = getOrCreateSession(sessionId);

    if (session.status === 'completed' && session.settlement) {
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
      title: settlementMath.title,
      storyText: settlementMath.storyText,
      scaffoldCapTriggered: settlementMath.scaffoldCapTriggered,
      usedFullScaffold: session.usedFullScaffold,
      scoreBreakdown: settlementMath.scoreBreakdown,
      npcFinalReply: receiptData.npcFinalReply,
      npcFinalEmotion: receiptData.npcFinalEmotion,
      oneKeyTakeaway: receiptData.oneKeyTakeaway
    };

    // 3. 落锁封板
    session.status = 'completed';
    session.settlement = fullSettlement;

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
 * POST /api/avg-test/reset
 * GET  /api/avg-test/reset
 */
router.all('/reset', (req, res) => {
  try {
    const sessionId = req.body?.sessionId || req.query?.sessionId || 'default';
    sessions.delete(sessionId);
    res.json({ success: true, message: 'Session reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const npcProfiles = require('./data/npcProfiles.json');
const scenarioGraph = require('./data/scenarioGraph.json');
const { inspectMessageObjectiveFeatures, evaluateRapportSettlement } = require('./services/rapportScaleEngine');
const { chatWithNpc, generateSettlementReceipt } = require('./services/aiService');

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
          avatarAssets: npc.avatarAssets
        },
        dramaticContext: scenario.dramaticContext,
        openingLine: scenario.openingLine,
        objectiveDescription: scenario.objectiveDescription,
        inventoryWeapons: scenario.inventoryWeapons,
        climaxThresholdRound: scenario.climaxThresholdRound,
        currentRound: session.round,
        status: session.status,
        pacing,
        liveScore,
        usedFullScaffold: session.usedFullScaffold,
        factsVerified: Array.from(session.factsVerified),
        weaponsHit: Array.from(session.allWeaponsHit),
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
    const { sessionId = 'default', message, usedFullScaffold } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: '输入内容不能为空' });
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
      userMessage: message.trim(),
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
      userMessage: message.trim(),
      pacingPhase: currentPacing.label
    });

    session.round += 1;
    session.history.push({ role: 'user', content: message.trim() });
    session.history.push({ role: 'assistant', content: aiResult.npcReply });

    // 记录礼貌分
    const toneScore = Math.max(0, Math.min(30, aiResult.evaluation.toneScore));
    session.toneScores.push(toneScore);

    const liveScore = computeLiveRapportScore(session);
    const updatedPacing = getPacingInfo(session.round, session.factsVerified);

    res.json({
      success: true,
      data: {
        npcReply: aiResult.npcReply,
        emotion: aiResult.emotion,
        evaluation: {
          toneScore: aiResult.evaluation.toneScore,
          toneFeedback: aiResult.evaluation.toneFeedback,
          dynamicTag: penaltyTag || aiResult.evaluation.dynamicTag
        },
        currentRound: session.round,
        pacing: updatedPacing,
        liveScore,
        usedFullScaffold: session.usedFullScaffold,
        factsVerified: Array.from(session.factsVerified),
        weaponsHit: Array.from(session.allWeaponsHit)
      }
    });
  } catch (error) {
    console.error('[AVG Chat Error]:', error);
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

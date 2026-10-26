const express = require('express');
const router = express.Router();
const npcProfiles = require('./data/npcProfiles.json');
const scenarioGraph = require('./data/scenarioGraph.json');
const { executeCheck } = require('./services/dndCheckEngine');
const { chatWithNpc, generateCheckOutcomePlot } = require('./services/aiService');

// 简单内存会话缓存 (用于测试调试)
const sessions = new Map();

function getOrCreateSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      scenarioId: 'scenario_coffee_01',
      npcId: 'chloe',
      round: 0,
      history: [],
      accumulatedModifiers: {
        toneMod: 0,
        fluencyMod: 0,
        keywordMod: 0,
        allKeywordsHit: new Set()
      },
      affinityScore: 1 // 初始好感修正 +1
    });
  }
  return sessions.get(sessionId);
}

/**
 * GET /api/avg-test/init
 * 初始化并获取关卡信息
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
        targetDc: scenario.targetDc,
        objectiveDescription: scenario.objectiveDescription,
        recommendedKeywords: scenario.recommendedKeywords,
        openingLine: scenario.openingLine,
        climaxThresholdRound: scenario.climaxThresholdRound,
        currentRound: session.round,
        accumulatedModifiers: {
          toneMod: session.accumulatedModifiers.toneMod,
          fluencyMod: session.accumulatedModifiers.fluencyMod,
          keywordMod: session.accumulatedModifiers.keywordMod,
          affinityMod: session.affinityScore,
          keywordsHit: Array.from(session.accumulatedModifiers.allKeywordsHit)
        }
      }
    });
  } catch (error) {
    console.error('[AVG Init Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/chat
 * 发送英文对白推进
 */
router.post('/chat', async (req, res) => {
  try {
    const { sessionId = 'default', message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: '输入内容不能为空' });
    }

    const session = getOrCreateSession(sessionId);
    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    // 调用 AI 服务进行对白与语言诊断
    const aiResult = await chatWithNpc({
      scenario,
      npc,
      history: session.history,
      userMessage: message.trim()
    });

    // 累加语言加成
    session.round += 1;
    session.history.push({ role: 'user', content: message.trim() });
    session.history.push({ role: 'assistant', content: aiResult.npcReply });

    // 累计加成取最新或者平滑累计
    session.accumulatedModifiers.toneMod = Math.max(-2, Math.min(2, session.accumulatedModifiers.toneMod + aiResult.evaluation.toneMod));
    session.accumulatedModifiers.fluencyMod = Math.max(-1, Math.min(2, session.accumulatedModifiers.fluencyMod + aiResult.evaluation.fluencyMod));
    if (aiResult.evaluation.keywordsHit && aiResult.evaluation.keywordsHit.length > 0) {
      aiResult.evaluation.keywordsHit.forEach(k => session.accumulatedModifiers.allKeywordsHit.add(k));
    }
    session.accumulatedModifiers.keywordMod = Math.min(3, session.accumulatedModifiers.allKeywordsHit.size);

    res.json({
      success: true,
      data: {
        npcReply: aiResult.npcReply,
        emotion: aiResult.emotion,
        evaluation: aiResult.evaluation,
        currentRound: session.round,
        accumulatedModifiers: {
          toneMod: session.accumulatedModifiers.toneMod,
          fluencyMod: session.accumulatedModifiers.fluencyMod,
          keywordMod: session.accumulatedModifiers.keywordMod,
          affinityMod: session.affinityScore,
          keywordsHit: Array.from(session.accumulatedModifiers.allKeywordsHit),
          totalPendingMod: session.accumulatedModifiers.toneMod +
            session.accumulatedModifiers.fluencyMod +
            session.accumulatedModifiers.keywordMod +
            session.affinityScore
        }
      }
    });
  } catch (error) {
    console.error('[AVG Chat Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/resolve-check
 * 发起决胜关键检定 (DND Check Roll)
 */
router.post('/resolve-check', async (req, res) => {
  try {
    const { sessionId = 'default', finalStatement, overrideRoll } = req.body;
    const session = getOrCreateSession(sessionId);
    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    const statement = finalStatement || (session.history.length > 0 ? session.history[session.history.length - 1].content : "Could I have an oat milk latte please?");

    // 1. 执行数学检定
    const checkResult = executeCheck({
      targetDc: scenario.targetDc,
      baseRoll: typeof overrideRoll === 'number' ? overrideRoll : undefined,
      affinityMod: session.affinityScore,
      languageMods: {
        toneMod: session.accumulatedModifiers.toneMod,
        fluencyMod: session.accumulatedModifiers.fluencyMod,
        keywordMod: session.accumulatedModifiers.keywordMod
      }
    });

    // 2. 生成结局与结语剧情
    const plotResult = await generateCheckOutcomePlot({
      scenario,
      npc,
      history: session.history,
      finalStatement: statement,
      checkResult
    });

    const endingMeta = scenario.endings[checkResult.outcome] || scenario.endings.success;

    res.json({
      success: true,
      data: {
        checkResult,
        ending: {
          type: checkResult.outcome,
          title: endingMeta.title,
          storyText: endingMeta.storyText,
          npcFinalReply: plotResult.npcFinalReply,
          npcFinalEmotion: plotResult.npcFinalEmotion,
          takeawayTip: plotResult.takeawayTip
        }
      }
    });
  } catch (error) {
    console.error('[AVG Check Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/avg-test/reset
 * 重置会话
 */
router.post('/reset', (req, res) => {
  const sessionId = req.body.sessionId || 'default';
  sessions.delete(sessionId);
  res.json({ success: true, message: 'Session reset successfully' });
});

module.exports = router;

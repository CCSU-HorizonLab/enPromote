const express = require('express');
const router = express.Router();
const npcProfiles = require('./data/npcProfiles.json');
const scenarioGraph = require('./data/scenarioGraph.json');
const { executeCheck } = require('./services/dndCheckEngine');
const { chatWithNpc, generateCheckOutcomePlot } = require('./services/aiService');

// 内存会话缓存 (用于测试调试)
const sessions = new Map();

function getOrCreateSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      scenarioId: 'scenario_coffee_01',
      npcId: 'chloe',
      round: 0,
      status: 'active', // 'active' | 'completed'
      history: [],
      // 好感度心智槽 (0 ~ 100 EXP)
      affinityExp: 30, // 初始 30 EXP (对应好感加成 +1)
      affinityMod: 1,
      // 记录历史评分流
      toneHistory: [],
      fluencyHistory: [],
      allKeywordsHit: new Set(),
      checkResult: null,
      ending: null
    });
  }
  return sessions.get(sessionId);
}

// 根据经验值计算好感修正点数 (-1 ~ +3)
function calculateAffinityMod(exp) {
  if (exp < 20) return -1;
  if (exp < 45) return 1;
  if (exp < 75) return 2;
  return 3;
}

// 计算当前交涉阶段
function getPacingPhase(round) {
  if (round <= 2) return { phase: 'warmup', label: '铺垫破冰期', hint: '建议先表达对忙碌的理解，铺垫基础饮品需求。' };
  if (round <= 4) return { phase: 'prime', label: '黄金决胜期', hint: '好感与状态正处于巅峰，正是提出关键非标特调诉求的最佳时机！' };
  return { phase: 'urgent', label: '高峰催促期', hint: '后面队伍在催促，Chloe 耐心正被消耗，请尽快发起决胜检定！' };
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

    const avgTone = session.toneHistory.length
      ? Math.round(session.toneHistory.reduce((a, b) => a + b, 0) / session.toneHistory.length)
      : 0;
    const avgFluency = session.fluencyHistory.length
      ? Math.round(session.fluencyHistory.reduce((a, b) => a + b, 0) / session.fluencyHistory.length)
      : 0;
    const keywordMod = Math.min(3, session.allKeywordsHit.size);
    const affinityMod = calculateAffinityMod(session.affinityExp);

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
        status: session.status,
        pacing: getPacingPhase(session.round),
        affinityExp: session.affinityExp,
        accumulatedModifiers: {
          toneMod: avgTone,
          fluencyMod: avgFluency,
          keywordMod,
          affinityMod,
          keywordsHit: Array.from(session.allKeywordsHit),
          totalPendingMod: avgTone + avgFluency + keywordMod + affinityMod
        },
        checkResult: session.checkResult,
        ending: session.ending
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

    // 核心拦截：如果已决胜结案，直接禁止继续发对白，节省算力
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '本场景已完成决胜检定，故事已落幕。请重新开始或前往下一关卡！',
        isCompleted: true
      });
    }

    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    // 调用 AI 服务进行对白与语言诊断
    const aiResult = await chatWithNpc({
      scenario,
      npc,
      history: session.history,
      userMessage: message.trim()
    });

    // 轮次推进与记录
    session.round += 1;
    session.history.push({ role: 'user', content: message.trim() });
    session.history.push({ role: 'assistant', content: aiResult.npcReply });

    // 记录历史评分
    session.toneHistory.push(aiResult.evaluation.toneMod);
    session.fluencyHistory.push(aiResult.evaluation.fluencyMod);
    if (aiResult.evaluation.keywordsHit && aiResult.evaluation.keywordsHit.length > 0) {
      aiResult.evaluation.keywordsHit.forEach(k => session.allKeywordsHit.add(k));
    }

    // 动态好感经验值 (Affinity EXP) 增长机制：
    // 基础 +12 EXP；语气好最高 +10，地道最高 +10，命中词汇每个 +6
    let expDelta = 12 + (aiResult.evaluation.toneMod * 5) + (aiResult.evaluation.fluencyMod * 5);
    if (aiResult.evaluation.keywordsHit?.length) {
      expDelta += aiResult.evaluation.keywordsHit.length * 6;
    }
    // 超过第 5 轮催促期，每轮轻微衰减 -6 EXP (反映早高峰不耐烦)
    if (session.round > 5) {
      expDelta -= 6;
    }

    session.affinityExp = Math.max(0, Math.min(100, session.affinityExp + expDelta));
    session.affinityMod = calculateAffinityMod(session.affinityExp);

    // 综合语言加成：取最近 3 轮平均 + 关键词加成
    const recentTones = session.toneHistory.slice(-3);
    const avgTone = Math.round(recentTones.reduce((a, b) => a + b, 0) / recentTones.length);

    const recentFluencies = session.fluencyHistory.slice(-3);
    const avgFluency = Math.round(recentFluencies.reduce((a, b) => a + b, 0) / recentFluencies.length);

    const keywordMod = Math.min(3, session.allKeywordsHit.size);
    const totalPendingMod = avgTone + avgFluency + keywordMod + session.affinityMod;

    res.json({
      success: true,
      data: {
        npcReply: aiResult.npcReply,
        emotion: aiResult.emotion,
        evaluation: aiResult.evaluation,
        currentRound: session.round,
        pacing: getPacingPhase(session.round),
        affinityExp: session.affinityExp,
        accumulatedModifiers: {
          toneMod: avgTone,
          fluencyMod: avgFluency,
          keywordMod,
          affinityMod: session.affinityMod,
          keywordsHit: Array.from(session.allKeywordsHit),
          totalPendingMod
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
 * 发起决胜关键检定 (DND Check Roll) 并正式结案
 */
router.post('/resolve-check', async (req, res) => {
  try {
    const { sessionId = 'default', finalStatement, overrideRoll } = req.body;
    const session = getOrCreateSession(sessionId);

    // 如果已经结算过，直接返回已有结算数据，避免重复消耗 AI 算力
    if (session.status === 'completed' && session.checkResult && session.ending) {
      return res.json({
        success: true,
        data: {
          checkResult: session.checkResult,
          ending: session.ending,
          alreadyCompleted: true
        }
      });
    }

    const scenario = scenarioGraph[session.scenarioId];
    const npc = npcProfiles[session.npcId];

    const statement = finalStatement || (session.history.length > 0 ? session.history[session.history.length - 1].content : "Could I have an oat milk latte please?");

    const recentTones = session.toneHistory.slice(-3);
    const avgTone = recentTones.length ? Math.round(recentTones.reduce((a, b) => a + b, 0) / recentTones.length) : 0;

    const recentFluencies = session.fluencyHistory.slice(-3);
    const avgFluency = recentFluencies.length ? Math.round(recentFluencies.reduce((a, b) => a + b, 0) / recentFluencies.length) : 0;

    const keywordMod = Math.min(3, session.allKeywordsHit.size);

    // 1. 执行数学检定
    const checkResult = executeCheck({
      targetDc: scenario.targetDc,
      baseRoll: typeof overrideRoll === 'number' ? overrideRoll : undefined,
      affinityMod: session.affinityMod,
      languageMods: {
        toneMod: avgTone,
        fluencyMod: avgFluency,
        keywordMod
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

    const endingData = {
      type: checkResult.outcome,
      title: endingMeta.title,
      storyText: endingMeta.storyText,
      npcFinalReply: plotResult.npcFinalReply,
      npcFinalEmotion: plotResult.npcFinalEmotion,
      takeawayTip: plotResult.takeawayTip
    };

    // 3. 关键落锁：标记为 completed，归档持久化，禁止后续对话
    session.status = 'completed';
    session.checkResult = checkResult;
    session.ending = endingData;

    res.json({
      success: true,
      data: {
        checkResult,
        ending: endingData
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

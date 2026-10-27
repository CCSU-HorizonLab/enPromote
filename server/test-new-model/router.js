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
      // 轨 1：NPC 耐心槽 (满额 3 颗心)
      patienceHearts: 3,
      // 轨 2：筹码与印章
      persuasionTokens: 0, // 上限 3
      keywordStamps: new Set(), // 上限 3
      baseAffinity: 1, // 熟客加成 +1
      checkResult: null,
      ending: null
    });
  }
  return sessions.get(sessionId);
}

// 计算当前交涉阶段
function getPacingPhase(round, patienceHearts) {
  if (patienceHearts <= 0) {
    return { phase: 'crisis', label: '社交危机！', hint: '⚠️ Chloe 耐心已耗尽！已无法继续闲聊，必须立即发起决胜检定！' };
  }
  if (round <= 2) {
    return { phase: 'warmup', label: '铺垫破冰期', hint: '建议先表达对忙碌的理解，铺垫基础饮品需求，赚取筹码。' };
  }
  if (round <= 4) {
    return { phase: 'prime', label: '黄金决胜期', hint: '🔥 筹码与状态正处于巅峰，正是提出关键特调诉求的最佳时机！' };
  }
  return { phase: 'urgent', label: '高峰催促期', hint: '后面队伍在催促，Chloe 耐心受到考验，请尽快发起决胜检定！' };
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

    const brokenHearts = 3 - session.patienceHearts;
    const stampsCount = Math.min(3, session.keywordStamps.size);
    const totalPendingMod = session.persuasionTokens + stampsCount + session.baseAffinity - brokenHearts;

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
        pacing: getPacingPhase(session.round, session.patienceHearts),
        dualTrack: {
          patienceHearts: session.patienceHearts,
          brokenHearts,
          persuasionTokens: session.persuasionTokens,
          keywordStampsCount: stampsCount,
          stampsList: Array.from(session.keywordStamps),
          baseAffinity: session.baseAffinity,
          totalPendingMod
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
 * 彻底修复：净值互斥判定，决不同时给筹码又扣心
 */
router.post('/chat', async (req, res) => {
  try {
    const { sessionId = 'default', message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: '输入内容不能为空' });
    }

    const session = getOrCreateSession(sessionId);

    // 核心拦截 1：如果已结案落锁，直接拒绝发对白
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '本场景已完成决胜检定，故事已落幕。请重新开始或前往下一关卡！',
        isCompleted: true
      });
    }

    // 核心拦截 2：如果 3 颗心已全碎，强制要求发起决胜检定
    if (session.patienceHearts <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Chloe 的耐心已彻底耗尽！已无法继续闲聊，请立即点击【🎲 发起决胜检定】！',
        requireCheck: true
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

    session.round += 1;
    session.history.push({ role: 'user', content: message.trim() });
    session.history.push({ role: 'assistant', content: aiResult.npcReply });

    // === 彻底修复 1：单轮净表现计算 (Net Performance) ===
    // 综合评价 = 语气得分 + 流利地道得分
    const netLanguageScore = (aiResult.evaluation.toneMod || 0) + (aiResult.evaluation.fluencyMod || 0);

    let heartBroken = false;
    let tokenEarned = false;

    // 净分 >= 1：综合表现良好，奖 1 枚筹码 (绝不扣心)
    if (netLanguageScore >= 1) {
      if (session.persuasionTokens < 3) {
        session.persuasionTokens += 1;
        tokenEarned = true;
      }
    }
    // 净分 <= -1：综合表现不佳或失礼，扣 1 颗心 (绝不给筹码)
    else if (netLanguageScore <= -1) {
      if (session.patienceHearts > 0) {
        session.patienceHearts -= 1;
        heartBroken = true;
      }
    }
    // 净分 == 0：功过相抵，不奖也不扣

    // 词汇印章独立计算 (自然命中核心词)
    if (aiResult.evaluation.keywordsHit && aiResult.evaluation.keywordsHit.length > 0) {
      aiResult.evaluation.keywordsHit.forEach(k => session.keywordStamps.add(k));
    }

    // 超时磨蹭惩罚：超过第 5 轮，每轮扣 1 颗心 (早高峰排队催促)
    if (session.round > 5 && session.patienceHearts > 0 && !heartBroken) {
      session.patienceHearts -= 1;
      heartBroken = true;
    }

    const brokenHearts = 3 - session.patienceHearts;
    const stampsCount = Math.min(3, session.keywordStamps.size);
    const totalPendingMod = session.persuasionTokens + stampsCount + session.baseAffinity - brokenHearts;

    res.json({
      success: true,
      data: {
        npcReply: aiResult.npcReply,
        emotion: aiResult.emotion,
        evaluation: aiResult.evaluation,
        currentRound: session.round,
        pacing: getPacingPhase(session.round, session.patienceHearts),
        eventTriggers: {
          tokenEarned,
          heartBroken
        },
        dualTrack: {
          patienceHearts: session.patienceHearts,
          brokenHearts,
          persuasionTokens: session.persuasionTokens,
          keywordStampsCount: stampsCount,
          stampsList: Array.from(session.keywordStamps),
          baseAffinity: session.baseAffinity,
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
 * 彻底修复：心碎锁定高光结局，深度感知前文抓狂对话事实
 */
router.post('/resolve-check', async (req, res) => {
  try {
    const { sessionId = 'default', finalStatement, overrideRoll } = req.body;
    const session = getOrCreateSession(sessionId);

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

    const brokenHearts = 3 - session.patienceHearts;
    const stampsCount = Math.min(3, session.keywordStamps.size);

    // 1. 执行数学检定
    const checkResult = executeCheck({
      targetDc: scenario.targetDc,
      baseRoll: typeof overrideRoll === 'number' ? overrideRoll : undefined,
      persuasionTokens: session.persuasionTokens,
      keywordStamps: stampsCount,
      baseAffinity: session.baseAffinity,
      brokenHearts: brokenHearts
    });

    // 2. 将前文真实的抓狂状态与心碎事实注入结局生成 Prompt
    const contextNote = brokenHearts >= 2
      ? `CRITICAL NOTE: The player repeatedly hesitated or made confusing statements (e.g. confusing base drink with oat milk) and Chloe's patience was drained (${brokenHearts}/3 hearts lost). She is exasperated and agrees ONLY because the morning queue is out the door and she wants them gone, NOT because she is impressed!`
      : '';

    const plotResult = await generateCheckOutcomePlot({
      scenario,
      npc,
      history: session.history,
      finalStatement: statement + (contextNote ? ` [Context: ${contextNote}]` : ''),
      checkResult
    });

    // 结局文案处理（优先命中场景中配置的 ending，如 reluctant_pass）
    const endingMeta = scenario.endings[checkResult.outcome] || scenario.endings.success;

    const endingData = {
      type: checkResult.outcome,
      title: endingMeta.title,
      storyText: endingMeta.storyText,
      npcFinalReply: plotResult.npcFinalReply,
      npcFinalEmotion: plotResult.npcFinalEmotion,
      takeawayTip: plotResult.takeawayTip
    };

    // 3. 状态落锁封板
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
 */
router.post('/reset', (req, res) => {
  const sessionId = req.body.sessionId || 'default';
  sessions.delete(sessionId);
  res.json({ success: true, message: 'Session reset successfully' });
});

module.exports = router;

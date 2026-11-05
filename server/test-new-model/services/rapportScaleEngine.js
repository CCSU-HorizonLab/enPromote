/**
 * 社交破防天平确定性计算引擎 (Rapport Scale Engine)
 * 彻底淘汰 D20 随机骰，采用客观事实 + 词块命中 + LLM礼貌得体度 + 防一回杀节奏锁
 */

/**
 * 分析用户单轮对白中的客观事实与词块触发情况
 * @param {Object} params
 * @param {string} params.userMessage - 用户输入文本
 * @param {number} params.currentRound - 当前交互轮次 (从 0 开始)
 * @param {Array} params.inventoryWeapons - 场景配置的武器库
 * @param {Set<string>} params.accumulatedFacts - 之前轮次已触发的事实
 */
function inspectMessageObjectiveFeatures({ userMessage = '', currentRound = 0, inventoryWeapons = [], accumulatedFacts = new Set() }) {
  const lower = userMessage.toLowerCase();
  const triggers = {
    hasNameStated: false,
    hasProofProvided: false,
    weaponsHit: [],
    prematureUpgradePenalty: false
  };

  // 1. 事实证据 1：报出姓名/预订主体 (例: under the name of..., my name is...)
  if (
    lower.includes('name is') ||
    lower.includes('name of') ||
    lower.includes('under') ||
    lower.includes('alex') ||
    lower.includes('reservation for')
  ) {
    triggers.hasNameStated = true;
  }

  // 2. 事实证据 2：出示凭证/护照/订单号
  if (
    lower.includes('confirmation') ||
    lower.includes('number') ||
    lower.includes('passport') ||
    lower.includes('id') ||
    lower.includes('code')
  ) {
    triggers.hasProofProvided = true;
  }

  // 3. 场景词块命中检验
  inventoryWeapons.forEach(w => {
    const p = w.phrase.toLowerCase().replace('...', '').trim();
    if (lower.includes(p)) {
      triggers.weaponsHit.push(w.phrase);
    }
  });

  // 4. 防一回杀节奏锁 (Anti-OTK Pacing Lock)
  // 如果在第一轮 (currentRound === 0) 且尚未查证姓名时，就直接大喊升房 (upgrade)
  const isPhase1 = currentRound <= 1 && !accumulatedFacts.has('hasNameStated');
  if (isPhase1 && (lower.includes('upgrade') || lower.includes('suite'))) {
    triggers.prematureUpgradePenalty = true;
  }

  return triggers;
}

/**
 * 结算整场对局的确定性得分与小票明细
 * @param {Object} params
 * @param {Set<string>} params.factsVerified - 已确认的事实条目
 * @param {Set<string>} params.allWeaponsHit - 全场命中的高级词块集合
 * @param {number} params.avgToneScore - 整场由 LLM 评定的平均礼貌得分 (0~30)
 * @param {number} params.penaltyPoints - 累积的扣除分 (犹豫/冒犯/提前抢跑)
 * @param {boolean} [params.usedFullScaffold=false] - 是否启用了保底现成小抄 (若启用则封顶2星及格)
 * @param {Object} params.scenario - 场景配置
 */
function evaluateRapportSettlement({
  factsVerified = new Set(),
  allWeaponsHit = new Set(),
  avgToneScore = 20,
  penaltyPoints = 0,
  usedFullScaffold = false,
  scenario
}) {
  // 1. 事实证据得分 (0 ~ 40)
  let factClarityScore = 0;
  if (factsVerified.has('hasNameStated')) factClarityScore += 20;
  if (factsVerified.has('hasProofProvided')) factClarityScore += 20;

  // 2. 核心词块得分 (0 ~ 30, 每个 +10，封顶 30)
  const targetChunksScore = Math.min(30, allWeaponsHit.size * 10);

  // 3. 礼貌得体度得分 (0 ~ 30)
  const toneScore = Math.max(0, Math.min(30, Math.round(avgToneScore)));

  // 4. 惩罚扣减
  const deductions = Math.max(0, penaltyPoints);

  // 5. 最终折服度总分 (0 ~ 100)
  const rawScore = factClarityScore + targetChunksScore + toneScore - deductions;
  let finalScore = Math.max(10, Math.min(100, rawScore));

  // 6. 确定性三档结局分流 (含小抄支架封顶拦截)
  let outcome = 'fail_forward';
  let stars = 1;
  let scaffoldCapTriggered = false;

  if (finalScore >= 85) {
    if (usedFullScaffold) {
      // 触发小抄惩罚上限：封顶2星 (75分)
      scaffoldCapTriggered = true;
      finalScore = 75;
      outcome = 'success';
      stars = 2;
    } else {
      outcome = 'critical_success';
      stars = 3;
    }
  } else if (finalScore >= 65) {
    outcome = 'success';
    stars = 2;
  } else {
    outcome = 'fail_forward';
    stars = 1;
  }

  const endingMeta = scenario.endings[outcome] || scenario.endings.success;

  return {
    finalScore,
    stars,
    outcome,
    scaffoldCapTriggered,
    usedFullScaffold,
    scoreBreakdown: {
      factClarityScore,       // 0 ~ 40 (身份与证据)
      targetChunksScore,      // 0 ~ 30 (高级场景词块)
      toneScore,              // 0 ~ 30 (英伦礼貌与风度)
      deductions,             // 扣减分
      scaffoldCapTriggered    // 是否因抄小抄被压制
    },
    title: scaffoldCapTriggered ? '【达成及格 · 照本宣科】标准大床房入住 (2星小抄上限)' : endingMeta.title,
    storyText: scaffoldCapTriggered
      ? "Arthur 熟练地在键盘上核对了你的订单，但眼神中带着一丝玩味：'这位客人的用词非常标准，几乎和酒店应急对话手册一模一样。虽然缺少了点即兴发挥的绅士风采，但手续无误。今晚为您安排标准大床房。若想拿到顶层行政套房，下次可得试着脱稿交流。'"
      : endingMeta.storyText
  };
}

module.exports = {
  inspectMessageObjectiveFeatures,
  evaluateRapportSettlement
};

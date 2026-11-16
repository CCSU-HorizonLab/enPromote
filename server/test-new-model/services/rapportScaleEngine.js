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

  // 2. 事实证据 2：出示凭证/护照/订单号（兼容语音转写常见变体如 L-88219 / booking）
  if (
    lower.includes('confirmation') ||
    lower.includes('number') ||
    lower.includes('passport') ||
    lower.includes('id') ||
    lower.includes('code') ||
    lower.includes('booking') ||
    lower.includes('88219') ||
    lower.includes('l-88219') ||
    lower.includes('lon-') ||
    lower.includes('reference')
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
  usedCardsMode = false,
  runMode = 'standard',
  subtitleRevealedCount = 0,
  cluePeekCount = 0,
  twistAddressed = true,
  scenario
}) {
  // 1. 事实证据得分 (0 ~ 40)
  let factClarityScore = 0;
  if (factsVerified.has('hasNameStated')) factClarityScore += 20;
  if (factsVerified.has('hasProofProvided')) factClarityScore += 20;

  // 2. 双轨语块拆解得分 (通用社交招式 How vs 场景业务零件 What, 各封顶 15, 合计封顶 30)
  const weaponsMap = new Map((scenario.inventoryWeapons || []).map(w => [w.phrase.toLowerCase().trim(), w]));
  let stancesHitCount = 0;
  let domainChunksHitCount = 0;

  allWeaponsHit.forEach(phrase => {
    const w = weaponsMap.get(phrase.toLowerCase().trim());
    if (w?.category === 'pragmatic_stance') {
      stancesHitCount++;
    } else {
      domainChunksHitCount++;
    }
  });

  const pragmaticStanceScore = Math.min(15, stancesHitCount * 8);
  const domainChunksScore = Math.min(15, domainChunksHitCount * 8);
  const targetChunksScore = Math.min(30, pragmaticStanceScore + domainChunksScore);

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

  const isNgPlus = runMode === 'ng_plus';
  const roteMemorizationPenalty = (isNgPlus && !twistAddressed) ? 20 : 0;
  const cluePeekPenalty = isNgPlus ? (cluePeekCount >= 2 ? 10 : (cluePeekCount === 1 ? 5 : 0)) : 0;
  const extraNgPenalty = roteMemorizationPenalty + cluePeekPenalty;
  const effectiveDeductions = deductions + extraNgPenalty;
  const effectiveFinalScore = Math.max(0, Math.min(100, finalScore - extraNgPenalty));

  let effectiveStars = stars;
  let effectiveOutcome = outcome;
  if (extraNgPenalty > 0) {
    if (effectiveFinalScore >= 85 && !scaffoldCapTriggered) {
      effectiveStars = 3;
      effectiveOutcome = 'critical_success';
    } else if (effectiveFinalScore >= 65) {
      effectiveStars = 2;
      effectiveOutcome = 'success';
    } else {
      effectiveStars = 1;
      effectiveOutcome = 'fail_forward';
    }
  }

  // 计算正交“含金量材质印记”与特权解锁（不新增 4~5 星，坚持 1~3 星基底）
  let prestigeTier = 'standard';
  let prestigeLabel = usedCardsMode ? '🥉 战术卡牌通关' : '🥉 基础交涉印记';
  let prestigeReason = usedCardsMode
    ? '借助战术卡牌组完成交涉（切至“开口/手打模式”可冲击脱稿或黑金认证）'
    : '完成主线交涉；得分达到 85+ 并满足脱稿/盲听条件可解锁高阶印记';
  let privilegeUnlocked = null;

  if (usedFullScaffold || (isNgPlus && (subtitleRevealedCount > 0 || cluePeekCount >= 2))) {
    prestigeTier = 'assisted';
    if (usedFullScaffold) {
      prestigeLabel = '📑 小抄辅助印记';
      prestigeReason = '使用了全句提示小抄，星级上限及含金量受限';
    } else if (subtitleRevealedCount > 0) {
      prestigeLabel = '👁️ 破盲显露印记';
      prestigeReason = `二周目盲听途中显露了 ${subtitleRevealedCount} 次英文台词，失去黑金纯度`;
    } else {
      prestigeLabel = '💡 多次线索提示印记';
      prestigeReason = `二周目盲听途中查看了 ${cluePeekCount} 次要点线索（限 1 次内可保留黑金）`;
    }
  } else if (isNgPlus && effectiveStars === 3 && !usedCardsMode && twistAddressed && subtitleRevealedCount === 0 && cluePeekCount <= 1) {
    prestigeTier = 'black_gold';
    prestigeLabel = '🎧 黑金·盲听实战大师';
    prestigeReason = cluePeekCount === 1
      ? '二周目 0 显露台词（借 1 次要点线索 -5 分缓冲）仍稳取 3★，成功化解突发变故！'
      : '二周目 0 次显露台词纯盲听 + 临场拆解突发变故 + 纯语音/脱稿拿下顶层套房！';
    privilegeUnlocked = {
      unlocked: true,
      badge: '🗝️ 模块 A 免修特权卡',
      description: '已解锁【酒店值机场景】模块 A 核心词库免修与 Boss 关卡直通资格！'
    };
  } else if (effectiveStars === 3 && !usedCardsMode) {
    prestigeTier = 'authentic';
    prestigeLabel = '🥈 脱稿交涉印记';
    prestigeReason = isNgPlus
      ? '二周目脱稿拿下 3 星（需保持 0 显露台词、线索≤1次且完整回应突发变故方可晋升黑金）'
      : '一周目无小抄脱稿/语音拿下最高 3 星结局，已具备挑战二周目盲听的实力！';
  }

  const endingMeta = scenario.endings[effectiveOutcome] || scenario.endings.success;

  return {
    finalScore: effectiveFinalScore,
    stars: effectiveStars,
    outcome: effectiveOutcome,
    runMode,
    prestigeTier,
    prestigeLabel,
    prestigeReason,
    privilegeUnlocked,
    twistAddressed,
    subtitleRevealedCount,
    cluePeekCount,
    usedCardsMode,
    scaffoldCapTriggered,
    usedFullScaffold,
    scoreBreakdown: {
      factClarityScore,       // 0 ~ 40 (身份与证据)
      pragmaticStanceScore,   // 0 ~ 15 (通用社交润滑招式 How)
      domainChunksScore,      // 0 ~ 15 (场景业务事实零件 What)
      targetChunksScore,      // 0 ~ 30 (高级场景词块总计)
      toneScore,              // 0 ~ 30 (英伦礼貌与风度)
      deductions: effectiveDeductions,             // 扣减分（含死记硬背及线索缓冲罚分）
      roteMemorizationPenalty,
      cluePeekPenalty,
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

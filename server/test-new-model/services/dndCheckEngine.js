/**
 * DND 跑团技能检定纯算引擎 (双轨离散指示器与筹码模型)
 */

/**
 * 掷骰子 (默认 D20，支持指定调试点数)
 */
function rollD20(overrideRoll) {
  if (typeof overrideRoll === 'number' && overrideRoll >= 1 && overrideRoll <= 20) {
    return overrideRoll;
  }
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * 执行交涉/说服检定计算 (纯整数、明牌离散加减)
 * @param {Object} params
 * @param {number} params.targetDc - 场景 DC 难度 (如 13)
 * @param {number} [params.baseRoll] - 基础骰点
 * @param {number} [params.persuasionTokens=0] - 优秀对白获得的交涉筹码 (0 ~ 3)
 * @param {number} [params.keywordStamps=0] - 命中的词汇印章 (0 ~ 3)
 * @param {number} [params.baseAffinity=1] - 基础好感加成 (熟客 +1)
 * @param {number} [params.brokenHearts=0] - 碎裂的心数 (0 ~ 3)
 */
function executeCheck({
  targetDc = 13,
  baseRoll,
  persuasionTokens = 0,
  keywordStamps = 0,
  baseAffinity = 1,
  brokenHearts = 0
}) {
  const actualRoll = rollD20(baseRoll);

  // 严格约束各离散筹码区间
  const tokens = Math.max(0, Math.min(3, Number(persuasionTokens) || 0));
  const stamps = Math.max(0, Math.min(3, Number(keywordStamps) || 0));
  const affinity = Math.max(0, Number(baseAffinity) || 1);
  const heartsPenalty = Math.max(0, Math.min(3, Number(brokenHearts) || 0));

  // 总修正 = 筹码 + 印章 + 熟客 - 心碎惩罚
  const totalMod = tokens + stamps + affinity - heartsPenalty;
  const finalScore = actualRoll + totalMod;

  let outcome = 'fail_forward'; // 默认顺势推进

  // 检定通过判断
  if (finalScore >= targetDc) {
    // 核心规则：高光大成功必须以“NPC耐心尚存（碎心 <= 1）”为戏剧前提
    const isPatienceIntact = heartsPenalty <= 1;

    if ((actualRoll === 20 || finalScore >= targetDc + 5) && isPatienceIntact) {
      outcome = 'critical_success'; // 真正的高光大成功（专业折服）
    } else if (heartsPenalty >= 2) {
      outcome = 'reluctant_pass'; // 涉险过关 / 狗运通融（虽过关但对方极其不耐烦）
    } else {
      outcome = 'success'; // 标准顺利过关
    }
  }

  return {
    baseRoll: actualRoll,
    modifiers: {
      persuasionTokens: tokens,
      keywordStamps: stamps,
      baseAffinity: affinity,
      brokenHeartsPenalty: heartsPenalty,
      totalMod
    },
    finalScore,
    targetDc,
    outcome,
    isPassed: outcome !== 'fail_forward'
  };
}

module.exports = {
  rollD20,
  executeCheck
};

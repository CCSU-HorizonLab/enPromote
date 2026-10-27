/**
 * DND 跑团技能检定纯算引擎
 */

/**
 * 掷骰子 (默认 D20，或支持传入指定点数用于测试)
 * @param {number} [overrideRoll] - 测试用的指定点数
 * @returns {number} 1~20 随机整数
 * 
 */
function rollD20(overrideRoll) {
  if (typeof overrideRoll === 'number' && overrideRoll >= 1 && overrideRoll <= 20) {
    return overrideRoll;
  }
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * 执行交涉/说服检定计算
 * @param {Object} params
 * @param {number} params.targetDc - 场景 DC 难度
 * @param {number} [params.baseRoll] - 基础骰点 (若不传则自动生成 1~20)
 * @param {number} [params.affinityMod=0] - 历史好感修正 (-2 ~ +3)
 * @param {Object} [params.languageMods] - 语言表现修正
 * @param {number} [params.languageMods.toneMod=0] - 语气得体度 (-2 ~ +2)
 * @param {number} [params.languageMods.fluencyMod=0] - 地道流利度 (-1 ~ +2)
 * @param {number} [params.languageMods.keywordMod=0] - 关键词命中加成 (0 ~ +3)
 */
function executeCheck({ targetDc = 13, baseRoll, affinityMod = 0, languageMods = {} }) {
  const actualRoll = rollD20(baseRoll);
  const tone = Number(languageMods.toneMod) || 0;
  const fluency = Number(languageMods.fluencyMod) || 0;
  const keyword = Number(languageMods.keywordMod) || 0;
  const affinity = Number(affinityMod) || 0;

  const totalLanguageMod = tone + fluency + keyword;
  const totalMod = totalLanguageMod + affinity;
  const finalScore = actualRoll + totalMod;

  let outcome = 'fail_forward'; // 默认顺势推进 (不直接死局)

  if (actualRoll === 20 || finalScore >= targetDc + 5) {
    outcome = 'critical_success'; // 大成功
  } else if (finalScore >= targetDc) {
    outcome = 'success'; // 成功
  }

  return {
    baseRoll: actualRoll,
    modifiers: {
      affinityMod: affinity,
      toneMod: tone,
      fluencyMod: fluency,
      keywordMod: keyword,
      totalLanguageMod,
      totalMod
    },
    finalScore,
    targetDc,
    outcome,
    isPassed: outcome === 'critical_success' || outcome === 'success'
  };
}

module.exports = {
  rollD20,
  executeCheck
};

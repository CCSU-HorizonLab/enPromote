const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const { z } = require('zod');

// 配置本地代理支持 (国内访问 Google API)
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7892';
try {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
} catch (e) {
  console.warn('[AI Service] ProxyAgent init error (ignored):', e.message);
}

// 缓存动态导入的 ESM 模块
let aiModule = null;
let googleModule = null;

async function getAi() {
  if (!aiModule) {
    aiModule = await import('ai');
  }
  if (!googleModule) {
    googleModule = await import('@ai-sdk/google');
  }
  return {
    ...aiModule,
    google: googleModule.google
  };
}

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * 玩家与 NPC 日常对白交互
 * 包含：NPC 回应生成 + 语言质量即时诊断 (语气修正、地道度、关键词加成、润色建议)
 */
async function chatWithNpc({ scenario, npc, history = [], userMessage }) {
  const { generateObject, google } = await getAi();
  const ctx = scenario.dramaticContext;

  const systemPrompt = `
You are the Game Master and Roleplayer for an English-learning interactive visual novel (AVG).
You are playing as ${npc.name} (${npc.title}).

[NPC Character Profile]:
- Personality: ${npc.persona}
- Preferred Tone: ${npc.tonePreference}
- Disliked Tone: ${npc.tabooTone}

[Current Dramatic Context & State]:
- Why You Are Here: ${ctx.whyHere}
- Current Mental State: ${ctx.currentMentalState}
- Immediate Goal: ${ctx.immediateGoal}
- Hidden Soft Spot: ${ctx.hiddenSoftSpot}

[Scene Objective]:
${scenario.objectiveDescription}

[Target Keywords in this scene]:
${scenario.recommendedKeywords.map(k => `"${k.word}" (${k.meaning})`).join(', ')}

[Instructions]:
1. Roleplay as ${npc.name}. Respond in spoken, natural English matching your current mood and personality. Keep it to 1-3 sentences.
2. Choose one emotion tag from: ["neutral", "annoyed", "surprised", "pleased"].
3. Evaluate the player's English input on:
   - toneMod: -2 to +2 (Does it match what ${npc.name} prefers or hates?)
   - fluencyMod: -1 to +2 (Is it natural, grammatical, and native-sounding?)
   - keywordsHit: list of target keywords the user naturally used
   - keywordMod: 1 point per valid target keyword (max 2 points)
   - polishTip: provide 1 friendly native/idiomatic way to express the user's idea in Chinese/English.
`;

  const schema = z.object({
    npcReply: z.string().describe("NPC's direct spoken response in character"),
    emotion: z.enum(["neutral", "annoyed", "surprised", "pleased"]).describe("NPC's facial expression/mood tag"),
    evaluation: z.object({
      toneMod: z.number().min(-2).max(2).describe("语气得体度 (-2 到 +2)"),
      toneReason: z.string().describe("语气评价原因（简短中文）"),
      fluencyMod: z.number().min(-1).max(2).describe("地道流利度 (-1 到 +2)"),
      fluencyReason: z.string().describe("流利度评价原因（简短中文）"),
      keywordsHit: z.array(z.string()).describe("命中的场景关键词"),
      keywordMod: z.number().min(0).max(3).describe("关键词加成点数"),
      polishTip: z.object({
        nativeSentence: z.string().describe("更加地道原汁原味的母语者表达"),
        explanation: z.string().describe("中文讲解这样说的好处")
      })
    })
  });

  const formattedMessages = history.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const res = await generateObject({
    model: google(DEFAULT_MODEL),
    system: systemPrompt,
    messages: [
      ...formattedMessages,
      { role: 'user', content: userMessage }
    ],
    schema
  });

  return res.object;
}

/**
 * 决胜检定剧情生成
 * 根据检定结果（大成功/成功/顺势推进），生成 NPC 的最终反应与结语
 */
async function generateCheckOutcomePlot({ scenario, npc, history, finalStatement, checkResult }) {
  const { generateObject, google } = await getAi();
  const ctx = scenario.dramaticContext;

  const systemPrompt = `
You are the Game Master for an English-learning AVG.
Player made their final climax statement to NPC ${npc.name}.
A DND ability check was executed.

[Climax Check Result]:
- Outcome: ${checkResult.outcome} (critical_success, reluctant_pass, success, or fail_forward)
- Total Score: ${checkResult.finalScore} vs Target DC: ${checkResult.targetDc}
- Broken Hearts (Patience lost): ${checkResult.modifiers.brokenHeartsPenalty || 0} / 3
- Persuasion Tokens Earned: ${checkResult.modifiers.persuasionTokens || 0} / 3

[Preset Ending Concept]:
${JSON.stringify(scenario.endings[checkResult.outcome] || scenario.endings.success, null, 2)}

[Instructions]:
Generate NPC ${npc.name}'s final in-character reaction line (1-2 sentences in English) reflecting the outcome and conversation context:
- If critical_success (only possible when patience hearts >= 2): genuinely impressed by true coffee expertise and crisp delivery.
- If reluctant_pass (dog luck pass: patience was drained >= 2 hearts or 0 hearts): Chloe is visibly annoyed and exasperated by player's previous stalling/hesitation, but because the queue behind is insane and player rolled lucky, she begrudgingly slams down the drink to get rid of them ("Fine! Take your oat latte and please go, the morning rush is killing me!"). ABSOLUTELY DO NOT PRAISE the player!
- If success (normal): briskly and efficiently accepts the order.
- If fail_forward: refuses custom order due to rush, gives regular black coffee instead with a snappy lesson.
Also provide a concise summary for the learning report.
`;

  const schema = z.object({
    npcFinalReply: z.string().describe("NPC final closing reaction line in English"),
    npcFinalEmotion: z.enum(["neutral", "annoyed", "surprised", "pleased"]),
    takeawayTip: z.string().describe("核心学情复盘与建议（中文，1~2句话）")
  });

  const res = await generateObject({
    model: google(DEFAULT_MODEL),
    system: systemPrompt,
    prompt: `Player's final statement was: "${finalStatement}". Generate the dramatic closing response.`,
    schema
  });

  return res.object;
}

module.exports = {
  chatWithNpc,
  generateCheckOutcomePlot
};

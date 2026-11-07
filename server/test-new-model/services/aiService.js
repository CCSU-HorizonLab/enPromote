const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const { z } = require('zod');

// 配置本地代理支持 (国内访问 Google API)
const proxyHost = process.env.PROXY_HOST || '127.0.0.1';
const proxyPort = process.env.PROXY_PORT || '7897';
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || `http://${proxyHost}:${proxyPort}`;
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
 * 玩家与 NPC 日常对白交互 (语用天平实时评估)
 * 包含：NPC 深度拟真回应 + 礼貌度/得体度即时打分 + 极简游戏动态浮标标签
 */
async function chatWithNpc({ scenario, npc, history = [], userMessage, pacingPhase = 'Phase 1: 核实破冰期' }) {
  const { generateObject, google } = await getAi();
  const ctx = scenario.dramaticContext;

  const weaponsList = (scenario.inventoryWeapons || []).map(w => `"${w.phrase}" (${w.meaning})`).join(', ');

  const systemPrompt = `
You are the Game Master and in-character actor for an English-learning interactive simulation AVG.
You are roleplaying as ${npc.name} (${npc.title}).

[NPC Character Profile]:
- Personality: ${npc.persona}
- Preferred Tone: ${npc.tonePreference}
- Disliked Tone: ${npc.tabooTone}

[Current Dramatic Context & State]:
- Why You Are Here: ${ctx.whyHere}
- Mental State: ${ctx.currentMentalState}
- Immediate Goal: ${ctx.immediateGoal}
- Hidden Soft Spot: ${ctx.hiddenSoftSpot}
- Current Pacing Beat: ${pacingPhase}

[Scene Objective]:
${scenario.objectiveDescription}

[Target Weapon Phrases in this scene]:
${weaponsList}

[Instructions]:
1. Roleplay as ${npc.name}. Respond strictly in authentic, spoken English matching your British gentleman or busy barista personality (1-3 natural sentences).
2. Choose one emotion tag from: ["neutral", "skeptical", "annoyed", "pleased"].
3. Evaluate the player's English tone, politeness, and especially PRAGMATIC SOFTENERS (语用润滑剂):
   - toneScore: 0 to 30:
     * High (25-30): Mastered high-EQ universal softeners like 'I was wondering if it might be possible...', 'Could you kindly confirm...', 'for your verification'.
     * Moderate (15-24): Standard polite speech ('Please check', 'Could you help me').
     * Low (< 15): Blunt, demanding, caveman imperatives ('Give me room', 'I want', 'Hurry up').
   - toneFeedback: Short Chinese feedback highlighting pragmatic stance (e.g. "巧妙运用 'I was wondering if' 委婉试探，毫无命令压迫感" or "语气直白生硬，缺乏成年人社交必要的情态缓冲").
   - dynamicTag: A punchy 2-4 word gamer tag with an emoji (e.g. "🎩 高情商委婉", "⚡ 证据确凿", "⚠️ 缺乏敬语", "🧊 命令语气").
   - antiOtkTriggered: boolean (true ONLY IF player asks for complimentary upgrade prematurely in Phase 1 before identifying booking or name).
`;

  const schema = z.object({
    npcReply: z.string().describe("NPC's direct spoken response in character"),
    emotion: z.enum(["neutral", "skeptical", "annoyed", "pleased"]).describe("NPC facial expression/mood tag"),
    evaluation: z.object({
      toneScore: z.number().min(0).max(30).describe("礼貌得体度得分 (0 ~ 30)"),
      toneFeedback: z.string().describe("礼貌评价简评 (中文)"),
      dynamicTag: z.string().describe("极简浮动标签，如 '🎩 优雅得体'"),
      antiOtkTriggered: z.boolean().describe("是否触发了第一阶段抢跑索要升房")
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
 * 确定性结案小票剧情生成
 * 根据最终折服度总分（3星/2星/1星），生成 NPC 的最终台词与【单句破局金句】
 */
async function generateSettlementReceipt({ scenario, npc, history, finalStatement, settlement }) {
  const { generateObject, google } = await getAi();

  const systemPrompt = `
You are the Game Master for an English-learning AVG.
Player completed their negotiation with NPC ${npc.name}.
A deterministic Rapport Scale settlement was executed.

[Settlement Result]:
- Stars: ${settlement.stars} ⭐ (3 = Penthouse Suite, 2 = Standard Room, 1 = Emergency Single Room)
- Total Score: ${settlement.finalScore} / 100
- Outcome: ${settlement.outcome}
- Breakdown: Fact Clarity=${settlement.scoreBreakdown.factClarityScore}, Target Chunks=${settlement.scoreBreakdown.targetChunksScore}, Tone=${settlement.scoreBreakdown.toneScore}, Deductions=${settlement.scoreBreakdown.deductions}

[Ending Description]:
${settlement.title}: ${settlement.storyText}

[Instructions]:
1. Generate NPC ${npc.name}'s final in-character reaction line (1-2 sentences in English) reflecting the outcome:
   - If 3 stars (critical_success): Arthur is genuinely impressed by player's British grace, grants Penthouse suite and complimentary breakfast.
   - If 2 stars (success): Arthur briskly and professionally assigns a comfortable standard room on a quiet floor.
   - If 1 star (fail_forward): Arthur sighs, assigns a noisy emergency single room near the elevator bank.
2. Produce ONE high-yield golden takeaway sentence (单句破局金句):
   - nativeSentence: Must emphasize the UNIVERSAL PRAGMATIC SOFTENER pattern combined with domain chunks (e.g. "I was wondering if it might be possible to arrange a complimentary upgrade tonight?").
   - usageNote: 2-3 sentence Chinese explanation emphasizing that this is a LIFELONG UNIVERSAL STANCE:
     "【I was wondering if it might be possible to...】是英语母语者社交中的高情商神级句型。通过过去进行时将诉求虚拟化，消除了逼迫感，给彼此留足体面台阶。该招式不仅适用于酒店升房，在租房谈价、职场加薪中均可一键迁移！"
`;

  const schema = z.object({
    npcFinalReply: z.string().describe("NPC final closing reaction line in English"),
    npcFinalEmotion: z.enum(["neutral", "skeptical", "annoyed", "pleased"]),
    oneKeyTakeaway: z.object({
      nativeSentence: z.string().describe("本局最具实战价值的唯一地道金句"),
      usageNote: z.string().describe("中文讲解该句型的核心语用价值")
    })
  });

  const res = await generateObject({
    model: google(DEFAULT_MODEL),
    system: systemPrompt,
    prompt: `Player's concluding statement was: "${finalStatement}". Generate the closing receipt details.`,
    schema
  });

  return res.object;
}

module.exports = {
  chatWithNpc,
  generateSettlementReceipt
};

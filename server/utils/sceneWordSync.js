const Word = require('../modules/Word');
const UserWord = require('../modules/UserWord');
const { getSceneWordBank, findSceneWord } = require('../config/sceneVocabularies');

/**
 * 构建带场景词元的完整 Word 文档（如果不存在则创建，若旧记录缺释义/音标/场景则升级补全）
 */
async function ensureSceneWordDoc(wordInput, chapterKey = 'A') {
  const upperChapter = String(chapterKey || 'A').toUpperCase();
  const isObj = wordInput && typeof wordInput === 'object';
  const rawWord = isObj ? wordInput.word : String(wordInput || '');
  const normalizedWord = rawWord.trim().toLowerCase();

  if (!normalizedWord) return null;

  const catalogMeta = findSceneWord(normalizedWord, upperChapter) || {};
  const meta = {
    word: normalizedWord,
    mean: (isObj ? (wordInput.mean || wordInput.meaning || wordInput.chineseMeaning) : '') || catalogMeta.mean || '',
    phonetic_symbol: (isObj ? wordInput.phonetic_symbol : '') || catalogMeta.phonetic_symbol || '',
    partOfSpeech: (isObj ? wordInput.partOfSpeech : '') || catalogMeta.partOfSpeech || 'noun',
    example: (isObj ? wordInput.example : '') || catalogMeta.example || '',
    combatRole: (isObj ? wordInput.combatRole : '') || catalogMeta.combatRole || 'domain_chunk',
    chapter: upperChapter,
    scenario: (isObj ? wordInput.scenario : '') || catalogMeta.scenario || (upperChapter === 'A' ? 'hotel' : 'vocabulary')
  };

  let wordDoc = await Word.findOne({ word: normalizedWord });
  if (!wordDoc) {
    wordDoc = new Word({
      word: meta.word,
      chineseMeaning: meta.mean,
      phonetics: meta.phonetic_symbol ? [{ text: meta.phonetic_symbol, audio: '' }] : [],
      meanings: meta.mean || meta.example
        ? [
            {
              partOfSpeech: meta.partOfSpeech,
              definitions: [
                {
                  definition: meta.mean,
                  example: meta.example
                }
              ]
            }
          ]
        : [],
      chapter: meta.chapter,
      scenario: meta.scenario,
      source: 'scene_bank'
    });
    await wordDoc.save();
    return wordDoc;
  }

  let dirty = false;
  if (!wordDoc.chineseMeaning && meta.mean) {
    wordDoc.chineseMeaning = meta.mean;
    dirty = true;
  }
  if ((!wordDoc.phonetics || wordDoc.phonetics.length === 0 || !wordDoc.phonetics[0]?.text) && meta.phonetic_symbol) {
    wordDoc.phonetics = [{ text: meta.phonetic_symbol, audio: '' }];
    dirty = true;
  }
  const existingExample = wordDoc.meanings?.[0]?.definitions?.[0]?.example;
  if (!existingExample && (meta.example || meta.mean)) {
    wordDoc.meanings = [
      {
        partOfSpeech: meta.partOfSpeech,
        definitions: [
          {
            definition: meta.mean || wordDoc.chineseMeaning || '',
            example: meta.example || ''
          }
        ]
      }
    ];
    dirty = true;
  }
  if (meta.scenario && wordDoc.scenario !== meta.scenario) {
    wordDoc.scenario = meta.scenario;
    dirty = true;
  }
  if (wordDoc.chapter !== meta.chapter) {
    wordDoc.chapter = meta.chapter;
    dirty = true;
  }
  if (!wordDoc.source || wordDoc.source === 'vocabulary') {
    wordDoc.source = 'scene_bank';
    dirty = true;
  }

  if (dirty) {
    await wordDoc.save();
  }
  return wordDoc;
}

/**
 * 将数据库 Word + 场景元信息映射为前端第 1~3 关通用格式
 */
function buildFrontendWordPayload(wordDoc, sceneMeta = null, extraFields = {}) {
  const upperChapter = (sceneMeta?.chapter || wordDoc?.chapter || 'A').toUpperCase();
  const catalogMeta = sceneMeta || findSceneWord(wordDoc?.word, upperChapter) || {};
  const meaning = catalogMeta.mean || wordDoc?.chineseMeaning || wordDoc?.meanings?.[0]?.definitions?.[0]?.definition || '';
  const phonetic = catalogMeta.phonetic_symbol || wordDoc?.phonetics?.[0]?.text || '';
  const example = catalogMeta.example || wordDoc?.meanings?.[0]?.definitions?.[0]?.example || '暂无例句';

  return {
    _id: wordDoc._id.toString(),
    wordId: wordDoc._id.toString(),
    word: wordDoc.word,
    mean: meaning,
    meaning,
    definition: meaning,
    phonetic_symbol: phonetic,
    example,
    combatRole: catalogMeta.combatRole || 'domain_chunk',
    chapter: upperChapter,
    scenario: catalogMeta.scenario || wordDoc?.scenario || (upperChapter === 'A' ? 'hotel' : 'vocabulary'),
    ...extraFields
  };
}

/**
 * 批量同步模块 B 实战词/金句关键词到模块 A UserWord 复习池（立即到期可练）
 */
async function syncUserWordsForScene({
  userId,
  words = [],
  chapter = 'A',
  source = 'avg_boss',
  dueNow = true
}) {
  const upperChapter = String(chapter || 'A').toUpperCase();
  const bank = getSceneWordBank(upperChapter) || [];

  const normalizedTargets = [];
  const seen = new Set();

  const pushTarget = (item) => {
    const raw = typeof item === 'string' ? item : item?.word;
    if (!raw || typeof raw !== 'string') return;
    const clean = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!clean || clean.length < 3 || seen.has(clean)) return;
    seen.add(clean);
    normalizedTargets.push(typeof item === 'object' ? { ...item, word: clean } : clean);
  };

  words.forEach(pushTarget);

  // 如果只传了少量关键词，顺带补足场景核心词，确保复习池丰满
  if (normalizedTargets.length < 5) {
    bank.slice(0, 8).forEach(pushTarget);
  }

  const now = new Date();
  const synced = [];

  for (const target of normalizedTargets) {
    const wordDoc = await ensureSceneWordDoc(target, upperChapter);
    if (!wordDoc) continue;

    const wordIdStr = wordDoc._id.toString();
    let userWord = await UserWord.findOne({ userId: String(userId), wordId: wordIdStr });

    if (!userWord) {
      userWord = new UserWord({
        userId: String(userId),
        wordId: wordIdStr,
        sence: upperChapter,
        status: 'learning',
        reviewCounts: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        nextReviewTime: dueNow ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000),
        priority: 6,
        source
      });
      await userWord.save();
    } else {
      userWord.sence = upperChapter;
      userWord.lastSeenAt = now;
      if (dueNow) {
        userWord.nextReviewTime = now;
      }
      userWord.priority = Math.max(userWord.priority || 0, 6);
      if (source === 'avg_boss') {
        userWord.source = 'avg_boss';
      }
      await userWord.save();
    }

    synced.push(buildFrontendWordPayload(wordDoc, null, { source: userWord.source, priority: userWord.priority }));
  }

  return synced;
}

module.exports = {
  ensureSceneWordDoc,
  buildFrontendWordPayload,
  syncUserWordsForScene
};

/**
 * 场景化核心词库配置（按模块 A 章节 ID 划分，与模块 B Boss 实战场景词块/语境对齐）
 * 注意：Module A 第 2 关（拼写）与第 3 关（听力）逐字母校验 [a-z]，
 * 因此这里的 word 字段统一使用纯小写字母单词（无空格或连字符）。
 */

const HOTEL_SCENE_WORDS = [
  {
    word: 'reservation',
    mean: 'n. 预订；预约',
    phonetic_symbol: '/ˌrezəˈveɪʃən/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'I have a reservation under the name of Alex for tonight.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'confirmation',
    mean: 'n. 确认号；确认书',
    phonetic_symbol: '/ˌkɒnfəˈmeɪʃən/',
    partOfSpeech: 'noun',
    combatRole: 'evidence',
    example: 'Here is my booking confirmation number for your verification.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'passport',
    mean: 'n. 护照',
    phonetic_symbol: '/ˈpɑːspɔːt/',
    partOfSpeech: 'noun',
    combatRole: 'evidence',
    example: 'Please present your passport at the reception desk.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'verification',
    mean: 'n. 核实；查验',
    phonetic_symbol: '/ˌverɪfɪˈkeɪʃən/',
    partOfSpeech: 'noun',
    combatRole: 'stance',
    example: 'Here are my passport and voucher for your verification.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'reception',
    mean: 'n. 前台接待处',
    phonetic_symbol: '/rɪˈsepʃən/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'The night reception staff will assist late arrivals.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'concierge',
    mean: 'n. 礼宾员；礼宾部',
    phonetic_symbol: '/ˌkɒnsiˈeəʒ/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'The night concierge helped verify our delayed platform booking.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'lobby',
    mean: 'n. 酒店大堂',
    phonetic_symbol: '/ˈlɒbi/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'Wait quietly in the lobby while the desk checks your details.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'terminal',
    mean: 'n. 电脑终端；系统终端',
    phonetic_symbol: '/ˈtɜːmɪnəl/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'Could you kindly check the backup terminal for delayed records?',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'complimentary',
    mean: 'adj. 免费赠送的；礼遇的',
    phonetic_symbol: '/ˌkɒmplɪˈmentəri/',
    partOfSpeech: 'adjective',
    combatRole: 'domain_chunk',
    example: 'Given the inconvenience, a complimentary upgrade was offered.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'upgrade',
    mean: 'v./n. 升级（房型或服务）',
    phonetic_symbol: '/ˈʌpɡreɪd/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'I was wondering if a room upgrade might be possible tonight.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'available',
    mean: 'adj. 可用的；有空房的',
    phonetic_symbol: '/əˈveɪləbəl/',
    partOfSpeech: 'adjective',
    combatRole: 'domain_chunk',
    example: 'Are there any quiet rooms on a higher floor available?',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'suite',
    mean: 'n. 套房',
    phonetic_symbol: '/swiːt/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'Arthur unlocked the top-floor executive suite for the polite guest.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'executive',
    mean: 'adj. 行政级别的；高管的',
    phonetic_symbol: '/ɪɡˈzekjʊtɪv/',
    partOfSpeech: 'adjective',
    combatRole: 'domain_chunk',
    example: 'The executive floor offers quieter rooms and hot breakfast.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'deposit',
    mean: 'n. 押金；保证金',
    phonetic_symbol: '/dɪˈpɒzɪt/',
    partOfSpeech: 'noun',
    combatRole: 'evidence',
    example: 'Could you confirm whether the security deposit is refundable?',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'refundable',
    mean: 'adj. 可退还的',
    phonetic_symbol: '/rɪˈfʌndəbəl/',
    partOfSpeech: 'adjective',
    combatRole: 'domain_chunk',
    example: 'The room deposit is fully refundable upon check-out.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'checkout',
    mean: 'n. 退房结账',
    phonetic_symbol: '/ˈtʃekaʊt/',
    partOfSpeech: 'noun',
    combatRole: 'domain_chunk',
    example: 'Guests in this suite receive late checkout until two.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'courtyard',
    mean: 'n. 庭院（常指内庭低层客房）',
    phonetic_symbol: '/ˈkɔːtjɑːd/',
    partOfSpeech: 'noun',
    combatRole: 'twist_defense',
    example: 'I would prefer a quieter high room instead of the courtyard.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'surcharge',
    mean: 'n. 附加费；额外加收费用',
    phonetic_symbol: '/ˈsɜːtʃɑːdʒ/',
    partOfSpeech: 'noun',
    combatRole: 'twist_defense',
    example: 'Could we politely ask you to waive the late arrival surcharge?',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'authorization',
    mean: 'n. 授权；信用卡预授权',
    phonetic_symbol: '/ˌɔːθəraɪˈzeɪʃən/',
    partOfSpeech: 'noun',
    combatRole: 'twist_defense',
    example: 'I can provide another card to complete the authorization.',
    chapter: 'A',
    scenario: 'hotel'
  },
  {
    word: 'wondering',
    mean: 'v. 想知道（用于委婉商量请求）',
    phonetic_symbol: '/ˈwʌndərɪŋ/',
    partOfSpeech: 'verb',
    combatRole: 'stance',
    example: 'I was wondering if it might be possible to confirm my booking.',
    chapter: 'A',
    scenario: 'hotel'
  }
];

const SCENE_VOCABULARIES = {
  A: HOTEL_SCENE_WORDS
};

function getSceneWordBank(chapterId) {
  if (!chapterId) return null;
  const key = String(chapterId).toUpperCase();
  return SCENE_VOCABULARIES[key] || null;
}

function findSceneWord(wordText, chapterId = null) {
  if (!wordText || typeof wordText !== 'string') return null;
  const target = wordText.trim().toLowerCase();
  if (chapterId) {
    const bank = getSceneWordBank(chapterId);
    return bank ? (bank.find(item => item.word.toLowerCase() === target) || null) : null;
  }
  for (const bank of Object.values(SCENE_VOCABULARIES)) {
    const found = bank.find(item => item.word.toLowerCase() === target);
    if (found) return found;
  }
  return null;
}

module.exports = {
  HOTEL_SCENE_WORDS,
  SCENE_VOCABULARIES,
  getSceneWordBank,
  findSceneWord
};

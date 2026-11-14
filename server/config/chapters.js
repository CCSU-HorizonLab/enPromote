const { HOTEL_SCENE_WORDS } = require('./sceneVocabularies');

// 章节配置
const CHAPTERS = {
  A: {
    id: 'A',
    name: '酒店场景',
    description: '学习酒店入住、身份核实、礼貌升房与退房结账核心英语',
    scenario: 'hotel',
    avgScenarioId: 'scenario_hotel_01',
    color: '#4A90E2',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    aiPrompt: '你是一个专业的酒店前台工作人员，请用英语与客人进行对话。场景包括：入住登记、核实预订、房间升级、退房结账等。请保持礼貌和专业。',
    vocabulary: HOTEL_SCENE_WORDS.map(item => item.word),
    wordBank: HOTEL_SCENE_WORDS
  },
  B: {
    id: 'B', 
    name: '餐厅场景',
    description: '学习餐厅点餐、用餐等相关英语',
    scenario: 'restaurant',
    color: '#F5A623',
    backgroundColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    aiPrompt: '你是一个友好的餐厅服务员，请用英语为客人提供服务。场景包括：点餐、推荐菜品、结账等。请保持热情和耐心。',
    vocabulary: [
      'menu', 'order', 'appetizer', 'main course', 'dessert',
      'beverage', 'bill', 'tip', 'reservation', 'waiter'
    ]
  }
};

// 关卡类型配置
const LEVEL_TYPES = [
  { id: 1, name: '单词学习', type: 'word', icon: '📚' },
  { id: 2, name: '拼写练习', type: 'spell', icon: '✏️' },
  { id: 3, name: '听力练习', type: 'listen', icon: '🎧' },
  { id: 4, name: '情景对话', type: 'customs', icon: '💬' },
  { id: 5, name: 'AI实战', type: 'cover', icon: '🤖' }
];

module.exports = {
  CHAPTERS,
  LEVEL_TYPES
};
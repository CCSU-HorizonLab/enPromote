<template>
  <div class="adventure-container" :style="{ background: currentChapterConfig?.backgroundColor }">
    <!-- 章节头部 -->
    <div class="chapter-header">
      <button class="back-btn" @click="backToChapters">← 选择章节</button>
      <div class="chapter-info">
        <h1>{{ currentChapterConfig?.name }}</h1>
        <p>{{ currentChapterConfig?.description }}</p>
      </div>
      <div class="chapter-progress">
        <span>{{ completedLevels }}/5</span>
      </div>
    </div>

    <!-- 纵向关卡地图 -->
    <div class="levels-map">
      <div class="level-path">
        <div 
          v-for="(level, index) in levels" 
          :key="level.type"
          class="level-item"
          :class="getLevelClass(level.type)"
          @click="enterLevel(level.type)"
        >
          <!-- 关卡节点 -->
          <div class="level-node">
            <div class="level-icon">{{ level.icon }}</div>
            <div class="level-number">{{ index + 1 }}</div>
          </div>
          
          <!-- 关卡信息 -->
          <div class="level-details">
            <h3>{{ level.name }}</h3>
            <p class="level-status-text">{{ getLevelStatus(level.type) }}</p>
          </div>
          
          <!-- 连接线（除了最后一个） -->
          <div 
            v-if="index < levels.length - 1" 
            class="level-connector"
            :class="{ 'completed': isLevelCompleted(level.type) }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 关卡内容区域 -->
    <div v-if="currentLevel" class="level-content">
      <!-- 词汇练习 -->
      <WordPractice 
        v-if="currentLevel === 'wordP'" 
        :chapter="currentChapter"
        :chapterConfig="currentChapterConfig"
        @complete="onLevelComplete"
        @back="backToMap"
      />
      
      <!-- 拼写练习 -->
      <SpellPractice 
        v-if="currentLevel === 'spellP'" 
        :chapter="currentChapter"
        :chapterConfig="currentChapterConfig"
        @complete="onLevelComplete"
        @back="backToMap"
      />
      
      <!-- 听力练习 -->
      <ListenPractice 
        v-if="currentLevel === 'listenP'" 
        :chapter="currentChapter"
        :chapterConfig="currentChapterConfig"
        @complete="onLevelComplete"
        @back="backToMap"
      />
      
      <!-- 情景对话 -->
      <CustomsPractice 
        v-if="currentLevel === 'customsP'" 
        :chapter="currentChapter"
        :chapterConfig="currentChapterConfig"
        @complete="onLevelComplete"
        @back="backToMap"
      />
      
      <!-- AI对话 -->
      <AIChatPractice 
        v-if="currentLevel === 'coverP'" 
        :chapter="currentChapter"
        :chapterConfig="currentChapterConfig"
        @complete="onLevelComplete"
        @back="backToMap"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo, changeInfo } from '@/api/auth'
import AIChatPractice from '@/components/AIChatPractice.vue'

const router = useRouter()
const userInfo = ref(null)
const currentChapter = ref('A')
const currentLevel = ref(null)

// 章节配置 - 增加章节绑定属性
const chapterConfigs = {
  A: {
    id: 'A',                    // 章节标识符
    name: '酒店场景',
    description: '学习酒店入住、退房等相关英语',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    scene: 'hotel',             // 场景标识
    vocabularyFile: 'A.json',   // 对应的词汇文件
    aiPromptKey: 'A'           // AI提示词键值
  },
  B: {
    id: 'B',                    // 章节标识符
    name: '餐厅场景',
    description: '学习餐厅点餐、用餐等相关英语', 
    backgroundColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    scene: 'restaurant',        // 场景标识
    vocabularyFile: 'B.json',   // 对应的词汇文件
    aiPromptKey: 'B'           // AI提示词键值
  }
}

// 关卡配置
const levels = [
  { type: 'wordP', name: '单词学习', icon: '📚' },
  { type: 'spellP', name: '拼写练习', icon: '✏️' },
  { type: 'listenP', name: '听力练习', icon: '🎧' },
  { type: 'customsP', name: '情景对话', icon: '💬' },
  { type: 'coverP', name: 'AI实战', icon: '🤖' }
]

// 当前章节配置
const currentChapterConfig = computed(() => {
  return chapterConfigs[currentChapter.value]
})

// 已完成关卡数
const completedLevels = computed(() => {
  if (!userInfo.value?.chapters?.[currentChapter.value]) return 0
  const chapter = userInfo.value.chapters[currentChapter.value]
  let count = 0
  if (chapter.wordP) count++
  if (chapter.spellP) count++
  if (chapter.listenP) count++
  if (chapter.customsP) count++
  if (chapter.coverP) count++
  return count
})

// 获取关卡样式类
const getLevelClass = (levelType) => {
  if (!userInfo.value?.chapters?.[currentChapter.value]) {
    return levelType === 'wordP' ? 'available' : 'locked'
  }
  
  const chapter = userInfo.value.chapters[currentChapter.value]
  const levelOrder = ['wordP', 'spellP', 'listenP', 'customsP', 'coverP']
  const currentIndex = levelOrder.indexOf(levelType)
  
  if (chapter[levelType]) {
    return 'completed'
  }
  
  // 检查前面的关卡是否都完成了
  const previousCompleted = levelOrder.slice(0, currentIndex).every(type => chapter[type])
  return previousCompleted ? 'available' : 'locked'
}

// 获取关卡状态文本
const getLevelStatus = (levelType) => {
  const levelClass = getLevelClass(levelType)
  switch (levelClass) {
    case 'completed': return '已完成'
    case 'available': return '可挑战'
    case 'locked': return '未解锁'
    default: return '未知'
  }
}

// 检查关卡是否完成
const isLevelCompleted = (levelType) => {
  return getLevelClass(levelType) === 'completed'
}

// 进入关卡
const enterLevel = (levelType) => {
  const levelClass = getLevelClass(levelType)
  if (levelClass === 'locked') {
    alert('请先完成前面的关卡！')
    return
  }
  currentLevel.value = levelType
}

// 返回地图
const backToMap = () => {
  currentLevel.value = null
}

// 返回章节选择
const backToChapters = () => {
  router.push('/chapters')
}

// 关卡完成回调
const onLevelComplete = async (levelType) => {
  try {
    const updateData = {}
    updateData[levelType] = true
    
    const response = await changeInfo(updateData)
    if (response.code === 200) {
      // 更新本地用户信息
      if (userInfo.value?.chapters?.[currentChapter.value]) {
        userInfo.value.chapters[currentChapter.value][levelType] = true
      }
      
      // 返回地图
      backToMap()
      
      // 检查是否完成所有关卡
      if (completedLevels.value === 5) {
        alert('恭喜！你已完成本章节的所有关卡！')
      }
    }
  } catch (error) {
    console.error('更新关卡进度失败:', error)
  }
}

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const response = await getUserInfo()
    if (response.code === 200) {
      userInfo.value = response
      currentChapter.value = response.currentChapter || 'A'
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

onMounted(() => {
  fetchUserInfo()
})

// 临时组件（实际应该是独立的组件文件）
const WordPractice = { template: '<div>词汇练习组件 - 开发中</div>' }
const SpellPractice = { template: '<div>拼写练习组件 - 开发中</div>' }
const ListenPractice = { template: '<div>听力练习组件 - 开发中</div>' }
const CustomsPractice = { template: '<div>情景对话组件 - 开发中</div>' }
</script>

<style scoped>
.adventure-container {
  min-height: 100vh;
  color: white;
  position: relative;
  overflow-x: hidden;
}

.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-5px);
}

.chapter-info h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
}

.chapter-info p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.chapter-progress {
  text-align: right;
}

.chapter-progress span {
  font-size: 1.5rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
}

.levels-map {
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.level-path {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 400px;
  width: 100%;
}

.level-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.level-item:hover {
  transform: translateX(10px);
}

.level-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.level-item.locked:hover {
  transform: none;
}

.level-node {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: 3px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.level-item.available .level-node {
  background: rgba(255, 215, 0, 0.8);
  border-color: #FFD700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.level-item.completed .level-node {
  background: rgba(76, 175, 80, 0.8);
  border-color: #4CAF50;
}

.level-icon {
  font-size: 2rem;
}

.level-number {
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  background: white;
  color: #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.level-details {
  flex: 1;
}

.level-details h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.level-status-text {
  margin: 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.level-connector {
  position: absolute;
  left: 39px;
  top: 80px;
  width: 2px;
  height: 2rem;
  background: rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.level-connector.completed {
  background: #4CAF50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

.level-content {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 1000;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .chapter-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .levels-map {
    padding: 1rem;
  }
  
  .level-item {
    gap: 1rem;
  }
  
  .level-node {
    width: 60px;
    height: 60px;
  }
  
  .level-icon {
    font-size: 1.5rem;
  }
  
  .level-connector {
    left: 29px;
    top: 60px;
  }
}
</style>
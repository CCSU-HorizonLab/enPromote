<template>
  <div class="adventure-container">
    <!-- 关卡地图视图 -->
    <div v-if="currentView === 'map'" class="adventure-map-view">
      <!-- 顶部导航栏 -->
      <div class="top-nav">
        <div class="nav-left">
          <button @click="goBack" class="back-btn">
            <i class="fas fa-arrow-left"></i>
            返回章节选择
          </button>
        </div>
        <div class="nav-center">
          <h1 class="chapter-title">{{ chapterInfo.name }}</h1>
          <p class="chapter-subtitle">{{ chapterInfo.description }}</p>
        </div>
        <div class="nav-right">
          <div class="user-progress">
            <span>进度: {{ userProgress }}%</span>
          </div>
        </div>
      </div>

      <!-- 纵向滚动关卡地图 -->
      <div class="map-container" ref="mapContainer">
        <!-- AI对话区域 (历史记录) -->
        <div class="ai-chat-section">
          <div class="section-header">
            <h3>🤖 AI学习助手</h3>
            <p>与AI对话练习，巩固所学知识</p>
          </div>
          <div class="ai-chat-preview" @click="enterLevel('ai')">
            <div class="chat-bubble">
              <p>Hi! 准备好练习{{ chapterInfo.name }}的对话了吗？</p>
            </div>
          </div>
        </div>

        <!-- 章节分隔线 -->
        <div class="chapter-divider">
          <div class="divider-line"></div>
          <div class="chapter-badge">{{ chapterInfo.name }}</div>
          <div class="divider-line"></div>
        </div>

        <!-- 当前章节关卡 -->
        <div class="current-chapter">
          <div v-for="(level, index) in currentChapterLevels" :key="level.id" class="level-node-container">
            <!-- 连接线 -->
            <div v-if="index > 0" class="connection-line"></div>
            
            <!-- 关卡节点 -->
            <div 
              class="level-node" 
              :class="getLevelClass(level)"
              @click="enterLevel(level.type)"
            >
              <div class="level-icon">
                <i :class="level.icon"></i>
              </div>
              <div class="level-info">
                <h4>{{ level.name }}</h4>
                <p>{{ level.description }}</p>
              </div>
              <div class="level-status">
                <i v-if="level.status === 'completed'" class="fas fa-check-circle"></i>
                <i v-else-if="level.status === 'current'" class="fas fa-play-circle"></i>
                <i v-else class="fas fa-lock"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- 下一章节预览 -->
        <div v-if="nextChapterPreview" class="next-chapter-preview">
          <div class="chapter-divider">
            <div class="divider-line"></div>
            <div class="chapter-badge preview">{{ nextChapterPreview.name }}</div>
            <div class="divider-line"></div>
          </div>
          
          <!-- 只显示第一关 -->
          <div class="level-node-container">
            <div class="level-node locked preview">
              <div class="level-icon">
                <i class="fas fa-book"></i>
              </div>
              <div class="level-info">
                <h4>单词学习</h4>
                <p>解锁后可学习{{ nextChapterPreview.name }}词汇</p>
              </div>
              <div class="level-status">
                <i class="fas fa-lock"></i>
              </div>
            </div>
          </div>
          
          <!-- 隐藏的关卡提示 -->
          <div class="hidden-levels-hint">
            <div class="dots">
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </div>
            <p>更多关卡等待解锁</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 单词学习视图 -->
    <div v-else-if="currentView === 'word'" class="level-content-view">
      <WordLearning 
        :chapter="currentChapter" 
        @complete="completeLevel" 
        @back="backToMap" 
      />
    </div>

    <!-- 拼写练习视图 -->
    <div v-else-if="currentView === 'spell'" class="level-content-view">
      <SpellingPractice 
        :chapter="currentChapter" 
        @complete="completeLevel" 
        @back="backToMap" 
      />
    </div>

    <!-- 听力训练视图 -->
    <div v-else-if="currentView === 'listen'" class="level-content-view">
      <ListeningPractice 
        :chapter="currentChapter" 
        @complete="completeLevel" 
        @back="backToMap" 
      />
    </div>

    <!-- 情景对话视图 -->
    <div v-else-if="currentView === 'customs'" class="level-content-view">
      <CustomsDialogue 
        :chapter="currentChapter" 
        @complete="completeLevel" 
        @back="backToMap" 
      />
    </div>

    <!-- AI实战视图 -->
    <div v-else-if="currentView === 'ai'" class="level-content-view">
      <AiChatPractice 
        :chapter="currentChapter" 
        @complete="completeLevel" 
        @back="backToMap" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo, switchChapter } from '@/api/auth'
import WordLearning from '@/components/levels/WordLearning.vue'
import SpellingPractice from '@/components/levels/SpellingPractice.vue'
import ListeningPractice from '@/components/levels/ListeningPractice.vue'
import CustomsDialogue from '@/components/levels/CustomsDialogue.vue'
import AiChatPractice from '@/components/levels/AiChatPractice.vue'

const router = useRouter()

// 视图状态管理
const currentView = ref('map') // 'map' | 'word' | 'spell' | 'listen' | 'customs' | 'ai'
const currentChapter = ref('A')

// 用户信息
const userInfo = ref({
  username: '',
  currentChapter: 'A',
  chapterProgress: {} as { [chapterKey: string]: { [levelType: string]: string } },
  levelProgress: {} as { [key: string]: any }
})

// 章节信息
const chapterInfo = computed(() => {
  const chapters: { [key: string]: { name: string; description: string } } = {
    A: { name: '酒店场景', description: '学习酒店相关的英语对话和词汇' },
    B: { name: '餐厅场景', description: '掌握餐厅用餐的英语表达' },
    C: { name: '机场场景', description: '熟悉机场和旅行相关英语' }
  }
  return chapters[currentChapter.value] || chapters.A
})

// 当前章节关卡配置
const currentChapterLevels = computed(() => [
  {
    id: 1,
    type: 'word',
    name: '单词学习',
    description: '学习本章节核心词汇',
    icon: 'fas fa-book',
    status: getLevelStatus('word')
  },
  {
    id: 2,
    type: 'spell',
    name: '拼写练习',
    description: '练习单词拼写技能',
    icon: 'fas fa-keyboard',
    status: getLevelStatus('spell')
  },
  {
    id: 3,
    type: 'listen',
    name: '听力训练',
    description: '提升听力理解能力',
    icon: 'fas fa-headphones',
    status: getLevelStatus('listen')
  },
  {
    id: 4,
    type: 'customs',
    name: '情景对话',
    description: '模拟真实场景对话',
    icon: 'fas fa-comments',
    status: getLevelStatus('customs')
  }
])

// 下一章节预览
const nextChapterPreview = computed(() => {
  const nextChapters: { [key: string]: { name: string; description: string } | null } = {
    A: { name: '餐厅场景', description: '掌握餐厅用餐的英语表达' },
    B: { name: '机场场景', description: '熟悉机场和旅行相关英语' },
    C: null
  }
  return nextChapters[currentChapter.value]
})

// 用户进度计算
const userProgress = computed(() => {
  const progress = userInfo.value.chapterProgress?.[currentChapter.value] || {}
  const totalLevels = currentChapterLevels.value.length
  const completedLevels = Object.values(progress).filter(status => status === 'completed').length
  return Math.round((completedLevels / totalLevels) * 100)
})

// 获取关卡状态
function getLevelStatus(levelType: string) {
  const progress = userInfo.value.chapterProgress?.[currentChapter.value] || {}
  return progress[levelType] || 'locked'
}

// 获取关卡样式类
function getLevelClass(level: any) {
  return {
    'completed': level.status === 'completed',
    'current': level.status === 'current',
    'locked': level.status === 'locked'
  }
}

// 进入关卡
function enterLevel(levelType: string) {
  const level = currentChapterLevels.value.find(l => l.type === levelType)
  if (!level || level.status === 'locked') {
    return
  }
  
  console.log(`进入关卡: ${levelType}`)
  currentView.value = levelType
}

// 完成关卡
function completeLevel(levelType: string) {
  console.log(`完成关卡: ${levelType}`)

  // 确保 chapterProgress 存在
  if (!userInfo.value.chapterProgress) {
    userInfo.value.chapterProgress = {}
  }

  // 更新用户进度
  if (!userInfo.value.chapterProgress[currentChapter.value]) {
    userInfo.value.chapterProgress[currentChapter.value] = {}
  }
  userInfo.value.chapterProgress[currentChapter.value][levelType] = 'completed'

  // 解锁下一关卡
  const currentIndex = currentChapterLevels.value.findIndex(l => l.type === levelType)
  if (currentIndex < currentChapterLevels.value.length - 1) {
    const nextLevel = currentChapterLevels.value[currentIndex + 1]
    userInfo.value.chapterProgress[currentChapter.value][nextLevel.type] = 'current'
  }

  // 返回地图
  backToMap()
}

// 返回关卡地图
function backToMap() {
  currentView.value = 'map'
  nextTick(() => {
    // 滚动到当前关卡位置
    scrollToCurrentLevel()
  })
}

// 滚动到当前关卡
function scrollToCurrentLevel() {
  // 实现滚动逻辑
}

// 返回章节选择
function goBack() {
  router.push('/chapters')
}

// 获取用户信息
async function fetchUserInfo() {
  try {
    const response = await getUserInfo()
    // axios 响应数据在 response.data 中
    const data = response.data || response

    if (data.code === 200) {
      // 直接使用 data，因为用户信息字段已经在顶层
      userInfo.value = {
        username: data.username || '',
        currentChapter: data.currentChapter || 'A',
        chapterProgress: data.chapterProgress || {},
        levelProgress: data.levelProgress || {}
      }
      currentChapter.value = data.currentChapter || 'A'
      console.log('用户信息获取成功:', userInfo.value)
    } else {
      console.error('获取用户信息失败:', data.message)
    }
  } catch (error) {
    console.error('获取用户信息出错:', error)
  }
}

// 组件挂载
onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.adventure-container {
  height: 100vh;
  overflow: hidden;
}

/* 关卡地图视图样式 */
.adventure-map-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255,255,255,0.3);
}

.chapter-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.chapter-subtitle {
  margin: 0.25rem 0 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.user-progress {
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.2);
  border-radius: 20px;
  font-size: 0.9rem;
}

.map-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
}

/* AI对话区域 */
.ai-chat-section {
  margin-bottom: 2rem;
  text-align: center;
}

.section-header h3 {
  margin: 0 0 0.5rem 0;
  color: #495057;
}

.section-header p {
  margin: 0 0 1rem 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.ai-chat-preview {
  display: inline-block;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.ai-chat-preview:hover {
  transform: translateY(-2px);
}

.chat-bubble {
  background: #007bff;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 20px;
  position: relative;
  max-width: 300px;
}

.chat-bubble::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #007bff;
}

/* 章节分隔线 */
.chapter-divider {
  display: flex;
  align-items: center;
  margin: 2rem 0;
}

.divider-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, transparent, #dee2e6, transparent);
}

.chapter-badge {
  padding: 0.5rem 1.5rem;
  background: #495057;
  color: white;
  border-radius: 20px;
  font-weight: bold;
  margin: 0 1rem;
}

.chapter-badge.preview {
  background: #6c757d;
  opacity: 0.7;
}

/* 关卡节点 */
.current-chapter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.level-node-container {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.connection-line {
  width: 4px;
  height: 30px;
  background: #dee2e6;
  margin: 0 auto;
}

.level-node {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;
}

.level-node:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.level-node.completed {
  border-color: #28a745;
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
}

.level-node.current {
  border-color: #007bff;
  background: linear-gradient(135deg, #cce7ff, #b3d9ff);
  animation: pulse 2s infinite;
}

.level-node.locked {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f8f9fa;
}

.level-node.preview {
  opacity: 0.5;
}

@keyframes pulse {
  0% { box-shadow: 0 4px 15px rgba(0,123,255,0.3); }
  50% { box-shadow: 0 4px 25px rgba(0,123,255,0.5); }
  100% { box-shadow: 0 4px 15px rgba(0,123,255,0.3); }
}

.level-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 50%;
  margin-right: 1rem;
  font-size: 1.5rem;
  color: #495057;
}

.level-node.completed .level-icon {
  background: #28a745;
  color: white;
}

.level-node.current .level-icon {
  background: #007bff;
  color: white;
}

.level-info {
  flex: 1;
}

.level-info h4 {
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 1.1rem;
}

.level-info p {
  margin: 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.level-status {
  font-size: 1.5rem;
}

.level-status .fa-check-circle {
  color: #28a745;
}

.level-status .fa-play-circle {
  color: #007bff;
}

.level-status .fa-lock {
  color: #6c757d;
}

/* 下一章节预览 */
.next-chapter-preview {
  margin-top: 2rem;
  opacity: 0.8;
}

.hidden-levels-hint {
  text-align: center;
  margin-top: 1rem;
  color: #6c757d;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dots span {
  font-size: 1.5rem;
  opacity: 0.5;
}

/* 关卡内容视图样式 */
.level-content-view {
  height: 100vh;
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-nav {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-center {
    text-align: center;
  }
  
  .map-container {
    padding: 1rem;
  }
  
  .level-node {
    padding: 1rem;
  }
  
  .level-icon {
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
  }
}
</style>
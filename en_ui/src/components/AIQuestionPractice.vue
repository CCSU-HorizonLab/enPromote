<template>
  <div class="ai-question-practice">
    <!-- 进度条 -->
    <div class="practice-header">
      <div class="progress-info">
        <span class="progress-text">AI生成题目</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <span class="progress-count">{{ currentQuestionIndex + 1 }} / {{ questions.length }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>AI正在为您生成个性化题目...</p>
    </div>

    <!-- 没有题目的提示 -->
    <div v-else-if="!loading && questions.length === 0" class="no-questions-state">
      <div class="no-questions-content">
        <div class="no-questions-icon">🤖</div>
        <h2>暂无可生成的题目</h2>
        <p class="no-questions-message">请先完成一些词汇练习，积累足够的单词后再来！</p>
      </div>
    </div>

    <!-- AI题目练习内容 -->
    <div v-else-if="currentQuestion && !showComplete" class="question-exercise">
      <!-- 音频脚本显示区域 -->
      <div class="audio-script-section" v-if="audioScript">
        <div class="script-header">
          <div class="ai-badge">🤖 AI生成对话</div>
          <div class="script-type">酒店场景对话</div>
        </div>

        <div class="script-content">
          <h3 class="script-title">📖 对话内容</h3>
          <div class="script-text">{{ audioScript }}</div>
        </div>
      </div>

      <!-- 题目显示区域 -->
      <div class="question-section">
        <div class="question-header">
          <div class="ai-badge">🤖 AI生成</div>
          <div class="question-type">填空题</div>
        </div>

        <div class="question-content">
          <h3 class="question-title">{{ currentQuestion.sentence }}</h3>
          <p class="question-instruction">请选择正确的单词填入空白处</p>
        </div>
      </div>

      <!-- 选项区域 -->
      <div class="options-section">
        <div class="options-grid">
          <button v-for="(option, index) in currentQuestion.options" :key="index" class="option-btn" :class="{
            'selected': selectedOption === index,
            'correct': showResult && option === currentQuestion.answer,
            'incorrect': showResult && selectedOption === index && option !== currentQuestion.answer
          }" @click="selectOption(index)" :disabled="showResult">
            <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
            <span class="option-text">{{ option }}</span>
          </button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button v-if="!showResult" class="submit-btn" @click="submitAnswer" :disabled="!canSubmit">
          提交答案
        </button>

        <div v-if="showResult" class="result-section">
          <div class="result-message" :class="{ 'success': isCorrect, 'error': !isCorrect }">
            <div class="result-icon">
              {{ isCorrect ? '✅' : '❌' }}
            </div>
            <div class="result-text">
              <h4>{{ isCorrect ? '回答正确！' : '回答错误' }}</h4>
              <p v-if="!isCorrect">
                正确答案：{{ currentQuestion.answer }}
              </p>
              <p v-if="currentQuestion.explanation" class="explanation">
                <strong>解析：</strong>{{ currentQuestion.explanation }}
              </p>
            </div>
          </div>

          <div class="result-actions">
            <button class="next-btn" @click="nextQuestion">
              {{ currentQuestionIndex < questions.length - 1 ? '下一题' : '完成练习' }} </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 练习完成 -->
    <div v-else-if="showComplete" class="completion-state">
      <div class="completion-content">
        <div class="completion-icon">🎉</div>
        <h2>AI题目练习完成！</h2>
        <div class="completion-stats">
          <div class="stat-item">
            <span class="stat-number">{{ correctCount }}</span>
            <span class="stat-label">正确</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ questions.length - correctCount }}</span>
            <span class="stat-label">错误</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ Math.round((correctCount / questions.length) * 100) }}%</span>
            <span class="stat-label">准确率</span>
          </div>
        </div>
        <div class="completion-actions">
          <button class="btn btn-primary" @click="handleComplete">
            完成练习
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

// Props
const props = defineProps({
  positionType: {
    type: String,
    required: true
  },
  wordList: {
    type: Array,
    required: true
  },
  preloadedQuestions: {
    type: Object,
    default: null
  },
  usePreloaded: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['complete', 'correct', 'incorrect', 'answer', 'questionsGenerated'])

// 响应式数据
const loading = ref(false)
const questions = ref([])
const audioScript = ref('')
const currentQuestionIndex = ref(0)
const selectedOption = ref(null)
const userAnswer = ref('')
const showResult = ref(false)
const isCorrect = ref(false)
const correctCount = ref(0)
const showComplete = ref(false)

// 计算属性
const currentQuestion = computed(() => {
  if (!questions.value || questions.value.length === 0 || currentQuestionIndex.value >= questions.value.length) {
    return null
  }
  return questions.value[currentQuestionIndex.value]
})

const progressPercentage = computed(() => {
  if (questions.value.length === 0) return 0
  return (currentQuestionIndex.value / questions.value.length) * 100
})

const canSubmit = computed(() => {
  if (!currentQuestion.value) return false
  return selectedOption.value !== null
})

// 监听props变化
watch(() => [props.positionType, props.wordList, props.usePreloaded, props.preloadedQuestions], () => {
  // 优先检查预加载题目
  if (props.usePreloaded && props.preloadedQuestions) {
    console.log('检测到预加载题目变化，重新生成')
    generateQuestions()
  } else if (props.positionType && props.wordList.length > 0) {
    generateQuestions()
  }
})

// 方法
const generateQuestions = async () => {
  // 优先使用预加载的题目
  if (props.usePreloaded && props.preloadedQuestions) {
    console.log('使用预加载的AI题目')
    loadPreloadedQuestions()
    return
  }

  if (!props.positionType || props.wordList.length === 0) return

  try {
    loading.value = true

    const response = await fetch('/api/aiApi/ai_generate_question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        PositionType: props.positionType,
        wordList: props.wordList
      })
    })

    const data = await response.json()

    if (data.code === 200) {
      // 处理新的数据结构，支持两种题目类型
      audioScript.value = data.data.audio_script || ''
      
      if (data.data.fill_in_the_blanks && data.data.fill_in_the_blanks.length > 0) {
        questions.value = data.data.fill_in_the_blanks
        console.log('✅ 实时生成填空题类型')
      } else if (data.data.comprehension_questions && data.data.comprehension_questions.length > 0) {
        // 将理解题转换为填空题格式
        questions.value = data.data.comprehension_questions.map(q => ({
          sentence: q.question,
          answer: q.correct_answer,
          options: q.options
        }))
        console.log('✅ 实时生成理解题类型并转换格式')
      } else {
        questions.value = []
        console.warn('⚠️ 实时生成未找到有效的题目数据')
      }
      
      resetPractice()

      // 通知父组件题目已生成，用于存储
      emit('questionsGenerated', {
        data: data.data,
        chapter: data.chapter || props.positionType,
        timestamp: Date.now()
      })

      console.log('✅ AI题目实时生成成功，已通知父组件存储')
    } else {
      console.error('生成题目失败:', data.message)
    }
  } catch (error) {
    console.error('生成题目请求失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载预加载的题目
const loadPreloadedQuestions = () => {
  try {
    loading.value = true
    console.log('🔄 开始加载预加载题目:', props.preloadedQuestions)

    const data = props.preloadedQuestions

    if (!data) {
      console.error('❌ 预加载数据为空')
      questions.value = []
      return
    }

    // 处理预加载的数据结构
    audioScript.value = data.audio_script || ''
    
    // 支持两种题目类型：填空题和理解题
    if (data.fill_in_the_blanks && data.fill_in_the_blanks.length > 0) {
      questions.value = data.fill_in_the_blanks
      console.log('✅ 加载填空题类型')
    } else if (data.comprehension_questions && data.comprehension_questions.length > 0) {
      // 将理解题转换为填空题格式
      questions.value = data.comprehension_questions.map(q => ({
        sentence: q.question,
        answer: q.correct_answer,
        options: q.options
      }))
      console.log('✅ 加载理解题类型并转换格式')
    } else {
      questions.value = []
      console.warn('⚠️ 未找到有效的题目数据')
    }
    
    resetPractice()

    console.log('✅ 预加载题目加载成功:')
    console.log('  - 音频脚本长度:', audioScript.value.length)
    console.log('  - 题目数量:', questions.value.length)
    console.log('  - 题目类型:', data.fill_in_the_blanks ? '填空题' : '理解题')
    console.log('  - 题目详情:', questions.value)
  } catch (error) {
    console.error('❌ 加载预加载题目时出错:', error)
    questions.value = []
  } finally {
    loading.value = false
  }
}

const resetPractice = () => {
  currentQuestionIndex.value = 0
  selectedOption.value = null
  userAnswer.value = ''
  showResult.value = false
  isCorrect.value = false
  correctCount.value = 0
  showComplete.value = false
}

const selectOption = (index) => {
  if (showResult.value) return
  selectedOption.value = index
}

const submitAnswer = () => {
  if (!canSubmit.value || showResult.value) return

  // 获取用户选择的选项文本
  const selectedOptionText = currentQuestion.value.options[selectedOption.value]
  const correctAnswer = currentQuestion.value.answer

  isCorrect.value = selectedOptionText === correctAnswer
  showResult.value = true

  if (isCorrect.value) {
    correctCount.value++
    emit('correct', currentQuestionIndex.value)
  } else {
    emit('incorrect', currentQuestionIndex.value)
  }

  // 发送答题记录
  emit('answer', {
    questionIndex: currentQuestionIndex.value,
    selectedAnswer: selectedOptionText,
    correctAnswer: correctAnswer,
    isCorrect: isCorrect.value,
    question: currentQuestion.value
  })
}

const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++
    selectedOption.value = null
    userAnswer.value = ''
    showResult.value = false
    isCorrect.value = false
  } else {
    showComplete.value = true
  }
}

const handleComplete = () => {
  emit('complete', {
    total: questions.value.length,
    correct: correctCount.value,
    accuracy: Math.round((correctCount.value / questions.value.length) * 100)
  })
}

const getQuestionTypeText = (type) => {
  const typeMap = {
    'multiple_choice': '选择题',
    'fill_blank': '填空题',
    'true_false': '判断题'
  }
  return typeMap[type] || '题目'
}

// 生命周期
onMounted(() => {
  // 延迟执行，确保所有函数都已定义
  nextTick(() => {
    // 优先检查预加载题目
    if (props.usePreloaded && props.preloadedQuestions) {
      console.log('组件挂载时发现预加载题目')
      generateQuestions()
    } else if (props.positionType && props.wordList.length > 0) {
      generateQuestions()
    }
  })
})
</script>

<style scoped>
.ai-question-practice {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.practice-header {
  margin-bottom: 2rem;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-text {
  font-weight: 600;
  color: #333;
  min-width: 100px;
}

.progress-bar {
  flex: 1;
  background: #f0f0f0;
  border-radius: 10px;
  height: 8px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-count {
  font-size: 14px;
  color: #666;
  min-width: 60px;
  text-align: right;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 3rem 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 没有题目状态 */
.no-questions-state {
  text-align: center;
  padding: 3rem 1rem;
}

.no-questions-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.no-questions-content h2 {
  color: #333;
  margin-bottom: 1rem;
}

.no-questions-message {
  color: #666;
  font-size: 1.1rem;
}

/* 音频脚本区域 */
.audio-script-section {
  margin-bottom: 2rem;
}

.script-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.script-type {
  background: #e8f5e8;
  color: #4CAF50;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.script-content {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
}

.script-title {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.script-text {
  color: #555;
  line-height: 1.8;
  white-space: pre-line;
  font-size: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

/* 题目区域 */
.question-section {
  margin-bottom: 2rem;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.ai-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.question-type {
  background: #f8f9fa;
  color: #666;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.question-content {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
}

.question-title {
  font-size: 1.3rem;
  color: #333;
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.question-instruction {
  font-size: 1rem;
  color: #666;
  margin-bottom: 1rem;
  font-style: italic;
}

.question-context {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.context-label {
  font-weight: 600;
  color: #667eea;
  margin-bottom: 0.5rem;
}

.context-text {
  color: #666;
  line-height: 1.6;
}

/* 选项区域 */
.options-section {
  margin-bottom: 2rem;
}

.options-grid {
  display: grid;
  gap: 1rem;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f8f9ff;
}

.option-btn.selected {
  border-color: #667eea;
  background: #f8f9ff;
}

.option-btn.correct {
  border-color: #4CAF50;
  background: #e8f5e8;
}

.option-btn.incorrect {
  border-color: #f44336;
  background: #ffeaea;
}

.option-btn:disabled {
  cursor: not-allowed;
}

.option-label {
  font-weight: 600;
  color: #667eea;
  min-width: 24px;
}

.option-text {
  flex: 1;
  color: #333;
}

/* 填空题区域 */
.fill-blank-section {
  margin-bottom: 2rem;
}

.input-area {
  display: flex;
  justify-content: center;
}

.answer-input {
  width: 100%;
  max-width: 400px;
  padding: 1rem 1.5rem;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 1.1rem;
  text-align: center;
  transition: border-color 0.3s ease;
}

.answer-input:focus {
  outline: none;
  border-color: #667eea;
}

/* 操作区域 */
.action-section {
  text-align: center;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 结果区域 */
.result-section {
  margin-top: 2rem;
}

.result-message {
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.result-message.success {
  background: #e8f5e8;
  border: 2px solid #4CAF50;
}

.result-message.error {
  background: #ffeaea;
  border: 2px solid #f44336;
}

.result-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.result-text h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.result-text p {
  margin: 0.5rem 0;
  color: #666;
}

.explanation {
  background: rgba(255, 255, 255, 0.5);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.next-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.next-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 完成状态 */
.completion-state {
  text-align: center;
  padding: 2rem;
}

.completion-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.completion-content h2 {
  color: #333;
  margin-bottom: 2rem;
}

.completion-stats {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

@media (max-width: 768px) {
  .ai-question-practice {
    padding: 1rem;
  }

  .options-grid {
    gap: 0.5rem;
  }

  .option-btn {
    padding: 0.8rem 1rem;
  }

  .completion-stats {
    gap: 1rem;
  }
}
</style>

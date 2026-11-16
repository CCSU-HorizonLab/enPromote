<template>
  <div class="listening-practice">
    <!-- 进度条 -->
    <div class="listening-header">
      <div class="progress-info" v-if="words.length > 0">
        <span class="progress-text">听力阶梯训练</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <span class="progress-count">{{ currentIndex + 1 }} / {{ words.length }}</span>
      </div>
      <div class="progress-info" v-else>
        <span class="progress-text">暂无练习单词</span>
      </div>

      <div v-if="words.length > 0 && !showComplete" class="listening-mode-bar">
        <span class="step-mode-badge" :class="currentExerciseMode === 'sentence' ? 'badge-sentence' : 'badge-word'">
          {{ currentExerciseMode === 'sentence' ? '🎧 场景整句抓词（盲听过渡）' : '🔤 单字发音热身' }}
        </span>
        <span v-if="currentRoleBadge" class="role-badge" :class="currentRoleBadge.cls">
          {{ currentRoleBadge.label }}
        </span>
        <button
          type="button"
          class="mode-switch-pill"
          @click="toggleTrainingStrategy"
          title="切换混合阶梯模式或纯单字听写"
        >
          {{ trainingStrategy === 'ladder' ? '切换：纯单字听写' : '切换：整句阶梯模式（推荐）' }}
        </button>
      </div>
    </div>

    <!-- 没有单词的提示 -->
    <div v-if="words.length === 0" class="no-words-state">
      <div class="no-words-content">
        <div class="no-words-icon">📚</div>
        <h2>还没有需要练习的单词哦</h2>
        <p class="no-words-message">快去词汇练习练几个再来吧！</p>
      </div>
    </div>

    <!-- 听力练习内容 -->
    <div v-else-if="currentWord && !showComplete" class="listening-exercise">
      <!-- 音频播放区域 -->
      <div class="audio-section">
        <div class="audio-controls">
          <button
            class="play-btn"
            @click="playAudio"
            :disabled="audioLoading"
            :class="{ playing: isPlaying }"
          >
            <span v-if="audioLoading">⏳</span>
            <span v-else-if="isPlaying">⏸️</span>
            <span v-else>🔊</span>
          </button>
          <div class="audio-info">
            <p class="instruction" v-if="currentExerciseMode === 'sentence'">
              请听完整英文场景句，从语流中抓取并拼出缺失的核心词（空格播放 / 回车提交）
            </p>
            <p class="instruction" v-else-if="audioUrl || currentWord.word">
              点击播放按钮或按空格键听单词发音，拼出听到的单词
            </p>
            <p class="hint" v-if="showHint">中文释义: {{ currentWord.mean }}</p>
            <p class="sentence-frame-box" v-if="currentExerciseMode === 'sentence' && showSentenceFrame">
              句干框架：<strong>{{ maskedSentenceFrame }}</strong>
            </p>
          </div>
        </div>

        <div class="audio-actions">
          <button class="replay-btn" @click="playAudio" type="button">
            🔄 重播音频
          </button>
          <button
            v-if="currentExerciseMode === 'sentence'"
            class="hint-btn"
            @click="showSentenceFrame = !showSentenceFrame"
            :class="{ active: showSentenceFrame }"
            type="button"
          >
            👁️ {{ showSentenceFrame ? '隐藏句干' : '看挖空句干' }}
          </button>
          <button class="hint-btn" @click="toggleHint" :class="{ active: showHint }" type="button">
            💡 {{ showHint ? '隐藏释义' : '显示释义' }}
          </button>
        </div>
      </div>

      <!-- 听写输入区域 -->
      <div class="input-section">
        <div class="letters-container">
          <div v-for="(letter, index) in wordLetters" :key="index" class="letter-slot" :class="{
            'active': !isComplete && index === currentPosition,
            'filled': userInput[index] !== '',
            'correct': isComplete && userInput[index] === letter,
            'incorrect': isComplete && userInput[index] !== letter && userInput[index] !== ''
          }">
            <span class="user-letter">{{ userInput[index] || '' }}</span>
            <div class="underline"></div>
          </div>
        </div>

        <div class="input-info">
          <p class="input-hint">键盘操作：字母输入 | 退格修改 | 空格重听 | Enter 提交确认 | Tab 提示</p>
          <p class="input-progress">已输入: {{ filledCount }} / {{ wordLength }}</p>
          <button
            v-if="!isComplete"
            type="button"
            class="confirm-dictation-btn"
            :disabled="filledCount === 0"
            @click="checkAnswer"
          >
            ✅ 确认听写 (Enter)
          </button>
        </div>
      </div>

      <!-- 结果显示 -->
      <div v-if="isComplete" class="result-section">
        <div class="result-message" :class="{ 'success': isCorrect, 'error': !isCorrect }">
          <div class="result-icon">
            {{ isCorrect ? '✅' : '❌' }}
          </div>
          <div class="result-text">
            <h3>{{ isCorrect ? '听写正确！' : '听写有误' }}</h3>
            <p v-if="!isCorrect">
              正确答案：<strong>{{ currentWord.word }}</strong>
            </p>
            <div v-if="usableExample" class="result-sentence-recap">
              <span>完整场景句：</span>
              <template v-for="(seg, idx) in exampleSegments" :key="idx">
                <mark v-if="seg.isMatch" class="word-highlight">{{ seg.text }}</mark>
                <span v-else>{{ seg.text }}</span>
              </template>
              <button type="button" class="mini-audio-btn" @click="playSentenceAudio()">🔊</button>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <button class="next-btn" @click="nextWord">
            {{ currentIndex < words.length - 1 ? '下一个' : '完成练习' }} (Enter)
          </button>
        </div>
      </div>
    </div>

    <!-- 训练完成 -->
    <div v-else-if="showComplete" class="completion-state">
      <div class="completion-content">
        <div class="completion-icon">🎉</div>
        <h2>听力阶梯训练完成！</h2>
        <div class="completion-stats">
          <div class="stat-item">
            <span class="stat-number">{{ correctCount }}</span>
            <span class="stat-label">正确</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ words.length - correctCount }}</span>
            <span class="stat-label">错误</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ words.length > 0 ? Math.round((correctCount / words.length) * 100) : 0 }}%</span>
            <span class="stat-label">准确率</span>
          </div>
        </div>
        <div class="completion-actions">
          <button class="btn btn-primary" @click="handleComplete">
            完成训练
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getWordAudio, updateWordPriority } from '@/api/word'
import { playSpeechText, stopSpeechPlayback } from '@/utils/speechPlayer'
import { getCombatRoleMeta, splitSentenceByWord, buildMaskedSentence } from '@/utils/vocabMeta'

// Props
const props = defineProps({
  words: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['complete', 'correct', 'incorrect'])

// 响应式数据
const currentIndex = ref(0)
const audioUrl = ref('')
const audioLoading = ref(false)
const isPlaying = ref(false)
const showHint = ref(false)
const showSentenceFrame = ref(false)
const trainingStrategy = ref('ladder') // 'ladder' (单字热身+整句抓词) | 'word_only'
const userInput = ref([])
const currentPosition = ref(0)
const isComplete = ref(false)
const isCorrect = ref(false)
const correctCount = ref(0)
const showComplete = ref(false)

// 计算属性
const currentWord = computed(() => {
  if (!props.words || props.words.length === 0 || currentIndex.value >= props.words.length) {
    return null
  }
  return props.words[currentIndex.value]
})

const progressPercentage = computed(() => {
  if (props.words.length === 0) return 0
  return Math.min(100, ((currentIndex.value + 1) / props.words.length) * 100)
})

const wordLetters = computed(() => {
  if (!currentWord.value?.word) return []
  return currentWord.value.word.toLowerCase().split('')
})

const wordLength = computed(() => wordLetters.value.length)

const filledCount = computed(() => {
  return userInput.value.filter(letter => letter !== '').length
})

const usableExample = computed(() => {
  const raw = String(currentWord.value?.example || '').trim()
  if (!raw || raw === '暂无例句') return ''
  return raw
})

const exampleHasTargetWord = computed(() => {
  if (!usableExample.value || !currentWord.value?.word) return false
  const escaped = currentWord.value.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(usableExample.value)
})

// 混合阶梯模式：前 3 词作为单字热身，后续含可用例句的词自动切换为“整句语流听辨填词”
const currentExerciseMode = computed(() => {
  if (trainingStrategy.value === 'word_only') return 'word'
  if (currentIndex.value >= 3 && exampleHasTargetWord.value) {
    return 'sentence'
  }
  return 'word'
})

const currentRoleBadge = computed(() => getCombatRoleMeta(currentWord.value?.combatRole))
const maskedSentenceFrame = computed(() => buildMaskedSentence(usableExample.value, currentWord.value?.word || ''))
const exampleSegments = computed(() => splitSentenceByWord(usableExample.value, currentWord.value?.word || ''))

// 监听当前单词变化
watch(currentWord, async (newWord) => {
  if (newWord) {
    await resetWordState()
    if (currentExerciseMode.value === 'word') {
      await loadAudio()
    }
  }
})

// 方法
const resetWordState = async () => {
  stopSpeechPlayback()
  userInput.value = new Array(wordLetters.value.length).fill('')
  currentPosition.value = 0
  isComplete.value = false
  isCorrect.value = false
  showHint.value = false
  showSentenceFrame.value = false
  isPlaying.value = false
  audioUrl.value = ''
}

const toggleTrainingStrategy = () => {
  stopSpeechPlayback()
  trainingStrategy.value = trainingStrategy.value === 'ladder' ? 'word_only' : 'ladder'
  if (currentExerciseMode.value === 'word' && !audioUrl.value) {
    loadAudio()
  }
}

const loadAudio = async () => {
  if (!currentWord.value?.word) return

  try {
    audioLoading.value = true
    const response = await getWordAudio({ word: currentWord.value.word })
    if (response?.data?.code === 200 && response?.data?.data) {
      audioUrl.value = response.data.data
    }
  } catch (error) {
    console.error('获取音频失败:', error)
  } finally {
    audioLoading.value = false
  }
}

const playSentenceAudio = async () => {
  const sentence = usableExample.value || currentWord.value?.word
  if (!sentence) return
  await playSpeechText({
    text: sentence,
    key: `listen_sentence_${currentIndex.value}`,
    onStart: () => {
      isPlaying.value = true
    },
    onEnd: () => {
      isPlaying.value = false
    },
    onError: () => {
      isPlaying.value = false
    }
  })
}

const playAudio = () => {
  if (audioLoading.value) return
  if (currentExerciseMode.value === 'sentence') {
    playSentenceAudio()
    return
  }

  if (audioUrl.value) {
    stopSpeechPlayback()
    const audio = new Audio(audioUrl.value)
    isPlaying.value = true
    audio.onended = () => {
      isPlaying.value = false
    }
    audio.onerror = () => {
      isPlaying.value = false
      playSpeechText({ text: currentWord.value?.word || '', key: `listen_word_${currentIndex.value}` })
    }
    audio.play().catch(() => {
      isPlaying.value = false
      playSpeechText({ text: currentWord.value?.word || '', key: `listen_word_${currentIndex.value}` })
    })
    return
  }

  playSpeechText({
    text: currentWord.value?.word || '',
    key: `listen_word_${currentIndex.value}`,
    onStart: () => {
      isPlaying.value = true
    },
    onEnd: () => {
      isPlaying.value = false
    },
    onError: () => {
      isPlaying.value = false
    }
  })
}

const toggleHint = () => {
  showHint.value = !showHint.value
}

const handleKeyPress = (event) => {
  const key = event.key.toLowerCase()

  if (isComplete.value) {
    if (key === 'enter') {
      nextWord()
    }
    return
  }

  if (key === ' ') {
    event.preventDefault()
    playAudio()
  } else if (key === 'tab') {
    event.preventDefault()
    toggleHint()
  } else if (key === 'enter') {
    if (filledCount.value > 0) {
      checkAnswer()
    }
  } else if (key === 'backspace') {
    if (currentPosition.value < wordLetters.value.length && userInput.value[currentPosition.value] !== '') {
      userInput.value[currentPosition.value] = ''
    } else if (currentPosition.value > 0) {
      currentPosition.value--
      userInput.value[currentPosition.value] = ''
    }
  } else if (/^[a-z]$/.test(key) && currentPosition.value < wordLetters.value.length) {
    userInput.value[currentPosition.value] = key
    if (currentPosition.value < wordLetters.value.length - 1) {
      currentPosition.value++
    }
  }
}

const checkAnswer = () => {
  if (isComplete.value || !currentWord.value) return
  const userWord = userInput.value.join('').toLowerCase()
  const correctWord = currentWord.value.word.toLowerCase()

  isCorrect.value = userWord === correctWord
  isComplete.value = true

  if (isCorrect.value) {
    correctCount.value++
    emit('correct', currentIndex.value)
    updateWordPriority({
      word: currentWord.value.word,
      newStatus: 'know'
    })
  } else {
    emit('incorrect', currentIndex.value)
    updateWordPriority({
      word: currentWord.value.word,
      newStatus: 'unknown'
    })
  }
}

const nextWord = () => {
  stopSpeechPlayback()
  if (currentIndex.value < props.words.length - 1) {
    currentIndex.value++
  } else {
    showComplete.value = true
  }
}

const handleComplete = () => {
  stopSpeechPlayback()
  emit('complete', {
    total: props.words.length,
    correct: correctCount.value,
    accuracy: props.words.length > 0 ? Math.round((correctCount.value / props.words.length) * 100) : 0
  })
}

// 生命周期
onMounted(() => {
  if (currentWord.value && currentExerciseMode.value === 'word') {
    loadAudio()
  }
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  stopSpeechPlayback()
})
</script>

<style scoped>
/* 基础样式 */
.listening-practice {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.listening-header {
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
  min-width: 80px;
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

/* 没有单词状态 */
.no-words-state {
  text-align: center;
  padding: 3rem 1rem;
}

.no-words-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.no-words-content h2 {
  color: #333;
  margin-bottom: 1rem;
}

.no-words-message {
  color: #666;
  font-size: 1.1rem;
}

/* 音频区域 */
.audio-section {
  margin-bottom: 2rem;
  text-align: center;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  justify-content: center;
}

.play-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn.playing {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

.audio-info {
  text-align: left;
}

.instruction {
  font-size: 1rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.instruction.no-audio {
  color: #ff9800;
}

.hint {
  font-size: 1.1rem;
  color: #667eea;
  font-weight: 600;
}

.audio-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.hint-btn,
.replay-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.hint-btn {
  background: #FF9800;
  color: white;
}

.hint-btn.active {
  background: #4CAF50;
}

.replay-btn {
  background: #2196F3;
  color: white;
}

.hint-btn:hover,
.replay-btn:hover {
  transform: translateY(-2px);
}

/* 输入区域 */
.input-section {
  margin-bottom: 2rem;
}

.letters-container {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.letter-slot {
  position: relative;
  width: 40px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-letter {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  text-transform: lowercase;
}

.underline {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  height: 2px;
  background: #ddd;
  border-radius: 1px;
}

.letter-slot.active .underline {
  background: #667eea;
  animation: blink 1s infinite;
}

.letter-slot.filled .underline {
  background: #333;
}

.letter-slot.correct .user-letter {
  color: #4CAF50;
}

.letter-slot.correct .underline {
  background: #4CAF50;
}

.letter-slot.incorrect .user-letter {
  color: #f44336;
}

.letter-slot.incorrect .underline {
  background: #f44336;
}

@keyframes blink {

  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

.input-info {
  text-align: center;
  color: #666;
}

.input-hint {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.input-progress {
  font-size: 1rem;
  font-weight: 500;
}

/* 结果区域 */
.result-section {
  margin-top: 2rem;
}

.result-message {
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  text-align: center;
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

.result-text h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.result-text p {
  margin: 0;
  color: #666;
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
  .listening-practice {
    padding: 1rem;
  }

  .audio-controls {
    flex-direction: column;
    gap: 0.5rem;
  }

  .letters-container {
    gap: 4px;
  }

  .letter-slot {
    width: 30px;
    height: 40px;
  }

  .user-letter {
    font-size: 1.2rem;
  }

  .completion-stats {
    gap: 1rem;
  }
}

.listening-mode-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.step-mode-badge,
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.step-mode-badge.badge-sentence {
  background: #ede9fe;
  color: #6d28d9;
}

.step-mode-badge.badge-word {
  background: #e0f2fe;
  color: #0369a1;
}

.role-badge {
  background: #f1f5f9;
  color: #334155;
}

.role-badge.role-evidence {
  background: #eff6ff;
  color: #1d4ed8;
}

.role-badge.role-stance {
  background: #ecfdf5;
  color: #047857;
}

.role-badge.role-twist {
  background: #fef3c7;
  color: #b45309;
}

.mode-switch-pill {
  margin-left: auto;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}

.sentence-frame-box {
  margin: 8px 0 0;
  padding: 8px 12px;
  background: #f8fafc;
  border-left: 3px solid #667eea;
  border-radius: 6px;
  color: #1e293b;
  font-size: 0.95rem;
}

.confirm-dictation-btn {
  margin-top: 10px;
  padding: 8px 20px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
}

.confirm-dictation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-sentence-recap {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  color: #1e293b;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.word-highlight {
  background: #fef08a;
  color: #1e293b;
  padding: 0 4px;
  border-radius: 4px;
  font-weight: 700;
}

.mini-audio-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 999px;
  padding: 2px 8px;
  cursor: pointer;
  margin-left: 4px;
}
</style>

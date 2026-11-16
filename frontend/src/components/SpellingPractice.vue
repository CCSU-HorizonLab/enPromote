<template>
  <div class="spelling-practice">
    <!-- 进度条 -->
    <div class="spelling-header">
      <div class="progress-info">
        <span class="progress-text">靶向拼写</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <span class="progress-count">{{ currentIndex + 1 }} / {{ words.length }}</span>
      </div>
      <div v-if="currentWord" class="spelling-meta-row">
        <span class="mode-pill" :class="isClueMode ? 'mode-clue' : 'mode-full'">
          {{ isClueMode ? '⚡ 词干轻填（已认识词减负）' : '✍️ 重点词完整拼写' }}
        </span>
        <span v-if="currentRoleBadge" class="role-badge" :class="currentRoleBadge.cls">
          {{ currentRoleBadge.label }}
        </span>
      </div>
    </div>

    <!-- 当前单词 -->
    <div class="word-section" v-if="currentWord">
      <div class="word-hint">
        <h3 class="hint-text">{{ isClueMode ? '请补全空缺字母：' : '请拼写这个单词：' }}</h3>
        <p class="meaning">{{ currentWord.mean || currentWord.chineseMeaning }}</p>
        <div class="phonetic" v-if="currentWord.phonetic_symbol || currentWord.phonetic">
          {{ currentWord.phonetic_symbol || currentWord.phonetic }}
        </div>
      </div>

      <!-- 拼写输入区域 -->
      <div class="spelling-input-area">
        <div class="letters-container">
          <div v-for="(letter, index) in wordLetters" :key="index" class="letter-slot" :class="{
            'active': !showResult && index === currentPosition,
            'locked': lockedIndices.has(index),
            'filled': userInput[index] !== '',
            'correct': showResult && !lockedIndices.has(index) && userInput[index] === letter,
            'incorrect': showResult && !lockedIndices.has(index) && userInput[index] !== letter && userInput[index] !== ''
          }">
            <span class="user-letter">{{ userInput[index] || '' }}</span>
            <div class="underline"></div>
          </div>
        </div>
      </div>

      <!-- 结果显示 -->
      <div v-if="showResult" class="result-section">
        <div class="result-message" :class="{ 'success': isCorrect, 'error': !isCorrect }">
          <div class="result-icon">
            {{ isCorrect ? '✅' : '❌' }}
          </div>
          <div class="result-text">
            <h3>{{ isCorrect ? '拼写正确！' : '拼写有误，已定位记忆缺口' }}</h3>
            <p v-if="!isCorrect">
              正确答案：<strong>{{ currentWord.word }}</strong>
            </p>
            <div v-if="currentExample" class="result-example-box">
              <span>例句：</span>
              <template v-for="(seg, idx) in exampleSegments" :key="idx">
                <mark v-if="seg.isMatch" class="word-highlight">{{ seg.text }}</mark>
                <span v-else>{{ seg.text }}</span>
              </template>
              <button type="button" class="mini-audio-btn" @click="replaySpellingAudio">🔊</button>
            </div>
          </div>
        </div>

        <!-- 错词当场复输闭环 -->
        <div v-if="!isCorrect && needsCorrection" class="correction-box">
          <p class="correction-label">
            🔄 请正确拼写一遍 <strong>{{ currentWord.word }}</strong> 完成当场纠偏（输入完成即解锁）：
          </p>
          <div class="correction-controls">
            <input
              ref="correctionInputRef"
              v-model="correctionText"
              type="text"
              class="correction-input"
              placeholder="在此输入正确单词..."
              @input="handleCorrectionInput"
              @keyup.enter="verifyCorrectionOnEnter"
            />
            <button type="button" class="skip-correction-btn" @click="skipCorrection">
              跳过此词 →
            </button>
          </div>
        </div>

        <div v-else class="result-actions">
          <p v-if="!isCorrect && correctionDone" class="correction-success-tip">✨ 已完成当场纠偏巩固</p>
          <button class="next-btn" @click="nextWord">
            {{ currentIndex < words.length - 1 ? '下一个单词' : '完成练习' }}
          </button>
          <p class="result-hint">💡 按回车键直接继续（无需等待音频结束）</p>
        </div>
      </div>

      <!-- 操作提示 -->
      <div v-if="!showResult" class="input-hint">
        <p>键盘输入缺失字母，退格修改，按回车键确认</p>
        <div class="hint-actions-row">
          <button class="hint-btn" @click="replaySpellingAudio" type="button">
            🔊 先听发音提示
          </button>
          <button class="hint-btn" @click="showHint" v-if="!hintShown" type="button">
            💡 显示线索提示
          </button>
        </div>
        <div v-if="hintShown" class="hint-display">
          <p>单词长度：{{ currentWord.word.length }} 个字母</p>
          <p>首字母：{{ currentWord.word[0].toUpperCase() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { getWordAudio } from '@/api/word'
import { playSpeechText, stopSpeechPlayback } from '@/utils/speechPlayer'
import { getCombatRoleMeta, splitSentenceByWord } from '@/utils/vocabMeta'

// Props
const props = defineProps({
  words: {
    type: Array,
    default: () => []
  },
  startIndex: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits(['complete', 'next', 'correct', 'incorrect'])

// 响应式数据
const currentIndex = ref(props.startIndex)
const userInput = ref([])
const lockedIndices = ref(new Set())
const currentPosition = ref(0)
const showResult = ref(false)
const isCorrect = ref(false)
const hintShown = ref(false)
const needsCorrection = ref(false)
const correctionDone = ref(false)
const correctionText = ref('')
const correctionInputRef = ref(null)

// 计算属性
const progressPercentage = computed(() => {
  if (props.words.length === 0) return 0
  return Math.min(100, ((currentIndex.value + 1) / props.words.length) * 100)
})

const currentWord = computed(() => {
  return props.words[currentIndex.value]
})

const wordLetters = computed(() => {
  if (!currentWord.value?.word) return []
  return currentWord.value.word.toLowerCase().split('')
})

const isClueMode = computed(() => {
  return currentWord.value?.spellingMode === 'clue' && wordLetters.value.length >= 4
})

const currentRoleBadge = computed(() => {
  return getCombatRoleMeta(currentWord.value?.combatRole)
})

const currentExample = computed(() => {
  const raw = String(currentWord.value?.example || '').trim()
  return raw && raw !== '暂无例句' ? raw : ''
})

const exampleSegments = computed(() => splitSentenceByWord(currentExample.value, currentWord.value?.word || ''))

const buildAnchorIndices = (letters, clueMode) => {
  const locked = new Set()
  if (!clueMode || letters.length < 4) return locked

  locked.add(0)
  locked.add(letters.length - 1)
  for (let i = 3; i < letters.length - 2; i += 3) {
    if (letters.length - locked.size > 2) {
      locked.add(i)
    }
  }
  return locked
}

const findNextUnlockedIndex = (start) => {
  for (let i = start; i < wordLetters.value.length; i++) {
    if (!lockedIndices.value.has(i)) return i
  }
  return wordLetters.value.length
}

const findPrevUnlockedIndex = (start) => {
  for (let i = start; i >= 0; i--) {
    if (!lockedIndices.value.has(i)) return i
  }
  return -1
}

// 监听当前单词变化，重置状态
watch(currentWord, () => {
  resetWordState()
})

const replaySpellingAudio = async () => {
  const word = currentWord.value?.word
  if (!word) return
  try {
    const result = await getWordAudio({ word })
    const audioUrl = result?.data?.data
    if (audioUrl && typeof audioUrl === 'string') {
      const audio = new Audio(audioUrl)
      await audio.play()
      return
    }
  } catch {
    // Fallback cleanly to Gemini TTS / browser speech synthesis
  }
  playSpeechText({ text: word, key: `spell_${word}` })
}

watch(showResult, (nextShowResult) => {
  if (nextShowResult) {
    replaySpellingAudio()
  }
})

// 方法
const resetWordState = () => {
  const letters = wordLetters.value
  const anchors = buildAnchorIndices(letters, isClueMode.value)
  lockedIndices.value = anchors
  userInput.value = letters.map((ch, idx) => (anchors.has(idx) ? ch : ''))
  currentPosition.value = findNextUnlockedIndex(0)
  showResult.value = false
  isCorrect.value = false
  hintShown.value = false
  needsCorrection.value = false
  correctionDone.value = false
  correctionText.value = ''
}

const showHint = () => {
  hintShown.value = true
}

const handleKeyPress = (event) => {
  if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
    return
  }

  const key = event.key.toLowerCase()

  if (showResult.value) {
    if (!needsCorrection.value && key === 'enter') {
      nextWord()
    }
    return
  }

  if (key === 'enter') {
    checkSpelling()
  } else if (key === 'backspace') {
    const curr = currentPosition.value
    if (curr < wordLetters.value.length && !lockedIndices.value.has(curr) && userInput.value[curr] !== '') {
      userInput.value[curr] = ''
    } else {
      const prevIdx = findPrevUnlockedIndex(curr - 1)
      if (prevIdx !== -1) {
        currentPosition.value = prevIdx
        userInput.value[prevIdx] = ''
      }
    }
  } else if (/^[a-z]$/.test(key)) {
    const targetIdx = lockedIndices.value.has(currentPosition.value)
      ? findNextUnlockedIndex(currentPosition.value)
      : currentPosition.value
    if (targetIdx < wordLetters.value.length) {
      userInput.value[targetIdx] = key
      const nextIdx = findNextUnlockedIndex(targetIdx + 1)
      currentPosition.value = nextIdx < wordLetters.value.length ? nextIdx : targetIdx
    }
  }
}

const checkSpelling = () => {
  const userWord = userInput.value.join('').toLowerCase()
  const correctWord = currentWord.value.word.toLowerCase()

  isCorrect.value = userWord === correctWord
  showResult.value = true

  if (isCorrect.value) {
    emit('correct', currentIndex.value)
  } else {
    emit('incorrect', currentIndex.value)
    needsCorrection.value = true
    nextTick(() => {
      correctionInputRef.value?.focus()
    })
  }
}

const handleCorrectionInput = () => {
  const target = currentWord.value?.word?.toLowerCase() || ''
  if (correctionText.value.trim().toLowerCase() === target) {
    needsCorrection.value = false
    correctionDone.value = true
  }
}

const verifyCorrectionOnEnter = () => {
  const target = currentWord.value?.word?.toLowerCase() || ''
  if (correctionText.value.trim().toLowerCase() === target) {
    needsCorrection.value = false
    correctionDone.value = true
  }
}

const skipCorrection = () => {
  needsCorrection.value = false
}

const nextWord = () => {
  stopSpeechPlayback()
  if (currentIndex.value < props.words.length - 1) {
    currentIndex.value++
    emit('next', currentIndex.value)
  } else {
    emit('complete')
  }
}

// 生命周期
onMounted(() => {
  resetWordState()
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  stopSpeechPlayback()
})
</script>

<style scoped>
.spelling-practice {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.spelling-header {
  margin-bottom: 2rem;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
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

.word-section {
  text-align: center;
}

.word-hint {
  margin-bottom: 2rem;
}

.hint-text {
  font-size: 1.3rem;
  color: #333;
  margin-bottom: 1rem;
}

.meaning {
  font-size: 1.5rem;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 0.5rem;
}

.phonetic {
  font-size: 1rem;
  color: #666;
  font-family: 'Courier New', monospace;
}

.spelling-input-area {
  margin-bottom: 2rem;
}

.letters-container {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
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

.result-hint {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #888;
  font-style: italic;
}

.input-hint {
  margin-top: 2rem;
  color: #666;
}

.hint-btn {
  background: #FF9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 1rem;
}

.hint-display {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  border-left: 4px solid #FF9800;
}

@media (max-width: 768px) {
  .spelling-practice {
    padding: 1rem;
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
}

.spelling-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.mode-pill,
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.mode-pill.mode-clue {
  background: #e6fffa;
  color: #0d9488;
}

.mode-pill.mode-full {
  background: #eef2ff;
  color: #4f46e5;
}

.role-badge {
  background: #f1f5f9;
  color: #334155;
}

.role-badge.role-stance {
  background: #ecfdf5;
  color: #047857;
}

.role-badge.role-evidence {
  background: #eff6ff;
  color: #1d4ed8;
}

.role-badge.role-twist {
  background: #fef3c7;
  color: #b45309;
}

.letter-slot.locked {
  background: #eef2ff;
  border-radius: 6px;
}

.letter-slot.locked .user-letter {
  color: #4f46e5;
}

.letter-slot.locked .underline {
  background: #818cf8;
}

.hint-actions-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.result-example-box {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 8px;
  font-size: 0.95rem;
  color: #334155;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.word-highlight {
  background: #fde68a;
  color: #1e293b;
  padding: 0 4px;
  border-radius: 4px;
  font-weight: 700;
}

.mini-audio-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  cursor: pointer;
  margin-left: 6px;
}

.correction-box {
  margin-top: 1rem;
  padding: 1rem 1.2rem;
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 12px;
}

.correction-label {
  margin: 0 0 0.75rem;
  color: #9a3412;
  font-size: 0.95rem;
}

.correction-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.correction-input {
  padding: 10px 14px;
  border: 2px solid #fb923c;
  border-radius: 10px;
  font-size: 1rem;
  min-width: 220px;
  outline: none;
}

.skip-correction-btn {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #64748b;
  padding: 9px 14px;
  border-radius: 10px;
  cursor: pointer;
}

.correction-success-tip {
  color: #15803d;
  font-weight: 600;
  margin-bottom: 0.75rem;
}
</style>

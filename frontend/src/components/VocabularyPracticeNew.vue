<template>
  <div class="vocabulary-practice">
    <!-- 进度条 -->
    <div class="practice-header">
      <div class="progress-info">
        <span class="progress-text">词汇练习</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <span class="progress-count">{{ currentWordIndex + 1 }} / {{ words.length }}</span>
      </div>
      <button 
        class="favorite-btn" 
        @click="toggleFavorite" 
        :class="{ active: isFavorite }"
        :disabled="favoriteLoading"
        :title="isFavorite ? '取消收藏' : '添加收藏'"
      >
        {{ favoriteLoading ? '...' : (isFavorite ? '⭐' : '☆') }}
      </button>
    </div>

    <!-- 分组微检过渡卡（每 10 词做一次轻量巩固） -->
    <div v-if="showGroupCheckpoint" class="group-checkpoint-card">
      <div class="checkpoint-badge">第 1 组微检 · 10 / {{ words.length }} 词</div>
      <h3>先把刚才不稳的词过一遍，再学下一组</h3>
      <p class="checkpoint-subtitle">
        当前累计：认识 {{ knownCount }} 个 · 模糊 {{ vagueCount }} 个 · 不认识 {{ unknownCount }} 个
      </p>

      <div v-if="weakWordsInCurrentBatch.length > 0" class="checkpoint-weak-list">
        <div v-for="item in weakWordsInCurrentBatch" :key="item.word" class="checkpoint-weak-item">
          <div class="weak-word-left">
            <div class="weak-word-head">
              <strong>{{ item.word }}</strong>
              <span class="weak-status-tag" :class="item.status">
                {{ item.status === 'unknown' ? '不认识' : '模糊' }}
              </span>
            </div>
            <p class="weak-meaning">{{ item.mean || '暂无释义' }}</p>
            <p v-if="item.example" class="weak-example">{{ item.example }}</p>
          </div>
          <button
            type="button"
            class="mini-speak-btn"
            @click="playExampleSentence(item.example || item.word, `cp_${item.word}`)"
          >
            🔊 听读
          </button>
        </div>
      </div>
      <div v-else class="checkpoint-all-clear">
        ✨ 本组 10 个词全部标记为认识，状态很好！可以继续下一组并随后在拼写关做轻量速通。
      </div>

      <button type="button" class="continue-batch-btn" @click="continueAfterCheckpoint">
        继续下一组（{{ currentWordIndex + 2 }} ~ {{ words.length }} 词） →
      </button>
    </div>

    <!-- 单词显示区域 -->
    <div v-else class="word-display-area">
      <div class="word-card">
        <div class="word-role-row" v-if="currentRoleBadge">
          <span class="role-badge" :class="currentRoleBadge.cls">{{ currentRoleBadge.label }}</span>
          <span class="batch-hint" v-if="words.length > 10">
            第 {{ currentBatchNumber }} 组（每 10 词微检）
          </span>
        </div>

        <div class="word-main">
          <h2 class="word-text">{{ currentWord }}</h2>
          <div class="phonetic-row">
            <span class="phonetic" v-if="currentPhonetic">[{{ currentPhonetic }}]</span>
            <button type="button" class="audio-inline-btn" @click="replayWordPronunciation">
              🔊 读单词
            </button>
          </div>
        </div>

        <!-- 答面内容（点击【显示答案】后展示：核心释义 + 语境例句） -->
        <div v-if="showAnswer" class="answer-reveal-area">
          <div class="meaning-section">
            <div class="meaning-label">📖 核心释义</div>
            <div class="meaning-content">
              <p class="meaning-text">{{ currentMeaning || '暂无释义' }}</p>
            </div>
          </div>

          <!-- 语境例句锚点（释放词库已有例句，帮学习者理解单词在句子中的用法） -->
          <div v-if="currentExample" class="context-example-box">
            <div class="example-header">
              <span class="example-label">💬 真实场景例句（语境记忆）</span>
              <button
                type="button"
                class="audio-inline-btn"
                @click="playExampleSentence(currentExample, `ex_${currentWord}`)"
              >
                {{ isPlayingExample ? '🔊 播放中...' : '🔊 读整句' }}
              </button>
            </div>
            <p class="example-sentence">
              <template v-for="(seg, idx) in exampleSegments" :key="idx">
                <mark v-if="seg.isMatch" class="word-highlight">{{ seg.text }}</mark>
                <span v-else>{{ seg.text }}</span>
              </template>
            </p>
          </div>
        </div>

        <!-- 问面等待提示（未显示答案时） -->
        <div v-else class="unrevealed-placeholder">
          <span class="placeholder-icon">🤔</span>
          <p class="placeholder-text">先在脑海中回忆词义与用法，点击下方【显示答案】检验</p>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!showGroupCheckpoint" class="action-section">
      <!-- 问面阶段：Anki式【显示答案】主按钮 -->
      <div v-if="!showAnswer" class="anki-show-answer-box">
        <button type="button" class="show-answer-btn" @click="revealAnswer">
          <span class="btn-main-text">💡 显示答案</span>
          <span class="btn-hotkey-badge">空格键 / Space</span>
        </button>
      </div>

      <!-- 答面阶段：三个评估按钮（不认识 / 模糊 / 认识） -->
      <div v-else class="action-buttons anki-grade-buttons">
        <button type="button" class="action-btn unknown-btn" @click="handleUnknown" title="快捷键: 1">
          <span class="btn-icon">❌</span>
          <div class="btn-text-group">
            <span class="btn-text">不认识</span>
            <span class="key-badge">1</span>
          </div>
        </button>
        <button type="button" class="action-btn vague-btn" @click="handleVague" title="快捷键: 2">
          <span class="btn-icon">🤔</span>
          <div class="btn-text-group">
            <span class="btn-text">模糊</span>
            <span class="key-badge">2</span>
          </div>
        </button>
        <button type="button" class="action-btn know-btn" @click="handleKnow" title="快捷键: 3 或 空格">
          <span class="btn-icon">✅</span>
          <div class="btn-text-group">
            <span class="btn-text">认识（拼写减负）</span>
            <span class="key-badge">3 / 空格</span>
          </div>
        </button>
      </div>

      <div class="quick-actions">
        <button class="quick-btn" @click="showAnswer = false; $emit('back')">
          🏠 返回地图
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getWordList, updateWordPriority, getWordAudio } from '@/api/word'
import { addFavoriteWord, removeFavoriteWord, checkFavoriteWord } from '@/api/favoriteWords'
import { playSpeechText, stopSpeechPlayback } from '@/utils/speechPlayer'
import { getCombatRoleMeta, splitSentenceByWord } from '@/utils/vocabMeta'

const props = defineProps({
  chapter: {
    type: String,
    default: 'A'
  },
  chapterConfig: {
    type: Object,
    default: () => ({})
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  words: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['back', 'know', 'vague', 'unknown', 'complete'])

const BATCH_SIZE = 10

// 响应式数据
const currentWordIndex = ref(props.currentIndex)
const showAnswer = ref(false)
const showMeaning = computed({
  get: () => showAnswer.value,
  set: (val) => { showAnswer.value = val }
})
const showGroupCheckpoint = ref(false)
const isFavorite = ref(false)
const favoriteLoading = ref(false)
const isPlayingExample = ref(false)
const wordAssessments = ref({})

const revealAnswer = () => {
  showAnswer.value = true
}

// 学习时长记录
const studyStartTime = ref(null)
const totalStudyTime = ref(0)

// 计算属性：当前显示的单词
const currentWordItem = computed(() => {
  if (!props.words || props.words.length === 0 || currentWordIndex.value >= props.words.length) {
    return null
  }
  return props.words[currentWordIndex.value]
})

const currentWord = computed(() => {
  if (!props.words || props.words.length === 0) {
    return '加载中...'
  }

  if (currentWordIndex.value >= props.words.length) {
    return '本组单词学习完成'
  }

  const wordItem = currentWordItem.value
  return typeof wordItem === 'string' ? wordItem : wordItem.word
})

// 计算属性：当前单词的释义（根据新格式获取中文释义）
const currentMeaning = computed(() => {
  const wordItem = currentWordItem.value
  if (!wordItem) return ''
  return typeof wordItem === 'object' && wordItem.mean ? wordItem.mean : ''
})

// 计算属性：当前单词的音标
const currentPhonetic = computed(() => {
  const wordItem = currentWordItem.value
  if (!wordItem) return ''
  return typeof wordItem === 'object' && wordItem.phonetic_symbol ? wordItem.phonetic_symbol : ''
})

const currentExample = computed(() => {
  const wordItem = currentWordItem.value
  if (!wordItem || typeof wordItem !== 'object') return ''
  const raw = String(wordItem.example || '').trim()
  return raw && raw !== '暂无例句' ? raw : ''
})

const exampleSegments = computed(() => splitSentenceByWord(currentExample.value, currentWord.value))

const currentRoleBadge = computed(() => {
  const wordItem = currentWordItem.value
  const role = typeof wordItem === 'object' ? wordItem.combatRole : ''
  return getCombatRoleMeta(role)
})

const currentBatchNumber = computed(() => Math.floor(currentWordIndex.value / BATCH_SIZE) + 1)

const knownCount = computed(() => Object.values(wordAssessments.value).filter(s => s === 'know').length)
const vagueCount = computed(() => Object.values(wordAssessments.value).filter(s => s === 'vague').length)
const unknownCount = computed(() => Object.values(wordAssessments.value).filter(s => s === 'unknown').length)

const weakWordsInCurrentBatch = computed(() => {
  const start = Math.max(0, Math.floor(currentWordIndex.value / BATCH_SIZE) * BATCH_SIZE)
  const end = Math.min(props.words.length, start + BATCH_SIZE)
  return props.words
    .slice(start, end)
    .map(item => {
      const w = typeof item === 'string' ? item : item.word
      const status = wordAssessments.value[w]
      return {
        word: w,
        mean: typeof item === 'object' ? item.mean : '',
        example: typeof item === 'object' && item.example !== '暂无例句' ? item.example : '',
        status
      }
    })
    .filter(entry => entry.status === 'vague' || entry.status === 'unknown')
})

// 计算进度百分比
const progressPercentage = computed(() => {
  if (!props.words || props.words.length === 0) return 0
  return Math.round(((currentWordIndex.value + 1) / props.words.length) * 100)
})

const playExampleSentence = async (text, key = 'vocab_example') => {
  if (!text) return
  await playSpeechText({
    text,
    key,
    onStart: () => {
      isPlayingExample.value = true
    },
    onEnd: () => {
      isPlayingExample.value = false
    },
    onError: () => {
      isPlayingExample.value = false
    }
  })
}

const replayWordPronunciation = () => {
  if (currentWord.value && currentWord.value !== '加载中...') {
    playSpeechText({ text: currentWord.value, key: `vocab_word_${currentWord.value}` })
  }
}

// 键盘监听处理（Anki 模式交互：空格显示答案，1/2/3评分）
const handleKeyDown = (e) => {
  const targetTag = e.target?.tagName?.toLowerCase()
  if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) {
    return
  }

  // 10 词分组微检过渡卡处于激活状态
  if (showGroupCheckpoint.value) {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault()
      continueAfterCheckpoint()
    }
    return
  }

  // 问面状态：按空格键或回车显示答案
  if (!showAnswer.value) {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault()
      revealAnswer()
    }
  } else {
    // 答面状态：1/2/3 或 空格对应评分
    if (e.key === '1' || e.code === 'Numpad1') {
      e.preventDefault()
      handleUnknown()
    } else if (e.key === '2' || e.code === 'Numpad2') {
      e.preventDefault()
      handleVague()
    } else if (e.key === '3' || e.code === 'Numpad3' || e.code === 'Space') {
      e.preventDefault()
      handleKnow()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  stopSpeechPlayback()
  window.removeEventListener('keydown', handleKeyDown)
})

// 监听currentIndex变化
watch(() => props.currentIndex, (newIndex) => {
  currentWordIndex.value = newIndex
  showAnswer.value = false
})

// 监听currentWord以播放音频
watch(currentWord, async (newWord) => {
  showAnswer.value = false
  if (newWord && newWord !== '加载中...' && newWord !== '本组单词学习完成') {
    // 记录学习开始时间
    if (!studyStartTime.value) {
      studyStartTime.value = new Date();
    }
    try {
      const result = await getWordAudio({ word: newWord });
      const audioUrl = result?.data?.data;

      if (!audioUrl || typeof audioUrl !== 'string') {
        playSpeechText({ text: newWord, key: `vocab_word_${newWord}` });
        checkFavoriteStatus();
        return;
      }

      const audio = new Audio();
      audio.addEventListener('canplaythrough', () => {
        audio.play().catch(() => {
          playSpeechText({ text: newWord, key: `vocab_word_${newWord}` });
        });
      }, { once: true });

      audio.addEventListener('error', () => {
        playSpeechText({ text: newWord, key: `vocab_word_${newWord}` });
      }, { once: true });

      audio.src = audioUrl;

      setTimeout(() => {
        if (audio.readyState < 2) {
          tryBackupAudioSource(newWord);
        }
      }, 4000);
    } catch {
      playSpeechText({ text: newWord, key: `vocab_word_${newWord}` });
    }
    
    // 检查收藏状态
    checkFavoriteStatus();
  } else if (newWord === '本组单词学习完成') {
    // 学习完成，计算总学习时长
    if (studyStartTime.value) {
      const endTime = new Date();
      const sessionDuration = (endTime.getTime() - studyStartTime.value.getTime()) / 1000 / 60; // 转换为分钟
      totalStudyTime.value += sessionDuration;
      console.log(`学习完成，本次学习时长: ${sessionDuration.toFixed(2)}分钟，总学习时长: ${totalStudyTime.value.toFixed(2)}分钟`);
    }
  }
})

// 尝试使用备用音频源
const tryBackupAudioSource = async (word) => {
  try {
    // 使用备用音频API（例如Google TTS）
    const backupAudioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&client=tw-ob`;
    const backupAudio = new Audio(backupAudioUrl);

    backupAudio.addEventListener('canplaythrough', () => {
      backupAudio.play().catch(err => {
        console.error('备用音频播放失败:', err);
      });
    }, { once: true });

    backupAudio.addEventListener('error', (err) => {
      console.error('备用音频加载失败:', err);
    }, { once: true });

    backupAudio.load();
  } catch (err) {
    console.error('备用音频源尝试失败:', err);
  }
}

// 检查单词是否已收藏
const checkFavoriteStatus = async () => {
  const wordItem = props.words[currentWordIndex.value];
  const wordId = wordItem?._id;
  if (!wordId) {
    console.log('没有可用的wordId');
    return;
  }
  
  try {
    const res = await checkFavoriteWord({ wordId });
    if (res.data.code === 200) {
      isFavorite.value = res.data.data.isFavorite;
      console.log('收藏状态:', res.data.data.isFavorite);
    }
  } catch (error) {
    console.error('检查收藏状态失败:', error);
  }
}

// 切换收藏状态
const showNotification = (message, type) => {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // 设置样式
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = '8px';
  notification.style.color = 'white';
  notification.style.fontSize = '14px';
  notification.style.zIndex = '9999';
  notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  notification.style.transition = 'all 0.3s ease';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(-20px)';
  
  // 根据类型设置背景色
  if (type === 'success') {
    notification.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
  } else if (type === 'error') {
    notification.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
  }
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 显示动画
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 3秒后自动消失
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    
    // 完全消失后从DOM中移除
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

const toggleFavorite = async () => {
  const wordItem = props.words[currentWordIndex.value];
  const wordId = wordItem?._id;
  if (!wordId || favoriteLoading.value) {
    console.log('没有可用的wordId或正在加载中');
    return;
  }
  
  favoriteLoading.value = true;
  try {
    if (isFavorite.value) {
      // 取消收藏
      const res = await removeFavoriteWord({ wordId });
      if (res.data.code === 200) {
        isFavorite.value = false;
        console.log('取消收藏成功');
        // 刷新个人主页的收藏列表
        if (window.refreshFavoriteWords) {
          window.refreshFavoriteWords();
        }
        // 显示成功提示
        showNotification('取消收藏成功', 'success');
      } else {
        showNotification(res.data.message || '取消收藏失败', 'error');
      }
    } else {
      // 添加收藏
      const res = await addFavoriteWord({ wordId });
      if (res.data.code === 200) {
        isFavorite.value = true;
        console.log('添加收藏成功');
        // 刷新个人主页的收藏列表
        if (window.refreshFavoriteWords) {
          window.refreshFavoriteWords();
        }
        // 显示成功提示
        showNotification('添加收藏成功', 'success');
      } else {
        showNotification(res.data.message || '添加收藏失败', 'error');
      }
    }
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    showNotification(isFavorite.value ? '取消收藏失败' : '添加收藏失败', 'error');
  } finally {
    favoriteLoading.value = false;
  }
}

// 方法
const toggleMeaning = () => {
  showAnswer.value = !showAnswer.value
}

const recordWordDecision = (status) => {
  const wordToQuery = currentWord.value
  if (!wordToQuery || wordToQuery === '加载中...' || wordToQuery === '本组单词学习完成') return

  wordAssessments.value = {
    ...wordAssessments.value,
    [wordToQuery]: status
  }

  updateWordPriority({
    word: wordToQuery,
    newStatus: status,
    source: 'vocabulary'
  })

  emit(status, currentWordIndex.value, { word: wordToQuery, status })
  nextWord()
}

const handleKnow = () => recordWordDecision('know')
const handleVague = () => recordWordDecision('vague')
const handleUnknown = () => recordWordDecision('unknown')

const continueAfterCheckpoint = () => {
  showGroupCheckpoint.value = false
  if (currentWordIndex.value < props.words.length - 1) {
    currentWordIndex.value += 1
    showAnswer.value = false
  }
}

// 切换到下一个单词
const nextWord = () => {
  if (currentWordIndex.value < props.words.length - 1) {
    const completedCount = currentWordIndex.value + 1
    if (props.words.length > BATCH_SIZE && completedCount % BATCH_SIZE === 0) {
      showGroupCheckpoint.value = true
      return
    }
    currentWordIndex.value += 1
    showAnswer.value = false
  } else {
    // 当前批次单词学习完成
    emit('complete', {
      wordsCount: props.words.length,
      knownWords: knownCount.value,
      vagueWords: vagueCount.value,
      unknownWords: unknownCount.value,
      assessments: { ...wordAssessments.value },
      chapter: props.chapter,
      studyTime: Math.round(totalStudyTime.value * 100) / 100
    })
  }
}

// 加载单词列表
const loadWords = async () => {
  try {
    const response = await getWordList({
      chapter: props.chapter
    })

    if (response.data.code === 200) {
      // 这里我们无法直接修改props.words，所以需要通过emit通知父组件
      // 但由于组件设计问题，这里暂时不处理
      console.log('加载单词列表成功:', response.data.data.words);
    } else {
      console.error('加载单词列表失败:', response.message)
    }
  } catch (error) {
    console.error('请求单词列表错误:', error)
  }
}

// 组件挂载时加载单词
// 如果传入了words属性，则使用传入的words，否则加载单词列表
if (!props.words || props.words.length === 0) {
  loadWords()
}
</script>

<style scoped>
.vocabulary-practice {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.practice-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.progress-info {
  display: flex;
  align-items: center;
  width: 100%;
}

.progress-text {
  font-weight: 600;
  margin-right: 16px;
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

.favorite-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
}

.favorite-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.favorite-btn.active {
  background: linear-gradient(135deg, #ffd700 0%, #ffb300 100%);
  color: white;
}

.favorite-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.word-display-area {
  margin-bottom: 2rem;
}

.word-card {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 12px;
}

.word-main {
  margin-bottom: 1.5rem;
}

.word-text {
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.phonetic {
  font-size: 1.1rem;
  color: #666;
}

.answer-reveal-area {
  animation: fadeInAnswer 0.22s ease-out;
}

@keyframes fadeInAnswer {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.unrevealed-placeholder {
  margin: 1.5rem auto 0.5rem;
  padding: 16px 20px;
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  border-radius: 10px;
  max-width: 540px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.placeholder-icon {
  font-size: 20px;
}

.placeholder-text {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
}

.meaning-section {
  margin: 1.25rem auto 1.25rem;
  text-align: left;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #3b82f6;
  border-radius: 10px;
  padding: 12px 16px;
  max-width: 620px;
}

.meaning-label {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 4px;
}

.meaning-text {
  font-size: 1.15rem;
  line-height: 1.6;
  color: #1e293b;
  font-weight: 600;
  margin: 0;
}

.anki-show-answer-box {
  width: 100%;
  margin-bottom: 1rem;
}

.show-answer-btn {
  width: 100%;
  padding: 18px 24px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 1.15rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.show-answer-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45);
  background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
}

.show-answer-btn:active {
  transform: translateY(1px);
}

.btn-hotkey-badge {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.25);
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.anki-grade-buttons .action-btn {
  padding: 14px 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-text-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-badge {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.18);
  padding: 2px 7px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
}

.action-section {
  margin-top: 2rem;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 1rem;
}

.action-btn {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.know-btn {
  background: linear-gradient(135deg, #52c41a, #389e0d);
  color: white;
}

.know-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4);
}

.vague-btn {
  background: linear-gradient(135deg, #faad14, #f5222d);
  color: white;
}

.vague-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(250, 173, 20, 0.4);
}

.unknown-btn {
  background: linear-gradient(135deg, #ff4d4f, #cf1322);
  color: white;
}

.unknown-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
}

.btn-icon {
  font-size: 18px;
}

.quick-actions {
  text-align: center;
}

.quick-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  color: #666;
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
}

.word-role-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: #e2e8f0;
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

.role-badge.role-domain {
  background: #f1f5f9;
  color: #334155;
}

.batch-hint {
  font-size: 12px;
  color: #64748b;
}

.phonetic-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.audio-inline-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.audio-inline-btn:hover {
  border-color: #667eea;
  color: #4f46e5;
}

.context-example-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #667eea;
  border-radius: 10px;
  padding: 12px 16px;
  margin: 0 auto 1.25rem;
  text-align: left;
  max-width: 620px;
}

.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.example-label {
  font-size: 12px;
  font-weight: 700;
  color: #4f46e5;
}

.example-sentence {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.55;
  color: #1e293b;
}

.word-highlight {
  background: #fef08a;
  color: #1e293b;
  padding: 0 4px;
  border-radius: 4px;
  font-weight: 700;
}

.group-checkpoint-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.75rem;
  text-align: center;
}

.checkpoint-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.checkpoint-subtitle {
  color: #475569;
  margin-bottom: 1.25rem;
}

.checkpoint-weak-list {
  display: grid;
  gap: 10px;
  margin-bottom: 1.5rem;
  text-align: left;
}

.checkpoint-weak-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
}

.weak-word-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weak-status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.weak-status-tag.vague {
  background: #fef3c7;
  color: #b45309;
}

.weak-status-tag.unknown {
  background: #fee2e2;
  color: #b91c1c;
}

.weak-meaning {
  margin: 4px 0 2px;
  font-size: 0.9rem;
  color: #334155;
}

.weak-example {
  margin: 0;
  font-size: 0.84rem;
  color: #64748b;
}

.mini-speak-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.checkpoint-all-clear {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 1.25rem;
}

.continue-batch-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border: none;
  padding: 12px 24px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}
</style>

<template>
  <Header />
  <!-- 展示区路由组件放置处 -->
  <router-view></router-view>

  <!-- 问卷组件 -->
  <!-- <Question :show="showQuestionModal" @close="handleQuestionClose" @completed="handleQuestionCompleted" /> -->
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Header from './components/header.vue'
import Question from './components/question.vue'
import { getUserInfo } from '@/api/auth'

// 响应式数据
const showQuestionModal = ref(false)

// 检查用户是否需要填写问卷
const checkQuestionStatus = async () => {
  try {
    const response = await getUserInfo()
    // axios 响应数据在 response.data 中
    const data = response.data || response
    if (data && data.code === 200) {
      // 如果用户未完成问卷，显示问卷模态框
      if (!data.question_completed) {
        showQuestionModal.value = true
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 处理问卷关闭
const handleQuestionClose = () => {
  showQuestionModal.value = false
}

// 处理问卷完成
const handleQuestionCompleted = (planData: { planStudyWords: number; planReviweWords: number }) => {
  console.log('用户学习计划设置完成:', planData)
  showQuestionModal.value = false

  // 可以在这里添加一些完成后的逻辑，比如显示欢迎消息
  // 或者跳转到特定页面
}

// 组件挂载时检查问卷状态
onMounted(() => {
  // 延迟检查，确保用户已登录
  setTimeout(() => {
    checkQuestionStatus()
  }, 1000)
})
</script>
<style scoped></style>
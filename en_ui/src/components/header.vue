    <!-- 页面头部 -->
    <template>
      <header class="header">
        <div class="logo">
          <h1>EnglishMastery</h1>
        </div>
        <nav class="main-nav">
          <ul>
            <li><router-link to="/" class="active">首页</router-link></li>
            <li><router-link to="/chapters">学习闯关</router-link></li>
            <li><router-link to="/aiChatExer">自由对话</router-link></li>
            <!-- <li><router-link to="/adventure">快速练习</router-link></li> -->
            <!-- 保留特殊访问链接，但不在主导航显示 -->
            <!-- <li><router-link to="/vocabulary-legacy">词汇练习(旧)</router-link></li> -->

            <!-- <li><router-link to="/listening-legacy">听力训练(旧)</router-link></li> -->
          </ul>
        </nav>
        <div class="user-actions">
          <router-link to="/login" class="btn-login" v-if="currentModule === 'unlogin'">登录</router-link>
          <router-link to="/register" class="btn-register" v-if="currentModule === 'unlogin'">注册</router-link>
          <div class="user-profile" v-if="currentModule === 'login'" ref="dropdownRef">
            <div class="avatar-container" @click="toggleDropdown">
              <img :src="userAvatar" alt="用户头像" class="avatar" />
              <span class="username">{{ username }}</span>
            </div>
            <div class="dropdown-menu" v-show="showDropdown">
              <router-link to="/profile" class="dropdown-item">个人主页</router-link>
              <div class="dropdown-divider"></div>
              <button @click="Logout" class="dropdown-item">退出登录</button>
            </div>
          </div>
        </div>
      </header>
    </template>

<script setup>
import '@/assets/css/home_head.css'
import '@/assets/css/header.css'
import { ref } from 'vue'
import { logout, getUserInfo } from '@/api/auth'
import { useRouter } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'

const router = useRouter()
// 当前模块：unlogin（未登录）, login（已登录）
const currentModule = ref('unlogin')
const username = ref('')
const userAvatar = ref('/default-avatar.png') // 默认头像
const showDropdown = ref(false)
const dropdownRef = ref(null) // 用于点击外部检测的ref

// 使用vueuse的onClickOutside功能
onClickOutside(dropdownRef, () => {
  showDropdown.value = false
})

// 点击头像切换下拉菜单
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 点击外部关闭下拉菜单
const closeDropdown = () => {
  showDropdown.value = false
}

// 点击外部关闭的处理已经由 onClickOutside 接管

getUserInfo().then(res => {

  if (res.data.code !== 200) {
    currentModule.value = 'unlogin'
  } else {
    username.value = res.data.username
    currentModule.value = 'login'
  }
})

const Logout = () => {

  logout().then(res => {
    currentModule.value = 'unlogin'
    username.value = ''
    router.push('/login')
  })
}
</script>
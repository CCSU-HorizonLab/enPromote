import { createRouter, createWebHistory } from 'vue-router'
const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: () => import('../views/login.vue'),
        },
        {
            path: '/register',
            name: 'Register',
            component: () => import('../views/register.vue'),
        },
        {
            path: '/',
            name: 'Home',
            component: () => import('../views/home.vue'),
        },
        // 特殊访问路由 - 保留原有功能但不在主导航中显示
        {
            path: '/aiChatExer',
            name: 'aiChat',
            component: () => import('../views/aiChatExer.vue'),
            meta: { requiresAuth: true, hidden: true }
        },
        {
            path: '/vocabulary-legacy',
            name: 'VocabularyLegacy',
            component: () => import('../views/vocabulary.vue'),
            meta: { requiresAuth: true, hidden: true }
        },
        {
            path: '/listening-legacy',
            name: 'ListeningLegacy',
            component: () => import('../views/listening.vue'),
            meta: { requiresAuth: true, hidden: true }
        },
        {
            path: '/reading',
            name: 'Reading',
            component: () => import('../views/home.vue'), // 暂时指向首页，后续开发
        },
        {
            path: '/text',
            name: 'Text',
            component: () => import('../views/text.vue'),
        },
        {
            path: '/profile',
            name: 'Profile',
            component: () => import('../views/profile.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/chapters',
            name: 'ChapterSelection',
            component: () => import('../views/ChapterSelection.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/adventure',
            name: 'Adventure',
            component: () => import('../views/adventure.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/adventure-map',
            name: 'AdventureMap',
            component: () => import('../views/AdventureMap.vue'),
            meta: { requiresAuth: true, hidden: true }
        },
    ]
})
export default router
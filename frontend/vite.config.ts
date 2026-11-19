import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 后端地址可通过环境变量覆盖，便于同机运行多个副本时避开端口冲突。
// 不设置时仍指向默认的 3000，正常开发不需要额外配置。
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    hmr: false, // 禁用HMR以避免WebSocket连接问题
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
    proxy: {
      '/api': { // 代理路径
        target: apiTarget, // 后端服务地址
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target', proxyRes.statusCode, req.url);
          });
        },
      },
      '/avatars': { // 代理头像路径
        target: apiTarget, // 后端服务地址
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // 保持路径不变
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target', proxyRes.statusCode, req.url);
          });
        },
      },
      '/default-avatar.png': { // 代理默认头像
        target: apiTarget, // 后端服务地址
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

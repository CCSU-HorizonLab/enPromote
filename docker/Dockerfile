# ==========================================
# enPromote Backend Server Dockerfile
# ==========================================
FROM node:20-bookworm-slim AS base

# 设置国内 Debian 镜像源（如需）与构建原生模块基础依赖（用于适配 bcrypt C++ 编译）
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 启用 Corepack 并准备 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app/server

# 复制服务端依赖声明，优先利用 Docker 缓存层
COPY server/package.json server/pnpm-lock.yaml* server/pnpm-workspace.yaml* ./

# 安装生产依赖 (如遇 lockfile 冲突降级执行标准安装)
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# 复制服务端源码
COPY server/ /app/server/

# 复制项目根目录 public 静态资源（server/app.js 依赖 ../public/avatars）
COPY public/ /app/public/

# 创建日志与头像上传目录，确保读写路径存在
RUN mkdir -p /app/server/logs /app/public/avatars

# 环境变量设置
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# 容器健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# 启动服务端 (生产环境直接以 node 执行，避免 nodemon 占用额外资源)
CMD ["node", "app.js"]

# 🐳 enPromote Docker 容器化部署指南

本目录包含 `enPromote` 项目的完整容器化部署方案。通过 Docker 与 Docker Compose，可以一键拉起包括 **Vue 3 前端 (Nginx)**、**Express 后端服务**、**MongoDB 7.0 数据库** 与 **Redis 7.0 缓存** 在内的全套生产就绪环境。

---

## 🏗️ 架构拓扑图

```
                       [ 用户浏览器 (Client) ]
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  宿主机端口 :80        │
                     └────────────┬───────────┘
                                  │
                   ┌──────────────▼──────────────┐
                   │  enpromote-frontend (Nginx) │
                   │  - SPA 静态资源托管         │
                   │  - Gzip 压缩 / 缓存优化     │
                   └──────────────┬──────────────┘
                                  │ (反向代理 /api & /avatars)
                                  ▼
                   ┌─────────────────────────────┐
                   │   enpromote-server (Node)   │
                   │   - Express 5.x API 服务    │
                   │   - AI 对话 & 语音评测调度  │
                   └──────┬───────────────┬──────┘
                          │               │
            ┌─────────────▼─────┐   ┌─────▼─────────────┐
            │ enpromote-mongodb │   │  enpromote-redis  │
            │ (MongoDB 7.0)     │   │  (Redis 7.0 缓存) │
            └───────────────────┘   └───────────────────┘
```

---

## 📁 目录文件说明

| 文件名 | 用途说明 |
| :--- | :--- |
| `docker-compose.yml` | 核心容器编排文件，管理 4 个服务、健康检查、命名卷与网络 |
| `Dockerfile` | 后端 Express 生产镜像构建文件（基于 `node:20-bookworm-slim`，包含原生编译工具链） |
| `Dockerfile.frontend` | 前端 Vue 3 + Vite 多阶段构建文件，最终由 `nginx:alpine` 驱动 |
| `nginx.conf` | 前端 Nginx 配置，集成 SPA History 模式路由、WebSocket 升级与 API 反向代理 |
| `env.docker.example` | Docker 环境专用环境变量模板，预设容器互联主机名 |
| `README.md` | 本部署使用说明文档 |

---

## 🚀 快速上手 (Quick Start)

### 步骤 1：准备环境配置文件
在项目根目录复制一份环境变量（或直接基于 `docker/env.docker.example`）：

```bash
# 在项目根目录下执行
cp docker/env.docker.example .env
```

根据你的实际需求，在 `.env` 中填入你的大模型密钥（如 `AI_API_KEY`、`GOOGLE_GENERATIVE_AI_API_KEY`、`ALIYUN_API_KEY`）及邮件授权码。

---

### 步骤 2：一键构建并启动全部服务

在项目根目录下运行：

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

> **提示**：若你的 Docker Compose 版本支持 `include`，也可直接在根目录执行 `docker compose up -d`。

启动完成后，各容器状态健康检查通过即可访问：
- **Web 前端界面**：[http://localhost](http://localhost)（或你配置的 `FRONTEND_PORT`）
- **后端 API 直连**：[http://localhost:3000](http://localhost:3000)
- **MongoDB 直连端口**：`27017`（支持通过 Navicat / MongoDB Compass 管理）
- **Redis 直连端口**：`6379`

---

## 🛠️ 常用运维指令

### 1. 查看容器运行状态
```bash
docker compose -f docker/docker-compose.yml ps
```

### 2. 实时查看各服务日志
```bash
# 查看全部容器实时日志
docker compose -f docker/docker-compose.yml logs -f

# 仅查看后端 API 服务日志
docker compose -f docker/docker-compose.yml logs -f server

# 仅查看前端 Nginx 访问与代理日志
docker compose -f docker/docker-compose.yml logs -f frontend
```

### 3. 重启单个或全部服务
```bash
# 重启后端服务
docker compose -f docker/docker-compose.yml restart server

# 重启全部服务
docker compose -f docker/docker-compose.yml restart
```

### 4. 停止并释放容器
```bash
# 停止容器（保留数据库与上传卷数据）
docker compose -f docker/docker-compose.yml down

# 彻底清理（⚠️ 警告：包含清空持久化卷数据）
docker compose -f docker/docker-compose.yml down -v
```

### 5. 进入容器内部调试
```bash
# 进入后端容器
docker exec -it enpromote-server sh

# 进入 MongoDB 容器并打开 mongosh
docker exec -it enpromote-mongodb mongosh EnglishMastery
```

---

## 💾 数据持久化说明

所有核心业务数据均挂载至 Docker 命名卷（Named Volumes），确保容器升级或销毁时数据永不丢失：

- `enpromote_mongodb_data`：存放 MongoDB 核心数据库文件（用户账密、关卡进度、词库数据）。
- `enpromote_redis_data`：存放 Redis AOF 增量持久化日志。
- `enpromote_avatars_data`：映射至 `/app/public/avatars`，存放用户上传的真实头像。
- `enpromote_server_logs`：存放 Winston 业务运行与错误日志。

### 导出/备份本地数据库至容器内：
若你在宿主机已有数据想要导入容器内 MongoDB：
```bash
# 将宿主机导出的 dump 目录导入容器内 MongoDB
docker exec -i enpromote-mongodb mongorestore --db EnglishMastery /path/to/backup
```

---

## ❓ 常见问题排查 (FAQ)

1. **`bcrypt` 编译失败或报平台不兼容？**
   - 本方案基于 `node:20-bookworm-slim` 并内置了 `python3 make g++`，避免了 Alpine musl libc 在部分宿主机下安装编译 C++ 原生扩展失败的问题。
2. **端口 80 或 3000 被宿主机其他程序占用？**
   - 只需在 `.env` 中修改 `FRONTEND_PORT=8080` 或 `SERVER_PORT=3001`，重新 `docker compose up -d` 即可。
3. **前端上传录音或大文件报 `413 Request Entity Too Large`？**
   - `nginx.conf` 与后端 `app.js` 均已统一调整为 `50MB` 上限，可满足长音频与高清头像直传需求。

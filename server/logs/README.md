# 日志系统说明

## 📁 日志文件结构

```
logs/
├── access.log      # 访问日志 (HTTP请求记录)
├── error.log       # 错误日志 (仅错误级别)
├── combined.log    # 组合日志 (所有级别)
└── README.md       # 本说明文件
```

## 📊 日志级别

- **ERROR**: 错误信息，需要立即关注
- **WARN**: 警告信息，可能存在问题
- **INFO**: 一般信息，正常操作记录
- **DEBUG**: 调试信息，开发时使用

## 🔍 日志格式

```
2024-01-01 12:00:00 [INFO]: 用户登录成功: testuser
2024-01-01 12:01:00 [ERROR]: API Error {"method":"POST","url":"/auth/login","error":"密码错误"}
```

## 🛠️ 使用方法

### 1. 命令行查看日志

```bash
# 查看最近50条组合日志
node scripts/viewLogs.js

# 查看最近20条错误日志
node scripts/viewLogs.js --type error --lines 20

# 搜索包含"登录"的日志
node scripts/viewLogs.js --search "登录"

# 查看今日统计
node scripts/viewLogs.js --stats

# 按日期查看日志
node scripts/viewLogs.js --date 2024-01-01

# 按级别查看日志
node scripts/viewLogs.js --level ERROR
```

### 2. API接口查看日志

```bash
# 获取错误日志
GET /logs/errors?lines=100

# 获取访问日志
GET /logs/access?lines=50

# 搜索日志
GET /logs/search?keyword=登录&type=combined&lines=20

# 获取统计信息
GET /logs/stats

# 按日期获取日志
GET /logs/date/2024-01-01

# 按级别获取日志
GET /logs/level/ERROR
```

### 3. 代码中记录日志

```javascript
const { logger, logApiError, logUserAction } = require('../utils/logger');

// 记录一般信息
logger.info('用户操作成功', { userId: '123', action: 'login' });

// 记录警告
logger.warn('可疑操作', { ip: '192.168.1.1' });

// 记录错误
logger.error('数据库连接失败', error);

// 记录API错误
logApiError(req, error, 500);

// 记录用户操作
logUserAction(req, 'LOGIN_SUCCESS', { username: 'testuser' });
```

## 📈 日志监控

### 重要指标

1. **错误率**: 错误日志数量 / 总请求数量
2. **响应时间**: 从访问日志中提取
3. **用户活跃度**: 登录/操作频率
4. **系统稳定性**: 错误类型分布

### 告警规则

- 错误日志超过100条/小时
- 数据库连接错误
- 用户登录失败率超过20%
- 服务器响应时间超过5秒

## 🔧 日志配置

### Winston配置 (utils/logger.js)

```javascript
// 日志级别
level: 'info'

// 文件大小限制
maxsize: 5242880 // 5MB

// 保留文件数量
maxFiles: 5

// 自动轮转
tailable: true
```

### 日志轮转

- 单个文件最大5MB
- 保留最近5个文件
- 自动压缩旧文件
- 定期清理30天前的日志

## 🚨 故障排查

### 常见问题

1. **日志文件过大**
   - 检查日志轮转配置
   - 手动清理旧日志
   - 调整日志级别

2. **磁盘空间不足**
   - 清理旧日志文件
   - 增加磁盘空间
   - 优化日志配置

3. **日志写入失败**
   - 检查文件权限
   - 确认磁盘空间
   - 重启应用服务

### 紧急处理

```bash
# 清理30天前的日志
node scripts/viewLogs.js --clean --days 30

# 查看磁盘使用情况
du -sh logs/

# 压缩旧日志
gzip logs/*.log.1 logs/*.log.2
```

## 📝 最佳实践

1. **合理设置日志级别**
   - 生产环境使用INFO级别
   - 开发环境使用DEBUG级别

2. **结构化日志记录**
   - 使用JSON格式记录详细信息
   - 包含必要的上下文信息

3. **定期监控和分析**
   - 每日检查错误日志
   - 分析用户行为模式
   - 优化系统性能

4. **安全考虑**
   - 不记录敏感信息（密码、token）
   - 限制日志文件访问权限
   - 定期备份重要日志

## 🔗 相关文件

- `utils/logger.js` - 日志工具类
- `utils/logViewer.js` - 日志查看器
- `router/logs.js` - 日志API路由
- `scripts/viewLogs.js` - 命令行工具

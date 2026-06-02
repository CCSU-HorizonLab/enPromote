const express = require('express');
const fs = require('fs');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const path = require('path');
const morgan = require('morgan');
const { port, host } = require('./config/serve');
const db = require('./config/db');
const { logger, accessLogStream, logApiError } = require('./utils/logger');
const app = express();
const { router: getwordRouter } = require('./router/third_part/getword');
const authRouter = require('./router/auth');
const wordRouter = require('./router/word');
const commendWordsRouter = require('./router/commendWords');
const logsRouter = require('./router/logs');
const aiRouter = require('./router/ai');
db(() => {
    logger.info('数据库连接成功');
});

// 日志中间件
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev')); // 控制台输出

app.use(session({
    name: 'sid',
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/session'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }
}));
// 请求日志记录中间件（已被morgan替代，但保留用于特殊需求）
function requestLogger(req, res, next) {
    logger.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.session?.userid
    });
    next();
}
// 全局中间件
function globalMiddleware_isLogin(req, res, next) {
    // 请求来源白名单
    if (req.url.includes('/word') ||
        (req.get('referer') && (
            req.get('referer').includes('/login') ||
            req.get('referer').includes('/register') ||
            req.get('referer') === `http://localhost:5173/`
        ))) {
        return next();
    } else {
        // console.log(req.session)
        console.log(req.session.userid);
        if (req.session.isLogin && req.session.userid) {
            next();
        } else {
            return res.status(401).json({
                code: 401,
                message: '未登录',
                redirect: '/login'
            });
        }
    }

}
// app.use(requestLogger); // 可选：如果需要额外的请求日志
app.use(globalMiddleware_isLogin);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get('/', (req, res) => {
    res.send('Hello World');
});
app.use('/word', getwordRouter, wordRouter);
app.use('/auth', authRouter);
app.use('/commendWords', commendWordsRouter);
app.use('/logs', logsRouter);
app.use('/aiApi', aiRouter);

app.listen(port, host, () => {
    console.log(`Dev_server is running on http://${host}:${port}`);
});


// 全局错误处理中间件
app.use((err, req, res, next) => {
    // 记录错误日志
    logApiError(req, err, err.status || 500);

    // 返回错误响应
    res.status(err.status || 500).json({
        code: err.status || 500,
        message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
        error: process.env.NODE_ENV === 'production' ? {} : err
    });
});

// 404处理
app.use((req, res) => {
    logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        code: 404,
        message: '请求的资源不存在'
    });
});

// 启动服务器
app.listen(port, host, () => {
    logger.info(`服务器启动成功`, {
        host,
        port,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid
    });
    console.log(`服务器运行在 http://${host}:${port}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('收到SIGTERM信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('收到SIGINT信号，正在关闭服务器...');
    process.exit(0);
});

// 捕获未处理的异常
process.on('uncaughtException', (err) => {
    logger.error('未捕获的异常', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝', {
        reason: reason,
        promise: promise
    });
});

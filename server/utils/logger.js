const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保logs目录存在
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

// 创建logger实例
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // 错误日志文件
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // 组合日志文件
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // 控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// 如果是生产环境，不输出到控制台
if (process.env.NODE_ENV === 'production') {
    logger.remove(winston.transports.Console);
}

// 访问日志同样交给 winston 轮转，避免 morgan 直接追加导致文件无限增长。
// 这里刻意不加时间戳/级别前缀：access.log 必须保持 morgan combined 的原格式，
// 现有的日志查看和清理逻辑都按这个格式解析。
const accessLogger = winston.createLogger({
    level: 'info',
    format: winston.format.printf(({ message }) => message),
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'access.log'),
            maxsize: 5242880, // 单文件 5MB
            maxFiles: 5, // 最多保留 5 份，超出后滚动删除最旧的
            tailable: true, // 轮转时把 access.log 改名成 access1.log、access2.log……
            eol: '\n' // 固定用 \n，避免 Windows 的 \r\n 影响按行解析
        })
    ]
});

// morgan 只认标准的可写流，这里把 winston 包一层 write 适配器。
// morgan 传入的内容自带结尾换行，winston 会再补一个，所以先去掉一个。
const accessLogStream = {
    write: (message) => accessLogger.info(String(message).replace(/\r?\n$/, ''))
};

// 导出logger和stream
module.exports = {
    logger,
    accessLogStream,

    // 便捷方法
    info: (message, meta = {}) => logger.info(message, meta),
    warn: (message, meta = {}) => logger.warn(message, meta),
    error: (message, meta = {}) => logger.error(message, meta),
    debug: (message, meta = {}) => logger.debug(message, meta),

    // 记录API错误
    logApiError: (req, error, statusCode = 500) => {
        const errorInfo = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.session?.userid,
            statusCode,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        logger.error('API Error', errorInfo);
    },

    // 记录用户操作
    logUserAction: (req, action, details = {}) => {
        const actionInfo = {
            action,
            userId: req.session?.userid,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.originalUrl,
            details,
            timestamp: new Date().toISOString()
        };

        logger.info('User Action', actionInfo);
    },

    // 记录数据库操作错误
    logDbError: (operation, error, collection = '') => {
        const dbErrorInfo = {
            operation,
            collection,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        logger.error('Database Error', dbErrorInfo);
    }
};

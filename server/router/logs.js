const express = require('express');
const router = express.Router();
const LogViewer = require('../utils/logViewer');
const { logger, logUserAction } = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLog');
const { requireAdmin, requireAdminOrManager } = require('../middleware/auth');

const logViewer = new LogViewer();

// 查询日志属于只读操作，管理员和运营人员都可以使用。
router.use(requireAdminOrManager);

// 获取错误日志
router.get('/errors', (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const logs = logViewer.getErrorLogs(lines);
        
        logUserAction(req, 'VIEW_ERROR_LOGS', { lines });
        
        res.json({
            code: 200,
            data: logs,
            message: '获取错误日志成功'
        });
    } catch (error) {
        logger.error('获取错误日志失败', error);
        res.status(500).json({
            code: 500,
            message: '获取错误日志失败'
        });
    }
});

// 获取访问日志
router.get('/access', (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const logs = logViewer.getAccessLogs(lines);
        
        logUserAction(req, 'VIEW_ACCESS_LOGS', { lines });
        
        res.json({
            code: 200,
            data: logs,
            message: '获取访问日志成功'
        });
    } catch (error) {
        logger.error('获取访问日志失败', error);
        res.status(500).json({
            code: 500,
            message: '获取访问日志失败'
        });
    }
});

// 获取组合日志
router.get('/combined', (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const logs = logViewer.getCombinedLogs(lines);
        
        logUserAction(req, 'VIEW_COMBINED_LOGS', { lines });
        
        res.json({
            code: 200,
            data: logs,
            message: '获取组合日志成功'
        });
    } catch (error) {
        logger.error('获取组合日志失败', error);
        res.status(500).json({
            code: 500,
            message: '获取组合日志失败'
        });
    }
});

// 搜索日志
router.get('/search', (req, res) => {
    try {
        const { keyword, type = 'combined', lines = 100 } = req.query;
        
        if (!keyword) {
            return res.status(400).json({
                code: 400,
                message: '请提供搜索关键词'
            });
        }
        
        const logs = logViewer.searchLogs(keyword, type, parseInt(lines));
        
        logUserAction(req, 'SEARCH_LOGS', { keyword, type, lines });
        
        res.json({
            code: 200,
            data: logs,
            message: '搜索日志成功'
        });
    } catch (error) {
        logger.error('搜索日志失败', error);
        res.status(500).json({
            code: 500,
            message: '搜索日志失败'
        });
    }
});

// 获取日志统计
router.get('/stats', (req, res) => {
    try {
        const stats = logViewer.getLogStats();
        
        logUserAction(req, 'VIEW_LOG_STATS');
        
        res.json({
            code: 200,
            data: stats,
            message: '获取日志统计成功'
        });
    } catch (error) {
        logger.error('获取日志统计失败', error);
        res.status(500).json({
            code: 500,
            message: '获取日志统计失败'
        });
    }
});

// 按日期获取日志
router.get('/date/:date', (req, res) => {
    try {
        const { date } = req.params;
        const logs = logViewer.getLogsByDate('combined', date);
        
        logUserAction(req, 'VIEW_LOGS_BY_DATE', { date });
        
        res.json({
            code: 200,
            data: logs,
            message: `获取${date}的日志成功`
        });
    } catch (error) {
        logger.error('按日期获取日志失败', error);
        res.status(500).json({
            code: 500,
            message: '按日期获取日志失败'
        });
    }
});

// 按级别获取日志
router.get('/level/:level', (req, res) => {
    try {
        const { level } = req.params;
        const logs = logViewer.getLogsByLevel(level);
        
        logUserAction(req, 'VIEW_LOGS_BY_LEVEL', { level });
        
        res.json({
            code: 200,
            data: logs,
            message: `获取${level}级别日志成功`
        });
    } catch (error) {
        logger.error('按级别获取日志失败', error);
        res.status(500).json({
            code: 500,
            message: '按级别获取日志失败'
        });
    }
});

// 清理旧日志
// 清理日志会影响服务器数据，只允许 admin 执行。
// 处理函数是 async 的：清理完成后要等审计记录真正写入数据库再返回。
router.post('/clean', requireAdmin, async (req, res) => {
    try {
        const { daysToKeep: rawDays = 30 } = req.body || {};
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
        // 用 Number 而不是 parseInt：parseInt('30abc') 会得到 30，
        // 这里希望非法输入直接报错，而不是被悄悄接受。
        const daysToKeep = Number(rawDays);
        if (!Number.isInteger(daysToKeep) || daysToKeep < 1 || daysToKeep > 365) {
            return res.status(400).json({
                code: 400,
                message: '保留天数必须是 1 到 365 之间的整数'
            });
        }

        const result = logViewer.cleanOldLogs(daysToKeep);

        // 清理日志属于敏感操作：先同步落审计库，再告诉调用方“清理成功”，
        // 避免出现清理完成但审计记录丢失的情况。
        await recordAuditLog(req, 'CLEAN_OLD_LOGS', {
            targetType: 'log',
            reason,
            details: {
                daysToKeep,
                totalRemoved: result.totalRemoved,
                files: result.files.map(file => ({
                    name: file.name,
                    removed: file.entriesRemoved
                }))
            }
        });
        logger.info(`管理员清理旧日志，保留${daysToKeep}天，共删除${result.totalRemoved}条`);

        res.json({
            code: 200,
            message: `已清理 ${daysToKeep} 天前的日志`,
            data: result
        });
    } catch (error) {
        logger.error('清理旧日志失败', error);
        res.status(500).json({
            code: 500,
            message: '清理旧日志失败'
        });
    }
});

module.exports = router;

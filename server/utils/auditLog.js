const mongoose = require('mongoose');
const AdminAuditLog = require('../modules/AdminAuditLog');
const { logger, logUserAction } = require('./logger');

/**
 * 记录管理端敏感操作：保留原有的文本日志，同时同步写入数据库。
 *
 * 写入策略：
 * - 文本日志（combined.log）方便开发时直接看，但会轮转/清理；
 * - 数据库记录用于长期审计，支持按操作人、动作、目标、时间检索；
 * - 落库失败时只记录错误，不阻断已经完成的主流程（例如账号已经被禁用），
 *   避免“操作成功但接口报错”造成管理员重复操作。
 *
 * @param {import('express').Request} req 请求对象，需要先经过鉴权中间件
 * @param {string} action 动作标识，例如 ADMIN_UPDATE_USER_STATUS
 * @param {object} options
 * @param {string} [options.targetType] 目标类型，例如 user / log
 * @param {string} [options.targetId] 目标 ID
 * @param {string} [options.reason] 管理员填写的操作原因
 * @param {object} [options.details] 动作相关的补充信息
 * @param {boolean} [options.success=true] 操作是否成功
 */
async function recordAuditLog(req, action, options = {}) {
    const {
        targetType = '',
        targetId = '',
        reason = '',
        details = {},
        success = true
    } = options;

    // 管理端路由由 requireAdmin/requireAdminOrManager 设置了 req.authUser；
    // 普通会话没有 authUser 时回退到 session 里的用户信息。
    const operatorId = req.authUser?.id || req.session?.userid || null;
    const entry = {
        // 只有合法的 ObjectId 才能写入；否则保持 null，避免 Mongoose 转换报错。
        operatorId: operatorId && mongoose.Types.ObjectId.isValid(operatorId) ? operatorId : null,
        operatorUsername: req.authUser?.username || req.session?.username || '',
        action,
        targetType,
        targetId: targetId ? String(targetId) : '',
        // 原因来自外部输入：去空格并截断，和模型里的 maxlength 保持一致。
        reason: String(reason || '').trim().slice(0, 200),
        details,
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        method: req.method,
        url: req.originalUrl,
        success
    };

    // 保留原有的文本日志，开发时可以在 combined.log 里直接看到操作记录。
    logUserAction(req, action, {
        ...details,
        targetType: entry.targetType,
        targetId: entry.targetId,
        reason: entry.reason,
        success
    });

    try {
        await AdminAuditLog.create(entry);
    } catch (error) {
        // 审计落库失败不能静默：必须留下错误日志，但不要影响接口返回。
        logger.error('审计日志落库失败', { action, error: error.message });
    }

    return entry;
}

module.exports = { recordAuditLog };

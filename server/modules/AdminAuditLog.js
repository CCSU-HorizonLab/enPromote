const mongoose = require('mongoose');

/**
 * 管理端敏感操作的审计记录。
 *
 * 和 combined.log 的区别：
 * - 文本日志会轮转、会被清理，不适合作为长期审计凭证；
 * - 这里把关键字段结构化存进 MongoDB，可以按操作人、动作、目标、时间检索。
 *
 * 目前写入的动作为：ADMIN_UPDATE_USER_STATUS（启用/禁用账号）、
 * CLEAN_OLD_LOGS（清理日志）。后续新增敏感操作时复用 recordAuditLog 即可。
 */
const adminAuditLogSchema = new mongoose.Schema({
    // 操作人快照：即使账号后来被改名或删除，也能还原当时的操作者。
    operatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    operatorUsername: {
        type: String,
        default: ''
    },
    // 动作标识，使用大写下划线常量，便于精确过滤和统计。
    action: {
        type: String,
        required: true
    },
    // 操作目标：例如 targetType=user、targetId=被禁用用户的 _id。
    targetType: {
        type: String,
        default: ''
    },
    targetId: {
        type: String,
        default: ''
    },
    // 操作原因由管理员填写，限制长度避免写入异常大的文本。
    reason: {
        type: String,
        default: '',
        maxlength: 200
    },
    // 动作相关的补充信息，例如 { status, previousStatus } 或 { daysToKeep, totalRemoved }。
    // 不同动作字段差异较大，这里用 Mixed 保持灵活。
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // 请求上下文，便于追溯是谁、从哪台机器发起的操作。
    ip: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    method: {
        type: String,
        default: ''
    },
    url: {
        type: String,
        default: ''
    },
    // 预留给“操作失败也要留痕”的场景；目前成功写入的记录都是 true。
    success: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { versionKey: false });

// 列表默认按时间倒序，这个索引直接支撑首页查询。
adminAuditLogSchema.index({ createdAt: -1 });
// “某个管理员做过什么”以及“某个动作的历史”这两类筛选。
adminAuditLogSchema.index({ operatorId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
// “这个用户被谁、什么时候操作过”。
adminAuditLogSchema.index({ targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);

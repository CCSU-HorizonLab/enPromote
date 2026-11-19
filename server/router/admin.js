const express = require('express');
const mongoose = require('mongoose');
const User = require('../modules/User');
const AdminAuditLog = require('../modules/AdminAuditLog');
const { requireAdmin, requireAdminOrManager } = require('../middleware/auth');
const { logger, logApiError, logUserAction } = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLog');

const router = express.Router();
// 使用字段白名单返回用户信息，避免把密码等凭据带到管理端。
const listFields = 'username email phone role status avatar isVerified createdAt createTime totalWords currentChapter cet4.todayStudiedWords cet4.streakDays cet4.learnedWords';
const detailFields = `${listFields} updatedAt chapters`;

// 早期用户文档没有 role/status，Mongoose 默认值不会补到已有记录上。
// 管理端统一按模型默认值展示，避免出现角色/状态空白或“正常账号”少算。
// 这里只影响接口响应，不写库；存量数据由 scripts/migrateLegacyUserFields.js 补齐。
function withLegacyDefaults(user) {
    if (!user) return user;
    return {
        ...user,
        role: user.role || 'user',
        status: user.status || 'active'
    };
}

// 用户查看接口允许 admin 和 manager；具体写操作再单独加更严格的权限。
router.use(requireAdminOrManager);

router.get('/users', async (req, res) => {
    try {
        // 限制页码和每页数量，避免请求意外读取过大的用户集合。
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 20, 1), 100);
        const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
        const filter = {};

        if (search) {
            // 把输入当作普通文本，而不是正则表达式，避免特殊字符改变查询含义。
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchPattern = new RegExp(escapedSearch, 'i');
            filter.$or = [
                { username: searchPattern },
                { email: searchPattern },
                { phone: searchPattern }
            ];
        }

        // 总数统计与当前页查询互不依赖，可以并行执行。
        const [total, users] = await Promise.all([
            User.countDocuments(filter),
            User.find(filter)
                .select(listFields)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean()
        ]);

        logUserAction(req, 'ADMIN_LIST_USERS', { page, pageSize, searched: Boolean(search) });
        return res.json({
            code: 200,
            message: '获取用户列表成功',
            data: {
                items: users.map(withLegacyDefaults),
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                }
            }
        });
    } catch (error) {
        logger.error('管理员获取用户列表失败:', error);
        logApiError(req, error, 500);
        return res.status(500).json({ code: 500, message: '获取用户列表失败' });
    }
});

// 汇总后台首页需要的账号和学习数据；学习人数按当天存在学习记录的用户计算。
router.get('/stats', async (req, res) => {
    try {
        // 使用服务器本地日期切分当天范围，与学习记录写入时的日期计算方式保持一致。
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        // 一次聚合同时计算总览、今日注册和今日学习数据，避免逐个读取全部用户文档。
        const [result] = await User.aggregate([
            {
                $project: {
                    status: 1,
                    registeredAt: { $ifNull: ['$createdAt', '$createTime'] },
                    totalWords: { $ifNull: ['$totalWords', { $ifNull: ['$cet4.learnedWords', 0] }] },
                    todayStudyRecords: {
                        $filter: {
                            input: { $ifNull: ['$studyHistory', []] },
                            as: 'record',
                            cond: {
                                $and: [
                                    { $gte: ['$$record.date', todayStart] },
                                    { $lt: ['$$record.date', tomorrowStart] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    todayLearnedWords: {
                        $sum: {
                            $map: {
                                input: '$todayStudyRecords',
                                as: 'record',
                                in: { $ifNull: ['$$record.words', 0] }
                            }
                        }
                    }
                }
            },
            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                totalUsers: { $sum: 1 },
                                activeAccounts: {
                                    // 早期文档可能没有 status，按默认 active 计入。
                                    $sum: {
                                        $cond: [
                                            { $eq: [{ $ifNull: ['$status', 'active'] }, 'active'] },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                totalLearnedWords: { $sum: '$totalWords' }
                            }
                        }
                    ],
                    todayRegistrations: [
                        { $match: { registeredAt: { $gte: todayStart, $lt: tomorrowStart } } },
                        { $count: 'count' }
                    ],
                    todayStudy: [
                        {
                            $group: {
                                _id: null,
                                todayLearners: {
                                    $sum: {
                                        $cond: [{ $gt: [{ $size: '$todayStudyRecords' }, 0] }, 1, 0]
                                    }
                                },
                                todayLearnedWords: { $sum: '$todayLearnedWords' }
                            }
                        }
                    ]
                }
            }
        ]);

        // facet 在没有匹配数据时会返回空数组，这里把空结果转换成明确的 0。
        const overview = result?.overview?.[0] || {};
        const todayStudy = result?.todayStudy?.[0] || {};
        const date = new Date();
        const dateLabel = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('-');
        const stats = {
            date: dateLabel,
            totalUsers: overview.totalUsers || 0,
            activeAccounts: overview.activeAccounts || 0,
            newUsersToday: result?.todayRegistrations?.[0]?.count || 0,
            todayLearners: todayStudy.todayLearners || 0,
            todayLearnedWords: todayStudy.todayLearnedWords || 0,
            totalLearnedWords: overview.totalLearnedWords || 0
        };

        logUserAction(req, 'ADMIN_VIEW_OVERVIEW', { date: dateLabel });
        return res.json({ code: 200, message: '获取管理概况成功', data: stats });
    } catch (error) {
        logger.error('管理员获取管理概况失败:', error);
        logApiError(req, error, 500);
        return res.status(500).json({ code: 500, message: '获取管理概况失败' });
    }
});

// 查询管理端审计日志；支持按动作、操作人、目标和时间范围过滤。
// 返回结构和用户列表一致：data.items + data.pagination，前端拦截器会
// 把 items 规范成 data 数组，并保留 pagination。
router.get('/audit-logs', async (req, res) => {
    try {
        // 日期只写到天时，起始取当天 00:00:00，结束取当天 23:59:59.999。
        // 这样前端用 <input type="date"> 传 "2026-11-17" 也能覆盖一整天。
        const parseDateBoundary = (value, endOfDay) => {
            if (typeof value !== 'string' || !value.trim()) return null;
            const text = value.trim();
            const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
                ? new Date(`${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
                : new Date(text);
            return Number.isNaN(date.getTime()) ? null : date;
        };

        // 分页参数做上下限约束，避免一次读取过多审计记录。
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 20, 1), 100);
        const action = typeof req.query.action === 'string' ? req.query.action.trim().slice(0, 60) : '';
        const operator = typeof req.query.operator === 'string' ? req.query.operator.trim().slice(0, 60) : '';
        const targetId = typeof req.query.targetId === 'string' ? req.query.targetId.trim().slice(0, 60) : '';
        const from = parseDateBoundary(req.query.from, false);
        const to = parseDateBoundary(req.query.to, true);

        const filter = {};
        // 动作是精确匹配；操作人和目标支持部分匹配。
        if (action) filter.action = action;
        if (targetId) filter.targetId = targetId;
        if (operator) {
            // 把输入当普通文本而不是正则，避免特殊字符改变查询含义。
            const escaped = operator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.operatorUsername = new RegExp(escaped, 'i');
        }
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = from;
            if (to) filter.createdAt.$lte = to;
        }

        // 总数和当前页查询互不依赖，可以并行执行。
        const [total, items] = await Promise.all([
            AdminAuditLog.countDocuments(filter),
            AdminAuditLog.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean()
        ]);

        logUserAction(req, 'ADMIN_VIEW_AUDIT_LOGS', { page, pageSize, action, operator });
        return res.json({
            code: 200,
            message: '获取审计日志成功',
            data: {
                items,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                }
            }
        });
    } catch (error) {
        logger.error('管理员获取审计日志失败:', error);
        logApiError(req, error, 500);
        return res.status(500).json({ code: 500, message: '获取审计日志失败' });
    }
});

router.get('/users/:userId', async (req, res) => {
    try {
        // 先校验 MongoDB ObjectId，避免把非法 ID 传给 Mongoose 查询。
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(400).json({ code: 400, message: '用户ID无效' });
        }

        const user = await User.findById(req.params.userId).select(detailFields).lean();
        if (!user) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        logUserAction(req, 'ADMIN_VIEW_USER', { targetUserId: user._id });
        return res.json({ code: 200, message: '获取用户详情成功', data: withLegacyDefaults(user) });
    } catch (error) {
        logger.error('管理员获取用户详情失败:', error);
        logApiError(req, error, 500);
        return res.status(500).json({ code: 500, message: '获取用户详情失败' });
    }
});

// 启用/禁用会修改账号，因此额外要求 admin，manager 只能查看。
router.patch('/users/:userId/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body || {};
        // 原因由前端弹窗收集，最长 200 字，会原样写进审计日志。
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(400).json({ code: 400, message: '用户ID无效' });
        }
        if (!['active', 'disabled'].includes(status)) {
            return res.status(400).json({ code: 400, message: '账号状态无效' });
        }
        // 防止管理员误禁用自己，造成当前会话失去管理能力。
        if (String(req.authUser.id) === req.params.userId) {
            return res.status(403).json({ code: 403, message: '不能修改当前管理员自己的账号状态' });
        }

        const user = await User.findById(req.params.userId).select('_id username role status');
        if (!user) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        // MVP 只允许管理普通用户，不提供管理员或运营账号的状态修改。
        // 早期文档没有 role，按普通用户处理。
        if ((user.role || 'user') !== 'user') {
            return res.status(403).json({ code: 403, message: '只能修改普通用户的账号状态' });
        }

        const previousStatus = user.status || 'active';
        user.status = status;
        await user.save();
        // 敏感操作同步写入审计库，保留操作人、原因、IP 和目标账号。
        await recordAuditLog(req, 'ADMIN_UPDATE_USER_STATUS', {
            targetType: 'user',
            targetId: user._id,
            reason,
            details: { status, previousStatus }
        });

        return res.json({
            code: 200,
            message: status === 'active' ? '用户已启用' : '用户已禁用',
            data: withLegacyDefaults({ _id: user._id, username: user.username, role: user.role, status: user.status })
        });
    } catch (error) {
        logger.error('管理员更新用户状态失败:', error);
        logApiError(req, error, 500);
        return res.status(500).json({ code: 500, message: '更新用户状态失败' });
    }
});

module.exports = router;
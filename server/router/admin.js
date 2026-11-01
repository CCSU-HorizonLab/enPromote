const express = require('express');
const mongoose = require('mongoose');
const User = require('../modules/User');
const { requireAdmin, requireAdminOrManager } = require('../middleware/auth');
const { logger, logApiError, logUserAction } = require('../utils/logger');

const router = express.Router();
// 使用字段白名单返回用户信息，避免把密码等凭据带到管理端。
const listFields = 'username email phone role status avatar isVerified createdAt createTime totalWords currentChapter cet4.todayStudiedWords cet4.streakDays cet4.learnedWords';
const detailFields = `${listFields} updatedAt chapters`;

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
                items: users,
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
        return res.json({ code: 200, message: '获取用户详情成功', data: user });
    } catch (error) {
        logger.error('管理员获取用户详情失败:', error);
        logApiError(req, error, 500);
        return res.status(500).json({ code: 500, message: '获取用户详情失败' });
    }
});

// 启用/禁用会修改账号，因此额外要求 admin，manager 只能查看。
router.patch('/users/:userId/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
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
        if (user.role !== 'user') {
            return res.status(403).json({ code: 403, message: '只能修改普通用户的账号状态' });
        }

        user.status = status;
        await user.save();
        // 记录谁修改了哪个账号，便于后续审计管理操作。
        logUserAction(req, 'ADMIN_UPDATE_USER_STATUS', {
            targetUserId: user._id,
            status
        });

        return res.json({
            code: 200,
            message: status === 'active' ? '用户已启用' : '用户已禁用',
            data: { _id: user._id, username: user.username, role: user.role, status: user.status }
        });
    } catch (error) {
        logger.error('管理员更新用户状态失败:', error);
        logApiError(req, error, 500);
        return res.status(500).json({ code: 500, message: '更新用户状态失败' });
    }
});

module.exports = router;
const User = require('../modules/User');

const publicAuthRoutes = new Set([
    'POST /api/auth/forgot-password',
    'POST /api/auth/forgot-password-verify',
    'POST /api/auth/reset-password',
    'GET /api/auth/forgot-password',
    'GET /api/auth/reset-password',
    'GET /api/auth/get-contact-from-token',
    'POST /api/auth/login',
    'POST /api/auth/send-code',
    'POST /api/auth/verify-code',
    'POST /api/auth/send-email-code',
    'POST /api/auth/register'
]);

// 通过参数组合出不同权限的中间件，避免每种角色重复写登录校验。
function createAuthMiddleware({ adminOnly = false, adminOrManager = false, allowPublicAuthRoutes = false } = {}) {
    return async function authMiddleware(req, res, next) {
        // 登录和注册等接口允许未登录访问；其余请求继续检查 session。
        const requestPath = `${req.baseUrl}${req.path}`;
        if (allowPublicAuthRoutes && publicAuthRoutes.has(`${req.method} ${requestPath}`)) {
            return next();
        }

        const userId = req.session?.userid;
        if (!req.session?.isLogin || !userId) {
            return res.status(401).json({
                code: 401,
                message: '未登录',
                redirect: '/login'
            });
        }

        try {
            // 从数据库读取最新角色和状态，避免只信任登录时保存的 session 信息。
            const user = await User.findById(userId).select('_id username role status');
            const status = user?.status || 'active';

            if (!user || status !== 'active') {
                if (typeof req.session.destroy === 'function') {
                    req.session.destroy(() => {});
                }
                res.clearCookie('sid');
                return res.status(401).json({
                    code: 401,
                    message: user ? '账号当前不可用' : '用户不存在',
                    redirect: '/login'
                });
            }

            const role = user.role || 'user';
            // adminOnly 用于高权限操作；adminOrManager 用于只读后台功能。
            if ((adminOnly && role !== 'admin')
                || (adminOrManager && !['admin', 'manager'].includes(role))) {
                return res.status(403).json({
                    code: 403,
                    message: adminOnly ? '没有管理员权限' : '没有后台访问权限'
                });
            }

            req.authUser = {
                id: user._id,
                username: user.username,
                role,
                status
            };
            // 将已校验的用户信息挂在请求上，后续路由可用 req.authUser 记录审计信息。
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = {
    // 普通登录验证，同时允许公开的身份认证接口通过。
    requireAuth: createAuthMiddleware({ allowPublicAuthRoutes: true }),
    // 仅管理员可调用的权限检查。
    requireAdmin: createAuthMiddleware({ adminOnly: true }),
    // 管理员和运营人员均可调用的后台只读权限检查。
    requireAdminOrManager: createAuthMiddleware({ adminOrManager: true })
};
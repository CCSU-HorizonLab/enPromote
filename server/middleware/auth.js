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

function createAuthMiddleware({ adminOnly = false, allowPublicAuthRoutes = false } = {}) {
    return async function authMiddleware(req, res, next) {
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
            if (adminOnly && role !== 'admin') {
                return res.status(403).json({
                    code: 403,
                    message: '没有管理员权限'
                });
            }

            req.authUser = {
                id: user._id,
                username: user.username,
                role,
                status
            };
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = {
    requireAuth: createAuthMiddleware({ allowPublicAuthRoutes: true }),
    requireAdmin: createAuthMiddleware({ adminOnly: true })
};
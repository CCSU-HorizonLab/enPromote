/**
 * 进程内的登录失败限流。
 *
 * 为什么需要两层限制：
 * - 账号级锁定在 auth.js 里实现（连续失败 5 次锁 15 分钟），但它只能针对
 *   已存在的用户名；攻击者可以不断换用户名，这时没法按账号计数。
 * - 这里按 IP 再做一层计数，覆盖“用户名不存在”的情况。
 *
 * 注意：数据保存在当前 Node 进程的 Map 里，重启会清空，多实例部署时
 * 各实例互不共享；以后如果水平扩容，应换成 Redis 等共享存储。
 */
const WINDOW_MS = 10 * 60 * 1000; // 统计窗口：10 分钟
const MAX_ATTEMPTS = 20; // 窗口内允许的失败次数
const BLOCK_MS = 15 * 60 * 1000; // 超限后的封禁时长：15 分钟

// 结构：ip -> { count, windowStart, blockedUntil }
// count 是当前窗口内的失败次数；windowStart 是窗口开始时间；
// blockedUntil 是绝对时间戳，0 表示没有被封禁。
const attempts = new Map();

// 判断该 IP 当前是否处于封禁中。
function isBlocked(ip, now = Date.now()) {
    const record = attempts.get(ip);
    if (!record) return false;

    if (record.blockedUntil) {
        // 封禁未到期：继续拦截。
        if (record.blockedUntil > now) return true;
        // 封禁已过期：清掉记录，允许重新尝试。
        attempts.delete(ip);
        return false;
    }

    // 没有封禁但窗口已过：旧计数作废。
    if (now - record.windowStart > WINDOW_MS) {
        attempts.delete(ip);
    }
    return false;
}

// 记录一次登录失败；返回当前窗口内的累计失败次数。
function recordFailure(ip, now = Date.now()) {
    const record = attempts.get(ip) || { count: 0, windowStart: now, blockedUntil: 0 };

    // 固定窗口：超过 10 分钟后重新开始计数。
    if (now - record.windowStart > WINDOW_MS) {
        record.count = 0;
        record.windowStart = now;
    }

    record.count += 1;
    // 达到阈值后设置封禁截止时间，后续请求由 isBlocked 直接拦截。
    if (record.count >= MAX_ATTEMPTS) {
        record.blockedUntil = now + BLOCK_MS;
    }
    attempts.set(ip, record);
    return record.count;
}

// 登录成功后清空该 IP 的失败记录。
function clear(ip) {
    attempts.delete(ip);
}

// 定期清掉过期记录，避免 Map 随着不同 IP 的数量无限增长。
// unref() 让这个定时器不阻止 Node 进程正常退出。
const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of attempts) {
        const expired = record.blockedUntil
            ? record.blockedUntil <= now
            : now - record.windowStart > WINDOW_MS;
        if (expired) attempts.delete(ip);
    }
}, WINDOW_MS);
if (typeof sweeper.unref === 'function') {
    sweeper.unref();
}

module.exports = {
    isBlocked,
    recordFailure,
    clear,
    WINDOW_MS,
    MAX_ATTEMPTS,
    BLOCK_MS
};

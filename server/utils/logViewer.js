/**
 * 日志查看与维护工具。
 *
 * 项目里的日志有两种格式：
 * 1. winston（error.log / combined.log）：
 *    "2026-11-12 16:30:09 [INFO]: 服务器启动成功"
 * 2. morgan combined（access.log）：
 *    "::1 - - [12/Nov/2026:08:30:23 +0000] "GET / HTTP/1.1" 200 11"
 *
 * 读取接口统一从文件尾部倒序读取，避免大日志一次性载入内存；
 * 清理接口按每条日志开头的时间戳保留最近 N 天，winston 的轮转归档
 * （combined1.log、error2.log 等）也会一起处理。
 */
const fs = require('fs');
const path = require('path');

// 日志里出现的英文月份（morgan/CLF 访问日志格式）。
const MONTH_INDEX = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

// winston 写入本地时间：2026-11-12 16:30:09 [INFO]: ...
// 匹配到这一行说明它是“一条日志”的开始。
const WINSTON_LINE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) \[[A-Z]+\]:/;
// morgan combined 使用 CLF 格式：::1 - - [12/Nov/2026:08:30:23 +0000] "..."
// CLF 时间是 UTC，后面带 +0000 这样的时区偏移。
const ACCESS_LINE = /^\S+ - \S+ \[(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})\]/;

// 解析一行日志开头的时间戳；无法识别时返回 null。
function parseLogTimestamp(line) {
    let match = line.match(WINSTON_LINE);
    if (match) {
        const [, year, month, day, hour, minute, second] = match;
        // winston 的 timestamp 是本地时间，直接用本地时区构造 Date。
        return new Date(
            Number(year), Number(month) - 1, Number(day),
            Number(hour), Number(minute), Number(second)
        );
    }

    match = line.match(ACCESS_LINE);
    if (match) {
        const [, day, month, year, hour, minute, second, sign, offsetHour, offsetMinute] = match;
        const monthIndex = MONTH_INDEX[month];
        if (monthIndex === undefined) return null;
        // CLF 是 UTC 时间 + 时区偏移：先按 UTC 算出时刻，
        // 再减掉偏移量（例如 +0800 要减 8 小时）得到真实时间。
        const utc = Date.UTC(
            Number(year), monthIndex, Number(day),
            Number(hour), Number(minute), Number(second)
        );
        const offset = (sign === '-' ? -1 : 1)
            * (Number(offsetHour) * 60 + Number(offsetMinute)) * 60000;
        return new Date(utc - offset);
    }

    return null;
}

// 把日志按“时间戳行 + 后续堆栈行”切成条目，只保留 cutoff 之后的条目。
// 无法识别时间戳的行跟随上一条；文件开头的无时间戳内容保守保留。
function filterLogEntries(content, cutoff) {
    const entries = [];
    for (const line of content.split(/\r?\n/)) {
        if (!line.trim()) continue;

        const timestamp = parseLogTimestamp(line);
        if (timestamp !== null || entries.length === 0) {
            // 能识别时间的行开启一条新日志；文件第一行即使没有时间戳
            // 也单独成一个条目，避免把内容直接丢掉。
            entries.push({ timestamp, lines: [line] });
        } else {
            // 堆栈、缩进等续行：归到上一条日志，删除时整块一起删。
            entries[entries.length - 1].lines.push(line);
        }
    }

    // timestamp 为 null 的条目无法判断年龄，保守保留，避免误删。
    const kept = entries.filter(entry => entry.timestamp === null || entry.timestamp >= cutoff);
    return {
        // 重新拼回文本时保留条目内部的换行，并补一个文件结尾换行。
        content: kept.length ? `${kept.map(entry => entry.lines.join('\n')).join('\n')}\n` : '',
        removed: entries.length - kept.length,
        kept: kept.length
    };
}

// 匹配当前日志文件及 winston tailable 轮转出的 combined1.log、error2.log 等归档。
function listLogFiles(logsDir) {
    if (!fs.existsSync(logsDir)) return [];
    return fs.readdirSync(logsDir)
        .filter(name => /^(?:error|combined|access)\d*\.log$/.test(name))
        .sort();
}

// 单次最多返回的日志行数，防止接口被传入超大 lines 拖垮内存。
const MAX_LOG_LINES = 1000;
// 尾部读取的分块大小与最大读取字节数；超过后只返回最近的部分。
const TAIL_BLOCK_SIZE = 64 * 1024;
const TAIL_MAX_BYTES = 2 * 1024 * 1024;

function normalizeLineLimit(value, fallback = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        // 前端没传、传了非数字或负数时使用默认值，同时仍然受上限约束。
        return Math.min(fallback, MAX_LOG_LINES);
    }
    return Math.min(parsed, MAX_LOG_LINES);
}

// 从文件尾部倒序分块读取，避免 readFileSync 把整个大日志载入内存。
function readTailLines(filePath, limit) {
    const stat = fs.statSync(filePath);
    if (!stat.size) return [];

    const fd = fs.openSync(filePath, 'r');
    try {
        // blocks 按从旧到新的顺序保存，最后一次性拼接。
        const blocks = [];
        let position = stat.size;
        let bytesRead = 0;
        let newlines = 0;

        // 从文件末尾向前读，直到凑够 limit 行或达到字节上限。
        while (position > 0 && newlines <= limit && bytesRead < TAIL_MAX_BYTES) {
            const size = Math.min(TAIL_BLOCK_SIZE, position, TAIL_MAX_BYTES - bytesRead);
            position -= size;
            const buffer = Buffer.alloc(size);
            fs.readSync(fd, buffer, 0, size, position);
            blocks.unshift(buffer);
            bytesRead += size;
            for (let i = 0; i < buffer.length; i += 1) {
                if (buffer[i] === 0x0A) newlines += 1;
            }
        }

        // 先把 Buffer 拼好再转字符串，避免中文等多字节字符
        // 刚好跨在两个分块之间时被截断成乱码。
        let lines = Buffer.concat(blocks)
            .toString('utf8')
            .split(/\r?\n/)
            .filter(line => line.trim());

        // 没有读到文件开头时，第一行可能是被截断的半行，丢弃。
        if (position > 0 && lines.length > 0) {
            lines = lines.slice(1);
        }

        // 只返回最后 limit 行。
        return lines.slice(-limit);
    } finally {
        fs.closeSync(fd);
    }
}

class LogViewer {
    constructor(logsDir = path.join(__dirname, '../logs')) {
        this.logsDir = logsDir;
    }

    // 以下三个读取方法都只读取文件尾部，并通过 normalizeLineLimit 限制行数，
    // 所以即使日志文件很大，接口的内存占用也有上限。
    // 读取错误日志
    getErrorLogs(lines = 100) {
        try {
            const errorLogPath = path.join(this.logsDir, 'error.log');
            if (!fs.existsSync(errorLogPath)) {
                return [];
            }

            return readTailLines(errorLogPath, normalizeLineLimit(lines));
        } catch (error) {
            console.error('读取错误日志失败:', error);
            return [];
        }
    }

    // 读取访问日志
    getAccessLogs(lines = 100) {
        try {
            const accessLogPath = path.join(this.logsDir, 'access.log');
            if (!fs.existsSync(accessLogPath)) {
                return [];
            }

            return readTailLines(accessLogPath, normalizeLineLimit(lines));
        } catch (error) {
            console.error('读取访问日志失败:', error);
            return [];
        }
    }

    // 读取组合日志
    getCombinedLogs(lines = 100) {
        try {
            const combinedLogPath = path.join(this.logsDir, 'combined.log');
            if (!fs.existsSync(combinedLogPath)) {
                return [];
            }

            return readTailLines(combinedLogPath, normalizeLineLimit(lines));
        } catch (error) {
            console.error('读取组合日志失败:', error);
            return [];
        }
    }

    // 按日期过滤日志
    getLogsByDate(logType = 'combined', date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const logs = this.getCombinedLogs(1000);
            
            return logs.filter(log => log.includes(targetDate));
        } catch (error) {
            console.error('按日期过滤日志失败:', error);
            return [];
        }
    }

    // 按级别过滤日志
    getLogsByLevel(level = 'ERROR') {
        try {
            const logs = this.getCombinedLogs(1000);
            return logs.filter(log => log.includes(`[${level.toUpperCase()}]`));
        } catch (error) {
            console.error('按级别过滤日志失败:', error);
            return [];
        }
    }

    // 搜索日志
    searchLogs(keyword, logType = 'combined', lines = 100) {
        try {
            let logs;
            switch (logType) {
                case 'error':
                    logs = this.getErrorLogs(lines);
                    break;
                case 'access':
                    logs = this.getAccessLogs(lines);
                    break;
                default:
                    logs = this.getCombinedLogs(lines);
            }
            
            return logs.filter(log => 
                log.toLowerCase().includes(keyword.toLowerCase())
            );
        } catch (error) {
            console.error('搜索日志失败:', error);
            return [];
        }
    }

    // 获取日志统计信息
    getLogStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const todayLogs = this.getLogsByDate('combined', today);
            
            const stats = {
                total: todayLogs.length,
                errors: todayLogs.filter(log => log.includes('[ERROR]')).length,
                warnings: todayLogs.filter(log => log.includes('[WARN]')).length,
                info: todayLogs.filter(log => log.includes('[INFO]')).length,
                date: today
            };
            
            return stats;
        } catch (error) {
            console.error('获取日志统计失败:', error);
            return {
                total: 0,
                errors: 0,
                warnings: 0,
                info: 0,
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    // 清理旧日志：按行内时间戳保留最近 N 天，返回每个文件的清理明细。
    // 这里需要扫描整个文件才能删掉中间的历史条目；由于 winston 把单个文件
    // 限制在 5MB，整文件读取的峰值内存是有上界的。
    cleanOldLogs(daysToKeep = 30) {
        const days = Number(daysToKeep);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
            throw new Error('保留天数必须是 1 到 365 之间的整数');
        }

        // cutoff 之前的条目会被删除，之后的保留。
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const files = [];

        // 同时处理 error.log / combined.log / access.log 以及它们的轮转归档。
        for (const name of listLogFiles(this.logsDir)) {
            const filePath = path.join(this.logsDir, name);
            const bytesBefore = fs.statSync(filePath).size;
            const content = fs.readFileSync(filePath, 'utf8');

            if (!content) {
                files.push({
                    name,
                    entriesRemoved: 0,
                    entriesKept: 0,
                    bytesBefore,
                    bytesAfter: bytesBefore
                });
                continue;
            }

            const result = filterLogEntries(content, cutoff);
            if (result.removed > 0) {
                // 原地重写而不是先删再建：日志文件可能正被 winston/morgan
                // 以追加方式打开，原地截断后已有的追加句柄会继续写到新文件末尾。
                // 同时只在确实有内容被删除时才写文件，减少与并发写入的交错。
                fs.writeFileSync(filePath, result.content, 'utf8');
            }

            files.push({
                name,
                entriesRemoved: result.removed,
                entriesKept: result.kept,
                bytesBefore,
                bytesAfter: fs.statSync(filePath).size
            });
        }

        return {
            daysToKeep: days,
            cutoff: cutoff.toISOString(),
            totalRemoved: files.reduce((sum, file) => sum + file.entriesRemoved, 0),
            files
        };
    }
}

module.exports = LogViewer;

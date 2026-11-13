const fs = require('fs');
const path = require('path');

// 日志里出现的英文月份（morgan/CLF 访问日志格式）。
const MONTH_INDEX = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

// winston 写入本地时间：2026-11-12 16:30:09 [INFO]: ...
const WINSTON_LINE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) \[[A-Z]+\]:/;
// morgan combined 使用 CLF 格式：::1 - - [12/Nov/2026:08:30:23 +0000] "..."
const ACCESS_LINE = /^\S+ - \S+ \[(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})\]/;

// 解析一行日志开头的时间戳；无法识别时返回 null。
function parseLogTimestamp(line) {
    let match = line.match(WINSTON_LINE);
    if (match) {
        const [, year, month, day, hour, minute, second] = match;
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
        // CLF 时间带时区偏移，先按 UTC 计算再减去偏移。
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
            entries.push({ timestamp, lines: [line] });
        } else {
            entries[entries.length - 1].lines.push(line);
        }
    }

    const kept = entries.filter(entry => entry.timestamp === null || entry.timestamp >= cutoff);
    return {
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

class LogViewer {
    constructor(logsDir = path.join(__dirname, '../logs')) {
        this.logsDir = logsDir;
    }

    // 读取错误日志
    getErrorLogs(lines = 100) {
        try {
            const errorLogPath = path.join(this.logsDir, 'error.log');
            if (!fs.existsSync(errorLogPath)) {
                return [];
            }
            
            const content = fs.readFileSync(errorLogPath, 'utf-8');
            const logLines = content.split('\n').filter(line => line.trim());
            return logLines.slice(-lines);
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
            
            const content = fs.readFileSync(accessLogPath, 'utf-8');
            const logLines = content.split('\n').filter(line => line.trim());
            return logLines.slice(-lines);
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
            
            const content = fs.readFileSync(combinedLogPath, 'utf-8');
            const logLines = content.split('\n').filter(line => line.trim());
            return logLines.slice(-lines);
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
    cleanOldLogs(daysToKeep = 30) {
        const days = Number(daysToKeep);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
            throw new Error('保留天数必须是 1 到 365 之间的整数');
        }

        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const files = [];

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
                // 日志文件可能正被 winston/morgan 以追加方式打开；
                // 原地重写后，已有的追加句柄会继续写到新的文件末尾。
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

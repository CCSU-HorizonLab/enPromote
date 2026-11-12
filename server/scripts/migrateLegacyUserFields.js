// 补齐早期用户文档缺失的 role/status/createdAt。
// 默认只统计不写入；确认后加 --apply 执行。
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../modules/User');
const { dbUrl } = require('../config/serve');

const apply = process.argv.includes('--apply');

// 字段缺失可能是 undefined（字段不存在）、null 或空字符串。
function missingClauses(field) {
    return [
        { [field]: { $exists: false } },
        { [field]: null },
        { [field]: '' }
    ];
}

async function main() {
    await mongoose.connect(dbUrl);
    console.log(`已连接数据库: ${mongoose.connection.name}${apply ? '（写入模式）' : '（预演模式，加 --apply 执行）'}`);

    const filter = {
        $or: [
            ...missingClauses('role'),
            ...missingClauses('status'),
            ...missingClauses('createdAt')
        ]
    };

    const candidates = await User.find(filter)
        .select('_id username role status createdAt createTime')
        .lean();

    console.log(`发现 ${candidates.length} 个需要处理的账号`);

    let updated = 0;
    let skipped = 0;

    for (const user of candidates) {
        const update = {};
        if (!user.role) update.role = 'user';
        if (!user.status) update.status = 'active';
        // createdAt 缺失时用注册时间回填，保证按注册时间排序正确。
        if (!user.createdAt && user.createTime) update.createdAt = user.createTime;

        if (Object.keys(update).length === 0) {
            skipped += 1;
            console.log(`- ${user.username}: 无需修改`);
            continue;
        }

        console.log(`- ${user.username}: 补齐 ${Object.keys(update).join('、')}`);
        if (apply) {
            // 关闭 timestamps，避免把 updatedAt 刷成当前时间。
            await User.updateOne({ _id: user._id }, { $set: update }, { timestamps: false });
        }
        updated += 1;
    }

    if (apply) {
        console.log(`完成：更新 ${updated} 个账号，跳过 ${skipped} 个`);
    } else {
        console.log(`预演结束：将更新 ${updated} 个账号，跳过 ${skipped} 个；确认无误后加 --apply 执行`);
    }
}

main()
    .catch((error) => {
        console.error('迁移失败:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });

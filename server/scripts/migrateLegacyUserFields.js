/**
 * 一次性数据迁移：补齐早期用户文档缺失的 role / status / createdAt。
 *
 * 背景：Mongoose 的 default 只对“新建文档”生效，历史数据里没有这些字段，
 * 导致管理端角色/状态显示空白、“正常账号”统计偏少。
 *
 * 用法：
 *   node scripts/migrateLegacyUserFields.js          # 只统计，不写库（默认）
 *   node scripts/migrateLegacyUserFields.js --apply  # 确认后真正写入
 *
 * 脚本是幂等的：重复执行只会处理仍然缺失字段的账号，已经补齐的会跳过。
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../modules/User');
const { dbUrl } = require('../config/serve');

const apply = process.argv.includes('--apply');

// 字段缺失可能是三种形式：字段不存在（undefined）、null、空字符串。
// 三种都视为“需要补齐”，避免漏掉历史脏数据。
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
        // createdAt 缺失时用注册时间 createTime 回填，
        // 这样管理端按注册时间排序、展示都不会把老账号排到最后。
        if (!user.createdAt && user.createTime) update.createdAt = user.createTime;

        if (Object.keys(update).length === 0) {
            skipped += 1;
            console.log(`- ${user.username}: 无需修改`);
            continue;
        }

        console.log(`- ${user.username}: 补齐 ${Object.keys(update).join('、')}`);
        if (apply) {
            // 关闭 timestamps：只补业务字段，不把 updatedAt 刷成当前时间，
            // 避免迁移动作本身污染用户的更新时间。
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

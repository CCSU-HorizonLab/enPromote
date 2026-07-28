const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true,
        validate: {
            validator: function(v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: '请输入有效的邮箱地址'
        }
    },
    code: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['register', 'reset'],
        message: '验证码类型必须是 register 或 reset'
    },
    expireTime: {
        type: Date,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 自动过期索引（TTL，超过 expireTime 后文档自动删除）
verificationCodeSchema.index({ expireTime: 1 }, { expireAfterSeconds: 0 });

// 联合索引：查询时按 email + type + isUsed 快速定位
verificationCodeSchema.index({ email: 1, type: 1, isUsed: 1 });

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);
module.exports = VerificationCode;

/**
 * 验证码服务
 * 用于生成、发送和验证验证码
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');

class VerificationCodeService {
  constructor() {
    // 模拟存储验证码，实际项目中应使用Redis等缓存服务
    this.codeStorage = new Map();
    // 验证码有效期（5分钟）
    this.codeExpireTime = 5 * 60 * 1000;
  }

  /**
   * 生成随机验证码
   * @param {number} length - 验证码长度，默认为6位
   * @returns {string} 生成的验证码
   */
  generateCode(length = 6) {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 发送验证码
   * @param {string} contact - 联系方式（邮箱或手机号）
   * @param {string} type - 验证码类型（register/reset）
   * @returns {Promise<object>} 发送结果
   */
  async sendCode(contact, type) {
    try {
      // 生成验证码
      const code = this.generateCode(6);
      const expireTime = new Date(Date.now() + this.codeExpireTime);

      // 存储验证码
      this.codeStorage.set(contact, {
        code,
        expireTime,
        type,
        sendTime: new Date()
      });

      // 模拟发送验证码（实际项目中应调用邮件或短信服务）
      let message = '';
      if (contact.includes('@')) {
        // 模拟发送邮件
        message = `模拟邮件发送：验证码 ${code} 已发送到邮箱 ${contact}，有效期5分钟`;
        logger.info(`模拟邮件发送: ${message}`);
      } else {
        // 模拟发送短信
        message = `模拟短信发送：验证码 ${code} 已发送到手机号 ${contact}，有效期5分钟`;
        logger.info(`模拟短信发送: ${message}`);
      }

      return {
        success: true,
        message: `验证码已发送到${contact}`,
        code // 仅用于测试，实际项目中不应返回验证码
      };
    } catch (error) {
      logger.error('发送验证码失败:', error);
      return {
        success: false,
        message: '发送验证码失败，请稍后重试'
      };
    }
  }

  /**
   * 验证验证码
   * @param {string} contact - 联系方式
   * @param {string} code - 用户输入的验证码
   * @returns {Promise<object>} 验证结果
   */
  async verifyCode(contact, code) {
    try {
      const storedCode = this.codeStorage.get(contact);

      if (!storedCode) {
        return {
          success: false,
          message: '验证码不存在或已过期'
        };
      }

      // 检查验证码是否过期
      if (new Date() > storedCode.expireTime) {
        this.codeStorage.delete(contact);
        return {
          success: false,
          message: '验证码已过期，请重新获取'
        };
      }

      // 验证码匹配检查
      if (storedCode.code !== code) {
        return {
          success: false,
          message: '验证码错误'
        };
      }

      // 验证成功，删除已使用的验证码
      this.codeStorage.delete(contact);

      return {
        success: true,
        message: '验证码验证成功'
      };
    } catch (error) {
      logger.error('验证验证码失败:', error);
      return {
        success: false,
        message: '验证失败，请稍后重试'
      };
    }
  }
}

module.exports = new VerificationCodeService();

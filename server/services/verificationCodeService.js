/**
 * 验证码服务
 * 用于生成、发送和验证验证码
 *
 * 邮箱验证码：通过 nodemailer 真正发送邮件
 * 手机验证码：开发环境下模拟发送（日志打印），生产环境需接入短信服务商
 *
 * 验证码存储在 MongoDB VerificationCode 集合中，支持 TTL 自动过期
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');
const { email: emailConfig } = require('../config/serve');
const VerificationCode = require('../modules/VerificationCode');

class VerificationCodeService {
  constructor() {
    // 验证码有效期（5分钟）
    this.codeExpireMs = 5 * 60 * 1000;
    // 邮件发送器（按需初始化）
    this._mailTransporter = null;
  }

  /**
   * 获取邮件发送器（懒加载）
   */
  _getMailTransporter() {
    if (this._mailTransporter) return this._mailTransporter;

    if (!emailConfig.user || !emailConfig.pass) {
      logger.warn('邮件服务未配置（EMAIL_USER / EMAIL_PASS），将使用模拟发送');
      return null;
    }

    this._mailTransporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      }
    });

    logger.info(`邮件服务初始化完成: ${emailConfig.user} (${emailConfig.host}:${emailConfig.port})`);
    return this._mailTransporter;
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
   * 将之前的验证码标记为已使用（软失效，等待 TTL 清理）
   * @param {string} email
   * @param {string} type
   */
  async _invalidatePreviousCodes(email, type) {
    await VerificationCode.updateMany(
      { email, type, isUsed: false },
      { $set: { isUsed: true } }
    );
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
      const expireTime = new Date(Date.now() + this.codeExpireMs);

      // 将同一邮箱同类型的旧验证码标记为已使用
      await this._invalidatePreviousCodes(contact, type);

      // 存储验证码到 MongoDB
      await VerificationCode.create({
        email: contact,
        code,
        type,
        expireTime
      });

      const isEmail = contact.includes('@');

      if (isEmail) {
        await this._sendEmailCode(contact, code, type);
      } else {
        await this._sendPhoneCode(contact, code, type);
      }

      return {
        success: true,
        message: `验证码已发送到${contact}`,
        code // 开发环境返回验证码方便测试，生产环境不应返回
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
   * 发送邮件验证码
   */
  async _sendEmailCode(email, code, type) {
    const typeLabel = type === 'register' ? '注册' : '重置密码';
    const subject = `【EnglishMastery】${typeLabel}验证码`;

    const html = `
      <div style="max-width:600px;margin:0 auto;padding:30px 20px;font-family:'Outfit','Segoe UI',sans-serif;background:#fffdf7;border-radius:16px;border:1px solid rgba(36,49,47,0.08);">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#1f8a70;font-size:24px;margin:0;">EnglishMastery</h1>
          <p style="color:#69736f;font-size:14px;margin:8px 0 0;">英语学习平台</p>
        </div>
        <div style="background:#ffffff;border-radius:12px;padding:24px;">
          <p style="color:#24312f;font-size:15px;line-height:1.6;margin:0 0 16px;">您好！</p>
          <p style="color:#24312f;font-size:15px;line-height:1.6;margin:0 0 16px;">
            您正在进行 <strong>${typeLabel}</strong> 操作，请使用以下验证码：
          </p>
          <div style="text-align:center;margin:24px 0;">
            <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;color:#1f8a70;background:#f0f9f6;padding:16px 32px;border-radius:12px;font-family:monospace;">${code}</span>
          </div>
          <p style="color:#69736f;font-size:13px;line-height:1.6;margin:0;">
            验证码有效期为 <strong>5分钟</strong>，请勿泄露给他人。<br>
            如果您没有进行此操作，请忽略此邮件。
          </p>
        </div>
        <div style="text-align:center;margin-top:20px;">
          <p style="color:#bdc3c7;font-size:12px;margin:0;">此邮件由系统自动发送，请勿回复</p>
        </div>
      </div>
    `;

    const transporter = this._getMailTransporter();

    if (!transporter) {
      // 未配置邮件服务，模拟发送
      logger.info(`[模拟邮件] 验证码 ${code} 已发送到邮箱 ${email}`);
      logger.info(`[模拟邮件] 主题: ${subject}`);
      return;
    }

    const mailOptions = {
      from: `"EnglishMastery" <${emailConfig.user}>`,
      to: email,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`邮件发送成功: ${email}, messageId: ${info.messageId}`);
  }

  /**
   * 发送手机验证码（模拟）
   * 生产环境建议接入：阿里云短信、腾讯云短信、Twilio 等
   */
  async _sendPhoneCode(phone, code, type) {
    const typeLabel = type === 'register' ? '注册' : '重置密码';
    logger.info(`[模拟短信] 验证码 ${code} 已发送到手机号 ${phone}（${typeLabel}）`);
    logger.info(`[模拟短信] 提示：生产环境请接入短信服务商`);
    // 生产环境代码示例（以阿里云短信为例）：
    // const { default: Dyvmsapi } = await import('@alicloud/dyvmsapi');
    // await client.sendSms({ PhoneNumbers: phone, SignName: 'EnglishMastery', TemplateCode: 'SMS_XXXXX', TemplateParam: JSON.stringify({ code }) });
  }

  /**
   * 验证验证码
   * @param {string} contact - 联系方式
   * @param {string} code - 用户输入的验证码
   * @returns {Promise<object>} 验证结果
   */
  async verifyCode(contact, code) {
    try {
      // 从数据库查找未使用且未过期的验证码
      const record = await VerificationCode.findOne({
        email: contact,
        code,
        isUsed: false,
        expireTime: { $gt: new Date() }
      });

      if (!record) {
        // 区分不存在和已过期两种情况
        const expiredRecord = await VerificationCode.findOne({
          email: contact,
          code,
          isUsed: false
        });

        if (expiredRecord) {
          return {
            success: false,
            message: '验证码已过期，请重新获取'
          };
        }

        return {
          success: false,
          message: '验证码不存在或已过期'
        };
      }

      // 验证成功，标记为已使用
      record.isUsed = true;
      await record.save();

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

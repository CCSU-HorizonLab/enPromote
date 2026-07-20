/**
 * 验证码功能测试
 */

const request = require('supertest');
const app = require('../app');
const User = require('../modules/User');
const verificationCodeService = require('../services/verificationCodeService');

describe('验证码功能测试', () => {
  // 清空数据库
  beforeAll(async () => {
    await User.deleteMany({});
  });

  // 测试发送验证码
  test('发送验证码', async () => {
    const response = await request(app)
      .post('/auth/send-code')
      .send({
        contact: 'test@example.com',
        type: 'register'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.code).toBe(200);
    expect(response.body.message).toContain('验证码已发送');

    // 获取生成的验证码（仅用于测试）
    const storedCode = Array.from(verificationCodeService.codeStorage.entries())
      .find(([key]) => key === 'test@example.com');

    if (storedCode) {
      console.log('生成的验证码:', storedCode[1].code);
    }
  });

  // 测试验证验证码
  test('验证验证码', async () => {
    // 先发送验证码
    const sendResponse = await request(app)
      .post('/auth/send-code')
      .send({
        contact: 'test2@example.com',
        type: 'register'
      });

    expect(sendResponse.statusCode).toBe(200);

    // 获取生成的验证码（仅用于测试）
    const storedCode = Array.from(verificationCodeService.codeStorage.entries())
      .find(([key]) => key === 'test2@example.com');

    if (storedCode) {
      const code = storedCode[1].code;
      console.log('获取到的验证码:', code);

      // 使用正确的验证码进行验证
      const verifyResponse = await request(app)
        .post('/auth/verify-code')
        .send({
          contact: 'test2@example.com',
          code: code
        });

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.code).toBe(200);
      expect(verifyResponse.body.message).toBe('验证码验证成功');
    } else {
      // 如果没有找到验证码，测试应该失败
      expect(true).toBe(false); // 强制使测试失败
    }
  });

  // 测试用户注册
  test('用户注册', async () => {
    // 先发送验证码
    const sendResponse = await request(app)
      .post('/auth/send-code')
      .send({
        contact: 'newuser@example.com',
        type: 'register'
      });

    expect(sendResponse.statusCode).toBe(200);

    // 获取生成的验证码（仅用于测试）
    const storedCode = Array.from(verificationCodeService.codeStorage.entries())
      .find(([key]) => key === 'newuser@example.com');

    if (storedCode) {
      const code = storedCode[1].code;
      console.log('注册验证码:', code);

      // 使用正确的验证码进行注册
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'newuser@example.com',
          verificationCode: code
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('注册成功');

      // 检查用户是否已创建
      const user = await User.findOne({ username: 'newuser' });
      expect(user).toBeTruthy();
      expect(user.email).toBe('newuser@example.com');
    } else {
      // 如果没有找到验证码，测试应该失败
      expect(true).toBe(false); // 强制使测试失败
    }
  });

  // 测试忘记密码 - 验证验证码
  test('忘记密码验证', async () => {
    // 先创建一个测试用户
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    const testUser = new User({
      username: 'testuser',
      password: hashedPassword,
      email: 'testuser@example.com'
    });
    await testUser.save();

    // 先发送验证码
    const sendResponse = await request(app)
      .post('/auth/send-code')
      .send({
        contact: 'testuser@example.com',
        type: 'reset'
      });

    expect(sendResponse.statusCode).toBe(200);

    // 获取生成的验证码（仅用于测试）
    const storedCode = Array.from(verificationCodeService.codeStorage.entries())
      .find(([key]) => key === 'testuser@example.com');

    if (storedCode) {
      const code = storedCode[1].code;
      console.log('重置密码验证码:', code);

      // 验证验证码
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          contact: 'testuser@example.com',
          code: code
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.code).toBe(200);
      expect(response.body.message).toBe('验证成功，请设置新密码');
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.contact).toBe('testuser@example.com');
      expect(response.body.data.resetUrl).toBeTruthy();
    } else {
      // 如果没有找到验证码，测试应该失败
      expect(true).toBe(false); // 强制使测试失败
    }
  });
});

module.exports = {};

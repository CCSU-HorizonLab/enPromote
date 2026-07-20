<template>
    <div class="container">
        <div class="form-container">
            <h1>忘记密码</h1>
            <p class="form-description">请输入您注册时使用的邮箱，我们将向您发送验证码以重置密码</p>

            <form @submit.prevent="submitForm">
                <!-- 邮箱 -->
                <div class="form-group">
                    <label for="email">邮箱</label>
                    <div class="input-group">
                        <input
                            type="email"
                            id="email"
                            name="email"
                            v-model="email"
                            placeholder="请输入邮箱"
                            :class="{ 'is-invalid': emailTouched && !emailValid }"
                            @blur="emailTouched = true"
                        >
                        <button
                            type="button"
                            class="btn-send-code"
                            :disabled="contactLoading || !emailValid"
                            @click="sendEmailCode"
                        >
                            {{ emailCountdown > 0 ? `${emailCountdown}秒` : '发送验证码' }}
                        </button>
                    </div>
                    <span v-if="emailTouched && !emailValid" class="error-feedback">
                        邮箱格式不正确
                    </span>
                    <span v-if="emailCodeError" class="error-feedback">
                        {{ emailCodeError }}
                    </span>
                </div>

                <!-- 验证码 -->
                <div class="form-group">
                    <label for="code">验证码</label>
                    <input
                        type="text"
                        id="code"
                        name="code"
                        v-model="code"
                        placeholder="请输入验证码"
                        :class="{ 'is-invalid': codeTouched && !codeValid }"
                        @blur="codeTouched = true"
                        maxlength="6"
                    >
                    <span v-if="codeTouched && !codeValid" class="error-feedback">
                        请输入6位验证码
                    </span>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn-primary" :disabled="loading || !isFormValid">
                        <span class="btn-content">
                            <span v-if="loading" class="spinner"></span>
                            <span>{{ loading ? '验证中...' : '下一步' }}</span>
                        </span>
                    </button>
                </div>
                <div class="form-footer">
                    <p>返回 <router-link to="/login">登录</router-link></p>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from '@/utils/toastService';
import { forgotPasswordVerify, sendEmailCode as apiSendEmailCode } from '@/api/auth';

const router = useRouter();

const email = ref('');
const code = ref('');

// 交互与状态控制
const loading = ref(false);
const contactLoading = ref(false);
const emailTouched = ref(false);
const codeTouched = ref(false);
const emailCodeError = ref('');
const emailCountdown = ref(0);

// 校验规则
const emailValid = computed(() => {
    if (!email.value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
});
const codeValid = computed(() => {
    if (!code.value) return false;
    return /^\d{6}$/.test(code.value);
});

const isFormValid = computed(() => {
    return emailValid.value && codeValid.value;
});

// 发送邮箱验证码
async function sendEmailCode() {
    if (!emailValid.value) {
        emailTouched.value = true;
        return;
    }

    contactLoading.value = true;
    try {
        const res = await apiSendEmailCode(email.value, 'reset');
        if (res.data.code === 200) {
            toast.success('验证码已发送');
            // 开始倒计时
            emailCountdown.value = 60;
            const timer = setInterval(() => {
                emailCountdown.value--;
                if (emailCountdown.value <= 0) {
                    clearInterval(timer);
                }
            }, 1000);
        } else {
            emailCodeError.value = res.data.message;
        }
    } catch (error) {
        console.error('发送验证码失败:', error);
        toast.error('发送验证码失败，请稍后重试');
    } finally {
        contactLoading.value = false;
    }
}

// 提交表单
async function submitForm() {
    if (!isFormValid.value) {
        emailTouched.value = true;
        codeTouched.value = true;
        toast.error('请检查输入信息');
        return;
    }

    loading.value = true;
    try {
        const data = {
            contact: email.value,
            type: 'email',
            code: code.value
        };

        const res = await forgotPasswordVerify(data);
        if (res.data.code === 200) {
            // 验证成功，跳转到重置密码页面
            router.push({
                path: '/reset-password',
                query: { contact: email.value, type: 'email' }
            });
        } else {
            toast.error(res.data.message);
        }
    } catch (error) {
        console.error('验证失败:', error);
        toast.error('验证失败，请稍后重试');
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
@import '../assets/css/auth.css';

/* 表单描述样式 */
.form-description {
    color: #69736f;
    font-size: 14px;
    margin-bottom: 24px;
    text-align: center;
}

/* 验证码按钮样式 */
.btn-send-code {
    padding: 10px 15px;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    color: #333;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-send-code:hover:not(:disabled) {
    background-color: #e0e0e0;
}

.btn-send-code:disabled {
    background-color: #f5f5f5;
    color: #999;
    cursor: not-allowed;
}

/* 确保页面容器样式正确 */
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 70px);
    padding: 40px 20px;
    background:
        radial-gradient(circle at 10% 20%, rgba(240, 164, 58, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(31, 138, 112, 0.08) 0%, transparent 40%),
        linear-gradient(135deg, #fbf8ef 0%, #f7f4ea 100%);
}

/* 确保表单容器样式正确 */
.form-container {
    background-color: #fffdf7;
    border: 1.5px solid rgba(36, 49, 47, 0.08);
    border-radius: 24px;
    box-shadow: 0 20px 50px rgba(36, 49, 47, 0.08);
    padding: 40px 35px;
    width: 100%;
    max-width: 440px;
    position: relative;
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* 输入框 + 按钮组合 */
.input-group {
    display: flex;
    gap: 10px;
    align-items: stretch;
}

.input-group input {
    flex: 1;
}
</style>

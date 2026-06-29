<template>
    <div class="container">
        <div class="form-container">
            <h1>忘记密码</h1>
            <p class="form-description">请输入您注册时使用的手机号或邮箱，我们将向您发送验证码以重置密码</p>

            <form @submit.prevent="submitForm">
                <!-- 联系方式类型 -->
                <div class="form-group">
                    <label>验证方式</label>
                    <div class="contact-type">
                        <label class="radio-label">
                            <input
                                type="radio"
                                name="contactType"
                                value="phone"
                                v-model="contactType"
                                @change="resetContact"
                            >
                            <span class="radio-text">手机号</span>
                        </label>
                        <label class="radio-label">
                            <input
                                type="radio"
                                name="contactType"
                                value="email"
                                v-model="contactType"
                                @change="resetContact"
                            >
                            <span class="radio-text">邮箱</span>
                        </label>
                    </div>
                </div>

                <!-- 联系方式 -->
                <div class="form-group">
                    <label :for="contactType === 'phone' ? 'phone' : 'email'">
                        {{ contactType === 'phone' ? '手机号' : '邮箱' }}
                    </label>
                    <div class="input-group">
                        <input
                            :type="contactType === 'phone' ? 'tel' : 'email'"
                            :id="contactType === 'phone' ? 'phone' : 'email'"
                            :name="contactType === 'phone' ? 'phone' : 'email'"
                            v-model="contact"
                            :placeholder="contactType === 'phone' ? '请输入手机号' : '请输入邮箱'"
                            :class="{ 'is-invalid': contactTouched && !contactValid }"
                            @blur="contactTouched = true"
                        >
                        <button
                            type="button"
                            class="btn-send-code"
                            :disabled="contactLoading || !contactValid"
                            @click="sendCode"
                        >
                            {{ contactCountdown > 0 ? `${contactCountdown}秒` : '发送验证码' }}
                        </button>
                    </div>
                    <span v-if="contactTouched && !contactValid" class="error-feedback">
                        {{ contactType === 'phone' ? '手机号格式不正确' : '邮箱格式不正确' }}
                    </span>
                    <span v-if="contactCodeError" class="error-feedback">
                        {{ contactCodeError }}
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
import { forgotPasswordVerify } from '@/api/auth';

const router = useRouter();

const contactType = ref('phone');
const contact = ref('');
const code = ref('');

// 交互与状态控制
const loading = ref(false);
const contactLoading = ref(false);
const contactTouched = ref(false);
const codeTouched = ref(false);
const contactCodeError = ref('');
const contactCountdown = ref(0);

// 校验规则
const contactValid = computed(() => {
    if (!contact.value) return false;
    if (contactType.value === 'phone') {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(contact.value);
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(contact.value);
    }
});
const codeValid = computed(() => {
    if (!code.value) return false;
    return /^\d{6}$/.test(code.value);
});

const isFormValid = computed(() => {
    return contactValid.value && codeValid.value;
});

// 重置联系方式
function resetContact() {
    contact.value = '';
    code.value = '';
    contactCodeError.value = '';
    contactCountdown.value = 0;
}

// 发送验证码
async function sendCode() {
    if (!contactValid.value) {
        contactTouched.value = true;
        return;
    }

    contactLoading.value = true;
    try {
        // 模拟验证码功能（开发环境）
        if (process.env.NODE_ENV === 'development') {
            console.log('开发环境：模拟验证码功能');
            const mockCode = contactType.value === 'phone' ? '123456' : '654321';
            console.log(`模拟验证码为: ${mockCode}`);
            toast.success(`开发环境验证码: ${mockCode}`);
            
            // 开始倒计时
            contactCountdown.value = 60;
            const timer = setInterval(() => {
                contactCountdown.value--;
                if (contactCountdown.value <= 0) {
                    clearInterval(timer);
                }
            }, 1000);
            return;
        }
        
        // 生产环境正常流程
        const apiFunction = contactType.value === 'phone' 
            ? (await import('@/api/auth')).sendPhoneCode 
            : (await import('@/api/auth')).sendEmailCode;

        const res = await apiFunction(contact.value);
        if (res.data.code === 200) {
            toast.success('验证码已发送');
            // 开始倒计时
            contactCountdown.value = 60;
            const timer = setInterval(() => {
                contactCountdown.value--;
                if (contactCountdown.value <= 0) {
                    clearInterval(timer);
                }
            }, 1000);
        } else {
            contactCodeError.value = res.data.message;
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
        contactTouched.value = true;
        codeTouched.value = true;
        toast.error('请检查输入信息');
        return;
    }

    loading.value = true;
    try {
        const data = {
            contact: contact.value,
            type: contactType.value,
            code: code.value
        };

        const res = await forgotPasswordVerify(data);
        if (res.data.code === 200) {
            // 验证成功，跳转到重置密码页面
            router.push({
                path: '/reset-password',
                query: { contact: contact.value, type: contactType.value }
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

/* 联系方式类型样式 */
.contact-type {
    display: flex;
    gap: 20px;
    margin-bottom: 10px;
}

.radio-label {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.radio-label input[type="radio"] {
    margin-right: 8px;
}

.radio-text {
    font-size: 16px;
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

/* 表单提示样式 */
.form-hint {
    color: #69736f;
    font-size: 14px;
    margin-top: 8px;
    margin-bottom: 20px;
    text-align: center;
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
</style>

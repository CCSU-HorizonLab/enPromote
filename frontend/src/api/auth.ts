import request from '@/utils/request';

// 类型定义
interface LoginData {
    username: string;
    password: string;
}

interface RegisterData {
    username: string;
    password: string;
}

interface ChangeInfoData {
    username?: string;
    password?: string;
    planStudyWords?: number;
    planReviweWords?: number;
    question_completed?: boolean;
    ai_choose_completed?: boolean;
    avatar?: string;
}

interface UploadAvatarResponse {
    code: number;
    message: string;
    data: {
        avatar: string;
    };
}

// 实际的API响应结构（扁平结构）
interface ApiResponse<T = any> {
    code: number;
    message: string;
    [key: string]: any; // 允许其他字段
}

// 用户信息API响应（继承ApiResponse并添加用户字段）
interface UserInfoApiResponse extends ApiResponse {
    username: string;
    creatTime: string;
    avatar: string;
    cet4: {
        position: string;
        lastStudyTime: string;
        learnedWords: number;
        todayStudiedWords: number;
        streakDays: number;
        lastStudyDate: string;
    };
    todayWords: number;
    streakDays: number;
    totalWords: number;
    planStudyWords: number;
    planReviweWords: number;
    question_completed: boolean;
    ai_choose_completed: boolean;
    chapters: {
        [key: string]: {
            level: number;
            score: number;
            completedWords: number;
            wordP: boolean;
            spellP: boolean;
            listenP: boolean;
            customsP: boolean;
            coverP: boolean;
        };
    };
    currentChapter: string;
}

// axios 实际返回的响应结构
interface AxiosApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: any;
}

interface UserInfo {
    username: string;
    creatTime: string;
    avatar: string;
    cet4: {
        position: string;
        lastStudyTime: string;
        learnedWords: number;
        todayStudiedWords: number;
        streakDays: number;
        lastStudyDate: string;
        // 移除冗余的关卡状态字段
    };
    todayWords: number;
    streakDays: number;
    totalWords: number;
    planStudyWords: number;
    planReviweWords: number;
    question_completed: boolean;
    ai_choose_completed: boolean;
    // 统一使用 chapters 管理关卡状态
    chapters: {
        [key: string]: {
            level: number;
            score: number;
            completedWords: number;
            wordP: boolean;
            spellP: boolean;
            listenP: boolean;
            customsP: boolean;
            coverP: boolean;
        };
    };
    currentChapter: string;
    // 添加章节进度字段以支持新的地图组件
    chapterProgress?: {
        [chapterKey: string]: {
            [levelType: string]: string;
        };
    };
    levelProgress?: {
        [key: string]: any;
    };
}

function login(data: LoginData): Promise<AxiosApiResponse> {
    return request.post('/auth/login', data);
}

function register(data: RegisterData): Promise<AxiosApiResponse> {
    return request.post('/auth/register', data);
}

function logout(): Promise<AxiosApiResponse> {
    return request.post('/auth/logout');
}

function getUserInfo(): Promise<AxiosApiResponse<UserInfoApiResponse>> {
    return request.get('/auth/info');
}

function changeInfo(data: ChangeInfoData): Promise<AxiosApiResponse> {
    return request.post('/auth/changeinfo', data);
}

function uploadAvatar(file: File): Promise<AxiosApiResponse<UploadAvatarResponse>> {
    const formData = new FormData();
    formData.append('avatar', file);
    return request.post('/auth/upload-avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
}

function switchChapter(chapter: string): Promise<AxiosApiResponse> {
    return request.post('/auth/switch-chapter', { chapter });
}

// 忘记密码相关API
interface ForgotPasswordData {
    contact: string;
    type: 'phone' | 'email';
    code: string;
}

interface ForgotPasswordResetData {
    contact: string;
    type: 'phone' | 'email';
    password: string;
    confirmPassword: string;
}

function sendPhoneCode(phone: string): Promise<AxiosApiResponse> {
    return request.post('/auth/send-phone-code', { phone });
}

function sendEmailCode(email: string): Promise<AxiosApiResponse> {
    return request.post('/auth/send-email-code', { email });
}

function forgotPasswordVerify(data: ForgotPasswordData): Promise<AxiosApiResponse> {
    return request.post('/auth/forgot-password-verify', data);
}

function forgotPasswordReset(data: ForgotPasswordResetData): Promise<AxiosApiResponse> {
    return request.post('/auth/reset-password', data);
}

export { 
    login, 
    register, 
    logout, 
    getUserInfo, 
    changeInfo, 
    uploadAvatar, 
    switchChapter,
    sendPhoneCode,
    sendEmailCode,
    forgotPasswordVerify,
    forgotPasswordReset
};

export type { 
    LoginData, 
    RegisterData, 
    ChangeInfoData, 
    ApiResponse, 
    AxiosApiResponse, 
    UserInfo, 
    UserInfoApiResponse,
    ForgotPasswordData,
    ForgotPasswordResetData
};
export type { LoginData, RegisterData, ChangeInfoData, ApiResponse, AxiosApiResponse, UserInfo, UserInfoApiResponse };

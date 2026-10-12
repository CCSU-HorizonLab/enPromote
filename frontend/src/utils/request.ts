import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const legacyCodeByApiCode: Record<string, number> = {
    BAD_REQUEST: 400,
    VALIDATION_ERROR: 400,
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

function adaptApiResponse(response: AxiosResponse): void {
    const body = response.data;
    if (!body || typeof body !== 'object' || typeof body.success !== 'boolean' || typeof body.code !== 'string') {
        return;
    }

    let data = body.data;
    let pagination;
    if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.items)) {
        pagination = data.pagination;
        data = data.items;
    }

    response.data = {
        ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
        ...body,
        ...(pagination ? { pagination } : {}),
        apiCode: body.code,
        code: body.success ? 200 : legacyCodeByApiCode[body.code] || response.status || 400,
        data
    };
}

const request: AxiosInstance = axios.create({
    baseURL: '/api', // 所有请求自动添加/api前缀
    timeout: 15000, // 增加超时时间到15秒，给后端调用第三方API留出足够时间
    withCredentials: true, // 确保发送凭证（cookies）
    // 不设置默认的Content-Type，让axios根据请求体自动设置
    // 对于FormData，axios会自动设置正确的Content-Type（包含boundary）
});

// 请求拦截器
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 确保发送凭证（cookies）
    config.withCredentials = true;
    return config;
}, (error: any) => {
    return Promise.reject(error);
});

// 响应拦截器
request.interceptors.response.use((response: AxiosResponse) => {
    adaptApiResponse(response);
    return response;
}, (error: any) => {
    // 401在后端设置的是未登录的错误码
    console.log('error:', error);

    // 检查error.response是否存在，避免访问undefined的属性
    if (error.response) {
        adaptApiResponse(error.response);
    }

    if (error.response && error.response.status === 401) {
        const requestUrl = error.config?.url || '';
        if (requestUrl.includes('/auth/info')) {
            return Promise.reject(error);
        }

        // 防止重复跳转到登录页面
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
            // 如果后端返回了重定向地址，则使用它，否则默认跳转到登录页面
            const redirectUrl = error.response.data?.redirect || '/login';
            window.location.href = redirectUrl;
        }
    } else if (error.code === 'ECONNABORTED') {
        // 处理超时错误
        console.log('请求超时，可能是服务器正在处理较复杂的请求');
    } else if (!error.response) {
        // 网络错误或其他没有响应的错误
        console.log('网络错误或服务器无响应');
    }

    return Promise.reject(error);
});

export default request;

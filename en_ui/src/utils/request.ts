import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const request: AxiosInstance = axios.create({
    baseURL: '/api', // 所有请求自动添加/api前缀
    timeout: 15000, // 增加超时时间到15秒，给后端调用第三方API留出足够时间
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
    },
});

// 请求拦截器
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    return config;
}, (error: any) => {
    return Promise.reject(error);
});

// 响应拦截器
request.interceptors.response.use((response: AxiosResponse) => {
    return response;
}, (error: any) => {
    // 401在后端设置的是未登录的错误码
    console.log('error:', error);

    // 检查error.response是否存在，避免访问undefined的属性
    if (error.response && error.response.status === 401) {
        alert('请先登录')
        // 跳转到登录页面
        window.location.href = error.response.data.redirect;
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

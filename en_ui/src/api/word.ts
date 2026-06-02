import request from '@/utils/request';

interface ApiResponse<T = any> {
    data: {
        code: number;
        message: string;
    } & T;
}

interface WordListParams {
    [key: string]: any;
}

interface WordProgressData {
    [key: string]: any;
}

interface WordInfoParams {
    word: string;
}

interface WordPriorityData {
    [key: string]: any;
}

interface WordAudioParams {
    word: string;
}

// 获取单词列表
function getWordList(params: WordListParams): Promise<ApiResponse> {
    return request({
        url: '/word/getWordList',
        method: 'get',
        params
    });
}

// 更新单词学习进度
function updateWordProgress(data: WordProgressData): Promise<ApiResponse> {
    return request({
        url: '/word/updateWordProgress',
        method: 'post',
        data
    });
}

function getWordInfo(params: WordInfoParams): Promise<ApiResponse> {
    return request({
        url: '/word/getWordInfo',
        method: 'get',
        params
    });
}

// 获取用户单词进度
function getWordProgress(): Promise<ApiResponse> {
    return request.get('/word/getWordProgress');
}

function updateWordPriority(data: WordPriorityData): Promise<ApiResponse> {
    return request({
        url: '/commendWords/updateWordPriority',
        method: 'post',
        data
    });
}

function getReviewWord(): Promise<ApiResponse> {
    return request({
        url: '/commendWords/getReviewWord',
        method: 'get',
    });
}

function getWordAudio(params: WordAudioParams): Promise<ApiResponse> {
    return request({
        url: '/word/getWordAudio',
        method: 'get',
        params
    });
}

export { 
    getWordList, 
    updateWordProgress, 
    getWordInfo, 
    getWordProgress, 
    updateWordPriority, 
    getReviewWord, 
    getWordAudio 
};

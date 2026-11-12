const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../server/.env') });
const { ProxyAgent, fetch, setGlobalDispatcher } = require('undici');

// 配置代理 (确保国内网络可访问 Google API)
const proxyHost = process.env.PROXY_HOST || '127.0.0.1';
const proxyPort = process.env.PROXY_PORT || '7897';
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || `http://${proxyHost}:${proxyPort}`;

try {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
} catch (e) {
  console.warn('[TTS Service] Proxy setup warning:', e.message);
}

const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// 内存音频缓存 (避免相同文本重复调用 API，降低延迟并省流)
const audioCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * 清洗对白文本：去除 markdown 动作说明，保留纯正口语文本与规范的语音事件标签
 */
function sanitizeSpeechText(text) {
  if (!text) return '';
  return text
    // 将括号动作 (sighs) 或 *sighs* 转为标准 gemini inline tag <sigh> 或去除
    .replace(/\*sighs?\*|\(sighs?\)/gi, '<sigh>')
    .replace(/\*laughs?\*|\(laughs?\)/gi, '<laugh>')
    .replace(/\*clears throat\*|\(clears throat\)/gi, '<short pause>')
    .replace(/\*[^*]+\*/g, '') // 去除其余 *action* 提示
    .replace(/\([^)]+\)/g, '') // 去除其余 (action) 提示
    .replace(/["""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 调用 Google gemini-3.8-flash-lite-tts 生成语音
 * @param {Object} options
 * @param {string} options.text - 英文对白文本
 * @param {string} [options.voiceName='Charon'] - Gemini 预设声音名 (e.g. Charon, Aoede, Fenrir, Kore)
 * @returns {Promise<string|null>} 返回 'data:audio/wav;base64,...' 格式的音频 Data URL 或 null
 */
async function generateSpeech({ text, voiceName = 'Charon' }) {
  const cleanText = sanitizeSpeechText(text);
  if (!cleanText) return null;

  if (!API_KEY) {
    console.warn('[TTS Service] GOOGLE_GENERATIVE_AI_API_KEY is missing, TTS skipped.');
    return null;
  }

  const cacheKey = `${voiceName}:${cleanText}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${API_KEY}`;
    const payload = {
      contents: [
        {
          parts: [
            { text: cleanText }
          ]
        }
      ],
      generationConfig: {
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`[TTS Service] API returned status ${res.status}:`, errBody);
      return null;
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const inlineData = part?.inlineData || part?.inline_data;

    if (!inlineData || !inlineData.data) {
      console.warn('[TTS Service] No inline audio data found in response');
      return null;
    }

    const mimeType = inlineData.mimeType || 'audio/wav';
    const audioDataUrl = `data:${mimeType};base64,${inlineData.data}`;

    // 写入缓存控制
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, audioDataUrl);

    return audioDataUrl;
  } catch (error) {
    console.error('[TTS Service] TTS generation error:', error.message);
    return null;
  }
}

module.exports = {
  generateSpeech,
  sanitizeSpeechText,
  TTS_MODEL
};

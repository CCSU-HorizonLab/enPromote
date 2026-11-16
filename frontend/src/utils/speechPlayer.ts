// Shared English playback (free Youdao dictvoice API + browser fallback) and speech-transcription helpers.
import { getWordAudio } from '@/api/word'

let activeAudioElement: HTMLAudioElement | null = null
let activeSpeechKey: string | null = null
const audioUrlCache = new Map<string, string>()

export interface PlaySpeechOptions {
  text: string
  key?: string
  preloadedAudio?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: unknown) => void
}

/**
 * Stop any ongoing audio element or browser speech synthesis playback.
 */
export function stopSpeechPlayback(): void {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause()
      activeAudioElement.currentTime = 0
    } catch {
      // Ignore cleanup errors on detached audio elements
    }
    activeAudioElement = null
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // Ignore browser speech cleanup failures
    }
  }

  activeSpeechKey = null
}

/**
 * Fallback playback via browser Web Speech API when Youdao audio is unavailable.
 */
export function speakWithBrowserSynthesis(
  text: string,
  options: Pick<PlaySpeechOptions, 'key' | 'onStart' | 'onEnd' | 'onError'> = {}
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
    options.onError?.(new Error('Speech synthesis unavailable'))
    return
  }

  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95

    const key = options.key || text
    activeSpeechKey = key
    utterance.onstart = () => options.onStart?.()
    utterance.onend = () => {
      if (activeSpeechKey === key) activeSpeechKey = null
      options.onEnd?.()
    }
    utterance.onerror = (err) => {
      if (activeSpeechKey === key) activeSpeechKey = null
      options.onError?.(err)
    }

    options.onStart?.()
    window.speechSynthesis.speak(utterance)
  } catch (err) {
    activeSpeechKey = null
    options.onError?.(err)
  }
}

/**
 * Play English word or sentence via free Youdao audio (/api/word/getWordAudio),
 * avoiding LLM TTS token consumption on Module A drills.
 */
export async function playSpeechText(options: PlaySpeechOptions): Promise<void> {
  const cleanText = String(options.text || '').trim()
  if (!cleanText) return

  const key = options.key || cleanText

  if (activeSpeechKey === key && activeAudioElement && !activeAudioElement.paused) {
    stopSpeechPlayback()
    options.onEnd?.()
    return
  }

  stopSpeechPlayback()

  // Super long multi-turn paragraphs go straight to browser speech synthesis so URL length stays safe
  if (!options.preloadedAudio && cleanText.length > 220) {
    speakWithBrowserSynthesis(cleanText, {
      key,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError
    })
    return
  }

  let audioUrl = options.preloadedAudio || audioUrlCache.get(cleanText)

  if (!audioUrl) {
    try {
      const response = await getWordAudio({ word: cleanText })
      const fetchedUrl = response?.data?.data
      if (typeof fetchedUrl === 'string' && fetchedUrl.trim()) {
        audioUrl = fetchedUrl.trim()
        audioUrlCache.set(cleanText, audioUrl)
      }
    } catch {
      // Handled by browser synthesis fallback below
    }
  }

  if (!audioUrl) {
    speakWithBrowserSynthesis(cleanText, {
      key,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError
    })
    return
  }

  try {
    const audio = new Audio(audioUrl)
    activeAudioElement = audio
    activeSpeechKey = key

    audio.onended = () => {
      if (activeAudioElement === audio) {
        activeAudioElement = null
        activeSpeechKey = null
      }
      options.onEnd?.()
    }
    audio.onerror = () => {
      if (activeAudioElement === audio) {
        activeAudioElement = null
        activeSpeechKey = null
      }
      speakWithBrowserSynthesis(cleanText, {
        key,
        onStart: options.onStart,
        onEnd: options.onEnd,
        onError: options.onError
      })
    }

    options.onStart?.()
    await audio.play()
  } catch (err) {
    activeAudioElement = null
    activeSpeechKey = null
    speakWithBrowserSynthesis(cleanText, {
      key,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError
    })
    options.onError?.(err)
  }
}

/**
 * Convert recorded Blob into base64 data URI and transcribe via /api/avg-test/transcribe.
 */
export async function transcribeAudioBlob(blob: Blob, mimeType = 'audio/webm'): Promise<string> {
  const base64Audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取录音文件失败'))
    reader.readAsDataURL(blob)
  })

  const response = await fetch('/api/avg-test/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64Audio,
      audioMimeType: mimeType
    })
  })
  const json = await response.json()
  const ok = Boolean(json && (json.success === true || json.code === 200 || json.code === 'SUCCESS'))
  if (!ok || !json?.data?.text) {
    throw new Error(json?.message || '语音未能识别，请再试一次')
  }
  return String(json.data.text).trim()
}

// Shared vocabulary role labels and sentence segmentation helpers for Module A stages 1-3.

export interface CombatRoleMeta {
  label: string
  cls: string
}

const COMBAT_ROLE_MAP: Record<string, CombatRoleMeta> = {
  evidence: { label: '🪪 事实凭证词', cls: 'role-evidence' },
  stance: { label: '🎩 委婉社交招式', cls: 'role-stance' },
  twist_defense: { label: '⚡ 变故反制词', cls: 'role-twist' },
  domain_chunk: { label: '🏨 酒店核心业务词', cls: 'role-domain' }
}

export function getCombatRoleMeta(role?: string): CombatRoleMeta | null {
  if (!role) return null
  return COMBAT_ROLE_MAP[role] || COMBAT_ROLE_MAP.domain_chunk
}

export interface SentenceSegment {
  text: string
  isMatch: boolean
}

/**
 * Safely split a sentence around targetWord without HTML injection.
 */
export function splitSentenceByWord(sentence: string, targetWord: string): SentenceSegment[] {
  const cleanSentence = String(sentence || '').trim()
  const cleanWord = String(targetWord || '').trim()
  if (!cleanSentence) return []
  if (!cleanWord) return [{ text: cleanSentence, isMatch: false }]

  const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi')
  const parts = cleanSentence.split(regex)

  return parts
    .filter(part => part.length > 0)
    .map(part => ({
      text: part,
      isMatch: part.toLowerCase() === cleanWord.toLowerCase()
    }))
}

/**
 * Build a masked cloze sentence by replacing targetWord with underscores.
 */
export function buildMaskedSentence(sentence: string, targetWord: string): string {
  const segments = splitSentenceByWord(sentence, targetWord)
  if (segments.length === 0) return ''
  return segments
    .map(seg => (seg.isMatch ? '________' : seg.text))
    .join('')
}

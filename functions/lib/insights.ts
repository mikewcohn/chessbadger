import { json } from './practice.ts'

export type InsightInput = {
  title: string
  note: string
  pgn: string
  focusPly: number
  boardOrientation: 'white' | 'black'
  side: 'white' | 'black' | 'both'
  tags: string[]
}

export type InsightRow = {
  id: string
  title: string
  note: string
  pgn: string
  focus_ply: number
  board_orientation: 'white' | 'black'
  side: 'white' | 'black' | 'both'
  tags_json: string
  created_at: string
  updated_at: string
}

const cleanTags = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 12) return null
  const tags = value.map((tag) => typeof tag === 'string' ? tag.trim().replace(/\s+/g, ' ') : '')
  if (tags.some((tag) => !tag || tag.length > 40)) return null
  return [...new Set(tags)]
}

export const readInsightInput = (value: unknown): InsightInput | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<InsightInput>
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : ''
  const note = typeof candidate.note === 'string' ? candidate.note.trim() : ''
  const pgn = typeof candidate.pgn === 'string' ? candidate.pgn.trim() : ''
  const tags = cleanTags(candidate.tags)
  const focusPly = candidate.focusPly

  if (!title || title.length > 160 || note.length > 12000 || !pgn || pgn.length > 100000) return null
  if (!Number.isInteger(focusPly) || typeof focusPly !== 'number' || focusPly < 0 || focusPly > 1000) return null
  if (candidate.boardOrientation !== 'white' && candidate.boardOrientation !== 'black') return null
  if (candidate.side !== 'white' && candidate.side !== 'black' && candidate.side !== 'both') return null
  if (!tags) return null

  return {
    title,
    note,
    pgn,
    focusPly,
    boardOrientation: candidate.boardOrientation,
    side: candidate.side,
    tags,
  }
}

const parseTags = (value: string) => {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}

export const insightJson = (row: InsightRow) => ({
  id: row.id,
  title: row.title,
  note: row.note,
  pgn: row.pgn,
  focusPly: row.focus_ply,
  boardOrientation: row.board_orientation,
  side: row.side,
  tags: parseTags(row.tags_json),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const invalidInsight = () => json({ error: 'Check the title, PGN, focus position, and tags.' }, 400)

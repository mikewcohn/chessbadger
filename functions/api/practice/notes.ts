import {
  json,
  readJson,
  puzzleExists,
  type FunctionContext,
} from '../../lib/practice.ts'
import { currentPlayer } from '../../lib/players.ts'

type NoteBody = {
  puzzleId?: string
  note?: string
}

type NoteRow = {
  puzzle_id: string
  note: string
}

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ notes: {} })

  const { results } = await env.DB.prepare(`
    SELECT puzzle_id, note
    FROM puzzle_notes
    WHERE player_id = ?
  `).bind(player.id).all<NoteRow>()

  return json({ notes: Object.fromEntries(results.map((row) => [row.puzzle_id, row.note])) })
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ error: 'Sign in to save puzzle notes across devices.' }, 401)

  const body = await readJson<NoteBody>(request)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Invalid request.' }, 400)
  }

  const puzzleId = typeof body.puzzleId === 'string' ? body.puzzleId.trim() : ''
  const note = typeof body.note === 'string' ? body.note : ''
  if (!puzzleId || puzzleId.length > 200 || note.length > 4096) {
    return json({ error: 'Invalid puzzle note.' }, 400)
  }
  if (!await puzzleExists(env, puzzleId)) return json({ error: 'Invalid puzzle.' }, 400)

  if (note.trim()) {
    await env.DB.prepare(`
      INSERT INTO puzzle_notes (player_id, puzzle_id, note, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id, puzzle_id) DO UPDATE SET
        note = excluded.note,
        updated_at = excluded.updated_at
    `).bind(player.id, puzzleId, note, new Date().toISOString()).run()
  } else {
    await env.DB.prepare(`
      DELETE FROM puzzle_notes
      WHERE player_id = ? AND puzzle_id = ?
    `).bind(player.id, puzzleId).run()
  }

  return json({ note: { puzzleId, note } })
}


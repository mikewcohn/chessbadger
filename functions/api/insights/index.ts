import { insightJson, invalidInsight, readInsightInput, type InsightRow } from '../../lib/insights.ts'
import { json, readJson, type FunctionContext } from '../../lib/practice.ts'
import { currentPlayer } from '../../lib/players.ts'

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ error: 'Sign in to view your insights.' }, 401)

  const { results } = await env.DB.prepare(`
    SELECT id, title, note, pgn, focus_ply, board_orientation, side,
      tags_json, created_at, updated_at
    FROM player_insights
    WHERE player_id = ?
    ORDER BY updated_at DESC, id DESC
  `).bind(player.id).all<InsightRow>()

  return json({ insights: results.map(insightJson) })
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ error: 'Sign in to save an insight.' }, 401)

  const input = readInsightInput(await readJson(request))
  if (!input) return invalidInsight()

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await env.DB.prepare(`
    INSERT INTO player_insights (
      id, player_id, title, note, pgn, focus_ply, board_orientation,
      side, tags_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, player.id, input.title, input.note, input.pgn, input.focusPly,
    input.boardOrientation, input.side, JSON.stringify(input.tags), now, now,
  ).run()

  const row = await env.DB.prepare(`
    SELECT id, title, note, pgn, focus_ply, board_orientation, side,
      tags_json, created_at, updated_at
    FROM player_insights WHERE id = ? AND player_id = ?
  `).bind(id, player.id).first<InsightRow>()

  return json({ insight: insightJson(row!) }, 201)
}

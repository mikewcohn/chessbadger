import { insightJson, invalidInsight, readInsightInput, type InsightRow } from '../../lib/insights.ts'
import { json, readJson, type FunctionContext } from '../../lib/practice.ts'
import { currentPlayer } from '../../lib/players.ts'

type InsightContext = FunctionContext & { params: { id: string } }

const findInsight = (env: FunctionContext['env'], playerId: string, id: string) => env.DB.prepare(`
  SELECT id, title, note, pgn, focus_ply, board_orientation, side,
    tags_json, created_at, updated_at
  FROM player_insights
  WHERE id = ? AND player_id = ?
`).bind(id, playerId).first<InsightRow>()

export const onRequestGet = async ({ request, env, params }: InsightContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ error: 'Sign in to view this insight.' }, 401)
  const row = await findInsight(env, player.id, params.id)
  return row ? json({ insight: insightJson(row) }) : json({ error: 'Insight not found.' }, 404)
}

export const onRequestPut = async ({ request, env, params }: InsightContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ error: 'Sign in to update this insight.' }, 401)
  if (!await findInsight(env, player.id, params.id)) return json({ error: 'Insight not found.' }, 404)

  const input = readInsightInput(await readJson(request))
  if (!input) return invalidInsight()
  const updatedAt = new Date().toISOString()
  await env.DB.prepare(`
    UPDATE player_insights SET
      title = ?, note = ?, pgn = ?, focus_ply = ?, board_orientation = ?,
      side = ?, tags_json = ?, updated_at = ?
    WHERE id = ? AND player_id = ?
  `).bind(
    input.title, input.note, input.pgn, input.focusPly, input.boardOrientation,
    input.side, JSON.stringify(input.tags), updatedAt, params.id, player.id,
  ).run()

  const row = await findInsight(env, player.id, params.id)
  return json({ insight: insightJson(row!) })
}

export const onRequestDelete = async ({ request, env, params }: InsightContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ error: 'Sign in to delete this insight.' }, 401)
  if (!await findInsight(env, player.id, params.id)) return json({ error: 'Insight not found.' }, 404)
  await env.DB.prepare('DELETE FROM player_insights WHERE id = ? AND player_id = ?')
    .bind(params.id, player.id).run()
  return json({ deleted: true })
}

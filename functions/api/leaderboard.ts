import { json, type FunctionContext } from '../lib/practice.ts'

type LeaderboardRange = '7d' | '30d' | 'all'

type LeaderboardRow = {
  handle: string
  slug: string
  solved: number
  first_try: number
  points: number
}

const ranges: Record<Exclude<LeaderboardRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
}

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const requestedRange = new URL(request.url).searchParams.get('range') ?? '7d'
  if (requestedRange !== '7d' && requestedRange !== '30d' && requestedRange !== 'all') {
    return json({ error: 'Invalid leaderboard range.' }, 400)
  }

  const range = requestedRange as LeaderboardRange
  const cutoff = range === 'all'
    ? null
    : new Date(Date.now() - ranges[range] * 24 * 60 * 60 * 1000).toISOString()

  const { results } = await env.DB.prepare(`
    WITH ordered_attempts AS (
      SELECT player_id, puzzle_id, result, checked_at,
        ROW_NUMBER() OVER (
          PARTITION BY player_id, puzzle_id
          ORDER BY checked_at, rowid
        ) AS attempt_number
      FROM practice_attempts
      WHERE player_id IS NOT NULL
    ),
    puzzle_scores AS (
      SELECT player_id, puzzle_id,
        MIN(CASE WHEN result = 'correct' THEN checked_at END) AS solved_at,
        MAX(CASE WHEN attempt_number = 1 AND result = 'correct' THEN 1 ELSE 0 END) AS first_try
      FROM ordered_attempts
      GROUP BY player_id, puzzle_id
      HAVING SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) > 0
    )
    SELECT players.handle, players.normalized_handle AS slug,
      COUNT(*) AS solved,
      SUM(puzzle_scores.first_try) AS first_try,
      COUNT(*) + SUM(puzzle_scores.first_try) AS points
    FROM puzzle_scores
    JOIN players ON players.id = puzzle_scores.player_id
    WHERE ? IS NULL OR puzzle_scores.solved_at >= ?
    GROUP BY players.id, players.handle, players.normalized_handle
    ORDER BY points DESC, first_try DESC, solved DESC, players.normalized_handle
  `).bind(cutoff, cutoff).all<LeaderboardRow>()

  return json({
    range,
    leaders: results.map((row) => ({
      handle: row.handle,
      slug: row.slug,
      solved: row.solved,
      firstTry: row.first_try,
      points: row.points,
    })),
  })
}

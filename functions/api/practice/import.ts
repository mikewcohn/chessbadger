import {
  json,
  readJson,
  type AttemptResult,
  type FunctionContext,
  type StoredAttempt,
} from '../../lib/practice.ts'
import {currentPlayer} from '../../lib/players.ts'

type ImportedAttempt = {
  id?: string
  puzzleId?: string
  move?: string
  result?: AttemptResult
  checkedAt?: string
  sessionId?: string
  durationMs?: number
  pauseCount?: number
  restartCount?: number
}

type ImportBody = { attempts?: ImportedAttempt[] }
type PuzzleRow = { id: string; title: string | null }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SESSION_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/

const validCounter = (value: unknown, maximum: number) => (
  value === undefined
  || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum)
)

const normalizeAttempt = (attempt: ImportedAttempt): Omit<StoredAttempt, 'puzzleTitle'> | null => {
  const id = typeof attempt.id === 'string' ? attempt.id.trim() : ''
  const puzzleId = typeof attempt.puzzleId === 'string' ? attempt.puzzleId.trim() : ''
  const move = typeof attempt.move === 'string' ? attempt.move.trim() : ''
  const checkedAt = typeof attempt.checkedAt === 'string' ? attempt.checkedAt.trim() : ''
  const sessionId = typeof attempt.sessionId === 'string' ? attempt.sessionId.trim() : undefined
  const checkedAtTime = Date.parse(checkedAt)
  const latestAllowedTime = Date.now() + 5 * 60 * 1000

  if (!UUID_PATTERN.test(id) || !puzzleId || puzzleId.length > 200) return null
  if (!move || move.length > 4096) return null
  if (attempt.result !== 'correct' && attempt.result !== 'incorrect' && attempt.result !== 'answer-viewed') return null
  if (!Number.isFinite(checkedAtTime) || checkedAtTime > latestAllowedTime) return null
  if (sessionId !== undefined && !SESSION_PATTERN.test(sessionId)) return null
  if (!validCounter(attempt.durationMs, 86_400_000)) return null
  if (!validCounter(attempt.pauseCount, 1000) || !validCounter(attempt.restartCount, 1000)) return null

  return {
    id,
    puzzleId,
    move,
    result: attempt.result,
    checkedAt: new Date(checkedAtTime).toISOString(),
    ...(sessionId ? {sessionId} : {}),
    ...(attempt.durationMs === undefined ? {} : {durationMs: attempt.durationMs}),
    ...(attempt.pauseCount === undefined ? {} : {pauseCount: attempt.pauseCount}),
    ...(attempt.restartCount === undefined ? {} : {restartCount: attempt.restartCount}),
  }
}

export const onRequestPost = async ({request, env}: FunctionContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({error: 'Sign in to save puzzle progress.'}, 401)

  const body = await readJson<ImportBody>(request)
  if (!body || !Array.isArray(body.attempts) || body.attempts.length < 1 || body.attempts.length > 100) {
    return json({error: 'Import between 1 and 100 puzzle attempts.'}, 400)
  }

  const normalized = body.attempts.map(normalizeAttempt)
  if (normalized.some((attempt) => attempt === null)) {
    return json({error: 'One or more puzzle attempts are invalid.'}, 400)
  }

  const uniqueAttempts = [...new Map(
    normalized.map((attempt) => [attempt!.id, attempt!]),
  ).values()]
  const puzzleIds = [...new Set(uniqueAttempts.map((attempt) => attempt.puzzleId))]
  const placeholders = puzzleIds.map(() => '?').join(', ')
  const {results: puzzleRows} = await env.DB.prepare(`
    SELECT id, json_extract(definition_json, '$.title') AS title
    FROM puzzles
    WHERE id IN (${placeholders})
  `).bind(...puzzleIds).all<PuzzleRow>()
  const puzzlesById = new Map(puzzleRows.map((row) => [row.id, row]))

  if (puzzlesById.size !== puzzleIds.length) {
    return json({error: 'One or more puzzles no longer exist.'}, 400)
  }

  const statements = uniqueAttempts.map((attempt) => env.DB.prepare(`
    INSERT OR IGNORE INTO practice_attempts (
      id, puzzle_id, puzzle_title, move, result, checked_at,
      duration_ms, pause_count, restart_count, player_id, session_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    attempt.id,
    attempt.puzzleId,
    puzzlesById.get(attempt.puzzleId)?.title ?? 'Puzzle',
    attempt.move,
    attempt.result,
    attempt.checkedAt,
    attempt.durationMs ?? null,
    attempt.pauseCount ?? null,
    attempt.restartCount ?? null,
    player.id,
    attempt.sessionId ?? null,
  ))
  const results = await env.DB.batch(statements)
  const imported = results.reduce(
    (total, result) => total + (result.meta?.changes ?? result.changes ?? 0),
    0,
  )

  return json({
    imported,
    alreadySaved: uniqueAttempts.length - imported,
    acceptedIds: uniqueAttempts.map((attempt) => attempt.id),
  })
}

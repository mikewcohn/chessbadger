export type AttemptResult = 'correct' | 'incorrect' | 'answer-viewed'

export type StoredAttempt = {
  id: string
  puzzleId: string
  puzzleTitle: string
  move: string
  result: AttemptResult
  checkedAt: string
  durationMs?: number
  pauseCount?: number
  restartCount?: number
}

export type PracticeRecord = {
  attempts: StoredAttempt[]
}

type D1Statement = {
  bind(...values: (string | number | null)[]): D1Statement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

export type PracticeEnv = {
  DB: { prepare(query: string): D1Statement }
}

export type FunctionContext = {
  request: Request
  env: PracticeEnv
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })

export const readJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return await request.json() as T
  } catch {
    return null
  }
}

type AttemptRow = {
  id: string
  puzzle_id: string
  puzzle_title: string
  move: string
  result: AttemptResult
  checked_at: string
  duration_ms: number | null
  pause_count: number | null
  restart_count: number | null
}

export const readPractice = async (env: PracticeEnv): Promise<PracticeRecord> => {
  const { results } = await env.DB.prepare(`
    SELECT id, puzzle_id, puzzle_title, move, result, checked_at,
      duration_ms, pause_count, restart_count
    FROM practice_attempts
    ORDER BY checked_at DESC, rowid DESC
    LIMIT 1000
  `).all<AttemptRow>()

  return {
    attempts: results.reverse().map((row) => ({
      id: row.id,
      puzzleId: row.puzzle_id,
      puzzleTitle: row.puzzle_title,
      move: row.move,
      result: row.result,
      checkedAt: row.checked_at,
      ...(row.duration_ms === null ? {} : { durationMs: row.duration_ms }),
      ...(row.pause_count === null ? {} : { pauseCount: row.pause_count }),
      ...(row.restart_count === null ? {} : { restartCount: row.restart_count }),
    })),
  }
}

export const puzzleExists = async (env: PracticeEnv, puzzleId: string): Promise<boolean> =>
  (await env.DB.prepare('SELECT id FROM puzzles WHERE id = ?').bind(puzzleId).first()) !== null

export const appendAttempt = (env: PracticeEnv, attempt: StoredAttempt) =>
  env.DB.prepare(`
    INSERT INTO practice_attempts (
      id, puzzle_id, puzzle_title, move, result, checked_at,
      duration_ms, pause_count, restart_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    attempt.id, attempt.puzzleId, attempt.puzzleTitle, attempt.move,
    attempt.result, attempt.checkedAt, attempt.durationMs ?? null,
    attempt.pauseCount ?? null, attempt.restartCount ?? null,
  ).run()

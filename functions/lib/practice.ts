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

type JsonKVNamespace = {
  get<T>(key: string, type: 'json'): Promise<T | null>
  put(key: string, value: string): Promise<void>
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>
  delete(key: string): Promise<void>
}

export type PracticeEnv = {
  PUZZLE_ATTEMPTS: JsonKVNamespace
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

const PRACTICE_KEY = 'practice:current'

export const readPractice = async (env: PracticeEnv) =>
  (await env.PUZZLE_ATTEMPTS.get<PracticeRecord>(PRACTICE_KEY, 'json')) ?? { attempts: [] }

export const writePractice = (env: PracticeEnv, practice: PracticeRecord) =>
  env.PUZZLE_ATTEMPTS.put(PRACTICE_KEY, JSON.stringify(practice))

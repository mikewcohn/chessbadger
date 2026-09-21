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

export type StudentRecord = {
  id: string
  name: string
  practiceKey: string
  resultsKey?: string
  createdAt: string
  attempts: StoredAttempt[]
}

type JsonKVNamespace = {
  get<T>(key: string, type: 'json'): Promise<T | null>
  put(key: string, value: string): Promise<void>
  list(options: { prefix: string }): Promise<{ keys: Array<{ name: string }> }>
}

export type PracticeEnv = {
  PUZZLE_ATTEMPTS: JsonKVNamespace
  COACH_ACCESS_TOKEN?: string
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

export const studentKey = (id: string) => `student:${id}`

export const readStudent = (env: PracticeEnv, id: string) =>
  env.PUZZLE_ATTEMPTS.get<StudentRecord>(studentKey(id), 'json')

export const writeStudent = (env: PracticeEnv, student: StudentRecord) =>
  env.PUZZLE_ATTEMPTS.put(studentKey(student.id), JSON.stringify(student))

export const readStudentIds = async (env: PracticeEnv) => {
  const result = await env.PUZZLE_ATTEMPTS.list({ prefix: 'student:' })
  return result.keys.map(({ name }) => name.slice('student:'.length))
}

const digest = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
}

export const secureEqual = async (left: string, right: string) => {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)])
  if (leftDigest.length !== rightDigest.length) return false

  let difference = 0
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index]
  }
  return difference === 0
}

export const isCoach = async (env: PracticeEnv, suppliedToken: string) => {
  const configuredToken = env.COACH_ACCESS_TOKEN?.trim()
  if (!configuredToken || configuredToken.length < 16) return false
  return secureEqual(configuredToken, suppliedToken)
}

export const createSecret = () =>
  `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`

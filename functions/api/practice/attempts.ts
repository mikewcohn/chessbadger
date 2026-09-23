import {
  json,
  readPractice,
  readJson,
  appendAttempt,
  puzzleExists,
  type AttemptResult,
  type FunctionContext,
  type StoredAttempt,
} from '../../lib/practice.ts'

type SaveAttemptBody = {
  puzzleId?: string
  puzzleTitle?: string
  move?: string
  result?: AttemptResult
  durationMs?: number
  pauseCount?: number
  restartCount?: number
}

export const onRequestGet = async ({ env }: FunctionContext) => {
  const practice = await readPractice(env)
  return json({ attempts: practice.attempts })
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const body = await readJson<SaveAttemptBody>(request)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request.' }, 400)

  const puzzleId = typeof body.puzzleId === 'string' ? body.puzzleId.trim() : ''
  const puzzleTitle = typeof body.puzzleTitle === 'string' ? body.puzzleTitle.trim() : ''
  const move = typeof body.move === 'string' ? body.move.trim() : ''
  const result = body.result
  const durationMs = body.durationMs
  const pauseCount = body.pauseCount
  const restartCount = body.restartCount
  if (!puzzleId || puzzleId.length > 200 || puzzleTitle.length > 100) {
    return json({ error: 'Invalid puzzle.' }, 400)
  }
  // An attempt can contain a full multi-ply line or multiple composition answers.
  if (move.length < 1 || move.length > 4096) {
    return json({ error: 'Invalid move.' }, 400)
  }
  if (result !== 'correct' && result !== 'incorrect' && result !== 'answer-viewed') {
    return json({ error: 'Invalid result.' }, 400)
  }
  if (typeof durationMs !== 'number' || !Number.isInteger(durationMs) || durationMs < 0 || durationMs > 86_400_000) {
    return json({ error: 'Invalid puzzle duration.' }, 400)
  }
  if (typeof pauseCount !== 'number' || !Number.isInteger(pauseCount) || pauseCount < 0 || pauseCount > 1000) {
    return json({ error: 'Invalid pause count.' }, 400)
  }
  if (typeof restartCount !== 'number' || !Number.isInteger(restartCount) || restartCount < 0 || restartCount > 1000) {
    return json({ error: 'Invalid restart count.' }, 400)
  }

  if (!await puzzleExists(env, puzzleId)) {
    return json({ error: 'Invalid puzzle.' }, 400)
  }

  const attempt: StoredAttempt = {
    id: crypto.randomUUID(),
    puzzleId,
    puzzleTitle,
    move,
    result,
    checkedAt: new Date().toISOString(),
    durationMs,
    pauseCount,
    restartCount,
  }

  await appendAttempt(env, attempt)

  return json({ attempt }, 201)
}

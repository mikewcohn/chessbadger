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
import { currentPlayer } from '../../lib/players.ts'

type SaveAttemptBody = {
  puzzleId?: string
  puzzleTitle?: string
  move?: string
  result?: AttemptResult
  durationMs?: number
  pauseCount?: number
  restartCount?: number
  sessionId?: string
}

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ attempts: [] })
  const practice = await readPractice(env, player.id)
  return json({ attempts: practice.attempts })
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const player = await currentPlayer(env, request)
  if (!player) return json({ error: 'Sign in to save puzzle progress.' }, 401)
  const body = await readJson<SaveAttemptBody>(request)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request.' }, 400)

  const puzzleId = typeof body.puzzleId === 'string' ? body.puzzleId.trim() : ''
  const puzzleTitle = typeof body.puzzleTitle === 'string' ? body.puzzleTitle.trim() : ''
  const move = typeof body.move === 'string' ? body.move.trim() : ''
  const result = body.result
  const durationMs = body.durationMs
  const pauseCount = body.pauseCount
  const restartCount = body.restartCount
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : undefined
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
  if (sessionId !== undefined && !/^[a-zA-Z0-9_-]{1,100}$/.test(sessionId)) {
    return json({ error: 'Invalid practice session.' }, 400)
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
    ...(sessionId ? { sessionId } : {}),
  }

  await appendAttempt(env, player.id, attempt)

  return json({ attempt }, 201)
}

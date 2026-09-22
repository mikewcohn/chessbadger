import {
  json,
  readPractice,
  readJson,
  writePractice,
  type AttemptResult,
  type FunctionContext,
  type StoredAttempt,
} from '../../lib/practice'

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
  if (!body) return json({ error: 'Invalid request.' }, 400)

  const puzzleId = body.puzzleId?.trim() ?? ''
  const puzzleTitle = body.puzzleTitle?.trim() ?? ''
  const move = body.move?.trim() ?? ''
  const result = body.result
  const durationMs = body.durationMs
  const pauseCount = body.pauseCount
  const restartCount = body.restartCount
  if (!/^(?:page-\d+-puzzle-\d+|polgar-puzzle-\d+)$/.test(puzzleId) || puzzleTitle.length > 100) {
    return json({ error: 'Invalid puzzle.' }, 400)
  }
  if (move.length < 1 || move.length > 24) {
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

  const practice = await readPractice(env)
  practice.attempts = [...practice.attempts, attempt].slice(-1000)
  await writePractice(env, practice)

  return json({ attempt }, 201)
}

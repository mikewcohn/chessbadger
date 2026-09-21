import {
  json,
  readJson,
  readStudent,
  secureEqual,
  writeStudent,
  type AttemptResult,
  type FunctionContext,
  type StoredAttempt,
} from '../../lib/practice'

type SaveAttemptBody = {
  studentId?: string
  practiceKey?: string
  puzzleId?: string
  puzzleTitle?: string
  move?: string
  result?: AttemptResult
  durationMs?: number
  pauseCount?: number
  restartCount?: number
}

const authenticateStudent = async (
  env: FunctionContext['env'],
  studentId: string,
  practiceKey: string,
) => {
  const student = await readStudent(env, studentId)
  if (!student || !(await secureEqual(student.practiceKey, practiceKey))) return null
  return student
}

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const url = new URL(request.url)
  const studentId = url.searchParams.get('student') ?? ''
  const practiceKey = url.searchParams.get('key') ?? ''
  const student = await authenticateStudent(env, studentId, practiceKey)

  if (!student) return json({ error: 'Invalid student link.' }, 401)

  return json({
    student: {
      id: student.id,
      name: student.name,
      attempts: student.attempts,
    },
  })
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const body = await readJson<SaveAttemptBody>(request)
  if (!body) return json({ error: 'Invalid request.' }, 400)

  const studentId = body.studentId?.trim() ?? ''
  const practiceKey = body.practiceKey?.trim() ?? ''
  const puzzleId = body.puzzleId?.trim() ?? ''
  const puzzleTitle = body.puzzleTitle?.trim() ?? ''
  const move = body.move?.trim() ?? ''
  const result = body.result
  const durationMs = body.durationMs
  const pauseCount = body.pauseCount
  const restartCount = body.restartCount
  const student = await authenticateStudent(env, studentId, practiceKey)

  if (!student) return json({ error: 'Invalid student link.' }, 401)
  if (!/^page-\d+-puzzle-\d+$/.test(puzzleId) || puzzleTitle.length > 100) {
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

  student.attempts = [...student.attempts, attempt].slice(-1000)
  await writeStudent(env, student)

  return json({ attempt }, 201)
}

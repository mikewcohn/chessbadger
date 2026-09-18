import {
  createSecret,
  isCoach,
  json,
  readJson,
  readStudent,
  readStudentIds,
  writeStudent,
  type FunctionContext,
  type StudentRecord,
} from '../../lib/practice'

type CreateStudentBody = {
  coachToken?: string
  name?: string
}

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const url = new URL(request.url)
  const coachToken = url.searchParams.get('token') ?? ''

  if (!(await isCoach(env, coachToken))) {
    return json({ error: 'Invalid coach link.' }, 401)
  }

  const ids = await readStudentIds(env)
  const students = await Promise.all(ids.map((id) => readStudent(env, id)))

  return json({ students: students.filter((student) => student !== null) })
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const body = await readJson<CreateStudentBody>(request)
  const coachToken = body?.coachToken?.trim() ?? ''
  const name = body?.name?.trim() ?? ''

  if (!(await isCoach(env, coachToken))) {
    return json({ error: 'Invalid coach link.' }, 401)
  }
  if (name.length < 1 || name.length > 80) {
    return json({ error: 'Enter a student name between 1 and 80 characters.' }, 400)
  }

  const student: StudentRecord = {
    id: crypto.randomUUID(),
    name,
    practiceKey: createSecret(),
    createdAt: new Date().toISOString(),
    attempts: [],
  }

  await writeStudent(env, student)

  const origin = new URL(request.url).origin
  return json({
    student,
    practiceUrl: `${origin}/puzzles/steps-2-workbook?student=${encodeURIComponent(student.id)}&key=${encodeURIComponent(student.practiceKey)}`,
  }, 201)
}

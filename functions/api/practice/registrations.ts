import {
  createSecret,
  json,
  readJson,
  writeStudent,
  type FunctionContext,
  type StudentRecord,
} from '../../lib/practice'

type CreateRegistrationBody = {
  name?: string
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const body = await readJson<CreateRegistrationBody>(request)
  const name = body?.name?.trim() ?? ''

  if (name.length < 1 || name.length > 80) {
    return json({ error: 'Enter your name using between 1 and 80 characters.' }, 400)
  }

  const resultsKey = createSecret()
  const student: StudentRecord = {
    id: crypto.randomUUID(),
    name,
    practiceKey: createSecret(),
    resultsKey,
    createdAt: new Date().toISOString(),
    attempts: [],
  }

  await writeStudent(env, student)

  const origin = new URL(request.url).origin
  const studentId = encodeURIComponent(student.id)

  return json({
    name: student.name,
    practiceUrl: `${origin}/puzzles/steps-2-workbook?student=${studentId}&key=${encodeURIComponent(student.practiceKey)}`,
    resultsUrl: `${origin}/progress?student=${studentId}&key=${encodeURIComponent(resultsKey)}`,
  }, 201)
}

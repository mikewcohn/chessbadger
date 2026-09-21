import {
  json,
  readStudent,
  secureEqual,
  type FunctionContext,
} from '../../lib/practice'

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const url = new URL(request.url)
  const studentId = url.searchParams.get('student') ?? ''
  const resultsKey = url.searchParams.get('key') ?? ''
  const student = await readStudent(env, studentId)

  if (!student?.resultsKey || !(await secureEqual(student.resultsKey, resultsKey))) {
    return json({ error: 'Invalid results link.' }, 401)
  }

  return json({
    student: {
      name: student.name,
      createdAt: student.createdAt,
      attempts: student.attempts,
    },
  })
}

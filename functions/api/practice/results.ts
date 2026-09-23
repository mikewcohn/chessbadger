import {
  json,
  readPractice,
  type FunctionContext,
} from '../../lib/practice.ts'

export const onRequestGet = async ({ env }: FunctionContext) => {
  const practice = await readPractice(env)
  return json({ attempts: practice.attempts })
}

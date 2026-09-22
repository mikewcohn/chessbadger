import {
  json,
  readPractice,
  type FunctionContext,
} from '../../lib/practice'

export const onRequestGet = async ({ env }: FunctionContext) => {
  const practice = await readPractice(env)
  return json({ attempts: practice.attempts })
}

import { json } from '../../lib/practice.ts'
import { clearSession, type PlayerFunctionContext } from '../../lib/players.ts'

export const onRequestPost = async ({ request, env }: PlayerFunctionContext) => {
  const response = json({ player: null })
  response.headers.set('set-cookie', await clearSession(env, request))
  return response
}

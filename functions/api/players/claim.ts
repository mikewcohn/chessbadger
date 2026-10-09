import { json } from '../../lib/practice.ts'
import {
  consumeClaimAttempt,
  createPlayer,
  createSession,
  invalidCredentials,
  playerJson,
  readCredentials,
  tooManyAttempts,
  type PlayerFunctionContext,
} from '../../lib/players.ts'

export const onRequestPost = async ({ request, env }: PlayerFunctionContext) => {
  const credentials = await readCredentials(request, 8)
  if (!credentials) return invalidCredentials(8)
  const retryAfter = await consumeClaimAttempt(env, request)
  if (retryAfter) return tooManyAttempts(retryAfter)
  try {
    const player = await createPlayer(env, credentials)
    const response = json({ player: playerJson(player) }, 201)
    response.headers.set('set-cookie', await createSession(env, request, player.id))
    return response
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) {
      return json({ error: 'That name has already been claimed.' }, 409)
    }
    throw error
  }
}

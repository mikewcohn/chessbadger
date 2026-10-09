import { json } from '../../lib/practice.ts'
import {
  authenticatePlayer,
  clearFailedLogin,
  createSession,
  invalidCredentials,
  loginRetryAfter,
  playerJson,
  readCredentials,
  recordFailedLogin,
  tooManyAttempts,
  type PlayerFunctionContext,
} from '../../lib/players.ts'

export const onRequestPost = async ({ request, env }: PlayerFunctionContext) => {
  const credentials = await readCredentials(request)
  if (!credentials) return invalidCredentials()
  const retryAfter = await loginRetryAfter(env, request, credentials.slug)
  if (retryAfter) return tooManyAttempts(retryAfter)
  const player = await authenticatePlayer(env, credentials)
  if (!player) {
    await recordFailedLogin(env, request, credentials.slug)
    return json({ error: 'That name and passphrase do not match.' }, 401)
  }
  await clearFailedLogin(env, request, credentials.slug)
  const response = json({ player: playerJson(player) })
  response.headers.set('set-cookie', await createSession(env, request, player.id))
  return response
}

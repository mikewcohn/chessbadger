import { json } from '../../lib/practice.ts'
import { authenticatePlayer, createSession, invalidCredentials, playerJson, readCredentials, type PlayerFunctionContext } from '../../lib/players.ts'

export const onRequestPost = async ({ request, env }: PlayerFunctionContext) => {
  const credentials = await readCredentials(request)
  if (!credentials) return invalidCredentials()
  const player = await authenticatePlayer(env, credentials)
  if (!player) return json({ error: 'That name and PIN do not match.' }, 401)
  const response = json({ player: playerJson(player) })
  response.headers.set('set-cookie', await createSession(env, request, player.id))
  return response
}

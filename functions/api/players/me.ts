import { json } from '../../lib/practice.ts'
import { currentPlayer, playerJson, type PlayerFunctionContext } from '../../lib/players.ts'

export const onRequestGet = async ({ request, env }: PlayerFunctionContext) => {
  const player = await currentPlayer(env, request)
  return json({ player: player ? playerJson(player) : null })
}

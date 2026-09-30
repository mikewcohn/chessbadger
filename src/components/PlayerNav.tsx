import { useEffect, useState } from 'react'

type Player = { handle: string; slug: string }

export default function PlayerNav() {
  const [player, setPlayer] = useState<Player | null>(null)

  useEffect(() => {
    void fetch('/api/players/me')
      .then((response) => response.json() as Promise<{ player: Player | null }>)
      .then((data) => setPlayer(data.player))
      .catch(() => setPlayer(null))
  }, [])

  return (
    <a
      className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 transition hover:border-amber-700 hover:text-amber-900"
      href={player ? `/players/${player.slug}` : '/players'}
    >
      {player?.handle ?? 'Sign in'}
    </a>
  )
}

import { useEffect, useMemo, useState } from 'react'

type LeaderboardRange = '7d' | '30d' | 'all'
type SortKey = 'points' | 'solved' | 'firstTry'

type Leader = {
  handle: string
  slug: string
  points: number
  solved: number
  firstTry: number
}

const rangeOptions: Array<{ value: LeaderboardRange; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

const columns: Array<{ key: SortKey; label: string }> = [
  { key: 'points', label: 'Points' },
  { key: 'solved', label: 'Solved' },
  { key: 'firstTry', label: 'First try' },
]

export default function Leaderboard() {
  const [range, setRange] = useState<LeaderboardRange>('7d')
  const [sortKey, setSortKey] = useState<SortKey>('points')
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    void fetch(`/api/leaderboard?range=${range}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { leaders?: Leader[]; error?: string }
        if (!response.ok || !data.leaders) throw new Error(data.error ?? 'Could not load the leaderboard.')
        setLeaders(data.leaders)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'Could not load the leaderboard.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [range, reloadToken])

  const rankedLeaders = useMemo(() => {
    const sorted = leaders.toSorted((left, right) =>
      right[sortKey] - left[sortKey]
        || right.points - left.points
        || right.firstTry - left.firstTry
        || right.solved - left.solved
        || left.handle.localeCompare(right.handle))
    const firstRankByValue = new Map<number, number>()
    return sorted.map((leader, index) => {
      const value = leader[sortKey]
      if (!firstRankByValue.has(value)) firstRankByValue.set(value, index + 1)
      return { ...leader, rank: firstRankByValue.get(value)! }
    })
  }, [leaders, sortKey])

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap gap-1.5 sm:gap-2" aria-label="Leaderboard time range">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              aria-pressed={range === option.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-[13px] font-bold transition sm:px-3.5 sm:text-sm ${range === option.value ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-amber-700 hover:text-amber-900'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="px-5 py-10 text-center sm:px-7">
          <p className="font-bold text-rose-800">{error}</p>
          <button type="button" onClick={() => setReloadToken((current) => current + 1)} className="mt-3 cursor-pointer text-sm font-bold text-amber-900 underline decoration-2 underline-offset-2">Try again</button>
        </div>
      ) : loading ? (
        <div className="grid gap-3 px-5 py-6 sm:px-7" aria-label="Loading leaderboard">
          {[0, 1, 2].map((row) => <span key={row} className="block h-12 animate-pulse rounded-lg bg-stone-100" />)}
        </div>
      ) : rankedLeaders.length === 0 ? (
        <div className="px-5 py-12 text-center sm:px-7">
          <p className="text-lg font-bold text-stone-900">No puzzles have been solved in this period yet.</p>
          <a href="/puzzles" className="mt-4 inline-flex rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700">Do a puzzle</a>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="bg-stone-50 text-sm text-stone-600">
              <tr>
                <th scope="col" className="w-14 px-3 py-3 text-xs font-bold sm:w-20 sm:px-7 sm:text-sm">Rank</th>
                <th scope="col" className="px-2 py-3 text-xs font-bold sm:px-3 sm:text-sm">Player</th>
                {columns.map((column) => (
                  <th key={column.key} scope="col" aria-sort={sortKey === column.key ? 'descending' : 'none'} className="w-16 px-1 py-3 text-right text-xs font-bold sm:w-24 sm:px-3 sm:text-sm">
                    <button type="button" onClick={() => setSortKey(column.key)} className="inline-flex cursor-pointer items-center gap-1 hover:text-amber-900 sm:gap-1.5">
                      {column.label}
                      {sortKey === column.key ? <span aria-hidden="true">↓</span> : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {rankedLeaders.map((leader) => (
                  <tr key={leader.slug} className="hover:bg-amber-50/40">
                    <td className="px-3 py-4 text-lg font-black text-stone-500 sm:px-7">{leader.rank}</td>
                    <th scope="row" className="min-w-0 px-2 py-4 sm:px-3">
                      <a href={`/players/${leader.slug}`} className="block truncate font-bold text-stone-950 hover:text-amber-800">{leader.handle}</a>
                    </th>
                    <td className="px-1 py-4 text-right text-lg font-black text-amber-900 sm:px-3">{leader.points}</td>
                    <td className="px-1 py-4 text-right font-bold text-stone-800 sm:px-3">{leader.solved}</td>
                    <td className="px-1 py-4 text-right font-bold text-emerald-800 sm:px-3">{leader.firstTry}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 text-sm leading-relaxed text-stone-600 sm:px-7">
        A puzzle earns 2 points when solved on the first try and 1 point after a retry. Only its first successful solve counts.
      </div>
    </div>
  )
}

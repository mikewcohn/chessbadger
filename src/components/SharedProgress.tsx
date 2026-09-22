import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDuration } from '../hooks/usePuzzleTimer'

type Attempt = {
  id: string
  puzzleId: string
  puzzleTitle: string
  move: string
  result: 'correct' | 'incorrect' | 'answer-viewed'
  checkedAt: string
  durationMs?: number
  pauseCount?: number
  restartCount?: number
}

export default function SharedProgress() {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadResults = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/practice/results')
      const data = await response.json() as { attempts?: Attempt[]; error?: string }
      if (!response.ok || !data.attempts) throw new Error(data.error ?? 'Could not load results.')
      setAttempts(data.attempts)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load results.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadResults()
  }, [loadResults])

  const summary = useMemo(() => {
    const attemptsByPuzzle = new Map<string, Attempt[]>()
    for (const attempt of attempts) {
      attemptsByPuzzle.set(attempt.puzzleId, [
        ...(attemptsByPuzzle.get(attempt.puzzleId) ?? []),
        attempt,
      ])
    }

    let solved = 0
    let missed = 0
    for (const puzzleAttempts of attemptsByPuzzle.values()) {
      if (puzzleAttempts.some((attempt) => attempt.result === 'correct')) solved += 1
      else if (puzzleAttempts.some((attempt) => attempt.result !== 'correct')) missed += 1
    }

    return { attempted: attemptsByPuzzle.size, solved, missed }
  }, [attempts])

  if (loading) {
    return <p className="rounded-3xl border border-stone-200 bg-white p-8 text-stone-600">Loading results…</p>
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-white p-8">
        <h2 className="text-2xl font-bold text-stone-950">Results unavailable</h2>
        <p className="mt-2 text-rose-800">{error}</p>
      </section>
    )
  }

  const newestAttempts = attempts.toReversed()

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.11em] text-amber-800">Coach review</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-stone-950">Puzzle progress</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadResults()}
            className="w-fit cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-900 hover:border-stone-500"
          >
            Refresh results
          </button>
        </div>

        <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-stone-200 pt-6">
          {[[summary.attempted, 'attempted'], [summary.solved, 'solved'], [summary.missed, 'missed']].map(([value, label]) => (
            <div key={label}>
              <dd className={`text-3xl font-bold ${label === 'solved' ? 'text-emerald-800' : label === 'missed' ? 'text-rose-800' : 'text-stone-950'}`}>{value}</dd>
              <dt className="mt-1 text-sm font-medium text-stone-500">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
        <h2 className="text-2xl font-bold text-stone-950">Checked attempts</h2>
        {newestAttempts.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-stone-50 p-5 text-stone-600">No attempts have been recorded yet.</p>
        ) : (
          <ol className="mt-5 grid gap-3">
            {newestAttempts.map((attempt) => (
              <li key={attempt.id} className="grid gap-1 rounded-2xl bg-stone-50 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
                <div>
                  <p className="font-bold text-stone-950">{attempt.puzzleTitle}: {attempt.move}</p>
                  <p className="text-sm text-stone-500">
                    {new Date(attempt.checkedAt).toLocaleString()}
                    {attempt.durationMs !== undefined ? ` · ${formatDuration(attempt.durationMs)}` : ''}
                    {attempt.pauseCount ? ` · ${attempt.pauseCount} ${attempt.pauseCount === 1 ? 'pause' : 'pauses'}` : ''}
                    {attempt.restartCount ? ` · ${attempt.restartCount} ${attempt.restartCount === 1 ? 'restart' : 'restarts'}` : ''}
                  </p>
                </div>
                <p className={attempt.result === 'correct' ? 'font-bold text-emerald-800' : attempt.result === 'answer-viewed' ? 'font-bold text-amber-800' : 'font-bold text-rose-800'}>
                  {attempt.result === 'correct' ? 'Correct' : attempt.result === 'answer-viewed' ? 'Answer viewed' : 'Not quite'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

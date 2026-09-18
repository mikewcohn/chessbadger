import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PuzzleCollection } from '../data/puzzleCollections'

type Attempt = {
  puzzleId: string
  result: 'correct' | 'incorrect'
}

type PuzzleStatus = 'solved' | 'solved-after-retry' | 'missed' | 'not-attempted'

type PuzzleCollectionProgressProps = {
  collection: PuzzleCollection
}

const statusLabel: Record<PuzzleStatus, string> = {
  solved: 'Solved',
  'solved-after-retry': 'Solved after retry',
  missed: 'Missed',
  'not-attempted': 'Not attempted',
}

function StatusIcon({ status }: { status: PuzzleStatus }) {
  if (status === 'not-attempted') return null

  const iconColor = status === 'missed' ? 'text-rose-800' : 'text-emerald-800'

  return (
    <span className={`grid size-6 place-items-center rounded-full bg-white ${iconColor}`} aria-hidden="true">
      {status === 'solved' || status === 'solved-after-retry' ? (
        <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="3">
          <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="3">
          <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}

function LegendItem({ status, children }: { status: PuzzleStatus; children: ReactNode }) {
  const color = status === 'solved'
    ? 'bg-emerald-800 text-emerald-800'
    : status === 'solved-after-retry'
      ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
    : status === 'missed'
      ? 'bg-rose-800 text-rose-800'
      : 'bg-stone-300 text-stone-500'

  return (
    <span className="inline-flex items-center gap-2 text-sm font-bold text-stone-600">
      <span className={`grid size-7 place-items-center rounded-full ${color}`}>
        <StatusIcon status={status} />
      </span>
      {children}
    </span>
  )
}

export default function PuzzleCollectionProgress({ collection }: PuzzleCollectionProgressProps) {
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [practiceKey, setPracticeKey] = useState('')
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const currentStudentId = params.get('student') ?? ''
    const currentPracticeKey = params.get('key') ?? ''
    setStudentId(currentStudentId)
    setPracticeKey(currentPracticeKey)

    if (!currentStudentId || !currentPracticeKey) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    void fetch(
      `/api/practice/attempts?student=${encodeURIComponent(currentStudentId)}&key=${encodeURIComponent(currentPracticeKey)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json() as {
          student?: { name: string; attempts: Attempt[] }
          error?: string
        }
        if (!response.ok || !data.student) throw new Error(data.error ?? 'Could not load puzzle progress.')
        setStudentName(data.student.name)
        setAttempts(data.student.attempts)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'Could not load puzzle progress.')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  const statuses = useMemo(() => {
    const attemptsByPuzzle = new Map<string, Attempt[]>()
    for (const attempt of attempts) {
      attemptsByPuzzle.set(attempt.puzzleId, [
        ...(attemptsByPuzzle.get(attempt.puzzleId) ?? []),
        attempt,
      ])
    }

    return collection.puzzles.map<PuzzleStatus>((puzzle) => {
      const puzzleAttempts = attemptsByPuzzle.get(puzzle.id) ?? []
      const hasIncorrectAttempt = puzzleAttempts.some((attempt) => attempt.result === 'incorrect')
      const hasCorrectAttempt = puzzleAttempts.some((attempt) => attempt.result === 'correct')
      if (hasIncorrectAttempt && hasCorrectAttempt) return 'solved-after-retry'
      if (hasIncorrectAttempt) return 'missed'
      if (hasCorrectAttempt) return 'solved'
      return 'not-attempted'
    })
  }, [attempts, collection.puzzles])

  const attemptedCount = statuses.filter((status) => status !== 'not-attempted').length
  const solvedCount = statuses.filter((status) => status === 'solved' || status === 'solved-after-retry').length
  const missedCount = statuses.filter((status) => status === 'missed').length
  const firstMissedIndex = statuses.findIndex((status) => status === 'missed')
  const firstNotAttemptedIndex = statuses.findIndex((status) => status === 'not-attempted')
  const continueIndex = firstMissedIndex >= 0
    ? firstMissedIndex
    : firstNotAttemptedIndex >= 0
      ? firstNotAttemptedIndex
      : 0

  const puzzleHref = (index: number) => {
    const params = new URLSearchParams({
      collection: collection.slug,
      puzzle: String(index + 1),
    })
    if (studentId && practiceKey) {
      params.set('student', studentId)
      params.set('key', practiceKey)
    }
    return `/puzzles?${params.toString()}`
  }

  const continueStatus = statuses[continueIndex]
  const continueCopy = continueStatus === 'missed'
    ? `Review Puzzle ${continueIndex + 1}`
    : attemptedCount === 0
      ? 'Start with Puzzle 1'
      : `Continue with Puzzle ${continueIndex + 1}`

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-900/5 sm:p-8">
      <div className="flex flex-col gap-6 border-b border-stone-200 pb-7 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-black text-amber-900">
            {loading
              ? 'Loading progress…'
              : studentName
                ? `${studentName} · Shared with coach`
                : 'Private student link required for saved progress'}
          </p>
          {error ? <p className="mt-2 text-sm font-bold text-rose-800">{error}</p> : null}
        </div>

        <dl className="grid grid-cols-3 gap-4 sm:gap-8">
          {[
            [attemptedCount, 'attempted'],
            [solvedCount, 'solved'],
            [missedCount, 'missed'],
          ].map(([value, label]) => (
            <div key={label} className="border-l border-stone-200 pl-4 first:border-l-0 first:pl-0 sm:pl-8">
              <dd className={`text-3xl font-black ${label === 'solved' ? 'text-emerald-800' : label === 'missed' ? 'text-rose-800' : 'text-stone-950'}`}>
                {value}
              </dd>
              <dt className="text-xs font-bold text-stone-500 sm:text-sm">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
        {collection.puzzles.map((puzzle, index) => {
          const status = statuses[index]
          const style = status === 'solved'
            ? 'border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-700'
            : status === 'solved-after-retry'
              ? 'border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200'
            : status === 'missed'
              ? 'border-rose-800 bg-rose-800 text-white hover:bg-rose-700'
              : 'border-stone-300 bg-stone-100 text-stone-700 hover:border-stone-500 hover:bg-white'

          return (
            <a
              key={puzzle.id}
              href={puzzleHref(index)}
              className={`grid aspect-square place-items-center rounded-2xl border text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 ${style}`}
              aria-label={`Puzzle ${index + 1}: ${statusLabel[status]}`}
            >
              <span className="grid justify-items-center gap-2">
                <strong className="text-2xl font-black">{index + 1}</strong>
                <StatusIcon status={status} />
              </span>
            </a>
          )
        })}
      </div>

      <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
        <LegendItem status="solved">Solved cleanly</LegendItem>
        <LegendItem status="solved-after-retry">Solved after retry</LegendItem>
        <LegendItem status="missed">Missed at least once</LegendItem>
        <LegendItem status="not-attempted">Not attempted</LegendItem>
      </div>

      <div className="mt-8 border-t border-stone-200 pt-7">
        <a
          href={puzzleHref(continueIndex)}
          className="inline-flex items-center gap-3 rounded-xl bg-amber-800 px-6 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
        >
          {continueCopy}
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current" strokeWidth="2.5">
            <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <p className="mt-3 text-sm text-stone-500">
          {continueStatus === 'missed' ? 'Review this puzzle and try again.' : 'Your checked moves are saved for your coach.'}
        </p>
      </div>
    </section>
  )
}

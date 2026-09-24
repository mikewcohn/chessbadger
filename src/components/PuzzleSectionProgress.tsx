import { useEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from 'react'
import type { PuzzleCollection, PuzzleSection } from '../data/puzzleCollections'
import { getCachedPracticeAttempts } from '../lib/practiceClient'
import {
  getPuzzleStatuses,
  summarizePuzzleStatuses,
  type PracticeAttempt,
  type PuzzleProgressStatus,
} from '../lib/puzzleProgress'
import PuzzleProgressBar from './PuzzleProgressBar'

type PuzzleSectionProgressProps = {
  collection: PuzzleCollection
  section: PuzzleSection
}

const RANGE_SIZE = 100

const statusLabel: Record<PuzzleProgressStatus, string> = {
  clean: 'Solved cleanly',
  retried: 'Solved after retry',
  missed: 'Missed',
  'not-attempted': 'Not attempted',
}

function StatusIcon({ status }: { status: PuzzleProgressStatus }) {
  if (status === 'not-attempted') return null
  const iconColor = status === 'missed' ? 'text-rose-800' : 'text-emerald-800'

  return (
    <span className={`grid size-6 place-items-center rounded-full bg-white ${iconColor}`} aria-hidden="true">
      {status === 'clean' || status === 'retried' ? (
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

function LegendItem({ status, children }: { status: PuzzleProgressStatus; children: ReactNode }) {
  const color = status === 'clean'
    ? 'bg-emerald-800 text-emerald-800'
    : status === 'retried'
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

export default function PuzzleSectionProgress({ collection, section }: PuzzleSectionProgressProps) {
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeStart, setRangeStart] = useState(0)
  const [statusFilter, setStatusFilter] = useState<PuzzleProgressStatus | 'all'>('all')
  const [jumpValue, setJumpValue] = useState('')
  const [jumpError, setJumpError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void fetch(
      '/api/practice/attempts',
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json() as {
          attempts?: PracticeAttempt[]
          error?: string
        }
        if (!response.ok || !data.attempts) throw new Error(data.error ?? 'Could not load puzzle progress.')
        setAttempts([...data.attempts, ...getCachedPracticeAttempts()])
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'Could not load puzzle progress.')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  const statuses = useMemo(
    () => getPuzzleStatuses(section.puzzles, attempts),
    [attempts, section.puzzles],
  )
  const progress = summarizePuzzleStatuses(statuses)
  const solvedCount = progress.clean + progress.retried
  const firstMissedIndex = statuses.findIndex((status) => status === 'missed')
  const firstNotAttemptedIndex = statuses.findIndex((status) => status === 'not-attempted')
  const continueIndex = firstMissedIndex >= 0 ? firstMissedIndex : firstNotAttemptedIndex >= 0 ? firstNotAttemptedIndex : 0

  const puzzleHref = (index: number) => {
    const puzzle = section.puzzles[index]
    return `/puzzles/${collection.slug}/${section.slug}/puzzle/${puzzle.id}`
  }

  if (section.puzzles.length === 0) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Coming soon</span>
        <h2 className="mt-4 text-3xl font-bold text-stone-950">No puzzles have been added here yet.</h2>
        <p className="mx-auto mt-3 max-w-xl text-stone-600">This section is ready for its workbook puzzles when they are added.</p>
        <a href={`/puzzles/${collection.slug}`} className="mt-7 inline-flex rounded-lg bg-amber-800 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700">Back to all sections</a>
      </section>
    )
  }

  const continueStatus = statuses[continueIndex]
  const continueCopy = continueStatus === 'missed'
    ? `Review Puzzle ${continueIndex + 1}`
    : progress.attempted === 0
      ? 'Start with Puzzle 1'
      : solvedCount === section.puzzles.length
        ? 'Review from Puzzle 1'
        : `Continue with Puzzle ${continueIndex + 1}`

  const rangeStarts = Array.from(
    { length: Math.ceil(section.puzzles.length / RANGE_SIZE) },
    (_, index) => index * RANGE_SIZE,
  )
  const rangeEnd = Math.min(rangeStart + RANGE_SIZE, section.puzzles.length)
  const visiblePuzzleIndices = Array.from({ length: rangeEnd - rangeStart }, (_, index) => rangeStart + index)
    .filter((index) => statusFilter === 'all' || statuses[index] === statusFilter)
  const firstBookProblem = Number(section.puzzles[0]?.title.match(/\d+$/)?.[0])
  const jumpPlaceholder = Number.isFinite(firstBookProblem) ? `e.g. ${firstBookProblem}` : 'e.g. 1'

  const handleJump = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const requested = Number(jumpValue)
    if (!Number.isInteger(requested)) {
      setJumpError('Enter a whole puzzle number.')
      return
    }

    const bookIndex = section.puzzles.findIndex((puzzle) => Number(puzzle.title.match(/\d+$/)?.[0]) === requested)
    const puzzleIndex = bookIndex >= 0
      ? bookIndex
      : requested >= 1 && requested <= section.puzzles.length
        ? requested - 1
        : -1

    if (puzzleIndex < 0) {
      setJumpError('That puzzle is not in this section.')
      return
    }

    window.location.assign(puzzleHref(puzzleIndex))
  }

  return (
    <section className="grid min-w-0 gap-6">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
          <div className="min-h-7">
            {loading
              ? <span className="block h-5 w-48 animate-pulse rounded bg-stone-200"><span className="sr-only">Loading progress</span></span>
              : <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-950">Your section progress</h2>}
            {error ? <p className="mt-1 text-sm font-semibold text-rose-800">{error}</p> : null}
          </div>
          <p className="mt-1 text-sm text-stone-500">Progress shows both completion and outcome.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 px-5 py-5 sm:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(90px,0.6fr))] sm:items-center sm:px-7">
          <div className="col-span-3 sm:col-span-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-stone-950">Overall completion</p>
              <p className="text-sm font-bold text-stone-700">{progress.total === 0 ? 0 : Math.round((progress.attempted / progress.total) * 100)}%</p>
            </div>
            <div className="mt-2"><PuzzleProgressBar progress={progress} /></div>
            <p className="mt-1.5 text-xs font-medium text-stone-500">{progress.attempted} of {progress.total} puzzles attempted</p>
          </div>
          {([
            [progress.clean, 'Clean', 'text-emerald-800'],
            [progress.retried, 'Retried', 'text-emerald-700'],
            [progress.missed, 'Missed', 'text-rose-800'],
          ] as const).map(([value, label, color]) => (
            <div key={label} className="border-l border-stone-200 pl-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-sm text-stone-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.11em] text-stone-500">Continue where you left off</p>
            <p className="mt-1 font-semibold text-stone-900">{section.puzzles[continueIndex].title}</p>
          </div>
          <a href={puzzleHref(continueIndex)} className="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800">
            {continueCopy}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="2.5"><path d="M6 12h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 border-y border-stone-200 bg-white px-1 py-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end sm:px-6">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-bold text-amber-900">Browse by range</p>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {rangeStarts.map((start) => {
              const end = Math.min(start + RANGE_SIZE, section.puzzles.length)
              return (
                <button key={start} type="button" onClick={() => setRangeStart(start)} aria-pressed={rangeStart === start} className={`shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition ${rangeStart === start ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>
                  {start + 1}–{end}
                </button>
              )
            })}
          </div>
        </div>
        <form onSubmit={handleJump} className="min-w-56">
          <label htmlFor="puzzle-jump" className="mb-2 block text-sm font-bold text-amber-900">Go to problem</label>
          <div className="flex gap-2">
            <input id="puzzle-jump" inputMode="numeric" value={jumpValue} onChange={(event) => { setJumpValue(event.target.value); setJumpError('') }} placeholder={jumpPlaceholder} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-200" />
            <button type="submit" className="cursor-pointer rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">Go</button>
          </div>
          {jumpError ? <p className="mt-1 text-xs font-semibold text-rose-800" role="alert">{jumpError}</p> : null}
        </form>
        <div>
          <p className="mb-2 text-sm font-bold text-amber-900">Filter by status</p>
          <div className="flex flex-wrap gap-2">
            {([['all', 'All'], ['not-attempted', 'Unattempted'], ['clean', 'Clean'], ['retried', 'Retried'], ['missed', 'Missed']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition ${statusFilter === value ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-bold tracking-[-0.015em] text-stone-950">Puzzles {rangeStart + 1}–{rangeEnd}</h2>
          <p className="text-sm text-stone-500">Showing {visiblePuzzleIndices.length} of {section.puzzles.length} puzzles</p>
        </div>
        {visiblePuzzleIndices.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {visiblePuzzleIndices.map((index) => {
          const puzzle = section.puzzles[index]
          const status = statuses[index]
          const style = status === 'clean'
            ? 'border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-700'
            : status === 'retried'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
              : status === 'missed'
                ? 'border-rose-800 bg-rose-800 text-white hover:bg-rose-700'
                : 'border-stone-300 bg-stone-100 text-stone-700 hover:border-stone-500 hover:bg-white'

          return (
            <a key={puzzle.id} href={puzzleHref(index)} className={`grid min-h-11 place-items-center rounded-lg border px-2 py-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 ${style}`} aria-label={`${puzzle.title}: ${statusLabel[status]}`}>
              <span className="flex items-center justify-center gap-1.5">
                <span className="group relative inline-flex">
                  <strong className="text-sm font-bold">{index + 1}</strong>
                  <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-950 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {puzzle.title}
                  </span>
                </span>
                <StatusIcon status={status} />
              </span>
            </a>
          )
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-stone-50 px-4 py-8 text-center text-sm text-stone-600">No puzzles in this range match that status.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-200 pt-4">
          <LegendItem status="clean">Solved cleanly</LegendItem>
          <LegendItem status="retried">Solved after retry</LegendItem>
          <LegendItem status="missed">Missed</LegendItem>
          <LegendItem status="not-attempted">Not attempted</LegendItem>
        </div>
      </div>
    </section>
  )
}

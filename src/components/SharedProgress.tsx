import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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

type WorkbookPuzzle = { id: string; title: string }
type PuzzleStatus = 'clean' | 'retried' | 'missed' | 'not-attempted'
type StatusFilter = 'all' | Exclude<PuzzleStatus, 'not-attempted'>
type SortOrder = 'workbook' | 'recent'

type PuzzleSummary = {
  puzzleId: string
  puzzleTitle: string
  pageNumber?: number
  puzzleNumber?: number
  move: string
  status: Exclude<PuzzleStatus, 'not-attempted'>
  attempts: Attempt[]
  failedMoves: string[]
  latestAttempt: Attempt
}

type SharedProgressProps = { workbookPuzzles?: WorkbookPuzzle[] }

const statusLabels: Record<PuzzleStatus, string> = {
  clean: 'Solved cleanly',
  retried: 'Solved after retry',
  missed: 'Missed',
  'not-attempted': 'Not attempted',
}

const parseWorkbookPosition = (title: string) => {
  const match = title.match(/^Page\s+(\d+),\s+Puzzle\s+(\d+)$/i)
  return match ? { pageNumber: Number(match[1]), puzzleNumber: Number(match[2]) } : {}
}

const sortByWorkbookPosition = (left: PuzzleSummary, right: PuzzleSummary) => {
  if (left.pageNumber !== right.pageNumber) {
    return (left.pageNumber ?? Number.MAX_SAFE_INTEGER) - (right.pageNumber ?? Number.MAX_SAFE_INTEGER)
  }
  if (left.puzzleNumber !== right.puzzleNumber) {
    return (left.puzzleNumber ?? Number.MAX_SAFE_INTEGER) - (right.puzzleNumber ?? Number.MAX_SAFE_INTEGER)
  }
  return left.puzzleTitle.localeCompare(right.puzzleTitle)
}

function StatusIcon({ status }: { status: PuzzleStatus }) {
  if (status === 'not-attempted') return null

  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full ${
        status === 'missed'
          ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
          : status === 'retried'
            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300'
            : 'bg-emerald-800 text-white'
      }`}
      aria-hidden="true"
    >
      {status === 'missed' ? (
        <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="3">
          <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="3">
          <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

function LegendItem({ status, children }: { status: PuzzleStatus; children: ReactNode }) {
  const swatch = status === 'not-attempted'
    ? <span className="size-5 rounded-full bg-stone-200 ring-1 ring-stone-300" aria-hidden="true" />
    : <StatusIcon status={status} />

  return <span className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600">{swatch}{children}</span>
}

export default function SharedProgress({ workbookPuzzles = [] }: SharedProgressProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('workbook')
  const [showDateTime, setShowDateTime] = useState(false)
  const [showSolvingTime, setShowSolvingTime] = useState(true)
  const [selectedPage, setSelectedPage] = useState<number | null>(null)
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null)

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

  useEffect(() => { void loadResults() }, [loadResults])

  const summaries = useMemo(() => {
    const attemptsByPuzzle = new Map<string, Attempt[]>()
    for (const attempt of attempts) {
      const existing = attemptsByPuzzle.get(attempt.puzzleId)
      if (existing) existing.push(attempt)
      else attemptsByPuzzle.set(attempt.puzzleId, [attempt])
    }

    return [...attemptsByPuzzle.entries()].map<PuzzleSummary>(([puzzleId, puzzleAttempts]) => {
      const correctAttempt = puzzleAttempts.findLast((attempt) => attempt.result === 'correct')
      const failedAttempts = puzzleAttempts.filter((attempt) => attempt.result !== 'correct')
      const latestAttempt = puzzleAttempts.at(-1)!
      return {
        puzzleId,
        puzzleTitle: latestAttempt.puzzleTitle,
        ...parseWorkbookPosition(latestAttempt.puzzleTitle),
        move: correctAttempt?.move ?? latestAttempt.move,
        status: correctAttempt ? (failedAttempts.length > 0 ? 'retried' : 'clean') : 'missed',
        attempts: puzzleAttempts,
        failedMoves: failedAttempts.filter((attempt) => attempt.result === 'incorrect').map((attempt) => attempt.move),
        latestAttempt,
      }
    })
  }, [attempts])

  const summariesByPuzzle = useMemo(() => new Map(summaries.map((summary) => [summary.puzzleId, summary])), [summaries])
  const workbookPages = useMemo(() => {
    const pages = new Set<number>()
    for (const puzzle of workbookPuzzles) {
      const { pageNumber } = parseWorkbookPosition(puzzle.title)
      if (pageNumber !== undefined) pages.add(pageNumber)
    }
    return [...pages].sort((left, right) => left - right)
  }, [workbookPuzzles])

  const latestAttemptedPage = useMemo(() => {
    for (const attempt of attempts.toReversed()) {
      const { pageNumber } = parseWorkbookPosition(attempt.puzzleTitle)
      if (pageNumber !== undefined) return pageNumber
    }
    return workbookPages[0] ?? null
  }, [attempts, workbookPages])

  const activePage = selectedPage ?? latestAttemptedPage
  const activePagePuzzles = useMemo(() => workbookPuzzles
    .map((puzzle) => ({ ...puzzle, ...parseWorkbookPosition(puzzle.title) }))
    .filter((puzzle) => puzzle.pageNumber === activePage)
    .sort((left, right) => (left.puzzleNumber ?? 0) - (right.puzzleNumber ?? 0)), [activePage, workbookPuzzles])

  const counts = useMemo(() => ({
    attempted: summaries.length,
    clean: summaries.filter((summary) => summary.status === 'clean').length,
    retried: summaries.filter((summary) => summary.status === 'retried').length,
    missed: summaries.filter((summary) => summary.status === 'missed').length,
  }), [summaries])

  const visibleSummaries = useMemo(() => {
    const filtered = summaries.filter((summary) => (
      (statusFilter === 'all' || summary.status === statusFilter)
      && (selectedPuzzleId === null || summary.puzzleId === selectedPuzzleId)
    ))
    return filtered.toSorted((left, right) => sortOrder === 'recent'
      ? new Date(right.latestAttempt.checkedAt).getTime() - new Date(left.latestAttempt.checkedAt).getTime()
      : sortByWorkbookPosition(left, right))
  }, [selectedPuzzleId, sortOrder, statusFilter, summaries])

  const chooseStatusFilter = (filter: StatusFilter) => {
    setStatusFilter(filter)
    setSelectedPuzzleId(null)
  }

  if (loading) return <p className="rounded-2xl border border-stone-200 bg-white p-8 text-stone-600">Loading results…</p>
  if (error) return (
    <section className="rounded-2xl border border-rose-200 bg-white p-8">
      <h2 className="text-2xl font-bold text-stone-950">Results unavailable</h2>
      <p className="mt-2 text-rose-800">{error}</p>
    </section>
  )

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-950">Progress overview</h2>
            <p className="mt-1 text-sm text-stone-500">One current result per puzzle</p>
          </div>
          <button type="button" onClick={() => void loadResults()} className="w-fit cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-bold text-stone-800 transition hover:border-stone-500 hover:bg-stone-50">Refresh</button>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y divide-stone-200 sm:grid-cols-4 sm:divide-y-0">
          {([
            [counts.attempted, 'Attempted', 'text-stone-950'],
            [counts.clean, 'Solved cleanly', 'text-emerald-800'],
            [counts.retried, 'Solved after retry', 'text-emerald-700'],
            [counts.missed, 'Missed', 'text-rose-800'],
          ] as const).map(([value, label, color]) => (
            <div key={label} className="px-5 py-4 sm:px-6">
              <dd className={`text-3xl font-bold tracking-tight ${color}`}>{value}</dd>
              <dt className="mt-0.5 text-sm font-medium text-stone-500">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {workbookPages.length > 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.015em] text-stone-950">Workbook progress</h2>
              <p className="mt-1 text-sm text-stone-500">Select a puzzle to see its result below.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
              Page
              <select value={activePage ?? ''} onChange={(event) => { setSelectedPage(Number(event.currentTarget.value)); setSelectedPuzzleId(null) }} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200">
                {workbookPages.map((page) => <option key={page} value={page}>{page}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-10">
            {activePagePuzzles.map((puzzle) => {
              const status = summariesByPuzzle.get(puzzle.id)?.status ?? 'not-attempted'
              const isSelected = selectedPuzzleId === puzzle.id
              const style = status === 'clean'
                ? 'border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-700'
                : status === 'retried'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
                  : status === 'missed'
                    ? 'border-rose-800 bg-rose-800 text-white hover:bg-rose-700'
                    : 'border-stone-300 bg-stone-100 text-stone-700 hover:border-stone-500 hover:bg-white'
              return (
                <button key={puzzle.id} type="button" onClick={() => { setSelectedPuzzleId(isSelected ? null : puzzle.id); setStatusFilter('all') }} aria-pressed={isSelected} aria-label={`Puzzle ${puzzle.puzzleNumber}: ${statusLabels[status]}`} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 ${style} ${isSelected ? 'ring-2 ring-amber-700 ring-offset-2' : ''}`}>
                  {puzzle.puzzleNumber}<StatusIcon status={status} />
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-200 pt-4">
            <LegendItem status="clean">Solved cleanly</LegendItem>
            <LegendItem status="retried">Solved after retry</LegendItem>
            <LegendItem status="missed">Missed</LegendItem>
            <LegendItem status="not-attempted">Not attempted</LegendItem>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.015em] text-stone-950">Puzzle results</h2>
              <p className="mt-1 text-sm text-stone-500">Showing {visibleSummaries.length} of {summaries.length} attempted puzzles{selectedPuzzleId ? ' · one puzzle selected' : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Filter puzzle results">
              {([['all', 'All'], ['clean', 'Clean'], ['retried', 'Retried'], ['missed', 'Missed']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => chooseStatusFilter(value)} aria-pressed={statusFilter === value && selectedPuzzleId === null} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition ${statusFilter === value && selectedPuzzleId === null ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-600">
                <input type="checkbox" checked={showDateTime} onChange={(event) => setShowDateTime(event.currentTarget.checked)} className="size-4 accent-amber-800" /> Show date &amp; time
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-600">
                <input type="checkbox" checked={showSolvingTime} onChange={(event) => setShowSolvingTime(event.currentTarget.checked)} className="size-4 accent-amber-800" /> Show solving time
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
              Sort
              <select value={sortOrder} onChange={(event) => setSortOrder(event.currentTarget.value as SortOrder)} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-semibold text-stone-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200">
                <option value="workbook">Workbook order</option><option value="recent">Most recent</option>
              </select>
            </label>
          </div>
        </div>

        {visibleSummaries.length === 0 ? (
          <p className="m-5 rounded-xl bg-stone-50 px-4 py-10 text-center text-stone-600 sm:m-7">{summaries.length === 0 ? 'No attempts have been recorded yet.' : selectedPuzzleId ? 'This puzzle has not been attempted.' : 'No puzzle results match this filter.'}</p>
        ) : (
          <ol className="divide-y divide-stone-200">
            {visibleSummaries.map((summary) => {
              const failedCount = summary.attempts.filter((attempt) => attempt.result !== 'correct').length
              const answerWasViewed = summary.attempts.some((attempt) => attempt.result === 'answer-viewed')
              const detailParts = [
                showDateTime ? new Date(summary.latestAttempt.checkedAt).toLocaleString() : null,
                showSolvingTime && summary.latestAttempt.durationMs !== undefined ? formatDuration(summary.latestAttempt.durationMs) : null,
                showSolvingTime && summary.latestAttempt.pauseCount ? `${summary.latestAttempt.pauseCount} ${summary.latestAttempt.pauseCount === 1 ? 'pause' : 'pauses'}` : null,
                showSolvingTime && summary.latestAttempt.restartCount ? `${summary.latestAttempt.restartCount} ${summary.latestAttempt.restartCount === 1 ? 'restart' : 'restarts'}` : null,
              ].filter(Boolean)
              return (
                <li key={summary.puzzleId} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="font-bold text-stone-950">{summary.puzzleTitle}</p><span className="font-semibold text-stone-700">{summary.move}</span></div>
                    {summary.status === 'retried' ? (
                      <p className="mt-1 text-sm text-stone-600">{failedCount} failed {failedCount === 1 ? 'attempt' : 'attempts'}{summary.failedMoves.length > 0 ? `: ${summary.failedMoves.join(', ')}` : ''}{answerWasViewed ? `${summary.failedMoves.length > 0 ? ' · ' : ': '}answer viewed` : ''}</p>
                    ) : summary.status === 'missed' && answerWasViewed && summary.move.toLowerCase() !== 'answer viewed' ? <p className="mt-1 text-sm text-amber-800">Answer viewed</p> : null}
                    {detailParts.length > 0 ? <p className="mt-1 text-sm text-stone-500">{detailParts.join(' · ')}</p> : null}
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-bold ${summary.status === 'missed' ? 'text-rose-800' : 'text-emerald-800'}`}><StatusIcon status={summary.status} />{statusLabels[summary.status]}</div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

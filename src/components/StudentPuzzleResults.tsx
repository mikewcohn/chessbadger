import { useEffect, useMemo, useState } from 'react'
import type { Puzzle } from '../types/puzzles'
import { formatDuration } from '../hooks/usePuzzleTimer'
import {
  createWorkbookAttemptsCsv,
  workbookAttemptsFilename,
  workbookPuzzleReference,
} from '../lib/attemptExport'
import { getPuzzleStatuses, type PracticeAttempt, type PuzzleProgressStatus } from '../lib/puzzleProgress'

type StudentPuzzleResultsProps = {
  collectionSlug: string
  sectionSlug: string
  puzzles: Puzzle[]
  attempts: PracticeAttempt[]
}

type AttemptedStatus = Exclude<PuzzleProgressStatus, 'not-attempted'>
type StatusFilter = 'all' | AttemptedStatus
type SortOrder = 'book' | 'recent'

type PuzzleResult = {
  puzzle: Puzzle
  puzzleIndex: number
  status: AttemptedStatus
  attempts: PracticeAttempt[]
  failedMoves: string[]
  move: string
  latestAttempt: PracticeAttempt
}

const statusLabels: Record<AttemptedStatus, string> = {
  clean: 'First try',
  retried: 'After retry',
  missed: 'Not solved',
}

function StatusIcon({ status }: { status: AttemptedStatus }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full ${status === 'missed' ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200' : status === 'retried' ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300' : 'bg-emerald-800 text-white'}`} aria-hidden="true">
      {status === 'missed' ? (
        <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="3"><path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth="3"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </span>
  )
}

export default function StudentPuzzleResults({
  collectionSlug,
  sectionSlug,
  puzzles,
  attempts,
}: StudentPuzzleResultsProps) {
  const [expanded, setExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('book')
  const [showDateTime, setShowDateTime] = useState(false)
  const [showSolvingTime, setShowSolvingTime] = useState(true)

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash !== '#attempt-details') return
      setExpanded(true)
      window.requestAnimationFrame(() => {
        document.getElementById('attempt-details')?.scrollIntoView()
      })
    }

    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [])

  const results = useMemo(() => {
    const attemptsByPuzzle = new Map<string, PracticeAttempt[]>()
    for (const attempt of attempts) {
      if (!attempt.move) continue
      const puzzleAttempts = attemptsByPuzzle.get(attempt.puzzleId)
      if (puzzleAttempts) puzzleAttempts.push(attempt)
      else attemptsByPuzzle.set(attempt.puzzleId, [attempt])
    }

    return puzzles.flatMap<PuzzleResult>((puzzle, puzzleIndex) => {
      const puzzleAttempts = attemptsByPuzzle.get(puzzle.id) ?? []
      if (puzzleAttempts.length === 0) return []

      const correctAttempt = puzzleAttempts.findLast((attempt) => attempt.result === 'correct')
      const failedAttempts = puzzleAttempts.filter((attempt) => attempt.result !== 'correct')
      const latestAttempt = puzzleAttempts.at(-1)!

      return [{
        puzzle,
        puzzleIndex,
        status: getPuzzleStatuses([puzzle], puzzleAttempts)[0] as AttemptedStatus,
        attempts: puzzleAttempts,
        failedMoves: failedAttempts
          .filter((attempt) => attempt.result === 'incorrect' && attempt.move)
          .map((attempt) => attempt.move!),
        move: correctAttempt?.move ?? latestAttempt.move!,
        latestAttempt,
      }]
    })
  }, [attempts, puzzles])

  const visibleResults = useMemo(() => results
    .filter((result) => statusFilter === 'all' || result.status === statusFilter)
    .toSorted((left, right) => sortOrder === 'recent'
      ? new Date(right.latestAttempt.checkedAt ?? 0).getTime() - new Date(left.latestAttempt.checkedAt ?? 0).getTime()
      : left.puzzleIndex - right.puzzleIndex), [results, sortOrder, statusFilter])

  const canExportWorkbookAttempts = puzzles.some((puzzle) => workbookPuzzleReference(puzzle) !== null)

  const exportAttempts = () => {
    const csv = createWorkbookAttemptsCsv(puzzles, attempts)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = workbookAttemptsFilename(sectionSlug)
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <section id="attempt-details" className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-labelledby="attempt-details-heading">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <button type="button" onClick={() => setExpanded((isExpanded) => !isExpanded)} aria-expanded={expanded} aria-controls="attempt-details-content" className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-5 px-5 py-5 text-left transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-800 sm:px-7">
          <span>
            <span id="attempt-details-heading" className="block text-xl font-bold tracking-[-0.015em] text-stone-950">Attempt details</span>
            <span className="mt-1 block text-sm text-stone-500">{results.length} attempted {results.length === 1 ? 'puzzle' : 'puzzles'} · Moves, timing, retries, and answer views</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-amber-900">
            {expanded ? 'Hide details' : 'Show details'}
            <svg viewBox="0 0 24 24" className={`size-4 fill-none stroke-current transition ${expanded ? 'rotate-180' : ''}`} strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </button>
        {canExportWorkbookAttempts ? (
          <div className="flex items-center border-t border-stone-200 px-5 py-4 sm:border-l sm:border-t-0 sm:px-7">
            <button type="button" onClick={exportAttempts} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-800 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 sm:w-auto">
              <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2.25" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Export attempts CSV
            </button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div id="attempt-details-content" className="border-t border-stone-200">
          <div className="px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <p className="text-sm text-stone-500">Select a puzzle to review its answer and complete attempt history.</p>
              <div className="flex flex-wrap gap-2" aria-label="Filter attempt details">
                {([['all', 'All'], ['clean', 'First try'], ['retried', 'After retry'], ['missed', 'Not solved']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${statusFilter === value ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-600"><input type="checkbox" checked={showDateTime} onChange={(event) => setShowDateTime(event.currentTarget.checked)} className="size-4 accent-amber-800" /> Show date &amp; time</label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-600"><input type="checkbox" checked={showSolvingTime} onChange={(event) => setShowSolvingTime(event.currentTarget.checked)} className="size-4 accent-amber-800" /> Show solving time</label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
                Sort
                <select value={sortOrder} onChange={(event) => setSortOrder(event.currentTarget.value as SortOrder)} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-semibold text-stone-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200">
                  <option value="book">Book order</option>
                  <option value="recent">Most recent</option>
                </select>
              </label>
            </div>
          </div>

          {visibleResults.length === 0 ? (
            <p className="m-5 rounded-xl bg-stone-50 px-4 py-10 text-center text-stone-600 sm:m-7">
              {results.length === 0 ? 'Complete a puzzle to see its attempt details here.' : 'No attempt details match this filter.'}
            </p>
          ) : (
            <ol className="divide-y divide-stone-200 border-t border-stone-200">
              {visibleResults.map((result) => {
                const failedCount = result.attempts.filter((attempt) => attempt.result !== 'correct').length
                const answerWasViewed = result.attempts.some((attempt) => attempt.result === 'answer-viewed')
                const detailParts = [
                  showDateTime && result.latestAttempt.checkedAt ? new Date(result.latestAttempt.checkedAt).toLocaleString() : null,
                  showSolvingTime && result.latestAttempt.durationMs !== undefined ? formatDuration(result.latestAttempt.durationMs) : null,
                  showSolvingTime && result.latestAttempt.pauseCount ? `${result.latestAttempt.pauseCount} ${result.latestAttempt.pauseCount === 1 ? 'pause' : 'pauses'}` : null,
                  showSolvingTime && result.latestAttempt.restartCount ? `${result.latestAttempt.restartCount} ${result.latestAttempt.restartCount === 1 ? 'restart' : 'restarts'}` : null,
                ].filter(Boolean)
                const reviewHref = `/puzzles/${collectionSlug}/${sectionSlug}/puzzle/${result.puzzle.id}?review=student`

                return (
                  <li key={result.puzzle.id}>
                    <a href={reviewHref} className="grid gap-3 px-5 py-4 transition hover:bg-amber-50/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-800 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="font-bold text-stone-950">{result.puzzle.title}</p><span className="font-semibold text-stone-700">{result.move}</span></div>
                        {result.status === 'retried' ? <p className="mt-1 text-sm text-stone-600">{failedCount} failed {failedCount === 1 ? 'attempt' : 'attempts'}{result.failedMoves.length > 0 ? `: ${result.failedMoves.join(', ')}` : ''}{answerWasViewed ? `${result.failedMoves.length > 0 ? ' · ' : ': '}answer viewed` : ''}</p> : result.status === 'missed' && answerWasViewed && result.move.toLowerCase() !== 'answer viewed' ? <p className="mt-1 text-sm text-amber-800">Answer viewed</p> : null}
                        {detailParts.length > 0 ? <p className="mt-1 text-sm text-stone-500">{detailParts.join(' · ')}</p> : null}
                      </div>
                      <div className={`flex items-center gap-2 text-sm font-bold ${result.status === 'missed' ? 'text-rose-800' : 'text-emerald-800'}`}><StatusIcon status={result.status} />{statusLabels[result.status]}<span aria-hidden="true">→</span></div>
                    </a>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  )
}

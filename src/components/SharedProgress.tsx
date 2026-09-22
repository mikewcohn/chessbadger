import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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

type CoachPuzzle = { id: string; title: string }
type CoachSection = { slug: string; title: string; puzzles: CoachPuzzle[] }
type CoachBook = { slug: string; title: string; sections: CoachSection[] }
type PuzzleStatus = 'clean' | 'retried' | 'missed' | 'not-attempted'
type StatusFilter = 'all' | Exclude<PuzzleStatus, 'not-attempted'>
type SortOrder = 'book' | 'recent'

type CatalogEntry = CoachPuzzle & {
  bookSlug: string
  sectionSlug: string
  puzzleIndex: number
}

type PuzzleSummary = CatalogEntry & {
  move: string
  status: Exclude<PuzzleStatus, 'not-attempted'>
  attempts: Attempt[]
  failedMoves: string[]
  latestAttempt: Attempt
}

type SectionProgress = {
  attempted: number
  clean: number
  retried: number
  missed: number
  total: number
}

type SharedProgressProps = { books: CoachBook[] }

const RANGE_SIZE = 100
const EMPTY_PROGRESS: SectionProgress = { attempted: 0, clean: 0, retried: 0, missed: 0, total: 0 }

const statusLabels: Record<PuzzleStatus, string> = {
  clean: 'Solved cleanly',
  retried: 'Solved after retry',
  missed: 'Missed',
  'not-attempted': 'Not attempted',
}

const puzzleDisplayNumber = (puzzle: CoachPuzzle, index: number) => {
  const polgarMatch = puzzle.id.match(/^polgar-puzzle-(\d+)$/)
  return polgarMatch ? Number(polgarMatch[1]) : index + 1
}

function StatusIcon({ status }: { status: PuzzleStatus }) {
  if (status === 'not-attempted') return null
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

function LegendItem({ status, children }: { status: PuzzleStatus; children: ReactNode }) {
  const swatch = status === 'not-attempted'
    ? <span className="size-5 rounded-full bg-stone-200 ring-1 ring-stone-300" aria-hidden="true" />
    : <StatusIcon status={status} />
  return <span className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600">{swatch}{children}</span>
}

function ProgressBar({ progress }: { progress: SectionProgress }) {
  if (progress.total === 0) return <div className="h-2.5 rounded-full bg-stone-200" />
  const segment = (value: number) => `${(value / progress.total) * 100}%`
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-200" role="img" aria-label={`${progress.attempted} of ${progress.total} attempted: ${progress.clean} solved cleanly, ${progress.retried} solved after retry, ${progress.missed} missed`}>
      <span className="bg-emerald-800" style={{ width: segment(progress.clean) }} />
      <span className="bg-emerald-300" style={{ width: segment(progress.retried) }} />
      <span className="bg-rose-700" style={{ width: segment(progress.missed) }} />
    </div>
  )
}

function SectionProgressRow({ index, section, progress, selected, onSelect }: {
  index: number
  section: CoachSection
  progress: SectionProgress
  selected: boolean
  onSelect: () => void
}) {
  const percent = progress.total === 0 ? 0 : Math.round((progress.attempted / progress.total) * 100)
  return (
    <li>
      <button type="button" onClick={onSelect} disabled={progress.total === 0} aria-pressed={selected} className={`grid w-full gap-3 px-5 py-4 text-left transition sm:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.2fr)_auto] sm:items-center sm:px-7 ${progress.total === 0 ? 'cursor-not-allowed text-stone-400' : 'cursor-pointer hover:bg-stone-50'} ${selected ? 'bg-amber-50 hover:bg-amber-50' : ''}`}>
        <span className="min-w-0">
          <span className={`block text-xs font-bold uppercase tracking-[0.08em] ${selected ? 'text-amber-800' : 'text-stone-500'}`}>Section {index + 1}</span>
          <span className="mt-0.5 block font-bold text-stone-950">{section.title}</span>
        </span>
        <span className="grid gap-1.5">
          <ProgressBar progress={progress} />
          <span className="text-xs font-medium text-stone-500">{progress.total === 0 ? 'No puzzles available yet' : `${progress.attempted} of ${progress.total} attempted · ${percent}%`}</span>
        </span>
        {progress.total > 0 ? (
          <span className={`flex items-center justify-end gap-2 text-sm font-bold ${selected ? 'text-amber-900' : 'text-stone-600'}`}>
            {selected ? 'Viewing details' : 'View details'}
            <svg viewBox="0 0 24 24" className={`size-4 fill-none stroke-current transition ${selected ? 'rotate-90' : ''}`} strokeWidth="2.5" aria-hidden="true"><path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        ) : null}
      </button>
    </li>
  )
}

export default function SharedProgress({ books }: SharedProgressProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookSlug, setBookSlug] = useState(books[0]?.slug ?? '')
  const [sectionSlug, setSectionSlug] = useState<string | null>(null)
  const [rangeStart, setRangeStart] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('book')
  const [showDateTime, setShowDateTime] = useState(false)
  const [showSolvingTime, setShowSolvingTime] = useState(true)

  const catalog = useMemo(() => {
    const entries = new Map<string, CatalogEntry>()
    for (const book of books) {
      for (const section of book.sections) {
        section.puzzles.forEach((puzzle, puzzleIndex) => entries.set(puzzle.id, { ...puzzle, bookSlug: book.slug, sectionSlug: section.slug, puzzleIndex }))
      }
    }
    return entries
  }, [books])

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedBook = books.find((book) => book.slug === params.get('book'))
    if (!requestedBook) return
    setBookSlug(requestedBook.slug)
    const requestedSection = requestedBook.sections.find((section) => section.slug === params.get('section'))
    if (requestedSection) setSectionSlug(requestedSection.slug)
  }, [books])

  const summaries = useMemo(() => {
    const attemptsByPuzzle = new Map<string, Attempt[]>()
    for (const attempt of attempts) {
      const existing = attemptsByPuzzle.get(attempt.puzzleId)
      if (existing) existing.push(attempt)
      else attemptsByPuzzle.set(attempt.puzzleId, [attempt])
    }
    const result: PuzzleSummary[] = []
    for (const [puzzleId, puzzleAttempts] of attemptsByPuzzle) {
      const entry = catalog.get(puzzleId)
      if (!entry) continue
      const correctAttempt = puzzleAttempts.findLast((attempt) => attempt.result === 'correct')
      const failedAttempts = puzzleAttempts.filter((attempt) => attempt.result !== 'correct')
      const latestAttempt = puzzleAttempts.at(-1)!
      result.push({
        ...entry,
        title: latestAttempt.puzzleTitle || entry.title,
        move: correctAttempt?.move ?? latestAttempt.move,
        status: correctAttempt ? (failedAttempts.length > 0 ? 'retried' : 'clean') : 'missed',
        attempts: puzzleAttempts,
        failedMoves: failedAttempts.filter((attempt) => attempt.result === 'incorrect').map((attempt) => attempt.move),
        latestAttempt,
      })
    }
    return result
  }, [attempts, catalog])

  const summariesByPuzzle = useMemo(() => new Map(summaries.map((summary) => [summary.id, summary])), [summaries])
  const activeBook = books.find((book) => book.slug === bookSlug) ?? books[0]
  const activeSection = activeBook?.sections.find((section) => section.slug === sectionSlug) ?? null
  const bookSummaries = summaries.filter((summary) => summary.bookSlug === activeBook?.slug)
  const sectionSummaries = bookSummaries.filter((summary) => summary.sectionSlug === activeSection?.slug)

  const progressFor = useCallback((puzzles: CoachPuzzle[]): SectionProgress => {
    if (puzzles.length === 0) return EMPTY_PROGRESS
    let clean = 0; let retried = 0; let missed = 0
    for (const puzzle of puzzles) {
      const status = summariesByPuzzle.get(puzzle.id)?.status
      if (status === 'clean') clean += 1
      else if (status === 'retried') retried += 1
      else if (status === 'missed') missed += 1
    }
    return { attempted: clean + retried + missed, clean, retried, missed, total: puzzles.length }
  }, [summariesByPuzzle])

  const bookPuzzles = activeBook?.sections.flatMap((section) => section.puzzles) ?? []
  const bookProgress = progressFor(bookPuzzles)
  const rangeEnd = Math.min(rangeStart + RANGE_SIZE, activeSection?.puzzles.length ?? 0)
  const visiblePuzzles = activeSection?.puzzles.slice(rangeStart, rangeEnd) ?? []
  const rangeStarts = activeSection ? Array.from({ length: Math.ceil(activeSection.puzzles.length / RANGE_SIZE) }, (_, index) => index * RANGE_SIZE) : []
  const rangeFirstNumber = activeSection?.puzzles[rangeStart] ? puzzleDisplayNumber(activeSection.puzzles[rangeStart], rangeStart) : 0
  const rangeLastNumber = activeSection?.puzzles[rangeEnd - 1] ? puzzleDisplayNumber(activeSection.puzzles[rangeEnd - 1], rangeEnd - 1) : 0

  const visibleSummaries = useMemo(() => sectionSummaries
    .filter((summary) => statusFilter === 'all' || summary.status === statusFilter)
    .toSorted((left, right) => sortOrder === 'recent'
      ? new Date(right.latestAttempt.checkedAt).getTime() - new Date(left.latestAttempt.checkedAt).getTime()
      : left.puzzleIndex - right.puzzleIndex), [sectionSummaries, sortOrder, statusFilter])

  const updateUrl = (nextBook: string, nextSection: string | null) => {
    const params = new URLSearchParams()
    params.set('book', nextBook)
    if (nextSection) params.set('section', nextSection)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }

  const chooseBook = (nextBook: string) => {
    setBookSlug(nextBook); setSectionSlug(null); setRangeStart(0); setStatusFilter('all')
    updateUrl(nextBook, null)
  }

  const chooseSection = (nextSection: string) => {
    setSectionSlug(nextSection); setRangeStart(0); setStatusFilter('all')
    updateUrl(activeBook.slug, nextSection)
  }

  const chooseStatusFilter = (filter: StatusFilter) => setStatusFilter(filter)

  if (loading) return <p className="rounded-2xl border border-stone-200 bg-white p-8 text-stone-600">Loading results…</p>
  if (error) return <section className="rounded-2xl border border-rose-200 bg-white p-8"><h2 className="text-2xl font-bold text-stone-950">Results unavailable</h2><p className="mt-2 text-rose-800">{error}</p></section>
  if (!activeBook) return <p className="rounded-2xl border border-stone-200 bg-white p-8 text-stone-600">No puzzle books are available.</p>

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-950">Book progress</h2>
            <p className="mt-1 text-sm text-stone-500">Choose a book, then select a section for details.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5 text-sm font-bold text-stone-700">
              Book
              <select value={activeBook.slug} onChange={(event) => chooseBook(event.currentTarget.value)} className="max-w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200 sm:min-w-72">
                {books.map((book) => <option key={book.slug} value={book.slug}>{book.title}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void loadResults()} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-bold text-stone-800 transition hover:border-stone-500 hover:bg-stone-50">Refresh</button>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(90px,0.6fr))] sm:items-center sm:px-7">
          <div>
            <div className="flex items-baseline justify-between gap-3"><p className="font-bold text-stone-950">Overall completion</p><p className="text-sm font-bold text-stone-700">{bookProgress.total === 0 ? 0 : Math.round((bookProgress.attempted / bookProgress.total) * 100)}%</p></div>
            <div className="mt-2"><ProgressBar progress={bookProgress} /></div>
            <p className="mt-1.5 text-xs font-medium text-stone-500">{bookProgress.attempted} of {bookProgress.total} puzzles attempted</p>
          </div>
          {([[bookProgress.clean, 'Clean', 'text-emerald-800'], [bookProgress.retried, 'Retried', 'text-emerald-700'], [bookProgress.missed, 'Missed', 'text-rose-800']] as const).map(([value, label, color]) => (
            <div key={label} className="border-l border-stone-200 pl-4"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-sm text-stone-500">{label}</p></div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-5 sm:px-7"><h2 className="text-xl font-bold tracking-[-0.015em] text-stone-950">Sections</h2><p className="mt-1 text-sm text-stone-500">Progress shows both completion and outcome.</p></div>
        <ol className="divide-y divide-stone-200">
          {activeBook.sections.map((section, index) => (
            <Fragment key={section.slug}>
              <SectionProgressRow index={index} section={section} progress={progressFor(section.puzzles)} selected={activeSection?.slug === section.slug} onSelect={() => chooseSection(section.slug)} />
              {activeSection?.slug === section.slug ? (
                <li id="section-details" className="bg-stone-50/70">
                  <div className="border-l-4 border-amber-700">
                    {rangeStarts.length > 1 ? (
                      <div className="border-b border-stone-200 px-5 py-4 sm:px-7"><p className="mb-2 text-sm font-bold text-stone-700">Puzzle range</p><div className="flex gap-2 overflow-x-auto pb-1">{rangeStarts.map((start) => { const end = Math.min(start + RANGE_SIZE, activeSection.puzzles.length); return <button key={start} type="button" onClick={() => setRangeStart(start)} aria-pressed={rangeStart === start} className={`shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${rangeStart === start ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>{puzzleDisplayNumber(activeSection.puzzles[start], start)}–{puzzleDisplayNumber(activeSection.puzzles[end - 1], end - 1)}</button> })}</div></div>
                    ) : null}

                    <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-bold text-stone-950">Puzzles {rangeFirstNumber}–{rangeLastNumber}</h3><p className="mt-1 text-sm text-stone-500">{progressFor(activeSection.puzzles).attempted} of {activeSection.puzzles.length} puzzles attempted</p></div><p className="text-sm text-stone-500">Select a puzzle to review it</p></div>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-10">
                        {visiblePuzzles.map((puzzle, localIndex) => {
                          const status = summariesByPuzzle.get(puzzle.id)?.status ?? 'not-attempted'
                          const number = puzzleDisplayNumber(puzzle, rangeStart + localIndex)
                          const style = status === 'clean' ? 'border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-700' : status === 'retried' ? 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100' : status === 'missed' ? 'border-rose-800 bg-rose-800 text-white hover:bg-rose-700' : 'border-stone-300 bg-stone-100 text-stone-700 hover:border-stone-500 hover:bg-white'
                          return <a key={puzzle.id} href={`/puzzles/${activeBook.slug}/${activeSection.slug}/puzzle/${puzzle.id}?review=coach`} aria-label={`Review Puzzle ${number}: ${statusLabels[status]}`} className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-bold transition ${style}`}>{number}<StatusIcon status={status} /></a>
                        })}
                      </div>
                    </div>

                    <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div><h3 className="text-lg font-bold text-stone-950">Puzzle results</h3><p className="mt-1 text-sm text-stone-500">Showing {visibleSummaries.length} of {sectionSummaries.length} attempted puzzles</p></div>
                        <div className="flex flex-wrap gap-2" aria-label="Filter puzzle results">{([['all', 'All'], ['clean', 'Clean'], ['retried', 'Retried'], ['missed', 'Missed']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => chooseStatusFilter(value)} aria-pressed={statusFilter === value} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${statusFilter === value ? 'border-amber-800 bg-amber-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>{label}</button>)}</div>
                      </div>
                      <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-x-5 gap-y-3">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-600"><input type="checkbox" checked={showDateTime} onChange={(event) => setShowDateTime(event.currentTarget.checked)} className="size-4 accent-amber-800" /> Show date &amp; time</label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-600"><input type="checkbox" checked={showSolvingTime} onChange={(event) => setShowSolvingTime(event.currentTarget.checked)} className="size-4 accent-amber-800" /> Show solving time</label>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium text-stone-600">Sort<select value={sortOrder} onChange={(event) => setSortOrder(event.currentTarget.value as SortOrder)} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-semibold text-stone-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200"><option value="book">Book order</option><option value="recent">Most recent</option></select></label>
                      </div>
                    </div>

                    {visibleSummaries.length === 0 ? (
                      <p className="m-5 rounded-xl bg-white px-4 py-10 text-center text-stone-600 sm:m-7">{sectionSummaries.length === 0 ? 'No attempts have been recorded in this section.' : 'No puzzle results match this filter.'}</p>
                    ) : (
                      <ol className="divide-y divide-stone-200 bg-white">{visibleSummaries.map((summary) => {
                        const failedCount = summary.attempts.filter((attempt) => attempt.result !== 'correct').length
                        const answerWasViewed = summary.attempts.some((attempt) => attempt.result === 'answer-viewed')
                        const detailParts = [showDateTime ? new Date(summary.latestAttempt.checkedAt).toLocaleString() : null, showSolvingTime && summary.latestAttempt.durationMs !== undefined ? formatDuration(summary.latestAttempt.durationMs) : null, showSolvingTime && summary.latestAttempt.pauseCount ? `${summary.latestAttempt.pauseCount} ${summary.latestAttempt.pauseCount === 1 ? 'pause' : 'pauses'}` : null, showSolvingTime && summary.latestAttempt.restartCount ? `${summary.latestAttempt.restartCount} ${summary.latestAttempt.restartCount === 1 ? 'restart' : 'restarts'}` : null].filter(Boolean)
                        return <li key={summary.id}><a href={`/puzzles/${activeBook.slug}/${activeSection.slug}/puzzle/${summary.id}?review=coach`} className="grid gap-3 px-5 py-4 transition hover:bg-amber-50/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7"><div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="font-bold text-stone-950">{summary.title}</p><span className="font-semibold text-stone-700">{summary.move}</span></div>{summary.status === 'retried' ? <p className="mt-1 text-sm text-stone-600">{failedCount} failed {failedCount === 1 ? 'attempt' : 'attempts'}{summary.failedMoves.length > 0 ? `: ${summary.failedMoves.join(', ')}` : ''}{answerWasViewed ? `${summary.failedMoves.length > 0 ? ' · ' : ': '}answer viewed` : ''}</p> : summary.status === 'missed' && answerWasViewed && summary.move.toLowerCase() !== 'answer viewed' ? <p className="mt-1 text-sm text-amber-800">Answer viewed</p> : null}{detailParts.length > 0 ? <p className="mt-1 text-sm text-stone-500">{detailParts.join(' · ')}</p> : null}</div><div className={`flex items-center gap-2 text-sm font-bold ${summary.status === 'missed' ? 'text-rose-800' : 'text-emerald-800'}`}><StatusIcon status={summary.status} />{statusLabels[summary.status]}<span aria-hidden="true">→</span></div></a></li>
                      })}</ol>
                    )}
                  </div>
                </li>
              ) : null}
            </Fragment>
          ))}
        </ol>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-7">
          <LegendItem status="clean">Solved cleanly</LegendItem><LegendItem status="retried">Solved after retry</LegendItem><LegendItem status="missed">Missed</LegendItem><LegendItem status="not-attempted">Not attempted</LegendItem>
        </div>
      </section>

    </div>
  )
}

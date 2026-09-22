import { useEffect, useMemo, useState } from 'react'
import type { PuzzleCollection } from '../data/puzzleCollections'
import { getCachedPracticeAttempts } from '../lib/practiceClient'
import {
  getPuzzleStatuses,
  summarizePuzzleStatuses,
  type PracticeAttempt,
} from '../lib/puzzleProgress'
import PuzzleProgressBar from './PuzzleProgressBar'

type PuzzleCollectionProgressProps = {
  collection: PuzzleCollection
}

export default function PuzzleCollectionProgress({ collection }: PuzzleCollectionProgressProps) {
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const sectionProgress = useMemo(() => collection.sections.map((section) => {
    const statuses = getPuzzleStatuses(section.puzzles, attempts)
    const progress = summarizePuzzleStatuses(statuses)
    const firstMissed = statuses.findIndex((status) => status === 'missed')
    const firstNotAttempted = statuses.findIndex((status) => status === 'not-attempted')
    const continueIndex = firstMissed >= 0 ? firstMissed : firstNotAttempted >= 0 ? firstNotAttempted : 0

    return { section, progress, continueIndex }
  }), [attempts, collection.sections])

  const availableCount = collection.sections.filter((section) => section.puzzles.length > 0).length
  const bookProgress = sectionProgress.reduce((total, section) => ({
    attempted: total.attempted + section.progress.attempted,
    clean: total.clean + section.progress.clean,
    retried: total.retried + section.progress.retried,
    missed: total.missed + section.progress.missed,
    total: total.total + section.progress.total,
  }), { attempted: 0, clean: 0, retried: 0, missed: 0, total: 0 })
  const bookPercent = bookProgress.total === 0
    ? 0
    : Math.round((bookProgress.attempted / bookProgress.total) * 100)

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
          <div>
            <div className="min-h-7">
              {loading
                ? <span className="block h-5 w-44 animate-pulse rounded bg-stone-200"><span className="sr-only">Loading progress</span></span>
                : <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-950">Your book progress</h2>}
            </div>
            <p className="mt-1 text-sm text-stone-500">Progress across {availableCount} available sections.</p>
            {error ? <p className="mt-1 text-sm font-semibold text-rose-800">{error}</p> : null}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 px-5 py-5 sm:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(90px,0.6fr))] sm:items-center sm:px-7">
          <div className="col-span-3 sm:col-span-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-stone-950">Overall completion</p>
              <p className="text-sm font-bold text-stone-700">{bookPercent}%</p>
            </div>
            <div className="mt-2"><PuzzleProgressBar progress={bookProgress} /></div>
            <p className="mt-1.5 text-xs font-medium text-stone-500">{bookProgress.attempted} of {bookProgress.total} puzzles attempted</p>
          </div>
          {([
            [bookProgress.clean, 'Clean', 'text-emerald-800'],
            [bookProgress.retried, 'Retried', 'text-emerald-700'],
            [bookProgress.missed, 'Missed', 'text-rose-800'],
          ] as const).map(([value, label, color]) => (
            <div key={label} className="border-l border-stone-200 pl-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-sm text-stone-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <ol className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-200">
        {sectionProgress.map(({ section, progress, continueIndex }, index) => {
          const isAvailable = section.puzzles.length > 0
          const sectionHref = `/puzzles/${collection.slug}/${section.slug}`
          const nextPuzzle = section.puzzles[continueIndex]
          const continueHref = nextPuzzle
            ? `/puzzles/${collection.slug}/${section.slug}/puzzle/${nextPuzzle.id}`
            : sectionHref
          const percent = progress.total === 0 ? 0 : Math.round((progress.attempted / progress.total) * 100)
          const actionLabel = progress.attempted === 0
            ? 'Start'
            : progress.missed > 0 || progress.attempted === progress.total
              ? 'Review'
              : 'Continue'

          return (
            <li key={section.slug}>
              <article className={`relative grid gap-4 p-5 transition sm:p-6 lg:grid-cols-[3rem_minmax(240px,1fr)_minmax(260px,0.9fr)_auto] lg:items-center ${isAvailable ? 'bg-white hover:bg-amber-50/40' : 'bg-stone-50/70'}`}>
                {isAvailable ? (
                  <a href={sectionHref} className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-800" aria-label={`View ${section.title}`} />
                ) : null}
                <div className="flex items-start gap-4 lg:contents">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${isAvailable ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-500'}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.11em] text-stone-500">{section.workbookPages}</p>
                    <h2 className={`mt-1 text-xl font-bold tracking-[-0.015em] ${isAvailable ? 'text-stone-950' : 'text-stone-600'}`}>{section.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">{section.description}</p>
                  </div>
                </div>
                {isAvailable ? (
                  <div className="z-10 min-w-0">
                    <PuzzleProgressBar progress={progress} className="h-2" />
                    <p className="mt-1.5 text-xs font-medium text-stone-500">{progress.attempted} of {progress.total} attempted · {percent}%</p>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-stone-600">
                      <span><strong className="text-emerald-800">{progress.clean}</strong> clean</span>
                      <span><strong className="text-emerald-700">{progress.retried}</strong> retried</span>
                      <span><strong className="text-rose-800">{progress.missed}</strong> missed</span>
                    </p>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-stone-500 lg:text-right">Coming soon</span>
                )}
                {isAvailable ? (
                  <a href={continueHref} className="z-10 inline-flex w-fit items-center gap-2 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800">
                    {actionLabel}
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="2.5"><path d="M6 12h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                ) : <span aria-hidden="true" />}
              </article>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

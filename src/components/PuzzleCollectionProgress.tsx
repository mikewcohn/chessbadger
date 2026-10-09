import { useEffect, useMemo, useState } from 'react'
import type { PuzzleCollection } from '../types/puzzleCollections'
import { getCachedPracticeAttempts } from '../lib/practiceClient'
import {
  getPuzzleStatuses,
  summarizePuzzleStatuses,
  type PracticeAttempt,
} from '../lib/puzzleProgress'
import { retryPuzzleHref, retrySearch, saveRetryQueue, type RetryStatus } from '../lib/retryQueue'
import PuzzleProgressBar from './PuzzleProgressBar'

type PuzzleCollectionProgressProps = {
  collection: PuzzleCollection
}

export default function PuzzleCollectionProgress({ collection }: PuzzleCollectionProgressProps) {
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeUnsolved, setIncludeUnsolved] = useState(true)
  const [includeRetried, setIncludeRetried] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      fetch('/api/practice/attempts', { signal: controller.signal }),
      fetch('/api/players/me', { signal: controller.signal }),
    ])
      .then(async ([attemptsResponse, playerResponse]) => {
        const data = await attemptsResponse.json() as {
          attempts?: PracticeAttempt[]
          error?: string
        }
        const playerData = await playerResponse.json() as { player: { handle: string } | null }
        if (!attemptsResponse.ok || !data.attempts) throw new Error(data.error ?? 'Could not load puzzle progress.')
        setAttempts([...data.attempts, ...getCachedPracticeAttempts()])
        setSignedIn(Boolean(playerData.player))
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

    return { section, progress, continueIndex, statuses }
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
  const showSavedProgress = signedIn !== false || attempts.length > 0
  const selectedRetryStatuses = [includeUnsolved ? 'missed' : null, includeRetried ? 'retried' : null]
    .filter((status): status is RetryStatus => status !== null)
  const retryEntries = sectionProgress.flatMap(({ section, statuses }) => statuses.flatMap((status, index) => (
    ((includeUnsolved && status === 'missed') || (includeRetried && status === 'retried'))
      ? [{ puzzleId: section.puzzles[index].id, sectionSlug: section.slug }]
      : []
  )))
  const retryQuery = selectedRetryStatuses.length > 0 ? retrySearch(selectedRetryStatuses, 'collection') : ''
  const retryHref = retryEntries.length > 0
    ? retryPuzzleHref(collection.slug, retryEntries[0], retryQuery)
    : null

  const beginRetry = () => saveRetryQueue({
    collectionSlug: collection.slug,
    scope: 'collection',
    statuses: selectedRetryStatuses,
    entries: retryEntries,
  })

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className={`${showSavedProgress ? 'border-b border-stone-200' : ''} px-5 py-5 sm:px-7`}>
          <div>
            <div className="min-h-7">
              {loading
                ? <span className="block h-5 w-44 animate-pulse rounded bg-stone-200"><span className="sr-only">Loading progress</span></span>
                : <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-950">{signedIn === false ? attempts.length > 0 ? 'This session’s progress' : 'See your saved progress' : 'Your book progress'}</h2>}
            </div>
            {signedIn === false ? (
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {attempts.length > 0 ? 'These results are only saved in this browser session. ' : null}
                <a href="/players" className="font-bold text-amber-900 underline decoration-2 underline-offset-2 hover:text-amber-700">Sign in or claim a name</a>{' '}
                {attempts.length > 0 ? 'to keep them and see your full history.' : 'to see your puzzle history and continue where you left off.'}
              </p>
            ) : <p className="mt-1 text-sm text-stone-500">Progress across {availableCount} available sections.</p>}
            {error ? <p className="mt-1 text-sm font-semibold text-rose-800">{error}</p> : null}
          </div>
        </div>
        {showSavedProgress ? <div className="grid grid-cols-3 gap-4 px-5 py-5 sm:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(90px,0.6fr))] sm:items-center sm:px-7">
          <div className="col-span-3 sm:col-span-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-stone-950">Overall completion</p>
              <p className="text-sm font-bold text-stone-700">{bookPercent}%</p>
            </div>
            <div className="mt-2"><PuzzleProgressBar progress={bookProgress} /></div>
            <p className="mt-1.5 text-xs font-medium text-stone-500">{bookProgress.attempted} of {bookProgress.total} puzzles attempted</p>
          </div>
          {([
            [bookProgress.clean, 'First try', 'text-emerald-800'],
            [bookProgress.retried, 'After retry', 'text-emerald-700'],
            [bookProgress.missed, 'Not solved', 'text-rose-800'],
          ] as const).map(([value, label, color]) => (
            <div key={label} className="border-l border-stone-200 pl-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-sm text-stone-500">{label}</p>
            </div>
          ))}
        </div> : null}
      </section>

      {showSavedProgress && bookProgress.missed + bookProgress.retried > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-amber-950">Retry puzzles across this book</h2>
            <p className="mt-1 text-sm text-amber-900">Clear every red puzzle, then turn every result dark green.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-stone-800">
                <input type="checkbox" checked={includeUnsolved} onChange={(event) => setIncludeUnsolved(event.currentTarget.checked)} className="size-4 cursor-pointer accent-amber-800" />
                Unsolved or skipped ({bookProgress.missed})
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-stone-800">
                <input type="checkbox" checked={includeRetried} onChange={(event) => setIncludeRetried(event.currentTarget.checked)} className="size-4 cursor-pointer accent-amber-800" />
                Solved after multiple attempts ({bookProgress.retried})
              </label>
            </div>
          </div>
          {retryHref ? (
            <a href={retryHref} onClick={beginRetry} className="mt-4 inline-flex w-full justify-center rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 sm:mt-0 sm:w-auto sm:shrink-0">
              Retry {retryEntries.length} {retryEntries.length === 1 ? 'puzzle' : 'puzzles'}
            </a>
          ) : (
            <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-lg bg-stone-300 px-5 py-2.5 text-sm font-bold text-stone-600 sm:mt-0 sm:w-auto sm:shrink-0">
              Select puzzles
            </button>
          )}
        </section>
      ) : null}

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
                {isAvailable && showSavedProgress ? (
                  <div className="z-10 min-w-0">
                    <PuzzleProgressBar progress={progress} className="h-2" />
                    <p className="mt-1.5 text-xs font-medium text-stone-500">{progress.attempted} of {progress.total} attempted · {percent}%</p>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-stone-600">
                      <span><strong className="text-emerald-800">{progress.clean}</strong> first try</span>
                      <span><strong className="text-emerald-700">{progress.retried}</strong> after retry</span>
                      <span><strong className="text-rose-800">{progress.missed}</strong> not solved</span>
                    </p>
                  </div>
                ) : !isAvailable ? (
                  <span className="text-sm font-semibold text-stone-500 lg:text-right">Coming soon</span>
                ) : <span className="z-10 text-sm font-semibold text-stone-500">{section.puzzles.length} puzzles</span>}
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

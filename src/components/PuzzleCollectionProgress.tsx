import { useEffect, useMemo, useState } from 'react'
import type { PuzzleCollection, PuzzleSection } from '../data/puzzleCollections'
import { getCachedPracticeAttempts } from '../lib/practiceClient'

type Attempt = {
  puzzleId: string
  result: 'correct' | 'incorrect' | 'answer-viewed'
}

type PuzzleStatus = 'solved' | 'solved-after-retry' | 'missed' | 'not-attempted'

type PuzzleCollectionProgressProps = {
  collection: PuzzleCollection
}

const getStatuses = (section: PuzzleSection, attempts: Attempt[]) => {
  const attemptsByPuzzle = new Map<string, Attempt[]>()
  for (const attempt of attempts) {
    attemptsByPuzzle.set(attempt.puzzleId, [
      ...(attemptsByPuzzle.get(attempt.puzzleId) ?? []),
      attempt,
    ])
  }

  return section.puzzles.map<PuzzleStatus>((puzzle) => {
    const puzzleAttempts = attemptsByPuzzle.get(puzzle.id) ?? []
    const hasIncorrectAttempt = puzzleAttempts.some((attempt) => attempt.result !== 'correct')
    const hasCorrectAttempt = puzzleAttempts.some((attempt) => attempt.result === 'correct')
    if (hasIncorrectAttempt && hasCorrectAttempt) return 'solved-after-retry'
    if (hasIncorrectAttempt) return 'missed'
    if (hasCorrectAttempt) return 'solved'
    return 'not-attempted'
  })
}

export default function PuzzleCollectionProgress({ collection }: PuzzleCollectionProgressProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
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
          attempts?: Attempt[]
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
    const statuses = getStatuses(section, attempts)
    const solved = statuses.filter((status) => status === 'solved' || status === 'solved-after-retry').length
    const firstMissed = statuses.findIndex((status) => status === 'missed')
    const firstNotAttempted = statuses.findIndex((status) => status === 'not-attempted')
    const continueIndex = firstMissed >= 0 ? firstMissed : firstNotAttempted >= 0 ? firstNotAttempted : 0

    return { section, statuses, solved, continueIndex }
  }), [attempts, collection.sections])

  const availableCount = collection.sections.filter((section) => section.puzzles.length > 0).length
  const solvedCount = sectionProgress.reduce((total, progress) => total + progress.solved, 0)
  const totalPuzzleCount = collection.puzzles.length

  return (
    <div className="grid gap-6">
      <section className="border-y border-stone-200 bg-white px-1 py-5 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="min-h-6">
              {loading
                ? <span className="block h-5 w-44 animate-pulse rounded bg-stone-200"><span className="sr-only">Loading progress</span></span>
                : <p className="font-bold text-amber-900">Your puzzle progress</p>}
            </div>
            {error ? <p className="mt-1 text-sm font-semibold text-rose-800">{error}</p> : null}
          </div>
          <dl className="grid grid-cols-3 gap-5 sm:gap-9">
            <div>
              <dd className="text-2xl font-bold text-stone-950">{availableCount}</dd>
              <dt className="text-sm font-medium text-stone-500">sections</dt>
            </div>
            <div>
              <dd className="text-2xl font-bold text-stone-950">{totalPuzzleCount}</dd>
              <dt className="text-sm font-medium text-stone-500">puzzles</dt>
            </div>
            <div>
              <dd className="text-2xl font-bold text-emerald-800">{solvedCount}</dd>
              <dt className="text-sm font-medium text-stone-500">solved</dt>
            </div>
          </dl>
        </div>
      </section>

      <ol className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-200">
        {sectionProgress.map(({ section, statuses, solved, continueIndex }, index) => {
          const isAvailable = section.puzzles.length > 0
          const sectionHref = `/puzzles/${collection.slug}/${section.slug}`
          const nextPuzzle = section.puzzles[continueIndex]
          const continueHref = nextPuzzle
            ? `/puzzles/${collection.slug}/${section.slug}/puzzle/${nextPuzzle.id}`
            : sectionHref
          const attempted = statuses.filter((status) => status !== 'not-attempted').length

          return (
            <li key={section.slug}>
              <article className={`relative grid gap-4 p-5 transition sm:p-6 lg:grid-cols-[3rem_minmax(0,1fr)_9rem_auto] lg:items-center ${isAvailable ? 'bg-white hover:bg-amber-50/40' : 'bg-stone-50/70'}`}>
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
                    {isAvailable ? (
                      <div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-stone-200" aria-label={`${solved} of ${section.puzzles.length} puzzles solved`}>
                        <div className="h-full rounded-full bg-emerald-700" style={{ width: `${section.puzzles.length ? (solved / section.puzzles.length) * 100 : 0}%` }} />
                      </div>
                    ) : null}
                  </div>
                </div>
                {isAvailable ? (
                  <div className="z-10 flex gap-5 text-sm text-stone-600 lg:block lg:text-right">
                    <p><strong className="font-semibold text-stone-900">{section.puzzles.length}</strong> puzzles</p>
                    <p className="lg:mt-1"><strong className="font-semibold text-emerald-800">{solved}</strong> solved</p>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-stone-500 lg:text-right">Coming soon</span>
                )}
                {isAvailable ? (
                  <a href={continueHref} className="z-10 inline-flex w-fit items-center gap-2 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800">
                    {attempted === 0 ? 'Start' : solved === section.puzzles.length ? 'Review' : 'Continue'}
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

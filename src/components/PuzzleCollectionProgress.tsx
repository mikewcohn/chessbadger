import { useEffect, useMemo, useState } from 'react'
import type { PuzzleCollection, PuzzleSection } from '../data/puzzleCollections'

type Attempt = {
  puzzleId: string
  result: 'correct' | 'incorrect'
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
    const hasIncorrectAttempt = puzzleAttempts.some((attempt) => attempt.result === 'incorrect')
    const hasCorrectAttempt = puzzleAttempts.some((attempt) => attempt.result === 'correct')
    if (hasIncorrectAttempt && hasCorrectAttempt) return 'solved-after-retry'
    if (hasIncorrectAttempt) return 'missed'
    if (hasCorrectAttempt) return 'solved'
    return 'not-attempted'
  })
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

  const withPracticeParams = (href: string) => {
    if (!studentId || !practiceKey) return href
    const params = new URLSearchParams({ student: studentId, key: practiceKey })
    return `${href}?${params.toString()}`
  }

  return (
    <div className="grid gap-7">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-900/5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-black text-amber-900">
              {loading
                ? 'Loading progress…'
                : studentName
                  ? `${studentName} · Shared with coach`
                  : 'Choose a section to begin'}
            </p>
            {error ? <p className="mt-2 text-sm font-bold text-rose-800">{error}</p> : null}
          </div>
          <dl className="grid grid-cols-3 gap-5 sm:gap-10">
            <div>
              <dd className="text-3xl font-black text-stone-950">{collection.sections.length}</dd>
              <dt className="text-sm font-bold text-stone-500">sections</dt>
            </div>
            <div>
              <dd className="text-3xl font-black text-stone-950">{availableCount}</dd>
              <dt className="text-sm font-bold text-stone-500">available</dt>
            </div>
            <div>
              <dd className="text-3xl font-black text-emerald-800">{solvedCount}</dd>
              <dt className="text-sm font-bold text-stone-500">solved</dt>
            </div>
          </dl>
        </div>
      </section>

      <ol className="grid gap-4 md:grid-cols-2">
        {sectionProgress.map(({ section, statuses, solved, continueIndex }, index) => {
          const isAvailable = section.puzzles.length > 0
          const sectionHref = `/puzzles/${collection.slug}/${section.slug}`
          const nextPuzzle = section.puzzles[continueIndex]
          const continueHref = nextPuzzle
            ? `/puzzles/${collection.slug}/${section.slug}/puzzle/${nextPuzzle.id}`
            : sectionHref
          const attempted = statuses.filter((status) => status !== 'not-attempted').length

          return (
            <li key={section.slug} className="flex">
              <article className={`flex w-full flex-col rounded-3xl border p-6 shadow-sm sm:p-7 ${isAvailable ? 'border-stone-200 bg-white' : 'border-stone-200 bg-stone-50'}`}>
                <div className="flex items-start gap-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-black ${isAvailable ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-500'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.13em] text-stone-500">{section.workbookPages}</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">{section.title}</h2>
                  </div>
                </div>
                <p className="mt-4 text-stone-600">{section.description}</p>

                <div className="mt-auto pt-6">
                  {isAvailable ? (
                    <>
                      <div className="mb-4 flex items-center justify-between gap-4 text-sm font-bold text-stone-600">
                        <span>{section.puzzles.length} puzzles</span>
                        <span>{solved} solved</span>
                      </div>
                      <div className="mb-5 h-2 overflow-hidden rounded-full bg-stone-200" aria-label={`${solved} of ${section.puzzles.length} puzzles solved`}>
                        <div className="h-full rounded-full bg-emerald-700" style={{ width: `${section.puzzles.length ? (solved / section.puzzles.length) * 100 : 0}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <a href={withPracticeParams(sectionHref)} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-black text-stone-800 transition hover:border-stone-500 hover:bg-stone-50">
                          View section
                        </a>
                        <a href={withPracticeParams(continueHref)} className="rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-700">
                          {attempted === 0 ? 'Start' : solved === section.puzzles.length ? 'Review' : 'Continue'}
                        </a>
                      </div>
                    </>
                  ) : (
                    <span className="inline-flex rounded-full bg-stone-200 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-stone-600">
                      Coming soon
                    </span>
                  )}
                </div>
              </article>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

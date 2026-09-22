export type PracticeAttemptSummary = {
  puzzleId: string
  result: 'correct' | 'incorrect' | 'answer-viewed'
}

type CachedPracticeAttempt = PracticeAttemptSummary & {
  id: string
}

const ATTEMPTS_STORAGE_KEY = 'chessbadger.practice-attempts.v2'

const readCachedAttempts = (): CachedPracticeAttempt[] => {
  try {
    const saved = window.sessionStorage.getItem(ATTEMPTS_STORAGE_KEY)
    if (!saved) return []
    const attempts = JSON.parse(saved) as unknown
    if (!Array.isArray(attempts)) return []

    return attempts.filter((attempt): attempt is CachedPracticeAttempt => {
      if (!attempt || typeof attempt !== 'object') return false
      const candidate = attempt as Partial<CachedPracticeAttempt>
      return typeof candidate.id === 'string'
        && typeof candidate.puzzleId === 'string'
        && (candidate.result === 'correct'
          || candidate.result === 'incorrect'
          || candidate.result === 'answer-viewed')
    })
  } catch {
    return []
  }
}

export const getCachedPracticeAttempts = (): PracticeAttemptSummary[] =>
  readCachedAttempts()

export const cachePracticeAttempt = (attempt: PracticeAttemptSummary) => {
  const id = crypto.randomUUID()

  try {
    const attempts = [...readCachedAttempts(), { id, ...attempt }].slice(-100)
    window.sessionStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // Server-side tracking still works when browser storage is unavailable.
  }

  return id
}

export const removeCachedPracticeAttempt = (attemptId: string) => {
  try {
    const attempts = readCachedAttempts().filter((attempt) => attempt.id !== attemptId)
    window.sessionStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // Nothing else needs to happen when browser storage is unavailable.
  }
}

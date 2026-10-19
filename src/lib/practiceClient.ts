export type PracticeAttemptSummary = {
  puzzleId: string
  result: 'correct' | 'incorrect' | 'answer-viewed'
  sessionId?: string
  move?: string
  checkedAt?: string
  durationMs?: number
  pauseCount?: number
  restartCount?: number
}

export type CachedPracticeAttempt = PracticeAttemptSummary & {
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
        && (candidate.move === undefined || typeof candidate.move === 'string')
        && (candidate.sessionId === undefined || typeof candidate.sessionId === 'string')
        && (candidate.checkedAt === undefined || typeof candidate.checkedAt === 'string')
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

export const getTransferablePracticeAttempts = (): CachedPracticeAttempt[] =>
  readCachedAttempts().filter((attempt) => (
    typeof attempt.move === 'string'
    && typeof attempt.checkedAt === 'string'
  ))

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

const removeCachedPracticeAttemptIds = (attemptIds: string[]) => {
  const acceptedIds = new Set(attemptIds)
  try {
    const attempts = readCachedAttempts().filter((attempt) => !acceptedIds.has(attempt.id))
    window.sessionStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // Successful server imports remain saved even when browser storage is unavailable.
  }
}

export const transferCachedPracticeAttempts = async () => {
  const attempts = getTransferablePracticeAttempts()
  if (attempts.length === 0) return {imported: 0, alreadySaved: 0}

  const response = await fetch('/api/practice/import', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({attempts}),
  })
  const data = await response.json() as {
    imported?: number
    alreadySaved?: number
    acceptedIds?: string[]
    error?: string
  }
  if (!response.ok || !data.acceptedIds) {
    throw new Error(data.error ?? 'Could not save browser progress.')
  }

  removeCachedPracticeAttemptIds(data.acceptedIds)
  return {
    imported: data.imported ?? 0,
    alreadySaved: data.alreadySaved ?? 0,
  }
}

export const removeCachedPracticeAttemptsForPuzzles = (puzzleIds: string[]) => {
  const puzzleIdSet = new Set(puzzleIds)

  try {
    const attempts = readCachedAttempts().filter((attempt) => !puzzleIdSet.has(attempt.puzzleId))
    window.sessionStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // Nothing else needs to happen when browser storage is unavailable.
  }
}

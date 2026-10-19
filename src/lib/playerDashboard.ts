import type {PracticeAttempt} from './puzzleProgress'

const localDayKey = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
)

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addLocalDays = (date: Date, days: number) => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
)

export function buildPlayerDashboardStats(attempts: PracticeAttempt[], now = new Date()) {
  const datedAttempts = attempts.flatMap((attempt) => {
    const timestamp = attempt.checkedAt ? Date.parse(attempt.checkedAt) : Number.NaN
    return Number.isFinite(timestamp) ? [{attempt, timestamp}] : []
  })
  const weekStart = addLocalDays(now, -6).getTime()
  const recentAttempts = datedAttempts.filter(({timestamp}) => timestamp >= weekStart && timestamp <= now.getTime())
  const solvedThisWeek = new Set(
    recentAttempts
      .filter(({attempt}) => attempt.result === 'correct')
      .map(({attempt}) => attempt.puzzleId),
  ).size
  const activeTimeMs = recentAttempts.reduce(
    (total, {attempt}) => total + (attempt.durationMs ?? 0),
    0,
  )
  const practiceDays = new Set(datedAttempts.map(({timestamp}) => localDayKey(new Date(timestamp))))
  let streak = 0
  let cursor = startOfLocalDay(now)

  if (!practiceDays.has(localDayKey(cursor))) cursor = addLocalDays(cursor, -1)
  while (practiceDays.has(localDayKey(cursor))) {
    streak += 1
    cursor = addLocalDays(cursor, -1)
  }

  const latestTimestamp = datedAttempts.reduce(
    (latest, {timestamp}) => Math.max(latest, timestamp),
    0,
  )

  return {
    solvedThisWeek,
    activeTimeMs,
    streak,
    lastPracticedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : null,
  }
}

export function formatPracticeTime(durationMs: number) {
  if (durationMs > 0 && durationMs < 60_000) return '<1 min'
  const totalMinutes = Math.round(durationMs / 60_000)
  if (totalMinutes < 1) return '0 min'
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

import type { PracticeAttempt } from './puzzleProgress'
import type { Puzzle } from '../types/puzzles'

type WorkbookPuzzleReference = {
  pageNumber: number
  puzzleNumber: number
}

const workbookPuzzlePattern = /^page-(\d+)-puzzle-(\d+)$/

export const workbookPuzzleReference = (puzzle: Puzzle): WorkbookPuzzleReference | null => {
  const match = puzzle.id.match(workbookPuzzlePattern)
  if (!match) return null

  return {
    pageNumber: Number(match[1]),
    puzzleNumber: Number(match[2]),
  }
}

const movePrefix = (puzzle: Puzzle) => {
  const activeColor = puzzle.fen.trim().split(/\s+/)[1]
  return activeColor === 'b' ? '1...' : '1. '
}

export const formatAttemptData = (puzzle: Puzzle, attempts: PracticeAttempt[]) => attempts
  .filter((attempt) => attempt.puzzleId === puzzle.id && attempt.move)
  .map((attempt) => {
    if (attempt.result === 'answer-viewed') return 'Answer viewed'
    return `${movePrefix(puzzle)}${attempt.move}${attempt.result === 'incorrect' ? ' (wrong)' : ''}`
  })
  .join('; ')

const puzzleTimeMs = (puzzle: Puzzle, attempts: PracticeAttempt[]) => attempts
  .filter((attempt) => attempt.puzzleId === puzzle.id)
  .reduce((total, attempt) => total + (attempt.durationMs ?? 0), 0)

const formatPageTotalTime = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}m` : '',
    `${seconds}s`,
  ].filter(Boolean).join(' ')
}

const escapeCsvCell = (value: string | number) => {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const createWorkbookAttemptsCsv = (puzzles: Puzzle[], attempts: PracticeAttempt[]) => {
  const workbookPuzzles = puzzles.flatMap((puzzle) => {
    const reference = workbookPuzzleReference(puzzle)
    if (!reference) return []

    return [{ puzzle, reference, timeMs: puzzleTimeMs(puzzle, attempts) }]
  })

  const pageTotals = new Map<number, number>()
  for (const { reference, timeMs } of workbookPuzzles) {
    pageTotals.set(reference.pageNumber, (pageTotals.get(reference.pageNumber) ?? 0) + timeMs)
  }

  const exportedPages = new Set<number>()
  const rows = workbookPuzzles.map(({ puzzle, reference, timeMs }) => {
    const isFirstPuzzleOnPage = !exportedPages.has(reference.pageNumber)
    exportedPages.add(reference.pageNumber)

    return [
      reference.pageNumber,
      reference.puzzleNumber,
      formatAttemptData(puzzle, attempts),
      Math.round(timeMs / 1000),
      isFirstPuzzleOnPage ? formatPageTotalTime(pageTotals.get(reference.pageNumber) ?? 0) : '',
    ]
  })

  return [
    ['Page #', 'Puzzle #', 'Attempt Data', 'Puzzle Time (seconds)', 'Page Total Time'],
    ...rows,
  ].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export const workbookAttemptsFilename = (sectionSlug: string) =>
  `steps-2-${sectionSlug}-attempts.csv`

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

const escapeCsvCell = (value: string | number) => {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const createWorkbookAttemptsCsv = (puzzles: Puzzle[], attempts: PracticeAttempt[]) => {
  const rows = puzzles.flatMap((puzzle) => {
    const reference = workbookPuzzleReference(puzzle)
    if (!reference) return []

    return [[
      reference.pageNumber,
      reference.puzzleNumber,
      formatAttemptData(puzzle, attempts),
    ]]
  })

  return [
    ['Page #', 'Puzzle #', 'Attempt Data'],
    ...rows,
  ].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export const workbookAttemptsFilename = (sectionSlug: string) =>
  `steps-2-${sectionSlug}-attempts.csv`

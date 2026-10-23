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
    puzzleNumber: puzzle.workbookPuzzleNumber ?? Number(match[2]),
  }
}

const movePrefix = (puzzle: Puzzle) => {
  const activeColor = puzzle.fen.trim().split(/\s+/)[1]
  return activeColor === 'b' ? '1...' : '1. '
}

const formatMoveSequence = (puzzle: Puzzle, moveText: string) => {
  const moves = moveText.trim().split(/\s+/)
  if (!('solutionLines' in puzzle) || !puzzle.solutionLines || moves.length <= 1) {
    return `${movePrefix(puzzle)}${moveText}`
  }

  const startsWithBlack = puzzle.fen.trim().split(/\s+/)[1] === 'b'

  return moves.map((move, index) => {
    const plyIndex = index + (startsWithBlack ? 1 : 0)
    if (index === 0 && startsWithBlack) return `1...${move}`
    if (plyIndex % 2 === 0) return `${Math.floor(plyIndex / 2) + 1}. ${move}`
    return move
  }).join(' ')
}

export const formatAttemptData = (puzzle: Puzzle, attempts: PracticeAttempt[]) => attempts
  .filter((attempt): attempt is PracticeAttempt & { move: string } => (
    attempt.puzzleId === puzzle.id && Boolean(attempt.move)
  ))
  .map((attempt) => {
    if (attempt.result === 'answer-viewed') return 'Answer viewed'
    return `${formatMoveSequence(puzzle, attempt.move)}${attempt.result === 'incorrect' ? ' (wrong)' : ''}`
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

export const createWorkbookAttemptsCsv = (
  puzzles: Puzzle[],
  attempts: PracticeAttempt[],
  notes: Record<string, string> = {},
) => {
  const workbookPuzzles = puzzles.flatMap((puzzle) => {
    const reference = workbookPuzzleReference(puzzle)
    if (!reference) return []

    return [{ puzzle, reference, timeMs: puzzleTimeMs(puzzle, attempts) }]
  })

  const pageTotals = new Map<number, number>()
  for (const { reference, timeMs } of workbookPuzzles) {
    pageTotals.set(reference.pageNumber, (pageTotals.get(reference.pageNumber) ?? 0) + timeMs)
  }

  const rows = []
  const puzzlesByPage = new Map<number, typeof workbookPuzzles>()
  for (const entry of workbookPuzzles) {
    const pagePuzzles = puzzlesByPage.get(entry.reference.pageNumber) ?? []
    pagePuzzles.push(entry)
    puzzlesByPage.set(entry.reference.pageNumber, pagePuzzles)
  }
  for (const [pageNumber, pagePuzzles] of puzzlesByPage) {
    const puzzlesByNumber = new Map(pagePuzzles.map((entry) => [entry.reference.puzzleNumber, entry]))
    const includeWorkbookBlanks = pagePuzzles.some(({ puzzle }) => puzzle.workbookPuzzleNumber !== undefined)
    const puzzleNumbers = includeWorkbookBlanks
      ? Array.from({ length: 12 }, (_, index) => index + 1)
      : pagePuzzles.map(({ reference }) => reference.puzzleNumber)

    for (const puzzleNumber of puzzleNumbers) {
      const entry = puzzlesByNumber.get(puzzleNumber)
      rows.push(entry
        ? [
            pageNumber,
            puzzleNumber,
            formatAttemptData(entry.puzzle, attempts),
            notes[entry.puzzle.id] ?? '',
            Math.round(entry.timeMs / 1000),
            puzzleNumber === 1 ? formatPageTotalTime(pageTotals.get(pageNumber) ?? 0) : '',
          ]
        : [pageNumber, puzzleNumber, '', '', '', ''])
    }
  }

  return [
    ['Page #', 'Puzzle #', 'Attempt Data', 'Note', 'Puzzle Time (seconds)', 'Page Total Time'],
    ...rows,
  ].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export const workbookAttemptsFilename = (sectionSlug: string) =>
  `steps-2-${sectionSlug}-attempts.csv`

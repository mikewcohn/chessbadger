export type PracticeAttempt = {
  puzzleId: string
  result: 'correct' | 'incorrect' | 'answer-viewed'
}

export type PuzzleProgressStatus = 'clean' | 'retried' | 'missed' | 'not-attempted'

export type PuzzleProgress = {
  attempted: number
  clean: number
  retried: number
  missed: number
  total: number
}

type PuzzleReference = { id: string }

export const getPuzzleStatuses = (
  puzzles: PuzzleReference[],
  attempts: PracticeAttempt[],
): PuzzleProgressStatus[] => {
  const attemptsByPuzzle = new Map<string, PracticeAttempt[]>()

  for (const attempt of attempts) {
    const puzzleAttempts = attemptsByPuzzle.get(attempt.puzzleId)
    if (puzzleAttempts) puzzleAttempts.push(attempt)
    else attemptsByPuzzle.set(attempt.puzzleId, [attempt])
  }

  return puzzles.map((puzzle) => {
    const puzzleAttempts = attemptsByPuzzle.get(puzzle.id) ?? []
    const hasMiss = puzzleAttempts.some((attempt) => attempt.result !== 'correct')
    const hasSolve = puzzleAttempts.some((attempt) => attempt.result === 'correct')

    if (hasMiss && hasSolve) return 'retried'
    if (hasMiss) return 'missed'
    if (hasSolve) return 'clean'
    return 'not-attempted'
  })
}

export const summarizePuzzleStatuses = (
  statuses: PuzzleProgressStatus[],
): PuzzleProgress => {
  let clean = 0
  let retried = 0
  let missed = 0

  for (const status of statuses) {
    if (status === 'clean') clean += 1
    else if (status === 'retried') retried += 1
    else if (status === 'missed') missed += 1
  }

  return {
    attempted: clean + retried + missed,
    clean,
    retried,
    missed,
    total: statuses.length,
  }
}

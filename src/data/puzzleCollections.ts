import { puzzles, type Puzzle } from './puzzles'

export type PuzzleCollection = {
  slug: string
  title: string
  puzzles: Puzzle[]
}

export const steps2Workbook: PuzzleCollection = {
  slug: 'steps-2-workbook',
  title: 'Steps 2 Workbook',
  puzzles,
}

export const puzzleCollections = [steps2Workbook]

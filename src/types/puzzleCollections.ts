import type { Puzzle } from './puzzles'

export type PuzzleCollection = {
  slug: string
  title: string
  description: string
  sections: PuzzleSection[]
  puzzles: Puzzle[]
}

export type PuzzleSection = {
  slug: string
  title: string
  description: string
  workbookPages: string
  puzzles: Puzzle[]
}


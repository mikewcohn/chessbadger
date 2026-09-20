import { puzzles, type Puzzle } from './puzzles'

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

const puzzlesFromPages = (...pages: number[]) => {
  const pagePrefixes = new Set(pages.map((page) => `page-${page}-`))
  return puzzles.filter((puzzle) => [...pagePrefixes].some((prefix) => puzzle.id.startsWith(prefix)))
}

export const steps2Sections: PuzzleSection[] = [
  {
    slug: 'step-1-review',
    title: 'Step 1 Review',
    description: 'Review activity of the pieces with mixed exercises from Step 1.',
    workbookPages: 'Pages 3–4',
    puzzles: puzzlesFromPages(3, 4),
  },
  {
    slug: 'double-attack-queen',
    title: 'Double Attack: Queen',
    description: 'Place or move the queen to create a double attack.',
    workbookPages: 'Pages 6–14',
    puzzles: puzzlesFromPages(6, 7, 8, 10, 11, 12, 13, 14),
  },
  {
    slug: 'the-pin',
    title: 'The Pin',
    description: 'Recognize pins and find moves that set them up.',
    workbookPages: 'Pages 15–19',
    puzzles: puzzlesFromPages(16, 17, 18, 19),
  },
  {
    slug: 'eliminating-the-defence',
    title: 'Eliminating the Defence',
    description: 'Win material by capturing, chasing away, or luring away a defender.',
    workbookPages: 'Pages 20–24',
    puzzles: puzzlesFromPages(21, 22, 23, 24),
  },
  {
    slug: 'opening-principles',
    title: 'Opening Principles',
    description: 'Practice the three golden opening rules.',
    workbookPages: 'Pages 25–26',
    puzzles: puzzlesFromPages(26),
  },
  {
    slug: 'mixed-review-1',
    title: 'Mixed Review I',
    description: 'Identify the right idea without being told which tactic to use.',
    workbookPages: 'Pages 27–30',
    puzzles: puzzlesFromPages(27, 28, 29, 30),
  },
  {
    slug: 'mate-in-two',
    title: 'Mate in Two',
    description: 'Compose and calculate checkmate in two moves.',
    workbookPages: 'Pages 31–35 and 38',
      puzzles: puzzlesFromPages(31, 32, 33, 34, 35, 38),
  },
  {
    slug: 'double-attack-knight',
    title: 'Double Attack: Knight',
    description: 'Find knight moves that attack two targets at once.',
    workbookPages: 'Pages 36–37',
      puzzles: puzzlesFromPages(36, 37),
  },
  {
    slug: 'mixed-review-2',
    title: 'Mixed Review II',
    description: 'A second set of mixed tactical exercises.',
    workbookPages: 'Pages 39–40',
      puzzles: puzzlesFromPages(39, 40),
  },
  {
    slug: 'double-attack-other-pieces',
    title: 'Double Attack: Other Pieces',
    description: 'Use rooks, bishops, pawns, kings, and cooperating pieces.',
    workbookPages: 'Pages 41–43',
    puzzles: puzzlesFromPages(41, 42, 43),
  },
  {
    slug: 'discovered-attack',
    title: 'Discovered Attack',
    description: 'Open a line for one piece while the moving piece creates another threat.',
    workbookPages: 'Pages 44–48',
    puzzles: puzzlesFromPages(45, 46, 47, 48),
  },
  {
    slug: 'defending-against-mate',
    title: 'Defending Against Mate',
    description: 'Recognize mating threats and choose an effective defence.',
    workbookPages: 'Pages 49–51',
    puzzles: puzzlesFromPages(50, 51),
  },
  {
    slug: 'notation-and-final-review',
    title: 'Notation and Final Review',
    description: 'Practice short notation and finish with mixed review exercises.',
    workbookPages: 'Pages 52–56',
    puzzles: puzzlesFromPages(53, 54, 55, 56),
  },
]

export const steps2Workbook: PuzzleCollection = {
  slug: 'steps-2-workbook',
  title: 'Steps 2 Workbook',
  description: 'Tactical exercises organized in the same learning sequence as the workbook.',
  sections: steps2Sections,
  puzzles,
}

export const puzzleCollections = [steps2Workbook]

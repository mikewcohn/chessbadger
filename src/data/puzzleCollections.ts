import { puzzles, type Puzzle } from './puzzles'
import { polgarMateInTwoPuzzles } from './polgarMateInTwoPuzzles'
import { polgarPuzzles } from './polgarPuzzles'
import { polgarPuzzles1001To1500 } from './polgarPuzzles1001To1500'
import { polgarPuzzles1501To2000 } from './polgarPuzzles1501To2000'
import { polgarPuzzles2001To2500 } from './polgarPuzzles2001To2500'
import { polgarPuzzles2501To3000 } from './polgarPuzzles2501To3000'
import { polgarPuzzles3001To3514 } from './polgarPuzzles3001To3514'
import { polgarPuzzles3515To3718 } from './polgarPuzzles3515To3718'
import { polgarPuzzles3719To4218 } from './polgarPuzzles3719To4218'
import { polgarPuzzles4219To4462 } from './polgarPuzzles4219To4462'

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

const polgarPuzzlesThrough4462 = [
  ...polgarPuzzles,
  ...polgarMateInTwoPuzzles,
  ...polgarPuzzles1001To1500,
  ...polgarPuzzles1501To2000,
  ...polgarPuzzles2001To2500,
  ...polgarPuzzles2501To3000,
  ...polgarPuzzles3001To3514,
  ...polgarPuzzles3515To3718,
  ...polgarPuzzles3719To4218,
  ...polgarPuzzles4219To4462,
]

const polgarPuzzlesFromRange = (start: number, end: number) =>
  polgarPuzzlesThrough4462.filter((puzzle) => {
    const problemNumber = Number(puzzle.id.slice(-4))
    return problemNumber >= start && problemNumber <= end
  })

export const polgarSections: PuzzleSection[] = [
  {
    slug: 'mate-in-one',
    title: 'Mate in 1',
    description: 'Find White\'s checkmate in one move.',
    workbookPages: 'Problems 1–306 · Page 9',
    puzzles: polgarPuzzlesFromRange(1, 306),
  },
  {
    slug: 'white-to-move-mate-in-two',
    title: 'White to Move #2',
    description: 'White to move and force checkmate in two moves.',
    workbookPages: 'Problems 307–450 · Page 62',
    puzzles: polgarPuzzlesFromRange(307, 450),
  },
  {
    slug: 'mate-in-two-451-3514',
    title: 'Combinations #2 (451–3514)',
    description: 'Mate-in-two combinations from the main problem set.',
    workbookPages: 'Problems 451–3514 · Page 88',
    puzzles: polgarPuzzlesFromRange(451, 3514),
  },
  {
    slug: 'mate-in-two-3515-3718',
    title: 'Combinations #2 (3515–3718)',
    description: 'The concluding set of mate-in-two combinations.',
    workbookPages: 'Problems 3515–3718 · Page 600',
    puzzles: polgarPuzzlesFromRange(3515, 3718),
  },
  {
    slug: 'mate-in-three',
    title: 'Combinations #3 (3719–4462)',
    description: 'Calculate combinations that force mate in three moves.',
    workbookPages: 'Problems 3719–4462 · Page 636',
    puzzles: polgarPuzzlesFromRange(3719, 4462),
  },
  {
    slug: 'miniatures-f3-f6',
    title: 'f3 (f6) combinations',
    description: 'The first group of miniature-game combinations.',
    workbookPages: 'Problems 4463–4562 · Page 763',
    puzzles: [],
  },
  {
    slug: 'miniatures-g3-g6',
    title: 'g3 (g6) combinations',
    description: 'The second group of miniature-game combinations.',
    workbookPages: 'Problems 4563–4662 · Page 772',
    puzzles: [],
  },
  {
    slug: 'miniatures-f3-f6-second-set',
    title: 'f3 (f6) combinations',
    description: 'The third group of miniature-game combinations, as listed in the book contents.',
    workbookPages: 'Problems 4663–4762 · Page 781',
    puzzles: [],
  },
  {
    slug: 'miniatures-f2-f7',
    title: 'f2 (f7) combinations',
    description: 'Miniature-game combinations focused on f2 and f7.',
    workbookPages: 'Problems 4763–4862 · Page 791',
    puzzles: [],
  },
  {
    slug: 'miniatures-g2-g7',
    title: 'g2 (g7) combinations',
    description: 'Miniature-game combinations focused on g2 and g7.',
    workbookPages: 'Problems 4863–4962 · Page 799',
    puzzles: [],
  },
  {
    slug: 'miniatures-h2-h7',
    title: 'h2 (h7) combinations',
    description: 'Miniature-game combinations focused on h2 and h7.',
    workbookPages: 'Problems 4963–5062 · Page 810',
    puzzles: [],
  },
  {
    slug: 'miniature-games-diagrams',
    title: '600 Games – Diagrams',
    description: 'Diagram index for the 600 miniature games.',
    workbookPages: 'Page 819',
    puzzles: [],
  },
  {
    slug: 'simple-endgames-white-draws',
    title: 'White Draws (5063–5104)',
    description: 'Find the drawing continuation for White.',
    workbookPages: 'Problems 5063–5104 · Page 921',
    puzzles: [],
  },
  {
    slug: 'simple-endgames-white-wins',
    title: 'White Wins (5105–5206)',
    description: 'Find the winning continuation for White.',
    workbookPages: 'Problems 5105–5206 · Page 930',
    puzzles: [],
  },
  {
    slug: 'polgar-sisters-combinations',
    title: 'Polgár Sisters’ Combinations',
    description: 'Tournament-game combinations played by the Polgár sisters.',
    workbookPages: 'Problems 5207–5334 · Page 949',
    puzzles: [],
  },
  {
    slug: 'mate-in-two-reference',
    title: 'Mate in Two',
    description: 'The book\'s concluding mate-in-two reference section.',
    workbookPages: 'Page 972',
    puzzles: [],
  },
]

export const polgar5334: PuzzleCollection = {
  slug: 'polgar-5334',
  title: '5334 Problems, Combinations, and Games',
  description: 'László Polgár’s collection of mating problems, combinations, miniature games, and endgames.',
  sections: polgarSections,
  puzzles: polgarPuzzlesThrough4462,
}

export const puzzleCollections = [steps2Workbook, polgar5334]

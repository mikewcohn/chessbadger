type PuzzleBase = {
  id: string
  title: string
  sourcePage?: number
  pagePosition?: number
  workbookPuzzleNumber?: number
  fen: string
  answers: string[]
}

export type PuzzleLastMove = {
  san: string
  from: string
  to: string
  previousFen: string
}

export type PlaceablePiece =
  | 'wK' | 'bK'
  | 'wQ' | 'bQ'
  | 'wR' | 'bR'
  | 'wB' | 'bB'
  | 'wN' | 'bN'
  | 'wP' | 'bP'

type MovePuzzle = PuzzleBase & {
  type?: 'move'
  instruction?: string
  choices?: string[]
  givenMoves?: string[]
  givenLine?: string
  notationFields?: Array<{
    prefix: string
    answers: string[]
    suffix?: string
  }>
  answerMode?: 'notation'
  canAnswerNo?: boolean
  solutionLines?: string[][]
  solutionNote?: string
  playThrough?: boolean
  answerMoves?: string[]
  routeMoves?: string[]
  routeLines?: string[][]
  sideToMove?: 'white' | 'black'
  lastMove?: PuzzleLastMove
}

export type PlacementPuzzle = PuzzleBase & {
  type: 'placement'
  piece: PlaceablePiece
  instruction?: string
}

export type CompositionPuzzle = PuzzleBase & {
  type: 'composition'
  pieces: PlaceablePiece[]
  placements: Array<{ piece: PlaceablePiece; square: string }>
  validation?: 'checkmate'
  instruction?: string
}

export type Puzzle = MovePuzzle | PlacementPuzzle | CompositionPuzzle

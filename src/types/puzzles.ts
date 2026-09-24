type PuzzleBase = {
  id: string
  title: string
  fen: string
  answers: string[]
}

export type PlaceablePiece =
  | 'wQ' | 'bQ'
  | 'wR' | 'bR'
  | 'wB' | 'bB'
  | 'wN' | 'bN'
  | 'wP' | 'bP'

type MovePuzzle = PuzzleBase & {
  type?: 'move'
  instruction?: string
  canAnswerNo?: boolean
  solutionLines?: string[][]
  playThrough?: boolean
  answerMoves?: string[]
  sideToMove?: 'white' | 'black'
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
  instruction?: string
}

export type Puzzle = MovePuzzle | PlacementPuzzle | CompositionPuzzle


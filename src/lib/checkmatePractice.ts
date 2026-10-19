import { Chess, type Move, type Square } from 'chess.js'
import type { Puzzle } from '../types/puzzles'

export const isInteractiveCheckmatePuzzle = (puzzle: Puzzle) => (
  puzzle.type !== 'placement'
  && puzzle.type !== 'composition'
  && puzzle.validation === 'checkmate'
  && puzzle.opponentMode === 'automatic-king'
)

const squareCoordinates = (square: Square) => ({
  file: square.charCodeAt(0) - 97,
  rank: Number(square[1]) - 1,
})

const kingDistance = (first: Square, second: Square) => {
  const a = squareCoordinates(first)
  const b = squareCoordinates(second)
  return Math.max(Math.abs(a.file - b.file), Math.abs(a.rank - b.rank))
}

const centerScore = (square: Square) => {
  const { file, rank } = squareCoordinates(square)
  return 7 - (Math.abs(file - 3.5) + Math.abs(rank - 3.5))
}

/**
 * Pick a deterministic, credible defense for bare-king practice. Capturing the
 * attacking queen or rook always comes first; otherwise the king favors central,
 * distant squares.
 */
export const chooseAutomaticKingMove = (game: Chess): Move | null => {
  const attackingKing = game.findPiece({ type: 'k', color: 'w' })[0]
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) return null

  return moves.toSorted((first, second) => {
    const score = (move: Move) => (
      (move.captured === 'q' || move.captured === 'r' ? 10_000 : 0)
      + centerScore(move.to)
      + (attackingKing ? kingDistance(move.to, attackingKing) * 2 : 0)
    )
    return score(second) - score(first) || first.san.localeCompare(second.san)
  })[0]
}

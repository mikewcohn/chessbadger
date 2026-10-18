export type CompositionBoardPiece = {
  piece: string
  square: string
}

const squareCoordinates = (square: string) => ({
  file: square.charCodeAt(0) - 97,
  rank: Number(square[1]) - 1,
})

const squareFromCoordinates = (file: number, rank: number) => (
  file >= 0 && file < 8 && rank >= 0 && rank < 8
    ? `${String.fromCharCode(97 + file)}${rank + 1}`
    : null
)

const pieceAttacksSquare = (
  piece: CompositionBoardPiece,
  targetSquare: string,
  occupiedSquares: Set<string>,
) => {
  const source = squareCoordinates(piece.square)
  const target = squareCoordinates(targetSquare)
  const fileDistance = target.file - source.file
  const rankDistance = target.rank - source.rank
  const absoluteFileDistance = Math.abs(fileDistance)
  const absoluteRankDistance = Math.abs(rankDistance)
  const pieceKind = piece.piece[1]
  const pieceColor = piece.piece[0]

  if (pieceKind === 'P') {
    return absoluteFileDistance === 1 && rankDistance === (pieceColor === 'w' ? 1 : -1)
  }
  if (pieceKind === 'N') {
    return (absoluteFileDistance === 1 && absoluteRankDistance === 2)
      || (absoluteFileDistance === 2 && absoluteRankDistance === 1)
  }
  if (pieceKind === 'K') return Math.max(absoluteFileDistance, absoluteRankDistance) === 1

  const movesDiagonally = absoluteFileDistance === absoluteRankDistance && absoluteFileDistance > 0
  const movesOrthogonally = (fileDistance === 0) !== (rankDistance === 0)
  if (
    (pieceKind === 'B' && !movesDiagonally)
    || (pieceKind === 'R' && !movesOrthogonally)
    || (pieceKind === 'Q' && !movesDiagonally && !movesOrthogonally)
  ) return false

  const fileStep = Math.sign(fileDistance)
  const rankStep = Math.sign(rankDistance)
  let file = source.file + fileStep
  let rank = source.rank + rankStep
  while (file !== target.file || rank !== target.rank) {
    const intermediateSquare = squareFromCoordinates(file, rank)
    if (!intermediateSquare || occupiedSquares.has(intermediateSquare)) return false
    file += fileStep
    rank += rankStep
  }
  return true
}

const isAttackedBy = (
  square: string,
  pieces: CompositionBoardPiece[],
  attackingColor: 'w' | 'b',
) => {
  const occupiedSquares = new Set(pieces.map((piece) => piece.square))
  return pieces.some(
    (piece) => piece.piece[0] === attackingColor
      && pieceAttacksSquare(piece, square, occupiedSquares),
  )
}

export const isComposedCheckmate = (pieces: CompositionBoardPiece[]) => {
  const kings = pieces.filter((piece) => piece.piece === 'wK' || piece.piece === 'bK')
  if (kings.length !== 1) return false

  const king = kings[0]
  const kingColor = king.piece[0] as 'w' | 'b'
  const attackingColor = kingColor === 'w' ? 'b' : 'w'
  if (!isAttackedBy(king.square, pieces, attackingColor)) return false

  const kingCoordinates = squareCoordinates(king.square)
  for (let fileOffset = -1; fileOffset <= 1; fileOffset += 1) {
    for (let rankOffset = -1; rankOffset <= 1; rankOffset += 1) {
      if (fileOffset === 0 && rankOffset === 0) continue
      const destination = squareFromCoordinates(
        kingCoordinates.file + fileOffset,
        kingCoordinates.rank + rankOffset,
      )
      if (!destination) continue

      const destinationPiece = pieces.find((piece) => piece.square === destination)
      if (destinationPiece?.piece[0] === kingColor) continue

      const positionAfterKingMove = pieces
        .filter((piece) => piece.square !== king.square && piece.square !== destination)
        .concat({ piece: king.piece, square: destination })
      if (!isAttackedBy(destination, positionAfterKingMove, attackingColor)) return false
    }
  }

  return true
}

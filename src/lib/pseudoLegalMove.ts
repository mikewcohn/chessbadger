export type BoardPiece = { pieceType: string }
export type BoardPosition = Record<string, BoardPiece>
export type PieceColor = 'w' | 'b'

export type PseudoLegalMoveContext = {
  sideToMove: PieceColor
  castlingRights: string
  enPassantSquare: string | null
}

type Move = {
  position: BoardPosition
  sourceSquare: string
  targetSquare: string
  sideToMove: PieceColor
  castlingRights?: string
  enPassantSquare?: string | null
}

const squarePattern = /^[a-h][1-8]$/

const squareCoordinates = (square: string) => ({
  file: square.charCodeAt(0) - 97,
  rank: Number(square[1]),
})

const squareAt = (file: number, rank: number) =>
  `${String.fromCharCode(97 + file)}${rank}`

const isPathClear = (
  position: BoardPosition,
  sourceFile: number,
  sourceRank: number,
  targetFile: number,
  targetRank: number,
) => {
  const fileStep = Math.sign(targetFile - sourceFile)
  const rankStep = Math.sign(targetRank - sourceRank)
  const distance = Math.max(
    Math.abs(targetFile - sourceFile),
    Math.abs(targetRank - sourceRank),
  )

  for (let step = 1; step < distance; step += 1) {
    if (position[squareAt(sourceFile + fileStep * step, sourceRank + rankStep * step)]) {
      return false
    }
  }

  return true
}

const canCastle = (
  position: BoardPosition,
  color: PieceColor,
  sourceSquare: string,
  targetSquare: string,
  castlingRights: string,
) => {
  const rank = color === 'w' ? 1 : 8
  if (sourceSquare !== `e${rank}`) return false

  const kingSide = targetSquare === `g${rank}`
  const queenSide = targetSquare === `c${rank}`
  if (!kingSide && !queenSide) return false

  const right = color === 'w'
    ? kingSide ? 'K' : 'Q'
    : kingSide ? 'k' : 'q'
  if (!castlingRights.includes(right)) return false

  const rookSquare = `${kingSide ? 'h' : 'a'}${rank}`
  if (position[rookSquare]?.pieceType !== `${color}R`) return false

  const emptyFiles = kingSide ? ['f', 'g'] : ['b', 'c', 'd']
  return emptyFiles.every((file) => !position[`${file}${rank}`])
}

export const pseudoLegalMoveContextFromFen = (fen: string): PseudoLegalMoveContext => {
  const [, activeColor = 'w', castlingRights = '-', enPassant = '-'] = fen.trim().split(/\s+/)
  return {
    sideToMove: activeColor === 'b' ? 'b' : 'w',
    castlingRights,
    enPassantSquare: enPassant === '-' ? null : enPassant,
  }
}

export const isPseudoLegalMove = ({
  position,
  sourceSquare,
  targetSquare,
  sideToMove,
  castlingRights = '-',
  enPassantSquare = null,
}: Move) => {
  if (
    sourceSquare === targetSquare
    || !squarePattern.test(sourceSquare)
    || !squarePattern.test(targetSquare)
  ) return false

  const piece = position[sourceSquare]
  if (!piece || piece.pieceType[0] !== sideToMove) return false

  const targetPiece = position[targetSquare]
  if (targetPiece?.pieceType[0] === sideToMove || targetPiece?.pieceType[1] === 'K') {
    return false
  }

  const source = squareCoordinates(sourceSquare)
  const target = squareCoordinates(targetSquare)
  const fileDistance = target.file - source.file
  const rankDistance = target.rank - source.rank
  const absoluteFileDistance = Math.abs(fileDistance)
  const absoluteRankDistance = Math.abs(rankDistance)
  const pieceType = piece.pieceType[1]

  if (pieceType === 'N') {
    return (absoluteFileDistance === 1 && absoluteRankDistance === 2)
      || (absoluteFileDistance === 2 && absoluteRankDistance === 1)
  }

  if (pieceType === 'K') {
    if (absoluteFileDistance <= 1 && absoluteRankDistance <= 1) return true
    return canCastle(
      position,
      sideToMove,
      sourceSquare,
      targetSquare,
      castlingRights,
    )
  }

  if (pieceType === 'P') {
    const direction = sideToMove === 'w' ? 1 : -1
    const startingRank = sideToMove === 'w' ? 2 : 7

    if (fileDistance === 0 && !targetPiece) {
      if (rankDistance === direction) return true
      if (source.rank !== startingRank || rankDistance !== direction * 2) return false
      return !position[squareAt(source.file, source.rank + direction)]
    }

    if (absoluteFileDistance !== 1 || rankDistance !== direction) return false
    if (targetPiece) return targetPiece.pieceType[0] !== sideToMove
    if (targetSquare !== enPassantSquare) return false

    const capturedPawn = position[squareAt(target.file, source.rank)]
    return capturedPawn?.pieceType === `${sideToMove === 'w' ? 'b' : 'w'}P`
  }

  const isDiagonal = absoluteFileDistance === absoluteRankDistance
  const isStraight = fileDistance === 0 || rankDistance === 0
  if (
    (pieceType === 'B' && !isDiagonal)
    || (pieceType === 'R' && !isStraight)
    || (pieceType === 'Q' && !isDiagonal && !isStraight)
  ) return false

  return ['B', 'R', 'Q'].includes(pieceType) && isPathClear(
    position,
    source.file,
    source.rank,
    target.file,
    target.rank,
  )
}

export const applyPseudoLegalMove = (
  position: BoardPosition,
  sourceSquare: string,
  targetSquare: string,
  context: Pick<PseudoLegalMoveContext, 'enPassantSquare'>,
) => {
  const nextPosition = { ...position }
  const piece = nextPosition[sourceSquare]
  delete nextPosition[sourceSquare]

  if (
    piece.pieceType[1] === 'P'
    && targetSquare === context.enPassantSquare
    && !nextPosition[targetSquare]
    && sourceSquare[0] !== targetSquare[0]
  ) {
    delete nextPosition[`${targetSquare[0]}${sourceSquare[1]}`]
  }

  if (piece.pieceType[1] === 'K' && Math.abs(sourceSquare.charCodeAt(0) - targetSquare.charCodeAt(0)) === 2) {
    const rank = sourceSquare[1]
    const kingSide = targetSquare[0] === 'g'
    const rookSource = `${kingSide ? 'h' : 'a'}${rank}`
    const rookTarget = `${kingSide ? 'f' : 'd'}${rank}`
    nextPosition[rookTarget] = nextPosition[rookSource]
    delete nextPosition[rookSource]
  }

  const promotes = piece.pieceType[1] === 'P' && ['1', '8'].includes(targetSquare[1])
  nextPosition[targetSquare] = promotes
    ? { pieceType: `${piece.pieceType[0]}Q` }
    : piece
  return nextPosition
}

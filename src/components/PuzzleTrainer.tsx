import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import {
  Chessboard,
  ChessboardProvider,
  SparePiece,
  fenStringToPositionObject,
  type Arrow,
  type PositionDataType,
} from 'react-chessboard'
import type { PlaceablePiece, Puzzle } from '../data/puzzles'

type PuzzleTrainerProps = {
  puzzles: Puzzle[]
  collectionName: string
  collectionSlug: string
  sectionName: string
  sectionSlug: string
  initialPuzzleId: string
}

type Result = 'correct' | 'incorrect' | null

type Attempt = {
  move: string
  result: Exclude<Result, null>
  checkedAt?: string
}

type SharedPractice = {
  studentId: string
  practiceKey: string
}

const LIGHT_SQUARE_STYLE = {
  backgroundColor: '#d3d1c8',
  backgroundImage:
    'radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.28) 0 5%, transparent 24%), radial-gradient(circle at 78% 72%, rgba(80, 82, 72, 0.12) 0 7%, transparent 28%), linear-gradient(118deg, rgba(255, 255, 255, 0.1), rgba(78, 80, 70, 0.08))',
  backgroundSize: '82px 82px, 106px 106px, 100% 100%',
} satisfies CSSProperties

const DARK_SQUARE_STYLE = {
  backgroundColor: '#6b9078',
  backgroundImage:
    'radial-gradient(circle at 22% 18%, rgba(222, 235, 222, 0.2) 0 5%, transparent 23%), radial-gradient(circle at 76% 74%, rgba(28, 65, 45, 0.18) 0 8%, transparent 29%), linear-gradient(118deg, rgba(255, 255, 255, 0.07), rgba(20, 57, 39, 0.12))',
  backgroundSize: '88px 88px, 112px 112px, 100% 100%',
} satisfies CSSProperties

const normalizeSan = (san: string) =>
  san.trim().replaceAll('0', 'O').replace(/[!?]+$/g, '')

const pieceNames = {
  wQ: 'white queen',
  bQ: 'black queen',
  wR: 'white rook',
  bR: 'black rook',
  wB: 'white bishop',
  bB: 'black bishop',
  wN: 'white knight',
  bN: 'black knight',
  wP: 'white pawn',
  bP: 'black pawn',
} as const

const pieceLetters = {
  wQ: 'Q',
  bQ: 'Q',
  wR: 'R',
  bR: 'R',
  wB: 'B',
  bB: 'B',
  wN: 'N',
  bN: 'N',
  wP: '',
  bP: '',
} as const

const formatAnswer = (puzzle: Puzzle, answer: string) =>
  puzzle.type === 'placement' ? `${pieceLetters[puzzle.piece]}${answer}` : answer

const formatAnswers = (puzzle: Puzzle) => {
  if (
    puzzle.type !== 'placement'
    && puzzle.type !== 'composition'
    && puzzle.playThrough
    && puzzle.solutionLines
  ) {
    return puzzle.solutionLines.map((line) => line.join(' ')).join(' or ')
  }

  return puzzle.answers.map((answer) => formatAnswer(puzzle, answer)).join(', ')
}

const createAnswerArrows = (puzzle: Puzzle): Arrow[] => {

  if (puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.answerMoves) {
    return puzzle.answerMoves.map((move) => ({
      startSquare: move.slice(0, 2) as Square,
      endSquare: move.slice(2, 4) as Square,
      color: 'rgba(217, 119, 6, 0.9)',
    }))
  }

  if (puzzle.type === 'composition') return []

  return puzzle.answers.flatMap((answer) => {
    const game = new Chess(puzzle.fen)

    try {
      const move = game.move(normalizeSan(answer))
      return [{
        startSquare: move.from,
        endSquare: move.to,
        color: 'rgba(217, 119, 6, 0.9)',
      }]
    } catch {
      return []
    }
  })
}

export default function PuzzleTrainer({
  puzzles,
  collectionName,
  collectionSlug,
  sectionName,
  sectionSlug,
  initialPuzzleId,
}: PuzzleTrainerProps) {
  const initialPuzzleIndex = Math.max(0, puzzles.findIndex((candidate) => candidate.id === initialPuzzleId))
  const [puzzleIndex, setPuzzleIndex] = useState(initialPuzzleIndex)
  const [position, setPosition] = useState<string | PositionDataType>(puzzles[initialPuzzleIndex].fen)
  const [attemptedMove, setAttemptedMove] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [answerVisible, setAnswerVisible] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [placementPieceSelected, setPlacementPieceSelected] = useState(false)
  const [placedSquares, setPlacedSquares] = useState<string[]>([])
  const [selectedCompositionPiece, setSelectedCompositionPiece] = useState<PlaceablePiece | null>(null)
  const [compositionPlacements, setCompositionPlacements] = useState<Record<string, PlaceablePiece>>({})
  const [activeSolutionLine, setActiveSolutionLine] = useState<string[] | null>(null)
  const [opponentReply, setOpponentReply] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [boardRevision, setBoardRevision] = useState(0)
  const [attemptHistory, setAttemptHistory] = useState<Record<string, Attempt[]>>({})
  const [sharedPractice, setSharedPractice] = useState<SharedPractice | null>(null)
  const [studentName, setStudentName] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const replyTimerRef = useRef<number | null>(null)

  const puzzle = puzzles[puzzleIndex]
  const puzzleAttempts = attemptHistory[puzzle.id] ?? []
  const sideToMove = puzzle.type === 'placement' || puzzle.type === 'composition'
    ? null
    : puzzle.sideToMove
      ? puzzle.sideToMove === 'white' ? 'White' : 'Black'
      : new Chess(puzzle.fen).turn() === 'w' ? 'White' : 'Black'
  const answerArrows = useMemo(
    () => answerVisible && puzzle.type !== 'placement' && puzzle.type !== 'composition'
      ? createAnswerArrows(puzzle)
      : [],
    [answerVisible, puzzle],
  )
  const boardPosition = useMemo<string | PositionDataType>(() => {
    if (puzzle.type !== 'placement' && puzzle.type !== 'composition') return position

    const nextPosition = fenStringToPositionObject(puzzle.fen, 8, 8)

    if (puzzle.type === 'placement') {
      placedSquares.forEach((square) => {
        nextPosition[square] = { pieceType: puzzle.piece }
      })
    } else {
      Object.entries(compositionPlacements).forEach(([square, pieceType]) => {
        nextPosition[square] = { pieceType }
      })
    }

    return nextPosition
  }, [compositionPlacements, placedSquares, position, puzzle])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedPuzzle = Number(params.get('puzzle'))
    if (Number.isInteger(requestedPuzzle) && requestedPuzzle >= 1 && requestedPuzzle <= puzzles.length) {
      setPuzzleIndex(requestedPuzzle - 1)
      setPosition(puzzles[requestedPuzzle - 1].fen)
    }

    const studentId = params.get('student') ?? ''
    const practiceKey = params.get('key') ?? ''
    if (!studentId || !practiceKey) return

    const controller = new AbortController()
    setSharedPractice({ studentId, practiceKey })
    setSaveStatus('loading')

    void fetch(
      `/api/practice/attempts?student=${encodeURIComponent(studentId)}&key=${encodeURIComponent(practiceKey)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json() as {
          student?: {
            name: string
            attempts: Array<Attempt & { puzzleId: string }>
          }
          error?: string
        }
        if (!response.ok || !data.student) throw new Error(data.error ?? 'Could not load practice history.')

        const history = data.student.attempts.reduce<Record<string, Attempt[]>>(
          (grouped, attempt) => {
            grouped[attempt.puzzleId] = [
              ...(grouped[attempt.puzzleId] ?? []),
              {
                move: attempt.move,
                result: attempt.result,
                checkedAt: attempt.checkedAt,
              },
            ]
            return grouped
          },
          {},
        )

        setStudentName(data.student.name)
        setAttemptHistory(history)
        setSaveStatus('saved')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSaveStatus('error')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => () => {
    if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current)
  }, [])

  const resetPuzzle = (nextIndex = puzzleIndex, updateUrl = true) => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
    const nextPuzzle = puzzles[nextIndex]
    if (updateUrl && nextIndex !== puzzleIndex) {
      const params = new URLSearchParams(window.location.search)
      const query = params.toString()
      window.history.pushState(
        {},
        '',
        `/puzzles/${collectionSlug}/${sectionSlug}/puzzle/${nextPuzzle.id}${query ? `?${query}` : ''}`,
      )
    }
    document.title = `${nextPuzzle.title} | ${sectionName} | ChessBadger`
    setPuzzleIndex(nextIndex)
    setPosition(puzzles[nextIndex].fen)
    setAttemptedMove(null)
    setResult(null)
    setAnswerVisible(false)
    setSelectedSquare(null)
    setPlacementPieceSelected(false)
    setPlacedSquares([])
    setSelectedCompositionPiece(null)
    setCompositionPlacements({})
    setActiveSolutionLine(null)
    setOpponentReply('')
    setIsResponding(false)
    setBoardRevision((revision) => revision + 1)
  }

  useEffect(() => {
    const syncPuzzleToUrl = () => {
      const puzzleId = decodeURIComponent(window.location.pathname.split('/').at(-1) ?? '')
      const urlPuzzleIndex = puzzles.findIndex((candidate) => candidate.id === puzzleId)
      if (urlPuzzleIndex >= 0) resetPuzzle(urlPuzzleIndex, false)
    }

    window.addEventListener('popstate', syncPuzzleToUrl)
    return () => window.removeEventListener('popstate', syncPuzzleToUrl)
  }, [puzzles])

  const showAnswer = () => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
    setPosition(puzzle.fen)
    setSelectedSquare(null)
    setPlacementPieceSelected(false)
    setPlacedSquares(puzzle.type === 'placement' ? puzzle.answers : [])
    setSelectedCompositionPiece(null)
    setCompositionPlacements(
      puzzle.type === 'composition'
        ? Object.fromEntries(puzzle.placements.map(({ piece, square }) => [square, piece]))
        : {},
    )
    setActiveSolutionLine(null)
    setOpponentReply('')
    setIsResponding(false)
    setAnswerVisible(true)
  }

  const recordAttempt = (attemptLabel: string, isCorrect: boolean) => {
    const nextResult = isCorrect ? 'correct' : 'incorrect'
    const checkedAt = new Date().toISOString()

    setAttemptHistory((history) => ({
      ...history,
      [puzzle.id]: [
        ...(history[puzzle.id] ?? []),
        { move: attemptLabel, result: nextResult, checkedAt },
      ],
    }))
    setResult(nextResult)
    setAnswerVisible(false)

    if (sharedPractice) {
      setSaveStatus('saving')
      void fetch('/api/practice/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentId: sharedPractice.studentId,
          practiceKey: sharedPractice.practiceKey,
          puzzleId: puzzle.id,
          puzzleTitle: puzzle.title,
          move: attemptLabel,
          result: nextResult,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const data = await response.json() as { error?: string }
            throw new Error(data.error ?? 'Could not save attempt.')
          }
          setSaveStatus('saved')
        })
        .catch(() => setSaveStatus('error'))
    }
  }

  const checkMoveAttempt = (moveSan: string) => {
    const acceptedAnswers = new Set(puzzle.answers.map(normalizeSan))
    recordAttempt(moveSan, acceptedAnswers.has(normalizeSan(moveSan)))
  }

  const answerNoDefense = () => {
    if (puzzle.type === 'placement' || puzzle.type === 'composition' || !puzzle.canAnswerNo || attemptedMove) return
    setAttemptedMove('No')
    checkMoveAttempt('No')
  }

  const tryMove = (sourceSquare: string, targetSquare: string | null) => {
    if (
      puzzle.type === 'placement'
      || puzzle.type === 'composition'
      || !targetSquare
      || attemptedMove
      || isResponding
    ) return false

    if (puzzle.playThrough && puzzle.solutionLines && typeof position === 'string') {
      const game = new Chess(position)

      try {
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        })

        setSelectedSquare(null)

        if (activeSolutionLine) {
          const isCorrect = normalizeSan(move.san) === normalizeSan(activeSolutionLine[2])
          const attemptLabel = [...activeSolutionLine.slice(0, 2), move.san].join(' ')
          setPosition(game.fen())
          setAttemptedMove(attemptLabel)
          recordAttempt(attemptLabel, isCorrect)
          return true
        }

        const matchingLine = puzzle.solutionLines.find(
          (line) => normalizeSan(line[0]) === normalizeSan(move.san),
        )

        if (!matchingLine) {
          setPosition(game.fen())
          setAttemptedMove(move.san)
          recordAttempt(move.san, false)
          return true
        }

        setPosition(game.fen())
        setActiveSolutionLine(matchingLine)
        setOpponentReply('')
        setIsResponding(true)
        replyTimerRef.current = window.setTimeout(() => {
          const reply = game.move(matchingLine[1])
          setPosition(game.fen())
          setOpponentReply(reply.san)
          setIsResponding(false)
          replyTimerRef.current = null
        }, 450)
        return true
      } catch {
        return false
      }
    }

    if (puzzle.answerMoves) {
      const currentPosition = typeof position === 'string'
        ? fenStringToPositionObject(position, 8, 8)
        : position
      const piece = currentPosition[sourceSquare]
      const expectedColor = puzzle.sideToMove === 'black' ? 'b' : 'w'
      if (!piece || !piece.pieceType.startsWith(expectedColor)) return false

      const nextPosition = { ...currentPosition }
      delete nextPosition[sourceSquare]
      nextPosition[targetSquare] = piece
      const attemptedCoordinates = `${sourceSquare}${targetSquare}`.toLowerCase()
      const answerIndex = puzzle.answerMoves.findIndex((move) => move.toLowerCase() === attemptedCoordinates)
      const attemptLabel = answerIndex >= 0
        ? puzzle.answers[answerIndex]
        : `${sourceSquare}–${targetSquare}`

      setPosition(nextPosition)
      setAttemptedMove(attemptLabel)
      setSelectedSquare(null)
      recordAttempt(attemptLabel, answerIndex >= 0)
      return true
    }

    if (typeof position !== 'string') return false

    const game = new Chess(position)

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      setPosition(game.fen())
      setAttemptedMove(move.san)
      setSelectedSquare(null)
      checkMoveAttempt(move.san)
      return true
    } catch {
      return false
    }
  }

  const tryPlacement = (
    targetSquare: string | null,
    pieceType = puzzle.type === 'placement' ? puzzle.piece : '',
    sourceSquare: string | null = null,
  ) => {
    if (puzzle.type !== 'placement' || !targetSquare || attemptedMove || answerVisible || pieceType !== puzzle.piece) return false

    setPlacementPieceSelected(false)

    if (sourceSquare) {
      if (sourceSquare === targetSquare || !placedSquares.includes(sourceSquare) || placedSquares.includes(targetSquare)) {
        return false
      }

      const startingPosition = fenStringToPositionObject(puzzle.fen, 8, 8)
      if (startingPosition[targetSquare]) return false

      setPlacedSquares((squares) => squares.map((square) => square === sourceSquare ? targetSquare : square))
      return true
    }

    if (placedSquares.includes(targetSquare)) {
      setPlacedSquares((squares) => squares.filter((square) => square !== targetSquare))
      return true
    }

    const startingPosition = fenStringToPositionObject(puzzle.fen, 8, 8)
    if (startingPosition[targetSquare]) return false

    setPlacedSquares((squares) => [...squares, targetSquare])

    return true
  }

  const checkPlacements = () => {
    if (puzzle.type !== 'placement' || placedSquares.length === 0 || attemptedMove) return

    const markedSquares = new Set(placedSquares.map((square) => square.toLowerCase()))
    const isCorrect = markedSquares.size === puzzle.answers.length
      && puzzle.answers.every((answer) => markedSquares.has(answer.toLowerCase()))
    const attemptLabel = placedSquares.map((square) => formatAnswer(puzzle, square)).join(', ')

    setAttemptedMove(attemptLabel)
    recordAttempt(attemptLabel, isCorrect)
  }

  const tryCompositionPlacement = (
    targetSquare: string | null,
    pieceType: PlaceablePiece | '',
    sourceSquare: string | null = null,
  ) => {
    if (puzzle.type !== 'composition' || !targetSquare || !pieceType || attemptedMove || answerVisible) return false
    if (!puzzle.pieces.includes(pieceType)) return false

    const startingPosition = fenStringToPositionObject(puzzle.fen, 8, 8)
    if (startingPosition[targetSquare]) return false

    if (sourceSquare) {
      if (
        sourceSquare === targetSquare
        || compositionPlacements[sourceSquare] !== pieceType
        || compositionPlacements[targetSquare]
      ) return false

      setCompositionPlacements((placements) => {
        const next = { ...placements }
        delete next[sourceSquare]
        next[targetSquare] = pieceType
        return next
      })
      setSelectedCompositionPiece(null)
      return true
    }

    if (compositionPlacements[targetSquare] === pieceType) {
      setCompositionPlacements((placements) => {
        const next = { ...placements }
        delete next[targetSquare]
        return next
      })
      setSelectedCompositionPiece(pieceType)
      return true
    }

    setCompositionPlacements((placements) => {
      const next = Object.fromEntries(
        Object.entries(placements).filter(([, placedPiece]) => placedPiece !== pieceType),
      )
      next[targetSquare] = pieceType
      return next
    })
    setSelectedCompositionPiece(null)
    return true
  }

  const checkComposition = () => {
    if (puzzle.type !== 'composition' || Object.keys(compositionPlacements).length === 0 || attemptedMove) return

    const isCorrect = Object.keys(compositionPlacements).length === puzzle.placements.length
      && puzzle.placements.every(({ piece, square }) => compositionPlacements[square] === piece)
    const attemptLabel = Object.entries(compositionPlacements)
      .map(([square, piece]) => `${pieceLetters[piece]}${square}`)
      .join(', ')

    setAttemptedMove(attemptLabel)
    recordAttempt(attemptLabel, isCorrect)
  }

  const handleSquareClick = (square: string) => {
    if (attemptedMove || answerVisible || isResponding) return

    if (puzzle.type === 'placement') {
      if (placementPieceSelected || placedSquares.includes(square)) tryPlacement(square)
      return
    }

    if (puzzle.type === 'composition') {
      const placedPiece = compositionPlacements[square]
      if (placedPiece) {
        setCompositionPlacements((placements) => {
          const next = { ...placements }
          delete next[square]
          return next
        })
        setSelectedCompositionPiece(placedPiece)
      } else if (selectedCompositionPiece) {
        tryCompositionPlacement(square, selectedCompositionPiece)
      }
      return
    }


    if (puzzle.answerMoves) {
      const currentPosition = typeof position === 'string'
        ? fenStringToPositionObject(position, 8, 8)
        : position
      const clickedSquare = square as Square

      if (selectedSquare) {
        if (tryMove(selectedSquare, clickedSquare)) return
        setSelectedSquare(null)
      }

      const piece = currentPosition[clickedSquare]
      const expectedColor = puzzle.sideToMove === 'black' ? 'b' : 'w'
      if (piece?.pieceType.startsWith(expectedColor)) setSelectedSquare(clickedSquare)
      return
    }

    if (typeof position !== 'string') return
    const game = new Chess(position)
    const clickedSquare = square as Square

    if (selectedSquare) {
      if (tryMove(selectedSquare, clickedSquare)) return
      setSelectedSquare(null)
    }

    const piece = game.get(clickedSquare)
    if (piece?.color === game.turn()) setSelectedSquare(clickedSquare)
  }

  const answerSquares = puzzle.type === 'placement'
    ? puzzle.answers
    : puzzle.type === 'composition'
      ? puzzle.placements.map(({ square }) => square)
      : []
  const squareStyles = answerVisible && (puzzle.type === 'placement' || puzzle.type === 'composition')
    ? Object.fromEntries(answerSquares.map((answer) => [answer, {
        boxShadow: 'inset 0 0 0 5px rgba(217, 119, 6, 0.88)',
      }]))
    : selectedSquare ? {
        [selectedSquare]: {
          boxShadow: 'inset 0 0 0 4px rgba(120, 53, 15, 0.7)',
        },
      }
    : {}

  const collectionHref = sharedPractice
    ? `/puzzles/${collectionSlug}?student=${encodeURIComponent(sharedPractice.studentId)}&key=${encodeURIComponent(sharedPractice.practiceKey)}`
    : `/puzzles/${collectionSlug}`
  const sectionHref = sharedPractice
    ? `/puzzles/${collectionSlug}/${sectionSlug}?student=${encodeURIComponent(sharedPractice.studentId)}&key=${encodeURIComponent(sharedPractice.practiceKey)}`
    : `/puzzles/${collectionSlug}/${sectionSlug}`

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,560px)_minmax(280px,1fr)] md:items-start">
      <div className="relative flex w-full max-w-[560px] flex-col rounded-2xl border border-stone-300 bg-white p-2 shadow-xl shadow-stone-900/10 sm:p-3">
        <ChessboardProvider
          key={`${puzzle.id}-${boardRevision}`}
          options={{
              id: `puzzle-board-${puzzle.id}`,
              position: boardPosition,
              boardOrientation: 'white',
              showNotation: true,
              allowDragging: attemptedMove === null,
              allowDrawingArrows: false,
              arrows: answerArrows,
              clearArrowsOnClick: false,
              clearArrowsOnPositionChange: false,
              squareStyles,
              lightSquareStyle: LIGHT_SQUARE_STYLE,
              darkSquareStyle: DARK_SQUARE_STYLE,
              lightSquareNotationStyle: { color: '#3f6651' },
              darkSquareNotationStyle: { color: 'rgba(246, 246, 239, 0.88)' },
              canDragPiece: ({ isSparePiece, square }) => {
                if (attemptedMove !== null || answerVisible || isResponding) return false
                if (puzzle.type === 'placement') {
                  return isSparePiece || (square !== null && placedSquares.includes(square))
                }
                if (puzzle.type === 'composition') {
                  return isSparePiece || (square !== null && Boolean(compositionPlacements[square]))
                }
                return !isSparePiece
              },
              onPieceClick: ({ isSparePiece, piece }) => {
                if (puzzle.type === 'placement' && isSparePiece && !attemptedMove) {
                  setPlacementPieceSelected(true)
                }
                if (puzzle.type === 'composition' && isSparePiece && !attemptedMove) {
                  const pieceType = piece.pieceType as PlaceablePiece
                  if (puzzle.pieces.includes(pieceType)) setSelectedCompositionPiece(pieceType)
                }
              },
              onPieceDrop: ({ piece, sourceSquare, targetSquare }) => puzzle.type === 'placement'
                ? tryPlacement(targetSquare, piece.pieceType, piece.isSparePiece ? null : sourceSquare)
                : puzzle.type === 'composition'
                  ? tryCompositionPlacement(
                      targetSquare,
                      piece.pieceType as PlaceablePiece,
                      piece.isSparePiece ? null : sourceSquare,
                    )
                : tryMove(sourceSquare, targetSquare),
              onSquareClick: ({ square }) => handleSquareClick(square),
          }}
        >
          <div className="overflow-hidden rounded-xl">
            <Chessboard />
          </div>

          {puzzle.type === 'placement' && !attemptedMove && !answerVisible ? (
            <div className="flex min-h-20 items-center justify-between gap-3 px-2 pt-2 sm:min-h-24" aria-label={`Piece to place: ${pieceNames[puzzle.piece]}`}>
              <p className="text-sm font-bold text-stone-600">
                {placedSquares.length === 0
                  ? `Drag or select the ${pieceNames[puzzle.piece].split(' ')[1]} to mark squares.`
                  : 'Drag a marked piece to move it, or click to remove it.'}
              </p>
              <div
                className={`size-16 rounded-xl border bg-stone-50 p-1 transition sm:size-20 ${
                  placementPieceSelected
                    ? 'border-amber-700 ring-4 ring-amber-200'
                    : 'border-stone-300'
                }`}
                title={`Drag or select the ${pieceNames[puzzle.piece]}, then place it on the board`}
              >
                <SparePiece pieceType={puzzle.piece} />
              </div>
            </div>
          ) : null}

          {puzzle.type === 'composition' && !attemptedMove && !answerVisible ? (
            <div className="flex min-h-20 items-center justify-between gap-3 px-2 pt-2 sm:min-h-24" aria-label="Pieces to place">
              <p className="text-sm font-bold text-stone-600">
                {Object.keys(compositionPlacements).length === 0
                  ? 'Drag or select each piece, then place it on the board.'
                  : 'Drag a placed piece, or click it to reposition.'}
              </p>
              <div className="flex shrink-0 gap-2">
                {puzzle.pieces.map((piece) => {
                  const isPlaced = Object.values(compositionPlacements).includes(piece)
                  return (
                    <div
                      key={piece}
                      className={`size-14 rounded-xl border bg-stone-50 p-1 transition sm:size-16 ${
                        selectedCompositionPiece === piece
                          ? 'border-amber-700 ring-4 ring-amber-200'
                          : isPlaced
                            ? 'border-stone-200 opacity-35'
                            : 'border-stone-300'
                      }`}
                      title={`Drag or select the ${pieceNames[piece]}, then place it on the board`}
                    >
                      <SparePiece pieceType={piece} />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </ChessboardProvider>

        {result ? (
          <div
            className={`order-first mb-3 rounded-xl border p-4 shadow-sm sm:p-5 ${
              result === 'correct'
                ? 'border-emerald-200 bg-emerald-950 text-white'
                : 'border-rose-200 bg-rose-950 text-white'
            }`}
            role="status"
            aria-live="polite"
          >
            {result === 'correct' ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Nice work</p>
                  <p className="mt-1 text-2xl font-black sm:text-3xl">Correct!</p>
                </div>
                {puzzleIndex < puzzles.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => resetPuzzle(puzzleIndex + 1)}
                    className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-emerald-950 shadow-lg transition hover:scale-105 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-14"
                    aria-label="Next puzzle"
                    title="Next puzzle"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current sm:size-7">
                      <path d="M8 5.4v13.2c0 .78.86 1.26 1.53.85l10.2-6.6a1 1 0 0 0 0-1.7l-10.2-6.6A1 1 0 0 0 8 5.4Z" />
                    </svg>
                  </button>
                ) : (
                  <p className="text-sm font-bold text-emerald-100">All puzzles complete.</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-2xl font-black sm:text-3xl">Try again, fool!</p>
                {answerVisible ? (
                  <p className="mt-2 text-sm text-rose-100">
                    Answer: <strong>{formatAnswers(puzzle)}</strong>
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={showAnswer}
                    disabled={answerVisible}
                    className="cursor-pointer rounded-full border border-white/35 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Show answer
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPuzzle()}
                    className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-bold text-rose-950 hover:bg-rose-50"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPuzzle(puzzleIndex + 1)}
                    disabled={puzzleIndex === puzzles.length - 1}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Advance
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                      <path d="M8 5.4v13.2c0 .78.86 1.26 1.53.85l10.2-6.6a1 1 0 0 0 0-1.7l-10.2-6.6A1 1 0 0 0 8 5.4Z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-amber-800">
          <a href={collectionHref} className="underline decoration-amber-300 underline-offset-4 hover:text-amber-700">
            {collectionName}
          </a>
          <span aria-hidden="true">/</span>
          <a href={sectionHref} className="underline decoration-amber-300 underline-offset-4 hover:text-amber-700">
            {sectionName}
          </a>
          <span aria-hidden="true">·</span>
          <span className="uppercase tracking-[0.16em]">Puzzle {puzzleIndex + 1} of {puzzles.length}</span>
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
          {puzzle.title}
        </h2>
        <p className="mt-3 text-lg font-bold text-stone-700">
          {puzzle.type === 'placement'
            ? puzzle.instruction ?? 'Place the piece on all squares that make a double attack.'
            : puzzle.type === 'composition'
              ? puzzle.instruction ?? 'Place both pieces so the king is checkmated.'
              : puzzle.instruction ?? `${sideToMove} to move`}
        </p>

        {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.playThrough && result === null ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950" aria-live="polite">
            {isResponding
              ? 'Opponent is replying…'
              : opponentReply
                ? `${sideToMove === 'White' ? 'Black' : 'White'} replied ${opponentReply}. Find mate.`
                : 'Find the first move. After the reply, finish the mate.'}
          </p>
        ) : null}

        {sharedPractice ? (
          <p className={saveStatus === 'error' ? 'mt-2 text-sm font-bold text-rose-800' : 'mt-2 text-sm font-bold text-emerald-800'}>
            {saveStatus === 'loading'
              ? 'Loading shared practice…'
              : saveStatus === 'saving'
                ? 'Saving attempt…'
                : saveStatus === 'error'
                  ? 'This attempt could not be saved for your coach.'
                  : `${studentName || 'Student'} · Shared with coach`}
          </p>
        ) : null}

        {result === null && answerVisible ? (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4" aria-live="polite">
            <p className="text-stone-800">
              Answer: <strong>{formatAnswers(puzzle)}</strong>
            </p>
          </div>
        ) : null}

        {result === null ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {puzzle.type === 'placement' ? (
              <button
                type="button"
                onClick={checkPlacements}
                disabled={placedSquares.length === 0}
                className="cursor-pointer rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check answer
              </button>
            ) : null}
            {puzzle.type === 'composition' ? (
              <button
                type="button"
                onClick={checkComposition}
                disabled={Object.keys(compositionPlacements).length !== puzzle.placements.length}
                className="cursor-pointer rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check answer
              </button>
            ) : null}
            {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.canAnswerNo ? (
              <button
                type="button"
                onClick={answerNoDefense}
                className="cursor-pointer rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800"
              >
                No — mate cannot be prevented
              </button>
            ) : null}
            <button
              type="button"
              onClick={showAnswer}
              disabled={answerVisible}
              className="cursor-pointer rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-900 hover:border-stone-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Show answer
            </button>
            <button
              type="button"
              onClick={() => resetPuzzle()}
              disabled={!attemptedMove && !answerVisible && placedSquares.length === 0 && Object.keys(compositionPlacements).length === 0}
              className="cursor-pointer rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-900 hover:border-stone-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Try again
            </button>
          </div>
        ) : null}

        {puzzleAttempts.length > 0 ? (
          <section className="mt-7 border-t border-stone-200 pt-6" aria-labelledby="attempt-history-heading">
            <h3 id="attempt-history-heading" className="text-lg font-black text-stone-950">
              Attempt history
            </h3>
            <ol className="mt-3 grid gap-2">
              {puzzleAttempts.map((attempt, index) => (
                <li
                  key={`${attempt.move}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3 text-sm"
                >
                  <span className="font-bold text-stone-900">
                    {index + 1}. {attempt.move}
                  </span>
                  <span className={attempt.result === 'correct' ? 'font-bold text-emerald-800' : 'font-bold text-rose-800'}>
                    {attempt.result === 'correct' ? 'Correct' : 'Try again, fool!'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-stone-200 pt-6">
          <button
            type="button"
            onClick={() => resetPuzzle(puzzleIndex - 1)}
            disabled={puzzleIndex === 0}
            className="cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            ← Previous puzzle
          </button>
          <button
            type="button"
            onClick={() => resetPuzzle(puzzleIndex + 1)}
            disabled={puzzleIndex === puzzles.length - 1}
            className="cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            Next puzzle →
          </button>
        </div>
      </div>
    </div>
  )
}

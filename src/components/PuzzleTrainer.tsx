import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import {
  Chessboard,
  ChessboardProvider,
  SparePiece,
  fenStringToPositionObject,
  type Arrow,
  type PositionDataType,
} from 'react-chessboard'
import type { PlaceablePiece, Puzzle } from '../types/puzzles'
import { formatDuration, usePuzzleTimer } from '../hooks/usePuzzleTimer'
import {
  cachePracticeAttempt,
  removeCachedPracticeAttempt,
} from '../lib/practiceClient'
import {
  applyPseudoLegalMove,
  isPseudoLegalMove,
  pseudoLegalMoveContextFromFen,
} from '../lib/pseudoLegalMove'
import {
  BOARD_THEMES,
  BOARD_THEME_STORAGE_KEY,
  WOOD_SQUARE_STYLES,
  WHITE_ON_BOTTOM_STORAGE_KEY,
  type BoardTheme,
} from '../lib/boardThemes'

type PuzzleTrainerProps = {
  puzzles: Puzzle[]
  collectionName: string
  collectionSlug: string
  sectionName: string
  sectionSlug: string
  initialPuzzleId: string
}

type Result = 'correct' | 'incorrect' | 'answer-viewed' | null

type Attempt = {
  move: string
  result: Exclude<Result, null>
  checkedAt?: string
  durationMs?: number
  pauseCount?: number
  restartCount?: number
}

const normalizeSan = (san: string) =>
  san.trim().replaceAll('0', 'O').replace(/[!?]+$/g, '')

const moveWithExpectedPromotion = (
  game: Chess,
  sourceSquare: string,
  targetSquare: string,
  expectedSans: string[],
) => {
  const acceptedMoves = new Set(expectedSans.map(normalizeSan))
  const expectedMove = game.moves({ verbose: true }).find((candidate) =>
    candidate.from === sourceSquare
    && candidate.to === targetSquare
    && acceptedMoves.has(normalizeSan(candidate.san)),
  )

  return game.move({
    from: sourceSquare,
    to: targetSquare,
    promotion: expectedMove?.promotion ?? 'q',
  })
}

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

const initialPositionForPuzzle = (puzzle: Puzzle) => (
  puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.lastMove
    ? puzzle.lastMove.previousFen
    : puzzle.fen
)

const createRouteArrows = (
  moves: string[],
  color = 'rgba(180, 83, 9, 0.52)',
): Arrow[] => moves.map((move) => ({
  startSquare: move.slice(0, 2) as Square,
  endSquare: move.slice(2, 4) as Square,
  color,
}))

const positionAfterCoordinateMoves = (fen: string, moves: string[]): PositionDataType => {
  let nextPosition = fenStringToPositionObject(fen, 8, 8)
  const moveContext = pseudoLegalMoveContextFromFen(fen)

  moves.forEach((move) => {
    nextPosition = applyPseudoLegalMove(
      nextPosition,
      move.slice(0, 2),
      move.slice(2, 4),
      moveContext,
    )
  })

  return nextPosition
}

const createAnswerArrows = (puzzle: Puzzle): Arrow[] => {

  if (puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.routeMoves) {
    return createRouteArrows(puzzle.routeMoves, 'rgba(217, 119, 6, 0.9)')
  }

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

const createAttemptArrow = (
  puzzle: Puzzle,
  attemptMove: string,
  color = 'rgba(4, 120, 87, 0.9)',
): Arrow[] => {
  if (puzzle.type === 'placement' || puzzle.type === 'composition') return []

  const firstMove = attemptMove.trim().split(/\s+/)[0]

  if (puzzle.answerMoves) {
    const answerIndex = puzzle.answers.findIndex(
      (answer) => normalizeSan(answer) === normalizeSan(firstMove),
    )
    const attemptedCoordinates = firstMove.match(/^([a-h][1-8])(?:[-–])?([a-h][1-8])/i)
    const coordinates = answerIndex >= 0
      ? puzzle.answerMoves[answerIndex]
      : attemptedCoordinates
        ? `${attemptedCoordinates[1]}${attemptedCoordinates[2]}`
        : undefined

    return coordinates ? [{
      startSquare: coordinates.slice(0, 2) as Square,
      endSquare: coordinates.slice(2, 4) as Square,
      color,
    }] : []
  }

  const game = new Chess(puzzle.fen)

  try {
    const move = game.move(normalizeSan(firstMove))
    return [{
      startSquare: move.from,
      endSquare: move.to,
      color,
    }]
  } catch {
    return []
  }
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
  const [position, setPosition] = useState<string | PositionDataType>(initialPositionForPuzzle(puzzles[initialPuzzleIndex]))
  const [attemptedMove, setAttemptedMove] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [answerVisible, setAnswerVisible] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [placementPieceSelected, setPlacementPieceSelected] = useState(false)
  const [placedSquares, setPlacedSquares] = useState<string[]>([])
  const [selectedCompositionPiece, setSelectedCompositionPiece] = useState<PlaceablePiece | null>(null)
  const [compositionPlacements, setCompositionPlacements] = useState<Record<string, PlaceablePiece>>({})
  const [activeSolutionLine, setActiveSolutionLine] = useState<string[] | null>(null)
  const [nextSolutionPly, setNextSolutionPly] = useState(0)
  const [routeMoveHistory, setRouteMoveHistory] = useState<string[]>([])
  const [routeCheckMessage, setRouteCheckMessage] = useState('')
  const [opponentReply, setOpponentReply] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [isShowingLastMove, setIsShowingLastMove] = useState(false)
  const [boardRevision, setBoardRevision] = useState(0)
  const [alwaysWhiteOnBottom, setAlwaysWhiteOnBottom] = useState(true)
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('green')
  const [attemptHistory, setAttemptHistory] = useState<Record<string, Attempt[]>>({})
  const [reviewMode, setReviewMode] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'signed-out' | 'error'>('idle')
  const replyTimerRef = useRef<number | null>(null)
  const lastMoveTimerRefs = useRef<number[]>([])
  const focusModeButtonRef = useRef<HTMLButtonElement | null>(null)
  const timer = usePuzzleTimer()

  const puzzle = puzzles[puzzleIndex]
  const puzzleAttempts = attemptHistory[puzzle.id] ?? []
  const solutionEndsInMate = activeSolutionLine
    ? activeSolutionLine.at(-1)?.endsWith('#') ?? false
    : puzzle.type !== 'placement'
      && puzzle.type !== 'composition'
      && puzzle.solutionLines?.every((line) => line.at(-1)?.endsWith('#')) === true
  const sideToMove = puzzle.type === 'placement' || puzzle.type === 'composition'
    ? null
    : puzzle.sideToMove
      ? puzzle.sideToMove === 'white' ? 'White' : 'Black'
      : new Chess(puzzle.fen).turn() === 'w' ? 'White' : 'Black'
  const boardOrientation = alwaysWhiteOnBottom || sideToMove !== 'Black' ? 'white' : 'black'
  const isMultiMovePuzzle = puzzle.type !== 'placement'
    && puzzle.type !== 'composition'
    && (
      (puzzle.playThrough && puzzle.solutionLines?.some((line) => line.length > 1) === true)
      || (puzzle.routeMoves?.length ?? 0) > 1
    )
  const boardArrows = useMemo(
    () => {
      if (answerVisible && puzzle.type !== 'placement' && puzzle.type !== 'composition') {
        return createAnswerArrows(puzzle)
      }

      if (
        puzzle.type !== 'placement'
        && puzzle.type !== 'composition'
        && puzzle.routeMoves
        && routeMoveHistory.length > 0
      ) {
        return createRouteArrows(
          routeMoveHistory,
          result === 'correct' ? 'rgba(217, 119, 6, 0.82)' : undefined,
        )
      }

      if (isMultiMovePuzzle) return []
      if (attemptedMove !== null && result !== 'correct') return []
      const correctAttempt = puzzleAttempts.findLast((attempt) => attempt.result === 'correct')
      return correctAttempt ? createAttemptArrow(puzzle, correctAttempt.move) : []
    },
    [answerVisible, attemptedMove, isMultiMovePuzzle, puzzle, puzzleAttempts, result, routeMoveHistory],
  )
  const reviewArrows = useMemo(
    () => isMultiMovePuzzle ? [] : puzzleAttempts.flatMap((attempt) => {
      if (attempt.result === 'correct') return createAttemptArrow(puzzle, attempt.move)
      if (attempt.result === 'incorrect') {
        return createAttemptArrow(puzzle, attempt.move, 'rgba(190, 18, 60, 0.9)')
      }
      return []
    }),
    [isMultiMovePuzzle, puzzle, puzzleAttempts],
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
    try {
      const savedPreference = window.localStorage.getItem(WHITE_ON_BOTTOM_STORAGE_KEY)
      if (savedPreference === 'true' || savedPreference === 'false') {
        setAlwaysWhiteOnBottom(savedPreference === 'true')
      }
      const savedBoardTheme = window.localStorage.getItem(BOARD_THEME_STORAGE_KEY)
      if (
        savedBoardTheme === 'green'
        || savedBoardTheme === 'blue'
        || savedBoardTheme === 'wood'
        || savedBoardTheme === 'plain'
      ) {
        setBoardTheme(savedBoardTheme)
      }
    } catch {
      // The setting still works for this page when browser storage is unavailable.
    }
  }, [])

  const updateBoardOrientationPreference = (checked: boolean) => {
    setAlwaysWhiteOnBottom(checked)
    try {
      window.localStorage.setItem(WHITE_ON_BOTTOM_STORAGE_KEY, String(checked))
    } catch {
      // Keep the in-page preference when browser storage is unavailable.
    }
  }

  const updateBoardTheme = (theme: BoardTheme) => {
    setBoardTheme(theme)
    try {
      window.localStorage.setItem(BOARD_THEME_STORAGE_KEY, theme)
    } catch {
      // Keep the in-page preference when browser storage is unavailable.
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextReviewMode = params.get('review') === 'student'
    setReviewMode(nextReviewMode)
    if (nextReviewMode) timer.pause()
    const requestedPuzzle = Number(params.get('puzzle'))
    if (Number.isInteger(requestedPuzzle) && requestedPuzzle >= 1 && requestedPuzzle <= puzzles.length) {
      setPuzzleIndex(requestedPuzzle - 1)
      setPosition(initialPositionForPuzzle(puzzles[requestedPuzzle - 1]))
    }

    const controller = new AbortController()
    setSaveStatus('loading')

    void Promise.all([
      fetch('/api/practice/attempts', { signal: controller.signal }),
      fetch('/api/players/me', { signal: controller.signal }),
    ]).then(async ([attemptsResponse, playerResponse]) => {
        const data = await attemptsResponse.json() as {
          attempts?: Array<Attempt & { puzzleId: string }>
          error?: string
        }
        const playerData = await playerResponse.json() as { player: { handle: string } | null }
        if (!attemptsResponse.ok || !data.attempts) throw new Error(data.error ?? 'Could not load practice history.')

        const history = data.attempts.reduce<Record<string, Attempt[]>>(
          (grouped, attempt) => {
            grouped[attempt.puzzleId] = [
              ...(grouped[attempt.puzzleId] ?? []),
              {
                move: attempt.move,
                result: attempt.result,
                checkedAt: attempt.checkedAt,
                durationMs: attempt.durationMs,
                pauseCount: attempt.pauseCount,
                restartCount: attempt.restartCount,
              },
            ]
            return grouped
          },
          {},
        )

        setAttemptHistory(history)
        setSaveStatus(playerData.player ? 'saved' : 'signed-out')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSaveStatus('error')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => () => {
    if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current)
    lastMoveTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId))
  }, [])

  useEffect(() => {
    lastMoveTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId))
    lastMoveTimerRefs.current = []

    if (puzzle.type === 'placement' || puzzle.type === 'composition' || !puzzle.lastMove) {
      setIsShowingLastMove(false)
      return
    }

    setPosition(puzzle.lastMove.previousFen)
    setIsShowingLastMove(true)
    const animateTimer = window.setTimeout(() => setPosition(puzzle.fen), 180)
    const finishTimer = window.setTimeout(() => setIsShowingLastMove(false), 900)
    lastMoveTimerRefs.current = [animateTimer, finishTimer]

    return () => {
      lastMoveTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId))
      lastMoveTimerRefs.current = []
    }
  }, [boardRevision, puzzle])

  useEffect(() => {
    if (!focusMode) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => focusModeButtonRef.current?.focus())
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
    }

    window.addEventListener('keydown', exitOnEscape)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', exitOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [focusMode])

  const toggleFocusMode = () => {
    if (!focusMode && result === null && !timer.isRunning) timer.resume()
    setFocusMode((active) => !active)
  }

  const resetPuzzle = (nextIndex = puzzleIndex, updateUrl = true, isRestart = false) => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
    const nextPuzzle = puzzles[nextIndex]
    if (updateUrl && nextIndex !== puzzleIndex) {
      window.history.pushState(
        {},
        '',
        `/puzzles/${collectionSlug}/${sectionSlug}/puzzle/${nextPuzzle.id}${reviewMode ? '?review=student' : ''}`,
      )
    }
    document.title = `${nextPuzzle.title} | ${sectionName} | ChessBadger`
    setPuzzleIndex(nextIndex)
    setPosition(initialPositionForPuzzle(nextPuzzle))
    setAttemptedMove(null)
    setResult(null)
    setAnswerVisible(false)
    setSelectedSquare(null)
    setPlacementPieceSelected(false)
    setPlacedSquares([])
    setSelectedCompositionPiece(null)
    setCompositionPlacements({})
    setActiveSolutionLine(null)
    setNextSolutionPly(0)
    setRouteMoveHistory([])
    setRouteCheckMessage('')
    setOpponentReply('')
    setIsResponding(false)
    setHistoryExpanded(false)
    setBoardRevision((revision) => revision + 1)
    if (reviewMode) timer.pause()
    else timer.reset(isRestart)
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

  useEffect(() => {
    const handlePuzzleArrowKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

      const target = event.target
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) return

      const nextIndex = event.key === 'ArrowLeft' ? puzzleIndex - 1 : puzzleIndex + 1
      if (nextIndex < 0 || nextIndex >= puzzles.length) return

      event.preventDefault()
      resetPuzzle(nextIndex)
    }

    window.addEventListener('keydown', handlePuzzleArrowKey)
    return () => window.removeEventListener('keydown', handlePuzzleArrowKey)
  }, [puzzleIndex, puzzles.length, reviewMode])

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
    setNextSolutionPly(0)
    setRouteMoveHistory([])
    setRouteCheckMessage('')
    setOpponentReply('')
    setIsResponding(false)
    setAttemptedMove('Answer viewed')
    setAnswerVisible(true)
    recordAttempt('Answer viewed', 'answer-viewed')
  }

  const recordAttempt = (attemptLabel: string, nextResult: Exclude<Result, null>) => {
    const checkedAt = new Date().toISOString()
    const timing = timer.complete()

    setAttemptHistory((history) => ({
      ...history,
      [puzzle.id]: [
        ...(history[puzzle.id] ?? []),
        { move: attemptLabel, result: nextResult, checkedAt, ...timing },
      ],
    }))
    setResult(nextResult)
    setHistoryExpanded(true)

    const cachedAttemptId = cachePracticeAttempt({ puzzleId: puzzle.id, result: nextResult })
    setSaveStatus('saving')
    void fetch('/api/practice/attempts', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        puzzleId: puzzle.id,
        puzzleTitle: puzzle.title,
        move: attemptLabel,
        result: nextResult,
        ...timing,
      }),
    })
      .then(async (response) => {
        if (response.status === 401) {
          setSaveStatus('signed-out')
          return
        }
        if (!response.ok) {
          const data = await response.json() as { error?: string }
          throw new Error(data.error ?? 'Could not save attempt.')
        }
        removeCachedPracticeAttempt(cachedAttemptId)
        setSaveStatus('saved')
      })
      .catch(() => {
        setSaveStatus('error')
      })
  }

  const checkMoveAttempt = (moveSan: string) => {
    const acceptedAnswers = new Set(puzzle.answers.map(normalizeSan))
    recordAttempt(moveSan, acceptedAnswers.has(normalizeSan(moveSan)) ? 'correct' : 'incorrect')
  }

  const answerNoDefense = () => {
    if (puzzle.type === 'placement' || puzzle.type === 'composition' || !puzzle.canAnswerNo || attemptedMove) return
    setAttemptedMove('No')
    checkMoveAttempt('No')
  }

  const continueSolutionLine = (game: Chess, line: string[], replyPly: number) => {
    const replySan = line[replyPly]
    if (!replySan) return false

    setPosition(game.fen())
    setOpponentReply('')
    setIsResponding(true)
    replyTimerRef.current = window.setTimeout(() => {
      const reply = game.move(replySan)
      setPosition(game.fen())
      setOpponentReply(reply.san)
      setNextSolutionPly(replyPly + 1)
      setIsResponding(false)
      replyTimerRef.current = null
    }, 450)
    return true
  }

  const tryMove = (sourceSquare: string, targetSquare: string | null) => {
    if (
      puzzle.type === 'placement'
      || puzzle.type === 'composition'
      || !targetSquare
      || attemptedMove
      || isResponding
      || isShowingLastMove
      || !timer.isRunning
    ) return false

    const currentPosition = typeof position === 'string'
      ? fenStringToPositionObject(position, 8, 8)
      : position
    const moveContext = typeof position === 'string'
      ? pseudoLegalMoveContextFromFen(position)
      : {
          sideToMove: puzzle.sideToMove === 'black' ? 'b' as const : 'w' as const,
          castlingRights: '-',
          enPassantSquare: null,
        }
    const sideToMove = puzzle.answerMoves || puzzle.routeMoves
      ? puzzle.sideToMove === 'black' ? 'b' : 'w'
      : moveContext.sideToMove

    if (!isPseudoLegalMove({
      position: currentPosition,
      sourceSquare,
      targetSquare,
      sideToMove,
      castlingRights: moveContext.castlingRights,
      enPassantSquare: moveContext.enPassantSquare,
    })) return false

    const applyMoveWithoutKingSafety = () => applyPseudoLegalMove(
      currentPosition,
      sourceSquare,
      targetSquare,
      moveContext,
    )
    const coordinateLabel = `${sourceSquare}–${targetSquare}`

    if (puzzle.playThrough && puzzle.solutionLines && typeof position === 'string') {
      const game = new Chess(position)

      try {
        const expectedMoves = activeSolutionLine
          ? [activeSolutionLine[nextSolutionPly]].filter((move): move is string => Boolean(move))
          : puzzle.solutionLines.map((line) => line[0])
        if (expectedMoves.length === 0) return false
        const move = moveWithExpectedPromotion(game, sourceSquare, targetSquare, expectedMoves)

        setSelectedSquare(null)

        if (activeSolutionLine) {
          const isCorrect = normalizeSan(move.san) === normalizeSan(activeSolutionLine[nextSolutionPly])
          const attemptLabel = [...activeSolutionLine.slice(0, nextSolutionPly), move.san].join(' ')

          if (!isCorrect || nextSolutionPly === activeSolutionLine.length - 1) {
            setPosition(game.fen())
            setAttemptedMove(attemptLabel)
            recordAttempt(attemptLabel, isCorrect ? 'correct' : 'incorrect')
            return true
          }

          continueSolutionLine(game, activeSolutionLine, nextSolutionPly + 1)
          return true
        }

        const matchingLine = puzzle.solutionLines.find(
          (line) => normalizeSan(line[0]) === normalizeSan(move.san),
        )

        if (!matchingLine) {
          setPosition(game.fen())
          setAttemptedMove(move.san)
          recordAttempt(move.san, 'incorrect')
          return true
        }

        setActiveSolutionLine(matchingLine)
        setNextSolutionPly(2)
        continueSolutionLine(game, matchingLine, 1)
        return true
      } catch {
        setPosition(applyMoveWithoutKingSafety())
        setAttemptedMove(coordinateLabel)
        setSelectedSquare(null)
        recordAttempt(coordinateLabel, 'incorrect')
        return true
      }
    }

    if (puzzle.routeMoves) {
      const attemptedCoordinates = `${sourceSquare}${targetSquare}`.toLowerCase()

      setPosition(applyMoveWithoutKingSafety())
      setSelectedSquare(null)
      setRouteMoveHistory((moves) => [...moves, attemptedCoordinates])
      setRouteCheckMessage('')
      return true
    }

    if (puzzle.answerMoves) {
      const attemptedCoordinates = `${sourceSquare}${targetSquare}`.toLowerCase()
      const answerIndex = puzzle.answerMoves.findIndex((move) => move.toLowerCase() === attemptedCoordinates)
      const attemptLabel = answerIndex >= 0
        ? puzzle.answers[answerIndex]
        : coordinateLabel

      setPosition(applyMoveWithoutKingSafety())
      setAttemptedMove(attemptLabel)
      setSelectedSquare(null)
      recordAttempt(attemptLabel, answerIndex >= 0 ? 'correct' : 'incorrect')
      return true
    }

    if (typeof position !== 'string') return false

    const game = new Chess(position)

    try {
      const move = moveWithExpectedPromotion(game, sourceSquare, targetSquare, puzzle.answers)

      setPosition(game.fen())
      setAttemptedMove(move.san)
      setSelectedSquare(null)
      checkMoveAttempt(move.san)
      return true
    } catch {
      setPosition(applyMoveWithoutKingSafety())
      setAttemptedMove(coordinateLabel)
      setSelectedSquare(null)
      recordAttempt(coordinateLabel, 'incorrect')
      return true
    }
  }

  const tryPlacement = (
    targetSquare: string | null,
    pieceType = puzzle.type === 'placement' ? puzzle.piece : '',
    sourceSquare: string | null = null,
  ) => {
    if (puzzle.type !== 'placement' || !targetSquare || attemptedMove || answerVisible || !timer.isRunning || pieceType !== puzzle.piece) return false

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
    recordAttempt(attemptLabel, isCorrect ? 'correct' : 'incorrect')
  }

  const tryCompositionPlacement = (
    targetSquare: string | null,
    pieceType: PlaceablePiece | '',
    sourceSquare: string | null = null,
  ) => {
    if (puzzle.type !== 'composition' || !targetSquare || !pieceType || attemptedMove || answerVisible || !timer.isRunning) return false
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
    recordAttempt(attemptLabel, isCorrect ? 'correct' : 'incorrect')
  }

  const undoRouteMove = () => {
    if (
      puzzle.type === 'placement'
      || puzzle.type === 'composition'
      || !puzzle.routeMoves
      || routeMoveHistory.length === 0
      || attemptedMove
      || answerVisible
      || !timer.isRunning
    ) return

    const remainingMoves = routeMoveHistory.slice(0, -1)
    setPosition(positionAfterCoordinateMoves(puzzle.fen, remainingMoves))
    setRouteMoveHistory(remainingMoves)
    setRouteCheckMessage('')
    setSelectedSquare(null)
  }

  const checkRoute = () => {
    if (
      puzzle.type === 'placement'
      || puzzle.type === 'composition'
      || !puzzle.routeMoves
      || routeMoveHistory.length === 0
      || attemptedMove
      || answerVisible
      || !timer.isRunning
    ) return

    const isCorrect = routeMoveHistory.length === puzzle.routeMoves.length
      && puzzle.routeMoves.every(
        (move, index) => move.toLowerCase() === routeMoveHistory[index]?.toLowerCase(),
      )

    if (!isCorrect) {
      setRouteCheckMessage('Not quite—adjust your route and check again.')
      return
    }

    const attemptLabel = puzzle.answers[0] ?? routeMoveHistory.join(' ')
    setRouteCheckMessage('')
    setAttemptedMove(attemptLabel)
    recordAttempt(attemptLabel, 'correct')
  }

  const handleSquareClick = (square: string) => {
    if (attemptedMove || answerVisible || isResponding || isShowingLastMove || !timer.isRunning) return

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


    if (puzzle.answerMoves || puzzle.routeMoves) {
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
      const routeSourceSquare = puzzle.routeMoves
        ? routeMoveHistory.at(-1)?.slice(2, 4) ?? puzzle.routeMoves[0]?.slice(0, 2)
        : null
      if (
        piece?.pieceType.startsWith(expectedColor)
        && (!routeSourceSquare || clickedSquare === routeSourceSquare)
      ) setSelectedSquare(clickedSquare)
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
  const lastMoveSquareStyles = puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.lastMove
    ? {
        [puzzle.lastMove.from]: { boxShadow: 'inset 0 0 0 4px rgba(217, 119, 6, 0.62)' },
        [puzzle.lastMove.to]: { boxShadow: 'inset 0 0 0 4px rgba(217, 119, 6, 0.62)' },
      }
    : {}
  const interactionSquareStyles = {
    ...lastMoveSquareStyles,
    ...(answerVisible && (puzzle.type === 'placement' || puzzle.type === 'composition')
    ? Object.fromEntries(answerSquares.map((answer) => [answer, {
        boxShadow: 'inset 0 0 0 5px rgba(217, 119, 6, 0.88)',
      }]))
    : selectedSquare ? {
        [selectedSquare]: {
          boxShadow: 'inset 0 0 0 4px rgba(120, 53, 15, 0.7)',
        },
      }
    : {}),
  }
  const themeSquareStyles = boardTheme === 'wood' ? WOOD_SQUARE_STYLES : {}
  const squareStyles = {
    ...themeSquareStyles,
    ...Object.fromEntries(Object.entries(interactionSquareStyles).map(([square, style]) => [
      square,
      { ...themeSquareStyles[square], ...style },
    ])),
  }

  const collectionHref = `/puzzles/${collectionSlug}`
  const sectionHref = `/puzzles/${collectionSlug}/${sectionSlug}`
  const reviewReturnHref = `/puzzles/${collectionSlug}/${sectionSlug}#attempt-details`
  const reviewStatus = puzzleAttempts.some((attempt) => attempt.result === 'correct')
    ? puzzleAttempts.some((attempt) => attempt.result !== 'correct') ? 'After retry' : 'First try'
    : puzzleAttempts.length > 0 ? 'Not solved' : 'Not attempted'
  const reviewStatusClass = reviewStatus === 'Not solved'
    ? 'text-rose-800'
    : reviewStatus === 'Not attempted' ? 'text-stone-600' : 'text-emerald-800'
  const findReviewIndex = (direction: -1 | 1) => {
    for (let index = puzzleIndex + direction; index >= 0 && index < puzzles.length; index += direction) {
      const attempts = attemptHistory[puzzles[index].id] ?? []
      const solvedOnFirstTry = attempts.some((attempt) => attempt.result === 'correct')
        && attempts.every((attempt) => attempt.result === 'correct')
      if (attempts.length > 0 && !solvedOnFirstTry) return index
    }
    return null
  }
  const previousReviewIndex = findReviewIndex(-1)
  const nextReviewIndex = findReviewIndex(1)

  if (reviewMode) {
    return (
      <div className="grid gap-6 md:grid-cols-[minmax(0,560px)_minmax(280px,1fr)] md:items-start lg:gap-8">
        <div className="w-full max-w-[560px] rounded-2xl border border-stone-300 bg-white p-2 shadow-sm sm:p-3">
          <ChessboardProvider
            key={`review-${puzzle.id}-${boardTheme}`}
            options={{
              id: `review-puzzle-board-${puzzle.id}`,
              position: puzzle.fen,
              boardOrientation,
              showNotation: true,
              allowDragging: false,
              allowDrawingArrows: false,
              arrows: reviewArrows,
              clearArrowsOnClick: false,
              clearArrowsOnPositionChange: false,
              squareStyles: themeSquareStyles,
              lightSquareStyle: BOARD_THEMES[boardTheme].light,
              darkSquareStyle: BOARD_THEMES[boardTheme].dark,
              lightSquareNotationStyle: { color: BOARD_THEMES[boardTheme].lightNotation },
              darkSquareNotationStyle: { color: BOARD_THEMES[boardTheme].darkNotation },
              canDragPiece: () => false,
            }}
          >
            <div className="overflow-hidden rounded-xl"><Chessboard /></div>
          </ChessboardProvider>
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
            <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
              Board style
              <select value={boardTheme} onChange={(event) => updateBoardTheme(event.currentTarget.value as BoardTheme)} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-semibold text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200">
                {(Object.entries(BOARD_THEMES) as Array<[BoardTheme, (typeof BOARD_THEMES)[BoardTheme]]>).map(([value, theme]) => <option key={value} value={value}>{theme.label}</option>)}
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-stone-700">
              <input type="checkbox" checked={alwaysWhiteOnBottom} onChange={(event) => updateBoardOrientationPreference(event.currentTarget.checked)} className="size-4 cursor-pointer accent-amber-800" />
              Always show White on bottom
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href={reviewReturnHref} className="inline-flex items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-700">
              <span aria-hidden="true">←</span> Back to your results
            </a>
            <a href={`/puzzles/${collectionSlug}/${sectionSlug}/puzzle/${puzzle.id}`} className="inline-flex rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">Try again</a>
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{collectionName} · {sectionName}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.015em] text-stone-950 sm:text-3xl">{puzzle.title}</h1>
          <p className="mt-2 text-stone-600">{sideToMove ? `${sideToMove} to move` : puzzle.instruction}</p>

          <div className="mt-5 grid gap-3 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
            <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">Result</p><p className={`mt-1 font-bold ${reviewStatusClass}`}>{reviewStatus}</p></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">Answer</p>
              <p className="mt-1 font-bold text-stone-900">{formatAnswers(puzzle)}</p>
              {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.solutionNote ? (
                <p className="mt-1 text-sm text-stone-600">{puzzle.solutionNote}</p>
              ) : null}
            </div>
          </div>

          <section className="mt-6 border-t border-stone-200 pt-5" aria-labelledby="review-attempt-history-heading">
            <h2 id="review-attempt-history-heading" className="text-lg font-bold text-stone-950">Your attempts</h2>
            {saveStatus === 'loading' ? <p className="mt-3 text-sm text-stone-500">Loading attempts…</p> : puzzleAttempts.length === 0 ? (
              <p className="mt-3 rounded-xl bg-stone-50 px-4 py-5 text-sm text-stone-600">No attempts have been recorded for this puzzle.</p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {puzzleAttempts.map((attempt, index) => {
                  const details = [attempt.checkedAt ? new Date(attempt.checkedAt).toLocaleString() : null, attempt.durationMs !== undefined ? formatDuration(attempt.durationMs) : null].filter(Boolean)
                  return (
                    <li key={`${attempt.move}-${index}`} className="flex items-start justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3 text-sm">
                      <span><span className="block font-bold text-stone-900">{index + 1}. {attempt.move}</span>{details.length > 0 ? <span className="mt-1 block text-stone-500">{details.join(' · ')}</span> : null}</span>
                      <span className={attempt.result === 'correct' ? 'font-bold text-emerald-800' : attempt.result === 'answer-viewed' ? 'font-bold text-amber-800' : 'font-bold text-rose-800'}>{attempt.result === 'correct' ? 'Correct' : attempt.result === 'answer-viewed' ? 'Answer viewed' : 'Incorrect'}</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <div className="mt-6 border-t border-stone-200 pt-5">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => resetPuzzle(puzzleIndex - 1)}
                disabled={puzzleIndex === 0}
                aria-keyshortcuts="ArrowLeft"
                title="Previous puzzle (←)"
                className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                <span aria-hidden="true">←</span> Previous puzzle
              </button>
              <button
                type="button"
                onClick={() => resetPuzzle(puzzleIndex + 1)}
                disabled={puzzleIndex === puzzles.length - 1}
                aria-keyshortcuts="ArrowRight"
                title="Next puzzle (→)"
                className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                Next puzzle <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => previousReviewIndex !== null && resetPuzzle(previousReviewIndex)}
                disabled={previousReviewIndex === null}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700 hover:border-amber-700 hover:text-amber-900 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                Previous review
              </button>
              <button
                type="button"
                onClick={() => nextReviewIndex !== null && resetPuzzle(nextReviewIndex)}
                disabled={nextReviewIndex === null}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700 hover:border-amber-700 hover:text-amber-900 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                Next review
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-stone-500">Review navigation focuses on retries and unsolved puzzles.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={focusMode
        ? 'fixed inset-0 z-[100] overflow-y-auto bg-[#eef6ff] p-3 sm:p-5'
        : 'grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] lg:items-start xl:gap-7'}
      aria-label={focusMode ? 'Puzzle focus mode' : undefined}
    >
      <div
        className={`relative flex w-full flex-col rounded-2xl border border-stone-300 bg-white p-2 shadow-sm sm:p-3 ${focusMode ? 'mx-auto' : ''}`}
        style={focusMode ? { maxWidth: 'min(calc(100vh - 9rem), calc(100vw - 2rem))' } : undefined}
      >
        <div className="flex items-center justify-end px-1 pb-2">
          <button
            ref={focusModeButtonRef}
            type="button"
            onClick={toggleFocusMode}
            aria-pressed={focusMode}
            aria-keyshortcuts="Escape"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm transition hover:border-amber-700 hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            {focusMode ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="2"><path d="M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="2"><path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
            {focusMode ? 'Exit focus' : 'Focus'}
          </button>
        </div>
        <ChessboardProvider
          key={`${puzzle.id}-${boardRevision}-${boardTheme}`}
          options={{
              id: `puzzle-board-${puzzle.id}`,
              position: boardPosition,
              boardOrientation,
              showNotation: true,
              animationDurationInMs: 520,
              allowDragging: attemptedMove === null && !isShowingLastMove && timer.isRunning,
              allowDrawingArrows: false,
              arrows: boardArrows,
              clearArrowsOnClick: false,
              clearArrowsOnPositionChange: false,
              squareStyles,
              lightSquareStyle: BOARD_THEMES[boardTheme].light,
              darkSquareStyle: BOARD_THEMES[boardTheme].dark,
              lightSquareNotationStyle: { color: BOARD_THEMES[boardTheme].lightNotation },
              darkSquareNotationStyle: { color: BOARD_THEMES[boardTheme].darkNotation },
              canDragPiece: ({ isSparePiece, square }) => {
                if (attemptedMove !== null || answerVisible || isResponding || isShowingLastMove || !timer.isRunning) return false
                if (puzzle.type === 'placement') {
                  return isSparePiece || (square !== null && placedSquares.includes(square))
                }
                if (puzzle.type === 'composition') {
                  return isSparePiece || (square !== null && Boolean(compositionPlacements[square]))
                }
                return !isSparePiece
              },
              onPieceClick: ({ isSparePiece, piece }) => {
                if (puzzle.type === 'placement' && isSparePiece && !attemptedMove && timer.isRunning) {
                  setPlacementPieceSelected(true)
                }
                if (puzzle.type === 'composition' && isSparePiece && !attemptedMove && timer.isRunning) {
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

          <div className={`${focusMode ? 'hidden' : 'flex'} flex-wrap items-center justify-between gap-3 px-1 pt-3`}>
            <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
              Board style
              <select
                value={boardTheme}
                onChange={(event) => updateBoardTheme(event.currentTarget.value as BoardTheme)}
                className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-semibold text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200"
              >
                {(Object.entries(BOARD_THEMES) as Array<[BoardTheme, (typeof BOARD_THEMES)[BoardTheme]]>).map(([value, theme]) => (
                  <option key={value} value={value}>{theme.label}</option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-stone-700">
              <input
                type="checkbox"
                checked={alwaysWhiteOnBottom}
                onChange={(event) => updateBoardOrientationPreference(event.currentTarget.checked)}
                className="size-4 cursor-pointer accent-amber-800"
              />
              Always show White on bottom
            </label>
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
            className={`${focusMode ? 'mt-3 p-3 sm:p-4' : 'order-first mb-3 p-4 sm:p-5'} rounded-xl border shadow-sm ${
              result === 'correct'
                ? 'border-emerald-200 bg-emerald-950 text-white'
                : result === 'answer-viewed'
                  ? 'border-amber-200 bg-amber-950 text-white'
                  : 'border-rose-200 bg-rose-950 text-white'
            }`}
            role="status"
            aria-live="polite"
          >
            {result === 'correct' ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Nice work</p>
                  <p className={`${focusMode ? 'mt-0.5 text-lg' : 'mt-1 text-2xl sm:text-3xl'} font-bold`}>Correct!</p>
                </div>
                {!focusMode && puzzleIndex < puzzles.length - 1 ? (
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
                ) : !focusMode ? (
                  <p className="text-sm font-bold text-emerald-100">All puzzles complete.</p>
                ) : null}
              </div>
            ) : result === 'answer-viewed' ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Answer viewed</p>
                <p className={`${focusMode ? 'mt-1' : 'mt-2'} text-sm text-amber-50`}>
                  Answer: <strong>{formatAnswers(puzzle)}</strong>
                </p>
                {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.solutionNote ? (
                  <p className="mt-1 text-sm text-amber-100">{puzzle.solutionNote}</p>
                ) : null}
                {!focusMode ? <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => resetPuzzle(puzzleIndex, true, true)}
                    className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-50"
                  >
                    Restart puzzle
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPuzzle(puzzleIndex + 1)}
                    disabled={puzzleIndex === puzzles.length - 1}
                    className="cursor-pointer rounded-full border border-white/35 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Advance
                  </button>
                </div> : null}
              </div>
            ) : (
              <div>
                <p className={`${focusMode ? 'text-lg' : 'text-2xl sm:text-3xl'} font-bold`}>
                  Not quite—
                  <button
                    type="button"
                    onClick={() => resetPuzzle(puzzleIndex, true, true)}
                    className="cursor-pointer underline decoration-rose-300 underline-offset-4 hover:text-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    try again
                  </button>
                  .
                </p>
                {answerVisible ? (
                  <div className="mt-2 text-sm text-rose-100">
                    <p>Answer: <strong>{formatAnswers(puzzle)}</strong></p>
                    {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.solutionNote ? (
                      <p className="mt-1">{puzzle.solutionNote}</p>
                    ) : null}
                  </div>
                ) : null}
                {!focusMode ? <div className="mt-4 flex flex-wrap gap-2">
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
                    onClick={() => resetPuzzle(puzzleIndex, true, true)}
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
                </div> : null}
              </div>
            )}
          </div>
        ) : null}

        {focusMode ? (
          <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 sm:gap-4 sm:p-3">
            <button
              type="button"
              onClick={() => resetPuzzle(puzzleIndex - 1)}
              disabled={puzzleIndex === 0}
              aria-label="Previous puzzle"
              aria-keyshortcuts="ArrowLeft"
              title="Previous puzzle (←)"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:text-stone-400 sm:px-3"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current" strokeWidth="2.5"><path d="M18 12H6m5 5-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex min-w-0 flex-col items-center justify-center gap-2 text-center sm:flex-row sm:flex-wrap">
              <p className="text-sm font-bold text-stone-700">
                {puzzle.type === 'placement'
                  ? puzzle.instruction ?? 'Place the piece on all squares that make a double attack.'
                  : puzzle.type === 'composition'
                    ? puzzle.instruction ?? 'Place both pieces so the king is checkmated.'
                    : puzzle.instruction ?? `${sideToMove} to move`}
              </p>
              {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.routeMoves && result === null ? (
                <p className={routeCheckMessage ? 'text-sm font-bold text-rose-800' : 'text-sm font-semibold text-amber-900'} aria-live="polite">
                  {routeCheckMessage || `${routeMoveHistory.length} ${routeMoveHistory.length === 1 ? 'move' : 'moves'} played`}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {!timer.isRunning && result === null ? (
                  <button type="button" onClick={timer.resume} className="cursor-pointer rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
                    Resume puzzle
                  </button>
                ) : (
                  <>
                    {result === null && puzzle.type === 'placement' ? (
                      <button type="button" onClick={checkPlacements} disabled={placedSquares.length === 0} className="cursor-pointer rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40">
                        Check answer
                      </button>
                    ) : null}
                    {result === null && puzzle.type === 'composition' ? (
                      <button type="button" onClick={checkComposition} disabled={Object.keys(compositionPlacements).length !== puzzle.placements.length} className="cursor-pointer rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40">
                        Check answer
                      </button>
                    ) : null}
                    {result === null && puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.routeMoves ? (
                      <>
                        <button type="button" onClick={undoRouteMove} disabled={routeMoveHistory.length === 0} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-800 hover:border-amber-700 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-40">
                          Undo last move
                        </button>
                        <button type="button" onClick={checkRoute} disabled={routeMoveHistory.length === 0} className="cursor-pointer rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40">
                          Check answer
                        </button>
                      </>
                    ) : null}
                    {result === null && puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.canAnswerNo ? (
                      <button type="button" onClick={answerNoDefense} className="cursor-pointer rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
                        No — mate cannot be prevented
                      </button>
                    ) : null}
                    {result !== 'correct' ? (
                      <button
                        type="button"
                        onClick={showAnswer}
                        disabled={answerVisible || (result === null && !timer.isRunning)}
                        className="cursor-pointer rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Show answer
                      </button>
                    ) : null}
                    {result !== null ? (
                      <button type="button" onClick={() => resetPuzzle(puzzleIndex, true, true)} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-800 hover:border-amber-700 hover:text-amber-900">
                        Try again
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => resetPuzzle(puzzleIndex + 1)}
              disabled={puzzleIndex === puzzles.length - 1}
              aria-label="Next puzzle"
              aria-keyshortcuts="ArrowRight"
              title="Next puzzle (→)"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:text-stone-400 sm:px-3"
            >
              <span className="hidden sm:inline">Next</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current" strokeWidth="2.5"><path d="M6 12h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        ) : null}
      </div>

      {!focusMode ? <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-amber-800">
          <a href={collectionHref} className="underline decoration-amber-300 underline-offset-4 hover:text-amber-700">
            {collectionName}
          </a>
          <span aria-hidden="true">/</span>
          <a href={sectionHref} className="underline decoration-amber-300 underline-offset-4 hover:text-amber-700">
            {sectionName}
          </a>
          <span aria-hidden="true">·</span>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Puzzle {puzzleIndex + 1} of {puzzles.length}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.015em] text-stone-950 sm:text-3xl">
          {puzzle.title}
        </h1>
        <p className="mt-3 text-lg font-semibold text-stone-700">
          {puzzle.type === 'placement'
            ? puzzle.instruction ?? 'Place the piece on all squares that make a double attack.'
            : puzzle.type === 'composition'
              ? puzzle.instruction ?? 'Place both pieces so the king is checkmated.'
              : puzzle.instruction ?? `${sideToMove} to move`}
        </p>
        {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.lastMove ? (
          <p className="mt-2 text-sm font-bold text-amber-900" aria-live="polite">
            Last move: {puzzle.lastMove.san}. Find the best response.
          </p>
        ) : null}
        {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.routeMoves && result === null && !answerVisible ? (
          <div className="mt-2 text-sm font-bold text-amber-900" aria-live="polite">
            <p>Moves played: {routeMoveHistory.length}. Finish the route, then check your answer.</p>
            {routeCheckMessage ? <p className="mt-1 text-rose-800">{routeCheckMessage}</p> : null}
          </div>
        ) : null}

        <section className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500" aria-label="Puzzle timer">
          <span>Active time</span>
          <span className="font-mono font-semibold tabular-nums text-stone-700" aria-live="off">
            {formatDuration(timer.elapsedMs)}
          </span>
          {result === null ? (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={timer.isRunning ? timer.pause : timer.resume}
                className="cursor-pointer font-semibold text-amber-900 underline decoration-amber-300 underline-offset-4 hover:text-amber-700"
              >
                {timer.isRunning ? 'Pause' : 'Resume'}
              </button>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => resetPuzzle(puzzleIndex, true, true)}
            className="cursor-pointer font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
          >
            Restart
          </button>
          {!timer.isRunning && result === null ? (
            <p className="basis-full text-xs font-semibold text-amber-900">
              {timer.pauseReason === 'hidden'
                ? 'Paused while this tab was away.'
                : timer.pauseReason === 'inactivity'
                  ? 'Paused after five minutes without activity.'
                  : 'Timer paused.'}
            </p>
          ) : null}
        </section>

        {timer.showInactivityPrompt ? (
          <section className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4" role="alertdialog" aria-labelledby="still-working-heading">
            <h2 id="still-working-heading" className="font-bold text-amber-950">Still working on this puzzle?</h2>
            <p className="mt-1 text-sm text-amber-900">The timer paused after five minutes without activity.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={timer.resume} className="cursor-pointer rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
                Continue
              </button>
              <button type="button" onClick={timer.keepPaused} className="cursor-pointer rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-950 hover:border-amber-500">
                Keep paused
              </button>
            </div>
          </section>
        ) : null}

        {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.playThrough && result === null ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950" aria-live="polite">
            {isResponding
              ? 'Opponent is replying…'
              : opponentReply
                ? `${sideToMove === 'White' ? 'Black' : 'White'} replied ${opponentReply}. ${activeSolutionLine && nextSolutionPly === activeSolutionLine.length - 1 && solutionEndsInMate ? 'Finish the mate.' : 'Continue the combination.'}`
                : puzzle.solutionLines?.some((line) => line.length > 3)
                  ? `Find the first move. Play the combination through${solutionEndsInMate ? ' to mate' : ''}.`
                  : `Find the first move. After the reply, finish the ${solutionEndsInMate ? 'mate' : 'combination'}.`}
          </p>
        ) : null}

        {saveStatus !== 'idle' && saveStatus !== 'saved' ? (
          <p className={saveStatus === 'error' ? 'mt-2 text-sm font-bold text-rose-800' : saveStatus === 'signed-out' ? 'mt-2 text-sm font-bold text-amber-900' : 'mt-2 text-sm font-bold text-emerald-800'}>
            {saveStatus === 'loading'
              ? 'Loading progress…'
              : saveStatus === 'saving'
                ? 'Saving attempt…'
                : saveStatus === 'signed-out'
                  ? <><a href="/players" className="underline decoration-2 underline-offset-2 hover:text-amber-700">Sign in or claim a name</a> to save progress across devices.</>
                : saveStatus === 'error'
                  ? 'This attempt could not be saved.'
                  : null}
          </p>
        ) : null}

        {result === null && answerVisible ? (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4" aria-live="polite">
            <p className="text-stone-800">
              Answer: <strong>{formatAnswers(puzzle)}</strong>
            </p>
            {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.solutionNote ? (
              <p className="mt-2 text-sm text-stone-600">{puzzle.solutionNote}</p>
            ) : null}
          </div>
        ) : null}

        {result === null ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {puzzle.type === 'placement' ? (
              <button
                type="button"
                onClick={checkPlacements}
                disabled={placedSquares.length === 0 || !timer.isRunning}
              className="cursor-pointer rounded-lg bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check answer
              </button>
            ) : null}
            {puzzle.type === 'composition' ? (
              <button
                type="button"
                onClick={checkComposition}
                disabled={Object.keys(compositionPlacements).length !== puzzle.placements.length || !timer.isRunning}
                className="cursor-pointer rounded-lg bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check answer
              </button>
            ) : null}
            {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.routeMoves ? (
              <>
                <button
                  type="button"
                  onClick={undoRouteMove}
                  disabled={routeMoveHistory.length === 0 || !timer.isRunning}
                  className="cursor-pointer rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-800 hover:border-amber-700 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Undo last move
                </button>
                <button
                  type="button"
                  onClick={checkRoute}
                  disabled={routeMoveHistory.length === 0 || !timer.isRunning}
                  className="cursor-pointer rounded-lg bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Check answer
                </button>
              </>
            ) : null}
            {puzzle.type !== 'placement' && puzzle.type !== 'composition' && puzzle.canAnswerNo ? (
              <button
                type="button"
                onClick={answerNoDefense}
                disabled={!timer.isRunning}
                className="cursor-pointer rounded-lg bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800"
              >
                No — mate cannot be prevented
              </button>
            ) : null}
            <button
              type="button"
              onClick={showAnswer}
              disabled={answerVisible || !timer.isRunning}
              className="cursor-pointer rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Show answer
            </button>
          </div>
        ) : null}

        {puzzleAttempts.length > 0 ? (
          <details
            open={historyExpanded}
            onToggle={(event) => setHistoryExpanded(event.currentTarget.open)}
            className="group mt-7 border-t border-stone-200 pt-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 transition hover:border-amber-400 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3 font-bold">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current transition group-open:rotate-90" strokeWidth="2.5"><path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Attempt history
              </span>
              <span className="text-sm font-semibold text-stone-500">{puzzleAttempts.length} {puzzleAttempts.length === 1 ? 'attempt' : 'attempts'}</span>
            </summary>
            <ol className="mt-3 grid gap-2" aria-label="Attempt history">
              {puzzleAttempts.map((attempt, index) => (
                <li
                  key={`${attempt.move}-${index}`}
                  className="flex items-start justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3 text-sm"
                >
                  <span>
                    <span className="block font-bold text-stone-900">{index + 1}. {attempt.move}</span>
                    {attempt.durationMs !== undefined ? (
                      <span className="mt-1 block text-stone-500">
                        {formatDuration(attempt.durationMs)}
                        {attempt.pauseCount ? ` · ${attempt.pauseCount} ${attempt.pauseCount === 1 ? 'pause' : 'pauses'}` : ''}
                        {attempt.restartCount ? ` · ${attempt.restartCount} ${attempt.restartCount === 1 ? 'restart' : 'restarts'}` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className={attempt.result === 'correct' ? 'font-bold text-emerald-800' : attempt.result === 'answer-viewed' ? 'font-bold text-amber-800' : 'font-bold text-rose-800'}>
                    {attempt.result === 'correct' ? 'Correct' : attempt.result === 'answer-viewed' ? 'Answer viewed' : 'Not quite'}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        <div className={`${focusMode ? 'mt-auto' : 'mt-8'} flex items-center justify-between gap-4 border-t border-stone-200 pt-6`}>
          <button
            type="button"
            onClick={() => resetPuzzle(puzzleIndex - 1)}
            disabled={puzzleIndex === 0}
            aria-keyshortcuts="ArrowLeft"
            title="Previous puzzle (←)"
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="2.5"><path d="M18 12H6m5 5-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Previous puzzle
          </button>
          <button
            type="button"
            onClick={() => resetPuzzle(puzzleIndex + 1)}
            disabled={puzzleIndex === puzzles.length - 1}
            aria-keyshortcuts="ArrowRight"
            title="Next puzzle (→)"
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            Next puzzle
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="2.5"><path d="M6 12h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div> : null}
    </div>
  )
}

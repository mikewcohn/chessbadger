import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard, ChessboardProvider } from 'react-chessboard'
import { BOARD_SQUARE_STYLES, BOARD_THEMES, type BoardTheme } from '../lib/boardThemes'
import { PIECE_THEMES, type PieceTheme } from '../lib/pieceThemes'
import { StockfishEngine } from '../lib/stockfishEngine'

type AnalysisMove = {
  actor: 'you' | 'stockfish'
  fen: string
  san: string
}

type AnalysisMoveRow = {
  moveNumber: number
  white?: AnalysisMove
  black?: AnalysisMove
}

type AnalysisStatus = 'loading' | 'ready' | 'thinking' | 'ended' | 'error'

type PuzzleAnalysisProps = {
  initialFen: string
  puzzleTitle: string
  collectionName: string
  sectionName: string
  boardTheme: BoardTheme
  pieceTheme: PieceTheme
  boardOrientation: 'white' | 'black'
  prefersReducedMotion: boolean
  onExit: () => void
  sourceLabel?: string
  analysisDescription?: string
}

const finishedPositionCopy = (game: Chess) => {
  if (game.isCheckmate()) return `${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate.`
  if (game.isStalemate()) return 'Draw by stalemate.'
  if (game.isThreefoldRepetition()) return 'Draw by threefold repetition.'
  if (game.isInsufficientMaterial()) return 'Draw by insufficient material.'
  if (game.isDraw()) return 'The position is drawn.'
  return ''
}

export default function PuzzleAnalysis({
  initialFen,
  puzzleTitle,
  collectionName,
  sectionName,
  boardTheme,
  pieceTheme,
  boardOrientation,
  prefersReducedMotion,
  onExit,
  sourceLabel,
  analysisDescription,
}: PuzzleAnalysisProps) {
  const [fen, setFen] = useState(initialFen)
  const [moves, setMoves] = useState<AnalysisMove[]>([])
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [status, setStatus] = useState<AnalysisStatus>('loading')
  const [statusMessage, setStatusMessage] = useState('Loading Stockfish…')
  const [engineRevision, setEngineRevision] = useState(0)
  const engineRef = useRef<StockfishEngine | null>(null)
  const searchRevisionRef = useRef(0)

  useEffect(() => {
    let active = true
    const engine = new StockfishEngine()
    engineRef.current = engine
    setStatus('loading')
    setStatusMessage('Loading Stockfish…')

    void engine.ready().then(() => {
      if (!active) return
      setStatus('ready')
      setStatusMessage('Your move')
    }).catch(() => {
      if (!active) return
      setStatus('error')
      setStatusMessage('Stockfish could not start in this browser.')
    })

    return () => {
      active = false
      searchRevisionRef.current += 1
      engine.terminate()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [engineRevision])

  const game = useMemo(() => new Chess(fen), [fen])
  const moveRows = useMemo(() => {
    const fenFields = initialFen.split(' ')
    let activeColor = fenFields[1] === 'b' ? 'b' : 'w'
    let moveNumber = Number.parseInt(fenFields[5] ?? '1', 10)
    if (!Number.isFinite(moveNumber) || moveNumber < 1) moveNumber = 1

    return moves.reduce<AnalysisMoveRow[]>((rows, move) => {
      let row = rows.at(-1)
      if (!row || row.moveNumber !== moveNumber) {
        row = { moveNumber }
        rows.push(row)
      }

      if (activeColor === 'w') {
        row.white = move
        activeColor = 'b'
      } else {
        row.black = move
        activeColor = 'w'
        moveNumber += 1
      }

      return rows
    }, [])
  }, [initialFen, moves])
  const canMove = status === 'ready' && !game.isGameOver()
  const sideToMove = game.turn() === 'w' ? 'White' : 'Black'

  const finishIfNeeded = (nextGame: Chess) => {
    if (!nextGame.isGameOver()) return false
    setStatus('ended')
    setStatusMessage(finishedPositionCopy(nextGame))
    return true
  }

  const requestStockfishReply = (positionAfterPlayerMove: Chess) => {
    const engine = engineRef.current
    if (!engine) return

    const searchRevision = searchRevisionRef.current + 1
    searchRevisionRef.current = searchRevision
    setStatus('thinking')
    setStatusMessage('Stockfish is thinking…')

    void engine.findBestMove(positionAfterPlayerMove.fen()).then((bestMove) => {
      if (searchRevision !== searchRevisionRef.current) return
      if (!bestMove) {
        setStatus('ended')
        setStatusMessage(finishedPositionCopy(positionAfterPlayerMove) || 'Stockfish found no legal reply.')
        return
      }

      const replyGame = new Chess(positionAfterPlayerMove.fen())
      const reply = replyGame.move({
        from: bestMove.slice(0, 2),
        to: bestMove.slice(2, 4),
        promotion: bestMove[4] || 'q',
      })

      setFen(replyGame.fen())
      setMoves((current) => [...current, { actor: 'stockfish', fen: replyGame.fen(), san: reply.san }])
      setSelectedSquare(null)
      if (!finishIfNeeded(replyGame)) {
        setStatus('ready')
        setStatusMessage('Your move')
      }
    }).catch(() => {
      if (searchRevision !== searchRevisionRef.current) return
      setStatus('error')
      setStatusMessage('Stockfish stopped unexpectedly. Your position is still available.')
    })
  }

  const tryMove = (sourceSquare: string | null, targetSquare: string | null) => {
    if (!canMove || !sourceSquare || !targetSquare) return false
    const nextGame = new Chess(fen)

    try {
      const move = nextGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
      const nextFen = nextGame.fen()
      setFen(nextFen)
      setMoves((current) => [...current, { actor: 'you', fen: nextFen, san: move.san }])
      setSelectedSquare(null)
      if (!finishIfNeeded(nextGame)) requestStockfishReply(nextGame)
      return true
    } catch {
      return false
    }
  }

  const handleSquareClick = (square: string) => {
    if (!canMove) return
    const clickedSquare = square as Square

    if (selectedSquare) {
      if (tryMove(selectedSquare, clickedSquare)) return
      setSelectedSquare(null)
    }

    const piece = game.get(clickedSquare)
    if (piece?.color === game.turn()) setSelectedSquare(clickedSquare)
  }

  const cancelSearch = () => {
    searchRevisionRef.current += 1
    engineRef.current?.stop()
  }

  const undoTurn = () => {
    if (moves.length === 0) return
    cancelSearch()
    const removeCount = moves.at(-1)?.actor === 'stockfish' ? 2 : 1
    const remainingMoves = moves.slice(0, Math.max(0, moves.length - removeCount))
    setMoves(remainingMoves)
    setFen(remainingMoves.at(-1)?.fen ?? initialFen)
    setSelectedSquare(null)
    if (status !== 'error') {
      setStatus('ready')
      setStatusMessage('Your move')
    }
  }

  const restart = () => {
    cancelSearch()
    setFen(initialFen)
    setMoves([])
    setSelectedSquare(null)
    if (status !== 'error') {
      setStatus('ready')
      setStatusMessage('Your move')
    }
  }

  const retryEngine = () => {
    cancelSearch()
    setEngineRevision((revision) => revision + 1)
  }

  const squareStyles = {
    ...BOARD_SQUARE_STYLES[boardTheme],
    ...(selectedSquare ? {
      [selectedSquare]: {
        ...BOARD_SQUARE_STYLES[boardTheme][selectedSquare],
        boxShadow: 'inset 0 0 0 4px rgba(120, 53, 15, 0.7)',
      },
    } : {}),
  }

  return (
    <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] lg:items-start xl:gap-7">
      <div className="relative flex w-full flex-col rounded-2xl border border-stone-300 bg-white p-2 shadow-sm sm:p-3">
        <div className="flex min-h-11 items-center justify-between gap-3 px-1 pb-2">
          <button type="button" onClick={onExit} className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-700">
            <span aria-hidden="true">←</span> Exit analysis
          </button>
          <p className={`text-sm font-bold ${status === 'error' ? 'text-rose-800' : status === 'thinking' || status === 'loading' ? 'text-amber-800' : 'text-stone-700'}`} aria-live="polite">
            {statusMessage}
          </p>
        </div>

        <ChessboardProvider
          options={{
            id: 'analysis-board',
            position: fen,
            boardOrientation,
            showNotation: true,
            animationDurationInMs: prefersReducedMotion ? 0 : 360,
            allowDragging: canMove,
            allowDrawingArrows: true,
            squareStyles,
            pieces: PIECE_THEMES[pieceTheme].pieces,
            lightSquareStyle: BOARD_THEMES[boardTheme].light,
            darkSquareStyle: BOARD_THEMES[boardTheme].dark,
            lightSquareNotationStyle: { color: BOARD_THEMES[boardTheme].lightNotation },
            darkSquareNotationStyle: { color: BOARD_THEMES[boardTheme].darkNotation },
            canDragPiece: ({ isSparePiece, square }) => {
              if (!canMove || isSparePiece || !square) return false
              return game.get(square as Square)?.color === game.turn()
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) => tryMove(sourceSquare, targetSquare),
            onSquareClick: ({ square }) => handleSquareClick(square),
          }}
        >
          <h2 id="analysis-board-heading" className="sr-only">Analysis chessboard</h2>
          <div className="overflow-hidden rounded-xl" role="group" aria-labelledby="analysis-board-heading">
            <Chessboard />
          </div>
        </ChessboardProvider>
      </div>

      <aside className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Analysis mode</p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.015em] text-stone-950 sm:text-3xl">{puzzleTitle}</h1>
        <p className="mt-2 text-sm font-semibold text-stone-600">{sourceLabel ?? `${collectionName} · ${sectionName}`}</p>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {analysisDescription ?? 'Explore from the puzzle position. Analysis moves do not affect your attempts, score, notes, or timer.'}
        </p>

        <section className="mt-5" aria-labelledby="analysis-status-heading">
          <h2 id="analysis-status-heading" className="text-sm font-bold uppercase tracking-[0.1em] text-stone-500">Position</h2>
          <p className="mt-1 text-lg font-bold text-stone-950">{status === 'ended' ? statusMessage : `${sideToMove} to move`}</p>
          {status !== 'ended' ? <p className="mt-1 text-sm text-stone-600">{statusMessage}</p> : null}
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={undoTurn}
            disabled={moves.length === 0 || status === 'loading'}
            className="min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-800 hover:border-amber-700 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo turn
          </button>
          <button
            type="button"
            onClick={restart}
            disabled={moves.length === 0 || status === 'loading'}
            className="min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-800 hover:border-amber-700 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restart position
          </button>
          {status === 'error' ? (
            <button type="button" onClick={retryEngine} className="min-h-11 cursor-pointer rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
              Retry Stockfish
            </button>
          ) : null}
        </div>

        <section className="mt-6 border-t border-stone-200 pt-5" aria-labelledby="analysis-moves-heading">
          <h2 id="analysis-moves-heading" className="text-lg font-bold text-stone-950">Moves</h2>
          {moves.length === 0 ? (
            <p className="mt-2 text-sm text-stone-600">Make any legal move. Stockfish will reply.</p>
          ) : (
            <ol className="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
              {moveRows.map((row) => (
                <li key={row.moveNumber} className="grid min-h-10 grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] items-center border-t border-stone-200 px-2 text-sm first:border-t-0">
                  <span className="pr-2 text-right font-semibold text-stone-500">{row.white ? `${row.moveNumber}.` : `${row.moveNumber}...`}</span>
                  <span className="px-2 font-mono font-bold text-stone-950" aria-label={row.white ? `White ${row.white.san}` : undefined}>
                    {row.white?.san ?? ''}
                  </span>
                  <span className="px-2 font-mono font-bold text-stone-950" aria-label={row.black ? `Black ${row.black.san}` : undefined}>
                    {row.black?.san ?? ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="mt-6 border-t border-stone-200 pt-4 text-xs leading-5 text-stone-500">
          Stockfish 19 Lite runs locally in your browser.{' '}
          <a href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1" target="_blank" rel="noreferrer" className="font-semibold underline decoration-stone-300 underline-offset-2 hover:text-stone-800">Source</a>
          {' · '}
          <a href="/vendor/stockfish/Copying.txt" target="_blank" className="font-semibold underline decoration-stone-300 underline-offset-2 hover:text-stone-800">GPL v3</a>
        </p>
      </aside>
    </div>
  )
}

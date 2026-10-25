import { useEffect, useMemo, useState } from 'react'
import { Chessboard, ChessboardProvider, type Arrow } from 'react-chessboard'
import {
  BOARD_THEMES,
  BOARD_SQUARE_STYLES,
  BOARD_THEME_STORAGE_KEY,
  type BoardTheme,
} from '../lib/boardThemes'
import {
  isPieceTheme,
  PIECE_THEMES,
  PIECE_THEME_STORAGE_KEY,
  type PieceTheme,
} from '../lib/pieceThemes'
import { parsePgn, type ParsedLine, type ParsedMove } from '../lib/pgn'

type PgnViewerProps = {
  pgn: string
  initialPly?: number
  initialOrientation?: 'white' | 'black'
  onMainlinePlyChange?: (ply: number, fen: string) => void
  onExplore?: (fen: string) => void
}

const NAG_LABELS: Record<string, string> = {
  '$1': '!', '$2': '?', '$3': '!!', '$4': '??', '$5': '!?', '$6': '?!',
  '$10': '=', '$13': '∞', '$14': '+=', '$15': '=+', '$16': '+−', '$17': '−+',
}

function MoveButton({ move, activeMoveId, onSelect }: {
  move: ParsedMove
  activeMoveId: string | null
  onSelect: (move: ParsedMove) => void
}) {
  const prefix = move.color === 'w' ? `${move.moveNumber}.` : `${move.moveNumber}...`

  return (
    <button
      type="button"
      className={activeMoveId === move.id ? 'active' : ''}
      onClick={() => onSelect(move)}
      aria-label={`Show position after ${prefix} ${move.san}`}
    >
      {move.san}{move.nags.map((nag) => NAG_LABELS[nag] ?? nag).join('')}
    </button>
  )
}

function MoveAnnotations({ move, activeMoveId, onSelect, depth }: {
  move: ParsedMove
  activeMoveId: string | null
  onSelect: (move: ParsedMove) => void
  depth: number
}) {
  return (
    <>
      {move.commentsAfter.map((comment, commentIndex) => (
        <div className="pgn-comment-row" key={`${move.id}-after-${commentIndex}`}>{comment}</div>
      ))}
      {move.variations.map((variation) => (
        <div className="pgn-variation" key={variation.id} aria-label="Variation">
          <MoveLine line={variation} activeMoveId={activeMoveId} onSelect={onSelect} depth={depth + 1} />
        </div>
      ))}
    </>
  )
}

function MoveLine({ line, activeMoveId, onSelect, depth = 0 }: {
  line: ParsedLine
  activeMoveId: string | null
  onSelect: (move: ParsedMove) => void
  depth?: number
}) {
  const rows = []

  for (let index = 0; index < line.moves.length; index += 1) {
    const move = line.moves[index]
    const nextMove = line.moves[index + 1]
    const pairWithBlack = move.color === 'w'
      && nextMove?.color === 'b'
      && nextMove.moveNumber === move.moveNumber
      && move.commentsAfter.length === 0
      && move.variations.length === 0
      && nextMove.commentsBefore.length === 0

    move.commentsBefore.forEach((comment, commentIndex) => {
      rows.push(<div className="pgn-comment-row" key={`${move.id}-before-${commentIndex}`}>{comment}</div>)
    })

    rows.push(
      <div className="pgn-move-row" key={`${move.id}-row`}>
        <span className="pgn-move-number" aria-hidden="true">{move.moveNumber}</span>
        <span className={`pgn-move-cell ${move.color === 'b' ? 'pgn-empty-move' : ''}`}>
          {move.color === 'w'
            ? <MoveButton move={move} activeMoveId={activeMoveId} onSelect={onSelect} />
            : <span aria-hidden="true">…</span>}
        </span>
        <span className="pgn-move-cell">
          {move.color === 'b'
            ? <MoveButton move={move} activeMoveId={activeMoveId} onSelect={onSelect} />
            : pairWithBlack
              ? <MoveButton move={nextMove} activeMoveId={activeMoveId} onSelect={onSelect} />
              : <span className="pgn-empty-move" aria-hidden="true">…</span>}
        </span>
      </div>,
    )

    rows.push(
      <MoveAnnotations
        key={`${move.id}-annotations`}
        move={pairWithBlack ? nextMove : move}
        activeMoveId={activeMoveId}
        onSelect={onSelect}
        depth={depth}
      />,
    )

    if (pairWithBlack) index += 1
  }

  return (
    <div className={depth === 0 ? 'pgn-mainline' : 'pgn-variation-line'}>{rows}</div>
  )
}

export default function PgnViewer({
  pgn,
  initialPly = 0,
  initialOrientation = 'white',
  onMainlinePlyChange,
  onExplore,
}: PgnViewerProps) {
  const parsed = useMemo(() => parsePgn(pgn), [pgn])
  const [activeLineId, setActiveLineId] = useState('main')
  const [activeIndex, setActiveIndex] = useState(() => Math.max(-1, initialPly - 1))
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('green')
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>('default')
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(initialOrientation)

  const activeLine = parsed.lines.get(activeLineId) ?? parsed.mainline
  const activeMove = activeIndex >= 0 ? activeLine.moves[activeIndex] : null
  const position = activeMove?.after ?? activeLine.startFen
  const canGoPrevious = activeIndex >= 0
  const canGoNext = activeIndex < activeLine.moves.length - 1
  const arrows = useMemo<Arrow[]>(() => activeMove ? [{
    startSquare: activeMove.from,
    endSquare: activeMove.to,
    color: 'rgba(4, 120, 87, 0.88)',
  }] : [], [activeMove])
  const activeComments = activeMove ? [...activeMove.commentsBefore, ...activeMove.commentsAfter] : []

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(BOARD_THEME_STORAGE_KEY)
      if (savedTheme === 'green' || savedTheme === 'blue' || savedTheme === 'wood' || savedTheme === 'plain') {
        setBoardTheme(savedTheme)
      }
      const savedPieceTheme = window.localStorage.getItem(PIECE_THEME_STORAGE_KEY)
      if (isPieceTheme(savedPieceTheme)) setPieceTheme(savedPieceTheme)
    } catch {
      // Keep the in-page default when browser storage is unavailable.
    }
  }, [])

  useEffect(() => {
    setActiveLineId('main')
    setActiveIndex(Math.min(parsed.mainline.moves.length - 1, Math.max(-1, initialPly - 1)))
  }, [initialPly, parsed])

  useEffect(() => {
    setBoardOrientation(initialOrientation)
  }, [initialOrientation])

  const updateBoardTheme = (theme: BoardTheme) => {
    setBoardTheme(theme)
    try { window.localStorage.setItem(BOARD_THEME_STORAGE_KEY, theme) } catch {
      // Keep the in-page preference when browser storage is unavailable.
    }
  }

  const updatePieceTheme = (theme: PieceTheme) => {
    setPieceTheme(theme)
    try { window.localStorage.setItem(PIECE_THEME_STORAGE_KEY, theme) } catch {
      // Keep the in-page preference when browser storage is unavailable.
    }
  }

  const selectMove = (move: ParsedMove) => {
    setActiveLineId(move.lineId)
    setActiveIndex(move.index)
    if (move.lineId === 'main') onMainlinePlyChange?.(move.index + 1, move.after)
  }

  const goFirst = () => {
    setActiveLineId('main')
    setActiveIndex(-1)
    onMainlinePlyChange?.(0, parsed.mainline.startFen)
  }
  const goLast = () => {
    const index = parsed.mainline.moves.length - 1
    setActiveLineId('main')
    setActiveIndex(index)
    onMainlinePlyChange?.(index + 1, parsed.mainline.moves[index]?.after ?? parsed.mainline.startFen)
  }

  const changeIndex = (nextIndex: number) => {
    const boundedIndex = Math.max(-1, Math.min(activeLine.moves.length - 1, nextIndex))
    setActiveIndex(boundedIndex)
    if (activeLineId === 'main') {
      onMainlinePlyChange?.(
        boundedIndex + 1,
        boundedIndex >= 0 ? parsed.mainline.moves[boundedIndex].after : parsed.mainline.startFen,
      )
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, button, a')) return
      if (event.key === 'ArrowLeft' && canGoPrevious) changeIndex(activeIndex - 1)
      if (event.key === 'ArrowRight' && canGoNext) changeIndex(activeIndex + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, activeLineId, canGoNext, canGoPrevious, onMainlinePlyChange, parsed])

  if (parsed.error) return <div className="pgn-error"><strong>PGN error:</strong> {parsed.error}</div>

  const theme = BOARD_THEMES[boardTheme]
  const status = activeLineId === 'main'
    ? `${activeIndex + 1} / ${parsed.mainline.moves.length}`
    : `Variation · ${activeIndex + 1} / ${activeLine.moves.length}`

  return (
    <div className="pgn-viewer">
      <div className="pgn-board-card">
        <ChessboardProvider
          key={`${boardTheme}-${pieceTheme}-${boardOrientation}`}
          options={{
            id: 'pgn-viewer-board', position, boardOrientation, allowDragging: false,
            allowDrawingArrows: false, arrows, clearArrowsOnClick: false,
            clearArrowsOnPositionChange: false, showNotation: true,
            squareStyles: BOARD_SQUARE_STYLES[boardTheme],
            pieces: PIECE_THEMES[pieceTheme].pieces,
            lightSquareStyle: theme.light, darkSquareStyle: theme.dark,
            lightSquareNotationStyle: { color: theme.lightNotation },
            darkSquareNotationStyle: { color: theme.darkNotation }, canDragPiece: () => false,
          }}
        >
          <div className="pgn-board"><Chessboard /></div>
        </ChessboardProvider>

        <div className="pgn-board-settings">
          <label>Board style
            <select value={boardTheme} onChange={(event) => updateBoardTheme(event.currentTarget.value as BoardTheme)}>
              {(Object.entries(BOARD_THEMES) as Array<[BoardTheme, (typeof BOARD_THEMES)[BoardTheme]]>)
                .map(([value, boardStyle]) => <option key={value} value={value}>{boardStyle.label}</option>)}
            </select>
          </label>
          <label>Piece style
            <select value={pieceTheme} onChange={(event) => updatePieceTheme(event.currentTarget.value as PieceTheme)}>
              {(Object.entries(PIECE_THEMES) as Array<[PieceTheme, (typeof PIECE_THEMES)[PieceTheme]]>)
                .map(([value, pieceStyle]) => <option key={value} value={value}>{pieceStyle.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setBoardOrientation((value) => value === 'white' ? 'black' : 'white')}>
            Flip board
          </button>
        </div>
      </div>

      <div className="pgn-score-card">
        <div className="pgn-controls">
          <button type="button" onClick={goFirst} disabled={activeLineId === 'main' && activeIndex === -1}>First</button>
          <button type="button" onClick={() => changeIndex(activeIndex - 1)} disabled={!canGoPrevious}>Previous</button>
          <span className="pgn-status" aria-live="polite">{status}{activeMove ? ` · ${activeMove.san}` : ''}</span>
          <button type="button" onClick={() => changeIndex(activeIndex + 1)} disabled={!canGoNext}>Next</button>
          <button type="button" onClick={goLast} disabled={activeLineId === 'main' && activeIndex === parsed.mainline.moves.length - 1}>Last</button>
        </div>

        {onExplore ? (
          <button type="button" className="pgn-explore-button" onClick={() => onExplore(position)}>
            Explore from here
          </button>
        ) : null}

        <div className="pgn-score" aria-label="Annotated game score">
          <MoveLine line={parsed.mainline} activeMoveId={activeMove?.id ?? null} onSelect={selectMove} />
        </div>

        <div className="pgn-current-note" aria-live="polite">
          <p className="pgn-current-note-label">Commentary</p>
          {activeComments.length > 0 ? activeComments.map((comment, index) => (
            <p key={`${activeMove?.id}-comment-${index}`}>{comment}</p>
          )) : <p>{activeMove ? 'No comment on this move.' : 'Select a move to see its comment and position.'}</p>}
        </div>
        <p className="pgn-keyboard-hint">Tip: use the ← and → keys to move through the current line.</p>
      </div>
    </div>
  )
}

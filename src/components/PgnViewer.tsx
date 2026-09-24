import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard, ChessboardProvider, type Arrow } from 'react-chessboard'
import {
  BOARD_THEMES,
  BOARD_THEME_STORAGE_KEY,
  WOOD_SQUARE_STYLES,
  type BoardTheme,
} from '../lib/boardThemes'

type PgnViewerProps = { pgn: string }
type PgnToken = { type: 'word' | 'comment' | 'open' | 'close'; value: string }

type ParsedMove = {
  id: string
  lineId: string
  index: number
  san: string
  color: 'w' | 'b'
  moveNumber: number
  before: string
  after: string
  from: string
  to: string
  commentsBefore: string[]
  commentsAfter: string[]
  nags: string[]
  variations: ParsedLine[]
}

type ParsedLine = { id: string; startFen: string; moves: ParsedMove[] }
type ParsedPgn = { mainline: ParsedLine; lines: Map<string, ParsedLine>; error: string | null }

const START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const NAG_LABELS: Record<string, string> = {
  '$1': '!', '$2': '?', '$3': '!!', '$4': '??', '$5': '!?', '$6': '?!',
  '$10': '=', '$13': '∞', '$14': '+=', '$15': '=+', '$16': '+−', '$17': '−+',
}

function tokenizePgn(pgn: string): PgnToken[] {
  const movetext = pgn.replace(/^\s*\[[^\r\n]*\]\s*$/gm, '')
  const tokens: PgnToken[] = []

  for (let index = 0; index < movetext.length;) {
    const character = movetext[index]
    if (/\s/.test(character)) { index += 1; continue }

    if (character === '{') {
      const end = movetext.indexOf('}', index + 1)
      const commentEnd = end === -1 ? movetext.length : end
      tokens.push({ type: 'comment', value: movetext.slice(index + 1, commentEnd).trim() })
      index = end === -1 ? movetext.length : end + 1
      continue
    }

    if (character === ';') {
      const end = movetext.indexOf('\n', index + 1)
      const commentEnd = end === -1 ? movetext.length : end
      tokens.push({ type: 'comment', value: movetext.slice(index + 1, commentEnd).trim() })
      index = commentEnd
      continue
    }

    if (character === '(' || character === ')') {
      tokens.push({ type: character === '(' ? 'open' : 'close', value: character })
      index += 1
      continue
    }

    let end = index + 1
    while (end < movetext.length && !/[\s{}();]/.test(movetext[end])) end += 1
    tokens.push({ type: 'word', value: movetext.slice(index, end) })
    index = end
  }

  return tokens
}

const cleanMoveToken = (value: string) => value
  .replace(/^\d+\.(?:\.\.)?/, '')
  .replace(/[!?]+$/g, '')
  .trim()

function parsePgn(pgn: string): ParsedPgn {
  try {
    const tokens = tokenizePgn(pgn)
    const lines = new Map<string, ParsedLine>()
    const fenHeader = pgn.match(/^\[FEN "([^"]+)"\]/m)?.[1]
    let cursor = 0
    let moveId = 0

    const parseLine = (startFen: string, lineId: string): ParsedLine => {
      const game = new Chess(startFen)
      const line: ParsedLine = { id: lineId, startFen, moves: [] }
      const pendingComments: string[] = []
      lines.set(lineId, line)

      while (cursor < tokens.length) {
        const token = tokens[cursor]
        if (token.type === 'close') { cursor += 1; break }

        if (token.type === 'comment') {
          const previousMove = line.moves.at(-1)
          if (previousMove) previousMove.commentsAfter.push(token.value)
          else pendingComments.push(token.value)
          cursor += 1
          continue
        }

        if (token.type === 'open') {
          cursor += 1
          const previousMove = line.moves.at(-1)
          const variationStart = previousMove?.before ?? game.fen()
          const variationNumber = (previousMove?.variations.length ?? 0) + 1
          const variation = parseLine(variationStart, `${lineId}.${line.moves.length}v${variationNumber}`)
          if (previousMove) previousMove.variations.push(variation)
          continue
        }

        cursor += 1
        const rawValue = token.value
        if (/^(?:\d+\.{1,3}|\*|1-0|0-1|1\/2-1\/2)$/.test(rawValue)) continue
        if (/^\$\d+$/.test(rawValue) || /^[!?]{1,2}$/.test(rawValue)) {
          line.moves.at(-1)?.nags.push(rawValue)
          continue
        }

        const annotation = rawValue.match(/([!?]{1,2})$/)?.[1]
        const san = cleanMoveToken(rawValue)
        if (!san || /^(?:\*|1-0|0-1|1\/2-1\/2)$/.test(san)) continue

        const before = game.fen()
        const beforeParts = before.split(' ')
        const move = game.move(san)
        line.moves.push({
          id: `move-${moveId++}`,
          lineId,
          index: line.moves.length,
          san: move.san,
          color: move.color,
          moveNumber: Number(beforeParts[5]),
          before,
          after: game.fen(),
          from: move.from,
          to: move.to,
          commentsBefore: pendingComments.splice(0),
          commentsAfter: [],
          nags: annotation ? [annotation] : [],
          variations: [],
        })
      }

      return line
    }

    const mainline = parseLine(fenHeader ?? START_POSITION, 'main')
    return { mainline, lines, error: null }
  } catch (error) {
    return {
      mainline: { id: 'main', startFen: START_POSITION, moves: [] },
      lines: new Map(),
      error: error instanceof Error ? error.message : 'Invalid PGN',
    }
  }
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

export default function PgnViewer({ pgn }: PgnViewerProps) {
  const parsed = useMemo(() => parsePgn(pgn), [pgn])
  const [activeLineId, setActiveLineId] = useState('main')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('green')
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')

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
    } catch {
      // Keep the in-page default when browser storage is unavailable.
    }
  }, [])

  const updateBoardTheme = (theme: BoardTheme) => {
    setBoardTheme(theme)
    try { window.localStorage.setItem(BOARD_THEME_STORAGE_KEY, theme) } catch {
      // Keep the in-page preference when browser storage is unavailable.
    }
  }

  const selectMove = (move: ParsedMove) => {
    setActiveLineId(move.lineId)
    setActiveIndex(move.index)
  }

  const goFirst = () => { setActiveLineId('main'); setActiveIndex(-1) }
  const goLast = () => { setActiveLineId('main'); setActiveIndex(parsed.mainline.moves.length - 1) }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, button, a')) return
      if (event.key === 'ArrowLeft' && canGoPrevious) setActiveIndex((index) => index - 1)
      if (event.key === 'ArrowRight' && canGoNext) setActiveIndex((index) => index + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canGoNext, canGoPrevious])

  if (parsed.error) return <div className="pgn-error"><strong>PGN error:</strong> {parsed.error}</div>

  const theme = BOARD_THEMES[boardTheme]
  const status = activeLineId === 'main'
    ? `${activeIndex + 1} / ${parsed.mainline.moves.length}`
    : `Variation · ${activeIndex + 1} / ${activeLine.moves.length}`

  return (
    <div className="pgn-viewer">
      <div className="pgn-board-card">
        <ChessboardProvider
          key={`${boardTheme}-${boardOrientation}`}
          options={{
            id: 'pgn-viewer-board', position, boardOrientation, allowDragging: false,
            allowDrawingArrows: false, arrows, clearArrowsOnClick: false,
            clearArrowsOnPositionChange: false, showNotation: true,
            squareStyles: boardTheme === 'wood' ? WOOD_SQUARE_STYLES : {},
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
          <button type="button" onClick={() => setBoardOrientation((value) => value === 'white' ? 'black' : 'white')}>
            Flip board
          </button>
        </div>
      </div>

      <div className="pgn-score-card">
        <div className="pgn-controls">
          <button type="button" onClick={goFirst} disabled={activeLineId === 'main' && activeIndex === -1}>First</button>
          <button type="button" onClick={() => setActiveIndex((index) => index - 1)} disabled={!canGoPrevious}>Previous</button>
          <span className="pgn-status" aria-live="polite">{status}{activeMove ? ` · ${activeMove.san}` : ''}</span>
          <button type="button" onClick={() => setActiveIndex((index) => index + 1)} disabled={!canGoNext}>Next</button>
          <button type="button" onClick={goLast} disabled={activeLineId === 'main' && activeIndex === parsed.mainline.moves.length - 1}>Last</button>
        </div>

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

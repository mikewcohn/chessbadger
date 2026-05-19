import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

type PgnViewerProps = {
  pgn: string
}

type VerboseMove = {
  san: string
  color: 'w' | 'b'
  before: string
  after: string
}

const START_POSITION =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function PgnViewer({ pgn }: PgnViewerProps) {
  const { moves, error } = useMemo<{
    moves: VerboseMove[]
    error: string | null
  }>(() => {
    try {
      const chess = new Chess()
      chess.loadPgn(pgn)

      return {
        moves: chess.history({ verbose: true }) as VerboseMove[],
        error: null,
      }
    } catch (err) {
      return {
        moves: [],
        error: err instanceof Error ? err.message : 'Invalid PGN',
      }
    }
  }, [pgn])

  const [ply, setPly] = useState(0)

  const position =
    ply === 0
      ? START_POSITION
      : moves[ply - 1]?.after ?? START_POSITION

  const currentMove = moves[ply - 1]

  if (error) {
    return (
      <div className="pgn-error">
        <strong>PGN error:</strong> {error}
      </div>
    )
  }

  return (
    <div className="pgn-viewer">
      <div
        className="pgn-board"
        style={{
          width: 'min(100%, 420px)',
          maxWidth: '420px',
        }}
      >
        <Chessboard
          options={{
            id: 'pgn-viewer-board',
            position,
            allowDragging: false,
            showNotation: true,
          }}
        />
      </div>

      <div className="pgn-controls">
        <button onClick={() => setPly(0)} disabled={ply === 0}>
          First
        </button>

        <button
          onClick={() => setPly((p) => Math.max(0, p - 1))}
          disabled={ply === 0}
        >
          Previous
        </button>

        <span>
          {ply} / {moves.length}
          {currentMove ? ` - ${currentMove.san}` : ''}
        </span>

        <button
          onClick={() => setPly((p) => Math.min(moves.length, p + 1))}
          disabled={ply === moves.length}
        >
          Next
        </button>

        <button
          onClick={() => setPly(moves.length)}
          disabled={ply === moves.length}
        >
          Last
        </button>
      </div>

      <ol className="pgn-moves">
        {moves.map((move, index) => (
          <li key={`${move.san}-${index}`}>
            <button
              className={ply === index + 1 ? 'active' : ''}
              onClick={() => setPly(index + 1)}
            >
              {move.color === 'w' ? `${Math.floor(index / 2) + 1}. ` : ''}
              {move.san}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
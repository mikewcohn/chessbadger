import { defaultPieces, type PieceRenderObject } from 'react-chessboard'

export type PieceTheme = 'default' | 'staunty' | 'fresca' | 'fantasy' | 'chessnut' | 'spatial'

const pieceTypes = [
  'wK', 'wQ', 'wR', 'wB', 'wN', 'wP',
  'bK', 'bQ', 'bR', 'bB', 'bN', 'bP',
] as const

const createPieceRenderers = (theme: Exclude<PieceTheme, 'default'>): PieceRenderObject => (
  Object.fromEntries(pieceTypes.map((pieceType) => [pieceType, ({ svgStyle } = {}) => (
    <img
      src={`/chess-pieces/${theme}/${pieceType}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ display: 'block', height: '100%', width: '100%', objectFit: 'contain', ...svgStyle }}
    />
  )]))
)

export const PIECE_THEMES: Record<PieceTheme, { label: string; pieces: PieceRenderObject }> = {
  default: { label: 'Default', pieces: defaultPieces },
  staunty: { label: 'Staunty', pieces: createPieceRenderers('staunty') },
  fresca: { label: 'Fresca', pieces: createPieceRenderers('fresca') },
  fantasy: { label: 'Fantasy', pieces: createPieceRenderers('fantasy') },
  chessnut: { label: 'Chessnut', pieces: createPieceRenderers('chessnut') },
  spatial: { label: 'Spatial', pieces: createPieceRenderers('spatial') },
}

export const isPieceTheme = (value: string | null): value is PieceTheme => (
  value === 'default'
  || value === 'staunty'
  || value === 'fresca'
  || value === 'fantasy'
  || value === 'chessnut'
  || value === 'spatial'
)

export const PIECE_THEME_STORAGE_KEY = 'chessbadger.piece-theme.v1'

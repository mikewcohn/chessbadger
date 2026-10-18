import { defaultPieces, type PieceRenderObject } from 'react-chessboard'

export type PieceTheme = 'default' | 'badger' | 'staunty' | 'fresca' | 'fantasy' | 'chessnut' | 'spatial'
type AssetPieceTheme = Exclude<PieceTheme, 'default' | 'badger'>

const pieceTypes = [
  'wK', 'wQ', 'wR', 'wB', 'wN', 'wP',
  'bK', 'bQ', 'bR', 'bB', 'bN', 'bP',
] as const

const createPieceRenderers = (theme: AssetPieceTheme): PieceRenderObject => (
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

const createBadgerKing = (side: 'white' | 'black'): PieceRenderObject['wK'] => (
  ({ svgStyle } = {}) => (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', height: '100%', width: '100%', ...svgStyle }}
    >
      <defs>
        {side === 'white' ? (
          <>
          <filter id="white-badger-tone" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="expanded" />
            <feFlood floodColor="#111" result="outline-color" />
            <feComposite in="outline-color" in2="expanded" operator="in" result="outline" />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0      0      0      1 0"
              result="grayscale"
            />
            <feComponentTransfer in="grayscale" result="toned">
              <feFuncR type="discrete" tableValues=".46 .62 .82 1" />
              <feFuncG type="discrete" tableValues=".46 .62 .82 1" />
              <feFuncB type="discrete" tableValues=".46 .62 .82 1" />
            </feComponentTransfer>
            <feComposite in="toned" in2="SourceAlpha" operator="in" result="clipped" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="clipped" />
            </feMerge>
          </filter>
          <clipPath id="white-badger-mouth-clip">
            <ellipse cx="50" cy="69" rx="16" ry="12" />
          </clipPath>
          </>
        ) : null}
      </defs>
      <image
        href="/favicon-badger.png"
        x="4"
        y="4"
        width="92"
        height="92"
        filter={side === 'white' ? 'url(#white-badger-tone)' : undefined}
      />
      {side === 'white' ? (
        <image
          href="/favicon-badger.png"
          x="4"
          y="4"
          width="92"
          height="92"
          clipPath="url(#white-badger-mouth-clip)"
        />
      ) : null}
      <path
        d="M31 27 L29 9 L41 17 L50 3 L59 17 L71 9 L69 27 Q50 23 31 27 Z"
        fill={side === 'white' ? '#f8f8f5' : '#4a4a4a'}
        stroke="#111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 25 Q50 21 68 25 L67 31 Q50 27 33 31 Z"
        fill={side === 'white' ? '#d0d0cc' : '#f3f3ef'}
        stroke="#111"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
)

const badgerPieces: PieceRenderObject = {
  ...defaultPieces,
  wK: createBadgerKing('white'),
  bK: createBadgerKing('black'),
}

export const PIECE_THEMES: Record<PieceTheme, { label: string; pieces: PieceRenderObject }> = {
  default: { label: 'Default', pieces: defaultPieces },
  badger: { label: 'Badger', pieces: badgerPieces },
  staunty: { label: 'Staunty', pieces: createPieceRenderers('staunty') },
  fresca: { label: 'Fresca', pieces: createPieceRenderers('fresca') },
  fantasy: { label: 'Fantasy', pieces: createPieceRenderers('fantasy') },
  chessnut: { label: 'Chessnut', pieces: createPieceRenderers('chessnut') },
  spatial: { label: 'Spatial', pieces: createPieceRenderers('spatial') },
}

export const isPieceTheme = (value: string | null): value is PieceTheme => (
  value === 'default'
  || value === 'badger'
  || value === 'staunty'
  || value === 'fresca'
  || value === 'fantasy'
  || value === 'chessnut'
  || value === 'spatial'
)

export const PIECE_THEME_STORAGE_KEY = 'chessbadger.piece-theme.v1'

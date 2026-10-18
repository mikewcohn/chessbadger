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

const createBadgerKnight = (side: 'white' | 'black'): PieceRenderObject['wN'] => (
  ({ svgStyle } = {}) => (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', height: '100%', width: '100%', ...svgStyle }}
    >
      <defs>
        <clipPath id="badger-head-clip">
          <path d="M9 2 H91 V55 C89 61 82 64 74 66 C69 78 61 83 50 83 C39 83 31 78 26 66 C18 64 11 61 9 55 Z" />
        </clipPath>
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
            <ellipse cx="50" cy="61" rx="14" ry="11" />
          </clipPath>
          </>
        ) : null}
      </defs>
      <image
        href="/favicon-badger.png"
        x="9"
        y="2"
        width="82"
        height="82"
        filter={side === 'white' ? 'url(#white-badger-tone)' : undefined}
        clipPath="url(#badger-head-clip)"
      />
      {side === 'white' ? (
        <image
          href="/favicon-badger.png"
          x="9"
          y="2"
          width="82"
          height="82"
          clipPath="url(#white-badger-mouth-clip)"
        />
      ) : null}
      <path
        d="M17 64 Q50 78 83 64 L87 93 Q50 99 13 93 Z"
        fill={side === 'white' ? '#f8f8f5' : '#262626'}
      />
      <path
        d="M17 64 L13 93 Q50 99 87 93 L83 64"
        fill="none"
        stroke="#111"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M25 85 Q50 80 75 85"
        fill="none"
        stroke={side === 'white' ? '#777' : '#f3f3ef'}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
)

const badgerPieces: PieceRenderObject = {
  ...defaultPieces,
  wN: createBadgerKnight('white'),
  bN: createBadgerKnight('black'),
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

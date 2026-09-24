import type { CSSProperties } from 'react'

export type BoardTheme = 'green' | 'blue' | 'wood' | 'plain'

export const BOARD_THEMES = {
  green: {
    label: 'Green',
    light: {
      backgroundColor: '#d3d1c8',
      backgroundImage:
        'radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.28) 0 5%, transparent 24%), radial-gradient(circle at 78% 72%, rgba(80, 82, 72, 0.12) 0 7%, transparent 28%), linear-gradient(118deg, rgba(255, 255, 255, 0.1), rgba(78, 80, 70, 0.08))',
      backgroundSize: '82px 82px, 106px 106px, 100% 100%',
    },
    dark: {
      backgroundColor: '#6b9078',
      backgroundImage:
        'radial-gradient(circle at 22% 18%, rgba(222, 235, 222, 0.2) 0 5%, transparent 23%), radial-gradient(circle at 76% 74%, rgba(28, 65, 45, 0.18) 0 8%, transparent 29%), linear-gradient(118deg, rgba(255, 255, 255, 0.07), rgba(20, 57, 39, 0.12))',
      backgroundSize: '88px 88px, 112px 112px, 100% 100%',
    },
    lightNotation: '#3f6651',
    darkNotation: 'rgba(246, 246, 239, 0.88)',
  },
  blue: {
    label: 'Blue',
    light: {
      backgroundColor: '#dce9ef',
      backgroundImage:
        'radial-gradient(circle at 20% 24%, rgba(255, 255, 255, 0.42) 0 6%, transparent 28%), radial-gradient(circle at 76% 72%, rgba(87, 132, 154, 0.11) 0 8%, transparent 30%), linear-gradient(122deg, rgba(255, 255, 255, 0.15), rgba(102, 145, 166, 0.08))',
      backgroundSize: '86px 86px, 110px 110px, 100% 100%',
    },
    dark: {
      backgroundColor: '#8eafbf',
      backgroundImage:
        'radial-gradient(circle at 22% 18%, rgba(224, 241, 247, 0.24) 0 6%, transparent 25%), radial-gradient(circle at 74% 76%, rgba(54, 94, 114, 0.15) 0 8%, transparent 30%), linear-gradient(118deg, rgba(255, 255, 255, 0.08), rgba(47, 88, 108, 0.12))',
      backgroundSize: '90px 90px, 116px 116px, 100% 100%',
    },
    lightNotation: '#527c91',
    darkNotation: 'rgba(242, 249, 252, 0.9)',
  },
  wood: {
    label: 'Wood',
    light: {
      backgroundColor: '#d8c6a4',
      backgroundImage:
        'linear-gradient(100deg, rgba(255, 255, 255, 0.1), transparent 45%, rgba(112, 79, 45, 0.065))',
    },
    dark: {
      backgroundColor: '#9b7651',
      backgroundImage:
        'linear-gradient(98deg, rgba(255, 255, 255, 0.05), transparent 44%, rgba(70, 43, 25, 0.085))',
    },
    lightNotation: '#6f5138',
    darkNotation: 'rgba(250, 239, 220, 0.92)',
  },
  plain: {
    label: 'Plain',
    light: { backgroundColor: '#d1d1d1' },
    dark: { backgroundColor: '#a5a5a5' },
    lightNotation: '#777777',
    darkNotation: 'rgba(245, 245, 245, 0.9)',
  },
} satisfies Record<BoardTheme, {
  label: string
  light: CSSProperties
  dark: CSSProperties
  lightNotation: string
  darkNotation: string
}>

const createWoodGrainTexture = (seed: number, isLightSquare: boolean) => {
  const grainColor = isLightSquare ? '#765431' : '#4d321f'
  const rotation = -18 + (seed % 37)
  const crossFrequency = (8 + (seed % 9)) / 1000
  const lengthFrequency = (52 + (seed % 39)) / 1000
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><filter id="wood" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="${crossFrequency} ${lengthFrequency}" numOctaves="2" seed="${seed % 97}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.22"/></feComponentTransfer></filter><g transform="rotate(${rotation} 64 64)"><rect x="-48" y="-48" width="224" height="224" fill="${grainColor}" filter="url(#wood)"/></g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export const WOOD_SQUARE_STYLES = Object.fromEntries(
  Array.from({ length: 64 }, (_, index) => {
    const fileIndex = index % 8
    const rank = Math.floor(index / 8) + 1
    const square = `${String.fromCharCode(97 + fileIndex)}${rank}`
    const seed = (fileIndex * 17) + (rank * 29)
    const angle = 76 + (seed % 29)
    const knotX = 12 + ((seed * 7) % 77)
    const knotY = 10 + ((seed * 11) % 81)
    const isLightSquare = (fileIndex + rank) % 2 === 0
    const grain = isLightSquare ? '105, 75, 43' : '65, 40, 23'
    const sheen = isLightSquare ? '255, 247, 226' : '224, 196, 156'

    return [square, {
      backgroundImage: [
        `radial-gradient(ellipse at ${knotX}% ${knotY}%, rgba(${grain}, 0.075), transparent 46%)`,
        createWoodGrainTexture(seed, isLightSquare),
        `linear-gradient(${angle}deg, transparent 0 16%, rgba(${grain}, 0.035) 28%, transparent 43%, rgba(${sheen}, 0.065) 58%, transparent 72%, rgba(${grain}, 0.03) 88%)`,
        `radial-gradient(ellipse at ${100 - knotX}% ${100 - knotY}%, rgba(${sheen}, 0.09), transparent 58%)`,
      ].join(', '),
      backgroundPosition: `0 0, -${seed % 37}px -${seed % 31}px, 0 0, 0 0`,
      backgroundSize: `100% 100%, ${132 + (seed % 61)}% ${116 + (seed % 53)}%, 100% 100%, 100% 100%`,
    } satisfies CSSProperties]
  }),
) satisfies Record<string, CSSProperties>

export const WHITE_ON_BOTTOM_STORAGE_KEY = 'chessbadger.always-white-on-bottom.v1'
export const BOARD_THEME_STORAGE_KEY = 'chessbadger.board-theme.v1'

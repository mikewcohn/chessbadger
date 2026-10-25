import { Chess } from 'chess.js'

export type PgnToken = { type: 'word' | 'comment' | 'open' | 'close'; value: string }

export type ParsedMove = {
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

export type ParsedLine = { id: string; startFen: string; moves: ParsedMove[] }
export type ParsedPgn = { mainline: ParsedLine; lines: Map<string, ParsedLine>; error: string | null }

export type PgnHeaders = {
  white?: string
  black?: string
  event?: string
  site?: string
  date?: string
  round?: string
  result?: string
}

export const START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const tokenizePgn = (pgn: string): PgnToken[] => {
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

export function parsePgn(pgn: string): ParsedPgn {
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
    if (mainline.moves.length === 0) throw new Error('The PGN does not contain any moves.')
    return { mainline, lines, error: null }
  } catch (error) {
    return {
      mainline: { id: 'main', startFen: START_POSITION, moves: [] },
      lines: new Map(),
      error: error instanceof Error ? error.message : 'Invalid PGN',
    }
  }
}

export const readPgnHeaders = (pgn: string): PgnHeaders => {
  const headers: Record<string, string> = {}
  for (const match of pgn.matchAll(/^\[([A-Za-z0-9_]+)\s+"((?:\\.|[^"])*)"\]\s*$/gm)) {
    headers[match[1].toLowerCase()] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return {
    white: headers.white,
    black: headers.black,
    event: headers.event,
    site: headers.site,
    date: headers.date,
    round: headers.round,
    result: headers.result,
  }
}

export const positionAtPly = (parsed: ParsedPgn, ply: number) => {
  if (ply <= 0) return parsed.mainline.startFen
  return parsed.mainline.moves[Math.min(ply, parsed.mainline.moves.length) - 1]?.after
    ?? parsed.mainline.startFen
}

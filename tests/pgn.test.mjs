import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parsePgn, positionAtPly, readPgnHeaders } from '../src/lib/pgn.ts'

const pgn = `[Event "Training Game"]
[White "Mike"]
[Black "Opponent"]
[Date "2026.10.25"]
[Result "1/2-1/2"]

1. e4 {Claim the center.} e5 2. Nf3 (2. Bc4 Nf6) Nc6 1/2-1/2`

test('parses headers, mainline positions, comments, and variations', () => {
  const parsed = parsePgn(pgn)
  assert.equal(parsed.error, null)
  assert.deepEqual(readPgnHeaders(pgn), {
    white: 'Mike',
    black: 'Opponent',
    event: 'Training Game',
    site: undefined,
    date: '2026.10.25',
    round: undefined,
    result: '1/2-1/2',
  })
  assert.deepEqual(parsed.mainline.moves.map((move) => move.san), ['e4', 'e5', 'Nf3', 'Nc6'])
  assert.deepEqual(parsed.mainline.moves[0].commentsAfter, ['Claim the center.'])
  assert.deepEqual(parsed.mainline.moves[2].variations[0].moves.map((move) => move.san), ['Bc4', 'Nf6'])
  assert.equal(positionAtPly(parsed, 0), parsed.mainline.startFen)
  assert.equal(positionAtPly(parsed, 3), parsed.mainline.moves[2].after)
})

test('invalid and empty PGNs produce a useful error state', () => {
  assert.match(parsePgn('1. e4 e5 2. NotAMove').error ?? '', /Invalid move/)
  assert.match(parsePgn('[Event "Empty"]').error ?? '', /does not contain any moves/)
})

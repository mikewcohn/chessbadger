import assert from 'node:assert/strict'
import test from 'node:test'

import { parseStockfishBestMove } from '../src/lib/stockfishEngine.ts'

test('parses a UCI best move including promotion', () => {
  assert.equal(parseStockfishBestMove('bestmove e7e8q ponder a7a6'), 'e7e8q')
})

test('returns null when Stockfish has no legal move', () => {
  assert.equal(parseStockfishBestMove('bestmove (none)'), null)
  assert.equal(parseStockfishBestMove('info depth 12 score cp 34'), null)
})

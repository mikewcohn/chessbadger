import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSan } from '../src/lib/chessNotation.ts'

test('normalizes check and checkmate markers for move comparisons', () => {
  assert.equal(normalizeSan('Qxc3+'), normalizeSan('Qxc3'))
  assert.equal(normalizeSan('Qh7#'), normalizeSan('Qh7'))
  assert.equal(normalizeSan('Qh7+!'), normalizeSan('Qh7'))
})

test('preserves the move while normalizing castling and whitespace', () => {
  assert.equal(normalizeSan('  0-0+  '), 'O-O')
  assert.notEqual(normalizeSan('Qxc3+'), normalizeSan('Qc3+'))
})

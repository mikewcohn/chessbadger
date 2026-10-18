import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSan, normalizeStrictSan } from '../src/lib/chessNotation.ts'

test('normalizes check and checkmate markers for move comparisons', () => {
  assert.equal(normalizeSan('Qxc3+'), normalizeSan('Qxc3'))
  assert.equal(normalizeSan('Qh7#'), normalizeSan('Qh7'))
  assert.equal(normalizeSan('Qh7+!'), normalizeSan('Qh7'))
})

test('preserves the move while normalizing castling and whitespace', () => {
  assert.equal(normalizeSan('  0-0+  '), 'O-O')
  assert.notEqual(normalizeSan('Qxc3+'), normalizeSan('Qc3+'))
})

test('strict notation preserves required check and checkmate markers', () => {
  assert.notEqual(normalizeStrictSan('Qxg6#'), normalizeStrictSan('Qxg6'))
  assert.notEqual(normalizeStrictSan('Bxc6+'), normalizeStrictSan('Bxc6'))
  assert.equal(normalizeStrictSan('  0-0+  '), 'O-O+')
})

test('strict notation ignores evaluation annotations', () => {
  assert.equal(normalizeStrictSan('Nf6!'), normalizeStrictSan('Nf6'))
  assert.equal(normalizeStrictSan('e5?!'), normalizeStrictSan('e5'))
  assert.notEqual(normalizeStrictSan('Nf6+!'), normalizeStrictSan('Nf6'))
})

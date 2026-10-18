import assert from 'node:assert/strict'
import test from 'node:test'
import { isComposedCheckmate } from '../src/lib/compositionMate.ts'

test('accepts the workbook mate and a translated equivalent', () => {
  assert.equal(isComposedCheckmate([
    { piece: 'wQ', square: 'e7' },
    { piece: 'wN', square: 'c6' },
    { piece: 'wB', square: 'e4' },
    { piece: 'bK', square: 'd6' },
  ]), true)

  assert.equal(isComposedCheckmate([
    { piece: 'wQ', square: 'f7' },
    { piece: 'wN', square: 'd6' },
    { piece: 'wB', square: 'f4' },
    { piece: 'bK', square: 'e6' },
  ]), true)
})

test('rejects check when the king still has an escape square', () => {
  assert.equal(isComposedCheckmate([
    { piece: 'wQ', square: 'e7' },
    { piece: 'wN', square: 'c6' },
    { piece: 'wB', square: 'e3' },
    { piece: 'bK', square: 'd6' },
  ]), false)
})

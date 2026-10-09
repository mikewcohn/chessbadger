import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getPuzzleStatuses } from '../src/lib/puzzleProgress.ts'

const puzzles = [{ id: 'one' }, { id: 'two' }, { id: 'three' }]

test('best session result controls puzzle color without erasing history', () => {
  const statuses = getPuzzleStatuses(puzzles, [
    { puzzleId: 'one', result: 'incorrect', sessionId: 'old' },
    { puzzleId: 'one', result: 'correct', sessionId: 'old' },
    { puzzleId: 'one', result: 'correct', sessionId: 'new' },
    { puzzleId: 'two', result: 'incorrect', sessionId: 'only' },
  ])

  assert.deepEqual(statuses, ['clean', 'missed', 'not-attempted'])
})

test('a solve after a miss in the same session stays light green', () => {
  assert.deepEqual(getPuzzleStatuses([{ id: 'one' }], [
    { puzzleId: 'one', result: 'incorrect', sessionId: 'same' },
    { puzzleId: 'one', result: 'correct', sessionId: 'same' },
  ]), ['retried'])
})

test('legacy attempts retain their previous status meaning', () => {
  assert.deepEqual(getPuzzleStatuses([{ id: 'one' }], [
    { puzzleId: 'one', result: 'incorrect' },
    { puzzleId: 'one', result: 'correct' },
  ]), ['retried'])
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { retryNeighbors, retryPuzzleHref, retrySearch } from '../src/lib/retryQueue.ts'

const entries = [
  { puzzleId: 'page-19-puzzle-05', sectionSlug: 'the-pin' },
  { puzzleId: 'page-21-puzzle-04', sectionSlug: 'eliminating-the-defence' },
  { puzzleId: 'page-29-puzzle-02', sectionSlug: 'mixed-review-1' },
]

test('retry neighbors stay inside the fixed queue across section boundaries', () => {
  assert.deepEqual(retryNeighbors(entries, 'page-21-puzzle-04'), {
    position: 1,
    previous: entries[0],
    next: entries[2],
  })
  assert.equal(retryNeighbors(entries, 'page-19-puzzle-05').previous, null)
  assert.equal(retryNeighbors(entries, 'page-29-puzzle-02').next, null)
})

test('collection retry links retain scope and selected statuses', () => {
  const search = retrySearch(['missed', 'retried'], 'collection')
  assert.equal(search, '?retry=missed%2Cretried&retryScope=collection')
  assert.equal(
    retryPuzzleHref('steps-2-workbook', entries[1], search),
    '/puzzles/steps-2-workbook/eliminating-the-defence/puzzle/page-21-puzzle-04?retry=missed%2Cretried&retryScope=collection',
  )
})

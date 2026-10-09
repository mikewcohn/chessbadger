import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createWorkbookAttemptsCsv,
  formatAttemptData,
  workbookAttemptsFilename,
} from '../src/lib/attemptExport.ts'

const puzzles = [
  { id: 'page-12-puzzle-01', title: 'Page 12, Puzzle 1', fen: '8/8/8/8/8/8/8/8 b - - 0 1', answers: ['Qxc5+'] },
  { id: 'page-12-puzzle-02', title: 'Page 12, Puzzle 2', fen: '8/8/8/8/8/8/8/8 w - - 0 1', answers: ['Qh3+'] },
  { id: 'page-12-puzzle-03', title: 'Page 12, Puzzle 3', fen: '8/8/8/8/8/8/8/8 w - - 0 1', answers: ['Qa4'] },
]

const attempts = [
  { puzzleId: 'page-12-puzzle-01', move: 'Qxc5+', result: 'correct' },
  { puzzleId: 'page-12-puzzle-02', move: 'Qxc6', result: 'incorrect' },
  { puzzleId: 'page-12-puzzle-02', move: 'Qh3+', result: 'correct' },
]

test('formats every attempt in order with side-to-move prefixes and wrong labels', () => {
  assert.equal(formatAttemptData(puzzles[0], attempts), '1...Qxc5+')
  assert.equal(formatAttemptData(puzzles[1], attempts), '1. Qxc6 (wrong); 1. Qh3+')
})

test('exports every workbook puzzle and leaves unattempted attempt data blank', () => {
  assert.equal(createWorkbookAttemptsCsv(puzzles, attempts), [
    'Page #,Puzzle #,Attempt Data',
    '12,1,1...Qxc5+',
    '12,2,1. Qxc6 (wrong); 1. Qh3+',
    '12,3,',
  ].join('\r\n'))
})

test('uses a section-specific CSV filename', () => {
  assert.equal(workbookAttemptsFilename('double-attack-queen'), 'steps-2-double-attack-queen-attempts.csv')
})

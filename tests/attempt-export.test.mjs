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
  { puzzleId: 'page-12-puzzle-01', move: 'Qxc5+', result: 'correct', durationMs: 31_400 },
  { puzzleId: 'page-12-puzzle-02', move: 'Qxc6', result: 'incorrect', durationMs: 45_200 },
  { puzzleId: 'page-12-puzzle-02', move: 'Qh3+', result: 'correct', durationMs: 11_600 },
]

test('formats every attempt in order with side-to-move prefixes and wrong labels', () => {
  assert.equal(formatAttemptData(puzzles[0], attempts), '1...Qxc5+')
  assert.equal(formatAttemptData(puzzles[1], attempts), '1. Qxc6 (wrong); 1. Qh3+')
})

test('numbers every White move in a multi-ply attempt', () => {
  const whiteToMovePuzzle = {
    id: 'page-21-puzzle-01',
    title: 'Page 21, Puzzle 1',
    fen: '8/4kpp1/5n2/3b3p/8/5P2/1B4P1/3R2K1 w - - 0 1',
    answers: ['Bxf6+'],
    solutionLines: [['Bxf6+', 'Kxf6', 'Rxd5']],
  }
  const blackToMovePuzzle = {
    id: 'page-07-puzzle-01',
    title: 'Page 7, Puzzle 1',
    fen: '6k1/2p1q1p1/5p2/8/8/2R2B1P/P5P1/7K b - - 0 1',
    answers: ['Qe1+'],
    solutionLines: [['Qe1+', 'Kh2', 'Qxc3']],
  }

  assert.equal(formatAttemptData(whiteToMovePuzzle, [{
    puzzleId: whiteToMovePuzzle.id,
    move: 'Bxf6+ Kxf6 Rxd5',
    result: 'correct',
  }]), '1. Bxf6+ Kxf6 2. Rxd5')
  assert.equal(formatAttemptData(blackToMovePuzzle, [{
    puzzleId: blackToMovePuzzle.id,
    move: 'Qe1+ Kh2 Qxc3',
    result: 'correct',
  }]), '1...Qe1+ 2. Kh2 Qxc3')
})

test('exports puzzle time and a page total on the first row of each page', () => {
  assert.equal(createWorkbookAttemptsCsv(puzzles, attempts), [
    'Page #,Puzzle #,Attempt Data,Puzzle Time (seconds),Page Total Time',
    '12,1,1...Qxc5+,31,1m 28s',
    '12,2,1. Qxc6 (wrong); 1. Qh3+,57,',
    '12,3,,0,',
  ].join('\r\n'))
})

test('starts a new page total when the page number changes', () => {
  const nextPagePuzzle = {
    id: 'page-13-puzzle-01',
    title: 'Page 13, Puzzle 1',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    answers: ['Qa4'],
  }
  const nextPageAttempt = {
    puzzleId: nextPagePuzzle.id,
    move: 'Qa4',
    result: 'correct',
    durationMs: 3_661_000,
  }

  assert.equal(createWorkbookAttemptsCsv([...puzzles, nextPagePuzzle], [...attempts, nextPageAttempt]), [
    'Page #,Puzzle #,Attempt Data,Puzzle Time (seconds),Page Total Time',
    '12,1,1...Qxc5+,31,1m 28s',
    '12,2,1. Qxc6 (wrong); 1. Qh3+,57,',
    '12,3,,0,',
    '13,1,1. Qa4,3661,1h 1m 1s',
  ].join('\r\n'))
})

test('uses a section-specific CSV filename', () => {
  assert.equal(workbookAttemptsFilename('double-attack-queen'), 'steps-2-double-attack-queen-attempts.csv')
})

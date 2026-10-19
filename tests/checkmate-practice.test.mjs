import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { Chess } from 'chess.js'
import { chooseAutomaticKingMove, isInteractiveCheckmatePuzzle } from '../src/lib/checkmatePractice.ts'
import { readPuzzleCatalog } from '../src/lib/puzzleCatalog.ts'

test('automatic king defense captures an unprotected queen when possible', () => {
  const game = new Chess('8/8/8/3k4/4Q3/8/8/K7 b - - 0 1')
  const reply = chooseAutomaticKingMove(game)

  assert.equal(reply?.san, 'Kxe4')
  assert.doesNotThrow(() => game.move(reply))
  assert.equal(game.isInsufficientMaterial(), true)
})

test('automatic king defense captures an unprotected rook when possible', () => {
  const game = new Chess('8/8/8/3k4/4R3/8/8/K7 b - - 0 1')
  const reply = chooseAutomaticKingMove(game)

  assert.equal(reply?.san, 'Kxe4')
  assert.doesNotThrow(() => game.move(reply))
  assert.equal(game.isInsufficientMaterial(), true)
})

test('checkmate-pattern migrations create queen and rook practice sections', async (t) => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  db.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0063_add_king_and_queen_checkmate_practice.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0064_simplify_king_and_queen_puzzle_copy.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0065_shorten_king_and_queen_section_title.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0066_add_king_and_rook_checkmate_practice.sql', import.meta.url), 'utf8'))

  const catalog = await readPuzzleCatalog(async (sql, params = []) => db.prepare(sql).all(...params))
  const collection = catalog.find(({ slug }) => slug === 'checkmate-patterns')
  const queenSection = collection?.sections.find(({ slug }) => slug === 'king-and-queen')
  const rookSection = collection?.sections.find(({ slug }) => slug === 'king-and-rook')

  assert.equal(collection?.title, 'Checkmate Patterns')
  assert.equal(queenSection?.title, 'King and Queen')
  assert.equal(queenSection?.puzzles.length, 5)
  assert.ok(queenSection?.puzzles.every(isInteractiveCheckmatePuzzle))
  assert.deepEqual(queenSection?.puzzles.map(({ title }) => title), [
    'Puzzle 1', 'Puzzle 2', 'Puzzle 3', 'Puzzle 4', 'Puzzle 5',
  ])
  assert.ok(queenSection?.puzzles.every(({ instruction }) => instruction === undefined))

  const queenMateInOne = queenSection?.puzzles[0]
  assert.equal(queenMateInOne?.maxPlayerMoves, 1)
  const game = new Chess(queenMateInOne.fen)
  assert.equal(game.move('Qg7#').san, 'Qg7#')
  assert.equal(game.isCheckmate(), true)

  assert.equal(rookSection?.title, 'King and Rook')
  assert.equal(rookSection?.puzzles.length, 5)
  assert.ok(rookSection?.puzzles.every(isInteractiveCheckmatePuzzle))
  assert.deepEqual(rookSection?.puzzles.map(({ title }) => title), [
    'Puzzle 1', 'Puzzle 2', 'Puzzle 3', 'Puzzle 4', 'Puzzle 5',
  ])
  assert.ok(rookSection?.puzzles.every(({ instruction }) => instruction === undefined))

  const rookMateInOne = rookSection?.puzzles[0]
  assert.equal(rookMateInOne?.maxPlayerMoves, 1)
  const rookGame = new Chess(rookMateInOne.fen)
  assert.equal(rookGame.move('Ra8#').san, 'Ra8#')
  assert.equal(rookGame.isCheckmate(), true)
})

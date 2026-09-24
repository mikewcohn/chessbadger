import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { readPuzzleCatalog } from '../src/lib/puzzleCatalog.ts'

function database(t, seed = true) {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  db.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  if (seed) db.exec(readFileSync(new URL('../migrations/0002_seed_puzzles.sql', import.meta.url), 'utf8'))
  const calls = []
  const query = async (sql, params = []) => {
    calls.push({ sql, params })
    return db.prepare(sql).all(...params)
  }
  return { db, query, calls }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

test('seed migration preserves every original puzzle and metadata field', async (t) => {
  const { query } = database(t)
  const catalog = await readPuzzleCatalog(query)
  assert.deepEqual(catalog.map(({ slug, puzzles }) => [slug, puzzles.length]), [
    ['steps-2-workbook', 527], ['polgar-5334', 4462],
  ])
  assert.equal(catalog.flatMap(({ puzzles }) => puzzles).length, 4989)
  // Captured independently from the original TypeScript catalog before removal.
  // Sorting object keys ignores serialization details while preserving array order.
  const hash = createHash('sha256').update(JSON.stringify(canonical(catalog))).digest('hex')
  assert.equal(hash, '622cb7ee8193d1a63eed741b3a07ad023a94f221406decfbd502f45f427d6e80')
})

test('collection and section order preserve routes, empty sections, and puzzle order', async (t) => {
  const { query } = database(t)
  // SQL transport order must not determine editorial ordering.
  const [steps, polgar] = await readPuzzleCatalog(async (sql, params) => (await query(sql, params)).reverse())
  const reorderedHash = createHash('sha256').update(JSON.stringify(canonical([steps, polgar]))).digest('hex')
  assert.equal(reorderedHash, '622cb7ee8193d1a63eed741b3a07ad023a94f221406decfbd502f45f427d6e80')
  assert.equal(steps.slug, 'steps-2-workbook')
  assert.deepEqual(steps.sections.map(({ slug }) => slug), [
    'step-1-review', 'double-attack-queen', 'the-pin', 'eliminating-the-defence',
    'opening-principles', 'mixed-review-1', 'mate-in-two', 'double-attack-knight',
    'mixed-review-2', 'double-attack-other-pieces', 'discovered-attack',
    'defending-against-mate', 'notation-and-final-review',
  ])
  assert.equal(steps.sections[0].workbookPages, 'Pages 3–4')
  assert.equal(steps.sections[0].puzzles.length, 22)
  assert.equal(steps.puzzles[0].id, 'page-3-puzzle-01')
  assert.equal(steps.puzzles.at(-1).id, 'page-56-puzzle-12')
  assert.deepEqual(polgar.sections.map(({ slug }) => slug), [
    'mate-in-one', 'white-to-move-mate-in-two', 'mate-in-two-451-3514',
    'mate-in-two-3515-3718', 'mate-in-three', 'miniatures-f3-f6', 'miniatures-g3-g6',
    'miniatures-f3-f6-second-set', 'miniatures-f2-f7', 'miniatures-g2-g7',
    'miniatures-h2-h7', 'miniature-games-diagrams', 'simple-endgames-white-draws',
    'simple-endgames-white-wins', 'polgar-sisters-combinations', 'mate-in-two-reference',
  ])
  assert.ok(polgar.sections.slice(5).every(({ puzzles }) => puzzles.length === 0))
  assert.equal(polgar.puzzles[0].id, 'polgar-puzzle-0001')
  assert.equal(polgar.puzzles.at(-1).id, 'polgar-puzzle-4462')
  for (const collection of [steps, polgar]) {
    assert.deepEqual(
      collection.sections.flatMap(({ puzzles }) => puzzles.map(({ id }) => id)).sort(),
      collection.puzzles.map(({ id }) => id).sort(),
    )
  }
})

test('solution variants remain available to the trainer', async (t) => {
  const { query } = database(t)
  const catalog = await readPuzzleCatalog(query)
  const puzzles = new Map(catalog.flatMap(({ puzzles }) => puzzles.map((puzzle) => [puzzle.id, puzzle])))
  const placement = puzzles.get('page-6-puzzle-01')
  assert.equal(placement.type, 'placement')
  assert.equal(placement.piece, 'wQ')
  assert.deepEqual(placement.answers, ['d7', 'f7'])
  const composition = puzzles.get('page-31-puzzle-01')
  assert.equal(composition.type, 'composition')
  assert.deepEqual(composition.pieces, ['wQ', 'wP'])
  assert.deepEqual(composition.placements, [{ piece: 'wQ', square: 'b7' }, { piece: 'wP', square: 'c6' }])
  const move = puzzles.get('page-16-puzzle-01')
  assert.deepEqual(move.answerMoves, ['e8b5'])
  assert.equal(move.sideToMove, 'black')
  const no = puzzles.get('page-51-puzzle-01')
  assert.equal(no.canAnswerNo, true)
  assert.deepEqual(no.answers, ['No'])
  const multipleLines = puzzles.get('page-32-puzzle-01')
  assert.equal(multipleLines.playThrough, true)
  assert.deepEqual(multipleLines.solutionLines, [['Rf7+', 'Kb8', 'Rg8#'], ['Rb5', 'Ka8', 'Ra6#']])
  assert.deepEqual(puzzles.get('polgar-puzzle-0307').solutionLines, [['Kc3', 'Ka2', 'Qb2#']])
})

test('catalog reads all D1 pages using bounded 500-row queries', async (t) => {
  const { query, calls } = database(t)
  const catalog = await readPuzzleCatalog(query)
  assert.equal(catalog.flatMap(({ puzzles }) => puzzles).length, 4989)
  const puzzleCalls = calls.filter(({ sql }) => /FROM puzzles /.test(sql))
  assert.deepEqual(puzzleCalls.map(({ params }) => params),
    Array.from({ length: 10 }, (_, index) => [500, index * 500]))
  assert.ok(calls.every(({ sql, params }) => /LIMIT \? OFFSET \?/.test(sql) && params[0] === 500))
})

test('empty D1 fails with migration instructions instead of generating empty pages', async (t) => {
  const { query } = database(t, false)
  await assert.rejects(readPuzzleCatalog(query), /D1 puzzle catalog is empty.*Apply the D1 migrations/)
})


test('follow-up migration preserves the upstream page 10 puzzle 12 correction', async (t) => {
  const { db, query } = database(t)
  const before = await readPuzzleCatalog(query)
  db.exec(readFileSync(new URL('../migrations/0003_correct_steps_page_10_puzzle_12.sql', import.meta.url), 'utf8'))
  const after = await readPuzzleCatalog(query)
  const expected = structuredClone(before)
  for (const collection of expected) {
    for (const puzzle of [...collection.puzzles, ...collection.sections.flatMap((section) => section.puzzles)]) {
      if (puzzle.id !== 'page-10-puzzle-12') continue
      puzzle.fen = 'r1bqkb1r/pppp1pp1/8/5P1p/3Q4/1B4n1/PPP3PP/RNB1K2R w - - 0 1'
      puzzle.answers = ['Qe3+']
    }
  }
  assert.deepEqual(after, expected)
})

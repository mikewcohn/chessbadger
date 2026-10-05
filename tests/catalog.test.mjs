import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
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

test('follow-up migrations put the queen on c2 and king on c1 in page 16 puzzle 8', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0006_correct_steps_page_16_puzzle_08.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0008_correct_steps_page_16_puzzle_08_piece_order.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzle = catalog.flatMap(({ puzzles }) => puzzles).find(({ id }) => id === 'page-16-puzzle-08')

  assert.equal(puzzle?.fen, '6b1/8/8/8/7r/8/2Q5/2K5 b - - 0 1')
})

test('follow-up migration makes the queen on g3 White in page 16 puzzle 11', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0009_correct_steps_page_16_puzzle_11_queen.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzle = catalog.flatMap(({ puzzles }) => puzzles).find(({ id }) => id === 'page-16-puzzle-11')

  assert.equal(puzzle?.fen, '8/6b1/2n5/8/8/6Q1/7K/8 b - - 0 1')
})

test('page 17 positions match the workbook reference', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0007_correct_steps_page_17_positions.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0010_correct_steps_page_17_puzzle_05_queen.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzles = new Map(catalog.flatMap(({ puzzles }) => puzzles.map((puzzle) => [puzzle.id, puzzle])))
  const expected = {
    'page-17-puzzle-01': ['1n2k1nr/5ppp/4p3/3p4/3P4/2PB1N2/5PPP/6K1 w - - 0 1', 'wR'],
    'page-17-puzzle-02': ['7k/pp1b2rp/2p5/3p1q2/3P4/3Q4/PPP4P/2KR4 w - - 0 1', 'wB'],
    'page-17-puzzle-03': ['8/ppk1nppp/8/8/4BP2/8/PP4PP/R3K2R b - - 0 1', 'bQ'],
    'page-17-puzzle-04': ['5bk1/pp1R2p1/2n4p/8/5P2/2N3P1/PP1K2B1/8 b - - 0 1', 'bR'],
    'page-17-puzzle-05': ['2q2r1k/p5p1/1p5p/4p3/7P/5N2/PP2RQP1/6K1 b - - 0 1', 'bB'],
    'page-17-puzzle-06': ['6k1/1R3p2/p5p1/7p/8/6P1/1P3PKP/R7 b - - 0 1', 'bQ'],
    'page-17-puzzle-07': ['k7/p7/1pr1p3/5p1b/8/6Pp/PP3P1P/5RK1 w - - 0 1', 'wB'],
    'page-17-puzzle-08': ['2R5/1p2kppp/4b3/3p4/1n1P3P/1P3BP1/5PK1/8 w - - 0 1', 'wQ'],
    'page-17-puzzle-09': ['2k4r/pb3ppp/8/2b2B2/8/2N4P/PP4P1/7K w - - 0 1', 'wR'],
    'page-17-puzzle-10': ['4k2r/1p2pp1p/3p1np1/1rp5/4Pq2/5N2/PP3PPP/R4RK1 w - - 0 1', 'wQ'],
    'page-17-puzzle-11': ['5r2/5pk1/1p4pp/pP3n2/P1B2N2/5P2/5P1P/2R3K1 b - - 0 1', 'bB'],
    'page-17-puzzle-12': ['k2r4/qp3pp1/2p1bn2/7r/8/P1B2N2/1PQ2PPP/5RK1 w - - 0 1', 'wR'],
  }

  for (const [id, [fen, piece]] of Object.entries(expected)) {
    const puzzle = puzzles.get(id)
    assert.deepEqual([puzzle?.fen, puzzle?.piece], [fen, piece], id)
  }
})

test('page 18 and 19 positions match the rendered workbook pages', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0011_correct_steps_pages_18_19_positions.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0014_correct_steps_page_18_puzzle_04_queen.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzles = new Map(catalog.flatMap(({ puzzles }) => puzzles.map((puzzle) => [puzzle.id, puzzle])))
  const expected = {
    'page-18-puzzle-01': ['k6r/p4p2/3p2p1/3r3p/8/2P2PP1/1P2Q2P/6K1 w - - 0 1', 'Qe4'],
    'page-18-puzzle-04': ['4r3/3q1kpp/p3rp2/2R5/3pP3/1RbP2QP/P4BP1/7K w - - 0 1', 'Rc7'],
    'page-19-puzzle-04': ['r4rk1/pp3ppp/8/2PR4/b4B2/6P1/1P3PKP/5R2 b - - 0 1', 'Bc6'],
    'page-19-puzzle-05': ['7k/1p4p1/p6p/2b1pP2/2Pq4/1B6/P4QPP/5RK1 b - - 0 1', 'Qd6'],
    'page-19-puzzle-06': ['4r1k1/2q1bppp/p7/1p3P2/2p5/P1P1QB1P/1P4P1/5RK1 b - - 0 1', 'Bc5'],
    'page-19-puzzle-08': ['7r/1r2npp1/k2p3p/pq1Pp3/1p2P3/7B/PP2QP1P/2R1R1K1 w - - 0 1', 'Bf1'],
    'page-19-puzzle-10': ['5rk1/ppq2ppp/2pn4/6N1/2P5/3r1P2/PP3RPP/R3Q1K1 w - - 0 1', 'Qb1'],
  }

  for (const [id, [fen, answer]] of Object.entries(expected)) {
    const puzzle = puzzles.get(id)
    assert.deepEqual([puzzle?.fen, puzzle?.answers[0]], [fen, answer], id)
  }
})

test('page 21 puzzles 4 and 5 match the workbook reference', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0015_correct_steps_page_21_puzzle_04_bishop.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0016_correct_steps_page_21_puzzle_05_rook.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzles = new Map(catalog.flatMap(({ puzzles }) => puzzles.map((puzzle) => [puzzle.id, puzzle])))

  assert.equal(puzzles.get('page-21-puzzle-04')?.fen, '8/1p4Bk/2p4p/2Pn4/8/1P6/r5RP/7K b - - 0 1')
  assert.equal(puzzles.get('page-21-puzzle-05')?.fen, '6k1/6pb/1p3p2/8/4r3/2P2KB1/1P3P2/7R w - - 0 1')
})

test('page 24 puzzle 1 has the White rook shown on a1', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0012_correct_steps_page_24_puzzle_01_rook.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzle = catalog.flatMap(({ puzzles }) => puzzles).find(({ id }) => id === 'page-24-puzzle-01')

  assert.equal(puzzle?.fen, '1r3rk1/1pb2ppp/8/1P2n3/2p5/2B4P/5PP1/R2R1BK1 w - - 0 1')
})

test('page 24 puzzles 7 through 12 require the complete workbook combinations', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0017_audit_steps_pages_21_56.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0018_add_page_24_solution_lines.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzles = new Map(catalog.flatMap(({ puzzles }) => puzzles.map((puzzle) => [puzzle.id, puzzle])))

  const expectedLines = {
    'page-24-puzzle-07': [['Bxc5', 'dxc5', 'Rxe5']],
    'page-24-puzzle-08': [['Rxf2', 'Bxf2', 'Kxg5']],
    'page-24-puzzle-09': [['Rxd1', 'Qxd1', 'Qxf2']],
    'page-24-puzzle-10': [['b5', 'Qxb5', 'Rxe4']],
    'page-24-puzzle-11': [['Ra1+', 'Bxa1', 'Qxc5'], ['Ra1+', 'Bg1', 'Qxc5']],
    'page-24-puzzle-12': [['Ng5+', 'Bxg5', 'Rxc7+']],
  }

  for (const [id, solutionLines] of Object.entries(expectedLines)) {
    assert.equal(puzzles.get(id)?.playThrough, true)
    assert.deepEqual(puzzles.get(id)?.solutionLines, solutionLines)
  }
  assert.equal(puzzles.get('page-24-puzzle-11')?.solutionNote, 'Also shown: 1...Qxc5? 2.Bxc5 Ra1+ 3.Bg1.')
  assert.equal(puzzles.get('page-24-puzzle-12')?.solutionNote, 'If Black does not play 1...Bxg5, White continues with 2.Nxe6.')
})

test('page 40 puzzle 12 answers the check from the queen on e3', async (t) => {
  const { db, query } = database(t)
  db.exec(readFileSync(new URL('../migrations/0013_correct_steps_page_40_puzzle_12_answer.sql', import.meta.url), 'utf8'))
  const catalog = await readPuzzleCatalog(query)
  const puzzle = catalog.flatMap(({ puzzles }) => puzzles).find(({ id }) => id === 'page-40-puzzle-12')

  assert.deepEqual(puzzle?.answers, ['Rxe3'])
  assert.deepEqual(puzzle?.answerMoves, ['e1e3'])
  assert.equal(puzzle?.sideToMove, 'white')
})

test('audited workbook pages 21 through 56 stay byte-for-byte stable', async (t) => {
  const { db, query } = database(t)
  const migrationDirectory = new URL('../migrations/', import.meta.url)
  for (const migration of readdirSync(migrationDirectory)
    .filter((name) => name.endsWith('.sql') && name > '0002_seed_puzzles.sql')
    .sort()) {
    db.exec(readFileSync(new URL(migration, migrationDirectory), 'utf8'))
  }

  const catalog = await readPuzzleCatalog(query)
  const auditedPuzzles = catalog
    .find(({ slug }) => slug === 'steps-2-workbook')
    .puzzles
    .filter(({ id }) => {
      const page = Number(id.split('-')[1])
      return page >= 21 && page <= 56
    })
    .map((puzzle) => [puzzle.id, puzzle])
    .sort(([left], [right]) => left.localeCompare(right))

  assert.equal(auditedPuzzles.length, 368)
  const hash = createHash('sha256')
    .update(JSON.stringify(canonical(auditedPuzzles)))
    .digest('hex')
  assert.equal(hash, '9fa59f39fdcd6d9edb66b49afaa53158819cb1f4c526fed3a2e149ed2b8ecc47')

  const puzzles = new Map(auditedPuzzles)
  assert.deepEqual(
    [puzzles.get('page-46-puzzle-01')?.fen, puzzles.get('page-46-puzzle-01')?.answerMoves],
    ['8/1r6/1B6/4k3/8/8/4K3/1R6 w - - 0 1', ['b6d4']],
  )
  assert.deepEqual(puzzles.get('page-50-puzzle-02')?.answers, ['Qd5'])
  assert.deepEqual(puzzles.get('page-51-puzzle-07')?.answers, ['e8=N+'])
  assert.deepEqual(puzzles.get('page-54-puzzle-08')?.answers, ['Qh4+'])
  assert.deepEqual(puzzles.get('page-55-puzzle-10')?.answers, ['Nxg3+'])
  assert.deepEqual(puzzles.get('page-56-puzzle-12')?.answers, ['Nf3+'])
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { appendAttempt, readPractice } from '../functions/lib/practice.ts'
import { onRequestGet, onRequestPost } from '../functions/api/practice/attempts.ts'
import { onRequestGet as getResults } from '../functions/api/practice/results.ts'

function database(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO puzzle_collections VALUES ('test', 'Test', '', 0);
    INSERT INTO puzzle_sections VALUES ('test', 'review', 'Review', '', '[]', 0);
    INSERT INTO puzzles VALUES (
      'page-1-puzzle-1', 'test', 'review', 0, 0, '{"id":"page-1-puzzle-1"}'
    );
  `)
  const DB = {
    prepare(query) {
      const statement = sqlite.prepare(query)
      let values = []
      const bound = {
        bind(...next) { values = next; return bound },
        async first() { return statement.get(...values) ?? null },
        async all() { return { results: statement.all(...values) } },
        async run() { return statement.run(...values) },
      }
      return bound
    },
  }
  return { sqlite, env: { DB } }
}

const attempt = (index, overrides = {}) => ({
  id: `attempt-${index}`,
  puzzleId: 'page-1-puzzle-1',
  puzzleTitle: 'Test puzzle',
  move: 'Qh7#',
  result: 'correct',
  checkedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  ...overrides,
})

const post = (env, body) => onRequestPost({
  env,
  request: new Request('https://chessbadger.com/api/practice/attempts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }),
})

const validBody = {
  puzzleId: 'page-1-puzzle-1',
  puzzleTitle: 'Test puzzle',
  move: 'Qh7#',
  result: 'correct',
  durationMs: 1200,
  pauseCount: 0,
  restartCount: 1,
}

// The storage tests intentionally exercise SQL through SQLite, including ordering,
// retention, and nullable legacy fields; the adapter only matches D1's call shape.
test('empty database yields the existing attempts response on both GET routes', async (t) => {
  const { env } = database(t)
  for (const handler of [onRequestGet, getResults]) {
    const response = await handler({ env })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { attempts: [] })
  }
})

test('legacy nullable timing is omitted and zero timing survives round trip', async (t) => {
  const { env } = database(t)
  await appendAttempt(env, attempt(0))
  await appendAttempt(env, attempt(1, { durationMs: 0, pauseCount: 0, restartCount: 0 }))
  assert.deepEqual(await readPractice(env), { attempts: [
    attempt(0), attempt(1, { durationMs: 0, pauseCount: 0, restartCount: 0 }),
  ] })
})

test('latest 1000 are returned oldest first while all history is retained', async (t) => {
  const { env, sqlite } = database(t)
  for (let index = 1004; index >= 0; index--) await appendAttempt(env, attempt(index))
  const { attempts } = await readPractice(env)
  assert.equal(attempts.length, 1000)
  assert.equal(attempts[0].id, 'attempt-5')
  assert.equal(attempts.at(-1).id, 'attempt-1004')
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM practice_attempts').get().count, 1005)
})

test('equal timestamps retain insertion order and parallel posts do not overwrite history', async (t) => {
  const { env } = database(t)
  await appendAttempt(env, attempt(0, { id: 'first' }))
  await appendAttempt(env, attempt(0, { id: 'second' }))
  assert.deepEqual((await readPractice(env)).attempts.map(({ id }) => id), ['first', 'second'])
  const responses = await Promise.all(Array.from({ length: 10 }, () => post(env, validBody)))
  assert.ok(responses.every((response) => response.status === 201))
  const records = (await readPractice(env)).attempts
  assert.equal(records.length, 12)
  assert.equal(new Set(records.map(({ id }) => id)).size, 12)
})

test('known puzzle accepts multi-ply move text with unchanged response fields', async (t) => {
  const { env } = database(t)
  const move = 'Qh7+ Kf8 Qh8+ Ke7 Qh4+ Kf8 Qh7#'
  const response = await post(env, { ...validBody, move })
  assert.equal(response.status, 201)
  const { attempt: saved } = await response.json()
  assert.deepEqual(saved, { ...validBody, move, id: saved.id, checkedAt: saved.checkedAt })
  assert.deepEqual((await readPractice(env)).attempts, [saved])
})

test('unknown puzzles and invalid payloads are rejected without inserting attempts', async (t) => {
  const { env } = database(t)
  for (const body of [
    null, [], 'invalid',
    { ...validBody, puzzleId: 'page-999-puzzle-999' },
    { ...validBody, puzzleId: 3 },
    { ...validBody, move: [] },
    { ...validBody, move: 'x'.repeat(4097) },
    { ...validBody, result: 'other' },
    { ...validBody, durationMs: -1 },
    { ...validBody, pauseCount: 1.5 },
    { ...validBody, restartCount: 1001 },
  ]) {
    assert.equal((await post(env, body)).status, 400)
  }
  assert.deepEqual(await readPractice(env), { attempts: [] })
})

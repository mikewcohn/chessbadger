import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { appendAttempt, readPractice } from '../functions/lib/practice.ts'
import { onRequestDelete, onRequestGet, onRequestPost } from '../functions/api/practice/attempts.ts'

function database(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0004_players.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0027_add_practice_sessions.sql', import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO puzzle_collections VALUES ('test', 'Test', '', 0);
    INSERT INTO puzzle_sections VALUES ('test', 'review', 'Review', '', '[]', 0);
    INSERT INTO puzzle_sections VALUES ('test', 'other', 'Other', '', '[]', 1);
    INSERT INTO puzzle_collections VALUES ('other-book', 'Other book', '', 1);
    INSERT INTO puzzle_sections VALUES ('other-book', 'review', 'Review', '', '[]', 0);
    INSERT INTO puzzles VALUES (
      'page-1-puzzle-1', 'test', 'review', 0, 0, '{"id":"page-1-puzzle-1"}'
    );
    INSERT INTO puzzles VALUES (
      'page-1-puzzle-2', 'test', 'review', 1, 1, '{"id":"page-1-puzzle-2"}'
    );
    INSERT INTO puzzles VALUES (
      'page-2-puzzle-1', 'test', 'other', 2, 0, '{"id":"page-2-puzzle-1"}'
    );
    INSERT INTO puzzles VALUES (
      'other-book-puzzle-1', 'other-book', 'review', 0, 0, '{"id":"other-book-puzzle-1"}'
    );
    INSERT INTO players VALUES (
      'player-test', 'Test', 'test', 'salt', 'hash', '2026-01-01T00:00:00.000Z'
    );
    INSERT INTO players VALUES (
      'player-other', 'Other', 'other', 'salt', 'hash', '2026-01-01T00:00:00.000Z'
    );
    INSERT INTO player_sessions VALUES (
      '${createHash('sha256').update('test-token').digest('hex')}',
      'player-test', '2026-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z'
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
    headers: { 'content-type': 'application/json', cookie: 'cb_session=test-token' },
    body: JSON.stringify(body),
  }),
})

const remove = (env, body, signedIn = true) => onRequestDelete({
  env,
  request: new Request('https://chessbadger.com/api/practice/attempts', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', ...(signedIn ? { cookie: 'cb_session=test-token' } : {}) },
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
  sessionId: 'session-one',
}

// The storage tests intentionally exercise SQL through SQLite, including ordering,
// retention, and nullable legacy fields; the adapter only matches D1's call shape.
test('empty database yields the existing attempts response on both GET routes', async (t) => {
  const { env } = database(t)
  const response = await onRequestGet({ env, request: new Request('https://chessbadger.com/api/practice/attempts', { headers: { cookie: 'cb_session=test-token' } }) })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { attempts: [] })
})

test('legacy nullable timing is omitted and zero timing survives round trip', async (t) => {
  const { env } = database(t)
  await appendAttempt(env, 'player-test', attempt(0))
  await appendAttempt(env, 'player-test', attempt(1, { durationMs: 0, pauseCount: 0, restartCount: 0 }))
  assert.deepEqual(await readPractice(env, 'player-test'), { attempts: [
    attempt(0), attempt(1, { durationMs: 0, pauseCount: 0, restartCount: 0 }),
  ] })
})

test('latest 1000 are returned oldest first while all history is retained', async (t) => {
  const { env, sqlite } = database(t)
  for (let index = 1004; index >= 0; index--) await appendAttempt(env, 'player-test', attempt(index))
  const { attempts } = await readPractice(env, 'player-test')
  assert.equal(attempts.length, 1000)
  assert.equal(attempts[0].id, 'attempt-5')
  assert.equal(attempts.at(-1).id, 'attempt-1004')
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM practice_attempts').get().count, 1005)
})

test('equal timestamps retain insertion order and parallel posts do not overwrite history', async (t) => {
  const { env } = database(t)
  await appendAttempt(env, 'player-test', attempt(0, { id: 'first' }))
  await appendAttempt(env, 'player-test', attempt(0, { id: 'second' }))
  assert.deepEqual((await readPractice(env, 'player-test')).attempts.map(({ id }) => id), ['first', 'second'])
  const responses = await Promise.all(Array.from({ length: 10 }, () => post(env, validBody)))
  assert.ok(responses.every((response) => response.status === 201))
  const records = (await readPractice(env, 'player-test').then((result) => result.attempts))
  assert.equal(records.length, 12)
  assert.equal(new Set(records.map(({ id }) => id)).size, 12)
})

test('direct storage accepts multi-ply move text with unchanged fields', async (t) => {
  const { env } = database(t)
  const move = 'Qh7+ Kf8 Qh8+ Ke7 Qh4+ Kf8 Qh7#'
  const saved = attempt(0, { ...validBody, move })
  await appendAttempt(env, 'player-test', saved)
  assert.deepEqual((await readPractice(env, 'player-test')).attempts, [saved])
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
    { ...validBody, sessionId: 'not a valid id' },
  ]) {
    assert.equal((await post(env, body)).status, 400)
  }
  assert.deepEqual(await readPractice(env, 'player-test'), { attempts: [] })
})

test('attempt reset requires authentication and a valid scope', async (t) => {
  const { env } = database(t)
  assert.equal((await remove(env, { scope: 'puzzle', puzzleId: 'page-1-puzzle-1' }, false)).status, 401)
  assert.equal((await remove(env, { scope: 'unknown' })).status, 400)
  assert.equal((await remove(env, { scope: 'collection', collectionSlug: 'test' })).status, 400)
})

test('puzzle reset deletes only the signed-in player’s attempts for that puzzle', async (t) => {
  const { env } = database(t)
  await appendAttempt(env, 'player-test', attempt(1))
  await appendAttempt(env, 'player-test', attempt(2, { puzzleId: 'page-1-puzzle-2' }))
  await appendAttempt(env, 'player-other', attempt(3))

  const response = await remove(env, { scope: 'puzzle', puzzleId: 'page-1-puzzle-1' })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { deleted: 1 })
  assert.deepEqual((await readPractice(env, 'player-test')).attempts.map(({ id }) => id), ['attempt-2'])
  assert.deepEqual((await readPractice(env, 'player-other')).attempts.map(({ id }) => id), ['attempt-3'])
})

test('section reset stays within the requested collection and section', async (t) => {
  const { env } = database(t)
  await appendAttempt(env, 'player-test', attempt(1))
  await appendAttempt(env, 'player-test', attempt(2, { puzzleId: 'page-1-puzzle-2' }))
  await appendAttempt(env, 'player-test', attempt(3, { puzzleId: 'page-2-puzzle-1' }))

  const response = await remove(env, { scope: 'section', collectionSlug: 'test', sectionSlug: 'review' })
  assert.deepEqual(await response.json(), { deleted: 2 })
  assert.deepEqual((await readPractice(env, 'player-test')).attempts.map(({ id }) => id), ['attempt-3'])
})

test('book reset requires RESET and preserves other books and players', async (t) => {
  const { env } = database(t)
  await appendAttempt(env, 'player-test', attempt(1))
  await appendAttempt(env, 'player-test', attempt(2, { puzzleId: 'page-2-puzzle-1' }))
  await appendAttempt(env, 'player-test', attempt(3, { puzzleId: 'other-book-puzzle-1' }))
  await appendAttempt(env, 'player-other', attempt(4))

  const rejected = await remove(env, { scope: 'collection', collectionSlug: 'test', confirmation: 'reset' })
  assert.equal(rejected.status, 400)
  const response = await remove(env, { scope: 'collection', collectionSlug: 'test', confirmation: 'RESET' })
  assert.deepEqual(await response.json(), { deleted: 2 })
  assert.deepEqual((await readPractice(env, 'player-test')).attempts.map(({ id }) => id), ['attempt-3'])
  assert.deepEqual((await readPractice(env, 'player-other')).attempts.map(({ id }) => id), ['attempt-4'])
})

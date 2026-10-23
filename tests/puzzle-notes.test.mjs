import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { onRequestGet, onRequestPost } from '../functions/api/practice/notes.ts'

function database(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0004_players.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0067_add_puzzle_notes.sql', import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO puzzle_collections VALUES ('test', 'Test', '', 0);
    INSERT INTO puzzle_sections VALUES ('test', 'review', 'Review', '', '[]', 0);
    INSERT INTO puzzles VALUES ('page-1-puzzle-1', 'test', 'review', 0, 0, '{"id":"page-1-puzzle-1"}');
    INSERT INTO players VALUES ('player-test', 'Test', 'test', 'salt', 'hash', '2026-01-01T00:00:00.000Z');
    INSERT INTO players VALUES ('player-other', 'Other', 'other', 'salt', 'hash', '2026-01-01T00:00:00.000Z');
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

const request = (body, signedIn = true) => new Request('https://chessbadger.com/api/practice/notes', {
  method: body === undefined ? 'GET' : 'POST',
  headers: { 'content-type': 'application/json', ...(signedIn ? { cookie: 'cb_session=test-token' } : {}) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

test('notes are private to the signed-in player and can be updated', async (t) => {
  const { env } = database(t)
  const first = await onRequestPost({ env, request: request({ puzzleId: 'page-1-puzzle-1', note: '+3 1. Bxc5 Nf3 0' }) })
  assert.equal(first.status, 200)
  assert.deepEqual(await first.json(), { note: { puzzleId: 'page-1-puzzle-1', note: '+3 1. Bxc5 Nf3 0' } })

  await onRequestPost({ env, request: request({ puzzleId: 'page-1-puzzle-1', note: 'Updated note' }) })
  const response = await onRequestGet({ env, request: request(undefined) })
  assert.deepEqual(await response.json(), { notes: { 'page-1-puzzle-1': 'Updated note' } })
  assert.deepEqual(await (await onRequestGet({ env, request: request(undefined, false) })).json(), { notes: {} })
})

test('blank notes delete stored notes and invalid notes are rejected', async (t) => {
  const { env, sqlite } = database(t)
  await onRequestPost({ env, request: request({ puzzleId: 'page-1-puzzle-1', note: 'Remove me' }) })
  assert.equal((await onRequestPost({ env, request: request({ puzzleId: 'page-1-puzzle-1', note: '' }) })).status, 200)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM puzzle_notes').get().count, 0)

  assert.equal((await onRequestPost({ env, request: request({ puzzleId: 'missing', note: 'No' }) })).status, 400)
  assert.equal((await onRequestPost({ env, request: request({ puzzleId: 'page-1-puzzle-1', note: 'x'.repeat(4097) }) })).status, 400)
  assert.equal((await onRequestPost({ env, request: request({ puzzleId: 'page-1-puzzle-1', note: 'No' }, false) })).status, 401)
})

import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
import {test} from 'node:test'
import {onRequestPost as importAttempts} from '../functions/api/practice/import.ts'
import {readPractice} from '../functions/lib/practice.ts'

function database(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0004_players.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0027_add_practice_sessions.sql', import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO puzzle_collections VALUES ('test', 'Test', '', 0);
    INSERT INTO puzzle_sections VALUES ('test', 'review', 'Review', '', '[]', 0);
    INSERT INTO puzzles VALUES (
      'page-1-puzzle-1', 'test', 'review', 0, 0,
      '{"id":"page-1-puzzle-1","title":"Page 1, Puzzle 1"}'
    );
    INSERT INTO players VALUES (
      'player-test', 'Test', 'test', 'salt', 'hash', '2026-01-01T00:00:00.000Z'
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
        async all() { return {results: statement.all(...values)} },
        async run() { return statement.run(...values) },
      }
      return bound
    },
    async batch(statements) {
      return Promise.all(statements.map((statement) => statement.run()))
    },
  }
  return {sqlite, env: {DB}}
}

const attempt = (overrides = {}) => ({
  id: '739f0c2b-8af4-4ef0-870c-8be0092ae62a',
  puzzleId: 'page-1-puzzle-1',
  move: 'Qh7#',
  result: 'correct',
  checkedAt: '2026-01-02T03:04:05.000Z',
  sessionId: 'browser-session',
  durationMs: 1200,
  pauseCount: 1,
  restartCount: 0,
  ...overrides,
})

const request = (attempts, signedIn = true) => new Request('https://chessbadger.com/api/practice/import', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(signedIn ? {cookie: 'cb_session=test-token'} : {}),
  },
  body: JSON.stringify({attempts}),
})

test('anonymous attempt import requires a signed-in player', async (t) => {
  const {env} = database(t)
  const response = await importAttempts({env, request: request([attempt()], false)})
  assert.equal(response.status, 401)
})

test('imports cached attempts with catalog titles and preserves practice details', async (t) => {
  const {env} = database(t)
  const attempts = [
    attempt(),
    attempt({
      id: 'b0b356e6-98cf-419c-98f8-cf96bc47be1e',
      move: 'Qg7+',
      result: 'incorrect',
      checkedAt: '2026-01-02T03:05:05.000Z',
      durationMs: 2400,
    }),
  ]
  const response = await importAttempts({env, request: request(attempts)})
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    imported: 2,
    alreadySaved: 0,
    acceptedIds: attempts.map(({id}) => id),
  })
  assert.deepEqual((await readPractice(env, 'player-test')).attempts, attempts.map((item) => ({
    ...item,
    puzzleTitle: 'Page 1, Puzzle 1',
  })))
})

test('repeating an import is idempotent and clears every accepted browser id', async (t) => {
  const {env, sqlite} = database(t)
  const cachedAttempt = attempt()
  await importAttempts({env, request: request([cachedAttempt])})
  const repeated = await importAttempts({env, request: request([cachedAttempt, cachedAttempt])})
  assert.deepEqual(await repeated.json(), {
    imported: 0,
    alreadySaved: 1,
    acceptedIds: [cachedAttempt.id],
  })
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM practice_attempts').get().count, 1)
})

test('rejects invalid or unknown cached attempts without a partial import', async (t) => {
  const {env, sqlite} = database(t)
  for (const attempts of [
    [],
    [attempt({id: 'not-a-uuid'})],
    [attempt(), attempt({
      id: 'bd3b6a13-18a8-4b37-8991-e50e6c5972ca',
      puzzleId: 'unknown-puzzle',
    })],
  ]) {
    const response = await importAttempts({env, request: request(attempts)})
    assert.equal(response.status, 400)
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM practice_attempts').get().count, 0)
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { onRequestPost as claim } from '../functions/api/players/claim.ts'
import { onRequestPost as login } from '../functions/api/players/login.ts'
import { onRequestGet as me } from '../functions/api/players/me.ts'
import { onRequestGet as getProgress } from '../functions/api/players/[handle]/progress.ts'
import { onRequestGet as getAttempts, onRequestPost as saveAttempt } from '../functions/api/practice/attempts.ts'

function database(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0004_players.sql', import.meta.url), 'utf8'))
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

const request = (path, body, cookie) => new Request(`https://chessbadger.com${path}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers: {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(cookie ? { cookie } : {}),
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0]

const claimPlayer = async (env, handle, pin = '1234') => {
  const response = await claim({ env, request: request('/api/players/claim', { handle, pin }) })
  return { response, cookie: cookieFrom(response) }
}

const validAttempt = {
  puzzleId: 'page-1-puzzle-1',
  puzzleTitle: 'Test puzzle',
  move: 'Qh7#',
  result: 'correct',
  durationMs: 1200,
  pauseCount: 0,
  restartCount: 0,
}

test('claim creates a normalized unique player and authenticated session', async (t) => {
  const { env } = database(t)
  const { response, cookie } = await claimPlayer(env, ' Mike ')
  assert.equal(response.status, 201)
  assert.match(cookie, /^cb_session=/)
  assert.deepEqual(await response.json(), { player: { handle: 'Mike', slug: 'mike' } })

  const meResponse = await me({ env, request: request('/api/players/me', undefined, cookie) })
  assert.deepEqual(await meResponse.json(), { player: { handle: 'Mike', slug: 'mike' } })

  const duplicate = await claimPlayer(env, 'MIKE', '5678')
  assert.equal(duplicate.response.status, 409)
})

test('login rejects a wrong PIN and creates a new session for the right PIN', async (t) => {
  const { env } = database(t)
  await claimPlayer(env, 'Mike')
  const wrong = await login({ env, request: request('/api/players/login', { handle: 'mike', pin: '0000' }) })
  assert.equal(wrong.status, 401)

  const right = await login({ env, request: request('/api/players/login', { handle: 'MIKE', pin: '1234' }) })
  assert.equal(right.status, 200)
  assert.match(cookieFrom(right), /^cb_session=/)
})

test('attempt history is private to the signed-in player', async (t) => {
  const { env } = database(t)
  const mike = await claimPlayer(env, 'Mike')
  const blake = await claimPlayer(env, 'Blake')

  const anonymous = await saveAttempt({ env, request: request('/api/practice/attempts', validAttempt) })
  assert.equal(anonymous.status, 401)

  const saved = await saveAttempt({ env, request: request('/api/practice/attempts', validAttempt, mike.cookie) })
  assert.equal(saved.status, 201)

  const mikeAttempts = await getAttempts({ env, request: request('/api/practice/attempts', undefined, mike.cookie) })
  assert.equal((await mikeAttempts.json()).attempts.length, 1)
  const blakeAttempts = await getAttempts({ env, request: request('/api/practice/attempts', undefined, blake.cookie) })
  assert.deepEqual(await blakeAttempts.json(), { attempts: [] })

  const profile = await getProgress({ env, request: request('/api/players/mike/progress'), params: { handle: 'Mike' } })
  assert.equal(profile.status, 200)
  assert.deepEqual(await profile.json(), {
    player: { handle: 'Mike', slug: 'mike' },
    sections: [{
      collectionSlug: 'test',
      collectionTitle: 'Test',
      sectionSlug: 'review',
      sectionTitle: 'Review',
      total: 1,
      attempted: 1,
      clean: 1,
      retried: 0,
      missed: 0,
    }],
  })
})

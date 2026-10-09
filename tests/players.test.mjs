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
  sqlite.exec(readFileSync(new URL('../migrations/0027_add_practice_sessions.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0029_add_auth_rate_limits.sql', import.meta.url), 'utf8'))
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

const request = (path, body, cookie, clientIp = '203.0.113.10') => new Request(`https://chessbadger.com${path}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers: {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(cookie ? { cookie } : {}),
    'cf-connecting-ip': clientIp,
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0]

const claimPlayer = async (env, handle, pin = 'correct-horse') => {
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
  sessionId: 'session-one',
}

test('claim creates a normalized unique player and authenticated session', async (t) => {
  const { env } = database(t)
  const { response, cookie } = await claimPlayer(env, ' Mike ')
  assert.equal(response.status, 201)
  assert.match(cookie, /^cb_session=/)
  assert.deepEqual(await response.json(), { player: { handle: 'Mike', slug: 'mike' } })

  const meResponse = await me({ env, request: request('/api/players/me', undefined, cookie) })
  assert.deepEqual(await meResponse.json(), { player: { handle: 'Mike', slug: 'mike' } })

  const duplicate = await claimPlayer(env, 'MIKE', 'another-passphrase')
  assert.equal(duplicate.response.status, 409)
})

test('login rejects a wrong passphrase and creates a new session for the right passphrase', async (t) => {
  const { env } = database(t)
  await claimPlayer(env, 'Mike')
  const wrong = await login({ env, request: request('/api/players/login', { handle: 'mike', pin: 'wrong-passphrase' }) })
  assert.equal(wrong.status, 401)

  const right = await login({ env, request: request('/api/players/login', { handle: 'MIKE', pin: 'correct-horse' }) })
  assert.equal(right.status, 200)
  assert.match(cookieFrom(right), /^cb_session=/)
})

test('new players need an eight-character passphrase', async (t) => {
  const { env } = database(t)
  const { response } = await claimPlayer(env, 'Mike', '1234')
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /at least 8 characters/)
})

test('login is throttled after five failed attempts for a player and client', async (t) => {
  const { env } = database(t)
  await claimPlayer(env, 'Mike')

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await login({ env, request: request('/api/players/login', {
      handle: 'Mike',
      pin: 'wrong-passphrase',
    }) })
    assert.equal(response.status, 401)
  }

  const blocked = await login({ env, request: request('/api/players/login', {
    handle: 'Mike',
    pin: 'correct-horse',
  }) })
  assert.equal(blocked.status, 429)
  assert.match(blocked.headers.get('retry-after'), /^\d+$/)
})

test('account claims are limited per client', async (t) => {
  const { env } = database(t)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { response } = await claimPlayer(env, `Player ${attempt}`)
    assert.equal(response.status, 201)
  }

  const { response } = await claimPlayer(env, 'Player 6')
  assert.equal(response.status, 429)
  assert.match(response.headers.get('retry-after'), /^\d+$/)
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

test('a clean later session upgrades a previously missed puzzle', async (t) => {
  const { sqlite, env } = database(t)
  await claimPlayer(env, 'Mike')
  const playerId = sqlite.prepare("SELECT id FROM players WHERE normalized_handle = 'mike'").get().id
  sqlite.prepare(`
    INSERT INTO practice_attempts (
      id, puzzle_id, puzzle_title, move, result, checked_at,
      duration_ms, pause_count, restart_count, player_id, session_id
    ) VALUES (?, 'page-1-puzzle-1', 'Test puzzle', 'move', ?, ?, 1000, 0, 0, ?, ?)
  `).run('miss', 'incorrect', '2026-01-01T00:00:00.000Z', playerId, 'old-session')
  sqlite.prepare(`
    INSERT INTO practice_attempts (
      id, puzzle_id, puzzle_title, move, result, checked_at,
      duration_ms, pause_count, restart_count, player_id, session_id
    ) VALUES (?, 'page-1-puzzle-1', 'Test puzzle', 'move', ?, ?, 1000, 0, 0, ?, ?)
  `).run('clean', 'correct', '2026-01-02T00:00:00.000Z', playerId, 'new-session')

  const profile = await getProgress({ env, request: request('/api/players/mike/progress'), params: { handle: 'Mike' } })
  const section = (await profile.json()).sections[0]
  assert.deepEqual(
    { attempted: section.attempted, clean: section.clean, retried: section.retried, missed: section.missed },
    { attempted: 1, clean: 1, retried: 0, missed: 0 },
  )
})

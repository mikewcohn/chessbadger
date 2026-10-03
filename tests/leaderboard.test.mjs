import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { onRequestGet } from '../functions/api/leaderboard.ts'

function database(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0004_players.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0005_leaderboard_index.sql', import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO puzzle_collections VALUES ('test', 'Test', '', 0);
    INSERT INTO puzzle_sections VALUES ('test', 'review', 'Review', '', '[]', 0);
    INSERT INTO puzzles VALUES ('p1', 'test', 'review', 0, 0, '{"id":"p1"}');
    INSERT INTO puzzles VALUES ('p2', 'test', 'review', 1, 1, '{"id":"p2"}');
    INSERT INTO puzzles VALUES ('p3', 'test', 'review', 2, 2, '{"id":"p3"}');
    INSERT INTO players VALUES ('alice', 'Alice', 'alice', 'salt', 'hash', '2026-01-01T00:00:00.000Z');
    INSERT INTO players VALUES ('bob', 'Bob', 'bob', 'salt', 'hash', '2026-01-01T00:00:00.000Z');
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

const daysAgo = (days, seconds = 0) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000 + seconds * 1000).toISOString()

const addAttempt = (sqlite, id, playerId, puzzleId, result, checkedAt) => {
  sqlite.prepare(`
    INSERT INTO practice_attempts (
      id, puzzle_id, puzzle_title, move, result, checked_at,
      duration_ms, pause_count, restart_count, player_id
    ) VALUES (?, ?, 'Puzzle', 'move', ?, ?, 1000, 0, 0, ?)
  `).run(id, puzzleId, result, checkedAt, playerId)
}

const getLeaderboard = (env, range) => onRequestGet({
  env,
  request: new Request(`https://chessbadger.com/api/leaderboard?range=${range}`),
})

test('leaderboard awards first-ever solves once and credits the solve period', async (t) => {
  const { sqlite, env } = database(t)

  addAttempt(sqlite, 'a-p1-correct', 'alice', 'p1', 'correct', daysAgo(2))
  addAttempt(sqlite, 'a-p1-repeat', 'alice', 'p1', 'correct', daysAgo(1))
  addAttempt(sqlite, 'a-p2-miss', 'alice', 'p2', 'incorrect', daysAgo(12))
  addAttempt(sqlite, 'a-p2-correct', 'alice', 'p2', 'correct', daysAgo(2))
  addAttempt(sqlite, 'a-p3-correct', 'alice', 'p3', 'correct', daysAgo(40))

  addAttempt(sqlite, 'b-p1-correct', 'bob', 'p1', 'correct', daysAgo(3))
  addAttempt(sqlite, 'b-p2-view', 'bob', 'p2', 'answer-viewed', daysAgo(3, -1))
  addAttempt(sqlite, 'b-p2-correct', 'bob', 'p2', 'correct', daysAgo(3))

  const recent = await getLeaderboard(env, '7d')
  assert.equal(recent.status, 200)
  assert.deepEqual(await recent.json(), {
    range: '7d',
    leaders: [
      { handle: 'Alice', slug: 'alice', solved: 2, firstTry: 1, points: 3 },
      { handle: 'Bob', slug: 'bob', solved: 2, firstTry: 1, points: 3 },
    ],
  })

  const allTime = await getLeaderboard(env, 'all')
  assert.deepEqual(await allTime.json(), {
    range: 'all',
    leaders: [
      { handle: 'Alice', slug: 'alice', solved: 3, firstTry: 2, points: 5 },
      { handle: 'Bob', slug: 'bob', solved: 2, firstTry: 1, points: 3 },
    ],
  })
})

test('leaderboard rejects unknown ranges', async (t) => {
  const { env } = database(t)
  const response = await getLeaderboard(env, 'today')
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'Invalid leaderboard range.' })
})

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { onRequestGet as listInsights, onRequestPost as createInsight } from '../functions/api/insights/index.ts'
import {
  onRequestDelete as deleteInsight,
  onRequestGet as getInsight,
  onRequestPut as updateInsight,
} from '../functions/api/insights/[id].ts'

function database(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0004_players.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0068_add_player_insights.sql', import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO players VALUES ('player-one', 'One', 'one', 'salt', 'hash', '2026-01-01T00:00:00.000Z');
    INSERT INTO players VALUES ('player-two', 'Two', 'two', 'salt', 'hash', '2026-01-01T00:00:00.000Z');
    INSERT INTO player_sessions VALUES (
      '${createHash('sha256').update('token-one').digest('hex')}',
      'player-one', '2026-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z'
    );
    INSERT INTO player_sessions VALUES (
      '${createHash('sha256').update('token-two').digest('hex')}',
      'player-two', '2026-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z'
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

const validInsight = {
  title: 'Look for hanging pieces',
  note: 'Check every attacked piece before starting an attack.',
  pgn: '[White "One"]\n[Black "Two"]\n\n1. e4 e5 2. Nf3 Nc6',
  focusPly: 3,
  boardOrientation: 'white',
  side: 'both',
  tags: ['awareness', 'hanging pieces'],
}

const request = (path, body, token = 'token-one', method) => new Request(`https://chessbadger.com${path}`, {
  method: method ?? (body === undefined ? 'GET' : 'POST'),
  headers: {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(token ? { cookie: `cb_session=${token}` } : {}),
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

test('insights are created, listed, updated, and deleted for their owner', async (t) => {
  const { env } = database(t)
  const created = await createInsight({ env, request: request('/api/insights', validInsight) })
  assert.equal(created.status, 201)
  const createdBody = await created.json()
  const id = createdBody.insight.id
  assert.equal(createdBody.insight.focusPly, 3)
  assert.deepEqual(createdBody.insight.tags, ['awareness', 'hanging pieces'])

  const listed = await listInsights({ env, request: request('/api/insights') })
  assert.equal((await listed.json()).insights.length, 1)

  const updated = await updateInsight({
    env,
    params: { id },
    request: request(`/api/insights/${id}`, { ...validInsight, title: 'Updated lesson', boardOrientation: 'black' }, 'token-one', 'PUT'),
  })
  assert.equal(updated.status, 200)
  assert.equal((await updated.json()).insight.boardOrientation, 'black')

  const removed = await deleteInsight({
    env,
    params: { id },
    request: request(`/api/insights/${id}`, undefined, 'token-one', 'DELETE'),
  })
  assert.equal(removed.status, 200)
  assert.deepEqual(await removed.json(), { deleted: true })
})

test('another player and anonymous visitors cannot read or change an insight', async (t) => {
  const { env } = database(t)
  const created = await createInsight({ env, request: request('/api/insights', validInsight) })
  const id = (await created.json()).insight.id

  const otherRead = await getInsight({ env, params: { id }, request: request(`/api/insights/${id}`, undefined, 'token-two') })
  assert.equal(otherRead.status, 404)
  const otherDelete = await deleteInsight({ env, params: { id }, request: request(`/api/insights/${id}`, undefined, 'token-two', 'DELETE') })
  assert.equal(otherDelete.status, 404)
  const anonymousList = await listInsights({ env, request: request('/api/insights', undefined, null) })
  assert.equal(anonymousList.status, 401)
})

test('invalid insight payloads are rejected', async (t) => {
  const { env } = database(t)
  assert.equal((await createInsight({ env, request: request('/api/insights', { ...validInsight, title: '' }) })).status, 400)
  assert.equal((await createInsight({ env, request: request('/api/insights', { ...validInsight, tags: ['x'.repeat(41)] }) })).status, 400)
  assert.equal((await createInsight({ env, request: request('/api/insights', { ...validInsight, focusPly: -1 }) })).status, 400)
})

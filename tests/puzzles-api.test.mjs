import assert from 'node:assert/strict'
import test from 'node:test'
import { onRequestGet } from '../functions/api/puzzles/[collection]/[section].ts'

const rows = {
  puzzle_collections: [{ slug: 'steps-2-workbook', title: 'Steps 2 Workbook' }],
  puzzle_sections: [{ slug: 'mate-in-two', title: 'Mate in 2' }],
  puzzles: [
    { id: 'page-32-puzzle-01', definition_json: '{"id":"page-32-puzzle-01","title":"Page 32, Puzzle 1","fen":"8/8/8/8/8/8/8/8 w - - 0 1","answers":["Qa8#"]}' },
    { id: 'page-32-puzzle-02', definition_json: '{"id":"page-32-puzzle-02","title":"Page 32, Puzzle 2","fen":"8/8/8/8/8/8/8/8 w - - 0 1","answers":["Qb8#"]}' },
  ],
}

const env = {
  DB: {
    prepare(sql) {
      let values = []
      return {
        bind(...params) { values = params; return this },
        async first() {
          if (sql.includes('FROM puzzle_collections')) {
            return values[0] === 'steps-2-workbook' ? rows.puzzle_collections[0] : null
          }
          if (sql.includes('FROM puzzle_sections')) {
            return values[0] === 'steps-2-workbook' && values[1] === 'mate-in-two'
              ? rows.puzzle_sections[0]
              : null
          }
          return null
        },
        async all() { return { results: rows.puzzles } },
      }
    },
  },
}

test('runtime puzzle API returns the requested section without changing puzzle IDs', async () => {
  const response = await onRequestGet({
    params: { collection: 'steps-2-workbook', section: 'mate-in-two' },
    env,
  })
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60, s-maxage=60, stale-while-revalidate=300')
  assert.deepEqual(body.puzzles.map(({ id }) => id), ['page-32-puzzle-01', 'page-32-puzzle-02'])
})

test('runtime puzzle API rejects invalid slugs before querying D1', async () => {
  const response = await onRequestGet({
    params: { collection: '../players', section: 'mate-in-two' },
    env,
  })

  assert.equal(response.status, 400)
})

test('runtime puzzle API returns 404 for an unknown section', async () => {
  const response = await onRequestGet({
    params: { collection: 'steps-2-workbook', section: 'unknown' },
    env,
  })

  assert.equal(response.status, 404)
})

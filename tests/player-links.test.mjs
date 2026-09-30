import assert from 'node:assert/strict'
import { test } from 'node:test'
import { playerProgressUrl } from '../src/lib/playerLinks.ts'

test('player progress links point to the public player page', () => {
  assert.equal(
    playerProgressUrl('https://www.chessbadger.com', 'mike'),
    'https://www.chessbadger.com/players/mike',
  )
})

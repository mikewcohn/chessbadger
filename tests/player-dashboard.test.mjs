import assert from 'node:assert/strict'
import {test} from 'node:test'
import {buildPlayerDashboardStats, formatPracticeTime} from '../src/lib/playerDashboard.ts'

const DAY_MS = 24 * 60 * 60 * 1000

test('dashboard summarizes distinct weekly solves, active time, and a current streak', () => {
  const now = new Date(2026, 9, 18, 12)
  const attempts = [
    {puzzleId: 'one', result: 'incorrect', checkedAt: new Date(now.getTime() - 60_000).toISOString(), durationMs: 60_000},
    {puzzleId: 'one', result: 'correct', checkedAt: new Date(now.getTime() - 30_000).toISOString(), durationMs: 120_000},
    {puzzleId: 'two', result: 'correct', checkedAt: new Date(now.getTime() - DAY_MS).toISOString(), durationMs: 180_000},
    {puzzleId: 'old', result: 'correct', checkedAt: new Date(now.getTime() - 8 * DAY_MS).toISOString(), durationMs: 999_000},
  ]

  const stats = buildPlayerDashboardStats(attempts, now)
  assert.equal(stats.solvedThisWeek, 2)
  assert.equal(stats.activeTimeMs, 360_000)
  assert.equal(stats.streak, 2)
  assert.equal(stats.lastPracticedAt, attempts[1].checkedAt)
})

test('streak may continue from yesterday and stops at a missing day', () => {
  const now = new Date(2026, 9, 18, 12)
  const stats = buildPlayerDashboardStats([
    {puzzleId: 'one', result: 'correct', checkedAt: new Date(now.getTime() - DAY_MS).toISOString()},
    {puzzleId: 'two', result: 'correct', checkedAt: new Date(now.getTime() - 2 * DAY_MS).toISOString()},
    {puzzleId: 'three', result: 'correct', checkedAt: new Date(now.getTime() - 4 * DAY_MS).toISOString()},
  ], now)

  assert.equal(stats.streak, 2)
})

test('practice time uses compact minute and hour labels', () => {
  assert.equal(formatPracticeTime(0), '0 min')
  assert.equal(formatPracticeTime(30_000), '<1 min')
  assert.equal(formatPracticeTime(30 * 60_000), '30 min')
  assert.equal(formatPracticeTime(90 * 60_000), '1h 30m')
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { practiceImportSql } from '../scripts/import-practice.mjs'

test('legacy history import preserves values and can be repeated without duplicates', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(readFileSync(new URL('../migrations/0001_d1_schema.sql', import.meta.url), 'utf8'))
    db.exec(readFileSync(new URL('../migrations/0002_seed_puzzles.sql', import.meta.url), 'utf8'))
    const attempts = [
      { id: 'old', puzzleId: 'page-3-puzzle-01', puzzleTitle: "Learner's puzzle", move: 'Qa8#', result: 'correct', checkedAt: '2026-09-01T12:00:00.000Z' },
      { id: 'new', puzzleId: 'polgar-puzzle-0001', puzzleTitle: 'Problem 1', move: 'Answer viewed', result: 'answer-viewed', checkedAt: '2026-09-02T12:00:00.000Z', durationMs: 1240, pauseCount: 0, restartCount: 2 },
    ]
    const sql = practiceImportSql({ attempts })
    db.exec(sql)
    db.exec(sql)
    const rows = db.prepare('SELECT * FROM practice_attempts ORDER BY checked_at').all()
    assert.equal(rows.length, 2)
    assert.equal(rows[0].puzzle_title, "Learner's puzzle")
    assert.equal(rows[0].checked_at, attempts[0].checkedAt)
    assert.equal(rows[0].duration_ms, null)
    assert.equal(rows[1].duration_ms, 1240)
    assert.equal(rows[1].pause_count, 0)
    assert.equal(rows[1].restart_count, 2)
  } finally { db.close() }
})

test('invalid exports fail before producing partial SQL', () => {
  assert.throws(() => practiceImportSql({}), /attempts/)
  assert.throws(() => practiceImportSql({ attempts: [{}] }), /Invalid id/)
  const attempt = { id: 'one', puzzleId: 'page-3-puzzle-01', puzzleTitle: 'Puzzle', move: 'Qa8#', result: 'correct', checkedAt: '2026-09-01T12:00:00.000Z' }
  assert.throws(() => practiceImportSql({ attempts: [attempt, attempt] }), /Duplicate/)
  assert.throws(() => practiceImportSql({ attempts: [{ ...attempt, durationMs: -1 }] }), /durationMs/)
  assert.throws(() => practiceImportSql({ attempts: [{ ...attempt, result: 'unknown' }] }), /result/)
})

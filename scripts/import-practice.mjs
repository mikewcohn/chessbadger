import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const quote = (value) => value == null ? 'NULL' : typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`

// Converts the original KV record (or GET /api/practice/attempts response) to SQL.
// Stable IDs make repeated imports safe, including a final export during cutover.
export function practiceImportSql(record) {
  if (!record || !Array.isArray(record.attempts)) throw new Error('Expected an object containing attempts.')
  const ids = new Set()
  const statements = record.attempts.map((attempt, index) => {
    if (!attempt || typeof attempt !== 'object') throw new Error(`Invalid attempt at index ${index}.`)
    for (const field of ['id', 'puzzleId', 'puzzleTitle', 'move', 'checkedAt']) {
      if (typeof attempt[field] !== 'string' || (field !== 'puzzleTitle' && !attempt[field])) {
        throw new Error(`Invalid ${field} at attempt ${index}.`)
      }
    }
    if (ids.has(attempt.id)) throw new Error(`Duplicate attempt ID at index ${index}.`)
    ids.add(attempt.id)
    if (!['correct', 'incorrect', 'answer-viewed'].includes(attempt.result)) throw new Error(`Invalid result at attempt ${index}.`)
    if (!Number.isFinite(Date.parse(attempt.checkedAt))) throw new Error(`Invalid timestamp at attempt ${index}.`)
    for (const field of ['durationMs', 'pauseCount', 'restartCount']) {
      if (attempt[field] != null && (!Number.isInteger(attempt[field]) || attempt[field] < 0)) {
        throw new Error(`Invalid ${field} at attempt ${index}.`)
      }
    }
    const values = ['id', 'puzzleId', 'puzzleTitle', 'move', 'result', 'checkedAt', 'durationMs', 'pauseCount', 'restartCount'].map((field) => quote(attempt[field]))
    return `INSERT INTO practice_attempts (id, puzzle_id, puzzle_title, move, result, checked_at, duration_ms, pause_count, restart_count) VALUES (${values.join(', ')}) ON CONFLICT(id) DO NOTHING;`
  })
  return '-- Import shared practice history; existing attempt IDs are preserved.\n' + statements.join('\n') + '\n'
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output || process.argv.length !== 4) throw new Error('Usage: node scripts/import-practice.mjs /path/to/practice.json /path/to/practice.sql')
  const record = JSON.parse(await readFile(input, 'utf8'))
  await writeFile(output, practiceImportSql(record), { flag: 'wx', mode: 0o600 })
  console.log(`Prepared ${record.attempts.length} attempts. Apply the SQL to D1 after the catalog migrations.`)
}

// Build/server-only module. React components import types from src/types instead.
import { readPuzzleCatalog, type CatalogQuery } from './puzzleCatalog'
export type { PuzzleCollection, PuzzleSection } from '../types/puzzleCollections'

async function loadCatalog() {
  const mode = process.env.PUZZLES_D1_MODE ?? (process.env.CF_PAGES ? 'remote' : 'local')
  if (mode === 'remote') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
    const token = process.env.CLOUDFLARE_API_TOKEN
    if (!accountId || !databaseId || !token) {
      throw new Error('Remote D1 builds require CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN (D1 Read).')
    }
    const query: CatalogQuery = async <T>(sql: string, params: (number | string)[] = []) => {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ sql, params }),
      })
      if (!response.ok) throw new Error(`D1 catalog query failed (HTTP ${response.status}).`)
      const data = await response.json() as { success: boolean; result: { success: boolean; results: T[] }[] }
      if (!data.success || !data.result?.[0]?.success) throw new Error('D1 catalog query failed.')
      return data.result[0].results
    }
    return readPuzzleCatalog(query)
  }
  if (mode !== 'local') throw new Error('PUZZLES_D1_MODE must be local or remote.')
  const { getPlatformProxy } = await import('wrangler')
  type LocalDB = { prepare(sql: string): { bind(...params: (string | number)[]): { all<T>(): Promise<{ results: T[] }> } } }
  const proxy = await getPlatformProxy<{ DB: LocalDB }>({ remoteBindings: false })
  try {
    return await readPuzzleCatalog(async <T>(sql: string, params: (number | string)[] = []) =>
      (await proxy.env.DB.prepare(sql).bind(...params).all<T>()).results)
  } finally {
    await proxy.dispose()
  }
}

export const puzzleCollections = await loadCatalog()
function requiredCollection(slug: string) {
  const collection = puzzleCollections.find((candidate) => candidate.slug === slug)
  if (!collection) throw new Error(`D1 catalog is missing required collection: ${slug}`)
  return collection
}
export const steps2Workbook = requiredCollection('steps-2-workbook')
export const polgar5334 = requiredCollection('polgar-5334')

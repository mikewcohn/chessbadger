import type { PuzzleCollection, PuzzleSection } from '../types/puzzleCollections'
import type { Puzzle } from '../types/puzzles'

type CollectionRow = { slug: string; title: string; description: string; sort_order: number }
type SectionRow = CollectionRow & { collection_slug: string; workbook_pages: string }
type PuzzleRow = {
  id: string
  collection_slug: string
  section_slug: string
  sort_order: number
  section_sort_order: number
  definition_json: string
}
export type CatalogQuery = <T>(sql: string, params?: (number | string)[]) => Promise<T[]>

// Read bounded pages so large catalogs do not exceed a single D1 response.
async function readRows<T>(query: CatalogQuery, table: string): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += 500) {
    const page = await query<T>(`SELECT * FROM ${table} ORDER BY rowid LIMIT ? OFFSET ?`, [500, offset])
    rows.push(...page)
    if (page.length < 500) return rows
  }
}

export async function readPuzzleCatalog(query: CatalogQuery): Promise<PuzzleCollection[]> {
  const collections = await readRows<CollectionRow>(query, 'puzzle_collections')
  const sections = await readRows<SectionRow>(query, 'puzzle_sections')
  const rows = await readRows<PuzzleRow>(query, 'puzzles')
  if (!collections.length || !rows.length) throw new Error('D1 puzzle catalog is empty. Apply the D1 migrations before building.')
  const puzzles = new Map(rows.map((row) => {
    const puzzle = JSON.parse(row.definition_json) as Puzzle
    if (puzzle.id !== row.id) throw new Error(`D1 puzzle ID mismatch: ${row.id}`)
    return [row.id, puzzle]
  }))
  return collections.sort((a, b) => a.sort_order - b.sort_order).map((collection) => ({
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    puzzles: rows.filter((row) => row.collection_slug === collection.slug)
      .sort((a, b) => a.sort_order - b.sort_order).map((row) => puzzles.get(row.id)!),
    sections: sections.filter((section) => section.collection_slug === collection.slug)
      .sort((a, b) => a.sort_order - b.sort_order).map((section): PuzzleSection => ({
        slug: section.slug,
        title: section.title,
        description: section.description,
        workbookPages: section.workbook_pages,
        puzzles: rows.filter((row) => row.collection_slug === collection.slug && row.section_slug === section.slug)
          .sort((a, b) => a.section_sort_order - b.section_sort_order).map((row) => puzzles.get(row.id)!),
      })),
  }))
}

import { json, type PracticeEnv } from '../../../lib/practice.ts'

type PuzzleCatalogContext = {
  params: { collection?: string; section?: string }
  env: PracticeEnv
}

type CollectionRow = {
  slug: string
  title: string
}

type SectionRow = {
  slug: string
  title: string
}

type PuzzleRow = {
  id: string
  definition_json: string
}

const safeSlug = (value: string | undefined) => (
  value && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value) ? value : null
)

const catalogJson = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
})

export const onRequestGet = async ({ params, env }: PuzzleCatalogContext) => {
  const collectionSlug = safeSlug(params.collection)
  const sectionSlug = safeSlug(params.section)
  if (!collectionSlug || !sectionSlug) return json({ error: 'Invalid puzzle section.' }, 400)

  const collection = await env.DB.prepare(`
    SELECT slug, title
    FROM puzzle_collections
    WHERE slug = ?
  `).bind(collectionSlug).first<CollectionRow>()
  const section = await env.DB.prepare(`
    SELECT slug, title
    FROM puzzle_sections
    WHERE collection_slug = ? AND slug = ?
  `).bind(collectionSlug, sectionSlug).first<SectionRow>()

  if (!collection || !section) return json({ error: 'Puzzle section not found.' }, 404)

  const { results } = await env.DB.prepare(`
    SELECT id, definition_json
    FROM puzzles
    WHERE collection_slug = ? AND section_slug = ?
    ORDER BY section_sort_order
  `).bind(collectionSlug, sectionSlug).all<PuzzleRow>()

  const puzzles = results.map((row) => {
    const puzzle = JSON.parse(row.definition_json) as { id?: string }
    if (puzzle.id !== row.id) throw new Error(`D1 puzzle ID mismatch: ${row.id}`)
    return puzzle
  })

  return catalogJson({
    collection: { slug: collection.slug, title: collection.title },
    section: { slug: section.slug, title: section.title },
    puzzles,
  })
}

import { json, type FunctionContext } from '../../../lib/practice.ts'
import { normalizeHandle } from '../../../lib/players.ts'

type ProfileContext = FunctionContext & { params: { handle?: string } }
type PlayerRow = { id: string; handle: string; normalized_handle: string }
type SectionRow = {
  collection_slug: string
  collection_title: string
  section_slug: string
  section_title: string
  total: number
  attempted: number
  clean: number
  retried: number
  missed: number
}

export const onRequestGet = async ({ env, params }: ProfileContext) => {
  const normalized = normalizeHandle(params.handle)
  if (!normalized) return json({ error: 'Player not found.' }, 404)
  const player = await env.DB.prepare(`
    SELECT id, handle, normalized_handle FROM players WHERE normalized_handle = ?
  `).bind(normalized.slug).first<PlayerRow>()
  if (!player) return json({ error: 'Player not found.' }, 404)

  const { results } = await env.DB.prepare(`
    WITH puzzle_outcomes AS (
      SELECT puzzles.id, puzzles.collection_slug, puzzles.section_slug,
        MAX(CASE WHEN practice_attempts.result = 'correct' THEN 1 ELSE 0 END) AS solved,
        MAX(CASE WHEN practice_attempts.result != 'correct' THEN 1 ELSE 0 END) AS missed
      FROM puzzles
      LEFT JOIN practice_attempts
        ON practice_attempts.puzzle_id = puzzles.id AND practice_attempts.player_id = ?
      GROUP BY puzzles.id
    )
    SELECT puzzle_sections.collection_slug,
      puzzle_collections.title AS collection_title,
      puzzle_sections.slug AS section_slug,
      puzzle_sections.title AS section_title,
      COUNT(puzzle_outcomes.id) AS total,
      SUM(CASE WHEN puzzle_outcomes.solved = 1 OR puzzle_outcomes.missed = 1 THEN 1 ELSE 0 END) AS attempted,
      SUM(CASE WHEN puzzle_outcomes.solved = 1 AND puzzle_outcomes.missed = 0 THEN 1 ELSE 0 END) AS clean,
      SUM(CASE WHEN puzzle_outcomes.solved = 1 AND puzzle_outcomes.missed = 1 THEN 1 ELSE 0 END) AS retried,
      SUM(CASE WHEN puzzle_outcomes.solved = 0 AND puzzle_outcomes.missed = 1 THEN 1 ELSE 0 END) AS missed
    FROM puzzle_sections
    JOIN puzzle_collections ON puzzle_collections.slug = puzzle_sections.collection_slug
    LEFT JOIN puzzle_outcomes
      ON puzzle_outcomes.collection_slug = puzzle_sections.collection_slug
      AND puzzle_outcomes.section_slug = puzzle_sections.slug
    GROUP BY puzzle_sections.collection_slug, puzzle_sections.slug
    ORDER BY puzzle_collections.sort_order, puzzle_sections.sort_order
  `).bind(player.id).all<SectionRow>()

  return json({
    player: { handle: player.handle, slug: player.normalized_handle },
    sections: results.map((row) => ({
      collectionSlug: row.collection_slug,
      collectionTitle: row.collection_title,
      sectionSlug: row.section_slug,
      sectionTitle: row.section_title,
      total: row.total,
      attempted: row.attempted,
      clean: row.clean,
      retried: row.retried,
      missed: row.missed,
    })),
  })
}

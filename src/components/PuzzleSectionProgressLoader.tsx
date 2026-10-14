import { useEffect, useState } from 'react'
import type { Puzzle } from '../types/puzzles'
import type { PuzzleCollection, PuzzleSection } from '../types/puzzleCollections'
import PuzzleSectionProgress from './PuzzleSectionProgress'

type Props = {
  collection: PuzzleCollection
  section: PuzzleSection
}

type PuzzleSectionResponse = {
  puzzles?: Puzzle[]
}

export default function PuzzleSectionProgressLoader({ collection, section }: Props) {
  const [puzzles, setPuzzles] = useState(section.puzzles)

  useEffect(() => {
    const controller = new AbortController()
    const endpoint = `/api/puzzles/${encodeURIComponent(collection.slug)}/${encodeURIComponent(section.slug)}`
    void fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return
        const payload = await response.json() as PuzzleSectionResponse
        if (payload.puzzles) setPuzzles(payload.puzzles)
      })
      .catch(() => {
        // The statically generated list remains usable if the live catalog is unavailable.
      })

    return () => controller.abort()
  }, [collection.slug, section.slug])

  return (
    <PuzzleSectionProgress
      collection={collection}
      section={{ ...section, puzzles }}
    />
  )
}

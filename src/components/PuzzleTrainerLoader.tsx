import { useEffect, useMemo, useState } from 'react'
import type { Puzzle } from '../types/puzzles'
import PuzzleTrainer from './PuzzleTrainer'

type PuzzleSectionResponse = {
  collection?: { slug: string; title: string }
  section?: { slug: string; title: string }
  puzzles?: Puzzle[]
  error?: string
}

type Route = {
  collectionSlug: string
  sectionSlug: string
  puzzleId: string
}

const readRoute = (): Route | null => {
  const match = window.location.pathname.match(
    /^\/puzzles\/([^/]+)\/([^/]+)\/puzzle\/([^/]+)\/?$/,
  )
  if (!match) return null

  return {
    collectionSlug: decodeURIComponent(match[1]),
    sectionSlug: decodeURIComponent(match[2]),
    puzzleId: decodeURIComponent(match[3]),
  }
}

export default function PuzzleTrainerLoader() {
  const route = useMemo(readRoute, [])
  const [data, setData] = useState<PuzzleSectionResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!route) {
      setError('This puzzle URL is invalid.')
      return
    }

    const controller = new AbortController()
    const endpoint = `/api/puzzles/${encodeURIComponent(route.collectionSlug)}/${encodeURIComponent(route.sectionSlug)}`
    void fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as PuzzleSectionResponse
        if (!response.ok) throw new Error(payload.error ?? 'Could not load this puzzle.')
        if (!payload.collection || !payload.section || !payload.puzzles) {
          throw new Error('The puzzle response was incomplete.')
        }
        const initialPuzzle = payload.puzzles.find((puzzle) => puzzle.id === route.puzzleId)
        if (!initialPuzzle) {
          throw new Error('This puzzle was not found in that section.')
        }
        document.title = `${initialPuzzle.title} | ${payload.section.title} | ChessBadger`
        setData(payload)
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(caught instanceof Error ? caught.message : 'Could not load this puzzle.')
      })

    return () => controller.abort()
  }, [route])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-stone-950">Puzzle unavailable</h1>
        <p className="mt-3 text-stone-600">{error}</p>
        <a href="/puzzles" className="mt-6 inline-flex rounded-lg bg-amber-800 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700">
          Back to puzzles
        </a>
      </div>
    )
  }

  if (!data?.collection || !data.section || !data.puzzles || !route) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-stone-200 bg-white p-8 shadow-sm" aria-label="Loading puzzle">
        <div className="h-5 w-48 rounded bg-stone-200" />
        <div className="mt-5 h-10 w-72 max-w-full rounded bg-stone-200" />
        <div className="mt-8 aspect-square w-full max-w-xl rounded-xl bg-stone-200" />
      </div>
    )
  }

  return (
    <PuzzleTrainer
      puzzles={data.puzzles}
      collectionName={data.collection.title}
      collectionSlug={data.collection.slug}
      sectionName={data.section.title}
      sectionSlug={data.section.slug}
      initialPuzzleId={route.puzzleId}
    />
  )
}

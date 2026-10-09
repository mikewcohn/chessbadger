import type { PuzzleProgressStatus } from './puzzleProgress'

export type RetryStatus = Extract<PuzzleProgressStatus, 'missed' | 'retried'>
export type RetryScope = 'section' | 'collection'

export type RetryQueueEntry = {
  puzzleId: string
  sectionSlug: string
}

export type RetryQueue = {
  collectionSlug: string
  scope: RetryScope
  sectionSlug?: string
  statuses: RetryStatus[]
  entries: RetryQueueEntry[]
}

const RETRY_QUEUE_STORAGE_KEY = 'chessbadger.retryQueue.v1'

export function retrySearch(statuses: RetryStatus[], scope: RetryScope) {
  const params = new URLSearchParams({ retry: statuses.join(','), retryScope: scope })
  return `?${params.toString()}`
}

export function retryPuzzleHref(collectionSlug: string, entry: RetryQueueEntry, search = '') {
  return `/puzzles/${collectionSlug}/${entry.sectionSlug}/puzzle/${entry.puzzleId}${search}`
}

export function retryNeighbors(entries: RetryQueueEntry[], puzzleId: string) {
  const position = entries.findIndex((entry) => entry.puzzleId === puzzleId)
  return {
    position,
    previous: position > 0 ? entries[position - 1] : null,
    next: position >= 0 && position < entries.length - 1 ? entries[position + 1] : null,
  }
}

export function saveRetryQueue(queue: RetryQueue) {
  try {
    window.sessionStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // Retry mode still works within the current section when storage is unavailable.
  }
}

export function loadRetryQueue(collectionSlug: string, scope: RetryScope, sectionSlug?: string) {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(RETRY_QUEUE_STORAGE_KEY) ?? 'null') as Partial<RetryQueue> | null
    if (
      !saved
      || saved.collectionSlug !== collectionSlug
      || saved.scope !== scope
      || (scope === 'section' && saved.sectionSlug !== sectionSlug)
      || !Array.isArray(saved.statuses)
      || !Array.isArray(saved.entries)
    ) return null

    const statuses = saved.statuses.filter((status): status is RetryStatus => status === 'missed' || status === 'retried')
    const entries = saved.entries.filter((entry): entry is RetryQueueEntry => (
      typeof entry?.puzzleId === 'string' && typeof entry?.sectionSlug === 'string'
    ))
    return statuses.length > 0 && entries.length > 0
      ? { collectionSlug, scope, sectionSlug: saved.sectionSlug, statuses, entries }
      : null
  } catch {
    return null
  }
}

export type PuzzleNotes = Record<string, string>

const NOTES_STORAGE_KEY = 'chessbadger.puzzle-notes.v1'

export const getCachedPuzzleNotes = (): PuzzleNotes => {
  try {
    const saved = window.sessionStorage.getItem(NOTES_STORAGE_KEY)
    if (!saved) return {}
    const notes = JSON.parse(saved) as unknown
    if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return {}

    return Object.fromEntries(Object.entries(notes).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ))
  } catch {
    return {}
  }
}

export const cachePuzzleNote = (puzzleId: string, note: string) => {
  try {
    window.sessionStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      ...getCachedPuzzleNotes(),
      [puzzleId]: note,
    }))
  } catch {
    // Keep the note available in component state when browser storage is unavailable.
  }
}

export const removeCachedPuzzleNote = (puzzleId: string) => {
  try {
    const notes = getCachedPuzzleNotes()
    delete notes[puzzleId]
    window.sessionStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // The account copy is already saved when browser storage is unavailable.
  }
}


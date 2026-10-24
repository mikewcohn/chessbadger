import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { cachePuzzleNote, removeCachedPuzzleNote } from '../lib/puzzleNotes'

type PuzzleNoteFieldProps = {
  puzzleId: string
  note: string
  signedIn: boolean | null
  onChange: (note: string) => void
}

type NoteSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function PuzzleNoteField({ puzzleId, note, signedIn, onChange }: PuzzleNoteFieldProps) {
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>('idle')
  const [savedNote, setSavedNote] = useState(note)
  const lastEditedNote = useRef<string | null>(null)

  useEffect(() => {
    if (lastEditedNote.current === note) return
    setSavedNote(note)
  }, [note])

  const hasUnsavedChanges = lastEditedNote.current === note && note !== savedNote

  const updateNote = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextNote = event.currentTarget.value
    lastEditedNote.current = nextNote
    onChange(nextNote)
    cachePuzzleNote(puzzleId, nextNote)
    setSaveStatus('idle')
  }

  const saveNote = async () => {
    if (!hasUnsavedChanges) return

    if (!signedIn) {
      setSavedNote(note)
      setSaveStatus('saved')
      return
    }

    setSaveStatus('saving')
    try {
      const response = await fetch('/api/practice/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ puzzleId, note }),
      })
      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error ?? 'Could not save note.')
      }
      removeCachedPuzzleNote(puzzleId)
      setSavedNote(note)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  const statusCopy = saveStatus === 'saving'
    ? 'Saving…'
    : saveStatus === 'saved'
      ? signedIn ? 'Saved to your account.' : 'Saved in this browser session.'
      : saveStatus === 'error'
        ? 'Could not save this note. It remains in this browser session.'
        : signedIn === false
          ? 'This note will stay in this browser session.'
          : 'Include anything useful for reviewing this puzzle later.'

  return (
    <section className="mt-6 border-t border-stone-200 pt-5" aria-labelledby={`puzzle-note-heading-${puzzleId}`}>
      <h2 id={`puzzle-note-heading-${puzzleId}`} className="text-lg font-bold text-stone-950">Puzzle note</h2>
      <textarea
        value={note}
        onChange={updateNote}
        rows={3}
        maxLength={4096}
        placeholder="Example: +3 1. Bxc5 Nf3 0"
        aria-label="Puzzle note"
        className="mt-3 w-full resize-y rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-200"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-xs ${saveStatus === 'error' ? 'font-bold text-rose-800' : 'text-stone-500'}`} aria-live="polite">{statusCopy}</p>
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={!hasUnsavedChanges || saveStatus === 'saving'}
          className="cursor-pointer rounded-lg border border-amber-800 bg-white px-3.5 py-2 text-sm font-bold text-amber-900 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save note
        </button>
      </div>
    </section>
  )
}


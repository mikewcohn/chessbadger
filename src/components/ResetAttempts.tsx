import { useId, useState } from 'react'

type ResetRequest =
  | { scope: 'puzzle'; puzzleId: string }
  | { scope: 'section'; collectionSlug: string; sectionSlug: string }
  | { scope: 'collection'; collectionSlug: string; confirmation: 'RESET' }

type ResetAttemptsProps = {
  attemptCount: number
  disabled?: boolean
  request: ResetRequest
  scopeLabel: 'puzzle' | 'section' | 'book'
  onReset: () => void
}

export default function ResetAttempts({
  attemptCount,
  disabled = false,
  request,
  scopeLabel,
  onReset,
}: ResetAttemptsProps) {
  const headingId = useId()
  const confirmationId = useId()
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsTypedConfirmation = scopeLabel === 'book'
  const attemptLabel = `${attemptCount} ${attemptCount === 1 ? 'attempt' : 'attempts'}`

  const closeConfirmation = () => {
    setIsConfirming(false)
    setConfirmation('')
    setError(null)
  }

  const resetAttempts = async () => {
    setIsResetting(true)
    setError(null)

    try {
      const response = await fetch('/api/practice/attempts', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Could not reset attempts.')
      onReset()
      closeConfirmation()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not reset attempts.')
    } finally {
      setIsResetting(false)
    }
  }

  if (attemptCount === 0) return null

  return (
    <div className="border-t border-stone-200 pt-4">
      {!isConfirming ? (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          disabled={disabled}
          className="cursor-pointer text-sm font-bold text-rose-800 underline decoration-2 underline-offset-4 hover:text-rose-700 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          Reset this {scopeLabel}
        </button>
      ) : (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4" aria-labelledby={headingId}>
          <h3 id={headingId} className="font-bold text-rose-950">Reset this {scopeLabel}?</h3>
          <p className="mt-1 text-sm leading-relaxed text-rose-900">
            This permanently deletes your {attemptLabel} for this {scopeLabel}. This cannot be undone.
          </p>
          {needsTypedConfirmation ? (
            <label htmlFor={confirmationId} className="mt-3 block text-sm font-bold text-rose-950">
              Type RESET to confirm
              <input
                id={confirmationId}
                value={confirmation}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
                autoComplete="off"
                className="mt-1.5 block w-full max-w-xs rounded-lg border border-rose-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-rose-700 focus:ring-2 focus:ring-rose-200"
              />
            </label>
          ) : null}
          {error ? <p className="mt-3 text-sm font-bold text-rose-800" role="alert">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void resetAttempts()}
              disabled={isResetting || (needsTypedConfirmation && confirmation !== 'RESET')}
              className="cursor-pointer rounded-lg bg-rose-800 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
            >
              {isResetting ? 'Resetting…' : `Delete ${attemptLabel}`}
            </button>
            <button
              type="button"
              onClick={closeConfirmation}
              disabled={isResetting}
              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

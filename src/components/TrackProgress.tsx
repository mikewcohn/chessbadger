import { useEffect, useState, type SubmitEvent } from 'react'

type ProgressLinks = {
  version: 1
  name: string
  practiceUrl: string
  resultsUrl: string
}

const STORAGE_KEY = 'chessbadger.progress-links.v1'

const readSavedLinks = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return null

    const links = JSON.parse(saved) as Partial<ProgressLinks>
    if (
      links.version !== 1
      || typeof links.name !== 'string'
      || typeof links.practiceUrl !== 'string'
      || typeof links.resultsUrl !== 'string'
    ) return null

    return links as ProgressLinks
  } catch {
    return null
  }
}

type LinkCardProps = {
  description: string
  href: string
  label: string
  onCopy: (href: string, label: string) => void
  primary?: boolean
}

function LinkCard({ description, href, label, onCopy, primary = false }: LinkCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
      <h3 className="text-lg font-bold text-stone-950">{label}</h3>
      <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={href}
          className={primary
            ? 'rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700'
            : 'rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-900 hover:border-stone-500'}
        >
          {primary ? 'Start practicing' : 'Open results'}
        </a>
        <button
          type="button"
          onClick={() => onCopy(href, label)}
          className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-900 hover:border-stone-500"
        >
          Copy link
        </button>
      </div>
    </article>
  )
}

export default function TrackProgress() {
  const [name, setName] = useState('')
  const [links, setLinks] = useState<ProgressLinks | null>(null)
  const [ready, setReady] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    const savedLinks = readSavedLinks()
    setLinks(savedLinks)
    setShowCreateForm(!savedLinks)
    setReady(true)
  }, [])

  const createLinks = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/practice/registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json() as {
        name?: string
        practiceUrl?: string
        resultsUrl?: string
        error?: string
      }
      if (!response.ok || !data.name || !data.practiceUrl || !data.resultsUrl) {
        throw new Error(data.error ?? 'Could not create your private links.')
      }

      const nextLinks: ProgressLinks = {
        version: 1,
        name: data.name,
        practiceUrl: data.practiceUrl,
        resultsUrl: data.resultsUrl,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLinks))
      setLinks(nextLinks)
      setName('')
      setShowCreateForm(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your private links.')
    } finally {
      setCreating(false)
    }
  }

  const copyLink = async (href: string, label: string) => {
    try {
      await navigator.clipboard.writeText(href)
      setCopyStatus(`${label} copied.`)
    } catch {
      setCopyStatus('Copy failed. Open the link and copy it from the address bar.')
    }
  }

  if (!ready) {
    return <div className="h-80 animate-pulse rounded-3xl border border-stone-200 bg-white" aria-label="Loading saved progress" />
  }

  return (
    <div className="grid gap-6">
      {links && !showCreateForm ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.11em] text-amber-800">Saved in this browser</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-stone-950">Welcome back, {links.name}.</h2>
          <p className="mt-3 max-w-2xl leading-7 text-stone-600">
            Continue from your private practice link or share the read-only results link with your coach.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <LinkCard
              label="Your practice link"
              description="Bookmark this link and use it whenever you solve puzzles. It can record attempts."
              href={links.practiceUrl}
              onCopy={copyLink}
              primary
            />
            <LinkCard
              label="Coach results link"
              description="Share this read-only link with your coach. It cannot record puzzle attempts."
              href={links.resultsUrl}
              onCopy={copyLink}
            />
          </div>

          <p className="mt-4 min-h-6 text-sm font-bold text-emerald-800" aria-live="polite">{copyStatus}</p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="mt-2 cursor-pointer text-sm font-bold text-amber-900 underline decoration-amber-300 underline-offset-4 hover:text-amber-700"
          >
            Create a new set of links
          </button>
        </section>
      ) : (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-stone-950">Create your private links.</h2>
          <p className="mt-3 max-w-2xl leading-7 text-stone-600">
            No password or email is required. We’ll give you one link for practicing and another link your coach can use to view your results.
          </p>

          <form onSubmit={createLinks} className="mt-6 max-w-xl">
            <label htmlFor="progress-name" className="block text-sm font-bold text-stone-900">Your name</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="progress-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                placeholder="Enter your name"
                className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base text-stone-950 outline-none focus:border-amber-800 focus:ring-2 focus:ring-amber-200"
              />
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="cursor-pointer rounded-lg bg-amber-800 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Track My Progress'}
              </button>
            </div>
            {error ? <p className="mt-3 font-bold text-rose-800" role="alert">{error}</p> : null}
          </form>

          <div className="mt-7 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Bookmark your practice link.</strong> Because there is no login or email recovery, the link is the only reliable way to return to your progress from another browser or device.
          </div>

          {links ? (
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="mt-5 cursor-pointer text-sm font-bold text-amber-900 underline decoration-amber-300 underline-offset-4 hover:text-amber-700"
            >
              Keep my existing links
            </button>
          ) : null}
        </section>
      )}
    </div>
  )
}

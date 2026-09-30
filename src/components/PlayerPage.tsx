import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { playerProgressUrl } from '../lib/playerLinks'

type Player = { handle: string; slug: string }
type SectionProgress = {
  collectionSlug: string
  collectionTitle: string
  sectionSlug: string
  sectionTitle: string
  total: number
  attempted: number
  clean: number
  retried: number
  missed: number
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    let timeoutId: number | undefined
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error('Clipboard timed out.')), 1500)
        }),
      ])
      return true
    } catch {
      // Fall back for browsers that block the async Clipboard API.
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.readOnly = true
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = (document as unknown as { execCommand(commandId: string): boolean }).execCommand('copy')
  textarea.remove()
  activeElement?.focus()
  return copied
}

function AccountForm() {
  const [mode, setMode] = useState<'login' | 'claim'>('login')
  const [handle, setHandle] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch(`/api/players/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle, pin }),
      })
      const data = await response.json() as { player?: Player; error?: string }
      if (!response.ok || !data.player) throw new Error(data.error ?? 'Something went wrong.')
      window.location.assign(`/players/${data.player.slug}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex border-b border-stone-200" role="tablist" aria-label="Player access">
        {([['login', 'Sign in'], ['claim', 'Claim a name']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => { setMode(value); setError('') }}
            className={`flex-1 cursor-pointer px-5 py-4 text-sm font-bold transition ${mode === value ? 'border-b-2 border-amber-800 bg-amber-50 text-amber-950' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="grid gap-5 p-6 sm:p-8">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-950">
            {mode === 'login' ? 'Continue your progress' : 'Choose your player name'}
          </h2>
          <p className="mt-2 text-stone-600">
            {mode === 'login'
              ? 'Use the same name and private PIN on any device.'
              : 'Your progress page will be public. Your private PIN is only for signing in and adding results.'}
          </p>
        </div>
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Player name
          <input
            value={handle}
            onChange={(event) => setHandle(event.currentTarget.value)}
            autoComplete="username"
            required
            minLength={2}
            maxLength={24}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Private PIN or short passphrase
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.currentTarget.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={4}
            maxLength={64}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200"
          />
        </label>
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800" role="alert">{error}</p> : null}
        <button disabled={submitting} className="cursor-pointer rounded-lg bg-amber-800 px-5 py-3 font-bold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60">
          {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Claim this name'}
        </button>
        <p className="text-sm text-stone-500">
          {mode === 'claim'
            ? 'Share your progress link with a coach or friend—never your PIN. There is no email recovery yet.'
            : 'There is no email recovery yet. Ask the site owner if you forget your PIN.'}
        </p>
      </form>
    </section>
  )
}

function Profile({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<{ player: Player; sections: SectionProgress[] } | null>(null)
  const [viewer, setViewer] = useState<Player | null>(null)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      fetch(`/api/players/${encodeURIComponent(slug)}/progress`, { signal: controller.signal }),
      fetch('/api/players/me', { signal: controller.signal }),
    ]).then(async ([profileResponse, viewerResponse]) => {
      const profileData = await profileResponse.json() as { player?: Player; sections?: SectionProgress[]; error?: string }
      if (!profileResponse.ok || !profileData.player || !profileData.sections) throw new Error(profileData.error ?? 'Player not found.')
      const viewerData = await viewerResponse.json() as { player: Player | null }
      setProfile({ player: profileData.player, sections: profileData.sections })
      setViewer(viewerData.player)
      document.title = `${profileData.player.handle}'s puzzle progress | ChessBadger`
    }).catch((caught) => {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : 'Could not load this player.')
    })
    return () => controller.abort()
  }, [slug])

  const totals = useMemo(() => profile?.sections.reduce((total, section) => ({
    total: total.total + section.total,
    attempted: total.attempted + section.attempted,
    clean: total.clean + section.clean,
    retried: total.retried + section.retried,
    missed: total.missed + section.missed,
  }), { total: 0, attempted: 0, clean: 0, retried: 0, missed: 0 }), [profile])

  if (error) return <p className="rounded-2xl border border-rose-200 bg-white p-8 text-center font-bold text-rose-800">{error}</p>
  if (!profile || !totals) return <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">Loading player progress…</p>

  const isOwner = viewer?.slug === profile.player.slug
  const availableSections = profile.sections.filter((section) => section.total > 0)
  const copyProgressLink = async () => {
    setCopyStatus('Copying…')
    try {
      const copied = await copyText(playerProgressUrl(window.location.origin, profile.player.slug))
      if (!copied) throw new Error('Clipboard unavailable.')
      setCopyStatus('Link copied')
    } catch {
      setCopyStatus('Could not copy the link')
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Player progress</p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.025em] text-stone-950">{profile.player.handle}</h1>
            <p className="mt-2 text-stone-600">{totals.attempted} of {totals.total} puzzles attempted</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/puzzles" className="rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700">Do puzzles</a>
            <button type="button" onClick={() => void copyProgressLink()} className="cursor-pointer rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:border-stone-500">Copy progress link</button>
            {isOwner ? <button type="button" onClick={() => void fetch('/api/players/logout', { method: 'POST' }).then(() => window.location.assign('/players'))} className="cursor-pointer rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:border-stone-500">Sign out</button> : null}
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Anyone with this link can view {isOwner ? 'your' : `${profile.player.handle}'s`} progress. Only {isOwner ? 'you can' : `${profile.player.handle} can`} add results.
          <span className="ml-2 font-bold" aria-live="polite">{copyStatus}</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([[totals.attempted, 'Attempted', 'text-stone-950'], [totals.clean, 'First try', 'text-emerald-800'], [totals.retried, 'After retry', 'text-emerald-700'], [totals.missed, 'Not solved', 'text-rose-800']] as const).map(([value, label, color]) => (
            <div key={label} className="rounded-xl bg-stone-50 p-4"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-sm text-stone-500">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-5 sm:px-7"><h2 className="text-2xl font-bold text-stone-950">Sections</h2></div>
        <ol className="divide-y divide-stone-200">
          {availableSections.map((section) => (
            <li key={`${section.collectionSlug}/${section.sectionSlug}`}>
              <a href={`/puzzles/${section.collectionSlug}/${section.sectionSlug}`} className="grid gap-3 px-5 py-4 transition hover:bg-amber-50/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7">
                <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">{section.collectionTitle}</p><h3 className="mt-1 font-bold text-stone-950">{section.sectionTitle}</h3><p className="mt-1 text-sm text-stone-500">{section.attempted} of {section.total} attempted</p></div>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-stone-600"><span><strong className="text-emerald-800">{section.clean}</strong> first try</span><span><strong className="text-emerald-700">{section.retried}</strong> retried</span><span><strong className="text-rose-800">{section.missed}</strong> not solved</span></p>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function AccountLanding() {
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)

  useEffect(() => {
    void fetch('/api/players/me')
      .then((response) => response.json() as Promise<{ player: Player | null }>)
      .then((data) => setPlayer(data.player))
      .catch(() => setPlayer(null))
  }, [])

  if (player === undefined) {
    return <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">Loading player…</p>
  }
  return player ? <Profile slug={player.slug} /> : <AccountForm />
}

export default function PlayerPage() {
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    setSlug(decodeURIComponent(window.location.pathname.split('/').filter(Boolean)[1] ?? ''))
  }, [])

  if (slug === null) {
    return <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">Loading player…</p>
  }
  return slug ? <Profile slug={slug} /> : <AccountLanding />
}

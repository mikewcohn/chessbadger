import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { playerProgressUrl } from '../lib/playerLinks'
import {
  getTransferablePracticeAttempts,
  transferCachedPracticeAttempts,
} from '../lib/practiceClient'
import type {PracticeAttempt} from '../lib/puzzleProgress'
import {buildPlayerDashboardStats, formatPracticeTime} from '../lib/playerDashboard'

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
type TransferNotice = {type: 'success' | 'error'; message: string}

const sectionHref = (section: SectionProgress) => (
  `/puzzles/${section.collectionSlug}/${section.sectionSlug}`
)

function formatLastPractice(value: string | null) {
  if (!value) return 'No sessions yet'
  const date = new Date(value)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  if (dateKey === todayKey) return 'Today'

  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`
  if (dateKey === yesterdayKey) return 'Yesterday'
  return new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'}).format(date)
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
  const [cachedAttemptCount, setCachedAttemptCount] = useState(0)

  useEffect(() => {
    setCachedAttemptCount(getTransferablePracticeAttempts().length)
  }, [])

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
      const params = new URLSearchParams()
      if (cachedAttemptCount > 0) {
        try {
          const transferred = await transferCachedPracticeAttempts()
          params.set('transferred', String(transferred.imported + transferred.alreadySaved))
        } catch {
          params.set('transfer', 'error')
        }
      }
      const query = params.toString()
      window.location.assign(`/players/${data.player.slug}${query ? `?${query}` : ''}`)
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
              : 'Your progress page will be public. Your private passphrase is only for signing in and adding results.'}
          </p>
        </div>
        {cachedAttemptCount > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-bold">Keep this browser’s progress</p>
            <p className="mt-1">{cachedAttemptCount} {cachedAttemptCount === 1 ? 'attempt' : 'attempts'} will be added to this account after {mode === 'login' ? 'sign-in' : 'you claim the name'}.</p>
          </div>
        ) : null}
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
          {mode === 'login' ? 'Private PIN or passphrase' : 'Private passphrase'}
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.currentTarget.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'login' ? 4 : 8}
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
            ? 'Use at least 8 characters. Share your progress link with a coach or friend—never your passphrase. There is no email recovery yet.'
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
  const [ownerAttempts, setOwnerAttempts] = useState<PracticeAttempt[] | null>(null)
  const [transferNotice, setTransferNotice] = useState<TransferNotice | null>(null)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const loadProfile = async () => {
      const [profileResponse, viewerResponse] = await Promise.all([
        fetch(`/api/players/${encodeURIComponent(slug)}/progress`, { signal: controller.signal }),
        fetch('/api/players/me', { signal: controller.signal }),
      ])
      const profileData = await profileResponse.json() as { player?: Player; sections?: SectionProgress[]; error?: string }
      if (!profileResponse.ok || !profileData.player || !profileData.sections) throw new Error(profileData.error ?? 'Player not found.')
      const viewerData = await viewerResponse.json() as { player: Player | null }
      setProfile({ player: profileData.player, sections: profileData.sections })
      setViewer(viewerData.player)
      document.title = `${profileData.player.handle}'s puzzle progress | ChessBadger`

      if (viewerData.player?.slug === profileData.player.slug) {
        const attemptsResponse = await fetch('/api/practice/attempts', {signal: controller.signal})
        const attemptsData = await attemptsResponse.json() as {attempts?: PracticeAttempt[]; error?: string}
        if (!attemptsResponse.ok || !attemptsData.attempts) {
          throw new Error(attemptsData.error ?? 'Could not load recent practice activity.')
        }
        setOwnerAttempts(attemptsData.attempts)
      } else {
        setOwnerAttempts(null)
      }
    }

    void loadProfile().catch((caught) => {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : 'Could not load this player.')
    })
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const transferred = Number(params.get('transferred'))
    if (Number.isInteger(transferred) && transferred > 0) {
      setTransferNotice({
        type: 'success',
        message: `${transferred} browser ${transferred === 1 ? 'attempt was' : 'attempts were'} saved to this account.`,
      })
    } else if (params.get('transfer') === 'error' && getTransferablePracticeAttempts().length > 0) {
      setTransferNotice({
        type: 'error',
        message: 'Your account is ready, but browser progress still needs to be saved.',
      })
    }
    if (params.has('transferred') || params.has('transfer')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const totals = useMemo(() => profile?.sections.reduce((total, section) => ({
    total: total.total + section.total,
    attempted: total.attempted + section.attempted,
    clean: total.clean + section.clean,
    retried: total.retried + section.retried,
    missed: total.missed + section.missed,
  }), { total: 0, attempted: 0, clean: 0, retried: 0, missed: 0 }), [profile])

  const dashboardStats = useMemo(
    () => ownerAttempts ? buildPlayerDashboardStats(ownerAttempts) : null,
    [ownerAttempts],
  )

  if (error) return <p className="rounded-2xl border border-rose-200 bg-white p-8 text-center font-bold text-rose-800">{error}</p>
  if (!profile || !totals) return <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">Loading player progress…</p>

  const isOwner = viewer?.slug === profile.player.slug
  const availableSections = profile.sections.filter((section) => section.total > 0)
  const nextSection = availableSections.find((section) => section.missed > 0)
    ?? availableSections.find((section) => section.attempted < section.total)
    ?? availableSections[0]
  const reviewSection = availableSections.find((section) => section.missed > 0)
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
  const retryTransfer = async () => {
    setTransferring(true)
    try {
      const transferred = await transferCachedPracticeAttempts()
      const count = transferred.imported + transferred.alreadySaved
      window.location.assign(`/players/${profile.player.slug}${count > 0 ? `?transferred=${count}` : ''}`)
    } catch (caught) {
      setTransferNotice({
        type: 'error',
        message: caught instanceof Error ? caught.message : 'Browser progress could not be saved.',
      })
      setTransferring(false)
    }
  }

  return (
    <div className="grid gap-6">
      {transferNotice ? (
        <div
          className={`flex flex-col gap-3 rounded-2xl border px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between ${transferNotice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}
          role={transferNotice.type === 'error' ? 'alert' : 'status'}
        >
          <p className="font-bold">{transferNotice.message}</p>
          {transferNotice.type === 'error' ? (
            <button type="button" disabled={transferring} onClick={() => void retryTransfer()} className="w-fit cursor-pointer rounded-lg bg-amber-800 px-4 py-2 font-bold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60">
              {transferring ? 'Saving…' : 'Save browser progress'}
            </button>
          ) : null}
        </div>
      ) : null}
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
      {isOwner ? (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm" aria-labelledby="dashboard-heading">
          <div className="bg-amber-50 px-5 py-6 sm:px-7 sm:py-7">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Your next move</p>
            <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="dashboard-heading" className="text-2xl font-bold tracking-[-0.02em] text-stone-950 sm:text-3xl">
                  {totals.attempted === 0 ? 'Start your first practice session' : nextSection ? `Continue ${nextSection.sectionTitle}` : 'Choose a puzzle collection'}
                </h2>
                <p className="mt-2 max-w-2xl text-stone-600">
                  {totals.attempted === 0
                    ? 'Build momentum with a short set, then come back here to see your activity.'
                    : totals.missed > 0
                      ? `You have ${totals.missed} ${totals.missed === 1 ? 'puzzle' : 'puzzles'} ready to revisit.`
                      : 'Keep moving through your next unfinished section.'}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <a href={nextSection ? sectionHref(nextSection) : '/puzzles'} className="inline-flex items-center gap-2 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700">
                  {totals.attempted === 0 ? 'Start practicing' : 'Continue'}
                  <span aria-hidden="true">→</span>
                </a>
                {reviewSection ? (
                  <a href={`${sectionHref(reviewSection)}#attempt-details`} className="rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-950 hover:border-amber-500">
                    Review unsolved
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-stone-200 sm:grid-cols-4">
            {dashboardStats ? ([
              [dashboardStats.streak, 'Day streak'],
              [dashboardStats.solvedThisWeek, 'Solved in 7 days'],
              [formatPracticeTime(dashboardStats.activeTimeMs), 'Active time in 7 days'],
              [formatLastPractice(dashboardStats.lastPracticedAt), 'Last practiced'],
            ] as const).map(([value, label]) => (
              <div key={label} className="bg-white px-5 py-5 sm:px-6">
                <p className="text-2xl font-bold text-stone-950">{value}</p>
                <p className="mt-1 text-sm text-stone-500">{label}</p>
              </div>
            )) : (
              <p className="col-span-2 bg-white px-5 py-6 text-sm text-stone-500 sm:col-span-4">Loading recent practice activity…</p>
            )}
          </div>
        </section>
      ) : null}
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

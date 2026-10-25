import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import PgnViewer from './PgnViewer'
import PuzzleAnalysis from './PuzzleAnalysis'
import { BOARD_THEME_STORAGE_KEY, type BoardTheme } from '../lib/boardThemes'
import { isPieceTheme, PIECE_THEME_STORAGE_KEY, type PieceTheme } from '../lib/pieceThemes'
import { parsePgn, readPgnHeaders } from '../lib/pgn'

type Player = { handle: string; slug: string }
type Insight = {
  id: string
  title: string
  note: string
  pgn: string
  focusPly: number
  boardOrientation: 'white' | 'black'
  side: 'white' | 'black' | 'both'
  tags: string[]
  createdAt: string
  updatedAt: string
}

type InsightDraft = Omit<Insight, 'id' | 'createdAt' | 'updatedAt'>
type Route = { mode: 'library' | 'view' | 'new' | 'edit'; id?: string }

const readRoute = (): Route => {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'insights' || parts.length === 1) return { mode: 'library' }
  if (parts[1] === 'new') return { mode: 'new' }
  if (parts[2] === 'edit') return { mode: 'edit', id: decodeURIComponent(parts[1]) }
  return { mode: 'view', id: decodeURIComponent(parts[1]) }
}

const formatUpdated = (value: string) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', year: 'numeric',
}).format(new Date(value))

const formatPgnDate = (value?: string) => value && value !== '????.??.??'
  ? value.replace(/\./g, '–')
  : undefined

const sideLabel = (side: Insight['side']) => side === 'both'
  ? 'Both sides'
  : `${side === 'white' ? 'White' : 'Black'} insight`

function SignInRequired() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight text-stone-950">Your chess insights are private</h1>
      <p className="mx-auto mt-4 max-w-md text-lg leading-7 text-stone-600">
        Sign in with your ChessBadger player name to review or add insights from any device.
      </p>
      <a href="/players?return=/insights" className="mt-7 inline-flex rounded-lg bg-amber-800 px-5 py-3 font-bold text-white hover:bg-amber-700">
        Sign in to continue
      </a>
    </div>
  )
}

function InsightList({ insights, activeId }: { insights: Insight[]; activeId?: string }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return insights
    return insights.filter((insight) => [insight.title, insight.note, ...insight.tags]
      .some((value) => value.toLowerCase().includes(needle)))
  }, [insights, query])

  return (
    <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-950">My insights</h2>
          <p className="mt-1 text-sm text-stone-500">Private to your account</p>
        </div>
        <a href="/insights/new" className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-800 text-xl font-bold text-white hover:bg-amber-700" aria-label="Create insight">+</a>
      </div>
      <label className="mt-5 block">
        <span className="sr-only">Search insights</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search insights…"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200"
        />
      </label>
      <nav className="mt-3 grid max-h-[calc(100vh-15rem)] gap-1 overflow-y-auto" aria-label="Your insights">
        {filtered.map((insight) => (
          <a
            key={insight.id}
            href={`/insights/${encodeURIComponent(insight.id)}`}
            aria-current={activeId === insight.id ? 'page' : undefined}
            className={`rounded-lg border-l-4 px-3 py-3 transition ${activeId === insight.id ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:bg-stone-50'}`}
          >
            <span className="block font-bold leading-5 text-stone-950">{insight.title}</span>
            <span className="mt-1 block text-sm text-stone-500">Updated {formatUpdated(insight.updatedAt)}</span>
          </a>
        ))}
        {filtered.length === 0 ? <p className="px-3 py-5 text-sm text-stone-500">No insights match that search.</p> : null}
      </nav>
    </aside>
  )
}

function Metadata({ insight }: { insight: Insight }) {
  const headers = readPgnHeaders(insight.pgn)
  const items = [
    ['White', headers.white],
    ['Black', headers.black],
    ['Event', headers.event],
    ['Date', formatPgnDate(headers.date)],
    ['Result', headers.result],
  ].filter((item): item is [string, string] => Boolean(item[1]))

  if (items.length === 0) return null
  return (
    <dl className="mt-7 grid overflow-hidden rounded-xl border border-stone-200 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="border-b border-stone-200 px-4 py-3 last:border-b-0 sm:border-r xl:border-b-0">
          <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</dt>
          <dd className="mt-1 font-bold leading-5 text-stone-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function InsightReader({ insight, onDelete }: { insight: Insight; onDelete: () => Promise<void> }) {
  const [analysisFen, setAnalysisFen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('green')
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>('default')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    try {
      const savedBoard = window.localStorage.getItem(BOARD_THEME_STORAGE_KEY)
      if (savedBoard === 'green' || savedBoard === 'blue' || savedBoard === 'wood' || savedBoard === 'plain') setBoardTheme(savedBoard)
      const savedPieces = window.localStorage.getItem(PIECE_THEME_STORAGE_KEY)
      if (isPieceTheme(savedPieces)) setPieceTheme(savedPieces)
    } catch {
      // The defaults remain usable when storage is unavailable.
    }
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  if (analysisFen) {
    return (
      <PuzzleAnalysis
        initialFen={analysisFen}
        puzzleTitle={insight.title}
        collectionName="Insights"
        sectionName="Private study"
        boardTheme={boardTheme}
        pieceTheme={pieceTheme}
        boardOrientation={insight.boardOrientation}
        prefersReducedMotion={prefersReducedMotion}
        onExit={() => setAnalysisFen(null)}
        sourceLabel="Private insight"
        analysisDescription="Try a different move from this position. Your exploration stays temporary and does not change the saved game or insight."
      />
    )
  }

  const deleteInsight = async () => {
    if (!window.confirm(`Delete “${insight.title}”? This cannot be undone.`)) return
    setDeleting(true)
    await onDelete().catch(() => setDeleting(false))
  }

  return (
    <article className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-500">Private · {sideLabel(insight.side)}</p>
          <h1 className="mt-2 break-words text-3xl font-bold leading-tight tracking-tight text-stone-950 sm:text-5xl">{insight.title}</h1>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href={`/insights/${encodeURIComponent(insight.id)}/edit`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:border-amber-700 hover:text-amber-900">Edit</a>
          <button type="button" disabled={deleting} onClick={() => void deleteInsight()} className="cursor-pointer rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-600 hover:border-rose-400 hover:text-rose-800 disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
      {insight.note ? <div className="mt-6 whitespace-pre-wrap text-lg leading-8 text-stone-700">{insight.note}</div> : null}
      {insight.tags.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
          {insight.tags.map((tag) => <li key={tag} className="rounded-md bg-[#eef6ff] px-3 py-1 text-sm font-bold text-stone-700">{tag}</li>)}
        </ul>
      ) : null}
      <Metadata insight={insight} />
      <div className="mt-7">
        <PgnViewer
          pgn={insight.pgn}
          initialPly={insight.focusPly}
          initialOrientation={insight.boardOrientation}
          onExplore={setAnalysisFen}
        />
      </div>
    </article>
  )
}

function InsightEditor({ insight }: { insight?: Insight }) {
  const [title, setTitle] = useState(insight?.title ?? '')
  const [note, setNote] = useState(insight?.note ?? '')
  const [pgn, setPgn] = useState(insight?.pgn ?? '')
  const [focusPly, setFocusPly] = useState(insight?.focusPly ?? 0)
  const [orientation, setOrientation] = useState<'white' | 'black'>(insight?.boardOrientation ?? 'white')
  const [side, setSide] = useState<Insight['side']>(insight?.side ?? 'both')
  const [tags, setTags] = useState(insight?.tags.join(', ') ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const parsed = useMemo(() => parsePgn(pgn), [pgn])
  const headers = useMemo(() => readPgnHeaders(pgn), [pgn])
  const focusMove = focusPly > 0 ? parsed.mainline.moves[focusPly - 1] : null

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (parsed.error) { setError(`Fix the PGN before saving: ${parsed.error}`); return }
    setSaving(true)
    const body: InsightDraft = {
      title,
      note,
      pgn,
      focusPly: Math.min(focusPly, parsed.mainline.moves.length),
      boardOrientation: orientation,
      side,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    }

    try {
      const response = await fetch(insight ? `/api/insights/${encodeURIComponent(insight.id)}` : '/api/insights', {
        method: insight ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json() as { insight?: Insight; error?: string }
      if (!response.ok || !data.insight) throw new Error(data.error ?? 'Could not save this insight.')
      window.location.assign(`/insights/${encodeURIComponent(data.insight.id)}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this insight.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">{insight ? 'Edit insight' : 'Create insight'}</h1>
          <p className="mt-2 text-stone-600">Paste a PGN, choose the important position, and record the lesson.</p>
        </div>
        <p className="text-sm font-bold text-stone-500">Saved privately to your account</p>
      </div>

      <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(300px,0.72fr)_minmax(560px,1.28fr)]">
        <div className="grid content-start gap-5">
          <label className="grid gap-2 text-sm font-bold text-stone-800">Title
            <input required maxLength={160} value={title} onChange={(event) => setTitle(event.currentTarget.value)} className="rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-800">Insight note
            <textarea rows={6} maxLength={12000} value={note} onChange={(event) => setNote(event.currentTarget.value)} className="resize-y rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal leading-7 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-800">Tags
            <input value={tags} onChange={(event) => setTags(event.currentTarget.value)} placeholder="hanging pieces, calculation" className="rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200" />
            <span className="font-normal text-stone-500">Separate tags with commas.</span>
          </label>
          <fieldset>
            <legend className="text-sm font-bold text-stone-800">Side</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {([['white', 'White'], ['black', 'Black'], ['both', 'Both']] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm font-semibold text-stone-700"><input type="radio" name="side" checked={side === value} onChange={() => setSide(value)} />{label}</label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm font-bold text-stone-800">PGN
            <textarea required rows={16} maxLength={100000} value={pgn} onChange={(event) => { setPgn(event.currentTarget.value); setFocusPly(0) }} spellCheck={false} className="resize-y rounded-lg border border-stone-300 px-3 py-2.5 font-mono text-sm font-normal leading-6 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-200" />
          </label>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-950">Game and focus position</h2>
              <p className="mt-1 text-sm text-stone-600">Step through the main line and stop at the position this insight is about.</p>
            </div>
            <label className="grid shrink-0 gap-1 text-sm font-bold text-stone-700">Board orientation
              <select value={orientation} onChange={(event) => setOrientation(event.currentTarget.value as 'white' | 'black')} className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold">
                <option value="white">White at bottom</option>
                <option value="black">Black at bottom</option>
              </select>
            </label>
          </div>

          {pgn && !parsed.error ? (
            <>
              <div className="mt-5 rounded-xl bg-[#eef6ff] p-4 text-sm text-stone-700">
                <p className="font-bold text-stone-950">{headers.white || 'White'} vs. {headers.black || 'Black'}{headers.result ? ` · ${headers.result}` : ''}</p>
                <p className="mt-1">Focus: {focusMove ? `${focusMove.moveNumber}${focusMove.color === 'b' ? '…' : '.'} ${focusMove.san}` : 'Starting position'} · {parsed.mainline.moves.length} plies</p>
              </div>
              <div className="mt-5">
                <PgnViewer pgn={pgn} initialPly={focusPly} initialOrientation={orientation} onMainlinePlyChange={(ply) => setFocusPly(ply)} />
              </div>
            </>
          ) : (
            <div className={`mt-5 rounded-xl border p-6 ${pgn ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-stone-200 bg-stone-50 text-stone-600'}`}>
              {pgn ? `PGN error: ${parsed.error}` : 'Paste a PGN to preview the game and choose a focus position.'}
            </div>
          )}
        </div>
      </div>

      {error ? <p className="mt-6 rounded-lg bg-rose-50 px-4 py-3 font-bold text-rose-800" role="alert">{error}</p> : null}
      <div className="mt-8 flex justify-end gap-3 border-t border-stone-200 pt-6">
        <a href={insight ? `/insights/${encodeURIComponent(insight.id)}` : '/insights'} className="rounded-lg border border-stone-300 px-5 py-2.5 font-bold text-stone-700 hover:border-stone-500">Cancel</a>
        <button disabled={saving} className="cursor-pointer rounded-lg bg-amber-800 px-5 py-2.5 font-bold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Save insight'}</button>
      </div>
    </form>
  )
}

export default function InsightApp() {
  const route = useMemo(readRoute, [])
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      fetch('/api/players/me', { signal: controller.signal }),
      fetch('/api/insights', { signal: controller.signal }),
    ]).then(async ([playerResponse, insightsResponse]) => {
      const playerData = await playerResponse.json() as { player: Player | null }
      setPlayer(playerData.player)
      if (insightsResponse.status === 401) { setInsights([]); return }
      const insightData = await insightsResponse.json() as { insights?: Insight[]; error?: string }
      if (!insightsResponse.ok || !insightData.insights) throw new Error(insightData.error ?? 'Could not load your insights.')
      setInsights(insightData.insights)
    }).catch((caught) => {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : 'Could not load your insights.')
    })
    return () => controller.abort()
  }, [])

  if (error) return <p className="rounded-2xl border border-rose-200 bg-white p-8 text-center font-bold text-rose-800">{error}</p>
  if (player === undefined || insights === null) return <div className="min-h-96 animate-pulse rounded-2xl border border-stone-200 bg-white shadow-sm" aria-label="Loading insights" />
  if (!player) return <SignInRequired />

  const selected = route.id ? insights.find((insight) => insight.id === route.id) : insights[0]
  if (route.mode === 'new') return <InsightEditor />
  if (route.mode === 'edit') return selected ? <InsightEditor insight={selected} /> : <p className="rounded-2xl bg-white p-8 text-center font-bold">Insight not found.</p>

  const removeSelected = async () => {
    if (!selected) return
    const response = await fetch(`/api/insights/${encodeURIComponent(selected.id)}`, { method: 'DELETE' })
    const data = await response.json() as { deleted?: boolean; error?: string }
    if (!response.ok || !data.deleted) throw new Error(data.error ?? 'Could not delete this insight.')
    window.location.assign('/insights')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <InsightList insights={insights} activeId={selected?.id} />
      {selected ? (
        <InsightReader insight={selected} onDelete={removeSelected} />
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Capture your first chess insight</h1>
          <p className="mx-auto mt-3 max-w-lg text-lg text-stone-600">Save the lesson, the full game, and the exact position you want to remember.</p>
          <a href="/insights/new" className="mt-7 inline-flex rounded-lg bg-amber-800 px-5 py-3 font-bold text-white hover:bg-amber-700">Create an insight</a>
        </div>
      )}
    </div>
  )
}

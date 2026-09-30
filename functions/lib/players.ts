import { json, readJson, type FunctionContext, type PracticeEnv } from './practice.ts'

const SESSION_COOKIE = 'cb_session'
const SESSION_SECONDS = 60 * 60 * 24 * 30
const PIN_ITERATIONS = 100_000

type PlayerRow = { id: string; handle: string; normalized_handle: string }
export type Player = { id: string; handle: string; slug: string }
type CredentialsBody = { handle?: string; pin?: string }

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

const randomHex = (length: number) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(digest))
}

const pinHash = async (pin: string, salt: string) => {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: new TextEncoder().encode(salt),
    iterations: PIN_ITERATIONS,
  }, material, 256)
  return bytesToHex(new Uint8Array(bits))
}

const equalHash = (left: string, right: string) => {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

export const normalizeHandle = (value: unknown) => {
  if (typeof value !== 'string') return null
  const handle = value.trim().replace(/\s+/g, ' ')
  if (handle.length < 2 || handle.length > 24 || !/^[a-z0-9]+(?:[ -][a-z0-9]+)*$/i.test(handle)) return null
  return { handle, slug: handle.toLowerCase().replace(/[ -]+/g, '-') }
}

const validPin = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 4 && value.length <= 64

const publicPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  handle: row.handle,
  slug: row.normalized_handle,
})

export const playerJson = (player: Player) => ({ handle: player.handle, slug: player.slug })

const cookieValue = (request: Request, token: string, maxAge = SESSION_SECONDS) => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

const readCookie = (request: Request) => {
  const prefix = `${SESSION_COOKIE}=`
  return request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(prefix))?.slice(prefix.length) ?? null
}

export const createSession = async (env: PracticeEnv, request: Request, playerId: string) => {
  const token = randomHex(32)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000)
  await env.DB.prepare(`
    INSERT INTO player_sessions (token_hash, player_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(await sha256(token), playerId, now.toISOString(), expiresAt.toISOString()).run()
  return cookieValue(request, token)
}

export const currentPlayer = async (env: PracticeEnv, request: Request): Promise<Player | null> => {
  const token = readCookie(request)
  if (!token) return null
  const row = await env.DB.prepare(`
    SELECT players.id, players.handle, players.normalized_handle
    FROM player_sessions
    JOIN players ON players.id = player_sessions.player_id
    WHERE player_sessions.token_hash = ? AND player_sessions.expires_at > ?
  `).bind(await sha256(token), new Date().toISOString()).first<PlayerRow>()
  return row ? publicPlayer(row) : null
}

export const clearSession = async (env: PracticeEnv, request: Request) => {
  const token = readCookie(request)
  if (token) await env.DB.prepare('DELETE FROM player_sessions WHERE token_hash = ?').bind(await sha256(token)).run()
  return cookieValue(request, '', 0)
}

export const readCredentials = async (request: Request) => {
  const body = await readJson<CredentialsBody>(request)
  const normalized = normalizeHandle(body?.handle)
  if (!normalized || !validPin(body?.pin)) return null
  return { ...normalized, pin: body.pin }
}

export const createPlayer = async (
  env: PracticeEnv,
  credentials: NonNullable<Awaited<ReturnType<typeof readCredentials>>>,
) => {
  const id = crypto.randomUUID()
  const salt = randomHex(16)
  await env.DB.prepare(`
    INSERT INTO players (id, handle, normalized_handle, pin_salt, pin_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, credentials.handle, credentials.slug, salt, await pinHash(credentials.pin, salt), new Date().toISOString()).run()
  return { id, handle: credentials.handle, slug: credentials.slug }
}

export const authenticatePlayer = async (
  env: PracticeEnv,
  credentials: NonNullable<Awaited<ReturnType<typeof readCredentials>>>,
) => {
  const row = await env.DB.prepare(`
    SELECT id, handle, normalized_handle, pin_salt, pin_hash
    FROM players WHERE normalized_handle = ?
  `).bind(credentials.slug).first<PlayerRow & { pin_salt: string; pin_hash: string }>()
  if (!row || !equalHash(await pinHash(credentials.pin, row.pin_salt), row.pin_hash)) return null
  return publicPlayer(row)
}

export type PlayerFunctionContext = FunctionContext
export const invalidCredentials = () =>
  json({ error: 'Use a name of 2–24 letters or numbers and a PIN of at least 4 characters.' }, 400)

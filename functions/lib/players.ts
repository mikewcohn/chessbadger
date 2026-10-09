import { json, readJson, type FunctionContext, type PracticeEnv } from './practice.ts'

const SESSION_COOKIE = 'cb_session'
const SESSION_SECONDS = 60 * 60 * 24 * 30
const PIN_ITERATIONS = 100_000
const LOGIN_WINDOW_SECONDS = 15 * 60
const LOGIN_PLAYER_LIMIT = 5
const LOGIN_CLIENT_LIMIT = 25
const CLAIM_WINDOW_SECONDS = 60 * 60
const CLAIM_CLIENT_LIMIT = 5

type PlayerRow = { id: string; handle: string; normalized_handle: string }
export type Player = { id: string; handle: string; slug: string }
type CredentialsBody = { handle?: string; pin?: string }
type RateLimitRow = { attempt_count: number; window_started_at: number }
type RateLimitRule = { scope: string; key: string; limit: number; windowSeconds: number }

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

const validPin = (value: unknown, minimumLength: number): value is string =>
  typeof value === 'string' && value.length >= minimumLength && value.length <= 64

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

export const readCredentials = async (request: Request, minimumPinLength = 4) => {
  const body = await readJson<CredentialsBody>(request)
  const normalized = normalizeHandle(body?.handle)
  if (!normalized || !validPin(body?.pin, minimumPinLength)) return null
  return { ...normalized, pin: body.pin }
}

const clientKey = (request: Request) => request.headers.get('cf-connecting-ip')?.trim() || 'unknown'

const rateLimitKey = (rule: RateLimitRule) => sha256(`${rule.scope}\0${rule.key}`)

const retryAfter = (row: RateLimitRow, windowSeconds: number, now: number) =>
  Math.max(1, row.window_started_at + windowSeconds - now)

const blockedBy = async (env: PracticeEnv, rules: RateLimitRule[]) => {
  const now = Math.floor(Date.now() / 1000)
  let waitSeconds = 0
  for (const rule of rules) {
    const row = await env.DB.prepare(`
      SELECT attempt_count, window_started_at
      FROM auth_rate_limits
      WHERE scope = ? AND key_hash = ?
    `).bind(rule.scope, await rateLimitKey(rule)).first<RateLimitRow>()
    if (row && row.attempt_count >= rule.limit && now - row.window_started_at < rule.windowSeconds) {
      waitSeconds = Math.max(waitSeconds, retryAfter(row, rule.windowSeconds, now))
    }
  }
  return waitSeconds
}

const recordAttempt = async (env: PracticeEnv, rule: RateLimitRule) => {
  const now = Math.floor(Date.now() / 1000)
  const cutoff = now - rule.windowSeconds
  await env.DB.prepare(`
    INSERT INTO auth_rate_limits (scope, key_hash, window_started_at, attempt_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT (scope, key_hash) DO UPDATE SET
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at <= ? THEN excluded.window_started_at
        ELSE auth_rate_limits.window_started_at
      END,
      attempt_count = CASE
        WHEN auth_rate_limits.window_started_at <= ? THEN 1
        ELSE auth_rate_limits.attempt_count + 1
      END
  `).bind(rule.scope, await rateLimitKey(rule), now, cutoff, cutoff).run()
}

const clearAttempt = async (env: PracticeEnv, rule: RateLimitRule) => {
  await env.DB.prepare('DELETE FROM auth_rate_limits WHERE scope = ? AND key_hash = ?')
    .bind(rule.scope, await rateLimitKey(rule)).run()
}

const loginRules = (request: Request, playerSlug: string): RateLimitRule[] => {
  const client = clientKey(request)
  return [
    { scope: 'login-player-client', key: `${playerSlug}\0${client}`, limit: LOGIN_PLAYER_LIMIT, windowSeconds: LOGIN_WINDOW_SECONDS },
    { scope: 'login-client', key: client, limit: LOGIN_CLIENT_LIMIT, windowSeconds: LOGIN_WINDOW_SECONDS },
  ]
}

export const loginRetryAfter = (env: PracticeEnv, request: Request, playerSlug: string) =>
  blockedBy(env, loginRules(request, playerSlug))

export const recordFailedLogin = async (env: PracticeEnv, request: Request, playerSlug: string) => {
  for (const rule of loginRules(request, playerSlug)) await recordAttempt(env, rule)
}

export const clearFailedLogin = (env: PracticeEnv, request: Request, playerSlug: string) =>
  clearAttempt(env, loginRules(request, playerSlug)[0])

export const consumeClaimAttempt = async (env: PracticeEnv, request: Request) => {
  const rule: RateLimitRule = {
    scope: 'claim-client',
    key: clientKey(request),
    limit: CLAIM_CLIENT_LIMIT,
    windowSeconds: CLAIM_WINDOW_SECONDS,
  }
  const waitSeconds = await blockedBy(env, [rule])
  if (waitSeconds) return waitSeconds
  await recordAttempt(env, rule)
  return 0
}

export const tooManyAttempts = (retryAfterSeconds: number) => {
  const response = json({ error: 'Too many attempts. Please wait and try again.' }, 429)
  response.headers.set('retry-after', String(retryAfterSeconds))
  return response
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
export const invalidCredentials = (minimumPinLength = 4) =>
  json({ error: `Use a name of 2–24 letters or numbers and a private passphrase of at least ${minimumPinLength} characters.` }, 400)

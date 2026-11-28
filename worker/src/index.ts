export interface Env {
  DB: D1Database
  ALLOWED_ORIGINS?: string
  TTL_DAYS?: string
  IP_DAILY_LIMIT?: string
  MAX_PAYLOAD_BYTES?: string
  GLOBAL_DAILY_REQUESTS_LIMIT?: string
  GLOBAL_DAILY_WRITES_LIMIT?: string
  GLOBAL_DAILY_READS_LIMIT?: string
  MAX_DB_BYTES?: string
}

interface ShareRow {
  id: string
  hash: string
  payload: string
  size: number
  renew_token_hash: string
  created_at: number
  expires_at: number
}

interface GlobalUsageRow {
  day: string
  requests: number
  writes: number
  reads: number
}

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const CV_KEYS = ['cv', 'coverLetter', 'name', 'experiences', 'skills', 'sectionsOrder']
const ID_RE = /^[0-9A-Za-z]{6,16}$/
const MAX_JSON_BYTES = 512 * 1024

function numEnv(val: string | undefined, fallback: number): number {
  const n = Number(val)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

function randomBase62(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i]! % BASE62.length]
  }
  return out
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(b64 + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Decompresses a raw-deflate base64url payload and verifies it is a valid CV JSON object. */
async function validateCompressedCvPayload(payload: string): Promise<boolean> {
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) return false
  try {
    const bytes = b64urlToBytes(payload)
    const stream = new Response(bytes as BodyInit).body!.pipeThrough(new DecompressionStream('deflate-raw'))
    const decompressed = new Uint8Array(await new Response(stream).arrayBuffer())
    if (decompressed.byteLength === 0 || decompressed.byteLength > MAX_JSON_BYTES) return false
    const parsed = JSON.parse(new TextDecoder().decode(decompressed)) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    return CV_KEYS.some((k) => k in (parsed as Record<string, unknown>))
  } catch {
    return false
  }
}

function resolveCorsOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (allowed.includes(origin)) return origin
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin
  return null
}

function jsonResponse(data: unknown, status: number, corsOrigin: string | null): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  }
  if (corsOrigin) {
    headers['Access-Control-Allow-Origin'] = corsOrigin
    headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Renew-Token'
    headers['Vary'] = 'Origin'
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers })
}

/** Checks and increments global daily usage against 40% of Cloudflare Free Tier limits. */
async function checkAndTrackGlobalUsage(
  env: Env,
  day: string,
  addReads: number,
  addWrites: number,
): Promise<boolean> {
  const reqLimit = numEnv(env.GLOBAL_DAILY_REQUESTS_LIMIT, 40_000)
  const writeLimit = numEnv(env.GLOBAL_DAILY_WRITES_LIMIT, 40_000)
  const readLimit = numEnv(env.GLOBAL_DAILY_READS_LIMIT, 2_000_000)

  const row = await env.DB.prepare('SELECT requests, writes, reads FROM global_daily_usage WHERE day = ?')
    .bind(day)
    .first<GlobalUsageRow>()

  if (row) {
    if (row.requests + 1 > reqLimit || row.writes + addWrites > writeLimit || row.reads + addReads > readLimit) {
      return false
    }
  }

  await env.DB.prepare(
    `INSERT INTO global_daily_usage (day, requests, writes, reads)
     VALUES (?, 1, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       requests = requests + 1,
       writes = writes + excluded.writes,
       reads = reads + excluded.reads`,
  )
    .bind(day, addWrites, addReads)
    .run()

  return true
}

/** Enforces per-IP daily share creation/renewal cap (default 100/day). */
async function consumeIpDailyQuota(env: Env, ipHash: string, day: string): Promise<boolean> {
  const limit = numEnv(env.IP_DAILY_LIMIT, 100)
  const existing = await env.DB.prepare('SELECT count FROM ip_daily_usage WHERE ip_hash = ? AND day = ?')
    .bind(ipHash, day)
    .first<{ count: number }>()

  if (existing && existing.count >= limit) {
    return false
  }

  await env.DB.prepare(
    `INSERT INTO ip_daily_usage (ip_hash, day, count)
     VALUES (?, ?, 1)
     ON CONFLICT(ip_hash, day) DO UPDATE SET count = count + 1`,
  )
    .bind(ipHash, day)
    .run()

  return true
}

/** Removes expired shares and stale daily counters. */
async function purgeExpired(env: Env, now = Date.now()): Promise<void> {
  const cutoffDay = utcDay(now - 2 * 86_400_000)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM shares WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM ip_daily_usage WHERE day < ?').bind(cutoffDay),
    env.DB.prepare('DELETE FROM global_daily_usage WHERE day < ?').bind(cutoffDay),
  ])
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsOrigin = resolveCorsOrigin(request, env)
    if (request.method === 'OPTIONS') {
      return jsonResponse({ ok: true }, 204, corsOrigin)
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (request.method === 'GET' && path === '/api/health') {
      return jsonResponse({ ok: true }, 200, corsOrigin)
    }

    const now = Date.now()
    const day = utcDay(now)
    const ttlMs = numEnv(env.TTL_DAYS, 3) * 86_400_000
    const maxPayloadBytes = numEnv(env.MAX_PAYLOAD_BYTES, 65_536)
    const maxDbBytes = numEnv(env.MAX_DB_BYTES, 209_715_200)

    // GET /api/shares/:id
    const getMatch = path.match(/^\/api\/shares\/([0-9A-Za-z]+)$/)
    if (request.method === 'GET' && getMatch) {
      const id = getMatch[1]!
      if (!ID_RE.test(id)) return jsonResponse({ error: 'invalid_id' }, 400, corsOrigin)

      const withinGlobal = await checkAndTrackGlobalUsage(env, day, 2, 1)
      if (!withinGlobal) return jsonResponse({ error: 'global_limit_reached' }, 503, corsOrigin)

      const row = await env.DB.prepare('SELECT id, payload, expires_at FROM shares WHERE id = ?')
        .bind(id)
        .first<Pick<ShareRow, 'id' | 'payload' | 'expires_at'>>()

      if (!row) return jsonResponse({ error: 'not_found' }, 404, corsOrigin)
      if (row.expires_at <= now) {
        await env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(id).run()
        return jsonResponse({ error: 'expired' }, 404, corsOrigin)
      }

      return jsonResponse({ id: row.id, payload: row.payload, expiresAt: row.expires_at }, 200, corsOrigin)
    }

    // POST /api/shares
    if (request.method === 'POST' && path === '/api/shares') {
      const contentLength = Number(request.headers.get('Content-Length') || '0')
      if (contentLength > maxPayloadBytes + 1024) {
        return jsonResponse({ error: 'payload_too_large' }, 413, corsOrigin)
      }

      const rawBody = await request.text()
      const bodyBytes = new TextEncoder().encode(rawBody).byteLength
      if (bodyBytes > maxPayloadBytes + 1024) {
        return jsonResponse({ error: 'payload_too_large' }, 413, corsOrigin)
      }

      let body: { payload?: unknown }
      try {
        body = JSON.parse(rawBody) as { payload?: unknown }
      } catch {
        return jsonResponse({ error: 'invalid_json' }, 400, corsOrigin)
      }

      if (typeof body.payload !== 'string') {
        return jsonResponse({ error: 'missing_payload' }, 400, corsOrigin)
      }
      const payload = body.payload.trim()
      const payloadBytes = new TextEncoder().encode(payload).byteLength
      if (payloadBytes === 0 || payloadBytes > maxPayloadBytes) {
        return jsonResponse({ error: 'payload_too_large' }, 413, corsOrigin)
      }

      const isValid = await validateCompressedCvPayload(payload)
      if (!isValid) {
        return jsonResponse({ error: 'invalid_cv_payload' }, 400, corsOrigin)
      }

      const withinGlobal = await checkAndTrackGlobalUsage(env, day, 5, 5)
      if (!withinGlobal) return jsonResponse({ error: 'global_limit_reached' }, 503, corsOrigin)

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
      const ipHash = await sha256Hex(`${day}:${clientIp}`)
      const withinIpLimit = await consumeIpDailyQuota(env, ipHash, day)
      if (!withinIpLimit) {
        return jsonResponse({ error: 'ip_daily_limit_reached' }, 429, corsOrigin)
      }

      // Opportunistically clean expired rows before checking storage cap.
      await env.DB.prepare('DELETE FROM shares WHERE expires_at <= ?').bind(now).run()

      const hash = await sha256Hex(payload)
      const existing = await env.DB.prepare('SELECT id, expires_at FROM shares WHERE hash = ?')
        .bind(hash)
        .first<Pick<ShareRow, 'id' | 'expires_at'>>()

      if (existing && existing.expires_at > now) {
        return jsonResponse(
          { id: existing.id, expiresAt: existing.expires_at, deduplicated: true },
          200,
          corsOrigin,
        )
      }

      const usage = await env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS total_bytes FROM shares').first<{
        total_bytes: number
      }>()
      if ((usage?.total_bytes ?? 0) + payloadBytes > maxDbBytes) {
        return jsonResponse({ error: 'storage_limit_reached' }, 507, corsOrigin)
      }

      const id = randomBase62(8)
      const renewToken = randomBase62(24)
      const renewTokenHash = await sha256Hex(renewToken)
      const expiresAt = now + ttlMs

      await env.DB.prepare(
        `INSERT INTO shares (id, hash, payload, size, renew_token_hash, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, hash, payload, payloadBytes, renewTokenHash, now, expiresAt)
        .run()

      return jsonResponse({ id, expiresAt, renewToken, deduplicated: false }, 201, corsOrigin)
    }

    // POST /api/shares/:id/renew
    const renewMatch = path.match(/^\/api\/shares\/([0-9A-Za-z]+)\/renew$/)
    if (request.method === 'POST' && renewMatch) {
      const id = renewMatch[1]!
      if (!ID_RE.test(id)) return jsonResponse({ error: 'invalid_id' }, 400, corsOrigin)

      let token = request.headers.get('X-Renew-Token') || ''
      if (!token) {
        try {
          const body = (await request.json()) as { renewToken?: string }
          token = body.renewToken || ''
        } catch {
          /* ignore */
        }
      }
      if (!token) return jsonResponse({ error: 'missing_renew_token' }, 401, corsOrigin)

      const withinGlobal = await checkAndTrackGlobalUsage(env, day, 3, 3)
      if (!withinGlobal) return jsonResponse({ error: 'global_limit_reached' }, 503, corsOrigin)

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
      const ipHash = await sha256Hex(`${day}:${clientIp}`)
      const withinIpLimit = await consumeIpDailyQuota(env, ipHash, day)
      if (!withinIpLimit) {
        return jsonResponse({ error: 'ip_daily_limit_reached' }, 429, corsOrigin)
      }

      const row = await env.DB.prepare('SELECT id, renew_token_hash, expires_at FROM shares WHERE id = ?')
        .bind(id)
        .first<Pick<ShareRow, 'id' | 'renew_token_hash' | 'expires_at'>>()

      if (!row || row.expires_at <= now) {
        if (row) await env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(id).run()
        return jsonResponse({ error: 'not_found' }, 404, corsOrigin)
      }

      const tokenHash = await sha256Hex(token)
      if (tokenHash !== row.renew_token_hash) {
        return jsonResponse({ error: 'invalid_renew_token' }, 403, corsOrigin)
      }

      const expiresAt = now + ttlMs
      await env.DB.prepare('UPDATE shares SET expires_at = ? WHERE id = ?').bind(expiresAt, id).run()

      return jsonResponse({ id, expiresAt }, 200, corsOrigin)
    }

    // DELETE /api/shares/:id
    const delMatch = path.match(/^\/api\/shares\/([0-9A-Za-z]+)$/)
    if (request.method === 'DELETE' && delMatch) {
      const id = delMatch[1]!
      if (!ID_RE.test(id)) return jsonResponse({ error: 'invalid_id' }, 400, corsOrigin)

      const token = request.headers.get('X-Renew-Token') || ''
      if (!token) return jsonResponse({ error: 'missing_renew_token' }, 401, corsOrigin)

      const withinGlobal = await checkAndTrackGlobalUsage(env, day, 2, 2)
      if (!withinGlobal) return jsonResponse({ error: 'global_limit_reached' }, 503, corsOrigin)

      const row = await env.DB.prepare('SELECT renew_token_hash FROM shares WHERE id = ?')
        .bind(id)
        .first<{ renew_token_hash: string }>()

      if (!row) return jsonResponse({ error: 'not_found' }, 404, corsOrigin)

      const tokenHash = await sha256Hex(token)
      if (tokenHash !== row.renew_token_hash) {
        return jsonResponse({ error: 'invalid_renew_token' }, 403, corsOrigin)
      }

      await env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(id).run()
      return jsonResponse({ ok: true }, 200, corsOrigin)
    }

    return jsonResponse({ error: 'not_found' }, 404, corsOrigin)
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purgeExpired(env))
  },
}

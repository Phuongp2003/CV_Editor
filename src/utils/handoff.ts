/**
 * Ways an outside AI (chat assistant, coding agent, browser agent) hands a CV to this static site.
 * Link payloads live in the URL fragment (never sent to a server) or as a short share ID (?cv=<id>).
 *
 *   ?cv=<short-id>                  short link backed by Cloudflare Worker + D1 (3-day TTL)
 *   #cv=<url-encoded JSON>          easiest for chat assistants
 *   #cv=b64:<base64url UTF-8 JSON>  for assistants that can run code
 *   #cv=z:<base64url raw-deflate>   compact offline links (Python: zlib wbits=-15)
 *   #cv-src=<https URL to a .json>  e.g. a raw GitHub gist
 *   &mode=merge                     apply as a patch instead of replacing the whole CV
 */

export type ApplyMode = 'replace' | 'merge'

export interface HandoffPayload {
  data: Record<string, unknown>
  mode: ApplyMode
  source: 'link' | 'remote'
}

export interface ShortShareResult {
  url: string
  id?: string
  expiresAt?: number
  renewToken?: string
  isShort: boolean
  deduplicated?: boolean
}

const SHORT_ID_RE = /^[0-9A-Za-z]{6,16}$/
const MAX_INLINE_PHOTO_CHARS = 8192

export function getShareApiBase(): string {
  const raw = (import.meta.env?.VITE_SHARE_API_URL as string | undefined) || ''
  return raw.trim().replace(/\/+$/, '')
}

/** Strips BOM, code fences, chat chatter and citation markers, then parses. */
export function parseCvJsonText(raw: string): Record<string, unknown> {
  let text = raw.trim()
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1).trim()
  const fences = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)]
  if (fences.length) {
    text = (fences[fences.length - 1]?.[1] ?? '').trim()
  } else {
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first >= 0 && last > first) text = text.slice(first, last + 1)
  }
  text = text.replace(/\[cite_start\]/g, '').replace(/\[cite:[^\]]*\]/g, '')
  const obj = JSON.parse(text)
  const payload = normalizeCvPayload(obj)
  if (!isCvPayload(payload)) throw new Error('invalid_format')
  return payload
}

const CV_KEYS = ['cv', 'coverLetter', 'name', 'experiences', 'skills', 'sectionsOrder']

function normalizeCvPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const bundle = value as Record<string, unknown>
  const content = bundle.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return bundle

  const cvContent = content as Record<string, unknown>
  if (!('cv' in cvContent)) return bundle
  const layout = cvContent.layout && typeof cvContent.layout === 'object' && !Array.isArray(cvContent.layout)
    ? cvContent.layout as Record<string, unknown>
    : {}
  const config = bundle.config && typeof bundle.config === 'object' && !Array.isArray(bundle.config)
    ? bundle.config as Record<string, unknown>
    : {}
  const normalized = { ...cvContent, ...config }
  delete normalized.layout
  delete normalized.config
  if (Array.isArray(layout.sectionsOrder)) normalized.sectionsOrder = layout.sectionsOrder
  if (Array.isArray(layout.disabledSections)) normalized.disabledSections = layout.disabledSections
  const labels = layout.sectionLabels ?? layout.customSectionLabels
  if (labels && typeof labels === 'object' && !Array.isArray(labels)) normalized.customSectionLabels = labels
  return normalized
}

export function isCvPayload(obj: unknown): obj is Record<string, unknown> {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj) && CV_KEYS.some((k) => k in (obj as object))
}

/** A payload with a name and experiences is a whole CV; anything smaller is a patch. */
export function inferMode(data: Record<string, unknown>): ApplyMode {
  const cv = (data.cv ?? data) as Record<string, unknown>
  return cv && typeof cv === 'object' && 'name' in cv && 'experiences' in cv ? 'replace' : 'merge'
}

/** Finds a "#cv=..." / "#cv-src=..." link inside pasted text (e.g. a whole AI reply). */
export function findHandoffLink(text: string): string | null {
  const m = text.match(/#(cv(?:-src)?=[^\s)\]"'<>]+)/)
  return m ? `#${m[1]}` : null
}

/** Quick check used by the global paste handler so normal text pastes are left alone. */
export function looksLikeCvJson(text: string): boolean {
  return /"(cv|coverLetter|experiences|sectionsOrder)"\s*:/.test(text)
}

function stripEmptyAndIds(value: unknown, key?: string): unknown {
  if (key === 'id' && typeof value === 'string') return undefined
  if (key === 'photo' && typeof value === 'string' && value.startsWith('data:') && value.length > MAX_INLINE_PHOTO_CHARS) {
    return undefined
  }
  if (value === '' || value === null || value === undefined) return undefined
  if (Array.isArray(value)) {
    const mapped = value.map((item) => stripEmptyAndIds(item)).filter((item) => item !== undefined)
    return mapped.length ? mapped : undefined
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripEmptyAndIds(v, k)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return Object.keys(out).length ? out : undefined
  }
  return value
}

/** Removes redundant IDs, empty fields, and oversized inline data-URI photos before sharing. */
export function compactStateForShare(state: unknown): Record<string, unknown> {
  const cleaned = stripEmptyAndIds(state)
  return (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned) ? cleaned : {}) as Record<string, unknown>
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function pipeBytes(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(bytes as BodyInit).body!.pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

async function fetchShortSharePayload(id: string): Promise<Record<string, unknown>> {
  const apiBase = getShareApiBase()
  if (!apiBase) throw new Error('share_api_unconfigured')
  const res = await fetch(`${apiBase}/api/shares/${encodeURIComponent(id)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const body = (await res.json()) as { payload?: string }
  if (!body.payload) throw new Error('invalid_format')
  const bytes = await pipeBytes(b64urlToBytes(body.payload), new DecompressionStream('deflate-raw'))
  return parseCvJsonText(new TextDecoder().decode(bytes))
}

async function decodeValue(value: string): Promise<{ data: Record<string, unknown>; source: 'link' | 'remote' }> {
  if (SHORT_ID_RE.test(value)) {
    return { data: await fetchShortSharePayload(value), source: 'remote' }
  }
  if (value.startsWith('z:')) {
    const bytes = await pipeBytes(b64urlToBytes(value.slice(2)), new DecompressionStream('deflate-raw'))
    return { data: parseCvJsonText(new TextDecoder().decode(bytes)), source: 'link' }
  }
  if (value.startsWith('b64:')) {
    return { data: parseCvJsonText(new TextDecoder().decode(b64urlToBytes(value.slice(4)))), source: 'link' }
  }
  const plain = value.startsWith('json:') ? value.slice(5) : value
  let decoded = plain
  try {
    decoded = decodeURIComponent(plain)
  } catch {
    /* assistants sometimes paste raw JSON with a stray %; parse as-is */
  }
  return { data: parseCvJsonText(decoded), source: 'link' }
}

/** Splits "#cv=...&mode=merge" without breaking JSON that contains "&". */
function readFragment(hash: string): { key: string; value: string; mode: ApplyMode | null } | null {
  const h = hash.replace(/^#/, '')
  const m = h.match(/^(cv|cv-src)=([\s\S]*)$/)
  if (!m) return null
  let value = m[2] ?? ''
  let mode: ApplyMode | null = null
  const tail = value.match(/&mode=(merge|replace)$/)
  if (tail) {
    mode = tail[1] as ApplyMode
    value = value.slice(0, -tail[0].length)
  }
  return { key: m[1] as string, value, mode }
}

/** Reads a handoff from the URL fragment (#cv=...) or query string (?cv=...). Returns null when there is none. */
export async function readHandoffFromUrl(
  hash = window.location.hash,
  search = window.location.search,
): Promise<HandoffPayload | null> {
  const frag = readFragment(hash)
  if (frag && frag.value) {
    if (frag.key === 'cv-src') {
      const url = decodeURIComponent(frag.value)
      if (!/^https:\/\//i.test(url)) throw new Error('cv-src must be an https URL')
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Could not fetch ${url}: HTTP ${res.status}`)
      const data = parseCvJsonText(await res.text())
      return { data, mode: frag.mode ?? inferMode(data), source: 'remote' }
    }
    const { data, source } = await decodeValue(frag.value)
    return { data, mode: frag.mode ?? inferMode(data), source }
  }

  const params = new URLSearchParams(search)
  const qCv = params.get('cv')
  if (!qCv) return null
  const qMode = params.get('mode')
  const mode = qMode === 'merge' || qMode === 'replace' ? qMode : null
  const { data, source } = await decodeValue(qCv)
  return { data, mode: mode ?? inferMode(data), source }
}

/** Removes the payload from the address bar so a reload does not re-import it. */
export function clearHandoffFromUrl() {
  const params = new URLSearchParams(window.location.search)
  params.delete('cv')
  params.delete('mode')
  const qs = params.toString()
  const url = window.location.pathname + (qs ? `?${qs}` : '')
  window.history.replaceState(null, '', url)
}

/** Compresses a CV state into a raw-deflate base64url string. */
export async function packState(state: unknown): Promise<string> {
  const compact = compactStateForShare(state)
  const bytes = new TextEncoder().encode(JSON.stringify(compact))
  const packed = await pipeBytes(bytes, new CompressionStream('deflate-raw'))
  return bytesToB64url(packed)
}

/** Builds a compact offline share link (raw deflate + base64url) for the given state. */
export async function buildShareLink(state: unknown): Promise<string> {
  const packed = await packState(state)
  const base = new URL(window.location.origin + (import.meta.env.BASE_URL || '/'))
  base.searchParams.set('view', 'preview')
  return `${base.toString()}#cv=z:${packed}`
}

/**
 * Creates a short (?cv=<id>) share link via the Cloudflare Worker API.
 * Falls back to an offline #cv=z:... link when the API is unconfigured, offline, or rate-limited.
 */
export async function buildShortShareLink(state: unknown): Promise<ShortShareResult> {
  const packed = await packState(state)
  const base = new URL(window.location.origin + (import.meta.env.BASE_URL || '/'))
  base.searchParams.set('view', 'preview')
  const fallbackUrl = `${base.toString()}#cv=z:${packed}`
  const apiBase = getShareApiBase()
  if (!apiBase) return { url: fallbackUrl, isShort: false }

  try {
    const res = await fetch(`${apiBase}/api/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: packed }),
    })
    if (!res.ok) return { url: fallbackUrl, isShort: false }
    const data = (await res.json()) as {
      id?: string
      expiresAt?: number
      renewToken?: string
      deduplicated?: boolean
    }
    if (!data.id) return { url: fallbackUrl, isShort: false }
    const shortUrl = new URL(base)
    shortUrl.searchParams.set('cv', data.id)
    return {
      url: shortUrl.toString(),
      id: data.id,
      expiresAt: data.expiresAt,
      renewToken: data.renewToken,
      isShort: true,
      deduplicated: data.deduplicated,
    }
  } catch {
    return { url: fallbackUrl, isShort: false }
  }
}

/** Extends the TTL of a short share link by another 3 days. */
export async function renewShortShare(id: string, renewToken: string): Promise<{ id: string; expiresAt: number }> {
  const apiBase = getShareApiBase()
  if (!apiBase) throw new Error('share_api_unconfigured')
  const res = await fetch(`${apiBase}/api/shares/${encodeURIComponent(id)}/renew`, {
    method: 'POST',
    headers: { 'X-Renew-Token': renewToken },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return (await res.json()) as { id: string; expiresAt: number }
}

/** Deletes a short share link from the server using its creator renewToken. */
export async function deleteShortShare(id: string, renewToken: string): Promise<void> {
  const apiBase = getShareApiBase()
  if (!apiBase) return
  await fetch(`${apiBase}/api/shares/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'X-Renew-Token': renewToken },
  })
}

/**
 * Ways an outside AI (chat assistant, coding agent, browser agent) hands a CV to this static site.
 * Nothing here talks to a server: link payloads live in the URL fragment, which browsers never send.
 *
 *   #cv=<url-encoded JSON>          easiest for chat assistants
 *   #cv=b64:<base64url UTF-8 JSON>  for assistants that can run code
 *   #cv=z:<base64url raw-deflate>   short links (this app's "Share link"; Python: zlib wbits=-15)
 *   #cv-src=<https URL to a .json>  e.g. a raw GitHub gist
 *   &mode=merge                     apply as a patch instead of replacing the whole CV
 */

export type ApplyMode = 'replace' | 'merge'

export interface HandoffPayload {
  data: Record<string, unknown>
  mode: ApplyMode
  source: 'link' | 'remote'
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
  if (!isCvPayload(obj)) throw new Error('invalid_format')
  return obj
}

const CV_KEYS = ['cv', 'coverLetter', 'name', 'experiences', 'skills', 'sectionsOrder']

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

async function decodeValue(value: string): Promise<Record<string, unknown>> {
  if (value.startsWith('z:')) {
    const bytes = await pipeBytes(b64urlToBytes(value.slice(2)), new DecompressionStream('deflate-raw'))
    return parseCvJsonText(new TextDecoder().decode(bytes))
  }
  if (value.startsWith('b64:')) {
    return parseCvJsonText(new TextDecoder().decode(b64urlToBytes(value.slice(4))))
  }
  const plain = value.startsWith('json:') ? value.slice(5) : value
  let decoded = plain
  try {
    decoded = decodeURIComponent(plain)
  } catch {
    /* assistants sometimes paste raw JSON with a stray %; parse as-is */
  }
  return parseCvJsonText(decoded)
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

/** Reads a handoff from the current URL fragment. Returns null when there is none. */
export async function readHandoffFromUrl(hash = window.location.hash): Promise<HandoffPayload | null> {
  const frag = readFragment(hash)
  if (!frag || !frag.value) return null
  if (frag.key === 'cv-src') {
    const url = decodeURIComponent(frag.value)
    if (!/^https:\/\//i.test(url)) throw new Error('cv-src must be an https URL')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Could not fetch ${url}: HTTP ${res.status}`)
    const data = parseCvJsonText(await res.text())
    return { data, mode: frag.mode ?? inferMode(data), source: 'remote' }
  }
  const data = await decodeValue(frag.value)
  return { data, mode: frag.mode ?? inferMode(data), source: 'link' }
}

/** Removes the payload from the address bar so a reload does not re-import it. */
export function clearHandoffFromUrl() {
  const url = window.location.pathname + window.location.search
  window.history.replaceState(null, '', url)
}

/** Builds a compact share link (raw deflate + base64url) for the given state. */
export async function buildShareLink(state: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  const packed = await pipeBytes(bytes, new CompressionStream('deflate-raw'))
  const base = window.location.origin + (import.meta.env.BASE_URL || '/')
  return `${base}#cv=z:${bytesToB64url(packed)}`
}

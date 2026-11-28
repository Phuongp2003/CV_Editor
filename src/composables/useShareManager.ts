import { ref } from 'vue'
import { buildShortShareLink, deleteShortShare, renewShortShare, type ShortShareResult } from '@/utils/handoff'

export interface SharedCvRecord {
  id: string
  url: string
  title: string
  createdAt: number
  expiresAt: number
  renewToken?: string
  isShort: boolean
}

const STORAGE_KEY = 'cv_shared_links_v1'
const MAX_LOCAL_RECORDS = 30

function loadRecords(): SharedCvRecord[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const sharedLinks = ref<SharedCvRecord[]>(loadRecords())

function persist() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedLinks.value))
    }
  } catch {
    /* ignore storage quota errors */
  }
}

/** Manages locally saved shared CV links, including server-side TTL renewal and deletion. */
export function useShareManager() {
  async function createAndSaveShare(state: Record<string, unknown>, title: string): Promise<ShortShareResult> {
    const res = await buildShortShareLink(state)
    const now = Date.now()
    const recordId = res.id || `local-${now}`

    if (res.isShort && res.id) {
      const existingIdx = sharedLinks.value.findIndex((r) => r.id === res.id)
      const existing = existingIdx >= 0 ? sharedLinks.value[existingIdx] : undefined
      const record: SharedCvRecord = {
        id: res.id,
        url: res.url,
        title: title.trim() || 'Untitled CV',
        createdAt: existing?.createdAt ?? now,
        expiresAt: res.expiresAt ?? now + 3 * 86_400_000,
        renewToken: res.renewToken ?? existing?.renewToken,
        isShort: true,
      }
      if (existingIdx >= 0) {
        sharedLinks.value.splice(existingIdx, 1)
      }
      sharedLinks.value.unshift(record)
    } else {
      sharedLinks.value.unshift({
        id: recordId,
        url: res.url,
        title: title.trim() || 'Untitled CV',
        createdAt: now,
        expiresAt: 0,
        isShort: false,
      })
    }

    if (sharedLinks.value.length > MAX_LOCAL_RECORDS) {
      sharedLinks.value = sharedLinks.value.slice(0, MAX_LOCAL_RECORDS)
    }
    persist()
    return res
  }

  async function renewShare(id: string): Promise<number> {
    const item = sharedLinks.value.find((r) => r.id === id)
    if (!item || !item.isShort || !item.renewToken) {
      throw new Error('missing_renew_token')
    }
    const updated = await renewShortShare(id, item.renewToken)
    item.expiresAt = updated.expiresAt
    persist()
    return updated.expiresAt
  }

  async function deleteShare(id: string): Promise<void> {
    const item = sharedLinks.value.find((r) => r.id === id)
    if (item?.isShort && item.renewToken) {
      try {
        await deleteShortShare(id, item.renewToken)
      } catch {
        /* still remove from local list if already expired or unreachable */
      }
    }
    sharedLinks.value = sharedLinks.value.filter((r) => r.id !== id)
    persist()
  }

  function clearExpired(): void {
    const now = Date.now()
    sharedLinks.value = sharedLinks.value.filter((r) => !r.isShort || r.expiresAt > now)
    persist()
  }

  return {
    sharedLinks,
    createAndSaveShare,
    renewShare,
    deleteShare,
    clearExpired,
  }
}

import { useToast } from '@nuxt/ui/composables'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import {
  clearHandoffFromUrl,
  findHandoffLink,
  inferMode,
  looksLikeCvJson,
  parseCvJsonText,
  readHandoffFromUrl,
  type ApplyMode,
} from '@/utils/handoff'

/** One import path for pasted AI replies, dropped files, hand-off links and the API. Always undoable. */
export function useImport() {
  const store = useCVStore()
  const toast = useToast()
  const { t } = useI18n()

  function apply(data: Record<string, unknown>, mode: ApplyMode) {
    store.applyExternal(data, mode)
    const onlyLetter = !!data.coverLetter && !data.cv && !('name' in data)
    store.activeWorkspace = onlyLetter ? 'cover-letter' : 'cv'
    toast.add({
      title: t('import_done'),
      description: mode === 'merge' ? t('import_merged') : t('import_replaced'),
      color: 'success',
      icon: 'i-lucide-check-circle',
      actions: [{ label: t('undo'), color: 'neutral', variant: 'outline', onClick: () => store.undoExternal() }],
    })
  }

  function fail(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    toast.add({
      title: t('import_failed'),
      description: msg === 'invalid_format' ? t('invalid_format') : msg.slice(0, 200),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  }

  /** Accepts a whole AI reply: a fenced/bare JSON payload, or a text containing a #cv= link. */
  async function importText(text: string): Promise<boolean> {
    try {
      const link = findHandoffLink(text)
      if (link && !looksLikeCvJson(text)) {
        const h = await readHandoffFromUrl(link)
        if (!h) throw new Error('invalid_format')
        apply(h.data, h.mode)
      } else {
        const data = parseCvJsonText(text)
        apply(data, inferMode(data))
      }
      return true
    } catch (e) {
      fail(e)
      return false
    }
  }

  /** Imports a "#cv=..." or "?cv=..." link from the current address, then removes it from the URL. */
  async function importFromLocation(): Promise<boolean> {
    try {
      const h = await readHandoffFromUrl()
      if (!h) return false
      apply(h.data, h.mode)
      return true
    } catch (e) {
      fail(e)
      return false
    } finally {
      const hasQueryCv = new URLSearchParams(window.location.search).has('cv')
      if (hasQueryCv || /^#cv(-src)?=/.test(window.location.hash)) {
        clearHandoffFromUrl()
      }
    }
  }

  return { importText, importFromLocation, apply }
}

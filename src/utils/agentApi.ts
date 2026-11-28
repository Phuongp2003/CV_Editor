/**
 * `window.cvEditor`: a small, documented surface so browser-driving AI agents
 * (Claude in Chrome, ChatGPT agent, Playwright scripts...) can build a CV without clicking through forms.
 * Documented for agents in public/llms.txt.
 */
import type { useCVStore } from '@/stores/cv'
import { auditCv } from '@/utils/cvAudit'
import { parseCvJsonText } from '@/utils/handoff'
import { useShareManager } from '@/composables/useShareManager'

type Store = ReturnType<typeof useCVStore>

export interface CvEditorApi {
  version: string
  /** Where the instructions and schema live. */
  docs: { llms: string; schema: string; rules: string; example: string }
  /** Current full state (same shape as the JSON export). */
  getState(): Record<string, unknown>
  /** Replace the whole CV. Accepts an object or a JSON string (code fences allowed). */
  load(data: Record<string, unknown> | string): { ok: true }
  /** Merge a partial update: given cv fields replace current ones, others stay. */
  patch(data: Record<string, unknown> | string): { ok: true }
  /** Undo the last load/patch. */
  undo(): void
  /** Run the static ATS + AI-slop check. Optionally set a job description first. */
  audit(jobDescription?: string): ReturnType<typeof auditCv>
  /** Page count of the rendered PDF (wait ~1s after a change). */
  pageCount(): number
  /** Base64 of the current PDF, for agents that save files themselves. */
  pdfBase64(): Promise<string | null>
  /** Trigger the PDF download in the browser. */
  downloadPdf(): void
  /** Short preview link; the Worker stores the CV for three days. Anyone with the link can view it. */
  shareLink(): Promise<string>
}

export function installAgentApi(store: Store) {
  const toObj = (d: Record<string, unknown> | string) => (typeof d === 'string' ? parseCvJsonText(d) : d)
  const base = import.meta.env.BASE_URL || '/'
  const { createAndSaveShare } = useShareManager()

  const api: CvEditorApi = {
    version: import.meta.env.VITE_APP_VERSION || 'dev',
    docs: {
      llms: `${base}llms.txt`,
      schema: `${base}ai/schema.json`,
      rules: `${base}ai/cv-writing-rules.md`,
      example: `${base}sample.json`,
    },
    getState: () => store.exportState(),
    load(data) {
      store.applyExternal(toObj(data), 'replace')
      return { ok: true }
    },
    patch(data) {
      store.applyExternal(toObj(data), 'merge')
      return { ok: true }
    },
    undo: () => store.undoExternal(),
    audit(jobDescription) {
      if (typeof jobDescription === 'string') store.jobDescription = jobDescription
      return auditCv({
        cv: store.cvData,
        coverLetter: store.coverLetterData,
        disabledSections: store.disabledSections,
        customSectionLabels: store.customSectionLabels,
        bulletChars: store.bulletChars,
        pageCount: store.pdfPageCount,
        jobDescription: store.jobDescription,
      })
    },
    pageCount: () => store.pdfPageCount,
    async pdfBase64() {
      const blob = store.pdfBlob
      if (!blob) return null
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(bin)
    },
    downloadPdf: () => store.triggerDownload(),
    shareLink: async () => (await createAndSaveShare(store.exportState(), store.cvData.name || 'Current CV')).url,
  }

  ;(window as unknown as { cvEditor: CvEditorApi }).cvEditor = api
}

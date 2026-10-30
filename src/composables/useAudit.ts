import { computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { auditCv } from '@/utils/cvAudit'
import type { SectionKey } from '@/types/cv'

/** Live ATS + slop check of the current CV, shared by the header badge, section nav and check panel. */
export function useAudit() {
  const store = useCVStore()

  const result = computed(() =>
    auditCv({
      cv: store.cvData,
      coverLetter: store.coverLetterData,
      disabledSections: store.disabledSections,
      customSectionLabels: store.customSectionLabels,
      bulletChars: store.bulletChars,
      pageCount: store.pdfPageCount,
      jobDescription: store.jobDescription,
    }),
  )

  const countBySection = computed(() => {
    const out: Partial<Record<SectionKey | 'personal', number>> = {}
    result.value.findings.forEach((f) => {
      if (f.target) out[f.target.section] = (out[f.target.section] || 0) + 1
    })
    return out
  })

  const scoreColor = computed(() => {
    const s = result.value.score
    return s >= 85 ? 'success' : s >= 65 ? 'warning' : 'error'
  })

  return { result, countBySection, scoreColor }
}

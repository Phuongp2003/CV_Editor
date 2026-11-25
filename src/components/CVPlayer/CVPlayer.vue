<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { CV_LANGUAGE_SECTION_LABELS } from '@/types/cv'
import type { SectionKey } from '@/types/cv'
import { renderCv } from '@/utils/pdf/renderCv'
import { ensureFonts } from '@/utils/fonts'

const store = useCVStore()
const { t } = useI18n()
const {
  cvData: cv,
  template,
  sizeMultiplier,
  selectedFont,
  customFontName,
  language,
  customSectionLabels,
  sectionsOrder,
  disabledSections,
  bulletChars,
  experienceHeaderStyle,
  experienceCompanyMode,
  avatarStyle,
} = storeToRefs(store)

const pdfBlobUrl = ref<string | null>(null)
const isRendering = ref(false)
const fontFellBack = ref(false)
const renderError = ref('')

const sectionLabels = computed(() => {
  const defaults = (CV_LANGUAGE_SECTION_LABELS[language.value] || CV_LANGUAGE_SECTION_LABELS.English) as Record<
    SectionKey,
    string
  >
  const out = {} as Record<SectionKey, string>
  ;(Object.keys(defaults) as SectionKey[]).forEach((k) => {
    out[k] = (customSectionLabels.value[k] ?? '').trim() || defaults[k]
  })
  return out
})

async function generatePDF(shouldDownload = false): Promise<void> {
  isRendering.value = true
  renderError.value = ''
  try {
    const opts = {
      cv: cv.value,
      template: template.value,
      language: language.value,
      sizeMultiplier: sizeMultiplier.value,
      selectedFont: selectedFont.value,
      customFontName: customFontName.value,
      sectionsOrder: sectionsOrder.value,
      disabledSections: disabledSections.value,
      bulletChars: bulletChars.value,
      experienceHeaderStyle: experienceHeaderStyle.value,
      experienceCompanyMode: experienceCompanyMode.value,
      avatarStyle: avatarStyle.value,
      sectionLabels: sectionLabels.value,
    }
    let result = renderCv(opts)
    if (!result.ok && result.needsFonts) {
      await ensureFonts(result.needsFonts)
      result = renderCv(opts)
    }
    if (!result.ok) throw new Error('Font failed to load')

    fontFellBack.value = result.fontFellBack
    store.pdfPageCount = result.pages
    const blob = result.doc.output('blob')
    store.pdfBlob = blob
    if (pdfBlobUrl.value) URL.revokeObjectURL(pdfBlobUrl.value)
    pdfBlobUrl.value = URL.createObjectURL(blob)
    if (shouldDownload) result.doc.save(`${(cv.value.name || 'resume').trim().replace(/\s+/g, '_')}_CV.pdf`)
  } catch (e) {
    console.error('PDF render failed:', e)
    renderError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isRendering.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
function scheduleRender() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => generatePDF(), 350)
}

watch(
  [
    cv,
    template,
    sizeMultiplier,
    selectedFont,
    customFontName,
    language,
    customSectionLabels,
    sectionsOrder,
    disabledSections,
    bulletChars,
    experienceHeaderStyle,
    experienceCompanyMode,
    avatarStyle,
  ],
  scheduleRender,
  { deep: true },
)
watch(
  () => store.downloadTrigger,
  () => generatePDF(true),
)

onMounted(() => generatePDF())
onUnmounted(() => {
  if (pdfBlobUrl.value) URL.revokeObjectURL(pdfBlobUrl.value)
})
</script>

<template>
  <section class="h-full flex flex-col rounded-xl border border-default bg-elevated/40 overflow-hidden">
    <div class="h-11 px-3 flex items-center justify-between gap-2 border-b border-default bg-default flex-shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <UIcon name="i-lucide-file-text" class="size-4 text-muted" />
        <span class="text-sm font-semibold text-highlighted truncate">{{ t('pdf_preview_title') }}</span>
        <UIcon v-if="isRendering" name="i-lucide-loader-circle" class="size-3.5 animate-spin text-muted" />
      </div>
      <div class="flex items-center gap-1.5">
        <UTooltip v-if="fontFellBack" :text="t('font_fallback_hint')">
          <UBadge color="neutral" variant="soft" size="sm" icon="i-lucide-type">EB Garamond</UBadge>
        </UTooltip>
        <UBadge
          v-if="store.pdfPageCount"
          :color="store.pdfPageCount > 1 ? 'warning' : 'success'"
          variant="soft"
          size="sm"
          :icon="store.pdfPageCount > 1 ? 'i-lucide-triangle-alert' : 'i-lucide-check'"
        >
          {{ store.pdfPageCount }} {{ store.pdfPageCount > 1 ? t('pages') : t('page') }}
        </UBadge>
      </div>
    </div>

    <div class="flex-1 relative min-h-0">
      <iframe
        v-if="pdfBlobUrl"
        :key="pdfBlobUrl"
        :src="pdfBlobUrl + '#toolbar=0&navpanes=0&view=FitH'"
        :title="t('pdf_preview_title')"
        class="absolute inset-0 w-full h-full border-0"
      ></iframe>
      <div v-else class="absolute inset-0 flex items-center justify-center text-sm text-muted">
        {{ renderError || t('pdf_preview_title') + '…' }}
      </div>
    </div>
  </section>
</template>

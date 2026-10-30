<script setup lang="ts">
import { computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { CV_LANGUAGE_SECTION_LABELS } from '@/types/cv'
import type { SectionKey } from '@/types/cv'
import SectionContent from '@/components/editor/SectionContent.vue'
import SectionNav from '@/components/editor/SectionNav.vue'
import FormatPopover from '@/components/editor/FormatPopover.vue'

const store = useCVStore()
const { t } = useI18n()

function label(key: string): string {
  if (key === 'personal') return t('personal_info')
  const custom = store.customSectionLabels[key]?.trim()
  if (custom) return custom
  const defaults = CV_LANGUAGE_SECTION_LABELS[store.language] || CV_LANGUAGE_SECTION_LABELS.English
  return defaults?.[key as SectionKey] || key
}

const options = computed(() => [
  { label: t('personal_info'), value: 'personal' },
  ...store.sectionsOrder
    .filter((k) => !store.disabledSections.includes(k))
    .map((k) => ({ label: label(k), value: k })),
])

// Keep the selection valid when a section gets hidden.
const active = computed({
  get: () =>
    options.value.some((o) => o.value === store.activeSectionTab) ? store.activeSectionTab : 'personal',
  set: (v: string) => (store.activeSectionTab = v),
})

const TIP_KEYS: Record<string, string> = {
  personal: 'tip_personal',
  summary: 'tip_objective',
  objective: 'tip_objective',
  skills: 'tip_skills',
  experience: 'tip_experience',
  projects: 'tip_projects',
  education: 'tip_education',
  certificates: 'tip_certificates',
}
</script>

<template>
  <div class="h-full flex gap-4 min-h-0">
    <!-- Section navigator (wide screens) -->
    <aside class="hidden xl:flex w-52 shrink-0 flex-col gap-3 min-h-0">
      <div class="flex-1 overflow-y-auto pr-1">
        <SectionNav />
      </div>
      <FormatPopover />
    </aside>

    <!-- Active section editor -->
    <section class="flex-1 min-w-0 flex flex-col rounded-xl border border-default bg-default overflow-hidden">
      <header class="px-4 py-3 border-b border-default flex flex-col gap-2 shrink-0">
        <div class="flex items-center gap-2">
          <USelect v-model="active" :items="options" class="xl:hidden flex-1" />
          <h2 class="hidden xl:block flex-1 text-base font-semibold text-highlighted truncate">{{ label(active) }}</h2>
          <div class="xl:hidden"><FormatPopover /></div>
        </div>
        <p class="text-xs text-muted leading-relaxed">{{ t(TIP_KEYS[active] as any) }}</p>
      </header>
      <div class="flex-1 overflow-y-auto p-4">
        <SectionContent :active-tab="active" />
      </div>
    </section>
  </div>
</template>

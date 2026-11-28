<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { CV_LANGUAGE_SECTION_LABELS } from '@/types/cv'
import type { SectionKey } from '@/types/cv'
import SectionContent from '@/components/editor/SectionContent.vue'
import SectionNav from '@/components/editor/SectionNav.vue'
import FormatPopover from '@/components/editor/FormatPopover.vue'

const store = useCVStore()
const { t } = useI18n()
const headingEditing = ref(false)
const headingDraft = ref('')
const sectionManagerOpen = ref(false)

function label(key: string): string {
  if (key === 'personal') return t('personal_info')
  const custom = store.customSectionLabels[key]?.trim()
  if (custom) return custom
  const defaults = CV_LANGUAGE_SECTION_LABELS[store.language] || CV_LANGUAGE_SECTION_LABELS.English
  return defaults?.[key as SectionKey] || key
}

function startHeadingEdit() {
  if (active.value === 'personal' || active.value === 'page-break') return
  headingDraft.value = label(active.value)
  headingEditing.value = true
  nextTick(() => {
    const input = [...document.querySelectorAll<HTMLInputElement>('#active-section-heading, #active-section-heading-mobile')]
      .find((element) => element.getClientRects().length > 0)
    input?.focus()
    input?.select()
  })
}

function commitHeadingEdit() {
  if (!headingEditing.value) return
  const key = active.value
  const value = headingDraft.value.trim()
  const defaults = CV_LANGUAGE_SECTION_LABELS[store.language] || CV_LANGUAGE_SECTION_LABELS.English
  const fallback = defaults?.[key as SectionKey] || store.cvData.customSections?.find((section) => `custom:${section.id}` === key)?.title || key
  if (key.startsWith('custom:')) store.updateSectionLabel(key, value || fallback)
  else store.updateSectionLabel(key, value && value !== fallback ? value : '')
  headingEditing.value = false
}

function cancelHeadingEdit() {
  headingEditing.value = false
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
          <UButton
            class="xl:hidden"
            icon="i-lucide-list-ordered"
            color="neutral"
            variant="outline"
            :label="t('manage_sections')"
            :ui="{ label: 'hidden sm:inline' }"
            :aria-label="t('manage_sections')"
            @click="sectionManagerOpen = true"
          />
          <div class="hidden xl:flex flex-1 min-w-0 items-center gap-1">
            <UInput
              v-if="headingEditing"
              id="active-section-heading"
              v-model="headingDraft"
              size="sm"
              class="flex-1 min-w-0"
              :aria-label="store.uiLanguage === 'Vietnamese' ? 'Tên tiêu đề mục' : 'Section heading'"
              @keydown.enter.prevent="commitHeadingEdit"
              @keydown.esc.prevent="cancelHeadingEdit"
              @blur="commitHeadingEdit"
            />
            <h2 v-else class="flex-1 min-w-0 text-base font-semibold text-highlighted truncate">{{ label(active) }}</h2>
            <UButton
              v-if="!headingEditing && active !== 'personal' && active !== 'page-break'"
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="store.uiLanguage === 'Vietnamese' ? 'Đổi tên tiêu đề mục' : 'Rename section heading'"
              @click="startHeadingEdit"
            />
          </div>
          <UButton
            v-if="active !== 'personal' && active !== 'page-break'"
            class="xl:hidden"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="store.uiLanguage === 'Vietnamese' ? 'Đổi tên tiêu đề mục' : 'Rename section heading'"
            @click="startHeadingEdit"
          />
          <UButton class="xl:hidden" icon="i-lucide-plus" color="neutral" variant="soft" size="sm" :aria-label="store.uiLanguage === 'Vietnamese' ? 'Thêm mục' : 'Add section'" @click="store.addCustomSection()" />
          <div class="xl:hidden"><FormatPopover /></div>
        </div>
        <UInput
          v-if="headingEditing && active !== 'personal' && active !== 'page-break'"
          id="active-section-heading-mobile"
          v-model="headingDraft"
          class="xl:hidden"
          size="sm"
          :aria-label="store.uiLanguage === 'Vietnamese' ? 'Tên tiêu đề mục' : 'Section heading'"
          @keydown.enter.prevent="commitHeadingEdit"
          @keydown.esc.prevent="cancelHeadingEdit"
          @blur="commitHeadingEdit"
        />
        <p class="text-xs text-muted leading-relaxed">{{ t(TIP_KEYS[active] as any) }}</p>
      </header>
      <div class="flex-1 overflow-y-auto p-4">
        <SectionContent :active-tab="active" />
      </div>
    </section>

    <UModal
      v-model:open="sectionManagerOpen"
      :title="t('manage_sections')"
      :description="t('manage_sections_desc')"
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #body>
        <div class="max-h-[65dvh] overflow-y-auto">
          <SectionNav touch-controls @close-manager="sectionManagerOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>

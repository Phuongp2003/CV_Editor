<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import SectionContent from '@/components/editor/SectionContent.vue'

const store = useCVStore()
const { t } = useI18n()

const activeTab = computed({
  get: () => store.activeSectionTab,
  set: (val) => {
    store.activeSectionTab = val
  },
})

const SECTION_TRANSLATION_KEYS: Record<string, string> = {
  summary: 'summary_title',
  objective: 'objective_title',
  skills: 'skills_title',
  experience: 'experience_title',
  projects: 'projects_title',
  education: 'education_title',
  certificates: 'certificates_title',
}

function getTabLabel(secKey: string): string {
  const custom = store.customSectionLabels[secKey]
  if (custom && custom.trim()) return custom
  const transKey = SECTION_TRANSLATION_KEYS[secKey]
  return transKey ? t(transKey as any) : secKey
}

const tabItems = computed(() => {
  const items = [{ label: t('personal_info'), value: 'personal', slot: 'personal' }]
  store.sectionsOrder.forEach((secKey) => {
    if (store.isSectionEnabled(secKey)) {
      items.push({
        label: getTabLabel(secKey),
        value: secKey,
        slot: secKey,
      })
    }
  })
  return items
})

function scrollToSection(value: string) {
  const el = document.getElementById(`section-${value}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Tab Mode -->
    <UTabs
      v-if="store.editorMode === 'tabs'"
      v-model="activeTab"
      :items="tabItems"
      variant="pill"
      size="sm"
      color="primary"
      :ui="{ content: 'w-full flex-1 flex flex-col min-h-0 overflow-hidden' }"
      class="w-full flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      <template #personal>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="personal" />
        </div>
      </template>
      <template #summary>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="summary" />
        </div>
      </template>
      <template #objective>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="objective" />
        </div>
      </template>
      <template #skills>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="skills" />
        </div>
      </template>
      <template #experience>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="experience" />
        </div>
      </template>
      <template #projects>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="projects" />
        </div>
      </template>
      <template #education>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="education" />
        </div>
      </template>
      <template #certificates>
        <div class="flex-1 overflow-y-auto pr-2 min-h-0 pt-6">
          <SectionContent active-tab="certificates" />
        </div>
      </template>
    </UTabs>

    <!-- Outline Mode (Scrollable stack of all sections) -->
    <div
      v-else
      class="flex-1 overflow-y-auto pr-2 flex flex-col min-h-0 outline-mode-container relative"
    >
      <!-- Quick Navigation Header -->
      <div
        class="py-2.5 pb-3 border-b border-theme-border/60 mb-5 flex flex-wrap gap-1.5 items-center"
      >
        <span class="text-xs text-theme-text-muted mr-1 select-none">
          {{ t('nav_jump_to') }}
        </span>
        <button
          v-for="(item, idx) in tabItems"
          :key="'nav-' + item.value"
          @click="scrollToSection(item.value)"
          class="px-2.5 py-1 text-xs rounded-md bg-theme-muted hover:bg-primary-500/10 hover:text-primary-500 border border-theme-border hover:border-primary-500/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm group font-semibold"
          :title="`${t('nav_position')} ${idx + 1}`"
        >
          <span
            class="w-1.5 h-1.5 rounded-full bg-theme-text-muted group-hover:bg-primary-500 transition-colors"
          ></span>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div class="flex flex-col gap-6">
        <div
          v-for="(item, idx) in tabItems"
          :key="item.value"
          :id="'section-' + item.value"
          class="bg-theme-card-sub/20 border border-theme-border/60 p-4 rounded-xl flex flex-col gap-3 scroll-mt-4 transition-all duration-300 hover:border-primary-500/30 hover:shadow-md"
        >
          <!-- Section Header -->
          <div class="flex items-center justify-between border-b border-theme-border pb-2 mb-1">
            <div class="flex items-center gap-2">
              <span
                class="text-xs font-bold uppercase tracking-wider text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20 shadow-sm select-none"
              >
                {{ item.label }}
              </span>
              <span class="text-[10px] text-theme-text-muted select-none"> #{{ idx + 1 }} </span>
            </div>
          </div>
          <!-- Section Form Content -->
          <SectionContent :active-tab="item.value" @edit-section="scrollToSection($event)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.outline-mode-container {
  scrollbar-width: thin;
}
</style>

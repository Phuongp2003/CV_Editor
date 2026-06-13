<script setup lang="ts">
import { onMounted } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import sampleData from '@/assets/sample.json'
import EditorHeader from '@/components/editor/EditorHeader.vue'
import EditorContentMode from '@/components/editor/EditorContentMode.vue'
import EditorLayoutMode from '@/components/editor/EditorLayoutMode.vue'

const store = useCVStore()
const { t } = useI18n()

function handleEditSection(secKey: string) {
  store.activeSectionTab = secKey
  store.editViewMode = 'content'

  if (store.editorMode === 'outline') {
    setTimeout(() => {
      const el = document.getElementById(`section-${secKey}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
  }
}

onMounted(() => {
  // Load sample data if no name is set yet (fresh start)
  if (!store.cvData.name) {
    store.loadCv(sampleData as any)
  }
})
</script>

<template>
  <div
    class="bg-theme-card border border-theme-border rounded-xl p-5 flex flex-col gap-4 text-theme-text-sub h-full overflow-hidden shadow-xl transition duration-150 relative"
  >
    <!-- Header -->
    <EditorHeader />

    <!-- Teleport "Reset to Sample" to navbar -->
    <Teleport defer to="#navbar-actions">
      <button
        @click="store.loadCv(sampleData as any)"
        class="bg-theme-element hover:bg-theme-hover text-theme-text border border-theme-border px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
      >
        {{ t('reset_sample') }}
      </button>
    </Teleport>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden mt-1">
      <EditorLayoutMode v-if="store.editViewMode === 'layout'" @edit-section="handleEditSection" />
      <EditorContentMode v-else />
    </div>
  </div>
</template>

<style scoped>
/* Scoped overrides if needed */
</style>

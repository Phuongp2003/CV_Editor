<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import EditorHeader from '@/components/editor/EditorHeader.vue'
import EditorContentMode from '@/components/editor/EditorContentMode.vue'
import EditorLayoutMode from '@/components/editor/EditorLayoutMode.vue'

const store = useCVStore()

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
</script>

<template>
  <div
    class="bg-theme-card border border-theme-border rounded-xl p-5 flex flex-col gap-4 text-theme-text-sub h-full overflow-hidden shadow-xl transition duration-150 relative"
  >
    <!-- Header -->
    <EditorHeader />

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

<script setup lang="ts">
import { usePromptsStore } from '@/stores/prompts'
import { useCVStore } from '@/stores/cv'
import PromptSelector from './PromptSelector.vue'
import PromptDetails from './PromptDetails.vue'
import PromptImporter from './PromptImporter.vue'
import PromptGuide from './PromptGuide.vue'

const promptsStore = usePromptsStore()
const cvStore = useCVStore()
</script>

<template>
  <UModal
    v-model:open="promptsStore.isModalOpen"
    :overlay="true"
    :modal="true"
    :title="cvStore.uiLanguage === 'Vietnamese' ? 'AI Prompt Hub & Assistant' : 'AI Prompt Hub & Assistant'"
    :ui="{
      content: 'w-[95vw] sm:w-[90vw] md:w-[1350px] lg:w-[1450px] max-w-full transition-all duration-300'
    }"
  >
    <template #body>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 py-2 h-[75vh] min-h-[500px]">
        <!-- Column 1: Prompt Selector (Span 3 always) -->
        <div class="md:col-span-3 overflow-y-auto pr-1 select-container">
          <h4 class="text-[10px] font-extrabold text-theme-text-muted uppercase tracking-wider mb-3 select-none">
            {{ cvStore.uiLanguage === 'Vietnamese' ? 'Vai trò ứng tuyển' : 'Target Roles' }}
          </h4>
          <PromptSelector />
        </div>

        <!-- Column 2: Details & Importer (Span 6 if Guide open, Span 9 if Guide closed to occupy the remaining space) -->
        <div
          :class="[
            'flex flex-col min-h-0 h-full gap-5 transition-all duration-300 ease-in-out',
            promptsStore.showGuide ? 'md:col-span-6' : 'md:col-span-9'
          ]"
        >
          <!-- Scrollable Prompt Details -->
          <div class="flex-1 overflow-y-auto pr-1 details-container">
            <PromptDetails />
          </div>

          <!-- Bottom: Paste JSON & Import -->
          <div class="flex-shrink-0 border-t border-theme-border/60 pt-4">
            <PromptImporter />
          </div>
        </div>

        <!-- Column 3: Prompt Guide (Span 3, visible only if showGuide is true with slide-fade transition) -->
        <Transition name="slide-fade">
          <div
            v-if="promptsStore.showGuide"
            class="md:col-span-3 overflow-hidden h-full flex flex-col min-h-0"
          >
            <PromptGuide />
          </div>
        </Transition>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.select-container,
.details-container {
  scrollbar-width: thin;
}

/* Slide-fade transition for the guide column */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>

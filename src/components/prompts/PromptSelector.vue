<script setup lang="ts">
import { computed } from 'vue'
import { promptList } from '@/prompts'
import { usePromptsStore } from '@/stores/prompts'
import { useCVStore } from '@/stores/cv'

const promptsStore = usePromptsStore()
const cvStore = useCVStore()

const currentLang = computed(() => cvStore.uiLanguage || 'English')
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      v-for="item in promptList"
      :key="item.id"
      @click="promptsStore.selectPrompt(item.id)"
      :class="[
        'w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none group',
        promptsStore.activePromptId === item.id
          ? 'bg-primary-500/10 border-primary-500 shadow-md ring-1 ring-primary-500'
          : 'bg-theme-card border-theme-border/60 hover:bg-theme-hover hover:border-theme-border'
      ]"
    >
      <div
        :class="[
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          promptsStore.activePromptId === item.id
            ? 'bg-primary-500 text-white'
            : 'bg-theme-muted text-theme-text-muted group-hover:text-theme-text group-hover:bg-theme-muted/80'
        ]"
      >
        <UIcon :name="item.icon" class="w-5 h-5" />
      </div>
      <div class="min-w-0 flex-1">
        <h4
          :class="[
            'text-sm font-extrabold transition-colors',
            promptsStore.activePromptId === item.id ? 'text-primary-600 dark:text-primary-400' : 'text-theme-text'
          ]"
        >
          {{ currentLang === 'Vietnamese' ? item.title.Vietnamese : item.title.English }}
        </h4>
        <p class="text-xs text-theme-text-muted mt-1 leading-relaxed line-clamp-2">
          {{ currentLang === 'Vietnamese' ? item.description.Vietnamese : item.description.English }}
        </p>
      </div>
    </button>
  </div>
</template>

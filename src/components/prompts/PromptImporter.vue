<script setup lang="ts">
import { usePromptsStore } from '@/stores/prompts'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const promptsStore = usePromptsStore()
const cvStore = useCVStore()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3 bg-theme-muted/30 border border-theme-border/60 rounded-xl p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-bold text-theme-text flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
        <UIcon name="i-lucide-import" class="w-4 h-4 text-primary-500" />
        {{ t('json_input_title') || 'Load CV from JSON' }}
      </h4>
      <span class="text-[10px] text-theme-text-muted font-medium select-none">
        {{ cvStore.uiLanguage === 'Vietnamese' ? 'Paste kết quả JSON từ AI vào đây' : 'Paste the AI JSON output here' }}
      </span>
    </div>

    <textarea
      id="json-prompt-input"
      v-model="promptsStore.importJsonText"
      class="w-full font-mono text-[10px] bg-theme-card border border-theme-border rounded-lg p-2.5 text-theme-text focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 h-28 resize-none shadow-inner leading-normal"
      :placeholder="`{ &quot;cv&quot;: { ... }, &quot;coverLetter&quot;: { ... } }`"
    ></textarea>

    <div class="flex items-center gap-3">
      <button
        id="import-json-prompt-btn"
        @click="promptsStore.importJson()"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
      >
        <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
        {{ cvStore.uiLanguage === 'Vietnamese' ? 'Import vào CV & Cover Letter' : 'Import to CV & Cover Letter' }}
      </button>

      <span
        v-if="promptsStore.importError"
        class="text-xs text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1"
      >
        <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5" />
        {{ t(promptsStore.importError as any) || promptsStore.importError }}
      </span>
      <span
        v-if="promptsStore.importSuccess"
        class="text-xs text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1"
      >
        <UIcon name="i-lucide-check" class="w-3.5 h-3.5" />
        {{ t('loaded_success') || 'Loaded CV JSON successfully!' }}
      </span>
    </div>
  </div>
</template>

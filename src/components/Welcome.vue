<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const emit = defineEmits<{ (e: 'ai'): void; (e: 'import'): void; (e: 'blank'): void }>()
const store = useCVStore()
const { t } = useI18n()
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-3xl mx-auto px-4 py-10 sm:py-16 flex flex-col gap-8">
      <div class="flex flex-col gap-2 text-center">
        <h1 class="text-2xl sm:text-3xl font-semibold text-highlighted text-balance">{{ t('welcome_title') }}</h1>
        <p class="text-sm text-muted text-balance">{{ t('welcome_desc') }}</p>
      </div>

      <div class="grid sm:grid-cols-3 gap-3">
        <button type="button" class="start-card primary" @click="emit('ai')">
          <UIcon name="i-lucide-sparkles" class="size-5" />
          <span class="font-semibold">{{ t('welcome_ai') }}</span>
          <span class="text-xs opacity-80">{{ t('welcome_ai_desc') }}</span>
        </button>
        <button type="button" class="start-card" @click="emit('import')">
          <UIcon name="i-lucide-clipboard-paste" class="size-5" />
          <span class="font-semibold">{{ t('welcome_import') }}</span>
          <span class="text-xs text-muted">{{ t('welcome_import_desc') }}</span>
        </button>
        <button type="button" class="start-card" @click="store.loadSample()">
          <UIcon name="i-lucide-file-text" class="size-5" />
          <span class="font-semibold">{{ t('welcome_sample') }}</span>
          <span class="text-xs text-muted">{{ t('welcome_sample_desc') }}</span>
        </button>
      </div>

      <div class="text-center">
        <UButton variant="link" color="neutral" :label="t('welcome_blank')" trailing-icon="i-lucide-arrow-right" @click="emit('blank')" />
      </div>

      <ul class="grid sm:grid-cols-3 gap-4 text-xs text-muted">
        <li class="flex gap-2"><UIcon name="i-lucide-shield-check" class="size-4 shrink-0 text-primary" />{{ t('welcome_point_private') }}</li>
        <li class="flex gap-2"><UIcon name="i-lucide-scan-text" class="size-4 shrink-0 text-primary" />{{ t('welcome_point_ats') }}</li>
        <li class="flex gap-2"><UIcon name="i-lucide-bot" class="size-4 shrink-0 text-primary" />{{ t('welcome_point_agents') }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.start-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  text-align: left;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 120ms, transform 120ms;
}
.start-card:hover {
  border-color: var(--ui-primary);
  transform: translateY(-1px);
}
.start-card.primary {
  background: var(--ui-primary);
  border-color: var(--ui-primary);
  color: var(--ui-bg);
}
</style>

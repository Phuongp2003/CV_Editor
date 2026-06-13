<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import RichTextEditor from '@/components/RichTextEditor.vue'

const store = useCVStore()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-xs text-theme-text-muted">
      {{ t('objective_title') }}
      <span class="text-theme-text-muted">(supports *italic*, **bold**, and <u>underline</u>)</span>
    </label>
    <RichTextEditor
      v-model="store.cvData.objective"
      :placeholder="t('objective_placeholder')"
      editor-class="min-h-[140px]"
    />
  </div>
</template>

<style scoped>
/* Scoped styles */
</style>

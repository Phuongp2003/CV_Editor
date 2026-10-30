<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useImport } from '@/composables/useImport'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
const isOpen = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

const { t } = useI18n()
const { importText } = useImport()
const text = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file && (await importText(await file.text()))) isOpen.value = false
}

async function onPasteImport() {
  if (await importText(text.value)) {
    text.value = ''
    isOpen.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('import_title')" :description="t('import_desc')">
    <template #body>
      <div class="flex flex-col gap-4">
        <label
          class="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-default p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <input type="file" accept=".json,application/json,.txt" class="sr-only" @change="onFile" />
          <UIcon name="i-lucide-file-json" class="size-8 text-muted" />
          <span class="text-sm font-semibold text-highlighted">{{ t('import_pick_file') }}</span>
          <span class="text-xs text-muted">{{ t('import_pick_hint') }}</span>
        </label>
        <USeparator :label="t('or')" />
        <UTextarea v-model="text" :rows="6" autoresize :maxrows="12" :placeholder="t('import_paste_placeholder')" class="w-full font-mono" />
        <UButton block icon="i-lucide-import" :label="t('ai_import')" :disabled="!text.trim()" @click="onPasteImport" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const store = useCVStore()
const { t } = useI18n()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const importMode = ref<'file' | 'text'>('file')
const pastedJsonText = ref('')
const errorMsg = ref('')
const successMsg = ref('')

function handleFileChange(e: Event) {
  errorMsg.value = ''
  successMsg.value = ''
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const text = event.target?.result as string
      processJson(text)
    } catch (err) {
      errorMsg.value = 'invalid_json'
    }
  }
  reader.readAsText(file)
}

function processJson(rawText: string) {
  let cleaned = rawText.trim()
  
  // Strip BOM
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1).trim()
  }

  // Extract from markdown code block if present
  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
  const match = cleaned.match(markdownRegex)
  if (match && match[1]) {
    cleaned = match[1].trim()
  }

  try {
    const obj = JSON.parse(cleaned)
    const hasCvField = obj && typeof obj === 'object' && ('cv' in obj || 'name' in obj || 'experiences' in obj || 'skills' in obj || 'coverLetter' in obj)
    if (!obj || !hasCvField) {
      errorMsg.value = 'invalid_format'
      return
    }
    store.loadCv(obj)
    successMsg.value = 'loaded_success'
    pastedJsonText.value = ''
    setTimeout(() => {
      isOpen.value = false
      successMsg.value = ''
    }, 1200)
  } catch (err) {
    errorMsg.value = 'invalid_json'
  }
}

function importFromText() {
  errorMsg.value = ''
  successMsg.value = ''
  if (!pastedJsonText.value.trim()) {
    errorMsg.value = 'no_json'
    return
  }
  processJson(pastedJsonText.value)
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :overlay="true"
    :modal="true"
    :title="store.uiLanguage === 'Vietnamese' ? 'Nhập dữ liệu CV & Cover Letter' : 'Import CV & Cover Letter Data'"
    class="max-w-md w-full"
  >
    <template #body>
      <div class="space-y-5 py-2 text-theme-text-sub">
        <!-- Selector Tab -->
        <div class="flex border-b border-theme-border/60 pb-px">
          <button
            @click="importMode = 'file'"
            :class="[
              'flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition cursor-pointer',
              importMode === 'file'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-theme-text-muted hover:text-theme-text'
            ]"
          >
            {{ store.uiLanguage === 'Vietnamese' ? 'Import từ File (.json)' : 'Import from File (.json)' }}
          </button>
          <button
            @click="importMode = 'text'"
            :class="[
              'flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition cursor-pointer',
              importMode === 'text'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-theme-text-muted hover:text-theme-text'
            ]"
          >
            {{ store.uiLanguage === 'Vietnamese' ? 'Dán mã JSON' : 'Paste JSON Text' }}
          </button>
        </div>

        <!-- Mode: File Upload -->
        <div v-if="importMode === 'file'" class="flex flex-col items-center justify-center border-2 border-dashed border-theme-border/80 hover:border-primary-500/50 rounded-xl p-8 transition-colors bg-theme-muted/10 relative">
          <input
            id="json-file-picker"
            type="file"
            accept=".json"
            class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            @change="handleFileChange"
          />
          <UIcon name="i-lucide-file-json" class="w-10 h-10 text-theme-text-muted mb-3 group-hover:text-primary-500" />
          <p class="text-xs text-theme-text font-bold text-center">
            {{ store.uiLanguage === 'Vietnamese' ? 'Kéo thả hoặc click để chọn File JSON' : 'Drag & drop or click to select JSON File' }}
          </p>
          <p class="text-[10px] text-theme-text-muted mt-1 text-center">
            {{ store.uiLanguage === 'Vietnamese' ? 'Chỉ hỗ trợ file .json xuất từ phần mềm' : 'Supports .json files exported from this editor' }}
          </p>
        </div>

        <!-- Mode: Text Paste -->
        <div v-else class="space-y-3">
          <textarea
            v-model="pastedJsonText"
            class="w-full font-mono text-[10px] bg-theme-card border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 h-36 resize-none shadow-inner leading-normal"
            :placeholder="store.uiLanguage === 'Vietnamese' ? 'Dán mã JSON CV hoặc Cover Letter vào đây...' : 'Paste CV/Cover Letter JSON code here...'"
          ></textarea>
          
          <button
            @click="importFromText"
            class="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md select-none text-center"
          >
            {{ store.uiLanguage === 'Vietnamese' ? 'Import dữ liệu' : 'Import Data' }}
          </button>
        </div>

        <!-- Status messages -->
        <div v-if="errorMsg || successMsg" class="flex justify-center pt-2">
          <span v-if="errorMsg" class="text-xs text-rose-500 font-bold flex items-center gap-1">
            <UIcon name="i-lucide-alert-triangle" class="w-4 h-4" />
            {{ t(errorMsg as any) || errorMsg }}
          </span>
          <span v-if="successMsg" class="text-xs text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1">
            <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
            {{ t(successMsg as any) || 'Loaded successfully!' }}
          </span>
        </div>
      </div>
    </template>
  </UModal>
</template>

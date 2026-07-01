<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { promptList } from '@/prompts'
import { usePromptsStore } from '@/stores/prompts'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const promptsStore = usePromptsStore()
const cvStore = useCVStore()
const { t } = useI18n()

const currentPrompt = computed(() => {
  const found = promptList.find(p => p.id === promptsStore.activePromptId)
  return (found || promptList[0]) as typeof promptList[0]
})

const activeLang = computed(() => promptsStore.promptLanguage)
const targetLang = computed(() => cvStore.language || 'English')

// Replace {TARGET_LANGUAGE} placeholder in the template
const promptText = computed(() => {
  const template = activeLang.value === 'English'
    ? promptsStore.activePromptTemplate.English
    : promptsStore.activePromptTemplate.Vietnamese
  return (template || '').replace(/{TARGET_LANGUAGE}/g, targetLang.value)
})

// Clean Gems Link (remove line breaks if any)
const gemsLink = computed(() => {
  const rawLink = activeLang.value === 'English'
    ? promptsStore.activeGemsLink.English
    : promptsStore.activeGemsLink.Vietnamese
  return (rawLink || '').trim()
})

const hasViPrompt = computed(() => !!promptsStore.activePromptTemplate.Vietnamese?.trim())
const hasEnPrompt = computed(() => !!promptsStore.activePromptTemplate.English?.trim())
const hasGemsLink = computed(() => !!gemsLink.value.trim())

// Watch prompt to auto-switch language if one of them is empty
watch(() => promptsStore.activePromptTemplate, (newTemplate) => {
  const hasVi = !!newTemplate.Vietnamese?.trim()
  const hasEn = !!newTemplate.English?.trim()
  if (hasVi && !hasEn) {
    promptsStore.promptLanguage = 'Vietnamese'
  } else if (hasEn && !hasVi) {
    promptsStore.promptLanguage = 'English'
  }
}, { deep: true, immediate: true })

const copyBtnText = ref('copy_prompt')
function copyPrompt() {
  navigator.clipboard.writeText(promptText.value)
  copyBtnText.value = 'copied'
  setTimeout(() => {
    copyBtnText.value = 'copy_prompt'
  }, 2000)
}

const copyGemsBtnText = ref('copy_link')
function copyGemsLink() {
  navigator.clipboard.writeText(gemsLink.value)
  copyGemsBtnText.value = 'copied'
  setTimeout(() => {
    copyGemsBtnText.value = 'copy_link'
  }, 2000)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Spinner Loader State -->
    <div v-if="promptsStore.isLoading" class="flex-1 flex flex-col items-center justify-center py-20 text-theme-text-muted gap-3 select-none">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
      <span class="text-xs font-bold">{{ cvStore.uiLanguage === 'Vietnamese' ? 'Đang tải prompt hệ thống...' : 'Loading system prompt...' }}</span>
    </div>

    <!-- Loaded Prompt Content -->
    <div v-else class="flex flex-col gap-4 text-theme-text-sub h-full animate-fade-in">
      <!-- Sticky Header Details -->
      <div class="sticky top-0 bg-theme-card dark:bg-theme-card z-10 py-3 border-b border-theme-border/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] px-1 rounded-t-lg">
        <div class="flex items-center gap-3">
          <UIcon :name="currentPrompt.icon" class="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div class="flex items-center gap-1.5 flex-wrap">
            <h3 class="text-sm font-bold text-theme-text mr-1.5">
              {{ cvStore.uiLanguage === 'Vietnamese' ? currentPrompt.title.Vietnamese : currentPrompt.title.English }}
            </h3>
            
            <!-- Gems Badge Pill (Viên thuốc) - Hidden if empty -->
            <a
              v-if="hasGemsLink"
              :href="gemsLink"
              target="_blank"
              class="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white text-[10px] font-extrabold rounded-full shadow-sm transition-all duration-150 transform hover:scale-105 active:scale-95 cursor-pointer select-none"
              :title="cvStore.uiLanguage === 'Vietnamese' ? 'Mở trực tiếp trong Gemini Gems' : 'Open directly in Gemini Gems'"
            >
              <UIcon name="i-lucide-gem" class="w-3 h-3 text-white animate-pulse" />
              <span>Gems</span>
              <UIcon name="i-lucide-external-link" class="w-2.5 h-2.5" />
            </a>

            <!-- Copy Gem Link Pill (Viên thuốc) - Hidden if empty -->
            <button
              v-if="hasGemsLink"
              @click="copyGemsLink"
              class="inline-flex items-center gap-1 px-3 py-1 bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text text-[10px] font-bold rounded-full shadow-sm transition active:scale-95 cursor-pointer select-none"
            >
              <UIcon name="i-lucide-copy" class="w-3 h-3" />
              <span>{{ copyGemsBtnText === 'copied' ? (cvStore.uiLanguage === 'Vietnamese' ? 'Đã copy!' : 'Copied!') : (cvStore.uiLanguage === 'Vietnamese' ? 'Copy Gem Link' : 'Copy Gem Link') }}</span>
            </button>
          </div>
        </div>

        <!-- Action Toggles -->
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <!-- Show/Hide Guide Toggle -->
          <button
            @click="promptsStore.showGuide = !promptsStore.showGuide"
            class="px-2.5 py-1 bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub rounded-full text-[10px] font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm select-none"
          >
            <UIcon :name="promptsStore.showGuide ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-3.5 h-3.5" />
            <span>{{ promptsStore.showGuide ? (cvStore.uiLanguage === 'Vietnamese' ? 'Ẩn Hướng dẫn' : 'Hide Guide') : (cvStore.uiLanguage === 'Vietnamese' ? 'Hiện Hướng dẫn' : 'Show Guide') }}</span>
          </button>

          <!-- Prompt Language Toggle - Hidden if only 1 language exists -->
          <div v-if="hasViPrompt && hasEnPrompt" class="flex items-center gap-0.5 bg-theme-muted border border-theme-border p-0.5 rounded-lg select-none">
            <button
              @click="promptsStore.toggleLanguage('English')"
              :class="[
                'px-2 py-1 text-[9px] font-extrabold rounded-md transition cursor-pointer',
                activeLang === 'English' ? 'bg-primary-600 text-white shadow-sm' : 'text-theme-text-muted hover:text-theme-text'
              ]"
            >
              EN
            </button>
            <button
              @click="promptsStore.toggleLanguage('Vietnamese')"
              :class="[
                'px-2 py-1 text-[9px] font-extrabold rounded-md transition cursor-pointer',
                activeLang === 'Vietnamese' ? 'bg-primary-600 text-white shadow-sm' : 'text-theme-text-muted hover:text-theme-text'
              ]"
            >
              VI
            </button>
          </div>
        </div>
      </div>

      <!-- System Prompt View & Copy -->
      <div class="flex-1 flex flex-col min-h-[280px] gap-2">
        <div class="flex items-center justify-between">
          <label class="text-[10px] font-extrabold text-theme-text-muted uppercase tracking-wider select-none">
            System Prompt Template (Target CV: {{ targetLang }})
          </label>
          <button
            @click="copyPrompt"
            class="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white hover:text-white rounded-lg text-xs font-bold transition duration-150 cursor-pointer shadow-md active:scale-95"
          >
            <UIcon name="i-lucide-copy" class="w-3.5 h-3.5" />
            {{ copyBtnText === 'copied' ? (cvStore.uiLanguage === 'Vietnamese' ? 'Đã copy!' : 'Copied!') : (cvStore.uiLanguage === 'Vietnamese' ? 'Sao chép Prompt' : 'Copy Prompt') }}
          </button>
        </div>
        <textarea
          class="w-full flex-1 font-mono text-[10px] bg-theme-muted/50 border border-theme-border rounded-xl p-3 text-theme-text-sub focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none shadow-inner leading-relaxed"
          readonly
          :value="promptText"
        ></textarea>
      </div>
    </div>
  </div>
</template>

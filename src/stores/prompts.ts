import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useCVStore } from '@/stores/cv'
import type { PromptId } from '@/prompts'

function preprocessJsonText(raw: string) {
  let cleaned = raw.trim()
  
  // Strip BOM if present
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1).trim()
  }

  // Robustly extract JSON from markdown code blocks
  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
  const match = cleaned.match(markdownRegex)
  if (match && match[1]) {
    cleaned = match[1].trim()
  } else {
    // Extract JSON block if surrounded by conversational text
    const firstBrace = cleaned.indexOf('{')
    const firstBracket = cleaned.indexOf('[')
    const lastBrace = cleaned.lastIndexOf('}')
    const lastBracket = cleaned.lastIndexOf(']')
    
    let startIdx = -1
    let endIdx = -1
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace
      endIdx = lastBrace
    } else if (firstBracket !== -1) {
      startIdx = firstBracket
      endIdx = lastBracket
    }
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1).trim()
    }
  }

  cleaned = cleaned.replace(/\[cite_start\]/g, '')
  cleaned = cleaned.replace(/\[cite:[^\]]*\]/g, '')
  return cleaned
}

export const usePromptsStore = defineStore('prompts', () => {
  const activePromptId = ref<PromptId>('se')
  const promptLanguage = ref<'English' | 'Vietnamese'>('Vietnamese')
  const isModalOpen = ref(false)
  const importJsonText = ref('')
  const importError = ref('')
  const importSuccess = ref(false)
  const showGuide = ref(true)
  
  const activePromptTemplate = ref({ English: '', Vietnamese: '' })
  const activeGemsLink = ref({ English: '', Vietnamese: '' })
  const isLoading = ref(false)

  const cvStore = useCVStore()

  async function loadPromptContent() {
    const id = activePromptId.value
    isLoading.value = true
    
    const v = import.meta.env.VITE_BUILD_TIMESTAMP || Date.now().toString()
    const baseUrl = import.meta.env.BASE_URL || '/'

    try {
      const [viPrompt, enPrompt, viGems, enGems] = await Promise.all([
        fetch(`${baseUrl}prompts/${id}/prompts/vi.txt?v=${v}`).then(r => r.ok ? r.text() : ''),
        fetch(`${baseUrl}prompts/${id}/prompts/en.txt?v=${v}`).then(r => r.ok ? r.text() : ''),
        fetch(`${baseUrl}prompts/${id}/gems/vi.txt?v=${v}`).then(r => r.ok ? r.text() : ''),
        fetch(`${baseUrl}prompts/${id}/gems/en.txt?v=${v}`).then(r => r.ok ? r.text() : '')
      ])

      activePromptTemplate.value = {
        English: enPrompt,
        Vietnamese: viPrompt
      }
      activeGemsLink.value = {
        English: enGems,
        Vietnamese: viGems
      }
    } catch (e) {
      console.error('Failed to load prompt files:', e)
    } finally {
      isLoading.value = false
    }
  }

  // Load when selected prompt changes
  watch(activePromptId, () => {
    loadPromptContent()
  }, { immediate: true })

  function selectPrompt(id: PromptId) {
    activePromptId.value = id
  }

  function toggleLanguage(lang: 'English' | 'Vietnamese') {
    promptLanguage.value = lang
  }

  function openModal(id?: PromptId) {
    if (id) {
      activePromptId.value = id
    }
    // Match prompt language to UI language if not manually overridden yet
    if (cvStore.uiLanguage === 'English') {
      promptLanguage.value = 'English'
    } else {
      promptLanguage.value = 'Vietnamese'
    }
    isModalOpen.value = true
    importError.value = ''
    importSuccess.value = false
    importJsonText.value = ''
  }

  function closeModal() {
    isModalOpen.value = false
  }

  function importJson() {
    importError.value = ''
    importSuccess.value = false
    const raw = importJsonText.value.trim()
    if (!raw) {
      importError.value = 'no_json'
      return
    }
    const clean = preprocessJsonText(raw)
    try {
      const obj = JSON.parse(clean)
      const hasCvField = obj && typeof obj === 'object' && (
        'cv' in obj || 'name' in obj || 'experiences' in obj || 'skills' in obj || 'coverLetter' in obj
      )
      if (!obj || !hasCvField) {
        importError.value = 'invalid_format'
        return
      }
      cvStore.loadCv(obj)
      importSuccess.value = true
      importJsonText.value = ''
      setTimeout(() => {
        closeModal()
      }, 1000)
    } catch (e) {
      console.error('Failed to parse or load JSON:', e)
      importError.value = 'invalid_json'
    }
  }

  return {
    activePromptId,
    promptLanguage,
    isModalOpen,
    importJsonText,
    importError,
    importSuccess,
    showGuide,
    activePromptTemplate,
    activeGemsLink,
    isLoading,
    selectPrompt,
    toggleLanguage,
    openModal,
    closeModal,
    importJson
  }
})

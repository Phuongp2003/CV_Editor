<script setup lang="ts">
import { ref } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import type { CVData, BulletChars, SectionKey } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

// ─── Profile Presets System ───
interface ProfilePreset {
  cvData: CVData
  language: string
  sizeMultiplier: number
  selectedFont: string
  customFontName: string
  bulletChars: BulletChars
  customSectionLabels: Record<string, string>
  disabledSections: SectionKey[]
  sectionsOrder: SectionKey[]
}

const STORAGE_KEY = 'profileData'

function loadPresetsFromStorage(): (ProfilePreset | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        while (parsed.length < 7) parsed.push(null)
        return parsed
      }
    }
  } catch (e) {
    console.error('Error loading profiles:', e)
  }
  return Array(7).fill(null)
}

const selectedSlot = ref(0)
const presets = ref<(ProfilePreset | null)[]>(loadPresetsFromStorage())
const presetStatus = ref('')
const presetStatusType = ref<'success' | 'error' | ''>('')

function showPresetMessage(msg: string, isError = false) {
  presetStatus.value = msg
  presetStatusType.value = isError ? 'error' : 'success'
  setTimeout(() => {
    presetStatus.value = ''
    presetStatusType.value = ''
  }, 3000)
}

function getPresetDisplayName(preset: any): string {
  if (!preset) return ''
  const name = preset.cvData ? preset.cvData.name || 'No Name' : preset.name || 'No Name'
  const lang = preset.language || 'English'
  return `${name} - ${lang}`
}

function savePreset() {
  const slotIdx = selectedSlot.value

  // Deep clone references to prevent side effects
  const currentPreset: ProfilePreset = {
    cvData: JSON.parse(JSON.stringify(store.cvData)),
    language: store.language,
    sizeMultiplier: store.sizeMultiplier,
    selectedFont: store.selectedFont,
    customFontName: store.customFontName,
    bulletChars: JSON.parse(JSON.stringify(store.bulletChars)),
    customSectionLabels: JSON.parse(JSON.stringify(store.customSectionLabels)),
    disabledSections: [...store.disabledSections],
    sectionsOrder: [...store.sectionsOrder],
  }

  presets.value[slotIdx] = currentPreset
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value))
  showPresetMessage(`Saved to Slot ${slotIdx + 1}!`)
}

function loadPreset() {
  const slotIdx = selectedSlot.value
  const preset = presets.value[slotIdx]
  if (!preset) {
    showPresetMessage(`Slot ${slotIdx + 1} is empty!`, true)
    return
  }

  // Load new format
  if (preset.cvData) {
    store.cvData = JSON.parse(JSON.stringify(preset.cvData))
    store.language = preset.language || 'English'
    store.sizeMultiplier = preset.sizeMultiplier ?? 1.0
    store.selectedFont = preset.selectedFont || 'notosans'
    store.customFontName = preset.customFontName || ''
    if (preset.bulletChars) {
      store.bulletChars = JSON.parse(JSON.stringify(preset.bulletChars))
    }
    if (preset.customSectionLabels) {
      store.customSectionLabels = JSON.parse(JSON.stringify(preset.customSectionLabels))
    }
    if (preset.disabledSections) {
      store.disabledSections = [...preset.disabledSections]
    }
    if (preset.sectionsOrder) {
      store.sectionsOrder = [...preset.sectionsOrder]
    }
  } else {
    // Migration fallback for older presets
    const old = preset as any
    store.cvData.name = old.name || ''
    store.cvData.email = old.email || ''
    store.cvData.phone = old.phone || ''
    store.cvData.location = old.location || ''
    store.cvData.github = old.github || ''
    store.cvData.linkedin = old.linkedin || ''
    store.cvData.website = old.website || ''
    store.cvData.profileImage = old.profileImage || null
    store.cvData.profileImageType = old.profileImageType || null
    store.language = old.language || 'English'
  }

  showPresetMessage(`Loaded from Slot ${slotIdx + 1}!`)
}

function deletePreset() {
  const slotIdx = selectedSlot.value
  if (!presets.value[slotIdx]) {
    showPresetMessage(`Slot ${slotIdx + 1} is already empty!`, true)
    return
  }

  presets.value[slotIdx] = null
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value))
  showPresetMessage(`Deleted Slot ${slotIdx + 1}!`)
}
</script>

<template>
  <UPopover :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
    <button
      class="bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
      :title="
        store.uiLanguage === 'Vietnamese' ? 'Quản lý các bản lưu hồ sơ' : 'Manage profile presets'
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-4 h-4 text-theme-secondary"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm-1.2 6.477a6 6 0 0 0-5.1 0A2.25 2.25 0 0 1 2.25 13.611V12.75a2.25 2.25 0 0 1 2.25-2.25h1.5a2.25 2.25 0 0 1 2.25 2.25v.861a2.25 2.25 0 0 1-1.35 2.066Z"
        />
      </svg>
      <span>{{ store.uiLanguage === 'Vietnamese' ? 'Hồ Sơ Lưu' : 'Presets' }}</span>
    </button>

    <template #content>
      <div
        class="p-4 w-72 space-y-4 bg-theme-card border border-theme-border rounded-xl shadow-2xl text-theme-text-sub"
      >
        <h4
          class="text-xs font-bold text-theme-text flex items-center gap-1.5 border-b border-theme-border pb-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4 text-indigo-500 dark:text-indigo-400"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm-1.2 6.477a6 6 0 0 0-5.1 0A2.25 2.25 0 0 1 2.25 13.611V12.75a2.25 2.25 0 0 1 2.25-2.25h1.5a2.25 2.25 0 0 1 2.25 2.25v.861a2.25 2.25 0 0 1-1.35 2.066Z"
            />
          </svg>
          Profile Slots (Presets)
        </h4>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider"
            >Select Save Slot</label
          >
          <select
            v-model="selectedSlot"
            class="w-full bg-theme-card border border-theme-border rounded-lg p-2 text-theme-text text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm"
          >
            <option v-for="(preset, index) in presets" :key="index" :value="index">
              Slot {{ index + 1 }} {{ preset ? `(${getPresetDisplayName(preset)})` : '(Empty)' }}
            </option>
          </select>
        </div>

        <div class="flex gap-2 pt-1">
          <button
            @click="savePreset"
            class="flex-1 py-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md select-none text-center"
          >
            Save Current
          </button>
          <button
            @click="loadPreset"
            class="flex-1 py-1.5 bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text font-bold rounded-lg text-xs transition cursor-pointer shadow-sm select-none text-center"
          >
            Load Preset
          </button>
          <button
            @click="deletePreset"
            class="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md select-none text-center"
            title="Delete preset slot"
          >
            Delete
          </button>
        </div>

        <!-- Status message -->
        <p
          v-if="presetStatus"
          :class="[
            'text-xs font-semibold transition-all duration-150',
            presetStatusType === 'error'
              ? 'text-rose-500'
              : 'text-primary-600 dark:text-primary-400',
          ]"
        >
          {{ presetStatus }}
        </p>
      </div>
    </template>
  </UPopover>
</template>

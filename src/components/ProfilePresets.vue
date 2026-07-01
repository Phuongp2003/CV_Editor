<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import type { CVData, CoverLetterData, BulletChars, SectionKey } from '@/types/cv'

const props = defineProps<{
  open: boolean
  mode: 'load' | 'save'
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const store = useCVStore()
const { t } = useI18n()

// ─── Profile Presets System ───
interface ProfilePreset {
  presetName?: string
  cvData: CVData
  coverLetterData?: CoverLetterData
  language: string
  sizeMultiplier: number
  selectedFont: string
  customFontName: string
  bulletChars: BulletChars
  customSectionLabels: Record<string, string>
  disabledSections: SectionKey[]
  sectionsOrder: SectionKey[]
  experienceHeaderStyle?: 'classic' | 'role-company'
}

const STORAGE_KEY = 'profileData'

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

function loadPresetsFromStorage(): (ProfilePreset | null)[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          while (parsed.length < 7) parsed.push(null)
          return parsed
        }
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
const presetNameInput = ref('')

function updatePresetNameInput() {
  const slotIdx = selectedSlot.value
  const preset = presets.value[slotIdx]
  if (preset) {
    presetNameInput.value = preset.presetName || preset.cvData?.name || `Profile ${slotIdx + 1}`
  } else {
    presetNameInput.value = store.cvData?.name || `Profile ${slotIdx + 1}`
  }
}

watch(selectedSlot, () => {
  updatePresetNameInput()
})

// Refresh presets when modal opens
watch(() => props.open, (newVal) => {
  if (newVal) {
    presets.value = loadPresetsFromStorage()
    updatePresetNameInput()
  }
})

onMounted(() => {
  updatePresetNameInput()
})

function showPresetMessage(msg: string, isError = false) {
  presetStatus.value = msg
  presetStatusType.value = isError ? 'error' : 'success'
  setTimeout(() => {
    presetStatus.value = ''
    presetStatusType.value = ''
  }, 3000)
}

function getPresetDisplayName(preset: ProfilePreset): string {
  if (preset.presetName) return preset.presetName
  const name = preset.cvData ? preset.cvData.name || 'No Name' : 'No Name'
  const lang = preset.language || 'English'
  return `${name} - ${lang}`
}

function savePreset() {
  const slotIdx = selectedSlot.value
  const nameToSave = presetNameInput.value.trim() || store.cvData.name || `Profile ${slotIdx + 1}`

  const currentPreset: ProfilePreset = {
    presetName: nameToSave,
    cvData: JSON.parse(JSON.stringify(store.cvData)),
    coverLetterData: JSON.parse(JSON.stringify(store.coverLetterData)),
    language: store.language,
    sizeMultiplier: store.sizeMultiplier,
    selectedFont: store.selectedFont,
    customFontName: store.customFontName,
    bulletChars: JSON.parse(JSON.stringify(store.bulletChars)),
    customSectionLabels: JSON.parse(JSON.stringify(store.customSectionLabels)),
    disabledSections: [...store.disabledSections],
    sectionsOrder: [...store.sectionsOrder],
    experienceHeaderStyle: store.experienceHeaderStyle,
  }

  presets.value[slotIdx] = currentPreset
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value))
  }
  showPresetMessage(t('preset_saved_to_slot').replace('{slot}', String(slotIdx + 1)))
  setTimeout(() => {
    isOpen.value = false
  }, 1000)
}

function loadPreset() {
  const slotIdx = selectedSlot.value
  const preset = presets.value[slotIdx]
  if (!preset) {
    showPresetMessage(t('preset_slot_empty').replace('{slot}', String(slotIdx + 1)), true)
    return
  }

  if (preset.cvData) {
    store.cvData = JSON.parse(JSON.stringify(preset.cvData))
    if (preset.coverLetterData) {
      store.coverLetterData = JSON.parse(JSON.stringify(preset.coverLetterData))
    } else {
      store.coverLetterData = {
        header: {
          senderName: store.cvData.name || '',
          senderEmail: store.cvData.email || '',
          senderPhone: store.cvData.phone || '',
          senderLocation: store.cvData.location || '',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          recipientName: '',
          recipientTitle: '',
          recipientEmail: '',
          companyName: '',
          companyAddress: '',
        },
        greeting: '',
        openingParagraph: '',
        bodyParagraphs: [''],
        closingParagraph: '',
        signOff: '',
      }
    }
    store.language = preset.language || 'English'
    store.sizeMultiplier = preset.sizeMultiplier ?? 1.0
    if (preset.customSectionLabels) {
      store.customSectionLabels = JSON.parse(JSON.stringify(preset.customSectionLabels))
    }
    if (preset.disabledSections) {
      store.disabledSections = [...preset.disabledSections]
    }
    if (preset.sectionsOrder) {
      store.sectionsOrder = [...preset.sectionsOrder]
    }
  }
  updatePresetNameInput()
  showPresetMessage(t('preset_loaded_from_slot').replace('{slot}', String(slotIdx + 1)))
  setTimeout(() => {
    isOpen.value = false
  }, 1000)
}

function deletePreset() {
  const slotIdx = selectedSlot.value
  if (!presets.value[slotIdx]) {
    showPresetMessage(t('preset_already_empty').replace('{slot}', String(slotIdx + 1)), true)
    return
  }

  presets.value[slotIdx] = null
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value))
  }
  updatePresetNameInput()
  showPresetMessage(t('preset_deleted_slot').replace('{slot}', String(slotIdx + 1)))
}

function handleInputClick(e: Event) {
  const target = e.target as HTMLInputElement
  target.select()
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :overlay="true"
    :modal="true"
    :title="props.mode === 'save' 
      ? (store.uiLanguage === 'Vietnamese' ? 'Lưu hồ sơ hiện tại' : 'Save Current Profile')
      : (store.uiLanguage === 'Vietnamese' ? 'Tải hồ sơ đã lưu' : 'Load Saved Profile')"
    class="max-w-xl w-full"
  >
    <template #body>
      <div class="space-y-5 py-2 text-theme-text-sub">
        <!-- Visual Grid of Slots -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="(preset, index) in presets"
            :key="index"
            @click="selectedSlot = index"
            :class="[
              'p-3.5 border rounded-xl transition duration-150 cursor-pointer flex flex-col gap-1 relative group select-none',
              selectedSlot === index
                ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500 shadow-sm'
                : 'border-theme-border hover:border-theme-border-hover bg-theme-muted/30 hover:bg-theme-muted/50'
            ]"
          >
            <!-- Checkmark badge for selected slot -->
            <div
              v-if="selectedSlot === index"
              class="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center text-white"
            >
              <UIcon name="i-lucide-check" class="w-3 h-3" />
            </div>

            <div class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded bg-theme-element border border-theme-border flex items-center justify-center text-[10px] font-extrabold text-theme-text-muted">
                {{ index + 1 }}
              </span>
              <span class="text-xs font-bold text-theme-text truncate max-w-[130px]">
                {{ preset ? getPresetDisplayName(preset) : (store.uiLanguage === 'Vietnamese' ? 'Khe trống' : 'Empty Slot') }}
              </span>
            </div>

            <div class="text-[10px] text-theme-text-muted font-medium mt-1">
              <span v-if="preset">
                {{ preset.cvData.email || 'No email' }}
              </span>
              <span v-else>
                {{ store.uiLanguage === 'Vietnamese' ? 'Bấm để chọn lưu vào đây' : 'Click to select this slot' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Name Input Area for Save Mode -->
        <div v-if="props.mode === 'save'" class="flex flex-col gap-1.5 bg-theme-muted/30 border border-theme-border/60 rounded-xl p-4 shadow-inner">
          <label class="text-[10px] text-theme-text font-bold uppercase tracking-wider select-none">
            {{ store.uiLanguage === 'Vietnamese' ? 'Tên hiển thị bản lưu' : 'Display Name' }}
          </label>
          <input
            type="text"
            v-model="presetNameInput"
            @focus="handleInputClick"
            @click="handleInputClick"
            class="w-full bg-theme-card border border-theme-border rounded-lg px-3 py-2 text-theme-text text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm font-semibold"
            :placeholder="store.uiLanguage === 'Vietnamese' ? 'Nhập tên bản lưu...' : 'Enter preset name...'"
          />
        </div>

        <!-- Details of the slot if loaded -->
        <div v-if="props.mode === 'load' && presets[selectedSlot]" class="bg-theme-muted/30 border border-theme-border/60 rounded-xl p-4 text-xs space-y-1">
          <p class="font-bold text-theme-text">
            {{ store.uiLanguage === 'Vietnamese' ? 'Thông tin chi tiết bản lưu:' : 'Preset Details:' }}
          </p>
          <ul class="text-theme-text-muted space-y-0.5 list-disc pl-4 font-medium">
            <li>Candidate: {{ presets[selectedSlot]?.cvData?.name || 'N/A' }}</li>
            <li>Language: {{ presets[selectedSlot]?.language }}</li>
            <li>Font: {{ presets[selectedSlot]?.selectedFont }}</li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between border-t border-theme-border pt-4">
          <div>
            <button
              v-if="presets[selectedSlot]"
              @click="deletePreset"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md select-none text-center active:scale-95"
            >
              {{ store.uiLanguage === 'Vietnamese' ? 'Xóa bản lưu' : 'Delete Slot' }}
            </button>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="isOpen = false"
              class="px-4 py-2 bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub font-bold rounded-lg text-xs transition cursor-pointer shadow-sm select-none text-center active:scale-95"
            >
              {{ store.uiLanguage === 'Vietnamese' ? 'Hủy bỏ' : 'Cancel' }}
            </button>

            <button
              v-if="props.mode === 'save'"
              @click="savePreset"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md select-none text-center active:scale-95"
            >
              {{ store.uiLanguage === 'Vietnamese' ? 'Lưu hồ sơ' : 'Save Profile' }}
            </button>

            <button
              v-else
              @click="loadPreset"
              :disabled="!presets[selectedSlot]"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md select-none text-center active:scale-95"
            >
              {{ store.uiLanguage === 'Vietnamese' ? 'Tải hồ sơ' : 'Load Profile' }}
            </button>
          </div>
        </div>

        <!-- Status message -->
        <p
          v-if="presetStatus"
          :class="[
            'text-[11px] font-bold transition-all duration-150 text-center',
            presetStatusType === 'error'
              ? 'text-rose-500'
              : 'text-primary-600 dark:text-primary-400',
          ]"
        >
          {{ presetStatus }}
        </p>
      </div>
    </template>
  </UModal>
</template>

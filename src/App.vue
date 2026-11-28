<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { useI18n } from '@/composables/useI18n'
import { useCVStore } from '@/stores/cv'
import { useAudit } from '@/composables/useAudit'
import { useImport } from '@/composables/useImport'
import { installAgentApi } from '@/utils/agentApi'
import { buildShareLink, looksLikeCvJson, findHandoffLink } from '@/utils/handoff'
import type { AiTask } from '@/utils/aiPrompt'
import CVEditor from '@/components/CVEditor.vue'
import CVPlayer from '@/components/CVPlayer'
import CoverLetterEditor from '@/components/editor/CoverLetterEditor.vue'
import CoverLetterPlayer from '@/components/CVPlayer/CoverLetterPlayer.vue'
import SettingsDrawer from '@/components/SettingsDrawer.vue'
import ProfilePresets from '@/components/ProfilePresets.vue'
import ImportModal from '@/components/ImportModal.vue'
import DownloadMenu from '@/components/DownloadMenu.vue'
import AiHandoff from '@/components/AiHandoff.vue'
import CheckPanel from '@/components/CheckPanel.vue'
import Welcome from '@/components/Welcome.vue'

const store = useCVStore()
const { t } = useI18n()
const toast = useToast()
const { result: audit, scoreColor } = useAudit()
const { importText, importFromLocation } = useImport()

const isSettingsOpen = ref(false)
const isImportOpen = ref(false)
const isPresetOpen = ref(false)
const presetMode = ref<'load' | 'save'>('load')
const isAiOpen = ref(false)
const aiTask = ref<AiTask | undefined>()
const isCheckOpen = ref(false)
const startedBlank = ref(false)
const mobilePane = ref<'edit' | 'preview'>('edit')
const isDragging = ref(false)

const showWelcome = computed(
  () => store.activeWorkspace === 'cv' && !startedBlank.value && !store.hasContent(),
)

function openAi(task?: AiTask) {
  aiTask.value = task
  isCheckOpen.value = false
  isAiOpen.value = true
}

function openPresets(mode: 'load' | 'save') {
  presetMode.value = mode
  isPresetOpen.value = true
}

async function copyShareLink() {
  const link = await buildShareLink(store.exportState())
  await navigator.clipboard.writeText(link)
  toast.add({ title: t('share_copied'), description: t('share_copied_desc'), icon: 'i-lucide-link', color: 'success' })
}

const moreItems = computed(() => [
  [
    { label: t('share_link'), icon: 'i-lucide-link', onSelect: copyShareLink },
  ],
  [
    { label: t('preset_save'), icon: 'i-lucide-save', onSelect: () => openPresets('save') },
    { label: t('preset_load_menu'), icon: 'i-lucide-folder-open', onSelect: () => openPresets('load') },
    { label: t('reset_sample'), icon: 'i-lucide-file-text', onSelect: () => store.loadSample() },
  ],
  [
    {
      label: store.uiLanguage === 'Vietnamese' ? 'English interface' : 'Giao diện tiếng Việt',
      icon: 'i-lucide-languages',
      onSelect: () => (store.uiLanguage = store.uiLanguage === 'Vietnamese' ? 'English' : 'Vietnamese'),
    },
    { label: t('simple_version'), icon: 'i-lucide-external-link', to: '/simple/', target: '_blank' },
    { label: t('about_menu'), icon: 'i-lucide-info', onSelect: () => (isSettingsOpen.value = true) },
  ],
])

// ── Paste / drop anywhere to import an AI reply or a JSON file ──
function isEditable(el: EventTarget | null) {
  const e = el as HTMLElement | null
  return !!e && (e.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName))
}

function onPaste(e: ClipboardEvent) {
  if (isEditable(e.target)) return
  const text = e.clipboardData?.getData('text') || ''
  if (!looksLikeCvJson(text) && !findHandoffLink(text)) return
  e.preventDefault()
  importText(text)
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault()
    isDragging.value = true
  }
}

async function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  e.preventDefault()
  importText(await file.text())
}

function onHashChange() {
  if (/^#cv(-src)?=/.test(window.location.hash)) importFromLocation()
}

onMounted(async () => {
  installAgentApi(store)
  const fromLink = await importFromLocation()
  if (!fromLink) store.restoreAutosave()
  window.addEventListener('paste', onPaste)
  window.addEventListener('hashchange', onHashChange)
})
onUnmounted(() => {
  window.removeEventListener('paste', onPaste)
  window.removeEventListener('hashchange', onHashChange)
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right' }">
    <div
      class="h-dvh flex flex-col bg-muted text-default"
      @dragover="onDragOver"
      @dragleave.self="isDragging = false"
      @drop="onDrop"
    >
      <!-- Header -->
      <header class="h-14 shrink-0 border-b border-default bg-default px-3 sm:px-4 flex items-center gap-3">
        <div class="flex items-center gap-2 shrink-0">
          <div class="size-8 rounded-lg bg-primary text-inverted flex items-center justify-center text-sm font-bold select-none">CV</div>
          <span class="hidden md:block text-sm font-semibold text-highlighted">CV Editor</span>
        </div>

        <UTabs
          v-model="store.activeWorkspace"
          :items="[
            { label: t('cv_workspace'), value: 'cv', icon: 'i-lucide-file-user' },
            { label: t('cover_letter_workspace'), value: 'cover-letter', icon: 'i-lucide-mail' },
          ]"
          :content="false"
          size="xs"
          class="w-auto"
          :ui="{ label: 'hidden sm:inline' }"
        />

        <div class="flex-1" />

        <UButton
          icon="i-lucide-sparkles"
          color="primary"
          variant="soft"
          :label="t('ai_btn')"
          :ui="{ label: 'hidden sm:inline' }"
          @click="openAi()"
        />
        <UButton
          class="hidden lg:inline-flex"
          icon="i-lucide-file-up"
          color="neutral"
          variant="outline"
          :label="store.activeWorkspace === 'cv' ? t('import_cv') : t('import_file')"
          @click="isImportOpen = true"
        />
        <UTooltip :text="t('check_tooltip')">
          <UButton color="neutral" variant="outline" @click="isCheckOpen = true">
            <UChip :color="scoreColor" size="lg" standalone inset />
            <span class="hidden sm:inline">{{ t('check_btn') }}</span>
            <span class="font-semibold tabular-nums">{{ audit.score }}</span>
          </UButton>
        </UTooltip>
        <DownloadMenu />
        <UColorModeButton class="hidden sm:inline-flex" />
        <UDropdownMenu :items="moreItems" :content="{ align: 'end' }">
          <UButton color="neutral" variant="ghost" icon="i-lucide-ellipsis-vertical" :aria-label="t('more_menu')" />
        </UDropdownMenu>
      </header>

      <!-- Mobile pane switch -->
      <div v-if="!showWelcome" class="lg:hidden px-3 pt-3 flex items-center gap-2">
        <UTabs
          v-model="mobilePane"
          :items="[
            { label: t('pane_edit'), value: 'edit', icon: 'i-lucide-pencil' },
            { label: t('pane_preview'), value: 'preview', icon: 'i-lucide-eye' },
          ]"
          :content="false"
          size="sm"
          class="flex-1 min-w-0"
        />
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-file-up"
          class="shrink-0"
          :label="store.activeWorkspace === 'cv' ? t('import_cv') : t('import_file')"
          @click="isImportOpen = true"
        />
      </div>

      <!-- Body -->
      <main class="flex-1 min-h-0">
        <Welcome v-if="showWelcome" @ai="openAi('create')" @import="isImportOpen = true" @blank="startedBlank = true" />
        <div
          v-else
          class="h-full grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
        >
          <div class="min-h-0" :class="mobilePane === 'edit' ? 'block' : 'hidden lg:block'">
            <CVEditor v-if="store.activeWorkspace === 'cv'" />
            <CoverLetterEditor v-else />
          </div>
          <div class="min-h-0" :class="mobilePane === 'preview' ? 'block' : 'hidden lg:block'">
            <CVPlayer v-if="store.activeWorkspace === 'cv'" />
            <CoverLetterPlayer v-else />
          </div>
        </div>
      </main>

      <!-- Drop overlay -->
      <div
        v-if="isDragging"
        class="fixed inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary flex items-center justify-center pointer-events-none"
      >
        <p class="text-lg font-semibold text-primary">{{ t('drop_hint') }}</p>
      </div>

      <AiHandoff v-model:open="isAiOpen" :initial-task="aiTask" />
      <CheckPanel v-model:open="isCheckOpen" @fix-with-ai="openAi('improve')" />
      <SettingsDrawer v-model="isSettingsOpen" />
      <ProfilePresets v-model:open="isPresetOpen" :mode="presetMode" />
      <ImportModal v-model="isImportOpen" />
    </div>
  </UApp>
</template>

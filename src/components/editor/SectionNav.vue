<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { CV_LANGUAGE_SECTION_LABELS } from '@/types/cv'
import type { SectionKey } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()
const props = withDefaults(defineProps<{ touchControls?: boolean }>(), { touchControls: false })
const emit = defineEmits<{ (event: 'close-manager'): void }>()
const renameInput = ref<HTMLInputElement>()

const ICONS: Record<string, string> = {
  personal: 'i-lucide-user-round',
  summary: 'i-lucide-align-left',
  objective: 'i-lucide-target',
  skills: 'i-lucide-wrench',
  experience: 'i-lucide-briefcase',
  projects: 'i-lucide-folder-git-2',
  education: 'i-lucide-graduation-cap',
  certificates: 'i-lucide-award',
  'page-break': 'i-lucide-file-minus-2',
}

function label(key: SectionKey): string {
  const custom = store.customSectionLabels[key]?.trim()
  if (custom) return custom
  const defaults = CV_LANGUAGE_SECTION_LABELS[store.language] || CV_LANGUAGE_SECTION_LABELS.English
  return defaults?.[key] || store.cvData.customSections?.find((section) => `custom:${section.id}` === key)?.title || key
}

const enabled = (k: SectionKey) => k === 'page-break' || !store.disabledSections.includes(k)

function select(key: string) {
  store.activeSectionTab = key
  emit('close-manager')
}

// ── Reorder: native drag and drop + Alt+Arrow keys ──
const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

function move(from: number, to: number) {
  if (to < 0 || to >= store.sectionsOrder.length || from === to) return
  const list = [...store.sectionsOrder]
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item as SectionKey)
  store.sectionsOrder = list
}

function onDrop(to: number) {
  if (dragIndex.value !== null) move(dragIndex.value, to)
  dragIndex.value = null
  overIndex.value = null
}

async function onKey(e: KeyboardEvent, index: number) {
  if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
  e.preventDefault()
  const to = index + (e.key === 'ArrowUp' ? -1 : 1)
  move(index, to)
  await nextTick()
  document.querySelector<HTMLElement>(`[data-nav-index="${to}"]`)?.focus()
}

// ── Rename on double click ──
const renaming = ref<SectionKey | null>(null)
const renameValue = ref('')
async function startRename(key: SectionKey) {
  renaming.value = key
  renameValue.value = label(key)
  await nextTick()
  renameInput.value?.select()
}
function commitRename() {
  if (!renaming.value) return
  const defaults = CV_LANGUAGE_SECTION_LABELS[store.language] || CV_LANGUAGE_SECTION_LABELS.English
  const v = renameValue.value.trim()
  store.updateSectionLabel(renaming.value, v && v !== defaults?.[renaming.value] ? v : '')
  renaming.value = null
}
</script>

<template>
  <nav class="flex flex-col gap-0.5" :aria-label="t('sections_nav')">
    <button
      type="button"
      class="nav-item"
      :class="{ active: store.activeSectionTab === 'personal' }"
      @click="select('personal')"
    >
      <UIcon :name="ICONS.personal" class="size-4 shrink-0" />
      <span class="flex-1 truncate text-left">{{ t('personal_info') }}</span>
    </button>

    <USeparator class="my-1.5" />

    <div
      v-for="(key, index) in store.sectionsOrder"
      :key="key"
      :data-nav-index="index"
      tabindex="0"
      draggable="true"
      role="button"
      class="nav-item group"
      :class="{
        active: store.activeSectionTab === key,
        'opacity-50': !enabled(key),
        'ring-1 ring-primary/50': overIndex === index && dragIndex !== index,
        'opacity-30': dragIndex === index,
      }"
      :title="t('nav_item_hint')"
      @click="enabled(key) && select(key)"
      @keydown.enter="enabled(key) && select(key)"
      @keydown="onKey($event, index)"
      @dblclick="startRename(key)"
      @dragstart="dragIndex = index"
      @dragover.prevent="overIndex = index"
      @dragleave="overIndex = null"
      @drop.prevent="onDrop(index)"
      @dragend="dragIndex = null; overIndex = null"
    >
      <UIcon name="i-lucide-grip-vertical" class="size-3.5 shrink-0 text-dimmed cursor-grab opacity-0 group-hover:opacity-100" />
      <UIcon :name="ICONS[key] || 'i-lucide-list'" class="size-4 shrink-0" />
      <input
        v-if="renaming === key"
        ref="renameInput"
        v-model="renameValue"
        class="flex-1 min-w-0 bg-default border border-primary rounded px-1 text-sm"
        @keydown.enter.stop="commitRename"
        @keydown.esc.stop="renaming = null"
        @blur="commitRename"
        @click.stop
      />
      <span v-else class="flex-1 truncate text-left">{{ label(key) }}</span>
      <UButton
        v-if="key !== 'page-break'"
        icon="i-lucide-pencil"
        color="neutral"
        variant="ghost"
        size="xs"
        :aria-label="`${t('rename_section')}: ${label(key)}`"
        @click.stop="startRename(key)"
      />
      <template v-if="props.touchControls">
        <UButton
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="index === 0"
          :aria-label="`${t('move_section_up')}: ${label(key)}`"
          @click.stop="move(index, index - 1)"
        />
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="index === store.sectionsOrder.length - 1"
          :aria-label="`${t('move_section_down')}: ${label(key)}`"
          @click.stop="move(index, index + 1)"
        />
      </template>
      <UTooltip v-if="key !== 'page-break'" :text="enabled(key) ? t('section_hide') : t('section_show')">
        <UButton
          :icon="enabled(key) ? 'i-lucide-eye' : 'i-lucide-eye-off'"
          color="neutral"
          variant="ghost"
          size="xs"
          :class="enabled(key) ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : ''"
          :aria-label="enabled(key) ? t('section_hide') : t('section_show')"
          @click.stop="store.toggleSection(key)"
        />
      </UTooltip>
      <UButton v-if="key === 'page-break'" icon="i-lucide-trash-2" color="neutral" variant="ghost" size="xs" :aria-label="store.uiLanguage === 'Vietnamese' ? 'Xóa ngắt trang' : 'Remove page break'" @click.stop="store.removePageBreak()" />
      <UButton v-else-if="key.startsWith('custom:')" icon="i-lucide-trash-2" color="neutral" variant="ghost" size="xs" :aria-label="store.uiLanguage === 'Vietnamese' ? 'Xóa mục' : 'Delete section'" @click.stop="store.removeCustomSection(key)" />
    </div>

    <UButton icon="i-lucide-plus" color="neutral" variant="soft" size="sm" class="mt-2" @click="store.addCustomSection(); emit('close-manager')">{{ store.uiLanguage === 'Vietnamese' ? 'Thêm mục' : 'Add section' }}</UButton>
    <UButton v-if="!store.sectionsOrder.includes('page-break')" icon="i-lucide-file-minus-2" color="neutral" variant="soft" size="sm" class="mt-1" @click="store.addPageBreak(); emit('close-manager')">{{ store.uiLanguage === 'Vietnamese' ? 'Thêm ngắt trang' : 'Add page break' }}</UButton>

    <p class="text-[11px] leading-snug text-dimmed px-2 pt-2">{{ t('nav_help') }}</p>
  </nav>
</template>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  cursor: pointer;
  outline: none;
  transition: background-color 120ms, color 120ms;
}
.nav-item:hover {
  background: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
}
.nav-item:focus-visible {
  box-shadow: 0 0 0 2px var(--ui-primary);
}
.nav-item.active {
  background: color-mix(in oklab, var(--ui-primary) 12%, transparent);
  color: var(--ui-primary);
  font-weight: 600;
}
</style>

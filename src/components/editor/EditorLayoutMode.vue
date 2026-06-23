<script setup lang="ts">
import { ref } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import type { SectionKey } from '@/types/cv'

const emit = defineEmits<{
  (e: 'edit-section', secKey: string): void
}>()

const store = useCVStore()
const { t } = useI18n()

const LANGUAGE_LABELS: Record<string, Record<SectionKey, string>> = {
  English: {
    summary: 'Summary',
    objective: 'Objective',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    certificates: 'Certificates',
  },
  Vietnamese: {
    summary: 'Tóm tắt',
    objective: 'Mục tiêu',
    skills: 'Kỹ năng',
    experience: 'Kinh nghiệm',
    projects: 'Dự án',
    education: 'Học vấn',
    certificates: 'Chứng chỉ',
  },
  Japanese: {
    summary: '要約',
    objective: '志望動機',
    skills: 'スキル',
    experience: '職歴',
    projects: 'プロジェクト',
    education: '学歴',
    certificates: '資格',
  },
  Korean: {
    summary: '요약',
    objective: '목표',
    skills: '스킬',
    experience: '경력',
    projects: '프로젝트',
    education: '학력',
    certificates: '자격증',
  },
  Chinese: {
    summary: '个人总结',
    objective: '求职意向',
    skills: '专业技能',
    experience: '工作经历',
    projects: '项目经验',
    education: '教育背景',
    certificates: '荣誉证书',
  },
}

function getDefaultLabel(secKey: SectionKey): string {
  const lang = store.language || 'English'
  const labels = (LANGUAGE_LABELS[lang] || LANGUAGE_LABELS.English) as Record<SectionKey, string>
  return labels[secKey] || secKey
}

function getSectionLabel(secKey: SectionKey): string {
  const custom = store.customSectionLabels[secKey]
  if (custom && custom.trim()) return custom
  return getDefaultLabel(secKey)
}

// ─── Drag and Drop Logic (Applies Directly to Store) ───
const draggedIndex = ref<number | null>(null)
const draggedItem = ref<SectionKey | null>(null)
const mousePos = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })
const isDragging = ref(false)

function startDrag(e: MouseEvent, index: number, secKey: SectionKey) {
  if (e.button !== 0) return
  e.preventDefault()
  draggedIndex.value = index
  draggedItem.value = secKey
  isDragging.value = true
  const rect = (e.target as HTMLElement).closest('.section-drag-item')?.getBoundingClientRect()
  if (rect) dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  mousePos.value = { x: e.clientX, y: e.clientY }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  mousePos.value = { x: e.clientX, y: e.clientY }
}

function onMouseEnter(targetIndex: number) {
  if (!isDragging.value || draggedIndex.value === null || draggedIndex.value === targetIndex) return
  const list = store.sectionsOrder
  const item = list.splice(draggedIndex.value, 1)[0]
  if (item) {
    list.splice(targetIndex, 0, item)
    draggedIndex.value = targetIndex
  }
}

function onMouseUp() {
  isDragging.value = false
  draggedIndex.value = null
  draggedItem.value = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function isSectionEnabled(secKey: SectionKey): boolean {
  return !store.disabledSections.includes(secKey)
}

function toggleSection(secKey: SectionKey) {
  const idx = store.disabledSections.indexOf(secKey)
  if (idx > -1) {
    store.disabledSections.splice(idx, 1)
  } else {
    store.disabledSections.push(secKey)
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 select-none">
    <!-- Help Text -->
    <div
      class="bg-primary-500/5 border border-primary-500/10 rounded-xl p-3.5 flex gap-3 items-start flex-shrink-0"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m11.25 11.25.041-.02a.75.75 0 1 1 1.085 1.085l-.04.04m-2.137.886 1.474-.369a1.242 1.242 0 1 1 1.75 1.75l-.369 1.474a1.242 1.242 0 1 1-1.75-1.75M1.5 12a10.5 10.5 0 1 1 21 0 10.5 10.5 0 0 1-21 0Z"
        />
      </svg>
      <p class="text-xs text-theme-text-muted leading-relaxed font-medium">
        {{ t('layout_help') }}
      </p>
    </div>

    <!-- Personal (always first, non-draggable) -->
    <div
      class="flex items-center justify-between bg-theme-card-sub border border-theme-border p-3 rounded-xl shadow-sm flex-shrink-0"
    >
      <div class="flex items-center gap-3">
        <div class="text-theme-text-muted p-1 bg-theme-element rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.2"
            stroke="currentColor"
            class="w-4 h-4 text-primary-600 dark:text-primary-400"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </div>
        <span class="text-xs font-semibold text-theme-text">{{ t('personal_info') }}</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Edit Personal Info Pencil Button -->
        <button
          @click="emit('edit-section', 'personal')"
          class="p-1.5 rounded-lg text-theme-text-muted hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-500/10 transition cursor-pointer"
          :title="t('edit_personal_info')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </button>
        <span
          class="text-[10px] text-theme-text-muted uppercase font-bold tracking-wider mr-2 select-none"
          >{{ t('required') }}</span
        >
      </div>
    </div>

    <!-- Draggable Sections -->
    <div class="flex flex-col gap-2" :class="{ 'select-none': isDragging }">
      <div
        v-for="(secKey, index) in store.sectionsOrder"
        :key="secKey"
        @mouseenter="onMouseEnter(index)"
        class="section-drag-item flex items-center justify-between bg-theme-card-sub border border-theme-border p-3 rounded-xl transition duration-155"
        :class="[
          isDragging && draggedIndex === index
            ? 'opacity-30 border-dashed border-theme-border bg-theme-muted'
            : 'hover:border-theme-border hover:bg-theme-element',
          !isSectionEnabled(secKey) ? 'opacity-50 bg-theme-muted/30 border-theme-border/50' : '',
        ]"
      >
        <div class="flex items-center gap-3 flex-1">
          <!-- Drag Handle -->
          <div
            @mousedown="startDrag($event, index, secKey)"
            class="cursor-grab text-theme-text-muted hover:text-primary-600 dark:hover:text-primary-400 p-1 flex items-center select-none bg-theme-element rounded"
            :title="t('drag_to_reorder_help')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.5"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </div>
          <!-- Inline label editor -->
          <input
            v-model="store.customSectionLabels[secKey]"
            type="text"
            :placeholder="getDefaultLabel(secKey)"
            class="bg-theme-card border border-theme-border rounded-lg py-1 px-2.5 text-xs text-theme-text focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 w-48 font-semibold transition shadow-sm"
          />
        </div>

        <div class="flex items-center gap-2">
          <!-- Pencil Edit Icon Button (Only shown when enabled) -->
          <button
            v-if="isSectionEnabled(secKey)"
            @click="emit('edit-section', secKey)"
            class="p-1.5 rounded-lg text-theme-text-muted hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-500/10 transition cursor-pointer"
            :title="t('edit_section_title').replace('{section}', getSectionLabel(secKey))"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>

          <!-- Visibility Toggle -->
          <button
            @click="toggleSection(secKey)"
            class="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-element transition cursor-pointer"
            :title="isSectionEnabled(secKey) ? t('section_hide') : t('section_show')"
          >
            <svg
              v-if="isSectionEnabled(secKey)"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-4 h-4 text-primary-500 dark:text-primary-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-4 h-4 text-theme-text-muted"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.822 7.822 3 3m-3-3-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Drag Ghost -->
    <Teleport defer to="body">
      <div
        v-if="isDragging && draggedItem"
        class="fixed pointer-events-none z-50 bg-theme-card/90 border border-primary-500/40 rounded-xl p-3 shadow-2xl opacity-75 backdrop-blur-sm border-dashed"
        :style="{
          left: `${mousePos.x - dragOffset.x}px`,
          top: `${mousePos.y - dragOffset.y}px`,
          width: '260px',
        }"
      >
        <div class="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">
          {{ t('moving_section') }}
        </div>
        <div class="text-xs font-extrabold text-primary-600 dark:text-primary-400 capitalize">
          {{ getSectionLabel(draggedItem) }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

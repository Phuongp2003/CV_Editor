<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import RichTextEditor from '@/components/RichTextEditor.vue'
import type { BulletPart, BulletLevel } from '@/types/cv'

const props = defineProps<{
  bullets: BulletPart[]
}>()

const emit = defineEmits<{
  (e: 'update:bullets', bullets: BulletPart[]): void
}>()

const { t } = useI18n()

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function addPart(type: BulletLevel) {
  const updated = [...props.bullets, { id: generateId(), type, text: '' }]
  emit('update:bullets', updated)
}

function removePart(pIdx: number) {
  const updated = props.bullets.filter((_, i) => i !== pIdx)
  emit('update:bullets', updated)
}

function updatePartType(pIdx: number, type: BulletLevel) {
  const updated = props.bullets.map((p, i) => (i === pIdx ? { ...p, type } : p))
  emit('update:bullets', updated)
}

function updatePartText(pIdx: number, text: string) {
  const updated = props.bullets.map((p, i) => (i === pIdx ? { ...p, text } : p))
  emit('update:bullets', updated)
}

// ─── Self-Contained Bullet Drag State ──────────────────────────────────────────
const isDragging = ref(false)
const draggedIndex = ref<number | null>(null)
const draggedItem = ref<BulletPart | null>(null)
const mousePos = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

function startDrag(e: MouseEvent, index: number, item: BulletPart) {
  if (e.button !== 0) return
  e.preventDefault()
  draggedIndex.value = index
  draggedItem.value = item
  isDragging.value = true
  const rect = (e.target as HTMLElement).closest('.bullet-part-item')?.getBoundingClientRect()
  if (rect) dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  mousePos.value = { x: e.clientX, y: e.clientY }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  mousePos.value = { x: e.clientX, y: e.clientY }
}

function onMouseEnter(pIdx: number) {
  if (!isDragging.value || draggedIndex.value === null || draggedIndex.value === pIdx) return
  const updated = [...props.bullets]
  const temp = updated[draggedIndex.value] as BulletPart
  updated[draggedIndex.value] = updated[pIdx] as BulletPart
  updated[pIdx] = temp
  draggedIndex.value = pIdx
  emit('update:bullets', updated)
}

function onMouseUp() {
  isDragging.value = false
  draggedIndex.value = null
  draggedItem.value = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <div class="flex flex-col gap-2.5 mt-3 pt-3 border-t border-theme-border">
    <label
      class="text-[10px] text-theme-text-muted font-extrabold uppercase tracking-wider select-none"
      >{{ t('bullet_header') }}</label
    >

    <div class="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
      <div
        v-for="(part, pIdx) in bullets"
        :key="part.id"
        @mouseenter="onMouseEnter(pIdx)"
        class="bullet-part-item flex items-center gap-2 bg-theme-card border border-theme-border p-2 rounded-lg relative transition duration-150 hover:border-theme-hover shadow-sm"
        :class="{
          'opacity-30 border-dashed border-theme-border': isDragging && draggedIndex === pIdx,
        }"
      >
        <!-- Drag Handle -->
        <div
          @mousedown="startDrag($event, pIdx, part)"
          class="cursor-grab hover:text-theme-secondary text-theme-text-muted p-1 flex items-center select-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="w-3.5 h-3.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </div>

        <!-- Part Type Selector -->
        <select
          :value="part.type"
          @change="updatePartType(pIdx, ($event.target as HTMLSelectElement).value as BulletLevel)"
          class="bg-theme-muted border border-theme-border rounded-lg p-1 text-[11px] font-semibold text-theme-text-sub focus:outline-none focus:border-primary-500 cursor-pointer shadow-sm"
        >
          <option value="header">{{ t('option_header') }}</option>
          <option value="l1">{{ t('option_l1') }}</option>
          <option value="l2">{{ t('option_l2') }}</option>
          <option value="l3">{{ t('option_l3') }}</option>
        </select>

        <!-- Rich Text Editor -->
        <RichTextEditor
          :model-value="part.text"
          @update:model-value="updatePartText(pIdx, $event)"
          :placeholder="t('bullet_editor_placeholder')"
          class="flex-1"
        />

        <!-- Delete -->
        <button
          @click="removePart(pIdx)"
          class="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1 cursor-pointer transition"
          title="Delete item"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        v-if="!bullets || bullets.length === 0"
        class="text-xs text-theme-text-muted text-center py-4 border border-dashed border-theme-border rounded-lg bg-theme-muted font-medium select-none"
      >
        {{ t('no_bullets') }}
      </div>
    </div>

    <!-- Add Buttons -->
    <div class="flex flex-wrap gap-2 mt-1 select-none">
      <button
        type="button"
        @click="addPart('l1')"
        class="bg-theme-muted hover:bg-theme-element border border-theme-border text-primary-600 dark:text-primary-400 font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wide uppercase transition duration-150 cursor-pointer shadow-sm"
      >
        {{ t('btn_add_l1') }}
      </button>
      <button
        type="button"
        @click="addPart('l2')"
        class="bg-theme-muted hover:bg-theme-element border border-theme-border text-sky-600 dark:text-sky-400 font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wide uppercase transition duration-150 cursor-pointer shadow-sm"
      >
        {{ t('btn_add_l2') }}
      </button>
      <button
        type="button"
        @click="addPart('l3')"
        class="bg-theme-muted hover:bg-theme-element border border-theme-border text-theme-secondary font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wide uppercase transition duration-150 cursor-pointer shadow-sm"
      >
        {{ t('btn_add_l3') }}
      </button>
      <button
        type="button"
        @click="addPart('header')"
        class="bg-theme-muted hover:bg-theme-element border border-theme-border text-theme-text-sub font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wide uppercase transition duration-150 cursor-pointer shadow-sm"
      >
        {{ t('btn_add_header') }}
      </button>
    </div>

    <!-- Drag Ghost -->
    <Teleport defer to="body">
      <div
        v-if="isDragging && draggedItem"
        class="fixed pointer-events-none z-50 bg-theme-card/90 border border-theme-secondary/40 rounded-xl p-3 shadow-2xl opacity-75 backdrop-blur-sm border-dashed"
        :style="{
          left: `${mousePos.x - dragOffset.x}px`,
          top: `${mousePos.y - dragOffset.y}px`,
          width: '350px',
        }"
      >
        <div
          class="text-[9px] bg-theme-element text-theme-text-muted px-1 rounded font-mono uppercase tracking-wider w-fit mb-1"
        >
          {{ draggedItem.type }}
        </div>
        <div class="text-xs text-theme-text-sub font-semibold truncate block">
          {{ draggedItem.text || 'Empty bullet' }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

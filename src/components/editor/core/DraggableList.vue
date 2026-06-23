<script setup lang="ts" generic="T">
import { ref, provide } from 'vue'

const props = defineProps<{
  modelValue: T[]
  dragWidth?: string
  ghostTitle?: string
  ghostTitleKey?: keyof T
  ghostSubtitleKey?: keyof T
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: T[]): void
}>()

const isDragging = ref(false)
const draggedIndex = ref<number | null>(null)
const draggedItem = ref<T | null>(null)
const mousePos = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

function startDrag(e: MouseEvent, index: number, item: T, el: HTMLElement) {
  if (e.button !== 0) return
  e.preventDefault()
  draggedIndex.value = index
  draggedItem.value = item
  isDragging.value = true
  const rect = el.getBoundingClientRect()
  if (rect) dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  mousePos.value = { x: e.clientX, y: e.clientY }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  mousePos.value = { x: e.clientX, y: e.clientY }
}

function onMouseUp() {
  isDragging.value = false
  draggedIndex.value = null
  draggedItem.value = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function onMouseEnterItem(index: number) {
  if (!isDragging.value || draggedIndex.value === null || draggedIndex.value === index) return
  const newList = [...props.modelValue]
  const temp = newList[draggedIndex.value] as T
  newList[draggedIndex.value] = newList[index] as T
  newList[index] = temp
  draggedIndex.value = index
  emit('update:modelValue', newList)
}

provide('draggableListContext', {
  isDragging,
  draggedIndex,
  startDrag,
  onMouseEnterItem,
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <slot></slot>

    <!-- Drag Ghost -->
    <Teleport defer to="body">
      <div
        v-if="isDragging && draggedItem"
        class="fixed pointer-events-none z-50 bg-theme-card/90 border border-primary-500/40 rounded-xl p-3 shadow-2xl opacity-75 backdrop-blur-sm border-dashed"
        :style="{
          left: `${mousePos.x - dragOffset.x}px`,
          top: `${mousePos.y - dragOffset.y}px`,
          width: dragWidth || '400px',
        }"
      >
        <div class="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">
          {{ ghostTitle || 'Moving Item' }}
        </div>
        <div
          v-if="ghostTitleKey && draggedItem[ghostTitleKey]"
          class="text-xs font-extrabold text-primary-600 dark:text-primary-400 capitalize"
        >
          {{ draggedItem[ghostTitleKey] }}
        </div>
        <div
          v-if="ghostSubtitleKey && draggedItem[ghostSubtitleKey]"
          class="text-[10px] text-theme-text-muted mt-0.5"
        >
          {{ draggedItem[ghostSubtitleKey] }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

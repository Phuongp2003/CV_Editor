<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  index: number
  item: any
  collapseKey: string
  headerTitle?: string
  headerPlaceholder?: string
}>()

const emit = defineEmits<{
  (e: 'delete'): void
}>()

const store = useCVStore()
const { t } = useI18n()

const cardRef = ref<HTMLElement | null>(null)
const context = inject<{
  isDragging: { value: boolean }
  draggedIndex: { value: number | null }
  startDrag: (e: MouseEvent, index: number, item: any, el: HTMLElement) => void
  onMouseEnterItem: (index: number) => void
}>('draggableListContext')

if (!context) {
  throw new Error('DraggableItemCard must be used inside a DraggableList')
}

const isCollapsed = computed(() => store.isCollapsed(props.collapseKey))

function toggleCollapse() {
  store.toggleCollapsed(props.collapseKey)
}

function handleMouseDown(e: MouseEvent) {
  if (cardRef.value && context) {
    context.startDrag(e, props.index, props.item, cardRef.value)
  }
}

function handleMouseEnter() {
  if (context) {
    context.onMouseEnterItem(props.index)
  }
}
</script>

<template>
  <div
    ref="cardRef"
    @mouseenter="handleMouseEnter"
    class="bg-theme-card-sub p-4 rounded-xl border border-theme-border flex flex-col gap-3 relative transition duration-150"
    :class="{
      'opacity-30 border-dashed border-theme-border':
        context.isDragging.value && context.draggedIndex.value === index,
    }"
  >
    <!-- Card Header -->
    <div class="flex justify-between items-center border-b border-theme-border pb-2 select-none">
      <div
        @mousedown="handleMouseDown"
        class="cursor-grab text-theme-text-muted hover:text-theme-secondary flex items-center gap-1.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2.2"
          stroke="currentColor"
          class="w-3.5 h-3.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
        <span class="text-[10px] font-extrabold tracking-wider uppercase">
          {{ headerTitle || t('drag_to_reorder') || 'DRAG TO REORDER' }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Collapse Button -->
        <button
          type="button"
          @click="toggleCollapse"
          class="text-theme-text-muted hover:text-primary-500 dark:hover:text-primary-400 p-1 flex items-center transition cursor-pointer"
          :title="isCollapsed ? t('expand') || 'Expand' : t('collapse') || 'Collapse'"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="w-3.5 h-3.5 transform transition-transform duration-200"
            :class="{ '-rotate-90': isCollapsed }"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <!-- Delete Button -->
        <button
          type="button"
          @click="emit('delete')"
          class="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-xs cursor-pointer font-semibold transition"
        >
          {{ t('delete') }}
        </button>
      </div>
    </div>

    <!-- Expanded Body -->
    <div v-show="!isCollapsed" class="flex flex-col gap-3">
      <slot></slot>
    </div>

    <!-- Collapsed Preview -->
    <div v-show="isCollapsed" class="text-xs text-theme-text-muted italic select-none">
      <slot name="preview">
        {{ headerPlaceholder || 'Collapsed item' }}
      </slot>
    </div>
  </div>
</template>

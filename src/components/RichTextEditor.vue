<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.bubble.css'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    editorClass?: string
  }>(),
  {
    modelValue: '',
    placeholder: '',
    editorClass: 'min-h-[34px]',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
let quill: Quill | null = null

const isFocused = ref(false)
const isRawMode = ref(false)
const rawText = ref('')

const wrapperRef = ref<HTMLDivElement | null>(null)
const isToolbarBelow = ref(false)
let scrollParent: HTMLElement | null = null

function updateToolbarPosition() {
  if (!wrapperRef.value) return

  let parent = wrapperRef.value.parentElement
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      break
    }
    parent = parent.parentElement
  }

  const wrapperRect = wrapperRef.value.getBoundingClientRect()

  if (parent) {
    const parentRect = parent.getBoundingClientRect()
    const spaceAbove = wrapperRect.top - parentRect.top
    isToolbarBelow.value = spaceAbove < 42
  } else {
    isToolbarBelow.value = wrapperRect.top < 50
  }
}

function handleScroll() {
  updateToolbarPosition()
}

function startPositionTracking() {
  updateToolbarPosition()

  let parent = wrapperRef.value?.parentElement
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      scrollParent = parent
      break
    }
    parent = parent.parentElement
  }

  if (scrollParent) {
    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
  }
}

function stopPositionTracking() {
  if (scrollParent) {
    scrollParent.removeEventListener('scroll', handleScroll)
    scrollParent = null
  }
}

watch([isFocused, isRawMode], ([focused, raw]) => {
  if (focused || raw) {
    nextTick(() => {
      startPositionTracking()
    })
  } else {
    stopPositionTracking()
  }
})

onBeforeUnmount(() => {
  stopPositionTracking()
})

const activeFormats = ref({
  bold: false,
  italic: false,
  underline: false,
})

// Convert markdown or raw text to HTML format for Quill
function toHtml(md: string): string {
  if (!md) return '<p><br></p>'

  // If it's already HTML-like, wrap in paragraph if needed
  if (/<(strong|b|em|i|u|p|br)>/i.test(md)) {
    if (md.startsWith('<p>')) return md
    return `<p>${md}</p>`
  }

  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Convert markdown bold, italic, underline
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.*?)_/g, '<em>$1</em>')
  html = html.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')

  // Convert newlines to paragraphs
  return html
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p><br></p>'
      return `<p>${line}</p>`
    })
    .join('')
}

// Convert HTML from Quill back to Markdown
function toMarkdown(html: string): string {
  if (!html || html === '<p><br></p>' || html === '<p></p>') return ''

  let md = html
  // Replace paragraphs with newlines
  md = md.replace(/<p><br><\/p>/g, '\n')
  md = md.replace(/<p>(.*?)<\/p>/g, '$1\n')
  md = md.replace(/<br\s*\/?>/g, '\n')

  // Convert HTML tags to markdown
  md = md.replace(/<strong><em>(.*?)<\/em><\/strong>/g, '***$1***')
  md = md.replace(/<em><strong>(.*?)<\/strong><\/em>/g, '***$1***')
  md = md.replace(/<(strong|b)>(.*?)<\/\1>/g, '**$2**')
  md = md.replace(/<(em|i)>(.*?)<\/\1>/g, '*$2*')
  md = md.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')

  // Unescape basic HTML entities
  md = md.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

  return md.trim()
}

function updateActiveFormats() {
  if (!quill) return
  const range = quill.getSelection()
  if (range) {
    const format = quill.getFormat(range)
    activeFormats.value.bold = !!format.bold
    activeFormats.value.italic = !!format.italic
    activeFormats.value.underline = !!format.underline
  } else {
    activeFormats.value.bold = false
    activeFormats.value.italic = false
    activeFormats.value.underline = false
  }
}

function toggleFormat(formatName: 'bold' | 'italic' | 'underline') {
  if (!quill || isRawMode.value) return
  const current = quill.getFormat()
  const active = !current[formatName]
  quill.format(formatName, active)
  updateActiveFormats()
}

function toggleRawMode() {
  isRawMode.value = !isRawMode.value
  if (isRawMode.value) {
    // Switching to raw markdown edit mode
    rawText.value = props.modelValue
    nextTick(() => {
      textareaRef.value?.focus()
    })
  } else {
    // Switching back to rich text editor
    emit('update:modelValue', rawText.value)
    if (quill) {
      quill.root.innerHTML = toHtml(rawText.value)
      nextTick(() => {
        quill?.focus()
      })
    }
  }
}

function onRawTextChange() {
  emit('update:modelValue', rawText.value)
}

onMounted(() => {
  if (!editorContainer.value) return

  quill = new Quill(editorContainer.value, {
    theme: 'bubble',
    modules: {
      toolbar: false, // Hide built-in toolbar completely
    },
    placeholder: props.placeholder,
  })

  // Set initial content
  quill.root.innerHTML = toHtml(props.modelValue)

  // Listen to selection changes to track focus and formats
  quill.on('selection-change', (range) => {
    isFocused.value = !!range
    updateActiveFormats()
  })

  // Listen to content changes
  quill.on('text-change', () => {
    if (!quill) return
    const html = quill.root.innerHTML
    const md = toMarkdown(html)
    if (md !== props.modelValue) {
      emit('update:modelValue', md)
    }
    updateActiveFormats()
  })
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (isRawMode.value) {
      if (newVal !== rawText.value) {
        rawText.value = newVal
      }
      return
    }
    if (!quill) return
    const currentClean = toMarkdown(quill.root.innerHTML)
    if (newVal !== currentClean) {
      const selection = quill.getSelection()
      quill.root.innerHTML = toHtml(newVal)
      if (selection) {
        quill.setSelection(selection)
      }
    }
  },
)
</script>

<template>
  <div
    ref="wrapperRef"
    :class="[
      'relative w-full border border-theme-border rounded-lg bg-theme-card focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition duration-150 shadow-sm flex flex-col',
      editorClass,
    ]"
  >
    <!-- Floating Toolbar above/below the input, shown when focused or in raw mode -->
    <div
      v-show="isFocused || isRawMode"
      @mousedown.prevent
      :class="[
        'absolute right-2 bg-theme-card border border-theme-border px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow-lg z-30 select-none flex-shrink-0 transition-all duration-200',
        isToolbarBelow ? '-bottom-9.5' : '-top-9.5',
      ]"
    >
      <!-- Style Controls -->
      <div class="flex items-center gap-0.5">
        <button
          @mousedown.prevent="toggleFormat('bold')"
          :disabled="isRawMode"
          :class="[
            'px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer flex items-center justify-center min-w-[24px] h-6',
            isRawMode ? 'opacity-40 cursor-not-allowed' : '',
            activeFormats.bold
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-sm'
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-element',
          ]"
          title="Bold"
        >
          B
        </button>
        <button
          @mousedown.prevent="toggleFormat('italic')"
          :disabled="isRawMode"
          :class="[
            'px-2 py-0.5 text-xs italic font-semibold rounded transition cursor-pointer flex items-center justify-center min-w-[24px] h-6',
            isRawMode ? 'opacity-40 cursor-not-allowed' : '',
            activeFormats.italic
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-sm'
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-element',
          ]"
          title="Italic"
        >
          I
        </button>
        <button
          @mousedown.prevent="toggleFormat('underline')"
          :disabled="isRawMode"
          :class="[
            'px-2 py-0.5 text-xs underline font-semibold rounded transition cursor-pointer flex items-center justify-center min-w-[24px] h-6',
            isRawMode ? 'opacity-40 cursor-not-allowed' : '',
            activeFormats.underline
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-sm'
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-element',
          ]"
          title="Underline"
        >
          U
        </button>
      </div>

      <!-- Divider -->
      <div class="w-[1px] h-4 bg-theme-border mx-1"></div>

      <!-- Raw Mode Toggle Control -->
      <button
        @click="toggleRawMode"
        :class="[
          'px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer flex items-center gap-1 h-6',
          isRawMode
            ? 'bg-primary-600 text-white border-primary-600'
            : 'border-theme-border text-theme-text-muted hover:text-theme-text hover:bg-theme-element',
        ]"
        title="Toggle Markdown Raw View"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2.5"
          stroke="currentColor"
          class="w-3 h-3"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
          />
        </svg>
        <span>{{ isRawMode ? 'Rich' : 'Raw' }}</span>
      </button>
    </div>

    <!-- Rich Text Editor Mode -->
    <div
      v-show="!isRawMode"
      class="px-3 py-1.5 text-xs text-theme-text overflow-y-auto flex-1 flex flex-col"
    >
      <!-- Quill Rich Text Editor Container -->
      <div ref="editorContainer" class="quill-editor-wrapper h-full"></div>
    </div>

    <!-- Raw Markdown Mode -->
    <div v-show="isRawMode" class="px-3 py-1.5 text-xs text-theme-text flex-1 flex flex-col">
      <textarea
        ref="textareaRef"
        v-model="rawText"
        @input="onRawTextChange"
        @focus="isFocused = true"
        @blur="isFocused = false"
        class="w-full flex-1 bg-transparent border-0 outline-none text-xs font-mono resize-none text-theme-text placeholder-theme-text-muted/50 focus:ring-0 p-0"
        :placeholder="placeholder"
      ></textarea>
    </div>
  </div>
</template>

<style>
/* Reset some Quill editor default styles to match our layout */
.quill-editor-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.quill-editor-wrapper .ql-container {
  font-family: inherit !important;
  border: none !important;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.quill-editor-wrapper .ql-editor {
  padding: 0 !important;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-main);
  background: transparent;
  outline: none;
  flex: 1;
  min-height: 100%;
}
.quill-editor-wrapper .ql-editor.ql-blank::before {
  left: 0 !important;
  right: 0 !important;
  font-style: normal !important;
  color: var(--text-muted) !important;
  opacity: 0.6;
}

/* Hide Quill's default bubble theme tooltip */
.quill-editor-wrapper .ql-tooltip {
  display: none !important;
}
</style>

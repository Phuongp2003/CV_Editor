<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { jsPDF } from 'jspdf'
import { useCVStore } from '@/stores/cv'
import { storeToRefs } from 'pinia'
import { useI18n } from '@/composables/useI18n'
import DownloadMenu from '@/components/DownloadMenu.vue'
import { cleanUrl, parseRichText } from '@/utils/richText'
import type { TextSegment } from '@/utils/richText'

const store = useCVStore()
const {
  coverLetterData: cl,
  sizeMultiplier,
  selectedFont,
  customFontName,
  language,
  downloadTrigger,
} = storeToRefs(store)

const pdfBlobUrl = ref<string | null>(null)
const { t } = useI18n()

// Rich text parsing structure
interface RichWord {
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
}

function segmentToWords(segments: TextSegment[]): RichWord[] {
  const words: RichWord[] = []
  segments.forEach((seg) => {
    const startsWithSpace = seg.text.startsWith(' ') || seg.text.startsWith('\n') || seg.text.startsWith('\r')
    const parts: string[] = seg.text.match(/\S+\s*/g) || []
    if (parts.length === 0 && seg.text) {
      parts.push(seg.text)
    }
    parts.forEach((part, idx) => {
      let wordText = part
      if (idx === 0 && startsWithSpace) {
        const leadingWhitespace = seg.text.match(/^\s+/)?.[0] || ''
        if (!wordText.startsWith(leadingWhitespace)) {
          wordText = leadingWhitespace + wordText
        }
      }
      words.push({ text: wordText, bold: seg.bold, italic: seg.italic, underline: seg.underline })
    })
  })
  return words
}

function wrapRichWords(
  doc: any,
  words: RichWord[],
  maxWidth: number,
  setFontFunc: (style: string) => void,
): RichWord[][] {
  const lines: RichWord[][] = []
  let currentLine: RichWord[] = []
  let currentLineWidth = 0

  words.forEach((word) => {
    let style = 'normal'
    if (word.bold && word.italic) style = 'bolditalic'
    else if (word.bold) style = 'bold'
    else if (word.italic) style = 'italic'

    setFontFunc(style)
    const wordWidth = doc.getTextWidth(word.text)

    if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = [word]
      currentLineWidth = wordWidth
    } else {
      currentLine.push(word)
      currentLineWidth += wordWidth
    }
  })

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines
}

function generatePDF(shouldDownload = false) {
  if (!cl.value) return

  const obj = cl.value
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
    putOnlyUsedFonts: true,
  })
  ;(doc as any).setCharSpace = function () {
    return this
  }
  doc.setTextColor('#000000')

  // Setup typography matching CV
  const safeMultiplier = Math.min(1.6, Math.max(0.8, sizeMultiplier.value))
  const bodySize = Math.max(10, Math.round(10 * safeMultiplier))
  const contactInfoSize = Math.max(9, Math.round(bodySize * 0.9))
  const titleSize = Math.round(14 * safeMultiplier)
  const lineHeight = Math.max(15, Math.round(16 * safeMultiplier))
  const paragraphGap = Math.max(10, Math.round(14 * safeMultiplier))

  const marginLeft = 40
  const midPage = doc.internal.pageSize.getWidth() / 2
  const marginRight = doc.internal.pageSize.getWidth() - 30
  const marginBottom = doc.internal.pageSize.getHeight() - 30
  const marginTop = 40
  let y = 40

  let fontFamily = 'NotoSans'
  if (selectedFont.value === 'arial') {
    fontFamily = 'helvetica'
  } else if (selectedFont.value === 'custom' && customFontName.value) {
    const name = customFontName.value.trim().toLowerCase()
    if (
      name.includes('arial') ||
      name.includes('sans') ||
      name.includes('helvetica') ||
      name.includes('system-ui') ||
      name.includes('inter') ||
      name.includes('roboto')
    ) {
      fontFamily = 'helvetica'
    } else if (
      name.includes('times') ||
      name.includes('serif') ||
      name.includes('garamond') ||
      name.includes('georgia')
    ) {
      fontFamily = 'times'
    } else if (name.includes('courier') || name.includes('mono')) {
      fontFamily = 'courier'
    } else {
      fontFamily = customFontName.value.trim()
    }
  }
  let useEmbeddedFonts = selectedFont.value !== 'arial' && selectedFont.value !== 'custom'

  // Safety fallback if fonts are not loaded (e.g. in Vitest test environment)
  const hasFont = (window as any).font || (window as any).RegJap || (window as any).KrRegular || (window as any).RegCN
  if (useEmbeddedFonts && !hasFont) {
    useEmbeddedFonts = false
    fontFamily = 'helvetica'
  }

  if (useEmbeddedFonts) {
    const lang = language.value
    if (lang === 'Japanese' || lang === 'ja') {
      doc.addFileToVFS('NotoSans-normal.ttf', (window as any).RegJap)
      doc.addFileToVFS('NotoSans-bold.ttf', (window as any).Boldjap)
    } else if (lang === 'Korean' || lang === 'ko') {
      doc.addFileToVFS('NotoSans-normal.ttf', (window as any).KrRegular)
      doc.addFileToVFS('NotoSans-bold.ttf', (window as any).KrBold)
    } else if (lang === 'Chinese' || lang === 'zh') {
      doc.addFileToVFS('NotoSans-normal.ttf', (window as any).RegCN)
      doc.addFileToVFS('NotoSans-bold.ttf', (window as any).BoldCN)
    } else {
      doc.addFileToVFS('NotoSans-normal.ttf', (window as any).font)
      doc.addFileToVFS('NotoSans-bold.ttf', (window as any).fontBold)
    }
    doc.addFont('NotoSans-normal.ttf', 'NotoSans', 'normal')
    doc.addFont('NotoSans-bold.ttf', 'NotoSans', 'bold')
    doc.addFont('NotoSans-normal.ttf', 'NotoSans', 'italic')
    doc.addFont('NotoSans-bold.ttf', 'NotoSans', 'bolditalic')
  }

  const setFont = (style = 'normal') => {
    if (useEmbeddedFonts) {
      doc.setFont('NotoSans', style)
    } else {
      doc.setFont(fontFamily, style)
    }
  }

  function checkAndAddPage() {
    if (y > marginBottom) {
      doc.addPage('a4', 'p')
      y = marginTop
    }
  }

  const startsWithPunctuation = (str: string | undefined) => {
    if (!str) return false
    const trimmed = str.trim()
    if (trimmed.length === 0) return false
    const firstChar = trimmed.charAt(0)
    return [',', '.', ';', ':', '?', '!', ')', ']', '}'].includes(firstChar)
  }

  function drawRichText(text: string, x: number) {
    const maxWidth = marginRight - x
    const paragraphs = text.split(/\r?\n/)

    paragraphs.forEach((para, paraIdx) => {
      doc.setCharSpace(bodySize * 0.015)
      const segments = parseRichText(para)
      const words = segmentToWords(segments)
      const lines = wrapRichWords(doc, words, maxWidth, setFont)

      lines.forEach((line, index) => {
        if (paraIdx > 0 || index > 0) {
          if (index === 0) {
            y += lineHeight + paragraphGap / 2
          } else {
            y += lineHeight
          }
          checkAndAddPage()
        }

        let totalLineWidth = 0
        line.forEach((word) => {
          let style = 'normal'
          if (word.bold && word.italic) style = 'bolditalic'
          else if (word.bold) style = 'bold'
          else if (word.italic) style = 'italic'
          setFont(style)
          totalLineWidth += doc.getTextWidth(word.text)
        })

        const isLastLine = index === lines.length - 1
        const emptySpace = maxWidth - totalLineWidth
        
        let justifiableGapsCount = 0
        for (let i = 0; i < line.length - 1; i++) {
          if (!startsWithPunctuation(line[i + 1]?.text)) {
            justifiableGapsCount++
          }
        }

        const shouldJustify = !isLastLine && line.length > 1 && emptySpace > 0 && justifiableGapsCount > 0
        const extraSpace = shouldJustify ? emptySpace / justifiableGapsCount : 0

        let currentX = x
        line.forEach((word, wIdx) => {
          let style = 'normal'
          if (word.bold && word.italic) style = 'bolditalic'
          else if (word.bold) style = 'bold'
          else if (word.italic) style = 'italic'

          setFont(style)
          doc.text(word.text, currentX, y)
          if (word.underline) {
            const wordWidth = doc.getTextWidth(word.text)
            doc.setLineWidth(0.4)
            doc.line(currentX, y + 1.0, currentX + wordWidth, y + 1.0)
          }
          const wordWidth = doc.getTextWidth(word.text)
          currentX += wordWidth
          if (shouldJustify && wIdx < line.length - 1 && !startsWithPunctuation(line[wIdx + 1]?.text)) {
            currentX += extraSpace
          }
        })
      })
    })
    doc.setTextColor('#000000')
  }

  // 1. Draw Sender Header (Centered, matching CV style)
  setFont('bold')
  doc.setFontSize(titleSize + 2)
  doc.setCharSpace((titleSize + 2) * 0.02)
  doc.text(obj.header.senderName || 'SENDER NAME', midPage, y, { align: 'center' })

  y += Math.round((titleSize + 2) * 1.2)
  checkAndAddPage()

  setFont('normal')
  doc.setFontSize(contactInfoSize)
  doc.setTextColor('#333333')
  doc.setCharSpace(contactInfoSize * 0.015)

  const contactParts = [obj.header.senderLocation, obj.header.senderEmail, obj.header.senderPhone].filter(p => p?.trim())
  if (contactParts.length) {
    doc.text(contactParts.join('  |  '), midPage, y, { align: 'center' })
    y += lineHeight
    checkAndAddPage()
  }

  // Draw thin border divider below sender header
  doc.setLineWidth(1.0)
  doc.setDrawColor('#222222')
  doc.line(marginLeft, y - 4, marginRight, y - 4)

  y += paragraphGap
  checkAndAddPage()

  // 2. Draw Date
  setFont('normal')
  doc.setFontSize(bodySize)
  doc.setTextColor('#000000')
  if (obj.header.date) {
    doc.text(obj.header.date, marginLeft, y)
    y += lineHeight + paragraphGap / 2
    checkAndAddPage()
  }

  // Recipient Block (omitted from PDF output content per user request)

  // 4. Draw Greeting
  if (obj.greeting) {
    doc.text(obj.greeting, marginLeft, y)
    y += lineHeight + paragraphGap / 2
    checkAndAddPage()
  }

  // 5. Draw Opening Paragraph
  if (obj.openingParagraph) {
    drawRichText(obj.openingParagraph, marginLeft)
    y += lineHeight + paragraphGap
    checkAndAddPage()
  }

  // 6. Draw Body Paragraphs
  if (obj.bodyParagraphs && obj.bodyParagraphs.length) {
    obj.bodyParagraphs.forEach(p => {
      if (p.trim()) {
        drawRichText(p, marginLeft)
        y += lineHeight + paragraphGap
        checkAndAddPage()
      }
    })
  }

  // 7. Draw Closing Paragraph
  if (obj.closingParagraph) {
    drawRichText(obj.closingParagraph, marginLeft)
    y += lineHeight + paragraphGap
    checkAndAddPage()
  }

  // 8. Draw Sign-off
  if (obj.signOff) {
    y += paragraphGap / 2
    checkAndAddPage()
    drawRichText(obj.signOff, marginLeft)
  }

  // Set the output URL
  const blob = doc.output('blob')
  store.pdfBlob = blob
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value)
  }
  pdfBlobUrl.value = URL.createObjectURL(blob)

  if (shouldDownload) {
    doc.save(`${cl.value.header.senderName || 'cover_letter'}.pdf`)
  }
}

function downloadPDF() {
  generatePDF(true)
}

let debounceTimeout: any = null
function debouncedGeneratePDF() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
  }
  debounceTimeout = setTimeout(() => {
    generatePDF()
  }, 400)
}

// Watchers
watch(
  [
    cl,
    sizeMultiplier,
    selectedFont,
    customFontName,
    language,
  ],
  () => {
    debouncedGeneratePDF()
  },
  { deep: true },
)

watch(
  () => store.downloadTrigger,
  () => {
    if (store.activeWorkspace === 'cover-letter') {
      downloadPDF()
    }
  },
)

onMounted(() => {
  setTimeout(() => {
    generatePDF()
  }, 200)
})

onUnmounted(() => {
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value)
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-theme-card border border-theme-border rounded-xl overflow-hidden shadow-xl transition duration-150">
    <!-- Top Action Bar -->
    <div class="h-14 bg-theme-muted border-b border-theme-border px-4 flex justify-between items-center relative flex-shrink-0">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-primary-600 dark:text-primary-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <span class="text-sm font-bold text-theme-text">{{ t('cl_preview_title') }}</span>
      </div>

      <Teleport defer to="#navbar-actions">
        <DownloadMenu />
      </Teleport>
    </div>

    <!-- PDF Display Area -->
    <div class="flex-1 relative bg-theme-muted flex flex-col">
      <iframe
        v-if="pdfBlobUrl"
        :key="pdfBlobUrl"
        :src="pdfBlobUrl + '#toolbar=0&navpanes=0'"
        class="w-full h-full flex-1 border-0"
      ></iframe>
      <div v-else class="flex-1 flex items-center justify-center text-theme-text-muted">
        {{ t('cl_preview_title') }}...
      </div>
    </div>
  </div>
</template>

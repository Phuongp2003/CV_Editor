<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { jsPDF } from 'jspdf'
import { saveAs } from 'file-saver'
import { useCVStore } from '@/stores/cv'
import { storeToRefs } from 'pinia'
import DownloadMenu from '@/components/DownloadMenu.vue'
import { useI18n } from '@/composables/useI18n'
import { cleanUrl, parseRichText } from '@/utils/richText'
import type { TextSegment } from '@/utils/richText'
import { CV_LANGUAGE_SECTION_LABELS } from '@/types/cv'
import type { SectionKey } from '@/types/cv'

const props = defineProps<{
  data: any
}>()

const store = useCVStore()
const {
  cvData: cv,
  sizeMultiplier,
  selectedFont,
  customFontName,
  language,
  customSectionLabels,
  downloadTrigger,
  sectionsOrder,
  disabledSections,
  bulletChars,
  experienceHeaderStyle,
} = storeToRefs(store)
const pdfBlobUrl = ref<string | null>(null)
const { t } = useI18n()

function resolveSectionLabels(lang: string): Record<SectionKey, string> {
  const labels = CV_LANGUAGE_SECTION_LABELS[lang]
  return (labels || CV_LANGUAGE_SECTION_LABELS.English) as Record<SectionKey, string>
}

const sectionLabels = computed(() => {
  const defaultLabels = resolveSectionLabels(language.value)
  return {
    summary: (customSectionLabels.value.summary ?? '').trim() || defaultLabels.summary,
    objective: (customSectionLabels.value.objective ?? '').trim() || defaultLabels.objective,
    skills: (customSectionLabels.value.skills ?? '').trim() || defaultLabels.skills,
    experience: (customSectionLabels.value.experience ?? '').trim() || defaultLabels.experience,
    projects: (customSectionLabels.value.projects ?? '').trim() || defaultLabels.projects,
    education: (customSectionLabels.value.education ?? '').trim() || defaultLabels.education,
    certificates:
      (customSectionLabels.value.certificates ?? '').trim() || defaultLabels.certificates,
  }
})

function buildTypographyScale(multiplier: number, fontFam: string) {
  const safeMultiplier = Math.min(1.6, Math.max(0.8, multiplier))
  const body = Math.max(10, Math.round(10 * safeMultiplier))
  const title = Math.round(14 * safeMultiplier)
  const lineHeight = Math.max(15, Math.round(16 * safeMultiplier))
  return {
    body,
    title,
    lineHeight,
    sectionGap: Math.max(5, Math.round(5 * safeMultiplier)),
    multiplier: safeMultiplier,
    fontFamily: fontFam || 'NotoSans',
  }
}

function getPersonalInfoFromObj(obj: any) {
  const data = []
  if (obj.location) data.push(obj.location)
  if (obj.email) data.push(obj.email)
  if (obj.phone) data.push(obj.phone)
  return data.join(' | ')
}

function getPersonalInfo2FromObj(obj: any) {
  const data = []
  if (obj.github || obj.github_placeholder) {
    data.push(obj.github_placeholder || obj.github)
  }
  if (obj.website || obj.website_placeholder) {
    data.push(obj.website_placeholder || obj.website)
  }
  if (obj.linkedin || obj.linkedin_placeholder) {
    data.push(obj.linkedin_placeholder || obj.linkedin)
  }
  return data.join(' | ')
}

const isLink = (val: string) => {
  if (!val) return false
  const lower = val.toLowerCase()
  return (
    lower.startsWith('http') ||
    lower.startsWith('www.') ||
    lower.includes('.com') ||
    lower.includes('.dev') ||
    lower.includes('.net')
  )
}

// Rich Text Parser Structures
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

// PDF Generation
function generatePDF(shouldDownload = false) {
  if (!cv.value) return

  const obj = cv.value
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

  const typography = buildTypographyScale(sizeMultiplier.value, selectedFont.value)
  const bodySize = typography.body
  const contactInfoSize = Math.max(9, Math.round(bodySize * 0.9))
  const titleSize = typography.title
  const lineHeight = typography.lineHeight
  const nameLineHeight = Math.round((titleSize + 2) * 1.2)
  const contactLineHeight = Math.max(10, Math.round(lineHeight * 0.9))
  const padding = typography.sectionGap
  // Synchronized spacing gaps — all derived from typography scale and user requests
  const sectionBeforeGap = Math.max(3, Math.round(5 * sizeMultiplier.value))
  const sectionAfterHeaderGap = Math.max(15, Math.round(21 * sizeMultiplier.value))
  const cardBeforeGap = Math.max(2, Math.round(3 * sizeMultiplier.value))
  const bulletBlockGap = Math.max(1, Math.round(2 * sizeMultiplier.value))
  const bulletLineHeight = Math.max(10, Math.round(14 * sizeMultiplier.value))
  const paragraphGap = Math.max(3, Math.round(5 * sizeMultiplier.value))

  const marginLeft = 40
  const midPage = doc.internal.pageSize.getWidth() / 2
  const marginRight = doc.internal.pageSize.getWidth() - 30
  const marginBottom = doc.internal.pageSize.getHeight() - 30
  const marginTop = 40
  const deliminator = ' | '
  let y = 40

  // Determine font family name and whether to use embedded fonts
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

  // Draw Rich Text Closure
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
            y += lineHeight + paragraphGap
          } else {
            y += lineHeight
          }
          checkAndAddPage()
        }

        // Calculate total line width for justification
        let totalLineWidth = 0
        line.forEach((word) => {
          let style = 'normal'
          if (word.bold && word.italic) style = 'bolditalic'
          else if (word.bold) style = 'bold'
          else if (word.italic) style = 'italic'
          setFont(style)
          totalLineWidth += doc.getTextWidth(word.text)
        })

        // Justify only if not the last line of paragraph and more than 1 word
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

  // Draw Rich Text Bullet Closure (supports Level 1, 2, 3 prefixes)
  function drawRichTextBullet(text: string, x: number, prefix: string) {
    const paragraphs = text.split(/\r?\n/)

    // Calculate prefix width once using normal font style
    setFont('normal')
    const prefixWidth = doc.getTextWidth(prefix)
    const maxWidth = marginRight - (x + prefixWidth)

    paragraphs.forEach((para, paraIdx) => {
      doc.setCharSpace(bodySize * 0.015)
      const segments = parseRichText(para)
      const words = segmentToWords(segments)
      const lines = wrapRichWords(doc, words, maxWidth, setFont)

      lines.forEach((line, index) => {
        if (paraIdx > 0 || index > 0) {
          if (index === 0) {
            y += bulletLineHeight + paragraphGap
          } else {
            y += bulletLineHeight
          }
          checkAndAddPage()
        }

        // Calculate total line width of the words
        let totalLineWidth = 0
        line.forEach((word) => {
          let style = 'normal'
          if (word.bold && word.italic) style = 'bolditalic'
          else if (word.bold) style = 'bold'
          else if (word.italic) style = 'italic'
          setFont(style)
          totalLineWidth += doc.getTextWidth(word.text)
        })

        // Justify words to maxWidth
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

        // Draw prefix if first line of first paragraph
        if (paraIdx === 0 && index === 0) {
          setFont('normal')
          doc.setTextColor('#000000')
          doc.text(prefix, x, y)
        }

        // Words start at x + prefixWidth
        let currentX = x + prefixWidth

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

  function formatOutput(temp: string, placeholder: string, link: string) {
    if (temp) {
      if (placeholder) return `${deliminator}${placeholder}`
      if (link) return `${deliminator}${link}`
    } else {
      if (placeholder) return `${placeholder}`
      if (link) return `${link}`
    }
    return ''
  }

  function formatOutputNoDot(placeholder: string, link: string) {
    if (placeholder) return `${placeholder}`
    if (link) return `${link}`
    return ''
  }

  // Header Start
  const headerStartY = y
  const personalInfo = getPersonalInfoFromObj(obj)
  const personalInfo2 = getPersonalInfo2FromObj(obj)
  let personalInfoY = y + nameLineHeight

  // Check profile picture
  const profileImage = obj.profileImage
  const profileImageType = obj.profileImageType
  const hasImage = !!profileImage

  if (hasImage) {
    try {
      const imgSize = 70
      doc.addImage(profileImage, profileImageType || 'JPEG', marginLeft, y - 28, imgSize, imgSize)
    } catch (e) {
      console.error('Error rendering profile image in PDF:', e)
    }

    const imageMarginRight = marginLeft + 70 + padding + lineHeight / 2

    setFont('bold')
    doc.setFontSize(titleSize + 2)
    doc.setCharSpace((titleSize + 2) * 0.02)
    doc.text(obj.name || 'Your Name', imageMarginRight, y)

    personalInfoY = y + nameLineHeight
    setFont('normal')
    doc.setFontSize(contactInfoSize)
    doc.setTextColor('#333333')
    doc.setCharSpace(contactInfoSize * 0.015)

    const deliminatorLength = doc.getTextWidth(deliminator)

    if (personalInfo) {
      const location = obj.location
      const email = obj.email
      const phone = obj.phone

      let content = location ? `${location}` : ''
      let temp = location ? `${location}` : ''
      let tempLength = doc.getTextWidth(temp)
      doc.text(content, imageMarginRight, personalInfoY)

      content = temp && email ? `${deliminator}${email}` : email ? `${email}` : ''
      temp += temp && email ? `${deliminator}${email}` : email ? `${email}` : ''
      doc.text(content, imageMarginRight + tempLength, personalInfoY)
      tempLength = doc.getTextWidth(temp)

      content = temp && phone ? `${deliminator}${phone}` : phone ? `${phone}` : ''
      temp += temp && phone ? `${deliminator}${phone}` : phone ? `${phone}` : ''
      doc.text(content, imageMarginRight + tempLength, personalInfoY)

      personalInfoY += contactLineHeight
    }

    if (personalInfo2) {
      const github = obj.github || ''
      const website = obj.website || ''
      const linkedin = obj.linkedin || ''
      const github_placeholder = obj.github_placeholder || github
      const website_placeholder = obj.website_placeholder || website
      const linkedin_placeholder = obj.linkedin_placeholder || linkedin

      let content = formatOutput('', github_placeholder, github)
      let temp = formatOutput('', github_placeholder, github)
      let rawText = formatOutputNoDot(github_placeholder, github)

      if (isLink(github)) {
        doc.setTextColor('#115bca')
        doc.setDrawColor('#115bca')
        doc.setCharSpace(contactInfoSize * 0.015)
        doc.textWithLink(rawText, imageMarginRight, personalInfoY, { url: cleanUrl(github) })
        const textWidth = doc.getTextWidth(rawText)
        doc.line(imageMarginRight, personalInfoY, imageMarginRight + textWidth, personalInfoY)
        doc.setTextColor('#333333')
        doc.setDrawColor('#000000')
      } else {
        doc.setCharSpace(contactInfoSize * 0.015)
        doc.text(content, imageMarginRight, personalInfoY)
      }
      let tempLength = doc.getTextWidth(temp)

      content = formatOutput(temp, website_placeholder, website)
      temp += formatOutput(temp, website_placeholder, website)
      rawText = formatOutputNoDot(website_placeholder, website)

      if (isLink(website)) {
        doc.setCharSpace(contactInfoSize * 0.015)
        doc.text(deliminator, imageMarginRight + tempLength, personalInfoY)
        doc.setTextColor('#115bca')
        doc.setDrawColor('#115bca')
        doc.textWithLink(
          rawText,
          imageMarginRight + tempLength + deliminatorLength,
          personalInfoY,
          { url: cleanUrl(website) },
        )
        const textWidth = doc.getTextWidth(rawText)
        doc.line(
          imageMarginRight + tempLength + deliminatorLength,
          personalInfoY,
          imageMarginRight + tempLength + deliminatorLength + textWidth,
          personalInfoY,
        )
        doc.setTextColor('#333333')
        doc.setDrawColor('#000000')
      } else {
        doc.setCharSpace(contactInfoSize * 0.015)
        doc.text(content, imageMarginRight + tempLength, personalInfoY)
      }
      tempLength = doc.getTextWidth(temp)

      content = formatOutput(temp, linkedin_placeholder, linkedin)
      temp += formatOutput(temp, linkedin_placeholder, linkedin)
      rawText = formatOutputNoDot(linkedin_placeholder, linkedin)

      if (isLink(linkedin)) {
        doc.setCharSpace(contactInfoSize * 0.015)
        doc.text(deliminator, imageMarginRight + tempLength, personalInfoY)
        doc.setTextColor('#115bca')
        doc.setDrawColor('#115bca')
        doc.textWithLink(
          rawText,
          imageMarginRight + tempLength + deliminatorLength,
          personalInfoY,
          { url: cleanUrl(linkedin) },
        )
        const textWidth = doc.getTextWidth(rawText)
        doc.line(
          imageMarginRight + tempLength + deliminatorLength,
          personalInfoY,
          imageMarginRight + tempLength + deliminatorLength + textWidth,
          personalInfoY,
        )
        doc.setTextColor('#333333')
        doc.setDrawColor('#000000')
      } else {
        doc.setCharSpace(contactInfoSize * 0.015)
        doc.text(content, imageMarginRight + tempLength, personalInfoY)
      }

      personalInfoY += contactLineHeight
    }

    const imageBottom = headerStartY + 42 + contactLineHeight
    y = Math.max(personalInfoY, imageBottom)
    doc.setTextColor('#000000')
  } else {
    setFont('bold')
    doc.setFontSize(titleSize + 2)
    doc.setCharSpace((titleSize + 2) * 0.02)
    doc.text(obj.name || 'Your Name', midPage, y, { align: 'center' })

    personalInfoY = y + nameLineHeight
    setFont('normal')
    doc.setFontSize(contactInfoSize)
    doc.setTextColor('#333333')
    doc.setCharSpace(contactInfoSize * 0.015)

    if (personalInfo) {
      doc.text(personalInfo, midPage, personalInfoY, { align: 'center' })
      personalInfoY += contactLineHeight
    }

    if (personalInfo2) {
      // Build segments: [{text, url?}] separated by ' | '
      const linkSegments: { text: string; url?: string }[] = []
      const sep = ' | '
      const linkItems: { display: string; url: string }[] = []
      const github = obj.github || ''
      const website = obj.website || ''
      const linkedin = obj.linkedin || ''
      if (github || obj.github_placeholder) {
        linkItems.push({ display: obj.github_placeholder || github, url: github })
      }
      if (website || obj.website_placeholder) {
        linkItems.push({ display: obj.website_placeholder || website, url: website })
      }
      if (linkedin || obj.linkedin_placeholder) {
        linkItems.push({ display: obj.linkedin_placeholder || linkedin, url: linkedin })
      }

      // Interleave with separator
      linkItems.forEach((item, i) => {
        if (i > 0) linkSegments.push({ text: sep })
        linkSegments.push({ text: item.display, url: item.url || undefined })
      })

      // Compute total width to center
      const totalWidth = linkSegments.reduce((w, seg) => w + doc.getTextWidth(seg.text), 0)
      let xCursor = midPage - totalWidth / 2

      for (const seg of linkSegments) {
        const segWidth = doc.getTextWidth(seg.text)
        if (seg.url && isLink(seg.url)) {
          doc.setTextColor('#115bca')
          doc.setDrawColor('#115bca')
          doc.textWithLink(seg.text, xCursor, personalInfoY, { url: cleanUrl(seg.url) })
          doc.line(xCursor, personalInfoY, xCursor + segWidth, personalInfoY)
          doc.setTextColor('#333333')
          doc.setDrawColor('#000000')
        } else {
          doc.text(seg.text, xCursor, personalInfoY)
        }
        xCursor += segWidth
      }
      personalInfoY += contactLineHeight
    }

    if (!personalInfo && !personalInfo2) {
      personalInfoY = headerStartY + nameLineHeight
    }
    y = personalInfoY
    doc.setTextColor('#000000')
  }

  // Local Section Renderers
  function renderSummary() {
    const summary = obj.summary || ''
    if (summary.trim()) {
      y += sectionBeforeGap
      checkAndAddPage()
      setFont('bold')
      doc.setFontSize(titleSize)
      doc.setCharSpace(titleSize * 0.05)
      doc.text(sectionLabels.value.summary, marginLeft, y)
      doc.line(marginLeft, y + 5, marginRight, y + 5)
      y += sectionAfterHeaderGap
      checkAndAddPage()

      setFont('normal')
      doc.setFontSize(bodySize)
      drawRichText(summary, marginLeft)
      y += lineHeight
      checkAndAddPage()
    }
  }

  function renderObjective() {
    const objective = obj.objective || ''
    if (objective.trim()) {
      y += sectionBeforeGap
      checkAndAddPage()
      setFont('bold')
      doc.setFontSize(titleSize)
      doc.setCharSpace(titleSize * 0.05)
      doc.text(sectionLabels.value.objective, marginLeft, y)
      doc.line(marginLeft, y + 5, marginRight, y + 5)
      y += sectionAfterHeaderGap
      checkAndAddPage()

      setFont('normal')
      doc.setFontSize(bodySize)
      drawRichText(objective, marginLeft)
      y += lineHeight
      checkAndAddPage()
    }
  }

  function renderSkills() {
    const skills = obj.skills || []
    if (skills.length > 0 && (skills[0]?.skill || skills[0]?.description)) {
      y += sectionBeforeGap
      checkAndAddPage()
      setFont('bold')
      doc.setFontSize(titleSize)
      doc.setCharSpace(titleSize * 0.05)
      doc.text(sectionLabels.value.skills, marginLeft, y)
      doc.line(marginLeft, y + 5, marginRight, y + 5)
      y += sectionAfterHeaderGap
      checkAndAddPage()

      skills.forEach((entry: any, index: number) => {
        const skill = entry.skill || ''
        const description = entry.description || ''
        const normalizedSkill = skill.trim()
        const normalizedDescription = description.trim()
        doc.setFontSize(bodySize)

        let tempStr = normalizedSkill ? `**${normalizedSkill}**` : ''
        tempStr +=
          tempStr && normalizedDescription ? `: ${normalizedDescription}` : normalizedDescription

        drawRichText(tempStr, marginLeft)
        y += lineHeight
        if (index !== skills.length - 1 || y < marginBottom) {
          checkAndAddPage()
        }
      })
    }
  }

  function renderExperience() {
    const experiences = obj.experiences || []
    const hasExperienceContent = (exp: any) => {
      if (!exp) return false
      if (exp.position?.trim() || exp.company?.trim() || exp.location?.trim() || exp.dates?.trim())
        return true
      if (Array.isArray(exp.bullets) && exp.bullets.length > 0) return true
      return false
    }

    if (experiences.length > 0 && hasExperienceContent(experiences[0])) {
      y += sectionBeforeGap
      checkAndAddPage()
      setFont('bold')
      doc.setFontSize(titleSize)
      doc.setCharSpace(titleSize * 0.05)
      doc.text(sectionLabels.value.experience, marginLeft, y)
      doc.line(marginLeft, y + 5, marginRight, y + 5)
      y += sectionAfterHeaderGap
      checkAndAddPage()

      experiences.forEach((entry: any, index: number) => {
        if (index > 0) {
          y += cardBeforeGap
          checkAndAddPage()
        }

        const position = entry.position || ''
        const company = entry.company || ''
        const location = entry.location || ''
        const dates = entry.dates || ''

        const bulletParts: any[] = Array.isArray(entry.bullets) ? entry.bullets : []
        const hasHeader = bulletParts.some((p) => p.type === 'header' && p.text && p.text.trim())

        if (experienceHeaderStyle.value === 'role-company') {
          doc.setFontSize(bodySize)
          setFont('bold')
          doc.setCharSpace(bodySize * 0.05)

          const cleanPos = position.trim()
          const cleanCompany = company.trim()

          if (cleanPos && cleanCompany) {
            doc.text(cleanPos, marginLeft, y)
            const posWidth = doc.getTextWidth(cleanPos)
            setFont('normal')
            doc.setCharSpace(bodySize * 0.015)
            doc.text(`, ${cleanCompany}`, marginLeft + posWidth, y)
          } else if (cleanPos) {
            doc.text(cleanPos, marginLeft, y)
          } else if (cleanCompany) {
            setFont('normal')
            doc.setCharSpace(bodySize * 0.015)
            doc.text(cleanCompany, marginLeft, y)
          }

          setFont('normal')
          doc.setTextColor('#333333')
          doc.setCharSpace(bodySize * 0.015)
          doc.text(dates, marginRight, y, { align: 'right' })
          doc.setTextColor('#000000')

          y += lineHeight
          checkAndAddPage()
        } else {
          doc.setFontSize(bodySize)
          setFont('bold')
          doc.setCharSpace(bodySize * 0.05)
          const companyTrimmed = company.trim().toUpperCase()
          if (companyTrimmed && location) {
            doc.text(companyTrimmed, marginLeft, y)
            const companyWidth = doc.getTextWidth(companyTrimmed)
            setFont('italic')
            doc.setCharSpace(bodySize * 0.015)
            doc.text(`, ${location.trim()}`, marginLeft + companyWidth, y)
            setFont('normal')
          } else if (companyTrimmed) {
            doc.text(companyTrimmed, marginLeft, y)
          } else if (location) {
            setFont('italic')
            doc.setCharSpace(bodySize * 0.015)
            doc.text(location.trim(), marginLeft, y)
            setFont('normal')
          }

          setFont('normal')
          doc.setTextColor('#333333')
          doc.setCharSpace(bodySize * 0.015)
          doc.text(dates, marginRight, y, { align: 'right' })
          doc.setTextColor('#000000')

          if (companyTrimmed || location) {
            y += lineHeight
            checkAndAddPage()
          }

          // Position line
          const posStr = position ? `**${position.trim()}**` : ''
          drawRichText(posStr, marginLeft)
          y += lineHeight
          checkAndAddPage()
          setFont('normal')
        }

        // Render bullet parts in order
        bulletParts.forEach((part, bIdx) => {
          const textVal = part.text || ''
          if (!textVal.trim()) return

          if (part.type === 'header') {
            drawRichText(textVal.trim(), marginLeft)
            y += lineHeight
            checkAndAddPage()
          } else {
            // Bullet list spacing at the start of bullets block
            const prevPart = bulletParts[bIdx - 1]
            if (!prevPart || prevPart.type === 'header') {
              y += bulletBlockGap
              checkAndAddPage()
            }

            let level = 1
            if (part.type === 'l2') level = 2
            else if (part.type === 'l3') level = 3

            const baseIndent = hasHeader ? 10 : 0
            const indentX =
              marginLeft +
              (level === 2 ? baseIndent + 10 : level === 3 ? baseIndent + 20 : baseIndent)
            const maxWidth =
              level === 1
                ? hasHeader
                  ? 490
                  : 500
                : level === 2
                  ? hasHeader
                    ? 480
                    : 490
                  : hasHeader
                    ? 470
                    : 480

            let prefix = `${bulletChars.value.l1 || '•'}   `
            if (level === 2) prefix = `${bulletChars.value.l2 || '◦'}   `
            else if (level === 3) prefix = `${bulletChars.value.l3 || '▪'}   `

            drawRichTextBullet(textVal.trim(), indentX, prefix)
            y += bulletLineHeight
            checkAndAddPage()

            // Bullet list spacing at the end of bullets block
            const nextPart = bulletParts[bIdx + 1]
            if (!nextPart || nextPart.type === 'header') {
              y += bulletBlockGap
              checkAndAddPage()
            }
          }
        })
      })
    }
  }

  function renderProjects() {
    const projects = obj.projects || []
    const hasProjectContent = (proj: any) => {
      if (!proj) return false
      if (proj.projectName?.trim() || proj.projectLink?.trim()) return true
      if (Array.isArray(proj.bullets) && proj.bullets.length > 0) return true
      return false
    }

    if (projects.length > 0 && hasProjectContent(projects[0])) {
      y += sectionBeforeGap
      checkAndAddPage()
      setFont('bold')
      doc.setFontSize(titleSize)
      doc.setCharSpace(titleSize * 0.05)
      doc.text(sectionLabels.value.projects, marginLeft, y)
      doc.line(marginLeft, y + 5, marginRight, y + 5)
      y += sectionAfterHeaderGap
      checkAndAddPage()

      projects.forEach((entry: any, index: number) => {
        if (index > 0) {
          y += cardBeforeGap
          checkAndAddPage()
        }

        const projectName = entry.projectName || ''
        const projectLink = entry.projectLink || ''

        const bulletParts: any[] = Array.isArray(entry.bullets) ? entry.bullets : []
        const hasHeader = bulletParts.some((p) => p.type === 'header' && p.text && p.text.trim())

        setFont('bold')
        doc.setFontSize(bodySize)
        doc.setCharSpace(bodySize * 0.05)
        const projNameUpper = projectName.trim().toUpperCase()
        const projectNameLines = doc.splitTextToSize(projNameUpper, marginRight - marginLeft)

        for (let i = 0; i < projectNameLines.length; i++) {
          doc.text(projectNameLines[i], marginLeft, y)
          if (i !== projectNameLines.length - 1) {
            y += lineHeight
            checkAndAddPage()
          }
        }
        y += lineHeight
        checkAndAddPage()

        setFont('normal')
        doc.setCharSpace(bodySize * 0.015)

        // Render bullet parts in order
        bulletParts.forEach((part, bIdx) => {
          const textVal = part.text || ''
          if (!textVal.trim()) return

          if (part.type === 'header') {
            drawRichText(textVal.trim(), marginLeft)
            y += lineHeight
            checkAndAddPage()
          } else {
            // Bullet list spacing at the start of bullets block
            const prevPart = bulletParts[bIdx - 1]
            if (!prevPart || prevPart.type === 'header') {
              y += bulletBlockGap
              checkAndAddPage()
            }

            let level = 1
            if (part.type === 'l2') level = 2
            else if (part.type === 'l3') level = 3

            const baseIndent = hasHeader ? 10 : 0
            const indentX =
              marginLeft +
              (level === 2 ? baseIndent + 10 : level === 3 ? baseIndent + 20 : baseIndent)
            const maxWidth =
              level === 1
                ? hasHeader
                  ? 490
                  : 500
                : level === 2
                  ? hasHeader
                    ? 480
                    : 490
                  : hasHeader
                    ? 470
                    : 480

            let prefix = `${bulletChars.value.l1 || 'â€¢'}   `
            if (level === 2) prefix = `${bulletChars.value.l2 || 'â—¦'}   `
            else if (level === 3) prefix = `${bulletChars.value.l3 || 'â–ª'}   `

            drawRichTextBullet(textVal.trim(), indentX, prefix)
            y += bulletLineHeight
            checkAndAddPage()

            // Bullet list spacing at the end of bullets block
            const nextPart = bulletParts[bIdx + 1]
            if (!nextPart || nextPart.type === 'header') {
              y += bulletBlockGap
              checkAndAddPage()
            }
          }
        })
      })
    }
  }

  function renderEducation() {
    const educations = obj.educations || []
    if (
      educations.length > 0 &&
      (educations[0]?.university ||
        educations[0]?.degree ||
        educations[0]?.gpa ||
        educations[0]?.graduationDate)
    ) {
      y += sectionBeforeGap
      checkAndAddPage()
      setFont('bold')
      doc.setFontSize(titleSize)
      doc.setCharSpace(titleSize * 0.05)
      doc.text(sectionLabels.value.education, marginLeft, y)
      doc.line(marginLeft, y + 5, marginRight, y + 5)
      y += sectionAfterHeaderGap
      checkAndAddPage()

      educations.forEach((entry: any, index: number) => {
        if (index > 0) {
          y += cardBeforeGap
          checkAndAddPage()
        }

        const university = entry.university || ''
        const degree = entry.degree || ''
        const gpa = entry.gpa || ''
        const graduationDate = entry.graduationDate || ''

        doc.setFontSize(bodySize)
        const uniStr = university ? `**${university.trim()}**` : ''
        drawRichText(uniStr, marginLeft)

        setFont('normal')
        doc.setTextColor('#333333')
        doc.setCharSpace(bodySize * 0.015)
        doc.text(graduationDate, marginRight, y, { align: 'right' })
        doc.setTextColor('#000000')
        y += lineHeight
        checkAndAddPage()

        let degStr = degree ? `${degree.trim()}` : ''
        degStr += degStr && gpa ? ` - ${gpa.trim()}` : gpa ? `${gpa.trim()}` : ''
        drawRichText(degStr, marginLeft)

        y += lineHeight
        if (index !== educations.length - 1 || y < marginBottom) {
          checkAndAddPage()
        }
      })
    }
  }

  function renderCertificates() {
    const certificates = obj.certificates || []
    if (
      certificates.length > 0 &&
      (certificates[0]?.certName || certificates[0]?.['issuer/description'])
    ) {
      y += sectionBeforeGap
      checkAndAddPage()
      setFont('bold')
      doc.setFontSize(titleSize)
      doc.setCharSpace(titleSize * 0.05)
      doc.text(sectionLabels.value.certificates, marginLeft, y)
      doc.line(marginLeft, y + 5, marginRight, y + 5)
      y += sectionAfterHeaderGap
      checkAndAddPage()

      certificates.forEach((entry: any, index: number) => {
        if (index > 0) {
          y += cardBeforeGap
          checkAndAddPage()
        }

        const certName = entry.certName || ''
        const issuer = entry['issuer/description'] || ''
        const certDate = entry.certDate || ''

        doc.setFontSize(bodySize)
        const certStr = certName ? `**${certName.trim()}**` : ''
        drawRichText(certStr, marginLeft)

        setFont('normal')
        doc.setTextColor('#333333')
        doc.setCharSpace(bodySize * 0.015)
        doc.text(certDate, marginRight, y, { align: 'right' })
        doc.setTextColor('#000000')

        if (issuer || index !== certificates.length - 1) {
          y += lineHeight
          checkAndAddPage()
        }

        if (issuer) {
          drawRichText(issuer.trim(), marginLeft)
          if (index !== certificates.length - 1) {
            y += lineHeight
            checkAndAddPage()
          }
        }
      })
    }
  }

  // Draw Sections in active order
  sectionsOrder.value.forEach((secKey) => {
    if (disabledSections.value.includes(secKey)) return
    if (secKey === 'summary') renderSummary()
    else if (secKey === 'objective') renderObjective()
    else if (secKey === 'skills') renderSkills()
    else if (secKey === 'experience') renderExperience()
    else if (secKey === 'projects') renderProjects()
    else if (secKey === 'education') renderEducation()
    else if (secKey === 'certificates') renderCertificates()
  })

  // Set the output URL
  const blob = doc.output('blob')
  store.pdfBlob = blob
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value)
  }
  pdfBlobUrl.value = URL.createObjectURL(blob)

  if (shouldDownload) {
    doc.save(`${cv.value.name || 'resume'}.pdf`)
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

// Watchers to trigger update on change
watch(
  [
    cv,
    sizeMultiplier,
    selectedFont,
    customFontName,
    language,
    customSectionLabels,
    sectionsOrder,
    disabledSections,
    bulletChars,
    experienceHeaderStyle,
  ],
  () => {
    debouncedGeneratePDF()
  },
  { deep: true },
)

watch(
  () => store.downloadTrigger,
  () => {
    downloadPDF()
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
  <div
    class="h-full flex flex-col bg-theme-card border border-theme-border rounded-xl overflow-hidden shadow-xl transition duration-150"
  >
    <!-- Top Action Bar -->
    <div
      class="h-14 bg-theme-muted border-b border-theme-border px-4 flex justify-between items-center relative flex-shrink-0"
    >
      <div class="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="w-4 h-4 text-primary-600 dark:text-primary-400"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <span class="text-sm font-bold text-theme-text">{{ t('pdf_preview_title') }}</span>
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
        {{ t('pdf_preview_title') }}...
      </div>
    </div>
  </div>
</template>

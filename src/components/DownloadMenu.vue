<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { saveAs } from 'file-saver'
import { exportDocx, exportCoverLetterDocx } from '@/utils/docxExporter'
import { cleanUrl } from '@/utils/richText'
import { CV_LANGUAGE_SECTION_LABELS } from '@/types/cv'
import type { SectionKey } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

const isOpen = ref(false)
const isModalOpen = ref(false)
const selectedFormat = ref<'pdf' | 'docx' | 'json' | 'html'>('pdf')
const exportFileName = ref('')

const menuRef = ref<HTMLElement | null>(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function handleOutsideClick(e: MouseEvent) {
  if (isOpen.value && menuRef.value && !menuRef.value.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
})

// Trigger modal with format selection and default name
function openDownloadModal(format: 'pdf' | 'docx' | 'json' | 'html') {
  selectedFormat.value = format
  const nameStr = store.cvData.name ? store.cvData.name.trim().replace(/\s+/g, '_') : 'resume'
  if (store.activeWorkspace === 'cover-letter') {
    exportFileName.value = `${nameStr}_Cover_Letter`
  } else {
    exportFileName.value = `${nameStr}_Resume`
  }
  isModalOpen.value = true
  close()
}

// Execute selected download type
function executeDownload() {
  const filename = (exportFileName.value || 'resume').trim()
  if (selectedFormat.value === 'pdf') {
    if (store.pdfBlob) {
      saveAs(store.pdfBlob, `${filename}.pdf`)
    } else {
      store.triggerDownload()
    }
  } else if (selectedFormat.value === 'docx') {
    if (store.activeWorkspace === 'cover-letter') {
      executeCoverLetterDocxDownload(filename)
    } else {
      executeDocxDownload(filename)
    }
  } else if (selectedFormat.value === 'html') {
    if (store.activeWorkspace === 'cv') {
      executeHtmlDownload(filename)
    }
  } else if (selectedFormat.value === 'json') {
    executeJsonDownload(filename)
  }
  isModalOpen.value = false
}

// JSON Export
function executeJsonDownload(filename: string) {
  const data = {
    cv: store.cvData,
    coverLetter: store.coverLetterData,
    language: store.language,
    sizeMultiplier: store.sizeMultiplier,
    selectedFont: store.selectedFont,
    customFontName: store.customFontName,
    editorMode: store.editorMode,
    sectionsOrder: store.sectionsOrder,
    disabledSections: store.disabledSections,
    experienceHeaderStyle: store.experienceHeaderStyle,
    bulletChars: store.bulletChars,
    customSectionLabels: store.customSectionLabels,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  saveAs(blob, `${filename}.json`)
}

// Cover Letter DOCX Export
async function executeCoverLetterDocxDownload(filename: string) {
  try {
    const blob = await exportCoverLetterDocx({
      coverLetter: store.coverLetterData,
      selectedFont: store.selectedFont,
      customFontName: store.customFontName,
      sizeMultiplier: store.sizeMultiplier,
    })
    saveAs(blob, `${filename}.docx`)
  } catch (err) {
    console.error('Error generating Cover Letter DOCX:', err)
  }
}

// Helper to check links
function isLink(val: string) {
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

// HTML Export
function executeHtmlDownload(filename: string) {
  const cv = store.cvData
  const bulletChars = store.bulletChars

  const defaultLabels = (CV_LANGUAGE_SECTION_LABELS[store.language] ||
    CV_LANGUAGE_SECTION_LABELS.English) as Record<SectionKey, string>
  const sectionLabels = {
    summary: (store.customSectionLabels.summary ?? '').trim() || defaultLabels.summary,
    objective: (store.customSectionLabels.objective ?? '').trim() || defaultLabels.objective,
    skills: (store.customSectionLabels.skills ?? '').trim() || defaultLabels.skills,
    experience: (store.customSectionLabels.experience ?? '').trim() || defaultLabels.experience,
    projects: (store.customSectionLabels.projects ?? '').trim() || defaultLabels.projects,
    education: (store.customSectionLabels.education ?? '').trim() || defaultLabels.education,
    certificates:
      (store.customSectionLabels.certificates ?? '').trim() || defaultLabels.certificates,
  }

  // Parse rich text simple formatting: ***bolditalic***, **bold**, *italic* / _italic_
  function parseRichTextToHtml(text: string): string {
    let html = text
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/_(.*?)_/g, '<em>$1</em>')

    // Unescape underline tags
    html = html.replace(/&lt;u&gt;/gi, '<u>').replace(/&lt;\/u&gt;/gi, '</u>')

    return html
  }

  // Build Contact Header Info
  const personalInfo = []
  if (cv.location) personalInfo.push(cv.location)
  if (cv.email) personalInfo.push(`<a href="mailto:${cv.email}">${cv.email}</a>`)
  if (cv.phone) personalInfo.push(cv.phone)

  const linksInfo = []
  if (cv.github) {
    linksInfo.push(
      `<a href="${cleanUrl(cv.github)}" target="_blank">${cv.github_placeholder || cv.github}</a>`,
    )
  }
  if (cv.website) {
    linksInfo.push(
      `<a href="${cleanUrl(cv.website)}" target="_blank">${cv.website_placeholder || cv.website}</a>`,
    )
  }
  if (cv.linkedin) {
    linksInfo.push(
      `<a href="${cleanUrl(cv.linkedin)}" target="_blank">${cv.linkedin_placeholder || cv.linkedin}</a>`,
    )
  }

  const contactLines = []
  if (personalInfo.length > 0) contactLines.push(personalInfo.join(' &nbsp;|&nbsp; '))
  if (linksInfo.length > 0) contactLines.push(linksInfo.join(' &nbsp;|&nbsp; '))

  const hasImage = !!cv.profileImage
  const name = cv.name || 'Your Name'

  // Map font css and font link for HTML (Requirement 3)
  let fontCssFamily = "'Noto Sans', sans-serif"
  let googleFontLink =
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">'

  if (store.selectedFont === 'arial') {
    fontCssFamily = 'Arial, Helvetica, sans-serif'
    googleFontLink = ''
  } else if (store.selectedFont === 'custom' && store.customFontName) {
    const customFont = store.customFontName.trim()
    fontCssFamily = `'${customFont}', 'Times New Roman', serif`
    const fontNameClean = customFont.replace(/\s+/g, '+')
    googleFontLink = `<link href="https://fonts.googleapis.com/css2?family=${fontNameClean}:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">`
  }

  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${name} - CV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${googleFontLink}
  <style>
    body {
      font-family: ${fontCssFamily};
      font-size: 14.5px;
      line-height: 1.45;
      color: #111;
      background-color: #fff;
      margin: 40px auto;
      max-width: 800px;
      padding: 0 20px;
    }
    h1 {
      font-size: 26px;
      margin: 0 0 5px 0;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
    }
    .contact-info {
      font-size: 12px;
      color: #444;
      line-height: 1.6;
    }
    .contact-info a {
      color: #115bca;
      text-decoration: none;
    }
    .contact-info a:hover {
      text-decoration: underline;
    }
    .section-title {
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #333;
      padding-bottom: 2px;
      margin-top: 22px;
      margin-bottom: 10px;
      letter-spacing: 1.2px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      margin-top: 10px;
      font-size: 14.5px;
    }
    .item-subheader {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-style: italic;
      font-size: 14px;
      margin-top: 2px;
      margin-bottom: 4px;
    }
    .item-date {
      font-weight: normal;
      font-style: normal;
      color: #444;
    }
    .bullet-list {
      margin: 4px 0 8px 0;
      padding-left: 0px;
      list-style-type: none;
    }
    .bullet-item {
      position: relative;
      margin-bottom: 3px;
      padding-left: 20px;
    }
    .bullet-item::before {
      position: absolute;
      left: 0;
    }
    .bullet-item.l1::before {
      content: "${bulletChars.l1 || '•'}";
    }
    .bullet-item.l2 {
      padding-left: 35px;
    }
    .bullet-item.l2::before {
      content: "${bulletChars.l2 || '◦'}";
      left: 15px;
    }
    .bullet-item.l3 {
      padding-left: 50px;
    }
    .bullet-item.l3::before {
      content: "${bulletChars.l3 || '▪'}";
      left: 30px;
    }
    .bullet-header {
      font-weight: bold;
      margin-top: 6px;
      margin-bottom: 3px;
    }
    .skill-category {
      margin-bottom: 6px;
    }
    @media print {
      body {
        margin: 20px auto;
        padding: 0;
      }
    }
  </style>
</head>
<body>
`

  // Render Header
  if (hasImage) {
    htmlContent += `  <div style="overflow: hidden; margin-bottom: 25px; border-bottom: 2px solid #222; padding-bottom: 15px;">
    <img src="${cv.profileImage}" style="float: left; width: 75px; height: 75px; border-radius: 8px; margin-right: 20px; object-fit: cover;">
    <div style="float: left;">
      <h1 style="text-align: left; margin: 0 0 5px 0;">${name}</h1>
      <div class="contact-info" style="text-align: left;">
        ${contactLines.join('<br>')}
      </div>
    </div>
  </div>\n`
  } else {
    htmlContent += `  <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #222; padding-bottom: 15px;">
    <h1 style="text-align: center; margin: 0 0 5px 0;">${name}</h1>
    <div class="contact-info" style="text-align: center;">
      ${contactLines.join('<br>')}
    </div>
  </div>\n`
  }

  // Render Sections in order
  store.sectionsOrder.forEach((secKey) => {
    if (store.disabledSections.includes(secKey)) return

    if (secKey === 'summary' && cv.summary?.trim()) {
      htmlContent += `  <div>
    <div class="section-title">${sectionLabels.summary}</div>
    <div style="text-align: justify;">${parseRichTextToHtml(cv.summary)}</div>
  </div>\n`
    }

    if (secKey === 'objective' && cv.objective?.trim()) {
      htmlContent += `  <div>
    <div class="section-title">${sectionLabels.objective}</div>
    <div style="text-align: justify;">${parseRichTextToHtml(cv.objective)}</div>
  </div>\n`
    }

    if (secKey === 'skills' && cv.skills?.length) {
      htmlContent += `  <div>
    <div class="section-title">${sectionLabels.skills}</div>
    <div class="skills-grid">`
      cv.skills.forEach((entry) => {
        if (!entry.skill?.trim() && !entry.description?.trim()) return
        const skillName = entry.skill?.trim()
        const desc = entry.description?.trim()
        htmlContent += `      <div class="skill-category">`
        if (skillName) {
          htmlContent += `<strong>${parseRichTextToHtml(skillName)}</strong>`
        }
        if (skillName && desc) {
          htmlContent += `: `
        }
        if (desc) {
          htmlContent += `${parseRichTextToHtml(desc)}`
        }
        htmlContent += `</div>`
      })
      htmlContent += `    </div>
  </div>\n`
    }

    if (secKey === 'experience' && cv.experiences?.length) {
      htmlContent += `  <div>
    <div class="section-title">${sectionLabels.experience}</div>`
      cv.experiences.forEach((entry) => {
        if (!entry.company?.trim() && !entry.position?.trim()) return
        htmlContent += `    <div style="margin-bottom: 12px; page-break-inside: avoid;">
      <div class="item-header">
        <span>${entry.company?.trim().toUpperCase() || ''}${entry.location ? `, <em>${entry.location.trim()}</em>` : ''}</span>
        <span class="item-date">${entry.dates || ''}</span>
      </div>
      <div class="item-subheader">
        <span>${entry.position || ''}</span>
      </div>`

        if (entry.bullets?.length) {
          htmlContent += `      <ul class="bullet-list">`
          entry.bullets.forEach((bullet) => {
            const textVal = bullet.text?.trim()
            if (!textVal) return
            if (bullet.type === 'header') {
              htmlContent += `        <li class="bullet-header">${parseRichTextToHtml(textVal)}</li>`
            } else {
              const levelClass = bullet.type === 'l2' ? 'l2' : bullet.type === 'l3' ? 'l3' : 'l1'
              htmlContent += `        <li class="bullet-item ${levelClass}">${parseRichTextToHtml(textVal)}</li>`
            }
          })
          htmlContent += `      </ul>`
        }
        htmlContent += `    </div>`
      })
      htmlContent += `  </div>\n`
    }

    if (secKey === 'projects' && cv.projects?.length) {
      htmlContent += `  <div>
    <div class="section-title">${sectionLabels.projects}</div>`
      cv.projects.forEach((entry) => {
        if (!entry.projectName?.trim()) return
        htmlContent += `    <div style="margin-bottom: 12px; page-break-inside: avoid;">
      <div class="item-header">
        <span>${entry.projectName.trim().toUpperCase()}</span>
        <span class="item-date">${entry.projectLink ? `<a href="${cleanUrl(entry.projectLink)}" target="_blank" style="color: #115bca; font-size: 13px;">${entry.projectLink}</a>` : ''}</span>
      </div>`

        if (entry.bullets?.length) {
          htmlContent += `      <ul class="bullet-list">`
          entry.bullets.forEach((bullet) => {
            const textVal = bullet.text?.trim()
            if (!textVal) return
            if (bullet.type === 'header') {
              htmlContent += `        <li class="bullet-header">${parseRichTextToHtml(textVal)}</li>`
            } else {
              const levelClass = bullet.type === 'l2' ? 'l2' : bullet.type === 'l3' ? 'l3' : 'l1'
              htmlContent += `        <li class="bullet-item ${levelClass}">${parseRichTextToHtml(textVal)}</li>`
            }
          })
          htmlContent += `      </ul>`
        }
        htmlContent += `    </div>`
      })
      htmlContent += `  </div>\n`
    }

    if (secKey === 'education' && cv.educations?.length) {
      htmlContent += `  <div>
    <div class="section-title">${sectionLabels.education}</div>`
      cv.educations.forEach((entry) => {
        if (!entry.university?.trim()) return
        htmlContent += `    <div style="margin-bottom: 10px; page-break-inside: avoid;">
      <div class="item-header">
        <span>${entry.university.trim()}</span>
        <span class="item-date">${entry.graduationDate || ''}</span>
      </div>
      <div class="item-subheader">
        <span>${entry.degree || ''}${entry.gpa ? ` (GPA: ${entry.gpa})` : ''}</span>
      </div>
    </div>`
      })
      htmlContent += `  </div>\n`
    }

    if (secKey === 'certificates' && cv.certificates?.length) {
      htmlContent += `  <div>
    <div class="section-title">${sectionLabels.certificates}</div>`
      cv.certificates.forEach((entry) => {
        if (!entry.certName?.trim()) return
        htmlContent += `    <div style="margin-bottom: 8px; page-break-inside: avoid;">
      <div class="item-header">
        <span>${entry.certName.trim()}</span>
        <span class="item-date">${entry.certDate || ''}</span>
      </div>
      ${entry['issuer/description'] ? `<div style="font-size: 13.5px; color: #444; margin-top: 2px;">${parseRichTextToHtml(entry['issuer/description'])}</div>` : ''}
    </div>`
      })
      htmlContent += `  </div>\n`
    }
  })

  htmlContent += `</body>
</html>`

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
  saveAs(blob, `${filename}.html`)
}

// DOCX Export
async function executeDocxDownload(filename: string) {
  const defaultLabels = (CV_LANGUAGE_SECTION_LABELS[store.language] ||
    CV_LANGUAGE_SECTION_LABELS.English) as Record<SectionKey, string>
  const sectionLabels = {
    summary: (store.customSectionLabels.summary ?? '').trim() || defaultLabels.summary,
    objective: (store.customSectionLabels.objective ?? '').trim() || defaultLabels.objective,
    skills: (store.customSectionLabels.skills ?? '').trim() || defaultLabels.skills,
    experience: (store.customSectionLabels.experience ?? '').trim() || defaultLabels.experience,
    projects: (store.customSectionLabels.projects ?? '').trim() || defaultLabels.projects,
    education: (store.customSectionLabels.education ?? '').trim() || defaultLabels.education,
    certificates:
      (store.customSectionLabels.certificates ?? '').trim() || defaultLabels.certificates,
  }

  const safeMultiplier = Math.min(1.6, Math.max(0.8, store.sizeMultiplier))
  const bodySize = Math.max(10, Math.round(10 * safeMultiplier))
  const titleSize = Math.round(14 * safeMultiplier)
  const contactInfoSize = Math.max(9, Math.round(bodySize * 0.9))

  const typography = {
    body: bodySize,
    title: titleSize,
    contactInfo: contactInfoSize,
  }

  try {
    const blob = await exportDocx({
      cv: store.cvData,
      labels: sectionLabels,
      sectionsOrder: store.sectionsOrder,
      disabledSections: store.disabledSections,
      selectedFont: store.selectedFont,
      customFontName: store.customFontName,
      bulletChars: store.bulletChars,
      typography,
      experienceHeaderStyle: store.experienceHeaderStyle,
    })
    saveAs(blob, `${filename}.docx`)
  } catch (err) {
    console.error('Error generating DOCX:', err)
  }
}
</script>

<template>
  <div class="relative" ref="menuRef">
    <!-- Main Dropdown Toggle Button -->
    <button
      @click.stop="toggle"
      class="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition duration-150 flex items-center gap-1.5 shadow-md cursor-pointer border border-primary-500/20 animate-fade-in"
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
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
      {{ t('download_btn') }}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2.5"
        stroke="currentColor"
        class="w-3 h-3 ml-0.5 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Dropdown Menu items -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-52 bg-theme-card border border-theme-border rounded-xl py-1.5 shadow-2xl z-50 text-theme-text-sub flex flex-col transition duration-150"
    >
      <!-- Download PDF -->
      <button
        @click="openDownloadModal('pdf')"
        class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-theme-hover hover:text-theme-text transition text-left cursor-pointer"
      >
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
        {{ t('download_pdf') }}
      </button>

      <!-- Download HTML -->
      <button
        v-if="store.activeWorkspace === 'cv'"
        @click="openDownloadModal('html')"
        class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-theme-hover hover:text-theme-text transition text-left cursor-pointer"
      >
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
            d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
          />
        </svg>
        {{ t('download_html') }}
      </button>

      <!-- Download JSON -->
      <button
        @click="openDownloadModal('json')"
        class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-theme-hover hover:text-theme-text transition text-left cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="w-4 h-4 text-purple-600 dark:text-purple-400"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
          />
        </svg>
        {{ t('download_json') }}
      </button>

      <div class="h-px bg-theme-border my-1"></div>

      <!-- Download DOCX -->
      <button
        @click="openDownloadModal('docx')"
        class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-theme-hover hover:text-theme-text transition text-left cursor-pointer"
      >
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
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <span>{{ t('download_docx') }}</span>
      </button>
    </div>

    <!-- Download Configuration Modal -->
    <UModal
      v-model:open="isModalOpen"
      :overlay="true"
      :modal="true"
      :title="t('download_options_title')"
      class="max-w-xl w-full md:max-w-2xl"
    >
      <template #body>
        <div class="space-y-6 text-theme-text-sub py-2">
          <!-- File Name Input -->
          <div class="flex flex-col gap-2">
            <label class="text-xs text-theme-text-muted font-bold uppercase tracking-wider">
              {{ t('file_name') }}
            </label>
            <div class="flex items-center">
              <input
                v-model="exportFileName"
                type="text"
                class="input-field rounded-r-none border-r-0 py-3 text-base"
                placeholder="e.g. John_Doe_Resume"
              />
              <span
                class="bg-theme-element border border-theme-border px-4 py-3 rounded-r-lg text-base font-semibold text-theme-text-muted select-none"
              >
                .{{ selectedFormat }}
              </span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex justify-end gap-3 pt-6 border-t border-theme-border">
            <button
              @click="isModalOpen = false"
              class="px-5 py-2.5 bg-theme-element hover:bg-theme-hover text-theme-text-sub font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
            >
              {{ t('cancel') }}
            </button>
            <button
              @click="executeDownload"
              class="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
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
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {{ t('download_confirm') }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

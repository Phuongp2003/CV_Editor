<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { saveAs } from 'file-saver'
import { exportDocx, exportCoverLetterDocx } from '@/utils/docxExporter'
import { cleanUrl } from '@/utils/richText'
import { CV_LANGUAGE_SECTION_LABELS } from '@/types/cv'
import type { SectionKey } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

const selectedFormat = ref<'pdf' | 'docx' | 'json' | 'html'>('pdf')

function baseFileName(): string {
  const nameStr = store.cvData.name ? store.cvData.name.trim().replace(/\s+/g, '_') : 'resume'
  return store.activeWorkspace === 'cover-letter' ? `${nameStr}_Cover_Letter` : `${nameStr}_CV`
}

function download(format: 'pdf' | 'docx' | 'json' | 'html') {
  selectedFormat.value = format
  executeDownload()
}

const menuItems = computed(() => [
  [
    { label: t('download_docx'), icon: 'i-lucide-file-type', onSelect: () => download('docx') },
    ...(store.activeWorkspace === 'cv'
      ? [{ label: t('download_html'), icon: 'i-lucide-code', onSelect: () => download('html') }]
      : []),
    { label: t('download_json'), icon: 'i-lucide-braces', onSelect: () => download('json') },
  ],
])

// Execute selected download type
function executeDownload() {
  const filename = baseFileName()
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
}

// JSON Export
function executeJsonDownload(filename: string) {
  const data = store.exportState()
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
  const av = store.avatarStyle
  const avPx = { sm: 60, md: 76, lg: 96 }[av.size]
  const avatarCss = [
    `width: ${avPx}px`,
    `height: ${avPx}px`,
    `border-radius: ${av.shape === 'circle' ? '50%' : av.shape === 'rounded' ? '16%' : '0'}`,
    `object-fit: ${av.fit}`,
    'background: #fff',
    av.position === 'center'
      ? 'display: block; margin: 0 auto 10px'
      : `float: ${av.position}; margin-${av.position === 'left' ? 'right' : 'left'}: 20px`,
  ].join('; ')

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
    <img src="${cv.profileImage}" alt="" style="${avatarCss}">
    <div style="${av.position === 'center' ? 'text-align: center;' : `float: ${av.position === 'right' ? 'right' : 'left'};`}">
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
      const activeExps = cv.experiences.filter(
        (entry) => entry.company?.trim() || entry.position?.trim() || entry.bullets?.length,
      )
      activeExps.forEach((entry, index) => {
        const company = entry.company?.trim() || ''
        const position = entry.position?.trim() || ''
        const dates = entry.dates?.trim() || ''
        const previousCompany = activeExps[index - 1]?.company?.trim() || ''
        const sameCompany = !!company && previousCompany.toLowerCase() === company.toLowerCase()
        const groupedContinuation = sameCompany && store.experienceCompanyMode === 'single-title'
        const roleLabel = [position, dates].filter(Boolean).join(' · ')
        const bulletRows = (entry.bullets || []).map((bullet) => ({ ...bullet }))
        let roleBulletIndex = -1
        if (groupedContinuation && roleLabel) {
          roleBulletIndex = bulletRows.findIndex((bullet) => bullet.type !== 'header' && bullet.text?.trim())
          if (roleBulletIndex >= 0) {
            bulletRows[roleBulletIndex]!.text = `**${roleLabel}:** ${bulletRows[roleBulletIndex]!.text}`
          } else {
            roleBulletIndex = bulletRows.length
            bulletRows.push({ id: `role-${index}`, type: 'l1', text: `**${roleLabel}**` })
          }
        }
        htmlContent += `    <div style="margin-bottom: ${sameCompany ? 4 : 12}px; page-break-inside: avoid;">
${groupedContinuation ? '' : sameCompany ? `      <div class="item-subheader">
        <span>${position}</span>
        <span class="item-date">${dates}</span>
      </div>` : `      <div class="item-header">
        <span>${company.toUpperCase()}${entry.location ? `, <em>${entry.location.trim()}</em>` : ''}</span>
        <span class="item-date">${dates}</span>
      </div>
      <div class="item-subheader">
        <span>${position}</span>
      </div>`}`
        if (bulletRows.length) {
          htmlContent += `      <ul class="bullet-list">`
          bulletRows.forEach((bullet, bulletIndex) => {
            const textVal = bullet.text?.trim()
            if (!textVal) return
            if (bullet.type === 'header') {
              htmlContent += `        <li class="bullet-header">${parseRichTextToHtml(textVal)}</li>`
            } else {
              let level = bullet.type === 'l2' ? 2 : bullet.type === 'l3' ? 3 : 1
              if (groupedContinuation && roleBulletIndex >= 0 && bulletIndex !== roleBulletIndex) level = Math.min(3, level + 1)
              const levelClass = level === 2 ? 'l2' : level === 3 ? 'l3' : 'l1'
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
      experienceCompanyMode: store.experienceCompanyMode,
      template: store.template,
    })
    saveAs(blob, `${filename}.docx`)
  } catch (err) {
    console.error('Error generating DOCX:', err)
  }
}
</script>

<template>
  <UFieldGroup>
    <UButton
      color="primary"
      icon="i-lucide-download"
      :label="store.activeWorkspace === 'cv' ? t('download_pdf') : t('download_btn') + ' PDF'"
      @click="download('pdf')"
    />
    <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
      <UButton color="primary" icon="i-lucide-chevron-down" :aria-label="t('download_more')" />
    </UDropdownMenu>
  </UFieldGroup>
</template>

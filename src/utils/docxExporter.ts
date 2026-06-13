import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ExternalHyperlink,
} from 'docx'
import type { CVData, BulletPart } from '@/types/cv'

const DEFAULT_LABELS = {
  summary: 'Summary',
  objective: 'Objective',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  certificates: 'Certificates',
}

interface ExportDocxOptions {
  cv: CVData
  labels?: Record<string, string>
  sectionsOrder: string[]
  disabledSections: string[]
  selectedFont: string
  customFontName?: string
  bulletChars?: { l1: string; l2: string; l3: string }
  typography: {
    body: number
    title: number
    contactInfo: number
  }
}

interface TextSegment {
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
}

// Helper to clean urls
function cleanUrl(url: string) {
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url
  }
  return url
}

// Regex scanning for ***bolditalic***, **bold**, *italic* / _italic_
function parseRichText(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let currentText = ''
  let isBold = false
  let isItalic = false
  let isUnderline = false

  let i = 0
  while (i < text.length) {
    if (text.startsWith('***', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isBold = !isBold
      isItalic = !isItalic
      i += 3
    } else if (text.startsWith('**', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isBold = !isBold
      i += 2
    } else if (text.startsWith('<u>', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isUnderline = true
      i += 3
    } else if (text.startsWith('</u>', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isUnderline = false
      i += 4
    } else if (text.startsWith('*', i) || text.startsWith('_', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isItalic = !isItalic
      i += 1
    } else {
      currentText += text[i]
      i += 1
    }
  }
  if (currentText) {
    segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
  }
  return segments
}

// Helper to create TextRuns with bold/italic/underline parsing
function createRichTextRuns(
  text: string,
  fontName: string,
  size: number,
  options?: { defaultBold?: boolean; defaultColor?: string },
): TextRun[] {
  const segments = parseRichText(text)
  return segments.map((seg) => {
    return new TextRun({
      text: seg.text,
      bold: seg.bold || (options?.defaultBold ?? false),
      italics: seg.italic,
      underline: seg.underline ? {} : undefined,
      font: fontName,
      size: size,
      color: options?.defaultColor,
    })
  })
}

// Helper to create borderless table rows for two-column alignment (Title on left, Dates/Links on right)
function createTwoColumnHeader({
  leftChildren,
  rightChildren,
}: {
  leftChildren: any[]
  rightChildren: any[]
}): Table {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: leftChildren,
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: rightChildren,
          }),
        ],
      }),
    ],
  })
}

export async function exportDocx({
  cv,
  labels = {},
  sectionsOrder,
  disabledSections,
  selectedFont,
  customFontName,
  bulletChars = { l1: '•', l2: '◦', l3: '▪' },
  typography,
}: ExportDocxOptions): Promise<Blob> {
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels }
  const bodySize = typography.body * 2
  const contactInfoSize = typography.contactInfo * 2
  const titleSize = typography.title * 2

  // Map font name
  let fontName = 'Noto Sans'
  if (selectedFont === 'arial') {
    fontName = 'Arial'
  } else if (selectedFont === 'custom' && customFontName) {
    fontName = customFontName.trim()
  }

  const children: any[] = []

  // 1. Name Header
  if (cv.name?.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: cv.name.trim().toUpperCase(),
            bold: true,
            size: titleSize + 6,
            font: fontName,
          }),
        ],
      }),
    )
  }

  // 2. Personal Info line 1: location | email | phone
  const contactParts = [cv.location, cv.email, cv.phone].filter((p) => p?.trim())
  if (contactParts.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: contactParts.join('  |  '),
            size: contactInfoSize,
            font: fontName,
            color: '333333',
          }),
        ],
      }),
    )
  }

  // 3. Social Info line 2: github | website | linkedin (with hyperlinks)
  const socialChildren: (TextRun | ExternalHyperlink)[] = []
  let needsPipe = false

  if (cv.github?.trim()) {
    socialChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: cv.github_placeholder || cv.github.trim(),
            font: fontName,
            size: contactInfoSize,
            color: '115BCA',
            underline: {},
          }),
        ],
        link: cleanUrl(cv.github),
      }),
    )
    needsPipe = true
  }

  if (cv.website?.trim()) {
    if (needsPipe) {
      socialChildren.push(
        new TextRun({ text: '  |  ', font: fontName, size: contactInfoSize, color: '333333' }),
      )
    }
    socialChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: cv.website_placeholder || cv.website.trim(),
            font: fontName,
            size: contactInfoSize,
            color: '115BCA',
            underline: {},
          }),
        ],
        link: cleanUrl(cv.website),
      }),
    )
    needsPipe = true
  }

  if (cv.linkedin?.trim()) {
    if (needsPipe) {
      socialChildren.push(
        new TextRun({ text: '  |  ', font: fontName, size: contactInfoSize, color: '333333' }),
      )
    }
    socialChildren.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: cv.linkedin_placeholder || cv.linkedin.trim(),
            font: fontName,
            size: contactInfoSize,
            color: '115BCA',
            underline: {},
          }),
        ],
        link: cleanUrl(cv.linkedin),
      }),
    )
  }

  if (socialChildren.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        border: {
          bottom: {
            color: '222222',
            space: 8,
            style: BorderStyle.SINGLE,
            size: 16, // 2pt bottom line matching PDF
          },
        },
        children: socialChildren,
      }),
    )
  } else if (contactParts.length) {
    // If no social links but contact info exists, add border to contact info
    const lastP = children[children.length - 1]
    if (lastP) {
      children[children.length - 1] = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        border: {
          bottom: {
            color: '222222',
            space: 8,
            style: BorderStyle.SINGLE,
            size: 16,
          },
        },
        children: lastP.children,
      })
    }
  }

  // Helper to append a section title
  const addSectionTitle = (title: string) => {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        border: {
          bottom: {
            color: '333333',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 12, // 1.5pt bottom border matching PDF
          },
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: titleSize,
            font: fontName,
          }),
        ],
      }),
    )
  }

  // Loop through sectionsOrder and render active sections
  sectionsOrder.forEach((secKey) => {
    if (disabledSections.includes(secKey)) return

    if (secKey === 'summary' && cv.summary?.trim()) {
      addSectionTitle(resolvedLabels.summary)
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
          children: createRichTextRuns(cv.summary.trim(), fontName, bodySize),
        }),
      )
    }

    if (secKey === 'objective' && cv.objective?.trim()) {
      addSectionTitle(resolvedLabels.objective)
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
          children: createRichTextRuns(cv.objective.trim(), fontName, bodySize),
        }),
      )
    }

    if (secKey === 'skills' && cv.skills?.length) {
      addSectionTitle(resolvedLabels.skills)
      cv.skills.forEach((entry) => {
        const skill = entry.skill?.trim() || ''
        const desc = entry.description?.trim() || ''
        if (!skill && !desc) return

        let tempStr = skill ? `**${skill}**` : ''
        tempStr += tempStr && desc ? `: ${desc}` : desc

        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: createRichTextRuns(tempStr, fontName, bodySize),
          }),
        )
      })
    }

    if (secKey === 'experience' && cv.experiences?.length) {
      const activeExps = cv.experiences.filter(
        (exp) =>
          exp.position?.trim() ||
          exp.company?.trim() ||
          exp.location?.trim() ||
          exp.dates?.trim() ||
          exp.bullets?.length,
      )
      if (activeExps.length > 0) {
        addSectionTitle(resolvedLabels.experience)
        activeExps.forEach((entry, index) => {
          const companyStr = entry.company?.trim() || ''
          const posStr = entry.position?.trim() || ''
          const datesStr = entry.dates?.trim() || ''
          const locStr = entry.location?.trim() || ''

          if (index > 0) {
            // Spacer between experience items
            children.push(new Paragraph({ spacing: { before: 120 } }))
          }

          // Company Name & Location on left, Dates on right (2-column table)
          const leftRuns = []
          if (companyStr) {
            leftRuns.push(
              new TextRun({
                text: companyStr.toUpperCase(),
                bold: true,
                font: fontName,
                size: bodySize,
              }),
            )
          }
          if (locStr) {
            if (companyStr) {
              leftRuns.push(new TextRun({ text: ', ', font: fontName, size: bodySize }))
            }
            leftRuns.push(
              new TextRun({
                text: locStr,
                italics: true,
                font: fontName,
                size: bodySize,
              }),
            )
          }

          const rightRuns = []
          if (datesStr) {
            rightRuns.push(
              new TextRun({
                text: datesStr,
                font: fontName,
                size: bodySize,
                color: '333333',
              }),
            )
          }

          children.push(
            createTwoColumnHeader({
              leftChildren: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: leftRuns,
                }),
              ],
              rightChildren: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 40 },
                  children: rightRuns,
                }),
              ],
            }),
          )

          // Position line below header
          if (posStr) {
            children.push(
              new Paragraph({
                spacing: { after: 80 },
                children: createRichTextRuns(posStr, fontName, bodySize, { defaultBold: true }),
              }),
            )
          }

          // Bullets
          if (entry.bullets?.length) {
            const hasHeader = entry.bullets.some((b) => b.type === 'header' && b.text?.trim())
            entry.bullets.forEach((bullet) => {
              const textVal = bullet.text?.trim()
              if (!textVal) return

              if (bullet.type === 'header') {
                children.push(
                  new Paragraph({
                    spacing: { before: 80, after: 40 },
                    children: createRichTextRuns(textVal, fontName, bodySize, {
                      defaultBold: true,
                    }),
                  }),
                )
              } else {
                let level: 1 | 2 | 3 = 1
                let bulletChar = bulletChars.l1 || '•'
                if (bullet.type === 'l2') {
                  level = 2
                  bulletChar = bulletChars.l2 || '◦'
                } else if (bullet.type === 'l3') {
                  level = 3
                  bulletChar = bulletChars.l3 || '▪'
                }

                const baseIndent = hasHeader ? 180 : 0
                let leftIndent = 360 + baseIndent
                if (level === 2) leftIndent = 720 + baseIndent
                if (level === 3) leftIndent = 1080 + baseIndent

                children.push(
                  new Paragraph({
                    indent: {
                      left: leftIndent,
                      hanging: 180,
                    },
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: bulletChar + '   ',
                        font: fontName,
                        size: bodySize,
                      }),
                      ...createRichTextRuns(textVal, fontName, bodySize),
                    ],
                  }),
                )
              }
            })
          }
        })
      }
    }

    if (secKey === 'projects' && cv.projects?.length) {
      const activeProjs = cv.projects.filter(
        (proj) => proj.projectName?.trim() || proj.bullets?.length,
      )
      if (activeProjs.length > 0) {
        addSectionTitle(resolvedLabels.projects)
        activeProjs.forEach((entry, index) => {
          const nameStr = entry.projectName?.trim() || ''
          const linkStr = entry.projectLink?.trim() || ''

          if (index > 0) {
            children.push(new Paragraph({ spacing: { before: 120 } }))
          }

          // Project Name on left, Link on right (2-column table)
          const leftRuns = []
          if (nameStr) {
            leftRuns.push(
              new TextRun({
                text: nameStr.toUpperCase(),
                bold: true,
                font: fontName,
                size: bodySize,
              }),
            )
          }

          const rightRuns = []
          if (linkStr) {
            rightRuns.push(
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: linkStr,
                    font: fontName,
                    size: bodySize - 2, // slightly smaller matching PDF
                    color: '115BCA',
                    underline: {},
                  }),
                ],
                link: cleanUrl(linkStr),
              }),
            )
          }

          children.push(
            createTwoColumnHeader({
              leftChildren: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: leftRuns,
                }),
              ],
              rightChildren: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 60 },
                  children: rightRuns,
                }),
              ],
            }),
          )

          // Bullets
          if (entry.bullets?.length) {
            const hasHeader = entry.bullets.some((b) => b.type === 'header' && b.text?.trim())
            entry.bullets.forEach((bullet) => {
              const textVal = bullet.text?.trim()
              if (!textVal) return

              if (bullet.type === 'header') {
                children.push(
                  new Paragraph({
                    spacing: { before: 80, after: 40 },
                    children: createRichTextRuns(textVal, fontName, bodySize, {
                      defaultBold: true,
                    }),
                  }),
                )
              } else {
                let level: 1 | 2 | 3 = 1
                let bulletChar = bulletChars.l1 || '•'
                if (bullet.type === 'l2') {
                  level = 2
                  bulletChar = bulletChars.l2 || '◦'
                } else if (bullet.type === 'l3') {
                  level = 3
                  bulletChar = bulletChars.l3 || '▪'
                }

                const baseIndent = hasHeader ? 180 : 0
                let leftIndent = 360 + baseIndent
                if (level === 2) leftIndent = 720 + baseIndent
                if (level === 3) leftIndent = 1080 + baseIndent

                children.push(
                  new Paragraph({
                    indent: {
                      left: leftIndent,
                      hanging: 180,
                    },
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: bulletChar + '   ',
                        font: fontName,
                        size: bodySize,
                      }),
                      ...createRichTextRuns(textVal, fontName, bodySize),
                    ],
                  }),
                )
              }
            })
          }
        })
      }
    }

    if (secKey === 'education' && cv.educations?.length) {
      const activeEdus = cv.educations.filter(
        (edu) => edu.university?.trim() || edu.degree?.trim() || edu.graduationDate?.trim(),
      )
      if (activeEdus.length > 0) {
        addSectionTitle(resolvedLabels.education)
        activeEdus.forEach((entry, index) => {
          const uniStr = entry.university?.trim() || ''
          const degStr = entry.degree?.trim() || ''
          const gpaStr = entry.gpa?.trim() || ''
          const gradStr = entry.graduationDate?.trim() || ''

          if (index > 0) {
            children.push(new Paragraph({ spacing: { before: 100 } }))
          }

          // University on left, Graduation date on right
          const leftRuns = []
          if (uniStr) {
            leftRuns.push(
              new TextRun({
                text: uniStr,
                bold: true,
                font: fontName,
                size: bodySize,
              }),
            )
          }

          const rightRuns = []
          if (gradStr) {
            rightRuns.push(
              new TextRun({
                text: gradStr,
                font: fontName,
                size: bodySize,
                color: '333333',
              }),
            )
          }

          children.push(
            createTwoColumnHeader({
              leftChildren: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: leftRuns,
                }),
              ],
              rightChildren: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 40 },
                  children: rightRuns,
                }),
              ],
            }),
          )

          // Degree and GPA line
          let detailStr = degStr
          if (gpaStr) {
            if (detailStr) {
              detailStr += ` - GPA: ${gpaStr}`
            } else {
              detailStr = `GPA: ${gpaStr}`
            }
          }

          if (detailStr) {
            children.push(
              new Paragraph({
                spacing: { after: 80 },
                children: createRichTextRuns(detailStr, fontName, bodySize),
              }),
            )
          }
        })
      }
    }

    if (secKey === 'certificates' && cv.certificates?.length) {
      const activeCerts = cv.certificates.filter(
        (cert) =>
          cert.certName?.trim() || cert.certDate?.trim() || cert['issuer/description']?.trim(),
      )
      if (activeCerts.length > 0) {
        addSectionTitle(resolvedLabels.certificates)
        activeCerts.forEach((entry, index) => {
          const nameStr = entry.certName?.trim() || ''
          const issuerStr = entry['issuer/description']?.trim() || ''
          const dateStr = entry.certDate?.trim() || ''

          if (index > 0) {
            children.push(new Paragraph({ spacing: { before: 80 } }))
          }

          // Certificate Name on left, Date on right
          const leftRuns = []
          if (nameStr) {
            leftRuns.push(
              new TextRun({
                text: nameStr,
                bold: true,
                font: fontName,
                size: bodySize,
              }),
            )
          }

          const rightRuns = []
          if (dateStr) {
            rightRuns.push(
              new TextRun({
                text: dateStr,
                font: fontName,
                size: bodySize,
                color: '333333',
              }),
            )
          }

          children.push(
            createTwoColumnHeader({
              leftChildren: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: leftRuns,
                }),
              ],
              rightChildren: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 40 },
                  children: rightRuns,
                }),
              ],
            }),
          )

          // Issuer line below
          if (issuerStr) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },
                children: createRichTextRuns(issuerStr, fontName, bodySize),
              }),
            )
          }
        })
      }
    }
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: fontName,
            size: bodySize,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch (standard)
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

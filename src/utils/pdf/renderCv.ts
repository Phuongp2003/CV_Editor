/**
 * Draws the CV as a text-based PDF with jsPDF (selectable text, ATS-parseable, single column).
 *
 * Templates
 * - harvard: Harvard OCS layout. Centered name and contact line, left-aligned bold uppercase section headings with a rule,
 *   ORGANIZATION (bold) + location on one line, Position (italic) + dates on the next, hanging-indent bullets,
 *   ragged-right text, black only. Default font Times (a standard PDF font: tiny file, clean text extraction).
 * - modern: the original layout. Left headings, justified bullets, grey dates, blue links.
 */
import { jsPDF } from 'jspdf'
import type { CVData, SectionKey, BulletChars, BulletPart, CvTemplate, AvatarStyle, ExperienceCompanyMode } from '@/types/cv'
import { DEFAULT_AVATAR_STYLE } from '@/types/cv'
import { AVATAR_SIZES } from '@/utils/avatar'
import { parseRichText, cleanUrl } from '@/utils/richText'
import { resolvePdfFont, loadedFonts, isWinAnsi } from '@/utils/fonts'

export interface RenderCvOptions {
  cv: CVData
  template: CvTemplate
  language: string
  sizeMultiplier: number
  selectedFont: string
  customFontName: string
  sectionsOrder: SectionKey[]
  disabledSections: SectionKey[]
  bulletChars: BulletChars
  experienceHeaderStyle: 'classic' | 'role-company' | 'one-line'
  experienceCompanyMode?: ExperienceCompanyMode
  /** Profile photo layout; defaults to rounded, left, medium, cover. */
  avatarStyle?: AvatarStyle
  sectionLabels: Record<SectionKey, string>
}

export type RenderCvResult =
  | { ok: true; doc: jsPDF; pages: number; fontFellBack: boolean }
  | { ok: false; needsFonts: ReturnType<typeof resolvePdfFont>['embed'] }

type Style = 'normal' | 'bold' | 'italic' | 'bolditalic'

interface Word {
  text: string
  style: Style
  underline: boolean
}

interface Layout {
  marginX: number
  top: number
  bottom: number
  body: number
  lineH: number
  bulletLineH: number
  nameSize: number
  headingSize: number
  headingCentered: boolean
  headingUpper: boolean
  sectionGapBefore: number
  sectionGapAfter: number
  entryGap: number
  justify: boolean
  muted: string
  linkColor: string
  bulletIndent: number
  bulletTextGap: number
  uppercaseOrg: boolean
}

function layoutFor(template: CvTemplate, m: number): Layout {
  const k = Math.min(1.6, Math.max(0.8, m))
  if (template === 'harvard') {
    const body = Math.round(10.5 * k * 2) / 2
    return {
      marginX: 46,
      top: 44,
      bottom: 40,
      body,
      lineH: Math.round(body * 1.24 * 10) / 10,
      bulletLineH: Math.round(body * 1.22 * 10) / 10,
      nameSize: Math.round(body * 1.65),
      headingSize: body + 0.5,
      headingCentered: false,
      headingUpper: true,
      sectionGapBefore: Math.round(7 * k),
      sectionGapAfter: Math.round(body * 1.8),
      entryGap: Math.round(4 * k),
      justify: false,
      muted: '#000000',
      linkColor: '#000000',
      bulletIndent: 6,
      bulletTextGap: 10,
      uppercaseOrg: true,
    }
  }
  const body = Math.max(10, Math.round(10 * k))
  return {
    marginX: 40,
    top: 40,
    bottom: 30,
    body,
    lineH: Math.max(15, Math.round(16 * k)),
    bulletLineH: Math.max(10, Math.round(14 * k)),
    nameSize: Math.round(14 * k) + 2,
    headingSize: Math.round(14 * k),
    headingCentered: false,
    headingUpper: false,
    sectionGapBefore: Math.max(3, Math.round(5 * k)),
    sectionGapAfter: Math.max(15, Math.round(21 * k)),
    entryGap: Math.max(2, Math.round(3 * k)),
    justify: true,
    muted: '#333333',
    linkColor: '#115bca',
    bulletIndent: 0,
    bulletTextGap: 14,
    uppercaseOrg: true,
  }
}

function toStyle(bold: boolean, italic: boolean): Style {
  if (bold && italic) return 'bolditalic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

function richWords(text: string, base: Style = 'normal'): Word[] {
  const words: Word[] = []
  for (const seg of parseRichText(text)) {
    const style = toStyle(seg.bold || base === 'bold' || base === 'bolditalic', seg.italic || base === 'italic' || base === 'bolditalic')
    const parts = seg.text.match(/\s*\S+\s*/g) || (seg.text ? [seg.text] : [])
    parts.forEach((p) => words.push({ text: p, style, underline: seg.underline }))
  }
  return words
}

function shortLink(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

function allText(cv: CVData): string {
  const parts: string[] = [cv.name, cv.location, cv.email, cv.phone, cv.summary, cv.objective]
  cv.experiences.forEach((e) => parts.push(e.position, e.company, e.location, e.dates, ...e.bullets.map((b) => b.text)))
  cv.projects.forEach((p) => parts.push(p.projectName, ...p.bullets.map((b) => b.text)))
  cv.skills.forEach((s) => parts.push(s.skill, s.description))
  cv.educations.forEach((e) => parts.push(e.university, e.degree, e.gpa, e.graduationDate))
  cv.certificates.forEach((c) => parts.push(c.certName, c['issuer/description'], c.certDate))
  return parts.filter(Boolean).join('\n')
}

export function renderCv(o: RenderCvOptions): RenderCvResult {
  const { cv } = o
  const labelsText = Object.values(o.sectionLabels).join(' ')
  const font = resolvePdfFont(o.selectedFont, o.customFontName, o.language, `${allText(cv)} ${labelsText}`)
  const embedded = font.embed ? loadedFonts(font.embed) : null
  if (font.embed && !embedded) return { ok: false, needsFonts: font.embed }

  const L = layoutFor(o.template, o.sizeMultiplier)
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', putOnlyUsedFonts: true, compress: true })
  if (embedded) {
    doc.addFileToVFS('CvFont-normal.ttf', embedded.normal)
    doc.addFileToVFS('CvFont-bold.ttf', embedded.bold)
    doc.addFont('CvFont-normal.ttf', font.family, 'normal')
    doc.addFont('CvFont-bold.ttf', font.family, 'bold')
    // ponytail: no italic files ship with the embedded fonts, so italic renders upright.
    doc.addFont('CvFont-normal.ttf', font.family, 'italic')
    doc.addFont('CvFont-bold.ttf', font.family, 'bolditalic')
  }
  doc.setProperties({ title: `${cv.name || 'CV'} - CV`, author: cv.name || '', creator: 'CV Editor' })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = L.marginX
  const right = pageW - L.marginX
  const width = right - left
  const bottom = pageH - L.bottom
  let y = L.top

  let curStyle: Style = 'normal'
  let curSize = L.body
  const setFont = (style: Style, size = L.body) => {
    curStyle = style
    curSize = size
    doc.setFont(font.family, style)
    doc.setFontSize(size)
  }
  // jsPDF's getTextWidth applies kerning pairs, but the text it draws is not kerned, so whole-string
  // widths come out ~4% short and words placed one by one collide. Measure glyph by glyph instead.
  const glyphCache = new Map<string, number>()
  const tw = (text: string) => {
    let w = 0
    for (const ch of text) {
      const key = `${curStyle}|${curSize}|${ch}`
      let g = glyphCache.get(key)
      if (g === undefined) {
        g = doc.getTextWidth(ch)
        glyphCache.set(key, g)
      }
      w += g
    }
    return w
  }
  const textRight = (text: string, xRight: number, yy: number) => doc.text(text, xRight - tw(text), yy)
  const textCenter = (text: string, xMid: number, yy: number) => doc.text(text, xMid - tw(text) / 2, yy)
  const color = (c: string) => doc.setTextColor(c)
  const ensure = (h: number) => {
    if (y + h > bottom) {
      doc.addPage('a4', 'p')
      y = L.top + L.body
    }
  }
  const widthOf = (w: Word, size: number) => {
    setFont(w.style, size)
    return tw(w.text)
  }

  /** Wraps and draws rich words starting at baseline y. Leaves y on the baseline after the last line. */
  function drawWords(words: Word[], x: number, maxW: number, lineH: number, size = L.body, justify = L.justify) {
    const lines: Word[][] = []
    let cur: Word[] = []
    let curW = 0
    for (const w of words) {
      const ww = widthOf(w, size)
      if (cur.length && curW + widthOf({ ...w, text: w.text.trimEnd() }, size) > maxW) {
        lines.push(cur)
        cur = [{ ...w, text: w.text.trimStart() }]
        curW = widthOf(cur[0] as Word, size)
      } else {
        cur.push(w)
        curW += ww
      }
    }
    if (cur.length) lines.push(cur)

    lines.forEach((line, li) => {
      ensure(lineH * 0.3)
      const last = li === lines.length - 1
      const trimmed = line.map((w, i) => (i === line.length - 1 ? { ...w, text: w.text.trimEnd() } : w))
      const total = trimmed.reduce((a, w) => a + widthOf(w, size), 0)
      const gaps = trimmed.length - 1
      const extra = justify && !last && gaps > 0 ? (maxW - total) / gaps : 0
      let cx = x
      trimmed.forEach((w) => {
        setFont(w.style, size)
        doc.text(w.text, cx, y)
        const ww = tw(w.text)
        if (w.underline) {
          doc.setLineWidth(0.4)
          doc.line(cx, y + 1, cx + tw(w.text.trimEnd()), y + 1)
        }
        cx += ww + extra
      })
      y += lineH
    })
  }

  /** One line with text on the left (rich) and plain text on the right. */
  function drawSplitLine(
    leftText: string,
    leftStyle: Style,
    rightText: string,
    rightStyle: Style = 'normal',
    indent = 0,
  ) {
    ensure(L.lineH)
    setFont(rightStyle)
    const rw = rightText ? tw(rightText) + 12 : 0
    if (rightText) {
      color(L.muted)
      textRight(rightText, right, y)
      color('#000000')
    }
    drawWords(richWords(leftText, leftStyle), left + indent, width - rw - indent, L.lineH, L.body, false)
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const contact: { text: string; url?: string }[] = []
  ;[cv.location, cv.email, cv.phone].forEach((t) => t?.trim() && contact.push({ text: t.trim() }))
  if (cv.email?.trim()) contact[contact.findIndex((c) => c.text === cv.email.trim())]!.url = `mailto:${cv.email.trim()}`
  ;(
    [
      [cv.github, cv.github_placeholder],
      [cv.website, cv.website_placeholder],
      [cv.linkedin, cv.linkedin_placeholder],
    ] as const
  ).forEach(([url, label]) => {
    if (url?.trim() || label?.trim()) {
      contact.push({ text: (label || shortLink(url || '')).trim(), url: url ? cleanUrl(url.trim()) : undefined })
    }
  })

  const contactSize = o.template === 'harvard' ? L.body - 0.5 : Math.max(9, Math.round(L.body * 0.9))
  const av = o.avatarStyle ?? DEFAULT_AVATAR_STYLE
  const hasImage = !!cv.profileImage
  const S = AVATAR_SIZES[av.size] ?? AVATAR_SIZES.md
  const gap = 14
  const imageTop = y - 6
  let headerX = left
  let headerW = width
  let centered = true
  if (hasImage && av.position === 'left') {
    headerX = left + S + gap
    headerW = right - headerX
    centered = false
  } else if (hasImage && av.position === 'right') {
    headerW = width - S - gap
    centered = false
  }

  /** Draws the photo cropped to the chosen shape, keeping its aspect ratio (cover or contain). */
  function drawAvatar(x: number, top: number) {
    try {
      const img = cv.profileImage as string
      const props = doc.getImageProperties(img)
      doc.saveGraphicsState()
      if (av.shape === 'circle') doc.circle(x + S / 2, top + S / 2, S / 2, null)
      else if (av.shape === 'rounded') doc.roundedRect(x, top, S, S, S * 0.16, S * 0.16, null)
      else doc.rect(x, top, S, S, null)
      doc.clip()
      doc.discardPath()
      const k = av.fit === 'contain' ? Math.min(S / props.width, S / props.height) : Math.max(S / props.width, S / props.height)
      const w = props.width * k
      const h = props.height * k
      doc.addImage(img, props.fileType || 'JPEG', x + (S - w) / 2, top + (S - h) / 2, w, h, 'avatar', 'MEDIUM')
      doc.restoreGraphicsState()
    } catch (e) {
      console.error('Profile image failed to render:', e)
    }
  }

  if (hasImage) {
    if (av.position === 'center') {
      drawAvatar(pageW / 2 - S / 2, imageTop)
      y = imageTop + S + 6
    } else {
      drawAvatar(av.position === 'right' ? right - S : left, imageTop)
    }
  }

  y += L.nameSize * 0.55
  setFont('bold', L.nameSize)
  if (centered) textCenter(cv.name || 'Your Name', pageW / 2, y)
  else doc.text(cv.name || 'Your Name', headerX, y)
  y += L.nameSize * 0.5 + contactSize * 0.9

  // contact line(s), wrapped on separators
  const sep = ' | '
  setFont('normal', contactSize)
  const sepW = tw(sep)
  const lines: { text: string; url?: string; w: number }[][] = [[]]
  let lineW = 0
  contact.forEach((c) => {
    const w = tw(c.text)
    const cur = lines[lines.length - 1]!
    if (cur.length && lineW + sepW + w > headerW) {
      lines.push([{ ...c, w }])
      lineW = w
    } else {
      lineW += (cur.length ? sepW : 0) + w
      cur.push({ ...c, w })
    }
  })
  lines.forEach((line) => {
    if (!line.length) return
    const total = line.reduce((a, c) => a + c.w, 0) + sepW * (line.length - 1)
    let cx = centered ? pageW / 2 - total / 2 : headerX
    line.forEach((c, i) => {
      if (i > 0) {
        color(L.muted)
        doc.text(sep, cx, y)
        cx += sepW
      }
      const isWeb = c.url && !c.url.startsWith('mailto:')
      color(isWeb ? L.linkColor : L.muted)
      doc.text(c.text, cx, y)
      if (c.url) {
        doc.link(cx, y - contactSize * 0.8, c.w, contactSize, { url: c.url })
        if (isWeb && o.template === 'modern') {
          doc.setDrawColor(L.linkColor)
          doc.setLineWidth(0.4)
          doc.line(cx, y + 1, cx + c.w, y + 1)
          doc.setDrawColor('#000000')
        }
      }
      cx += c.w
    })
    color('#000000')
    y += contactSize * 1.3
  })
  if (hasImage && av.position !== 'center') {
    // Keep a side photo from overlapping the first section.
    y = Math.max(y, imageTop + S + 8)
  }
  y += 2

  // ── Section helpers ───────────────────────────────────────────────────────
  function heading(key: SectionKey) {
    y += L.sectionGapBefore
    ensure(L.sectionGapAfter + L.lineH * 2)
    setFont('bold', L.headingSize)
    const label = L.headingUpper ? o.sectionLabels[key].toUpperCase() : o.sectionLabels[key]
    if (L.headingCentered) {
      textCenter(label, pageW / 2, y)
    } else {
      doc.text(label, left, y)
    }
    doc.setDrawColor('#000000')
    doc.setLineWidth(o.template === 'harvard' ? 0.6 : 1)
    doc.line(left, y + 4, right, y + 4)
    y += L.sectionGapAfter
  }

  function bullets(parts: BulletPart[], indent = 0, levelOffset = 0, roleLabel = '') {
    const items = parts.map((part) => ({ ...part }))
    let roleBulletIndex = -1
    if (roleLabel) {
      roleBulletIndex = items.findIndex((part) => part.type !== 'header' && part.text.trim())
      if (roleBulletIndex >= 0) {
        items[roleBulletIndex]!.text = `**${roleLabel}:** ${items[roleBulletIndex]!.text}`
      } else {
        roleBulletIndex = items.length
        items.push({ id: `role-${roleLabel}`, type: 'l1', text: `**${roleLabel}**` })
      }
    }
    // A little air between the title/date lines and the content under them.
    if (items.some((p) => p.text.trim())) y += 2
    items.forEach((p, index) => {
      const text = p.text.trim()
      if (!text) return
      if (p.type === 'header') {
        drawWords(richWords(text), left + indent, width - indent, L.lineH, L.body, false)
        return
      }
      const nestedOffset = roleBulletIndex >= 0 && index !== roleBulletIndex ? 1 : 0
      const level = Math.min(3, (p.type === 'l3' ? 3 : p.type === 'l2' ? 2 : 1) + levelOffset + nestedOffset)
      let glyph = (level === 1 ? o.bulletChars.l1 : level === 2 ? o.bulletChars.l2 : o.bulletChars.l3) || '•'
      // Standard PDF fonts cannot draw ◦ or ▪; swap in the closest WinAnsi glyph instead of changing the font.
      if (!font.embed && !isWinAnsi(glyph)) glyph = ['•', '–', '·'][level - 1] as string
      // Same indent whether or not the entry has a context line, so every bullet on the page lines up.
      const x = left + indent + L.bulletIndent + (level - 1) * 12
      ensure(L.bulletLineH)
      setFont('normal')
      doc.text(glyph, x, y)
      const tx = x + L.bulletTextGap
      drawWords(richWords(text), tx, right - tx, L.bulletLineH)
    })
  }

  const enabled = (k: SectionKey) => !o.disabledSections.includes(k)
  const org = (s: string) => (L.uppercaseOrg ? s.toUpperCase() : s)

  const renderers: Record<SectionKey, () => void> = {
    summary() {
      if (!cv.summary?.trim()) return
      heading('summary')
      drawWords(richWords(cv.summary.trim()), left, width, L.lineH)
    },
    objective() {
      if (!cv.objective?.trim()) return
      heading('objective')
      drawWords(richWords(cv.objective.trim()), left, width, L.lineH)
    },
    skills() {
      const rows = cv.skills.filter((s) => s.skill?.trim() || s.description?.trim())
      if (!rows.length) return
      heading('skills')
      rows.forEach((s) => {
        const label = s.skill.trim()
        const text = label ? `**${label}:** ${s.description.trim()}` : s.description.trim()
        drawWords(richWords(text), left, width, L.lineH, L.body, false)
      })
    },
    experience() {
      const rows = cv.experiences.filter((e) => e.company?.trim() || e.position?.trim() || e.bullets.length)
      if (!rows.length) return
      heading('experience')
      rows.forEach((e, i) => {
        const company = e.company.trim()
        const position = e.position.trim()
        const location = e.location.trim()
        const dates = e.dates.trim()
        // Consecutive roles at the same organization: print the organization once (Harvard convention).
        const sameOrg = i > 0 && !!company && rows[i - 1]!.company.trim().toLowerCase() === company.toLowerCase()
        const groupedContinuation = sameOrg && o.experienceCompanyMode === 'single-title'
        if (i > 0) y += sameOrg ? (groupedContinuation ? 1 : 4) : L.entryGap
        ensure(L.lineH * 3)
        if (groupedContinuation) {
          const roleLabel = [position, dates].filter(Boolean).join(' · ')
          bullets(e.bullets, 0, 0, roleLabel)
          return
        }
        if (sameOrg) {
          const title = o.template === 'harvard' && o.experienceHeaderStyle !== 'role-company' ? `*${position}*` : `**${position}**`
          drawSplitLine(position ? title : '', 'normal', dates)
          bullets(e.bullets)
          return
        }
        if (o.experienceHeaderStyle === 'one-line') {
          // COMPANY | Title ........ dates (no location)
          const head = [company && `**${org(company)}**`, position && `**${position}**`].filter(Boolean).join('  |  ')
          drawSplitLine(head, 'normal', dates)
        } else if (o.experienceHeaderStyle === 'role-company') {
          const head = [position && `**${position}**`, company].filter(Boolean).join(', ')
          drawSplitLine(head + (location ? `, ${location}` : ''), 'normal', dates)
        } else if (o.template === 'harvard') {
          drawSplitLine(company ? `**${org(company)}**` : '', 'normal', location || dates)
          if (position || location) drawSplitLine(position ? `*${position}*` : '', 'normal', location ? dates : '')
        } else {
          drawSplitLine(`**${org(company)}**${location ? `*, ${location}*` : ''}`, 'normal', dates)
          if (position) drawSplitLine(`**${position}**`, 'normal', '')
        }
        bullets(e.bullets)
      })
    },
    projects() {
      const rows = cv.projects.filter((p) => p.projectName?.trim() || p.bullets.length)
      if (!rows.length) return
      heading('projects')
      rows.forEach((p, i) => {
        if (i > 0) y += L.entryGap
        ensure(L.lineH * 2)
        const link = p.projectLink?.trim()
        const display = link ? shortLink(link) : ''
        setFont('normal', L.body - 0.5)
        const lw = display ? tw(display) : 0
        if (display && lw < width * 0.45) {
          color(L.linkColor)
          textRight(display, right, y)
          doc.link(right - lw, y - L.body * 0.8, lw, L.body, { url: cleanUrl(link) })
          color('#000000')
          drawWords(richWords(`**${org(p.projectName.trim())}**`), left, width - lw - 12, L.lineH, L.body, false)
        } else {
          drawWords(richWords(`**${org(p.projectName.trim())}**`), left, width, L.lineH, L.body, false)
        }
        bullets(p.bullets)
      })
    },
    education() {
      const rows = cv.educations.filter((e) => e.university?.trim() || e.degree?.trim())
      if (!rows.length) return
      heading('education')
      rows.forEach((e, i) => {
        if (i > 0) y += L.entryGap
        drawSplitLine(`**${o.template === 'harvard' ? org(e.university.trim()) : e.university.trim()}**`, 'normal', e.graduationDate.trim())
        const degree = [e.degree.trim(), e.gpa.trim() && `GPA: ${e.gpa.trim().replace(/^GPA:?\s*/i, '')}`].filter(Boolean).join('. ')
        if (degree) drawWords(richWords(o.template === 'harvard' ? `*${degree}*` : degree), left, width, L.lineH, L.body, false)
      })
    },
    certificates() {
      const rows = cv.certificates.filter((c) => c.certName?.trim())
      if (!rows.length) return
      heading('certificates')
      rows.forEach((c) => {
        const issuer = c['issuer/description']?.trim()
        drawSplitLine(`**${c.certName.trim()}**${issuer ? `, ${issuer}` : ''}`, 'normal', c.certDate?.trim() || '')
      })
    },
  }

  o.sectionsOrder.forEach((k) => enabled(k) && renderers[k]?.())

  return { ok: true, doc, pages: doc.getNumberOfPages(), fontFellBack: font.fellBack }
}

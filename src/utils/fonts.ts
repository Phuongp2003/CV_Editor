/**
 * Embedded PDF fonts are big (EB Garamond ~4 MB, CJK 15-27 MB each), so they load on demand
 * instead of blocking every page load. Standard PDF fonts (Times, Helvetica) need nothing.
 */
type Group = 'latin' | 'ja' | 'ko' | 'zh'

const FILES: Record<Group, { files: [string, string]; vars: [string, string] }> = {
  latin: { files: ['EBGaramond-Regular-normal.js', 'EBGaramond-Bold-normal.js'], vars: ['font', 'fontBold'] },
  ja: { files: ['NotoSansJP-Regular-normal.js', 'NotoSansJP-Bold-normal.js'], vars: ['RegJap', 'Boldjap'] },
  ko: { files: ['NotoSansKR-Regular-normal.js', 'NotoSansKR-Bold-normal.js'], vars: ['KrRegular', 'KrBold'] },
  zh: { files: ['NotoSansSC-Regular-normal.js', 'NotoSansSC-Bold-normal.js'], vars: ['RegCN', 'BoldCN'] },
}

export function fontGroup(language: string): Group {
  if (language === 'Japanese' || language === 'ja') return 'ja'
  if (language === 'Korean' || language === 'ko') return 'ko'
  if (language === 'Chinese' || language === 'zh') return 'zh'
  return 'latin'
}

/** Base64 TTF data for the group's regular/bold, or null if not loaded yet. */
export function loadedFonts(group: Group): { normal: string; bold: string } | null {
  const w = window as unknown as Record<string, string | undefined>
  const [n, b] = FILES[group].vars
  const normal = w[n]
  const bold = w[b]
  return normal && bold ? { normal, bold } : null
}

const pending = new Map<Group, Promise<void>>()

export function ensureFonts(group: Group): Promise<void> {
  if (loadedFonts(group)) return Promise.resolve()
  const existing = pending.get(group)
  if (existing) return existing
  const base = import.meta.env.BASE_URL || '/'
  const p = Promise.all(
    FILES[group].files.map(
      (file) =>
        new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = `${base}fonts/${file}`
          s.onload = () => resolve()
          s.onerror = () => reject(new Error(`Failed to load font ${file}`))
          document.head.appendChild(s)
        }),
    ),
  ).then(() => undefined)
  pending.set(group, p)
  p.catch(() => pending.delete(group))
  return p
}

/** True when text only uses characters the standard PDF fonts (WinAnsi) can draw. */
export function isWinAnsi(text: string): boolean {
  return !/[^\x00-\xFF•–—‘’“”…€ŒœŠšŸŽžƒˆ˜†‡‰‹›™]/.test(
    text,
  )
}

export type PdfFontChoice = 'times' | 'garamond' | 'arial' | 'custom'

/** Old saved value 'notosans' actually embedded EB Garamond. */
export function normalizeFontChoice(v: string): PdfFontChoice {
  if (v === 'notosans') return 'garamond'
  return (['times', 'garamond', 'arial', 'custom'] as const).includes(v as PdfFontChoice)
    ? (v as PdfFontChoice)
    : 'times'
}

export interface ResolvedFont {
  /** jsPDF family name to use with setFont. */
  family: string
  /** Embedded font group to register, or null for a standard PDF font. */
  embed: Group | null
  /** Set when the user's choice could not render the text and we fell back. */
  fellBack: boolean
}

export function resolvePdfFont(choice: string, customName: string, language: string, text: string): ResolvedFont {
  const group = fontGroup(language)
  if (group !== 'latin') return { family: 'NotoSans', embed: group, fellBack: false }
  const c = normalizeFontChoice(choice)
  if (c === 'garamond') return { family: 'NotoSans', embed: 'latin', fellBack: false }
  let family = c === 'arial' ? 'helvetica' : 'times'
  if (c === 'custom') {
    const name = customName.trim().toLowerCase()
    family = /arial|sans|helvetica|inter|roboto|system/.test(name)
      ? 'helvetica'
      : /courier|mono/.test(name)
        ? 'courier'
        : 'times'
  }
  if (!isWinAnsi(text)) return { family: 'NotoSans', embed: 'latin', fellBack: true }
  return { family, embed: null, fellBack: false }
}

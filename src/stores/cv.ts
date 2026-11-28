import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import sampleData from '@/assets/sample.json'
import type {
  CVData,
  BulletPart,
  BulletLevel,
  BulletChars,
  EditorMode,
  SectionKey,
  Experience,
  Project,
  CoverLetterData,
  CvTemplate,
  AvatarStyle,
  ExperienceHeaderStyle,
  ExperienceCompanyMode,
} from '@/types/cv'
import { DEFAULT_SECTIONS_ORDER, DEFAULT_AVATAR_STYLE } from '@/types/cv'
import { normalizeFontChoice } from '@/utils/fonts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a random 7-character alphanumeric string to serve as a unique ID.
 *
 * @returns A randomly generated string ID.
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Parses raw bullet inputs (which can be a string, array, or legacy description object)
 * into a structured array of BulletPart elements.
 *
 * @remarks
 * Recognizes prefixes to resolve bullet indentation:
 * - `#` prefix -> `header` (rendered bold in PDF/DOCX)
 * - `-` prefix -> `l1` (Level 1 bullet)
 * - `+` or `--` prefix -> `l2` (Level 2 bullet)
 * - `---` prefix -> `l3` (Level 3 bullet)
 *
 * @param bullets - The raw representation of bullet items.
 * @returns An array of parsed {@link BulletPart} structures.
 */
function parseBulletsToParts(bullets: unknown): BulletPart[] {
  if (!bullets) return []

  if (Array.isArray(bullets)) {
    return (bullets as any[]).map((p) => ({
      id: (p.id as string) || generateId(),
      type: (p.type as BulletLevel) || 'l1',
      text: (p.text as string) || '',
    }))
  }

  const parts: BulletPart[] = []
  let description = ''
  let items: string[] = []

  if (typeof bullets === 'string') {
    const lines = bullets
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    description = lines[0] || ''
    items = lines.slice(1)
  } else {
    const obj = bullets as Record<string, unknown>
    description = (obj.description as string) || ''
    items = Array.isArray(obj.items) ? (obj.items as string[]) : []
  }

  if (description && description.trim()) {
    const cleanDesc = description.trim().replace(/^#\s*/, '')
    parts.push({ id: generateId(), type: 'header', text: cleanDesc })
  }

  items.forEach((item) => {
    if (item && item.trim()) {
      let raw = item.trim()
      let type: BulletLevel = 'l1'

      if (raw.startsWith('---')) {
        type = 'l3'
        raw = raw.replace(/^---\s*/, '')
      } else if (raw.startsWith('--')) {
        type = 'l2'
        raw = raw.replace(/^--\s*/, '')
      } else if (raw.startsWith('+')) {
        type = 'l2'
        raw = raw.replace(/^\+\s*/, '')
      } else if (raw.startsWith('-')) {
        type = 'l1'
        raw = raw.replace(/^-\s*/, '')
      }

      parts.push({ id: generateId(), type, text: raw })
    }
  })

  return parts
}

// ─── Empty defaults ───────────────────────────────────────────────────────────

const EMPTY_CV: CVData = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  linkedin_placeholder: '',
  github: '',
  github_placeholder: '',
  website: '',
  website_placeholder: '',
  summary: '',
  objective: '',
  experiences: [
    { position: '', company: '', location: '', dates: '', bullets: [] },
  ],
  projects: [
    { projectName: '', projectLink: '', bullets: [] },
  ],
  projectIntro: '',
  skills: [
    { skill: '', description: '' },
  ],
  educations: [
    { university: '', degree: '', gpa: '', graduationDate: '' },
  ],
  certificates: [
    { certName: '', 'issuer/description': '', certDate: '' },
  ],
  customSections: [],
}

const EMPTY_COVER_LETTER: CoverLetterData = {
  header: {
    senderName: '',
    senderEmail: '',
    senderPhone: '',
    senderLocation: '',
    date: '',
    recipientName: '',
    recipientTitle: '',
    recipientEmail: '',
    companyName: '',
    companyAddress: '',
  },
  greeting: '',
  openingParagraph: '',
  bodyParagraphs: [''],
  closingParagraph: '',
  signOff: '',
}

// ─── Store ────────────────────────────────────────────────────────────────────

const isClient = typeof window !== 'undefined' && typeof localStorage !== 'undefined'

function getLocal(key: string, fallback: string): string {
  try {
    if (isClient) {
      return localStorage.getItem(key) || fallback
    }
  } catch (e) {
    // ignore
  }
  return fallback
}

function setLocal(key: string, val: string) {
  try {
    if (isClient) {
      localStorage.setItem(key, val)
    }
  } catch (e) {
    // ignore
  }
}

function getLocalJson<T>(key: string, fallback: T): T {
  try {
    if (isClient) {
      const val = localStorage.getItem(key)
      if (val) {
        return JSON.parse(val) as T
      }
    }
  } catch (e) {
    // ignore
  }
  return fallback
}

/**
 * State store managing all candidate CV contents, UI configuration, layout, and export settings.
 *
 * @public
 */
export const useCVStore = defineStore('cv', () => {
  /** The currently active workspace pane ('cv' | 'cover-letter'). */
  const activeWorkspace = ref<'cv' | 'cover-letter'>('cv')

  /** Reactive reference containing all core CV input details (e.g. name, experiences). */
  const cvData = ref<CVData>({ ...EMPTY_CV })

  /** Reactive reference containing all cover letter details. */
  const coverLetterData = ref<CoverLetterData>({ ...EMPTY_COVER_LETTER })

  /** General scaling multiplier for fonts and margins in output PDF/DOCX files. */
  const sizeMultiplier = ref(Number(getLocal('cv_sizeMultiplier', '1')))
  /** Font family selection. Defaults to the v1.0.1 NotoSans/Calibri face. */
  const selectedFont = ref<string>(normalizeFontChoice(getLocal('cv_selectedFont', 'garamond')))
  /** Optional custom font family name to render in PDF/DOCX (system fonts). */
  const customFontName = ref(getLocal('cv_customFontName', ''))
  /** Target language of the CV contents. */
  const language = ref(getLocal('cv_language', 'English'))
  /** Target language of the Editor UI interface. */
  const uiLanguage = ref(getLocal('cv_uiLanguage', 'English'))
  /** Tabbed or scrollable outline form view mode selection. */
  const editorMode = ref<EditorMode>(getLocal('cv_editorMode', 'tabs') as EditorMode)

  /** Order of CV sections layout. */
  const sectionsOrder = ref<SectionKey[]>(getLocalJson<SectionKey[]>('cv_sectionsOrder', [...DEFAULT_SECTIONS_ORDER]))
  /** List of hidden CV sections. */
  const disabledSections = ref<SectionKey[]>(getLocalJson<SectionKey[]>('cv_disabledSections', ['objective']))
  /** Experience header layout ('classic' | 'role-company' | 'one-line'). */
  const experienceHeaderStyle = ref<ExperienceHeaderStyle>(getLocal('cv_experienceHeaderStyle', 'classic') as ExperienceHeaderStyle)
  const experienceCompanyMode = ref<ExperienceCompanyMode>(getLocal('cv_experienceCompanyMode', 'separate-titles') as ExperienceCompanyMode)
  /** PDF layout: 'modern' preserves the original v1.0.1 output; 'harvard' remains an alternate. */
  const template = ref<CvTemplate>((getLocal('cv_template', 'modern') as CvTemplate) || 'modern')
  /** Target job description, used by the CV check for keyword evidence. */
  const jobDescription = ref(getLocal('cv_jobDescription', ''))
  /** Page count of the last rendered PDF (filled by the renderer). */
  const pdfPageCount = ref(0)
  watch(template, (val) => setLocal('cv_template', val))
  /** Profile photo shape / position / size / fit. */
  const avatarStyle = ref<AvatarStyle>({ ...DEFAULT_AVATAR_STYLE, ...getLocalJson<Partial<AvatarStyle>>('cv_avatarStyle', {}) })
  watch(avatarStyle, (val) => setLocal('cv_avatarStyle', JSON.stringify(val)), { deep: true })
  watch(jobDescription, (val) => setLocal('cv_jobDescription', val))

  let prevHasSummary = !disabledSections.value.includes('summary')
  let prevHasObjective = !disabledSections.value.includes('objective')

  // Persist configurations to localStorage
  watch(sizeMultiplier, (val) => setLocal('cv_sizeMultiplier', String(val)))
  watch(selectedFont, (val) => setLocal('cv_selectedFont', val))
  watch(customFontName, (val) => setLocal('cv_customFontName', val))
  watch(language, (val) => setLocal('cv_language', val))
  watch(uiLanguage, (val) => setLocal('cv_uiLanguage', val))
  watch(editorMode, (val) => setLocal('cv_editorMode', val))
  watch(experienceHeaderStyle, (val) => setLocal('cv_experienceHeaderStyle', val))
  watch(experienceCompanyMode, (val) => setLocal('cv_experienceCompanyMode', val))
  watch(sectionsOrder, (val) => setLocal('cv_sectionsOrder', JSON.stringify(val)), { deep: true })

  watch(
    disabledSections,
    (newVal) => {
      const hasSummary = !newVal.includes('summary')
      const hasObjective = !newVal.includes('objective')
      if (hasSummary && hasObjective) {
        if (!prevHasSummary && hasSummary) {
          newVal.push('objective')
        } else {
          newVal.push('summary')
        }
      }
      prevHasSummary = !newVal.includes('summary')
      prevHasObjective = !newVal.includes('objective')
      setLocal('cv_disabledSections', JSON.stringify(newVal))
    },
    { deep: true, immediate: true }
  )


  // Layout editing & view states
  /** Current workspace display tab ('content' or 'layout'). */
  const editViewMode = ref<'content' | 'layout'>('layout')
  /** The currently active form section editing tab key. */
  const activeSectionTab = ref<string>('personal')
  /** Whether the section order drawer is open in UI. */
  const isLayoutDrawerOpen = ref(false)
  /** Whether the formatting settings drawer is open in UI. */
  const isStyleDrawerOpen = ref(false)
  /** Temporary list holding proposed layout order during editing. */
  const draftSectionsOrder = ref<SectionKey[]>([])
  /** Temporary list holding proposed section visibilities during editing. */
  const draftDisabledSections = ref<SectionKey[]>([])
  /** Set of item IDs mapped to boolean collapsing status in form cards. */
  const collapsedItems = ref<Record<string, boolean>>({})

  /** Set of bullet character overrides for l1, l2, and l3 bullet points. */
  const bulletChars = ref<BulletChars>(getLocalJson<BulletChars>('cv_bulletChars', { l1: '•', l2: '◦', l3: '▪' }))

  /** Dictionary of custom override section headers. */
  const customSectionLabels = ref<Record<string, string>>(getLocalJson<Record<string, string>>('cv_customSectionLabels', {
    summary: '',
    objective: '',
    skills: '',
    experience: '',
    projects: '',
    education: '',
    certificates: '',
  }))

  watch(bulletChars, (val) => setLocal('cv_bulletChars', JSON.stringify(val)), { deep: true })
  watch(customSectionLabels, (val) => setLocal('cv_customSectionLabels', JSON.stringify(val)), { deep: true })

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Loads and normalizes a CV JSON dataset into the active store.
   *
   * @remarks
   * Recursively parses raw bullet structures into active {@link BulletPart} objects,
   * normalizes missing schema values, and sets UI settings (language, size multipliers).
   *
   * @param data - Raw parsed JSON data from file or AI output.
   */
  function loadCv(data: Record<string, unknown>) {
    if (!data) return
    if (data.content && typeof data.content === 'object') {
      const content = data.content as Record<string, unknown>
      const layout = (content.layout ?? {}) as Record<string, unknown>
      data = { ...content, ...layout, customSectionLabels: layout.sectionLabels, ...((data.config as Record<string, unknown>) ?? {}) }
    } else if (data.layout && typeof data.layout === 'object') {
      const layout = data.layout as Record<string, unknown>
      data = { ...data, ...layout, customSectionLabels: layout.sectionLabels }
    }
    const source = (data.cv ?? data) as Record<string, unknown>

    const rawExp = Array.isArray(source.experiences)
      ? (JSON.parse(JSON.stringify(source.experiences)) as any[])
      : []
    const experiences: Experience[] = rawExp.map((exp) => ({
      position: exp.position || '',
      company: exp.company || '',
      location: exp.location || '',
      dates: exp.dates || '',
      bullets: parseBulletsToParts(exp.bullets),
    }))

    const rawProj = Array.isArray(source.projects)
      ? (JSON.parse(JSON.stringify(source.projects)) as any[])
      : []
    const projects: Project[] = rawProj.map((proj) => ({
      projectName: proj.projectName || '',
      projectLink: proj.projectLink || '',
      overview: proj.overview || '',
      dates: proj.dates || '',
      technologies: proj.technologies || '',
      bullets: parseBulletsToParts(proj.bullets),
    }))

    cvData.value = {
      name: (source.name as string) || '',
      title: (source.title as string) || '',
      email: (source.email as string) || '',
      phone: (source.phone as string) || '',
      location: (source.location as string) || '',
      linkedin: (source.linkedin as string) || '',
      linkedin_placeholder: (source.linkedin_placeholder as string) || '',
      github: (source.github as string) || '',
      github_placeholder: (source.github_placeholder as string) || '',
      website: (source.website as string) || '',
      website_placeholder: (source.website_placeholder as string) || '',
      summary: (source.summary as string) || '',
      objective: (source.objective as string) || '',
      experiences,
      projects,
      projectIntro: (source.projectIntro as string) || '',
      skills: Array.isArray(source.skills) ? JSON.parse(JSON.stringify(source.skills)) : [],
      educations: Array.isArray(source.educations)
        ? JSON.parse(JSON.stringify(source.educations))
        : [],
      certificates: Array.isArray(source.certificates)
        ? JSON.parse(JSON.stringify(source.certificates))
        : [],
      customSections: Array.isArray(source.customSections)
        ? source.customSections.map((section: any) => ({
            id: String(section.id || generateId()),
            title: String(section.title || 'Custom Section'),
            preset: ['experience', 'summary', 'skills'].includes(section.preset) ? section.preset : 'experience',
            experienceStyle: ['inherit', 'hierarchy', 'classic', 'role-company', 'one-line'].includes(section.experienceStyle)
              ? section.experienceStyle
              : section.preset
                ? 'hierarchy'
                : 'inherit',
            showCompanyDates: typeof section.showCompanyDates === 'boolean' ? section.showCompanyDates : true,
            showPosition: typeof section.showPosition === 'boolean'
              ? section.showPosition
              : !section.preset && Array.isArray(section.entries) && section.entries.some((entry: any) => String(entry.position || '').trim()),
            showPositionDates: typeof section.showPositionDates === 'boolean' ? section.showPositionDates : false,
            summaryText: String(section.summaryText || ''),
            skills: Array.isArray(section.skills) ? JSON.parse(JSON.stringify(section.skills)) : [],
            entries: Array.isArray(section.entries)
              ? section.entries.map((entry: any) => ({
                  position: String(entry.position || ''),
                  company: String(entry.company || ''),
                  location: String(entry.location || ''),
                  dates: String(entry.dates || ''),
                  positionDates: String(entry.positionDates || ''),
                  bullets: parseBulletsToParts(entry.bullets),
                }))
              : [],
          }))
        : [],
      profileImage: (source.profileImage as string | null) ?? null,
      profileImageType: (source.profileImageType as string | null) ?? null,
    }

    if (data.template === 'harvard' || data.template === 'modern') template.value = data.template
    if (data.avatarStyle && typeof data.avatarStyle === 'object') {
      avatarStyle.value = { ...DEFAULT_AVATAR_STYLE, ...(data.avatarStyle as Partial<AvatarStyle>) }
    }
    if (data.language) language.value = data.language as string
    if (data.sizeMultiplier) sizeMultiplier.value = Number(data.sizeMultiplier)
    if (data.selectedFont) selectedFont.value = normalizeFontChoice(data.selectedFont as string)
    if (data.editorMode && (data.editorMode === 'tabs' || data.editorMode === 'outline')) {
      editorMode.value = data.editorMode as EditorMode
    }
    if (['classic', 'role-company', 'one-line'].includes(data.experienceHeaderStyle as string)) {
      experienceHeaderStyle.value = data.experienceHeaderStyle as ExperienceHeaderStyle
    } else {
      experienceHeaderStyle.value = 'classic'
    }
    experienceCompanyMode.value = data.experienceCompanyMode === 'single-title' ? 'single-title' : 'separate-titles'

    if (Array.isArray(data.sectionsOrder)) {
      const order = [...data.sectionsOrder] as SectionKey[]
      DEFAULT_SECTIONS_ORDER.forEach((key) => {
        if (!order.includes(key)) {
          order.push(key)
        }
      })
      sectionsOrder.value = order
    } else {
      sectionsOrder.value = [...DEFAULT_SECTIONS_ORDER]
    }

    if (Array.isArray(data.disabledSections)) {
      const ds = [...data.disabledSections] as SectionKey[]
      if (!ds.includes('summary') && !ds.includes('objective')) {
        ds.push('summary')
      }
      disabledSections.value = ds
    } else {
      disabledSections.value = ['objective']
    }

    if (data.bulletChars && typeof data.bulletChars === 'object') {
      const bc = data.bulletChars as Record<string, string>
      bulletChars.value = {
        l1: bc.l1 || '•',
        l2: bc.l2 || '◦',
        l3: bc.l3 || '▪',
      }
    } else {
      bulletChars.value = { l1: '•', l2: '◦', l3: '▪' }
    }

    if (data.customSectionLabels && typeof data.customSectionLabels === 'object') {
      const csl = data.customSectionLabels as Record<string, string>
      customSectionLabels.value = {
        summary: csl.summary || '',
        objective: csl.objective || '',
        skills: csl.skills || '',
        experience: csl.experience || '',
        projects: csl.projects || '',
        education: csl.education || '',
        certificates: csl.certificates || '',
      }
    } else {
      customSectionLabels.value = {
        summary: '',
        objective: '',
        skills: '',
        experience: '',
        projects: '',
        education: '',
        certificates: '',
      }
    }

    const clSource = (data.coverLetter ?? {}) as Record<string, any>
    const clHeader = (clSource.header ?? {}) as Record<string, any>
    coverLetterData.value = {
      header: {
        senderName: clHeader.senderName || cvData.value.name || clHeader.name || '',
        senderEmail: clHeader.senderEmail || cvData.value.email || clHeader.email || '',
        senderPhone: clHeader.senderPhone || cvData.value.phone || clHeader.phone || '',
        senderLocation: clHeader.senderLocation || cvData.value.location || clHeader.location || '',
        date: clHeader.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        recipientName: clHeader.recipientName || '',
        recipientTitle: clHeader.recipientTitle || '',
        recipientEmail: clHeader.recipientEmail || '',
        companyName: clHeader.companyName || '',
        companyAddress: clHeader.companyAddress || '',
      },
      greeting: clSource.greeting || '',
      openingParagraph: clSource.openingParagraph || '',
      bodyParagraphs: Array.isArray(clSource.bodyParagraphs)
        ? [...clSource.bodyParagraphs]
        : clSource.bodyParagraphs && typeof clSource.bodyParagraphs === 'string'
        ? [clSource.bodyParagraphs]
        : [''],
      closingParagraph: clSource.closingParagraph || '',
      signOff: clSource.signOff || '',
    }
  }

  /**
   * Overrides the display heading text for a given CV section.
   *
   * @param key - The {@link SectionKey} identifier.
   * @param value - The new display string value.
   */
  function updateSectionLabel(key: string, value: string) {
    customSectionLabels.value[key] = value
    if (key.startsWith('custom:')) {
      const section = cvData.value.customSections?.find((item) => `custom:${item.id}` === key)
      if (section) section.title = value
    }
  }

  function addCustomSection(title = 'Custom Section') {
    const id = generateId()
    cvData.value.customSections ??= []
    cvData.value.customSections.push({
      id,
      title,
      preset: 'experience',
      experienceStyle: 'hierarchy',
      showCompanyDates: true,
      showPosition: false,
      showPositionDates: false,
      summaryText: '',
      skills: [],
      entries: [],
    })
    const key = `custom:${id}` as SectionKey
    sectionsOrder.value.push(key)
    activeSectionTab.value = key
  }

  function removeCustomSection(key: SectionKey) {
    if (!key.startsWith('custom:')) return
    cvData.value.customSections = cvData.value.customSections?.filter((item) => `custom:${item.id}` !== key)
    sectionsOrder.value = sectionsOrder.value.filter((item) => item !== key)
    disabledSections.value = disabledSections.value.filter((item) => item !== key)
    delete customSectionLabels.value[key]
    activeSectionTab.value = 'personal'
  }

  function addPageBreak() {
    if (!sectionsOrder.value.includes('page-break')) sectionsOrder.value.push('page-break')
    activeSectionTab.value = 'page-break'
  }

  function removePageBreak() {
    sectionsOrder.value = sectionsOrder.value.filter((item) => item !== 'page-break')
    activeSectionTab.value = 'personal'
  }

  /**
   * Toggles the visibility/active status of a CV section.
   *
   * @param secKey - The {@link SectionKey} to toggle.
   */
  function toggleSection(secKey: SectionKey) {
    const idx = disabledSections.value.indexOf(secKey)
    if (idx > -1) {
      disabledSections.value.splice(idx, 1)
      if (secKey === 'summary') {
        if (!disabledSections.value.includes('objective')) {
          disabledSections.value.push('objective')
        }
      } else if (secKey === 'objective') {
        if (!disabledSections.value.includes('summary')) {
          disabledSections.value.push('summary')
        }
      }
    } else {
      disabledSections.value.push(secKey)
    }
  }

  /**
   * Checks whether a specific CV section is active/enabled for rendering.
   *
   * @param secKey - The section key to check.
   * @returns True if the section is enabled, false if disabled.
   */
  function isSectionEnabled(secKey: SectionKey): boolean {
    return !disabledSections.value.includes(secKey)
  }

  const downloadTrigger = ref(0)
  const pdfBlob = ref<Blob | null>(null)

  /**
   * Increments the reactive download trigger count to notify the PDF engine.
   */
  function triggerDownload() {
    downloadTrigger.value++
  }

  /**
   * Prepares draft layout parameters to begin drag-and-drop structural updates.
   */
  function startLayoutEditing() {
    draftSectionsOrder.value = [...sectionsOrder.value]
    draftDisabledSections.value = [...disabledSections.value]
    editViewMode.value = 'layout'
    isLayoutDrawerOpen.value = true
  }

  /**
   * Persists changes made during layout drag-and-drop mode.
   */
  function commitLayoutChanges() {
    sectionsOrder.value = [...draftSectionsOrder.value]
    disabledSections.value = [...draftDisabledSections.value]
    editViewMode.value = 'content'
    isLayoutDrawerOpen.value = false
  }

  /**
   * Discards any temporary layout adjustments.
   */
  function cancelLayoutChanges() {
    editViewMode.value = 'content'
    isLayoutDrawerOpen.value = false
  }

  /**
   * Toggles the accordion collapsing state of a specific form card in outline view.
   *
   * @param key - Unique string identifier (e.g. company/project index name).
   */
  function toggleCollapsed(key: string) {
    collapsedItems.value[key] = !collapsedItems.value[key]
  }

  /**
   * Checks if a specific form card is collapsed.
   *
   * @param key - Unique identifier.
   * @returns True if collapsed, false otherwise.
   */
  function isCollapsed(key: string): boolean {
    return !!collapsedItems.value[key]
  }

  /** Full, importable snapshot of everything the CV and cover letter need. */
  function exportState(): Record<string, unknown> {
    return JSON.parse(
      JSON.stringify({
        cv: cvData.value,
        coverLetter: coverLetterData.value,
        template: template.value,
        avatarStyle: avatarStyle.value,
        language: language.value,
        sizeMultiplier: sizeMultiplier.value,
        selectedFont: selectedFont.value,
        customFontName: customFontName.value,
        sectionsOrder: sectionsOrder.value,
        disabledSections: disabledSections.value,
        experienceHeaderStyle: experienceHeaderStyle.value,
        experienceCompanyMode: experienceCompanyMode.value,
        bulletChars: bulletChars.value,
        customSectionLabels: customSectionLabels.value,
      }),
    )
  }

  /** AI-facing content includes section order and labels, never typography options. */
  function exportContent(): Record<string, unknown> {
    return JSON.parse(JSON.stringify({
      cv: cvData.value,
      coverLetter: coverLetterData.value,
      layout: {
        sectionsOrder: sectionsOrder.value,
        disabledSections: disabledSections.value,
        sectionLabels: customSectionLabels.value,
      },
    }))
  }

  function exportConfig(): Record<string, unknown> {
    return JSON.parse(JSON.stringify({
      template: template.value,
      language: language.value,
      sizeMultiplier: sizeMultiplier.value,
      selectedFont: selectedFont.value,
      customFontName: customFontName.value,
      experienceHeaderStyle: experienceHeaderStyle.value,
      experienceCompanyMode: experienceCompanyMode.value,
      bulletChars: bulletChars.value,
      avatarStyle: avatarStyle.value,
    }))
  }

  function exportHandoff(): Record<string, unknown> {
    return { content: exportContent(), config: exportConfig() }
  }

  /** Previous state kept so an outside import (AI link, paste, API) can be undone once. */
  const undoSnapshot = ref<Record<string, unknown> | null>(null)

  /**
   * Applies data that came from outside the editor.
   * 'merge' treats the payload as a patch: given cv fields replace current ones, the rest stay.
   */
  function applyExternal(data: Record<string, unknown>, mode: 'replace' | 'merge' = 'replace') {
    if (data.content && typeof data.content === 'object') {
      const content = data.content as Record<string, unknown>
      const layout = (content.layout ?? {}) as Record<string, unknown>
      data = { ...content, ...layout, customSectionLabels: layout.sectionLabels, ...((data.config as Record<string, unknown>) ?? {}) }
    }
    const before = exportState()
    undoSnapshot.value = before
    if (mode === 'replace') {
      loadCv(data)
      return
    }
    const patchCv = (data.cv ?? (('name' in data || 'experiences' in data) ? data : null)) as
      | Record<string, unknown>
      | null
    const patchCl = data.coverLetter as Record<string, any> | undefined
    const beforeCl = before.coverLetter as Record<string, any>
    const merged: Record<string, unknown> = {
      ...before,
      ...data,
      cv: { ...(before.cv as object), ...(patchCv ?? {}) },
      coverLetter: patchCl
        ? { ...beforeCl, ...patchCl, header: { ...beforeCl.header, ...(patchCl.header ?? {}) } }
        : beforeCl,
    }
    loadCv(merged)
  }

  function undoExternal() {
    if (!undoSnapshot.value) return
    loadCv(undoSnapshot.value)
    undoSnapshot.value = null
  }

  // Autosave: a refresh must never lose the user's CV.
  const AUTOSAVE_KEY = 'cv_autosave_v1'
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    [cvData, coverLetterData],
    () => {
      if (autosaveTimer) clearTimeout(autosaveTimer)
      autosaveTimer = setTimeout(() => setLocal(AUTOSAVE_KEY, JSON.stringify(exportState())), 500)
    },
    { deep: true },
  )

  function restoreAutosave(): boolean {
    const saved = getLocalJson<Record<string, unknown> | null>(AUTOSAVE_KEY, null)
    if (!saved) return false
    loadCv(saved)
    return true
  }

  function hasContent(): boolean {
    const c = cvData.value
    return !!(c.name || c.experiences.some((e) => e.company || e.position || e.bullets.length))
  }

  async function loadSample() {
    try {
      const baseUrl = import.meta.env.BASE_URL || '/'
      const res = await fetch(`${baseUrl}sample.json`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      loadCv(data)
    } catch (e) {
      console.warn('Failed to fetch runtime sample.json, falling back to bundled data:', e)
      loadCv(sampleData as any)
    }
  }

  return {
    activeWorkspace,
    cvData,
    coverLetterData,
    sizeMultiplier,
    selectedFont,
    customFontName,
    language,
    uiLanguage,
    editorMode,
    sectionsOrder,
    disabledSections,
    experienceHeaderStyle,
    experienceCompanyMode,
    editViewMode,
    activeSectionTab,
    isLayoutDrawerOpen,
    isStyleDrawerOpen,
    draftSectionsOrder,
    draftDisabledSections,
    collapsedItems,
    bulletChars,
    customSectionLabels,
    downloadTrigger,
    pdfBlob,
    template,
    avatarStyle,
    jobDescription,
    pdfPageCount,
    undoSnapshot,
    exportState,
    exportContent,
    exportConfig,
    exportHandoff,
    applyExternal,
    undoExternal,
    restoreAutosave,
    hasContent,
    loadCv,
    loadSample,
    updateSectionLabel,
    addCustomSection,
    removeCustomSection,
    addPageBreak,
    removePageBreak,
    toggleSection,
    isSectionEnabled,
    triggerDownload,
    startLayoutEditing,
    commitLayoutChanges,
    cancelLayoutChanges,
    toggleCollapsed,
    isCollapsed,
  }
}
)

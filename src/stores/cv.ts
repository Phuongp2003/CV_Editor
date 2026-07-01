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
} from '@/types/cv'
import { DEFAULT_SECTIONS_ORDER } from '@/types/cv'

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
  skills: [
    { skill: '', description: '' },
  ],
  educations: [
    { university: '', degree: '', gpa: '', graduationDate: '' },
  ],
  certificates: [
    { certName: '', 'issuer/description': '', certDate: '' },
  ],
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
  const sizeMultiplier = ref(Number(getLocal('cv_sizeMultiplier', '1.0')))
  /** Font family selection. Defaults to 'notosans'. */
  const selectedFont = ref(getLocal('cv_selectedFont', 'notosans'))
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
  const disabledSections = ref<SectionKey[]>(getLocalJson<SectionKey[]>('cv_disabledSections', ['summary']))
  /** Experience section header style selection ('classic' | 'role-company'). */
  const experienceHeaderStyle = ref<'classic' | 'role-company'>(getLocal('cv_experienceHeaderStyle', 'classic') as 'classic' | 'role-company')

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
      bullets: parseBulletsToParts(proj.bullets),
    }))

    cvData.value = {
      name: (source.name as string) || '',
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
      skills: Array.isArray(source.skills) ? JSON.parse(JSON.stringify(source.skills)) : [],
      educations: Array.isArray(source.educations)
        ? JSON.parse(JSON.stringify(source.educations))
        : [],
      certificates: Array.isArray(source.certificates)
        ? JSON.parse(JSON.stringify(source.certificates))
        : [],
      profileImage: (source.profileImage as string | null) ?? null,
      profileImageType: (source.profileImageType as string | null) ?? null,
    }

    if (data.language) language.value = data.language as string
    if (data.sizeMultiplier) sizeMultiplier.value = Number(data.sizeMultiplier)
    if (data.selectedFont) selectedFont.value = data.selectedFont as string
    if (data.editorMode && (data.editorMode === 'tabs' || data.editorMode === 'outline')) {
      editorMode.value = data.editorMode as EditorMode
    }
    if (data.experienceHeaderStyle && (data.experienceHeaderStyle === 'classic' || data.experienceHeaderStyle === 'role-company')) {
      experienceHeaderStyle.value = data.experienceHeaderStyle as 'classic' | 'role-company'
    } else {
      experienceHeaderStyle.value = 'classic'
    }

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
      disabledSections.value = ['summary']
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
    loadCv,
    loadSample,
    updateSectionLabel,
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

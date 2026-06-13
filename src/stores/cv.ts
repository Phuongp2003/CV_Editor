import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CVData,
  BulletPart,
  BulletLevel,
  BulletChars,
  EditorMode,
  SectionKey,
  Experience,
  Project,
} from '@/types/cv'
import { DEFAULT_SECTIONS_ORDER } from '@/types/cv'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

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

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCVStore = defineStore('cv', () => {
  const cvData = ref<CVData>({ ...EMPTY_CV })

  const sizeMultiplier = ref(1.0)
  const selectedFont = ref('notosans')
  const customFontName = ref('')
  const language = ref('English')
  const uiLanguage = ref('English')
  const editorMode = ref<EditorMode>('tabs')

  const sectionsOrder = ref<SectionKey[]>([...DEFAULT_SECTIONS_ORDER])
  const disabledSections = ref<SectionKey[]>(['objective'])

  // Layout editing & view states
  const editViewMode = ref<'content' | 'layout'>('layout')
  const activeSectionTab = ref<string>('personal')
  const isLayoutDrawerOpen = ref(false)
  const isStyleDrawerOpen = ref(false)
  const draftSectionsOrder = ref<SectionKey[]>([])
  const draftDisabledSections = ref<SectionKey[]>([])
  const collapsedItems = ref<Record<string, boolean>>({})

  const bulletChars = ref<BulletChars>({ l1: '•', l2: '◦', l3: '▪' })

  const customSectionLabels = ref<Record<string, string>>({
    summary: '',
    objective: '',
    skills: '',
    experience: '',
    projects: '',
    education: '',
    certificates: '',
  })

  // ─── Actions ────────────────────────────────────────────────────────────────

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
      disabledSections.value = [...data.disabledSections] as SectionKey[]
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
  }

  function updateSectionLabel(key: string, value: string) {
    customSectionLabels.value[key] = value
  }

  function toggleSection(secKey: SectionKey) {
    const idx = disabledSections.value.indexOf(secKey)
    if (idx > -1) {
      disabledSections.value.splice(idx, 1)
    } else {
      disabledSections.value.push(secKey)
    }
  }

  function isSectionEnabled(secKey: SectionKey): boolean {
    return !disabledSections.value.includes(secKey)
  }

  const downloadTrigger = ref(0)
  const pdfBlob = ref<Blob | null>(null)
  function triggerDownload() {
    downloadTrigger.value++
  }

  function startLayoutEditing() {
    draftSectionsOrder.value = [...sectionsOrder.value]
    draftDisabledSections.value = [...disabledSections.value]
    editViewMode.value = 'layout'
    isLayoutDrawerOpen.value = true
  }

  function commitLayoutChanges() {
    sectionsOrder.value = [...draftSectionsOrder.value]
    disabledSections.value = [...draftDisabledSections.value]
    editViewMode.value = 'content'
    isLayoutDrawerOpen.value = false
  }

  function cancelLayoutChanges() {
    editViewMode.value = 'content'
    isLayoutDrawerOpen.value = false
  }

  function toggleCollapsed(key: string) {
    collapsedItems.value[key] = !collapsedItems.value[key]
  }

  function isCollapsed(key: string): boolean {
    return !!collapsedItems.value[key]
  }

  return {
    cvData,
    sizeMultiplier,
    selectedFont,
    customFontName,
    language,
    uiLanguage,
    editorMode,
    sectionsOrder,
    disabledSections,
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
})

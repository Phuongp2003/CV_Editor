// ─── Core Domain Types ───────────────────────────────────────────────────────

export type BulletLevel = 'header' | 'l1' | 'l2' | 'l3'

export type SectionKey =
  | 'summary'
  | 'objective'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certificates'

export type EditorMode = 'tabs' | 'outline'

// ─── CV Data Structures ───────────────────────────────────────────────────────

export interface BulletPart {
  id: string
  type: BulletLevel
  text: string
}

export interface Experience {
  position: string
  company: string
  location: string
  dates: string
  bullets: BulletPart[]
}

export interface Project {
  projectName: string
  projectLink: string
  bullets: BulletPart[]
}

export interface Skill {
  skill: string
  description: string
}

export interface Education {
  university: string
  degree: string
  gpa: string
  graduationDate: string
}

export interface Certificate {
  certName: string
  'issuer/description': string
  certDate: string
}

export interface CVData {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  linkedin_placeholder?: string
  github: string
  github_placeholder?: string
  website: string
  website_placeholder?: string
  summary: string
  objective: string
  experiences: Experience[]
  projects: Project[]
  skills: Skill[]
  educations: Education[]
  certificates: Certificate[]
  profileImage?: string | null
  profileImageType?: string | null
}

// ─── Store / UI State Types ───────────────────────────────────────────────────

export interface BulletChars {
  l1: string
  l2: string
  l3: string
}

export const DEFAULT_SECTIONS_ORDER: SectionKey[] = [
  'summary',
  'objective',
  'skills',
  'experience',
  'projects',
  'education',
  'certificates',
]

export const DEFAULT_SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Summary',
  objective: 'Objective',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  certificates: 'Certificates',
}

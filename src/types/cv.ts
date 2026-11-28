/**
 * Represents the levels of indentation and formatting for bullet points.
 *
 * @public
 */
export type BulletLevel = 'header' | 'l1' | 'l2' | 'l3'

/**
 * Valid keys for CV sections.
 *
 * @public
 */
export type SectionKey =
  | 'summary'
  | 'objective'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certificates'
  | 'page-break'
  | `custom:${string}`

/**
 * The rendering modes available for the CV editor form.
 *
 * @public
 */
export type EditorMode = 'tabs' | 'outline'

/** How each job's company / title / dates header is laid out. one-line drops the location. */
export type ExperienceHeaderStyle = 'classic' | 'role-company' | 'one-line'
/** How consecutive roles at one company appear in the exported CV. */
export type ExperienceCompanyMode = 'separate-titles' | 'single-title'

export type CustomSectionPreset = 'experience' | 'summary' | 'skills'
export type CustomExperienceStyle = 'inherit' | 'hierarchy' | ExperienceHeaderStyle

/** PDF layout template. */
export type CvTemplate = 'harvard' | 'modern'

/** How the profile photo is drawn in the PDF. */
export interface AvatarStyle {
  /** Crop shape. */
  shape: 'square' | 'rounded' | 'circle'
  /** Where the photo sits relative to the name block. */
  position: 'left' | 'right' | 'center'
  /** Photo edge length: sm 56pt, md 72pt, lg 90pt. */
  size: 'sm' | 'md' | 'lg'
  /** cover fills the shape and crops; contain shows the whole image. */
  fit: 'cover' | 'contain'
}

export const DEFAULT_AVATAR_STYLE: AvatarStyle = { shape: 'rounded', position: 'left', size: 'md', fit: 'cover' }

/**
 * Represents a parsed fragment of a bullet point, supporting nested levels and rich formatting.
 *
 * @public
 */
export interface BulletPart {
  /** Unique identifier for the bullet part. */
  id: string
  /** Indentation or header formatting level. */
  type: BulletLevel
  /** Plain text containing markdown styles like bold or italic. */
  text: string
}

/**
 * Represents a single candidate professional experience record.
 *
 * @public
 */
export interface Experience {
  /** The job position/title. */
  position: string
  /** Name of the employing company. */
  company: string
  /** Geographical location of the role (optional). */
  location: string
  /** Working dates / period (e.g. "October 2024 - Present"). */
  dates: string
  /** Bullet points outlining role accomplishments. */
  bullets: BulletPart[]
}

/**
 * Represents a candidate project record.
 *
 * @public
 */
export interface Project {
  /** Name of the project. */
  projectName: string
  /** URL or hyperlink to the project. */
  projectLink: string
  /** Short context describing the product or problem before contribution bullets. */
  overview?: string
  /** Display period for a selected project. */
  dates?: string
  /** Compact Technologies bullet shown before project accomplishments. */
  technologies?: string
  /** Bullet points outlining project details and tech stack. */
  bullets: BulletPart[]
}

/** User-defined section whose content is rendered with a reusable section preset. */
export interface CustomSectionEntry extends Experience {
  /** Optional date shown alongside the job title in hierarchy style. */
  positionDates?: string
}

export interface CustomSection {
  id: string
  title: string
  preset?: CustomSectionPreset
  experienceStyle?: CustomExperienceStyle
  showCompanyDates?: boolean
  showPosition?: boolean
  showPositionDates?: boolean
  summaryText?: string
  skills?: Skill[]
  entries: CustomSectionEntry[]
}

/**
 * Represents a skill item grouped by domain.
 *
 * @public
 */
export interface Skill {
  /** The group name for the skills (e.g. "Languages"). */
  skill: string
  /** A comma-separated list of individual skills. */
  description: string
}

/**
 * Represents a candidate educational degree record.
 *
 * @public
 */
export interface Education {
  /** Name of the school or university. */
  university: string
  /** Degree name (e.g. "B.S. in Computer Science"). */
  degree: string
  /** Cumulative GPA score (optional). */
  gpa: string
  /** Month and year of graduation (e.g. "05/2026"). */
  graduationDate: string
}

/**
 * Represents a certificate or professional achievement.
 *
 * @public
 */
export interface Certificate {
  /** Name of the certification. */
  certName: string
  /** The organization that issued it, or short details. */
  'issuer/description': string
  /** Month and year of certification (optional). */
  certDate: string
}

/**
 * Core domain interface representing all data inside a CV.
 *
 * @public
 */
export interface CVData {
  /** Candidate full name. */
  name: string
  /** Role headline printed below the candidate name. */
  title?: string
  /** Contact email address. */
  email: string
  /** Contact phone number. */
  phone: string
  /** Location details (e.g. "City, Country"). */
  location: string
  /** LinkedIN profile URL. */
  linkedin: string
  /** Display name/handle for LinkedIn. */
  linkedin_placeholder?: string
  /** GitHub profile URL. */
  github: string
  /** Display name/handle for GitHub. */
  github_placeholder?: string
  /** Personal portfolio website URL. */
  website: string
  /** Display name/handle for personal website. */
  website_placeholder?: string
  /** Tailored professional summary statement. */
  summary: string
  /** Career objective statement. */
  objective: string
  /** List of professional work experiences. */
  experiences: Experience[]
  /** List of relevant projects. */
  projects: Project[]
  /** Optional context line before the selected projects list. */
  projectIntro?: string
  /** Collection of tech skills. */
  skills: Skill[]
  /** Education background history. */
  educations: Education[]
  /** Professional certifications. */
  certificates: Certificate[]
  customSections?: CustomSection[]
  /** Base64 profile image source, or null if omitted. */
  profileImage?: string | null
  /** MIME type of the uploaded image. */
  profileImageType?: string | null
}

/**
 * Character symbols used for bullets in A4 formatting.
 *
 * @public
 */
export interface BulletChars {
  /** Symbol for first level indent bullets. */
  l1: string
  /** Symbol for second level indent bullets. */
  l2: string
  /** Symbol for third level indent bullets. */
  l3: string
}

/**
 * Default order of rendering for CV sections.
 *
 * @public
 */
export const DEFAULT_SECTIONS_ORDER: SectionKey[] = [
  'summary',
  'experience',
  'skills',
  'education',
  'projects',
  'certificates',
  'objective',
]

/**
 * Default labels for CV sections.
 *
 * @public
 */
export const DEFAULT_SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Summary',
  objective: 'Objective',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  certificates: 'Certificates',
  'page-break': 'Page break',
}

/**
 * Multilingual section translation labels for standard languages.
 * Shared by both rendering engines and download layouts.
 *
 * @public
 */
export const CV_LANGUAGE_SECTION_LABELS: Record<string, Record<SectionKey, string>> = {
  English: {
    summary: 'Summary',
    objective: 'Objective',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    certificates: 'Certificates',
    'page-break': 'Page break',
  },
  Vietnamese: {
    summary: 'Tóm tắt',
    objective: 'Mục tiêu',
    skills: 'Kỹ năng',
    experience: 'Kinh nghiệm',
    projects: 'Dự án',
    education: 'Học vấn',
    certificates: 'Chứng chỉ',
    'page-break': 'Ngắt trang',
  },
  Japanese: {
    summary: '要約',
    objective: '志望動機',
    skills: 'スキル',
    experience: '職歴',
    projects: 'プロジェクト',
    education: '学歴',
    certificates: '資格',
    'page-break': '改ページ',
  },
  Korean: {
    summary: '요약',
    objective: '목표',
    skills: '스킬',
    experience: '경력',
    projects: '프로젝트',
    education: '학력',
    certificates: '자격증',
    'page-break': '페이지 나누기',
  },
  Chinese: {
    summary: '个人总结',
    objective: '求职意向',
    skills: '专业技能',
    experience: '工作经历',
    projects: '项目经验',
    education: '教育背景',
    certificates: '荣誉证书',
    'page-break': '分页符',
  },
}

/**
 * Header elements representing sender and recipient contact information.
 *
 * @public
 */
export interface CoverLetterHeader {
  /** Sender candidate name. */
  senderName: string
  /** Sender email address. */
  senderEmail: string
  /** Sender phone number. */
  senderPhone: string
  /** Sender city/country location. */
  senderLocation: string
  /** Date of writing the letter. */
  date: string
  /** Recipient name (e.g. Hiring Manager). */
  recipientName: string
  /** Recipient job title. */
  recipientTitle: string
  /** Recipient email address. */
  recipientEmail?: string
  /** Name of the target company. */
  companyName: string
  /** Mailing address of the company. */
  companyAddress: string
}

/**
 * Domain interface representing all details inside a Cover Letter.
 *
 * @public
 */
export interface CoverLetterData {
  /** Contact and recipient meta information header. */
  header: CoverLetterHeader
  /** Salutation (e.g. "Dear Hiring Manager,"). */
  greeting: string
  /** Introductory paragraph. */
  openingParagraph: string
  /** Main body arguments / paragraphs. */
  bodyParagraphs: string[]
  /** Call to action and final statement. */
  closingParagraph: string
  /** Sign-off phrase and signature (e.g., "Sincerely,\n\nJohn Doe"). */
  signOff: string
}

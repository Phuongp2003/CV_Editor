/**
 * Static CV check: ATS parse risks + "AI slop" signals + evidence gaps + JD coverage.
 * Port of the cv-slop-ats-editor scan_cv.py heuristics, run on structured CV data instead of PDF text.
 * Every result is a hint for a human to verify, never a verdict. No network, no AI.
 */
import type { CVData, CoverLetterData, SectionKey, BulletChars } from '@/types/cv'

export type Severity = 'blocker' | 'major' | 'minor'
export type Category = 'ats' | 'slop' | 'evidence' | 'jd' | 'letter'

export interface Bilingual {
  English: string
  Vietnamese: string
}

export interface Finding {
  id: string
  severity: Severity
  category: Category
  title: Bilingual
  detail: Bilingual
  /** Offending snippets, quoted as-is. */
  quotes?: string[]
  target?: { section: SectionKey | 'personal'; index?: number }
}

export interface AuditStats {
  bullets: number
  avgWords: number
  lengthVariation: number | null
  labelRatio: number
  noNumber: number
  density: number
  words: number
  jdTerms: number
  jdProven: number
}

export interface AuditResult {
  score: number
  findings: Finding[]
  stats: AuditStats
}

export interface AuditInput {
  cv: CVData
  coverLetter?: CoverLetterData
  disabledSections: SectionKey[]
  customSectionLabels: Record<string, string>
  bulletChars: BulletChars
  pageCount: number
  jobDescription?: string
}

// ─── Lexicon (weak prior, edit freely) ────────────────────────────────────────

const CLICHES = [
  'spearheaded', 'leveraged', 'leveraging', 'utilized', 'utilizing', 'orchestrated', 'championed', 'synergy',
  'robust', 'seamless', 'cutting-edge', 'passionate', 'results-driven', 'detail-oriented', 'team player',
  'fast learner', 'proven track record', 'innovative', 'holistic', 'delve', 'tapestry', 'testament',
  'pivotal', 'vibrant', 'learning mindset', 'contribute effectively', 'i am writing to apply',
  'i am excited to', 'hands-on experience in', 'not just', 'more than just', 'thank you for considering',
  'practical exposure', 'dynamic environment', 'high-traffic', 'world-class', 'game-changer',
  'đam mê', 'năng động', 'tinh thần cầu tiến', 'không ngừng học hỏi', 'môi trường chuyên nghiệp',
  'đóng góp hết mình',
]
const WEAK_VERBS = [
  'worked on', 'helped', 'assisted', 'responsible for', 'involved in', 'participated in', 'supported',
  'tham gia', 'hỗ trợ', 'phụ trách',
]
const STOP = new Set(
  ('a an the and or of to in on for with at by from as is are was were be been it its this that these those i my me ' +
    'we our you your their they he she his her not no but if so than then into about over under via per use used ' +
    'using have has had will can could would should may might also other such each both all any more most and ' +
    'và của là có cho với các một những được trong khi để này đã đang không').split(' '),
)
const STANDARD_HEADINGS = new Set([
  'summary', 'objective', 'experience', 'work experience', 'professional experience', 'education', 'skills',
  'technical skills', 'projects', 'certificates', 'certifications', 'kinh nghiệm', 'học vấn', 'kỹ năng',
  'dự án', 'chứng chỉ', 'mục tiêu', 'tóm tắt',
])

// Known technologies and practices, matched as whole terms (keep in sync with skills/cv-editor/scripts/cv_tool.py).
const TECH_TERMS = [
  'C#', '.NET', '.NET Core', '.NET Framework', 'ASP.NET', 'ASP.NET Core', 'ASP.NET MVC', 'Web API', 'Entity Framework',
  'EF Core', 'LINQ', 'SignalR', 'Blazor', 'WPF', 'WinForms', 'SQL Server', 'T-SQL', 'stored procedures', 'MySQL',
  'MariaDB', 'PostgreSQL', 'Oracle', 'MongoDB', 'Redis', 'Elasticsearch', 'RabbitMQ', 'Kafka', 'Azure Service Bus',
  'Service Bus', 'Azure', 'Azure DevOps', 'AWS', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'GitLab CI',
  'Jenkins', 'xUnit', 'NUnit', 'MSTest', 'unit test', 'integration test', 'TDD', 'REST', 'RESTful', 'GraphQL', 'gRPC',
  'microservices', 'API gateway', 'Angular', 'React', 'Vue', 'Next.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS',
  'Node.js', 'Express', 'NestJS', 'Python', 'FastAPI', 'Django', 'Flask', 'Java', 'Spring Boot', 'PHP', 'Laravel',
  'Ruby on Rails', 'C++', 'Golang', 'OAuth', 'JWT', 'Keycloak', 'Git', 'Agile', 'Scrum', 'Linux', 'Nginx',
  'design patterns', 'SOLID', 'OOP', 'clean architecture', 'DDD', 'English', 'Japanese',
]
const KNOWN = new Set(TECH_TERMS.map((t) => t.toLowerCase()))
const ALIASES: Record<string, string[]> = {
  'entity framework': ['ef core', 'entity framework core'],
  'ef core': ['entity framework core', 'entity framework'],
  '.net': ['.net core', '.net 5', '.net 6', '.net 7', '.net 8', '.net 9', 'asp.net'],
  '.net core': ['.net 5', '.net 6', '.net 7', '.net 8', '.net 9', 'asp.net core'],
  'asp.net': ['asp.net core'],
  rest: ['restful', 'rest api', 'rest apis'],
  restful: ['rest api', 'rest apis'],
  'web api': ['rest api', 'rest apis', 'asp.net core'],
  'ci/cd': ['github actions', 'gitlab ci', 'azure devops', 'jenkins', 'continuous integration'],
  'unit test': ['unit tests', 'unit testing', 'xunit', 'nunit', 'mstest'],
  'service bus': ['azure service bus'],
  microservices: ['microservice'],
  vue: ['vue 3', 'vue.js'],
  react: ['react.js', 'reactjs'],
  'node.js': ['nodejs'],
  python: ['fastapi', 'django', 'flask'],
  kubernetes: ['k8s'],
  english: ['toeic', 'ielts', 'toefl'],
}
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const termRe = (t: string) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, 'i')
/** Whole-term match, so "SQL" in "MySQL" or "Python" in "RestrictedPython" do not count. */
export function hasTerm(text: string, term: string): boolean {
  return [term, ...(ALIASES[term.toLowerCase()] || [])].some((t) => termRe(t).test(text))
}

const TOOL_RE =
  /\b(?:[A-Z][a-z]+[A-Z][A-Za-z0-9]*|[A-Za-z]+[.#+][A-Za-z0-9.#+]+|[A-Z]{2,}[a-z0-9]*|[A-Za-z]+\d+[A-Za-z0-9]*)\b/g
const BEFORE_AFTER_RE = /\bfrom\b.{1,40}\bto\b|→|->|\bgiảm\b.{1,30}\bxuống\b|\d+\s?%|\d+\s?(x|×)\b/i
const LABEL_RE = /^[A-Z][A-Za-z0-9 &/+.\-]{2,40}:\s/

function jdTermsOf(jd: string): string[] {
  const found: [number, string][] = []
  for (const t of TECH_TERMS) {
    const m = termRe(t).exec(jd)
    if (m) found.push([m.index, t])
  }
  const terms = found.sort((a, b) => a[0] - b[0]).map(([, t]) => t)
  // Beyond the dictionary: tool-like names from requirement-like lines only (marketing words are noise).
  const req = /experience|knowledge|proficien|familiar|skill|understanding|hands-on|expertise|must|requir|strong|solid|plus/i
  const extra: string[] = []
  for (const line of jd.split(/\r?\n/)) {
    if (!req.test(line)) continue
    const toks = [...(line.match(TOOL_RE) || []), ...(line.match(/\b(Dapper|Moq|Selenium|Playwright|Cypress|Knockout\.js|jQuery|OData|Razor|Aspose\.\w+)\b/g) || [])]
    for (const tok of toks) {
      const low = tok.toLowerCase()
      if (tok.length < 3 || KNOWN.has(low) || terms.some((t) => t.toLowerCase() === low) || extra.includes(tok)) continue
      if (/\.(com|net|org|vn|io)$|^e\.g|^i\.e/.test(low)) continue
      if (low.endsWith('.js') && KNOWN.has(low.slice(0, -3))) continue
      if (low === 'k8s' || low === 'sql' || terms.some((t) => (ALIASES[t.toLowerCase()] || []).includes(low))) continue
      if (/^[A-Z]{2,4}$/.test(tok) && !['ORM', 'SQL', 'API', 'MVC', 'DDD', 'TDD', 'SPA'].includes(tok)) continue
      extra.push(tok)
    }
  }
  return [...terms, ...extra].slice(0, 35)
}

/** Months covered by experience date ranges (overlaps merged). */
function experienceMonths(cv: CVData, now = new Date()): number {
  const toIndex = (s: string): number | null => {
    const t = s.trim()
    if (/^(present|now|nay|hiện tại)/i.test(t)) return now.getFullYear() * 12 + now.getMonth()
    const m = t.match(/(\d{1,2})\/(\d{4})/)
    if (m) return Number(m[2]) * 12 + Number(m[1]) - 1
    const y = t.match(/(\d{4})/)
    return y ? Number(y[1]) * 12 : null
  }
  const spans = cv.experiences
    .map((e) => e.dates.split(/\s+[-–]\s+/))
    .filter((p) => p.length === 2)
    .map(([a, b]) => [toIndex(a!), toIndex(b!)] as const)
    .filter((x): x is readonly [number, number] => x[0] !== null && x[1] !== null)
    .map(([a, b]) => [a, b + 1] as [number, number])
    .sort((x, y) => x[0] - y[0])
  let total = 0
  let cur: [number, number] | null = null
  for (const sp of spans) {
    if (cur && sp[0] <= cur[1]) cur = [cur[0], Math.max(cur[1], sp[1])]
    else {
      if (cur) total += cur[1] - cur[0]
      cur = sp
    }
  }
  if (cur) total += cur[1] - cur[0]
  return total
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function plain(text: string): string {
  return (text || '')
    .replace(/<\/?u>/gi, '')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim()
}

const wordsOf = (t: string) => t.split(/\s+/).filter(Boolean)
const contentWords = (t: string) =>
  (t.toLowerCase().match(/[a-zà-ỹ][a-zà-ỹ0-9+#.\-]*/gi) || [])
    .map((w) => w.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter((w) => w.length > 2 && !STOP.has(w))

function trigrams(ws: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i + 2 < ws.length; i++) out.push(`${ws[i]} ${ws[i + 1]} ${ws[i + 2]}`)
  return out
}

function lumpiness(vals: number[]): number | null {
  if (vals.length < 3) return null
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  if (!mean) return null
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
  return Math.round((sd / mean) * 100) / 100
}

const short = (t: string, n = 110) => (t.length > n ? t.slice(0, n - 1) + '…' : t)
const bi = (English: string, Vietnamese: string): Bilingual => ({ English, Vietnamese })

interface BulletRef {
  text: string
  section: 'experience' | 'projects'
  index: number
}

function collectBullets(cv: CVData, disabled: SectionKey[]): BulletRef[] {
  const out: BulletRef[] = []
  if (!disabled.includes('experience')) {
    cv.experiences.forEach((e, index) =>
      e.bullets.forEach((b) => {
        if (b.type !== 'header' && plain(b.text)) out.push({ text: plain(b.text), section: 'experience', index })
      }),
    )
  }
  if (!disabled.includes('projects')) {
    cv.projects.forEach((p, index) =>
      p.bullets.forEach((b) => {
        if (b.type !== 'header' && plain(b.text)) out.push({ text: plain(b.text), section: 'projects', index })
      }),
    )
  }
  return out
}

function specificity(b: string): number {
  const tools = new Set(b.match(TOOL_RE) || [])
  let s = 0
  if (/\d/.test(b)) s++
  if (BEFORE_AFTER_RE.test(b)) s++
  if (tools.size >= 2) s++
  if (wordsOf(b).length >= 12) s++
  const low = b.toLowerCase()
  if (WEAK_VERBS.some((w) => low.includes(w)) || CLICHES.some((w) => low.includes(w))) s--
  return Math.max(s, 0)
}

function dateFormat(d: string): string | null {
  const s = d.trim()
  if (!s) return null
  if (/\b\d{2}\/\d{4}\b/.test(s)) return 'MM/YYYY'
  if (/\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/.test(s))
    return 'Month YYYY'
  if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? \d{4}\b/.test(s)) return 'Mon YYYY'
  if (/^\d{4}$/.test(s)) return 'YYYY'
  return 'other'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function auditCv(input: AuditInput): AuditResult {
  const { cv, disabledSections: disabled } = input
  const findings: Finding[] = []
  const add = (f: Finding) => findings.push(f)

  const intro = !disabled.includes('objective') ? plain(cv.objective) : !disabled.includes('summary') ? plain(cv.summary) : ''
  const introKey: SectionKey = !disabled.includes('objective') ? 'objective' : 'summary'
  const bullets = collectBullets(cv, disabled)
  const bulletTexts = bullets.map((b) => b.text)
  // Context lines under a company ("header" parts) are evidence too, though not bullets.
  const contextTexts = [...cv.experiences, ...cv.projects].flatMap((e) =>
    e.bullets.filter((b) => b.type === 'header').map((b) => plain(b.text)),
  )
  const projectContext = !disabled.includes('projects')
    ? cv.projects.flatMap((project) => [project.overview, project.technologies].map((value) => plain(value || '')).filter(Boolean))
    : []
  const skillsOn = !disabled.includes('skills')
  const skillsText = skillsOn ? cv.skills.map((s) => `${s.skill}: ${plain(s.description)}`).join('\n') : ''
  const fullText = [intro, skillsText, ...projectContext, ...bulletTexts].join('\n')
  const totalWords = wordsOf(fullText).length

  // ── ATS ──
  const missing = (['name', 'email', 'phone'] as const).filter((k) => !cv[k]?.trim())
  if (missing.length) {
    add({
      id: 'ats-contact',
      severity: 'blocker',
      category: 'ats',
      title: bi('Missing contact details', 'Thiếu thông tin liên hệ'),
      detail: bi(`Add: ${missing.join(', ')}.`, `Cần bổ sung: ${missing.join(', ')}.`),
      target: { section: 'personal' },
    })
  }

  const dates = [
    ...(!disabled.includes('experience') ? cv.experiences.map((e) => e.dates) : []),
    ...(!disabled.includes('education') ? cv.educations.map((e) => e.graduationDate) : []),
  ]
  const formats = new Set(dates.map(dateFormat).filter((f): f is string => !!f && f !== 'YYYY'))
  if (formats.size > 1) {
    add({
      id: 'ats-dates',
      severity: 'minor',
      category: 'ats',
      title: bi('Mixed date formats', 'Định dạng ngày không thống nhất'),
      detail: bi(
        `Found ${[...formats].join(', ')}. Pick one format (e.g. 07/2025 - Present) for every role and degree.`,
        `Đang dùng ${[...formats].join(', ')}. Chọn một kiểu (vd. 07/2025 - Present) cho mọi mục.`,
      ),
      quotes: dates.filter(Boolean),
    })
  }

  if (input.pageCount > 1) {
    add({
      id: 'ats-pages',
      severity: 'major',
      category: 'ats',
      title: bi(`CV runs to ${input.pageCount} pages`, `CV dài ${input.pageCount} trang`),
      detail: bi(
        'Under ~5 years of experience, recruiters expect one page. Cut the weakest bullets, not the font size.',
        'Dưới ~5 năm kinh nghiệm nên giữ 1 trang. Cắt bullet yếu nhất thay vì thu nhỏ chữ.',
      ),
    })
  }

  const oddLabels = Object.entries(input.customSectionLabels)
    .filter(([k]) => k !== 'page-break')
    .filter(([k, v]) => v?.trim() && !disabled.includes(k as SectionKey))
    .filter(([, v]) => !STANDARD_HEADINGS.has(v.trim().toLowerCase()))
  if (oddLabels.length) {
    add({
      id: 'ats-headings',
      severity: 'minor',
      category: 'ats',
      title: bi('Non-standard section headings', 'Tiêu đề section không chuẩn'),
      detail: bi(
        'ATS maps sections by heading. Prefer Experience, Education, Skills, Projects, Certifications.',
        'ATS nhận diện section theo tiêu đề. Nên dùng Experience, Education, Skills, Projects, Certifications.',
      ),
      quotes: oddLabels.map(([, v]) => v),
    })
  }

  if (!['•', '-', '–', '*', '·'].includes(input.bulletChars.l1.trim())) {
    add({
      id: 'ats-bullet-glyph',
      severity: 'minor',
      category: 'ats',
      title: bi('Unusual bullet symbol', 'Ký tự bullet lạ'),
      detail: bi(
        `"${input.bulletChars.l1}" may extract as garbage in ATS. Use • or -.`,
        `"${input.bulletChars.l1}" có thể bị ATS đọc thành ký tự lỗi. Dùng • hoặc -.`,
      ),
    })
  }

  if (cv.profileImage) {
    add({
      id: 'ats-photo',
      severity: 'minor',
      category: 'ats',
      title: bi('Profile photo included', 'CV có ảnh chân dung'),
      detail: bi(
        'Harvard-style and most international/ATS pipelines expect no photo. Keep it only if the employer asks.',
        'Chuẩn Harvard và đa số hệ thống ATS quốc tế không dùng ảnh. Chỉ giữ khi nhà tuyển dụng yêu cầu.',
      ),
      target: { section: 'personal' },
    })
  }

  // ── Slop ──
  const labelled = bullets.filter((b) => LABEL_RE.test(b.text))
  const labelRatio = bullets.length ? labelled.length / bullets.length : 0
  if (bullets.length >= 4 && labelRatio >= 0.6) {
    add({
      id: 'slop-labels',
      severity: 'major',
      category: 'slop',
      title: bi(
        `${Math.round(labelRatio * 100)}% of bullets start with a "Label:" prefix`,
        `${Math.round(labelRatio * 100)}% bullet mở đầu bằng "Nhãn:"`,
      ),
      detail: bi(
        'Identical "Label: verb + object + result" shapes are the clearest generated-text pattern. Keep a label only where it helps scanning, and let the strongest result open the bullet.',
        'Mọi bullet cùng khuôn "Nhãn: động từ + đối tượng + kết quả" là dấu hiệu văn AI rõ nhất. Chỉ giữ nhãn khi thật sự giúp đọc lướt, để kết quả mạnh nhất đứng đầu.',
      ),
      quotes: labelled.slice(0, 4).map((b) => short(b.text, 60)),
    })
  }

  const lens = bulletTexts.map((b) => wordsOf(b).length)
  const variation = lumpiness(lens)
  if (bullets.length >= 4 && variation !== null && variation < 0.25) {
    add({
      id: 'slop-uniform',
      severity: 'minor',
      category: 'slop',
      title: bi('Bullets are suspiciously uniform in length', 'Độ dài bullet đều một cách bất thường'),
      detail: bi(
        `Length variation ${variation} (under 0.25 reads machine-made). Real bullets are lumpy: one short punchy line next to a detailed one.`,
        `Độ biến thiên độ dài ${variation} (dưới 0.25 trông như máy viết). Bullet thật thường so le: một câu ngắn gọn cạnh một câu chi tiết.`,
      ),
    })
  }

  const openers = new Map<string, number>()
  bullets.forEach((b) => {
    const body = b.text.replace(LABEL_RE, '')
    const w = (body.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-zà-ỹ]/g, '')
    if (w) openers.set(w, (openers.get(w) || 0) + 1)
  })
  const repeatedOpeners = [...openers].filter(([, c]) => c >= 3)
  if (repeatedOpeners.length) {
    add({
      id: 'slop-openers',
      severity: 'minor',
      category: 'slop',
      title: bi('Same opening verb repeated', 'Lặp động từ mở đầu'),
      detail: bi(
        'Vary openings: verb-first, outcome-first ("Login time dropped from ~30s to ~5s after..."), or context-first.',
        'Đổi cách mở câu: bắt đầu bằng động từ, bằng kết quả ("Thời gian login giảm từ ~30s xuống ~5s sau khi..."), hoặc bằng bối cảnh.',
      ),
      quotes: repeatedOpeners.map(([w, c]) => `${w} ×${c}`),
    })
  }

  const lowAll = fullText.toLowerCase()
  const clicheHits = CLICHES.filter((w) => lowAll.includes(w))
  if (clicheHits.length) {
    add({
      id: 'slop-cliche',
      severity: clicheHits.length >= 3 ? 'major' : 'minor',
      category: 'slop',
      title: bi('Generic buzzwords', 'Từ sáo rỗng'),
      detail: bi(
        'Each is fine once if a concrete fact sits next to it. Otherwise replace it with what you actually did.',
        'Mỗi từ chỉ chấp nhận được khi đi kèm dữ kiện cụ thể. Nếu không, thay bằng việc bạn thật sự đã làm.',
      ),
      quotes: clicheHits,
    })
  }

  const weakHits = WEAK_VERBS.filter((w) => bulletTexts.some((b) => b.toLowerCase().includes(w)))
  if (weakHits.length) {
    add({
      id: 'slop-weak',
      severity: 'minor',
      category: 'slop',
      title: bi('Weak ownership verbs', 'Động từ thể hiện vai trò mờ nhạt'),
      detail: bi(
        '"Supported", "helped", "involved in" hide what you personally did. Name your part.',
        '"Supported", "helped", "tham gia" che mất phần bạn tự làm. Nêu rõ phần của bạn.',
      ),
      quotes: weakHits,
    })
  }

  const dashes = (fullText.match(/—/g) || []).length
  if (dashes >= 2) {
    add({
      id: 'slop-emdash',
      severity: 'minor',
      category: 'slop',
      title: bi(`${dashes} em-dashes`, `${dashes} dấu gạch dài (—)`),
      detail: bi('Em-dashes used as rhythm are a common generated-text tic. Use a period or comma.', 'Gạch dài dùng để tạo nhịp là thói quen phổ biến của văn AI. Dùng dấu chấm hoặc phẩy.'),
    })
  }

  if (intro) {
    const n = wordsOf(intro).length
    const techCount = new Set(intro.match(TOOL_RE) || []).size
    if (n > 55 || techCount > 7) {
      add({
        id: 'slop-intro',
        severity: 'minor',
        category: 'slop',
        title: bi('Objective is long or a keyword list', 'Objective quá dài hoặc liệt kê từ khóa'),
        detail: bi(
          `${n} words, ${techCount} tech names. Two lines: role + level + 2-3 target technologies + one proof point.`,
          `${n} từ, ${techCount} tên công nghệ. Viết 2 dòng: vị trí + cấp độ + 2-3 công nghệ mục tiêu + một bằng chứng cụ thể.`,
        ),
        target: { section: introKey },
      })
    }
  }

  const counts = new Map<string, number>()
  contentWords([intro, ...bulletTexts].join(' ')).forEach((w) => counts.set(w, (counts.get(w) || 0) + 1))
  const nameParts = new Set(contentWords(cv.name))
  const repeated = [...counts]
    .filter(([w, c]) => c >= 5 && w.length > 4 && !nameParts.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  if (repeated.length) {
    add({
      id: 'slop-repeat',
      severity: 'minor',
      category: 'slop',
      title: bi('Overused words', 'Từ bị lặp nhiều'),
      detail: bi(
        'Repetition flattens the page. Replace with the specific system, user or result each time.',
        'Lặp từ làm CV nhạt. Mỗi lần hãy thay bằng tên hệ thống, người dùng hoặc kết quả cụ thể.',
      ),
      quotes: repeated.map(([w, c]) => `${w} ×${c}`),
    })
  }

  const boldHeavy = [...input.cv.experiences, ...input.cv.projects]
    .flatMap((e) => e.bullets)
    .filter((b) => (b.text.match(/\*\*[^*]+\*\*/g) || []).length > 2)
  if (boldHeavy.length) {
    add({
      id: 'slop-bold',
      severity: 'minor',
      category: 'slop',
      title: bi('Too much bold', 'In đậm quá nhiều'),
      detail: bi('Bold at most one key result per bullet, or the eye has nowhere to land.', 'Mỗi bullet chỉ in đậm tối đa một kết quả chính.'),
      quotes: boldHeavy.slice(0, 3).map((b) => short(plain(b.text), 60)),
    })
  }

  const toolHits = (fullText.match(TOOL_RE) || []).length + (fullText.match(/\d+/g) || []).length
  const density = totalWords ? Math.round((1000 * toolHits) / totalWords) / 10 : 0
  if (totalWords > 80 && density < 10) {
    add({
      id: 'slop-density',
      severity: density < 6 ? 'major' : 'minor',
      category: 'slop',
      title: bi(`Low specificity: ${density} named things per 100 words`, `Ít chi tiết: ${density} tên riêng/số trên 100 từ`),
      detail: bi(
        'Confident tone with few systems, tools or numbers is the signature of generated text. Name the system, version, scale.',
        'Giọng tự tin nhưng ít tên hệ thống, công cụ, con số là đặc trưng của văn AI. Nêu tên hệ thống, phiên bản, quy mô.',
      ),
    })
  }

  // ── Evidence ──
  const noNumber = bullets.filter((b) => !/\d/.test(b.text) && !BEFORE_AFTER_RE.test(b.text))
  if (bullets.length >= 4 && noNumber.length / bullets.length > 0.6) {
    add({
      id: 'ev-numbers',
      severity: 'minor',
      category: 'evidence',
      title: bi(`${noNumber.length}/${bullets.length} bullets have no number or before/after`, `${noNumber.length}/${bullets.length} bullet không có số liệu hay trước/sau`),
      detail: bi(
        'Only use real numbers. Without one, describe the concrete change (manual to automated, N screens to 1).',
        'Chỉ dùng số thật. Không có số thì mô tả thay đổi cụ thể (thủ công thành tự động, N màn hình còn 1).',
      ),
    })
  }

  bullets
    .map((b) => ({ ...b, score: specificity(b.text) }))
    .filter((b) => b.score <= 1)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .forEach((b, i) =>
      add({
        id: `ev-weak-${i}`,
        severity: 'minor',
        category: 'evidence',
        title: bi(`Low-information bullet (${b.score}/4)`, `Bullet ít thông tin (${b.score}/4)`),
        detail: bi(
          'Could this line sit unchanged in a stranger\'s CV? Add what was broken, which tool, what changed.',
          'Câu này có thể nằm nguyên trong CV người khác không? Thêm vấn đề gì, công cụ nào, thay đổi ra sao.',
        ),
        quotes: [short(b.text)],
        target: { section: b.section, index: b.index },
      }),
    )

  bullets
    .filter((b) => wordsOf(b.text).length > 45)
    .slice(0, 3)
    .forEach((b, i) =>
      add({
        id: `ev-long-${i}`,
        severity: 'minor',
        category: 'evidence',
        title: bi(`Bullet has ${wordsOf(b.text).length} words`, `Bullet dài ${wordsOf(b.text).length} từ`),
        detail: bi('Split it or cut the tool list. Two lines on the page is the ceiling.', 'Tách đôi hoặc bớt danh sách công cụ. Tối đa 2 dòng trên trang.'),
        quotes: [short(b.text)],
        target: { section: b.section, index: b.index },
      }),
    )

  if (!disabled.includes('experience')) {
    cv.experiences.forEach((e, index) => {
      const n = e.bullets.filter((b) => b.type !== 'header' && plain(b.text)).length
      const prev = cv.experiences[index - 1]
      const sameOrg = !!prev && !!e.company.trim() && prev.company.trim().toLowerCase() === e.company.trim().toLowerCase()
      if ((e.company || e.position) && (n === 0 || n > 6 || (n < 2 && !sameOrg))) {
        add({
          id: `ev-count-${index}`,
          severity: n === 0 ? 'major' : 'minor',
          category: 'evidence',
          title: bi(`${e.company || e.position}: ${n} bullets`, `${e.company || e.position}: ${n} bullet`),
          detail: bi('Aim for 3-5 bullets per role, strongest first (1-2 is fine for an earlier role at the same company).', 'Nên có 3-5 bullet mỗi vị trí, mạnh nhất lên đầu (vị trí trước đó ở cùng công ty có 1-2 bullet là được).'),
          target: { section: 'experience', index },
        })
      }
    })
  }

  if (!disabled.includes('projects')) {
    const selectedProjects = cv.projects
      .map((project, index) => ({ project, index }))
      .filter(({ project }) =>
        project.projectName.trim() || project.overview?.trim() || project.bullets.some((bullet) => plain(bullet.text)),
      )
    const datedProjects: { name: string; dates: string; start: number; end: number; index: number }[] = []
    selectedProjects.forEach(({ project, index }) => {
      const name = project.projectName.trim() || `Project ${index + 1}`
      if (!project.overview?.trim()) {
        add({
          id: `ev-project-overview-${index}`,
          severity: 'minor',
          category: 'evidence',
          title: bi(`${name}: add project context`, `${name}: bổ sung bối cảnh dự án`),
          detail: bi(
            'Introduce the real product or system: its domain, users, purpose and known scale. Keep the candidate\'s role and contribution in the bullets; use only verified scope.',
            'Giới thiệu sản phẩm/hệ thống thật: domain, người dùng, mục đích và quy mô đã biết. Để vai trò, phần việc của ứng viên trong bullet; chỉ ghi phạm vi đã xác minh.',
          ),
          target: { section: 'projects', index },
        })
      }
      if (!project.technologies?.trim()) {
        add({
          id: `ev-project-tech-${index}`,
          severity: 'minor',
          category: 'evidence',
          title: bi(`${name}: identify the project stack`, `${name}: nêu công nghệ chính`),
          detail: bi('Add one compact Technologies line with only the tools used to build or operate this project.', 'Thêm một dòng Technologies ngắn, chỉ gồm công cụ thực sự dùng để xây dựng hoặc vận hành dự án.'),
          target: { section: 'projects', index },
        })
      }
      const date = project.dates?.trim() || ''
      const dateParts = [...date.matchAll(/(?:(\d{1,2})\/)?(\d{4})/g)]
      if (!date || !dateParts.length) {
        add({
          id: `ev-project-dates-${index}`,
          severity: 'minor',
          category: 'evidence',
          title: bi(`${name}: verify project dates`, `${name}: xác minh thời gian dự án`),
          detail: bi('Add the verified project period so selected projects can be ordered newest first. Do not estimate dates.', 'Bổ sung khoảng thời gian đã xác minh để xếp dự án mới nhất trước. Không tự ước lượng ngày.'),
          target: { section: 'projects', index },
        })
      } else {
        const start = dateParts[0]!
        const end = dateParts[dateParts.length - 1]!
        datedProjects.push({
          name,
          dates: date,
          start: Number(start[2]) * 12 + Number(start[1] || 1),
          end: Number(end[2]) * 12 + Number(end[1] || 12),
          index,
        })
      }
    })
    const outOfOrder = datedProjects.slice(1).find((project, index) => {
      const previous = datedProjects[index]!
      return project.end > previous.end || (project.end === previous.end && project.start > previous.start)
    })
    if (outOfOrder) {
      const previous = datedProjects[datedProjects.indexOf(outOfOrder) - 1]!
      add({
        id: 'ev-project-order',
        severity: 'minor',
        category: 'evidence',
        title: bi('Projects are not newest first', 'Dự án chưa được xếp mới nhất trước'),
        detail: bi('Sort selected projects by verified end date, newest first; use the later start date when end dates tie.', 'Xếp dự án theo ngày kết thúc đã xác minh, mới nhất trước; nếu trùng ngày kết thúc thì dự án bắt đầu muộn hơn đứng trước.'),
        quotes: [`${previous.name} (${previous.dates})`, `${outOfOrder.name} (${outOfOrder.dates})`],
        target: { section: 'projects', index: outOfOrder.index },
      })
    }
  }

  if (skillsOn) {
    const body = [...bulletTexts, ...contextTexts, ...projectContext].join(' ').toLowerCase()
    const terms = cv.skills
      .flatMap((s) => plain(s.description).split(/[,;|]/))
      .map((t) => t.replace(/\(.*?\)/g, '').trim())
      .filter((t) => t.length > 1 && t.length < 30)
    const claimed = [...new Set(terms)].filter(
      (t) => !hasTerm(body, t) && !t.split('/').some((p) => p.trim().length > 1 && hasTerm(body, p.trim())),
    )
    if (claimed.length) {
      add({
        id: 'ev-claimed',
        severity: claimed.length > 8 ? 'major' : 'minor',
        category: 'evidence',
        title: bi(`${claimed.length} skills are claimed but never shown`, `${claimed.length} kỹ năng chỉ liệt kê, không có bằng chứng`),
        detail: bi(
          'A skill that appears only in Skills is "claimed", not "proven". Show the important ones in a bullet or drop the ones you cannot discuss for 5 minutes.',
          'Kỹ năng chỉ có trong mục Skills là "tự nhận", chưa "chứng minh". Đưa kỹ năng quan trọng vào bullet, bỏ kỹ năng không nói được 5 phút.',
        ),
        quotes: claimed.slice(0, 14),
        target: { section: 'skills' },
      })
    }
  }

  // ── JD coverage ──
  let jdTerms = 0
  let jdProven = 0
  const jd = (input.jobDescription || '').trim()
  if (jd) {
    const extra = [
      ...cv.certificates.map((c) => `${c.certName} ${c['issuer/description']}`),
      ...cv.educations.map((e) => `${e.degree} ${e.university}`),
    ].join(' ')
    const body = [intro, ...bulletTexts, ...contextTexts, ...projectContext, extra].join(' ')
    const proven: string[] = []
    const claimedOnly: string[] = []
    const missingTerms: string[] = []
    for (const t of jdTermsOf(jd)) {
      if (hasTerm(body, t)) proven.push(t)
      else if (hasTerm(skillsText, t)) claimedOnly.push(t)
      else missingTerms.push(t)
    }
    jdTerms = proven.length + claimedOnly.length + missingTerms.length
    jdProven = proven.length
    if (missingTerms.length) {
      add({
        id: 'jd-missing',
        severity: missingTerms.length > 6 ? 'major' : 'minor',
        category: 'jd',
        title: bi(`${missingTerms.length} JD terms absent from the CV`, `${missingTerms.length} thuật ngữ của JD không có trong CV`),
        detail: bi(
          'Use the JD wording where it is true. If you never did it, leave it out and address it once in the cover letter.',
          'Dùng đúng thuật ngữ của JD nếu đúng sự thật. Nếu chưa từng làm thì bỏ qua và nói một lần trong cover letter.',
        ),
        quotes: missingTerms,
      })
    }
    if (claimedOnly.length) {
      add({
        id: 'jd-claimed',
        severity: 'minor',
        category: 'jd',
        title: bi(`${claimedOnly.length} JD terms only in Skills`, `${claimedOnly.length} thuật ngữ JD chỉ có ở Skills`),
        detail: bi('Prove them in a bullet: action + outcome.', 'Chứng minh bằng một bullet: hành động + kết quả.'),
        quotes: claimedOnly,
        target: { section: 'skills' },
      })
    }
    const years = [...jd.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?|năm)/gi)].map((m) => Number(m[1])).filter((y) => y > 0 && y < 20)
    if (years.length) {
      const need = Math.min(...years)
      const have = experienceMonths(cv) / 12
      if (have + 0.25 < need) {
        add({
          id: 'jd-years',
          severity: 'minor',
          category: 'jd',
          title: bi(`JD asks ${need}+ years; CV dates show about ${have.toFixed(1)}`, `JD yêu cầu ${need}+ năm; ngày tháng trong CV cho thấy khoảng ${have.toFixed(1)}`),
          detail: bi(
            'State the real span; do not stretch dates. Lead with the strongest relevant evidence instead.',
            'Ghi đúng thời gian thật, không kéo dài ngày tháng. Thay vào đó, đưa bằng chứng mạnh nhất lên đầu.',
          ),
        })
      }
    }
  }

  // ── Cover letter ──
  const cl = input.coverLetter
  const letter = cl ? [cl.openingParagraph, ...cl.bodyParagraphs, cl.closingParagraph].map(plain).join(' ').trim() : ''
  if (letter) {
    const n = wordsOf(letter).length
    if (n < 150 || n > 300) {
      add({
        id: 'cl-length',
        severity: 'minor',
        category: 'letter',
        title: bi(`Cover letter is ${n} words`, `Cover letter dài ${n} từ`),
        detail: bi('150-250 words is enough to add what the CV cannot.', '150-250 từ là đủ để bổ sung điều CV không nói được.'),
      })
    }
    const cvGrams = new Set(trigrams(contentWords(fullText)))
    const sentences = letter.split(/(?<=[.!?])\s+/).filter((s) => wordsOf(s).length >= 4)
    const repeats = sentences.filter((s) => {
      const g = trigrams(contentWords(s))
      return g.length && g.filter((x) => cvGrams.has(x)).length / g.length >= 0.25
    })
    if (sentences.length && repeats.length / sentences.length > 1 / 3) {
      add({
        id: 'cl-repeat',
        severity: 'major',
        category: 'letter',
        title: bi(`${repeats.length}/${sentences.length} letter sentences restate the CV`, `${repeats.length}/${sentences.length} câu trong thư lặp lại CV`),
        detail: bi('Replace them with why this company, why this role, and one short story.', 'Thay bằng lý do chọn công ty, vị trí này và một câu chuyện ngắn.'),
        quotes: repeats.slice(0, 3).map((s) => short(s)),
      })
    }
  }

  const weights: Record<Severity, number> = { blocker: 25, major: 10, minor: 3 }
  const score = Math.max(0, 100 - findings.reduce((a, f) => a + weights[f.severity], 0))
  const order: Record<Severity, number> = { blocker: 0, major: 1, minor: 2 }
  findings.sort((a, b) => order[a.severity] - order[b.severity])

  return {
    score,
    findings,
    stats: {
      bullets: bullets.length,
      avgWords: lens.length ? Math.round((lens.reduce((a, b) => a + b, 0) / lens.length) * 10) / 10 : 0,
      lengthVariation: variation,
      labelRatio: Math.round(labelRatio * 100) / 100,
      noNumber: noNumber.length,
      density,
      words: totalWords,
      jdTerms,
      jdProven,
    },
  }
}

/**
 * Builds a self-contained prompt the user pastes into ANY chat AI (ChatGPT, Gemini, Claude...).
 * The site itself never calls an AI; the AI's answer comes back as a link or a JSON block.
 */
import type { AuditResult } from '@/utils/cvAudit'

export type AiTask = 'create' | 'improve' | 'tailor' | 'convert' | 'cover'
export type AiRole = 'se' | 'ba' | 'qc' | 'po' | 'automation' | 'other'

export const AI_TASKS: { id: AiTask; icon: string; needsJd?: boolean }[] = [
  { id: 'create', icon: 'i-lucide-wand-sparkles' },
  { id: 'improve', icon: 'i-lucide-scan-search' },
  { id: 'tailor', icon: 'i-lucide-target', needsJd: true },
  { id: 'convert', icon: 'i-lucide-file-input' },
  { id: 'cover', icon: 'i-lucide-mail', needsJd: true },
]

export const AI_ROLES: { id: AiRole; label: string; focus: string }[] = [
  {
    id: 'se',
    label: 'Software Engineer',
    focus:
      'Software engineering (backend, frontend, full-stack, mobile). Probe for system scale, performance before/after, design decisions and trade-offs, what the person personally built vs the team.',
  },
  {
    id: 'ba',
    label: 'Business Analyst',
    focus:
      'Business analysis. Probe for requirements elicited, stakeholders, BPMN/UML/user stories produced, process changes shipped and their measured effect.',
  },
  {
    id: 'qc',
    label: 'QA / QC',
    focus:
      'Software quality. Probe for test strategy, automation frameworks and coverage, API/performance testing, defects found or escaped, release quality metrics.',
  },
  {
    id: 'po',
    label: 'Product Owner / PM',
    focus:
      'Product ownership. Probe for roadmap decisions, prioritization method, discovery done, features shipped and user or business outcomes actually measured.',
  },
  {
    id: 'automation',
    label: 'Automation / Embedded',
    focus:
      'Industrial automation or embedded systems. Probe for PLC/SCADA/HMI platforms, hardware and firmware work, commissioning, safety and quality standards.',
  },
  { id: 'other', label: 'Other', focus: 'Any field. Probe for concrete responsibilities, tools and measurable results.' },
]

const TASK_TEXT: Record<AiTask, string> = {
  create:
    'Create my CV from scratch. Interview me step by step (target role and job description, each job, projects, education). Ask for real numbers in small batches, then produce the CV.',
  improve:
    'Audit my current CV for ATS problems and "AI slop" (generic, low-information sentences). Use the app check results below as hints. List blockers/majors/minors, show the weakest bullets and which real fact would fix each, ask me for missing facts, then rewrite only what you can do truthfully.',
  tailor:
    'Tailor my CV to the job description below. Build a requirement-evidence table (Proven / Claimed / Adjacent / Absent), ask me about Claimed or Absent must-haves, reorder skills and bullets, and use the JD wording only where it is true.',
  convert:
    'Convert my old CV (I will paste its text or attach the file) into this app format without adding facts. Keep the wording close to the original, fix only obvious slop and formatting, then tell me the top 5 improvements and ask for the facts they need.',
  cover:
    'Write a 150-250 word cover letter for the job below. Ask me why this company and for one short story if you do not know them. Send only the "coverLetter" key.',
}

const RULES = `Writing rules (non-negotiable)
1. Never invent facts: no made-up numbers, tools, versions, employers, dates, team sizes or scope. If a fact is missing, ask me or write the bullet without it. Do not overclaim ownership ("led", "designed") unless I confirm it.
2. Slop = low information. A sentence that could sit unchanged in a stranger's CV is slop. Fix it by restoring specifics (what was broken, what I did, which tool, what changed), never by swapping synonyms.
3. Bullets only in Experience and Projects. 3-5 per role, strongest first. Pattern: need -> action -> tool -> result. Vary length and opening. Do NOT start every bullet with a bold "Label:". Bold 1-2 key phrases per bullet (result or key technology) and the target keywords in the objective.
4. Avoid: spearheaded, leveraged, utilized, orchestrated, robust, seamless, cutting-edge, passionate, results-driven, proven track record, "hands-on experience in", "not just X but Y", em-dashes.
5. Objective or summary (only one): two lines. Role + level + 2-3 target technologies + one proof point.
6. Skills grouped, target stack first; every key skill should also appear in a bullet. Drop what I cannot discuss for 5 minutes.
7. One page under ~5 years of experience. One date format everywhere (e.g. 07/2025 - Present). Standard headings. No photo.
8. Cover letter: 150-250 words, adds what the CV cannot (why this company, one short story). No "I am writing to apply", no apologies, no platitudes.`

const SHAPE = `{
  "cv": {
    "name": "", "email": "", "phone": "", "location": "City, Country",
    "github": "https://...", "github_placeholder": "github.com/user",
    "linkedin": "https://...", "linkedin_placeholder": "linkedin.com/in/user",
    "website": "", "website_placeholder": "",
    "objective": "", "summary": "",
    "experiences": [{ "position": "", "company": "", "location": "", "dates": "MM/YYYY - Present",
      "bullets": [{ "id": "e1b1", "type": "l1", "text": "plain text, **bold** sparingly" }] }],
    "projects": [{ "projectName": "", "projectLink": "", "bullets": [{ "id": "p1b1", "type": "l1", "text": "" }] }],
    "skills": [{ "skill": "Backend", "description": "C#, ASP.NET Core, ..." }],
    "educations": [{ "university": "", "degree": "", "gpa": "", "graduationDate": "" }],
    "certificates": [{ "certName": "", "issuer/description": "", "certDate": "" }]
  },
  "coverLetter": { "header": { "companyName": "", "recipientName": "", "date": "" },
    "greeting": "", "openingParagraph": "", "bodyParagraphs": [""], "closingParagraph": "", "signOff": "" },
  "sectionsOrder": ["objective", "education", "experience", "projects", "skills", "certificates"],
  "disabledSections": ["summary"]
}`

const TASK_SHORT: Record<AiTask, string> = {
  create: 'Create my CV from scratch. Interview me first.',
  improve: 'Audit my current CV for ATS problems and AI slop, then fix what you can truthfully.',
  tailor: 'Tailor my current CV to the job description below.',
  convert: 'Convert my old CV (I will attach it) into CV Editor format without adding facts.',
  cover: 'Write a cover letter for the job below.',
}

export interface SkillRequestInput {
  task: AiTask
  role: AiRole
  siteUrl: string
  cvLanguage: string
  chatLanguage: string
  /** Share link of the current CV, or null to start from nothing. */
  cvLink: string | null
  jobDescription: string
}

/**
 * Short message for an agent that has the cv-editor skill installed. The skill carries the rules,
 * schema and tools, so the message only states the task and points at the data.
 */
export function buildSkillRequest(p: SkillRequestInput): string {
  const role = AI_ROLES.find((r) => r.id === p.role) ?? AI_ROLES[0]!
  const site = p.siteUrl.replace(/\/+$/, '')
  const lines = [
    `Use the cv-editor skill (if you do not have it: ${site}/cv-editor-skill.zip?v=1.1.0).`,
    `Task: ${TASK_SHORT[p.task]}`,
    `Field: ${role.label}. CV language: ${p.cvLanguage}. Talk to me in ${p.chatLanguage}.`,
  ]
  if (p.cvLink) lines.push(`My current CV: ${p.cvLink}`)
  if (p.jobDescription.trim()) lines.push('', 'Job description:', p.jobDescription.trim())
  return lines.join('\n')
}

export interface PromptInput {
  task: AiTask
  role: AiRole
  siteUrl: string
  cvLanguage: string
  chatLanguage: string
  currentCv: Record<string, unknown> | null
  jobDescription: string
  audit: AuditResult | null
}

function auditLines(a: AuditResult): string {
  return a.findings
    .map((f) => `- [${f.severity}] ${f.title.English}${f.quotes?.length ? `: ${f.quotes.slice(0, 6).join(' | ')}` : ''}`)
    .join('\n')
}

export function buildAiPrompt(p: PromptInput): string {
  const role = AI_ROLES.find((r) => r.id === p.role) ?? AI_ROLES[0]!
  const site = p.siteUrl.replace(/\/+$/, '')
  const parts: string[] = [
    `You are a senior recruiter and resume editor. Help me write my CV for CV Editor (${site}/), a free static site that renders, checks and exports it. If you can browse, read ${site}/llms.txt first.`,
    `TASK: ${TASK_TEXT[p.task]}`,
    `FIELD: ${role.focus}`,
    `Talk to me in ${p.chatLanguage}. Write the CV content in ${p.cvLanguage}.`,
    RULES,
    `How to give me the result
- When ready, list each change in one line with its reason, then output ONE fenced json code block with this shape (send only the top-level keys you change; inside "cv", any field you send replaces mine entirely, so send whole arrays):
${SHAPE}
- If you can run code, ALSO give me a one-click link: raw-deflate the minified UTF-8 JSON (Python: zlib.compressobj(9, zlib.DEFLATED, -15)), base64url it without padding, and print ${site}/#cv=z:<that string>. Add &mode=merge at the end if you only sent some keys.
- I will either click the link or copy the json block and press Ctrl+V on the site.
- Finish with 5 interview questions this CV invites, so I can check I can defend every bullet.`,
  ]
  if (p.currentCv) parts.push(`MY CURRENT CV (JSON):\n${JSON.stringify(p.currentCv)}`)
  if (p.jobDescription.trim()) parts.push(`JOB DESCRIPTION:\n${p.jobDescription.trim()}`)
  if (p.audit && p.audit.findings.length && p.task !== 'create')
    parts.push(`AUTOMATIC CHECK OF MY CURRENT CV (hints from the app, verify by reading):\n${auditLines(p.audit)}`)
  if (p.task === 'convert') parts.push('MY OLD CV: I will paste or attach it in my next message. Wait for it.')
  return parts.join('\n\n')
}

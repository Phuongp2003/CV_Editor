import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { renderCv, type RenderCvOptions } from '@/utils/pdf/renderCv'
import { auditCv } from '@/utils/cvAudit'
import { parseCvJsonText, inferMode, findHandoffLink, readHandoffFromUrl, buildShareLink } from '@/utils/handoff'
import { resolvePdfFont } from '@/utils/fonts'
import { CV_LANGUAGE_SECTION_LABELS, type CVData, type SectionKey } from '@/types/cv'

const root = resolve(__dirname, '../..')
const sample = JSON.parse(readFileSync(process.env.CV_RENDER_SRC || resolve(root, 'public/sample.json'), 'utf-8'))

function normalize(raw: any): CVData {
  const cv = raw.cv
  const bullets = (b: any[]) => b.map((x, i) => ({ id: x.id || `b${i}`, type: x.type || 'l1', text: x.text || '' }))
  return {
    ...cv,
    experiences: cv.experiences.map((e: any) => ({ ...e, bullets: bullets(e.bullets) })),
    projects: cv.projects.map((p: any) => ({ ...p, bullets: bullets(p.bullets) })),
  }
}

function options(cv: CVData, raw: any = sample): RenderCvOptions {
  return {
    cv,
    template: raw.template || 'harvard',
    language: 'English',
    sizeMultiplier: 1,
    selectedFont: 'times',
    customFontName: '',
    sectionsOrder: raw.sectionsOrder,
    disabledSections: raw.disabledSections,
    bulletChars: { l1: '•', l2: '◦', l3: '▪' },
    experienceHeaderStyle: raw.experienceHeaderStyle || 'classic',
    sectionLabels: CV_LANGUAGE_SECTION_LABELS.English as Record<SectionKey, string>,
  }
}

describe('renderCv', () => {
  it('renders the sample as a one-page Harvard PDF with a standard font', () => {
    const res = renderCv(options(normalize(sample)))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.pages).toBe(1)
    expect(res.fontFellBack).toBe(false)
    const out = process.env.CV_RENDER_OUT
    if (out) {
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, Buffer.from(res.doc.output('arraybuffer')))
    }
  })

  it('renders the modern template and every experience header style', () => {
    for (const template of ['harvard', 'modern'] as const)
      for (const experienceHeaderStyle of ['classic', 'role-company', 'one-line'] as const) {
        const res = renderCv({ ...options(normalize(sample)), template, experienceHeaderStyle })
        expect(res.ok).toBe(true)
      }
  })

  it('asks for the embedded Unicode font when text is not WinAnsi', () => {
    const cv = { ...normalize(sample), location: 'Thành phố Hồ Chí Minh' }
    const res = renderCv(options(cv))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.needsFonts).toBe('latin')
    expect(resolvePdfFont('times', '', 'English', 'Ho Chi Minh City • 07/2025 – Present').embed).toBeNull()
  })
})

describe('handoff', () => {
  it('parses an AI reply with chatter and a fenced block', () => {
    const reply = 'Here you go:\n```json\n{"cv":{"objective":"x"}}\n```\nQuestions: ...'
    const data = parseCvJsonText(reply)
    expect(data).toEqual({ cv: { objective: 'x' } })
    expect(inferMode(data)).toBe('merge')
    expect(inferMode(sample)).toBe('replace')
  })

  it('round-trips a compressed share link and a plain URI-encoded link', async () => {
    const link = await buildShareLink(sample)
    const hash = findHandoffLink(`Open this: ${link} then check`)
    expect(hash?.startsWith('#cv=z:')).toBe(true)
    const back = await readHandoffFromUrl(hash!)
    expect(back?.data).toEqual(sample)
    expect(back?.mode).toBe('replace')

    const plain = await readHandoffFromUrl('#cv=' + encodeURIComponent('{"cv":{"objective":"y"}}') + '&mode=merge')
    expect(plain?.data).toEqual({ cv: { objective: 'y' } })
    expect(plain?.mode).toBe('merge')

    const b64 = Buffer.from(JSON.stringify({ coverLetter: { greeting: 'Xin chào' } }), 'utf-8').toString('base64url')
    const fromB64 = await readHandoffFromUrl(`#cv=b64:${b64}`)
    expect(fromB64?.data).toEqual({ coverLetter: { greeting: 'Xin chào' } })
  })
})

const JD_FIXTURE = `Backend .NET Developer (Mid)
Requirements: 3+ years of experience with C# / ASP.NET Core and Entity Framework Core on SQL Server.
Strong knowledge of RabbitMQ or Azure Service Bus, Docker, CI/CD with Azure DevOps, unit tests with xUnit.
Nice to have: Redis, microservices, Angular, Dapper. Good English.`

describe('check parity (site vs skill script)', () => {
  const py = spawnSync('python', ['--version'])
  it.skipIf(py.status !== 0)('gives the same score and findings as cv_tool.py', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'cvcheck-'))
    const jdPath = resolve(dir, 'jd.txt')
    writeFileSync(jdPath, JD_FIXTURE, 'utf-8')
    const cvPath = resolve(root, 'public/sample.json')
    const r = spawnSync('python', ['-I', resolve(root, 'skills/cv-editor/scripts/cv_tool.py'), 'check', cvPath, '--jd', jdPath, '--json', '--pages', '1'], { encoding: 'utf-8' })
    const fromPy = JSON.parse(r.stdout)
    const raw = JSON.parse(readFileSync(cvPath, 'utf-8'))
    const fromTs = auditCv({
      cv: normalize(raw),
      disabledSections: raw.disabledSections,
      customSectionLabels: raw.customSectionLabels,
      bulletChars: raw.bulletChars,
      pageCount: 1,
      jobDescription: JD_FIXTURE,
    })
    expect(fromTs.findings.map((f) => f.id).sort()).toEqual(fromPy.findings.map((f: { id: string }) => f.id).sort())
    expect(fromTs.score).toBe(fromPy.score)
  })
})

describe('skill package', () => {
  it('keeps public/ai in sync with the skill references', () => {
    for (const [pub, src] of [
      ['public/ai/cv-writing-rules.md', 'skills/cv-editor/references/writing-rules.md'],
      ['public/ai/schema.json', 'skills/cv-editor/references/schema.json'],
    ] as const) {
      expect(readFileSync(resolve(root, pub), 'utf-8'), `${pub} is stale, run npm run skill`).toBe(
        readFileSync(resolve(root, src), 'utf-8'),
      )
    }
  })
})

describe('auditCv', () => {
  const base = {
    disabledSections: ['summary'] as SectionKey[],
    customSectionLabels: {},
    bulletChars: { l1: '•', l2: '◦', l3: '▪' },
    pageCount: 1,
  }

  it('flags uniform "Label:" bullets and buzzwords', () => {
    const cv = normalize(sample)
    cv.experiences = [cv.experiences[0]!]
    cv.projects = []
    cv.experiences[0]!.bullets = [
      'Platform: Leveraged robust tooling to build seamless flows for users.',
      'Backend: Built APIs for the content team using FastAPI and Redis.',
      'Frontend: Built React screens for the review flow of generated drafts.',
      'Ops: Built tooling for logs and token usage tracking in production.',
    ].map((text, i) => ({ id: `x${i}`, type: 'l1' as const, text }))
    const ids = auditCv({ ...base, cv }).findings.map((f) => f.id)
    expect(ids).toContain('slop-labels')
    expect(ids).toContain('slop-cliche')
  })

  it('reports missing contact details as a blocker', () => {
    const cv = { ...normalize(sample), email: '' }
    const r = auditCv({ ...base, cv })
    expect(r.findings[0]?.id).toBe('ats-contact')
    expect(r.findings[0]?.severity).toBe('blocker')
  })
})

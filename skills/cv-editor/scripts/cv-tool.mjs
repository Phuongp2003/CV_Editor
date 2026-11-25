#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { deflateRawSync, inflateRawSync } from 'node:zlib'

const SITE = 'https://cv-editor.fynx.io.vn'
const BULLET_TYPES = new Set(['header', 'l1', 'l2', 'l3'])
const SECTIONS = new Set(['summary', 'objective', 'skills', 'experience', 'projects', 'education', 'certificates'])
const STARTER = {
  cv: {
    name: '', email: '', phone: '', location: '', linkedin: '', linkedin_placeholder: '',
    github: '', github_placeholder: '', website: '', website_placeholder: '', objective: '', summary: '',
    experiences: [], projects: [], skills: [], educations: [], certificates: [],
    profileImage: null, profileImageType: null,
  },
  coverLetter: {
    header: {
      senderName: '', senderEmail: '', senderPhone: '', senderLocation: '', date: '', recipientName: '',
      recipientTitle: '', recipientEmail: '', companyName: '', companyAddress: '',
    },
    greeting: '', openingParagraph: '', bodyParagraphs: [''], closingParagraph: '', signOff: '',
  },
  template: 'harvard',
  language: 'English',
  sizeMultiplier: 1,
  selectedFont: 'times',
  customFontName: '',
  sectionsOrder: ['objective', 'education', 'experience', 'projects', 'skills', 'certificates', 'summary'],
  disabledSections: ['summary'],
  experienceHeaderStyle: 'classic',
  bulletChars: { l1: '•', l2: '◦', l3: '▪' },
  customSectionLabels: {},
  avatarStyle: { shape: 'rounded', position: 'left', size: 'md', fit: 'cover' },
}
const CLICHES = [
  'spearheaded', 'leveraged', 'utilized', 'orchestrated', 'robust', 'seamless', 'cutting-edge',
  'passionate', 'results-driven', 'detail-oriented', 'team player', 'fast learner', 'proven track record',
  'innovative', 'hands-on experience in', 'high-traffic', 'đam mê', 'năng động', 'tinh thần cầu tiến',
  'không ngừng học hỏi', 'môi trường chuyên nghiệp',
]
const WEAK_PHRASES = [
  'worked on', 'helped', 'assisted', 'responsible for', 'involved in', 'participated in', 'supported',
  'tham gia', 'hỗ trợ', 'phụ trách',
]
const TECH_TERMS = [
  'C#', '.NET', 'ASP.NET Core', 'Entity Framework', 'EF Core', 'SQL Server', 'MySQL', 'MariaDB',
  'PostgreSQL', 'MongoDB', 'Redis', 'RabbitMQ', 'Kafka', 'Azure Service Bus', 'Azure', 'AWS', 'GCP',
  'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Azure DevOps', 'xUnit', 'NUnit', 'unit test',
  'integration test', 'REST', 'GraphQL', 'gRPC', 'microservices', 'Angular', 'React', 'Vue', 'Next.js',
  'TypeScript', 'JavaScript', 'Node.js', 'Express', 'NestJS', 'Python', 'FastAPI', 'Django', 'Java',
  'Spring Boot', 'OAuth', 'JWT', 'Keycloak', 'Git', 'Agile', 'Scrum', 'Linux', 'Nginx', 'SOLID',
  'OOP', 'clean architecture', 'DDD', 'TDD', 'English', 'Japanese',
]

function usage() {
  return `CV Editor agent CLI (Node.js 20+, no packages)

Usage:
  node cv-tool.mjs init <output.json>
  node cv-tool.mjs decode <link-or-file> [-o output.json]
  node cv-tool.mjs validate <cv.json> [--json]
  node cv-tool.mjs check <cv.json> [--jd job.txt] [--pages N] [--json]
  node cv-tool.mjs text <cv.json>
  node cv-tool.mjs link <cv.json> [--merge] [--site URL]
  node cv-tool.mjs open <cv.json> [--merge] [--site URL]

The CLI handles CV data and a fast preflight. The app's Check panel and rendered page count are the
final layout and ATS checks.`
}

function fail(message, code = 1) {
  console.error(`Error: ${message}`)
  process.exit(code)
}

function option(args, name, fallback = undefined) {
  const index = args.indexOf(name)
  if (index < 0) return fallback
  if (index === args.length - 1 || args[index + 1].startsWith('--')) fail(`${name} needs a value`)
  return args[index + 1]
}

function cleanJsonText(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const text = (fenced?.[1] ?? raw).replace(/【[^】]*】/g, '').trim()
  if (text.startsWith('{')) return text
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text
}

function decodeLink(link) {
  const match = link.match(/#cv=([^\s)\]"'<>]+)/)
  if (!match) {
    if (/#cv-src=/.test(link)) fail('cv-src links require a network fetch; download the JSON first')
    fail('No #cv= payload found')
  }
  let encoded = match[1].replace(/&mode=merge$/, '')
  if (encoded.startsWith('z:')) {
    const packed = Buffer.from(encoded.slice(2), 'base64url')
    return JSON.parse(inflateRawSync(packed).toString('utf8'))
  }
  if (encoded.startsWith('b64:')) {
    return JSON.parse(Buffer.from(encoded.slice(4), 'base64url').toString('utf8'))
  }
  encoded = decodeURIComponent(encoded)
  return JSON.parse(cleanJsonText(encoded))
}

function parseInput(source) {
  const raw = existsSync(source) ? readFileSync(source, 'utf8') : source
  try {
    return raw.includes('#cv=') || raw.includes('#cv-src=') ? decodeLink(raw) : JSON.parse(cleanJsonText(raw))
  } catch (error) {
    fail(`cannot parse CV payload: ${error.message}`)
  }
}

function encodeLink(payload, site = SITE, merge = false) {
  const raw = Buffer.from(JSON.stringify(payload), 'utf8')
  const packed = deflateRawSync(raw, { level: 9 }).toString('base64url')
  return `${site.replace(/\/$/, '')}/#cv=z:${packed}${merge ? '&mode=merge' : ''}`
}

function cvOf(payload) {
  return payload.cv && typeof payload.cv === 'object' ? payload.cv : payload
}

function bulletsOf(cv) {
  const entries = [...(cv.experiences ?? []), ...(cv.projects ?? [])]
  return entries.flatMap((entry) => (entry.bullets ?? []).filter((bullet) => bullet.type !== 'header'))
}

function validate(payload) {
  const errors = []
  const warnings = []
  const add = (list, code, message, path = '') => list.push({ code, message, ...(path ? { path } : {}) })
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    add(errors, 'payload.type', 'Payload must be a JSON object.')
    return { ok: false, errors, warnings }
  }
  const cv = cvOf(payload)
  if (!cv || typeof cv !== 'object' || Array.isArray(cv)) {
    add(errors, 'cv.type', 'cv must be an object.', 'cv')
    return { ok: false, errors, warnings }
  }
  if (!String(cv.name ?? '').trim()) add(warnings, 'cv.name', 'Name is empty.', 'cv.name')
  if (cv.objective?.trim() && cv.summary?.trim()) {
    add(warnings, 'cv.intro', 'Use either objective or summary, then disable the other section.', 'cv')
  }
  for (const key of ['experiences', 'projects', 'skills', 'educations', 'certificates']) {
    if (cv[key] !== undefined && !Array.isArray(cv[key])) add(errors, `cv.${key}.type`, `${key} must be an array.`, `cv.${key}`)
  }
  const ids = new Set()
  for (const [group, entries] of [['experiences', cv.experiences ?? []], ['projects', cv.projects ?? []]]) {
    entries.forEach((entry, entryIndex) => {
      if (!Array.isArray(entry.bullets)) {
        add(errors, 'bullets.type', 'bullets must be an array.', `cv.${group}[${entryIndex}].bullets`)
        return
      }
      entry.bullets.forEach((bullet, bulletIndex) => {
        const path = `cv.${group}[${entryIndex}].bullets[${bulletIndex}]`
        if (!BULLET_TYPES.has(bullet.type)) add(errors, 'bullet.type', `Unknown bullet type: ${bullet.type}`, `${path}.type`)
        if (!String(bullet.text ?? '').trim()) add(warnings, 'bullet.empty', 'Empty bullet.', `${path}.text`)
        if (bullet.id) {
          if (ids.has(bullet.id)) add(warnings, 'bullet.id.duplicate', `Duplicate bullet id: ${bullet.id}`, `${path}.id`)
          ids.add(bullet.id)
        }
      })
    })
  }
  for (const key of ['sectionsOrder', 'disabledSections']) {
    if (!payload[key]) continue
    if (!Array.isArray(payload[key])) add(errors, `${key}.type`, `${key} must be an array.`, key)
    else payload[key].forEach((section, index) => {
      if (!SECTIONS.has(section)) add(errors, `${key}.section`, `Unknown section: ${section}`, `${key}[${index}]`)
    })
  }
  return { ok: errors.length === 0, errors, warnings }
}

function plain(text = '') {
  return String(text).replace(/<\/?u>/gi, '').replace(/[*_`]/g, '').trim()
}

function hasTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i').test(text)
}

function check(payload, { jd = '', pages = 0 } = {}) {
  const structural = validate(payload)
  const cv = cvOf(payload)
  const findings = structural.errors.map((item) => ({ severity: 'blocker', ...item }))
  findings.push(...structural.warnings.map((item) => ({ severity: 'minor', ...item })))
  const bullets = bulletsOf(cv).map((bullet) => plain(bullet.text)).filter(Boolean)
  const allText = JSON.stringify(cv)
  const lower = allText.toLowerCase()
  const clichés = CLICHES.filter((phrase) => lower.includes(phrase.toLowerCase()))
  if (clichés.length) findings.push({ severity: 'major', code: 'slop.cliche', message: `Generic phrases: ${clichés.join(', ')}` })
  const weak = bullets.filter((bullet) => WEAK_PHRASES.some((phrase) => bullet.toLowerCase().includes(phrase)))
  if (weak.length) findings.push({ severity: 'minor', code: 'evidence.weak', message: `${weak.length} bullet(s) use weak ownership language.` })
  const labels = bullets.filter((bullet) => /^[A-Z][A-Za-z0-9 &/+.\-]{2,40}:\s/.test(bullet))
  if (bullets.length >= 3 && labels.length / bullets.length >= 0.5) {
    findings.push({ severity: 'major', code: 'slop.labels', message: 'Half or more bullets start with a Label: pattern.' })
  }
  ;(cv.experiences ?? []).forEach((entry, index) => {
    const count = (entry.bullets ?? []).filter((bullet) => bullet.type !== 'header' && bullet.text?.trim()).length
    if (count === 0 || count > 6) findings.push({ severity: 'minor', code: 'experience.bullets', message: `${entry.company || entry.position || `Experience ${index + 1}`} has ${count} achievement bullets.` })
  })
  if (pages > 1) findings.push({ severity: 'major', code: 'layout.pages', message: `Rendered CV has ${pages} pages; early-career CVs usually read best at one page.` })

  const jdTerms = TECH_TERMS.filter((term) => hasTerm(jd, term))
  const evidenceText = bullets.join('\n')
  const skillsText = (cv.skills ?? []).map((skill) => `${skill.skill} ${skill.description}`).join('\n')
  const coverage = jdTerms.map((term) => ({
    term,
    status: hasTerm(evidenceText, term) ? 'proven' : hasTerm(skillsText, term) ? 'claimed' : 'absent',
  }))
  const absent = coverage.filter((item) => item.status === 'absent')
  if (absent.length) findings.push({ severity: 'major', code: 'jd.absent', message: `JD terms without CV evidence: ${absent.map((item) => item.term).join(', ')}` })

  const weights = { blocker: 25, major: 10, minor: 3 }
  const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + weights[finding.severity], 0))
  return {
    ok: structural.ok,
    score,
    findings,
    stats: { bullets: bullets.length, words: plain(allText).split(/\s+/).filter(Boolean).length, pages },
    jd: { terms: coverage.length, proven: coverage.filter((item) => item.status === 'proven').length, coverage },
    note: 'Fast agent preflight. Use the app Check panel and rendered page count for the final review.',
  }
}

function asText(payload) {
  const cv = cvOf(payload)
  const lines = [cv.name, [cv.location, cv.email, cv.phone, cv.github, cv.linkedin].filter(Boolean).join(' | ')]
  if (cv.objective) lines.push('\nOBJECTIVE', plain(cv.objective))
  if (cv.summary) lines.push('\nSUMMARY', plain(cv.summary))
  if (cv.experiences?.length) {
    lines.push('\nEXPERIENCE')
    for (const entry of cv.experiences) {
      lines.push(`${entry.company ?? ''} | ${entry.position ?? ''} | ${entry.dates ?? ''}`)
      for (const bullet of entry.bullets ?? []) lines.push(`${bullet.type === 'header' ? '' : '- '}${plain(bullet.text)}`)
    }
  }
  if (cv.projects?.length) {
    lines.push('\nPROJECTS')
    for (const project of cv.projects) {
      lines.push(`${project.projectName ?? ''}${project.projectLink ? ` | ${project.projectLink}` : ''}`)
      for (const bullet of project.bullets ?? []) lines.push(`${bullet.type === 'header' ? '' : '- '}${plain(bullet.text)}`)
    }
  }
  if (cv.educations?.length) {
    lines.push('\nEDUCATION')
    for (const item of cv.educations) lines.push([item.university, item.degree, item.graduationDate].filter(Boolean).join(' | '))
  }
  if (cv.skills?.length) {
    lines.push('\nSKILLS')
    for (const item of cv.skills) lines.push(`${item.skill}: ${item.description}`)
  }
  if (cv.certificates?.length) {
    lines.push('\nCERTIFICATES')
    for (const item of cv.certificates) lines.push([item.certName, item['issuer/description'], item.certDate].filter(Boolean).join(' | '))
  }
  return lines.filter((line) => line !== undefined).join('\n').trim()
}

function printCheck(result, json) {
  if (json) return console.log(JSON.stringify(result, null, 2))
  console.log(`Score: ${result.score}/100 | bullets: ${result.stats.bullets} | pages: ${result.stats.pages || 'unknown'}`)
  if (result.jd.terms) console.log(`JD: ${result.jd.proven}/${result.jd.terms} terms proven in bullets`)
  if (!result.findings.length) console.log('No preflight findings.')
  for (const finding of result.findings) console.log(`[${finding.severity}] ${finding.code}: ${finding.message}`)
  console.log(`\n${result.note}`)
}

function openUrl(url) {
  let child
  if (process.platform === 'win32') child = spawn('cmd.exe', ['/d', '/s', '/c', 'start', '""', `"${url}"`], { windowsHide: true, detached: true, stdio: 'ignore' })
  else if (process.platform === 'darwin') child = spawn('open', [url], { detached: true, stdio: 'ignore' })
  else child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' })
  child.unref()
}

const args = process.argv.slice(2)
const command = args.shift()
if (!command || ['-h', '--help', 'help'].includes(command)) {
  console.log(usage())
  process.exit(0)
}

if (command === 'init') {
  const output = args[0]
  if (!output) fail('init needs an output path')
  if (existsSync(output)) fail(`${output} already exists`)
  writeFileSync(output, `${JSON.stringify(STARTER, null, 2)}\n`, 'utf8')
  console.log(resolve(output))
} else if (command === 'decode') {
  if (!args[0]) fail('decode needs a link or file')
  const payload = parseInput(args[0])
  const output = option(args, '-o') ?? option(args, '--output')
  const json = `${JSON.stringify(payload, null, 2)}\n`
  if (output) writeFileSync(output, json, 'utf8')
  else process.stdout.write(json)
} else if (command === 'validate') {
  if (!args[0]) fail('validate needs a JSON file')
  const result = validate(parseInput(args[0]))
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(result.ok ? 'Valid CV Editor payload.' : 'Invalid CV Editor payload.')
    for (const item of [...result.errors, ...result.warnings]) console.log(`- ${item.code}: ${item.message}`)
  }
  process.exitCode = result.ok ? 0 : 1
} else if (command === 'check') {
  if (!args[0]) fail('check needs a JSON file')
  const jdPath = option(args, '--jd')
  const pages = Number(option(args, '--pages', 0)) || 0
  const result = check(parseInput(args[0]), { jd: jdPath ? readFileSync(jdPath, 'utf8') : '', pages })
  printCheck(result, args.includes('--json'))
  process.exitCode = result.ok ? 0 : 1
} else if (command === 'text') {
  if (!args[0]) fail('text needs a JSON file')
  console.log(asText(parseInput(args[0])))
} else if (command === 'link' || command === 'open') {
  if (!args[0]) fail(`${command} needs a JSON file`)
  const url = encodeLink(parseInput(args[0]), option(args, '--site', SITE), args.includes('--merge'))
  if (command === 'open') openUrl(url)
  console.log(url)
} else {
  fail(`unknown command: ${command}\n\n${usage()}`)
}

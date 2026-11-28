// Packages skills/cv-editor as public/cv-editor-skill.zip and mirrors its references into public/ai/
// Structure conforms to universal plugin standard (.codex-plugin, .claude-plugin, and skills/*/SKILL.md)
// Compatible with Antigravity, Codex, Claude Code, and Claude Desktop plugins.
// Run: node scripts/build-skill.mjs   (also runs before `npm run build`)
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, relative, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync, strToU8 } from 'fflate'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = join(root, 'skills', 'cv-editor')
const writerSkillNames = ['cv-writer', 'cv-slop-review', 'cv-domain-se', 'cv-domain-qa-automation', 'cv-domain-industrial-automation']
const pub = join(root, 'public')

mkdirSync(join(pub, 'ai'), { recursive: true })
copyFileSync(join(root, 'skills', 'cv-writer', 'references', 'content.md'), join(pub, 'ai', 'cv-writing-rules.md'))
copyFileSync(join(root, 'skills', 'cv-writer', 'references', 'content.schema.json'), join(pub, 'ai', 'schema.json'))
copyFileSync(join(root, 'skills', 'cv-writer', 'references', 'config.schema.json'), join(pub, 'ai', 'config.schema.json'))

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (name === '__pycache__' || name.startsWith('.')) return []
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const fixedDate = new Date('2026-01-01T00:00:00Z')
const files = {}

// 1. Standard skills/*/SKILL.md hierarchy (required by Antigravity / Codex / Claude Desktop)
for (const file of walk(skillDir)) {
  const rel = relative(skillDir, file).split(sep).join('/')
  files[`skills/cv-editor/${rel}`] = [readFileSync(file), { mtime: fixedDate }]
}

// 2. .codex-plugin/plugin.json manifest
const codexPlugin = {
  name: 'cv-editor',
  version: '1.1.0',
  description: 'Write, rewrite or tailor a one-page Harvard-style CV for CV Editor (cv-editor.fynx.io.vn) with ATS and AI-slop validation.',
  author: {
    name: 'Pham Bui Nam Phuong',
    email: 'phambuinamphuong@gmail.com'
  },
  skills: './skills/',
  interface: {
    displayName: 'CV Editor',
    shortDescription: 'Write and tailor Harvard-style CVs with ATS & slop checking.',
    longDescription: 'Write, rewrite or tailor a one-page Harvard-style CV for CV Editor (cv-editor.fynx.io.vn) with ATS and AI-slop validation.',
    developerName: 'Pham Bui Nam Phuong',
    category: 'Productivity',
    capabilities: ['skills'],
    defaultPrompt: []
  }
}
files['.codex-plugin/plugin.json'] = [strToU8(JSON.stringify(codexPlugin, null, 2)), { mtime: fixedDate }]

// 3. .claude-plugin/plugin.json manifest
const claudePlugin = {
  name: 'cv-editor',
  version: '1.1.0',
  description: 'Write, rewrite or tailor a one-page Harvard-style CV for CV Editor (cv-editor.fynx.io.vn) with ATS and AI-slop validation.',
  author: {
    name: 'Pham Bui Nam Phuong',
    email: 'phambuinamphuong@gmail.com'
  }
}
files['.claude-plugin/plugin.json'] = [strToU8(JSON.stringify(claudePlugin, null, 2)), { mtime: fixedDate }]

const zip = zipSync(files, { level: 9 })
writeFileSync(join(pub, 'cv-editor-skill.zip'), zip)
console.log(`cv-editor-skill.zip: ${Object.keys(files).length} files, ${(zip.length / 1024).toFixed(1)} KB`)

const writerFiles = {}
for (const name of writerSkillNames) {
  for (const file of walk(join(root, 'skills', name))) {
    const rel = relative(join(root, 'skills', name), file).split(sep).join('/')
    writerFiles[`${name}/${rel}`] = [readFileSync(file), { mtime: fixedDate }]
  }
}
const writerZip = zipSync(writerFiles, { level: 9 })
writeFileSync(join(pub, 'fynx-cv-writer-skill.zip'), writerZip)
console.log(`fynx-cv-writer-skill.zip: ${Object.keys(writerFiles).length} files, ${(writerZip.length / 1024).toFixed(1)} KB`)

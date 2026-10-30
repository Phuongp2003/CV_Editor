// Packages skills/cv-editor as public/cv-editor-skill.zip and mirrors its references into public/ai/
// so web agents (llms.txt) and skill users read the same rules. Source of truth: skills/cv-editor/.
// Run: node scripts/build-skill.mjs   (also runs before `npm run build`)
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, relative, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = join(root, 'skills', 'cv-editor')
const pub = join(root, 'public')

mkdirSync(join(pub, 'ai'), { recursive: true })
copyFileSync(join(skillDir, 'references', 'writing-rules.md'), join(pub, 'ai', 'cv-writing-rules.md'))
copyFileSync(join(skillDir, 'references', 'schema.json'), join(pub, 'ai', 'schema.json'))

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (name === '__pycache__' || name.startsWith('.')) return []
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

// Zip entries live under "cv-editor/" so the archive unpacks to a ready skill folder.
const files = {}
for (const file of walk(skillDir)) {
  const rel = relative(skillDir, file).split(sep).join('/')
  files[`cv-editor/${rel}`] = [readFileSync(file), { mtime: new Date('2026-01-01T00:00:00Z') }]
}
const zip = zipSync(files, { level: 9 })
writeFileSync(join(pub, 'cv-editor-skill.zip'), zip)
console.log(`cv-editor-skill.zip: ${Object.keys(files).length} files, ${(zip.length / 1024).toFixed(1)} KB`)

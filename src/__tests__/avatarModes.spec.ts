import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import { renderCv } from '@/utils/pdf/renderCv'
import { CV_LANGUAGE_SECTION_LABELS, type AvatarStyle, type CVData, type SectionKey } from '@/types/cv'

const root = resolve(__dirname, '../..')
const sample = JSON.parse(readFileSync(resolve(root, 'public/sample.json'), 'utf-8'))
const tiny =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mP8z8DwnwEIGGEAAB3cAv8Wfm6pAAAAAElFTkSuQmCC'

function cvWith(image: string): CVData {
  const b = (arr: any[]) => arr.map((x, i) => ({ id: `b${i}`, type: x.type || 'l1', text: x.text || '' }))
  return {
    ...sample.cv,
    profileImage: image,
    profileImageType: image.slice(5, image.indexOf(';')),
    experiences: sample.cv.experiences.map((e: any) => ({ ...e, bullets: b(e.bullets) })),
    projects: sample.cv.projects.map((p: any) => ({ ...p, bullets: b(p.bullets) })),
  }
}

function render(image: string, avatarStyle: AvatarStyle) {
  return renderCv({
    cv: cvWith(image),
    template: 'harvard',
    language: 'English',
    sizeMultiplier: 1,
    selectedFont: 'times',
    customFontName: '',
    sectionsOrder: sample.sectionsOrder,
    disabledSections: sample.disabledSections,
    bulletChars: { l1: '•', l2: '◦', l3: '▪' },
    experienceHeaderStyle: 'classic',
    sectionLabels: CV_LANGUAGE_SECTION_LABELS.English as Record<SectionKey, string>,
    avatarStyle,
  })
}

const SHAPES: AvatarStyle['shape'][] = ['square', 'rounded', 'circle']
const POSITIONS: AvatarStyle['position'][] = ['left', 'center', 'right']

describe('avatar modes', () => {
  it('renders every shape x position x size with a non-square image', () => {
    for (const shape of SHAPES)
      for (const position of POSITIONS)
        for (const size of ['sm', 'md', 'lg'] as const)
          for (const fit of ['cover', 'contain'] as const) {
            const res = render(tiny, { shape, position, size, fit })
            expect(res.ok).toBe(true)
          }
  })

  // Visual check against real images: AVATAR_DIR=<folder> AVATAR_OUT=<folder> npx vitest run avatarModes
  it.skipIf(!process.env.AVATAR_DIR)('renders real images for a visual contact sheet', () => {
    const dir = process.env.AVATAR_DIR as string
    const out = process.env.AVATAR_OUT as string
    mkdirSync(out, { recursive: true })
    const picks = (process.env.AVATAR_FILES || '').split(',').filter(Boolean)
    const files = picks.length ? picks : readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).slice(0, 6)
    let n = 0
    POSITIONS.forEach((position, pi) =>
      SHAPES.forEach((shape, si) =>
        (['cover', 'contain'] as const).forEach((fit) => {
          const file = files[(pi * 3 + si) % files.length] as string
          const mime = extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'
          const img = `data:${mime};base64,${readFileSync(resolve(dir, file)).toString('base64')}`
          const res = render(img, { shape, position, size: (['sm', 'md', 'lg'] as const)[pi]!, fit })
          expect(res.ok).toBe(true)
          if (res.ok) {
            writeFileSync(resolve(out, `${position}-${shape}-${fit}.pdf`), Buffer.from(res.doc.output('arraybuffer')))
            n++
          }
        }),
      ),
    )
    expect(n).toBe(18)
  })
})

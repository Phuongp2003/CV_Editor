/**
 * Turns any browser-decodable image (JPEG, PNG with transparency, WebP, GIF, AVIF, huge phone shots)
 * into a small JPEG data URL that jsPDF and Word both accept. Aspect ratio is kept; cropping to the
 * chosen shape happens at render time, so the user can switch shape/fit without re-uploading.
 */
export const MAX_AVATAR_INPUT_BYTES = 20 * 1024 * 1024
const MAX_EDGE = 800

export class AvatarError extends Error {
  constructor(public code: 'not_image' | 'too_large' | 'decode_failed') {
    super(code)
  }
}

async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall back to <img>, which some browsers decode more formats with */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight })
  } catch {
    throw new AvatarError('decode_failed')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function normalizeAvatar(file: File): Promise<{ dataUrl: string; mime: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new AvatarError('not_image')
  if (file.size > MAX_AVATAR_INPUT_BYTES) throw new AvatarError('too_large')
  const src = await decode(file)
  const k = Math.min(1, MAX_EDGE / Math.max(src.width, src.height))
  const w = Math.max(1, Math.round(src.width * k))
  const h = Math.max(1, Math.round(src.height * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AvatarError('decode_failed')
  // Transparent PNG/WebP/GIF stickers sit on the white page, so flatten onto white.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(src, 0, 0, w, h)
  if ('close' in src && typeof src.close === 'function') src.close()
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), mime: 'image/jpeg', width: w, height: h }
}

export const AVATAR_SIZES = { sm: 56, md: 72, lg: 90 } as const

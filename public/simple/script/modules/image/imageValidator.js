const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageMeta(file) {
  const type = file?.type || '';
  const size = Number(file?.size || 0);

  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    return {
      ok: false,
      reason: 'UNSUPPORTED_TYPE',
      allowedTypes: [...ALLOWED_IMAGE_TYPES],
      actualType: type || null,
    };
  }

  if (size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      reason: 'FILE_TOO_LARGE',
      maxBytes: MAX_IMAGE_BYTES,
      actualBytes: size,
    };
  }

  return { ok: true };
}

export { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES };

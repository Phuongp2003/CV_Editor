export function buildTypographyScale({
  baseBodySize = 10,
  sizeMultiplier = 1,
  baseTitleSize = 14,
  baseLineHeight = 16,
  baseSectionGap = 5,
  fontFamily = 'NotoSans',
} = {}) {
  const parsedMultiplier = Number(sizeMultiplier);
  const safeMultiplier = Number.isFinite(parsedMultiplier)
    ? parsedMultiplier
    : 1;
  const multiplier = Math.min(1.6, Math.max(0.8, safeMultiplier));

  const bodyBase = Number(baseBodySize) || 10;
  const titleBase = Number(baseTitleSize) || 14;
  const lineHeightBase = Number(baseLineHeight) || 16;
  const sectionGapBase = Number(baseSectionGap) || 5;
  const normalizedFontFamily =
    typeof fontFamily === 'string' ? fontFamily.trim() : '';

  return {
    body: Math.max(10, Math.round(bodyBase * multiplier)),
    title: Math.round(titleBase * multiplier),
    lineHeight: Math.max(15, Math.round(lineHeightBase * multiplier)),
    sectionGap: Math.max(5, Math.round(sectionGapBase * multiplier)),
    multiplier,
    fontFamily: normalizedFontFamily || 'NotoSans',
  };
}

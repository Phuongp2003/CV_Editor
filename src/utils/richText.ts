/**
 * Represents a segment of text parsed with formatting styles.
 *
 * @public
 */
export interface TextSegment {
  /** The string content of the segment. */
  text: string
  /** If true, the segment is formatted as bold. */
  bold: boolean
  /** If true, the segment is formatted as italic. */
  italic: boolean
  /** If true, the segment is formatted with an underline. */
  underline: boolean
}

/**
 * Normalizes a URL by ensuring it contains an HTTP/HTTPS protocol prefix.
 *
 * @remarks
 * If the input URL is empty or undefined, an empty string is returned.
 * If it does not start with 'http://' or 'https://', 'https://' is prepended.
 *
 * @param url - The raw URL string.
 * @returns The normalized URL string with the protocol prefix.
 *
 * @example
 * ```ts
 * cleanUrl("github.com/username"); // returns "https://github.com/username"
 * cleanUrl("http://localhost");    // returns "http://localhost"
 * ```
 */
export function cleanUrl(url: string): string {
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url
  }
  return url
}

/**
 * Parses a simple markdown-formatted string into structured text segments.
 *
 * @remarks
 * Supports the following syntax elements:
 * - `***bolditalic***` -> Bold and Italicized text segments.
 * - `**bold**` -> Bold text segments.
 * - `*italic*` or `_italic_` -> Italicized text segments.
 * - `<u>underline</u>` -> Underlined text segments.
 *
 * @param text - The raw string to parse.
 * @returns An array of {@link TextSegment} objects with formatting flags.
 *
 * @example
 * ```ts
 * parseRichText("Hello **world**!");
 * // Returns:
 * // [
 * //   { text: "Hello ", bold: false, italic: false, underline: false },
 * //   { text: "world", bold: true, italic: false, underline: false },
 * //   { text: "!", bold: false, italic: false, underline: false }
 * // ]
 * ```
 */
export function parseRichText(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let currentText = ''
  let isBold = false
  let isItalic = false
  let isUnderline = false

  let i = 0
  while (i < text.length) {
    if (text.startsWith('***', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isBold = !isBold
      isItalic = !isItalic
      i += 3
    } else if (text.startsWith('**', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isBold = !isBold
      i += 2
    } else if (text.startsWith('<u>', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isUnderline = true
      i += 3
    } else if (text.startsWith('</u>', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isUnderline = false
      i += 4
    } else if (text.startsWith('*', i) || text.startsWith('_', i)) {
      if (currentText) {
        segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
        currentText = ''
      }
      isItalic = !isItalic
      i += 1
    } else {
      currentText += text[i]
      i += 1
    }
  }
  if (currentText) {
    segments.push({ text: currentText, bold: isBold, italic: isItalic, underline: isUnderline })
  }
  return segments
}

/**
 * Converts a markdown-like formatted string into clean plain text (removes bold/underline markdown markers).
 *
 * @param text - The raw string to clean.
 * @returns Clean plain text.
 * @public
 */
export function renderToPlainText(text: string): string {
  const segments = parseRichText(text)
  return segments.map((seg) => seg.text).join('')
}

/**
 * Converts a markdown-like formatted string into HTML (strong, em, u tags).
 *
 * @param text - The raw string to format.
 * @returns HTML string.
 * @public
 */
export function renderToHtml(text: string): string {
  const segments = parseRichText(text)
  return segments
    .map((seg) => {
      let tagStart = ''
      let tagEnd = ''
      if (seg.bold) {
        tagStart += '<strong>'
        tagEnd = '</strong>' + tagEnd
      }
      if (seg.italic) {
        tagStart += '<em>'
        tagEnd = '</em>' + tagEnd
      }
      if (seg.underline) {
        tagStart += '<u>'
        tagEnd = '</u>' + tagEnd
      }
      return tagStart + seg.text + tagEnd
    })
    .join('')
}


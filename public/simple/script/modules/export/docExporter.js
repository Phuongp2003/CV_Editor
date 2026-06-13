import { buildDocSections } from './docxExporter.js';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function maybeLine(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function pickSocialValue(url, placeholder) {
  return maybeLine(placeholder) || maybeLine(url);
}

export function exportDoc({ cv = {}, labels = {} }) {
  const sections = buildDocSections({ cv, labels });
  const html = [];

  html.push('<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;line-height:1.35;">');
  if (maybeLine(cv.name)) html.push(`<h1 style="margin:0 0 8px 0;">${escapeHtml(cv.name)}</h1>`);
  const contact = [cv.location, cv.email, cv.phone].filter(Boolean).join(' | ');
  if (maybeLine(contact)) html.push(`<p style="margin:0 0 4px 0;">${escapeHtml(contact)}</p>`);
  const socialContact = [
    pickSocialValue(cv.github, cv.github_placeholder),
    pickSocialValue(cv.website, cv.website_placeholder),
    pickSocialValue(cv.linkedin, cv.linkedin_placeholder),
  ]
    .filter(Boolean)
    .join(' | ');
  if (maybeLine(socialContact)) html.push(`<p style="margin:0 0 12px 0;">${escapeHtml(socialContact)}</p>`);

  sections.forEach((section) => {
    const lines = section.items
      .flatMap((item) =>
        String(item)
          .split('\n')
          .map((line) => maybeLine(line))
      )
      .filter(Boolean);
    if (!lines.length) return;
    html.push(`<h2 style="margin:12px 0 6px 0;">${escapeHtml(section.title)}</h2>`);
    html.push('<ul style="margin:0 0 8px 18px;padding:0;">');
    lines.forEach((line) => html.push(`<li>${escapeHtml(line)}</li>`));
    html.push('</ul>');
  });

  html.push('</body></html>');
  return new Blob([html.join('')], { type: 'application/msword;charset=utf-8' });
}

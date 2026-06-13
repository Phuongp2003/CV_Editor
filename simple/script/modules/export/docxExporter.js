import { Document, Packer, Paragraph, TextRun } from '../../../libs/docx.js';

const DEFAULT_LABELS = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  certificates: 'Certificates',
};

function normalizeLabels(labels = {}) {
  return { ...DEFAULT_LABELS, ...(labels || {}) };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function pickSocialValue(url, placeholder) {
  if (hasValue(placeholder)) return String(placeholder).trim();
  if (hasValue(url)) return String(url).trim();
  return '';
}

function buildSocialContactLine(cv = {}) {
  return [
    pickSocialValue(cv.github, cv.github_placeholder),
    pickSocialValue(cv.website, cv.website_placeholder),
    pickSocialValue(cv.linkedin, cv.linkedin_placeholder),
  ]
    .filter(Boolean)
    .join(' | ');
}

function extractBulletLines(bullets) {
  if (!bullets) return [];
  if (typeof bullets === 'string') {
    return bullets
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const lines = [];
  if (hasValue(bullets.description)) lines.push(String(bullets.description).trim());
  safeArray(bullets.items).forEach((item) => {
    if (hasValue(item)) lines.push(String(item).replace(/^[-+]\s*/, '').trim());
  });
  return lines;
}

export function buildDocSections({ cv = {}, labels = {} }) {
  const resolvedLabels = normalizeLabels(labels);
  const sections = [];

  if (hasValue(cv.summary)) {
    sections.push({
      key: 'summary',
      title: resolvedLabels.summary,
      items: [String(cv.summary).trim()],
    });
  }

  const skills = safeArray(cv.skills)
    .map((entry) => {
      const skill = typeof entry?.skill === 'string' ? entry.skill.trim() : '';
      const description =
        typeof entry?.description === 'string' ? entry.description.trim() : '';
      if (skill && description) return `${skill}: ${description}`;
      return skill || description;
    })
    .filter(Boolean);
  if (skills.length) {
    sections.push({ key: 'skills', title: resolvedLabels.skills, items: skills });
  }

  const experiences = safeArray(cv.experiences)
    .map((entry) => {
      const header = [entry?.position || '', entry?.company || '', entry?.dates || ''].filter(Boolean).join(' - ').trim();
      const bullets = extractBulletLines(entry?.bullets);
      return [header, ...bullets].filter(Boolean).join('\n');
    })
    .filter(Boolean);
  if (experiences.length) {
    sections.push({ key: 'experience', title: resolvedLabels.experience, items: experiences });
  }

  const projects = safeArray(cv.projects)
    .map((entry) => {
      const header = [entry?.projectName || '', entry?.projectLink || ''].filter(Boolean).join(' - ').trim();
      const bullets = extractBulletLines(entry?.bullets);
      return [header, ...bullets].filter(Boolean).join('\n');
    })
    .filter(Boolean);
  if (projects.length) {
    sections.push({ key: 'projects', title: resolvedLabels.projects, items: projects });
  }

  const educations = safeArray(cv.educations)
    .map((entry) =>
      [entry?.university || '', entry?.degree || '', entry?.gpa || '', entry?.graduationDate || '']
        .filter(Boolean)
        .join(' - ')
        .trim()
    )
    .filter(Boolean);
  if (educations.length) {
    sections.push({ key: 'education', title: resolvedLabels.education, items: educations });
  }

  const certificates = safeArray(cv.certificates)
    .map((entry) => [entry?.certName || '', entry?.['issuer/description'] || '', entry?.certDate || ''].filter(Boolean).join(' - ').trim())
    .filter(Boolean);
  if (certificates.length) {
    sections.push({ key: 'certificates', title: resolvedLabels.certificates, items: certificates });
  }

  return sections;
}

export async function exportDocx({ cv = {}, labels = {}, typography = {} }) {
  const sections = buildDocSections({ cv, labels });
  const bodySize = Number(typography.body) > 0 ? Number(typography.body) * 2 : 20;
  const contactInfoSize = Math.max(16, Math.round(bodySize * 0.9));
  const titleSize = Number(typography.title) > 0 ? Number(typography.title) * 2 : 28;

  const children = [];
  if (hasValue(cv.name)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: String(cv.name).trim(), bold: true, size: titleSize + 4 })],
      })
    );
  }

  const contact = [cv.location, cv.email, cv.phone].filter(Boolean).join(' | ');
  if (hasValue(contact)) {
    children.push(new Paragraph({ children: [new TextRun({ text: contact, size: contactInfoSize })] }));
  }
  const socialContact = buildSocialContactLine(cv);
  if (hasValue(socialContact)) {
    children.push(new Paragraph({ children: [new TextRun({ text: socialContact, size: contactInfoSize })] }));
  }

  sections.forEach((section) => {
    children.push(new Paragraph({}));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.title, bold: true, size: titleSize })],
      })
    );
    section.items.forEach((item) => {
      String(item)
        .split('\n')
        .forEach((line) => {
          if (!line.trim()) return;
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line.trim(), size: bodySize })],
            })
          );
        });
    });
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

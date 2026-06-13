const LANGUAGE_LABELS = {
  English: {
    summary: 'Summary',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    certificates: 'Certificates',
  },
  Vietnamese: {
    summary: 'Tóm tắt',
    skills: 'Kỹ năng',
    experience: 'Kinh nghiệm',
    projects: 'Dự án',
    education: 'Học vấn',
    certificates: 'Chứng chỉ',
  },
};

const FALLBACK_LANGUAGE = 'English';

function normalizeCustomLabels(customLabels = {}) {
  const out = {};
  Object.keys(customLabels || {}).forEach((key) => {
    const value = customLabels[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  });
  return out;
}

export function resolveSectionLabels({ language = FALLBACK_LANGUAGE, customLabels = {} } = {}) {
  const base = LANGUAGE_LABELS[language] || LANGUAGE_LABELS[FALLBACK_LANGUAGE];
  return { ...base, ...normalizeCustomLabels(customLabels) };
}

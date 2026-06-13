const ARRAY_FIELDS = [
  'experiences',
  'projects',
  'skills',
  'educations',
  'certificates',
];

const DEFAULT_CV = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
  summary: '',
  experiences: [],
  projects: [],
  skills: [],
  educations: [],
  certificates: [],
};

function cloneCv(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultCv() {
  return cloneCv(DEFAULT_CV);
}

export function normalizeCv(input = {}) {
  const normalizedInput = input && typeof input === 'object' ? input : {};
  const merged = {
    ...createDefaultCv(),
    ...normalizedInput,
  };

  ARRAY_FIELDS.forEach((field) => {
    if (!Array.isArray(merged[field])) {
      merged[field] = [];
    }
  });

  return merged;
}

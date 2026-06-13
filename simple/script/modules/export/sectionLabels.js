import { resolveSectionLabels } from '../presets/presetService.js';

let currentLanguage = 'English';
let customSectionLabels = {};

export function setSectionLabelLanguage(language) {
  currentLanguage = language || 'English';
}

export function setCustomSectionLabels(labels = {}) {
  customSectionLabels = { ...(labels || {}) };
}

export function getCustomSectionLabels() {
  return { ...customSectionLabels };
}

export function getSectionLabels() {
  return resolveSectionLabels({
    language: currentLanguage,
    customLabels: customSectionLabels,
  });
}

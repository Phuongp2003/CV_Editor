import {
  handleImageUpload,
  removeProfileImage,
  addImageToPDF,
  getImageBottomPosition,
  loadImageFromData,
  getImageData,
  initializeImageHandler,
  hasImage,
} from './imageHandler.js';

import {
  initializeProfileHandler,
  saveProfileToStorage,
  loadProfile,
  mapObject_profile,
  mapObject_cv,
	deleteProfile,
} from './personalProfileHandler.js';

import { initializeI18n } from './i18n.js';
import { normalizeCv } from './modules/core/cvModel.js';
import { resolveAssetUrl } from './modules/core/assetBase.js';
import { buildTypographyScale } from './modules/typography/typographyModel.js';
import {
  getSectionLabels,
  setCustomSectionLabels,
  setSectionLabelLanguage,
} from './modules/export/sectionLabels.js';
import { exportDocx } from './modules/export/docxExporter.js';
import { exportDoc } from './modules/export/docExporter.js';
import { closeModal, openModal, setModalContent } from './modules/helpers/modalHelper.js';
import { resolveSectionLabels } from './modules/presets/presetService.js';

const maxCharacters = 260; // limit the number of characters (currently unused)
let inputEle = null; // will be resolved after DOM is ready
const promptTemplate = `You are a CV structuring assistant. Generate both a tailored CV and a cover letter in response to a job description and (optional) user-provided information.

## Goal Statement
The output must:
- Be in JSON format matching the schema below
- Use natural, real-life phrasing and tone appropriate for professional job applications
- In the summary/overview section, you must NOT use generic phrases such as "aspiring", "passionate", "motivated", or any similar non-specific terms.
- Translate all fields into the specified language—except if the specified language is English (case-insensitive), in which case the output must remain fully in English

The cover letter should:
- Be role-specific and company-aware
- Highlight relevant experience, skills, and achievements aligned with the job description
- Follow standard cover letter structure: header, greeting, intro, body, closing, and sign-off
- Sound authentic, enthusiastic, and tailored to the job
- Keep the letter under 350 words

## Return Format
Return a single JSON object with the following structure. Every text field must be in the requested language (unless the language is English—then keep in English):

\`\`\`json
{
  "cv": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "github": "string",
    "website": "string",
    "summary": "string",
    "experiences": [
      {
        "position": "string",
        "company": "string",
        "location": "string",
        "dates": "string",
        "bullets": {
          "description": "short header line for this job (optional, no bullet)",
          "items": [
            "- first level bullet line (prefix with -)",
            "+ second level bullet line (prefix with +)"
          ]
        }
      }
    ],
    "educations": [
      {
        "university": "string",
        "degree": "string",
        "gpa": "string",
        "graduationDate": "string"
      }
    ],
    "projects": [
      {
        "projectName": "string",
        "projectLink": "string",
        "bullets": {
          "description": "short header line for this project (optional, no bullet)",
          "items": [
            "- first level bullet line (prefix with -)",
            "+ second level bullet line (prefix with +)"
          ]
        }
      }
    ],
    "skills": [
      {
        "skill": "skill name",
        "description": "short description"
      }
    ],
    "certificates": [
      {
        "certName": "string",
        "issuer/description": "string",
        "certDate": "string"
      }
    ]
  },
  "coverLetter": {
    "header": {
      "name": "string",
      "email": "string",
      "phone": "string",
      "location": "string",
      "date": "string",
      "recipientName": "string",
      "recipientTitle": "string",
      "companyName": "string",
      "companyAddress": "string"
    },
    "greeting": "string",
    "openingParagraph": "string",
    "bodyParagraphs": ["string", "string"],
    "closingParagraph": "string",
    "signOff": "string"
  }
}
\`\`\`

## Guidelines

**Summary Section:**
- Only include if you have relevant information that directly relates to the job description.
- Do NOT use generic or boilerplate language (e.g., "passionate", "aspiring").
- Provide a concise summary that highlights skills or background in direct relation to the job.
- Integrate keywords from the job description naturally.

**Experiences Section:**
- Each experience should show position, company, location, employment dates, and bullet points.
- Start each bullet point with a past-tense action verb.
- Present timeline and technologies clearly.
- For bullets: use "description" for a short header (no bullet), and "items" array for bullet points with "-" (level 1) and "+" (level 2) prefixes.

**Projects:**
- Include projects that are relevant to the job.
- Only list real and significant projects.
- Avoid trivial or tutorial-based ones.
- For bullets: use "description" for a concise summary (no bullet), and "items" array for specific bullet points.

**Skills:**
- Highlight only relevant skills for the job.
- Do not list every technology ever used.
- Format clearly, and group related skills where applicable.

**Educations:**
- List educational background clearly.
- Omit GPA if weak or not provided.

**Certificates:**
- List all related certificates (all language-related certificates must be listed, e.g., IELTS, TOEIC).
- Omit the certificate date if not provided.

**Language:**
- Generate the CV and cover letter in the language specified.
- If the language is not specified, default to English.
- If the specified language is "english", DO NOT translate—keep the content fully in English.

## IMPORTANT Requirements
- Only respond with **one** JSON code block exactly as above (no explanations).
- Keep the property names exactly as shown.
- Use "#" for header (description field), "-" for level 1 bullets, and "+" for level 2 bullets in the items array.
- Do NOT add any citation markers like [cite], [^1], [source], [cite_start], or [cite: X]; just plain JSON.
- Use strong, past-tense action verbs in experience bullets.
- Do not use generic phrases like "To whom it may concern" in cover letters.
`;

// Helper to clean JSON text from AI tools (remove ``` fences and [cite] markers)
function preprocessJsonText(raw) {
	let cleaned = raw.trim();

	// Strip ``` fences if present
	if (cleaned.startsWith('```')) {
		const end = cleaned.lastIndexOf('```');
		if (end > 3) {
			cleaned = cleaned.slice(cleaned.indexOf('\n') + 1, end).trim();
		}
	}

	// Remove [cite_start] markers
	cleaned = cleaned.replace(/\[cite_start\]/g, '');
	// Remove [cite: ...] markers
	cleaned = cleaned.replace(/\[cite:[^\]]*\]/g, '');

	return cleaned;
}
const cover_letter = document.getElementById('Cover-letter');
const languageSelect = document.getElementById('language'); // CV content language
const uiLanguageSelect = document.getElementById('ui-language'); // UI display language
const presetConfigBtn = document.getElementById('preset-config-btn');
const presetModalId = 'preset-config-modal';

let CV_obj = normalizeCv();

let CoverLetter_Obj = {
  header: {
		name: '',
		email: '',
		phone: '',
		location: '',
		date: '',
		recipientName: '',
		recipientTitle: '',
		companyName: '',
		companyAddress: '',
  },
	greeting: '',
	openingParagraph: '',
  bodyParagraphs: [],
	closingParagraph: '',
	signOff: '',
};

const iconHref = resolveAssetUrl({
  pathname: window.location.pathname,
  assetPath: 'assets/icon.svg',
});
const iconLink = document.querySelector('link[rel="icon"]');
if (iconLink) {
  iconLink.setAttribute('href', iconHref);
}

function limitCharacters(input) {
  if (input.value.length > maxCharacters) {
    input.value = input.value.slice(0, maxCharacters);
  }
}

function PersonalInfo() {
  const data = [];
	if (document.getElementById('location').value)
		data.push(document.getElementById('location').value);
	if (document.getElementById('email').value)
		data.push(document.getElementById('email').value);
	if (document.getElementById('linkedin').value)
		data.push(document.getElementById('linkedin').value);
	return data.join(' | ');
}

function PersonalInfo2() {
  const data = [];
	if (document.getElementById('github').value)
		data.push(document.getElementById('github').value);
	if (document.getElementById('website').value)
		data.push(document.getElementById('website').value);
	return data.join(' | ');
}

// Helper functions for PDF generation using object data
function getPersonalInfoFromObj(obj) {
  const data = [];
  if (obj.location) data.push(obj.location);
  if (obj.email) data.push(obj.email);
  if (obj.phone) data.push(obj.phone);
	return data.join(' | ');
}

function getPersonalInfo2FromObj(obj) {
  const data = [];
  if (obj.github || obj.github_placeholder) {
    if (obj.github_placeholder) {
      data.push(obj.github_placeholder);
    } else if (obj.github) {
      data.push(obj.github);
    }
  }
  if (obj.website || obj.website_placeholder) {
    if (obj.website_placeholder) {
      data.push(obj.website_placeholder);
    } else if (obj.website) {
      data.push(obj.website);
    }
  }
  if (obj.linkedin || obj.linkedin_placeholder) {
    if (obj.linkedin_placeholder) {
      data.push(obj.linkedin_placeholder);
    } else if (obj.linkedin) {
      data.push(obj.linkedin);
    }
  }
	return data.join(' | ');
}

const SECTION_LABEL_FIELDS = [
  { key: 'summary', title: 'Summary' },
  { key: 'skills', title: 'Skills' },
  { key: 'experience', title: 'Experience' },
  { key: 'projects', title: 'Projects' },
  { key: 'education', title: 'Education' },
  { key: 'certificates', title: 'Certificates' },
];

function renderPresetConfigModal() {
  const currentLabels = getSectionLabels();
  const bodyHtml = SECTION_LABEL_FIELDS.map(({ key, title }) => {
    const currentValue = currentLabels[key] || '';
    return `
      <label class="flex flex-col gap-1 mb-3 text-sm">
        <span>${title}</span>
        <input class="input input-sm input-bordered" data-label-key="${key}" value="${currentValue}" />
      </label>
    `;
  }).join('');

  const footerHtml = `
    <div class="flex justify-end gap-2">
      <button type="button" class="btn btn-sm" data-modal-action="cancel">Cancel</button>
      <button type="button" class="btn btn-sm btn-outline" data-modal-action="reset">Reset</button>
      <button type="button" class="btn btn-sm btn-primary" data-modal-action="save">Save</button>
    </div>
  `;

  setModalContent(presetModalId, {
    title: 'Configure Section Labels',
    bodyHtml,
    footerHtml,
  });

  const modal = document.getElementById(presetModalId);
  if (!modal) return;
  const footer = modal.querySelector('[data-modal-footer]');
  if (!footer) return;

  const collectLabels = () => {
    const inputs = modal.querySelectorAll('[data-label-key]');
    const labels = {};
    inputs.forEach((input) => {
      const key = input.getAttribute('data-label-key');
      if (!key) return;
      labels[key] = input.value || '';
    });
    return labels;
  };

  footer.querySelector('[data-modal-action="cancel"]')?.addEventListener('click', () => {
    closeModal(presetModalId);
  });
  footer.querySelector('[data-modal-action="reset"]')?.addEventListener('click', () => {
    setCustomSectionLabels({});
    closeModal(presetModalId);
    scheduleAutoUpdate();
  });
  footer.querySelector('[data-modal-action="save"]')?.addEventListener('click', () => {
    const labels = collectLabels();
    const baseLabels = resolveSectionLabels({ language: languageSelect?.value || 'English' });
    const overrides = {};
    Object.keys(labels).forEach((key) => {
      const value = (labels[key] || '').trim();
      if (value && value !== baseLabels[key]) overrides[key] = value;
    });
    setCustomSectionLabels(overrides);
    closeModal(presetModalId);
    scheduleAutoUpdate();
  });
}

function deleteBlock(btn, containerId) {
  const container = document.getElementById(containerId);
  // Count only the block entries (child elements)
  if (container.children.length > 1) {
    btn.parentElement.remove();
    // AutoUpdate();
  } else {
		alert('At least one block must remain in this section.');
  }
}

function addExperience() {
	const newEntry = document.createElement('div');
	newEntry.className = 'experience-entry';
  newEntry.innerHTML = `
      <input type="text" placeholder="Position" class="p-2 w-full rounded border">
      <input type="text" placeholder="Company" class="p-2 mt-2 w-full rounded border">
      <input type="text" placeholder="Location (optional)" class="p-2 mt-2 w-full rounded border">
      <input type="text" placeholder="Dates" class="p-2 mt-2 w-full rounded border">
      <textarea placeholder="Bullet points (one per line)" class="p-2 mt-2 w-full h-24 rounded border"></textarea>
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="experience-fields">
        Delete
      </button>
    `;
	document.getElementById('experience-fields').appendChild(newEntry);
  AutoUpdate();
}

function addEducation() {
	const newEntry = document.createElement('div');
	newEntry.className = 'mt-6 space-y-4 education-entry';
  newEntry.innerHTML = `
      <input type="text" placeholder="University" class="p-2 w-full rounded border">
      <input type="text" placeholder="Degree" class="p-2 w-full rounded border">
      <input type="text" placeholder="GPA (optional)" class="p-2 w-full rounded border">
      <input type="text" placeholder="Graduation Date" class="p-2 w-full rounded border">
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="education-fields">
        Delete
      </button>
    `;
	document.getElementById('education-fields').appendChild(newEntry);
  AutoUpdate();
}

function addCertificate() {
	const newEntry = document.createElement('div');
	newEntry.className = 'mt-6 space-y-4 certificate-entry';
  newEntry.innerHTML = `
      <input type="text" placeholder="Certification Name" class="p-2 w-full rounded border" />
      <input type="text" placeholder="Issuer/Description" class="p-2 w-full rounded border" />
      <input type="text" placeholder="Certification Date" class="p-2 w-full rounded border" />
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="certificate-fields">
        Delete
      </button>
    `;
	document.getElementById('certificate-fields').appendChild(newEntry);
  AutoUpdate();
}

function addProject() {
	const newEntry = document.createElement('div');
	newEntry.className = 'project-entry';
  newEntry.innerHTML = `
      <input type="text" placeholder="Project Name" class="p-2 w-full rounded border">
      <input type="text" placeholder="Link (optional)" class="p-2 mt-2 w-full rounded border">
      <textarea placeholder="Bullet points (one per line)" class="p-2 mt-2 w-full h-24 rounded border"></textarea>
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="project-fields">
        Delete
      </button>
    `;
	document.getElementById('project-fields').appendChild(newEntry);
  AutoUpdate();
}

function addSkill() {
	const newEntry = document.createElement('div');
	newEntry.className = 'mt-6 space-y-4 skills-entry';
  newEntry.innerHTML = `
      <input type="text" placeholder="Skill Name" class="p-2 w-full rounded border">
      <input type="text" placeholder="Description" class="p-2 w-full rounded border">
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="skills-fields">
        Delete
      </button>
    `;
	document.getElementById('skills-fields').appendChild(newEntry);
  AutoUpdate();
}

function AutoUpdate() {
  // Update preview on any input
  const obj = getObject();
  generatePDF(obj.cv);
}
AutoUpdate();

// Debounced auto-update when user edits the CV form
let autoUpdateTimeoutId = null;
let autoUpdateEnabled = true;
function scheduleAutoUpdate() {
	if (!autoUpdateEnabled) return;
	if (autoUpdateTimeoutId) {
		clearTimeout(autoUpdateTimeoutId);
	}
	autoUpdateTimeoutId = setTimeout(() => {
		AutoUpdate();
	}, 500);
}

function getObject() {
	const name = document.getElementById('name')?.value;
	const email = document.getElementById('email')?.value;
	const phone = document.getElementById('phone')?.value;
	const location = document.getElementById('location')?.value;
	const linkedin = document.getElementById('linkedin')?.value;
	const linkedin_placeholder = document.getElementById(
		'linkedin_placeholder'
	)?.value;
	const github = document.getElementById('github')?.value;
	const github_placeholder =
		document.getElementById('github_placeholder')?.value;
	const website = document.getElementById('website')?.value;
	const website_placeholder = document.getElementById(
		'website_placeholder'
	)?.value;
	const summary = document.getElementById('summary')?.value;
	const language = document.getElementById('language')?.value;
  const experiences = Array.from(
		document.querySelectorAll('.experience-entry')
  ).map((entry, index) => {
		const fields = entry.querySelectorAll('input, textarea');
		if (!fields || fields.length < 5) {
			console.warn('Experience entry missing fields:', entry);
			return {
				position: '',
				company: '',
				location: '',
				dates: '',
				bullets: { description: '', items: [] },
			};
		}
		const position = fields[0]?.value || '';
		const company = fields[1]?.value || '';
		const location = fields[2]?.value || '';
		const dates = fields[3]?.value || '';
		const bulletsRaw = fields[4]?.value || '';

		// Syntax:
		// # Header line (no bullet)
		// - Level 1 bullet
		// + Level 2 bullet
		// Other non-empty lines are treated as level 1 bullets by default.
		const lines = bulletsRaw
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		let description = '';
		const items = [];
		lines.forEach((line) => {
			if (line.startsWith('#')) {
				const text = line.replace(/^#\s*/, '').trim();
				if (text) description = text;
			} else {
				items.push(line);
			}
		});

		const bullets = { description, items };

    console.log(index, fields);
    return { position, company, location, dates, bullets };
  });
	const projects = Array.from(
		document.querySelectorAll('.project-entry')
	).map((entry) => {
		const fields = entry.querySelectorAll('input, textarea');
		if (!fields || fields.length < 3) {
			console.warn('Project entry missing fields:', entry);
			return {
				projectName: '',
				projectLink: '',
				bullets: { description: '', items: [] },
			};
		}
		const projectName = fields[0]?.value || '';
		const projectLink = fields[1]?.value || '';
		const bulletsRaw = fields[2]?.value || '';

		const lines = bulletsRaw
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		let description = '';
		const items = [];
		lines.forEach((line) => {
			if (line.startsWith('#')) {
				const text = line.replace(/^#\s*/, '').trim();
				if (text) description = text;
			} else {
				items.push(line);
			}
		});

		const bullets = { description, items };

		return { projectName, projectLink, bullets };
	});
	const skills = Array.from(document.querySelectorAll('.skills-entry')).map(
    (entry) => {
			const fields = entry.querySelectorAll('input');
			if (!fields || fields.length < 2) {
				console.warn('Skill entry missing fields:', entry);
				return { skill: '', description: '' };
			}
			const skill = fields[0]?.value || '';
			const description = fields[1]?.value || '';
      return { skill, description };
    }
  );
  const educations = Array.from(
		document.querySelectorAll('.education-entry')
  ).map((entry) => {
		const fields = entry.querySelectorAll('input');
		if (!fields || fields.length < 4) {
			console.warn('Education entry missing fields:', entry);
			return { university: '', degree: '', gpa: '', graduationDate: '' };
		}
		const university = fields[0]?.value || '';
		const degree = fields[1]?.value || '';
		const gpa = fields[2]?.value || '';
		const graduationDate = fields[3]?.value || '';
    return { university, degree, gpa, graduationDate };
  });
  const certificates = Array.from(
		document.querySelectorAll('.certificate-entry')
  ).map((entry) => {
		const fields = entry.querySelectorAll('input');
		if (!fields || fields.length < 3) {
			console.warn('Certificate entry missing fields:', entry);
			return { certName: '', 'issuer/description': '', certDate: '' };
		}
		const certName = fields[0]?.value || '';
		const issuer = fields[1]?.value || '';
		const certDate = fields[2]?.value || '';
		return { certName, 'issuer/description': issuer, certDate };
	});

  // Get image data from ImageHandler module
  const imageData = getImageData();
  const compatibleImageData = {
    profileImage: imageData?.profileImage ?? null,
    profileImageType: imageData?.profileImageType ?? null,
  };

  const obj = {
    cv: {
      name,
      email,
      phone,
      language,
      location,
      linkedin,
      linkedin_placeholder,
      github,
      github_placeholder,
      website,
      website_placeholder,
      summary,
      experiences,
      projects,
      skills,
      educations,
      certificates,
      ...compatibleImageData,
    },
    coverLetter: CoverLetter_Obj,
  };
	console.log('get object', obj);
  return obj;
}

function getSelectedFontFamily() {
  const fontSelect = document.getElementById('font-select');
  const selectedFont = fontSelect ? fontSelect.value : 'notosans';
  const customFontName =
    document.getElementById('custom-font-name')?.value?.trim() || '';
  if (selectedFont === 'arial') return 'Arial';
  if (selectedFont === 'custom' && customFontName) return customFontName;
  return 'NotoSans';
}

function getTypographyScale() {
  const sizeMultiplierRaw =
    document.getElementById('size-multiplier')?.value ?? 1;
  return buildTypographyScale({
    baseBodySize: 10,
    baseTitleSize: 14,
    baseLineHeight: 16,
    baseSectionGap: 5,
    sizeMultiplier: Number(sizeMultiplierRaw),
    fontFamily: getSelectedFontFamily(),
  });
}

function downloadJson() {
  const obj = getObject();
	const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
	const saveName = prompt('Enter a name for your save file');
	if (saveName === null) {
		window.URL.revokeObjectURL(url);
		return; // user cancelled
	}
	const a = document.createElement('a');
	a.style.display = 'none';
  a.href = url;
  // the filename you want
	a.download = `${saveName ? saveName : 'resume'}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Generate a selectable PDF using jsPDF text functions
function generatePDF(obj, save = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
		orientation: 'p',
		unit: 'pt',
		format: 'a4',
    putOnlyUsedFonts: true,
  });
  const typography = getTypographyScale();
  const bodySize = typography.body;
  const contactInfoSize = Math.max(9, Math.round(bodySize * 0.9));
  const titleSize = typography.title;
  const sectionGap = typography.sectionGap;
  const padding = sectionGap;
  const lineHeight = typography.lineHeight;
  const contactLineHeight = Math.max(10, Math.round(lineHeight * 0.9));
  const bulletLineHeight = Math.max(10, Math.round(lineHeight * 0.9));
  const bulletBlockGap = Math.max(2, Math.round(padding * 0.35));
  let marginLeft = 40;
  let y = 40;
  var midPage = doc.internal.pageSize.getWidth() / 2;
  let marginRight = doc.internal.pageSize.getWidth() - 30;
  let marginBottom = doc.internal.pageSize.getHeight() - 30;
  let marginTop = 40;
	let deliminator = ' | ';
	let deliminatorLength = doc.getTextWidth(deliminator);
  let checkDelimiterWidth = deliminatorLength;
  console.log(
		'doc',
    doc.internal.pageSize.getWidth(),
    doc.internal.pageSize.getHeight()
  );
  // const obj = getObject()
  const sectionLabels = getSectionLabels();

	const language = document.getElementById('language').value;
	const fontSelect = document.getElementById('font-select');
	const selectedFont = fontSelect ? fontSelect.value : 'notosans';
	const customFontName = document.getElementById('custom-font-name')?.value?.trim() || '';
	
	// Determine font family name and whether to use embedded fonts
	let fontFamily = typography.fontFamily || 'NotoSans';
	let useEmbeddedFonts = true;
	
	if (selectedFont === 'arial') {
		fontFamily = 'Arial';
		useEmbeddedFonts = false; // Arial is a standard font, no need to embed
	} else if (selectedFont === 'custom' && customFontName) {
		fontFamily = customFontName;
		useEmbeddedFonts = false; // Custom fonts need to be system fonts or handled differently
  } else {
		// NotoSans (default) - use embedded fonts
		useEmbeddedFonts = true;
		// Support both language names and potential codes for backward compatibility
		if (language === 'Japanese' || language === 'ja') {
			doc.addFileToVFS('NotoSans-normal.ttf', RegJap);
			doc.addFileToVFS('NotoSans-bold.ttf', Boldjap);
		} else if (language === 'Korean' || language === 'ko') {
			doc.addFileToVFS('NotoSans-normal.ttf', KrRegular);
			doc.addFileToVFS('NotoSans-bold.ttf', KrBold);
		} else if (language === 'Chinese' || language === 'zh') {
			doc.addFileToVFS('NotoSans-normal.ttf', RegCN);
			doc.addFileToVFS('NotoSans-bold.ttf', BoldCN);
		} else {
			doc.addFileToVFS('NotoSans-normal.ttf', font);
			doc.addFileToVFS('NotoSans-bold.ttf', fontBold);
		}
		doc.addFont('NotoSans-normal.ttf', 'NotoSans', 'normal');
		doc.addFont('NotoSans-bold.ttf', 'NotoSans', 'bold');
	}

  const fonts = doc.getFontList();
  console.log(fonts);
	
	// Helper function to set font (handles fontFamily variable)
	const setFont = (style = 'normal') => {
		if (useEmbeddedFonts && fontFamily === 'NotoSans') {
			doc.setFont('NotoSans', style);
		} else {
			doc.setFont(fontFamily, style);
		}
	};

  // Utility function to add wrapped text
  function addWrappedText(text, x, y, maxWidth) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length;
  }

  function checkAndAddPage() {
    if (y > marginBottom) {
			console.log('adding page');
			doc.addPage('a4', 'p');
      y = marginTop;
    }
  }

  // information string function
  function formatOutput(temp, placeholder, link) {
    if (temp) {
      if (placeholder) return `${deliminator}${placeholder}`;
      if (link) return `${deliminator}${link}`;
    } else {
      if (placeholder) return `${placeholder}`;
      if (link) return `${link}`;
    }
		return '';
  }

  function formatOutputNoDot(placeholder, link) {
    if (placeholder) return `${placeholder}`;
    if (link) return `${link}`;
		return '';
  }

  // Add profile image if available - treated as absolute positioned element
  let headerStartY = y; // Save starting position for header

  // Use ImageHandler module to add image to PDF
  const imageInfo = addImageToPDF(doc, marginLeft, y);
  const imageWidth = imageInfo.width;
  const imageHeight = imageInfo.height;
  const ImageMarginRight = marginLeft + imageWidth + padding + lineHeight / 2; // Margin after image

  const personalInfo = getPersonalInfoFromObj(obj);
  const personalInfo2 = getPersonalInfo2FromObj(obj);
  let personalInfoY = y + contactLineHeight + padding;

  if (hasImage()) {
    // Personal Information 
		setFont('bold');
    doc.setFontSize(titleSize + 2);
    const name = obj.name;

    // Place name at right side of the image
		doc.text(name || 'Your Name', ImageMarginRight, y);

    // Move to next line for personal info
    personalInfoY = y + contactLineHeight + padding;
		setFont('normal');
    doc.setFontSize(contactInfoSize);
    deliminatorLength = doc.getTextWidth(deliminator);
    checkDelimiterWidth = deliminatorLength;

    // Place Personal Info right of the image
    if (personalInfo) {
      let location = obj.location;
      let email = obj.email;
      let phone = obj.phone;

      // location
			let content = location ? `${location}` : '';
			let temp = location ? `${location}` : '';
      let tempLength = doc.getTextWidth(temp);
      doc.text(content, ImageMarginRight, personalInfoY);

      // email
			content =
				temp && email
					? `${deliminator}${email}`
					: email
					? `${email}`
					: '';
			temp +=
				temp && email
					? `${deliminator}${email}`
					: email
					? `${email}`
					: '';
      doc.text(content, ImageMarginRight + tempLength, personalInfoY);
      tempLength = doc.getTextWidth(temp);

      // phone
			content =
				temp && phone
					? `${deliminator}${phone}`
					: phone
					? `${phone}`
					: '';
			temp +=
				temp && phone
					? `${deliminator}${phone}`
					: phone
					? `${phone}`
					: '';
      doc.text(content, ImageMarginRight + tempLength, personalInfoY);
      tempLength = doc.getTextWidth(temp);

      // console.log(fullLength - tempLength, fullLength, tempLength);

      personalInfoY += contactLineHeight + padding;
    }

    if (personalInfo2) {
      let github = obj.github;
      let website = obj.website;
      let linkedin = obj.linkedin;
      let linkedin_placeholder = obj.linkedin_placeholder;
      let github_placeholder = obj.github_placeholder;
      let website_placeholder = obj.website_placeholder;

      // github
			let content = formatOutput('', github_placeholder, github);
			let temp = formatOutput('', github_placeholder, github);
      let rawText = formatOutputNoDot(github_placeholder, github);
			console.log('github', content, '|', temp);
			if (github.includes('https://') || github.includes('www.')) {
				doc.setTextColor('#115bca');
				doc.setDrawColor('#115bca');
				doc.textWithLink(rawText, ImageMarginRight, personalInfoY, {
					url: github,
				});
        const textWidth = doc.getTextWidth(rawText);
        doc.line(
          ImageMarginRight,
          personalInfoY,
          ImageMarginRight + textWidth,
          personalInfoY
        );
				doc.setTextColor('#000000');
				doc.setDrawColor('#000000');
			} else doc.text(content, ImageMarginRight, personalInfoY);
      let tempLength = doc.getTextWidth(temp);

      // website
      content = formatOutput(temp, website_placeholder, website);
      temp += formatOutput(temp, website_placeholder, website);
      rawText = formatOutputNoDot(website_placeholder, website);
			if (website.includes('https://') || website.includes('www.')) {
        doc.text(
          deliminator,
          ImageMarginRight + tempLength,
          personalInfoY
				);
				doc.setTextColor('#115bca');
				doc.setDrawColor('#115bca');
        doc.textWithLink(
          rawText,
          ImageMarginRight + tempLength + checkDelimiterWidth,
          personalInfoY,
          { url: website }
        );
        const textWidth = doc.getTextWidth(rawText);
        doc.line(
          ImageMarginRight + tempLength + checkDelimiterWidth,
          personalInfoY,
					ImageMarginRight +
						tempLength +
						deliminatorLength +
						textWidth,
          personalInfoY
        );
				doc.setTextColor('#000000');
				doc.setDrawColor('#000000');
      } else
				doc.text(content, ImageMarginRight + tempLength, personalInfoY);
      tempLength = doc.getTextWidth(temp);

      // linkedin
      content = formatOutput(temp, linkedin_placeholder, linkedin);
      temp += formatOutput(temp, linkedin_placeholder, linkedin);
      rawText = formatOutputNoDot(linkedin_placeholder, linkedin);
      // console.log("linkedin", content, "|", temp);
			if (linkedin.includes('https://') || linkedin.includes('www.')) {
        doc.text(
          deliminator,
          ImageMarginRight + tempLength,
          personalInfoY
				);
				doc.setTextColor('#115bca');
				doc.setDrawColor('#115bca');
        doc.textWithLink(
          rawText,
          ImageMarginRight + tempLength + checkDelimiterWidth,
          personalInfoY,
          { url: linkedin }
        );
        const textWidth = doc.getTextWidth(rawText);
        doc.line(
          ImageMarginRight + tempLength + checkDelimiterWidth,
          personalInfoY,
					ImageMarginRight +
						tempLength +
						deliminatorLength +
						textWidth,
          personalInfoY
        );
				doc.setTextColor('#000000');
				doc.setDrawColor('#000000');
      } else
				doc.text(content, ImageMarginRight + tempLength, personalInfoY);
      tempLength = doc.getTextWidth(temp);

      personalInfoY += contactLineHeight + padding;
    }
	} else {
    // Personal Information 
		setFont('bold');
    doc.setFontSize(titleSize + 2);
    const name = obj.name;

    // Center name at mid-page
		doc.text(name || 'Your Name', midPage, y, { align: 'center' });

    // Move to next line for personal info
    personalInfoY = y + contactLineHeight + padding;
		setFont('normal');
    doc.setFontSize(contactInfoSize);
    deliminatorLength = doc.getTextWidth(deliminator);
    checkDelimiterWidth = deliminatorLength;

    // centered Personal Info
    if (personalInfo) {
      doc.text(personalInfo, midPage, personalInfoY, { align: 'center' });
      personalInfoY += contactLineHeight + padding;
    }

    if (personalInfo2) {
      doc.text(personalInfo2, midPage, personalInfoY, { align: 'center' });
      personalInfoY += contactLineHeight + padding;
    }
  }

  // If no personal info was displayed, set personalInfoY to continue from name
  if (!personalInfo && !personalInfo2) {
    personalInfoY = headerStartY + contactLineHeight + padding;
  }

  // Set y position to continue below the header (image + personal info)
  if (hasImage()) {
    const imageBottom = getImageBottomPosition(
      headerStartY,
      imageHeight,
      contactLineHeight + padding
    );
		console.log('imageBottom', imageBottom, '|', personalInfoY);
    y = Math.max(personalInfoY, imageBottom);
  } else {
    y = personalInfoY;
  }

  // Summary
  // const summary = document.getElementById('summary').value;
  const summary = obj.summary;
  if (summary.trim()) {
		setFont('bold');
    doc.setFontSize(titleSize);
		doc.text(sectionLabels.summary, marginLeft, y);
    doc.line(marginLeft, y + 5, marginRight, y + 5);
    y += lineHeight + padding;
    checkAndAddPage();

		setFont('normal');
    doc.setFontSize(bodySize);
    const summaryLines = doc.splitTextToSize(summary, 500);
    doc.text(summary, marginLeft, y, {
			align: 'justify',
      maxWidth: 500,
      lineHeightFactor: Math.max(1.2, lineHeight / Math.max(bodySize, 1)),
    });
    for (let i = 0; i < summaryLines.length; i++) {
      // doc.text(summaryLines[i], marginLeft, y, {align: "justify", maxWidth: 500});
      y += lineHeight;
      if (i == summaryLines.length - 1) y += 5;
      checkAndAddPage();
    }
    // console.log(summaryLines)
  }

  // Skills Section
  const skillsEntries = obj.skills;
  if (skillsEntries.length) {
    const check = obj.skills;
    if (check[0].skill || check[0].description) {
			setFont('bold');
      doc.setFontSize(titleSize);
			doc.text(sectionLabels.skills, marginLeft, y);
      doc.line(marginLeft, y + 5, marginRight, y + 5);
      y += lineHeight + padding;
      checkAndAddPage();

      skillsEntries.forEach((entry, index) => {
        // const fields = entry.querySelectorAll('input');
        // const skill = fields[0].value;
        // const description = fields[1].value;
        const skill = entry.skill;
        const description = entry.description;
        const normalizedSkill = typeof skill === 'string' ? skill.trim() : '';
        const normalizedDescription =
          typeof description === 'string' ? description.trim() : '';
        doc.setFontSize(bodySize);
				let temp = normalizedSkill ? `**${normalizedSkill}**` : '';
        temp +=
          temp && normalizedDescription
            ? `: ${normalizedDescription}`
            : normalizedDescription
              ? `${normalizedDescription}`
						: '';
        let startX = marginLeft;
				temp.split('**').forEach((line, index) => {
					setFont('bold');
          if (index % 2 === 0) {
						setFont('normal');
          }
          const tempLines = doc.splitTextToSize(
            line.trim(),
            500 - doc.getStringUnitWidth(normalizedSkill) * 10
          );
          // console.log(tempLines)
          for (let bline = 0; bline < tempLines.length; bline++) {
            doc.text(tempLines[bline], startX, y);
            if (bline == 0 && tempLines.length == 1)
							startX =
								startX +
								doc.getStringUnitWidth(tempLines[bline]) * 10;
						else if (
							tempLines.length > 1 &&
							bline != tempLines.length - 1
						) {
							console.log('drop');
              startX = marginLeft;
              y += lineHeight;
              checkAndAddPage();
            }
          }
          // doc.text(line, startX, y);
          // startX = startX + doc.getStringUnitWidth(line) * 10;
        });

        // doc.setFont('NotoSans', 'bold');
        // doc.text(skill, marginLeft, y);
        // doc.setFont('NotoSans', 'normal');
        // doc.text(skill ? " : " + description : description, doc.getTextWidth(skill) + marginLeft, y);

        y += lineHeight;
        if (index != skillsEntries.length - 1 || y < marginBottom)
          checkAndAddPage();
      });
    }
  }

  // Experience Section
  const experienceEntries = obj.experiences;
  if (experienceEntries.length) {
    const check = obj.experiences;

		function hasExperienceContent(exp) {
			if (!exp) return false;
			if (
				(exp.position && exp.position.trim()) ||
				(exp.company && exp.company.trim()) ||
				(exp.location && exp.location.trim()) ||
				(exp.dates && exp.dates.trim())
			) {
				return true;
			}
			const b = exp.bullets;
			if (!b) return false;
			if (typeof b === 'string') {
				return !!b.trim();
			}
			if (b.description && b.description.trim()) return true;
			if (Array.isArray(b.items) && b.items.some((s) => s && s.trim()))
				return true;
			return false;
		}

		if (hasExperienceContent(check[0])) {
			setFont('bold');
      doc.setFontSize(titleSize);
      y += padding;
      checkAndAddPage();
			doc.text(sectionLabels.experience, marginLeft, y);
      doc.line(marginLeft, y + 5, marginRight, y + 5);
      y += lineHeight + padding;
      checkAndAddPage();

      experienceEntries.forEach((entry, index) => {
        const position = entry.position;
        const company = entry.company;
        const location = entry.location;
        const dates = entry.dates;
				// bullets is now { description, items }, where items may use syntax:
				// - "- text" for level 1, "+ text" for level 2.
				let bullets = [];
				let bulletsDescription = '';
				if (entry.bullets) {
					if (typeof entry.bullets === 'string') {
						// Backward compatibility: old string format
						const lines = entry.bullets
							.split('\n')
							.map((l) => l.trim())
							.filter((l) => l.length > 0);
						bulletsDescription = lines[0] || '';
						bullets = lines.slice(1);
					} else {
						bulletsDescription = entry.bullets.description || '';
						bullets = Array.isArray(entry.bullets.items)
							? entry.bullets.items
							: [];
					}
				}

        doc.setFontSize(bodySize);
        // company (uppercase) and location (italic, not uppercase) on first line
				setFont('bold');
				let temp = company ? `${company.trim().toUpperCase()}` : '';
        if (temp && location) {
					doc.text(temp, marginLeft, y);
					const companyWidth = doc.getTextWidth(temp);
					setFont('italic');
					doc.text(`, ${location.trim()}`, marginLeft + companyWidth, y);
					setFont('normal');
				} else if (temp) {
					doc.text(temp, marginLeft, y);
				} else if (location) {
					setFont('italic');
					doc.text(location.trim(), marginLeft, y);
					setFont('normal');
				}
        doc.text(dates, doc.internal.pageSize.getWidth() - 40, y, {
					align: 'right',
        });
        if (temp || location) {
					y += lineHeight;
					checkAndAddPage();
				}

        // position (bold) on second line
				temp = position ? `**${position.trim()}**` : '';
        let startX = marginLeft;
				temp.split('**').forEach((line, index) => {
					setFont('bold');
          if (index % 2 === 0) {
						setFont('normal');
          }
          doc.text(line, startX, y);
          startX = startX + doc.getStringUnitWidth(line) * 10;
        });
        y += lineHeight;
        checkAndAddPage();

				setFont('normal');

				// Header (description) shown as plain text (no bullet)
				const hasHeader = bulletsDescription && bulletsDescription.trim();
				if (hasHeader) {
					const descLines = doc.splitTextToSize(
						bulletsDescription.trim(),
						500
					);
					for (let i = 0; i < descLines.length; i++) {
						doc.text(descLines[i], marginLeft, y);
        y += lineHeight;
        checkAndAddPage();
					}
				}

				// Bullet items (supporting 2 levels via "-" and "+" prefixes)
				// Indentation: header = 0, level 1 = 10px (if has header), level 2 = 20px (if has header)
        if (bullets.length > 0) {
          y += bulletBlockGap;
          checkAndAddPage();
        }
        bullets.forEach((bullet, index) => {
					if (bullet && bullet.trim()) {
						let raw = bullet.trim();
						let level = 1;
						if (raw.startsWith('+')) {
							level = 2;
							raw = raw.replace(/^\+\s*/, '');
						} else if (raw.startsWith('-')) {
							level = 1;
							raw = raw.replace(/^-\s*/, '');
						}
						// Calculate indent: if has header, level 1 = 10px, level 2 = 20px
						const baseIndent = hasHeader ? 10 : 0;
						const indentX = marginLeft + (level === 2 ? baseIndent + 10 : baseIndent);
						const maxWidth = level === 1 ? (hasHeader ? 490 : 500) : (hasHeader ? 470 : 480);
						const bulletLines = doc.splitTextToSize(raw, maxWidth);
            for (let i = 0; i < bulletLines.length; i++) {
							const isFirstLine = i === 0;
							const prefix = isFirstLine ? (level === 2 ? '◦   ' : '•   ') : '    ';
							doc.text(prefix + bulletLines[i], indentX, y);
              y += bulletLineHeight;
							if (
								index !== bullets.length - 1 ||
								y < marginBottom
							)
                checkAndAddPage();
            }
          }
        });
        if (bullets.length > 0) {
          y += bulletBlockGap;
          checkAndAddPage();
        }
        // if (index != experienceEntries.length - 1)
        //   y += lineHeight
        // checkAndAddPage()
      });
    }
  }

  // Projects Section
  const projectEntries = obj.projects;
  if (projectEntries.length) {
    const check = obj.projects;

		function hasProjectContent(proj) {
			if (!proj) return false;
			if (
				(proj.projectName && proj.projectName.trim()) ||
				(proj.projectLink && proj.projectLink.trim())
			) {
				return true;
			}
			const b = proj.bullets;
			if (!b) return false;
			if (typeof b === 'string') {
				return !!b.trim();
			}
			if (b.description && b.description.trim()) return true;
			if (Array.isArray(b.items) && b.items.some((s) => s && s.trim()))
				return true;
			return false;
		}

		if (hasProjectContent(check[0])) {
			setFont('bold');
      doc.setFontSize(titleSize);
      y += padding;
      checkAndAddPage();
			doc.text(sectionLabels.projects, marginLeft, y);
      doc.line(marginLeft, y + 5, marginRight, y + 5);
      y += lineHeight + padding;
      checkAndAddPage();

      projectEntries.forEach((entry, index) => {
        // const fields = entry.querySelectorAll('input, textarea');
        // const projectName = fields[0].value;
        // const projectLink = fields[1].value;
        // const bullets = fields[2].value.split('\n');
        const projectName = entry.projectName;
        const projectLink = entry.projectLink;
				let bullets = [];
				let bulletsDescription = '';
				if (entry.bullets) {
					if (typeof entry.bullets === 'string') {
						const lines = entry.bullets
							.split('\n')
							.map((l) => l.trim())
							.filter((l) => l.length > 0);
						bulletsDescription = lines[0] || '';
						bullets = lines.slice(1);
					} else {
						bulletsDescription = entry.bullets.description || '';
						bullets = Array.isArray(entry.bullets.items)
							? entry.bullets.items
							: [];
					}
				}
				// Project name (uppercase, bold)
				setFont('bold');
        doc.setFontSize(bodySize);
				const projectNameLines = doc.splitTextToSize(
					projectName.trim().toUpperCase(),
					520
				);
        for (let i = 0; i < projectNameLines.length; i++) {
          doc.text(projectNameLines[i], marginLeft, y);
          if (i != projectNameLines.length - 1) {
            y += lineHeight;
            checkAndAddPage();
          }
        }
            y += lineHeight;
            checkAndAddPage();

				// Reset font to normal for header and bullets
				setFont('normal');

				// Header (description) as plain text
				const hasHeader = bulletsDescription && bulletsDescription.trim();
				if (hasHeader) {
					const descLines = doc.splitTextToSize(
						bulletsDescription.trim(),
						500
					);
					for (let i = 0; i < descLines.length; i++) {
						doc.text(descLines[i], marginLeft, y);
                y += lineHeight;
                checkAndAddPage();
              }
				}

				// Bullet items with 2 levels via "-" and "+"
				// Indentation: header = 0, level 1 = 10px (if has header), level 2 = 20px (if has header)
        if (bullets.length > 0) {
          y += bulletBlockGap;
          checkAndAddPage();
        }
        bullets.forEach((bullet, index) => {
					if (bullet && bullet.trim()) {
						let raw = bullet.trim();
						let level = 1;
						if (raw.startsWith('+')) {
							level = 2;
							raw = raw.replace(/^\+\s*/, '');
						} else if (raw.startsWith('-')) {
							level = 1;
							raw = raw.replace(/^-\s*/, '');
						}
						// Calculate indent: if has header, level 1 = 10px, level 2 = 20px
						const baseIndent = hasHeader ? 10 : 0;
						const indentX = marginLeft + (level === 2 ? baseIndent + 10 : baseIndent);
						const maxWidth = level === 1 ? (hasHeader ? 490 : 500) : (hasHeader ? 470 : 480);
						const bulletLines = doc.splitTextToSize(raw, maxWidth);
            for (let i = 0; i < bulletLines.length; i++) {
							const isFirstLine = i === 0;
							const prefix = isFirstLine ? (level === 2 ? '◦   ' : '•   ') : '    ';
							doc.text(prefix + bulletLines[i], indentX, y);
              y += bulletLineHeight;
							if (
								index !== bullets.length - 1 ||
								y < marginBottom
							)
                checkAndAddPage();
            }
          }
        });
        if (bullets.length > 0) {
          y += bulletBlockGap;
          checkAndAddPage();
        }

        // if (index != projectEntries.length - 1)
        //   y += lineHeight
        // else
        //   y += padding
        // checkAndAddPage()
      });
    }
  }

  // Education Section
  const educationEntries = obj.educations;
  if (educationEntries.length) {
    if (
      obj.educations[0].university ||
      obj.educations[0].degree ||
      obj.educations[0].gpa ||
      obj.educations[0].graduationDate
    ) {
			setFont('bold');
      doc.setFontSize(titleSize);
      y += padding;
      checkAndAddPage();
			doc.text(sectionLabels.education, marginLeft, y);
      doc.line(marginLeft, y + 5, marginRight, y + 5);
      y += lineHeight + padding;
      checkAndAddPage();

      educationEntries.forEach((entry, index) => {
        // const fields = entry.querySelectorAll('input');
        // const university = fields[0].value;
        // const degree = fields[1].value;
        // const gpa = fields[2].value;
        // const graduationDate = fields[3].value;

        const university = entry.university;
        const degree = entry.degree;
        const gpa = entry.gpa;
        const graduationDate = entry.graduationDate;

        doc.setFontSize(bodySize);
				let temp = university ? `**${university.trim()}**` : '';
        // temp += temp && degree ? `| ${degree.trim()}` : degree ? `${degree.trim()}` : '';
        // temp += temp && gpa ? ` - GPA: ${gpa.trim()}` : gpa ? `GPA: ${gpa.trim()}` : '';
        let startX = marginLeft;
				temp.split('**').forEach((line, index) => {
					setFont('bold');
          if (index % 2 === 0) {
						setFont('normal');
          }
          doc.text(line, startX, y);
          startX = startX + doc.getStringUnitWidth(line) * 10;
        });

				setFont('normal');
				doc.text(graduationDate, marginRight, y, { align: 'right' });
        y += lineHeight;
        checkAndAddPage();

        // degree and gpa
				temp = degree ? `${degree.trim()}` : '';
				temp +=
					temp && gpa
						? ` - ${gpa.trim()}`
						: gpa
						? `${gpa.trim()}`
						: '';
        doc.text(temp, marginLeft, y);

        y += lineHeight;
        if (index != educationEntries.length - 1 || y < marginBottom)
          checkAndAddPage();
      });
    }
  }

  // Certifications Section
  const certificateEntries = obj.certificates;
  if (certificateEntries.length) {
    if (
      obj.certificates[0].certName ||
			obj.certificates[0]['issuer/description']
    ) {
			setFont('bold');
      doc.setFontSize(titleSize);
      y += padding;
      checkAndAddPage();
			doc.text(sectionLabels.certificates, marginLeft, y);
      doc.line(marginLeft, y + 5, marginRight, y + 5);
      y += lineHeight + padding;
      checkAndAddPage();

      certificateEntries.forEach((entry, index) => {
        // const fields = entry.querySelectorAll('input');
        // const university = fields[0].value;
        // const degree = fields[1].value;
        // const gpa = fields[2].value;
        // const graduationDate = fields[3].value;

        const certName = entry.certName;
				const issuer = entry['issuer/description'];
        const certDate = entry.certDate;

        doc.setFontSize(bodySize);
				let temp = certName ? `**${certName.trim()}**` : '';
        // temp += temp && degree ? `| ${degree.trim()}` : degree ? `${degree.trim()}` : '';
        // temp += temp && gpa ? ` - GPA: ${gpa.trim()}` : gpa ? `GPA: ${gpa.trim()}` : '';
        let startX = marginLeft;
				temp.split('**').forEach((line, index) => {
					setFont('bold');
          if (index % 2 === 0) {
						setFont('normal');
          }
          doc.text(line, startX, y);
          startX = startX + doc.getStringUnitWidth(line) * 10;
        });

				setFont('normal');
				doc.text(certDate, marginRight, y, { align: 'right' });
        if (issuer || index != certificateEntries.length - 1) {
          y += lineHeight;
          checkAndAddPage();
        }

        // issuer/description
        if (issuer) {
					temp = issuer ? `${issuer.trim()}` : '';
          doc.text(temp, marginLeft, y);

          if (index != certificateEntries.length - 1) {
            y += lineHeight;
            checkAndAddPage();
          }
        }
      });
    }
  }

	const pdfEmbed = document.querySelector('#pdf-embed');
	if (pdfEmbed) {
		pdfEmbed.setAttribute('data', doc.output('bloburl'));
	}
  if (save) {
		const saveName = prompt('Enter a name for your save file');
		if (saveName === null) {
			return; // user cancelled
		}
		doc.save(`${saveName ? saveName : 'resume'}.pdf`);
	}

	// Ensure file input loader is still initialized after PDF update
	// (in case DOM reflow affected it)
	if (!inputEle || !inputEle.onchange) {
		initializeFileLoader();
  }

  // Open the PDF in a new window (selectable text)
  // window.open(doc.output('bloburl'), '_blank');
}

function downloadPDF() {
  const obj = getObject();
  generatePDF(obj.cv, true);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function downloadDOCX() {
  const { cv } = getObject();
  const labels = getSectionLabels();
  const typography = getTypographyScale();
  const blob = await exportDocx({ cv, labels, typography });
  const saveName = prompt('Enter a name for your DOCX file');
  if (saveName === null) return;
  downloadBlob(blob, `${saveName ? saveName : 'resume'}.docx`);
}

function downloadDOC() {
  const { cv } = getObject();
  const labels = getSectionLabels();
  const blob = exportDoc({ cv, labels });
  const saveName = prompt('Enter a name for your DOC file');
  if (saveName === null) return;
  downloadBlob(blob, `${saveName ? saveName : 'resume'}.doc`);
}

function loadHtml(obj) {
  // const obj = getObject()
	document.getElementById('name').value = obj.name;
	document.getElementById('email').value = obj.email;
	document.getElementById('phone').value = obj.phone;
	document.getElementById('location').value = obj.location;
	document.getElementById('linkedin').value = obj.linkedin;
	document.getElementById('github').value = obj.github;
	document.getElementById('website').value = obj.website;
	document.getElementById('summary').value = obj.summary;

	document.getElementById('linkedin_placeholder').value =
		obj.linkedin_placeholder || '';
	document.getElementById('github_placeholder').value =
		obj.github_placeholder || '';
	document.getElementById('website_placeholder').value =
		obj.website_placeholder || '';

  // Load profile image using ImageHandler module
  loadImageFromData(obj);

  // Delete all existing skill entries
	const skillEntries = document.querySelectorAll('.skills-entry');
  skillEntries.forEach((entry, index) => {
    if (index != 0) entry.remove();
  });

  const skills = obj.skills || [];
  skills.map((skill, index) => {
    if (index == 0) {
      const inputs = document
				.querySelector('.skills-entry')
				.querySelectorAll('input');
      inputs[0].value = skill.skill;
      inputs[1].value = skill.description;
    } else {
			const newEntry = document.createElement('div');
			newEntry.className = 'mt-6 space-y-4 skills-entry';
      newEntry.innerHTML = `
          <input type="text" placeholder="Skill Name" class="p-2 w-full rounded border" value="${skill.skill}">
          <input type="text" placeholder="Description" class="p-2 w-full rounded border" value="${skill.description}">
          <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="skills-fields">
            Delete
          </button>
        `;
			document.getElementById('skills-fields').appendChild(newEntry);
    }
  });

  // Delete all existing experience entries
	const experienceEntries = document.querySelectorAll('.experience-entry');
  experienceEntries.forEach((entry, index) => {
    if (index != 0) entry.remove();
  });

  const exps = obj.experiences || [];
  exps.map((exp, index) => {
    if (index == 0) {
      const inputs = document
				.querySelector('.experience-entry')
				.querySelectorAll('input, textarea');
      inputs[0].value = exp.position;
      inputs[1].value = exp.company;
      inputs[2].value = exp.location;
      inputs[3].value = exp.dates;

			// bullets can be string (old) or { description, items } (new)
			let bulletsText = '';
			if (typeof exp.bullets === 'string') {
				bulletsText = exp.bullets || '';
			} else if (exp.bullets) {
				const description = exp.bullets.description || '';
				const items = Array.isArray(exp.bullets.items)
					? exp.bullets.items
					: [];
				const parts = [];
				if (description && description.trim()) {
					parts.push(`# ${description.trim()}`);
				}
				parts.push(...items);
				bulletsText = parts.filter(Boolean).join('\n');
			}
			inputs[4].value = bulletsText;
    } else {
			const newEntry = document.createElement('div');
			newEntry.className = 'experience-entry';
      newEntry.innerHTML = `
          <input type="text" placeholder="Position" class="p-2 w-full rounded border" value="${
				exp.position
			}">
          <input type="text" placeholder="Company" class="p-2 mt-2 w-full rounded border" value="${
				exp.company
			}">
          <input type="text" placeholder="Location" class="p-2 mt-2 w-full rounded border" value="${
				exp.location
			}">
          <input type="text" placeholder="Dates" class="p-2 mt-2 w-full rounded border" value="${
				exp.dates
			}">
          <textarea placeholder="Bullet points (one per line)" class="p-2 mt-2 w-full h-24 rounded border" value="">${(() => {
				if (typeof exp.bullets === 'string') return exp.bullets || '';
				if (!exp.bullets) return '';
				const description = exp.bullets.description || '';
				const items = Array.isArray(exp.bullets.items)
					? exp.bullets.items
					: [];
				const parts = [];
				if (description && description.trim()) {
					parts.push(`# ${description.trim()}`);
				}
				parts.push(...items);
				return parts.filter(Boolean).join('\n');
			})()}</textarea>
          <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="experience-fields">
            Delete
          </button>
        `;
			document.getElementById('experience-fields').appendChild(newEntry);
    }
  });

  // Delete all existing project entries
	const projectEntries = document.querySelectorAll('.project-entry');
  projectEntries.forEach((entry, index) => {
    if (index != 0) entry.remove();
  });

  const projs = obj.projects || [];
  projs.map((proj, index) => {
    if (index == 0) {
      const inputs = document
				.querySelector('.project-entry')
				.querySelectorAll('input, textarea');
      inputs[0].value = proj.projectName;
      inputs[1].value = proj.projectLink;

			let bulletsText = '';
			if (typeof proj.bullets === 'string') {
				bulletsText = proj.bullets || '';
			} else if (proj.bullets) {
				const description = proj.bullets.description || '';
				const items = Array.isArray(proj.bullets.items)
					? proj.bullets.items
					: [];
				const parts = [];
				if (description && description.trim()) {
					parts.push(`# ${description.trim()}`);
				}
				parts.push(...items);
				bulletsText = parts.filter(Boolean).join('\n');
			}
			inputs[2].value = bulletsText;
    } else {
			const newEntry = document.createElement('div');
			newEntry.className = 'project-entry';
      newEntry.innerHTML = `
      <input type="text" placeholder="Project Name" class="p-2 w-full rounded border" value="${
			proj.projectName
		}">
      <input type="text" placeholder="Link" class="p-2 mt-2 w-full rounded border" value="${
			proj.projectLink
		}">
      <textarea placeholder="Bullet points (one per line)" class="p-2 mt-2 w-full h-24 rounded border" value="">${(() => {
			if (typeof proj.bullets === 'string') return proj.bullets || '';
			if (!proj.bullets) return '';
			const description = proj.bullets.description || '';
			const items = Array.isArray(proj.bullets.items)
				? proj.bullets.items
				: [];
			const parts = [];
			if (description && description.trim()) {
				parts.push(`# ${description.trim()}`);
			}
			parts.push(...items);
			return parts.filter(Boolean).join('\n');
		})()}</textarea>
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="project-fields">
        Delete
      </button>
    `;
			document.getElementById('project-fields').appendChild(newEntry);
    }
  });

  // Delete all existing certificate entries
	const certificateEntries = document.querySelectorAll('.certificate-entry');
  certificateEntries.forEach((entry, index) => {
    if (index != 0) entry.remove();
  });

  const certs = obj.certificates || [];
  certs.map((cert, index) => {
    if (index == 0) {
      const inputs = document
				.querySelector('.certificate-entry')
				.querySelectorAll('input, textarea');
      inputs[0].value = cert.certName;
			inputs[1].value = cert['issuer/description'];
      inputs[2].value = cert.certDate;
    } else {
			const newEntry = document.createElement('div');
			newEntry.className = 'mt-6 space-y-4 certificate-entry';
      newEntry.innerHTML = `
      <input type="text" placeholder="Certification Name" class="p-2 w-full rounded border" value="${cert.certName}">
      <input type="text" placeholder="Issuer/Description" class="p-2 w-full rounded border" value="${cert['issuer/description']}">
      <input type="text" placeholder="Certification Date" class="p-2 w-full rounded border" value="${cert.certDate}">
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="certificate-fields">
        Delete
      </button>
    `;
			document.getElementById('certificate-fields').appendChild(newEntry);
    }
  });

  // Delete all existing education entries
	const educationEntries = document.querySelectorAll('.education-entry');
  educationEntries.forEach((entry, index) => {
    if (index != 0) entry.remove();
  });

  const edus = obj.educations || [];
  edus.map((edu, index) => {
    if (index == 0) {
      const inputs = document
				.querySelector('.education-entry')
				.querySelectorAll('input, textarea');
      inputs[0].value = edu.university;
      inputs[1].value = edu.degree;
      inputs[2].value = edu.gpa;
      inputs[3].value = edu.graduationDate;
    } else {
			const newEntry = document.createElement('div');
			newEntry.className = 'mt-6 space-y-4 education-entry';
      newEntry.innerHTML = `
      <input type="text" placeholder="University" class="p-2 w-full rounded border" value="${edu.university}">
      <input type="text" placeholder="Degree" class="p-2 w-full rounded border" value="${edu.degree}">
      <input type="text" placeholder="GPA (optional)" class="p-2 w-full rounded border" value="${edu.gpa}">
      <input type="text" placeholder="Graduation Date" class="p-2 w-full rounded border" value="${edu.graduationDate}">
      <button class="px-2 py-1 mt-2 text-white rounded delete-btn btn btn-error" data-container="education-fields">
        Delete
      </button>
    `;
			document.getElementById('education-fields').appendChild(newEntry);
    }
  });

  // Update preview after loading data
  AutoUpdate();
}

// Initialize JSON load-from-file behaviour after DOM is ready
function initializeFileLoader() {
	inputEle = document.getElementById('loadfile');
	if (!inputEle) return;

inputEle.onchange = async function () {
		const errLabel = document.querySelector('.err');
		if (errLabel) errLabel.innerText = '';
		if (!inputEle || !inputEle.files || inputEle.files.length === 0) return;
  const file = inputEle.files[0];
		console.log('[CV Editor] Selected load file:', file);

		const isJsonType = file.type === 'application/json';
		const isJsonName =
			file.name && file.name.toLowerCase().endsWith('.json');
		if (!isJsonType && !isJsonName) {
			if (errLabel) errLabel.innerText = 'File must be a .json CV export';
    return;
  }

		try {
			let rawText = await file.text();
			rawText = preprocessJsonText(rawText);
			const obj = JSON.parse(rawText);
			if (!obj || !obj.cv) {
				if (errLabel)
					errLabel.innerText =
						"Invalid file format: missing 'cv' field";
				console.error('[CV Editor] Invalid CV JSON structure:', obj);
				return;
			}

  loadHtml(obj.cv);
			if (obj.coverLetter) {
  loadCoverLetter(obj.coverLetter);
			}
			console.log('[CV Editor] Loaded CV object:', obj);
			if (errLabel) errLabel.innerText = 'Loaded CV file successfully';
		} catch (e) {
			console.error('[CV Editor] Error reading CV file:', e);
			if (errLabel)
				errLabel.innerText = 'Failed to read CV file (invalid JSON)';
		} finally {
			inputEle.value = '';
		}
	};
}

// Single tab (CV Editor) – no tab switching logic needed

// Initialize image handler
initializeImageHandler();

// initialize personal profile handler
initializeProfileHandler();

function profileEventListener() {
	document.getElementById('save-profile').addEventListener('click', () => {
		const profile_idx = parseInt(
			document.getElementById('profile-select').value
		);
		console.log('profile_idx: ', profile_idx);
    const obj = getObject();
		obj['cv']['language'] = languageSelect.value;
    const temp_obj = mapObject_profile(obj);
    // console.log(temp_obj);
    saveProfileToStorage(profile_idx, temp_obj);
  });
	document.getElementById('load-profile').addEventListener('click', () => {
		let profile_idx = parseInt(
			document.getElementById('profile-select').value
		);
    profile_idx = profile_idx < 0 ? 0 : profile_idx;
    const obj_cv = getObject();
    const obj_profile = loadProfile(profile_idx);
    console.log(obj_cv, obj_profile);
    const obj_final = mapObject_cv(obj_profile, obj_cv);
    loadHtml(obj_final.cv);
	});
	document.getElementById('delete-profile').addEventListener('click', () => {
		const profile_idx = parseInt(
			document.getElementById('profile-select').value
		);
    deleteProfile(profile_idx);
	});
}
profileEventListener();

// Initialize basic UI i18n (use UI language select, fallback to CV language if missing)
initializeI18n(uiLanguageSelect || languageSelect);
setSectionLabelLanguage(languageSelect?.value || 'English');

// Initialize all event listeners for buttons
function initializeEventListeners() {
  // Main action buttons
  document
		.getElementById('update-btn')
		?.addEventListener('click', AutoUpdate);
  document
		.getElementById('download-pdf-btn')
		?.addEventListener('click', downloadPDF);
	const downloadDocxBtn = document.getElementById('download-docx-btn');
	if (downloadDocxBtn) {
		downloadDocxBtn.addEventListener('click', downloadDOCX);
	}
  const downloadDocBtn = document.getElementById('download-doc-btn');
  if (downloadDocBtn) {
    downloadDocBtn.addEventListener('click', downloadDOC);
  }
  document
		.getElementById('download-json-btn')
		?.addEventListener('click', downloadJson);

  // Add section buttons
  document
		.getElementById('add-skill-btn')
		?.addEventListener('click', addSkill);
  document
		.getElementById('add-experience-btn')
		?.addEventListener('click', addExperience);
  document
		.getElementById('add-project-btn')
		?.addEventListener('click', addProject);
  document
		.getElementById('add-education-btn')
		?.addEventListener('click', addEducation);
  document
		.getElementById('add-certificate-btn')
		?.addEventListener('click', addCertificate);

	// Auto update after 500ms of no changes in the CV editor form
	const cvEditor = document.getElementById('cv-editor');
	if (cvEditor) {
		cvEditor.addEventListener('input', scheduleAutoUpdate);
		cvEditor.addEventListener('change', scheduleAutoUpdate);
	}

	// Auto-update toggle
	const autoToggle = document.getElementById('auto-update-toggle');
	if (autoToggle) {
		autoToggle.checked = autoUpdateEnabled;
		autoToggle.addEventListener('change', () => {
			autoUpdateEnabled = !!autoToggle.checked;
			if (autoUpdateEnabled) {
				scheduleAutoUpdate();
    }
  });
}

	// Font selector
	const fontSelect = document.getElementById('font-select');
	const customFontContainer = document.getElementById('custom-font-container');
	if (fontSelect && customFontContainer) {
		const updateCustomFontVisibility = () => {
			customFontContainer.style.display = fontSelect.value === 'custom' ? 'flex' : 'none';
		};
		fontSelect.addEventListener('change', () => {
			updateCustomFontVisibility();
			if (autoUpdateEnabled) {
				scheduleAutoUpdate();
			}
		});
		updateCustomFontVisibility(); // Initial state
	}

  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      setSectionLabelLanguage(languageSelect.value);
      scheduleAutoUpdate();
    });
  }

  if (presetConfigBtn) {
    presetConfigBtn.addEventListener('click', () => {
      renderPresetConfigModal();
      openModal(presetModalId);
    });
  }
	
	// Custom font input change triggers update
	const customFontInput = document.getElementById('custom-font-name');
	if (customFontInput) {
		customFontInput.addEventListener('input', () => {
			if (autoUpdateEnabled) {
				scheduleAutoUpdate();
			}
		});
	}

  const sizeMultiplierInput = document.getElementById('size-multiplier');
  if (sizeMultiplierInput) {
    const normalizeMultiplierInput = () => {
      const value = Number(sizeMultiplierInput.value);
      const safeValue = Number.isFinite(value) ? value : 1;
      const clamped = Math.min(1.6, Math.max(0.8, safeValue));
      sizeMultiplierInput.value = String(clamped);
    };
    sizeMultiplierInput.addEventListener('change', () => {
      normalizeMultiplierInput();
      if (autoUpdateEnabled) scheduleAutoUpdate();
    });
    sizeMultiplierInput.addEventListener('input', () => {
      if (autoUpdateEnabled) scheduleAutoUpdate();
    });
    normalizeMultiplierInput();
  }
	
	// Prompt helper setup
	const promptTextarea = document.getElementById('prompt-template');
	if (promptTextarea) {
		promptTextarea.value = promptTemplate.trim();
	}
	const copyPromptBtn = document.getElementById('copy-prompt-btn');
	if (copyPromptBtn && promptTextarea) {
		copyPromptBtn.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(promptTextarea.value);
				// Optional: small visual feedback could be added later
			} catch (e) {
				console.error('Failed to copy prompt:', e);
			}
		});
	}

	// JSON text loader
	const jsonTextArea = document.getElementById('json-input');
	const jsonTextBtn = document.getElementById('load-json-text-btn');
	const jsonTextError = document.querySelector('.json-text-error');
	if (jsonTextArea && jsonTextBtn) {
		jsonTextBtn.addEventListener('click', () => {
			if (jsonTextError) jsonTextError.textContent = '';
			let raw = jsonTextArea.value;
			if (!raw.trim()) {
				if (jsonTextError)
					jsonTextError.textContent = 'No JSON provided';
    return;
  }

			// Clean up fences + [cite] markers
			raw = preprocessJsonText(raw);

			try {
				const obj = JSON.parse(raw);
				if (!obj || !obj.cv) {
					if (jsonTextError)
						jsonTextError.textContent =
							"Invalid format: missing 'cv' field";
					return;
				}
				loadHtml(obj.cv);
				if (obj.coverLetter) {
					loadCoverLetter(obj.coverLetter);
				}
				scheduleAutoUpdate();
				if (jsonTextError)
					jsonTextError.textContent = 'Loaded CV JSON successfully';
			} catch (e) {
				console.error('Failed to parse JSON text:', e);
				if (jsonTextError) jsonTextError.textContent = 'Invalid JSON';
			}
		});
	}

	// Delete buttons event delegation
	document.body.addEventListener('click', function (e) {
		if (e.target.classList.contains('delete-btn')) {
			const container = e.target.getAttribute('data-container');
			deleteBlock(e.target, container);
    }
	});
}

// Initialize event listeners when DOM is loaded
initializeEventListeners();
initializeFileLoader();

// AI generation functionality removed – manual editing only

// async function fetchModels() {
//   const res = await fetch('https://text.pollinations.ai/models');
//   const data = await res.json();
//   // console.log(data);
//   for (let model of data) {
//     if (model.output_modalities[0] !== 'text')
//       continue; // Skip models that do not output text
//     const option = document.createElement('option');
//     option.value = model.name;
//     option.innerText = model.description;
//     AI_select.appendChild(option);
//   }
// }

// fetchModels();

export function loadCoverLetter(coverLetter) {
  const {
    header,
    greeting,
    openingParagraph,
    bodyParagraphs,
    closingParagraph,
    signOff,
  } = coverLetter;

  // Format header lines
  const headerLines = [
    header.name,
    header.location,
    header.phone,
    header.email,
    header.date,
    greeting,
  ];

  // Format body paragraphs with line breaks between each
  const body = [openingParagraph, ...bodyParagraphs, closingParagraph]
    .filter(Boolean) // Remove empty strings/nulls
    .map((p) => p.trim())
		.join('\n\n');

  // Final assembly
  const letter = [
		headerLines.filter(Boolean).join('\n'), // Join non-empty header lines
		'', // Blank line before body
    body,
		'', // Blank line before signoff
    signOff,
	].join('\n');

  // Assign to textarea (assumes a textarea with id="coverLetterTextarea")
  if (cover_letter) {
    cover_letter.value = letter;
  } else {
    console.warn("Textarea with id 'coverLetterTextarea' not found.");
  }
}

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const isOpen = computed<boolean>({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const store = useCVStore()
const { t } = useI18n()

interface GitHubProfile {
  login: string
  avatar_url: string
  html_url: string
  name: string | null
  bio: string | null
  public_repos: number
  followers: number
}

const githubProfiles = ref<GitHubProfile[]>([])

async function fetchGitHubProfiles() {
  try {
    const usernames = ['sjnosukequy', 'Phuongp2003']
    const fetched: GitHubProfile[] = []
    for (const username of usernames) {
      const res = await fetch(`https://api.github.com/users/${username}`)
      if (res.ok) {
        const data = await res.json()
        fetched.push({
          login: data.login,
          avatar_url: data.avatar_url,
          html_url: data.html_url,
          name: data.name,
          bio: data.bio,
          public_repos: data.public_repos,
          followers: data.followers,
        })
      }
    }
    githubProfiles.value = fetched
  } catch (e) {
    console.warn('Failed to fetch GitHub profiles:', e)
  }
}

onMounted(() => {
  fetchGitHubProfiles()
})

// ─── Prompt Helper ─────────────────────────────────────────────────────────────
const copyBtnText = ref('copy_prompt')
function copyPrompt() {
  navigator.clipboard.writeText(promptTemplate.trim())
  copyBtnText.value = 'copied'
  setTimeout(() => {
    copyBtnText.value = 'copy_prompt'
  }, 2000)
}

// ─── JSON Loader ──────────────────────────────────────────────────────────────
const jsonInputValue = ref('')
const jsonLoadError = ref('')
const jsonLoadSuccess = ref('')

function preprocessJsonText(raw: string) {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    const end = cleaned.lastIndexOf('```')
    if (end > 3) {
      cleaned = cleaned.slice(cleaned.indexOf('\n') + 1, end).trim()
    }
  }
  cleaned = cleaned.replace(/\[cite_start\]/g, '')
  cleaned = cleaned.replace(/\[cite:[^\]]*\]/g, '')
  return cleaned
}

function loadJsonFromText() {
  jsonLoadError.value = ''
  jsonLoadSuccess.value = ''
  const raw = jsonInputValue.value.trim()
  if (!raw) {
    jsonLoadError.value = 'no_json'
    return
  }
  const clean = preprocessJsonText(raw)
  try {
    const obj = JSON.parse(clean)
    if (!obj || !obj.cv) {
      jsonLoadError.value = 'invalid_format'
      return
    }
    store.loadCv(obj)
    jsonLoadSuccess.value = 'loaded_success'
    jsonInputValue.value = ''
    setTimeout(() => {
      jsonLoadSuccess.value = ''
    }, 3000)
  } catch (e) {
    jsonLoadError.value = 'invalid_json'
    setTimeout(() => {
      jsonLoadError.value = ''
    }, 3000)
  }
}

// ─── Prompt Template ─────────────────────────────────────────────────────────
const promptTemplate = `You are an expert CV and Cover Letter structuring assistant. Your goal is to analyze a job description and optional user-provided details to generate a highly tailored, professional CV and Cover Letter in a single, valid JSON payload.

## Goal Statement
1. The output MUST be a single JSON object matching the exact schema defined below.
2. The language of all text fields in the CV and Cover Letter (including section labels) must match the requested language. Exception: If the requested language is English (case-insensitive), output all fields in English.
3. Keep the tone professional, natural, and results-oriented. Avoid generic filler/boilerplate phrases in the summary or objective sections (e.g., do NOT use words like "passionate", "aspiring", "motivated", "detail-oriented", or "seeking new opportunities").
4. If a field has no user data and cannot be realistically inferred, use an empty string or empty array as appropriate.

## JSON Schema Structure
\`\`\`json
{
  "cv": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string (e.g. City, Country)",
    "linkedin": "string (full URL, e.g. https://linkedin.com/in/username)",
    "linkedin_placeholder": "string (short display name, e.g. linkedin.com/in/username)",
    "github": "string (full URL, e.g. https://github.com/username)",
    "github_placeholder": "string (short display name, e.g. github.com/username)",
    "website": "string (full URL)",
    "website_placeholder": "string (short display name)",
    "summary": "string (concise professional summary tailored to the role, no boilerplate/buzzwords)",
    "objective": "string (career objective, leave empty unless objective section is explicitly enabled or candidate is very junior)",
    "experiences": [
      {
        "position": "string",
        "company": "string",
        "location": "string (e.g. City, Country)",
        "dates": "string (e.g. October 2024 - Present or MM/YYYY - MM/YYYY)",
        "bullets": {
          "description": "string (optional overview line for the role, no bullet prefix)",
          "items": [
            "string (bullet text starting with a prefix: '-' for L1 main bullet, '+' or '--' for L2 nested sub-bullet, and '---' for L3 deep nested sub-bullet)"
          ]
        }
      }
    ],
    "projects": [
      {
        "projectName": "string",
        "projectLink": "string (full URL)",
        "bullets": {
          "description": "string (optional overview line for the project, no bullet prefix)",
          "items": [
            "string (bullet text starting with a prefix: '-' for L1 main bullet, '+' or '--' for L2 nested sub-bullet, and '---' for L3 deep nested sub-bullet)"
          ]
        }
      }
    ],
    "skills": [
      {
        "skill": "string (group name, e.g. Languages, Frameworks, Infrastructure)",
        "description": "string (comma-separated skills, e.g. JavaScript, Python, SQL)"
      }
    ],
    "educations": [
      {
        "university": "string",
        "degree": "string",
        "gpa": "string (optional, leave empty if weak or not provided)",
        "graduationDate": "string"
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
      "date": "string (today's date)",
      "recipientName": "string (e.g. Hiring Manager)",
      "recipientTitle": "string",
      "companyName": "string",
      "companyAddress": "string"
    },
    "greeting": "string (e.g. Dear Hiring Manager, or Dear Mr. / Ms. [Name],)",
    "openingParagraph": "string (compelling opening expressing interest and matching job requirements)",
    "bodyParagraphs": [
      "string (supporting paragraph highlighting experience/achievements)",
      "string (supporting paragraph showing technical fit and soft skills)"
    ],
    "closingParagraph": "string (reiterate fit and propose next steps / interview)",
    "signOff": "string (e.g. Sincerely,\\n\\n[Name])"
  },
  "language": "string (exact target language name, e.g., 'English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese')",
  "selectedFont": "string ('notosans' | 'arial' | 'custom', default is 'notosans')",
  "customFontName": "string (if selectedFont is 'custom', choose a matching premium Google Font name, e.g., 'Inter', 'Roboto', 'Montserrat'; otherwise keep empty string)",
  "sizeMultiplier": 1.0,
  "bulletChars": {
    "l1": "•",
    "l2": "◦",
    "l3": "▪"
  },
  "customSectionLabels": {
    "summary": "string (translated label, e.g. 'Summary' or 'Tóm tắt')",
    "objective": "string (translated label, e.g. 'Objective' or 'Mục tiêu nghề nghiệp')",
    "skills": "string (translated label, e.g. 'Skills' or 'Kỹ năng')",
    "experience": "string (translated label, e.g. 'Experience' or 'Kinh nghiệm làm việc')",
    "projects": "string (translated label, e.g. 'Projects' or 'Dự án')",
    "education": "string (translated label, e.g. 'Education' or 'Học vấn')",
    "certificates": "string (translated label, e.g. 'Certificates' or 'Chứng chỉ')"
  },
  "sectionsOrder": [
    "summary",
    "objective",
    "skills",
    "experience",
    "projects",
    "education",
    "certificates"
  ],
  "disabledSections": [
    "objective"
  ]
}
\`\`\`

## Section-specific Guidelines
- **Contact Details**: Keep link placeholders short for previewing (e.g. github.com/username instead of the full URL).
- **Summary & Objective**: Customize to address the job description's main requirements. Focus on concrete accomplishments and years of experience.
- **Experience Bullets**:
  - Main accomplishments should be written as Level 1 bullets (prefixed with "- ").
  - Supporting technical details or metrics should be nested as Level 2 (prefixed with "+" or "-- ") or Level 3 (prefixed with "--- ").
  - Start main bullets with strong, active verbs in the past tense (or appropriate structure for the target language).
  - For the overview line of experiences (\`cv.experiences.bullets.description\`), write a direct, natural overview. Do NOT prepend "Context:" or wrap the entire text in italic stars (like \`*Context: ...*\`).
- **Projects**:
  - Only list real, meaningful projects. Avoid boilerplate or trivial tutorial projects.
  - For the overview line of projects (\`cv.projects.bullets.description\`), write a direct, natural overview. Do NOT prepend "Context:" or wrap the entire text in italic stars (like \`*Context: ...*\`).
- **Skills**:
  - Group skills into logical categories (e.g., Languages, Frameworks, Infrastructure/Tools) rather than listing everything as one long list.
  - In \`cv.skills.description\`, list the technologies/skills naturally. Do NOT wrap the entire description in bold (\`**\`); only bold at most 2-3 key technologies in each list to maintain visual hierarchy, or leave them unformatted if all are of equal importance.
- **Education**: Omit GPA if it is low (below 3.2 out of 4) or not provided.
- **Certificates**: Ensure all relevant professional certificates and language scores (e.g., IELTS, TOEIC, AWS certificates) are listed.

## Rich Text Formatting Guidelines
- The editor supports standard Markdown inline formatting for rich text:
  - \`**bold**\` (renders as strong text)
  - \`*italic*\` (renders as emphasis text)
  - \`***bolditalic***\` (renders as bold and italicized)
  - \`<u>underline</u>\` (renders as underlined text)
- You MUST use these styles to highlight key achievements, technologies, names, or metrics to make the CV look professional.
- Rich text formatting is fully supported and rendered in the following JSON fields:
  - \`cv.summary\`
  - \`cv.objective\`
  - \`text\` in \`cv.experiences.bullets.items\`
  - \`text\` in \`cv.projects.bullets.items\`
  - \`description\` in \`cv.skills\`
  - \`issuer/description\` in \`cv.certificates\`

## Section Visibility & Ordering
- **Order Constraints**: The \`sectionsOrder\` list MUST ALWAYS contain all 7 keys: \`"summary"\`, \`"objective"\`, \`"skills"\`, \`"experience"\`, \`"projects"\`, \`"education"\`, and \`"certificates"\`. Do NOT omit any keys from this list. Arrange them logically based on the candidate's seniority (e.g. experience/skills first for senior roles, education first for fresh graduates).
- **Enable/Disable Sections**:
  - The \`disabledSections\` array controls which sections are hidden by default in the UI.
  - Set \`"objective"\` in \`disabledSections\` by default unless the user explicitly requests one, or the candidate is entry-level.
  - If a section (like \`certificates\` or \`projects\`) contains no data or entries, add its key to \`disabledSections\` to hide it.
  - If a section contains valid generated entries, ensure it is NOT listed in \`disabledSections\` so it is visible to the user.

## Formatting Constraints
- Respond ONLY with the JSON object wrapped in a single \`\`\`json code block.
- Do NOT output any additional introductory text, conversational pleasantries, or explanations.
- Do NOT insert citation references or citation markers (such as [cite], [source], [^1], or [cite: X]) into any text fields. Output must be clean, final copy.`

// ─── SEO Settings & Preview ──────────────────────────────────────────────────
const isDev = import.meta.env.DEV
const seoTitle = computed(() => document.title)
const seoDescription = computed(() => {
  return document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
})
const seoKeywords = computed(() => {
  return document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
})
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :overlay="true"
    :modal="true"
    :title="t('settings_title')"
  >
    <template #body>
      <div class="space-y-6 text-theme-text-sub">
        <!-- ── Prompt Helper ── -->
        <section class="space-y-3">
          <h3
            class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5 text-primary-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.813 15.904L9 21l5.096-.813a2 2 0 001.414-.586l4.904-4.904a2 2 0 00-2.828-2.828l-4.904 4.904a2 2 0 00-.586 1.414z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.5 9.5h.008v.008H14.5V9.5zm3.5 0h.008v.008H18V9.5zm-7 0H11v.008h-.008V9.5zm0-3.5h.008v.008H11V6zm3.5 0h.008v.008H14.5V6zm3.5 0H18v.008h-.008V6z"
              />
            </svg>
            {{ t('prompt_helper_title') }}
          </h3>
          <p class="text-xs text-theme-text-muted leading-relaxed">{{ t('prompt_helper_desc') }}</p>
          <textarea
            class="w-full font-mono text-[10px] bg-theme-muted border border-theme-border rounded-lg p-2.5 text-theme-text-sub focus:outline-none focus:border-theme-border resize-none h-32 shadow-sm"
            readonly
            :value="promptTemplate"
          ></textarea>
          <button
            @click="copyPrompt"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 1-2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
              />
            </svg>
            {{ t(copyBtnText as any) }}
          </button>
        </section>

        <hr v-if="isDev" class="border-theme-sub" />

        <!-- ── SEO & Social Preview ── -->
        <section v-if="isDev" class="space-y-4">
          <h3
            class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-.554-8.243-1.558m16.486 0a12.012 12.012 0 01-16.486 0"
              />
            </svg>
            {{
              store.uiLanguage === 'Vietnamese'
                ? 'SEO & Xem trước liên kết'
                : 'SEO & Social Preview'
            }}
          </h3>

          <p class="text-xs text-theme-text-muted leading-relaxed">
            {{
              store.uiLanguage === 'Vietnamese'
                ? 'Thông tin SEO được cấu hình động thông qua tệp Github Actions (.github/workflows/deploy.yml) khi build & deploy.'
                : 'SEO metadata is configured dynamically via the GitHub Actions workflow (.github/workflows/deploy.yml) during deployment.'
            }}
          </p>

          <!-- Active Metadata Details -->
          <div
            class="bg-theme-muted/50 p-3 rounded-lg border border-theme-border/60 space-y-1.5 text-xs text-theme-text-sub"
          >
            <div><strong class="text-theme-text-muted">Title:</strong> {{ seoTitle }}</div>
            <div>
              <strong class="text-theme-text-muted">Description:</strong> {{ seoDescription }}
            </div>
            <div>
              <strong class="text-theme-text-muted">Keywords:</strong>
              <span class="italic text-theme-text-muted">{{ seoKeywords }}</span>
            </div>
          </div>

          <!-- Google Search Preview -->
          <div
            class="bg-white dark:bg-slate-900 border border-theme-border rounded-xl p-4 space-y-2 shadow-sm"
          >
            <span
              class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block"
              >Google Search Preview</span
            >
            <div class="space-y-1 font-sans">
              <div
                class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 truncate"
              >
                <span>cv-editor.fynx.io.vn</span>
                <span class="text-[10px] text-slate-400">› resume-builder</span>
              </div>
              <a
                href="#"
                class="text-blue-600 dark:text-blue-400 hover:underline text-base font-medium leading-snug block truncate"
                >{{ seoTitle }}</a
              >
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {{ seoDescription }}
              </p>
            </div>
          </div>

          <!-- Social Share Card Preview -->
          <div
            class="bg-white dark:bg-slate-900 border border-theme-border rounded-xl overflow-hidden shadow-sm"
          >
            <div class="px-4 py-2 border-b border-theme-sub flex items-center justify-between">
              <span
                class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                >Social Share Preview</span
              >
              <span
                class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded"
                >Card</span
              >
            </div>
            <div
              class="aspect-[1.91/1] bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center border-b border-theme-sub"
            >
              <div
                class="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/30 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"
              ></div>
              <div class="relative flex flex-col items-center gap-2">
                <div
                  class="w-10 h-10 bg-white dark:bg-slate-950 rounded-xl flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-800"
                >
                  <svg class="w-6 h-6 text-primary-500" viewBox="0 0 462 462">
                    <path
                      d="M397.35 132.52 287.76 22.93a9.61 9.61 0 0 0-7.07-2.93h-179a40 40 0 0 0-40 40v342a40 40 0 0 0 40 40h258.59a40 40 0 0 0 40-40V139.59a10.07 10.07 0 0 0-2.93-7.07zm-31.21-2.93h-60.45a15 15 0 0 1-15-15V54.14zM360.28 422H101.72a20 20 0 0 1-20-20V60a20 20 0 0 1 20-20h169v74.59a35 35 0 0 0 35 35h74.59V402a20 20 0 0 1-20.03 20z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M190.83 174a40.5 40.5 0 1 0-40.5-40.5 40.55 40.55 0 0 0 40.5 40.5zm0-61a20.5 20.5 0 1 1-20.5 20.5 20.53 20.53 0 0 1 20.5-20.5zM132.22 251.5a10 10 0 0 0 10-10v-6.1a37.11 37.11 0 0 1 37.06-37.06h23.1a37.11 37.11 0 0 1 37.06 37.06v6.1a10 10 0 0 0 20 0v-6.1a57.13 57.13 0 0 0-57.06-57.06h-23.1a57.13 57.13 0 0 0-57.06 57.06v6.1a10 10 0 0 0 10 10zM126.65 324.67H248a10 10 0 0 0 0-20H126.65a10 10 0 1 0 0 20zM316.65 357.33h-190a10 10 0 1 0 0 20h190a10 10 0 0 0 0-20z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </div>
                <span
                  class="text-[10px] font-bold tracking-tight text-slate-700 dark:text-slate-300"
                  >CV Workspace & Editor</span
                >
              </div>
            </div>
            <div class="p-3 space-y-0.5 bg-slate-50 dark:bg-slate-900/50">
              <span class="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold"
                >cv-editor.fynx.io.vn</span
              >
              <h4
                class="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 leading-snug"
              >
                {{ seoTitle }}
              </h4>
              <p
                class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed"
              >
                {{ seoDescription }}
              </p>
            </div>
          </div>
        </section>

        <hr v-if="isDev" class="border-theme-sub" />

        <!-- ── Load JSON ── -->
        <section class="space-y-3">
          <h3
            class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
              />
            </svg>
            {{ t('json_input_title') }}
          </h3>
          <label class="block text-xs text-theme-text-muted">{{ t('json_input_label') }}</label>
          <textarea
            id="json-input"
            v-model="jsonInputValue"
            class="w-full font-mono text-[10px] bg-theme-card border border-theme-border rounded-lg p-2.5 text-theme-text focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 h-28 resize-none shadow-sm"
            :placeholder="`{ &quot;cv&quot;: { ... }, &quot;coverLetter&quot;: { ... } }`"
          ></textarea>
          <div class="flex items-center gap-3">
            <button
              id="load-json-text-btn"
              @click="loadJsonFromText"
              class="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md"
            >
              {{ t('load_json') }}
            </button>
            <span
              v-if="jsonLoadError"
              class="text-xs text-rose-500 dark:text-rose-400 font-semibold"
              >{{ t(jsonLoadError as any) }}</span
            >
            <span
              v-if="jsonLoadSuccess"
              class="text-xs text-primary-600 dark:text-primary-400 font-semibold"
              >{{ t('loaded_success') }}</span
            >
          </div>
        </section>

        <hr class="border-theme-sub" />

        <!-- ── About Us ── -->
        <section class="space-y-3">
          <h3
            class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.978 11.978 0 0 1 12 20.25a11.968 11.968 0 0 1-3.008-.386V19.12c0-1.113.285-2.16.786-3.07M12 20.25a11.978 11.978 0 0 1-3.008-.386M3.375 19.4a9.339 9.339 0 0 0 4.125.953 9.379 9.379 0 0 0 2.625-.372M6.75 20.25v-1.13a11.975 11.975 0 0 1 3.008-.387m-3.008.387A11.967 11.967 0 0 1 3.743 19.5a4.125 4.125 0 0 1 7.53-2.493m-4.526 2.117v.003"
              />
            </svg>
            {{ t('about_us') }}
          </h3>
          <div v-if="githubProfiles.length > 0" class="space-y-3 mt-2">
            <a
              v-for="profile in githubProfiles"
              :key="profile.login"
              :href="profile.html_url"
              target="_blank"
              class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="profile.avatar_url"
                  :alt="profile.name || profile.login"
                  class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors truncate">
                      {{ profile.name || profile.login }}
                    </h4>
                    <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                      @{{ profile.login }}
                    </span>
                  </div>
                  <!-- Role Badge -->
                  <div class="flex items-center gap-1.5 mt-0.5 mb-1">
                    <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                      {{ profile.login.toLowerCase() === 'sjnosukequy' ? t('role_creator') : t('role_developer') }}
                    </span>
                  </div>
                  <p class="text-xs text-theme-text-muted line-clamp-1" :title="profile.bio || ''">
                    {{ profile.bio || 'Developer' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between mt-3 pt-3 border-t border-theme-sub/40 text-[11px]">
                <div class="flex items-center gap-4 text-theme-text-sub">
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span class="font-semibold text-theme-text">{{ profile.public_repos }}</span> repos
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="font-semibold text-theme-text">{{ profile.followers }}</span> followers
                  </span>
                </div>
                <span class="text-primary-500 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  View Profile
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>
          </div>
          <div v-else class="space-y-3 mt-2">
            <a
              href="https://github.com/sjnosukequy"
              target="_blank"
              class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors bg-theme-muted flex items-center justify-center text-theme-text-muted">
                  <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors">
                      sjnosukequy
                    </h4>
                    <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                      @sjnosukequy
                    </span>
                  </div>
                  <!-- Role Badge -->
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                      {{ t('role_creator') }}
                    </span>
                  </div>
                </div>
              </div>
            </a>
            <a
              href="https://github.com/Phuongp2003"
              target="_blank"
              class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors bg-theme-muted flex items-center justify-center text-theme-text-muted">
                  <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors">
                      Phuongp2003
                    </h4>
                    <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                      @Phuongp2003
                    </span>
                  </div>
                  <!-- Role Badge -->
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                      {{ t('role_developer') }}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </section>
      </div>
    </template>
  </USlideover>
</template>

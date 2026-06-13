<script setup lang="ts">
import { ref, computed } from 'vue'
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
    "linkedin_placeholder": "string (short display name for preview, e.g. linkedin.com/in/username)",
    "github": "string",
    "github_placeholder": "string (short display name for preview, e.g. github.com/username)",
    "website": "string",
    "website_placeholder": "string (short display name for preview, e.g. mywebsite.com)",
    "summary": "string",
    "objective": "string (leave empty if disabledSections contains 'objective')",
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
  },
  "language": "string (matching the requested language, e.g., 'English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese')",
  "selectedFont": "string (default is 'notosans')",
  "sizeMultiplier": 1.0,
  "customSectionLabels": {
    "summary": "translated label for Summary section in the requested language (e.g. 'Tóm tắt')",
    "objective": "translated label for Objective section in the requested language (e.g. 'Mục tiêu nghề nghiệp')",
    "skills": "translated label for Skills section in the requested language (e.g. 'Kỹ năng')",
    "experience": "translated label for Experience section in the requested language (e.g. 'Kinh nghiệm làm việc')",
    "projects": "translated label for Projects section in the requested language (e.g. 'Dự án')",
    "education": "translated label for Education section in the requested language (e.g. 'Học vấn')",
    "certificates": "translated label for Certificates section in the requested language (e.g. 'Chứng chỉ')"
  },
  "sectionsOrder": ["summary", "skills", "experience", "projects", "education", "certificates"],
  "disabledSections": ["objective"]
}
\`\`\`

## Guidelines

**Metadata (Root-level properties):**
- **language**: Use the exact name of the language requested (e.g., "English" or "Vietnamese").
- **selectedFont**: Choose a matching font key (e.g. "notosans", "roboto", "playfair", "garamond", "inter", "merriweather", "lato"). Default is "notosans".
- **sizeMultiplier**: Float number. Use 1.0 as standard.
- **customSectionLabels**: ALWAYS translate these section names to match the requested CV language. Make them sound professional and standard for the target region.
- **sectionsOrder**: Order the section keys logically (e.g., placing experience or skills first based on experience level).
- **disabledSections**: Set to \`["objective"]\` by default to hide the objective section, unless the user explicitly asks for an objective or you deem it highly relevant for a junior position.

**Summary Section:**
- Only include if you have relevant information that directly relates to the job description.
- Do NOT use generic or boilerplate language (e.g., "passionate", "aspiring").
- Provide a concise summary that highlights skills or background in direct relation to the job.
- Integrate keywords from the job description naturally.

**Experiences Section:**
- Each experience should show position, company, location, employment dates, and bullet points.
- Start each bullet point with a past-tense action verb (or equivalent action structure in non-English languages).
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
- Generate the CV, cover letter, and section labels in the language specified.
- If the language is not specified, default to English.
- If the specified language is "english", DO NOT translate—keep the content fully in English.

## IMPORTANT Requirements
- Only respond with **one** JSON code block exactly as above (no explanations).
- Keep the property names exactly as shown.
- Use "#" for header (description field), "-" for level 1 bullets, and "+" for level 2 bullets in the items array.
- Do NOT add any citation markers like [cite], [^1], [source], [cite_start], or [cite: X]; just plain JSON.
- Use strong, past-tense action verbs in experience bullets.
- Do not use generic phrases like "To whom it may concern" in cover letters.`

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
      </div>
    </template>
  </USlideover>
</template>

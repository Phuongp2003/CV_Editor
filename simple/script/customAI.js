import { readINS } from "../utils/readINS.js";
import { loadHtml, loadCoverLetter } from "./main.js";

const PROMPT_TEMPLATE = document.getElementById('prompt-template');
const COPY_PROMPT_BTN = document.getElementById('copy-prompt-btn');
const JSONTEXTAREA = document.getElementById('json-input');
const JSONTEXTBTN = document.getElementById('load-json-text-btn');
const JSONTEXTERROR = document.getElementById('json-text-error');
const INSprompt = await readINS();

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

function formatJson(json){
    const exps = json.cv.experiences || [];
    exps.forEach(exp => {
        exp.bullets = exp.bullets.join('\n')
    })

    const projects = json.cv.projects || [];
    projects.forEach(proj => {
        proj.bullets = proj.bullets.join('\n')
    })
}

export async function customAIInitialize() {
    PROMPT_TEMPLATE.value = INSprompt.trim();
    if (COPY_PROMPT_BTN && PROMPT_TEMPLATE) {
        COPY_PROMPT_BTN.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(PROMPT_TEMPLATE.value);
                // Optional: small visual feedback could be added later
            } catch (e) {
                console.error('Failed to copy prompt:', e);
            }
        });
    }

    if (JSONTEXTAREA && JSONTEXTBTN) {
        JSONTEXTBTN.addEventListener('click', () => {
            if (JSONTEXTERROR) {
                JSONTEXTERROR.textContent = ''
                JSONTEXTERROR.classList.toggle('text-error', true)
            };
            let raw = JSONTEXTAREA.value;
            if (!raw.trim()) {
                if (JSONTEXTERROR)
                    JSONTEXTERROR.textContent = 'No JSON provided';
                return;
            }

            // Clean up fences + [cite] markers
            raw = preprocessJsonText(raw);

            try {
                const obj = JSON.parse(raw);
                if (!obj || !obj.cv) {
                    if (JSONTEXTERROR)
                        JSONTEXTERROR.textContent = "Invalid format: missing 'cv' field";
                    return;
                }
                formatJson(obj);
                loadHtml(obj.cv);
                if (obj.coverLetter) {
                    loadCoverLetter(obj.coverLetter);
                }
                if (JSONTEXTERROR) {
                    JSONTEXTERROR.textContent = 'Loaded CV JSON successfully';
                    JSONTEXTERROR.classList.toggle('text-error', false)
                }
            } catch (e) {
                console.error('Failed to parse JSON text:', e);
                if (JSONTEXTERROR) JSONTEXTERROR.textContent = 'Invalid JSON';
            }
        });
    }
}
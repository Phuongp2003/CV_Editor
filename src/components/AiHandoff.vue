<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { useAudit } from '@/composables/useAudit'
import { useImport } from '@/composables/useImport'
import { AI_TASKS, AI_ROLES, buildAiPrompt, buildSkillRequest, type AiTask, type AiRole } from '@/utils/aiPrompt'
import { buildShareLink, findHandoffLink, looksLikeCvJson } from '@/utils/handoff'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ initialTask?: AiTask }>()

const store = useCVStore()
const { t } = useI18n()
const { result: audit } = useAudit()
const { importText } = useImport()

const task = ref<AiTask>('create')
function readRole(): AiRole {
  try {
    return (globalThis.localStorage?.getItem('cv_aiRole') as AiRole) || 'se'
  } catch {
    return 'se'
  }
}
const role = ref<AiRole>(readRole())
const includeCv = ref(true)
const reply = ref('')
const copied = ref<'' | 'skill' | 'prompt'>('')

watch(open, (v) => {
  if (!v) return
  task.value = props.initialTask ?? (store.hasContent() ? 'improve' : 'create')
  includeCv.value = store.hasContent() && task.value !== 'create'
  reply.value = ''
})
watch(role, (v) => {
  try {
    globalThis.localStorage?.setItem('cv_aiRole', v)
  } catch {
    /* private mode */
  }
})

const taskInfo = computed(() => AI_TASKS.find((x) => x.id === task.value)!)
const siteUrl = computed(() => window.location.origin + (import.meta.env.BASE_URL || '/'))
const skillZip = computed(() => `${siteUrl.value}cv-editor-skill.zip?v=${import.meta.env.VITE_APP_VERSION || '1.1.1'}`)

// The agent gets the CV as a link it can decode with the skill's script, not as pasted JSON.
const cvLink = ref<string | null>(null)
watchEffect(async () => {
  if (!open.value || !includeCv.value || !store.hasContent()) {
    cvLink.value = null
    return
  }
  cvLink.value = await buildShareLink(store.exportState())
})

const skillRequest = computed(() =>
  buildSkillRequest({
    task: task.value,
    role: role.value,
    siteUrl: siteUrl.value,
    cvLanguage: store.language,
    chatLanguage: store.uiLanguage,
    cvLink: cvLink.value,
    jobDescription: store.jobDescription,
  }),
)

const fullPrompt = computed(() =>
  buildAiPrompt({
    task: task.value,
    role: role.value,
    siteUrl: siteUrl.value,
    cvLanguage: store.language,
    chatLanguage: store.uiLanguage,
    currentCv: includeCv.value && store.hasContent() ? (store.exportState().cv as Record<string, unknown>) : null,
    jobDescription: store.jobDescription,
    audit: audit.value,
  }),
)

const CHATS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Gemini', url: 'https://gemini.google.com/app' },
  { name: 'Claude', url: 'https://claude.ai/new' },
]

async function copy(kind: 'skill' | 'prompt', openUrl?: string) {
  await navigator.clipboard.writeText(kind === 'skill' ? skillRequest.value : fullPrompt.value)
  copied.value = kind
  setTimeout(() => (copied.value = ''), 2500)
  if (openUrl) window.open(openUrl, '_blank', 'noopener')
}

const detected = computed(() => {
  const text = reply.value
  if (!text.trim()) return ''
  if (looksLikeCvJson(text)) return t('ai_detect_json')
  if (findHandoffLink(text)) return t('ai_detect_link')
  return t('ai_detect_none')
})

async function doImport() {
  if (await importText(reply.value)) open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="t('ai_title')" :description="t('ai_desc')" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="flex flex-col gap-6">
        <!-- Step 1: what to do -->
        <section class="flex flex-col gap-3">
          <h3 class="step"><span>1</span>{{ t('ai_step1') }}</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="x in AI_TASKS"
              :key="x.id"
              type="button"
              class="task-card"
              :class="{ active: task === x.id }"
              @click="task = x.id"
            >
              <UIcon :name="x.icon" class="size-4 shrink-0" />
              <span>{{ t(`ai_task_${x.id}` as any) }}</span>
            </button>
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            <UFormField :label="t('ai_role')">
              <USelect v-model="role" :items="AI_ROLES.map((r) => ({ label: r.label, value: r.id }))" class="w-full" />
            </UFormField>
            <UFormField :label="t('cv_language')">
              <USelect
                v-model="store.language"
                :items="['English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese']"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField :label="t('jd_label')" :required="!!taskInfo.needsJd" :help="taskInfo.needsJd ? '' : t('jd_optional')">
            <UTextarea v-model="store.jobDescription" :rows="3" autoresize :maxrows="8" :placeholder="t('jd_placeholder')" class="w-full" />
          </UFormField>
          <UCheckbox v-if="store.hasContent()" v-model="includeCv" :label="t('ai_include_cv')" />
        </section>

        <!-- Step 2: hand it to an AI -->
        <section class="flex flex-col gap-3">
          <h3 class="step"><span>2</span>{{ t('ai_step2') }}</h3>

          <div class="rounded-xl border border-primary/40 bg-primary/5 p-4 flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-highlighted flex items-center gap-2">
                  <UIcon name="i-lucide-puzzle" class="size-4 text-primary" />{{ t('ai_skill_title') }}
                  <UBadge size="sm" variant="soft">{{ t('recommended') }}</UBadge>
                </p>
                <p class="text-xs text-muted mt-1">{{ t('ai_skill_desc') }}</p>
              </div>
              <UButton :to="skillZip" target="_blank" download color="neutral" variant="outline" size="sm" icon="i-lucide-download" :label="t('ai_skill_download')" />
            </div>
            <ul class="text-xs text-muted list-disc pl-5 flex flex-col gap-0.5">
              <li>{{ t('ai_skill_install_code') }} <code class="text-toned">~/.claude/skills/</code></li>
              <li>{{ t('ai_skill_install_app') }}</li>
              <li>{{ t('ai_skill_install_other') }}</li>
            </ul>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                :icon="copied === 'skill' ? 'i-lucide-check' : 'i-lucide-copy'"
                :label="copied === 'skill' ? t('copied') : t('ai_skill_copy')"
                @click="copy('skill')"
              />
              <span class="text-xs text-muted">{{ t('ai_skill_copy_help') }}</span>
            </div>
            <pre class="max-h-40 overflow-auto rounded-lg bg-default border border-default p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all text-toned">{{ skillRequest }}</pre>
          </div>

          <UCollapsible class="rounded-xl border border-default">
            <UButton
              color="neutral"
              variant="ghost"
              block
              icon="i-lucide-message-square"
              trailing-icon="i-lucide-chevron-down"
              :label="t('ai_chat_title')"
              class="justify-between"
            />
            <template #content>
              <div class="px-4 pb-4 flex flex-col gap-3">
                <p class="text-xs text-muted">{{ t('ai_chat_desc') }}</p>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="c in CHATS"
                    :key="c.name"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    trailing-icon="i-lucide-external-link"
                    :label="t('ai_copy_open').replace('{ai}', c.name)"
                    @click="copy('prompt', c.url)"
                  />
                  <UButton
                    size="sm"
                    :icon="copied === 'prompt' ? 'i-lucide-check' : 'i-lucide-copy'"
                    :label="copied === 'prompt' ? t('copied') : t('copy_prompt')"
                    @click="copy('prompt')"
                  />
                </div>
              </div>
            </template>
          </UCollapsible>
        </section>

        <!-- Step 3: bring it back -->
        <section class="flex flex-col gap-3">
          <h3 class="step"><span>3</span>{{ t('ai_step3') }}</h3>
          <p class="text-xs text-muted">{{ t('ai_step3_help') }}</p>
          <UTextarea v-model="reply" :rows="3" autoresize :maxrows="10" :placeholder="t('ai_reply_placeholder')" class="w-full font-mono" />
          <div class="flex items-center gap-3">
            <UButton icon="i-lucide-import" :label="t('ai_import')" :disabled="!reply.trim()" @click="doImport" />
            <span v-if="detected" class="text-xs text-muted">{{ detected }}</span>
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text-highlighted);
}
.step span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 9999px;
  background: var(--ui-primary);
  color: var(--ui-bg);
  font-size: 0.75rem;
}
.task-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ui-border);
  font-size: 0.8125rem;
  text-align: left;
  color: var(--ui-text-toned);
  cursor: pointer;
  transition: border-color 120ms, background-color 120ms;
}
.task-card:hover {
  background: var(--ui-bg-elevated);
}
.task-card.active {
  border-color: var(--ui-primary);
  background: color-mix(in oklab, var(--ui-primary) 10%, transparent);
  color: var(--ui-primary);
  font-weight: 600;
}
</style>

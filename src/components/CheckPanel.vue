<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { useAudit } from '@/composables/useAudit'
import type { Finding, Severity, Category } from '@/utils/cvAudit'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (e: 'fix-with-ai'): void }>()

const store = useCVStore()
const { t } = useI18n()
const { result, scoreColor } = useAudit()

const lang = computed(() => (store.uiLanguage === 'Vietnamese' ? 'Vietnamese' : 'English'))
const filter = ref<Category | 'all'>('all')

const counts = computed(() => {
  const c: Record<Severity, number> = { blocker: 0, major: 0, minor: 0 }
  result.value.findings.forEach((f) => c[f.severity]++)
  return c
})

const categories = computed(() => {
  const cats: { value: Category | 'all'; label: string }[] = [{ value: 'all', label: t('check_all') }]
  ;(['ats', 'slop', 'evidence', 'jd', 'letter'] as Category[]).forEach((c) => {
    if (result.value.findings.some((f) => f.category === c)) cats.push({ value: c, label: t(`check_cat_${c}` as any) })
  })
  return cats
})

const visible = computed(() =>
  result.value.findings.filter((f) => filter.value === 'all' || f.category === filter.value),
)

const SEVERITY_COLOR: Record<Severity, 'error' | 'warning' | 'neutral'> = {
  blocker: 'error',
  major: 'warning',
  minor: 'neutral',
}

function goTo(f: Finding) {
  if (!f.target) return
  store.activeWorkspace = 'cv'
  store.activeSectionTab = f.target.section
  if (f.target.index !== undefined) {
    const key = `${f.target.section === 'experience' ? 'exp' : f.target.section}-${f.target.index}`
    store.collapsedItems[key] = false
  }
  open.value = false
}
</script>

<template>
  <USlideover v-model:open="open" :title="t('check_title')" :description="t('check_desc')" :ui="{ content: 'max-w-xl' }">
    <template #body>
      <div class="flex flex-col gap-5">
        <!-- Score -->
        <div class="flex items-center gap-4">
          <div
            class="size-20 rounded-full flex flex-col items-center justify-center border-4 shrink-0"
            :class="{
              'border-success text-success': scoreColor === 'success',
              'border-warning text-warning': scoreColor === 'warning',
              'border-error text-error': scoreColor === 'error',
            }"
          >
            <span class="text-2xl font-bold leading-none">{{ result.score }}</span>
            <span class="text-[10px] uppercase tracking-wide">/100</span>
          </div>
          <div class="flex flex-col gap-1.5 text-sm">
            <div class="flex flex-wrap gap-1.5">
              <UBadge color="error" variant="soft">{{ counts.blocker }} blocker</UBadge>
              <UBadge color="warning" variant="soft">{{ counts.major }} major</UBadge>
              <UBadge color="neutral" variant="soft">{{ counts.minor }} minor</UBadge>
            </div>
            <p class="text-xs text-muted">
              {{ result.stats.bullets }} bullets · {{ result.stats.avgWords }} {{ t('words_avg') }} ·
              {{ Math.round(result.stats.labelRatio * 100) }}% "Label:" · {{ result.stats.density }} {{ t('density_unit') }}
              <template v-if="store.pdfPageCount"> · {{ store.pdfPageCount }} {{ store.pdfPageCount > 1 ? t('pages') : t('page') }}</template>
            </p>
          </div>
        </div>

        <!-- Job description -->
        <UCollapsible :default-open="!!store.jobDescription">
          <UButton
            color="neutral"
            variant="subtle"
            block
            icon="i-lucide-briefcase-business"
            trailing-icon="i-lucide-chevron-down"
            :label="store.jobDescription ? t('jd_added', ) + ` (${result.stats.jdProven}/${result.stats.jdTerms})` : t('jd_add')"
            class="justify-between"
          />
          <template #content>
            <UTextarea
              v-model="store.jobDescription"
              :rows="6"
              autoresize
              :maxrows="14"
              :placeholder="t('jd_placeholder')"
              class="w-full mt-2"
            />
          </template>
        </UCollapsible>

        <!-- Filters -->
        <div class="flex flex-wrap gap-1.5">
          <UButton
            v-for="c in categories"
            :key="c.value"
            size="xs"
            :color="filter === c.value ? 'primary' : 'neutral'"
            :variant="filter === c.value ? 'soft' : 'ghost'"
            :label="c.label"
            @click="filter = c.value"
          />
        </div>

        <!-- Findings -->
        <div v-if="visible.length" class="flex flex-col gap-2.5">
          <article v-for="f in visible" :key="f.id" class="rounded-lg border border-default p-3 flex flex-col gap-1.5">
            <div class="flex items-start gap-2">
              <UBadge :color="SEVERITY_COLOR[f.severity]" variant="subtle" size="sm" class="shrink-0 capitalize">{{ f.severity }}</UBadge>
              <h3 class="flex-1 text-sm font-semibold text-highlighted leading-snug">{{ f.title[lang] }}</h3>
              <UButton v-if="f.target" size="xs" variant="ghost" trailing-icon="i-lucide-arrow-right" :label="t('go_to')" @click="goTo(f)" />
            </div>
            <p class="text-xs text-muted leading-relaxed">{{ f.detail[lang] }}</p>
            <div v-if="f.quotes?.length" class="flex flex-wrap gap-1">
              <code v-for="q in f.quotes" :key="q" class="text-[11px] px-1.5 py-0.5 rounded bg-elevated text-toned">{{ q }}</code>
            </div>
          </article>
        </div>
        <div v-else class="rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted">
          <UIcon name="i-lucide-badge-check" class="size-6 text-success mb-1" />
          <p>{{ t('check_clean') }}</p>
        </div>

        <p class="text-[11px] text-dimmed leading-relaxed">{{ t('check_disclaimer') }}</p>
      </div>
    </template>
    <template #footer>
      <UButton icon="i-lucide-sparkles" :label="t('fix_with_ai')" block @click="emit('fix-with-ai')" />
    </template>
  </USlideover>
</template>

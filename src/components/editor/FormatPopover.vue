<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const store = useCVStore()
const { t } = useI18n()
const {
  template,
  language,
  selectedFont,
  customFontName,
  sizeMultiplier,
  experienceHeaderStyle,
  experienceCompanyMode,
  bulletChars,
} =
  storeToRefs(store)

const templates = computed(() => [
  { label: t('template_harvard'), value: 'harvard' },
  { label: t('template_modern'), value: 'modern' },
])
const languages = [
  { label: 'English', value: 'English' },
  { label: 'Tiếng Việt', value: 'Vietnamese' },
  { label: '日本語', value: 'Japanese' },
  { label: '한국어', value: 'Korean' },
  { label: '中文', value: 'Chinese' },
]
const fonts = computed(() => [
  { label: t('font_times'), value: 'times' },
  { label: t('font_garamond'), value: 'garamond' },
  { label: t('font_arial'), value: 'arial' },
  { label: t('font_custom'), value: 'custom' },
])
const headerStyles = computed(() => [
  { label: t('style_classic'), value: 'classic' },
  { label: t('style_role_company'), value: 'role-company' },
  { label: t('style_one_line'), value: 'one-line' },
])
const experienceCompanyModes = computed(() => [
  { label: t('experience_mode_separate_titles'), value: 'separate-titles' },
  { label: t('experience_mode_single_title'), value: 'single-title' },
])
</script>

<template>
  <UPopover :content="{ align: 'start', side: 'bottom', sideOffset: 6 }">
    <UButton color="neutral" variant="outline" icon="i-lucide-sliders-horizontal" :label="t('format_btn')" block />
    <template #content>
      <div class="w-80 p-4 flex flex-col gap-3.5">
        <UFormField :label="t('template_label')" :help="template === 'harvard' ? t('template_harvard_help') : ''">
          <USelect v-model="template" :items="templates" class="w-full" />
        </UFormField>
        <UFormField :label="t('cv_language')">
          <USelect v-model="language" :items="languages" class="w-full" />
        </UFormField>
        <UFormField :label="t('font_family')" :help="t('font_help')">
          <USelect v-model="selectedFont" :items="fonts" class="w-full" />
        </UFormField>
        <UFormField v-if="selectedFont === 'custom'" :label="t('custom_font_name')">
          <UInput v-model="customFontName" :placeholder="t('custom_font_placeholder')" class="w-full" />
        </UFormField>
        <UFormField :label="`${t('size_multiplier')} · ${sizeMultiplier.toFixed(2)}x`">
          <USlider v-model="sizeMultiplier" :min="0.8" :max="1.4" :step="0.05" />
        </UFormField>
        <UFormField :label="t('exp_header_style')">
          <USelect v-model="experienceHeaderStyle" :items="headerStyles" class="w-full" />
        </UFormField>
        <UFormField :label="t('experience_company_mode')">
          <USelect v-model="experienceCompanyMode" :items="experienceCompanyModes" class="w-full" />
        </UFormField>
        <UFormField :label="t('bullet_chars')">
          <div class="grid grid-cols-3 gap-2">
            <UInput v-model="bulletChars.l1" class="text-center" :ui="{ base: 'text-center' }" aria-label="L1" />
            <UInput v-model="bulletChars.l2" :ui="{ base: 'text-center' }" aria-label="L2" />
            <UInput v-model="bulletChars.l3" :ui="{ base: 'text-center' }" aria-label="L3" />
          </div>
        </UFormField>
      </div>
    </template>
  </UPopover>
</template>

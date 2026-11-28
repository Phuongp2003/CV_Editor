<script setup lang="ts">
import { computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import BulletPartsEditor from '@/components/editor/BulletPartsEditor.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import DraggableList from '@/components/editor/core/DraggableList.vue'
import DraggableItemCard from '@/components/editor/core/DraggableItemCard.vue'
import type { BulletPart, CustomSectionEntry, Skill } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()
const props = defineProps<{ sectionKey?: string }>()
const isCustom = computed(() => !!props.sectionKey?.startsWith('custom:'))
const customSection = computed(() => isCustom.value
  ? store.cvData.customSections?.find((section) => `custom:${section.id}` === props.sectionKey)
  : undefined)
const customPreset = computed({
  get: () => customSection.value?.preset ?? 'experience',
  set: (value: 'experience' | 'summary' | 'skills') => { if (customSection.value) customSection.value.preset = value },
})
const customSummaryText = computed({
  get: () => customSection.value?.summaryText ?? '',
  set: (value: string) => { if (customSection.value) customSection.value.summaryText = value },
})
const customSkills = computed({
  get: () => customSection.value?.skills ?? [],
  set: (value: Skill[]) => { if (customSection.value) customSection.value.skills = value },
})
const customPresets = computed(() => store.uiLanguage === 'Vietnamese'
  ? [{ label: 'Summary', value: 'summary' }, { label: 'Kinh nghiệm', value: 'experience' }, { label: 'Kỹ năng', value: 'skills' }]
  : [{ label: 'Summary', value: 'summary' }, { label: 'Experience', value: 'experience' }, { label: 'Skills', value: 'skills' }])
const customExperienceStyles = computed(() => store.uiLanguage === 'Vietnamese'
  ? [
      { label: 'Công ty → chức danh (tùy chọn)', value: 'hierarchy' },
      { label: 'Theo định dạng Experience chung', value: 'inherit' },
      { label: 'Classic', value: 'classic' },
      { label: 'Chức danh → công ty', value: 'role-company' },
      { label: 'Một dòng', value: 'one-line' },
    ]
  : [
      { label: 'Company → optional job title', value: 'hierarchy' },
      { label: 'Use global Experience style', value: 'inherit' },
      { label: 'Classic', value: 'classic' },
      { label: 'Role → company', value: 'role-company' },
      { label: 'One line', value: 'one-line' },
    ])
const entries = computed<CustomSectionEntry[]>({
  get: () => props.sectionKey?.startsWith('custom:')
    ? store.cvData.customSections?.find((section) => `custom:${section.id}` === props.sectionKey)?.entries ?? []
    : store.cvData.experiences as CustomSectionEntry[],
  set: (value: CustomSectionEntry[]) => {
    if (!props.sectionKey?.startsWith('custom:')) store.cvData.experiences = value
    else {
      const section = store.cvData.customSections?.find((item) => `custom:${item.id}` === props.sectionKey)
      if (section) section.entries = value
    }
  },
})

function addExperience() {
  entries.value.push({
    position: '',
    company: '',
    location: '',
    dates: '',
    ...(isCustom.value ? { positionDates: '' } : {}),
    bullets: [],
  } as CustomSectionEntry)
}

function addCustomSkill() {
  customSkills.value.push({ skill: '', description: '' })
}

function removeCustomSkill(index: number) {
  customSkills.value.splice(index, 1)
}

function removeExperience(index: number) {
  entries.value.splice(index, 1)
}

function updateBullets(index: number, bullets: BulletPart[]) {
  if (entries.value[index]) {
    entries.value[index].bullets = bullets
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UButton v-if="isCustom" icon="i-lucide-trash-2" color="error" variant="soft" size="sm" class="self-end" @click="store.removeCustomSection(props.sectionKey as `custom:${string}`)">{{ store.uiLanguage === 'Vietnamese' ? 'Xóa mục này' : 'Delete this section' }}</UButton>

    <template v-if="isCustom && customSection">
      <UFormField :label="store.uiLanguage === 'Vietnamese' ? 'Preset nội dung' : 'Content preset'">
        <USelect v-model="customPreset" :items="customPresets" class="w-full" />
      </UFormField>

      <UFormField v-if="customPreset === 'summary'" :label="store.uiLanguage === 'Vietnamese' ? 'Nội dung' : 'Content'" :help="store.uiLanguage === 'Vietnamese' ? 'Nội dung hiển thị ngay dưới header mục.' : 'Content appears directly below the section header.'">
        <RichTextEditor v-model="customSummaryText" :placeholder="store.uiLanguage === 'Vietnamese' ? 'Nhập nội dung...' : 'Write the section content...'" editor-class="min-h-[100px]" />
      </UFormField>

      <template v-else-if="customPreset === 'skills'">
        <DraggableList v-model="customSkills" dragWidth="420px" :ghostTitle="store.uiLanguage === 'Vietnamese' ? 'Nhóm kỹ năng' : 'Skill group'" ghostTitleKey="skill" ghostSubtitleKey="description">
          <DraggableItemCard v-for="(skill, index) in customSkills" :key="index" :index="index" :item="skill" :collapseKey="`custom-skills-${index}`" :headerPlaceholder="skill.skill || (store.uiLanguage === 'Vietnamese' ? 'Nhóm kỹ năng mới' : 'New skill group')" @delete="removeCustomSkill(index)">
            <div class="flex flex-col gap-3">
              <UFormField :label="store.uiLanguage === 'Vietnamese' ? 'Tên nhóm' : 'Group name'"><UInput v-model="skill.skill" class="w-full" /></UFormField>
              <UFormField :label="store.uiLanguage === 'Vietnamese' ? 'Nội dung' : 'Content'"><RichTextEditor v-model="skill.description" placeholder="JavaScript, Python..." editor-class="min-h-[50px]" /></UFormField>
            </div>
          </DraggableItemCard>
        </DraggableList>
        <button class="btn-add cursor-pointer font-bold select-none" @click="addCustomSkill">{{ store.uiLanguage === 'Vietnamese' ? 'Thêm nhóm kỹ năng' : 'Add skill group' }}</button>
      </template>

      <template v-else>
        <UFormField :label="store.uiLanguage === 'Vietnamese' ? 'Kiểu trình bày entry' : 'Entry layout style'">
          <USelect v-model="customSection.experienceStyle" :items="customExperienceStyles" class="w-full" />
        </UFormField>
        <div v-if="customSection.experienceStyle === 'hierarchy'" class="rounded-lg border border-default p-3 flex flex-col gap-2">
          <p class="text-sm font-semibold">{{ store.uiLanguage === 'Vietnamese' ? 'Thứ bậc header' : 'Header hierarchy' }}</p>
          <label class="flex items-center gap-2 text-sm"><input v-model="customSection.showCompanyDates" type="checkbox" />{{ store.uiLanguage === 'Vietnamese' ? 'Ngày ở H2 (công ty)' : 'Date on H2 (company)' }}</label>
          <label class="flex items-center gap-2 text-sm"><input v-model="customSection.showPosition" type="checkbox" />{{ store.uiLanguage === 'Vietnamese' ? 'Hiện H3 (chức danh)' : 'Show H3 (job title)' }}</label>
          <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-50': !customSection.showPosition }"><input v-model="customSection.showPositionDates" type="checkbox" :disabled="!customSection.showPosition" />{{ store.uiLanguage === 'Vietnamese' ? 'Ngày ở H3 (chức danh)' : 'Date on H3 (job title)' }}</label>
          <p class="text-xs text-dimmed">{{ store.uiLanguage === 'Vietnamese' ? 'H2 là công ty; mô tả và bullet nằm dưới header nhỏ nhất đang bật.' : 'H2 is the company; descriptions and bullets follow the smallest enabled header.' }}</p>
        </div>
      </template>
    </template>

    <template v-if="!isCustom || customPreset === 'experience'">
    <DraggableList
      v-model="entries"
      dragWidth="420px"
      :ghostTitle="t('experience_title') || 'Experience'"
      ghostTitleKey="company"
      ghostSubtitleKey="position"
    >
      <DraggableItemCard
        v-for="(exp, index) in entries"
        :key="index"
        :index="index"
        :item="exp"
        :collapseKey="`exp-${index}`"
        :headerPlaceholder="exp.company || exp.position || t('experience_card')"
        @delete="removeExperience(index)"
      >
        <!-- Fields -->
        <div class="grid grid-cols-2 gap-3">
          <div v-if="!isCustom || customSection?.experienceStyle !== 'hierarchy' || customSection?.showPosition" class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('position') }}</label>
            <input v-model="exp.position" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('company') }}</label>
            <input v-model="exp.company" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('exp_location') }}</label>
            <input v-model="exp.location" type="text" class="input-field" />
          </div>
          <div v-if="!isCustom || customSection?.experienceStyle !== 'hierarchy' || customSection?.showCompanyDates" class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('dates') }}</label>
            <input v-model="exp.dates" type="text" class="input-field" />
          </div>
          <div v-if="isCustom && customSection?.experienceStyle === 'hierarchy' && customSection.showPositionDates && customSection.showPosition" class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ store.uiLanguage === 'Vietnamese' ? 'Ngày chức danh (H3)' : 'Job title dates (H3)' }}</label>
            <input v-model="exp.positionDates" type="text" class="input-field" />
          </div>
        </div>

        <!-- Bullet Parts -->
        <BulletPartsEditor :bullets="exp.bullets" @update:bullets="updateBullets(index, $event)" />

        <!-- Collapsed Preview -->
        <template #preview>
          <div class="flex justify-between items-center text-xs">
            <div class="font-bold text-theme-text-sub truncate max-w-[280px]">
              {{ exp.company || t('new_company') }}
              <span v-if="exp.position" class="font-normal text-theme-text-muted"
                >| {{ exp.position }}</span
              >
            </div>
            <div v-if="exp.dates" class="text-[10px] text-theme-text-muted flex-shrink-0 ml-2">
              {{ exp.dates }}
            </div>
          </div>
        </template>
      </DraggableItemCard>
    </DraggableList>

    <button @click="addExperience" class="btn-add cursor-pointer font-bold select-none">
      {{ isCustom ? (store.uiLanguage === 'Vietnamese' ? 'Thêm entry' : 'Add entry') : t('add_experience') }}
    </button>
    </template>
  </div>
</template>

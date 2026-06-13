<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import DraggableList from '@/components/editor/core/DraggableList.vue'
import DraggableItemCard from '@/components/editor/core/DraggableItemCard.vue'
import type { Education } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

function addEducation() {
  store.cvData.educations.push({
    university: '',
    degree: '',
    gpa: '',
    graduationDate: '',
  } as Education)
}

function removeEducation(index: number) {
  store.cvData.educations.splice(index, 1)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <DraggableList
      v-model="store.cvData.educations"
      dragWidth="420px"
      :ghostTitle="t('education_title') || 'Education'"
      ghostTitleKey="university"
      ghostSubtitleKey="degree"
    >
      <DraggableItemCard
        v-for="(edu, index) in store.cvData.educations"
        :key="index"
        :index="index"
        :item="edu"
        :collapseKey="`education-${index}`"
        :headerPlaceholder="edu.university || edu.degree || 'Education Card'"
        @delete="removeEducation(index)"
      >
        <!-- Card Body Fields -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('university') }}</label>
            <input v-model="edu.university" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('degree') }}</label>
            <input v-model="edu.degree" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('gpa') }}</label>
            <input v-model="edu.gpa" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('graduation') }}</label>
            <input v-model="edu.graduationDate" type="text" class="input-field" />
          </div>
        </div>

        <!-- Collapsed Preview Slot -->
        <template #preview>
          <div class="flex justify-between items-center text-xs">
            <div class="font-bold text-theme-text-sub truncate max-w-[280px]">
              {{ edu.university || 'New University' }}
              <span v-if="edu.degree" class="font-normal text-theme-text-muted"
                >| {{ edu.degree }}</span
              >
            </div>
            <div class="text-[10px] text-theme-text-muted flex-shrink-0 ml-2">
              <span v-if="edu.gpa" class="mr-2">GPA: {{ edu.gpa }}</span>
              <span>{{ edu.graduationDate }}</span>
            </div>
          </div>
        </template>
      </DraggableItemCard>
    </DraggableList>

    <button @click="addEducation" class="btn-add cursor-pointer font-bold select-none">
      {{ t('add_education') }}
    </button>
  </div>
</template>

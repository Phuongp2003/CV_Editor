<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import BulletPartsEditor from '@/components/editor/BulletPartsEditor.vue'
import DraggableList from '@/components/editor/core/DraggableList.vue'
import DraggableItemCard from '@/components/editor/core/DraggableItemCard.vue'
import type { BulletPart, Experience } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

function addExperience() {
  store.cvData.experiences.push({
    position: '',
    company: '',
    location: '',
    dates: '',
    bullets: [],
  } as Experience)
}

function removeExperience(index: number) {
  store.cvData.experiences.splice(index, 1)
}

function updateBullets(index: number, bullets: BulletPart[]) {
  if (store.cvData.experiences[index]) {
    store.cvData.experiences[index].bullets = bullets
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <DraggableList
      v-model="store.cvData.experiences"
      dragWidth="420px"
      :ghostTitle="t('experience_title') || 'Experience'"
      ghostTitleKey="company"
      ghostSubtitleKey="position"
    >
      <DraggableItemCard
        v-for="(exp, index) in store.cvData.experiences"
        :key="index"
        :index="index"
        :item="exp"
        :collapseKey="`exp-${index}`"
        :headerPlaceholder="exp.company || exp.position || t('experience_card')"
        @delete="removeExperience(index)"
      >
        <!-- Fields -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
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
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('dates') }}</label>
            <input v-model="exp.dates" type="text" class="input-field" />
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
      {{ t('add_experience') }}
    </button>
  </div>
</template>

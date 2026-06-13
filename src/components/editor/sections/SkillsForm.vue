<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import DraggableList from '@/components/editor/core/DraggableList.vue'
import DraggableItemCard from '@/components/editor/core/DraggableItemCard.vue'
import type { Skill } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

function addSkill() {
  store.cvData.skills.push({ skill: '', description: '' } as Skill)
}

function removeSkill(index: number) {
  store.cvData.skills.splice(index, 1)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <DraggableList
      v-model="store.cvData.skills"
      dragWidth="420px"
      :ghostTitle="t('skills_title') || 'Skills'"
      ghostTitleKey="skill"
      ghostSubtitleKey="description"
    >
      <DraggableItemCard
        v-for="(skill, index) in store.cvData.skills"
        :key="index"
        :index="index"
        :item="skill"
        :collapseKey="`skills-${index}`"
        :headerPlaceholder="skill.skill || 'New Skill Group'"
        @delete="removeSkill(index)"
      >
        <!-- Card Body Fields -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('skill_name') }}</label>
            <input
              v-model="skill.skill"
              type="text"
              class="input-field"
              placeholder="e.g. Languages"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold"
              >{{ t('skill_desc') }}
              <span class="text-theme-text-muted font-normal"
                >(supports *italic* and **bold**)</span
              ></label
            >
            <input
              v-model="skill.description"
              type="text"
              class="input-field"
              placeholder="JavaScript, Python..."
            />
          </div>
        </div>

        <!-- Collapsed Preview Slot -->
        <template #preview>
          <div class="flex justify-between items-center text-xs">
            <div class="font-bold text-theme-text-sub truncate max-w-[180px]">
              {{ skill.skill || 'New Skill Group' }}
            </div>
            <div
              v-if="skill.description"
              class="text-[10px] text-theme-text-muted truncate max-w-[220px] flex-shrink-0 ml-2"
            >
              {{ skill.description }}
            </div>
          </div>
        </template>
      </DraggableItemCard>
    </DraggableList>

    <button @click="addSkill" class="btn-add cursor-pointer font-bold select-none">
      {{ t('add_skill') }}
    </button>
  </div>
</template>

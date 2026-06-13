<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import BulletPartsEditor from '@/components/editor/BulletPartsEditor.vue'
import DraggableList from '@/components/editor/core/DraggableList.vue'
import DraggableItemCard from '@/components/editor/core/DraggableItemCard.vue'
import type { BulletPart, Project } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

function addProject() {
  const newIndex = store.cvData.projects.length
  store.cvData.projects.push({
    projectName: '',
    projectLink: '',
    bullets: [],
  } as Project)
  // Ensure the new project is not collapsed initially
  const key = `projects-${newIndex}`
  if (store.collapsedItems[key]) {
    store.collapsedItems[key] = false
  }
}

function removeProject(index: number) {
  store.cvData.projects.splice(index, 1)
}

function updateBullets(index: number, bullets: BulletPart[]) {
  if (store.cvData.projects[index]) {
    store.cvData.projects[index].bullets = bullets
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <DraggableList
      v-model="store.cvData.projects"
      dragWidth="420px"
      :ghostTitle="t('projects_title') || 'Projects'"
      ghostTitleKey="projectName"
      ghostSubtitleKey="projectLink"
    >
      <DraggableItemCard
        v-for="(proj, index) in store.cvData.projects"
        :key="index"
        :index="index"
        :item="proj"
        :collapseKey="`projects-${index}`"
        :headerPlaceholder="proj.projectName || 'New Project'"
        @delete="removeProject(index)"
      >
        <!-- Card Body Fields -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('project_name') }}</label>
            <input v-model="proj.projectName" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('project_link') }}</label>
            <input v-model="proj.projectLink" type="text" class="input-field" />
          </div>
        </div>

        <!-- Bullet Parts Editor -->
        <BulletPartsEditor :bullets="proj.bullets" @update:bullets="updateBullets(index, $event)" />

        <!-- Collapsed Preview Slot -->
        <template #preview>
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-theme-text-sub truncate max-w-[260px]">
              {{
                proj.projectName ||
                (store.uiLanguage === 'Vietnamese' ? 'Dự án mới' : 'New Project')
              }}
            </span>
            <span
              v-if="proj.projectLink"
              class="text-[10px] text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[150px] ml-2"
            >
              {{ proj.projectLink }}
            </span>
          </div>
        </template>
      </DraggableItemCard>
    </DraggableList>

    <button @click="addProject" class="btn-add cursor-pointer font-bold select-none">
      {{ t('add_project') }}
    </button>
  </div>
</template>

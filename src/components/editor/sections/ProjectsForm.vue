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
    overview: '',
    dates: '',
    technologies: '',
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
    <div class="flex flex-col gap-1">
      <label class="text-xs text-theme-text-sub font-semibold">{{ store.uiLanguage === 'Vietnamese' ? 'Dòng giới thiệu dự án' : 'Projects intro line' }}</label>
      <input v-model="store.cvData.projectIntro" type="text" class="input-field" placeholder="Selected projects at PRIMAS Co. Ltd" />
    </div>
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
        :headerPlaceholder="proj.projectName || t('new_project')"
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
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('dates') }}</label>
            <input v-model="proj.dates" type="text" class="input-field" placeholder="05/2024 - 11/2026" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ store.uiLanguage === 'Vietnamese' ? 'Công nghệ' : 'Technologies' }}</label>
            <input v-model="proj.technologies" type="text" class="input-field" placeholder="C# · Python · TypeScript" />
          </div>
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-xs text-theme-text-sub font-semibold">{{ store.uiLanguage === 'Vietnamese' ? 'Tổng quan dự án' : 'Project overview' }}</label>
            <textarea v-model="proj.overview" rows="3" class="input-field resize-y" :placeholder="store.uiLanguage === 'Vietnamese' ? 'Hệ thống làm gì, thuộc domain nào, phục vụ ai, quy mô đã xác minh ra sao?' : 'What the system does, its domain and users, and its verified scope or scale'" />
          </div>
        </div>

        <!-- Bullet Parts Editor -->
        <p class="text-xs text-theme-text-muted">{{ t('project_contribution_help') }}</p>
        <BulletPartsEditor :bullets="proj.bullets" @update:bullets="updateBullets(index, $event)" />

        <!-- Collapsed Preview Slot -->
        <template #preview>
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-theme-text-sub truncate max-w-[260px]">
              {{ proj.projectName || t('new_project') }}
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

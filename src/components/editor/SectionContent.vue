<script setup lang="ts">
/**
 * SectionContent — routes activeTab to the correct form component.
 * Used by both TabMode and OutlineMode to avoid duplication.
 */
import PersonalForm from '@/components/editor/sections/PersonalForm.vue'
import SummaryForm from '@/components/editor/sections/SummaryForm.vue'
import ObjectiveForm from '@/components/editor/sections/ObjectiveForm.vue'
import SkillsForm from '@/components/editor/sections/SkillsForm.vue'
import ExperienceForm from '@/components/editor/sections/ExperienceForm.vue'
import ProjectsForm from '@/components/editor/sections/ProjectsForm.vue'
import EducationForm from '@/components/editor/sections/EducationForm.vue'
import CertificatesForm from '@/components/editor/sections/CertificatesForm.vue'
import { useCVStore } from '@/stores/cv'

defineProps<{
  activeTab: string
}>()

const store = useCVStore()
</script>

<template>
  <PersonalForm v-if="activeTab === 'personal'" />
  <SummaryForm v-else-if="activeTab === 'summary'" />
  <ObjectiveForm v-else-if="activeTab === 'objective'" />
  <SkillsForm v-else-if="activeTab === 'skills'" />
  <ExperienceForm v-else-if="activeTab === 'experience'" />
  <ProjectsForm v-else-if="activeTab === 'projects'" />
  <EducationForm v-else-if="activeTab === 'education'" />
  <CertificatesForm v-else-if="activeTab === 'certificates'" />
  <div v-else-if="activeTab === 'page-break'" class="space-y-3 p-4">
    <h2 class="text-base font-semibold">{{ store.uiLanguage === 'Vietnamese' ? 'Ngắt trang' : 'Page break' }}</h2>
    <p class="text-sm text-dimmed">{{ store.uiLanguage === 'Vietnamese' ? 'Phần tiếp theo sẽ bắt đầu ở trang mới. Kéo mục này trong danh sách để đặt vị trí ngắt.' : 'The next section starts on a new page. Drag this item in the section list to place the break.' }}</p>
    <UButton color="neutral" variant="soft" icon="i-lucide-trash-2" @click="store.removePageBreak()">{{ store.uiLanguage === 'Vietnamese' ? 'Xóa ngắt trang' : 'Remove page break' }}</UButton>
  </div>
  <ExperienceForm v-else-if="activeTab.startsWith('custom:')" :section-key="activeTab" />
</template>

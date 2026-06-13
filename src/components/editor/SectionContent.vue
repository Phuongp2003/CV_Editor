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

defineProps<{
  activeTab: string
}>()
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
</template>

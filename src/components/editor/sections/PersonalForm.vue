<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import AvatarPicker from '@/components/editor/AvatarPicker.vue'

const store = useCVStore()
const { t } = useI18n()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <AvatarPicker class="md:col-span-2" />

    <!-- Contact Info Input Fields -->
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">{{ t('full_name') }}</label>
      <input v-model="store.cvData.name" type="text" class="input-field" />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">{{ t('email') }}</label>
      <input v-model="store.cvData.email" type="email" class="input-field" />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">{{ t('phone') }}</label>
      <input v-model="store.cvData.phone" type="text" class="input-field" />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">{{ t('location') }}</label>
      <input v-model="store.cvData.location" type="text" class="input-field" />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted flex justify-between">
        <span>{{ t('github_link') }}</span>
        <span class="text-[10px] text-theme-text-muted font-normal">{{ t('url_auto_https') }}</span>
      </label>
      <input
        v-model="store.cvData.github"
        type="text"
        class="input-field"
        :placeholder="t('github_placeholder_eg')"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">{{ t('github_display') }}</label>
      <input
        v-model="store.cvData.github_placeholder"
        type="text"
        class="input-field"
        :placeholder="t('github_placeholder_eg')"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted flex justify-between">
        <span>{{ t('linkedin_link') }}</span>
        <span class="text-[10px] text-theme-text-muted font-normal">{{ t('url_auto_https') }}</span>
      </label>
      <input
        v-model="store.cvData.linkedin"
        type="text"
        class="input-field"
        :placeholder="t('linkedin_placeholder_eg')"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">{{ t('linkedin_display') }}</label>
      <input
        v-model="store.cvData.linkedin_placeholder"
        type="text"
        class="input-field"
        :placeholder="t('linkedin_placeholder_eg')"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted flex justify-between">
        <span>{{ t('website') }}</span>
        <span class="text-[10px] text-theme-text-muted font-normal">{{ t('url_auto_https') }}</span>
      </label>
      <input
        v-model="store.cvData.website"
        type="text"
        class="input-field"
        :placeholder="t('website_placeholder_eg')"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">{{ t('website_display') }}</label>
      <input
        v-model="store.cvData.website_placeholder"
        type="text"
        class="input-field"
        :placeholder="t('website_placeholder_eg')"
      />
    </div>
  </div>
</template>

<style scoped>
/* Using global .input-field class from index.css */
</style>

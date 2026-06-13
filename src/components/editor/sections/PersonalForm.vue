<script setup lang="ts">
import { ref } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const store = useCVStore()
const { t } = useI18n()

const errorMsg = ref('')

function handleImageUpload(e: Event) {
  errorMsg.value = ''
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    errorMsg.value = 'Unsupported image type. Please upload PNG, JPEG, or WEBP.'
    target.value = ''
    return
  }

  // Validate size < 5MB
  if (file.size > 5 * 1024 * 1024) {
    errorMsg.value = 'Image is too large. Maximum size is 5MB.'
    target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    if (event.target?.result) {
      store.cvData.profileImage = event.target.result as string
      store.cvData.profileImageType = file.type
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

function removeImage() {
  store.cvData.profileImage = null
  store.cvData.profileImageType = null
  errorMsg.value = ''
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Profile Image Upload Section -->
    <div
      class="flex flex-col gap-2 md:col-span-2 bg-theme-muted/50 p-4 border border-theme-border rounded-xl"
    >
      <label class="text-xs text-theme-text-muted font-bold uppercase tracking-wider">
        {{ t('profile_picture') }}
      </label>
      <div class="flex items-center gap-4">
        <!-- Preview Avatar or Placeholder -->
        <div
          class="w-16 h-16 rounded-full overflow-hidden border border-theme-border bg-theme-card flex-shrink-0 flex items-center justify-center shadow-inner"
        >
          <img
            v-if="store.cvData.profileImage"
            :src="store.cvData.profileImage"
            class="w-full h-full object-cover"
            alt="Profile Avatar"
          />
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-8 h-8 text-theme-text-muted"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </div>

        <!-- Controls -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <label
              class="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md select-none"
            >
              {{ t('choose_image') }}
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                class="hidden"
                @change="handleImageUpload"
              />
            </label>
            <button
              v-if="store.cvData.profileImage"
              @click="removeImage"
              type="button"
              class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md"
            >
              {{ t('remove_image') }}
            </button>
          </div>
          <p class="text-[10px] text-theme-text-muted">PNG, JPEG, WEBP. Max 5MB.</p>
        </div>
      </div>
      <!-- Error Message -->
      <span v-if="errorMsg" class="text-xs text-rose-500 font-semibold" role="alert">
        {{ errorMsg }}
      </span>
    </div>

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
        <span class="text-[10px] text-theme-text-muted font-normal"
          >(adds https:// if missing)</span
        >
      </label>
      <input
        v-model="store.cvData.github"
        type="text"
        class="input-field"
        placeholder="e.g. github.com/username"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">GitHub Display Text (Preview)</label>
      <input
        v-model="store.cvData.github_placeholder"
        type="text"
        class="input-field"
        placeholder="e.g. github.com/username"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted flex justify-between">
        <span>{{ t('linkedin_link') }}</span>
        <span class="text-[10px] text-theme-text-muted font-normal"
          >(adds https:// if missing)</span
        >
      </label>
      <input
        v-model="store.cvData.linkedin"
        type="text"
        class="input-field"
        placeholder="e.g. linkedin.com/in/username"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">LinkedIn Display Text (Preview)</label>
      <input
        v-model="store.cvData.linkedin_placeholder"
        type="text"
        class="input-field"
        placeholder="e.g. linkedin.com/in/username"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted flex justify-between">
        <span>{{ t('website') }}</span>
        <span class="text-[10px] text-theme-text-muted font-normal"
          >(adds https:// if missing)</span
        >
      </label>
      <input
        v-model="store.cvData.website"
        type="text"
        class="input-field"
        placeholder="e.g. mywebsite.com"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="text-xs text-theme-text-muted">Website Display Text (Preview)</label>
      <input
        v-model="store.cvData.website_placeholder"
        type="text"
        class="input-field"
        placeholder="e.g. mywebsite.com"
      />
    </div>
  </div>
</template>

<style scoped>
/* Using global .input-field class from index.css */
</style>

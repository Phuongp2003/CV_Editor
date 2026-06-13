<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useCVStore } from '@/stores/cv'
import CVEditor from '@/components/CVEditor.vue'
import CVPlayer from '@/components/CVPlayer'
import SettingsDrawer from '@/components/SettingsDrawer.vue'
import ProfilePresets from '@/components/ProfilePresets.vue'

const store = useCVStore()
const isSettingsOpen = ref(false)
const { t } = useI18n()
</script>

<template>
  <UApp>
    <div
      class="h-screen bg-theme-page text-theme-text flex flex-col font-sans overflow-hidden transition-colors duration-200"
    >
      <!-- Navbar (Fixed Top) -->
      <header
        class="bg-theme-card border-b border-theme-border py-3.5 px-6 flex justify-between items-center shadow-sm flex-shrink-0 transition-colors duration-200"
      >
        <!-- Logo & Title -->
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg bg-primary-600 dark:bg-primary-500 flex items-center justify-center font-extrabold text-white dark:text-theme-page text-lg shadow-md"
          >
            CV
          </div>
          <div class="flex items-center gap-1.5">
            <h1
              class="text-lg font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-theme-secondary dark:from-primary-550 dark:to-theme-secondary bg-clip-text text-transparent"
            >
              {{ t('app_title') }}
            </h1>
          </div>
        </div>


        <!-- Teleport Target for Actions & Settings Gear -->
        <div class="flex items-center gap-3">
          <!-- Middle actions from children (Teleported) -->
          <div id="navbar-actions" class="flex items-center gap-3"></div>

          <!-- Simple version link -->
          <a
            href="/simple/"
            target="_blank"
            class="bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            :title="t('simple_version')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-3.5 h-3.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            <span>{{ t('simple_version') }}</span>
          </a>

          <!-- UI Language Toggle -->
          <div
            class="flex items-center gap-1 bg-theme-muted/50 border border-theme-border p-0.5 rounded-lg select-none"
          >
            <button
              @click="store.uiLanguage = 'English'"
              :class="[
                'px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer',
                store.uiLanguage === 'English'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-theme-text-muted hover:text-theme-text',
              ]"
            >
              EN
            </button>
            <button
              @click="store.uiLanguage = 'Vietnamese'"
              :class="[
                'px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer',
                store.uiLanguage === 'Vietnamese'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-theme-text-muted hover:text-theme-text',
              ]"
            >
              VI
            </button>
          </div>

          <!-- Profile Presets Popover -->
          <ProfilePresets />

          <!-- Color Mode Button -->
          <UColorModeButton size="md" class="cursor-pointer" />

          <!-- Settings Button (More Features) -->
          <button
            @click="isSettingsOpen = true"
            class="bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text p-2 rounded-lg transition duration-150 cursor-pointer shadow-sm flex items-center justify-center"
            :title="t('settings_btn')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.2"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
              />
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Layout -->
      <main
        class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-[90vw] mx-auto pb-6 pt-4"
      >
        <!-- Editor Pane -->
        <div class="flex flex-col h-full overflow-hidden">
          <CVEditor />
        </div>

        <!-- Preview Pane -->
        <div class="flex flex-col h-full overflow-hidden">
          <CVPlayer :data="{}" />
        </div>
      </main>

      <!-- Settings Drawer Component -->
      <SettingsDrawer v-model="isSettingsOpen" />
    </div>
  </UApp>
</template>

<style>
/* Global resets / style customizations */
body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
</style>

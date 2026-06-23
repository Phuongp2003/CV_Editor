<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useCVStore } from '@/stores/cv'
import CVEditor from '@/components/CVEditor.vue'
import CVPlayer from '@/components/CVPlayer'
import CoverLetterEditor from '@/components/editor/CoverLetterEditor.vue'
import CoverLetterPlayer from '@/components/CVPlayer/CoverLetterPlayer.vue'
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
        <!-- Logo, Title & Workspace Selector -->
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-primary-600 dark:bg-primary-500 flex items-center justify-center font-extrabold text-white dark:text-theme-page text-lg shadow-md"
            >
              CV
            </div>
            <div class="flex items-center gap-1.5">
              <h1
                class="text-lg font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-550 dark:to-primary-300 bg-clip-text text-transparent"
              >
                {{ t('app_title') }}
              </h1>
            </div>
          </div>

          <!-- Workspace Selector Toggle Tabs -->
          <div class="hidden md:flex items-center gap-1 bg-theme-muted/50 border border-theme-border p-1 rounded-xl select-none">
            <button
              @click="store.activeWorkspace = 'cv'"
              :class="[
                'px-4 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5',
                store.activeWorkspace === 'cv'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/50',
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {{ t('cv_workspace') }}
            </button>
            <button
              @click="store.activeWorkspace = 'cover-letter'"
              :class="[
                'px-4 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5',
                store.activeWorkspace === 'cover-letter'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/50',
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              {{ t('cover_letter_workspace') }}
            </button>
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
          <CVEditor v-if="store.activeWorkspace === 'cv'" />
          <CoverLetterEditor v-else />
        </div>

        <!-- Preview Pane -->
        <div class="flex flex-col h-full overflow-hidden">
          <CVPlayer v-if="store.activeWorkspace === 'cv'" :data="{}" />
          <CoverLetterPlayer v-else />
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

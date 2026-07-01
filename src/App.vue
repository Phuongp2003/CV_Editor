<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useCVStore } from '@/stores/cv'
import { usePromptsStore } from '@/stores/prompts'
import CVEditor from '@/components/CVEditor.vue'
import CVPlayer from '@/components/CVPlayer'
import CoverLetterEditor from '@/components/editor/CoverLetterEditor.vue'
import CoverLetterPlayer from '@/components/CVPlayer/CoverLetterPlayer.vue'
import SettingsDrawer from '@/components/SettingsDrawer.vue'
import ProfilePresets from '@/components/ProfilePresets.vue'
import ImportModal from '@/components/ImportModal.vue'
import { PromptHubModal } from '@/components/prompts'

const store = useCVStore()
const promptsStore = usePromptsStore()
const isSettingsOpen = ref(false)
const isImportOpen = ref(false)
const isPresetOpen = ref(false)
const presetMode = ref<'load' | 'save'>('load')

const { t } = useI18n()

function openPresetModal(mode: 'load' | 'save') {
  presetMode.value = mode
  isPresetOpen.value = true
}

// Custom UI theme overrides for UNavigationMenu to align height/padding nicely
// Restored to a spacious 2-column layout to match hehe.html and avoid clipping
const customUi = {
  link: 'px-3 py-1.5 text-xs font-semibold rounded-lg text-theme-text-sub hover:text-theme-text hover:bg-theme-hover/50 flex items-center gap-1.5 transition-colors',
  content: 'bg-theme-card border border-theme-border rounded-xl shadow-2xl p-1.5 z-50 text-theme-text-sub',
  linkLabel: 'text-xs font-bold',
  childList: 'isolate grid gap-2 grid-cols-1 p-1.5',
  childLink: 'p-2 rounded-lg hover:bg-theme-hover flex items-start gap-2.5 transition-colors',
  childLinkLabel: 'text-xs font-extrabold text-theme-text block',
  childLinkDescription: 'text-[10px] text-theme-text-muted mt-0.5 leading-relaxed font-medium block'
}

// Navigation menu items for AI and Simple version
const navItems = computed(() => {
  const isVi = store.uiLanguage === 'Vietnamese'

  return [
    [
      {
        label: isVi ? 'Trợ lý AI (Gems)' : 'AI Assistants (Gems)',
        icon: 'i-lucide-sparkles',
        children: [
          {
            label: isVi ? 'Mở AI Prompt Hub' : 'Open AI Prompt Hub',
            description: isVi ? 'Xem toàn bộ hướng dẫn, prompt và link Gems' : 'View all guidelines, prompts and Gems links',
            icon: 'i-lucide-cpu',
            onSelect: () => {
              promptsStore.openModal()
            }
          },
          {
            label: isVi ? 'Đánh giá CV (Software Engineer)' : 'Software Engineer Assistant',
            description: isVi ? 'Đánh giá CV theo JD cho nhà phát triển' : 'Evaluate CV against JD for developers',
            icon: 'i-lucide-code',
            onSelect: () => {
              promptsStore.openModal('se')
            }
          },
          {
            label: isVi ? 'Đánh giá CV (Business Analyst)' : 'Business Analyst Assistant',
            description: isVi ? 'Hỗ trợ viết CV theo JD cho BA' : 'Tailor CV against JD for Business Analysts',
            icon: 'i-lucide-presentation',
            onSelect: () => {
              promptsStore.openModal('ba')
            }
          },
          {
            label: isVi ? 'Đánh giá CV (Quality Control)' : 'Quality Control Assistant',
            description: isVi ? 'Hỗ trợ viết CV theo JD cho QC' : 'Tailor CV against JD for Quality Control',
            icon: 'i-lucide-shield-check',
            onSelect: () => {
              promptsStore.openModal('qc')
            }
          },
          {
            label: isVi ? 'Đánh giá CV (Product Owner)' : 'Product Owner Assistant',
            description: isVi ? 'Hỗ trợ viết CV theo JD cho PO/PM' : 'Tailor CV against JD for Product Owners',
            icon: 'i-lucide-rocket',
            onSelect: () => {
              promptsStore.openModal('po')
            }
          },
          {
            label: isVi ? 'Viết CV từ CV khác' : 'CV Converter',
            description: isVi ? 'Chuyển đổi dữ liệu CV cũ/thô thành mẫu chuẩn' : 'Convert raw or old CV text to standard format',
            icon: 'i-lucide-refresh-cw',
            onSelect: () => {
              promptsStore.openModal('convert')
            }
          }
        ]
      },
      {
        label: isVi ? 'Bản rút gọn' : 'Simple Version',
        icon: 'i-lucide-external-link',
        to: '/simple/',
        target: '_blank'
      }
    ]
  ]
})
</script>

<template>
  <UApp>
    <div
      class="h-screen bg-theme-page text-theme-text flex flex-col font-sans overflow-hidden transition-colors duration-200"
    >
      <!-- Navbar (Fixed Top) -->
      <header
        class="bg-theme-card border-b border-theme-border py-2 px-6 flex justify-between items-center shadow-sm flex-shrink-0 transition-colors duration-200"
      >
        <!-- Left Section: Logo, Title & Workspace Toggle Tabs (Legacy Switch Style) -->
        <div class="flex items-center gap-4 flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-primary-600 dark:bg-primary-500 flex items-center justify-center font-extrabold text-white dark:text-theme-page text-lg shadow-md select-none"
            >
              CV
            </div>
            <h1
              class="text-base font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-550 dark:to-primary-300 bg-clip-text text-transparent hidden xl:block"
            >
              {{ t('app_title') }}
            </h1>
          </div>

          <!-- Workspace Selector Toggle Tabs -->
          <div class="flex items-center gap-1 bg-theme-muted/50 border border-theme-border p-0.5 rounded-lg select-none">
            <button
              @click="store.activeWorkspace = 'cv'"
              :class="[
                'px-3.5 py-1 text-xs font-bold rounded-md transition duration-150 cursor-pointer flex items-center gap-1 select-none',
                store.activeWorkspace === 'cv'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/30',
              ]"
            >
              <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5" />
              <span>{{ t('cv_workspace') }}</span>
            </button>
            <button
              @click="store.activeWorkspace = 'cover-letter'"
              :class="[
                'px-3.5 py-1 text-xs font-bold rounded-md transition duration-150 cursor-pointer flex items-center gap-1 select-none',
                store.activeWorkspace === 'cover-letter'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-hover/30',
              ]"
            >
              <UIcon name="i-lucide-mail" class="w-3.5 h-3.5" />
              <span>{{ t('cover_letter_workspace') }}</span>
            </button>
          </div>
        </div>

        <!-- Center Section: AI Assistants (Gems) Dropdown & Info links -->
        <div class="flex-1 max-w-sm px-4 hidden md:block">
          <UNavigationMenu
            highlight
            highlight-color="primary"
            orientation="horizontal"
            :items="navItems"
            :ui="customUi"
            class="w-full"
          />
        </div>

        <!-- Right Section: Actions -->
        <div class="flex items-center gap-2.5 flex-shrink-0">
          <!-- Reset / Load Sample Data button -->
          <button
            @click="store.loadSample()"
            class="px-2.5 py-1.5 bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text hover:text-primary-500 rounded-lg text-xs font-bold transition duration-150 cursor-pointer shadow-sm flex items-center gap-1 active:scale-95 select-none"
            :title="t('reset_sample') || 'Reset to Sample Data'"
          >
            <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('reset_sample') || 'Load Sample' }}</span>
          </button>

          <!-- Middle actions (Teleported download buttons) -->
          <div id="navbar-actions" class="flex items-center gap-2"></div>

          <!-- Import JSON Data Button with Label (Next to Download button) -->
          <button
            @click="isImportOpen = true"
            class="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer shadow-md flex items-center gap-1 active:scale-95 select-none"
            :title="store.uiLanguage === 'Vietnamese' ? 'Nhập dữ liệu JSON' : 'Import JSON Data'"
          >
            <UIcon name="i-lucide-import" class="w-3.5 h-3.5 text-white animate-pulse" />
            <span class="hidden sm:inline">{{ store.uiLanguage === 'Vietnamese' ? 'Nhập dữ liệu' : 'Import' }}</span>
          </button>

          <!-- Preset Manage Button Popover (Behavior identical to Download button popover) -->
          <UPopover :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
            <button
              class="bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 select-none"
              :title="t('preset_manage')"
            >
              <UIcon name="i-lucide-folder-heart" class="w-4 h-4 text-indigo-500" />
              <span>{{ t('preset_btn') || 'Presets' }}</span>
            </button>
            <template #content>
              <div class="flex flex-col p-1 w-44 bg-theme-card border border-theme-border rounded-xl shadow-2xl text-theme-text-sub">
                <!-- Load Option -->
                <button
                  @click="openPresetModal('load')"
                  class="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-theme-hover hover:text-theme-text transition text-left cursor-pointer rounded-lg w-full"
                >
                  <UIcon name="i-lucide-folder-open" class="w-4 h-4 text-indigo-500" />
                  <span>{{ store.uiLanguage === 'Vietnamese' ? 'Tải hồ sơ' : 'Load Preset' }}</span>
                </button>
                <!-- Save Option -->
                <button
                  @click="openPresetModal('save')"
                  class="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-theme-hover hover:text-theme-text transition text-left cursor-pointer rounded-lg w-full"
                >
                  <UIcon name="i-lucide-save" class="w-4 h-4 text-indigo-500" />
                  <span>{{ store.uiLanguage === 'Vietnamese' ? 'Lưu hồ sơ hiện tại' : 'Save Preset' }}</span>
                </button>
              </div>
            </template>
          </UPopover>

          <!-- UI Language Toggle -->
          <div
            class="flex items-center gap-1 bg-theme-muted/50 border border-theme-border p-0.5 rounded-lg select-none"
          >
            <button
              @click="store.uiLanguage = 'English'"
              :class="[
                'px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer active:scale-95',
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
                'px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer active:scale-95',
                store.uiLanguage === 'Vietnamese'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-theme-text-muted hover:text-theme-text',
              ]"
            >
              VI
            </button>
          </div>

          <!-- Color Mode Toggle Button -->
          <UColorModeButton size="md" class="cursor-pointer" />

          <!-- Settings Button -->
          <button
            @click="isSettingsOpen = true"
            class="bg-theme-element hover:bg-theme-hover border border-theme-border text-theme-text-sub hover:text-theme-text p-2 rounded-lg transition duration-150 cursor-pointer shadow-sm flex items-center justify-center active:scale-95 select-none"
            :title="t('settings_btn')"
          >
            <UIcon name="i-lucide-sliders" class="w-4 h-4 text-indigo-500" />
          </button>
        </div>
      </header>

      <!-- Main Layout Grid -->
      <main
        class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-[95vw] mx-auto pb-6 pt-4"
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

      <!-- Profile Presets Modal Dialog (Load/Save UI) -->
      <ProfilePresets v-model:open="isPresetOpen" :mode="presetMode" />

      <!-- Import CV/Cover Letter Data Modal Dialog -->
      <ImportModal v-model="isImportOpen" />

      <!-- Prompts Hub Modal Dialog -->
      <PromptHubModal />
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

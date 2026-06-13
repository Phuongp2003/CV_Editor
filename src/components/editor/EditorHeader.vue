<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { storeToRefs } from 'pinia'

const store = useCVStore()
const { t } = useI18n()

const { sizeMultiplier, selectedFont, customFontName, language, bulletChars } = storeToRefs(store)
</script>

<template>
  <div
    class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-theme-border pb-3 gap-3 flex-shrink-0 select-none"
  >
    <!-- Title -->
    <div>
      <h3 class="text-base font-bold text-theme-text">
        {{ t('editor_title') || 'CV Form Editor' }}
      </h3>
      <p class="text-xs text-theme-text-muted mt-0.5">
        {{
          store.editViewMode === 'layout'
            ? store.uiLanguage === 'Vietnamese'
              ? 'Kéo thả để sắp xếp các mục hiển thị'
              : 'Drag & drop sections to arrange layout'
            : store.uiLanguage === 'Vietnamese'
              ? 'Nhập thông tin chi tiết cho CV của bạn'
              : 'Enter detail information for your CV'
        }}
      </p>
    </div>

    <!-- Toggle controls -->
    <div class="flex items-center gap-3">
      <!-- Tab/Outline Switch -->
      <div
        v-if="store.editViewMode === 'content'"
        class="flex items-center gap-2 bg-theme-muted/50 border border-theme-border p-1 rounded-lg"
      >
        <button
          @click="store.editorMode = 'tabs'"
          :class="[
            'px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer',
            store.editorMode === 'tabs'
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-sm'
              : 'text-theme-text-muted hover:text-theme-text border border-transparent',
          ]"
        >
          {{ store.uiLanguage === 'Vietnamese' ? 'Dạng Tab' : 'Tabs' }}
        </button>
        <button
          @click="store.editorMode = 'outline'"
          :class="[
            'px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer',
            store.editorMode === 'outline'
              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-sm'
              : 'text-theme-text-muted hover:text-theme-text border border-transparent',
          ]"
        >
          {{ store.uiLanguage === 'Vietnamese' ? 'Dạng Cuộn' : 'Outline' }}
        </button>
      </div>
      <!-- Style & Formatting UPopover -->
      <UPopover :content="{ align: 'end', side: 'bottom', sideOffset: 8 }" class="inline-block">
        <button
          class="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-element border border-theme-border bg-theme-muted/30 rounded-lg transition duration-150 cursor-pointer flex items-center justify-center shadow-sm"
          :title="store.uiLanguage === 'Vietnamese' ? 'Cấu hình định dạng' : 'Formatting Settings'"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.2"
            stroke="currentColor"
            class="w-4.5 h-4.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </button>

        <template #content>
          <div
            class="p-5 w-80 space-y-5 bg-theme-card border border-theme-border rounded-xl shadow-2xl"
          >
            <!-- Header -->
            <div class="border-b border-theme-border pb-2.5">
              <h4 class="text-sm font-bold text-theme-text flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="w-4 h-4 text-primary-600 dark:text-primary-400"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                {{ t('style_formatting_options') }}
              </h4>
            </div>

            <!-- CV Language -->
            <div class="flex flex-col gap-1">
              <label class="text-[11px] text-theme-text-muted font-bold uppercase tracking-wider">{{
                t('cv_language')
              }}</label>
              <select
                v-model="language"
                class="w-full bg-theme-card border border-theme-border rounded-lg p-2 text-theme-text text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm"
              >
                <option value="English">English</option>
                <option value="Vietnamese">Tiếng Việt</option>
                <option value="Japanese">日本語</option>
                <option value="Korean">한국어</option>
                <option value="Chinese">中文</option>
              </select>
            </div>

            <!-- Font Family -->
            <div class="flex flex-col gap-1">
              <label class="text-[11px] text-theme-text-muted font-bold uppercase tracking-wider">{{
                t('font_family')
              }}</label>
              <select
                v-model="selectedFont"
                class="w-full bg-theme-card border border-theme-border rounded-lg p-2 text-theme-text text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm"
              >
                <option value="notosans">{{ t('font_notosans') }}</option>
                <option value="arial">{{ t('font_arial') }}</option>
                <option value="custom">{{ t('font_custom') }}</option>
              </select>
            </div>

            <!-- Custom Font Name -->
            <div v-if="selectedFont === 'custom'" class="flex flex-col gap-1">
              <label class="text-[11px] text-theme-text-muted font-bold uppercase tracking-wider">{{
                t('custom_font_name')
              }}</label>
              <input
                v-model="customFontName"
                type="text"
                :placeholder="t('custom_font_placeholder')"
                class="input-field py-1.5 text-xs"
              />
            </div>

            <!-- Size Multiplier -->
            <div class="flex flex-col gap-1">
              <label
                class="text-[11px] text-theme-text-muted font-bold uppercase tracking-wider flex justify-between"
              >
                <span>{{ t('size_multiplier') }}</span>
                <span class="text-primary-600 dark:text-primary-400 font-bold"
                  >{{ sizeMultiplier.toFixed(2) }}x</span
                >
              </label>
              <input
                v-model.number="sizeMultiplier"
                type="range"
                min="0.8"
                max="1.6"
                step="0.05"
                class="w-full h-1 bg-theme-element rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            <!-- Bullet Symbols -->
            <div class="flex flex-col gap-1">
              <label class="text-[11px] text-theme-text-muted font-bold uppercase tracking-wider">{{
                t('bullet_chars')
              }}</label>
              <div class="grid grid-cols-3 gap-2">
                <div class="flex flex-col gap-1">
                  <span class="text-[9px] text-theme-text-muted uppercase text-center font-semibold"
                    >L1</span
                  >
                  <input
                    v-model="bulletChars.l1"
                    type="text"
                    class="input-field text-center font-bold py-1 px-1.5 text-xs"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-[9px] text-theme-text-muted uppercase text-center font-semibold"
                    >L2</span
                  >
                  <input
                    v-model="bulletChars.l2"
                    type="text"
                    class="input-field text-center font-bold py-1 px-1.5 text-xs"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-[9px] text-theme-text-muted uppercase text-center font-semibold"
                    >L3</span
                  >
                  <input
                    v-model="bulletChars.l3"
                    type="text"
                    class="input-field text-center font-bold py-1 px-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </UPopover>
      <!-- View Mode Toggle (Layout vs Content) -->
      <div
        class="flex items-center gap-1 bg-theme-muted/50 border border-theme-border p-1 rounded-lg"
      >
        <button
          @click="store.editViewMode = 'layout'"
          :class="[
            'px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5',
            store.editViewMode === 'layout'
              ? 'bg-theme-secondary text-white shadow-sm'
              : 'text-theme-text-muted hover:text-theme-text',
          ]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.2"
            stroke="currentColor"
            class="w-3.5 h-3.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
            />
          </svg>
          {{ store.uiLanguage === 'Vietnamese' ? 'Chỉnh Bố Cục' : 'Adjust Layout' }}
        </button>
        <button
          @click="store.editViewMode = 'content'"
          :class="[
            'px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5',
            store.editViewMode === 'content'
              ? 'bg-theme-secondary text-white shadow-sm'
              : 'text-theme-text-muted hover:text-theme-text',
          ]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.2"
            stroke="currentColor"
            class="w-3.5 h-3.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
          {{ store.uiLanguage === 'Vietnamese' ? 'Sửa Nội Dung' : 'Edit Content' }}
        </button>
      </div>
    </div>
  </div>
</template>

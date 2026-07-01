<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { marked } from 'marked'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const isOpen = computed<boolean>({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const store = useCVStore()
const { t } = useI18n()
const version = import.meta.env.VITE_APP_VERSION || '1.0.1'

interface GitHubProfile {
  login: string
  avatar_url: string
  html_url: string
  name: string | null
  bio: string | null
  public_repos: number
  followers: number
}

const githubProfiles = ref<GitHubProfile[]>([])
const isChangelogOpen = ref(false)
const changelogText = ref('')
const selectedVersion = ref(version)
const availableVersions = ref<string[]>([version])

const changelogHtml = computed(() => {
  if (!changelogText.value) return ''
  return marked.parse(changelogText.value)
})

async function fetchGitHubProfiles() {
  try {
    const usernames = ['sjnosukequy', 'Phuongp2003']
    const fetched: GitHubProfile[] = []
    for (const username of usernames) {
      const res = await fetch(`https://api.github.com/users/${username}`)
      if (res.ok) {
        const data = await res.json()
        fetched.push({
          login: data.login,
          avatar_url: data.avatar_url,
          html_url: data.html_url,
          name: data.name,
          bio: data.bio,
          public_repos: data.public_repos,
          followers: data.followers,
        })
      }
    }
    githubProfiles.value = fetched
  } catch (e) {
    console.warn('Failed to fetch GitHub profiles:', e)
  }
}

async function loadVersionChangelog(ver: string) {
  selectedVersion.value = ver
  changelogText.value = store.uiLanguage === 'Vietnamese' ? '# Đang tải...\nĐang lấy thông tin nhật ký thay đổi.' : '# Loading...\nRetrieving changelog.'
  try {
    const lang = store.uiLanguage === 'Vietnamese' ? 'vi' : 'en'
    const v = import.meta.env.VITE_BUILD_TIMESTAMP || Date.now().toString()
    const baseUrl = import.meta.env.BASE_URL || '/'
    const url = (baseUrl + '/change-logs/' + ver + '/' + lang + '.md').replace(/\/+/g, '/')
    const res = await fetch(url + '?v=' + v)
    if (res.ok) {
      changelogText.value = await res.text()
    } else {
      changelogText.value = store.uiLanguage === 'Vietnamese' ? '# Lỗi\nKhông thể tải nhật ký thay đổi.' : '# Error\nFailed to load changelog.'
    }
  } catch (e) {
    changelogText.value = store.uiLanguage === 'Vietnamese' ? '# Lỗi\nGặp sự cố khi kết nối máy chủ.' : '# Error\nAn error occurred while connecting to the server.'
  }
}

async function openChangelog() {
  isChangelogOpen.value = true
  const v = import.meta.env.VITE_BUILD_TIMESTAMP || Date.now().toString()
  const baseUrl = import.meta.env.BASE_URL || '/'
  try {
    const versionsUrl = (baseUrl + '/change-logs/versions.json').replace(/\/+/g, '/')
    const res = await fetch(versionsUrl + '?v=' + v)
    if (res.ok) {
      const list = await res.json()
      if (Array.isArray(list) && list.length > 0) {
        availableVersions.value = list
        if (!list.includes(selectedVersion.value)) {
          selectedVersion.value = list[0]
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch changelog versions list:', e)
  }
  await loadVersionChangelog(selectedVersion.value)
}

function selectChangelogVersion(ver: string) {
  loadVersionChangelog(ver)
}

onMounted(() => {
  fetchGitHubProfiles()
})
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :overlay="true"
    :modal="true"
    :title="t('settings_title')"
  >
    <template #body>
      <div class="space-y-6 text-theme-text-sub flex flex-col h-full justify-between">
        <div class="space-y-6">
          <!-- ── Website Information ── -->
          <section class="space-y-3 bg-theme-muted/30 border border-theme-border/60 rounded-xl p-4 shadow-sm select-none">
            <h3 class="text-xs font-bold text-theme-text flex items-center gap-2 uppercase tracking-wider">
              <UIcon name="i-lucide-info" class="w-4 h-4 text-primary-500" />
              <span>{{ store.uiLanguage === 'Vietnamese' ? 'Thông tin website' : 'Website Information' }}</span>
            </h3>
            <p class="text-xs text-theme-text-muted leading-relaxed font-medium">
              {{ store.uiLanguage === 'Vietnamese' 
                ? 'Website soạn thảo và chuẩn hóa CV & Đơn xin việc thông minh với sự hỗ trợ của các mô hình ngôn ngữ lớn (Gemini Gems).' 
                : 'A smart editor to write, optimize, and standardize your CV and Cover Letters with target role LLM assistants (Gemini Gems).'
              }}
            </p>
            <div class="pt-2">
              <button
                @click="openChangelog"
                class="w-full px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white hover:text-white text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer select-none"
              >
                <UIcon name="i-lucide-history" class="w-4 h-4 text-white" />
                <span>{{ store.uiLanguage === 'Vietnamese' ? 'Xem Nhật ký thay đổi (Changelog)' : 'View Changelog' }}</span>
              </button>
            </div>
          </section>

          <!-- ── About Us ── -->
          <section class="space-y-3">
            <h3
              class="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.978 11.978 0 0 1 12 20.25a11.968 11.968 0 0 1-3.008-.386V19.12c0-1.113.285-2.16.786-3.07M12 20.25a11.978 11.978 0 0 1-3.008-.386M3.375 19.4a9.339 9.339 0 0 0 4.125.953 9.379 9.379 0 0 0 2.625-.372M6.75 20.25v-1.13a11.975 11.975 0 0 1 3.008-.387m-3.008.387A11.967 11.967 0 0 1 3.743 19.5a4.125 4.125 0 0 1 7.53-2.493m-4.526 2.117v.003"
                />
              </svg>
              {{ t('about_us') }}
            </h3>
            
            <div v-if="githubProfiles.length > 0" class="space-y-3 mt-2">
              <a
                v-for="profile in githubProfiles"
                :key="profile.login"
                :href="profile.html_url"
                target="_blank"
                class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <div class="flex items-center gap-3">
                  <img
                    :src="profile.avatar_url"
                    :alt="profile.name || profile.login"
                    class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors truncate">
                        {{ profile.name || profile.login }}
                      </h4>
                      <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                        @{{ profile.login }}
                      </span>
                    </div>
                    <!-- Role Badge -->
                    <div class="flex items-center gap-1.5 mt-0.5 mb-1">
                      <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                        {{ profile.login.toLowerCase() === 'sjnosukequy' ? t('role_creator') : t('role_developer') }}
                      </span>
                    </div>
                    <p class="text-xs text-theme-text-muted line-clamp-1" :title="profile.bio || ''">
                      {{ profile.bio || t('developer_fallback') }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-3 pt-3 border-t border-theme-sub/40 text-[11px]">
                  <div class="flex items-center gap-4 text-theme-text-sub">
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span class="font-semibold text-theme-text">{{ profile.public_repos }}</span> {{ t('repos') }}
                    </span>
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span class="font-semibold text-theme-text">{{ profile.followers }}</span> {{ t('followers') }}
                    </span>
                  </div>
                  <span class="text-primary-500 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    {{ t('view_profile') }}
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </a>
            </div>
            
            <!-- Fallback if github offline -->
            <div v-else class="space-y-3 mt-2">
              <a
                href="https://github.com/sjnosukequy"
                target="_blank"
                class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors bg-theme-muted flex items-center justify-center text-theme-text-muted">
                    <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors">
                        sjnosukequy
                      </h4>
                      <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                        @sjnosukequy
                      </span>
                    </div>
                    <!-- Role Badge -->
                    <div class="flex items-center gap-1.5 mt-1">
                      <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                        {{ t('role_creator') }}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
              <a
                href="https://github.com/Phuongp2003"
                target="_blank"
                class="group block p-4 bg-theme-card border border-theme-border/60 hover:border-primary-500 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full border border-theme-border/60 group-hover:border-primary-500 transition-colors bg-theme-muted flex items-center justify-center text-theme-text-muted">
                    <svg class="w-6 h-6" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-bold text-theme-text group-hover:text-primary-500 transition-colors">
                        Phuongp2003
                      </h4>
                      <span class="text-[10px] text-theme-text-muted font-mono bg-theme-muted group-hover:bg-primary-500/10 group-hover:text-primary-500 px-1.5 py-0.5 rounded transition-colors">
                        @Phuongp2003
                      </span>
                    </div>
                    <!-- Role Badge -->
                    <div class="flex items-center gap-1.5 mt-1">
                      <span class="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border border-primary-200/40 dark:border-primary-900/30">
                        {{ t('role_developer') }}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </section>
        </div>

        <!-- Version Info -->
        <div class="pt-4 border-t border-theme-border/60 flex items-center justify-between text-xs text-theme-text-muted select-none">
          <span>{{ store.uiLanguage === 'Vietnamese' ? 'Phiên bản' : 'Version' }}</span>
          <span class="font-mono bg-theme-muted px-2.5 py-0.5 rounded border border-theme-border/60 text-[11px] font-bold">v{{ version }}</span>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- Changelog Modal -->
  <UModal
    v-model:open="isChangelogOpen"
    :overlay="true"
    :modal="true"
    :title="store.uiLanguage === 'Vietnamese' ? 'Nhật ký thay đổi' : 'Changelog'"
    :ui="{
      content: 'w-[95vw] sm:w-[90vw] md:w-[850px] max-w-full transition-all duration-300'
    }"
  >
    <template #body>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 py-1">
        <!-- Left Column: Version selection buttons -->
        <div class="md:col-span-3 border-b md:border-b-0 md:border-r border-theme-border/60 pb-3 md:pb-0 md:pr-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:overflow-y-auto select-none">
          <span class="text-[10px] font-extrabold text-theme-text-muted uppercase tracking-wider mb-1 hidden md:block">
            {{ store.uiLanguage === 'Vietnamese' ? 'Các phiên bản' : 'Versions' }}
          </span>
          <button
            v-for="ver in availableVersions"
            :key="ver"
            @click="selectChangelogVersion(ver)"
            :class="[
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer text-left flex-shrink-0 active:scale-95 select-none',
              selectedVersion === ver
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-theme-text-sub hover:text-theme-text hover:bg-theme-hover/50'
            ]"
          >
            v{{ ver }}
          </button>
        </div>

        <!-- Right Column: Rendered Markdown Content -->
        <div class="md:col-span-9 flex flex-col min-h-[300px]">
          <div 
            class="prose prose-xs dark:prose-invert max-w-none text-theme-text-sub font-sans leading-relaxed bg-theme-muted/40 border border-theme-border/60 rounded-xl p-5 shadow-inner overflow-y-auto h-[45vh]"
            v-html="changelogHtml"
          ></div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <button
          @click="isChangelogOpen = false"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white hover:text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md active:scale-95 select-none"
        >
          {{ store.uiLanguage === 'Vietnamese' ? 'Đóng' : 'Close' }}
        </button>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
/* Extra styles to ensure Markdown rendering looks stunning and matches the system UI theme */
:deep(.prose h1) {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-theme-text);
  margin-bottom: 0.75rem;
  border-bottom: 1px solid rgba(156, 163, 175, 0.2);
  padding-bottom: 0.5rem;
}
:deep(.prose h2) {
  font-size: 0.9rem;
  font-weight: 750;
  color: var(--color-theme-text);
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}
:deep(.prose p) {
  font-size: 0.75rem;
  color: var(--color-theme-text-sub);
  margin-bottom: 0.5rem;
  font-weight: 500;
}
:deep(.prose ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
}
:deep(.prose li) {
  margin-bottom: 0.25rem;
  color: var(--color-theme-text-muted);
  font-weight: 500;
}
:deep(.prose strong) {
  color: var(--color-theme-text);
  font-weight: 700;
}
</style>

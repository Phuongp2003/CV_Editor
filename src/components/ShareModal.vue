<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { useShareManager, type SharedCvRecord } from '@/composables/useShareManager'

const open = defineModel<boolean>('open', { default: false })

const store = useCVStore()
const toast = useToast()
const { t } = useI18n()
const { sharedLinks, createAndSaveShare, renewShare, deleteShare, clearExpired } = useShareManager()

const busyId = ref<string | null>(null)
const isCreating = ref(false)

function isExpired(item: SharedCvRecord): boolean {
  return item.isShort && item.expiresAt > 0 && item.expiresAt <= Date.now()
}

function formatRemaining(item: SharedCvRecord): string {
  if (!item.isShort) return t('share_offline_badge')
  const diff = item.expiresAt - Date.now()
  if (diff <= 0) return t('share_expired')
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  if (days > 0) return `${days}d ${remHours}h`
  if (hours > 0) return `${hours}h`
  const mins = Math.max(1, Math.floor(diff / 60_000))
  return `${mins}m`
}

async function createShareNow() {
  isCreating.value = true
  try {
    const title = store.cvData.name || 'Untitled CV'
    const res = await createAndSaveShare(store.exportState(), title)
    await navigator.clipboard.writeText(res.url)
    toast.add({
      title: t('share_copied'),
      description: res.isShort ? t('share_copied_short_desc') : t('share_copied_desc'),
      icon: 'i-lucide-link',
      color: 'success',
    })
  } finally {
    isCreating.value = false
  }
}

async function copyUrl(item: SharedCvRecord) {
  await navigator.clipboard.writeText(item.url)
  toast.add({ title: t('share_copied'), icon: 'i-lucide-link', color: 'success' })
}

async function handleRenew(item: SharedCvRecord) {
  busyId.value = item.id
  try {
    await renewShare(item.id)
    toast.add({ title: t('share_renewed'), icon: 'i-lucide-refresh-cw', color: 'success' })
  } catch (e) {
    toast.add({
      title: t('share_renew_failed'),
      description: e instanceof Error ? e.message : String(e),
      icon: 'i-lucide-circle-x',
      color: 'error',
    })
  } finally {
    busyId.value = null
  }
}

async function handleDelete(item: SharedCvRecord) {
  busyId.value = item.id
  try {
    await deleteShare(item.id)
    toast.add({ title: t('share_deleted'), icon: 'i-lucide-trash-2', color: 'neutral' })
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('share_modal_title')" :description="t('share_modal_desc')" :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <UButton
            icon="i-lucide-link"
            color="primary"
            :loading="isCreating"
            :label="t('share_create_now')"
            @click="createShareNow"
          />
          <UButton
            v-if="sharedLinks.some(isExpired)"
            variant="ghost"
            color="neutral"
            size="sm"
            :label="t('share_clear_expired')"
            @click="clearExpired"
          />
        </div>

        <div v-if="!sharedLinks.length" class="rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted">
          {{ t('share_empty') }}
        </div>

        <ul v-else class="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          <li
            v-for="item in sharedLinks"
            :key="item.id + item.createdAt"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-default bg-default p-3"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm text-highlighted truncate">{{ item.title }}</span>
                <UBadge
                  size="xs"
                  variant="subtle"
                  :color="isExpired(item) ? 'error' : item.isShort ? 'primary' : 'neutral'"
                >
                  {{ formatRemaining(item) }}
                </UBadge>
              </div>
              <p class="text-xs text-muted truncate mt-0.5 font-mono">{{ item.url }}</p>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                icon="i-lucide-copy"
                :label="t('share_copy')"
                @click="copyUrl(item)"
              />
              <UButton
                v-if="item.isShort && item.renewToken && !isExpired(item)"
                size="xs"
                variant="soft"
                color="primary"
                icon="i-lucide-refresh-cw"
                :loading="busyId === item.id"
                :label="t('share_renew')"
                @click="handleRenew(item)"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-lucide-trash-2"
                :loading="busyId === item.id"
                :aria-label="t('delete')"
                @click="handleDelete(item)"
              />
            </div>
          </li>
        </ul>
      </div>
    </template>
  </UModal>
</template>

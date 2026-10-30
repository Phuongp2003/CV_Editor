<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import { normalizeAvatar, AvatarError } from '@/utils/avatar'
import type { AvatarStyle } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()
const error = ref('')
const busy = ref(false)

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    const img = await normalizeAvatar(file)
    store.cvData.profileImage = img.dataUrl
    store.cvData.profileImageType = img.mime
  } catch (err) {
    const code = err instanceof AvatarError ? err.code : 'decode_failed'
    error.value = t(`avatar_err_${code}` as any)
  } finally {
    busy.value = false
  }
}

function remove() {
  store.cvData.profileImage = null
  store.cvData.profileImageType = null
}

type Opt<K extends keyof AvatarStyle> = { value: AvatarStyle[K]; icon: string; label: string }
const shapes = computed<Opt<'shape'>[]>(() => [
  { value: 'square', icon: 'i-lucide-square', label: t('avatar_square') },
  { value: 'rounded', icon: 'i-lucide-squircle', label: t('avatar_rounded') },
  { value: 'circle', icon: 'i-lucide-circle', label: t('avatar_circle') },
])
const positions = computed<Opt<'position'>[]>(() => [
  { value: 'left', icon: 'i-lucide-panel-left', label: t('avatar_left') },
  { value: 'center', icon: 'i-lucide-panel-top', label: t('avatar_center') },
  { value: 'right', icon: 'i-lucide-panel-right', label: t('avatar_right') },
])
const sizes = computed<Opt<'size'>[]>(() => [
  { value: 'sm', icon: '', label: 'S' },
  { value: 'md', icon: '', label: 'M' },
  { value: 'lg', icon: '', label: 'L' },
])
const fits = computed<Opt<'fit'>[]>(() => [
  { value: 'cover', icon: 'i-lucide-maximize', label: t('avatar_cover') },
  { value: 'contain', icon: 'i-lucide-minimize', label: t('avatar_contain') },
])

const previewClass = computed(() => {
  const s = store.avatarStyle
  return [
    s.shape === 'circle' ? 'rounded-full' : s.shape === 'rounded' ? 'rounded-2xl' : 'rounded-none',
    s.size === 'sm' ? 'size-14' : s.size === 'lg' ? 'size-24' : 'size-18',
  ]
})
</script>

<template>
  <div class="rounded-xl border border-default p-4 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('profile_picture') }}</span>
      <UBadge v-if="store.cvData.profileImage && store.template === 'harvard'" color="warning" variant="soft" size="sm">
        {{ t('avatar_harvard_note') }}
      </UBadge>
    </div>

    <div class="flex items-start gap-4">
      <div
        class="shrink-0 overflow-hidden border border-default bg-white flex items-center justify-center transition-all"
        :class="previewClass"
      >
        <img
          v-if="store.cvData.profileImage"
          :src="store.cvData.profileImage"
          :alt="t('profile_picture')"
          class="size-full"
          :class="store.avatarStyle.fit === 'contain' ? 'object-contain' : 'object-cover'"
        />
        <UIcon v-else name="i-lucide-user-round" class="size-8 text-dimmed" />
      </div>

      <div class="flex flex-col gap-2 min-w-0">
        <div class="flex flex-wrap gap-2">
          <UButton as="label" size="sm" icon="i-lucide-image-up" :loading="busy" class="cursor-pointer">
            {{ store.cvData.profileImage ? t('avatar_change') : t('choose_image') }}
            <input type="file" accept="image/*" class="sr-only" @change="onFile" />
          </UButton>
          <UButton v-if="store.cvData.profileImage" size="sm" color="neutral" variant="outline" icon="i-lucide-trash-2" :label="t('remove_image')" @click="remove" />
        </div>
        <p class="text-[11px] text-muted">{{ t('avatar_hint') }}</p>
        <p v-if="error" class="text-xs text-error" role="alert">{{ error }}</p>
      </div>
    </div>

    <div v-if="store.cvData.profileImage" class="grid grid-cols-2 gap-x-4 gap-y-2.5">
      <UFormField :label="t('avatar_shape')">
        <UFieldGroup size="sm">
          <UButton
            v-for="o in shapes"
            :key="o.value"
            :icon="o.icon"
            :aria-label="o.label"
            :title="o.label"
            :color="store.avatarStyle.shape === o.value ? 'primary' : 'neutral'"
            :variant="store.avatarStyle.shape === o.value ? 'soft' : 'outline'"
            @click="store.avatarStyle.shape = o.value"
          />
        </UFieldGroup>
      </UFormField>
      <UFormField :label="t('avatar_position')">
        <UFieldGroup size="sm">
          <UButton
            v-for="o in positions"
            :key="o.value"
            :icon="o.icon"
            :aria-label="o.label"
            :title="o.label"
            :color="store.avatarStyle.position === o.value ? 'primary' : 'neutral'"
            :variant="store.avatarStyle.position === o.value ? 'soft' : 'outline'"
            @click="store.avatarStyle.position = o.value"
          />
        </UFieldGroup>
      </UFormField>
      <UFormField :label="t('avatar_size')">
        <UFieldGroup size="sm">
          <UButton
            v-for="o in sizes"
            :key="o.value"
            :label="o.label"
            :color="store.avatarStyle.size === o.value ? 'primary' : 'neutral'"
            :variant="store.avatarStyle.size === o.value ? 'soft' : 'outline'"
            @click="store.avatarStyle.size = o.value"
          />
        </UFieldGroup>
      </UFormField>
      <UFormField :label="t('avatar_fit')">
        <UFieldGroup size="sm">
          <UButton
            v-for="o in fits"
            :key="o.value"
            :icon="o.icon"
            :label="o.label"
            :color="store.avatarStyle.fit === o.value ? 'primary' : 'neutral'"
            :variant="store.avatarStyle.fit === o.value ? 'soft' : 'outline'"
            @click="store.avatarStyle.fit = o.value"
          />
        </UFieldGroup>
      </UFormField>
    </div>
  </div>
</template>

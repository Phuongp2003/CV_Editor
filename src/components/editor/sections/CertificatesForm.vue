<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import DraggableList from '@/components/editor/core/DraggableList.vue'
import DraggableItemCard from '@/components/editor/core/DraggableItemCard.vue'
import type { Certificate } from '@/types/cv'

const store = useCVStore()
const { t } = useI18n()

function addCertificate() {
  store.cvData.certificates.push({
    certName: '',
    'issuer/description': '',
    certDate: '',
  } as Certificate)
}

function removeCertificate(index: number) {
  store.cvData.certificates.splice(index, 1)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <DraggableList
      v-model="store.cvData.certificates"
      dragWidth="420px"
      :ghostTitle="t('certificates_title') || 'Certificates'"
      ghostTitleKey="certName"
      ghostSubtitleKey="issuer/description"
    >
      <DraggableItemCard
        v-for="(cert, index) in store.cvData.certificates"
        :key="index"
        :index="index"
        :item="cert"
        :collapseKey="`certificate-${index}`"
        :headerPlaceholder="cert.certName || 'New Certificate'"
        @delete="removeCertificate(index)"
      >
        <!-- Card Body Fields -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('cert_name') }}</label>
            <input v-model="cert.certName" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('cert_issuer') }}</label>
            <input v-model="cert['issuer/description']" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs text-theme-text-sub font-semibold">{{ t('cert_date') }}</label>
            <input v-model="cert.certDate" type="text" class="input-field" />
          </div>
        </div>

        <!-- Collapsed Preview Slot -->
        <template #preview>
          <div class="flex justify-between items-center text-xs">
            <div class="font-bold text-theme-text-sub truncate max-w-[280px]">
              {{ cert.certName || 'New Certificate' }}
              <span v-if="cert['issuer/description']" class="font-normal text-theme-text-muted"
                >| {{ cert['issuer/description'] }}</span
              >
            </div>
            <div v-if="cert.certDate" class="text-[10px] text-theme-text-muted flex-shrink-0 ml-2">
              {{ cert.certDate }}
            </div>
          </div>
        </template>
      </DraggableItemCard>
    </DraggableList>

    <button @click="addCertificate" class="btn-add cursor-pointer font-bold select-none">
      {{ t('add_certificate') }}
    </button>
  </div>
</template>

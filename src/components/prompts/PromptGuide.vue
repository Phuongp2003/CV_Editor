<script setup lang="ts">
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'

const cvStore = useCVStore()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-4 bg-theme-muted/30 border border-theme-border/60 rounded-xl p-4 text-xs h-full overflow-y-auto guide-container">
    <div class="flex items-center justify-between border-b border-theme-border/40 pb-2 select-none">
      <h4 class="font-extrabold text-theme-text flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-primary-600 dark:text-primary-400">
        <UIcon name="i-lucide-book-open" class="w-4 h-4" />
        {{ cvStore.uiLanguage === 'Vietnamese' ? 'Cẩm nang Tối ưu hóa CV với AI' : 'Complete AI CV Optimization Playbook' }}
      </h4>
    </div>

    <div class="space-y-4 text-theme-text-sub leading-relaxed font-medium">
      <!-- Section 1 -->
      <div class="space-y-1 bg-theme-card/65 border border-theme-border/30 rounded-lg p-3">
        <span class="text-[10px] font-extrabold uppercase text-indigo-500 tracking-wide flex items-center gap-1">
          <UIcon name="i-lucide-list-todo" class="w-3.5 h-3.5" />
          1. {{ cvStore.uiLanguage === 'Vietnamese' ? 'Chuẩn bị Số liệu kỹ thuật (STAR)' : 'Gather STAR Metrics' }}
        </span>
        <p class="text-theme-text-muted pl-4">
          {{ cvStore.uiLanguage === 'Vietnamese'
            ? 'Hãy liệt kê các số liệu thực tế trong công việc: quy mô database, số lượng requests/giây (RPS), lượng tiền tiết kiệm được, hiệu suất tăng bao nhiêu %.'
            : 'List real metrics from your past jobs: database sizes, requests per second (RPS), money saved, or percentage optimizations.'
          }}
        </p>
      </div>

      <!-- Section 2 -->
      <div class="space-y-1 bg-theme-card/65 border border-theme-border/30 rounded-lg p-3">
        <span class="text-[10px] font-extrabold uppercase text-rose-500 tracking-wide flex items-center gap-1">
          <UIcon name="i-lucide-rocket" class="w-3.5 h-3.5" />
          2. {{ cvStore.uiLanguage === 'Vietnamese' ? 'Bám sát Mô tả công việc (JD)' : 'Align With Job Description (JD)' }}
        </span>
        <p class="text-theme-text-muted pl-4">
          {{ cvStore.uiLanguage === 'Vietnamese'
            ? 'Cung cấp JD mục tiêu cho AI. AI sẽ tự động phân tích từ khóa và tái sắp xếp, làm nổi bật những kinh nghiệm phù hợp với tiêu chí tuyển dụng.'
            : 'Copy and paste the target Job Description (JD). AI will automatically parse key responsibilities and align your experiences to matching criteria.'
          }}
        </p>
      </div>

      <!-- Section 3 -->
      <div class="space-y-1 bg-theme-card/65 border border-theme-border/30 rounded-lg p-3">
        <span class="text-[10px] font-extrabold uppercase text-emerald-500 tracking-wide flex items-center gap-1">
          <UIcon name="i-lucide-help-circle" class="w-3.5 h-3.5" />
          3. {{ cvStore.uiLanguage === 'Vietnamese' ? 'Phỏng vấn tương tác (STAR)' : 'STAR Method Interview' }}
        </span>
        <p class="text-theme-text-muted pl-4">
          {{ cvStore.uiLanguage === 'Vietnamese'
            ? 'Thay vì viết hộ ngay lập tức, hãy yêu cầu AI đặt câu hỏi phỏng vấn STAR để đào sâu thông tin. Trả lời từng câu hỏi để bổ sung chiều sâu chuyên môn.'
            : 'Engage in a step-by-step interview with the AI. Answer its target questions to enrich your CV with professional depth.'
          }}
        </p>
      </div>

      <!-- Section 4 -->
      <div class="space-y-1 bg-theme-card/65 border border-theme-border/30 rounded-lg p-3">
        <span class="text-[10px] font-extrabold uppercase text-amber-500 tracking-wide flex items-center gap-1">
          <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5" />
          4. {{ cvStore.uiLanguage === 'Vietnamese' ? 'Copy JSON và Import' : 'Copy JSON & Import' }}
        </span>
        <p class="text-theme-text-muted pl-4">
          {{ cvStore.uiLanguage === 'Vietnamese'
            ? 'Khi hài lòng với nội dung, yêu cầu AI xuất ra khối JSON hợp lệ. Sao chép và dán khối JSON đó vào ô "Nhập dữ liệu" bên dưới để cập nhật tức thì.'
            : 'Once you are happy with the draft, ask the AI to export it in the JSON schema. Copy and paste it into the Importer below to load instantly.'
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guide-container {
  scrollbar-width: thin;
}
</style>

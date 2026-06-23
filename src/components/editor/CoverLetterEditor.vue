<script setup lang="ts">
import { ref } from 'vue'
import { useCVStore } from '@/stores/cv'
import { useI18n } from '@/composables/useI18n'
import RichTextEditor from '@/components/RichTextEditor.vue'
import { renderToPlainText, renderToHtml } from '@/utils/richText'

const store = useCVStore()
const { t } = useI18n()

const showCopySuccess = ref(false)
const isEmailModalOpen = ref(false)
const emailTo = ref('')
const emailSubject = ref('')
const emailAccountType = ref('mailto')

function openEmailModal() {
  emailTo.value = store.coverLetterData.header.recipientEmail || ''
  const position = store.coverLetterData.header.recipientTitle || 'Position'
  const candidateName = store.cvData.name || store.coverLetterData.header.senderName || ''
  emailSubject.value = `Application for ${position} - ${candidateName}`
  isEmailModalOpen.value = true
}

async function composeEmail() {
  const to = emailTo.value.trim()
  const subject = emailSubject.value.trim()
  const bodyParas = store.coverLetterData.bodyParagraphs.filter(p => p.trim())

  const fieldToPlain = (text: string) => renderToPlainText(text)
  const fieldToHtml = (text: string) => renderToHtml(text).replace(/\n/g, '<br>')

  const emailPlain = [
    store.coverLetterData.greeting.trim(),
    '',
    fieldToPlain(store.coverLetterData.openingParagraph),
    '',
    bodyParas.map(p => fieldToPlain(p)).join('\n\n'),
    '',
    fieldToPlain(store.coverLetterData.closingParagraph),
    '',
    fieldToPlain(store.coverLetterData.signOff)
  ].filter(val => val !== null).join('\n')

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000000; text-align: left;">
      <p style="margin: 0 0 15px 0;">${store.coverLetterData.greeting.trim()}</p>
      <p style="margin: 0 0 15px 0;">${fieldToHtml(store.coverLetterData.openingParagraph)}</p>
      ${bodyParas.map(p => `<p style="margin: 0 0 15px 0;">${fieldToHtml(p)}</p>`).join('')}
      <p style="margin: 0 0 20px 0;">${fieldToHtml(store.coverLetterData.closingParagraph)}</p>
      <p style="margin: 0 0 0 0;">${fieldToHtml(store.coverLetterData.signOff)}</p>
    </div>
  `.trim()

  // Copy HTML and Plain text to clipboard for manual paste in case of HTML styling
  let copied = false

  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([emailPlain], { type: 'text/plain' }),
        'text/html': new Blob([emailHtml], { type: 'text/html' }),
      })
      await navigator.clipboard.write([clipboardItem])
      copied = true
    } catch (err) {
      console.warn('Navigator clipboard write failed in composeEmail:', err)
    }
  }

  if (!copied) {
    try {
      const copyListener = (e: ClipboardEvent) => {
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', emailHtml)
          e.clipboardData.setData('text/plain', emailPlain)
        }
        e.preventDefault()
      }
      document.addEventListener('copy', copyListener)
      const success = document.execCommand('copy')
      document.removeEventListener('copy', copyListener)
      if (success) {
        copied = true
      }
    } catch (err) {
      console.warn('execCommand copy fallback failed in composeEmail:', err)
    }
  }

  if (!copied && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(emailPlain)
      copied = true
    } catch (err) {
      console.error('Plain text compose copy fallback failed:', err)
    }
  }

  // Construct and open compose window URL
  let composeUrl = ''
  if (emailAccountType.value.startsWith('gmail-')) {
    const accIdx = emailAccountType.value.split('-')[1] || '0'
    composeUrl = `https://mail.google.com/mail/u/${accIdx}/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailPlain)}`
  } else {
    composeUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailPlain)}`
  }

  window.open(composeUrl, '_blank')
  isEmailModalOpen.value = false

  showCopySuccess.value = true
  setTimeout(() => {
    showCopySuccess.value = false
  }, 4000)
}

/**
 * Copies values from CV personal info into Cover Letter sender header.
 */
function syncFromCV() {
  store.coverLetterData.header.senderName = store.cvData.name || store.coverLetterData.header.senderName
  store.coverLetterData.header.senderEmail = store.cvData.email || store.coverLetterData.header.senderEmail
  store.coverLetterData.header.senderPhone = store.cvData.phone || store.coverLetterData.header.senderPhone
  store.coverLetterData.header.senderLocation = store.cvData.location || store.coverLetterData.header.senderLocation
}

/**
 * Compiles all cover letter fields into formatted plain text and rich HTML, and writes them to the clipboard.
 */
async function copyToClipboard() {
  const header = store.coverLetterData.header
  const bodyParas = store.coverLetterData.bodyParagraphs.filter(p => p.trim())

  const fieldToHtml = (text: string) => {
    return renderToHtml(text).replace(/\n/g, '<br>')
  }
  const fieldToPlain = (text: string) => {
    return renderToPlainText(text)
  }

  // 1. Compile Plain Text
  const plainTextBlock = [
    header.senderName.trim().toUpperCase(),
    [header.senderLocation.trim(), header.senderEmail.trim(), header.senderPhone.trim()].filter(Boolean).join(' | '),
    '',
    header.date.trim(),
    '',
    [header.recipientName.trim(), header.recipientTitle.trim(), header.companyName.trim(), header.companyAddress.trim()].filter(Boolean).join('\n'),
    '',
    store.coverLetterData.greeting.trim(),
    '',
    fieldToPlain(store.coverLetterData.openingParagraph),
    '',
    bodyParas.map(p => fieldToPlain(p)).join('\n\n'),
    '',
    fieldToPlain(store.coverLetterData.closingParagraph),
    '',
    fieldToPlain(store.coverLetterData.signOff)
  ].filter(val => val !== null).join('\n')

  // 2. Compile HTML Text
  const senderContact = [header.senderLocation.trim(), header.senderEmail.trim(), header.senderPhone.trim()].filter(Boolean).join(' | ')
  const recipientBlock = [header.recipientName.trim(), header.recipientTitle.trim(), header.companyName.trim(), header.companyAddress.trim()]
    .filter(Boolean)
    .join('<br>')

  const htmlBlock = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000000; max-width: 600px; text-align: left;">
      <p style="text-align: center; margin: 0 0 5px 0; font-size: 16px;"><strong>${header.senderName.trim().toUpperCase()}</strong></p>
      <p style="text-align: center; margin: 0 0 15px 0; font-size: 12px; color: #333333;">${senderContact}</p>
      <hr style="border: 0; border-top: 1px solid #222222; margin: 0 0 20px 0;">
      <p style="margin: 0 0 15px 0;">${header.date.trim()}</p>
      <p style="margin: 0 0 20px 0;">${recipientBlock}</p>
      <p style="margin: 0 0 15px 0;">${store.coverLetterData.greeting.trim()}</p>
      <p style="margin: 0 0 15px 0;">${fieldToHtml(store.coverLetterData.openingParagraph)}</p>
      ${bodyParas.map(p => `<p style="margin: 0 0 15px 0;">${fieldToHtml(p)}</p>`).join('')}
      <p style="margin: 0 0 20px 0;">${fieldToHtml(store.coverLetterData.closingParagraph)}</p>
      <p style="margin: 0 0 0 0;">${fieldToHtml(store.coverLetterData.signOff)}</p>
    </div>
  `.trim()

  // 3. Write to Clipboard using compatible techniques
  let copied = false

  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([plainTextBlock], { type: 'text/plain' }),
        'text/html': new Blob([htmlBlock], { type: 'text/html' }),
      })
      await navigator.clipboard.write([clipboardItem])
      copied = true
    } catch (err) {
      console.warn('Navigator clipboard write with ClipboardItem failed, using fallback:', err)
    }
  }

  // Fallback 1: document.execCommand('copy') with custom 'copy' event listener
  if (!copied) {
    try {
      const copyListener = (e: ClipboardEvent) => {
        if (e.clipboardData) {
          e.clipboardData.setData('text/html', htmlBlock)
          e.clipboardData.setData('text/plain', plainTextBlock)
        }
        e.preventDefault()
      }
      document.addEventListener('copy', copyListener)
      const success = document.execCommand('copy')
      document.removeEventListener('copy', copyListener)
      if (success) {
        copied = true
      }
    } catch (err) {
      console.warn('execCommand copy fallback failed:', err)
    }
  }

  // Fallback 2: Plain text fallback using writeText
  if (!copied && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(plainTextBlock)
      copied = true
    } catch (err) {
      console.error('Plain text clipboard fallback failed:', err)
    }
  }

  if (copied) {
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 3000)
  }
}

function addParagraph() {
  store.coverLetterData.bodyParagraphs.push('')
}

function removeParagraph(index: number) {
  if (store.coverLetterData.bodyParagraphs.length > 1) {
    store.coverLetterData.bodyParagraphs.splice(index, 1)
  } else {
    store.coverLetterData.bodyParagraphs[0] = ''
  }
}
</script>

<template>
  <div class="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-sm flex flex-col h-full overflow-hidden transition-colors duration-200">
    <!-- Header Controls -->
    <div class="flex justify-between items-center pb-4 border-b border-theme-border flex-shrink-0">
      <div>
        <h2 class="text-base font-extrabold text-theme-text">{{ t('cover_letter_workspace') }}</h2>
        <p class="text-[10px] text-theme-text-muted mt-0.5">{{ t('content_desc') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="syncFromCV"
          type="button"
          class="px-2.5 py-1.5 bg-theme-muted hover:bg-theme-hover border border-theme-border text-theme-text font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {{ t('cl_sync_btn') }}
        </button>
        <button
          @click="copyToClipboard"
          type="button"
          class="px-2.5 py-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m10.5 10.5V5.25c0-.621-.504-1.125-1.125-1.125h-9.75A1.125 1.125 0 0 0 3.75 5.25v12.375c0 .621.504 1.125 1.125 1.125h9.75a1.125 1.125 0 0 0 1.125-1.125Z" />
          </svg>
          {{ t('cl_copy_btn') }}
        </button>
        <button
          @click="openEmailModal"
          type="button"
          class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
          {{ t('cl_quick_email_btn') }}
        </button>
      </div>
    </div>

    <!-- Alert toast for Copy Success -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div v-if="showCopySuccess" class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-4 py-2 mt-4 rounded-xl flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {{ t('cl_copy_success') }}
      </div>
    </Transition>

    <!-- Scrollable Form Body -->
    <div class="flex-1 overflow-y-auto pr-1 mt-4 space-y-6">
      <!-- SENDER INFO -->
      <div class="space-y-4">
        <div class="border-b border-theme-border pb-1">
          <h3 class="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{{ t('cl_sender_info') }}</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('full_name') }}</label>
            <input v-model="store.coverLetterData.header.senderName" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('email') }}</label>
            <input v-model="store.coverLetterData.header.senderEmail" type="email" class="input-field" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('phone') }}</label>
            <input v-model="store.coverLetterData.header.senderPhone" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('location') }}</label>
            <input v-model="store.coverLetterData.header.senderLocation" type="text" class="input-field" />
          </div>
        </div>
      </div>

      <!-- RECIPIENT INFO -->
      <div class="space-y-4">
        <div class="border-b border-theme-border pb-1">
          <h3 class="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{{ t('cl_recipient_info') }}</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('cl_date') }}</label>
            <input v-model="store.coverLetterData.header.date" type="text" class="input-field" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('cl_recipient_email') }}</label>
            <input v-model="store.coverLetterData.header.recipientEmail" type="email" class="input-field" placeholder="e.g. hr@company.com" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('cl_recipient_name') }}</label>
            <input v-model="store.coverLetterData.header.recipientName" type="text" class="input-field" placeholder="e.g. Hiring Manager" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('cl_recipient_title') }}</label>
            <input v-model="store.coverLetterData.header.recipientTitle" type="text" class="input-field" placeholder="e.g. Engineering Manager" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('cl_company_name') }}</label>
            <input v-model="store.coverLetterData.header.companyName" type="text" class="input-field" placeholder="e.g. Nexus Tech Global" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted">{{ t('cl_company_address') }}</label>
            <input v-model="store.coverLetterData.header.companyAddress" type="text" class="input-field" placeholder="e.g. 123 Main St, NY" />
          </div>
        </div>
      </div>

      <!-- LETTER CONTENT -->
      <div class="space-y-4">

        <div class="border-b border-theme-border pb-1">
          <h3 class="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{{ t('cl_greeting') }}</h3>
        </div>
        <div class="flex flex-col gap-1.5">
          <input v-model="store.coverLetterData.greeting" type="text" class="input-field" placeholder="e.g. Dear Hiring Manager," />
        </div>

        <div class="border-b border-theme-border pb-1 pt-2">
          <h3 class="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{{ t('cl_opening_p') }}</h3>
        </div>
        <div class="flex flex-col gap-1.5">
          <RichTextEditor
            v-model="store.coverLetterData.openingParagraph"
            placeholder="I am writing to express my strong interest..."
            editor-class="min-h-[100px]"
          />
        </div>

        <div class="border-b border-theme-border pb-1 pt-2 flex justify-between items-center">
          <h3 class="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{{ t('cl_body_ps') }}</h3>
          <button @click="addParagraph" type="button" class="text-primary-600 hover:text-primary-500 font-bold text-xs cursor-pointer flex items-center gap-0.5">
            {{ t('cl_add_p_btn') }}
          </button>
        </div>
        <div class="space-y-4">
          <div v-for="(para, idx) in store.coverLetterData.bodyParagraphs" :key="idx" class="flex flex-col gap-1.5 bg-theme-muted/20 p-3 rounded-xl border border-theme-border/50 relative group">
            <div class="flex justify-between items-center text-[10px] text-theme-text-muted">
              <span>Paragraph {{ idx + 1 }}</span>
              <button @click="removeParagraph(idx)" type="button" class="text-rose-600 hover:text-rose-500 font-bold cursor-pointer opacity-80 hover:opacity-100">
                {{ t('delete') }}
              </button>
            </div>
            <RichTextEditor
              :modelValue="store.coverLetterData.bodyParagraphs[idx] || ''"
              @update:modelValue="(val: string) => { store.coverLetterData.bodyParagraphs[idx] = val }"
              placeholder="Detail your achievements and fit for the company..."
              editor-class="min-h-[120px]"
            />
          </div>
        </div>

        <div class="border-b border-theme-border pb-1 pt-2">
          <h3 class="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{{ t('cl_closing_p') }}</h3>
        </div>
        <div class="flex flex-col gap-1.5">
          <RichTextEditor
            v-model="store.coverLetterData.closingParagraph"
            placeholder="I welcome the opportunity to discuss further..."
            editor-class="min-h-[100px]"
          />
        </div>

        <div class="border-b border-theme-border pb-1 pt-2">
          <h3 class="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{{ t('cl_signoff') }}</h3>
        </div>
        <div class="flex flex-col gap-1.5">
          <RichTextEditor
            v-model="store.coverLetterData.signOff"
            placeholder="Sincerely,&#10;&#10;John Doe"
            editor-class="min-h-[80px]"
          />
        </div>
      </div>
    </div>

    <!-- Quick Email Compose Modal -->
    <UModal
      v-model:open="isEmailModalOpen"
      :overlay="true"
      :modal="true"
      :title="t('cl_quick_email_title') || 'Quick Email Compose'"
      class="max-w-md w-full"
    >
      <template #body>
        <div class="space-y-4 py-2 text-theme-text-sub">
          <!-- Recipient Email -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted font-bold uppercase tracking-wider">
              {{ t('cl_recipient_email') }}
            </label>
            <input
              v-model="emailTo"
              type="email"
              class="input-field"
              placeholder="e.g. hr@company.com"
            />
          </div>

          <!-- Email Subject -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted font-bold uppercase tracking-wider">
              {{ t('email_subject_label') }}
            </label>
            <input
              v-model="emailSubject"
              type="text"
              class="input-field"
              placeholder="e.g. Application for Position"
            />
          </div>

          <!-- Account Selection -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-theme-text-muted font-bold uppercase tracking-wider">
              {{ t('email_account_label') }}
            </label>
            <select
              v-model="emailAccountType"
              class="w-full bg-theme-card border border-theme-border rounded-lg p-2.5 text-theme-text text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm"
            >
              <option value="mailto">{{ t('email_client_mailto') || 'System Default (Mailto)' }}</option>
              <option value="gmail-0">Gmail (Account 1 - Default)</option>
              <option value="gmail-1">Gmail (Account 2)</option>
              <option value="gmail-2">Gmail (Account 3)</option>
              <option value="gmail-3">Gmail (Account 4)</option>
            </select>
          </div>

          <!-- Notice Alert -->
          <div class="bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 text-[10px] p-3 rounded-lg flex items-start gap-2 leading-relaxed">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5 mt-0.5 flex-shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.063 1.063L12 13.06l-1.017-1.017a.75.75 0 0 0-1.063 1.063l1.017 1.017a.75.75 0 0 0 1.063 0l3.036-3.036a.75.75 0 0 0-1.063-1.063L12 11.25Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
            </svg>
            <span>{{ t('email_copy_notice') }}</span>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-theme-border">
            <button
              @click="isEmailModalOpen = false"
              class="px-4 py-2 bg-theme-element hover:bg-theme-hover text-theme-text font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
            >
              {{ t('cancel') }}
            </button>
            <button
              @click="composeEmail"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
              {{ t('email_send_compose') }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<template>
  <div
    class="send-mail-composer"
    @keydown.ctrl.enter.prevent.stop="handleSendMail"
    @keydown.meta.enter.prevent.stop="handleSendMail"
  >
    <n-scrollbar class="composer-content">
      <div class="composer-form">
        <div class="draft-status-bar">
          <span class="draft-status" :class="`draft-status--${draftState}`">
            <n-icon size="15"><DraftIcon /></n-icon>
            {{ draftStatusText }}
          </span>

          <n-popconfirm
            v-if="hasMeaningfulContent"
            positive-text="清除"
            negative-text="保留"
            @positive-click="() => clearDraft()"
          >
            <template #trigger>
              <n-button
                quaternary
                circle
                size="tiny"
                title="清除当前草稿"
                aria-label="清除当前草稿"
              >
                <template #icon><n-icon><TrashIcon /></n-icon></template>
              </n-button>
            </template>
            清除收件人、主题和正文？
          </n-popconfirm>
        </div>

        <n-form ref="formRef" :model="mailForm" :rules="rules" size="large">
          <!-- To Address -->
          <n-form-item path="toMail" label="收件人">
            <n-input
              v-model:value="mailForm.toMail"
              placeholder="收件人邮箱地址"
              clearable
              autofocus
              :input-props="{ type: 'email', autocomplete: 'off' }"
            />
          </n-form-item>

          <!-- Subject -->
          <n-form-item path="subject" label="主题">
            <n-input
              v-model:value="mailForm.subject"
              placeholder="邮件主题"
              maxlength="200"
              show-count
            />
          </n-form-item>

          <!-- Content Type Options -->
          <n-form-item label="内容类型">
            <div class="content-type-row">
              <n-radio-group v-model:value="mailForm.contentType">
                <n-radio-button value="text">文本</n-radio-button>
                <n-radio-button value="html">HTML</n-radio-button>
                <n-radio-button value="rich">富文本</n-radio-button>
              </n-radio-group>

              <n-button
                v-if="mailForm.contentType !== 'text'"
                size="small"
                secondary
                @click="togglePreview"
              >
                <template #icon>
                  <n-icon>
                    <CreateIcon v-if="showPreview" />
                    <EyeIcon v-else />
                  </n-icon>
                </template>
                {{ showPreview ? '继续编辑' : '预览邮件' }}
              </n-button>
            </div>
          </n-form-item>

          <!-- Content -->
          <n-form-item path="content" label="邮件内容">
            <!-- Preview Mode -->
            <div v-if="showPreview" class="content-preview">
              <div class="preview-label">邮件预览</div>
              <div class="preview-paper" v-html="safePreviewHtml"></div>
            </div>
            
            <!-- Rich Text Editor -->
            <div v-else-if="mailForm.contentType === 'rich'" class="rich-editor">
              <div class="rich-toolbar" role="toolbar" aria-label="富文本格式">
                <n-button-group size="small">
                  <n-button title="撤销" aria-label="撤销" @mousedown.prevent="runEditorCommand('undo')">
                    <template #icon><n-icon><UndoIcon /></n-icon></template>
                  </n-button>
                  <n-button title="重做" aria-label="重做" @mousedown.prevent="runEditorCommand('redo')">
                    <template #icon><n-icon><RedoIcon /></n-icon></template>
                  </n-button>
                </n-button-group>

                <n-button-group size="small">
                  <n-button title="加粗" aria-label="加粗" @mousedown.prevent="runEditorCommand('bold')">
                    <strong>B</strong>
                  </n-button>
                  <n-button title="斜体" aria-label="斜体" @mousedown.prevent="runEditorCommand('italic')">
                    <em>I</em>
                  </n-button>
                  <n-button title="下划线" aria-label="下划线" @mousedown.prevent="runEditorCommand('underline')">
                    <span class="underline-icon">U</span>
                  </n-button>
                </n-button-group>

                <n-button-group size="small">
                  <n-button title="无序列表" aria-label="无序列表" @mousedown.prevent="runEditorCommand('insertUnorderedList')">
                    <template #icon><n-icon><ListIcon /></n-icon></template>
                  </n-button>
                  <n-button title="有序列表" aria-label="有序列表" @mousedown.prevent="runEditorCommand('insertOrderedList')">
                    <span class="ordered-list-icon">1.</span>
                  </n-button>
                </n-button-group>

                <n-popover v-model:show="showLinkPopover" trigger="click" placement="bottom-start">
                  <template #trigger>
                    <n-button size="small" title="插入链接" aria-label="插入链接" @mousedown="saveEditorSelection">
                      <template #icon><n-icon><LinkIcon /></n-icon></template>
                    </n-button>
                  </template>
                  <div class="link-editor">
                    <n-input
                      v-model:value="linkUrl"
                      size="small"
                      placeholder="https://example.com"
                      @keyup.enter="applyLink"
                    />
                    <n-button size="small" type="primary" @click="applyLink">应用</n-button>
                  </div>
                </n-popover>

                <n-button size="small" title="清除格式" aria-label="清除格式" @mousedown.prevent="runEditorCommand('removeFormat')">
                  <template #icon><n-icon><RemoveFormatIcon /></n-icon></template>
                </n-button>
              </div>

              <div
                ref="richEditorRef"
                class="rich-editor-surface"
                contenteditable="true"
                role="textbox"
                aria-multiline="true"
                data-placeholder="请输入邮件内容..."
                @input="syncRichContent"
                @keyup="saveEditorSelection"
                @mouseup="saveEditorSelection"
                @blur="syncRichContent"
              ></div>
              <div class="editor-footer">
                <span>支持基础格式、列表和链接</span>
                <span>{{ contentCharacterCount }} 字</span>
              </div>
            </div>
            
            <!-- HTML/Text Editor -->
            <div v-else class="plain-editor">
              <n-input
                v-model:value="mailForm.content"
                type="textarea"
                :placeholder="mailForm.contentType === 'html' ? '请输入 HTML 内容...' : '请输入邮件内容...'"
                :autosize="{ minRows: 10, maxRows: 20 }"
              />
              <div class="plain-editor-footer">
                <span>{{ mailForm.contentType === 'html' ? 'HTML 源码' : '纯文本' }}</span>
                <span>{{ contentCharacterCount }} 字</span>
              </div>
            </div>
          </n-form-item>
        </n-form>
      </div>
    </n-scrollbar>


  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  NScrollbar,
  NForm,
  NFormItem,
  NInput,
  NRadioGroup,
  NRadioButton,
  NButton,
  NButtonGroup,
  NPopover,
  NPopconfirm,
  NIcon,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'
import {
  EyeOutline as EyeIcon,
  CreateOutline as CreateIcon,
  ListOutline as ListIcon,
  LinkOutline as LinkIcon,
  TextOutline as RemoveFormatIcon,
  ArrowUndoOutline as UndoIcon,
  ArrowRedoOutline as RedoIcon,
  CheckmarkCircleOutline as DraftIcon,
  TrashOutline as TrashIcon
} from '@vicons/ionicons5'
import { mailApi, emailRecordSaver } from '@/utils/api'
import { extractTextFromHtml, sanitizeHtml } from '@/utils/helpers'
import type { SendMailRequest } from '@/types'

// Define props
const props = defineProps<{
  fromAddress?: { address: string } | null
}>()

// Define emits
const emit = defineEmits<{
  sent: []
  sendingChange: [sending: boolean]
}>()

const message = useMessage()

// State
const formRef = ref<FormInst | null>(null)
const sending = ref(false)
const showPreview = ref(false)
const richEditorRef = ref<HTMLDivElement | null>(null)
const showLinkPopover = ref(false)
const linkUrl = ref('')
let savedEditorRange: Range | null = null
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null
let draftReady = false
let switchingContentType = false
let suppressContentTypeWatch = false

type ContentType = 'text' | 'html' | 'rich'
type DraftState = 'idle' | 'saving' | 'saved' | 'error'

interface ComposeDraft {
  version: 1
  toMail: string
  subject: string
  contentType: ContentType
  contents: Record<ContentType, string>
  initializedModes: Record<ContentType, boolean>
  updatedAt: string
}

// Form data - 完全按照示例前端的格式
const mailForm = reactive({
  toMail: '',
  subject: '',
  contentType: 'text' as ContentType,
  content: ''
})

const modeContents = reactive<Record<ContentType, string>>({
  text: '',
  html: '',
  rich: ''
})

const initializedModes = reactive<Record<ContentType, boolean>>({
  text: true,
  html: false,
  rich: false
})

const draftState = ref<DraftState>('idle')
const draftSavedAt = ref<Date | null>(null)

// Computed
const fromAddress = computed(() => props.fromAddress)
const safePreviewHtml = computed(() => sanitizeHtml(mailForm.content))
const contentCharacterCount = computed(() => {
  if (mailForm.contentType === 'text') return mailForm.content.trim().length
  return extractTextFromHtml(mailForm.content).trim().length
})
const draftStorageKey = computed(() => `temp-email:compose:${fromAddress.value?.address || 'unknown'}`)
const hasMeaningfulContent = computed(() => Boolean(
  mailForm.toMail.trim() ||
  mailForm.subject.trim() ||
  Object.values(modeContents).some(content => extractTextFromHtml(content).trim())
))
const draftStatusText = computed(() => {
  if (draftState.value === 'saving') return '正在保存草稿'
  if (draftState.value === 'error') return '草稿保存失败'
  if (draftState.value === 'saved' && draftSavedAt.value) {
    return `草稿已保存 ${draftSavedAt.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }
  return '新邮件'
})

// Form validation rules
const rules: FormRules = {
  toMail: [
    { required: true, message: '请输入收件人邮箱', trigger: 'blur' },
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '请输入有效的邮箱地址',
      trigger: 'blur'
    }
  ],
  subject: [
    { required: true, message: '请输入邮件主题', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入邮件内容', trigger: 'blur' }
  ]
}

// Methods
function togglePreview() {
  if (!showPreview.value && mailForm.contentType === 'rich') {
    syncRichContent()
  }
  showPreview.value = !showPreview.value
}

function plainTextToHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML.replace(/\r?\n/g, '<br>')
}

function setRichEditorContent(value: string) {
  if (richEditorRef.value && richEditorRef.value.innerHTML !== value) {
    richEditorRef.value.innerHTML = value
  }
}

function syncRichContent() {
  if (!richEditorRef.value) return
  const hasVisibleContent = Boolean(richEditorRef.value.textContent?.trim() || richEditorRef.value.querySelector('img'))
  mailForm.content = hasVisibleContent ? richEditorRef.value.innerHTML : ''
}

function queueDraftSave() {
  if (!draftReady) return

  draftState.value = 'saving'
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
  draftSaveTimer = setTimeout(persistDraft, 450)
}

function persistDraft() {
  if (!draftReady) return

  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
    draftSaveTimer = null
  }

  try {
    if (!hasMeaningfulContent.value) {
      localStorage.removeItem(draftStorageKey.value)
      draftSavedAt.value = null
      draftState.value = 'idle'
      return
    }

    const updatedAt = new Date().toISOString()
    const draft: ComposeDraft = {
      version: 1,
      toMail: mailForm.toMail,
      subject: mailForm.subject,
      contentType: mailForm.contentType,
      contents: { ...modeContents },
      initializedModes: { ...initializedModes },
      updatedAt
    }

    localStorage.setItem(draftStorageKey.value, JSON.stringify(draft))
    draftSavedAt.value = new Date(updatedAt)
    draftState.value = 'saved'
  } catch (error) {
    console.error('Failed to save compose draft:', error)
    draftState.value = 'error'
  }
}

async function loadDraft() {
  draftReady = false
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
    draftSaveTimer = null
  }

  try {
    const rawDraft = localStorage.getItem(draftStorageKey.value)
    if (!rawDraft) return

    const draft = JSON.parse(rawDraft) as Partial<ComposeDraft>
    const contentType: ContentType = ['text', 'html', 'rich'].includes(draft.contentType || '')
      ? draft.contentType as ContentType
      : 'text'

    Object.assign(modeContents, {
      text: draft.contents?.text || '',
      html: draft.contents?.html || '',
      rich: draft.contents?.rich || ''
    })
    Object.assign(initializedModes, {
      text: draft.initializedModes?.text ?? true,
      html: draft.initializedModes?.html ?? Boolean(draft.contents?.html),
      rich: draft.initializedModes?.rich ?? Boolean(draft.contents?.rich)
    })
    suppressContentTypeWatch = true
    Object.assign(mailForm, {
      toMail: draft.toMail || '',
      subject: draft.subject || '',
      contentType,
      content: modeContents[contentType]
    })

    draftSavedAt.value = draft.updatedAt ? new Date(draft.updatedAt) : new Date()
    draftState.value = 'saved'
    await nextTick()
    if (contentType === 'rich') setRichEditorContent(mailForm.content)
    suppressContentTypeWatch = false
  } catch (error) {
    suppressContentTypeWatch = false
    console.error('Failed to restore compose draft:', error)
    localStorage.removeItem(draftStorageKey.value)
    draftState.value = 'error'
  } finally {
    draftReady = true
  }
}

async function clearDraft(showMessage = true) {
  draftReady = false
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
    draftSaveTimer = null
  }

  localStorage.removeItem(draftStorageKey.value)
  Object.assign(modeContents, { text: '', html: '', rich: '' })
  Object.assign(initializedModes, { text: true, html: false, rich: false })
  suppressContentTypeWatch = true
  Object.assign(mailForm, {
    toMail: '',
    subject: '',
    contentType: 'text',
    content: ''
  })
  showPreview.value = false
  draftSavedAt.value = null
  draftState.value = 'idle'
  savedEditorRange = null
  await nextTick()
  setRichEditorContent('')
  suppressContentTypeWatch = false
  formRef.value?.restoreValidation()
  draftReady = true

  if (showMessage) message.success('草稿已清除')
}

function saveEditorSelection() {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !richEditorRef.value) return

  const range = selection.getRangeAt(0)
  if (richEditorRef.value.contains(range.commonAncestorContainer)) {
    savedEditorRange = range.cloneRange()
  }
}

function restoreEditorSelection() {
  if (!savedEditorRange) return
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(savedEditorRange)
}

function runEditorCommand(command: string, value?: string) {
  richEditorRef.value?.focus()
  restoreEditorSelection()
  document.execCommand(command, false, value)
  saveEditorSelection()
  syncRichContent()
}

function applyLink() {
  const url = linkUrl.value.trim()
  if (!url) {
    message.warning('请输入链接地址')
    return
  }

  const normalizedUrl = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`
  runEditorCommand('createLink', normalizedUrl)
  linkUrl.value = ''
  showLinkPopover.value = false
}

watch(() => mailForm.contentType, async (nextType, previousType) => {
  if (suppressContentTypeWatch) return
  switchingContentType = true
  showPreview.value = false

  if (previousType === 'rich') {
    syncRichContent()
  }

  const previousContent = mailForm.content
  modeContents[previousType] = previousContent

  if (!initializedModes[nextType]) {
    modeContents[nextType] = nextType === 'text'
      ? extractTextFromHtml(previousContent)
      : previousType === 'text'
        ? plainTextToHtml(previousContent)
        : previousContent
    initializedModes[nextType] = true
  }

  mailForm.content = modeContents[nextType]
  await nextTick()
  if (nextType === 'rich') setRichEditorContent(mailForm.content)
  switchingContentType = false
  queueDraftSave()
})

watch(() => mailForm.content, content => {
  if (switchingContentType) return
  modeContents[mailForm.contentType] = content
  initializedModes[mailForm.contentType] = true
  queueDraftSave()
})

watch([() => mailForm.toMail, () => mailForm.subject], queueDraftSave)

onMounted(loadDraft)

onBeforeUnmount(() => {
  if (draftReady && draftSaveTimer) persistDraft()
})

async function handleSendMail(): Promise<boolean> {
  if (!formRef.value || sending.value) return false

  // 检查是否选择了发件邮箱
  if (!fromAddress.value?.address) {
    message.error('请先选择发件邮箱')
    return false
  }

  try {
    if (mailForm.contentType === 'rich') syncRichContent()
    await formRef.value.validate()
  } catch {
    message.warning('请检查收件人、主题和邮件内容')
    return false
  }

  try {
    sending.value = true
    emit('sendingChange', true)

    // 构建发送数据，完全按照示例前端的格式
    const sendData: SendMailRequest = {
      from_name: '',
      from_mail: fromAddress.value.address,
      to_name: '',
      to_mail: mailForm.toMail,
      subject: mailForm.subject,
      is_html: mailForm.contentType !== 'text',
      content: mailForm.content
    }

    // 使用管理员API发送邮件，完全按照示例前端的调用方式
    await mailApi.sendByAdmin(sendData)

    // 邮件发送成功后，保存记录到本地
    try {
      const mailRecord = {
        from_mail: fromAddress.value.address,
        to_mail: mailForm.toMail,
        subject: mailForm.subject,
        content: mailForm.content,
        is_html: mailForm.contentType !== 'text',
        sent_at: new Date().toISOString()
      }

      await emailRecordSaver.saveMailRecord(mailRecord)
      console.log('✅ Mail record saved successfully')
    } catch (saveError) {
      console.error('❌ Failed to save mail record:', saveError)
      // 保存失败不影响邮件发送成功的提示
      message.warning('邮件发送成功，但保存记录失败')
    }

    await clearDraft(false)

    // 通知父组件
    emit('sent')

    console.log('✅ Mail sent successfully')
    return true
  } catch (error) {
    console.error('Failed to send mail:', error)
    message.error(error instanceof Error ? error.message : '发送邮件失败')
    return false
  } finally {
    sending.value = false
    emit('sendingChange', false)
  }
}

// Expose methods for parent component
defineExpose({
  sendMail: handleSendMail,
  hasContent: () => hasMeaningfulContent.value,
  saveDraft: persistDraft
})
</script>

<style scoped>
.send-mail-composer {
  height: 100%;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  --composer-panel: rgba(255, 255, 255, 0.72);
  --composer-paper: rgba(255, 255, 255, 0.94);
  --composer-toolbar: rgba(239, 247, 249, 0.88);
  --composer-border: rgba(116, 146, 174, 0.22);
  --composer-muted: rgba(67, 86, 104, 0.7);
}

[data-theme="dark"] .send-mail-composer {
  --composer-panel: rgba(12, 26, 45, 0.72);
  --composer-paper: rgba(15, 29, 48, 0.96);
  --composer-toolbar: rgba(10, 22, 38, 0.92);
  --composer-border: rgba(148, 190, 225, 0.16);
  --composer-muted: rgba(190, 211, 229, 0.64);
}

.composer-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
}

.composer-form {
  max-width: 100%;
}

.draft-status-bar {
  min-height: 34px;
  margin-bottom: 8px;
  padding: 3px 4px 3px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--composer-border);
  border-radius: 8px;
  background: var(--composer-panel);
}

.draft-status {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--composer-muted);
  font-size: 11px;
  line-height: 1.4;
}

.draft-status--saved {
  color: var(--success-color-pressed);
}

.draft-status--saving {
  color: var(--n-primary-color);
}

.draft-status--error {
  color: var(--error-color);
}

.draft-status--saving :deep(.n-icon) {
  animation: draft-pulse 1s ease-in-out infinite;
}

@keyframes draft-pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

.composer-form :deep(.n-form-item) {
  margin-bottom: 2px;
}

.content-type-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.content-preview {
  width: 100%;
  border: 1px solid var(--composer-border);
  border-radius: 8px;
  min-height: 200px;
  background: var(--composer-panel);
  overflow: hidden;
}

.preview-label {
  padding: 8px 12px;
  border-bottom: 1px solid var(--composer-border);
  color: var(--composer-muted);
  font-size: 12px;
  font-weight: 600;
}

.preview-paper {
  min-height: 220px;
  padding: 20px;
  background: var(--composer-paper);
  color: var(--n-text-color);
  overflow-wrap: anywhere;
}

.rich-editor {
  width: 100%;
  border: 1px solid var(--composer-border);
  border-radius: 8px;
  background: var(--composer-paper);
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.rich-editor:focus-within {
  border-color: var(--n-primary-color);
  box-shadow: 0 0 0 2px var(--n-primary-color-suppl);
}

.rich-toolbar {
  min-height: 44px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--composer-border);
  background: var(--composer-toolbar);
}

.rich-toolbar :deep(.n-button) {
  min-width: 32px;
}

.underline-icon {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ordered-list-icon {
  font-size: 12px;
  font-weight: 700;
}

.rich-editor-surface {
  min-height: 240px;
  max-height: 420px;
  padding: 18px;
  overflow-y: auto;
  color: var(--n-text-color);
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.rich-editor-surface:empty::before {
  content: attr(data-placeholder);
  color: var(--n-placeholder-color);
  pointer-events: none;
}

.rich-editor-surface:focus {
  outline: none;
}

.rich-editor-surface :deep(ul),
.rich-editor-surface :deep(ol) {
  padding-left: 24px;
}

.rich-editor-surface :deep(a) {
  color: var(--n-primary-color);
}

.editor-footer {
  min-height: 30px;
  padding: 6px 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--composer-border);
  color: var(--composer-muted);
  background: var(--composer-toolbar);
  font-size: 11px;
}

.plain-editor {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--composer-border);
  border-radius: 8px;
  background: var(--composer-paper);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.plain-editor:focus-within {
  border-color: var(--n-primary-color);
  box-shadow: 0 0 0 2px var(--n-primary-color-suppl);
}

.plain-editor :deep(.n-input) {
  --n-border: 0 !important;
  --n-border-hover: 0 !important;
  --n-border-focus: 0 !important;
  --n-box-shadow-focus: none !important;
  border-radius: 0;
}

.plain-editor-footer {
  min-height: 30px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--composer-border);
  color: var(--composer-muted);
  background: var(--composer-toolbar);
  font-size: 11px;
}

.link-editor {
  width: min(320px, 72vw);
  display: flex;
  gap: 8px;
}


/* Form styling */
:deep(.n-form-item-label) {
  font-weight: 500;
}

:deep(.n-input-group) {
  width: 100%;
}

:deep(.n-radio-group) {
  display: flex;
  gap: 8px;
}

/* Responsive design */
@media (max-width: 768px) {
  .composer-content {
    padding: 8px 10px 12px;
  }

  .content-type-row {
    align-items: stretch;
    flex-direction: column;
  }

  .content-type-row :deep(.n-radio-group) {
    width: 100%;
  }

  .content-type-row :deep(.n-radio-button) {
    flex: 1;
    text-align: center;
  }

  .rich-editor-surface {
    min-height: 200px;
    padding: 14px;
  }

  .rich-toolbar {
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
  }

  .rich-toolbar > * {
    flex: 0 0 auto;
  }

  .preview-paper {
    min-height: 200px;
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .draft-status--saving :deep(.n-icon) {
    animation: none;
  }
}
</style>

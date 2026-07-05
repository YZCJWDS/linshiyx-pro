<template>
  <div class="mail-list">
    <!-- No Address Selected State -->
    <div v-if="!emailStore.selectedAddress" class="empty-state">
      <n-empty description="选择邮箱地址查看邮件" size="large">
        <template #icon>
          <n-icon size="64" color="#ccc">
            <MailIcon />
          </n-icon>
        </template>
        <template #extra>
          <n-text depth="3">
            从左侧面板选择一个邮箱地址来查看收到的邮件
          </n-text>
        </template>
      </n-empty>
    </div>

    <!-- Mail List Content -->
    <div v-else class="mail-list-content">
      <!-- Mail List Header -->
      <div class="mail-list-header">
        <div class="selected-address-info">
          <n-icon size="16" class="address-icon">
            <MailIcon />
          </n-icon>
          <span class="address-text" :title="emailStore.selectedAddress.address">{{ emailStore.selectedAddress.address }}</span>
          <n-button
            size="tiny"
            quaternary
            circle
            @click="copyAddress"
            title="复制地址"
          >
            <template #icon>
              <n-icon size="12">
                <CopyIcon />
              </n-icon>
            </template>
          </n-button>
        </div>
        
        <div class="mail-actions">
          <n-button
            size="small"
            quaternary
            circle
            @click="refreshMails"
            :loading="loading.mails"
            title="刷新"
          >
            <template #icon>
              <n-icon>
                <RefreshIcon />
              </n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-section">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索邮件..."
          clearable
          size="small"
          @input="handleSearch"
        >
          <template #prefix>
            <n-icon size="16">
              <SearchIcon />
            </n-icon>
          </template>
        </n-input>
      </div>

      <!-- Mail Items -->
      <div class="mail-items-container">
        <n-scrollbar style="max-height: 100%;">
          <!-- Loading State -->
          <n-spin v-if="loading.mails" class="loading-spin" />
          
          <!-- Empty State -->
          <n-empty 
            v-else-if="!filteredMails.length"
            :description="searchKeyword ? 'No emails found matching your search' : 'No emails received yet'"
            size="small"
          >
            <template #icon>
              <n-icon size="48" color="#ccc">
                <InboxIcon />
              </n-icon>
            </template>
          </n-empty>

          <!-- Mail List -->
          <div v-else class="mail-items">
            <div
              v-for="mail in filteredMails"
              :key="mail.id"
              class="mail-item"
              :class="{ 
                'mail-item--selected': emailStore.selectedMail?.id === mail.id,
                'mail-item--unread': isUnread(mail)
              }"
              @click="handleSelectMail(mail)"
            >
              <div class="mail-item-content">
                <!-- Mail Header -->
                <div class="mail-header">
                  <div class="mail-from">
                    <n-icon size="14" class="from-icon">
                      <PersonIcon />
                    </n-icon>
                    <span class="from-text" :title="mail.source">{{ truncateText(mail.source, 25) }}</span>
                  </div>
                  <div class="mail-time">
                    {{ formatDate(mail.created_at) }}
                  </div>
                </div>

                <!-- Mail Subject -->
                <div class="mail-subject" :title="getDecodedSubject(mail)">
                  {{ getDecodedSubject(mail) }}
                </div>

                <!-- Mail Preview -->
                <div class="mail-preview">
                  {{ getMailPreview(mail) }}
                </div>

                <!-- Mail Meta -->
                <div class="mail-meta">
                  <div class="mail-tags">
                    <n-tag v-if="mail.is_html" size="tiny" type="info">HTML</n-tag>
                    <n-tag v-if="hasAttachments(mail)" size="tiny" type="warning">
                      <template #icon>
                        <n-icon size="12">
                          <AttachIcon />
                        </n-icon>
                      </template>
                      {{ getAttachmentCount(mail) }}
                    </n-tag>
                  </div>
                </div>
              </div>

              <!-- Mail Actions -->
              <div class="mail-item-actions">
                <n-popconfirm
                  @positive-click="handleDeleteMail(mail.id)"
                  negative-text="Cancel"
                  positive-text="Delete"
                >
                  <template #trigger>
                    <n-button
                      size="tiny"
                      quaternary
                      circle
                      type="error"
                      @click.stop
                      title="Delete Email"
                    >
                      <template #icon>
                        <n-icon size="14">
                          <DeleteIcon />
                        </n-icon>
                      </template>
                    </n-button>
                  </template>
                  Are you sure you want to delete this email?
                </n-popconfirm>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>

      <!-- Mail Count Info -->
      <div class="mail-count-info">
        <n-text depth="3" size="small">
          {{ filteredMails.length }} email{{ filteredMails.length !== 1 ? 's' : '' }}
          {{ searchKeyword ? `found for "${searchKeyword}"` : 'total' }}
        </n-text>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NEmpty,
  NIcon,
  NText,
  NButton,
  NInput,
  NScrollbar,
  NSpin,
  NPopconfirm,
  NTag,
  useMessage
} from 'naive-ui'
import {
  Mail as MailIcon,
  Copy as CopyIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Archive as InboxIcon,
  Person as PersonIcon,
  Attach as AttachIcon,
  Trash as DeleteIcon
} from '@vicons/ionicons5'
import { useEmailStore, useUiStore } from '@/stores'
import { 
  formatRelativeTime, 
  truncateText, 
  extractTextFromHtml, 
  copyToClipboard,
  debounce 
} from '@/utils/helpers'
import type { EmailMessage } from '@/types'

const emailStore = useEmailStore()
const uiStore = useUiStore()
const message = useMessage()

// Local state
const searchKeyword = ref('')
const readEmails = ref<Set<string>>(new Set())

// Computed
const loading = computed(() => emailStore.loading)

const filteredMails = computed(() => {
  let mails = emailStore.selectedAddressMails

  // Apply search filter
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    mails = mails.filter(mail => 
      mail.subject.toLowerCase().includes(keyword) ||
      mail.source.toLowerCase().includes(keyword) ||
      extractTextFromHtml(mail.message).toLowerCase().includes(keyword)
    )
  }

  // Sort by date (newest first)
  return [...mails].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
})

// Methods
function handleSelectMail(mail: EmailMessage) {
  emailStore.selectMail(mail)
  readEmails.value.add(mail.id)
}

function handleDeleteMail(id: string) {
  emailStore.deleteMail(id)
}

async function refreshMails() {
  if (emailStore.selectedAddress) {
    await emailStore.loadMails(emailStore.selectedAddress.address)
    message.success('Emails refreshed')
  }
}

async function copyAddress() {
  if (emailStore.selectedAddress) {
    const success = await copyToClipboard(emailStore.selectedAddress.address)
    if (success) {
      message.success('Email address copied to clipboard')
    } else {
      message.error('Failed to copy email address')
    }
  }
}

const debouncedSearch = debounce(() => {
  // Search is handled by computed property
}, 300)

function handleSearch() {
  debouncedSearch()
}

function formatDate(dateString: string) {
  return formatRelativeTime(dateString, uiStore.useUTCDate)
}

function getMailPreview(mail: EmailMessage): string {
  const text = extractTextFromHtml(mail.message)
  return truncateText(text, 80)
}

function isUnread(mail: EmailMessage): boolean {
  return !readEmails.value.has(mail.id)
}

function hasAttachments(mail: EmailMessage): boolean {
  return mail.attachments && mail.attachments.length > 0
}

function getAttachmentCount(mail: EmailMessage): string {
  if (!mail.attachments) return '0'
  return mail.attachments.length.toString()
}

// 解码邮件主题
function getDecodedSubject(mail: EmailMessage): string {
  let subject = mail.subject || ''

  // 如果主题为空，尝试从原始邮件中提取
  if (!subject) {
    // 尝试从 raw 字段提取
    const rawContent = mail.raw || mail.message || ''
    if (rawContent) {
      // 查找 Subject 行，支持多行折叠
      const subjectMatch = rawContent.match(/^Subject:\s*(.+?)(?=\r?\n[^\s]|\r?\n\r?\n|$)/ms)
      if (subjectMatch) {
        subject = subjectMatch[1]
          .replace(/\r?\n\s+/g, ' ') // 处理多行折叠
          .trim()
      }
    }
  }

  if (!subject) return '(无主题)'

  // 解码 RFC 2047 编码的主题 (=?charset?encoding?encoded-text?=)
  try {
    subject = subject.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (match, charset, encoding, encodedText) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          // Base64 解码
          const decoded = atob(encodedText)
          // 转换为 UTF-8
          return decodeURIComponent(escape(decoded))
        } else if (encoding.toUpperCase() === 'Q') {
          // Quoted-Printable 解码
          return encodedText.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16))
          })
        }
      } catch (error) {
        console.warn('Failed to decode subject part:', error)
      }
      return match
    })
  } catch (error) {
    console.warn('Failed to decode subject:', error)
  }

  return subject || '(No Subject)'
}

// Watch for address changes to clear read status
watch(() => emailStore.selectedAddress, () => {
  readEmails.value.clear()
  searchKeyword.value = ''
})
</script>

<style scoped>
.mail-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  --mail-panel: rgba(255, 255, 255, 0.34);
  --mail-panel-strong: rgba(255, 255, 255, 0.58);
  --mail-item: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(246, 251, 250, 0.72));
  --mail-item-hover: rgba(79, 143, 199, 0.12);
  --mail-item-selected: linear-gradient(100deg, rgba(63, 159, 211, 0.24), rgba(255, 255, 255, 0.9) 58%, rgba(234, 247, 248, 0.84));
  --mail-border: rgba(88, 112, 130, 0.2);
  --mail-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 1px 2px rgba(33, 55, 76, 0.08), 0 10px 24px rgba(33, 55, 76, 0.1);
  --mail-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.78) inset, 0 3px 7px rgba(33, 55, 76, 0.12), 0 20px 46px rgba(33, 55, 76, 0.16);
}

[data-theme="dark"] .mail-list {
  --mail-panel: rgba(5, 10, 20, 0.26);
  --mail-panel-strong: rgba(9, 18, 32, 0.54);
  --mail-item: linear-gradient(180deg, rgba(20, 36, 58, 0.9), rgba(10, 20, 36, 0.86));
  --mail-item-hover: rgba(143, 216, 255, 0.13);
  --mail-item-selected: linear-gradient(100deg, rgba(143, 216, 255, 0.24), rgba(18, 34, 55, 0.94) 58%, rgba(12, 22, 40, 0.9));
  --mail-border: rgba(196, 226, 248, 0.17);
  --mail-shadow: 0 1px 0 rgba(255, 255, 255, 0.055) inset, 0 1px 2px rgba(0, 0, 0, 0.34), 0 12px 28px rgba(0, 0, 0, 0.26);
  --mail-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.075) inset, 0 3px 8px rgba(0, 0, 0, 0.42), 0 22px 52px rgba(0, 0, 0, 0.36);
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.mail-list-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.mail-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 2px 6px;
  border: 0;
  border-bottom: 1px solid var(--mail-border);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.selected-address-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding-right: 6px;
}

.address-icon {
  color: var(--n-primary-color);
  flex-shrink: 0;
}

.address-text {
  font-weight: 500;
  color: var(--n-text-color);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-section {
  flex-shrink: 0;
}

.search-section :deep(.n-input) {
  background: var(--mail-panel-strong);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08) inset;
}

.mail-items-container {
  flex: 1;
  min-height: 0;
}

.loading-spin {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.mail-items {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.mail-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-height: 114px;
  padding: 12px 10px 12px 14px;
  border-radius: var(--radius-card);
  border: 1px solid var(--mail-border);
  background: var(--mail-item);
  box-shadow: var(--mail-shadow);
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
  position: relative;
  will-change: transform;
}

.mail-item:hover {
  border-color: rgba(79, 143, 199, 0.44);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(246, 251, 252, 0.58)),
    var(--mail-item-hover);
  box-shadow: var(--mail-shadow-hover);
  transform: translateY(-2px);
}

.mail-item--selected {
  border-color: var(--n-primary-color) !important;
  background: var(--mail-item-selected) !important;
  box-shadow:
    inset 3px 0 0 var(--n-primary-color),
    0 0 0 1px rgba(63, 159, 211, 0.12),
    var(--mail-shadow-hover);
  transform: translateY(-2px);
}

.mail-item--selected::before {
  content: none;
}

/* 深色模式下的选中效果 */
[data-theme="dark"] .mail-item--selected {
  background: var(--mail-item-selected) !important;
  box-shadow:
    inset 3px 0 0 var(--n-primary-color),
    0 0 0 1px rgba(123, 210, 246, 0.12),
    var(--mail-shadow-hover);
}

.mail-item--unread {
  border-left-color: var(--n-primary-color);
}

.mail-item--unread::after {
  content: '';
  position: absolute;
  top: 15px;
  left: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0 16%, var(--n-primary-color) 30% 100%);
  box-shadow:
    0 0 0 3px var(--n-primary-color-suppl),
    0 0 18px rgba(63, 159, 211, 0.46);
}

[data-theme="dark"] .mail-item--unread::after {
  box-shadow:
    0 0 0 3px var(--n-primary-color-suppl),
    0 0 18px rgba(123, 210, 246, 0.5);
}

.mail-item--unread .mail-subject {
  font-weight: 600;
}

.mail-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.mail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.mail-from {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.from-icon {
  color: var(--n-text-color-2);
  flex-shrink: 0;
}

.from-text {
  font-size: 12px;
  color: var(--n-text-color-2);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-time {
  font-size: 11px;
  color: var(--n-text-color-3);
  flex-shrink: 0;
}

.mail-subject {
  font-size: 14px;
  color: var(--n-text-color);
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mail-preview {
  font-size: 12px;
  color: var(--n-text-color-2);
  line-height: 1.48;
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mail-tags {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mail-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 28px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mail-item:hover .mail-item-actions,
.mail-item--selected .mail-item-actions,
.mail-item-actions:focus-within {
  opacity: 1;
}

[data-theme="dark"] .mail-list-header {
  background: transparent;
}

[data-theme="dark"] .mail-item {
  border-color: var(--mail-border);
  background: var(--mail-item);
}

[data-theme="dark"] .mail-item:hover {
  background:
    linear-gradient(180deg, rgba(28, 48, 74, 0.94), rgba(12, 24, 42, 0.9)),
    var(--mail-item-hover);
  box-shadow: var(--mail-shadow-hover);
}

.mail-count-info {
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid var(--mail-border);
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .mail-list-content {
    padding: 12px;
    gap: 10px;
  }

  .mail-item {
    padding: 10px;
  }

  .mail-item-actions {
    opacity: 1;
  }

  .mail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .mail-time {
    align-self: flex-end;
  }
}
</style>

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
          <div class="empty-extra">
            <n-text depth="3" class="empty-copy">
              在左侧邮箱列表或底部“邮箱”标签中选择一个地址。
            </n-text>
          </div>
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
            v-if="unreadCount > 0"
            size="tiny"
            quaternary
            round
            @click="markAllRead"
            title="全部标为已读"
          >
            全部已读
          </n-button>
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

      <!-- 最新验证码高亮卡片 -->
      <transition name="code-card">
        <button
          v-if="latestCode"
          type="button"
          class="latest-code-card"
          :class="{ 'latest-code-card--copied': codeCopied }"
          @click="copyLatestCode"
          :title="`点击复制验证码 ${latestCode.code}`"
        >
          <div class="code-card-left">
            <n-icon size="18" class="code-card-icon">
              <CodeIcon />
            </n-icon>
            <div class="code-card-info">
              <span class="code-card-label">最新验证码</span>
              <span class="code-card-source">{{ truncateText(latestCode.mail.source || '未知发件人', 22) }}</span>
            </div>
          </div>
          <div class="code-card-right">
            <span class="code-card-value">{{ latestCode.code }}</span>
            <n-icon size="16" class="code-card-action">
              <CheckmarkIcon v-if="codeCopied" />
              <CopyIcon v-else />
            </n-icon>
          </div>
        </button>
      </transition>

      <!-- Mail Items -->
      <div class="mail-items-container">
        <n-scrollbar style="max-height: 100%;">
          <!-- Loading State -->
          <div v-if="loading.mails" class="mail-skeleton-list" aria-label="正在加载邮件">
            <div v-for="item in 5" :key="item" class="mail-skeleton-card">
              <span class="skeleton-avatar"></span>
              <div class="skeleton-lines">
                <span class="skeleton-line skeleton-line--title"></span>
                <span class="skeleton-line skeleton-line--body"></span>
                <span class="skeleton-line skeleton-line--meta"></span>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <n-empty
            v-else-if="!filteredMails.length"
            :description="searchKeyword ? '没有找到匹配的邮件' : '还没有收到邮件'"
            size="small"
          >
            <template #icon>
              <n-icon size="48" color="#ccc">
                <InboxIcon />
              </n-icon>
            </template>
            <template #extra>
              <div class="empty-extra">
                <n-button
                  v-if="searchKeyword"
                  size="small"
                  secondary
                  @click="clearSearch"
                >
                  清空搜索
                </n-button>
                <n-button
                  v-else
                  size="small"
                  secondary
                  @click="refreshMails"
                  :loading="loading.mails"
                >
                  <template #icon>
                    <n-icon>
                      <RefreshIcon />
                    </n-icon>
                  </template>
                  刷新收件箱
                </n-button>
              </div>
            </template>
          </n-empty>

          <!-- Mail List -->
          <transition-group v-else tag="div" name="mail-item" class="mail-items">
            <div
              v-for="mail in pagedMails"
              :key="mail.id"
              class="mail-item"
              :class="{
                'mail-item--selected': emailStore.selectedMail?.id === mail.id,
                'mail-item--unread': isUnread(mail),
                'mail-item--read': !isUnread(mail)
              }"
              title="单击查看 · 双击沉浸阅读"
              @click="handleSelectMail(mail)"
              @dblclick="handleOpenReader(mail)"
            >
              <!-- 发件人头像（真实头像，失败降级首字母） -->
              <SenderAvatar :source="mail.source || '?'" class="mail-avatar" />

              <div class="mail-item-content">
                <!-- Mail Header -->
                <div class="mail-header">
                  <div class="mail-from">
                    <span class="from-text" :title="mail.source">{{ truncateText(mail.source || '未知发件人', 25) }}</span>
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
                    <!-- 验证码一键复制 -->
                    <n-tag
                      v-if="getMailCode(mail)"
                      size="tiny"
                      type="success"
                      class="code-tag"
                      @click.stop="copyCode(mail, getMailCode(mail)!)"
                      :title="`点击复制验证码 ${getMailCode(mail)}`"
                    >
                      <template #icon>
                        <n-icon size="12">
                          <CodeIcon />
                        </n-icon>
                      </template>
                      {{ getMailCode(mail) }}
                    </n-tag>
                  </div>
                </div>
              </div>

              <!-- Mail Actions -->
              <div class="mail-item-actions">
                <n-popconfirm
                  @positive-click="handleDeleteMail(mail.id)"
                  negative-text="取消"
                  positive-text="删除"
                >
                  <template #trigger>
                    <n-button
                      size="tiny"
                      quaternary
                      circle
                      type="error"
                      @click.stop
                      title="删除邮件"
                    >
                      <template #icon>
                        <n-icon size="14">
                          <DeleteIcon />
                        </n-icon>
                      </template>
                    </n-button>
                  </template>
                  确定要删除这封邮件吗？
                </n-popconfirm>
              </div>
            </div>
          </transition-group>
        </n-scrollbar>
      </div>

      <!-- 分页与统计 -->
      <div class="mail-footer">
        <div class="mail-count-info">
          <n-text depth="3">
            共 {{ filteredMails.length }} 封{{ searchKeyword ? '（搜索结果）' : '' }}<template v-if="unreadCount > 0"> · {{ unreadCount }} 未读</template>
          </n-text>
        </div>
        <div v-if="filteredMails.length > pageSize || pageSize !== 10" class="mail-pagination">
          <n-select
            :value="pageSize"
            :options="pageSizeOptions"
            size="tiny"
            style="width: 96px"
            @update:value="handlePageSizeChange"
          />
          <n-pagination
            v-model:page="currentPage"
            :page-count="Math.max(1, Math.ceil(filteredMails.length / pageSize))"
            size="small"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
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
  NPagination,
  NSelect,
  useMessage
} from 'naive-ui'
import {
  Mail as MailIcon,
  Copy as CopyIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Archive as InboxIcon,
  Attach as AttachIcon,
  Trash as DeleteIcon,
  KeypadOutline as CodeIcon,
  Checkmark as CheckmarkIcon
} from '@vicons/ionicons5'
import { useEmailStore, useUiStore } from '@/stores'
import {
  formatRelativeTime,
  truncateText,
  extractTextFromHtml,
  copyToClipboard,
  debounce,
  extractMailVerificationCode,
  decodeMailSubject
} from '@/utils/helpers'
import SenderAvatar from './SenderAvatar.vue'
import type { EmailMessage } from '@/types'

const emailStore = useEmailStore()
const uiStore = useUiStore()
const message = useMessage()

// Local state
const searchKeyword = ref('')

// 分页状态
const PAGE_SIZE_KEY = 'linshiyx_mail_page_size'
const currentPage = ref(1)
const pageSize = ref<number>(Number(localStorage.getItem(PAGE_SIZE_KEY)) || 10)
const pageSizeOptions = [5, 10, 15, 20, 25].map(n => ({ label: `${n} 封/页`, value: n }))

// Computed
const loading = computed(() => emailStore.loading)

const filteredMails = computed(() => {
  let mails = emailStore.selectedAddressMails

  // Apply search filter
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    mails = mails.filter(mail =>
      (mail.subject || '').toLowerCase().includes(keyword) ||
      (mail.source || '').toLowerCase().includes(keyword) ||
      extractTextFromHtml(mail.message || '').toLowerCase().includes(keyword)
    )
  }

  // Sort by date (newest first)
  return [...mails].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
})

// 当前页展示的邮件
const pagedMails = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredMails.value.slice(start, start + pageSize.value)
})

// 未读数量（基于持久化已读状态）
const unreadCount = computed(() =>
  filteredMails.value.reduce((sum, mail) => sum + (emailStore.isMailRead(mail.id) ? 0 : 1), 0)
)

// 翻页 / 每页数量变化时保持在合法范围
watch([filteredMails, pageSize], () => {
  const maxPage = Math.max(1, Math.ceil(filteredMails.value.length / pageSize.value))
  if (currentPage.value > maxPage) currentPage.value = maxPage
})

function handlePageSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  localStorage.setItem(PAGE_SIZE_KEY, String(size))
}

// Methods
// 单击：仅选中，在右侧第三栏显示（保留三泳道默认体验）
function handleSelectMail(mail: EmailMessage) {
  emailStore.selectMail(mail, false)
}

// 双击：快捷进入沉浸式阅读
function handleOpenReader(mail: EmailMessage) {
  emailStore.selectMail(mail)
  uiStore.openReaderModal()
}

function handleDeleteMail(id: string) {
  emailStore.deleteMail(id)
}

async function refreshMails() {
  if (emailStore.selectedAddress) {
    await emailStore.loadMails(emailStore.selectedAddress.address)
    message.success('邮件已刷新')
  }
}

async function copyAddress() {
  if (emailStore.selectedAddress) {
    const success = await copyToClipboard(emailStore.selectedAddress.address)
    if (success) {
      message.success('邮箱地址已复制')
    } else {
      message.error('复制邮箱地址失败')
    }
  }
}

// 一键复制验证码
async function copyCode(mail: EmailMessage, code: string) {
  const success = await copyToClipboard(code)
  if (success) {
    message.success(`验证码 ${code} 已复制`)
    emailStore.markMailRead(mail.id)
  } else {
    message.error('复制验证码失败')
  }
}

// 提取某封邮件的验证码（覆盖解析器可能写入的全部正文字段）
function getMailCode(mail: EmailMessage): string | null {
  return extractMailVerificationCode(mail)
}

// 最新一封带验证码的邮件（用于顶部高亮卡片，仅在最近范围内查找避免展示过期验证码）
const latestCode = computed<{ mail: EmailMessage; code: string } | null>(() => {
  // filteredMails 已按时间倒序，取前若干封中第一封带验证码的
  const recent = filteredMails.value.slice(0, 12)
  for (const mail of recent) {
    const code = getMailCode(mail)
    if (code) return { mail, code }
  }
  return null
})

// 顶部验证码卡片复制反馈状态
const codeCopied = ref(false)
let codeCopiedTimer: ReturnType<typeof setTimeout> | null = null

function clearCodeCopiedTimer() {
  if (codeCopiedTimer) {
    clearTimeout(codeCopiedTimer)
    codeCopiedTimer = null
  }
}

function resetCodeCopiedFeedback() {
  clearCodeCopiedTimer()
  codeCopied.value = false
}

async function copyLatestCode() {
  if (!latestCode.value) return
  const { mail, code } = latestCode.value
  const success = await copyToClipboard(code)
  if (success) {
    codeCopied.value = true
    emailStore.markMailRead(mail.id)
    message.success(`验证码 ${code} 已复制`)
    clearCodeCopiedTimer()
    codeCopiedTimer = setTimeout(() => {
      codeCopied.value = false
      codeCopiedTimer = null
    }, 1600)
  } else {
    message.error('复制验证码失败')
  }
}

watch(() => latestCode.value?.code, () => {
  resetCodeCopiedFeedback()
})

const debouncedSearch = debounce(() => {
  currentPage.value = 1
}, 300)

function handleSearch() {
  debouncedSearch()
}

function clearSearch() {
  searchKeyword.value = ''
  currentPage.value = 1
}

function formatDate(dateString: string) {
  return formatRelativeTime(dateString, uiStore.useUTCDate)
}

function getMailPreview(mail: EmailMessage): string {
  const text = extractTextFromHtml(mail.message || '')
  return truncateText(text, 80)
}

function isUnread(mail: EmailMessage): boolean {
  return !emailStore.isMailRead(mail.id)
}

function hasAttachments(mail: EmailMessage): boolean {
  return Boolean(mail.attachments && mail.attachments.length > 0)
}

function getAttachmentCount(mail: EmailMessage): string {
  if (!mail.attachments) return '0'
  return mail.attachments.length.toString()
}

// 全部标为已读
function markAllRead() {
  emailStore.markAllRead(filteredMails.value.map(mail => mail.id))
  message.success('已全部标为已读')
}

// 解码邮件主题（复用统一的 RFC 2047 解码工具）
function getDecodedSubject(mail: EmailMessage): string {
  return decodeMailSubject(mail.subject || '', mail.raw || mail.message || '')
}

// 切换邮箱时重置搜索与分页
watch(() => emailStore.selectedAddress, () => {
  searchKeyword.value = ''
  currentPage.value = 1
})

onUnmounted(() => {
  resetCodeCopiedFeedback()
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

/* 最新验证码高亮卡片 */
.latest-code-card {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(56, 168, 157, 0.42);
  border-radius: var(--radius-card);
  font: inherit;
  text-align: left;
  color: inherit;
  background:
    linear-gradient(120deg, rgba(56, 194, 177, 0.2), rgba(255, 255, 255, 0.72) 62%, rgba(235, 248, 246, 0.7));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.66) inset,
    0 3px 8px rgba(33, 55, 76, 0.1),
    0 12px 28px rgba(56, 168, 157, 0.16);
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease,
    background 0.24s ease;
}

.latest-code-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.5) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.6s ease;
  pointer-events: none;
}

.latest-code-card:hover {
  border-color: var(--success-color);
  transform: translateY(-2px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.72) inset,
    0 5px 12px rgba(33, 55, 76, 0.14),
    0 20px 44px rgba(56, 168, 157, 0.24);
}

.latest-code-card:focus-visible {
  outline: 2px solid var(--success-color);
  outline-offset: 2px;
}

.latest-code-card:hover::before {
  transform: translateX(120%);
}

.latest-code-card--copied {
  border-color: var(--success-color);
  background:
    linear-gradient(120deg, rgba(56, 194, 177, 0.34), rgba(56, 194, 177, 0.16));
}

.code-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.code-card-icon {
  color: var(--success-color-pressed);
  flex-shrink: 0;
}

.code-card-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.code-card-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--success-color-pressed);
  letter-spacing: 0.4px;
}

.code-card-source {
  font-size: 11px;
  color: var(--n-text-color-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-card-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.code-card-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--n-text-color);
  font-variant-numeric: tabular-nums;
}

.code-card-action {
  color: var(--success-color-pressed);
  transition: transform 0.18s ease;
}

.latest-code-card--copied .code-card-action {
  transform: scale(1.2);
}

[data-theme="dark"] .latest-code-card {
  border-color: rgba(158, 220, 255, 0.32);
  background:
    linear-gradient(120deg, rgba(143, 216, 255, 0.2), rgba(18, 34, 55, 0.9) 60%, rgba(12, 22, 40, 0.86));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 3px 8px rgba(0, 0, 0, 0.34),
    0 14px 30px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .latest-code-card--copied {
  background:
    linear-gradient(120deg, rgba(143, 216, 255, 0.3), rgba(18, 34, 55, 0.92));
}

[data-theme="dark"] .code-card-icon,
[data-theme="dark"] .code-card-label,
[data-theme="dark"] .code-card-action {
  color: var(--success-color);
}

/* 卡片进出场动画 */
.code-card-enter-active,
.code-card-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease, margin 0.3s ease;
  overflow: hidden;
}

.code-card-enter-from,
.code-card-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}

.code-card-enter-to,
.code-card-leave-from {
  max-height: 80px;
}

@media (prefers-reduced-motion: reduce) {
  .latest-code-card,
  .latest-code-card::before,
  .code-card-action {
    transition: none;
  }
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

.empty-extra {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 260px;
}

.empty-copy {
  font-size: 12px;
  line-height: 1.6;
}

.mail-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.mail-skeleton-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 114px;
  padding: 12px 10px 12px 14px;
  border: 1px solid var(--mail-border);
  border-radius: var(--radius-card);
  background: var(--mail-item);
  box-shadow: var(--mail-shadow);
  overflow: hidden;
}

.skeleton-avatar,
.skeleton-line {
  display: block;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0)),
    rgba(88, 112, 130, 0.16);
  background-size: 180% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

.skeleton-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 2px;
}

.skeleton-line {
  height: 12px;
  border-radius: 999px;
}

.skeleton-line--title {
  width: 68%;
}

.skeleton-line--body {
  width: 92%;
}

.skeleton-line--meta {
  width: 42%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 140% 0;
  }
  100% {
    background-position: -140% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-avatar,
  .skeleton-line {
    animation: none;
  }
}

.mail-items {
  display: flex;
  flex-direction: column;
  gap: 7px;
  position: relative;
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

/* 已读邮件降低视觉权重，突出未读 */
.mail-item--read:not(.mail-item--selected) {
  opacity: 0.82;
}

.mail-item--read:not(.mail-item--selected) .mail-subject {
  font-weight: 500;
  color: var(--n-text-color-2);
}

.mail-item--read:not(.mail-item--selected):hover {
  opacity: 1;
}

/* 列表项进出场与移动动画：删除淡出收拢、新邮件渐入 */
.mail-item-enter-active {
  transition: opacity 0.32s ease, transform 0.32s ease;
}

.mail-item-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
  position: absolute;
  width: 100%;
}

.mail-item-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.mail-item-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.96);
}

.mail-item-move {
  transition: transform 0.32s ease;
}

@media (prefers-reduced-motion: reduce) {
  .mail-item-enter-active,
  .mail-item-leave-active,
  .mail-item-move {
    transition: none;
  }
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

/* 发件人头像：尺寸与外观由 SenderAvatar 组件自带，这里不再重复定义 */

/* 验证码标签（可点击复制） */
.code-tag {
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}

.code-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(56, 168, 157, 0.4);
}

/* 底部分页与统计 */
.mail-footer {
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid var(--mail-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mail-count-info {
  text-align: center;
}

.mail-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
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

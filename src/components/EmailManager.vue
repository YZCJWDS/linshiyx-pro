<template>
  <div class="email-manager">
    <!-- Header with Create Button -->
    <div class="manager-header">
      <div class="header-title">
        <n-icon size="20">
          <MailIcon />
        </n-icon>
        我的邮箱
        <n-badge
          v-if="emailStore.addresses.length > 0"
          :value="emailStore.addresses.length"
          :max="99"
          type="info"
          style="margin-left: 8px;"
        />
      </div>

      <div class="header-actions">
        <n-button
          type="primary"
          size="small"
          @click="handleShowCreateModal"
          :loading="loading.creating"
        >
          <template #icon>
            <n-icon>
              <AddIcon />
            </n-icon>
          </template>
          生成新邮箱
        </n-button>

        <n-button
          size="small"
          quaternary
          circle
          @click="handleRefreshMails"
          :loading="loading.mails"
          title="刷新当前邮箱的邮件"
        >
          <template #icon>
            <n-icon>
              <RefreshIcon />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- Email List Section -->
    <div class="email-list-section">
      <div class="email-list">
        <n-scrollbar style="max-height: 100%;">
          <n-empty
            v-if="!emailStore.hasAddresses && !loading.addresses"
            description="还没有创建邮箱地址"
            size="small"
          >
            <template #icon>
              <n-icon size="48" color="#ccc">
                <MailIcon />
              </n-icon>
            </template>
            <template #extra>
              <n-text depth="3" style="font-size: 12px;">
                点击上方"生成新邮箱"来创建您的第一个临时邮箱
              </n-text>
            </template>
          </n-empty>

          <n-spin v-else-if="loading.addresses" class="loading-spin" />

          <div v-else class="email-items">
            <div
              v-for="address in emailStore.addresses"
              :key="address.id"
              class="email-item"
              :class="{ 
                'email-item--selected': emailStore.selectedAddress?.id === address.id 
              }"
              @click="handleSelectEmail(address)"
            >
              <div class="email-item-content">
                <div class="email-address">
                  <n-icon size="16" class="email-icon">
                    <MailIcon />
                  </n-icon>
                  <span class="address-text">{{ address.address }}</span>
                  <!-- 新邮件红点提醒 -->
                  <n-badge
                    v-if="getUnreadCount(address) > 0"
                    :value="getUnreadCount(address)"
                    :max="99"
                    type="error"
                    class="unread-badge"
                  />
                </div>
                <div class="email-meta">
                  <span class="email-name">{{ address.name }}</span>
                  <span class="email-date">{{ getLastMailTime(address) }}</span>
                </div>
              </div>
              
              <div class="email-actions">
                <n-button
                  size="tiny"
                  quaternary
                  circle
                  @click.stop="copyEmailAddress(address.address)"
                  title="Copy Address"
                >
                  <template #icon>
                    <n-icon size="14">
                      <CopyIcon />
                    </n-icon>
                  </template>
                </n-button>
                
                <n-popconfirm
                  @positive-click="handleDeleteEmail(address.id)"
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
                      title="Delete Address"
                    >
                      <template #icon>
                        <n-icon size="14">
                          <DeleteIcon />
                        </n-icon>
                      </template>
                    </n-button>
                  </template>
                  Are you sure you want to delete this email address?
                </n-popconfirm>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </div>

    <!-- Create Email Modal -->
    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="✨ 创建临时邮箱"
      :style="modalStyle"
      :bordered="false"
      :segmented="true"
      class="create-email-modal"
      :mask-closable="true"
      transform-origin="center"
    >
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title-section">
            <n-icon size="24" class="modal-icon">
              <MailIcon />
            </n-icon>
            <div class="modal-title-text">
              <h3>创建临时邮箱</h3>
              <p>快速生成一个新的临时邮箱地址</p>
            </div>
          </div>
        </div>

        <n-form ref="formRef" :model="form" :rules="rules" size="large" class="modal-form">
          <n-form-item path="name" label="邮箱前缀" class="form-item">
            <n-input
              v-model:value="form.name"
              placeholder="输入前缀或留空随机生成"
              :disabled="loading.creating"
              size="large"
              class="form-input"
            >
              <template #suffix>
                <n-button
                  text
                  size="medium"
                  @click="generateRandomPrefix"
                  :disabled="loading.creating"
                  title="随机生成前缀"
                  class="dice-button"
                >
                  <n-icon size="18">
                    <DiceIcon />
                  </n-icon>
                </n-button>
              </template>
            </n-input>
          </n-form-item>

          <n-form-item path="domain" label="邮箱域名" class="form-item">
            <n-select
              v-model:value="form.domain"
              :options="domainOptions"
              placeholder="选择域名"
              :disabled="loading.creating"
              size="large"
              class="form-select"
            />
          </n-form-item>

          <div class="modal-actions">
            <n-button
              @click="showCreateModal = false"
              :disabled="loading.creating"
              size="large"
              class="cancel-button"
            >
              取消
            </n-button>
            <n-button
              type="primary"
              :loading="loading.creating"
              @click="handleCreateEmailAndClose"
              size="large"
              class="create-button"
            >
              <template #icon>
                <n-icon>
                  <AddIcon />
                </n-icon>
              </template>
              生成邮箱
            </n-button>
          </div>
        </n-form>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NIcon,
  NScrollbar,
  NEmpty,
  NSpin,
  NPopconfirm,
  NBadge,
  NText,
  NModal,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'
import {
  Add as AddIcon,
  Mail as MailIcon,
  Refresh as RefreshIcon,
  Copy as CopyIcon,
  Trash as DeleteIcon,
  Dice as DiceIcon
} from '@vicons/ionicons5'
import { useEmailStore, useUiStore } from '@/stores'
import { generateRandomString, formatRelativeTime, copyToClipboard, COMMON_DOMAINS } from '@/utils/helpers'
import type { EmailAddress } from '@/types'

const emailStore = useEmailStore()
const uiStore = useUiStore()
const message = useMessage()

// Modal state
const showCreateModal = ref(false)

// Form state
const formRef = ref<FormInst | null>(null)
const form = reactive({
  name: '',
  domain: COMMON_DOMAINS[0]
})

// Loading states
const loading = computed(() => emailStore.loading)

// Modal style for better proportions
const modalStyle = computed(() => ({
  width: '480px',
  maxWidth: '90vw',
  minHeight: '420px'
}))

// Domain options for select - 从store获取
const domainOptions = computed(() => {
  const domains = emailStore.userSettings?.domains || COMMON_DOMAINS
  return domains.map(domain => ({
    label: domain,
    value: domain
  }))
})

// Form validation rules
const rules: FormRules = {
  domain: [
    { required: true, message: 'Please select a domain', trigger: 'change' }
  ]
}

// Generate random prefix
function generateRandomPrefix() {
  form.name = generateRandomString(8)
}

// Handle show create modal with debug
function handleShowCreateModal() {
  console.log('🔘 Create modal button clicked')
  showCreateModal.value = true
  console.log('🔘 showCreateModal set to:', showCreateModal.value)
}

// Handle create email and close modal
async function handleCreateEmailAndClose() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const prefix = form.name.trim() || generateRandomString(8)
    await emailStore.createAddress(prefix, form.domain)

    // Reset form and close modal
    form.name = ''
    form.domain = COMMON_DOMAINS[0]
    showCreateModal.value = false

    message.success('邮箱创建成功！')
  } catch (error) {
    console.error('Create email error:', error)
  }
}

// Handle select email
function handleSelectEmail(address: EmailAddress) {
  emailStore.selectAddress(address)
}

// Handle delete email
async function handleDeleteEmail(id: string) {
  await emailStore.deleteAddress(id)
}

// Copy email address to clipboard
async function copyEmailAddress(address: string) {
  const success = await copyToClipboard(address)
  if (success) {
    message.success('邮箱地址已复制到剪贴板')
  } else {
    message.error('复制邮箱地址失败')
  }
}

// Refresh mails for selected address
async function handleRefreshMails() {
  if (emailStore.selectedAddress) {
    await emailStore.loadMails(emailStore.selectedAddress.address)
    message.success('邮件列表已刷新')
  } else {
    message.warning('请先选择一个邮箱地址')
  }
}



// Get unread mail count for an address
function getUnreadCount(address: EmailAddress): number {
  // 使用新的新邮件计数系统
  return emailStore.getNewMailCount(address.address)
}

// Format date for display
function formatDate(dateString: string) {
  return formatRelativeTime(dateString, uiStore.useUTCDate)
}

// 获取邮箱的显示时间（优先显示最近邮件时间，否则显示创建时间）
function getLastMailTime(address: EmailAddress): string {
  // 如果是当前选中的邮箱，尝试显示最近邮件时间
  if (emailStore.selectedAddress?.address === address.address) {
    const addressMails = emailStore.mails.filter(mail =>
      mail.address === address.address
    )

    console.log(`📧 Found ${addressMails.length} mails for selected address: ${address.address}`)

    if (addressMails.length > 0) {
      // 找到最新的邮件
      const latestMail = addressMails.reduce((latest, current) => {
        const latestTime = new Date(latest.created_at + ' UTC').getTime()
        const currentTime = new Date(current.created_at + ' UTC').getTime()
        return currentTime > latestTime ? current : latest
      })

      console.log(`📅 Latest mail for ${address.address}: ${latestMail.created_at}`)
      return formatDate(latestMail.created_at)
    }
  }

  // 对于非选中邮箱或没有邮件的邮箱，显示创建时间
  return formatDate(address.created_at)
}
</script>

<style scoped>
.email-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  --manager-panel: rgba(255, 255, 255, 0.32);
  --manager-panel-strong: rgba(255, 255, 255, 0.56);
  --manager-item: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(246, 251, 250, 0.72));
  --manager-item-hover: rgba(56, 194, 177, 0.13);
  --manager-item-selected: linear-gradient(100deg, rgba(56, 194, 177, 0.22), rgba(255, 255, 255, 0.9) 58%, rgba(235, 248, 246, 0.82));
  --manager-border: rgba(88, 112, 130, 0.2);
  --manager-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 1px 2px rgba(33, 55, 76, 0.08), 0 10px 24px rgba(33, 55, 76, 0.1);
  --manager-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.78) inset, 0 3px 7px rgba(33, 55, 76, 0.12), 0 20px 46px rgba(33, 55, 76, 0.16);
}

[data-theme="dark"] .email-manager {
  --manager-panel: rgba(5, 10, 20, 0.24);
  --manager-panel-strong: rgba(9, 18, 32, 0.5);
  --manager-item: linear-gradient(180deg, rgba(20, 36, 58, 0.88), rgba(10, 20, 36, 0.84));
  --manager-item-hover: rgba(143, 216, 255, 0.13);
  --manager-item-selected: linear-gradient(100deg, rgba(143, 216, 255, 0.24), rgba(18, 34, 55, 0.92) 58%, rgba(12, 22, 40, 0.88));
  --manager-border: rgba(196, 226, 248, 0.17);
  --manager-shadow: 0 1px 0 rgba(255, 255, 255, 0.055) inset, 0 1px 2px rgba(0, 0, 0, 0.34), 0 12px 28px rgba(0, 0, 0, 0.26);
  --manager-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.075) inset, 0 3px 8px rgba(0, 0, 0, 0.42), 0 22px 52px rgba(0, 0, 0, 0.36);
}

.manager-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 2px 6px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--manager-border);
  border-radius: 0;
  box-shadow: none;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--n-text-color);
  min-width: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.email-list-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  border: 0;
  border-radius: 0;
  overflow: hidden;
}

.email-list {
  flex: 1;
  min-height: 0;
  padding: 2px 0 0;
}

.loading-spin {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.email-items {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.email-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 74px;
  padding: 11px 10px 11px 13px;
  border-radius: var(--radius-card);
  border: 1px solid var(--manager-border);
  background: var(--manager-item);
  box-shadow: var(--manager-shadow);
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
  position: relative;
  will-change: transform;
}

.email-item:hover {
  border-color: rgba(56, 194, 177, 0.42);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(247, 252, 251, 0.58)),
    var(--manager-item-hover);
  box-shadow: var(--manager-shadow-hover);
  transform: translateY(-2px);
}

.email-item--selected {
  border-color: var(--n-primary-color) !important;
  background: var(--manager-item-selected) !important;
  box-shadow:
    inset 3px 0 0 var(--n-primary-color),
    0 0 0 1px rgba(63, 159, 211, 0.12),
    var(--manager-shadow-hover);
  transform: translateY(-2px);
}

.email-item--selected::before {
  content: none;
}

/* 深色模式下的选中效果 */
[data-theme="dark"] .email-item--selected {
  background: var(--manager-item-selected) !important;
  box-shadow:
    inset 3px 0 0 var(--n-primary-color),
    0 0 0 1px rgba(123, 210, 246, 0.12),
    var(--manager-shadow-hover);
}

.email-item-content {
  flex: 1;
  min-width: 0;
}

.email-address {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  position: relative;
}

.unread-badge {
  margin-left: auto;
  flex-shrink: 0;
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.email-icon {
  color: var(--n-primary-color);
  flex-shrink: 0;
}

.address-text {
  font-weight: 600;
  color: var(--n-text-color);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.email-name {
  font-size: 12px;
  color: var(--n-text-color-2);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email-date {
  font-size: 11px;
  color: var(--n-text-color-3);
  flex-shrink: 0;
}

.email-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 56px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.email-item:hover .email-actions,
.email-item--selected .email-actions,
.email-actions:focus-within {
  opacity: 1;
}

[data-theme="dark"] .manager-header {
  background: transparent;
}

[data-theme="dark"] .email-list-section {
  background: transparent;
}

[data-theme="dark"] .email-item {
  border-color: var(--manager-border);
  background: var(--manager-item);
}

[data-theme="dark"] .email-item:hover {
  background:
    linear-gradient(180deg, rgba(28, 48, 74, 0.92), rgba(12, 24, 42, 0.88)),
    var(--manager-item-hover);
  box-shadow: var(--manager-shadow-hover);
}

.quick-actions {
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid var(--n-border-color);
}

/* Create Email Modal Styles */
.create-email-modal {
  position: relative;
}

/* 弹窗内容 */
.modal-content {
  background: var(--n-card-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid var(--n-border-color);
}

.modal-header {
  padding: 24px 24px 20px;
  border-bottom: 1px solid var(--n-border-color);
  background: linear-gradient(135deg,
    var(--n-primary-color-suppl) 0%,
    rgba(79, 143, 199, 0.08) 100%);
  position: relative;
}

.modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--n-primary-color) 50%,
    transparent 100%);
  opacity: 0.3;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-icon {
  color: var(--n-primary-color);
  background: rgba(79, 143, 199, 0.12);
  padding: 8px;
  border-radius: 8px;
}

.modal-title-text h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--n-text-color);
}

.modal-title-text p {
  margin: 0;
  font-size: 14px;
  color: var(--n-text-color-2);
  opacity: 0.8;
}

.modal-form {
  padding: 24px;
}

.form-item {
  margin-bottom: 20px;
}

.form-input,
.form-select {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  box-shadow: 0 0 0 2px var(--n-primary-color-suppl);
}

.dice-button {
  color: var(--n-primary-color);
  transition: all 0.2s ease;
}

.dice-button:hover {
  color: var(--n-primary-color-hover);
  transform: rotate(180deg);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--n-border-color);
}

.cancel-button {
  min-width: 80px;
  border-radius: 8px;
}

.create-button {
  min-width: 120px;
  border-radius: 8px;
  box-shadow: 0 2px 8px var(--n-primary-color-suppl);
  transition: all 0.2s ease;
}

.create-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--n-primary-color-suppl);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .email-manager {
    padding: 12px;
    gap: 12px;
  }

  .email-item {
    padding: 10px;
  }
  
  .email-actions {
    opacity: 1; /* Always show on mobile */
  }

  .manager-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    justify-content: space-between;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
</style>

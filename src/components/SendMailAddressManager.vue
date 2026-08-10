<template>
  <div class="send-mail-address-manager">
    <!-- 域名过滤栏 -->
    <div v-if="domainTabList.length > 1" class="send-domain-filter-bar">
      <div class="send-domain-tabs-scroll">
        <button
          type="button"
          class="send-domain-tab-pill"
          :class="{ 'send-domain-tab-pill--active': selectedDomain === 'all' }"
          @click="selectedDomain = 'all'"
        >
          <span>全部</span>
          <span class="tab-count">{{ emailStore.addresses.length }}</span>
        </button>

        <button
          v-for="item in domainTabList"
          :key="item.domain"
          type="button"
          class="send-domain-tab-pill"
          :class="{ 'send-domain-tab-pill--active': selectedDomain === item.domain }"
          :style="getDomainTabStyle(item.domain, selectedDomain === item.domain)"
          @click="selectedDomain = item.domain"
        >
          <span
            class="tab-dot"
            :style="{ background: getDomainTheme(item.domain, isDark).primary }"
          ></span>
          <span>@{{ item.domain }}</span>
          <span class="tab-count">{{ item.count }}</span>
        </button>
      </div>
    </div>

    <!-- Address List -->
    <n-scrollbar class="address-list">
      <div v-if="!emailStore.hasAddresses" class="empty-state">
        <n-empty description="暂无邮箱地址">
          <template #extra>
            <n-button type="primary" @click="handleShowCreateModal">
              创建邮箱地址
            </n-button>
          </template>
        </n-empty>
      </div>

      <div v-else-if="filteredAddresses.length === 0" class="empty-state">
        <n-empty :description="`@${selectedDomain} 下暂无发件邮箱`">
          <template #extra>
            <n-button type="primary" size="small" @click="handleShowCreateModal">
              为此域名创建邮箱
            </n-button>
          </template>
        </n-empty>
      </div>

      <div v-else class="address-items">
        <div
          v-for="address in filteredAddresses"
          :key="address.id"
          class="address-item"
          :class="{ 
            'selected': selectedFromAddress?.id === address.id,
            'has-new-mails': getUnreadCount(address) > 0 
          }"
          :style="getItemAccentStyle(address)"
          @click="handleSelectFromAddress(address)"
        >
          <div class="address-info">
            <div class="address-main">
              <span class="address-text">{{ getAddressPrefix(address.address) }}</span>
              <span
                class="domain-badge"
                :style="getDomainBadgeStyle(getDomainFromAddress(address))"
              >
                @{{ getDomainFromAddress(address) }}
              </span>
              <n-badge
                v-if="getUnreadCount(address) > 0"
                :value="getUnreadCount(address)"
                :max="99"
                type="error"
                class="new-mail-badge"
              />
            </div>
            <div class="address-meta">
              <span class="address-name">{{ address.name || '默认' }}</span>
              <span class="address-date">{{ formatDate(address.created_at) }}</span>
            </div>
          </div>

          <div class="address-actions">
            <n-button
              size="tiny"
              quaternary
              circle
              @click.stop="copyEmailAddress(address.address)"
              title="复制邮箱地址"
            >
              <template #icon>
                <n-icon size="14">
                  <CopyIcon />
                </n-icon>
              </template>
            </n-button>

            <n-popconfirm
              @positive-click="handleDeleteEmail(address.id)"
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
                  title="删除邮箱地址"
                >
                  <template #icon>
                    <n-icon size="14">
                      <DeleteIcon />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              确定要删除这个邮箱地址吗？
            </n-popconfirm>
          </div>
        </div>
      </div>
    </n-scrollbar>

    <!-- Create Address Modal -->
    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="创建新邮箱地址"
      class="create-modal"
      :mask-closable="false"
    >
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
      </n-form>

      <template #footer>
        <div class="modal-footer">
          <n-button @click="showCreateModal = false" :disabled="loading.creating">
            取消
          </n-button>
          <n-button
            type="primary"
            @click="handleCreateEmailAndClose"
            :loading="loading.creating"
          >
            创建邮箱
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  NScrollbar,
  NEmpty,
  NButton,
  NBadge,
  NIcon,
  NPopconfirm,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'
import {
  Copy as CopyIcon,
  Trash as DeleteIcon,
  Dice as DiceIcon
} from '@vicons/ionicons5'
import { useEmailStore, useUiStore } from '@/stores'
import {
  generateRandomString,
  formatRelativeTime,
  copyToClipboard,
  COMMON_DOMAINS,
  getDomainFromAddress,
  getDomainTheme
} from '@/utils/helpers'
import type { EmailAddress } from '@/types'

const emailStore = useEmailStore()
const uiStore = useUiStore()
const message = useMessage()
const isDark = computed(() => uiStore.theme === 'dark')

const emit = defineEmits<{
  select: [address: EmailAddress | null]
}>()

// 选中的域名过滤 Tab
const selectedDomain = ref<string>('all')

// State
const selectedFromAddress = ref<EmailAddress | null>(null)
const showCreateModal = ref(false)
const formRef = ref<FormInst | null>(null)

// Form state
const form = reactive({
  name: '',
  domain: COMMON_DOMAINS[0]
})

const loading = reactive({
  creating: false
})

// 域名列表
const domainTabList = computed(() => emailStore.domainStats)

// 过滤后的地址
const filteredAddresses = computed(() => {
  if (selectedDomain.value === 'all') {
    return emailStore.addresses
  }
  return emailStore.addresses.filter(addr => getDomainFromAddress(addr) === selectedDomain.value)
})

// Domain options for select
const domainOptions = computed(() => {
  const domains = emailStore.allAvailableDomains || COMMON_DOMAINS
  return domains.map(domain => ({
    label: `@${domain}`,
    value: domain
  }))
})

// Form validation rules
const rules: FormRules = {
  domain: [
    { required: true, message: '请选择邮箱域名', trigger: 'change' }
  ]
}

function getAddressPrefix(fullAddress: string): string {
  if (!fullAddress) return ''
  const parts = fullAddress.split('@')
  return parts[0] || fullAddress
}

function getDomainTabStyle(domain: string, isActive: boolean) {
  const theme = getDomainTheme(domain, isDark.value)
  if (isActive) {
    return {
      borderColor: theme.primary,
      backgroundColor: theme.bg,
      color: theme.text
    }
  }
  return {}
}

function getDomainBadgeStyle(domain: string) {
  const theme = getDomainTheme(domain, isDark.value)
  return {
    borderColor: theme.border,
    backgroundColor: theme.bg,
    color: theme.text
  }
}

function getItemAccentStyle(address: EmailAddress) {
  if (selectedFromAddress.value?.id !== address.id) return {}
  const domain = getDomainFromAddress(address)
  const theme = getDomainTheme(domain, isDark.value)
  return {
    borderColor: theme.primary,
    boxShadow: `inset 3px 0 0 ${theme.primary}, 0 4px 14px ${theme.glow}`
  }
}

// Methods
function handleSelectFromAddress(address: EmailAddress) {
  selectedFromAddress.value = address
  emit('select', address)
  console.log('📧 Selected from address:', address.address)
}

function handleShowCreateModal() {
  if (selectedDomain.value !== 'all') {
    form.domain = selectedDomain.value
  } else {
    const available = emailStore.allAvailableDomains || COMMON_DOMAINS
    form.domain = available[0] || COMMON_DOMAINS[0]
  }
  form.name = ''
  showCreateModal.value = true
}

function generateRandomPrefix() {
  form.name = generateRandomString(8)
}

async function handleCreateEmailAndClose() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.creating = true

    const prefix = form.name.trim() || generateRandomString(8)
    const targetDomain = form.domain
    const newAddress = await emailStore.createAddress(prefix, targetDomain)
    selectedFromAddress.value = newAddress
    emit('select', newAddress)

    // Reset form and close modal
    form.name = ''
    showCreateModal.value = false

    if (selectedDomain.value !== 'all' && selectedDomain.value !== targetDomain) {
      selectedDomain.value = targetDomain
    }

    message.success('邮箱创建成功！')
  } catch (error) {
    console.error('Create email error:', error)
  } finally {
    loading.creating = false
  }
}

async function handleDeleteEmail(id: string) {
  await emailStore.deleteAddress(id)
  if (selectedFromAddress.value?.id === id) {
    selectedFromAddress.value = null
    emit('select', null)
  }
}

async function copyEmailAddress(address: string) {
  const success = await copyToClipboard(address)
  if (success) {
    message.success('邮箱地址已复制到剪贴板')
  } else {
    message.error('复制邮箱地址失败')
  }
}

function getUnreadCount(address: EmailAddress): number {
  return emailStore.getNewMailCount(address.address)
}

function formatDate(dateString: string) {
  return formatRelativeTime(dateString, uiStore.useUTCDate)
}

defineExpose({
  selectedFromAddress
})
</script>

<style scoped>
.send-mail-address-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  --address-item: rgba(255, 255, 255, 0.74);
  --address-hover: rgba(79, 143, 199, 0.1);
  --address-border: rgba(116, 146, 174, 0.22);
  --address-shadow: 0 4px 16px rgba(48, 77, 108, 0.08);
}

[data-theme="dark"] .send-mail-address-manager {
  --address-item: rgba(12, 26, 45, 0.74);
  --address-hover: rgba(114, 184, 232, 0.13);
  --address-border: rgba(148, 190, 225, 0.16);
  --address-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
}

.send-domain-filter-bar {
  flex-shrink: 0;
  padding: 8px 10px 4px;
  border-bottom: 1px solid var(--address-border);
}

.send-domain-tabs-scroll {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.send-domain-tabs-scroll::-webkit-scrollbar {
  display: none;
}

.send-domain-tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 16px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid var(--address-border);
  background: rgba(120, 140, 160, 0.08);
  color: var(--n-text-color-2);
  transition: all 0.16s ease;
}

.send-domain-tab-pill--active {
  background: rgba(120, 140, 160, 0.18);
  font-weight: 600;
  color: var(--n-text-color);
}

.tab-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tab-count {
  font-size: 10px;
  padding: 0 4px;
  border-radius: 8px;
  background: rgba(120, 140, 160, 0.16);
  line-height: 1.3;
}

.address-list {
  flex: 1;
  padding: 8px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.address-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
  border: 1px solid var(--address-border);
  background: var(--address-item);
}

.address-item:hover {
  background: var(--address-hover);
  border-color: var(--n-primary-color);
  transform: translateY(-1px);
  box-shadow: var(--address-shadow);
}

.address-item.selected {
  border: 1px solid var(--n-primary-color);
  transform: none;
}

.address-info {
  flex: 1;
  min-width: 0;
}

.address-main {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.address-text {
  font-weight: 600;
  color: var(--n-text-color);
  font-size: 13.5px;
  letter-spacing: -0.2px;
}

.domain-badge {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  font-weight: 600;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  flex-shrink: 0;
}

.new-mail-badge {
  flex-shrink: 0;
}

.address-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.address-name {
  font-size: 11.5px;
  color: var(--n-text-color-2);
}

.address-date {
  font-size: 11px;
  color: var(--n-text-color-disabled);
}

.address-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.address-item:hover .address-actions {
  opacity: 1;
}

.create-modal {
  max-width: 500px;
}

.modal-form {
  margin-top: 16px;
}

.form-item {
  margin-bottom: 20px;
}

.dice-button {
  color: var(--n-text-color-disabled);
  transition: color 0.2s ease;
}

.dice-button:hover {
  color: var(--n-primary-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>

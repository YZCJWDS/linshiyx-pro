<template>
  <div class="email-manager">
    <!-- Header with Create Button and View Switcher -->
    <div class="manager-header">
      <div class="header-title">
        <n-icon size="20" class="header-main-icon">
          <MailIcon />
        </n-icon>
        <span>我的邮箱</span>
        <n-badge
          v-if="emailStore.addresses.length > 0"
          :value="emailStore.addresses.length"
          :max="99"
          type="info"
          class="header-total-badge"
        />
      </div>

      <div class="header-actions">
        <!-- 视图切换模式（标签视图 / 分组树状视图） -->
        <div class="view-mode-toggle" role="radiogroup" aria-label="视图模式切换">
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ 'view-toggle-btn--active': viewMode === 'tabs' }"
            :title="'标签过滤视图'"
            @click="setViewMode('tabs')"
          >
            <n-icon size="14"><TabsIcon /></n-icon>
          </button>
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ 'view-toggle-btn--active': viewMode === 'grouped' }"
            :title="'域名分组折叠视图'"
            @click="setViewMode('grouped')"
          >
            <n-icon size="14"><FolderIcon /></n-icon>
          </button>
        </div>

        <n-button
          type="primary"
          size="small"
          @click="handleShowCreateModal()"
          :loading="loading.creating"
          class="create-btn-glow"
        >
          <template #icon>
            <n-icon>
              <AddIcon />
            </n-icon>
          </template>
          生成邮箱
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

    <!-- 模式 A：域名分段筛选栏 (仅在 Tabs 视图模式显示) -->
    <div
      v-if="viewMode === 'tabs' && (emailStore.hasAddresses || domainTabList.length > 1)"
      class="domain-filter-bar"
    >
      <div class="domain-tabs-scroll" role="tablist" aria-label="按域名后缀筛选">
        <!-- 全部标签 -->
        <button
          type="button"
          class="domain-tab-pill"
          :class="{ 'domain-tab-pill--active': selectedDomain === 'all' }"
          role="tab"
          :aria-selected="selectedDomain === 'all'"
          @click="handleSelectDomainTab('all')"
        >
          <span class="tab-label">全部</span>
          <span class="tab-count">{{ emailStore.addresses.length }}</span>
          <span
            v-if="totalUnreadCount > 0"
            class="tab-unread-dot"
            :title="`共有 ${totalUnreadCount} 封未读邮件`"
          >
            {{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}
          </span>
        </button>

        <!-- 各独立域名标签 -->
        <button
          v-for="item in domainTabList"
          :key="item.domain"
          type="button"
          class="domain-tab-pill"
          :class="{ 'domain-tab-pill--active': selectedDomain === item.domain }"
          :style="getDomainTabStyle(item.domain, selectedDomain === item.domain)"
          role="tab"
          :aria-selected="selectedDomain === item.domain"
          @click="handleSelectDomainTab(item.domain)"
        >
          <span
            class="tab-dot"
            :style="{ background: getDomainTheme(item.domain, isDark).primary }"
          ></span>
          <span class="tab-label">@{{ item.domain }}</span>
          <span class="tab-count">{{ item.count }}</span>
          <span
            v-if="item.unreadCount > 0"
            class="tab-unread-dot"
            :title="`该域名有 ${item.unreadCount} 封未读邮件`"
          >
            {{ item.unreadCount > 99 ? '99+' : item.unreadCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- 模式 B：分组折叠视图的顶部快捷工具栏 -->
    <div v-else-if="viewMode === 'grouped' && emailStore.hasAddresses" class="grouped-toolbar">
      <span class="grouped-meta-text">共 {{ domainTabList.length }} 个后缀分类</span>
      <div class="grouped-quick-actions">
        <button type="button" class="grouped-action-text-btn" @click="expandAllGroups">
          展开全部
        </button>
        <span class="action-divider">|</span>
        <button type="button" class="grouped-action-text-btn" @click="collapseAllGroups">
          折叠全部
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div v-if="emailStore.hasAddresses" class="address-search-section">
      <n-input
        v-model:value="addressSearch"
        :placeholder="searchPlaceholder"
        clearable
        size="small"
        @input="handleAddressSearch"
      >
        <template #prefix>
          <n-icon size="16">
            <SearchIcon />
          </n-icon>
        </template>
      </n-input>
    </div>

    <!-- 列表展示区 -->
    <div class="email-list-section">
      <div class="email-list">
        <n-scrollbar style="max-height: 100%;">
          <!-- 全局无邮箱 -->
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
              <div class="empty-extra">
                <n-text depth="3" class="empty-copy">
                  先创建一个地址，收到验证码时会自动出现在收件箱里。
                </n-text>
                <n-button
                  type="primary"
                  size="small"
                  @click="handleShowCreateModal()"
                  :loading="loading.creating"
                >
                  <template #icon>
                    <n-icon>
                      <AddIcon />
                    </n-icon>
                  </template>
                  生成第一个邮箱
                </n-button>
              </div>
            </template>
          </n-empty>

          <!-- 模式 A：标签过滤模式列表 -->
          <template v-else-if="viewMode === 'tabs'">
            <!-- 筛选/搜索后无匹配邮箱 -->
            <n-empty
              v-if="filteredAddresses.length === 0 && !loading.addresses"
              :description="emptyFilterDescription"
              size="small"
            >
              <template #icon>
                <n-icon size="44" color="#aaa">
                  <SearchIcon />
                </n-icon>
              </template>
              <template #extra>
                <div class="empty-extra">
                  <n-button
                    v-if="addressSearch"
                    size="small"
                    secondary
                    @click="clearSearch"
                  >
                    清空搜索
                  </n-button>
                  <n-button
                    v-else-if="selectedDomain !== 'all'"
                    type="primary"
                    size="small"
                    @click="handleShowCreateModal(selectedDomain)"
                    :loading="loading.creating"
                  >
                    <template #icon>
                      <n-icon>
                        <AddIcon />
                      </n-icon>
                    </template>
                    为此域名生成邮箱
                  </n-button>
                </div>
              </template>
            </n-empty>

            <!-- 邮箱卡片列表 (Tabs Mode) -->
            <div v-else class="email-items">
              <div
                v-for="address in pagedAddresses"
                :key="address.id"
                class="email-item"
                :class="{ 
                  'email-item--selected': emailStore.selectedAddress?.id === address.id 
                }"
                :style="getItemAccentStyle(address)"
                @click="handleSelectEmail(address)"
              >
                <div class="email-item-content">
                  <div class="email-address-row">
                    <span
                      class="email-domain-indicator"
                      :style="{ background: getDomainTheme(getDomainFromAddress(address), isDark).primary }"
                    ></span>
                    
                    <span class="address-prefix" :title="address.address">
                      {{ getAddressPrefix(address.address) }}
                    </span>

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
                      class="unread-badge"
                    />
                  </div>

                  <div class="email-meta">
                    <span class="email-name" :title="address.name || '默认邮箱'">
                      {{ address.name || '默认' }}
                    </span>
                    <span class="email-date">{{ getLastMailTime(address) }}</span>
                  </div>
                </div>
                
                <div class="email-actions">
                  <n-button
                    size="tiny"
                    quaternary
                    circle
                    @click.stop="copyEmailAddress(address.address)"
                    title="复制邮箱地址"
                    class="action-btn-copy"
                  >
                    <template #icon>
                      <n-icon size="14"><CopyIcon /></n-icon>
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
                        title="删除地址"
                        class="action-btn-del"
                      >
                        <template #icon>
                          <n-icon size="14"><DeleteIcon /></n-icon>
                        </template>
                      </n-button>
                    </template>
                    确定要删除这个邮箱地址吗？
                  </n-popconfirm>
                </div>
              </div>
            </div>
          </template>

          <!-- 模式 B：手风琴树状折叠分组列表 (Grouped Folders View) -->
          <template v-else-if="viewMode === 'grouped'">
            <!-- 搜索无结果 -->
            <n-empty
              v-if="groupedDomainList.length === 0 && !loading.addresses"
              description="没有找到匹配的邮箱"
              size="small"
            >
              <template #icon>
                <n-icon size="44" color="#aaa"><SearchIcon /></n-icon>
              </template>
              <template #extra>
                <n-button size="small" secondary @click="clearSearch">清空搜索</n-button>
              </template>
            </n-empty>

            <div v-else class="domain-groups-container">
              <div
                v-for="group in groupedDomainList"
                :key="group.domain"
                class="domain-group-card"
                :style="getGroupCardStyle(group.domain)"
              >
                <!-- 分组标题栏 -->
                <div
                  class="group-header"
                  @click="toggleDomainCollapse(group.domain)"
                >
                  <div class="group-header-left">
                    <n-icon
                      size="14"
                      class="group-collapse-arrow"
                      :class="{ 'group-collapse-arrow--expanded': !isDomainCollapsed(group.domain) }"
                    >
                      <ChevronForwardIcon />
                    </n-icon>
                    <span
                      class="group-theme-dot"
                      :style="{ background: getDomainTheme(group.domain, isDark).primary }"
                    ></span>
                    <span class="group-domain-name">@{{ group.domain }}</span>
                    <span class="group-count-badge">{{ group.addresses.length }}</span>
                    <span
                      v-if="group.unreadCount > 0"
                      class="group-unread-badge"
                      :title="`该后缀有 ${group.unreadCount} 封未读`"
                    >
                      {{ group.unreadCount > 99 ? '99+' : group.unreadCount }}
                    </span>
                  </div>

                  <div class="group-header-right">
                    <!-- 快捷为此域名新建邮箱按钮 -->
                    <button
                      type="button"
                      class="group-quick-create-btn"
                      :title="`在 @${group.domain} 下快速新建邮箱`"
                      @click.stop="handleShowCreateModal(group.domain)"
                    >
                      <n-icon size="13"><AddIcon /></n-icon>
                      <span>新建</span>
                    </button>
                  </div>
                </div>

                <!-- 分组内邮箱列表 -->
                <div
                  v-show="!isDomainCollapsed(group.domain)"
                  class="group-items-wrapper"
                >
                  <div
                    v-for="address in group.addresses"
                    :key="address.id"
                    class="email-item email-item--grouped"
                    :class="{ 
                      'email-item--selected': emailStore.selectedAddress?.id === address.id 
                    }"
                    :style="getItemAccentStyle(address)"
                    @click="handleSelectEmail(address)"
                  >
                    <div class="email-item-content">
                      <div class="email-address-row">
                        <span class="address-prefix" :title="address.address">
                          {{ getAddressPrefix(address.address) }}
                        </span>

                        <n-badge
                          v-if="getUnreadCount(address) > 0"
                          :value="getUnreadCount(address)"
                          :max="99"
                          type="error"
                          class="unread-badge"
                        />
                      </div>

                      <div class="email-meta">
                        <span class="email-name" :title="address.name || '默认邮箱'">
                          {{ address.name || '默认' }}
                        </span>
                        <span class="email-date">{{ getLastMailTime(address) }}</span>
                      </div>
                    </div>

                    <div class="email-actions">
                      <n-button
                        size="tiny"
                        quaternary
                        circle
                        @click.stop="copyEmailAddress(address.address)"
                        title="复制邮箱地址"
                        class="action-btn-copy"
                      >
                        <template #icon>
                          <n-icon size="14"><CopyIcon /></n-icon>
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
                            title="删除地址"
                            class="action-btn-del"
                          >
                            <template #icon>
                              <n-icon size="14"><DeleteIcon /></n-icon>
                            </template>
                          </n-button>
                        </template>
                        确定要删除这个邮箱地址吗？
                      </n-popconfirm>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </n-scrollbar>
      </div>
    </div>

    <!-- 地址分页（仅在标签模式且需要分页时显示） -->
    <div
      v-if="viewMode === 'tabs' && (filteredAddresses.length > addrPageSize || addrPageSize !== 10)"
      class="address-pagination"
    >
      <n-select
        :value="addrPageSize"
        :options="addrPageSizeOptions"
        size="tiny"
        style="width: 92px"
        @update:value="handleAddrPageSizeChange"
      />
      <n-pagination
        v-model:page="addrCurrentPage"
        :page-count="Math.max(1, Math.ceil(filteredAddresses.length / addrPageSize))"
        size="small"
      />
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
              <p>
                {{ form.domain ? `将在 @${form.domain} 下快速生成新邮箱` : '快速生成一个新的临时邮箱地址' }}
              </p>
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
import { ref, computed, reactive, watch } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NIcon,
  NScrollbar,
  NEmpty,
  NPopconfirm,
  NBadge,
  NText,
  NModal,
  NPagination,
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
  Search as SearchIcon,
  Dice as DiceIcon,
  FolderOpenOutline as FolderIcon,
  GridOutline as TabsIcon,
  ChevronForward as ChevronForwardIcon
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

// 视图模式：'tabs' (标签过滤模式) | 'grouped' (树状手风琴分组模式)
const VIEW_MODE_STORAGE_KEY = 'linshiyx_email_view_mode'
const viewMode = ref<'tabs' | 'grouped'>(
  (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as 'tabs' | 'grouped') || 'tabs'
)

function setViewMode(mode: 'tabs' | 'grouped') {
  viewMode.value = mode
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
}

// 当前选中的域名筛选 Tab ('all' 表示全部)
const selectedDomain = ref<string>('all')

// 折叠的分组集合
const collapsedDomains = ref<Set<string>>(new Set())

function isDomainCollapsed(domain: string): boolean {
  return collapsedDomains.value.has(domain)
}

function toggleDomainCollapse(domain: string) {
  if (collapsedDomains.value.has(domain)) {
    collapsedDomains.value.delete(domain)
  } else {
    collapsedDomains.value.add(domain)
  }
  collapsedDomains.value = new Set(collapsedDomains.value)
}

function expandAllGroups() {
  collapsedDomains.value.clear()
  collapsedDomains.value = new Set()
}

function collapseAllGroups() {
  const all = emailStore.allAvailableDomains || []
  collapsedDomains.value = new Set(all)
}

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

// 地址搜索
const addressSearch = ref('')

// 地址分页状态
const ADDR_PAGE_SIZE_KEY = 'linshiyx_address_page_size'
const addrCurrentPage = ref(1)
const addrPageSize = ref<number>(Number(localStorage.getItem(ADDR_PAGE_SIZE_KEY)) || 10)
const addrPageSizeOptions = [5, 10, 15, 20, 25].map(n => ({ label: `${n} 个/页`, value: n }))

// 所有未读邮件总数
const totalUnreadCount = computed(() => {
  return Object.values(emailStore.newMailCounts).reduce((sum, count) => sum + (count || 0), 0)
})

// 域名分段列表
const domainTabList = computed(() => {
  return emailStore.domainStats
})

// 搜索框占位提示文案
const searchPlaceholder = computed(() => {
  if (viewMode.value === 'tabs' && selectedDomain.value !== 'all') {
    return `在 @${selectedDomain.value} 中搜索...`
  }
  return '搜索邮箱前缀、全称或备注...'
})

// 标签模式下过滤后的地址（域名过滤 -> 关键词模糊搜索）
const filteredAddresses = computed(() => {
  let list = emailStore.addresses

  if (selectedDomain.value !== 'all') {
    list = list.filter(addr => getDomainFromAddress(addr) === selectedDomain.value)
  }

  const keyword = addressSearch.value.trim().toLowerCase()
  if (keyword) {
    list = list.filter(addr =>
      (addr.address || '').toLowerCase().includes(keyword) ||
      (addr.name || '').toLowerCase().includes(keyword)
    )
  }

  return list
})

// 当前页展示的地址
const pagedAddresses = computed(() => {
  const start = (addrCurrentPage.value - 1) * addrPageSize.value
  return filteredAddresses.value.slice(start, start + addrPageSize.value)
})

// 分组模式下的数据结构
interface GroupedDomainItem {
  domain: string
  addresses: EmailAddress[]
  unreadCount: number
}

const groupedDomainList = computed<GroupedDomainItem[]>(() => {
  const keyword = addressSearch.value.trim().toLowerCase()
  const domainMap: Record<string, EmailAddress[]> = {}

  // 1. 获取所有可用域名初始化
  const allDomains = emailStore.allAvailableDomains || []
  allDomains.forEach(d => {
    domainMap[d] = []
  })

  // 2. 将所有地址归类
  emailStore.addresses.forEach(addr => {
    const d = getDomainFromAddress(addr)
    if (!domainMap[d]) domainMap[d] = []

    // 若有搜索词，匹配过滤
    if (keyword) {
      const match = (addr.address || '').toLowerCase().includes(keyword) ||
                    (addr.name || '').toLowerCase().includes(keyword)
      if (match) domainMap[d].push(addr)
    } else {
      domainMap[d].push(addr)
    }
  })

  // 3. 构建分组列表（过滤掉地址为空的组，除非没有搜索词且属于配置域名）
  const result: GroupedDomainItem[] = []
  allDomains.forEach(domain => {
    const list = domainMap[domain] || []
    if (list.length > 0 || !keyword) {
      const unread = list.reduce((sum, addr) => sum + (emailStore.getNewMailCount(addr.address) || 0), 0)
      result.push({
        domain,
        addresses: list,
        unreadCount: unread
      })
    }
  })

  return result
})

// 空状态描述文案
const emptyFilterDescription = computed(() => {
  if (addressSearch.value) {
    return '没有找到匹配的邮箱地址'
  }
  if (selectedDomain.value !== 'all') {
    return `@${selectedDomain.value} 下暂无邮箱地址`
  }
  return '暂无邮箱'
})

// 搜索或数量变化时，保持页码合法
watch([filteredAddresses, addrPageSize], () => {
  const maxPage = Math.max(1, Math.ceil(filteredAddresses.value.length / addrPageSize.value))
  if (addrCurrentPage.value > maxPage) addrCurrentPage.value = maxPage
})

// 切换域名 Tab（🌟 核心优化：自动智能选中该域名下的首个邮箱，实现右侧收件箱瞬间无缝联动！）
function handleSelectDomainTab(domain: string) {
  selectedDomain.value = domain
  addrCurrentPage.value = 1

  // 如果选了特定域名，且当前选中的邮箱不属于该域名，自动选中该域名下的第一个邮箱
  if (domain !== 'all') {
    const currentDomain = emailStore.selectedAddress ? getDomainFromAddress(emailStore.selectedAddress) : null
    if (currentDomain !== domain) {
      const firstInDomain = emailStore.addresses.find(addr => getDomainFromAddress(addr) === domain)
      if (firstInDomain) {
        emailStore.selectAddress(firstInDomain)
      }
    }
  }
}

function handleAddrPageSizeChange(size: number) {
  addrPageSize.value = size
  addrCurrentPage.value = 1
  localStorage.setItem(ADDR_PAGE_SIZE_KEY, String(size))
}

function handleAddressSearch() {
  addrCurrentPage.value = 1
  // 搜索时，如果分组模式下有搜索词，自动展开有匹配结果的组
  if (viewMode.value === 'grouped' && addressSearch.value.trim()) {
    collapsedDomains.value.clear()
    collapsedDomains.value = new Set()
  }
}

function clearSearch() {
  addressSearch.value = ''
  addrCurrentPage.value = 1
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
      color: theme.text,
      boxShadow: `0 0 0 1px ${theme.border}, 0 2px 8px ${theme.glow}`
    }
  }
  return {
    borderColor: isDark.value ? 'rgba(148, 190, 225, 0.16)' : 'rgba(116, 146, 174, 0.22)',
    color: 'inherit'
  }
}

function getGroupCardStyle(domain: string) {
  const theme = getDomainTheme(domain, isDark.value)
  return {
    borderLeftColor: theme.primary
  }
}

function getItemAccentStyle(address: EmailAddress) {
  const isSelected = emailStore.selectedAddress?.id === address.id
  if (!isSelected) return {}

  const domain = getDomainFromAddress(address)
  const theme = getDomainTheme(domain, isDark.value)

  return {
    borderColor: theme.primary,
    boxShadow: `inset 3px 0 0 ${theme.primary}, 0 4px 16px ${theme.glow}`
  }
}

function getDomainBadgeStyle(domain: string) {
  const theme = getDomainTheme(domain, isDark.value)
  return {
    borderColor: theme.border,
    backgroundColor: theme.bg,
    color: theme.text
  }
}

// Modal style for better proportions
const modalStyle = computed(() => ({
  width: '480px',
  maxWidth: '90vw',
  minHeight: '420px'
}))

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

function generateRandomPrefix() {
  form.name = generateRandomString(8)
}

// 打开创建弹窗（支持指定默认域名）
function handleShowCreateModal(targetDomain?: string) {
  if (targetDomain) {
    form.domain = targetDomain
  } else if (selectedDomain.value !== 'all') {
    form.domain = selectedDomain.value
  } else {
    const available = emailStore.allAvailableDomains || COMMON_DOMAINS
    form.domain = available[0] || COMMON_DOMAINS[0]
  }
  form.name = ''
  showCreateModal.value = true
}

async function handleCreateEmailAndClose() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const prefix = form.name.trim() || generateRandomString(8)
    const targetDomain = form.domain
    const newAddress = await emailStore.createAddress(prefix, targetDomain)

    form.name = ''
    showCreateModal.value = false

    if (selectedDomain.value !== 'all' && selectedDomain.value !== targetDomain) {
      selectedDomain.value = targetDomain
    }

    message.success(`邮箱 ${newAddress.address} 创建成功！`)
  } catch (error) {
    console.error('Create email error:', error)
  }
}

function handleSelectEmail(address: EmailAddress) {
  emailStore.selectAddress(address)
}

async function handleDeleteEmail(id: string) {
  await emailStore.deleteAddress(id)
}

async function copyEmailAddress(address: string) {
  const success = await copyToClipboard(address)
  if (success) {
    message.success('邮箱地址已复制到剪贴板')
  } else {
    message.error('复制邮箱地址失败')
  }
}

async function handleRefreshMails() {
  if (emailStore.selectedAddress) {
    await emailStore.loadMails(emailStore.selectedAddress.address)
    message.success('邮件列表已刷新')
  } else {
    message.warning('请先选择一个邮箱地址')
  }
}

function getUnreadCount(address: EmailAddress): number {
  return emailStore.getNewMailCount(address.address)
}

function formatDate(dateString: string) {
  return formatRelativeTime(dateString, uiStore.useUTCDate)
}

function getLastMailTime(address: EmailAddress): string {
  if (emailStore.selectedAddress?.address === address.address) {
    const addressMails = emailStore.mails.filter(mail =>
      mail.address === address.address
    )

    if (addressMails.length > 0) {
      const latestMail = addressMails.reduce((latest, current) => {
        const latestTime = new Date(latest.created_at + ' UTC').getTime()
        const currentTime = new Date(current.created_at + ' UTC').getTime()
        return currentTime > latestTime ? current : latest
      })
      return formatDate(latestMail.created_at)
    }
  }

  return formatDate(address.created_at)
}
</script>

<style scoped>
.email-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  --manager-panel: rgba(255, 255, 255, 0.32);
  --manager-panel-strong: rgba(255, 255, 255, 0.56);
  --manager-item: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(246, 251, 250, 0.76));
  --manager-item-hover: rgba(56, 194, 177, 0.12);
  --manager-border: rgba(88, 112, 130, 0.2);
  --manager-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 1px 2px rgba(33, 55, 76, 0.08), 0 8px 20px rgba(33, 55, 76, 0.08);
  --manager-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.85) inset, 0 3px 8px rgba(33, 55, 76, 0.12), 0 16px 36px rgba(33, 55, 76, 0.14);
}

[data-theme="dark"] .email-manager {
  --manager-panel: rgba(5, 10, 20, 0.24);
  --manager-panel-strong: rgba(9, 18, 32, 0.5);
  --manager-item: linear-gradient(180deg, rgba(20, 36, 58, 0.9), rgba(11, 22, 38, 0.86));
  --manager-item-hover: rgba(143, 216, 255, 0.12);
  --manager-border: rgba(196, 226, 248, 0.18);
  --manager-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 1px 2px rgba(0, 0, 0, 0.34), 0 10px 24px rgba(0, 0, 0, 0.26);
  --manager-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.09) inset, 0 3px 8px rgba(0, 0, 0, 0.42), 0 18px 44px rgba(0, 0, 0, 0.36);
}

.manager-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 6px;
  background: transparent;
  border-bottom: 1px solid var(--manager-border);
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

.header-main-icon {
  color: var(--n-primary-color);
}

.header-total-badge {
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 视图模式切换器 */
.view-mode-toggle {
  display: inline-flex;
  align-items: center;
  background: var(--manager-panel-strong);
  border: 1px solid var(--manager-border);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--n-text-color-3);
  cursor: pointer;
  transition: all 0.16s ease;
}

.view-toggle-btn:hover {
  color: var(--n-text-color);
}

.view-toggle-btn--active {
  background: var(--n-primary-color-suppl);
  color: var(--n-primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.create-btn-glow {
  box-shadow: 0 2px 10px var(--n-primary-color-suppl);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.create-btn-glow:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px var(--n-primary-color-suppl);
}

/* 域名分段筛选栏 (Domain Filter Tabs) */
.domain-filter-bar {
  flex-shrink: 0;
  margin: 0 -2px;
  padding: 2px 2px 4px;
}

.domain-tabs-scroll {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 2px 1px;
}

.domain-tabs-scroll::-webkit-scrollbar {
  display: none;
}

.domain-tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid var(--manager-border);
  background: var(--manager-panel);
  color: var(--n-text-color-2);
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  backdrop-filter: blur(8px);
}

.domain-tab-pill:hover {
  background: var(--manager-panel-strong);
  color: var(--n-text-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 55, 76, 0.08);
}

.domain-tab-pill--active {
  background: var(--manager-panel-strong);
  font-weight: 600;
  color: var(--n-text-color);
  transform: translateY(-1px);
}

.tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.tab-label {
  font-size: 12px;
  line-height: 1;
}

.tab-count {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 10px;
  background: rgba(120, 140, 160, 0.14);
  color: inherit;
  opacity: 0.88;
}

.tab-unread-dot {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 10px;
  background: #f43f5e;
  color: #ffffff;
  font-weight: 700;
  animation: pulse-badge 2s ease-in-out infinite;
}

/* 分组模式工具栏 */
.grouped-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px;
}

.grouped-meta-text {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}

.grouped-quick-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grouped-action-text-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  color: var(--n-text-color-2);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease;
}

.grouped-action-text-btn:hover {
  color: var(--n-primary-color);
}

.action-divider {
  color: var(--manager-border);
  font-size: 10px;
}

/* 搜索栏 */
.address-search-section {
  flex-shrink: 0;
}

.address-search-section :deep(.n-input) {
  background: var(--manager-panel-strong);
  border-radius: 12px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset, 0 2px 8px rgba(33, 55, 76, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.address-search-section :deep(.n-input:hover) {
  border-color: var(--n-primary-color-hover);
}
.address-search-section :deep(.n-input.n-input--focus) {
  box-shadow: 0 0 0 3px var(--n-primary-color-suppl), 0 4px 12px rgba(63, 159, 211, 0.12) !important;
}

/* 列表区 */
.email-list-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
}

.email-list {
  flex: 1;
  min-height: 0;
  padding: 2px 0 0;
}

.empty-extra {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 240px;
}

.empty-copy {
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

/* 邮箱卡片列表 (Tabs Mode) */
.email-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.email-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 70px;
  padding: 11px 12px;
  border-radius: 14px;
  border: 1px solid var(--manager-border);
  background: var(--manager-item);
  box-shadow: var(--manager-shadow);
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.email-item:hover {
  border-color: rgba(63, 159, 211, 0.45);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 6px 18px rgba(33, 55, 76, 0.1);
  transform: translateY(-2px);
}

.email-item--selected {
  transform: translateY(-2px);
}

.email-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.email-address-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.email-domain-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}

.address-prefix {
  font-weight: 600;
  color: var(--n-text-color);
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.2px;
}

.domain-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 6px;
  border: 1px solid transparent;
  flex-shrink: 0;
  letter-spacing: -0.2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
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
    opacity: 0.82;
  }
}

.email-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-left: 14px;
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
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.email-item:hover .email-actions,
.email-item--selected .email-actions,
.email-actions:focus-within {
  opacity: 1;
}

.action-btn-copy:hover {
  color: var(--n-primary-color) !important;
}

.action-btn-del:hover {
  color: #f43f5e !important;
}

/* 分组手风琴卡片样式 (Grouped Folders View) */
.domain-groups-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.domain-group-card {
  border: 1px solid var(--manager-border);
  border-left-width: 4px;
  border-radius: 12px;
  background: var(--manager-panel);
  backdrop-filter: blur(8px);
  overflow: hidden;
  transition: all 0.2s ease;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  background: var(--manager-panel-strong);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.group-header:hover {
  background: rgba(120, 140, 160, 0.16);
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.group-collapse-arrow {
  color: var(--n-text-color-3);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.group-collapse-arrow--expanded {
  transform: rotate(90deg);
}

.group-theme-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}

.group-domain-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color);
  letter-spacing: -0.2px;
}

.group-count-badge {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(120, 140, 160, 0.16);
  color: var(--n-text-color-2);
  font-weight: 600;
}

.group-unread-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 10px;
  background: #f43f5e;
  color: #ffffff;
  font-weight: 700;
  animation: pulse-badge 2s ease-in-out infinite;
}

.group-quick-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--manager-border);
  background: var(--manager-panel);
  color: var(--n-text-color-2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.group-quick-create-btn:hover {
  background: var(--n-primary-color-suppl);
  color: var(--n-primary-color);
  border-color: var(--n-primary-color);
}

.group-items-wrapper {
  padding: 7px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--manager-border);
}

.email-item--grouped {
  min-height: 60px;
  padding: 8px 10px;
  border-radius: 8px;
}

.email-item--grouped .email-meta {
  padding-left: 0;
}

/* 地址分页 */
.address-pagination {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--manager-border);
}

/* Create Email Modal */
.create-email-modal {
  position: relative;
}

.modal-content {
  background: var(--n-card-color);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--n-border-color);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--n-border-color);
  background: linear-gradient(135deg, var(--n-primary-color-suppl) 0%, rgba(79, 143, 199, 0.06) 100%);
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.modal-icon {
  color: var(--n-primary-color);
  background: rgba(79, 143, 199, 0.14);
  padding: 8px;
  border-radius: 10px;
}

.modal-title-text h3 {
  margin: 0 0 3px 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--n-text-color);
}

.modal-title-text p {
  margin: 0;
  font-size: 13px;
  color: var(--n-text-color-2);
}

.modal-form {
  padding: 22px 24px;
}

.form-item {
  margin-bottom: 18px;
}

.dice-button {
  color: var(--n-primary-color);
  transition: transform 0.25s ease;
}

.dice-button:hover {
  transform: rotate(180deg);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--n-border-color);
}

.cancel-button {
  min-width: 80px;
}

.create-button {
  min-width: 120px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .email-actions {
    opacity: 1;
  }
}
</style>

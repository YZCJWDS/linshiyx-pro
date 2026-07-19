import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EmailAddress, EmailMessage, UserSettings } from '@/types'
import { addressApi, mailApi, settingsApi } from '@/utils/api'
import { parseEmailMessage } from '@/utils/wasmMailParser'
import { useUiStore } from './ui'

export const useEmailStore = defineStore('email', () => {
  const uiStore = useUiStore()

  // State
  const addresses = ref<EmailAddress[]>([])
  const selectedAddress = ref<EmailAddress | null>(null)
  const mails = ref<EmailMessage[]>([])
  const selectedMail = ref<EmailMessage | null>(null)

  // 每个邮箱的未读数量（保留原字段名以兼容现有组件）
  const newMailCounts = ref<Record<string, number>>({})
  const userSettings = ref<UserSettings>({
    enable: false,
    enableMailVerify: false,
    verifyMailSender: '',
    enableMailAllowList: false,
    mailAllowList: [],
    maxAddressCount: 5
  })

  // 本地存储键名 - 使用更独特的键名避免冲突
  const STORAGE_KEYS = {
    ADDRESSES: 'linshiyx_admin_addresses_v3',
    SELECTED_ADDRESS: 'linshiyx_admin_selected_v3',
    STORAGE_VERSION: 'linshiyx_storage_version',
    READ_MAILS: 'linshiyx_read_mail_ids_v1'
  }

  // 已读邮件 ID 集合（持久化到 localStorage，刷新后仍保留已读状态）
  const READ_MAILS_LIMIT = 2000
  const readMailIds = ref<Set<string>>(new Set())

  function loadReadMailIds() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.READ_MAILS)
      if (stored) {
        const ids = JSON.parse(stored)
        if (Array.isArray(ids)) {
          readMailIds.value = new Set(ids.map((id: any) => String(id)))
        }
      }
    } catch (error) {
      console.warn('Failed to load read mail ids:', error)
    }
  }

  function saveReadMailIds() {
    try {
      let ids = Array.from(readMailIds.value)
      // 控制上限，避免无限增长；保留最近的部分
      if (ids.length > READ_MAILS_LIMIT) {
        ids = ids.slice(ids.length - READ_MAILS_LIMIT)
        readMailIds.value = new Set(ids)
      }
      localStorage.setItem(STORAGE_KEYS.READ_MAILS, JSON.stringify(ids))
    } catch (error) {
      console.warn('Failed to save read mail ids:', error)
    }
  }

  function isMailRead(id: string | number | undefined | null): boolean {
    if (id === undefined || id === null) return false
    return readMailIds.value.has(String(id))
  }

  function mailBelongsToAddress(mail: EmailMessage, address: string): boolean {
    return mail.address === address || mail.to_mail === address || Boolean(mail.to_mail?.includes(`<${address}>`))
  }

  function syncUnreadCountForAddress(address: string, sourceMails = mails.value) {
    newMailCounts.value[address] = sourceMails.reduce((count, mail) => {
      if (!mailBelongsToAddress(mail, address) || isMailRead(mail.id)) return count
      return count + 1
    }, 0)
  }

  function markMailRead(id: string | number | undefined | null) {
    if (id === undefined || id === null) return
    const key = String(id)
    if (!readMailIds.value.has(key)) {
      readMailIds.value.add(key)
      // 触发响应式更新（Set 的 add 不会自动触发依赖）
      readMailIds.value = new Set(readMailIds.value)
      saveReadMailIds()
      if (selectedAddress.value) {
        syncUnreadCountForAddress(selectedAddress.value.address)
      }
    }
  }

  function markAllRead(ids: Array<string | number>) {
    let changed = false
    for (const id of ids) {
      const key = String(id)
      if (!readMailIds.value.has(key)) {
        readMailIds.value.add(key)
        changed = true
      }
    }
    if (changed) {
      readMailIds.value = new Set(readMailIds.value)
      saveReadMailIds()
      if (selectedAddress.value) {
        syncUnreadCountForAddress(selectedAddress.value.address)
      }
    }
  }

  const unreadCount = computed(() => {
    const address = selectedAddress.value?.address
    if (!address) return 0

    return mails.value.reduce((sum, mail) => {
      if (!mailBelongsToAddress(mail, address) || isMailRead(mail.id)) return sum
      return sum + 1
    }, 0)
  })

  loadReadMailIds()

  // 存储版本，用于数据迁移
  const STORAGE_VERSION = '3.0'

  // Loading states
  const loading = ref({
    addresses: false,
    mails: false,
    creating: false,
    sending: false,
    deleting: false
  })

  type NormalizedMailFields = Partial<Pick<
    EmailMessage,
    | 'raw'
    | 'to_mail'
    | 'source'
    | 'subject'
    | 'message'
    | 'text'
    | 'content'
    | 'is_html'
    | 'attachments'
    | 'originalSource'
  >>

  const MAIL_PARSE_CACHE_LIMIT = 300
  const mailParseCache = new Map<string, NormalizedMailFields>()

  function hashMailRaw(raw: string): string {
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
    }
    return hash.toString(36)
  }

  function getMailParseCacheKey(mail: EmailMessage, raw: string): string {
    return `${mail.id}:${raw.length}:${hashMailRaw(raw)}`
  }

  function rememberParsedMail(cacheKey: string, fields: NormalizedMailFields) {
    if (mailParseCache.has(cacheKey)) {
      mailParseCache.delete(cacheKey)
    }

    mailParseCache.set(cacheKey, fields)

    if (mailParseCache.size > MAIL_PARSE_CACHE_LIMIT) {
      const oldestKey = mailParseCache.keys().next().value
      if (oldestKey) {
        mailParseCache.delete(oldestKey)
      }
    }
  }

  function applyNormalizedMailFields(mail: EmailMessage, fields: NormalizedMailFields): EmailMessage {
    Object.assign(mail, fields)
    return mail
  }

  async function normalizeMail(mail: EmailMessage, verbose = false): Promise<EmailMessage> {
    const raw = mail.raw
    if (typeof raw !== 'string' || !raw) {
      return mail
    }

    const cacheKey = getMailParseCacheKey(mail, raw)
    const cachedFields = mailParseCache.get(cacheKey)
    if (cachedFields) {
      return applyNormalizedMailFields(mail, cachedFields)
    }

    try {
      if (verbose) {
        console.log('Parsing raw data for mail:', mail.id)
      }

      let parsedFields: NormalizedMailFields | null = null

      try {
        const rawData = JSON.parse(raw)
        const formattedRaw = JSON.stringify(rawData, null, 2)

        if (rawData.version === "v2") {
          parsedFields = {
            to_mail: rawData.to_name ? `${rawData.to_name} <${rawData.to_mail}>` : rawData.to_mail,
            subject: rawData.subject,
            is_html: rawData.is_html,
            content: rawData.content,
            raw: formattedRaw
          }
        } else {
          parsedFields = {
            subject: rawData.subject,
            is_html: rawData.content?.[0]?.type !== "text/plain",
            content: rawData.content?.[0]?.value,
            raw: formattedRaw
          }
        }

        applyNormalizedMailFields(mail, parsedFields)

        if (verbose) {
          console.log('Processed JSON mail:', {
            id: mail.id,
            subject: mail.subject,
            is_html: mail.is_html,
            content_length: mail.content?.length || 0
          })
        }
      } catch (jsonError) {
        if (verbose) {
          console.log('JSON parse failed, trying WASM parse for mail:', mail.id)
        }

        await parseEmailMessage(mail)

        parsedFields = {
          originalSource: mail.originalSource,
          source: mail.source,
          subject: mail.subject,
          message: mail.message,
          text: mail.text,
          content: mail.content,
          is_html: mail.is_html,
          attachments: mail.attachments
        }

        if (verbose) {
          console.log('Processed WASM mail:', {
            id: mail.id,
            subject: mail.subject,
            is_html: mail.is_html,
            content_length: mail.content?.length || 0,
            message_length: mail.message?.length || 0,
            text_length: mail.text?.length || 0
          })
        }
      }

      if (parsedFields) {
        rememberParsedMail(cacheKey, parsedFields)
      }
    } catch (error) {
      console.warn('Failed to parse raw data for mail:', mail.id, error)
    }

    return mail
  }

  async function normalizeMails(rawMails: EmailMessage[] = [], verbose = false): Promise<EmailMessage[]> {
    return Promise.all(rawMails.map(mail => normalizeMail(mail, verbose)))
  }

  function replaceMails(processedMails: EmailMessage[]) {
    const selectedMailId = selectedMail.value?.id
    mails.value = processedMails

    if (selectedMailId) {
      selectedMail.value = processedMails.find(mail => mail.id === selectedMailId) || null
    }
  }

  // 本地存储函数
  // 使用现有的 addressApi 进行后端同步
  async function saveAddressesToBackend() {
    try {
      console.log('☁️ Backend sync not needed - addresses are managed individually')
      // 地址是通过 addressApi.create() 和 addressApi.delete() 单独管理的
      // 不需要批量保存，因为每个操作都会直接调用后端 API
      saveAddressesToStorage()
    } catch (error) {
      console.warn('⚠️ Failed to save to backend, using localStorage only:', error)
      saveAddressesToStorage()
    }
  }

  // 从后端加载地址列表（仅作为备份，不覆盖本地数据）
  async function loadAddressesFromBackend(): Promise<boolean> {
    try {
      console.log('☁️ Loading addresses from backend using /admin/address...')

      // 使用现有的 addressApi
      const response = await addressApi.getAll(100, 0)

      if (response.results && Array.isArray(response.results)) {
        // 只有在本地没有数据时才使用后端数据
        if (addresses.value.length === 0) {
          addresses.value = response.results
          console.log('✅ Loaded', addresses.value.length, 'addresses from backend')
          console.log('📧 Addresses:', addresses.value.map(addr => addr.address))

          // 保存到本地
          saveAddressesToStorage()
          return true
        } else {
          console.log('ℹ️ Local data exists, skipping backend override')
          return false
        }
      } else {
        console.log('ℹ️ No addresses found in backend')
        return false
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from backend:', error)
      return false
    }
  }

  function saveAddressesToStorage() {
    try {
      const addressesToSave = addresses.value
      const dataToSave = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        addresses: addressesToSave
      }

      localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(dataToSave))
      localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, STORAGE_VERSION)

      console.log('💾 Saved', addressesToSave.length, 'addresses to localStorage (backup)')
    } catch (error) {
      console.error('❌ Failed to save addresses to localStorage:', error)
    }
  }

  function loadAddressesFromStorage() {
    try {
      console.log('📂 Loading admin addresses from storage')
      console.log('📦 Storage key:', STORAGE_KEYS.ADDRESSES)

      // 尝试从新版本存储加载
      const stored = localStorage.getItem(STORAGE_KEYS.ADDRESSES)
      if (stored) {
        const parsedData = JSON.parse(stored)

        // 检查是否是新版本格式
        if (parsedData && parsedData.version && parsedData.addresses) {
          console.log('✅ Found v3 admin data, version:', parsedData.version)
          addresses.value = parsedData.addresses
          console.log('📧 Loaded', addresses.value.length, 'admin addresses')
          console.log('📧 Addresses:', addresses.value.map(addr => addr.address))
          return
        }

        // 兼容旧版本格式（直接数组）
        if (Array.isArray(parsedData)) {
          console.log('⚠️ Found legacy array format, migrating...')
          addresses.value = parsedData
          saveAddressesToStorage()
          return
        }
      }

      // 尝试从旧版本键名加载（兼容性）
      const legacyKeys = [
        'linshiyx_user_addresses_v2', // v2 格式
        'temp_email_addresses',
        'emailAddresses',
        'addresses'
      ]

      for (const key of legacyKeys) {
        const legacyData = localStorage.getItem(key)
        if (legacyData) {
          try {
            const parsedLegacy = JSON.parse(legacyData)

            // 处理 v2 格式（带版本信息）
            if (parsedLegacy && parsedLegacy.addresses && Array.isArray(parsedLegacy.addresses)) {
              console.log(`⚠️ Found v2 data in key "${key}", migrating to v3...`)
              addresses.value = parsedLegacy.addresses
              saveAddressesToStorage()
              // 不删除旧数据，以防需要回滚
              return
            }

            // 处理旧版本格式（直接数组）
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0 && parsedLegacy[0].address) {
              console.log(`⚠️ Found legacy data in key "${key}", migrating to v3...`)
              addresses.value = parsedLegacy
              saveAddressesToStorage()
              // 不删除旧数据，以防需要回滚
              return
            }
          } catch (e) {
            console.warn(`Failed to parse legacy storage key "${key}":`, e)
          }
        }
      }

      console.log('ℹ️ No stored admin addresses found')
    } catch (error) {
      console.error('❌ Failed to load addresses from localStorage:', error)
    }
  }

  function saveSelectedAddressToStorage() {
    try {
      if (selectedAddress.value) {
        const dataToSave = {
          version: STORAGE_VERSION,
          timestamp: Date.now(),
          address: selectedAddress.value
        }
        localStorage.setItem(STORAGE_KEYS.SELECTED_ADDRESS, JSON.stringify(dataToSave))
        console.log('✅ Saved selected address to storage:', selectedAddress.value.address)
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_ADDRESS)
        console.log('ℹ️ Removed selected address from storage (none selected)')
      }
    } catch (error) {
      console.error('❌ Failed to save selected address to localStorage:', error)
    }
  }

  function loadSelectedAddressFromStorage() {
    try {
      console.log('📂 Loading selected address from storage key:', STORAGE_KEYS.SELECTED_ADDRESS)

      // 尝试从新版本存储加载
      const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_ADDRESS)
      if (stored) {
        const parsedData = JSON.parse(stored)

        // 检查是否是新版本格式
        if (parsedData && parsedData.version && parsedData.address) {
          console.log('✅ Found v2 selected address format')
          const storedAddress = parsedData.address

          // 确保这个地址还在地址列表中
          const existingAddress = addresses.value.find(addr => addr.id === storedAddress.id)
          if (existingAddress) {
            selectedAddress.value = existingAddress
            console.log('📧 Loaded selected address from storage:', existingAddress.address)
            return
          } else {
            console.log('⚠️ Stored selected address not found in address list')
          }
        }

        // 兼容旧版本格式（直接对象）
        if (parsedData && parsedData.id) {
          console.log('⚠️ Found legacy selected address format, migrating...')

          // 确保这个地址还在地址列表中
          const existingAddress = addresses.value.find(addr => addr.id === parsedData.id)
          if (existingAddress) {
            selectedAddress.value = existingAddress
            console.log('📧 Loaded selected address from legacy storage:', existingAddress.address)

            // 迁移到新格式
            saveSelectedAddressToStorage()
            return
          }
        }
      }

      // 尝试从旧版本键名加载（兼容性）
      const legacyKeys = ['temp_email_selected_address', 'selectedAddress']
      for (const key of legacyKeys) {
        const legacyData = localStorage.getItem(key)
        if (legacyData) {
          try {
            const parsedLegacy = JSON.parse(legacyData)
            if (parsedLegacy && parsedLegacy.id) {
              console.log(`⚠️ Found selected address in legacy key "${key}", migrating...`)

              // 确保这个地址还在地址列表中
              const existingAddress = addresses.value.find(addr => addr.id === parsedLegacy.id)
              if (existingAddress) {
                selectedAddress.value = existingAddress
                console.log('📧 Loaded selected address from legacy key:', existingAddress.address)

                // 迁移到新格式
                saveSelectedAddressToStorage()

                // 清理旧数据
                localStorage.removeItem(key)
                return
              }
            }
          } catch (e) {
            console.warn(`Failed to parse legacy selected address key "${key}":`, e)
          }
        }
      }

      // 如果没有选中的地址但有地址列表，自动选择第一个
      if (!selectedAddress.value && addresses.value.length > 0) {
        console.log('ℹ️ No selected address found, auto-selecting first address')
        selectedAddress.value = addresses.value[0]
        saveSelectedAddressToStorage()
      } else {
        console.log('ℹ️ No stored selected address found')
      }
    } catch (error) {
      console.error('❌ Failed to load selected address from localStorage:', error)
    }
  }

  // Computed
  const hasAddresses = computed(() => addresses.value.length > 0)
  const hasMails = computed(() => mails.value.length > 0)

  // 获取指定邮箱的未读邮件数量
  const getNewMailCount = (address: string) => {
    const count = newMailCounts.value[address] || 0
    return count
  }

  // 手动添加新邮件计数（用于测试）
  const addNewMailCount = (address: string, count: number = 1) => {
    const currentCount = newMailCounts.value[address] || 0
    newMailCounts.value[address] = currentCount + count
    console.log(`🧪 Test: Added ${count} new mails to ${address}, total: ${newMailCounts.value[address]}`)
  }
  const selectedAddressMails = computed(() => {
    if (!selectedAddress.value) return []
    const address = selectedAddress.value.address
    return mails.value.filter(mail => mailBelongsToAddress(mail, address))
  })

  // Actions
  async function loadAddresses() {
    loading.value.addresses = true
    try {
      // 首先从本地存储加载
      loadAddressesFromStorage()

      // 然后尝试从后端同步（可选，用于多设备同步）
      try {
        const response = await addressApi.getAll(100, 0)
        if (response.results && response.results.length > 0) {
          // 如果后端有数据，合并到本地（去重）
          const backendAddresses = response.results
          const existingIds = new Set(addresses.value.map(addr => addr.address))

          for (const backendAddr of backendAddresses) {
            if (!existingIds.has(backendAddr.address)) {
              addresses.value.push(backendAddr)
            }
          }

          // 保存合并后的结果
          saveAddressesToStorage()
        }
      } catch (apiError) {
        console.warn('Failed to sync with backend, using local storage only:', apiError)
      }
    } catch (error) {
      console.error('Load addresses error:', error)
    } finally {
      loading.value.addresses = false
    }
  }

  async function createAddress(name: string, domain: string, enablePrefix = true, cfToken?: string) {
    loading.value.creating = true
    try {
      console.log('Creating address with data:', { enablePrefix, name, domain, cfToken })

      // 使用新的 API 调用方式
      const newAddress = await addressApi.create({
        enablePrefix,
        name,
        domain,
        cf_token: cfToken
      })

      // 将新地址添加到列表开头
      addresses.value.unshift(newAddress)

      // 保存到本地存储（后端已经通过 addressApi.create 保存了）
      saveAddressesToStorage()

      // 如果这是第一个地址，自动选中它
      if (!selectedAddress.value) {
        selectedAddress.value = newAddress
        saveSelectedAddressToStorage()
      }

      uiStore.showSuccess('邮箱地址创建成功')
      console.log('Address created successfully:', newAddress)
      return newAddress
    } catch (error) {
      console.error('Create address error:', error)

      // 提供更详细的错误信息
      let errorMessage = '创建邮箱地址失败'
      if (error instanceof Error) {
        if (error.message.includes('405')) {
          errorMessage = '后端API不支持此操作，请检查API配置'
        } else if (error.message.includes('404')) {
          errorMessage = 'API端点未找到，请检查后端服务'
        } else if (error.message.includes('Network error')) {
          errorMessage = '网络连接失败，请检查网络连接'
        } else if (error.message.includes('401')) {
          errorMessage = '认证失败，请检查访问权限'
        } else {
          errorMessage = `创建失败: ${error.message}`
        }
      }

      uiStore.showError(errorMessage)
      throw error
    } finally {
      loading.value.creating = false
    }
  }

  async function deleteAddress(id: string) {
    loading.value.deleting = true
    try {
      await addressApi.delete(id)
      addresses.value = addresses.value.filter(addr => addr.id !== id)

      // 保存到本地存储（后端已经通过 addressApi.delete 删除了）
      saveAddressesToStorage()

      // Clear selection if deleted address was selected
      if (selectedAddress.value?.id === id) {
        selectedAddress.value = null
        mails.value = []
        selectedMail.value = null
        saveSelectedAddressToStorage()
      }

      uiStore.showSuccess('邮箱地址删除成功')
    } catch (error) {
      uiStore.showError('Failed to delete email address')
      console.error('Delete address error:', error)
    } finally {
      loading.value.deleting = false
    }
  }

  async function loadMails(address?: string, keyword?: string) {
    loading.value.mails = true
    try {
      console.log('Loading mails for address:', address, 'keyword:', keyword)

      // 使用新的 API 调用方式，不需要 JWT 参数
      const response = await mailApi.getAll({
        limit: 100,
        offset: 0,
        address,
        keyword
      })

      const processedMails = await normalizeMails(response.results || [], true)
      replaceMails(processedMails)
      const targetAddress = address || selectedAddress.value?.address
      if (targetAddress && !keyword) {
        syncUnreadCountForAddress(targetAddress, processedMails)
      }
      console.log('Loaded mails:', mails.value.length)
    } catch (error) {
      console.error('Load mails error:', error)

      // 提供更详细的错误信息
      let errorMessage = '加载邮件失败'
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = '认证失败，请重新登录'
        } else if (error.message.includes('404')) {
          errorMessage = '邮件服务不可用'
        } else {
          errorMessage = `加载失败: ${error.message}`
        }
      }

      uiStore.showError(errorMessage)
      mails.value = []
    } finally {
      loading.value.mails = false
    }
  }

  async function loadMailsForAddress(address: EmailAddress) {
    selectedAddress.value = address
    saveSelectedAddressToStorage()
    await loadMails(address.address)
  }

  async function deleteMail(id: string) {
    try {
      console.log('Deleting mail:', id)

      // 使用新的 API 调用方式，不需要 JWT 参数
      await mailApi.delete(id)

      // 从列表中移除已删除的邮件
      mails.value = mails.value.filter(mail => mail.id !== id)
      if (selectedAddress.value) {
        syncUnreadCountForAddress(selectedAddress.value.address)
      }

      // 如果删除的是当前选中的邮件，清除选择
      if (selectedMail.value?.id === id) {
        selectedMail.value = null
      }

      uiStore.showSuccess('邮件删除成功')
      console.log('Mail deleted successfully')
    } catch (error) {
      console.error('Delete mail error:', error)

      let errorMessage = '删除邮件失败'
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = '认证失败，无法删除邮件'
        } else if (error.message.includes('404')) {
          errorMessage = '邮件不存在或已被删除'
        } else {
          errorMessage = `删除失败: ${error.message}`
        }
      }

      uiStore.showError(errorMessage)
    }
  }

  async function loadUserSettings() {
    try {
      const settings = await settingsApi.get()
      userSettings.value = settings
    } catch (error) {
      console.error('Load user settings error:', error)
    }
  }

  function selectAddress(address: EmailAddress) {
    selectedAddress.value = address
    selectedMail.value = null

    loadMailsForAddress(address)
  }

  function selectMail(mail: EmailMessage) {
    // 完全按照示例前端的方式：直接设置选中邮件，不额外获取详情
    selectedMail.value = mail
    // 打开即标记为已读并持久化
    markMailRead(mail.id)
    console.log('Selected mail (reference frontend style):', mail)
    console.log('Mail fields available:', Object.keys(mail))
    console.log('Mail message field:', mail.message?.substring(0, 200) + '...')
    console.log('Mail content field:', mail.content?.substring(0, 200) + '...')
    console.log('Mail text field:', mail.text?.substring(0, 200) + '...')
    console.log('Mail is_html field:', mail.is_html)
  }

  function clearSelection() {
    selectedAddress.value = null
    selectedMail.value = null
    mails.value = []
  }

  // Auto-refresh mails for selected address (按照示例前端的方式)
  let refreshInterval: NodeJS.Timeout | null = null
  let backgroundSyncInterval: NodeJS.Timeout | null = null
  let beforeUnloadRegistered = false

  // 后台静默刷新邮件（不显示加载状态）
  async function silentRefreshMails(address?: string, keyword?: string) {
    // 如果正在加载，跳过这次刷新（完全按照示例前端的逻辑）
    if (loading.value.mails) {
      console.log('⏭️ Skipping auto-refresh: already loading')
      return
    }

    try {
      console.log('🔄 Silent refresh mails for address:', address, 'keyword:', keyword)

      // 使用新的 API 调用方式，不设置loading状态
      const response = await mailApi.getAll({
        limit: 100,
        offset: 0,
        address,
        keyword
      })

      const processedMails = await normalizeMails(response.results || [])

      // 静默更新邮件列表（不触发UI加载状态）
      const oldMailIds = new Set(mails.value.map(mail => mail.id))
      const newMails = processedMails.filter(mail => !oldMailIds.has(mail.id))

      replaceMails(processedMails)

      if (address && !keyword) {
        syncUnreadCountForAddress(address, processedMails)
        if (newMails.length > 0) {
          console.log(`📬 Found ${newMails.length} new mails for ${address}, total unread: ${newMailCounts.value[address]}`)
        }
      }

      console.log('✅ Silent refresh completed:', mails.value.length, 'mails')
    } catch (error) {
      console.error('Silent refresh error:', error)
      // 静默处理错误，不显示错误提示
    }
  }

  function startAutoRefresh(intervalMs = 30000) {
    stopAutoRefresh()
    refreshInterval = setInterval(async () => {
      if (selectedAddress.value) {
        // 使用静默刷新而不是普通的loadMails
        try {
          await silentRefreshMails(selectedAddress.value.address)
        } catch (error) {
          console.warn('Auto-refresh failed:', error)
        }
      }
    }, intervalMs)
    console.log('🔄 Auto-refresh started, interval:', intervalMs + 'ms')
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
      console.log('⏹️ Auto-refresh stopped')
    }
  }

  function saveBeforeUnload() {
    console.log('🔄 Auto-saving before page unload')
    saveAddressesToStorage()
    if (selectedAddress.value) {
      saveSelectedAddressToStorage()
    }
  }

  function registerBeforeUnloadSave() {
    if (beforeUnloadRegistered) return
    window.addEventListener('beforeunload', saveBeforeUnload)
    beforeUnloadRegistered = true
  }

  function unregisterBeforeUnloadSave() {
    if (!beforeUnloadRegistered) return
    window.removeEventListener('beforeunload', saveBeforeUnload)
    beforeUnloadRegistered = false
  }

  function startBackgroundSync() {
    if (backgroundSyncInterval) return

    backgroundSyncInterval = setInterval(async () => {
      if (addresses.value.length > 0) {
        console.log('🔄 Background sync to backend...')
        try {
          await saveAddressesToBackend()
        } catch (error) {
          console.warn('⚠️ Background sync failed:', error)
        }
      }
    }, 5 * 60 * 1000)
  }

  function stopBackgroundSync() {
    if (backgroundSyncInterval) {
      clearInterval(backgroundSyncInterval)
      backgroundSyncInterval = null
      console.log('⏹️ Background sync stopped')
    }
  }

  // 初始化函数 - 优先本地存储，后端作为备份同步
  async function initializeStore() {
    console.log('🚀 Initializing email store...')

    // 检查存储版本
    const storedVersion = localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION)
    console.log('📊 Storage version check:', storedVersion || 'not set', 'current:', STORAGE_VERSION)

    // 首先从本地存储加载数据（确保基本功能正常）
    loadAddressesFromStorage()
    loadSelectedAddressFromStorage()

    console.log('✅ Email store initialized with', addresses.value.length, 'admin addresses from local storage')

    if (addresses.value.length > 0) {
      console.log('📧 Available addresses:', addresses.value.map(addr => addr.address))

      if (storedVersion !== STORAGE_VERSION) {
        console.log('🔄 Updating storage to latest version')
        saveAddressesToStorage()
        if (selectedAddress.value) {
          saveSelectedAddressToStorage()
        }
      }
    } else {
      console.log('ℹ️ No local addresses found, trying backend...')

      // 只有在本地没有数据时才从后端加载
      try {
        const backendLoaded = await loadAddressesFromBackend()
        if (backendLoaded) {
          console.log('✅ Loaded addresses from backend as fallback')
        }
      } catch (error) {
        console.warn('⚠️ Backend loading failed, will create new addresses as needed:', error)
      }
    }

    // 设置自动保存和后台同步，避免重复初始化时创建多个监听器/定时器
    registerBeforeUnloadSave()
    startBackgroundSync()
  }

  return {
    // State
    addresses,
    selectedAddress,
    mails,
    selectedMail,
    userSettings,
    loading,
    newMailCounts,

    // Computed
    hasAddresses,
    hasMails,
    getNewMailCount,
    addNewMailCount,
    selectedAddressMails,
    unreadCount,

    // 已读状态
    isMailRead,
    markMailRead,
    markAllRead,

    // Actions
    loadAddresses,
    createAddress,
    deleteAddress,
    loadMails,
    loadMailsForAddress,
    deleteMail,
    loadUserSettings,
    selectAddress,
    selectMail,
    clearSelection,
    startAutoRefresh,
    stopAutoRefresh,
    stopBackgroundSync,
    silentRefreshMails,
    initializeStore,

    // Storage functions (for debugging)
    saveAddressesToStorage,
    loadAddressesFromStorage,
    saveAddressesToBackend,
    loadAddressesFromBackend,

    // Debug functions
    clearLocalStorage: () => {
      localStorage.removeItem(STORAGE_KEYS.ADDRESSES)
      localStorage.removeItem(STORAGE_KEYS.SELECTED_ADDRESS)
      addresses.value = []
      selectedAddress.value = null
      console.log('Local storage cleared for admin')
    },

    // 清理所有数据（用于退出登录）
    clearAllData: () => {
      // 清理内存中的数据
      addresses.value = []
      selectedAddress.value = null
      mails.value = []
      selectedMail.value = null
      newMailCounts.value = {}
      mailParseCache.clear()

      // 清理本地存储
      localStorage.removeItem(STORAGE_KEYS.ADDRESSES)
      localStorage.removeItem(STORAGE_KEYS.SELECTED_ADDRESS)
      localStorage.removeItem(STORAGE_KEYS.STORAGE_VERSION)

      // 清理所有地址相关的JWT
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('address_jwt_')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // 停止自动刷新
      stopAutoRefresh()
      stopBackgroundSync()
      unregisterBeforeUnloadSave()

      console.log('🧹 All email data cleared for logout')
    },

    debugStorage: () => {
      console.log('=== 📊 Storage Debug Info ===')
      console.log('🏠 Storage keys:', STORAGE_KEYS)
      console.log('📧 Addresses in memory:', addresses.value.length)
      console.log('📧 Addresses:', addresses.value.map(addr => addr.address))
      console.log('🎯 Selected address:', selectedAddress.value?.address)
      console.log('💾 LocalStorage addresses:', localStorage.getItem(STORAGE_KEYS.ADDRESSES))
      console.log('💾 LocalStorage selected:', localStorage.getItem(STORAGE_KEYS.SELECTED_ADDRESS))
      console.log('📊 Storage version:', localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION))

      // 扫描所有可能的邮箱相关存储
      console.log('🔍 All localStorage keys containing "email", "address", or "mail":')
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('email') || key.includes('address') || key.includes('mail'))) {
          console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`)
        }
      }
      console.log('========================')
    }
  }
})

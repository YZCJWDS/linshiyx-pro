import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NotificationMessage } from '@/types'

export const useUiStore = defineStore('ui', () => {
  // State
  const notifications = ref<NotificationMessage[]>([])
  const loading = ref(false)
  const sidebarCollapsed = ref(false)
  const theme = ref<'light' | 'dark'>('light')
  const useUTCDate = ref(false) // 是否使用UTC时间显示

  // 全屏详读弹窗开关
  const readerModalVisible = ref(false)

  // 沉浸式专注阅读模式（持久化用户偏好）
  const READER_FOCUS_KEY = 'linshiyx_reader_focus'
  const readerFocusMode = ref<boolean>(localStorage.getItem(READER_FOCUS_KEY) === '1')

  function openReaderModal() {
    readerModalVisible.value = true
  }

  function closeReaderModal() {
    readerModalVisible.value = false
  }

  function setReaderFocusMode(value: boolean) {
    readerFocusMode.value = value
    localStorage.setItem(READER_FOCUS_KEY, value ? '1' : '0')
  }

  function toggleReaderFocusMode() {
    setReaderFocusMode(!readerFocusMode.value)
  }

  // Notification actions
  function showNotification(notification: NotificationMessage) {
    notifications.value.push({
      ...notification,
      duration: notification.duration || 4000
    })
    
    // Auto remove notification after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(notification)
      }, notification.duration || 4000)
    }
  }

  function showSuccess(title: string, content?: string) {
    showNotification({
      type: 'success',
      title,
      content
    })
  }

  function showError(title: string, content?: string) {
    showNotification({
      type: 'error',
      title,
      content,
      duration: 6000 // Errors stay longer
    })
  }

  function showWarning(title: string, content?: string) {
    showNotification({
      type: 'warning',
      title,
      content
    })
  }

  function showInfo(title: string, content?: string) {
    showNotification({
      type: 'info',
      title,
      content
    })
  }

  function removeNotification(notification: NotificationMessage) {
    const index = notifications.value.indexOf(notification)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clearNotifications() {
    notifications.value = []
  }

  // UI state actions
  function setLoading(isLoading: boolean) {
    loading.value = isLoading
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  // Initialize theme from localStorage or system preference
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }

  // Save theme to localStorage when changed
  function saveTheme() {
    localStorage.setItem('theme', theme.value)
  }

  // UTC时间设置
  function setUseUTCDate(value: boolean) {
    useUTCDate.value = value
    localStorage.setItem('useUTCDate', JSON.stringify(value))
  }

  function initUTCDateSetting() {
    const saved = localStorage.getItem('useUTCDate')
    if (saved) {
      useUTCDate.value = JSON.parse(saved)
    }
  }

  return {
    // State
    notifications,
    loading,
    sidebarCollapsed,
    theme,
    useUTCDate,
    readerModalVisible,
    readerFocusMode,

    // Actions
    openReaderModal,
    closeReaderModal,
    setReaderFocusMode,
    toggleReaderFocusMode,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearNotifications,
    setLoading,
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    toggleTheme,
    initTheme,
    saveTheme,
    setUseUTCDate,
    initUTCDateSetting
  }
})

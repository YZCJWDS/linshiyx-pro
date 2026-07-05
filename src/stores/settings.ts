import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', () => {
  // 邮件显示设置
  const useIframeShowMail = ref(false) // 是否使用iframe显示HTML邮件
  const preferShowTextMail = ref(false) // 是否优先显示文本邮件
  const autoRefresh = ref(true) // 是否自动刷新
  const autoRefreshInterval = ref(30) // 自动刷新间隔（秒）

  // 邮件显示模式设置
  const mailDisplayMode = ref('auto') // 'auto' | 'light' | 'dark' | 'high-contrast'
  
  // 界面设置
  const mailboxSplitSize = ref(0.25) // 邮箱分栏大小
  const useSideMargin = ref(true) // 是否使用侧边距
  const useUTCDate = ref(false) // 是否使用UTC时间
  
  // 主题设置
  const isDark = ref(false) // 是否暗色主题
  
  // 加载设置
  function loadSettings() {
    try {
      const saved = localStorage.getItem('linshiyx_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        
        useIframeShowMail.value = settings.useIframeShowMail ?? false
        preferShowTextMail.value = settings.preferShowTextMail ?? false
        autoRefresh.value = settings.autoRefresh ?? true
        autoRefreshInterval.value = settings.autoRefreshInterval ?? 30
        mailboxSplitSize.value = settings.mailboxSplitSize ?? 0.25
        useSideMargin.value = settings.useSideMargin ?? true
        useUTCDate.value = settings.useUTCDate ?? false
        isDark.value = settings.isDark ?? false
        mailDisplayMode.value = settings.mailDisplayMode ?? 'auto'
        
        console.log('✅ Settings loaded from localStorage')
      }
    } catch (error) {
      console.warn('Failed to load settings:', error)
    }
  }
  
  // 保存设置
  function saveSettings() {
    try {
      const settings = {
        useIframeShowMail: useIframeShowMail.value,
        preferShowTextMail: preferShowTextMail.value,
        autoRefresh: autoRefresh.value,
        autoRefreshInterval: autoRefreshInterval.value,
        mailboxSplitSize: mailboxSplitSize.value,
        useSideMargin: useSideMargin.value,
        useUTCDate: useUTCDate.value,
        isDark: isDark.value,
        mailDisplayMode: mailDisplayMode.value
      }
      
      localStorage.setItem('linshiyx_settings', JSON.stringify(settings))
      console.log('✅ Settings saved to localStorage')
    } catch (error) {
      console.warn('Failed to save settings:', error)
    }
  }
  
  // 重置设置
  function resetSettings() {
    useIframeShowMail.value = false
    preferShowTextMail.value = false
    autoRefresh.value = true
    autoRefreshInterval.value = 30
    mailboxSplitSize.value = 0.25
    useSideMargin.value = true
    useUTCDate.value = false
    isDark.value = false
    mailDisplayMode.value = 'auto'
    
    saveSettings()
    console.log('✅ Settings reset to defaults')
  }
  
  // 切换iframe显示模式
  function toggleIframeMode() {
    useIframeShowMail.value = !useIframeShowMail.value
    saveSettings()
  }
  
  // 切换文本优先模式
  function toggleTextMode() {
    preferShowTextMail.value = !preferShowTextMail.value
    saveSettings()
  }
  
  // 切换自动刷新
  function toggleAutoRefresh() {
    autoRefresh.value = !autoRefresh.value
    saveSettings()
  }
  
  // 设置自动刷新间隔
  function setAutoRefreshInterval(seconds: number) {
    if (seconds >= 10 && seconds <= 300) {
      autoRefreshInterval.value = seconds
      saveSettings()
    }
  }
  
  // 设置分栏大小
  function setMailboxSplitSize(size: number) {
    if (size >= 0.1 && size <= 0.5) {
      mailboxSplitSize.value = size
      saveSettings()
    }
  }
  
  // 切换侧边距
  function toggleSideMargin() {
    useSideMargin.value = !useSideMargin.value
    saveSettings()
  }
  
  // 切换UTC时间
  function toggleUTCDate() {
    useUTCDate.value = !useUTCDate.value
    saveSettings()
  }
  
  // 切换主题
  function toggleTheme() {
    isDark.value = !isDark.value
    saveSettings()
  }

  // 设置邮件显示模式
  function setMailDisplayMode(mode: 'auto' | 'light' | 'dark' | 'high-contrast') {
    mailDisplayMode.value = mode
    saveSettings()
  }
  
  // 初始化
  loadSettings()
  
  return {
    // 状态
    useIframeShowMail,
    preferShowTextMail,
    autoRefresh,
    autoRefreshInterval,
    mailboxSplitSize,
    useSideMargin,
    useUTCDate,
    isDark,
    mailDisplayMode,
    
    // 方法
    loadSettings,
    saveSettings,
    resetSettings,
    toggleIframeMode,
    toggleTextMode,
    toggleAutoRefresh,
    setAutoRefreshInterval,
    setMailboxSplitSize,
    toggleSideMargin,
    toggleUTCDate,
    toggleTheme,
    setMailDisplayMode
  }
})

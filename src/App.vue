<template>
  <n-config-provider
    :theme="isDark ? darkTheme : null"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <AdminLogin v-if="!authStore.isAuthenticated" />
            <TempEmailApp v-else />
            <NotificationProvider />
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  NConfigProvider,
  NGlobalStyle,
  NLoadingBarProvider,
  NDialogProvider,
  NNotificationProvider,
  NMessageProvider,
  darkTheme,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides
} from 'naive-ui'
import TempEmailApp from '@/components/TempEmailApp.vue'
import AdminLogin from '@/components/AdminLogin.vue'
import NotificationProvider from '@/components/NotificationProvider.vue'
import { useUiStore, useAuthStore } from '@/stores'

const uiStore = useUiStore()
const authStore = useAuthStore()

const isDark = computed(() => uiStore.theme === 'dark')

const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: isDark.value ? '#7bd2f6' : '#3f9fd3',
    primaryColorHover: isDark.value ? '#9fe3ff' : '#5eb9de',
    primaryColorPressed: isDark.value ? '#4eb7e5' : '#2385b8',
    primaryColorSuppl: isDark.value ? 'rgba(123, 210, 246, 0.18)' : 'rgba(63, 159, 211, 0.14)',
    infoColor: isDark.value ? '#7bd2f6' : '#3f9fd3',
    infoColorHover: isDark.value ? '#9fe3ff' : '#5eb9de',
    infoColorPressed: isDark.value ? '#4eb7e5' : '#2385b8',
    successColor: isDark.value ? '#64d6c1' : '#38a89d',
    successColorHover: isDark.value ? '#7be6d1' : '#4db9ad',
    successColorPressed: isDark.value ? '#38bba6' : '#2c8f86',
    borderRadius: '8px',
    borderColor: isDark.value ? 'rgba(148, 178, 205, 0.18)' : 'rgba(116, 146, 174, 0.24)',
    dividerColor: isDark.value ? 'rgba(148, 178, 205, 0.16)' : 'rgba(116, 146, 174, 0.2)',
    bodyColor: isDark.value ? '#07111f' : '#eef6fb',
    cardColor: isDark.value ? '#101c2c' : '#ffffff',
    modalColor: isDark.value ? '#101c2c' : '#ffffff',
    popoverColor: isDark.value ? '#101c2c' : '#ffffff',
    textColorBase: isDark.value ? '#edf7ff' : '#172235'
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusLarge: '10px'
  },
  Input: {
    borderRadius: '10px',
    colorFocus: isDark.value ? 'rgba(16, 30, 48, 0.96)' : '#ffffff'
  },
  Card: {
    borderRadius: '14px'
  },
  Modal: {
    borderRadius: '18px'
  },
  Tag: {
    borderRadius: '4px'
  }
}))

onMounted(() => {
  uiStore.initTheme()
  authStore.initAuth()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100vh;
  overflow: hidden;
}

/* Custom scrollbar styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: rgba(148, 190, 225, 0.28);
}

[data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 190, 225, 0.42);
}

/* Responsive design utilities */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (max-width: 768px) {
  .container {
    padding: 0 8px;
  }
}

/* Animation utilities */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>

<template>
  <div class="temp-email-app">
    <!-- 背景图片层 -->
    <div
      class="app-background"
      :class="{
        'background-loaded': backgroundLoaded,
        'background-error': backgroundError
      }"
    ></div>

    <!-- 内容层 -->
    <div class="app-content">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="app-title">
            <n-icon size="24" class="title-icon">
              <MailIcon />
            </n-icon>
            临时邮箱系统
          </h1>
        </div>
        <div class="header-right">
          <n-button
            quaternary
            circle
            @click="uiStore.toggleTheme"
            :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
          >
            <template #icon>
              <n-icon>
                <SunIcon v-if="isDark" />
                <MoonIcon v-else />
              </n-icon>
            </template>
          </n-button>
          <n-button
            quaternary
            circle
            @click="refreshAll"
            :loading="isRefreshing"
            title="刷新全部"
          >
            <template #icon>
              <n-icon>
                <RefreshIcon />
              </n-icon>
            </template>
          </n-button>

          <n-button
            quaternary
            circle
            @click="openComposeModal"
            :title="emailStore.selectedAddress ? '使用当前邮箱发送邮件' : '请先选择发件邮箱'"
          >
            <template #icon>
              <n-icon>
                <SendIcon />
              </n-icon>
            </template>
          </n-button>

          <n-button
            quaternary
            circle
            @click="handleLogout"
            title="退出登录"
            type="error"
          >
            <template #icon>
              <n-icon>
                <LogOutIcon />
              </n-icon>
            </template>
          </n-button>

          <!-- 用户头像 -->
          <div class="user-avatar" title="点击查看完整头像" @click="showAvatarPreview = true">
            <img
              src="/image.jpg"
              alt="用户头像"
              class="avatar-image"
              @error="handleAvatarError"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content - Three Column Layout -->
    <main class="app-main">
      <div class="three-column-layout">
        <!-- Column 1: Email Manager -->
        <div class="column email-manager-column">
          <div class="column-header">
            <h2 class="column-title">邮箱地址</h2>
            <n-badge :value="emailStore.addresses.length" :max="99" type="info" />
          </div>
          <div class="column-content">
            <EmailManager />
          </div>
        </div>

        <!-- Column 2: Mail List -->
        <div class="column mail-list-column">
          <div class="column-header">
            <h2 class="column-title">
              {{ emailStore.selectedAddress ? '收件箱' : '选择邮箱地址' }}
            </h2>
            <n-badge
              v-if="emailStore.selectedAddress"
              :value="emailStore.selectedAddressMails.length"
              :max="99"
              type="success"
            />
          </div>
          <div class="column-content">
            <MailList />
          </div>
        </div>

        <!-- Column 3: Mail Detail -->
        <div class="column mail-detail-column">
          <div class="column-header">
            <h2 class="column-title">
              {{ emailStore.selectedMail ? '邮件内容' : '选择邮件' }}
            </h2>
          </div>
          <div class="column-content">
            <MailDetail />
          </div>
        </div>
      </div>

    </main>

    <!-- Global Loading Overlay -->
    <n-spin
      v-if="uiStore.loading"
      class="global-loading"
      size="large"
      description="Loading..."
    />
    </div> <!-- 关闭 app-content -->

    <!-- 头像预览弹窗 -->
    <n-modal
      v-model:show="showAvatarPreview"
      preset="card"
      title="用户头像"
      size="medium"
      :bordered="false"
      :segmented="false"
      class="avatar-preview-modal"
    >
      <div class="avatar-preview-container">
        <img
          src="/image.jpg"
          alt="用户头像完整预览"
          class="avatar-preview-image"
          @error="handleAvatarPreviewError"
        />
      </div>

      <template #footer>
        <div class="avatar-preview-footer">
          <n-text depth="3" style="font-size: 12px;">
            管理员头像
          </n-text>
          <n-button @click="showAvatarPreview = false" type="primary">
            关闭
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 发送邮件弹窗 -->
    <n-modal
      v-model:show="showComposeModal"
      preset="card"
      title="发送邮件"
      :bordered="false"
      :segmented="false"
      :mask-closable="false"
      :style="{ width: '760px', maxWidth: '94vw' }"
      class="compose-mail-modal"
    >
      <div class="compose-modal-subtitle">
        <n-text depth="3">
          {{ emailStore.selectedAddress?.address ? `发件邮箱：${emailStore.selectedAddress.address}` : '请先选择一个邮箱地址' }}
        </n-text>
      </div>

      <SendMailComposer
        v-if="showComposeModal"
        ref="sendMailComposerRef"
        :key="composeModalKey"
        :from-address="emailStore.selectedAddress"
        @sent="handleMailSent"
        @cancel="closeComposeModal"
      />

      <template #footer>
        <div class="compose-modal-footer">
          <n-button @click="closeComposeModal" :disabled="sendingMail">
            取消
          </n-button>
          <n-button
            type="primary"
            :loading="sendingMail"
            :disabled="!emailStore.selectedAddress?.address"
            @click="sendCurrentMail"
          >
            <template #icon>
              <n-icon>
                <SendIcon />
              </n-icon>
            </template>
            发送邮件
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  NIcon,
  NButton,
  NBadge,
  NSpin,
  NModal,
  NText,
  useMessage
} from 'naive-ui'
import {
  Mail as MailIcon,
  Sunny as SunIcon,
  Moon as MoonIcon,
  Refresh as RefreshIcon,
  LogOut as LogOutIcon,
  Send as SendIcon
} from '@vicons/ionicons5'
import { useEmailStore, useUiStore, useAuthStore } from '@/stores'
import { useKeyboard, commonShortcuts } from '@/composables/useKeyboard'
import EmailManager from './EmailManager.vue'
import MailList from './MailList.vue'
import MailDetail from './MailDetail.vue'
import SendMailComposer from './SendMailComposer.vue'

const emailStore = useEmailStore()
const uiStore = useUiStore()
const authStore = useAuthStore()
const message = useMessage()

// 背景图片状态
const backgroundLoaded = ref(false)
const backgroundError = ref(false)
const appBackgroundUrl = '/image/hero-bg.webp'

// 界面状态管理
const showAvatarPreview = ref(false)
const showComposeModal = ref(false)
const sendingMail = ref(false)
const composeModalKey = ref(0)
const sendMailComposerRef = ref<InstanceType<typeof SendMailComposer> | null>(null)

// 检查背景图片加载状态
function checkBackgroundImage() {
  const img = new Image()
  img.onload = () => {
    backgroundLoaded.value = true
    console.log('✅ Background image loaded successfully')

    // 检查图片尺寸是否适合作为背景
    const aspectRatio = img.width / img.height
    const screenAspectRatio = window.innerWidth / window.innerHeight

    if (Math.abs(aspectRatio - screenAspectRatio) > 0.5) {
      console.warn('⚠️ Background image aspect ratio may not be optimal for current screen')
      console.log(`Image: ${img.width}x${img.height} (${aspectRatio.toFixed(2)})`)
      console.log(`Screen: ${window.innerWidth}x${window.innerHeight} (${screenAspectRatio.toFixed(2)})`)
      console.log('💡 Consider providing additional images for better coverage')
    }
  }
  img.onerror = () => {
    backgroundError.value = true
    console.error(`❌ Failed to load background image: ${appBackgroundUrl}`)
    console.log('💡 Please ensure the background asset is in the public directory')
  }
  img.src = appBackgroundUrl
}

async function initializeApp() {
  try {
    // 检查背景图片
    checkBackgroundImage()

    // 初始化UI设置
    uiStore.initUTCDateSetting()

    // 首先初始化认证（可能会加载邮箱池）
    await authStore.initAuth()

    // 然后初始化邮箱存储（如果认证没有加载邮箱池）
    await emailStore.initializeStore()

    if (authStore.hasValidAuth) {
      await emailStore.loadAddresses()
      await emailStore.loadUserSettings()
      emailStore.startAutoRefresh(30000)
    }

    console.log('✅ App initialization completed')
  } catch (error) {
    console.error('❌ App initialization failed:', error)
  }
}

const isDark = computed(() => uiStore.theme === 'dark')
const isRefreshing = computed(() => 
  emailStore.loading.addresses || emailStore.loading.mails
)

async function refreshAll() {
  try {
    // 只刷新邮件，不重新加载地址（避免清空本地存储的地址）
    if (emailStore.selectedAddress) {
      await emailStore.loadMails(emailStore.selectedAddress.address)
      message.success('邮件刷新成功')
    } else {
      message.info('请先选择一个邮箱地址')
    }
  } catch (error) {
    message.error('刷新失败')
  }
}

async function handleLogout() {
  try {
    // 调用认证store的logout方法
    authStore.logout()

    // 清理邮件store的数据
    emailStore.clearAllData()

    message.success('已退出登录')
    console.log('🔓 User logged out successfully')
  } catch (error) {
    console.error('Logout error:', error)
    message.error('退出登录失败')
  }
}

function openComposeModal() {
  if (!emailStore.selectedAddress?.address) {
    message.warning('请先选择一个发件邮箱')
    return
  }

  composeModalKey.value += 1
  showComposeModal.value = true
  console.log('📧 Opening compose modal from:', emailStore.selectedAddress.address)
}

function closeComposeModal() {
  if (sendingMail.value) return
  showComposeModal.value = false
}

async function sendCurrentMail() {
  if (!emailStore.selectedAddress?.address) {
    message.warning('请先选择一个发件邮箱')
    return
  }

  if (!sendMailComposerRef.value) {
    message.error('邮件编辑器未就绪')
    return
  }

  sendingMail.value = true
  try {
    await sendMailComposerRef.value.sendMail()
  } finally {
    sendingMail.value = false
  }
}

function handleMailSent() {
  showComposeModal.value = false
  message.success('邮件发送成功')
}

// 头像加载错误处理
function handleAvatarError(event: Event) {
  const img = event.target as HTMLImageElement
  // 设置默认头像或隐藏
  img.style.display = 'none'
  console.log('⚠️ Avatar image failed to load')
}

// 头像预览错误处理
function handleAvatarPreviewError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzk5OTk5OSIgZm9udC1zaXplPSIxNiI+5aS05YOP5Yqg6L295aSx6LSlPC90ZXh0Pgo8L3N2Zz4K'
  console.log('⚠️ Avatar preview image failed to load')
}

// Setup keyboard shortcuts
useKeyboard([
  {
    ...commonShortcuts.refresh,
    handler: () => refreshAll()
  },
  {
    ...commonShortcuts.refreshCtrl,
    handler: () => refreshAll()
  },
  {
    key: 't',
    ctrl: true,
    handler: () => uiStore.toggleTheme(),
    description: '切换主题 (Ctrl+T)'
  }
])

onMounted(initializeApp)

onUnmounted(() => {
  emailStore.stopAutoRefresh()
  emailStore.stopBackgroundSync()
})
</script>

<style scoped>
.temp-email-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  color: var(--n-text-color);
  --app-panel: rgba(250, 253, 252, 0.72);
  --app-panel-strong: rgba(255, 255, 255, 0.86);
  --app-panel-soft: rgba(244, 249, 248, 0.78);
  --app-workspace: rgba(232, 242, 242, 0.62);
  --app-column: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(244, 250, 249, 0.68));
  --app-column-detail: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(246, 251, 250, 0.74));
  --app-detail: rgba(255, 255, 255, 0.78);
  --app-border: rgba(88, 112, 130, 0.2);
  --app-border-strong: rgba(255, 255, 255, 0.58);
  --app-separator: rgba(88, 112, 130, 0.18);
  --app-shadow: var(--shadow-floating);
  --app-shadow-soft: var(--shadow-soft);
  --app-column-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 1px 2px rgba(33, 55, 76, 0.08), 0 16px 38px rgba(33, 55, 76, 0.11);
  --app-accent-soft: rgba(56, 194, 177, 0.13);
}

[data-theme="dark"] .temp-email-app {
  --app-panel: rgba(13, 23, 32, 0.74);
  --app-panel-strong: rgba(17, 30, 42, 0.9);
  --app-panel-soft: rgba(10, 18, 28, 0.82);
  --app-workspace: rgba(4, 8, 13, 0.78);
  --app-column: linear-gradient(180deg, rgba(18, 31, 43, 0.94), rgba(9, 17, 27, 0.9));
  --app-column-detail: linear-gradient(180deg, rgba(20, 33, 43, 0.98), rgba(10, 17, 27, 0.94));
  --app-detail: rgba(14, 24, 35, 0.92);
  --app-border: rgba(172, 202, 220, 0.16);
  --app-border-strong: rgba(172, 202, 220, 0.22);
  --app-separator: rgba(150, 177, 196, 0.14);
  --app-shadow: var(--shadow-floating);
  --app-shadow-soft: var(--shadow-soft);
  --app-column-shadow: 0 1px 0 rgba(255, 255, 255, 0.07) inset, 0 1px 2px rgba(0, 0, 0, 0.34), 0 18px 44px rgba(0, 0, 0, 0.34);
  --app-accent-soft: rgba(100, 214, 193, 0.14);
}

/* 背景图片层 - 参考VSCode背景插件方法 */
.app-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/image/hero-bg.webp');
  background-size: cover;
  background-position: center right;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: -2;
  transform: scale(1.03); /* 轻微缩放避免边缘 */
  filter: saturate(0.94) contrast(1.02) brightness(1.02);
}

/* 背景遮罩层 - 提供更好的可读性 */
.app-background::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(62% 52% at 18% 6%, rgba(255, 255, 255, 0.5), transparent 66%),
    radial-gradient(48% 46% at 88% 20%, rgba(56, 194, 177, 0.16), transparent 68%),
    radial-gradient(70% 68% at 50% 106%, rgba(40, 72, 96, 0.16), transparent 72%),
    linear-gradient(
      135deg,
      rgba(247, 250, 249, 0.92) 0%,
      rgba(231, 240, 241, 0.78) 36%,
      rgba(219, 233, 236, 0.58) 66%,
      rgba(246, 248, 246, 0.86) 100%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.28) 0%,
      rgba(180, 207, 205, 0.16) 100%
    );
  backdrop-filter: blur(2px);
  z-index: -1;
}

/* 内容层 */
.app-content {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  z-index: 1;
}

.app-content::before,
.app-content::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.app-content::before {
  background:
    radial-gradient(54% 38% at 24% 0%, rgba(255, 255, 255, 0.44), transparent 64%),
    radial-gradient(54% 50% at 82% 18%, rgba(56, 194, 177, 0.12), transparent 70%),
    radial-gradient(60% 52% at 8% 94%, rgba(63, 159, 211, 0.12), transparent 72%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), transparent 44%);
  opacity: 0.9;
  z-index: 0;
}

.app-content::after {
  background-image:
    radial-gradient(100% 72% at 50% 0%, transparent 46%, rgba(38, 58, 76, 0.08) 100%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E");
  background-size: auto, 160px 160px;
  background-position: center;
  opacity: 0.26;
  z-index: 0;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.34));
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.34));
}

.app-header,
.app-main,
.global-loading {
  position: relative;
  z-index: 1;
}

/* 深色模式下的背景调整 */
[data-theme="dark"] .app-background::after {
  background:
    radial-gradient(56% 44% at 22% 2%, rgba(123, 210, 246, 0.15), transparent 64%),
    radial-gradient(46% 42% at 88% 22%, rgba(100, 214, 193, 0.13), transparent 68%),
    radial-gradient(86% 72% at 50% 108%, rgba(0, 0, 0, 0.44), transparent 72%),
    linear-gradient(
      135deg,
      rgba(4, 7, 11, 0.9) 0%,
      rgba(7, 13, 20, 0.84) 38%,
      rgba(9, 17, 24, 0.72) 66%,
      rgba(3, 6, 10, 0.9) 100%
    ),
    linear-gradient(180deg, rgba(33, 79, 75, 0.1), rgba(0, 0, 0, 0.12));
  backdrop-filter: blur(2.5px);
}

/* 背景图片加载状态 */
.app-background.background-loaded {
  opacity: 1;
  transition: opacity 0.5s ease-in-out;
}

.app-background:not(.background-loaded) {
  opacity: 0.3;
}

.app-background.background-error {
  background: linear-gradient(
    135deg,
    #dbeaf5 0%,
    #8fbdda 100%
  );
  opacity: 0.8;
}

.app-background.background-error::after {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.6) 25%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.6) 75%,
    rgba(255, 255, 255, 0.8) 100%
  );
}

.app-header {
  flex-shrink: 0;
  height: 76px;
  padding: 12px 18px 0;
  border-bottom: 0;
  background: transparent;
  box-shadow: none;
  z-index: 100;
}

[data-theme="dark"] .app-background {
  filter: saturate(0.9) contrast(1.08) brightness(0.58);
}

[data-theme="dark"] .app-content::before {
  background:
    radial-gradient(58% 42% at 18% 0%, rgba(123, 210, 246, 0.16), transparent 64%),
    radial-gradient(50% 44% at 86% 18%, rgba(100, 214, 193, 0.12), transparent 68%),
    radial-gradient(80% 72% at 50% 112%, rgba(0, 0, 0, 0.32), transparent 66%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 46%);
  opacity: 1;
}

[data-theme="dark"] .app-content::after {
  background-image:
    radial-gradient(100% 78% at 50% 0%, transparent 44%, rgba(0, 0, 0, 0.28) 100%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E");
  background-size: auto, 160px 160px;
  opacity: 0.3;
}

/* 深色模式下的头部样式 */
[data-theme="dark"] .app-header {
  background: transparent;
  border-bottom: 0;
  box-shadow: none;
}

.header-content {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 18px;
  max-width: 1600px;
  margin: 0 auto;
  border: 1px solid var(--app-border-strong);
  border-radius: var(--radius-panel);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 70%),
    var(--app-panel-strong);
  backdrop-filter: blur(22px) saturate(1.08);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.62) inset,
    var(--app-shadow-soft);
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--n-text-color);
  margin: 0;
  letter-spacing: 0;
}

.title-icon {
  color: var(--n-primary-color);
}

.app-header :deep(.n-button) {
  color: var(--n-text-color-2);
}

.app-header :deep(.n-button:hover) {
  background: var(--app-accent-soft);
  color: var(--n-primary-color);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 用户头像样式 */
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.46);
  background: var(--app-panel-soft);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: pointer;
  margin-left: 4px;
}

.user-avatar:hover {
  border-color: var(--n-primary-color);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.3s ease;
}

.user-avatar:hover .avatar-image {
  transform: scale(1.1);
}

/* 深色模式下的头像样式 */
[data-theme="dark"] .user-avatar {
  border-color: rgba(148, 190, 225, 0.26);
  background: rgba(8, 19, 34, 0.72);
}

[data-theme="dark"] .user-avatar:hover {
  border-color: var(--n-primary-color);
}

/* 头像预览弹窗样式 */
.avatar-preview-modal {
  max-width: 500px;
}

.avatar-preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: var(--n-card-color);
  border-radius: 8px;
}

.avatar-preview-image {
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.avatar-preview-image:hover {
  transform: scale(1.02);
}

.avatar-preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
}

.compose-modal-subtitle {
  margin: -4px 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-panel-soft);
}

.compose-mail-modal :deep(.n-card) {
  background:
    linear-gradient(145deg, rgba(248, 252, 255, 0.96), rgba(233, 243, 251, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 28px 80px rgba(48, 77, 108, 0.22);
  backdrop-filter: blur(20px) saturate(1.1);
}

.compose-mail-modal :deep(.send-mail-composer) {
  height: min(68vh, 620px);
}

.compose-mail-modal :deep(.composer-content) {
  padding: 6px 2px 0;
}

.compose-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

[data-theme="dark"] .compose-mail-modal :deep(.n-card) {
  background:
    linear-gradient(145deg, rgba(15, 31, 52, 0.96), rgba(9, 22, 39, 0.94));
  border: 1px solid rgba(148, 190, 225, 0.22);
  box-shadow: 0 32px 86px rgba(0, 0, 0, 0.42);
}

/* 深色模式下的预览弹窗 */
[data-theme="dark"] .avatar-preview-image {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* 移动端预览弹窗优化 */
@media (max-width: 768px) {
  .avatar-preview-modal {
    max-width: 90vw;
  }

  .avatar-preview-container {
    padding: 16px;
  }

  .avatar-preview-image {
    max-height: 300px;
  }
}

.app-main {
  flex: 1;
  overflow: hidden;
  padding: 12px 18px 20px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.three-column-layout {
  display: grid;
  grid-template-columns: 300px minmax(340px, 400px) minmax(460px, 1fr);
  gap: 10px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  padding: 10px;
  border: 1px solid var(--app-border-strong);
  border-radius: 24px;
  background:
    radial-gradient(92% 58% at 50% -8%, rgba(255, 255, 255, 0.62), transparent 68%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(224, 238, 239, 0.44) 48%, rgba(204, 222, 226, 0.32)),
    var(--app-workspace);
  backdrop-filter: blur(26px) saturate(1.1);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 22px 48px rgba(33, 55, 76, 0.14),
    0 60px 120px rgba(33, 55, 76, 0.16),
    var(--app-shadow),
    inset 0 -1px 0 rgba(88, 112, 130, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.24);
}

.three-column-layout::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 20%),
    radial-gradient(82% 50% at 50% 0%, rgba(255, 255, 255, 0.18), transparent 70%),
    radial-gradient(96% 58% at 50% 108%, rgba(45, 72, 96, 0.12), transparent 72%);
  opacity: 0.78;
  z-index: 0;
}

[data-theme="dark"] .three-column-layout {
  background:
    radial-gradient(92% 58% at 50% -8%, rgba(74, 126, 150, 0.16), transparent 68%),
    linear-gradient(145deg, rgba(17, 29, 40, 0.76), rgba(6, 11, 18, 0.78) 48%, rgba(2, 5, 9, 0.86)),
    var(--app-workspace);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08) inset,
    0 30px 70px rgba(0, 0, 0, 0.52),
    0 78px 150px rgba(0, 0, 0, 0.36),
    var(--app-shadow),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

[data-theme="dark"] .three-column-layout::after {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 26%),
    radial-gradient(88% 50% at 52% 0%, rgba(123, 210, 246, 0.09), transparent 72%),
    radial-gradient(98% 58% at 50% 108%, rgba(0, 0, 0, 0.22), transparent 72%);
  opacity: 0.88;
}

.column {
  display: flex;
  flex-direction: column;
  background: var(--app-column);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  box-shadow: var(--app-column-shadow);
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.column:first-child {
  border-left: 0;
}

/* 列的内部光效 */
.column::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), transparent 24%),
    radial-gradient(80% 36% at 50% 0%, rgba(255, 255, 255, 0.18), transparent 72%);
  opacity: 0.8;
  z-index: 0;
}

.column:first-child::before {
  content: '';
}

/* 深色模式下的列样式 */
[data-theme="dark"] .column {
  background: var(--app-column);
  box-shadow: var(--app-column-shadow);
}

[data-theme="dark"] .column::before {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 24%),
    radial-gradient(88% 38% at 50% 0%, rgba(123, 210, 246, 0.08), transparent 74%);
}

.column-header {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  min-height: 52px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--app-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.26), transparent 84%),
    rgba(255, 255, 255, 0.38);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

[data-theme="dark"] .column-header {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent 84%),
    rgba(13, 24, 36, 0.64);
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0;
}

.column-content {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.email-manager-column {
  min-width: 0;
}

.mail-list-column {
  min-width: 0;
}

.mail-detail-column {
  min-width: 0;
  background: var(--app-column-detail);
  box-shadow:
    var(--app-column-shadow),
    0 0 0 1px rgba(63, 159, 211, 0.06);
}

.mail-detail-column .column-header {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent 84%),
    rgba(255, 255, 255, 0.54);
}

[data-theme="dark"] .mail-detail-column .column-header {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.055), transparent 84%),
    rgba(15, 27, 40, 0.72);
}

.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(241, 248, 253, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-theme="dark"] .global-loading {
  background: rgba(7, 17, 31, 0.82);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .three-column-layout {
    grid-template-columns: 280px minmax(310px, 360px) minmax(420px, 1fr);
  }

  .app-main {
    padding: 10px 14px 14px;
  }
}

@media (max-width: 1024px) {
  .three-column-layout {
    grid-template-columns: 240px minmax(280px, 320px) minmax(360px, 1fr);
  }

  .column {
    min-height: 0;
  }
}

@media (max-width: 768px) {
  .app-header {
    height: 68px;
    padding: 8px 10px 0;
  }

  .header-content {
    height: 50px;
    padding: 0 10px 0 12px;
  }

  .app-title {
    font-size: 16px;
  }

  /* 移动端头像样式 */
  .user-avatar {
    width: 32px;
    height: 32px;
    margin-left: 2px;
  }

  .header-right {
    gap: 6px;
  }

  .app-main {
    overflow-y: auto;
    padding: 8px 10px 12px;
  }

  .three-column-layout {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    height: auto;
    min-height: 100%;
  }

  .column {
    border-left: 1px solid var(--app-border);
    border-top: 1px solid var(--app-border);
  }

  .column:first-child {
    border-top: 0;
  }

  .column-header {
    min-height: 46px;
    padding: 10px 12px;
  }

  .column-title {
    font-size: 14px;
  }
}

/* 超小屏幕 - 使用标签页模式 */
@media (max-width: 640px) {
  .three-column-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }

  .column {
    min-height: 260px;
  }

  .mail-detail-column {
    min-height: 520px;
  }
}
</style>

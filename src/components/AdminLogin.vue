<template>
  <div class="admin-login">
    <!-- 背景图片层 -->
    <div class="background-layer">
      <img
        v-if="loginBackgroundSrc"
        :src="loginBackgroundSrc"
        alt=""
        class="bg-image bg-left"
        :class="{ 'bg-image--loaded': loginBackgroundLoaded }"
        decoding="async"
        fetchpriority="high"
        @load="handleLoginBackgroundLoad"
        @error="handleLoginBackgroundError"
      />
      <div class="bg-overlay"></div>
      <CosmicBackground class="login-cosmic-effects" variant="login" :density="0.82" />
    </div>

    <n-button
      class="theme-toggle"
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

    <!-- 登录内容层 -->
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-crest" aria-hidden="true">
            <img
              v-if="!crestLoadFailed"
              src="/image/brand-crest.png?v=20260710-resilient"
              alt=""
              class="login-crest-image"
              @error="crestLoadFailed = true"
            />
            <n-icon v-else class="login-crest-fallback" size="46">
              <MailIcon />
            </n-icon>
          </div>
          <h1 class="login-title">域名邮箱管理系统</h1>
          <p class="login-subtitle">请输入管理员密码进入邮箱工作台</p>
        </div>

        <n-form
          ref="formRef"
          class="login-form"
          :model="form"
          :rules="rules"
          size="large"
          @submit.prevent="handleLogin"
        >
          <n-form-item path="password">
            <n-input
              v-model:value="form.password"
              class="password-input"
              type="password"
              placeholder="管理员密码"
              show-password-on="click"
              :loading="loading"
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <n-icon>
                  <KeyIcon />
                </n-icon>
              </template>
            </n-input>
          </n-form-item>

          <n-form-item>
            <n-button
              class="login-button"
              type="primary"
              block
              size="large"
              :loading="loading"
              @click="handleLogin"
            >
              登录
            </n-button>
          </n-form-item>
        </n-form>

        <div class="login-footer">
          <n-text depth="3" size="small">
            请联系管理员获取访问密码
          </n-text>
          <div class="login-version" aria-label="应用版本信息">
            <span>v{{ appVersion }}</span>
            <span aria-hidden="true">·</span>
            <time :datetime="appUpdatedAt">更新于 {{ appUpdatedAt }}</time>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NIcon,
  NText,
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'
import {
  Key as KeyIcon,
  MailOutline as MailIcon,
  Sunny as SunIcon,
  Moon as MoonIcon
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores'
import CosmicBackground from './CosmicBackground.vue'
import loginArtworkUrl from '../../image/2plus.png?url'

const authStore = useAuthStore()
const uiStore = useUiStore()
const message = useMessage()
const isDark = computed(() => uiStore.theme === 'dark')
const loginBackgroundSrc = ref(loginArtworkUrl)
const loginBackgroundLoaded = ref(false)
const loginBackgroundAttempt = ref(0)
const crestLoadFailed = ref(false)
const appVersion = '1.2.0'
const appUpdatedAt = '2026-07-19'

function handleLoginBackgroundLoad() {
  loginBackgroundLoaded.value = true
}

function handleLoginBackgroundError() {
  loginBackgroundLoaded.value = false
  loginBackgroundAttempt.value += 1

  if (loginBackgroundAttempt.value === 1) {
    loginBackgroundSrc.value = `${loginArtworkUrl}?retry=20260710-resilient`
  } else if (loginBackgroundAttempt.value === 2) {
    loginBackgroundSrc.value = '/image/login-hero.jpg?v=20260710-resilient'
  } else {
    loginBackgroundSrc.value = ''
  }
}

// Form state
const formRef = ref<FormInst | null>(null)
const form = reactive({
  password: ''
})

const loading = ref(false)

// Form validation rules
const rules: FormRules = {
  password: [
    { required: true, message: '请输入管理员密码', trigger: 'blur' }
  ]
}

// Handle login
async function handleLogin() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    console.log('Attempting login with password:', form.password.substring(0, 3) + '***')

    const success = await authStore.login(form.password)
    if (success) {
      message.success('登录成功')
    } else {
      message.error('登录失败，请检查密码')
      form.password = ''
    }
  } catch (error) {
    console.error('Login error:', error)

    // 根据错误类型显示不同的错误信息
    if (error instanceof Error) {
      if (error.message.includes('管理员密码错误')) {
        message.error('管理员密码错误，请重新输入')
      } else if (error.message.includes('验证失败')) {
        message.error('服务器验证失败，请稍后重试')
      } else {
        message.error(error.message || '登录失败，请重试')
      }
    } else {
      message.error('登录失败，请重试')
    }

    // 清空密码输入框
    form.password = ''
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  overflow: hidden;
  padding: clamp(20px, 5vw, 72px);
  background: #eaf3fb;
  --login-text: #172235;
  --login-muted: rgba(39, 57, 82, 0.72);
  --login-accent: #4f8fc7;
}

/* 背景图片层 */
.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  display: block;
  object-fit: cover;
  object-position: center;
  filter: saturate(0.98) contrast(0.98);
  opacity: 0;
  transform: scale(1.01);
  pointer-events: none;
  transition: opacity 0.35s ease, filter 0.3s ease;
}

.bg-image--loaded {
  opacity: 1;
}

.bg-image:hover {
  filter: saturate(1.02) contrast(1);
}

.bg-left {
  object-position: center right;
}

/* 渐变遮罩层 */
.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background:
    linear-gradient(
      90deg,
      rgba(235, 244, 251, 0.82) 0%,
      rgba(235, 244, 251, 0.58) 34%,
      rgba(235, 244, 251, 0.2) 62%,
      rgba(235, 244, 251, 0.04) 100%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(216, 231, 243, 0.14) 100%
    );
}

.login-cosmic-effects {
  --cosmic-z-index: 3;
  --cosmic-opacity: 0.34;
}

.login-container {
  width: 100%;
  max-width: 432px;
  margin-left: clamp(0px, 4vw, 72px);
  position: relative;
  z-index: 10;
}

.theme-toggle {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 12;
  width: 40px;
  height: 40px;
  color: var(--login-text);
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.56);
  box-shadow: 0 12px 28px rgba(48, 77, 108, 0.14);
  backdrop-filter: blur(18px) saturate(1.12);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.theme-toggle:hover {
  transform: translateY(-1px);
  color: var(--login-accent);
  background: rgba(255, 255, 255, 0.66);
  border-color: rgba(79, 143, 199, 0.32);
  box-shadow: 0 16px 34px rgba(48, 77, 108, 0.18);
}

.login-card {
  position: relative;
  overflow: hidden;
  color: var(--login-text);
  background:
    linear-gradient(145deg, rgba(247, 251, 255, 0.84), rgba(226, 239, 250, 0.66));
  border-radius: 8px;
  padding: 40px 36px 34px;
  box-shadow:
    0 26px 70px rgba(48, 77, 108, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 0 0 1px rgba(255, 255, 255, 0.46);
  backdrop-filter: blur(20px) saturate(1.12);
  border: 1px solid rgba(255, 255, 255, 0.62);
  transition: all 0.3s ease;
}

.login-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0) 48%);
  pointer-events: none;
}

.login-card:hover {
  transform: translateY(-1px);
  box-shadow:
    0 30px 78px rgba(48, 77, 108, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 0 0 1px rgba(255, 255, 255, 0.58);
}

.login-header {
  position: relative;
  text-align: left;
  margin-bottom: 30px;
}

.login-crest {
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: rgba(87, 148, 201, 0.13);
  border: 1px solid rgba(87, 148, 201, 0.2);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 12px 28px rgba(55, 123, 184, 0.12);
}

.login-crest-image {
  width: 76px;
  height: 76px;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgba(42, 96, 143, 0.16));
  transition: transform 0.24s ease;
}

.login-crest-fallback {
  color: var(--login-accent);
}

.login-card:hover .login-crest-image {
  transform: translateY(-2px) scale(1.02);
}

.login-title {
  font-size: 25px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--login-text);
  margin: 0 0 8px 0;
  text-align: left;
  letter-spacing: 0;
}

.login-subtitle {
  color: var(--login-muted);
  margin: 0;
  font-size: 14px;
}

.login-form {
  position: relative;
}

.login-footer {
  position: relative;
  text-align: center;
  margin-top: 22px;
}

.login-footer :deep(.n-text) {
  color: rgba(39, 57, 82, 0.6);
}

.login-version {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 7px;
  color: rgba(39, 57, 82, 0.42);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1.4;
  user-select: none;
}

.password-input {
  --n-color: rgba(255, 255, 255, 0.58) !important;
  --n-color-focus: rgba(255, 255, 255, 0.86) !important;
  --n-color-disabled: rgba(255, 255, 255, 0.46) !important;
  --n-border: 1px solid rgba(116, 146, 174, 0.34) !important;
  --n-border-hover: 1px solid rgba(79, 143, 199, 0.68) !important;
  --n-border-focus: 1px solid rgba(79, 143, 199, 0.82) !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(79, 143, 199, 0.16) !important;
  --n-text-color: var(--login-text) !important;
  --n-placeholder-color: rgba(39, 57, 82, 0.5) !important;
  --n-icon-color: rgba(39, 57, 82, 0.52) !important;
  --n-icon-color-hover: var(--login-accent) !important;
  --n-icon-color-focus: var(--login-accent) !important;
  --n-caret-color: var(--login-accent) !important;
}

.login-button {
  height: 50px;
  margin-top: 8px;
  color: #ffffff !important;
  background: linear-gradient(135deg, #4f8fc7 0%, #68b6ce 100%) !important;
  border-radius: 6px;
  box-shadow: 0 14px 28px rgba(55, 123, 184, 0.22);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.login-button:hover {
  filter: brightness(1.04);
  transform: translateY(-1px);
  box-shadow: 0 18px 34px rgba(55, 123, 184, 0.28);
}

.login-button :deep(.n-button__border),
.login-button :deep(.n-button__state-border) {
  border: 0 !important;
  box-shadow: none !important;
}

/* Dark mode adjustments */
[data-theme="dark"] .admin-login {
  background: #07111f;
  --login-text: #edf7ff;
  --login-muted: rgba(207, 225, 240, 0.72);
  --login-accent: #7cc6f0;
}

[data-theme="dark"] .bg-image {
  filter: brightness(0.82) saturate(0.98) contrast(1.02);
}

[data-theme="dark"] .bg-image:hover {
  filter: brightness(0.86) saturate(1) contrast(1.04);
}

[data-theme="dark"] .bg-overlay {
  background:
    linear-gradient(
      90deg,
      rgba(7, 17, 31, 0.72) 0%,
      rgba(7, 17, 31, 0.46) 34%,
      rgba(7, 17, 31, 0.16) 64%,
      rgba(7, 17, 31, 0.04) 100%
    ),
    linear-gradient(
      180deg,
      rgba(8, 20, 38, 0.12) 0%,
      rgba(4, 10, 20, 0.36) 100%
    );
}

[data-theme="dark"] .login-cosmic-effects {
  --cosmic-opacity: 0.28;
}

[data-theme="dark"] .login-card {
  background:
    linear-gradient(145deg, rgba(17, 31, 50, 0.82), rgba(9, 22, 39, 0.68));
  border: 1px solid rgba(146, 201, 238, 0.22);
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 0 0 1px rgba(114, 184, 232, 0.08);
}

[data-theme="dark"] .login-card::before {
  background: linear-gradient(180deg, rgba(124, 198, 240, 0.12), rgba(124, 198, 240, 0) 48%);
}

[data-theme="dark"] .login-card:hover {
  box-shadow:
    0 34px 88px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 0 0 1px rgba(114, 184, 232, 0.16);
}

[data-theme="dark"] .login-crest {
  background: rgba(124, 198, 240, 0.12);
  border-color: rgba(124, 198, 240, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 10px 24px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .login-crest-image {
  filter: drop-shadow(0 8px 14px rgba(90, 174, 224, 0.2));
}

@media (prefers-reduced-motion: reduce) {
  .login-crest-image {
    transition: none;
  }

  .login-card:hover .login-crest-image {
    transform: none;
  }
}

[data-theme="dark"] .login-title {
  color: var(--login-text);
}

[data-theme="dark"] .login-subtitle,
[data-theme="dark"] .login-footer :deep(.n-text) {
  color: var(--login-muted);
}

[data-theme="dark"] .login-version {
  color: rgba(207, 225, 240, 0.4);
}

[data-theme="dark"] .password-input {
  --n-color: rgba(9, 22, 39, 0.66) !important;
  --n-color-focus: rgba(14, 30, 50, 0.9) !important;
  --n-color-disabled: rgba(9, 22, 39, 0.48) !important;
  --n-border: 1px solid rgba(146, 201, 238, 0.2) !important;
  --n-border-hover: 1px solid rgba(124, 198, 240, 0.56) !important;
  --n-border-focus: 1px solid rgba(124, 198, 240, 0.76) !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 198, 240, 0.16) !important;
  --n-text-color: var(--login-text) !important;
  --n-placeholder-color: rgba(207, 225, 240, 0.46) !important;
  --n-icon-color: rgba(207, 225, 240, 0.5) !important;
  --n-icon-color-hover: var(--login-accent) !important;
  --n-icon-color-focus: var(--login-accent) !important;
  --n-caret-color: var(--login-accent) !important;
}

[data-theme="dark"] .login-button {
  background: linear-gradient(135deg, #579bd4 0%, #66d1d1 100%) !important;
  box-shadow: 0 16px 34px rgba(35, 124, 188, 0.26);
}

[data-theme="dark"] .login-button:hover {
  box-shadow: 0 20px 40px rgba(35, 124, 188, 0.34);
}

[data-theme="dark"] .theme-toggle {
  color: var(--login-text);
  background: rgba(12, 26, 45, 0.62);
  border-color: rgba(146, 201, 238, 0.22);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .theme-toggle:hover {
  color: var(--login-accent);
  background: rgba(17, 31, 50, 0.78);
  border-color: rgba(124, 198, 240, 0.34);
  box-shadow: 0 20px 42px rgba(0, 0, 0, 0.36);
}

/* Responsive */
@media (max-width: 480px) {
  .admin-login {
    justify-content: center;
    padding: 16px;
  }

  .bg-left {
    object-position: 66% center;
  }

  .bg-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(235, 244, 251, 0.58) 0%,
        rgba(235, 244, 251, 0.38) 45%,
        rgba(235, 244, 251, 0.82) 100%
      );
  }

  [data-theme="dark"] .bg-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(7, 17, 31, 0.4) 0%,
        rgba(7, 17, 31, 0.52) 45%,
        rgba(7, 17, 31, 0.86) 100%
      );
  }

  .login-container {
    margin-left: 0;
  }

  .theme-toggle {
    top: 16px;
    right: 16px;
  }
  
  .login-card {
    padding: 32px 24px 28px;
  }
  
  .login-title {
    font-size: 18px;
    line-height: 1.3;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-card {
  animation: fadeInUp 0.8s ease-out;
}

</style>

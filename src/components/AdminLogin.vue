<template>
  <div class="admin-login">
    <!-- 背景图片层 -->
    <div class="background-layer">
      <div class="bg-image bg-left"></div>
      <div class="bg-image bg-right"></div>
      <div class="bg-overlay"></div>
    </div>

    <canvas
      ref="loginParticleCanvas"
      class="login-particle-layer"
      aria-hidden="true"
      data-frost-particles
    ></canvas>

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
          <n-icon size="48" class="login-icon">
            <LockIcon />
          </n-icon>
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
  LockClosed as LockIcon,
  Key as KeyIcon,
  Sunny as SunIcon,
  Moon as MoonIcon
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores'
import { useFrostParticles } from '@/composables/useFrostParticles'

const authStore = useAuthStore()
const uiStore = useUiStore()
const message = useMessage()
const isDark = computed(() => uiStore.theme === 'dark')
const loginParticleCanvas = ref<HTMLCanvasElement | null>(null)

useFrostParticles(loginParticleCanvas, isDark)

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

.login-particle-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  mix-blend-mode: screen;
  transition: opacity 0.35s ease;
  contain: strict;
  -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.94));
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.94));
}

[data-theme="dark"] .login-particle-layer {
  opacity: 0.72;
}

.login-particle-layer[hidden] {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .login-particle-layer {
    display: none;
  }
}

.bg-image {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: saturate(0.98) contrast(0.98);
  opacity: 1;
  transform: scale(1.01);
  transition: all 0.3s ease;
}

.bg-image:hover {
  filter: saturate(1.02) contrast(1);
}

.bg-left {
  left: 0;
  background-image: url('/image/login-hero.jpg');
  background-position: center right;
}

.bg-right {
  display: none;
}

/* 渐变遮罩层 */
.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(
      90deg,
      rgba(235, 244, 251, 0.9) 0%,
      rgba(235, 244, 251, 0.66) 34%,
      rgba(235, 244, 251, 0.26) 62%,
      rgba(235, 244, 251, 0.08) 100%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(216, 231, 243, 0.14) 100%
    );
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

.login-icon {
  color: var(--login-accent);
  margin-bottom: 16px;
  background: rgba(87, 148, 201, 0.13);
  border: 1px solid rgba(87, 148, 201, 0.2);
  border-radius: 8px;
  padding: 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
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
  filter: brightness(0.66) saturate(0.96) contrast(1.04);
}

[data-theme="dark"] .bg-image:hover {
  filter: brightness(0.7) saturate(1) contrast(1.06);
}

[data-theme="dark"] .bg-overlay {
  background:
    linear-gradient(
      90deg,
      rgba(7, 17, 31, 0.9) 0%,
      rgba(7, 17, 31, 0.72) 34%,
      rgba(7, 17, 31, 0.42) 64%,
      rgba(7, 17, 31, 0.18) 100%
    ),
    linear-gradient(
      180deg,
      rgba(8, 20, 38, 0.12) 0%,
      rgba(4, 10, 20, 0.36) 100%
    );
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

[data-theme="dark"] .login-icon {
  color: var(--login-accent);
  background: rgba(124, 198, 240, 0.12);
  border-color: rgba(124, 198, 240, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 10px 24px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .login-title {
  color: var(--login-text);
}

[data-theme="dark"] .login-subtitle,
[data-theme="dark"] .login-footer :deep(.n-text) {
  color: var(--login-muted);
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
    background-position: 66% center;
  }

  .bg-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(235, 244, 251, 0.64) 0%,
        rgba(235, 244, 251, 0.46) 45%,
        rgba(235, 244, 251, 0.88) 100%
      );
  }

  [data-theme="dark"] .bg-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(7, 17, 31, 0.48) 0%,
        rgba(7, 17, 31, 0.58) 45%,
        rgba(7, 17, 31, 0.9) 100%
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

/* 添加一些粒子效果的伪元素 */
.background-layer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0));
  z-index: 2;
}
</style>

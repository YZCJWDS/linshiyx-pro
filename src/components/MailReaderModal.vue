<template>
  <n-modal
    :show="uiStore.readerModalVisible"
    @update:show="handleUpdateShow"
    :mask-closable="true"
    :auto-focus="false"
    transform-origin="center"
    class="mail-reader-modal"
  >
    <div
      class="reader-shell"
      :class="{
        'reader-shell--dark': uiStore.theme === 'dark',
        'reader-shell--focus': uiStore.readerFocusMode
      }"
      @mousemove="onPointerActivity"
    >
      <!-- 顶部导航栏（专注模式下悬浮、可自动隐藏） -->
      <div
        class="reader-toolbar"
        :class="{ 'reader-toolbar--hidden': uiStore.readerFocusMode && !toolbarVisible }"
        @mouseenter="lockToolbar = true"
        @mouseleave="lockToolbar = false"
      >
        <div class="reader-toolbar-left">
          <n-button quaternary circle size="small" title="关闭 (Esc)" @click="close">
            <template #icon>
              <n-icon size="20"><CloseIcon /></n-icon>
            </template>
          </n-button>
          <span class="reader-position" v-if="total > 0">
            第 {{ currentIndex + 1 }} / {{ total }} 封
          </span>
        </div>

        <div class="reader-toolbar-context" v-if="emailStore.selectedMail">
          <strong :title="readerSubject">{{ readerSubject }}</strong>
          <span :title="emailStore.selectedMail.source">{{ emailStore.selectedMail.source || '未知发件人' }}</span>
        </div>

        <div class="reader-toolbar-right">
          <!-- 验证码一键复制（工具栏内的紧凑入口） -->
          <n-button
            v-if="verificationCode"
            size="small"
            :type="codeCopied ? 'success' : 'default'"
            secondary
            round
            class="reader-code-btn"
            :title="`复制验证码 ${verificationCode}`"
            @click="copyCode"
          >
            <template #icon>
              <n-icon size="16">
                <CheckmarkIcon v-if="codeCopied" />
                <CodeIcon v-else />
              </n-icon>
            </template>
            {{ codeCopied ? '已复制' : verificationCode }}
          </n-button>

          <!-- 专注模式切换 -->
          <n-button
            quaternary
            size="small"
            :type="uiStore.readerFocusMode ? 'primary' : 'default'"
            :title="uiStore.readerFocusMode ? '退出专注模式' : '进入专注模式'"
            class="reader-focus-toggle"
            @click="uiStore.toggleReaderFocusMode()"
          >
            <template #icon>
              <n-icon size="18">
                <ContractIcon v-if="uiStore.readerFocusMode" />
                <ExpandIcon v-else />
              </n-icon>
            </template>
            <span class="reader-focus-label">{{ uiStore.readerFocusMode ? '退出专注' : '专注阅读' }}</span>
          </n-button>

          <n-button-group size="small">
            <n-button :disabled="!hasPrev" title="上一封 (↑ / ←)" @click="goPrev">
              <template #icon>
                <n-icon size="16"><UpIcon /></n-icon>
              </template>
            </n-button>
            <n-button :disabled="!hasNext" title="下一封 (↓ / →)" @click="goNext">
              <template #icon>
                <n-icon size="16"><DownIcon /></n-icon>
              </template>
            </n-button>
          </n-button-group>
        </div>
      </div>

      <!-- 阅读主体 -->
      <div class="reader-body">
        <!-- 专注模式：信纸 + 翻页热区 + 验证码卡片 -->
        <template v-if="uiStore.readerFocusMode">
          <!-- 左右翻页热区 -->
          <button
            v-if="hasPrev"
            class="reader-nav-zone reader-nav-zone--left"
            title="上一封 (← / ↑)"
            aria-label="上一封"
            @click="goPrev"
          >
            <span class="reader-nav-arrow"><n-icon size="26"><PrevIcon /></n-icon></span>
          </button>
          <button
            v-if="hasNext"
            class="reader-nav-zone reader-nav-zone--right"
            title="下一封 (→ / ↓)"
            aria-label="下一封"
            @click="goNext"
          >
            <span class="reader-nav-arrow"><n-icon size="26"><NextIcon /></n-icon></span>
          </button>

          <!-- 信纸：入场展开动画，切换邮件时重新触发 -->
          <transition name="paper-open" mode="out-in">
            <div class="reader-paper" :key="emailStore.selectedMail?.id">
              <!-- 醒目验证码卡片 -->
              <div v-if="verificationCode" class="code-card" @click="copyCode">
                <div class="code-card-label">
                  <n-icon size="15"><CodeIcon /></n-icon>
                  <span>检测到验证码</span>
                </div>
                <div class="code-card-value">
                  <span
                    v-for="(ch, i) in verificationChars"
                    :key="i"
                    class="code-char"
                  >{{ ch }}</span>
                </div>
                <div class="code-card-action" :class="{ 'code-card-action--done': codeCopied }">
                  <n-icon size="16">
                    <CheckmarkIcon v-if="codeCopied" />
                    <CopyIcon v-else />
                  </n-icon>
                  <span>{{ codeCopied ? '已复制到剪贴板' : '点击复制' }}</span>
                </div>
              </div>

              <!-- 复用邮件渲染核心 -->
              <div class="reader-paper-detail">
                <MailDetail :in-reader="true" />
              </div>
            </div>
          </transition>
        </template>

        <!-- 普通模式：直接复用 MailDetail -->
        <div v-else class="reader-plain">
          <MailDetail :in-reader="true" />
        </div>
      </div>

      <!-- 专注模式底部：邮件序列进度 -->
      <div v-if="uiStore.readerFocusMode && total > 0" class="reader-progress">
        <div class="reader-progress-track">
          <div class="reader-progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { NModal, NButton, NButtonGroup, NIcon, useMessage } from 'naive-ui'
import {
  Close as CloseIcon,
  ChevronUp as UpIcon,
  ChevronDown as DownIcon,
  ChevronBack as PrevIcon,
  ChevronForward as NextIcon,
  KeypadOutline as CodeIcon,
  Copy as CopyIcon,
  Checkmark as CheckmarkIcon,
  ExpandOutline as ExpandIcon,
  ContractOutline as ContractIcon
} from '@vicons/ionicons5'
import { useEmailStore, useUiStore } from '@/stores'
import MailDetail from './MailDetail.vue'
import { extractMailVerificationCode, copyToClipboard, decodeMailSubject } from '@/utils/helpers'
import type { EmailMessage } from '@/types'

const emailStore = useEmailStore()
const uiStore = useUiStore()
const message = useMessage()

// 当前地址下、按时间倒序排列的邮件（与列表一致）
const orderedMails = computed<EmailMessage[]>(() =>
  [...emailStore.selectedAddressMails].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
)

const total = computed(() => orderedMails.value.length)

const currentIndex = computed(() =>
  orderedMails.value.findIndex(mail => mail.id === emailStore.selectedMail?.id)
)

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < total.value - 1)

// 序列阅读进度（第几封 / 共几封）
const progressPercent = computed(() => {
  if (total.value <= 0 || currentIndex.value < 0) return 0
  return Math.round(((currentIndex.value + 1) / total.value) * 100)
})

const readerSubject = computed(() => {
  const mail = emailStore.selectedMail
  if (!mail) return '邮件阅读'
  return decodeMailSubject(mail.subject || '', mail.raw || mail.message || '')
})

const verificationCode = computed(() => {
  const mail = emailStore.selectedMail
  if (!mail) return null
  return extractMailVerificationCode(mail)
})

// 验证码逐字符展示（便于做等宽字格视觉）
const verificationChars = computed(() => (verificationCode.value || '').split(''))

// 复制成功的短暂反馈态
const codeCopied = ref(false)
let codeCopiedTimer: ReturnType<typeof setTimeout> | null = null

function close() {
  uiStore.closeReaderModal()
}

function handleUpdateShow(value: boolean) {
  if (!value) close()
}

function goPrev() {
  if (!hasPrev.value) return
  emailStore.selectMail(orderedMails.value[currentIndex.value - 1])
}

function goNext() {
  if (!hasNext.value) return
  emailStore.selectMail(orderedMails.value[currentIndex.value + 1])
}

async function copyCode() {
  if (!verificationCode.value) return
  const ok = await copyToClipboard(verificationCode.value)
  if (ok) {
    codeCopied.value = true
    if (codeCopiedTimer) clearTimeout(codeCopiedTimer)
    codeCopiedTimer = setTimeout(() => { codeCopied.value = false }, 1600)
    message.success(`验证码 ${verificationCode.value} 已复制`)
    if (emailStore.selectedMail) emailStore.markMailRead(emailStore.selectedMail.id)
  } else {
    message.error('复制验证码失败')
  }
}

// ---- 专注模式：工具栏自动隐藏 ----
const toolbarVisible = ref(true)
const lockToolbar = ref(false)
let toolbarTimer: ReturnType<typeof setTimeout> | null = null

function onPointerActivity() {
  if (!uiStore.readerFocusMode) return
  toolbarVisible.value = true
  scheduleToolbarHide()
}

function scheduleToolbarHide() {
  if (toolbarTimer) clearTimeout(toolbarTimer)
  toolbarTimer = setTimeout(() => {
    if (!lockToolbar.value) toolbarVisible.value = false
  }, 2600)
}

// 键盘导航：Esc 关闭，↑↓ / ←→ 切换
function handleKeydown(e: KeyboardEvent) {
  if (!uiStore.readerModalVisible) return
  if (e.key === 'Escape') {
    close()
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    goPrev()
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault()
    goNext()
  }
}

// 切换邮件时重置复制态
watch(() => emailStore.selectedMail?.id, () => {
  codeCopied.value = false
})

// 弹窗打开 / 专注模式变化时的副作用
watch(() => uiStore.readerModalVisible, (visible) => {
  document.body.style.overflow = visible ? 'hidden' : ''
  if (visible && uiStore.readerFocusMode) {
    toolbarVisible.value = true
    scheduleToolbarHide()
  }
})

watch(() => uiStore.readerFocusMode, (focus) => {
  if (focus && uiStore.readerModalVisible) {
    toolbarVisible.value = true
    scheduleToolbarHide()
  } else {
    toolbarVisible.value = true
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  if (toolbarTimer) clearTimeout(toolbarTimer)
  if (codeCopiedTimer) clearTimeout(codeCopiedTimer)
})
</script>

<style scoped>
.mail-reader-modal {
  width: 100%;
}

.reader-shell {
  width: min(1320px, 96vw);
  height: min(92vh, 980px);
  display: flex;
  flex-direction: column;
  background: #edf3f7;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 28px 80px rgba(19, 38, 58, 0.3);
  border: 1px solid var(--border-color);
}

.reader-shell--dark {
  background: #08121f;
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.58);
}

.reader-toolbar {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  min-height: 58px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--divider-color);
  background: rgba(249, 252, 255, 0.92);
  backdrop-filter: blur(18px) saturate(1.15);
}

.reader-shell--dark .reader-toolbar {
  background: rgba(11, 23, 39, 0.92);
}

.reader-toolbar-left,
.reader-toolbar-right {
  display: flex;
  align-items: center;
  gap: 7px;
}

.reader-toolbar-context {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  text-align: center;
}

.reader-toolbar-context strong,
.reader-toolbar-context span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reader-toolbar-context strong {
  color: var(--n-text-color);
  font-size: 13px;
  font-weight: 650;
}

.reader-toolbar-context span {
  color: var(--n-text-color-3);
  font-size: 10px;
}

.reader-position {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-2);
  font-variant-numeric: tabular-nums;
}

.reader-code-btn {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

.reader-focus-toggle {
  min-width: 92px;
}

.reader-focus-label {
  font-size: 12px;
}

.reader-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(90% 60% at 50% 0%, rgba(83, 151, 199, 0.08), transparent 72%),
    #e8eff4;
}

.reader-shell--dark .reader-body {
  background:
    radial-gradient(90% 60% at 50% 0%, rgba(120, 190, 240, 0.08), transparent 72%),
    #07101c;
}

.reader-plain {
  height: 100%;
  width: min(1180px, 100%);
  margin: 0 auto;
  border-left: 1px solid var(--divider-color);
  border-right: 1px solid var(--divider-color);
  background: var(--card-color, #fff);
}

/* 让内部 MailDetail 填满弹窗主体 */
.reader-plain :deep(.mail-detail),
.reader-paper-detail :deep(.mail-detail) {
  height: 100%;
}

/* 压平 MailDetail 原有的多层卡片，让沉浸阅读更像单一阅读器而不是面板套面板。 */
.reader-plain :deep(.mail-content),
.reader-paper-detail :deep(.mail-content) {
  padding: 0;
  gap: 0;
}

.reader-plain :deep(.mail-header),
.reader-paper-detail :deep(.mail-header) {
  padding: 16px 20px;
  border-width: 0 0 1px;
  border-radius: 0;
  box-shadow: none;
}

.reader-plain :deep(.attachments-section),
.reader-paper-detail :deep(.attachments-section) {
  margin: 12px 16px 0;
  border-radius: 12px;
  box-shadow: none;
}

.reader-plain :deep(.mail-body),
.reader-paper-detail :deep(.mail-body) {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.reader-plain :deep(.mail-body-header),
.reader-paper-detail :deep(.mail-body-header) {
  min-height: 48px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--detail-border);
}

.reader-plain :deep(.mail-body-content),
.reader-paper-detail :deep(.mail-body-content) {
  box-shadow: none;
}

.reader-plain :deep(.rendered-content),
.reader-paper-detail :deep(.rendered-content) {
  padding: 20px clamp(18px, 3vw, 34px);
}

/* ============ 专注沉浸模式 ============ */
.reader-shell--focus {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  border: none;
  border-radius: 0;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(63, 159, 211, 0.16), transparent 60%),
    radial-gradient(90% 70% at 85% 110%, rgba(120, 190, 255, 0.12), transparent 62%),
    linear-gradient(180deg, #eef4f8, #e2ebf2 60%, #dbe6ef);
}

.reader-shell--focus.reader-shell--dark {
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(143, 216, 255, 0.16), transparent 60%),
    radial-gradient(90% 70% at 85% 110%, rgba(90, 150, 220, 0.14), transparent 62%),
    linear-gradient(180deg, #060d1a, #0a1526 55%, #050b16);
}

.reader-shell--focus .reader-toolbar {
  position: absolute;
  top: 12px;
  left: 50%;
  right: auto;
  width: min(1180px, calc(100vw - 32px));
  transform: translateX(-50%);
  z-index: 20;
  min-height: 52px;
  padding: 7px 10px;
  border: 1px solid rgba(133, 169, 198, 0.2);
  border-radius: 14px;
  background: rgba(10, 21, 38, 0.7);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(18px) saturate(1.12);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.reader-shell--focus:not(.reader-shell--dark) .reader-toolbar {
  background: rgba(255, 255, 255, 0.78);
}

.reader-toolbar--hidden {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 16px)) !important;
  pointer-events: none;
}

.reader-shell--focus .reader-position {
  color: var(--n-text-color-2);
}

/* 翻页热区 */
.reader-nav-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: clamp(64px, 12vw, 160px);
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--n-text-color-2);
  transition: background 0.25s ease;
}

.reader-nav-zone--left {
  left: 0;
  justify-content: flex-start;
  padding-left: 18px;
}

.reader-nav-zone--right {
  right: 0;
  justify-content: flex-end;
  padding-right: 18px;
}

.reader-nav-zone:hover {
  background: linear-gradient(90deg, rgba(63, 159, 211, 0.12), transparent);
}

.reader-nav-zone--right:hover {
  background: linear-gradient(270deg, rgba(63, 159, 211, 0.12), transparent);
}

.reader-nav-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--card-color, #fff);
  border: 1px solid var(--border-color);
  box-shadow: 0 6px 18px rgba(33, 55, 76, 0.18);
  opacity: 0.35;
  transform: scale(0.9);
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.reader-nav-zone:hover .reader-nav-arrow {
  opacity: 1;
  transform: scale(1);
}

/* 信纸 */
.reader-paper {
  position: absolute;
  top: 76px;
  bottom: 28px;
  left: 50%;
  width: min(1120px, 88vw);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--card-color, #fff);
  border: 1px solid var(--border-color);
  box-shadow:
    0 2px 6px rgba(33, 55, 76, 0.12),
    0 26px 64px rgba(33, 55, 76, 0.24);
}

.reader-shell--dark .reader-paper {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 32px 80px rgba(0, 0, 0, 0.55);
}

.reader-paper-detail {
  flex: 1;
  min-height: 0;
}

/* 验证码卡片 */
.code-card {
  flex-shrink: 0;
  margin: 12px 14px 0;
  padding: 9px 12px;
  border-radius: 12px;
  cursor: pointer;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  background:
    linear-gradient(135deg, rgba(56, 194, 177, 0.16), rgba(63, 159, 211, 0.12));
  border: 1px solid rgba(56, 194, 177, 0.4);
  box-shadow: 0 6px 20px rgba(56, 168, 157, 0.18);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.code-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(56, 168, 157, 0.28);
}

.code-card-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-2);
  letter-spacing: 0.5px;
}

.code-card-value {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
}

.code-char {
  min-width: 27px;
  height: 34px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: var(--n-primary-color);
  background: var(--card-color, #fff);
  border: 1px solid rgba(56, 194, 177, 0.35);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.reader-shell--dark .code-char {
  background: rgba(9, 18, 32, 0.6);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.code-card-action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-3);
  transition: color 0.2s ease;
}

.code-card-action--done {
  color: #2eae7d;
}

/* 底部序列进度 */
.reader-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 18;
  padding: 0 clamp(64px, 12vw, 160px) 10px;
  pointer-events: none;
}

.reader-progress-track {
  height: 4px;
  border-radius: 999px;
  background: rgba(120, 150, 175, 0.24);
  overflow: hidden;
}

.reader-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #38c2b1, #3f9fd3);
  transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 信纸展开入场动画 */
.paper-open-enter-active {
  transition: opacity 0.34s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.paper-open-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.paper-open-enter-from {
  opacity: 0;
  transform: translateX(-50%) scale(0.94) translateY(14px);
}

.paper-open-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.98);
}

@media (max-width: 1024px) {
  .reader-shell {
    width: 98vw;
    height: 94vh;
  }

  .reader-toolbar {
    gap: 8px;
  }

  .reader-toolbar-context span,
  .reader-focus-label {
    display: none;
  }

  .reader-focus-toggle {
    min-width: auto;
  }

  .reader-code-btn {
    max-width: 150px;
  }

  .reader-code-btn :deep(.n-button__content) {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-width: 768px) {
  .reader-shell {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .reader-paper {
    top: 58px;
    bottom: 0;
    width: 100vw;
    border-radius: 0;
    border: none;
  }

  .reader-toolbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 6px;
    padding: 8px;
  }

  .reader-toolbar-context {
    display: none;
  }

  .reader-toolbar-left,
  .reader-toolbar-right {
    gap: 3px;
  }

  .reader-focus-toggle {
    min-width: auto;
  }

  .reader-focus-label {
    display: none;
  }

  .reader-code-btn {
    max-width: 112px;
  }

  .reader-code-btn :deep(.n-button__content) {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reader-shell--focus .reader-toolbar {
    top: 6px;
    width: calc(100vw - 12px);
  }

  .reader-nav-zone {
    width: 56px;
  }

  .code-char {
    min-width: 24px;
    height: 31px;
    font-size: 18px;
  }

  .code-card {
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  .code-card-label {
    grid-column: 1 / -1;
  }

  .reader-plain :deep(.mail-header),
  .reader-paper-detail :deep(.mail-header) {
    padding: 12px;
  }

  .reader-plain :deep(.mail-body-header),
  .reader-paper-detail :deep(.mail-body-header) {
    padding: 8px 10px;
  }
}
</style>

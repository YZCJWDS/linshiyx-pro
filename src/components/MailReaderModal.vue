<template>
  <n-modal
    :show="uiStore.readerModalVisible"
    @update:show="handleUpdateShow"
    :mask-closable="true"
    :auto-focus="false"
    transform-origin="center"
    class="mail-reader-modal"
  >
    <div class="reader-shell" :class="{ 'reader-shell--dark': uiStore.theme === 'dark' }">
      <!-- 顶部导航栏 -->
      <div class="reader-toolbar">
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

        <div class="reader-toolbar-right">
          <!-- 验证码一键复制 -->
          <n-button
            v-if="verificationCode"
            size="small"
            type="success"
            secondary
            round
            class="reader-code-btn"
            :title="`复制验证码 ${verificationCode}`"
            @click="copyCode"
          >
            <template #icon>
              <n-icon size="16"><CodeIcon /></n-icon>
            </template>
            {{ verificationCode }}
          </n-button>

          <n-button-group size="small">
            <n-button
              :disabled="!hasPrev"
              title="上一封 (↑)"
              @click="goPrev"
            >
              <template #icon>
                <n-icon size="16"><UpIcon /></n-icon>
              </template>
            </n-button>
            <n-button
              :disabled="!hasNext"
              title="下一封 (↓)"
              @click="goNext"
            >
              <template #icon>
                <n-icon size="16"><DownIcon /></n-icon>
              </template>
            </n-button>
          </n-button-group>
        </div>
      </div>

      <!-- 复用现有 MailDetail 渲染核心 -->
      <div class="reader-body">
        <MailDetail />
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { NModal, NButton, NButtonGroup, NIcon, useMessage } from 'naive-ui'
import {
  Close as CloseIcon,
  ChevronUp as UpIcon,
  ChevronDown as DownIcon,
  KeypadOutline as CodeIcon
} from '@vicons/ionicons5'
import { useEmailStore, useUiStore } from '@/stores'
import MailDetail from './MailDetail.vue'
import { extractVerificationCode, extractTextFromHtml, copyToClipboard } from '@/utils/helpers'
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

const verificationCode = computed(() => {
  const mail = emailStore.selectedMail
  if (!mail) return null
  const fromSubject = extractVerificationCode(mail.subject || '')
  if (fromSubject) return fromSubject
  return extractVerificationCode(extractTextFromHtml(mail.message || ''))
})

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
    message.success(`验证码 ${verificationCode.value} 已复制`)
  } else {
    message.error('复制验证码失败')
  }
}

// 键盘导航：Esc 关闭，↑↓ 切换
function handleKeydown(e: KeyboardEvent) {
  if (!uiStore.readerModalVisible) return
  if (e.key === 'Escape') {
    close()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    goPrev()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    goNext()
  }
}

// 弹窗打开时锁定背景滚动
watch(() => uiStore.readerModalVisible, (visible) => {
  document.body.style.overflow = visible ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.mail-reader-modal {
  width: 100%;
}

.reader-shell {
  width: min(1080px, 94vw);
  height: min(88vh, 920px);
  display: flex;
  flex-direction: column;
  background: var(--card-color, #fff);
  border-radius: var(--radius-shell, 22px);
  overflow: hidden;
  box-shadow: var(--box-shadow-3);
  border: 1px solid var(--border-color);
}

.reader-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--divider-color);
  background: linear-gradient(180deg, rgba(63, 159, 211, 0.06), transparent);
}

.reader-shell--dark .reader-toolbar {
  background: linear-gradient(180deg, rgba(143, 216, 255, 0.08), transparent);
}

.reader-toolbar-left,
.reader-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
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

.reader-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 让内部 MailDetail 填满弹窗主体 */
.reader-body :deep(.mail-detail) {
  height: 100%;
}

@media (max-width: 768px) {
  .reader-shell {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
}
</style>

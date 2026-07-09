<template>
  <div class="mail-detail">
    <!-- No Mail Selected State -->
    <div v-if="!emailStore.selectedMail" class="empty-state">
      <n-empty description="选择邮件查看内容" size="large">
        <template #icon>
          <n-icon size="64" color="#ccc">
            <DocumentIcon />
          </n-icon>
        </template>
        <template #extra>
          <n-text depth="3">
            从邮件列表中选择一封邮件来查看完整内容
          </n-text>
        </template>
      </n-empty>
    </div>

    <!-- Mail Content -->
    <div v-else class="mail-content">
      <!-- Mail Header -->
      <div class="mail-header">
        <SenderAvatar
          :source="emailStore.selectedMail.source || '?'"
          :size="48"
          class="mail-header-avatar"
        />
        <div class="mail-header-main">
          <h3 class="mail-subject">
            {{ getDecodedSubject() }}
          </h3>

          <div class="mail-meta-info">
            <div class="mail-from">
              <n-icon size="16" class="meta-icon">
                <PersonIcon />
              </n-icon>
              <span class="meta-label">发件人:</span>
              <span class="meta-value" :title="emailStore.selectedMail.source">{{ emailStore.selectedMail.source }}</span>
            </div>

            <div class="mail-to">
              <n-icon size="16" class="meta-icon">
                <MailIcon />
              </n-icon>
              <span class="meta-label">收件人:</span>
              <span class="meta-value" :title="emailStore.selectedMail.address">{{ emailStore.selectedMail.address }}</span>
            </div>

            <div class="mail-date">
              <n-icon size="16" class="meta-icon">
                <TimeIcon />
              </n-icon>
              <span class="meta-label">日期:</span>
              <span class="meta-value">{{ formatMailDetailTime(emailStore.selectedMail.created_at) }}</span>
            </div>
          </div>
        </div>

        <div class="mail-actions">
          <n-button
            v-if="!inReader"
            size="small"
            type="primary"
            secondary
            round
            class="immersive-btn"
            @click="openReader"
            title="沉浸式阅读（也可双击邮件）"
          >
            <template #icon>
              <n-icon>
                <ExpandIcon />
              </n-icon>
            </template>
            沉浸阅读
          </n-button>

          <n-button
            size="small"
            quaternary
            circle
            @click="copyMailContent"
            title="复制内容"
          >
            <template #icon>
              <n-icon>
                <CopyIcon />
              </n-icon>
            </template>
          </n-button>
          
          <n-button
            size="small"
            quaternary
            circle
            @click="downloadMail"
            title="Download Email"
          >
            <template #icon>
              <n-icon>
                <DownloadIcon />
              </n-icon>
            </template>
          </n-button>
          
          <n-popconfirm
            @positive-click="handleDeleteMail"
            negative-text="取消"
            positive-text="删除"
          >
            <template #trigger>
              <n-button
                size="small"
                quaternary
                circle
                type="error"
                title="删除邮件"
              >
                <template #icon>
                  <n-icon>
                    <DeleteIcon />
                  </n-icon>
                </template>
              </n-button>
            </template>
            确定要删除这封邮件吗？
          </n-popconfirm>
        </div>
      </div>

      <!-- Attachments Section -->
      <div v-if="hasAttachments" class="attachments-section">
        <div class="attachments-header">
          <n-icon size="16">
            <AttachIcon />
          </n-icon>
          <span class="attachments-title">
            Attachments ({{ emailStore.selectedMail.attachments?.length }})
          </span>
        </div>
        
        <div class="attachments-list">
          <div
            v-for="(attachment, index) in emailStore.selectedMail.attachments"
            :key="index"
            class="attachment-item"
          >
            <div class="attachment-info">
              <n-icon size="20" class="attachment-icon">
                <DocumentIcon />
              </n-icon>
              <div class="attachment-details">
                <span class="attachment-name" :title="attachment.filename">{{ attachment.filename }}</span>
                <span class="attachment-meta">
                  {{ attachment.content_type }} • {{ formatFileSize(attachment.size) }}
                </span>
              </div>
            </div>
            
            <n-button
              size="small"
              quaternary
              @click="downloadAttachment(attachment)"
              title="下载附件"
            >
              <template #icon>
                <n-icon>
                  <DownloadIcon />
                </n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>

      <!-- Mail Body -->
      <div class="mail-body">
        <div class="mail-body-header">
          <span class="body-title">邮件内容</span>
          <div class="view-options">
            <n-space size="small">
              <!-- 视图模式切换 -->
              <n-button-group size="small">
                <n-button
                  :type="viewMode === 'rendered' ? 'primary' : 'default'"
                  @click="viewMode = 'rendered'"
                  size="small"
                >
                  正常视图
                </n-button>
                <n-button
                  :type="viewMode === 'source' ? 'primary' : 'default'"
                  @click="viewMode = 'source'"
                  size="small"
                >
                  源码视图
                </n-button>
              </n-button-group>

              <!-- 显示模式设置 (只在正常视图时显示) -->
              <template v-if="viewMode === 'rendered'">
                <!-- 邮件显示模式选择 -->
                <n-select
                  v-model:value="settingsStore.mailDisplayMode"
                  size="small"
                  style="width: 120px"
                  @update:value="settingsStore.setMailDisplayMode"
                  :options="mailDisplayOptions"
                />

                <n-switch
                  v-model:value="settingsStore.preferShowTextMail"
                  size="small"
                  @update:value="settingsStore.saveSettings"
                >
                  <template #checked>文本模式</template>
                  <template #unchecked>富文本模式</template>
                </n-switch>

                <n-switch
                  v-if="isHtmlMail && !settingsStore.preferShowTextMail"
                  v-model:value="settingsStore.useIframeShowMail"
                  size="small"
                  @update:value="settingsStore.saveSettings"
                >
                  <template #checked>iframe渲染</template>
                  <template #unchecked>安全渲染</template>
                </n-switch>
              </template>
            </n-space>
          </div>
        </div>

        <div class="mail-body-content">
          <n-scrollbar style="max-height: 100%;">
            <!-- Rendered View - 完全按照示例前端的逻辑 -->
            <div v-if="viewMode === 'rendered'" class="rendered-content" :class="mailContentClasses">
              <!-- 文本模式：显示 text 字段或从 message 提取的文本 -->
              <pre
                v-if="settingsStore.preferShowTextMail"
                class="text-display"
              >{{ getDisplayText() }}</pre>

              <!-- iframe模式：直接显示 message 内容 -->
              <iframe
                v-else-if="settingsStore.useIframeShowMail"
                :key="emailStore.selectedMail?.id"
                :srcdoc="sanitizedHtmlContent"
                class="html-iframe"
                sandbox="allow-same-origin"
                referrerpolicy="no-referrer"
                loading="lazy"
                @load="handleIframeLoad"
              />

              <!-- 安全渲染模式：使用 ShadowHtmlComponent -->
              <ShadowHtmlComponent
                v-else
                :key="emailStore.selectedMail?.id"
                :html-content="sanitizedHtmlContent"
                :display-mode="effectiveMailDisplayMode"
                class="shadow-content"
              />
            </div>

            <!-- Source View -->
            <div v-else class="source-content">
              <pre class="source-code">{{ getRawContent() || '邮件内容为空' }}</pre>
            </div>
          </n-scrollbar>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NEmpty,
  NIcon,
  NText,
  NButton,
  NButtonGroup,
  NScrollbar,
  NPopconfirm,
  NSwitch,
  NSpace,
  NAlert,
  NSelect,
  useMessage
} from 'naive-ui'
import {
  Document as DocumentIcon,
  Person as PersonIcon,
  Mail as MailIcon,
  Time as TimeIcon,
  Copy as CopyIcon,
  Download as DownloadIcon,
  Trash as DeleteIcon,
  Attach as AttachIcon,
  ExpandOutline as ExpandIcon
} from '@vicons/ionicons5'
import { useEmailStore, useSettingsStore, useUiStore } from '@/stores'
import { formatMailDetailTime, copyToClipboard, extractTextFromHtml, decodeMailSubject } from '@/utils/helpers'
import type { EmailAttachment } from '@/types'
import ShadowHtmlComponent from './ShadowHtmlComponent.vue'
import SenderAvatar from './SenderAvatar.vue'

// inReader: 是否渲染在沉浸式阅读弹窗内（弹窗内不再显示「沉浸阅读」入口，避免重复）
defineProps<{ inReader?: boolean }>()

const emailStore = useEmailStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const message = useMessage()

// Local state
const viewMode = ref<'rendered' | 'source'>('rendered')

// 打开沉浸式阅读弹窗
function openReader() {
  uiStore.openReaderModal()
}

// 邮件显示模式选项
const mailDisplayOptions = [
  { label: '跟随全局', value: 'auto' },
  { label: '明亮阅读', value: 'light' },
  { label: '深色阅读', value: 'dark' },
  { label: '高对比度', value: 'high-contrast' }
]

// 解码邮件主题（复用统一的 RFC 2047 解码工具）
function getDecodedSubject(): string {
  const mail = emailStore.selectedMail
  if (!mail) return '(无主题)'
  return decodeMailSubject(mail.subject || '', mail.raw || mail.message || '')
}

// 解析邮件内容
function getMailContent(): string {
  const mail = emailStore.selectedMail
  if (!mail) return ''

  const rawContent = mail.message || mail.raw || mail.body || mail.content || ''

  // 如果内容包含 MIME 结构，尝试解析
  if (rawContent.includes('Content-Type:')) {
    return parseEmailContent(rawContent)
  }

  return rawContent
}

// 解码 Quoted-Printable 内容
function decodeQuotedPrintable(content: string): string {
  return content
    // 解码 =XX 格式的十六进制字符
    .replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    // 移除软换行（行末的 =）
    .replace(/=\r?\n/g, '')
    // 处理其他常见的 QP 编码
    .replace(/=\r/g, '')
    .replace(/=\n/g, '')
}

// 解析 MIME 邮件内容
function parseEmailContent(rawEmail: string): string {
  try {
    // 1. 查找 Base64 编码的文本内容
    const base64Matches = rawEmail.match(/Content-Type: text\/plain[\s\S]*?Content-Transfer-Encoding: base64\s*\n\s*([A-Za-z0-9+/=\s]+)/i)

    if (base64Matches && base64Matches[1]) {
      // 清理 base64 字符串（移除换行和空格）
      const base64Content = base64Matches[1].replace(/\s/g, '')

      const decodedContent = atob(base64Content)

      try {
        // 尝试解码 UTF-8
        const utf8Content = decodeURIComponent(escape(decodedContent))

        // 清理内容（移除多余的换行）
        return utf8Content.replace(/\r?\n/g, '\n').trim()
      } catch {
        return decodedContent.trim()
      }
    }

    // 2. 查找 Quoted-Printable 编码的文本内容
    const qpMatches = rawEmail.match(/Content-Type: text\/plain[\s\S]*?Content-Transfer-Encoding: quoted-printable\s*\n\s*([\s\S]*?)(?=\n----|\n--\w|$)/i)

    if (qpMatches && qpMatches[1]) {
      try {
        const decodedContent = decodeQuotedPrintable(qpMatches[1])

        // 清理内容
        return decodedContent
          .replace(/\r?\n/g, '\n')
          .replace(/\n\s*\n\s*\n/g, '\n\n') // 合并多个空行
          .trim()
      } catch {
        return qpMatches[1].trim()
      }
    }

    // 3. 查找普通文本内容
    const textMatch = rawEmail.match(/Content-Type: text\/plain[\s\S]*?\n\n([\s\S]*?)(?=\n-----|$)/i)
    if (textMatch && textMatch[1]) {
      return textMatch[1].trim()
    }

    // 4. 最后尝试提取邮件正文（在所有头信息之后）
    const bodyMatch = rawEmail.match(/\n\n([\s\S]*?)(?=\n------|\n--\s*$|$)/)
    if (bodyMatch && bodyMatch[1]) {
      const bodyContent = bodyMatch[1].trim()
      // 如果不是 MIME 边界，返回内容
      if (!bodyContent.startsWith('------') && !bodyContent.startsWith('This is a multi-part')) {
        return bodyContent
      }
    }

    return '邮件内容解析失败'
  } catch {
    return '邮件内容解析出错'
  }
}

// Computed
const hasAttachments = computed(() => {
  return emailStore.selectedMail?.attachments && emailStore.selectedMail.attachments.length > 0
})

const isHtmlMail = computed(() => {
  const mail = emailStore.selectedMail
  if (!mail) return false

  // 简化HTML检测逻辑，按照示例前端的方式
  return mail.is_html === true || mail.is_html === 'true'
})

// 邮件内容动态样式类
const mailContentClasses = computed(() => {
  const classes = []

  // 根据显示模式添加类
  classes.push(`mail-display-${settingsStore.mailDisplayMode}`)

  // 根据系统主题添加类
  if (uiStore.theme === 'dark') {
    classes.push('system-dark')
  }

  return classes
})

const effectiveMailDisplayMode = computed<'light' | 'dark' | 'high-contrast'>(() => {
  if (settingsStore.mailDisplayMode === 'high-contrast') return 'high-contrast'
  if (settingsStore.mailDisplayMode === 'dark') return 'dark'
  if (settingsStore.mailDisplayMode === 'light') return 'light'
  return uiStore.theme === 'dark' ? 'dark' : 'light'
})

const resourceUrlAttributes = new Set(['src', 'background', 'poster', 'data'])

function upgradeHttpUrl(value: string): string {
  return value.replace(/^http:\/\//i, 'https://')
}

function upgradeSrcset(value: string): string {
  return value.replace(/\bhttp:\/\//gi, 'https://')
}

function upgradeStyleUrls(value: string): string {
  return value
    .replace(/url\(\s*(['"]?)http:\/\//gi, 'url($1https://')
    .replace(/@import\s+(url\()?(['"]?)http:\/\//gi, '@import $1$2https://')
}

function prepareMailHtml(content: string): string {
  const template = document.createElement('template')
  template.innerHTML = content

  template.content.querySelectorAll('script').forEach((element) => element.remove())

  template.content.querySelectorAll('style').forEach((element) => {
    element.textContent = upgradeStyleUrls(element.textContent || '')
  })

  template.content.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const tagName = element.tagName.toLowerCase()

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()

      if (name.startsWith('on') || /^\s*javascript:/i.test(value)) {
        element.removeAttribute(attribute.name)
        continue
      }

      if ((name === 'src' || name === 'href') && /^\s*data:/i.test(value) && !/^\s*data:image\//i.test(value)) {
        element.removeAttribute(attribute.name)
        continue
      }

      if (name === 'srcset') {
        element.setAttribute(attribute.name, upgradeSrcset(attribute.value))
        continue
      }

      if (name === 'style') {
        element.setAttribute(attribute.name, upgradeStyleUrls(attribute.value))
        continue
      }

      const isLoadedHref = name === 'href' && tagName === 'link'
      if (resourceUrlAttributes.has(name) || isLoadedHref) {
        element.setAttribute(attribute.name, upgradeHttpUrl(attribute.value))
      }
    }

    if (tagName === 'iframe') {
      element.setAttribute('sandbox', element.getAttribute('sandbox') || 'allow-same-origin allow-popups allow-forms')
      element.setAttribute('referrerpolicy', element.getAttribute('referrerpolicy') || 'no-referrer')
      element.setAttribute('loading', element.getAttribute('loading') || 'lazy')
    }
  })

  return template.innerHTML
}

const sanitizedHtmlContent = computed(() => {
  const content = getDisplayMessage()
  if (!content) return '<p>邮件内容为空</p>'

  const html = prepareMailHtml(content)

  // Add base styles for better rendering
  const mode = effectiveMailDisplayMode.value
  const isDarkReader = mode === 'dark'
  const isHighContrast = mode === 'high-contrast'
  const readerBackground = isHighContrast ? '#ffffff' : isDarkReader ? '#101c31' : '#ffffff'
  const readerText = isHighContrast ? '#000000' : isDarkReader ? '#e8eef7' : '#1f2937'
  const readerMuted = isHighContrast ? '#000000' : isDarkReader ? '#b8c4d4' : '#4b5563'
  const readerLink = isHighContrast ? '#0000ee' : isDarkReader ? '#9fdcff' : '#0b63ce'
  const readerBorder = isHighContrast ? '#000000' : isDarkReader ? '#354a66' : '#d8dee8'
  const readerCodeBg = isHighContrast ? '#ffffff' : isDarkReader ? '#16243b' : '#f5f7fa'

  const styles = `
    <style>
      html {
        color-scheme: ${isDarkReader ? 'dark' : 'light'};
        background: ${readerBackground};
      }

      * {
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 15px;
        line-height: 1.72;
        color: ${readerText};
        background: ${readerBackground};
        margin: 0;
        padding: 24px;
        overflow-wrap: anywhere;
        word-break: normal;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }
      img { max-width: 100%; height: auto; vertical-align: middle; }
      table { border-collapse: collapse; max-width: 100%; }
      td, th { padding: 8px; border-color: ${readerBorder}; }
      p, li, blockquote { line-height: 1.72; }
      a { color: ${readerLink}; text-decoration-thickness: 1px; text-underline-offset: 2px; }
      small, .muted { color: ${readerMuted}; }
      pre, code {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        background: ${readerCodeBg};
        color: ${readerText};
      }
      pre {
        padding: 12px;
        border: 1px solid ${readerBorder};
        border-radius: 6px;
      }
    </style>
  `

  return styles + html
})

// 获取显示文本 - 完全按照示例前端的逻辑
function getDisplayText(): string {
  const mail = emailStore.selectedMail
  if (!mail) return '没有选中邮件'

  // 优先使用解析后的text字段（MIME解析器提取的纯文本）
  if (mail.text && mail.text.trim()) {
    return mail.text
  }

  // 如果没有text字段，从content提取文本
  if (mail.content) {
    const extracted = extractTextFromHtml(mail.content)
    if (extracted && extracted.trim()) {
      return extracted
    }
  }

  // 最后尝试其他字段
  return mail.message || mail.body || '邮件内容为空'
}

// 获取显示消息 - 完全按照示例前端的逻辑
function getDisplayMessage(): string {
  const mail = emailStore.selectedMail
  if (!mail) return '<p>没有选中邮件</p>'

  // 优先使用解析后的content字段（MIME解析器处理过的HTML）
  if (mail.content && mail.content.trim()) {
    return mail.content
  }

  // 如果没有 content 字段，尝试 message
  if (mail.message && mail.message.trim()) {
    return mail.message
  }

  // 尝试body字段
  if (mail.body && mail.body.trim()) {
    return mail.body
  }

  // 如果有text字段，包装成HTML显示
  if (mail.text && mail.text.trim()) {
    return `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; padding: 16px;">${mail.text}</pre>`
  }

  // 最后的fallback
  return '<p style="padding: 16px; color: #999;">邮件内容为空或无法解析</p>'
}

// 获取原始内容
function getRawContent(): string {
  const mail = emailStore.selectedMail
  if (!mail) return ''

  return mail.raw || mail.message || mail.body || mail.content || mail.text || ''
}

// Methods
async function copyMailContent() {
  if (!emailStore.selectedMail) return

  const content = emailStore.selectedMail.is_html
    ? extractTextFromHtml(emailStore.selectedMail.message)
    : emailStore.selectedMail.message

  const success = await copyToClipboard(content)
  if (success) {
    message.success('Email content copied to clipboard')
  } else {
    message.error('Failed to copy email content')
  }
}

function downloadMail() {
  if (!emailStore.selectedMail) return

  const mail = emailStore.selectedMail
  const content = `Subject: ${mail.subject || '(No Subject)'}
From: ${mail.source}
To: ${mail.address}
Date: ${formatMailDetailTime(mail.created_at)}

${mail.message}`

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `email-${mail.id}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  message.success('Email downloaded')
}

function downloadAttachment(attachment: EmailAttachment) {
  try {
    let url = attachment.url
    let shouldRevokeUrl = false

    if (!url) {
      let blob = attachment.blob

      if (!blob && attachment.content) {
        const binaryString = atob(attachment.content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        blob = new Blob([bytes], { type: attachment.content_type })
      }

      if (!blob) {
        throw new Error('Attachment content is unavailable')
      }

      url = URL.createObjectURL(blob)
      shouldRevokeUrl = true
    }

    const a = document.createElement('a')
    a.href = url
    a.download = attachment.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    if (shouldRevokeUrl) {
      URL.revokeObjectURL(url)
    }

    message.success(`Downloaded ${attachment.filename}`)
  } catch (error) {
    console.error('Download attachment error:', error)
    message.error('Failed to download attachment')
  }
}

function handleDeleteMail() {
  if (emailStore.selectedMail) {
    emailStore.deleteMail(emailStore.selectedMail.id)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function handleIframeLoad(event: Event) {
  const iframe = event.target as HTMLIFrameElement
  try {
    // Adjust iframe height to content
    if (iframe.contentDocument) {
      const height = iframe.contentDocument.body.scrollHeight
      iframe.style.height = Math.min(height + 20, 600) + 'px'
    }
  } catch (error) {
    // Cross-origin restrictions may prevent access
    console.warn('Cannot access iframe content:', error)
  }
}
</script>

<style scoped>
.mail-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  --detail-panel: rgba(255, 255, 255, 0.44);
  --detail-panel-strong: rgba(255, 255, 255, 0.74);
  --detail-chip: rgba(255, 255, 255, 0.72);
  --detail-item: rgba(255, 255, 255, 0.82);
  --detail-item-hover: rgba(79, 143, 199, 0.1);
  --detail-border: rgba(88, 112, 130, 0.2);
  --detail-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 1px 2px rgba(33, 55, 76, 0.08), 0 14px 34px rgba(33, 55, 76, 0.12);
  --detail-stage: #e5eef0;
  --detail-stage-soft: rgba(238, 246, 246, 0.92);
  --reader-paper-shadow: 0 1px 0 rgba(255, 255, 255, 0.82) inset, 0 2px 5px rgba(33, 55, 76, 0.12), 0 26px 58px rgba(33, 55, 76, 0.18);
}

[data-theme="dark"] .mail-detail {
  --detail-panel: rgba(7, 13, 25, 0.42);
  --detail-panel-strong: rgba(15, 28, 47, 0.74);
  --detail-chip: rgba(22, 39, 62, 0.82);
  --detail-item: rgba(18, 34, 55, 0.84);
  --detail-item-hover: rgba(143, 216, 255, 0.13);
  --detail-border: rgba(196, 226, 248, 0.17);
  --detail-shadow: 0 1px 0 rgba(255, 255, 255, 0.055) inset, 0 1px 2px rgba(0, 0, 0, 0.34), 0 16px 40px rgba(0, 0, 0, 0.32);
  --detail-stage: #060d1a;
  --detail-stage-soft: rgba(9, 18, 32, 0.94);
  --reader-paper-shadow: 0 1px 0 rgba(255, 255, 255, 0.055) inset, 0 2px 6px rgba(0, 0, 0, 0.44), 0 28px 68px rgba(0, 0, 0, 0.46);
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.mail-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: transparent;
}

.mail-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--detail-border);
  border-radius: var(--radius-panel);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 70%),
    var(--detail-panel-strong);
  box-shadow: var(--detail-shadow);
}

.mail-header-avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.mail-header-main {
  flex: 1;
  min-width: 0;
}

.mail-subject {
  font-size: 19px;
  font-weight: 600;
  color: var(--n-text-color);
  margin: 0 0 12px 0;
  line-height: 1.35;
  word-break: break-word;
  letter-spacing: 0;
}

.mail-meta-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mail-from,
.mail-to,
.mail-date {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  padding: 7px 9px;
  border: 1px solid var(--detail-border);
  border-radius: 10px;
  background: var(--detail-chip);
}

.mail-date {
  grid-column: 1 / -1;
}

.meta-icon {
  color: var(--n-text-color-2);
  flex-shrink: 0;
}

.meta-label {
  font-weight: 500;
  color: var(--n-text-color-2);
  min-width: 48px;
}

.meta-value {
  color: var(--n-text-color);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 3px;
  border: 1px solid var(--detail-border);
  border-radius: 12px;
  background: var(--detail-chip);
}

/* 沉浸阅读入口：主色按钮 + 悬停微动效 + 一抹流光 */
.immersive-btn {
  position: relative;
  overflow: hidden;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.immersive-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(63, 159, 211, 0.28);
}

.immersive-btn:active {
  transform: translateY(0);
}

/* 掠过按钮的一道流光，暗示「展开 / 进入」 */
.immersive-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -120%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    100deg,
    transparent,
    rgba(255, 255, 255, 0.55),
    transparent
  );
  transform: skewX(-18deg);
  transition: left 0.55s ease;
  pointer-events: none;
}

.immersive-btn:hover::after {
  left: 130%;
}

[data-theme="dark"] .immersive-btn::after {
  background: linear-gradient(
    100deg,
    transparent,
    rgba(143, 216, 255, 0.35),
    transparent
  );
}

.attachments-section {
  flex-shrink: 0;
  margin: 0;
  border: 1px solid var(--detail-border);
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--detail-panel);
  box-shadow: var(--detail-shadow);
}

.attachments-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(79, 143, 199, 0.1);
  border-bottom: 1px solid var(--detail-border);
  font-weight: 500;
  color: var(--n-text-color);
}

.attachments-title {
  font-size: 14px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 54px;
  padding: 8px 8px 8px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--detail-item);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease;
}

.attachment-item:last-child {
  border-bottom: none;
}

.attachment-item:hover {
  border-color: rgba(79, 143, 199, 0.28);
  background: var(--detail-item-hover);
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.attachment-icon {
  color: var(--n-primary-color);
  flex-shrink: 0;
}

.attachment-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.attachment-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-meta {
  font-size: 11px;
  color: var(--n-text-color-3);
}

.mail-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--detail-border);
  border-radius: var(--radius-panel);
  overflow: hidden;
  background: var(--detail-panel);
  box-shadow: var(--detail-shadow);
}

.mail-body-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 16px;
  background: var(--detail-panel-strong);
  border-bottom: 1px solid var(--detail-border);
}

.body-title {
  font-weight: 500;
  color: var(--n-text-color);
  flex-shrink: 0;
  font-size: 13px;
}

.view-options {
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 2px;
}

.mail-body-content {
  flex: 1;
  min-height: 0;
  background:
    radial-gradient(70% 46% at 50% 0%, rgba(255, 255, 255, 0.54), transparent 72%),
    radial-gradient(62% 56% at 92% 12%, rgba(56, 194, 177, 0.08), transparent 70%),
    linear-gradient(180deg, var(--detail-stage-soft), var(--detail-stage)),
    var(--detail-stage);
  box-shadow:
    inset 0 16px 34px rgba(33, 55, 76, 0.08),
    inset 0 -18px 36px rgba(33, 55, 76, 0.06);
}

.rendered-content {
  min-height: 100%;
  padding: 34px min(4.8vw, 48px);
  --reader-shell: transparent;
  --reader-paper: #ffffff;
  --reader-text: #1f2937;
  --reader-border: rgba(116, 146, 174, 0.28);
  background: var(--reader-shell);
}

.html-content {
  height: 100%;
}

.html-iframe {
  width: 100%;
  max-width: 960px;
  min-height: 560px;
  display: block;
  margin: 0 auto;
  border: 1px solid var(--reader-border);
  border-radius: var(--radius-panel);
  background: var(--reader-paper);
  box-shadow:
    var(--reader-paper-shadow);
}

.text-content {
  height: 100%;
}

.text-display {
  max-width: 920px;
  margin: 0 auto;
  padding: 28px;
  border: 1px solid var(--reader-border);
  border-radius: var(--radius-panel);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: normal;
  line-height: 1.76;
  color: var(--reader-text);
  font-family: inherit;
  font-size: 15px;
  background: var(--reader-paper);
  box-shadow:
    var(--reader-paper-shadow);
}

.shadow-content {
  display: block;
  max-width: 960px;
  min-height: 100%;
  margin: 0 auto;
  filter: drop-shadow(0 2px 4px rgba(33, 55, 76, 0.1)) drop-shadow(0 26px 44px rgba(33, 55, 76, 0.16));
}

[data-theme="dark"] .shadow-content {
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.38)) drop-shadow(0 28px 54px rgba(0, 0, 0, 0.46));
}

/* 🎨 邮件显示模式样式 */

/* 自动适配模式 - 跟随系统主题 */
.mail-display-auto {
  color: var(--reader-text);
  background: var(--reader-shell);
}

.mail-display-auto.system-dark {
  --reader-shell: transparent;
  --reader-paper: #101c31;
  --reader-text: #e8eef7;
  --reader-border: rgba(171, 214, 245, 0.24);
}

/* 明亮模式 - 强制明亮显示 */
.mail-display-light {
  --reader-shell: transparent;
  --reader-paper: #ffffff;
  --reader-text: #1f2937;
  --reader-border: rgba(116, 146, 174, 0.28);
}

/* 深色模式 - 强制深色显示 */
.mail-display-dark {
  --reader-shell: transparent;
  --reader-paper: #101c31;
  --reader-text: #e8eef7;
  --reader-border: rgba(171, 214, 245, 0.24);
}

/* 高对比度模式 - 最大化可读性 */
.mail-display-high-contrast {
  --reader-shell: transparent;
  --reader-paper: #ffffff;
  --reader-text: #000000;
  --reader-border: #000000;
  font-weight: 600;
}

/* iframe 特殊处理 */
.source-content {
  height: 100%;
  padding: 24px min(4vw, 34px);
  background: var(--detail-stage);
}

.source-code {
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px;
  border: 1px solid var(--detail-border);
  border-radius: var(--radius-panel);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: normal;
  line-height: 1.56;
  color: var(--n-text-color);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12.5px;
  background: var(--detail-panel-strong);
  box-shadow: var(--reader-paper-shadow);
  tab-size: 2;
}

[data-theme="dark"] .mail-header {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent 70%),
    var(--detail-panel-strong);
}

[data-theme="dark"] .attachments-section {
  background: var(--detail-panel);
}

[data-theme="dark"] .mail-body {
  background: var(--detail-panel);
}

[data-theme="dark"] .mail-actions,
[data-theme="dark"] .mail-body-header {
  background: var(--detail-panel-strong);
}

[data-theme="dark"] .mail-body-content {
  background:
    radial-gradient(70% 46% at 50% 0%, rgba(143, 216, 255, 0.08), transparent 72%),
    radial-gradient(62% 56% at 92% 12%, rgba(196, 204, 255, 0.055), transparent 70%),
    linear-gradient(180deg, var(--detail-stage-soft), var(--detail-stage)),
    var(--detail-stage);
  box-shadow:
    inset 0 18px 38px rgba(0, 0, 0, 0.34),
    inset 0 -18px 40px rgba(0, 0, 0, 0.24);
}

[data-theme="dark"] .attachments-header {
  background: rgba(143, 216, 255, 0.12);
}

[data-theme="dark"] .attachment-item {
  background: var(--detail-item);
}

[data-theme="dark"] .attachment-item:hover {
  background: var(--detail-item-hover);
}

.no-content {
  padding: 16px;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .mail-meta-info {
    grid-template-columns: minmax(0, 1fr);
  }

  .mail-date {
    grid-column: auto;
  }
}

@media (max-width: 1024px) {
  .mail-header {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 16px;
  }

  .mail-actions {
    align-self: flex-end;
  }
}

@media (max-width: 768px) {
  .mail-subject {
    font-size: 16px;
  }

  .mail-meta-info {
    gap: 6px;
  }

  .mail-from,
  .mail-to,
  .mail-date {
    font-size: 12px;
  }

  .attachment-item {
    padding: 10px 12px;
  }

  .mail-body-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 10px 12px;
  }

  .rendered-content,
  .text-content {
    padding: 14px;
  }

  .source-content {
    padding: 14px;
  }

  .text-display,
  .source-code {
    padding: 18px;
  }
}
</style>

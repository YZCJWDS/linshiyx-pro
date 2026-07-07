import { DEFAULT_MAIL_DOMAIN } from '@/utils/config'

// Utility functions for the application

// Generate random string for email prefix
export function generateRandomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function parseDateValue(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const raw = String(value).trim()
  if (!raw) return null

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(normalized) || /\b(?:GMT|UTC)\b/i.test(raw)
  const candidates = hasTimezone
    ? [raw, normalized]
    : [`${normalized}Z`, `${raw} UTC`, raw, normalized]

  for (const candidate of candidates) {
    const date = new Date(candidate)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

// Format date for display
export function formatDate(dateString: string, useUTC = false): string {
  const date = parseDateValue(dateString)
  if (!date) return dateString || ''

  if (useUTC) {
    return date.toUTCString()
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// 经典时间显示方法：2天内显示相对时间，超过2天显示准确日期
export function formatRelativeTime(dateString: string, useUTCDate = false): string {
  if (!dateString) return 'Unknown time'

  try {
    // 参考示例前端的处理方法：在时间字符串后添加 " UTC"
    const date = parseDateValue(dateString)
    if (!date) return dateString

    // 如果设置使用UTC时间，直接返回UTC时间字符串
    if (useUTCDate) {
      return date.toUTCString()
    }

    // 创建Date对象，会自动转换为本地时间
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      // 尝试直接解析原始字符串
      const fallbackDate = new Date(dateString)
      if (!isNaN(fallbackDate.getTime())) {
        return formatClassicTime(fallbackDate)
      }
      return dateString // 返回原始字符串
    }

    return formatClassicTime(date)

  } catch (error) {
    console.error('Error parsing date:', dateString, error)
    return dateString
  }
}

// 经典时间格式化：2天内相对时间，超过2天准确日期
function formatClassicTime(date: Date): string {
  // 强制使用中国时区
  const chinaDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}))
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Shanghai"}))

  const diffInMs = now.getTime() - chinaDate.getTime()
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  // 调试信息

  // 处理未来时间
  if (diffInMs < 0) {
    const absDiffInMinutes = Math.abs(diffInMinutes)
    if (absDiffInMinutes < 60) {
      return '刚刚'
    }
  }

  // 2天以内：显示相对时间
  if (diffInDays < 2) {
    const timeStr = chinaDate.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    if (diffInMinutes < 1) {
      return '刚刚'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`
    } else if (diffInHours < 24) {
      if (diffInHours < 1) {
        return `${diffInMinutes}分钟前`
      }
      return `${diffInHours}小时前`
    } else if (diffInDays === 0) {
      // 今天
      return `今天 ${timeStr}`
    } else if (diffInDays === 1) {
      // 昨天
      return `昨天 ${timeStr}`
    }
  }

  // 超过2天：显示准确日期
  return chinaDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
}

// 邮件详情专用：强制显示中国时区的完整日期时间
export function formatMailDetailTime(dateString: string): string {
  if (!dateString) return 'Unknown time'

  try {
    // 参考示例前端的处理方法：在时间字符串后添加 " UTC"
    const date = parseDateValue(dateString)
    if (!date) return dateString

    // 检查日期是否有效
    // 强制使用中国时区显示完整日期时间
    const chinaDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}))

    return chinaDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    }).replace(/\//g, '-')

  } catch (error) {
    console.error('Error parsing mail detail date:', dateString, error)
    return dateString
  }
}

// Validate email address
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Extract text content from HTML
export function extractTextFromHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

// Generate email address with domain
export function generateEmailAddress(prefix: string, domain: string): string {
  return `${prefix}@${domain}`
}

// Common email domains - 使用你的真实域名
export const COMMON_DOMAINS = [
  DEFAULT_MAIL_DOMAIN
]

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      textArea.remove()
      return result
    }
  } catch (error) {
    console.error('Failed to copy text:', error)
    return false
  }
}

// Download file from blob
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Check if email is valid
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

// Generate secure random string
export function generateSecureRandomString(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''

  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // Fallback for older browsers
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }

  return result
}

// Parse email headers
export function parseEmailHeaders(headers: string): Record<string, string> {
  const parsed: Record<string, string> = {}
  const lines = headers.split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()
      parsed[key] = value
    }
  }

  return parsed
}

// 从邮件文本中提取验证码（4-8 位数字，或含字母的验证码）
export function extractVerificationCode(text: string): string | null {
  if (!text) return null

  // 优先匹配「验证码/code/verification」等关键词附近的数字或字母数字组合
  const keywordPatterns = [
    /(?:验证码|校验码|动态码|verification code|verify code|security code|otp|code)[^0-9a-zA-Z]{0,12}([0-9]{4,8})/i,
    /(?:验证码|校验码|动态码|verification code|verify code|security code|otp|code)[^0-9a-zA-Z]{0,12}([0-9A-Z]{4,8})/i,
    /([0-9]{4,8})[^0-9a-zA-Z]{0,12}(?:是您的验证码|为您的验证码|验证码)/i
  ]

  for (const pattern of keywordPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // 兜底：匹配独立出现的 6 位数字（最常见的验证码长度）
  const sixDigit = text.match(/(?<![0-9])([0-9]{6})(?![0-9])/)
  if (sixDigit && sixDigit[1]) {
    return sixDigit[1]
  }

  // 再兜底：4 位数字
  const fourDigit = text.match(/(?<![0-9])([0-9]{4})(?![0-9])/)
  if (fourDigit && fourDigit[1]) {
    return fourDigit[1]
  }

  return null
}

// 解码 RFC 2047 编码的邮件主题（=?charset?B/Q?text?=），必要时从原始邮件中提取
export function decodeMailSubject(subject: string, raw = ''): string {
  let result = subject || ''

  // 主题为空时，尝试从原始邮件头中提取 Subject 行（支持多行折叠）
  if (!result && raw) {
    const subjectMatch = raw.match(/^Subject:\s*(.+?)(?=\r?\n[^\s]|\r?\n\r?\n|$)/ms)
    if (subjectMatch) {
      result = subjectMatch[1].replace(/\r?\n\s+/g, ' ').trim()
    }
  }

  if (!result) return '(无主题)'

  try {
    result = result.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (match, _charset, encoding, encodedText) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          const decoded = atob(encodedText)
          return decodeURIComponent(escape(decoded))
        }
        // Quoted-Printable
        return encodedText
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) => String.fromCharCode(parseInt(hex, 16)))
      } catch {
        return match
      }
    })
  } catch {
    // 忽略解码异常，回退原始主题
  }

  return result || '(无主题)'
}

// 根据字符串（发件人/邮箱）稳定生成一个柔和的头像背景色
export function stringToColor(input: string): string {
  const str = input || '?'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  // 柔和且在明暗主题下都可读的饱和度/亮度
  return `hsl(${hue}, 62%, 55%)`
}

// 取发件人首字母（优先展示名，其次邮箱首字符），用于头像
export function getInitial(nameOrEmail: string): string {
  const raw = (nameOrEmail || '').trim()
  if (!raw) return '?'
  // 去掉尖括号内的邮箱，取展示名部分
  const displayPart = raw.replace(/<[^>]*>/g, '').trim() || raw
  const firstChar = displayPart.replace(/^["']|["']$/g, '').charAt(0)
  return (firstChar || '?').toUpperCase()
}

// 从发件人字段（可能形如 "顾北 <3464237869@qq.com>" 或纯邮箱）中提取邮箱地址
export function extractEmailAddress(source: string): string {
  const raw = (source || '').trim()
  if (!raw) return ''
  // 优先取尖括号内的邮箱
  const angle = raw.match(/<([^<>]+@[^<>]+)>/)
  if (angle && angle[1]) return angle[1].trim().toLowerCase()
  // 否则取字符串中第一个类邮箱片段
  const bare = raw.match(/[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+/)
  if (bare && bare[0]) return bare[0].trim().toLowerCase()
  return ''
}

// 生成发件人真实头像的候选 URL 列表（按可靠度排序，逐个降级尝试）
// - QQ 邮箱（纯数字用户名）：QQ 官方头像
// - 其他邮箱：Gravatar（identicon 兜底会返回默认图，这里用 404 让前端继续降级到首字母）
export function getSenderAvatarUrls(source: string): string[] {
  const email = extractEmailAddress(source)
  if (!email) return []

  const urls: string[] = []
  const [localPart, domain] = email.split('@')

  // QQ 邮箱：纯数字账号 -> QQ 官方头像接口
  if (/^(qq\.com|vip\.qq\.com|foxmail\.com)$/i.test(domain) && /^\d{5,}$/.test(localPart)) {
    urls.push(`https://q1.qlogo.cn/g?b=qq&nk=${localPart}&s=100`)
  }

  // 通用：Gravatar（d=404 表示无头像时返回 404，便于前端降级到首字母）
  const hash = md5Hex(email)
  urls.push(`https://www.gravatar.com/avatar/${hash}?s=100&d=404`)

  return urls
}

// 轻量 MD5 实现（仅用于生成 Gravatar 邮箱哈希，非安全用途）
function md5Hex(input: string): string {
  function toUtf8(str: string): string {
    return unescape(encodeURIComponent(str))
  }
  function rotl(x: number, c: number): number {
    return (x << c) | (x >>> (32 - c))
  }
  function add(a: number, b: number): number {
    return (a + b) & 0xffffffff
  }

  const msg = toUtf8(input)
  const n = msg.length
  const words: number[] = []
  for (let i = 0; i < n; i++) {
    words[i >> 2] |= msg.charCodeAt(i) << ((i % 4) * 8)
  }
  words[n >> 2] |= 0x80 << ((n % 4) * 8)
  words[(((n + 8) >> 6) + 1) * 16 - 2] = n * 8

  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ]
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ]

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let i = 0; i < words.length; i += 16) {
    let A = a0
    let B = b0
    let C = c0
    let D = d0

    for (let j = 0; j < 64; j++) {
      let F: number
      let g: number
      if (j < 16) {
        F = (B & C) | (~B & D)
        g = j
      } else if (j < 32) {
        F = (D & B) | (~D & C)
        g = (5 * j + 1) % 16
      } else if (j < 48) {
        F = B ^ C ^ D
        g = (3 * j + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * j) % 16
      }
      F = add(add(add(F, A), K[j]), words[i + g] || 0)
      A = D
      D = C
      C = B
      B = add(B, rotl(F, S[j]))
    }

    a0 = add(a0, A)
    b0 = add(b0, B)
    c0 = add(c0, C)
    d0 = add(d0, D)
  }

  function toHex(num: number): string {
    let hex = ''
    for (let i = 0; i < 4; i++) {
      hex += ((num >> (i * 8)) & 0xff).toString(16).padStart(2, '0')
    }
    return hex
  }

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0)
}

// Sanitize HTML content
export function sanitizeHtml(html: string): string {
  // Remove dangerous elements and attributes
  let sanitized = html

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove dangerous attributes
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*javascript\s*:/gi, '')
  sanitized = sanitized.replace(/\s+(src|href)\s*=\s*(['"])\s*data:(?!image\/)[^'"]*\2/gi, '')

  return sanitized
}

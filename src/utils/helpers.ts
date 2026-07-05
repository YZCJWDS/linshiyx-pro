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

// Format date for display
export function formatDate(dateString: string, useUTC = false): string {
  const date = new Date(dateString)
  
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
    const utcTimeString = `${dateString} UTC`

    // 如果设置使用UTC时间，直接返回UTC时间字符串
    if (useUTCDate) {
      return utcTimeString
    }

    // 创建Date对象，会自动转换为本地时间
    const date = new Date(utcTimeString)

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
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
  console.log(`Time debug - China time: ${chinaDate.toLocaleString()}, Now: ${now.toLocaleString()}, Diff: ${diffInDays} days`)

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
    const utcTimeString = `${dateString} UTC`
    const date = new Date(utcTimeString)

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return dateString
    }

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

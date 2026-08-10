// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Email Address Types
export interface EmailAddress {
  id: string
  name: string
  address: string
  domain: string
  created_at: string
  updated_at: string
  jwt?: string
}

// Email Message Types
export interface EmailMessage {
  id: string
  address: string
  source: string
  subject: string
  message: string
  created_at: string
  updated_at?: string
  raw?: string
  content?: string
  text?: string
  body?: string
  to_mail?: string
  to_name?: string
  from_mail?: string
  from_name?: string
  originalSource?: string
  is_html?: boolean | string
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  id?: string
  filename: string
  content_type: string
  size: number
  content?: string
  url?: string
  blob?: Blob
}

// User Settings Types
export interface UserSettings {
  user_id?: string
  enable: boolean
  enableMailVerify: boolean
  verifyMailSender: string
  enableMailAllowList: boolean
  mailAllowList: string[]
  maxAddressCount: number
  domains?: string[]  // 添加域名列表支持
}

// API Request Types
export interface CreateAddressRequest {
  enablePrefix?: boolean
  name: string
  domain: string
  cf_token?: string  // 添加 Cloudflare Turnstile token 支持
}

export interface SendMailRequest {
  from_name?: string
  from_mail?: string
  to_name: string
  to_mail: string
  subject: string
  is_html: boolean
  content: string
}

export interface GetMailsRequest {
  limit: number
  offset: number
  address?: string
  keyword?: string
}

// UI State Types
export interface LoadingState {
  [key: string]: boolean
}

export interface NotificationMessage {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  content?: string
  duration?: number
}

// Domain Info & Styling Types
export interface DomainInfo {
  domain: string
  count: number
  unreadCount: number
}

export interface DomainColorTheme {
  primary: string
  border: string
  bg: string
  bgHover: string
  text: string
  glow: string
}

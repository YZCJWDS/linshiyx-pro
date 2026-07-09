export const DEFAULT_API_BASE_URL = 'https://api.npu.codes'
export const DEFAULT_MAIL_DOMAIN = import.meta.env.VITE_DEFAULT_MAIL_DOMAIN || 'npu.codes'

// 开发环境走相对路径，由 Vite 代理（见 vite.config.ts）转发到后端，规避浏览器 CORS 限制；
// 生产环境使用显式配置的绝对地址，未配置时回退到同源相对路径。
const rawEnvBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export const API_BASE_URL = import.meta.env.DEV ? '' : rawEnvBaseUrl

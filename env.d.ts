/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_DEFAULT_MAIL_DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// File System Access API 类型声明（部分浏览器支持，运行时已有降级处理）
interface Window {
  showDirectoryPicker: (options?: {
    id?: string
    startIn?: string
    mode?: string
  }) => Promise<FileSystemDirectoryHandle>
}

interface FileSystemDirectoryHandle {
  queryPermission: (options?: { mode?: string }) => Promise<string>
  requestPermission: (options?: { mode?: string }) => Promise<string>
}

declare module '*mail_parser_wasm.js' {
  const wasmModule: any
  export const __tla: Promise<void>
  export const parse_message: (rawEmail: string) => any
  export default wasmModule
}

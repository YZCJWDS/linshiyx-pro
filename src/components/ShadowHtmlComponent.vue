<template>
  <div
    v-if="useFallback"
    v-html="htmlContent"
    class="html-fallback"
    :class="`html-fallback--${resolvedDisplayMode}`"
  />
  <div
    v-else
    ref="shadowHost"
    class="shadow-host"
  />
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'

type ReaderDisplayMode = 'light' | 'dark' | 'high-contrast'

interface Props {
  htmlContent: string
  displayMode?: ReaderDisplayMode
  embedded?: boolean
}

const props = defineProps<Props>()

const shadowHost = ref<HTMLElement>()
const useFallback = ref(false)
let shadowRoot: ShadowRoot | null = null
let readabilityFrame = 0
let readabilityTimers: number[] = []

const resolvedDisplayMode = computed<ReaderDisplayMode>(() => props.displayMode || 'light')

function getReaderPalette(mode = resolvedDisplayMode.value) {
  if (mode === 'high-contrast') {
    return {
      mode,
      background: '#ffffff',
      surface: '#ffffff',
      text: '#000000',
      muted: '#000000',
      link: '#0000ee',
      border: '#000000',
      codeBg: '#ffffff',
      shadow: 'none'
    }
  }

  if (mode === 'dark') {
    return {
      mode,
      background: '#101c31',
      surface: '#16243b',
      text: '#e8eef7',
      muted: '#b8c4d4',
      link: '#9fdcff',
      border: '#354a66',
      codeBg: '#16243b',
      shadow: '0 1px 0 rgba(255, 255, 255, 0.055) inset, 0 2px 6px rgba(0, 0, 0, 0.44), 0 28px 68px rgba(0, 0, 0, 0.46)'
    }
  }

  return {
    mode,
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
    muted: '#4b5563',
    link: '#0b63ce',
    border: '#d8dee8',
    codeBg: '#f5f7fa',
    shadow: '0 1px 0 rgba(255, 255, 255, 0.82) inset, 0 2px 5px rgba(33, 55, 76, 0.12), 0 26px 58px rgba(33, 55, 76, 0.18)'
  }
}

function parseRgb(color: string): [number, number, number, number] | null {
  const match = color.match(/rgba?\(([^)]+)\)/i)
  if (!match) return null

  const parts = match[1]
    .replace(/\s*\/\s*/, ' ')
    .split(/,\s*|\s+/)
    .filter(Boolean)
    .map(part => Number(part.trim()))
  if (parts.length < 3 || parts.some((part, index) => index < 3 && Number.isNaN(part))) {
    return null
  }

  const alpha = parts.length < 4 || Number.isNaN(parts[3]) ? 1 : parts[3]
  return [parts[0], parts[1], parts[2], alpha]
}

function luminance([red, green, blue]: [number, number, number, number]) {
  const values = [red, green, blue].map(value => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })

  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}

function contrastRatio(
  foreground: [number, number, number, number],
  background: [number, number, number, number]
) {
  const light = Math.max(luminance(foreground), luminance(background))
  const dark = Math.min(luminance(foreground), luminance(background))
  return (light + 0.05) / (dark + 0.05)
}

function compositeColor(
  foreground: [number, number, number, number],
  background: [number, number, number, number]
): [number, number, number, number] {
  const alpha = foreground[3] + background[3] * (1 - foreground[3])
  if (alpha <= 0) return [0, 0, 0, 0]

  return [
    (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
    alpha
  ]
}

function findEffectiveBackground(element: Element): [number, number, number, number] {
  const layers: Array<[number, number, number, number]> = []
  let current: Element | null = element

  while (current) {
    const parsed = parseRgb(getComputedStyle(current).backgroundColor)
    if (parsed && parsed[3] > 0.01) layers.push(parsed)
    current = current.parentElement
  }

  const fallback: [number, number, number, number] = resolvedDisplayMode.value === 'dark'
    ? [16, 24, 39, 1]
    : [255, 255, 255, 1]

  return layers.reverse().reduce(
    (background, layer) => compositeColor(layer, background),
    fallback
  )
}

function readableTextColor(background: [number, number, number, number]) {
  return luminance(background) > 0.45 ? '#1f2937' : '#f8fafc'
}

function elementHasReadableText(element: HTMLElement) {
  return Array.from(element.childNodes).some(node => {
    return node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
  })
}

function improveReadableColors(root: ShadowRoot) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('.mail-reader, .mail-reader *'))

  for (const element of elements) {
    if (!elementHasReadableText(element)) continue

    const style = getComputedStyle(element)
    const textFill = parseRgb(style.getPropertyValue('-webkit-text-fill-color'))
    const foreground = textFill || parseRgb(style.color)
    if (!foreground || foreground[3] <= 0.01) continue

    const background = findEffectiveBackground(element)
    const renderedForeground = compositeColor(foreground, background)
    if (contrastRatio(renderedForeground, background) < 4.5) {
      const readableColor = readableTextColor(background)
      element.style.setProperty('color', readableColor, 'important')
      element.style.setProperty('-webkit-text-fill-color', readableColor, 'important')
    }
  }
}

function clearReadabilityChecks() {
  if (readabilityFrame) {
    window.cancelAnimationFrame(readabilityFrame)
    readabilityFrame = 0
  }
  readabilityTimers.forEach(timer => window.clearTimeout(timer))
  readabilityTimers = []
}

function scheduleReadabilityChecks() {
  clearReadabilityChecks()

  const check = () => {
    if (shadowRoot) improveReadableColors(shadowRoot)
  }

  readabilityFrame = requestAnimationFrame(() => {
    readabilityFrame = 0
    check()
  })

  // 外部样式、图片和字体可能在首帧后改变邮件的实际背景色。
  readabilityTimers = [150, 800].map(delay => window.setTimeout(check, delay))
}

function renderShadowDOM() {
  if (!shadowHost.value || useFallback.value) return

  try {
    clearReadabilityChecks()

    if (!shadowRoot) {
      try {
        shadowRoot = shadowHost.value.attachShadow({ mode: 'closed' })
      } catch (error) {
        console.warn('Shadow DOM not supported, falling back to v-html:', error)
        useFallback.value = true
        return
      }
    }

    if (shadowRoot && props.htmlContent) {
      const palette = getReaderPalette()
      const styles = `
        <style>
          :host {
            display: block;
            color-scheme: ${palette.mode === 'dark' ? 'dark' : 'light'};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 15px;
            line-height: 1.72;
            color: ${palette.text};
            word-wrap: break-word;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }

          * {
            box-sizing: border-box;
          }

          .mail-reader {
            min-height: 100%;
            padding: ${props.embedded ? '24px clamp(20px, 4vw, 40px)' : '32px'};
            border: ${props.embedded ? '0' : `1px solid ${palette.border}`};
            border-radius: ${props.embedded ? '0' : '18px'};
            background: ${palette.background};
            color: ${palette.text};
            overflow-wrap: anywhere;
            box-shadow: ${props.embedded ? 'none' : palette.shadow};
          }

          body {
            margin: 0;
            padding: 0;
            font-family: inherit;
            line-height: inherit;
            color: inherit;
            background: transparent;
          }

          img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            vertical-align: middle;
          }

          table {
            border-collapse: collapse;
            max-width: 100%;
            margin: 8px 0;
          }

          td, th {
            padding: 8px;
            border-color: ${palette.border};
            text-align: left;
          }

          th {
            background-color: ${palette.surface};
            font-weight: 600;
          }

          a {
            color: ${palette.link};
            text-decoration-thickness: 1px;
            text-underline-offset: 2px;
          }

          a:hover {
            text-decoration: underline;
          }

          small,
          .muted {
            color: ${palette.muted};
          }

          pre {
            white-space: pre-wrap;
            background: ${palette.codeBg};
            color: ${palette.text};
            padding: 12px;
            border: 1px solid ${palette.border};
            border-radius: 4px;
            overflow-x: auto;
          }

          code {
            background: ${palette.codeBg};
            color: ${palette.text};
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          }

          blockquote {
            margin: 16px 0;
            padding: 12px 16px;
            border-left: 4px solid ${palette.border};
            background: ${palette.surface};
            font-style: italic;
          }

          h1, h2, h3, h4, h5, h6 {
            margin: 16px 0 8px 0;
            line-height: 1.3;
          }

          p {
            margin: 8px 0;
          }

          ul, ol {
            margin: 8px 0;
            padding-left: 24px;
          }

          li {
            margin: 4px 0;
          }

          hr {
            border: none;
            border-top: 1px solid ${palette.border};
            margin: 16px 0;
          }

          .mail-reader-high-contrast,
          .mail-reader-high-contrast * {
            color: #000 !important;
            background-color: #fff !important;
            border-color: #000 !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
        </style>
      `

      shadowRoot.innerHTML = `${styles}<article class="mail-reader mail-reader-${palette.mode}">${props.htmlContent}</article>`
      scheduleReadabilityChecks()
    }
  } catch (error) {
    console.error('Failed to render Shadow DOM, falling back to v-html:', error)
    useFallback.value = true
  }
}

onMounted(() => {
  if (!props.htmlContent || props.htmlContent.trim() === '') {
    useFallback.value = true
    return
  }

  if (!useFallback.value) {
    renderShadowDOM()
  }
})

onUnmounted(() => {
  clearReadabilityChecks()

  if (shadowRoot) {
    shadowRoot.innerHTML = ''
  }
  shadowRoot = null
})

watch(() => [props.htmlContent, props.displayMode, props.embedded], () => {
  renderShadowDOM()
}, { flush: 'post' })
</script>

<style scoped>
.shadow-host {
  display: block;
  min-height: 100px;
}

.html-fallback {
  padding: 32px;
  border: 1px solid var(--n-border-color);
  border-radius: var(--radius-panel);
  background: #fff;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.72;
  overflow-wrap: anywhere;
  box-shadow: var(--shadow-mid);
}

.html-fallback--dark {
  background: #101c31;
  color: #e8eef7;
  border-color: #354a66;
  box-shadow: var(--shadow-mid);
}

.html-fallback--high-contrast {
  background: #fff;
  color: #000;
  border-color: #000;
  box-shadow: none;
}

.html-fallback img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.html-fallback table {
  border-collapse: collapse;
  max-width: 100%;
  margin: 8px 0;
}

.html-fallback td,
.html-fallback th {
  padding: 8px;
  border: 1px solid currentColor;
  text-align: left;
}

.html-fallback a {
  color: #0b63ce;
  text-underline-offset: 2px;
}

.html-fallback--dark a {
  color: #8cc8ff;
}

.html-fallback pre {
  white-space: pre-wrap;
  background: rgba(127, 127, 127, 0.12);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}

.html-fallback blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid currentColor;
  background: rgba(127, 127, 127, 0.1);
  font-style: italic;
}
</style>

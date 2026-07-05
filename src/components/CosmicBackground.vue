<template>
  <div :class="rootClasses" aria-hidden="true">
    <div class="cosmic-nebula"></div>
    <div class="cosmic-grid"></div>
    <canvas ref="canvasRef" class="cosmic-canvas"></canvas>
    <div class="cosmic-sweep"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type CosmicVariant = 'workspace' | 'login'
type ParticleType = 'dust' | 'star' | 'glint' | 'comet'

interface Particle {
  type: ParticleType
  x: number
  y: number
  radius: number
  speedX: number
  speedY: number
  alpha: number
  phase: number
  pulseSpeed: number
  drift: number
  color: string
  fadeColor: string
}

const props = withDefaults(defineProps<{
  variant?: CosmicVariant
  density?: number
  overlay?: boolean
}>(), {
  variant: 'workspace',
  density: 1,
  overlay: false
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const rootClasses = computed(() => [
  'cosmic-effects',
  `cosmic-effects--${props.variant}`,
  props.overlay ? 'cosmic-effects--overlay' : ''
])

let context: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let dpr = 1
let animationFrame = 0
let particles: Particle[] = []
let reduceMotionQuery: MediaQueryList | null = null
let reduceMotion = false
let resizeHandler: (() => void) | null = null
let motionHandler: (() => void) | null = null

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

const pickOne = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const colorSets = {
  blue: {
    color: 'rgba(220, 239, 255, 0.92)',
    fadeColor: 'rgba(126, 198, 255, 0)'
  },
  violet: {
    color: 'rgba(242, 221, 255, 0.82)',
    fadeColor: 'rgba(181, 146, 255, 0)'
  },
  warm: {
    color: 'rgba(255, 240, 198, 0.74)',
    fadeColor: 'rgba(255, 240, 198, 0)'
  },
  cyan: {
    color: 'rgba(172, 231, 255, 0.86)',
    fadeColor: 'rgba(126, 198, 255, 0)'
  }
}

function getParticleCount() {
  const mobileRatio = width < 760 ? 0.62 : 1
  const variantRatio = props.variant === 'login' ? 0.82 : 1
  const base = Math.sqrt(width * height) / (props.variant === 'login' ? 12.4 : 11.2)
  return Math.max(28, Math.min(150, Math.round(base * mobileRatio * variantRatio * props.density)))
}

function createParticle(insideViewport = false): Particle {
  const layerScale = props.variant === 'login' ? 0.92 : 1
  const roll = Math.random()
  const type: ParticleType = roll > 0.9 ? 'glint' : roll > 0.56 ? 'star' : roll > 0.16 ? 'dust' : 'comet'
  const palette = pickOne(
    type === 'dust'
      ? [colorSets.blue, colorSets.violet, colorSets.warm]
      : type === 'comet'
        ? [colorSets.blue, colorSets.cyan]
        : [colorSets.blue, colorSets.violet, colorSets.cyan, colorSets.warm]
  )
  const radius = type === 'dust'
    ? randomBetween(0.55, 1.25) * layerScale
    : type === 'comet'
      ? randomBetween(0.95, 1.75) * layerScale
      : type === 'glint'
        ? randomBetween(1.35, 2.55) * layerScale
        : randomBetween(0.95, 2.2) * layerScale

  return {
    type,
    x: insideViewport ? Math.random() * width : randomBetween(-72, width * 0.92),
    y: insideViewport ? Math.random() * height : randomBetween(-46, height * 0.82),
    radius,
    speedX: type === 'comet'
      ? randomBetween(0.26, 0.58) * layerScale
      : type === 'dust'
        ? randomBetween(0.1, 0.34) * layerScale
        : randomBetween(-0.035, 0.07) * layerScale,
    speedY: type === 'comet'
      ? randomBetween(0.06, 0.2) * layerScale
      : type === 'dust'
        ? randomBetween(0.035, 0.14) * layerScale
        : randomBetween(-0.025, 0.055) * layerScale,
    alpha: type === 'dust'
      ? randomBetween(0.42, 0.72)
      : type === 'comet'
        ? randomBetween(0.48, 0.78)
        : randomBetween(0.54, 0.92),
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: randomBetween(0.009, 0.022),
    drift: Math.random() * Math.PI * 2,
    color: palette.color,
    fadeColor: palette.fadeColor
  }
}

function resetParticles() {
  particles = Array.from({ length: getParticleCount() }, () => createParticle(true))
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !context) return

  const bounds = canvas.parentElement?.getBoundingClientRect()
  width = Math.max(1, Math.floor(bounds?.width || window.innerWidth))
  height = Math.max(1, Math.floor(bounds?.height || window.innerHeight))
  dpr = Math.min(window.devicePixelRatio || 1, 2)

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  resetParticles()
}

function drawBackdrop(ctx: CanvasRenderingContext2D, time: number) {
  const mainX = width * (props.variant === 'login' ? 0.72 : 0.66) + Math.sin(time * 0.42) * 28
  const mainY = height * 0.2 + Math.cos(time * 0.35) * 18
  const glow = ctx.createRadialGradient(mainX, mainY, 0, mainX, mainY, Math.min(width, height) * 0.82)

  glow.addColorStop(0, 'rgba(205, 230, 255, 0.22)')
  glow.addColorStop(0.32, 'rgba(181, 146, 255, 0.13)')
  glow.addColorStop(0.62, 'rgba(126, 198, 255, 0.075)')
  glow.addColorStop(1, 'rgba(126, 198, 255, 0)')

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = props.variant === 'login' ? 0.78 : 0.92
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  for (let band = 0; band < 3; band += 1) {
    const offset = (band - 1) * height * 0.055 + Math.sin(time * 0.9 + band) * 18
    const gradient = ctx.createLinearGradient(0, height * 0.66 + offset, width, height * 0.2 + offset)
    gradient.addColorStop(0, 'rgba(126, 198, 255, 0)')
    gradient.addColorStop(0.3, band === 1 ? 'rgba(126, 198, 255, 0.15)' : 'rgba(126, 198, 255, 0.09)')
    gradient.addColorStop(0.52, band === 1 ? 'rgba(242, 221, 255, 0.14)' : 'rgba(255, 240, 198, 0.07)')
    gradient.addColorStop(0.8, 'rgba(205, 230, 255, 0.08)')
    gradient.addColorStop(1, 'rgba(126, 198, 255, 0)')

    ctx.globalAlpha = band === 1 ? 0.78 : 0.46
    ctx.strokeStyle = gradient
    ctx.lineWidth = Math.max(24, height * (band === 1 ? 0.07 : 0.04))
    ctx.shadowBlur = band === 1 ? 34 : 20
    ctx.shadowColor = 'rgba(126, 198, 255, 0.46)'
    ctx.beginPath()
    ctx.moveTo(-width * 0.08, height * (0.62 + band * 0.02) + offset)
    ctx.bezierCurveTo(
      width * 0.24,
      height * (0.53 + band * 0.015) + offset,
      width * 0.58,
      height * (0.32 - band * 0.02) - offset * 0.08,
      width * 1.08,
      height * (0.2 + band * 0.04) + offset * 0.18
    )
    ctx.stroke()
  }

  ctx.restore()
}

function updateParticle(particle: Particle) {
  particle.drift += particle.pulseSpeed
  particle.x += particle.speedX + Math.sin(particle.drift * 0.7) * 0.04
  particle.y += particle.speedY + Math.cos(particle.drift * 0.5) * 0.025

  if (particle.x > width + 96 || particle.x < -96 || particle.y > height + 96 || particle.y < -96) {
    return createParticle(false)
  }

  return particle
}

function drawLinks(ctx: CanvasRenderingContext2D) {
  const points = particles.filter((particle) => particle.type === 'star' || particle.type === 'glint').slice(0, 62)
  const maxDistance = width < 760 ? 82 : props.variant === 'login' ? 108 : 128

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = 'rgba(220, 239, 255, 0.9)'
  ctx.lineWidth = 0.62

  for (let outer = 0; outer < points.length; outer += 1) {
    for (let inner = outer + 1; inner < points.length; inner += 1) {
      const first = points[outer]
      const second = points[inner]
      const distance = Math.hypot(first.x - second.x, first.y - second.y)

      if (distance > maxDistance) continue

      ctx.globalAlpha = (1 - distance / maxDistance) * 0.18
      ctx.beginPath()
      ctx.moveTo(first.x, first.y)
      ctx.lineTo(second.x, second.y)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  const pulse = 0.72 + Math.sin(particle.drift + particle.phase) * 0.28
  const alpha = particle.alpha * pulse

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha
  ctx.strokeStyle = particle.color
  ctx.fillStyle = particle.color

  if (particle.type === 'dust' || particle.type === 'comet') {
    const tail = particle.type === 'comet' ? 42 + particle.radius * 26 : 18 + particle.radius * 14
    const tailY = tail * 0.34
    const gradient = ctx.createLinearGradient(particle.x, particle.y, particle.x - tail, particle.y - tailY)
    gradient.addColorStop(0, particle.color)
    gradient.addColorStop(1, particle.fadeColor)

    ctx.strokeStyle = gradient
    ctx.lineWidth = Math.max(particle.type === 'comet' ? 1.05 : 0.72, particle.radius * (particle.type === 'comet' ? 1.18 : 0.95))
    ctx.shadowBlur = particle.type === 'comet' ? 12 : 7
    ctx.shadowColor = 'rgba(126, 198, 255, 0.55)'
    ctx.beginPath()
    ctx.moveTo(particle.x - tail, particle.y - tailY)
    ctx.lineTo(particle.x, particle.y)
    ctx.stroke()

    if (particle.type === 'comet') {
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.radius * 1.45, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
    return
  }

  ctx.shadowBlur = particle.type === 'glint' ? 12 : 7
  ctx.shadowColor = particle.color
  ctx.beginPath()
  ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2)
  ctx.fill()

  if (particle.type === 'glint') {
    ctx.globalAlpha = alpha * 0.72
    ctx.lineWidth = 0.72
    ctx.beginPath()
    ctx.moveTo(particle.x - particle.radius * 6.2, particle.y)
    ctx.lineTo(particle.x + particle.radius * 6.2, particle.y)
    ctx.moveTo(particle.x, particle.y - particle.radius * 6.2)
    ctx.lineTo(particle.x, particle.y + particle.radius * 6.2)
    ctx.stroke()
  }

  ctx.restore()
}

function renderFrame() {
  if (!context) return

  const time = performance.now() * 0.00022
  context.clearRect(0, 0, width, height)
  if (!props.overlay) {
    drawBackdrop(context, time)
  }

  if (!reduceMotion) {
    particles = particles.map(updateParticle)
  }

  drawLinks(context)
  particles.forEach((particle) => drawParticle(context as CanvasRenderingContext2D, particle))
}

function tick() {
  animationFrame = 0
  renderFrame()

  if (!reduceMotion) {
    animationFrame = window.requestAnimationFrame(tick)
  }
}

function startAnimation() {
  if (!animationFrame) {
    animationFrame = window.requestAnimationFrame(tick)
  }
}

function stopAnimation() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  context = canvas.getContext('2d', { alpha: true })
  if (!context) return

  reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduceMotion = reduceMotionQuery.matches

  resizeHandler = () => {
    resizeCanvas()
    renderFrame()
  }

  motionHandler = () => {
    reduceMotion = Boolean(reduceMotionQuery?.matches)
    resetParticles()
    renderFrame()

    if (reduceMotion) {
      stopAnimation()
    } else {
      startAnimation()
    }
  }

  window.addEventListener('resize', resizeHandler, { passive: true })
  reduceMotionQuery.addEventListener('change', motionHandler)

  resizeCanvas()
  renderFrame()

  if (!reduceMotion) {
    startAnimation()
  }
})

onUnmounted(() => {
  stopAnimation()

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }

  if (reduceMotionQuery && motionHandler) {
    reduceMotionQuery.removeEventListener('change', motionHandler)
  }
})
</script>

<style scoped>
.cosmic-effects {
  position: absolute;
  inset: 0;
  z-index: var(--cosmic-z-index, 0);
  overflow: hidden;
  pointer-events: none;
  opacity: var(--cosmic-opacity, 0.9);
  contain: layout paint style;
}

.cosmic-canvas,
.cosmic-nebula,
.cosmic-grid,
.cosmic-sweep {
  position: absolute;
  inset: 0;
}

.cosmic-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.cosmic-nebula {
  inset: -12%;
  background:
    linear-gradient(112deg, transparent 12%, rgba(126, 198, 255, 0.16) 38%, rgba(242, 221, 255, 0.12) 52%, transparent 78%),
    linear-gradient(68deg, transparent 18%, rgba(255, 240, 198, 0.08) 44%, rgba(126, 198, 255, 0.12) 70%, transparent 92%);
  opacity: 0.78;
  transform: translate3d(-1.5%, 0, 0) rotate(-1deg);
  animation: cosmicNebulaDrift 22s ease-in-out infinite alternate;
}

.cosmic-grid {
  inset: -10%;
  background:
    repeating-linear-gradient(100deg, rgba(220, 239, 255, 0.105) 0 1px, transparent 1px 92px),
    repeating-linear-gradient(8deg, rgba(126, 198, 255, 0.07) 0 1px, transparent 1px 126px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 40%);
  mask-image: radial-gradient(ellipse at 62% 24%, #000 0%, rgba(0, 0, 0, 0.82) 36%, transparent 78%);
  opacity: 0.54;
  transform: skewX(-12deg);
}

.cosmic-sweep {
  inset: -8%;
  background:
    linear-gradient(116deg, transparent 14%, rgba(220, 239, 255, 0.16) 36%, rgba(126, 198, 255, 0.08) 48%, transparent 66%),
    linear-gradient(76deg, transparent 24%, rgba(242, 221, 255, 0.08) 50%, transparent 72%);
  opacity: 0.6;
  transform: translate3d(-3%, 0, 0);
  animation: cosmicSweep 15s ease-in-out infinite alternate;
}

.cosmic-effects--login {
  opacity: var(--cosmic-opacity, 0.95);
}

.cosmic-effects--overlay {
  mix-blend-mode: screen;
}

.cosmic-effects--overlay .cosmic-nebula,
.cosmic-effects--overlay .cosmic-grid,
.cosmic-effects--overlay .cosmic-sweep {
  display: none;
}

[data-theme="dark"] .cosmic-effects {
  opacity: var(--cosmic-opacity, 0.98);
}

@keyframes cosmicNebulaDrift {
  from {
    transform: translate3d(-2.5%, -1%, 0) rotate(-1.4deg);
  }

  to {
    transform: translate3d(2.2%, 1.2%, 0) rotate(1deg);
  }
}

@keyframes cosmicSweep {
  from {
    transform: translate3d(-4%, -1%, 0) skewX(-2deg);
    opacity: 0.45;
  }

  to {
    transform: translate3d(4%, 1%, 0) skewX(2deg);
    opacity: 0.72;
  }
}

@media (max-width: 640px) {
  .cosmic-grid {
    opacity: 0.38;
  }

  .cosmic-sweep {
    opacity: 0.42;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-nebula,
  .cosmic-sweep {
    animation: none;
  }
}
</style>

import { onMounted, onUnmounted, watch, type Ref } from 'vue'

type ParticleType = 'dust' | 'star' | 'glint' | 'comet'

interface GalaxyParticle {
  type: ParticleType
  x: number
  y: number
  radius: number
  speedX: number
  speedY: number
  alpha: number
  drift: number
  phase: number
  pulseSpeed: number
  color: string
}

const palette = ['#f8fdff', '#dcefff', '#a9d8ff', '#cde6ff', '#f2ddff', '#fff0c6']

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

const pickOne = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]

export function useFrostParticles(canvasRef: Ref<HTMLCanvasElement | null>, enabled: Readonly<Ref<boolean>>) {
  let context: CanvasRenderingContext2D | null = null
  let reduceMotionQuery: MediaQueryList | null = null
  let animationFrame = 0
  let resizeFrame = 0
  let width = 0
  let height = 0
  let dpr = 1
  let particles: GalaxyParticle[] = []

  const shouldRun = () => {
    return Boolean(canvasRef.value && enabled.value && !document.hidden && !reduceMotionQuery?.matches)
  }

  const getParticleCount = () => {
    const areaRatio = Math.min(1.25, Math.max(0.58, (width * height) / (1440 * 900)))
    const mobileRatio = width < 760 ? 0.52 : width < 1180 ? 0.78 : 1
    const coreRatio = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 0.78 : 1
    return Math.max(width < 760 ? 36 : 82, Math.round(128 * areaRatio * mobileRatio * coreRatio))
  }

  const createParticle = (insideViewport = false): GalaxyParticle => {
    const mobile = width < 760
    const roll = Math.random()
    const type: ParticleType = roll > 0.91 ? 'glint' : roll > 0.76 ? 'star' : roll > 0.18 ? 'dust' : 'comet'
    const layerScale = mobile ? 0.78 : 1
    const x = insideViewport
      ? Math.random() * width
      : type === 'comet'
        ? randomBetween(width * 0.78, width + 90)
        : randomBetween(-90, width + 90)
    const y = insideViewport ? randomBetween(0, height * 0.92) : randomBetween(-40, height * 0.82)

    if (type === 'comet') {
      return {
        type,
        x,
        y,
        radius: randomBetween(0.8, 1.45) * layerScale,
        speedX: randomBetween(-0.16, -0.08) * layerScale,
        speedY: randomBetween(0.035, 0.105) * layerScale,
        alpha: randomBetween(0.24, 0.48),
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: randomBetween(0.008, 0.018),
        color: pickOne(['#dcefff', '#a9d8ff', '#f8fdff'])
      }
    }

    const radius = type === 'dust'
      ? randomBetween(0.42, 1.05) * layerScale
      : type === 'glint'
        ? randomBetween(0.95, 1.75) * layerScale
        : randomBetween(0.75, 1.45) * layerScale

    return {
      type,
      x,
      y,
      radius,
      speedX: (type === 'dust' ? randomBetween(0.08, 0.22) : randomBetween(-0.026, 0.052)) * layerScale,
      speedY: (type === 'dust' ? randomBetween(0.016, 0.07) : randomBetween(-0.018, 0.04)) * layerScale,
      alpha: type === 'dust' ? randomBetween(0.2, 0.46) : type === 'glint' ? randomBetween(0.46, 0.76) : randomBetween(0.32, 0.64),
      drift: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: randomBetween(0.009, 0.026),
      color: pickOne(palette)
    }
  }

  const resetParticles = () => {
    particles = Array.from({ length: getParticleCount() }, () => createParticle(true))
    const canvas = canvasRef.value
    if (canvas) canvas.dataset.particleCount = String(particles.length)
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.value
    if (!canvas || !context) return

    width = Math.max(1, window.innerWidth)
    height = Math.max(1, window.innerHeight)
    dpr = Math.min(window.devicePixelRatio || 1, width < 760 ? 1.25 : 1.6)

    canvas.hidden = false
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    resetParticles()
  }

  const drawGalaxyVeil = () => {
    if (!context) return

    const time = performance.now() * 0.00016
    context.save()
    context.globalCompositeOperation = 'screen'

    for (let band = 0; band < 2; band += 1) {
      const yBase = height * (0.18 + band * 0.3)
      const gradient = context.createLinearGradient(0, yBase, width, yBase + height * 0.1)
      gradient.addColorStop(0, 'rgba(126, 198, 255, 0)')
      gradient.addColorStop(0.42, band === 0 ? 'rgba(184, 213, 255, 0.068)' : 'rgba(242, 221, 255, 0.05)')
      gradient.addColorStop(1, 'rgba(126, 198, 255, 0)')

      context.globalAlpha = width < 760 ? 0.34 : 0.48
      context.strokeStyle = gradient
      context.lineWidth = band === 0 ? 26 : 18
      context.beginPath()

      for (let x = -60; x <= width + 80; x += 84) {
        const y = yBase + Math.sin(x * 0.006 + time * (1.8 + band * 0.4) + band * 1.7) * (18 + band * 8)
        if (x === -60) context.moveTo(x, y)
        else context.lineTo(x, y)
      }

      context.stroke()
    }

    context.restore()
  }

  const drawLinks = () => {
    if (!context) return

    const points = particles
      .filter((particle) => particle.type === 'star' || particle.type === 'glint')
      .slice(0, width < 760 ? 22 : 42)
    const maxDistance = width < 760 ? 82 : 118

    context.save()
    context.globalCompositeOperation = 'screen'
    context.strokeStyle = '#dcefff'
    context.lineWidth = 0.52

    for (let outer = 0; outer < points.length; outer += 1) {
      for (let inner = outer + 1; inner < points.length; inner += 1) {
        const first = points[outer]
        const second = points[inner]
        const distance = Math.hypot(first.x - second.x, first.y - second.y)
        if (distance > maxDistance) continue

        context.globalAlpha = (1 - distance / maxDistance) * (width < 760 ? 0.08 : 0.12)
        context.beginPath()
        context.moveTo(first.x, first.y)
        context.lineTo(second.x, second.y)
        context.stroke()
      }
    }

    context.restore()
  }

  const getReadabilityScale = (particle: GalaxyParticle) => {
    const margin = width < 760 ? 40 : 76
    const edgeZone = particle.x < margin || particle.x > width - margin || particle.y < margin || particle.y > height - margin
    if (edgeZone) return 1

    const readingZone = particle.x > width * 0.14 && particle.x < width * 0.88 && particle.y > height * 0.16 && particle.y < height * 0.88
    if (!readingZone) return 0.88

    if (particle.type === 'glint') return 0.68
    if (particle.type === 'star') return 0.74
    return 0.82
  }

  const drawParticle = (particle: GalaxyParticle) => {
    if (!context) return

    const pulse = 0.72 + Math.sin(particle.drift + particle.phase) * 0.28
    const alpha = particle.alpha * pulse * getReadabilityScale(particle)

    context.save()
    context.globalCompositeOperation = 'lighter'
    context.globalAlpha = alpha
    context.fillStyle = particle.color
    context.strokeStyle = particle.color

    if (particle.type === 'comet' || particle.type === 'dust') {
      const tail = particle.type === 'comet' ? 20 + particle.radius * 14 : 8 + particle.radius * 8
      const gradient = context.createLinearGradient(particle.x, particle.y, particle.x - tail, particle.y - tail * 0.35)
      gradient.addColorStop(0, particle.color)
      gradient.addColorStop(1, 'rgba(126, 198, 255, 0)')
      context.strokeStyle = gradient
      context.lineWidth = particle.type === 'comet' ? Math.max(0.62, particle.radius * 0.78) : Math.max(0.5, particle.radius * 0.66)
      context.beginPath()
      context.moveTo(particle.x - tail, particle.y - tail * 0.35)
      context.lineTo(particle.x, particle.y)
      context.stroke()
      context.restore()
      return
    }

    context.shadowBlur = particle.type === 'glint' ? 9 : 5
    context.shadowColor = 'rgba(188, 232, 255, 0.6)'
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2)
    context.fill()

    if (particle.type === 'glint') {
      context.globalAlpha = alpha * 0.62
      context.lineWidth = 0.62
      const arm = particle.radius * 5.2
      context.beginPath()
      context.moveTo(particle.x - arm, particle.y)
      context.lineTo(particle.x + arm, particle.y)
      context.moveTo(particle.x, particle.y - arm)
      context.lineTo(particle.x, particle.y + arm)
      context.stroke()
    }

    context.restore()
  }

  const updateParticle = (particle: GalaxyParticle, index: number) => {
    particle.drift += particle.pulseSpeed
    particle.x += particle.speedX + Math.sin(particle.drift * 0.62) * 0.025
    particle.y += particle.speedY + Math.cos(particle.drift * 0.5) * 0.016

    if (particle.x > width + 90 || particle.x < -90 || particle.y < -70 || particle.y > height + 80) {
      particles[index] = createParticle(false)
    }
  }

  const clearCanvas = () => {
    if (context && width && height) context.clearRect(0, 0, width, height)
  }

  const stop = (clear = false) => {
    const canvas = canvasRef.value
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }
    if (resizeFrame) {
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = 0
    }
    if (clear) clearCanvas()
    if (canvas) {
      canvas.hidden = true
      canvas.dataset.particleRunning = 'false'
    }
  }

  const tick = () => {
    if (!shouldRun()) {
      stop(true)
      return
    }

    if (!context) return
    const canvas = canvasRef.value
    if (canvas) canvas.dataset.particleRunning = 'true'

    context.clearRect(0, 0, width, height)
    drawGalaxyVeil()
    particles.forEach(updateParticle)
    drawLinks()
    particles.forEach(drawParticle)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    animationFrame = window.requestAnimationFrame(tick)
  }

  const start = () => {
    if (!shouldRun()) {
      stop(true)
      return
    }

    const canvas = canvasRef.value
    if (!canvas) return

    context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    resizeCanvas()
    if (!animationFrame) animationFrame = window.requestAnimationFrame(tick)
  }

  const handleResize = () => {
    if (!animationFrame) return
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame)
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0
      resizeCanvas()
    })
  }

  const handleVisibilityChange = () => {
    if (document.hidden) stop(false)
    else start()
  }

  const handleMotionChange = () => {
    if (reduceMotionQuery?.matches) stop(true)
    else start()
  }

  onMounted(() => {
    reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    reduceMotionQuery.addEventListener('change', handleMotionChange)
    start()
  })

  watch(enabled, (isEnabled) => {
    if (isEnabled) start()
    else stop(true)
  })

  onUnmounted(() => {
    stop(true)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    reduceMotionQuery?.removeEventListener('change', handleMotionChange)
  })
}

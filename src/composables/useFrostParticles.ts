import { onMounted, onUnmounted, watch, type Ref } from 'vue'

type FrostParticleKind = 'dust' | 'star' | 'glint' | 'crystal' | 'shard' | 'flare'

interface FrostParticle {
  type: FrostParticleKind
  x: number
  y: number
  radius: number
  size: number
  speedX: number
  speedY: number
  alpha: number
  drift: number
  phase: number
  pulseSpeed: number
  rotation: number
  spin: number
  color: string
}

const colors = ['#f8fdff', '#dcefff', '#a9d8ff', '#c7f1ff', '#fff0c6', '#edf7ff']

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
  let particles: FrostParticle[] = []

  const shouldRun = () => {
    return Boolean(canvasRef.value && enabled.value && !document.hidden && !reduceMotionQuery?.matches)
  }

  const getParticleCount = () => {
    const areaRatio = Math.min(1.4, Math.max(0.58, (width * height) / (1440 * 900)))
    const mobileRatio = width < 760 ? 0.58 : width < 1180 ? 0.82 : 1
    const coreRatio = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 0.72 : 1
    return Math.max(width < 760 ? 34 : 72, Math.round(132 * areaRatio * mobileRatio * coreRatio))
  }

  const createParticle = (insideViewport = false): FrostParticle => {
    const mobile = width < 760
    const roll = Math.random()
    const type: FrostParticleKind = roll > 0.955
      ? 'flare'
      : roll > 0.81
        ? 'crystal'
        : roll > 0.68
          ? 'shard'
          : roll > 0.54
            ? 'glint'
            : roll > 0.3
              ? 'star'
              : 'dust'
    const speedScale = mobile ? 0.72 : 1
    const edgeBias = insideViewport && Math.random() > 0.78
    const startX = edgeBias
      ? (Math.random() > 0.5 ? randomBetween(width * 0.68, width + 32) : randomBetween(-32, width * 0.26))
      : Math.random() * width

    const speedX = type === 'dust'
      ? randomBetween(0.14, 0.46) * speedScale
      : type === 'flare'
        ? randomBetween(-0.018, 0.032) * speedScale
        : randomBetween(-0.055, 0.095) * speedScale
    const speedY = type === 'crystal' || type === 'shard'
      ? randomBetween(0.025, 0.105) * speedScale
      : type === 'dust'
        ? randomBetween(0.035, 0.14) * speedScale
        : type === 'flare'
          ? randomBetween(-0.012, 0.032) * speedScale
        : randomBetween(-0.02, 0.055) * speedScale

    const x = insideViewport
      ? startX
      : speedX >= 0
        ? randomBetween(-120, width * 0.12)
        : randomBetween(width * 0.88, width + 120)
    const y = insideViewport ? randomBetween(-20, height * 0.94) : randomBetween(-80, height * 0.82)

    if (type === 'crystal') {
      const size = randomBetween(mobile ? 7.5 : 9.5, mobile ? 13 : 18)
      return {
        type,
        x,
        y,
        radius: size * 0.32,
        size,
        speedX,
        speedY,
        alpha: randomBetween(0.28, 0.58),
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: randomBetween(0.008, 0.018),
        rotation: Math.random() * Math.PI * 2,
        spin: randomBetween(-0.0055, 0.0055),
        color: pickOne(['#dff7ff', '#bde8ff', '#f7fdff'])
      }
    }

    if (type === 'shard') {
      const size = randomBetween(mobile ? 3.6 : 4.4, mobile ? 7.4 : 10)
      return {
        type,
        x,
        y,
        radius: size * 0.45,
        size,
        speedX,
        speedY,
        alpha: randomBetween(0.24, 0.5),
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: randomBetween(0.01, 0.024),
        rotation: Math.random() * Math.PI * 2,
        spin: randomBetween(-0.012, 0.012),
        color: pickOne(['#e8fbff', '#bfeeff', '#d8f2ff'])
      }
    }

    if (type === 'flare') {
      const radius = randomBetween(mobile ? 1.8 : 2.2, mobile ? 3 : 3.8)
      return {
        type,
        x,
        y,
        radius,
        size: radius,
        speedX,
        speedY,
        alpha: randomBetween(0.58, 0.94),
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: randomBetween(0.026, 0.052),
        rotation: Math.random() * Math.PI * 2,
        spin: randomBetween(-0.01, 0.01),
        color: pickOne(['#ffffff', '#e4f7ff', '#fff2c9'])
      }
    }

    const radius = type === 'dust'
      ? randomBetween(0.7, 1.55)
      : type === 'glint'
        ? randomBetween(1.7, 3.1)
        : randomBetween(1.1, 2.65)

    return {
      type,
      x,
      y,
      radius,
      size: radius,
      speedX,
      speedY,
      alpha: type === 'dust' ? randomBetween(0.22, 0.54) : type === 'glint' ? randomBetween(0.56, 0.96) : randomBetween(0.42, 0.84),
      drift: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: randomBetween(0.012, 0.032),
      rotation: Math.random() * Math.PI * 2,
      spin: randomBetween(-0.002, 0.002),
      color: pickOne(colors)
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
    dpr = Math.min(window.devicePixelRatio || 1, width < 760 ? 1.35 : 1.75)

    canvas.hidden = false
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    resetParticles()
  }

  const drawColdBands = () => {
    if (!context) return

    const time = performance.now() * 0.00018
    context.save()
    context.globalCompositeOperation = 'screen'

    for (let band = 0; band < 3; band += 1) {
      const yBase = height * (0.12 + band * 0.23)
      const gradient = context.createLinearGradient(0, yBase, width, yBase + height * 0.08)
      gradient.addColorStop(0, 'rgba(126, 198, 255, 0)')
      gradient.addColorStop(0.44, band === 0 ? 'rgba(188, 226, 255, 0.11)' : band === 1 ? 'rgba(215, 237, 255, 0.072)' : 'rgba(170, 216, 255, 0.05)')
      gradient.addColorStop(1, 'rgba(126, 198, 255, 0)')

      context.globalAlpha = width < 760 ? 0.44 : 0.68
      context.strokeStyle = gradient
      context.lineWidth = band === 0 ? 46 : band === 1 ? 34 : 24
      context.beginPath()

      for (let x = -80; x <= width + 120; x += 68) {
        const y = yBase + Math.sin(x * 0.006 + time * (1.8 + band * 0.5) + band * 1.7) * (26 + band * 10)
        if (x === -80) context.moveTo(x, y)
        else context.lineTo(x, y)
      }

      context.stroke()
    }

    context.restore()
  }

  const drawLinks = () => {
    if (!context) return

    const points = particles
      .filter((particle) => particle.type === 'star' || particle.type === 'glint' || particle.type === 'crystal' || particle.type === 'flare')
      .slice(0, width < 760 ? 32 : 62)
    const maxDistance = width < 760 ? 88 : 128

    context.save()
    context.globalCompositeOperation = 'screen'
    context.strokeStyle = '#dcefff'
    context.lineWidth = 0.55

    for (let outer = 0; outer < points.length; outer += 1) {
      for (let inner = outer + 1; inner < points.length; inner += 1) {
        const first = points[outer]
        const second = points[inner]
        const distance = Math.hypot(first.x - second.x, first.y - second.y)
        if (distance > maxDistance) continue

        context.globalAlpha = (1 - distance / maxDistance) * 0.13
        context.beginPath()
        context.moveTo(first.x, first.y)
        context.lineTo(second.x, second.y)
        context.stroke()
      }
    }

    context.restore()
  }

  const getReadabilityScale = (particle: FrostParticle) => {
    const margin = width < 760 ? 48 : 92
    const edgeZone = particle.x < margin || particle.x > width - margin || particle.y < margin * 1.3 || particle.y > height - margin
    if (edgeZone) return 1.08

    const readingZone = particle.x > width * 0.16 && particle.x < width * 0.86 && particle.y > height * 0.18 && particle.y < height * 0.86
    if (!readingZone) return 0.96

    if (particle.type === 'flare') return 0.72
    if (particle.type === 'crystal' || particle.type === 'shard') return 0.8
    if (particle.type === 'glint') return 0.84
    return 0.9
  }

  const drawCrystal = (particle: FrostParticle, pulse: number, opacityScale: number) => {
    if (!context) return

    const branch = particle.size * 0.34
    context.save()
    context.translate(particle.x, particle.y)
    context.rotate(particle.rotation)
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = particle.alpha * opacityScale * (0.7 + pulse * 0.38)
    context.strokeStyle = particle.color
    context.lineWidth = Math.max(0.55, particle.size * 0.08)
    context.shadowBlur = 8
    context.shadowColor = 'rgba(188, 232, 255, 0.58)'
    context.lineCap = 'round'

    for (let arm = 0; arm < 6; arm += 1) {
      const angle = (Math.PI * 2 * arm) / 6
      const x = Math.cos(angle) * particle.size
      const y = Math.sin(angle) * particle.size
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(x, y)
      context.stroke()

      const jointX = Math.cos(angle) * particle.size * 0.58
      const jointY = Math.sin(angle) * particle.size * 0.58
      const branchAngleA = angle + Math.PI * 0.24
      const branchAngleB = angle - Math.PI * 0.24
      context.beginPath()
      context.moveTo(jointX, jointY)
      context.lineTo(jointX + Math.cos(branchAngleA) * branch, jointY + Math.sin(branchAngleA) * branch)
      context.moveTo(jointX, jointY)
      context.lineTo(jointX + Math.cos(branchAngleB) * branch, jointY + Math.sin(branchAngleB) * branch)
      context.stroke()
    }

    context.globalAlpha *= 0.72
    context.beginPath()
    context.arc(0, 0, Math.max(0.8, particle.size * 0.1), 0, Math.PI * 2)
    context.stroke()
    context.restore()
  }

  const drawShard = (particle: FrostParticle, pulse: number, opacityScale: number) => {
    if (!context) return

    context.save()
    context.translate(particle.x, particle.y)
    context.rotate(particle.rotation)
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = particle.alpha * opacityScale * (0.72 + pulse * 0.32)
    context.fillStyle = particle.color
    context.strokeStyle = 'rgba(255, 255, 255, 0.72)'
    context.shadowBlur = 9
    context.shadowColor = 'rgba(184, 232, 255, 0.66)'
    context.lineWidth = 0.65
    context.beginPath()
    context.moveTo(0, -particle.size)
    context.lineTo(particle.size * 0.52, 0)
    context.lineTo(0, particle.size)
    context.lineTo(-particle.size * 0.46, 0)
    context.closePath()
    context.fill()
    context.globalAlpha *= 0.56
    context.stroke()
    context.beginPath()
    context.moveTo(0, -particle.size * 0.72)
    context.lineTo(0, particle.size * 0.72)
    context.moveTo(-particle.size * 0.28, 0)
    context.lineTo(particle.size * 0.32, 0)
    context.stroke()
    context.restore()
  }

  const drawFlare = (particle: FrostParticle, pulse: number, opacityScale: number) => {
    if (!context) return

    const arm = particle.radius * (10 + pulse * 6)
    const shortArm = particle.radius * (5.5 + pulse * 3)
    const glowRadius = particle.radius * (8 + pulse * 5)

    context.save()
    context.translate(particle.x, particle.y)
    context.rotate(particle.rotation)
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, glowRadius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    gradient.addColorStop(0.34, 'rgba(190, 232, 255, 0.28)')
    gradient.addColorStop(1, 'rgba(126, 198, 255, 0)')
    context.globalCompositeOperation = 'lighter'
    context.globalAlpha = particle.alpha * opacityScale * (0.42 + pulse * 0.58)
    context.fillStyle = gradient
    context.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2)
    context.strokeStyle = particle.color
    context.lineWidth = 0.85
    context.shadowBlur = 16
    context.shadowColor = 'rgba(210, 240, 255, 0.86)'
    context.beginPath()
    context.moveTo(-arm, 0)
    context.lineTo(arm, 0)
    context.moveTo(0, -arm)
    context.lineTo(0, arm)
    context.moveTo(-shortArm, -shortArm)
    context.lineTo(shortArm, shortArm)
    context.moveTo(shortArm, -shortArm)
    context.lineTo(-shortArm, shortArm)
    context.stroke()
    context.restore()
  }

  const drawParticle = (particle: FrostParticle) => {
    if (!context) return

    const pulse = 0.66 + Math.sin(particle.drift + particle.phase) * 0.34
    const opacityScale = getReadabilityScale(particle)
    context.save()
    context.globalCompositeOperation = 'lighter'
    context.globalAlpha = particle.alpha * pulse * opacityScale
    context.fillStyle = particle.color
    context.strokeStyle = particle.color

    if (particle.type === 'crystal') {
      context.restore()
      drawCrystal(particle, pulse, opacityScale)
      return
    }

    if (particle.type === 'shard') {
      context.restore()
      drawShard(particle, pulse, opacityScale)
      return
    }

    if (particle.type === 'flare') {
      context.restore()
      drawFlare(particle, pulse, opacityScale)
      return
    }

    if (particle.type === 'dust') {
      const tail = 16 + particle.radius * 18
      const gradient = context.createLinearGradient(particle.x, particle.y, particle.x - tail, particle.y - tail * 0.32)
      gradient.addColorStop(0, particle.color)
      gradient.addColorStop(1, 'rgba(126, 198, 255, 0)')
      context.strokeStyle = gradient
      context.lineWidth = Math.max(0.65, particle.radius * 1.05)
      context.beginPath()
      context.moveTo(particle.x - tail, particle.y - tail * 0.32)
      context.lineTo(particle.x, particle.y)
      context.stroke()
      context.restore()
      return
    }

    context.shadowBlur = particle.type === 'glint' ? 16 : 10
    context.shadowColor = 'rgba(188, 232, 255, 0.8)'
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2)
    context.fill()

    if (particle.type === 'glint') {
      context.globalAlpha *= 0.74
      context.lineWidth = 0.86
      context.beginPath()
      context.moveTo(particle.x - particle.radius * 7.6, particle.y)
      context.lineTo(particle.x + particle.radius * 7.6, particle.y)
      context.moveTo(particle.x, particle.y - particle.radius * 7.6)
      context.lineTo(particle.x, particle.y + particle.radius * 7.6)
      context.stroke()
    }

    context.restore()
  }

  const updateParticle = (particle: FrostParticle, index: number) => {
    particle.drift += particle.pulseSpeed
    particle.rotation += particle.spin
    particle.x += particle.speedX + Math.sin(particle.drift * 0.7) * 0.045
    particle.y += particle.speedY + Math.cos(particle.drift * 0.52) * 0.026

    if (particle.x > width + 110 || particle.x < -110 || particle.y < -90 || particle.y > height + 90) {
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
    drawColdBands()
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

// Juice: particles, floating text, rings, screen shake, flashes and hit-stop.
// The stage owns one Fx per game, updates it every frame (also during a
// hit-stop) and draws it on top of the game.

import { TAU } from './math.ts'
import { drawText } from './text.ts'

export type ParticleShape = 'circle' | 'square' | 'star' | 'spark' | 'heart' | 'ring'

export interface BurstOptions {
  count?: number
  // One colour, or a list to pick from per particle.
  color?: string | readonly string[]
  // Logical pixels per second; each particle gets 40% to 100% of it.
  speed?: number
  // Seconds.
  life?: number
  size?: number
  // Pixels per second squared, downward.
  gravity?: number
  shape?: ParticleShape
  // Direction (radians, 0 is right, -PI/2 is up) and how wide the cone is.
  angle?: number
  spread?: number
  // 1 keeps speed; 0.9 slows quickly. Applied per 1/60 s.
  drag?: number
}

export interface TextOptions {
  color?: string
  size?: number
  life?: number
  // Pixels it floats up over its life.
  rise?: number
  outline?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  gravity: number
  drag: number
  shape: ParticleShape
  rot: number
  spin: number
}

interface Floater {
  x: number
  y: number
  text: string
  life: number
  max: number
  size: number
  color: string
  outline: string
  rise: number
}

interface Ring {
  x: number
  y: number
  life: number
  max: number
  radius: number
  color: string
  width: number
}

// A floater keeps one sprite for its whole life and scales it while it pops.
function drawTextScaled(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, pop: number, color: string, outline: string): void {
  if (pop === 1) {
    drawText(g, text, x, y, size, color, outline)
    return
  }
  if (pop <= 0.02) return
  g.save()
  g.translate(x, y)
  g.scale(pop, pop)
  drawText(g, text, 0, 0, size, color, outline)
  g.restore()
}

const CONFETTI = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff', '#ff7ac8']
const MAX_PARTICLES = 900

export interface Fx {
  // A puff of particles. The workhorse: call it on every hit, pop and landing.
  burst(x: number, y: number, options?: BurstOptions): void
  // Multicolour squares that flutter down: for wins.
  confetti(x: number, y: number, count?: number): void
  // An expanding ring: for taps, shockwaves, "here".
  ring(x: number, y: number, color?: string, radius?: number, seconds?: number): void
  // Text that pops in and floats up ("+1", "WOW!", an emoji).
  text(x: number, y: number, text: string, options?: TextOptions): void
  // Shake the whole field. 4 is a nudge, 10 a hit, 20 an explosion.
  shake(pixels: number, seconds?: number): void
  // Tint the whole field for a moment.
  flash(color?: string, alpha?: number, seconds?: number): void
  // Freeze the game (not the fx) for a few frames so a hit lands. 40 to 90 ms.
  hitstop(ms: number): void
  // Everything below is for the stage.
  update(dt: number): void
  draw(g: CanvasRenderingContext2D): void
  drawFlash(g: CanvasRenderingContext2D, w: number, h: number): void
  readonly shakeX: number
  readonly shakeY: number
  // Seconds of hit-stop left.
  readonly frozen: number
  clear(): void
}

function starPath(g: CanvasRenderingContext2D, r: number): void {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.45
    if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  g.closePath()
}

function heartPath(g: CanvasRenderingContext2D, r: number): void {
  g.beginPath()
  g.moveTo(0, r * 0.9)
  g.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.7, -r * 1.3, 0, -r * 0.4)
  g.bezierCurveTo(r * 0.7, -r * 1.3, r * 1.6, -r * 0.2, 0, r * 0.9)
  g.closePath()
}

export function createFx(): Fx {
  const particles: Particle[] = []
  const floaters: Floater[] = []
  const rings: Ring[] = []
  let shakeAmp = 0
  let shakeLeft = 0
  let shakeTotal = 0
  let shakeX = 0
  let shakeY = 0
  let flashColor = '#ffffff'
  let flashAlpha = 0
  let flashLeft = 0
  let flashTotal = 0
  let frozen = 0

  return {
    burst(x, y, options = {}) {
      const count = options.count ?? 12
      const speed = options.speed ?? 320
      const life = options.life ?? 0.6
      const size = options.size ?? 8
      const spread = options.spread ?? TAU
      const angle = options.angle ?? 0
      for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) particles.shift()
        const a = angle + (Math.random() - 0.5) * spread
        const v = speed * (0.4 + Math.random() * 0.6)
        const color = options.color ?? '#ffffff'
        particles.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: life * (0.6 + Math.random() * 0.4),
          max: life,
          size: size * (0.6 + Math.random() * 0.8),
          color: typeof color === 'string' ? color : color[Math.floor(Math.random() * color.length)]!,
          gravity: options.gravity ?? 500,
          drag: options.drag ?? 0.98,
          shape: options.shape ?? 'circle',
          rot: Math.random() * TAU,
          spin: (Math.random() - 0.5) * 12,
        })
      }
    },
    confetti(x, y, count = 60) {
      this.burst(x, y, {
        count,
        color: CONFETTI,
        speed: 700,
        life: 1.6,
        size: 11,
        gravity: 700,
        shape: 'square',
        angle: -Math.PI / 2,
        spread: Math.PI * 1.2,
        drag: 0.97,
      })
    },
    ring(x, y, color = '#ffffff', radius = 90, seconds = 0.4) {
      rings.push({ x, y, life: seconds, max: seconds, radius, color, width: 8 })
    },
    text(x, y, text, options = {}) {
      const life = options.life ?? 0.9
      floaters.push({
        x,
        y,
        text,
        life,
        max: life,
        size: options.size ?? 44,
        color: options.color ?? '#ffffff',
        outline: options.outline ?? 'rgba(30,20,40,0.85)',
        rise: options.rise ?? 80,
      })
    },
    shake(pixels, seconds = 0.25) {
      // A bigger shake replaces a smaller one; a smaller one never cuts a big one short.
      if (pixels >= shakeAmp * (shakeTotal > 0 ? shakeLeft / shakeTotal : 0)) {
        shakeAmp = pixels
        shakeLeft = seconds
        shakeTotal = seconds
      }
    },
    flash(color = '#ffffff', alpha = 0.5, seconds = 0.15) {
      flashColor = color
      flashAlpha = alpha
      flashLeft = seconds
      flashTotal = seconds
    },
    hitstop(ms) {
      frozen = Math.max(frozen, Math.min(ms, 250) / 1000)
    },
    update(dt) {
      if (frozen > 0) frozen = Math.max(0, frozen - dt)
      const dragPow = dt * 60
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!
        p.life -= dt
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }
        const drag = p.drag ** dragPow
        p.vx *= drag
        p.vy = p.vy * drag + p.gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.spin * dt
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i]!
        f.life -= dt
        if (f.life <= 0) floaters.splice(i, 1)
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]!
        r.life -= dt
        if (r.life <= 0) rings.splice(i, 1)
      }
      if (shakeLeft > 0) {
        shakeLeft = Math.max(0, shakeLeft - dt)
        const k = shakeTotal > 0 ? (shakeLeft / shakeTotal) ** 2 : 0
        shakeX = (Math.random() * 2 - 1) * shakeAmp * k
        shakeY = (Math.random() * 2 - 1) * shakeAmp * k
        if (shakeLeft === 0) shakeAmp = 0
      } else {
        shakeX = 0
        shakeY = 0
      }
      if (flashLeft > 0) flashLeft = Math.max(0, flashLeft - dt)
    },
    draw(g) {
      for (const r of rings) {
        const t = 1 - r.life / r.max
        g.globalAlpha = 1 - t
        g.strokeStyle = r.color
        g.lineWidth = r.width * (1 - t) + 1
        g.beginPath()
        g.arc(r.x, r.y, r.radius * (1 - (1 - t) ** 3), 0, TAU)
        g.stroke()
      }
      for (const p of particles) {
        const k = p.life / p.max
        g.globalAlpha = Math.min(1, k * 2.5)
        g.fillStyle = p.color
        const s = p.size * (0.4 + 0.6 * k)
        if (p.shape === 'circle') {
          g.beginPath()
          g.arc(p.x, p.y, s / 2, 0, TAU)
          g.fill()
          continue
        }
        g.save()
        g.translate(p.x, p.y)
        if (p.shape === 'spark') {
          g.rotate(Math.atan2(p.vy, p.vx))
          g.fillRect(-s * 1.4, -s * 0.22, s * 2.8, s * 0.44)
        } else {
          g.rotate(p.rot)
          if (p.shape === 'square') {
            // Flutter: squash one axis over time, like paper turning.
            g.scale(1, Math.cos(p.rot * 2.3))
            g.fillRect(-s / 2, -s / 2, s, s)
          } else if (p.shape === 'star') {
            starPath(g, s * 0.8)
            g.fill()
          } else if (p.shape === 'heart') {
            heartPath(g, s * 0.6)
            g.fill()
          } else {
            g.strokeStyle = p.color
            g.lineWidth = Math.max(1.5, s * 0.25)
            g.beginPath()
            g.arc(0, 0, s * 0.7, 0, TAU)
            g.stroke()
          }
        }
        g.restore()
      }
      for (const f of floaters) {
        const t = 1 - f.life / f.max
        // Pop in with overshoot, hold, fade out at the end.
        const pop = t < 0.18 ? 1 + 2.70158 * (t / 0.18 - 1) ** 3 + 1.70158 * (t / 0.18 - 1) ** 2 : 1
        g.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1
        const y = f.y - f.rise * (1 - (1 - t) ** 2)
        // A cached sprite: stroking text every frame is slow.
        drawTextScaled(g, f.text, f.x, y, f.size, pop, f.color, f.outline)
      }
      g.globalAlpha = 1
    },
    drawFlash(g, w, h) {
      if (flashLeft <= 0 || flashTotal <= 0) return
      g.globalAlpha = flashAlpha * (flashLeft / flashTotal)
      g.fillStyle = flashColor
      g.fillRect(0, 0, w, h)
      g.globalAlpha = 1
    },
    get shakeX() {
      return shakeX
    },
    get shakeY() {
      return shakeY
    },
    get frozen() {
      return frozen
    },
    clear() {
      particles.length = 0
      floaters.length = 0
      rings.length = 0
      shakeAmp = 0
      shakeLeft = 0
      shakeX = 0
      shakeY = 0
      flashLeft = 0
      frozen = 0
    },
  }
}

// The sky behind the beach, painted in 2D: a wash that turns from morning
// blue to rose and gold as the sun is drawn down, soft clouds, the sun itself
// (the one thing in the sky the hand can hold), and the warm haze the low sun
// lays back over the picture.

import { H, W } from '../../kit/types.ts'

type G = CanvasRenderingContext2D
type RGB = [number, number, number]

const TAU = Math.PI * 2

const DAY: RGB[] = [
  [150, 196, 226],
  [200, 226, 234],
  [249, 240, 216],
]
const DUSK: RGB[] = [
  [96, 84, 150],
  [214, 132, 138],
  [255, 200, 118],
]

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
function css(c: RGB, a = 1): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
}

// Sky colours for a dusk amount 0..1: top, middle, horizon.
export function skyColors(k: number): [RGB, RGB, RGB] {
  // The gold arrives before the violet does.
  const low = Math.min(1, k * 1.25)
  const high = Math.max(0, k * 1.4 - 0.4)
  return [mix(DAY[0], DUSK[0], high), mix(DAY[1], DUSK[1], k), mix(DAY[2], DUSK[2], low)]
}

function cloudSprite(seed: number, tint: RGB, shade: RGB): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 420
  c.height = 150
  const g = c.getContext('2d')
  if (!g) return c
  let s = seed
  const r = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 16; i++) {
      const x = 70 + r() * 280
      const y = 78 + (r() - 0.5) * 34 + (pass === 0 ? 10 : 0)
      const rad = 30 + r() * 38
      const grad = g.createRadialGradient(x, y, 0, x, y, rad)
      const col = pass === 0 ? shade : tint
      grad.addColorStop(0, css(col, 0.55))
      grad.addColorStop(0.6, css(col, 0.22))
      grad.addColorStop(1, css(col, 0))
      g.fillStyle = grad
      g.save()
      g.translate(x, y)
      g.scale(1.9, 0.62)
      g.translate(-x, -y)
      g.beginPath()
      g.arc(x, y, rad, 0, TAU)
      g.fill()
      g.restore()
    }
  }
  return c
}

interface Cloud {
  day: HTMLCanvasElement
  dusk: HTMLCanvasElement
  x: number
  y: number
  speed: number
  scale: number
}

interface Blade {
  x: number
  h: number
  lean: number
  w: number
  phase: number
  tone: RGB
}

export interface Sky {
  // Under the beach: the wash, stars, clouds and the sun.
  draw(g: G, k: number, sunX: number, sunY: number, horizon: number, time: number, breathe: number): void
  // Over the beach: haze on the horizon and the low sun's glow.
  drawOver(g: G, k: number, sunX: number, sunY: number, horizon: number): void
  // Marram grass at the two near corners, in front of everything.
  drawGrass(g: G, k: number, time: number): void
  // A breath of wind: the clouds move on a little.
  nudge(): void
}

export function createSky(rand: () => number): Sky {
  const clouds: Cloud[] = []
  for (let i = 0; i < 4; i++) {
    clouds.push({
      day: cloudSprite(11 + i * 97, [255, 253, 246], [226, 234, 238]),
      dusk: cloudSprite(11 + i * 97, [255, 196, 150], [190, 120, 150]),
      x: rand() * W,
      y: 22 + i * 24 + rand() * 12,
      speed: 2.2 + rand() * 2.4,
      scale: 0.7 + rand() * 0.5,
    })
  }
  const stars: [number, number, number][] = []
  for (let i = 0; i < 26; i++) stars.push([rand() * W, rand() * 105, rand() * TAU])
  let push = 0
  let last = 0

  const GREENS: RGB[] = [
    [124, 146, 82],
    [152, 168, 96],
    [183, 186, 122],
    [104, 128, 78],
  ]
  const blades: Blade[] = []
  const tuft = (cx: number, spread: number, tall: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1
      blades.push({ x: cx + u * spread, h: tall * (0.55 + rand() * 0.45) * (1 - Math.abs(u) * 0.35), lean: u * 0.5 + (rand() - 0.5) * 0.3, w: 4 + rand() * 3.5, phase: rand() * TAU, tone: GREENS[Math.floor(rand() * GREENS.length)] })
    }
  }
  tuft(14, 34, 150, 13)
  tuft(74, 22, 82, 7)
  tuft(W - 16, 36, 165, 14)
  tuft(W - 84, 24, 90, 7)
  blades.sort((a, b) => b.h - a.h)

  return {
    nudge() {
      push = 1
    },

    draw(g, k, sunX, sunY, horizon, time, breathe) {
      const dt = Math.min(0.1, Math.max(0, time - last))
      last = time
      push = Math.max(0, push - dt * 0.5)
      const [top, mid, low] = skyColors(k)
      const grad = g.createLinearGradient(0, 0, 0, horizon + 4)
      grad.addColorStop(0, css(top))
      grad.addColorStop(0.55, css(mid))
      grad.addColorStop(1, css(low))
      g.fillStyle = grad
      g.fillRect(0, 0, W, horizon + 40)

      if (k > 0.55) {
        const a = (k - 0.55) / 0.45
        g.fillStyle = '#fff6dc'
        for (const [x, y, ph] of stars) {
          g.globalAlpha = a * (0.25 + 0.3 * Math.sin(time * 0.7 + ph)) * (1 - y / 130)
          g.beginPath()
          g.arc(x, y, 1.5, 0, TAU)
          g.fill()
        }
        g.globalAlpha = 1
      }

      for (const c of clouds) {
        c.x += (c.speed + push * 26) * dt
        const w = 420 * c.scale
        if (c.x > W + 40) c.x = -w - 20
        const y = c.y + (horizon - 150) * 0.2
        if (k < 0.99) {
          g.globalAlpha = (1 - k) * 0.95
          g.drawImage(c.day, c.x, y, w, 150 * c.scale)
        }
        if (k > 0.01) {
          g.globalAlpha = k * 0.9
          g.drawImage(c.dusk, c.x, y, w, 150 * c.scale)
        }
      }
      g.globalAlpha = 1

      // A gull, far off, crossing now and then on still wings.
      const cycle = (time + 9) % 34
      if (cycle < 19 && k < 0.95) {
        const u = cycle / 19
        const gx = -40 + u * (W + 80)
        const gy = 58 + Math.sin(u * 5) * 16 + (horizon - 150) * 0.3
        const flap = Math.sin(time * 2.4) * 0.35 + Math.sin(u * 9) * 0.25
        const span = 15
        g.strokeStyle = css(mix([250, 248, 240], [120, 96, 140], k), 0.9 * (1 - k * 0.3))
        g.lineWidth = 2.6
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(gx - span, gy - flap * 7)
        g.quadraticCurveTo(gx - span * 0.45, gy - 6 - flap * 3, gx, gy)
        g.quadraticCurveTo(gx + span * 0.45, gy - 6 - flap * 3, gx + span, gy - flap * 7)
        g.stroke()
      }

      // The sun: a wide soft halo, a nearer glow, and the disc.
      const r = 44 + k * 14
      const halo = (150 + k * 150) * (1 + 0.05 * breathe)
      const warm: RGB = mix([255, 244, 196], [255, 150, 70], k)
      let rg = g.createRadialGradient(sunX, sunY, r * 0.5, sunX, sunY, halo)
      rg.addColorStop(0, css(mix([255, 250, 220], [255, 206, 120], k), 0.75))
      rg.addColorStop(0.35, css(warm, 0.3))
      rg.addColorStop(1, css(warm, 0))
      g.fillStyle = rg
      g.fillRect(sunX - halo, sunY - halo, halo * 2, halo * 2)
      rg = g.createRadialGradient(sunX - r * 0.15, sunY - r * 0.2, r * 0.1, sunX, sunY, r)
      rg.addColorStop(0, css(mix([255, 254, 236], [255, 240, 176], k)))
      rg.addColorStop(0.75, css(mix([255, 242, 184], [255, 186, 96], k)))
      rg.addColorStop(0.93, css(mix([255, 234, 164], [255, 150, 84], k), 0.95))
      rg.addColorStop(1, css(mix([255, 232, 160], [255, 140, 80], k), 0))
      g.fillStyle = rg
      g.beginPath()
      g.arc(sunX, sunY, r, 0, TAU)
      g.fill()
    },

    drawGrass(g, k, time) {
      const by = H + 12
      const dark: RGB = [84, 58, 96]
      const wind = 1 + push * 2.5
      for (const b of blades) {
        const sway = (Math.sin(time * 0.9 + b.phase) * 0.05 + Math.sin(time * 2.1 + b.phase * 2) * 0.015) * wind
        const tx = b.x + (b.lean + sway) * b.h * 0.6
        const ty = by - b.h
        const cx = b.x + (b.lean * 0.15 + sway * 0.3) * b.h
        const cy = by - b.h * 0.62
        g.beginPath()
        g.moveTo(b.x - b.w / 2, by)
        g.quadraticCurveTo(cx - b.w * 0.3, cy, tx, ty)
        g.quadraticCurveTo(cx + b.w * 0.3, cy, b.x + b.w / 2, by)
        g.closePath()
        g.fillStyle = css(mix(b.tone, dark, k * 0.8))
        g.fill()
      }
    },

    drawOver(g, k, sunX, sunY, horizon) {
      const [, , low] = skyColors(k)
      // Sea meeting sky: never a hard line.
      const band = g.createLinearGradient(0, horizon - 16, 0, horizon + 34)
      band.addColorStop(0, css(low, 0))
      band.addColorStop(0.32, css(low, 0.62))
      band.addColorStop(1, css(low, 0))
      g.fillStyle = band
      g.fillRect(0, horizon - 16, W, 50)

      if (k > 0.02) {
        g.globalCompositeOperation = 'lighter'
        const glow = g.createRadialGradient(sunX, sunY, 10, sunX, sunY, 620)
        glow.addColorStop(0, `rgba(255,170,90,${0.24 * k})`)
        glow.addColorStop(0.4, `rgba(255,120,80,${0.1 * k})`)
        glow.addColorStop(1, 'rgba(255,120,80,0)')
        g.fillStyle = glow
        g.fillRect(0, 0, W, H)
        g.globalCompositeOperation = 'source-over'
      }
      // The corners are a little deeper, as on a painted page; more so toward
      // evening.
      const edge = mix([120, 84, 40], [50, 30, 80], k)
      const vig = g.createRadialGradient(W / 2, H * 0.45, H * 0.5, W / 2, H * 0.45, H * 1.05)
      vig.addColorStop(0, css(edge, 0))
      vig.addColorStop(1, css(edge, 0.12 + 0.22 * k))
      g.fillStyle = vig
      g.fillRect(0, 0, W, H)
    },
  }
}

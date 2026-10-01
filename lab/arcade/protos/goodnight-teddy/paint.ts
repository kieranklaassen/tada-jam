// Small painting helpers for a hand-made look: soft washes, wobbly edges,
// wood grain and wool speckle. Everything here draws into whatever context it
// is given; the rooms use it once into cached canvases.

import { TAU } from '../../kit/math.ts'

export type RGB = readonly [number, number, number]

export function rgb(c: RGB, a = 1): string {
  const r = Math.round(c[0])
  const g = Math.round(c[1])
  const b = Math.round(c[2])
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(3)})`
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

// A small seeded generator so the painted rooms are the same every time.
export function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A closed, slightly lumpy oval: nothing in the room is a perfect ellipse.
export function blobPath(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, wob = 0.05, seed = 1, n = 12): void {
  g.beginPath()
  let px = 0
  let py = 0
  let fx = 0
  let fy = 0
  let mx0 = 0
  let my0 = 0
  for (let i = 0; i <= n; i++) {
    const k = i % n
    const a = (k / n) * TAU
    const r = 1 + wob * Math.sin(seed * 12.9898 + k * 2.399) + wob * 0.5 * Math.sin(seed * 4.1 + k * 5.1)
    const x = cx + Math.cos(a) * rx * r
    const y = cy + Math.sin(a) * ry * r
    if (i === 0) {
      fx = x
      fy = y
    } else {
      const mx = (px + x) / 2
      const my = (py + y) / 2
      if (i === 1) {
        g.moveTo(mx, my)
        mx0 = mx
        my0 = my
      } else {
        g.quadraticCurveTo(px, py, mx, my)
      }
    }
    px = x
    py = y
  }
  // Close through the first point back to the first midpoint.
  g.quadraticCurveTo(fx, fy, mx0, my0)
  g.closePath()
}

// A rectangle whose edges wander a little, with rounded corners.
export function wobblyRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, wob: number, rand: () => number): void {
  const j = () => (rand() - 0.5) * 2 * wob
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y + j())
  g.quadraticCurveTo(x + w / 2, y + j(), x + w - rr, y + j())
  g.quadraticCurveTo(x + w, y, x + w + j(), y + rr)
  g.quadraticCurveTo(x + w + j(), y + h / 2, x + w + j(), y + h - rr)
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h + j())
  g.quadraticCurveTo(x + w / 2, y + h + j(), x + rr, y + h + j())
  g.quadraticCurveTo(x, y + h, x + j(), y + h - rr)
  g.quadraticCurveTo(x + j(), y + h / 2, x + j(), y + rr)
  g.quadraticCurveTo(x, y, x + rr, y + j())
  g.closePath()
}

// A soft round stain of colour, like a wet brush touched to the wall.
export function washBlot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: RGB, alpha: number): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r)
  grad.addColorStop(0, rgb(color, alpha))
  grad.addColorStop(0.6, rgb(color, alpha * 0.55))
  grad.addColorStop(1, rgb(color, 0))
  g.fillStyle = grad
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

// Fine grain: tiny flecks, lighter and darker, so flat colour reads as paper.
export function speckle(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number, rand: () => number, alpha = 0.05): void {
  for (let i = 0; i < count; i++) {
    const px = x + rand() * w
    const py = y + rand() * h
    const light = rand() > 0.5
    g.fillStyle = light ? `rgba(255,250,235,${alpha})` : `rgba(90,60,30,${alpha})`
    g.beginPath()
    g.ellipse(px, py, 0.6 + rand() * 1.8, 0.5 + rand() * 1.2, rand() * 3, 0, TAU)
    g.fill()
  }
}

// One wooden board with grain running along it.
export function board(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB,
  rand: () => number,
  vertical = false,
  radius = 3,
): void {
  const tone = mix(color, rand() > 0.5 ? [255, 240, 210] : [120, 80, 40], rand() * 0.1)
  wobblyRect(g, x, y, w, h, radius, 1.2, rand)
  g.fillStyle = rgb(tone)
  g.fill()
  g.save()
  g.clip()
  const lines = Math.max(3, Math.round((vertical ? w : h) / 9))
  g.lineCap = 'round'
  for (let i = 0; i < lines; i++) {
    const t = (i + rand() * 0.8) / lines
    g.strokeStyle = `rgba(110,70,35,${0.05 + rand() * 0.09})`
    g.lineWidth = 0.8 + rand() * 1.6
    g.beginPath()
    if (vertical) {
      const lx = x + t * w
      g.moveTo(lx, y)
      g.bezierCurveTo(lx + (rand() - 0.5) * 8, y + h * 0.3, lx + (rand() - 0.5) * 8, y + h * 0.7, lx + (rand() - 0.5) * 4, y + h)
    } else {
      const ly = y + t * h
      g.moveTo(x, ly)
      g.bezierCurveTo(x + w * 0.3, ly + (rand() - 0.5) * 8, x + w * 0.7, ly + (rand() - 0.5) * 8, x + w, ly + (rand() - 0.5) * 4)
    }
    g.stroke()
  }
  // Sometimes a knot.
  if (rand() > 0.6 && w > 60 && h > 30) {
    const kx = x + w * (0.2 + rand() * 0.6)
    const ky = y + h * (0.3 + rand() * 0.4)
    g.strokeStyle = 'rgba(100,62,30,0.22)'
    g.lineWidth = 1.5
    for (let k = 1; k <= 3; k++) {
      g.beginPath()
      g.ellipse(kx, ky, k * (vertical ? 2.5 : 5), k * (vertical ? 5 : 2.5), 0, 0, TAU)
      g.stroke()
    }
  }
  g.restore()
  // A soft dark edge underneath, a light one on top.
  g.strokeStyle = 'rgba(90,55,25,0.22)'
  g.lineWidth = 1.5
  g.stroke()
}

// A filled soft ellipse, the shadow something casts on the floor.
export function softShadow(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.18): void {
  g.save()
  g.translate(x, y)
  g.scale(1, ry / rx)
  const grad = g.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx)
  grad.addColorStop(0, `rgba(70,40,20,${alpha})`)
  grad.addColorStop(1, 'rgba(70,40,20,0)')
  g.fillStyle = grad
  g.beginPath()
  g.arc(0, 0, rx, 0, TAU)
  g.fill()
  g.restore()
}

// A capsule between two points: arms, sleeves, legs.
export function limb(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.stroke()
}

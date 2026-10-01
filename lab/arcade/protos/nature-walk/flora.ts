// The wood itself: sky, distance, ground and path, the four trees, the
// stream and the cottage. Each is painted once per season to its own canvas.
// A tree keeps one skeleton all year, so snow settles on the same branches
// that carried blossom.

import { TAU, dot, fillBlob, fillLeaf, makeSprite, mix, oval, rgba, rng, settle, softSpot, strokeLine, washLayer, wobblyRect } from './paint.ts'
import type { G, Sprite } from './paint.ts'
import { FOLIAGE } from './seasons.ts'
import type { Palette, Season, TreeKind } from './seasons.ts'

export const TILE = 1180
export const GROUND_Y = 430
export const GROUND_H = 390
export const STREAM_X = 2110
export const FAR_W = 2100
export const FAR_Y = 236

// The beaten path, as a height for every world x. It repeats once per tile
// so the painted ground strip can repeat too.
export function pathY(x: number): number {
  const a = (x / TILE) * TAU
  return 672 + 18 * Math.sin(a + 0.6) + 7 * Math.sin(2 * a + 2)
}

export function streamX(y: number): number {
  return STREAM_X + 34 * Math.sin((y - 455) / 95)
}

export function streamHalf(y: number): number {
  return 20 + (y - 455) * 0.16
}

export function makeSky(pal: Palette): Sprite {
  return makeSprite(TILE, 500, 0, 0, 0.5, (g) => {
    const r = rng(11)
    const grad = g.createLinearGradient(0, 0, 0, 500)
    grad.addColorStop(0, pal.skyTop)
    grad.addColorStop(1, pal.skyLow)
    g.fillStyle = grad
    g.fillRect(0, 0, TILE, 500)
    for (let i = 0; i < 26; i++) softSpot(g, r() * TILE, r() * 340, 70 + r() * 170, pal.skyBlot[i % pal.skyBlot.length], 0.2 + r() * 0.25)
    softSpot(g, 905, 122, 200, pal.sun, pal.sunAlpha * 0.6)
    softSpot(g, 905, 122, 78, pal.sun, 0.95)
    softSpot(g, 905, 122, 44, '#ffffff', 0.9)
  })
}

// Distance: a veil that thickens toward the foot of the far trees.
export function makeHaze(pal: Palette): Sprite {
  return makeSprite(4, 370, 0, 0, 1, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 370)
    grad.addColorStop(0, rgba(pal.skyLow, 0))
    grad.addColorStop(0.55, rgba(pal.skyLow, 0.4))
    grad.addColorStop(1, rgba(pal.skyLow, 0.46))
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 370)
  })
}

// The far wood: soft shapes with the haze already on them.
export function makeFar(pal: Palette, season: Season): Sprite {
  return makeSprite(FAR_W, 260, 0, 0, 1, (g) => {
    const r = rng(23)
    const trees: { x: number; base: number; h: number; fir: boolean; c: string }[] = []
    for (let i = 0; i < 58; i++) trees.push({ x: r() * FAR_W, base: 226 + r() * 26, h: 80 + r() * 105, fir: r() < 0.24, c: pal.farTree[Math.floor(r() * pal.farTree.length)] })
    trees.sort((a, b) => a.base - b.base)
    for (const t of trees) {
      const far = (t.base - 226) / 26
      const haze = 0.5 - far * 0.3
      if (t.fir) {
        const c = mix(mix('#3f6652', t.c, 0.25), pal.skyLow, haze)
        for (let k = 0; k < 4; k++) {
          const top = t.base - t.h + k * t.h * 0.2
          const half = t.h * (0.1 + k * 0.055)
          g.beginPath()
          g.moveTo(t.x, top)
          g.quadraticCurveTo(t.x + half * 0.5, top + t.h * 0.2, t.x + half, top + t.h * 0.36)
          g.quadraticCurveTo(t.x, top + t.h * 0.3, t.x - half, top + t.h * 0.36)
          g.quadraticCurveTo(t.x - half * 0.5, top + t.h * 0.2, t.x, top)
          g.fillStyle = c
          g.fill()
        }
        if (season === 0) {
          g.globalAlpha = 0.7
          for (let k = 0; k < 4; k++) oval(g, t.x, t.base - t.h + k * t.h * 0.2 + t.h * 0.12, t.h * (0.04 + k * 0.03), t.h * 0.05, '#ffffff')
          g.globalAlpha = 1
        }
        continue
      }
      const trunk = mix(pal.farTrunk, pal.skyLow, haze)
      strokeLine(g, [t.x, t.base, t.x + (r() - 0.5) * 6, t.base - t.h * 0.62], trunk, 3 + t.h * 0.02)
      if (season === 0) {
        g.strokeStyle = rgba(trunk, 0.8)
        g.lineWidth = 1.3
        for (let k = 0; k < 9; k++) {
          const a = -Math.PI / 2 + (k - 4) * 0.22 + (r() - 0.5) * 0.1
          const y0 = t.base - t.h * (0.3 + r() * 0.3)
          g.beginPath()
          g.moveTo(t.x, y0)
          g.lineTo(t.x + Math.cos(a) * t.h * 0.42, y0 + Math.sin(a) * t.h * 0.42)
          g.stroke()
        }
        g.globalAlpha = 0.16
        fillBlob(g, t.x, t.base - t.h * 0.7, t.h * 0.3, t.h * 0.3, trunk, r, 0.15)
        g.globalAlpha = 1
      } else {
        const c = mix(t.c, pal.skyLow, haze)
        fillBlob(g, t.x, t.base - t.h * 0.68, t.h * 0.33, t.h * 0.38, c, r, 0.16, 10)
        g.globalAlpha = 0.45
        fillBlob(g, t.x + t.h * 0.07, t.base - t.h * 0.78, t.h * 0.19, t.h * 0.2, mix(c, '#ffffff', 0.35), r, 0.2)
        g.globalAlpha = 1
      }
    }
  })
}

function wrap(x: number, margin: number, fn: (x: number) => void): void {
  fn(x)
  if (x < margin) fn(x + TILE)
  if (x > TILE - margin) fn(x - TILE)
}

// One screen-wide strip of forest floor with the path worn into it. It tiles
// left to right. It is the biggest painting here, so it is done in stages,
// one a frame, and shown only when the last is dry.
export interface Staged {
  sprite: Sprite
  // Paints the next stage; true when the picture is finished.
  step(): boolean
}

export function startGround(pal: Palette, season: Season): Staged {
  const sprite = makeSprite(TILE, GROUND_H, 0, 0, 1.5, () => {})
  const g = sprite.canvas.getContext('2d') as G
  const r = rng(101 + season)
  const top = (x: number) => {
    const a = (x / TILE) * TAU
    return 28 + 9 * Math.sin(2 * a + 1) + 5 * Math.sin(5 * a)
  }
  const py = (x: number) => pathY(x) - GROUND_Y
  const edge = (x: number, k: number) => 4 * Math.sin((x / TILE) * TAU * 7 + k) + 3 * Math.sin((x / TILE) * TAU * 13 + k * 2)
  const band = (inset: number) => {
    g.beginPath()
    for (let x = 0; x <= TILE; x += 10) {
      const y = py(x) - 46 + inset + edge(x, 1)
      if (x === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    for (let x = TILE; x >= 0; x -= 10) g.lineTo(x, py(x) + 52 - inset + edge(x, 4))
    g.closePath()
  }
  const tufts = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const x = r() * TILE
      const y = top(x) + 4 + r() * (GROUND_H - top(x) - 4)
      const lean = (r() - 0.5) * 6
      const extra = r() * 6
      if (Math.abs(y - py(x) - 2) < 52) continue
      const depth = (y - 20) / (GROUND_H - 20)
      const len = 5 + 15 * depth + extra
      g.strokeStyle = rgba(pal.tuft[i % pal.tuft.length], season === 0 ? 0.55 : 0.8)
      g.lineWidth = 1.3 + depth * 1.7
      if (season === 0 && i % 3 !== 0) continue
      wrap(x, 20, (xx) => {
        g.beginPath()
        for (let k = -1; k <= 1; k++) {
          g.moveTo(xx + k * 2.5, y)
          g.quadraticCurveTo(xx + k * 4, y - len * 0.6, xx + k * 7 + lean, y - len)
        }
        g.stroke()
      })
    }
  }
  const litter = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const x = r() * TILE
      const y = top(x) + 8 + r() * (GROUND_H - top(x) - 12)
      const depth = (y - 20) / (GROUND_H - 20)
      const onPath = Math.abs(y - py(x) - 2) < 50
      const c = pal.litter[i % pal.litter.length]
      const rot = r() * TAU
      const size = 0.45 + depth * 0.75
      const keep = r()
      if (season === 3) {
        if (onPath && keep > 0.3) continue
        wrap(x, 20, (xx) => {
          fillLeaf(g, xx, y, 15 * size, 8 * size, rot, c)
          g.strokeStyle = rgba('#6b3a1c', 0.35)
          g.lineWidth = 0.8
          g.beginPath()
          g.moveTo(xx, y)
          g.lineTo(xx + Math.cos(rot) * 13 * size, y + Math.sin(rot) * 13 * size)
          g.stroke()
        })
      } else if (season === 0) {
        if (onPath) continue
        wrap(x, 20, (xx) => {
          g.globalAlpha = 0.5
          oval(g, xx, y, 16 * size, 4 * size, c)
          g.globalAlpha = 1
        })
      } else {
        if (onPath) continue
        wrap(x, 12, (xx) => {
          const rad = 2.6 * size + 0.8
          g.beginPath()
          for (let k = 0; k < 5; k++) {
            const px = xx + Math.cos(rot + (k / 5) * TAU) * rad
            const pyy = y + Math.sin(rot + (k / 5) * TAU) * rad * 0.8
            g.moveTo(px + rad * 0.72, pyy)
            g.arc(px, pyy, rad * 0.72, 0, TAU)
          }
          g.fillStyle = c
          g.fill()
          dot(g, xx, y, rad * 0.55, c === '#f6e27a' || c === '#f6d94a' ? '#e0962c' : '#f2c84a')
        })
      }
    }
  }
  const stages: (() => void)[] = [
    () => {
      g.beginPath()
      g.moveTo(0, top(0))
      for (let x = 20; x <= TILE; x += 20) g.lineTo(x, top(x))
      g.lineTo(TILE, GROUND_H)
      g.lineTo(0, GROUND_H)
      g.closePath()
      const grad = g.createLinearGradient(0, 20, 0, GROUND_H)
      grad.addColorStop(0, pal.groundFar)
      grad.addColorStop(1, pal.groundNear)
      g.fillStyle = grad
      g.fill()
      g.save()
      g.clip()
      washLayer(g, 0, 0, TILE, GROUND_H, (wg) => {
        for (let i = 0; i < 44; i++) {
          const x = r() * TILE
          const y = 30 + r() * 360
          const rad = 50 + r() * 110
          const c = pal.groundBlot[i % pal.groundBlot.length]
          const a = 0.2 + r() * 0.22
          wrap(x, rad, (xx) => softSpot(wg, xx, y, rad, c, a))
        }
      }, 0.3)
      g.restore()
    },
    () => tufts(0, 215),
    () => tufts(215, 430),
    () => {
      band(0)
      g.fillStyle = pal.pathEdge
      g.fill()
      band(6)
      g.fillStyle = pal.path
      g.fill()
      g.save()
      band(7)
      g.clip()
      washLayer(g, 0, 0, TILE, GROUND_H, (wg) => {
        for (let i = 0; i < 26; i++) {
          const x = r() * TILE
          const y = py(x) + (r() - 0.5) * 56
          const rad = 34 + r() * 50
          wrap(x, rad, (xx) => softSpot(wg, xx, y, rad, pal.pathLight, 0.55))
        }
        for (let i = 0; i < 14; i++) {
          const x = r() * TILE
          const y = py(x) + (r() - 0.5) * 60
          const rad = 30 + r() * 40
          wrap(x, rad, (xx) => softSpot(wg, xx, y, rad, pal.pathEdge, 0.3))
        }
      })
      for (let i = 0; i < 70; i++) {
        const x = r() * TILE
        const y = py(x) + (r() - 0.5) * 78
        const rx = 2.5 + r() * 5.5
        const rot = r() * 0.6 - 0.3
        wrap(x, 12, (xx) => {
          g.globalAlpha = 0.5
          oval(g, xx, y, rx, rx * 0.55, pal.pebble, rot)
          oval(g, xx - rx * 0.2, y - rx * 0.16, rx * 0.5, rx * 0.22, pal.pathLight, rot)
        })
      }
      g.globalAlpha = 1
      g.restore()
    },
    () => {
      // Tufts along both edges of the path, so the edge is grown, not cut.
      for (let i = 0; i < 150; i++) {
        const x = r() * TILE
        const upper = i % 2 === 0
        const y = py(x) + (upper ? -42 : 54) + edge(x, upper ? 1 : 4) + (r() - 0.5) * 8
        const len = (upper ? 9 : 14) + r() * 9
        const lean = (r() - 0.5) * 7
        g.strokeStyle = rgba(pal.tuft[i % pal.tuft.length], season === 0 ? 0.7 : 0.9)
        g.lineWidth = upper ? 2 : 2.6
        wrap(x, 20, (xx) => {
          g.beginPath()
          for (let k = -1; k <= 1; k++) {
            g.moveTo(xx + k * 3, y)
            g.quadraticCurveTo(xx + k * 4.5, y - len * 0.6, xx + k * 8 + lean, y - len)
          }
          g.stroke()
        })
      }
    },
    () => litter(0, Math.ceil(pal.litterCount / 2)),
    () => litter(Math.ceil(pal.litterCount / 2), pal.litterCount),
  ]
  let at = 0
  return {
    sprite,
    step() {
      if (at < stages.length) {
        stages[at++]()
        settle(sprite)
      }
      return at >= stages.length
    },
  }
}

interface Limb {
  pts: number[]
  w1: number
  w2: number
}
interface Tip {
  x: number
  y: number
  s: number
}
interface Skeleton {
  limbs: Limb[]
  tips: Tip[]
  perch: [number, number][]
}

function quadPts(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1)
  }
  return out
}

function grow(sk: Skeleton, r: () => number, x: number, y: number, ang: number, len: number, w: number, depth: number, bend: number, midTip: boolean): Limb {
  const ex = x + Math.cos(ang) * len
  const ey = y + Math.sin(ang) * len
  const cx = (x + ex) / 2 + Math.cos(ang + Math.PI / 2) * bend
  const cy = (y + ey) / 2 + Math.sin(ang + Math.PI / 2) * bend
  const limb: Limb = { pts: quadPts(x, y, cx, cy, ex, ey, 6), w1: w, w2: Math.max(1.6, w * 0.5) }
  sk.limbs.push(limb)
  if (depth <= 0) {
    sk.tips.push({ x: ex, y: ey, s: 1 })
    return limb
  }
  const n = depth >= 2 ? 3 : 2
  for (let i = 0; i < n; i++) {
    const t = 0.42 + (0.58 * (i + 1)) / n
    const k = Math.round(t * 6)
    const last = i === n - 1
    const side = i % 2 === 0 ? 1 : -1
    let a = last ? ang + (r() - 0.5) * 0.5 : ang + side * (0.45 + r() * 0.4)
    a += (-Math.PI / 2 - a) * 0.12
    grow(sk, r, limb.pts[k * 2], limb.pts[k * 2 + 1], a, len * (0.56 + r() * 0.16), w * (0.62 - t * 0.14), depth - 1, (r() - 0.5) * len * 0.18, true)
  }
  if (midTip) sk.tips.push({ x: limb.pts[6], y: limb.pts[7], s: 0.85 })
  return limb
}

const skeletons = new Map<TreeKind, Skeleton>()

function skeleton(kind: TreeKind): Skeleton {
  const have = skeletons.get(kind)
  if (have) return have
  const sk: Skeleton = { limbs: [], tips: [], perch: [] }
  if (kind === 'oak') {
    const r = rng(5)
    sk.limbs.push({ pts: quadPts(0, 4, -12, -120, 6, -242, 6), w1: 66, w2: 44 })
    grow(sk, r, 0, -236, -2.25, 122, 30, 2, 12, true)
    grow(sk, r, 6, -240, -1.5, 128, 30, 2, -8, true)
    grow(sk, r, 12, -236, -0.8, 122, 28, 2, -12, true)
    const low = grow(sk, r, 14, -172, -0.5, 178, 21, 0, -22, false)
    sk.tips.push({ x: low.pts[12] + 26, y: low.pts[13] - 30, s: 0.9 })
    grow(sk, r, -8, -196, -2.72, 132, 19, 1, 16, false)
    sk.perch.push([low.pts[6], low.pts[7] - 8])
  } else if (kind === 'cherry') {
    const r = rng(9)
    sk.limbs.push({ pts: quadPts(0, 3, 8, -70, -4, -138, 6), w1: 38, w2: 26 })
    grow(sk, r, -6, -130, -2.5, 98, 17, 2, 10, true)
    grow(sk, r, -5, -134, -1.9, 104, 18, 2, -6, true)
    grow(sk, r, -2, -134, -1.25, 102, 18, 2, 8, true)
    grow(sk, r, 0, -128, -0.62, 96, 16, 2, -10, true)
  } else if (kind === 'birch') {
    const r = rng(14)
    sk.limbs.push({ pts: quadPts(0, 3, -14, -210, 8, -402, 6), w1: 27, w2: 9 })
    const trunkX = (h: number) => {
      const t = h / 402
      const u = 1 - t
      return 2 * u * t * -14 + t * t * 8
    }
    const left = grow(sk, r, trunkX(236), -236, -2.72, 104, 7, 0, 10, false)
    const right = grow(sk, r, trunkX(300), -300, -0.42, 98, 7, 0, -10, false)
    sk.perch.push([left.pts[8], left.pts[9] - 3], [right.pts[8], right.pts[9] - 3])
    let side = 1
    for (let h = 176; h < 396; h += 34) {
      side = -side
      if (Math.abs(h - 236) < 20 && side < 0) continue
      if (Math.abs(h - 300) < 20 && side > 0) continue
      const a = side > 0 ? -0.72 - r() * 0.3 : -2.42 + r() * 0.3
      grow(sk, r, trunkX(h), -h, a, 104 - (h - 176) * 0.14, 6.5, 1, side * -10, true)
    }
    grow(sk, r, 8, -398, -1.75, 84, 6, 1, 6, true)
    grow(sk, r, 8, -398, -1.25, 78, 6, 1, -6, true)
  }
  skeletons.set(kind, sk)
  return sk
}

// Where an animal can sit, measured from the foot of the tree at scale 1.
export function perchOf(kind: TreeKind, i: number): [number, number] {
  return skeleton(kind).perch[i] ?? [0, 0]
}

function drawLimb(g: G, limb: Limb, color: string): void {
  const n = limb.pts.length / 2
  if (limb.w1 < 4.5) {
    strokeLine(g, limb.pts, color, (limb.w1 + limb.w2) / 2)
    return
  }
  const left: number[] = []
  const right: number[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1)
    const b = Math.min(n - 1, i + 1)
    const dx = limb.pts[b * 2] - limb.pts[a * 2]
    const dy = limb.pts[b * 2 + 1] - limb.pts[a * 2 + 1]
    const d = Math.hypot(dx, dy) || 1
    const w = (limb.w1 + (limb.w2 - limb.w1) * (i / (n - 1))) / 2
    left.push(limb.pts[i * 2] - (dy / d) * w, limb.pts[i * 2 + 1] + (dx / d) * w)
    right.push(limb.pts[i * 2] + (dy / d) * w, limb.pts[i * 2 + 1] - (dx / d) * w)
  }
  g.beginPath()
  g.moveTo(left[0], left[1])
  for (let i = 1; i < n; i++) g.lineTo(left[i * 2], left[i * 2 + 1])
  for (let i = n - 1; i >= 0; i--) g.lineTo(right[i * 2], right[i * 2 + 1])
  g.closePath()
  g.fillStyle = color
  g.fill()
  g.strokeStyle = color
  g.lineWidth = 1.5
  g.stroke()
}

function snowOnLimbs(g: G, sk: Skeleton): void {
  g.strokeStyle = '#ffffff'
  for (const limb of sk.limbs) {
    if (limb.w1 < 4) continue
    const n = limb.pts.length / 2
    g.beginPath()
    let started = false
    let any = false
    for (let i = 0; i < n; i++) {
      const j = Math.min(n - 2, i)
      const dx = limb.pts[j * 2 + 2] - limb.pts[j * 2]
      const dy = limb.pts[j * 2 + 3] - limb.pts[j * 2 + 1]
      if (Math.abs(dy) > Math.abs(dx) * 1.7) {
        started = false
        continue
      }
      const w = limb.w1 + (limb.w2 - limb.w1) * (i / (n - 1))
      const y = limb.pts[i * 2 + 1] - w / 2 - 0.5
      if (started) g.lineTo(limb.pts[i * 2], y)
      else g.moveTo(limb.pts[i * 2], y)
      started = true
      any = true
    }
    if (!any) continue
    g.lineWidth = Math.max(2.6, Math.min(9, limb.w1 * 0.36))
    g.stroke()
  }
}

function leafMass(g: G, r: () => number, tips: Tip[], color: string, base: number, dx: number, dy: number, keep: number, alpha: number): void {
  g.globalAlpha = alpha
  for (const t of tips) {
    const k = r()
    const wob = r()
    if (k > keep) continue
    const rad = base * t.s * (0.8 + wob * 0.4)
    fillBlob(g, t.x + dx * rad, t.y + dy * rad, rad, rad * 0.9, color, r, 0.2, 10)
  }
  g.globalAlpha = 1
}

function leafDabs(g: G, r: () => number, tips: Tip[], tones: readonly string[], base: number, per: number, big: number): void {
  for (const t of tips) {
    for (let i = 0; i < per; i++) {
      const a = r() * TAU
      const d = Math.sqrt(r()) * base * t.s * 1.05
      const c = tones[Math.floor(r() * tones.length)]
      g.globalAlpha = 0.75
      fillLeaf(g, t.x + Math.cos(a) * d, t.y + Math.sin(a) * d * 0.9, big * (0.7 + r() * 0.6), big * 0.45, r() * TAU, c)
    }
  }
  g.globalAlpha = 1
}

const DIM: Record<TreeKind, { w: number; h: number; ax: number; ay: number }> = {
  oak: { w: 640, h: 620, ax: 320, ay: 590 },
  cherry: { w: 500, h: 450, ax: 250, ay: 426 },
  birch: { w: 400, h: 600, ax: 200, ay: 576 },
  fir: { w: 340, h: 570, ax: 170, ay: 546 },
}

// Rough size of each tree, for touching it: crown centre height, crown radii.
export const CROWN: Record<TreeKind, { cy: number; rx: number; ry: number; trunk: number }> = {
  oak: { cy: -360, rx: 250, ry: 190, trunk: 40 },
  cherry: { cy: -250, rx: 185, ry: 140, trunk: 26 },
  birch: { cy: -330, rx: 130, ry: 190, trunk: 20 },
  fir: { cy: -280, rx: 110, ry: 230, trunk: 18 },
}

function paintFir(g: G, pal: Palette, season: Season): void {
  const r = rng(31)
  const tones = FOLIAGE.fir[season] ?? ['#2b5642', '#3a6f52', '#4f8a66']
  g.fillStyle = 'rgba(40,30,20,0.13)'
  g.beginPath()
  g.ellipse(0, 4, 74, 11, 0, 0, TAU)
  g.fill()
  wobblyRect(g, -11, -100, 22, 102, r, 2)
  g.fillStyle = pal.trunk
  g.fill()
  for (let i = 0; i < 7; i++) {
    const apex = -168 - i * 54
    const by = apex + 138 - i * 7
    const hw = 132 - i * 17
    const tier = () => {
      g.beginPath()
      g.moveTo(0, apex)
      g.quadraticCurveTo(hw * 0.42, apex + (by - apex) * 0.5, hw, by - 6)
      const n = 5
      for (let k = n - 1; k >= 0; k--) {
        const x1 = -hw + ((k + 0.5) / n) * hw * 2
        const x0 = -hw + (k / n) * hw * 2
        g.quadraticCurveTo(x1, by + 16 - Math.abs(x1) * 0.05, x0, by - 6 + (k === 0 ? 0 : 2))
      }
      g.quadraticCurveTo(-hw * 0.42, apex + (by - apex) * 0.5, 0, apex)
      g.closePath()
    }
    tier()
    g.fillStyle = tones[0]
    g.fill()
    g.save()
    g.clip()
    g.globalAlpha = 0.85
    fillBlob(g, hw * 0.3, apex + (by - apex) * 0.62, hw * 0.62, (by - apex) * 0.42, tones[1], r, 0.2)
    g.globalAlpha = 1
    g.lineWidth = 2
    for (let k = 0; k < 26; k++) {
      const x = (r() - 0.5) * hw * 1.9
      const y = by - 4 - r() * (by - apex) * 0.5 * (1 - Math.abs(x) / hw)
      g.strokeStyle = rgba(k % 3 === 0 ? tones[2] : tones[0], 0.8)
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (x > 0 ? 3 : -3), y + 9)
      g.stroke()
    }
    if (season === 0) {
      g.globalAlpha = 0.96
      g.beginPath()
      g.moveTo(0, apex - 4)
      g.quadraticCurveTo(hw * 0.4, apex + (by - apex) * 0.42, hw * 0.86, by - 22)
      g.quadraticCurveTo(hw * 0.5, by - 30, hw * 0.3, by - 40 + r() * 8)
      g.quadraticCurveTo(0, by - 30 + r() * 10, -hw * 0.3, by - 42 + r() * 8)
      g.quadraticCurveTo(-hw * 0.5, by - 30, -hw * 0.86, by - 22)
      g.quadraticCurveTo(-hw * 0.4, apex + (by - apex) * 0.42, 0, apex - 4)
      g.fillStyle = '#ffffff'
      g.fill()
      g.globalAlpha = 0.5
      fillBlob(g, -hw * 0.3, by - 40, hw * 0.3, 10, '#cfdcec', r, 0.2)
      g.globalAlpha = 1
    }
    g.restore()
  }
  if (season === 0) fillBlob(g, 0, 0, 60, 9, '#ffffff', r, 0.12)
  else for (let k = 0; k < 9; k++) strokeLine(g, [-34 + k * 8, 3, -36 + k * 8 + (r() - 0.5) * 8, -9 - r() * 8], pal.tuft[k % pal.tuft.length], 2.2)
}

function paintTree(g: G, kind: TreeKind, pal: Palette, season: Season): void {
  if (kind === 'fir') {
    paintFir(g, pal, season)
    return
  }
  const sk = skeleton(kind)
  const r = rng(kind === 'oak' ? 51 : kind === 'cherry' ? 52 : 53)
  const tones = FOLIAGE[kind][season]
  const base = kind === 'oak' ? 54 : kind === 'cherry' ? 44 : 31
  const bark = kind === 'birch' ? '#efe8da' : pal.trunk
  const twig = kind === 'birch' ? '#6b5348' : pal.trunk
  const trunkW = sk.limbs[0].w1

  g.fillStyle = 'rgba(40,30,20,0.13)'
  g.beginPath()
  g.ellipse(0, 5, trunkW * 1.7, 11, 0, 0, TAU)
  g.fill()

  const hang = kind === 'birch' ? 0.35 : 0
  if (tones && season !== 1) leafMass(g, r, sk.tips, tones[0], base * 1.12, -0.06, 0.16 + hang, 1, 0.96)
  if (tones && season === 1 && kind === 'cherry') leafMass(g, r, sk.tips, tones[0], base * 0.95, -0.06, 0.14, 0.9, 0.9)

  // Roots, then every limb from the trunk outward.
  if (kind !== 'birch') {
    fillBlob(g, -trunkW * 0.52, -4, trunkW * 0.36, 13, bark, r, 0.2)
    fillBlob(g, trunkW * 0.5, -3, trunkW * 0.34, 12, bark, r, 0.2)
  }
  sk.limbs.forEach((limb, i) => drawLimb(g, limb, i === 0 ? bark : twig))
  // Shade down one side of the trunk and a little light down the other.
  const trunk = sk.limbs[0]
  const n = trunk.pts.length / 2
  const side = (off: number): number[] => {
    const out: number[] = []
    for (let i = 0; i < n; i++) out.push(trunk.pts[i * 2] + (trunk.w1 + (trunk.w2 - trunk.w1) * (i / (n - 1))) * off, trunk.pts[i * 2 + 1])
    return out
  }
  if (kind === 'birch') {
    strokeLine(g, side(0.3), rgba('#b9ae9a', 0.7), 5)
    for (let i = 0; i < 22; i++) {
      const t = 0.04 + r() * 0.9
      const k = Math.min(n - 2, Math.floor(t * (n - 1)))
      const f = t * (n - 1) - k
      const x = trunk.pts[k * 2] + (trunk.pts[k * 2 + 2] - trunk.pts[k * 2]) * f
      const y = trunk.pts[k * 2 + 1] + (trunk.pts[k * 2 + 3] - trunk.pts[k * 2 + 1]) * f
      const w = (trunk.w1 + (trunk.w2 - trunk.w1) * t) * 0.5
      const from = (r() - 0.5) * w * 1.4
      strokeLine(g, [x + from, y, x + from + (3 + r() * w * 0.7) * (from > 0 ? -1 : 1), y + (r() - 0.5) * 2], '#3d3530', 1.6 + r() * 2.2)
    }
  } else {
    strokeLine(g, side(-0.3), rgba(pal.trunkDark, 0.5), trunkW * 0.22)
    strokeLine(g, side(0.28), rgba('#c9a27a', 0.28), trunkW * 0.14)
    g.strokeStyle = rgba(pal.trunkDark, 0.5)
    g.lineWidth = 2
    for (let i = 0; i < 12; i++) {
      const t = 0.08 + r() * 0.8
      const k = Math.min(n - 2, Math.floor(t * (n - 1)))
      const x = trunk.pts[k * 2] + (r() - 0.5) * trunkW * 0.55
      const y = trunk.pts[k * 2 + 1] - r() * 30
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + 3, y - 12, x - 1, y - 22 - r() * 10)
      g.stroke()
    }
  }

  if (season === 0) {
    // Fine winter twigs, then the snow.
    g.strokeStyle = rgba(twig, 0.85)
    g.lineWidth = 1.5
    for (const t of sk.tips) {
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.6 + (kind === 'birch' ? 0.9 * Math.sign(t.x || 1) : 0)
        const len = base * (0.45 + r() * 0.5)
        g.beginPath()
        g.moveTo(t.x, t.y)
        g.quadraticCurveTo(t.x + Math.cos(a) * len * 0.6, t.y + Math.sin(a) * len * 0.6 - 4, t.x + Math.cos(a) * len, t.y + Math.sin(a) * len + (kind === 'birch' ? len * 0.5 : 0))
        g.stroke()
      }
    }
    snowOnLimbs(g, sk)
    fillBlob(g, 0, 2, trunkW * 1.5, 10, '#ffffff', r, 0.14)
  } else if (tones) {
    const keep = season === 3 ? 0.84 : season === 1 ? 0.82 : 0.95
    const size = season === 1 && kind !== 'cherry' ? 0.66 : 1
    leafMass(g, r, sk.tips, tones[1], base * 0.92 * size, 0, hang, keep, 0.95)
    leafMass(g, r, sk.tips, tones[2], base * 0.52 * size, 0.3, -0.35 + hang, 0.62, 0.9)
    leafDabs(g, r, sk.tips, tones, base * size, season === 1 ? 5 : 7, kind === 'oak' ? 11 : 9)
    if (kind === 'cherry' && season === 1) leafDabs(g, r, sk.tips, ['#ffffff', '#fbe3ea', '#a9cf7a'], base * 0.9, 5, 8)
    if (kind === 'cherry' && season === 2) {
      for (const t of sk.tips) if (r() < 0.6) dot(g, t.x + (r() - 0.5) * 50, t.y + (r() - 0.5) * 40, 4, '#c8352e')
    }
    if (season === 3) leafDabs(g, r, sk.tips, ['#f1cf5a', tones[2]], base, 2, 10)
    for (let k = 0; k < 10; k++) strokeLine(g, [-trunkW * 0.8 + k * trunkW * 0.18, 4, -trunkW * 0.8 + k * trunkW * 0.18 + (r() - 0.5) * 8, -8 - r() * 9], pal.tuft[k % pal.tuft.length], 2.2)
  }
}

export function makeTree(kind: TreeKind, season: Season, pal: Palette): Sprite {
  const d = DIM[kind]
  return makeSprite(d.w, d.h, d.ax, d.ay, 1.5, (g) => paintTree(g, kind, pal, season))
}

// The leaf that hides the beetle. Its stem is at (0, 0) and it lies to the right.
export function makeCover(pal: Palette, season: Season): Sprite {
  return makeSprite(150, 110, 16, 60, 2, (g) => {
    const half = [10, 30, 22, 38, 26, 36, 20, 24, 8]
    const xs = (i: number) => 8 + i * 13
    g.beginPath()
    g.moveTo(0, 0)
    for (let i = 0; i < half.length; i++) g.quadraticCurveTo(xs(i) - 4, -half[i] * 1.15, xs(i) + 6.5, -(half[i] + (half[i + 1] ?? 0)) / 2)
    g.quadraticCurveTo(128, -5, 130, 0)
    for (let i = half.length - 1; i >= 0; i--) g.quadraticCurveTo(xs(i) + 8, half[i] * 1.15, xs(i) - 6.5, (half[i] + (half[i - 1] ?? 0)) / 2)
    g.closePath()
    g.fillStyle = pal.cover[0]
    g.fill()
    g.save()
    g.clip()
    const r = rng(71)
    g.globalAlpha = 0.4
    for (let i = 0; i < 7; i++) fillBlob(g, r() * 130, (r() - 0.5) * 70, 12 + r() * 22, 10 + r() * 14, i % 2 ? mix(pal.cover[0], '#fff0c0', 0.45) : pal.cover[1], r, 0.2)
    g.restore()
    g.globalAlpha = 1
    strokeLine(g, [-12, 3, 30, 0, 126, 0], pal.cover[1], 3)
    g.strokeStyle = rgba(pal.cover[1], 0.75)
    g.lineWidth = 1.8
    for (let i = 1; i < half.length - 1; i += 2) {
      for (const side of [-1, 1]) {
        g.beginPath()
        g.moveTo(xs(i) - 8, 0)
        g.quadraticCurveTo(xs(i) - 2, side * half[i] * 0.4, xs(i) + 3, side * half[i] * 0.78)
        g.stroke()
      }
    }
    if (season === 0) {
      g.globalAlpha = 0.85
      for (let i = 0; i < half.length; i++) dot(g, xs(i) + 2, -half[i] * 0.86, 3 + r() * 2, '#ffffff')
      g.globalAlpha = 1
    }
  })
}

// The bed of the stream with its banks, stones and stepping stones. The water
// moving over it is drawn live. (0, 0) is world (STREAM_X, 440).
export function makeStream(pal: Palette, season: Season): Sprite {
  return makeSprite(460, 400, 230, 0, 1.5, (g) => {
    const r = rng(61)
    const cx = (y: number) => streamX(y + 440) - STREAM_X
    const hw = (y: number) => streamHalf(y + 440)
    const ribbon = (extra: number, scale: number) => {
      g.beginPath()
      for (let y = 14; y <= 392; y += 8) {
        const x = cx(y) - hw(y) * scale - extra
        if (y === 14) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      for (let y = 392; y >= 14; y -= 8) g.lineTo(cx(y) + hw(y) * scale + extra, y)
      g.closePath()
    }
    ribbon(9, 1)
    g.fillStyle = pal.bank
    g.fill()
    ribbon(0, 1)
    g.fillStyle = pal.water
    g.fill()
    g.save()
    g.clip()
    for (let i = 0; i < 16; i++) {
      const y = 20 + r() * 370
      softSpot(g, cx(y) + (r() - 0.5) * hw(y), y, 20 + r() * 40, pal.waterLight, 0.5)
    }
    g.restore()
    if (season === 0) {
      // Ice reaches in from both banks and leaves a dark channel.
      g.save()
      ribbon(0, 1)
      g.clip()
      g.globalAlpha = 0.92
      for (const side of [-1, 1]) {
        g.beginPath()
        for (let y = 10; y <= 396; y += 8) {
          const x = cx(y) + side * (hw(y) + 4)
          if (y === 10) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        for (let y = 396; y >= 10; y -= 8) g.lineTo(cx(y) + side * hw(y) * (0.34 + 0.12 * Math.sin(y * 0.09 + side)), y)
        g.closePath()
        g.fillStyle = '#eaf2f8'
        g.fill()
      }
      g.restore()
      g.globalAlpha = 1
    }
    // Stones along the banks.
    for (let i = 0; i < 12; i++) {
      const y = 30 + i * 31 + r() * 10
      const side = i % 2 === 0 ? -1 : 1
      const x = cx(y) + side * (hw(y) + 4 + r() * 8)
      const s = 0.6 + (y / 400) * 0.9
      if (Math.abs(y + 440 - pathY(STREAM_X + cx(y))) < 46) continue
      fillBlob(g, x, y, 13 * s, 8 * s, '#9a9a94', r, 0.14)
      g.globalAlpha = 0.5
      fillBlob(g, x - 2 * s, y - 2.5 * s, 8 * s, 3.5 * s, season === 0 ? '#ffffff' : '#c9c9c2', r, 0.14)
      g.globalAlpha = 1
    }
    // Reeds.
    if (season !== 0) {
      for (const [y, side] of [[108, 1], [286, -1], [330, 1]] as const) {
        const x = cx(y) + side * (hw(y) + 2)
        for (let k = 0; k < 6; k++) {
          const h = 34 + r() * 30 + y * 0.1
          strokeLine(g, [x + k * 4 * side, y, x + k * 4 * side + (r() - 0.5) * 8, y - h * 0.6, x + k * 5 * side + (r() - 0.5) * 16, y - h], pal.tuft[k % pal.tuft.length], 2.6)
          if (k % 3 === 0) oval(g, x + k * 5 * side, y - h - 2, 3, 8, '#7a5230')
        }
      }
    }
    // Stepping stones where the path crosses.
    const yc = pathY(STREAM_X + 26) - 440
    for (let k = -1; k <= 1; k++) {
      const x = cx(yc) + k * 40
      const y = yc + 2 + (k === 0 ? 3 : 0)
      g.globalAlpha = 0.25
      oval(g, x, y + 6, 21, 8, '#20333f')
      g.globalAlpha = 1
      fillBlob(g, x, y, 21, 11, '#b2ab9c', r, 0.1)
      g.globalAlpha = 0.6
      fillBlob(g, x - 2, y - 3, 15, 5.5, season === 0 ? '#ffffff' : '#dcd6c8', r, 0.12)
      g.globalAlpha = 1
    }
    // The frog's rock on the far bank.
    const fy = 606 - 440
    const fx = cx(fy) - hw(fy) - 30
    fillBlob(g, fx, fy + 4, 36, 15, '#8f8f88', r, 0.1)
    g.globalAlpha = 0.6
    fillBlob(g, fx - 3, fy - 2, 27, 8, season === 0 ? '#ffffff' : '#bdbdb4', r, 0.1)
    g.globalAlpha = 1
  })
}

// Where the frog sits, in world coordinates.
export const FROG_ROCK: [number, number] = [streamX(606) - streamHalf(606) - 30, 600]

// Home, at the end of the path. (0, 0) is the middle of the front wall on the
// ground. The door itself is drawn live so it can open.
export const DOOR = { x: -62, w: 78, h: 132 }

export function makeCottage(pal: Palette, season: Season): Sprite {
  return makeSprite(700, 560, 350, 450, 1.5, (g) => {
    const r = rng(41)
    g.fillStyle = 'rgba(40,30,20,0.14)'
    g.beginPath()
    g.ellipse(0, 6, 230, 16, 0, 0, TAU)
    g.fill()
    // A wattle fence either side.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = side * (196 + i * 30)
        strokeLine(g, [x, 6, x + (r() - 0.5) * 3, -44 - (i % 2) * 4], '#8a6a45', 6)
        if (season === 0) dot(g, x, -47 - (i % 2) * 4, 4.5, '#ffffff')
      }
      for (let k = 0; k < 3; k++) strokeLine(g, [side * 186, -14 - k * 11, side * 250, -17 - k * 11 + (k % 2) * 4, side * 326, -13 - k * 11], '#a58258', 3.4)
    }
    // Chimney.
    wobblyRect(g, 76, -404, 42, 96, r, 2)
    g.fillStyle = '#b0623f'
    g.fill()
    g.strokeStyle = rgba('#7a3f28', 0.5)
    g.lineWidth = 1.4
    for (let k = 0; k < 6; k++) {
      g.beginPath()
      g.moveTo(78, -394 + k * 13)
      g.lineTo(116, -394 + k * 13)
      g.stroke()
    }
    wobblyRect(g, 71, -410, 52, 10, r, 1.5)
    g.fillStyle = '#8f4e33'
    g.fill()
    // Wall.
    wobblyRect(g, -172, -198, 344, 200, r, 3)
    g.fillStyle = '#f3e6c9'
    g.fill()
    g.save()
    g.clip()
    washLayer(g, -180, -210, 360, 220, (wg) => {
      for (let i = 0; i < 12; i++) softSpot(wg, -170 + r() * 340, -190 + r() * 190, 30 + r() * 60, i % 2 ? '#e6cfa2' : '#fbf3de', 0.4)
      softSpot(wg, 84, -108, 120, '#f8d88a', 0.35)
    })
    g.restore()
    for (let i = 0; i < 11; i++) {
      const x = -164 + i * 32 + r() * 6
      fillBlob(g, x, -9, 17, 10, i % 2 ? '#b9ab95' : '#a89a86', r, 0.14)
    }
    g.fillStyle = '#7a5637'
    wobblyRect(g, -176, -200, 13, 194, r, 1.5)
    g.fill()
    wobblyRect(g, 163, -200, 13, 194, r, 1.5)
    g.fill()
    wobblyRect(g, -176, -204, 352, 12, r, 1.5)
    g.fill()
    strokeLine(g, [163, -110, 120, -190], '#7a5637', 9)
    // The doorway: warm inside.
    const dx = DOOR.x
    const arch = () => {
      g.beginPath()
      g.moveTo(dx - DOOR.w / 2, 0)
      g.lineTo(dx - DOOR.w / 2, -DOOR.h + DOOR.w / 2)
      g.arc(dx, -DOOR.h + DOOR.w / 2, DOOR.w / 2, Math.PI, 0)
      g.lineTo(dx + DOOR.w / 2, 0)
      g.closePath()
    }
    g.save()
    g.translate(0, 0)
    arch()
    g.strokeStyle = '#7a5637'
    g.lineWidth = 12
    g.stroke()
    const glow = g.createLinearGradient(0, -DOOR.h, 0, 0)
    glow.addColorStop(0, '#f6cf7e')
    glow.addColorStop(1, '#e39a44')
    g.fillStyle = glow
    g.fill()
    g.restore()
    // The window, lit.
    wobblyRect(g, 34, -156, 100, 88, r, 2)
    g.fillStyle = '#7a5637'
    g.fill()
    const pane = g.createLinearGradient(0, -150, 0, -74)
    pane.addColorStop(0, '#fbe29a')
    pane.addColorStop(1, '#f2b85a')
    g.fillStyle = pane
    g.fillRect(41, -149, 86, 74)
    g.fillStyle = '#7a5637'
    g.fillRect(81, -149, 6, 74)
    g.fillRect(41, -115, 86, 6)
    g.globalAlpha = 0.85
    g.fillStyle = '#fbf3e2'
    g.beginPath()
    g.moveTo(41, -149)
    g.quadraticCurveTo(58, -130, 44, -92)
    g.lineTo(41, -92)
    g.closePath()
    g.fill()
    g.beginPath()
    g.moveTo(127, -149)
    g.quadraticCurveTo(110, -130, 124, -92)
    g.lineTo(127, -92)
    g.closePath()
    g.fill()
    g.globalAlpha = 1
    for (const sx of [10, 136]) {
      wobblyRect(g, sx, -158, 24, 92, r, 1.5)
      g.fillStyle = '#6f9a8c'
      g.fill()
      g.strokeStyle = rgba('#4f7468', 0.7)
      g.lineWidth = 1.5
      for (let k = 0; k < 6; k++) {
        g.beginPath()
        g.moveTo(sx + 3, -148 + k * 14)
        g.lineTo(sx + 21, -148 + k * 14)
        g.stroke()
      }
    }
    // Window box.
    wobblyRect(g, 30, -66, 108, 18, r, 1.5)
    g.fillStyle = '#946a42'
    g.fill()
    for (let i = 0; i < 12; i++) {
      const x = 36 + i * 8.6
      if (season === 0) {
        strokeLine(g, [x, -66, x + (r() - 0.5) * 6, -78 - r() * 8], '#4f7a5a', 3)
        if (i % 2) dot(g, x, -70, 5, '#ffffff')
      } else {
        strokeLine(g, [x, -64, x + (r() - 0.5) * 6, -76 - r() * 9], '#5f9a4c', 2.6)
        dot(g, x + (r() - 0.5) * 5, -80 - r() * 8, 4.6, season === 1 ? (i % 2 ? '#f6e27a' : '#f4a9bf') : season === 2 ? (i % 2 ? '#e0453a' : '#f08a7a') : i % 2 ? '#e8a23a' : '#c8552a')
      }
    }
    // Roof.
    const roof = () => {
      g.beginPath()
      g.moveTo(-214, -192)
      g.quadraticCurveTo(0, -184, 214, -192)
      g.quadraticCurveTo(190, -280, 146, -356)
      g.quadraticCurveTo(0, -366, -146, -356)
      g.quadraticCurveTo(-190, -280, -214, -192)
      g.closePath()
    }
    roof()
    g.fillStyle = '#a65a3c'
    g.fill()
    g.save()
    g.clip()
    washLayer(g, -220, -370, 440, 190, (wg) => {
      for (let i = 0; i < 9; i++) softSpot(wg, -200 + r() * 400, -350 + r() * 160, 40 + r() * 60, i % 2 ? '#c2744a' : '#8a4630', 0.4)
    })
    g.strokeStyle = rgba('#7a3b28', 0.55)
    g.lineWidth = 2
    for (let row = 0; row < 8; row++) {
      const y = -340 + row * 21
      for (let x = -220 + (row % 2) * 13; x < 220; x += 26) {
        g.beginPath()
        g.arc(x, y, 13, 0.1 * Math.PI, 0.9 * Math.PI)
        g.stroke()
      }
    }
    if (season === 1 || season === 2) {
      g.globalAlpha = 0.5
      for (let i = 0; i < 6; i++) fillBlob(g, -190 + r() * 380, -210 - r() * 40, 18 + r() * 16, 7, '#7fa858', r, 0.2)
      g.globalAlpha = 1
    }
    if (season === 3) for (let i = 0; i < 16; i++) fillLeaf(g, -190 + r() * 380, -340 + r() * 140, 12, 6, r() * TAU, pal.litter[i % pal.litter.length])
    g.restore()
    g.globalAlpha = 0.35
    strokeLine(g, [-210, -188, 0, -181, 210, -188], '#4a2a1c', 7)
    g.globalAlpha = 1
    if (season === 0) {
      g.beginPath()
      g.moveTo(-204, -206)
      g.quadraticCurveTo(-180, -282, -142, -360)
      g.quadraticCurveTo(0, -376, 142, -360)
      g.quadraticCurveTo(180, -282, 204, -206)
      for (let k = 7; k >= 0; k--) g.quadraticCurveTo(-204 + (k + 0.5) * 51, -196 + (k % 2) * 8, -204 + k * 51, -206)
      g.closePath()
      g.fillStyle = '#ffffff'
      g.fill()
      g.globalAlpha = 0.45
      fillBlob(g, -40, -232, 120, 18, '#cfdcec', r, 0.2)
      g.globalAlpha = 1
      fillBlob(g, 97, -410, 28, 7, '#ffffff', r, 0.15)
    }
    // Round the door: the step, and what grows there.
    fillBlob(g, dx, 6, 56, 11, '#c8bca6', r, 0.08)
    fillBlob(g, dx - 4, 34, 30, 9, '#bdb09a', r, 0.1)
    if (season === 0) {
      fillBlob(g, -130, 0, 40, 12, '#ffffff', r, 0.14)
      fillBlob(g, 110, 2, 60, 12, '#ffffff', r, 0.14)
    } else if (season === 3) {
      for (const [x, s] of [[120, 1], [148, 0.7]]) {
        fillBlob(g, x, -12 * s, 20 * s, 15 * s, '#e2832c', r, 0.06)
        g.strokeStyle = rgba('#b85f1c', 0.7)
        g.lineWidth = 1.6
        for (let k = -1; k <= 1; k++) {
          g.beginPath()
          g.ellipse(x + k * 7 * s, -12 * s, 6 * s, 14 * s, 0, 0, TAU)
          g.stroke()
        }
        strokeLine(g, [x, -26 * s, x + 3, -33 * s], '#5f7a3a', 3.4)
      }
      fillBlob(g, -132, -12, 30, 18, '#b9773a', r, 0.2)
      for (let i = 0; i < 22; i++) fillLeaf(g, -158 + r() * 52, -26 + r() * 26, 13, 6.5, r() * TAU, pal.litter[i % pal.litter.length])
    } else {
      fillBlob(g, -132, -16, 30, 22, season === 1 ? '#9cc76a' : '#5f9a4c', r, 0.2)
      for (let i = 0; i < 7; i++) dot(g, -150 + r() * 40, -28 + r() * 22, 3.6, season === 1 ? '#f6e27a' : '#f4a9bf')
      for (let i = 0; i < 5; i++) {
        const x = 104 + i * 12
        const h = 40 + r() * 46
        strokeLine(g, [x, 0, x + (r() - 0.5) * 6, -h], '#5f9a4c', 3)
        for (let k = 0; k < 3; k++) dot(g, x + (r() - 0.5) * 4, -h + k * 12, 5.5 - k * 0.6, season === 1 ? (i % 2 ? '#f6e27a' : '#ffffff') : i % 2 ? '#e98aa8' : '#f3c0d2')
      }
    }
    if (season === 2) {
      // A rose climbs over the door.
      g.strokeStyle = '#5a8a48'
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(dx - 52, 0)
      g.quadraticCurveTo(dx - 62, -110, dx - 20, -150)
      g.quadraticCurveTo(dx + 30, -160, dx + 54, -112)
      g.stroke()
      for (let i = 0; i < 16; i++) {
        const t = i / 15
        const u = 1 - t
        const x = t < 0.5 ? dx - 52 - Math.sin(t * 2 * Math.PI) * 8 + t * 2 * 32 : dx - 20 + (t - 0.5) * 2 * 74
        const y = t < 0.5 ? -t * 2 * 150 : -150 + (t - 0.5) * 2 * 38 - Math.sin((t - 0.5) * 2 * Math.PI) * 12
        fillBlob(g, x + (r() - 0.5) * 8, y + (r() - 0.5) * 8, 10, 8, '#5f9a4c', r, 0.2)
        if (i % 2 === 0) dot(g, x + (r() - 0.5) * 10, y + (r() - 0.5) * 10, 5, u > 0.5 ? '#e98aa8' : '#f3b0c4')
      }
    }
  })
}

// The cottage door, hinged on its left. `open` is 0 shut, 1 wide.
export function drawCottageDoor(g: G, x: number, y: number, open: number): void {
  const w = DOOR.w - 8
  const h = DOOR.h - 5
  g.save()
  g.translate(x - w / 2, y)
  g.scale(Math.max(0.12, 1 - open * 0.86), 1)
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, -h + w / 2)
  g.arc(w / 2, -h + w / 2, w / 2, Math.PI, 0)
  g.lineTo(w, 0)
  g.closePath()
  g.fillStyle = '#5b8c84'
  g.fill()
  g.strokeStyle = 'rgba(40,70,66,0.6)'
  g.lineWidth = 2
  for (let i = 1; i < 4; i++) {
    g.beginPath()
    g.moveTo((w * i) / 4, -2)
    g.lineTo((w * i) / 4, -h + 8)
    g.stroke()
  }
  g.fillStyle = '#f6cf7e'
  g.beginPath()
  g.arc(w / 2, -h + w / 2 + 6, 11, 0, TAU)
  g.fill()
  g.strokeStyle = '#3f5f5a'
  g.lineWidth = 3
  g.stroke()
  g.fillStyle = '#3a332e'
  g.beginPath()
  g.arc(w - 11, -h * 0.42, 4.5, 0, TAU)
  g.fill()
  g.restore()
}

// A leaf, a flake, a petal or a tuft of down, as the season drops them.
export function drawFall(g: G, season: Season, x: number, y: number, size: number, rot: number, color: string): void {
  if (season === 0) {
    g.fillStyle = color
    g.beginPath()
    g.arc(x, y, size * 0.55, 0, TAU)
    g.fill()
    return
  }
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.fillStyle = color
  if (season === 3) {
    g.beginPath()
    g.moveTo(-size * 1.2, 0)
    g.quadraticCurveTo(0, -size * 1.1, size * 1.2, 0)
    g.quadraticCurveTo(0, size * 1.1, -size * 1.2, 0)
    g.fill()
  } else if (season === 1) {
    g.beginPath()
    g.ellipse(0, 0, size * 0.8, size * 0.5, 0, 0, TAU)
    g.fill()
  } else {
    // Thistledown: a soft tuft above a tiny seed.
    g.globalAlpha *= 0.55
    g.beginPath()
    g.arc(0, -size * 0.3, size * 0.75, 0, TAU)
    g.fill()
    g.globalAlpha /= 0.55
    g.fillStyle = '#b9a27a'
    g.beginPath()
    g.arc(0, size * 0.7, 1.2, 0, TAU)
    g.fill()
  }
  g.restore()
}

// One distant ridge, drawn live so it can slide with the walk.
export function drawHill(g: G, shift: number, base: number, amp: number, freq: number, phase: number, color: string): void {
  g.beginPath()
  g.moveTo(0, 520)
  for (let x = 0; x <= TILE + 60; x += 60) {
    const wx = x + shift
    g.lineTo(x, base - amp * Math.sin(wx * freq + phase) - amp * 0.4 * Math.sin(wx * freq * 2.7 + phase * 2))
  }
  g.lineTo(TILE + 60, 520)
  g.closePath()
  g.fillStyle = color
  g.fill()
}


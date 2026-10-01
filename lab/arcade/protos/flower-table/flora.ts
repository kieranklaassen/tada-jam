// The plants of the cutting garden: which grow in which season, how each head
// is painted (once, into a sprite), and how a stem bends and is drawn.

import { TAU, drawSprite, fillBlob, makeSprite, mix, rgba, shade } from './paint.ts'
import type { G, Sprite } from './paint.ts'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

type HeadSpec =
  | { type: 'daisy'; R: number; n: number; pw: number; layers: number; c1: string; c2: string; cc: string; cr: number; cup?: string }
  | { type: 'pom'; R: number; rings: number; c1: string; c2: string; pw: number }
  | { type: 'cup'; R: number; c1: string; c2: string }
  | { type: 'spike'; kind: 'bud' | 'grain' | 'catkin' | 'needle'; H: number; w: number; c1: string; c2: string }
  | { type: 'tip'; kind: 'leaves' | 'berries' | 'bud'; R: number; c1: string; c2: string }
  | { type: 'bell'; R: number; c1: string }

interface LeafSpec {
  len: number
  wid: number
  count: number
  from: number
  to: number
  color: string
  color2: string
}

interface SpeciesDef {
  key: string
  full: number
  stem: string
  stemW: number
  leaf: LeafSpec
  head: HeadSpec
}

export interface Species extends SpeciesDef {
  heads: Sprite[]
  // How far from the tip a finger still counts as touching the head.
  headR: number
  // How far beyond the stem's tip the middle of the head lies.
  headC: number
  petal: string
}

export interface Leaf {
  // 0 at the cut end, 1 at the tip.
  t: number
  side: number
  size: number
}

const GREEN = '#6f8f4a'
const leafOf = (len: number, wid: number, count: number, color = '#6f9450', color2 = '#84a65c', from = 0.16, to = 0.72): LeafSpec => ({ len, wid, count, from, to, color, color2 })

const DEFS: Record<Season, { back: SpeciesDef[]; front: SpeciesDef[] }> = {
  spring: {
    back: [
      { key: 'tulip', full: 250, stem: '#7fa257', stemW: 5.5, leaf: leafOf(70, 13, 2, '#7ea65a', '#8fb468', 0.05, 0.3), head: { type: 'cup', R: 17, c1: '#d8473a', c2: '#ea6a52' } },
      { key: 'daffodil', full: 240, stem: '#7fa257', stemW: 5, leaf: leafOf(80, 8, 2, '#7ea65a', '#8fb468', 0.04, 0.2), head: { type: 'daisy', R: 29, n: 6, pw: 0.42, layers: 1, c1: '#f4d544', c2: '#f8e36e', cc: '#f0a030', cr: 10, cup: '#e8862a' } },
      { key: 'willow', full: 196, stem: '#8a6a4a', stemW: 4, leaf: leafOf(0, 0, 0), head: { type: 'spike', kind: 'catkin', H: 120, w: 9, c1: '#cfcac2', c2: '#f4f1ea' } },
      { key: 'tulip-pink', full: 262, stem: '#7fa257', stemW: 5.5, leaf: leafOf(70, 13, 2, '#7ea65a', '#8fb468', 0.05, 0.3), head: { type: 'cup', R: 17, c1: '#e88fa6', c2: '#f5b3c2' } },
      { key: 'hyacinth', full: 225, stem: '#7fa257', stemW: 5, leaf: leafOf(60, 9, 2, '#7ea65a', '#8fb468', 0.04, 0.22), head: { type: 'spike', kind: 'bud', H: 62, w: 13, c1: '#6f7fd0', c2: '#93a2e6' } },
    ],
    front: [
      { key: 'muscari', full: 170, stem: '#7fa257', stemW: 4, leaf: leafOf(56, 6, 2, '#7ea65a', '#8fb468', 0.04, 0.2), head: { type: 'spike', kind: 'bud', H: 44, w: 9, c1: '#5466bd', c2: '#7a8be0' } },
      { key: 'primrose', full: 165, stem: '#84a65c', stemW: 4, leaf: leafOf(34, 14, 3, '#7ea65a', '#93b96c'), head: { type: 'daisy', R: 22, n: 5, pw: 0.5, layers: 1, c1: '#f7e58a', c2: '#fbf0b4', cc: '#eab53a', cr: 6 } },
      { key: 'bellis', full: 180, stem: '#84a65c', stemW: 4, leaf: leafOf(26, 10, 3), head: { type: 'daisy', R: 21, n: 16, pw: 0.13, layers: 2, c1: '#f3c9cf', c2: '#fdf8ef', cc: '#f0c23c', cr: 7 } },
      { key: 'fern', full: 205, stem: '#7a9a50', stemW: 3.5, leaf: leafOf(30, 9, 9, '#7fb055', '#98c46a', 0.14, 0.94), head: { type: 'tip', kind: 'leaves', R: 16, c1: '#7fb055', c2: '#98c46a' } },
    ],
  },
  summer: {
    back: [
      { key: 'marguerite', full: 280, stem: GREEN, stemW: 4.5, leaf: leafOf(30, 10, 4), head: { type: 'daisy', R: 29, n: 17, pw: 0.14, layers: 2, c1: '#efe8d6', c2: '#fffaf0', cc: '#f0c23c', cr: 10 } },
      { key: 'cornflower', full: 262, stem: '#7d9a6a', stemW: 4, leaf: leafOf(40, 6, 4, '#86a274', '#97b184'), head: { type: 'daisy', R: 24, n: 12, pw: 0.17, layers: 2, c1: '#4f73c9', c2: '#7396e2', cc: '#3b3f8a', cr: 6 } },
      { key: 'lavender', full: 250, stem: '#8ea27a', stemW: 3.5, leaf: leafOf(34, 5, 4, '#93a986', '#a4b897', 0.08, 0.5), head: { type: 'spike', kind: 'bud', H: 66, w: 9, c1: '#8a73c4', c2: '#ab97dc' } },
      { key: 'rose', full: 270, stem: '#5f8249', stemW: 5, leaf: leafOf(30, 15, 4, '#5f8a4a', '#74a05a'), head: { type: 'pom', R: 28, rings: 3, c1: '#e58aa0', c2: '#f8cdd5', pw: 0.52 } },
      { key: 'poppy', full: 268, stem: '#86a060', stemW: 4, leaf: leafOf(34, 12, 2, '#7f9f5c', '#93b06e', 0.1, 0.4), head: { type: 'daisy', R: 31, n: 5, pw: 0.62, layers: 1, c1: '#d9432f', c2: '#ec6a50', cc: '#2f2a2a', cr: 7 } },
    ],
    front: [
      { key: 'calendula', full: 195, stem: GREEN, stemW: 4.5, leaf: leafOf(32, 11, 3), head: { type: 'daisy', R: 25, n: 14, pw: 0.17, layers: 2, c1: '#ee8a1e', c2: '#f8ac36', cc: '#b85f18', cr: 7 } },
      { key: 'fern', full: 215, stem: '#6f9450', stemW: 3.5, leaf: leafOf(30, 9, 9, '#6fa050', '#88b862', 0.14, 0.94), head: { type: 'tip', kind: 'leaves', R: 16, c1: '#6fa050', c2: '#88b862' } },
      { key: 'chamomile', full: 180, stem: '#84a65c', stemW: 3.5, leaf: leafOf(22, 6, 4, '#84a65c', '#98b870'), head: { type: 'daisy', R: 18, n: 13, pw: 0.16, layers: 1, c1: '#fffaf0', c2: '#fffaf0', cc: '#f0c23c', cr: 7 } },
      { key: 'strawberry', full: 185, stem: '#7a9a50', stemW: 3.5, leaf: leafOf(28, 15, 5, '#5f8f48', '#77a85a', 0.2, 0.9), head: { type: 'tip', kind: 'berries', R: 17, c1: '#d6402f', c2: '#5f8f48' } },
    ],
  },
  autumn: {
    back: [
      { key: 'sunflower', full: 312, stem: '#71904a', stemW: 6.5, leaf: leafOf(48, 23, 3, '#6c9148', '#80a556', 0.2, 0.7), head: { type: 'daisy', R: 41, n: 17, pw: 0.2, layers: 2, c1: '#e39a1c', c2: '#f6c53c', cc: '#6a4326', cr: 17 } },
      { key: 'dahlia', full: 282, stem: '#5f7f4a', stemW: 5, leaf: leafOf(36, 15, 3, '#5f864a', '#73995a'), head: { type: 'pom', R: 31, rings: 4, c1: '#a5302e', c2: '#e2704e', pw: 0.36 } },
      { key: 'aster', full: 255, stem: '#6d8a52', stemW: 4, leaf: leafOf(30, 8, 5, '#6f8f52', '#83a364'), head: { type: 'daisy', R: 24, n: 15, pw: 0.13, layers: 2, c1: '#7a5fb4', c2: '#a088d4', cc: '#eebf3c', cr: 7 } },
      { key: 'wheat', full: 290, stem: '#c9a95c', stemW: 3.5, leaf: leafOf(64, 5, 1, '#cfb268', '#cfb268', 0.3, 0.4), head: { type: 'spike', kind: 'grain', H: 60, w: 9, c1: '#e0bf70', c2: '#c79c48' } },
      { key: 'dahlia-apricot', full: 270, stem: '#5f7f4a', stemW: 5, leaf: leafOf(36, 15, 3, '#5f864a', '#73995a'), head: { type: 'pom', R: 28, rings: 4, c1: '#e58a52', c2: '#f8d09a', pw: 0.36 } },
    ],
    front: [
      { key: 'rudbeckia', full: 215, stem: GREEN, stemW: 4.5, leaf: leafOf(32, 11, 3), head: { type: 'daisy', R: 27, n: 12, pw: 0.2, layers: 1, c1: '#ef9a26', c2: '#f7bd3e', cc: '#4a2f22', cr: 9 } },
      { key: 'anemone', full: 200, stem: '#7d9a5a', stemW: 4, leaf: leafOf(30, 13, 3), head: { type: 'daisy', R: 25, n: 7, pw: 0.4, layers: 1, c1: '#e7a0b3', c2: '#f6cbd5', cc: '#e9c341', cr: 7 } },
      { key: 'rosehip', full: 232, stem: '#7a5a3c', stemW: 4, leaf: leafOf(26, 12, 6, '#8a9a4a', '#c2733a', 0.15, 0.85), head: { type: 'tip', kind: 'berries', R: 17, c1: '#c8372e', c2: '#8a9a4a' } },
      { key: 'beech', full: 226, stem: '#7b5a40', stemW: 4, leaf: leafOf(33, 15, 7, '#d9772c', '#e9a53c', 0.12, 0.9), head: { type: 'tip', kind: 'leaves', R: 18, c1: '#d9772c', c2: '#e9a53c' } },
    ],
  },
  winter: {
    back: [
      { key: 'holly', full: 262, stem: '#6a5a40', stemW: 4.5, leaf: leafOf(30, 15, 7, '#3f6b47', '#52805a', 0.12, 0.9), head: { type: 'tip', kind: 'berries', R: 17, c1: '#c8322c', c2: '#3f6b47' } },
      { key: 'pine', full: 168, stem: '#7a5c40', stemW: 4.5, leaf: leafOf(0, 0, 0), head: { type: 'spike', kind: 'needle', H: 130, w: 26, c1: '#4f7d58', c2: '#6c9a70' } },
      { key: 'dogwood', full: 300, stem: '#b5403a', stemW: 4, leaf: leafOf(0, 0, 0), head: { type: 'tip', kind: 'bud', R: 12, c1: '#b5403a', c2: '#d2625a' } },
      { key: 'seedhead', full: 284, stem: '#c2a56a', stemW: 3.5, leaf: leafOf(0, 0, 0), head: { type: 'daisy', R: 30, n: 22, pw: 0.045, layers: 1, c1: '#cdb27a', c2: '#cdb27a', cc: '#b89b62', cr: 5 } },
      { key: 'hellebore', full: 225, stem: '#6f8f5a', stemW: 5, leaf: leafOf(34, 13, 3, '#4f7a52', '#638f64'), head: { type: 'daisy', R: 26, n: 5, pw: 0.52, layers: 1, c1: '#e6dcc8', c2: '#f6f0e2', cc: '#c9d08a', cr: 8 } },
    ],
    front: [
      { key: 'snowdrop', full: 165, stem: '#7a9a60', stemW: 3.5, leaf: leafOf(60, 6, 2, '#6f9460', '#84a672', 0.04, 0.2), head: { type: 'bell', R: 13, c1: '#fbf8f0' } },
      { key: 'hellebore-rose', full: 188, stem: '#6f8f5a', stemW: 5, leaf: leafOf(34, 13, 3, '#4f7a52', '#638f64'), head: { type: 'daisy', R: 24, n: 5, pw: 0.52, layers: 1, c1: '#b98496', c2: '#d6a9b6', cc: '#d9d79a', cr: 7 } },
      { key: 'ivy', full: 196, stem: '#6a5a40', stemW: 3.5, leaf: leafOf(26, 16, 7, '#4f7850', '#689066', 0.1, 0.92), head: { type: 'tip', kind: 'leaves', R: 15, c1: '#4f7850', c2: '#689066' } },
      { key: 'hips', full: 205, stem: '#7a5a3c', stemW: 4, leaf: leafOf(0, 0, 0), head: { type: 'tip', kind: 'berries', R: 17, c1: '#c8372e', c2: '#7a5a3c' } },
    ],
  },
}

// A teardrop pointing up from the origin.
function petal(g: G, len: number, wid: number): void {
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(-wid, -len * 0.3, -wid * 0.9, -len * 0.96, 0, -len)
  g.bezierCurveTo(wid * 0.9, -len * 0.96, wid, -len * 0.3, 0, 0)
  g.fill()
}

function paintDaisy(g: G, rng: () => number, o: Extract<HeadSpec, { type: 'daisy' }>): void {
  for (let layer = 0; layer < o.layers; layer++) {
    const front = layer === o.layers - 1
    for (let i = 0; i < o.n; i++) {
      const a = ((i + (layer ? 0.5 : 0)) / o.n) * TAU + (rng() - 0.5) * 0.14
      const len = o.R * (layer ? 0.86 : 1) * (0.9 + rng() * 0.1)
      g.save()
      g.rotate(a)
      g.fillStyle = front ? mix(o.c2, o.c1, rng() * 0.35) : o.c1
      petal(g, len, o.pw * o.R * (0.9 + rng() * 0.2))
      g.strokeStyle = rgba(shade(o.c1, -0.25), 0.22)
      g.lineWidth = 0.8
      g.stroke()
      if (o.pw > 0.1) {
        g.strokeStyle = 'rgba(255,248,228,0.3)'
        g.lineWidth = 1.2
        g.beginPath()
        g.moveTo(0, -len * 0.3)
        g.lineTo(0, -len * 0.82)
        g.stroke()
      }
      g.restore()
    }
  }
  if (o.cup) {
    // A daffodil's trumpet: a frilled ring with a darker throat.
    const pts = 12
    g.fillStyle = o.cc
    g.beginPath()
    for (let i = 0; i <= pts * 2; i++) {
      const a = (i / (pts * 2)) * TAU
      const r = o.cr * (i % 2 === 0 ? 1.12 : 0.94)
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.closePath()
    g.fill()
    fillBlob(g, 0, 0, o.cr * 0.62, o.cr * 0.62, rng, o.cup, 0.08)
    return
  }
  fillBlob(g, 0, 0, o.cr, o.cr, rng, o.cc, 0.08)
  const seeds = Math.round(o.cr * 1.6)
  for (let i = 0; i < seeds; i++) {
    const a = rng() * TAU
    const r = Math.sqrt(rng()) * o.cr * 0.85
    g.fillStyle = rgba(rng() < 0.5 ? shade(o.cc, 0.4) : shade(o.cc, -0.35), 0.55)
    g.beginPath()
    g.arc(Math.cos(a) * r, Math.sin(a) * r, 0.9 + rng() * 0.9, 0, TAU)
    g.fill()
  }
}

function paintPom(g: G, rng: () => number, o: Extract<HeadSpec, { type: 'pom' }>): void {
  for (let k = 0; k < o.rings; k++) {
    const f = k / Math.max(1, o.rings - 1)
    const rr = o.R * (1 - (k / o.rings) * 0.8)
    const n = Math.max(5, Math.round(13 - k * 2.6))
    const base = mix(o.c1, o.c2, f)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + k * 0.45 + (rng() - 0.5) * 0.12
      g.save()
      g.rotate(a)
      g.translate(0, -rr * 0.36)
      g.fillStyle = mix(base, o.c2, rng() * 0.25)
      petal(g, rr * 0.66, rr * o.pw)
      g.strokeStyle = rgba(shade(o.c1, -0.3), 0.25)
      g.lineWidth = 0.8
      g.stroke()
      g.restore()
    }
  }
  fillBlob(g, 0, 0, o.R * 0.14, o.R * 0.14, rng, shade(o.c2, -0.12), 0.1)
}

function paintCup(g: G, o: Extract<HeadSpec, { type: 'cup' }>): void {
  const R = o.R
  const Hh = R * 2.15
  g.fillStyle = shade(o.c1, -0.16)
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(-R * 0.9, -Hh * 0.35, -R * 0.5, -Hh, 0, -Hh * 1.03)
  g.bezierCurveTo(R * 0.5, -Hh, R * 0.9, -Hh * 0.35, 0, 0)
  g.fill()
  for (const side of [-1, 1]) {
    g.fillStyle = side < 0 ? o.c1 : o.c2
    g.beginPath()
    g.moveTo(0, 0)
    g.bezierCurveTo(side * R * 1.3, -Hh * 0.2, side * R * 1.05, -Hh * 0.9, side * R * 0.34, -Hh * 0.97)
    g.bezierCurveTo(side * R * 0.02, -Hh * 0.62, -side * R * 0.2, -Hh * 0.3, 0, 0)
    g.fill()
    g.strokeStyle = rgba(shade(o.c1, -0.3), 0.25)
    g.lineWidth = 0.9
    g.stroke()
    g.strokeStyle = 'rgba(255,244,230,0.28)'
    g.lineWidth = 1.4
    g.beginPath()
    g.moveTo(side * R * 0.35, -Hh * 0.2)
    g.quadraticCurveTo(side * R * 0.75, -Hh * 0.5, side * R * 0.5, -Hh * 0.82)
    g.stroke()
  }
}

function paintSpike(g: G, rng: () => number, o: Extract<HeadSpec, { type: 'spike' }>, stem: string): void {
  if (o.kind === 'bud') {
    const rows = Math.round(o.H / 6.5)
    for (let j = 0; j < rows; j++) {
      const f = j / (rows - 1)
      const y = -4 - f * (o.H - 8)
      const half = o.w * (0.45 + 0.55 * Math.sin(Math.min(1, f * 1.25 + 0.12) * Math.PI) ** 0.7) * (1 - f * 0.25)
      for (let k = -1; k <= 1; k++) {
        const x = k * half * 0.7 + (rng() - 0.5) * 2
        fillBlob(g, x, y + Math.abs(k) * 2, half * 0.5 + 1.6, 4.4, rng, mix(o.c1, o.c2, rng()), 0.12, k * 0.5)
      }
    }
    return
  }
  if (o.kind === 'grain') {
    g.strokeStyle = stem
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, -o.H * 0.9)
    g.stroke()
    const rows = 8
    for (let j = 0; j < rows; j++) {
      const y = -6 - (j / rows) * (o.H - 16)
      for (const side of [-1, 1]) {
        g.strokeStyle = rgba(o.c2, 0.75)
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(side * 4, y - 6)
        g.lineTo(side * (9 + rng() * 5), y - 26 - rng() * 10)
        g.stroke()
        fillBlob(g, side * 4.4, y - 3 - (side > 0 ? 3 : 0), 4.2, 7.2, rng, mix(o.c1, o.c2, rng() * 0.6), 0.1, side * 0.42)
      }
    }
    fillBlob(g, 0, -o.H + 8, 3.6, 7, rng, o.c1, 0.1)
    return
  }
  if (o.kind === 'catkin') {
    g.strokeStyle = stem
    g.lineWidth = 3.4
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(3, -o.H * 0.5, 0, -o.H + 6)
    g.stroke()
    const n = 7
    for (let j = 0; j < n; j++) {
      const f = j / (n - 1)
      const y = -10 - f * (o.H - 22)
      const side = j % 2 === 0 ? -1 : 1
      const x = side * 6 + 1.5
      fillBlob(g, x, y, 5.2, o.w * (1 - f * 0.25), rng, o.c1, 0.08, side * 0.3)
      fillBlob(g, x - 1.2, y - 2.5, 2.2, o.w * 0.5, rng, rgba(o.c2, 0.85), 0.1, side * 0.3)
    }
    return
  }
  // Pine: a twig with needles brushing out to both sides.
  g.strokeStyle = stem
  g.lineWidth = 3.6
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, -o.H + 10)
  g.stroke()
  const n = 46
  for (let j = 0; j < n; j++) {
    const f = j / (n - 1)
    const y = -6 - f * (o.H - 18)
    const side = j % 2 === 0 ? -1 : 1
    const reach = o.w * (1 - f * 0.45) * (0.8 + rng() * 0.3)
    g.strokeStyle = mix(o.c1, o.c2, rng())
    g.lineWidth = 1.7
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(side * reach, y - reach * (0.7 + rng() * 0.3))
    g.stroke()
  }
}

function leafShape(g: G, len: number, wid: number, rot: number, fill: string): void {
  g.save()
  g.rotate(rot)
  g.fillStyle = fill
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(-wid, -len * 0.5, 0, -len)
  g.quadraticCurveTo(wid * 0.8, -len * 0.5, 0, 0)
  g.fill()
  g.strokeStyle = rgba(shade(fill, -0.3), 0.35)
  g.lineWidth = 0.9
  g.beginPath()
  g.moveTo(0, -2)
  g.lineTo(0, -len * 0.85)
  g.stroke()
  g.restore()
}

function berry(g: G, rng: () => number, x: number, y: number, r: number, color: string): void {
  fillBlob(g, x, y, r, r * 1.08, rng, color, 0.06)
  g.fillStyle = 'rgba(255,240,225,0.5)'
  g.beginPath()
  g.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(60,35,20,0.6)'
  g.beginPath()
  g.arc(x + r * 0.1, y + r * 0.72, r * 0.16, 0, TAU)
  g.fill()
}

function paintTip(g: G, rng: () => number, o: Extract<HeadSpec, { type: 'tip' }>): void {
  if (o.kind === 'leaves') {
    leafShape(g, o.R * 1.7, o.R * 0.75, -0.75, o.c1)
    leafShape(g, o.R * 1.7, o.R * 0.75, 0.75, o.c2)
    leafShape(g, o.R * 1.95, o.R * 0.8, 0, mix(o.c1, o.c2, 0.5))
    return
  }
  if (o.kind === 'bud') {
    leafShape(g, o.R * 1.5, o.R * 0.34, 0, o.c2)
    leafShape(g, o.R * 0.9, o.R * 0.26, -0.7, o.c1)
    leafShape(g, o.R * 0.9, o.R * 0.26, 0.7, o.c1)
    return
  }
  leafShape(g, o.R * 1.3, o.R * 0.55, -1.15, o.c2)
  leafShape(g, o.R * 1.3, o.R * 0.55, 1.15, o.c2)
  const r = o.R * 0.42
  berry(g, rng, -r * 1.0, -o.R * 0.75, r, shade(o.c1, -0.08))
  berry(g, rng, r * 1.05, -o.R * 0.82, r, o.c1)
  berry(g, rng, 0, -o.R * 1.35, r * 1.05, shade(o.c1, 0.08))
}

function paintBell(g: G, rng: () => number, o: Extract<HeadSpec, { type: 'bell' }>, stem: string): void {
  const R = o.R
  g.strokeStyle = stem
  g.lineWidth = 2.6
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(0, -R * 1.3, R * 0.75, -R * 1.15)
  g.quadraticCurveTo(R * 1.1, -R * 1.0, R * 1.05, -R * 0.62)
  g.stroke()
  fillBlob(g, R * 1.05, -R * 0.5, R * 0.3, R * 0.36, rng, '#7fa860', 0.08)
  for (const tilt of [-0.42, 0.42, 0]) {
    g.save()
    g.translate(R * 1.05, -R * 0.4)
    g.rotate(Math.PI + tilt)
    g.fillStyle = tilt === 0 ? o.c1 : shade(o.c1, -0.07)
    petal(g, R * 1.5, R * 0.42)
    g.strokeStyle = 'rgba(120,130,120,0.3)'
    g.lineWidth = 0.8
    g.stroke()
    g.restore()
  }
}

function paintHead(def: SpeciesDef, res: number, rng: () => number): Sprite {
  const o = def.head
  if (o.type === 'daisy' || o.type === 'pom') {
    const size = o.R * 2 + 14
    return makeSprite(size, size, size / 2, size / 2 + o.R * 0.1, res, (g) => {
      g.translate(size / 2, size / 2)
      if (o.type === 'daisy') paintDaisy(g, rng, o)
      else paintPom(g, rng, o)
    })
  }
  if (o.type === 'cup') {
    const w = o.R * 2.8 + 10
    const h = o.R * 2.3 + 12
    return makeSprite(w, h, w / 2, h - 6, res, (g) => {
      g.translate(w / 2, h - 6)
      paintCup(g, o)
    })
  }
  if (o.type === 'spike') {
    const w = o.w * 2 + (o.kind === 'grain' ? 40 : o.kind === 'needle' ? 16 : 22)
    const h = o.H + (o.kind === 'grain' ? 30 : 18)
    return makeSprite(w, h, w / 2, h - 5, res, (g) => {
      g.translate(w / 2, h - 5)
      paintSpike(g, rng, o, def.stem)
    })
  }
  if (o.type === 'tip') {
    const size = o.R * 4 + 12
    return makeSprite(size, size, size / 2, size - 8, res, (g) => {
      g.translate(size / 2, size - 8)
      paintTip(g, rng, o)
    })
  }
  const w = o.R * 3.2 + 10
  const h = o.R * 3 + 12
  return makeSprite(w, h, o.R * 0.7 + 5, o.R * 1.6 + 6, res, (g) => {
    g.translate(o.R * 0.7 + 5, o.R * 1.6 + 6)
    paintBell(g, rng, o, def.stem)
  })
}

function reach(o: HeadSpec): number {
  if (o.type === 'spike') return Math.min(40, o.H * 0.4)
  if (o.type === 'cup') return o.R * 1.5
  return o.R
}

function centre(o: HeadSpec): number {
  if (o.type === 'spike') return o.H * 0.5
  if (o.type === 'cup' || o.type === 'tip') return o.R
  return 0
}

function petalColor(o: HeadSpec): string {
  return o.type === 'bell' || o.type === 'spike' ? o.c1 : o.c2
}

export function buildSpecies(season: Season, res: number, rng: () => number): { back: Species[]; front: Species[] } {
  const build = (def: SpeciesDef): Species => ({
    ...def,
    heads: [paintHead(def, res, rng), paintHead(def, res, rng)],
    headR: reach(def.head),
    headC: centre(def.head),
    petal: petalColor(def.head),
  })
  return { back: DEFS[season].back.map(build), front: DEFS[season].front.map(build) }
}

export function makeLeaves(sp: Species, rng: () => number): Leaf[] {
  const out: Leaf[] = []
  const n = sp.leaf.count
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1)
    out.push({
      t: sp.leaf.from + (sp.leaf.to - sp.leaf.from) * f + (rng() - 0.5) * 0.03,
      side: i % 2 === 0 ? 1 : -1,
      size: (1.12 - f * 0.3) * (0.92 + rng() * 0.16),
    })
  }
  return out
}

// A stem is SEG short pieces. Points are relative to the cut end, y up is
// negative. Returns the direction at the tip (0 is straight up, positive leans
// right). `droop` hangs the upper part over to the `dir` side.
export const SEG = 7

export function layout(pts: Float32Array, len: number, a0: number, curve: number, droop: number, dir: number): number {
  const piece = len / SEG
  let x = 0
  let y = 0
  let a = a0
  pts[0] = 0
  pts[1] = 0
  for (let i = 0; i < SEG; i++) {
    const u = (i + 0.5) / SEG
    const k = u < 0.3 ? 0 : (u - 0.3) / 0.7
    a = a0 + curve * u + dir * droop * 2.25 * k * k
    x += Math.sin(a) * piece
    y -= Math.cos(a) * piece
    pts[(i + 1) * 2] = x
    pts[(i + 1) * 2 + 1] = y
  }
  return a
}

function leafPath(g: G, pts: Float32Array, t: number, side: number, len: number, wid: number): void {
  const f = t * SEG
  const i = Math.min(SEG - 1, Math.floor(f))
  const fr = f - i
  const x0 = pts[i * 2]!
  const y0 = pts[i * 2 + 1]!
  const dx = pts[i * 2 + 2]! - x0
  const dy = pts[i * 2 + 3]! - y0
  const px = x0 + dx * fr
  const py = y0 + dy * fr
  const a = Math.atan2(dx, -dy) + side * 0.95
  const ux = Math.sin(a)
  const uy = -Math.cos(a)
  const nx = -uy * side
  const ny = ux * side
  const tx = px + ux * len
  const ty = py + uy * len
  const mx = px + ux * len * 0.45
  const my = py + uy * len * 0.45
  g.moveTo(px, py)
  g.quadraticCurveTo(mx + nx * wid * 0.5, my + ny * wid * 0.5 - wid * 0.2, tx, ty)
  g.quadraticCurveTo(mx - nx * wid, my - ny * wid, px, py)
}

// Draw one stem with its leaves and head. The caller has already translated
// (and scaled) to the cut end. `tScale` stretches leaf positions for a garden
// plant that has not grown back to its full length yet.
export function drawFlower(g: G, sp: Species, variant: number, pts: Float32Array, tipA: number, leaves: readonly Leaf[], tScale: number, bloom: number): void {
  if (leaves.length > 0 && sp.leaf.len > 0) {
    for (let pass = 0; pass < 2; pass++) {
      let any = false
      for (let i = pass; i < leaves.length; i += 2) {
        const lf = leaves[i]!
        const t = lf.t * tScale
        if (t > 0.97) continue
        if (!any) {
          g.beginPath()
          any = true
        }
        leafPath(g, pts, t, lf.side, sp.leaf.len * lf.size, sp.leaf.wid * lf.size)
      }
      if (any) {
        g.fillStyle = pass === 0 ? sp.leaf.color : sp.leaf.color2
        g.fill()
      }
    }
  }
  g.strokeStyle = sp.stem
  g.lineWidth = sp.stemW
  g.beginPath()
  g.moveTo(pts[0]!, pts[1]!)
  for (let i = 1; i < SEG; i++) {
    const x = pts[i * 2]!
    const y = pts[i * 2 + 1]!
    g.quadraticCurveTo(x, y, (x + pts[i * 2 + 2]!) / 2, (y + pts[i * 2 + 3]!) / 2)
  }
  const tx = pts[SEG * 2]!
  const ty = pts[SEG * 2 + 1]!
  g.lineTo(tx, ty)
  g.stroke()
  if (bloom > 0.03) drawSprite(g, sp.heads[variant]!, tx, ty, tipA, bloom)
}

export function seasonOf(month: number): Season {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

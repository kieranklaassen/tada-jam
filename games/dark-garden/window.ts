import type { Kind } from './cast'
import { GATE, HALF, PLACES, type Place } from './garden'
import { cut, GATE_PANE, MIDDLE, trace, type Pane } from './panes'
import { LEAD, line, makeCanvas, oval, piece, streakTile, type Canvas, type G } from './glass'

// The window, painted twice for a size: once dark, once all lit. What is
// shown between the two is clipped from the lit one, along the lead.

export type Frame = { x0: number; y0: number; x1: number; y1: number }

/** The glass of each place when light comes through it. */
const LIT: readonly (readonly string[])[] = [
  ['#7fae2e', '#a8c93a', '#5c9440', '#c9d858'],
  ['#1f97ae', '#35b7bd', '#1b7a9c', '#74d2c4'],
  ['#e08a22', '#f0ab34', '#c96f1e', '#f6c95a'],
  ['#b83a72', '#d4578a', '#962f6b', '#e887a4'],
  ['#2f8f58', '#57b06b', '#1f7a56', '#93cc78'],
  ['#3b62c4', '#5585dc', '#2f4ba6', '#86aeea'],
  ['#d0583a', '#e67a4b', '#b2433a', '#f2a06a'],
  ['#8fbb35', '#b4d04a', '#6d9c34', '#d3e070'],
  ['#4aa36a', '#74c07c', '#34885e', '#a6d88e'],
  ['#c8467c', '#e06a94', '#a33772', '#f094ae'],
]
const NIGHT = ['#10143a', '#131a46', '#0e1030', '#181c4e', '#151338']
const PATH_LIT = ['#f3d98b', '#f8e6ac', '#e9c772'], PATH_DARK = ['#3a3c74', '#42457f', '#34366b']
const MIDDLE_LIT = ['#e79a2c', '#f2b03c', '#d9841f', '#f6c552']

function colorOf(pane: Pane, lit: boolean): string {
  const pick = (list: readonly string[]) => list[Math.min(list.length - 1, Math.floor(pane.tone * list.length))]
  if (pane.kind === 'middle' || pane.owner === MIDDLE) return pane.kind === 'hedge' ? '#3f6e2c' : pane.kind === 'path' ? pick(PATH_LIT) : pick(MIDDLE_LIT)
  if (pane.kind === 'path') return pick(lit ? PATH_LIT : PATH_DARK)
  if (pane.kind === 'hedge') return lit ? pick(['#1f6b3a', '#2a7d43', '#185a34']) : pick(['#0d2a2c', '#0f2f30', '#0b2428'])
  if (pane.owner === GATE_PANE) return pick(lit ? ['#39407f', '#444d92', '#30366e'] : ['#272c66', '#2d3372', '#222658'])
  return pick(lit ? LIT[pane.owner] : NIGHT)
}

function panesOnto(g: G, panes: readonly Pane[], lit: boolean): void {
  const pattern = g.createPattern(streakTile(), 'repeat')
  for (const pane of panes) {
    g.beginPath()
    trace(g, pane)
    g.fillStyle = colorOf(pane, lit)
    g.fill()
    if (pattern && pane.kind !== 'hedge') {
      g.globalAlpha = lit ? 0.9 : 0.34
      g.fillStyle = pattern
      g.fill()
      g.globalAlpha = 1
    }
    g.strokeStyle = LEAD
    g.lineWidth = pane.kind === 'hedge' ? 2.5 : pane.kind === 'path' ? 3.5 : 5
    g.lineJoin = 'round'
    g.stroke()
  }
  // Solder where the leads meet, and a thin light along it.
  g.fillStyle = lit ? 'rgba(255,255,255,0.16)' : 'rgba(150,160,220,0.1)'
  for (const pane of panes) if (pane.kind === 'band') { const p = pane.points[0]; g.beginPath(); g.ellipse(p.x, p.y, 3, 2.4, 0.5, 0, 7); g.fill() }
}

type Shade = Readonly<Record<'a' | 'b' | 'c' | 'd' | 'hole', string>>
const DEN: Readonly<Record<Kind, { lit: Shade; dark: Shade }>> = {
  pond: { lit: { a: '#4fc3e6', b: '#8fe0f2', c: '#3fa04a', d: '#f4d7e6', hole: '#1b6f9e' }, dark: { a: '#1b2a63', b: '#223574', c: '#142c3c', d: '#2b2d63', hole: '#131d4a' } },
  tree: { lit: { a: '#8a5126', b: '#a8672f', c: '#e9a92c', d: '#f4c84a', hole: '#3a1d14' }, dark: { a: '#221d44', b: '#29234f', c: '#1b2150', d: '#20285e', hole: '#0b0920' } },
  burrow: { lit: { a: '#7a4a2c', b: '#99602f', c: '#6fae3a', d: '#97c94a', hole: '#2a1410' }, dark: { a: '#231f48', b: '#2a2553', c: '#17283f', d: '#1c304b', hole: '#0b0920' } },
  moss: { lit: { a: '#9aa4ac', b: '#b9c2c6', c: '#4f9a34', d: '#86c23c', hole: '#6b757f' }, dark: { a: '#242a58', b: '#2b3264', c: '#142e3a', d: '#193745', hole: '#1a1f48' } },
}

/** What is there, whoever sleeps in it: a pond, a hollow tree, a burrow, a mossy stone. */
export function den(g: G, kind: Kind, lit: boolean): void {
  const s = DEN[kind][lit ? 'lit' : 'dark']
  if (kind === 'pond') {
    oval(g, 0, -20, 96, 36, s.a, 5)
    oval(g, 6, -15, 64, 21, s.hole, 4)
    piece(g, 'M-84 -18 C -84 -32 -58 -34 -50 -22 L-66 -18 L-50 -12 C -60 -4 -84 -6 -84 -18 Z', s.c, 4)
    piece(g, 'M58 -2 C 62 -14 88 -14 92 -2 L78 -2 L84 6 C 72 10 58 6 58 -2 Z', s.c, 4)
    piece(g, 'M92 -30 C 88 -66 96 -84 98 -104 C 106 -84 104 -56 102 -28 Z', s.c, 4)
    piece(g, 'M110 -26 C 110 -50 118 -62 124 -74 C 126 -54 122 -40 118 -24 Z', s.c, 4)
  } else if (kind === 'tree') {
    piece(g, 'M-62 -128 C -108 -126 -112 -176 -70 -178 C -62 -214 -4 -218 10 -190 C 40 -212 88 -192 80 -160 C 108 -146 96 -112 58 -122 Z', s.c, 5)
    piece(g, 'M-34 -180 C -20 -196 4 -196 12 -176 C 0 -164 -24 -164 -34 -180 Z', s.d, 4)
    piece(g, 'M-46 0 C -58 2 -72 6 -78 6 C -58 -10 -48 -34 -50 -70 C -52 -100 -56 -120 -62 -130 L58 -124 C 50 -108 48 -90 48 -66 C 48 -34 58 -10 76 6 C 62 6 52 2 44 0 Z', s.a, 5)
    line(g, 'M-40 -14 C -42 -34 -44 -60 -44 -80 M42 -18 C 40 -40 42 -70 44 -90', 4)
    oval(g, 0, -68, 37, 46, s.hole, 5)
  } else if (kind === 'burrow') {
    piece(g, 'M-104 4 C -98 -60 -54 -98 0 -98 C 56 -98 98 -58 104 4 Z', s.a, 5)
    piece(g, 'M-104 4 C -100 -42 -78 -72 -52 -86 C -44 -50 -46 -20 -50 4 Z', s.b, 4)
    piece(g, 'M-84 -56 C -60 -110 60 -112 86 -54 C 62 -72 52 -58 40 -74 C 26 -60 12 -62 2 -76 C -12 -60 -30 -62 -40 -74 C -54 -58 -66 -68 -84 -56 Z', s.c, 4)
    piece(g, 'M-44 4 C -46 -50 -20 -62 0 -62 C 24 -62 46 -48 44 4 Z', s.hole, 5)
  } else {
    piece(g, 'M-92 4 C -98 -36 -62 -58 -20 -56 C 30 -66 86 -44 92 4 Z', s.a, 5)
    piece(g, 'M-10 4 C -14 -24 -16 -40 -20 -56 C 30 -66 86 -44 92 4 Z', s.b, 4)
    piece(g, 'M-92 -6 C -88 -50 -54 -70 -26 -62 C -10 -78 32 -78 44 -56 C 76 -56 92 -30 90 -8 C 74 -22 62 -14 52 -28 C 38 -14 26 -24 14 -34 C -4 -20 -22 -22 -34 -34 C -52 -14 -74 -20 -92 -6 Z', s.c, 5)
    piece(g, 'M-40 -44 C -24 -60 4 -58 12 -44 C -2 -34 -26 -34 -40 -44 Z', s.d, 3.5)
    piece(g, 'M30 -46 C 42 -54 62 -48 66 -36 C 54 -30 38 -34 30 -46 Z', s.d, 3.5)
  }
}

const dens = new Map<string, Canvas>()
/** The same, painted once and stamped. */
export function stampDen(g: G, kind: Kind, lit: boolean): void {
  const key = `${kind} ${lit}`
  let canvas = dens.get(key)
  if (!canvas) {
    canvas = makeCanvas(290 * 2.4, 260 * 2.4)
    const c = canvas.getContext('2d')!
    c.setTransform(2.4, 0, 0, 2.4, 140 * 2.4, 235 * 2.4)
    den(c, kind, lit)
    dens.set(key, canvas)
  }
  g.drawImage(canvas, -140, -235, 290, 260)
}

/** A gold paper star where an apple may stand. */
export function star(g: G, place: Place, k: number, color: string): void {
  g.save()
  g.translate(place.apple.x, place.apple.y)
  g.scale(k, k * 0.62)
  piece(g, 'M0 -34 L9 -11 L33 -11 L14 5 L21 28 L0 14 L-21 28 L-14 5 L-33 -11 L-9 -11 Z', color, 4)
  g.restore()
}

/** The little garden gate and its low wall, behind those who wait. */
function gate(g: G, lit: boolean): void {
  const wood = lit ? '#8f5b34' : '#5b3f52', light = lit ? '#b57a44' : '#6d4d63', wall = lit ? '#767fb5' : '#3a4080', wall2 = lit ? '#8b95c9' : '#444b90'
  // Two posts with round heads, the gate swung open against the left one.
  piece(g, 'M232 776 L262 776 L262 690 L232 690 Z', wood, 5)
  oval(g, 247, 682, 21, 17, light, 5)
  piece(g, 'M-40 776 L14 776 L14 640 L-40 640 Z', wood, 5)
  piece(g, 'M20 770 L58 752 L58 628 L20 640 Z', light, 5)
  line(g, 'M39 760 L39 634 M20 690 L58 678', 4)
  oval(g, -6, 628, 30, 20, light, 5)
  let x = 262
  for (const [w, c] of [[60, wall], [66, wall2], [56, wall], [44, wall2]] as const) {
    piece(g, `M${x} 776 L${x + w} 776 L${x + w} 726 C ${x + w * 0.7} 716 ${x + w * 0.3} 716 ${x} 726 Z`, c, 5)
    x += w
  }
  piece(g, 'M-420 900 L-420 776 L492 776 C 502 800 498 820 494 900 Z', lit ? '#4d5398' : '#2c316c', 5)
  line(g, 'M60 776 L40 900 M240 776 L256 900 M400 776 L430 900', 4)
  oval(g, GATE.x, GATE.y + 4, 104, 26, lit ? '#6a72b8' : '#474e98', 4)
}

export type Painted = { dark: Canvas; lit: Canvas; clips: readonly { path: Path2D; panes: readonly { path: Path2D; far: number; mid: { x: number; y: number } }[]; box: Frame }[] }

export function paint(frame: Frame, scale: number): Painted {
  const panes = cut()
  const layer = (lit: boolean): Canvas => {
    const canvas = makeCanvas((frame.x1 - frame.x0) * scale, (frame.y1 - frame.y0) * scale), g = canvas.getContext('2d')!
    g.setTransform(scale, 0, 0, scale, -frame.x0 * scale, -frame.y0 * scale)
    g.fillStyle = LEAD
    g.fillRect(frame.x0, frame.y0, frame.x1 - frame.x0, frame.y1 - frame.y0)
    panesOnto(g, panes.filter((p) => p.kind === 'middle'), lit)
    // Light falls off from the flame through the middle.
    panesOnto(g, panes.filter((p) => p.kind === 'band'), lit)
    if (!lit) {
      // The flame lights the glass about it a little, so the night is blue and not black.
      const fade = g.createRadialGradient(645, 405, 40, 645, 405, 330)
      fade.addColorStop(0, 'rgba(120,110,220,0.34)')
      fade.addColorStop(1, 'rgba(60,60,160,0)')
      g.fillStyle = fade
      g.fillRect(frame.x0, frame.y0, frame.x1 - frame.x0, frame.y1 - frame.y0)
    }
    panesOnto(g, panes.filter((p) => p.kind === 'hedge'), lit)
    panesOnto(g, panes.filter((p) => p.kind === 'path'), lit)
    for (const place of PLACES) {
      if (lit) {
        const fade = g.createRadialGradient(place.apple.x, place.apple.y - 20, 8, place.apple.x, place.apple.y - 20, 150)
        fade.addColorStop(0, 'rgba(255,240,180,0.75)')
        fade.addColorStop(0.4, 'rgba(255,230,150,0.28)')
        fade.addColorStop(1, 'rgba(255,230,150,0)')
        g.fillStyle = fade
        g.fillRect(place.apple.x - 150, place.apple.y - 170, 300, 300)
      }
      star(g, place, 0.78, lit ? '#f7d35a' : '#4a4678')
    }
    gate(g, lit)
    return canvas
  }
  const clips = PLACES.map((place) => {
    const path = new Path2D(), box = { x0: 9e9, y0: 9e9, x1: -9e9, y1: -9e9 }
    const own = panes.filter((p) => p.owner === place.id).map((p) => {
      const one = new Path2D()
      trace(one, p)
      path.addPath(one)
      for (const q of p.points) { box.x0 = Math.min(box.x0, q.x); box.y0 = Math.min(box.y0, q.y); box.x1 = Math.max(box.x1, q.x); box.y1 = Math.max(box.y1, q.y) }
      return { path: one, far: Math.hypot(p.mid.x - place.apple.x, p.mid.y - place.apple.y), mid: p.mid }
    })
    return { path, panes: own, box }
  })
  return { dark: layer(false), lit: layer(true), clips }
}

export const PATH_WIDE = HALF * 2

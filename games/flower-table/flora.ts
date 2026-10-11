import { Brush, sheet, tone, type G } from './paint'
import { KINDS, PLANTS, type Kind } from './plants'
import { makeRng } from './rng'

// The six plants as painted sprites: one whole stem of each, from the earth
// to the top of its flower, upright, with its base at the middle of the
// sprite's lower edge. A cut is a straight line across the stem, so a stalk
// left in the bed, a piece in the hand and a piece in the vase are all a
// stretch of this one sprite, drawn with one call each.
//
// The plants are the pieces the child works with. They carry no face and
// have no motion of their own: they move only when something is done to them.

/** Room above the flower, in stage units, so a petal is never cut off by the edge of the sprite. */
export const PAD = 12

/** Half the width of each plant's sprite, in stage units: its widest leaf or its flower. */
export const HALF: Record<Kind, number> = { sunflower: 72, poppy: 46, onion: 52, thistle: 46, ivy: 44, dandelion: 44 }

export type StemSprite = { canvas: HTMLCanvasElement; half: number; full: number }
export type Flora = Record<Kind, { whole: StemSprite; spent: StemSprite }>

const GREEN = '#5f8c30', LEAF = '#4f7f2c', LIGHT_LEAF = '#86ac3e'

/** A leaf as one filled passage with a lit midrib: from its foot at (x, y), `long` out at the angle `a`, `wide` across. */
function leaf(brush: Brush, x: number, y: number, a: number, long: number, wide: number, color: string): void {
  const g = brush.g
  g.save()
  g.translate(x, y)
  g.rotate(a)
  brush.within(0, -wide / 2, long, wide / 2).fill((p) => {
    p.moveTo(0, 0)
    p.bezierCurveTo(long * 0.25, -wide * 0.75, long * 0.75, -wide * 0.6, long, 0)
    p.bezierCurveTo(long * 0.75, wide * 0.55, long * 0.3, wide * 0.7, 0, 0)
  }, color, 3, 0)
  brush.stroke([2, 0, long * 0.5, -1.5, long * 0.92, 0], Math.max(1.2, wide * 0.07), tone(color, 0.4), 0)
  g.restore()
}

function sunflower(brush: Brush, full: number): void {
  brush.stroke([0, 0, 4, -full * 0.3, -3, -full * 0.6, 0, -full + 60], 12, GREEN)
  leaf(brush, 3, -96, -0.5, 62, 44, LEAF)
  leaf(brush, -2, -168, Math.PI + 0.45, 58, 40, LEAF)
  leaf(brush, 0, -232, -0.62, 46, 32, LIGHT_LEAF)
  const cx = -2, cy = -full + 53
  // Two rings of petals, each one touch of a loaded brush, and the dark disc of seeds.
  for (let ring = 0; ring < 2; ring++) {
    const count = ring ? 13 : 16
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.2
      const r = ring ? 30 : 37
      brush.dab(cx + Math.cos(a) * r, cy + Math.sin(a) * r, ring ? 13 : 15, 6.5, a, ['#f2bc12', '#ffd23a', '#e9a80c'][(i + ring) % 3])
    }
  }
  brush.dab(cx, cy, 25, 24, 0, '#5b3312')
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4, r = 3 + (i / 26) * 19
    brush.dab(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.2, 2.2, 0, i % 3 ? '#8b5a22' : '#3a1f0c', 0.5)
  }
}

function poppy(brush: Brush, full: number, spent: boolean): void {
  brush.stroke([0, 0, -3, -full * 0.4, 3, -full * 0.75, 0, -full + 36], 5, '#6f9440')
  // Fine hairs on the stalk.
  for (let i = 0; i < 12; i++) brush.stroke([(i % 2 ? 2 : -2), -30 - i * 13, (i % 2 ? 7 : -7), -34 - i * 13], 1, '#a9c476', 0)
  for (const side of [-1, 1]) {
    const y = side < 0 ? -44 : -74
    for (let i = 0; i < 4; i++) brush.dab(side * (9 + i * 8), y - i * 6 + (i % 2) * 5, 9 - i, 4, side * (-0.5 - i * 0.12), i % 2 ? LIGHT_LEAF : LEAF, 0.7)
    brush.stroke([0, y + 6, side * 20, y - 8, side * 40, y - 20], 1.6, LEAF, 0)
  }
  const cx = 0, cy = -full + 34
  if (spent) {
    // The bare pod: a small green urn with a flat ribbed crown.
    brush.dab(cx, cy + 4, 9, 11, 0, '#8ea66c')
    brush.dab(cx, cy - 7, 11, 3.6, 0, '#6d8450')
    return
  }
  const petals: [number, number, number, number, string][] = [[-17, 2, 21, 19, '#d42d18'], [17, 3, 21, 19, '#e23a1e'], [0, -15, 23, 18, '#ef4a26'], [0, 14, 22, 15, '#c9240f']]
  for (const [dx, dy, rx, ry, color] of petals) brush.dab(cx + dx, cy + dy, rx, ry, dx * 0.02, color)
  brush.dab(cx, cy + 1, 9, 8, 0, '#26101c', 0.6)
  for (let i = 0; i < 9; i++) brush.dab(cx + Math.cos(i * 0.7) * 11, cy + 1 + Math.sin(i * 0.7) * 10, 1.8, 1.8, 0, '#4a2a55', 0.4)
  brush.dab(cx, cy, 4.2, 4.2, 0, '#9db679')
}

function onion(brush: Brush, full: number): void {
  // Two long strap leaves from the earth, arching out and over.
  brush.stroke([-4, 0, -22, -80, -44, -128, -48, -92], 9, LEAF)
  brush.stroke([4, 0, 20, -64, 40, -104, 47, -74], 8, LIGHT_LEAF)
  brush.stroke([0, 0, 1, -full * 0.5, 0, -full + 50], 9, '#7ea048')
  const cx = 0, cy = -full + 38
  // A globe of small florets on thin stalks, lit from the window.
  for (let i = 0; i < 22; i++) {
    const a = i * 2.39996
    brush.stroke([cx, cy, cx + Math.cos(a) * 30, cy + Math.sin(a) * 30], 1.2, '#7e6aa8', 0)
  }
  for (let i = 0; i < 64; i++) {
    const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 64) * 34
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    const lit = (-(x - cx) - (y - cy)) / 48
    brush.dab(x, y, 4.6, 3.6, a, lit > 0.25 ? '#cdb2f3' : lit > -0.2 ? '#a57cdd' : '#6f4aa6', 0.8)
  }
}

function thistle(brush: Brush, full: number): void {
  brush.stroke([0, 0, -2, -full * 0.45, 2, -full + 52], 7, '#7d9a72')
  // Spiny leaves in pairs, silver green: a zigzag of small points along a rib.
  for (let pair = 0; pair < 3; pair++) {
    const y = -46 - pair * 62
    for (const side of [-1, 1]) {
      const long = 40 - pair * 5
      brush.stroke([side * 2, y, side * long * 0.5, y - 12, side * long, y - 18], 4, '#93ad8c')
      for (let i = 1; i <= 4; i++) {
        const t = i / 4.5
        const x = side * long * t, yy = y - 18 * t
        brush.stroke([x, yy, x + side * 5, yy - 10], 2, '#b7cdb0', 0.6)
        brush.stroke([x, yy, x + side * 7, yy + 7], 2, '#88a381', 0.6)
      }
    }
  }
  for (let i = 0; i < 9; i++) brush.stroke([(i % 2 ? 3 : -3), -22 - i * 26, (i % 2 ? 8 : -8), -28 - i * 26], 1.2, '#b7cdb0', 0)
  const cx = 0, cy = -full + 40
  // The tuft: fine strokes fanning up out of the scaly bulb.
  for (let i = 0; i < 17; i++) {
    const a = -Math.PI / 2 + (i / 16 - 0.5) * 1.75
    brush.stroke([cx + Math.cos(a) * 8, cy - 8 + Math.sin(a) * 6, cx + Math.cos(a) * 26, cy - 10 + Math.sin(a) * 31], 3, ['#c247a0', '#d968bd', '#a23486'][i % 3], 0.7)
  }
  brush.dab(cx, cy + 4, 15, 16, 0, '#7f9a74')
  for (let row = 0; row < 3; row++) for (let i = -2; i <= 2; i++) brush.dab(cx + i * 6 + (row % 2) * 3, cy - 4 + row * 7, 3.4, 2.4, 0.5, row % 2 ? '#a9c09f' : '#5f7a58', 0.5)
}

/** An ivy leaf: three lobes with pale veins, dark green edged with cream so that it reads on the dark wall. */
function ivyLeaf(brush: Brush, x: number, y: number, a: number, size: number, color: string): void {
  const g = brush.g
  g.save()
  g.translate(x, y)
  g.rotate(a)
  const shape = (p: G, s: number): void => {
    p.moveTo(0, 0)
    p.quadraticCurveTo(-s * 0.2, -s * 0.5, -s * 0.05, -s * 0.62)
    p.quadraticCurveTo(s * 0.3, -s * 0.5, s * 0.36, -s * 0.2)
    p.quadraticCurveTo(s * 0.74, -s * 0.28, s, 0)
    p.quadraticCurveTo(s * 0.74, s * 0.28, s * 0.36, s * 0.2)
    p.quadraticCurveTo(s * 0.3, s * 0.5, -s * 0.05, s * 0.62)
    p.quadraticCurveTo(-s * 0.2, s * 0.5, 0, 0)
  }
  brush.within(0, -size * 0.6, size, size * 0.6).fill((p) => shape(p, size * 1.12), '#d9e0a2', 0, 0, 0.4)
  brush.fill((p) => shape(p, size), color, 3, 0)
  brush.stroke([2, 0, size * 0.9, 0], 1.3, '#cfe0a0', 0)
  brush.stroke([size * 0.25, 0, size * 0.1, -size * 0.45], 1, '#cfe0a0', 0)
  brush.stroke([size * 0.25, 0, size * 0.1, size * 0.45], 1, '#cfe0a0', 0)
  g.restore()
}

function ivy(brush: Brush, full: number): void {
  const pts: number[] = []
  for (let i = 0; i <= 8; i++) pts.push(Math.sin(i * 1.5) * 7, -((full - 44) * i) / 8)
  brush.stroke(pts, 5, '#6b5a34')
  for (let i = 0; i < 8; i++) {
    const y = -26 - i * 30, side = i % 2 ? 1 : -1
    ivyLeaf(brush, Math.sin((i + 0.8) * 1.5) * 6, y, side > 0 ? -0.5 : Math.PI + 0.5, 30 - i * 1.2, i % 3 === 1 ? '#3f8046' : '#2f6b3a')
  }
  // The young tip: two pale leaves and a tendril that curls.
  const ty = -full + 42
  ivyLeaf(brush, 0, ty, -1.1, 20, '#6fa14c')
  ivyLeaf(brush, 0, ty, -2.2, 17, '#86b55a')
  const curl: number[] = []
  for (let i = 0; i <= 14; i++) { const a = -1.4 + i * 0.5, r = 15 - i * 0.9; curl.push(2 + Math.cos(a) * r, ty - 20 + Math.sin(a) * r) }
  brush.stroke(curl, 2, '#9cc266', 0.6)
}

function dandelion(brush: Brush, full: number, spent: boolean): void {
  // A rosette of jagged leaves flat on the earth, and a pale hollow stalk.
  for (const [a, long] of [[-0.35, 40], [Math.PI + 0.3, 42], [-0.9, 28]] as const) {
    leaf(brush, 0, -3, a, long, 15, LEAF)
  }
  brush.stroke([0, 0, 3, -full * 0.5, 0, -full + 34], 6, '#b6c48c')
  const cx = 0, cy = -full + 32
  brush.dab(cx, cy, 6, 5, 0, '#9aa56c')
  if (spent) {
    for (let i = 0; i < 9; i++) { const a = i * 0.7; brush.stroke([cx, cy, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9], 1, '#cfd3b4', 0) }
    return
  }
  // The clock: a soft ball of white, each seed a hair with a point of light at its end.
  const g = brush.g
  const ball = g.createRadialGradient(cx - 6, cy - 7, 2, cx, cy, 30)
  ball.addColorStop(0, 'rgba(255,253,244,0.62)')
  ball.addColorStop(0.75, 'rgba(240,238,224,0.34)')
  ball.addColorStop(1, 'rgba(240,238,224,0)')
  g.fillStyle = ball
  g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill()
  for (let i = 0; i < 46; i++) {
    const a = i * 2.39996, r = 16 + ((i * 7) % 12)
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    brush.stroke([cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, x, y], 0.9, 'rgba(250,248,236,0.75)', 0)
    brush.dab(x, y, 2.5, 2.5, 0, (-(x - cx) - (y - cy)) > 4 ? '#fffdf2' : '#d9d6c4', 0.3)
  }
}

/** Paints every plant, whole and spent, at `density` pixels to the stage unit. */
export function paintFlora(density: number): Flora {
  const make = (kind: Kind, spent: boolean): StemSprite => {
    const full = PLANTS[kind].full, half = HALF[kind]
    const { canvas, g } = sheet(half * 2, full + PAD, density)
    g.translate(half, full + PAD)
    // The same seed for every painting of a plant, so its spent sprite differs only in the flower.
    const brush = new Brush(g, makeRng(KINDS.indexOf(kind) * 977 + 31))
    switch (kind) {
      case 'sunflower': sunflower(brush, full); break
      case 'poppy': poppy(brush, full, spent); break
      case 'onion': onion(brush, full); break
      case 'thistle': thistle(brush, full); break
      case 'ivy': ivy(brush, full); break
      case 'dandelion': dandelion(brush, full, spent); break
    }
    return { canvas, half, full }
  }
  const flora = {} as Flora
  for (const kind of KINDS) {
    const whole = make(kind, false)
    flora[kind] = { whole, spent: kind === 'poppy' || kind === 'dandelion' ? make(kind, true) : whole }
  }
  return flora
}

/**
 * Draws the stretch of a stem from `from` to `to` above its base, in the stem's own unscaled units, with its
 * lower end at the origin and growing up the screen. One call to the canvas.
 */
export function drawStretch(g: G, sprite: StemSprite, density: number, from: number, to: number): void {
  const top = to >= sprite.full - 0.5 ? sprite.full + PAD : to
  const height = top - from
  if (height <= 0) return
  g.drawImage(sprite.canvas, 0, (sprite.full + PAD - top) * density, sprite.half * 2 * density, height * density, -sprite.half, -height, sprite.half * 2, height)
}

// The cat, the teddy and the soft things, all as cut-outs: flat pieces of card
// and felt with a thin shadow under each, jointed with brass paper fasteners.
// Every function draws around its own origin; the caller places it.

import { brad } from './art.ts'
import type { Pal, PalName } from './art.ts'
import type { Pt } from './geom.ts'

const SHADOW = 'rgba(24,14,8,0.24)'
const TAU = Math.PI * 2

function trace(g: CanvasRenderingContext2D, pts: readonly number[], dx = 0, dy = 0): void {
  g.beginPath()
  g.moveTo(pts[0] + dx, pts[1] + dy)
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] + dx, pts[i + 1] + dy)
  g.closePath()
}

// One cut piece: a faceted outline, corners softened by a stroke of its own
// colour, lying a hair above whatever is under it.
function cut(g: CanvasRenderingContext2D, pts: readonly number[], fill: string, shadow = true): void {
  if (shadow) {
    trace(g, pts, 1.6, 2.6)
    g.fillStyle = SHADOW
    g.fill()
  }
  trace(g, pts)
  g.fillStyle = fill
  g.fill()
  g.strokeStyle = fill
  g.lineWidth = 2.6
  g.stroke()
}

function oval(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

// A thick paper tail along a curve, with a cream tip.
function tail(g: CanvasRenderingContext2D, pal: Pal, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width = 11): void {
  g.lineCap = 'round'
  g.strokeStyle = SHADOW
  g.lineWidth = width
  g.beginPath()
  g.moveTo(x0 + 1.6, y0 + 2.6)
  g.quadraticCurveTo(cx + 1.6, cy + 2.6, x1 + 1.6, y1 + 2.6)
  g.stroke()
  g.strokeStyle = pal.cat
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo(cx, cy, x1, y1)
  g.stroke()
  // The last fifth of the curve again, in cream.
  const t = 0.8
  const ax = x0 + (cx - x0) * t
  const ay = y0 + (cy - y0) * t
  const bx = cx + (x1 - cx) * t
  const by = cy + (y1 - cy) * t
  const mx = ax + (bx - ax) * t
  const my = ay + (by - ay) * t
  g.strokeStyle = pal.cream
  g.lineWidth = width - 1
  g.beginPath()
  g.moveTo(mx, my)
  g.quadraticCurveTo(bx, by, x1, y1)
  g.stroke()
}

export interface CatFace {
  // Where the eyes look, -1..1.
  lookX: number
  lookY: number
  // 0 open, 1 shut.
  blink: number
  // A flick of one ear, -1..1.
  ear: number
  // 0 by day; 1 when the eyes catch the light in the dark.
  glow: number
}

const HEAD = [-24, -3, -20, -17, -9, -24, 9, -24, 20, -17, 24, -3, 21, 10, 11, 20, -11, 20, -21, 10]
const EAR_L = [-23, -8, -19, -37, -3, -21]
const EAR_R = [23, -8, 19, -37, 3, -21]
const EAR_IN_L = [-19, -13, -17.5, -29, -9, -20]
const EAR_IN_R = [19, -13, 17.5, -29, 9, -20]

// The cat's head from the front, centre at the origin, about 48 wide.
export function catHead(g: CanvasRenderingContext2D, pal: Pal, f: CatFace): void {
  g.save()
  g.rotate(f.ear * 0.1)
  cut(g, EAR_L, pal.cat)
  cut(g, EAR_IN_L, pal.pink, false)
  g.restore()
  cut(g, EAR_R, pal.cat)
  cut(g, EAR_IN_R, pal.pink, false)
  cut(g, HEAD, pal.cat)
  // Muzzle: a scrap of cream paper.
  cut(g, [-11, 6, -6, 1, 6, 1, 11, 6, 9, 14, 0, 17, -9, 14], pal.cream, false)
  cut(g, [-3.4, 3.4, 3.4, 3.4, 0, 7.6], pal.pink, false)
  g.strokeStyle = pal.catDark
  g.lineWidth = 1.3
  g.beginPath()
  g.moveTo(0, 8)
  g.lineTo(0, 11)
  g.moveTo(-4, 12.4)
  g.quadraticCurveTo(-2, 14, 0, 11)
  g.quadraticCurveTo(2, 14, 4, 12.4)
  g.stroke()
  // Whiskers in white pencil.
  g.strokeStyle = pal.cream
  g.globalAlpha = 0.7
  g.lineWidth = 1
  g.beginPath()
  for (const s of [-1, 1]) {
    g.moveTo(s * 11, 8)
    g.lineTo(s * 30, 4)
    g.moveTo(s * 11, 10.5)
    g.lineTo(s * 31, 11)
    g.moveTo(s * 11, 13)
    g.lineTo(s * 29, 17)
  }
  g.stroke()
  g.globalAlpha = 1
  // Eyes.
  for (const s of [-1, 1]) {
    const ex = s * 10
    const ey = -5
    if (f.blink > 0.5) {
      g.strokeStyle = f.glow > 0.5 ? pal.cream : pal.catDark
      g.lineWidth = 1.8
      g.beginPath()
      g.moveTo(ex - 5, ey + 1)
      g.quadraticCurveTo(ex, ey + 4, ex + 5, ey + 1)
      g.stroke()
      continue
    }
    oval(g, ex, ey, 5.6, 6.4, f.glow > 0.5 ? '#dcff96' : pal.eye)
    oval(g, ex + f.lookX * 2, ey + f.lookY * 1.6, 2.1, 4.9, f.glow > 0.5 ? '#3a4a20' : pal.catDark)
    if (f.glow < 0.5) oval(g, ex + f.lookX * 2 - 1.4, ey + f.lookY * 1.6 - 2.4, 1.1, 1.1, pal.white)
  }
}

function leg(g: CanvasRenderingContext2D, pal: Pal, x: number, y: number, angle: number, len: number, col: PalName, shadow: boolean): void {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  cut(g, [-6, -3, 6, -3, 5, len, -5, len], pal[col], shadow)
  oval(g, 1.5, len, 7.4, 4.6, pal.cream)
  g.restore()
}

// Sitting, facing the viewer. Origin between the front paws on the floor.
export function catSit(g: CanvasRenderingContext2D, pal: Pal, f: CatFace, tailSwish: number, breathe: number, side: number): void {
  tail(g, pal, side * -24, -8, side * 18, 10 - tailSwish * 4, side * (40 + tailSwish * 6), -6 - tailSwish * 10)
  g.save()
  g.scale(1, 1 + breathe * 0.02)
  cut(g, [-30, 0, -35, -22, -25, -50, -11, -65, 11, -65, 25, -50, 35, -22, 30, 0], pal.cat)
  cut(g, [-10, -56, 10, -56, 7, -32, 0, -26, -7, -32], pal.cream, false)
  g.restore()
  oval(g, -12, -3, 9, 5.6, pal.cream)
  oval(g, 12, -3, 9, 5.6, pal.cream)
  brad(g, side * -22, -12, pal, 3)
  brad(g, 0, -60, pal, 3)
  g.save()
  g.translate(0, -82 - breathe * 1.2)
  g.rotate(f.lookX * 0.07)
  catHead(g, pal, f)
  g.restore()
}

// Walking (or stretched out in a leap), facing +x. Origin under the belly on
// the floor. `phase` steps the legs; `stretch` 0..1 flings them out.
export function catWalk(g: CanvasRenderingContext2D, pal: Pal, f: CatFace, phase: number, stretch: number): void {
  const swing = Math.sin(phase) * 0.55 * (1 - stretch)
  const bob = Math.abs(Math.cos(phase)) * -2.2 * (1 - stretch)
  g.save()
  g.translate(0, bob)
  tail(g, pal, -46, -48, -72, -62 + stretch * 30, -66 + stretch * -14, -104 + stretch * 60 + Math.sin(phase * 0.5) * 6)
  leg(g, pal, -32, -36, -swing - stretch * 1.05, 34, 'catDark', false)
  leg(g, pal, 26, -36, swing + stretch * 1.1, 34, 'catDark', false)
  cut(g, [-50, -40, -46, -57, -20, -65, 24, -63, 46, -57, 53, -42, 40, -28, -36, -26], pal.cat)
  leg(g, pal, -28, -34, swing - stretch * 0.8, 34, 'cat', true)
  leg(g, pal, 30, -34, -swing + stretch * 1.3, 34, 'cat', true)
  brad(g, -29, -37, pal, 3)
  brad(g, 29, -37, pal, 3)
  brad(g, -45, -49, pal, 2.8)
  g.save()
  g.translate(56, -68)
  g.rotate(0.06 + stretch * -0.1)
  g.scale(0.94, 0.94)
  catHead(g, pal, f)
  g.restore()
  g.restore()
}

// Inside a box, behind a window: only the dark of its body. Origin at the
// head's centre.
export function catBodyBehind(g: CanvasRenderingContext2D, pal: Pal, depth: number): void {
  const d = Math.max(12, Math.min(84, depth))
  cut(g, [-26, 8, -32, Math.min(40, d), -30, d, 30, d, 32, Math.min(40, d), 26, 8], pal.cat, false)
}

// Head through a window, paws over the sill. Origin at the head's centre;
// `sill` is how far below it the cut edge is.
export function catInWindow(g: CanvasRenderingContext2D, pal: Pal, f: CatFace, sill: number, tilt: number): void {
  g.save()
  g.rotate(tilt)
  catHead(g, pal, f)
  g.restore()
  for (const s of [-1, 1]) {
    g.fillStyle = SHADOW
    g.beginPath()
    g.ellipse(s * 15 + 1.2, sill + 3.2, 8.6, 6.4, 0, 0, TAU)
    g.fill()
    oval(g, s * 15, sill + 1, 8.6, 6.4, pal.cream)
    g.strokeStyle = pal.tedDark
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(s * 15 - 3, sill + 2)
    g.lineTo(s * 15 - 3, sill + 6)
    g.moveTo(s * 15 + 3, sill + 2)
    g.lineTo(s * 15 + 3, sill + 6)
    g.stroke()
  }
}

// Curled inside a doorway, back to the room. Origin on the floor in the middle
// of the door.
export function catRump(g: CanvasRenderingContext2D, pal: Pal): void {
  cut(g, [-27, 0, -32, -22, -20, -45, 12, -48, 28, -28, 27, 0], pal.cat, false)
  cut(g, [-27, 0, -30, -14, -16, -18, -8, 0], pal.catDark, false)
  brad(g, 2, -12, pal, 3)
}

// The tail out of the door, across the floor. Same origin as the rump.
export function catDoorTail(g: CanvasRenderingContext2D, pal: Pal, swish: number, dir: number): void {
  tail(g, pal, 2, -10, dir * 12, 16, dir * (54 + swish * 6), 10 - swish * 14)
}

// ---- teddy -----------------------------------------------------------------------

const TED_BODY = [-22, -4, -28, -26, -20, -50, 20, -50, 28, -26, 22, -4]
const TED_HEAD = [-23, -66, -19, -84, -8, -92, 8, -92, 19, -84, 23, -66, 16, -52, -16, -52]

function limb(g: CanvasRenderingContext2D, pal: Pal, x: number, y: number, angle: number, len: number, w: number, pad: boolean): void {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  cut(g, [-w / 2, -4, w / 2, -4, w / 2 + 1, len - 5, w / 2 - 3, len, -w / 2 + 3, len, -w / 2 - 1, len - 5], pal.ted)
  if (pad) oval(g, 0, len - 7, w / 2 - 2.5, 5, pal.tedDark)
  brad(g, 0, 0, pal, 3)
  g.restore()
}

// A felt bear with pinned arms and legs. Origin under its seat. `arm` and
// `legs` are extra swing in radians; `sit` 1 splays the legs out in front.
export function drawTeddy(g: CanvasRenderingContext2D, pal: Pal, arm: number, legs: number, sit: number): void {
  limb(g, pal, -15, -10, 0.2 + sit * 0.85 + legs, 31, 19, true)
  limb(g, pal, 15, -10, -0.2 - sit * 0.85 + legs, 31, 19, true)
  cut(g, TED_BODY, pal.ted)
  cut(g, [-12, -12, -15, -26, -9, -38, 9, -38, 15, -26, 12, -12], pal.white, false)
  limb(g, pal, -22, -43, 0.45 + arm, 29, 15, false)
  limb(g, pal, 22, -43, -0.45 + arm, 29, 15, false)
  // Ears behind the head.
  for (const s of [-1, 1]) {
    g.fillStyle = SHADOW
    g.beginPath()
    g.arc(s * 19 + 1.5, -86.5, 9.5, 0, TAU)
    g.fill()
    oval(g, s * 19, -89, 9.5, 9.5, pal.ted)
    oval(g, s * 19, -88.5, 5, 5, pal.tedDark)
  }
  cut(g, TED_HEAD, pal.ted)
  oval(g, 0, -65, 10.5, 8.5, pal.white)
  cut(g, [-3.6, -69.5, 3.6, -69.5, 0, -65], pal.tedInk, false)
  g.strokeStyle = pal.tedInk
  g.lineWidth = 1.4
  g.beginPath()
  g.moveTo(0, -65)
  g.lineTo(0, -62)
  g.moveTo(-4, -61)
  g.quadraticCurveTo(0, -58.4, 4, -61)
  g.stroke()
  oval(g, -9, -75, 2.7, 2.9, pal.tedInk)
  oval(g, 9, -75, 2.7, 2.9, pal.tedInk)
  // Stitches up the middle of the head, and a red felt scarf.
  g.setLineDash([3, 3.4])
  g.beginPath()
  g.moveTo(0, -91)
  g.lineTo(0, -80)
  g.stroke()
  g.setLineDash([])
  cut(g, [-18, -55, 18, -55, 19, -46, -19, -46], pal.scarf)
  cut(g, [8, -48, 17, -48, 20, -26, 11, -28], pal.scarf)
}

// ---- cushions and the blanket ----------------------------------------------------

const PILLOW = [-48, -27, -24, -31, 0, -30, 24, -31, 48, -27, 45, 0, 48, 27, 24, 31, 0, 30, -24, 31, -48, 27, -45, 0]

// A felt cushion with a button, centre at the origin, 96 by 62.
export function drawCushion(g: CanvasRenderingContext2D, pal: Pal, variant: number): void {
  if (variant === 0) {
    cut(g, PILLOW, pal.mustard)
    g.strokeStyle = pal.mustardD
    g.lineWidth = 2.2
    g.setLineDash([5, 5])
    g.beginPath()
    g.moveTo(-36, -18)
    g.lineTo(36, 18)
    g.moveTo(-36, 18)
    g.lineTo(36, -18)
    g.stroke()
    g.setLineDash([])
  } else if (variant === 1) {
    cut(g, PILLOW, pal.cream)
    g.fillStyle = pal.dotRed
    for (const [x, y] of [
      [-30, -14],
      [-10, -16],
      [12, -15],
      [32, -13],
      [-22, 2],
      [22, 3],
      [-30, 16],
      [-9, 17],
      [12, 16],
      [31, 15],
    ]) {
      g.beginPath()
      g.arc(x, y, 3.6, 0, TAU)
      g.fill()
    }
  } else {
    cut(g, PILLOW, pal.teal)
    g.strokeStyle = pal.stitch
    g.lineWidth = 3
    g.beginPath()
    for (const x of [-30, -15, 15, 30]) {
      g.moveTo(x, -25)
      g.lineTo(x + 1, 25)
    }
    g.stroke()
  }
  // Running stitch round the edge.
  g.strokeStyle = variant === 1 ? pal.dotRed : pal.stitch
  g.globalAlpha = 0.75
  g.lineWidth = 1.6
  g.setLineDash([5, 4.5])
  trace(g, [-42, -22, 0, -25, 42, -22, 40, 0, 42, 22, 0, 25, -42, 22, -40, 0])
  g.stroke()
  g.setLineDash([])
  g.globalAlpha = 1
  brad(g, 0, 0, pal, 4.2)
}

// The blanket folded in three. Origin at the bottom centre; 172 wide.
export function blanketFolded(g: CanvasRenderingContext2D, pal: Pal): void {
  for (let i = 0; i < 3; i++) {
    const y = -i * 16
    const w = 86 - i * 3
    cut(g, [-w, y, -w - 3, y - 9, -w + 4, y - 17, w - 4, y - 17, w + 3, y - 9, w, y], i % 2 ? pal.blanketD : pal.blanket, i === 0)
  }
  g.strokeStyle = pal.stitch
  g.lineWidth = 2.2
  g.setLineDash([6, 6])
  g.beginPath()
  g.moveTo(-76, -41)
  g.lineTo(76, -41)
  g.stroke()
  g.setLineDash([])
  // Fringe at one end.
  g.lineWidth = 2
  g.beginPath()
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) {
    const y = -i * 16 - 4 - k * 4.4
    g.moveTo(83 - i * 3, y)
    g.lineTo(92 - i * 3, y + 1)
  }
  g.stroke()
}

// The blanket dropped in a soft heap. Origin at the bottom centre.
export function blanketHeap(g: CanvasRenderingContext2D, pal: Pal): void {
  cut(g, [-92, 0, -96, -14, -70, -34, -36, -30, -10, -46, 26, -40, 52, -30, 82, -26, 96, -10, 92, 0], pal.blanket)
  cut(g, [-70, -34, -36, -30, -10, -46, -22, -18, -60, -12], pal.blanketD, false)
  cut(g, [26, -40, 52, -30, 82, -26, 60, -10, 30, -16], pal.blanketD, false)
  g.strokeStyle = pal.stitch
  g.lineWidth = 2.2
  g.setLineDash([6, 6])
  g.beginPath()
  g.moveTo(-88, -6)
  g.quadraticCurveTo(-40, -14, 0, -8)
  g.quadraticCurveTo(50, -2, 88, -8)
  g.stroke()
  g.setLineDash([])
}

// The blanket hanging from the hand. Origin at the pinch.
export function blanketHeld(g: CanvasRenderingContext2D, pal: Pal, sway: number): void {
  const s = sway * 40
  cut(g, [-8, -6, 8, -6, 44 - s * 0.4, 50, 78 - s, 128, 40 - s, 142, 0 - s, 132, -40 - s, 144, -78 - s, 126, -44 - s * 0.4, 50], pal.blanket)
  cut(g, [-8, -6, 0, -6, -10 - s * 0.5, 70, -40 - s, 144, -78 - s, 126, -44 - s * 0.4, 50], pal.blanketD, false)
  g.strokeStyle = pal.stitch
  g.lineWidth = 2.2
  g.setLineDash([6, 6])
  g.beginPath()
  g.moveTo(-72 - s, 120)
  g.lineTo(-40 - s, 136)
  g.lineTo(0 - s, 124)
  g.lineTo(40 - s, 134)
  g.lineTo(72 - s, 122)
  g.stroke()
  g.setLineDash([])
}

// The blanket thrown over the fort. `path` runs left to right over the tops
// and down the sides; the felt hangs from it with a wavy hem, two darker
// stripes woven in and a running stitch along the edge.
export function blanketDraped(g: CanvasRenderingContext2D, pal: Pal, path: readonly Pt[]): void {
  if (path.length < 2) return
  // Round the corners, then walk the line in small steps.
  let pts: Pt[] = [...path]
  for (let pass = 0; pass < 2; pass++) {
    const next: Pt[] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    next.push(pts[pts.length - 1])
    pts = next
  }
  const xs: number[] = []
  const ys: number[] = []
  let carry = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    let at = carry
    while (at < len) {
      xs.push(a[0] + ((b[0] - a[0]) * at) / len)
      ys.push(a[1] + ((b[1] - a[1]) * at) / len)
      at += 9
    }
    carry = at - len
  }
  const n = xs.length
  if (n < 3) return
  const nx: number[] = []
  const ny: number[] = []
  const hem: number[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1)
    const b = Math.min(n - 1, i + 1)
    const tx = xs[b] - xs[a]
    const ty = ys[b] - ys[a]
    const len = Math.hypot(tx, ty) || 1
    nx.push(-ty / len)
    ny.push(tx / len)
    const s = i * 9
    hem.push(48 + Math.sin(s * 0.062) * 7 + Math.sin(s * 0.021 + 1) * 4)
  }
  const band = (dx: number, dy: number) => {
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const x = xs[i] - nx[i] * 9 + dx
      const y = ys[i] - ny[i] * 9 + dy
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    for (let i = n - 1; i >= 0; i--) g.lineTo(xs[i] + nx[i] * hem[i] + dx, ys[i] + ny[i] * hem[i] + dy)
    g.closePath()
  }
  const along = (off: number, rel: number) => {
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const o = off + rel * hem[i]
      if (i === 0) g.moveTo(xs[i] + nx[i] * o, ys[i] + ny[i] * o)
      else g.lineTo(xs[i] + nx[i] * o, ys[i] + ny[i] * o)
    }
  }
  g.lineJoin = 'round'
  band(2.5, 5)
  g.fillStyle = SHADOW
  g.fill()
  band(0, 0)
  g.fillStyle = pal.blanket
  g.fill()
  g.strokeStyle = pal.blanket
  g.lineWidth = 2.4
  g.stroke()
  g.lineCap = 'butt'
  g.strokeStyle = pal.blanketD
  g.lineWidth = 7
  along(8, 0)
  g.stroke()
  g.lineWidth = 3
  along(19, 0)
  g.stroke()
  // The fold where it turns over the top edge.
  g.globalAlpha = 0.35
  g.lineWidth = 2
  along(-3, 0)
  g.stroke()
  g.globalAlpha = 1
  g.strokeStyle = pal.stitch
  g.lineWidth = 2.4
  g.setLineDash([7, 6])
  along(-8, 1)
  g.stroke()
  g.setLineDash([])
  // Fringe at both ends.
  g.lineCap = 'round'
  g.lineWidth = 2
  g.beginPath()
  for (const end of [0, n - 1]) {
    const dir = end === 0 ? -1 : 1
    const ux = ny[end] * dir
    const uy = -nx[end] * dir
    for (let k = -6; k <= hem[end] - 3; k += 5.4) {
      const x = xs[end] + nx[end] * k
      const y = ys[end] + ny[end] * k
      g.moveTo(x, y)
      g.lineTo(x + ux * 9, y + uy * 9)
    }
  }
  g.stroke()
}

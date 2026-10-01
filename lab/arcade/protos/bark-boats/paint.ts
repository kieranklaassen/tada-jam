// A small watercolour box. Everything the prototype shows is painted with
// this, once, onto cached canvases: transparent washes laid over warm paper
// with `multiply` (so glazes darken where they overlap), pigment pooled along
// the wet edge, blotchy backruns and paper grain inside, colours dropped into
// a wet wash, and a loose graphite under-drawing that the paint never quite
// follows. Nothing here runs per frame except `drawSprite`.

import { TAU } from '../../kit/math.ts'

export type G = CanvasRenderingContext2D
export type Pt = [number, number]
export type Rand = () => number

export const PAPER = '#f8f2e4'
export const GRAPHITE = '#57525c'

export function rng(seed: number): Rand {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeCanvas(w: number, h: number, scale: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return [c, g]
}

// ---------------------------------------------------------------- colour

export function rgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number): string {
  const q = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${((1 << 24) | (q(r) << 16) | (q(g) << 8) | q(b)).toString(16).slice(1)}`
}

export function mix(a: string, b: string, t: number): string {
  const p = rgb(a)
  const q = rgb(b)
  return toHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t)
}

export function rgba(c: string, a: number): string {
  const p = rgb(c)
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`
}

// The same pigment, thicker: darker and a little more saturated.
export function deepen(c: string, k = 0.68): string {
  const p = rgb(c)
  const m = (p[0] + p[1] + p[2]) / 3
  return toHex((m + (p[0] - m) * 1.25) * k, (m + (p[1] - m) * 1.25) * k, (m + (p[2] - m) * 1.25) * k)
}

// Snap to a coarse grid so the tinted-texture cache stays small.
function quant(c: string): string {
  const p = rgb(c)
  const q = (v: number) => Math.min(255, Math.round(v / 24) * 24)
  return toHex(q(p[0]), q(p[1]), q(p[2]))
}

// ---------------------------------------------------------------- shapes

function signedArea(pts: readonly Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % pts.length]!
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

// Break each edge into short pieces and push them off the line: a hand does
// not draw straight. `out` pushes every point outward by that much as well.
export function roughen(r: Rand, pts: readonly Pt[], amp: number, step = 24, closed = true, out = 0): Pt[] {
  const res: Pt[] = []
  const n = pts.length
  const m = closed ? n : n - 1
  const sign = out !== 0 && signedArea(pts) < 0 ? -1 : 1
  for (let i = 0; i < m; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const k = Math.max(1, Math.round(len / step))
    const nx = (dy / len) * sign
    const ny = (-dx / len) * sign
    for (let j = 0; j < k; j++) {
      const t = j / k
      const d = (r() * 2 - 1) * amp + out
      res.push([a[0] + dx * t + nx * d, a[1] + dy * t + ny * d])
    }
  }
  if (!closed) res.push([pts[n - 1]![0], pts[n - 1]![1]])
  return res
}

export function smoothPath(pts: readonly Pt[], closed = true, into?: Path2D): Path2D {
  const p = into ?? new Path2D()
  const n = pts.length
  if (n < 2) return p
  if (closed) {
    const last = pts[n - 1]!
    const first = pts[0]!
    p.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
    for (let i = 0; i < n; i++) {
      const a = pts[i]!
      const b = pts[(i + 1) % n]!
      p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
    p.closePath()
  } else {
    p.moveTo(pts[0]![0], pts[0]![1])
    for (let i = 1; i < n - 1; i++) {
      const a = pts[i]!
      const b = pts[i + 1]!
      p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
    p.lineTo(pts[n - 1]![0], pts[n - 1]![1])
  }
  return p
}

export function oval(cx: number, cy: number, rx: number, ry: number, n = 12, rot = 0, from = 0, to = TAU): Pt[] {
  const pts: Pt[] = []
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const full = Math.abs(to - from - TAU) < 1e-6
  const m = full ? n : n + 1
  for (let i = 0; i < m; i++) {
    const a = from + ((to - from) * i) / n
    const x = Math.cos(a) * rx
    const y = Math.sin(a) * ry
    pts.push([cx + x * c - y * s, cy + x * s + y * c])
  }
  return pts
}

// Move, turn and scale a list of points.
export function place(pts: readonly Pt[], x: number, y: number, rot = 0, sx = 1, sy = sx): Pt[] {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return pts.map(([px, py]) => [x + px * sx * c - py * sy * s, y + px * sx * s + py * sy * c] as Pt)
}

function bounds(pts: readonly Pt[]): [number, number, number, number] {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0]
    if (p[0] > x1) x1 = p[0]
    if (p[1] < y0) y0 = p[1]
    if (p[1] > y1) y1 = p[1]
  }
  return [x0, y0, x1, y1]
}

// ---------------------------------------------------------------- the box

export interface Wash {
  color: string
  // Painted with this instead of the flat colour (a gradient across a long
  // wash); `color` still tints the pooled edge and the grain.
  style?: CanvasGradient | string
  // Pigment strength, 0..1.
  a?: number
  // How much pigment gathers along the edge as it dries.
  pool?: number
  // Uneven pigment: lighter backruns and darker settlings inside the wash.
  mottle?: number
  // Pigment settling into the paper's tooth.
  grain?: number
  // Wobble of the edge, in pixels, and the length of each wobble.
  rough?: number
  step?: number
  // A wet edge all round: the wash spreads and fades over this many pixels.
  soft?: number
  // Lost edges: how many places along the outline the wash is pulled out
  // into nothing with a wet brush.
  lost?: number
  // Other pigments dropped in while it is wet.
  charge?: readonly { color: string; n: number; size: number; a?: number }[]
  // Paper left dry inside the wash (hard-edged), and gaps lifted out softly.
  holes?: readonly (readonly Pt[])[]
  gaps?: readonly { pts: readonly Pt[]; blur: number; a?: number }[]
  // Pigment thins toward this side: an angle, and how much (0..1).
  fade?: [number, number]
  // Which size of backrun to use (0 small, 1, 2 large). Long washes that
  // cross strips must fix it; otherwise it follows the size of the shape.
  tex?: 0 | 1 | 2
}

export interface PencilOpts {
  closed?: boolean
  w?: number
  a?: number
  jit?: number
  step?: number
  passes?: number
}

export interface Box {
  // A wash of transparent colour inside `pts` (a closed outline).
  wash(g: G, r: Rand, pts: readonly Pt[], o: Wash): void
  // A graphite line through `pts`, drawn the way a hand does: twice, loosely.
  pencil(g: G, r: Rand, pts: readonly Pt[], o?: PencilOpts): void
  // A dragged, half-dry brush: a broken streak.
  dry(g: G, r: Rand, pts: readonly Pt[], width: number, color: string, a?: number): void
  // Pigment lifted back off (or a touch of body colour): paper showing again.
  lift(g: G, r: Rand, pts: readonly Pt[], a?: number, soft?: number, color?: string): void
  // Flicked drops.
  splatter(g: G, r: Rand, x: number, y: number, spread: number, n: number, color: string, a?: number, size?: number): void
  // Blank paper for a cut-out sprite to be painted on.
  under(g: G, pts: readonly Pt[], a?: number): void
  // The tooth of the paper over a finished sheet.
  tooth(g: G, w: number, h: number, a?: number, ox?: number): void
  // Let go of the scratch sheet and the tinted textures once painting is done.
  done(): void
}

function smoothstep(a: number, b: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Periodic value noise, 0..1.
function noiseTile(size: number, cells: number, r: Rand): Float32Array {
  const lattice = new Float32Array(cells * cells)
  for (let i = 0; i < lattice.length; i++) lattice[i] = r()
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cells
    const y0 = Math.floor(fy)
    const ty = fy - y0
    const sy = ty * ty * (3 - 2 * ty)
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells
      const x0 = Math.floor(fx)
      const tx = fx - x0
      const sx = tx * tx * (3 - 2 * tx)
      const a = lattice[(y0 % cells) * cells + (x0 % cells)]!
      const b = lattice[(y0 % cells) * cells + ((x0 + 1) % cells)]!
      const c = lattice[((y0 + 1) % cells) * cells + (x0 % cells)]!
      const d = lattice[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)]!
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
    }
  }
  return out
}

function alphaCanvas(size: number, alpha: (i: number) => number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  const img = g.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    img.data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(alpha(i) * 255)))
  }
  g.putImageData(img, 0, 0)
  return c
}

// Far enough that a shape drawn there is off any canvas here; only its
// blurred shadow, thrown back by the same distance, lands on the sheet.
const FAR = 20000

export function createBox(): Box {
  const r0 = rng(77)
  // Backruns: where a wetter drop pushed the pigment aside. Soft inside,
  // with a faint tide line where it stopped. Three sizes of the same mark,
  // so that a pattern never has to be stretched (a stretched pattern is slow).
  const cloudOf = (size: number, cells: readonly number[]): HTMLCanvasElement => {
    const oct = cells.map((c) => noiseTile(size, c, r0))
    const weights = [0.46, 0.3, 0.16, 0.08]
    return alphaCanvas(size, (i) => {
      let v = 0
      for (let k = 0; k < oct.length; k++) v += oct[k]![i]! * weights[k]!
      const blot = smoothstep(0.4, 0.62, v)
      const rim = Math.max(0, 1 - Math.abs(v - 0.51) / 0.02) * 0.3
      return blot * 0.62 + v * 0.2 + rim * oct[2]![i]!
    })
  }
  const cloudBases = [cloudOf(128, [3, 7, 17, 41]), cloudOf(256, [3, 7, 17, 41]), cloudOf(512, [3, 7, 17, 41])]
  // Tooth: fine specks that clump a little.
  const GRAIN = 128
  const g1 = noiseTile(GRAIN, 48, r0)
  const g2 = noiseTile(GRAIN, 11, r0)
  const speck = new Float32Array(GRAIN * GRAIN)
  for (let i = 0; i < speck.length; i++) speck[i] = r0()
  const grainBase = alphaCanvas(GRAIN, (i) => {
    const v = speck[i]! * 0.6 + g1[i]! * 0.4
    return smoothstep(0.56, 0.86, v) * (0.35 + g2[i]! * 0.8)
  })

  let cache: Map<string, HTMLCanvasElement> | null = new Map()
  const tinted = (base: HTMLCanvasElement, kind: string, color: string): HTMLCanvasElement => {
    if (!cache) cache = new Map()
    const key = kind + color
    const hit = cache.get(key)
    if (hit) return hit
    const c = document.createElement('canvas')
    c.width = base.width
    c.height = base.height
    const g = c.getContext('2d')
    if (!g) throw new Error('no 2d context')
    g.drawImage(base, 0, 0)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = color
    g.fillRect(0, 0, c.width, c.height)
    cache.set(key, c)
    return c
  }

  // A pattern in device pixels, pinned to the user-space origin (so the same
  // wash painted on two neighbouring strips carries the same marks across
  // the join) and shifted by whole pixels so no two washes match.
  const pattern = (g: G, base: HTMLCanvasElement, kind: string, color: string, ox: number, oy: number): CanvasPattern | string => {
    const pat = g.createPattern(color === '' ? base : tinted(base, kind, quant(color)), 'repeat')
    if (!pat) return color || '#000'
    const t = g.getTransform()
    pat.setTransform(t.inverse().translate(Math.round(t.e + ox), Math.round(t.f + oy)))
    return pat
  }

  // Scratch sheets in a few sizes. A wash is worked up on the smallest one
  // it fits (mask, lost edges, colour, backruns, pooling, grain) and then
  // laid onto the paper in one go. Small sheets matter: laying a scratch
  // sheet down copies all of it, however little was used.
  const sheets = new Map<number, { c: HTMLCanvasElement; g: G }>()
  const fit = (v: number): number => {
    let n = 96
    while (n < v) n *= 2
    return n
  }
  const sheet = (w: number, h: number): { c: HTMLCanvasElement; g: G } => {
    const cw = fit(w)
    const ch = fit(h)
    const key = cw * 65536 + ch
    let sh = sheets.get(key)
    if (!sh) {
      const c = document.createElement('canvas')
      c.width = cw
      c.height = ch
      const g = c.getContext('2d')
      if (!g) throw new Error('no 2d context')
      g.lineCap = 'round'
      g.lineJoin = 'round'
      sh = { c, g }
      sheets.set(key, sh)
    }
    return sh
  }

  // Draw only the blurred shadow of a path: a soft-edged version of it. A
  // wide blur is worked at a half or a quarter of the size on a small sheet
  // and laid back enlarged, which costs a fraction and looks the same.
  let lo: HTMLCanvasElement | null = null
  let lg: G | null = null
  const blurFill = (s: G, path: Path2D, color: string, blur: number, patch?: readonly [number, number, number, number]): void => {
    const t = s.getTransform()
    const dev = blur * t.a
    const f = dev >= 10 ? 4 : dev >= 4 ? 2 : 1
    if (f === 1 || !patch) {
      s.save()
      s.shadowColor = color
      s.shadowBlur = dev
      s.shadowOffsetX = FAR
      s.shadowOffsetY = 0
      s.translate(-FAR / t.a, 0)
      s.fillStyle = '#000'
      s.fill(path)
      s.restore()
      return
    }
    const [px, py, pw, ph] = patch
    const lw = Math.ceil(pw / f) + 2
    const lh = Math.ceil(ph / f) + 2
    if (!lo || !lg || lo.width < lw || lo.height < lh) {
      const next = document.createElement('canvas')
      next.width = Math.max(lw, lo?.width ?? 0)
      next.height = Math.max(lh, lo?.height ?? 0)
      lo = next
      lg = lo.getContext('2d')
      if (!lg) throw new Error('no 2d context')
    }
    lg.setTransform(1, 0, 0, 1, 0, 0)
    lg.clearRect(0, 0, lw, lh)
    lg.save()
    lg.beginPath()
    lg.rect(0, 0, lw, lh)
    lg.clip()
    lg.setTransform(t.a / f, 0, 0, t.d / f, (t.e - px) / f, (t.f - py) / f)
    lg.shadowColor = color
    lg.shadowBlur = dev / f
    lg.shadowOffsetX = FAR
    lg.translate(-FAR / (t.a / f), 0)
    lg.fillStyle = '#000'
    lg.fill(path)
    lg.restore()
    s.save()
    s.setTransform(1, 0, 0, 1, 0, 0)
    s.imageSmoothingEnabled = true
    s.drawImage(lo, 0, 0, lw, lh, px, py, lw * f, lh * f)
    s.restore()
  }

  const wash = (g: G, r: Rand, pts: readonly Pt[], o: Wash): void => {
    const a = o.a ?? 0.6
    const pool = o.pool ?? 0.6
    const mottle = o.mottle ?? 0.5
    const grain = o.grain ?? 0.4
    const amp = o.rough ?? 2.5
    const step = o.step ?? 22
    const soft = o.soft ?? 0
    // Everything random is drawn first and in a fixed order, so a shape that
    // straddles two strips is painted the same on both.
    const base = amp > 0 ? roughen(r, pts, amp, step) : pts
    const path = smoothPath(base)
    const [bx0, by0, bx1, by1] = bounds(base)
    const size = Math.sqrt(Math.max(1, (bx1 - bx0) * (by1 - by0)))
    const ox = r() * 997
    const oy = r() * 991
    const tex = o.tex ?? (size < 110 ? 0 : size < 380 ? 1 : 2)
    const cloud = cloudBases[tex]!
    const dash = [r() * 70 + 26, r() * 24 + 6, r() * 130 + 34, r() * 16 + 5]
    const dashAt = r() * 240
    const dark = deepen(o.color)
    let holes: Path2D | null = null
    if (o.holes) {
      holes = new Path2D()
      for (const h of o.holes) smoothPath(amp > 0 ? roughen(r, h, 1.5, step) : h, true, holes)
    }
    const lost: { path: Path2D; blur: number }[] = []
    const nLost = o.lost ?? 0
    for (let i = 0; i < nLost; i++) {
      const p = base[Math.floor(r() * base.length)]!
      const rad = size * (0.2 + r() * 0.16)
      lost.push({ path: smoothPath(oval(p[0], p[1], rad * (0.8 + r() * 0.5), rad * (0.6 + r() * 0.4), 8, r() * TAU)), blur: rad * 0.45 })
    }
    const drops: { path: Path2D; color: string; a: number; blur: number }[] = []
    if (o.charge) {
      for (const ch of o.charge) {
        for (let i = 0; i < ch.n; i++) {
          const cx = bx0 + (0.12 + r() * 0.76) * (bx1 - bx0)
          const cy = by0 + (0.12 + r() * 0.76) * (by1 - by0)
          const sz = ch.size * (0.6 + r() * 0.8)
          const blob = roughen(r, oval(cx, cy, sz * (0.8 + r() * 0.6), sz * (0.5 + r() * 0.5), 8, r() * TAU), sz * 0.22, sz * 0.5)
          drops.push({ path: smoothPath(blob), color: ch.color, a: ch.a ?? 0.6, blur: sz * 0.3 })
        }
      }
    }

    const t = g.getTransform()
    const m = (soft + 6) * 2.2
    const dx0 = Math.max(0, Math.floor((bx0 - m) * t.a + t.e))
    const dy0 = Math.max(0, Math.floor((by0 - m) * t.d + t.f))
    const dx1 = Math.min(g.canvas.width, Math.ceil((bx1 + m) * t.a + t.e))
    const dy1 = Math.min(g.canvas.height, Math.ceil((by1 + m) * t.d + t.f))
    if (dx1 <= dx0 || dy1 <= dy0) return
    const pw = dx1 - dx0
    const ph = dy1 - dy0
    const sh = sheet(pw, ph)
    const s = sh.g
    // The same patch in user units, for filling it whole.
    const ux = (dx0 - t.e) / t.a
    const uy = (dy0 - t.f) / t.d
    const uw = pw / t.a
    const uh = ph / t.d

    s.setTransform(1, 0, 0, 1, 0, 0)
    s.globalCompositeOperation = 'source-over'
    s.globalAlpha = 1
    s.clearRect(0, 0, pw, ph)
    s.save()
    s.beginPath()
    s.rect(0, 0, pw, ph)
    s.clip()
    s.setTransform(t.a, 0, 0, t.d, t.e - dx0, t.f - dy0)
    // The shape of the wash.
    const patch = [0, 0, pw, ph] as const
    if (soft > 0) {
      blurFill(s, path, '#000', soft, patch)
    } else {
      s.fillStyle = '#000'
      s.fill(path)
    }
    s.globalCompositeOperation = 'destination-out'
    if (holes) {
      s.fillStyle = '#000'
      s.fill(holes)
    }
    if (o.gaps) for (const gap of o.gaps) {
      s.globalAlpha = gap.a ?? 1
      blurFill(s, smoothPath(gap.pts), '#000', gap.blur, patch)
    }
    s.globalAlpha = 1
    for (const l of lost) blurFill(s, l.path, '#000', l.blur, patch)
    if (o.fade) {
      const [ang, amt] = o.fade
      const cx = (bx0 + bx1) / 2
      const cy = (by0 + by1) / 2
      const rad = Math.max(bx1 - bx0, by1 - by0) / 2
      const gr = s.createLinearGradient(cx - Math.cos(ang) * rad, cy - Math.sin(ang) * rad, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad)
      gr.addColorStop(0, 'rgba(0,0,0,0)')
      gr.addColorStop(1, `rgba(0,0,0,${amt})`)
      s.fillStyle = gr
      s.fillRect(ux, uy, uw, uh)
    }
    // Its pigment.
    s.globalCompositeOperation = 'source-in'
    s.fillStyle = o.style ?? o.color
    s.fillRect(ux, uy, uw, uh)
    // Other pigments, dropped in wet.
    s.globalCompositeOperation = 'source-atop'
    for (const d of drops) {
      s.globalAlpha = d.a
      blurFill(s, d.path, d.color, d.blur, patch)
    }
    // Backruns push pigment out of some places and into others.
    if (mottle > 0) {
      s.globalCompositeOperation = 'destination-out'
      s.globalAlpha = Math.min(1, mottle * 0.62)
      s.fillStyle = pattern(s, cloud, 'c' + tex, '', ox, oy)
      s.fillRect(ux, uy, uw, uh)
      s.globalCompositeOperation = 'source-atop'
      s.globalAlpha = Math.min(1, mottle * 0.5)
      s.fillStyle = pattern(s, cloud, 'c' + tex, dark, ox + 131, oy + 77)
      s.fillRect(ux, uy, uw, uh)
    }
    // Pigment gathers at the edge as the wash dries: a darkening toward the
    // rim, built from a few strokes, and a thin broken line at the very edge.
    if (pool > 0 && soft === 0) {
      const wide = Math.min(18, 5 + size * 0.045)
      s.globalCompositeOperation = 'source-atop'
      s.strokeStyle = dark
      const ring = (w: number, al: number) => {
        s.lineWidth = w
        s.globalAlpha = Math.min(1, al)
        s.stroke(path)
        if (holes) s.stroke(holes)
      }
      ring(wide, pool * 0.14)
      ring(wide * 0.6, pool * 0.18)
      ring(wide * 0.3, pool * 0.24)
      s.setLineDash(dash)
      s.lineDashOffset = dashAt
      ring(1.7, pool * 0.8)
      s.setLineDash([])
    }
    if (grain > 0) {
      s.globalCompositeOperation = 'destination-out'
      s.globalAlpha = Math.min(1, grain * 0.5)
      s.fillStyle = pattern(s, grainBase, 'g', '', ox * 0.7, oy * 0.7)
      s.fillRect(ux, uy, uw, uh)
      s.globalCompositeOperation = 'source-atop'
      s.globalAlpha = Math.min(1, grain * 0.55)
      s.fillStyle = pattern(s, grainBase, 'g', dark, ox * 0.7 + 53, oy * 0.7 + 31)
      s.fillRect(ux, uy, uw, uh)
    }
    s.restore()
    s.globalCompositeOperation = 'source-over'
    s.globalAlpha = 1

    g.save()
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'multiply'
    g.globalAlpha = a
    g.drawImage(sh.c, 0, 0, pw, ph, dx0, dy0, pw, ph)
    g.restore()
  }

  const pencil = (g: G, r: Rand, pts: readonly Pt[], o: PencilOpts = {}): void => {
    const closed = o.closed ?? false
    const passes = o.passes ?? 2
    g.save()
    g.globalCompositeOperation = 'multiply'
    g.strokeStyle = GRAPHITE
    g.lineCap = 'round'
    for (let i = 0; i < passes; i++) {
      const p = roughen(r, pts, (o.jit ?? 1.3) * (i === 0 ? 0.6 : 1.3), o.step ?? 26, closed)
      g.globalAlpha = (o.a ?? 0.5) * (0.55 + r() * 0.45)
      g.lineWidth = (o.w ?? 1.1) * (0.75 + r() * 0.5)
      g.setLineDash([r() * 110 + 40, r() * 7 + 1.5, r() * 60 + 20, r() * 4 + 1])
      g.lineDashOffset = r() * 100
      g.stroke(smoothPath(p, closed))
    }
    g.setLineDash([])
    g.restore()
  }

  const dry = (g: G, r: Rand, pts: readonly Pt[], width: number, color: string, a = 0.6): void => {
    const ox = r() * 500
    const oy = r() * 500
    const p = smoothPath(roughen(r, pts, width * 0.12, 20, false), false)
    g.save()
    g.globalCompositeOperation = 'multiply'
    g.lineCap = 'round'
    g.lineWidth = width
    g.globalAlpha = a * 0.4
    g.strokeStyle = color
    g.stroke(p)
    g.globalAlpha = a
    g.strokeStyle = pattern(g, cloudBases[0]!, 'c0', color, ox, oy)
    g.stroke(p)
    g.globalAlpha = a * 0.8
    g.strokeStyle = pattern(g, grainBase, 'g', deepen(color), ox, oy)
    g.stroke(p)
    g.restore()
  }

  const lift = (g: G, r: Rand, pts: readonly Pt[], a = 0.7, soft = 0, color = PAPER): void => {
    const path = smoothPath(roughen(r, pts, 1.2, 14))
    g.save()
    g.globalAlpha = a
    if (soft > 0) {
      blurFill(g, path, color, soft)
    } else {
      g.fillStyle = color
      g.fill(path)
    }
    g.restore()
  }

  const splatter = (g: G, r: Rand, x: number, y: number, spread: number, n: number, color: string, a = 0.6, size = 2.4): void => {
    g.save()
    g.globalCompositeOperation = 'multiply'
    g.fillStyle = color
    for (let i = 0; i < n; i++) {
      const d = r() * r() * spread
      const t = r() * TAU
      const s = size * (0.35 + r() * r() * 1.4)
      g.globalAlpha = a * (0.5 + r() * 0.5)
      g.beginPath()
      g.ellipse(x + Math.cos(t) * d, y + Math.sin(t) * d * 0.7, s, s * (0.7 + r() * 0.3), r() * TAU, 0, TAU)
      g.fill()
    }
    g.restore()
  }

  const under = (g: G, pts: readonly Pt[], a = 1): void => {
    g.save()
    g.globalAlpha = a
    g.fillStyle = PAPER
    g.fill(smoothPath(pts))
    g.restore()
  }

  const tooth = (g: G, w: number, h: number, a = 0.3, ox = 0): void => {
    g.save()
    g.globalCompositeOperation = 'multiply'
    g.globalAlpha = a
    g.fillStyle = pattern(g, grainBase, 'g', '#b4a994', ox, 0)
    g.fillRect(0, 0, w, h)
    g.globalAlpha = a * 0.5
    g.fillStyle = pattern(g, cloudBases[2]!, 'c2', '#dccfb6', ox, 40)
    g.fillRect(0, 0, w, h)
    g.restore()
  }

  return {
    wash,
    pencil,
    dry,
    lift,
    splatter,
    under,
    tooth,
    done() {
      cache = null
      sheets.clear()
      lo = null
      lg = null
    },
  }
}

// ---------------------------------------------------------------- sprites

// A cut-out painted on its own scrap: a daylight copy and one with the dusk
// glaze over it.
export interface Sprite {
  day: HTMLCanvasElement
  dusk: HTMLCanvasElement
  w: number
  h: number
  // The anchor, as fractions of the size.
  ax: number
  ay: number
}

export const DUSK_GLAZE = '#8e8fc6'

function duskCopy(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'multiply'
  g.globalAlpha = strength
  g.fillStyle = DUSK_GLAZE
  g.fillRect(0, 0, c.width, c.height)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(src, 0, 0)
  return c
}

export function makeSprite(w: number, h: number, ax: number, ay: number, scale: number, paint: (g: G) => void, dusk = 0.85): Sprite {
  const [c, g] = makeCanvas(w, h, scale)
  g.translate(w * ax, h * ay)
  paint(g)
  return { day: c, dusk: dusk > 0 ? duskCopy(c, dusk) : c, w, h, ax, ay }
}

export function drawSprite(g: G, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = 1, dusk = 0): void {
  const plain = rot === 0 && sx === 1 && sy === 1
  let dx = -s.w * s.ax
  let dy = -s.h * s.ay
  if (plain) {
    dx += x
    dy += y
  } else {
    g.save()
    g.translate(x, y)
    if (rot) g.rotate(rot)
    g.scale(sx, sy)
  }
  if (dusk < 0.985 || s.dusk === s.day) g.drawImage(s.day, dx, dy, s.w, s.h)
  if (dusk > 0.015 && s.dusk !== s.day) {
    const a = g.globalAlpha
    g.globalAlpha = a * Math.min(1, dusk)
    g.drawImage(s.dusk, dx, dy, s.w, s.h)
    g.globalAlpha = a
  }
  if (!plain) g.restore()
}

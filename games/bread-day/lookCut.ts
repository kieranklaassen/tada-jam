// The cutting tools of the linocut look: a seeded generator, hand-cut outlines
// and gouge marks as plain point lists, and the few calls that put them on a
// plate. Nothing here makes a canvas, so the geometry can be tested in node.

export type Ctx = CanvasRenderingContext2D
export type Pt = readonly [number, number]
export type Rnd = () => number
export type Colour = 'blue' | 'gold' | 'red'
/** One printing: the paper, three colour plates and the key block that carries the drawing. */
export type Print = { base: Ctx; blue: Ctx; gold: Ctx; red: Ctx; key: Ctx; rnd: Rnd }

export const TAU = Math.PI * 2
const PLATES = ['blue', 'gold', 'red', 'key'] as const

/** The same stream for the same seed, so the picture is the same on every load. */
export function mulberry32(seed: number): Rnd {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A smooth line through a few control points, as points about `step` apart. */
export function curve(ctrl: readonly Pt[], closed = true, step = 5): Pt[] {
  const n = ctrl.length, out: Pt[] = []
  const at = (i: number) => closed ? ctrl[((i % n) + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))]
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2)
    const count = Math.max(1, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / step))
    for (let j = 0; j < count; j++) {
      const t = j / count, t2 = t * t, t3 = t2 * t
      const spline = (k: 0 | 1) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3)
      out.push([spline(0), spline(1)])
    }
  }
  if (!closed) out.push(ctrl[n - 1])
  return out
}

export function oval(cx: number, cy: number, rx: number, ry: number, turn = 0, step = 5): Pt[] {
  const n = Math.max(8, Math.ceil((TAU * Math.max(rx, ry)) / step)), c = Math.cos(turn), s = Math.sin(turn), out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const x = Math.cos((i / n) * TAU) * rx, y = Math.sin((i / n) * TAU) * ry
    out.push([cx + x * c - y * s, cy + x * s + y * c])
  }
  return out
}

/** A box with its sides broken into short runs, so a knife can wander along them. */
export function slab(x: number, y: number, w: number, h: number, step = 9): Pt[] {
  const out: Pt[] = []
  const run = (ax: number, ay: number, bx: number, by: number) => {
    const count = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step))
    for (let i = 0; i < count; i++) out.push([ax + ((bx - ax) * i) / count, ay + ((by - ay) * i) / count])
  }
  run(x, y, x + w, y); run(x + w, y, x + w, y + h); run(x + w, y + h, x, y + h); run(x, y + h, x, y)
  return out
}

/** Slow wobble along a line: `n` values between -1 and 1 that drift, not jitter. */
export function wave(rnd: Rnd, n: number, period = 5): number[] {
  const count = Math.max(2, Math.round(n / period)), knots: number[] = [], out: number[] = []
  for (let i = 0; i < count; i++) knots.push(rnd() * 2 - 1)
  for (let i = 0; i < n; i++) {
    const u = (i / n) * count, a = Math.floor(u), f = u - a, s = f * f * (3 - 2 * f)
    out.push(knots[a % count] * (1 - s) + knots[(a + 1) % count] * s)
  }
  return out
}

/** The knife never follows the drawing exactly. */
export function rough(pts: readonly Pt[], rnd: Rnd, amount = 1, period = 4): Pt[] {
  const dx = wave(rnd, pts.length, period), dy = wave(rnd, pts.length, period)
  return pts.map((p, i) => [p[0] + dx[i] * amount, p[1] + dy[i] * amount])
}

export const turned = (pts: readonly Pt[], angle: number, cx = 0, cy = 0): Pt[] => {
  const c = Math.cos(angle), s = Math.sin(angle)
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c])
}
export const moved = (pts: readonly Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy])
export const mirrored = (pts: readonly Pt[], axis: number): Pt[] => pts.map(([x, y]): Pt => [2 * axis - x, y]).reverse()

/** Moves each point of a closed outline along its outward normal by `by` (negative goes inward). */
export function offset(pts: readonly Pt[], by: (i: number, nx: number, ny: number) => number): Pt[] {
  const n = pts.length
  let area = 0
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1] }
  const side = area > 0 ? 1 : -1
  return pts.map((p, i) => {
    const a = pts[(i + n - 2) % n], b = pts[(i + 2) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = (side * (b[1] - a[1])) / len, ny = (-side * (b[0] - a[0])) / len, d = by(i, nx, ny)
    return [p[0] + nx * d, p[1] + ny * d]
  })
}

/** A line given a width that changes along it: every carved or drawn line is one of these, never an even stroke. */
export function ribbon(line: readonly Pt[], width: (t: number) => number): Pt[] {
  const n = line.length, left: Pt[] = [], right: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len, half = width(n > 1 ? i / (n - 1) : 0) / 2
    left.push([line[i][0] + nx * half, line[i][1] + ny * half])
    right.push([line[i][0] - nx * half, line[i][1] - ny * half])
  }
  return left.concat(right.reverse())
}

/** The width of a V-tool line: thin where the tool enters and leaves, and never quite steady between. */
export function vee(rnd: Rnd, w: number, ends = 0.25): (t: number) => number {
  const a = rnd() * TAU, b = 2 + rnd() * 3
  return (t) => w * (ends + (1 - ends) * Math.pow(Math.sin(Math.PI * t), 0.5)) * (0.82 + 0.18 * Math.sin(a + t * b * TAU))
}

/** A nearly straight line from a to b that sags a little, as a hand draws it. */
export function stroke(rnd: Rnd, ax: number, ay: number, bx: number, by: number, sag = 1.5): Pt[] {
  const mid = (t: number): Pt => [ax + (bx - ax) * t + (rnd() - 0.5) * sag, ay + (by - ay) * t + (rnd() - 0.5) * sag]
  return curve([[ax, ay], mid(0.33), mid(0.67), [bx, by]], false, 8)
}

/** One gouge mark: the tool digs in with a round head and runs out to a point. A small `tail` keeps it wide to the end, as a broad U-gouge does. */
export function gouge(x: number, y: number, angle: number, length: number, w: number, bend = 0, tail = 0.75): Pt[] {
  const c = Math.cos(angle), s = Math.sin(angle), line: Pt[] = []
  for (let i = 0; i <= 7; i++) {
    const t = i / 7, off = bend * Math.sin(Math.PI * t)
    line.push([x + c * length * t - s * off, y + s * length * t + c * off])
  }
  return ribbon(line, (t) => w * (t < 0.16 ? Math.sqrt(t / 0.16) : Math.pow(1 - (t - 0.16) / 0.84, tail)))
}

export function trace(g: Ctx, pts: readonly Pt[]): void {
  g.beginPath()
  for (let i = 0; i < pts.length; i++) if (i) g.lineTo(pts[i][0], pts[i][1]); else g.moveTo(pts[i][0], pts[i][1])
  g.closePath()
}

/** Leaves the shape standing on a plate, so it prints. */
export function fill(g: Ctx, pts: readonly Pt[]): void { trace(g, pts); g.fill() }

/** Carves the shape out of a plate, so the sheet below shows there. */
export function cut(g: Ctx, pts: readonly Pt[]): void {
  g.globalCompositeOperation = 'destination-out'
  trace(g, pts); g.fill()
  g.globalCompositeOperation = 'source-over'
}

/** Runs `work` with every mark kept inside the shape. */
export function within(g: Ctx, pts: readonly Pt[], work: () => void): void {
  g.save(); trace(g, pts); g.clip(); work(); g.restore()
}

/** Bare paper: nothing prints over the shape. */
export function bare(p: Print, pts: readonly Pt[]): void {
  fill(p.base, pts)
  for (const plate of PLATES) cut(p[plate], pts)
}

/** How heavy a contour is at each point: thin on top, heavy low and right, where the carver left more block. */
export function weight(rnd: Rnd, n: number, thin: number, thick: number): (i: number, nx: number, ny: number) => number {
  const drift = wave(rnd, n, 7)
  return (i, nx, ny) => -(thin + (thick - thin) * Math.max(0, nx * 0.5 + ny * 0.87)) * (1 + 0.3 * drift[i])
}

/** A shape the key block draws: bare paper, or one flat ink, inside a contour of uneven weight. */
export function shape(p: Print, pts: readonly Pt[], ink: Colour | null = null, thin = 2, thick = 6): void {
  bare(p, pts)
  if (ink) fill(p[ink], pts)
  fill(p.key, pts)
  cut(p.key, offset(pts, weight(p.rnd, pts.length, thin, thick)))
}

/** A line the key block prints. */
export function draw(p: Print, line: readonly Pt[], w: number, ends = 0.25): void { fill(p.key, ribbon(line, vee(p.rnd, w, ends))) }

/** A line carved through the given plates. */
export function carve(p: Print, plates: readonly (Colour | 'key')[], line: readonly Pt[], w: number, ends = 0.25): void {
  const pts = ribbon(line, vee(p.rnd, w, ends))
  for (const plate of plates) cut(p[plate], pts)
}

/**
 * The ground cleared around a figure: a rim of bare paper of uneven width, with
 * the stray strokes the gouge left as it went round. It separates a figure from
 * a dark ground the way a print does, without an outline of even width.
 */
export function halo(p: Print, pts: readonly Pt[], w: number, strays = 0.1): void {
  const drift = wave(p.rnd, pts.length, 6), n = pts.length, rim = offset(pts, () => w * 0.6)
  bare(p, offset(pts, (i) => w * (0.6 + 0.4 * drift[i])))
  for (let i = 0; i < n; i += 3) {
    if (p.rnd() > strays) continue
    const a = pts[i], b = pts[(i + 3) % n], along = Math.atan2(b[1] - a[1], b[0] - a[0]) + (p.rnd() < 0.5 ? Math.PI : 0)
    bare(p, gouge(rim[i][0], rim[i][1], along + (p.rnd() - 0.5) * 0.7, w * (2.5 + p.rnd() * 3), w * (0.7 + p.rnd() * 0.5)))
  }
}

/** Calls `each` once per cell of a loose grid over the box: where coat marks, chatter and dust go. */
export function scatter(rnd: Rnd, x: number, y: number, w: number, h: number, gap: number, each: (x: number, y: number) => void): void {
  for (let row = 0; row * gap < h; row++) {
    for (let col = 0; col * gap < w; col++) {
      each(x + (col + (row % 2) * 0.5 + (rnd() - 0.5) * 0.7) * gap, y + (row + (rnd() - 0.5) * 0.7) * gap)
    }
  }
}

/** A coat of gouge marks inside a shape: `lie` is the angle the hair lies at, `bared` how much of it is carved away there (0 to 1). */
export function coat(p: Print, pts: readonly Pt[], gap: number, length: number, w: number, lie: (x: number, y: number) => number, bared: (x: number, y: number) => number): void {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const rnd = p.rnd
  within(p.key, pts, () => scatter(rnd, x0, y0, x1 - x0, y1 - y0, gap, (x, y) => {
    if (rnd() < bared(x, y)) cut(p.key, gouge(x, y, lie(x, y) + (rnd() - 0.5) * 0.35, length * (0.7 + rnd() * 0.6), w * (0.7 + rnd() * 0.6), (rnd() - 0.5) * w))
  }))
}

/** Runs `work` with every plate turned and scaled about a point: a head tilted on its neck, a bird bent to peck. */
export function posed(p: Print, x: number, y: number, angle: number, scale: number, work: () => void): void {
  const all = [p.base, p.blue, p.gold, p.red, p.key]
  for (const g of all) { g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale); g.translate(-x, -y) }
  work()
  for (const g of all) g.restore()
}

// The fleece itself. Laid wool is kept as patches: each patch is one colour's
// worth of touching wool on its own small canvas, so a patch can be a cloud
// that drifts or a sun that breathes without redrawing a single strand.
//
// Nothing here reads pixels back. What a patch is (hill, cloud, sun, flower)
// is worked out from where its tufts were laid.

import { clamp, damp } from '../../kit/math.ts'
import { TAU, gauss, makeCanvas, put, rgba, rng, shade, sprite, strand, tones, wash } from './felt.ts'
import type { G, RGB, Sprite } from './felt.ts'

// The felt sheet, in its own coordinates.
export const FW = 640
export const FH = 420

const CELL = 16
const GW = Math.ceil(FW / CELL)
const GH = Math.ceil(FH / CELL)
const COL = 8
const COLS = Math.ceil(FW / COL)
const EDGE = 48

export interface Dye {
  key: 'white' | 'yellow' | 'rose' | 'violet' | 'green' | 'pine' | 'brown' | 'blue'
  rgb: RGB
  flecks: readonly RGB[]
  // The pentatonic step this fleece hums when it is drawn out.
  note: number
}

// Plant dyes: undyed, weld, madder, logwood, weld over indigo twice, walnut, indigo.
export const DYES: readonly Dye[] = [
  { key: 'white', rgb: [247, 241, 228], flecks: [[232, 222, 204], [255, 252, 244]], note: 2 },
  { key: 'yellow', rgb: [240, 192, 78], flecks: [[250, 222, 130], [226, 160, 62]], note: 1 },
  { key: 'rose', rgb: [214, 116, 108], flecks: [[236, 160, 140], [186, 84, 92]], note: 0 },
  { key: 'violet', rgb: [152, 120, 170], flecks: [[184, 152, 196], [120, 96, 150]], note: -1 },
  { key: 'green', rgb: [128, 164, 88], flecks: [[170, 192, 110], [98, 140, 84]], note: -2 },
  { key: 'pine', rgb: [72, 114, 82], flecks: [[98, 140, 96], [54, 92, 80]], note: -3 },
  { key: 'brown', rgb: [140, 98, 66], flecks: [[172, 128, 88], [108, 74, 54]], note: -4 },
  { key: 'blue', rgb: [84, 118, 166], flecks: [[122, 152, 190], [62, 92, 142]], note: -5 },
]

export interface Fleece {
  dye: Dye
  // Drawn-out tufts, long way along x.
  tufts: Sprite[]
  // A few loose strands, long way along x.
  wisp: Sprite
  // A lock rooted at SPRIG_ROOT and fanning out along x: a blade of grass, a ray.
  sprig: Sprite
  colors: string[]
}

const TUFT = 176

function paintTuft(g: G, dye: Dye, colors: readonly string[], rand: () => number): void {
  const h = TUFT / 2
  g.translate(h, h)
  wash(g, 0, 0, 62, 34, dye.rgb, 0.5)
  for (let i = 0; i < 4; i++) wash(g, gauss(rand) * 22, gauss(rand) * 9, 26 + rand() * 16, 13 + rand() * 9, shade(dye.rgb, gauss(rand) * 0.12), 0.34)
  for (let i = 0; i < 190; i++) {
    const far = rand() < 0.16
    const x = gauss(rand) * (far ? 30 : 22)
    const y = gauss(rand) * (far ? 21 : 13)
    const len = 30 + rand() * 62
    g.strokeStyle = colors[Math.floor(rand() * colors.length)]
    g.globalAlpha = far ? 0.1 + rand() * 0.16 : 0.14 + rand() * 0.32
    g.lineWidth = 0.5 + rand() * 0.9
    strand(g, x, y, gauss(rand) * (far ? 0.5 : 0.26), len, gauss(rand) * len * 0.22)
  }
  // A few bright strands on top catch the light.
  g.strokeStyle = rgba(shade(dye.rgb, 0.5))
  for (let i = 0; i < 16; i++) {
    g.globalAlpha = 0.2 + rand() * 0.25
    g.lineWidth = 0.5 + rand() * 0.5
    const len = 24 + rand() * 50
    strand(g, gauss(rand) * 20, gauss(rand) * 9 - 3, gauss(rand) * 0.24, len, gauss(rand) * len * 0.2)
  }
  g.globalAlpha = 1
}

function paintWisp(g: G, colors: readonly string[], rand: () => number): void {
  g.translate(36, 12)
  for (let i = 0; i < 16; i++) {
    g.strokeStyle = colors[Math.floor(rand() * colors.length)]
    g.globalAlpha = 0.22 + rand() * 0.4
    g.lineWidth = 0.5 + rand() * 0.9
    const len = 26 + rand() * 34
    strand(g, gauss(rand) * 4 - 4, gauss(rand) * 2.4, gauss(rand) * 0.16, len, gauss(rand) * 5)
  }
  g.globalAlpha = 1
}

export const SPRIG = { w: 72, h: 30, rx: 9, ry: 15 }

function paintSprig(g: G, dye: Dye, colors: readonly string[], rand: () => number): void {
  wash(g, 28, SPRIG.ry, 24, 6.5, dye.rgb, 0.42)
  wash(g, 16, SPRIG.ry, 13, 6, dye.rgb, 0.4)
  for (let i = 0; i < 30; i++) {
    const a = gauss(rand) * 0.17
    const len = 22 + rand() * 38
    const x0 = SPRIG.rx + rand() * 5
    const y0 = SPRIG.ry + gauss(rand) * 2.4
    const x1 = x0 + Math.cos(a) * len
    const y1 = y0 + Math.sin(a) * len
    g.strokeStyle = colors[Math.floor(rand() * colors.length)]
    g.globalAlpha = 0.2 + rand() * 0.36
    g.lineWidth = 0.6 + rand() * 1
    g.beginPath()
    g.moveTo(x0, y0)
    g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + gauss(rand) * 4, x1, y1)
    g.stroke()
  }
  g.globalAlpha = 1
}

export function makeFleeces(scale: number): Fleece[] {
  return DYES.map((dye, i) => {
    const rand = rng(977 + i * 131)
    const colors = tones(dye.rgb, dye.flecks, 0.22)
    const tufts: Sprite[] = []
    for (let v = 0; v < 4; v++) tufts.push(sprite(TUFT, TUFT, (g) => paintTuft(g, dye, colors, rand), scale))
    const wisp = sprite(72, 24, (g) => paintWisp(g, colors, rand), scale)
    const sprig = sprite(SPRIG.w, SPRIG.h, (g) => paintSprig(g, dye, colors, rand), scale)
    return { dye, tufts, wisp, sprig, colors }
  })
}

export type Kind = 'new' | 'cloud' | 'sun' | 'grass' | 'crown' | 'flower' | 'water' | 'still'

interface Sprig {
  x: number
  y: number
  a: number
  s: number
  ph: number
}

export interface Patch {
  dye: number
  z: number
  canvas: HTMLCanvasElement
  ctx: G
  ox: number
  oy: number
  w: number
  h: number
  // How many tufts were laid in each coarse cell, and the top of the wool in
  // each narrow column. Both in the patch's resting place.
  cells: Uint8Array
  tops: Float32Array
  minX: number
  minY: number
  maxX: number
  maxY: number
  n: number
  kind: Kind
  phase: number
  // Its own slow clock; it stands still while the hand is on this patch.
  clock: number
  held: boolean
  reach: number
  reachTo: number
  amt: number
  offX: number
  offY: number
  sprigs: Sprig[]
  // What the sprigs were last chosen for.
  sig: number
}

export interface Wool {
  patches: Patch[]
  nextZ: number
  // The felt's own nap, brushed pale where a bare finger stroked it.
  nap: HTMLCanvasElement
  napCtx: G
  napLeft: number
  napTick: number
}

export interface WoolKit {
  fleeces: Fleece[]
  scale: number
  shadow: Sprite
  mask: Sprite
  glint: Sprite
  scratch: HTMLCanvasElement
  scratchCtx: G
}

const SMUDGE = 40

export function makeWoolKit(scale: number): WoolKit {
  const shadow = sprite(140, 100, (g) => wash(g, 70, 50, 62, 38, [46, 52, 62], 0.9), scale)
  const mask = sprite(SMUDGE * 2, SMUDGE * 2, (g) => {
    const grad = g.createRadialGradient(SMUDGE, SMUDGE, 0, SMUDGE, SMUDGE, SMUDGE)
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(0.5, 'rgba(0,0,0,0.75)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, SMUDGE * 2, SMUDGE * 2)
  }, scale)
  const glint = sprite(48, 16, (g) => {
    const rand = rng(51)
    wash(g, 24, 8, 20, 4, [255, 255, 250], 0.5)
    g.strokeStyle = 'rgba(255,255,250,0.8)'
    for (let i = 0; i < 6; i++) {
      g.lineWidth = 0.6 + rand() * 0.6
      strand(g, 24 + gauss(rand) * 5, 8 + gauss(rand) * 2, gauss(rand) * 0.08, 18 + rand() * 18, gauss(rand) * 2)
    }
  }, scale)
  const [scratch, scratchCtx] = makeCanvas(SMUDGE * 2 * scale, SMUDGE * 2 * scale)
  return { fleeces: makeFleeces(scale), scale, shadow, mask, glint, scratch, scratchCtx }
}

export function makeWool(): Wool {
  const [nap, napCtx] = makeCanvas(FW, FH)
  return { patches: [], nextZ: 1, nap, napCtx, napLeft: 0, napTick: 0 }
}

function newPatch(wool: Wool, dye: number): Patch {
  const [canvas, ctx] = makeCanvas(1, 1)
  const patch: Patch = {
    dye,
    z: wool.nextZ++,
    canvas,
    ctx,
    ox: 0,
    oy: 0,
    w: 0,
    h: 0,
    cells: new Uint8Array(GW * GH),
    tops: new Float32Array(COLS).fill(Infinity),
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    n: 0,
    kind: 'new',
    phase: Math.random() * TAU,
    clock: 0,
    held: false,
    reach: 0,
    reachTo: 0,
    amt: 0,
    offX: 0,
    offY: 0,
    sprigs: [],
    sig: -1,
  }
  wool.patches.push(patch)
  return patch
}

// Make sure the patch's canvas covers this box (resting coordinates).
function ensure(kit: WoolKit, p: Patch, x0: number, y0: number, x1: number, y1: number): void {
  x0 = Math.max(-EDGE, Math.floor(x0))
  y0 = Math.max(-EDGE, Math.floor(y0))
  x1 = Math.min(FW + EDGE, Math.ceil(x1))
  y1 = Math.min(FH + EDGE, Math.ceil(y1))
  if (p.w > 0 && x0 >= p.ox && y0 >= p.oy && x1 <= p.ox + p.w && y1 <= p.oy + p.h) return
  // Room to grow, so a long stroke does not ask for a new canvas at every step.
  const grow = p.w > 0 ? 150 : 96
  const nx0 = Math.max(-EDGE, Math.min(p.w > 0 ? p.ox : x0, x0 - grow))
  const ny0 = Math.max(-EDGE, Math.min(p.w > 0 ? p.oy : y0, y0 - grow))
  const nx1 = Math.min(FW + EDGE, Math.max(p.w > 0 ? p.ox + p.w : x1, x1 + grow))
  const ny1 = Math.min(FH + EDGE, Math.max(p.w > 0 ? p.oy + p.h : y1, y1 + grow))
  const [canvas, ctx] = makeCanvas((nx1 - nx0) * kit.scale, (ny1 - ny0) * kit.scale)
  if (p.w > 0) ctx.drawImage(p.canvas, (p.ox - nx0) * kit.scale, (p.oy - ny0) * kit.scale)
  p.canvas = canvas
  p.ctx = ctx
  p.ox = nx0
  p.oy = ny0
  p.w = nx1 - nx0
  p.h = ny1 - ny0
}

function local(kit: WoolKit, p: Patch): G {
  p.ctx.setTransform(kit.scale, 0, 0, kit.scale, -p.ox * kit.scale, -p.oy * kit.scale)
  return p.ctx
}

function cellAt(x: number, y: number): number {
  const cx = clamp(Math.floor(x / CELL), 0, GW - 1)
  const cy = clamp(Math.floor(y / CELL), 0, GH - 1)
  return cy * GW + cx
}

function mark(p: Patch, x: number, y: number, r: number, stands = true): void {
  const cx0 = clamp(Math.floor((x - r) / CELL), 0, GW - 1)
  const cx1 = clamp(Math.floor((x + r) / CELL), 0, GW - 1)
  const cy0 = clamp(Math.floor((y - r) / CELL), 0, GH - 1)
  const cy1 = clamp(Math.floor((y + r) / CELL), 0, GH - 1)
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const i = cy * GW + cx
      if (p.cells[i] === 0) p.cells[i] = 1
    }
  }
  const mid = cellAt(x, y)
  if (p.cells[mid] < 250) p.cells[mid]++
  const c0 = clamp(Math.floor((x - r) / COL), 0, COLS - 1)
  const c1 = clamp(Math.floor((x + r) / COL), 0, COLS - 1)
  // Wool that was only stroked along is too thin to stand on.
  for (let c = c0; stands && c <= c1; c++) {
    const d = (c * COL + COL / 2 - x) / r
    if (Math.abs(d) >= 1) continue
    const top = y - r * 0.85 * Math.sqrt(1 - d * d)
    if (top < p.tops[c]) p.tops[c] = top
  }
  p.minX = Math.min(p.minX, x - r)
  p.maxX = Math.max(p.maxX, x + r)
  p.minY = Math.min(p.minY, y - r)
  p.maxY = Math.max(p.maxY, y + r)
}

// Is there wool of this patch near a point on the felt (as it is shown now)?
function near(p: Patch, x: number, y: number, reach: number): boolean {
  const lx = x - p.offX
  const ly = y - p.offY
  if (lx < p.minX - CELL || lx > p.maxX + CELL || ly < p.minY - CELL || ly > p.maxY + CELL) return false
  const cx = Math.floor(lx / CELL)
  const cy = Math.floor(ly / CELL)
  for (let j = cy - reach; j <= cy + reach; j++) {
    if (j < 0 || j >= GH) continue
    for (let i = cx - reach; i <= cx + reach; i++) {
      if (i < 0 || i >= GW) continue
      if (p.cells[j * GW + i] > 0) return true
    }
  }
  return false
}

// The patches with wool at this point, topmost first.
export function patchesAt(wool: Wool, x: number, y: number, reach = 1): Patch[] {
  const out: Patch[] = []
  for (let i = wool.patches.length - 1; i >= 0; i--) {
    const p = wool.patches[i]
    if (near(p, x, y, reach)) out.push(p)
  }
  return out
}

function overlaps(a: Patch, b: Patch): boolean {
  if (a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY) return false
  for (let i = 0; i < a.cells.length; i++) if (a.cells[i] > 0 && b.cells[i] > 0) return true
  return false
}

// Fold `from` into `into`, unless wool of another colour lies between them.
function merge(kit: WoolKit, wool: Wool, from: Patch, into: Patch, force = false): boolean {
  const lo = from.z < into.z ? from : into
  const hi = lo === from ? into : from
  for (const q of wool.patches) {
    if (force || q === lo || q === hi || q.dye === lo.dye) continue
    if (q.z > lo.z && q.z < hi.z && overlaps(q, lo)) return false
  }
  const dx = from.offX - into.offX
  const dy = from.offY - into.offY
  ensure(kit, into, from.minX + dx, from.minY + dy, from.maxX + dx, from.maxY + dy)
  const c = local(kit, into)
  c.globalAlpha = 1
  c.globalCompositeOperation = from === lo ? 'destination-over' : 'source-over'
  c.drawImage(from.canvas, from.ox + dx, from.oy + dy, from.w, from.h)
  c.globalCompositeOperation = 'source-over'
  const sx = Math.round(dx / CELL)
  const sy = Math.round(dy / CELL)
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const v = from.cells[j * GW + i]
      if (v === 0) continue
      const ti = clamp(i + sx, 0, GW - 1)
      const tj = clamp(j + sy, 0, GH - 1)
      into.cells[tj * GW + ti] = Math.min(250, into.cells[tj * GW + ti] + v)
    }
  }
  const sc = Math.round(dx / COL)
  for (let i = 0; i < COLS; i++) {
    const ti = clamp(i + sc, 0, COLS - 1)
    if (from.tops[i] + dy < into.tops[ti]) into.tops[ti] = from.tops[i] + dy
  }
  into.minX = Math.min(into.minX, from.minX + dx)
  into.maxX = Math.max(into.maxX, from.maxX + dx)
  into.minY = Math.min(into.minY, from.minY + dy)
  into.maxY = Math.max(into.maxY, from.maxY + dy)
  into.n += from.n
  into.z = hi.z
  wool.patches.splice(wool.patches.indexOf(from), 1)
  wool.patches.sort((a, b) => a.z - b.z)
  return true
}

// A picture worked over and over would keep growing canvases without end.
// Past a generous budget the two lowest layers are felted into one; the
// picture looks the same, the lower one only stops being its own thing.
const BUDGET = FW * FH * 9

export function compact(kit: WoolKit, wool: Wool): void {
  for (let guard = 0; guard < 40 && wool.patches.length > 2; guard++) {
    let area = 0
    for (const p of wool.patches) area += p.w * p.h
    if (area <= BUDGET && wool.patches.length <= 36) return
    merge(kit, wool, wool.patches[0], wool.patches[1], true)
  }
}

// Lay one tuft at a point on the felt. `current` is the patch this stroke has
// been laying into, if any; the patch it went into is returned.
export function lay(kit: WoolKit, wool: Wool, current: Patch | null, dye: number, x: number, y: number, rot: number, size: number, alpha: number): Patch {
  const here = patchesAt(wool, x, y)
  let p = current
  const top = here[0]
  if (p) {
    if (top && top !== p && top.z > p.z && top.dye !== dye) p = null
  } else if (top && top.dye === dye) {
    p = top
  }
  if (!p) {
    p = newPatch(wool, dye)
    p.held = true
  }
  for (const q of here) {
    if (q !== p && q.dye === dye && wool.patches.length > 1) {
      const wasHeld = p.held
      if (merge(kit, wool, q, p)) p.held = wasHeld
    }
  }
  p.held = true
  const lx = x - p.offX
  const ly = y - p.offY
  const fleece = kit.fleeces[dye]
  const r = (TUFT / 2) * size
  ensure(kit, p, lx - r, ly - r, lx + r, ly + r)
  const c = local(kit, p)
  // How much wool is already here and close by. The shadow goes behind what
  // is already there, so it shows only at the rim, and it is laid ever more
  // lightly where tufts crowd, or it would pool dark in the gaps between them.
  let crowd = 0
  const ccx = clamp(Math.floor(lx / CELL), 0, GW - 1)
  const ccy = clamp(Math.floor(ly / CELL), 0, GH - 1)
  for (let j = Math.max(0, ccy - 2); j <= Math.min(GH - 1, ccy + 2); j++) {
    for (let i = Math.max(0, ccx - 2); i <= Math.min(GW - 1, ccx + 2); i++) crowd += p.cells[j * GW + i]
  }
  c.globalCompositeOperation = 'destination-over'
  // Along the bottom of the sheet the frame hides where a shadow would fall.
  c.globalAlpha = ((alpha * 0.26) / (1 + crowd * 0.22)) * (ly > FH - 18 ? 0.25 : 1)
  put(c, kit.shadow, lx + 2.5 * size, ly + 4.5 * size, rot, size)
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = alpha
  put(c, fleece.tufts[Math.floor(Math.random() * fleece.tufts.length)], lx, ly, rot, size)
  c.globalAlpha = 1
  mark(p, lx, ly, 25 * size)
  p.n++
  return p
}

// Stroke the wool with a bare finger: it is drawn along a little, and thins.
// Returns whether there was any wool under the finger.
export function smudge(kit: WoolKit, wool: Wool, x0: number, y0: number, x1: number, y1: number): boolean {
  const here = patchesAt(wool, x0, y0, 0)
  const s = kit.scale
  const size = SMUDGE * 2
  let any = false
  for (let k = 0; k < Math.min(2, here.length); k++) {
    const p = here[k]
    any = true
    const ax = x0 - p.offX
    const ay = y0 - p.offY
    const bx = x1 - p.offX
    const by = y1 - p.offY
    ensure(kit, p, Math.min(ax, bx) - SMUDGE, Math.min(ay, by) - SMUDGE, Math.max(ax, bx) + SMUDGE, Math.max(ay, by) + SMUDGE)
    const t = kit.scratchCtx
    t.setTransform(1, 0, 0, 1, 0, 0)
    t.globalCompositeOperation = 'source-over'
    t.clearRect(0, 0, size * s, size * s)
    t.drawImage(p.canvas, (ax - SMUDGE - p.ox) * s, (ay - SMUDGE - p.oy) * s, size * s, size * s, 0, 0, size * s, size * s)
    t.globalCompositeOperation = 'destination-in'
    t.drawImage(kit.mask.canvas, 0, 0, size * s, size * s)
    const c = local(kit, p)
    c.globalAlpha = 0.42
    c.drawImage(kit.scratch, bx - SMUDGE, by - SMUDGE, size, size)
    c.globalAlpha = 1
    mark(p, bx, by, 15, false)
    p.held = true
  }
  return any
}

function pickSprigs(p: Patch, rand: () => number): void {
  p.sprigs = []
  if (p.kind === 'grass') {
    const step = clamp((p.maxX - p.minX) / 13, 22, 44)
    for (let x = p.minX + 12; x < p.maxX - 8; x += step * (0.7 + rand() * 0.6)) {
      const top = p.tops[clamp(Math.floor(x / COL), 0, COLS - 1)]
      if (!Number.isFinite(top)) continue
      p.sprigs.push({ x, y: top + 9, a: -Math.PI / 2 + gauss(rand) * 0.25, s: 0.5 + rand() * 0.3, ph: rand() * TAU })
    }
  } else if (p.kind === 'sun') {
    const cx = (p.minX + p.maxX) / 2
    const cy = (p.minY + p.maxY) / 2
    const r = Math.max(p.maxX - p.minX, p.maxY - p.minY) * 0.3
    const count = 12
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + gauss(rand) * 0.07
      p.sprigs.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a, s: 0.7 + (i % 2) * 0.22 + rand() * 0.14 + r / 150, ph: i * 1.9 })
    }
  } else if (p.kind === 'water') {
    for (let tries = 0; tries < 90 && p.sprigs.length < 11; tries++) {
      const x = p.minX + rand() * (p.maxX - p.minX)
      const y = p.minY + rand() * (p.maxY - p.minY)
      if (p.cells[cellAt(x, y)] < 2) continue
      p.sprigs.push({ x, y, a: 0, s: 0.9 + rand() * 0.8, ph: rand() * TAU })
    }
  }
}

// Decide what a patch is from where its wool lies. Called when the hand lifts.
export function classify(wool: Wool): void {
  for (const p of wool.patches) {
    p.held = false
    const w = p.maxX - p.minX
    const h = p.maxY - p.minY
    const cy = (p.minY + p.maxY) / 2
    const key = DYES[p.dye].key
    const sky = cy < FH * 0.5 && p.maxY < FH * 0.76
    const high = cy < FH * 0.66
    const earth = key === 'green' || key === 'pine' || key === 'brown'
    let kind: Kind = 'still'
    if (key === 'yellow' && high && w < 250 && h < 250 && w / h > 0.5 && w / h < 2) kind = 'sun'
    else if (sky && !earth) kind = 'cloud'
    else if ((key === 'green' || key === 'pine') && p.maxY > FH * 0.64 && w > 70) kind = 'grass'
    else if (key === 'green' || key === 'pine') kind = 'crown'
    else if (key === 'blue') kind = 'water'
    else if (!earth && w < 100 && h < 100) kind = 'flower'
    const sig = kind === 'grass' || kind === 'sun' || kind === 'water' ? p.n : 0
    if (kind !== p.kind || sig !== p.sig) {
      p.kind = kind
      p.sig = sig
      pickSprigs(p, rng(Math.floor(p.phase * 1000) + p.z))
    }
    p.reachTo = kind === 'cloud' ? clamp(Math.min(w * 0.3 + 12, p.minX + 26, FW - p.maxX + 26), 5, 62) : 0
  }
}

export function updateWool(wool: Wool, dt: number): void {
  for (const p of wool.patches) {
    if (!p.held) {
      p.clock += dt
      p.amt = damp(p.amt, p.kind === 'new' ? 0 : 1, 0.7, dt)
      p.reach = damp(p.reach, p.reachTo, 0.6, dt)
    }
    p.offX = p.reach * Math.sin(p.clock * 0.16 + p.phase)
    p.offY = p.reach * 0.07 * Math.sin(p.clock * 0.23 + p.phase * 2)
  }
  if (wool.napLeft > 0) {
    wool.napLeft -= dt
    wool.napTick -= dt
    if (wool.napTick <= 0) {
      wool.napTick = 0.12
      const c = wool.napCtx
      c.globalCompositeOperation = 'destination-out'
      c.fillStyle = wool.napLeft <= 0 ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0.045)'
      c.fillRect(0, 0, FW, FH)
      c.globalCompositeOperation = 'source-over'
    }
  }
}

// A bare finger on bare felt brushes the nap pale for a few breaths, the way
// stroking felt against its lie changes how it takes the light.
export function brushNap(wool: Wool, x: number, y: number, fromX: number, fromY: number): void {
  const c = wool.napCtx
  wash(c, x, y, 36, 31, [255, 253, 246], 0.2)
  const a = Math.atan2(y - fromY, x - fromX)
  c.strokeStyle = 'rgba(255,255,250,0.5)'
  c.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    c.lineWidth = 0.6 + Math.random() * 0.8
    strand(c, x + gauss(Math.random) * 16, y + gauss(Math.random) * 14, a + gauss(Math.random) * 0.2, 14 + Math.random() * 22, gauss(Math.random) * 3)
  }
  wool.napLeft = 7
}

// Everything laid, in order, each patch moving as what it is. `still` draws
// the resting picture (for the small ones on the wall).
export function drawWool(g: G, kit: WoolKit, wool: Wool, time: number, still = false): void {
  if (wool.napLeft > 0 && !still) g.drawImage(wool.nap, 0, 0, FW, FH)
  for (const p of wool.patches) {
    if (p.w === 0) continue
    const a = still ? 0 : p.amt
    const cx = (p.minX + p.maxX) / 2
    const fleece = kit.fleeces[p.dye]
    g.save()
    if (!still) g.translate(p.offX, p.offY)
    if (p.kind === 'sun') {
      // The rays first, so the sun the child made lies over their roots.
      const cy = (p.minY + p.maxY) / 2
      for (const s of p.sprigs) {
        const breathe = 0.84 + 0.24 * Math.sin(p.clock * 0.8 + s.ph) * a
        const len = s.s * breathe * (still ? 1 : Math.min(1, p.amt * 1.4))
        g.save()
        g.translate(s.x, s.y)
        g.rotate(s.a)
        g.drawImage(fleece.sprig.canvas, -SPRIG.rx * len, -SPRIG.ry * 1.5, SPRIG.w * len, SPRIG.h * 1.5)
        g.restore()
      }
      const k = 1 + 0.028 * Math.sin(p.clock * 0.8 + p.phase) * a
      g.translate(cx, cy)
      g.scale(k, k)
      g.translate(-cx, -cy)
    } else if (p.kind === 'crown' || p.kind === 'flower') {
      const amp = p.kind === 'flower' ? 0.075 : 0.018
      const speed = p.kind === 'flower' ? 1.05 : 0.55
      g.translate(cx, p.maxY)
      g.rotate(amp * Math.sin(p.clock * speed + p.phase) * a)
      g.translate(-cx, -p.maxY)
    }
    g.drawImage(p.canvas, p.ox, p.oy, p.w, p.h)
    if (p.kind === 'grass') {
      for (const s of p.sprigs) {
        const sway = 0.2 * Math.sin(time * 0.9 + s.ph) * a + 0.08 * Math.sin(time * 2.3 + s.ph * 3) * a
        g.save()
        g.translate(s.x, s.y)
        g.rotate(s.a + sway)
        g.drawImage(fleece.sprig.canvas, -SPRIG.rx * s.s, -SPRIG.ry * s.s, SPRIG.w * s.s, SPRIG.h * s.s)
        g.restore()
      }
    } else if (p.kind === 'water' && !still) {
      for (const s of p.sprigs) {
        const tw = Math.sin(time * 0.7 + s.ph)
        if (tw <= 0) continue
        g.globalAlpha = tw * tw * 0.75 * a
        put(g, kit.glint, s.x + Math.sin(time * 0.3 + s.ph) * 7, s.y, 0, s.s)
      }
      g.globalAlpha = 1
    }
    g.restore()
  }
}

// The highest wool that stands on the ground (not sky things), as shown.
export function tallest(wool: Wool): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null
  for (const p of wool.patches) {
    if (p.kind === 'cloud' || p.kind === 'sun' || p.kind === 'new' || p.kind === 'water') continue
    for (let c = 0; c < COLS; c++) {
      const top = p.tops[c]
      if (!Number.isFinite(top)) continue
      if (!best || top < best.y) best = { x: c * COL + COL / 2, y: top }
    }
  }
  if (best) {
    best.y = clamp(best.y + 7, 20, FH - 6)
    best.x = clamp(best.x, 32, FW - 32)
  }
  return best
}

// Is this point on green wool?
export function onGrass(wool: Wool, x: number, y: number): boolean {
  for (const p of wool.patches) {
    const key = DYES[p.dye].key
    if (key !== 'green' && key !== 'pine') continue
    if (near(p, x, y, 0)) return true
  }
  return false
}

export function hasWool(wool: Wool): boolean {
  return wool.patches.length > 0
}

// Where the suns are, for the evening's glow on them.
export function sunSpots(wool: Wool): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = []
  for (const p of wool.patches) {
    if (p.kind !== 'sun') continue
    out.push({ x: (p.minX + p.maxX) / 2 + p.offX, y: (p.minY + p.maxY) / 2 + p.offY, r: Math.max(p.maxX - p.minX, p.maxY - p.minY) / 2 })
  }
  return out
}

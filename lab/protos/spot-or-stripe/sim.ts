// Spot or Stripe. A blank animal made of 10 px cells. The child drops dye on it
// (a tap is one drop, a drag lays a row of drops 30 px apart). Nothing moves
// until GO is pressed (or the child has been quiet a good while). Then every
// cell follows one local rule, over and over, until nothing changes:
//
//   a cell is dye when the dye close to it (radius 2.5) outweighs the dye in the
//   ring around that (out to radius 7), scaled by INHIBIT.
//
// So dye spreads a little, then pushes back on itself. That one rule is what
// decides the coat: a lone drop settles into a round spot, a long close row of
// drops runs together into a stripe, a short row breaks into spots, two drops
// too near merge into one, a crowd is pushed apart, a ring stays a ring. The
// coat is read region by region (body, tail, legs) and named blank, spots,
// stripes, or swirl (curved, ringed, or blotchy).
//
// Pure and deterministic: no DOM, no Math.random, Date.now, or performance.now.
// Randomness (the animal's proportions, a wobble on each drop) is from the seed.

import { between, createRng, int } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type Region = 'body' | 'tail' | 'legs'
export type Coat = 'blank' | 'spots' | 'stripes' | 'swirl'
export type Phase = 'blank' | 'wet' | 'flowing' | 'settled'

export const CELL = 10
export const GW = 118
export const GH = 82
// The buttons, in logical pixels (top-left anchored).
export const GO: Rect = { x: 960, y: 690, w: 180, h: 100 }
export const WASH: Rect = { x: 40, y: 690, w: 180, h: 100 }

const REGIONS: readonly Region[] = ['body', 'tail', 'legs']
const blankCoats = (): Record<Region, Coat> => ({ body: 'blank', tail: 'blank', legs: 'blank' })
// Region ids in the grid: 0 outside, then 1 body, 2 tail, 3 legs.
const REGION_ID: Record<Region, number> = { body: 1, tail: 2, legs: 3 }

// The dye rule. Tuned in a spike and knife-edged: a little less INHIBIT and a
// row runs on without end, a little more and every row breaks into beads. At
// these numbers a lone drop
// holds a round spot, a close straight row of seven or more drops (about 18
// cells) settles into a stripe about as long as the row, a shorter row splits
// into two or three spots, two drops right beside each other merge, drops 8 or
// more cells apart stay apart, and parallel rows hold apart at about 10 cells.
const R_SHORT = 2.5
const R_LONG = 7
const INHIBIT = 0.33
const MAX_ITERS = 260
// The edge of the animal pushes back a little too, so dye does not creep along
// the outline where nothing inhibits it.
const WALL = 0.25
// Dye is not free: each drop carries this many cells of it. A lone drop can
// only spread so far, and a stripe stops growing when its dye runs out.
const SUPPLY_PER_DROP = 34

const DAB_RADIUS = 1.5
const DRIP_PX = 30
const MAX_DRIPS_PER_MOVE = 12
// A touch just off the animal still lands on it (a finger is not a pixel).
const SNAP_CELLS = 3
const BUTTON_SLOP = 16
const IDLE_SETTLE_TICKS = 240
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64
const TILE = 12

// Reading the coat.
const MIN_DARK = 9
const STRIPE_LEN = 12
const STRIPE_RATIO = 1.9
const STRIPE_FILL = 0.6
const BLOB_CELLS = 110

interface Pt {
  x: number
  y: number
}

export interface Anchors {
  body: Pt
  // Points down the middle of the tail proper, base to tip, about 28 px apart.
  tail: Pt[]
  legs: Pt[]
}

export interface SpotSnapshot {
  tick: number
  phase: Phase
  // The animal: ' ' outside, 'b' body, 't' tail, 'l' legs. Same every call.
  layout: string[]
  // The dye: ' ' outside, '.' bare, '#' dye, 'o' a wet drop that has not run yet.
  dye: string[]
  coats: Record<Region, Coat>
  anchors: Anchors
  go: Rect
  wash: Rect
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { kind: 'dab' | 'go'; x: number; y: number } | null
}

interface Tile extends Rect {
  cells: Int32Array
  kind: 'tap' | 'drag'
}

interface Animal {
  region: Uint8Array
  // Per cell: how many cells of the long ring fall off the animal.
  wall: Int16Array
  active: Int32Array
  layout: string[]
  anchors: Anchors
  tiles: Tile[]
}

interface Analysis {
  coats: Record<Region, Coat>
  spots: number
  stripes: number
  dark: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (r: Rect, x: number, y: number, slop = 0) =>
  x >= r.x - slop && x <= r.x + r.w + slop && y >= r.y - slop && y <= r.y + r.h + slop

// Half-widths of the two discs, one per row offset.
const halfWidths = (radius: number): number[] => {
  const r = Math.floor(radius)
  const list: number[] = []
  for (let dy = -r; dy <= r; dy++) list.push(Math.floor(Math.sqrt(radius * radius - dy * dy)))
  return list
}
const SHORT_ROWS = halfWidths(R_SHORT)
const LONG_ROWS = halfWidths(R_LONG)
const SHORT_R = Math.floor(R_SHORT)
const LONG_R = Math.floor(R_LONG)

function buildAnimal(rng: Rng): Animal {
  const cx = 54 + int(rng, -2, 2)
  const cy = 35 + int(rng, -2, 2)
  const rx = 24 + int(rng, 0, 4)
  const ry = 12 + int(rng, 0, 2)
  const legLen = 20 + int(rng, 0, 4)
  const tipX = 14 + int(rng, -3, 3)
  const tipY = 10 + int(rng, -2, 3)
  const baseX = cx - rx + 3
  const baseY = cy - 3
  // A straight tail at a seeded angle: a row of drops down the middle of it
  // stays a straight row.
  const ctrlX = (baseX + tipX) / 2
  const ctrlY = (baseY + tipY) / 2
  const tailCircles: Pt[] = []
  for (let k = 0; k <= 10; k++) {
    const t = k / 10
    const u = 1 - t
    tailCircles.push({ x: u * u * baseX + 2 * u * t * ctrlX + t * t * tipX, y: u * u * baseY + 2 * u * t * ctrlY + t * t * tipY })
  }
  const headX = cx + rx + 1
  const headY = cy - 9
  const neckX = cx + rx - 5
  const neckY = cy - 7
  const legXs = [cx - rx + 3, cx - rx + 13, cx + rx - 17, cx + rx - 7]
  const legTop = cy + ry - 4
  const legBottom = cy + ry + legLen

  const region = new Uint8Array(GW * GH)
  const active: number[] = []
  const layout: string[] = []
  for (let y = 0; y < GH; y++) {
    let row = ''
    for (let x = 0; x < GW; x++) {
      const inBody =
        ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 ||
        Math.hypot(x - headX, y - headY) <= 9 ||
        Math.hypot(x - neckX, y - neckY) <= 9
      const inTail = tailCircles.some((c) => Math.hypot(x - c.x, y - c.y) <= 6)
      const inLegs = y >= legTop && y <= legBottom && legXs.some((lx) => x >= lx && x < lx + 8)
      const id = inBody ? 1 : inTail ? 2 : inLegs ? 3 : 0
      region[y * GW + x] = id
      if (id !== 0) active.push(y * GW + x)
      row += id === 1 ? 'b' : id === 2 ? 't' : id === 3 ? 'l' : ' '
    }
    layout.push(row)
  }

  const px = (cell: number) => cell * CELL + CELL / 2
  const anchors: Anchors = {
    body: { x: px(cx), y: px(cy) },
    // Only the points that fall on the tail itself, not on the body it grows from.
    tail: tailCircles.filter((c) => region[Math.round(c.y) * GW + Math.round(c.x)] === 2).map((c) => ({ x: px(c.x), y: px(c.y) })),
    legs: legXs.map((lx) => ({ x: px(lx + 3.5), y: px(cy + ry + 8) })),
  }

  // Touch targets for the personas: tiles of the animal, padded so each is at
  // least a fingertip across.
  const tiles: Tile[] = []
  for (let ty = 0; ty * TILE < GH; ty++) {
    for (let tx = 0; tx * TILE < GW; tx++) {
      const cells: number[] = []
      let minX = GW
      let maxX = -1
      let minY = GH
      let maxY = -1
      let bodyCells = 0
      for (let y = ty * TILE; y < Math.min(GH, (ty + 1) * TILE); y++) {
        for (let x = tx * TILE; x < Math.min(GW, (tx + 1) * TILE); x++) {
          const id = region[y * GW + x]!
          if (id === 0) continue
          cells.push(y * GW + x)
          if (id === 1) bodyCells++
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
      if (cells.length < 24) continue
      const x0 = Math.max(0, (minX - 2) * CELL)
      const y0 = Math.max(0, (minY - 2) * CELL)
      const x1 = Math.min(FIELD_W, (maxX + 3) * CELL)
      const y1 = Math.min(FIELD_H, (maxY + 3) * CELL)
      tiles.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, cells: Int32Array.from(cells), kind: bodyCells * 2 > cells.length ? 'drag' : 'tap' })
    }
  }
  const wall = new Int16Array(GW * GH)
  for (const c of active) {
    const x = c % GW
    const y = (c - x) / GW
    let off = 0
    for (let dy = -LONG_R; dy <= LONG_R; dy++) {
      const h2 = LONG_ROWS[dy + LONG_R]!
      for (let dx = -h2; dx <= h2; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || region[ny * GW + nx] === 0) off++
      }
    }
    wall[c] = off
  }
  return { region, wall, active: Int32Array.from(active), layout, anchors, tiles }
}

export const createSim: CreateSim<SpotSnapshot> = (config): Sim<SpotSnapshot> => {
  const rng = createRng(config.seed)
  const animal = buildAnimal(rng)
  const { region, wall, active, anchors } = animal

  const field = { cur: new Uint8Array(GW * GH), next: new Uint8Array(GW * GH) }
  const wet = new Uint8Array(GW * GH)
  const prefix = new Int32Array((GW + 1) * GH)
  const seen = new Uint8Array(GW * GH)
  const stack = new Int32Array(GW * GH)
  const members = new Int32Array(GW * GH)
  const candidates = new Int32Array(GW * GH)
  const strength = new Float64Array(GW * GH)
  const order: number[] = []

  const strokes = new Map<number, Pt>()
  let pending: SimEvent[] = []
  let tick = 0
  let idle = 0
  let dirty = false
  let flowing = false
  let iters = 0
  let dabs = 0
  // How much dye there is on the animal, in cells: a fixed amount per drop.
  let supply = 0
  let version = 0
  let analysed = -1
  let analysis: Analysis = { coats: blankCoats(), spots: 0, stripes: 0, dark: 0 }
  let lastCoats: Record<Region, Coat> = blankCoats()

  const emit = (name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind: 'state', name })
  }

  // ---- reading the coat -------------------------------------------------
  const analyse = (): Analysis => {
    if (analysed === version) return analysis
    analysed = version
    const a = field.cur
    seen.fill(0)
    // area[regionId][class]: class 0 spots, 1 stripes, 2 swirl.
    const area = [0, 1, 2, 3].map(() => [0, 0, 0])
    const dark = [0, 0, 0, 0]
    const counts = [0, 0, 0]
    let total = 0
    for (const start of active) {
      if (!a[start] || seen[start]) continue
      let top = 0
      let n = 0
      stack[top++] = start
      seen[start] = 1
      while (top > 0) {
        const i = stack[--top]!
        members[n++] = i
        const x = i % GW
        const y = (i - x) / GW
        if (x > 0 && a[i - 1] && !seen[i - 1]) ((seen[i - 1] = 1), (stack[top++] = i - 1))
        if (x < GW - 1 && a[i + 1] && !seen[i + 1]) ((seen[i + 1] = 1), (stack[top++] = i + 1))
        if (y > 0 && a[i - GW] && !seen[i - GW]) ((seen[i - GW] = 1), (stack[top++] = i - GW))
        if (y < GH - 1 && a[i + GW] && !seen[i + GW]) ((seen[i + GW] = 1), (stack[top++] = i + GW))
      }
      if (n < 4) continue
      // Principal axes of the blob, then its extent along each.
      let sx = 0
      let sy = 0
      for (let k = 0; k < n; k++) {
        const i = members[k]!
        sx += i % GW
        sy += Math.floor(i / GW)
      }
      const mx = sx / n
      const my = sy / n
      let cxx = 0
      let cyy = 0
      let cxy = 0
      for (let k = 0; k < n; k++) {
        const i = members[k]!
        const dx = (i % GW) - mx
        const dy = Math.floor(i / GW) - my
        cxx += dx * dx
        cyy += dy * dy
        cxy += dx * dy
      }
      const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy)
      const ux = Math.cos(theta)
      const uy = Math.sin(theta)
      let minA = Infinity
      let maxA = -Infinity
      let minB = Infinity
      let maxB = -Infinity
      for (let k = 0; k < n; k++) {
        const i = members[k]!
        const dx = (i % GW) - mx
        const dy = Math.floor(i / GW) - my
        const along = dx * ux + dy * uy
        const across = -dx * uy + dy * ux
        minA = Math.min(minA, along)
        maxA = Math.max(maxA, along)
        minB = Math.min(minB, across)
        maxB = Math.max(maxB, across)
      }
      const e1 = maxA - minA + 1
      const e2 = maxB - minB + 1
      const long = Math.max(e1, e2)
      const short = Math.min(e1, e2)
      const fill = n / (long * short)
      let klass = 0
      if (long >= STRIPE_LEN && long / short >= STRIPE_RATIO) klass = fill >= STRIPE_FILL ? 1 : 2
      else if (n >= BLOB_CELLS) klass = 2
      counts[klass]!++
      total += n
      for (let k = 0; k < n; k++) {
        const id = region[members[k]!]!
        area[id]![klass]!++
        dark[id]!++
      }
    }
    const coats = blankCoats()
    for (const r of REGIONS) {
      const id = REGION_ID[r]
      if (dark[id]! < MIN_DARK) continue
      // Ties go to the rarer coat.
      const [sp, st, sw] = area[id]!
      coats[r] = sw! >= st! && sw! >= sp! ? 'swirl' : st! >= sp! ? 'stripes' : 'spots'
    }
    analysis = { coats, spots: counts[0]!, stripes: counts[1]!, dark: total }
    return analysis
  }

  // ---- the dye rule -----------------------------------------------------
  // One synchronous step of the rule over the animal. Returns how many cells
  // changed.
  const iterate = (): number => {
    const a = field.cur
    const b = field.next
    for (let y = 0; y < GH; y++) {
      const row = y * (GW + 1)
      let run = 0
      prefix[row] = 0
      for (let x = 0; x < GW; x++) {
        run += a[y * GW + x]!
        prefix[row + x + 1] = run
      }
    }
    let changed = 0
    let alive = 0
    let births = 0
    for (const c of active) {
      const x = c % GW
      const y = (c - x) / GW
      let core = 0
      let wide = 0
      for (let dy = -LONG_R; dy <= LONG_R; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= GH) continue
        const row = yy * (GW + 1)
        const h2 = LONG_ROWS[dy + LONG_R]!
        wide += prefix[row + Math.min(GW - 1, x + h2) + 1]! - prefix[row + Math.max(0, x - h2)]!
        if (dy >= -SHORT_R && dy <= SHORT_R) {
          const h1 = SHORT_ROWS[dy + SHORT_R]!
          core += prefix[row + Math.min(GW - 1, x + h1) + 1]! - prefix[row + Math.max(0, x - h1)]!
        }
      }
      const push = core - INHIBIT * (wide - core + WALL * wall[c]!)
      const now = a[c]!
      const after = push > 0 ? 1 : push < 0 ? 0 : now
      b[c] = now && !after ? 0 : now
      if (now && !after) changed++
      if (now && after) alive++
      // A cell that wants to turn to dye is only a candidate: dye is not free.
      else if (!now && after) {
        candidates[births] = c
        strength[births] = push + rng() * 0.01
        births++
      }
    }
    // The dye is a fixed amount (a little per drop). New dye may only appear
    // where there is supply left, strongest wanting first.
    const room = Math.max(0, supply - alive)
    let chosen = births
    if (births > room) {
      order.length = births
      for (let k = 0; k < births; k++) order[k] = k
      order.sort((p, q) => strength[q]! - strength[p]!)
      chosen = room
      for (let k = 0; k < chosen; k++) b[candidates[order[k]!]!] = 1
    } else {
      for (let k = 0; k < births; k++) b[candidates[k]!] = 1
    }
    changed += chosen
    field.cur = b
    field.next = a
    if (changed > 0) version++
    return changed
  }

  const startFlow = () => {
    if (flowing || !dirty) return
    flowing = true
    iters = 0
    wet.fill(0)
    emit('go')
  }

  const finishFlow = () => {
    flowing = false
    dirty = false
    version++
    emit('settled')
    const coats = analyse().coats
    for (const r of REGIONS) if (coats[r] !== lastCoats[r] && coats[r] !== 'blank') emit(`${r}-${coats[r]}`)
    lastCoats = { ...coats }
  }

  const wash = () => {
    field.cur.fill(0)
    field.next.fill(0)
    wet.fill(0)
    dirty = false
    flowing = false
    supply = 0
    version++
    lastCoats = blankCoats()
    emit('wash')
  }

  // ---- touching ---------------------------------------------------------
  // One drop of dye at a point in pixels. It lands on the nearest bit of animal
  // within SNAP_CELLS; a touch further out lands nowhere.
  const drop = (x: number, y: number): boolean => {
    const wobble = between(rng, -0.3, 0.3)
    const gx = Math.round(x / CELL - 0.5 + wobble)
    const gy = Math.round(y / CELL - 0.5 + wobble)
    let bx = -1
    let by = -1
    let best = Infinity
    for (let dy = -SNAP_CELLS; dy <= SNAP_CELLS; dy++) {
      for (let dx = -SNAP_CELLS; dx <= SNAP_CELLS; dx++) {
        const nx = gx + dx
        const ny = gy + dy
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || region[ny * GW + nx] === 0) continue
        const d = Math.hypot(dx, dy)
        if (d <= SNAP_CELLS && d < best) {
          best = d
          bx = nx
          by = ny
        }
      }
    }
    if (bx < 0) return false
    const r = Math.ceil(DAB_RADIUS)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = bx + dx
        const ny = by + dy
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || Math.hypot(dx, dy) > DAB_RADIUS) continue
        const c = ny * GW + nx
        if (region[c] === 0) continue
        field.cur[c] = 1
        if (!flowing) wet[c] = 1
      }
    }
    dabs++
    supply += SUPPLY_PER_DROP
    version++
    if (flowing) iters = 0
    else dirty = true
    emit('dab')
    return true
  }

  const pointer = (input: PointerInput) => {
    idle = 0
    const { id, phase } = input
    if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
      if (phase === 'up') strokes.delete(id)
      return
    }
    const x = clamp(input.x, 0, FIELD_W)
    const y = clamp(input.y, 0, FIELD_H)
    if (phase === 'down') {
      strokes.delete(id)
      if (inside(GO, x, y, BUTTON_SLOP)) return startFlow()
      if (inside(WASH, x, y, BUTTON_SLOP)) return wash()
      drop(x, y)
      strokes.set(id, { x, y })
      return
    }
    if (phase === 'up') {
      strokes.delete(id)
      return
    }
    const last = strokes.get(id)
    if (!last) return
    const dist = Math.hypot(x - last.x, y - last.y)
    const wanted = Math.floor(dist / DRIP_PX)
    const n = Math.min(MAX_DRIPS_PER_MOVE, wanted)
    for (let k = 1; k <= n; k++) drop(last.x + ((x - last.x) * k * DRIP_PX) / dist, last.y + ((y - last.y) * k * DRIP_PX) / dist)
    if (n > 0) {
      const at = n === wanted ? { x: last.x + ((x - last.x) * n * DRIP_PX) / dist, y: last.y + ((y - last.y) * n * DRIP_PX) / dist } : { x, y }
      strokes.set(id, at)
    }
  }

  const step = () => {
    tick++
    idle++
    if (flowing) {
      iters++
      if (iterate() === 0 || iters >= MAX_ITERS) finishFlow()
    } else if (dirty && idle >= IDLE_SETTLE_TICKS) startFlow()
  }

  // ---- what the personas and the view see -------------------------------
  const phaseNow = (): Phase => (analyse().dark === 0 && !dirty ? 'blank' : flowing ? 'flowing' : dirty ? 'wet' : 'settled')

  const affordances = (): Affordance[] => {
    const a = field.cur
    const wetNow = dirty && !flowing
    const list: Affordance[] = animal.tiles.map((t) => {
      let bare = 0
      for (const c of t.cells) if (!a[c]) bare++
      return { x: t.x, y: t.y, w: t.w, h: t.h, kind: t.kind, salience: (flowing ? 0.1 : 0.25) + 0.5 * (bare / t.cells.length) }
    })
    const hasDye = analyse().dark > 0
    list.push({ ...GO, kind: 'tap', salience: wetNow ? 0.85 : flowing ? 0.03 : 0.08 })
    list.push({ ...WASH, kind: 'tap', salience: hasDye && !dirty && !flowing ? 0.3 : hasDye ? 0.08 : 0.03 })
    return list
  }

  const observe = (): Observation => {
    const seenNow = analyse()
    const coats = seenNow.coats
    const kinds = new Set(REGIONS.map((r) => coats[r]).filter((c) => c !== 'blank'))
    const events = pending
    pending = []
    return {
      signature: `${coats.body}/${coats.tail}/${coats.legs}`,
      features: { coatVariety: kinds.size, spots: seenNow.spots, stripes: seenNow.stripes, coverage: seenNow.dark / active.length, dabs },
      events,
    }
  }

  // Only data for the view; it never changes what the sim does.
  const hint = (): SpotSnapshot['hint'] => {
    if (!config.hints || idle < HINT_AFTER_TICKS || flowing) return null
    if (dirty) return { kind: 'go', x: GO.x + GO.w / 2, y: GO.y + GO.h / 2 }
    const seenNow = analyse()
    if (seenNow.dark === 0) return { kind: 'dab', ...anchors.body }
    const bare = REGIONS.find((r) => seenNow.coats[r] === 'blank')
    if (!bare) return null
    return { kind: 'dab', ...(bare === 'body' ? anchors.body : bare === 'tail' ? anchors.tail[5]! : anchors.legs[0]!) }
  }

  const snapshot = (): SpotSnapshot => {
    const a = field.cur
    const dye: string[] = []
    for (let y = 0; y < GH; y++) {
      let row = ''
      for (let x = 0; x < GW; x++) {
        const c = y * GW + x
        row += region[c] === 0 ? ' ' : a[c] ? (wet[c] ? 'o' : '#') : '.'
      }
      dye.push(row)
    }
    return { tick, phase: phaseNow(), layout: animal.layout, dye, coats: { ...analyse().coats }, anchors, go: { ...GO }, wash: { ...WASH }, hint: hint() }
  }

  return { step, pointer, affordances, observe, snapshot }
}

// Box Fort: a heap of cardboard boxes on the living-room floor on a rainy
// afternoon. Stack them, tape them, cut doors and windows with the scissors,
// scribble on them, throw the blanket over, push cushions in, string the fairy
// lights. The cat looks into every opening as it is cut. Flick the light switch
// and the fort glows from exactly the holes that were cut.
//
// The look is the craft table itself: kraft paper, corrugated edges, torn
// masking tape, paper fasteners, fat marker. See art.ts and puppets.ts.

import { clamp, damp, dist, ease, lerp, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { BULBS, FACE_PAD, FLOOR, GLOW_PAD, FRONT, H, MARKERS, NAIL, SHELF, STEPS, SWITCH, TONES, W, blit, brad, createArt, drawMarker, drawPot, drawScissors, drawTapeRoll, makeLayer, makePalettes, mixRgb, tapeStrip } from './art.ts'
import type { FaceLook, Pal, PalName } from './art.ts'
import { bounds, facet, fatten, hull, inPoly, rng, touching, tracePoly } from './geom.ts'
import type { Bounds, Pt } from './geom.ts'
import { blanketDraped, blanketFolded, blanketHeap, blanketHeld, catBodyBehind, catDoorTail, catInWindow, catRump, catSit, catWalk, drawCushion, drawTeddy } from './puppets.ts'
import type { CatFace } from './puppets.ts'
import { createSounds } from './sound.ts'

// Set just before a restart so the new day begins behind the paper curtain.
let curtainDownNext = false

const BX0 = 186
const BX1 = 992
const TOP_MIN = 22
const BEAD_X = 1136
const BEAD_UP = 84
const BEAD_DOWN = 560
const LIGHTS_MAX = 2000
const TAPE_MAX = 26

interface Hole {
  id: number
  poly: Pt[]
  b: Bounds
  cx: number
  cy: number
  door: boolean
  glow: HTMLCanvasElement
  // A sharper copy, for the shape it throws on the wall.
  beam: HTMLCanvasElement
  // The outline those two were made from.
  glowFor: Pt[] | null
}

interface Box extends FaceLook {
  id: number
  x: number
  y: number
  unit: number
  holes: Hole[]
  // Where it is drawn relative to where it rests, while it falls into place.
  ox: number
  oy: number
  vy: number
  squash: Spring
  held: boolean
  lift: number
  tilt: number
  size: number
}

interface Item {
  kind: 'cushion' | 'teddy' | 'scrap'
  variant: number
  // Bottom middle, in the room; or relative to `inside` / `on`.
  x: number
  y: number
  inside: Box | null
  on: Box | null
  onBlanket: boolean
  held: boolean
  oy: number
  vy: number
  squash: Spring
  swing: Spring
  rest: number
  poly: Pt[]
  tone: PalName
  rot: number
}

interface Strip {
  a: Box
  ax: number
  ay: number
  b: Box
  bx: number
  by: number
  seed: number
}

interface Pin {
  box: Box
  lx: number
  ly: number
}

type ToolId = 'scissors' | 'tape' | 'mk0' | 'mk1' | 'mk2'

interface Tool {
  id: ToolId
  hx: number
  hy: number
  hrot: number
  x: number
  y: number
  rot: number
  tx: number
  ty: number
  trot: number
  out: number
  open: number
  wig: Spring
}

type Grab =
  | { kind: 'box'; unit: Box[]; offs: Pt[] }
  | { kind: 'item'; item: Item; dx: number; dy: number }
  | { kind: 'blanket' }
  | { kind: 'lights'; added: number; moved: number }
  | { kind: 'bead'; dy: number }
  | { kind: 'cut'; box: Box; pts: Pt[]; acc: number }
  | { kind: 'ink'; color: number; x: number; y: number; acc: number }
  | { kind: 'tape'; box: Box; sx: number; sy: number; acc: number }
  | { kind: 'air'; acc: number }
  | { kind: 'carry'; moved: number }
  | { kind: 'pet'; acc: number }

const SIZES: readonly (readonly [number, number, number])[] = [
  [290, 200, 1],
  [240, 165, 0],
  [150, 235, 3],
  [215, 115, 4],
  [175, 150, 0],
  [130, 130, 2],
  [110, 92, 2],
]

function create(stage: Stage): Game {
  const { fx } = stage
  const sounds = createSounds(stage.sfx)
  const startDown = curtainDownNext
  curtainDownNext = false

  const S = clamp(Math.round((globalThis.devicePixelRatio || 1) * 2) / 2, 1, 2)
  const seed = 1 + Math.floor(stage.rand() * 90000)
  const art = createArt(S, seed)
  const { out: OUT, ins: INS } = makePalettes()
  const inWall: string[] = []
  const inFloor: string[] = []
  for (let k = 0; k <= STEPS; k++) {
    inWall.push(mixRgb([92, 64, 40], [255, 218, 140], k / STEPS))
    inFloor.push(mixRgb([122, 88, 56], [255, 190, 100], k / STEPS))
  }
  const DAY = OUT[0]

  // ---- the room's state -------------------------------------------------------

  const boxes: Box[] = []
  const items: Item[] = []
  const strips: Strip[] = []
  const pins: Pin[] = []
  const grabs = new Map<number, Grab>()
  let holeIds = 0
  let lampOn = true
  let dark = 0
  let lastTouch = -10
  let everMoved = false
  let nudgeAt = 7
  let nudges = 0
  let rainIn = 0.4
  let tapeLeft = TAPE_MAX
  let lightsUsed = 0
  let reeling = false
  let reelIn = 0
  let layingId = -1
  let layX = 0
  let layY = 0
  const sw = spring(1, 260, 16)

  const bead = { y: startDown ? BEAD_DOWN : BEAD_UP, swing: spring(0, 60, 5), latched: startDown, busy: false }
  const curtainOf = () => clamp((bead.y - BEAD_UP) / (BEAD_DOWN - BEAD_UP), 0, 1)
  const ripple = spring(0, 90, 7)

  const blanket = { mode: 'folded' as 'folded' | 'held' | 'draped' | 'heap', x: 1078, y: FRONT - 4, cx: 0, on: null as Box | null, dx: 0, path: [] as Pt[], sway: spring(0, 40, 6), squash: spring(1, 200, 12) }

  const cat = {
    mode: 'sit' as 'sit' | 'walk' | 'leap' | 'window' | 'door',
    x: 902,
    y: FRONT + 2,
    dir: -1,
    box: null as Box | null,
    hole: null as Hole | null,
    lx: 0,
    ly: 0,
    sill: 24,
    goal: null as { box: Box; hole: Hole } | null,
    walkTo: 0,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    t: 0,
    dur: 0.5,
    shrink: false,
    after: null as (() => void) | null,
    lookX: 0,
    lookY: 0,
    glanceX: 0,
    glanceY: 0,
    glanceUntil: 0,
    earUntil: 0,
    blinkUntil: 0,
    pop: spring(1, 210, 13),
    phase: 0,
    token: 0,
    tailDir: 1,
  }

  // ---- boxes: making, stacking, settling -----------------------------------------

  const makeBox = (w: number, h: number, tone: number): Box => {
    const lw = w + FACE_PAD * 2
    const lh = h + FACE_PAD * 2
    const box: Box = {
      id: boxes.length,
      x: 0,
      y: 0,
      w,
      h,
      tone,
      seed: seed + boxes.length * 101,
      unit: boxes.length,
      holes: [],
      day: makeLayer(lw, lh, S),
      night: makeLayer(lw, lh, S),
      ink: makeLayer(lw, lh, S),
      ox: 0,
      oy: 0,
      vy: 0,
      squash: spring(1, 300, 15),
      held: false,
      lift: 0,
      tilt: 0,
      size: clamp((w * h) / (290 * 200), 0.1, 1),
    }
    boxes.push(box)
    return box
  }

  const overlapX = (a: Box, b: Box) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const overlapY = (a: Box, b: Box) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)

  // Where the bottom of `m` comes to rest if it falls straight down from here.
  const supportY = (m: Box, mates: readonly Box[]): number => {
    let y = FLOOR
    for (const o of boxes) {
      if (o === m || o.held || mates.includes(o)) continue
      if (overlapX(m, o) > 6 && o.y >= m.y + m.h - 4 && o.y < y) y = o.y
    }
    return y
  }
  const shift = (unit: readonly Box[], dx: number, dy: number) => {
    for (const b of unit) {
      b.x += dx
      b.y += dy
    }
  }
  const clampUnit = (unit: readonly Box[]) => {
    let lo = Infinity
    let hi = -Infinity
    for (const b of unit) {
      lo = Math.min(lo, b.x)
      hi = Math.max(hi, b.x + b.w)
    }
    if (lo < BX0) shift(unit, BX0 - lo, 0)
    else if (hi > BX1) shift(unit, BX1 - hi, 0)
  }
  const others = (unit: readonly Box[]) => boxes.filter((o) => !o.held && !unit.includes(o))
  const raise = (unit: readonly Box[]) => {
    const rest = others(unit)
    for (let i = 0; i < 30; i++) {
      let moved = false
      for (const m of unit) for (const o of rest) {
        if (overlapX(m, o) > 6 && overlapY(m, o) > 2) {
          shift(unit, 0, o.y - (m.y + m.h))
          moved = true
        }
      }
      if (!moved) return
    }
  }
  const fall = (unit: readonly Box[]) => {
    let d = Infinity
    for (const m of unit) d = Math.min(d, supportY(m, unit) - (m.y + m.h))
    if (Number.isFinite(d)) shift(unit, 0, d)
  }
  const collides = (unit: readonly Box[]) => {
    for (const m of unit) for (const o of others(unit)) if (overlapX(m, o) > 0.5 && overlapY(m, o) > 2) return true
    return false
  }

  // Whatever a box rests on must hold up its middle, or both its halves.
  const stable = (unit: readonly Box[]): boolean => {
    for (const m of unit) {
      if (m.y + m.h >= FLOOR - 1) continue
      const under = boxes.filter((o) => o !== m && !o.held && Math.abs(o.y - (m.y + m.h)) < 1.5 && overlapX(m, o) > 6)
      // Nothing under it (it hangs from its taped mates), or it rides on the
      // stack it was carried with: that is not this box's worry.
      if (under.length === 0 || under.some((o) => unit.includes(o))) continue
      const cx = m.x + m.w / 2
      if (under.some((o) => o.x + 8 <= cx && o.x + o.w - 8 >= cx)) continue
      if (under.some((o) => o.x + o.w / 2 < cx) && under.some((o) => o.x + o.w / 2 > cx)) continue
      return false
    }
    return true
  }
  const sound = (unit: readonly Box[]) => unit.every((b) => b.y >= TOP_MIN) && stable(unit)

  // Find where a unit let go at its current place ends up: slid clear of a
  // near miss, lifted out of anything it was pushed into, dropped onto what is
  // below. If that would leave it hanging by a corner or poking through the
  // ceiling, it comes to rest at the nearest spot beside that is sound.
  // Returns how far sideways it had to go, or null if nowhere was sound.
  const place = (unit: readonly Box[]): number | null => {
    clampUnit(unit)
    for (let pass = 0; pass < 3; pass++) {
      for (const m of unit) for (const o of others(unit)) {
        const ox = overlapX(m, o)
        if (ox > 0 && overlapY(m, o) > 20 && ox < Math.min(70, 0.42 * Math.min(m.w, o.w))) {
          shift(unit, m.x + m.w / 2 < o.x + o.w / 2 ? -ox : ox, 0)
          clampUnit(unit)
        }
      }
    }
    const keep = unit.map((b) => [b.x, b.y] as Pt)
    const put = (dx: number) => {
      unit.forEach((b, i) => ((b.x = keep[i][0] + dx), (b.y = keep[i][1])))
      clampUnit(unit)
      raise(unit)
      fall(unit)
    }
    let found = false
    let went = 0
    // If nowhere is sound, the spot that pokes least through the ceiling.
    let leastBad = 0
    let leastTop = -Infinity
    for (let k = 0; k <= 110 && !found; k++) {
      for (const sign of k === 0 ? [1] : [1, -1]) {
        put(sign * k * 8)
        if (sound(unit)) {
          found = true
          went = k * 8
          break
        }
        const top = Math.min(...unit.map((b) => b.y))
        if (top > leastTop + 0.5 && stable(unit)) {
          leastTop = top
          leastBad = sign * k * 8
        }
      }
    }
    if (!found) {
      put(leastBad)
      return null
    }

    // Line an edge up with a neighbour's when it is nearly there.
    let best = 0
    let bestAbs = 16
    for (const m of unit) for (const o of others(unit)) {
      const stacked = Math.abs(o.y - (m.y + m.h)) < 1.5 && overlapX(m, o) > 6
      const beside = overlapY(m, o) > 10
      const tries: number[] = []
      if (stacked) tries.push(o.x - m.x, o.x + o.w - (m.x + m.w))
      if (beside) tries.push(o.x + o.w - m.x, o.x - (m.x + m.w))
      for (const d of tries) if (Math.abs(d) < bestAbs && Math.abs(d) > 0.01) {
        bestAbs = Math.abs(d)
        best = d
      }
    }
    if (best !== 0) {
      const was = unit.map((b) => [b.x, b.y] as Pt)
      shift(unit, best, 0)
      clampUnit(unit)
      const y0 = unit[0].y
      if (!collides(unit)) fall(unit)
      if (collides(unit) || Math.abs(unit[0].y - y0) > 1 || !sound(unit)) unit.forEach((b2, i) => ((b2.x = was[i][0]), (b2.y = was[i][1])))
    }
    return went
  }

  // A carried stack is set down whole where it fits. Where it cannot fit as
  // it is (too tall for the room there), it is set down box by box instead,
  // lowest first, each finding its own place near where it was let go.
  const placeStack = (group: readonly Box[]) => {
    const was = group.map((b) => [b.x, b.y] as Pt)
    const went = place(group)
    if (group.every((b) => b.unit === group[0].unit) || (went !== null && went <= 160)) return
    group.forEach((b, i) => ((b.x = was[i][0]), (b.y = was[i][1]), (b.held = true)))
    const ids = [...new Set(group.map((b) => b.unit))]
    ids.sort((p, q) => Math.max(...group.filter((b) => b.unit === q).map((b) => b.y + b.h)) - Math.max(...group.filter((b) => b.unit === p).map((b) => b.y + b.h)))
    for (const id of ids) {
      const unit = group.filter((b) => b.unit === id)
      for (const b of unit) b.held = false
      place(unit)
    }
  }

  // Everything not in a hand drops straight down onto whatever is now below it.
  const settle = () => {
    for (let pass = 0; pass < 8; pass++) {
      let moved = false
      const ids = [...new Set(boxes.filter((b) => !b.held).map((b) => b.unit))]
      ids.sort((p, q) => Math.max(...boxes.filter((b) => b.unit === q).map((b) => b.y + b.h)) - Math.max(...boxes.filter((b) => b.unit === p).map((b) => b.y + b.h)))
      for (const id of ids) {
        const unit = boxes.filter((b) => b.unit === id && !b.held)
        let d = Infinity
        for (const m of unit) d = Math.min(d, supportY(m, unit) - (m.y + m.h))
        if (d > 0.5 && Number.isFinite(d)) {
          for (const b of unit) {
            b.y += d
            b.oy -= d
          }
          moved = true
        }
      }
      if (!moved) break
    }
  }

  const boxAt = (x: number, y: number): Box | null => {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i]
      if (x >= b.x + b.ox && x <= b.x + b.ox + b.w && y >= b.y + b.oy && y <= b.y + b.oy + b.h) return b
    }
    return null
  }

  // The heap the afternoon starts with: three on the floor, the rest dropped on.
  {
    const made = SIZES.map(([w, h, tone]) => makeBox(w, h, tone))
    const ground = [made[0], made[2], made[1]]
    if (stage.rand() < 0.5) ground.reverse()
    const spare = BX1 - BX0 - ground.reduce((sum, b) => sum + b.w, 0)
    const cuts = [stage.rand(), stage.rand(), stage.rand(), stage.rand()]
    const total = cuts.reduce((a, b) => a + b, 0)
    let x = BX0
    ground.forEach((b, i) => {
      x += (cuts[i] / total) * spare
      b.x = x
      b.y = FLOOR - b.h
      x += b.w
    })
    for (const b of [made[3], made[4], made[5], made[6]]) {
      b.held = true
      for (let attempt = 0; attempt < 14; attempt++) {
        b.x = lerp(BX0, BX1 - b.w, stage.rand())
        b.y = -500
        b.held = false
        place([b])
        if (b.y >= 268 || attempt === 13) break
        b.held = true
      }
      b.held = false
    }
    for (const b of boxes) {
      art.renderDay(b)
      art.renderNight(b)
    }
  }

  // ---- loose things -------------------------------------------------------------

  const makeItem = (kind: Item['kind'], variant: number, x: number, y: number): Item => {
    const it: Item = { kind, variant, x, y, inside: null, on: null, onBlanket: false, held: false, oy: 0, vy: 0, squash: spring(1, 240, 12), swing: spring(0, 50, 5), rest: 1, poly: [], tone: 'kraft', rot: 0 }
    items.push(it)
    return it
  }
  const itemX = (it: Item) => (it.inside ? it.inside.x + it.inside.ox + it.x : it.on ? it.on.x + it.on.ox + it.x : it.x)
  const itemY = (it: Item) => (it.inside ? it.inside.y + it.inside.oy + it.y : it.on ? it.on.y + it.on.oy + it.y : it.y)
  const itemMid = (it: Item) => (it.kind === 'cushion' ? 31 : it.kind === 'teddy' ? 54 : 12)

  makeItem('cushion', 0, 1040, FRONT - 53).onBlanket = true
  makeItem('cushion', 2, 1120, FRONT - 55).onBlanket = true
  makeItem('cushion', 1, 1082, FRONT - 110).onBlanket = true
  makeItem('teddy', 0, 262, FRONT + 4)

  const dropLoose = (it: Item, x: number, fromY: number) => {
    it.inside = null
    it.on = null
    it.x = clamp(x, 40, W - 40)
    const restY = FRONT + (it.kind === 'scrap' ? 12 : 2) + ((it.variant * 7) % 9) - 4
    it.y = restY
    it.oy = fromY - restY
    it.vy = 0
  }

  // ---- holes ----------------------------------------------------------------------

  const blank = document.createElement('canvas')
  blank.width = 2
  blank.height = 2

  const sillAt = (hole: Hole): number => {
    // The lowest point of the outline under its middle.
    let y = -Infinity
    const p = hole.poly
    for (let i = 0; i < p.length; i++) {
      const a = p[i]
      const b = p[(i + 1) % p.length]
      if (a[0] <= hole.cx !== b[0] <= hole.cx) {
        const t = (hole.cx - a[0]) / (b[0] - a[0])
        y = Math.max(y, a[1] + (b[1] - a[1]) * t)
      }
    }
    return Number.isFinite(y) ? y : hole.b.maxY
  }

  const shapeHole = (box: Box, hole: Hole, poly: Pt[]) => {
    const r = rng(box.seed + hole.id * 37 + poly.length)
    let out = facet(poly, 27, 2.6, r, hole.door ? box.h - 0.5 : Infinity)
    out = out.map(([x, y]) => [clamp(x, 9, box.w - 9), hole.door ? (y > box.h - 0.5 ? box.h + 2 : Math.max(y, 15)) : clamp(y, 15, box.h - 9)] as Pt)
    hole.poly = out
    hole.b = bounds(out)
    hole.cx = (hole.b.minX + hole.b.maxX) / 2
    hole.cy = (hole.b.minY + Math.min(hole.b.maxY, box.h)) / 2
    stale.add(box)
  }
  // The soft copies of each outline and the night face are the slow part of a
  // cut, and nobody sees them in the same frame: they follow in the next one.
  const stale = new Set<Box>()
  const freshen = () => {
    for (const box of stale) {
      stale.delete(box)
      for (const hole of box.holes) {
        if (hole.glowFor === hole.poly) continue
        hole.glow = art.glowOf(hole.poly, GLOW_PAD)
        hole.beam = art.glowOf(hole.poly, 9, 'rgba(255,160,70,1)')
        hole.glowFor = hole.poly
      }
      art.renderNight(box)
      return
    }
  }

  const cutHole = (box: Box, stroke: readonly Pt[]) => {
    const R = 31
    const m = 12
    const loX = Math.min(m + R, box.w / 2)
    const hiX = Math.max(box.w - m - R, box.w / 2)
    const loY = Math.min(m + R + 5, box.h / 2)
    const hiY = Math.max(box.h - m - R, box.h / 2)
    const pts = stroke.map(([x, y]) => [clamp(x, loX, hiX), clamp(y, loY, hiY)] as Pt)
    let door = stroke.some((p) => p[1] > box.h - 36)
    let poly = hull(fatten(pts, R))
    const piece = poly
    // Cutting into an opening that is already there makes it bigger.
    let keep: Hole | null = null
    for (let i = box.holes.length - 1; i >= 0; i--) {
      const h = box.holes[i]
      if (!touching(h.poly, poly)) continue
      poly = hull([...poly, ...h.poly.filter((p) => p[1] <= box.h)])
      door = door || h.door
      if (keep) box.holes.splice(box.holes.indexOf(keep), 1)
      keep = h
    }
    if (!keep && box.holes.length >= 6) {
      // The face is mostly holes by now: join the nearest one.
      const b = bounds(poly)
      const cx = (b.minX + b.maxX) / 2
      const cy = (b.minY + b.maxY) / 2
      keep = box.holes.reduce((best, h) => (dist(h.cx, h.cy, cx, cy) < dist(best.cx, best.cy, cx, cy) ? h : best))
      poly = hull([...poly, ...keep.poly.filter((p) => p[1] <= box.h)])
      door = door || keep.door
    }
    if (door) {
      const b = bounds(poly)
      poly = hull([...poly, [b.minX, box.h + 2], [b.maxX, box.h + 2]])
    }
    const grown = keep !== null
    const hole: Hole = keep ?? { id: ++holeIds, poly: [], b: bounds(poly), cx: 0, cy: 0, door, glow: blank, beam: blank, glowFor: null }
    hole.door = door
    if (!keep) box.holes.push(hole)
    shapeHole(box, hole, poly)
    art.renderDay(box)

    const wx = box.x + hole.cx
    const wy = box.y + hole.cy
    sounds.cutOut()
    fx.burst(wx, wy, { count: 9, color: [DAY.kraft, DAY.raw, DAY.kraftD], speed: 150, life: 0.6, size: 5, gravity: 900, shape: 'square', drag: 0.94 })
    // The piece that was cut out drops to the floor, to keep. (A door's piece
    // folds down and stays on as the drawbridge.)
    if (!door && !grown) {
      const pb = bounds(piece)
      const scrap = makeItem('scrap', holeIds, 0, 0)
      const r = rng(hole.id * 91)
      scrap.poly = facet(piece, 27, 2.6, r).map(([x, y]) => [x - (pb.minX + pb.maxX) / 2, y - pb.maxY] as Pt)
      scrap.tone = TONES[box.tone]
      scrap.rest = 0
      scrap.rot = (r() - 0.5) * 0.5
      dropLoose(scrap, box.x + (pb.minX + pb.maxX) / 2 + (r() - 0.5) * 50, box.y + pb.maxY)
      const scraps = items.filter((it) => it.kind === 'scrap' && !it.held)
      if (scraps.length > 7) items.splice(items.indexOf(scraps[0]), 1)
    }
    box.squash.kick(-0.5)
    catVisit(box, hole)
  }

  // ---- the cat ----------------------------------------------------------------------

  const catWorldX = () => (cat.box && (cat.mode === 'window' || cat.mode === 'door') ? cat.box.x + cat.box.ox + cat.lx : cat.x)
  const catWorldY = () => (cat.box && (cat.mode === 'window' || cat.mode === 'door') ? cat.box.y + cat.box.oy + cat.ly : cat.y)

  const catWalkTo = (x: number, then: () => void) => {
    cat.mode = 'walk'
    cat.walkTo = clamp(x, 50, W - 50)
    cat.dir = cat.walkTo >= cat.x ? 1 : -1
    cat.after = then
  }
  const catLeap = (x: number, y: number, shrink: boolean, then: () => void) => {
    cat.mode = 'leap'
    cat.fromX = cat.x
    cat.fromY = cat.y
    cat.toX = x
    cat.toY = y
    cat.t = 0
    cat.shrink = shrink
    cat.dur = clamp(dist(cat.x, cat.y, x, y) / 760, 0.34, 0.62)
    if (Math.abs(x - cat.x) > 4) cat.dir = x > cat.x ? 1 : -1
    cat.after = then
  }
  const headSpot = (box: Box, hole: Hole): Pt => {
    const sill = Math.min(sillAt(hole), box.h)
    const y = clamp(Math.min(hole.cy, sill - 25), hole.b.minY + 20, box.h - 12)
    return [hole.cx, y]
  }
  const catSitDown = () => {
    cat.mode = 'sit'
    cat.box = null
    cat.hole = null
    cat.y = FRONT + 2
    cat.pop.value = 0.9
  }
  const catThink = () => {
    const goal = cat.goal
    if (!goal) {
      catSitDown()
      return
    }
    const { box, hole } = goal
    const wx = box.x + hole.cx
    const floorDoor = hole.door && box.y + box.h >= FLOOR - 2
    const stand = floorDoor ? wx : wx + (cat.x < wx ? -62 : 62)
    catWalkTo(stand, () => {
      if (cat.goal !== goal) {
        catThink()
        return
      }
      const door = hole.door && box.y + box.h >= FLOOR - 2 && !box.held
      if (door) {
        catLeap(box.x + hole.cx, box.y + box.h - 2, true, () => {
          cat.mode = 'door'
          cat.box = box
          cat.hole = hole
          cat.lx = hole.cx
          cat.ly = box.h - 2
          cat.tailDir = box.x + hole.cx < W / 2 ? 1 : -1
          cat.pop.value = 0.8
          cat.goal = cat.goal === goal ? null : cat.goal
          sounds.pat()
          if (cat.goal) catLeave()
        })
        return
      }
      const [hx, hy] = headSpot(box, hole)
      catLeap(box.x + box.ox + hx, box.y + box.oy + hy + 10, true, () => {
        const [lx, ly] = headSpot(box, hole)
        cat.mode = 'window'
        cat.box = box
        cat.hole = hole
        cat.lx = lx
        cat.ly = ly
        cat.sill = clamp(Math.min(sillAt(hole), box.h) - ly, 14, 30)
        cat.pop.value = 0.5
        cat.goal = cat.goal === goal ? null : cat.goal
        sounds.pat()
        if (cat.goal) catLeave()
      })
    })
  }
  // Out of the box and back to the floor in front of it, then on to the goal.
  const catLeave = () => {
    const x = catWorldX()
    const y = catWorldY()
    cat.x = x
    cat.y = y
    cat.box = null
    cat.hole = null
    catLeap(clamp(x + (x < W / 2 ? 46 : -46), 60, W - 60), FRONT + 2, false, () => {
      sounds.pat()
      catThink()
    })
  }
  const catVisit = (box: Box, hole: Hole) => {
    cat.goal = { box, hole }
    cat.earUntil = stage.time + 0.5
    cat.token++
    if (cat.mode === 'sit' || cat.mode === 'walk') catThink()
    else if (cat.mode === 'window' || cat.mode === 'door') {
      // Its own window just got bigger: have a fresh look from where it is.
      if (cat.box === box && cat.hole === hole && cat.mode === 'window') {
        const [lx, ly] = headSpot(box, hole)
        cat.lx = lx
        cat.ly = ly
        cat.sill = clamp(Math.min(sillAt(hole), box.h) - ly, 14, 30)
        cat.pop.value = 0.7
        cat.goal = null
      } else catLeave()
    }
  }
  const catHit = (x: number, y: number): boolean => {
    if (cat.mode === 'window') return dist(x, y, catWorldX(), catWorldY()) < 48
    if (cat.mode === 'door') return dist(x, y, catWorldX() + cat.tailDir * 28, catWorldY() - 6) < 54
    return dist(x, y, cat.x, cat.y - 48) < 64
  }
  const petCat = () => {
    sounds.purr()
    cat.blinkUntil = stage.time + 0.7
    cat.pop.kick(1.6)
    const token = ++cat.token
    stage.after(1.1, () => {
      if (token !== cat.token || cat.mode === 'walk' || cat.mode === 'leap') return
      const all: { box: Box; hole: Hole }[] = []
      for (const b of boxes) for (const h of b.holes) all.push({ box: b, hole: h })
      const at = all.findIndex((e) => e.hole === cat.hole)
      if (all.length > 0 && !(all.length === 1 && at === 0)) {
        cat.goal = all[(at + 1) % all.length]
        sounds.mrrp()
        if (cat.mode === 'sit') catThink()
        else catLeave()
      } else if (cat.mode === 'sit') {
        // Nothing to look into: a stroll to another spot on the rug.
        const spots = [240, 420, 600, 780, 930].filter((s) => Math.abs(s - cat.x) > 120)
        catWalkTo(spots[Math.floor(Math.random() * spots.length)], catSitDown)
      } else {
        cat.goal = null
        catLeave()
      }
    })
  }

  // ---- the blanket --------------------------------------------------------------------

  const skyline = (x: number): number => {
    let y = FLOOR
    for (const b of boxes) if (x >= b.x + b.ox && x <= b.x + b.ox + b.w && b.y + b.oy < y) y = b.y + b.oy
    return y
  }
  // The blanket lies over the tops like a taut cloth and hangs down the sides.
  const drape = (): boolean => {
    const half = 232
    // It travels with the box it was thrown over.
    if (blanket.on) blanket.cx = blanket.on.x + blanket.on.ox + blanket.dx
    const x0 = clamp(blanket.cx - half, BX0 - 30, BX1 + 30 - half * 2)
    const x1 = x0 + half * 2
    const xs: number[] = []
    const ys: number[] = []
    for (let x = x0; x <= x1; x += 8) {
      xs.push(x)
      ys.push(skyline(x))
    }
    let first = -1
    let last = -1
    for (let i = 0; i < xs.length; i++) if (ys[i] < FLOOR - 20) {
      if (first < 0) first = i
      last = i
    }
    if (first < 0) return false
    // Upper hull of the tops between the first and last box under it.
    const top: Pt[] = []
    for (let i = first; i <= last; i++) {
      const p: Pt = [xs[i], ys[i]]
      while (top.length >= 2) {
        const a = top[top.length - 2]
        const b = top[top.length - 1]
        if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0) top.pop()
        else break
      }
      top.push(p)
    }
    const path: Pt[] = []
    const lx = xs[first] - 8
    const rx = xs[last] + 8
    const hangL = Math.min(xs[first] - x0 + 30, skyline(lx - 6) - ys[first] - 34)
    const hangR = Math.min(x1 - xs[last] + 30, skyline(rx + 6) - ys[last] - 34)
    if (hangL > 12) path.push([lx - 4, ys[first] + 18 + hangL])
    path.push([lx, ys[first] + 20])
    top.forEach((p, i) => {
      if (i > 0) {
        // Over a gap the cloth sags a little between its supports.
        const a = top[i - 1]
        const mx = (a[0] + p[0]) / 2
        const my = (a[1] + p[1]) / 2
        const gap = skyline(mx) - my
        if (p[0] - a[0] > 70 && gap > 24) path.push([mx, my + 20 + Math.min(24, gap * 0.5, (p[0] - a[0]) * 0.1)])
      }
      path.push([p[0], p[1] + 20])
    })
    path.push([rx, ys[last] + 20])
    if (hangR > 12) path.push([rx + 4, ys[last] + 18 + hangR])
    blanket.path = path
    return true
  }
  const blanketHit = (x: number, y: number): boolean => {
    if (blanket.mode === 'held') return false
    if (blanket.mode === 'draped') {
      const p = blanket.path
      for (let i = 0; i < p.length - 1; i++) {
        const ax = p[i][0]
        const ay = p[i][1]
        const bx = p[i + 1][0]
        const by = p[i + 1][1]
        const len2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1
        const t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2, 0, 1)
        if (dist(x, y, ax + (bx - ax) * t, ay + (by - ay) * t) < 30) return true
      }
      return false
    }
    return Math.abs(x - blanket.x) < 98 && y > blanket.y - 62 && y < blanket.y + 14
  }

  // ---- fairy lights ----------------------------------------------------------------------

  const pinX = (p: Pin) => p.box.x + p.box.ox + p.lx
  const pinY = (p: Pin) => p.box.y + p.box.oy + p.ly
  const lightsEnd = (): Pt => (pins.length > 0 ? [pinX(pins[pins.length - 1]), pinY(pins[pins.length - 1])] : [NAIL.x, NAIL.y + 40])
  const measureLights = () => {
    let total = 0
    let ax = NAIL.x
    let ay = NAIL.y + 30
    for (const p of pins) {
      total += dist(ax, ay, pinX(p), pinY(p))
      ax = pinX(p)
      ay = pinY(p)
    }
    lightsUsed = total
  }
  const tryPin = (x: number, y: number): boolean => {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i]
      if (b.held) continue
      const m = 24
      if (x < b.x - m || x > b.x + b.w + m || y < b.y - m || y > b.y + b.h + m) continue
      let lx = clamp(x - b.x, 0, b.w)
      let ly = clamp(y - b.y, 0, b.h)
      // Close to an edge it clips onto the edge.
      if (ly < 26) ly = -3
      else if (lx < 24) lx = -2
      else if (b.w - lx < 24) lx = b.w + 2
      const [ex, ey] = lightsEnd()
      const wx = b.x + lx
      const wy = b.y + ly
      const step = dist(ex, ey, wx, wy)
      if (pins.length > 0 && step < 46) return false
      if (lightsUsed + step > LIGHTS_MAX) return false
      pins.push({ box: b, lx, ly })
      measureLights()
      sounds.bulb(pins.length)
      fx.burst(wx, wy, { count: 3, color: BULBS[pins.length % BULBS.length], speed: 60, life: 0.4, size: 4, gravity: 0 })
      return true
    }
    return false
  }

  // ---- tools ----------------------------------------------------------------------------

  const cell = (SHELF.h - 11) / 3
  const shelfCx = SHELF.x + SHELF.w / 2
  const makeTool = (id: ToolId, hx: number, hy: number, hrot: number): Tool => ({ id, hx, hy, hrot, x: hx, y: hy, rot: hrot, tx: hx, ty: hy, trot: hrot, out: 0, open: 0, wig: spring(0, 160, 9) })
  const tools: Tool[] = [
    makeTool('scissors', shelfCx - 2, SHELF.y + cell * 0.5 + 13, -0.1),
    makeTool('tape', shelfCx, SHELF.y + cell * 1.5 + 8, 0),
    makeTool('mk0', shelfCx - 42, FLOOR - 16, -0.12),
    makeTool('mk1', shelfCx, FLOOR - 16, 0),
    makeTool('mk2', shelfCx + 42, FLOOR - 16, 0.12),
  ]
  let hand: Tool | null = null
  // When the tool in the hand drifts back above the shelf after a stroke.
  let toolIdleAt = Infinity
  // And when, left unused, it goes back to its place by itself.
  let toolHomeAt = Infinity

  const pickUp = (tool: Tool) => {
    if (hand === tool) return
    if (hand) putBack()
    hand = tool
    toolHome()
    toolHomeAt = stage.time + 7
    tool.wig.kick(5)
    sounds.pick()
  }
  // In the hand but not in use, a tool waits in the air above the shelf, out
  // of the way of the fort.
  const toolHome = () => {
    if (!hand) return
    hand.tx = shelfCx + (hand.id === 'scissors' ? 62 : hand.id === 'tape' ? -12 : -8)
    hand.ty = hand.id === 'scissors' ? 150 : hand.id === 'tape' ? 138 : 170
    hand.trot = hand.id === 'scissors' ? 0.5 : hand.id === 'tape' ? 0 : 0.5
    toolIdleAt = Infinity
  }
  const putBack = () => {
    if (!hand) return
    hand.tx = hand.hx
    hand.ty = hand.hy
    hand.trot = hand.hrot
    hand = null
    toolHomeAt = Infinity
    sounds.put()
  }
  const shelfTouch = (p: Pointer) => {
    const row = clamp(Math.floor((p.y - SHELF.y) / cell), 0, 2)
    const tool = row === 0 ? tools[0] : row === 1 ? tools[1] : tools[2 + clamp(Math.round((p.x - shelfCx) / 42) + 1, 0, 2)]
    if (hand === tool) putBack()
    else if (hand && row === 2 && hand.id.startsWith('mk') && Math.abs(p.x - hand.hx) < 21) putBack()
    else {
      // A touch takes it in hand; keeping the finger down carries it off.
      pickUp(tool)
      grabs.set(p.id, { kind: 'carry', moved: 0 })
    }
  }
  const toolTo = (x: number, y: number) => {
    if (!hand) return
    hand.tx = x
    hand.ty = y
    toolIdleAt = Infinity
    toolHomeAt = Infinity
  }
  // A stroke is over: wait by the work a moment, then above the shelf, then
  // (if nothing more is done with it) back in its place.
  const toolRest = () => {
    if (!hand) return
    toolIdleAt = stage.time + 1.1
    toolHomeAt = stage.time + (hand.id.startsWith('mk') ? 6 : 3.4)
  }

  // ---- lamp and curtain --------------------------------------------------------------------

  const flick = () => {
    lampOn = !lampOn
    sw.target = lampOn ? 1 : -1
    sounds.clack(lampOn)
    if (!lampOn) sounds.hush()
    const from = dark
    const to = lampOn ? 0 : 1
    stage.tween(lampOn ? 0.7 : 1.5, (t) => (dark = lerp(from, to, t)), ease.inOutQuad)
  }

  const closeCurtain = () => {
    if (bead.busy) return
    bead.busy = true
    const from = bead.y
    sounds.paper(true)
    stage.tween(
      0.5 + (1 - curtainOf()) * 0.6,
      (t) => (bead.y = lerp(from, BEAD_DOWN, t)),
      ease.inOutQuad,
      () => {
        // The day is put away behind the paper. The next one starts there.
        curtainDownNext = true
        stage.restart()
      },
    )
  }
  const openCurtain = () => {
    if (bead.busy) return
    bead.busy = true
    bead.latched = false
    sounds.bead()
    sounds.paper(true)
    stage.tween(1.5, (t) => (bead.y = lerp(BEAD_DOWN, BEAD_UP, t)), ease.inOutCubic, () => (bead.busy = false))
  }

  // ---- touch ---------------------------------------------------------------------------------

  const looseAt = (x: number, y: number): Item | null => {
    // Soft things first; a scrap of card only if nothing else is there.
    for (const scraps of [false, true]) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]
        if (it.inside || it.held || (it.kind === 'scrap') !== scraps) continue
        const r = scraps ? 44 : 58
        if (dist(x, y, itemX(it), itemY(it) + it.oy - itemMid(it)) < r) return it
      }
    }
    return null
  }
  const insideAt = (box: Box, x: number, y: number): Item | null => {
    const lx = x - box.x
    const ly = y - box.y
    if (!box.holes.some((h) => inPoly(lx, ly, h.poly))) return null
    let best: Item | null = null
    let bestD = 130
    for (const it of items) {
      if (it.inside !== box) continue
      const d = dist(lx, ly, it.x, it.y - itemMid(it))
      if (d < bestD) {
        bestD = d
        best = it
      }
    }
    return best
  }

  const grabItem = (p: Pointer, it: Item) => {
    const wx = itemX(it)
    const wy = itemY(it) + it.oy
    it.inside = null
    it.on = null
    it.onBlanket = false
    it.x = wx
    it.y = wy
    it.oy = 0
    it.vy = 0
    it.held = true
    it.squash.value = 1.1
    items.splice(items.indexOf(it), 1)
    items.push(it)
    grabs.set(p.id, { kind: 'item', item: it, dx: wx - p.x, dy: wy - p.y })
    if (it.kind === 'teddy') sounds.teddy()
    else if (it.kind === 'cushion') sounds.cloth()
    else sounds.lift(0.1)
  }

  const releaseItem = (it: Item) => {
    it.held = false
    const cx = it.x
    const cy = it.y - itemMid(it)
    const box = boxAt(cx, cy)
    if (box && box.holes.length > 0 && it.kind !== 'scrap' && !box.held) {
      // In through the nearest opening.
      const lx = cx - box.x
      const ly = cy - box.y
      const hole = box.holes.reduce((best, h) => (dist(h.cx, h.cy, lx, ly) < dist(best.cx, best.cy, lx, ly) ? h : best))
      it.inside = box
      if (it.kind === 'teddy') {
        it.x = clamp(hole.cx, 34, box.w - 34)
        it.y = hole.door ? box.h - 18 : Math.min(box.h - 18, Math.min(sillAt(hole), box.h) + 50)
      } else {
        it.x = clamp(lerp(hole.cx, lx, 0.5), 50, box.w - 50)
        it.y = box.h - 6
      }
      it.squash.value = 0.6
      sounds.cloth()
      return
    }
    // Otherwise it comes down on whatever is under it.
    let restY = Infinity
    let on: Box | null = null
    if (!box) {
      for (const o of boxes) if (!o.held && cx > o.x + 10 && cx < o.x + o.w - 10 && o.y >= it.y - 26 && o.y < restY) {
        restY = o.y
        on = o
      }
    }
    if (on) {
      it.on = on
      it.oy = it.y - on.y
      it.x = cx - on.x
      it.y = 0
      it.vy = 0
    } else dropLoose(it, cx, it.y)
  }

  // A box picked up brings along whatever is stacked on it and on nothing
  // else, so lifting the bottom of a tower lifts the tower.
  const stackOn = (base: readonly Box[]): Box[] => {
    const group = [...base]
    for (let pass = 0; pass < 8; pass++) {
      let grew = false
      const ids = [...new Set(boxes.filter((b) => !b.held && !group.includes(b)).map((b) => b.unit))]
      for (const id of ids) {
        const unit = boxes.filter((b) => b.unit === id)
        if (unit.some((b) => b.held || b.y + b.h >= FLOOR - 1.5)) continue
        const under = boxes.filter((o) => !unit.includes(o) && unit.some((m) => Math.abs(o.y - (m.y + m.h)) < 1.5 && overlapX(m, o) > 6))
        if (under.length > 0 && under.every((o) => group.includes(o))) {
          group.push(...unit)
          grew = true
        }
      }
      if (!grew) break
    }
    return group
  }

  const grabBox = (p: Pointer, box: Box) => {
    const base = boxes.filter((b) => b.unit === box.unit)
    if (base.some((b) => b.held)) return
    const unit = stackOn(base)
    for (const b of unit) {
      b.x += b.ox
      b.y += b.oy
      b.ox = 0
      b.oy = 0
      b.vy = 0
      b.held = true
      b.squash.value = 1.04
      // Bring to the front.
      boxes.splice(boxes.indexOf(b), 1)
      boxes.push(b)
    }
    grabs.set(p.id, { kind: 'box', unit, offs: unit.map((b) => [b.x - p.x, b.y - p.y] as Pt) })
    sounds.lift(box.size)
    everMoved = true
    settle()
  }

  const releaseBox = (unit: Box[]) => {
    const was = unit.map((b) => [b.x, b.y] as Pt)
    for (const b of unit) b.held = false
    placeStack(unit)
    unit.forEach((b, i) => {
      b.ox = was[i][0] - b.x
      b.oy = was[i][1] - b.y
      b.vy = 0
      if (b.oy > -1.5 && b.oy <= 0) b.oy = -1.5
      // Pushed into something, it pops up on top instead of dropping.
      if (b.oy > 0 && i === 0) sounds.thump(b.size, 0.45)
      if (b.oy > 0) knock(b)
    })
    settle()
  }

  const emptyTouch = (p: Pointer) => {
    if (p.x > 236 && p.x < 474 && p.y > 64 && p.y < 290) {
      // A fingertip on the cold glass shakes a few drops loose.
      sounds.glass()
      fx.burst(p.x, p.y, { count: 5, color: '#f4f8fb', speed: 40, angle: Math.PI / 2, spread: 0.9, life: 0.6, size: 3, gravity: 500 })
    } else if (p.y < 600) {
      sounds.knock()
      fx.burst(p.x, p.y, { count: 4, color: [DAY.kraftL, DAY.raw], speed: 70, life: 0.45, size: 4, gravity: 500, shape: 'square' })
    } else {
      sounds.pat()
      fx.burst(p.x, p.y, { count: 3, color: [DAY.raw, DAY.kraftL], speed: 50, life: 0.4, size: 3, gravity: 0 })
    }
  }

  const startTool = (p: Pointer, box: Box) => {
    const tool = hand
    if (!tool) return
    toolTo(p.x, p.y)
    tool.x = p.x
    tool.y = p.y
    if (tool.id !== 'scissors') tool.trot = tool.id === 'tape' ? 0 : 0.6
    const lx = p.x - box.x
    const ly = p.y - box.y
    if (tool.id === 'scissors') {
      grabs.set(p.id, { kind: 'cut', box, pts: [[lx, ly]], acc: 0 })
      tool.open = 1
      sounds.snip()
    } else if (tool.id === 'tape') {
      if (tapeLeft <= 0) {
        sounds.reel()
        grabs.set(p.id, { kind: 'air', acc: 0 })
        return
      }
      grabs.set(p.id, { kind: 'tape', box, sx: lx, sy: ly, acc: 0 })
      sounds.rip(0)
    } else {
      const color = Number(tool.id.slice(2))
      grabs.set(p.id, { kind: 'ink', color, x: p.x, y: p.y, acc: 0 })
      art.inkLine(box, lx, ly, lx + 0.1, ly + 0.1, DAY[MARKERS[color]], 9)
      sounds.squeak()
    }
  }

  const glance = (x: number, y: number) => {
    cat.glanceX = x
    cat.glanceY = y
    cat.glanceUntil = stage.time + 1.6
  }

  const down = (p: Pointer) => {
    lastTouch = stage.time
    if (bead.latched || bead.busy) {
      if (bead.latched && !bead.busy) {
        if (dist(p.x, p.y, BEAD_X, bead.y) < 90) openCurtain()
        else {
          sounds.paper()
          ripple.kick(3)
        }
      }
      return
    }
    glance(p.x, p.y)
    if (dist(p.x, p.y, BEAD_X, bead.y) < 62) {
      grabs.set(p.id, { kind: 'bead', dy: bead.y - p.y })
      bead.swing.kick(2)
      sounds.bead()
      return
    }
    if (Math.abs(p.x - SWITCH.x) < 62 && Math.abs(p.y - SWITCH.y) < 78) {
      flick()
      return
    }
    if (p.x < SHELF.x + SHELF.w + 16 && p.y > SHELF.y - 12 && p.y < FLOOR + 12) {
      shelfTouch(p)
      return
    }
    if (catHit(p.x, p.y)) {
      if (hand) putBack()
      petCat()
      grabs.set(p.id, { kind: 'pet', acc: 0 })
      return
    }
    const loose = looseAt(p.x, p.y)
    if (loose) {
      if (hand) putBack()
      grabItem(p, loose)
      return
    }
    // Fairy lights: the coil on its nail, or the free end of the string.
    const [ex, ey] = lightsEnd()
    if (layingId < 0 && !reeling && (dist(p.x, p.y, NAIL.x, NAIL.y + 40) < 68 || (pins.length > 0 && dist(p.x, p.y, ex, ey) < 44))) {
      if (hand) putBack()
      layingId = p.id
      layX = p.x
      layY = p.y
      grabs.set(p.id, { kind: 'lights', added: 0, moved: 0 })
      sounds.bulb(pins.length)
      return
    }
    if (blanketHit(p.x, p.y)) {
      if (hand) putBack()
      for (const it of items) if (it.onBlanket && !it.held) {
        it.onBlanket = false
        dropLoose(it, it.x, it.y)
      }
      blanket.mode = 'held'
      blanket.x = p.x
      blanket.y = p.y
      grabs.set(p.id, { kind: 'blanket' })
      sounds.cloth(true)
      return
    }
    const box = boxAt(p.x, p.y)
    if (box && hand) {
      startTool(p, box)
      return
    }
    if (box) {
      const inside = insideAt(box, p.x, p.y)
      if (inside) grabItem(p, inside)
      else grabBox(p, box)
      return
    }
    if (hand) {
      // A tool waved in the air: the scissors still snip.
      toolTo(p.x, p.y)
      grabs.set(p.id, { kind: 'air', acc: 0 })
      if (hand.id === 'scissors') {
        hand.open = 1
        sounds.snip()
      } else hand.wig.kick(4)
      return
    }
    emptyTouch(p)
  }

  const move = (p: Pointer) => {
    const grab = grabs.get(p.id)
    if (!grab) return
    lastTouch = stage.time
    const step = Math.hypot(p.dx, p.dy)
    if (grab.kind === 'box') {
      grab.unit.forEach((b, i) => {
        b.x = p.x + grab.offs[i][0]
        b.y = p.y + grab.offs[i][1]
      })
      clampUnit(grab.unit)
      let top = Infinity
      let low = -Infinity
      for (const b of grab.unit) {
        top = Math.min(top, b.y)
        low = Math.max(low, b.y + b.h)
      }
      if (low > FLOOR) shift(grab.unit, 0, FLOOR - low)
      else if (top < 14) shift(grab.unit, 0, 14 - top)
      for (const b of grab.unit) b.tilt = damp(b.tilt, clamp(p.vx / 9000, -0.05, 0.05), 0.5, 1)
    } else if (grab.kind === 'item') {
      const it = grab.item
      it.x = clamp(p.x + grab.dx, 30, W - 30)
      it.y = clamp(p.y + grab.dy, 50, H - 40)
      it.swing.kick(p.dx * 0.05)
    } else if (grab.kind === 'blanket') {
      blanket.x = p.x
      blanket.y = p.y
      blanket.sway.kick(p.dx * 0.02)
    } else if (grab.kind === 'lights') {
      grab.moved += step
      layX = p.x
      layY = p.y
      if (tryPin(p.x, p.y)) grab.added++
    } else if (grab.kind === 'bead') {
      const before = bead.y
      bead.y = clamp(p.y + grab.dy, BEAD_UP, BEAD_DOWN)
      if (Math.floor(bead.y / 46) !== Math.floor(before / 46)) sounds.paper()
    } else if (grab.kind === 'cut') {
      const b = grab.box
      const lx = clamp(p.x - b.x, -20, b.w + 20)
      const ly = clamp(p.y - b.y, -20, b.h + 20)
      const lastPt = grab.pts[grab.pts.length - 1]
      if (dist(lx, ly, lastPt[0], lastPt[1]) > 7) grab.pts.push([lx, ly])
      grab.acc += step
      if (grab.acc > 30) {
        grab.acc = 0
        sounds.snip()
        if (hand) hand.open = 1
        fx.burst(p.x, p.y, { count: 1, color: DAY.raw, speed: 60, life: 0.4, size: 3, gravity: 700, shape: 'square' })
      }
      if (hand && step > 1.5) hand.trot = Math.atan2(p.dy, p.dx)
      toolTo(p.x, p.y)
    } else if (grab.kind === 'ink') {
      const col = DAY[MARKERS[grab.color]]
      const a = boxAt(grab.x, grab.y)
      const b = boxAt(p.x, p.y)
      if (a) art.inkLine(a, grab.x - a.x, grab.y - a.y, p.x - a.x, p.y - a.y, col, 9)
      if (b && b !== a) art.inkLine(b, grab.x - b.x, grab.y - b.y, p.x - b.x, p.y - b.y, col, 9)
      grab.x = p.x
      grab.y = p.y
      grab.acc += step
      if (grab.acc > 46 && (a || b)) {
        grab.acc = 0
        sounds.squeak()
      }
      toolTo(p.x, p.y)
    } else if (grab.kind === 'tape') {
      grab.acc += step
      if (grab.acc > 34) {
        grab.acc = 0
        sounds.rip(clamp(dist(p.x, p.y, grab.box.x + grab.sx, grab.box.y + grab.sy) / 400, 0, 1))
      }
      toolTo(p.x, p.y)
    } else if (grab.kind === 'carry') {
      grab.moved += step
      if (grab.moved > 14) {
        toolTo(p.x, p.y)
        const under = boxAt(p.x, p.y)
        if (under && p.x > SHELF.x + SHELF.w + 16) {
          grabs.delete(p.id)
          startTool(p, under)
        }
      }
    } else if (grab.kind === 'air') {
      grab.acc += step
      toolTo(p.x, p.y)
      if (hand && hand.id === 'scissors' && grab.acc > 40) {
        grab.acc = 0
        hand.open = 1
        sounds.snip()
      }
    } else if (grab.kind === 'pet') {
      grab.acc += step
      if (grab.acc > 90) {
        grab.acc = 0
        cat.blinkUntil = stage.time + 0.6
        cat.pop.kick(0.8)
      }
    }
  }

  const up = (p: Pointer) => {
    const grab = grabs.get(p.id)
    if (!grab) return
    grabs.delete(p.id)
    if (grab.kind === 'cut' || grab.kind === 'ink' || grab.kind === 'tape' || grab.kind === 'air') toolRest()
    else if (grab.kind === 'carry' && grab.moved > 14) toolRest()
    if (grab.kind === 'box') releaseBox(grab.unit)
    else if (grab.kind === 'item') releaseItem(grab.item)
    else if (grab.kind === 'blanket') {
      blanket.cx = blanket.x
      blanket.on = null
      const over = blanket.y < FLOOR - 30 && drape()
      if (over) {
        // Hold on to the highest box under it, nearest its middle.
        let best = Infinity
        for (const b of boxes) {
          const away = Math.max(0, b.x - blanket.cx, blanket.cx - (b.x + b.w))
          if (away > 232) continue
          const score = away * 3 + b.y
          if (score < best) {
            best = score
            blanket.on = b
            blanket.dx = blanket.cx - b.x
          }
        }
        blanket.mode = 'draped'
        blanket.squash.value = 0.8
        sounds.cloth(true)
      } else {
        blanket.mode = 'heap'
        blanket.x = clamp(blanket.x, 110, W - 110)
        blanket.y = FRONT + 6
        blanket.squash.value = 0.7
        sounds.cloth()
      }
    } else if (grab.kind === 'lights') {
      layingId = -1
      // A touch on the coil without pulling anything out winds the string back.
      if (grab.added === 0 && grab.moved < 24 && pins.length > 0 && dist(p.x, p.y, NAIL.x, NAIL.y + 40) < 68) reeling = true
    } else if (grab.kind === 'bead') {
      if (curtainOf() > 0.55) closeCurtain()
      else if (curtainOf() > 0.03) sounds.paper()
    } else if (grab.kind === 'cut') {
      cutHole(grab.box, grab.pts)
      if (hand) hand.open = 0
    } else if (grab.kind === 'tape') {
      const a = grab.box
      const ax = a.x + grab.sx
      const ay = a.y + grab.sy
      let ex = p.x
      let ey = p.y
      const len = dist(ax, ay, ex, ey)
      if (len < 34) {
        // A dab of the roll leaves a short tab.
        const r = rng(strips.length * 13 + 5)
        const ang = (r() - 0.5) * 1.2
        ex = ax + Math.cos(ang) * 58
        ey = ay + Math.sin(ang) * 58
      }
      const b = boxAt(ex, ey) ?? a
      strips.push({ a, ax: grab.sx, ay: grab.sy, b, bx: ex - b.x, by: ey - b.y, seed: strips.length * 7 + 3 })
      tapeLeft--
      sounds.stick()
      if (b !== a && b.unit !== a.unit) {
        // Taped together, they move as one.
        const from = b.unit
        for (const o of boxes) if (o.unit === from) o.unit = a.unit
        a.squash.kick(-0.6)
        b.squash.kick(-0.6)
      }
    }
  }

  // ---- update -----------------------------------------------------------------------------------

  let thumpAt = -1
  let thumps = 0
  const landBox = (b: Box, speed: number) => {
    const k = clamp(speed / 900, 0.3, 1)
    b.squash.value = 1 - 0.07 * k
    // A whole stack set down together is one thump and an echo, not five.
    thumps = stage.time === thumpAt ? thumps + 1 : 0
    thumpAt = stage.time
    if (thumps < 2) sounds.thump(b.size, thumps === 0 ? k : k * 0.5)
    const y = b.y + b.h
    fx.burst(b.x + 6, y, { count: 3, color: [DAY.raw, DAY.kraftL], speed: 80 * k, angle: Math.PI, spread: 1.2, life: 0.45, size: 4, gravity: -40 })
    fx.burst(b.x + b.w - 6, y, { count: 3, color: [DAY.raw, DAY.kraftL], speed: 80 * k, angle: 0, spread: 1.2, life: 0.45, size: 4, gravity: -40 })
    knock(b)
  }
  // Anything sitting where a box came to rest is nudged off onto the floor.
  const knock = (b: Box) => {
    const y = b.y + b.h
    for (const it of items) {
      if (!it.on || it.on === b || it.held) continue
      const wx = itemX(it)
      if (Math.abs(it.on.y - y) < 2 && wx > b.x - 10 && wx < b.x + b.w + 10) dropLoose(it, wx + (wx < b.x + b.w / 2 ? -30 : 30), it.on.y)
    }
  }

  const update = (dt: number) => {
    const t = stage.time
    if (stale.size > 0) freshen()
    sw.update(dt)
    bead.swing.update(dt)
    ripple.update(dt)

    // The curtain's bead goes back up if it was let go before half way.
    if (!bead.latched && !bead.busy) {
      let heldBead = false
      for (const grab of grabs.values()) if (grab.kind === 'bead') heldBead = true
      if (!heldBead && bead.y > BEAD_UP) bead.y = damp(bead.y, BEAD_UP - 1, 7, dt)
      if (bead.y < BEAD_UP) bead.y = BEAD_UP
    }

    for (const b of boxes) {
      if (b.oy < 0) {
        b.vy += 3200 * dt
        b.oy += b.vy * dt
        if (b.oy >= 0) {
          b.oy = 0
          landBox(b, b.vy)
          b.vy = 0
        }
      } else if (b.oy > 0) b.oy = b.oy < 0.5 ? 0 : damp(b.oy, 0, 20, dt)
      if (b.ox !== 0) b.ox = Math.abs(b.ox) < 0.5 ? 0 : damp(b.ox, 0, 22, dt)
      b.squash.update(dt)
      b.lift = damp(b.lift, b.held ? 1 : 0, 14, dt)
      if (!b.held) b.tilt = Math.abs(b.tilt) < 0.001 ? 0 : damp(b.tilt, 0, 12, dt)
    }

    for (const it of items) {
      it.squash.update(dt)
      it.swing.update(dt)
      it.rest = damp(it.rest, it.held ? 0 : 1, it.held ? 14 : 9, dt)
      if (it.held) continue
      if (it.oy < 0) {
        it.vy += 2600 * dt
        it.oy += it.vy * dt
        if (it.oy >= 0) {
          it.oy = 0
          it.squash.value = it.kind === 'scrap' ? 0.9 : 0.78
          if (it.kind === 'scrap') sounds.slap()
          else if (it.kind === 'teddy') sounds.pat()
          else sounds.cloth()
          it.vy = 0
        }
      } else if (it.oy > 0) it.oy = it.oy < 0.5 ? 0 : damp(it.oy, 0, 18, dt)
    }

    blanket.sway.update(dt)
    blanket.squash.update(dt)
    if (blanket.mode === 'draped' && !drape()) {
      blanket.mode = 'heap'
      blanket.x = clamp(blanket.cx, 200, W - 200)
      blanket.y = FRONT + 6
      blanket.squash.value = 0.7
      sounds.cloth()
    }

    if (hand && t > toolHomeAt) putBack()
    else if (hand && t > toolIdleAt) {
      const homeAt = toolHomeAt
      toolHome()
      toolHomeAt = homeAt
    }
    for (const tool of tools) {
      const mine = tool === hand
      tool.out = damp(tool.out, mine ? 1 : 0, 10, dt)
      const follow = mine && toolIdleAt === Infinity && grabs.size > 0 ? 30 : 9
      tool.x = damp(tool.x, tool.tx, follow, dt)
      tool.y = damp(tool.y, tool.ty, follow, dt)
      let dr = tool.trot - tool.rot
      while (dr > Math.PI) dr -= Math.PI * 2
      while (dr < -Math.PI) dr += Math.PI * 2
      tool.rot += dr * (1 - Math.exp(-14 * dt))
      tool.open = damp(tool.open, 0, 12, dt)
      tool.wig.update(dt)
    }

    if (reeling) {
      reelIn -= dt
      if (reelIn <= 0) {
        reelIn = 0.05
        pins.pop()
        measureLights()
        sounds.reel()
        if (pins.length === 0) reeling = false
      }
    }

    // The cat.
    cat.pop.update(dt)
    if (cat.mode === 'walk') {
      cat.x += cat.dir * 250 * dt
      cat.phase += dt * 12
      if ((cat.walkTo - cat.x) * cat.dir <= 0) {
        cat.x = cat.walkTo
        const then = cat.after
        cat.after = null
        cat.mode = 'sit'
        then?.()
      }
    } else if (cat.mode === 'leap') {
      cat.t += dt / cat.dur
      const u = clamp(cat.t, 0, 1)
      const e = ease.inOutQuad(u)
      cat.x = lerp(cat.fromX, cat.toX, e)
      cat.y = lerp(cat.fromY, cat.toY, e) - Math.sin(u * Math.PI) * (40 + Math.abs(cat.toY - cat.fromY) * 0.12)
      if (cat.t >= 1) {
        const then = cat.after
        cat.after = null
        cat.mode = 'sit'
        then?.()
      }
    }
    const cx = catWorldX()
    const cy = catWorldY() - 60
    const looking = t < cat.glanceUntil
    cat.lookX = damp(cat.lookX, looking ? clamp((cat.glanceX - cx) / 260, -1, 1) : 0, 6, dt)
    cat.lookY = damp(cat.lookY, looking ? clamp((cat.glanceY - cy) / 260, -1, 1) : 0, 6, dt)

    // Rain on the glass: sparse by day, a little nearer in the dark.
    rainIn -= dt
    if (rainIn <= 0) {
      rainIn = lerp(0.16, 0.07, dark) + Math.random() * lerp(0.6, 0.3, dark)
      if (curtainOf() < 0.9) sounds.rain(dark)
    }

    // Before anything has been moved, the heap shifts a little now and then.
    if (!everMoved && nudges < 2 && t > nudgeAt && t - lastTouch > 6 && !bead.latched) {
      nudges++
      nudgeAt = t + 14
      const topBox = boxes.reduce((best, b) => (b.y < best.y ? b : best))
      topBox.squash.value = 0.96
      topBox.tilt = 0.025
      sounds.knock()
      glance(topBox.x + topBox.w / 2, topBox.y)
      cat.earUntil = t + 0.4
    }
  }

  // ---- draw ---------------------------------------------------------------------------------------

  const face: CatFace = { lookX: 0, lookY: 0, blink: 0, ear: 0, glow: 0 }
  const rainSeed = rng(seed + 5)
  const streaks = Array.from({ length: 18 }, () => ({ x: rainSeed(), y: rainSeed(), v: 0.5 + rainSeed() * 0.5, len: 14 + rainSeed() * 16 }))
  const beads = Array.from({ length: 6 }, () => ({ x: 0.08 + rainSeed() * 0.84, y: rainSeed(), v: 0.012 + rainSeed() * 0.03, r: 2 + rainSeed() * 1.6 }))

  const drawRain = (g: CanvasRenderingContext2D, t: number, d: number) => {
    const wx = 236
    const wy = 64
    const ww = 238
    const wh = 226
    g.save()
    g.beginPath()
    g.rect(wx, wy, ww, wh)
    g.clip()
    g.strokeStyle = d > 0.5 ? 'rgba(190,210,250,0.4)' : 'rgba(255,255,255,0.62)'
    g.lineWidth = 1.5
    g.beginPath()
    for (const s of streaks) {
      const y = wy + ((s.y + t * s.v * 0.9) % 1) * (wh + 40) - 20
      const x = wx + s.x * ww
      g.moveTo(x, y)
      g.lineTo(x - 3, y + s.len)
    }
    g.stroke()
    // Drops that crawl down the pane.
    g.fillStyle = d > 0.5 ? 'rgba(200,220,255,0.5)' : 'rgba(255,255,255,0.8)'
    g.strokeStyle = d > 0.5 ? 'rgba(200,220,255,0.18)' : 'rgba(255,255,255,0.3)'
    g.lineWidth = 2
    for (const b of beads) {
      const crawl = (b.y + t * b.v + Math.sin(t * 0.7 + b.x * 20) * 0.01) % 1
      const x = wx + b.x * ww + Math.sin(crawl * 9 + b.x * 30) * 3
      const y = wy + crawl * wh
      g.beginPath()
      g.moveTo(x, y - 22)
      g.lineTo(x, y)
      g.stroke()
      g.beginPath()
      g.ellipse(x, y, b.r, b.r * 1.35, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.restore()
  }

  const drawItem = (g: CanvasRenderingContext2D, it: Item, pal: Pal, lx: number, ly: number) => {
    g.save()
    g.translate(lx, ly + it.oy)
    const sq = it.squash.value
    if (it.kind === 'cushion') {
      g.scale(1 + (1 - sq) * 0.5, sq)
      g.rotate(it.held ? clamp(it.swing.value * 0.05, -0.3, 0.3) : (it.variant - 1) * 0.04)
      g.translate(0, -31)
      drawCushion(g, pal, it.variant)
    } else if (it.kind === 'teddy') {
      g.scale(1.14 * (1 + (1 - sq) * 0.4), 1.14 * sq)
      const sway = clamp(it.swing.value * 0.06, -0.7, 0.7)
      g.rotate(it.held ? sway * 0.4 : 0)
      drawTeddy(g, pal, it.held ? sway : 0, it.held ? sway * 0.8 : 0, it.rest)
    } else {
      // A cut-out piece: upright in the hand, flat on its back on the floor.
      const flat = it.rest
      g.rotate(it.rot * flat)
      g.scale(1, lerp(1, 0.4, flat) * sq)
      g.fillStyle = 'rgba(24,14,8,0.22)'
      g.translate(2, 3)
      tracePoly(g, it.poly)
      g.fill()
      g.translate(-2, -3)
      tracePoly(g, it.poly)
      g.fillStyle = pal[it.tone]
      g.fill()
      g.strokeStyle = pal.raw
      g.lineWidth = 3.5
      g.stroke()
      g.strokeStyle = pal.kraftD
      g.lineWidth = 2.4
      g.setLineDash([2, 3.6])
      g.stroke()
      g.setLineDash([])
    }
    g.restore()
  }

  const drawBox = (g: CanvasRenderingContext2D, b: Box, d: number, k: number, tq: number) => {
    const ins = INS[k]
    const out = OUT[k]
    const sq = b.squash.value
    const s = 1 + b.lift * 0.03
    g.save()
    g.translate(b.x + b.ox + b.w / 2, b.y + b.oy + b.h - b.lift * 5)
    if (b.tilt !== 0) g.rotate(b.tilt)
    if (sq !== 1 || s !== 1) g.scale(s * (1 + (1 - sq) * 0.5), s * sq)
    g.translate(-b.w / 2, -b.h)
    if (b.holes.length > 0) {
      // What shows through the openings: the inside of the box and who is in it.
      g.fillStyle = inWall[k]
      g.fillRect(3, 6, b.w - 6, b.h - 8)
      g.fillStyle = inFloor[k]
      g.fillRect(3, b.h - 16, b.w - 6, 14)
      if (d < 0.98) {
        // It is dim in there by day, darkest up under the lid.
        g.fillStyle = `rgba(30,16,6,${(0.22 * (1 - d)).toFixed(3)})`
        g.fillRect(3, 6, b.w - 6, Math.min(46, b.h * 0.3))
        g.fillRect(3, 6, b.w - 6, Math.min(22, b.h * 0.15))
      }
      for (const it of items) if (it.inside === b && it.kind === 'cushion') drawItem(g, it, ins, it.x, it.y)
      for (const it of items) if (it.inside === b && it.kind === 'teddy') drawItem(g, it, ins, it.x, it.y)
      if (cat.box === b) {
        g.save()
        g.translate(cat.lx, cat.ly)
        if (cat.mode === 'window') catBodyBehind(g, out, b.h - cat.ly - 3)
        else if (cat.mode === 'door') catRump(g, out)
        g.restore()
      }
    }
    if (d < 1) g.drawImage(b.day.c, -FACE_PAD, -FACE_PAD, b.day.w, b.day.h)
    if (d > 0) {
      g.globalAlpha = d
      g.drawImage(b.night.c, -FACE_PAD, -FACE_PAD, b.night.w, b.night.h)
      g.globalAlpha = 1
    }
    for (const hole of b.holes) {
      if (hole.door) {
        // The door's own piece, folded down: a drawbridge.
        g.save()
        g.translate(0, b.h)
        g.scale(1, -0.36)
        g.translate(0, -b.h)
        tracePoly(g, hole.poly)
        g.fillStyle = out.raw
        g.fill()
        g.strokeStyle = out.kraftD
        g.lineWidth = 2
        g.stroke()
        if (d > 0.02) {
          g.globalAlpha = d * 0.55
          g.fillStyle = '#ffcf80'
          g.fill()
          g.globalAlpha = 1
        }
        g.restore()
        g.strokeStyle = out.kraftD
        g.lineWidth = 1.6
        g.setLineDash([5, 4])
        g.beginPath()
        g.moveTo(hole.b.minX + 2, b.h)
        g.lineTo(hole.b.maxX - 2, b.h)
        g.stroke()
        g.setLineDash([])
      }
    }
    if (cat.box === b) {
      face.lookX = cat.lookX
      face.lookY = cat.lookY
      face.blink = stage.time < cat.blinkUntil || (tq + 1.3) % 4.4 < 0.15 ? 1 : 0
      face.ear = stage.time < cat.earUntil ? 1 : (tq + 0.4) % 6.3 < 0.2 ? -1 : 0
      face.glow = d
      g.save()
      g.translate(cat.lx, cat.ly)
      if (cat.mode === 'window') {
        const pop = cat.pop.value
        g.scale(pop, pop)
        catInWindow(g, out, face, cat.sill, cat.lookX * 0.12 + Math.sin(tq * 0.9) * 0.03)
      } else if (cat.mode === 'door') catDoorTail(g, out, Math.sin(tq * 1.4), cat.tailDir)
      g.restore()
    }
    // Things set down on top of it ride along.
    for (const it of items) if (it.on === b) drawItem(g, it, out, it.x, it.y)
    g.restore()
  }

  const drawLights = (g: CanvasRenderingContext2D, pal: Pal, t: number, d: number) => {
    const left = 1 - lightsUsed / LIGHTS_MAX
    // The coil on its nail.
    g.strokeStyle = pal.wire
    g.lineWidth = 2.4
    const loops = 1 + Math.round(left * 4)
    for (let i = 0; i < loops; i++) {
      g.beginPath()
      g.ellipse(NAIL.x + (i - loops / 2) * 3, NAIL.y + 38 + i * 2.5, 24 + i * 4, 36 + i * 3, (i - loops / 2) * 0.07, 0, Math.PI * 2)
      g.stroke()
    }
    const coilBulbs = Math.round(left * 9)
    for (let i = 0; i < coilBulbs; i++) {
      const a = 0.5 + i * 0.68
      const rx = 30 + (i % 3) * 7
      const x = NAIL.x + Math.cos(a) * rx
      const y = NAIL.y + 40 + Math.sin(a) * (rx + 12)
      g.fillStyle = BULBS[i % BULBS.length]
      g.globalAlpha = 0.9
      g.beginPath()
      g.ellipse(x, y, 4.4, 5.6, a, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
    const laying = layingId >= 0
    if (pins.length === 0 && !laying) return
    // The string: from the coil, pin to pin, sagging between.
    let ax = NAIL.x - 6
    let ay = NAIL.y + 66
    let n = 0
    const count = pins.length + (laying ? 1 : 0)
    g.strokeStyle = pal.wire
    g.lineWidth = 2.2
    g.beginPath()
    const spots: number[] = []
    for (let i = 0; i < count; i++) {
      const bx = i < pins.length ? pinX(pins[i]) : layX
      const by = i < pins.length ? pinY(pins[i]) : layY
      const len = dist(ax, ay, bx, by)
      const sag = Math.min(i === 0 ? 110 : 54, 6 + len * (i === 0 ? 0.2 : 0.16))
      const mx = (ax + bx) / 2
      const my = (ay + by) / 2 + sag
      g.moveTo(ax, ay)
      g.quadraticCurveTo(mx, my, bx, by)
      const m = Math.max(1, Math.round(len / 38))
      for (let j = 0; j < m; j++) {
        const u = (j + 0.5) / m
        const v = 1 - u
        spots.push(v * v * ax + 2 * v * u * mx + u * u * bx, v * v * ay + 2 * v * u * my + u * u * by)
      }
      ax = bx
      ay = by
    }
    g.stroke()
    const glow = lerp(26, 52, d)
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < spots.length; i += 2) {
      n = i / 2
      g.globalAlpha = (0.42 + d * 0.5) * (0.78 + 0.22 * Math.sin(t * (0.7 + (n % 5) * 0.17) + n * 1.9))
      g.drawImage(art.bulbGlow[n % BULBS.length], spots[i] - glow / 2, spots[i + 1] + 6 - glow / 2, glow, glow)
    }
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    for (let i = 0; i < spots.length; i += 2) {
      n = i / 2
      g.fillStyle = BULBS[n % BULBS.length]
      g.beginPath()
      g.ellipse(spots[i], spots[i + 1] + 6, 4.2, 5.6, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = pal.wire
      g.fillRect(spots[i] - 2, spots[i + 1] - 1, 4, 3.4)
    }
    // A tab of tape at each pin.
    for (const p of pins) tapeStrip(g, pinX(p) - 9, pinY(p) - 2, pinX(p) + 9, pinY(p) + 2, 9, pal.tape, pal.tapeD, 3)
  }

  const drawTool = (g: CanvasRenderingContext2D, tool: Tool, pal: Pal, t: number) => {
    const mine = tool === hand
    const bob = mine ? Math.sin(t * 2.2) * 3 * tool.out : 0
    const s = 1 + tool.out * 0.22
    g.save()
    g.translate(tool.x, tool.y + bob)
    if (tool.id === 'scissors') {
      g.rotate(tool.rot + tool.wig.value * 0.05)
      g.scale(s, s)
      g.translate(-46 * tool.out, 0)
      drawScissors(g, pal, tool.open)
    } else if (tool.id === 'tape') {
      g.rotate(tool.wig.value * 0.06)
      g.scale(s, s)
      g.translate(26 * tool.out, -26 * tool.out)
      drawTapeRoll(g, pal, tapeLeft / TAPE_MAX)
    } else {
      g.rotate(tool.rot + tool.wig.value * 0.05)
      g.scale(s, s)
      drawMarker(g, pal, tool.id, tool.out < 0.5)
    }
    g.restore()
  }

  const drawCurtain = (g: CanvasRenderingContext2D, pal: Pal, t: number) => {
    const c = curtainOf()
    if (c > 0.001) {
      const y = c * (H + 40) - (H + 40) + ripple.value * 4
      g.fillStyle = 'rgba(20,12,6,0.3)'
      g.fillRect(0, y + H + 40, W, 12)
      blit(g, art.curtain, 0, y)
    }
    // The pull: a cord and a painted wooden bead.
    const sway = bead.swing.value * 0.05 + Math.sin(t * 0.8) * 0.012
    const bx = BEAD_X + Math.sin(sway) * bead.y
    const by = bead.y
    g.strokeStyle = pal.cream
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(BEAD_X, 0)
    g.lineTo(bx, by - 22)
    g.stroke()
    g.fillStyle = 'rgba(24,14,8,0.25)'
    g.beginPath()
    g.arc(bx + 3, by + 4, 25, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = pal.dotRed
    g.beginPath()
    g.arc(bx, by, 25, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = pal.scarf
    g.beginPath()
    g.ellipse(bx, by, 25, 9, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = pal.cream
    g.globalAlpha = 0.5
    g.beginPath()
    g.ellipse(bx - 9, by - 11, 7, 4, -0.6, 0, Math.PI * 2)
    g.fill()
    g.globalAlpha = 1
    // The frayed tassel under it.
    g.strokeStyle = pal.cream
    g.lineWidth = 2.4
    g.beginPath()
    for (let i = -2; i <= 2; i++) {
      g.moveTo(bx + i * 2, by + 24)
      g.lineTo(bx + i * 5 + Math.sin(t + i) * 1.5, by + 46)
    }
    g.stroke()
  }

  const draw = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    const curtain = curtainOf()
    if (curtain >= 0.999) {
      // Nothing behind the paper needs drawing.
      drawCurtain(g, OUT[0], t)
      return
    }
    const d = dark
    const k = Math.round(d * STEPS)
    const pal = OUT[k]
    // Characters move on twos, like a stop-motion film.
    const tq = Math.floor(t * 9) / 9

    if (d < 1) blit(g, art.bgDay, 0, 0)
    if (d > 0) {
      g.globalAlpha = d
      blit(g, art.bgNight, 0, 0)
      g.globalAlpha = 1
    }
    drawRain(g, t, d)

    // The switch's rocker.
    {
      const up = sw.value
      g.fillStyle = 'rgba(24,14,8,0.3)'
      g.beginPath()
      g.roundRect(SWITCH.x - 15, SWITCH.y - 27 - up * 9 + 3, 34, 56, 9)
      g.fill()
      g.fillStyle = pal.handle
      g.beginPath()
      g.roundRect(SWITCH.x - 17, SWITCH.y - 28 - up * 9, 34, 56, 9)
      g.fill()
      g.fillStyle = pal.handleD
      g.beginPath()
      g.roundRect(SWITCH.x - 17, SWITCH.y + (up > 0 ? 14 : -28) - up * 9, 34, 14, 7)
      g.fill()
      brad(g, SWITCH.x, SWITCH.y - 50, pal, 3.6)
      brad(g, SWITCH.x, SWITCH.y + 50, pal, 3.6)
      if (d > 0.05) {
        // A small ember so the switch can be found again in the dark.
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = d * (0.75 + Math.sin(t * 1.3) * 0.12)
        g.drawImage(art.warmGlow, SWITCH.x - 26, SWITCH.y - 26, 52, 52)
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      }
    }

    // The shapes of the openings, thrown up the wall and across the ceiling.
    if (d > 0.02) {
      let lx = 0
      let lit = 0
      for (const b of boxes) if (b.holes.length > 0) {
        lx += b.x + b.w / 2
        lit++
      }
      if (lit > 0) {
        lx /= lit
        const ly = FLOOR + 96
        const breath = 0.94 + Math.sin(t * 0.6) * 0.06
        g.save()
        g.beginPath()
        g.rect(SHELF.x + SHELF.w + 4, 12, W, 582)
        g.clip()
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = d * 0.3 * breath
        for (const b of boxes) for (const hole of b.holes) {
          const wx = b.x + b.ox + hole.cx
          const wy = b.y + b.oy + hole.cy
          const gw = hole.beam.width * 1.6
          const gh = hole.beam.height * 1.6
          g.drawImage(hole.beam, lx + (wx - lx) * 1.8 - gw / 2, ly + (wy - ly) * 1.75 - gh / 2, gw, gh)
        }
        g.restore()
      }
    }

    // Each box's shadow on the wall behind it.
    g.fillStyle = `rgba(30,22,14,${(0.2 * (1 - d * 0.6)).toFixed(3)})`
    for (const b of boxes) g.fillRect(b.x + b.ox + 7 + b.lift * 8, b.y + b.oy + 8 + b.lift * 6, b.w, b.h - 6)

    for (const b of boxes) drawBox(g, b, d, k, tq)

    // The warm of the fort on the floor in front of it.
    if (d > 0.02) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = d * 0.3
      for (const b of boxes) if (b.holes.length > 0 && b.y + b.h >= FLOOR - 2) g.drawImage(art.warmGlow, b.x - b.w * 0.2, FLOOR - 26, b.w * 1.4, 96)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }

    for (const s of strips) tapeStrip(g, s.a.x + s.a.ox + s.ax, s.a.y + s.a.oy + s.ay, s.b.x + s.b.ox + s.bx, s.b.y + s.b.oy + s.by, 24, pal.tape, pal.tapeD, s.seed)

    drawLights(g, pal, t, d)

    if (blanket.mode === 'draped') blanketDraped(g, pal, blanket.path)
    else if (blanket.mode !== 'held') {
      g.save()
      g.translate(blanket.x, blanket.y)
      const sq = blanket.squash.value
      g.scale(1 + (1 - sq) * 0.4, sq)
      if (blanket.mode === 'folded') blanketFolded(g, pal)
      else blanketHeap(g, pal)
      g.restore()
    }

    // Tools at rest in the shelf; the pot stands in front of its markers.
    for (const tool of tools) if (tool !== hand && tool.id !== 'scissors' && tool.id !== 'tape') drawTool(g, tool, pal, t)
    g.save()
    g.translate(shelfCx, FLOOR - 12)
    drawPot(g, pal)
    g.restore()
    for (const tool of tools) if (tool !== hand && (tool.id === 'scissors' || tool.id === 'tape')) drawTool(g, tool, pal, t)

    // Loose things on the floor, and the cat when it is out and about.
    for (const it of items) if (!it.inside && !it.on && !it.held && it.kind === 'scrap') drawItem(g, it, pal, it.x, it.y)
    for (const it of items) if (!it.inside && !it.on && !it.held && it.kind !== 'scrap') drawItem(g, it, pal, it.x, it.y)
    if (cat.mode === 'sit' || cat.mode === 'walk' || cat.mode === 'leap') {
      face.lookX = cat.lookX
      face.lookY = cat.lookY
      face.blink = t < cat.blinkUntil || (tq + 1.3) % 4.4 < 0.15 ? 1 : 0
      face.ear = t < cat.earUntil ? 1 : (tq + 0.4) % 6.3 < 0.2 ? -1 : 0
      face.glow = d
      g.save()
      g.translate(cat.x, cat.y)
      if (cat.mode === 'sit') {
        g.fillStyle = 'rgba(24,14,8,0.2)'
        g.beginPath()
        g.ellipse(0, 2, 44, 7, 0, 0, Math.PI * 2)
        g.fill()
        const pop = cat.pop.value
        g.scale(1.12 * (2 - pop), 1.12 * pop)
        catSit(g, pal, face, Math.sin(tq * 1.3), Math.sin(tq * 1.7), cat.x > W / 2 ? -1 : 1)
      } else {
        const u = cat.mode === 'leap' ? clamp(cat.t, 0, 1) : 0
        const stretch = cat.mode === 'leap' ? Math.sin(u * Math.PI) : 0
        const sc = 1.12 * (cat.mode === 'leap' && cat.shrink ? lerp(1, 0.7, u * u) : 1)
        g.scale(cat.dir * sc, sc)
        if (cat.mode === 'leap') g.rotate(clamp(((cat.toY - cat.fromY) / 400) * Math.cos(u * Math.PI), -0.7, 0.7))
        catWalk(g, pal, face, Math.floor(cat.phase * 1.2) / 1.2, stretch)
      }
      g.restore()
    }
    for (const it of items) if (it.held) drawItem(g, it, pal, it.x, it.y)
    if (blanket.mode === 'held') {
      g.save()
      g.translate(blanket.x, blanket.y)
      blanketHeld(g, pal, clamp(blanket.sway.value, -1, 1))
      g.restore()
    }

    // Work in progress under the tool.
    for (const grab of grabs.values()) {
      if (grab.kind === 'cut') {
        const b = grab.box
        g.strokeStyle = pal.raw
        g.lineWidth = 5
        g.beginPath()
        grab.pts.forEach((p, i) => (i === 0 ? g.moveTo(b.x + p[0], b.y + p[1]) : g.lineTo(b.x + p[0], b.y + p[1])))
        g.stroke()
        g.strokeStyle = pal.ink
        g.lineWidth = 2
        g.stroke()
      } else if (grab.kind === 'tape' && hand) {
        tapeStrip(g, grab.box.x + grab.sx, grab.box.y + grab.sy, hand.x, hand.y, 24, pal.tape, pal.tapeD, strips.length * 7 + 3)
      }
    }
    if (hand) drawTool(g, hand, pal, t)

    drawCurtain(g, pal, t)
  }

  return {
    update,
    draw,
    down,
    move,
    up,
    dispose() {
      art.dispose()
      for (const b of boxes) for (const l of [b.day, b.night, b.ink]) {
        l.c.width = 1
        l.c.height = 1
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'box-fort',
    name: 'Box Fort',
    emoji: '📦',
    ages: [3, 7],
    pitch: 'Stack cardboard boxes into a den, cut doors and windows, scribble on it, then turn the light off and see it glow from the holes you cut.',
    howTo: 'Drag boxes to stack them. Touch the scissors, tape or a marker on the shelf, then use it on a box; touch the shelf to put it back. Drag the blanket, cushions, teddy and fairy lights onto the fort. Flick the wall switch. Pull the red bead right down for a new day.',
    basedOn: 'the cardboard-box den on a rainy afternoon; Waldorf open-ended play with plain materials and Montessori practical life with real scissors and tape',
    whyFun: 'Boxes thump down with weight, scissors snip a hole that is exactly your shape, and the cat comes straight to look through it; the light through your own windows is the payoff.',
    set: 'gentle',
  },
  create,
}

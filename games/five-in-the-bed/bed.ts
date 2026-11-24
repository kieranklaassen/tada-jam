import type { Point } from './input'

// The bed: five balls in two hollows with a ridge between them, played in
// fixed steps. Nothing here is random and nothing reads a clock. The bed has
// walls on all four sides, so five go in and five stay.

export type Side = 'left' | 'right'
export const SIDES: readonly Side[] = ['left', 'right']
export const other = (side: Side): Side => (side === 'left' ? 'right' : 'left')

export const WHO = ['tup', 'curl', 'pip', 'nell', 'gus'] as const
export type Who = (typeof WHO)[number]
export const FIVE = WHO.length

/** The mattress, and the ridge's crest. */
export const BED = { left: 212, right: 1112, top: 206, bottom: 690, crest: 662 } as const
export const R = 66
/** How far from the crest the ridge still pushes a sheep away. */
export const SLOPE = 88
export const STEP = 1 / 120
/** A leap: how long it takes and how high it goes, which is well over a sheep. */
export const LEAP_S = 0.8
export const LEAP_HIGH = 170
/** The hand that shoves through a bare mattress. */
export const HAND = 34

const HOLLOW: Record<Side, Point> = {
  left: { x: (BED.left + BED.crest) / 2 - 10, y: (BED.top + BED.bottom) / 2 },
  right: { x: (BED.right + BED.crest) / 2 + 10, y: (BED.top + BED.bottom) / 2 },
}
export const hollow = (side: Side): Point => HOLLOW[side]

export type Sheep = {
  x: number
  y: number
  vx: number
  vy: number
  /** How high it is off the mattress. */
  z: number
  /** On its way over the ridge of its own accord, tumbling over whoever lies between. */
  leap: { from: Point; to: Point; t: number } | null
}

export type Bump = { what: 'sheep' | 'wall' | 'ridge' | 'land'; who: number; with: number; speed: number; at: Point; wall?: Side | 'top' | 'bottom' }

export type Bed = {
  sheep: Sheep[]
  /** The sheep a finger has, and where the finger is. */
  held: { who: number; at: Point; from: Point } | null
  /** An empty hand on the mattress. */
  hand: { at: Point; to: Point } | null
  bumps: Bump[]
  /** Seconds everything has lain still. */
  still: number
}

export const sideOf = (x: number): Side => (x < BED.crest ? 'left' : 'right')
export const sideOfSheep = (bed: Bed, who: number): Side => sideOf(bed.sheep[who].x)
/** Which sheep lie in each half, always five in all. */
export function parting(bed: Bed): Record<Side, number[]> {
  const parts: Record<Side, number[]> = { left: [], right: [] }
  bed.sheep.forEach((s, i) => parts[sideOf(s.x)].push(i))
  return parts
}

/** Places for a half that holds so many, roughly where they roll to by themselves. */
export function makeBed(sides: readonly Side[]): Bed {
  const bed: Bed = { sheep: [], held: null, hand: null, bumps: [], still: 0 }
  const seen: Record<Side, number> = { left: 0, right: 0 }
  const total: Record<Side, number> = { left: sides.filter((s) => s === 'left').length, right: sides.filter((s) => s === 'right').length }
  for (const side of sides) {
    const i = seen[side]++, n = total[side], h = HOLLOW[side]
    const ring = n === 1 ? 0 : n === 2 ? R + 2 : n === 3 ? R * 1.2 : n === 4 ? R * 1.45 : R * 1.75
    const turn = (i / n) * Math.PI * 2 + (n === 2 ? 0 : -Math.PI / 2)
    bed.sheep.push({ x: h.x + Math.cos(turn) * ring, y: h.y + Math.sin(turn) * ring, vx: 0, vy: 0, z: 0, leap: null })
  }
  settle(bed)
  return bed
}

export const copyBed = (bed: Bed): Bed => ({ sheep: bed.sheep.map((s) => ({ ...s, leap: s.leap && { ...s.leap } })), held: null, hand: null, bumps: [], still: 0 })

/** Lies still enough, and in a half, to count as parted. */
const REST_SPEED = 9
const REST_SECONDS = 0.35
export const resting = (bed: Bed): boolean => bed.still >= REST_SECONDS

/** Plays the bed to rest. Whatever is in hand is let go first. */
export function settle(bed: Bed, seconds = 12): void {
  bed.held = null
  bed.hand = null
  for (let i = 0; i < seconds / STEP && !resting(bed); i++) stepBed(bed)
  bed.bumps = []
}

/** Sends one over the ridge by itself, to the roomiest place near the hollow of the other half. */
export function rollOver(bed: Bed, who: number): void {
  const s = bed.sheep[who]
  if (s.leap) return
  s.leap = { from: { x: s.x, y: s.y }, to: roomIn(bed, other(sideOf(s.x)), who), t: 0 }
  bed.still = 0
}

function roomIn(bed: Bed, side: Side, who: number): Point {
  const h = HOLLOW[side]
  let best = h, most = -Infinity
  for (let y = BED.top + R + 4; y <= BED.bottom - R - 4; y += 24) for (let x = h.x - 150; x <= h.x + 150; x += 24) {
    let room = R * 2
    bed.sheep.forEach((s, i) => { if (i !== who) { const at = s.leap?.to ?? s; room = Math.min(room, Math.hypot(at.x - x, at.y - y)) } })
    const worth = room * 3 - Math.hypot(x - h.x, y - h.y)
    if (worth > most) { most = worth; best = { x, y } }
  }
  return best
}

/** A finger takes hold of one. One in the air cannot be held. */
export function grab(bed: Bed, who: number, at: Point): void {
  const s = bed.sheep[who]
  if (s.leap) return
  bed.held = { who, at, from: { x: s.x, y: s.y } }
  bed.still = 0
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const TOP_SPEED = 1500

export function stepBed(bed: Bed): void {
  const dt = STEP
  const { sheep, held } = bed
  for (let i = 0; i < sheep.length; i++) {
    const s = sheep[i]
    const mine = held?.who === i
    if (s.leap) {
      fly(bed, i)
      continue
    }
    if (mine) {
      // On a short elastic to the finger.
      s.vx += ((held!.at.x - s.x) * 420 - s.vx * 34) * dt
      s.vy += ((held!.at.y - s.y) * 420 - s.vy * 34) * dt
    } else {
      const dx = s.x - BED.crest
      const far = Math.abs(dx)
      if (far < SLOPE) {
        // The slope, steepest halfway down and never quite level at the top.
        const way = dx === 0 ? (s.vx < 0 ? -1 : 1) : Math.sign(dx)
        s.vx += way * (260 + 900 * Math.sin((far / SLOPE) * Math.PI)) * dt
      }
      const h = HOLLOW[sideOf(s.x)]
      s.vx += (h.x - s.x) * 5 * dt
      s.vy += (h.y - s.y) * 5 * dt
      const drag = Math.exp(-1.9 * dt)
      s.vx *= drag
      s.vy *= drag
    }
    const speed = Math.hypot(s.vx, s.vy)
    if (speed > TOP_SPEED) {
      s.vx *= TOP_SPEED / speed
      s.vy *= TOP_SPEED / speed
    } else if (!mine && speed > 0) {
      // Pile holds what hardly rolls.
      const slow = Math.max(0, speed - 34 * dt)
      s.vx *= slow / speed
      s.vy *= slow / speed
    }
    const was = s.x
    s.x += s.vx * dt
    s.y += s.vy * dt
    if ((was < BED.crest) !== (s.x < BED.crest)) bed.bumps.push({ what: 'ridge', who: i, with: i, speed: Math.abs(s.vx), at: { x: BED.crest, y: s.y } })
  }
  if (bed.hand) shove(bed)
  for (let pass = 0; pass < 10; pass++) {
    for (let i = 0; i < sheep.length; i++) for (let j = i + 1; j < sheep.length; j++) knock(bed, i, j, pass === 0)
    for (let i = 0; i < sheep.length; i++) wall(bed, i, pass === 0)
  }
  let moving = held !== null || bed.hand !== null
  for (const s of sheep) if (s.leap || Math.hypot(s.vx, s.vy) > REST_SPEED || Math.abs(s.x - BED.crest) < SLOPE * 0.5) moving = true
  bed.still = moving ? 0 : bed.still + dt
}

function fly(bed: Bed, i: number): void {
  const s = bed.sheep[i], leap = s.leap!
  const was = s.x
  leap.t = Math.min(1, leap.t + STEP / LEAP_S)
  const x = leap.from.x + (leap.to.x - leap.from.x) * leap.t, y = leap.from.y + (leap.to.y - leap.from.y) * leap.t
  s.vx = (x - s.x) / STEP
  s.vy = (y - s.y) / STEP
  s.x = x
  s.y = y
  s.z = LEAP_HIGH * 4 * leap.t * (1 - leap.t)
  if ((was < BED.crest) !== (s.x < BED.crest)) bed.bumps.push({ what: 'ridge', who: i, with: i, speed: Math.abs(s.vx), at: { x: BED.crest, y: s.y } })
  if (leap.t < 1) return
  s.leap = null
  s.z = 0
  s.vx *= 0.22
  s.vy *= 0.22
  bed.bumps.push({ what: 'land', who: i, with: i, speed: 400, at: { x: s.x, y: s.y } })
}

function knock(bed: Bed, i: number, j: number, first: boolean): void {
  const a = bed.sheep[i], b = bed.sheep[j]
  let dx = b.x - a.x, dy = b.y - a.y
  let d = Math.hypot(dx, dy)
  // One that is up in the air is over another by its height: balls touch when their middles are two radii apart.
  const dz = a.z - b.z
  const reach = Math.sqrt(Math.max(0, R * R * 4 - dz * dz))
  if (d >= reach) return
  if (d < 1e-6) { dx = 1; dy = 0; d = 1 }
  const nx = dx / d, ny = dy / d
  const over = reach - d
  const heldA = bed.held?.who === i, heldB = bed.held?.who === j
  const shareA = a.leap && b.leap ? 0.5 : a.leap ? 0 : b.leap ? 1 : heldA ? 0.2 : heldB ? 0.8 : 0.5
  a.x -= nx * over * shareA
  a.y -= ny * over * shareA
  b.x += nx * over * (1 - shareA)
  b.y += ny * over * (1 - shareA)
  const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
  if (closing <= 0) return
  if (a.leap || b.leap) return
  const push = closing * (closing > 60 ? 0.86 : 0.5)
  a.vx -= nx * push * (heldA ? 0.3 : 1)
  a.vy -= ny * push * (heldA ? 0.3 : 1)
  b.vx += nx * push * (heldB ? 0.3 : 1)
  b.vy += ny * push * (heldB ? 0.3 : 1)
  if (first && closing > 45) {
    const hitter = Math.hypot(a.vx, a.vy) < Math.hypot(b.vx, b.vy) ? i : j
    bed.bumps.push({ what: 'sheep', who: hitter === i ? j : i, with: hitter, speed: closing, at: { x: a.x + nx * R, y: a.y + ny * R } })
  }
}

function wall(bed: Bed, i: number, first: boolean): void {
  const s = bed.sheep[i]
  if (s.leap) return
  const x = clamp(s.x, BED.left + R, BED.right - R), y = clamp(s.y, BED.top + R, BED.bottom - R)
  if (x !== s.x) {
    const out = s.x < x ? s.vx < 0 : s.vx > 0
    if (first && out && Math.abs(s.vx) > 60) bed.bumps.push({ what: 'wall', who: i, with: i, speed: Math.abs(s.vx), at: { x: s.x < x ? BED.left : BED.right, y: s.y }, wall: s.x < x ? 'left' : 'right' })
    if (out) s.vx *= -0.55
    s.x = x
  }
  if (y !== s.y) {
    const out = s.y < y ? s.vy < 0 : s.vy > 0
    if (first && out && Math.abs(s.vy) > 60) bed.bumps.push({ what: 'wall', who: i, with: i, speed: Math.abs(s.vy), at: { x: s.x, y: s.y < y ? BED.top : BED.bottom }, wall: s.y < y ? 'top' : 'bottom' })
    if (out) s.vy *= -0.55
    s.y = y
  }
}

/** The empty hand follows the finger at a hand's pace, so it never jumps through a sheep. */
function shove(bed: Bed): void {
  const hand = bed.hand!
  const dx = hand.to.x - hand.at.x, dy = hand.to.y - hand.at.y, d = Math.hypot(dx, dy)
  const reach = Math.min(d, 1600 * STEP)
  const vx = d > 0 ? (dx / d) * (reach / STEP) : 0, vy = d > 0 ? (dy / d) * (reach / STEP) : 0
  if (d > 0) {
    hand.at = { x: hand.at.x + (dx / d) * reach, y: hand.at.y + (dy / d) * reach }
  }
  for (const s of bed.sheep) {
    if (s.leap) continue
    let nx = s.x - hand.at.x, ny = s.y - hand.at.y
    const gap = Math.hypot(nx, ny)
    if (gap >= R + HAND) continue
    if (gap < 1e-6) { nx = 0; ny = -1 } else { nx /= gap; ny /= gap }
    // Eased out of the way rather than thrown, the hand may lie deep in one when it lands.
    const out = Math.min(R + HAND - gap, 10)
    s.x += nx * out
    s.y += ny * out
    const toward = vx * nx + vy * ny - (s.vx * nx + s.vy * ny)
    if (toward > 0) { s.vx += nx * toward; s.vy += ny * toward }
  }
}

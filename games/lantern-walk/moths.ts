import { HOOK, MOTHS, MOTH_TRUNK, OPEN_MOTH_BOX, PLACES, STAGE_H, STAGE_W, SURFACES, WIRE, box, homeBox, perch, type Box } from './layout'
import { below } from './rng'
import { notice } from './seen'
import type { Patch, Wood } from './wood'

// The moths. Their rule is yellow: they leave the bark one after another and
// settle along the edge of the yellow patch, so they draw its shape and ride
// with it. Every other light is a wrong use, and it works:
//   red      they circle it nose to tail and will not go in; the last one bumps the lantern
//   blue     they take it for the moon, fold their wings and drop asleep
//   a rush   they are tumbled head over tail and sort themselves out
//   unlit    they land on the cold lantern until it sags
//   plain    they walk down the bark in a line, look in and walk back up

export type Moth = {
  x: number; y: number
  mode: 'bark' | 'out' | 'on' | 'back' | 'orbit' | 'bump' | 'fall' | 'asleep' | 'tumble' | 'toCold' | 'cold' | 'walk' | 'walkBack'
  /** Seconds until this moth takes its turn. */
  wait: number
  /** Its own count, so no two beat together. */
  beat: number
  /** Which way it leans as it flies. */
  swerve: number
  /** How far it has turned head over tail, in turns of a circle. */
  spin: number
  /** Wings folded, 0 to 1. */
  fold: number
  /** How large it is, of the size the moths are drawn at. */
  size: number
}

export type Moths = {
  list: Moth[]
  act: 'bark' | 'yellow' | 'red' | 'blue' | 'tumble' | 'cold' | 'file' | 'home'
  /** They are with the yellow patch, or on their way to it: what the save keeps. */
  riding: boolean
  /** Seconds the act has run. */
  t: number
  /** Seconds since what set the act off was last there. */
  gone: number
  /** Where round the red patch the ring of moths has got to, in turns. */
  lap: number
  /** The last moth has bumped the lantern this time round. */
  bumped: boolean
  /** 1 as the sleepers breathe in together, falling to 0. */
  snore: number
  /** How far the line leans in to look, 0 to 1. */
  peer: number
  /** Seconds before they answer anything again. */
  rest: number
  /** Which way the rush went, for the tumble. */
  push: number
  /** Where each moth sits on the yellow patch now, x, y, x, y. */
  seats: Float32Array
  /** How far the patch's outline is grown for them to sit along it, as a factor: 0 before they have sat. */
  grow: number
  /** 1 as they see a light they are not answering: every wing flicks, falling to 0. */
  glance: number
  glanceWait: number
  saw: boolean
}

/** Where moth `i` sits on a cold lantern, from its middle: along the rim to either side of the wick and round the wire's top, wings half shut, never on the paper or over the candle. */
export const COLD_SEATS: readonly (readonly [number, number])[] = [[-33, -86], [33, -86], [-66, -86], [66, -86], [-17, -150], [17, -150], [-51, -150], [51, -150]]
/** How far a moth on a cold lantern shuts its wings. */
export const COLD_FOLD = 0.5

/**
 * Where moth `i` sleeps, and how it leans: in two loose heaps at the foot of its tree, three to the left of the
 * trunk and five before it, clear of the fox, the stump and the step. Some lean on their neighbour with a wing
 * across it. The gaps, the heights, the leans and the sizes do not go turn and turn about, so the row is no fence
 * and no tally of pairs (layout.test.ts holds it).
 */
const BEDS: readonly (readonly [number, number, number])[] = [[812, 552, 0.14], [826, 547, 0.24], [853, 543, -0.06], [915, 556, -0.14], [931, 549, 0.26], [955, 557, 0.08], [986, 553, 0.3], [1012, 545, -0.16]]
/** How large each moth is, of the size the moths are drawn at. */
export const MOTH_SIZES: readonly number[] = [1, 0.84, 0.9, 1, 0.74, 0.96, 0.82, 1]
export function bed(i: number): { x: number; y: number } {
  return { x: BEDS[i][0], y: BEDS[i][1] }
}
/** How far sleeper `i` leans, in radians: to the right when positive. */
export const bedTilt = (i: number): number => BEDS[i][2]

export function freshMoths(w: Wood, riding: boolean): Moths {
  const list: Moth[] = []
  for (let i = 0; i < MOTHS; i++) {
    const at = perch(i)
    list.push({ x: at.x, y: at.y, mode: 'bark', wait: 0, beat: w.rng.next() * 10, swerve: below(w.rng, 2) === 0 ? -1 : 1, spin: 0, fold: 0, size: MOTH_SIZES[i] })
  }
  const moths: Moths = { list, act: 'bark', riding: false, t: 0, gone: 0, lap: 0, bumped: false, snore: 0, peer: 0, rest: 0, push: 1, seats: new Float32Array(MOTHS * 2), grow: 0, glance: 0, glanceWait: 0, saw: false }
  // Found as left: moths that rode with the yellow sit on it, and none is in the air.
  const yellow = w.patchOf('yellow')
  if (riding && yellow) {
    moths.act = 'yellow'
    moths.riding = true
    sit(w, moths, yellow)
    list.forEach((moth, i) => {
      moth.mode = 'on'
      moth.x = moths.seats[i * 2]; moth.y = moths.seats[i * 2 + 1]
    })
  }
  return moths
}

/** How far apart two moths with open wings must sit for neither to lie on the other, whichever way the patch is turned. */
export const SEAT_APART = Math.ceil(Math.hypot(OPEN_MOTH_BOX.right - OPEN_MOTH_BOX.left, OPEN_MOTH_BOX.bottom - OPEN_MOTH_BOX.top))

/** How many places round the outline are looked at for a seat. */
const ROUND = 96
type Ring = { cum: Float32Array; total: number }
const rings = new WeakMap<Patch, Ring>()
const spot = { x: 0, y: 0 }
const ringX = new Float32Array(ROUND), ringY = new Float32Array(ROUND), ringFree = new Uint8Array(ROUND)

/** The outline of a patch measured round, once. */
function ringOf(patch: Patch): Ring {
  const known = rings.get(patch)
  if (known) return known
  const local = patch.local, n = local.length / 2
  const cum = new Float32Array(n + 1)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    cum[i + 1] = cum[i] + Math.hypot(local[j * 2] - local[i * 2], local[j * 2 + 1] - local[i * 2 + 1])
  }
  const ring: Ring = { cum, total: cum[n] || 1 }
  rings.set(patch, ring)
  return ring
}

/** The point a fraction `f` of the way round a patch's own outline, grown by `k` about its middle, as it lies unturned. */
function round(patch: Patch, ring: Ring, f: number, k: number, out: { x: number; y: number }): void {
  const local = patch.local, n = local.length / 2
  const want = ((f % 1) + 1) % 1 * ring.total
  let i = 0
  while (i < n - 1 && ring.cum[i + 1] <= want) i++
  const j = (i + 1) % n, span = ring.cum[i + 1] - ring.cum[i] || 1, part = (want - ring.cum[i]) / span
  out.x = (local[i * 2] + (local[j * 2] - local[i * 2]) * part) * k
  out.y = (local[i * 2 + 1] + (local[j * 2 + 1] - local[i * 2 + 1]) * part) * k
}

const keep: Box[] = []
const inBox = (b: Box, x: number, y: number) => x > b.left && x < b.right && y > b.top && y < b.bottom
const grown = (b: Box): Box => box(b.left - OPEN_MOTH_BOX.right, b.top - OPEN_MOTH_BOX.bottom, b.right - OPEN_MOTH_BOX.left, b.bottom - OPEN_MOTH_BOX.top)
/** Where the middle of a moth with open wings may be for all of it to be inside the frame, at either surface size. */
export const SEAT_FRAME = box(-OPEN_MOTH_BOX.left, -OPEN_MOTH_BOX.top, STAGE_W - OPEN_MOTH_BOX.right, STAGE_H - OPEN_MOTH_BOX.bottom)
const HOME_BOXES = SURFACES.map((surface) => grown(homeBox(surface.width, surface.height)))

/** The lantern as nothing may sit on it: its wire, its handle, its flame and its paper, hung or held. */
export function lanternBox(w: Wood): Box {
  return w.hung ? box(HOOK.x - 50, HOOK.y - 30, HOOK.x + 50, HOOK.y + WIRE + 62) : box(w.lantern.x - 50, w.lantern.y - WIRE, w.lantern.x + 50, w.lantern.y + 62)
}

/**
 * What a moth on the yellow light keeps off: the lantern it rides with, and the home control. The patch is in the
 * child's hand and goes where it is carried, so the ring goes over whatever the patch goes over.
 */
function keepOff(w: Wood): Box[] {
  keep.length = 0
  keep.push(grown(lanternBox(w)))
  for (const home of HOME_BOXES) keep.push(home)
  return keep
}

const ringLong = new Float32Array(ROUND)

/**
 * Lays the eight seats out along the outline grown by `k`, as it lies now. Where the outline runs off the frame
 * the seats go along the frame's edge instead, which is the edge of the patch as it is seen; where it runs over
 * the lantern or under the home control there is no seat, and the eight share the rest evenly. True when the
 * rest is long enough and no seat is nearer another than leaves both moths their wings.
 */
function layOut(w: Wood, patch: Patch, ring: Ring, k: number, off: readonly Box[], seats: Float32Array): boolean {
  const cos = Math.cos(patch.turn), sin = Math.sin(patch.turn)
  for (let j = 0; j < ROUND; j++) {
    round(patch, ring, j / ROUND, k, spot)
    const x = Math.min(SEAT_FRAME.right, Math.max(SEAT_FRAME.left, patch.x + spot.x * cos - spot.y * sin))
    const y = Math.min(SEAT_FRAME.bottom, Math.max(SEAT_FRAME.top, patch.y + spot.x * sin + spot.y * cos))
    ringX[j] = x; ringY[j] = y
    let ok = 1
    for (let b = 0; ok && b < off.length; b++) if (inBox(off[b], x, y)) ok = 0
    ringFree[j] = ok
  }
  // The stretch from each place to the next is free when both its ends are.
  let free = 0
  for (let j = 0; j < ROUND; j++) {
    const n = (j + 1) % ROUND
    ringLong[j] = ringFree[j] && ringFree[n] ? Math.hypot(ringX[n] - ringX[j], ringY[n] - ringY[j]) : 0
    free += ringLong[j]
  }
  if (free < MOTHS * SEAT_APART) return false
  // Seat i sits in the middle of the i-th eighth of the free edge, counted round from the place nearest the
  // lantern: that is where the edge is broken, if it is, so no seat ever has to cross the break.
  let first = 0, nearest = Infinity
  for (let j = 0; j < ROUND; j++) {
    const far = (ringX[j] - w.lantern.x) ** 2 + (ringY[j] - w.lantern.y) ** 2
    if (far < nearest) { nearest = far; first = j }
  }
  let seen = 0, next = 0
  for (let step = 0; step < ROUND && next < MOTHS; step++) {
    const j = (first + step) % ROUND
    const long = ringLong[j]
    if (long <= 0) continue
    for (;;) {
      const want = ((next + 0.5) * free) / MOTHS
      if (next >= MOTHS || want > seen + long) break
      const part = (want - seen) / long, n = (j + 1) % ROUND
      seats[next * 2] = ringX[j] + (ringX[n] - ringX[j]) * part; seats[next * 2 + 1] = ringY[j] + (ringY[n] - ringY[j]) * part
      next++
    }
    seen += long
  }
  if (next < MOTHS) return false
  for (let a = 0; a < MOTHS; a++) for (let b = a + 1; b < MOTHS; b++) if (Math.hypot(seats[a * 2] - seats[b * 2], seats[a * 2 + 1] - seats[b * 2 + 1]) < SEAT_APART) return false
  return true
}

/**
 * Seats the eight moths along the edge of the yellow patch as it lies now, so they draw its shape: the ring is
 * the window's own outline, and a long window gives a long ring. Where the outline is too short for eight moths
 * with their wings open, or too much of it runs over the lantern or off the frame, it is grown about its middle by
 * the least that gives them room; it comes in again as room returns, a little each step, so no seat hops.
 */
export function sit(w: Wood, moths: Moths, patch: Patch): void {
  const ring = ringOf(patch), off = keepOff(w), seats = moths.seats
  // As it was, or further out until there is room.
  let k = moths.grow || 1
  for (let tries = 0; tries < 60 && !layOut(w, patch, ring, k, off, seats); tries++) k *= 1.06
  // And a little nearer in, where that moves no seat by more than a wing's breadth: so the ring never hunts.
  if (k > 1) {
    const nearer = Math.max(1, k - 0.004)
    if (layOut(w, patch, ring, nearer, off, trial)) {
      let moved = 0
      for (let i = 0; i < seats.length; i++) moved = Math.max(moved, Math.abs(trial[i] - seats[i]))
      if (moved < 6) { seats.set(trial); k = nearer }
    }
  }
  moths.grow = k
}

const trial = new Float32Array(MOTHS * 2)
const goal = { x: 0, y: 0 }

/** Flies a moth towards a point, weaving. True when it has landed. */
function fly(moth: Moth, x: number, y: number, dt: number, speed = 330): boolean {
  const dx = x - moth.x, dy = y - moth.y
  const far = Math.hypot(dx, dy)
  const pace = speed * dt
  if (far <= pace + 4) {
    moth.x = x; moth.y = y
    return true
  }
  const weave = Math.sin(moth.beat * 9) * Math.min(1, far / 120) * 0.9 * moth.swerve
  const ux = dx / far, uy = dy / far
  moth.x += (ux - uy * weave) * pace
  moth.y += (uy + ux * weave) * pace
  return false
}

/** How near its body a moth is touched by a light: small.ts shows it whole and in full at the same distance. */
export const MOTH_REACH = 24
/** The middle of the bark the moths sit on, top and bottom. */
const BARK = { x: (MOTH_TRUNK.left + MOTH_TRUNK.right) / 2, top: 150, bottom: 540 }
/** How far a patch's middle is from the moths' bark. */
const fromBark = (patch: Patch) => Math.hypot(patch.x - BARK.x, patch.y - Math.max(BARK.top, Math.min(BARK.bottom, patch.y)))

/**
 * What the moths on their bark would answer now. Lit means answered: the light on them is the topmost patch that
 * touches any moth on the bark as it is drawn, and a rush is a patch passing over one of them, or within the
 * width every creature's rush is given, faster than `RUSH`.
 */
function stimulus(w: Wood): Moths['act'] {
  const tree = PLACES.mothTree
  if (w.darkNear(tree.x, tree.y, 250)) return 'cold'
  if (!w.shines) return 'bark'
  let top = -1
  for (const moth of w.moths.list) {
    if (moth.mode !== 'bark') continue
    if (w.rushAt(moth.x, moth.y, MOTH_REACH)) return 'tumble'
    const patch = w.touching(moth.x, moth.y, MOTH_REACH)
    if (patch) top = Math.max(top, w.patches.indexOf(patch))
  }
  if (top < 0) return 'bark'
  return w.patches[top].paper ?? 'file'
}

/** Sets the moths off on an act: the ending sends them to the yellow glow with this. */
export function beginMoths(w: Wood, act: Moths['act']): void {
  const moths = w.moths
  moths.act = act
  moths.t = 0
  moths.gone = 0
  moths.bumped = false
  moths.riding = act === 'yellow'
  moths.lap = 0
  moths.grow = 0
  // They go one after another, never as a flock.
  moths.list.forEach((moth, i) => { moth.wait = 0.12 + i * (act === 'blue' ? 0.2 : 0.17) })
  if (act === 'tumble') {
    moths.push = w.grip.vx >= 0 ? 1 : -1
    w.sound('tumble')
    for (const moth of moths.list) if (moth.mode === 'bark') { moth.mode = 'tumble'; moth.spin = 0 }
  }
}

export function stepMoths(w: Wood, dt: number): void {
  const moths = w.moths
  moths.t += dt
  moths.rest = Math.max(0, moths.rest - dt)
  moths.snore = Math.max(0, moths.snore - dt * 0.9)
  for (const moth of moths.list) moth.beat += dt
  const now = moths.act === 'bark' || moths.act === 'home' ? stimulus(w) : 'bark'
  // Touched while they rest between two answers, they still show it: every wing flicks.
  notice(moths, now !== 'bark' && now !== 'cold', !(moths.act === 'bark' && moths.rest > 0), dt)
  if (moths.act === 'bark' && now !== 'bark' && moths.rest <= 0) beginMoths(w, now)

  switch (moths.act) {
    case 'yellow': {
      const yellow = w.patchOf('yellow')
      if (!yellow) { home(w); break }
      sit(w, moths, yellow)
      moths.list.forEach((moth, i) => {
        goal.x = moths.seats[i * 2]; goal.y = moths.seats[i * 2 + 1]
        if (moth.mode === 'bark' || moth.mode === 'back') {
          moth.wait -= dt
          if (moth.wait > 0) return
          moth.mode = 'out'
        }
        if (moth.mode === 'on') {
          // It rides with the patch as fast as it can hold on, and is shaken off by a light that runs.
          const far = Math.hypot(goal.x - moth.x, goal.y - moth.y)
          if (far > 40) moth.mode = 'out'
          else if (far > 0) {
            const by = Math.min(1, (380 * dt) / far)
            moth.x += (goal.x - moth.x) * by
            moth.y += (goal.y - moth.y) * by
          }
        }
        if (moth.mode === 'out' && fly(moth, goal.x, goal.y, dt)) {
          moth.mode = 'on'
          w.sound('patter', i / (MOTHS - 1))
          w.meet('moths')
        }
      })
      break
    }
    case 'red': {
      const red = w.patchOf('red')
      if (!red || w.hung || fromBark(red) > 330) { home(w); break }
      // The ring whirrs as each lap begins: the first with the first moth that leaves the bark to circle, never after a silent lap.
      const before = moths.lap
      const circling = moths.list.some((moth) => moth.mode === 'orbit' || moth.mode === 'bump')
      if (circling) moths.lap += dt * 0.42
      if (circling && Math.floor(before) !== Math.floor(moths.lap)) w.sound('whirr')
      const r = Math.max(red.rx, red.ry) + 36
      moths.list.forEach((moth, i) => {
        if (moth.mode === 'bark') {
          moth.wait -= dt
          if (moth.wait > 0) return
          moth.mode = 'orbit'
          if (!circling && i === 0) w.sound('whirr')
        }
        const angle = (moths.lap + i / MOTHS) * Math.PI * 2
        goal.x = red.x + Math.cos(angle) * r; goal.y = red.y + Math.sin(angle) * r * 0.86
        if (moth.mode === 'bump') {
          // The last one goes for the glass instead, bounces off and joins the ring again.
          if (fly(moth, w.lantern.x + (moth.x < w.lantern.x ? -52 : 52), w.lantern.y - 8, dt, 420)) {
            moth.mode = 'orbit'
            moth.spin += 1
            w.bump(moth.x < w.lantern.x ? 1.3 : -1.3)
            w.sound('tink')
          }
          return
        }
        if (i === MOTHS - 1 && !moths.bumped && moths.t > 2.4 && moth.mode === 'orbit') {
          moths.bumped = true
          moth.mode = 'bump'
          return
        }
        fly(moth, goal.x, goal.y, dt, 300)
        moth.spin = Math.max(Math.floor(moth.spin), moth.spin - dt * 2)
      })
      break
    }
    case 'blue': {
      const still = w.patchOf('blue')
      moths.gone = still && !w.hung && fromBark(still) < 240 ? 0 : moths.gone + dt
      if (moths.gone > 2.5) { home(w); break }
      let asleep = 0
      moths.list.forEach((moth, i) => {
        if (moth.mode === 'bark') {
          moth.wait -= dt
          if (moth.wait > 0) return
          moth.mode = 'fall'
          w.sound('pff', i / (MOTHS - 1))
        }
        if (moth.mode === 'fall') {
          moth.fold = Math.min(1, moth.fold + dt * 5)
          // Like a leaf: slowly, side to side.
          const to = bed(i)
          moth.y = Math.min(to.y, moth.y + 150 * dt)
          moth.x += ((to.x - moth.x) * 1.6 + Math.cos(moth.beat * 5) * 60) * dt
          if (moth.y >= to.y) { moth.mode = 'asleep'; moth.x = to.x }
        }
        if (moth.mode === 'asleep') asleep++
      })
      if (asleep > 0 && moths.snore <= 0) {
        moths.snore = 1
        w.sound('mothSnore', asleep / MOTHS)
      }
      break
    }
    case 'tumble': {
      const along = Math.sin(Math.min(1, moths.t / 1.3) * Math.PI)
      moths.list.forEach((moth, i) => {
        if (moth.mode !== 'tumble') return
        const at = perch(i)
        moth.spin = Math.min(2, moths.t * 2.4)
        moth.x = at.x + moths.push * along * (46 + (i % 3) * 16)
        moth.y = at.y - along * (10 + (i % 2) * 14)
        if (moths.t >= 1.3) { moth.mode = 'bark'; moth.spin = 0; moth.x = at.x; moth.y = at.y }
      })
      if (moths.t >= 1.3) { moths.act = 'bark'; moths.rest = 0.8 }
      break
    }
    case 'cold': {
      if (w.gives || w.hung) { home(w); break }
      let landed = 0
      const cos = Math.cos(-w.swing), sin = Math.sin(-w.swing)
      moths.list.forEach((moth, i) => {
        const [sx, sy] = COLD_SEATS[i]
        goal.x = w.lantern.x + sx * cos - sy * sin; goal.y = w.lantern.y + sx * sin + sy * cos
        if (moth.mode === 'bark') {
          moth.wait -= dt
          if (moth.wait > 0) return
          moth.mode = 'toCold'
        }
        if (moth.mode === 'cold') {
          const far = Math.hypot(goal.x - moth.x, goal.y - moth.y)
          if (far > 46) moth.mode = 'toCold'
          else { moth.x = goal.x; moth.y = goal.y; moth.fold = Math.min(COLD_FOLD, moth.fold + dt * 3); landed++ }
        }
        if (moth.mode === 'toCold' && fly(moth, goal.x, goal.y, dt)) {
          moth.mode = 'cold'
          landed++
          w.sound('rustle', i / (MOTHS - 1))
        }
      })
      const sag = landed / MOTHS
      // Past half of them, the wire creaks and the lantern hangs low.
      if (w.sag < 0.5 && sag >= 0.5) w.sound('sag')
      w.sag = sag
      break
    }
    case 'file': {
      let patch: Patch | null = null
      if (w.shines) for (const plain of w.patches) if (plain.paper === null && fromBark(plain) < 260) patch = plain
      if (patch && moths.t < 9) moths.gone = 0
      else moths.gone += dt
      const edge = patch ? patch.y - patch.ry : 300
      let backHome = 0
      const looking = moths.t > 2.6 && moths.t < 3.9
      moths.peer = Math.max(0, Math.min(1, moths.peer + (looking ? dt * 3 : -dt * 3)))
      const returning = moths.t >= 3.9 || moths.gone > 0.6
      moths.list.forEach((moth, i) => {
        const at = perch(i)
        if (moth.mode === 'bark' && !returning) {
          moth.wait -= dt * 2
          if (moth.wait > 0) return
          moth.mode = 'walk'
        }
        if (moth.mode === 'walk' && returning) moth.mode = 'walkBack'
        const toX = returning ? at.x : PLACES.mothTree.x + (i % 2 ? 14 : -14)
        const toY = returning ? at.y : Math.max(150, Math.min(540, edge - 18 - i * 30))
        if (moth.mode === 'walk' || moth.mode === 'walkBack') {
          const dx = toX - moth.x, dy = toY - moth.y, far = Math.hypot(dx, dy), pace = 96 * dt
          const stepsBefore = Math.floor(moth.beat * 9)
          if (far <= pace) {
            moth.x = toX; moth.y = toY
            if (moth.mode === 'walkBack') moth.mode = 'bark'
          } else {
            moth.x += (dx / far) * pace; moth.y += (dy / far) * pace
            // The leader's feet are the patter: one tick a step.
            if (i === 0 && stepsBefore !== Math.floor((moth.beat + dt) * 9)) w.sound('tinyFeet', (Math.floor(moth.beat * 9) % 3) / 2)
          }
        }
        if (moth.mode === 'bark') backHome++
      })
      if (returning && backHome === MOTHS) { moths.act = 'bark'; moths.rest = 2.5; moths.peer = 0 }
      break
    }
    case 'home': {
      let back = 0
      moths.list.forEach((moth, i) => {
        if (moth.mode === 'bark') { back++; return }
        const at = perch(i)
        moth.mode = 'back'
        moth.fold = Math.max(0, moth.fold - dt * 4)
        moth.spin = 0
        if (fly(moth, at.x, at.y, dt)) {
          moth.mode = 'bark'
          w.sound('settle', i / (MOTHS - 1))
        }
      })
      if (back === MOTHS) { moths.act = 'bark'; moths.rest = 0.6 }
      // On their way back, a yellow that comes for them is still what they want.
      else if (now === 'yellow') beginMoths(w, 'yellow')
      break
    }
    default:
      break
  }
}

/** They give up what they were at and fly back to the bark. */
function home(w: Wood): void {
  const moths = w.moths
  moths.act = 'home'
  moths.riding = false
  moths.t = 0
  w.sag = 0
}

/** Puts every moth where its act is taking it, with nothing in the air: what a touch that ends the ending leaves. */
export function settleMoths(w: Wood): void {
  const moths = w.moths
  const yellow = w.patchOf('yellow')
  if (moths.act !== 'yellow' || !yellow) return
  sit(w, moths, yellow)
  moths.list.forEach((moth, i) => {
    moth.mode = 'on'
    moth.x = moths.seats[i * 2]; moth.y = moths.seats[i * 2 + 1]
  })
}

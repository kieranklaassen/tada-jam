import { LYING, RIM_Y, hiddenFoot, overRim } from './basket'
import { BASKET, freeSpot, type Spot } from './layout'
import { ARCH_RING, type PieceDef, type PieceId } from './pieces'
import { Script, hump, smooth } from './script'
import { parentOf, rootOf, stand } from './stack'
import type { Piece } from './thing'
import { RISE, type World } from './world'

// The basket's scenes: the march (everything on the mat is walked into the tipped basket), the call (a doll
// calls into the empty basket and the echo comes back), and out again (the basket is set up and each thing
// rises out of it and hops to its own place by the mat).

/** In front of the mouth of the basket on its side, where a thing stands before it hops in. */
export const MOUTH: Spot = { x: LYING.x - 78, y: LYING.y + 96 }
/** Things hop out, and pop out one at a time, in this order: the smallest first. */
export const OUT_ORDER: readonly PieceId[] = ['arch-small', 'doll-small', 'silk', 'arch-middle', 'doll-round', 'doll-tall', 'horse', 'arch-large']
export const TIP = 0.5, CALL = 5.0
/** Seconds each thing of a stack takes to be set down on the mat before the march begins. */
export const TAKE_DOWN = 0.22

/** How much further the doll rocks into the basket's mouth as it calls. */
export const CALL_ROCK = 0.2
/** How far the doll steps in towards the basket as it sets it up. */
export const SET_UP_REACH = 22
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

function tip(s: Script, at: number, from: number, to: number): void {
  s.over(at, TIP, (u) => { s.world.tip = from + (to - from) * smooth(u) })
  s.say(at + TIP - 0.06, { name: 'wicker', gain: 0.8 })
}

/** The trips of the march: each doll with the thing it carries, then the things nobody carries, the largest arch last. `at` says where each thing stands on the mat when the trips begin. */
export function marchOrder(onMat: readonly Piece[], at: (p: Piece) => Spot = (p) => ({ x: p.px, y: p.py })): { doll: Piece | null; thing: Piece | null }[] {
  const dolls = onMat.filter((p) => p.def.kind === 'doll')
  const large = onMat.find((p) => p.def.id === 'arch-large') ?? null
  let cargo = onMat.filter((p) => p.def.kind !== 'doll' && p !== large)
  const far = (a: Piece, b: Piece): number => Math.hypot(at(a).x - at(b).x, at(a).y - at(b).y)
  const trips: { doll: Piece | null; thing: Piece | null }[] = []
  for (const doll of dolls) {
    // Each doll picks up the thing nearest it.
    const thing = cargo.reduce<Piece | null>((best, p) => (!best || far(p, doll) < far(best, doll) ? p : best), null)
    cargo = cargo.filter((p) => p !== thing)
    trips.push({ doll, thing })
  }
  for (const thing of cargo) trips.push({ doll: null, thing })
  if (large) trips.push({ doll: null, thing: large })
  return trips
}

/** How long one trip of the march takes, for that many trips after that many things were taken down from stacks: the whole march stays under ten seconds. */
export function tripSeconds(trips: number, takenDown = 0): number {
  return clamp((8 - takenDown * TAKE_DOWN) / Math.max(1, trips), 0.85, 1.6)
}

/** The upright, empty basket tapped while things are on the mat. */
export function march(w: World): void {
  const s = new Script(w), onMat = w.pieces.filter((p) => p.at === 'mat')
  // Stacks are taken down first, the top thing first, each set down on the mat beside its stack with its own knock: nothing waits in the air.
  const above = (p: Piece): number => { let n = 0; for (let lower = parentOf(w.pieces, p); lower; lower = parentOf(w.pieces, lower)) n += 1; return n }
  const riders = onMat.filter((p) => p.on !== null).map((p) => ({ p, n: above(p), y: stand(w.pieces, p).y })).sort((a, b) => b.n - a.n || a.y - b.y).map((each) => each.p)
  const stood = new Map<Piece, Spot>(), taken: { def: PieceDef; x: number; y: number }[] = onMat.filter((p) => p.on === null).map((p) => ({ def: p.def, x: p.x, y: p.y }))
  for (const p of onMat) if (p.on === null) stood.set(p, { x: p.x, y: p.y })
  const downs = riders.map((p, i) => {
    const root = rootOf(w.pieces, p), side = i % 2 ? -1 : 1
    const spot = freeSpot(p.def, root.x + side * (root.def.reach + p.def.reach + 8), root.y + 6, taken, true)
    taken.push({ def: p.def, x: spot.x, y: spot.y })
    stood.set(p, spot)
    return { p, spot }
  })
  // Where each thing is drawn now is where its way begins.
  for (const p of onMat) { const at = stand(w.pieces, p); p.px = at.x; p.py = at.y + p.lift + p.hop }
  const where = (p: Piece): Spot => stood.get(p)!
  const trips = marchOrder(onMat, where), each = tripSeconds(trips.length, downs.length)
  s.lead(...onMat)
  w.basket = 'tipped'
  for (const p of onMat) {
    p.at = 'basket'; p.on = null
    // An arch on its back rolls onto its feet, and everything faces the basket.
    if (p.turned) { p.turned = false; if (p.def.kind === 'arch' || p.def.kind === 'silk') p.turnAt = w.time }
  }
  w.seatBasket()
  w.say({ name: 'creak', gain: 0.8 })
  tip(s, 0, 0, 1)
  downs.forEach(({ p, spot }, i) => {
    const at = 0.05 + i * TAKE_DOWN
    s.go(p, at, TAKE_DOWN, spot, 36)
    s.cue(at + TAKE_DOWN, (finishing) => {
      p.tilt = 0; p.spin = 0
      if (!finishing) { p.squashV += 3; w.ring(spot.x, spot.y); w.say({ name: p.def.kind === 'horse' ? 'clop' : p.def.kind === 'silk' ? 'bell' : 'knock', piece: p.def.id, gain: 0.6, scene: true }) }
    })
  })
  const start = Math.max(TIP, 0.05 + downs.length * TAKE_DOWN) + 0.2, into = overRim(true)
  // The last of its way: it hops up into the mouth, growing smaller as it goes in, and is inside.
  const goesIn = (p: Piece, at: number): void => {
    s.go(p, at, each * 0.12, into, 30)
    s.over(at, each * 0.12, (u) => { p.far = 0.99 * smooth(u) })
    s.cue(at + each * 0.12, (finishing) => {
      // From here it is in the basket: it sinks out of sight, or to where its head looks out.
      p.lift = 0; p.hop = 0; p.spin = 0; p.way = 0; p.tilt = 0; p.far = 1; p.led = false
      // Each thing sounds its own note as it goes in: the tune is made of what was out.
      if (!finishing) w.say({ name: p.def.kind === 'horse' ? 'clop' : p.def.kind === 'silk' ? 'bell' : 'knock', piece: p.def.id, gain: 0.8, scene: true })
    })
  }
  trips.forEach(({ doll, thing }, i) => {
    const at = start + i * each
    if (doll && thing) {
      const pick = where(thing)
      s.cue(at, () => { doll.way = pick.x >= doll.px ? 1 : -1 })
      s.go(doll, at, each * 0.3, { x: pick.x - 30, y: pick.y + 4 }, 0, 2)
      s.say(at + each * 0.3, { name: 'pick', piece: thing.def.id, gain: 0.7 })
      // It lifts the thing over its head and walks it to the mouth.
      s.cue(at + each * 0.3, () => { doll.way = 1 })
      s.go(doll, at + each * 0.3, each * 0.42, MOUTH, 0, 4)
      s.over(at + each * 0.3, each * 0.42, (u) => { thing.px = doll.px; thing.py = doll.py; thing.lift = doll.def.height * 0.7 * smooth(u * 4) + doll.hop })
      for (let k = 0; k < 4; k++) s.say(at + each * (0.34 + k * 0.1), { name: 'step', piece: doll.def.id, step: k, gain: 0.7 })
      goesIn(thing, at + each * 0.72)
      goesIn(doll, at + each * 0.86)
    } else {
      const p = (doll ?? thing)!
      s.cue(at, () => { p.way = 1 })
      s.go(p, at, each * 0.8, MOUTH, 0, p.def.kind === 'silk' ? 0 : 4)
      if (p.def.kind === 'arch') {
        // An arch with nobody to carry it rolls there.
        const outer = ARCH_RING[p.def.id as keyof typeof ARCH_RING].outer, far = Math.hypot(MOUTH.x - where(p).x, MOUTH.y - where(p).y)
        s.over(at, each * 0.8, (u) => { p.spin = (smooth(u) * far) / outer; p.hop = 0 })
        s.say(at + each * 0.3, { name: 'rock', piece: p.def.id, gain: 0.5 })
        s.say(at + each * 0.6, { name: 'rock', piece: p.def.id, gain: 0.5 })
      } else if (p.def.kind === 'horse') {
        for (let k = 0; k < 4; k++) s.say(at + each * (0.1 + k * 0.18), { name: 'clop', piece: p.def.id, gain: 0.6 })
      } else if (p.def.kind === 'silk') {
        s.over(at, each * 0.8, (u) => { p.lift = 30 * hump(u); p.tilt = 0.2 * Math.sin(u * Math.PI * 4) })
        s.say(at, { name: 'sigh', piece: p.def.id, gain: 0.6 })
      } else {
        for (let k = 0; k < 4; k++) s.say(at + each * (0.1 + k * 0.18), { name: 'step', piece: p.def.id, step: k, gain: 0.7 })
      }
      goesIn(p, at + each * 0.82)
    }
  })
  w.play(s.end(start + trips.length * each + 0.1))
}

/** The upright, empty basket tapped while the mat is bare: nothing changes, so nothing is saved. */
export function call(w: World): void {
  // The mat is bare and the basket empty, so every doll is at its place: the small doll's is the nearest to the basket, and it is the one who goes.
  const small = w.piece('doll-small'), doll = small.at === 'home' ? small : null
  const s = new Script(w)
  w.say({ name: 'creak', gain: 0.8 })
  tip(s, 0, 0, 1)
  if (doll) {
    const id = doll.def.id, by = { x: MOUTH.x - 30, y: MOUTH.y }
    s.lead(doll)
    s.cue(TIP, () => { doll.way = 1 })
    s.go(doll, TIP, 1.0, by, 0, 5)
    for (let k = 0; k < 5; k++) s.say(TIP + 0.1 + k * 0.2, { name: 'step', piece: id, step: k, gain: 0.7 })
    // It leans in and calls; the note comes back, and the doll starts.
    s.over(1.5, 0.5, (u) => { doll.tilt = 0.45 * smooth(u) })
    s.say(2.0, { name: 'call', piece: id, gain: 0.9 })
    // It calls with its whole body: it rocks forward into the mouth and back as the note goes out.
    s.over(2.0, 0.9, (u) => { doll.tilt = 0.45 + CALL_ROCK * hump(Math.min(1, u * 2.5)); doll.hop = 6 * hump(Math.min(1, u * 2.5)) })
    s.say(2.9, { name: 'echo', piece: id, gain: 0.9 })
    s.over(2.9, 0.4, (u) => { doll.tilt = 0.45 - 0.6 * hump(u) - 0.45 * smooth(u); doll.hop = 30 * hump(u); doll.mood = 1 })
    s.say(3.3, { name: 'creak', gain: 0.7 })
    tip(s, 3.3, 1, 0)
    // The doll sets the basket up: it bends to it, steps in and pushes, and straightens as the basket comes up.
    s.over(3.3, TIP, (u) => { doll.px = by.x + SET_UP_REACH * Math.sin(u * Math.PI); doll.duck = 0.4 * Math.sin(u * Math.PI); doll.tilt = 0.3 * (1 - smooth(u)) * Math.sin(u * Math.PI) })
    s.cue(3.9, () => { doll.way = -1 })
    s.go(doll, 3.9, 1.0, { x: doll.x, y: doll.y }, 0, 5)
    for (let k = 0; k < 5; k++) s.say(4.0 + k * 0.2, { name: 'step', piece: id, step: k, gain: 0.6 })
  } else tip(s, 3.3, 1, 0)
  w.play(s.end(CALL), false)
}

/** How long after one thing the next comes out, for that many things: never sooner than the one before has risen and hopped to its place. */
export function hopSeconds(things: number): number {
  return clamp(4.4 / Math.max(1, things), RISE + 0.4, 0.9)
}

/** The basket on its side tapped: whatever looks out of it draws back in, it is set upright, and each thing in it rises over the rim in its turn and hops to its own place by the mat, the smallest first. */
export function outAgain(w: World): void {
  const s = new Script(w), inside = OUT_ORDER.map((id) => w.piece(id)).filter((p) => p.at === 'basket'), each = hopSeconds(inside.length)
  s.lead(...inside)
  w.basket = 'upright'
  for (const p of inside) { p.at = 'home'; p.x = p.def.home.x; p.y = p.def.home.y; p.far = 1 }
  // It answers the tap at once: the wicker rustles and shakes under the finger.
  w.say({ name: 'wicker', gain: 0.5 })
  // The heads draw back into the mouth, so nothing is seen in the basket while it swings up.
  for (const p of inside) s.go(p, 0, 0.2, hiddenFoot(p.def.id, true))
  s.say(0.2, { name: 'creak', gain: 0.8 })
  tip(s, 0.2, 1, 0)
  s.cue(0.2 + TIP, () => { for (const p of inside) { const deep = hiddenFoot(p.def.id, false); p.px = deep.x; p.py = deep.y; p.lift = 0 } })
  const from = 0.2 + TIP + 0.1
  inside.forEach((p, i) => {
    const at = from + i * each
    s.say(at, { name: 'pop', piece: p.def.id, gain: 0.9 })
    // It rises out of the mouth, and only then hops to its place.
    s.go(p, at, RISE, { x: BASKET.x, y: RIM_Y - 4 })
    // Out of the basket it grows to its own size again on its way.
    s.over(at + RISE, 0.4, (u) => { p.far = 0.99 * (1 - smooth(u)) })
    s.go(p, at + RISE, 0.4, { x: p.x, y: p.y }, 130)
    s.cue(at + RISE + 0.4, (finishing) => { if (!finishing) { p.squashV += 3; w.say({ name: 'tok', piece: p.def.id, gain: 0.6, scene: true }) } })
  })
  w.play(s.end(from + (inside.length - 1) * each + RISE + 0.5))
}

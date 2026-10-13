import { FIELD, freeSpot, type Spot } from './layout'
import type { PieceId } from './pieces'
import { Script, hump } from './script'
import { rootOf, withRiders } from './stack'
import type { Piece } from './thing'
import type { World } from './world'

// The ghost: the silk over a doll or the horse, hooting softly. The dolls that stand on the bare mat scamper for
// the edge, the smallest first, and giggle when they get there: each out along the line from the mat's middle
// through where it stands, and the small doll alone the way that points from the ghost to itself. A doll that
// rests on something stays and ducks; the ghost walks or gallops after them if it stands on the bare mat, and
// sways where it is if it rests on something.

export const GHOST = 5.0
/** The dolls run in this order, each a little after the one before. */
export const RUN_ORDER: readonly PieceId[] = ['doll-small', 'doll-round', 'doll-tall']
const RUN_FROM = 1.25, RUN_GAP = 0.22, RUN = 1.1, WALK_FROM = 2.4
/** Seconds after a doll has got to the edge that it giggles. */
export const GIGGLE = 0.12
/** How long the cloth swells with one hoot, and how far. */
export const HOOT = 0.3, HOOT_SWELL = 0.16

const away = (from: Spot, to: Spot, fallback: Spot): Spot => {
  let dx = to.x - from.x, dy = to.y - from.y
  if (Math.hypot(dx, dy) < 1) { dx = fallback.x; dy = fallback.y }
  const far = Math.hypot(dx, dy) || 1
  return { x: dx / far, y: dy / far }
}

/** `covered` is the thing the silk now rests on; `incoming` is a thing that was put under the silk and is still on its way to the place. */
export function ghost(w: World, silk: Piece, covered: Piece, incoming: Piece | null): void {
  const s = new Script(w), own = withRiders(w.pieces, rootOf(w.pieces, covered)), g = { x: covered.x, y: covered.y }, middle = { x: FIELD.x, y: FIELD.y }
  const dolls = w.pieces.filter((p) => p.def.kind === 'doll' && p.at === 'mat' && p !== covered)
  const runners = RUN_ORDER.map((id) => w.piece(id)).filter((p) => dolls.includes(p) && p.on === null && !own.includes(p))
  const duckers = dolls.filter((p) => !runners.includes(p))
  const starts = new Map<Piece, Spot>(), ends = new Map<Piece, Spot>()
  for (const r of runners) {
    // The small doll's direction is the one from the ghost to itself; each of the others runs out along the line from the mat's middle through where it stands. Either way the run ends at the edge of the mat in that direction from the mat's middle.
    const dir = r.def.id === 'doll-small' ? away(g, r, { x: 1, y: 0 }) : away(middle, r, away(g, r, { x: 1, y: 0 }))
    const spot = freeSpot(w.bulk(r), FIELD.x + dir.x * 2000, FIELD.y + dir.y * 2000, w.roots(r.def.id), true)
    starts.set(r, { x: r.x, y: r.y })
    ends.set(r, spot)
    w.moveRest(r, spot.x, spot.y)
  }
  const walks = covered.on === null
  let to = g
  if (walks) {
    if (covered.def.kind === 'horse') {
      const dir = away(middle, g, { x: 1, y: 0 })
      to = freeSpot(w.bulk(covered), FIELD.x + dir.x * 2000, FIELD.y + dir.y * 2000, w.roots(covered.def.id), true)
    } else {
      const ran = [...ends.values()]
      const after = ran.length ? { x: ran.reduce((sum, each) => sum + each.x, 0) / ran.length, y: ran.reduce((sum, each) => sum + each.y, 0) / ran.length } : middle
      const dir = away(g, after, { x: 1, y: 0 })
      to = freeSpot(w.bulk(covered), g.x + dir.x * 96, g.y + dir.y * 96, w.roots(covered.def.id), true)
    }
    w.moveRest(covered, to.x, to.y)
  }
  s.lead(silk, covered, ...runners, ...duckers)
  if (incoming) {
    s.lead(incoming)
    s.go(incoming, 0, 0.3, g, 40)
    s.cue(0.3, (finishing) => { if (!finishing) { incoming.squashV += 4; w.say({ name: incoming.def.kind === 'horse' ? 'clop' : 'knock', piece: incoming.def.id, gain: 0.7, scene: true }) } })
  }
  // The silk sinks over it and takes its shape, and hoots one soft wavering tone.
  s.seat(silk, 0.1, 0.7, 60)
  // The cloth swells with each hoot, so the sound is seen where it comes from.
  for (let i = 0; i < 4; i++) {
    s.say(0.8 + i * 0.35, { name: 'hoot', step: i, gain: 0.8 })
    s.over(0.8 + i * 0.35, HOOT, (u) => { silk.squash = -HOOT_SWELL * Math.sin(u * Math.PI) })
  }
  s.cue(0.9, () => { w.look = { x: g.x, y: g.y - covered.def.height * 0.5, until: w.time + 1.2, peek: false } })
  // Every doll looks and jumps. One that rests on something stays there and ducks with a squeak.
  s.cue(1.0, (finishing) => {
    if (finishing) return
    for (const p of [...runners, ...duckers]) p.hopV = 200
    for (const p of duckers) w.say({ name: 'squeak', piece: p.def.id, gain: 0.9, scene: true })
  })
  for (const p of duckers) s.over(1.2, 1.6, (u) => { p.duck = 0.7 * hump(u) })
  runners.forEach((r, i) => {
    const at = RUN_FROM + i * RUN_GAP, from = starts.get(r)!, end = ends.get(r)!
    s.cue(at, () => { r.way = end.x >= from.x ? 1 : -1 })
    // A scamper: eight quick light steps, each sounding as the foot comes down, and a giggle when it gets there.
    s.go(r, at, RUN, end, 0, 8)
    for (let k = 1; k <= 8; k++) s.say(at + k * (RUN / 8), { name: 'step', piece: r.def.id, step: k, gain: 0.5 })
    for (let k = 0; k < 3; k++) s.say(at + RUN + GIGGLE + k * 0.09, { name: 'giggle', piece: r.def.id, step: k, gain: 0.8 })
    s.over(at + RUN + GIGGLE, 0.5, (u) => { r.hop = 7 * Math.abs(Math.sin(u * Math.PI * 3)); r.mood = 1 })
  })
  if (!walks) {
    // A ghost that rests on something stays there and sways.
    s.over(WALK_FROM, 1.8, (u) => { covered.tilt = 0.13 * Math.sin(u * Math.PI * 4) * (1 - u) })
    for (let i = 0; i < 2; i++) s.say(WALK_FROM + i * 0.7, { name: 'hoot', step: i, gain: 0.6 })
  } else if (covered.def.kind === 'horse') {
    // The ghost horse gallops blind in a circle with muffled thuds, and bumps softly into the edge of the mat.
    const turn = to.x >= g.x ? 1 : -1
    s.over(WALK_FROM, 1.6, (u) => {
      const a = u * Math.PI * 2
      covered.px = g.x + turn * 50 * (1 - Math.cos(a)); covered.py = g.y + 18 * Math.sin(a)
      covered.way = (Math.sin(a) >= 0 ? turn : -turn) as -1 | 1
      covered.hop = 10 * Math.abs(Math.sin(u * Math.PI * 8))
    })
    for (let i = 0; i < 8; i++) s.say(WALK_FROM + i * 0.2, { name: 'thud', gain: 0.8 })
    s.cue(4.0, () => { covered.way = turn as -1 | 1 })
    s.go(covered, 4.0, 0.6, to, 0, 2)
    for (let i = 0; i < 2; i++) s.say(4.15 + i * 0.25, { name: 'thud', gain: 0.8 })
    s.cue(4.6, (finishing) => { if (!finishing) { covered.squashV += 4; w.say({ name: 'soft', gain: 0.9, scene: true }) } })
    s.over(4.6, 0.3, (u) => { covered.tilt = -turn * 0.1 * hump(u) })
  } else {
    // The ghost walks a few steps after them and stops.
    for (let i = 0; i < 3; i++) {
      const stop = { x: g.x + ((to.x - g.x) * (i + 1)) / 3, y: g.y + ((to.y - g.y) * (i + 1)) / 3 }
      s.go(covered, WALK_FROM + i * 0.6, 0.5, stop, 12)
      s.say(WALK_FROM + i * 0.6, { name: 'hoot', step: i, gain: 0.6 })
      s.over(WALK_FROM + i * 0.6, 0.6, (u) => { covered.tilt = (i % 2 ? -1 : 1) * 0.12 * hump(u) })
    }
    s.over(4.2, 0.6, (u) => { covered.tilt = 0.06 * Math.sin(u * Math.PI * 2) * (1 - u) })
  }
  w.play(s.end(GHOST))
}

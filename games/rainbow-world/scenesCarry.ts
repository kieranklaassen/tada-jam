import { FIELD, freeSpot, shrinkFor, type Spot } from './layout'
import { HORSE_BACK, HORSE_CROUCH } from './motion'
import { ARCH_RING } from './pieces'
import { restPose } from './pose'
import { Script, hump, smooth } from './script'
import { nestWith, outermost, stand, withRiders } from './stack'
import type { Piece } from './thing'
import type { World } from './world'

// The scenes of one character on another: the tower bows, the ride, and the carried horse.

export const TOWER = 4.3, RIDE = 6.0, CARRIED = 4.2
/** The ride: when the trot begins, how long it lasts, and how many steps it has. */
export const TROT_FROM = 0.9, TROT = 4.6, TROT_STEPS = 16
/** How often the rider bounces on the round: once for every two steps of the horse. */
export const RIDE_BOUNCES = 8

/** A doll put on a doll: the one below staggers, the tower leans, bows low, comes back up and settles. */
export function tower(w: World, d: Piece, e: Piece): void {
  const s = new Script(w), top = d.def.id, below = e.def.id
  // It bows towards the middle of the mat, where there is room.
  const side = e.x <= FIELD.x ? 1 : -1
  s.lead(d, e)
  s.seat(d, 0, 0.35)
  const footX = e.px, mood = { top: restPose(w.pieces, d).mood, below: 0 }
  mood.below = restPose(w.pieces, e).mood
  s.cue(0.35, (finishing) => {
    // Who grins and who frowns: the tall doll grins on top and frowns underneath.
    d.mood = mood.top; e.mood = mood.below
    if (finishing) return
    e.squashV += 5
    w.say({ name: 'chord', piece: top, other: below, gain: 0.9, scene: true })
  })
  s.over(0.4, 1.1, (u) => { e.px = footX + 16 * Math.sin(u * Math.PI * 4) * (1 - 0.3 * u); e.tilt = 0.08 * Math.sin(u * Math.PI * 4) })
  for (let i = 0; i < 3; i++) s.say(0.6 + i * 0.3, { name: 'step', piece: below, step: i, gain: 0.8 })
  s.over(1.5, 1.2, (u) => { e.px = footX; e.tilt = side * 0.72 * hump(u); d.tilt = side * 0.3 * hump(u) })
  for (let i = 0; i < 9; i++) s.say(1.6 + i * 0.12, { name: 'trill', piece: top, other: below, step: i, gain: 0.9 })
  s.over(2.7, 0.8, (u) => { e.tilt = -side * 0.12 * hump(u); d.tilt = 0 })
  s.over(3.5, 0.7, (u) => { e.tilt = side * 0.05 * Math.sin(u * Math.PI * 2) * (1 - u) })
  for (let i = 0; i < 3; i++) s.say(3.5 + i * 0.27, { name: 'trill', piece: top, other: below, step: i, gain: 0.6 - i * 0.15 })
  w.play(s.end(TOWER))
}

type Arch = { x: number; y: number; outer: number; u: number }

/** The round the horse trots: out from where it stands, once round the mat by way of every standing arch, and back. `u` runs 0 to 1. */
export function trotPath(start: Spot, shrink: number, arches: readonly Spot[]): { at: (u: number, out: Spot) => Spot; passes: number[] } {
  const rx = FIELD.rx - shrink - 30, ry = FIELD.ry - 26
  const a0 = Math.atan2((start.y - FIELD.y) / ry, (start.x - FIELD.x) / rx)
  const round = (u: number, out: Spot): Spot => {
    const a = a0 + u * Math.PI * 2, blend = smooth(u / 0.14) * smooth((1 - u) / 0.14)
    out.x = start.x + (FIELD.x + rx * Math.cos(a) - start.x) * blend
    out.y = start.y + (FIELD.y + ry * Math.sin(a) - start.y) * blend
    return out
  }
  // Each arch is passed at the moment of the round that comes nearest it; the one the horse stands before, first.
  const probe = { x: 0, y: 0 }
  const nearestU = (arch: Spot): number => {
    let best = 0.5, bestFar = Infinity
    for (let i = 8; i <= 56; i++) {
      const p = round(i / 64, probe), far = Math.hypot(p.x - arch.x, (p.y - arch.y) * 2)
      if (far < bestFar) { best = i / 64; bestFar = far }
    }
    return best
  }
  const order = arches.map((arch) => ({ arch, u: nearestU(arch), far: Math.hypot(arch.x - start.x, arch.y - start.y) })).sort((a, b) => a.far - b.far)
  if (order.length) order[0].u = 0.15
  order.sort((a, b) => a.u - b.u)
  for (let i = 1; i < order.length; i++) order[i].u = Math.max(order[i].u, order[i - 1].u + 0.2)
  const pulls = order.map(({ arch, u }) => { const p = round(u, { x: 0, y: 0 }); return { u, dx: arch.x - p.x, dy: arch.y - p.y } })
  const at = (u: number, out: Spot): Spot => {
    round(u, out)
    for (const pull of pulls) {
      const z = (u - pull.u) / 0.1
      if (z <= -1 || z >= 1) continue
      const k = Math.cos((z * Math.PI) / 2) ** 2
      out.x += pull.dx * k; out.y += pull.dy * k
    }
    return out
  }
  return { at, passes: order.map((each) => each.u) }
}

/**
 * Whether the horse can pass under a standing arch: fully ducked, its back is lower than the arch's hollow is
 * high, the arch stands on the mat and its hollow is empty. Only the largest arch is tall enough, and only while
 * no arch is nested in it and nothing lies over it; the horse hops over a lower one, a filled nest, a hill and a
 * cradle with a lid. Nothing passes through a band.
 */
export function passesUnder(pieces: readonly Piece[], arch: Piece): boolean {
  if (ARCH_RING[arch.def.id as keyof typeof ARCH_RING].inner < HORSE_BACK * (1 - HORSE_CROUCH)) return false
  // A lid across a cradle is no arch to pass under: under it is the cradle.
  return arch.on === null && nestWith(pieces, arch).length === 1 && !pieces.some((p) => p.at === 'mat' && p.on === arch.def.id)
}

/** How the horse and its rider duck: the horse is `k` ducked, 0 to 1, and the doll lies along its neck, lower by as much as the horse's back has dropped. */
export function duckUnder(h: Piece, d: Piece | null, k: number): void {
  h.duck = k
  if (!d) return
  d.lift = -92 * HORSE_CROUCH * k
  d.tilt = (h.way < 0 ? -1 : 1) * 1.15 * k
  d.duck = 0.6 * k
}

/**
 * A doll put on the horse: the horse looks round at its rider, trots one round of the mat and comes back. On
 * its way it ducks under every standing arch that is tall enough, its clops ringing hollow inside, hops over
 * the lower ones, and goes round whatever else stands in its way. Every bounce has its sound and every sound its
 * bounce: a clop each time its hooves come down, and a hiccup from the doll at the top of each of its bounces.
 */
export function ride(w: World, d: Piece, h: Piece): void {
  const s = new Script(w), id = h.def.id, start = { x: h.x, y: h.y }
  // A horse that itself rests on something trots on the spot.
  const free = h.on === null
  // A nest of arches is one arch, its outermost.
  const nests = !free ? [] : w.pieces.filter((p) => p.def.kind === 'arch' && p.at === 'mat' && p.on === null && !p.turned)
  const arches = nests.map((p) => outermost(w.pieces, p)), passes = (p: Piece): boolean => passesUnder(w.pieces, p)
  // It goes behind an arch it passes under, and before one it hops over.
  const standing: Arch[] = arches.map((p) => ({ x: p.x, y: p.y + (passes(p) ? -3 : 3), outer: ARCH_RING[p.def.id as keyof typeof ARCH_RING].outer, u: 0 }))
  const tall = arches.filter(passes).map((p) => ({ x: p.x, y: p.y, outer: ARCH_RING[p.def.id as keyof typeof ARCH_RING].outer }))
  // A standing arch it cannot pass under is hopped, as wide and as high as it is seen: a nest as its outermost arch.
  const inTheWay = arches.filter((p) => !passes(p))
  // Whatever else stands on the mat (a doll, a cradle, a tower, the spread silk) it goes round, at a body's width. Where the mat is too full to go round one, it hops that one as high as it stands: it hops through nothing.
  const around = !free ? [] : w.pieces.filter((p) => p.at === 'mat' && p.on === null && p !== h && !nests.includes(p)).map((p) => {
    const all = withRiders(w.pieces, p)
    return { x: p.x, y: p.y, r: Math.max(...all.map((each) => each.def.reach)) + h.def.reach, top: Math.max(...all.map((each) => p.y - stand(w.pieces, each).y + (each.turned || each.def.kind === 'silk' ? each.def.height * 0.5 : each.def.height))) }
  })
  const path = trotPath(start, shrinkFor(h.def), standing), spot = { x: 0, y: 0 }
  const where = (u: number, out: Spot): Spot => {
    if (!free) { out.x = start.x; out.y = start.y; return out }
    path.at(u, out)
    // It leaves from where it stands and comes back there, whatever stands next to it.
    const k = smooth(Math.min(u, 1 - u) * 10)
    // Several times over: out of one thing is not into its neighbour.
    for (let pass = 0; pass < 6; pass++) for (const each of around) {
      const dx = out.x - each.x, dy = (out.y - each.y) * 2, far = Math.hypot(dx, dy)
      if (far >= each.r) continue
      if (far < 1e-6) { out.y += (each.r / 2) * k; continue }
      const push = (each.r / far - 1) * k
      out.x += dx * push; out.y += (dy / 2) * push
    }
    return out
  }
  const facing = h.turned ? -1 : 1
  s.lead(d, h)
  s.seat(d, 0, 0.35)
  s.cue(0.35, (finishing) => { if (!finishing) { h.squashV += 4; w.say({ name: 'knock', piece: d.def.id, gain: 0.7, scene: true }) } })
  // It looks round at its rider.
  s.over(0.4, 0.5, (u) => { h.way = u < 1 ? (-facing as -1 | 1) : (facing as -1 | 1); h.mood = 1 })
  s.say(0.5, { name: 'nicker', piece: id, gain: 0.8 })
  // Inside an arch: between its feet, in its row.
  const inside = (x: number, y: number): boolean => tall.some((arch) => Math.abs(x - arch.x) < arch.outer * 0.7 && Math.abs(y - arch.y) < 26)
  // How far under an arch it is, 0 to 1: it is down before its head reaches the band, and up again once its tail is out.
  const under = (x: number, y: number): number => tall.reduce((k, arch) => Math.max(k, Math.abs(y - arch.y) < 30 ? smooth((1 - Math.abs(x - arch.x) / (arch.outer + 120)) * 2.2) : 0), 0)
  // How high it is in the air over whatever stands in its way.
  const jump = (x: number, y: number): number => {
    let over = 0, high = 110
    for (const p of inTheWay) {
      const near = 1 - Math.hypot(x - p.x, (y - p.y) * 2) / (p.def.reach + h.def.reach)
      // It clears the top of an arch it hops.
      if (near > over) { over = near; high = arches.includes(p) ? Math.max(110, p.def.height + 24) : 110 }
    }
    let lift = high * smooth(over * 1.6)
    // Whatever it could not go round: over its top by the time it is half a body in.
    for (const each of around) {
      const near = 1 - Math.hypot(x - each.x, (y - each.y) * 2) / each.r
      if (near > 0.03) lift = Math.max(lift, (each.top + 24) * smooth(near * 2.4))
    }
    return lift
  }
  // The stretches of the round it spends on the ground, each cut into whole steps: its hooves leave the ground and come down once for each, and it takes no step while it is in the air over something.
  const FINE = 480, probe = { x: 0, y: 0 }, ground: { from: number; to: number; steps: number }[] = []
  for (let k = 0, from = -1; k <= FINE; k++) {
    const at = where(k / FINE, probe), down = k < FINE && jump(at.x, at.y) === 0
    if (down && from < 0) from = k
    if (!down && from >= 0) { ground.push({ from: from / FINE, to: k / FINE, steps: Math.max(1, Math.round(((k - from) / FINE) * TROT_STEPS)) }); from = -1 }
  }
  const stepHop = (u: number): number => {
    for (const each of ground) if (u >= each.from && u < each.to) return 9 * Math.abs(Math.sin(((u - each.from) / (each.to - each.from)) * Math.PI * each.steps))
    return 0
  }
  s.over(TROT_FROM, TROT, (u) => {
    const before = h.px
    where(u, spot)
    h.px = spot.x; h.py = spot.y
    if (Math.abs(h.px - before) > 0.2) h.way = h.px > before ? 1 : -1
    if (u >= 1) h.way = facing as -1 | 1
    h.lift = u < 1 ? jump(h.px, h.py) : 0
    h.hop = u < 1 ? stepHop(u) : 0
    duckUnder(h, d, u < 1 ? under(h.px, h.py) : 0)
    // The doll bounces on its back, half as often.
    d.hop = u < 1 ? 14 * Math.abs(Math.sin(u * Math.PI * RIDE_BOUNCES)) : 0
    h.mood = 1
  })
  let glee = false, through = false
  const clop = (u: number, gain: number): void => {
    s.cue(TROT_FROM + u * TROT, (finishing) => {
      if (finishing) return
      const at = where(u, { x: 0, y: 0 }), hollow = inside(at.x, at.y)
      // A clop as its hooves come down, ringing hollow inside an arch.
      w.say({ name: hollow ? 'hollow' : 'clop', piece: id, gain, scene: true })
      // The small doll's glee at the arch is heard as they come out from under it, where it is seen bouncing.
      if (hollow) through = true
      else if (through && !glee && d.def.id === 'doll-small' && under(at.x, at.y) < 0.05) { glee = true; w.say({ name: 'glee', piece: d.def.id, gain: 0.9, scene: true }) }
    })
  }
  for (const each of ground) {
    // It comes down from a hop over something, harder than from a step.
    if (each.from > 0) { clop(each.from, 0.95); s.cue(TROT_FROM + each.from * TROT, (finishing) => { if (!finishing) h.squashV += 4 }) }
    // And from each step.
    for (let k = 1; k <= each.steps; k++) clop(each.from + (k / each.steps) * (each.to - each.from), 0.7)
  }
  // The doll hiccups at the top of each of its bounces.
  for (let j = 0; j < RIDE_BOUNCES; j++) s.say(TROT_FROM + ((j + 0.5) / RIDE_BOUNCES) * TROT, { name: 'hic', piece: d.def.id, gain: 0.8 })
  s.cue(TROT_FROM + TROT, (finishing) => { h.px = start.x; h.py = start.y; h.lift = 0; duckUnder(h, d, 0); if (!finishing) h.squashV += 3 })
  s.say(TROT_FROM + TROT + 0.05, { name: 'snort', piece: id, gain: 0.7 })
  w.play(s.end(RIDE))
}

/** The horse put on a doll: the doll's knees give, it takes four staggering steps and stops, and the horse looks pleased. */
export function carried(w: World, h: Piece, e: Piece): void {
  const s = new Script(w), doll = e.def.id
  const from = { x: e.x, y: e.y }
  // A doll that stands on the bare mat staggers off with it; one that itself rests on something stays there.
  const walks = e.on === null
  const way = e.x <= FIELD.x ? 1 : -1
  const to = walks ? freeSpot(w.bulk(e), e.x + way * 104, e.y, w.roots(doll), true) : from
  if (walks) w.moveRest(e, to.x, to.y)
  s.lead(h, e)
  s.seat(h, 0, 0.35)
  // The load is on from the moment the horse sits down: the tall doll strains from then, all through its staggering.
  const strain = restPose(w.pieces, e).mood
  s.cue(0.35, (finishing) => { e.mood = strain; if (!finishing) { e.squashV += 6; w.say({ name: 'clop', piece: h.def.id, gain: 0.9, scene: true }) } })
  s.over(0.35, 0.65, (u) => { e.duck = 0.55 * smooth(u); h.mood = 1; e.mood = strain })
  s.say(0.45, { name: 'puff', piece: doll, gain: 1 })
  for (let i = 0; i < 4; i++) {
    const at = 1.0 + i * 0.6
    s.say(at, { name: 'puff', piece: doll, step: i, gain: 0.9 })
    s.say(at + 0.3, { name: 'step', piece: doll, step: i, gain: 0.9 })
    s.over(at, 0.6, (u) => {
      const along = (i + smooth(u)) / 4
      e.px = from.x + (to.x - from.x) * along; e.py = from.y + (to.y - from.y) * along
      e.tilt = (i % 2 ? -1 : 1) * 0.15 * hump(u); e.duck = 0.55 - 0.1 * hump(u); e.way = way as -1 | 1; e.mood = strain
    })
  }
  s.say(3.5, { name: 'nicker', piece: h.def.id, gain: 0.8 })
  s.over(3.4, 0.7, (u) => { e.tilt = 0.05 * Math.sin(u * Math.PI * 2) * (1 - u); e.duck = 0.55 - 0.3 * smooth(u); h.mood = 1; h.hop = 8 * hump(u) })
  w.play(s.end(CARRIED))
}

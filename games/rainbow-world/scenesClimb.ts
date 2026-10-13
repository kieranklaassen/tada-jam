import { freeSpot } from './layout'
import { ARCH_RING } from './pieces'
import { duckUnder, passesUnder } from './scenesCarry'
import { Script, hump, smooth } from './script'
import { carriedBy, rootOf, stand, withRiders } from './stack'
import type { Piece } from './thing'
import type { World } from './world'

// The scenes of a standing arch and a cradle: the slide, the tunnel, and asleep. Each puts its outcome into the
// things' resting places first and then plays (script.ts).

const outerOf = (arch: Piece): number => ARCH_RING[arch.def.id as keyof typeof ARCH_RING].outer

/** Seconds each of these scenes lasts. */
export const SLIDE = 4.2, TUNNEL = 4.0, ASLEEP = 4.6
/** How many rocks of the cradle it takes a doll to fall asleep: one for the round doll, three for the others. */
export function rocksToSleep(doll: Piece): number {
  return doll.def.id === 'doll-round' ? 1 : 3
}
const ROCK = 0.9
/** When, in the tunnel, the small doll squeaks with glee: as the horse comes out of the mouth, once its rider sits up again. */
export const GLEE_AT = 2.8
/** How long one sleeping breath is seen, and how far the sleeper swells with it. */
export const BREATH = 0.7, BREATH_SWELL = 0.12

/** A doll put on a standing arch climbs up one side, waves at the top, slides down the far side and bumps to a stop there. */
export function slide(w: World, d: Piece, arch: Piece): void {
  const at = stand(w.pieces, arch), outer = outerOf(arch), id = d.def.id
  // The far side is the one away from where the doll came from.
  const side = d.px <= arch.x ? 1 : -1
  const spot = freeSpot(w.bulk(d), arch.x + side * (outer + d.def.reach + 10), arch.y, w.roots(id), true)
  d.at = 'mat'; d.on = null; d.turned = side < 0
  w.moveRest(d, spot.x, spot.y)
  const s = new Script(w)
  s.lead(d)
  s.go(d, 0, 0.35, { x: at.x - side * (outer + 4), y: at.y }, 50)
  s.say(0.35, { name: 'tok', piece: id, gain: 0.7 })
  s.over(0.35, 1.2, (u) => {
    const a = (u * Math.PI) / 2
    d.px = at.x - side * (outer + 4) * Math.cos(a); d.py = at.y - outer * Math.sin(a); d.lift = 0
    d.tilt = side * 0.5 * (1 - u); d.hop = 9 * Math.abs(Math.sin(u * Math.PI * 3)); d.way = side
  })
  for (let i = 0; i < 3; i++) s.say(0.55 + i * 0.4, { name: 'step', piece: id, step: i, gain: 0.8 })
  // At the top it waves. The tall doll, who wants to be highest, grins up there.
  s.over(1.55, 0.95, (u) => { d.tilt = 0.2 * Math.sin(u * Math.PI * 6) * (1 - u); d.hop = 0; d.mood = id === 'doll-tall' ? 1 : 0.4 })
  s.say(1.62, { name: 'chirp', piece: id, gain: 0.8 })
  s.say(2.5, { name: 'whistle', piece: id, gain: 0.9 })
  s.over(2.5, 0.8, (u) => {
    const a = (u * u * Math.PI) / 2
    d.px = at.x + side * (outer + 4) * Math.sin(a); d.py = at.y - outer * Math.cos(a)
    d.tilt = -side * 0.9 * smooth(u)
  })
  s.cue(3.3, (finishing) => {
    d.tilt = 0; d.mood = 0
    if (finishing) return
    d.squashV += 6
    w.ring(d.px, d.py)
    w.say({ name: 'bump', gain: 0.9, scene: true })
  })
  s.go(d, 3.4, 0.6, spot, 26)
  s.say(4.0, { name: 'tok', piece: id, gain: 0.5 })
  w.play(s.end(SLIDE))
}

/** The horse put on a standing arch: without a rider it stops at the mouth and will not go in. With a doll on its back it ducks under the arch and out the far side if the arch is tall enough, and hops over a lower one. */
export function tunnel(w: World, h: Piece, arch: Piece): void {
  const id = h.def.id, rider = carriedBy(w.pieces, h)
  const doll = rider?.def.kind === 'doll' ? rider : null
  // What stands there, as wide and as high as it is seen: the arch, or the cradle it lies across as a lid with the lid on top.
  const whole = withRiders(w.pieces, rootOf(w.pieces, arch)).filter((p) => p.def.kind === 'arch')
  const outer = Math.max(outerOf(arch), ...whole.map(outerOf)), tall = arch.y - (stand(w.pieces, arch).y - outerOf(arch))
  // The side it comes from.
  const from = h.px <= arch.x ? -1 : 1
  const gap = outer + h.def.reach + 8
  const spot = freeSpot(w.bulk(h), arch.x + (doll ? -from : from) * gap, arch.y, w.roots(id), true)
  h.at = 'mat'; h.on = null; h.turned = from > 0
  w.moveRest(h, spot.x, spot.y)
  const s = new Script(w), y = arch.y
  if (doll) s.lead(h, doll)
  else s.lead(h)
  s.cue(0, () => { h.way = from > 0 ? -1 : 1 })
  const clop = (at: number, name: 'clop' | 'hollow', gain = 0.8): void => {
    s.cue(at, (finishing) => { if (!finishing) { h.squashV += 2; w.say({ name, piece: id, gain, scene: true }) } })
  }
  if (!doll) {
    s.go(h, 0, 0.4, { x: arch.x + from * (gap + 96), y }, 50)
    clop(0.4, 'clop', 1)
    s.go(h, 0.45, 1.05, { x: arch.x + from * (gap - 26), y }, 0, 3)
    // A clop as its hooves come down from each of its three steps.
    for (let i = 1; i <= 3; i++) clop(0.45 + i * 0.35, 'clop')
    // It plants its hooves and slides back a little on its bottom.
    s.say(1.5, { name: 'skid', piece: id, gain: 0.9 })
    s.over(1.5, 0.8, (u) => { h.px = arch.x + from * (gap - 26 + 26 * smooth(u)) + (spot.x - (arch.x + from * gap)) * smooth(u); h.py = y + (spot.y - y) * smooth(u); h.hop = 0; h.tilt = from * 0.3 * hump(u); h.mood = -0.7 })
    s.say(2.3, { name: 'blow', piece: id, gain: 0.9 })
    s.cue(2.3, (finishing) => { if (!finishing) h.squashV += 3 })
    // It stands and looks in.
    s.over(2.3, 1.6, (u) => { h.tilt = 0.02 * Math.sin(u * 40) * (1 - u); h.mood = -0.7 })
    s.cue(2.3, () => { w.look = { x: arch.x, y: y - outer * 0.4, until: w.time + 1.6, peek: false } })
  } else if (passesUnder(w.pieces, arch)) {
    // The arch is tall enough: it ducks, its rider flat along its neck, and goes through behind the band.
    s.go(h, 0, 0.4, { x: arch.x + from * (gap + 30), y }, 50)
    clop(0.4, 'clop', 1)
    s.go(h, 0.45, 0.75, { x: arch.x + from * (outer + 70), y: y - 3 }, 0, 2)
    clop(0.82, 'clop'); clop(1.2, 'clop')
    s.over(0.8, 0.4, (u) => duckUnder(h, doll, smooth(u)))
    s.go(h, 1.2, 1.2, { x: arch.x - from * (outer + 70), y: y - 3 }, 0, 3)
    for (let i = 1; i <= 3; i++) clop(1.2 + i * 0.4, i < 3 ? 'hollow' : 'clop', 0.9)
    s.over(2.4, 0.4, (u) => duckUnder(h, doll, 1 - smooth(u)))
    // The small doll likes the tunnel: as they come out of the mouth it pops up on the horse's back and squeaks with glee.
    if (doll.def.id === 'doll-small') {
      s.say(GLEE_AT, { name: 'glee', piece: doll.def.id, gain: 0.9 })
      s.over(GLEE_AT, 0.45, (u) => { doll.hop = 18 * hump(u); doll.mood = 1 })
    }
    s.go(h, 2.4, 0.9, spot, 0, 2)
    clop(2.85, 'clop'); clop(3.3, 'clop')
    s.say(3.35, { name: 'nicker', piece: id, gain: 0.8 })
    s.over(3.35, 0.6, (u) => { h.mood = 1; h.tilt = 0.04 * Math.sin(u * Math.PI * 4) * (1 - u) })
  } else {
    // The arch is too low to pass under: with its rider it takes a run and hops over it, in front of it, and lands on the far side.
    s.go(h, 0, 0.4, { x: arch.x + from * (gap + 60), y: y + 3 }, 50)
    clop(0.4, 'clop', 1)
    s.go(h, 0.45, 0.75, { x: arch.x + from * (outer + 50), y: y + 3 }, 0, 2)
    clop(0.82, 'clop'); clop(1.2, 'clop')
    s.say(1.2, { name: 'whinny', piece: id, gain: 0.8 })
    s.go(h, 1.25, 0.95, { x: arch.x - from * (outer + 50), y: y + 3 }, tall + 60)
    s.over(1.25, 0.95, (u) => { h.tilt = -from * 0.25 * Math.cos(u * Math.PI); h.mood = 1 })
    s.cue(2.2, (finishing) => { h.tilt = 0; if (!finishing) { h.squashV += 6; w.ring(h.px, h.py) } })
    clop(2.2, 'clop', 1)
    s.go(h, 2.4, 0.9, spot, 0, 2)
    clop(2.85, 'clop'); clop(3.3, 'clop')
    s.say(3.35, { name: 'nicker', piece: id, gain: 0.8 })
    s.over(3.35, 0.6, (u) => { h.mood = 1; h.tilt = 0.04 * Math.sin(u * Math.PI * 4) * (1 - u) })
  }
  w.play(s.end(TUNNEL))
}

/** A doll put in a cradle: the cradle sways by itself, the doll's eyes close, and it breathes out in sighs. */
export function asleep(w: World, d: Piece, cradle: Piece): void {
  const id = d.def.id, rocks = rocksToSleep(d), s = new Script(w)
  s.lead(d, cradle)
  s.seat(d, 0, 0.35)
  s.cue(0.35, (finishing) => { if (!finishing) { cradle.squashV += 3; w.say({ name: 'knock', piece: id, gain: 0.5, scene: true }) } })
  const sway = 3 * ROCK
  s.over(0.35, sway, (u) => {
    const t = u * sway
    cradle.tilt = 0.2 * Math.sin((t / ROCK) * Math.PI * 2) * (1 - 0.45 * u)
    // The eyes close over the rock that sends it to sleep: the first for the round doll, the third for the others.
    d.shut = smooth((t - (rocks - 1) * ROCK) / ROCK)
  })
  // Two slow notes, one at each end of a rock.
  for (let i = 0; i < 6; i++) s.say(0.35 + i * (ROCK / 2), { name: 'lull', piece: cradle.def.id, step: i, gain: 0.8 - i * 0.08 })
  s.over(0.35 + sway, 1.2, (u) => { cradle.tilt = 0.06 * Math.sin(u * Math.PI * 2) * (1 - u); d.shut = 1 })
  const asleepAt = 0.35 + rocks * ROCK
  // Each sigh is a breath that is seen: the sleeper swells a little and sinks as it breathes out.
  for (let at = asleepAt + 0.2; at < ASLEEP - 0.4; at += 0.85) {
    s.say(at, { name: 'breath', piece: id, gain: 0.8 })
    s.over(at, BREATH, (u) => { d.squash = -BREATH_SWELL * Math.sin(u * Math.PI) })
  }
  w.play(s.end(ASLEEP))
}

import type { PlaceId, ThingId } from './layout'

// What each thing does in each ball, as numbers over time. Twenty-four acts,
// none of them another's. The view adds together what is in the same ball.

/** What an act does to its ball (x, y, turn, stretch) and to the thing itself. */
export type Move = { x: number; y: number; rot: number; sx: number; sy: number; /** Whole body lift and tilt. */ lift: number; tilt: number; own: number; grow: number }
export const still = (): Move => ({ x: 0, y: 0, rot: 0, sx: 0, sy: 0, lift: 0, tilt: 0, own: 0, grow: 0 })

const { sin, abs, max, PI, floor } = Math
const wave = (t: number, hz: number): number => sin(t * hz * PI * 2)
const beat = (t: number, hz: number): number => abs(sin(t * hz * PI))
const saw = (t: number, hz: number): number => t * hz - floor(t * hz)
const kick = (t: number, hz: number): number => max(0, 1 - saw(t, hz) * 3)

type Do = (t: number, m: Move) => void
export const ACTS: Record<ThingId, Record<PlaceId, Do>> = {
  boot: {
    base: (t, m) => { m.lift += beat(t, 2) * 16; m.tilt += wave(t, 1) * 0.07; m.sy -= kick(t, 2) * 0.1; m.own += wave(t, 2) * 0.35 },
    belly: (t, m) => { m.x += kick(t, 1.2) * 16; m.own -= kick(t, 1.2) * 1.2; m.tilt += kick(t, 1.2) * 0.06 },
    head: (t, m) => { m.own += beat(t, 3) * 0.7; m.y += kick(t, 3) * 5 },
  },
  wheel: {
    base: (t, m) => { m.own += t * 9; m.x += wave(t, 9) * 1.5; m.tilt -= 0.06 },
    belly: (t, m) => { m.own -= t * 16; m.rot += wave(t, 0.8) * 0.12 },
    head: (t, m) => { m.rot += wave(t, 0.5) * 0.8; m.own += t * 5 },
  },
  cat: {
    base: (t, m) => { m.lift += beat(t, 5) * 6; m.x += wave(t, 5) * 4; m.own += wave(t, 5) * 0.2 },
    belly: (t, m) => { m.sx += wave(t, 11) * 0.025; m.sy -= wave(t, 11) * 0.025; m.grow += wave(t, 1.4) * 0.08 },
    head: (t, m) => { m.own += wave(t, 1.6) * 0.45; m.y -= beat(t, 0.8) * 5; m.rot -= beat(t, 0.8) * 0.16 },
  },
  tuba: {
    base: (t, m) => { m.lift += max(0, wave(t, 1)) * 44; m.grow += kick(t, 1) * 0.35; m.sy += max(0, wave(t, 1)) * 0.08 },
    belly: (t, m) => { m.sx += max(0, wave(t, 1.5)) * 0.18; m.sy -= max(0, wave(t, 1.5)) * 0.06; m.grow += max(0, wave(t, 1.5)) * 0.2 },
    head: (t, m) => { const u = saw(t, 0.9); m.sx += u * 0.28; m.sy += u * 0.22; m.grow += u * 0.4 },
  },
  rake: {
    base: (t, m) => { m.x -= saw(t, 3) * 12; m.tilt += saw(t, 3) * 0.1; m.own -= saw(t, 3) * 0.2 },
    belly: (t, m) => { m.own += wave(t, 4) * 0.4; m.rot += wave(t, 4) * 0.05 },
    head: (t, m) => { m.own += wave(t, 14) * 0.14; m.grow += 0.18; m.y -= 4 },
  },
  umbrella: {
    base: (t, m) => { m.rot += wave(t, 0.7) * 0.4; m.lift += beat(t, 1.4) * 10; m.grow += 0.15 },
    belly: (t, m) => { m.grow += max(0, wave(t, 1)) * 0.7 - 0.1; m.sx += max(0, wave(t, 1)) * 0.1; m.sy += max(0, wave(t, 1)) * 0.1 },
    head: (t, m) => { m.y -= (0.5 - 0.5 * wave(t, 0.4)) * 58; m.grow += 0.3; m.own += wave(t, 0.9) * 0.15 },
  },
  goose: {
    base: (t, m) => { m.tilt += wave(t, 1.6) * 0.17; m.x += wave(t, 1.6) * 8; m.own -= wave(t, 1.6) * 0.3 },
    belly: (t, m) => { m.own += wave(t, 6) * 0.3; m.tilt += wave(t, 2.2) * 0.06; m.y -= beat(t, 6) * 3 },
    head: (t, m) => { m.x -= beat(t, 1.6) * 22; m.y += beat(t, 1.6) * 7; m.own += beat(t, 1.6) * 0.4 },
  },
  spring: {
    base: (t, m) => { m.lift += beat(t, 1.3) * 62; m.sy -= kick(t, 1.3) * 0.2; m.grow += beat(t, 1.3) * 0.5 },
    belly: (t, m) => { m.sy += wave(t, 1.1) * 0.24; m.sx -= wave(t, 1.1) * 0.1; m.grow += wave(t, 1.1) * 0.3 },
    head: (t, m) => { const u = saw(t, 1); m.y -= sin(u * PI * 5) * (1 - u) * 46; m.grow += (1 - u) * 0.4 },
  },
}
/** A ball with nothing in it. */
export const PLAIN: Record<PlaceId, Do> = {
  base: (t, m) => { m.lift += beat(t, 1.5) * 5; m.x += wave(t, 0.75) * 5 },
  belly: (t, m) => { m.rot += wave(t, 0.75) * 0.06 },
  head: (t, m) => { m.rot += wave(t, 0.75) * 0.1; m.y += beat(t, 1.5) * 3 },
}

/** How a ball with these things moves, and nothing of the things themselves. */
export function moveOf(place: PlaceId, things: readonly { id: ThingId }[], t: number): Move {
  const m = still()
  if (!things.length) PLAIN[place](t, m)
  for (const s of things) ACTS[s.id][place](t, m)
  // Many at once still keep him in one piece.
  const lim = (v: number, n: number) => max(-n, Math.min(n, v))
  m.x = lim(m.x, 26); m.y = lim(m.y, 40); m.rot = lim(m.rot, 1); m.sx = lim(m.sx, 0.3); m.sy = lim(m.sy, 0.3); m.lift = lim(m.lift, 62); m.tilt = lim(m.tilt, 0.22)
  return m
}
export function ownOf(id: ThingId, place: PlaceId, t: number): { turn: number; grow: number } {
  const m = still()
  ACTS[id][place](t, m)
  return { turn: m.own, grow: 1 + Math.max(-0.3, Math.min(0.7, m.grow)) }
}

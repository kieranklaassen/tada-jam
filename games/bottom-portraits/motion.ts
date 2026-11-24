import type { Id } from './cast'
import type { Act } from './sight'
import type { Pose } from './pose'

// How each of them moves. Nobody shares a movement: each has its own weight,
// its own tempo and its own funniest part, and each act is written for the
// one that does it. Times are seconds since the act began, progress is 0..1.

export type Temper = {
  /** How stiff its stand's ratchet is, and how much its body lags behind it. */
  spring: number; damp: number; lag: number
  /** Breaths a second, and how deep. */
  breath: number; depth: number
  /** Seconds between blinks. */
  blink: number
  /** Clicks in one quarter turn. */
  clicks: number
  /** Seconds of a hop between places. */
  hop: number
  pitch: number
}

export const TEMPERS: Readonly<Record<Id, Temper>> = {
  elephant: { spring: 70, damp: 9, lag: 0.5, breath: 0.22, depth: 0.018, blink: 4.7, clicks: 4, hop: 1.0, pitch: 0.55 },
  hen: { spring: 210, damp: 15, lag: 0.22, breath: 0.6, depth: 0.012, blink: 2.3, clicks: 7, hop: 0.72, pitch: 1.6 },
  hippo: { spring: 62, damp: 6.5, lag: 0.62, breath: 0.18, depth: 0.026, blink: 5.9, clicks: 3, hop: 0.95, pitch: 0.45 },
  pig: { spring: 150, damp: 10, lag: 0.4, breath: 0.42, depth: 0.02, blink: 3.1, clicks: 6, hop: 0.78, pitch: 1.0 },
  giraffe: { spring: 48, damp: 7.5, lag: 0.36, breath: 0.26, depth: 0.01, blink: 3.9, clicks: 5, hop: 1.1, pitch: 0.85 },
  crocodile: { spring: 120, damp: 13, lag: 0.3, breath: 0.3, depth: 0.014, blink: 7.3, clicks: 8, hop: 0.86, pitch: 0.7 },
  board: { spring: 260, damp: 11, lag: 0.16, breath: 0, depth: 0, blink: 0, clicks: 2, hop: 0.8, pitch: 1.25 },
}

const TAU = Math.PI * 2
export const clamp = (t: number): number => Math.min(1, Math.max(0, t))
export const ease = (t: number): number => { const k = clamp(t); return k * k * (3 - 2 * k) }
/** Up by `a`, held, and down again by 1. */
export const hold = (t: number, a = 0.2, b = 0.8): number => ease(t / a) * (1 - ease((t - b) / (1 - b)))
const wave = (t: number, beats: number): number => Math.sin(t * TAU * beats)
const bounce = (t: number, beats: number): number => Math.abs(Math.sin(t * Math.PI * beats))

/** At rest: breathing, blinking, and the loose part that is never quite still. `t` is the game's own clock. */
export function idle(id: Id, t: number, p: Pose): void {
  const temper = TEMPERS[id], n = id.length * 1.7
  if (temper.depth) p.squash *= 1 + temper.depth * Math.sin((t + n) * TAU * temper.breath)
  if (temper.blink) {
    const age = (t + n) % temper.blink
    if (age < 0.18) p.lid = Math.max(p.lid, Math.sin((age / 0.18) * Math.PI))
  }
  switch (id) {
    case 'elephant': p.a += 0.1 + 0.14 * Math.max(0, wave(t, 0.31)) ** 3; p.b += 0.06 * wave(t, 0.17); break
    case 'hen': { const k = (t * 0.7 + 0.3) % 1; p.shake += 0.22 * (k < 0.5 ? -1 : 1) * hold(k * 2 % 1, 0.08, 0.9); p.nod += 0.05 * bounce(t, 1.3) ** 8; break }
    case 'hippo': p.tilt += 0.02 * wave(t, 0.13); p.a += 0.04 + 0.04 * Math.max(0, wave(t, 0.18)); break
    case 'pig': p.a += 0.2 * Math.max(0, wave(t, 0.43)) ** 9; p.b += 0.35 * wave(t, 0.8); break
    case 'giraffe': p.nod += 0.035 * wave(t, 0.19); p.cock += 0.04 * wave(t, 0.11); break
    case 'crocodile': p.a += 0.07 + 0.02 * wave(t, 0.3); p.b += 0.12 * wave(t, 0.24); break
    case 'board': break
  }
}

/** Seconds an act lasts. */
export const ACT_SECONDS: Readonly<Record<Id, Readonly<Record<Act, number>>>> = {
  elephant: { front: 1.9, back: 2.4, side: 2.2, cut: 2.0, hole: 1.6 },
  hen: { front: 1.3, back: 3.2, side: 1.8, cut: 1.5, hole: 1.6 },
  hippo: { front: 2.3, back: 2.6, side: 1.9, cut: 2.1, hole: 1.5 },
  pig: { front: 1.6, back: 2.2, side: 1.5, cut: 1.9, hole: 1.2 },
  giraffe: { front: 2.1, back: 2.5, side: 2.0, cut: 2.8, hole: 1.8 },
  crocodile: { front: 1.4, back: 2.2, side: 1.8, cut: 1.9, hole: 2.0 },
  board: { front: 1.6, back: 1.0, side: 1.2, cut: 1.5, hole: 1.7 },
}

/** Reactions to how it was painted. `t` is 0..1 through the act. */
export function act(id: Id, kind: Act, t: number, p: Pose): void {
  const k = hold(t)
  switch (id) {
    case 'elephant':
      if (kind === 'front') { p.squash *= 1 + 0.1 * k; p.lean -= 0.12 * k; p.b += 1.25 * hold(t, 0.3, 0.75); p.a += 0.5 * k; p.lid = Math.max(p.lid, 0.45 * k) }
      else if (kind === 'back') { p.b += 0.35 * k; p.a -= 0.95 * k; p.nod += 0.42 * k; p.squash *= 1 - 0.1 * k; p.lid = Math.max(p.lid, k); p.tilt += 0.05 * wave(t, 3) * k }
      else if (kind === 'side') { p.tilt += 0.1 * wave(t, 2) * k; p.b += 0.3 * wave(t, 2) * k; p.cock += 0.1 * wave(t, 2) * k; p.a += 0.2 * k }
      else if (kind === 'cut') { p.b += 1.7 * ease(t / 0.35) * (1 - ease((t - 0.8) / 0.2)); p.squash *= 1 + 0.07 * k; p.shake += 0.5 * wave(t, 1.5) * hold(t, 0.4, 0.75); p.up += k }
      else { p.a += 0.7 * bounce(t, 6) * k; p.look += wave(t, 1) * k }
      break
    case 'hen':
      if (kind === 'front') { p.nod += 0.6 * bounce(t, 4) ** 3 * k; p.lean += 0.1 * k }
      else if (kind === 'back') {
        // A stiff faint, straight back, legs up; and slowly up again.
        const fall = ease(t / 0.16), rise = ease((t - 0.78) / 0.22), down = fall - rise
        p.lean -= 1.42 * down; p.hop += 0.34 * down; p.lid = Math.max(p.lid, down); p.a += 0.9 * hold(t, 0.06, 0.3)
        p.lean += 0.05 * Math.exp(-((t - 0.16) ** 2) / 0.001) * down
      } else if (kind === 'side') { p.shake += 1.0 * k; p.nod += 0.5 * k + 0.16 * bounce(t, 6) * k; p.a += 0.35 * k; p.lid = Math.max(p.lid, 0.6 * k) }
      else if (kind === 'cut') { p.hop += 0.4 * bounce(t, 3) * k; p.squash *= 1 + 0.1 * wave(t, 6) * k; p.a += 1.2 * bounce(t, 6) * k }
      else { p.look += 1.6 * wave(t, 2) * k; p.squash *= 1 + 0.04 * k }
      break
    case 'hippo':
      if (kind === 'front') { p.a += 0.95 * hold(t, 0.35, 0.6); p.nod -= 0.3 * hold(t, 0.35, 0.6); p.lid = Math.max(p.lid, hold(t, 0.3, 0.7)) }
      else if (kind === 'back') { p.twist += 0.3 * wave(t, 5) * k; p.tilt += 0.1 * wave(t, 2.5) * k; p.squash *= 1 - 0.07 * bounce(t, 5) * k; p.a += 0.3 * k; p.lid = Math.max(p.lid, 0.5 * k); p.shake += 0.6 * k }
      else if (kind === 'side') { p.lean += 0.12 * k; p.nod += 0.22 * bounce(t, 2) * k; p.look += k }
      else if (kind === 'cut') { p.squash *= 1 - 0.2 * k; p.up += k; p.a += 0.15 * k; p.nod -= 0.1 * k }
      else { p.a += 0.7 * ease((t - 0.5) / 0.1) * (1 - ease((t - 0.75) / 0.25)); p.squash *= 1 - 0.12 * ease(t / 0.4) * (1 - ease((t - 0.45) / 0.1)) }
      break
    case 'pig':
      if (kind === 'front') { p.lean += 0.42 * hold(t, 0.3, 0.6); p.nod += 0.25 * hold(t, 0.3, 0.6); p.lid = Math.max(p.lid, hold(t, 0.35, 0.6)) }
      else if (kind === 'back') { p.hop += 0.3 * bounce(t, 6) * k; p.tilt += 0.12 * wave(t, 3) * k; p.nod -= 0.3 * k; p.a += 0.5 * bounce(t, 6) * k; p.b += 1.2 * wave(t, 8) * k; p.lid = Math.max(p.lid, 0.75 * k) }
      else if (kind === 'side') { p.hop += 0.12 * bounce(t, 8) * k; p.lean += 0.1 * wave(t, 4) * k; p.b += 0.6 * wave(t, 4) * k }
      else if (kind === 'cut') { p.twist += TAU * ease(t) ; p.hop += 0.16 * bounce(t, 6); p.nod += 0.2 * k }
      else { p.lid = Math.max(p.lid, bounce(t, 2) ** 4); p.cock += 0.3 * k }
      break
    case 'giraffe':
      if (kind === 'front') { p.cock += 0.16 * wave(t, 1.5) * k; p.lid = Math.max(p.lid, bounce(t, 7) * 0.8 * k); p.nod += 0.06 * k }
      else if (kind === 'back') { p.shake += 1.7 * hold(t, 0.4, 0.7); p.nod += 0.3 * hold(t, 0.45, 0.65); p.lid = Math.max(p.lid, 0.4 * k) }
      else if (kind === 'side') { p.nod += 0.26 * wave(t, 3) * k; p.lean += 0.04 * wave(t, 3) * k }
      else if (kind === 'cut') { p.nod += 0.95 * hold(t, 0.4, 0.75); p.cock += 0.3 * hold(t, 0.5, 0.7); p.shake += 0.2 * wave(t, 2) * hold(t, 0.4, 0.7); p.up -= k }
      else { p.nod += 0.2 * bounce(t, 4) * k; p.squash *= 1 + 0.05 * bounce(t, 4) * k; p.look += wave(t, 2) * k }
      break
    case 'crocodile':
      if (kind === 'front') { p.a += 0.75 * bounce(t, 2) ** 0.6 * k; p.lean -= 0.1 * k; p.hop += 0.1 * bounce(t, 2) * k }
      else if (kind === 'back') { p.lid = Math.max(p.lid, k); p.shake += 0.75 * k; p.a -= 0.07 * k; p.nod += 0.16 * k }
      else if (kind === 'side') { p.b += 0.55 * wave(t, 7) * k; p.squash *= 1 - 0.03 * bounce(t, 7) * k; p.look += 0.6 * k }
      else if (kind === 'cut') { p.shake -= 0.55 * hold(t, 0.25, 0.5) - 0.55 * hold(clamp(t * 2 - 1), 0.25, 0.7); p.nod -= 0.28 * k; p.lid = Math.max(p.lid, 0.55 * k) }
      else { p.a += 0.65 * (Math.floor(clamp(t / 0.6) * 5) / 5) * (1 - ease((t - 0.8) / 0.2)); p.up += 0.4 * k }
      break
    case 'board':
      if (kind === 'front') { p.tilt += 0.1 * wave(t, 3) * k; p.twist += 0.12 * wave(t, 3) * k }
      else if (kind === 'back') { p.lean += 0.03 * wave(t, 9) * (1 - t); p.tilt += 0.02 * wave(t, 11) * (1 - t) }
      else if (kind === 'side') { p.twist += 0.1 * wave(t, 12) * (1 - t) }
      else if (kind === 'cut') { p.lean += 0.22 * hold(t, 0.12, 0.6); p.lean -= 0.05 * hold(clamp(t * 1.2 - 0.6), 0.2, 0.5) }
      else { p.hop += 0.09 * bounce(t, 8) * k; p.tilt += 0.06 * wave(t, 4) * k }
      break
  }
}

/** A poke: small, at once, each in its own way. */
export function poke(id: Id, t: number, p: Pose): void {
  const k = 1 - t
  switch (id) {
    case 'elephant': p.b += 0.8 * bounce(t, 1) * k; p.a += 0.5 * bounce(t, 2) * k; break
    case 'hen': p.hop += 0.22 * bounce(t, 1) * k; p.a += 1.1 * bounce(t, 3) * k; break
    case 'hippo': p.squash *= 1 - 0.14 * wave(t, 1.5) * k; p.a += 0.3 * k * bounce(t, 1); break
    case 'pig': p.tilt += 0.16 * wave(t, 2) * k; p.b += 1.4 * wave(t, 4) * k; break
    case 'giraffe': p.nod += 0.2 * wave(t, 1.5) * k; p.lid = Math.max(p.lid, k * 0.7); break
    case 'crocodile': p.a += 0.6 * bounce(t, 1) * k; p.b += 0.5 * wave(t, 3) * k; break
    case 'board': p.lean += 0.1 * wave(t, 4) * k; break
  }
}

/** In the air between two places: `t` is 0..1. */
export function fly(id: Id, t: number, p: Pose): void {
  const k = Math.sin(clamp(t) * Math.PI)
  switch (id) {
    case 'elephant': p.a += 0.9 * bounce(t, 4) * k; p.b += 0.5 * k; p.squash *= 1 + 0.06 * k; break
    case 'hen': p.a += 1.3 * bounce(t, 9) * k; p.lean += 0.1 * k; break
    case 'hippo': p.tilt += 0.12 * wave(t, 2) * k; p.squash *= 1 + 0.08 * wave(t, 3) * k; break
    case 'pig': p.lean -= 0.2 * k; p.a += 0.7 * k; p.b += 1.5 * k * wave(t, 5); break
    case 'giraffe': p.nod -= 0.3 * k; p.cock += 0.14 * wave(t, 3) * k; break
    case 'crocodile': p.b += 0.7 * wave(t, 4) * k; p.lean += 0.18 * wave(t, 2) * k; break
    case 'board': p.tilt += 0.2 * k; p.twist += TAU * ease(t); break
  }
}

/** Where its eyes and body say it would like to be seen from: a hint of its want, at all times. `turn` is its quarter. */
export function want(id: Id, turn: number, p: Pose, seat: boolean): void {
  if (!seat) return
  const away = turn === 0, left = turn === 1
  switch (id) {
    // It wants its face painted: its eyes go towards him.
    case 'elephant': p.look += turn === 2 ? 0 : left ? 0.8 : -0.8; p.up += away ? 0.7 : 0; break
    case 'hen': p.look += turn % 2 ? 0 : 0.7; break
    // It looks back over its shoulder, hoping.
    case 'hippo': p.shake += away ? 0 : 0.28; p.look += away ? 0 : 0.8; break
    case 'pig': p.shake += away ? 0 : -0.22; p.look += away ? 0 : -0.9; break
    case 'giraffe': p.up += 0.5; break
    case 'crocodile': p.look += left ? 0.8 : turn === 3 ? -0.8 : 0; p.a += turn === 2 ? 0.2 : 0.05; break
    case 'board': break
  }
}

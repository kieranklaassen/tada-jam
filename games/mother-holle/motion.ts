import type { Body } from './village'

// How each of them moves, as plain numbers. Nobody shares a move with anybody:
// each has a tempo of its own, a weight and one part that is the funny one.

export type Pose = { up: number; wide: number; tall: number; lean: number; spin: number; flip: number; head: number; nod: number; a: number; b: number; c: number; look: number; lookUp: number }
export const newPose = (): Pose => ({ up: 0, wide: 1, tall: 1, lean: 0, spin: 0, flip: 0, head: 0, nod: 0, a: 0, b: 0, c: 0, look: 0, lookUp: 0 })
export type Sight = { asks: boolean; right: number; up: number }

const sin = Math.sin
/** A kick that springs and dies away. */
const ring = (t: number, f: number, damp: number) => Math.exp(-t * damp) * sin(t * f)
const bump = (t: number, s: number) => (t >= 0 && t < s ? sin((t / s) * Math.PI) : 0)
const squash = (p: Pose, k: number) => { p.tall *= 1 - k; p.wide *= 1 + k * 0.7 }

export function poseOf(b: Body, time: number, sight: Sight, p: Pose): Pose {
  Object.assign(p, { up: 0, wide: 1, tall: 1, lean: 0, spin: 0, flip: 0, head: 0, nod: 0, a: 0, b: 0, c: 0 })
  p.look = sight.right
  p.lookUp = sight.up
  const r = b.react?.name, t = b.react?.t ?? 9
  const sliding = b.mode === 'slide', flying = b.mode === 'air', fast = Math.min(1, Math.abs(b.v) / 6)
  const sneeze = b.sneeze > 0 ? b.sneeze : -1
  MOVES[b.id](p, b, time, sight, { r, t, sliding, flying, fast, sneeze })
  return p
}

type Now = { r: string | undefined; t: number; sliding: boolean; flying: boolean; fast: number; sneeze: number }
type Move = (p: Pose, b: Body, time: number, s: Sight, n: Now) => void

// a: left arm or flipper, b: right one, c: the odd part (footrest, tail, hat, fountain, wing).
const MOVES: Record<Body['id'], Move> = {
  // Slow and slopping; the flippers do the talking.
  walrus(p, b, time, s, n) {
    squash(p, 0.018 * sin(time * 1.5))
    if (s.asks) {
      // Paddle, paddle, and nowhere.
      const go = Math.max(0, sin(time * 1.1))
      p.a = sin(time * 7.5) * 0.9 * go - 0.2
      p.b = sin(time * 7.5 + 2) * 0.9 * go - 0.2
      p.lean = sin(time * 3.7) * 0.05 * go
      p.head = -0.12 + sin(time * 1.1) * 0.07
    } else { p.a = -0.2 + sin(time * 1.5) * 0.05; p.b = p.a }
    if (n.sliding || n.flying) { p.a = 1.5 + sin(time * 5) * 0.2; p.b = 1.6 + sin(time * 4.4) * 0.2; p.nod = -0.25; p.up = n.sliding ? Math.abs(sin(time * 17)) * 0.04 * n.fast : 0 }
    if (n.r === 'stop') { p.lean += -ring(n.t, 7, 2) * 0.28; p.nod += ring(n.t, 7, 1.6) * 0.3; p.c = 0.5 * bump(n.t, 0.7) }
    if (n.r === 'land') squash(p, Math.max(0, ring(n.t, 15, 4)) * 0.3)
    if (n.r === 'splash') { p.c = bump(n.t - 0.5, 1.8); p.nod -= bump(n.t, 2.4) * 0.5; p.lean += ring(n.t, 4, 1) * 0.2 }
    if (n.r === 'poke') { p.c = bump(n.t - 0.12, 1.1); p.nod = -bump(n.t, 1.2) * 0.45; squash(p, Math.max(0, ring(n.t, 14, 5)) * 0.2) }
    if (n.r === 'meet') squash(p, Math.max(0, ring(n.t, 9, 3)) * 0.22)
    if (n.sneeze >= 0) { const w = Math.min(1, n.sneeze / 0.55); p.nod = n.sneeze < 0.55 ? -0.6 * w : 0.55; p.tall *= n.sneeze < 0.55 ? 1 + w * 0.12 : 0.86 }
    if (b.floats && b.mode === 'rest') { p.up += sin(time * 1.6) * 0.07; p.lean += sin(time * 1.1) * 0.05; p.nod -= 0.2 }
    if (b.mode === 'hop') { p.a = 0.4; p.b = 0.4; p.lean += sin(time * 15) * 0.07 }
  },
  // Quick, upright and delighted; knees and arms.
  granny(p, b, time, s, n) {
    p.up = Math.abs(sin(time * 2.6)) * 0.035
    p.a = 0.25 + sin(time * 2.6) * 0.06
    p.b = 0.25 - sin(time * 2.6) * 0.06
    if (s.asks) { p.tall = 0.93 + sin(time * 5.2) * 0.03; p.lean = -0.06; p.b = 0.9 + sin(time * 9) * 0.2; p.head = -0.1 }
    if (n.sliding) { p.tall = 0.9 - n.fast * 0.06; p.lean = -0.12 - n.fast * 0.16; p.a = 1.25; p.b = 1.35 + sin(time * 12) * 0.1 }
    if (n.flying) { p.a = 2.3 + sin(time * 22) * 0.3; p.b = 2.3 - sin(time * 22) * 0.3; p.up = 0.25; p.tall = 0.84 }
    if (n.r === 'stop') { const w = Math.exp(-n.t * 1.8); p.lean = -0.38 * w * Math.cos(n.t * 5); p.a = 1.4 + n.t * 16 * (n.t < 1.1 ? 1 : 0); p.b = 1.4 - n.t * 16 * (n.t < 1.1 ? 1 : 0) }
    if (n.r === 'land') { p.tall *= 1 - Math.max(0, ring(n.t, 20, 6)) * 0.35; p.head = ring(n.t, 24, 5) * 0.2 }
    if (n.r === 'splash') { p.c = Math.abs(sin(n.t * 8)) * (n.t < 2 ? 1 : 0); p.head = -0.2 * bump(n.t, 2.2); p.a = 0.1 }
    if (n.r === 'poke') { p.a = 0.4 + Math.abs(sin(n.t * 14)) * 0.9 * (n.t < 0.5 ? 1 : 0); p.head = bump(n.t - 0.5, 0.6) * 0.35 }
    if (n.r === 'meet') { p.a = 1.5 + ring(n.t, 11, 2) * 0.5; p.b = 1.5 - ring(n.t, 11, 2) * 0.5; p.up = bump(n.t, 0.35) * 0.4 }
    if (n.sneeze >= 0) { const k = n.sneeze * 12; p.nod = Math.max(0, sin(k)) * 0.4; p.up = Math.max(0, sin(k)) * 0.1 }
    if (b.floats && b.mode === 'rest') { p.up += sin(time * 2.1) * 0.05; p.lean += sin(time * 1.7) * 0.07 }
    if (b.mode === 'hop') { p.flip = 0; p.lean = sin(time * 9) * 0.16; p.a = p.b = 1.1 }
  },
  // Asleep, whatever happens; the chair does the work.
  grandpa(p, b, time, s, n) {
    const breath = sin(time * 1.15)
    p.tall = 1 + breath * 0.02
    p.nod = 0.16 + breath * 0.1
    p.a = breath * 0.12
    if (s.asks) { p.a = sin(time * 4.5) * 0.35; p.lean = sin(time * 2.25) * 0.045 }
    if (n.sliding) { p.a = 0.3 + sin(time * 8) * 0.25 * n.fast; p.head = sin(time * 3) * 0.12; p.lean = 0.07 }
    if (n.flying) { p.b = 0.55; p.nod = -0.15; p.a = 0.7 }
    if (n.r === 'stop') { p.c = Math.exp(-n.t * 1.6) * (1 - 0.3 * sin(n.t * 18)); p.nod += ring(n.t, 8, 2.2) * 0.5; p.lean -= ring(n.t, 6, 2.6) * 0.16 }
    if (n.r === 'land') { p.b = Math.max(0, ring(n.t, 12, 3)) * 0.4; p.tall *= 1 - Math.max(0, ring(n.t, 13, 4)) * 0.22 }
    if (n.r === 'splash') { p.up = -1.15 * bump(n.t, 1.5); p.lean += ring(n.t, 3, 1) * 0.18 }
    if (n.r === 'poke') { p.flip = -bump(n.t, 1.3) * 0.75; p.c = bump(n.t, 1.3) }
    if (n.r === 'meet') { p.head = 0.45 * Math.min(1, n.t * 3) * Math.max(0, 1 - n.t / 3) }
    if (n.sneeze >= 0) { p.nod = n.sneeze < 0.5 ? -0.3 * (n.sneeze / 0.5) : 0.35; p.wide *= n.sneeze < 0.5 ? 1 + n.sneeze * 0.2 : 0.94 }
    if (b.floats && b.mode === 'rest') { p.up += sin(time * 1.15) * 0.1; p.lean += sin(time * 0.8) * 0.08 }
    if (b.mode === 'hop') { p.lean = sin(time * 12) > 0 ? 0.14 : -0.14 }
  },
  // Round and round, and always looking who it is; the tail.
  cow(p, b, time, s, n) {
    p.c = sin(time * 2) * 0.35 + sin(time * 0.7) * 0.2
    p.head = sin(time * 0.45) * 0.25
    p.nod = sin(time * 4.2) * 0.035
    if (s.asks) { p.head = 0.1 + sin(time * 1.6) * 0.22; p.lean = sin(time * 6) * 0.03; p.up = Math.max(0, sin(time * 3.2)) * 0.06 }
    if (n.sliding) { p.spin = b.ran * (1.5 + n.fast * 2.6); p.c = 1.1 }
    if (n.flying) { p.flip = -Math.min(1, b.ran / 0.75) * Math.PI * 2; p.c = 1.4; p.nod = -0.3 }
    if (n.r === 'stop') { const w = Math.max(0, 1 - n.t / 1.4); p.spin = -(w * w) * Math.PI * 4; p.lean = ring(n.t, 14, 2) * 0.09 }
    if (n.r === 'land') { squash(p, Math.max(0, ring(n.t, 17, 4.5)) * 0.2); p.lean = ring(n.t, 19, 2.2) * 0.1 }
    if (n.r === 'splash') { p.lean = sin(n.t * 5) * 0.2 * Math.exp(-n.t); p.nod = -0.25 * bump(n.t, 2) }
    if (n.r === 'poke') { p.head = sin(n.t * 22) * 0.4 * Math.exp(-n.t * 2); p.nod = -0.1 }
    if (n.r === 'meet') { p.head = 0.8 * bump(n.t, 1.8); p.c = 1.6 * bump(n.t, 1.6) }
    if (n.sneeze >= 0) { p.nod = -0.4 * bump(n.sneeze, 0.75); p.head = sin(n.sneeze * 5) * 0.4 }
    if (b.floats && b.mode === 'rest') { p.spin = sin(time * 0.4) * 0.5; p.up += sin(time * 1.9) * 0.05 }
    if (b.mode === 'hop') { p.lean = b.hop ? -b.hop.t * 0 + sin(time * 10) * 0.2 : 0 }
  },
  // Fast, jerky, then perfectly still; the wings.
  hen(p, b, time, _s, n) {
    const beat = Math.floor(time * 1.4)
    p.head = ((beat * 7) % 5 - 2) * 0.13
    p.nod = (beat % 4 === 0 ? bump((time * 1.4) % 1, 0.4) : 0) * 0.6
    if (b.mode === 'ride') { p.tall = 0.94 + sin(time * 3) * 0.02; p.a = 0.12 }
    if (n.sliding || n.flying || b.mode === 'held') { p.a = Math.abs(sin(time * 24)) * 1.5; p.up = Math.abs(sin(time * 12)) * 0.08; p.head = 0 }
    if (n.r === 'lay') { p.tall = 1 - bump(n.t, 0.3) * 0.25; p.up = bump(n.t - 0.3, 0.4) * 0.45; p.a = bump(n.t - 0.3, 0.6) * 1.2 }
    if (n.r === 'poke') { p.spin = Math.min(1, n.t / 0.6) * Math.PI * 2; p.up = bump(n.t, 0.5) * 0.4; p.a = bump(n.t, 0.6) }
    if (n.r === 'stop' || n.r === 'land') p.nod = Math.max(0, sin(n.t * 16)) * 0.8 * (n.t < 1.2 ? 1 : 0)
    if (n.r === 'splash' || (b.floats && b.mode === 'rest')) { p.spin = time * 1.8; p.up += sin(time * 6) * 0.03 }
    if (n.sneeze >= 0) { p.up = n.sneeze > 0.5 ? 1.1 * bump(n.sneeze - 0.5, 0.25) : 0; p.a = n.sneeze > 0.5 ? 1.5 : 0 }
    if (b.mode === 'hop') { p.a = Math.abs(sin(time * 26)) * 1.4 }
  },
  // Stiff as a post; the hat.
  mayor(p, b, time, _s, n) {
    p.head = sin(time * 0.6) * 0.14
    p.c = 0
    p.wide = 1 + Math.max(0, sin(time * 0.9)) * 0.03
    if (b.mode === 'ride') { p.b = 2.35 + sin(time * 7) * 0.04; p.nod = -0.1 }
    if (n.sliding || n.flying || b.mode === 'held') { p.a = p.b = 2.75; p.lean = sin(time * 9) * 0.06; p.c = 0.06 }
    if (n.r === 'stop' || n.r === 'land') { p.up = bump(n.t, 0.22) * 0.2; p.nod = -bump(n.t, 0.8) * 0.2 }
    if (n.r === 'poke') { const w = Math.max(0, Math.sin(Math.min(1, n.t / 0.8) * Math.PI)); p.c = w * 0.9 + (n.t > 0.8 ? Math.abs(ring(n.t - 0.8, 12, 5)) * 0.2 : 0); p.a = p.b = 1.2 * bump(n.t, 1) }
    if (n.r === 'splash' || (b.floats && b.mode === 'rest')) { p.up += Math.abs(sin(time * 3)) * 0.08; p.a = p.b = -0.4 }
    if (n.sneeze >= 0) { p.c = n.sneeze > 0.35 ? 0.7 : n.sneeze * 0.6; p.b = 2.6; p.nod = 0.3 * bump(n.sneeze, 0.75) }
    if (b.mode === 'hop') { p.a = sin(time * 10) * 0.8; p.b = -p.a }
  },
}

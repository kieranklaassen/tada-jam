import type { Wearer } from './kinds'

// How each character moves. Pure numbers: the hall steps the springs, the
// view lays the results on the paper. Every figure is one piece of paper on a
// stand, so it moves as a whole (it squashes on its stand, tips, hops), and
// each does that at its own tempo and weight. The grandfather is the one
// exception: he bends at the crease across his middle and nowhere else.
// motion.test.ts fails when two characters share a tempo or an idle curve.

/** A damped spring round a rest value of 0. */
export class Spring {
  x = 0
  v = 0
  constructor(readonly stiffness: number, readonly damping: number) {}

  kick(by: number): void {
    this.v += by
  }

  step(dt: number): void {
    // Two half steps keep a stiff spring steady at a long frame.
    for (let i = 0; i < 2; i++) {
      const h = dt / 2
      this.v += (-this.stiffness * this.x - this.damping * this.v) * h
      this.x += this.v * h
    }
  }

  get resting(): boolean {
    return Math.abs(this.x) < 0.0005 && Math.abs(this.v) < 0.005
  }
}

/** One character's weight: how stiff and how damped each of its moves is, and how hard a cue of 1 pushes it. */
export type Manner = {
  squash: { stiffness: number; damping: number; push: number }
  tilt: { stiffness: number; damping: number; push: number }
  hop: { stiffness: number; damping: number; push: number }
  bend: { stiffness: number; damping: number; push: number }
  /** Seconds between blinks, and how long the eyes stay shut. */
  blinkEvery: number
  blinkFor: number
  /** Seconds between glances at the door, and how long one lasts. */
  glanceEvery: number
  glanceFor: number
  /** How fast the eyes turn to a thing, per second. */
  eyeSpeed: number
}

export const MANNERS: Record<Wearer, Manner> = {
  // Quick and bouncy: a stiff squash that rings twice, a high hop.
  child: { squash: { stiffness: 260, damping: 11, push: 1.5 }, tilt: { stiffness: 150, damping: 9, push: 0.9 }, hop: { stiffness: 210, damping: 13, push: 420 }, bend: { stiffness: 150, damping: 9, push: 0.9 }, blinkEvery: 3.1, blinkFor: 0.12, glanceEvery: 5.2, glanceFor: 0.9, eyeSpeed: 14 },
  // Slow and late: soft springs that take their time, and a bend from the crease.
  grandfather: { squash: { stiffness: 70, damping: 8, push: 0.5 }, tilt: { stiffness: 40, damping: 6, push: 0.25 }, hop: { stiffness: 90, damping: 12, push: 90 }, bend: { stiffness: 34, damping: 5.5, push: 0.75 }, blinkEvery: 5.3, blinkFor: 0.26, glanceEvery: 8.6, glanceFor: 1.7, eyeSpeed: 4 },
  // A toy that cannot fall over: it rocks a long time and hardly hops.
  baby: { squash: { stiffness: 150, damping: 6, push: 1.1 }, tilt: { stiffness: 60, damping: 2.2, push: 1.1 }, hop: { stiffness: 160, damping: 14, push: 150 }, bend: { stiffness: 60, damping: 2.2, push: 1.1 }, blinkEvery: 2.3, blinkFor: 0.16, glanceEvery: 3.7, glanceFor: 0.6, eyeSpeed: 8 },
  // Small and sharp: everything is over at once.
  dog: { squash: { stiffness: 380, damping: 16, push: 1.8 }, tilt: { stiffness: 300, damping: 18, push: 0.8 }, hop: { stiffness: 320, damping: 18, push: 380 }, bend: { stiffness: 300, damping: 18, push: 0.8 }, blinkEvery: 4.1, blinkFor: 0.1, glanceEvery: 2.9, glanceFor: 1.3, eyeSpeed: 20 },
}

/** What a character does by itself while it is watched, at game time `t`. All are small, and none asks for anything. */
export type Idle = {
  /** Radians the whole paper tips on its stand. */
  tilt: number
  /** How much shorter it stands, as a share of its height; negative is taller. */
  squash: number
  /** Stage units it is off the floor. */
  hop: number
  /** Radians the grandfather's upper half leans from the crease; the tail's swing for the dog. */
  bend: number
}

const pulse = (t: number, every: number, lasts: number): number => {
  const at = t % every
  return at < lasts ? Math.sin((at / lasts) * Math.PI) : 0
}

export function idleOf(who: Wearer, t: number): Idle {
  switch (who) {
    // Rocks from foot to foot, breathes fast, and now and then cannot keep still.
    case 'child':
      return { tilt: 0.022 * Math.sin(t * 1.3), squash: 0.012 * Math.sin(t * 2.2), hop: 14 * pulse(t + 2, 7.3, 0.34), bend: 0 }
    // Sways very slowly, and nods off: his top half sinks from the crease for seven seconds and jerks back.
    case 'grandfather': {
      const at = (t + 3) % 11
      const nod = at < 7 ? 0.2 * (at / 7) ** 2 : 0.2 * Math.max(0, 1 - (at - 7) / 0.35)
      return { tilt: 0.008 * Math.sin(t * 0.5), squash: 0.006 * Math.sin(t * 0.9), hop: 0, bend: nod }
    }
    // Rocks on its rounded stand all the time, a little unevenly.
    case 'baby':
      return { tilt: 0.06 * Math.sin(t * 1.9) + 0.02 * Math.sin(t * 3.1), squash: 0.015 * Math.sin(t * 3.8), hop: 0, bend: 0 }
    // Pants, and wags in bursts.
    case 'dog':
      return { tilt: 0, squash: 0.012 * Math.sin(t * 5), hop: 0, bend: 0.5 * Math.sin(t * 15) * (0.35 + 0.65 * pulse(t, 2.9, 1.5)) }
  }
}

/** Whether the eyes are shut in a blink at `t`. */
export function blinking(who: Wearer, t: number): boolean {
  const m = MANNERS[who]
  return (t + m.blinkEvery * 0.37) % m.blinkEvery < m.blinkFor
}

/** How far the character's eyes have gone to the door at `t`, 0 to 1: the want it always has, shown as a glance that comes and goes. */
export function glanceOf(who: Wearer, t: number): number {
  const m = MANNERS[who]
  const at = (t + m.glanceEvery * 0.6) % m.glanceEvery
  return at < m.glanceFor ? Math.sin((at / m.glanceFor) * Math.PI) ** 0.5 : 0
}

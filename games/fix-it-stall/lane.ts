import { stepSpring, type Spring } from './motion'
import { PILLAR_LEFT, STAGE, WINDOW_LEFT, type Box, type P } from './stage'

// The lane beyond the open front, and what goes on in it that has nothing to
// do with any mend: whoever passes, the pigeon on the doorstep across the
// way, the washing on its line. Each answers a finger where it is, in its
// own way, and none of it is counted or saved. Numbers only; the view draws
// from them (paintLife.ts).

const inBox = (at: P, box: Box) => at.x >= box.x && at.x <= box.x + box.w && at.y >= box.y && at.y <= box.y + box.h

/** How far down the awning's valance hangs over the lane: nothing behind it can be touched, and a finger there is on the canvas. */
export const VALANCE = 46

// --- Whoever passes ------------------------------------------------------------------

/** Who passes: one at a time, with a wait between, the same round for ever. Each goes by above the customers' shoulders. */
export const PASSERS = ['giraffe', 'crates', 'balloon'] as const
export type Passer = (typeof PASSERS)[number]
/** Seconds from one passer setting out to the next, and how long each takes to go by. */
const EVERY = 34, TAKES: Record<Passer, number> = { giraffe: 15, crates: 17, balloon: 13 }

/** Who is passing at `seconds`, and how far along the lane they have got: 0 as they set out beyond the right, 1 as they leave at the left. Null between two. */
export function passing(seconds: number): { who: Passer; along: number } | null {
  const turn = Math.floor((seconds + 22) / EVERY), since = seconds + 22 - turn * EVERY
  const who = PASSERS[((turn % PASSERS.length) + PASSERS.length) % PASSERS.length]
  return since < TAKES[who] ? { who, along: since / TAKES[who] } : null
}

/** Where the one who passes is: the giraffe's head, the foot of the tower of crates, the balloon. */
export function passerAt(who: Passer, along: number, seconds: number): P {
  const x = STAGE.w + 110 - along * (STAGE.w + 220 - WINDOW_LEFT + 60)
  if (who === 'giraffe') return { x, y: 66 + Math.sin(seconds * 3.4) * 3 }
  if (who === 'crates') return { x, y: STAGE.counterTop + 10 }
  return { x, y: 122 + Math.sin(seconds * 0.9) * 12 - along * 26 }
}

/** What of the one who passes a finger can land on: its head and neck, the tower with the cat on it, the balloon. */
function passerBoxes(who: Passer, at: P): Box[] {
  if (who === 'giraffe') return [{ x: at.x - 44, y: at.y - 30, w: 76, h: 64 }, { x: at.x - 8, y: at.y + 20, w: 60, h: STAGE.counterTop - at.y - 20 }]
  if (who === 'crates') return [{ x: at.x - 38, y: at.y - 196, w: 80, h: 196 }]
  return [{ x: at.x - 27, y: at.y - 31, w: 54, h: 66 }]
}

/** How long the one who passes goes on answering a touch, in seconds. */
export const ANSWERS = 1.3

// --- The pigeon ------------------------------------------------------------------------

/** The doorstep across the lane, where the pigeon keeps its watch. */
export const DOORSTEP: P = { x: 871, y: STAGE.counterTop - 8 }

/**
 * Where the pigeon is. `scare` is how long ago it was last scared off, by a
 * bang or by a finger: it is up and out of sight in a third of a second, gone
 * for a while, and walks back in from the side when it thinks nobody saw.
 */
export function pigeonAt(seconds: number, scare: number): { x: number; y: number; away: number; fleeing: boolean } {
  const away = scare < 0.35 ? scare / 0.35 : scare < 5 ? 1 : scare < 6.4 ? 1 - (scare - 5) / 1.4 : 0
  const fleeing = scare < 0.35
  return { x: DOORSTEP.x + Math.sin(seconds * 0.5) * 16 + (fleeing ? 0 : away * 70), y: DOORSTEP.y - (fleeing ? away * 150 : 0), away, fleeing }
}

// --- The washing -----------------------------------------------------------------------

/** How low the line hangs at `x`: it sags from the corner post across to beyond the pillar. */
export function sag(x: number): number {
  const t = (x - WINDOW_LEFT) / (STAGE.w + 40 - WINDOW_LEFT)
  return (1 - t) * (1 - t) * 34 + 2 * (1 - t) * t * 62 + t * t * 30
}

/**
 * What hangs on the line, and where: somebody's enormous drawers, and two
 * mittens that do not match, hung well apart. Each hangs clear of where a
 * customer stands, so a finger on it is a finger on it and on nobody; and
 * between the two mittens the lane is clear, so whoever passes shows there.
 */
export const WASHING = [
  { what: 'drawers', x: 519, half: 34, drop: 42 },
  { what: 'mitten', x: 836, half: 13, drop: 34 },
  { what: 'mitten', x: 915, half: 13, drop: 34 },
] as const

export type LaneHit = { on: 'passer'; who: Passer } | { on: 'pigeon' } | { on: 'washing'; item: number }

export class Lane {
  /** The lane's own clock, in seconds: whoever passes, passes by it. */
  seconds = 0
  /** How long ago the pigeon was last scared off. */
  scare = 60
  /** The one who passes was touched: who, and how long ago. */
  poked: { who: Passer; age: number } | null = null
  /** Each thing on the line swings on its pegs: how far, in radians. */
  readonly swing: Spring[] = WASHING.map(() => ({ x: 0, v: 0 }))

  step(dt: number): void {
    this.seconds += dt
    this.scare += dt
    if (this.poked && ((this.poked.age += dt) >= ANSWERS || passing(this.seconds)?.who !== this.poked.who)) this.poked = null
    for (const spring of this.swing) stepSpring(spring, 0, 34, 2.6, dt)
  }

  /** A flag pops or a lamp blows: the pigeon is gone. */
  bang(): void {
    this.scare = 0
  }

  /** What of the lane lies under a finger, if anything: only what shows between the corner post and the pillar, below the awning and above the counter. */
  hit(at: P): LaneHit | null {
    if (at.x <= WINDOW_LEFT + 2 || at.x >= PILLAR_LEFT - 2 || at.y <= VALANCE || at.y >= STAGE.counterTop) return null
    for (let item = 0; item < WASHING.length; item++) {
      const { x, half, drop } = WASHING[item], top = sag(x)
      if (inBox(at, { x: x - half - 2, y: top - 4, w: half * 2 + 4, h: drop + 10 })) return { on: 'washing', item }
    }
    const bird = pigeonAt(this.seconds, this.scare)
    if (bird.away < 0.3 && Math.hypot(at.x - bird.x, at.y - (bird.y - 14)) < 28) return { on: 'pigeon' }
    const now = passing(this.seconds)
    if (now && passerBoxes(now.who, passerAt(now.who, now.along, this.seconds)).some((box) => inBox(at, box))) return { on: 'passer', who: now.who }
    return null
  }

  /** A finger lands on it: the washing swings and shakes its neighbours, the pigeon is off, the one who passes answers. */
  touch(hit: LaneHit): void {
    if (hit.on === 'pigeon') this.scare = 0
    else if (hit.on === 'passer') this.poked = { who: hit.who, age: 0 }
    else this.swing.forEach((spring, item) => { spring.v += item === hit.item ? (spring.x >= 0 ? 2.6 : -2.6) : 0.7 / (1 + Math.abs(item - hit.item)) })
  }
}

import { FOLK, WHO, type Who } from './hall'
import { NATURE, answerOf, wantsOf, type Happening, type Hold, type Kick, type Sight, type Wants } from './natures'
import { makeRng, type Rng } from './rng'

// How the five fair-goers move. Each has its own weight, its own tempo, its
// own habit while it waits and its own answer to everything that happens
// (natures.ts), and no two share a movement. Pure numbers on the seconds they
// are stepped by: the view turns a pose into paint, and the tests hold the
// poses apart.

export type { Happening, Hold, Kick, Sight } from './natures'
export { NATURE } from './natures'

export type Pose = {
  /** The body: moved up (negative) or down, leaned about its foot in radians, and squashed (below 1) or stretched. */
  dy: number
  lean: number
  squash: number
  /** The eyes: where the pupils look, -1 to 1 each way, and how far the lids are shut. */
  lookX: number
  lookY: number
  lid: number
  /** The brows, -1 drawn down to 1 raised; the mouth, -1 turned down to 1 turned up; and how far it is open. */
  brow: number
  mouth: number
  open: number
  /** Each one's own part: her fist's clench, his puffed cheeks, his moustache's twitch, the pompom's swing, the jaw's sideways chew. */
  part: number
  /** And a second: her hat flame's bob, the bell's wobble, his hat's flop, the mittens' lift, the ears' angle. */
  part2: number
  /** What it does with its hands: the thing it holds is turned or carried to its other place (his fingers on the valves, with nothing held). */
  use: number
  /** One eye grown huge, and both eyes crossed, 0 to 1 each. */
  eye: number
  cross: number
  /** How much taller the flame on her hat burns, 0 to 1. */
  flame: number
}

type Spring = { x: number; v: number }

function settle(s: Spring, target: number, stiff: number, damp: number, dt: number): void {
  s.v += ((target - s.x) * stiff - s.v * damp) * dt
  s.x += s.v * dt
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

const SPRUNG = ['dy', 'lean', 'squash', 'part', 'part2', 'brow', 'open', 'use'] as const

class Fellow {
  readonly pose: Pose = { dy: 0, lean: 0, squash: 1, lookX: 0, lookY: 0, lid: 0, brow: 0, mouth: 0, open: 0, part: 0, part2: 0, use: 0, eye: 0, cross: 0, flame: 0 }
  private readonly s: Record<(typeof SPRUNG)[number], Spring> = { dy: { x: 0, v: 0 }, lean: { x: 0, v: 0 }, squash: { x: 1, v: 0 }, part: { x: 0, v: 0 }, part2: { x: 0, v: 0 }, brow: { x: 0, v: 0 }, open: { x: 0, v: 0 }, use: { x: 0, v: 0 } }
  /** Eased, not sprung: the huge eye, the crossed eyes, the taller flame, the shut lids. */
  private eye = 0
  private cross = 0
  private flame = 0
  private shut = 0
  private t = 0
  private nextBlink: number
  private blink = 1
  private nextHabit: number
  /** Which habit is playing (-1 for none), the one before it, and how far through it is in seconds. */
  habit = -1
  private lastHabit = -1
  private habitT = 0
  /** Seconds the eyes stay on the last thing that startled them before going back to the bench. */
  private stare = 0
  hold: Hold = null

  constructor(readonly who: Who, private readonly rng: Rng) {
    const n = NATURE[who]
    this.nextBlink = n.blink[0] + rng.next() * (n.blink[1] - n.blink[0])
    this.nextHabit = n.habit[0] * 0.5 + rng.next() * n.habit[1]
  }

  kick(kick: Kick): void {
    for (const key of SPRUNG) this.s[key].v += kick[key] ?? 0
  }

  /** Something happened. Each answers in its own body; what does not concern one leaves it as it was. */
  react(what: Happening | 'poke'): void {
    const answer = answerOf(this.who, what)
    if (answer) this.kick(answer)
    if (what === 'poke') this.stare = 1.2
    else if (this.who === 'goat' && (what === 'knock' || what === 'gloop')) this.stare = 0.9
  }

  /** One of its eyes is made huge, or let go again: his, when he tries a biscuit on his teeth. */
  widen(eye: number): void {
    this.eye = eye
  }

  private wants(sight: Sight): Wants {
    return wantsOf(this.who, sight, this.hold, this.t, this.habit, this.habitT, this.stare > 0)
  }

  step(dt: number, sight: Sight, fingerX: number | null, fingerY: number | null): void {
    const n = NATURE[this.who], s = this.s
    this.t += dt
    this.stare = Math.max(0, this.stare - dt)
    this.runHabit(dt)
    const w = this.wants(sight)
    settle(s.dy, w.dy, n.stiff, n.damp, dt)
    settle(s.lean, w.lean, n.stiff, n.damp, dt)
    settle(s.squash, w.squash, n.stiff * 1.6, n.damp * 1.2, dt)
    // The goat's jaw follows its chew at once; every other part is on a spring of its owner's weight.
    if (this.who === 'goat') { s.part.x = w.part; s.part.v = 0 } else settle(s.part, w.part, n.stiff * 2, n.damp * 1.4, dt)
    settle(s.part2, w.part2, n.stiff * 1.2, n.damp * 0.8, dt)
    settle(s.brow, w.brow, 60, 11, dt)
    settle(s.open, w.open, 90, 12, dt)
    settle(s.use, w.use, n.stiff, n.damp * 0.9, dt)
    const ease = Math.min(1, dt * 7)
    this.eye += (w.eye - this.eye) * Math.min(1, dt * 1.6)
    this.cross += (w.cross - this.cross) * ease
    this.flame += (w.flame - this.flame) * ease
    this.shut += (w.shut - this.shut) * ease
    this.look(sight, fingerX, fingerY, Math.min(1, dt * n.gaze))
    this.nextBlink -= dt
    if (this.nextBlink <= 0) {
      this.nextBlink = n.blink[0] + this.rng.next() * (n.blink[1] - n.blink[0])
      this.blink = 0
    }
    this.blink = Math.min(1, this.blink + dt / 0.16)
    this.write(w)
  }

  /** As a load finds it: standing as what it holds and what it sees ask, with nothing still moving. */
  settle(sight: Sight): void {
    this.t = 0
    this.stare = 0
    this.habit = -1
    this.habitT = 0
    this.blink = 1
    const w = this.wants(sight)
    for (const key of SPRUNG) { this.s[key].x = w[key]; this.s[key].v = 0 }
    this.eye = w.eye; this.cross = w.cross; this.flame = w.flame; this.shut = w.shut
    this.look(sight, null, null, 1)
    this.write(w)
  }

  /** The eyes go to the finger while it is being stared at, and otherwise to the piece in work. */
  private look(sight: Sight, fingerX: number | null, fingerY: number | null, follow: number): void {
    const p = this.pose, eyes = FOLK[this.who].eyes
    const tx = this.stare > 0 && fingerX !== null ? fingerX : sight.x
    const ty = this.stare > 0 && fingerY !== null ? fingerY : sight.y
    const far = Math.hypot(tx - eyes.x, ty - eyes.y) || 1
    const reach = Math.min(1, far / 160)
    p.lookX += (((tx - eyes.x) / far) * reach - p.lookX) * follow
    p.lookY += (((ty - eyes.y) / far) * reach - p.lookY) * follow
  }

  private write(w: Wants): void {
    const n = NATURE[this.who], p = this.pose, s = this.s
    p.dy = s.dy.x + Math.sin(this.t * n.breathHz * Math.PI * 2) * n.breath
    // The bundle can tip right over backwards; nobody else leans that far.
    p.lean = clamp(s.lean.x, -0.5, this.who === 'bundle' ? 1.3 : 0.5)
    p.squash = clamp(s.squash.x, 0.6, 1.3)
    p.part = clamp(s.part.x, -1.5, 1.5)
    p.part2 = clamp(s.part2.x, -1.5, 1.5)
    p.brow = clamp(s.brow.x, -1, 1)
    p.mouth = clamp(w.mouth, -1, 1)
    p.open = clamp(s.open.x, 0, 1)
    p.use = clamp(s.use.x, -1.5, 1.5)
    p.eye = clamp(this.eye, 0, 1)
    p.cross = clamp(this.cross, 0, 1)
    p.flame = clamp(this.flame, 0, 1)
    p.lid = Math.max(Math.sin(this.blink * Math.PI), clamp(this.shut, 0, 1))
  }

  /** The habit of a fair-goer who waits: one of three, never the same twice running, each a few seconds apart. */
  private runHabit(dt: number): void {
    const n = NATURE[this.who]
    if (this.habit >= 0) {
      this.habitT += dt
      if (this.habitT > 2) { this.lastHabit = this.habit; this.habit = -1 }
      return
    }
    this.nextHabit -= dt
    if (this.nextHabit > 0) return
    this.nextHabit = n.habit[0] + this.rng.next() * (n.habit[1] - n.habit[0])
    let pick = Math.floor(this.rng.next() * 3)
    if (pick === this.lastHabit) pick = (pick + 1) % 3
    this.habit = pick
    this.habitT = 0
  }
}

export class Folk {
  private readonly fellows: Record<Who, Fellow>

  constructor(seed: number) {
    // Their chance is their own: nothing the rules draw from.
    const rng = makeRng(seed ^ 0x5f3759df)
    this.fellows = Object.fromEntries(WHO.map((who) => [who, new Fellow(who, rng)])) as Record<Who, Fellow>
  }

  pose(who: Who): Pose {
    return this.fellows[who].pose
  }

  habitOf(who: Who): number {
    return this.fellows[who].habit
  }

  react(what: Happening): void {
    for (const who of WHO) this.fellows[who].react(what)
  }

  poke(who: Who): void {
    this.fellows[who].react('poke')
  }

  kick(who: Who, kick: Kick): void {
    this.fellows[who].kick(kick)
  }

  widen(who: Who, eye: number): void {
    this.fellows[who].widen(eye)
  }

  /** What a fair-goer is seen to hold from now on: its pose follows. */
  hold(who: Who, hold: Hold): void {
    this.fellows[who].hold = hold
  }

  step(dt: number, sight: Sight, fingerX: number | null = null, fingerY: number | null = null): void {
    if (dt <= 0) return
    for (const who of WHO) this.fellows[who].step(dt, sight, fingerX, fingerY)
  }

  settle(sight: Sight): void {
    for (const who of WHO) this.fellows[who].settle(sight)
  }
}

import type { Kind } from './parts'
import type { Way } from './things'

// How a creature travels, and how each kind of part on it moves. Seven ways
// of going, one for each kind that can lead, and no two share a rhythm, a
// speed or a shape. Everything is plain numbers on game time: the toy steps
// it, the view reads it, and a sound is asked for in the very step in which
// the foot comes down, the wing beats or the wheel turns over.

/** What a creature's body is doing. Made once when it wakes and stepped from then on. */
export type Body = {
  /** Seconds into the stride of the way it travels by. */
  phase: number
  /** Forward speed right now, stage units a second. */
  speed: number
  /** Height off the ground, in a hop. */
  lift: number
  /** How far its heading swings from where it is going, as it curves, weaves or rocks. */
  sway: number
  /** Squashed (under 0) or stretched (over 0). */
  squash: number
  /** How far its wheels have turned. */
  spin: number
  /** 0 to 1 through a wing beat, 0 with the wings flat. */
  beat: number
  /** 0 to 1: how wide its feathers are fanned. */
  fan: number
  /** Its legs' paddling, in half turns: a whole number each time a foot comes down. */
  legs: number
  /** Seconds it has spent travelling, for whatever only sways along. */
  clock: number
  /** The whole body turned over itself, in radians: a tumble, a trip, a tip backwards. */
  roll: number
  /** 0 to 1: lying on its back. */
  flip: number
  /** 0 to 1: curled up to sleep, each part settled as itself. */
  curl: number
  /** 0 to 1: its parts have let go of one another. */
  loose: number
}

export function newBody(): Body {
  return { phase: 0, speed: 0, lift: 0, sway: 0, squash: 0, spin: 0, beat: 0, fan: 0, legs: 0, clock: 0, roll: 0, flip: 0, curl: 0, loose: 0 }
}

/** A sound a stride asks for, in the step its motion happens. */
export type StrideSound = 'foot' | 'beat' | 'land' | 'curve' | 'turn' | 'fan' | 'sniff' | 'rock'

/** The numbers of each way of going. `n` is how many parts of the leading kind the creature has. */
export const WAYS = {
  /** Twig legs scuttle in quick bursts. */
  twig: { burst: 0.5, pause: 0.32, speed: (n: number) => Math.min(280, 150 + 16 * n), footEvery: 1 / 14 },
  /** Maple wings lift it in hops. */
  maple: { crouch: 0.18, air: 0.5, rest: 0.27, height: (n: number) => Math.min(80, 22 + 10 * n), reach: (n: number) => Math.min(170, 64 + 18 * n) },
  /** A willow back slithers in curves. */
  willow: { speed: (n: number) => 84 + 6 * Math.min(n, 8), swing: (n: number) => Math.min(0.62, 0.28 + 0.06 * n), rate: 1.1 },
  /** Round leaves roll, slow to start and slow to stop. */
  round: { top: (n: number) => Math.min(210, 126 + 12 * n), gather: 70, slow: 95, wheel: 30 },
  /** A feather struts, stops and fans. */
  feather: { step: 0.28, steps: 2, speed: 62, show: (n: number) => Math.min(2.2, 0.7 + 0.3 * n) },
  /** A seed creeps, weaving, nose down. */
  seed: { speed: 46, swing: 0.5, rate: 0.8 },
  /** Caps alone waddle from side to side. */
  cap: { speed: 52, swing: 0.22, rate: 1.6 },
} as const

const TAU = Math.PI * 2

/** Whether a wave that went from `before` to `after` (in turns) passed a peak or a trough on the way. */
function passedExtreme(before: number, after: number): boolean {
  return Math.floor(before * 2 + 0.5) !== Math.floor(after * 2 + 0.5)
}

/**
 * Advances a body by `dt` and returns how far forward it goes in that time.
 * `go` says whether it wants to travel; a hop that has left the ground still
 * comes down, and a roller slows instead of stopping. Sounds go to `ask`.
 */
export function stride(body: Body, way: Way, n: number, dt: number, go: boolean, ask: (sound: StrideSound) => void): number {
  // Whatever is not this way's own motion eases back to rest.
  const ease = Math.min(1, dt * 8)
  if (go) body.clock += dt
  if (way !== 'feather') body.fan += (0 - body.fan) * ease
  if (way !== 'maple') { body.lift += (0 - body.lift) * ease; body.beat += (0 - body.beat) * ease; body.squash += (0 - body.squash) * ease }
  switch (way) {
    case 'twig': {
      const w = WAYS.twig, cycle = w.burst + w.pause
      if (!go) { body.phase = 0; body.speed = 0; body.sway += (0 - body.sway) * ease; return 0 }
      const before = body.phase
      body.phase = (body.phase + dt) % cycle
      const run = before < w.burst
      body.speed = run ? w.speed(n) : 0
      body.sway = run ? Math.sin(body.legs * Math.PI) * 0.05 : body.sway * (1 - ease)
      if (!run) return 0
      const feet = body.legs
      body.legs += dt / w.footEvery
      if (Math.floor(body.legs) !== Math.floor(feet)) ask('foot')
      return body.speed * dt
    }
    case 'maple': {
      const w = WAYS.maple, cycle = w.crouch + w.air + w.rest
      const grounded = body.phase < w.crouch || body.phase >= w.crouch + w.air
      if (!go && grounded) { body.phase = 0; body.speed = 0; body.lift = 0; body.beat += (0 - body.beat) * ease; body.squash += (0 - body.squash) * ease; return 0 }
      const before = body.phase
      body.phase += dt
      const takeOff = w.crouch, landing = w.crouch + w.air
      // Two beats of the wings carry one hop: one at the take-off and one at the top.
      if ((before < takeOff && body.phase >= takeOff) || (before < takeOff + w.air / 2 && body.phase >= takeOff + w.air / 2)) ask('beat')
      if (before < landing && body.phase >= landing) ask('land')
      let travelled = 0
      if (body.phase < takeOff) {
        body.squash = -0.3 * (body.phase / takeOff); body.lift = 0; body.beat = 0
      } else if (body.phase < landing) {
        const u = (body.phase - takeOff) / w.air
        body.lift = w.height(n) * 4 * u * (1 - u)
        body.beat = Math.abs(Math.sin(u * TAU))
        body.squash = 0.2 * Math.sin(u * Math.PI)
        body.speed = w.reach(n) / w.air
        travelled = body.speed * Math.min(dt, body.phase - Math.max(before, takeOff))
      } else {
        const u = Math.min(1, (body.phase - landing) / w.rest)
        body.lift = 0; body.beat = 0; body.speed = 0
        body.squash = -0.35 * (1 - u) * Math.cos(u * Math.PI * 3)
      }
      if (body.phase >= cycle) body.phase -= cycle
      return travelled
    }
    case 'willow': {
      const w = WAYS.willow
      const target = go ? w.speed(n) : 0
      body.speed += (target - body.speed) * Math.min(1, dt * 5)
      if (!go) { body.sway += (0 - body.sway) * ease; return body.speed * dt }
      const before = body.phase
      body.phase += dt * w.rate
      body.sway = Math.sin(body.phase * TAU) * w.swing(n)
      if (passedExtreme(before, body.phase)) ask('curve')
      return body.speed * dt * Math.cos(body.sway)
    }
    case 'round': {
      const w = WAYS.round
      if (go) body.speed = Math.min(w.top(n), body.speed + w.gather * dt)
      else body.speed = Math.max(0, body.speed - w.slow * dt)
      const d = body.speed * dt, before = body.spin
      body.spin += d / w.wheel
      if (Math.floor(body.spin / TAU) !== Math.floor(before / TAU)) ask('turn')
      body.sway += (0 - body.sway) * ease
      return d
    }
    case 'feather': {
      const w = WAYS.feather, walk = w.step * w.steps, cycle = walk + w.show(n)
      if (!go) { body.phase = 0; body.speed = 0; body.fan += (0 - body.fan) * ease; body.sway += (0 - body.sway) * ease; return 0 }
      const before = body.phase
      body.phase = (body.phase + dt) % cycle
      if (before < walk) {
        // Two proud steps: forward in the first half of each, a held pose in the second.
        const u = (before % w.step) / w.step
        body.speed = u < 0.55 ? w.speed / 0.55 : 0
        body.sway = Math.sin((before / w.step) * Math.PI) * 0.12
        body.fan += (0 - body.fan) * ease
        if (body.phase >= walk || body.phase < before) ask('fan')
        return body.speed * dt
      }
      body.speed = 0
      body.sway += (0 - body.sway) * ease
      body.fan += (1 - body.fan) * Math.min(1, dt * 14)
      return 0
    }
    case 'seed':
    case 'cap': {
      const w = WAYS[way]
      if (!go) { body.speed = 0; body.sway += (0 - body.sway) * ease; return 0 }
      const before = body.phase
      body.phase += dt * w.rate
      body.sway = Math.sin(body.phase * TAU) * w.swing
      if (passedExtreme(before, body.phase)) ask(way === 'seed' ? 'sniff' : 'rock')
      // A waddle goes forward in pushes, one to each rock; a creep keeps its nose moving.
      body.speed = way === 'cap' ? w.speed * (0.4 + 1.2 * Math.abs(Math.cos(body.phase * TAU))) : w.speed
      return body.speed * dt
    }
  }
}

/** How a part is moved from where it was pressed on: turned about its inner end, stretched along and across itself, and pushed out from the middle. */
export type PartPose = { turn: number; along: number; across: number; out: number }

/** A poke that is playing: the kind of the part the finger landed on, how far through it is (0 to 1), and whether this part is the very one. */
export type Poked = { kind: Kind; u: number; own: boolean } | null

/**
 * How one part of a creature moves, as itself, whatever way the creature
 * travels by: a twig paddles, a wing beats, a willow leaf bends after the one
 * before it, a round leaf turns like a wheel, a feather fans, a seed
 * twitches. Then what a poke on a part of its kind does to it, how it
 * settles to sleep, and how it lets go. `index` is the part's place among
 * the parts of its own kind. Writes into `out`.
 */
export function partPose(kind: Kind, body: Body, index: number, poked: Poked, out: PartPose): PartPose {
  out.turn = 0; out.along = 1; out.across = 1; out.out = 0
  const side = index % 2 === 0 ? 1 : -1
  const u = poked && poked.kind === kind ? poked.u : -1
  switch (kind) {
    case 'twig':
      // Legs paddle in turn; on a creature that does not scuttle they paddle slowly as it goes.
      out.turn = 0.5 * Math.sin((body.legs + body.clock * 2.2) * Math.PI) * side
      // Poked: the leg the finger found kicks out.
      if (u >= 0 && poked!.own) out.turn += 1.1 * (1 - u)
      // Asleep: the legs fold under.
      out.turn += 1.15 * body.curl * side
      out.along -= 0.2 * body.curl
      break
    case 'maple':
      // A beat folds the wing across itself; a creature that does not hop still fans its wings slowly as it goes.
      out.across = 1 - 0.6 * Math.max(body.beat, 0.25 * (0.5 + 0.5 * Math.sin(body.clock * 3.1 + index)))
      out.turn = 0.12 * body.beat * side
      // Poked: the wings fold over, and then the first one lifts to peek.
      if (u >= 0 && u < 0.7 && !(index === 0 && u > 0.42)) { out.across = 0.32; out.turn += 0.5 * side }
      // Asleep: folded over as a blanket.
      out.across *= 1 - 0.5 * body.curl
      out.turn += 0.4 * body.curl * side
      break
    case 'willow':
      out.turn = 0.34 * Math.sin(body.clock * 5.4 - index * 0.9) + body.sway * 0.5
      // Poked: it coils up tight, holds, and springs open.
      if (u >= 0) { out.turn += side * (u < 0.52 ? 1.3 * (u / 0.52) : 1.3 * Math.cos((u - 0.52) * 26) * (1 - u)); out.along -= u < 0.52 ? 0.3 * (u / 0.52) : 0 }
      // Asleep: curled round.
      out.turn += 0.95 * body.curl * side
      break
    case 'round':
      out.turn = body.spin + body.clock * 0.6 * side
      // Asleep: rolled on to its back.
      out.turn += Math.PI * body.curl
      out.across -= 0.12 * body.curl
      break
    case 'feather':
      out.turn = (0.5 * body.fan + 0.05 * Math.sin(body.clock * 2.4 + index * 1.7)) * side
      out.along = 1 + 0.08 * body.fan
      // Poked: as wide as it goes, and held.
      if (u >= 0) { out.turn += 0.42 * side * Math.min(1, u * 5); out.along += 0.1 }
      // Asleep: tucked in over the eyes.
      out.turn -= 0.7 * body.curl * side
      break
    case 'seed':
      out.along = 1 + 0.12 * Math.sin(body.clock * 11 + index)
      out.across = 1 - 0.08 * Math.sin(body.clock * 11 + index)
      // Poked: it swells with the breath in and shoots out with the sneeze.
      if (u >= 0) { out.along += u < 0.45 ? -0.25 * (u / 0.45) : 0.45 * Math.max(0, 1 - (u - 0.45) / 0.3); out.across += u < 0.45 ? 0.3 * (u / 0.45) : 0 }
      out.along -= 0.1 * body.curl
      break
    case 'cap':
      // Poked: the eye the finger found squeezes shut, and its fellows grow wide.
      if (u >= 0) { const size = poked!.own ? -0.18 : 0.3 * Math.sin(Math.min(1, u * 4) * Math.PI * 0.5) * (1 - Math.max(0, u - 0.7) / 0.3); out.along += size; out.across += size }
      break
  }
  // Let go: every part drifts out from the middle and droops.
  if (body.loose > 0) { out.out = 16 * body.loose; out.turn += 0.3 * body.loose * side }
  return out
}

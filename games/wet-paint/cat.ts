import type { Note } from './audio'
import { BROWN, ORANGE, WATER } from './colours'
import { CAT, POOL, SILL } from './layout'
import { below, type Rng } from './rng'
import { Spring } from './spring'
import { bloopVoice, catVoice, chirrupVoice, popVoice, purrVoice, sneezeVoice, startledVoice, trillVoice, windVoice, yelpVoice } from './voices'

// The cat on the table edge. Slow and heavy in the body, quick in the eyes:
// its eyes dart to whatever moves on the water, its head follows late, its
// tail keeps its own time. It wants one thing, to watch the colour move, and
// its tastes are fixed: it leans in to orange, its own colour, pulls a face
// at brown, hunts rings, starts at soap, hates wind on itself, likes a comb
// and dislikes a wet paw. Its feelings are about the water, a print and its
// own fur, never about the child. Everything here is numbers on the seconds
// `step` is given; catArt.ts draws every one of them.

export type CatPose = {
  /** -1 to 1: where the eyes look, left to right and up to down. */
  lookX: number
  lookY: number
  /** -1 to 1: how far the head has turned after the eyes. */
  turn: number
  /** 0.5 to 1: how wide the pupils are. */
  pupil: number
  /** 0 open to 1 shut. */
  lid: number
  /** Each ear, 0 as it stands, toward 1 laid flat, below 0 pricked. */
  earLeft: number
  earRight: number
  /** -1 to 1: the tail's sweep, and the flick of its tip. */
  tail: number
  tailTip: number
  /** -1 to 1, slow: the breath. */
  breath: number
  /** 0 to 1: how far the tongue is out. A little, always. */
  tongue: number
  /** 0 to 1: the nose wrinkled. */
  wrinkle: number
  /** -1 leaning away to 1 leaning in over the water. */
  lean: number
  /** Round 0: pressed flat below it, sprung tall above. */
  squash: number
  /** 0 to 1: fur standing the wrong way along the back. */
  ruffle: number
  /** 0 to 1: the mouth open in a meow. */
  mouth: number
  /** 0 to 1: the whiskers thrown wide; below 0 they stream back. */
  whiskers: number
  /** Where each paw is, in stage units: on the rim, or wherever it has reached. */
  pawLX: number
  pawLY: number
  pawRX: number
  pawRY: number
  /** The colour on the paw `tintPaw` (0 or 1), or clear water for a clean paw. */
  tint: number
  tintPaw: number
  /** 0 to 1: its back combed into neat stripes with a parting. */
  parting: number
  /** 0 to 1: sitting up smug, chin lifted. */
  smug: number
  /** 0 to 1: blown at, eyes squeezed shut. */
  wind: number
  /** 0 to 1: the bubble on its nose, by size. */
  bubble: number
  /** 0 to 1: the eyes crossed to look at the nose. */
  cross: number
  /** -1 to 1: the hind end wiggling before a pounce that never comes. */
  wiggle: number
  /** 0 and up: how high it has hopped, in stage units. */
  hop: number
  /** -1 to 1: the head tilted, to rub a cheek. */
  tilt: number
  /** 0 to 1: one claw out on each paw, hooked over the edge of a print it holds away from itself. */
  claws: number
}

/** What a scene has the cat do: where to look, where each paw goes, and how. Left out, a thing is the cat's own. */
export type Direction = {
  look?: { x: number; y: number }
  pawL?: { x: number; y: number }
  pawR?: { x: number; y: number }
  /** 0 to 1: tongue out to lick. */
  lick?: number
  /** -1 to 1. */
  tilt?: number
  /** -1 to 1. */
  lean?: number
  /** 0 to 1. */
  wrinkle?: number
  /** 0.5 to 1. */
  pupil?: number
  /** 0 to 1: a claw out on each paw. */
  claws?: number
}

type Blink = { at: number; shuts: number; seconds: number }

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v))
const HOME = CAT.paws

/** How long each short-lived thing lasts, in seconds. */
/** How often the rush of wind is heard again while the straw is held on the cat: one rush is this long. */
export const WIND_EVERY = 0.24
export const CAT_TIMES = { shake: 0.7, combed: 5, bubble: 1.1, crossAfter: 0.3, hunt: 2.6, sneezeAfter: 0.3, sniffAfter: 0.7, sniff: 1.6, bat: 0.45 } as const

export class Cat {
  readonly pose: CatPose = {
    lookX: 0, lookY: 0.5, turn: 0, pupil: 0.62, lid: 0, earLeft: 0, earRight: 0, tail: 0, tailTip: 0, breath: 0, tongue: 0.25, wrinkle: 0, lean: 0, squash: 0,
    ruffle: 0, mouth: 0, whiskers: 0, pawLX: HOME[0].x, pawLY: HOME[0].y, pawRX: HOME[1].x, pawRY: HOME[1].y, tint: WATER, tintPaw: 0, parting: 0, smug: 0, wind: 0, claws: 0,
    bubble: 0, cross: 0, wiggle: 0, hop: 0, tilt: 0,
  }
  /** What a scene asks of it, or null. The toy sets it each step a scene plays. */
  direction: Direction | null = null
  /** Where its paws hold a print, or null. It is no scene: the cat purrs, bats and looks about as ever while it holds one. */
  hold: Direction | null = null
  private time = 0
  private readonly rng: Rng
  private readonly lookX = new Spring(0, 190, 21)
  private readonly lookY = new Spring(0.5, 190, 21)
  private readonly turn = new Spring(0, 34, 8)
  private readonly pupil = new Spring(0.62, 120, 14)
  private readonly earLeft = new Spring(0, 150, 10)
  private readonly earRight = new Spring(0, 130, 9)
  private readonly tailTip = new Spring(0, 90, 6)
  private readonly tongue = new Spring(0.25, 26, 9)
  private readonly lean = new Spring(0, 12, 6)
  private readonly squash = new Spring(0, 210, 11)
  private readonly mouth = new Spring(0, 160, 18)
  private readonly whiskers = new Spring(0, 140, 12)
  private readonly hopping = new Spring(0, 260, 13)
  private readonly tilt = new Spring(0, 60, 11)
  private readonly smug = new Spring(0, 40, 10)
  private readonly paws = [new Spring(HOME[0].x, 130, 17), new Spring(HOME[0].y, 130, 17), new Spring(HOME[1].x, 130, 17), new Spring(HOME[1].y, 130, 17)]
  /** How stirred up it is, 0 to 1: it falls away by itself. */
  private stir = 0
  private tailPhase = 0
  /** What has its eye, until when; then its gaze wanders over the water again. */
  private caught: { x: number; y: number; until: number } | null = null
  private wander = { x: POOL.x + POOL.w / 2, y: POOL.y + POOL.h / 2, until: 0 }
  private blink: Blink
  private nextEar = 2
  private nextFlick = 3
  private tongueBack = 0
  private earsFlat = 0
  private listening: { left: boolean; until: number } | null = null
  private stroked = 0
  private nextPurr = 0
  private said = 0
  private sounds: Note[][] = []
  // The short-lived things, each with the time it ends. All of them are gone after `calm`.
  private shakeUntil = 0
  private combedUntil = 0
  private blown = false
  private nextWind = 0
  private sneezeAt = 0
  private bubbleFrom = 0
  private huntUntil = 0
  private sniffFrom = 0
  private bat: { x: number; y: number; until: number } | null = null

  /** Its paws are on the print it holds from the first frame: a game that opens with a print in the paws has nothing ease in. */
  holdNow(hold: Direction): void {
    this.hold = hold
    const at = [hold.pawL ?? HOME[0], hold.pawR ?? HOME[1]]
    this.paws.forEach((spring, i) => {
      spring.value = i % 2 === 0 ? at[i >> 1].x : at[i >> 1].y
      spring.speed = 0
    })
    this.pose.pawLX = at[0].x
    this.pose.pawLY = at[0].y
    this.pose.pawRX = at[1].x
    this.pose.pawRY = at[1].y
  }

  constructor(rng: Rng) {
    this.rng = rng
    this.blink = { at: 1.5 + rng.next() * 2, shuts: 1, seconds: 0.16 }
  }

  takeSounds(): Note[][] {
    const sounds = this.sounds
    this.sounds = []
    return sounds
  }

  /** A bloom spreads at this place of the stage. */
  bloom(x: number, y: number): void {
    // After a calm stretch the first bloom gets a small trill; a run of them does not.
    if (this.stir < 0.15) this.sounds.push(trillVoice())
    this.stir = Math.min(1, this.stir + 0.55)
    this.pupil.kick(2.2)
    this.caught = { x, y, until: this.time + 1.6 }
    // One that lands right under its nose makes it start: tongue in, ears back for a moment.
    if (Math.hypot(x - CAT.nose.x, y - CAT.nose.y) < 130) this.start(0.5)
  }

  /** A bead comes up by itself: the eyes jump to it. */
  bead(x: number, y: number): void {
    this.stir = Math.min(1, this.stir + 0.12)
    this.caught = { x, y, until: this.time + 0.9 }
  }

  /** Something sounded over there: one ear turns to it, and a glance. */
  heard(x: number, y: number): void {
    this.listening = { left: x < CAT.head.x, until: this.time + 0.9 }
    this.caught = { x, y, until: this.time + 0.7 }
  }

  /** Something has its eye for this long. */
  glance(x: number, y: number, seconds: number): void {
    this.caught = { x, y, until: this.time + seconds }
  }

  /** Poked: it squashes, springs back and says so. */
  poke(): void {
    this.squash.kick(-5.5)
    this.mouth.kick(9)
    this.start(0.9)
    this.sounds.push(catVoice(this.said++))
  }

  /** Stroked by this many stage units: the fur stands up, it leans in and purrs. */
  stroke(length: number): void {
    this.stroked = Math.min(1, this.stroked + length / 160)
    this.pose.ruffle = Math.min(1, this.pose.ruffle + length / 220)
  }

  /** A drop on the paw that rests on the rim: the paw is coloured, and it shakes it with a startled meow. */
  wetPaw(paw: number, colour: number): void {
    this.pose.tint = colour
    this.pose.tintPaw = paw
    this.shakeUntil = this.time + CAT_TIMES.shake
    this.mouth.kick(8)
    this.start(0.7)
    this.sounds.push(startledVoice())
  }

  /** Combed by this many stage units: its back lies in neat stripes with a parting, and it sits up smug. */
  comb(length: number): void {
    const was = this.pose.parting
    this.pose.parting = Math.min(1, was + length / 120)
    this.pose.ruffle = 0
    this.combedUntil = this.time + CAT_TIMES.combed
    if (was < 0.5 && this.pose.parting >= 0.5) this.sounds.push(chirrupVoice(this.said++))
  }

  /** Blown at through the straw, or no longer: ears flat, whiskers streaming, eyes shut, and a sneeze when it stops. */
  blow(on: boolean): void {
    if (on && !this.blown) {
      this.sounds.push(windVoice(this.said++))
      this.nextWind = this.time + WIND_EVERY
    }
    if (!on && this.blown) this.sneezeAt = this.time + CAT_TIMES.sneezeAfter
    this.blown = on
  }

  /** Soap on its nose: a bubble grows there, its eyes cross to look, and it bursts. */
  soap(): void {
    if (this.bubbleFrom > 0) return
    // Never 0, which stands for no bubble.
    this.bubbleFrom = Math.max(this.time, 1e-6)
    this.sounds.push(bloopVoice())
  }

  /** Rings on the water: its pupils go huge and its hind end wiggles. */
  hunt(x: number, y: number): void {
    this.huntUntil = this.time + CAT_TIMES.hunt
    this.caught = { x, y, until: this.huntUntil }
  }

  /** Soap on the water: it jumps, ears flat, and then comes back to sniff. */
  startle(x: number, y: number): void {
    this.hopping.kick(520)
    this.start(1)
    this.sounds.push(yelpVoice())
    this.sniffFrom = this.time + CAT_TIMES.sniffAfter
    this.caught = { x, y, until: this.time + CAT_TIMES.sniffAfter + CAT_TIMES.sniff }
  }

  /** The straw dents the water: it bats at the dent with its free paw. */
  batAt(x: number, y: number): void {
    const dx = x - HOME[1].x, dy = y - HOME[1].y, far = Math.hypot(dx, dy) || 1, reach = Math.min(far, 150)
    this.bat = { x: HOME[1].x + (dx / far) * reach, y: HOME[1].y + (dy / far) * reach, until: this.time + CAT_TIMES.bat }
    this.caught = { x, y, until: this.time + 1 }
  }

  /** A hop, as when the sheet is pulled from under it. */
  hop(): void {
    this.hopping.kick(520)
  }

  /** The paw shaken after a dab, with nothing on it. */
  shake(): void {
    this.pose.tint = WATER
    this.pose.tintPaw = 1
    this.shakeUntil = this.time + CAT_TIMES.shake
  }

  private start(strength: number): void {
    this.whiskers.kick(10 * strength)
    this.earsFlat = this.time + 0.45 * strength
    this.tongueBack = this.time + 1.6 + this.rng.next() * 1.4
  }

  /**
   * Plays `dt` seconds. `finger` is where a finger is down on the stage, or null; `orange` and `brown` are the
   * shares of the water those two colours hold, 0 to 1.
   */
  step(dt: number, finger: { x: number; y: number } | null, orange: number, brown: number): void {
    if (dt <= 0) return
    this.time += dt
    const pose = this.pose, now = this.time, told = this.direction
    this.stir = Math.max(0, this.stir - dt * 0.42)
    const hunting = now < this.huntUntil, sniffing = this.sniffFrom > 0 && now >= this.sniffFrom && now < this.sniffFrom + CAT_TIMES.sniff
    if (this.sniffFrom > 0 && now >= this.sniffFrom + CAT_TIMES.sniff) this.sniffFrom = 0

    // The bubble on its nose grows, and bursts with a pop.
    let bubble = 0
    if (this.bubbleFrom > 0) {
      bubble = (now - this.bubbleFrom) / CAT_TIMES.bubble
      if (bubble >= 1) {
        bubble = 0
        this.bubbleFrom = 0
        this.sounds.push(popVoice(this.said++))
        this.start(0.6)
      }
    }
    pose.bubble = bubble
    pose.cross += ((bubble > 0 ? 1 : 0) - pose.cross) * Math.min(1, dt * 9)

    // The sneeze after the wind.
    if (this.sneezeAt > 0 && now >= this.sneezeAt) {
      this.sneezeAt = 0
      this.squash.kick(-4.5)
      this.mouth.kick(7)
      this.sounds.push(sneezeVoice())
    }
    // The wind is heard for as long as it shows: one rush after another while the straw is held on the cat.
    if (this.blown && now >= this.nextWind) {
      this.sounds.push(windVoice(this.said++))
      this.nextWind = now + WIND_EVERY
    }
    pose.wind += ((this.blown ? 1 : 0) - pose.wind) * Math.min(1, dt * 12)

    // Where it looks: where a scene says, the finger, what caught its eye, then a slow wander over the water
    // with, now and then, a look at the bird.
    if (this.caught && now >= this.caught.until) this.caught = null
    if (now >= this.wander.until) {
      const atBird = below(this.rng, 7) === 0
      this.wander = atBird
        ? { x: (SILL.from + SILL.to) / 2, y: SILL.y - 20, until: now + 0.8 + this.rng.next() * 0.8 }
        : { x: POOL.x + POOL.w * (0.15 + 0.7 * this.rng.next()), y: POOL.y + POOL.h * (0.1 + 0.6 * this.rng.next()), until: now + 1.2 + this.rng.next() * 2.2 }
    }
    const target = told?.look ?? finger ?? this.caught ?? this.wander
    const dx = (target.x - CAT.head.x) / 320, dy = (target.y - (CAT.head.y - 10)) / 260
    pose.lookX = clamp(this.lookX.step(dt, clamp(dx, -1, 1)), -1.15, 1.15)
    pose.lookY = clamp(this.lookY.step(dt, clamp(dy, -0.6, 1)), -0.7, 1.15)
    pose.turn = clamp(this.turn.step(dt, clamp(dx, -1, 1) * 0.8), -1, 1)
    pose.pupil = clamp(this.pupil.step(dt, told?.pupil ?? (hunting ? 1 : 0.62 + 0.3 * this.stir)), 0.5, 1)

    // The lids: a blink, a double blink, or one long slow one; nearly shut while it is stroked or smug, shut in the wind.
    let lid = this.stroked > 0.2 ? 0.82 : 0.55 * pose.smug
    const blink = this.blink
    if (now >= blink.at) {
      const t = (now - blink.at) / blink.seconds
      if (t >= blink.shuts) {
        const kind = below(this.rng, 6)
        this.blink = { at: now + 1.8 + this.rng.next() * 3.6, shuts: kind === 0 ? 2 : 1, seconds: kind === 1 ? 0.9 : 0.16 }
      } else lid = Math.max(lid, Math.sin((t % 1) * Math.PI))
    }
    pose.lid = Math.max(lid, pose.wind)

    // The ears: each twitches in its own time, one turns to a sound, both go back at a start and in the wind.
    if (now >= this.nextEar) {
      if (below(this.rng, 2) === 0) this.earLeft.kick(-7)
      else this.earRight.kick(-6)
      this.nextEar = now + 1.4 + this.rng.next() * 3.8
    }
    if (this.listening && now >= this.listening.until) this.listening = null
    const flat = now < this.earsFlat || this.blown ? 0.9 : 0
    pose.earLeft = this.earLeft.step(dt, flat || (this.listening?.left ? -0.5 : hunting ? -0.4 : 0))
    pose.earRight = this.earRight.step(dt, flat || (this.listening && !this.listening.left ? -0.5 : hunting ? -0.4 : 0))

    // The tail keeps its own time, faster the more stirred up the cat is, with a flick of the tip now and then.
    this.tailPhase += dt * (1.15 + 3.1 * Math.max(this.stir, hunting ? 1 : 0))
    pose.tail = Math.sin(this.tailPhase) * (0.3 + 0.6 * this.stir)
    if (now >= this.nextFlick) {
      this.tailTip.kick(below(this.rng, 2) === 0 ? 9 : -9)
      this.nextFlick = now + 2 + this.rng.next() * 3.5
    }
    pose.tailTip = clamp(this.tailTip.step(dt, 0), -1.4, 1.4)
    pose.breath = Math.sin(now * 1.7)
    pose.wiggle = hunting ? Math.sin(now * 17) : 0

    // Its tastes: in to orange, away from brown with its nose wrinkled and its tongue right out.
    const muddy = clamp(brown / 0.2, 0, 1), fond = clamp(orange / 0.3, 0, 1)
    pose.wrinkle += ((told?.wrinkle ?? muddy) - pose.wrinkle) * Math.min(1, dt * 5)
    const leaning = told?.lean ?? clamp(fond - muddy + 0.5 * this.stroked + (sniffing ? 0.8 : 0) - 0.7 * pose.wind, -1, 1)
    pose.lean = clamp(this.lean.step(dt, leaning), -1.2, 1.2)
    const tongueOut = told?.lick ?? (now < this.tongueBack || bubble > 0 ? 0 : muddy > 0.5 ? 1 : 0.25)
    pose.tongue = clamp(this.tongue.step(dt, tongueOut), 0, 1.1)
    pose.tilt = clamp(this.tilt.step(dt, told?.tilt ?? 0), -1, 1)
    pose.claws = clamp(pose.claws + ((told?.claws ?? 0) - pose.claws) * Math.min(1, dt * 9), 0, 1)

    pose.squash = clamp(this.squash.step(dt, 0), -0.5, 0.5)
    pose.mouth = clamp(this.mouth.step(dt, 0), 0, 1)
    pose.whiskers = clamp(this.whiskers.step(dt, -0.9 * pose.wind), -1, 1)
    pose.hop = Math.max(0, this.hopping.step(dt, 0))
    pose.ruffle = Math.max(0, pose.ruffle - dt * 0.45)

    // Combed, it sits up smug for a while, and then its fur is its own again.
    if (pose.parting > 0 && now >= this.combedUntil) pose.parting = Math.max(0, pose.parting - dt * 2)
    pose.smug = clamp(this.smug.step(dt, pose.parting >= 0.5 ? 1 : 0), 0, 1)

    // The paws: on the rim, where a scene puts them, batting at a dent, or shaking.
    if (this.bat && now >= this.bat.until) this.bat = null
    const shaking = now < this.shakeUntil
    if (!shaking && this.shakeUntil > 0) {
      this.shakeUntil = 0
      pose.tint = WATER
    }
    const wobble = shaking ? Math.sin(now * 46) * 13 : 0
    const left = told?.pawL ?? this.hold?.pawL ?? HOME[0], right = told?.pawR ?? this.bat ?? this.hold?.pawR ?? HOME[1]
    const shakes = shaking ? pose.tintPaw : -1
    pose.pawLX = this.paws[0].step(dt, left.x) + (shakes === 0 ? wobble : 0)
    pose.pawLY = this.paws[1].step(dt, left.y - (shakes === 0 ? 22 : 0))
    pose.pawRX = this.paws[2].step(dt, right.x) + (shakes === 1 ? wobble : 0)
    pose.pawRY = this.paws[3].step(dt, right.y - (shakes === 1 ? 22 : 0))

    // It purrs while it is stroked or combed smooth, and over water that is mostly its own colour.
    const purring = this.stroked > 0.2 || fond > 0.9 || pose.smug > 0.6
    if (purring && now >= this.nextPurr && !told) {
      this.sounds.push(purrVoice(this.said++))
      this.nextPurr = now + 0.42
    }
    this.stroked = Math.max(0, this.stroked - dt * 0.8)
  }
}

/** How the cat takes a picture, by its chief colour: `fond` of orange, `sour` at brown, `plain` at anything else. */
export function tasteFor(colour: number, share: number): 'fond' | 'sour' | 'plain' {
  if (colour === ORANGE && share >= 0.5) return 'fond'
  if (colour === BROWN && share >= 0.5) return 'sour'
  return 'plain'
}

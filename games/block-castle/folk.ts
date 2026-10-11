import { FOLK, type Who } from './layout'
import { Spring, clamp01, smooth } from './motion'
import { below, type Rng } from './rng'

// The three folk, as numbers. Pure: the view maps a pose onto each one's
// meshes. Every one of them moves like himself (ART.md, "The characters and
// their fixed tastes"): the king is slow and heavy and rocks on his round
// base, the cook is quick and bounces on his point, the dragon is slowest of
// all and breathes like bellows. No two share a motion; the test beside this
// file holds that.

export const WHO: readonly Who[] = ['king', 'cook', 'dragon']

/** How many scale rings the dragon has from nose to tail. */
export const DRAGON_RINGS = 9

export type FolkPose = {
  /** Height off the floor, from a hop or a bounce. */
  y: number
  /** A lean to the side, in radians. */
  lean: number
  /** A nod forward (positive) or back, in radians. */
  nod: number
  /** Height as a share of his own; under 1 is squashed. */
  squash: number
  /** Where the pupils sit in the eyes, each from -1 to 1: to his left and right, and down and up. */
  gazeX: number
  gazeY: number
  /** The eyelids: 0 wide open, 1 shut. */
  lid: number
  /** The brows: -1 pulled down, 1 raised. */
  brow: number
  /** The mouth: how wide and how far open, each 0 to 1. */
  mouthWide: number
  mouthOpen: number
  /**
   * His funniest part. The king: how far his crown has dropped over his eyes,
   * 0 to 1. The cook: how high his cap has popped off his head, in units.
   * The dragon: unused.
   */
  prop: number
  /** The crown's or the cap's tilt, in radians. */
  propTilt: number
  /**
   * What he holds. The king: how high he stretches his cushion, 0 to 1. The
   * cook: the turn of his spoon in the pot, in radians, running on. The
   * dragon: the swing of his tail tip, in radians.
   */
  hold: number
  /** The dragon's scales: how far each ring is ruffled open, 0 to 1, nose first. Empty for the others. */
  ruffle: number[]
}

function blankPose(who: Who): FolkPose {
  return { y: 0, lean: 0, nod: 0, squash: 1, gazeX: 0, gazeY: 0, lid: 0, brow: 0, mouthWide: 0.5, mouthOpen: 0, prop: 0, propTilt: 0, hold: 0, ruffle: who === 'dragon' ? new Array<number>(DRAGON_RINGS).fill(0) : [] }
}

/** What sets one of the folk off. `strength` is 0 to 1. */
export type Stir = 'knock' | 'taste' | 'poke'

type One = {
  who: Who
  pose: FolkPose
  /** Seconds this one has been alive, on game time. */
  age: number
  /** What he looks at, in the room. */
  look: [number, number, number]
  /** Where he is in the room: his foot and the height of his eyes. He is at his day place until told otherwise. */
  where: [number, number, number]
  gazeX: number
  gazeY: number
  /** The blink: seconds until the next one, and how far through the one that is running, or -1. */
  blinkIn: number
  blinking: number
  /** The last thing that set him off, how long ago, and how strongly. */
  stir: Stir | null
  since: number
  strength: number
  /** His small idle doings: which is running (-1 for none), how far through it, and when the next comes. */
  doing: number
  doingFor: number
  nextDoing: number
  lastDoing: number
  hop: Spring
  /** The cook's cap, the king's crown wobble. */
  propSpring: Spring
  askew: number
  /** The cook's spoon runs on; this is how far it has turned. */
  stirred: number
}

const BLINK: Record<Who, { every: [number, number]; lasts: number }> = {
  king: { every: [3, 6], lasts: 0.24 },
  cook: { every: [1.4, 3.4], lasts: 0.11 },
  dragon: { every: [5, 9], lasts: 0.55 },
}

/** How fast each one's eyes follow, per second: the cook's dart, the dragon's drift. */
const EYE_SPEED: Record<Who, number> = { king: 5, cook: 16, dragon: 2.6 }

/** How long each small idle doing lasts, in seconds; each of the folk has two of his own. */
const DOING_SECONDS: Record<Who, [number, number]> = { king: [2.2, 1.6], cook: [1.2, 0.9], dragon: [2.8, 3.4] }

const bump = (t: number): number => Math.sin(clamp01(t) * Math.PI)

/** How far the king leans as he wobbles on the tip of a roof or a pole, in radians: his everyday rocking is 0.05. */
export const KING_WOBBLE = 0.16

/** How far the dragon's head can lift and his mouth open, in radians, where he lies with his nose under a gate. */
export const GATE_GAPE = 0.25

/**
 * How the dragon's head and his jaw are turned for a pose, in radians up
 * from lying flat: the head about his neck, the jaw against the head. `home`
 * is 1 on his pillow and 0 away from it. At home his chin sinks into his pillow as he nods and yawns. Out on the
 * ground under a gate his chin cannot go down and the hole leaves little
 * room over him: his head lifts a little, his mouth opens that far, and his
 * jaw stays level.
 */
export function dragonHead(pose: FolkPose, home: number): { head: number; jaw: number } {
  const gape = pose.mouthOpen * 0.75
  const small = Math.min(gape, GATE_GAPE)
  const out = Math.max(Math.min(Math.max(-pose.nod, 0), GATE_GAPE), small)
  // On his way from the one to the other, between the two.
  return { head: out + (-pose.nod - out) * home, jaw: -small + (small - gape) * home }
}

export class Folk {
  private readonly all: Record<Who, One>
  /** The cook has no room this evening and cooks in the open: he frowns into his pot. */
  private sulking = false
  private sulk = 0
  /** The king sits on the point of a roof or the tip of a pole: he wobbles there. */
  private tipped = false
  private wobble = 0

  constructor(private readonly rng: Rng) {
    const make = (who: Who): One => ({
      who, pose: blankPose(who), age: 0, look: [0, 1, 0], where: [FOLK[who].x, FOLK[who].eyes, FOLK[who].z], gazeX: 0, gazeY: 0,
      blinkIn: this.between(BLINK[who].every), blinking: -1,
      stir: null, since: 99, strength: 0,
      doing: -1, doingFor: 0, nextDoing: 5 + this.rng.next() * 6, lastDoing: -1,
      hop: new Spring(0, who === 'cook' ? 260 : 130, who === 'cook' ? 14 : 12),
      propSpring: new Spring(0, who === 'cook' ? 90 : 160, who === 'cook' ? 7 : 9),
      askew: 0, stirred: 0,
    })
    this.all = { king: make('king'), cook: make('cook'), dragon: make('dragon') }
  }

  private between(range: readonly [number, number]): number {
    return range[0] + this.rng.next() * (range[1] - range[0])
  }

  pose(who: Who): FolkPose {
    return this.all[who].pose
  }

  /** What one of the folk looks at from now on: a point in the room. */
  lookAt(who: Who, x: number, y: number, z: number): void {
    const look = this.all[who].look
    look[0] = x; look[1] = y; look[2] = z
  }

  /** Where he stands now, so his eyes turn the right way from there. `y` is the height of the point he stands on. */
  stand(who: Who, x: number, y: number, z: number): void {
    const where = this.all[who].where
    where[0] = x; where[1] = y + FOLK[who].eyes - FOLK[who].y; where[2] = z
  }

  /** The cook cooks in the open this evening, with no room to his taste: he frowns into his pot until told otherwise. */
  frown(on: boolean): void {
    this.sulking = on
  }

  /** The king sits on the very tip of something this evening, a roof point or a pole: he wobbles until told otherwise. */
  perch(on: boolean): void {
    this.tipped = on
  }

  /** Something set him off. A stronger stir replaces a weaker one that is still running; a poke always wins. */
  stir(who: Who, what: Stir, strength = 1): void {
    const one = this.all[who]
    if (what !== 'poke' && one.stir === 'poke' && one.since < 0.6) return
    if (what === 'knock' && one.stir === 'taste' && one.since < 0.9) return
    one.stir = what
    one.since = what === 'knock' && who === 'dragon' ? -0.15 : 0
    one.strength = clamp01(strength)
    one.doing = -1
    if (who === 'cook') {
      one.hop.velocity += what === 'poke' ? 3.4 : 1.6 + 1.2 * one.strength
      one.propSpring.velocity += what === 'poke' ? 4.2 : 2 + 1.6 * one.strength
      one.askew = (this.rng.next() < 0.5 ? -1 : 1) * (0.25 + 0.3 * this.rng.next())
    }
    if (who === 'king' && what === 'poke') one.propSpring.velocity += 5
  }

  step(dt: number): void {
    for (const who of WHO) this.stepOne(this.all[who], dt)
  }

  private stepOne(one: One, dt: number): void {
    const { who, pose } = one
    one.age += dt
    one.since += dt
    one.hop.step(dt)
    one.propSpring.step(dt)
    if (one.hop.value < 0) { one.hop.value = 0; one.hop.velocity = Math.abs(one.hop.velocity) * 0.3 }

    // The eyes: toward what he looks at, at his own speed.
    const place = FOLK[who]
    const dx = one.look[0] - one.where[0], dy = one.look[1] - one.where[1], dz = one.look[2] - one.where[2]
    const flat = Math.hypot(dx, dz) || 1
    // The side of his own face the thing is on: turn the direction into his frame.
    const cos = Math.cos(place.faces), sin = Math.sin(place.faces)
    const side = (dx * cos - dz * sin) / flat
    const wantX = Math.max(-1, Math.min(1, side * 1.3))
    // On the screen a thing further back stands higher, so his eyes go up for it as well as for a thing above him.
    const wantY = Math.max(-1, Math.min(1, (dy * 1.2 - dz * 0.55) / flat))
    const follow = 1 - Math.exp(-EYE_SPEED[who] * dt)
    one.gazeX += (wantX - one.gazeX) * follow
    one.gazeY += (wantY - one.gazeY) * follow

    // The blink.
    if (one.blinking >= 0) {
      one.blinking += dt / BLINK[who].lasts
      if (one.blinking >= 1) one.blinking = -1
    } else {
      one.blinkIn -= dt
      if (one.blinkIn <= 0) {
        one.blinking = 0
        one.blinkIn = this.between(BLINK[who].every)
      }
    }
    const blink = one.blinking >= 0 ? bump(one.blinking) : 0

    // A small idle doing now and then, never the same twice running.
    if (one.doing >= 0) {
      one.doingFor += dt / DOING_SECONDS[who][one.doing]
      if (one.doingFor >= 1) one.doing = -1
    } else if (one.since > 2.5) {
      one.nextDoing -= dt
      if (one.nextDoing <= 0) {
        one.doing = one.lastDoing < 0 ? below(this.rng, 2) : 1 - one.lastDoing
        one.lastDoing = one.doing
        one.doingFor = 0
        one.nextDoing = 7 + this.rng.next() * 6
      }
    }
    const doingA = one.doing === 0 ? one.doingFor : -1
    const doingB = one.doing === 1 ? one.doingFor : -1

    const t = one.age
    const s = one.since
    const knock = one.stir === 'knock' && s >= 0 ? one.strength : 0
    const taste = one.stir === 'taste' ? 1 : 0
    const poke = one.stir === 'poke' ? 1 : 0

    pose.gazeX = one.gazeX
    pose.gazeY = one.gazeY
    pose.propTilt = 0
    pose.prop = 0
    pose.hold = 0

    if (who === 'king') {
      // Slow and heavy: he rocks on his round base and breathes deep.
      pose.lean = 0.05 * Math.sin(t * 1.85) + 0.012 * Math.sin(t * 0.7)
      pose.nod = 0.015 * Math.sin(t * 0.93 + 1)
      // On the tip of a roof or a pole he wobbles: round and round, slower and three times as far as he rocks,
      // catching himself now and then.
      this.wobble += ((this.tipped ? 1 : 0) - this.wobble) * (1 - Math.exp(-3 * dt))
      const catches = 0.75 + 0.25 * Math.sin(t * 0.47)
      pose.lean += KING_WOBBLE * this.wobble * catches * Math.sin(t * 1.15)
      pose.nod += KING_WOBBLE * 0.6 * this.wobble * catches * Math.cos(t * 1.15)
      pose.squash = 1 + 0.018 * Math.sin(t * 1.4)
      pose.lid = blink
      pose.brow = 0.1
      pose.mouthWide = 0.45
      pose.mouthOpen = 0
      pose.hold = 0.12 + 0.04 * Math.sin(t * 1.4)
      // A knock: the crown drops over his eyes, he holds still a moment, then hops it back up.
      if (knock) {
        const drop = smooth(s / 0.14), back = smooth((s - 0.75) / 0.22)
        pose.prop = knock * (drop - back) - 0.12 * knock * bump((s - 0.97) / 0.3)
        pose.brow = 0.1 - knock * (drop - back)
        pose.mouthOpen = 0.5 * knock * (drop - smooth((s - 0.9) / 0.3))
        pose.mouthWide = 0.45 - 0.2 * knock * (drop - back)
        if (s >= 0.72 && s - dt < 0.72) one.hop.velocity += 2.2 * knock
        pose.squash -= 0.1 * knock * bump((s - 0.55) / 0.3)
      }
      // To his taste: he stretches up tall with his cushion as high as it goes, and beams.
      if (taste) {
        const up = smooth(s / 0.3) - smooth((s - 1.5) / 0.5)
        pose.hold += 0.85 * up
        pose.squash += 0.1 * up
        pose.brow = 0.1 + 0.8 * up
        pose.mouthWide = 0.45 + 0.5 * up
        pose.mouthOpen = 0.35 * up
        pose.gazeY = Math.min(1, pose.gazeY + 0.3 * up)
      }
      // A poke: he sinks, puffs up, and frowns, and his crown rattles.
      if (poke) {
        const sink = bump(s / 0.25), puff = bump((s - 0.2) / 0.7)
        pose.squash += -0.14 * sink + 0.07 * puff
        pose.brow = 0.1 - 0.9 * (smooth(s / 0.1) - smooth((s - 1.1) / 0.4))
        pose.mouthWide = 0.3
        pose.mouthOpen = 0.25 * bump(s / 0.5)
        pose.lean += 0.08 * Math.sin(s * 9) * Math.exp(-s * 2.2)
      }
      pose.propTilt = 0.12 + one.propSpring.value * 0.25 + 0.02 * Math.sin(t * 1.85 + 0.6)
      // Doing A: he rolls his eyes up to his crown and it slips a little. Doing B: he pumps the cushion twice.
      if (doingA >= 0) {
        pose.gazeY = pose.gazeY + (1 - pose.gazeY) * bump(doingA)
        pose.brow = 0.1 + 0.7 * bump(doingA)
        pose.prop += 0.3 * smooth((doingA - 0.35) / 0.2) * (1 - smooth((doingA - 0.8) / 0.2))
      }
      if (doingB >= 0) pose.hold += 0.3 * Math.abs(Math.sin(doingB * Math.PI * 2))
    } else if (who === 'cook') {
      // Quick and light: he bounces on his point and stirs without stopping.
      const beat = Math.abs(Math.sin(t * 3.4))
      pose.lean = 0.03 * Math.sin(t * 3.4)
      pose.nod = 0.05 + 0.02 * Math.sin(t * 6.8)
      pose.squash = 1 - 0.03 * (1 - beat)
      pose.lid = blink
      // With no room he frowns into his pot: brows down, mouth small, eyes on the pot. What sets him off still shows.
      this.sulk += ((this.sulking ? 1 : 0) - this.sulk) * (1 - Math.exp(-4 * dt))
      pose.brow = 0.3 - 1.1 * this.sulk
      pose.mouthWide = 0.55 - 0.3 * this.sulk
      pose.mouthOpen = 0.08
      pose.gazeX *= 1 - 0.8 * this.sulk
      pose.gazeY += (-0.8 - pose.gazeY) * 0.8 * this.sulk
      pose.nod += 0.1 * this.sulk
      let speed = 3.2 - 1.4 * this.sulk
      if (knock) {
        const jolt = Math.exp(-s * 3)
        pose.brow = 0.3 + 0.7 * knock * jolt
        pose.mouthOpen = 0.08 + 0.7 * knock * jolt
        pose.mouthWide = 0.55 - 0.3 * knock * jolt
        speed += 9 * knock * jolt
      }
      // To his taste: he stirs as fast as he can, grinning.
      if (taste) {
        const on = smooth(s / 0.2) - smooth((s - 1.8) / 0.4)
        speed += 11 * on
        pose.mouthWide = 0.55 + 0.45 * on
        pose.mouthOpen = 0.3 * on
        pose.brow = 0.3 + 0.5 * on
        pose.nod += 0.12 * on
      }
      // A poke: he squeaks, jumps, and spins his spoon.
      if (poke) {
        const jolt = Math.exp(-s * 2.4)
        pose.mouthOpen = 0.9 * jolt
        pose.mouthWide = 0.3
        pose.brow = 1 * jolt + 0.3 * (1 - jolt)
        speed += 16 * jolt
        pose.lean += 0.2 * Math.sin(s * 14) * jolt
      }
      // Doing A: he tastes from the spoon and smacks. Doing B: he sniffs deep over the pot.
      if (doingA >= 0) {
        speed = 0.4
        pose.nod += 0.2 * bump(doingA)
        pose.mouthOpen = 0.5 * Math.abs(Math.sin(doingA * Math.PI * 4)) * bump(doingA)
        pose.lid = Math.max(pose.lid, 0.8 * bump(doingA))
      }
      if (doingB >= 0) {
        pose.nod += 0.32 * bump(doingB)
        pose.squash += 0.06 * bump(doingB * 2 - 0.3)
        pose.brow = 0.3 + 0.6 * bump(doingB)
      }
      one.stirred += speed * dt
      pose.hold = one.stirred
      // The cap pops off his head and lands back askew, then creeps straight.
      pose.prop = Math.max(0, one.propSpring.value)
      one.askew *= Math.exp(-dt * 0.8)
      pose.propTilt = one.askew
    } else {
      // Slowest of all: he breathes like bellows, his lids half down, his tail tip swinging.
      const breath = Math.sin(t * 0.75)
      pose.lean = 0
      pose.nod = 0.03 * breath
      pose.squash = 1 + 0.05 * breath
      // He has no brows and one shape of mouth: his lids and his jaw say it all.
      pose.lid = Math.max(blink, 0.45)
      pose.mouthOpen = 0
      pose.hold = 0.35 * Math.sin(t * 0.9) + 0.1 * Math.sin(t * 2.3)
      let wave = -1
      if (knock) {
        // A beat late, one eye-widening look, and his scales ruffle from nose to tail.
        const wake = smooth(s / 0.25) - smooth((s - 1.2) / 0.6)
        pose.lid = Math.max(blink, 0.45 - 0.4 * knock * wake)
        wave = s
      }
      if (taste) {
        // A huge yawn toward it.
        const yawn = smooth(s / 0.5) - smooth((s - 1.5) / 0.6)
        pose.mouthOpen = yawn
        pose.nod = 0.03 * breath - 0.3 * yawn
        pose.lid = Math.max(blink, 0.45 + 0.5 * yawn)
      }
      if (poke) {
        const yawn = smooth(s / 0.4) - smooth((s - 1.1) / 0.5)
        pose.mouthOpen = yawn
        pose.nod = 0.03 * breath - 0.22 * yawn
        pose.lid = Math.max(blink, 0.45 + 0.5 * yawn)
        pose.hold += 0.7 * Math.sin(s * 8) * Math.exp(-s * 1.5)
        wave = s
      }
      // Doing A: a yawn of his own. Doing B: he nuzzles down into his pillow, eyes shut.
      if (doingA >= 0) {
        const yawn = bump(doingA)
        pose.mouthOpen = Math.max(pose.mouthOpen, yawn)
        pose.nod -= 0.25 * yawn
        pose.lid = Math.max(pose.lid, 0.45 + 0.5 * yawn)
      }
      if (doingB >= 0) {
        pose.nod += 0.2 * bump(doingB)
        pose.lid = Math.max(pose.lid, bump(doingB))
        pose.lean = 0.06 * Math.sin(doingB * Math.PI * 4) * bump(doingB)
      }
      for (let ring = 0; ring < DRAGON_RINGS; ring++) {
        const breathes = 0.08 * (0.5 + 0.5 * Math.sin(t * 0.75 - ring * 0.5))
        pose.ruffle[ring] = wave < 0 ? breathes : Math.max(breathes, one.strength * bump((wave - ring * 0.07) / 0.5))
      }
    }
    // The cook is never quite still on his point.
    pose.y = one.hop.value + (who === 'cook' ? 0.07 * Math.abs(Math.sin(t * 3.4)) : 0)
  }
}

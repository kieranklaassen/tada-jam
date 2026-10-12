// How things move, as numbers. Everything here is a pure function of seconds on the world's own clock: the
// seconds since a thing was turned over, or the seconds the world has played. The view maps the numbers onto
// paper; nothing here draws, and nothing reads another clock.
//
// The dolls, the horse and the cat each move like themselves: their own tempo, their own blink, and one habit
// nobody shares (pack: game-design, characters-with-opinions.md). The arches, the silk, the basket and the mat
// are plain things with no face and no idle motion: each moves only as the answer to a touch or as a beat of a
// scene.

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const smooth = (t: number): number => { const u = clamp01(t); return u * u * (3 - 2 * u) }
/** 0 outside the stretch from `a` to `b`, and one smooth hump inside it. */
const hump = (t: number, a: number, b: number): number => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI))
/** Seconds into the current round of a habit that comes back every `period` seconds, starting `offset` in. */
const phase = (t: number, period: number, offset: number): number => (((t + offset) % period) + period) % period

// --- An arch turned over ----------------------------------------------------

/** Seconds an arch takes to go over, onto its back or onto its feet. */
export const FLIP = 0.26
/** The horse fully ducked is this much lower, and its back is this high when it stands. */
export const HORSE_CROUCH = 0.5, HORSE_BACK = 114
const ROCK_FIRST = 0.36, ROCK_SHORTER = 0.86, ROCK_WIDE = 0.42, ROCK_SOFTER = 0.72, ROCK_STILL = 0.035

/** The knocks of an arch rocking to rest on its back: seconds after the turn, and how wide the rock still is, 0 to 1. Each is softer and sooner than the last. */
export const ROCK_KNOCKS: readonly { at: number; wide: number }[] = (() => {
  const knocks: { at: number; wide: number }[] = []
  let at = FLIP, gap = ROCK_FIRST, wide = ROCK_WIDE
  while (wide > ROCK_STILL) {
    knocks.push({ at, wide: wide / ROCK_WIDE })
    at += gap; gap *= ROCK_SHORTER; wide *= ROCK_SOFTER
  }
  return knocks
})()

/** How far an arch has turned, in radians: 0 on its feet, half a turn on its back, and the rock on top of that while it comes to rest. */
export function archAngle(since: number, turned: boolean): number {
  if (since < FLIP) return Math.PI * (turned ? smooth(since / FLIP) : 1 - smooth(since / FLIP))
  if (!turned) return 0
  for (let i = 0; i < ROCK_KNOCKS.length; i++) {
    const from = ROCK_KNOCKS[i].at, to = i + 1 < ROCK_KNOCKS.length ? ROCK_KNOCKS[i + 1].at : from + ROCK_FIRST * ROCK_SHORTER ** (i + 1)
    if (since < to) return Math.PI + (i % 2 ? -1 : 1) * ROCK_KNOCKS[i].wide * ROCK_WIDE * Math.sin(((since - from) / (to - from)) * Math.PI)
  }
  return Math.PI
}

// --- A doll, the horse and the silk turned over -------------------------------

/** Seconds a doll's hop round takes. */
export const DOLL_TURN = 0.24
/** Which way a doll shows while it hops round: 1 the old way, through 0, to -1 the new way. */
export function dollTurn(since: number): number {
  return Math.cos(Math.PI * smooth(since / DOLL_TURN))
}

/** Seconds the horse's rear takes; its front hooves come down at the end. */
export const REAR = 0.5
/** How far the horse has reared, 0 to 1, and whether it has swung round yet. */
export function horseRear(since: number): { up: number; swung: boolean } {
  return { up: since >= REAR ? 0 : Math.min(smooth(since / 0.18), 1 - smooth((since - 0.36) / (REAR - 0.36))), swung: since >= 0.3 }
}

/** Seconds the silk takes to gather or to open, and the moments of its three pats. */
export const SILK_TURN = 0.36
export const SILK_PATS: readonly number[] = [0, 0.1, 0.2]
/** How gathered the silk is: 0 spread flat, 1 in a heap. */
export function silkHeap(since: number, turned: boolean): number {
  const t = smooth(since / SILK_TURN)
  return turned ? t : 1 - t
}

// --- The characters at rest ---------------------------------------------------

export const CHARACTERS = ['doll-tall', 'doll-round', 'doll-small', 'horse', 'cat'] as const
export type Character = (typeof CHARACTERS)[number]

export type Pose = {
  /** Taller (above 0) or squatter (below 0), as a share of the height. */
  stretch: number
  /** Lean to the side, in radians. */
  lean: number
  /** 0 shut to 1 wide open. */
  eye: number
  /** 0 closed to 1 wide open. */
  mouth: number
  /** -1 a frown to 1 raised. */
  brow: number
  /** The character's own habit, 0 to 1: on tiptoe, a yawn, a duck, a pawing hoof, a stretch. */
  habit: number
  /** Its funniest part, -1 to 1: the hat's tip, the cap, the bobble, the tail. */
  part: number
}

/** What makes each one itself: its tempo, its blink and its habit. No two rows share a number. */
export const PERSONALITY: Record<Character, { breathHz: number; breath: number; sway: number; blinkEvery: number; blink: number; habitEvery: number; habit: number; partHz: number; rest: number }> = {
  'doll-tall': { breathHz: 0.31, breath: 0.012, sway: 0.022, blinkEvery: 3.1, blink: 0.12, habitEvery: 5.3, habit: 1.3, partHz: 2.9, rest: 1 },
  'doll-round': { breathHz: 0.21, breath: 0.034, sway: 0.008, blinkEvery: 6.7, blink: 0.34, habitEvery: 7.1, habit: 1.7, partHz: 0.21, rest: 0.55 },
  'doll-small': { breathHz: 1.13, breath: 0.016, sway: 0.03, blinkEvery: 1.9, blink: 0.08, habitEvery: 4.3, habit: 0.9, partHz: 1.7, rest: 1 },
  horse: { breathHz: 0.27, breath: 0.01, sway: 0.006, blinkEvery: 4.1, blink: 0.16, habitEvery: 6.1, habit: 1.0, partHz: 0.6, rest: 0.9 },
  cat: { breathHz: 0.17, breath: 0.022, sway: 0, blinkEvery: 4.7, blink: 0.5, habitEvery: 11.3, habit: 2.2, partHz: 0.35, rest: 0.7 },
}

/** A character at rest at `t` seconds of the world's clock. Writes into `out` and returns it. */
export function idle(who: Character, t: number, out: Pose): Pose {
  const p = PERSONALITY[who], turn = Math.PI * 2
  const breath = Math.sin(t * p.breathHz * turn)
  const blink = hump(phase(t, p.blinkEvery, p.habitEvery), 0, p.blink)
  const h = phase(t, p.habitEvery, p.blinkEvery * 0.5), habit = hump(h, 0, p.habit)
  out.stretch = breath * p.breath
  out.lean = Math.sin(t * p.breathHz * turn * 0.5 + 1) * p.sway
  out.eye = p.rest * (1 - blink)
  out.mouth = 0
  out.brow = 0
  out.habit = habit
  out.part = Math.sin(t * p.partHz * turn)
  switch (who) {
    case 'doll-tall': // up on tiptoe, looking over everything, the hat's tip quivering
      out.stretch += 0.085 * habit
      out.brow = habit
      out.part *= 0.25 + 0.75 * habit
      break
    case 'doll-round': // a long yawn that tips it back
      out.mouth = habit
      out.eye *= 1 - habit
      out.lean -= 0.07 * habit
      out.brow = -0.3 * habit
      break
    case 'doll-small': // ducks down, pops up and looks both ways
      out.stretch += h < p.habit * 0.4 ? -0.22 * hump(h, 0, p.habit * 0.4) : 0.07 * hump(h, p.habit * 0.4, p.habit)
      out.brow = 0.6 * habit
      out.mouth = 0.35 * hump(h, p.habit * 0.4, p.habit)
      break
    case 'horse': // paws the ground twice
      out.habit = Math.max(hump(h, 0, p.habit * 0.45), hump(h, p.habit * 0.55, p.habit))
      out.lean += 0.02 * out.habit
      break
    case 'cat': // a slow stretch with a yawn in the middle
      out.stretch += 0.05 * habit
      out.mouth = hump(h, p.habit * 0.3, p.habit * 0.7)
      break
  }
  return out
}

export function freshPose(): Pose {
  return { stretch: 0, lean: 0, eye: 1, mouth: 0, brow: 0, habit: 0, part: 0 }
}

import { FOLK, type Who } from './hall'
import type { Craft } from './things'

// What each of the five fair-goers is like: its weight and tempo, its own
// answer to what happens at the bench, how it stands while it waits, how it
// walks, and how it stands with a thing in its hand. Plain numbers; folk.ts
// turns them into movement on the seconds it is stepped by.

export type Taste = 'like' | 'plain' | 'dislike'

/** What a fair-goer holds, as its pose needs it: the craft, the size and the taste it has for it. */
export type Hold = { craft: Craft; size: 0 | 1 | 2; taste: Taste } | null

/** What a fair-goer can see of the bench, each step. */
export type Sight = {
  /** What every eye follows: the candle's tip, the piece in work, or the thing in the child's hand. */
  x: number
  y: number
  /** The size of the piece in work as the tastes read it, and whether nothing has been made of it yet. */
  size: 0 | 1 | 2
  bare: boolean
  /** 0 to 1: how hard the pot bubbles, which it does while a candle melts in it. */
  bubbling: number
  /** Whether the candle is in the wax. */
  dipping: boolean
  /** 0 to 1: how much they are shuffling along to the next place. */
  walking: number
}

/** What happens at the bench that a fair-goer answers. `coat` is one more piece of work on any bench: a coat, a fold, a twig, a line of icing. */
export type Happening = 'knock' | 'gloop' | 'coat' | 'plip' | 'blob' | 'thin' | 'basket' | 'full' | 'flutter'

/** A push given to a body: speeds added to its springs. */
export type Kick = Partial<Record<'dy' | 'lean' | 'squash' | 'part' | 'part2' | 'brow' | 'open' | 'use', number>>

/** Where a body's springs are headed. */
export type Wants = { dy: number; lean: number; squash: number; part: number; part2: number; brow: number; mouth: number; open: number; use: number; eye: number; cross: number; flame: number; shut: number }

/** Weight and tempo, by fair-goer: a heavy body is slow and barely overshoots, a light one bounces. */
export const NATURE: Record<Who, { stiff: number; damp: number; gaze: number; blink: [number, number]; habit: [number, number]; breathHz: number; breath: number }> = {
  maker: { stiff: 38, damp: 7.5, gaze: 4, blink: [3.2, 5.6], habit: [4.5, 7.5], breathHz: 0.22, breath: 5 },
  tuba: { stiff: 150, damp: 20, gaze: 1.6, blink: [5, 8], habit: [5.5, 9], breathHz: 0.3, breath: 1.6 },
  baker: { stiff: 95, damp: 5.5, gaze: 6, blink: [2.2, 4], habit: [4, 7], breathHz: 0.36, breath: 3 },
  bundle: { stiff: 210, damp: 9, gaze: 9, blink: [1.6, 3.2], habit: [2.8, 5.2], breathHz: 0.9, breath: 2.2 },
  goat: { stiff: 120, damp: 13, gaze: 14, blink: [2.6, 6], habit: [3, 6], breathHz: 1.6, breath: 0 },
}

/**
 * Each one's own answer to what happens, in its own body. None of them is an answer to the child: no nod, no
 * clap, no shake of the head. What does not concern one leaves it as it was.
 */
const ANSWERS: Record<Who, Partial<Record<Happening | 'poke', Kick>>> = {
  // Heavy and slow: her fist works and she shifts her weight.
  maker: { coat: { part: 9, lean: -0.5 }, poke: { squash: -1.6, lean: -0.9, brow: 6, open: 5 }, thin: { part: -12, lean: 1.2, dy: 120 }, blob: { part: 14, brow: 5 }, knock: { part: 3 } },
  // Stiff: he goes straight up like a plank, and only his brows and cheeks give him away.
  tuba: { poke: { dy: -520, part: 16, part2: 9, brow: -10 }, coat: { brow: 5 }, gloop: { brow: 2.5 }, blob: { part: 8, brow: 9 }, full: { part2: -5 } },
  // Soft: he wobbles like a jelly, his hat flops and his moustache twitches.
  baker: { poke: { squash: 3.4, part2: 7, open: 9, part: -12 }, gloop: { lean: -1.5, part: 9 }, coat: { squash: 0.9, part: -7 }, basket: { dy: 160, part2: 4, open: 4 }, full: { dy: 160, part2: 4, open: 4 }, blob: { squash: 1.8, open: 8 }, flutter: { part2: -3 } },
  // Light: it hops, sinks into its scarf and pops up again.
  bundle: { coat: { squash: -4.2, dy: -380, part2: 12, part: 8 }, poke: { squash: -7.5, dy: 300, part: -14, part2: -6 }, gloop: { lean: -2.4 }, plip: { part: 5 }, blob: { dy: -300, part2: 10 }, basket: { lean: -3, part2: 8 }, knock: { part2: 5 } },
  // Twitchy: the head tilts, the ears fly and the jaw stops or drops.
  goat: { poke: { lean: 4.2, part2: 30, open: 12, dy: -120 }, plip: { open: 7, part2: 6 }, knock: { part2: 12 }, gloop: { part2: 12 }, blob: { open: 10, lean: -2 }, coat: { lean: 1.2 } },
}

export function answerOf(who: Who, what: Happening | 'poke'): Kick | null {
  return ANSWERS[who][what] ?? null
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
/** One pass of a habit: 0 to 1 over `seconds`, then held at 1. */
const through = (ht: number, seconds: number): number => Math.min(1, ht / seconds)

/**
 * Where a fair-goer's body is headed now: what it makes of the piece in work, its habit while it waits, its
 * gait while it walks, and how it stands with what it holds. `t` is its own seconds, `habit` which of its three
 * habits is playing (-1 for none) and `ht` how far through, `staring` whether something startled it.
 */
export function wantsOf(who: Who, sight: Sight, hold: Hold, t: number, habit: number, ht: number, staring: boolean): Wants {
  const w: Wants = { dy: 0, lean: 0, squash: 1, part: 0, part2: 0, brow: 0, mouth: 0, open: 0, use: 0, eye: 0, cross: 0, flame: 0, shut: 0 }
  const walk = sight.walking, like = hold?.taste === 'like', dislike = hold?.taste === 'dislike'
  switch (who) {
    case 'maker': {
      // Fat pleases her: she draws herself up and grins. At a bare wick or a thin candle she waits, curious, brows up.
      // Her mouth turns down only for a thing in her fist that she dislikes.
      const glad = hold ? (like ? 1 : dislike ? -0.5 : 0.3) : sight.bare ? 0.15 : sight.size === 2 ? 1 : sight.size === 1 ? 0.35 : 0.2
      w.mouth = glad
      w.brow = Math.max(0, glad) * 0.6 + (sight.bare && !hold ? 0.35 : 0) + sight.bubbling * 0.4 + (dislike ? 0.5 : 0)
      w.dy = -glad * 9
      w.part = hold ? 0.9 : 0.25 + Math.max(0, glad) * 0.5 - sight.bubbling * 0.5
      // A large thing in her fist doubles the flame on her hat; a small one droops or is lost in it, and she peers after it.
      w.flame = like ? 1 : 0
      w.use = dislike ? 1 : 0
      w.lean = dislike ? 0.05 : 0
      // She flexes her fist, sways, and the flame on her hat bobs.
      if (habit === 0) w.part += Math.sin(through(ht, 1.1) * Math.PI) * 0.7
      if (habit === 1) w.lean += Math.sin(through(ht, 1.8) * Math.PI * 2) * 0.035
      if (habit === 2) w.part2 += Math.sin(through(ht, 1.4) * Math.PI * 3) * 0.6
      w.lean += Math.sin(t * Math.PI * 2 * 1.1) * 0.05 * walk
      w.dy -= Math.abs(Math.sin(t * Math.PI * 2 * 1.1)) * 6 * walk
      break
    }
    case 'tuba': {
      // Stern by his brows alone: his mouth is a straight line, and turns down only for a red thing in his bell. Gold
      // lifts his brows a little, red drops them, and a round thing over the bell lifts them whatever its colour.
      w.mouth = (sight.size === 2 ? 0.2 : 0) + (dislike ? -0.5 : 0)
      w.brow = -0.5 - sight.bubbling * 0.5 + (sight.size === 2 ? 0.25 : 0) + (like ? 0.3 : dislike ? -0.4 : 0) + (hold?.craft === 'wreath' ? 0.6 : 0)
      w.lean = 0.012
      // He fingers his valves without a sound, fills his cheeks, and taps his empty bell twice, which rocks under
      // the taps. With a thing in the bell his brows jump instead.
      if (habit === 0) w.use += Math.sin(through(ht, 1.2) * Math.PI * 5) * 0.5
      if (habit === 1) w.part += Math.sin(through(ht, 1.6) * Math.PI) * 0.8
      if (habit === 2 && hold) w.brow += Math.sin(through(ht, 0.5) * Math.PI) * 0.7
      if (habit === 2 && !hold) { w.part2 += Math.max(0, Math.sin(through(ht, 0.9) * Math.PI * 4)) * 0.9; w.use += Math.sin(through(ht, 0.9) * Math.PI * 4) * 0.4 }
      w.dy -= (Math.sin(t * Math.PI * 2 * 2.4) > 0 ? 7 : 0) * walk
      break
    }
    case 'baker': {
      // He shifts from foot to foot, peers into the pot when the candle is in it, and goes wide-eyed at bubbles. Red pleases him; green he holds away from himself with his moustache turned down.
      w.lean = Math.sin(t * 0.55) * 0.03 + (sight.dipping ? -0.06 : 0) + (dislike ? 0.1 : 0)
      w.mouth = dislike ? -0.6 : like ? 0.95 : 0.45
      w.brow = 0.2 + sight.bubbling * 0.7 + (like ? 0.4 : 0)
      w.open = sight.bubbling * 0.5
      w.part = dislike ? -1 : like ? 0.6 : 0
      // His moustache twitches, he dusts flour, and he bobs on his heels.
      if (habit === 0) w.part += Math.sin(through(ht, 0.7) * Math.PI * 5) * 0.7
      if (habit === 1) w.part2 += Math.sin(through(ht, 1.5) * Math.PI) * 0.5
      if (habit === 2) w.dy += Math.sin(through(ht, 1.2) * Math.PI * 2) * 5
      w.squash += Math.sin(t * Math.PI * 2 * 2) * 0.06 * walk
      w.lean += Math.sin(t * Math.PI * 2) * 0.04 * walk
      break
    }
    case 'bundle': {
      // It rocks on its heels and leans after the piece in work with its whole body. Small pleases it; a large thing makes it lean away.
      const size = hold ? hold.size : sight.size
      const away = (hold ? dislike : size === 2) ? 1 : 0
      w.lean = Math.sin(t * 2.1) * (0.035 + (dislike ? 0.05 : 0)) + clamp((sight.x - FOLK.bundle.x) / 1600, -0.11, 0.04) * (1 - away) + away * 0.11
      w.brow = sight.bare && !hold ? 0.2 : size === 0 ? 0.9 : size === 1 ? 0.4 : 0.75
      w.squash = 1 - sight.bubbling * 0.12
      w.part2 = hold ? (like ? 0.9 : 0.5) : size === 0 && !sight.bare ? 0.6 : 0.2
      // A star stuck to its brow crosses both eyes.
      w.cross = hold?.craft === 'star' ? 1 : 0
      // A wreath dropped over its hood slides down over its eyes.
      w.use = hold?.craft === 'wreath' ? 1 : 0
      if (habit === 0) w.part += Math.sin(through(ht, 0.8) * Math.PI * 6) * 0.8
      if (habit === 1) w.squash -= Math.sin(through(ht, 1.3) * Math.PI) * 0.22
      if (habit === 2) w.part2 += Math.abs(Math.sin(through(ht, 0.9) * Math.PI * 3)) * 0.7
      w.dy -= Math.abs(Math.sin(t * Math.PI * 2 * 3)) * 22 * walk
      break
    }
    case 'goat': {
      // It chews round and round, stops to stare, and lays its ears back at the bubbling. Green it chews slowly with its eyes shut.
      const chewing = staring || habit === 2 ? 0 : 1, pace = like ? 4 : 10
      w.part = Math.sin(t * pace) * 0.9 * chewing
      w.open = (0.18 + Math.max(0, Math.cos(t * pace)) * 0.3) * chewing
      w.part2 = -sight.bubbling * 0.8 - (dislike ? 0.5 : 0)
      w.lean = Math.sin(t * 0.8) * 0.02
      w.shut = like ? 1 : 0
      if (habit === 0) w.part2 += Math.sin(through(ht, 0.45) * Math.PI * 2) * 0.9
      if (habit === 1) w.lean += Math.sin(through(ht, 1.1) * Math.PI) * 0.14
      if (habit === 2) w.dy += Math.sin(through(ht, 0.9) * Math.PI) * 7
      w.lean += Math.sin(t * Math.PI * 2 * 3.4) * 0.07 * walk
      w.part2 += Math.sin(t * Math.PI * 2 * 3.4) * 0.5 * walk
      break
    }
  }
  return w
}

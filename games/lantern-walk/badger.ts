import { PLACES } from './layout'
import { notice } from './seen'
import { toward, type Wood } from './wood'

// The badger. Its rule is any light on it: it puts the candle out. The light is asked of the whole badger as it is
// drawn (seen.ts): wherever it is shown lit, it answers, and while it rests it starts and looks.
//   yellow, or plain   it puffs its cheeks until its eyes cross and blows it out with one great puff
//   red                it blows a thin stream from the corner of its mouth that bends the flame over
//   blue               it yawns so wide that the yawn itself puts the candle out
// Two wrong uses work as well:
//   a rush   it blows and misses: its cheeks go down with a raspberry and it looks about for the light
//   unlit    it grins with every tooth, lies back and is asleep at once; a tap on the lantern starts it up

export type Badger = {
  mode: 'sit' | 'draw' | 'miss' | 'grin' | 'asleep'
  /** 0 the great puff, 1 the thin stream, 2 the yawn. */
  manner: number
  t: number
  rest: number
  /** 1 as it starts up, falling to 0. */
  start: number
  /** 1 as a snore goes in, falling to 0. */
  snore: number
  /** How full the cheeks are, 0 to 1. */
  breath: number
  /** 1 as the raspberry goes off, falling to 0, and which way it looks about, -1 to 1. */
  raspberry: number
  about: number
  /** A puff from far off that does nothing, for the ending: 1 falling to 0, and the shrug after it. */
  farPuff: number
  shrug: number
  /** Whether the cold lantern was near at the last step: it grins when one comes, not while one stays. Null until the first step. */
  near: boolean | null
  beat: number
  /** 1 as it sees a light it is not answering: a blink and a start, falling to 0. */
  glance: number
  glanceWait: number
  saw: boolean
}

const MANNER = { yellow: 0, plain: 0, red: 1, blue: 2 } as const
/** Seconds the badger takes over each way of blowing: a great puff, a thin stream, a yawn. */
export const BLOW_SECONDS = [0.62, 0.95, 1.15] as const
/** How full the cheeks are when the thin stream has crossed the gap and reached the flame. */
export const STREAM_ARRIVES = 0.5
/** Where its face is: where its breath comes from, and what a lantern that gives no light must come near. */
export const BADGER_FACE = { x: PLACES.badger.x + 12, y: PLACES.badger.y - 168 }

export function freshBadger(): Badger {
  return { mode: 'sit', manner: 0, t: 0, rest: 0, start: 0, snore: 0, breath: 0, raspberry: 0, about: 0, farPuff: 0, shrug: 0, near: null, beat: 0, glance: 0, glanceWait: 0, saw: false }
}

/**
 * How full its cheeks are drawn, 0 to 1. It sits with them half full already: that is what it wants. They fill
 * as it draws breath for the great puff, empty through the corner of its mouth for the thin stream, and are gone
 * in a yawn, a grin, its sleep and a raspberry.
 */
export function cheeksOf(badger: Badger): number {
  if (badger.mode === 'grin' || badger.mode === 'asleep' || badger.raspberry > 0.02) return 0
  if (badger.mode === 'miss') return badger.breath
  if (badger.breath > 0.02 && badger.manner === 2) return 0
  if (badger.breath > 0.02 && badger.manner === 1) return 0.5 * (1 - 0.6 * badger.breath)
  return Math.max(0.5 + 0.5 * badger.breath, badger.farPuff * 0.8)
}

/** The candle was lit again, or a lantern with no window was tapped: the badger starts up. */
export function wakeBadger(w: Wood): void {
  const badger = w.badger
  badger.mode = 'sit'
  badger.start = 1
  badger.rest = 3.2
  badger.t = 0
  badger.breath = 0
  w.sound('grunt')
}

export function stepBadger(w: Wood, dt: number): void {
  const badger = w.badger
  badger.start = Math.max(0, badger.start - dt * 2)
  badger.snore = Math.max(0, badger.snore - dt * 0.7)
  badger.raspberry = Math.max(0, badger.raspberry - dt * 2.4)
  badger.farPuff = Math.max(0, badger.farPuff - dt * 1.6)
  badger.shrug = Math.max(0, badger.shrug - dt * 1.1)
  badger.rest = Math.max(0, badger.rest - dt)
  badger.t += dt
  // The thin stream bends the flame over, away from the badger, from the moment it reaches the lantern; any other breath leaves it upright.
  const stream = badger.mode === 'draw' && badger.manner === 1 ? Math.min(1, Math.max(0, (badger.breath - STREAM_ARRIVES) / 0.3)) : 0
  w.bend = toward(w.bend, stream * (w.lantern.x >= BADGER_FACE.x ? 1 : -1), dt * 8)
  const sight = w.sight.badger
  const light = sight.light
  // Lit and not blowing (it rests after a miss or a start, or it sleeps): it still shows that the light touched it.
  notice(badger, sight.touch !== null && w.shines, badger.mode === 'draw' || badger.mode === 'miss', dt)
  const near = w.darkNear(BADGER_FACE.x, BADGER_FACE.y, 330)
  const came = badger.near === false && near
  badger.near = near

  if (badger.mode === 'sit') {
    badger.breath = Math.max(0, badger.breath - dt * 3)
    badger.about = 0
    if (came && badger.rest <= 0) {
      // A lantern that gives no light has come: every tooth, and asleep at once.
      badger.mode = 'grin'
      badger.t = 1.5
    } else if (badger.rest <= 0 && sight.rush) {
      // It blows where the light was, and misses.
      badger.mode = 'miss'
      badger.manner = 0
      badger.breath = 1
      badger.t = 0
      badger.beat = 0
      w.sound('miss')
    } else if (light && badger.rest <= 0) {
      badger.mode = 'draw'
      badger.manner = MANNER[light]
      badger.t = 0
      badger.breath = 0.03
      w.sound('cheeks', badger.manner / 2)
    }
  } else if (badger.mode === 'miss') {
    if (badger.t > 0.3) badger.breath = Math.max(0, badger.breath - dt * 5)
    if (badger.beat === 0 && badger.t > 0.34) { badger.beat = 1; badger.raspberry = 1; w.sound('raspberry') }
    // And it looks about for the light: left, right, left.
    badger.about = badger.t > 0.6 ? Math.sin((badger.t - 0.6) * 5.2) : 0
    if (badger.t > 2) { badger.mode = 'sit'; badger.rest = 1.5; badger.about = 0 }
  } else if (badger.mode === 'draw') {
    if (!light) {
      // The light left before the breath was drawn: the cheeks go down again.
      badger.mode = 'sit'
      badger.rest = 0.5
      return
    }
    badger.breath = Math.min(1, badger.t / BLOW_SECONDS[badger.manner])
    if (badger.breath >= 1) {
      w.blowOut()
      w.meet('badger')
      badger.mode = 'grin'
      badger.t = 0
      badger.near = true
      w.sound('blow', badger.manner / 2)
    }
  } else {
    badger.breath = Math.max(0, badger.breath - dt * 1.4)
    if (badger.mode === 'grin' && badger.t > 2.2) {
      badger.mode = 'asleep'
      badger.t = 2.4
    }
    if (badger.mode === 'asleep' && badger.t >= 2.4) {
      badger.t = 0
      badger.snore = 1
      w.sound('snore')
    }
  }
}

/** The ending: it blows from far off, nothing happens, and it shrugs. */
export function farBlow(w: Wood): void {
  // Whatever it was at (asleep by a lantern that gave no light, looking about after a miss), it sits up to blow.
  if (w.badger.mode !== 'sit') { w.badger.mode = 'sit'; w.badger.start = 1; w.badger.about = 0; w.badger.breath = 0 }
  w.badger.rest = 3
  w.badger.farPuff = 1
  w.badger.shrug = 1
  w.sound('farBlow')
}

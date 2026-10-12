import { PLACES } from './layout'
import { notice } from './seen'
import { toward, type Wood } from './wood'

// The owl. Its rule is any light, and it turns from each in its own way:
//   yellow, or plain   its head goes away to the left, all the way round, and it hoots once, long
//   red                its head goes upside down and it hoots twice, short
//   blue               it shuts one eye, then the other, and turns away slowly with a hoot that wobbles
// Two wrong uses work as well:
//   a rush   its head spins after the light like a top and springs back, and a feather comes loose
//   unlit    its eyes open to full size and it leans off the branch to peer

export type Owl = {
  away: boolean
  /** 0 the yellow way, 1 the red way, 2 the blue way. */
  manner: number
  yaw: number
  roll: number
  lidLeft: number
  lidRight: number
  /** Seconds since the light left. */
  dark: number
  /** Seconds since it turned away. */
  since: number
  /** The head spinning like a top: how many turns it has left to give back, and seconds into the spin (-1 when it is not spinning). */
  whirl: number
  spun: number
  /** The loose feather: where it is, how it tilts, and seconds since it came loose (-1 when there is none). */
  feather: { x: number; y: number; tilt: number; t: number; down: boolean }
  /** Leaning off the branch to peer, 0 to 1, and the beak's clack, 1 falling to 0. */
  lean: number
  clack: number
  /** Which beat of peering has sounded. */
  beat: number
  peering: number
  rest: number
  /** 1 as it sees a light it is not answering: a blink and a start, falling to 0. */
  glance: number
  glanceWait: number
  saw: boolean
}

const MANNER = { yellow: 0, plain: 0, red: 1, blue: 2 } as const
/** Where the loose feather lands: on the branch beside the owl. */
export const FEATHER_LANDS = { x: PLACES.owl.x + 166, y: 292 }

/** Seconds into its fall a feather whirled up a second time is set: it has less of its seesaw left. */
const FEATHER_AGAIN = 2.2

export function freshOwl(): Owl {
  return { away: false, manner: 0, yaw: 0, roll: 0, lidLeft: 0, lidRight: 0, dark: 0, since: 0, whirl: 0, spun: -1, feather: { x: 0, y: 0, tilt: 0, t: -1, down: false }, lean: 0, clack: 0, beat: 0, peering: -1, rest: 0, glance: 0, glanceWait: 0, saw: false }
}

/** The ending: one long hoot, and the head goes away to the left and comes back, whatever light it last turned from. */
export function hootAway(w: Wood): void {
  const owl = w.owl
  owl.away = true
  owl.manner = 0
  owl.since = 0
  // On the hook the lantern lights nobody: the dark it has sat in since must not turn the head back in the step that turns it away.
  owl.dark = 0
  w.sound('hoot', 0)
}

export function stepOwl(w: Wood, dt: number): void {
  const owl = w.owl
  const at = PLACES.owl
  // The light on it is whatever patch touches any of it as it is drawn (seen.ts).
  const sight = w.sight.owl
  const light = sight.light
  // Lit and not turning from the light (it is spinning, peering or resting): it still shows that the light touched it.
  notice(owl, sight.touch !== null && w.shines, owl.away && owl.spun < 0 && owl.peering < 0, dt)
  owl.since += dt
  owl.rest = Math.max(0, owl.rest - dt)
  owl.clack = Math.max(0, owl.clack - dt * 3)

  // The feather, once loose, seesaws down to the branch and lies there a while.
  const feather = owl.feather
  if (feather.t >= 0) {
    feather.t += dt
    if (!feather.down) {
      feather.y = Math.min(FEATHER_LANDS.y, feather.y + 62 * dt)
      feather.x = FEATHER_LANDS.x + Math.sin(feather.t * 3.1) * 34 * Math.max(0, 1 - feather.t / 3.2)
      feather.tilt = Math.cos(feather.t * 3.1) * 0.7
      if (feather.y >= FEATHER_LANDS.y) {
        feather.down = true
        feather.x = FEATHER_LANDS.x
        feather.tilt = 0.1
        w.sound('feather')
      }
    } else if (feather.t > 9) feather.t = -1
  }

  if (owl.spun >= 0) {
    // Like a top: three turns after the light, and back.
    const before = owl.spun
    owl.spun += dt
    const along = Math.min(1, owl.spun / 1.15)
    owl.whirl = Math.sin(along * Math.PI) * 3
    if (feather.t < 0 && owl.spun > 0.5) {
      feather.t = 0; feather.down = false
      feather.x = FEATHER_LANDS.x; feather.y = at.y - 250
    } else if (before <= 0.5 && owl.spun > 0.5) {
      // Spun again while its feather is still out: the same feather is whirled up off the branch, or caught as it
      // falls, and seesaws down again to land with its tick.
      feather.down = false
      feather.t = FEATHER_AGAIN
      feather.y = Math.min(feather.y, FEATHER_LANDS.y - 64)
    }
    if (along >= 1) { owl.spun = -1; owl.whirl = 0; owl.rest = 1.2 }
    return
  }

  if (owl.peering >= 0) {
    // Its eyes at full size, it leans off the branch at the cold lantern.
    owl.peering += dt
    const near = w.darkNear(at.x, at.y - 150, 330)
    owl.lean = toward(owl.lean, near ? 1 : 0, dt * 2.6)
    if (owl.beat === 0) { owl.beat = 1; owl.clack = 1; w.sound('clack') }
    if (owl.beat === 1 && owl.peering > 0.5) { owl.beat = 2; owl.clack = 0.6; w.sound('hm') }
    if (!near && owl.lean === 0) { owl.peering = -1; owl.rest = 3 }
    return
  }

  if (owl.rest > 0 && sight.rush && owl.glance === 0 && owl.clack === 0) {
    // Rushed in the rest after its last answer: it answers small, a blink and one clack of the beak, never nothing.
    owl.glance = 1
    owl.clack = 0.6
    w.sound('clack')
  }
  if (owl.rest <= 0 && sight.rush) {
    owl.spun = 0
    owl.whirl = 0.02
    owl.away = false
    w.sound('spin')
    return
  }
  if (!light && owl.rest <= 0 && w.darkNear(at.x, at.y - 150, 250)) {
    owl.peering = 0
    owl.beat = 0
    owl.away = false
    return
  }

  if (light) {
    const manner = MANNER[light]
    owl.dark = 0
    if (!owl.away || owl.manner !== manner) {
      owl.away = true
      owl.manner = manner
      owl.since = 0
      w.sound('hoot', manner / 2)
      w.meet('owl')
    }
  } else if (owl.away) {
    owl.dark += dt
    if (owl.dark > 0.9) owl.away = false
  }
  // Yellow: away to the left, all the way round. Red: upside down. Blue: one eye shut, then the other, and slowly away.
  const yaw = owl.away ? (owl.manner === 0 ? -1 : owl.manner === 2 && owl.since > 0.9 ? 1 : 0) : 0
  const roll = owl.away && owl.manner === 1 ? Math.PI : 0
  const lidLeft = owl.away && owl.manner === 2 ? 1 : 0
  const lidRight = owl.away && owl.manner === 2 && owl.since > 0.45 ? 1 : 0
  owl.yaw = toward(owl.yaw, yaw, (owl.manner === 2 && owl.away ? 1.5 : 4.5) * dt)
  const rolled = owl.roll
  owl.roll = toward(owl.roll, roll, 6.5 * dt)
  // Upside down, it hoots twice: once as the head starts over, and again, higher, as it passes the half way.
  if (owl.away && owl.manner === 1 && rolled < Math.PI / 2 && owl.roll >= Math.PI / 2) w.sound('hoot', 0.6)
  owl.lidLeft = toward(owl.lidLeft, lidLeft, 5 * dt)
  owl.lidRight = toward(owl.lidRight, lidRight, 5 * dt)
}

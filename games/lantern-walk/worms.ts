import { FALLEN_WORM, FERN_BOX, WORMS, WORM_BOX, WORM_GROUND, apart, boxAt, foxBox, gap, hedgehogBox, wormPlace } from './layout'
import { RUSH, toward, type Light, type Wood } from './wood'

// The glow-worms. Their rule is blue: each worm the blue touches lights its
// own lamp, one after another, and keeps it lit when the lantern has gone.
// Every other light is a wrong use, and it works:
//   yellow   they blink out of step, and one loses its hold and drops off the fern
//   red      they go out and duck under their leaves, and the leaves lift again to peep
//   a rush   their lamps flick on and off in a wave that runs along the fern
//            (the one rule of a rush: faster than `RUSH`, over a worm or within `RUSH_WIDE` of it)
//   unlit    they let themselves down on threads and hang round the dark lantern
//   plain    they knock on their unlit lamps as if to wake them

export type Worms = {
  /** One bit a worm whose lamp is lit: what the save keeps. */
  lamps: number
  /** For each worm: 1 when it has just lit, falling to 0. */
  pulse: Float32Array
  /** How far each is ducked under its leaf, and which of them the red is on. */
  duck: Float32Array
  red: number
  chimeWait: number
  /** Yellow: which lamps show lit this moment, seconds until each flips, and how long the yellow has been on them. */
  flicker: number
  flip: Float32Array
  muddled: number
  /** The one that dropped off: which (-1 when none), how far it has fallen, and seconds since it landed (-1 in the air). */
  drop: { i: number; y: number; landed: number }
  /** A rush: 1 on each worm as the wave passes it, falling to 0; where the wave is along the fern (-1 when none) and its way. */
  flash: Float32Array
  wave: number
  way: number
  /** How far each has let itself down to the cold lantern, 0 to 1. */
  hang: Float32Array
  /** Plain light: 1 as each knocks on its lamp, falling to 0, and seconds until its own next knock. */
  knock: Float32Array
  knockWait: Float32Array
}

/** Where worm `i` hangs by a cold lantern, from the lantern's middle: at its two sides and under it, clear of the paper, the candle, the pole and the moths' seats on its roof. */
export const HANG_SEATS: readonly (readonly [number, number])[] = [[112, 10], [112, 80], [40, 150], [-88, 80], [-88, 10]]
/** How near the fern a cold lantern must come for them to let themselves down. */
const HANG_NEAR = 230
/** How near a worm's body a light must come to touch it: small.ts shows it whole and in full at the same distance. */
export const WORM_REACH = 26
/** The middle of a worm's body, above where it sits. */
export const WORM_MIDDLE = 10
/** How far a hanging worm keeps from the fox and the hedgehog, so that it is up its thread again before either reaches it. */
const HANG_CLEAR = 50

/** The light worm `i` answers on its fern: that of the topmost patch that touches it, and none while the light rushes. */
export function wormLight(w: Wood, i: number): Light | null {
  if (w.speed > RUSH) return null
  const at = wormPlace(i)
  return w.lightAt(at.x, at.y - WORM_MIDDLE, WORM_REACH)
}

/** Whether worm `i` has room to hang by the cold lantern: its place there is clear of the fox and the hedgehog. */
export function mayHang(w: Wood, i: number): boolean {
  const [sx, sy] = HANG_SEATS[i]
  const room = boxAt(WORM_BOX, w.lantern.x + sx, w.lantern.y + sy)
  // One that hangs already stays until it is a good deal nearer, so a swinging lantern does not send it up and down.
  const clear = w.worms.hang[i] > 0 ? HANG_CLEAR - 24 : HANG_CLEAR
  const fox = foxBox(w.fox.x), hog = hedgehogBox(w.hedgehog.x)
  if (gap(room, fox) < clear || gap(room, hog) < clear) return false
  return true
}
/** How far down its thread a worm is when it is said to hang, and not to be on its way. */
export const HANGS = 0.6
const hangs = { x: 0, y: 0 }
/** Whether worm `i`, where it hangs on its thread now, is on the fox or the hedgehog. */
function onSomebody(w: Wood, i: number): boolean {
  wormAt(w, i, hangs)
  const room = boxAt(WORM_BOX, hangs.x, hangs.y)
  return !apart(room, foxBox(w.fox.x)) || !apart(room, hedgehogBox(w.hedgehog.x))
}

/** Seconds from the plain light reaching a worm to its first knock, and between its knocks after that: each worm its own. */
export const KNOCK_FIRST: readonly number[] = [0.02, 0.21, 0.09, 0.3, 0.15]
export const KNOCK_EVERY: readonly number[] = [0.62, 0.74, 0.53, 0.81, 0.68]

/** How far a ducked worm's leaf comes up again to peep, as the array that holds it stores it. */
const PEEP = Math.fround(0.36)

export function freshWorms(lamps: number): Worms {
  return {
    lamps, pulse: new Float32Array(WORMS), duck: new Float32Array(WORMS), red: 0, chimeWait: 0,
    flicker: 0, flip: new Float32Array(WORMS), muddled: 0, drop: { i: -1, y: 0, landed: -1 },
    flash: new Float32Array(WORMS), wave: -1, way: 1, hang: new Float32Array(WORMS), knock: new Float32Array(WORMS), knockWait: new Float32Array(WORMS),
  }
}

const fernMiddle = { x: (FERN_BOX.left + FERN_BOX.right) / 2, y: (FERN_BOX.top + FERN_BOX.bottom) / 2 }

/** Where worm `i` is now: on the fern, on its way down a thread to the cold lantern, or dropped off and climbing back. */
export function wormAt(w: Wood, i: number, out: { x: number; y: number }): { x: number; y: number } {
  const at = wormPlace(i)
  const worms = w.worms
  out.x = at.x; out.y = at.y
  if (worms.drop.i === i) out.y = at.y + worms.drop.y
  else if (worms.hang[i] > 0) {
    const [sx, sy] = HANG_SEATS[i]
    out.x = at.x + (w.lantern.x + sx - at.x) * worms.hang[i]
    out.y = at.y + (w.lantern.y + sy - at.y) * worms.hang[i]
  }
  return out
}

/** Whether worm `i` shows its lamp lit this moment. */
export function lampShows(w: Wood, i: number): boolean {
  const worms = w.worms
  if (worms.flash[i] > 0.25) return true
  if (worms.muddled > 0 && worms.flip[i] > 0) return ((worms.flicker >> i) & 1) === 1
  return ((worms.lamps >> i) & 1) === 1
}

export function stepWorms(w: Wood, dt: number): void {
  const worms = w.worms
  worms.chimeWait -= dt
  // Once one of them hangs, the lantern may swing a little further off before they climb again: a swing does not send them up and down.
  let hanging = false
  for (let i = 0; i < WORMS; i++) hanging = hanging || worms.hang[i] > 0
  const cold = w.darkNear(fernMiddle.x, fernMiddle.y, HANG_NEAR + (hanging ? 50 : 0))
  let inYellow = 0

  // A rush sets a wave running along the fern after the light.
  let rushed = false
  for (let i = 0; i < WORMS && !rushed; i++) {
    const at = wormPlace(i)
    rushed = worms.hang[i] === 0 && worms.drop.i !== i && w.rushAt(at.x, at.y - WORM_MIDDLE, WORM_REACH)
  }
  if (worms.wave < 0 && rushed) {
    worms.wave = 0
    worms.way = w.grip.vx >= 0 ? -1 : 1
  }
  if (worms.wave >= 0) {
    const before = worms.wave
    worms.wave += dt * 9
    for (let k = Math.ceil(before); k < worms.wave && k < WORMS; k++) {
      if (k < before) continue
      const i = worms.way > 0 ? k : WORMS - 1 - k
      worms.flash[i] = 1
      w.sound('trill', k / (WORMS - 1))
    }
    if (worms.wave > WORMS + 6) worms.wave = -1
  }

  let passed = true
  for (let i = 0; i < WORMS; i++) {
    worms.pulse[i] = Math.max(0, worms.pulse[i] - dt * 1.8)
    worms.flash[i] = Math.max(0, worms.flash[i] - dt * 4)
    worms.knock[i] = Math.max(0, worms.knock[i] - dt * 5)
    // Down the thread one after another, and up again when the lantern is lit or gone.
    const before = worms.hang[i]
    // One that has no room by the lantern, because the fox or the hedgehog stands there, stays on its fern.
    const room = cold && worms.drop.i !== i && mayHang(w, i)
    if (cold && !room) passed = true
    const turn = room && passed
    passed = !cold || !room || worms.hang[i] > 0.45
    worms.hang[i] = toward(before, turn ? 1 : 0, dt * (turn ? 1.5 : 2.2))
    // A lantern carried at the fox or the hedgehog faster than a worm climbs: a worm that has lost its room there and still hangs (more than half way
    // down) is whipped up its thread ahead of them. On its way down to a seat with room it may still cross a corner of the room they take.
    while (!room && worms.hang[i] >= HANGS && onSomebody(w, i)) worms.hang[i] -= 0.04
    if (before < 1 && worms.hang[i] === 1) w.sound('bead', i / (WORMS - 1))
    if (worms.hang[i] > 0 || worms.drop.i === i) continue

    const light = wormLight(w, i)
    const lamp = (worms.lamps >> i) & 1
    const wasRed = (worms.red >> i) & 1

    if (light === 'red') {
      if (!wasRed) {
        // Out, and under the leaf.
        worms.red |= 1 << i
        worms.lamps &= ~(1 << i)
        worms.duck[i] = 1
        w.sound('duck', i / (WORMS - 1))
      } else if (worms.duck[i] > PEEP) {
        // The leaf lifts again, far enough to peep.
        worms.duck[i] = Math.max(PEEP, worms.duck[i] - dt * (0.5 + i * 0.12))
        if (worms.duck[i] === PEEP) w.sound('eep', i / (WORMS - 1))
      }
    } else {
      worms.red &= ~(1 << i)
      worms.duck[i] = Math.max(0, worms.duck[i] - dt * 1.4)
    }

    // One after another, never all at once.
    if (light === 'blue' && !lamp && worms.chimeWait <= 0) {
      worms.lamps |= 1 << i
      worms.pulse[i] = 1
      worms.chimeWait = 0.15
      w.sound('chime', i / (WORMS - 1))
      w.meet('worms')
    }

    if (light === 'yellow') {
      inYellow++
      // A string of lights with a loose wire: each flips when its own count runs out.
      worms.flip[i] -= dt
      if (worms.flip[i] <= 0) {
        worms.flip[i] = 0.16 + 0.34 * w.rng.next()
        worms.flicker ^= 1 << i
        w.sound('click', ((worms.flicker >> i) & 1) * 0.6 + i * 0.08)
      }
    } else {
      // Out of the yellow, what it shows is its own lamp again, so the next flip is always seen.
      worms.flip[i] = 0
      worms.flicker = (worms.flicker & ~(1 << i)) | (lamp << i)
    }

    // Each worm the plain light touches knocks on its own lamp, in its own time: no two keep the same beat.
    if (light === 'plain' && !lamp) {
      worms.knockWait[i] -= dt
      if (worms.knockWait[i] <= 0) {
        worms.knockWait[i] = KNOCK_EVERY[i]
        worms.knock[i] = 1
        w.sound('knock', i / (WORMS - 1))
      }
    } else worms.knockWait[i] = KNOCK_FIRST[i]
  }

  // Muddled long enough, one at an end of the fern loses its hold, where nothing stands below it.
  worms.muddled = inYellow > 0 ? worms.muddled + dt : 0
  const drop = worms.drop
  if (drop.i < 0 && worms.muddled > 1.5) {
    const fox = foxBox(w.fox.x)
    for (const i of [0, WORMS - 1]) {
      const at = wormPlace(i)
      if (drop.i < 0 && wormLight(w, i) === 'yellow' && apart(boxAt(FALLEN_WORM, at.x, WORM_GROUND), fox)) {
        drop.i = i; drop.y = 0; drop.landed = -1
      }
    }
    if (drop.i < 0) worms.muddled = 1.2
  }
  if (drop.i >= 0) {
    const fall = WORM_GROUND - wormPlace(drop.i).y
    if (drop.landed < 0) {
      drop.y = Math.min(fall, drop.y + (220 + drop.y * 3) * dt)
      if (drop.y >= fall) { drop.landed = 0; w.sound('plop') }
    } else {
      drop.landed += dt
      // On its back a moment, then up its own thread again.
      if (drop.landed > 1.1) drop.y = Math.max(0, drop.y - 150 * dt)
      if (drop.y === 0) { drop.i = -1; worms.muddled = 0 }
    }
  }
}

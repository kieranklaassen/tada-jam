import { MINI, bellyLayout } from './belly'
import type { GobblerShape } from './gobblerBuild'
import { TOY_COLOUR, WHITE } from './palette'
import type { GobblerLook, Picture, Shadow, ToyLook } from './picture'
import { RAIL, SHELF, SLOT_Z, STEP, TRAY, WAIT_Z, placeAt, slotX } from './places'
import { rng } from './rng'
import { COLOURS, KINDS, type Toy } from './toys'

// The look spike: the game's real scene, laid out from a fixed seed and alive
// at idle, with nothing to do in it yet. It is what the Mount shows until the
// toy takes its place.

const SEED = 20261003

const LOAD: readonly (Toy & { place: number })[] = [
  { colour: 'red', kind: 'duck', size: 'small', place: 0 },
  { colour: 'blue', kind: 'rocket', size: 'big', place: 1 },
  { colour: 'yellow', kind: 'car', size: 'small', place: 3 },
  { colour: 'yellow', kind: 'duck', size: 'big', place: 5 },
  { colour: 'red', kind: 'car', size: 'big', place: 7 },
  { colour: 'blue', kind: 'duck', size: 'small', place: 8 },
  { colour: 'red', kind: 'rocket', size: 'small', place: 9 },
]

const CREW: GobblerShape[] = COLOURS.map((colour) => ({ width: 10, belly: 12, colour: TOY_COLOUR[colour] }))
const WAITING: GobblerShape[] = KINDS.map((kind) => ({ width: 10, belly: 12, colour: WHITE, model: kind }))

/** The scene at `time` seconds of attended time. */
export function spikePicture(time: number): Picture {
  const random = rng(SEED)
  const toys: ToyLook[] = [], gobblers: GobblerLook[] = [], shadows: Shadow[] = []
  LOAD.forEach((toy, key) => {
    const at = placeAt(toy.place)
    toys.push({ key, toy, x: at.x, y: TRAY.top, z: at.z, squash: 1, leanX: 0, leanZ: 0, scale: 1 })
    shadows.push({ x: at.x, y: TRAY.top, z: at.z, r: toy.size === 'big' ? 3.4 : 2.2, a: 1 })
  })
  const stand = (shape: GobblerShape, id: string, x: number, y: number, z: number, i: number, waiting: boolean) => {
    // Each breathes at its own pace and blinks at its own moments.
    const pace = 0.7 + random() * 0.5, phase = random() * 6
    const untilBlink = (time * (0.21 + i * 0.03) + phase) % 1
    gobblers.push({
      id, shape, x, y, z,
      squash: 1 + 0.018 * Math.sin(time * pace * 2 + phase),
      gazeX: 0.5 * Math.sin(time * 0.6 + phase), gazeY: 0.35 + 0.25 * Math.sin(time * 0.45 + phase * 2),
      blink: untilBlink > 0.96 ? 1 : 0, tongue: 0, leanX: 0, leanZ: 0.02 * Math.sin(time * pace + phase), waiting,
    })
  }
  CREW.forEach((shape, i) => {
    const x = slotX(i, CREW.length)
    stand(shape, `crew-${i}`, x, STEP.top, SLOT_Z, i, false)
    // Its snack, already in the belly: one small duck of its own colour.
    const snack: Toy = { colour: COLOURS[i], kind: 'duck', size: 'small' }
    const at = bellyLayout(shape, [snack])![0]
    toys.push({ key: 100 + i, toy: snack, x: x + at.x, y: STEP.top + at.y, z: SLOT_Z + at.z, squash: 1, leanX: 0, leanZ: 0, scale: MINI })
  })
  WAITING.forEach((shape, i) => stand(shape, `waiting-${i}`, slotX(i, WAITING.length), SHELF.top, WAIT_Z, i + 3, true))
  const sway = 0.035 * Math.sin(time * 1.3)
  const claw = { x: 4, z: 6, length: RAIL.rest, swingX: sway, swingZ: 0.02 * Math.sin(time * 0.9), open: 0.55 + 0.1 * Math.sin(time * 1.1), squash: 1 }
  shadows.push({ x: claw.x + Math.sin(sway) * claw.length, y: TRAY.top, z: claw.z, r: 1.8, a: 0.7 })
  return { toys, gobblers, claw, shadows }
}

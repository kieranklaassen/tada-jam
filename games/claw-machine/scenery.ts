import { MINI, bellyLayout } from './belly'
import { PLATE } from './bricks'
import { EYE, LEGS, rimHeight, type GobblerShape } from './gobblerBuild'
import { shapeOf, snackOf, type GobblerId } from './gobblers'
import type { GobblerLook, ToyLook } from './picture'
import { SHELF, SLOT_Z, STEP, WAIT_Z, slotX } from './places'
import type { Toy } from './toys'

// The gobblers as they stand before the game is built on the toy: a crew of
// three at the tray with their snacks in their bellies, and the next crew
// waiting behind the parapet. They are alive and they watch the claw; they
// take no toys yet.

type Standing = { id: string; shape: GobblerShape; x: number; y: number; z: number; waiting: boolean; snack?: Toy; pace: number; phase: number; blinkEvery: number }

const CREW: readonly GobblerId[] = ['red', 'blue', 'yellow'], WAITING: readonly GobblerId[] = ['duck', 'car', 'rocket']

const CAST: Standing[] = [
  ...CREW.map((id, i): Standing => ({
    id: `crew-${id}`, shape: shapeOf(id), x: slotX(i, 3), y: STEP.top, z: SLOT_Z, waiting: false, snack: snackOf(id),
    pace: [1.7, 1.25, 2.1][i], phase: [0.4, 2.9, 4.6][i], blinkEvery: [3.7, 5.3, 4.4][i],
  })),
  ...WAITING.map((id, i): Standing => ({
    id: `waiting-${id}`, shape: shapeOf(id), x: slotX(i, 3), y: SHELF.top, z: WAIT_Z, waiting: true,
    pace: [1.4, 1.9, 1.1][i], phase: [1.3, 3.3, 5.2][i], blinkEvery: [4.9, 3.9, 6.1][i],
  })),
]

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** The gobblers at `time` seconds, each breathing at its own pace and blinking at its own moments, watching `at`. */
export function sceneryLooks(time: number, at: { x: number; y: number; z: number }, jolt: number): { gobblers: GobblerLook[]; snacks: ToyLook[] } {
  const gobblers: GobblerLook[] = [], snacks: ToyLook[] = []
  CAST.forEach((one, i) => {
    const eyeY = one.y + rimHeight(one.shape) + EYE / 2
    const sinceBlink = (time + one.phase) % one.blinkEvery
    gobblers.push({
      id: one.id, shape: one.shape, x: one.x, y: one.y, z: one.z, waiting: one.waiting,
      // A breath, and a start when the tray is rung.
      squash: 1 + 0.02 * Math.sin(time * one.pace + one.phase) + jolt * (one.waiting ? 0.03 : 0.06),
      gazeX: clamp((at.x - one.x) / 11, -1, 1), gazeY: clamp((at.y - eyeY) / 9 - (at.z - one.z) / 30, -1, 1),
      blink: sinceBlink < 0.12 ? 1 : 0, tongue: 0, leanX: 0, leanZ: 0.015 * Math.sin(time * one.pace * 0.5 + one.phase),
    })
    if (!one.snack) return
    const place = bellyLayout(one.shape, [one.snack])![0]
    // The body breathes about the top of the legs, and what lies in the belly rides with it.
    const lift = (place.y - LEGS * PLATE) * (gobblers[i].squash - 1)
    snacks.push({ key: 1000 + i, toy: one.snack, x: one.x + place.x, y: one.y + place.y + lift, z: one.z + place.z, squash: 1, leanX: 0, leanZ: 0, scale: MINI })
  })
  return { gobblers, snacks }
}

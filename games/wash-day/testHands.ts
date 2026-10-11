import { COLS, ROWS, encodeMud, maskOf, mudLeft, muddied, type Kind } from './cloth'
import { LADDER } from './config'
import { FRIEND_KINDS, RAIL, clothToStage, heldAt, lineSpot, waitBox } from './layout'
import { makeRng } from './rng'
import { deserialize, freshSave, serialize, type Save } from './save'
import { DAMP } from './taste'
import { Yard, type Garment } from './yard'

// A pair of hands for the tests: the moves a child makes, as the Mount hands
// them to the yard. No test of the game's own is in this file, and the game
// imports nothing from it.

export const FRAME = 1 / 60

export const open = (seed = 1, age: number | null = null): Yard => new Yard(freshSave(age, seed))

/** A first visit whose three friends (pig, heron, goat) hold these three garments, at this place of the order. */
export function saveWith(kinds: readonly [Kind, Kind, Kind], seed = 1, position: string = LADDER[0]): Save {
  const save = freshSave(null, seed)
  save.position = position
  save.garments = kinds.map((kind, owner) => ({ kind, owner, at: 'held' as const, n: 0, x: 0, y: 0, mud: encodeMud(muddied(kind, makeRng(seed * 31 + owner))), wet: 0, suds: 0, pegs: [false, false] as [boolean, boolean] }))
  return save
}

export const withKinds = (kinds: readonly [Kind, Kind, Kind], seed = 1, position: string = LADDER[0]): Yard => new Yard(saveWith(kinds, seed, position))

/** What ctx.storage hands back. */
export const stored = (yard: Yard): unknown => JSON.parse(JSON.stringify(serialize(yard.toSave())))

/** Put away and opened again, as a new visit with another seed of its own. */
export const reopened = (yard: Yard): Yard => new Yard(deserialize(stored(yard), null, 777))

export function play(yard: Yard, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) {
    yard.step(FRAME)
    each?.()
  }
}

/** Plays until the scene that is running has ended, and says how long that took. */
export function watch(yard: Yard, each?: () => void): number {
  let seconds = 0
  while (yard.sceneRunning && seconds < 30) {
    yard.step(FRAME)
    seconds += FRAME
    each?.()
  }
  return seconds
}

export function heard(yard: Yard) {
  const notes = yard.heard
  yard.heard = []
  return notes
}

/** A tap: the finger lands and lifts where it landed. */
export function tapAt(yard: Yard, x: number, y: number): void {
  yard.press(x, y)
  yard.tap()
}

/** A drag: the finger lands, moves in short steps as a hand does, and lets go. */
export function carry(yard: Yard, x0: number, y0: number, x1: number, y1: number, each?: () => void): void {
  yard.press(x0, y0)
  for (let n = 1; n <= 10; n++) {
    yard.drag(x0 + ((x1 - x0) * n) / 10, y0 + ((y1 - y0) * n) / 10)
    yard.step(FRAME)
    each?.()
  }
  yard.lift()
  yard.drop()
}

export function waitingAt(friend: number): { x: number; y: number } {
  const box = waitBox(friend, FRIEND_KINDS[friend])
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

/** Touches a friend at the gate and watches it come in. */
export function callIn(yard: Yard, friend: number): void {
  const at = waitingAt(friend)
  tapAt(yard, at.x, at.y)
  watch(yard)
  play(yard, 1.2)
}

export const cellAt = (cell: number) => clothToStage(((cell % COLS) + 0.5) / COLS, (Math.floor(cell / COLS) + 0.5) / ROWS)

export function muddiest(garment: Garment): number {
  let best = 0
  garment.mud.forEach((level, i) => { if (level > garment.mud[best]) best = i })
  return best
}

/** Dabs every muddy cell of the garment on the board until none is left, as a child who only taps would. */
export function rubClean(yard: Yard): void {
  const garment = yard.garmentAt('board')
  if (!garment) throw new Error('nothing lies on the board')
  const mask = maskOf(garment.kind)
  for (let pass = 0; pass < 60 && mudLeft(garment.mud) > 0; pass++) {
    for (let cell = 0; cell < garment.mud.length; cell++) {
      if (!mask[cell] || garment.mud[cell] <= 0) continue
      const at = cellAt(cell)
      tapAt(yard, at.x, at.y)
      yard.step(FRAME)
    }
  }
}

/** Squeezes what hangs on the rail until it is no more than damp. */
export function wringDry(yard: Yard): number {
  const garment = yard.garmentAt('rail')
  if (!garment) throw new Error('nothing hangs on the rail')
  let squeezes = 0
  while (garment.wet > DAMP && squeezes < 40) {
    tapAt(yard, RAIL.hang.x, RAIL.hang.y)
    yard.step(FRAME)
    squeezes += 1
  }
  return squeezes
}

/** One friend's garment the whole way: handed over, rubbed, wrung, pegged at its owner's place and put on. The friend is in the yard. */
export function washAndDress(yard: Yard, friend: number): Garment {
  const garment = yard.garments.find((other) => other.owner === friend)!
  const held = heldAt(friend)
  tapAt(yard, held.x, held.y)
  play(yard, 0.7)
  rubClean(yard)
  tapAt(yard, RAIL.hang.x, RAIL.hang.y)
  play(yard, 0.7)
  wringDry(yard)
  const place = lineSpot(friend)
  tapAt(yard, place.x, place.y)
  play(yard, 0.7)
  tapAt(yard, place.x, place.y)
  watch(yard)
  play(yard, 0.3)
  return garment
}

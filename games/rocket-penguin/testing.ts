import { BARE, clampPouch, fly, launch, step, stretchOf, type Body, type Fish, type Happening, type Load } from './flight'
import { freshSave, type Save } from './save'
import { Toy, type Frame } from './toy'
import type { Sound } from './voices'
import { CATAPULT, PARTS, SLOTS, friendAt, type Part } from './world'

// What the tests share: pulls by angle and length, a grid of pulls a finger
// can make, a body put anywhere in the landscape, and a toy played frame by
// frame with everything it asked for kept beside the frame it asked in.

/** Where the pouch is when pulled `reach` units from the fork, `degrees` below the level, back from the fork. */
export function pullAt(degrees: number, reach: number): { x: number; y: number } {
  const a = (degrees * Math.PI) / 180
  return { x: CATAPULT.fork.x - Math.cos(a) * reach, y: CATAPULT.fork.y + Math.sin(a) * reach }
}

/** A spread of pulls: every fifth degree from level to straight down, at five lengths. */
export function everyPull(): { x: number; y: number }[] {
  const pulls: { x: number; y: number }[] = []
  for (let degrees = 0; degrees <= 90; degrees += 5) for (const reach of [80, 120, 150, 175, 200]) pulls.push(pullAt(degrees, reach))
  return pulls
}

/** Every pull a finger can make, a square apart: each place the pouch can be held where the bands are stretched. `col` and `row` count the squares. */
export function gridOfPulls(square = 20): { x: number; y: number; col: number; row: number }[] {
  const pulls: { x: number; y: number; col: number; row: number }[] = []
  for (let dy = -200, row = 0; dy <= 200; dy += square, row++) for (let dx = -210, col = 0; dx <= 60; dx += square, col++) {
    const want = { x: CATAPULT.fork.x + dx, y: CATAPULT.fork.y + dy }
    const at = clampPouch(want)
    if (Math.hypot(at.x - want.x, at.y - want.y) > 1 || stretchOf(at) < 10) continue
    pulls.push({ ...at, col, row })
  }
  return pulls
}

/** Where a flight ended, as a child would say it. */
export type Place = 'beak' | 'belly' | 'feet' | 'drift' | 'sea' | 'off' | 'chick' | 'walrus' | 'puffin'

export function placeOf(flight: ReturnType<typeof fly>): Place {
  const last = flight.happened[flight.happened.length - 1].what
  if (last.kind !== 'end') throw new Error('the flight has not ended')
  if (last.how === 'drift' || last.how === 'sea' || last.how === 'off') return last.how
  return friendAt(last.how === 'basket' ? 'basket' : last.on, flight.body.x) ?? (last.how as Place)
}

export const loadOf = (parts: readonly Part[], fish: Fish = 'fresh'): Load => ({ parts, fish })

/** Every load there is: none, each part, and each two parts. */
export function everyLoad(): Load[] {
  const loads: Load[] = [BARE]
  for (let i = 0; i < PARTS.length; i++) {
    loads.push(loadOf([PARTS[i]]))
    for (let j = i + 1; j < PARTS.length; j++) loads.push(loadOf([PARTS[i], PARTS[j]]))
  }
  return loads
}

/** A body with `parts` on, put at a place with a speed, as if a flight had brought it there. */
export function bodyAt(x: number, y: number, vx: number, vy: number, parts: readonly Part[] = [], more: Partial<Body> = {}): Body {
  const body = launch(pullAt(0, 80), loadOf(parts))
  return Object.assign(body, { x, y, vx, vy, turn: Math.atan2(vy, vx || 1), spin: 0, age: 1 }, more)
}

/** Steps a body until `until` says so, its flight ends, or `most` steps have gone. Returns what happened. */
export function run(body: Body, most: number, hold: boolean | ((body: Body) => boolean) = false, until: (body: Body, out: Happening[]) => boolean = () => false): Happening[] {
  const out: Happening[] = []
  for (let n = 0; n < most && !body.ended && !until(body, out); n++) step(body, out, typeof hold === 'function' ? hold(body) : hold)
  return out
}

export type Played = { toy: Toy; save: Save; /** The sounds asked for in each step, by the step's number. */ heard: Sound[][] }

export function newToy(seed = 1, save: Save = freshSave(null)): Played {
  return { toy: new Toy(save, seed), save, heard: [] }
}

/** The middle of a part's place in the kit, where a finger presses it. */
export function slotAt(part: Part): { x: number; y: number } {
  const slot = SLOTS[part]
  return { x: (slot.x0 + slot.x1) / 2, y: (slot.y0 + slot.y1) / 2 }
}

/** Presses a part's place in the kit and lifts, and plays until the part has arrived. Returns the sounds of it all. */
export function bolt(played: Played, part: Part): Sound[] {
  const at = slotAt(part)
  played.toy.press(at.x, at.y)
  played.toy.tap()
  const sounds = played.toy.takeSounds()
  for (let n = 0; n < 60; n++) {
    played.toy.step(1 / 60)
    sounds.push(...played.toy.takeSounds())
  }
  return sounds
}

/** Takes hold of the penguin, pulls the pouch to `to` and lets go. Returns the sounds of the three touches. */
export function pullAndLetGo(played: Played, to: { x: number; y: number }): Sound[] {
  const { toy } = played
  toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
  toy.drag(to.x, to.y)
  toy.release()
  return toy.takeSounds()
}

/** Plays `seconds` of the toy in frames of `dt`, keeping each frame's sounds. */
export function play(played: Played, seconds: number, dt = 1 / 60): void {
  for (let n = Math.round(seconds / dt); n > 0; n--) {
    played.toy.step(dt)
    played.heard.push(played.toy.takeSounds())
  }
}

/** Plays until `until` says so, or `longest` seconds have gone. Returns whether it came. */
export function playUntil(played: Played, until: (toy: Toy) => boolean, dt = 1 / 60, longest = 80): boolean {
  for (let n = Math.round(longest / dt); n > 0 && !until(played.toy); n--) {
    played.toy.step(dt)
    played.heard.push(played.toy.takeSounds())
  }
  return until(played.toy)
}

/** Plays until the penguin is back in the pouch, or `longest` seconds have gone. Returns whether it got home. */
export function playHome(played: Played, dt = 1 / 60, longest = 80): boolean {
  return playUntil(played, (toy) => toy.phase === 'loaded', dt, longest)
}

/** The first pull of the grid, a square or half a square apart, whose flight with `load` does what `want` asks. */
export function findPull(load: Load, want: (flight: ReturnType<typeof fly>) => boolean, hold: (body: Body) => boolean = () => false, square = 10): { x: number; y: number } | null {
  for (const pull of gridOfPulls(square)) if (want(fly(pull, load, hold))) return { x: pull.x, y: pull.y }
  return null
}

/** The names of the sounds heard from step `from` on, in order. */
export function heardFrom(played: Played, from = 0): string[] {
  return played.heard.slice(from).flat().map((sound) => sound.name)
}

/** Bare paper, where a held finger works nothing but the rocket. */
export const BARE_PAPER = { x: 330, y: 330 } as const

/**
 * A toy in the air with `parts` bolted on and its body put where `put` says, as if a flight had brought it there:
 * the next step of play is the meeting. With `hold`, a finger rests on bare paper, which burns the rocket.
 * What was heard before is forgotten.
 */
export function staged(parts: readonly Part[], put: Partial<Body>, hold = false, seed = 1): Played {
  const save = freshSave(null)
  save.bolted = [...parts]
  const played = newToy(seed, save)
  pullAndLetGo(played, pullAt(40, 150))
  playUntil(played, (toy) => toy.phase === 'fly')
  const body = played.toy.body!
  const vx = put.vx ?? 0, vy = put.vy ?? 0
  Object.assign(body, { vx, vy, turn: Math.atan2(vy, vx || 1e-9), spin: 0, age: 1, skidding: false, inCloud: false, inSpout: false, misted: false }, put)
  if (hold) played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
  played.toy.takeSounds()
  played.toy.takeSave()
  played.heard.length = 0
  return played
}

/** A copy of a frame that stays as it was while the toy plays on. */
export function still(frame: Frame): Frame {
  return JSON.parse(JSON.stringify(frame)) as Frame
}

/** The second, counted from the first frame kept, at which a sound was first heard; -1 when it never was. */
export function heardAt(played: Played, name: string, dt = 1 / 60): number {
  const index = played.heard.findIndex((sounds) => sounds.some((sound) => sound.name === name))
  return index < 0 ? -1 : (index + 1) * dt
}

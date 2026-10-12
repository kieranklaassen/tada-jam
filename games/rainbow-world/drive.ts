import { BASKET, type Spot } from './layout'
import type { PieceId } from './pieces'
import type { Sound } from './sounds'
import { stand } from './stack'
import { homePlaces, type Places, type Rest } from './thing'
import { World } from './world'

// For the tests: a mat laid as a test needs it, and a child's taps on it. A tap here is what a tap is in the
// game, a press and a lift where the finger landed, so everything a test reaches this way a child reaches
// with taps alone.

export const FRAME = 1 / 60
export type Heard = Sound & { at: number }

/** Plays the world for a while in frames and returns every sound it asked for, with the world's time at the frame that asked. */
export function run(world: World, seconds: number, frame = FRAME): Heard[] {
  const heard: Heard[] = []
  for (let t = 0; t < seconds - 1e-9; t += frame) {
    world.step(frame)
    for (const sound of world.takeSounds()) heard.push({ ...sound, at: world.time })
  }
  return heard
}

export const named = (heard: readonly Sound[]): string[] => heard.map((sound) => (sound.piece ? `${sound.name}:${sound.piece}` : sound.name))

/** A mat with these things on it and the rest by it. `on` and `turned` are optional. */
export function mat(things: Partial<Record<PieceId, Partial<Rest> & { x: number; y: number }>>, basket: 'upright' | 'tipped' = 'upright'): World {
  const places: Places = homePlaces()
  for (const [id, rest] of Object.entries(things)) places[id as PieceId] = { at: 'mat', on: null, turned: false, ...rest }
  return new World(places, basket)
}

/** The middle of a thing where it is drawn now: where a finger aims. */
export function middle(world: World, id: PieceId): Spot {
  const p = world.piece(id), at = stand(world.pieces, p)
  return { x: at.x, y: at.y - p.def.height * 0.5 }
}

export function tap(world: World, x: number, y: number): void {
  world.press(x, y)
  world.tap()
}

/** A tap on a thing: it is in hand. Things by the mat lie nested, so an inner arch is taken after the outer ones. */
export function take(world: World, id: PieceId): void {
  const p = world.piece(id), to = middle(world, id), at = stand(world.pieces, p)
  // An arch is touched on its band: a little under its crown, which is at the bottom when it lies on its back.
  tap(world, to.x, p.def.kind !== 'arch' ? to.y : p.turned ? at.y - 12 : at.y - p.def.height + 12)
  if (world.hand?.id !== id) throw new Error(`the tap meant for ${id} took ${world.hand?.id ?? 'nothing'}`)
}

/** Two taps: a thing, then a place on the mat. */
export function put(world: World, id: PieceId, x: number, y: number): void {
  take(world, id)
  tap(world, x, y)
}

/** Two taps: a thing, then another thing on the mat. */
export function putOn(world: World, id: PieceId, on: PieceId): void {
  take(world, id)
  const to = middle(world, on)
  tap(world, to.x, to.y)
}

/** A tap on the basket. */
export function tapBasket(world: World): void {
  tap(world, BASKET.x, BASKET.y - 40)
}

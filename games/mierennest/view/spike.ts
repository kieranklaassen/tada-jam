import { CELL, EARTH, OPEN, at, generate, isLump, put, settle, type Ground, type Kind } from '../ground'
import { kingdom } from '../chambers'
import type { CreatureKind } from './creatures'
import { GRASS_Y, GROUND, MOUTH_X } from './layout'

// The scenes of the look spike: the game's real ground, laid out from a fixed seed, with its cast standing where
// the game will put them. Nothing here is played: the Mount shows one of these at load until the toy replaces it.

export type Cast = { kind: CreatureKind; pose: string; x: number; y: number; flip?: boolean }
export type SpikeScene = { ground: Ground; cast: Cast[]; hill: number; bell: number }

/** The seed every spike scene is laid out from. */
export const SPIKE_SEED = 1

/** The stage point where a creature's feet stand on the floor of a cell: the middle of its lower edge. */
const onFloor = (cx: number, cy: number) => ({ x: GROUND.x + (cx + 0.5) * CELL, y: GROUND.y + (cy + 1) * CELL })

/** Opens every earth cell of a block; lumps stay where they lie, and fall as the ground comes to rest. */
function hollow(ground: Ground, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(ground, x, y) === EARTH) put(ground, x, y, OPEN)
}

/** Carries lumps from where they lie to open cells, as the child's ant would: nothing is made and nothing is lost. */
function carry(ground: Ground, moves: readonly [number, number, number, number][]): void {
  for (const [fx, fy, tx, ty] of moves) {
    const kind: Kind = at(ground, fx, fy)
    if (!isLump(kind) || at(ground, tx, ty) !== OPEN) throw new Error(`cannot carry ${fx},${fy} to ${tx},${ty}`)
    put(ground, fx, fy, OPEN)
    put(ground, tx, ty, kind)
  }
}

/** The campers who are always at the camp, each caught out by its own habit. */
function camp(waiting: Cast[]): Cast[] {
  return [
    { kind: 'raider', pose: 'nap', x: 92, y: GRASS_Y },
    { kind: 'raider', pose: 'stuck', x: 208, y: GRASS_Y, flip: true },
    { kind: 'fly', pose: 'hands', x: 330, y: GRASS_Y },
    ...waiting,
    { kind: 'dungFly', pose: 'point', x: 800, y: GRASS_Y - 100, flip: true },
    { kind: 'beetle', pose: 'onBack', x: 908, y: GRASS_Y },
    { kind: 'dungBeetle', pose: 'polish', x: 1022, y: GRASS_Y },
    { kind: 'dungBall', pose: 'plain', x: 1106, y: GRASS_Y },
  ]
}

/** A new nest: the queen wedged in the shaft, the ant at its first mouthfuls, and the whole camp watching. */
function firstFrame(): SpikeScene {
  const ground = generate(SPIKE_SEED)
  hollow(ground, 21, 1, 25, 2)
  settle(ground)
  const dig = onFloor(22.6, 2)
  return {
    ground,
    hill: kingdom(ground).hollow,
    bell: 0.12,
    cast: [
      ...camp([{ kind: 'raider', pose: 'pillow', x: 446, y: GRASS_Y - 26 }]),
      { kind: 'worker', pose: 'carry', x: MOUTH_X - 62, y: GRASS_Y - 14 },
      { kind: 'worker', pose: 'hips', x: MOUTH_X + 50, y: GRASS_Y - 16, flip: true },
      { kind: 'queen', pose: 'wedged', x: MOUTH_X, y: GROUND.y + 3 * CELL },
      { kind: 'ant', pose: 'dig', x: dig.x, y: dig.y },
    ],
  }
}

/** A kingdom some days on: rooms, halls and defences of the child's own plan, built from the lumps of this ground. */
function builtNest(): Ground {
  const ground = generate(SPIKE_SEED)
  hollow(ground, 19, 1, 20, 15)
  hollow(ground, 11, 5, 18, 6)
  hollow(ground, 4, 4, 10, 6)
  hollow(ground, 21, 5, 26, 6)
  hollow(ground, 27, 3, 35, 6)
  hollow(ground, 10, 13, 18, 15)
  hollow(ground, 3, 13, 9, 15)
  hollow(ground, 21, 15, 25, 16)
  hollow(ground, 26, 14, 31, 16)
  carry(ground, [
    // A long low crawl with a mud floor in the left tunnel: the lower cells filled, the upper left open for air.
    [15, 5, 13, 6], [14, 4, 14, 6], [31, 6, 12, 6], [20, 8, 11, 6],
    // What lay in the queen's room is built into her tunnel: a stone bedded in mud, beside the mud that hangs there.
    [28, 6, 23, 6], [30, 6, 22, 6], [32, 6, 24, 6], [31, 5, 12, 15],
    // The mud that narrowed the shaft is a floor in the deep tunnel on the right.
    [20, 9, 23, 16], [20, 10, 22, 16], [20, 11, 24, 16],
    // The deep hall is cleared: its mud packs the sand at the far room's door, and three stones wait beside it.
    [19, 15, 8, 14], [20, 15, 9, 14], [4, 13, 10, 15], [6, 13, 11, 15],
    // The far right room keeps its stones against the wall, bedded with the last of the shaft's mud.
    [28, 15, 31, 16], [30, 15, 30, 16], [20, 14, 30, 15], [21, 14, 31, 15],
  ])
  settle(ground)
  return ground
}

function grownKingdom(): SpikeScene {
  const ground = builtNest()
  const f = onFloor
  return {
    ground,
    hill: Math.min(1, kingdom(ground).hollow * 4),
    bell: -0.1,
    cast: [
      ...camp([{ kind: 'beetle', pose: 'napkin', x: 446, y: GRASS_Y - 26 }]),
      { kind: 'worker', pose: 'carry', x: MOUTH_X + 78, y: GRASS_Y - 34 },
      { kind: 'queen', pose: 'sit', x: f(28.7, 6).x, y: f(28, 6).y },
      { kind: 'worker', pose: 'walk', x: f(33, 6).x, y: f(33, 6).y, flip: true },
      { kind: 'worker', pose: 'hips', x: f(21, 6).x, y: f(21, 6).y },
      { kind: 'worker', pose: 'carry', x: f(5, 6).x, y: f(5, 6).y },
      { kind: 'worker', pose: 'walk', x: f(8.5, 6).x, y: f(8, 6).y, flip: true },
      { kind: 'worker', pose: 'walk', x: f(4.5, 15).x, y: f(4, 15).y },
      { kind: 'worker', pose: 'hips', x: f(7, 15).x, y: f(7, 15).y, flip: true },
      { kind: 'worker', pose: 'carry', x: f(27.5, 16).x, y: f(27, 16).y, flip: true },
      { kind: 'ant', pose: 'look', x: f(14.5, 15).x, y: f(14, 15).y },
    ],
  }
}

/** A raid at its height in the same kingdom: every kind inside, each met by what the child built. */
function raid(): SpikeScene {
  const ground = builtNest()
  const f = onFloor
  return {
    ground,
    hill: Math.min(1, kingdom(ground).hollow * 4),
    bell: 0.5,
    cast: [
      { kind: 'raider', pose: 'nap', x: 92, y: GRASS_Y },
      { kind: 'dungFly', pose: 'point', x: 800, y: GRASS_Y - 100, flip: true },
      { kind: 'beetle', pose: 'onBack', x: 908, y: GRASS_Y },
      { kind: 'worker', pose: 'hips', x: MOUTH_X + 56, y: GRASS_Y - 34, flip: true },
      { kind: 'queen', pose: 'sit', x: f(28.7, 6).x, y: f(28, 6).y },
      // The fly's wings reach about a cell over its body box, so it hovers a row under the roof.
      { kind: 'fly', pose: 'fly', x: f(33.2, 5).x, y: f(33, 5).y - 4, flip: true },
      { kind: 'raider', pose: 'stuck', x: f(13.2, 5).x, y: f(13, 5).y, flip: true },
      { kind: 'raider', pose: 'walk', x: f(7, 6).x, y: f(7, 6).y, flip: true },
      { kind: 'beetle', pose: 'lean', x: f(17.72, 6).x, y: f(17, 6).y, flip: true },
      { kind: 'dungBall', pose: 'plain', x: f(14, 15).x, y: f(14, 15).y },
      { kind: 'dungBeetle', pose: 'push', x: f(17.72, 15).x, y: f(17, 15).y, flip: true },
      { kind: 'worker', pose: 'hips', x: f(26, 16).x, y: f(26, 16).y, flip: true },
      { kind: 'worker', pose: 'walk', x: f(27.6, 16).x, y: f(27, 16).y },
      { kind: 'ant', pose: 'stand', x: f(5, 15).x, y: f(5, 15).y },
    ],
  }
}

/** The scene for a number in the address: 2 is the grown kingdom, 3 the raid, anything else the first frame. */
export function spikeScene(which: number): SpikeScene {
  return which === 2 ? grownKingdom() : which === 3 ? raid() : firstFrame()
}

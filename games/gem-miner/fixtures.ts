import { BLOCKS, BURROW_INDEX, TOOL_HOME, indexOf } from './layout'
import type { Event } from './game'
import type { Colour, DwellerKind, Kind, World } from './world'

// Hills drawn by hand for the tests: one string a row from the top, one mark
// a block from the left, and earth wherever nothing is drawn.
//   e earth   s sandstone   g granite   b loose boulder   w water pocket
//   p spout   a gas pocket  o dug       ~ dug, with standing water
//   R G B a gem in earth    X Y Z a gem in sandstone      @ dug, with the mole

const KIND: Record<string, Kind> = { e: 'earth', s: 'sandstone', g: 'granite', b: 'boulder', w: 'water', p: 'spout', a: 'gas', o: 'open', '~': 'open', '@': 'open', R: 'earth', G: 'earth', B: 'earth', X: 'sandstone', Y: 'sandstone', Z: 'sandstone' }
const LODE: Record<string, Colour> = { R: 'red', G: 'green', B: 'blue', X: 'red', Y: 'green', Z: 'blue' }

export function drawn(...rows: string[]): World {
  const kinds = new Array<Kind>(BLOCKS).fill('earth')
  const lode = new Array<Colour | null>(BLOCKS).fill(null)
  const water = new Array<boolean>(BLOCKS).fill(false)
  let mole = -1
  rows.forEach((row, r) => [...row].forEach((mark, c) => {
    const index = indexOf(c, r)
    kinds[index] = KIND[mark]
    lode[index] = LODE[mark] ?? null
    water[index] = mark === '~'
    if (mark === '@') mole = index
  }))
  if (mole < 0) { mole = kinds.indexOf('open'); if (mole < 0) mole = BURROW_INDEX }
  return {
    seed: 1, position: 'near', kinds, lode, hits: new Array<number>(BLOCKS).fill(0), wet: [...water], water,
    gems: [], mole: { at: mole, sooty: false, tool: null, load: 'nothing' }, tools: { ...TOOL_HOME }, tied: null,
  }
}

/** One of every event, for the tests that walk them all. */
export function everyEvent(): Event[] {
  const at = { x: 0, y: 0 }
  const index = BLOCKS - 1
  const kinds: DwellerKind[] = ['bat', 'newt', 'lizard', 'mushroom', 'beetle', 'fern', 'glowworm', 'snail', 'moth', 'dragonfly', 'spider', 'flower']
  const simple = ['squelch', 'pop', 'split', 'boom', 'jet', 'whistle', 'gong', 'bloop', 'plip', 'fff', 'ropehiss', 'worm', 'twang', 'creak', 'strain', 'thud', 'plap', 'charm', 'hang', 'whoomph', 'bump', 'gush', 'lap', 'clunk', 'pat'] as const
  const bare = ['sit', 'ding', 'teeth', 'burp', 'clink', 'flop', 'trickle', 'soak', 'grumble', 'clack', 'slurp', 'spray', 'wash', 'unroll', 'shoot', 'hm'] as const
  const out: Event[] = []
  for (const kind of ['earth', 'sandstone', 'granite', 'water', 'gas', 'gem', 'open', 'grass'] as const) out.push({ type: 'knock', kind, index, at, colour: kind === 'gem' ? 'green' : undefined })
  for (const kind of ['earth', 'sandstone'] as const) for (const blow of [1, 2, 3]) out.push({ type: blow === 3 || kind === 'earth' ? 'break' : 'chip', kind, index, n: blow, aside: false, from: at })
  out.push({ type: 'clang', index, from: at }, { type: 'print', at })
  for (const [wading, slopping] of [[false, false], [true, false], [false, true]]) out.push({ type: 'step', node: index, wade: wading, slop: slopping })
  for (const who of ['mole', 'mammoth', 'lift', 'wedge', 'bucket', 'rope', ...kinds] as const) out.push({ type: 'poke', who, index })
  for (const tool of ['wedge', 'bucket', 'rope'] as const) out.push({ type: 'take', tool, node: index }, { type: 'put', tool, node: index })
  for (const type of simple) out.push({ type, index })
  for (const type of bare) out.push({ type })
  for (const blow of [1, 2, 3]) out.push({ type: 'ring', index, n: blow, loose: blow === 3 })
  for (const what of ['earth', 'sand'] as const) out.push({ type: 'scoop', index, what })
  for (const what of ['earth', 'sand', 'water'] as const) out.push({ type: 'tip', index, what })
  for (const type of ['zip', 'bip', 'flap', 'squeal', 'roll'] as const) for (const k of [0, 1, 2, 3]) out.push({ type, n: k })
  out.push({ type: 'rumble', from: index, to: index - 1 })
  for (const k of [0, 5, 30]) out.push({ type: 'glug', index, n: k })
  for (const colour of ['red', 'green', 'blue'] as const) {
    out.push({ type: 'gemring', colour, index }, { type: 'ping', colour, index }, { type: 'chime', colour, index }, { type: 'prise', colour, index })
  }
  out.push({ type: 'tik', index }, { type: 'tock', index }, { type: 'plink', index })
  for (const kind of kinds) out.push({ type: 'leave', kind, index }, { type: 'show', kind, index })
  return out
}

/**
 * A dug room at the bottom left, far from the burrow, with the light and the wet that one kind of dweller lives
 * in: three blocks in a row, the gems that give the light lying in the middle one.
 */
export function roomFor(kind: DwellerKind): World {
  const light: Record<DwellerKind, Colour[]> = {
    bat: [], newt: [], lizard: ['red'], mushroom: ['red'], beetle: ['green'], fern: ['green'], glowworm: ['blue'], snail: ['blue'],
    moth: ['red', 'green'], dragonfly: ['green', 'blue'], spider: ['red', 'blue'], flower: ['red', 'green', 'blue'],
  }
  const wet = kind === 'newt' || kind === 'mushroom' || kind === 'fern' || kind === 'snail' || kind === 'flower'
  const world = drawn('eeeeee@', 'eeeeeee', 'eeeeeee', 'eeeeeee', 'eeeeeee', 'oooeeee', 'ggggeee')
  const room = [indexOf(0, 5), indexOf(1, 5), indexOf(2, 5)]
  for (const index of room) world.wet[index] = wet
  for (const colour of light[kind]) world.gems.push({ colour, at: room[1], rest: 'floor' })
  return world
}

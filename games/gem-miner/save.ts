import { LADDER } from './config'
import { BLOCKS, BURROW_INDEX, CAGE, TOOLS, TOOL_HOME, beside, colOf, isGrass, isNode, nodeOf, rowOf, type Tool } from './layout'
import { deserialize as readState, freshState, isReadable, isRecord, serialize as writeState, type GameState } from './state'
import { BLOWS, COLOURS, clone, isColour, layWorld, settle, type Colour, type Kind, type Load, type Place, type Rest, type World } from './world'

// What the game saves, round `state.ts` as its header describes: the fields
// of the designed order from there, and the hillside from here. Every field
// the sheet names is here under the sheet's name, and each is repaired by
// itself when a slot is read.

type At = { c: number; r: number }
export type Save = GameState & {
  /** The whole number the hillside on screen was laid from. */
  seed: number
  /** The hill as it stands, one mark a block. */
  cells: string
  /** For each block, the blows it has taken that have not broken it or cracked it free. */
  hits: string
  /** For each block, whether it is wet. */
  wet: string
  /** For each block, whether water stands in it. */
  water: string
  /** Every gem that is out of its block. */
  gems: (At & { colour: Colour; rest: Rest })[]
  /** The block the mole is in, or the grass above a column (row -1). */
  mole: At & { sooty: boolean; cage: boolean; tool: Tool | 'none'; bucket: Load }
  /** Where each tool lies when the mole does not hold it, and for the rope what it is tied to. */
  tools: { wedge: At; bucket: At; rope: At & { tied: 'nothing' | 'gem' | 'boulder'; to: At } }
}

/** One mark for each thing a block can be. A gem in its block is marked by its colour and by the ground that holds it. */
const MARK: Record<Kind, string> = { earth: 'e', sandstone: 's', granite: 'g', boulder: 'b', water: 'w', spout: 'p', gas: 'a', open: 'o' }
const KIND_OF: Record<string, Kind> = { e: 'earth', s: 'sandstone', g: 'granite', b: 'boulder', w: 'water', p: 'spout', a: 'gas', o: 'open' }
const LODE_MARK: Record<'earth' | 'sandstone', Record<Colour, string>> = { earth: { red: 'R', green: 'G', blue: 'B' }, sandstone: { red: 'X', green: 'Y', blue: 'Z' } }
const LODE_OF: Record<string, { kind: 'earth' | 'sandstone'; colour: Colour }> = {
  R: { kind: 'earth', colour: 'red' }, G: { kind: 'earth', colour: 'green' }, B: { kind: 'earth', colour: 'blue' },
  X: { kind: 'sandstone', colour: 'red' }, Y: { kind: 'sandstone', colour: 'green' }, Z: { kind: 'sandstone', colour: 'blue' },
}
const RESTS: readonly Rest[] = ['left', 'right', 'floor', 'hung', 'bucket']
const LOADS: readonly Load[] = ['nothing', 'earth', 'sand', 'water', 'red', 'green', 'blue']

const placeOf = (position: string): Place => (position === 'wild' ? 'wild' : 'near')
const at = (node: number): At => ({ c: colOf(node), r: rowOf(node) })
const bits = (flags: readonly boolean[]): string => flags.map((flag) => (flag ? '1' : '0')).join('')

/** A world as a save holds it. */
export function toSave(world: World): Save {
  const hung = world.gems.some((gem) => gem.rest === 'hung')
  const tied = world.tied !== null ? world.tied : world.tools.rope
  return {
    ...writeState({ v: 1, position: world.position, finished: false }),
    seed: world.seed,
    cells: world.kinds.map((kind, index) => (world.lode[index] && (kind === 'earth' || kind === 'sandstone') ? LODE_MARK[kind][world.lode[index]!] : MARK[kind])).join(''),
    hits: world.hits.join(''),
    wet: bits(world.wet),
    water: bits(world.water),
    gems: world.gems.map((gem) => ({ colour: gem.colour, ...at(gem.rest === 'bucket' ? (world.mole.tool === 'bucket' ? world.mole.at : world.tools.bucket) : gem.at), rest: gem.rest })),
    mole: { ...at(world.mole.at), sooty: world.mole.sooty, cage: world.mole.at === CAGE, tool: world.mole.tool ?? 'none', bucket: world.mole.load },
    tools: {
      wedge: at(world.mole.tool === 'wedge' ? world.mole.at : world.tools.wedge),
      bucket: at(world.mole.tool === 'bucket' ? world.mole.at : world.tools.bucket),
      rope: { ...at(world.mole.tool === 'rope' ? world.mole.at : world.tools.rope), tied: world.tied !== null ? 'boulder' : hung ? 'gem' : 'nothing', to: at(tied) },
    },
  }
}

/** A first visit: a fresh hillside of the kind the age gives, laid from `seed`, with the mole in his burrow. */
export function freshSave(childAge: number | null, seed: number): Save {
  return toSave(layWorld(seed, placeOf(freshState(childAge).position)))
}

function nodeIn(raw: unknown): number | null {
  if (!isRecord(raw) || !Number.isInteger(raw.c) || !Number.isInteger(raw.r)) return null
  const c = raw.c as number, r = raw.r as number
  return isNode(c, r) ? nodeOf(c, r) : null
}

function flags(raw: unknown): boolean[] {
  const out = new Array<boolean>(BLOCKS).fill(false)
  if (typeof raw === 'string' && raw.length === BLOCKS) for (let i = 0; i < BLOCKS; i++) out[i] = raw[i] === '1'
  return out
}

/**
 * Reads a slot into a world. Anything that is not this game's record gives a first visit laid from `seed`.
 * Inside a record each field is repaired by itself: a hill that cannot be read is laid fresh from the stored
 * seed and keeps the position; damaged blows count as none; water stands only in dug blocks and what it stands
 * in is wet; a gem that is not in dug space, or is one too many, is dropped; a mole or a tool that is not in dug
 * space or on the grass goes home. Then everything is brought to rest, so nothing falls or runs when the game
 * opens.
 */
export function worldOf(raw: unknown, childAge: number | null, seed: number): World {
  if (!isReadable(raw)) return layWorld(seed, placeOf(freshState(childAge).position))
  const state = readState(raw, childAge, LADDER)
  const position = placeOf(state.position)
  const stored = typeof raw.seed === 'number' && Number.isInteger(raw.seed) && raw.seed >= 0 && raw.seed <= 0xffffffff ? raw.seed : seed >>> 0
  const fresh = layWorld(stored, position)
  const cells = raw.cells
  if (typeof cells !== 'string' || cells.length !== BLOCKS || cells[BURROW_INDEX] !== 'o') return fresh
  const world = clone(fresh)
  world.lode.fill(null)
  for (let i = 0; i < BLOCKS; i++) {
    const kind = KIND_OF[cells[i]], lode = LODE_OF[cells[i]]
    if (kind) world.kinds[i] = kind
    else if (lode) { world.kinds[i] = lode.kind; world.lode[i] = lode.colour }
    else return fresh
  }
  world.hits.fill(0)
  if (typeof raw.hits === 'string' && raw.hits.length === BLOCKS) {
    for (let i = 0; i < BLOCKS; i++) {
      const n = raw.hits.charCodeAt(i) - 48, kind = world.kinds[i]
      if ((kind === 'sandstone' && n >= 1 && n < BLOWS.sandstone) || (kind === 'granite' && n >= 1 && n < BLOWS.granite)) world.hits[i] = n
    }
  }
  const water = flags(raw.water), wet = flags(raw.wet)
  for (let i = 0; i < BLOCKS; i++) {
    world.water[i] = water[i] && world.kinds[i] === 'open'
    world.wet[i] = (wet[i] && world.kinds[i] === 'open') || world.water[i]
  }

  // The mole and the tools: each in dug space or on the grass, no two tools in one place.
  const mole = isRecord(raw.mole) ? raw.mole : {}
  const stands = (node: number | null): node is number => node !== null && (isGrass(node) || world.kinds[node] === 'open')
  const moleAt = nodeIn(mole)
  world.mole.at = stands(moleAt) ? moleAt : BURROW_INDEX
  world.mole.sooty = mole.sooty === true
  world.mole.tool = TOOLS.includes(mole.tool as Tool) ? (mole.tool as Tool) : null
  world.mole.load = LOADS.includes(mole.bucket as Load) ? (mole.bucket as Load) : 'nothing'
  const tools = isRecord(raw.tools) ? raw.tools : {}
  const taken = new Set<number>()
  for (const tool of TOOLS) {
    const node = nodeIn(tools[tool])
    let lies = stands(node) ? node : TOOL_HOME[tool]
    // The rope a lamp hangs on lies nowhere: another tool may lie on the floor of the lamp's block.
    const hangs = tool === 'rope' && world.mole.tool !== 'rope' && isRecord(tools.rope) && tools.rope.tied === 'gem'
    if (world.mole.tool === tool) lies = world.mole.at
    else if (!hangs && taken.has(lies)) lies = TOOL_HOME[tool]
    if (world.mole.tool !== tool && !hangs) taken.add(lies)
    world.tools[tool] = lies
  }

  // The gems that are out of their blocks: nine in the hill at the most, the ones in the rock counted too.
  world.gems = []
  let room = 9 - world.lode.filter((held) => held !== null).length
  let inBucket: Colour | null = null
  if (Array.isArray(raw.gems)) {
    for (const item of raw.gems) {
      if (room <= 0 || !isRecord(item) || !COLOURS.includes(item.colour as Colour) || !RESTS.includes(item.rest as Rest)) continue
      const colour = item.colour as Colour
      let rest = item.rest as Rest
      if (rest === 'bucket') {
        if (inBucket) continue
        inBucket = colour
        world.gems.push({ colour, at: BURROW_INDEX, rest })
        room -= 1
        continue
      }
      const node = nodeIn(item)
      if (node === null || isGrass(node) || world.kinds[node] !== 'open') continue
      // A lamp hangs only on the rope, where the rope is, with rock over it.
      if (rest === 'hung' && (world.mole.tool === 'rope' || world.tools.rope !== node || world.gems.some((gem) => gem.rest === 'hung'))) rest = 'floor'
      if (rest !== 'floor' && world.gems.some((gem) => gem.at === node && gem.rest === rest)) rest = 'floor'
      world.gems.push({ colour, at: node, rest })
      room -= 1
    }
  }
  // A rope said to hold a lamp that holds none lies like any tool: not where another one lies.
  if (world.mole.tool !== 'rope' && !world.gems.some((gem) => gem.rest === 'hung') && TOOLS.some((tool) => tool !== 'rope' && world.mole.tool !== tool && world.tools[tool] === world.tools.rope)) world.tools.rope = TOOL_HOME.rope
  // What the bucket holds and the gem in it agree: the gem decides.
  if (inBucket) world.mole.load = inBucket
  else if (isColour(world.mole.load)) world.mole.load = 'nothing'

  // The rope is tied to a boulder only while the mole holds it beside that boulder.
  const rope = isRecord(tools.rope) ? tools.rope : {}
  const to = nodeIn(rope.to)
  world.tied = rope.tied === 'boulder' && to !== null && !isGrass(to) && world.kinds[to] === 'boulder' && world.mole.tool === 'rope' && !isGrass(world.mole.at) && beside(world.mole.at).includes(to) ? to : null
  settle(world)
  return world
}

/** Reads a slot, repaired, as a save. */
export function deserialize(raw: unknown, childAge: number | null, seed: number): Save {
  return toSave(worldOf(raw, childAge, seed))
}

/** A save as plain JSON, field by field. */
export function serialize(save: Save): Save {
  return {
    ...writeState(save), seed: save.seed, cells: save.cells, hits: save.hits, wet: save.wet, water: save.water,
    gems: save.gems.map((gem) => ({ colour: gem.colour, c: gem.c, r: gem.r, rest: gem.rest })),
    mole: { c: save.mole.c, r: save.mole.r, sooty: save.mole.sooty, cage: save.mole.cage, tool: save.mole.tool, bucket: save.mole.bucket },
    tools: { wedge: { ...save.tools.wedge }, bucket: { ...save.tools.bucket }, rope: { ...save.tools.rope, to: { ...save.tools.rope.to } } },
  }
}

import { BLOCKS, BURROW, BURROW_INDEX, COLS, ROWS, TOOLS, TOOL_HOME, beside, cellOf, inHill, indexOf, isGrass, type Tool } from './layout'
import { below, makeRng } from './rng'

// The hillside and everything in it that a save keeps: the ground block by
// block, the wet, the standing water, the gems that are out of their blocks,
// the mole and the three tools. Pure rules: no drawing, no clock and no
// sound. game.ts plays these rules in time.

export type Ground = 'earth' | 'sandstone'
/**
 * What a block is. `boulder` is granite the wedge has cracked free of the hill; `spout` is a water pocket the
 * wedge has opened to a drip; `open` is dug space.
 */
export type Kind = Ground | 'granite' | 'boulder' | 'water' | 'spout' | 'gas' | 'open'
export type Colour = 'red' | 'green' | 'blue'
export const COLOURS: readonly Colour[] = ['red', 'green', 'blue']
/** What the bucket holds. */
export type Load = 'nothing' | 'earth' | 'sand' | 'water' | Colour
/** How a gem that is out of its block rests: set in the left or the right wall of its block, on its floor, hung on the rope, or in the bucket. */
export type Rest = 'left' | 'right' | 'floor' | 'hung' | 'bucket'
export type Gem = { colour: Colour; at: number; rest: Rest }
/** Which hillside in the game's own order (config.ts, LADDER). */
export type Place = 'near' | 'wild'

export type World = {
  seed: number
  position: Place
  kinds: Kind[]
  /** The gem a block of earth or sandstone holds, while it is still in the rock. */
  lode: (Colour | null)[]
  /** Blows a block has taken that have not broken it or cracked it free: the pick on sandstone, the wedge on granite. */
  hits: number[]
  wet: boolean[]
  /** Whether water stands in a dug block. */
  water: boolean[]
  /** The gems that are out of their blocks. A gem in the bucket is where the bucket is (`gemNode`). */
  gems: Gem[]
  mole: { at: number; sooty: boolean; tool: Tool | null; load: Load }
  /** Where each tool lies. A tool the mole holds is where he is. */
  tools: Record<Tool, number>
  /** The loose boulder the rope in the mole's paws is tied to. */
  tied: number | null
}

/** Blows of the pick a block takes before it breaks, and blows of the wedge before granite cracks free. */
export const BLOWS = { earth: 1, sandstone: 3, granite: 3 } as const
/** Blocks of water one pocket holds. */
export const POCKET_HOLDS = 2
/** How far a gem's light reaches along the tunnels, in blocks. */
export const REACH = 2
export const RED = 1, GREEN = 2, BLUE = 4
export const BIT: Record<Colour, number> = { red: RED, green: GREEN, blue: BLUE }

export const isColour = (load: Load): load is Colour => load === 'red' || load === 'green' || load === 'blue'
export const isOpen = (world: World, index: number): boolean => world.kinds[index] === 'open'
/** Whether a block is ground the pick, the wedge and the bucket can take away, with or without a gem in it. */
export const isGround = (kind: Kind): kind is Ground => kind === 'earth' || kind === 'sandstone'

export function clone(world: World): World {
  return {
    seed: world.seed, position: world.position,
    kinds: [...world.kinds], lode: [...world.lode], hits: [...world.hits], wet: [...world.wet], water: [...world.water],
    gems: world.gems.map((gem) => ({ ...gem })),
    mole: { ...world.mole }, tools: { ...world.tools }, tied: world.tied,
  }
}

/** Where a gem is: its own node, or where the bucket is. */
export function gemNode(world: World, gem: Gem): number {
  return gem.rest === 'bucket' ? bucketNode(world) : gem.at
}
export const bucketNode = (world: World): number => (world.mole.tool === 'bucket' ? world.mole.at : world.tools.bucket)
/** Whether the rope holds a lamp up: then it lies nowhere, and is nobody's to take until the lamp comes down. */
export const ropeHangs = (world: World): boolean => world.mole.tool !== 'rope' && world.gems.some((gem) => gem.rest === 'hung')
/** The tool lying in a node, if one does. The rope a lamp hangs on is not lying there. */
export function toolAt(world: World, node: number): Tool | null {
  for (const tool of TOOLS) {
    if (world.mole.tool === tool || world.tools[tool] !== node) continue
    if (tool === 'rope' && ropeHangs(world)) continue
    return tool
  }
  return null
}
/** The gems lying or set in a block, the one in the bucket left out. */
export const gemsIn = (world: World, index: number): Gem[] => world.gems.filter((gem) => gem.rest !== 'bucket' && gem.at === index)

// --- Laying a hillside ---------------------------------------------------------------------------------------

/** The seed of the hillside after this one. */
export function nextSeed(seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * Lays a hillside from its seed. New things come with depth: the top row is earth; sandstone begins in the second
 * row; water and gas pockets lie from the third row down; granite begins in the fourth row, in three or four lumps;
 * gems lie from the second row down, the lower ones beside granite or a pocket. Two natural caverns lie open in
 * the middle rows. Every hillside holds three gems of each colour, three water pockets and three gas pockets.
 * On `near` the blocks under the burrow are, going down, earth, a red gem in earth, sandstone and granite, with
 * a water pocket and a gas pocket in the third row to either side.
 */
export function layWorld(seed: number, position: Place): World {
  const whole = seed >>> 0
  const rng = makeRng(whole)
  const kinds: Kind[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const roll = rng.next()
      kinds.push(r === 0 ? 'earth' : r === 1 ? (roll < 0.2 ? 'sandstone' : 'earth') : r < 4 ? (roll < 0.6 ? 'sandstone' : 'earth') : roll < 0.55 ? 'sandstone' : 'earth')
    }
  }
  const lode = new Array<Colour | null>(BLOCKS).fill(null)
  const kept = new Set<number>([BURROW_INDEX])
  const under = (r: number): number => indexOf(BURROW.c, r)
  if (position === 'near') for (const index of [under(1), under(2), under(3), under(4), indexOf(BURROW.c - 1, 2), indexOf(BURROW.c + 1, 2)]) kept.add(index)

  // Granite, in three or four lumps that begin in the fourth row or lower. On `near` the lump under the burrow
  // is one of them, so the last of the lumps drawn here is not laid there.
  // No lump touches another, not even at a corner, so a child sees three or four.
  const lumps = 3 + below(rng, 2)
  const lumpAt = new Map<number, number>()
  if (position === 'near') lumpAt.set(under(4), -1)
  /** Whether a block can take granite of one lump: in the fourth row or lower, not kept, and touching no other lump. */
  const fits = (c: number, r: number, lump: number): boolean => {
    if (!inHill(c, r) || r < 3 || kept.has(indexOf(c, r))) return false
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const other = inHill(c + dc, r + dr) ? lumpAt.get(indexOf(c + dc, r + dr)) : undefined
        if (other !== undefined && other !== lump) return false
      }
    }
    return true
  }
  for (let i = 0; i < lumps; i++) {
    let c = below(rng, COLS), r = 3 + below(rng, ROWS - 3)
    const size = 3 + below(rng, 3)
    const laid = position !== 'near' || i < lumps - 1
    // It begins clear of the others.
    for (let tries = 0; laid && !fits(c, r, i) && tries < 400; tries++) { c = below(rng, COLS); r = 3 + below(rng, ROWS - 3) }
    for (let n = 0; n < size; n++) {
      if (laid && fits(c, r, i)) { kinds[indexOf(c, r)] = 'granite'; lumpAt.set(indexOf(c, r), i) }
      const [dc, dr] = [[1, 0], [-1, 0], [0, 1], [0, -1]][below(rng, 4)]
      // It goes round the blocks that are kept and keeps clear of the other lumps, so a lump is never cut in two and never joins another.
      if (fits(c + dc, r + dr, i)) { c += dc; r += dr }
    }
  }

  // Two natural caverns, each two blocks side by side, clear of the burrow's column and of each other.
  const caverns: number[] = []
  for (let tries = 0; caverns.length < 4 && tries < 400; tries++) {
    const c = 1 + below(rng, COLS - 3), r = 2 + below(rng, ROWS - 3)
    if (Math.abs(c - BURROW.c) <= 2 || Math.abs(c + 1 - BURROW.c) <= 2) continue
    if (caverns.some((other) => Math.abs((other % COLS) - c) <= 3)) continue
    // Never in granite: a cavern there would cut a lump in two.
    if (kinds[indexOf(c, r)] === 'granite' || kinds[indexOf(c + 1, r)] === 'granite') continue
    caverns.push(indexOf(c, r), indexOf(c + 1, r))
  }
  for (const index of caverns) { kinds[index] = 'open'; kept.add(index) }

  if (position === 'near') {
    kinds[under(1)] = 'earth'
    kinds[under(2)] = 'earth'
    lode[under(2)] = 'red'
    kinds[under(3)] = 'sandstone'
    kinds[under(4)] = 'granite'
    kinds[indexOf(BURROW.c - 1, 2)] = 'water'
    kinds[indexOf(BURROW.c + 1, 2)] = 'gas'
  }
  kinds[BURROW_INDEX] = 'open'

  // Pockets, from the third row down, in ground, none beside another pocket.
  const pocketsOf = (kind: 'water' | 'gas'): number => kinds.filter((k) => k === kind).length
  const nearPocket = (index: number): boolean => beside(index).some((next) => kinds[next] === 'water' || kinds[next] === 'gas')
  for (const kind of ['water', 'gas'] as const) {
    for (let tries = 0; pocketsOf(kind) < 3 && tries < 2000; tries++) {
      const index = indexOf(below(rng, COLS), 2 + below(rng, ROWS - 2))
      if (kept.has(index) || !isGround(kinds[index]) || nearPocket(index)) continue
      kinds[index] = kind
      kept.add(index)
    }
  }

  // Gems, three of each colour, from the second row down: one of each colour in the upper rows, the rest lower
  // and beside granite or a pocket, where there is such a place.
  const hard = (index: number): boolean => beside(index).some((next) => kinds[next] === 'granite' || kinds[next] === 'water' || kinds[next] === 'gas')
  const count = (colour: Colour): number => lode.filter((held) => held === colour).length
  for (let n = 0; n < 3; n++) {
    for (const colour of COLOURS) {
      if (count(colour) > n) continue
      let placed = false
      for (let tries = 0; !placed && tries < 3000; tries++) {
        const deep = n > 0
        const r = deep ? 3 + below(rng, ROWS - 3) : 1 + below(rng, 2)
        const index = indexOf(below(rng, COLS), r)
        if (kept.has(index) || !isGround(kinds[index]) || lode[index]) continue
        // The rule for the lower ones is dropped only when no such place is left, so the count always holds.
        if (deep && tries < 2000 && !hard(index)) continue
        lode[index] = colour
        kept.add(index)
        placed = true
      }
    }
  }

  return {
    seed: whole, position, kinds, lode,
    hits: new Array<number>(BLOCKS).fill(0), wet: new Array<boolean>(BLOCKS).fill(false), water: new Array<boolean>(BLOCKS).fill(false),
    gems: [], mole: { at: BURROW_INDEX, sooty: false, tool: null, load: 'nothing' }, tools: { ...TOOL_HOME }, tied: null,
  }
}

// --- What falls, and where water goes ------------------------------------------------------------------------

export type Flow = {
  /** The dug block the unit of water starts in. */
  from: number
  /** Every block it runs through, in order, the first and the last included. */
  path: number[]
  /** Where it comes to rest, or null when there is no room left for it anywhere it can reach. */
  rest: number | null
}

/**
 * Where one block of water goes from a dug block: to the lowest place with room that it can reach by running
 * down and along through dug space, the nearest such place when there are several, and the left one when two are
 * as near. Water runs over water. With no room below or beside, it rises into the nearest room there is. The
 * world is not changed; the caller has taken the block of water out of `from` if it stood there.
 */
export function flowFrom(world: World, from: number): Flow {
  const search = (up: boolean): Flow | null => {
    const back = new Map<number, number>([[from, -1]])
    const far = new Map<number, number>([[from, 0]])
    let edge = [from]
    while (edge.length) {
      const next: number[] = []
      for (const at of edge) {
        const { c, r } = cellOf(at)
        for (const [dc, dr] of up ? [[0, 1], [-1, 0], [1, 0], [0, -1]] : [[0, 1], [-1, 0], [1, 0]]) {
          if (!inHill(c + dc, r + dr)) continue
          const to = indexOf(c + dc, r + dr)
          if (back.has(to) || world.kinds[to] !== 'open') continue
          back.set(to, at)
          far.set(to, far.get(at)! + 1)
          next.push(to)
        }
      }
      edge = next
    }
    let best = -1
    for (const at of back.keys()) {
      if (world.water[at]) continue
      if (best < 0) { best = at; continue }
      const a = cellOf(at), b = cellOf(best)
      if (a.r > b.r || (a.r === b.r && (far.get(at)! < far.get(best)! || (far.get(at) === far.get(best) && a.c < b.c)))) best = at
    }
    if (best < 0) return null
    const path: number[] = []
    for (let at = best; at >= 0; at = back.get(at)!) path.unshift(at)
    return { from, path, rest: best }
  }
  return search(false) ?? search(true) ?? { from, path: [from], rest: null }
}

/** Runs one block of water from a dug block to where it rests, and wets every block on the way. */
export function pour(world: World, from: number): Flow {
  const flow = flowFrom(world, from)
  for (const index of flow.path) world.wet[index] = true
  if (flow.rest !== null) { world.water[flow.rest] = true; world.wet[flow.rest] = true }
  return flow
}

export type Fall = { from: number; to: number }
export type Settled = {
  boulders: Fall[]
  gems: { gem: Gem; from: number; to: number; was: Rest }[]
  /** `over` is the floor it came down on first, where another tool lies; `letGo` marks the rope a lamp hung on. */
  tools: { tool: Tool; from: number; to: number; over: number | null; letGo: boolean }[]
  flows: Flow[]
}

/** The lowest dug block a thing dropped in a block falls to: down through dug space, water included. */
export function floorUnder(world: World, index: number): number {
  let at = index
  while (at + COLS < BLOCKS && world.kinds[at + COLS] === 'open') at += COLS
  return at
}

/** Whether another tool lies in a block: one block holds one tool. */
const otherToolIn = (world: World, tool: Tool, node: number): boolean =>
  TOOLS.some((other) => other !== tool && world.mole.tool !== other && world.tools[other] === node && !(other === 'rope' && ropeHangs(world)))

/**
 * Where a tool let go in a block comes to rest. It falls to the floor. On a floor where another tool lies it
 * comes to rest in the nearest free dug block: the floor of the block to either side first, then on through the
 * dug space, and where the dug space has no free floor, on top of the tool that lies there. `over` is the floor
 * it came down on first, when it went on from there.
 */
export function toolFall(world: World, tool: Tool, from: number): { to: number; over: number | null } {
  const floor = floorUnder(world, from)
  if (!otherToolIn(world, tool, floor)) return { to: floor, over: null }
  const seen = new Set<number>([floor])
  let edge = [floor]
  while (edge.length > 0) {
    const next: number[] = []
    for (const at of edge) {
      const c = at % COLS
      for (const to of [c > 0 ? at - 1 : -1, c < COLS - 1 ? at + 1 : -1, at + COLS, at - COLS]) {
        if (to < 0 || to >= BLOCKS || seen.has(to) || world.kinds[to] !== 'open') continue
        seen.add(to)
        const rest = floorUnder(world, to)
        if (!otherToolIn(world, tool, rest)) return { to: rest, over: floor }
        next.push(to)
      }
    }
    edge = next
  }
  for (let at = floor - COLS; at >= from; at -= COLS) if (!otherToolIn(world, tool, at)) return { to: at, over: null }
  return { to: from, over: null }
}

/** Whether the wall a gem is set in still stands: rock, or the edge of the hill. */
export function wallStands(world: World, gem: Gem): boolean {
  if (gem.rest !== 'left' && gem.rest !== 'right') return true
  const { c } = cellOf(gem.at)
  const next = c + (gem.rest === 'left' ? -1 : 1)
  return next < 0 || next >= COLS || world.kinds[gem.at + (gem.rest === 'left' ? -1 : 1)] !== 'open'
}

/** The highest dug block of the dug space straight above a block, the block itself when rock is over it. */
export function roofOver(world: World, index: number): number {
  let at = index
  while (at - COLS >= 0 && world.kinds[at - COLS] === 'open') at -= COLS
  return at
}

/**
 * Brings the hill to rest after a change: loose boulders fall, gems whose wall or floor is gone drop, tools lying
 * on a floor that is gone drop, standing water that has somewhere lower to go runs there, and the dug block under
 * a spout is wet. Says what moved. With `runWater` false the standing water is left where it is.
 */
export function settle(world: World, runWater = true): Settled {
  const out: Settled = { boulders: [], gems: [], tools: [], flows: [] }
  // Boulders, from the bottom up, so one falls clear before the one above it. A boulder comes down through dry
  // dug space, and stops over the mole, over water, over a gem and over a tool.
  for (let index = BLOCKS - 1; index >= 0; index--) {
    if (world.kinds[index] !== 'boulder') continue
    let to = index
    while (to + COLS < BLOCKS && world.kinds[to + COLS] === 'open' && !world.water[to + COLS] && to + COLS !== world.mole.at && gemsIn(world, to + COLS).length === 0 && toolAt(world, to + COLS) === null) to += COLS
    if (to === index) continue
    world.kinds[index] = 'open'
    world.kinds[to] = 'boulder'
    world.hits[to] = world.hits[index]
    world.hits[index] = 0
    if (world.tied === index) world.tied = to
    out.boulders.push({ from: index, to })
  }
  // Gems.
  let letGo = false
  for (const gem of world.gems) {
    if (gem.rest === 'bucket' || isGrass(gem.at)) continue
    const was = gem.rest, from = gem.at
    if (gem.rest === 'hung') {
      // A hung gem needs rock over its block; with the roof gone the rope lets go, and falls like any tool.
      if (from - COLS >= 0 && world.kinds[from - COLS] === 'open') { gem.rest = 'floor'; world.tools.rope = from; letGo = world.mole.tool !== 'rope' }
    } else if (!wallStands(world, gem)) gem.rest = 'floor'
    if (gem.rest === 'floor') gem.at = floorUnder(world, from)
    if (gem.rest !== was || gem.at !== from) out.gems.push({ gem, from, to: gem.at, was })
  }
  // Tools that lie in the hill. The rope a lamp has just let go comes down last, onto whatever lies under the lamp:
  // the tool that lay there stays, and the rope goes on beside it.
  const hook = world.tools.rope
  if (letGo) world.tools.rope = -1
  for (const tool of TOOLS) {
    const from = world.tools[tool]
    if (world.mole.tool === tool || from < 0 || isGrass(from)) continue
    if (tool === 'rope' && world.gems.some((gem) => gem.rest === 'hung' && gem.at === from)) continue
    // A tool lies still where `toolFall` leaves it: on a free floor, or on a tool where the dug space has no free floor.
    const { to, over } = toolFall(world, tool, from)
    world.tools[tool] = to
    if (to !== from) out.tools.push({ tool, from, to, over, letGo: false })
  }
  if (letGo) {
    world.tools.rope = hook
    const { to, over } = toolFall(world, 'rope', hook)
    world.tools.rope = to
    out.tools.push({ tool: 'rope', from: hook, to, over, letGo: true })
  }
  // Water, lowest first: each block of it that can get lower runs there. The game leaves this out and plays it
  // as a scene (`unstable` says whether there is any).
  for (let pass = 0; runWater && pass < 4; pass++) {
    let moved = false
    for (let index = BLOCKS - 1; index >= 0; index--) {
      if (!world.water[index]) continue
      world.water[index] = false
      const flow = flowFrom(world, index)
      if (flow.rest === index || flow.rest === null || flow.path.length < 2) { world.water[index] = true; continue }
      for (const step of flow.path) world.wet[step] = true
      world.water[flow.rest] = true
      world.wet[flow.rest] = true
      out.flows.push(flow)
      moved = true
    }
    if (!moved) break
  }
  // A spout keeps the dug block under it wet.
  for (let index = 0; index + COLS < BLOCKS; index++) if (world.kinds[index] === 'spout' && world.kinds[index + COLS] === 'open') world.wet[index + COLS] = true
  // Only a dug block is wet or holds water: packed earth and a boulder that has come to rest take both with them.
  for (let index = 0; index < BLOCKS; index++) if (world.kinds[index] !== 'open') { world.wet[index] = false; world.water[index] = false }
  // The rope stays tied only to a boulder that is still beside the mole.
  if (world.tied !== null && (world.mole.tool !== 'rope' || world.kinds[world.tied] !== 'boulder' || isGrass(world.mole.at) || !beside(world.mole.at).includes(world.tied))) world.tied = null
  return out
}

/**
 * Takes a block of ground away. A gem it held springs free and lies on its floor, to be settled by the caller.
 * Returns the colour of that gem, if there was one.
 */
export function takeGround(world: World, index: number): Colour | null {
  const colour = world.lode[index]
  world.kinds[index] = 'open'
  world.hits[index] = 0
  world.lode[index] = null
  if (colour) world.gems.push({ colour, at: index, rest: 'floor' })
  return colour
}

/** Whether earth tipped from the bucket can pack back into a dug block: empty of tools and hung gems, and not the burrow. Standing water is no bar: the earth takes it up. */
export function canPack(world: World, index: number): boolean {
  return world.kinds[index] === 'open' && index !== BURROW_INDEX && index !== world.mole.at && toolAt(world, index) === null && !gemsIn(world, index).some((gem) => gem.rest === 'hung')
}

/**
 * Packs a bucket of earth back into a dug block. A gem that lay or sat there is in the earth again, and lights
 * nothing. A block of earth holds one gem: any other gem that was there is pushed out into a dug block that
 * touches it, the one above first, and lies on the floor under it. Says which gems were pushed, and from where to where. No
 * gem is ever lost: one with no dug block to go to stays where it is and is found when the earth is dug again.
 */
export function pack(world: World, index: number): { gem: Gem; from: number; to: number }[] {
  const pushed: { gem: Gem; from: number; to: number }[] = []
  const buried = gemsIn(world, index)
  world.kinds[index] = 'earth'
  world.hits[index] = 0
  world.wet[index] = false
  world.water[index] = false
  if (buried.length > 0) {
    world.lode[index] = buried[0].colour
    world.gems.splice(world.gems.indexOf(buried[0]), 1)
    for (const gem of buried.slice(1)) {
      const out = dugNear(world, index)
      if (out === null) continue
      gem.at = floorUnder(world, out)
      gem.rest = 'floor'
      pushed.push({ gem, from: index, to: gem.at })
    }
  }
  return pushed
}

/** The dug block that touches a block: the one above first, then to either side, then below. */
function dugNear(world: World, index: number): number | null {
  const c = index % COLS
  for (const to of [index - COLS, c > 0 ? index - 1 : -1, c < COLS - 1 ? index + 1 : -1, index + COLS]) {
    if (to >= 0 && to < BLOCKS && world.kinds[to] === 'open') return to
  }
  return null
}

// --- Light ---------------------------------------------------------------------------------------------------

/**
 * The light on every block, as the colours that reach it: a gem lights the dug space round it as far as two
 * blocks along the tunnels; rock and loose boulders stop it and water does not; a gem under standing water
 * lights its own block; a gem in the bucket lights only upward, as far as the roof. A gem in the rock, on the
 * grass or in a bucket on the grass lights nothing.
 */
export function lightOf(world: World): number[] {
  const masks = new Array<number>(BLOCKS).fill(0)
  for (const gem of world.gems) {
    const node = gemNode(world, gem)
    if (isGrass(node) || world.kinds[node] !== 'open') continue
    const bit = BIT[gem.colour]
    if (gem.rest === 'bucket') {
      for (let at = node; at >= 0 && world.kinds[at] === 'open'; at -= COLS) masks[at] |= bit
      continue
    }
    masks[node] |= bit
    if (world.water[node]) continue
    let edge = [node]
    const seen = new Set<number>(edge)
    for (let step = 0; step < REACH; step++) {
      const next: number[] = []
      for (const at of edge) {
        for (const to of beside(at)) {
          if (seen.has(to) || world.kinds[to] !== 'open') continue
          seen.add(to)
          masks[to] |= bit
          next.push(to)
        }
      }
      edge = next
    }
  }
  return masks
}

// --- Who lives where -----------------------------------------------------------------------------------------

export type DwellerKind = 'bat' | 'newt' | 'lizard' | 'mushroom' | 'beetle' | 'fern' | 'glowworm' | 'snail' | 'moth' | 'dragonfly' | 'spider' | 'flower'
export const DWELLER_KINDS: readonly DwellerKind[] = ['bat', 'newt', 'lizard', 'mushroom', 'beetle', 'fern', 'glowworm', 'snail', 'moth', 'dragonfly', 'spider', 'flower']
export type Dweller = { kind: DwellerKind; at: number }

/** Who lives in a dug place, by the light on it and by whether it is wet. The table never changes. */
export function dwellerOf(mask: number, wet: boolean): DwellerKind | null {
  switch (mask) {
    case 0: return wet ? 'newt' : 'bat'
    case RED: return wet ? 'mushroom' : 'lizard'
    case GREEN: return wet ? 'fern' : 'beetle'
    case BLUE: return wet ? 'snail' : 'glowworm'
    case RED | GREEN: return 'moth'
    case GREEN | BLUE: return 'dragonfly'
    case RED | BLUE: return 'spider'
    default: return wet ? 'flower' : null
  }
}

/** Where each kind sits in its block: under the roof, on the floor, or in the air. */
export const PERCH: Record<DwellerKind, 'roof' | 'floor' | 'air'> = {
  bat: 'roof', glowworm: 'roof', spider: 'roof',
  newt: 'floor', lizard: 'floor', mushroom: 'floor', beetle: 'floor', fern: 'floor', snail: 'floor', flower: 'floor',
  moth: 'air', dragonfly: 'air',
}

/** A fixed rank for each block of a hillside, so who lives where does not jump about as a place grows. */
function rank(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0
  return (h ^ (h >>> 13)) >>> 0
}

/** The dug places of the hill: the dug blocks that touch each other and have the same light and the same wet. */
export function placesOf(world: World, masks: readonly number[]): number[][] {
  const seen = new Array<boolean>(BLOCKS).fill(false)
  const out: number[][] = []
  for (let start = 0; start < BLOCKS; start++) {
    if (seen[start] || world.kinds[start] !== 'open') continue
    const place: number[] = []
    const queue = [start]
    seen[start] = true
    while (queue.length) {
      const at = queue.pop()!
      place.push(at)
      for (const next of beside(at)) {
        if (seen[next] || world.kinds[next] !== 'open' || masks[next] !== masks[start] || world.wet[next] !== world.wet[start]) continue
        seen[next] = true
        queue.push(next)
      }
    }
    out.push(place.sort((a, b) => a - b))
  }
  return out
}

/**
 * Who lives in the hill. A place of two blocks or more is lived in: one dweller, and one more for every three
 * blocks beyond that; the flower stands alone however large its place is. Which blocks they take follows a fixed
 * rank, the same every time for the same cave. A dweller of the roof needs rock over its block and one of the
 * floor needs ground under it; none takes a block where a gem or a tool is, and only a newt one where water
 * stands.
 */
export function dwellersOf(world: World, masks: readonly number[] = lightOf(world)): Dweller[] {
  const out: Dweller[] = []
  for (const place of placesOf(world, masks)) {
    if (place.length < 2) continue
    const kind = dwellerOf(masks[place[0]], world.wet[place[0]])
    if (!kind) continue
    const count = kind === 'flower' ? 1 : 1 + Math.floor((place.length - 2) / 3)
    const perch = PERCH[kind]
    const fit = place.filter((index) => {
      if (world.water[index] && kind !== 'newt') return false
      if (gemsIn(world, index).length > 0 || toolAt(world, index) !== null) return false
      if (perch === 'roof') return index - COLS < 0 || world.kinds[index - COLS] !== 'open'
      if (perch === 'floor') return index + COLS >= BLOCKS || world.kinds[index + COLS] !== 'open'
      return true
    })
    fit.sort((a, b) => rank(world.seed, a) - rank(world.seed, b))
    for (const at of fit.slice(0, count)) out.push({ kind, at })
  }
  return out.sort((a, b) => a.at - b.at)
}

/** The earth blocks a worm looks out of on a fresh hillside: a few, by the same fixed rank, none beside another. */
export function wormsOf(world: World): number[] {
  const earth: number[] = []
  for (let index = 0; index < BLOCKS; index++) if (world.kinds[index] === 'earth' && !world.lode[index] && index >= COLS) earth.push(index)
  earth.sort((a, b) => rank(world.seed ^ 0x77, a) - rank(world.seed ^ 0x77, b))
  const out: number[] = []
  for (const index of earth) {
    if (out.length >= 4) break
    if (out.some((other) => Math.abs((other % COLS) - (index % COLS)) + Math.abs(Math.floor(other / COLS) - Math.floor(index / COLS)) < 3)) continue
    out.push(index)
  }
  return out.sort((a, b) => a - b)
}

/** Whether any standing water has somewhere lower to go. */
export function unstable(world: World): boolean {
  for (let index = BLOCKS - 1; index >= 0; index--) {
    if (!world.water[index]) continue
    world.water[index] = false
    const flow = flowFrom(world, index)
    world.water[index] = true
    if (flow.rest !== index && flow.rest !== null && flow.path.length >= 2) return true
  }
  return false
}

import type { Who } from './folk'
import { HOLLOW, ceilingY, groundY } from './kinds'
import { build, carriedWith, isRested, laidOf, settle, topOf, touchAt, type Laid, type Rested } from './rest'

// The evening, worked out with no drawing and no time in it. When the sun is
// let go below the hill, the house as it stands decides everything that
// happens: the fat one tries every leaf from the left, the tiny one gets into
// every acorn cap, the tidy one sweeps with the first feather from the right.
// The plan is the list of those parts in order, each with the house as it
// stands when the part is over, and the state that is saved when the scene
// starts. The same house always gives the same evening.

/** Where one of the folk lies while the evening stands: the thing it ended on, or none for the floor, and the place along the hollow. */
export type Asleep = { who: Who; on: number | null; x: number }

/** What one of the folk does with one thing: a cell of the second grid in ART.md, or what it does with none of its things in the house. */
export type ActName =
  | 'rug' | 'bed' | 'slide' | 'roof' | 'tablecloth' | 'noLeaf'
  | 'bath' | 'cradle' | 'lamp' | 'bell' | 'bowl' | 'noCap'
  | 'broom' | 'quilt' | 'tickler' | 'flag' | 'sail' | 'noFeather'

export type Part = {
  who: Who
  act: ActName
  /** The thing it uses, or none. */
  thing: number | null
  /** The twigs that snap in this part, from the left: one after the other. */
  twigs: number[]
  /** What the bath soaks in this part, and how far along the ground its water runs. */
  flooded: number[]
  spill: { from: number; to: number; y: number } | null
  /**
   * Where the roof first touches when its twigs snap and it cannot lie where it comes down: straight below where it
   * stood. It slides from there the shortest way to free ground, or goes home where there is none. Null where it lies as it lands.
   */
  lands: { x: number; y: number } | null
  /** The bark that sails off in this part. */
  sails: number | null
  /** The fat one is woken in this part. */
  wakes: boolean
  /** It falls asleep here and goes no further. */
  sleeps: boolean
  /** The house, and what is snapped and soaked, when the part is over. */
  house: Rested[]
  snapped: number[]
  soaked: number[]
}

export type Plan = {
  parts: Part[]
  /** What is saved when the evening starts. */
  things: Laid[]
  snapped: number[]
  soaked: number[]
  asleep: Asleep[]
}

/** How far a bath's water runs to each side along the ground it spills on. */
export const SPILL_REACH = 150

/** What a bath soaks: what lies no higher than its own underside, as far as its water runs. From the root step the water runs over the edge onto the floor below. */
export function floodOf(house: readonly Rested[], bath: Rested): { soaked: number[]; from: number; to: number; y: number } {
  const onStep = bath.x < HOLLOW.stepRight
  const from = Math.max(HOLLOW.left, bath.x - SPILL_REACH)
  const to = Math.min(HOLLOW.right, onStep ? HOLLOW.stepRight + SPILL_REACH : bath.x + SPILL_REACH)
  const soaked = house.filter((r) => r.id !== bath.id && r.x + r.w / 2 > from && r.x - r.w / 2 < to && r.y >= bath.y - 6).map((r) => r.id)
  return { soaked, from, to, y: onStep ? HOLLOW.floorY : groundY(bath.x) }
}

/** A slab sails at least this far, or not at all. */
export const SAIL_LEAST = 24

/**
 * How far a slab on flooded ground sails, and which way: toward the wall of its ground that is further off, as far
 * as nothing stands in the way of it and of what rests on it, and the other way where that way is shut. 0 where
 * neither way is free.
 */
export function sailBy(house: readonly Rested[], slab: Rested): number {
  const riders = carriedWith(house, slab.id)
  const ids = new Set(riders.map((r) => r.id))
  const left = Math.min(...riders.map((r) => r.x - r.w / 2)), right = Math.max(...riders.map((r) => r.x + r.w / 2))
  const top = Math.min(...riders.map(topOf))
  const onStep = slab.x < HOLLOW.stepRight
  const walls = { left: onStep ? HOLLOW.left : HOLLOW.stepRight, right: onStep ? HOLLOW.stepRight : HOLLOW.right }
  // What stands in the room the slab and its load sweep through, on either side of it.
  const inWay = house.filter((r) => !ids.has(r.id) && r.y > top + 1 && topOf(r) < slab.y - 1 && (r.x < slab.x ? r.x > walls.left - 1 : r.x < walls.right + 1))
  const free = {
    left: left - Math.max(walls.left, ...inWay.filter((r) => r.x < slab.x).map((r) => r.x + r.w / 2)),
    right: Math.min(walls.right, ...inWay.filter((r) => r.x >= slab.x).map((r) => r.x - r.w / 2)) - right,
  }
  // The arch comes down low near a wall: it stops where its load would stand up into it.
  const fits = (by: number): boolean => riders.every((r) => topOf(r) >= ceilingY(r.x + by + Math.sign(by) * r.w / 2) - 12)
  for (const way of (free.right >= free.left ? [1, -1] : [-1, 1]) as (1 | -1)[]) {
    let by = Math.floor(way === 1 ? free.right : free.left)
    while (by >= SAIL_LEAST && !fits(way * by)) by -= 6
    if (by >= SAIL_LEAST) return way * by
  }
  return 0
}

/** Where the middle of the heap may be when the fat one lies in it: far enough from the root step and from the right wall for all three to lie on the floor. */
export const HEAP_ROOM = { from: HOLLOW.stepRight + 110, to: HOLLOW.right - 150 } as const
/** Where it may be when the fat one is in a bed: the other two sit down side by side, and need less. */
export const PAIR_ROOM = { from: HOLLOW.stepRight + 46, to: HOLLOW.right - 60 } as const

/**
 * The middle of the widest free stretch of the hollow's floor, where those with no bed lie in a heap.
 * `fatLies` says whether the fat one lies in it, at its full length.
 */
export function heapPlace(house: readonly Rested[], fatLies = true): number {
  if (!fatLies) return pairPlace(house).x
  const best = widestFree(house)
  // The heap keeps clear of the root step at one end and of the wall at the other.
  return Math.round(Math.min(HEAP_ROOM.to, Math.max(HEAP_ROOM.from, (best.from + best.to) / 2)))
}

/** Where the two who sit side by side sit from the middle of their place: the tiny one in front on the left, the tidy one on the right. */
export const PAIR_AT = { tidy: 30, tiny: -18 } as const
/** The tidy one asleep on the floor, at its size in the hollow: half its width, how far it nods toward the tiny one, and how far its hat goes that way with the whole nod. */
export const TIDY_ASLEEP = { half: 29, lean: 7, nod: 14 } as const

/**
 * Where the two with no bed sit down side by side, and how far the tidy one nods there. The tall one is the one that
 * would lie over a neighbour, so the place is chosen for it: the widest stretch of floor with nothing on it or over it
 * that holds it whole, nodding if there is room for the nod and upright if there is not. The small one sits in front
 * on its left, in front of whatever is there. With no such stretch they sit in the middle of the widest free floor,
 * in front of what stands there.
 */
export function pairPlace(house: readonly Rested[]): { x: number; nod: number; clear: boolean } {
  // The stretches of floor with nothing standing on them and nothing hanging over them, the tip of a bed's leaf included.
  const over = house.filter((r) => r.x + r.w / 2 > HOLLOW.stepRight).sort((a, b) => a.x - half(a) - (b.x - half(b)))
  const gaps: { from: number; to: number }[] = []
  let from: number = HOLLOW.stepRight
  for (const r of [...over, null]) {
    const to = r ? r.x - half(r) : HOLLOW.right
    if (to > from) gaps.push({ from, to })
    if (r) from = Math.max(from, r.x + half(r))
  }
  gaps.sort((a, b) => b.to - b.from - (a.to - a.from) || a.from - b.from)
  for (const nod of [1, 0]) {
    for (const gap of gaps) {
      const low = Math.max(gap.from + TIDY_ASLEEP.half + nod * TIDY_ASLEEP.nod, PAIR_ROOM.from + PAIR_AT.tidy)
      const high = Math.min(gap.to - TIDY_ASLEEP.half, PAIR_ROOM.to + PAIR_AT.tidy)
      if (low > high) continue
      // The two of them in the middle of the stretch where it holds both, and the tall one inside it where it does not.
      const tidy = Math.min(high, Math.max(low, (gap.from + gap.to) / 2 + PAIR_AT.tidy))
      return { x: Math.round(tidy - PAIR_AT.tidy), nod, clear: true }
    }
  }
  const best = widestFree(house)
  return { x: Math.round(Math.min(PAIR_ROOM.to, Math.max(PAIR_ROOM.from, (best.from + best.to) / 2))), nod: 0, clear: false }
}
const half = (r: Rested): number => r.w / 2

/** The widest stretch of the hollow's floor on which nothing stands. */
export function widestFree(house: readonly Rested[]): { from: number; to: number } {
  // What stands on the floor: a thing set on it, and the foot of a slide or of a see-saw that comes down on it.
  const onFloor = house.filter((r) => r.y >= HOLLOW.floorY - 6 && r.x + r.w / 2 > HOLLOW.stepRight).sort((a, b) => a.x - b.x)
  let best: { from: number; to: number } = { from: HOLLOW.stepRight, to: HOLLOW.right }, widest = -1, from: number = HOLLOW.stepRight
  for (const r of [...onFloor, null]) {
    const to = r ? r.x - r.w / 2 : HOLLOW.right
    if (to - from > widest) {
      widest = to - from
      best = { from, to }
    }
    if (r) from = Math.max(from, r.x + r.w / 2)
  }
  return best
}

export function planEvening(things: readonly Laid[], snappedBefore: readonly number[], soakedBefore: readonly number[]): Plan {
  const snapped = new Set(snappedBefore), soaked = new Set(soakedBefore)
  let laid: Laid[] = things.map(({ id, x }) => ({ id, x }))
  let house = build(laid, snapped)
  const parts: Part[] = []
  const part = (who: Who, act: ActName, thing: number | null, more: Partial<Part> = {}): void => {
    parts.push({ who, act, thing, twigs: [], flooded: [], spill: null, lands: null, sails: null, wakes: false, sleeps: false, house, snapped: [...snapped], soaked: [...soaked], ...more })
  }
  const settleAgain = (): void => {
    house = build(laid, snapped)
    // What can no longer rest is back on the forest floor, whole and dry.
    laid = laidOf(house)
    for (const id of [...snapped]) if (!house.some((r) => r.id === id)) snapped.delete(id)
    for (const id of [...soaked]) if (!house.some((r) => r.id === id)) soaked.delete(id)
  }
  const sleeping: Record<Who, number | null> = { fat: null, tidy: null, tiny: null }

  // The fat one tries every leaf, from the left, and sleeps in the first bed.
  const leaves = house.filter((r) => r.kind === 'leaf').sort((a, b) => a.x - b.x).map((r) => r.id)
  for (const id of leaves) {
    const leaf = house.find((r) => r.id === id)
    if (!leaf) continue
    // A leaf that found no side to lean to lies flat on its stone: that is no slide. The fat one lies down on it as on a rug.
    const act = (leaf.cell.is === 'slide' && leaf.lies === 'flat' ? 'rug' : leaf.cell.is) as ActName
    if (act === 'roof') {
      const twigs = leaf.under.filter((under) => !snapped.has(under)).sort((a, b) => (house.find((r) => r.id === a)?.x ?? 0) - (house.find((r) => r.id === b)?.x ?? 0))
      for (const twig of twigs) snapped.add(twig)
      // The roof comes down where it stands, onto the stumps. It is the thing that moved, so it is the one that gives
      // way: everything else lies as it lay, and the roof comes to rest among it as a thing let go there would.
      let lands: Part['lands'] = null
      if (twigs.length > 0) {
        laid = laid.filter((thing) => thing.id !== id)
        settleAgain()
        // It comes down from where it stands, which is over the twig it was set on.
        lands = touchAt(house, id, 'leaf', leaf.x, snapped)
        const down = settle(house, id, 'leaf', leaf.x, snapped)
        if (isRested(down)) laid = [...laid, { id, x: down.dropX }]
        settleAgain()
      }
      part('fat', act, id, { twigs, lands })
    } else if (act === 'tablecloth') {
      laid = laid.filter((thing) => thing.id !== id)
      settleAgain()
      part('fat', act, id)
    } else if (act === 'bed') {
      sleeping.fat = id
      part('fat', act, id, { sleeps: true })
      break
    } else part('fat', act, id)
  }
  if (leaves.length === 0) part('fat', 'noLeaf', null)

  // The tiny one gets into every acorn cap, the nearest to its seat first, and the cradles after the others:
  // it rocks in each, and falls asleep in the last.
  const isCradle = (r: Rested): number => (r.cell.is === 'cradle' ? 1 : 0)
  const caps = house.filter((r) => r.kind === 'cap').sort((a, b) => isCradle(a) - isCradle(b) || b.x - a.x).map((r) => r.id)
  const lastCap = caps[caps.length - 1]
  const floodedNow = new Set<number>()
  for (const id of caps) {
    const cap = house.find((r) => r.id === id)
    if (!cap) continue
    const act = cap.cell.is as ActName
    if (act === 'bath') {
      const flood = floodOf(house, cap)
      for (const wet of flood.soaked) {
        soaked.add(wet)
        floodedNow.add(wet)
      }
      part('tiny', act, id, { flooded: flood.soaked, spill: { from: flood.from, to: flood.to, y: flood.y } })
    } else if (act === 'cradle') {
      if (id === lastCap) sleeping.tiny = id
      part('tiny', act, id, { sleeps: id === lastCap })
    } else if (act === 'bell') {
      const wakes = sleeping.fat !== null
      sleeping.fat = null
      part('tiny', act, id, { wakes })
    } else part('tiny', act, id)
  }
  if (caps.length === 0) part('tiny', 'noCap', null)

  // The tidy one sweeps with the first feather it reaches, from the right.
  const feather = house.filter((r) => r.kind === 'feather').sort((a, b) => b.x - a.x)[0]
  if (!feather) part('tidy', 'noFeather', null)
  else {
    const act = feather.cell.is as ActName
    const slab = act === 'sail' ? house.find((r) => r.id === feather.under[0]) : undefined
    // The slab lies on ground a bath has spilt over this evening: it sails off along that ground with what rests on it,
    // as far as the way is free, to the wall or to the first thing that stands in its way.
    const by = slab && slab.on === 'ground' && floodedNow.has(slab.id) ? sailBy(house, slab) : 0
    if (slab && by !== 0) {
      const riders = new Set(carriedWith(house, slab.id).map((r) => r.id))
      const before = house
      laid = laid.map((thing) => (riders.has(thing.id) ? { id: thing.id, x: Math.round((thing.x + by) * 10) / 10 } : thing))
      settleAgain()
      // It sails only if the slab and everything on it arrive as they set off, each moved by the same way along.
      const rode = [...riders].every((id) => {
        const was = before.find((r) => r.id === id), now = house.find((r) => r.id === id)
        return was !== undefined && now !== undefined && now.y === was.y && now.lies === was.lies && Math.abs(now.x - was.x - by) < 0.11
      })
      if (rode) part('tidy', act, feather.id, { sails: slab.id })
      else {
        laid = laidOf(before)
        settleAgain()
        part('tidy', act, feather.id)
      }
    } else part('tidy', act, feather.id)
  }

  // Each sleeps where it ended, and those with no bed in a heap on the floor.
  const heap = heapPlace(house, sleeping.fat === null)
  const asleep: Asleep[] = (['fat', 'tidy', 'tiny'] as const).map((who) => {
    const on = house.find((r) => r.id === sleeping[who])
    return on ? { who, on: on.id, x: on.x } : { who, on: null, x: heap }
  })
  return { parts, things: laid, snapped: [...snapped].sort((a, b) => a - b), soaked: [...soaked].sort((a, b) => a - b), asleep }
}

/** Where a sleeper's feet are: on top of the thing it lies on, or on the floor of the hollow. */
export function bedOf(house: readonly Rested[], asleep: Asleep): { x: number; y: number } {
  const on = house.find((r) => r.id === asleep.on)
  return on ? { x: on.x, y: topOf(on) } : { x: asleep.x, y: groundY(asleep.x) }
}

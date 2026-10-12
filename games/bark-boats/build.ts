// The boat as built: its hull, what stands in its two mast holes, what is
// threaded on those masts and what lies on its deck. Pure rules, with no
// drawing and no clock. Twelve makings: three hulls, three masts, three sails
// and three loads, one of each kind.

export type HullKind = 'bark' | 'walnut' | 'pod'
export type MastKind = 'twig' | 'stalk' | 'stem'
export type SailKind = 'birch' | 'maple' | 'feather'
export type LoadKind = 'berry' | 'cap' | 'pebble'
/** A making that is put on a hull. */
export type Kind = MastKind | SailKind | LoadKind
/** Any of the twelve. */
export type Making = Kind | HullKind

export const HULL_KINDS: readonly HullKind[] = ['bark', 'walnut', 'pod']
export const KINDS: readonly Kind[] = ['twig', 'stalk', 'stem', 'birch', 'maple', 'feather', 'berry', 'cap', 'pebble']
export const ALL_MAKINGS: readonly Making[] = [...HULL_KINDS, ...KINDS]

export type Part = 'hull' | 'mast' | 'sail' | 'load'
/** The row of the bank grid a making belongs to: the three masts answer alike, and so do the two leaves. */
export type Family = 'hull' | 'mast' | 'leaf' | 'feather' | 'berry' | 'cap' | 'pebble'

export type MakingFacts = {
  part: Part
  family: Family
  /** How heavy it is, in the weight of a berry. */
  weight: number
  /** How much wind it takes as a sail, 0 to 1. */
  area: number
  /** How far from its middle a finger still picks it up, in stage units: never under 40, so the target is 80 across. */
  reach: number
  /** Half the width and half the height of the room it takes lying on the bank. */
  hw: number
  hh: number
  /** A mast's length. */
  length: number
}

const m = (part: Part, family: Family, weight: number, area: number, reach: number, hw: number, hh: number, length = 0): MakingFacts => ({ part, family, weight, area, reach, hw, hh, length })

export const MAKINGS: Record<Making, MakingFacts> = {
  bark: m('hull', 'hull', 4, 0, 60, 152, 40),
  walnut: m('hull', 'hull', 3, 0, 56, 106, 44),
  pod: m('hull', 'hull', 2.5, 0, 56, 152, 26),
  twig: m('mast', 'mast', 1, 0, 46, 88, 16, 170),
  stalk: m('mast', 'mast', 1.4, 0, 46, 128, 16, 250),
  stem: m('mast', 'mast', 0.6, 0, 46, 104, 20, 205),
  birch: m('sail', 'leaf', 0.5, 0.45, 44, 36, 42),
  maple: m('sail', 'leaf', 1, 1, 54, 58, 56),
  feather: m('sail', 'feather', 0.2, 0.5, 46, 58, 24),
  berry: m('load', 'berry', 1, 0, 40, 20, 20),
  cap: m('load', 'cap', 0.6, 0, 40, 26, 22),
  pebble: m('load', 'pebble', 6, 0, 44, 34, 26),
}

export const GNOME_WEIGHT = 1.5

/** A hull, measured from its keel point. The bow points downstream, which is to the left, so x toward the bow is negative; y upward is negative. */
export type HullShape = {
  halfWidth: number
  /** The deck, where loads sit and masts stand. */
  deck: number
  /** The rim of the hull at its ends. */
  rim: number
  /** The two mast holes: bow, stern. */
  holes: readonly [number, number]
  /** Where up to three loads sit, from the bow: along the hull, and how far above the deck (a pile in a short hull). */
  loads: readonly (readonly [number, number])[]
  /** Where the gnome sits, and where a blanket lies over him. */
  seat: number
}

// The loads lie far enough apart that each keeps a finger's room of its own, 48 px at 1024 by 768 (touch.test.ts).
export const HULLS: Record<HullKind, HullShape> = {
  bark: { halfWidth: 150, deck: -46, rim: -64, holes: [-50, 26], loads: [[-126, 0], [-70, 0], [-12, 0]], seat: 108 },
  walnut: { halfWidth: 104, deck: -58, rim: -86, holes: [-40, 8], loads: [[-83, 0], [-26, 0], [31, 0]], seat: 62 },
  pod: { halfWidth: 150, deck: -34, rim: -46, holes: [-58, 20], loads: [[-130, 0], [-74, 0], [-16, 0]], seat: 106 },
}

export const MAX_DECK = 4

export type Build = {
  /** The hull on the stone or afloat, or null when the stone is bare. */
  hull: HullKind | null
  /** What stands in the bow hole and in the stern hole. */
  masts: [MastKind | null, MastKind | null]
  /** What is threaded on each of those masts. */
  sails: [SailKind | null, SailKind | null]
  /** What lies on the deck in the order it was put there: loads, and a leaf or feather lying as a blanket. */
  deck: (LoadKind | SailKind)[]
}

/** A place on the boat: a mast hole, the sail of a mast, or a place in the deck's list. */
export type Slot = { on: 'mast' | 'sail'; index: 0 | 1 } | { on: 'deck'; index: number }

export function bareBuild(hull: HullKind | null): Build {
  return { hull, masts: [null, null], sails: [null, null], deck: [] }
}

export function copyBuild(build: Build): Build {
  return { hull: build.hull, masts: [build.masts[0], build.masts[1]], sails: [build.sails[0], build.sails[1]], deck: [...build.deck] }
}

export const shapeOf = (build: Build): HullShape => HULLS[build.hull ?? 'bark']

const isSail = (kind: Making): kind is SailKind => MAKINGS[kind].part === 'sail'
const isLoad = (kind: Making): kind is LoadKind => MAKINGS[kind].part === 'load'
const isMast = (kind: Making): kind is MastKind => MAKINGS[kind].part === 'mast'

/** Which of the two (holes or masts) is nearer to where the thing was let go, along the hull. */
function nearer(holes: readonly [number, number], dx: number, free: (index: 0 | 1) => boolean): 0 | 1 | null {
  const order: (0 | 1)[] = Math.abs(dx - holes[0]) <= Math.abs(dx - holes[1]) ? [0, 1] : [1, 0]
  for (const index of order) if (free(index)) return index
  return null
}

/**
 * Where the boat takes a making let go over it, `dx` along the hull from the keel point, or null when it has
 * no room for it (or no hull). A mast goes into the nearer free hole. A sail is threaded on the nearer mast
 * that has none, and with no such mast it lies on the deck as a blanket. A load sits on the deck. The deck
 * holds four things.
 */
export function placeFor(build: Build, kind: Kind, dx: number): Slot | null {
  if (build.hull === null) return null
  const holes = HULLS[build.hull].holes
  if (isMast(kind)) {
    const index = nearer(holes, dx, (i) => build.masts[i] === null)
    return index === null ? null : { on: 'mast', index }
  }
  if (isSail(kind)) {
    const index = nearer(holes, dx, (i) => build.masts[i] !== null && build.sails[i] === null)
    if (index !== null) return { on: 'sail', index }
  }
  return build.deck.length < MAX_DECK ? { on: 'deck', index: build.deck.length } : null
}

/** Puts `kind` where `placeFor` said. */
export function put(build: Build, kind: Kind, slot: Slot): void {
  if (slot.on === 'mast' && isMast(kind)) build.masts[slot.index] = kind
  else if (slot.on === 'sail' && isSail(kind)) build.sails[slot.index] = kind
  else if (slot.on === 'deck' && (isSail(kind) || isLoad(kind))) build.deck.splice(slot.index, 0, kind)
}

/** What is at `slot`, or null. */
export function kindAt(build: Build, slot: Slot): Kind | null {
  if (slot.on === 'mast') return build.masts[slot.index]
  if (slot.on === 'sail') return build.sails[slot.index]
  return build.deck[slot.index] ?? null
}

/** A mast that carries a sail is held by it: the sail comes off first. */
export function canTake(build: Build, slot: Slot): boolean {
  if (kindAt(build, slot) === null) return false
  return slot.on !== 'mast' || build.sails[slot.index] === null
}

/** Whether the deck's thing at `index` lies as a blanket: a leaf or a feather on the deck. */
export function isBlanket(build: Build, index: number): boolean {
  const kind = build.deck[index]
  return kind !== undefined && isSail(kind)
}

/** How far each blanket lies along the deck and up from the one under it: a pile that leans toward the bow, so each keeps a finger's room across and down. */
const PILE = 30

/** Where the deck's thing at `index` lies, from the keel point: loads from the bow, blankets over the gnome's seat. */
export function deckSpot(build: Build, index: number): { x: number; y: number } {
  const shape = shapeOf(build)
  let loads = 0, blankets = 0
  for (let i = 0; i < index; i++) if (isBlanket(build, i)) blankets += 1; else loads += 1
  if (isBlanket(build, index)) return { x: shape.seat - 6 - blankets * PILE, y: shape.deck - 46 - blankets * PILE }
  const [x, up] = shape.loads[Math.min(loads, shape.loads.length - 1)]
  return { x, y: shape.deck - 16 + up }
}

/** Every making on the boat, with its slot. */
export function aboard(build: Build): { kind: Kind; slot: Slot }[] {
  const all: { kind: Kind; slot: Slot }[] = []
  for (const index of [0, 1] as const) {
    const mast = build.masts[index], sail = build.sails[index]
    if (mast) all.push({ kind: mast, slot: { on: 'mast', index } })
    if (sail) all.push({ kind: sail, slot: { on: 'sail', index } })
  }
  build.deck.forEach((kind, index) => all.push({ kind, slot: { on: 'deck', index } }))
  return all
}

/** The whole weight afloat: hull, everything on it, and the gnome when he is aboard. */
export function weightOf(build: Build, gnome: boolean): number {
  return (build.hull ? MAKINGS[build.hull].weight : 0) + (gnome ? GNOME_WEIGHT : 0) + aboard(build).reduce((sum, item) => sum + MAKINGS[item.kind].weight, 0)
}

/** How deep the hull sits in the water, in stage units: a heavy load rides low. */
export function draftOf(build: Build, gnome: boolean): number {
  return 6 + weightOf(build, gnome) * 1.7
}

/** How much wind the boat takes: the sails that stand on masts. A bendy stem spills half of it. A blanket takes none. */
export function sailArea(build: Build): number {
  let area = 0
  for (const index of [0, 1] as const) {
    const sail = build.sails[index]
    if (sail) area += MAKINGS[sail].area * (build.masts[index] === 'stem' ? 0.45 : 1)
  }
  return area
}

/** How high the tallest thing on the boat stands above the keel point. */
export function heightOf(build: Build): number {
  const shape = shapeOf(build)
  let top = -shape.rim + 40
  for (const mast of build.masts) if (mast) top = Math.max(top, -shape.deck + MAKINGS[mast].length)
  return top
}

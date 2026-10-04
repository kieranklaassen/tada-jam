import { POD_SEEDS } from './breed'
import { isSeed } from './chance'
import { LADDER } from './config'
import { isKitId, isPositionId, kitAt, layVisit, readVisit, type KitId, type Visit } from './order'
import { PACKETS, isLookCode, isPacketId, isPairs, type PacketId, type Pairs } from './plant'
import { STATE_VERSION, deserialize as readPosition, freshState, serialize as writePosition, type GameState } from './state'
import { isVisitorId, type VisitorId } from './visitors'

// The page as it is saved: the template's two fields (the position in the
// designed order and whether the cycle on screen is finished) and the page's
// own. state.ts stays as copied; this module wraps it, as its header says.
//
// Found as left: a brood is drawn and saved when its pod sets, so nothing is
// saved in the air; a plant in the hand is saved in the pot it came from; no
// clock is read and nothing grows, dries or wilts while the game is away.

export const SHELF_POTS = 6
export const TRAY_POTS = 6
export const BORDER_PLACES = 18
/** The last visitors that left with a plant, drawn small in the top margin. */
export const KEPT = 4
/** The last plants the beetle carried off the page, each left behind as a pencil sketch. */
export const SKETCHED = 8

export const ROWS = ['shelf', 'tray', 'border'] as const
export type Row = (typeof ROWS)[number]
export const ROW_SIZE: Record<Row, number> = { shelf: SHELF_POTS, tray: TRAY_POTS, border: BORDER_PLACES }

/** Where a plant came from. A seed's two plant ids are kept as pod parent then dust parent, the order of the factors inside each of its pairs. Plant ids here may name plants that have since left the page; a family line is drawn only to one that is still on it. */
export type Origin = { how: 'packet'; packet: PacketId } | { how: 'seed'; onto: number; dust: number } | { how: 'runner'; of: number }

export type Plant = {
  id: number
  pairs: Pairs
  /** It came up in dry soil. Fixed when it grew: a grown plant does not change. */
  dry: boolean
  row: Row
  slot: number
  from: Origin
}

/** A pod set and not yet burst: the plant it sits on (pod parent), the plant the dust came from (dust parent), and its six seeds, already drawn. It names a plant and no pot: it goes where its plant goes. */
export type Pod = { on: number; dust: number; seeds: Pairs[] }

export type Kept = { who: VisitorId; look: number }

/** New ideas a character shows once, after the child's own first try or when a tool arrives. */
export const IDEAS = ['sort', 'hidden', 'runner', 'water'] as const
export type IdeaId = (typeof IDEAS)[number]

export type LabState = GameState & {
  /** The number the page's chance comes from, fixed when the page is first made. */
  seed: number
  /** How many pods have ever been set: the place in the stream the next pod's seeds are drawn from. */
  podsSet: number
  /** How many visitors have ever been laid out: the place in the stream that picks the next one. */
  visitsLaid: number
  nextId: number
  kit: KitId[]
  plants: Plant[]
  /** One flag a pot, the six of the shelf and then the six of the tray: the soil is dry. */
  dry: boolean[]
  pods: Pod[]
  visitor: Visit | null
  waiting: Visit
  kept: Kept[]
  sketched: number[]
  shown: IdeaId[]
}

/** The pot's place among the dry flags, or none for the border, which has no pots. */
export function potIndex(row: Row, slot: number): number | null {
  return row === 'shelf' ? slot : row === 'tray' ? SHELF_POTS + slot : null
}

/** A new page: two packet plants in bloom on the shelf, wet soil everywhere, nobody on the page yet and the first visitor waiting at the edge. */
export function freshLab(childAge: number | null, seed: number): LabState {
  const base = freshState(childAge)
  const position = isPositionId(base.position) ? base.position : LADDER[0]
  const packet = (id: number, slot: number): Plant => ({ id, pairs: PACKETS.pink, dry: false, row: 'shelf', slot, from: { how: 'packet', packet: 'pink' } })
  return {
    ...base,
    position,
    seed,
    podsSet: 0,
    visitsLaid: 1,
    nextId: 3,
    kit: kitAt(position),
    plants: [packet(1, 0), packet(2, 1)],
    dry: new Array<boolean>(SHELF_POTS + TRAY_POTS).fill(false),
    pods: [],
    visitor: null,
    waiting: layVisit(seed, 0, position, null),
    kept: [],
    sketched: [],
    shown: [],
  }
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

function readOrigin(raw: unknown): Origin {
  if (isRecord(raw)) {
    if (raw.how === 'packet' && isPacketId(raw.packet)) return { how: 'packet', packet: raw.packet }
    if (raw.how === 'seed' && isCount(raw.onto) && isCount(raw.dust)) return { how: 'seed', onto: raw.onto, dust: raw.dust }
    if (raw.how === 'runner' && isCount(raw.of)) return { how: 'runner', of: raw.of }
  }
  return { how: 'packet', packet: 'pink' }
}

/** Reads the plants one by one. A damaged plant is left out; two in one place or with one id keep the first; the border closes up. */
function readPlants(raw: unknown): Plant[] {
  const plants: Plant[] = [], ids = new Set<number>(), places = new Set<string>()
  for (const one of list(raw)) {
    if (!isRecord(one) || !isCount(one.id) || one.id < 1 || ids.has(one.id) || !isPairs(one.pairs)) continue
    const row = ROWS.find((name) => name === one.row)
    if (!row || !isCount(one.slot) || one.slot >= ROW_SIZE[row] || places.has(`${row}:${one.slot}`)) continue
    ids.add(one.id)
    places.add(`${row}:${one.slot}`)
    plants.push({ id: one.id, pairs: one.pairs, dry: one.dry === true, row, slot: one.slot, from: readOrigin(one.from) })
  }
  const border = plants.filter((plant) => plant.row === 'border').sort((a, b) => a.slot - b.slot)
  border.forEach((plant, slot) => { plant.slot = slot })
  return plants
}

function readPods(raw: unknown, plants: readonly Plant[]): Pod[] {
  const pods: Pod[] = []
  for (const one of list(raw)) {
    if (!isRecord(one) || !isCount(one.on) || !isCount(one.dust) || pods.some((pod) => pod.on === one.on)) continue
    const on = plants.find((plant) => plant.id === one.on)
    const seeds = list(one.seeds)
    // A pod stays on its plant wherever the plant stands, the border included.
    if (!on || seeds.length !== POD_SEEDS || !seeds.every(isPairs)) continue
    pods.push({ on: one.on, dust: one.dust, seeds: [...seeds] })
  }
  return pods
}

/**
 * Saved state is untrusted. Anything that is not this game's record, or a
 * version above this one, gives a fresh page. Inside a record each field is
 * repaired by itself: a damaged field takes its default and the rest is kept.
 * `seed` is the seed a fresh page would take; a saved seed wins over it.
 */
/**
 * Whether the slot held nothing at all. The page made for an empty slot takes a new seed and is saved as soon as it is
 * made: the same page must be found again though nothing was changed on it. A slot that holds something this build
 * cannot read (a later version, a damaged save) also gets a fresh page, but is not written over until the child
 * changes that page: what is in it may be worth more than a page nobody has touched.
 */
export function slotIsEmpty(raw: unknown): boolean {
  return raw === null || raw === undefined
}

export function deserializeLab(raw: unknown, childAge: number | null, seed: number): LabState {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshLab(childAge, seed)
  const base = readPosition(raw, childAge)
  const position = isPositionId(base.position) ? base.position : LADDER[0]
  const pageSeed = isSeed(raw.seed) ? raw.seed : seed
  const plants = readPlants(raw.plants)
  const visitor = readVisit(raw.visitor)
  const visitsLaid = isCount(raw.visitsLaid) ? raw.visitsLaid : 0
  const waiting = readVisit(raw.waiting)
  // What was saved keeps its order; the first packet and whatever the visitor on the page carried in are always there.
  const kit = [...list(raw.kit).filter(isKitId), ...kitAt(LADDER[0]), ...(visitor ? kitAt(visitor.at) : [])]
  const dry = list(raw.dry)
  return {
    v: STATE_VERSION,
    position,
    // A finished cycle is a visitor sitting with its plant; with nobody on the page there is none to finish.
    finished: base.finished && visitor !== null,
    seed: pageSeed,
    podsSet: isCount(raw.podsSet) ? raw.podsSet : 0,
    visitsLaid: waiting ? visitsLaid : visitsLaid + 1,
    nextId: Math.max(isCount(raw.nextId) ? raw.nextId : 1, 1 + Math.max(0, ...plants.map((plant) => plant.id))),
    kit: [...new Set(kit)],
    plants,
    dry: Array.from({ length: SHELF_POTS + TRAY_POTS }, (_, pot) => dry[pot] === true),
    pods: readPods(raw.pods, plants),
    visitor,
    waiting: waiting ?? layVisit(pageSeed, visitsLaid, position, visitor?.who ?? null),
    kept: list(raw.kept).filter((one): one is Kept => isRecord(one) && isVisitorId(one.who) && isLookCode(one.look)).map((one) => ({ who: one.who, look: one.look })).slice(-KEPT),
    sketched: list(raw.sketched).filter(isLookCode).slice(-SKETCHED),
    shown: IDEAS.filter((idea) => list(raw.shown).includes(idea)),
  }
}

/** The page as plain JSON: these fields and no others, each copied so that nothing live is handed to storage. */
export function serializeLab(state: LabState): LabState {
  return {
    ...writePosition(state),
    seed: state.seed,
    podsSet: state.podsSet,
    visitsLaid: state.visitsLaid,
    nextId: state.nextId,
    kit: [...state.kit],
    plants: state.plants.map((plant) => ({ id: plant.id, pairs: plant.pairs, dry: plant.dry, row: plant.row, slot: plant.slot, from: { ...plant.from } })),
    dry: [...state.dry],
    pods: state.pods.map((pod) => ({ on: pod.on, dust: pod.dust, seeds: [...pod.seeds] })),
    visitor: state.visitor ? { ...state.visitor, given: [...state.visitor.given] } : null,
    waiting: { ...state.waiting, given: [...state.waiting.given] },
    kept: state.kept.map((one) => ({ who: one.who, look: one.look })),
    sketched: [...state.sketched],
    shown: [...state.shown],
  }
}

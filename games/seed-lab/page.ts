import { runnerOf, seedsOfPod } from './breed'
import { BORDER_PLACES, ROW_SIZE, SKETCHED, potIndex, type LabState, type Origin, type Plant, type Row } from './lab'
import { PACKETS, lookCode, lookOf, type PacketId, type Pairs } from './plant'

// What the child can do to the plants of the page, as pure steps: each takes
// the page and gives back a new one with a list of what happened, for the
// view and the sounds. None of them refuses. A step that has nothing to
// change still says what happened, so the view can answer the touch.
//
// What is bounded stays bounded here: one pod a plant, six pots a row,
// eighteen plants in the border. Only the border ever lets a plant go, and
// only the oldest one, at the child's own action; the shelf and the tray lose
// a plant to nothing but a plant the child puts there.

export type PageEvent =
  | { type: 'pod-set'; on: number; dust: number }
  /** Dust on a flower that already holds a pod: it sneezes the dust back out. */
  | { type: 'pod-full'; on: number }
  | { type: 'burst'; on: number; young: number[] }
  | { type: 'grew'; id: number; how: 'packet' | 'runner' }
  /** A plant was shouldered out of its pot and hopped to the border. */
  | { type: 'shouldered'; id: number }
  /** The oldest border plant was carried off the page to be planted out, and left as a pencil sketch. */
  | { type: 'carried-off'; id: number; look: number }
  | { type: 'moved'; id: number }
  | { type: 'pots-swapped' }
  | { type: 'soil'; pot: number; dry: boolean; changed: boolean }

export type Step = { state: LabState; events: PageEvent[] }

const still = (state: LabState): Step => ({ state, events: [] })

export function plantById(state: LabState, id: number): Plant | undefined {
  return state.plants.find((plant) => plant.id === id)
}

export function plantAt(state: LabState, row: Row, slot: number): Plant | undefined {
  return state.plants.find((plant) => plant.row === row && plant.slot === slot)
}

export function podOn(state: LabState, id: number) {
  return state.pods.find((pod) => pod.on === id)
}

/** Whether the soil of a pot is dry. The border is open ground and never dry. */
export function isDry(state: LabState, row: Row, slot: number): boolean {
  const pot = potIndex(row, slot)
  return pot !== null && state.dry[pot] === true
}

/** The border in the order its plants arrived, slots closed up. */
function closeBorder(plants: Plant[]): Plant[] {
  const border = plants.filter((plant) => plant.row === 'border').sort((a, b) => a.slot - b.slot)
  const slotOf = new Map(border.map((plant, slot) => [plant.id, slot]))
  return plants.map((plant) => (plant.row === 'border' ? { ...plant, slot: slotOf.get(plant.id)! } : plant))
}

/** Sends plants to the border, in the order given. Each plant over eighteen sends the oldest border plant off the page. */
function toBorder(state: LabState, ids: readonly number[], events: PageEvent[]): LabState {
  let plants = closeBorder(state.plants)
  let sketched = state.sketched
  for (const id of ids) {
    const end = plants.filter((plant) => plant.row === 'border' && plant.id !== id).length
    plants = closeBorder(plants.map((plant) => (plant.id === id ? { ...plant, row: 'border', slot: end } : plant)))
    while (plants.filter((plant) => plant.row === 'border').length > BORDER_PLACES) {
      const oldest = plants.find((plant) => plant.row === 'border' && plant.slot === 0)!
      const look = lookCode(lookOf(oldest.pairs, oldest.dry))
      sketched = [...sketched, look].slice(-SKETCHED)
      events.push({ type: 'carried-off', id: oldest.id, look })
      plants = closeBorder(plants.filter((plant) => plant.id !== oldest.id))
    }
  }
  return { ...state, plants, sketched }
}

/** The two rows of pots. The border is open ground. */
export type PotRow = 'shelf' | 'tray'
const POT_ROWS: readonly PotRow[] = ['shelf', 'tray']

/**
 * Where something set down on a pot lands. A plant holds its pot when it
 * carries a pod, or when it is the parent of the runner being set down. On
 * that pot when it is free. On that pot when its plant does not hold it, and
 * that plant is shouldered out. Otherwise on the nearest free pot, then on
 * the nearest pot whose plant does not hold it. With every pot held there is
 * none.
 */
function landing(state: LabState, row: PotRow, slot: number, keep?: number): { row: PotRow; slot: number; shoulders: Plant | null } | null {
  const holds = (plant: Plant) => plant.id === keep || podOn(state, plant.id) !== undefined
  const here = plantAt(state, row, slot)
  if (!here) return { row, slot, shoulders: null }
  if (!holds(here)) return { row, slot, shoulders: here }
  const near = (pot: { row: PotRow; slot: number }) => Math.abs(pot.slot - slot) + (pot.row === row ? 0 : ROW_SIZE[row])
  const pots = POT_ROWS.flatMap((potRow) => Array.from({ length: ROW_SIZE[potRow] }, (_, potSlot) => ({ row: potRow, slot: potSlot }))).sort((a, b) => near(a) - near(b))
  const free = pots.find((pot) => !plantAt(state, pot.row, pot.slot))
  if (free) return { ...free, shoulders: null }
  const taken = pots.find((pot) => !holds(plantAt(state, pot.row, pot.slot)!))
  return taken ? { ...taken, shoulders: plantAt(state, taken.row, taken.slot)! } : null
}

/** Grows a new plant where it lands. With no pot to land on it comes up in the border. */
function grow(state: LabState, pairs: Pairs, from: Origin, row: PotRow, slot: number, events: PageEvent[], keep?: number): { state: LabState; id: number } {
  const id = state.nextId
  const spot = landing(state, row, slot, keep)
  let next: LabState = { ...state, nextId: id + 1 }
  if (!spot) {
    next = { ...next, plants: [...next.plants, { id, pairs, dry: false, row: 'border', slot: BORDER_PLACES, from }] }
    return { state: toBorder(next, [id], events), id }
  }
  if (spot.shoulders) {
    events.push({ type: 'shouldered', id: spot.shoulders.id })
    next = toBorder(next, [spot.shoulders.id], events)
  }
  const plant: Plant = { id, pairs, dry: isDry(next, spot.row, spot.slot), row: spot.row, slot: spot.slot, from }
  return { state: { ...next, plants: [...next.plants, plant] }, id }
}

// --- The dab, and what comes of it ----------------------------------------------

/**
 * The dab: dust from one flower let go on another. A pod sets on the flower
 * the dust reaches, and its six seeds are drawn there and then. A plant's own
 * dust works. Both plants stand in pots; the border's plants are too small to dab.
 */
export function dab(state: LabState, dustId: number, ontoId: number): Step {
  const dust = plantById(state, dustId), onto = plantById(state, ontoId)
  if (!dust || !onto || dust.row === 'border' || onto.row === 'border') return still(state)
  if (podOn(state, ontoId)) return { state, events: [{ type: 'pod-full', on: ontoId }] }
  const pod = { on: ontoId, dust: dustId, seeds: seedsOfPod(state.seed, state.podsSet, onto.pairs, dust.pairs) }
  // A pod set while a visitor is being served counts towards how its visit went.
  const visitor = state.visitor && !state.finished ? { ...state.visitor, pods: state.visitor.pods + 1 } : state.visitor
  return { state: { ...state, podsSet: state.podsSet + 1, pods: [...state.pods, pod], visitor }, events: [{ type: 'pod-set', on: ontoId, dust: dustId }] }
}

/**
 * A pod bursts. The tray's plants that hold no pod of their own move to the
 * border, the six young come up in the tray's free pots, each in that pot's
 * soil, and any that find no pot come up in the border.
 */
export function burst(state: LabState, ontoId: number): Step {
  const pod = podOn(state, ontoId), onto = plantById(state, ontoId)
  if (!pod || !onto) return still(state)
  const events: PageEvent[] = []
  let next: LabState = { ...state, pods: state.pods.filter((one) => one.on !== ontoId) }
  const leaving = next.plants.filter((plant) => plant.row === 'tray' && !podOn(next, plant.id)).sort((a, b) => a.slot - b.slot)
  next = toBorder(next, leaving.map((plant) => plant.id), events)
  const free = Array.from({ length: ROW_SIZE.tray }, (_, slot) => slot).filter((slot) => !plantAt(next, 'tray', slot))
  const young: number[] = []
  const from: Origin = { how: 'seed', onto: ontoId, dust: pod.dust }
  for (const pairs of pod.seeds) {
    const id = next.nextId
    const slot = free.shift()
    const plant: Plant = slot === undefined ? { id, pairs, dry: false, row: 'border', slot: BORDER_PLACES, from } : { id, pairs, dry: isDry(next, 'tray', slot), row: 'tray', slot, from }
    next = { ...next, nextId: id + 1, plants: [...next.plants, plant] }
    if (slot === undefined) next = toBorder(next, [id], events)
    young.push(id)
  }
  return { state: next, events: [{ type: 'burst', on: ontoId, young }, ...events] }
}

// --- Seeds from a packet, and runners ------------------------------------------

/** A packet seed set on a pot grows there. Packets never run out, so no factor can be lost from the page. */
export function sow(state: LabState, packet: PacketId, row: PotRow, slot: number): Step {
  if (!state.kit.includes(packet)) return still(state)
  const events: PageEvent[] = []
  const grown = grow(state, PACKETS[packet], { how: 'packet', packet }, row, slot, events)
  return { state: grown.state, events: [...events, { type: 'grew', id: grown.id, how: 'packet' }] }
}

/** A runner bud set on a pot roots there: the one parent again, in that pot's soil. */
export function runner(state: LabState, parentId: number, row: PotRow, slot: number): Step {
  const parent = plantById(state, parentId)
  if (!parent || parent.row === 'border' || !state.kit.includes('runner')) return still(state)
  // A runner set down on its own parent's pot roots in the nearest other pot: a plant is never shouldered out by its own copy.
  const events: PageEvent[] = []
  const grown = grow(state, runnerOf(parent.pairs), { how: 'runner', of: parentId }, row, slot, events, parentId)
  return { state: grown.state, events: [...events, { type: 'grew', id: grown.id, how: 'runner' }] }
}

// --- Carrying ------------------------------------------------------------------

/**
 * A plant carried to a pot moves there. A plant already in that pot is
 * shouldered out to the border, or trades places when it holds a pod. A plant
 * taken back from the border stands in the pot at the height it grew to.
 */
export function move(state: LabState, plantId: number, row: PotRow, slot: number): Step {
  const plant = plantById(state, plantId)
  if (!plant || (plant.row === row && plant.slot === slot)) return still(state)
  const there = plantAt(state, row, slot)
  if (there && podOn(state, there.id) && plant.row !== 'border') {
    // The plant in that pot holds a pod, so the two trade places and both stay in pots.
    const plants = state.plants.map((one) => (one.id === plant.id ? { ...one, row, slot } : one.id === there.id ? { ...one, row: plant.row, slot: plant.slot } : one))
    return { state: { ...state, plants }, events: [{ type: 'moved', id: plant.id }, { type: 'moved', id: there.id }] }
  }
  // Taken back from the border onto a pot that is held, it lands on the nearest pot it can have.
  const spot = landing(state, row, slot, plant.id)
  if (!spot) return still(state)
  const events: PageEvent[] = [{ type: 'moved', id: plant.id }]
  let next: LabState = { ...state, plants: state.plants.map((one) => (one.id === plant.id ? { ...one, row: spot.row, slot: spot.slot } : one)) }
  if (spot.shoulders) {
    events.push({ type: 'shouldered', id: spot.shoulders.id })
    next = toBorder(next, [spot.shoulders.id], events)
  }
  return { state: { ...next, plants: closeBorder(next.plants) }, events }
}

/** A pot carried onto another trades places with it: soil, plant and pod ride along. */
export function swapPots(state: LabState, a: { row: PotRow; slot: number }, b: { row: PotRow; slot: number }): Step {
  const potA = potIndex(a.row, a.slot)!, potB = potIndex(b.row, b.slot)!
  if (potA === potB) return still(state)
  const plants = state.plants.map((plant) => (plant.row === a.row && plant.slot === a.slot ? { ...plant, row: b.row, slot: b.slot } : plant.row === b.row && plant.slot === b.slot ? { ...plant, row: a.row, slot: a.slot } : plant))
  const dry = [...state.dry]
  dry[potA] = state.dry[potB]
  dry[potB] = state.dry[potA]
  return { state: { ...state, plants, dry }, events: [{ type: 'pots-swapped' }] }
}

/**
 * The can wets a pot's soil and the blotter dries it. Soil only matters to
 * what comes up in it next: a plant that has grown keeps its height.
 */
export function setSoil(state: LabState, row: PotRow, slot: number, dry: boolean): Step {
  const pot = potIndex(row, slot)!
  if (!state.kit.includes('water')) return still(state)
  const changed = state.dry[pot] !== dry
  const flags = [...state.dry]
  flags[pot] = dry
  return { state: changed ? { ...state, dry: flags } : state, events: [{ type: 'soil', pot, dry, changed }] }
}

/** Takes a plant off the page for good: it went with a visitor. The border closes up, and a pod it held is gone with it. */
export function take(state: LabState, plantId: number): LabState {
  return { ...state, plants: closeBorder(state.plants.filter((plant) => plant.id !== plantId)), pods: state.pods.filter((pod) => pod.on !== plantId) }
}

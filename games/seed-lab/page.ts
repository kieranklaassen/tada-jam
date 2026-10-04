import { runnerOf, seedsOfPod } from './breed'
import { BORDER_PLACES, ROW_SIZE, SKETCHED, potIndex, type LabState, type Origin, type Plant, type Pod, type Row } from './lab'
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
//
// A pod stays on its plant wherever the plant goes, and a pod never leaves
// the page: when its plant does, the pod bursts as the plant goes. Whenever a
// pod bursts, its six young land in the tray.

export type PageEvent =
  | { type: 'pod-set'; on: number; dust: number }
  /** Dust on a flower that already holds a pod: the pod blows it back out. */
  | { type: 'pod-full'; on: number }
  | { type: 'burst'; on: number; young: number[] }
  | { type: 'grew'; id: number; how: 'packet' | 'runner' }
  /** A plant was shouldered out of its pot and hopped to the border, with any pod it holds. */
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

/** A step in the making: the page so far, what has happened, and the pods that have to burst before it is done. */
type Work = { state: LabState; events: PageEvent[]; due: Pod[]; spare?: number }

const begin = (state: LabState, spare?: number): Work => ({ state, events: [], due: [], spare })

/**
 * Sends plants to the border, in the order given, each with any pod it holds.
 * Each plant over eighteen sends the oldest border plant off the page; a pod
 * on that plant does not go with it but is due to burst.
 */
function toBorder(work: Work, ids: readonly number[]): void {
  let plants = closeBorder(work.state.plants)
  let { sketched, pods } = work.state
  for (const id of ids) {
    const end = plants.filter((plant) => plant.row === 'border' && plant.id !== id).length
    plants = closeBorder(plants.map((plant) => (plant.id === id ? { ...plant, row: 'border', slot: end } : plant)))
    while (plants.filter((plant) => plant.row === 'border').length > BORDER_PLACES) {
      // The oldest goes; but never the plant the finger is holding, which is spared and the next oldest goes for it.
      const oldest = plants.filter((plant) => plant.row === 'border' && plant.id !== work.spare).sort((a, b) => a.slot - b.slot)[0]
      if (!oldest) break
      const look = lookCode(lookOf(oldest.pairs, oldest.dry))
      sketched = [...sketched, look].slice(-SKETCHED)
      work.events.push({ type: 'carried-off', id: oldest.id, look })
      plants = closeBorder(plants.filter((plant) => plant.id !== oldest.id))
      const pod = pods.find((one) => one.on === oldest.id)
      if (pod) { work.due.push(pod); pods = pods.filter((one) => one !== pod) }
    }
  }
  work.state = { ...work.state, plants, sketched, pods }
}

/** One pod's brood lands in the tray: the plants standing there hop to the border first, in the order they came up, and the six young come up in the six pots, each in that pot's soil. */
function land(work: Work, pod: Pod): void {
  const standing = work.state.plants.filter((plant) => plant.row === 'tray').sort((a, b) => a.id - b.id)
  toBorder(work, standing.map((plant) => plant.id))
  const young: number[] = []
  let next = work.state
  pod.seeds.forEach((pairs, slot) => {
    const id = next.nextId
    const plant: Plant = { id, pairs, dry: isDry(next, 'tray', slot), row: 'tray', slot, from: { how: 'seed', onto: pod.on, dust: pod.dust } }
    next = { ...next, nextId: id + 1, plants: [...next.plants, plant] }
    young.push(id)
  })
  work.state = next
  work.events.push({ type: 'burst', on: pod.on, young })
}

/** Bursts every pod that is due, one after another, until none is. A brood landing can send a plant off the page whose pod is then due in its turn. */
function done(work: Work): Step {
  while (work.due.length > 0) land(work, work.due.shift()!)
  return { state: work.state, events: work.events }
}

/** The two rows of pots. The border is open ground. */
export type PotRow = 'shelf' | 'tray'
const POT_ROWS: readonly PotRow[] = ['shelf', 'tray']

/**
 * Where something set down on a pot lands, and which plant it shoulders out.
 * On that pot, whose plant, if any, is shouldered out to the border with any
 * pod it holds. One plant is never shouldered: the parent of the runner being
 * set down, whose copy takes the nearest free pot, or the nearest pot of all.
 */
function landing(state: LabState, row: PotRow, slot: number, keep?: number): { row: PotRow; slot: number; shoulders: Plant | null } {
  const here = plantAt(state, row, slot)
  if (!here) return { row, slot, shoulders: null }
  if (here.id !== keep) return { row, slot, shoulders: here }
  const near = (pot: { row: PotRow; slot: number }) => Math.abs(pot.slot - slot) + (pot.row === row ? 0 : ROW_SIZE[row])
  const pots = POT_ROWS.flatMap((potRow) => Array.from({ length: ROW_SIZE[potRow] }, (_, potSlot) => ({ row: potRow, slot: potSlot }))).filter((pot) => pot.row !== row || pot.slot !== slot).sort((a, b) => near(a) - near(b))
  const spot = pots.find((pot) => !plantAt(state, pot.row, pot.slot)) ?? pots[0]
  return { ...spot, shoulders: plantAt(state, spot.row, spot.slot) ?? null }
}

/** Grows a new plant where it lands, in that pot's soil. */
function grow(work: Work, pairs: Pairs, from: Origin, row: PotRow, slot: number, keep?: number): number {
  const id = work.state.nextId
  const spot = landing(work.state, row, slot, keep)
  work.state = { ...work.state, nextId: id + 1 }
  if (spot.shoulders) {
    work.events.push({ type: 'shouldered', id: spot.shoulders.id })
    toBorder(work, [spot.shoulders.id])
  }
  const plant: Plant = { id, pairs, dry: isDry(work.state, spot.row, spot.slot), row: spot.row, slot: spot.slot, from }
  work.state = { ...work.state, plants: [...work.state.plants, plant] }
  return id
}

// --- The dab, and what comes of it ----------------------------------------------

/**
 * The dab: dust from one flower let go on another. A pod sets on the flower
 * the dust reaches, and its six seeds are drawn there and then. A plant's own
 * dust works. The flower the dust reaches stands in a pot: the border's
 * plants are too small to dab. The dust was lifted from a flower in a pot
 * too, but its plant may have hopped to the border since, while the finger
 * carried the dust; the dust is as good.
 */
export function dab(state: LabState, dustId: number, ontoId: number): Step {
  const dust = plantById(state, dustId), onto = plantById(state, ontoId)
  if (!dust || !onto || onto.row === 'border') return still(state)
  if (podOn(state, ontoId)) return { state, events: [{ type: 'pod-full', on: ontoId }] }
  const pod = { on: ontoId, dust: dustId, seeds: seedsOfPod(state.seed, state.podsSet, onto.pairs, dust.pairs) }
  // A pod set while a visitor is being served counts towards how its visit went.
  const visitor = state.visitor && !state.finished ? { ...state.visitor, pods: state.visitor.pods + 1 } : state.visitor
  return { state: { ...state, podsSet: state.podsSet + 1, pods: [...state.pods, pod], visitor }, events: [{ type: 'pod-set', on: ontoId, dust: dustId }] }
}

/**
 * A pod bursts, wherever its plant stands: on the shelf, in the tray or in
 * the border. Its brood always lands in the tray.
 */
export function burst(state: LabState, ontoId: number, spare?: number): Step {
  const pod = podOn(state, ontoId)
  if (!pod) return still(state)
  // `spare` is a plant the finger holds: if the brood sends plants off the page, it is not one of them.
  const work = begin({ ...state, pods: state.pods.filter((one) => one !== pod) }, spare)
  work.due.push(pod)
  return done(work)
}

// --- Seeds from a packet, and runners ------------------------------------------

/** A packet seed set on a pot grows there. Packets never run out, so no factor can be lost from the page. */
export function sow(state: LabState, packet: PacketId, row: PotRow, slot: number, spare?: number): Step {
  if (!state.kit.includes(packet)) return still(state)
  // `spare` is a plant the finger holds: if the seedling sends a plant off the page, it is not that one.
  const work = begin(state, spare)
  const id = grow(work, PACKETS[packet], { how: 'packet', packet }, row, slot)
  work.events.push({ type: 'grew', id, how: 'packet' })
  return done(work)
}

/**
 * A runner bud set on a pot roots there: the one parent again, in that pot's soil. The bud was drawn from a plant in
 * a pot; that plant may have hopped to the border since, while the finger carried the runner, and the runner roots all the same.
 */
export function runner(state: LabState, parentId: number, row: PotRow, slot: number): Step {
  const parent = plantById(state, parentId)
  if (!parent || !state.kit.includes('runner')) return still(state)
  // A runner set down on its own parent's pot roots in the nearest other pot: a plant is never shouldered out by its own copy.
  const work = begin(state)
  const id = grow(work, runnerOf(parent.pairs), { how: 'runner', of: parentId }, row, slot, parentId)
  work.events.push({ type: 'grew', id, how: 'runner' })
  return done(work)
}

// --- Carrying ------------------------------------------------------------------

/**
 * A plant carried to a pot moves there, with any pod it holds. A plant
 * already in that pot is shouldered out to the border. A plant taken back
 * from the border stands in the pot at the height it grew to.
 */
export function move(state: LabState, plantId: number, row: PotRow, slot: number): Step {
  const plant = plantById(state, plantId)
  if (!plant || (plant.row === row && plant.slot === slot)) return still(state)
  const work = begin(state)
  const there = plantAt(state, row, slot)
  work.state = { ...state, plants: state.plants.map((one) => (one.id === plant.id ? { ...one, row, slot } : one)) }
  work.events.push({ type: 'moved', id: plant.id })
  if (there) {
    work.events.push({ type: 'shouldered', id: there.id })
    toBorder(work, [there.id])
  }
  work.state = { ...work.state, plants: closeBorder(work.state.plants) }
  return done(work)
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

/**
 * A plant leaves the page for good: it went with a visitor. The border closes
 * up. A pod it held does not go with it: the pod bursts as the plant goes,
 * and its brood lands in the tray.
 */
export function leave(state: LabState, plantId: number): Step {
  const pod = podOn(state, plantId)
  const work = begin({ ...state, plants: closeBorder(state.plants.filter((plant) => plant.id !== plantId)), pods: state.pods.filter((one) => one !== pod) })
  if (pod) work.due.push(pod)
  return done(work)
}

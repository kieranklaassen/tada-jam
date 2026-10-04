import { ROW_SIZE, type IdeaId, type LabState } from './lab'
import { groupsOf } from './loupe'
import { asksOf } from './order'
import { isDry, plantAt, plantById, runner, setSoil, sow, type PageEvent, type PotRow } from './page'
import { PACKETS, lookOf } from './plant'
import { markShown } from './visit'
import { fits } from './visitors'

// What the beetle's two kinds of showing leave on the page.
//
// A showing changes the page, so its outcome is saved when the scene starts:
// each function here gives the page as it stands at the scene's END. The
// scene is then a view of that, and one that is put away or touched midway
// is found finished and never plays again, since the idea is marked as shown
// in the same step.

export type ShowStep = { state: LabState; events: PageEvent[] }

/** The pots that stand free, the tray's before the shelf's. */
function freePots(state: LabState): { row: PotRow; slot: number }[] {
  return (['tray', 'shelf'] as const).flatMap((row) => Array.from({ length: ROW_SIZE[row] }, (_, slot) => ({ row, slot }))).filter((pot) => !plantAt(state, pot.row, pot.slot))
}

/**
 * The showing of a new tool, once a tool. The beetle uses it on a plant that
 * is not one the visitor on the page wants: it roots a runner's copy in a
 * free pot, and for the blotter it dries that pot's soil first, so the copy
 * comes up half as high beside its parent. Where every plant in a pot would
 * do for the visitor, it sows a packet seed and works on that: a packet
 * plant is never what a visitor asks for.
 *
 * It goes only into pots that stand free: it shoulders no plant out and
 * sends none to the border or off the page. While too few pots stand free
 * the showing waits: nothing changes, the tool lies there for the child to
 * use, and the same call later, with pots free, plays it.
 *
 * Changes `plants`, `nextId`, `dry` (for the blotter) and `shown`.
 */
export function showTool(state: LabState, tool: 'runner' | 'water'): ShowStep {
  if (state.shown.includes(tool) || !state.kit.includes(tool) || !state.kit.includes('runner')) return { state, events: [] }
  const visit = state.visitor && !state.finished ? state.visitor : null
  const free = freePots(state)
  if (free.length === 0) return { state, events: [] }
  // Neither the plant it works on nor the copy it makes may be what the visitor wants: the copy comes up in the soil of
  // its pot, and in soil the blotter has dried it stands half as high, which can be the very height asked for.
  const fitsWish = (pairs: number, dry: boolean) => visit !== null && fits(visit.who, asksOf(visit), lookOf(pairs, dry))
  const copyDry = (pot: { row: PotRow; slot: number }) => tool === 'water' || isDry(state, pot.row, pot.slot)
  const wanted = (plant: { pairs: number; dry: boolean }, pot: { row: PotRow; slot: number }) => fitsWish(plant.pairs, plant.dry) || fitsWish(plant.pairs, copyDry(pot))
  const standing = state.plants.filter((plant) => plant.row !== 'border').sort((a, b) => a.id - b.id).find((plant) => !wanted(plant, free[0]))
  // One free pot for the copy, and one more where a packet plant has to be sown first.
  if (free.length < (standing ? 1 : 2)) return { state, events: [] }
  // Where even a packet plant's copy would be the answer (a wish for the height it has in dry soil), the showing waits.
  if (!standing && wanted({ pairs: PACKETS.pink, dry: isDry(state, free[0].row, free[0].slot) }, free[1])) return { state, events: [] }
  const events: PageEvent[] = []
  let next = state
  let subject = standing?.id
  if (subject === undefined) {
    const spot = free.shift()!, sown = sow(next, 'pink', spot.row, spot.slot)
    next = sown.state
    events.push(...sown.events)
    subject = sown.events.flatMap((event) => (event.type === 'grew' ? [event.id] : []))[0]
  }
  const pot = free[0]
  if (tool === 'water') {
    const dried = setSoil(next, pot.row, pot.slot, true)
    next = dried.state
    events.push(...dried.events)
  }
  const rooted = runner(next, subject, pot.row, pot.slot)
  events.push(...rooted.events)
  return { state: markShown(rooted.state, tool), events }
}

/**
 * The neat way to compare, once an idea. The beetle nudges the young of one
 * brood, where they stand in the tray, into groups of plants that look
 * alike: the same young in the same pots of the tray, in another order. No
 * plant changes and none leaves its row; young of that brood that are no
 * longer in the tray are left where they are.
 *
 * Changes `plants` (the slots of those young) and `shown`.
 */
export function showCompare(state: LabState, idea: Extract<IdeaId, 'sort' | 'hidden'>, brood: readonly number[]): ShowStep {
  if (state.shown.includes(idea)) return { state, events: [] }
  const young = state.plants.filter((plant) => plant.row === 'tray' && brood.includes(plant.id))
  const slots = young.map((plant) => plant.slot).sort((a, b) => a - b)
  const order = groupsOf(young).flatMap((group) => group.ids)
  const slotOf = new Map(order.map((id, at) => [id, slots[at]]))
  const plants = state.plants.map((plant) => (slotOf.has(plant.id) ? { ...plant, slot: slotOf.get(plant.id)! } : plant))
  const events: PageEvent[] = order.filter((id) => plantById(state, id)!.slot !== slotOf.get(id)).map((id) => ({ type: 'moved', id }))
  return { state: markShown({ ...state, plants }, idea), events }
}

/**
 * The child sorts the tray by fetching the loupe: every plant standing in
 * the tray goes into groups of plants that look alike, the largest first.
 * The same plants in the same pots, in another order; nothing is marked as
 * shown, since this is the child's own doing and can be done any number of
 * times.
 */
export function sortTray(state: LabState): ShowStep {
  const tray = state.plants.filter((plant) => plant.row === 'tray')
  const slots = tray.map((plant) => plant.slot).sort((a, b) => a - b)
  const order = groupsOf(tray).flatMap((group) => group.ids)
  const slotOf = new Map(order.map((id, at) => [id, slots[at]]))
  const moved = order.filter((id) => plantById(state, id)!.slot !== slotOf.get(id))
  if (moved.length === 0) return { state, events: [] }
  const plants = state.plants.map((plant) => (slotOf.has(plant.id) ? { ...plant, slot: slotOf.get(plant.id)! } : plant))
  return { state: { ...state, plants }, events: moved.map((id) => ({ type: 'moved', id })) }
}

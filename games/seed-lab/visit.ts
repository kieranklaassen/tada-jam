import { KEPT, type IdeaId, type LabState } from './lab'
import { asksOf, bigAsksOf, isPositionId, judge, kitAt, layVisit, shownAsksOf, type KitId } from './order'
import { burst, plantById, podOn, take, type PageEvent } from './page'
import { TRAITS, carriesHidden, lookCode, lookOf, type Pairs } from './plant'
import { beginCycle, finishCycle } from './state'
import { answer, fits, secretOf, type SecretId, type TraitAnswer, type VisitorId } from './visitors'

// The visitors on the page: one cycle is one visitor, from the touch that
// brings it in to the moment it leaves. The next one is always laid out and
// waiting at the edge, and comes in on the child's touch and on nothing else.
//
// An error is a consequence here: a plant that misses is answered trait by
// trait and stays in the pot it came from. The state stays, so the child
// changes one thing and tries again.

export type VisitEvent =
  /** The visitor answered a plant, over the traits its open sketch shows. `meets` says whether it keeps it. */
  | { type: 'answered'; who: VisitorId; plant: number; answers: TraitAnswer[]; meets: boolean; secret: SecretId | null }
  /** It kept the plant and still asks for more alike. */
  | { type: 'kept'; who: VisitorId; look: number; more: number }
  /** It has all it asked for: the ending starts. `fuller` says the plant also met the larger sketch. */
  | { type: 'ending'; who: VisitorId; look: number; fuller: boolean }
  | { type: 'left'; who: VisitorId; withPlants: number }
  | { type: 'came-in'; who: VisitorId; brought: KitId[] }
  | { type: 'sketch'; big: boolean }

export type VisitStep = { state: LabState; events: (VisitEvent | PageEvent)[] }

/**
 * A plant offered to the visitor on the page. It answers every trait its open
 * sketch shows, likes first. It keeps a plant that meets its small sketch;
 * any other stays where it was. With all it asked for, the cycle is judged
 * and saved at once, as the ending starts, so a put-away in the middle loses
 * nothing and nothing replays on load.
 */
export function offer(state: LabState, plantId: number): VisitStep {
  const visit = state.visitor
  if (!visit || state.finished || !plantById(state, plantId)) return { state, events: [] }
  const events: (VisitEvent | PageEvent)[] = []
  // A pod on the plant bursts in the visitor's grip, and the brood lands as usual.
  let next = state
  if (podOn(state, plantId)) {
    const burstStep = burst(state, plantId)
    next = burstStep.state
    events.push(...burstStep.events)
  }
  const plant = plantById(next, plantId)
  if (!plant) return { state: next, events }
  const look = lookOf(plant.pairs, plant.dry)
  const meets = fits(visit.who, asksOf(visit), look)
  events.push({ type: 'answered', who: visit.who, plant: plantId, answers: answer(visit.who, shownAsksOf(visit, next.kit), look), meets, secret: secretOf(visit.who, look) })
  if (!meets) return { state: next, events }
  const code = lookCode(look)
  const served = { ...visit, given: [...visit.given, code] }
  next = { ...take(next, plantId), visitor: served }
  if (served.given.length < served.count) {
    events.push({ type: 'kept', who: visit.who, look: code, more: served.count - served.given.length })
    return { state: next, events }
  }
  const fuller = fits(visit.who, bigAsksOf(visit, next.kit) ?? asksOf(visit), look)
  events.push({ type: 'ending', who: visit.who, look: code, fuller })
  return { state: { ...next, ...finishCycle(next, judge(served)) }, events }
}

/**
 * The child lets the waiting visitor in. One still on the page leaves, and
 * if its cycle was not judged yet it is judged now: with some of its plants
 * mixed, with none badly. The one that comes in carries what its position
 * brings, and the next is laid out from the position as it now stands, so a
 * new position shows first on the visitor after next.
 */
export function letIn(state: LabState): VisitStep {
  const events: VisitEvent[] = []
  let next = state
  const leaving = state.visitor
  if (leaving) {
    if (!state.finished) next = { ...next, ...finishCycle(next, judge(leaving)) }
    events.push({ type: 'left', who: leaving.who, withPlants: leaving.given.length })
    if (leaving.given.length > 0) next = { ...next, kept: [...next.kept, { who: leaving.who, look: leaving.given[leaving.given.length - 1] }].slice(-KEPT) }
  }
  const coming = { ...state.waiting, pods: 0 }
  const brought = kitAt(coming.at).filter((thing) => !next.kit.includes(thing))
  const position = isPositionId(next.position) ? next.position : coming.at
  next = {
    ...next,
    ...beginCycle(next),
    kit: [...next.kit, ...brought],
    visitor: coming,
    waiting: layVisit(next.seed, next.visitsLaid, position, coming.who),
    visitsLaid: next.visitsLaid + 1,
  }
  events.push({ type: 'came-in', who: coming.who, brought })
  return { state: next, events }
}

/** The child unrolls the visitor's larger sketch, or rolls it up again. Where there is none, nothing changes. */
export function turnSketch(state: LabState): VisitStep {
  const visit = state.visitor
  if (!visit || state.finished || !bigAsksOf(visit, state.kit)) return { state, events: [] }
  const big = !visit.big
  return { state: { ...state, visitor: { ...visit, big } }, events: [{ type: 'sketch', big }] }
}

// --- What is shown once ---------------------------------------------------------

/**
 * The idea a brood shows for the first time, if any, so that the beetle can
 * show a neat way to compare after the child's own try: young of more than
 * one colour, or a young that shows what neither parent shows. It is asked
 * about a brood already grown and never about the wish on the page.
 */
export function ideaInBrood(state: LabState, onto: Pairs, dust: Pairs, young: readonly Pairs[]): IdeaId | null {
  const hidden = TRAITS.some((trait) => trait !== 'colour' && (carriesHidden(onto, trait) || carriesHidden(dust, trait)) && young.some((one) => differsIn(one, onto, trait) && differsIn(one, dust, trait)))
  if (hidden && !state.shown.includes('hidden')) return 'hidden'
  const colours = new Set(young.map((one) => lookOf(one, false).colour))
  return colours.size > 1 && !state.shown.includes('sort') ? 'sort' : null
}

function differsIn(young: Pairs, parent: Pairs, trait: (typeof TRAITS)[number]): boolean {
  const a = lookOf(young, false), b = lookOf(parent, false)
  return trait === 'height' ? a.joints !== b.joints : trait === 'leaf' ? a.leaf !== b.leaf : trait === 'petals' ? a.petals !== b.petals : a.colour !== b.colour
}

/** A tool's first showing, when the visitor that carried it in has set it down. */
export function ideaInKit(state: LabState, brought: readonly KitId[]): IdeaId | null {
  if (brought.includes('runner') && !state.shown.includes('runner')) return 'runner'
  return brought.includes('water') && !state.shown.includes('water') ? 'water' : null
}

/** Marks an idea as shown. It is shown once: a save keeps the mark. */
export function markShown(state: LabState, idea: IdeaId): LabState {
  return state.shown.includes(idea) ? state : { ...state, shown: [...state.shown, idea] }
}

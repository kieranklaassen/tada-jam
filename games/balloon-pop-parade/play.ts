import { laySky, layTroop } from './order'
import { PARADE_LENGTH, type Marched, type Save } from './save'
import { markShown, showingAtStepIn, type Showing } from './showings'
import { beginCycle, finishCycle, type CycleOutcome } from './state'
import { give, pop, troopOf, type Bunch } from './world'

// The cycle: one troop served. Three things a child can do, each a pure
// function from the save to the new save and a list of events for the view to
// play. The outcome of a touch is whole in the save it returns, so the view
// saves at once and a put-away during the flight or the scene loses nothing.
//
// A cycle is judged by what the child sent before the troop was served. A
// balloon the child pops, and anything sent after the troop is served, is play
// and is not judged.

export type PlayEvent =
  /** The bunch in this place went to the troop and `takers` each took one. */
  | { type: 'taken'; slot: number; bunch: Bunch; takers: number[] }
  /** Another colour: the troop refused it. */
  | { type: 'refused'; slot: number; bunch: Bunch }
  /** Too many: `grabber` held on, was lifted and let go, and `spare` balloons had nobody under them. */
  | { type: 'gotAway'; slot: number; bunch: Bunch; grabber: number; spare: number }
  /**
   * The ending scene starts: the last friend of the troop took its balloon. It comes each time that happens, also
   * for a troop filled again after a pop; the cycle is judged only the first time. `together` when the last bunch
   * served two or more friends at once. `order` is the order the friends got their balloons in as far as it is
   * known, the takers of the last give; it is short-lived and never stored.
   */
  | { type: 'served'; together: boolean; order: number[] }
  | { type: 'popped'; friend: number }
  /** The waiting troop was tapped before the troop on screen was served: it waves and nothing else. */
  | { type: 'waved' }
  /** The served troop marched off as `marched`, the waiting troop stepped in, and `showing` passes by first when a new idea came with it. */
  | { type: 'steppedIn'; marched: Marched; showing: Showing | null }

/** How a cycle went, from its slips: none is well, one is mixed, two or more is badly. */
export function outcomeOf(slips: number): CycleOutcome {
  return slips <= 0 ? 'well' : slips < 2 ? 'mixed' : 'badly'
}

function oneMore(slips: 0 | 1 | 2): 0 | 1 | 2 {
  return slips === 0 ? 1 : 2
}

/**
 * The child sent the bunch in this place. Whatever leaves the sky is replaced
 * by the same bunch in the same place, so the sky is never changed here. A
 * place the sky does not have changes nothing.
 */
export function sendBunch(save: Save, slot: number): { save: Save; events: PlayEvent[] } {
  if (!Number.isInteger(slot) || slot < 0 || slot >= save.sky.length) return { save, events: [] }
  const bunch = save.sky[slot]
  const { troop, given } = give(save.troop, bunch)
  if (given.result !== 'taken') {
    // A slip counts only while the cycle is still to be judged.
    const after = save.finished ? save : { ...save, slips: oneMore(save.slips) }
    if (given.result === 'refused') return { save: after, events: [{ type: 'refused', slot, bunch }] }
    return { save: after, events: [{ type: 'gotAway', slot, bunch, grabber: given.grabber, spare: given.spare }] }
  }
  const taken: PlayEvent = { type: 'taken', slot, bunch, takers: given.takers }
  if (!given.served) return { save: { ...save, troop }, events: [taken] }
  // The last friend took its balloon, and the ending plays: each time that happens, also when a troop already
  // served is filled again after a pop. The cycle is judged the first time only, and a later ending saves nothing more.
  const served: PlayEvent = { type: 'served', together: given.takers.length > 1, order: given.takers }
  if (save.finished) return { save: { ...save, troop }, events: [taken, served] }
  const judged = finishCycle(save, outcomeOf(save.slips))
  return { save: { ...save, troop, position: judged.position, finished: judged.finished }, events: [taken, served] }
}

/** The child tapped the balloon this friend holds. It pops and the friend reaches up again; the cycle and its judgement are left alone. */
export function popHeld(save: Save, friend: number): { save: Save; events: PlayEvent[] } {
  const { troop, popped } = pop(save.troop, friend)
  if (!popped) return { save, events: [] }
  return { save: { ...save, troop }, events: [{ type: 'popped', friend }] }
}

/**
 * The child tapped the troop that waits at the edge. Before the troop on
 * screen is served it only waves. After, the served troop joins the parade
 * with the balloons it holds, the waiting troop steps in as it was laid out,
 * and the position as it stands now, after the cycle was judged, lays out its
 * sky and the troop after it.
 */
export function callNext(save: Save): { save: Save; events: PlayEvent[] } {
  if (!save.finished) return { save, events: [{ type: 'waved' }] }
  const marched: Marched = { kind: save.troop.kind, size: save.troop.size, balloons: save.troop.held.filter((holds) => holds).length }
  const sky = laySky(save.position, save.next, save.rng)
  const next = layTroop(save.position, save.next.kind, sky.rng)
  const steppedIn: Save = {
    ...save,
    finished: beginCycle(save).finished,
    troop: troopOf(save.next.kind, save.next.size),
    sky: sky.sky,
    next: next.troop,
    slips: 0,
    parade: [...save.parade, marched].slice(-PARADE_LENGTH),
    rng: next.rng,
  }
  // A scene's outcome is stored when the scene starts: the marks are set here, so a put-away during the showing never shows it twice.
  const showing = showingAtStepIn(steppedIn)
  const after = showing === null ? steppedIn : { ...steppedIn, shown: markShown(steppedIn.shown, showing.marks) }
  return { save: after, events: [{ type: 'steppedIn', marched, showing }] }
}

import { type Clutch, FIRST_SEED, WRONG_MAX, isOver, layClutch, layOther, stir } from './layout'
import { type Form, ROW_MAX } from './places'
import { type CycleOutcome, type GameState, STATE_VERSION, beginCycle, finishCycle, firstPosition } from './state'
import { type Meeting, meetingOf } from './tastes'
import { type Kind, isNear } from './voices'

// The model of the world: who hides in the row, who asks at the stone, who
// waits at the edge, who stands on the hill, and what every tap does. It has
// no renderer, no sound and no clock: `act` takes the world and one tap and
// returns the world after it with what happened, for the view to play.
//
// Everything a tap changes is in the world before any scene shows it, so a
// put-away at any instant finds the outcome saved and nothing replays on load
// (ART.md, "The designed order, and what is stored"; the guide, "Found as
// left"). The game has no drag: nothing is ever in the hand.

/** One who stands on the hill: a grown one with its little one, two little ones that sound alike, or a little one alone. */
export type Resident = { kind: Kind; as: 'family' | 'twins' | 'single' }

/** The hill shows the last few the child let out. */
export const HILL_MAX = 4

export type World = GameState & {
  /** The state of the seeded stream that lays out clutches. */
  rng: number
  /** The ways of asking a character has already shown once. */
  shown: Form[]
  /** Who stands on the hill, oldest first, never two of one kind. */
  hill: Resident[]
  /** The kind inside the egg in the basket, or null when that egg has been tipped into the row. */
  extra: Kind | null
  /** The clutch that waits at the edge while `finished` is true. */
  next: Clutch | null
  /** The clutch on screen, or null before the first one has come in. */
  cycle: Clutch | null
}

/** One tap. The view says what the finger landed on; the model says what that does. */
export type Action =
  | { type: 'edge' }
  | { type: 'slot'; slot: number }
  | { type: 'asker' }
  | { type: 'basket' }
  | { type: 'resident'; resident: number }

/** What a tap made happen, in order, for the view and the sound to play. None of it is a verdict. */
export type Happening =
  /** A clutch comes in: the hides tumble out of the basket into the row (in `who`, the grown ones walk in). */
  | { type: 'arrives'; form: Form; row: number }
  /** The showing, once for each way of asking: a pair of this kind does it once, then stands on the hill. */
  | { type: 'shows'; form: Form; kind: Kind }
  /** Someone steps to the stone and calls. */
  | { type: 'asks'; kind: Kind }
  /** The one who asks finds its own already out on the hill. */
  | { type: 'finds'; kind: Kind }
  /** The one who waits at the edge is tapped before its turn: it peeks in, calls once and stays. */
  | { type: 'peeks'; kind: Kind }
  /** A first tap: the one at this spot calls, and whoever asks answers, so the two calls come one after the other. */
  | { type: 'hears'; slot: number; kind: Kind; asker: Kind | null }
  /** A second tap: the two meet. `match` is the reunion; otherwise each reacts by its taste. */
  | { type: 'meets'; slot: number; meeting: Meeting }
  /** In `alike`, with nobody asking: the one let out steps to the stone and asks for the other that sounds like it. */
  | { type: 'stepsOut'; slot: number; kind: Kind }
  /** Someone goes up the hill, or one alone there is joined by its own. */
  | { type: 'settles'; resident: Resident }
  /** The oldest on the hill wanders off over the top to make room. */
  | { type: 'leaves'; kind: Kind }
  /** The asker calls and everyone still in the row answers in turn. */
  | { type: 'rollCall'; asker: Kind; answers: { slot: number; kind: Kind }[] }
  /** The egg in the basket is tipped into the row. */
  | { type: 'tips'; slot: number; kind: Kind }
  /** A tap on the basket that tips nothing: its egg calls from where it lies, or an empty basket wobbles. */
  | { type: 'basket'; kind: Kind | null }
  /** A tap on someone on the hill: it calls and does its trick. */
  | { type: 'calls'; resident: number; kind: Kind; as: Resident['as'] }
  /** The row is empty: the choir, in the order the child found them. */
  | { type: 'ends'; found: Kind[] }
  /** The touch landed where nothing is. The view still answers it. */
  | { type: 'nothing' }

export type Step = { world: World; happened: Happening[] }

export function freshWorld(childAge: number | null, seed: number = FIRST_SEED): World {
  const position = firstPosition(childAge)
  const laid = layClutch(position, seed, null)
  // Nothing is on screen yet but the first one waiting at the edge, so the world starts as a finished one does.
  return { v: STATE_VERSION, position, finished: true, rng: laid.rng, shown: [], hill: [], extra: null, next: laid.clutch, cycle: null }
}

/** How a cycle went, by its wrong attempts: none is well, one is mixed, two or more is badly. */
export function outcomeOf(wrong: number): CycleOutcome {
  return wrong <= 0 ? 'well' : wrong === 1 ? 'mixed' : 'badly'
}

/** What waits at the edge for the child's touch, if anything: a grown one, an egg (in `who`), or a whole clutch. */
export type Waiting = { what: 'grown' | 'egg' | 'clutch'; kind: Kind | null; withClutch: boolean }

export function waitingOf(world: World): Waiting | null {
  const clutch = world.finished ? world.next : world.cycle
  if (!clutch) return null
  if (!world.finished && (clutch.queue.length === 0 || clutch.form === 'alike')) return null
  if (clutch.form === 'alike') return { what: 'clutch', kind: null, withClutch: true }
  return { what: clutch.form === 'who' ? 'egg' : 'grown', kind: clutch.queue[0], withClutch: world.finished }
}

/** Two kinds of one family, tapped one straight after the other on the hill, sing a round. Every time. */
export function singsRound(first: Kind, second: Kind): boolean {
  return isNear(first, second)
}

/** Whether a tap on the basket would tip its egg into the row. */
export function canTip(world: World): boolean {
  const cycle = world.cycle
  return world.extra !== null && cycle !== null && !world.finished && cycle.form !== 'alike' && cycle.kinds.length < ROW_MAX
}

// --- What a tap does ---------------------------------------------------------

const copy = (clutch: Clutch): Clutch => ({ ...clutch, kinds: [...clutch.kinds], slots: [...clutch.slots], queue: [...clutch.queue] })

/** Puts someone on the hill. One of the same kind who stood there makes way, and then the oldest, never one who waits alone for its own. */
function settle(world: World, resident: Resident, happened: Happening[]): void {
  world.hill = world.hill.filter((other) => other.kind !== resident.kind)
  world.hill.push(resident)
  happened.push({ type: 'settles', resident })
  while (world.hill.length > HILL_MAX) {
    const at = world.hill.findIndex((other) => other.as !== 'single')
    const [gone] = world.hill.splice(at < 0 ? 0 : at, 1)
    happened.push({ type: 'leaves', kind: gone.kind })
  }
}

/** One alone on the hill is joined by its own. */
function join(world: World, kind: Kind, as: 'family' | 'twins', happened: Happening[]): boolean {
  const at = world.hill.findIndex((other) => other.kind === kind && other.as === 'single')
  if (at < 0) return false
  world.hill[at] = { kind, as }
  happened.push({ type: 'settles', resident: world.hill[at] })
  return true
}

/** The row is empty and nobody is left to ask: the cycle is judged, the place moves, and the next clutch is laid out to wait. */
function endIfOver(world: World, happened: Happening[]): void {
  const cycle = world.cycle
  if (!cycle || world.finished || !isOver(cycle)) return
  const judged = finishCycle({ v: STATE_VERSION, position: world.position, finished: false }, outcomeOf(cycle.wrong))
  world.position = judged.position
  world.finished = true
  const laid = layClutch(world.position, world.rng, world.extra)
  world.next = laid.clutch
  world.rng = laid.rng
  happened.push({ type: 'ends', found: world.hill.filter((resident) => cycle.kinds.includes(resident.kind)).map((resident) => resident.kind) })
}

/** Someone new stands at the stone, so every spot that was heard is as it was before: the first tap on it is again for hearing. */
function settleBack(cycle: Clutch): void {
  cycle.slots = cycle.slots.map((slot) => (slot === 'heard' ? 'fresh' : slot))
}

/** The next one steps to the stone. In `seek`, one whose own was let out earlier finds it on the hill at once. */
function stepIn(world: World, happened: Happening[]): void {
  const cycle = world.cycle
  if (!cycle || world.finished || cycle.asker !== null || cycle.queue.length === 0) return
  const kind = cycle.queue.shift()!
  happened.push({ type: 'asks', kind })
  if (cycle.form === 'seek' && join(world, kind, 'family', happened)) {
    happened.push({ type: 'finds', kind })
    endIfOver(world, happened)
  } else {
    cycle.asker = kind
    settleBack(cycle)
  }
}

/** The clutch that waits comes in on the child's touch, with a showing the first time a way of asking is met. */
function comeIn(world: World, happened: Happening[]): void {
  if (!world.finished || !world.next) return
  const cycle = world.next
  const begun = beginCycle({ v: STATE_VERSION, position: world.position, finished: true })
  world.finished = begun.finished
  world.cycle = cycle
  world.next = null
  happened.push({ type: 'arrives', form: cycle.form, row: cycle.kinds.length })
  let shower: Kind | null = null
  if (!world.shown.includes(cycle.form)) {
    const other = layOther([...cycle.kinds, world.extra], world.rng)
    world.rng = other.rng
    shower = other.kind
    world.shown = [...world.shown, cycle.form]
    happened.push({ type: 'shows', form: cycle.form, kind: shower })
    settle(world, { kind: shower, as: cycle.form === 'alike' ? 'twins' : 'family' }, happened)
  }
  if (world.extra === null) {
    const egg = layOther([...cycle.kinds, shower], world.rng)
    world.rng = egg.rng
    world.extra = egg.kind
  }
  stepIn(world, happened)
}

/** A second tap on a heard spot: the attempt. */
function attempt(world: World, cycle: Clutch, slot: number, happened: Happening[]): void {
  const kind = cycle.kinds[slot]
  world.rng = stir(world.rng, slot)
  if (cycle.form === 'who') {
    // The grown one walks over and knocks. Only its own egg opens; a wrong knock changes nothing but the count.
    const egg = cycle.asker!
    happened.push({ type: 'meets', slot, meeting: meetingOf(egg, kind) })
    if (kind !== egg) { cycle.wrong = Math.min(WRONG_MAX, cycle.wrong + 1); return }
    cycle.slots[slot] = 'done'
    cycle.asker = null
    settle(world, { kind, as: 'family' }, happened)
    return
  }
  // A hide opens whoever asks, and whoever is inside comes out.
  cycle.slots[slot] = 'done'
  const together = cycle.form === 'alike' ? 'twins' : 'family'
  if (cycle.asker === null) {
    // Only in `alike`: nobody asks yet. The one let out asks, unless the other of its kind already stands on the hill.
    if (join(world, kind, together, happened)) happened.push({ type: 'finds', kind })
    else {
      cycle.asker = kind
      settleBack(cycle)
      happened.push({ type: 'stepsOut', slot, kind })
    }
    return
  }
  happened.push({ type: 'meets', slot, meeting: meetingOf(cycle.asker, kind) })
  if (kind === cycle.asker) {
    cycle.asker = null
    settle(world, { kind, as: together }, happened)
  } else {
    cycle.wrong = Math.min(WRONG_MAX, cycle.wrong + 1)
    // It goes up the hill alone, unless the other of its kind is alone there already: then the two have each other.
    if (!join(world, kind, together, happened)) settle(world, { kind, as: 'single' }, happened)
  }
}

function tapSlot(world: World, slot: number, happened: Happening[]): void {
  const cycle = world.cycle
  if (!cycle || world.finished || !Number.isInteger(slot) || slot < 0 || slot >= cycle.slots.length || cycle.slots[slot] === 'done') {
    happened.push({ type: 'nothing' })
    return
  }
  // With nobody at the stone in `seek` or `who`, the touch brings the next one in and is then a first tap: the
  // child has not yet heard this spot against the one who now asks, so it is never an attempt. That holds as
  // well when the one who came in found its own on the hill and the stone is empty again.
  const nobody = cycle.asker === null && cycle.form !== 'alike'
  if (nobody) stepIn(world, happened)
  if (world.finished) return
  if (nobody || cycle.slots[slot] === 'fresh') {
    cycle.slots[slot] = 'heard'
    happened.push({ type: 'hears', slot, kind: cycle.kinds[slot], asker: cycle.asker })
    return
  }
  attempt(world, cycle, slot, happened)
  endIfOver(world, happened)
}

function tapEdge(world: World, happened: Happening[]): void {
  if (world.finished) { comeIn(world, happened); return }
  const cycle = world.cycle
  if (!cycle || cycle.form === 'alike' || cycle.queue.length === 0) return
  if (cycle.asker === null) stepIn(world, happened)
  else happened.push({ type: 'peeks', kind: cycle.queue[0] })
}

function tapBasket(world: World, happened: Happening[]): void {
  const cycle = world.cycle
  if (!canTip(world) || !cycle) { happened.push({ type: 'basket', kind: world.extra }); return }
  const kind = world.extra!
  cycle.kinds.push(kind)
  cycle.slots.push('fresh')
  cycle.queue.push(kind)
  world.extra = null
  happened.push({ type: 'tips', slot: cycle.kinds.length - 1, kind })
}

/** The world after one tap, and what happened. The world passed in is not changed. */
export function act(before: World, action: Action): Step {
  const world: World = { ...before, shown: [...before.shown], hill: before.hill.map((resident) => ({ ...resident })), next: before.next && copy(before.next), cycle: before.cycle && copy(before.cycle) }
  const happened: Happening[] = []
  if (action.type === 'edge') tapEdge(world, happened)
  else if (action.type === 'slot') tapSlot(world, action.slot, happened)
  else if (action.type === 'basket') tapBasket(world, happened)
  else if (action.type === 'asker') {
    const cycle = world.cycle
    if (cycle && !world.finished && cycle.asker !== null) {
      happened.push({ type: 'rollCall', asker: cycle.asker, answers: cycle.kinds.flatMap((kind, slot) => (cycle.slots[slot] === 'done' ? [] : [{ slot, kind }])) })
    }
  } else if (action.type === 'resident') {
    const resident = world.hill[action.resident]
    if (resident) happened.push({ type: 'calls', resident: action.resident, kind: resident.kind, as: resident.as })
  }
  if (happened.length === 0) happened.push({ type: 'nothing' })
  return { world, happened }
}

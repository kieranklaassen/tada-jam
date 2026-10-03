import type { PartState } from './frame'
import { layProblem, length, samePoint, turn as turned, type Kind, type KitCount, type LayProblem, type Part, type Point } from './kit'
import type { Ending } from './run'
import { give, lay as layVoice, load as loadVoice, pendulum, pinClick, pinPop, pinRattle, pinSwing, pluck as pluckVoice, takeOff as takeOffVoice, trolleyBells, trolleyFlip, trolleyOff, trolleySet, trolleyWeight, turn as turnVoice, type VoiceSpec } from './voices'

// The object-by-action grid (ART.md): six objects by five gestures. Every cell
// has its own result to see and to hear, and the wrong use of an object works.
// Pure: a cell names the piece of acting the view plays and the voice it
// sounds, and the functions below make the change to the bridge, if any.

export type Thing = Kind | 'pin' | 'trolley'
export type Gesture = 'lay' | 'pluck' | 'turn' | 'load' | 'take-off'

export const THINGS: readonly Thing[] = ['plank', 'stick', 'tube', 'thread', 'pin', 'trolley']
export const GESTURES: readonly Gesture[] = ['lay', 'pluck', 'turn', 'load', 'take-off']

/** What each cell shows: the name of one piece of acting, unlike every other cell's. */
export const GRID: Readonly<Record<Thing, Readonly<Record<Gesture, string>>>> = {
  plank: { lay: 'lands-flat-with-a-clack', pluck: 'whips-like-a-ruler', turn: 'rolls-onto-its-edge', load: 'bends-under-the-wheels', 'take-off': 'slides-out' },
  stick: { lay: 'lands-with-a-click', pluck: 'pings-or-knocks', turn: 'spins-like-a-propeller', load: 'rides-like-a-rail', 'take-off': 'flicks-like-a-spillikin' },
  tube: { lay: 'lands-with-a-tok', pluck: 'hoots-like-a-bottle', turn: 'log-rolls', load: 'takes-the-squeeze', 'take-off': 'rolls-down-the-sheet' },
  thread: { lay: 'hangs-in-a-curve', pluck: 'twangs-or-flops', turn: 'whirls-like-a-skipping-rope', load: 'dips-into-a-v', 'take-off': 'whips-onto-its-spool' },
  pin: { lay: 'clicks-into-the-grid', pluck: 'rattles-every-part-on-it', turn: 'swings-a-part-like-a-clock-hand', load: 'hangs-the-trolley-as-a-pendulum', 'take-off': 'pops-out-and-drops-ends-loose' },
  trolley: { lay: 'sits-and-trundles-to-the-low-point', pluck: 'rings-its-weights', turn: 'flips-to-ride-under-the-plank', load: 'dips-the-deck-a-step', 'take-off': 'lets-the-deck-spring-back' },
}

export type Result = { does: string; voice: VoiceSpec }

/** A part laid: what is seen and heard. A drag that cannot lay a part (no length, the kit empty) still answers, and costs nothing. */
export function laid(part: Part, problem: LayProblem | null): Result {
  if (problem) return { does: `springs-back-${problem}`, voice: pinClick }
  return { does: GRID[part.kind].lay, voice: layVoice(part.kind, length(part)) }
}

/** A part plucked, by the force the model finds in it: a stick pings when stretched and knocks when squeezed, a thread twangs when taut and flops when slack. */
export function plucked(part: Part, state: PartState): Result {
  const slack = state.strain === 'slack' || state.strain === 'loose'
  const voice = pluckVoice(part.kind, state.force, length(part), slack)
  if (part.kind === 'stick') return { does: state.force < 0 ? 'knocks' : 'pings', voice }
  if (part.kind === 'thread') return { does: slack ? 'flops' : 'twangs', voice }
  return { does: GRID[part.kind].pluck, voice }
}

/** A part turned. Only a plank changes: a square stick, a round tube and a thread are the same both ways, and each says so in its own way. */
export function turnPart(bridge: readonly Part[], index: number): { bridge: Part[]; result: Result } | null {
  const part = bridge[index]
  if (!part) return null
  return { bridge: bridge.map((p, i) => (i === index ? turned(p) : p)), result: { does: GRID[part.kind].turn, voice: turnVoice(part.kind, length(part)) } }
}

/** One more part on the bridge, or the same bridge with the reason it could not go on. */
export function layPart(bridge: readonly Part[], part: Part, kit: KitCount): { bridge: Part[]; result: Result } {
  const problem = layProblem(part, bridge, kit)
  return { bridge: problem ? [...bridge] : [...bridge, part], result: laid(part, problem) }
}

/** A part taken off and back in the tray. */
export function takeOffPart(bridge: readonly Part[], index: number): { bridge: Part[]; result: Result } | null {
  const part = bridge[index]
  if (!part) return null
  return { bridge: bridge.filter((_, i) => i !== index), result: { does: GRID[part.kind]['take-off'], voice: takeOffVoice(part.kind, length(part)) } }
}

/**
 * A pin pulled: every part that ends on it hangs loose at that end, and the
 * build sags or folds from that place. A plank that only passes through the
 * point stays as it is. A part whose other end was already loose has nothing
 * left to hang from and drops back into the tray.
 */
export function pullPin(bridge: readonly Part[], at: Point): { bridge: Part[]; loosened: number[]; dropped: number[]; result: Result } {
  const loosened: number[] = [], dropped: number[] = []
  const next = bridge.flatMap((part, i): Part[] => {
    const end = !part.loose && samePoint(part.a, at) ? 'a' : !part.loose && samePoint(part.b, at) ? 'b' : null
    if (end) { loosened.push(i); return [{ ...part, loose: end }] }
    // The held end of a part that already hangs loose: with this pin gone too, it falls.
    if (part.loose && samePoint(part[part.loose === 'a' ? 'b' : 'a'], at)) { dropped.push(i); return [] }
    return [part]
  })
  return { bridge: next, loosened, dropped, result: { does: GRID.pin['take-off'], voice: pinPop(loosened.length + dropped.length) } }
}

/** A pin put back into a grid point: every end that hangs loose there is pinned again. */
export function putPin(bridge: readonly Part[], at: Point): { bridge: Part[]; pinned: number[]; result: Result } {
  const pinned: number[] = []
  const next = bridge.map((part, i): Part => {
    if (!part.loose || !samePoint(part[part.loose], at)) return part
    pinned.push(i)
    return { kind: part.kind, a: part.a, b: part.b, turned: part.turned }
  })
  return { bridge: next, pinned, result: { does: GRID.pin.lay, voice: pinClick } }
}

/**
 * The sound of each cell of the grid, at its plainest: thirty voices, no two
 * alike. Where a cell's sound follows the model (a pluck, a load), this is the
 * voice of a part two cells long at rest or half-way to its limit.
 */
export function cellVoice(thing: Thing, gesture: Gesture): VoiceSpec {
  if (thing === 'pin') return { lay: pinClick, pluck: pinRattle([600, 900, 400]), turn: pinSwing, load: pendulum, 'take-off': pinPop(2) }[gesture]
  if (thing === 'trolley') return { lay: trolleySet, pluck: trolleyBells(2), turn: trolleyFlip, load: trolleyWeight(2), 'take-off': trolleyOff(2) }[gesture]
  return { lay: layVoice(thing, 2), pluck: pluckVoice(thing, 2, 2, false), turn: turnVoice(thing, 2), load: loadVoice(thing, 0.5), 'take-off': takeOffVoice(thing, 2) }[gesture]
}

/** What a wheel or the trolley does to the part it stands on: the right road bends, and each wrong road works in its own way. */
export function loaded(kind: Kind, ending: Ending | null): Result {
  const how = ending?.kind === 'gives' ? (ending.strain === 'pull' || ending.strain === 'bow' || ending.strain === 'squeeze' ? ending.strain : 'bend') : null
  return { does: GRID[kind].load, voice: how ? give(how, kind) : loadVoice(kind, 0.5) }
}

export const trolleyRung = (weights: number): Result => ({ does: GRID.trolley.pluck, voice: trolleyBells(weights) })

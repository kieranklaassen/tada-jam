import { awake, isRoomAt, present, roomOf, thing, type Arrangement } from './arrangement'
import { castById, neatOf } from './casts'
import { MOST_MOVES, ROUNDS, SET_DOWNS_PER_GUEST } from './config'
import { edgesOf } from './hotel'
import { settled } from './mood'
import { setDown, tap, turnWheel, type Held, type Outcome, type Target } from './moves'
import { arrangementOf, castFor, withArrangement, withCast, type Stay } from './stay'
import { beginCycle, finishCycle, type CycleOutcome } from './state'

// A cycle: from a coach-load arriving to the house being settled, or to the
// child sending this lot away. It ends when the child ends it and the next
// begins only on the child's touch of the waiting coach (pack: game-design,
// endings-and-short-scenes.md). Nothing here reads a clock.
//
// The place in the designed order moves when a cycle is judged, by the
// template's rule (state.ts): up after one that went well, down after one
// that went badly. Who is in the next coach is decided when the child touches
// it, from the place as it stands then, so nobody already on screen changes.

/** The short scenes a touch can set off. Their outcomes are already in the stay that comes back with them. */
export type Cue = 'settled-day' | 'neat-way' | 'coach-changes-over' | 'sent-away' | Pairing

/** Exact combinations that always set off a small scene of their own. Never hinted at, counted or listed. */
export type Pairing = 'sauna' | 'duet'

export type Turn = { stay: Stay; outcome: Outcome | 'coach-honks'; cues: Cue[] }

/** The pairings an arrangement holds at its hour. */
export function pairingsIn(arrangement: Arrangement): Pairing[] {
  const found: Pairing[] = []
  // The yeti in a room with the stove at three flames.
  const stove = thing(arrangement, 'stove')
  const yeti = roomOf(arrangement, 'yeti')
  if (stove && isRoomAt(stove.at) && stove.dial === 3 && yeti === stove.at.room) found.push('sauna')
  // The troll and the singer on two sides of one wall, both awake.
  const troll = roomOf(arrangement, 'troll'), singer = roomOf(arrangement, 'singer')
  if (troll !== null && singer !== null && awake(arrangement, 'troll', arrangement.phase) && awake(arrangement, 'singer', arrangement.phase)) {
    const a = Math.min(troll, singer), b = Math.max(troll, singer)
    if (edgesOf(arrangement.house.shape).some((edge) => edge.kind === 'wall' && edge.a === a && edge.b === b)) found.push('duet')
  }
  return found
}

/** How a settled cycle went: well within three set-downs for each guest staying, mixed with more. */
export function howItWent(moves: number, guests: number): CycleOutcome {
  return moves <= SET_DOWNS_PER_GUEST * guests ? 'well' : 'mixed'
}

/** Whether two arrangements have the same guests in the same rooms and the same things in the same places at the same dials. */
export function sameHouse(a: Arrangement, b: Arrangement): boolean {
  const key = (arrangement: Arrangement) =>
    JSON.stringify([
      [...arrangement.guests].sort((x, y) => x.id.localeCompare(y.id)).map((guest) => [guest.id, guest.at]),
      [...arrangement.things].sort((x, y) => x.kind.localeCompare(y.kind)).map((item) => [item.kind, item.at, item.at === 'cupboard' ? 1 : item.dial]),
    ])
  return key(a) === key(b)
}

/** What follows a change to the house: new pairings, and the ending if the house has just been settled. */
function after(stay: Stay, before: Arrangement, now: Arrangement, outcome: Outcome, changed: boolean): Turn {
  const had = pairingsIn(before)
  const cues: Cue[] = pairingsIn(now).filter((pairing) => !had.includes(pairing))
  let next = withArrangement(stay, now)
  // A view from a guest who has left with the coach is dropped.
  if (next.from !== null && next.at[next.from] === 'gone') next = { ...next, from: null }
  if (stay.finished) return { stay: next, outcome, cues }
  if (changed) next = { ...next, moves: Math.min(MOST_MOVES, next.moves + 1) }
  if (outcome === 'sent-away') {
    // The child carried a guest out before the house was settled: this lot leaves, and the cycle went badly.
    return { stay: { ...next, ...finishCycle(next, 'badly'), from: null }, outcome, cues: ['sent-away'] }
  }
  if (!settled(now)) return { stay: next, outcome, cues }
  // Settled: the cycle is judged here, once, and saved with the scene it starts.
  const judged: Stay = { ...next, ...finishCycle(next, howItWent(next.moves, present(now).length)) }
  cues.push('settled-day')
  // The neat way belongs to the first settled day at a place. A child who has found it there has nothing to be shown, then or later.
  const cast = castById(stay.cast)
  if (!cast || judged.shown.includes(cast.position)) return { stay: judged, outcome, cues }
  if (!sameHouse(now, neatOf(cast))) cues.push('neat-way')
  return { stay: { ...judged, shown: [...judged.shown, cast.position] }, outcome, cues }
}

/** The child sets a guest or a thing down. */
export function setDownIn(stay: Stay, held: Held, target: Target): Turn {
  const before = arrangementOf(stay)
  // A guest set down on the coach after the house has been judged is the same as touching the coach.
  if ('guest' in held && target === 'coach' && stay.finished) return touchCoach(stay)
  const move = setDown(before, held, target)
  return after(stay, before, move.arrangement, move.outcome, move.changed)
}

/** The child taps a guest or a thing. A tapped guest is the toy: the page is drawn from its place, or back to the plain page. */
export function tapIn(stay: Stay, held: Held): Turn {
  const before = arrangementOf(stay)
  const move = tap(before, held)
  if ('guest' in held) {
    if (move.outcome !== 'looks-from' || stay.at[held.guest] === 'gone') return { stay, outcome: 'nothing', cues: [] }
    return { stay: { ...stay, from: stay.from === held.guest ? null : held.guest }, outcome: 'looks-from', cues: [] }
  }
  // A dial turned a step changes the house truly, and can be what settles it.
  return after(stay, before, move.arrangement, move.outcome, false)
}

/** The child touches the paper margin: back to the plain page. */
export function plainPage(stay: Stay): Stay {
  return stay.from === null ? stay : { ...stay, from: null }
}

/** The child turns the day-and-night wheel. It settles nothing by itself, but a pairing can begin at the new hour. */
export function turnWheelIn(stay: Stay): Turn {
  const before = arrangementOf(stay)
  const move = turnWheel(before)
  const had = pairingsIn(before)
  return { stay: withArrangement(stay, move.arrangement), outcome: move.outcome, cues: pairingsIn(move.arrangement).filter((pairing) => !had.includes(pairing)) }
}

/**
 * The child touches the waiting coach. Before the cycle is judged the driver
 * only honks. After it, the old guests leave, the things go back to the
 * cupboard and the next coach-load gets off into the lobby: the cast is the
 * next one of the place as it stands now.
 */
export function touchCoach(stay: Stay): Turn {
  if (!stay.finished) return { stay, outcome: 'coach-honks', cues: [] }
  const round = (stay.round + 1) % ROUNDS
  const begun: Stay = { ...stay, ...beginCycle(stay), round }
  return { stay: withCast(begun, castFor(begun.position, round)), outcome: 'nothing', cues: ['coach-changes-over'] }
}

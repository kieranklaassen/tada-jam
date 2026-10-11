import { CLOTH_COL, HOME_COL, NEXT_COL, ROWS, SEAT_ROW, copyPawn, step, type Board, type BoardEvent, type Hop, type Pawn } from './board'
import { lay } from './crossing'
import { duckShow, type DuckShow } from './duck'
import { MOST_MISHAPS, boardOf, withBoard, type Saved } from './save'
import { beginCycle, finishCycle, type CycleOutcome } from './state'

// One touch of the game, as a change of the saved state. A hop is one whole step of the board (board.ts), and
// three things can come of it that are more than a step: the family is on the cloth, which ends the crossing and
// judges it; the rabbit hops on to the lane beyond the cloth, which slides the board on to the next crossing; and
// she does that while a small one is still behind, which tips them after her first. Each is settled here, in the
// state, the moment the finger lands, so the scene that shows it can be put away at any instant. Pure: no clock.

/** How the cloth columns lie after a slide: the old cloth is the new home bank. */
const SLIDE = CLOTH_COL - HOME_COL

/** How a crossing went, from the rabbit's own mishaps in it. */
export function judge(mishaps: number): CycleOutcome {
  return mishaps <= 1 ? 'well' : mishaps <= 4 ? 'mixed' : 'badly'
}

export type Turn = {
  saved: Saved
  /** The board the step left, and what the step did, in the frame of the board as it lay before any slide. */
  board: Board
  events: BoardEvent[]
  /** The last of the four has landed on the cloth: the picnic starts. */
  picnic: boolean
  /** She hopped on to the lane beyond the cloth: the board slides on. `tipped` are the small ones the leaf tips after her, and `board` is the board after the slide. */
  slide: { tipped: number[]; board: Board } | null
}

/** One hop of the rabbit's, and everything it settles. */
export function hop(saved: Saved, asked: Hop): Turn {
  const did = step(boardOf(saved), asked)
  let next = withBoard(saved, did.board)
  const more = did.events.filter((event) => (event.type === 'flatten' || event.type === 'spit') && event.who === 0).length
  if (!saved.finished) next = { ...next, mishaps: Math.min(MOST_MISHAPS, saved.mishaps + more) }
  const family = did.board.family
  if (family[0].c === NEXT_COL) {
    // The crossing she leaves unfinished is judged as mixed, which moves nothing.
    const judged = beginCycle(saved.finished ? next : finishCycle(next, 'mixed'))
    const tipped = family.map((pawn, who) => (who > 0 && pawn.c !== CLOTH_COL ? who : -1)).filter((who) => who > 0)
    const laid = lay(judged.position, judged.seed)
    const slid: Saved = {
      ...judged,
      crossing: { from: judged.next.from, home: 'cloth', lanes: judged.next.lanes },
      next: laid.crossing,
      seed: laid.seed,
      // A cycle runs from the board sliding onto the crossing: a mishap in the hop that lands her on its first
      // lane, flat under a car there, is the first of the new crossing.
      mishaps: Math.min(MOST_MISHAPS, more),
      family: lineUp(family),
    }
    return { saved: slid, board: did.board, events: did.events, picnic: false, slide: { tipped, board: boardOf(slid) } }
  }
  if (!saved.finished && family.every((pawn) => pawn.c === CLOTH_COL && !pawn.flat)) {
    // A crossing laid from another position than the current one is not judged.
    const judged = next.crossing.from === next.position ? finishCycle(next, judge(next.mishaps)) : { ...next, finished: true }
    return { saved: { ...judged, mishaps: 0 }, board: did.board, events: did.events, picnic: true, slide: null }
  }
  return { saved: next, board: did.board, events: did.events, picnic: false, slide: null }
}

/**
 * The family after the board has slid: the rabbit on the first lane of the new crossing, as her hop left her,
 * and the small ones on the cloth that is now the home bank. One that was already on the cloth keeps its
 * square; one the leaf tipped after her takes the free square of the cloth nearest her row, upright and riding
 * nothing.
 */
function lineUp(family: readonly Pawn[]): Pawn[] {
  const out = family.map(copyPawn)
  const rabbit = out[0]
  rabbit.c -= SLIDE
  rabbit.dry = { c: HOME_COL, r: rabbit.dry.c === CLOTH_COL ? rabbit.dry.r : Math.max(SEAT_ROW + 1, rabbit.r) }
  const taken = new Set<number>()
  for (let who = 1; who < out.length; who++) if (family[who].c === CLOTH_COL) taken.add(family[who].r)
  for (let who = 1; who < out.length; who++) {
    const pawn = out[who]
    if (family[who].c !== CLOTH_COL) {
      let row = -1
      for (let reach = 0; reach < ROWS && row < 0; reach++) {
        for (const r of [rabbit.r - reach, rabbit.r + reach]) if (row < 0 && r > SEAT_ROW && r < ROWS && !taken.has(r)) row = r
      }
      taken.add(row)
      pawn.r = row
    }
    pawn.c = HOME_COL
    pawn.flat = false
    pawn.on = null
    pawn.dry = { c: HOME_COL, r: pawn.r }
  }
  return out
}

/**
 * The duck's showing, if one is owed and can start now. Its end is settled here, when it starts: the thing is
 * in `shown`, and the lane the duck walks into stands as its steps will leave it. The family does not move.
 */
export function startShowing(saved: Saved): { saved: Saved; show: DuckShow } | null {
  const board = boardOf(saved)
  const show = duckShow(board.lanes, saved.shown, saved.family)
  if (!show) return null
  const lanes = board.lanes.map((lane, c) => (c === show.col ? show.steps[show.steps.length - 1].lane : lane))
  return { saved: { ...withBoard(saved, { lanes, family: saved.family }), shown: [...saved.shown, show.thing] }, show }
}

/**
 * Whether a load owes the duck's showing. A showing starts when the slide ends, or on a first visit, and is
 * owed on a load only when the game was put away before it could start: the small ones still stand on the home
 * bank as the slide or the first visit left them, and the rabbit on it or on the first lane. Once the family is
 * under way nothing is owed, so the first touch after the game is opened again is a hop like any other, and a
 * thing that was never shown waits for the next crossing that holds it.
 */
export function owedOnLoad(saved: Saved): boolean {
  const [rabbit, ...small] = saved.family
  return rabbit.c <= HOME_COL + 1 && small.every((pawn) => pawn.c === HOME_COL && !pawn.flat && pawn.on === null)
}

/** What a touch does about the duck's showing: the state after it, the showing to put on if one starts, whether it is watched, and whether the touch still hops. */
export type TouchAnswer = { saved: Saved; show: DuckShow | null; watched: boolean; hops: boolean }

/**
 * A touch on the board, before it is a hop. With a showing owed that can start, the touch starts it and makes no
 * hop. A touch that cut the tip or the slide short is an ordinary hop: the slide has ended, so the showing
 * starts, settled in the save as always, and this same touch ends it unwatched. With nothing owed, or nothing
 * new on the board, the touch is a hop and the state stays as it is.
 */
export function answerTouch(saved: Saved, owed: boolean, cut: boolean): TouchAnswer {
  const started = owed ? startShowing(saved) : null
  if (!started) return { saved, show: null, watched: false, hops: true }
  return { saved: started.saved, show: started.show, watched: !cut, hops: cut }
}

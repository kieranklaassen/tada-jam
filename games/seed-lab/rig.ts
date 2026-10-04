import { Game } from './game'
import { beetleHome, packetPlaces, standingOf, type Point } from './hit'
import type { Cast } from './house'
import type { LabState } from './lab'
import { layoutOf, type Layout } from './layout'
import type { Action, Actor } from './motion'
import { plantById } from './page'
import { loupeHome } from './reach'
import { VISITORS, type VisitorId } from './visitors'
import type { Part } from './voices'
import { visitorSpot, waitingSpot } from './walker'

// A rig for the tests of the game: a stand-in cast whose actions are short
// and plain, and a game that can be played by hand, frame by frame, as the
// Mount plays it. It is used by tests only and is never part of a build.

const ANSWERS = ['come-in', 'go-off', 'shrug', 'like-colour', 'like-height', 'like-leaf', 'like-petals', 'miss-colour', 'miss-height-higher', 'miss-height-lower', 'miss-leaf', 'miss-petals', 'take', 'use', 'settle', 'rattle', 'balance', 'tug', 'peer', 'bow', 'poked', 'hat', 'vanish']

/** A cast with every action the game calls, each a plain nod of its own length. */
export function stubCast(): Cast {
  const action = (seconds: number, amount: number): Action => ({ seconds, keys: [{ at: 0, set: {} }, { at: 0.5, set: { lean: amount, shift: -amount } }, { at: 1, set: {} }] })
  const actor = (who: number): Actor => ({
    pause: [1.5, 3],
    weight: 0.1 * who,
    tempo: 0.5 + 0.1 * who,
    funniest: `part ${who}`,
    idle: { a: action(1.1, 0.02), b: action(1.3, 0.03), c: action(0.9, 0.04) },
    answer: Object.fromEntries(ANSWERS.map((name, at) => [name, action(name.startsWith('like') ? 0.6 : name === 'use' ? 1.6 : name === 'hat' || name === 'vanish' ? 2 : 0.8 + 0.01 * at, 0.2)])),
  })
  return Object.fromEntries(VISITORS.map((who, at) => [who, actor(at + 1)])) as Cast
}

export const FRAME = 1 / 60

export function rig(state: LabState, layout: Layout = layoutOf(1180, 820), cast: Cast = stubCast()) {
  const made = new Game(state, layout, 20261003, cast)
  const heard: (readonly Part[])[] = []
  const drain = () => {
    for (let i = 0; i < made.fx.sounds.length; ) {
      if (made.fx.sounds[i].after <= 0) heard.push(made.fx.sounds.splice(i, 1)[0].parts)
      else i++
    }
  }
  /** Plays some seconds frame by frame, taking each sound as it comes due, as the Mount does. */
  const play = (seconds: number, each: () => void = () => {}) => {
    for (let t = 0; t < seconds; t += FRAME) { made.step(FRAME); drain(); each() }
  }
  const tap = (at: Point) => { made.gesture({ type: 'press', at }); made.gesture({ type: 'tap', at }); drain() }
  const drag = (from: Point, to: Point, hold?: () => void) => {
    made.gesture({ type: 'press', at: from })
    made.gesture({ type: 'dragStart', from })
    for (let step = 1; step <= 6; step++) made.gesture({ type: 'dragMove', from, at: { x: from.x + ((to.x - from.x) * step) / 6, y: from.y + ((to.y - from.y) * step) / 6 } })
    if (hold) { made.step(FRAME); hold() }
    made.gesture({ type: 'dragEnd', from, at: to })
    drain()
  }
  const mid = (r: { x: number; y: number; w: number; h: number }): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
  const where = {
    flower: (id: number): Point => standingOf(layout, plantById(made.state, id)!).flower,
    pod: (id: number): Point => standingOf(layout, plantById(made.state, id)!).pod,
    pot: (row: 'shelf' | 'tray', slot: number): Point => mid(layout[row][slot].pot),
    bud: (row: 'shelf' | 'tray', slot: number): Point => ({ x: layout[row][slot].bud.x, y: layout[row][slot].bud.y }),
    packet: (at = 0): Point => mid(packetPlaces(made.state, layout)[at]),
    waiting: (): Point => mid(layout.waiting),
    visitor: (): Point => mid(layout.visitor),
    wish: (): Point => mid(layout.wish),
    can: (): Point => mid(layout.tools.can),
    blotter: (): Point => mid(layout.tools.blotter),
    loupe: (): Point => { const home = loupeHome(layout); return { x: home.x, y: home.y } },
    beetle: (): Point => { const home = beetleHome(layout); return { x: home.x, y: home.y - 30 * home.s } },
    corner: (): Point => ({ x: layout.beetle.x + layout.beetle.w * 0.2, y: layout.beetle.y + layout.beetle.h * 0.5 }),
    paper: { x: layout.w / 2, y: 6 } as Point,
    visitorSpot: (who: VisitorId) => visitorSpot(layout, who),
    waitingSpot: (who: VisitorId, first = made.state.visitor === null) => waitingSpot(layout, who, first),
  }
  const has = (voice: readonly Part[]) => heard.includes(voice)
  return { made, layout, heard, play, drain, tap, drag, where, has }
}

/** One call a test's recording surface wrote down: its name and what it was given. */
export type DrawCall = [name: string, ...args: unknown[]]

/**
 * What the last making of the kept set laid into it, after the paper: the pots, the packets, the kept drawings, the
 * margin sketches, the can and the blotter, each where it stands. The set is the full-size sheet that holds more
 * than one drawing; each making starts by setting its transform.
 */
export function setOf(made: { canvas: { width: number }; calls: DrawCall[] }[], width: number): DrawCall[] {
  const full = made.filter((sheet) => sheet.canvas.width >= width && sheet.calls.some(([name]) => name === 'drawImage'))
  const set = full.find((sheet) => { const from = sheet.calls.map(([name]) => name).lastIndexOf('setTransform'); return sheet.calls.slice(from).filter(([name]) => name === 'drawImage').length > 1 })
  if (!set) return []
  return set.calls.slice(set.calls.map(([name]) => name).lastIndexOf('setTransform')).filter(([name]) => name === 'drawImage').slice(1)
}

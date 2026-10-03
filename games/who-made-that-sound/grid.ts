import { KINDS, type Kind, type Note, type Shape, callOf, shapeOf } from './voices'

// The object-by-action grid (ART.md, "The object-by-action grid"): six kinds
// by the five things a child can do to any of them. Every cell gives a result
// that looks and sounds different, and the two wrong uses work like the rest.
// The view plays a cell's move and the sound layer its notes; the moves are
// named here so that a test can hold all thirty apart.

export const ACTIONS = ['firstTap', 'secondTapOwnAsks', 'secondTapOtherAsks', 'tapWhenOut', 'tapWhileAnotherCalls'] as const
export type GridAction = (typeof ACTIONS)[number]

/** The two cells that are wrong uses: opening for another kind, and tapping into another's call. Both work. */
export const WRONG_USES: readonly GridAction[] = ['secondTapOtherAsks', 'tapWhileAnotherCalls']

export type Cell = {
  /** What the body, or the egg around it, does: this kind's own, shared with no other cell. */
  move: string
  /** The call, as notes: softer from inside a hide. */
  notes: Note[]
  /** The picture of the call that the move carries. */
  shape: Shape
  /** How the call sits with whoever else sounds: alone, in step with its own kind, at another kind, or over another's call. */
  sounds: 'alone' | 'in-step' | 'at-the-asker' | 'over-another'
}

/** How each kind's egg moves on the first tap: the shape of its call, seen on the shell. */
const WAKES: Readonly<Record<Kind, string>> = {
  pip: 'egg-pops-up-once-high',
  tok: 'egg-pops-up-twice-high',
  hoom: 'egg-leans-over-slowly-low',
  brrl: 'egg-leans-low-and-shivers',
  wheep: 'egg-tips-up-end-to-end',
  dooo: 'egg-tips-down-end-to-end',
}

/** How each kind comes out, and what it does with its own kind when the two sound as one. */
const REUNIONS: Readonly<Record<Kind, string>> = {
  pip: 'shoots-out-like-a-cork-and-lands-on-its-head',
  tok: 'pecks-out-in-two-blows-and-knocks-beaks',
  hoom: 'rolls-the-shell-off-and-hums-belly-to-belly',
  brrl: 'neck-out-first-and-necks-wound-together',
  wheep: 'springs-out-and-bounces-higher-each-glide',
  dooo: 'slides-out-and-slides-down-side-by-side',
}

/** How each kind comes out to one who is not its own. What each then does is its taste (tastes.ts). */
const ENTRANCES: Readonly<Record<Kind, string>> = {
  pip: 'shoots-out-like-a-cork',
  tok: 'pecks-out-in-two-blows',
  hoom: 'rolls-the-shell-off-like-a-blanket',
  brrl: 'neck-comes-out-first-shivering',
  wheep: 'springs-out-upwards',
  dooo: 'slides-out-and-flops',
}

/** Each kind's own trick when it is tapped in the open. */
const TRICKS: Readonly<Record<Kind, string>> = {
  pip: 'spins-on-the-spot',
  tok: 'pecks-the-ground-twice',
  hoom: 'swells-up-belly-wobbling',
  brrl: 'neck-ripples-bottom-to-top',
  wheep: 'crouches-and-springs-with-the-glide',
  dooo: 'droops-to-the-ground-and-snaps-back',
}

/** What each kind does when it is tapped while another one calls: it joins in, in its own way. */
const JOINS: Readonly<Record<Kind, string>> = {
  pip: 'peeps-on-every-beat-of-the-other',
  tok: 'pecks-the-others-foot-in-time',
  hoom: 'hums-underneath-like-a-floor',
  brrl: 'warbles-around-and-loops-its-neck',
  wheep: 'answers-with-its-glide-like-a-question',
  dooo: 'finishes-with-its-glide-like-a-sigh',
}

export function cellOf(kind: Kind, action: GridAction): Cell {
  const shape = shapeOf(kind)
  if (action === 'firstTap') return { move: WAKES[kind], notes: callOf(kind, true), shape, sounds: 'alone' }
  if (action === 'secondTapOwnAsks') return { move: REUNIONS[kind], notes: callOf(kind), shape, sounds: 'in-step' }
  if (action === 'secondTapOtherAsks') return { move: ENTRANCES[kind], notes: callOf(kind), shape, sounds: 'at-the-asker' }
  if (action === 'tapWhenOut') return { move: TRICKS[kind], notes: callOf(kind), shape, sounds: 'alone' }
  return { move: JOINS[kind], notes: callOf(kind), shape, sounds: 'over-another' }
}

/** The whole grid, row by row. */
export function grid(): { kind: Kind; action: GridAction; cell: Cell }[] {
  return KINDS.flatMap((kind) => ACTIONS.map((action) => ({ kind, action, cell: cellOf(kind, action) })))
}

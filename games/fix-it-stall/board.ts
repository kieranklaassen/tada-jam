// The copper of a gadget: where its pads are and which traces join them.
// Pure layout, no renderer. A circuit names pads by their index here, so the
// builder is deterministic and a shipped layout is never reordered.
//
// Every board is a ladder seen from above. A cell column stands at the left,
// a top rail and a bottom rail run to the right, and rungs stand between the
// rails. A rung is a pair of pads one unit apart that a part can sit across:
// the last rung is where the gadget's own lamp, motor or buzzer sits, and the
// others are spare.
//
//   1 ─────── s ┄ s ── r ── r ── r      top rail (s ┄ s: the switch's pads)
//   │                  │    │    │
//   0 cap              ○    ○    ○      rung pads, one unit apart
//   · base             ○    ○    ○
//   │                  │    │    │
//   └──────── j ┄ j ── r ── r ── r      bottom rail (j ┄ j: the link's pads)

export type Pad = { x: number; y: number }
export type Trace = { a: number; b: number }

/**
 * The gadgets a customer brings, the stall's own sign, and the toy: a cell and a lamp on the bare mat with no
 * copper between them. A plain gadget has no switch: copper joins the switch's pads.
 */
export type GadgetKind = 'lamp-plain' | 'fan-plain' | 'bell-plain' | 'lamp' | 'fan' | 'bell' | 'car' | 'robot' | 'sign' | 'toy'

export type Board = {
  /** Width and height in pad units. */
  cols: number
  rows: number
  pads: readonly Pad[]
  traces: readonly Trace[]
  /** One pad pair per cell, base first and cap second, in the order the cells stand from the bottom rail to the top. */
  cellSockets: readonly (readonly [number, number])[]
  /** The pads a switch sits across. In a plain gadget a trace joins them. */
  switchSocket: readonly [number, number]
  /** The pads on the bottom rail that a factory lead joins. Taking that lead off makes room for a part in the row. */
  linkSocket: readonly [number, number]
  /** Top pad then bottom pad of each rung, left to right. */
  rungs: readonly (readonly [number, number])[]
}

type Shape = { rungs: number; cells: 1 | 2; switched: boolean }

const SHAPES: Record<Exclude<GadgetKind, 'toy'>, Shape> = {
  'lamp-plain': { rungs: 3, cells: 1, switched: false },
  'fan-plain': { rungs: 3, cells: 1, switched: false },
  'bell-plain': { rungs: 3, cells: 1, switched: false },
  lamp: { rungs: 3, cells: 1, switched: true },
  fan: { rungs: 3, cells: 1, switched: true },
  bell: { rungs: 3, cells: 1, switched: true },
  car: { rungs: 3, cells: 1, switched: true },
  robot: { rungs: 3, cells: 1, switched: true },
  sign: { rungs: 7, cells: 2, switched: true },
}

/** The first rung's column. Columns 0 to 3 hold the cells, the switch and the link. */
const FIRST_RUNG_COL = 4

function build(shape: Shape): Board {
  const pads: Pad[] = []
  const traces: Trace[] = []
  const pad = (x: number, y: number) => pads.push({ x, y }) - 1
  const join = (a: number, b: number) => { traces.push({ a, b }) }
  // One cell takes two rows; rails sit a row above and below the cells.
  const bottom = shape.cells * 2 + 1
  const cols = FIRST_RUNG_COL + shape.rungs
  // The cell column, top to bottom: the top corner, then cap and base of each cell.
  const topLeft = pad(0, 0)
  const cellSockets: [number, number][] = []
  let above = topLeft
  for (let c = 0; c < shape.cells; c++) {
    const cap = pad(0, c * 2 + 1), base = pad(0, c * 2 + 2)
    join(above, cap)
    cellSockets.unshift([base, cap])
    above = base
  }
  const bottomLeft = pad(0, bottom)
  join(above, bottomLeft)
  // The top rail: the switch's pads, then one pad above each rung.
  const switchA = pad(2, 0), switchB = pad(3, 0)
  join(topLeft, switchA)
  if (!shape.switched) join(switchA, switchB)
  // The bottom rail: the link's pads, then one pad below each rung.
  const linkB = pad(2, bottom), linkA = pad(3, bottom)
  join(linkB, bottomLeft)
  const rungs: [number, number][] = []
  const mid = Math.floor(bottom / 2)
  let top = switchB, low = linkA
  for (let r = 0; r < shape.rungs; r++) {
    const x = FIRST_RUNG_COL + r
    const railTop = pad(x, 0), railLow = pad(x, bottom)
    join(top, railTop)
    join(low, railLow)
    const upper = pad(x, mid), lower = pad(x, mid + 1)
    // On a tall board a stub runs from each rail to its rung pad; on a short one the rung pads are a unit from the rails.
    join(railTop, upper)
    join(lower, railLow)
    rungs.push([upper, lower])
    top = railTop
    low = railLow
  }
  return { cols, rows: bottom + 1, pads, traces, cellSockets, switchSocket: [switchA, switchB], linkSocket: [linkA, linkB], rungs }
}

/**
 * The toy: nothing is joined to anything. A cell stands at the left and a lamp at the right, each on its own two
 * pads, and two lone posts lie between them for a longer way round. Every way the current can go is a lead the
 * child clipped on.
 *
 *        4 post
 *   1 cap        2 lamp
 *   0 base       3 lamp
 *        5 post
 */
function buildToy(): Board {
  const pads: Pad[] = [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 2, y: 0 }, { x: 2, y: 3 }]
  return { cols: 5, rows: 4, pads, traces: [], cellSockets: [[0, 1]], switchSocket: [4, 5], linkSocket: [4, 5], rungs: [[2, 3]] }
}

const BOARDS = new Map<GadgetKind, Board>()

/** The copper of one kind of gadget. Built once and shared: a board is never changed. */
export function boardOf(kind: GadgetKind): Board {
  let board = BOARDS.get(kind)
  if (!board) {
    board = kind === 'toy' ? buildToy() : build(SHAPES[kind])
    BOARDS.set(kind, board)
  }
  return board
}

/** Every kind with copper of its own: the gadgets and the sign. The toy has none and is not among them. */
export const GADGET_KINDS = Object.keys(SHAPES) as GadgetKind[]

/** Whether a string from a save names a gadget. */
export function isGadgetKind(value: unknown): value is GadgetKind {
  return value === 'toy' || (typeof value === 'string' && Object.hasOwn(SHAPES, value))
}

/** The distance between two pads, in pad units. */
export function padDistance(board: Board, a: number, b: number): number {
  const p = board.pads[a], q = board.pads[b]
  return Math.hypot(p.x - q.x, p.y - q.y)
}

/** A part sits across two different pads exactly one unit apart. */
export function isSocket(board: Board, a: number, b: number): boolean {
  return a !== b && a >= 0 && b >= 0 && a < board.pads.length && b < board.pads.length && Math.abs(padDistance(board, a, b) - 1) < 1e-9
}

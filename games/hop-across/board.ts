// The board and its one rule: a hop of the rabbit's is one step of everything.
// Pure: no clock, no chance, no drawing. `step` takes the board and a hop and
// gives back the board after it, with what happened on the way as a list of
// events for the view and the sounds. Nothing here moves without a hop.

/** The board in squares: ten columns across (the family crosses them left to right), six rows down. */
export const COLS = 10
export const ROWS = 6
/** A lane is a loop of eight squares, of which the first six show: a mover that leaves one end is two steps out of sight. */
export const LOOP = 8
/** The column of the home bank, of the picnic cloth, and of the first lane of the next crossing. The top square of each bank is a seat, not a place to land. */
export const HOME_COL = 0
export const CLOTH_COL = 8
export const NEXT_COL = 9
export const SEAT_ROW = 0

export type LaneKind = 'bank' | 'cloth' | 'grass' | 'road' | 'river' | 'rails' | 'railroad'
export type MoverKind = 'car' | 'lorry' | 'log' | 'turtle'
export const LANE_KINDS: readonly LaneKind[] = ['bank', 'cloth', 'grass', 'road', 'river', 'rails', 'railroad']
export const MOVER_KINDS: readonly MoverKind[] = ['car', 'lorry', 'log', 'turtle']

/** Squares a mover takes in one step, and squares it is long. Its first square is its front. A turtle stays where it is. */
export const SPEED: Record<MoverKind, number> = { car: 1, lorry: 2, log: 1, turtle: 0 }
export const LENGTH: Record<MoverKind, number> = { car: 1, lorry: 2, log: 2, turtle: 1 }

export type Square = { c: number; r: number }
/**
 * `at` is where its front stands on the lane's loop (0 to 5 are the rows, 6 and 7 are out of sight); `dir` is 1
 * down the board, -1 up it. A turtle also holds its count: 0 head high, 1 shell awash, 2 under. A lorry the train
 * has shoved into the tunnel holds in `count` how many more steps it stays there, out of sight; it has none otherwise.
 */
export type Mover = { kind: MoverKind; at: number; dir: 1 | -1; count?: number }
/** The train of a lane with rails: the arch it sleeps in (`far` is the top of the board), and whether its bell has woken it. */
export type Train = { arch: 'far' | 'near'; awake: boolean }
/** `bell` is the square of the lane's bell plate: in the lane itself (`dc` 0) or in the lane before it (`dc` -1). */
export type Lane = { kind: LaneKind; movers: Mover[]; bell?: { dc: -1 | 0; r: number }; train?: Train }
/** What a pawn rides: the mover (its column is the pawn's own, `index` its place in that lane's list) and which square of it, 0 the front. */
export type Ride = { index: number; part: number }
/** `dry` is the last dry square it stood on, where the fish spits it back to. */
export type Pawn = { c: number; r: number; flat: boolean; on: Ride | null; dry: Square }
/** The family in the order of the line: the rabbit first, then the three small ones. */
export type Board = { lanes: Lane[]; family: Pawn[] }

/** One hop: one square along one way, or none, which is a hop on the spot. */
export type Hop = { dc: -1 | 0 | 1; dr: -1 | 0 | 1 }

/** What a pawn landed on. */
export type Landing = 'bank' | 'grass' | 'road' | 'cloth' | 'rails' | 'log' | 'bed' | 'roof' | 'shell'
/** Why a hop came down where it went up. `seat` is a bounce off whoever sits on a cloth's seat; `burrow` is the burrow on the first home bank, which is as hard as the rim. */
export type SpotReason = 'self' | 'rim' | 'burrow' | 'seat' | 'wait' | 'dither' | 'cab'
/** What flattened a pawn. */
export type Flattener = 'car' | 'lorry' | 'train'

export type BoardEvent =
  /** `cab` says it came down on a lorry's cab and slid back onto the bed, which is where `to` is. */
  | { type: 'hop'; who: number; from: Square; to: Square; landing: Landing; mover?: Square & { index: number }; leap?: boolean; cab?: boolean }
  /** `off` goes with the reason `cab`: the square of the lorry's cab it came down on before it slid back off, and which lorry. */
  | { type: 'spot'; who: number; at: Square; why: SpotReason; off?: Square & { index: number } }
  /** Flat under something: a wriggle and no hop this step. */
  | { type: 'stuck'; who: number; at: Square }
  /** Into open water at `at` (`water`), down with a turtle, or off the edge on a log, and spat back to `to`. */
  | { type: 'spit'; who: number; from: Square; at: Square; to: Square; by: 'water' | 'turtle' | 'edge' }
  | { type: 'roll'; col: number; index: number; kind: 'car' | 'lorry' | 'log'; dir: 1 | -1; from: number; to: number }
  /** A turtle's step: its count after it, and whether a log lies over it. */
  | { type: 'turtle'; col: number; index: number; count: number; under: boolean }
  /** A lorry caught a car up and shunted it on. */
  | { type: 'shunt'; col: number; index: number; by: number }
  /** A log rode up over a turtle. */
  | { type: 'over'; col: number; index: number; turtle: number }
  | { type: 'carry'; who: number; from: Square; to: Square; kind: MoverKind }
  /** A log scooped it off the turtle it stood on. */
  | { type: 'scoop'; who: number; at: Square; index: number }
  /** The car rolled out from under it. */
  | { type: 'slideOff'; who: number; at: Square }
  /** The tunnel arch knocked it off the lorry. */
  | { type: 'knock'; who: number; from: Square; to: Square }
  | { type: 'flatten'; who: number; at: Square; col: number; index: number; kind: Flattener }
  | { type: 'peel'; who: number; at: Square }
  /** A hop onto a bell plate of the rails in `col`. `nth` is the ringer's place in the line, the rabbit 1: each one down the line rings it a note higher. */
  | { type: 'bell'; who: number; at: Square; col: number; nth: number }
  /** The train of `col` woke in its arch. */
  | { type: 'wake'; col: number; arch: 'far' | 'near' }
  /** The train of `col` slept through the step. */
  | { type: 'snore'; col: number; arch: 'far' | 'near' }
  /** The train of `col` took its whole lane, from one arch to the other, and shoved these movers out of it. */
  | { type: 'train'; col: number; from: 'far' | 'near'; shoved: number[] }
  /** The fish nosed the log she rides from below. */
  | { type: 'nose'; col: number; index: number }
  /** She hopped on the spot beside a river: the fish's shadow came nearer and a bubble rose. */
  | { type: 'blip'; col: number }

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** The loop square of one part of a mover: its front, or the squares behind it. */
export function partAt(mover: Mover, part: number): number {
  return mod(mover.at - mover.dir * part, LOOP)
}

export function hasRails(kind: LaneKind): boolean {
  return kind === 'rails' || kind === 'railroad'
}

/** Where a pawn can be rolled flat. */
export function isHard(kind: LaneKind): boolean {
  return kind === 'road' || hasRails(kind)
}

function isDry(kind: LaneKind): boolean {
  return kind === 'bank' || kind === 'grass' || kind === 'cloth'
}

/** The log, car or lorry of a lane that lies on row `r`, if any. */
export function logOn(lane: Lane, r: number): Ride | null {
  for (let index = 0; index < lane.movers.length; index++) {
    const mover = lane.movers[index]
    if (mover.kind === 'turtle') continue
    for (let part = 0; part < LENGTH[mover.kind]; part++) if (partAt(mover, part) === r) return { index, part }
  }
  return null
}

/**
 * Which mover of a lane, and which part of it, a pawn on row `r` would stand on, if any. A log lies over a
 * turtle, so the log is found first; a turtle that is under is nothing to stand on.
 */
export function moverOn(lane: Lane, r: number): Ride | null {
  const over = logOn(lane, r)
  if (over) return over
  for (let index = 0; index < lane.movers.length; index++) {
    const mover = lane.movers[index]
    if (mover.kind === 'turtle' && mover.at === r && (mover.count ?? 0) < 2) return { index, part: 0 }
  }
  return null
}

export function isSeat(c: number, r: number): boolean {
  return r === SEAT_ROW && (c === HOME_COL || c === CLOTH_COL)
}

export function onBoard(c: number, r: number): boolean {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS
}

function pawnAt(family: readonly Pawn[], c: number, r: number, except = -1): number {
  for (let i = 0; i < family.length; i++) if (i !== except && family[i].c === c && family[i].r === r) return i
  return -1
}

/** The column of the rails whose bell plate lies on (c, r), or -1. */
export function plateAt(lanes: readonly Lane[], c: number, r: number): number {
  for (let col = Math.max(0, c); col <= Math.min(lanes.length - 1, c + 1); col++) {
    const bell = lanes[col].bell
    if (bell && col + bell.dc === c && bell.r === r) return col
  }
  return -1
}

/** The hop a tap on square (c, r) asks of the rabbit: one square towards it along the longer way, across the lanes when both are as long, or a hop on the spot for a tap on her own square. A tap past the rim gives a row beyond the board, and from her own edge row that is a hop at the rim. */
export function hopToward(board: Board, c: number, r: number): Hop {
  const rabbit = board.family[0]
  if (r < 0 && rabbit.r === 0) return { dc: 0, dr: -1 }
  if (r >= ROWS && rabbit.r === ROWS - 1) return { dc: 0, dr: 1 }
  const dc = c - rabbit.c, dr = Math.min(ROWS - 1, Math.max(0, r)) - rabbit.r
  if (dc === 0 && dr === 0) return { dc: 0, dr: 0 }
  if (Math.abs(dc) >= Math.abs(dr)) return { dc: dc > 0 ? 1 : -1, dr: 0 }
  return { dc: 0, dr: dr > 0 ? 1 : -1 }
}

/**
 * Who keeps a hop from landing on (c, r): a pawn that stands or lies there. The one exception is a flat pawn
 * under a lorry, which keeps nobody off the bed above it.
 */
function inTheWay(board: Board, who: number, c: number, r: number): number {
  const ride = moverOn(board.lanes[c], r)
  const lorry = ride !== null && board.lanes[c].movers[ride.index].kind === 'lorry'
  for (let i = 0; i < board.family.length; i++) {
    const pawn = board.family[i]
    if (i !== who && pawn.c === c && pawn.r === r && (!pawn.flat || !lorry)) return i
  }
  return -1
}

/** The free dry square nearest `want` in its own column: where the fish puts a pawn down. */
function freeDry(family: readonly Pawn[], want: Square, who: number): Square {
  for (let reach = 0; reach < ROWS; reach++) {
    for (const r of reach === 0 ? [want.r] : [want.r - reach, want.r + reach]) {
      if (r >= 0 && r < ROWS && !isSeat(want.c, r) && pawnAt(family, want.c, r, who) < 0) return { c: want.c, r }
    }
  }
  return want
}

/** Whether (c, r) is open water: a river square with nothing on it to stand on. */
function isOpenWater(lanes: readonly Lane[], c: number, r: number): boolean {
  return lanes[c].kind === 'river' && moverOn(lanes[c], r) === null
}

/** Whether a small one may hop to (c, r): on the board, not a seat, nobody there, and not open water. */
function mayFollow(board: Board, who: number, c: number, r: number): boolean {
  return onBoard(c, r) && !isSeat(c, r) && inTheWay(board, who, c, r) < 0 && !isOpenWater(board.lanes, c, r)
}

/** How many steps a lorry the train has shoved into the tunnel stays out of sight before it trundles out of the other arch. */
export const SHOVED_STEPS = 3

/** Whether a lorry is waiting in the tunnel the train shoved it into. */
const waits = (mover: Mover): boolean => mover.kind === 'lorry' && (mover.count ?? 0) > 0

/** What one lane's step did, besides its events: the squares a vehicle rolled over, and whether the train ran. */
export type LaneStep = { swept: { r: number; index: number; kind: Flattener }[]; ran: boolean }

/**
 * One step of one lane, which changes it: cars, lorries and logs move, a lorry shunts the car it catches up, a
 * turtle counts on, and the train runs if its bell woke it the step before, then wakes if its bell rang `rung`
 * times in this one.
 */
export function stepLane(lane: Lane, col: number, rung: number, events: BoardEvent[]): LaneStep {
  const swept: LaneStep['swept'] = []
  const from = lane.movers.map((mover) => mover.at)
  lane.movers.forEach((mover, index) => {
    if (mover.kind === 'turtle') return
    // A lorry in the tunnel the train shoved it into stays there, and counts its steps down.
    if (waits(mover)) {
      if (mover.count === 1) delete mover.count
      else mover.count = (mover.count ?? 1) - 1
      return
    }
    mover.at = mod(mover.at + mover.dir * SPEED[mover.kind], LOOP)
    events.push({ type: 'roll', col, index, kind: mover.kind, dir: mover.dir, from: from[index], to: mover.at })
  })
  // A lorry that has caught a car up shunts it on to the square ahead of its cab.
  lane.movers.forEach((lorry, by) => {
    if (lorry.kind !== 'lorry' || waits(lorry)) return
    lane.movers.forEach((car, index) => {
      if (car.kind !== 'car' || (car.at !== lorry.at && car.at !== partAt(lorry, 1))) return
      car.at = mod(lorry.at + lorry.dir, LOOP)
      events.push({ type: 'shunt', col, index, by })
    })
  })
  lane.movers.forEach((mover, index) => {
    if (mover.kind === 'car' || mover.kind === 'lorry') {
      // Every square its front passed over or stopped on, and what it covers now.
      const far = mod((mover.at - from[index]) * mover.dir, LOOP)
      for (let k = 1; k <= far; k++) swept.push({ r: mod(from[index] + mover.dir * k, LOOP), index, kind: mover.kind })
      for (let part = 1; part < LENGTH[mover.kind]; part++) swept.push({ r: partAt(mover, part), index, kind: mover.kind })
    } else if (mover.kind === 'log') {
      lane.movers.forEach((turtle, t) => {
        if (turtle.kind === 'turtle' && turtle.at === mover.at) events.push({ type: 'over', col, index, turtle: t })
      })
    }
  })
  lane.movers.forEach((mover, index) => {
    if (mover.kind !== 'turtle') return
    mover.count = ((mover.count ?? 0) + 1) % 3
    events.push({ type: 'turtle', col, index, count: mover.count, under: logOn(lane, mover.at) !== null })
  })
  let ran = false
  const train = lane.train
  if (train) {
    if (train.awake) {
      // The whole lane at once: every car and lorry in sight is shoved out of it, into the two squares out of sight.
      // A lorry goes into the tunnel the train runs into, stays there some steps, and comes out of the other
      // arch: so it comes out going the way the train went, turned round in the tunnel if it met the train head on.
      ran = true
      const way: 1 | -1 = train.arch === 'far' ? 1 : -1
      let turned = false
      const shoved: number[] = []
      const hidden = new Set([ROWS, ROWS + 1])
      const inSight = (mover: Mover) => Array.from({ length: LENGTH[mover.kind] }, (_, part) => partAt(mover, part)).some((r) => r < ROWS)
      for (const mover of lane.movers) if (!inSight(mover)) for (let part = 0; part < LENGTH[mover.kind]; part++) hidden.delete(partAt(mover, part))
      lane.movers.forEach((mover, index) => {
        if (mover.kind !== 'car' && mover.kind !== 'lorry') return
        if (!inSight(mover)) return
        if (mover.kind === 'lorry') {
          if (mover.dir !== way) turned = true
          mover.dir = way
          mover.at = way === 1 ? ROWS + 1 : ROWS
          mover.count = SHOVED_STEPS
        } else {
          const free = [...hidden][0] ?? ROWS
          hidden.delete(free)
          mover.at = free
        }
        shoved.push(index)
      })
      // Whatever else rolls in that lane goes the lorry's new way too, so no two meet head on.
      if (turned) for (const mover of lane.movers) {
        if ((mover.kind !== 'car' && mover.kind !== 'lorry') || mover.dir === way) continue
        if (mover.kind === 'lorry') mover.at = way === 1 ? ROWS + 1 : ROWS
        mover.dir = way
      }
      for (let r = 0; r < ROWS; r++) swept.push({ r, index: -1, kind: 'train' })
      events.push({ type: 'train', col, from: train.arch, shoved })
      train.arch = train.arch === 'far' ? 'near' : 'far'
      train.awake = false
    } else if (rung === 0) events.push({ type: 'snore', col, arch: train.arch })
    if (rung > 0) {
      train.awake = true
      events.push({ type: 'wake', col, arch: train.arch })
    }
  }
  return { swept, ran }
}

export function copyLane(lane: Lane): Lane {
  return {
    kind: lane.kind,
    movers: lane.movers.map((mover) => ({ ...mover })),
    ...(lane.bell ? { bell: { ...lane.bell } } : {}),
    ...(lane.train ? { train: { ...lane.train } } : {}),
  }
}

export function copyPawn(pawn: Pawn): Pawn {
  return { ...pawn, on: pawn.on && { ...pawn.on }, dry: { ...pawn.dry } }
}

/**
 * One step of the board. The rabbit hops as asked, each small one follows the one ahead, and then every lane
 * takes one step of its own: riders are carried, whatever a vehicle rolls onto is flattened where it stands, and
 * a flat pawn whose square has come clear peels itself up. The board handed in is not changed.
 */
export function step(board: Board, hop: Hop): { board: Board; events: BoardEvent[] } {
  const lanes: Lane[] = board.lanes.map(copyLane)
  const family: Pawn[] = board.family.map(copyPawn)
  const next: Board = { lanes, family }
  const events: BoardEvent[] = []
  const before: Square[] = family.map((pawn) => ({ c: pawn.c, r: pawn.r }))
  const wasFlat = family.map((pawn) => pawn.flat)
  const rung = lanes.map(() => 0)

  const spot = (who: number, why: SpotReason) => {
    const pawn = family[who]
    events.push({ type: 'spot', who, at: { c: pawn.c, r: pawn.r }, why })
  }
  const spit = (who: number, from: Square, at: Square, by: 'water' | 'turtle' | 'edge') => {
    const pawn = family[who]
    const to = freeDry(family, pawn.dry, who)
    pawn.c = to.c; pawn.r = to.r; pawn.on = null
    events.push({ type: 'spit', who, from, at, to, by })
  }
  /** The pawn leaves its square for (c, r), which is on the board, no seat and free of the family. In a leapfrog each takes exactly the other's square, so `from` is given and nobody slides along a lorry. */
  const land = (who: number, c: number, r: number, leapFrom?: Square) => {
    const pawn = family[who]
    const from = leapFrom ?? { c: pawn.c, r: pawn.r }
    const lane = lanes[c]
    const ride = moverOn(lane, r)
    if (lane.kind === 'river' && !ride) {
      spit(who, from, { c, r }, 'water')
      return
    }
    // The bed holds one at a time. A landing on the cab of a lorry whose bed is taken slides back off the cab to
    // the square it came from: a hop on the spot, on whatever it stood on.
    if (ride && !leapFrom && ride.part === 0 && lane.movers[ride.index].kind === 'lorry') {
      const bed = partAt(lane.movers[ride.index], 1)
      if (bed < ROWS && inTheWay(next, who, c, bed) >= 0) {
        events.push({ type: 'spot', who, at: { c: pawn.c, r: pawn.r }, why: 'cab', off: { c, r, index: ride.index } })
        return
      }
    }
    pawn.c = c; pawn.r = r; pawn.on = null
    let landing: Landing = lane.kind === 'river' ? 'log' : lane.kind === 'railroad' ? 'rails' : lane.kind
    let cab = false
    if (ride) {
      const mover = lane.movers[ride.index]
      pawn.on = ride
      if (mover.kind === 'car') landing = 'roof'
      else if (mover.kind === 'turtle') landing = 'shell'
      else if (mover.kind === 'log') landing = 'log'
      else {
        landing = 'bed'
        // A landing on the cab slides back onto the bed, where the bed shows. (A taken bed was met above.)
        const bed = partAt(mover, 1)
        if (!leapFrom && ride.part === 0 && bed < ROWS) {
          pawn.on = { index: ride.index, part: 1 }
          pawn.r = bed
          cab = true
        }
      }
    } else if (isDry(lane.kind)) pawn.dry = { c, r }
    const mover = ride ? { c, r: partAt(lane.movers[ride.index], 0), index: ride.index } : undefined
    events.push({ type: 'hop', who, from, to: { c: pawn.c, r: pawn.r }, landing, ...(mover ? { mover } : {}), ...(leapFrom ? { leap: true } : {}), ...(cab ? { cab: true } : {}) })
    const rails = ride ? -1 : plateAt(lanes, c, r)
    if (rails >= 0) {
      rung[rails] += 1
      events.push({ type: 'bell', who, at: { c, r }, col: rails, nth: who + 1 })
    }
  }

  // The rabbit.
  let leapt = -1, shot = -1
  const rabbit = family[0]
  if (rabbit.flat) events.push({ type: 'stuck', who: 0, at: { c: rabbit.c, r: rabbit.r } })
  else if (hop.dc === 0 && hop.dr === 0) spot(0, 'self')
  else {
    const c = rabbit.c + hop.dc, r = rabbit.r + hop.dr
    const there = onBoard(c, r) ? inTheWay(next, 0, c, r) : -1
    if (!onBoard(c, r)) spot(0, 'rim')
    else if (isSeat(c, r)) spot(0, lanes[c].kind === 'bank' ? 'burrow' : 'seat')
    else if (there >= 0) {
      // A leapfrog: she takes the small one's square and it takes hers, each on whatever the other stood on.
      // One that lay flat there shoots out from under her and is up again where it lands.
      const small = family[there], from = { c: rabbit.c, r: rabbit.r }
      const lay = small.flat
      small.c = -1
      small.flat = false
      land(0, c, r, from)
      land(there, from.c, from.r, { c, r })
      if (lay) shot = there
      leapt = there
    } else land(0, c, r)
  }
  const stayed = rabbit.c === before[0].c && rabbit.r === before[0].r

  // The small ones, each after the one ahead of it.
  for (let who = 1; who < family.length; who++) {
    const pawn = family[who], ahead = family[who - 1], left = before[who - 1]
    if (who === leapt) continue
    if (pawn.flat) {
      events.push({ type: 'stuck', who, at: { c: pawn.c, r: pawn.r } })
      continue
    }
    // Standing still: on the spot, unless the line is making room on the cloth.
    const still = (why: SpotReason) => {
      if (rabbit.c === CLOTH_COL && family.some((one) => one.c !== CLOTH_COL)) {
        const outward = Math.sign(pawn.r - rabbit.r) || 1
        const to = pawn.c === CLOTH_COL ? { c: CLOTH_COL, r: pawn.r + outward } : { c: CLOTH_COL, r: pawn.r }
        if (Math.abs(to.c - pawn.c) + Math.abs(to.r - pawn.r) === 1 && mayFollow(next, who, to.c, to.r)) {
          land(who, to.c, to.r)
          return
        }
      }
      spot(who, why)
    }
    const moved = ahead.c !== left.c || ahead.r !== left.r
    const reach = Math.abs(left.c - pawn.c) + Math.abs(left.r - pawn.r)
    if (reach === 1) {
      // In line: into the square the one ahead has just left, but never into open water.
      if (!moved || inTheWay(next, who, left.c, left.r) >= 0) still('wait')
      else if (isOpenWater(lanes, left.c, left.r)) spot(who, 'dither')
      else land(who, left.c, left.r)
      continue
    }
    // Fallen behind: one square towards the one ahead, the longer way first.
    const dc = Math.sign(ahead.c - pawn.c), dr = Math.sign(ahead.r - pawn.r)
    if (Math.abs(ahead.c - pawn.c) + Math.abs(ahead.r - pawn.r) <= 1) {
      still('wait')
      continue
    }
    const acrossFirst = Math.abs(ahead.c - pawn.c) >= Math.abs(ahead.r - pawn.r)
    const ways: Square[] = []
    if (dc !== 0) ways.push({ c: pawn.c + dc, r: pawn.r })
    if (dr !== 0) ways[acrossFirst ? 'push' : 'unshift']({ c: pawn.c, r: pawn.r + dr })
    const way = ways.find((to) => mayFollow(next, who, to.c, to.r))
    if (way) land(who, way.c, way.r)
    else spot(who, 'dither')
  }

  // Every lane takes its step, and carries what rides it.
  const swept: { c: number; r: number; index: number; kind: Flattener }[] = []
  const ran = lanes.map(() => false)
  for (let c = 0; c < COLS; c++) {
    const did = stepLane(lanes[c], c, rung[c], events)
    for (const one of did.swept) swept.push({ c, ...one })
    ran[c] = did.ran
  }
  // First those who stay aboard, then those who are carried off the board, who need to know where the others are.
  const off: number[] = [], shells: number[] = []
  for (let who = 0; who < family.length; who++) {
    const pawn = family[who]
    if (!pawn.on) continue
    const lane = lanes[pawn.c], mover = lane.movers[pawn.on.index]
    const from = { c: pawn.c, r: pawn.r }
    if (ran[pawn.c]) {
      // The train took the lane and whatever stood in it, on a roof or a bed or not. One that rode over a flat
      // one is laid down on the nearest square of the lane that is free.
      pawn.on = null
      for (let reach = 1; reach < ROWS && pawnAt(family, pawn.c, pawn.r, who) >= 0; reach++) {
        for (const r of [from.r - reach, from.r + reach]) if (r >= 0 && r < ROWS && pawnAt(family, pawn.c, r, who) < 0 && pawnAt(family, pawn.c, pawn.r, who) >= 0) pawn.r = r
      }
      continue
    }
    if (mover.kind === 'car') {
      pawn.on = null
      events.push({ type: 'slideOff', who, at: from })
      continue
    }
    if (mover.kind === 'turtle') {
      shells.push(who)
      continue
    }
    const r = partAt(mover, pawn.on.part)
    if (r < ROWS) {
      pawn.r = r
      events.push({ type: 'carry', who, from, to: { c: pawn.c, r }, kind: mover.kind })
    } else off.push(who)
  }
  // One on a turtle: a log that has come over it scoops it up, unless somebody rides that end of the log already; a turtle that has gone under takes it down.
  for (const who of shells) {
    const pawn = family[who], lane = lanes[pawn.c]
    const from = { c: pawn.c, r: pawn.r }
    const log = logOn(lane, pawn.r)
    if (log && pawnAt(family, pawn.c, pawn.r, who) < 0) {
      pawn.on = log
      events.push({ type: 'scoop', who, at: from, index: log.index })
    } else if (log || lane.movers[pawn.on!.index].count === 2) spit(who, from, from, log ? 'water' : 'turtle')
  }
  for (const who of off) {
    const pawn = family[who]
    const mover = lanes[pawn.c].movers[pawn.on!.index]
    const from = { c: pawn.c, r: pawn.r }
    if (mover.kind === 'log') {
      spit(who, from, { c: pawn.c, r: mover.dir === 1 ? ROWS - 1 : 0 }, 'edge')
    } else {
      // The arch knocks it off: onto the last square of the lane, or the nearest free one behind it.
      pawn.on = null
      const edge = mover.dir === 1 ? ROWS - 1 : 0
      let to = edge
      while (pawnAt(family, pawn.c, to, who) >= 0 && to - mover.dir >= 0 && to - mover.dir < ROWS) to -= mover.dir
      pawn.r = to
      const under = moverOn(lanes[pawn.c], to)
      if (under) pawn.on = under
      events.push({ type: 'knock', who, from, to: { c: pawn.c, r: to } })
    }
  }

  // Whatever a vehicle rolled onto is flat where it stands, and a flat pawn whose square is clear peels itself up.
  for (let who = 0; who < family.length; who++) {
    const pawn = family[who]
    if (pawn.on || !isHard(lanes[pawn.c].kind)) continue
    const by = swept.find((s) => s.c === pawn.c && s.r === pawn.r)
    if (by && !pawn.flat) {
      pawn.flat = true
      events.push({ type: 'flatten', who, at: { c: pawn.c, r: pawn.r }, col: by.c, index: by.index, kind: by.kind })
    } else if (pawn.flat && wasFlat[who] && !by && !moverOn(lanes[pawn.c], pawn.r)) {
      pawn.flat = false
      events.push({ type: 'peel', who, at: { c: pawn.c, r: pawn.r } })
    }
  }
  // The one that shot out from under a leapfrog is up again where it landed, unless something rolled onto it there.
  if (shot >= 0 && !family[shot].flat) events.push({ type: 'peel', who: shot, at: { c: family[shot].c, r: family[shot].r } })

  // The fish, who keeps beside her: it noses the log she rides while she hops on the spot, and comes nearer under the waves while she hops on the spot beside its river.
  if (stayed && !rabbit.flat && !events.some((event) => event.type === 'spit' && event.who === 0)) {
    const riding = rabbit.on && lanes[rabbit.c].kind === 'river'
    if (riding && lanes[rabbit.c].movers[rabbit.on!.index].kind === 'log') events.push({ type: 'nose', col: rabbit.c, index: rabbit.on!.index })
    else if (!riding) {
      const beside = [rabbit.c + 1, rabbit.c - 1].find((c) => c >= 0 && c < COLS && lanes[c].kind === 'river')
      if (beside !== undefined) events.push({ type: 'blip', col: beside })
    }
  }
  return { board: next, events }
}

/** Whether two of the family stand on one square, or one stands where nobody can: what no step may leave behind. */
export function faults(board: Board): string[] {
  const found: string[] = []
  board.family.forEach((pawn, who) => {
    if (!onBoard(pawn.c, pawn.r)) found.push(`pawn ${who} is off the board`)
    else if (isSeat(pawn.c, pawn.r)) found.push(`pawn ${who} is on a seat`)
    else if (board.lanes[pawn.c].kind === 'river' && !pawn.on) found.push(`pawn ${who} stands on open water`)
    // Two on one square are a flat one under a lorry and one riding its bed, and nothing else.
    const other = pawnAt(board.family, pawn.c, pawn.r, who)
    if (other > who && !(pawn.flat !== board.family[other].flat && (pawn.flat ? board.family[other].on : pawn.on))) found.push(`pawn ${who} shares a square`)
    if (pawn.on) {
      const mover = board.lanes[pawn.c]?.movers[pawn.on.index]
      if (!mover || pawn.on.part >= LENGTH[mover.kind] || partAt(mover, pawn.on.part) !== pawn.r) found.push(`pawn ${who} rides nothing`)
      else if (mover.kind === 'turtle' && mover.count === 2) found.push(`pawn ${who} rides a turtle that is under`)
    }
    if (pawn.flat && (pawn.on || !isHard(board.lanes[pawn.c]?.kind))) found.push(`pawn ${who} is flat off the road`)
  })
  return found
}

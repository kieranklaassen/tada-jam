import { chambers, kingdom } from './chambers'
import { EARTH, MOUTH, MUD, OPEN, ROCK, SAND, STONE, at, clone, isLump, put, settle, type Ground, type Kind, type Lump } from './ground'
import { DUNG_BALL, HABITS, PUSHERS_IN_A_LINE, type InvaderKind, type Shot } from './habits'
import type { Party } from './order'
import { queenSeat, workerSpots } from './residents'
import { bodyCells, chamberCells, entries, farFromChambers, nearestTo, reach, roomCells, roomOf, sticks, wallToLeanOn, wayIn, wayTo, type Lean, type Walker } from './routes'
import { HOLD, holdOfCell, lean } from './walls'

// A raid: the party at the log comes into a copy of the nest and each invader goes by its habits. Pure and on
// game time alone, a fixed step at a time, with no chance in it: the same party against the same nest plays the
// same way every time, so that changing one thing and calling it again shows what that one thing did. The nest
// as built is never touched: what a raid knocks down is knocked down in the copy.
//
// One invader acts in a chamber at a time. Another that reaches the door of a chamber where one is waits there,
// and those behind it wait behind it, each a body's length back. The dung fly, who leads from the air, takes
// nobody's place and waits for nobody.

/** Seconds of game time in one step of a raid. */
export const TICK = 1 / 20
/** How fast each kind goes, in cells a second, and how much faster it goes home. */
export const SPEED: Record<InvaderKind, number> = { ant: 9, beetle: 5.5, fly: 8, dungBeetle: 4.5, dungFly: 7 }
export const HOME_FASTER = 1.6
/** Seconds between one invader of a party coming in and the next leaving the log, and before the first. */
export const APART = 0.7
/** A raid that has not ended by itself by now is ended: everyone still inside sits down where they are. */
export const LONGEST = 200
/** How long an invader that is stuck or held is left to be seen, once nothing else is going to happen, before the raid is over. */
export const SEEN_FOR = 2
/** How many places behind one that waits the next one waits: a body's length, so that nobody stands in anybody. */
export const QUEUE_GAP = 5
/** Seconds a dung ball takes to dig one cell of its way wider. */
export const DIG = 0.3
/** Seconds a rolling stone takes from one cell to the next. */
export const ROLL = 0.09
/** How many of the places it was last in an invader remembers. */
export const WAKE = 5
/** How many more steps a dung beetle takes once the army has lost its way, and how long it then stands wondering. */
export const LOST_STEPS = 3
export const WONDERS = 1.5

export type InvaderState =
  /** At the log, or walking from it to the mouth. */
  | 'coming'
  /** On its way, or looking for one. */
  | 'going'
  /** At the door of a chamber where another is, or behind one who waits. */
  | 'waiting'
  /** A dung beetle whose way is too narrow for its ball: it digs the way wider, or heaves at what it cannot dig. */
  | 'widening'
  /** Leaning on a wall that holds. */
  | 'straining'
  /** Stuck in mud, for good. */
  | 'stuck'
  /** Doing its own act in a chamber. */
  | 'acting'
  /** Bewildered by a shot, for a moment. */
  | 'dazed'
  /** At something it cannot pass, making up its mind to go. */
  | 'givingUp'
  /** Trudging home. */
  | 'leaving'
  /** Held where it is until the workers free it when the raid is over: balled in mud, or at the foot of a drop it cannot climb. */
  | 'held'
  /** Back at the camp. */
  | 'home'

export type Invader = {
  id: number
  kind: InvaderKind
  state: InvaderState
  /**
   * The place it is in, the one it is on its way to, and how far it is between them, from 0 to 1. Standing, it is
   * on its way nowhere: `toward` is `cell`. `from` is the place it was in before this one. All -1 before it has come in.
   */
  cell: number
  from: number
  toward: number
  along: number
  /** Which way it faces along the row. */
  facing: -1 | 1
  /** Seconds left in a state that waits. */
  wait: number
  /** The way it is on, and where it is on it. */
  way: number[]
  step: number
  /** Every place it has been, for the way home. */
  trail: number[]
  /** The wall it leans on. */
  leaning: Lean | null
  /** It finished its own act in a chamber. */
  acted: boolean
  /** It has touched a chamber and is on its way to where it does its act. */
  insideSince: boolean
  /** The chamber it has taken for itself, counted from 1: nobody else comes in while it has it. 0 for none. */
  room: number
  /** The place it chose for its act, or -1. */
  spot: number
  /** What it does when it stops being dazed, and the last shot that hit it. */
  after: 'going' | 'leaving'
  lastShot: Shot | null
  /** The name of the answer to the last shot, for the view. */
  answer: string | null
  /** How many cells across the dung ball it rolls is: 0 for none. */
  ball: number
  /** Seconds it has heaved at something its ball cannot pass and it cannot dig. */
  jammed: number
  /** The steps it has left once the army has lost its way; -1 while it has not, -2 once it has turned for home. */
  lostIn: number
  /** It has stopped to wait and has not moved on since. */
  queued: boolean
  /** The last few places it was in, the latest first, since it last turned: where a dung beetle walks behind its ball. */
  wake: number[]
}

export type RaidEvent =
  | { type: 'in'; id: number; kind: InvaderKind }
  | { type: 'inside'; id: number; kind: InvaderKind; cell: number }
  | { type: 'waits'; id: number; kind: InvaderKind }
  | { type: 'stuck'; id: number; cell: number }
  | { type: 'strain'; id: number; cell: number }
  /** A wall gave: these cells of the copy changed. */
  | { type: 'gave'; id: number; cells: number[] }
  /** A dung ball dug its way wider: these cells of the copy changed. */
  | { type: 'widened'; id: number; cells: number[] }
  /** A dung beetle gave up its ball and goes on as a plain beetle. */
  | { type: 'leftBall'; id: number; cell: number }
  /** A stone that was shoved or knocked rolls along a floor: it has just rolled into this cell. */
  | { type: 'rolled'; cell: number }
  /** A rolling stone was stopped in this cell by what lies beyond it: sand, mud, another stone, or the ground itself. */
  | { type: 'stopped'; cell: number; by: Kind }
  /** The dung fly is down: every dung beetle loses its way. */
  | { type: 'lost' }
  /** One begins its own act in a chamber; `queens` says it is the queen's own room. */
  | { type: 'acts'; id: number; kind: InvaderKind; queens: boolean }
  | { type: 'acted'; id: number; kind: InvaderKind }
  | { type: 'givesUp'; id: number; kind: InvaderKind }
  | { type: 'held'; id: number; kind: InvaderKind }
  | { type: 'hit'; id: number; kind: InvaderKind; shot: Shot; answer: string }
  | { type: 'home'; id: number; kind: InvaderKind }
  | { type: 'over' }

export type Raid = {
  /** The copy of the nest the raid runs on. */
  ground: Ground
  invaders: Invader[]
  /** Seconds of game time played. */
  time: number
  /** The chambers of the kingdom as the raid was called. */
  chambersWhenCalled: number
  /** The invaders that finished their own act in a chamber. */
  acts: number
  /** The cells where a wall gave or a lump fell: the places that stay readable until the next raid. */
  gave: Set<number>
  /** The places where an ant is stuck in mud: the next walks over its back. */
  covered: Set<number>
  /** The dung balls that were left where they lay: the place each lies in, how many cells across it is, and the way it was rolled there. */
  balls: { cell: number; size: number; trail: number[] }[]
  /** The stones that are rolling: the cell each is in, which way it rolls, and the seconds until its next cell. */
  rolling: { cell: number; dx: number; wait: number }[]
  /** The dung fly is in the nest and up: a ball that meets soft ground digs on. */
  led: boolean
  /** The dung fly was brought down: the army has lost its way. */
  lost: boolean
  /** The kinds one of whom has begun its act in this raid: a later one of the same kind does a short one. */
  begun: InvaderKind[]
  over: boolean
  /** How long nothing more has been going to happen. */
  settled: number
  events: RaidEvent[]
  /** Raised whenever the copy changes, so every way is looked for again. */
  changes: number
  /** The cells of the kingdom's chambers as the raid was called, 1 or 0 a cell. */
  inside: Uint8Array
  /** For every cell, the chamber it is in, counted from 1; 0 for none. */
  rooms: Uint8Array
  /** The chamber the queen lives in, counted from 1; 0 while she has none. */
  queenRoom: number
  far: Int32Array
  /** Where the kingdom's own stand: along a floor row, the middle and half the width of each, in cells. An act is done clear of them where there is room. */
  keepClear: { y: number; x: number; half: number }[]
  /** The columns of the mouth. */
  mouth: readonly number[]
}

/**
 * How each one gets about: the dung fly as a fly; a dung beetle behind its ball wherever a way is open at all,
 * making room for the ball as it goes; a dung beetle that has left its ball as a plain beetle.
 */
export const gaitOf = (invader: { kind: InvaderKind; ball: number }): Walker =>
  invader.kind === 'ant' ? 'ant' : invader.kind === 'fly' || invader.kind === 'dungFly' ? 'fly' : invader.ball > 0 ? 'crawler' : 'beetle'
/** A walker that goes along floors, drops, and gets up one cell: a beetle, and a dung beetle behind its ball. */
const plods = (gait: Walker) => gait === 'beetle' || gait === 'crawler'

const settledState = (state: InvaderState) => state === 'home' || state === 'held' || state === 'stuck'

/** Where the queen and the workers stand in this ground, as spans of floor. */
function residents(ground: Ground, mouth: readonly number[]): Raid['keepClear'] {
  const realm = kingdom(ground, mouth)
  const out: Raid['keepClear'] = []
  const seat = queenSeat(ground, realm.chambers, realm.queenRoom)
  if (seat) out.push({ y: seat.y, x: seat.x, half: 2.2 * seat.fit })
  // The workers huddle while a raid runs: those of the queen's room stand behind her and take no floor of their own.
  for (const spot of workerSpots(ground, realm.chambers, realm.queenRoom, realm.workers, true)) {
    if (!seat || spot.y !== seat.y || Math.abs(spot.x - seat.x) > 2.2) out.push({ y: spot.y, x: spot.x, half: 1.5 })
  }
  return out
}

/** Calls the party in. The raid runs on a copy of `built`, which is not changed. */
export function callRaid(built: Ground, party: Party, mouth: readonly number[] = MOUTH): Raid {
  const ground = clone(built)
  const inside = chamberCells(ground, mouth)
  const invaders: Invader[] = party.map((kind, id) => ({
    id, kind, state: 'coming', cell: -1, from: -1, toward: -1, along: 0, facing: 1, wait: APART,
    way: [], step: 0, trail: [], leaning: null, acted: false, insideSince: false, room: 0, spot: -1, after: 'going', lastShot: null, answer: null,
    ball: kind === 'dungBeetle' ? DUNG_BALL.across : 0, jammed: 0, lostIn: -1, queued: false, wake: [],
  }))
  return {
    ground, invaders, time: 0, chambersWhenCalled: chambers(ground, mouth).length, acts: 0, gave: new Set(), covered: new Set(), balls: [], rolling: [],
    led: false, lost: false, begun: [], over: false, settled: 0, events: [], changes: 0, inside, rooms: roomCells(ground, mouth), far: farFromChambers(ground, inside),
    queenRoom: (kingdom(ground, mouth).queenRoom ?? -1) + 1, keepClear: residents(ground, mouth), mouth,
  }
}

/**
 * The copy changed: every way is looked for again. `gave` says a wall gave there, which stays readable. The
 * chambers stay the ones the kingdom had as the raid was called: nothing a raid shoves or digs makes a new one.
 */
function changed(raid: Raid, cells: readonly number[], gave = true): void {
  if (gave) for (const cell of cells) raid.gave.add(cell)
  raid.changes++
  for (const invader of raid.invaders) {
    if (invader.state === 'going' || invader.state === 'straining' || invader.state === 'waiting' || invader.state === 'widening') {
      invader.way = []
      if (invader.state !== 'straining') invader.state = 'going'
    }
  }
}

function setOff(invader: Invader, way: number[]): void {
  invader.way = way
  invader.step = 0
}

/** Sends an invader home by the places it came through, last first. Where it once dropped further than it can climb, it stops and is held. */
function sendHome(invader: Invader): void {
  invader.state = 'leaving'
  invader.wake = []
  invader.spot = -1
  invader.leaning = null
  const back = invader.trail.slice().reverse()
  if (back[0] !== invader.cell) back.unshift(invader.cell)
  setOff(invader, back)
}

/** How hard the wall this one leans on is pushed: a dung ball pushes as itself, a plain beetle as one of a line, the three strongest together. */
function pushOn(raid: Raid, invader: Invader): number {
  const wall = invader.leaning
  if (!wall) return 0
  const pushes: number[] = []
  for (const other of raid.invaders) {
    if (other.state !== 'straining' || !other.leaning || other.leaning.x !== wall.x || other.leaning.y !== wall.y || other.leaning.dx !== wall.dx) continue
    pushes.push(other.ball > 0 ? DUNG_BALL.push : HABITS.beetle.push)
  }
  pushes.sort((a, b) => b - a)
  return pushes.slice(0, PUSHERS_IN_A_LINE).reduce((sum, push) => sum + push, 0)
}

/** How far into a chamber a walker goes before it does its act, in steps of its own, at most. */
export const INTO_THE_ROOM = 6
/** How far in it goes at most, where every nearer place has someone standing or sitting in it. */
export const FURTHER_IN = 14
/** Half the length of each kind along a floor, in cells. */
const HALF: Record<Walker, number> = { ant: 2.1, beetle: 2.2, fly: 2.1, crawler: 2.2 }

/**
 * Where an invader that has just come inside does its act: a place on a floor of the chamber (a flier where it
 * hangs), within a few steps, clear of the queen and the workers where the floor has room for that, and then as
 * far in as it gets. Where nothing is clear of everyone, a place clear of the kingdom's own comes first, and of
 * those the clearest.
 */
function actSpot(raid: Raid, invader: Invader): number {
  const { ground } = raid, cols = ground.cols, gait = gaitOf(invader)
  const found = reach(ground, gait, invader.cell)
  const steps = new Int32Array(ground.cells.length)
  let best = invader.cell, bestClear = -Infinity, bestSteps = 0, bestOwn = false
  for (const cell of found.order) {
    if (cell !== invader.cell) steps[cell] = steps[found.from[cell]] + 1
    // Further in than that it goes only to get clear of someone it would otherwise stand in.
    if (steps[cell] > (bestClear < 0 ? FURTHER_IN : INTO_THE_ROOM)) break
    if (roomOf(ground, gait, cell, raid.rooms) !== invader.room) continue
    const x = cell % cols, y = Math.floor(cell / cols)
    // A walker does its act on a floor; a flier where it hangs.
    if (gait !== 'fly' && at(ground, x, y + 1) === OPEN) continue
    if (gait === 'ant' && sticks(ground, x, y, raid.covered)) continue
    // How clear of the kingdom's own it stands there: half a cell and more counts as clear, and no clearer.
    const middle = x + (gait === 'fly' ? 1 : 0.5)
    let clear = 0.5
    for (const one of raid.keepClear) if (one.y === y) clear = Math.min(clear, Math.abs(middle - one.x) - one.half - HALF[gait])
    // It stands in nobody of the kingdom wherever the floor has such a place at all: that comes before all else.
    const own = clear >= 0
    // And of anyone who sits where it is for the rest of the raid.
    for (const other of raid.invaders) {
      if (other === invader || other.cell < 0 || (other.state !== 'held' && other.state !== 'stuck') || Math.floor(other.cell / cols) !== y) continue
      const othersGait = gaitOf(other)
      clear = Math.min(clear, Math.abs(middle - ((other.cell % cols) + (othersGait === 'fly' ? 1 : 0.5))) - HALF[othersGait] - HALF[gait])
    }
    if (steps[cell] > INTO_THE_ROOM && clear < 0) continue
    if ((own && !bestOwn) || (own === bestOwn && (clear > bestClear || (clear === bestClear && clear >= 0.5 && steps[cell] > bestSteps)))) {
      best = cell
      bestClear = clear
      bestSteps = steps[cell]
      bestOwn = own
    }
  }
  invader.spot = best
  return best
}

/** Whether someone else has this chamber: one who is in it, or on the step into it, and is going to leave it by itself. */
function taken(raid: Raid, room: number, but: Invader): boolean {
  for (const other of raid.invaders) if (other !== but && other.room === room && !settledState(other.state)) return true
  return false
}

/**
 * Whether one who waits stands within a body's length ahead on this way. Only those who left the log earlier
 * count, so that no two ever wait for each other.
 */
function queueAhead(raid: Raid, invader: Invader, way: readonly number[], from: number): boolean {
  for (const other of raid.invaders) {
    if (other.id >= invader.id || other.kind === 'dungFly' || (other.state !== 'waiting' && other.state !== 'widening')) continue
    for (let n = from; n < way.length && n < from + QUEUE_GAP; n++) if (way[n] === other.cell) return true
  }
  return false
}

/** It stops to wait where it is, and says so once. */
function waitHere(raid: Raid, invader: Invader): void {
  invader.state = 'waiting'
  if (invader.queued) return
  invader.queued = true
  raid.events.push({ type: 'waits', id: invader.id, kind: invader.kind })
}

/** Whether one who sits held on the ground is within a body's length ahead on this one's way home. */
function heldAhead(raid: Raid, invader: Invader): boolean {
  for (const other of raid.invaders) {
    if (other === invader || other.state !== 'held' || gaitOf(other) === 'fly') continue
    for (let n = invader.step + 1; n < invader.way.length && n <= invader.step + QUEUE_GAP; n++) if (invader.way[n] === other.cell) return true
  }
  return false
}

/** The shortest way for it into a chamber nobody else has, when there is one; otherwise into the nearest chamber. */
function wayToARoom(raid: Raid, invader: Invader, gait: Walker): number[] | null {
  const { ground } = raid
  if (invader.kind === 'dungFly') return wayIn(ground, gait, invader.cell, raid.inside)
  const found = reach(ground, gait, invader.cell)
  let nearest = -1
  for (const cell of found.order) {
    const room = roomOf(ground, gait, cell, raid.rooms)
    if (room === 0) continue
    if (nearest < 0) nearest = cell
    if (room === invader.room || !taken(raid, room, invader)) return wayTo(found, cell)
  }
  return nearest < 0 ? null : wayTo(found, nearest)
}

/** An invader that stands still and is free to choose looks for what to do next. */
function decide(raid: Raid, invader: Invader): void {
  const { ground } = raid, gait = gaitOf(invader)
  // One of an army that has lost its way goes no further.
  if (invader.lostIn > 0) {
    invader.lostIn = 0
    invader.state = 'going'
    return
  }
  const room = roomOf(ground, gait, invader.cell, raid.rooms)
  if (room !== 0) {
    // The dung fly leads from the air and takes no chamber; anyone else has it alone, or waits.
    if (invader.kind !== 'dungFly') {
      if (invader.room !== room && taken(raid, room, invader)) {
        waitHere(raid, invader)
        return
      }
      invader.room = room
    }
    // It is inside from the first cell of a chamber it touches. It then goes on, well into the room, and does
    // its act there: a walker on the floor, a flier in the air.
    if (!invader.insideSince) {
      invader.insideSince = true
      raid.events.push({ type: 'inside', id: invader.id, kind: invader.kind, cell: invader.cell })
      if (invader.kind === 'dungFly') invader.room = room
      const spot = actSpot(raid, invader)
      if (invader.kind === 'dungFly') invader.room = 0
      if (spot !== invader.cell) {
        invader.state = 'going'
        setOff(invader, wayTo(reach(ground, gait, invader.cell), spot))
        return
      }
    }
    // The first of its kind in a raid does its act in full; a later one does the end of it only.
    const act = HABITS[invader.kind].act
    invader.state = 'acting'
    invader.wait = raid.begun.includes(invader.kind) ? act.again : act.seconds
    if (!raid.begun.includes(invader.kind)) raid.begun.push(invader.kind)
    raid.events.push({ type: 'acts', id: invader.id, kind: invader.kind, queens: room === raid.queenRoom })
    return
  }
  invader.insideSince = false
  invader.spot = -1
  invader.state = 'going'
  const way = wayToARoom(raid, invader, gait)
  if (way && way.length > 1) {
    setOff(invader, way)
    return
  }
  const found = reach(ground, gait, invader.cell)
  if (plods(gait)) {
    const wall = wallToLeanOn(ground, found, raid.far)
    if (wall) {
      if (wall.stand !== invader.cell) {
        setOff(invader, wayTo(found, wall.stand))
        return
      }
      invader.leaning = wall
      invader.facing = wall.dx as -1 | 1
      invader.state = 'straining'
      invader.wait = HABITS[invader.kind].patience
      raid.events.push({ type: 'strain', id: invader.id, cell: invader.cell })
      return
    }
  }
  const near = nearestTo(found, raid.far)
  if (near !== invader.cell) {
    setOff(invader, wayTo(found, near))
    return
  }
  invader.state = 'givingUp'
  invader.wait = HABITS[invader.kind].patience
  raid.events.push({ type: 'givesUp', id: invader.id, kind: invader.kind })
}

/** The copy was shoved or dug: it comes to rest, and every cell that changed is told. */
function settleAndTell(raid: Raid, before: Uint8Array, first: readonly number[]): number[] {
  settle(raid.ground)
  const moved = new Set(first)
  for (let i = 0; i < before.length; i++) if (before[i] !== raid.ground.cells[i]) moved.add(i)
  return [...moved]
}

/**
 * A shove moved these cells. A lone stone that was shoved along a floor, with nothing bedding it, rolls on by itself
 * until something stops it.
 */
function startRolling(raid: Raid, moved: readonly number[], dx: number): void {
  const { ground } = raid, cols = ground.cols
  for (const cell of moved) {
    const x = cell % cols, y = Math.floor(cell / cols)
    if (at(ground, x, y) !== STONE || holdOfCell(ground, x, y) !== HOLD.stone) continue
    // The cell it was shoved out of is open behind it, and it lies on something.
    if (at(ground, x - dx, y) !== OPEN || at(ground, x, y + 1) === OPEN) continue
    if (!raid.rolling.some((roller) => roller.cell === cell)) raid.rolling.push({ cell, dx, wait: ROLL })
  }
}

/** The rolling stones roll: one cell on while the way is open, and where it is not, what stops each is told. A stone it strikes rolls on in its place. */
function roll(raid: Raid): void {
  const { ground } = raid, cols = ground.cols
  for (let n = 0; n < raid.rolling.length; n++) {
    const roller = raid.rolling[n]
    roller.wait -= TICK
    if (roller.wait > 0) continue
    roller.wait = ROLL
    const x = roller.cell % cols, y = Math.floor(roller.cell / cols)
    // It is no longer there: it has fallen.
    if (at(ground, x, y) !== STONE || at(ground, x, y + 1) === OPEN) {
      raid.rolling.splice(n--, 1)
      continue
    }
    // Mud has it: it stops dead, bedded, and rolls no more.
    if (holdOfCell(ground, x, y) !== HOLD.stone) {
      raid.events.push({ type: 'stopped', cell: roller.cell, by: MUD })
      raid.rolling.splice(n--, 1)
      continue
    }
    const beyond = at(ground, x + roller.dx, y)
    if (beyond === OPEN) {
      const before = ground.cells.slice()
      put(ground, x, y, OPEN)
      put(ground, x + roller.dx, y, STONE)
      roller.cell += roller.dx
      const moved = settleAndTell(raid, before, [y * cols + x, roller.cell])
      raid.events.push({ type: 'rolled', cell: roller.cell })
      changed(raid, moved)
      continue
    }
    raid.events.push({ type: 'stopped', cell: roller.cell, by: beyond })
    raid.rolling.splice(n--, 1)
    // Clack: the stone it struck rolls on in its place, where it is free and has room.
    const struck = roller.cell + roller.dx
    if (beyond === STONE && holdOfCell(ground, x + roller.dx, y) === HOLD.stone && at(ground, x + 2 * roller.dx, y) === OPEN && at(ground, x + roller.dx, y + 1) !== OPEN) {
      raid.rolling.push({ cell: struck, dx: roller.dx, wait: ROLL })
    }
  }
}

/**
 * A shot knocks the lump in a cell along the row: a free stone rolls one cell on. Gives the cells that changed,
 * none where nothing moved.
 */
export function knockInRaid(raid: Raid, cell: number, dx: number): number[] {
  const cols = raid.ground.cols, x = cell % cols, y = Math.floor(cell / cols)
  if (at(raid.ground, x, y) !== STONE || holdOfCell(raid.ground, x, y) !== HOLD.stone) return []
  const before = raid.ground.cells.slice()
  const did = lean(raid.ground, x, y, dx, HABITS.beetle.push)
  if (did.did !== 'shoved') return []
  const moved = settleAndTell(raid, before, did.cells)
  changed(raid, moved)
  return moved
}

/** Whether a lump of sand or mud is one a dung ball digs: always with earth or rock behind it, and anywhere while the dung fly is up. */
function digsLump(raid: Raid, x: number, y: number, dx: number): boolean {
  const kind = at(raid.ground, x, y)
  if (kind !== SAND && kind !== MUD) return false
  const behind = at(raid.ground, x + dx, y)
  return raid.led || behind === EARTH || behind === ROCK
}

/** A beetle that leans pushes with everyone who leans with it. The wall gives, or it holds until their patience is gone. */
function strain(raid: Raid, invader: Invader): void {
  const wall = invader.leaning!
  const before = raid.ground.cells.slice()
  const did = lean(raid.ground, wall.x, wall.y, wall.dx, pushOn(raid, invader))
  if (did.did === 'shoved' || did.did === 'ploughed') {
    const moved = settleAndTell(raid, before, did.cells)
    for (const other of raid.invaders) {
      if (other.state === 'straining' && other.leaning && other.leaning.x === wall.x && other.leaning.y === wall.y) {
        other.state = 'going'
        other.leaning = null
      }
    }
    raid.events.push({ type: 'gave', id: invader.id, cells: moved })
    changed(raid, moved)
    if (did.did === 'shoved') startRolling(raid, did.cells, wall.dx)
    return
  }
  if (did.did === 'nothing') {
    invader.state = 'going'
    invader.leaning = null
    return
  }
  // A wall that holds a dung ball is dug where it is soft and the ball digs it: this only slows the army.
  if (invader.ball > 0 && digsLump(raid, wall.x, wall.y, wall.dx)) {
    invader.jammed += TICK
    if (invader.jammed >= DIG) {
      invader.jammed = 0
      put(raid.ground, wall.x, wall.y, OPEN)
      const moved = settleAndTell(raid, before, [wall.y * raid.ground.cols + wall.x])
      invader.state = 'going'
      invader.leaning = null
      raid.events.push({ type: 'widened', id: invader.id, cells: moved })
      changed(raid, moved)
    }
    return
  }
  invader.wait -= TICK
  if (invader.wait <= 0) {
    invader.state = 'givingUp'
    invader.wait = 1
    invader.leaning = null
    raid.events.push({ type: 'givesUp', id: invader.id, kind: invader.kind })
  }
}

/**
 * The cells a dung ball needs open to be rolled from a place to the next, beyond the one the way has there: the
 * rows over it up to the ball's height, and where the way drops, a cell either side all the way down.
 * Gives those that are not open.
 */
export function ballNeeds(ground: Ground, ball: number, cell: number, next: number, out: number[]): number {
  const cols = ground.cols
  const y = Math.floor(cell / cols), nx = next % cols, ny = Math.floor(next / cols)
  let n = 0
  const need = (cx: number, cy: number) => {
    if (cx < 0 || cx >= cols || cy < 0 || cy >= ground.rows) return
    if (ground.cells[cy * cols + cx] !== OPEN) out[n++] = cy * cols + cx
  }
  for (let k = 1; k < ball; k++) need(nx, ny - k)
  for (let row = y + 1; row <= ny; row++) {
    need(nx - 1, row)
    need(nx + 1, row)
  }
  return n
}

const needs: number[] = []

/** A dung beetle whose ball does not fit the next place digs what it can, heaves at what it cannot, and in the end leaves the ball and goes on without it. */
function widen(raid: Raid, invader: Invader): void {
  const { ground } = raid, cols = ground.cols
  const next = invader.way[invader.step + 1]
  if (next === undefined || invader.ball === 0) {
    invader.state = 'going'
    return
  }
  const n = ballNeeds(ground, invader.ball, invader.cell, next, needs)
  if (n === 0) {
    invader.state = 'going'
    invader.jammed = 0
    return
  }
  invader.wait -= TICK
  if (invader.wait > 0) return
  invader.wait = DIG
  const dx = (next % cols) - (invader.cell % cols) >= 0 ? 1 : -1
  const before = ground.cells.slice()
  // The lowest cell first: earth always, and a lump where the ball digs lumps.
  let dug = -1, wall = -1
  for (let i = 0; i < n; i++) {
    const cell = needs[i], x = cell % cols, y = Math.floor(cell / cols), kind = at(ground, x, y)
    if (kind === EARTH || digsLump(raid, x, y, x !== next % cols ? x - (next % cols) : dx)) {
      if (dug < 0 || cell > dug) dug = cell
    } else if (isLump(kind) && (wall < 0 || cell > wall)) wall = cell
  }
  if (dug >= 0) {
    put(ground, dug % cols, Math.floor(dug / cols), OPEN)
    const moved = settleAndTell(raid, before, [dug])
    invader.jammed = 0
    raid.events.push({ type: 'widened', id: invader.id, cells: moved })
    changed(raid, moved)
    return
  }
  if (wall >= 0) {
    // A lump over the way is leaned on along the way; one beside a drop is leaned on outwards, away from the drop.
    const beside = (wall % cols) - (next % cols)
    const did = lean(ground, wall % cols, Math.floor(wall / cols), beside !== 0 ? beside : dx, DUNG_BALL.push)
    if (did.did === 'shoved' || did.did === 'ploughed') {
      const moved = settleAndTell(raid, before, did.cells)
      invader.jammed = 0
      raid.events.push({ type: 'gave', id: invader.id, cells: moved })
      changed(raid, moved)
      if (did.did === 'shoved') startRolling(raid, did.cells, beside !== 0 ? beside : dx)
      return
    }
  }
  // Stone it cannot shove, or the rock itself: the ball is jammed. The beetle heaves, then leaves it and walks on.
  if (invader.jammed === 0) raid.events.push({ type: 'strain', id: invader.id, cell: invader.cell })
  invader.jammed += DIG
  if (invader.jammed >= HABITS.dungBeetle.patience) leaveBall(raid, invader)
}

/** A dung beetle gives up its ball where it stands and goes on as a plain beetle. */
function leaveBall(raid: Raid, invader: Invader): void {
  if (invader.ball === 0) return
  raid.balls.push({ cell: invader.cell, size: invader.ball, trail: invader.trail.slice() })
  invader.ball = 0
  invader.jammed = 0
  invader.way = []
  if (invader.state === 'widening') invader.state = 'going'
  raid.events.push({ type: 'leftBall', id: invader.id, cell: invader.cell })
}

/** Moves an invader along its way by one step of time. Gives true when it has just arrived in a new place. */
function move(raid: Raid, invader: Invader, speed: number): boolean {
  const next = invader.way[invader.step + 1]
  if (next === undefined) return false
  if (invader.along === 0) {
    invader.toward = next
    const dx = (next % raid.ground.cols) - (invader.cell % raid.ground.cols)
    if (dx !== 0) invader.facing = dx > 0 ? 1 : -1
  }
  // A drop of several cells takes as long as it is deep.
  const cols = raid.ground.cols
  const far = Math.max(1, Math.abs(Math.floor(next / cols) - Math.floor(invader.cell / cols)), Math.abs((next % cols) - (invader.cell % cols)))
  invader.along += (speed * TICK) / far
  if (invader.along < 1) return false
  invader.along = 0
  invader.wake.unshift(invader.cell)
  if (invader.wake.length > WAKE) invader.wake.length = WAKE
  invader.from = invader.cell
  invader.cell = next
  invader.toward = next
  invader.step++
  invader.queued = false
  return true
}

/**
 * The place under the mouth a dung beetle comes down to with its ball, in the middle column: as far down as the
 * shaft is as wide as the ball. Null where the ball does not fit the mouth.
 */
function ballEntry(raid: Raid): { top: number; foot: number } | null {
  const { ground, mouth } = raid, cols = ground.cols
  const x = mouth[Math.floor(mouth.length / 2)]
  const wide = (row: number) => at(ground, x - 1, row) === OPEN && at(ground, x, row) === OPEN && at(ground, x + 1, row) === OPEN
  if (mouth.length < DUNG_BALL.across || !wide(0) || !wide(1)) return null
  let y = 1
  while (y + 1 < ground.rows && wide(y + 1)) y++
  return { top: x, foot: y * cols + x }
}

/** One at the log comes in: at the top of the mouth, and from there to its first place. Gives false while it has to wait at the mouth. */
function comeIn(raid: Raid, invader: Invader): boolean {
  const { ground } = raid, gait = gaitOf(invader)
  let top: number, start: number | null
  const withBall = invader.ball > 0 ? ballEntry(raid) : null
  if (withBall) {
    top = withBall.top
    start = withBall.foot
  } else {
    // Any column of the mouth that is open to it will do: the first from which it finds a way to a chamber, and
    // otherwise the first it can come in by.
    const ways = entries(ground, gait, raid.mouth)
    start = ways.find((cell) => wayIn(ground, gait, cell, raid.inside) !== null) ?? ways[0] ?? null
    top = start === null ? raid.mouth[0] : gait === 'fly' ? start : start % ground.cols
  }
  if (start === null) {
    // The mouth is shut to it: it looks, gives up with a sigh, and goes back to the log.
    raid.events.push({ type: 'givesUp', id: invader.id, kind: invader.kind })
    invader.state = 'home'
    raid.events.push({ type: 'home', id: invader.id, kind: invader.kind })
    return true
  }
  // It does not come down onto one who waits: it waits its turn on the grass at the mouth, in view.
  if (invader.kind !== 'dungFly') {
    const rest = wayIn(ground, gait, start, raid.inside) ?? [start]
    const way = start !== top ? [top, ...rest] : rest
    if (queueAhead(raid, invader, way, 0)) return false
    const first = way[1] ?? way[0]
    const room = roomOf(ground, gait, way[0], raid.rooms) || roomOf(ground, gait, first, raid.rooms)
    if (room !== 0 && way.length <= 2 && taken(raid, room, invader)) return false
  }
  // A ball that does not fit the mouth is left on the grass.
  if (invader.ball > 0 && !withBall) {
    invader.ball = 0
    raid.events.push({ type: 'leftBall', id: invader.id, cell: -1 })
  }
  invader.cell = top
  invader.from = top
  invader.toward = top
  invader.trail = [top]
  invader.state = 'going'
  if (start !== top) setOff(invader, [top, start])
  raid.events.push({ type: 'in', id: invader.id, kind: invader.kind })
  return true
}

/** One step of the raid. */
export function stepRaid(raid: Raid): void {
  if (raid.over) return
  raid.time += TICK
  const { ground } = raid
  const cols = ground.cols
  roll(raid)
  raid.led = !raid.lost && raid.invaders.some((one) => one.kind === 'dungFly' && one.cell >= 0 && one.state !== 'home' && one.state !== 'held' && one.state !== 'leaving')
  for (const invader of raid.invaders) {
    const gait = gaitOf(invader)
    // A chamber is given up by one who has left it, and by one who is not going to leave it by itself.
    if (invader.room !== 0 && (settledState(invader.state) || (invader.along === 0 && roomOf(ground, gait, invader.cell, raid.rooms) !== invader.room))) invader.room = 0
    // The army has lost its way: a dung beetle takes a few more steps, wonders, and rolls home. One that is doing
    // its act finishes it, and one still at the log stays there.
    if (raid.lost && invader.kind === 'dungBeetle' && invader.lostIn !== -2 && !settledState(invader.state)) {
      if (invader.state === 'coming') {
        invader.state = 'home'
        raid.events.push({ type: 'home', id: invader.id, kind: invader.kind })
        continue
      }
      if (invader.state === 'going' || invader.state === 'waiting' || invader.state === 'widening' || invader.state === 'straining') {
        if (invader.lostIn < 0) invader.lostIn = invader.state === 'going' ? LOST_STEPS : 0
        if (invader.state !== 'going') invader.lostIn = 0
        if (invader.lostIn === 0 && invader.along === 0) {
          invader.lostIn = -2
          invader.state = 'givingUp'
          invader.wait = WONDERS
          invader.leaning = null
          raid.events.push({ type: 'givesUp', id: invader.id, kind: invader.kind })
        }
      }
    }
    switch (invader.state) {
      case 'coming': {
        // The next of the file leaves the log once the one before it has come in.
        const before = raid.invaders[invader.id - 1]
        if (before && before.state === 'coming') break
        invader.wait -= TICK
        if (invader.wait > 0) break
        invader.wait = 0
        comeIn(raid, invader)
        break
      }
      case 'waiting':
      case 'going': {
        if (invader.step + 1 >= invader.way.length) {
          decide(raid, invader)
          break
        }
        if (invader.along === 0) {
          const next = invader.way[invader.step + 1]
          if (invader.kind !== 'dungFly') {
            // The door of a chamber another has, or the back of one who waits: it waits where it is.
            const room = roomOf(ground, gait, next, raid.rooms)
            if (room !== 0 && room !== invader.room && taken(raid, room, invader)) {
              // Another chamber that nobody has is worth the walk; with none, it waits at this door.
              const other = wayToARoom(raid, invader, gait)
              const end = other ? roomOf(ground, gait, other[other.length - 1], raid.rooms) : 0
              if (other && other.length > 1 && end !== room && !taken(raid, end, invader)) setOff(invader, other)
              else waitHere(raid, invader)
              break
            }
            if (queueAhead(raid, invader, invader.way, invader.step + 1)) {
              waitHere(raid, invader)
              break
            }
            if (room !== 0) invader.room = room
          }
          invader.state = 'going'
          if (invader.ball > 0 && ballNeeds(ground, invader.ball, invader.cell, next, needs) > 0) {
            invader.state = 'widening'
            invader.wait = DIG
            break
          }
        }
        if (!move(raid, invader, SPEED[invader.kind])) break
        invader.trail.push(invader.cell)
        if (invader.lostIn > 0) invader.lostIn--
        const x = invader.cell % cols, y = Math.floor(invader.cell / cols)
        if (invader.kind === 'ant' && sticks(ground, x, y, raid.covered)) {
          invader.state = 'stuck'
          raid.covered.add(invader.cell)
          raid.events.push({ type: 'stuck', id: invader.id, cell: invader.cell })
        }
        break
      }
      case 'widening':
        widen(raid, invader)
        break
      case 'straining':
        strain(raid, invader)
        break
      case 'acting':
        invader.wait -= TICK
        if (invader.wait <= 0) {
          invader.acted = true
          raid.acts++
          raid.events.push({ type: 'acted', id: invader.id, kind: invader.kind })
          sendHome(invader)
        }
        break
      case 'dazed':
        invader.wait -= TICK
        if (invader.wait <= 0) {
          if (invader.after === 'leaving') sendHome(invader)
          else {
            invader.state = 'going'
            invader.way = []
          }
        }
        break
      case 'givingUp':
        invader.wait -= TICK
        if (invader.wait <= 0) sendHome(invader)
        break
      case 'leaving': {
        const next = invader.way[invader.step + 1]
        if (next === undefined) {
          invader.state = 'home'
          raid.events.push({ type: 'home', id: invader.id, kind: invader.kind })
          break
        }
        // A beetle cannot climb back up a drop of more than one cell: it sits down at its foot and waits for the
        // workers. The next one sits down a body's length behind it, so that each is seen.
        // A raider ant that let go and dropped on its way in cannot climb back through the air either: it goes back
        // as far as the foot of its drop, shrugs, and waits for the workers the same way.
        if ((plods(gait) || gait === 'ant') && invader.along === 0 && (Math.floor(invader.cell / cols) - Math.floor(next / cols) > 1 || heldAhead(raid, invader))) {
          invader.state = 'held'
          raid.events.push({ type: 'held', id: invader.id, kind: invader.kind })
          break
        }
        move(raid, invader, SPEED[invader.kind] * HOME_FASTER)
        break
      }
      case 'stuck':
      case 'held':
      case 'home':
        break
      default:
        invader.state satisfies never
    }
  }
  const done = raid.invaders.every((invader) => settledState(invader.state)) && raid.rolling.length === 0
  // One that is stuck or held is seen for a while where it is; a raid that has all gone home is over at once.
  if (done && raid.invaders.some((invader) => invader.state !== 'home')) raid.settled += TICK
  else raid.settled = done ? SEEN_FOR : 0
  if ((done && raid.settled >= SEEN_FOR) || raid.time >= LONGEST) {
    for (const invader of raid.invaders) if (invader.state !== 'home' && invader.state !== 'stuck') invader.state = 'held'
    raid.over = true
    raid.events.push({ type: 'over' })
  }
}

/** The cells an invader's body is in at a place, its ball's included: what a shot can meet. Gives how many. */
export function bodyOf(raid: Raid, invader: Invader, place: number, out: number[]): number {
  let n = bodyCells(raid.ground, gaitOf(invader), place, out)
  for (let k = 1; k < invader.ball; k++) out[n++] = place - k * raid.ground.cols
  return n
}

/**
 * A shot hits an invader. Nobody is hurt and nobody is removed: by its habits it goes home, is held where it is
 * until the raid is over, or carries on after a moment, thrown back along the way it came.
 */
export function hit(raid: Raid, id: number, shot: Shot): void {
  const invader = raid.invaders[id]
  if (!invader || invader.cell < 0 || invader.state === 'home' || invader.state === 'held' || invader.state === 'leaving' || invader.state === 'coming') return
  const habit = HABITS[invader.kind].shots[shot]
  const again = invader.state === 'dazed' && invader.lastShot === shot && habit.twiceIsHome === true
  const wasStuck = invader.state === 'stuck'
  invader.lastShot = shot
  invader.answer = habit.id
  invader.leaning = null
  invader.jammed = 0
  raid.events.push({ type: 'hit', id, kind: invader.kind, shot, answer: habit.id })
  if (habit.then === 'held') {
    invader.state = 'held'
    raid.events.push({ type: 'held', id, kind: invader.kind })
    return
  }
  if (habit.armyLosesItsWay && !raid.lost) {
    raid.lost = true
    raid.events.push({ type: 'lost' })
  }
  if (habit.ballGrows && invader.ball > 0) invader.ball = Math.min(DUNG_BALL.across + 1, invader.ball + habit.ballGrows)
  if (habit.losesBall) leaveBall(raid, invader)
  // Thrown back along the way it came: a number of places, or to the end of the straight stretch behind it.
  const cols = raid.ground.cols
  let back = habit.back === 'hall' ? 0 : habit.back
  if (habit.back === 'hall') {
    const row = Math.floor(invader.cell / cols)
    while (back + 1 < invader.trail.length && Math.floor(invader.trail[invader.trail.length - 2 - back] / cols) === row) back++
  }
  if (!wasStuck) {
    for (let n = 0; n < back && invader.trail.length > 1; n++) invader.trail.pop()
    invader.from = invader.cell
    invader.cell = invader.trail[invader.trail.length - 1]
    invader.toward = invader.cell
    invader.along = 0
  }
  invader.way = []
  invader.step = 0
  invader.wake = []
  if (invader.room !== 0) invader.room = roomOf(raid.ground, gaitOf(invader), invader.cell, raid.rooms) === invader.room ? invader.room : 0
  if (wasStuck) raid.covered.delete(invader.cell)
  // A ball knocked back to the foot of the shaft rolls out of the mouth, and its beetle after it: that one is home.
  if (invader.ball > 0 && habit.back === 'hall' && invader.trail.length <= 2) {
    invader.state = 'home'
    raid.events.push({ type: 'home', id, kind: invader.kind })
    return
  }
  invader.state = 'dazed'
  invader.wait = Math.max(habit.pause, TICK)
  invader.after = habit.then === 'home' || again ? 'leaving' : 'going'
}

/** A lump lands in the copy during a raid, from a machine: it lies where it lands and the ground comes to rest. */
export function landInRaid(raid: Raid, cell: number, lump: Lump): void {
  const cols = raid.ground.cols
  if (at(raid.ground, cell % cols, Math.floor(cell / cols)) !== OPEN) return
  const before = raid.ground.cells.slice()
  put(raid.ground, cell % cols, Math.floor(cell / cols), lump)
  settle(raid.ground)
  const moved: number[] = []
  for (let i = 0; i < before.length; i++) if (before[i] !== raid.ground.cells[i]) moved.push(i)
  changed(raid, moved, false)
}

/** How the raid ended, for the judging. */
export function endOf(raid: Raid, putAway = false): { chambersWhenCalled: number; actsFinished: number; putAway: boolean } {
  return { chambersWhenCalled: raid.chambersWhenCalled, actsFinished: raid.acts, putAway }
}

/** Plays a raid to its end. For tests and for a raid that must be over at once. */
export function playOut(raid: Raid): Raid {
  while (!raid.over) stepRaid(raid)
  return raid
}

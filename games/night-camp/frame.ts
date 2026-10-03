import type { CamperId, Supply } from './world'

// One frame of the toy, as the view needs it: plain numbers, worked out by
// the toy (toy.ts) and the motion of each character (motion.ts), and drawn by
// the view (look.ts). The view holds no state of its own beyond its cached
// layers, so a frame drawn twice is the same picture.

/** A supply on its rod. */
export type RowFrame = {
  /** How much lies on the rod, in units from the pile: whole pieces for logs, the length of the band for oil and water. */
  length: number
  /** 0 to 1 and a little over: how far the newest log has popped out. Bands ignore it. */
  pop: number
  /** A settling wave on its way back to the pile: where its crest is, in units, and how strong it still is (0 is none). */
  waveAt: number
  wave: number
  /** 0 to 1: how hard the pile is rattling. */
  rattle: number
  /** 0 to 1: the lagging slosh of the band's far end, signed: positive leans forward. */
  slosh: number
  /** Pieces on their way home to the pile, each with the units it left from and 0 to 1 of its hop. */
  flying: readonly { from: number; t: number }[]
  /** Pieces tumbled into a heap past the end of the rod. */
  heap: number
  /** The finger holds this row: its shadow falls further. */
  held: boolean
  /** A piece that was tapped: which one (in units from the pile) and 0 to 1 of its answer; -1 when none. */
  tapped: number
  tap: number
}

/** A camper, in channels the view turns into a pose. What each channel moves is the camper's own. */
export type CamperFrame = {
  /** -1 to 1: breathing, the bag swelling and sinking. */
  breath: number
  /** The head's turn, in radians, from where it rests. */
  head: number
  /** 0 to 1: the camper's own idle act (a page turned, a bobble twitched, a spoon twirled, a feather swayed, ears wiggled). */
  idle: number
  /** 0 to 1: the answer to a poke, over its length. */
  poke: number
}

export type ToyFrame = {
  rows: Record<Supply, RowFrame>
  campers: Record<CamperId, CamperFrame>
  /** The dog: where it is on the surface, which way it faces, its tail from -1 to 1, 0 to 1 of a sniff, and of a poked spin. */
  dog: { x: number; y: number; turn: number; tail: number; sniff: number; trot: number; poke: number }
  /** The frog: its throat from 0 to 1, and 0 to 1 of a hop into the pool and back. */
  frog: { throat: number; hop: number }
  /** The mule: an ear from -1 to 1, its tail, where its head is turned (0 the map, 1 the heap, 2 the sled), 0 to 1 sitting down, 0 to 1 of a poked bray. */
  mule: { ear: number; tail: number; look: number; sit: number; poke: number }
  /** 0 to 1: the kettle's lid rattling, the fire's stones shuffling. */
  kettle: number
  fire: number
  /** The compass needle's turn in radians from where it rests. */
  needle: number
  /** 0 to 1: a tent's guy lines twanging. */
  tents: Record<CamperId, number>
  /** 0 to 1, going round: where the glints on the stream are. */
  stream: number
  /** The idle ladder: 0 to 1 of the glow on the piles, and the ghost hand, or none. */
  glow: number
  hand: { x: number; y: number; press: number; opacity: number } | null
}

const row = (): RowFrame => ({ length: 0, pop: 1, waveAt: 0, wave: 0, rattle: 0, slosh: 0, flying: [], heap: 0, held: false, tapped: -1, tap: 0 })
const camper = (): CamperFrame => ({ breath: 0, head: 0, idle: 0, poke: 0 })

/** A frame with everything at rest, the dog where it is told. The picture before the save has been read, and the base of every test. */
export function restFrame(dog: { x: number; y: number; turn: number }): ToyFrame {
  return {
    rows: { logs: row(), oil: row(), water: row() },
    campers: { reader: camper(), sleeper: camper(), cook: camper(), scout: camper(), small: camper() },
    dog: { ...dog, tail: 0, sniff: 0, trot: 0, poke: 0 },
    frog: { throat: 0, hop: 0 },
    mule: { ear: 0, tail: 0, look: 0, sit: 0, poke: 0 },
    kettle: 0,
    fire: 0,
    needle: 0,
    tents: { reader: 0, sleeper: 0, cook: 0, scout: 0, small: 0 },
    stream: 0,
    glow: 0,
    hand: null,
  }
}

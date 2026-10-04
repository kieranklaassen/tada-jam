import type { Pose } from './creatures'
import type { Factor, PacketId, Trait } from './plant'
import type { VisitorKind } from './spikePage'

// What is in motion on the page, as plain numbers for the view to draw.
//
// The saved page (lab.ts) says what is where; this says how it looks right
// now on the way there: a plant still drawing itself, a seed in the air, dust
// on a finger. Nothing here is saved, and nothing here decides anything: the
// toy (toyFx.ts, and the house and the game after it) fills it in every frame and the view (journal.ts) draws it.
// All points are in CSS pixels of the surface.

/** A plant that is not simply standing grown in its place. A plant with no entry is drawn at rest, and at rest a plant does not move. */
export type PlantLive = {
  /** How much of the plant has drawn itself, from the soil up: 0 nothing, 1 grown. */
  grow: number
  /** How far the top leans sideways, as a shear: about -0.5 to 0.5, from its spring. */
  bend: number
  /** Its height as a share of its grown height while it squashes and stretches: 1 at rest. */
  squash: number
  /** Where its soil line is drawn and at what scale, while it hops or is carried; none when it stands in its place. */
  at: { x: number; y: number; k: number } | null
  /** It is in the hand, and is drawn over everything else. */
  held: boolean
}

/** A pod on a plant: how swollen it is (0 just set, 1 full, a little over as it holds its breath) and a quick shake from side to side. */
/** A pod on its plant, or with `at` in the hand: off its stalk, its middle at that point. */
export type PodLive = { on: number; swell: number; shake: number; at?: { x: number; y: number } | null }

/** A seed in the air or in the hand. */
export type SeedLive = { x: number; y: number; turn: number; k: number }

/** One speck of gold dust, or with `wet` one drop of water. */
export type Mote = { x: number; y: number; r: number; alpha: number; wet?: boolean }

/** A short-lived ring or cloud: soil thrown up by a landing, the pop of a pod, a sneeze, a splash of water. `age` runs from 0 to 1. */
export type Puff = { x: number; y: number; r: number; age: number; kind: 'soil' | 'pop' | 'sneeze' | 'splash' }

/** A pot that is not simply standing in its place: lifted in the hand, or settling with a squash. */
export type PotLive = { at: { x: number; y: number } | null; squash: number }

export type BeetleLive = {
  /** Where its feet are; none when it is at home in its corner. */
  at: { x: number; y: number } | null
  pose: Pose
  /** 0 on its feet, 1 on its back. */
  flip: number
  /** The phase of its legs while it pedals on its back or walks, 0 to 1 and round again. */
  pedal: number
  /** How gold with dust it is, 0 to 1. */
  gold: number
  /** A sneeze: 0 none, rising to 1 as it rears back, and gone at once as it lets go. */
  sneeze: number
  /** How far the loupe has rolled from where it rests, in radians. */
  loupe: number
  /** How far its wing cases are opened and held up, 0 shut to 1: its umbrella. */
  cases: number
  /** How far it has dug itself into the soil of the pot it stands on, 0 on top to 1 with only its back showing. */
  sink: number
  /** It faces away from the plants: on its way off the page with the plants it carries out. */
  turned: boolean
}

/** The worm, looking out of a pot (0 to 11, the shelf's pots and then the tray's). */
export type WormLive = { pot: number; rise: number; look: number; cap: boolean }

/**
 * A visitor that is not simply standing at its place: walking in, answering a plant, in its ending.
 * `x` and `y` are where its feet are (for one that flies, where its feet would be on its line; `lift` raises it).
 */
export type VisitorLive = {
  kind: VisitorKind
  x: number
  y: number
  /** How high it is off its line, in CSS pixels. */
  lift: number
  /** A turn of the whole body about its middle, in radians: positive tips it backwards. */
  turn: number
  pose: Pose
  /** Its funniest part and a second part, from rest at 0: what each means for each visitor is in motion.ts, at `part` and `part2`. */
  part: number
  part2: number
  /** The phase of its legs or wings, 0 to 1 and round again. */
  legs: number
  /** How far it has sat down, 0 to 1: one that has what it asked for sits by its plant, and gets up to answer. None is standing. */
  sat?: number
  /** Gold dust that was let go on it and lies on its back, 0 to 1; and water that was let go on it, in drops, 0 to 1. */
  gold?: number
  wet?: number
  /** It faces away from the plants, as when it leaves. */
  away: boolean
  /** The scale it is drawn at, when that is not the scale of the place it is in: one that walks in from the edge grows on the way. */
  s?: number
}

/** The visitor's sketches. `big` is how far its larger sketch is unrolled, 0 rolled under its arm to 1 open; `shake` swings the open sketch a little. */
/** `askew`: how crooked the label hangs, 1 as the visitor stuck it in the ground, 0 once the beetle has put it straight; none is crooked. */
export type WishLive = { big: number; shake: number; askew?: number }

/** The can or the blotter in the hand: where it is, and how far it is tipped, in radians. A tool with no entry lies in its place. */
/** The can or the blotter away from its place, or rocking in it. `rest`: it stands in its place and only rocks, as when it is tapped, and has no stroke under it as a thing in the hand has. */
export type ToolLive = { x: number; y: number; tip: number; rest?: boolean }

/**
 * The loupe's note beside a plant or a pod that waits: two beads for each trait, drawn in pencil as a note beside the
 * specimen. `x` and `y` are the middle of the plant's flower, or of the pod. For a plant grown from seed, and for a
 * seed in a pod, each pair is the bead from the pod parent and the bead from the dust parent; for a runner's copy it is
 * the two its one parent carries, for a packet plant the two it came with. `hidden` marks a pair in which one bead
 * does not show in the plant.
 */
export type BeadsLive = {
  x: number
  y: number
  k: number
  pairs: { trait: Trait; fromOnto: Factor; fromDust: Factor; hidden: boolean }[]
  /** How the plant came to be: from seed (the default), as a runner's copy, or out of a packet. The note's head says which. */
  from?: 'seed' | 'runner' | 'packet'
}

/** The ghost hand of the idle ladder. */
export type HandLive = { x: number; y: number; press: number; opacity: number }

export type Live = {
  plants: Map<number, PlantLive>
  pods: PodLive[]
  seeds: SeedLive[]
  motes: Mote[]
  puffs: Puff[]
  /** By pot, 0 to 11. */
  pots: Map<number, PotLive>
  /** A packet answering a touch: how far it is shaken and turned. */
  packets: Map<PacketId, { shake: number; spin: number; at?: { x: number; y: number; z: number } }>
  beetle: BeetleLive
  /** Gold footprints the beetle left, fading. */
  prints: Mote[]
  worm: WormLive | null
  /** The visitor on the page and the one waiting at the edge, when they are in motion; none draws each at rest in its place. */
  visitor: VisitorLive | null
  waiting: VisitorLive | null
  wish: WishLive
  /** The can and the blotter while they are in the hand. */
  can: ToolLive | null
  blotter: ToolLive | null
  /** The loupe in the hand: the middle of its glass. None when it lies by the beetle. */
  loupe: { x: number; y: number } | null
  /** What the loupe shows: at most one note at a time. */
  beads: BeadsLive | null
  /** A runner bud answering a touch, by the plant it is on: `boing` swings it like a spring, `curl` shuts it, 0 to 1. */
  buds: Map<number, { boing: number; curl: number }>
  /** How much of the newest pencil sketch in the top margin has drawn itself, 0 to 1. */
  sketching: number
  /** A runner stretched between two points: from the bud it grows from to the leg of the beetle it tows, or to the pot it has reached. */
  tow: { from: { x: number; y: number }; to: { x: number; y: number } } | null
  /** The plant that stands before the visitor to be answered, or rides on it: it is drawn before the visitor, which is then in front of it. None when there is none. */
  offered: number | null
  /** The bite the snail has taken out of the edge of a leaf of the plant in front of it, in its ending: where, and how big it has got. */
  nibble: { x: number; y: number; r: number } | null
  /** How far the beetle has pressed down the strip of tape that will not lie flat, 0 not at all to 1 flat. It lifts again by itself. */
  tapeDown: number
  /**
   * The paper things a touch has set swinging about their tape, by their name in things.ts, each with how far it is
   * turned from where it lies, in radians: the pressed leaf, the frond, a kept drawing on its card.
   */
  things: Map<string, number>
  /** A margin sketch that a touch has made the pencil go over again: which one, and how far up it has got, 0 to 1. */
  resketch: { index: number; drawn: number } | null
  /** A fence of tape the beetle has put round a plant set in its corner: the foot of that plant, and how much of the fence is up, 0 to 1. */
  fence: { x: number; y: number; up: number } | null
  /** The idle ladder's glow: its strength, and the rings it is drawn as, one where each first move starts. */
  glow: { strength: number; rings: { x: number; y: number; r: number }[] }
  hand: HandLive | null
}

export function restingBeetle(): BeetleLive {
  return { at: null, pose: { lean: 0, look: 0, breath: 0, sway: 0 }, flip: 0, pedal: 0, gold: 0, sneeze: 0, loupe: 0, cases: 0, sink: 0, turned: false }
}

/** A page on which nothing is in motion. */
export function stillLive(): Live {
  return { plants: new Map(), pods: [], seeds: [], motes: [], puffs: [], pots: new Map(), packets: new Map(), beetle: restingBeetle(), prints: [], worm: null, visitor: null, waiting: null, wish: { big: 0, shake: 0 }, can: null, blotter: null, loupe: null, beads: null, buds: new Map(), sketching: 1, tow: null, offered: null, nibble: null, tapeDown: 0, things: new Map(), resketch: null, fence: null, glow: { strength: 0, rings: [] }, hand: null }
}

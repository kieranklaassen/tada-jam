import type { GobblerShape } from './gobblerBuild'
import type { GobblerId } from './gobblers'
import type { Toy } from './toys'

// A picture of the world for one frame: plain numbers, made by the pure side
// and drawn by the stage. Nothing here knows about the renderer.

export type ToyLook = {
  /** Stays the same for one toy from frame to frame, so its mesh is kept. */
  key: number
  toy: Toy
  /** Where the middle of its base is. */
  x: number
  y: number
  z: number
  /** 1 at rest; below 1 squashed flat, above 1 stretched tall. */
  squash: number
  /** How much wider than at rest it is drawn: a toy bulges a little as it squashes, and one in a belly is as wide as the belly makes it. */
  wide: number
  /** Swing, in radians, toward +x and toward +z: a toy in the jaws hangs the way the cable does. */
  leanX: number
  leanZ: number
  /** In or on a gobbler: how the gobbler is rolled, turned and pitched. The toy is then posed exactly as it is, and its own swing is not used. */
  ride: { leanX: number; leanZ: number; turn: number } | null
  /** 1 on the tray; a toy in a belly is drawn small. */
  scale: number
  /** Turned about its own upright, in radians: a toy in a belly turns with its gobbler. */
  turn: number
}

export type GobblerLook = {
  id: string
  /** Which gobbler it is: its parts are named for it on the stage. */
  who: GobblerId
  shape: GobblerShape
  /** Where its feet stand. */
  x: number
  y: number
  z: number
  /** 1 at rest; below 1 squashed, above 1 stretched tall. */
  squash: number
  /** Whether it bulges front to back as it squashes. One that waits on the shelf does not: the parapet is right in front of it and the wall right behind. */
  deep: boolean
  /** Where it looks, -1 to 1 across and up. */
  gazeX: number
  gazeY: number
  /** 0 eyes open, 1 shut. */
  blink: number
  /** Lean, in radians: forward and back, and side to side. */
  leanX: number
  leanZ: number
  /** One of those who wait behind the parapet, in its shade. */
  waiting: boolean
  /** Turned about its own upright, in radians, and its size: 1 on the step. */
  turn: number
  scale: number
}

export type ClawLook = {
  /** Where the cable hangs from. */
  x: number
  z: number
  /** Cable let out, and its swing in radians toward +x and toward +z. */
  length: number
  swingX: number
  swingZ: number
  /** 0 shut, 1 wide open. */
  open: number
  squash: number
  /** How far the hub is carried off the end of its swing by a load that spins, and how far it is turned with it. */
  shiftX: number
  shiftZ: number
  turn: number
}

export type Shadow = { x: number; y: number; z: number; r: number; a: number }

/** A crate on the ledge with its load on its deck and its crews riding, as one thing. */
export type CrateLook = {
  /** Changes when what the crate carries changes, so the view builds it again. */
  key: string
  which: number
  toys: readonly Toy[]
  /** The place on the tray each toy of the load is going to: the load stands on the deck in that arrangement. */
  places: readonly number[]
  crews: readonly (readonly GobblerId[])[]
  /** The middle of its foot, and how far its bed is tipped forward, 0 to 1. */
  x: number
  y: number
  z: number
  tip: number
}

/** The watcher beside the tray: where its feet are, how it is posed and where it looks. */
export type WatcherLook = { x: number; y: number; z: number; squash: number; turn: number; gazeX: number; gazeY: number; blink: number }

/** A ring of light on something that can be touched now. */
export type GlowLook = { x: number; y: number; z: number; r: number; a: number }

/** The ghost hand: where its fingertip is, how far it is pressed down and how solid it is. */
export type HandLook = { x: number; y: number; z: number; press: number; opacity: number }

export type Picture = {
  toys: readonly ToyLook[]
  gobblers: readonly GobblerLook[]
  crates: readonly CrateLook[]
  /** The cart of each crate, where it stands on the shelf: it stays there while the claw has its crate. */
  carts: readonly { which: number; x: number; z: number }[]
  claw: ClawLook
  watcher: WatcherLook
  /** Round shadows on whatever is beneath. */
  shadows: readonly Shadow[]
  glows: readonly GlowLook[]
  hand: HandLook | null
  /** The gate of the ledge shaking, 1 to 0. */
  gate: number
  /** Game seconds, for what runs by itself in the cabinet: the chase of its lamps. It stands still while the game does. */
  seconds: number
}

/**
 * How many draws a picture costs on the stage (view/stage.ts): the cabinet,
 * the shadows, the gate, the cable, the three parts of the claw, the
 * string of lamps and the watcher's body and pupils; one for
 * each toy; a body, a pair of pupils and a window for a gobbler at the
 * tray, and a body and pupils for one in the shade; one for each crate and one
 * for its cart, and one more for its bed while that tips;
 * and the glow and the hand when they show. The frame budget is held on this
 * count, since a test cannot draw.
 */
export function drawsOf(picture: Picture): number {
  const fixed = 1 + 1 + 1 + 1 + 3 + 1 + 2
  const gobblers = picture.gobblers.reduce((sum, look) => sum + (look.waiting ? 2 : 3), 0)
  const crates = picture.crates.reduce((sum, look) => sum + (look.tip > 0 ? 2 : 1), 0)
  return fixed + picture.toys.length + gobblers + crates + picture.carts.length + (picture.glows.length > 0 ? 1 : 0) + (picture.hand ? 1 : 0)
}

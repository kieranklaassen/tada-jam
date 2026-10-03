import type { GobblerShape } from './gobblerBuild'
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
  /** Swing, in radians, toward +x and toward +z: a toy in the jaws hangs the way the cable does. */
  leanX: number
  leanZ: number
  /** 1 on the tray; a toy in a belly is drawn small. */
  scale: number
}

export type GobblerLook = {
  id: string
  shape: GobblerShape
  /** Where its feet stand. */
  x: number
  y: number
  z: number
  /** 1 at rest; below 1 squashed, above 1 stretched tall. */
  squash: number
  /** Where it looks, -1 to 1 across and up. */
  gazeX: number
  gazeY: number
  /** 0 eyes open, 1 shut. */
  blink: number
  /** 0 the tongue lies on the floor of the belly, 1 it is raised to the rim. */
  tongue: number
  /** Lean, in radians: forward and back, and side to side. */
  leanX: number
  leanZ: number
  /** One of those who wait behind the parapet, in its shade. */
  waiting: boolean
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
}

export type Shadow = { x: number; y: number; z: number; r: number; a: number }

export type Picture = {
  toys: readonly ToyLook[]
  gobblers: readonly GobblerLook[]
  claw: ClawLook
  /** Round shadows on whatever is beneath. */
  shadows: readonly Shadow[]
}

import * as THREE from 'three'
import { BALL_RADIUS, BALL_REST_Y, BLOCKS_Z, BRICK_REST_Y, PROP_AT } from '../props'
import { SLAB } from '../sizes'
import { MAT_BACK } from './build'
import { disc, merged, paint, roundedRect, slab } from './foam'

// The playroom round the mat, all of it foam: a low wall of soft blocks along
// the back with a window board in it (hills, a sun and a drifting cloud), a
// ball and a brick on the wall, and a tree. It is the setting and never the
// work: every colour here is a pale tint, lower in contrast than the hats and
// the heads, and nothing here is shaped like a hat. What stands still is
// merged into one mesh and drawn in one draw; four things move a little
// (the tree's crown, the cloud, the ball and the brick), and the crown, the
// ball and the brick answer a touch.

export const TINT = {
  wall: '#f6efe2', floor: '#eadfcd', pane: '#d9edf6',
  peach: '#f4d3bf', mint: '#cfe9d8', lilac: '#dcd4ee', butter: '#f5e8b9', sky: '#cbe4ef', rose: '#f3d0d8',
  balloon: '#f3bcb0', string: '#cfc6b6',
  hill: '#c4e2c0', hillFar: '#d6ecd2', sun: '#f8e7a6', cloud: '#fbf8f0', frame: '#fbf6ea',
  trunk: '#e2cdb6', crown: '#bfe0b4', crownLight: '#d0e9c6',
} as const

const WALL_Z = MAT_BACK - 3.2
const FLOOR_Y = -SLAB
/** The window board among the blocks: where it stands, how wide and high it is, and the pane cut in it. */
export const WINDOW = { x: -0.5, wide: 6.2, high: 3.9, paneWide: 5.0, paneHigh: 2.4, paneY: 0.7 } as const
/** The pane's sky is a flat sheet inside the board's thickness. In front of it, each in a layer of its own so nothing touches: the far hill and the sun, the near hill, the balloon, the cloud, and the bar. */
const PANE_Z = BLOCKS_Z - 0.2
const LAYER = 0.12
const BOARD_DEPTH = 0.9

/** The flat things: the floor, the wall and the sky in the window. Planes, with nothing to pass through. */
export function buildRoomPlanes(): THREE.BufferGeometry {
  const floor = paint(new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2).translate(0, FLOOR_Y, 0), TINT.floor)
  const wall = paint(new THREE.PlaneGeometry(120, 40).translate(0, 20 + FLOOR_Y, WALL_Z), TINT.wall)
  const pane = paint(new THREE.PlaneGeometry(WINDOW.paneWide + 0.4, WINDOW.paneHigh + 0.4).translate(WINDOW.x, FLOOR_Y + WINDOW.paneY + WINDOW.paneHigh / 2, PANE_Z), TINT.pane)
  return merged([floor, wall, pane])
}

/** A slab of the room, standing at a place: cheap to draw, with few steps to its curves. Its outline is drawn with its foot on y = 0. */
function standing(shape: THREE.Shape, depth: number, colour: string, x: number, y: number, z: number): THREE.BufferGeometry {
  return slab(shape, depth, colour, 5).translate(x, y, z)
}

/** A rounded hill: half a wide oval, its flat side down. */
function hill(wide: number, high: number): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-wide / 2, 0)
  shape.lineTo(wide / 2, 0)
  shape.absellipse(0, 0, wide / 2, high, 0, Math.PI, false, 0)
  shape.closePath()
  return shape
}

/** A cloud: three humps on a flat base, as one outline. */
function cloudOutline(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-0.8, 0)
  shape.lineTo(0.8, 0)
  shape.absarc(0.8, 0.24, 0.24, -Math.PI / 2, Math.PI / 2, false)
  shape.absarc(0.32, 0.44, 0.36, 0, Math.PI, false)
  shape.absarc(-0.34, 0.36, 0.3, 0.2, Math.PI, false)
  shape.absarc(-0.8, 0.2, 0.2, Math.PI / 2, Math.PI * 1.5, false)
  shape.closePath()
  return shape
}

/** The blocks of the low wall, from left to right: where each starts and ends, how high it stands and its tint. The window board stands in the gap. */
const BLOCKS: readonly (readonly [number, number, number, string])[] = [
  [-17.4, -14.6, 2.9, TINT.rose], [-14.5, -11.6, 3.4, TINT.mint], [-11.5, -8.7, 2.6, TINT.lilac], [-8.6, -6.0, BRICK_REST_Y + SLAB, TINT.butter],
  [-5.9, -3.7, BALL_REST_Y + SLAB, TINT.sky], [2.7, 5.0, 2.9, TINT.rose], [5.1, 7.9, 3.4, TINT.peach], [8.0, 10.7, 2.7, TINT.mint],
  [10.8, 13.6, 3.2, TINT.lilac], [13.7, 16.6, 2.8, TINT.butter],
]

/** A string of round foam beads hangs along the wall in swags, just under the top of the frame: where each swag starts and ends, and how low it hangs. It ends short of the top right corner, which is the grown-up's and shows nothing to touch. */
const SWAGS: readonly (readonly [number, number, number])[] = [[-12.2, -6.6, 0.6], [-6.6, -1.0, 0.5], [-1.0, 4.6, 0.6], [4.6, 10.2, 0.5]]
const BEADS_A_SWAG = 7
const SWAG_Y = 4.52
const BEAD_TINTS = [TINT.rose, TINT.butter, TINT.sky, TINT.mint, TINT.lilac, TINT.peach] as const

/** Everything of the room that stands still, as one geometry. No two of its faces lie in one plane over each other: each layer has its own depth. */
export function buildScenery(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  BLOCKS.forEach(([from, to, high, tint], i) => parts.push(standing(roundedRect(from + 0.04, 0, to - from - 0.08, high, 0.32), 0.9 + (i % 3) * 0.06, tint, 0, FLOOR_Y, BLOCKS_Z)))
  // The window board: a cream board with a pane cut in it and a bar down the middle; behind the bar two hills and a sun.
  const { x, wide, high, paneWide, paneHigh, paneY } = WINDOW
  const board = roundedRect(-wide / 2, 0, wide, high, 0.4)
  board.holes.push(new THREE.Path(roundedRect(-paneWide / 2, paneY, paneWide, paneHigh, 0.3).getPoints(5)))
  parts.push(standing(board, BOARD_DEPTH, TINT.frame, x, FLOOR_Y, BLOCKS_Z))
  parts.push(standing(roundedRect(-0.11, 0, 0.22, paneHigh, 0.08), LAYER, TINT.frame, x, FLOOR_Y + paneY, PANE_Z + 0.52))
  parts.push(standing(hill(4.6, 1.5), LAYER, TINT.hillFar, x - 0.9, FLOOR_Y + paneY, PANE_Z + 0.08))
  parts.push(standing(hill(3.6, 1.0), LAYER, TINT.hill, x + 1.2, FLOOR_Y + paneY, PANE_Z + 0.21))
  parts.push(slab(disc(0.42, 0, 0.42), LAYER, TINT.sun, 12).translate(x + 1.6, FLOOR_Y + paneY + 1.25, PANE_Z + 0.08))
  // The string of beads on the wall: flat, pale and out of reach, so plainly part of the wall.
  let bead = 0
  for (const [from, to, sag] of SWAGS) for (let i = 0; i < BEADS_A_SWAG; i++) {
    const u = (i + 0.5) / BEADS_A_SWAG
    parts.push(standing(disc(i % 3 === 1 ? 0.33 : 0.24, 0, 0), LAYER, BEAD_TINTS[bead++ % BEAD_TINTS.length], from + (to - from) * u, SWAG_Y - sag * 4 * u * (1 - u), WALL_Z + 0.08))
  }
  // The trunk of the tree; its crown is its own mesh, since it sways.
  parts.push(standing(roundedRect(-0.42, 0, 0.84, 3.3, 0.3), 0.6, TINT.trunk, PROP_AT.tree.x, 0.02, PROP_AT.tree.z))
  return merged(parts)
}

/** The cloud in the window: its own mesh, since it drifts. Drawn about its middle. */
export function buildCloud(): THREE.BufferGeometry {
  return slab(cloudOutline(), LAYER, TINT.cloud, 5).translate(0, -0.3, 0)
}

/** The balloon's way up the pane, between the near hill and the cloud, inside the board's thickness, so it shows only through the pane: across, from below the pane to behind the board's top, and how far back. */
export const BALLOON_WAY = { x: WINDOW.x - 1.35, from: FLOOR_Y + WINDOW.paneY - 0.55, to: FLOOR_Y + WINDOW.paneY + WINDOW.paneHigh + 0.4, z: PANE_Z + 0.3 } as const

/** Where the cloud drifts about, in the upper left of the pane, between the sky and the hills. */
export const CLOUD_AT = { x: WINDOW.x - 0.05, y: FLOOR_Y + WINDOW.paneY + 1.75, z: PANE_Z + 0.38 } as const

/** The tree's crown: a big soft blob with two lighter tufts, hung on the trunk's top and in front of it. Drawn about the point it sways from. */
export function buildCrown(): THREE.BufferGeometry {
  const blob = new THREE.Shape()
  blob.absarc(-1.25, 1.2, 1.3, Math.PI * 0.55, Math.PI * 1.6, false)
  blob.absarc(0, 0.5, 1.2, Math.PI * 1.2, Math.PI * 1.8, false)
  blob.absarc(1.3, 1.25, 1.3, Math.PI * 1.45, Math.PI * 0.45, false)
  blob.absarc(0.45, 2.6, 1.35, Math.PI * 0.05, Math.PI * 0.8, false)
  blob.absarc(-0.75, 2.5, 1.2, Math.PI * 0.35, Math.PI * 1.0, false)
  blob.closePath()
  return merged([
    slab(blob, 0.6, TINT.crown, 6),
    slab(disc(0.55, -0.9, 1.9), 0.14, TINT.crownLight, 6).translate(0, 0, 0.38),
    slab(disc(0.4, 0.8, 1.3), 0.14, TINT.crownLight, 6).translate(0, 0, 0.38),
  ])
}

/** The ball that sits on a block, with two soft patches on it that show it turning. Drawn about its middle. */
export function buildBall(): THREE.BufferGeometry {
  return merged([
    slab(disc(BALL_RADIUS), 0.6, TINT.lilac, 10),
    slab(disc(BALL_RADIUS * 0.34, -BALL_RADIUS * 0.3, BALL_RADIUS * 0.28), 0.1, TINT.butter, 6).translate(0, 0, 0.36),
    slab(disc(BALL_RADIUS * 0.2, BALL_RADIUS * 0.36, -BALL_RADIUS * 0.3), 0.1, TINT.rose, 6).translate(0, 0, 0.36),
  ])
}

/** The brick that sits on a block. Drawn standing on y = 0. */
export function buildBrick(): THREE.BufferGeometry {
  return slab(roundedRect(-0.62, 0, 1.24, 0.9, 0.22), 0.6, TINT.rose, 5)
}

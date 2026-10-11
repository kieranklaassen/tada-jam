import { CELL, COLS, MOUTH, ROWS } from '../ground'
import { STAGE } from '../stage'

// Where things lie on the stage, in stage units. Pure numbers: the painters, the touch and the tests all read
// the same ones.

/** The width of the wooden frame round the farm. */
export const FRAME = 30
/** The ground's grid: its left and top edge, and its size. */
export const GROUND = { x: FRAME, y: STAGE.height - FRAME - ROWS * CELL, width: COLS * CELL, height: ROWS * CELL } as const
/** The strip of sky, grass and camp over the ground. */
export const SURFACE = { x: FRAME, y: FRAME, width: STAGE.width - 2 * FRAME, height: GROUND.y - FRAME } as const
/** The line the campers stand on: the top of the turf. */
export const GRASS_Y = GROUND.y
/** The middle of the mouth, where the hill stands. */
export const MOUTH_X = GROUND.x + ((MOUTH[0] + MOUTH[MOUTH.length - 1] + 1) / 2) * CELL

/** The log beside the mouth, where the next party waits: its left end, its length and its height on the grass. */
export const LOG = { x: 368, length: 150, height: 26 } as const

/** The big toadstool the dung fly stands on: where its stalk stands, its size, and how high its cap is. */
export const TOADSTOOL = { x: 826, size: 96, top: 100 } as const

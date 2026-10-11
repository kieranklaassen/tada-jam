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

/** The top left corner of a cell. */
export const cellAt = (x: number, y: number) => ({ x: GROUND.x + x * CELL, y: GROUND.y + y * CELL })
/** The cell under a point of the stage, which may lie outside the grid. */
export const cellUnder = (sx: number, sy: number) => ({ x: Math.floor((sx - GROUND.x) / CELL), y: Math.floor((sy - GROUND.y) / CELL) })

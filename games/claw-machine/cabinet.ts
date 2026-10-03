import type { Brick, Rgb } from './bricks'
import { FLOOR, STEP as STEP_COLOUR, TRAY as TRAY_COLOUR, TRIM, WALL as WALL_COLOUR, WALL_LIGHT } from './palette'
import { BACK, SHELF, STEP, TRAY, TRAY_DEPTH, TRAY_WIDTH, WALL } from './places'
import { PLATE } from './bricks'

// The cabinet: everything that never moves, as one build and so one draw.

/** A row of bricks along x, `length` studs each, so the seams between them show. */
function course(out: Brick[], colour: (i: number) => Rgb, x0: number, x1: number, y: number, z: number, d: number, h: number, length: number, offset = 0, studs = true): void {
  let x = x0, i = 0
  if (offset > 0) { out.push({ x, y, z, w: offset, d, h, colour: colour(i++), studs }); x += offset }
  while (x < x1 - 1e-6) {
    const w = Math.min(length, x1 - x)
    out.push({ x, y, z, w, d, h, colour: colour(i++), studs })
    x += w
  }
}

/** A wall of brick courses in running bond. */
function wall(out: Brick[], x0: number, x1: number, z: number, d: number, plates: number, seed: number): void {
  for (let y = 0, row = 0; y < plates; y += 3, row++) {
    const h = Math.min(3, plates - y)
    // A few bricks a shade lighter, placed by a fixed rule, so the wall is not one flat sheet.
    const colour = (i: number) => ((i * 7 + row * 13 + seed) % 11 === 0 ? WALL_LIGHT : WALL_COLOUR)
    course(out, colour, x0, x1, y, z, d, h, 4, row % 2 === 0 ? 0 : 2)
  }
}

export function cabinetBricks(): Brick[] {
  const out: Brick[] = []
  const plates = (height: number) => Math.round(height / PLATE)
  // The floor of the cabinet.
  for (let x = -20; x < 20; x += 8) out.push({ x, y: -1, z: -18, w: 8, d: 34, h: 1, colour: FLOOR })
  // The tray: one plain pale plate, and a rim in the machine's own colour.
  out.push({ x: TRAY.x, y: 0, z: TRAY.z, w: TRAY_WIDTH, d: TRAY_DEPTH, h: 1, colour: TRAY_COLOUR })
  const rim = () => TRIM
  course(out, rim, TRAY.x - 1, TRAY.x + TRAY_WIDTH + 1, 0, TRAY.z + TRAY_DEPTH, 1, 2, 4)
  course(out, rim, TRAY.x - 1, TRAY.x + TRAY_WIDTH + 1, 0, TRAY.z - 1, 1, 2, 4, 2)
  for (let z = TRAY.z; z < TRAY.z + TRAY_DEPTH; z += 4) {
    out.push({ x: TRAY.x - 1, y: 0, z, w: 1, d: 4, h: 2, colour: TRIM })
    out.push({ x: TRAY.x + TRAY_WIDTH, y: 0, z, w: 1, d: 4, h: 2, colour: TRIM })
  }
  // The step the gobblers stand on.
  for (let x = STEP.x; x < STEP.x + STEP.w; x += 6) out.push({ x, y: 0, z: STEP.z, w: Math.min(6, STEP.x + STEP.w - x), d: STEP.d - 2, h: plates(STEP.top), colour: STEP_COLOUR })
  // The parapet, the shelf behind it and the back wall.
  wall(out, SHELF.x, SHELF.x + SHELF.w, WALL.z, 1, plates(WALL.top), 3)
  for (let x = SHELF.x; x < SHELF.x + SHELF.w; x += 8) out.push({ x, y: plates(SHELF.top) - 3, z: SHELF.z, w: Math.min(8, SHELF.x + SHELF.w - x), d: SHELF.d, h: 3, colour: STEP_COLOUR })
  wall(out, SHELF.x - 2, SHELF.x + SHELF.w + 2, BACK.z, 1, plates(BACK.top), 5)
  // Corner posts in the machine's own colour.
  for (const x of [SHELF.x - 2, SHELF.x + SHELF.w]) {
    for (let y = 0; y < plates(BACK.top); y += 6) out.push({ x, y, z: WALL.z - 1, w: 2, d: 2, h: 6, colour: TRIM })
  }
  return out
}

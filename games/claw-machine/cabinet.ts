import type { Brick, Rgb } from './bricks'
import { FLOOR, LAMP, STEEL, STEP as STEP_COLOUR, TRAY as TRAY_COLOUR, TRIM, WALL as WALL_COLOUR, WALL_LIGHT } from './palette'
import { BACK, BELL, GATE, SHELF, STEP, TRAY, TRAY_DEPTH, TRAY_WIDTH, WALL } from './places'
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
  for (let x = -20; x < 20; x += 8) out.push({ x, y: -1, z: WALL.z, w: 8, d: 25, h: 1, colour: FLOOR })
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
  for (let x = STEP.x; x < STEP.x + STEP.w; x += 6) out.push({ x, y: 0, z: STEP.z, w: Math.min(6, STEP.x + STEP.w - x), d: STEP.d, h: plates(STEP.top), colour: STEP_COLOUR })
  // The parapet, the shelf behind it and the back wall.
  wall(out, SHELF.x, SHELF.x + SHELF.w, WALL.z, 1, plates(WALL.top), 3)
  for (let x = SHELF.x; x < SHELF.x + SHELF.w; x += 8) out.push({ x, y: plates(SHELF.top) - 3, z: SHELF.z, w: Math.min(8, SHELF.x + SHELF.w - x), d: SHELF.d, h: 3, colour: STEP_COLOUR })
  wall(out, SHELF.x - 2, SHELF.x + SHELF.w + 2, BACK.z, 1, plates(BACK.top), 5)
  // Corner posts in the machine's own colour.
  for (const x of [SHELF.x - 2, SHELF.x + SHELF.w]) {
    // They stand in front of the line of the parapet, clear of whoever waits behind it.
    for (let y = 0; y < plates(BACK.top); y += 6) out.push({ x, y, z: WALL.z, w: 2, d: 2, h: 6, colour: TRIM })
  }
  // The bell post at either end of the rail: a buffer brick with a bell on it.
  for (const side of [-1, 1]) {
    out.push({ x: side * BELL.x - 1, y: 0, z: BELL.z - 1, w: 2, d: 2, h: 8, colour: TRIM })
    out.push({ x: side * BELL.x - 1, y: 8, z: BELL.z - 1, w: 2, d: 2, h: 3, colour: LAMP, round: true })
  }
  // The posts of the gate, on the parapet.
  for (const side of [-1, 1]) out.push({ x: GATE.x + side * GATE.half - 0.5, y: plates(WALL.top), z: WALL.z, w: 1, d: 1, h: 2, colour: TRIM, round: true, studs: false })
  return out
}

/** The bar of the gate: the one part of the cabinet that moves. It is built about the middle of its own top. */
export function gateBricks(): Brick[] {
  // The bar lies a hair above its posts, and its latch hangs a hair above the studs of the parapet: two things
  // that touch are drawn with a sliver of air between them.
  return [
    { x: -GATE.half - 0.5, y: -0.9, z: -0.4, w: GATE.half * 2 + 1, d: 0.8, h: 0.9, colour: STEEL, studs: false },
    { x: -0.8, y: -2.4, z: -0.45, w: 1.6, d: 0.9, h: 1.5, colour: TRIM, studs: false },
  ]
}

import { BENCH, CHAIR, DOOR, FLOOR_Y, MIRROR, SCENE, STOOL } from './layout'
import type { Rng } from './rng'
import { blob, type Ctx, type Point, type Watercolour } from './wash'

// The room, in wet watercolour: a wall wash that stops short of the paper's
// edge, a floor, the mirror, the door with the next pair at its window, the
// bench and the stool. All of it is setting: loose washes with blooms and a
// pencil line, and nothing here is a piece the child works with.

export const ROOM = {
  wall: '#cfe6d6', wallBloom: '#bfe0ea', wallEdge: '#9cc7b4',
  floor: '#f0d6a4', floorBloom: '#f3c28e', floorEdge: '#c79a5e',
  glass: '#d9dcf3', glassBloom: '#c5e3ee', frame: '#e3b25a', frameEdge: '#b98232',
  door: '#8fc1b2', doorEdge: '#5d9484', pane: '#fbeeb5', paneEdge: '#e0c66a',
  wood: '#d3a373', woodEdge: '#a3713f',
  chair: '#ee7c62', chairEdge: '#c2513b', steel: '#c9ccd6', steelEdge: '#9499a8',
  hat: '#f4c531', hatEdge: '#c9951a',
  yak: '#8a5a3a', rabbit: '#e9e2dc', ink: '#3b3136',
} as const

/** A box with corners a hand would paint: four sides, each a little off true. */
export function roughBox(rng: Rng, x: number, y: number, w: number, h: number, wobble = 4): Point[] {
  const j = (): number => rng.range(-wobble, wobble)
  return [
    { x: x + j(), y: y + j() }, { x: x + w / 2 + j(), y: y + j() * 0.5 }, { x: x + w + j(), y: y + j() },
    { x: x + w + j() * 0.5, y: y + h / 2 + j() }, { x: x + w + j(), y: y + h + j() },
    { x: x + w / 2 + j(), y: y + h + j() * 0.5 }, { x: x + j(), y: y + h + j() }, { x: x + j() * 0.5, y: y + h / 2 + j() },
  ]
}

/** An arch: straight sides and a round top. */
export function arch(rng: Rng, cx: number, top: number, bottom: number, w: number): Point[] {
  const out: Point[] = [], r = w / 2
  out.push({ x: cx - r, y: bottom }, { x: cx - r + rng.range(-3, 3), y: (bottom + top + r) / 2 })
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI
    out.push({ x: cx + Math.cos(a) * r + rng.range(-2, 2), y: top + r + Math.sin(a) * r + rng.range(-2, 2) })
  }
  out.push({ x: cx + r + rng.range(-3, 3), y: (bottom + top + r) / 2 }, { x: cx + r, y: bottom })
  return out
}

/** The wall and the floor: one big wash with white paper left all round it, and a warm one below. */
export function paintWalls(g: Ctx, paint: Watercolour, rng: Rng): void {
  paint.wash(g, roughBox(rng, 34, 30, SCENE.w - 68, FLOOR_Y - 22, 14), { color: ROOM.wall, edge: ROOM.wallEdge, blooms: [ROOM.wallBloom, ROOM.wallBloom], bleed: 12, pool: 14, strength: 0.75, grain: 0.3 })
  // The floor runs a little past the wall on both sides.
  paint.wash(g, roughBox(rng, 14, FLOOR_Y, SCENE.w - 28, SCENE.h - FLOOR_Y - 26, 10), { color: ROOM.floor, edge: ROOM.floorEdge, blooms: [ROOM.floorBloom, ROOM.floorBloom], bleed: 10, pool: 12, strength: 0.85 })
  paint.pencil(g, [{ x: 28, y: FLOOR_Y + 2 }, { x: SCENE.w / 2, y: FLOOR_Y - 1 }, { x: SCENE.w - 30, y: FLOOR_Y + 3 }])
}

export function paintRoom(g: Ctx, paint: Watercolour, rng: Rng): void {
  paintWalls(g, paint, rng)
  paintMirror(g, paint, rng)
  paintDoor(g, paint, rng)
  paintBench(g, paint, rng)
  paintStool(g, paint, rng)
  paintChair(g, paint, rng)
}

export function paintMirror(g: Ctx, paint: Watercolour, rng: Rng): void {
  const frame = arch(rng, MIRROR.x, MIRROR.top, MIRROR.bottom, MIRROR.w)
  const glass = arch(rng, MIRROR.x, MIRROR.top + 20, MIRROR.bottom - 18, MIRROR.w - 40)
  paint.wash(g, frame, { color: ROOM.frame, edge: ROOM.frameEdge, strength: 0.7, reserve: true })
  paint.wash(g, glass, { color: ROOM.glass, edge: ROOM.glassBloom, blooms: [ROOM.glassBloom], strength: 0.9, grain: 0.12, reserve: true })
  paint.pencil(g, frame, true)
  paint.pencil(g, glass, true, 0.8)
  // Two loose strokes of shine.
  paint.pencil(g, [{ x: MIRROR.x - 118, y: 190 }, { x: MIRROR.x - 96, y: 140 }, { x: MIRROR.x - 66, y: 108 }], false, 0.8)
  paint.pencil(g, [{ x: MIRROR.x - 104, y: 216 }, { x: MIRROR.x - 92, y: 190 }], false, 0.8)
}

export function paintDoor(g: Ctx, paint: Watercolour, rng: Rng): void {
  const leaf = roughBox(rng, DOOR.x, DOOR.y, DOOR.w, DOOR.h, 3)
  paint.wash(g, leaf, { color: ROOM.door, edge: ROOM.doorEdge, blooms: [ROOM.wallBloom], reserve: true })
  paint.pencil(g, leaf, true)
  const pane = blob(rng, DOOR.window.x, DOOR.window.y, DOOR.window.r, DOOR.window.r, 0.03, 16)
  // The pane is lighter than the door, and paint cannot lighten: a patch of paper is put back first.
  paint.wash(g, pane, { color: ROOM.pane, edge: ROOM.paneEdge, strength: 0.8, grain: 0.1, reserve: true })
  // The next pair, with their hair tucked under rain hats: who they are shows, and how long their hair is does not.
  paintWaiting(g, paint, rng, DOOR.window.x - 22, DOOR.window.y + 16, ROOM.yak, 1)
  paintWaiting(g, paint, rng, DOOR.window.x + 26, DOOR.window.y + 24, ROOM.rabbit, 0.86)
  paint.pencil(g, pane, true, 1.3)
  // The handle.
  paint.wash(g, blob(rng, DOOR.x + DOOR.w - 26, DOOR.y + DOOR.h * 0.56, 9, 9, 0.05, 8), { color: ROOM.frame, edge: ROOM.frameEdge, reserve: true })
}

function paintWaiting(g: Ctx, paint: Watercolour, rng: Rng, x: number, y: number, fur: string, size: number): void {
  const s = size
  paint.wash(g, blob(rng, x, y + 14 * s, 24 * s, 22 * s, 0.05, 10), { color: fur, strength: 0.85, reserve: true })
  // The hat: a dome and a brim.
  const dome = blob(rng, x, y - 12 * s, 24 * s, 20 * s, 0.04, 10)
  const brim = blob(rng, x, y + 1 * s, 34 * s, 8 * s, 0.05, 10)
  paint.wash(g, dome, { color: ROOM.hat, edge: ROOM.hatEdge, reserve: true })
  paint.wash(g, brim, { color: ROOM.hat, edge: ROOM.hatEdge, reserve: true })
  paint.pencil(g, brim, true, 0.8)
  for (const side of [-1, 1]) dot(g, x + side * 9 * s, y + 13 * s, 2.8 * s)
}

/** A dark dot: an eye, a nose, a button. */
export function dot(g: Ctx, x: number, y: number, r: number, color: string = ROOM.ink): void {
  g.save()
  g.globalCompositeOperation = 'multiply'
  g.globalAlpha = 0.92
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

export function paintBench(g: Ctx, paint: Watercolour, rng: Rng): void {
  const back = roughBox(rng, BENCH.x + 6, BENCH.backY, BENCH.w - 12, 34, 3)
  const seat = roughBox(rng, BENCH.x, BENCH.seatY, BENCH.w, 26, 3)
  paint.wash(g, back, { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
  paint.wash(g, seat, { color: ROOM.wood, edge: ROOM.woodEdge, blooms: [ROOM.floorBloom], reserve: true })
  for (const x of [BENCH.x + 22, BENCH.x + BENCH.w - 36]) {
    paint.wash(g, roughBox(rng, x, BENCH.seatY + 24, 14, FLOOR_Y - BENCH.seatY - 20, 2), { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
    paint.wash(g, roughBox(rng, x + 1, BENCH.backY + 30, 12, BENCH.seatY - BENCH.backY - 28, 2), { color: ROOM.wood, edge: ROOM.woodEdge, strength: 0.7, reserve: true })
  }
  paint.pencil(g, seat, true)
  paint.pencil(g, back, true, 0.8)
}

export function paintStool(g: Ctx, paint: Watercolour, rng: Rng): void {
  const top = roughBox(rng, STOOL.x - 46, STOOL.seatY, 92, 18, 2)
  paint.wash(g, top, { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
  for (const side of [-1, 1]) {
    const x = STOOL.x + side * 30
    paint.wash(g, [{ x: x - 6, y: STOOL.seatY + 16 }, { x: x + 6, y: STOOL.seatY + 16 }, { x: x + side * 12 + 6, y: FLOOR_Y + 4 }, { x: x + side * 12 - 6, y: FLOOR_Y + 4 }], { color: ROOM.wood, edge: ROOM.woodEdge, sharp: true, reserve: true })
  }
  paint.pencil(g, top, true)
}

export function paintChair(g: Ctx, paint: Watercolour, rng: Rng): void {
  // Only the back and the foot show: the cape covers the rest.
  const back = roughBox(rng, CHAIR.x - 150, 300, 300, 250, 6)
  paint.wash(g, back, { color: ROOM.chair, edge: ROOM.chairEdge, blooms: ['#f6a17f'], reserve: true })
  paint.pencil(g, back, true)
  paint.wash(g, roughBox(rng, CHAIR.x - 13, FLOOR_Y - 40, 26, 60, 2), { color: ROOM.steel, edge: ROOM.steelEdge, reserve: true })
  const foot = blob(rng, CHAIR.x, FLOOR_Y + 30, 118, 17, 0.03, 14)
  paint.wash(g, foot, { color: ROOM.steel, edge: ROOM.steelEdge, reserve: true })
  paint.pencil(g, foot, true, 0.8)
}

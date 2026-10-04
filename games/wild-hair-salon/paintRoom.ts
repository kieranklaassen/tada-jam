import { BENCH, CHAIR, DADO_Y, DOOR, FLOOR_Y, LOOKING_GLASS, MIRROR, PEG, SCENE, SHELF, STOOL, TROLLEY } from './layout'
import type { Rng } from './rng'
import { blob, type Ctx, type Point, type Watercolour } from './wash'

// The salon, in wet watercolour, painted once and stamped: a striped wall
// over wood panelling, a tiled floor, the big mirror behind the chair, a
// looking glass over the bench, a shelf of bottles and combs with the
// ribbon's peg under it, a trolley of towels, lamps, pictures of hairdos, and
// a glass door with the street behind it. It fills the sheet from edge to
// edge. All of it is setting: soft washes, lower in contrast than anything
// the child can touch, and nothing here is a piece the child works with.

export const ROOM = {
  wall: '#8fd0c2', wallBloom: '#b4e4ea', wallEdge: '#63b3a3', stripe: '#63b9a8',
  panel: '#e6bd8c', panelEdge: '#b98550', rail: '#c98f58',
  floor: '#f7ead0', floorBloom: '#f6d9b4', floorEdge: '#d2b98c', tile: '#9fd0c6',
  glass: '#d9dcf3', glassBloom: '#c5e3ee', frame: '#e3b25a', frameEdge: '#b98232',
  door: '#e8765e', doorEdge: '#b94a3a', pane: '#fbeeb5', paneEdge: '#e0c66a',
  sky: '#cfdfee', house: ['#f3d9bf', '#e9c3d0', '#cfe0c0'], roof: '#c08478', pavement: '#c3c8d3', glassTint: '#cfeaf2',
  wood: '#d3a373', woodEdge: '#a3713f',
  chair: '#ee7c62', chairEdge: '#c2513b', steel: '#c9ccd6', steelEdge: '#9499a8',
  hat: '#f4c531', hatEdge: '#c9951a',
  bottle: ['#e0559a', '#f2c230', '#5b8fe0', '#58b98a', '#a76ad6'], towel: ['#fbf3ea', '#f6b6c6', '#bfe3ee'],
  leaf: '#4fa46a', leafEdge: '#2f7648', pot: '#d98a5f', potEdge: '#a85e3a', lamp: '#f6c544', lampEdge: '#c9951a', glow: '#fbe7a0',
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

/** The wall and the floor, out past every edge of the sheet: stripes above, wood panelling below, tiles underfoot. */
export function paintWalls(g: Ctx, paint: Watercolour, rng: Rng): void {
  paint.wash(g, roughBox(rng, -120, -120, SCENE.w + 240, DADO_Y + 130, 6), { color: ROOM.wall, edge: ROOM.wallEdge, blooms: [ROOM.wallBloom, ROOM.wallBloom, ROOM.stripe], bleed: 10, pool: 12, strength: 0.85, grain: 0.26 })
  // Soft stripes down the paper, a hand's width apart.
  for (let x = 26; x < SCENE.w; x += 76) {
    const lean = rng.range(-3, 3)
    paint.wash(g, [{ x, y: -10 }, { x: x + 24, y: -10 }, { x: x + 24 + lean, y: DADO_Y }, { x: x + lean, y: DADO_Y }], { color: ROOM.stripe, strength: 0.3, bleed: 5, pool: 3, grain: 0.3 })
  }
  // Wood panelling to the floor, with a rail along its top.
  const panel = roughBox(rng, -120, DADO_Y, SCENE.w + 240, FLOOR_Y - DADO_Y + 10, 3)
  paint.wash(g, panel, { color: ROOM.panel, edge: ROOM.panelEdge, blooms: [ROOM.floorBloom, ROOM.rail], bleed: 4, pool: 8, strength: 0.9, reserve: true })
  for (let x = 40; x < SCENE.w; x += 62) paint.pencil(g, [{ x: x + rng.range(-2, 2), y: DADO_Y + 16 }, { x: x + rng.range(-2, 2), y: FLOOR_Y - 4 }], false, 0.6)
  const rail = roughBox(rng, -120, DADO_Y - 11, SCENE.w + 240, 22, 1.5)
  paint.wash(g, rail, { color: ROOM.rail, edge: ROOM.panelEdge, strength: 0.9, reserve: true })
  paint.pencil(g, [{ x: -10, y: DADO_Y + 9 }, { x: SCENE.w / 2, y: DADO_Y + 8 }, { x: SCENE.w + 10, y: DADO_Y + 10 }], false, 0.8)

  // The floor: pale tiles, every other one a cool one, bigger towards the front.
  paint.wash(g, roughBox(rng, -120, FLOOR_Y - 3, SCENE.w + 240, SCENE.h - FLOOR_Y + 133, 3), { color: ROOM.floor, edge: ROOM.floorEdge, blooms: [ROOM.floorBloom, ROOM.floorBloom], bleed: 6, pool: 10, strength: 0.9, reserve: true })
  const rows = [{ y: FLOOR_Y, h: 46, w: 78 }, { y: FLOOR_Y + 46, h: 60, w: 96 }, { y: FLOOR_Y + 106, h: 80, w: 122 }]
  rows.forEach((row, r) => {
    for (let i = -1, x = -row.w * (r % 2 ? 0.5 : 0) - 20; x < SCENE.w + 20; x += row.w, i++) {
      if ((i + r) % 2) continue
      paint.wash(g, roughBox(rng, x + 2, row.y + 2, row.w - 4, row.h - 4, 2), { color: ROOM.tile, strength: 0.5, bleed: 3, pool: 4, grain: 0.3 })
    }
  })
  paint.pencil(g, [{ x: -10, y: FLOOR_Y + 2 }, { x: SCENE.w / 2, y: FLOOR_Y - 1 }, { x: SCENE.w + 10, y: FLOOR_Y + 3 }])
}

/** Everything that stands still in the salon, back to front. */
export function paintRoom(g: Ctx, paint: Watercolour, rng: Rng): void {
  paintWalls(g, paint, rng)
  paintLamps(g, paint, rng)
  paintMirror(g, paint, rng)
  paintLookingGlass(g, paint, rng)
  paintPictures(g, paint, rng)
  paintShelf(g, paint, rng)
  paintDoor(g, paint, rng)
  paintTrolley(g, paint, rng)
  paintRug(g, paint, rng)
  paintBench(g, paint, rng)
  paintStool(g, paint, rng)
  paintChair(g, paint, rng)
}

export function paintMirror(g: Ctx, paint: Watercolour, rng: Rng): void {
  const frame = arch(rng, MIRROR.x, MIRROR.top, MIRROR.bottom, MIRROR.w)
  const glass = arch(rng, MIRROR.x, MIRROR.top + 20, MIRROR.bottom - 18, MIRROR.w - 40)
  paint.wash(g, frame, { color: ROOM.frame, edge: ROOM.frameEdge, strength: 0.8, reserve: true })
  paint.wash(g, glass, { color: ROOM.glass, edge: ROOM.glassBloom, blooms: [ROOM.glassBloom], strength: 0.9, grain: 0.12, reserve: true })
  paint.pencil(g, frame, true)
  paint.pencil(g, glass, true, 0.8)
  // Two loose strokes of shine.
  paint.pencil(g, [{ x: MIRROR.x - 118, y: 190 }, { x: MIRROR.x - 96, y: 140 }, { x: MIRROR.x - 66, y: 108 }], false, 0.8)
  paint.pencil(g, [{ x: MIRROR.x - 104, y: 216 }, { x: MIRROR.x - 92, y: 190 }], false, 0.8)
}

/** The looking glass over the bench: an oval in a gilt frame, hung from a nail by a loop of cord. Its glass is left pale for the face that shows in it. */
export function paintLookingGlass(g: Ctx, paint: Watercolour, rng: Rng): void {
  const { x, y, rx, ry } = LOOKING_GLASS
  paint.pencil(g, [{ x: x - 30, y: y - ry - 10 }, { x, y: y - ry - 44 }, { x: x + 30, y: y - ry - 10 }], false, 0.9)
  const frame = blob(rng, x, y, rx + 14, ry + 14, 0.012, 22), glass = blob(rng, x, y, rx, ry, 0.01, 22)
  paint.wash(g, frame, { color: ROOM.frame, edge: ROOM.frameEdge, blooms: [ROOM.lamp], strength: 0.85, reserve: true })
  paint.wash(g, glass, { color: ROOM.glass, edge: ROOM.glassBloom, blooms: [ROOM.glassBloom], strength: 0.75, grain: 0.1, reserve: true })
  // It is never an empty ring: the room shows in it, a lamp and the stripes of the wall across from it, and light lies on the glass.
  for (const sx of [-44, 6, 52]) paint.wash(g, [{ x: x + sx, y: y - ry * 0.74 }, { x: x + sx + 20, y: y - ry * 0.78 }, { x: x + sx + 14, y: y + ry * 0.7 }, { x: x + sx - 6, y: y + ry * 0.74 }], { color: ROOM.wall, strength: 0.5, bleed: 5, pool: 2, grain: 0.2 })
  paint.wash(g, blob(rng, x + 30, y - ry * 0.5, 22, 15, 0.08, 9), { color: ROOM.lamp, edge: ROOM.lampEdge, strength: 0.6, bleed: 5 })
  paint.pencil(g, frame, true)
  paint.pencil(g, glass, true, 0.8)
  paint.pencil(g, [{ x: x - 54, y: y + 10 }, { x: x - 40, y: y - 44 }, { x: x - 14, y: y - 78 }], false, 0.8)
  paint.pencil(g, [{ x: x - 44, y: y + 34 }, { x: x - 36, y: y + 8 }], false, 0.8)
  paint.wash(g, blob(rng, x, y - ry - 46, 6, 6, 0.05, 8), { color: ROOM.steel, edge: ROOM.steelEdge, reserve: true })
}

/** Two pictures of hairdos nobody would ask for, between the looking glass and the mirror. */
export function paintPictures(g: Ctx, paint: Watercolour, rng: Rng): void {
  const picture = (x: number, y: number, w: number, h: number, hair: string, tall: boolean): void => {
    const frame = roughBox(rng, x, y, w, h, 2), card = roughBox(rng, x + 9, y + 9, w - 18, h - 18, 1.5)
    paint.wash(g, frame, { color: ROOM.wood, edge: ROOM.woodEdge, strength: 0.85, reserve: true })
    paint.wash(g, card, { color: ROOM.floor, edge: ROOM.floorEdge, strength: 0.6, reserve: true })
    const cx = x + w / 2, chin = y + h - 16
    // A round head with no face, and far too much hair on it.
    paint.wash(g, blob(rng, cx, chin - 14, 13, 12, 0.04, 10), { color: ROOM.floorBloom, edge: ROOM.woodEdge, strength: 0.8 })
    if (tall) paint.wash(g, [{ x: cx - 15, y: chin - 22 }, { x: cx - 12, y: y + 30 }, { x: cx - 4, y: y + 16 }, { x: cx + 6, y: y + 15 }, { x: cx + 13, y: y + 32 }, { x: cx + 15, y: chin - 22 }], { color: hair, strength: 0.85 })
    else for (const side of [-1, 0, 1]) paint.wash(g, blob(rng, cx + side * 15, chin - 30 - (side === 0 ? 10 : 0), 12, 12, 0.08, 9), { color: hair, strength: 0.85 })
    paint.pencil(g, frame, true, 0.8)
  }
  picture(246, 64, 76, 104, ROOM.bottle[0], true)
  picture(252, 190, 66, 86, ROOM.bottle[2], false)
  paint.pencil(g, [{ x: 284, y: 50 }, { x: 284, y: 64 }], false, 0.7)
}

/** Three lamps on cords from the ceiling, each with a pool of warm light on the wall under it. */
export function paintLamps(g: Ctx, paint: Watercolour, rng: Rng): void {
  for (const x of [366, 700, 1040]) {
    const drop = x === 700 ? 62 : 40
    paint.wash(g, blob(rng, x, drop + 70, 74, 60, 0.08, 12), { color: ROOM.glow, strength: 0.42, bleed: 18, pool: 0.1, grain: 0.1 })
    paint.pencil(g, [{ x, y: -6 }, { x: x + rng.range(-1, 1), y: drop }], false, 0.9)
    const shade: Point[] = [{ x: x - 14, y: drop }, { x: x + 14, y: drop }, { x: x + 36, y: drop + 34 }, { x: x - 36, y: drop + 34 }]
    paint.wash(g, shade, { color: ROOM.lamp, edge: ROOM.lampEdge, strength: 0.9, sharp: true, reserve: true })
    paint.pencil(g, shade, true, 0.8, true)
    paint.wash(g, blob(rng, x, drop + 38, 10, 7, 0.05, 8), { color: ROOM.pane, edge: ROOM.paneEdge, strength: 0.9, reserve: true })
  }
}

/** A round rug under the chair, pale so that what is cut and falls on it stays plain to see, with a darker band near its rim and a fringe at both ends. */
export function paintRug(g: Ctx, paint: Watercolour, rng: Rng): void {
  const cx = CHAIR.x, cy = FLOOR_Y + 96
  paint.wash(g, blob(rng, cx, cy, 372, 74, 0.012, 26), { color: ROOM.towel[1], edge: ROOM.door, blooms: [ROOM.towel[0], ROOM.floorBloom], strength: 0.6, bleed: 5, pool: 9, reserve: true })
  paint.pencil(g, blob(rng, cx, cy, 340, 60, 0.01, 26), true, 0.6)
  // The fringe fans out from the rim like the spokes of a wheel: no two threads level, and none of them a dash.
  for (const side of [-1, 1]) for (let i = -3; i <= 3; i++) paint.pencil(g, [{ x: cx + side * (368 - Math.abs(i) * 5), y: cy + i * 10 }, { x: cx + side * (386 - Math.abs(i) * 7), y: cy + i * 16 + 3 }], false, 0.6)
}

/** A bottle: a body, a neck and a stopper, standing on `base`. */
function bottle(g: Ctx, paint: Watercolour, rng: Rng, x: number, base: number, w: number, h: number, color: string, round: boolean): void {
  const body = round ? blob(rng, x, base - h * 0.42, w / 2, h * 0.42, 0.04, 12) : roughBox(rng, x - w / 2, base - h * 0.72, w, h * 0.72, 1.2)
  paint.wash(g, body, { color, strength: 0.85, pool: 4, reserve: true })
  paint.wash(g, roughBox(rng, x - w * 0.18, base - h, w * 0.36, h * 0.3, 0.8), { color, strength: 0.7, reserve: true })
  paint.wash(g, roughBox(rng, x - w * 0.26, base - h - 7, w * 0.52, 8, 0.8), { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
  paint.pencil(g, body, true, 0.6)
}

/** The shelf: bottles, a jar of combs and a trailing plant, with the ribbon's peg under its board. */
export function paintShelf(g: Ctx, paint: Watercolour, rng: Rng): void {
  const { x, y, w } = SHELF
  const board = roughBox(rng, x, y, w, 12, 1.5)
  for (const bx of [x + 22, x + w - 22]) paint.wash(g, [{ x: bx - 5, y: y + 10 }, { x: bx + 5, y: y + 10 }, { x: bx, y: y + 34 }], { color: ROOM.wood, edge: ROOM.woodEdge, sharp: true, reserve: true })
  // What stands on it goes down first, then the board in front of their feet.
  bottle(g, paint, rng, x + 22, y + 2, 26, 60, ROOM.bottle[0], false)
  bottle(g, paint, rng, x + 56, y + 2, 34, 46, ROOM.bottle[1], true)
  // A jar of combs: three plain handles stick out of the glass, with no marks on them.
  const jar = roughBox(rng, x + 82, y - 40, 34, 42, 1.2)
  for (const [dx, lean, color] of [[90, -5, ROOM.bottle[3]], [99, 1, ROOM.bottle[4]], [108, 6, ROOM.bottle[0]]] as const) {
    paint.wash(g, [{ x: x + dx - 4, y: y - 30 }, { x: x + dx + 4, y: y - 30 }, { x: x + dx + 4 + lean, y: y - 74 }, { x: x + dx - 4 + lean, y: y - 74 }], { color, strength: 0.85, sharp: true, reserve: true })
  }
  paint.wash(g, jar, { color: ROOM.glassBloom, edge: ROOM.steelEdge, strength: 0.55, reserve: false })
  paint.pencil(g, jar, true, 0.7)
  bottle(g, paint, rng, x + 138, y + 2, 24, 68, ROOM.bottle[2], false)
  // The plant: a pot, a head of leaves, and two stems that hang down past the board.
  const px = x + w - 26
  for (const [lx, ly, r] of [[-16, -44, 15], [2, -56, 17], [18, -42, 14], [-4, -36, 14]] as const) paint.wash(g, blob(rng, px + lx, y + ly, r, r * 0.8, 0.12, 9), { color: ROOM.leaf, edge: ROOM.leafEdge, blooms: [ROOM.lamp], strength: 0.85, reserve: true })
  for (const [lx, ly] of [[22, -6], [26, 16], [20, 40], [28, 62]] as const) paint.wash(g, blob(rng, px + lx, y + ly, 9, 11, 0.12, 8), { color: ROOM.leaf, edge: ROOM.leafEdge, strength: 0.8, reserve: true })
  paint.pencil(g, [{ x: px + 10, y: y - 26 }, { x: px + 24, y: y - 10 }, { x: px + 22, y: y + 40 }, { x: px + 28, y: y + 66 }], false, 0.7)
  paint.wash(g, [{ x: px - 16, y: y - 28 }, { x: px + 16, y: y - 28 }, { x: px + 12, y: y + 2 }, { x: px - 12, y: y + 2 }], { color: ROOM.pot, edge: ROOM.potEdge, sharp: true, reserve: true })
  paint.wash(g, board, { color: ROOM.wood, edge: ROOM.woodEdge, blooms: [ROOM.floorBloom], reserve: true })
  paint.pencil(g, board, true, 0.8)
  // The peg the ribbon hangs from.
  paint.wash(g, blob(rng, PEG.x, PEG.y - 30, 9, 9, 0.05, 8), { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
}

/** The trolley: folded towels on top with a bottle beside them, a basin below, on small wheels. */
export function paintTrolley(g: Ctx, paint: Watercolour, rng: Rng): void {
  const { x, w, top } = TROLLEY, right = x + w
  for (const lx of [x + 6, right - 6]) paint.wash(g, roughBox(rng, lx - 4, top, 8, FLOOR_Y - top + 2, 1), { color: ROOM.steel, edge: ROOM.steelEdge, reserve: true })
  // Folded towels in a pile, each a soft slab a little off the one below.
  ROOM.towel.forEach((color, i) => {
    const slab = roughBox(rng, x + 8 + i * 3, top - 15 - i * 15, 58 - i * 4, 14, 2)
    paint.wash(g, slab, { color, edge: ROOM.steelEdge, strength: 0.9, reserve: true })
    paint.pencil(g, slab, true, 0.6)
  })
  bottle(g, paint, rng, right - 20, top + 2, 22, 50, ROOM.bottle[4], false)
  for (const y of [top, top + 76]) {
    const tray = roughBox(rng, x - 4, y, w + 8, 12, 1.5)
    paint.wash(g, tray, { color: ROOM.steel, edge: ROOM.steelEdge, reserve: true })
    paint.pencil(g, tray, true, 0.7)
  }
  // A basin on the lower tray, with a folded towel over its rim.
  paint.wash(g, [{ x: x + 14, y: top + 44 }, { x: right - 14, y: top + 44 }, { x: right - 24, y: top + 78 }, { x: x + 24, y: top + 78 }], { color: ROOM.bottle[2], strength: 0.6, sharp: true, reserve: true })
  paint.wash(g, roughBox(rng, x + 24, top + 38, 30, 26, 2), { color: ROOM.towel[1], edge: ROOM.doorEdge, strength: 0.85, reserve: true })
  for (const lx of [x + 6, right - 6]) paint.wash(g, blob(rng, lx, FLOOR_Y + 8, 7, 7, 0.04, 8), { color: ROOM.ink, strength: 0.6, reserve: true })
  // What the broom missed: a little heap of cut hair by a wheel.
  for (const [dx, color] of [[18, ROOM.bottle[0]], [28, ROOM.pot], [38, ROOM.bottle[4]]] as const) paint.wash(g, blob(rng, right + dx, FLOOR_Y + 14 - (dx % 3) * 3, 12, 7, 0.2, 8), { color, strength: 0.7 })
}

/** The door: a red frame round one tall pane, a kick plate, a handle, a bell over it, and the street behind the glass in the rain. */
export function paintDoor(g: Ctx, paint: Watercolour, rng: Rng): void {
  const leaf = roughBox(rng, DOOR.x, DOOR.y, DOOR.w, DOOR.h, 3)
  paint.wash(g, leaf, { color: ROOM.door, edge: ROOM.doorEdge, blooms: ['#f6a17f'], strength: 0.9, reserve: true })
  paint.pencil(g, leaf, true)
  const { x, y, w, h } = DOOR.glass
  const pane = roughBox(rng, x, y, w, h, 2)
  // The street: sky, three houses across the road, the wet pavement, a lamp post.
  paint.wash(g, pane, { color: ROOM.sky, edge: ROOM.glassBloom, blooms: [ROOM.glassBloom, '#e6ecf6'], strength: 0.9, grain: 0.1, reserve: true })
  const ground = y + h * 0.56
  ROOM.house.forEach((color, i) => {
    const hx = x + 4 + i * (w - 8) / 3, hw = (w - 8) / 3 - 4, top = ground - 96 - (i % 2) * 34
    paint.wash(g, [{ x: hx, y: top }, { x: hx + hw / 2, y: top - 30 }, { x: hx + hw, y: top }, { x: hx + hw, y: ground }, { x: hx, y: ground }], { color, edge: ROOM.roof, strength: 0.75, sharp: true })
    paint.wash(g, [{ x: hx - 3, y: top + 2 }, { x: hx + hw / 2, y: top - 32 }, { x: hx + hw + 3, y: top + 2 }], { color: ROOM.roof, strength: 0.7, sharp: true })
    for (const wy of [top + 18, top + 54]) paint.wash(g, roughBox(rng, hx + hw / 2 - 9, wy, 18, 20, 1), { color: i === 1 ? ROOM.lamp : ROOM.sky, strength: 0.8 })
  })
  paint.wash(g, roughBox(rng, x, ground, w, y + h - ground, 2), { color: ROOM.pavement, edge: ROOM.steelEdge, blooms: [ROOM.sky], strength: 0.8 })
  paint.pencil(g, [{ x: x + 24, y: ground + 30 }, { x: x + 24, y: y + 60 }, { x: x + 34, y: y + 52 }], false, 1.1)
  paint.wash(g, blob(rng, x + 37, y + 56, 7, 6, 0.05, 8), { color: ROOM.lamp, edge: ROOM.lampEdge, strength: 0.9 })
  // Rain, in loose slanting strokes, and puddle rings on the pavement.
  for (let i = 0; i < 16; i++) {
    const rx = x + 10 + rng.range(0, w - 26), ry = y + 10 + rng.range(0, h - 60)
    paint.pencil(g, [{ x: rx, y: ry }, { x: rx - 5, y: ry + 20 }], false, 0.55)
  }
  // Puddles: flat patches of wet, washed in and not outlined, so none is a ring.
  for (let i = 0; i < 3; i++) paint.wash(g, blob(rng, x + 30 + i * 52, ground + 40 + (i % 2) * 34, 18, 5, 0.05, 8), { color: ROOM.glassTint, strength: 0.6 })
  // The glass over it all, and the plate at the door's foot.
  paint.wash(g, pane, { color: ROOM.glassTint, strength: 0.4, grain: 0.05 })
  paint.pencil(g, pane, true, 1.1)
  paint.pencil(g, roughBox(rng, DOOR.x + 12, y + h + 12, DOOR.w - 24, DOOR.y + DOOR.h - (y + h) - 22, 1.5), true, 0.7)
  // The handle, on the side the door opens from, and the bell that rings when it does.
  paint.wash(g, roughBox(rng, DOOR.x + 4, DOOR.y + DOOR.h * 0.5, 9, 54, 1), { color: ROOM.frame, edge: ROOM.frameEdge, reserve: true })
  const bell = { x: DOOR.x + DOOR.w / 2, y: DOOR.y - 28 }
  paint.pencil(g, [{ x: bell.x - 26, y: DOOR.y - 2 }, { x: bell.x - 22, y: bell.y - 16 }, { x: bell.x, y: bell.y - 14 }], false, 1)
  paint.wash(g, [{ x: bell.x - 6, y: bell.y - 14 }, { x: bell.x + 6, y: bell.y - 14 }, { x: bell.x + 15, y: bell.y + 12 }, { x: bell.x - 15, y: bell.y + 12 }], { color: ROOM.frame, edge: ROOM.frameEdge, blooms: [ROOM.lamp], reserve: true })
  dot(g, bell.x, bell.y + 15, 3.5)
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
  for (const x of [BENCH.x + 22, BENCH.x + BENCH.w - 36]) {
    paint.wash(g, roughBox(rng, x, BENCH.seatY + 24, 14, FLOOR_Y - BENCH.seatY - 20, 2), { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
    paint.wash(g, roughBox(rng, x + 1, BENCH.backY + 30, 12, BENCH.seatY - BENCH.backY - 28, 2), { color: ROOM.wood, edge: ROOM.woodEdge, strength: 0.7, reserve: true })
  }
  // A long cushion on the seat.
  const cushion = roughBox(rng, BENCH.x + 8, BENCH.seatY - 14, BENCH.w - 16, 20, 3)
  paint.wash(g, seat, { color: ROOM.wood, edge: ROOM.woodEdge, blooms: [ROOM.floorBloom], reserve: true })
  paint.wash(g, cushion, { color: ROOM.towel[1], edge: ROOM.doorEdge, blooms: [ROOM.door], strength: 0.85, reserve: true })
  paint.pencil(g, seat, true)
  paint.pencil(g, cushion, true, 0.7)
  paint.pencil(g, back, true, 0.8)
}

export function paintStool(g: Ctx, paint: Watercolour, rng: Rng): void {
  const top = roughBox(rng, STOOL.x - 46, STOOL.seatY, 92, 18, 2)
  // Three legs, the one at the back shorter as it stands further off: a seat on two legs alone is the shape of a sign.
  paint.wash(g, [{ x: STOOL.x - 5, y: STOOL.seatY + 16 }, { x: STOOL.x + 5, y: STOOL.seatY + 16 }, { x: STOOL.x + 9, y: FLOOR_Y - 14 }, { x: STOOL.x - 1, y: FLOOR_Y - 14 }], { color: ROOM.woodEdge, edge: ROOM.woodEdge, sharp: true, reserve: true })
  paint.wash(g, top, { color: ROOM.wood, edge: ROOM.woodEdge, reserve: true })
  for (const side of [-1, 1]) {
    const x = STOOL.x + side * 30
    paint.wash(g, [{ x: x - 6, y: STOOL.seatY + 16 }, { x: x + 6, y: STOOL.seatY + 16 }, { x: x + side * 12 + 6, y: FLOOR_Y + 4 }, { x: x + side * 12 - 6, y: FLOOR_Y + 4 }], { color: ROOM.wood, edge: ROOM.woodEdge, sharp: true, reserve: true })
  }
  paint.pencil(g, top, true)
}

export function paintChair(g: Ctx, paint: Watercolour, rng: Rng): void {
  // A fat padded chair with arms. With a customer in it only its edges and its foot show.
  for (const side of [-1, 1]) {
    const arm = roughBox(rng, CHAIR.x + side * 168 - 30, 440, 60, 96, 8)
    paint.wash(g, arm, { color: ROOM.chair, edge: ROOM.chairEdge, blooms: [ROOM.chairEdge], strength: 0.9, reserve: true })
    paint.pencil(g, arm, true, 0.8)
  }
  const back = roughBox(rng, CHAIR.x - 150, 300, 300, 250, 6)
  paint.wash(g, back, { color: ROOM.chair, edge: ROOM.chairEdge, blooms: ['#f6a17f'], reserve: true })
  paint.pencil(g, back, true)
  // Plain padding, with a roll for a head along the top: nothing on it that could be counted or read.
  const roll = roughBox(rng, CHAIR.x - 104, 292, 208, 40, 8)
  paint.wash(g, roll, { color: ROOM.chair, edge: ROOM.chairEdge, strength: 0.6 })
  paint.pencil(g, roll, true, 0.7)
  paint.wash(g, roughBox(rng, CHAIR.x - 13, FLOOR_Y - 40, 26, 60, 2), { color: ROOM.steel, edge: ROOM.steelEdge, reserve: true })
  const foot = blob(rng, CHAIR.x, FLOOR_Y + 30, 118, 17, 0.03, 14)
  paint.wash(g, foot, { color: ROOM.steel, edge: ROOM.steelEdge, reserve: true })
  paint.pencil(g, foot, true, 0.8)
}

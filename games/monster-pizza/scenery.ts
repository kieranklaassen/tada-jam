import { type Kind, LOOKS, SOFT, pieceRing } from './kinds'
import { BOARD, CARD, COUNTER_Y, DOOR, OVEN, PIECE_R, PIZZA, STAGE_H, STAGE_W, TUB } from './layout'
import { INK, PAPER, colourIn, figure, line, outline, plain, solid, sprite, type Pen, type Sprite } from './marker'
import { makeRng, seedFrom } from './rng'
import { ellipse, roundRect, smooth } from './shapes'

// The kitchen that never moves, and the things that move whole: each drawn
// once into a sprite, in stage units, at the density the view asks for. The
// look goes on these. The pizza's top is the plain surface the pieces lie
// on, and the pieces are plain.

/** The plain top of the pizza: pale, so every kind stands out on it. */
export const PIZZA_TOP = '#fff4d6'

/** The doorway's opening, as a ring: the sky and the street are inside it, and the two who wait stand in it. */
export function doorway(): number[] {
  const l = DOOR.x - DOOR.w / 2, r = DOOR.x + DOOR.w / 2, t = DOOR.y, b = DOOR.y + DOOR.h
  return smooth([l, b, l, t + 90, DOOR.x - DOOR.w * 0.3, t + 8, DOOR.x + DOOR.w * 0.3, t + 8, r, t + 90, r, b], 6)
}

/**
 * The pizzeria, as a happy five-year-old draws one: everything that stands
 * still, from edge to edge, painted once. The wall with its stripes and its
 * bunting, the doorway with the street outside, and under the counter the
 * checked cloth with flour on it. It is paler than anything a child can
 * touch, so the tubs, the pizza and the card stand out on it.
 */
export function paintWall(g: Pen, view: { x: number; y: number; w: number; h: number }): void {
  const rng = makeRng(seedFrom('wall'))
  const x0 = Math.min(view.x, 0) - 20, x1 = Math.max(view.x + view.w, STAGE_W) + 20
  const y0 = Math.min(view.y, 0) - 20, y1 = Math.max(view.y + view.h, STAGE_H) + 20
  g.fillStyle = PAPER
  g.fillRect(x0, y0, x1 - x0, y1 - y0)

  // The wall: wide pale stripes, coloured in up and down.
  for (let x = Math.floor(x0 / 118) * 118, i = 0; x < x1; x += 118, i++) {
    if (i % 2 === 0) colourIn(g, [x, y0, x + 118, y0, x + 118, COUNTER_Y + 4, x, COUNTER_Y + 4], '#ffeeb0', rng, Math.PI / 2 + 0.03, 22)
  }
  // A dado rail, and a row of pale tiles under it down to the counter.
  for (let x = Math.floor(x0 / 74) * 74, i = 0; x < x1; x += 74, i++) {
    colourIn(g, roundRect(x + 5, COUNTER_Y - 70, 64, 62, 8, 2), i % 2 === 0 ? '#cfeee6' : '#ffd9c7', rng, 0.5, 14)
  }
  line(g, [x0, COUNTER_Y - 78, STAGE_W * 0.35, COUNTER_Y - 75, STAGE_W * 0.7, COUNTER_Y - 80, x1, COUNTER_Y - 77], rng, 5, '#c9a36a')

  // Bunting along the top: a string and its flags, in pale marker.
  const flags = ['#ffc9c0', '#ffe39a', '#bfe8c0', '#bfe0f5', '#e3ccf5']
  const string: number[] = []
  for (let x = x0, i = 0; x <= x1; x += 82, i++) string.push(x, 12 + (i % 2) * 18)
  line(g, string, rng, 4, '#b98a5e')
  for (let i = 0; i + 3 < string.length; i += 2) {
    const ax = string[i], ay = string[i + 1], bx = string[i + 2], by = string[i + 3]
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    figure(g, [ax + 14, ay + 4 + (by - ay) * 0.17, bx - 14, by + 4 - (by - ay) * 0.17, mx, my + 42], flags[(i / 2) % flags.length], rng, 0.9, 4, 10)
  }

  // The doorway: sky, a hill, a house across the street and a tree, with a path up to the step.
  // Inside the doorway each thing is drawn on its own patch of paper, so its marker keeps its colour over the sky.
  const fig = (ring: number[], color: string, r: typeof rng, angle?: number, width?: number, stroke?: number): void => {
    solid(g, ring, '#ffffff')
    figure(g, ring, color, r, angle, width, stroke)
  }
  const door = doorway()
  const l = DOOR.x - DOOR.w / 2, r = DOOR.x + DOOR.w / 2, b = DOOR.y + DOOR.h
  g.save()
  solid(g, door, '#eaf8fd')
  colourIn(g, door, '#a9def3', rng, 0.15, 18)
  g.beginPath()
  for (let k = 0; k < door.length; k += 2) (k === 0 ? g.moveTo(door[k], door[k + 1]) : g.lineTo(door[k], door[k + 1]))
  g.closePath()
  g.clip()
  fig(ellipse(l + 70, DOOR.y + 92, 34, 34, 18), '#ffd84a', rng, 0.9, 5, 11)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    // Each ray a small filled wedge with its point outwards, none the same size as its neighbour.
    const near = 44, far = 60 + (k % 2) * 8, wide = 0.12
    solid(g, [l + 70 + Math.cos(a - wide) * near, DOOR.y + 92 + Math.sin(a - wide) * near, l + 70 + Math.cos(a) * far, DOOR.y + 92 + Math.sin(a) * far, l + 70 + Math.cos(a + wide) * near, DOOR.y + 92 + Math.sin(a + wide) * near], '#f2a81d')
  }
  fig(smooth([l - 30, b + 20, l - 30, b - 120, l + 80, b - 168, DOOR.x + 30, b - 132, r + 30, b - 176, r + 30, b + 20], 5), '#a8dc8a', rng, -0.2, 6, 16)
  // The house: a box, a roof, a door and a window, which is one filled pane with no bar across it.
  const hx = r - 132, hy = b - 250
  fig([hx, hy + 44, hx + 96, hy + 44, hx + 96, hy + 122, hx, hy + 122], '#ffe0b0', rng, 0.6, 5, 11)
  fig([hx - 12, hy + 48, hx + 48, hy, hx + 108, hy + 48], '#e86a5a', rng, -0.6, 5, 10)
  fig(roundRect(hx + 14, hy + 78, 24, 44, 5, 2), '#b98a5e', rng, 1.4, 4, 8)
  fig(roundRect(hx + 54, hy + 62, 30, 28, 4, 2), '#9fd4f0', rng, 0.4, 4, 8)
  // The tree: a trunk and a scribbled crown.
  fig(roundRect(l + 52, b - 232, 20, 86, 6, 2), '#b98a5e', rng, 1.5, 5, 9)
  fig(smooth([l + 14, b - 240, l + 30, b - 292, l + 66, b - 304, l + 104, b - 286, l + 114, b - 244, l + 62, b - 222], 5), '#6cc070', rng, 0.4, 5, 13)
  // The path to the step.
  fig([DOOR.x - 34, b - 112, DOOR.x + 24, b - 112, DOOR.x + 96, b + 20, DOOR.x - 110, b + 20], '#f3e2b8', rng, 0.1, 4, 12)
  g.restore()
  outline(g, door, rng, 10, '#8a5a3c')
  // A striped awning over the door, drawn as its scalloped edge.
  for (let k = 0; k < 6; k++) {
    const ax = l - 8 + (k * (DOOR.w + 16)) / 6, w = (DOOR.w + 16) / 6
    fig(smooth([ax, DOOR.y - 14, ax + w, DOOR.y - 14, ax + w, DOOR.y + 22, ax + w / 2, DOOR.y + 44, ax, DOOR.y + 22], 3), k % 2 === 0 ? '#f08a80' : '#fff3ea', rng, 1.5, 5, 10)
  }

  // Under the counter: a checked cloth to every edge, pale so that the work shows on it.
  const top = COUNTER_Y + 30
  for (let y = top, row = 0; y < y1; y += 86, row++) {
    for (let x = Math.floor(x0 / 86) * 86, col = Math.round(x / 86); x < x1; x += 86, col++) {
      if ((row + col) % 2 === 0) colourIn(g, [x + 3, y + 3, x + 83, y + 3, x + 83, y + 83, x + 3, y + 83], '#ffe2dc', rng, (row + col) % 4 === 0 ? 0.4 : -0.5, 15)
    }
  }
  // Flour, where a pizza gets made: pale smudges and a few dots round the board.
  for (const [fx, fy, fr] of [[410, 520, 46], [770, 500, 38], [440, 770, 42], [780, 770, 34], [860, 610, 28]] as const) {
    g.save()
    g.globalAlpha = 0.9
    solid(g, smooth([fx - fr, fy, fx - fr * 0.4, fy - fr * 0.7, fx + fr * 0.5, fy - fr * 0.5, fx + fr, fy + fr * 0.1, fx + fr * 0.3, fy + fr * 0.7, fx - fr * 0.5, fy + fr * 0.6], 4), '#ffffff')
    g.restore()
    for (let k = 0; k < 5; k++) solid(g, ellipse(fx + rng.range(-fr, fr) * 1.3, fy + rng.range(-fr, fr) * 1.1, 4, 4, 8), '#ffffff')
  }
  // A stack of logs by the oven, for its fire.
  for (const [lx, ly] of [[1118, 786], [1150, 786], [1134, 760]] as const) {
    figure(g, ellipse(lx, ly, 17, 15, 12), '#d9a066', rng, 0.3, 5, 8)
    // The heartwood: a filled dark spot, off centre, and no ring.
    solid(g, ellipse(lx - 2, ly + 1, 6, 5, 8), '#b07a4a')
  }
}

/** The counter's near edge: drawn over the customers, so their feet are behind it. A plank of wood with its grain. */
export function paintLip(g: Pen): void {
  const rng = makeRng(seedFrom('lip'))
  // The band runs past both ends of the stage, so a wider surface has no gap.
  const band = roundRect(-1200, COUNTER_Y, STAGE_W + 2400, 30, 6, 2)
  g.fillStyle = PAPER
  g.fillRect(-1200, COUNTER_Y, STAGE_W + 2400, 30)
  colourIn(g, band, '#e7a955', rng, 0.02, 12)
  line(g, [-1200, COUNTER_Y, STAGE_W * 0.3, COUNTER_Y + 3, STAGE_W * 0.7, COUNTER_Y - 2, STAGE_W + 1200, COUNTER_Y + 2], rng, 8)
  line(g, [-1200, COUNTER_Y + 30, STAGE_W * 0.4, COUNTER_Y + 28, STAGE_W + 1200, COUNTER_Y + 32], rng, 7)
  for (let x = -1100; x < STAGE_W + 1200; x += 210) line(g, [x, COUNTER_Y + 13, x + 60, COUNTER_Y + 17, x + 120, COUNTER_Y + 12], rng, 3, '#b9783a')
}

/** The round board the pizza lies on. */
export function paintBoard(g: Pen): void {
  const rng = makeRng(seedFrom('board'))
  figure(g, ellipse(BOARD.x, BOARD.y, BOARD.r, BOARD.r, 40), '#d9a066', rng, 0.12, 7, 15)
}

/** The oven's mouth, as a ring: the fire burns inside it. */
export function ovenMouth(): number[] {
  const { x, y, w, h } = OVEN
  return smooth([x - w * 0.34, y + h * 0.3, x - w * 0.34, y - h * 0.02, x - w * 0.18, y - h * 0.2, x + w * 0.18, y - h * 0.2, x + w * 0.34, y - h * 0.02, x + w * 0.34, y + h * 0.3], 5)
}

/** The oven: a brick dome with a dark mouth, a small window over it and a chimney. `glow` 0 to 1 lights the mouth and the window. The fire in it is drawn each frame. */
export function paintOven(g: Pen, glow: number): void {
  const rng = makeRng(seedFrom('oven'))
  const { x, y, w, h } = OVEN
  figure(g, roundRect(x + w * 0.16, y - h * 0.68, w * 0.2, h * 0.3, 8, 3), '#b9543f', rng, 1.3, 6, 13)
  const dome = smooth([x - w / 2, y + h / 2, x - w / 2, y - h * 0.1, x - w * 0.3, y - h * 0.46, x, y - h * 0.54, x + w * 0.3, y - h * 0.46, x + w / 2, y - h * 0.1, x + w / 2, y + h / 2], 6)
  g.save()
  solid(g, dome, PAPER)
  g.restore()
  figure(g, dome, '#e2674a', rng, -0.2, 8, 17)
  // Bricks, as a child draws them: a few, here and there.
  for (const [bx, by] of [[-0.3, -0.24], [0.26, -0.3], [-0.38, 0.36], [0.36, 0.34], [-0.4, 0.08], [0.4, 0.06]] as const) outline(g, roundRect(x + bx * w - 20, y + by * h - 10, 40, 20, 4, 2), rng, 4)
  plain(g, ovenMouth(), glow > 0.5 ? '#ffb347' : '#4a2a2e', 7)
  // The window in the dome, over the mouth: dark, and alight when the oven is. It shows whether the door is open or shut.
  const wy = y - h * 0.37
  plain(g, smooth([x - 20, wy + 15, x - 20, wy - 4, x - 9, wy - 16, x + 9, wy - 16, x + 20, wy - 4, x + 20, wy + 15], 4), glow > 0.5 ? '#ffd76a' : '#4a2a2e', 5)
  // The log the fire sits on: one, filled, with a lump for its far end. Two level bars would read as a sign.
  solid(g, smooth([x - w * 0.22, y + h * 0.29, x - w * 0.2, y + h * 0.235, x + w * 0.16, y + h * 0.215, x + w * 0.22, y + h * 0.25, x + w * 0.18, y + h * 0.295], 3), '#8a5a3c')
}

/** One tongue of the fire, about its foot at (0, 0), pointing up. */
export function paintFlame(g: Pen, inner: boolean): void {
  const rng = makeRng(seedFrom(inner ? 'flame-in' : 'flame-out'))
  const h = inner ? 44 : 72, w = inner ? 15 : 26
  const tongue = smooth([-w, 0, -w * 0.9, -h * 0.4, -w * 0.3, -h * 0.62, 0, -h, w * 0.5, -h * 0.6, w, -h * 0.34, w * 0.8, 0], 4)
  if (inner) solid(g, tongue, '#ffe14d')
  else {
    solid(g, tongue, PAPER)
    figure(g, tongue, '#ff8a1f', rng, 1.2, 5, 9)
  }
}

/** A cloud, a bird, a puff of smoke and a puff of flour: the small things that drift. Each about (0, 0). */
export function paintCloud(g: Pen): void {
  const rng = makeRng(seedFrom('cloud'))
  const cloud = smooth([-52, 8, -44, -14, -18, -24, 6, -34, 30, -22, 52, -6, 44, 14, 0, 18, -36, 18], 4)
  solid(g, cloud, '#ffffff')
  outline(g, cloud, rng, 4, '#7fb9d6')
}

export function paintBird(g: Pen): void {
  // A small bird seen from the side: a filled body with a tail, one wing lifted over its back and a beak. No pair of wings spread from a point, which would read as a letter.
  solid(g, smooth([-14, 0, -6, -7, 6, -6, 13, -1, 22, -6, 20, 3, 8, 6, -6, 6], 3), '#4a5568')
  solid(g, smooth([-4, -4, 2, -18, 10, -14, 6, -3], 3), '#2f3848')
  solid(g, [-13, -1, -21, 2, -13, 3], '#f2a81d')
}

export function paintSmoke(g: Pen): void {
  // A puff: one soft grey lump with no line round it, so it reads as smoke and as nothing else.
  solid(g, smooth([-8, -2, -12, -14, -4, -24, 6, -28, 14, -18, 12, -6, 2, 0], 4), '#b9b5bd')
}

export function paintFlour(g: Pen): void {
  const rng = makeRng(seedFrom('flour'))
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3
    // Dust: bigger white specks near the landing and smaller tan ones further out. No strokes fan out from it.
    solid(g, ellipse(Math.cos(a) * 22, Math.sin(a) * 16, 6 + (k % 3) * 2, 5 + (k % 2) * 2, 8), '#ffffff')
    solid(g, ellipse(Math.cos(a + 0.3) * (33 + rng.range(0, 8)), Math.sin(a + 0.3) * (25 + rng.range(0, 6)), 3 + (k % 2), 3, 8), '#d9cdb8')
  }
}

/** The pizza base: a coloured-in crust round a plain, pale top. Drawn about (0, 0). */
export function paintPizza(g: Pen, baked: boolean): void {
  const rng = makeRng(seedFrom('pizza'))
  figure(g, ellipse(0, 0, PIZZA.r, PIZZA.r, 40), baked ? '#d98b3a' : '#f0c98a', rng, 0.5, 7, 15)
  plain(g, ellipse(0, 0, PIZZA.r * 0.9, PIZZA.r * 0.9, 40), baked ? '#ffe9b0' : PIZZA_TOP, 4, baked ? '#b8742c' : '#d6a85e')
}

/** One piece, plain, about (0, 0). */
export function paintPiece(g: Pen, kind: Kind, r: number, baked = false, soft = false): void {
  // Baking changes no piece's size, outline or colour: baked, its outline is toasted dark, so it still pairs by eye with its drawn piece on the card.
  // `soft` is the shape two kinds take for the moment of their baking move, and spring back from.
  const ring = soft && SOFT[kind] ? SOFT[kind].map((v) => v * r) : pieceRing(kind, 0, 0, r)
  plain(g, ring, LOOKS[kind].fill, Math.max(3, r * 0.19), baked ? TOASTED : INK)
}

/** The outline of a baked piece. */
export const TOASTED = '#5a3418'

/** A tub of one kind, about the middle of its rim: a coloured-in bowl with a heap of plain pieces in it. */
export function paintTub(g: Pen, kind: Kind): void {
  const rng = makeRng(seedFrom('tub' + kind))
  const r = TUB.r
  // The heap first, so the bowl's front covers its feet.
  // The turns of the heap are small, so a sock in it lies down like the ones on the pizza and none stands on its toe.
  for (const [hx, hy, turn] of [[-0.42, -0.28, -0.15], [0.4, -0.3, 0.45], [0, -0.52, 0.2], [-0.1, -0.12, -0.45], [0.3, -0.02, 0.3]] as const) {
    g.save()
    g.translate(hx * r, hy * r)
    g.rotate(turn)
    paintPiece(g, kind, PIECE_R * 0.92)
    g.restore()
  }
  const bowl = smooth([-r, -r * 0.06, -r * 0.82, r * 0.52, -r * 0.4, r * 0.8, r * 0.4, r * 0.8, r * 0.82, r * 0.52, r, -r * 0.06, r * 0.5, r * 0.1, -r * 0.5, r * 0.1], 5)
  g.save()
  solid(g, bowl, PAPER)
  g.restore()
  figure(g, bowl, LOOKS[kind].tub, rng, -0.7, 7, 14)
}

/** The customer's card: a sheet of paper with a drawn border. The pictured pieces are laid on it by the view. */
export function paintCard(g: Pen): void {
  const rng = makeRng(seedFrom('card'))
  const sheet = roundRect(0, 0, CARD.w, CARD.h, 14, 3)
  solid(g, sheet, '#ffffff')
  outline(g, sheet, rng, 7)
  outline(g, roundRect(10, 10, CARD.w - 20, CARD.h - 20, 10, 3), rng, 4, '#f08a2c')
}

/** A rolled-up order, small or big, about its middle. */
export function paintRoll(g: Pen, big: boolean): void {
  const rng = makeRng(seedFrom(big ? 'bigroll' : 'roll'))
  // The big roll looks like more to do: longer and fatter, and its holder needs both arms for it.
  const w = big ? 126 : 60, h = big ? 38 : 28
  const roll = roundRect(-w / 2, -h / 2, w, h, h / 2, 4)
  solid(g, roll, '#ffffff')
  outline(g, roll, rng, 5)
  // The paper's free edge along the roll, and a seal of red wax that holds it shut: one filled lump. No band crosses the roll and no two wings meet on it, so nothing on it reads as a sign.
  line(g, [-w * 0.34, h * 0.18, w * 0.34, h * 0.24], rng, 3, '#c9c2b4')
  // The seal sits to one side with a tail of ribbon hanging from it, as on a scroll: not a disc in the middle of a bar.
  const s = big ? 12 : 8, sx = -w * 0.22
  solid(g, [sx - s * 0.5, s * 0.4, sx + s * 0.5, s * 0.5, sx + s * 0.9, h * 0.5 + s * 1.5, sx - s * 0.1, h * 0.5 + s * 0.9, sx - s * 0.6, h * 0.5 + s * 1.7], '#e2574c')
  solid(g, smooth([sx - s, -s * 0.2, sx - s * 0.5, -s * 0.9, sx + s * 0.4, -s, sx + s, -s * 0.3, sx + s * 0.8, s * 0.6, sx, s, sx - s * 0.8, s * 0.6], 3), '#e2574c')
}

/** Every sprite the view stamps, made once for a density. */
export type Scenery = {
  wall: Sprite
  lip: Sprite
  board: Sprite
  oven: Sprite
  flame: Sprite
  flameCore: Sprite
  cloud: Sprite
  bird: Sprite
  smoke: Sprite
  flour: Sprite
  pizza: Sprite
  pizzaBaked: Sprite
  card: Sprite
  roll: Sprite
  bigRoll: Sprite
  tubs: Record<Kind, Sprite>
  pieces: Record<Kind, Sprite>
  piecesBaked: Record<Kind, Sprite>
  /** The worm curled up and the cheese gone soft, for the moment of their baking move. */
  piecesSoft: Partial<Record<Kind, Sprite>>
}

export function makeScenery(density: number, kinds: readonly Kind[], view: { x: number; y: number; w: number; h: number }): Scenery {
  const each = <T,>(make: (kind: Kind) => T): Record<Kind, T> => Object.fromEntries(kinds.map((kind) => [kind, make(kind)])) as Record<Kind, T>
  const disc = { x: -PIZZA.r, y: -PIZZA.r, w: PIZZA.r * 2, h: PIZZA.r * 2 }
  return {
    wall: sprite(view, density, 0, (g) => paintWall(g, view)),
    lip: sprite({ x: view.x, y: COUNTER_Y - 8, w: view.w, h: 48 }, density, 0, paintLip),
    board: sprite({ x: BOARD.x - BOARD.r, y: BOARD.y - BOARD.r, w: BOARD.r * 2, h: BOARD.r * 2 }, density, 24, paintBoard),
    flame: sprite({ x: -28, y: -74, w: 56, h: 76 }, density, 12, (g) => paintFlame(g, false)),
    flameCore: sprite({ x: -16, y: -46, w: 32, h: 48 }, density, 4, (g) => paintFlame(g, true)),
    cloud: sprite({ x: -54, y: -36, w: 108, h: 56 }, density, 6, paintCloud),
    bird: sprite({ x: -24, y: -20, w: 48, h: 22 }, density, 6, paintBird),
    smoke: sprite({ x: -12, y: -32, w: 34, h: 34 }, density, 6, paintSmoke),
    flour: sprite({ x: -42, y: -32, w: 84, h: 64 }, density, 4, paintFlour),
    oven: sprite({ x: OVEN.x - OVEN.w / 2, y: OVEN.y - OVEN.h * 0.8, w: OVEN.w, h: OVEN.h * 1.3 }, density, 24, (g) => paintOven(g, 0)),
    pizza: sprite(disc, density, 24, (g) => paintPizza(g, false)),
    pizzaBaked: sprite(disc, density, 24, (g) => paintPizza(g, true)),
    card: sprite({ x: 0, y: 0, w: CARD.w, h: CARD.h }, density, 12, paintCard),
    roll: sprite({ x: -32, y: -16, w: 64, h: 48 }, density, 8, (g) => paintRoll(g, false)),
    bigRoll: sprite({ x: -66, y: -26, w: 132, h: 76 }, density, 8, (g) => paintRoll(g, true)),
    tubs: each((kind) => sprite({ x: -TUB.r, y: -TUB.r, w: TUB.r * 2, h: TUB.r * 1.9 }, density, 22, (g) => paintTub(g, kind))),
    pieces: each((kind) => sprite({ x: -PIECE_R, y: -PIECE_R, w: PIECE_R * 2, h: PIECE_R * 2 }, density, 6, (g) => paintPiece(g, kind, PIECE_R))),
    piecesBaked: each((kind) => sprite({ x: -PIECE_R, y: -PIECE_R, w: PIECE_R * 2, h: PIECE_R * 2 }, density, 6, (g) => paintPiece(g, kind, PIECE_R, true))),
    piecesSoft: Object.fromEntries((Object.keys(SOFT) as Kind[]).map((kind) => [kind, sprite({ x: -PIECE_R, y: -PIECE_R, w: PIECE_R * 2, h: PIECE_R * 2 }, density, 6, (g) => paintPiece(g, kind, PIECE_R, true, true))])),
  }
}

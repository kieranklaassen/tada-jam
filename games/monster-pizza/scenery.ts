import { type Kind, LOOKS, pieceRing } from './kinds'
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

/** The wall, the doorway and the worktop: everything behind the customers and under the table things. */
export function paintWall(g: Pen): void {
  const rng = makeRng(seedFrom('wall'))
  g.fillStyle = PAPER
  g.fillRect(-2000, -2000, STAGE_W + 4000, STAGE_H + 4000)
  // The doorway: a patch of sky, and a frame drawn round it.
  const door = smooth([DOOR.x - DOOR.w / 2, DOOR.y + DOOR.h, DOOR.x - DOOR.w / 2, DOOR.y + 60, DOOR.x - DOOR.w * 0.3, DOOR.y + 4, DOOR.x + DOOR.w * 0.3, DOOR.y + 4, DOOR.x + DOOR.w / 2, DOOR.y + 60, DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h], 6)
  figure(g, door, '#9fdcf2', rng, 0.2, 8, 16)
}

/** The counter's near edge: drawn over the customers, so their feet are behind it. */
export function paintLip(g: Pen): void {
  const rng = makeRng(seedFrom('lip'))
  // The band runs past both ends of the stage, so a wider surface has no gap. The worktop below it is bare paper, kept plain for the work.
  const band = roundRect(-1200, COUNTER_Y, STAGE_W + 2400, 30, 6, 2)
  g.fillStyle = PAPER
  g.fillRect(-1200, COUNTER_Y, STAGE_W + 2400, 30)
  colourIn(g, band, '#f6b93b', rng, 0.02, 12)
  line(g, [-1200, COUNTER_Y, STAGE_W * 0.3, COUNTER_Y + 3, STAGE_W * 0.7, COUNTER_Y - 2, STAGE_W + 1200, COUNTER_Y + 2], rng, 7)
  line(g, [-1200, COUNTER_Y + 30, STAGE_W * 0.4, COUNTER_Y + 28, STAGE_W + 1200, COUNTER_Y + 32], rng, 6)
}

/** The board the pizza lies on, with its handle. */
export function paintBoard(g: Pen): void {
  const rng = makeRng(seedFrom('board'))
  const handle = roundRect(BOARD.x - 30, BOARD.y + BOARD.r - 26, 60, 80, 22, 4)
  figure(g, handle, '#d9a066', rng, 1.2, 6, 13)
  figure(g, ellipse(BOARD.x, BOARD.y, BOARD.r, BOARD.r, 40), '#d9a066', rng, 0.12, 7, 15)
}

/** The oven: a brick dome with a dark mouth and a chimney. `glow` 0 to 1 lights the mouth. */
export function paintOven(g: Pen, glow: number): void {
  const rng = makeRng(seedFrom('oven'))
  const { x, y, w, h } = OVEN
  figure(g, roundRect(x + w * 0.16, y - h * 0.68, w * 0.2, h * 0.3, 8, 3), '#b9543f', rng, 1.3, 6, 13)
  const dome = smooth([x - w / 2, y + h / 2, x - w / 2, y - h * 0.1, x - w * 0.3, y - h * 0.46, x, y - h * 0.54, x + w * 0.3, y - h * 0.46, x + w / 2, y - h * 0.1, x + w / 2, y + h / 2], 6)
  figure(g, dome, '#e2674a', rng, -0.2, 8, 17)
  // A few bricks, as a child draws them.
  for (const [bx, by] of [[-0.3, -0.24], [0.26, -0.3], [-0.36, 0.34], [0.34, 0.3], [0, -0.42]] as const) outline(g, roundRect(x + bx * w - 20, y + by * h - 10, 40, 20, 4, 2), rng, 4)
  const mouth = smooth([x - w * 0.34, y + h * 0.3, x - w * 0.34, y - h * 0.02, x - w * 0.18, y - h * 0.2, x + w * 0.18, y - h * 0.2, x + w * 0.34, y - h * 0.02, x + w * 0.34, y + h * 0.3], 5)
  plain(g, mouth, glow > 0.5 ? '#ffb347' : '#4a2a2e', 7)
  if (glow <= 0.5) figure(g, smooth([x - w * 0.2, y + h * 0.28, x - w * 0.1, y + h * 0.12, x, y + h * 0.2, x + w * 0.1, y + h * 0.1, x + w * 0.2, y + h * 0.28], 4), '#ff9d2e', rng, 0.8, 4, 9)
}

/** The pizza base: a coloured-in crust round a plain, pale top. Drawn about (0, 0). */
export function paintPizza(g: Pen, baked: boolean): void {
  const rng = makeRng(seedFrom('pizza'))
  figure(g, ellipse(0, 0, PIZZA.r, PIZZA.r, 40), baked ? '#d98b3a' : '#f0c98a', rng, 0.5, 7, 15)
  plain(g, ellipse(0, 0, PIZZA.r * 0.9, PIZZA.r * 0.9, 40), baked ? '#ffe9b0' : PIZZA_TOP, 4, baked ? '#b8742c' : '#d6a85e')
}

/** One piece, plain, about (0, 0). */
export function paintPiece(g: Pen, kind: Kind, r: number, baked = false): void {
  plain(g, pieceRing(kind, 0, 0, r), LOOKS[kind].fill, Math.max(3, r * 0.19), baked ? '#3a2416' : INK)
}

/** A tub of one kind, about the middle of its rim: a coloured-in bowl with a heap of plain pieces in it. */
export function paintTub(g: Pen, kind: Kind): void {
  const rng = makeRng(seedFrom('tub' + kind))
  const r = TUB.r
  // The heap first, so the bowl's front covers its feet.
  for (const [hx, hy, turn] of [[-0.42, -0.28, -0.5], [0.4, -0.3, 0.7], [0, -0.52, 0.2], [-0.1, -0.12, 1.4], [0.3, -0.02, -1]] as const) {
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
  const w = big ? 86 : 52, h = big ? 34 : 24
  const roll = roundRect(-w / 2, -h / 2, w, h, h / 2, 4)
  solid(g, roll, '#ffffff')
  outline(g, roll, rng, 5)
  line(g, [-w * 0.1, -h / 2, -w * 0.14, h / 2], rng, 4, '#e2574c')
  line(g, [w * 0.1, -h / 2, w * 0.06, h / 2], rng, 4, '#e2574c')
}

/** Every sprite the view stamps, made once for a density. */
export type Scenery = {
  wall: Sprite
  lip: Sprite
  board: Sprite
  oven: Sprite
  pizza: Sprite
  pizzaBaked: Sprite
  card: Sprite
  roll: Sprite
  bigRoll: Sprite
  tubs: Record<Kind, Sprite>
  pieces: Record<Kind, Sprite>
}

export function makeScenery(density: number, kinds: readonly Kind[], view: { x: number; y: number; w: number; h: number }): Scenery {
  const each = <T,>(make: (kind: Kind) => T): Record<Kind, T> => Object.fromEntries(kinds.map((kind) => [kind, make(kind)])) as Record<Kind, T>
  const disc = { x: -PIZZA.r, y: -PIZZA.r, w: PIZZA.r * 2, h: PIZZA.r * 2 }
  return {
    wall: sprite(view, density, 0, paintWall),
    lip: sprite({ x: view.x, y: COUNTER_Y - 8, w: view.w, h: 48 }, density, 0, paintLip),
    board: sprite({ x: BOARD.x - BOARD.r, y: BOARD.y - BOARD.r, w: BOARD.r * 2, h: BOARD.r * 2 + 54 }, density, 24, paintBoard),
    oven: sprite({ x: OVEN.x - OVEN.w / 2, y: OVEN.y - OVEN.h * 0.8, w: OVEN.w, h: OVEN.h * 1.3 }, density, 24, (g) => paintOven(g, 0)),
    pizza: sprite(disc, density, 24, (g) => paintPizza(g, false)),
    pizzaBaked: sprite(disc, density, 24, (g) => paintPizza(g, true)),
    card: sprite({ x: 0, y: 0, w: CARD.w, h: CARD.h }, density, 12, paintCard),
    roll: sprite({ x: -30, y: -16, w: 60, h: 32 }, density, 8, (g) => paintRoll(g, false)),
    bigRoll: sprite({ x: -46, y: -20, w: 92, h: 40 }, density, 8, (g) => paintRoll(g, true)),
    tubs: each((kind) => sprite({ x: -TUB.r, y: -TUB.r, w: TUB.r * 2, h: TUB.r * 1.9 }, density, 22, (g) => paintTub(g, kind))),
    pieces: each((kind) => sprite({ x: -PIECE_R, y: -PIECE_R, w: PIECE_R * 2, h: PIECE_R * 2 }, density, 6, (g) => paintPiece(g, kind, PIECE_R))),
  }
}

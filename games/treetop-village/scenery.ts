import { C, INK, PAPER, blob, card, curve, fold, line, poly, print, printRng, round, type G, type SpriteDef } from './paint'
import { STAGE } from './stage'
import { BASKET, CROWN, HOME, KIND_COUNT, LANDINGS, SUN, TRUNK_X, onOak, trunkHalf, type Folk, type Landing } from './tree'

// The open book and everything that stands still in it, painted once: the
// back page with its printed sky, two rows of hills standing in front of it,
// the base page with its meadow, the great oak with its limbs and doors, the
// stump and the toadstool at the sides, the basket along the front. Nothing
// here answers a touch as a piece does, so all of it is lower in contrast
// than the pale pieces and the pegs.

const FOLD_Y = 612
const farHill = (x: number): number => 404 + 22 * Math.sin(x / 150 + 0.8) + 9 * Math.sin(x / 47)
const nearHill = (x: number): number => 512 + 20 * Math.sin(x / 190 + 2.2) + 6 * Math.sin(x / 61)

const ridge = (top: (x: number) => number, base: number) => (g: G): void => {
  g.beginPath()
  g.moveTo(-10, base)
  for (let x = -10; x <= STAGE.width + 10; x += 10) g.lineTo(x, top(x))
  g.lineTo(STAGE.width + 10, base)
  g.closePath()
}

function house(g: G, x: number, y: number, s: number, roof: string): void {
  card(g, round(x - 13 * s, y - 16 * s, 26 * s, 18 * s, 2), PAPER, 2)
  card(g, poly([[x - 17 * s, y - 15 * s], [x, y - 31 * s], [x + 17 * s, y - 15 * s]]), roof, 2)
  print(g, round(x - 3 * s, y - 9 * s, 6 * s, 10 * s, 1), C.barkDark)
}

function bush(g: G, x: number, y: number, s: number, colour: string, berries: string): void {
  card(g, (g2) => { g2.beginPath(); g2.arc(x - 34 * s, y - 20 * s, 30 * s, 0, 7); g2.arc(x, y - 36 * s, 40 * s, 0, 7); g2.arc(x + 38 * s, y - 22 * s, 32 * s, 0, 7); g2.rect(x - 64 * s, y - 22 * s, 134 * s, 24 * s) }, colour)
  const dots = printRng(Math.round(x * 7 + y))
  for (let i = 0; i < 7; i++) print(g, blob(x - 50 * s + dots() * 100 * s, y - 10 * s - dots() * 44 * s, 4 * s), berries)
  fold(g, x - 62 * s, x + 68 * s, y)
  tab(g, x + 4 * s, y + 5)
}

function flower(g: G, x: number, y: number, tall: number, colour: string): void {
  curve(g, x, y, x + 6, y - tall / 2, x, y - tall, C.leafD, 5)
  card(g, blob(x + 12, y - tall * 0.4, 14, 6, -0.5), C.leafB, 2)
  for (let i = 0; i < 6; i++) card(g, blob(x + 13 * Math.cos(i * 1.047), y - tall + 13 * Math.sin(i * 1.047), 9), colour, 1)
  print(g, blob(x, y - tall, 8), C.gold)
}

function mushroom(g: G, x: number, y: number, s: number): void {
  card(g, round(x - 7 * s, y - 26 * s, 14 * s, 28 * s, 5 * s), C.cream, 2)
  card(g, (g2) => { g2.beginPath(); g2.moveTo(x - 26 * s, y - 24 * s); g2.quadraticCurveTo(x, y - 62 * s, x + 26 * s, y - 24 * s); g2.closePath() }, C.red, 2)
  print(g, blob(x - 9 * s, y - 34 * s, 4 * s), C.cream)
  print(g, blob(x + 8 * s, y - 38 * s, 5 * s), C.cream)
}

/** A paper tab pushed through a slit in the page: how a pop-up card is held down. */
function tab(g: G, x: number, y: number): void {
  line(g, [[x - 17, y], [x + 17, y]], 'rgba(58, 40, 22, 0.45)', 2)
  card(g, poly([[x - 12, y + 1], [x + 12, y + 1], [x + 8, y + 12], [x - 8, y + 12]]), PAPER, 1)
}

/** A limb with a flat top to stand on, growing from the trunk out to its tip. */
function limb(g: G, pad: Landing): void {
  const left = pad.x1 < TRUNK_X
  const tip = left ? pad.x0 - 16 : pad.x1 + 16
  const root = left ? TRUNK_X - trunkHalf(pad.y) + 14 : TRUNK_X + trunkHalf(pad.y) - 14
  const y = pad.y
  card(g, (g2) => {
    g2.beginPath()
    g2.moveTo(tip, y)
    g2.lineTo(root, y)
    g2.lineTo(root, y + 54)
    g2.quadraticCurveTo((tip + root) / 2, y + 30, tip + (left ? 6 : -6), y + 16)
    g2.closePath()
  }, C.trunk, 4)
  print(g, poly([[tip, y], [root, y], [root, y + 8], [tip + (left ? 3 : -3), y + 8]]), C.top)
  const grain = printRng(pad.y + Math.round(tip))
  for (let i = 0; i < 4; i++) {
    const x = tip + (root - tip) * (0.2 + 0.2 * i + grain() * 0.08)
    line(g, [[x, y + 14 + grain() * 6], [x + (left ? 22 : -22), y + 22 + grain() * 8]], C.barkDark, 2.5)
  }
}

function doors(g: G): void {
  // The squirrel's round red door, on the middle left limb.
  const squirrel = HOME.squirrel.door
  card(g, blob(squirrel.x, squirrel.y - 36, 28, 33), C.red)
  print(g, blob(squirrel.x + 14, squirrel.y - 34, 3.5), C.gold)
  print(g, round(squirrel.x - 13, squirrel.y - 52, 22, 5, 2), C.barkDark)
  // The owl's hollow, on the high right limb: a dark hole with a pale rim.
  const owl = HOME.owl.door
  card(g, blob(owl.x, owl.y - 40, 27, 34), C.top)
  print(g, blob(owl.x, owl.y - 38, 21, 28), '#5a3a22')
  // The twins' small double door, on the low right limb.
  const mice = HOME.mice.door
  card(g, (g2) => { g2.beginPath(); g2.moveTo(mice.x - 22, mice.y - 2); g2.lineTo(mice.x - 22, mice.y - 34); g2.quadraticCurveTo(mice.x, mice.y - 62, mice.x + 22, mice.y - 34); g2.lineTo(mice.x + 22, mice.y - 2); g2.closePath() }, C.blue)
  line(g, [[mice.x, mice.y - 4], [mice.x, mice.y - 46]], '#2c4f8c', 2.5)
  print(g, blob(mice.x + 6, mice.y - 22, 2.8), C.gold)
  // The beetle's low green door between the roots.
  const beetle = HOME.beetle.door
  card(g, (g2) => { g2.beginPath(); g2.moveTo(beetle.x - 30, beetle.y + 2); g2.lineTo(beetle.x - 30, beetle.y - 34); g2.quadraticCurveTo(beetle.x, beetle.y - 76, beetle.x + 30, beetle.y - 34); g2.lineTo(beetle.x + 30, beetle.y + 2); g2.closePath() }, C.leafD)
  print(g, blob(beetle.x, beetle.y - 40, 9), C.lamp)
  print(g, blob(beetle.x + 18, beetle.y - 22, 3.5), C.gold)
}

function oak(g: G): void {
  // The crown behind everything: big dark leaf cards, with the two boughs going up into them.
  CROWN.forEach((leaf, index) => card(g, blob(leaf.x, leaf.y, leaf.rx, leaf.ry), index < 3 ? C.leafD : C.leafA, 5))
  const side = (y: number, sign: number): number => TRUNK_X + sign * trunkHalf(y)
  card(g, (g2) => {
    g2.beginPath()
    g2.moveTo(side(716, -1) - 44, 716)
    g2.quadraticCurveTo(side(690, -1) - 6, 700, side(640, -1), 640)
    for (let y = 640; y >= 190; y -= 30) g2.lineTo(side(y, -1), y)
    g2.quadraticCurveTo(530, 120, 468, 70)
    g2.lineTo(498, 54)
    g2.quadraticCurveTo(560, 110, 590, 150)
    g2.quadraticCurveTo(620, 110, 682, 54)
    g2.lineTo(712, 70)
    g2.quadraticCurveTo(650, 120, side(190, 1), 190)
    for (let y = 190; y <= 640; y += 30) g2.lineTo(side(y, 1), y)
    g2.quadraticCurveTo(side(690, 1) + 6, 700, side(716, 1) + 44, 716)
    g2.closePath()
  }, C.trunk, 5)
  // Printed bark: a few long dark strokes and a pale side.
  const grain = printRng(77)
  for (let i = 0; i < 16; i++) {
    const y = 200 + grain() * 440, x = TRUNK_X + (grain() - 0.5) * 1.5 * trunkHalf(y)
    curve(g, x, y, x + 5, y + 22, x - 2, y + 44 + grain() * 20, C.barkDark, 3)
  }
  for (let y = 210; y < 640; y += 86) curve(g, side(y, -1) + 9, y, side(y + 30, -1) + 12, y + 30, side(y + 60, -1) + 10, y + 60, C.barkLight, 5)
  for (const pad of LANDINGS.slice(1)) if (pad.id !== 'farL' && pad.id !== 'farR') limb(g, pad)
  // Leaf cards over the fork, so the boughs go into the crown.
  for (const [x, y, r] of [[470, 60, 62], [706, 58, 62], [590, 86, 54]] as const) card(g, blob(x, y, r, r * 0.8), C.leafB, 3)
  doors(g)
  fold(g, side(716, -1) - 40, side(716, 1) + 40, 716)
  tab(g, side(716, -1) - 16, 722)
  tab(g, side(716, 1) + 16, 722)
}

function stump(g: G): void {
  const pad = LANDINGS[5]
  card(g, poly([[pad.x0 + 10, pad.y + 6], [pad.x1 - 10, pad.y + 6], [pad.x1 + 2, 708], [pad.x0 - 2, 708]]), '#c58b52', 4)
  const grain = printRng(5)
  for (let i = 0; i < 7; i++) { const x = pad.x0 + 20 + grain() * 110, y = 450 + grain() * 190; curve(g, x, y, x + 4, y + 20, x - 1, y + 40, C.barkDark, 3) }
  card(g, blob(pad.x0 + 76, 560, 17, 22), '#5a3a22', 1)
  card(g, round(pad.x0 - 6, pad.y, pad.x1 - pad.x0 + 12, 13, 6), C.top, 3)
  for (const r of [56, 34, 14]) curve(g, pad.x0 + 78 - r, pad.y + 6, pad.x0 + 78, pad.y + 10, pad.x0 + 78 + r, pad.y + 6, C.woodDark, 1.5)
  // A side shoot with two leaves, so the stump is still alive.
  curve(g, pad.x1 - 4, 520, pad.x1 + 26, 506, pad.x1 + 30, 476, C.barkDark, 5)
  card(g, blob(pad.x1 + 38, 468, 17, 9, -0.7), C.leafB, 2)
  card(g, blob(pad.x1 + 14, 484, 14, 8, 0.5), C.leafC, 2)
  fold(g, pad.x0 - 6, pad.x1 + 6, 708)
  tab(g, pad.x0 + 40, 713)
  tab(g, pad.x1 - 40, 713)
}

function toadstool(g: G): void {
  const pad = LANDINGS[6]
  const cx = (pad.x0 + pad.x1) / 2
  card(g, (g2) => { g2.beginPath(); g2.moveTo(cx - 30, 470); g2.quadraticCurveTo(cx - 20, 600, cx - 44, 708); g2.lineTo(cx + 44, 708); g2.quadraticCurveTo(cx + 20, 600, cx + 30, 470); g2.closePath() }, C.cream, 4)
  card(g, (g2) => { g2.beginPath(); g2.moveTo(cx - 62, 476); g2.quadraticCurveTo(cx, 498, cx + 62, 476); g2.lineTo(cx + 54, 488); g2.quadraticCurveTo(cx, 512, cx - 54, 488); g2.closePath() }, PAPER, 2)
  card(g, (g2) => {
    g2.beginPath()
    g2.moveTo(pad.x0 - 28, 478)
    g2.quadraticCurveTo(pad.x0 - 24, pad.y + 2, pad.x0 + 6, pad.y)
    g2.lineTo(pad.x1 - 6, pad.y)
    g2.quadraticCurveTo(pad.x1 + 24, pad.y + 2, pad.x1 + 28, 478)
    g2.quadraticCurveTo(cx, 496, pad.x0 - 28, 478)
    g2.closePath()
  }, C.red, 4)
  for (const [x, y, r] of [[-52, 458, 9], [-14, 462, 12], [30, 456, 10], [62, 466, 7], [-78, 468, 6]] as const) print(g, blob(cx + x, y, r, r * 0.7), C.cream)
  fold(g, cx - 46, cx + 46, 708)
  tab(g, cx, 713)
}

function basket(g: G): void {
  const { x0, x1, y0, y1 } = BASKET
  card(g, round(x0 - 16, y0 - 8, x1 - x0 + 32, y1 - y0 + 12, 20), C.basket, 4)
  for (let x = x0 - 6; x < x1 + 10; x += 14) line(g, [[x, y0 - 5], [x + 5, y0 + 1]], C.basketDark, 2.5)
  for (let x = x0 - 6; x < x1 + 10; x += 14) line(g, [[x + 5, y1 - 1], [x, y1 + 3]], C.basketDark, 2.5)
  print(g, round(x0, y0 + 2, x1 - x0, y1 - y0 - 6, 10), C.felt)
  const step = (x1 - x0) / KIND_COUNT
  for (let i = 1; i < KIND_COUNT; i++) line(g, [[x0 + step * i, y0 + 8], [x0 + step * i, y1 - 10]], 'rgba(255, 250, 240, 0.16)', 2)
}

function drawBackdrop(g: G): void {
  const { width, height } = STAGE
  // The back page: printed sky, paler towards the hills, with the book's gutter down the middle.
  g.fillStyle = C.sky
  g.fillRect(0, 0, width, FOLD_Y)
  g.fillStyle = C.skyLow
  g.fillRect(0, 300, width, FOLD_Y - 300)
  const speck = printRng(11)
  g.fillStyle = 'rgba(255, 255, 255, 0.5)'
  for (let i = 0; i < 90; i++) g.fillRect(speck() * width, speck() * 380, 2, 2)
  // The gutter of the book, down the middle of the back page.
  const gutter = g.createLinearGradient(TRUNK_X - 46, 0, TRUNK_X + 46, 0)
  gutter.addColorStop(0, 'rgba(58, 40, 22, 0)')
  gutter.addColorStop(0.5, 'rgba(58, 40, 22, 0.2)')
  gutter.addColorStop(1, 'rgba(58, 40, 22, 0)')
  g.fillStyle = gutter
  g.fillRect(TRUNK_X - 46, 0, 92, FOLD_Y)
  // The slot the sun's tab slides in.
  line(g, [[SUN.x, SUN.y], [SUN.x, 420]], 'rgba(60, 90, 110, 0.25)', 5)
  card(g, ridge(farHill, FOLD_Y), C.hillFar, 4)
  house(g, 262, farHill(262) + 4, 1, C.red)
  house(g, 300, farHill(300) + 6, 0.8, C.blue)
  house(g, 1132, farHill(1132) + 4, 0.9, C.red)
  card(g, ridge(nearHill, FOLD_Y), C.hillNear, 4)
  const tuft = printRng(3)
  for (let i = 0; i < 40; i++) { const x = tuft() * width, y = nearHill(x) + 14 + tuft() * 70; line(g, [[x - 5, y], [x, y - 8], [x + 5, y]], C.meadowDark, 2.5) }
  // A fence along the near hill.
  for (let x = 16; x < 250; x += 26) card(g, round(x, nearHill(x) - 22, 8, 30, 3), PAPER, 1)
  line(g, [[12, nearHill(12) - 10], [250, nearHill(250) - 10]], PAPER, 4)
  for (let x = 930; x < 1170; x += 26) card(g, round(x, nearHill(x) - 22, 8, 30, 3), PAPER, 1)
  line(g, [[926, nearHill(926) - 10], [1170, nearHill(1170) - 10]], PAPER, 4)

  // The base page: a printed meadow, the fold where it meets the back page, and a path to the beetle's door.
  g.fillStyle = C.meadow
  g.fillRect(0, FOLD_Y, width, height - FOLD_Y)
  g.fillStyle = 'rgba(58, 40, 22, 0.16)'
  g.fillRect(0, FOLD_Y, width, 7)
  g.fillStyle = 'rgba(255, 250, 240, 0.6)'
  g.fillRect(0, FOLD_Y - 2, width, 2)
  print(g, (g2) => { g2.beginPath(); g2.moveTo(560, 716); g2.quadraticCurveTo(520, 740, 180, 752); g2.lineTo(120, 800); g2.quadraticCurveTo(480, 790, 624, 716); g2.closePath() }, C.path)
  const patch = printRng(21)
  for (let i = 0; i < 26; i++) print(g, blob(patch() * width, 640 + patch() * 170, 26 + patch() * 40, 7 + patch() * 6), C.meadowDark)
  for (let i = 0; i < 60; i++) { const x = patch() * width, y = 628 + patch() * 180; print(g, blob(x, y, 3.5), [PAPER, C.gold, C.pink][i % 3]) }
  const crease = g.createLinearGradient(TRUNK_X - 60, 0, TRUNK_X + 60, 0)
  crease.addColorStop(0, 'rgba(58, 40, 22, 0)')
  crease.addColorStop(0.5, 'rgba(58, 40, 22, 0.22)')
  crease.addColorStop(1, 'rgba(58, 40, 22, 0)')
  g.fillStyle = crease
  g.fillRect(TRUNK_X - 60, FOLD_Y, 120, height - FOLD_Y)
  line(g, [[TRUNK_X, FOLD_Y], [TRUNK_X, height]], 'rgba(255, 250, 240, 0.5)', 1.5)

  bush(g, 196, 664, 1.25, C.leafA, C.red)
  bush(g, 1004, 660, 1.2, C.leafA, C.gold)
  bush(g, 372, 650, 0.8, C.leafB, C.pink)
  bush(g, 826, 650, 0.85, C.leafB, C.red)
  stump(g)
  toadstool(g)
  oak(g)

  // Along the front of the page: flowers at the left, mushrooms at the right, the basket between them.
  flower(g, 44, 812, 92, C.red)
  flower(g, 214, 806, 60, C.pink)
  flower(g, 1150, 812, 78, C.gold)
  mushroom(g, 986, 806, 1.15)
  mushroom(g, 1040, 812, 0.8)
  mushroom(g, 1094, 800, 1.0)
  basket(g)
  // The edges of the pages underneath, along the front and up both sides.
  for (let i = 0; i < 4; i++) {
    const colour = i % 2 === 0 ? '#f3ead6' : '#cfc2a8'
    line(g, [[0, 811.5 + i * 2.4], [width, 811.5 + i * 2.4]], colour, 2.4)
    line(g, [[1.2 + i * 2.4, 0], [1.2 + i * 2.4, height]], colour, 2.4)
    line(g, [[width - 1.2 - i * 2.4, 0], [width - 1.2 - i * 2.4, height]], colour, 2.4)
  }
}

/** The stars of the evening sheet, printed where the day's sky is: scattered, of no two sizes alike, and none in a row. */
function stars(g: G): void {
  const at = printRng(41)
  for (let i = 0; i < 140; i++) {
    const x = 14 + at() * (STAGE.width - 28), y = 10 + at() * 400, r = 1.2 + at() * at() * 3.2
    // Only where the day's sky is: not on a hill or a roof, the oak, a limb, the stump or the toadstool.
    if (y > farHill(x) - 44 || onOak({ x, y }) || LANDINGS.some((pad) => x > pad.x0 - 24 && x < pad.x1 + 24 && y > pad.y - 12 && y < pad.y + 60)) continue
    print(g, blob(x, y, r), i % 5 === 0 ? '#ffe9a8' : '#f4f1ff')
  }
}

/** `night` is what the evening sheet adds once the page is under it. */
export const backdropSprite: SpriteDef = { x: 0, y: 0, w: STAGE.width, h: STAGE.height, draw: drawBackdrop, night: stars }

/** One leaf card of the crown: a clump of round leaves in three greens with a few gold ones, pinned at its middle. */
export function leafSprite(index: number): SpriteDef {
  return {
    x: -190, y: -130, w: 380, h: 260,
    draw: (g) => {
      const at = printRng(100 + index * 13)
      const greens = [C.leafA, C.leafB, C.leafC, C.leafB, C.leafA, C.leafC, C.leafB]
      greens.forEach((colour, i) => {
        const x = -110 + (i % 4) * 72 + at() * 26, y = -44 + Math.floor(i / 4) * 62 + at() * 30
        card(g, blob(x, y, 62 + at() * 16, 50 + at() * 10), colour, 4)
      })
      for (let i = 0; i < 9; i++) {
        const x = -140 + at() * 280, y = -70 + at() * 150, turn = at() * 3
        card(g, blob(x, y, 15, 8, turn), i % 4 === 0 ? C.gold : C.leafD, 1)
        line(g, [[x - 11 * Math.cos(turn), y - 11 * Math.sin(turn)], [x + 11 * Math.cos(turn), y + 11 * Math.sin(turn)]], 'rgba(255, 250, 240, 0.55)', 1.5)
      }
      // Two acorns hang under it.
      for (const x of [-60 + index * 14, 70 - index * 9]) { line(g, [[x, 70], [x, 84]], C.barkDark, 2); card(g, blob(x, 94, 7, 9), C.barkLight, 1); print(g, round(x - 8, 84, 16, 7, 3), C.barkDark) }
    },
  }
}

/** The sun on its tab: a round card with paper rays and a sleepy face. */
export const sunSprite: SpriteDef = {
  x: -70, y: -70, w: 140, h: 200,
  draw: (g) => {
    card(g, round(-8, 20, 16, 104, 4), PAPER, 2)
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; card(g, poly([[52 * Math.cos(a - 0.16), 52 * Math.sin(a - 0.16)], [66 * Math.cos(a), 66 * Math.sin(a)], [52 * Math.cos(a + 0.16), 52 * Math.sin(a + 0.16)]]), '#f6b23c', 1) }
    card(g, blob(0, 0, 46), C.gold)
    print(g, blob(-24, 12, 9, 6), 'rgba(226, 80, 63, 0.35)')
    print(g, blob(24, 12, 9, 6), 'rgba(226, 80, 63, 0.35)')
    curve(g, -24, -4, -16, 4, -8, -4, INK, 3)
    curve(g, 8, -4, 16, 4, 24, -4, INK, 3)
    curve(g, -10, 16, 0, 26, 10, 16, INK, 3)
  },
}

/** The moon on the other face of the same tab: a round pale card, asleep, in a nightcap. */
export const moonSprite: SpriteDef = {
  x: -70, y: -76, w: 140, h: 206,
  draw: (g) => {
    card(g, round(-8, 20, 16, 104, 4), PAPER, 2)
    const glow = g.createRadialGradient(0, 0, 30, 0, 0, 68)
    glow.addColorStop(0, 'rgba(250, 244, 214, 0.5)')
    glow.addColorStop(1, 'rgba(250, 244, 214, 0)')
    g.fillStyle = glow
    g.fillRect(-68, -68, 136, 136)
    card(g, blob(0, 0, 46), '#f7f0cf')
    print(g, blob(-18, -20, 9, 6, 0.4), 'rgba(160, 150, 120, 0.3)')
    print(g, blob(22, 22, 12, 8, -0.3), 'rgba(160, 150, 120, 0.3)')
    print(g, blob(-26, 20, 5, 4), 'rgba(160, 150, 120, 0.3)')
    card(g, (g2) => { g2.beginPath(); g2.moveTo(-34, -30); g2.quadraticCurveTo(-6, -64, 34, -34); g2.quadraticCurveTo(58, -40, 60, -10); g2.quadraticCurveTo(40, -30, 30, -24); g2.quadraticCurveTo(0, -40, -34, -30); g2.closePath() }, C.blue, 2)
    card(g, blob(60, -8, 7), PAPER, 1)
    curve(g, -24, 0, -16, 7, -8, 0, INK, 3)
    curve(g, 8, 0, 16, 7, 24, 0, INK, 3)
    print(g, blob(2, 20, 5, 6), INK)
  },
}

/** The light in a door when its owner is at home by night: warm light in the shape of the door's own opening. */
export function windowSprite(folk: Folk): SpriteDef {
  const door = HOME[folk].door
  const light = (g: G, x: number, y: number, r: number): void => {
    const glow = g.createRadialGradient(x, y, 2, x, y, r)
    glow.addColorStop(0, 'rgba(255, 226, 120, 0.8)')
    glow.addColorStop(1, 'rgba(255, 226, 120, 0)')
    g.fillStyle = glow
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  return {
    x: door.x - 60, y: door.y - 100, w: 120, h: 110,
    draw: (g) => {
      const pane = '#ffe68a'
      if (folk === 'squirrel') { light(g, door.x - 2, door.y - 36, 52); print(g, blob(door.x - 3, door.y - 34, 12, 14), pane) }
      else if (folk === 'owl') { light(g, door.x, door.y - 38, 56); print(g, blob(door.x, door.y - 38, 20, 27), pane); print(g, blob(door.x - 4, door.y - 30, 11, 15), '#fff6c8') }
      else if (folk === 'mice') { light(g, door.x, door.y - 42, 46); print(g, (g2) => { g2.beginPath(); g2.moveTo(door.x - 15, door.y - 36); g2.quadraticCurveTo(door.x, door.y - 58, door.x + 15, door.y - 36); g2.closePath() }, pane) }
      else { light(g, door.x, door.y - 40, 50); print(g, blob(door.x, door.y - 40, 10), '#fff6c8') }
    },
  }
}

export const cloudSprite = (wide: number): SpriteDef => ({
  x: -wide, y: -50, w: wide * 2, h: 100,
  draw: (g) => {
    card(g, (g2) => { g2.beginPath(); g2.arc(-wide * 0.42, 6, 24, 0, 7); g2.arc(-wide * 0.08, -8, 34, 0, 7); g2.arc(wide * 0.36, 4, 27, 0, 7); g2.rect(-wide * 0.5, 4, wide * 0.94, 26) }, PAPER, 4)
    curve(g, -wide * 0.3, 16, -wide * 0.1, 24, wide * 0.1, 16, 'rgba(120, 170, 200, 0.5)', 3)
  },
})

/** A small red bird on a coil of wire: the one thing in the tree that has nothing to do with building. */
export const birdSprite: SpriteDef = {
  x: -34, y: -30, w: 68, h: 92,
  draw: (g) => {
    g.beginPath()
    for (let i = 0; i <= 30; i++) { const y = 14 + i * 1.5, x = 7 * Math.sin(i * 0.9); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y) }
    g.strokeStyle = '#8a8f96'; g.lineWidth = 2; g.stroke()
    card(g, poly([[12, -4], [28, -12], [24, 4]]), '#b83a30', 1)
    card(g, blob(0, 0, 18, 14), C.red, 2)
    card(g, blob(-12, -10, 11), C.red, 2)
    card(g, poly([[-22, -12], [-32, -8], [-22, -5]]), C.gold, 1)
    print(g, blob(-14, -12, 2.6), INK)
    print(g, blob(3, 2, 9, 6, 0.4), '#b83a30')
  },
}

/** A snail at the foot of the page. */
export const snailSprite: SpriteDef = {
  x: -34, y: -40, w: 70, h: 46,
  draw: (g) => {
    card(g, round(-26, -9, 52, 11, 6), C.cream, 2)
    card(g, blob(-6, -17, 15), C.pink, 2)
    // The shell's turns as rings one inside the other, so that no hooked line is on it.
    print(g, blob(-6, -17, 10), '#c9788c')
    print(g, blob(-6, -17, 7), C.pink)
    print(g, blob(-6, -17, 3.5), '#c9788c')
    line(g, [[20, -8], [24, -22]], C.cream, 3)
    line(g, [[14, -8], [15, -21]], C.cream, 3)
    print(g, blob(24, -23, 2.6), INK)
    print(g, blob(15, -22, 2.6), INK)
  },
}

export const acornSprite: SpriteDef = { x: -12, y: -14, w: 24, h: 28, draw: (g) => { card(g, blob(0, 2, 7, 9), C.barkLight, 1); print(g, round(-8, -9, 16, 8, 3), C.barkDark) } }
export const fallenLeafSprite: SpriteDef = { x: -18, y: -12, w: 36, h: 24, draw: (g) => { card(g, blob(0, 0, 14, 7), C.leafC, 1); line(g, [[-11, 0], [11, 0]], 'rgba(255, 250, 240, 0.6)', 1.5) } }

/** The ghost hand: a pale paper hand, pinned by the tip of its finger. */
export const handSprite: SpriteDef = {
  x: -30, y: -10, w: 80, h: 100,
  draw: (g) => {
    g.globalAlpha = 0.9
    card(g, (g2) => { g2.beginPath(); g2.roundRect(-7, -2, 15, 46, 7); g2.roundRect(-10, 30, 44, 44, 14); g2.roundRect(8, 22, 12, 30, 6); g2.roundRect(21, 26, 11, 28, 5) }, PAPER, 3)
    g.globalAlpha = 1
    curve(g, -2, 44, 10, 50, 26, 46, 'rgba(58, 40, 22, 0.25)', 2)
  },
}

/** The glow of the idle ladder: a warm light, never a sign. */
export function drawGlow(g: G, x: number, y: number, r: number, alpha: number): void {
  const light = g.createRadialGradient(x, y, r * 0.1, x, y, r)
  light.addColorStop(0, `rgba(255, 236, 150, ${0.6 * alpha})`)
  light.addColorStop(1, 'rgba(255, 236, 150, 0)')
  g.fillStyle = light
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

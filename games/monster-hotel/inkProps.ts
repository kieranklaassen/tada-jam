// The hotel's fittings and the things a child can pick up, each drawn in its
// own units. What can be touched (the five things, the wheel, the coach door)
// carries the spot colour; the boiler, the coach, the bench, the luggage and
// the porter are ink alone. No dial or clock face carries a numeral.

import { PAPER, SPOT, type Pen } from './inkHatch'
import type { InkThingKind } from './inkScene'

/** The boiler in its bay: a riveted drum on a brick plinth, a pipe up through the ceiling, a heap of coal. Origin at the bay's top left. */
export function drawBoiler(pen: Pen, w: number, h: number): void {
  // Brick behind, lightly, and shadow under the ceiling.
  for (let y = 16, row = 0; y < h - 6; y += 13, row++) {
    pen.line([0, y, w, y], 0.5, true)
    for (let x = (row % 2 ? 10 : 24); x < w; x += 28) pen.line([x, y - 13, x, y], 0.5, true)
  }
  pen.tone([0, 0, w, 0, w, 12, 0, 20], 3, -0.5)
  pen.tone([w - 16, 0, w, 0, w, h, w - 8, h], 3, -1)
  pen.tone([0, h - 10, w, h - 10, w, h, 0, h], 3, 0)
  const cx = 74, top = 24, bot = h - 16, r = 44
  // The pipe: up from the dome and through the ceiling, and a branch with its stopcock.
  pen.tube([cx, top + 4, cx, -2], 13, PAPER, 1.4, true)
  pen.tone([cx + 1, -2, cx + 7, -2, cx + 7, top, cx + 1, top], 3, -1.2)
  pen.rect(cx - 10, 6, 20, 5, { fill: PAPER, w: 1.2 })
  pen.tube([cx + r - 4, 58, 150, 58, 150, -2], 8, PAPER, 1.3, true)
  pen.tone([151, -2, 154, -2, 154, 54, 151, 54], 3, -1.2)
  pen.ellipse(150, 34, 9, 3.2, { fill: PAPER, w: 1.2 })
  pen.line([150, 34, 150, 26], 1.2, true)
  // The drum, round in its hatching: bare on the lit side, crossed on the dark.
  pen.shape([cx - r, bot, cx - r, top + 22, cx - r + 10, top + 6, cx, top, cx + r - 10, top + 6, cx + r, top + 22, cx + r, bot], { fill: PAPER, w: 0 })
  pen.tone([cx + 6, top, cx + r, top + 10, cx + r, bot, cx + 6, bot], 2, -1.2)
  pen.tone([cx + 22, top + 4, cx + r, top + 14, cx + r, bot, cx + 22, bot], 4, -1.0)
  pen.tone([cx - r, top + 20, cx - r + 9, top + 12, cx - r + 9, bot, cx - r, bot], 2, -1.3)
  pen.shape([cx - r, bot, cx - r, top + 22, cx - r + 10, top + 6, cx, top, cx + r - 10, top + 6, cx + r, top + 22, cx + r, bot], { w: 1.8 })
  // Bands of rivets.
  for (const y of [top + 24, top + 50, bot - 6]) {
    pen.line([cx - r, y - 4, cx + r, y - 4], 0.8, true)
    pen.line([cx - r, y + 4, cx + r, y + 4], 0.8, true)
    for (let x = cx - r + 6; x < cx + r - 2; x += 9) pen.ellipse(x, y, 1.7, 1.7, { fill: PAPER, w: 0.9 })
  }
  // The fire door, the gauge with its one needle, the safety valve.
  pen.rect(cx - 30, top + 58, 30, 22, { fill: PAPER, tone: 4, angle: 0, w: 1.4 })
  for (let x = cx - 25; x < cx - 2; x += 6) pen.line([x, top + 61, x, top + 77], 1.6, true, PAPER)
  pen.rect(cx - 34, top + 62, 5, 5, { fill: PAPER, w: 1 })
  pen.rect(cx - 34, top + 72, 5, 5, { fill: PAPER, w: 1 })
  pen.ellipse(cx - 14, top + 37, 9, 9, { fill: PAPER, w: 1.4 })
  pen.line([cx - 14, top + 37, cx - 9, top + 31], 1.2, true)
  pen.dot(cx - 14, top + 37, 1.3)
  pen.rect(cx - 30, bot, 2 * r - 28, 8, { fill: PAPER, tone: 2, angle: 0, w: 1.3 })
  pen.rect(cx - r - 4, bot + 8, 2 * r + 8, 8, { fill: PAPER, tone: 3, angle: 0, w: 1.3 })
  // Coal, and the shovel stood in it.
  pen.line([186, h - 12, 170, 44], 2.4, true)
  pen.shape([164, 44, 176, 42, 177, 36, 163, 38], { fill: PAPER, w: 1.2, sharp: true })
  pen.shape([134, h - 8, 142, h - 24, 154, h - 30, 164, h - 40, 176, h - 34, 184, h - 22, 196, h - 16, w - 2, h - 8], { fill: PAPER, tone: 4, angle: -0.3, w: 1.5 })
  for (let i = 0; i < 9; i++) pen.ellipse(144 + pen.next() * 46, h - 14 - pen.next() * 16, 3.5, 2.6, { w: 0.9 }, pen.next())
}

/** A potted palm of the sort that stands in every lobby. Origin at the foot of the pot. */
export function drawPalm(pen: Pen): void {
  for (let i = 0; i < 7; i++) {
    const a = -2.75 + i * 0.4, len = 40 + (i % 2) * 12
    const tx = Math.cos(a) * len * 0.55, ty = -34 + Math.sin(a) * len
    pen.shape([0, -30, tx * 0.5 - 3, (ty - 30) / 2 - 4, tx, ty, tx * 0.5 + 3, (ty - 30) / 2 + 3], { fill: PAPER, tone: i % 2 ? 2 : 1, angle: a, w: 1.1 })
  }
  pen.shape([-10, -30, 10, -30, 7, 0, -7, 0], { fill: PAPER, tone: 3, angle: -1.2, w: 1.4, sharp: true })
  pen.rect(-12, -34, 24, 5, { fill: PAPER, w: 1.2 })
}

/** The bench, front on: two planks for a back, one for a seat, iron ends. Origin at its bottom left. */
export function drawBench(pen: Pen, w: number, h: number): void {
  pen.tone([4, -30, w - 4, -30, w - 8, -2, 8, -2], 3, 0.1)
  for (const x of [5, w - 5]) {
    pen.tube([x, -h + 4, x, 0], 3.5, PAPER, 1.2, true)
    pen.line([x - 6, 0, x + 6, 0], 1.6, true)
    pen.ellipse(x, -h + 3, 3.2, 3.2, { fill: PAPER, w: 1.2 })
  }
  pen.rect(0, -h + 10, w, 9, { fill: PAPER, w: 1.3 })
  pen.rect(0, -h + 23, w, 9, { fill: PAPER, w: 1.3 })
  pen.rect(-3, -36, w + 6, 7, { fill: PAPER, tone: 1, angle: 0, w: 1.4 })
}

/** The mountain of luggage beside the bench. Origin at its bottom left. */
export function drawLuggage(pen: Pen, w: number, h: number): void {
  // An umbrella and a rolled rug lean behind.
  pen.line([w - 6, -4, w - 16, -h + 6], 2, true)
  pen.line([w - 16, -h + 6, w - 21, -h + 2, w - 23, -h + 8], 1.5)
  // A steamer trunk at the bottom, banded and studded.
  pen.rect(1, -34, w - 3, 34, { fill: PAPER, tone: 3, angle: -1.2, w: 1.6 })
  for (const x of [12, w - 14]) pen.rect(x - 3, -34, 6, 34, { fill: PAPER, w: 1 })
  pen.rect(w / 2 - 5, -24, 10, 9, { fill: PAPER, w: 1.1 })
  for (let x = 5; x < w - 2; x += 8) pen.dot(x, -31, 0.8)
  // A suitcase lying across it, with a blank tag on a string.
  local2(pen, 4, -35, -0.07, () => {
    pen.rect(0, -19, w - 12, 19, { fill: PAPER, tone: 2, angle: 0.3, w: 1.5 })
    pen.line([0, -13, w - 12, -13], 0.7, true)
    pen.line([18, -19, 20, -24, 30, -24, 32, -19], 1.3)
    pen.line([w - 14, -8, w - 9, -2], 0.7, true)
    pen.shape([w - 12, -3, w - 5, -5, w - 3, 2, w - 10, 4], { fill: PAPER, w: 0.9, sharp: true })
  })
  // A carpet bag, a hat box and, on top of everything, an empty bird cage.
  pen.shape([6, -56, 8, -70, 16, -76, 28, -76, 34, -70, 36, -56], { fill: PAPER, tone: 4, angle: 0.7, w: 1.5 })
  pen.line([14, -76, 16, -82, 26, -82, 28, -76], 1.3)
  pen.rect(36, -72, 22, 17, { fill: PAPER, tone: 1, angle: -1.3, w: 1.4 })
  pen.ellipse(47, -72, 12, 3.4, { fill: PAPER, w: 1.3 })
  pen.line([36, -62, 58, -62], 0.7, true)
  const cx = 26, top = -h + 2, base = -82
  pen.shape([cx - 11, base, cx - 11, top + 12, cx - 7, top + 4, cx, top, cx + 7, top + 4, cx + 11, top + 12, cx + 11, base], { fill: PAPER, w: 1.3 })
  for (let x = cx - 7; x <= cx + 7; x += 3.5) pen.line([x, base, x, top + 3 + Math.abs(x - cx) * 0.7], 0.7, true)
  pen.line([cx - 11, base - 8, cx + 11, base - 8], 0.7, true)
  pen.rect(cx - 13, base - 1, 26, 3, { fill: PAPER, tone: 4, w: 1.1 })
  pen.ellipse(cx, top - 3, 2.6, 2.6, { w: 1.1 })
}

/** Runs `draw` turned a little about a point. */
function local2(pen: Pen, x: number, y: number, turn: number, draw: () => void): void {
  const g = pen.ctx
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  draw()
  g.restore()
}

/**
 * The coach at the kerb: a charabanc with its blinds drawn, bonnet to the
 * right. Origin at its top left. The door is left as a gap `doorW` wide at
 * `doorX`: it can be touched, so it is drawn apart, in the spot colour.
 */
export function drawCoach(pen: Pen, w: number, h: number, doorX: number, doorW: number, open = false): void {
  const sill = h - 34, deck = 22, cabin = w - 62
  // Shadow on the road.
  pen.tone([4, h - 6, w - 2, h - 6, w - 10, h + 2, 12, h + 2], 4, 0)
  // Trunks roped to the roof rack.
  pen.rect(18, 4, 34, deck - 6, { fill: PAPER, tone: 3, angle: -1.2, w: 1.3 })
  pen.shape([58, deck - 2, 60, 8, 70, 3, 84, 4, 92, 10, 94, deck - 2], { fill: PAPER, tone: 2, angle: 0.5, w: 1.3 })
  pen.rect(100, 9, 26, deck - 11, { fill: PAPER, tone: 4, angle: 0.2, w: 1.3 })
  pen.line([10, deck - 2, 22, 2, 54, 4, 62, deck - 2], 0.7)
  pen.line([56, deck - 2, 76, 0, 98, 8, 128, 6, 134, deck - 2], 0.7)
  pen.line([8, deck - 3, cabin - 4, deck - 3], 1, true)
  for (let x = 10; x < cabin - 4; x += 16) pen.line([x, deck - 9, x, deck - 2], 0.9, true)
  pen.line([8, deck - 9, cabin - 4, deck - 9], 0.9, true)
  // The body: a roof with an overhang, a band of windows, a dark panel under them.
  pen.shape([2, deck + 6, 4, deck, cabin, deck, cabin + 8, deck + 5, cabin + 8, deck + 8, 2, deck + 8], { fill: PAPER, tone: 3, angle: 0, w: 1.6 })
  pen.rect(6, deck + 8, cabin - 4, sill - deck - 8, { fill: PAPER, w: 1.6 })
  pen.rect(6, deck + 44, cabin - 4, sill - deck - 44, { fill: PAPER, tone: 4, angle: -0.9, w: 1.3 })
  pen.line([6, sill - 9, cabin + 2, sill - 9], 1.6, true, PAPER)
  // Windows, each with its blind down to the sill and a tassel on the cord.
  const windows: [number, number][] = [[12, doorX - 6], [doorX + doorW + 6, cabin - 2]]
  for (const [x1, x2] of windows) {
    if (x2 - x1 < 12) continue
    pen.rect(x1, deck + 13, x2 - x1, 28, { fill: PAPER, w: 1.4 })
    for (let y = deck + 18; y < deck + 40; y += 4.5) pen.line([x1 + 1.5, y, x2 - 1.5, y + (pen.next() - 0.5)], 0.5, true)
    pen.line([(x1 + x2) / 2, deck + 41, (x1 + x2) / 2, deck + 46], 0.8, true)
    pen.ellipse((x1 + x2) / 2, deck + 48, 1.8, 2.4, { fill: PAPER, w: 0.9 })
  }
  // The driver's bench under the roof's overhang, and the windscreen post.
  pen.line([cabin + 2, deck + 8, cabin + 12, sill - 30], 1.6, true)
  // The bonnet with its louvres, the radiator and one lamp on a stalk.
  pen.shape([cabin + 2, sill, cabin + 2, sill - 32, w - 12, sill - 28, w - 12, sill], { fill: PAPER, tone: 3, angle: -1.2, w: 1.6, sharp: true })
  for (let x = cabin + 10; x < w - 16; x += 5) pen.line([x, sill - 24, x, sill - 8], 1.4, true, PAPER)
  pen.rect(w - 12, sill - 36, 8, 38, { fill: PAPER, w: 1.5 })
  for (let y = sill - 32; y < sill; y += 4) pen.line([w - 11, y, w - 5, y], 0.7, true)
  pen.ellipse(w - 8, sill - 39, 2.4, 2.4, { fill: PAPER, w: 1 })
  pen.line([w - 4, sill - 20, w + 2, sill - 22], 1.4, true)
  pen.ellipse(w + 3, sill - 23, 5.5, 6.5, { fill: PAPER, tone: 1, w: 1.4 })
  // The running board, the mudguards and two spoked wheels.
  pen.rect(40, sill + 6, cabin - 26, 4, { fill: PAPER, tone: 2, angle: 0, w: 1.2 })
  // The wheels turn, so they are drawn apart (drawCoachWheel) and set under the mudguards at COACH_WHEELS.
  for (const cx of coachWheels(w)) {
    const cy = h - COACH_WHEEL_UP
    pen.shape([cx - 30, cy + 2, cx - 26, cy - 20, cx - 10, cy - 30, cx + 10, cy - 30, cx + 26, cy - 20, cx + 30, cy + 2, cx + 23, cy + 2, cx + 20, cy - 14, cx + 8, cy - 23, cx - 8, cy - 23, cx - 20, cy - 14, cx - 23, cy + 2], { fill: PAPER, tone: 4, angle: 0.4, w: 1.4 })
  }
  // The starting handle.
  pen.line([w - 4, sill - 2, w + 3, sill - 2, w + 3, sill + 6], 1.3, true)
  if (open) {
    // The door stands open: a dark doorway, and a step let down under it.
    pen.rect(doorX, deck - 2, doorW, sill + 12 - deck, { fill: PAPER, tone: 4, angle: -0.9, w: 1.8 })
    pen.tone([doorX + 3, deck + 2, doorX + doorW - 3, deck + 2, doorX + doorW - 3, sill + 6, doorX + 3, sill + 6], 3, 0.3)
    pen.line([doorX + 5, sill + 10, doorX + 5, sill + 20], 1.6, true)
    pen.line([doorX + doorW - 5, sill + 10, doorX + doorW - 5, sill + 20], 1.6, true)
    pen.rect(doorX + 1, sill + 19, doorW - 2, 4, { fill: PAPER, tone: 2, angle: 0, w: 1.3 })
  }
}

/** How far above the road the coach's axles are, and where along it its two wheels turn. */
export const COACH_WHEEL_UP = 24
export const coachWheels = (w: number): [number, number] => [38, w - 40]

/** One wheel of the coach, about its axle: a tyre, a rim, ten spokes and a hub. */
export function drawCoachWheel(pen: Pen): void {
  pen.ellipse(0, 0, 21, 21, { fill: PAPER, tone: 4, angle: 0.8, w: 1.7 })
  pen.ellipse(0, 0, 14.5, 14.5, { fill: PAPER, w: 1.2 })
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2
    pen.line([Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * 14, Math.sin(a) * 14], i === 0 ? 1.8 : 0.9, true)
  }
  pen.ellipse(0, 0, 4.2, 4.2, { fill: PAPER, tone: 3, w: 1.2 })
}

/** The coach's door, which is touched to bring the next coach-load in: flat spot colour, its own blind drawn. Origin at its top left. */
export function drawCoachDoor(pen: Pen, w: number, h: number): void {
  pen.rect(0, 0, w, h, { fill: SPOT, w: 1.8 })
  pen.rect(6, 7, w - 12, 30, { fill: PAPER, w: 1.4 })
  for (let y = 12; y < 35; y += 4.5) pen.line([7.5, y, w - 7.5, y + (pen.next() - 0.5)], 0.5, true)
  pen.line([w / 2, 37, w / 2, 42], 0.8, true)
  pen.ellipse(w / 2, 44, 1.8, 2.4, { fill: PAPER, w: 0.9 })
  pen.rect(6, 52, w - 12, h - 60, { w: 1.1 })
  pen.line([w - 15, 47, w - 7, 47], 2.6, true)
  pen.ellipse(w - 7, 47, 2.2, 2.2, { fill: PAPER, w: 1 })
  pen.line([3, 14, 3, 20], 2.2, true)
  pen.line([3, h - 22, 3, h - 16], 2.2, true)
}

/** Where the hub of the porter's trolley wheel is, from between his feet, and how far out its tyre is. */
export const TROLLEY_WHEEL = { x: 40, y: -8, r: 8 }

/** The porter: an old tortoise in a pillbox cap, upright behind a luggage trolley. Ink alone. Origin between its feet. */
export function drawPorter(pen: Pen): void {
  // The trolley: a sack truck with a trunk and a hat box on it.
  pen.line([18, -74, 40, -6], 2.6, true)
  pen.line([12, -72, 24, -76], 2.6, true)
  local2(pen, 40, -6, 0.3, () => {
    pen.rect(-2, -50, 26, 46, { fill: PAPER, tone: 3, angle: -1.2, w: 1.5 })
    pen.rect(-2, -38, 26, 5, { fill: PAPER, w: 0.9 })
    pen.rect(-2, -20, 26, 5, { fill: PAPER, w: 0.9 })
    pen.rect(2, -64, 18, 13, { fill: PAPER, tone: 1, w: 1.3 })
    pen.ellipse(11, -64, 10, 2.8, { fill: PAPER, w: 1.2 })
  })
  pen.line([36, -3, 58, 2], 2.6, true)
  pen.ellipse(40, -8, 8, 8, { fill: PAPER, tone: 4, w: 1.5 })
  pen.ellipse(40, -8, 3, 3, { fill: PAPER, w: 1 })
  // Legs, then the shell on its back.
  pen.shape([-30, 0, -28, -22, -16, -22, -14, 0], { fill: PAPER, tone: 2, angle: 1.1, w: 1.5 })
  pen.shape([-12, 0, -10, -22, 2, -22, 6, 0], { fill: PAPER, tone: 1, angle: 1.1, w: 1.5 })
  pen.line([-33, 0, -11, 0], 1.6, true)
  pen.line([-13, 0, 10, 0], 1.6, true)
  pen.shape([-4, -18, 6, -40, 4, -66, -6, -78, -16, -80, -10, -50, -12, -22], { fill: PAPER, tone: 1, angle: 0.3, w: 1.5 })
  pen.shape([-10, -16, -30, -20, -44, -38, -46, -58, -36, -76, -18, -84, -8, -78, -14, -50], { fill: PAPER, tone: 3, angle: -0.7, w: 1.8 })
  pen.line([-22, -80, -26, -56, -20, -30], 1.2, false, PAPER)
  pen.line([-40, -60, -27, -56, -14, -60], 1.2, false, PAPER)
  pen.line([-38, -36, -24, -40, -13, -34], 1.2, false, PAPER)
  // The long neck, wrinkled, and the head with its heavy lids.
  pen.tube([-8, -74, -2, -88, 8, -96], 9, PAPER, 1.4)
  for (const [x, y] of [[-7, -80], [-4, -86], [1, -91]] as const) pen.line([x - 4, y + 1, x + 3, y - 2], 0.7)
  pen.shape([4, -102, 12, -106, 22, -103, 27, -97, 22, -91, 10, -90, 4, -94], { fill: PAPER, w: 1.5 })
  pen.line([18, -94, 27, -96], 1.1)
  pen.line([13, -100, 19, -99], 1.6)
  pen.dot(17, -97.6, 1)
  pen.dot(25, -99.5, 0.6)
  // The cap, with no badge on it.
  pen.rect(5, -113, 15, 8, { fill: PAPER, tone: 4, angle: 0.2, w: 1.3 })
  pen.line([4, -105, 22, -105], 1.6, true)
  pen.line([8, -104, 9, -92], 0.6)
  // The arm to the trolley's handle.
  pen.tube([-2, -62, 8, -66, 15, -72], 6, PAPER, 1.3)
}

/** A flame, for the stove's dial. */
function flame(pen: Pen, x: number, y: number, s: number): void {
  pen.shape([x + 0.6 * s, y - 8 * s, x + 3 * s, y - 2 * s, x + 2.8 * s, y + 2 * s, x, y + 4 * s, x - 2.8 * s, y + 2 * s, x - 3 * s, y - 1 * s, x - 1.2 * s, y - 3 * s], { fill: PAPER, w: 1 })
  pen.line([x, y + 2 * s, x + 0.4 * s, y - 1 * s], 0.7)
}

/** One of the five things, in a box about 60 across with the origin at its middle. The dial shows flames or icicles, never a numeral. */
export function drawThing(pen: Pen, kind: InkThingKind, dial: 1 | 2 | 3): void {
  if (kind === 'quilt') {
    // A quilt folded in three, stitched in diamonds and tied with a cord.
    for (const y of [16, 8]) pen.shape([-26, y - 6, -20, y - 9, 22, y - 9, 28, y - 5, 28, y + 3, 22, y + 6, -20, y + 6, -26, y + 3], { fill: SPOT, w: 1.4 })
    const top = [-28, -15, -21, -21, 20, -21, 28, -15, 29, -3, 22, 4, -21, 4, -28, -2]
    pen.shape(top, { fill: SPOT, w: 0 })
    pen.inside(top, false, () => {
      for (let x = -70; x < 70; x += 11) {
        pen.line([x, -24, x + 30, 8], 0.9, true)
        pen.line([x + 30, -24, x, 8], 0.9, true)
      }
    })
    pen.shape(top, { w: 1.7 })
    pen.line([29, -2, 32, 8, 28, 20], 1.2)
    pen.line([-4, -21, -5, 22], 2.2, false, PAPER)
    pen.line([-4, -21, -5, 22], 0.6)
    return
  }
  if (kind === 'pipe') {
    // A length of stovepipe with an elbow: seamed, crimped at the foot, sooty inside.
    const body = [-11, 26, -11, -12, -6, -23, 5, -29, 26, -29, 26, -8, 12, -8, 10, -4, 10, 26]
    pen.shape(body, { fill: SPOT, w: 1.7, sharp: true })
    pen.tone([3, -8, 10, -4, 10, 26, 3, 26], 2, -1.2)
    for (const y of [16, 2]) { pen.line([-11, y, 10, y], 1.1, true); pen.line([-11, y + 3, 10, y + 3], 0.6, true) }
    pen.line([-9, -16, 9, -9], 1.1, true)
    pen.line([14, -29, 14, -8], 1.1, true)
    pen.ellipse(26, -18.5, 4.5, 10.5, { fill: PAPER, tone: 4, w: 1.5 })
    for (let x = -9; x < 10; x += 4) pen.line([x, 26, x + 1, 22], 0.8, true)
    return
  }
  if (kind === 'stove') {
    // A small iron stove: pot-bellied, on three feet, with the dial of flames on its front.
    pen.line([-14, 18, -20, 28], 2.4, true)
    pen.line([14, 18, 20, 28], 2.4, true)
    pen.line([0, 20, 0, 28], 2.4, true)
    pen.rect(-5, -32, 10, 12, { fill: PAPER, tone: 4, angle: 0, w: 1.4 })
    const belly = [-17, 22, -23, 6, -20, -12, -10, -19, 10, -19, 20, -12, 23, 6, 17, 22]
    pen.shape(belly, { fill: PAPER, tone: 4, angle: -1.1, w: 0 })
    pen.tone([4, -19, 20, -12, 23, 6, 17, 22, 6, 22], 2, 0.4)
    pen.shape(belly, { w: 1.8 })
    pen.rect(-22, -23, 44, 5, { fill: PAPER, tone: 2, angle: 0, w: 1.4 })
    // The dial: flames standing on a grate, as many as the step it is set to.
    pen.ellipse(0, 1, 15.5, 15.5, { fill: SPOT, w: 1.7 })
    pen.line([-10, 9, 10, 9], 1.5, true)
    const at = dial === 1 ? [0] : dial === 2 ? [-5, 5] : [-8, 0, 8]
    at.forEach((x, i) => flame(pen, x, 3 - (i % 2) * 1.5, dial === 1 ? 1.5 : dial === 2 ? 1.3 : 1.1))
    return
  }
  if (kind === 'ice') {
    // An ice box: a zinc chest with a lid, frost hanging off it, and the dial of icicles on its front.
    pen.shape([20, -12, 28, -21, 28, 15, 20, 25], { fill: PAPER, tone: 3, angle: -1.2, w: 1.5, sharp: true })
    pen.shape([-26, -12, -18, -21, 28, -21, 20, -12], { fill: PAPER, tone: 1, angle: 0, w: 1.5, sharp: true })
    pen.rect(-26, -12, 46, 37, { fill: PAPER, w: 1.7 })
    pen.tone([-26, 17, 20, 17, 20, 25, -26, 25], 2, 0)
    pen.rect(-28, -15, 50, 5, { fill: PAPER, w: 1.4 })
    for (const [x, len] of [[-21, 7], [-14, 4], [10, 5], [16, 8]] as const) pen.shape([x - 2, -10, x + 2, -10, x + 0.3, -10 + len], { fill: PAPER, w: 0.9, sharp: true })
    pen.line([-26, 27, -26, 30], 2, true)
    pen.line([20, 27, 20, 30], 2, true)
    // The dial: a cap of ice with icicles hanging from it, as many as the step it is set to.
    const disc: number[] = []
    for (let i = 0; i < 14; i++) disc.push(-3 + Math.cos((i / 14) * Math.PI * 2) * 14.5, 8 + Math.sin((i / 14) * Math.PI * 2) * 14.5)
    pen.shape(disc, { fill: SPOT, w: 0 })
    pen.inside(disc, false, () => {
      // The cap's edge runs uneven and the icicles hang off-centre, so the dial never looks like a written sign.
      pen.shape([-22, -12, 18, -12, 18, -1, 10, 1, 2, -1.5, -6, 1, -14, -1, -22, 0.5], { fill: PAPER, w: 1.1 })
      const at = dial === 1 ? [-4] : dial === 2 ? [-7, 4] : [-9, -2, 6]
      at.forEach((x, i) => pen.shape([-3 + x - 3, 0, -3 + x + 3, 0, -3 + x + 1.2, 18 - (i % 2) * 6 - (dial - 1) * 1.5], { fill: PAPER, w: 1.1, sharp: true }))
    })
    pen.shape(disc, { w: 1.7 })
    return
  }
  // The alarm clock: two bells and a hammer, two hands, and no numerals on its face.
  pen.line([-9, 18, -14, 27], 2.4, true)
  pen.line([9, 18, 14, 27], 2.4, true)
  pen.line([-10, -22, 0, -30, 10, -22], 1.4)
  for (const side of [-1, 1]) {
    pen.shape([side * 4, -17, side * 7, -26, side * 16, -27, side * 22, -19, side * 19, -13], { fill: SPOT, w: 1.5 })
    pen.line([side * 13, -27, side * 14, -31], 1.6, true)
  }
  pen.line([0, -17, 0, -24], 1.4, true)
  pen.dot(0, -25, 2.2)
  pen.ellipse(0, 3, 21, 21, { fill: SPOT, w: 1.8 })
  pen.ellipse(0, 3, 15, 15, { fill: PAPER, w: 1.4 })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, inner = i % 3 === 0 ? 11 : 12.6
    pen.line([Math.cos(a) * inner, 3 + Math.sin(a) * inner, Math.cos(a) * 14, 3 + Math.sin(a) * 14], i % 3 === 0 ? 1.1 : 0.6, true)
  }
  pen.line([0, 3, -1, -7], 1.8, true)
  pen.line([0, 3, 7, 7], 1.4, true)
  pen.dot(0, 3, 1.5)
}

/**
 * The day-and-night wheel: a disc with pegs to turn it by, half moon and half
 * sun. Drawn moon side up; the page turns it over for the day. Origin at its
 * hub, about 40 to the rim.
 */
export function drawWheel(pen: Pen): void {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.39
    pen.tube([Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a) * 39, Math.sin(a) * 39], 4.5, SPOT, 1.2, true)
  }
  pen.ellipse(0, 0, 34, 34, { fill: SPOT, w: 1.9 })
  pen.ellipse(0, 0, 27, 27, { fill: PAPER, w: 1.5 })
  // The night half: hatched close, with the moon and three stars left bare.
  const half = [-27, 0, -25, -10, -19, -19, -10, -25, 0, -27, 10, -25, 19, -19, 25, -10, 27, 0]
  pen.tone(half, 4, -0.4, false)
  pen.shape([-7, -23, 3, -19, 8, -12, 6, -5, -2, -2, 1, -7, 0, -14], { fill: PAPER, w: 1.2 })
  for (const [x, y] of [[-17, -8], [15, -16], [18, -6]] as const) pen.ellipse(x, y, 1.8, 1.8, { fill: PAPER, w: 0 })
  pen.line([-27, 0, 27, 0], 1.6, true)
  // The day half: the sun in the spot colour, with its rays in ink.
  pen.shape([-12, 1, -10.5, 7, -6, 12, 0, 13.5, 6, 12, 10.5, 7, 12, 1], { fill: SPOT, w: 1.4 })
  for (let i = 0; i < 7; i++) {
    const a = 0.22 + (i / 6) * (Math.PI - 0.44)
    pen.line([Math.cos(a) * 15.5, 1 + Math.sin(a) * 15.5, Math.cos(a) * (i % 2 ? 19 : 23), 1 + Math.sin(a) * (i % 2 ? 19 : 23)], 1.1, true)
  }
  pen.ellipse(0, 0, 3.4, 3.4, { fill: PAPER, w: 1.4 })
  pen.dot(0, 0, 1.1)
}

/** The yeti's own snow cloud, which it leads on a string. Origin at the knot under its middle. */
export function drawCloud(pen: Pen): void {
  const cloud = [-30, -8, -27, -17, -17, -19, -12, -27, 0, -30, 11, -27, 15, -20, 25, -19, 30, -10, 24, -3, 8, -1, -8, -1, -22, -2]
  pen.shape(cloud, { fill: PAPER, w: 0 })
  pen.tone([-30, -9, 30, -11, 24, -3, 8, -1, -8, -1, -22, -2], 2, -0.3)
  pen.shape(cloud, { w: 1.6 })
  pen.line([-14, -17, -8, -21, -2, -18], 0.8)
  pen.line([6, -19, 12, -16], 0.8)
}

/** A room's ceiling lamp, hung from the origin by its flex, so that it can swing about its hook. */
export function drawLamp(pen: Pen): void {
  pen.line([0, 0, 0.5, 12], 1, true)
  pen.shape([-4, 12, 4, 12, 14, 26, -14, 26], { fill: PAPER, tone: 2, angle: -1.3, w: 1.3, sharp: true })
  pen.ellipse(0, 28, 3.6, 3.6, { fill: PAPER, w: 1 })
  for (let i = 0; i < 5; i++) {
    const a = 0.45 + i * 0.56
    pen.line([Math.cos(a) * 10, 30 + Math.sin(a) * 8, Math.cos(a) * 15, 30 + Math.sin(a) * 13], 0.6, true)
  }
}

/**
 * The street with no coach in it: a gas lamp on an iron post, bare kerb where
 * a coach pulls up, and two bollards. Origin on the ground under the lamp;
 * `tall` is how high the lamp may stand and `wide` the stretch of kerb.
 */
export function drawStreetLamp(pen: Pen, tall: number, wide: number, lit: boolean): void {
  drawKerb(pen, wide)
  for (const x of [-wide * 0.36, wide * 0.4]) {
    pen.rect(x - 4, -24, 8, 24, { fill: PAPER, tone: 3, angle: -1.2, w: 1.4 })
    pen.ellipse(x, -26, 5, 4, { fill: PAPER, tone: 3, w: 1.3 })
  }
  // The post: a fluted foot, a thin shaft, a ladder bar, the lantern.
  const top = -tall + 30
  pen.shape([-8, 0, -7, -12, -4, -20, 4, -20, 7, -12, 8, 0], { fill: PAPER, tone: 3, angle: -1.2, w: 1.5 })
  pen.tube([0, -20, 0, top], 3.4, PAPER, 1.3, true)
  pen.tone([0.5, -20, 2.4, -20, 2.4, top, 0.5, top], 3, -1.2)
  pen.line([-13, top + 12, 13, top + 12], 2, true)
  pen.dot(-13, top + 12, 1.8)
  pen.dot(13, top + 12, 1.8)
  // Lit, it stands in a ring of bare wall: its light is where the hatching is not.
  if (lit) pen.ellipse(0, top - 12, 30, 26, { fill: PAPER, w: 0 })
  pen.shape([-6, top, 6, top, 10, top - 18, -10, top - 18], { fill: PAPER, tone: lit ? 0 : 2, w: 1.5, sharp: true })
  pen.line([0, top, 0, top - 18], 0.7, true)
  pen.shape([-12, top - 18, 12, top - 18, 5, top - 25, -5, top - 25], { fill: PAPER, tone: 4, angle: 0.3, w: 1.4, sharp: true })
  pen.ellipse(0, top - 28, 2.4, 2.4, { fill: PAPER, w: 1.1 })
  if (lit) {
    pen.ellipse(0, top - 8, 2.2, 3.6, { w: 1 })
    for (let i = 0; i < 9; i++) {
      const a = -0.5 + (i / 8) * (Math.PI + 1)
      pen.line([Math.cos(a) * 17, top - 10 + Math.sin(a) * 15, Math.cos(a) * (i % 2 ? 23 : 27), top - 10 + Math.sin(a) * (i % 2 ? 20 : 24)], 0.7, true)
    }
  }
}

/**
 * The ghost hand: a pointing hand with a cuff, in the same pen as everything
 * else, its fingertip at the origin. Pressed, three short strokes stand round
 * the fingertip. It shows a move; it is not an arrow or a sign.
 */
export function drawHand(pen: Pen, down: boolean): void {
  // The sleeve and the cuff.
  pen.shape([44, 82, 63, 68, 84, 96, 66, 110], { fill: PAPER, tone: 4, angle: 0.4, w: 1.6, sharp: true })
  pen.shape([35, 71, 55, 57, 65, 70, 45, 85], { fill: PAPER, w: 1.7, sharp: true })
  pen.dot(55, 73, 1.5)
  // The back of the hand, with three fingers folded under it.
  pen.shape([15, 36, 28, 26, 42, 28, 54, 40, 56, 56, 46, 72, 34, 76, 22, 66, 14, 50], { fill: PAPER, w: 1.9 })
  for (const [x, y] of [[37, 31], [46, 38], [51, 49]] as const) pen.line([x - 5, y + 9, x - 1, y + 2, x + 4, y + 5], 1.1)
  pen.tone([40, 62, 54, 46, 56, 56, 46, 72, 36, 74], 1, 0.4)
  // The thumb, tucked alongside, and the pointing finger with its nail.
  pen.tube([24, 64, 14, 54, 12, 44], 9, PAPER, 1.6)
  pen.tube([3.5, 5.5, 13, 22, 23, 38], 10.5, PAPER, 1.7)
  pen.line([1.5, 6, 5, 3, 8.5, 6.5], 0.8)
  pen.line([12, 25, 17, 22], 0.7)
  if (down) for (const a of [-2.9, -2.1, -1.3]) pen.line([Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a) * 16, Math.sin(a) * 16], 1.5, true)
}

/** The bare kerb where a coach pulls up: setts along the gutter and the patch its wheels have worn. Origin on the ground at its middle. */
export function drawKerb(pen: Pen, wide: number): void {
  for (let x = -wide / 2; x < wide / 2; x += 13) pen.ellipse(x + 6, -2.5, 5.2, 2.2, { w: 0.7 })
  pen.tone([-wide * 0.42, -8, wide * 0.42, -8, wide * 0.36, 0, -wide * 0.36, 0], 2, 0)
}

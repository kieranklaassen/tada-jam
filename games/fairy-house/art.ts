import { BUSHES, FLOOR_FROM, HOLLOW, TREE, hillPoints, hillTop } from './kinds'

export { hillTop }
import { HUES, blob, boxOf, contour, line, oval, pencil, polygon, type Box, type Hue, type Pen, type Shape } from './pencil'
import { BRUSH_BRISTLES, CAP_STRIPES, HAND_CREASES, TOWEL_FRINGE, TWIGS, WALL_MARKS, type TwigLook } from './marks'
import { makeRng, type Rng } from './rng'
import { OWL_AT } from './toy'

// Everything the game looks like, drawn once when the surface is sized: the
// found things, the three folk in parts, the bystanders and the wood. The
// view stamps these and adds a few pencil lines for the faces.
//
// The found things are the plainest and strongest pencils on the page: one
// hue each, no face, nothing that moves by itself. The look's comedy and
// life are in the folk and the wood round them.

/** Something a sprite can be drawn into: a canvas, or a test's stand-in. */
export type Sheet = { width: number; height: number; getContext(kind: '2d'): Pen | null }

/** A picture drawn once. `box` is the room it takes round its own origin, in stage units. */
export type Sprite = { sheet: Sheet; box: Box }

export function makeSprite(make: () => Sheet, density: number, box: Box, paint: (g: Pen) => void): Sprite {
  const sheet = make()
  sheet.width = Math.max(1, Math.ceil(box.w * density))
  sheet.height = Math.max(1, Math.ceil(box.h * density))
  const g = sheet.getContext('2d')
  if (g) {
    g.setTransform(density, 0, 0, density, -box.x * density, -box.y * density)
    paint(g)
  }
  return { sheet, box }
}

const fill = (g: Pen, shape: Shape, colour: string, alpha = 1): void => {
  g.save()
  g.globalAlpha = alpha
  g.fillStyle = colour
  shape(g)
  g.fill()
  g.restore()
}

/** A shape in pencil over a ground of paper, so that it hides what is behind it as a drawn thing does. */
function solid(g: Pen, rng: Rng, shape: Shape, box: Box, hue: Hue, shading: Parameters<typeof pencil>[5] = {}): void {
  fill(g, shape, HUES.paper)
  pencil(g, rng, shape, box, hue, shading)
}

// --- The found things -------------------------------------------------------

/** A leaf as a band between two curves: its tips at one height, its middle at another. */
function leafShape(tipsY: number, midY: number, thick: number): Shape {
  return (g) => {
    g.beginPath()
    g.moveTo(-68, tipsY)
    g.quadraticCurveTo(0, 2 * (midY - thick / 2) - tipsY, 68, tipsY)
    g.quadraticCurveTo(0, 2 * (midY + thick / 2) - tipsY, -68, tipsY)
    g.closePath()
  }
}

function leaf(g: Pen, rng: Rng, tipsY: number, midY: number, thick: number): void {
  const box = { x: -70, y: Math.min(tipsY, midY - thick / 2) - 2, w: 140, h: Math.abs(tipsY - midY) + thick + 4 }
  solid(g, rng, leafShape(tipsY, midY, thick), box, HUES.leaf, { angle: -0.5, bare: 0.2, edge: 0.75 })
  // The rib, and a stalk at one tip.
  line(g, [-66, tipsY, 0, 2 * midY - tipsY, 66, tipsY], HUES.leaf.dark, 0.7, 1.4)
  line(g, [-68, tipsY, -76, tipsY - 3], HUES.leaf.dark, 0.9, 2)
}

/** A leaf laid over a table: flat on top, its ends hanging. */
function leafDraped(g: Pen, rng: Rng): void {
  const shape: Shape = (p) => {
    p.beginPath()
    p.moveTo(-70, -1)
    p.bezierCurveTo(-64, -18, -48, -19, -34, -19)
    p.lineTo(34, -19)
    p.bezierCurveTo(48, -19, 64, -18, 70, -1)
    p.lineTo(64, 0)
    p.bezierCurveTo(58, -9, 46, -9, 34, -9)
    p.lineTo(-34, -9)
    p.bezierCurveTo(-46, -9, -58, -9, -64, 0)
    p.closePath()
  }
  solid(g, rng, shape, { x: -72, y: -21, w: 144, h: 23 }, HUES.leaf, { angle: -0.5, bare: 0.2, edge: 0.75 })
  line(g, [-60, -8, -40, -14, 40, -14, 60, -8], HUES.leaf.dark, 0.6, 1.3)
}

function capUp(g: Pen, rng: Rng): void {
  const cup: Shape = (p) => {
    p.beginPath()
    p.moveTo(-26, -29)
    p.bezierCurveTo(-27, -6, -14, 0, 0, 0)
    p.bezierCurveTo(14, 0, 27, -6, 26, -29)
    p.closePath()
  }
  line(g, [0, -1, 0, 3], HUES.cap.dark, 0.9, 4)
  solid(g, rng, cup, { x: -27, y: -30, w: 54, h: 31 }, HUES.cap, { angle: 0.6, gap: 2.2, bare: 0.08, edge: 0.8 })
  // The scales of the cap: a few crossing strokes, no two alike.
  for (const [x, y, dx, dy] of [[-21, -25, 5, 14], [-12, -22, 8, 17], [-1, -26, 4, 22], [8, -20, 7, 12], [17, -25, 3, 15]] as const) line(g, [x, y, x + dx, y + dy], HUES.cap.dark, 0.45, 1.2)
  solid(g, rng, oval(0, -29, 26, 5.5), { x: -26, y: -35, w: 52, h: 11 }, HUES.capInside, { bare: 0.3, edge: 0.7 })
}

function capDown(g: Pen, rng: Rng): void {
  const dome: Shape = (p) => {
    p.beginPath()
    p.moveTo(-26, 0)
    p.bezierCurveTo(-27, -22, -14, -29, 0, -29)
    p.bezierCurveTo(14, -29, 27, -22, 26, 0)
    p.closePath()
  }
  line(g, [0, -28, 1, -34], HUES.cap.dark, 0.9, 4)
  solid(g, rng, dome, { x: -27, y: -30, w: 54, h: 31 }, HUES.cap, { angle: 0.6, gap: 2.2, bare: 0.1, edge: 0.8 })
  for (const [x, y, dx, dy] of [[-21, -4, 6, -13], [-12, -6, 4, -19], [-2, -3, 7, -24], [9, -7, 3, -15], [17, -4, 4, -11]] as const) line(g, [x, y, x + dx, y + dy], HUES.cap.dark, 0.45, 1.2)
}

function water(g: Pen, rng: Rng): void {
  solid(g, rng, oval(0, -29, 22, 4.6), { x: -22, y: -34, w: 44, h: 10 }, HUES.water, { bare: 0.35, edge: 0.6, angle: 0 })
  line(g, [-12, -30, -2, -31.5, 6, -30], HUES.paper, 0.9, 1.6)
}

function glow(g: Pen, rng: Rng): void {
  // The lamp's light: yellow pressed lightly, thinner toward its edge.
  pencil(g, rng, oval(0, 0, 86, 60), { x: -86, y: -60, w: 172, h: 120 }, HUES.glow, { depth: 0, press: 0.35, edge: 0, bare: 0 })
  pencil(g, rng, oval(0, 0, 58, 40), { x: -58, y: -40, w: 116, h: 80 }, HUES.glow, { depth: 0, press: 0.55, edge: 0, bare: 0, angle: 0.4 })
  pencil(g, rng, oval(0, 4, 32, 22), { x: -32, y: -18, w: 64, h: 44 }, HUES.glow, { depth: 0, press: 0.9, edge: 0, bare: 0, angle: 1.2 })
}

function pebble(g: Pen, rng: Rng): void {
  const points = [-33, -10, -27, -36, 2, -46, 29, -36, 34, -10, 18, 1, -20, 1]
  solid(g, rng, blob(points), boxOf(points, 2), HUES.pebble, { angle: -1.1, bare: 0.24, edge: 0.8 })
  line(g, [-14, -30, -4, -35, 6, -33], HUES.paper, 0.8, 2)
}

function bark(g: Pen, rng: Rng): void {
  // A slab of bark: a pale face on top where it split from the tree, and its rough rind in front.
  const slab = [-78, -15, -70, -24, 70, -24, 78, -15, 76, -2, 60, 1, -60, 1, -76, -2]
  solid(g, rng, blob(slab), boxOf(slab, 2), HUES.bark, { angle: 0.15, gap: 2.2, bare: 0, depth: 0.7, edge: 0.9, width: 2 })
  const face = [-70, -19, -62, -24, 62, -24, 70, -19, 60, -15, -60, -15]
  solid(g, rng, blob(face), boxOf(face, 1), HUES.capInside, { angle: 0.1, bare: 0.3, edge: 0.6 })
  // Ridges of the rind, pressed hard.
  for (let x = -66 + rng.next() * 8; x < 68; x += 9 + rng.next() * 22) {
    const top = -13 + rng.next() * 4
    line(g, [x, top, x + 1 + rng.next() * 5, top + 5 + rng.next() * 7], HUES.bark.dark, 0.75, 2)
  }
}

/** One of the twigs, standing: each has its own bend, shoots and marks (marks.ts). */
function twig(g: Pen, rng: Rng, look: TwigLook): void {
  for (const shoot of look.shoots) line(g, [...shoot.points], HUES.twig.mid, 0.95, shoot.width)
  solid(g, rng, blob([...look.stem]), { x: -8, y: -117, w: 16, h: 118 }, HUES.twig, { angle: 1.4, gap: 2.1, bare: 0.1, edge: 0.85 })
  // A knot and a scar, unlike each other.
  for (const mark of look.marks) line(g, [...mark], HUES.twig.dark, 0.7, 1.4)
}

/** A twig the fat one has snapped: half as long, with a splintered top of its own, and what grew on its lower half. */
function stump(g: Pen, rng: Rng, look: TwigLook): void {
  const top = Math.min(...look.stump.filter((_, i) => i % 2 === 1))
  for (const shoot of look.shoots) if (shoot.points[1] > -44) line(g, [...shoot.points], HUES.twig.mid, 0.95, shoot.width)
  solid(g, rng, polygon([...look.stump]), { x: -8, y: -59, w: 16, h: 60 }, HUES.twig, { angle: 1.4, gap: 2.1, bare: 0.1, edge: 0.85 })
  for (const mark of look.marks) if (Math.min(...mark.filter((_, i) => i % 2 === 1)) > -42) line(g, [...mark], HUES.twig.dark, 0.7, 1.4)
  // The pale wood where it broke.
  line(g, [-3, top + 8, 1, top + 3, 4, top + 9], HUES.capInside.light, 0.9, 1.6)
}

function moss(g: Pen, rng: Rng): void {
  const shape: Shape = (p) => {
    p.beginPath()
    p.moveTo(-50, 0)
    p.bezierCurveTo(-54, -14, -46, -26, -36, -28)
    p.bezierCurveTo(-34, -40, -18, -44, -10, -38)
    p.bezierCurveTo(-2, -48, 16, -46, 20, -37)
    p.bezierCurveTo(32, -42, 44, -32, 42, -22)
    p.bezierCurveTo(52, -18, 54, -6, 50, 0)
    p.closePath()
  }
  solid(g, rng, shape, { x: -54, y: -46, w: 108, h: 47 }, HUES.moss, { angle: -1.2, gap: 2.2, bare: 0.14, edge: 0.8 })
  // Tufts, as short strokes standing up.
  for (let x = -40 + rng.next() * 6; x < 40; x += 5 + rng.next() * 12) {
    const y = -14 - rng.next() * 16
    line(g, [x, y, x + 1.5, y - 6], HUES.moss.dark, 0.55, 1.4)
  }
}

/** Moss slung between two tops: a hump over each, and the middle sagging under the line between them. */
function mossSag(g: Pen, rng: Rng): void {
  const shape: Shape = (p) => {
    p.beginPath()
    p.moveTo(-50, -2)
    p.bezierCurveTo(-56, -14, -50, -28, -38, -30)
    p.bezierCurveTo(-28, -32, -16, -24, -4, -14)
    p.bezierCurveTo(6, -8, 14, -18, 24, -26)
    p.bezierCurveTo(34, -34, 50, -28, 52, -14)
    p.bezierCurveTo(54, -8, 52, -2, 48, 0)
    p.bezierCurveTo(30, 8, 12, 14, -2, 13)
    p.bezierCurveTo(-18, 12, -36, 6, -50, -2)
    p.closePath()
  }
  solid(g, rng, shape, { x: -56, y: -34, w: 110, h: 48 }, HUES.moss, { angle: -1.2, gap: 2.2, bare: 0.14, edge: 0.8 })
  for (let x = -42 + rng.next() * 6; x < 42; x += 5 + rng.next() * 12) {
    // Its tufts stand up along the sag: lower in the middle.
    const y = -6 - 14 * Math.min(1, Math.abs(x) / 30) - rng.next() * 6
    line(g, [x, y, x + 1.5, y - 6], HUES.moss.dark, 0.55, 1.4)
  }
}

function feather(g: Pen, rng: Rng): void {
  const vane: Shape = (p) => {
    p.beginPath()
    p.moveTo(-40, -5)
    p.quadraticCurveTo(4, -27, 56, -9)
    p.quadraticCurveTo(8, 9, -40, -5)
    p.closePath()
  }
  solid(g, rng, vane, { x: -40, y: -20, w: 96, h: 22 }, HUES.feather, { angle: 1.1, gap: 2.2, bare: 0.12, depth: 0.6, edge: 0.7 })
  // Bars across the vane, as a jay's feather has, and the quill.
  for (const [x, long] of [[-25, 7], [-15, 11], [-1, 12], [9, 9], [24, 11], [36, 6]] as const) line(g, [x, -6, x + 4, -6 - long], HUES.feather.dark, 0.6, 2.2)
  line(g, [-56, -4, 0, -7, 54, -9], HUES.twig.dark, 0.8, 1.6)
}

// --- The three folk, in parts ------------------------------------------------

function fatBody(g: Pen, rng: Rng): void {
  // Boots first, so the coat lies over them.
  for (const x of [-48, 48]) solid(g, rng, oval(x, -6, 26, 12), { x: x - 26, y: -18, w: 52, h: 24 }, HUES.boot, { edge: 0.8 })
  const coat = [-104, -30, -100, -112, -70, -206, 0, -244, 70, -206, 100, -112, 104, -30, 46, 2, -46, 2]
  solid(g, rng, blob(coat), boxOf(coat, 2), HUES.fatCoat, { angle: -0.8, gap: 3, bare: 0.2, edge: 0.75, width: 2 })
  solid(g, rng, oval(0, -178, 60, 48), { x: -60, y: -226, w: 120, h: 96 }, HUES.skin, { bare: 0.42, depth: 0.7, edge: 0.6 })
  // Cheeks and a round nose.
  for (const x of [-38, 38]) pencil(g, rng, oval(x, -164, 12, 8), { x: x - 12, y: -172, w: 24, h: 16 }, HUES.toadstool, { depth: 0, press: 0.5, edge: 0, bare: 0 })
  solid(g, rng, oval(0, -172, 11, 9), { x: -11, y: -181, w: 22, h: 18 }, HUES.skin, { bare: 0.2, edge: 0.8 })
  // One button, and a patch sewn on askew.
  fill(g, oval(2, -44, 5.5, 5.5), HUES.fatCoat.dark, 0.8)
  solid(g, rng, polygon([-44, -66, -20, -70, -17, -48, -41, -44]), { x: -44, y: -70, w: 27, h: 26 }, HUES.fatCap, { bare: 0.1, edge: 0.7 })
}

function fatCap(g: Pen, rng: Rng): void {
  // A nightcap: its band round the head, its tail hanging over one side with a bobble.
  const tail: Shape = (p) => {
    p.beginPath()
    p.moveTo(-52, 0)
    p.bezierCurveTo(-50, -50, 20, -62, 60, -30)
    p.bezierCurveTo(84, -10, 92, 20, 90, 46)
    p.lineTo(78, 46)
    p.bezierCurveTo(74, 20, 62, 4, 52, 0)
    p.closePath()
  }
  solid(g, rng, tail, { x: -52, y: -52, w: 144, h: 98 }, HUES.fatCap, { angle: -0.4, bare: 0.2, edge: 0.75, width: 2 })
  // Its stripes turn with the cap, each its own length and width.
  for (const stripe of CAP_STRIPES) line(g, stripe.points, HUES.paper, 0.85, stripe.width)
  solid(g, rng, oval(84, 56, 14, 14), { x: 70, y: 42, w: 28, h: 28 }, HUES.pillow, { bare: 0.3, edge: 0.7 })
  solid(g, rng, polygon([-56, -4, 56, -4, 56, 10, -56, 10]), { x: -56, y: -4, w: 112, h: 14 }, HUES.pillow, { bare: 0.3, edge: 0.7 })
}

function fatPillow(g: Pen, rng: Rng): void {
  const pillow = [-62, -34, 62, -34, 66, 0, 62, 34, -62, 34, -66, 0]
  solid(g, rng, blob(pillow), boxOf(pillow, 2), HUES.pillow, { bare: 0.4, edge: 0.75, width: 2 })
  // Two arms hugging it.
  for (const side of [-1, 1]) {
    const arm = [side * 92, -40, side * 44, -14, side * 26, 6, side * 40, 20, side * 96, 0]
    solid(g, rng, blob(arm), boxOf(arm, 2), HUES.fatCoat, { angle: -0.8, gap: 3, bare: 0.15, edge: 0.75 })
    solid(g, rng, oval(side * 30, 8, 12, 10), { x: side * 30 - 12, y: -2, w: 24, h: 20 }, HUES.skin, { bare: 0.3, edge: 0.7 })
  }
}

/** The tidy one as it stands, from its feet: its coat, its head and its hat. The sun's track is held clear of these. */
export const TIDY_SHAPE = {
  coat: [-40, -6, -46, -120, -32, -196, -14, -212, 14, -212, 32, -196, 46, -120, 40, -6],
  head: { x: 0, y: -240, r: 30 },
  hat: [-38, -262, 34, -262, 29, -272, 8, -326, 0, -326, -30, -272],
} as const

function tidyBody(g: Pen, rng: Rng): void {
  for (const x of [-18, 20]) solid(g, rng, oval(x - 6, -5, 22, 9), { x: x - 28, y: -14, w: 44, h: 18 }, HUES.boot, { edge: 0.8 })
  const { coat, head, hat } = TIDY_SHAPE
  solid(g, rng, blob(coat), boxOf(coat, 2), HUES.tidyCoat, { angle: -1.3, gap: 2.8, bare: 0.2, edge: 0.75, width: 2 })
  // A seam down the coat and three buttons, each smaller than the one above.
  line(g, [-6, -196, -2, -120, -8, -20], HUES.tidyCoat.dark, 0.5, 1.6)
  for (const [y, r] of [[-174, 5.5], [-146, 4.5], [-104, 3.5]] as const) fill(g, oval(-12, y, r, r), HUES.tidyCoat.dark, 0.85)
  // A stiff collar, the head, and a hat that stands straight up.
  solid(g, rng, polygon([-30, -216, 30, -216, 24, -198, -24, -198]), { x: -30, y: -216, w: 60, h: 18 }, HUES.pillow, { bare: 0.5, edge: 0.8 })
  solid(g, rng, oval(head.x, head.y, head.r, head.r), { x: head.x - head.r, y: head.y - head.r, w: 2 * head.r, h: 2 * head.r }, HUES.skin, { bare: 0.42, depth: 0.7, edge: 0.6 })
  solid(g, rng, polygon(hat), boxOf(hat, 2), HUES.tidyHat, { angle: 1.2, bare: 0.18, edge: 0.8, width: 2 })
  line(g, [-33, -268, -4, -273, 30, -269], HUES.tidyHat.dark, 0.7, 2.4)
}

function tidyNose(g: Pen, rng: Rng): void {
  // A long nose, pointing at the hollow. Its root is the sprite's origin, so it twitches from there.
  const nose = [0, -8, -46, 2, 0, 8]
  solid(g, rng, blob(nose), boxOf(nose, 2), HUES.skin, { bare: 0.2, edge: 0.8 })
  pencil(g, rng, oval(-34, 2, 8, 5), { x: -42, y: -3, w: 16, h: 10 }, HUES.toadstool, { depth: 0, press: 0.5, edge: 0, bare: 0 })
}

function tidyPan(g: Pen, rng: Rng): void {
  // An arm and a dustpan, held out toward the hollow. The shoulder is the origin.
  const arm = [8, -8, -40, 26, -34, 40, 10, 14]
  solid(g, rng, blob(arm), boxOf(arm, 2), HUES.tidyCoat, { angle: -1.3, bare: 0.15, edge: 0.75 })
  solid(g, rng, oval(-40, 36, 9, 8), { x: -49, y: 28, w: 18, h: 16 }, HUES.skin, { bare: 0.3, edge: 0.7 })
  const pan = [-48, 40, -96, 30, -104, 56, -52, 60]
  solid(g, rng, polygon(pan), boxOf(pan, 2), HUES.tin, { bare: 0.35, edge: 0.85 })
  line(g, [-100, 44, -56, 50], HUES.tin.dark, 0.6, 1.6)
}

function tinyBody(g: Pen, rng: Rng): void {
  solid(g, rng, oval(0, -36, 42, 38), { x: -42, y: -74, w: 84, h: 76 }, HUES.tinyCoat, { angle: -0.7, bare: 0.2, edge: 0.75, width: 2 })
  solid(g, rng, oval(0, -96, 40, 36), { x: -40, y: -132, w: 80, h: 72 }, HUES.skin, { bare: 0.42, depth: 0.7, edge: 0.6 })
  for (const x of [-26, 26]) pencil(g, rng, oval(x, -84, 9, 6), { x: x - 9, y: -90, w: 18, h: 12 }, HUES.toadstool, { depth: 0, press: 0.55, edge: 0, bare: 0 })
  // A towel round its neck, with one end hanging.
  const towel = [-40, -70, 40, -70, 44, -56, 20, -52, 18, -18, 2, -18, 2, -52, -44, -56]
  solid(g, rng, polygon(towel), boxOf(towel, 2), HUES.towel, { bare: 0.3, edge: 0.8 })
  // A fringe at the hanging end.
  for (const [x, long, lean] of TOWEL_FRINGE) line(g, [x, -25, x + lean, -25 + long], HUES.towel.dark, 0.8, 2)
}

function tinyLegs(g: Pen, rng: Rng): void {
  // Two short legs that dangle. The seat is the origin.
  for (const x of [-16, 16]) {
    solid(g, rng, polygon([x - 7, -4, x + 7, -4, x + 7, 24, x - 7, 24]), { x: x - 7, y: -4, w: 14, h: 28 }, HUES.tinyCoat, { bare: 0.1, edge: 0.75 })
    solid(g, rng, oval(x - 3, 28, 14, 8), { x: x - 17, y: 20, w: 28, h: 16 }, HUES.boot, { edge: 0.8 })
  }
}

function tinyHat(g: Pen, rng: Rng): void {
  // A toadstool's cap, far too big. Its middle underneath is the origin.
  const hat: Shape = (p) => {
    p.beginPath()
    p.moveTo(-66, 0)
    p.bezierCurveTo(-66, -44, -30, -62, 0, -62)
    p.bezierCurveTo(30, -62, 66, -44, 66, 0)
    p.quadraticCurveTo(0, 12, -66, 0)
    p.closePath()
  }
  solid(g, rng, hat, { x: -66, y: -62, w: 132, h: 70 }, HUES.tinyHat, { angle: -0.6, bare: 0.16, edge: 0.8, width: 2 })
  for (const [x, y, r] of [[-34, -26, 9], [4, -44, 11], [36, -22, 8], [-6, -14, 6]] as const) fill(g, oval(x, y, r, r * 0.8), HUES.paper, 0.95)
}

function tinyBrush(g: Pen, rng: Rng): void {
  // A fist and a scrubbing brush held up. The fist is the origin.
  solid(g, rng, polygon([-5, -4, 5, -4, 6, -34, -6, -34]), { x: -6, y: -34, w: 12, h: 30 }, HUES.twig, { edge: 0.8 })
  solid(g, rng, polygon([-18, -34, 18, -34, 18, -44, -18, -44]), { x: -18, y: -44, w: 36, h: 10 }, HUES.twig, { edge: 0.8 })
  for (const [x, long, lean] of BRUSH_BRISTLES) line(g, [x, -44, x + lean, -44 - long], HUES.towel.dark, 0.9, 2)
  solid(g, rng, oval(0, 0, 10, 9), { x: -10, y: -9, w: 20, h: 18 }, HUES.skin, { bare: 0.3, edge: 0.75 })
}

// --- Bystanders, the sun and the cues ----------------------------------------

function owl(g: Pen, rng: Rng): void {
  // A face in the knot hole. The bottom of the hole is the origin.
  const head = [-30, 0, -32, -40, -22, -62, 0, -54, 22, -62, 32, -40, 30, 0]
  solid(g, rng, blob(head), boxOf(head, 2), HUES.owl, { bare: 0.15, edge: 0.8 })
  for (const x of [-13, 13]) {
    fill(g, oval(x, -34, 12, 12), HUES.paper)
    contour(g, rng, oval(x, -34, 12, 12), HUES.owl.dark, 0.7)
  }
  solid(g, rng, polygon([-5, -24, 5, -24, 0, -14]), { x: -5, y: -24, w: 10, h: 10 }, HUES.sun, { edge: 0.9, bare: 0 })
}

function snailShell(g: Pen, rng: Rng): void {
  solid(g, rng, oval(0, -17, 18, 16), { x: -18, y: -33, w: 36, h: 32 }, HUES.snail, { bare: 0.2, edge: 0.8 })
  line(g, [-8, -16, 0, -27, 9, -17, 0, -9, -4, -16, 1, -19], HUES.snail.dark, 0.7, 1.6)
}

function snailBody(g: Pen, rng: Rng): void {
  // The foot and the horns, heading right. The shell's middle underneath is the origin.
  const foot = [-22, 0, -20, -8, 26, -9, 36, -20, 40, -8, 34, 0]
  solid(g, rng, blob(foot), boxOf(foot, 2), HUES.stalk, { bare: 0.25, edge: 0.8 })
  line(g, [35, -18, 39, -30], HUES.stalk.dark, 0.9, 1.8)
  line(g, [38, -16, 46, -26], HUES.stalk.dark, 0.9, 1.8)
}

function moth(g: Pen, rng: Rng): void {
  for (const side of [-1, 1]) {
    const wing = [0, 0, side * 10, -18, side * 26, -16, side * 28, 2, side * 16, 12, side * 4, 6]
    solid(g, rng, blob(wing), boxOf(wing, 2), HUES.moth, { bare: 0.3, edge: 0.8 })
  }
  line(g, [0, -8, 0, 10], HUES.ink, 0.8, 2.6)
}

function sun(g: Pen, rng: Rng): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    line(g, [Math.cos(a) * 44, Math.sin(a) * 44, Math.cos(a) * (58 + (i % 2) * 8), Math.sin(a) * (58 + (i % 2) * 8)], HUES.sun.mid, 0.85, 4)
  }
  solid(g, rng, oval(0, 0, 38, 38), { x: -38, y: -38, w: 76, h: 76 }, HUES.sun, { bare: 0.3, depth: 0.7, edge: 0.7, width: 2 })
}

function shadow(g: Pen, rng: Rng): void {
  pencil(g, rng, oval(0, 0, 50, 7), { x: -50, y: -7, w: 100, h: 14 }, HUES.shadow, { depth: 0, press: 0.8, edge: 0, bare: 0, angle: 0.2 })
}

function hand(g: Pen, rng: Rng): void {
  // A small hand with one finger out, drawn with a firm line so that it reads over anything. The fingertip is the origin.
  const shape = blob([-9, 6, 0, -4, 9, 6, 10, 36, 30, 40, 34, 64, 24, 88, -14, 90, -28, 68, -36, 46, -24, 38, -10, 50])
  solid(g, rng, shape, { x: -36, y: -4, w: 70, h: 94 }, HUES.skin, { bare: 0.45, edge: 0, depth: 0.8 })
  contour(g, rng, shape, HUES.ink, 0.85, 2.6)
  for (const crease of HAND_CREASES) line(g, crease.points, HUES.ink, 0.5, crease.width)
}

// --- The wood ------------------------------------------------------------------

function archShape(grow = 0): Shape {
  return (g) => {
    g.beginPath()
    g.moveTo(HOLLOW.archX - HOLLOW.archRx - grow, HOLLOW.floorY)
    g.ellipse(HOLLOW.archX, HOLLOW.floorY, HOLLOW.archRx + grow, HOLLOW.archRy + grow, 0, Math.PI, Math.PI * 2)
    g.closePath()
  }
}

/** A clump of rounded leaves: a bush, or the crown of a far tree. */
function clump(g: Pen, rng: Rng, cx: number, cy: number, r: number, hue: Hue, press: number): void {
  const points: number[] = []
  const bumps = 9
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2, far = r * (0.82 + 0.3 * rng.next())
    points.push(cx + Math.cos(a) * far * 1.25, cy + Math.sin(a) * far * 0.85)
  }
  fill(g, blob(points), HUES.paper)
  pencil(g, rng, blob(points), boxOf(points, 2), hue, { angle: -0.6 - rng.next() * 0.6, gap: 3.2, press, bare: 0.18, edge: 0.6 })
}

function fern(g: Pen, rng: Rng, x: number, y: number, length: number, turn: number, hue: Hue, press: number): void {
  // A frond: a curved rib with leaflets down both sides.
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  line(g, [0, 0, length * 0.5, -length * 0.16, length, 0], hue.dark, 0.8 * press, 2.4)
  const leaflets = Math.floor(length / 13)
  for (let i = 1; i < leaflets; i++) {
    const t = i / leaflets, px = t * length, py = -Math.sin(t * Math.PI) * length * 0.08
    const size = (1 - t * 0.75) * length * 0.2
    for (const side of [-1, 1]) {
      const tip = [px, py, px + size * 0.25, py + side * size * 0.6, px + size * 0.7, py + side * size, px + size * 0.5, py + side * size * 0.3]
      fill(g, blob(tip), HUES.paper)
      pencil(g, rng, blob(tip), boxOf(tip, 1), hue, { gap: 2.6, press, bare: 0.1, edge: 0.55, down: 0.8 * side })
    }
  }
  g.restore()
}

function toadstool(g: Pen, rng: Rng, x: number, y: number, size: number): void {
  const stalk = [x - size * 0.16, y, x + size * 0.16, y, x + size * 0.12, y - size * 0.6, x - size * 0.12, y - size * 0.6]
  solid(g, rng, polygon(stalk), boxOf(stalk, 1), HUES.stalk, { bare: 0.3, edge: 0.7 })
  const cap: Shape = (p) => {
    p.beginPath()
    p.moveTo(x - size * 0.5, y - size * 0.55)
    p.bezierCurveTo(x - size * 0.5, y - size * 1.05, x + size * 0.5, y - size * 1.05, x + size * 0.5, y - size * 0.55)
    p.quadraticCurveTo(x, y - size * 0.45, x - size * 0.5, y - size * 0.55)
    p.closePath()
  }
  solid(g, rng, cap, { x: x - size * 0.5, y: y - size * 0.95, w: size, h: size * 0.45 }, HUES.toadstool, { bare: 0.15, edge: 0.75 })
  for (const [dx, dy] of [[-0.22, -0.72], [0.08, -0.82], [0.26, -0.66]] as const) fill(g, oval(x + dx * size, y + dy * size, size * 0.07, size * 0.05), HUES.paper, 0.95)
}

function tuft(g: Pen, rng: Rng, x: number, y: number, size: number, hue: Hue, press: number): void {
  for (let i = 0; i < 6; i++) {
    const lean = (i - 2.5) * 0.22 + (rng.next() - 0.5) * 0.2, tall = size * (0.6 + 0.5 * rng.next())
    line(g, [x + (i - 2.5) * size * 0.14, y, x + (i - 2.5) * size * 0.14 + lean * tall * 0.5, y - tall * 0.6, x + (i - 2.5) * size * 0.14 + lean * tall, y - tall], i % 2 ? hue.mid : hue.dark, 0.8 * press, 2)
  }
}

function flower(g: Pen, rng: Rng, x: number, y: number, hue: Hue): void {
  line(g, [x, y, x + 1, y - 16], HUES.fern.dark, 0.6, 1.6)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng.next() * 0.3
    fill(g, oval(x + 1 + Math.cos(a) * 5, y - 18 + Math.sin(a) * 5, 4, 3, a), hue.light, 0.95)
  }
  fill(g, oval(x + 1, y - 18, 2.6, 2.6), HUES.sun.dark, 0.9)
}

/**
 * The whole wood, drawn once: the sky and the far trees, the hill the sun
 * stands over, bushes and ferns, the tree with its hollow, and the forest
 * floor. `seen` is the part of the stage the surface shows, which is a
 * little more than the stage on a surface of another shape.
 */
export function paintWood(g: Pen, seed: number, seen: Box): void {
  const rng = makeRng(seed)
  fill(g, polygon([seen.x, seen.y, seen.x + seen.w, seen.y, seen.x + seen.w, seen.y + seen.h, seen.x, seen.y + seen.h]), HUES.paper)
  const right = seen.x + seen.w, bottom = seen.y + seen.h

  // Sky, lightly, with two clouds left as paper.
  const sky = { x: seen.x, y: seen.y, w: seen.w, h: 612 - seen.y }
  pencil(g, rng, polygon([sky.x, sky.y, right, sky.y, right, 612, sky.x, 612]), sky, HUES.sky, { angle: -0.25, gap: 3.4, press: 0.6, depth: 0.5, down: -0.9, across: 0, bare: 0.1, edge: 0 })
  for (const [cx, cy, rx] of [[930, 96, 64], [1004, 196, 46], [70, 70, 58]] as const) {
    fill(g, oval(cx, cy, rx, rx * 0.36), HUES.paper, 0.95)
    fill(g, oval(cx - rx * 0.3, cy - rx * 0.2, rx * 0.5, rx * 0.34), HUES.paper, 0.95)
    fill(g, oval(cx + rx * 0.3, cy - rx * 0.14, rx * 0.4, rx * 0.28), HUES.paper, 0.95)
  }

  // The hill the sun stands over, with small far trees on it.
  const hill = hillPoints(seen)
  solid(g, rng, blob(hill), boxOf(hill, 2), HUES.hill, { angle: -0.3, gap: 3.2, press: 0.75, bare: 0.2, edge: 0.4 })
  for (const [x, y, s] of [[960, 420, 18], [1002, 408, 24], [1058, 410, 15]] as const) {
    line(g, [x, y, x, y - s], HUES.farTrunk.dark, 0.6, 2.4)
    clump(g, rng, x, y - s - s * 0.5, s * 0.7, HUES.farWood, 0.8)
  }

  // Far trunks and their crowns, pale, behind everything.
  for (const [x, w] of [[36, 34], [118, 26], [206, 40], [296, 28], [880, 24]] as const) {
    const trunk = [x - w / 2, 560, x + w / 2, 560, x + w * 0.36, seen.y, x - w * 0.36, seen.y]
    solid(g, rng, polygon(trunk), boxOf(trunk, 1), HUES.farTrunk, { angle: 1.45, gap: 3, press: 0.7, bare: 0.25, edge: 0.4 })
  }
  for (const [x, y, r] of [[60, 30, 80], [200, 10, 90], [330, 60, 60], [900, 10, 70], [1060, -10, 80], [1180, 40, 70]] as const) clump(g, rng, x, y, r, HUES.farWood, 0.75)

  // Past the stage's edges, on a surface of another shape, the wood goes on: trunks, crowns and bushes.
  const beyond: number[] = []
  for (let x = -96; x > seen.x - 70; x -= 104) beyond.push(x)
  for (let x = 1276; x < right + 70; x += 104) beyond.push(x)
  for (const x of beyond) {
    const w = 24 + rng.next() * 14
    const trunk = [x - w / 2, 560, x + w / 2, 560, x + w * 0.36, seen.y, x - w * 0.36, seen.y]
    solid(g, rng, polygon(trunk), boxOf(trunk, 1), HUES.farTrunk, { angle: 1.45, gap: 3, press: 0.7, bare: 0.25, edge: 0.4 })
    clump(g, rng, x + 30, 20 + rng.next() * 40, 70 + rng.next() * 20, HUES.farWood, 0.75)
    clump(g, rng, x - 20, 520 + rng.next() * 60, 70 + rng.next() * 24, HUES.bush, 0.8)
    flower(g, rng, x - 30, 500, HUES.pillow)
  }
  // And above it, on a taller one: more crowns.
  for (let y = -70; y > seen.y - 60; y -= 90) for (const x of [70, 230, 960, 1120]) clump(g, rng, x + rng.next() * 40, y, 90, HUES.farWood, 0.75)

  // Bushes behind where the folk sit, with a few flowers.
  for (const [x, y, r] of BUSHES) clump(g, rng, x, y, r, HUES.bush, 0.8)
  for (const [x, y] of [[40, 470], [96, 520], [250, 452], [1130, 480], [1176, 536], [1000, 520]] as const) flower(g, rng, x, y, (x + y) % 3 === 0 ? HUES.moth : HUES.pillow)

  // The forest floor: pale earth, so that what lies on it is plain to see.
  const floor = { x: seen.x, y: FLOOR_FROM, w: seen.w, h: bottom - FLOOR_FROM }
  solid(g, rng, polygon([seen.x, FLOOR_FROM, right, FLOOR_FROM, right, bottom, seen.x, bottom]), floor, HUES.earth, { angle: 0.12, gap: 3, press: 0.75, depth: 0.45, down: 0.9, across: 0, bare: 0, edge: 0, width: 2 })

  // Marks of the forest floor, small and pale: needles, crumbs of earth, a clover here and there.
  for (let i = 0; i < 150; i++) {
    const x = seen.x + rng.next() * seen.w, y = 650 + rng.next() * (bottom - 650), turn = rng.next() * Math.PI
    line(g, [x, y, x + Math.cos(turn) * 9, y + Math.sin(turn) * 3.5], i % 3 === 0 ? HUES.grass.dark : HUES.earth.dark, 0.5, 1.6)
  }
  for (let i = 0; i < 16; i++) {
    const x = seen.x + rng.next() * seen.w, y = 664 + rng.next() * (bottom - 664)
    for (let k = 0; k < 3; k++) fill(g, oval(x + Math.cos(k * 2.1) * 4, y + Math.sin(k * 2.1) * 2.6, 3.4, 2.4), HUES.grass.light, 0.9)
  }

  // The tree.
  solid(g, rng, blob(TREE), { x: Math.min(-40, seen.x), y: Math.min(0, seen.y), w: Math.max(1280, seen.w), h: 704 - Math.min(0, seen.y) }, HUES.trunk, { angle: 1.35, gap: 2.5, bare: 0.06, depth: 0.7, across: 0.9, down: 0.3, edge: 0.8, width: 2.4 })
  // Furrows of the bark, and moss on the roots.
  for (let i = 0; i < 26; i++) {
    const x = 410 + rng.next() * 370, y = seen.y + 20 + rng.next() * (250 - seen.y), tall = 40 + rng.next() * 70
    line(g, [x, y, x + (rng.next() - 0.5) * 14, y + tall * 0.5, x + (rng.next() - 0.5) * 10, y + tall], HUES.trunk.dark, 0.5, 2.2)
  }
  for (const [x, y, r] of [[196, 606, 40], [70, 634, 34], [980, 566, 34], [1120, 634, 36], [860, 400, 22]] as const) {
    pencil(g, rng, oval(x, y, r, r * 0.4), { x: x - r, y: y - r * 0.4, w: r * 2, h: r * 0.8 }, HUES.moss, { press: 0.8, bare: 0.1, edge: 0.3, gap: 2.4 })
  }
  // Bracket mushrooms up the trunk, and the owl's knot hole.
  for (const [x, y, s] of [[400, 330, 26], [388, 392, 20], [808, 300, 22]] as const) {
    const side = x < 600 ? -1 : 1
    const shelf = [x, y, x + side * s, y - 4, x + side * s * 0.9, y + 8, x, y + 10]
    solid(g, rng, blob(shelf), boxOf(shelf, 1), HUES.stalk, { bare: 0.3, edge: 0.8 })
  }
  solid(g, rng, oval(OWL_AT.x, OWL_AT.y - 6, 36, 42), { x: OWL_AT.x - 36, y: OWL_AT.y - 48, w: 72, h: 84 }, HUES.hollowRim, { depth: 0.3, press: 1, bare: 0, edge: 0.9, down: -0.8 })

  // The hollow: the palest, plainest place on the page, darker only up under the arch.
  solid(g, rng, archShape(), { x: 340, y: 282, w: 524, h: 322 }, HUES.hollow, { angle: -0.7, gap: 2.6, depth: 0.8, down: -1, across: 0, bare: 0, press: 0.9, edge: 0, width: 2.2 })
  const rim: Shape = (p) => {
    p.beginPath()
    p.moveTo(HOLLOW.archX - HOLLOW.archRx - 14, HOLLOW.floorY)
    p.ellipse(HOLLOW.archX, HOLLOW.floorY, HOLLOW.archRx + 14, HOLLOW.archRy + 14, 0, Math.PI, Math.PI * 2)
    p.lineTo(HOLLOW.archX + HOLLOW.archRx - 16, HOLLOW.floorY)
    p.ellipse(HOLLOW.archX, HOLLOW.floorY, HOLLOW.archRx - 16, HOLLOW.archRy - 22, 0, 0, Math.PI, true)
    p.closePath()
  }
  pencil(g, rng, rim, { x: 326, y: 268, w: 552, h: 336 }, HUES.hollowRim, { angle: 0.9, gap: 2.4, depth: 0.8, down: -0.9, across: 0, bare: 0, press: 0.95, edge: 0.6 })
  // Rootlets hanging from the arch, short and pale, well above where anything is built.
  for (const [x, len] of [[520, 34], [566, 22], [650, 40], [700, 24], [742, 30]] as const) {
    const top = HOLLOW.floorY - HOLLOW.archRy * Math.sqrt(1 - ((x - HOLLOW.archX) / HOLLOW.archRx) ** 2) + 18
    line(g, [x, top, x + 4, top + len * 0.5, x - 2, top + len], HUES.hollowRim.mid, 0.6, 2)
  }
  // Inside the hollow, up where nothing is built yet, the tree's own: a knot and the stub of a broken branch in
  // the back wall, a shelf fungus on the inner wall and a thick root hanging from the arch. All of it is in the
  // wall's own pale browns, so none of it can be taken for a thing to pick up.
  const { knot, stub, grain } = WALL_MARKS
  pencil(g, rng, blob(knot), boxOf(knot, 2), HUES.hollow, { depth: 0.2, press: 1, bare: 0, edge: 0.5, angle: 0.9, gap: 2 })
  // The grain bends round the knot on one side only.
  for (const bend of grain) line(g, bend, HUES.hollow.dark, 0.6, 1.8)
  pencil(g, rng, polygon(stub), boxOf(stub, 2), HUES.hollow, { depth: 0.35, press: 1, bare: 0, edge: 0.6, angle: 2.1, gap: 2.4 })
  // The stub is split.
  line(g, [701, 348, 704, 359], HUES.hollow.dark, 0.5, 1.4)
  const hanging = [596, 284, 624, 284, 622, 330, 612, 372, 618, 410, 606, 388, 600, 340]
  solid(g, rng, blob(hanging), boxOf(hanging, 2), HUES.root, { angle: 1.4, gap: 2.4, bare: 0.1, depth: 0.6, edge: 0.7, press: 0.85 })
  line(g, [604, 366, 594, 384, 596, 398], HUES.root.dark, 0.6, 1.8)
  line(g, [617, 404, 622, 424], HUES.root.dark, 0.6, 1.6)
  for (const [y, long] of [[384, 34], [416, 24]] as const) {
    const x = HOLLOW.archX + HOLLOW.archRx * Math.sqrt(1 - ((HOLLOW.floorY - y) / HOLLOW.archRy) ** 2) - 12
    const shelf = [x + 4, y - 3, x - long, y - 6, x - long * 0.9, y + 6, x + 4, y + 9]
    solid(g, rng, blob(shelf), boxOf(shelf, 1), HUES.stalk, { bare: 0.3, edge: 0.8 })
  }
  // The root step: the left root where it runs through the hollow, round on top at its shoulder, with a toe
  // that turns down into the earth. Its grain runs along it.
  const step = [
    336, HOLLOW.floorY + 4, 336, HOLLOW.stepY + 4, 372, HOLLOW.stepY - 1, 430, HOLLOW.stepY + 1, HOLLOW.stepRight - 12, HOLLOW.stepY,
    HOLLOW.stepRight + 6, HOLLOW.stepY + 12, HOLLOW.stepRight + 12, HOLLOW.stepY + 46, HOLLOW.stepRight + 28, HOLLOW.floorY - 8, HOLLOW.stepRight + 30, HOLLOW.floorY + 4,
  ]
  solid(g, rng, blob(step), boxOf(step, 1), HUES.root, { angle: 0.12, gap: 2.4, bare: 0, depth: 0.6, edge: 0.85, press: 0.95, width: 2.2 })
  line(g, [346, HOLLOW.stepY + 20, 400, HOLLOW.stepY + 14, 462, HOLLOW.stepY + 19, HOLLOW.stepRight - 2, HOLLOW.stepY + 34], HUES.root.dark, 0.55, 2)
  line(g, [342, HOLLOW.stepY + 46, 392, HOLLOW.stepY + 40, 440, HOLLOW.stepY + 50, HOLLOW.stepRight + 2, HOLLOW.stepY + 66, HOLLOW.stepRight + 16, HOLLOW.floorY - 10], HUES.root.dark, 0.5, 2)
  line(g, [350, HOLLOW.floorY - 16, 410, HOLLOW.floorY - 22, 458, HOLLOW.floorY - 12], HUES.root.dark, 0.4, 1.8)
  // A rootlet off its shoulder.
  line(g, [HOLLOW.stepRight + 8, HOLLOW.stepY + 26, HOLLOW.stepRight + 26, HOLLOW.stepY + 34, HOLLOW.stepRight + 34, HOLLOW.stepY + 52], HUES.root.mid, 0.8, 2.6)
  const lip = [338, HOLLOW.floorY, 866, HOLLOW.floorY, 880, 640, 700, 636, 480, 634, 330, 642]
  solid(g, rng, polygon(lip), boxOf(lip, 1), HUES.root, { angle: 0.2, gap: 2.8, bare: 0.1, edge: 0.5, press: 0.9, down: 1 })
  line(g, [HOLLOW.stepRight + 30, HOLLOW.floorY + 1, 610, HOLLOW.floorY - 1, 730, HOLLOW.floorY + 2, 862, HOLLOW.floorY], HUES.root.dark, 0.9, 3)

  // Grass along the foot of the tree and the edges of the floor, toadstools and ferns in the corners.
  for (let x = seen.x; x < right; x += 44) {
    if (x > 230 && x < 960) continue
    tuft(g, rng, x + rng.next() * 20, 668 + rng.next() * 12, 26 + rng.next() * 12, HUES.grass, 0.9)
  }
  for (const [x, y] of [[196, 742], [372, 760], [486, 736], [600, 760], [704, 744], [846, 742], [1040, 748], [20, 730], [1160, 730], [300, 664], [900, 668]] as const) tuft(g, rng, x, y, 16, HUES.grass, 0.7)
  toadstool(g, rng, 30, 704, 52)
  for (const x of beyond) toadstool(g, rng, x + 20, 716 + rng.next() * 30, 40 + rng.next() * 20)
  toadstool(g, rng, 1150, 716, 60)
  toadstool(g, rng, 1108, 700, 34)
  fern(g, rng, seen.x - 6, bottom + 6, 150, -1.05, HUES.fern, 1)
  fern(g, rng, seen.x - 10, bottom + 10, 110, -0.3, HUES.fern, 1)
  fern(g, rng, right + 6, bottom + 6, 150, Math.PI + 1.05, HUES.fern, 1)
  fern(g, rng, right + 10, bottom + 10, 110, Math.PI + 0.3, HUES.fern, 1)
  fern(g, rng, seen.x - 6, 300, 150, 0.5, HUES.fern, 0.85)
  fern(g, rng, right + 6, 612, 130, Math.PI + 0.45, HUES.fern, 0.85)
  // Leaves hanging in from above, at both top corners.
  for (const [x, y, turn] of [[seen.x + 40, seen.y + 40, 0.5], [seen.x + 120, seen.y + 22, 0.9], [seen.x + 210, seen.y + 46, 0.3], [right - 170, seen.y + 30, 2.4], [right - 90, seen.y + 54, 2.1], [right - 10, seen.y + 96, 2.7]] as const) {
    const points = [x, y, x + Math.cos(turn) * 34 - Math.sin(turn) * 12, y + Math.sin(turn) * 34 + Math.cos(turn) * 12, x + Math.cos(turn) * 62, y + Math.sin(turn) * 62, x + Math.cos(turn) * 34 + Math.sin(turn) * 12, y + Math.sin(turn) * 34 - Math.cos(turn) * 12]
    solid(g, rng, blob(points), boxOf(points, 1), HUES.fern, { gap: 2.6, bare: 0.15, edge: 0.6 })
  }
}

/** The hill's outline, added to the path being built: the view cuts the sun off behind it. The same curve the wood is drawn with. */
export function hillOutline(g: Pen, seen: Box): void {
  const points = hillPoints(seen), count = points.length / 2
  for (let i = 0; i < count; i++) {
    const ax = points[i * 2], ay = points[i * 2 + 1]
    const bx = points[((i + 1) % count) * 2], by = points[((i + 1) % count) * 2 + 1]
    if (i === 0) g.moveTo((ax + bx) / 2, (ay + by) / 2)
    else g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2)
  }
  g.quadraticCurveTo(points[0], points[1], (points[0] + points[2]) / 2, (points[1] + points[3]) / 2)
  g.closePath()
}

/**
 * The wood at dusk, drawn once: the day's wood with a blue-violet pencil laid over all of it in two crossing
 * layers, pressed harder toward the top, and a few stars left as paper in the sky.
 */
export function paintDusk(g: Pen, seed: number, seen: Box, day: Sheet): void {
  const rng = makeRng(seed + 7919)
  g.drawImage(day as unknown as CanvasImageSource, seen.x, seen.y, seen.w, seen.h)
  const all = polygon([seen.x, seen.y, seen.x + seen.w, seen.y, seen.x + seen.w, seen.y + seen.h, seen.x, seen.y + seen.h])
  // Two layers of blue-violet pencil, open enough for the wood to be read through them.
  pencil(g, rng, all, seen, HUES.dusk, { angle: -0.5, gap: 4.6, press: 0.8, depth: 0.3, down: -0.8, across: 0, bare: 0, edge: 0, width: 2.6 })
  pencil(g, rng, all, seen, HUES.dusk, { angle: 0.9, gap: 7, press: 0.5, depth: 0.2, down: -0.8, across: 0, bare: 0, edge: 0, width: 2.2 })
  // The hollow keeps its warmth: inside it the day's wall is laid back under one thin layer, so the house and the three read at evening.
  g.save()
  g.beginPath()
  g.moveTo(HOLLOW.archX - HOLLOW.archRx + 16, HOLLOW.floorY)
  g.ellipse(HOLLOW.archX, HOLLOW.floorY, HOLLOW.archRx - 16, HOLLOW.archRy - 22, 0, Math.PI, Math.PI * 2)
  g.closePath()
  g.clip()
  g.drawImage(day as unknown as CanvasImageSource, seen.x, seen.y, seen.w, seen.h)
  pencil(g, rng, all, seen, HUES.dusk, { angle: -0.5, gap: 11, press: 0.45, depth: 0.15, down: -0.8, across: 0, bare: 0, edge: 0, width: 2.2 })
  g.restore()
  // Stars: dots of paper, each of its own size, none in a row.
  for (const [x, y, r] of [[52, 96, 3.4], [168, 148, 2.4], [318, 110, 3], [836, 70, 2.6], [968, 142, 3.6], [1076, 92, 2.4], [1128, 300, 3], [884, 232, 2.2]] as const) fill(g, oval(x, y, r, r), HUES.paper, 0.95)
}

export type Sprites = {
  leafLoose: Sprite; leafFlat: Sprite; leafSag: Sprite; leafTent: Sprite; leafDrape: Sprite
  capUp: Sprite; capDown: Sprite; water: Sprite; glow: Sprite
  pebble: Sprite; bark: Sprite; moss: Sprite; mossSag: Sprite; feather: Sprite
  /** Each twig's own picture, and its own stump: by which of the twigs it is. */
  twigs: readonly Sprite[]; stumps: readonly Sprite[]
  fatBody: Sprite; fatCap: Sprite; fatPillow: Sprite
  tidyBody: Sprite; tidyNose: Sprite; tidyPan: Sprite
  tinyBody: Sprite; tinyLegs: Sprite; tinyHat: Sprite; tinyBrush: Sprite
  owl: Sprite; snailShell: Sprite; snailBody: Sprite; moth: Sprite; sun: Sprite
  shadow: Sprite; hand: Sprite
}

/** Every sprite of the game, drawn at `density` device pixels to a stage unit. The same seed gives the same strokes. */
export function makeSprites(make: () => Sheet, density: number, seed: number): Sprites {
  let count = 0
  const sprite = (box: Box, paint: (g: Pen, rng: Rng) => void): Sprite => {
    const rng = makeRng(seed + 101 * ++count)
    return makeSprite(make, density, { x: box.x - 3, y: box.y - 3, w: box.w + 6, h: box.h + 6 }, (g) => paint(g, rng))
  }
  return {
    leafLoose: sprite({ x: -78, y: -22, w: 148, h: 24 }, (g, r) => leaf(g, r, -10, -10, 20)),
    leafFlat: sprite({ x: -78, y: -20, w: 148, h: 22 }, (g, r) => leaf(g, r, -14, -6, 12)),
    leafSag: sprite({ x: -78, y: -28, w: 148, h: 32 }, (g, r) => leaf(g, r, -22, -4, 12)),
    leafTent: sprite({ x: -78, y: -36, w: 148, h: 38 }, (g, r) => leaf(g, r, -2, -28, 12)),
    leafDrape: sprite({ x: -72, y: -22, w: 144, h: 24 }, leafDraped),
    capUp: sprite({ x: -28, y: -36, w: 56, h: 40 }, capUp),
    capDown: sprite({ x: -28, y: -36, w: 56, h: 37 }, capDown),
    water: sprite({ x: -23, y: -35, w: 46, h: 12 }, water),
    glow: sprite({ x: -86, y: -60, w: 172, h: 120 }, glow),
    pebble: sprite({ x: -36, y: -48, w: 72, h: 50 }, pebble),
    bark: sprite({ x: -79, y: -26, w: 158, h: 30 }, bark),
    twigs: TWIGS.map((look) => sprite({ x: -22, y: -118, w: 44, h: 120 }, (g, r) => twig(g, r, look))),
    stumps: TWIGS.map((look) => sprite({ x: -22, y: -60, w: 44, h: 62 }, (g, r) => stump(g, r, look))),
    moss: sprite({ x: -55, y: -47, w: 110, h: 49 }, moss),
    mossSag: sprite({ x: -57, y: -36, w: 114, h: 52 }, mossSag),
    feather: sprite({ x: -57, y: -22, w: 115, h: 26 }, feather),
    fatBody: sprite({ x: -108, y: -248, w: 216, h: 256 }, fatBody),
    fatCap: sprite({ x: -58, y: -54, w: 158, h: 126 }, fatCap),
    fatPillow: sprite({ x: -100, y: -44, w: 200, h: 82 }, fatPillow),
    tidyBody: sprite({ x: -50, y: -330, w: 100, h: 336 }, tidyBody),
    tidyNose: sprite({ x: -50, y: -10, w: 52, h: 20 }, tidyNose),
    tidyPan: sprite({ x: -106, y: -10, w: 120, h: 72 }, tidyPan),
    tinyBody: sprite({ x: -46, y: -134, w: 92, h: 136 }, tinyBody),
    tinyLegs: sprite({ x: -34, y: -6, w: 62, h: 44 }, tinyLegs),
    tinyHat: sprite({ x: -68, y: -64, w: 136, h: 74 }, tinyHat),
    tinyBrush: sprite({ x: -20, y: -58, w: 40, h: 68 }, tinyBrush),
    owl: sprite({ x: -34, y: -64, w: 68, h: 66 }, owl),
    snailShell: sprite({ x: -20, y: -35, w: 40, h: 36 }, snailShell),
    snailBody: sprite({ x: -24, y: -32, w: 72, h: 34 }, snailBody),
    moth: sprite({ x: -30, y: -20, w: 60, h: 34 }, moth),
    sun: sprite({ x: -68, y: -68, w: 136, h: 136 }, sun),
    shadow: sprite({ x: -50, y: -7, w: 100, h: 14 }, shadow),
    hand: sprite({ x: -38, y: -6, w: 76, h: 98 }, hand),
  }
}

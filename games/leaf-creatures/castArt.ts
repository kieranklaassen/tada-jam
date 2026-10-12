import { INK, blobPath, ellipsePath, type Ink, type Wax } from './crayon'

// The three who are always in the frame, and the small things the view lays
// over the clearing, drawn in wax crayon about 0, 0 in stage units. The
// faces are finished by the view: pupils, lids, cheeks and mouths move, so
// they are not part of these drawings.

const soft = (angle: number, gap = 4, width = 4.6, alpha = 0.95) => ({ angle, gap, width, alpha })

/** Where the moving parts of a wind child's face go, from its middle. The big one and the small one are built differently. */
export const WIND_FACE = {
  big: { eyeX: 31, eyeY: -24, eyeR: 18, cheekX: 54, cheekY: 12, cheekR: 27, mouthY: 26, browY: -52 },
  small: { eyeX: 24, eyeY: -16, eyeR: 15, cheekX: 41, cheekY: 13, cheekR: 21, mouthY: 24, browY: -40 },
} as const

/** Where the tufts of each wind child's hair are, from its middle, as x, y and how far each reaches: the big one has a mop of them, the small one two bunches and a topknot. */
export const WIND_HAIR = {
  big: [[-56, -66, 21], [-24, -84, 23], [12, -86, 21], [46, -72, 23], [72, -44, 17]],
  small: [[-58, -42, 20], [58, -42, 20], [-4, -66, 14]],
} as const

/** One tuft of hair: a mass of blue scribble with a frayed edge and no outline, so no line of it curls or hooks. */
function tuft(wax: Wax, x: number, y: number, r: number, lean: number): void {
  const shape = ellipsePath(x, y, r, r * 0.82, lean)
  wax.scribble(shape, { x, y, r: r + 2 }, INK.cloudEdge, soft(lean + 0.7, 3.4, 2.8, 0.7))
  wax.scribble(shape, { x, y, r: r + 2 }, INK.gust, soft(lean - 0.6, 6, 2.6, 0.55))
  wax.fray(shape, 5)
}

/** A wind child without its pupils, cheeks, brows and mouth: a head like a small cloud with curls of wind for hair, on a cloud of a body, holding on with both hands. */
export function paintWind(wax: Wax, who: 'big' | 'small'): void {
  const big = who === 'big', f = WIND_FACE[who]
  const headX = big ? 80 : 62, headY = big ? 72 : 58
  const body = blobPath(big ? [-128, 58, -96, 28, -40, 40, 0, 30, 44, 42, 100, 28, 130, 60, 96, 92, 0, 100, -96, 92] : [-96, 50, -70, 26, -24, 36, 30, 28, 76, 30, 98, 54, 70, 80, 0, 86, -70, 80])
  wax.fill(body, { x: 0, y: big ? 62 : 54, r: big ? 134 : 102 }, INK.white, soft(0.3, 3.2, 4.4, 1), { ink: INK.cloud, stroke: soft(-0.5, 6.5, 5, 0.9) }, 5)
  // The lumpy lower edge of the cloud, pressed.
  wax.press(big ? [-128, 58, -96, 92, -48, 88, 0, 100, 50, 88, 96, 92, 130, 60] : [-96, 50, -70, 80, -30, 76, 0, 86, 36, 76, 70, 80, 98, 54], INK.cloudEdge, 3, 0.8)
  const head = ellipsePath(0, -8, headX, headY)
  wax.ctx.save(); wax.ctx.globalCompositeOperation = 'destination-out'; wax.ctx.fill(head); wax.ctx.restore()
  wax.fill(head, { x: 0, y: -8, r: headX + 6 }, INK.white, soft(big ? -0.7 : 0.9, 3, 4.4, 1), { ink: INK.cloud, stroke: soft(big ? 0.5 : -0.4, 13, 5, 0.5) }, 4)
  // The pressed outline of the head, open where the body is.
  const outline: number[] = []
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (0.78 + (i / 20) * 1.44); outline.push(Math.cos(a) * headX, -8 + Math.sin(a) * headY) }
  wax.press(outline, INK.cloudEdge, 3, 0.8)
  // Hair: tufts of scribbled wind, each a mass with no line round it.
  WIND_HAIR[who].forEach(([x, y, r], i) => tuft(wax, x, y, r, i * 0.9))
  for (const side of [-1, 1]) {
    const white = ellipsePath(side * f.eyeX, f.eyeY, f.eyeR, f.eyeR * 1.1)
    wax.fill(white, { x: side * f.eyeX, y: f.eyeY, r: f.eyeR + 3 }, INK.white, soft(0.3, 2.2, 3.4, 1), undefined, 0)
    const ring: number[] = []
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; ring.push(side * f.eyeX + Math.cos(a) * f.eyeR, f.eyeY + Math.sin(a) * f.eyeR * 1.1) }
    wax.press(ring, INK.cloudEdge, 2.2, 0.85)
    // A hand holding on to the leaves.
    const hand = ellipsePath(side * (big ? 96 : 72), big ? 60 : 52, big ? 22 : 17, big ? 17 : 13, side * 0.4)
    wax.fill(hand, { x: side * (big ? 96 : 72), y: big ? 60 : 52, r: 26 }, INK.white, soft(0.9, 2.6, 3.6, 1), { ink: INK.cloud, stroke: soft(0, 7, 3, 0.7) }, 2)
    wax.press([side * (big ? 80 : 60), big ? 50 : 44, side * (big ? 98 : 74), big ? 42 : 38, side * (big ? 116 : 87), big ? 54 : 48], INK.cloudEdge, 2.2, 0.7)
  }
  wax.press([-5, big ? 2 : 4, 0, big ? 8 : 9, 6, big ? 3 : 5], INK.cloudEdge, 2.2, 0.7)
}

export function paintCheek(wax: Wax): void {
  const shape = ellipsePath(0, 0, 26, 24)
  wax.fill(shape, { x: 0, y: 0, r: 28 }, INK.pink, soft(0.6, 3, 4.4, 0.95), { ink: INK.blush, stroke: soft(-0.7, 8, 4, 0.5) }, 5)
}

/** Where the toad's eyes and throat are, from its middle. */
export const TOAD_FACE = { eyeX: 36, eyeY: -44, eyeR: 23, throatY: 26 } as const

/** The toad without its pupils, lids and throat: squat, wide and bumpy, with a long flat mouth. */
export function paintToad(wax: Wax): void {
  const f = TOAD_FACE
  const body = blobPath([-88, 44, -76, -8, -44, -38, 0, -46, 44, -38, 76, -8, 88, 44, 46, 62, -46, 62])
  wax.fill(body, { x: 0, y: 8, r: 92 }, INK.toad, soft(0.5, 4.4, 5.4, 0.96), { ink: INK.toadDark, stroke: soft(-0.6, 11, 5, 0.5) }, 4)
  const belly = ellipsePath(0, 34, 52, 24)
  wax.fill(belly, { x: 0, y: 34, r: 54 }, INK.belly, soft(0.1, 3.6, 4.4, 0.9), undefined, 5)
  for (const side of [-1, 1]) {
    const foot = blobPath([side * 40, 56, side * 58, 50, side * 84, 60, side * 80, 72, side * 44, 72])
    wax.fill(foot, { x: side * 62, y: 62, r: 26 }, INK.toad, soft(0.2, 3.4, 4.4, 0.96), { ink: INK.toadDark, stroke: soft(1, 8, 3, 0.5) }, 3)
    const dome = ellipsePath(side * f.eyeX, f.eyeY, f.eyeR + 5, f.eyeR + 5)
    wax.fill(dome, { x: side * f.eyeX, y: f.eyeY, r: f.eyeR + 8 }, INK.toad, soft(0.8, 3.6, 4.4, 0.96), undefined, 3)
    const white = ellipsePath(side * f.eyeX, f.eyeY, f.eyeR, f.eyeR)
    wax.ctx.save(); wax.ctx.globalCompositeOperation = 'destination-out'; wax.ctx.fill(white); wax.ctx.restore()
    wax.fill(white, { x: side * f.eyeX, y: f.eyeY, r: f.eyeR + 2 }, INK.belly, soft(-0.3, 2.4, 3.6, 1), { ink: INK.white, stroke: soft(0.5, 4, 3.4, 0.9) }, 0)
    const ring: number[] = []
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; ring.push(side * f.eyeX + Math.cos(a) * f.eyeR, f.eyeY + Math.sin(a) * f.eyeR) }
    wax.press(ring, INK.toadDark, 2.6, 0.85)
  }
  for (const [x, y] of [[-58, 4], [-30, -20], [8, -26], [50, -14], [64, 22], [-66, 30]] as const) {
    const bump = ellipsePath(x, y, 6, 5)
    wax.fill(bump, { x, y, r: 7 }, INK.toadDark, soft(0.3, 2.4, 3, 0.75), undefined, 0)
  }
  wax.press([-62, -2, -30, 8, 0, 10, 30, 8, 62, -2], INK.toadDark, 3.2, 0.85)
}

/** The toad's lid: a dome of its own green that sinks over an eye. */
export function paintLid(wax: Wax): void {
  const shape = ellipsePath(0, 0, 25, 25)
  wax.fill(shape, { x: 0, y: 0, r: 27 }, INK.toad, soft(0.8, 3, 4.4, 1), { ink: INK.toadDark, stroke: soft(-0.4, 9, 3, 0.4) }, 2)
}

/** One frond of the fern, growing up from 0, 0 with its tip near 0, -`tall`. */
export function paintFrond(wax: Wax, tall: number): void {
  const pairs = Math.round(tall / 17)
  for (let i = 0; i < pairs; i++) {
    const u = i / pairs, y = -8 - u * (tall - 14), reach = (1 - u * 0.85) * tall * 0.3 + 6
    for (const side of [-1, 1]) {
      const leaflet = blobPath([0, y, side * reach * 0.5, y - 9, side * reach, y - 4 - reach * 0.18, side * reach * 0.55, y + 5])
      wax.fill(leaflet, { x: side * reach * 0.5, y, r: reach * 0.7 + 4 }, INK.fern, soft(side * 0.5, 3.2, 4, 0.95), { ink: INK.fernDark, stroke: soft(-side * 0.7, 9, 3, 0.45) }, 2)
    }
  }
  wax.press([0, 4, wax.jitter() * 2, -tall * 0.5, 0, -tall], INK.fernDark, 3, 0.85)
}

/** The ghost hand, as its outline is built: the tip of its thumb, and the one top its fingers make together, which is where it touches. */
export const HAND = {
  thumb: [-36, -2],
  top: [-5, -42],
} as const

/**
 * The outline of the ghost hand: an open hand seen from above with its fingers together, like the small wind
 * child's mitten, and the thumb out to the side. Its fingers make one top, a little to the first finger's side,
 * and none stands apart: it shows no number, and no single digit.
 */
export function handOutline(): number[] {
  const { thumb, top } = HAND
  const out: number[] = [-14, 44, -24, 22]
  // The thumb, out to the side and lower than the fingers' top.
  out.push(thumb[0] + 3, thumb[1] + 9, thumb[0] - 4, thumb[1] + 1, thumb[0] + 2, thumb[1] - 6, -22, 2)
  // The fingers as one: up their first side, over the top, and down the longer slope of the other.
  out.push(-23, -16, -19, -31, -13, top[1] + 3, top[0], top[1], 5, top[1] + 2, 14, -34, 22, -24, 28, -11, 31, 6)
  out.push(32, 24, 20, 44)
  return out
}

/** The ghost hand: an open hand seen from above, fingers together. */
export function paintHand(wax: Wax): void {
  const outline = handOutline()
  wax.fill(polygonPath(outline), { x: 0, y: 4, r: 54 }, INK.white, soft(0.5, 2.6, 4, 1), { ink: INK.cream, stroke: soft(-0.6, 6, 4, 0.9) }, 2)
  wax.press(outline, INK.nutDark, 2.4, 0.8, true)
}

function polygonPath(points: readonly number[]): Path2D {
  const path = new Path2D()
  for (let i = 0; i < points.length; i += 2) { if (i === 0) path.moveTo(points[i], points[i + 1]); else path.lineTo(points[i], points[i + 1]) }
  path.closePath()
  return path
}

/**
 * The coats of the glow, first to last. The first is a solid coat of pale warm light, so whatever lies under the
 * glow is covered by it and made brighter; the yellows go over that. No coat is dark, and none lets the ground
 * through to dull it.
 */
export const GLOW_COATS: readonly { ink: Ink; stroke: { angle: number; gap: number; width: number; alpha: number } }[] = [
  { ink: INK.cream, stroke: soft(0.7, 3, 7, 1) },
  { ink: INK.glow, stroke: soft(0.7, 4.4, 6.6, 0.95) },
  { ink: INK.yellow, stroke: soft(-0.5, 9, 5, 0.55) },
]

/** The glow that marks what can be touched now: a warm yellow light under the thing, a splash of crayon with uneven lobes, filled. It has no rim and is no ring. */
export function paintGlow(wax: Wax): void {
  const shape = blobPath([-94, 4, -62, -22, -74, -58, -34, -50, -20, -82, 12, -56, 44, -78, 54, -40, 92, -30, 70, 2, 90, 40, 48, 44, 36, 76, 0, 54, -36, 78, -50, 44, -88, 44, -66, 12])
  for (const coat of GLOW_COATS) wax.scribble(shape, { x: 0, y: 0, r: 96 }, coat.ink, coat.stroke)
  wax.fray(shape, 10)
}

/** An acorn dug out of the earth: a fat nut under its own cap, lying a little askew. */
export function paintAcorn(wax: Wax): void {
  const nut = blobPath([-17, -8, -19, 10, -10, 26, 0, 32, 10, 26, 19, 10, 17, -8])
  wax.fill(nut, { x: 0, y: 10, r: 26 }, INK.gold, soft(1.3, 3, 4, 0.97), { ink: INK.nut, stroke: soft(1.1, 7, 3.4, 0.6) }, 2)
  wax.press([-8, 0, -9, 16, -4, 26], INK.cream, 3, 0.8)
  const cap = blobPath([-23, -6, -20, -22, 0, -30, 20, -22, 23, -6, 0, -1])
  wax.fill(cap, { x: 0, y: -14, r: 26 }, INK.nut, soft(0.2, 3, 4, 0.97), { ink: INK.nutDark, stroke: soft(-0.9, 5, 3, 0.7) }, 2)
  wax.press([0, -30, 3, -37], INK.nutDark, 3.2, 0.9)
}

/** The redness of a wind child that strains: a scribble of blush over its whole face. */
export function paintFlush(wax: Wax): void {
  const shape = ellipsePath(0, 0, 70, 54)
  wax.scribble(shape, { x: 0, y: 0, r: 72 }, INK.blush, soft(0.5, 6, 6, 0.7))
  wax.scribble(shape, { x: 0, y: 0, r: 72 }, INK.red, soft(-0.6, 12, 5, 0.35))
  wax.fray(shape, 12)
}

/** An eye squeezed shut: white over the eye, and one pressed curve. */
export function paintShut(wax: Wax): void {
  const shape = ellipsePath(0, 0, 17, 12)
  wax.fill(shape, { x: 0, y: 0, r: 19 }, INK.white, soft(0.3, 2.2, 3.4, 1), undefined, 0)
  wax.press([-14, -3, -6, 4, 6, 4, 14, -3], INK.cloudEdge, 3, 0.9)
}

/** A hand of cloud with its fingers spread: what the small wind child hides behind. */
export function paintMitt(wax: Wax): void {
  const shape = blobPath([-24, 14, -26, -6, -18, -18, 0, -23, 18, -18, 26, -6, 24, 14, 0, 24])
  wax.fill(shape, { x: 0, y: 0, r: 30 }, INK.white, soft(0.9, 2.6, 3.6, 1), { ink: INK.cloud, stroke: soft(0, 7, 3, 0.7) }, 2)
  wax.press([-24, 14, -26, -6, -18, -18, 0, -23, 18, -18, 26, -6, 24, 14], INK.cloudEdge, 2.4, 0.8)
}

/** The small wind child's hand, as its outline is built: where its thumb ends, how high its fingers reach as one rounded top, and the puff of wind it stirs. */
export const STIR = {
  thumb: [-34, 2],
  top: -37,
  puff: { x: 30, y: -44 },
} as const

/**
 * The outline of that hand: open and held up flat with its fingers together, like a mitten, and the thumb out to the
 * side. It has one rounded top and no finger of its own, so it shows no number and no single digit.
 */
export function stirOutline(): number[] {
  const { thumb, top } = STIR
  const out: number[] = [-12, 42, -24, 22]
  out.push(thumb[0] + 4, thumb[1] + 9, thumb[0] - 3, thumb[1] + 2, thumb[0] + 3, thumb[1] - 6, -24, -2)
  out.push(-25, -18, -17, top + 6, -6, top, 6, top, 17, top + 5, 25, -19, 28, 4, 24, 24, 12, 42)
  return out
}

/** The open hand the small wind child stirs the air with, fingers together, and the soft puff of wind it stirs. */
export function paintStir(wax: Wax): void {
  const outline = stirOutline()
  wax.fill(polygonPath(outline), { x: 0, y: 4, r: 52 }, INK.white, soft(1.4, 2.4, 3.4, 1), { ink: INK.cloud, stroke: soft(0.2, 6, 3, 0.7) }, 2)
  wax.press(outline, INK.cloudEdge, 2.6, 0.8, true)
  // The wind it stirs: a small frayed puff of scribble beside the hand, with no line to it.
  const { x, y } = STIR.puff, puff = ellipsePath(x, y, 12, 8, -0.5)
  wax.scribble(puff, { x, y, r: 13 }, INK.gust, soft(0.4, 3, 2.6, 0.75))
  wax.fray(puff, 5)
}

/** The patch of shade under something that is off the ground. */
export function paintShade(wax: Wax): void {
  const shape = ellipsePath(0, 0, 56, 22)
  wax.fill(shape, { x: 0, y: 0, r: 58 }, INK.soilDark, soft(0.05, 4, 4.6, 0.6), undefined, 7)
}

const AIR_INKS: readonly [Ink, Ink][] = [[INK.orange, INK.red], [INK.yellow, INK.gold], [INK.red, INK.barkDark], [INK.olive, INK.leafGreen]]

/** A small leaf in the air: one of four hues. */
export function paintAirLeaf(wax: Wax, hue: number): void {
  const [ink, vein] = AIR_INKS[hue % AIR_INKS.length]
  const shape = blobPath([-15, 0, -4, -9, 10, -7, 17, 0, 10, 7, -4, 9])
  wax.fill(shape, { x: 0, y: 0, r: 18 }, ink, soft(0.5 + hue, 2.6, 3.4, 0.95), undefined, 2)
  wax.press([-19, 0, 14, 0], vein, 1.6, 0.7)
}

/** A pupil: a dark dot pressed hard, with a speck of paper left in it. */
export function paintPupil(wax: Wax): void {
  const shape = ellipsePath(0, 0, 8, 8)
  wax.fill(shape, { x: 0, y: 0, r: 9 }, INK.dark, soft(0.6, 1.8, 3, 1), undefined, 0)
  wax.ctx.save(); wax.ctx.globalCompositeOperation = 'destination-out'; wax.ctx.fill(ellipsePath(-2.6, -2.8, 1.9, 1.9)); wax.ctx.restore()
}

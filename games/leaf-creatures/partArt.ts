import { INK, blobPath, ellipsePath, type Wax } from './crayon'
import { PART_SIZE, type Kind } from './parts'
import { AHEAD } from './pen'

// The seven parts, drawn in wax crayon, each lying along x with its stem to
// the left and its middle at 0, 0, in stage units. They are the plainest
// things in the frame: one flat shape in one or two layers of crayon, a
// pressed edge and a vein or two, light and warm so they stand off the dark,
// cool earth. No part has a face; only a cap, turned over, is an eye.

function polygon(points: readonly number[]): Path2D {
  const path = new Path2D()
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) path.moveTo(points[i], points[i + 1])
    else path.lineTo(points[i], points[i + 1])
  }
  path.closePath()
  return path
}

/** The upper half of a maple leaf from the stem round to the tip; the lower half mirrors it. */
const MAPLE_HALF = [-26, -4, -38, -30, -12, -19, -4, -45, 17, -43, 13, -19, 31, -17, 49, 0]

function mapleOutline(): number[] {
  const out = [...MAPLE_HALF]
  for (let i = MAPLE_HALF.length - 4; i >= 0; i -= 2) out.push(MAPLE_HALF[i], -MAPLE_HALF[i + 1])
  return out
}

function lens(from: number, to: number, half: number): Path2D {
  const path = new Path2D(), mid = (from + to) / 2
  path.moveTo(from, 0)
  path.quadraticCurveTo(mid - (to - from) * 0.1, -half * 1.9, to, 0)
  path.quadraticCurveTo(mid - (to - from) * 0.1, half * 1.9, from, 0)
  path.closePath()
  return path
}

/** The outline of a twig: thicker at the stem end, bent once, and broken off jagged at the far end. */
export const TWIG_OUTLINE: readonly number[] = [-49, -3, -20, -8, 10, -4, 44, -8, 47, -3, 51, -1, 46, 2, 49, 5, 10, 6, -20, 2, -48, 7]
/** The knots of a twig, as x, y and two radii: two, of different size, unevenly placed. */
export const TWIG_KNOTS: readonly (readonly [number, number, number, number])[] = [[-27, -2, 4.4, 3], [24, 0, 3.2, 2.4]]
/** The lines pressed on to a twig: one, along its underside. */
export const TWIG_PRESSED: readonly (readonly number[])[] = [[-48, 7, -20, 2, 10, 6, 44, 4]]
/** The stripes of a seed, before it is drawn two fifths larger: each from the blunt end's side round to the tip at 25, 0. */
export const SEED_STRIPES: readonly (readonly number[])[] = [[-17, -4, 3, -8, 16, -5, 25, -1], [-7, 7, 9, 7, 25, 1]]
/** How far the rim of a cap is from its middle, before it is drawn larger. */
export const CAP_RIM = 23

/** How far apart the scales of a cap are across a row, and from row to row. */
export const CAP_SCALE = { across: 8, down: 6.5 } as const

/** The scales on a cap: small arcs in rows, each row set off from the next by half a scale, every one inside the rim and clear of the stalk. */
export function capScales(): number[][] {
  const scales: number[][] = []
  for (let row = -3; row <= 3; row++) {
    const y = row * CAP_SCALE.down - 1.5
    for (let k = -3; k <= 3; k++) {
      const x = k * CAP_SCALE.across + (row % 2 === 0 ? 0 : CAP_SCALE.across / 2)
      const arc = [x - 3.2, y, x - 2, y + 2.4, x, y + 3.2, x + 2, y + 2.4, x + 3.2, y]
      let inside = Math.hypot(x, y + 1.5) > 7.5
      for (let i = 0; i < arc.length; i += 2) if (Math.hypot(arc[i], arc[i + 1]) > CAP_RIM - 2.5) inside = false
      if (inside) scales.push(arc)
    }
  }
  return scales
}

/** Draws one part. `look` picks one of its drawings: the same shape, scribbled by a hand that never repeats itself. */
export function paintPart(wax: Wax, kind: Kind, look: number): void {
  wax.ctx.save()
  wax.ctx.scale(PART_SIZE, PART_SIZE)
  drawPart(wax, kind, look)
  wax.ctx.restore()
}

/** The underside of a maple wing, seen for a moment as it is lifted: the same outline, pale, with its ribs. */
export function paintPale(wax: Wax): void {
  wax.ctx.save()
  wax.ctx.scale(PART_SIZE, PART_SIZE)
  const shape = polygon(mapleOutline())
  wax.fill(shape, { x: 4, y: 0, r: 54 }, INK.cream, { angle: -0.7, gap: 4.4, width: 5.2, alpha: 0.96 }, { ink: INK.tan, stroke: { angle: 0.6, gap: 9, width: 4.4, alpha: 0.6 } })
  wax.press([-50, 2, -26, 0], INK.barkDark, 3, 0.8)
  wax.press([-22, 0, 44, 0], INK.orange, 2.4, 0.7)
  wax.press(mapleOutline(), INK.orange, 2.4, 0.5, true)
  wax.ctx.restore()
}

function drawPart(wax: Wax, kind: Kind, look: number): void {
  const lean = look * 0.22
  switch (kind) {
    case 'twig': {
      // One post: a bent stick with a broken end and two knots. One pressed line runs along its underside, and
      // nothing is drawn across it or branches from it.
      const shape = polygon(TWIG_OUTLINE)
      wax.fill(shape, { x: 0, y: 0, r: 52 }, INK.birch, { angle: 0.04 + lean * 0.3, gap: 3, width: 3.4, alpha: 0.96 }, { ink: INK.tan, stroke: { angle: 0.02, gap: 7, width: 2.4, alpha: 0.55 } }, 2)
      for (const [x, y, rx, ry] of TWIG_KNOTS) wax.fill(ellipsePath(x, y, rx, ry, 0.3), { x, y, r: rx + 1 }, INK.barkDark, { angle: 0.9, gap: 1.8, width: 2.2, alpha: 0.75 }, undefined, 0)
      for (const line of TWIG_PRESSED) wax.press(line, INK.barkDark, 2.6, 0.65)
      return
    }
    case 'maple': {
      const shape = polygon(mapleOutline())
      wax.fill(shape, { x: 4, y: 0, r: 54 }, INK.orange, { angle: 0.7 + lean, gap: 5, width: 5.4, alpha: 0.95 }, { ink: INK.red, stroke: { angle: -0.6 - lean, gap: 9, width: 5, alpha: 0.6 } })
      wax.press([-50, 2, -26, 0], INK.barkDark, 3, 0.8)
      for (const [x, y] of [[44, 0], [16, -38], [16, 38], [-34, -26], [-34, 26]] as const) wax.press([-22, 0, x, y], INK.red, 2.2, 0.7)
      wax.press(mapleOutline(), INK.red, 2.4, 0.5, true)
      return
    }
    case 'willow': {
      const shape = lens(-60, 64, 14)
      wax.fill(shape, { x: 2, y: 0, r: 66 }, INK.lime, { angle: 0.25 + lean, gap: 4, width: 4.6, alpha: 0.96 }, { ink: INK.leafGreen, stroke: { angle: -0.9, gap: 10, width: 4, alpha: 0.5 } })
      wax.press([-68, 1, -30, -1, 20, 1, 62, 0], INK.leafGreen, 2.4, 0.8)
      return
    }
    case 'round': {
      const shape = blobPath([-27, 0, -20, -24, 6, -32, 30, -20, 40, 0, 30, 20, 6, 32, -20, 24])
      wax.fill(shape, { x: 6, y: 0, r: 38 }, INK.yellow, { angle: -0.5 + lean, gap: 4.5, width: 5.2, alpha: 0.97 }, { ink: INK.gold, stroke: { angle: 0.8, gap: 10, width: 4.4, alpha: 0.55 } })
      wax.press([-40, -2, -26, 0], INK.nutDark, 2.8, 0.8)
      for (const [x, y] of [[32, 0], [14, -24], [14, 24]] as const) wax.press([-22, 0, x, y], INK.gold, 2, 0.75)
      return
    }
    case 'feather': {
      // A feather, not a leaf: a bare quill at the stem end, a vane that widens toward a blunt blue tip, barbs that all slant one way, and two splits in its edge.
      const vane = blobPath([-34, 0, -22, -12, 6, -19, 36, -17, 56, -8, 60, 0, 56, 8, 36, 17, 6, 19, -22, 12])
      wax.fill(vane, { x: 12, y: 0, r: 52 }, INK.white, { angle: 1.1 + lean, gap: 3, width: 3.6, alpha: 0.98 }, { ink: INK.cloud, stroke: { angle: 1.0, gap: 8, width: 3.4, alpha: 0.75 } }, 4)
      const tip = blobPath([34, -17, 56, -8, 60, 0, 56, 8, 34, 17, 40, 0])
      wax.fill(tip, { x: 48, y: 0, r: 22 }, INK.cloudEdge, { angle: 1.2, gap: 3.4, width: 3.4, alpha: 0.85 }, undefined, 3)
      wax.ctx.save()
      wax.ctx.globalCompositeOperation = 'destination-out'
      for (const [x, y] of [[14, -1], [-6, 1]] as const) wax.ctx.fill(polygon([x, y * 21, x + 9, y * 21, x + 2, y * 7]))
      wax.ctx.restore()
      for (let x = -24; x <= 44; x += 9) {
        wax.press([x, 0, x + 10, -13 + wax.jitter()], INK.cloudEdge, 1.5, 0.6)
        wax.press([x, 0, x + 10, 13 + wax.jitter()], INK.cloudEdge, 1.5, 0.6)
      }
      wax.press([-58, 1, -34, 0], INK.tan, 3.6, 0.95)
      wax.press([-58, 1, -10, -1, 56, 0], INK.cloudEdge, 2.4, 0.9)
      return
    }
    case 'seed': {
      // As large in the hand as any other part.
      wax.ctx.scale(1.4, 1.4)
      const shape = blobPath([-24, 0, -16, -13, 4, -13, 27, 0, 4, 13, -16, 13])
      wax.fill(shape, { x: 0, y: 0, r: 30 }, INK.cream, { angle: 0.1 + lean, gap: 3, width: 3.6, alpha: 0.97 }, { ink: INK.tan, stroke: { angle: 0.6, gap: 8, width: 3, alpha: 0.6 } }, 2)
      // Its stripes run its length, bend with its sides, are of two lengths, and meet at the tip.
      for (const stripe of SEED_STRIPES) wax.press(stripe, INK.nutDark, 2, 0.75)
      return
    }
    case 'cap': {
      const shape = ellipsePath(0, 0, CAP_RIM, CAP_RIM)
      wax.fill(shape, { x: 0, y: 0, r: 25 }, INK.tan, { angle: 0.8 + lean, gap: 3.4, width: 4, alpha: 0.97 }, { ink: INK.nut, stroke: { angle: -0.8, gap: 6, width: 3.4, alpha: 0.8 } }, 2)
      // The scales of an acorn cap: rows of small arcs, each row set off from the one above, all inside the rim; and the stalk in the middle.
      for (const scale of capScales()) wax.press(scale, INK.nutDark, 1.4, 0.5)
      wax.fray(shape, 5)
      wax.fill(ellipsePath(0, 0, 5, 5), { x: 0, y: 0, r: 6 }, INK.nutDark, { angle: 0, gap: 2, width: 3, alpha: 0.9 }, undefined, 0)
      return
    }
  }
}

/** A cap turned over: its pale inside with the rim round it, and its pupil pointing one of seventeen ways. */
export function paintEye(wax: Wax, look: number, gaze: number): void {
  wax.ctx.save()
  wax.ctx.scale(PART_SIZE, PART_SIZE)
  const rim = ellipsePath(0, 0, 23, 23), inside = ellipsePath(0, 0, 17.5, 17.5)
  wax.fill(rim, { x: 0, y: 0, r: 25 }, INK.nut, { angle: 0.6 + look * 0.3, gap: 3.2, width: 4, alpha: 0.95 }, undefined, 2)
  wax.ctx.save()
  wax.ctx.globalCompositeOperation = 'destination-out'
  wax.ctx.fill(inside)
  wax.ctx.restore()
  wax.fill(inside, { x: 0, y: 0, r: 19 }, INK.white, { angle: -0.4 + look * 0.4, gap: 2.4, width: 3.6, alpha: 1 }, undefined, 0)
  // The rim is pressed in short strokes with gaps between them, so it is the lip of a cap and no drawn ring.
  for (let i = 0; i < 5; i++) {
    const from = i * 1.26 + look, arc: number[] = []
    for (let k = 0; k <= 3; k++) arc.push(Math.cos(from + k * 0.27) * 17.5, Math.sin(from + k * 0.27) * 17.5)
    wax.press(arc, INK.nutDark, 1.8, 0.55)
  }
  const reach = gaze === AHEAD ? 0 : 7.6, angle = gaze * (Math.PI / 8)
  wax.ctx.translate(Math.cos(angle) * reach, Math.sin(angle) * reach)
  const pupil = ellipsePath(0, 0, 8.4, 8.4)
  wax.fill(pupil, { x: 0, y: 0, r: 9.4 }, INK.dark, { angle: 0.6, gap: 1.8, width: 3, alpha: 1 }, undefined, 0)
  wax.ctx.globalCompositeOperation = 'destination-out'
  wax.ctx.fill(ellipsePath(-2.7, -2.9, 2, 2))
  wax.ctx.restore()
}

/** How large a part is drawn in its heap, how far to each side of the heap's middle the back row is laid, and how far a part is nudged from its place. */
export const heapSize = (kind: Kind): number => (kind === 'maple' ? 0.6 : kind === 'willow' ? 0.62 : kind === 'feather' ? 0.7 : kind === 'twig' ? 0.74 : 0.7)
export const HEAP_ROW = 46
export const HEAP_NUDGE = 6

/** A heap of one kind: a mound of its parts lying every way, on a smudge of shade. */
export function paintHeap(wax: Wax, kind: Kind): void {
  const ctx = wax.ctx
  wax.fill(ellipsePath(0, 26, 68, 28), { x: 0, y: 26, r: 70 }, INK.soilDark, { angle: 0.1, gap: 5, width: 5, alpha: 0.5 }, undefined, 6)
  // A back row, a front row and one on top, each part drawn smaller than it is in the hand: it grows as it is lifted.
  const places = kind === 'cap' || kind === 'seed' ? 9 : kind === 'twig' ? 9 : 7
  const size = heapSize(kind)
  for (let i = 0; i < places; i++) {
    const row = i < places - 4 ? 0 : i < places - 1 ? 1 : 2
    const inRow = row === 0 ? places - 4 : 3, place = row === 0 ? i : i - (places - 4)
    const along = row === 2 ? 0 : inRow === 1 ? 0 : place / (inRow - 1) - 0.5
    const x = along * (row === 0 ? HEAP_ROW * 2 : 76) + wax.jitter() * HEAP_NUDGE, y = row === 0 ? 0 : row === 1 ? 24 : 6
    ctx.save()
    ctx.translate(x, y + wax.jitter() * 4)
    // Twigs lie like spilled matches and feathers stand in a fan, quills together; the rest lie every way.
    ctx.rotate(kind === 'twig' ? wax.jitter() * 0.6 : kind === 'feather' ? -Math.PI / 2 + along * 1.5 + (row - 1) * 0.2 + wax.jitter() * 0.15 : wax.jitter() * 3.1)
    ctx.scale(size, size)
    paintPart(wax, kind, i % 3)
    ctx.restore()
  }
}

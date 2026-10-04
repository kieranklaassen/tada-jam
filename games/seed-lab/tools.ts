// The tools of the page and the marks they leave: the watering can and the
// rocker blotter, lying in their places or in the hand; water as drops and a
// splash; the loupe, by the beetle or in the hand, and the pencil note it
// shows beside a plant; the pencil sketches of plants that left the page; the
// beetle's fence of tape; and the ghost hand of the idle ladder.
//
// Tools look like tools: zinc, wood and blotting paper in pen and wash. The
// loupe's note is a picture of the model and not of anything inside a plant,
// so it is drawn in pencil on a scrap: two beads for each trait, each a tiny
// drawing of what its factor gives, with no letter and no numeral. A note of
// wash says what each is: red in a petal, green in a stem and a leaf.

import { hand } from './creatures'
import { beetleHome } from './hit'
import { ANTHER, INK, PAPER, SCRAP, WASH, curve, hash, hatch, oval, pen, pencil, seedOf, tape, trace, wash, type Ctx, type Pt } from './ink'
import { PLANT, stemHeight, type Layout } from './layout'
import type { BeadsLive, Live, Mote, Puff, ToolLive } from './live'
import { lookCode, type Factor, type Trait } from './plant'
import { toolHome } from './reach'
import { LEAF, drawPlant, drawPod } from './specimen'
import type { PageView } from './spikePage'
import type { Easel, Sprite } from './stage'

const TAU = Math.PI * 2
const clamp = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

/** The loupe, its rim standing on the origin: a brass ring round a glass, and a turned handle. `turn` rolls it. */
export function drawLoupe(ctx: Ctx, s: number, turn: number): void {
  const h = hand(ctx, (0.55 + 0.45 * s) / s, 'beetle', 3)
  ctx.save()
  ctx.scale(s, s)
  ctx.translate(0, -27)
  ctx.rotate(turn)
  const grip = curve([[24, -4], [34, -5.5], [58, -6.5], [63, 0], [58, 6.5], [34, 5.5], [24, 4]], true)
  h.fill(grip, WASH.wood, 0.95)
  h.line(grip, 1.3, 0)
  hatch(ctx, grip, { gap: 4, angle: 1.45, alpha: 0.5 })
  const rim = oval(0, 0, 27, 27, 0, 28), glass = oval(0, 0, 21.5, 21.5, 0, 24)
  h.fill(rim, WASH.brass, 0.95)
  h.clear(glass)
  h.fill(glass, WASH.glass, 0.5, 0.5)
  h.line(rim, 1.5, 0)
  h.line(glass, 1.2, 0)
  h.line(curve([[-15, -6], [-11, -13], [-4, -16]]), 1, 0.3)
  h.line(curve([[-16, 1], [-15, -2]]), 0.9, 0.3)
  h.fill([[22, -5], [29, -6], [29, 6], [22, 5]], WASH.brass, 0.9, 0)
  h.line([[26, -5.5], [26, 5.5]], 1, 0.1)
  ctx.restore()
}

/** The loupe's kept drawing as it lies by the beetle, the beetle's scale, and the height of the glass's middle over its rim. */
export function loupeOf(e: Easel, layout: Layout): { made: Sprite; s: number; rim: number } {
  const s = beetleHome(layout).s
  return { made: e.sprite(`loupe ${s.toFixed(3)}`, -62 * s, -100 * s, 100 * s, 104 * s, (on) => drawLoupe(on, s * 0.84, Math.PI + 0.75)), s, rim: 27 * 0.84 * s }
}

/**
 * The shape of a kept drawing in bare paper. Laid under the drawing, it hides what is behind a thing that moves over
 * the page, whose washes would otherwise let it show through. `more` fills in or cuts out what the shape should not follow.
 */
export function solidOf(e: Easel, key: string, made: Sprite, more?: (on: Ctx) => void): Sprite {
  return e.sprite(`solid ${key}`, made.x, made.y, made.w, made.h, (on) => {
    // The drawing three times over makes its thin washes opaque; then all of it is turned to paper.
    for (let i = 0; i < 3; i++) on.drawImage(made.canvas, made.x, made.y, made.w, made.h)
    on.globalCompositeOperation = 'source-in'
    on.fillStyle = PAPER
    on.fillRect(made.x, made.y, made.w, made.h)
    on.globalCompositeOperation = 'source-over'
    more?.(on)
  })
}

/** Where the rose of the can is, for a can at (x, y) tipped by `tip`: water leaves it there. `u` is the tool's scale, `toolScale(layout)`. */
export function roseOf(can: ToolLive, u: number): { x: number; y: number } {
  return { x: can.x + (52 * Math.cos(can.tip) + 25 * Math.sin(can.tip)) * u, y: can.y + (52 * Math.sin(can.tip) - 25 * Math.cos(can.tip)) * u }
}

/** The scale the can and the blotter are drawn at: each fills its place. */
export const toolScale = (layout: Layout): number => Math.min(1.05 * layout.k, layout.tools.can.w / 100, layout.tools.can.h / 64)

/** A small zinc watering can, its tank's middle on the origin, its long spout and rose to the right, towards the pots. */
export function drawCan(ctx: Ctx, u: number): void {
  const lw = (0.5 + 0.5 * u) / u, seed = seedOf(301), line = (pts: readonly Pt[], w = 1.25, s = 0, taper = 0.04) => pen(ctx, pts, { w: w * lw, seed: seed + s, taper })
  ctx.save()
  ctx.scale(u, u)
  // The back handle and the carrying handle are drawn first, behind the tank.
  line(curve([[-15, -13], [-27, -15], [-35, -4], [-31, 9], [-19, 13]]), 2.2, 1, 0.02)
  line(curve([[-12, -19], [-9, -31], [1, -35], [11, -30], [13, -19]]), 2, 2, 0.02)
  const spout: Pt[] = [[16, 4], [47, -24], [50.5, -20.5], [18, 14]]
  wash(ctx, spout, WASH.zinc, { alpha: 0.85, seed: seed + 3 })
  line([spout[0], spout[1]], 1.2, 4)
  line([spout[3], spout[2]], 1.2, 5)
  const tank: Pt[] = [[-17, -18], [-20, 20], [20, 20], [17, -18]], top = oval(0, -18, 17, 4.4, 0, 20)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  trace(ctx, [...tank, ...top.slice(10, 21)], true)
  ctx.fill()
  ctx.restore()
  wash(ctx, tank, WASH.zinc, { alpha: 0.95, seed: seed + 7 })
  wash(ctx, top, WASH.shade, { alpha: 0.7, seed: seed + 8, rim: 0 })
  hatch(ctx, [[6, -15], [17, -17], [20, 20], [9, 20]], { seed: seed + 9, gap: 2.6, angle: -1.2, alpha: 0.6, w: 0.6 * lw })
  line([...tank, tank[0]], 1.35, 10, 0.01)
  line(top, 1.15, 11, 0)
  for (const y of [-11, 14]) line(curve([[-17.6 - (y + 18) * 0.08, y], [0, y + 3.4], [17.6 + (y + 18) * 0.08, y]]), 0.8, 12 + y, 0.08)
  // The rose: a flared head on the spout's end, its face full of holes.
  const rose = oval(52.5, -25.5, 5, 10, 0.74, 16)
  wash(ctx, [[46, -25], [50.5, -34], [59, -18], [49.5, -19]], WASH.zinc, { alpha: 0.9, seed: seed + 30 })
  line([[47, -24], [49.5, -33.5], [58.5, -18.5], [50.5, -20.5]], 1.1, 31, 0.02)
  // The face of the rose covers the head behind it: the head's outline showing through it would be a ring with a bar across.
  ctx.fillStyle = SCRAP
  trace(ctx, rose, true)
  ctx.fill()
  wash(ctx, rose, WASH.shade, { alpha: 0.6, seed: seed + 32, rim: 0 })
  line(rose, 1.1, 33, 0)
  for (let i = 0; i < 7; i++) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(53 + Math.cos(i * 2.4) * 2.1 + (i - 3) * 0.6, -25.5 + (i - 3) * 2.5, 0.6, 0, TAU); ctx.fill() }
  ctx.restore()
}

/** A rocker blotter, its middle on the origin: a curved pad of blotting paper under a wooden block, and a turned knob to hold it by. */
export function drawBlotter(ctx: Ctx, u: number): void {
  const lw = (0.5 + 0.5 * u) / u, seed = seedOf(302), line = (pts: readonly Pt[], w = 1.25, s = 0, taper = 0.04) => pen(ctx, pts, { w: w * lw, seed: seed + s, taper })
  ctx.save()
  ctx.scale(u, u)
  const rock = curve([[-33, 0], [-22, 9.5], [0, 14], [22, 9.5], [33, 0]], false, 2), block: Pt[] = [[-33, 0], [-33, -7], [33, -7], [33, 0], ...rock.slice().reverse()]
  const paper: Pt[] = [...rock.map(([x, y]) => [x * 1.07, y * 1.2 + 1.2] as const), [35.5, -5], [33, -5], ...rock.slice().reverse(), [-33, -5], [-35.5, -5]]
  ctx.fillStyle = SCRAP
  trace(ctx, paper, true)
  ctx.fill()
  wash(ctx, paper, WASH.pink, { alpha: 0.4, seed: seed + 1, rim: 0.3 })
  // What it has drunk: a few blots of old ink in the paper.
  for (let i = 0; i < 5; i++) wash(ctx, oval(-24 + i * 11 + 4 * hash(seed, i), 12.5 - Math.abs(i - 2) * 2.6, 2 + 1.8 * hash(seed + 1, i), 1.1, 0.1 * (2 - i), 8), WASH.shade, { alpha: 0.8, seed: seed + 2 + i, rim: 0, loose: 0.4 })
  line([...paper, paper[0]], 1.05, 8, 0)
  wash(ctx, block, WASH.wood, { alpha: 0.95, seed: seed + 9 })
  hatch(ctx, block, { seed: seed + 10, gap: 3, angle: 0.06, alpha: 0.45, w: 0.6 * lw })
  line([...block, block[0]], 1.3, 11, 0)
  const neck: Pt[] = [[-4.5, -7], [-3, -15], [3, -15], [4.5, -7]], knob = oval(0, -20.5, 11, 6.6, 0, 18)
  wash(ctx, neck, WASH.wood, { alpha: 0.95, seed: seed + 12 })
  line(neck, 1.15, 13, 0.02)
  wash(ctx, knob, WASH.wood, { alpha: 0.95, seed: seed + 14 })
  hatch(ctx, knob.slice(0, 10), { seed: seed + 15, gap: 2.4, angle: 0.5, alpha: 0.5, w: 0.6 * lw })
  line(knob, 1.3, 16, 0)
  line(curve([[-6, -23], [0, -24.6], [5, -23.6]]), 0.8, 17, 0.3)
  ctx.restore()
}

/** Drops of water, all in two passes for each of three strengths: a pale blue-grey wash and a pen outline, the point of each drop upwards. A drop is about three times its `r` high. */
export function drawDrops(ctx: Ctx, drops: readonly Mote[]): void {
  const base = ctx.globalAlpha
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#bcd0dc'
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.9
  for (let step = 1; step <= 3; step++) {
    let any = false
    for (const { x, y, r, alpha } of drops) {
      if (Math.min(3, Math.ceil(alpha * 3)) !== step) continue
      if (!any) ctx.beginPath()
      any = true
      ctx.moveTo(x, y - r * 2)
      ctx.bezierCurveTo(x + r * 0.5, y - r * 0.9, x + r * 1.15, y - r * 0.2, x + r * 1.05, y + r * 0.25)
      ctx.arc(x, y + r * 0.2, r * 1.05, 0.05, Math.PI - 0.05)
      ctx.bezierCurveTo(x - r * 1.15, y - r * 0.2, x - r * 0.5, y - r * 0.9, x, y - r * 2)
    }
    if (!any) continue
    ctx.globalAlpha = (base * step) / 3
    ctx.fill()
    ctx.stroke()
  }
  ctx.globalAlpha = base
}

/** A splash of water: a few short pen arcs thrown up and out from the point, and drops beyond them that fall as it ages. */
export function drawSplash(ctx: Ctx, puff: Puff, k: number): void {
  const age = clamp(puff.age), out = 1 - (1 - age) ** 2, r = puff.r, seed = seedOf(puff.x, puff.y, 5), drops: Mote[] = []
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha *= 1 - age ** 3
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, a = -Math.PI / 2 + side * (0.25 + 0.95 * hash(seed, i)), far = r * (0.35 + 1.1 * out) * (0.7 + 0.5 * hash(seed + 1, i)), long = r * (0.34 + 0.2 * hash(seed + 2, i))
    const x = puff.x + Math.cos(a) * far, y = puff.y + Math.sin(a) * far + r * 0.7 * age * age
    pen(ctx, curve([[x - Math.cos(a) * long, y - Math.sin(a) * long], [x - side * long * 0.12, y - long * 0.1], [x + Math.cos(a) * long * 0.6 + side * long * 0.3, y + Math.sin(a) * long * 0.4]]), { w: 1.1 * (0.5 + 0.5 * k), seed: seed + i, taper: 0.3 })
    drops.push({ x: x + Math.cos(a) * long * 1.5 + side * r * 0.2 * out, y: y + Math.sin(a) * long * 1.3 + r * 0.5 * age * age, r: (1.3 + 1.1 * hash(seed + 3, i)) * k, alpha: 1 })
  }
  drawDrops(ctx, drops)
  ctx.restore()
}

/** A line cut into dashes of `on` with gaps of `off`, measured along it. */
function dashed(pts: readonly Pt[], on: number, off: number): Pt[][] {
  const out: Pt[][] = [[]]
  let run = 0
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], long = Math.hypot(bx - ax, by - ay), steps = Math.max(1, Math.ceil(long / 0.5))
    for (let step = 0; step <= steps; step++, run += long / steps) {
      if (run % (on + off) < on) out[out.length - 1].push([ax + ((bx - ax) * step) / steps, ay + ((by - ay) * step) / steps])
      else if (out[out.length - 1].length) out.push([])
    }
  }
  return out.filter((dash) => dash.length > 1).map((dash) => [dash[0], dash[dash.length >> 1], dash[dash.length - 1]])
}

/** One bead of the loupe's note, about 13 across on the origin: a tiny drawing of what its factor gives. A `faint` one is carried and does not show: paler, its outline broken. */
function bead(ctx: Ctx, trait: Trait, factor: Factor, faint: boolean, seed: number): void {
  const line = (pts: readonly Pt[], w = 1.15) => {
    if (!faint) return pencil(ctx, pts, { seed, w, alpha: 1 })
    for (const dash of dashed(pts, 2.6, 1.9)) pencil(ctx, dash, { seed: seed + Math.round(dash[0][0] * 7), w, alpha: 1 })
  }
  ctx.save()
  if (faint) ctx.globalAlpha *= 0.5
  if (trait === 'height') {
    // A piece of stem, cut at both ends, with its joints: long for the tall factor, short for the other. A joint is a
    // swelling of the stem itself, as on a cane, and nothing is drawn across it: a bar crossed by a bar would read as a sign.
    // It lies on the note at a slant, as a cutting would: two of them upright, side by side, would be a pair of strokes.
    ctx.rotate(0.5)
    const top = factor ? -7.5 : 0.5, joints = factor ? [3.6, -3.6] : [4]
    const flank = (side: number): Pt[] => {
      const pts: Pt[] = [[1.5 * side, 7.5]]
      for (const y of joints) pts.push([1.5 * side, y + 2.2], [2.9 * side, y], [1.5 * side, y - 2.2])
      pts.push([1.5 * side, top])
      return pts
    }
    wash(ctx, [...flank(-1), ...flank(1).reverse()], WASH.stem, { alpha: 0.9, seed, rim: 0, loose: 0.3 })
    for (const side of [-1, 1]) line(curve(flank(side), false, 2), 0.9)
    // Its two cut ends are drawn, on the slant: left open, the two sides would be a pair of upright strokes.
    line([[-1.5, 7.5], [1.5, 6.6]], 0.9)
    line([[-1.5, top + 0.9], [1.5, top]], 0.9)
  } else if (trait === 'colour') {
    // The colour bead is a whole small flower, five petals round a gold eye: red for the red factor, bare paper for the
    // white. A single petal, point down, has two shoulders and a tip and reads as a heart; five round one eye read as a flower.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5, petal = oval(Math.cos(a) * 3.9, Math.sin(a) * 3.9, 3, 2.3, a, 12)
      if (factor) wash(ctx, petal, WASH.red, { alpha: 0.9, seed: seed + i, rim: 0.3, loose: 0.4 })
      line(petal, 0.95)
    }
    ctx.fillStyle = WASH.gold
    ctx.beginPath()
    ctx.arc(0, 0, 1.5, 0, TAU)
    ctx.fill()
  } else {
    // A petal bead is a petal as it is torn from the flower, lying on its side: narrow where it was joined, broad and
    // round at its far edge, with two creases from its base. A plain round outline, two side by side, would read as noughts.
    const leaf = trait === 'leaf', shape = leaf ? LEAF[factor ? 'round' : 'jagged'] : curve(TORN, true, 4), z = leaf ? 0.52 : 0.58
    if (leaf) ctx.rotate(-0.35)
    const pts = shape.map(([x, y]) => [(x - (leaf ? 15 : 14.8)) * z, y * z] as const)
    if (!leaf) for (const crease of [[[-9, -0.6], [-4, -1.6], [0.5, -3]], [[-9, 0.6], [-4, 1.6], [0.5, 3]]] as const) line(crease, 0.7)
    if (leaf) wash(ctx, pts, WASH.leaf, { alpha: 0.7, seed, rim: 0.2, loose: 0.5 })
    line(pts)
    // A leaf has a stub of stalk, a midrib and two veins on its upper half, as the plants' leaves have.
    if (leaf) for (const vein of [[[-8.4, 0.3], [-5.6, 0], [3.4, 0]], [[-2.8, -0.3], [-0.6, -3.4]], [[0.2, -0.3], [2.6, -3]]] as const) line(vein, 0.8)
    if (trait === 'petals' && !factor) for (const [x, y, r] of [[-1.6, -1.6, 1.5], [2.4, 1.4, 1.35]]) { ctx.fillStyle = '#6a6763'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill() }
  }
  ctx.restore()
}

/** A petal off its flower, in the measure of `PETAL`: a narrow claw at its base and a broad far edge that is round all the way, with no dip in it: a dip there would make a heart of it. */
const TORN: Pt[] = [[1, 0], [7, -2.6], [12, -7.6], [18.5, -10], [23.6, -7.2], [25.4, -2.6], [25.8, 0], [25.4, 2.6], [23.6, 7.2], [18.5, 10], [12, 7.6], [7, 2.6]]

/** The size of the loupe's note at scale `u`, about its middle: four rows of two beads under a head that says which parent each column came from. */
export const NOTE = { w: 46, h: 98, row: 19, col: 10, bead: 1.1, head: 7 } as const

/**
 * The loupe's note, its middle on the origin: a pencil-edged scrap with four rows, colour, height, leaf and petals,
 * each two beads side by side: on the left what came from the plant that bore the pod, on the right what came from
 * the plant that gave the dust. Where one of a pair does not show in the plant, that bead is the faint one.
 */
/**
 * A sprig of runner, the head of a copy's note: a green stem that winds from left to right with a small leaf to each
 * side by turns and a bud at its tip. It winds and bears leaves so that it is a piece of plant at any size: a level
 * dark stroke with one blob over it, as it was once drawn, reads as a minus or as half a division sign.
 */
function sprig(ctx: Ctx, x0: number, x1: number, y: number, u: number): void {
  const at = (t: number): Pt => [x0 + (x1 - x0) * t, y + Math.sin(t * Math.PI * 2.2 + 0.4) * 2.6 * u - (t - 0.5) * 3 * u]
  const stem = curve(Array.from({ length: 9 }, (_, i) => at(i / 8)))
  wash(ctx, [...stem.map(([px, py]) => [px, py - 0.9 * u] as const), ...stem.slice().reverse().map(([px, py]) => [px, py + 0.9 * u] as const)], WASH.stem, { alpha: 0.95, seed: 331, rim: 0 })
  pencil(ctx, stem, { seed: 332, w: 0.7, alpha: 0.75 })
  // Leaves by turns above and below the stem, each a small pointed oval on a slant.
  ;[0.2, 0.45, 0.7].forEach((t, i) => {
    const [px, py] = at(t), up = i % 2 === 0 ? -1 : 1
    const leaf = curve([[px, py], [px + 1.2 * u, py + up * 2.6 * u], [px + 3.6 * u, py + up * 4.4 * u], [px + 3.4 * u, py + up * 1.4 * u]], true)
    wash(ctx, leaf, WASH.leaf, { alpha: 0.9, seed: 333 + i })
    pencil(ctx, [...leaf, leaf[0]], { seed: 337 + i, w: 0.6, alpha: 0.75 })
  })
  const [bx, by] = at(1)
  const bud = curve([[bx - 0.6 * u, by], [bx + 1.2 * u, by - 2.2 * u], [bx + 3.8 * u, by - 0.6 * u], [bx + 1.6 * u, by + 1.6 * u]], true)
  wash(ctx, bud, WASH.leaf, { alpha: 0.95, seed: 341 })
  pencil(ctx, [...bud, bud[0]], { seed: 342, w: 0.7, alpha: 0.8 })
}

export function paintBeads(ctx: Ctx, pairs: BeadsLive['pairs'], u: number, from: NonNullable<BeadsLive['from']> = 'seed'): void {
  const w = NOTE.w * u, h = NOTE.h * u, scrap: Pt[] = [[-w / 2, -h / 2 + 1.5], [w / 2 - 1.5, -h / 2], [w / 2, h / 2 - 2], [-w / 2 + 2, h / 2]]
  ctx.fillStyle = SCRAP
  trace(ctx, scrap, true)
  ctx.fill()
  wash(ctx, scrap, WASH.wood, { alpha: 0.12, rim: 0.2, seed: 310 })
  pencil(ctx, [...scrap, scrap[0]], { seed: 311, w: 0.9, alpha: 0.6 })
  // The head of each column: a small pod over what came from the plant that bore the pod, a pinch of gold dust over
  // what came from the plant that gave the dust. No rule is drawn under them: a ruled bar with a picture above it and a picture below could read as a sign.
  // A plant that did not come from seed has no pod parent and no dust parent, and its note does not say it had: a
  // runner's copy has one sprig of runner over both columns, for the two its one parent carries; a packet plant has a
  // small packet, for the two it came with.
  ctx.save()
  if (from === 'runner') {
    sprig(ctx, -11 * u, 11 * u, -h / 2 + 8 * u, u)
  } else if (from === 'packet') {
    ctx.translate(-8 * u, -h / 2 + 3.5 * u)
    const box: Pt[] = [[0, 0], [16 * u, 0], [16 * u, 10 * u], [0, 10 * u]]
    wash(ctx, box, WASH.wood, { alpha: 0.25, seed: 317, rim: 0.2 })
    pencil(ctx, [...box, box[0]], { seed: 318, w: 0.8, alpha: 0.8 })
    pencil(ctx, [[0, 0], [8 * u, 4.6 * u], [16 * u, 0]], { seed: 319, w: 0.7, alpha: 0.7 })
  } else {
    ctx.translate(-NOTE.col * u - 1.5 * u, -h / 2 + 3.5 * u)
    drawPod(ctx, 0.2 * u)
  }
  ctx.restore()
  for (let i = 0; i < 6 && from === 'seed'; i++) {
    ctx.fillStyle = i % 3 === 2 ? ANTHER : WASH.gold
    ctx.beginPath()
    ctx.arc((NOTE.col + (hash(313, i) - 0.5) * 9) * u, -h / 2 + (8 + (hash(314, i) - 0.5) * 6) * u, (0.9 + 0.7 * hash(315, i)) * u, 0, TAU)
    ctx.fill()
  }
  for (const trait of ['colour', 'height', 'leaf', 'petals'] as const) {
    const pair = pairs.find((one) => one.trait === trait), row = ['colour', 'height', 'leaf', 'petals'].indexOf(trait)
    if (!pair) continue
    ;[pair.fromOnto, pair.fromDust].forEach((factor, side) => {
      ctx.save()
      ctx.translate((side ? NOTE.col : -NOTE.col) * u, ((row - 1.5) * NOTE.row + NOTE.head) * u)
      ctx.scale(u * NOTE.bead, u * NOTE.bead)
      bead(ctx, trait, factor, pair.hidden && factor === 0 && trait !== 'colour', seedOf(312, row, side))
      ctx.restore()
    })
  }
}

/** The ghost hand: a pencil drawing of a hand that points, its fingertip on the origin, the other fingers curled and the wrist running off down and to the right. `press` 0 to 1 brings the fingertip 3 px down and shortens the finger. */
export function paintHand(ctx: Ctx, u: number, press: number): void {
  const t = (3 * press) / u
  const line = (pts: readonly Pt[], w = 1.5, seed = 0) => { for (const pass of [0, 1]) pencil(ctx, curve(pts, false, 2), { seed: 90 + seed + pass * 50, w: (w * (1.5 - 0.5 * pass)) / u, alpha: 1 }) }
  ctx.save()
  ctx.scale(u, u)
  ctx.rotate(-0.35)
  const thumb: Pt[] = [[-2, 80], [-5, 65], [-10, 56], [-16.5, 48], [-18.5, 40], [-15.5, 34.5], [-10.5, 35.5], [-6.4, 40]]
  const finger: Pt[] = [[-6.2, 34], [-5.9, 20], [-5.6, 7 + t], [-3.6, 1.6 + t], [0, t], [3.6, 1.6 + t], [5.6, 7 + t], [5.9, 20], [6.2, 30.5]]
  const fist: Pt[] = [[9.5, 27.5], [14, 26.6], [17.4, 30.4], [20.4, 28], [25, 28.2], [28, 32.8], [30.6, 31.6], [34.2, 33.4], [36, 38.6], [36.4, 49], [33.5, 61], [29.5, 71], [28, 80]]
  // Inside it the paper is laid thinly back, so it reads over a plant.
  ctx.fillStyle = PAPER
  ctx.globalAlpha *= 0.86
  trace(ctx, curve([...thumb, ...finger, ...fist], false, 2), true)
  ctx.fill()
  ctx.globalAlpha /= 0.86
  line(thumb, 1.6, 1)
  line(finger, 1.7, 2)
  line(fist, 1.6, 3)
  // The nail, the two creases of the finger's knuckle, the folds between the curled fingers and the root of the thumb.
  line([[-3.1, 5 + t], [-3.3, 10 + t], [0, 11.6 + t], [3.3, 10 + t], [3.1, 5 + t]], 1, 4)
  for (const y of [20.5, 23.4]) line([[-3.2, y + 0.8], [0, y], [3.2, y + 0.8]], 0.9, 5 + y)
  line([[17.4, 30.4], [16.8, 37], [17.4, 43.5]], 1.1, 8)
  line([[28, 32.8], [27, 39], [27.2, 45.5]], 1.1, 9)
  line([[7.2, 42], [12, 45.4], [17.4, 43.5], [22.4, 47], [27.2, 45.5], [31.6, 47.6], [35.6, 44.4]], 1.1, 10)
  line([[-10.5, 35.5], [-6, 45], [0.5, 51]], 1.1, 11)
  ctx.restore()
}

/** What lies on the page whether or not anything moves: the pencil sketches of the top margin, the last drawing itself from the soil up, and the can and the blotter in their places unless they are in the hand. */
export function drawLying(e: Easel, view: PageView, layout: Layout, live: Live | null, still: boolean): void {
  const looks = (view.sketched ?? []).slice(-layout.sketches.length), u = toolScale(layout)
  looks.forEach((look, i) => {
    // The newest is drawn by the beetle as it comes home; one that a touch has set the pencil to again is drawn from its foot up once more.
    const again = live?.resketch?.index === i ? clamp(live.resketch.drawn) : null
    const box = layout.sketches[i], kk = Math.min(box.w / 64, (box.h * 0.88) / (stemHeight(4, 1) + PLANT.flower + 6)), drawn = again ?? (i < looks.length - 1 ? 1 : clamp(live?.sketching ?? 1))
    const made = e.sprite(`sketch ${lookCode(look)} ${kk.toFixed(4)}`, -box.w / 2, -box.h + 5, box.w, box.h, (on) => {
      drawPlant(on, look, kk, { pencil: true })
      pencil(on, [[-box.w * 0.36, 1], [0, 2], [box.w * 0.36, 0.6]], { seed: 320 + lookCode(look), w: 0.9, alpha: 0.5 })
    })
    const x = box.x + box.w / 2, y = box.y + box.h - 5
    // One that is finished stands still; the newest is drawn by the beetle, from its foot up, on the frame.
    if (drawn >= 1) { if (still) e.put(made, x, y) }
    else if (drawn > 0 && !still) e.placed(x, y, 0, 1, 1, () => e.band(made, 3 - drawn * (stemHeight(look.joints, kk) + (PLANT.flower + 6) * kk + 3), made.y + made.h))
  })
  if (!view.tools || !still) return
  const can = toolHome(layout, 'can'), blotter = toolHome(layout, 'blotter')
  if (!live?.can) e.put(toolsOf(e, u).can, can.x, can.y)
  if (!live?.blotter) e.put(toolsOf(e, u).blotter, blotter.x, blotter.y)
}

/** The kept drawings of the can and the blotter. */
const toolsOf = (e: Easel, u: number) => ({
  get can() { return e.sprite('can', -40 * u, -40 * u, 104 * u, 66 * u, (on) => drawCan(on, u)) },
  get blotter() { return e.sprite('blotter', -40 * u, -32 * u, 80 * u, 52 * u, (on) => drawBlotter(on, u)) },
})

/** The beetle's fence round a plant set in its corner, whose foot is at the point given: four short strips of the journal's tape stood on edge and one along their tops, going up one by one as `up` goes from 0 to 1. */
export function drawFence(ctx: Ctx, fence: NonNullable<Live['fence']>, k: number): void {
  ctx.globalCompositeOperation = 'source-over'
  for (let i = 0; i < 5; i++) {
    const done = clamp(clamp(fence.up) * 5 - i), tall = 44 * k * done, wide = 78 * k * done
    if (done <= 0) break
    if (i < 4) tape(ctx, fence.x + (i - 1.5) * 23 * k, fence.y + 5 * k - tall / 2, tall, Math.PI / 2 + (hash(330, i) - 0.5) * 0.14, 331 + i, 10 * k)
    // The rail lies along the tops of the posts and not across them: a strip across a strip would be a row of crosses.
    else tape(ctx, fence.x - 39 * k + wide / 2, fence.y - 44 * k, wide, 0.03, 336, 10 * k)
  }
}

/**
 * What is in the hand or shown by it, over the plants: the can, pouring from its rose once it is tipped past half a
 * radian, the blotter, the loupe with its glass's middle on its point, and the loupe's note beside the flower it is
 * held to, on the side with more room and never off the surface, close beside the flower with nothing drawn between.
 */
export function drawHeld(e: Easel, layout: Layout, live: Live): void {
  const { ctx, k } = e, u = toolScale(layout), lying = toolsOf(e, u)
  const under = (x: number, y: number, half: number) => { ctx.globalCompositeOperation = 'source-over'; pencil(ctx, [[x - half, y], [x - half * 0.3, y + 1.4], [x + half * 0.4, y + 1.1], [x + half, y - 0.4]], { seed: 21, w: 1.4, alpha: 0.55 }) }
  if (live.can) {
    const { x, y, tip } = live.can, rose = roseOf(live.can, u), pour = clamp((tip - 0.5) / 0.5)
    if (!live.can.rest) under(x - 4 * u, y + 30 * u, 26 * u)
    e.placed(x, y, tip, 1, 1, () => { e.put(solidOf(e, 'can', lying.can), 0, 0, 'source-over'); e.put(lying.can, 0, 0) })
    // Water leaves the rose along the spout and falls: a few pen strokes, longer the further the can is tipped.
    ctx.globalCompositeOperation = 'source-over'
    if (pour > 0) for (let i = 0; i < 5; i++) {
      const a = tip - 0.75 + (i - 2) * 0.2, v = (15 + 8 * hash(340, i)) * u, long = (0.75 + 1.1 * pour) * (0.75 + 0.4 * hash(341, i)), from = 0.1 + 0.3 * hash(342, i), stream: Pt[] = []
      for (let t = from; t <= long + 0.01; t += 0.14) stream.push([rose.x + Math.cos(a) * v * t + (i - 2) * 1.6 * u, rose.y + Math.sin(a) * v * t + 19 * u * t * t])
      if (stream.length > 1) pen(ctx, stream, { w: 1.2 * (0.5 + 0.5 * k), seed: 343 + i, taper: 0.3 })
    }
    e.mark()
  }
  if (live.blotter) {
    const { x, y, tip } = live.blotter
    if (!live.blotter.rest) under(x, y + 22 * u, 28 * u)
    e.placed(x, y, tip, 1, 1, () => { e.put(solidOf(e, 'blotter', lying.blotter), 0, 0, 'source-over'); e.put(lying.blotter, 0, 0) })
  }
  if (live.loupe) {
    // In the hand it is held by its handle from below and to the right.
    const { made, s, rim } = loupeOf(e, layout), solid = solidOf(e, 'loupe', made, (on) => {
      // The glass stays clear: the plant under it is seen through it.
      on.globalCompositeOperation = 'destination-out'
      on.beginPath()
      on.arc(0, -rim, 21.5 * 0.84 * s, 0, TAU)
      on.fill()
      on.globalCompositeOperation = 'source-over'
    })
    e.placed(live.loupe.x, live.loupe.y, Math.PI, 1, 1, () => { e.put(solid, 0, rim, 'source-over'); e.put(made, 0, rim) })
  }
  if (live.beads) {
    const { x, y, pairs } = live.beads, w = NOTE.w * k, h = NOTE.h * k, side = x <= layout.w / 2 ? 1 : -1, gap = (PLANT.flower * live.beads.k + 16 * k) * side
    const cx = Math.max(w / 2 + 4, Math.min(layout.w - w / 2 - 4, x + gap + (w / 2) * side)), cy = Math.max(h / 2 + 4, Math.min(layout.h - h / 2 - 4, y - 6 * k))
    const from = live.beads.from ?? 'seed', code = from + pairs.map((one) => `${one.trait[0]}${one.fromOnto}${one.fromDust}${one.hidden ? 1 : 0}`).join('')
    ctx.globalCompositeOperation = 'source-over'
    // The note lies close beside its flower with nothing drawn between them: a short level stroke between two pictures could read as a sign. (The stroke under a thing in the hand is another matter: it lies under the thing and is its ground.)
    e.mark()
    e.placed(cx, cy, 0.03 * side, 1, 1, () => e.put(e.sprite(`beads ${code} ${k.toFixed(3)}`, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, (on) => paintBeads(on, pairs, k, from)), 0, 0, 'source-over'))
  }
}

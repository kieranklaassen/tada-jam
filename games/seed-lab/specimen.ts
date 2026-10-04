// The specimens: one plant drawn from its look, its pot and soil, its root
// ball, a pod, a seed, a runner, a seed packet and the scrap a wish is
// sketched on. Each is drawn with the pen and the washes of ink.ts, at the
// origin, for the page to place.
//
// A plant is a working piece (ART.md, "The representation"): it shows its four
// traits and nothing else. Two plants of one look are the same drawing, down
// to the wobble of the pen, which is seeded by the look alone.

import { INK, PENCIL, SCRAP, WASH, curve, dot, hatch, oval, pen, pencil, seedOf, tape, trace, wash, type Ctx, type Pt } from './ink'
import { PLANT, type Rect } from './layout'
import { drawWhole } from './symbols'
import { lookCode, type Colour, type Leaf, type Look, type PacketId } from './plant'

/** Line weight under a scale of `k`: lines thin less than the drawing shrinks, so a small plant stays a pen drawing. */
export const weight = (k: number): number => (0.5 + 0.5 * k) / k

export type PlantOpts = {
  /** How far the plant has drawn itself, 0 to 1: the stem races up, leaves unroll as it passes, the flower opens last. */
  growth?: number
  /** A sideways lean of the top, in stem lengths, for a spring. */
  bend?: number
  /** Drawn in pencil, as a sketch: no wash but a note of the petal colour. */
  pencil?: boolean
  /** Traits a sketch leaves out, for a wish that asks for fewer than four. */
  show?: Partial<Record<keyof Look, boolean>>
  /** The pen line alone, as it stands before the wash is laid: what a growing plant shows at its tip. */
  bare?: boolean
  /**
   * Its stem, leaves and flower are laid on the white of the plate's paper first, whatever the page is painted with
   * where it stands: a white flower is white over a sky and over grass, and no colour of a plant is shifted by the
   * setting behind it. Such a drawing is laid as it is and not multiplied onto the page.
   */
  solid?: boolean
}

export const PETAL: Pt[] = [[4, 0], [10, -7.5], [18, -10.5], [24.4, -6], [25.6, 0], [24.4, 6], [18, 10.5], [10, 7.5]]
const PETAL_SHADE: Pt[] = [[4, 0], [10, -7.5], [16, -9.6], [14, -3], [15.5, 3], [16, 9.6], [10, 7.5]]
const PETAL_WASH: Record<Colour, [string, number]> = { red: [WASH.red, 0.95], pink: [WASH.pink, 0.6], white: [WASH.shade, 0.5] }

function leafOutline(kind: Leaf): Pt[] {
  if (kind === 'round') return curve(oval(15.5, 0, 10.5, 10.2, 0, 10).slice(0, -1), true)
  const top: Pt[] = [[4, 0]], teeth = 5
  for (let i = 1; i <= teeth; i++) {
    const u = i / teeth, half = 10 * Math.sin(Math.PI * Math.pow(u * 0.86, 0.75))
    const before = 10 * Math.sin(Math.PI * Math.pow((u - 0.5 / teeth) * 0.86, 0.75))
    top.push([4 + 22 * (u - 0.42 / teeth), -before * 0.5], [5.5 + 22 * u, -half])
  }
  const tip: Pt = [29, 0]
  return [...top, tip, ...top.slice(1).reverse().map(([x, y]) => [x, -y] as const), [4, 0]]
}
export const LEAF = { round: leafOutline('round'), jagged: leafOutline('jagged') }
/** The half of each leaf below its midrib, which the pen hatches. */
const LEAF_UNDER = { round: LEAF.round.filter(([, y]) => y >= -0.5), jagged: LEAF.jagged.filter(([, y]) => y >= -0.01) }

/**
 * One plant, standing on the origin and growing up the page, at scale `k`.
 * Stem joints are counted by their nodes, each with one pair of leaves; the
 * flower sits on a short stalk above the top node.
 */
export function drawPlant(ctx: Ctx, look: Look, k: number, o: PlantOpts = {}): void {
  const { growth = 1, bend = 0, show = {} } = o
  const sketch = o.pencil === true, lw = weight(k), seed = seedOf(lookCode(look), sketch ? 5 : 3)
  const line = (pts: readonly Pt[], w: number, s: number, taper = 0.2) =>
    sketch ? pencil(ctx, pts, { w: w * lw * 1.3, seed: seed + s, alpha: 0.85 }) : pen(ctx, pts, { w: w * lw, seed: seed + s, taper })
  const fill = (pts: readonly Pt[], colour: string, alpha: number, s: number, rim = 0.3) => { if (!o.bare) wash(ctx, pts, colour, { alpha, seed: seed + s, rim, loose: 1.25 }) }
  /** The paper under a shape, for a solid drawing. */
  const under = (pts: readonly Pt[]) => {
    if (!o.solid || o.bare || sketch) return
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = SCRAP
    trace(ctx, pts, true)
    ctx.fill()
  }
  const height = look.joints * PLANT.joint + PLANT.stalk
  const reach = Math.min(1, growth / 0.75), open = Math.max(0, Math.min(1, (growth - 0.7) / 0.3))
  const at = (t: number): Pt => [bend * height * t * t, -height * t]

  ctx.save()
  ctx.scale(k, k)
  // The stem stops under the flower, which faces the reader and hides the rest of it.
  const steps = Math.max(2, Math.round(look.joints * 5 * reach)), left: Pt[] = [], right: Pt[] = [], stem = reach - (open * 19) / height
  for (let i = 0; i <= steps; i++) {
    const [x, y] = at((i / steps) * stem)
    left.push([x - 2, y]); right.push([x + 2, y])
  }
  under([...left, ...right.slice().reverse()])
  if (!sketch) fill([...left, ...right.slice().reverse()], WASH.stem, 0.8, 1, 0)
  line(curve(left), 0.9, 2, 0.06)
  line(curve(right), 1.05, 3, 0.06)

  for (let joint = 1; joint <= look.joints; joint++) {
    const t = (joint * PLANT.joint) / height
    if (reach < t) break
    const [x, y] = at(t), unroll = Math.max(0.15, Math.min(1, ((reach - t) * height) / 26 + (reach >= 1 ? 1 : 0)))
    if (show.leaf !== false) {
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.translate(x + side * 3.4, y)
        ctx.scale(side * unroll, unroll)
        ctx.rotate(-0.3)
        const s = joint * 10 + side
        under(LEAF[look.leaf])
        if (!sketch) {
          fill(LEAF[look.leaf], WASH.leaf, 0.78, s)
          hatch(ctx, LEAF_UNDER[look.leaf], { seed: seed + s, gap: 2.7, w: 0.6 * lw, angle: 1.05, alpha: 0.5 })
        }
        line([[-1, 1.5], [5, 0]], 1, s + 1, 0)
        line(LEAF[look.leaf], 1, s + 2, 0)
        line(curve([[5, 0], [14, -0.8], [look.leaf === 'round' ? 22 : 26, 0]]), 0.75, s + 3, 0.3)
        for (const [from, to, rise] of look.leaf === 'round' ? [[8, 12, 7.5], [12, 19, 7]] : [[9, 13, 5.5], [15, 19, 5]]) line([[from, -0.6], [to, -rise]], 0.55, s + 4 + from, 0.35)
        ctx.restore()
      }
    }
    if (show.joints !== false) {
      const node = oval(x, y, 4.6, 3, 0, 14)
      under(node)
      if (!sketch) fill(node, WASH.leaf, 0.9, joint + 60, 0.5)
      line(node, sketch ? 1.7 : 1.2, joint + 70, 0)
    }
  }

  if (open > 0) {
    const [x, y] = at(reach)
    ctx.translate(x, y)
    ctx.rotate(bend * 1.6)
    ctx.scale(open, open)
    const noted = !sketch || show.colour !== false
    for (let petal = 0; petal < 5; petal++) {
      ctx.save()
      ctx.rotate(-Math.PI / 2 + (petal * Math.PI * 2) / 5)
      const outline = curve(PETAL, true)
      const [colour, alpha] = PETAL_WASH[look.colour]
      under(outline)
      if (noted && look.colour !== 'white') fill(outline, colour, alpha, petal + 80, 0.35)
      if (noted && look.colour === 'white') fill(PETAL_SHADE, colour, alpha, petal + 80, 0)
      line(outline, look.colour === 'white' ? 1.25 : 1.05, petal + 90, 0)
      if (look.petals === 'spotted' && show.petals !== false) {
        for (const [sx, sy, r] of [[12.5, -2.6, 2.5], [19, 2.4, 2.1]]) dot(ctx, sx, sy, r * (0.9 + 0.1 * lw), sketch ? '#6a6763' : WASH.spot)
      }
      ctx.restore()
    }
    // Two sepals under the flower, and five stamens between the petals, the same on every plant.
    for (const side of [-1, 1]) line(curve([[side * 1.6, 19], [side * 5, 22], [side * 8.5, 20]]), 0.9, 94 + side, 0.2)
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / 5
      line([[Math.cos(a) * 4.5, Math.sin(a) * 4.5], [Math.cos(a) * 8.6, Math.sin(a) * 8.6]], 0.7, 100 + i, 0)
      dot(ctx, Math.cos(a) * 9.2, Math.sin(a) * 9.2, 1.15, sketch ? '#6a6763' : '#9a6a10')
    }
    const eye = oval(0, 0, 5, 5, 0, 12)
    under(oval(0, 0, 8, 8, 0, 14))
    if (noted) fill(eye, WASH.gold, 0.95, 97, 0.4)
    line(eye, 1.1, 98, 0)
    for (let i = 0; i < 4; i++) dot(ctx, Math.cos(i * 1.7 + 0.4) * 2.2, Math.sin(i * 1.7 + 0.4) * 2.2, 0.6 * lw, sketch ? '#6a6763' : INK)
  }
  ctx.restore()
}

/** A wish asks for some traits only: the sketch draws those and leaves the others out, at a middling height when height is not asked. */
export function sketchOf(wish: Partial<Look>): { look: Look; show: PlantOpts['show'] } {
  return {
    look: { colour: wish.colour ?? 'white', joints: wish.joints ?? 2, leaf: wish.leaf ?? 'round', petals: wish.petals ?? 'plain' },
    show: { colour: wish.colour !== undefined, joints: wish.joints !== undefined, leaf: wish.leaf !== undefined, petals: wish.petals !== undefined },
  }
}

/** The slant a wish scrap is drawn on, in radians: the label hangs so until the beetle puts it straight. */
export const WISH_SLANT = -0.09

/**
 * A wish: the plant asked for, in pencil with a note of its colour, as many times as asked, on a scrap of paper held by tape.
 * A wish for two or three has that numeral pencilled beside its plants, in a margin of its own at their right.
 * The origin is the foot of the scrap, by the tape: a scrap for one is centred on it, and a wider one grows to the left.
 */
export function paintWish(ctx: Ctx, wish: { wish: Partial<Look>; count: number }, box: Rect, k: number): void {
  const count = Math.max(1, Math.min(3, Math.round(wish.count))), narrow = Math.min(box.w * 0.74, 108 * k), figure = count > 1 ? 23 * k : 0
  const w = Math.min(box.w, narrow * (0.8 + 0.2 * count) + figure), h = Math.min(box.h * 0.94, 190 * k)
  const scale = Math.min(0.7 * k, (h * 0.8) / (4 * PLANT.joint + PLANT.stalk + PLANT.flower))
  ctx.translate(-(w - narrow) / 2, 0)
  ctx.rotate(WISH_SLANT)
  const scrap: Pt[] = [[-w / 2, -h + 2], [w / 2 - 3, -h], [w / 2, -4], [w * 0.2, 0], [-w / 2 + 2, -2]]
  ctx.fillStyle = SCRAP
  trace(ctx, scrap, true)
  ctx.fill()
  wash(ctx, scrap, WASH.wood, { alpha: 0.12, rim: 0.2, seed: 50 })
  pencil(ctx, [...scrap, scrap[0]], { seed: 51, w: 0.9, alpha: 0.55 })
  const { look, show } = sketchOf(wish.wish), ground = -h * 0.12
  for (let i = 0; i < count; i++) {
    ctx.save()
    ctx.translate((i - (count - 1) / 2) * ((w - figure) / (count + 0.4)) - figure / 2, ground)
    drawPlant(ctx, look, scale * (count > 1 ? 0.8 : 1), { pencil: true, show })
    ctx.restore()
  }
  if (figure) {
    ctx.globalAlpha = 0.82
    drawWhole(ctx, count, w / 2 - figure * 0.56, ground - 15 * k, 25 * k, { fill: PENCIL })
    ctx.globalAlpha = 1
  }
  pencil(ctx, curve([[-w * 0.36, ground + 1], [0, ground + 2.5], [w * 0.36, ground]]), { seed: 52, w: 1.2 })
  tape(ctx, narrow * 0.04 + (w - narrow) / 2, 3 * k, 34 * k, 1.45, 53, 15 * k)
}

/** The sketch a waiting visitor has not shown yet: a small roll of paper. */
export function paintRoll(ctx: Ctx, k: number): void {
  const roll: Pt[] = [[-15 * k, -4 * k], [14 * k, -5 * k], [15 * k, 4 * k], [-14 * k, 5 * k]]
  ctx.fillStyle = SCRAP
  trace(ctx, roll, true)
  ctx.fill()
  wash(ctx, roll, WASH.wood, { alpha: 0.2, seed: 70 })
  pencil(ctx, [...roll, roll[0]], { seed: 71, w: 1, alpha: 0.8 })
  // The edge of the sheet where the roll ends, and a band of paper round its middle: one stroke and one soft wash, so that it does not read as a row of strokes.
  pencil(ctx, [[-11.8 * k, -4.1 * k], [-11.2 * k, 4.8 * k]], { seed: 72, w: 0.9, alpha: 0.7 })
  wash(ctx, [[-2.4 * k, -4.6 * k], [2.4 * k, -4.8 * k], [3 * k, 4.4 * k], [-1.8 * k, 4.6 * k]], WASH.wood, { alpha: 0.22, seed: 73, rim: 0.2 })
}

/**
 * A terracotta pot, its soil line on the origin. Wet soil is dark and hatched
 * and has darkened the clay under the rim; dry soil is pale and cracked. With
 * `bud`, a runner bud hangs over the rim, `reach` to the right of the middle.
 */
export function drawPot(ctx: Ctx, k: number, dry: boolean, bud = 0): void {
  const lw = weight(k), seed = seedOf(dry ? 2 : 1, 41), w = PLANT.potW / 2, h = PLANT.potH
  ctx.save()
  ctx.scale(k, k)
  const body: Pt[] = [[-w + 3, 9], [-w + 9, h - 1], [w - 9, h - 1], [w - 3, 9]]
  const rim: Pt[] = [[-w, 0], [-w + 1, 10], ...curve([[-w + 1, 10], [0, 13], [w - 1, 10]]), [w - 1, 10], [w, 0]]
  const mouth = oval(0, 1, w - 1.5, 5.2, 0, 22)
  wash(ctx, body, WASH.clay, { alpha: dry ? 0.5 : 0.74, seed, loose: 1.2 })
  wash(ctx, [...rim, ...mouth.slice(0, 12).reverse()], WASH.clay, { alpha: dry ? 0.6 : 0.85, seed: seed + 1, rim: 0.2 })
  if (!dry) wash(ctx, [[-w + 3.5, 11], [-w + 6, 27], ...curve([[-w + 6, 27], [-4, 23], [6, 29], [w - 6, 25]]), [w - 3.5, 11]], WASH.wet, { alpha: 0.34, seed: seed + 2, rim: 0.25, loose: 1.6 })
  wash(ctx, mouth, dry ? WASH.dry : WASH.wet, { alpha: dry ? 0.75 : 0.95, seed: seed + 3, rim: dry ? 0.3 : 0 })
  if (dry) {
    // Cracks, no two alike: one forked, one long and slanting, one that branches twice, one short.
    const cracks: Pt[][] = [
      [[-19, -1.5], [-15, 0.5], [-16.5, 2.8], [-12, 4.6]], [[-15, 0.5], [-10.5, -0.6]],
      [[-7, -3], [-5.5, -0.2], [-1, 1.2], [0.5, 4.2]],
      [[5, -1], [8.5, 1.6], [7, 4.4]], [[8.5, 1.6], [13, 0.8], [15, 2.6]],
      [[17, -2.4], [18.6, 0.4], [21.5, 1.2]],
    ]
    cracks.forEach((crack, i) => pen(ctx, crack, { w: (i % 2 ? 0.7 : 0.85) * lw, seed: seed + 10 + i, taper: 0.35 }))
  } else {
    hatch(ctx, mouth, { seed: seed + 4, gap: 2.1, w: 0.75 * lw, angle: -0.5, alpha: 0.9 })
    hatch(ctx, mouth, { seed: seed + 5, gap: 3.4, w: 0.6 * lw, angle: 0.7, alpha: 0.6 })
  }
  hatch(ctx, [[w - 17, 12], [w - 3.5, 10], [w - 9.5, h - 2], [w - 19, h - 2]], { seed: seed + 6, gap: 2.8, w: 0.7 * lw, angle: -1.05, alpha: 0.7 })
  pen(ctx, mouth, { w: 1.25 * lw, seed: seed + 7, taper: 0 })
  pen(ctx, rim, { w: 1.3 * lw, seed: seed + 8, taper: 0.03 })
  pen(ctx, [[-w + 3.2, 11], body[1], body[2], [w - 3.2, 11]], { w: 1.3 * lw, seed: seed + 9, taper: 0.04, wobble: 0.5 })
  if (bud > 0) drawBud(ctx, bud / k, lw, seed)
  ctx.restore()
}

/** A runner bud by itself, for one that swings or curls: as `drawPot` draws it, bent like a spring by `boing` (about -1 to 1) and coiled shut by `curl` (0 to 1). */
export function drawBudLive(ctx: Ctx, k: number, dry: boolean, reach: number, boing: number, curl: number): void {
  ctx.save()
  ctx.scale(k, k)
  drawBud(ctx, reach / k, weight(k), seedOf(dry ? 2 : 1, 41), boing, Math.max(0, Math.min(1, curl)))
  ctx.restore()
}

/** The runner bud: a stolon out of the soil, over the rim, ending in a fat bud that hangs beside the pot. */
function drawBud(ctx: Ctx, reach: number, lw: number, seed: number, boing = 0, curl = 0): void {
  let stolon = curve([[5, 0], [PLANT.potW / 2 - 6, -7], [reach - 4, -2], [reach, 11]]), bud = curve([[reach, 10], [reach - 5.5, 16], [reach - 3.5, 24], [reach + 0.5, 28], [reach + 4.5, 23], [reach + 5.5, 16]], true)
  let vein = curve([[reach - 0.5, 12], [reach - 1.5, 19], [reach + 0.5, 27]])
  if (boing || curl) {
    // Past the rim every piece of the stolon turns a little more than the one before and, as it curls, is a little shorter: a spring bends, a crozier coils.
    const from = stolon.findIndex(([x]) => x > PLANT.potW / 2 - 6), n = stolon.length - 1, all = boing * 0.75 + curl * 4.3, bent: Pt[] = stolon.slice(0, from)
    const turned = (p: Pt, about: Pt, to: Pt, a: number, z: number): Pt => [to[0] + ((p[0] - about[0]) * Math.cos(a) - (p[1] - about[1]) * Math.sin(a)) * z, to[1] + ((p[0] - about[0]) * Math.sin(a) + (p[1] - about[1]) * Math.cos(a)) * z]
    for (let i = from; i <= n; i++) { const t = (i - from + 1) / (n - from + 1); bent.push(turned(stolon[i], stolon[i - 1], bent[i - 1], all * t, 1 - 0.38 * curl * t)) }
    bud = bud.map((p) => turned(p, stolon[n], bent[n], all, 1 - 0.25 * curl))
    vein = vein.map((p) => turned(p, stolon[n], bent[n], all, 1 - 0.25 * curl))
    stolon = bent
  }
  wash(ctx, [...stolon.map(([x, y]) => [x, y - 1.3] as const), ...stolon.slice().reverse().map(([x, y]) => [x + 0.6, y + 1.3] as const)], WASH.stem, { alpha: 0.9, seed, rim: 0 })
  pen(ctx, stolon, { w: 1.15 * lw, seed: seed + 30, taper: 0.1 })
  wash(ctx, bud, WASH.leaf, { alpha: 0.9, seed: seed + 31 })
  pen(ctx, bud, { w: 1.2 * lw, seed: seed + 32, taper: 0 })
  pen(ctx, vein, { w: 0.75 * lw, seed: seed + 33 })
}

/** Where a pod hangs on its plant, from the middle of the flower at scale 1: the top it hangs by, its own middle (where a finger finds it) and its length. */
export const POD = { top: [38, 6], x: 39.5, y: 28, long: 45 } as const

/**
 * A seed pod, hanging from the origin: fat, yellow-green, a little curved. Its seeds show through as three rounds
 * that push one side of it out in bumps; down the other, smooth side runs the stitched seam it will split along.
 * The page scales it as it swells.
 */
export function drawPod(ctx: Ctx, k: number): void {
  const lw = weight(k * 1.2), seed = seedOf(88)
  ctx.save()
  ctx.scale(k * 1.2, k * 1.2)
  const smooth: Pt[] = [[-4.2, 3.4], [-6.4, 10.5], [-6.6, 19], [-4.8, 27], [-1.6, 33.4]]
  const bumps: Pt[] = [[4, 33], [8.2, 29.6], [7, 25.2], [11, 21], [9, 15.8], [11.6, 10.6], [8.4, 4.4], [3.8, 1]]
  const pod = curve([[0, 0], ...smooth, [1.6, 38], ...bumps], true, 1.5)
  wash(ctx, pod, WASH.gold, { alpha: 0.5, seed })
  wash(ctx, pod, WASH.stem, { alpha: 0.28, seed: seed + 1, rim: 0.2 })
  ;[[10.4, 5.7], [20.8, 5.5], [29.8, 4.2]].forEach(([y, r], i) => {
    const round = oval(4.2 - i * 0.6, y, r, r * 0.94, 0.4, 16)
    wash(ctx, round, WASH.leaf, { alpha: 0.42, seed: seed + 2 + i, loose: 0.4, rim: 0 })
    pen(ctx, round.slice(3, 14), { w: 0.85 * lw, seed: seed + 5 + i, taper: 0.15 })
  })
  pen(ctx, pod, { w: 1.4 * lw, seed: seed + 8, taper: 0 })
  const seam = curve([[-1.2, 2.8], [-3.6, 7], [-4.2, 13], [-4.3, 20], [-2.8, 27], [0.4, 33.6]], false, 1.8)
  pen(ctx, seam, { w: 1.1 * lw, seed: seed + 9, taper: 0.1 })
  // Stitches along the seam, each on one side of it and none across: a tick through the seam would be a small cross.
  for (let i = 3; i < seam.length - 2; i += 3) pen(ctx, [[seam[i][0] - 2.9, seam[i][1] + 0.6], [seam[i][0] - 0.5, seam[i][1]]], { w: 0.65 * lw, seed: seed + 10 + i, taper: 0.2 })
  // Three small sepals cap the top, where the flower's own were.
  for (const s of [-1, 0, 1]) pen(ctx, curve([[s * 1.4, -0.6], [s * 4, 0.4], [s * 5.6 + 0.6, 3.8 - Math.abs(s) * 1.2]]), { w: 1 * lw, seed: seed + 40 + s, taper: 0.25 })
  ctx.restore()
}

/** One seed, lying on the origin: a dark pip, fat at one end and pointed at the other, with the crease a pip has. */
export function drawSeed(ctx: Ctx, k: number, turn = 0): void {
  ctx.save()
  ctx.scale(k * 1.15, k * 1.15)
  ctx.rotate(turn)
  const seed = curve([[6.4, 0.2], [2.4, -3.4], [-2.6, -4], [-5.8, -1.6], [-5.8, 1.8], [-2.6, 4], [2.4, 3.2]], true, 1.5)
  wash(ctx, seed, WASH.wet, { alpha: 0.8, seed: 5, loose: 0.4, rim: 0.5 })
  wash(ctx, seed, WASH.clay, { alpha: 0.5, seed: 8, loose: 0.4, rim: 0 })
  pen(ctx, seed, { w: 1.15 * weight(k), seed: 6, taper: 0 })
  pen(ctx, curve([[4.6, 0.2], [0.5, -1], [-2.8, -0.4]]), { w: 0.7 * weight(k), seed: 7, taper: 0.3 })
  ctx.restore()
}

/** The root ball of a plant that is out of its pot: a clump of dark soil hanging under the origin, and a few root hairs. */
export function drawRoots(ctx: Ctx, k: number): void {
  const lw = weight(k), seed = seedOf(77)
  ctx.save()
  ctx.scale(k, k)
  const clump = curve([[-3, -1], [-10, 2], [-13, 10], [-9, 19], [-1, 23], [8, 20], [12.5, 11], [10, 3], [3, -1]], true, 2)
  wash(ctx, clump, WASH.wet, { alpha: 0.9, seed, loose: 1.4 })
  hatch(ctx, clump, { seed: seed + 1, gap: 2.4, w: 0.7 * lw, angle: -0.5, alpha: 0.8 })
  pen(ctx, clump, { w: 1.2 * lw, seed: seed + 2, taper: 0, wobble: 0.9 })
  for (const [x, y, dx, dy] of [[-7, 19, -4, 8], [0, 23, 1, 9], [7, 20, 5, 7], [-12, 11, -6, 3]]) pen(ctx, curve([[x, y], [x + dx * 0.4 + 1.5, y + dy * 0.5], [x + dx, y + dy]]), { w: 0.8 * lw, seed: seed + 3 + x, taper: 0.4 })
  ctx.restore()
}

/**
 * A runner: one stem from the soil of the parent's pot over both rims into the
 * soil of the copy's, sagging to the board between them, with a scale leaf at
 * its lowest point. `from` and `to` are the two soil points; `sag` is how far
 * below them the board lies.
 */
export function drawRunner(ctx: Ctx, from: Pt, to: Pt, sag: number, k: number): void {
  const lw = 0.5 + 0.5 * k, half = (PLANT.potW / 2) * k, seed = seedOf(71)
  const mid: Pt = [(from[0] + to[0]) / 2, from[1] + sag - 5 * k]
  const path = curve([[from[0] + 5 * k, from[1] + k], [from[0] + half - 4 * k, from[1] - 8 * k], [from[0] + half + 7 * k, from[1] + sag * 0.5], mid, [to[0] - half - 7 * k, to[1] + sag * 0.5], [to[0] - half + 4 * k, to[1] - 8 * k], [to[0] - 5 * k, to[1] + k]])
  wash(ctx, [...path.map(([x, y]) => [x, y - 1.6 * k] as const), ...path.slice().reverse().map(([x, y]) => [x, y + 1.6 * k] as const)], WASH.stem, { alpha: 0.95, seed, rim: 0 })
  pen(ctx, path, { w: 1.7 * lw, seed: seed + 1, taper: 0.05 })
  const scale = curve([[mid[0], mid[1]], [mid[0] - 5 * k, mid[1] - 9 * k], [mid[0] + 2 * k, mid[1] - 13 * k], [mid[0] + 6 * k, mid[1] - 6 * k]], true)
  wash(ctx, scale, WASH.leaf, { alpha: 0.85, seed: seed + 2 })
  pen(ctx, scale, { w: 1.05 * lw, seed: seed + 3, taper: 0 })
}

/**
 * A runner on its way: a stem stretched from the bud it grows from to
 * whatever it has hold of, sagging a little in the middle, with one scale leaf.
 */
export function drawTow(ctx: Ctx, from: Pt, to: Pt, k: number): void {
  const lw = 0.5 + 0.5 * k, seed = seedOf(72), reach = Math.hypot(to[0] - from[0], to[1] - from[1])
  const mid: Pt = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + Math.min(14 * k, reach * 0.08)]
  const path = curve([from, mid, to])
  wash(ctx, [...path.map(([x, y]) => [x, y - 1.6 * k] as const), ...path.slice().reverse().map(([x, y]) => [x, y + 1.6 * k] as const)], WASH.stem, { alpha: 0.95, seed, rim: 0 })
  pen(ctx, path, { w: 1.7 * lw, seed: seed + 1, taper: 0.05 })
  const scale = curve([[mid[0], mid[1]], [mid[0] - 5 * k, mid[1] - 9 * k], [mid[0] + 2 * k, mid[1] - 13 * k], [mid[0] + 6 * k, mid[1] - 6 * k]], true)
  wash(ctx, scale, WASH.leaf, { alpha: 0.85, seed: seed + 2 })
  pen(ctx, scale, { w: 1.05 * lw, seed: seed + 3, taper: 0 })
}

const PACKET_BAND: Record<PacketId, string> = { pink: WASH.pink, short: WASH.gold, jagged: WASH.leaf, spots: WASH.spot }

/**
 * A seed packet: a folded paper envelope, `w` by `h` from its top left corner.
 * No lettering: a packet is told by the pressed mark on its face (a whole
 * flower, a low sprig, a jagged leaf, a spotted petal) and by its band of wash.
 */
export function drawPacket(ctx: Ctx, id: PacketId, w: number, h: number): void {
  const seed = seedOf(id.length, id.charCodeAt(0), 9), u = Math.min(w, h / 1.25) / 100
  const face: Pt[] = [[2, 3], [w - 2.5, 1.5], [w - 1.5, h - 3], [1.5, h - 1.5]]
  ctx.save()
  ctx.fillStyle = SCRAP
  trace(ctx, face, true)
  ctx.fill()
  wash(ctx, face, WASH.wood, { alpha: 0.2, seed, rim: 0.25 })
  wash(ctx, [[2, h * 0.76], [w - 2, h * 0.74], [w - 2, h * 0.9], [2, h * 0.91]], PACKET_BAND[id], { alpha: id === 'spots' ? 0.6 : 0.85, seed: seed + 1, loose: 1.4 })
  pen(ctx, [...face, face[0], face[1]], { w: 1.3, seed: seed + 2, taper: 0.02, wobble: 0.5 })
  pen(ctx, [[3, 4], [w * 0.5, h * 0.24], [w - 3.5, 2.5]], { w: 1, seed: seed + 3, taper: 0.1 })
  hatch(ctx, [[3, 4], [w * 0.5, h * 0.24], [w - 3.5, 2.5], [w - 3, h * 0.12], [w * 0.5, h * 0.32], [3, h * 0.13]], { seed: seed + 4, gap: 3, angle: 1.2, alpha: 0.45 })
  ctx.translate(w / 2, h * 0.56)
  ctx.scale(u, u)
  const mark = { pink: 'round', short: 'round', jagged: 'jagged', spots: 'round' } as const
  if (id === 'pink') { ctx.translate(0, 36); drawPlant(ctx, { colour: 'pink', joints: 1, leaf: 'round', petals: 'plain' }, 0.72, { show: { leaf: false, joints: false } }) }
  else if (id === 'short') {
    // A low sprig: a short stem from a stroke of soil, with its two round leaves raised from its top like a seedling's.
    // Leaves set level across a stem that goes on above them would be a cross.
    ctx.translate(0, 30)
    pencil(ctx, [[-13, 0.5], [-4, -0.4], [6, 0.6], [13, 0]], { seed: seed + 20, w: 1, alpha: 0.7 })
    wash(ctx, [[-1.6, 0], [-1.6, -24], [1.6, -24], [1.6, 0]], WASH.stem, { alpha: 0.95, seed: seed + 21, rim: 0 })
    for (const x of [-1.6, 1.6]) pen(ctx, [[x, 0], [x, -24]], { w: 0.9, seed: seed + 22 + x, taper: 0.1 })
    for (const side of [-1, 1]) {
      const leaf = oval(side * 10.5, -31, 10.5, 7.2, side * -0.6, 18)
      wash(ctx, leaf, WASH.leaf, { alpha: 0.85, seed: seed + 24 + side, loose: 0.5 })
      pen(ctx, leaf, { w: 1.1, seed: seed + 26 + side, taper: 0 })
      pen(ctx, [[side * 3, -25.5], [side * 13, -32.5]], { w: 0.7, seed: seed + 28 + side, taper: 0.3 })
    }
  }
  else {
    ctx.translate(-22, 12)
    ctx.rotate(-0.75)
    ctx.scale(1.5, 1.5)
    wash(ctx, LEAF[mark[id]], id === 'spots' ? WASH.red : WASH.leaf, { alpha: 0.8, seed: seed + 5 })
    pen(ctx, LEAF[mark[id]], { w: 1.1, seed: seed + 6, taper: 0 })
    if (id === 'jagged') pen(ctx, [[0, 0], [26, 0]], { w: 0.9, seed: seed + 7 })
    else for (const [x, y] of [[10, -3], [17, 3], [20, -4], [12, 4.5]]) dot(ctx, x, y, 1.8, WASH.spot)
  }
  ctx.restore()
}

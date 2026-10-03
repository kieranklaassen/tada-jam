// The specimens: one plant drawn from its look, its pot and soil, a pod, a
// seed, a runner and a seed packet. Each is drawn with the pen and the washes
// of ink.ts, at the origin, for the page to place.
//
// A plant is a working piece (ART.md, "The representation"): it shows its four
// traits and nothing else. Two plants of one look are the same drawing, down
// to the wobble of the pen, which is seeded by the look alone.

import { INK, SCRAP, WASH, curve, dot, hatch, oval, pen, pencil, seedOf, trace, wash, type Ctx, type Pt } from './ink'
import { PLANT } from './layout'
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
}

const PETAL: Pt[] = [[4, 0], [10, -7.5], [18, -10.5], [24.4, -6], [25.6, 0], [24.4, 6], [18, 10.5], [10, 7.5]]
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
const LEAF = { round: leafOutline('round'), jagged: leafOutline('jagged') }
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
  const fill = (pts: readonly Pt[], colour: string, alpha: number, s: number, rim = 0.3) => wash(ctx, pts, colour, { alpha, seed: seed + s, rim, loose: 1.25 })
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
    for (let i = 0; i < 4; i++) {
      const x = -w * 0.7 + i * w * 0.45
      pen(ctx, [[x, -2.6], [x + 2.6, -0.4], [x + 0.6, 1.4], [x + 3.4, 4.6]], { w: 0.85 * lw, seed: seed + 10 + i, taper: 0.3 })
      pen(ctx, [[x + 2.6, -0.4], [x + 6.5, 0.6]], { w: 0.7 * lw, seed: seed + 20 + i, taper: 0.4 })
    }
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

/** The runner bud: a stolon out of the soil, over the rim, ending in a fat bud that hangs beside the pot. */
function drawBud(ctx: Ctx, reach: number, lw: number, seed: number): void {
  const stolon = curve([[5, 0], [PLANT.potW / 2 - 6, -7], [reach - 4, -2], [reach, 11]])
  wash(ctx, [...stolon.map(([x, y]) => [x, y - 1.3] as const), ...stolon.slice().reverse().map(([x, y]) => [x + 0.6, y + 1.3] as const)], WASH.stem, { alpha: 0.9, seed, rim: 0 })
  pen(ctx, stolon, { w: 1.15 * lw, seed: seed + 30, taper: 0.1 })
  const bud = curve([[reach, 10], [reach - 5.5, 16], [reach - 3.5, 24], [reach + 0.5, 28], [reach + 4.5, 23], [reach + 5.5, 16]], true)
  wash(ctx, bud, WASH.leaf, { alpha: 0.9, seed: seed + 31 })
  pen(ctx, bud, { w: 1.2 * lw, seed: seed + 32, taper: 0 })
  pen(ctx, curve([[reach - 0.5, 12], [reach - 1.5, 19], [reach + 0.5, 27]]), { w: 0.75 * lw, seed: seed + 33 })
}

/** A seed pod, hanging from the origin: three seeds show as swellings. */
export function drawPod(ctx: Ctx, k: number, swell = 1): void {
  const lw = weight(k), seed = seedOf(88)
  ctx.save()
  ctx.scale(k * swell, k * swell)
  const pod = curve([[0, 0], [5.5, 5], [6.5, 13], [5, 21], [1, 30], [-3, 21], [-5.5, 13], [-4.5, 5]], true)
  wash(ctx, pod, WASH.gold, { alpha: 0.75, seed })
  wash(ctx, pod, WASH.stem, { alpha: 0.5, seed: seed + 1, rim: 0 })
  pen(ctx, curve([[0, 0], [-3, -6], [-9, -9]]), { w: 1.1 * lw, seed: seed + 9, taper: 0.1 })
  pen(ctx, pod, { w: 1.2 * lw, seed: seed + 2, taper: 0 })
  for (let i = 0; i < 3; i++) {
    const pea = oval(0.6 - i * 0.3, 8 + i * 7.2, 3.6 - i * 0.4, 3.2 - i * 0.3, 0, 10)
    wash(ctx, pea, WASH.stem, { alpha: 0.7, seed: seed + 3 + i, loose: 0.4 })
    pen(ctx, pea, { w: 0.8 * lw, seed: seed + 6 + i, taper: 0 })
  }
  ctx.restore()
}

/** One seed, lying on the origin. */
export function drawSeed(ctx: Ctx, k: number, turn = 0): void {
  ctx.save()
  ctx.scale(k, k)
  ctx.rotate(turn)
  const seed = curve([[-4.5, 0], [-1, -3.2], [4.5, -1.2], [5, 1], [0, 3.2]], true)
  wash(ctx, seed, WASH.wet, { alpha: 0.7, seed: 5, loose: 0.5 })
  pen(ctx, seed, { w: 1 * weight(k), seed: 6, taper: 0 })
  pen(ctx, [[-2, 0.3], [2.6, -0.4]], { w: 0.6 * weight(k), seed: 7 })
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
  else if (id === 'short') { ctx.translate(0, 30); drawPlant(ctx, { colour: 'white', joints: 1, leaf: 'round', petals: 'plain' }, 1.05, { growth: 0.62 }) }
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

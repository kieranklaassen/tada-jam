import { MUD, SAND, STONE } from './palette'
import { bow, line, oval, shape } from './parts'
import type { Ctx } from './parts'

// The small things on the back wall of a room, and a few effects. A thing is furniture: it is painted behind the
// creatures in muted earth colours a step or two lighter than the dark of a tunnel, so that it reads as a bed or a
// shelf and never competes with what can be touched. An effect is painted over the scene, in the plain colours of
// sand, mud and stone.

export type Thing = 'seeds' | 'bed' | 'cup' | 'shelf' | 'lamp' | 'washing'

/** How wide and high each thing is, in stage units. Each stands on y = 0 with its middle at x = 0. */
export const THING_SIZE: Record<Thing, { width: number; height: number }> = {
  seeds: { width: 42, height: 22 },
  bed: { width: 50, height: 22 },
  cup: { width: 34, height: 28 },
  shelf: { width: 46, height: 30 },
  lamp: { width: 30, height: 40 },
  washing: { width: 50, height: 28 },
}

// The colours of the back wall: three browns from shade to light, a pale one for seed, thread and rim, two tired
// greens for leaf and moss, and the glow of the worm with its halo.
const SHADE = '#402b1c'
const WALL = '#5a3f29'
const LIGHT = '#74553a'
const PALE = '#9b815c'
const PALER = '#b79c74'
const SEED = '#8a7050'
const LEAF = '#4f5c35'
const LEAF_LIGHT = '#66754a'
const MOSS = '#6f7d42'
const GLOW = '#e2f07a'
const GLOW_CORE = '#fbffd2'
const HALO = 'rgba(214,236,110,0.16)'
const WORM = '#6b5a3a'
const DUSTY = '#e9dcc0'

/** A seed: a pale drop, round at one end and pointed at the other, with a shaded underside and a lit streak. */
function seed(ctx: Ctx, x: number, y: number, turn: number, r = 5): void {
  const drop = (fill: string, k: number, dy: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(r * 1.25 * k, dy)
    ctx.bezierCurveTo(r * 0.5 * k, -r * 0.75 * k + dy, -r * k, -r * 0.7 * k + dy, -r * k, dy)
    ctx.bezierCurveTo(-r * k, r * 0.7 * k + dy, r * 0.5 * k, r * 0.75 * k + dy, r * 1.25 * k, dy)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  drop(WALL, 1, 0)
  drop(SEED, 0.82, -0.6)
  line(ctx, PALE, 1.2, [-r * 0.45, -r * 0.2, r * 0.15, -r * 0.3])
  ctx.restore()
}

/** A small leaf from its stalk at (x, y) to its tip, with a midrib. */
function leaf(ctx: Ctx, x: number, y: number, tx: number, ty: number, wide: number, fill: string, rib: string): void {
  const nx = -(ty - y)
  const ny = tx - x
  const len = Math.hypot(nx, ny) || 1
  const ox = (nx / len) * wide
  const oy = (ny / len) * wide
  const mx = (x + tx) / 2
  const my = (y + ty) / 2
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(mx + ox, my + oy, tx, ty)
  ctx.quadraticCurveTo(mx - ox, my - oy, x, y)
  ctx.fill()
  line(ctx, rib, 1.1, [x, y, tx, ty])
}

const THINGS: Record<Thing, (ctx: Ctx, lit: boolean) => void> = {
  // A pantry: a little heap of pale seeds, the ones at the back in shade.
  seeds: (ctx) => {
    for (const [x, y, turn] of [[-11, -4, 0.2], [0, -4.4, -0.1], [11, -4, 0.3], [-15, -3.4, -0.5]]) oval(ctx, x, y, 5.4, 3.6, turn, SHADE)
    seed(ctx, -12, -4.4, 0.25)
    seed(ctx, 11.5, -4.2, -0.3)
    seed(ctx, 0, -4.6, 0.05, 5.6)
    seed(ctx, -6, -10.4, -0.25)
    seed(ctx, 6, -10.6, 0.3)
    seed(ctx, 0.5, -16.4, -0.1, 4.8)
    seed(ctx, 17.5, -3, 0.9, 3.6)
  },
  // A bed: a long leaf curled up at the foot, on two twig stumps, with a round moss pillow at its head.
  bed: (ctx) => {
    for (const x of [-16, 15]) line(ctx, SHADE, 3.6, [x, -2, x, -6])
    ctx.fillStyle = LEAF
    ctx.beginPath()
    ctx.moveTo(-24, -9)
    ctx.quadraticCurveTo(-8, -3, 16, -5.5)
    ctx.quadraticCurveTo(22, -8, 24, -17)
    ctx.quadraticCurveTo(18, -11.5, 6, -11.5)
    ctx.quadraticCurveTo(-12, -10.5, -24, -9)
    ctx.fill()
    line(ctx, LEAF_LIGHT, 1.3, [-20, -8.8, -2, -7.6, 18, -9.4], true)
    // The pillow, with three tufts of moss.
    oval(ctx, -14, -13, 8.6, 5.2, -0.08, LEAF)
    oval(ctx, -14.2, -13.8, 7.6, 4.2, -0.08, MOSS)
    for (const [x, y] of [[-17.5, -15.2], [-13, -16], [-10.2, -13.4]]) oval(ctx, x, y, 1.5, 1.2, 0, LEAF_LIGHT)
  },
  // A table: a flat pebble on a round one, with an acorn-cup bowl on it.
  cup: (ctx) => {
    oval(ctx, 0, -5, 6.6, 5, 0, SHADE)
    oval(ctx, -0.4, -5.6, 5.4, 4, 0, WALL)
    oval(ctx, 0, -11.4, 16, 3.8, 0, SHADE)
    oval(ctx, -0.4, -12.2, 15.2, 3, 0, LIGHT)
    line(ctx, PALE, 1.3, [-10, -12.8, -3, -13.4])
    ctx.fillStyle = WALL
    ctx.beginPath()
    ctx.moveTo(-9.4, -22)
    ctx.bezierCurveTo(-9, -10.4, 9, -10.4, 9.4, -22)
    ctx.closePath()
    ctx.fill()
    for (const [x, y] of [[-4.6, -18.6], [0.6, -15.6], [4.8, -18.4], [-0.6, -19.4]]) oval(ctx, x, y, 1.2, 0.9, 0, SHADE)
    oval(ctx, 0, -22, 8.4, 1.9, 0, SHADE)
    line(ctx, PALE, 1.8, [-9.6, -22.4, 9.6, -22.4])
    // A wisp of steam would be a sign; a crumb on the table is plain.
    oval(ctx, 12, -15.6, 1.8, 1.4, 0.3, PALE)
  },
  // A shelf: a twig held off the wall by two pegs, each with a small bracket under it, and on it two crumbs and a
  // tiny pot. Nothing of it reaches the floor.
  shelf: (ctx) => {
    for (const x of [-14, 14]) shape(ctx, SHADE, [x - 4.6, -9, x + 4.6, -9, x, -2.4])
    line(ctx, SHADE, 5.4, [-20, -10.5, 20, -10.5])
    line(ctx, LIGHT, 2.6, [-20, -11.4, 20, -11.4])
    for (const x of [-14, 14]) oval(ctx, x, -10.6, 1.5, 1.5, 0, PALE)
    // The pot: a round belly, a neck and a pale rim.
    oval(ctx, -9, -19, 6.4, 6, 0, SHADE)
    oval(ctx, -9.4, -19.6, 5.4, 5, 0, WALL)
    shape(ctx, WALL, [-12.4, -24, -5.6, -24, -6.4, -27, -11.6, -27])
    line(ctx, PALE, 1.8, [-12.6, -27.4, -5.4, -27.4])
    bow(ctx, PALE, 1.3, -9.4, -19.4, 3.6, 3.4, 0, -2.7, -1.9)
    // Two crumbs.
    oval(ctx, 5, -15.8, 3.4, 2.8, 0.3, LIGHT)
    oval(ctx, 4.4, -16.6, 2.2, 1.4, 0.3, PALE)
    oval(ctx, 13, -15.2, 2.6, 2.2, -0.4, LIGHT)
    oval(ctx, 12.6, -15.8, 1.6, 1, -0.4, PALE)
  },
  // A lantern: a seed husk on a thread with a glow-worm curled up in it, dark and asleep, or awake and glowing.
  lamp: (ctx, lit) => {
    if (lit) {
      oval(ctx, 0, -14, 15, 14, 0, HALO)
      oval(ctx, 0, -14, 10.5, 10, 0, HALO)
    }
    line(ctx, PALE, 1.2, [0, -40, 0, -25])
    // The husk: a cap, two ribs and a floor, open in the middle.
    shape(ctx, LIGHT, [-5, -22.6, 5, -22.6, 2.6, -27, -2.6, -27])
    oval(ctx, 0, -14, 7.4, 9.4, 0, lit ? GLOW : SHADE)
    if (lit) oval(ctx, -0.6, -14.6, 3.6, 4.6, 0, GLOW_CORE)
    else {
      // Asleep: the worm is a dull curl at the bottom of the husk.
      bow(ctx, WORM, 2.6, 0, -11.4, 3.6, 2.8, 0, 0.2, Math.PI * 1.25)
      oval(ctx, 2.8, -12.6, 1.7, 1.7, 0, WORM)
    }
    bow(ctx, LIGHT, 2, 0, -14, 7.6, 9.6, 0, Math.PI * 0.62, Math.PI * 1.38)
    bow(ctx, LIGHT, 2, 0, -14, 7.6, 9.6, 0, -Math.PI * 0.38, Math.PI * 0.38)
    line(ctx, lit ? PALER : LIGHT, 1.5, [0, -23, 0, -5])
    oval(ctx, 0, -4.4, 4.6, 1.9, 0, LIGHT)
    oval(ctx, 0, -2.2, 1.4, 1.4, 0, LIGHT)
  },
  // A washing line: a thread between two pegs in the wall, with two tiny leaves pegged on it to dry.
  washing: (ctx) => {
    line(ctx, PALE, 1.3, [-23, -26, 0, -19, 23, -26], true)
    for (const x of [-23, 23]) oval(ctx, x, -26, 2.2, 2.2, 0, LIGHT)
    leaf(ctx, -9, -23, -11.5, -8, 5.4, LEAF, LEAF_LIGHT)
    leaf(ctx, 8, -22.8, 11, -10.5, 4.6, LEAF_LIGHT, LEAF)
    for (const [x, y] of [[-9, -23.4], [8, -23.2]]) line(ctx, PALER, 2, [x, y - 2.2, x, y + 1.8])
  },
}

/** Paints one thing of the back wall, standing on y = 0 with its middle at x = 0. Only the lamp is ever `lit`. */
export function paintThing(ctx: CanvasRenderingContext2D, thing: Thing, lit = false): void {
  ctx.save()
  THINGS[thing](ctx, lit)
  ctx.restore()
}

// ---- The effects. ----

export type Effect = 'scuff' | 'prints' | 'sandBlast' | 'mudBall' | 'stoneShot' | 'puff' | 'splat'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** A fixed scatter: the same number between 0 and 1 for the same grain every time. */
const scatter = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return v - Math.floor(v)
}
const WISP = 'rgba(255,255,255,0.55)'

const EFFECTS: Record<Effect, (ctx: Ctx, p: number) => void> = {
  // Where a wall gave way: a low patch of pale dust on the floor, 28 wide, with a few crumbs in it.
  scuff: (ctx) => {
    ctx.globalAlpha *= 0.55
    oval(ctx, 0, -2.2, 14, 2.6, 0, DUSTY)
    oval(ctx, -5, -4, 6, 2.6, 0, DUSTY)
    oval(ctx, 5.5, -3.6, 5, 2.2, 0, DUSTY)
    ctx.globalAlpha /= 0.55
    for (const [x, y, r] of [[-9, -1.6, 1.5], [-1, -5.6, 1.3], [8, -1.8, 1.7], [3, -1.2, 1.1], [11.5, -4.6, 1]]) oval(ctx, x, y, r, r * 0.8, 0, DUSTY)
  },
  // Somebody went round and round here: a ring of six little footprints, each a pad and two toes that point the
  // way it walked.
  prints: (ctx) => {
    ctx.globalAlpha *= 0.7
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.2
      const r = i % 2 ? 10.4 : 8.8
      ctx.save()
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r)
      ctx.rotate(a + Math.PI / 2)
      oval(ctx, 0, 0, 2.3, 1.5, 0, DUSTY)
      oval(ctx, 2.6, -1, 0.8, 0.8, 0, DUSTY)
      oval(ctx, 2.6, 1, 0.8, 0.8, 0, DUSTY)
      ctx.restore()
    }
    ctx.globalAlpha /= 0.7
  },
  // A blast of sand: a fan of pale grains from the origin that opens to the right, about 40 long. As it goes on
  // the grains fly further apart and get smaller and fainter. Their places follow a fixed rule and never jump.
  sandBlast: (ctx, p) => {
    const fade = 1 - p * 0.5
    ctx.globalAlpha *= fade
    for (let i = 0; i < 30; i++) {
      const u = scatter(i, 1)
      const v = scatter(i, 2) - 0.5
      const d = (3 + u * 37) * (0.4 + p * 0.6)
      const a = v * (0.6 + p * 0.4) * 0.9
      const r = (2.7 - u * 1.2) * (1 - p * 0.4)
      oval(ctx, Math.cos(a) * d, Math.sin(a) * d, r * 1.25, r, a, i % 5 === 0 ? SAND.edge : SAND.fill)
    }
    ctx.globalAlpha /= fade
  },
  // A ball of wet mud in flight to the right, 18 across: a pale lip on top, a glint, and a short trail of drops.
  mudBall: (ctx, p) => {
    const wob = Math.sin(p * Math.PI * 2) * 0.6
    oval(ctx, -13.5, 1 + wob, 3.2, 2.4, 0, MUD.lip)
    oval(ctx, -13.5, 1.5 + wob, 2.6, 1.9, 0, MUD.fill)
    oval(ctx, -19, -1.5 - wob, 1.9, 1.5, 0, MUD.lip)
    oval(ctx, 0, 0, 9, 9, 0, MUD.lip)
    oval(ctx, 0.5, 1, 8, 7.6, 0, MUD.fill)
    oval(ctx, 1.5, 3, 5.6, 4.4, 0, MUD.edge)
    oval(ctx, 0.6, 1.2, 6.4, 5.4, 0, MUD.fill)
    line(ctx, MUD.shine, 2, [-4.4, -2.6, -1.6, -5])
    oval(ctx, 1.4, -5.4, 0.9, 0.9, 0, MUD.shine)
  },
  // A stone in flight to the right, 18 across, with one wisp of speed behind it: two short round bars.
  stoneShot: (ctx, p) => {
    const slip = Math.sin(p * Math.PI * 2) * 1.2
    line(ctx, WISP, 3, [-24 - slip, -2.6, -13.5 - slip, -2.6])
    line(ctx, WISP, 2.2, [-17 + slip, 3.4, -13 + slip, 3.4])
    oval(ctx, 0, 0, 9, 8.6, 0.3, STONE.edge)
    oval(ctx, -0.6, -1, 7.8, 7, 0.3, STONE.fill)
    bow(ctx, STONE.shine, 2.2, -0.4, -0.6, 5.2, 4.6, 0.3, -2.7, -1.5)
    oval(ctx, 3.4, 2.8, 1.5, 1.1, 0.3, STONE.edge)
  },
  // A puff of dust: three round blobs that swell, drift apart and fade.
  puff: (ctx, p) => {
    const fade = 1 - p * p
    const grow = 0.55 + p * 0.75
    ctx.globalAlpha *= fade
    for (const [x, y, r] of [[-5, 1.5, 6], [4.5, 2.5, 5], [0.5, -4.5, 4.4]]) oval(ctx, x * (0.7 + p * 0.9), y * (0.7 + p * 0.9) - p * 2, r * grow, r * grow, 0, DUSTY)
    ctx.globalAlpha /= Math.max(fade, 1e-6)
  },
  // Where mud hit: a splat 30 across, with three fingers and a few flying drops.
  splat: (ctx) => {
    const body = (fill: string, k: number) => {
      oval(ctx, 0, 0, 9.4 * k, 8.4 * k, 0, fill)
      for (const a of [-2.5, -0.5, 1.45]) {
        const c = Math.cos(a)
        const s = Math.sin(a)
        ctx.strokeStyle = fill
        ctx.lineWidth = 5.6 * k
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(c * 5, s * 5)
        ctx.lineTo(c * 11.6, s * 11.6)
        ctx.stroke()
        oval(ctx, c * 12, s * 12, 3.3 * k, 3.3 * k, 0, fill)
      }
    }
    body(MUD.lip, 1)
    body(MUD.fill, 0.8)
    for (const [x, y, r] of [[12.4, 7.2, 1.7], [-12.6, 3.4, 1.4], [3.4, -13.2, 1.5]]) {
      oval(ctx, x, y, r + 0.7, r + 0.7, 0, MUD.lip)
      oval(ctx, x, y, r, r, 0, MUD.fill)
    }
    line(ctx, MUD.shine, 2, [-4.6, -2.4, -1.4, -4.6])
    oval(ctx, 1.6, -4.8, 0.9, 0.9, 0, MUD.shine)
  },
}

/** Paints one effect about the origin. `scuff` lies on y = 0; `prints`, `puff` and `splat` have their middle at
 *  the origin; `mudBall` and `stoneShot` fly to the right with their middle at the origin and their trail behind;
 *  `sandBlast` starts at the origin and opens to the right. `progress` runs from 0 to 1 through an effect that
 *  changes (the blast, the puff; the trail of a ball), and is ignored by the others. */
export function paintEffect(ctx: CanvasRenderingContext2D, effect: Effect, progress = 0.5): void {
  ctx.save()
  EFFECTS[effect](ctx, clamp01(progress))
  ctx.restore()
}

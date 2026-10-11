import { GRASS, HIGHLIGHT, MUD, SAND, STONE } from './palette'
import { bow, line, oval, shape } from './parts'
import type { Ctx } from './parts'

// The small things on the back wall of a room, one keepsake of the camp on the grass, and the effects. A thing of
// a room is furniture: it is painted behind the creatures in muted earth colours a step or two lighter than the
// dark of a tunnel, so that it reads as a bed or a shelf and never competes with what can be touched. An effect is
// painted over the scene, in the plain colours of sand, mud, stone and smoke.

export type Thing = 'seeds' | 'bed' | 'cup' | 'shelf' | 'lamp' | 'washing' | 'leaf'

/** How wide and high each thing is, in stage units. Each stands on y = 0 with its middle at x = 0. */
export const THING_SIZE: Record<Thing, { width: number; height: number }> = {
  seeds: { width: 42, height: 22 },
  bed: { width: 50, height: 22 },
  cup: { width: 34, height: 28 },
  shelf: { width: 46, height: 30 },
  lamp: { width: 30, height: 40 },
  washing: { width: 50, height: 28 },
  leaf: { width: 30, height: 44 },
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
// The keepsake leaf hangs in daylight over grass and sky: a pale leaf with a darker edge, and its damp spot.
const KEPT = '#eef0b6'
const KEPT_EDGE = '#93a653'
const KEPT_FOLD = '#cfd88c'
const DAMP = '#a9c9a4'

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
  // The husk is one filled pale pod, and the worm lies in a small window cut low in one side of it, which it all
  // but fills: a husk drawn as a rim round a dark middle read as a sign.
  lamp: (ctx, lit) => {
    if (lit) {
      oval(ctx, 1, -12.6, 14, 12.4, 0, HALO)
      oval(ctx, 1.4, -12, 9.6, 8.6, 0, HALO)
    }
    line(ctx, PALE, 1.2, [0, -40, 0, -27])
    // The pod: a drop that hangs by its cap and ends in a point, in shade at its edge and underneath.
    const pod = (fill: string, k: number, dx: number, dy: number) => {
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.moveTo(dx, -25 * k + dy)
      ctx.bezierCurveTo(5.2 * k + dx, -25 * k + dy, 8.4 * k + dx, -20.4 * k + dy, 8.4 * k + dx, -15.4 * k + dy)
      ctx.bezierCurveTo(8.4 * k + dx, -9 * k + dy, 3.6 * k + dx, -5.4 * k + dy, 0.8 * k + dx, -1.4 * k + dy)
      ctx.bezierCurveTo(-3.2 * k + dx, -5.4 * k + dy, -8 * k + dx, -9 * k + dy, -8 * k + dx, -15.4 * k + dy)
      ctx.bezierCurveTo(-8 * k + dx, -20.4 * k + dy, -5 * k + dx, -25 * k + dy, dx, -25 * k + dy)
      ctx.fill()
    }
    pod(WALL, 1, 0, 0)
    pod(lit ? PALE : LIGHT, 0.86, -0.5, -2.6)
    shape(ctx, lit ? PALE : LIGHT, [-5, -22.8, 5, -22.8, 2.6, -27.4, -2.6, -27.4])
    line(ctx, lit ? PALER : PALE, 1.4, [-4.6, -18.6, -5, -15.6, -4.2, -12.6], true)
    // The window, low on the side that faces the room.
    ctx.fillStyle = lit ? GLOW : SHADE
    ctx.beginPath()
    ctx.moveTo(-3, -11)
    ctx.bezierCurveTo(-3, -16.4, 6.6, -17, 6.8, -11.6)
    ctx.bezierCurveTo(6.9, -7.6, 3.6, -5.2, 1.6, -5.4)
    ctx.bezierCurveTo(-1.4, -5.6, -3, -8.2, -3, -11)
    ctx.fill()
    // The worm: a fat curl with its head tucked in, dull when it sleeps and the brightest thing when it wakes.
    oval(ctx, 2.7, -9.4, 3.9, 2.9, -0.25, lit ? GLOW_CORE : WORM)
    oval(ctx, 0, -12.2, 2.3, 2, 0, lit ? GLOW_CORE : WORM)
  },
  // A washing line: a thread between two pegs in the wall, with two tiny leaves pegged on it to dry.
  washing: (ctx) => {
    line(ctx, PALE, 1.3, [-23, -26, 0, -19, 23, -26], true)
    for (const x of [-23, 23]) oval(ctx, x, -26, 2.2, 2.2, 0, LIGHT)
    leaf(ctx, -9, -23, -11.5, -8, 5.4, LEAF, LEAF_LIGHT)
    leaf(ctx, 8, -22.8, 11, -10.5, 4.6, LEAF_LIGHT, LEAF)
    for (const [x, y] of [[-9, -23.4], [8, -23.2]]) line(ctx, PALER, 2, [x, y - 2.2, x, y + 1.8])
  },
  // A keepsake of the camp: one small leaf pegged on a bent grass stalk, a little crumpled, with a damp spot.
  leaf: (ctx) => {
    // The stalk: up from the foot and bent over at the top, with a short blade at its root.
    line(ctx, GRASS.dark, 3.4, [-3, -1, -10, -9, -13, -17], true)
    line(ctx, GRASS.dark, 4.6, [-7, -1, -13, -30, -4, -42, 5, -37], true)
    line(ctx, GRASS.light, 2, [-7, -1, -13, -30, -4, -42, 5, -37], true)
    // The leaf hangs from the tip: an edge, a pale face, one crumpled corner folded over, a rib.
    const face = (fill: string, k: number) => {
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.moveTo(5, -36 + (1 - k) * 4)
      ctx.bezierCurveTo(5 + 12 * k, -33, 5 + 11 * k, -17, 5.6 + 3 * k, -9 - (1 - k) * 3)
      ctx.lineTo(5.6 + 1.6 * k, -13)
      ctx.lineTo(5.6 - 2.4 * k, -8.4 - (1 - k) * 4)
      ctx.bezierCurveTo(5 - 10 * k, -16, 5 - 11 * k, -30, 5, -36 + (1 - k) * 4)
      ctx.fill()
    }
    face(KEPT_EDGE, 1)
    face(KEPT, 0.8)
    shape(ctx, KEPT_FOLD, [10.4, -31.4, 13.2, -24.6, 8.6, -27])
    line(ctx, KEPT_EDGE, 1.2, [5.2, -33, 6, -22, 5.2, -14], true)
    line(ctx, KEPT_EDGE, 1, [5.6, -24, 9.6, -21])
    // The damp spot, with its glint.
    oval(ctx, 1.6, -21.6, 2.9, 3.6, 0.2, DAMP)
    oval(ctx, 0.9, -23, 0.8, 0.8, 0, HIGHLIGHT)
    // The peg: a split bit of straw clipped over the tip.
    line(ctx, LIGHT, 4, [5, -39.6, 5, -34.4])
    line(ctx, PALER, 2.2, [5, -39.6, 5, -34.6])
  },
}

/** Paints one thing, standing on y = 0 with its middle at x = 0. Only the lamp is ever `lit`. */
export function paintThing(ctx: CanvasRenderingContext2D, thing: Thing, lit = false): void {
  ctx.save()
  THINGS[thing](ctx, lit)
  ctx.restore()
}

// ---- The effects. ----

export type Effect = 'scuff' | 'prints' | 'sandBlast' | 'mudBall' | 'stoneShot' | 'puff' | 'splat' | 'smoke' | 'twang'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** A fixed scatter: the same number between 0 and 1 for the same grain every time. */
const scatter = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return v - Math.floor(v)
}
const WISP = 'rgba(255,255,255,0.6)'
/** Many ovals [x, y, rx, ry, turn] filled as one shape, so that where they overlap a faded cloud stays even. */
function blobs(ctx: Ctx, fill: string, list: readonly number[][]): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  for (const [x, y, rx, ry, turn] of list) {
    ctx.moveTo(x + Math.cos(turn) * rx, y + Math.sin(turn) * rx)
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
  }
  ctx.fill()
}
// Smoke and the lines of a shake: a cream white, with a shade for the underside of a cloud.
const CLOUD = '#f8f3e2'
const CLOUD_SHADE = '#cfc6ab'

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
  // Somebody trod back and forth here: a short track of six little footprints along the floor, left foot and right
  // in turn, each a pad and two toes that point the way it walked. A track, not a ring: nothing stands empty in it.
  prints: (ctx) => {
    ctx.globalAlpha *= 0.7
    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.translate(-12 + i * 4.8, i % 2 ? -1.8 : -5.2)
      ctx.rotate(i % 2 ? 0.25 : -0.25)
      oval(ctx, 0, 0, 2.3, 1.5, 0, DUSTY)
      oval(ctx, 2.6, -1, 0.8, 0.8, 0, DUSTY)
      oval(ctx, 2.6, 1, 0.8, 0.8, 0, DUSTY)
      ctx.restore()
    }
    ctx.globalAlpha /= 0.7
  },
  // A blast of sand from the origin that opens to the right, 46 long and 40 wide at its end: a solid pale fan at
  // its root that breaks into grains. As it goes on the fan reaches further, and the grains fly on and get
  // smaller. Their places follow a fixed rule and never jump.
  sandBlast: (ctx, p) => {
    const fade = 1 - p * 0.2
    ctx.globalAlpha *= fade
    const reach = 15 + p * 9
    const fan = (fill: string, dy: number) => {
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.moveTo(0, -2.6 + dy)
      ctx.arc(0, dy, reach, -0.4, 0.4)
      ctx.lineTo(0, 2.6 + dy)
      ctx.closePath()
      ctx.fill()
    }
    fan(SAND.edge, 0.9)
    fan(SAND.fill, -0.5)
    const grains: number[][][] = [[], []]
    for (let i = 0; i < 56; i++) {
      const u = scatter(i, 1)
      const v = scatter(i, 2) * 2 - 1
      const d = reach * 0.86 + u * (43 - reach * 0.86) * (0.6 + p * 0.4)
      const a = v * 0.43
      const r = (4.2 - u * 2.4) * (1 - p * 0.2)
      grains[i % 5 === 0 ? 0 : 1].push([Math.cos(a) * d, Math.sin(a) * d, r * 1.15, r, a])
    }
    blobs(ctx, SAND.edge, grains[0])
    blobs(ctx, SAND.fill, grains[1])
    ctx.globalAlpha /= fade
  },
  // A ball of wet mud in flight to the right, 26 across: a pale lip on top, a glint, and behind it a trail of
  // four drops that get smaller, out to 44.
  mudBall: (ctx, p) => {
    const wob = Math.sin(p * Math.PI * 2) * 0.9
    for (const [x, y, r] of [[-18.5, 2.4, 4.6], [-27, -2.6, 3.6], [-34.4, 2, 2.8], [-41, -1, 2]]) {
      const dy = y + (y > 0 ? wob : -wob)
      oval(ctx, x, dy, r * 1.25, r, 0, MUD.lip)
      oval(ctx, x + 0.3, dy + 0.5, r * 1.25 - 1.1, r - 1, 0, MUD.fill)
    }
    oval(ctx, 0, 0, 13, 13, 0, MUD.lip)
    oval(ctx, 0.6, 1.3, 11.6, 11.2, 0, MUD.fill)
    oval(ctx, 2.2, 4.4, 8, 6.2, 0, MUD.edge)
    oval(ctx, 0.9, 1.8, 9.2, 7.8, 0, MUD.fill)
    line(ctx, MUD.shine, 2.8, [-6.4, -3.6, -2.4, -7.2])
    oval(ctx, 2, -7.8, 1.3, 1.3, 0, MUD.shine)
  },
  // A boulder in flight to the right, 26 across, with a wisp of speed behind it: three streaks of three lengths,
  // each fat at the stone and pointed at its tail, out to 44.
  stoneShot: (ctx, p) => {
    const slip = Math.sin(p * Math.PI * 2) * 1.6
    // Three streaks of three lengths, so that no two of them read as a sign.
    const streak = (tail: number, head: number, y: number, w: number) => {
      shape(ctx, WISP, [tail, y, head, y - w / 2, head, y + w / 2])
      oval(ctx, head, y, w / 2, w / 2, 0, WISP)
    }
    streak(-42 - slip, -13, -7.4, 5)
    streak(-23 + slip, -15, 0.8, 3.2)
    streak(-33 - slip * 0.5, -12, 8, 4.2)
    oval(ctx, 0, 0, 13, 12.4, 0.3, STONE.edge)
    oval(ctx, -0.9, -1.4, 11.3, 10.2, 0.3, STONE.fill)
    bow(ctx, STONE.shine, 3, -0.6, -0.9, 7.6, 6.7, 0.3, -2.7, -1.5)
    line(ctx, HIGHLIGHT, 2, [-5.6, -7.6, -2.8, -9.4])
    oval(ctx, 5, 4, 2.2, 1.6, 0.3, STONE.edge)
    oval(ctx, -3.6, 5.6, 1.4, 1, 0.3, STONE.edge)
  },
  // A puff of dust where a shot lands: four round blobs that swell to 40 across, drift apart and fade.
  puff: (ctx, p) => {
    const fade = 1 - p * p * p
    const grow = 0.66 + p * 0.5
    const apart = 0.66 + p * 0.62
    ctx.globalAlpha *= fade
    blobs(ctx, DUSTY, [[-8.6, 2, 9.6], [7.6, 3.6, 8.4], [1, -7, 7.6], [-1.4, 6, 6.4]].map(([x, y, r]) => [x * apart, y * apart - p * 3, r * grow, r * grow, 0]))
    ctx.globalAlpha /= Math.max(fade, 1e-6)
  },
  // Where mud hit: a splat 40 across, with three fingers and a few flying drops.
  splat: (ctx) => {
    const body = (fill: string, k: number) => {
      oval(ctx, 0, 0, 12.6 * k, 11.2 * k, 0, fill)
      for (const a of [-2.5, -0.5, 1.45]) {
        const c = Math.cos(a)
        const s = Math.sin(a)
        ctx.strokeStyle = fill
        ctx.lineWidth = 7.4 * k
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(c * 6.6, s * 6.6)
        ctx.lineTo(c * 15.4, s * 15.4)
        ctx.stroke()
        oval(ctx, c * 16, s * 16, 4.4 * k, 4.4 * k, 0, fill)
      }
    }
    body(MUD.lip, 1)
    body(MUD.fill, 0.8)
    for (const [x, y, r] of [[16.4, 9.6, 2.3], [-16.8, 4.6, 1.9], [4.6, -17.4, 2]]) {
      oval(ctx, x, y, r + 0.9, r + 0.9, 0, MUD.lip)
      oval(ctx, x, y, r, r, 0, MUD.fill)
    }
    oval(ctx, 2, 3.6, 6.4, 4.6, 0, MUD.edge)
    oval(ctx, 1, 1.6, 7.2, 5.4, 0, MUD.fill)
    line(ctx, MUD.shine, 2.6, [-6.2, -3.2, -2, -6.2])
    oval(ctx, 2.2, -6.4, 1.2, 1.2, 0, MUD.shine)
  },
  // The smoke at a cannon's mouth, or the dust off a catapult's bowl, the moment it fires. It starts at the origin
  // and opens to the right: a round cream cloud of five blobs, 30 across, that swells to 44, drifts up and to the
  // right, and fades. Round blobs only.
  smoke: (ctx, p) => {
    const fade = 1 - p * p * p * 0.85
    const grow = 1 + p * 0.47
    const cx = 15 + p * 7.5
    const cy = -p * 8.5
    ctx.globalAlpha *= fade
    const cloud = (fill: string, k: number, dy: number) =>
      blobs(ctx, fill, [[-7, 2.4, 8], [4.6, 4.2, 9], [8.4, -4.4, 6.4], [-2.4, -6, 8.4], [1.4, 0.6, 9.6]].map(([x, y, r]) => [cx + x * grow, cy + y * grow + dy, r * grow * k, r * grow * k, 0]))
    cloud(CLOUD_SHADE, 1, 0)
    cloud(CLOUD, 0.86, -1.4 * grow)
    ctx.globalAlpha /= fade
  },
  // The shake of a catapult after it lets go, about the middle of the machine's place.
  twang: (ctx, p) => {
    // Pale puffs flung off the arm as it lets go, three behind it and two before: each a filled patch that drifts
    // out and thins. Nothing here is a line, so nothing here can be read as a mark.
    const fade = 1 - p * 0.9
    ctx.globalAlpha *= fade
    ctx.translate(7, -8)
    ctx.rotate(0.26)
    const spread = p * 9
    for (const [side, far, up, size] of [[-1, 13, -7, 4.6], [-1, 20, 3, 3.6], [-1, 27, -3, 2.6], [1, 12, -9, 4], [1, 19, 0, 3]]) {
      const r = far + spread
      oval(ctx, side * r, up - spread * 0.4, size * (1 + p * 0.5), size * (0.8 + p * 0.4), side * 0.4, CLOUD)
    }
    ctx.globalAlpha /= fade
  },
}

/** Paints one effect about the origin, within 46 of it each way. `scuff` lies on y = 0; `prints`, `puff` and
 *  `splat` have their middle at the origin; `mudBall` and `stoneShot` fly to the right with their middle at the
 *  origin and their trail behind; `sandBlast` and `smoke` start at the origin (the mouth of a cannon, the bowl of
 *  a catapult) and open to the right; `twang` has the middle of the machine's place at the origin, 28 above its
 *  base. `progress` runs from 0 to 1 through an effect that changes (the blast, the puff, the smoke, the shake;
 *  the trail of a ball), and is ignored by the others. */
export function paintEffect(ctx: CanvasRenderingContext2D, effect: Effect, progress = 0.5): void {
  ctx.save()
  EFFECTS[effect](ctx, clamp01(progress))
  ctx.restore()
}

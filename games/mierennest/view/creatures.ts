import { invaderPainters, INVADER_POSES, INVADER_SIZE } from './invaders'
import { ANT, EARTH, QUEEN, WORKER } from './palette'
import { antFigure, blob, eyes, feeler, limb, mouth, oval, shine } from './parts'
import type { AntBuild, AntPose, CreatureKind, Ctx, Face, Look, Painter } from './parts'

// The kingdom: the child's own ant, the queen and a worker. Each is painted with the middle of its feet at the
// origin, facing right, in flat colour with one hard highlight on each glossy part and large eyes. This file is
// also the one door to every creature: `paintCreature` hands the invaders on to their own file.

export type { CreatureKind, Look } from './parts'

// Four colours the palette has not got: the lit top of a crumb of earth, the shaded side of the queen's egg, her
// far arms and legs (darker than the near ones, as on the ants), and the blush of a cheek.
const CRUMB_LIGHT = '#d29a5c'
const EGG_SHADE = '#e6cfa0'
const QUEEN_ARM = '#6e2c14'
const CHEEK = '#e2764a'

/** A crumb of dug earth: a small lump with a lit top. */
function crumb(ctx: Ctx, x: number, y: number, r: number): void {
  oval(ctx, x, y, r, r * 0.82, 0.4, EARTH.speck)
  oval(ctx, x + r * 0.5, y + r * 0.3, r * 0.6, r * 0.5, 0, EARTH.speck)
  oval(ctx, x - r * 0.1, y - r * 0.22, r * 0.78, r * 0.56, 0.4, EARTH.top)
  oval(ctx, x - r * 0.3, y - r * 0.4, r * 0.3, r * 0.16, -0.5, CRUMB_LIGHT)
}

// ---- The child's ant: warm orange-brown, eager and bright. ----

const ANT_BUILD: AntBuild = { ...ANT, ab: [24, 10.5], th: [14, 8.5], hd: [15, 12.5], eye: 7, limb: 4.4, cheek: CHEEK }

const ANT_POSES: Record<string, AntPose> = {
  // Alert: head up, feelers straight up, a wide grin.
  stand: {
    ab: [-31, -14, -0.1], th: [2, -12.5, -0.05], hd: [33, -15.5, -0.1],
    legs: [[-23, 0, -4, -8], [0, 0, -4, 0], [21, 0, 3, -6]],
    feel: [5, -17, 0.25], face: { brows: [-0.25, -0.1], mouth: 'grin' },
  },
  // Digging: head down with the jaws in the earth, rump in the air, tongue out with the effort.
  dig: {
    ab: [-27, -19, -0.42], th: [5, -12.5, 0.28], hd: [34, -15, 0.42],
    legs: [[-22, 0, -5, -7], [0, 0, -5, 0], [17, 0, 5, -2]],
    feel: [14, -6, -0.3], face: { brows: [0.35, 0.3], mouth: 'tongue', jaws: 0.9, bias: [0.3, 0.6] },
  },
  // Sitting back on its rump and wiping its jaws with a foreleg, eyes shut with pleasure.
  look: {
    ab: [-30, -11, 0.12], th: [0, -14, -0.5], hd: [24, -18.5, -0.2],
    legs: [[-20, 0, -4, -7], [-3, 0, -5, 0], [39, -12, 1, 8]],
    far: [[-13, 0, -4, -7], [5, 0, -5, 0], [20, 0, 5, -3]],
    feel: [-9, -12, -0.4], face: { shut: 'joy', brows: [-0.3, -0.2], mouth: 'smile', jaws: 0.1 },
  },
}

const paintAnt: Painter = (ctx, pose, look, t) => {
  antFigure(ctx, ANT_BUILD, ANT_POSES[pose] ?? ANT_POSES.stand, look, t)
  if (pose !== 'dig') return
  // The crumbs it throws up, on their way over its shoulder.
  crumb(ctx, 57, -13, 4)
  crumb(ctx, 47, -28, 3.2)
  crumb(ctx, 63, -27, 2.4)
  crumb(ctx, 29, -34, 2.8)
}

// ---- A worker: smaller, lighter, and tidy to a fault. ----

const WORKER_BUILD: AntBuild = { ...WORKER, ab: [17, 8.5], th: [10.5, 7], hd: [12.5, 10.5], eye: 5.8, limb: 3.6 }

const WORKER_POSES: Record<string, AntPose> = {
  walk: {
    ab: [-23, -11.5, -0.06], th: [1, -10.5, 0], hd: [25, -12.5, 0],
    legs: [[-20, 0, -2, -7], [3, 0, -4, 0], [13, 0, 3, -4]],
    far: [[-10, 0, -4, -6], [-4, 0, -3, 0], [22, 0, 3, -5]],
    feel: [8, -12, 0.3], face: { brows: [0.1, 0.1], mouth: 'flat' },
  },
  // A crumb of earth balanced on its head: it walks carefully and watches the crumb.
  carry: {
    ab: [-23, -11, 0], th: [1, -10.5, 0], hd: [25, -12, 0.05],
    legs: [[-17, 0, -3, -7], [0, 0, -4, 0], [16, 0, 3, -5]],
    feel: [-13, -3, 0.5], face: { brows: [-0.35, -0.2], mouth: 'o', bias: [-0.2, -0.9] },
  },
  // Upright on its back legs with its hands on its hips, looking down at the damage and muttering.
  hips: {
    ab: [-9, -15, 1.15], th: [1, -28, -1.35], hd: [5, -43.5, 0.15],
    legs: [[-1, 0, -2, 0], [4, 0, 3, 0], [-1, -24, -11, -2]],
    far: [[6, 0, 2, 0], [10, 0, 3, 0], [5, -24, 10, -2]],
    feel: [-11, -6, 0.5], face: { brows: [0.45, 0.4], lid: 0.3, mouth: 'wavy', bias: [0.2, 0.9] },
  },
}

const paintWorker: Painter = (ctx, pose, look, t) => {
  antFigure(ctx, WORKER_BUILD, WORKER_POSES[pose] ?? WORKER_POSES.walk, look, t)
  if (pose === 'carry') crumb(ctx, 23, -25.5, 6.5)
}

// ---- The queen: very large, with an egg she will not put down. ----

/** A box with round corners: a roll of her rump, squeezed flat against the walls of the shaft. */
function pill(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}

/** Her head, the same in both poses: wide, with heavy lids, cheeks, and a tuft of three feelers that stand like
 *  the points of a crown. `squash` is how hard the shaft presses her cheeks. */
function queenHead(ctx: Ctx, x: number, y: number, rx: number, ry: number, squash: number, f: Face, look: Look, t: number): void {
  const sway = Math.sin(t * 2.2) * 1.5
  for (const k of [-1, 1, 0]) feeler(ctx, QUEEN.dark, 2.8, x + k * rx * 0.2, y - ry * 0.8, x + k * rx * 0.42 + sway, y - ry - (k === 0 ? 12 : 8), k * 0.3)
  if (squash > 0) {
    pill(ctx, x - rx, y - ry, rx * 2, ry * 2, ry * 0.86, QUEEN.dark)
    pill(ctx, x - rx + 1, y - ry, rx * 2 - 2, ry * 2 - 3, ry * 0.84, QUEEN.body)
  } else blob(ctx, x, y, rx, ry, 0, QUEEN.body, QUEEN.dark, false)
  shine(ctx, x - rx * 0.42, y, rx * 0.56, ry)
  const r = ry * 0.52
  oval(ctx, x - rx * 0.66, y + ry * 0.42, rx * 0.24 + squash, ry * 0.3, 0, CHEEK)
  oval(ctx, x + rx * 0.8, y + ry * 0.42, rx * 0.14 + squash * 0.6, ry * 0.28, 0, CHEEK)
  mouth(ctx, x + rx * 0.3, y + ry * 0.66, rx * 0.34, f.mouth ?? 'flat')
  eyes(ctx, x - rx * 0.12, y - ry * 0.2, r, r * 1.75, look, f, QUEEN.body, QUEEN.dark)
}

/** Her egg, held against her chest by two arms. */
function egg(ctx: Ctx, x: number, y: number, far: readonly number[], near: readonly number[], t: number): void {
  const hug = Math.sin(t * 1.6) * 0.6
  limb(ctx, QUEEN_ARM, 7, far[0], far[1], x + 8, y + 5 - hug, far[2], far[3])
  blob(ctx, x, y, 10.5, 13.5, 0.3, QUEEN.egg, EGG_SHADE, false)
  limb(ctx, QUEEN.dark, 7, near[0], near[1], x - 1, y + 9 + hug, near[2], near[3])
}

const paintQueen: Painter = (ctx, pose, look, t) => {
  const breath = Math.sin(t * 1.6)
  if (pose === 'wedged') {
    // Stuck upright in a shaft two cells wide like a cork: two small feet that find no floor, then three rolls of
    // her, each squeezed as wide as the shaft. The pale belly bulges on the lower two; the egg lies on the third.
    limb(ctx, QUEEN_ARM, 5, -12, -9, -15, -2.6, -3, 0)
    limb(ctx, QUEEN_ARM, 5, 10, -9, 14, -2.6, 3, 0)
    for (const [y, h, belly] of [[-3, 22, 1], [-23, 21, 1], [-42, 24, 0]]) {
      pill(ctx, -28, y - h, 56, h, 10.5, QUEEN.dark)
      pill(ctx, -27.5, y - h, 55, h - 3, 10, QUEEN.body)
      if (belly) pill(ctx, -11, y - h + 2.5, 31, h - 8, 7.5, QUEEN.belly)
      shine(ctx, -3, y - h / 2 - 1, 26, h / 2)
    }
    egg(ctx, 5, -53 - breath * 0.5, [23, -62, 6, 5], [-23, -62, -7, 7], t)
    queenHead(ctx, 0, -82, 27, 14.5, 2.5, { brows: [-0.5, 0.5], lid: 0.42, tilt: -0.25, mouth: 'wavy', bias: [0.1, 0.9] }, look, t)
    return
  }
  // Enthroned on her own rump: three great rolls behind her, a short chest, the egg in her arms.
  limb(ctx, QUEEN_ARM, 6.5, 30, -14, 56, -3.4, 1, -8)
  limb(ctx, QUEEN_ARM, 6.5, 20, -12, 39, -3.4, 1, -7)
  for (const [x, y, rx, ry] of [[-38, -19, 22, 19], [-17, -24, 25, 24 + breath * 0.6], [7, -23, 21, 22]]) {
    // A roll: a dark edge, the pale belly under it, and the lit back over both.
    oval(ctx, x, y, rx, ry, 0, QUEEN.dark)
    oval(ctx, x, y - 1.2, rx - 1.6, ry - 1.6, 0, QUEEN.belly)
    oval(ctx, x - 0.5, y - ry * 0.3, rx * 0.92, ry * 0.69, 0, QUEEN.body)
    shine(ctx, x, y, rx, ry)
  }
  blob(ctx, 21, -37, 15, 18, -0.25, QUEEN.body, QUEEN.dark, false)
  limb(ctx, QUEEN.dark, 6.5, 26, -13, 50, -3.4, 0, -8)
  limb(ctx, QUEEN.dark, 6.5, 16, -9, 33, -3.4, 0, -7)
  egg(ctx, 40, -31 - breath * 0.4, [31, -44, 9, 2], [16, -42, 1, 9], t)
  queenHead(ctx, 32, -57, 17.5, 14.5, 0, { brows: [-0.55, 0.35], lid: 0.3, tilt: 0.12, mouth: 'flat' }, look, t)
}

// ---- Every creature through one door. ----

/** The body box of each kind in stage units: its width along the ground and its height above its feet. Feelers,
 *  wings and props may reach a little outside it. The queen's box is that of her `sit` pose; wedged in the shaft
 *  she is 56 wide and 96 tall, and a worker with its hands on its hips is about 28 wide and 56 tall. */
export const SIZE: Record<CreatureKind, { width: number; height: number }> = {
  ant: { width: 112, height: 28 },
  queen: { width: 120, height: 72 },
  worker: { width: 84, height: 24 },
  ...INVADER_SIZE,
}

/** The poses each kind has. The first is the one a kind falls back on when it is asked for a pose it has not. */
export const POSES: { [K in CreatureKind]: readonly string[] } = {
  ant: ['stand', 'dig', 'look'],
  queen: ['wedged', 'sit'],
  worker: ['walk', 'carry', 'hips'],
  ...INVADER_POSES,
}

const PAINTERS: Record<CreatureKind, Painter> = { ant: paintAnt, queen: paintQueen, worker: paintWorker, ...invaderPainters }

/** Paints one creature with the middle of its feet at the origin, facing right, y growing downward (so the body is
 *  drawn at negative y). The caller translates, flips and scales. `t` is seconds of game time for small idle
 *  motion (breathing, a feeler twitch); at t = 0 the pose is at rest. */
export function paintCreature(ctx: CanvasRenderingContext2D, kind: CreatureKind, pose: string, look: Look = { x: 0, y: 0 }, t = 0): void {
  const poses = POSES[kind]
  ctx.save()
  PAINTERS[kind](ctx, poses.includes(pose) ? pose : poses[0], look, t)
  ctx.restore()
}

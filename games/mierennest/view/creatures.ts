import { invaderPainters, INVADER_POSES, INVADER_SIZE } from './invaders'
import { ANT, EARTH, GRASS, INK, QUEEN, WORKER } from './palette'
import { blob, edged, eyes, feeler, line, mouth, oval, shine } from './parts'
import type { CreatureKind, Ctx, Face, Look, Painter } from './parts'
import { antFigure } from './parts2'
import type { AntBuild, AntPose } from './parts2'

// The kingdom: the child's own ant, the queen and a worker, all honey-gold and round. Each is painted with the
// middle of its feet at the origin, facing right, in flat colour with one hard highlight on each glossy part and
// large eyes. This file is also the one door to every creature: `paintCreature` hands the invaders on to their own
// file. Poses whose names differ only by a number at the end are partners: swapping between them is one movement.

export type { CreatureKind, Look } from './parts'

// Three colours the palette has not got: the lit top of a crumb of earth, the shaded side of the queen's egg, and
// the blush of a cheek.
const CRUMB_LIGHT = '#d29a5c'
const EGG_SHADE = '#e6cfa0'
const CHEEK = '#ff8a5c'

/** A crumb of dug earth: a small lump with a lit top. */
function crumb(ctx: Ctx, x: number, y: number, r: number): void {
  oval(ctx, x, y, r, r * 0.82, 0.4, EARTH.speck)
  oval(ctx, x + r * 0.5, y + r * 0.3, r * 0.6, r * 0.5, 0, EARTH.speck)
  oval(ctx, x - r * 0.1, y - r * 0.22, r * 0.78, r * 0.56, 0.4, EARTH.top)
  oval(ctx, x - r * 0.3, y - r * 0.4, r * 0.3, r * 0.16, -0.5, CRUMB_LIGHT)
}

// ---- The child's ant: the brightest gold, eager, with a blue neckerchief that nobody else wears. ----

const ANT_BUILD: AntBuild = {
  body: ANT.body, dark: ANT.dark, leg: ANT.leg, lit: ANT.lit, jaw: ANT.jaw,
  ab: [22, 12], th: [13, 8.5], hd: [15.5, 13.5], eye: 7.8, limb: 5.6, cheek: CHEEK, scarf: [ANT.scarf, ANT.scarfDark], spark: true,
}

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
  // Sat down with its rump tucked under it, wiping its jaws with a foreleg, eyes shut with pleasure. Both sitting
  // poses are compact: no wider than 80 and no higher than 34, to fit the foot of a new nest's shaft.
  look: {
    ab: [-21, -12, 0.2], th: [-3, -14.5, -0.7], hd: [12, -16.5, -0.12], tails: -0.3,
    legs: [[-14, 0, -2, -3], [0, 0, -2, -2], [29, -8, 2, 7]],
    far: [[-10, 0, -2, -3], [5, 0, -2, -2], [17, 0, 3, -3]],
    feel: [-13, 2, 0.2], face: { shut: 'joy', brows: [-0.12, -0.1], mouth: 'smile', jaws: 0.1 },
  },
  // A scuttle in two frames: the three legs that stand in one are in the air in the other, and the body bobs.
  walk1: {
    ab: [-31, -14, -0.04], th: [2, -12.5, 0], hd: [33, -15.5, 0.03],
    legs: [[-28, 0, -2, -8], [6, 0, -4, 0], [14, 0, 3, -5]],
    far: [[-11, -3, -5, -7], [-7, 0, -3, 0], [31, -3, 3, -6]],
    feel: [9, -14, 0.3], face: { brows: [-0.2, -0.1], mouth: 'grin' },
  },
  walk2: {
    ab: [-31, -15.5, -0.1], th: [2, -13.5, -0.03], hd: [33, -17, -0.06],
    legs: [[-12, -3, -5, -7], [-7, 0, -3, 0], [29, -3, 3, -6]],
    far: [[-27, 0, -2, -8], [8, 0, -4, 0], [16, 0, 3, -5]],
    feel: [2, -17, 0.2], face: { brows: [-0.2, -0.1], mouth: 'grin' },
  },
  // Carrying: head thrown back, jaws wide open round the lump that the game paints in them, feelers laid back.
  carry: {
    ab: [-32, -13, 0.06], th: [1, -13.5, -0.22], hd: [31.5, -18.5, -0.75],
    legs: [[-23, 0, -4, -8], [-1, 0, -4, 0], [19, 0, 4, -6]],
    feel: [-7, -15, -0.3], face: { brows: [-0.2, -0.1], mouth: 'none', jaws: 1.15, bias: [0.6, -0.5] },
  },
  // Waiting: sat down below something out of reach, head tipped up at it, one foreleg held up toward it.
  wait: {
    ab: [-21, -12, 0.2], th: [-3, -14.5, -0.7], hd: [12, -16.5, -0.28], tails: -0.3,
    legs: [[-14, 0, -2, -3], [0, 0, -2, -2], [16, 0, 3, -3]],
    far: [[-10, 0, -2, -3], [5, 0, -2, -2], [35, -26, 4, 5]],
    feel: [-12, -1.5, 0.2], face: { brows: [0.1, 0.25], mouth: 'o', bias: [0.5, -0.9] },
  },
}
/** Sat down, its rump is tucked under it and shows short. */
const ANT_SAT: AntBuild = { ...ANT_BUILD, ab: [16, 12] }

const paintAnt: Painter = (ctx, pose, look, t) => {
  antFigure(ctx, pose === 'look' || pose === 'wait' ? ANT_SAT : ANT_BUILD, ANT_POSES[pose] ?? ANT_POSES.stand, look, t)
  if (pose !== 'dig') return
  // The crumbs it throws up, on their way over its shoulder.
  crumb(ctx, 57, -13, 4)
  crumb(ctx, 47, -28, 3.2)
  crumb(ctx, 63, -27, 2.4)
  crumb(ctx, 29, -34, 2.8)
}

// ---- A worker: smaller, a shade duller, bare-necked, and tidy to a fault. ----

const WORKER_BUILD: AntBuild = {
  body: WORKER.body, dark: WORKER.dark, leg: WORKER.leg, lit: WORKER.lit, jaw: WORKER.jaw,
  ab: [16, 9.5], th: [10.5, 7], hd: [12.5, 11], eye: 5.6, limb: 4.8,
}
/** Upright it is seen from behind its shoulder, and its rump is short. */
const WORKER_UPRIGHT: AntBuild = { ...WORKER_BUILD, ab: [11.5, 9.5] }

const WORKER_POSES: Record<string, AntPose> = {
  walk: {
    ab: [-23, -11.5, -0.06], th: [1, -10.5, 0], hd: [25, -12.5, 0],
    legs: [[-20, 0, -2, -7], [3, 0, -4, 0], [13, 0, 3, -4]],
    far: [[-10, -2, -4, -6], [-4, 0, -3, 0], [22, -2, 3, -5]],
    feel: [8, -12, 0.3], face: { brows: [0.1, 0.1], mouth: 'flat' },
  },
  walk2: {
    ab: [-23, -12.5, -0.1], th: [1, -11.5, -0.03], hd: [25, -13.5, -0.05],
    legs: [[-10, -2, -4, -6], [-5, 0, -3, 0], [21, -2, 3, -5]],
    far: [[-19, 0, -2, -7], [5, 0, -4, 0], [14, 0, 3, -4]],
    feel: [3, -14, 0.2], face: { brows: [0.1, 0.1], mouth: 'flat' },
  },
  // A crumb of earth balanced on its head: it walks carefully and watches the crumb.
  carry: {
    ab: [-23, -11, 0], th: [1, -10.5, 0], hd: [25, -12, 0.05],
    legs: [[-17, 0, -3, -7], [0, 0, -4, 0], [16, 0, 3, -5]],
    feel: [-13, -3, 0.5], face: { brows: [-0.35, -0.2], mouth: 'o', bias: [-0.2, -0.9] },
  },
  // Upright on its two back legs, a fist on each hip and both elbows out, scowling down at the damage. The middle
  // pair of legs is folded small on its belly.
  hips: {
    ab: [-8, -12.5, -0.55], th: [2, -24.5, -1.4], hd: [5, -42, 0.12],
    legs: [[0, 0, 2.5, 1], [7, -19, 1, 1], [-1, -18.5, -11, -3, 1]],
    far: [[10, 0, 2.5, 1], [9, -21, 1, 1], [9, -18.5, 8.5, -3, 1]],
    feel: [-10, -7, 0.45], face: { brows: [0.55, 0.5], lid: 0.34, mouth: 'frown', bias: [0.3, 0.8] },
  },
}

const paintWorker: Painter = (ctx, pose, look, t) => {
  antFigure(ctx, pose === 'hips' ? WORKER_UPRIGHT : WORKER_BUILD, WORKER_POSES[pose] ?? WORKER_POSES.walk, look, t)
  if (pose === 'carry') crumb(ctx, 23, -26, 6.5)
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

/** Her head, the same in every pose: wide, with heavy lids, cheeks, and a tuft of three feelers that stand like
 *  the points of a crown. `squash` is how hard the shaft presses her cheeks. `lay` turns the tuft about its
 *  roots: forward when it is positive, flat back when it is negative. */
function queenHead(ctx: Ctx, x: number, y: number, rx: number, ry: number, squash: number, f: Face, look: Look, t: number, lay = 0): void {
  const sway = Math.sin(t * 2.2) * 1.5
  for (const k of [-1, 1, 0]) {
    if (lay === 0) {
      feeler(ctx, QUEEN.leg, 3.6, x + k * rx * 0.2, y - ry * 0.8, x + k * rx * 0.42 + sway, y - ry - (k === 0 ? 12 : 8), k * 0.3, QUEEN.body)
      continue
    }
    // A laid feeler keeps its length and its place in the fan, and bows away from the head.
    const dx = k * rx * 0.22 + sway, dy = -ry * 0.2 - (k === 0 ? 12 : 8), a = lay + k * 0.28
    feeler(ctx, QUEEN.leg, 3.6, x + k * rx * 0.2, y - ry * 0.8, x + k * rx * 0.2 + dx * Math.cos(a) - dy * Math.sin(a), y - ry * 0.8 + dx * Math.sin(a) + dy * Math.cos(a), lay > 0 ? 0.3 : -0.3, QUEEN.body)
  }
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

/** Her egg at [x, y, turn], held against her chest by two arms, each [shoulderX, shoulderY, elbowDx, elbowDy]. */
function egg(ctx: Ctx, at: readonly number[], far: readonly number[], near: readonly number[], t: number): void {
  const hug = Math.sin(t * 1.6) * 0.6
  const [x, y, turn] = at
  edged(ctx, QUEEN.leg, QUEEN.arm, 8, far[0], far[1], x + 8, y + 5 - hug, far[2], far[3])
  blob(ctx, x, y, 10.5, 13.5, turn, QUEEN.egg, EGG_SHADE, false)
  edged(ctx, QUEEN.leg, QUEEN.dark, 8, near[0], near[1], x - 1, y + 9 + hug, near[2], near[3])
}

// What changes between the two frames of each of her poses: wedged, she squirms, hugs the egg tighter and rolls
// her eyes up; enthroned, she shifts the egg and lifts one eyebrow. `eggDown` and `eggDown2` are the same throne
// with the egg at last on the floor.
const WEDGED = {
  wedged: {
    rolls: [[-3, 22, 1], [-23, 21, 1], [-42, 24, 0]], feet: [-15, 14], egg: [5, -53, 0.3], far: [23, -62, 6, 5], near: [-23, -62, -7, 7], head: -82,
    face: { brows: [-0.5, 0.5], lid: 0.42, tilt: -0.25, mouth: 'wavy', bias: [0.1, 0.9] },
  },
  wedged2: {
    rolls: [[-3, 19, 1], [-20, 25, 1], [-43, 21, 0]], feet: [-10, 18], egg: [1, -58, -0.2], far: [23, -61, 9, 9], near: [-23, -61, -11, 10], head: -80.5,
    face: { brows: [-0.15, -0.75], lid: 0.08, mouth: 'frown', bias: [-0.5, -1.6] },
  },
} as const
const SIT = {
  sit: { egg: [40, -31, 0.3], face: { brows: [-0.55, 0.35], lid: 0.3, tilt: 0.12, mouth: 'flat' } },
  sit2: { egg: [43, -34, 0.62], face: { brows: [0.2, 0.35], raise: 0.55, lid: 0.14, tilt: 0.12, mouth: 'wavy' } },
} as const

/** One roll of her rump: a dark edge, the pale belly under it, and the lit back over both. */
function roll(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  oval(ctx, x, y, rx, ry, 0, QUEEN.dark)
  oval(ctx, x, y - 1.2, rx - 1.6, ry - 1.6, 0, QUEEN.belly)
  oval(ctx, x - 0.5, y - ry * 0.3, rx * 0.92, ry * 0.69, 0, QUEEN.body)
  shine(ctx, x, y, rx, ry)
}

/** A fist at (x, y) with one finger out along (dx, dy): the hand that shows a guest the door. */
function pointing(ctx: Ctx, x: number, y: number, dx: number, dy: number): void {
  line(ctx, QUEEN.leg, 5.4, [x, y, x + dx, y + dy])
  oval(ctx, x, y, 5.4, 5.4, 0, QUEEN.leg)
  line(ctx, QUEEN.dark, 3, [x, y, x + dx, y + dy])
  oval(ctx, x, y, 4.2, 4.2, 0, QUEEN.dark)
}

// The two frames of her opinion of a guest: how far she leans, where her head is, the hand of the pointing arm
// with the bow of its elbow, the finger from that hand, the lay of her feelers and her mouth. And the two frames of
// being carried to a new room: each kicking leg as [footX, footY, kneeDx, kneeDy], the lay of her feelers, her mouth.
const GLARE = {
  glare: { lean: 0.1, head: [38, -56], arm: [-18, -61, 0, -1], finger: [-10.5, -5], lay: -0.3, mouth: 'flat' },
  glare2: { lean: 0.2, head: [42, -54.5], arm: [-28, -66, 0, -1], finger: [-12.5, -6], lay: 0.7, mouth: 'wavy' },
} as const
const CARRIED = {
  carried: { far: [54, -40, 0, -3], near: [33, -6.5, 8, 1], lay: -1.45, mouth: 'o' },
  carried2: { far: [41, -7.5, 8, 0], near: [53, -36, 0, -3], lay: -1.62, mouth: 'wavy' },
} as const

/** The egg set down at last, standing in a little cushion of moss on the floor in front of her. */
function eggOnMoss(ctx: Ctx, x: number): void {
  for (const [dx, r] of [[-8, 5.4], [0, 6.4], [8, 5.4]]) oval(ctx, x + dx, -4.6, r + 1.6, r, 0, GRASS.dark)
  blob(ctx, x, -17.5, 10.5, 13.5, 0.08, QUEEN.egg, EGG_SHADE, false)
  for (const [dx, r] of [[-10.5, 4.2], [-4, 5], [4, 4.8], [10.5, 4]]) {
    oval(ctx, x + dx, -3.4, r + 1, r * 0.82, 0, GRASS.blade)
    oval(ctx, x + dx - 0.8, -4.8, r * 0.5, r * 0.3, -0.3, GRASS.light)
  }
}

const paintQueen: Painter = (ctx, pose, look, t) => {
  const breath = Math.sin(t * 1.6)
  if (pose === 'wedged' || pose === 'wedged2') {
    // Stuck upright in a shaft two cells wide like a cork: two small feet that find no floor, then three rolls of
    // her, each squeezed as wide as the shaft. The pale belly bulges on the lower two; the egg lies on the third.
    const w = WEDGED[pose]
    edged(ctx, QUEEN.leg, QUEEN.arm, 6.4, -12, -9, w.feet[0], -3.2, -3, 0)
    edged(ctx, QUEEN.leg, QUEEN.arm, 6.4, 10, -9, w.feet[1], -3.2, 3, 0)
    for (const [y, h, belly] of w.rolls) {
      pill(ctx, -28, y - h, 56, h, 10.5, QUEEN.dark)
      pill(ctx, -27.5, y - h, 55, h - 3, 10, QUEEN.body)
      if (belly) pill(ctx, -11, y - h + 2.5, 31, h - 8, 7.5, QUEEN.belly)
      shine(ctx, -3, y - h / 2 - 1, 26, h / 2)
    }
    egg(ctx, [w.egg[0], w.egg[1] - breath * 0.5, w.egg[2]], w.far, w.near, t)
    queenHead(ctx, 0, w.head, 27, 14.5, 2.5, w.face, look, t)
    return
  }
  if (pose === 'carried' || pose === 'carried2') {
    // Moving house, lifted off the floor by workers who are not in this picture: she lies tipped back with her
    // head thrown back, hugs the egg to her chest with both arms, kicks her dangling legs in turn and protests
    // wide-eyed at whoever is under her, feelers flat back.
    const c = CARRIED[pose]
    edged(ctx, QUEEN.leg, QUEEN.arm, 7.6, 31, -28, c.far[0], c.far[1], c.far[2], c.far[3], true)
    roll(ctx, -38, -22, 21, 16.5)
    roll(ctx, -16, -31, 25, 22 + breath * 0.6)
    roll(ctx, 8, -39, 21, 21)
    blob(ctx, 14, -49, 15, 17, -0.85, QUEEN.body, QUEEN.dark, false)
    edged(ctx, QUEEN.leg, QUEEN.dark, 7.6, 24, -24, c.near[0], c.near[1], c.near[2], c.near[3], true)
    egg(ctx, [31, -43 - breath * 0.4, 0.7], [26, -55, 11, 0], [8, -50, -1, 9], t)
    ctx.save()
    ctx.translate(12, -58.5)
    ctx.rotate(-0.5)
    queenHead(ctx, 0, 0, 17.5, 14.5, 0, { brows: [-0.2, 0.3], mouth: 'none', bias: [0.5, 0.9] }, look, t, c.lay)
    // Her mouth, twice as wide as she ever opens it on her throne.
    mouth(ctx, 6.5, 8, 13, c.mouth)
    ctx.restore()
    return
  }
  // Enthroned on her own rump: three great rolls behind her, a short chest, the egg in her arms, and her two hind
  // legs folded in front of her with the knees up.
  const s = SIT[pose === 'sit2' ? 'sit2' : 'sit']
  // With the egg set down her feet are drawn in, to make room for it on the floor.
  const down = pose === 'eggDown' || pose === 'eggDown2'
  if (down) edged(ctx, QUEEN.leg, QUEEN.arm, 7.6, 32, -13, 42, -3.8, 6, -11, true)
  else edged(ctx, QUEEN.leg, QUEEN.arm, 7.6, 32, -13, 57, -3.8, 7.5, -11, true)
  for (const [x, y, rx, ry] of [[-38, -19, 22, 19], [-17, -24, 25, 24 + breath * 0.6], [7, -23, 21, 22]]) roll(ctx, x, y, rx, ry)
  if (pose === 'glare' || pose === 'glare2') {
    // A guest is doing its act in her room. She leans at it from her throne, brows hard down in a V over narrowed
    // eyes, the egg tucked in the crook of one arm and the other thrust out behind her at the door; in the second
    // frame the arm straightens, the finger jabs further and her feelers snap forward at the guest.
    const g = GLARE[pose]
    blob(ctx, 24, -37, 15, 18, g.lean, QUEEN.body, QUEEN.dark, false)
    edged(ctx, QUEEN.leg, QUEEN.dark, 7.6, 26, -10, 47, -3.8, 7, -10.5, true)
    blob(ctx, 38, -30 - breath * 0.4, 10.5, 13.5, 0.4, QUEEN.egg, EGG_SHADE, false)
    edged(ctx, QUEEN.leg, QUEEN.arm, 8, 37, -43, 37, -17, 15, 3)
    edged(ctx, QUEEN.leg, QUEEN.dark, 8, 16, -44, g.arm[0], g.arm[1], g.arm[2], g.arm[3])
    pointing(ctx, g.arm[0], g.arm[1], g.finger[0], g.finger[1])
    ctx.save()
    ctx.translate(g.head[0], g.head[1])
    ctx.rotate(g.lean)
    // She has eyes for her guest alone: they do not follow the finger.
    queenHead(ctx, 0, 0, 17.5, 14.5, 0, { lid: 0.4, tilt: 0.5, mouth: 'none', bias: [0.9, 0.3] }, { x: 0, y: 0 }, t, g.lay)
    // Her mouth, a longer line than usual, and her brows, heavier here than anywhere else and pressed onto her eyes.
    mouth(ctx, 5.5, 9.8, 9, g.mouth)
    const r = 14.5 * 0.52
    line(ctx, INK, r * 0.5, [-2.1 - r * 0.95, -2.9 - r * 1.35, -2.1 + r * 0.7, -2.9 - r * 0.55])
    line(ctx, INK, r * 0.44, [-2.1 + r * 1.3, -2.9 - r * 0.45, -2.1 + r * 2.3, -2.9 - r * 1])
    ctx.restore()
    return
  }
  blob(ctx, 21, -37, 15, 18, -0.25, QUEEN.body, QUEEN.dark, false)
  if (down) {
    // The egg is on its moss, and her arms are her own again: both flung wide in a long stretch, eyes shut with
    // the relief of it; in the second frame the far hand comes down and pats the egg.
    const stretch = Math.sin(t * 1.6) * 1.2
    const pat = Math.abs(Math.sin(t * 5)) * 2.4
    edged(ctx, QUEEN.leg, QUEEN.dark, 7.6, 26, -10, 35, -3.8, 6, -10.5, true)
    eggOnMoss(ctx, 56.5)
    if (pose === 'eggDown2') edged(ctx, QUEEN.leg, QUEEN.arm, 8, 31, -44, 56, -34.5 - pat, 8, -9)
    else edged(ctx, QUEEN.leg, QUEEN.arm, 8, 31, -44, 63, -62 - stretch, 4, 7)
    edged(ctx, QUEEN.leg, QUEEN.dark, 8, 16, -42, -9, -63 - stretch, -3, 8)
    queenHead(ctx, 32, -57, 17.5, 14.5, 0, { brows: [-0.3, 0.25], shut: 'joy', mouth: 'smile' }, look, t)
    return
  }
  edged(ctx, QUEEN.leg, QUEEN.dark, 7.6, 26, -10, 47, -3.8, 7, -10.5, true)
  egg(ctx, [s.egg[0], s.egg[1] - breath * 0.4, s.egg[2]], [31, -44, 9, 2], [16, -42, 1, 9], t)
  queenHead(ctx, 32, -57, 17.5, 14.5, 0, s.face, look, t)
}

// ---- Every creature through one door. ----

/** The body box of each kind in stage units: its width along the ground and its height above its feet. Feelers,
 *  wings and props may reach a little outside it. The queen's box is that of her `sit` pose; wedged in the shaft
 *  she is 56 wide and 96 tall, carried she keeps inside 120 by 80, and a worker with its hands on its hips is
 *  about 28 wide and 56 tall. */
export const SIZE: Record<CreatureKind, { width: number; height: number }> = {
  ant: { width: 112, height: 28 },
  queen: { width: 120, height: 72 },
  worker: { width: 84, height: 24 },
  ...INVADER_SIZE,
}

/** The poses each kind has. The first is the one a kind falls back on when it is asked for a pose it has not. */
export const POSES: { [K in CreatureKind]: readonly string[] } = {
  ant: ['stand', 'dig', 'look', 'walk1', 'walk2', 'carry', 'wait'],
  queen: ['wedged', 'sit', 'wedged2', 'sit2', 'eggDown', 'eggDown2', 'glare', 'glare2', 'carried', 'carried2'],
  worker: ['walk', 'carry', 'hips', 'walk2'],
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

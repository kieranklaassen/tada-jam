import { BEETLE, DUNG_BEETLE, DUNG_FLY, FLY, GRASS, MUD, RAIDER, SAND } from './palette'
import { beetleFigure, line, oval, shape, shine } from './parts'
import type { BeetleBuild, BeetlePose, Ctx, Legs, P, Painter } from './parts'
import { antFigure, flyFigure } from './parts2'
import type { AntBuild, AntPose, FlyBuild, FlyPose } from './parts2'

// The campers who raid the nest: the raider ant, the beetle, the fly, the dung beetle with its ball, and the dung
// fly who leads them. Each is painted with the middle of its feet at the origin, facing right.

type Invader = 'raider' | 'beetle' | 'fly' | 'dungBeetle' | 'dungBall' | 'dungFly'

export const INVADER_SIZE: Record<Invader, { width: number; height: number }> = {
  raider: { width: 118, height: 28 },
  beetle: { width: 124, height: 56 },
  fly: { width: 118, height: 56 },
  dungBeetle: { width: 124, height: 56 },
  dungBall: { width: 84, height: 84 },
  dungFly: { width: 118, height: 56 },
}

/** The poses of each kind. Two whose names differ only by a number at the end are partners: one movement. */
export const INVADER_POSES = {
  raider: ['pillow', 'walk', 'stuck', 'nap', 'walk2', 'stuck2', 'nap2'],
  beetle: ['napkin', 'walk', 'onBack', 'lean', 'walk2', 'onBack2'],
  fly: ['hands', 'fly', 'bump', 'hands2', 'fly2'],
  dungBeetle: ['polish', 'push', 'sit', 'polish2', 'walk', 'walk2'],
  dungBall: ['plain', 'sandy'],
  dungFly: ['point', 'fly', 'point2', 'fly2'],
} as const

// The few colours the palette has not got: the near legs of the dung beetle, cloth for the pillow and the rag with
// its shaded side and its stripe, the lit top of a lump of dung, and the leather and the bark of the dung fly's
// strap and twig.
const DUNG_LEG = '#2f2060'
const CLOTH = '#fbf3df'
const CLOTH_SHADE = '#d6c6a2'
const CLOTH_STRIPE = '#9fc3e6'
const BALL_LIGHT = '#94703f'
const STRAP = '#6b4a2a'
const TWIG = '#5b3a1c'

// ---- The raider ant: crimson and slate, long and low, helmeted and masked, a bit of a rascal. ----

const RAIDER_BUILD: AntBuild = {
  body: RAIDER.body, dark: RAIDER.dark, leg: RAIDER.leg, lit: RAIDER.lit, jaw: RAIDER.jaw,
  ab: [25, 8.5], th: [13, 8], hd: [15, 11], eye: 5.8, limb: 5.6,
  gear: { helmet: RAIDER.helmet, brim: RAIDER.brim, mask: RAIDER.mask, eye: RAIDER.eye },
}

/** A big pale pillow with pinched corners and two stripes, for the wait at the camp. */
function pillow(ctx: Ctx, x: number, y: number, turn: number): void {
  const cushion = (w: number, h: number, fill: string) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(-w, -h)
    ctx.quadraticCurveTo(0, -h + 3, w, -h)
    ctx.quadraticCurveTo(w - 2.5, 0, w, h)
    ctx.quadraticCurveTo(0, h - 3, -w, h)
    ctx.quadraticCurveTo(-w + 2.5, 0, -w, -h)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  cushion(16, 10.5, CLOTH_SHADE)
  ctx.clip()
  ctx.translate(-0.8, -1.4)
  cushion(15.4, 9.6, CLOTH)
  for (const sx of [-6.5, 5.5]) line(ctx, CLOTH_STRIPE, 2.6, [sx, -12, sx + 1.5, 0, sx, 12], true)
  ctx.restore()
}

/** The string of mud that comes up with a foot pulled out of the puddle. */
function mudString(ctx: Ctx, x: number, y: number): void {
  shape(ctx, MUD.fill, [x - 3, y - 1, x + 3, y - 1, x + 1.5, y + 7, x + 6, 2, x - 7, 2, x - 1.5, y + 7])
  oval(ctx, x, y - 0.5, 4.4, 3.8, 0, MUD.fill)
  line(ctx, MUD.shine, 1.4, [x - 1.5, y - 1.5, x + 0.5, y - 2])
}

const RAIDER_POSES: Record<string, AntPose> = {
  // Waiting half upright, sat on its rump with a big pillow hugged under one arm, eyeing the nest sideways.
  pillow: {
    ab: [-30, -10, 0.1], th: [-1, -15.5, -0.55], hd: [19, -27, -0.1],
    legs: [[-21, 0, -4, -7], [-5, 0, -5, 0], [33, -7, 6, -7]],
    far: [[-14, 0, -4, -7], [4, 0, -5, 0], [15, 0, 4, -3]],
    feel: [6, -10, 0.3], face: { lid: 0.3, tilt: 0.2, mouth: 'teeth', bias: [0.5, 0] },
    held: (ctx) => pillow(ctx, 20, -10.5, -0.22),
  },
  walk: {
    ab: [-30, -11.5, -0.05], th: [3, -11.5, 0], hd: [33, -12.5, 0.08],
    legs: [[-27, 0, -2, -8], [5, 0, -4, 0], [17, 0, 3, -5]],
    far: [[-13, -2.5, -5, -7], [-5, 0, -3, 0], [29, -2.5, 3, -6]],
    feel: [3, -12, 0.3], face: { lid: 0.28, tilt: 0.3, mouth: 'teeth' },
  },
  walk2: {
    ab: [-30, -12.5, -0.1], th: [3, -12.5, -0.03], hd: [33, -14, 0.02],
    legs: [[-13, -2.5, -5, -7], [-6, 0, -3, 0], [28, -2.5, 3, -6]],
    far: [[-26, 0, -2, -8], [7, 0, -4, 0], [19, 0, 3, -5]],
    feel: [1, -13, 0.25], face: { lid: 0.28, tilt: 0.3, mouth: 'teeth' },
  },
  // Its feet in the mud: it leans back and hauls a front leg up, and the mud comes with it.
  stuck: {
    ab: [-31, -12, 0.08], th: [1, -13, -0.12], hd: [32, -16.5, -0.25],
    legs: [[-22, 1, -4, -7], [-1, 1, -4, 0], [26, -13, 6, -4]],
    far: [[-14, 1, -4, -7], [7, 1, -4, 0], [20, 1, 4, -3]],
    feel: [-3, -12, -0.3], face: { lid: 0.05, mouth: 'wavy', bias: [0.2, 0.8] },
  },
  // The other way: it leans forward and hauls a back leg up, looking round at it.
  stuck2: {
    ab: [-29, -15.5, -0.16], th: [3, -12.5, 0.1], hd: [33, -12, 0.18],
    legs: [[-31, -10, -5, -9], [2, 1, -4, 0], [20, 1, 4, -3]],
    far: [[-17, 1, -4, -7], [9, 1, -4, 0], [27, 1, 4, -3]],
    feel: [6, -9, 0.3], face: { lid: 0.05, mouth: 'teeth', bias: [-1.2, 0.5] },
  },
  // Flat on its belly, asleep, legs out sideways, feelers slack on the ground: breathing in, and breathing out.
  nap: {
    ab: [-30, -9.5, 0.04], th: [2, -8.5, 0.04], hd: [33, -11.5, 0.15], puff: 1.12,
    legs: [[-22, 0, -5, -3], [-3, 0, -6, 2], [19, 0, 5, 1]],
    feel: [3, 8, -0.2], face: { shut: 'sleep', mouth: 'grin', jaws: 0.1 },
  },
  nap2: {
    ab: [-30, -8, 0.02], th: [2, -8, 0.04], hd: [33.5, -10.5, 0.2], puff: 0.86,
    legs: [[-24, 0, -5, -2], [-3, 0, -6, 2], [21, 0, 5, 1]],
    feel: [3, 9, -0.2], flick: [3, -12], face: { shut: 'sleep', mouth: 'o', jaws: 0.1 },
  },
}

const paintRaider: Painter = (ctx, pose, look, t) => {
  const p = RAIDER_POSES[pose] ?? RAIDER_POSES.walk
  const stuck = pose === 'stuck' || pose === 'stuck2'
  if (stuck) oval(ctx, -2, 1, 52, 5, 0, MUD.edge)
  antFigure(ctx, RAIDER_BUILD, p, look, t)
  if (!stuck) return
  // The front of the puddle over its feet, and the string of mud on the leg it has pulled free.
  oval(ctx, -2, 3, 50, 3.6, 0, MUD.fill)
  const up = p.legs[pose === 'stuck' ? 2 : 0]
  mudString(ctx, up[0], up[1] - 0.5)
  line(ctx, MUD.shine, 1.6, [-34, 2.4, -22, 2])
}

// ---- The beetle: round, heavy and blue, with a short horn; dim but dignified. ----

const BEETLE_BUILD: BeetleBuild = { ...BEETLE, leg: BEETLE.horn }

/** The leaf it has tucked under its chin as a napkin. */
function napkin(ctx: Ctx): void {
  ctx.fillStyle = GRASS.light
  ctx.beginPath()
  ctx.moveTo(47, -10)
  ctx.quadraticCurveTo(52, 0, 33, 1)
  ctx.quadraticCurveTo(22, -6, 30, -13)
  ctx.closePath()
  ctx.fill()
  line(ctx, GRASS.dark, 1.6, [42, -10, 37, -6, 33, -1], true)
}

const BEETLE_POSES: Record<string, BeetlePose> = {
  // Waiting for its dinner: chin up over the napkin, licking its lips.
  napkin: {
    at: [-2, 0, -0.03], hd: [0, -3, -0.15], held: napkin,
    legs: [[-40, 0, -2, -2], [-12, 0, -2, -1], [14, 0, -2, -2]],
    face: { brows: [-0.2, -0.2], lid: 0.3, mouth: 'tongue', bias: [0.3, -0.2] },
  },
  // A heavy walk in two frames: the feet change places and the whole beetle rocks.
  walk: {
    at: [-2, 0, 0.02],
    legs: [[-44, 0, -2, -3], [-6, 0, 2, -1], [12, 0, -2, -1]],
    far: [[-26, -2, 2, -2], [-8, 0, -2, -1], [36, -2, 3, -3]],
    face: { brows: [0.05, 0.05], lid: 0.4, mouth: 'flat' },
  },
  walk2: {
    at: [-2, -1.5, -0.03], hd: [0, 1, 0.06],
    legs: [[-33, -2, 2, -2], [-15, 0, -2, -1], [27, -2, 3, -3]],
    far: [[-37, 0, -2, -3], [1, 0, 2, -1], [20, 0, -2, -1]],
    face: { brows: [0.05, 0.05], lid: 0.4, mouth: 'flat' },
  },
  // On its back: the shell on the floor, the pale belly up, six legs waving one way and then the other, and its
  // eyes going with them.
  onBack: {
    at: [-3, -57, 0.05, 1, -1],
    legs: [[-48, -65, -3, 2], [-16, -70, -3, 0], [24, -67, 4, 0]],
    far: [[-28, -70, 3, 0], [4, -66, 3, 0], [42, -66, 4, 3]],
    face: { brows: [-0.4, -0.3], mouth: 'o', bias: [-1.4, 0.2] },
  },
  onBack2: {
    at: [-3, -57, -0.03, 1, -1],
    legs: [[-34, -68, 3, 2], [-2, -66, 3, 0], [38, -64, 4, 0]],
    far: [[-42, -66, -3, 0], [-10, -70, -3, 0], [28, -70, -4, 3]],
    face: { brows: [-0.3, -0.4], mouth: 'wavy', bias: [1.4, 0.2] },
  },
  // Shoulder down against a wall, legs driving from behind, eyes screwed up.
  lean: {
    at: [-6, -1, 0.15], hd: [-1, 1, 0.1],
    legs: [[-58, 0, -2, -4], [-34, 0, -2, -3], [-6, 0, -2, -3]],
    face: { brows: [0.5, 0.45], shut: 'squeeze', tilt: 0.3, mouth: 'teeth' },
  },
}

/** Feet that keep moving while a pose holds: from leg `from` on each swings by up to `by`, all still at t = 0. */
const wave = (legs: Legs, t: number, by: number, from = 0): Legs =>
  legs.map((l, i) => (i < from ? l : [l[0] + Math.sin(t * 7) * by * (i % 2 ? -1 : 1), l[1], l[2] ?? 0, l[3] ?? 0]))

const paintBeetle: Painter = (ctx, pose, look, t) => {
  const p = BEETLE_POSES[pose] ?? BEETLE_POSES.walk
  // On its back its legs go on walking in the air.
  beetleFigure(ctx, BEETLE_BUILD, pose.startsWith('onBack') ? { ...p, legs: wave(p.legs, t, 4), far: wave(p.far ?? [], t, -4) } : p, look, t)
}

// ---- The dung beetle: purple, proud, a little vain. ----

const DUNG_BUILD: BeetleBuild = { ...DUNG_BEETLE, leg: DUNG_LEG, lash: true }

// The ball stands on its right with its near side 62 from the middle of the beetle's feet and its middle 42 up.
const DUNG_POSES: Record<string, BeetlePose> = {
  // Polishing the ball: it stands back from it, nose in the air, and rubs with a rag held out at arm's length; at
  // one end of the rub its eyes are shut with pleasure, at the other it looks the shine over.
  polish: {
    at: [-10, 0, -0.07], hd: [-3, -2, -0.22],
    legs: [[-50, 0, -2, -3], [-20, 0, -2, -1], [12, 0, 2, -2]],
    far: [[-38, 0, 2, -2], [-8, 0, -2, -1], [58, -45, 9, 6]],
    face: { brows: [-0.3, -0.25], shut: 'joy', mouth: 'smile' },
  },
  polish2: {
    at: [-10, 0, -0.05], hd: [-3, -1, -0.12],
    legs: [[-50, 0, -2, -3], [-20, 0, -2, -1], [12, 0, 2, -2]],
    far: [[-38, 0, 2, -2], [-8, 0, -2, -1], [59, -31, 8, 6]],
    face: { brows: [-0.3, -0.25], lid: 0.35, mouth: 'smile', bias: [1, -0.1] },
  },
  // A handstand, facing away from the ball: head down by the floor, front legs braced like arms, rump high, and
  // the two hind legs up against the ball, walking it backwards as dung beetles do.
  push: {
    at: [4, -3.5, -0.4, -0.9, 0.9], hd: [-2, -6, -0.2],
    legs: [[61, -51, 4, -5], [24, 0, 3, -2], [-44, 0, -1, -1]],
    far: [[62, -31, 5, 3], [36, 0, 3, -2], [-32, 0, -1, -1]],
    face: { brows: [0.5, 0.45], lid: 0.15, mouth: 'teeth', bias: [1.4, -0.7] },
  },
  // Sitting on its rump with its chin in its hand.
  sit: {
    at: [3, -4, -0.3], hd: [-1, 3, 0.4],
    legs: [[-3, 0, 4, -8], [29, 0, 4, -9], [44, -24, 7, 12]],
    far: [[9, 0, 4, -8], [43, 0, 4, -8], [51, -5, 6, 4]],
    face: { brows: [0.2, -0.2], lid: 0.5, mouth: 'frown', bias: [0.2, 0.3] },
  },
  // A plain walk with no ball, nose up, in two frames.
  walk: {
    at: [-2, 0, 0.02], hd: [0, -2, -0.15],
    legs: [[-44, 0, -2, -3], [-6, 0, 2, -1], [12, 0, -2, -1]],
    far: [[-26, -2, 2, -2], [-8, 0, -2, -1], [36, -2, 3, -3]],
    face: { brows: [-0.2, -0.2], lid: 0.45, mouth: 'smile' },
  },
  walk2: {
    at: [-2, -1.5, -0.03], hd: [0, -1, -0.08],
    legs: [[-33, -2, 2, -2], [-15, 0, -2, -1], [27, -2, 3, -3]],
    far: [[-37, 0, -2, -3], [1, 0, 2, -1], [20, 0, -2, -1]],
    face: { brows: [-0.2, -0.2], lid: 0.45, mouth: 'smile' },
  },
}

/** The rag in its hand at (x, y): a square of cloth with one corner hanging, flapping a little as it rubs. */
function rag(ctx: Ctx, x: number, y: number, t: number): void {
  const rub = Math.sin(t * 9) * 1.5
  shape(ctx, CLOTH_SHADE, [x - 6, y - 8 + rub, x + 7, y - 9 + rub, x + 8, y + 5 + rub, x + 2, y + 11 + rub, x - 7, y + 4 + rub])
  shape(ctx, CLOTH, [x - 5, y - 8 + rub, x + 6, y - 8 + rub, x + 6, y + 4 + rub, x + 1.5, y + 8.5 + rub, x - 6, y + 2 + rub])
}

const paintDungBeetle: Painter = (ctx, pose, look, t) => {
  const p = DUNG_POSES[pose] ?? DUNG_POSES.sit
  beetleFigure(ctx, DUNG_BUILD, p, look, t)
  if (pose === 'polish' || pose === 'polish2') rag(ctx, (p.far ?? p.legs)[2][0] + 3, (p.far ?? p.legs)[2][1] - 3, t)
}

// ---- The dung ball: big, brown and plain, with a few straws in it. ----

const paintBall: Painter = (ctx, pose) => {
  const { ball, ballDark, straw } = DUNG_BEETLE
  // The straws that stick out behind it, then the ball with its dark underside, its lumps and its one highlight.
  for (const s of [[-22, -70, -36, -88], [28, -66, 45, -79]]) line(ctx, straw, 3, s)
  oval(ctx, 0, -42, 42, 42, 0, ballDark)
  oval(ctx, -2, -45.5, 38.5, 38, 0, ball)
  for (const [x, y, r, turn] of [[-12, -22, 9, 0.3], [17, -40, 7, -0.5], [-4, -55, 5, 0.2], [22, -17, 6, 0.6], [-26, -44, 4.5, 1]]) {
    oval(ctx, x, y, r, r * 0.6, turn, ballDark)
    oval(ctx, x - 0.6, y - 1.6, r * 0.8, r * 0.36, turn, BALL_LIGHT)
  }
  for (const s of [[-33, -30, -20, -34, -8, -31], [8, -64, 20, -74], [30, -30, 43, -27]]) line(ctx, straw, 3, s, true)
  shine(ctx, 0, -42, 42, 42)
  if (pose !== 'sandy') return
  // Rolled through sand: pale grains stuck all over it, scattered by a fixed rule so that they never jump.
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4
    const d = 6 + ((i * 17) % 30)
    oval(ctx, Math.cos(a) * d, -42 + Math.sin(a) * d, 2.4 - (i % 3) * 0.5, 1.9 - (i % 3) * 0.4, a, i % 4 === 0 ? SAND.edge : SAND.fill)
  }
}

// ---- The fly: teal, with huge red eyes; nosy and greedy. ----

const FLY_POSES: Record<string, FlyPose> = {
  // Standing with its front up, rubbing its two front hands together: one over the other, then the other way
  // round, with its tongue out and then in.
  hands: {
    at: [-3, -1, -0.16], wings: 'rest',
    legs: [[-12, 0, -3, -3], [7, 0, -3, -2], [51, -17, 4, 5]],
    far: [[-2, 0, -3, -3], [18, 0, -3, -2], [48, -8, 7, 3]],
    face: { brows: [0.4, -0.3], lid: 0.22, mouth: 'tongue', bias: [0.3, 0.1] },
  },
  hands2: {
    at: [-3, -1, -0.14], wings: 'rest',
    legs: [[-12, 0, -3, -3], [7, 0, -3, -2], [48, -8, 4, 6]],
    far: [[-2, 0, -3, -3], [18, 0, -3, -2], [52, -17, 6, 2]],
    face: { brows: [0.4, -0.3], lid: 0.22, mouth: 'grin', bias: [0.3, 0.1] },
  },
  // Hovering, in the two halves of a wing beat: it bobs, and its legs swing under it.
  fly: {
    at: [2, -4, -0.08], wings: 'up',
    legs: [[-5, -3, -3, 1], [7, -1, -3, 1], [25, -4, 3, 1]],
    face: { brows: [-0.2, -0.1], mouth: 'smile' },
  },
  fly2: {
    at: [2, -7, -0.03], wings: 'down',
    legs: [[-9, -5, -3, 1], [4, -3, -3, 1], [28, -7, 3, 1]],
    face: { brows: [-0.2, -0.1], mouth: 'smile' },
  },
  // Sitting where it fell, dazed, with a bump on its head and its eyes going different ways.
  bump: {
    at: [5, -2, -0.24], wings: 'droop', bump: true,
    legs: [[24, 0, 3, -6], [37, 0, 4, -7], [31, -8, 6, 2]],
    far: [[32, 0, 3, -6], [46, 0, 4, -7], [41, -7, 6, 2]],
    face: { brows: [-0.5, 0.4], dizzy: true, mouth: 'wavy' },
  },
}

const paintFly: Painter = (ctx, pose, look, t) => {
  const p = FLY_POSES[pose] ?? FLY_POSES.fly
  // Its two front hands rub against each other.
  flyFigure(ctx, FLY, pose.startsWith('hands') ? { ...p, legs: wave(p.legs, t, 2, 2), far: wave(p.far ?? [], t, -2, 2) } : p, look, t)
}

// ---- The dung fly: golden, goggled, the self-important leader of the dung beetles. ----

const DUNG_FLY_BUILD: FlyBuild = { ...DUNG_FLY, strap: STRAP }

// The last number of a pose is the twig: how far it reaches from the hand, along and down.
const DUNG_FLY_POSES: Record<string, FlyPose & { twig: P }> = {
  // Standing tall with its chest out, the twig pointing forward and down; then it taps the twig down and lifts
  // its chin.
  point: {
    at: [0, -2, -0.24], wings: 'rest', twig: [23, 6],
    legs: [[-10, 0, -3, -3], [8, 0, -3, -2], [41, -22, 2, 5]],
    far: [[-1, 0, -3, -3], [18, 0, -3, -2], [29, -6, 6, 0]],
    face: { brows: [0.3, 0.3], lid: 0.3, mouth: 'frown', bias: [0.3, 0.3] },
  },
  point2: {
    at: [0, -2, -0.24], wings: 'rest', twig: [21, 10], nod: -0.1,
    legs: [[-10, 0, -3, -3], [8, 0, -3, -2], [43, -13, 2, 5]],
    far: [[-1, 0, -3, -3], [18, 0, -3, -2], [29, -6, 6, 0]],
    face: { brows: [0.3, 0.3], lid: 0.42, mouth: 'flat', bias: [0.3, 0.3] },
  },
  // In the air, the twig held out ahead like a baton, in the two halves of a wing beat.
  fly: {
    at: [-2, -4, -0.1], wings: 'up', twig: [17, -9],
    legs: [[-8, -3, -3, 1], [4, -1, -3, 1], [50, -24, 6, 6]],
    far: [[0, -3, -3, 1], [12, -1, -3, 1], [27, -6, 3, 1]],
    face: { brows: [0.35, 0.3], lid: 0.2, mouth: 'o' },
  },
  fly2: {
    at: [-2, -7, -0.05], wings: 'down', twig: [18, -4],
    legs: [[-11, -5, -3, 1], [2, -3, -3, 1], [50, -22, 6, 6]],
    far: [[-3, -5, -3, 1], [10, -3, -3, 1], [29, -9, 3, 1]],
    face: { brows: [0.35, 0.3], lid: 0.2, mouth: 'o' },
  },
}

const paintDungFly: Painter = (ctx, pose, look, t) => {
  const p = DUNG_FLY_POSES[pose] ?? DUNG_FLY_POSES.fly
  flyFigure(ctx, DUNG_FLY_BUILD, p, look, t)
  // The twig it conducts with, from its near front hand, with one small side shoot.
  const [x, y] = p.legs[2]
  const [dx, dy] = p.twig
  line(ctx, TWIG, 3.2, [x - dx * 0.25, y - dy * 0.25, x + dx, y + dy])
  line(ctx, TWIG, 2.2, [x + dx * 0.5, y + dy * 0.5, x + dx * 0.5 + dy * 0.3, y + dy * 0.5 - dx * 0.3 - 2])
  oval(ctx, x, y, 2.8, 2.8, 0, DUNG_FLY.dark)
}

export const invaderPainters: Record<Invader, Painter> = {
  raider: paintRaider,
  beetle: paintBeetle,
  fly: paintFly,
  dungBeetle: paintDungBeetle,
  dungBall: paintBall,
  dungFly: paintDungFly,
}

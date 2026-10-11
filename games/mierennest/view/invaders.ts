import { BEETLE, DUNG_BEETLE, DUNG_FLY, FLY, GRASS, HIGHLIGHT, INK, MUD, RAIDER, SAND } from './palette'
import { antFigure, beetleFigure, blob, bow, enter, eyes, feeler, limb, line, mouth, oval, place, shape, shine, TAU, TONGUE } from './parts'
import type { AntBuild, AntPose, BeetleBuild, BeetlePose, Ctx, Face, Legs, Look, P, Painter, Stance } from './parts'

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

export const INVADER_POSES = {
  raider: ['pillow', 'walk', 'stuck', 'nap'],
  beetle: ['napkin', 'walk', 'onBack', 'lean'],
  fly: ['hands', 'fly', 'bump'],
  dungBeetle: ['polish', 'push', 'sit'],
  dungBall: ['plain', 'sandy'],
  dungFly: ['point', 'fly'],
} as const

// The few colours the palette has not got: the near legs of the dung beetle, cloth for the pillow and the rag with
// its shaded side, the lit top of a lump of dung, and the leather and the bark of the dung fly's strap and twig.
const DUNG_LEG = '#2f2060'
const CLOTH = '#fbf3df'
const CLOTH_SHADE = '#d6c6a2'
const BALL_LIGHT = '#94703f'
const STRAP = '#6b4a2a'
const TWIG = '#5b3a1c'

// ---- The raider ant: red, long and low, masked, a bit of a rascal. ----

const RAIDER_BUILD: AntBuild = { ...RAIDER, ab: [26, 10], th: [14, 8.5], hd: [15.5, 12.5], eye: 6.8, limb: 4.4, mask: RAIDER.leg }

const RAIDER_POSES: Record<string, AntPose> = {
  // Waiting with its front up and a pillow under one arm, eyeing the nest sideways.
  pillow: {
    ab: [-33, -11.5, 0.05], th: [1, -14, -0.35], hd: [30, -17, -0.05],
    legs: [[-22, 0, -4, -7], [-4, 0, -5, 0], [17, -3, 8, 5]],
    far: [[-15, 0, -4, -7], [5, 0, -5, 0], [23, 0, 4, -3]],
    feel: [10, -14, 0.3], face: { brows: [0.45, -0.3], lid: 0.3, mouth: 'teeth', bias: [0.5, 0] },
  },
  walk: {
    ab: [-33, -13.5, -0.06], th: [2, -12.5, 0], hd: [35, -14.5, 0.05],
    legs: [[-27, 0, -2, -8], [5, 0, -4, 0], [17, 0, 3, -5]],
    far: [[-13, 0, -5, -7], [-5, 0, -3, 0], [29, 0, 3, -6]],
    feel: [12, -13, 0.3], face: { brows: [0.4, 0.3], mouth: 'teeth' },
  },
  // Its feet in the mud: it hauls one leg up and the mud comes with it.
  stuck: {
    ab: [-33, -12, 0.08], th: [1, -13, -0.12], hd: [33, -16.5, -0.25],
    legs: [[-22, 1, -4, -7], [-1, 1, -4, 0], [26, -13, 6, -4]],
    far: [[-14, 1, -4, -7], [7, 1, -4, 0], [20, 1, 4, -3]],
    feel: [-2, -15, -0.3], face: { brows: [-0.45, -0.5], mouth: 'wavy', bias: [0.2, 0.8] },
  },
  // Flat on its belly, asleep, with its legs out sideways.
  nap: {
    ab: [-32, -10, 0.04], th: [2, -8.5, 0.04], hd: [34, -12, 0.12],
    legs: [[-22, 0, -5, -3], [-3, 0, -6, 2], [19, 0, 5, 1]],
    feel: [-19, 7, -0.35], face: { shut: 'sleep', mouth: 'o', jaws: 0.1 },
  },
}

/** A small pale pillow with pinched corners, for the wait at the camp. */
function pillow(ctx: Ctx): void {
  for (const [x, y] of [[7, -15], [9, -5], [28, -4], [26, -15]]) oval(ctx, x, y, 3, 3, 0, CLOTH_SHADE)
  oval(ctx, 17.5, -9.5, 12, 7.5, 0.1, CLOTH_SHADE)
  oval(ctx, 17, -10.5, 11, 6, 0.1, CLOTH)
}

const paintRaider: Painter = (ctx, pose, look, t) => {
  const p = RAIDER_POSES[pose] ?? RAIDER_POSES.walk
  if (pose === 'stuck') oval(ctx, -2, 1, 52, 5, 0, MUD.edge)
  antFigure(ctx, RAIDER_BUILD, pose === 'pillow' ? { ...p, held: pillow } : p, look, t)
  if (pose !== 'stuck') return
  // The front of the puddle over its feet, and the string of mud that comes up with the leg it has pulled free.
  oval(ctx, -2, 3, 50, 3.6, 0, MUD.fill)
  shape(ctx, MUD.fill, [23, -14, 29, -14, 27.5, -6, 32, 2, 19, 2, 24.5, -6])
  oval(ctx, 26, -13.5, 4.2, 3.6, 0, MUD.fill)
  line(ctx, MUD.shine, 1.6, [-34, 2.4, -22, 2])
  line(ctx, MUD.shine, 1.4, [24.5, -14.5, 26.5, -15])
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
  walk: {
    at: [-2, 0, 0],
    legs: [[-44, 0, -2, -3], [-6, 0, 2, -1], [12, 0, -2, -1]],
    far: [[-26, 0, 2, -2], [-8, 0, -2, -1], [36, 0, 3, -3]],
    face: { brows: [0.05, 0.05], lid: 0.4, mouth: 'flat' },
  },
  // On its back: the shell on the floor, the pale belly up, six legs waving.
  onBack: {
    at: [-3, -57, 0.05, 1, -1],
    legs: [[-46, -65, -3, 2], [-14, -70, -3, 0], [26, -67, 4, 0]],
    far: [[-28, -70, 3, 0], [4, -66, 3, 0], [42, -66, 4, 3]],
    face: { brows: [-0.4, -0.3], mouth: 'o' },
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
  beetleFigure(ctx, BEETLE_BUILD, pose === 'onBack' ? { ...p, legs: wave(p.legs, t, 4), far: wave(p.far ?? [], t, -4) } : p, look, t)
}

// ---- The dung beetle: purple, proud, a little vain. ----

const DUNG_BUILD: BeetleBuild = { ...DUNG_BEETLE, leg: DUNG_LEG, lash: true }

const DUNG_POSES: Record<string, BeetlePose> = {
  // Polishing the ball that stands on its right, nose in the air.
  polish: {
    at: [-4, 0, -0.1], hd: [0, -2, -0.2],
    legs: [[-44, 0, -2, -3], [-14, 0, -2, -1], [18, 0, 2, -2]],
    far: [[-32, 0, 2, -2], [-2, 0, -2, -1], [62, -43, 10, 4]],
    face: { brows: [-0.3, -0.25], shut: 'joy', mouth: 'smile' },
  },
  // A handstand, facing away from the ball and walking it backwards with the hind legs, as dung beetles do.
  push: {
    at: [10, -8, -0.3, -1, 1],
    legs: [[62, -48, 2, -6], [20, 0, 3, -2], [-30, 0, -3, -2]],
    far: [[62, -26, 4, 5], [32, 0, 3, -2], [-16, 0, -2, -2]],
    face: { brows: [0.4, 0.35], lid: 0.2, mouth: 'teeth' },
  },
  // Sitting on its rump with its chin in its hand.
  sit: {
    at: [3, -6, -0.32], hd: [-1, 3, 0.4],
    legs: [[-3, 0, 4, -8], [29, 0, 4, -9], [44, -24, 7, 12]],
    far: [[9, 0, 4, -8], [43, 0, 4, -8], [51, -5, 6, 4]],
    face: { brows: [0.2, -0.2], lid: 0.5, mouth: 'frown', bias: [0.2, 0.3] },
  },
}

const paintDungBeetle: Painter = (ctx, pose, look, t) => {
  beetleFigure(ctx, DUNG_BUILD, DUNG_POSES[pose] ?? DUNG_POSES.sit, look, t)
  if (pose !== 'polish') return
  // The rag in its hand, flapping a little as it rubs.
  const rub = Math.sin(t * 9) * 1.5
  shape(ctx, CLOTH_SHADE, [56, -52 + rub, 67, -54 + rub, 68, -41 + rub, 62, -36 + rub, 55, -42 + rub])
  shape(ctx, CLOTH, [57, -52 + rub, 66, -53 + rub, 66, -42 + rub, 61, -38 + rub, 56, -44 + rub])
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

// ---- The fly plan: a striped rump, a round chest, a head that is mostly eye, glassy wings and thin legs. ----

type FlyBuild = { body: string; dark: string; wing: string; wingEdge: string; eye: string; goggles?: string }
type FlyPose = { at: Stance; wings: 'rest' | 'blur' | 'droop'; legs: Legs; far?: Legs; face?: Face; bump?: boolean }

/** One wing from its root, pointing backward and lifted by `turn`. A beating wing is only its glassy shape. */
function wing(ctx: Ctx, f: FlyBuild, x: number, y: number, length: number, wide: number, turn: number, beating = false): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.fillStyle = f.wing
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-length * 0.25, -wide * 1.1, -length * 0.95, -wide, -length, -wide * 0.15)
  ctx.bezierCurveTo(-length * 0.98, wide * 0.5, -length * 0.4, wide * 0.3, 0, 0)
  ctx.fill()
  if (!beating) {
    ctx.strokeStyle = f.wingEdge
    ctx.lineWidth = 1.6
    ctx.stroke()
    line(ctx, f.wingEdge, 1.3, [-2, -1, -length * 0.5, -wide * 0.25, -length * 0.86, -wide * 0.2], true)
    line(ctx, HIGHLIGHT, 2.6, [-length * 0.36, -wide * 0.62, -length * 0.5, -wide * 0.7, -length * 0.64, -wide * 0.68], true)
  }
  ctx.restore()
}

function flyFigure(ctx: Ctx, f: FlyBuild, p: FlyPose, look: Look, t: number): void {
  const face = p.face ?? {}
  const hips: readonly P[] = [[0, -15], [9, -13], [19, -15]]
  const legs = (list: Legs, colour: string, dx: number) =>
    list.forEach((l, i) => {
      const [x, y] = place(p.at, hips[i][0] + dx, hips[i][1])
      limb(ctx, colour, 3.4, x, y, l[0], l[1] - 1.8, l[2] ?? 0, l[3] ?? 0)
    })
  const beat = Math.sin(t * 40) * 0.15
  // At rest the wings stand up from the back; dazed, one lies flat and one sticks up; in flight they are a blur,
  // a glassy fan with two beats of the wing in it.
  const wings = (near: boolean) => {
    const lift = p.wings === 'rest' ? [0.5, 0.26] : [0.85, 0.02]
    if (p.wings !== 'blur') return wing(ctx, f, near ? 6 : 8, -40, near ? 57 : 52, 13, lift[near ? 1 : 0])
    if (!near) {
      ctx.fillStyle = f.wing
      ctx.beginPath()
      ctx.moveTo(6, -40)
      ctx.arc(6, -40, 42, Math.PI + 0.1, Math.PI + 1.2)
      ctx.closePath()
      ctx.fill()
      for (const r of [28, 36]) bow(ctx, HIGHLIGHT, 2, 6, -40, r, r, 0, Math.PI + 0.45 + beat, Math.PI + 0.85 + beat)
    }
    wing(ctx, f, 6, -40, 46, 9, near ? 0.2 + beat : 1.1 - beat, true)
  }
  legs(p.far ?? p.legs.map((l) => [l[0] + 8, l[1], l[2] ?? 0, l[3] ?? 0]), INK, 5)
  enter(ctx, p.at)
  wings(false)
  blob(ctx, -22, -21, 25, 14 + Math.sin(t * 2.6) * 0.6, -0.1, f.body, f.dark, false)
  // Two dark stripes round the rump.
  for (const x of [-31, -18]) line(ctx, f.dark, 3.2, [x + 2, -33.5 + (x + 31) * 0.1, x - 3, -21, x + 1, -9], true)
  shine(ctx, -22, -21, 25, 14, -0.1)
  blob(ctx, 8, -27, 17, 17, 0, f.body, f.dark)
  wings(true)
  // The head: two short bristles, a round skull, and the eyes that are most of it.
  feeler(ctx, f.dark, 2, 43, -40, 52, -47, 0.3)
  feeler(ctx, f.dark, 2, 38, -42, 45, -51, 0.3)
  blob(ctx, 33, -25, 15, 16, 0, f.body, f.dark, false)
  if (p.bump) {
    oval(ctx, 20, -42, 6.5, 7, -0.4, TONGUE)
    line(ctx, HIGHLIGHT, 2, [17, -45, 19.5, -47])
  }
  mouth(ctx, 42, -13.5, 10, face.mouth ?? 'smile')
  eyes(ctx, 30, -32, 12, 14.2, look, face, f.body, f.dark, f.eye)
  if (f.goggles) {
    // Aviator goggles: the strap round the back of the head, and a pale rim round each eye.
    line(ctx, STRAP, 3.4, [20, -36, 17, -30, 19, -22], true)
    for (const [x, y, r] of [[44.2, -30.6, 10.6], [30, -32, 12.6]]) bow(ctx, f.goggles, 3.2, x, y, r, r, 0, 0, TAU)
  }
  ctx.restore()
  legs(p.legs, f.dark, 0)
}

// ---- The fly: teal, with huge red eyes; nosy and greedy. ----

const FLY_POSES: Record<string, FlyPose> = {
  // Standing with its front up, rubbing its two front hands together.
  hands: {
    at: [-3, -1, -0.16], wings: 'rest',
    legs: [[-12, 0, -3, -3], [7, 0, -3, -2], [49, -11, 3, 6]],
    far: [[-2, 0, -3, -3], [18, 0, -3, -2], [51, -13, 7, 4]],
    face: { brows: [0.4, -0.3], lid: 0.22, mouth: 'tongue', bias: [0.3, 0.1] },
  },
  fly: {
    at: [2, -9, -0.1], wings: 'blur',
    legs: [[-5, -3, -3, 1], [7, -1, -3, 1], [25, -4, 3, 1]],
    face: { brows: [-0.2, -0.1], mouth: 'smile' },
  },
  // Sitting where it fell, dazed, with a bump on its head and its eyes going different ways.
  bump: {
    at: [5, -6, -0.4], wings: 'droop', bump: true,
    legs: [[24, 0, 3, -6], [37, 0, 4, -7], [29, -9, 6, 2]],
    far: [[32, 0, 3, -6], [46, 0, 4, -7], [39, -8, 6, 2]],
    face: { brows: [-0.5, 0.4], dizzy: true, mouth: 'wavy' },
  },
}

const paintFly: Painter = (ctx, pose, look, t) => {
  const p = FLY_POSES[pose] ?? FLY_POSES.fly
  // Its two front hands rub against each other.
  flyFigure(ctx, FLY, pose === 'hands' ? { ...p, legs: wave(p.legs, t, 2, 2), far: wave(p.far ?? [], t, -2, 2) } : p, look, t)
}

// ---- The dung fly: golden, goggled, the self-important leader of the dung beetles. ----

const DUNG_FLY_POSES: Record<string, FlyPose> = {
  // Standing tall with its chest out, the twig pointing forward and down.
  point: {
    at: [0, -7, -0.38], wings: 'rest',
    legs: [[-10, 0, -3, -3], [8, 0, -3, -2], [42, -24, 2, 5]],
    far: [[-1, 0, -3, -3], [18, 0, -3, -2], [28, -8, 6, 0]],
    face: { brows: [0.3, 0.3], lid: 0.3, mouth: 'frown', bias: [0.3, 0.3] },
  },
  fly: {
    at: [-2, -8, -0.2], wings: 'blur',
    legs: [[-8, -3, -3, 1], [4, -1, -3, 1], [55, -38, 6, 6]],
    far: [[0, -3, -3, 1], [12, -1, -3, 1], [27, -6, 3, 1]],
    face: { brows: [0.35, 0.3], lid: 0.2, mouth: 'o' },
  },
}

const paintDungFly: Painter = (ctx, pose, look, t) => {
  const p = DUNG_FLY_POSES[pose] ?? DUNG_FLY_POSES.fly
  flyFigure(ctx, DUNG_FLY, p, look, t)
  // The twig it conducts with, from its near front hand, with one small side shoot.
  const [x, y] = p.legs[2]
  const [dx, dy] = pose === 'point' ? [22, 15] : [9, -22]
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

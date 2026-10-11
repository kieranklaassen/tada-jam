import { EARTH, GRASS, HIGHLIGHT, SKY } from './palette'
import { beetleFace, beetleFigure, blob, bow, enter, limb, line, oval, place, shine } from './parts'
import type { BeetleBuild, BeetlePose, Ctx, Face, Legs, Look } from './parts'
import { flyFigure } from './parts2'
import type { FlyBuild, FlyPose } from './parts2'
import { beetleHead, cheeks, flyHead, handsOverEyes, splat, tucked } from './invaders3'

// What the raid does to the two from the dung heap. The dung beetle heaves at a ball that will not move, loses its
// way, lands on its back and, when somebody walks past, pulls its head in. The dung fly conducts its army with its
// eyes shut, is brought down with mud on its wings, is blown head over heels, gives up, and has a little cry into
// a leaf; it ducks behind its own two hands. Nobody is hurt. Each pose stays in the box of its kind, and the dung
// ball is never painted here: it is a sprite of its own.

export const RAID_DUNG_BEETLE = ['duck', 'heave', 'lost', 'onBack', 'onBack2'] as const
export const RAID_DUNG_FLY = ['duck', 'conduct', 'conduct2', 'down', 'tumble', 'arms', 'weep', 'weep2'] as const

// The bark of the twig, as in `invaders`. The leaf is the palest green of the palette and the tear its sky blue.
const TWIG = '#5b3a1c'
const LEAF = SKY.far
const TEAR = SKY.top

// ---- The dung beetle. ----

const BEETLES: Record<string, BeetlePose> = {
  // Braced low against something that will not move: shoulder forward, one hand flat on it, the hind legs dug in
  // behind, eyes squeezed shut, cheeks puffed.
  heave: {
    at: [-7, -2, 0.16], hd: [-2, 0, 0.14],
    legs: [[-58, 1, -3, -3], [-40, 0, -3, -2], [-13, 0, -3, -2]],
    far: [[-46, 1, -2, -4], [-23, 0, -2, -3], [59, -44, 5, -4]],
    face: { brows: [0.5, 0.45], shut: 'squeeze', tilt: 0.3, mouth: 'none' },
  },
  // On its back: the shell on the floor, the pale belly up, six legs waving one way and then the other.
  onBack: {
    at: [-3, -49.5, 0.05, 0.9, -0.9],
    legs: [[-46, -55, -4, 2], [-17, -55, -4, 0], [22, -55, 5, 0]],
    far: [[-27, -55, 4, 0], [4, -55, 4, 0], [40, -53, 5, 3]],
    face: { brows: [-0.4, -0.3], mouth: 'o', bias: [-1.4, 0.2] },
  },
  onBack2: {
    at: [-3, -49.5, -0.04, 0.9, -0.9],
    legs: [[-32, -55, 4, 2], [-3, -55, 4, 0], [35, -54, 5, 0]],
    far: [[-41, -55, -4, 0], [-11, -55, -4, 0], [26, -55, -5, 3]],
    face: { brows: [-0.3, -0.4], mouth: 'wavy', bias: [1.4, 0.2] },
  },
}

/** Feet that keep moving sideways while a pose holds, all still at t = 0. */
const wave = (legs: Legs, t: number, by: number): Legs => legs.map((l, i) => [l[0] + Math.sin(t * 7) * by * (i % 2 ? -1 : 1), l[1], l[2] ?? 0, l[3] ?? 0])

/** The little heap of earth a dug-in heel has pushed up behind it, `w` wide and `h` high. */
function heap(ctx: Ctx, x: number, w: number, h: number): void {
  const mound = (fill: string, k: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(x - w * k, 1)
    ctx.bezierCurveTo(x - w * 0.5 * k, -h * k * 1.3, x + w * 0.6 * k, -h * k * 1.5, x + w * k, 1)
    ctx.fill()
  }
  mound(EARTH.speck, 1)
  mound(EARTH.top, 0.62)
}

/** The dung beetle that has lost its way, stood up on its hind legs and seen short, as from behind its shoulder:
 *  the shell on its back, the pale belly in front, one hand scratching its head, the other turned up, and an eye
 *  looking each way. */
function upright(ctx: Ctx, b: BeetleBuild, look: Look, t: number): void {
  const face: Face = { brows: [-0.45, 0.4], dizzy: true, mouth: 'wavy' }
  const scratch = Math.sin(t * 9) * 1.5
  limb(ctx, b.dark, 6.5, 5, -9, 13, -3.4, 3, -2)
  limb(ctx, b.dark, 6.5, 17, -24, 40, -21, 2, 7)
  limb(ctx, b.dark, 6.5, 15, -15, 27, -10, 2, 3)
  blob(ctx, -14, -24.5, 24, 23, -0.2, b.shell, b.dark, false)
  bow(ctx, b.dark, 2.2, -9, -25, 19, 20, -0.2, Math.PI * 0.55, Math.PI * 1.3)
  shine(ctx, -14, -24.5, 24, 23, -0.2)
  oval(ctx, 5, -16.5, 15.5, 14.5, 0.1, b.belly)
  blob(ctx, 2, -31, 14, 12, -0.3, b.shell, b.dark)
  ctx.save()
  ctx.translate(15, -37.5)
  ctx.rotate(0.3)
  beetleFace(ctx, b, face, look, t)
  ctx.restore()
  limb(ctx, b.leg, 6.5, -6, -9, -11, -3.4, -3, -2)
  limb(ctx, b.leg, 6.5, 5, -15, 17, -11, 2, 3)
  limb(ctx, b.leg, 6.5, 0, -27, 5 + scratch, -52, -13, 2)
}

/** Paints a dung beetle in one of the raid's poses and says so; says no, and paints nothing, for any other pose. */
export function paintRaidDungBeetle(ctx: Ctx, build: BeetleBuild, pose: string, look: Look, t: number): boolean {
  if (pose === 'duck') {
    tucked(ctx, build, t)
    return true
  }
  if (pose === 'lost') {
    upright(ctx, build, look, t)
    return true
  }
  const p = BEETLES[pose]
  if (!p) return false
  if (pose === 'heave') {
    heap(ctx, -51, 6, 5)
    beetleFigure(ctx, build, p, look, t)
    heap(ctx, -64, 7, 6)
    beetleHead(ctx, p)
    cheeks(ctx, build, 0, 2.6)
    ctx.restore()
  } else beetleFigure(ctx, build, { ...p, legs: wave(p.legs, t, 4), far: wave(p.far ?? [], t, -4) }, look, t)
  return true
}

// ---- The dung fly. ----

// The front legs of some poses are painted over the body as arms, so only the back four legs are listed for them.
const FLIES: Record<string, FlyPose> = {
  // Ducking: sat down, wings flat, goggles pulled down and both hands over them, the twig under one arm.
  duck: {
    at: [5, -2, -0.24], wings: 'flat', nod: 0.12,
    legs: [[24, 0, 3, -6], [37, 0, 4, -7]],
    far: [[32, 0, 3, -6], [46, 0, 4, -7]],
    face: { hidden: true, mouth: 'none' },
  },
  // Conducting, in two frames: stood tall with its chin up and its eyes shut in rapture, the twig raised high and
  // the other hand low; then the twig swept down and the other hand up.
  conduct: {
    at: [-2, -2, -0.17], wings: 'rest', nod: -0.2,
    legs: [[-12, 0, -3, -3], [6, 0, -3, -2], [51, -39, 6, 5]],
    far: [[-3, 0, -3, -3], [16, 0, -3, -2], [45, -9, 6, 2]],
    face: { brows: [-0.3, -0.25], shut: 'joy', mouth: 'smile' },
  },
  conduct2: {
    at: [-2, -1, -0.14], wings: 'rest', nod: -0.1,
    legs: [[-12, 0, -3, -3], [6, 0, -3, -2], [50, -13, 5, 6]],
    far: [[-3, 0, -3, -3], [16, 0, -3, -2], [58, -36, 5, 4]],
    face: { brows: [-0.3, -0.25], shut: 'joy', mouth: 'smile' },
  },
  // Brought down: sat on the floor with mud on its wings, arms folded, goggles askew, sulking.
  down: {
    at: [4, -2, -0.2], wings: 'rest', nod: 0.1,
    legs: [[22, 0, 3, -6], [35, 0, 4, -7]],
    far: [[30, 0, 3, -6], [44, 0, 4, -7]],
    face: { brows: [0.5, 0.45], lid: 0.38, mouth: 'frown', bias: [-0.9, 0.7] },
  },
  // Blown backwards, head over heels: upside down and facing the way it came, legs in the air, wings anyhow.
  tumble: {
    at: [2, -57, -0.12, -1, -1], wings: 'droop',
    legs: [[10, -56, 4, 2], [-6, -57, -3, 0], [-30, -52, -5, 2]],
    far: [[0, -57, 3, 0], [-16, -56, -3, 0], [-40, -47, -5, 3]],
    face: { brows: [-0.5, 0.4], raise: 0.2, mouth: 'o', bias: [0.8, -0.8] },
  },
  // Given up: hovering with its arms folded and its head turned up and away, nose in the air, eyes shut.
  arms: {
    at: [-2, -5, -0.06], wings: 'up', nod: -0.3,
    legs: [[-10, -8, -3, 1], [2, -7, -3, 1]],
    far: [[-2, -8, -3, 1], [10, -7, -3, 1]],
    face: { brows: [0.3, 0.3], shut: 'sleep', mouth: 'frown' },
  },
  // A little cry, in two frames: sat down with its goggles pushed up, a pale leaf pressed to its eyes; then the leaf
  // lowered, one tear, and a small smile for whoever was kind to it.
  weep: {
    at: [4, -2, -0.2], wings: 'droop', nod: 0.2,
    legs: [[22, 0, 3, -6], [35, 0, 4, -7], [38, -30, 7, 5]],
    far: [[30, 0, 3, -6], [44, 0, 4, -7], [40, -7, 6, 2]],
    face: { brows: [-0.5, -0.45], shut: 'squeeze', mouth: 'wavy' },
  },
  weep2: {
    at: [4, -2, -0.2], wings: 'droop', nod: 0.02,
    legs: [[22, 0, 3, -6], [35, 0, 4, -7], [50, -9, 6, 4]],
    far: [[30, 0, 3, -6], [44, 0, 4, -7], [40, -7, 6, 2]],
    face: { brows: [-0.5, -0.45], raise: 0.15, mouth: 'smile', bias: [0.5, -0.9] },
  },
}

/** The twig from a hand at (x, y), reaching (dx, dy) from it, with one small side shoot. */
function twig(ctx: Ctx, x: number, y: number, dx: number, dy: number): void {
  line(ctx, TWIG, 3.2, [x - dx * 0.25, y - dy * 0.25, x + dx, y + dy])
  line(ctx, TWIG, 2.2, [x + dx * 0.5, y + dy * 0.5, x + dx * 0.5 + dy * 0.3, y + dy * 0.5 - dx * 0.3 - 2])
}

/** Its goggles in the frame of its head, off its eyes: the strap, and two rims at (x, y) seen flat by `flat`. */
function goggles(ctx: Ctx, f: FlyBuild, x: number, y: number, turn: number, flat: number): void {
  line(ctx, f.strap ?? f.dark, 3.4, [20, -36, 17, -30, 19, -22], true)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  line(ctx, f.strap ?? f.dark, 3.4, [-13, 0, -8, -1])
  bow(ctx, f.goggles ?? HIGHLIGHT, 3.2, 14.2, 1.4 * flat, 10.6, 10.6 * flat, 0, 0, Math.PI * 2)
  bow(ctx, f.goggles ?? HIGHLIGHT, 3.2, 0, 0, 12.6, 12.6 * flat, 0, 0, Math.PI * 2)
  ctx.restore()
}

/** Folded arms, in the frame of the body: two forearms crossed on the chest, a fist at the end of each. They are
 *  in the colour of the body inside a dark edge, so that they show on the chest. */
function folded(ctx: Ctx, f: FlyBuild): void {
  for (const [x0, y0, x1, y1] of [[-4, -16, 24, -28], [-5, -27, 25, -16]]) {
    line(ctx, f.dark, 7.6, [x0, y0, x1, y1])
    oval(ctx, x1, y1, 5, 5, 0, f.dark)
    line(ctx, f.body, 4.4, [x0, y0, x1, y1])
    oval(ctx, x1, y1, 3.4, 3.4, 0, f.body)
  }
  line(ctx, HIGHLIGHT, 1.5, [0, -25.6, 7, -23])
}

/** A small pale leaf about (x, y) with a dark edge, its stalk toward the hand that holds it. */
function leaf(ctx: Ctx, x: number, y: number, turn: number, size: number): void {
  const blade = (fill: string, grow: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(-size - grow, 0)
    ctx.quadraticCurveTo(-size * 0.1, -size * 0.95 - grow * 1.6, size + grow, 0)
    ctx.quadraticCurveTo(-size * 0.1, size * 0.95 + grow * 1.6, -size - grow, 0)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  blade(GRASS.blade, 1.2)
  blade(LEAF, 0)
  line(ctx, GRASS.blade, 1.4, [-size * 1.3, 0, size * 0.7, 0])
  line(ctx, GRASS.blade, 1, [-size * 0.2, 0, size * 0.25, -size * 0.34])
  line(ctx, GRASS.blade, 1, [-size * 0.5, 0, -size * 0.1, size * 0.34])
  ctx.restore()
}

/** Paints a dung fly in one of the raid's poses and says so; says no, and paints nothing, for any other pose. */
export function paintRaidDungFly(ctx: Ctx, build: FlyBuild, pose: string, look: Look, t: number): boolean {
  const p = FLIES[pose]
  if (!p) return false
  const bare = { ...build, goggles: undefined }
  if (pose === 'duck') {
    flyFigure(ctx, build, p, look, t)
    // The twig under its near arm, then the two hands, small enough to leave the rims of the goggles round them.
    const [x, y] = place(p.at, 14, -11)
    twig(ctx, x, y, 34, -1)
    handsOverEyes(ctx, build, p, 11.2)
  } else if (pose === 'conduct' || pose === 'conduct2') {
    const up = pose === 'conduct'
    const beat = Math.sin(t * 6) * 1.5
    const moving = { ...p, legs: p.legs.map((l, i) => (i === 2 ? [l[0], l[1] + beat, l[2], l[3]] : l)) }
    flyFigure(ctx, build, moving, look, t)
    const [x, y] = moving.legs[2]
    if (up) twig(ctx, x, y, 8, -18)
    else twig(ctx, x, y, 16, 7)
    oval(ctx, x, y, 2.8, 2.8, 0, build.dark)
  } else if (pose === 'down') {
    twig(ctx, 44, -1.8, 20, -0.6)
    flyFigure(ctx, bare, p, look, t)
    enter(ctx, p.at)
    folded(ctx, build)
    ctx.save()
    ctx.translate(-41, -47)
    ctx.rotate(0.3)
    splat(ctx, 13, 9.5, [-6, 9, -1, 5, 11, 1])
    ctx.restore()
    ctx.restore()
    flyHead(ctx, p)
    goggles(ctx, build, 27, -29, 0.42, 1)
    ctx.restore()
  } else if (pose === 'tumble') {
    flyFigure(ctx, build, { ...p, legs: wave(p.legs, t, 3), far: wave(p.far ?? [], t, -3) }, look, t)
    // The twig, out of its hand and turning over in the air.
    ctx.save()
    ctx.translate(57, -31)
    ctx.rotate(-1.1 + t * 5)
    twig(ctx, -5, 0, 13, 0)
    ctx.restore()
  } else if (pose === 'arms') {
    flyFigure(ctx, build, p, look, t)
    enter(ctx, p.at)
    folded(ctx, build)
    ctx.restore()
  } else {
    flyFigure(ctx, bare, p, look, t)
    flyHead(ctx, p)
    goggles(ctx, build, 27, -40.5, -0.12, 0.6)
    if (pose === 'weep2') {
      // One tear under the near eye.
      ctx.fillStyle = TEAR
      ctx.beginPath()
      ctx.moveTo(25, -21.5)
      ctx.quadraticCurveTo(19.6, -13, 25, -11.6)
      ctx.quadraticCurveTo(30.4, -13, 25, -21.5)
      ctx.fill()
      oval(ctx, 23.6, -14.4, 1.1, 1.1, 0, HIGHLIGHT)
    }
    ctx.restore()
    const [x, y] = p.legs[2]
    const dab = pose === 'weep' ? Math.sin(t * 5) * 1 : 0
    if (pose === 'weep') leaf(ctx, x - 10 + dab, y - 8, 0.9, 12)
    else leaf(ctx, x + 5, y - 10, -1.1, 12)
    oval(ctx, x, y - 1.8, 2.4, 2.4, 0, build.dark)
  }
  return true
}

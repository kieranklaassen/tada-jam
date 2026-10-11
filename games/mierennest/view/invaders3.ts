import { HIGHLIGHT, INK, MUD } from './palette'
import { beetleFigure, bow, enter, feeler, limb, line, mouth, oval, place, shine, TONGUE } from './parts'
import type { BeetleBuild, BeetlePose, Ctx, Legs, Look } from './parts'
import { flyFigure } from './parts2'
import type { FlyBuild, FlyPose } from './parts2'

// The raid goes wrong for the beetle and the fly too: one sits down and eats the stores, walks about with mud on
// its eyes and falls through the floor; the other tastes everything it lands on, its own foot included, gets its
// wings gummed up and is knocked out of the air. Nobody is hurt. Each pose stays in the box of its kind. The last
// pose of each is for when somebody walks past: it ducks, and hides its face.

export const RAID_BEETLE = ['eat', 'burp', 'blind', 'strain', 'sit', 'fall', 'duck'] as const
export const RAID_FLY = ['taste', 'tasteFoot', 'gummed', 'tumble', 'peer', 'dodge', 'duck'] as const

// Three colours the palette has not got: a pale seed with its shaded side, and the blush of an embarrassed cheek.
const SEED = '#f7ecc8'
const SEED_SHADE = '#d2bd88'
const BLUSH = '#ee8fa6'

/** Feet that keep moving while a pose holds: each swings by up to `by`, all still at t = 0. */
export const wave = (legs: Legs, t: number, by: number, only?: number): Legs =>
  legs.map((l, i) => (only !== undefined && i !== only ? l : [l[0] + Math.sin(t * 7) * by * (i % 2 ? -1 : 1), l[1] + Math.sin(t * 7 + 1) * by * 0.4 - Math.sin(1) * by * 0.4, l[2] ?? 0, l[3] ?? 0]))

/** A splat of mud about (0, 0) with fingers that run down from it, in half widths `rx` and `ry`. */
export function splat(ctx: Ctx, rx: number, ry: number, drips: readonly number[]): void {
  const body = (fill: string, grow: number) => {
    oval(ctx, 0, 0, rx + grow, ry + grow, 0, fill)
    for (let i = 0; i < drips.length; i += 3) {
      line(ctx, fill, 4.6 + grow * 2, [drips[i], 0, drips[i] + drips[i + 2], drips[i + 1]])
      oval(ctx, drips[i] + drips[i + 2], drips[i + 1], 3 + grow, 3.2 + grow, 0, fill)
    }
  }
  body(MUD.lip, 1.3)
  body(MUD.fill, 0)
  oval(ctx, rx * 0.15, ry * 0.3, rx * 0.7, ry * 0.5, 0, MUD.edge)
  oval(ctx, rx * 0.1, ry * 0.12, rx * 0.74, ry * 0.5, 0, MUD.fill)
  line(ctx, MUD.shine, 2.2, [-rx * 0.62, -ry * 0.3, -rx * 0.3, -ry * 0.62])
  oval(ctx, -rx * 0.02, -ry * 0.66, 1, 1, 0, MUD.shine)
}

// ---- The beetle. ----

/** One pale seed, held in front of the mouth. */
function seed(ctx: Ctx): void {
  oval(ctx, 54, -14.5, 9.4, 6.4, -0.45, SEED_SHADE)
  oval(ctx, 53.4, -15.6, 8.3, 5.1, -0.45, SEED)
  line(ctx, 'rgba(255,255,255,0.85)', 1.8, [49, -16, 52.4, -19])
}

const BEETLES: Record<string, BeetlePose> = {
  // Sat on its rump with one pale seed in both front feet, eyes shut in bliss, cheeks full.
  eat: {
    at: [1, -1, -0.2], hd: [-1, 2, 0.4], held: seed,
    legs: [[-8, 0, 4, -7], [22, 0, 4, -8], [48, -5, 4, 6]],
    far: [[4, 0, 4, -7], [36, 0, 4, -7], [61, -14, 4, 3]],
    face: { brows: [-0.25, -0.2], shut: 'joy', mouth: 'none' },
  },
  // The same beetle a moment later: a small round mouth, eyes wide and sideways, a foot halfway to its lips.
  burp: {
    at: [1.5, -1, -0.2], hd: [-1, 3, 0.3],
    legs: [[-8, 0, 4, -7], [22, 0, 4, -8], [55, -11, 6, 6]],
    far: [[4, 0, 4, -7], [36, 0, 4, -7], [45, -3, 6, 3]],
    face: { brows: [-0.4, -0.35], raise: 0.3, mouth: 'o', bias: [-1.5, -0.1] },
  },
  // Walking with a splat of mud over both eyes, the front feet feeling for the way.
  blind: {
    at: [-4, 0, 0.02], hd: [0, -2, -0.14],
    legs: [[-45, 0, -2, -3], [-8, 0, 2, -1], [53, -8, 5, -5]],
    far: [[-28, -2, 2, -2], [-10, 0, -2, -1], [58, -27, 6, -3]],
    face: { mouth: 'wavy' },
  },
  // The partner of `lean`: the same push, the feet slipped a step back, the cheeks puffed.
  strain: {
    at: [-5, -1, 0.17], hd: [-1, 0, 0.06],
    legs: [[-61, -1, -3, -3], [-41, 0, -3, -2], [-14, 0, -3, -2]],
    far: [[-45, 0, -2, -4], [-21, 0, -2, -3], [5, 0, -2, -3]],
    face: { brows: [0.5, 0.45], shut: 'squeeze', tilt: 0.3, mouth: 'none' },
  },
  // Sat down heavily, the legs straight out in front, a long face.
  sit: {
    at: [1, -1, -0.2], hd: [-1, 5, 0.38],
    legs: [[6, 0, 5, -4], [31, 0, 5, -5], [52, 0, 4, -6]],
    far: [[16, 0, 5, -4], [41, 0, 5, -5], [59, 0, 3, -5]],
    face: { brows: [-0.5, -0.45], lid: 0.5, mouth: 'frown', bias: [0.3, 0.9] },
  },
  // In the air with nothing under it: legs spread, eyes round, looking down.
  fall: {
    at: [-2, -2, 0.1], hd: [0, -1, -0.12],
    legs: [[-58, -8, -4, 3], [-14, 0, -4, 2], [42, -2, 6, 2]],
    far: [[-44, -3, -3, 3], [4, -1, 3, 2], [54, -12, 6, -1]],
    face: { brows: [-0.45, -0.4], raise: 0.35, mouth: 'o', bias: [0, 1.2] },
  },
}

/** Moves the drawing frame into the head of a posed beetle. The caller restores it. */
export function beetleHead(ctx: Ctx, p: BeetlePose): void {
  const [hx = 0, hy = 0, hr = 0] = p.hd ?? []
  enter(ctx, p.at)
  ctx.translate(45 + hx, -22 + hy)
  ctx.rotate(hr)
}

/** A full cheek, in the frame of the head: one round bulge under the near eye that swells past the chin, and the
 *  mouth shut tight beside it. */
export function cheeks(ctx: Ctx, b: BeetleBuild, chew: number, lift = 0): void {
  ctx.translate(0, -lift)
  oval(ctx, 3, 11.4 + chew, 7.8, 6.2, 0.1, b.dark)
  oval(ctx, 2.8, 10.2 + chew, 7.5, 5.6, 0.1, b.shell)
  line(ctx, 'rgba(255,255,255,0.75)', 1.8, [-1.4, 9.6 + chew, 1, 7.6 + chew])
  mouth(ctx, 12, 10.5 + chew * 0.5, 4.6, 'smile')
}

/** A beetle that ducks: its head pulled in under its shell like a tortoise. A smooth dome low on six short legs, a
 *  dark hollow at the front where the head went, and out of it only the tip of the horn, or of the two feelers. */
export function tucked(ctx: Ctx, b: BeetleBuild, t: number): void {
  const breath = Math.sin(t * 1.8) * 0.7
  const peep = Math.sin(t * 2.6) * 1.2
  const dome = (fill: string, x: number, top: number, half: number, foot: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(x - half, foot)
    ctx.bezierCurveTo(x - half - 3, top, x + half + 3, top, x + half, foot)
    ctx.quadraticCurveTo(x, foot + 9, x - half, foot)
    ctx.fill()
  }
  for (const x of [-27, -3, 23]) limb(ctx, b.dark, 6.5, x, -10, x + 5, -3.4, 2, -1)
  oval(ctx, -5, -9, 46, 7.5, 0, b.belly)
  dome(b.dark, -6, -66 - breath, 52, -10)
  dome(b.shell, -6.5, -65 - breath, 50.5, -13.5)
  // The edge of the wing case and the seam of the neck plate, which is all that is left of a neck.
  bow(ctx, b.dark, 2.2, -12, -34, 40, 20, 0, Math.PI * 0.16, Math.PI * 0.8)
  bow(ctx, b.dark, 2.2, 4, -26, 24, 22, 0, -0.8, 0.3)
  shine(ctx, -6, -29, 50, 23.5)
  // The hollow, cut to the roundness of the shell, and what looks out of it.
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.moveTo(26, -6.5)
  ctx.bezierCurveTo(26, -23, 43, -25, 45.5, -11.5)
  ctx.quadraticCurveTo(36, -6, 26, -6.5)
  ctx.fill()
  if (b.horn) line(ctx, b.horn, 7, [37, -11, 51, -11, 53, -23 - peep], true)
  else {
    feeler(ctx, b.leg, 2.6, 38, -11, 55, -16 + peep, 0.3)
    feeler(ctx, b.leg, 2.6, 36, -13, 51, -26 - peep, 0.3)
  }
  for (const x of [-35, -11, 15]) limb(ctx, b.leg, 6.5, x, -10, x - 4, -3.4, -2, -1)
}

/** Paints a beetle in one of the raid's poses and says so; says no, and paints nothing, for any other pose. */
export function paintRaidBeetle(ctx: Ctx, build: BeetleBuild, pose: string, look: Look, t: number): boolean {
  if (pose === 'duck') {
    tucked(ctx, build, t)
    return true
  }
  const p = BEETLES[pose]
  if (!p) return false
  const moving = pose === 'fall' ? { ...p, legs: wave(p.legs, t, 4), far: wave(p.far ?? [], t, -4) } : pose === 'blind' ? { ...p, legs: wave(p.legs, t, 2.5, 2), far: wave(p.far ?? [], t, -2.5, 2) } : p
  beetleFigure(ctx, build, moving, look, t)
  if (pose === 'burp' || pose === 'strain' || pose === 'eat' || pose === 'blind') {
    beetleHead(ctx, p)
    if (pose === 'eat') cheeks(ctx, build, Math.sin(t * 9) * 0.8)
    else if (pose === 'strain') cheeks(ctx, build, 0, 2.6)
    else if (pose === 'burp') oval(ctx, -2.5, 8.5, 5.4, 3, 0.1, BLUSH)
    else {
      ctx.translate(5.5, -4.5)
      splat(ctx, 15, 9.6, [-6, 12, -1, 9, 9, 1])
    }
    ctx.restore()
  }
  return true
}

// ---- The fly. ----

const FLIES: Record<string, FlyPose> = {
  // Standing with its head down and its tongue out on whatever is in front of it, eyes shut to taste it better.
  taste: {
    at: [-7, -1, 0], wings: 'rest', nod: 0.2,
    legs: [[-17, 0, -3, -3], [1, 0, -3, -2], [21, 0, 3, -3]],
    face: { brows: [-0.2, -0.15], shut: 'joy', mouth: 'o' },
  },
  // By mistake it has tasted its own front foot: the eyes snap open and look down at it.
  tasteFoot: {
    at: [-4, -1, -0.1], wings: 'rest', nod: -0.04,
    legs: [[-13, 0, -3, -3], [5, 0, -3, -2], [52, -9, 5, 7]],
    far: [[-4, 0, -3, -3], [15, 0, -3, -2], [29, 0, 3, -3]],
    face: { brows: [-0.5, -0.45], raise: 0.3, mouth: 'o', bias: [1, 1.2] },
  },
  // Sitting with both wings stuck together in a lump of mud, scrubbing at it with a back leg, cross.
  gummed: {
    at: [7, -2, -0.2], wings: 'rest', nod: -0.04,
    legs: [[-32, -31, -4, 7], [33, 0, 4, -7], [42, -7, 6, 2]],
    far: [[22, 0, 3, -6], [41, 0, 4, -7], [48, -8, 6, 2]],
    face: { brows: [0.5, 0.45], lid: 0.3, mouth: 'frown', bias: [-1.5, -0.5] },
  },
  // Upside down in the air: legs everywhere, wings askew.
  tumble: {
    at: [2, -56, 0.25, 1, -1], wings: 'droop',
    legs: [[-22, -44, -5, 2], [8, -55, 3, 0], [38, -46, 6, 1]],
    far: [[-8, -54, -3, 0], [24, -55, 3, 0], [47, -36, 5, 3]],
    face: { brows: [-0.5, 0.4], mouth: 'o', bias: [0, 1] },
  },
  // Hovering and leaning forward to look, one hand flat over its eyes like the peak of a cap, with the elbow up
  // behind its head, and the other on its hip.
  peer: {
    at: [-3, -5, 0.16], wings: 'down', nod: 0.06,
    legs: [[-9, -3, -3, 1], [-7, -11, 1, 9], [8, -45, -6, -2]],
    far: [[-1, -3, -3, 1], [10, -2, -3, 1], [30, -4, 3, 1]],
    face: { lid: 0.12, mouth: 'o', bias: [1.2, 0.3] },
  },
  // In the air with its body swung aside, looking back over its shoulder, pleased with itself.
  dodge: {
    at: [3, -3, -0.3], wings: 'down', nod: 0.3,
    legs: [[4, -5, 4, 2], [17, -3, 4, 2], [33, -9, 5, 1]],
    face: { brows: [-0.3, -0.2], lid: 0.4, tilt: 0.15, mouth: 'grin', bias: [-1.6, -0.2] },
  },
  // Ducking: sat down with its wings folded flat on its back and both front hands clapped over its eyes. The two
  // arms are painted over the head, so only the back four legs are listed.
  duck: {
    at: [5, -2, -0.24], wings: 'flat', nod: 0.12,
    legs: [[24, 0, 3, -6], [37, 0, 4, -7]],
    far: [[32, 0, 3, -6], [46, 0, 4, -7]],
    face: { hidden: true, mouth: 'none' },
  },
}

/** Moves the drawing frame into the head of a posed fly, nod and all. The caller restores it. */
export function flyHead(ctx: Ctx, p: FlyPose): void {
  enter(ctx, p.at)
  ctx.translate(22, -22)
  ctx.rotate(p.nod ?? 0)
  ctx.translate(-22, 22)
}

/** Over a fly whose face is hidden: its two front arms, bent up from the chest with the elbows out in front, and
 *  a hand with three fingers flat over the place of each eye, the far one first. `r` is the size of the near hand. */
export function handsOverEyes(ctx: Ctx, f: FlyBuild, p: FlyPose, r = 13): void {
  const n = p.nod ?? 0
  // A point of the head, nod and all, in the frame of the body.
  const head = (x: number, y: number): readonly [number, number] => [22 + (x - 22) * Math.cos(n) - (y + 22) * Math.sin(n), -22 + (x - 22) * Math.sin(n) + (y + 22) * Math.cos(n)]
  const hand = (arm: readonly number[], x: number, y: number, size: number) => {
    const [hx, hy] = head(x, y)
    const ray = (a: number, from: number, to: number) => [hx + Math.cos(a + n) * size * from, hy + Math.sin(a + n) * size * from, hx + Math.cos(a + n) * size * to, hy + Math.sin(a + n) * size * to]
    // The hand is in the colour of the body inside a dark edge, like the head it lies on, so that it shows on it.
    const mitt = (fill: string, grow: number) => {
      for (const a of [-2.35, -1.7, -1.05]) line(ctx, fill, size * 0.6 + grow * 2, ray(a, 0.3, 0.76))
      oval(ctx, hx, hy + size * 0.14, size * 0.94 + grow, size * 0.8 + grow, n, fill)
    }
    line(ctx, f.dark, 4.4, [...arm, hx + 1.5, hy + size * 0.6])
    mitt(f.dark, 1.5)
    mitt(f.body, 0)
    for (const a of [-2.02, -1.38]) line(ctx, f.dark, 1.5, ray(a, 0.5, 1.02))
    line(ctx, HIGHLIGHT, 1.8, [hx - size * 0.5, hy + size * 0.2, hx - size * 0.28, hy - size * 0.06])
  }
  enter(ctx, p.at)
  hand([40, -10, 53, -13], 44.2, -30.6, r * 0.84)
  hand([19, -15, 39, -7], 30, -32, r)
  ctx.restore()
}

/** A tongue from the mouth to where it tastes: pink, round at the end, with a wet streak. */
function tongue(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  line(ctx, TONGUE, 6, [x0, y0, (x0 + x1) / 2, (y0 + y1) / 2 + 3.5, x1, y1], true)
  oval(ctx, x1, y1, 4, 3.4, 0, TONGUE)
  line(ctx, 'rgba(255,255,255,0.7)', 1.5, [x0 + (x1 - x0) * 0.35, y0 + (y1 - y0) * 0.35, x0 + (x1 - x0) * 0.7, y0 + (y1 - y0) * 0.7 - 0.6])
}

/** Paints a fly in one of the raid's poses and says so; says no, and paints nothing, for any other pose. */
export function paintRaidFly(ctx: Ctx, build: FlyBuild, pose: string, look: Look, t: number): boolean {
  const p = FLIES[pose]
  if (!p) return false
  const moving = pose === 'tumble' ? { ...p, legs: wave(p.legs, t, 3), far: wave(p.far ?? [], t, -3) } : pose === 'gummed' ? { ...p, legs: wave(p.legs, t, 2, 0) } : p
  flyFigure(ctx, build, moving, look, t)
  if (pose === 'taste') {
    flyHead(ctx, p)
    tongue(ctx, 43, -11.5, 57 + Math.sin(t * 5) * 0.8, -12)
    ctx.restore()
  } else if (pose === 'tasteFoot') {
    // The tongue lies on the foot, and the foot shows under the end of it.
    const [mx, my] = place(p.at, 42.5, -11.5)
    const [fx, fy] = p.legs[2]
    tongue(ctx, mx, my, fx - 2, fy - 5.4)
    oval(ctx, fx, fy - 1.8, 3.2, 2.6, 0, build.dark)
    line(ctx, build.dark, 3, [fx, fy - 1.8, fx - 4, fy + 1.6])
  } else if (pose === 'gummed') {
    enter(ctx, p.at)
    ctx.translate(-41, -47)
    ctx.rotate(0.3)
    splat(ctx, 12, 9, [-6, 9, -1, 5, 11, 1])
    ctx.restore()
  } else if (pose === 'duck') handsOverEyes(ctx, build, p)
  else if (pose === 'peer') {
    // The forearm from the elbow to the brow, and the hand flat over both eyes.
    const [ex, ey] = p.legs[2]
    line(ctx, build.dark, 3, [ex, ey - 1.8, 33, -50])
    line(ctx, build.dark, 5, [31, -50.2, 51, -48.4])
  }
  return true
}

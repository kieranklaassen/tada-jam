import type { Pen } from './pen'

// The dog's segments. Every pose is one dark figure, drawn once: a frame only
// chooses which pose is lit. A figure is solid ink with its eyes, its mouth
// and the creases between its parts cut out of it, as on a pocket game's
// display. All coordinates are stage units; the dog lives in the column over
// his cushion.

const D = Math.PI / 180
/** The middle of the dog's column. */
export const DOG_X = 650

export type Eyes = 'shut' | 'one' | 'half' | 'open' | 'wide' | 'dizzy' | 'glad' | 'follow' | 'plead'
export type Mouth = 'shut' | 'open' | 'yawn' | 'tongue' | 'bark'
/** Ears in degrees: 0 hangs straight down, more swings the ear outward and up. */
export type Head = { eyes: Eyes; mouth: Mouth; earL: number; earR: number }

const EYE_X = 28, EYE_Y = -16

const EAR = [-22, -8, 18, -12, 30, 40, 18, 98, -8, 102, -26, 50]
/** The same flap a little larger all round, for the gap that is cut round an ear before it is inked. */
const EAR_HALO = EAR.map((v, i) => (i % 2 === 0 ? v * 1.26 : (v - 45) * 1.12 + 45))

function ear(p: Pen, side: -1 | 1, angle: number, halo = false): void {
  p.at(side * 72, -36, () => p.blob(halo ? EAR_HALO : EAR), { turn: -side * angle * D, mirror: side < 0 })
}

function eye(p: Pen, x: number, kind: Exclude<Eyes, 'one'>): void {
  const y = EYE_Y
  if (kind === 'shut') p.line([x - 14, y, x, y + 9, x + 14, y], 5)
  else if (kind === 'glad') p.line([x - 14, y + 6, x, y - 8, x + 14, y + 6], 5)
  else if (kind === 'half') p.ell(x, y + 5, 15, 10)
  else if (kind === 'wide' || kind === 'plead') p.ell(x, y, 19, 22)
  else p.ell(x, y, 15, 18)
}

function pupil(p: Pen, x: number, kind: Exclude<Eyes, 'one'>, side: -1 | 1): void {
  const y = EYE_Y
  if (kind === 'open') p.ell(x, y + 2, 7, 8)
  else if (kind === 'half') p.ell(x, y + 7, 7, 6)
  else if (kind === 'wide') p.ell(x, y, 5, 5)
  else if (kind === 'plead') p.ell(x, y + 3, 12, 14)
  else if (kind === 'dizzy') p.ell(x - side * 6, y + side * 8, 6, 6)
}

/** The head about its own middle: a wide skull, a snout below, two long ears. */
export function head(p: Pen, o: Head): void {
  const left = o.eyes === 'one' ? 'shut' : o.eyes, right = o.eyes === 'one' ? 'open' : o.eyes
  const wideJaw = o.mouth === 'yawn' || o.mouth === 'bark'
  // A gap is cut all round the head first, so that it stands clear of the body behind it.
  p.cut(() => {
    ear(p, -1, o.earL, true)
    ear(p, 1, o.earR, true)
    p.ell(0, 0, 87, 73)
    p.ell(0, wideJaw ? 52 : 30, 59, wideJaw ? 53 : 47)
  })
  ear(p, -1, o.earL)
  ear(p, 1, o.earR)
  p.ell(0, 0, 80, 66)
  p.ell(0, 30, 52, 40)
  if (wideJaw) p.ell(0, 52, 52, 46)
  p.cut(() => {
    // Where a hanging ear lies over the cheek.
    if (Math.abs(o.earL) < 40) p.line([-50, -38, -46, 10, -50, 54], 5)
    if (Math.abs(o.earR) < 40) p.line([50, -38, 46, 10, 50, 54], 5)
    p.ell(0, 12, 14, 9)
    eye(p, -EYE_X, left)
    eye(p, EYE_X, right)
    if (o.mouth === 'shut') p.line([-16, 38, 0, 47, 16, 38], 5)
    else if (o.mouth === 'open') p.ell(0, 46, 20, 15)
    else if (o.mouth === 'yawn') p.ell(0, 54, 40, 36)
    else if (o.mouth === 'bark') p.ell(0, 56, 30, 28)
    else p.line([-18, 38, 0, 50, 18, 38], 5)
  })
  pupil(p, -EYE_X, left, -1)
  pupil(p, EYE_X, right, 1)
  if (o.mouth === 'yawn') p.ell(0, 72, 20, 13)
  // The tongue hangs over the dark of his chest, so it is cut out of the dark, with a crease down
  // from the mouth: a dark oval with a rim of light would read as a ring, and a ring as a numeral.
  if (o.mouth === 'tongue') {
    p.cut(() => p.blob([-11, 50, 21, 50, 23, 80, 5, 98, -13, 80]))
    p.line([5, 50, 5, 76], 4)
  }
  if (o.eyes === 'plead') p.cut(() => { p.ell(-EYE_X - 4, EYE_Y - 3, 4, 4); p.ell(EYE_X - 4, EYE_Y - 3, 4, 4) })
}

/** The body of the sleeping dog: a mound with the tail laid round its front and two paws under the chin. */
function mound(p: Pen, rise: number): void {
  p.ell(700, 630 - rise / 2, 152, 74 + rise / 2)
  p.cut(() => p.line([848, 646, 874, 694, 800, 716, 716, 706], 34))
  p.line([848, 646, 872, 692, 800, 712, 720, 704], 22)
  p.ell(508, 706, 34, 13)
  p.ell(590, 712, 34, 13)
  p.cut(() => {
    p.line([640, 590 - rise, 720, 576 - rise, 800, 600 - rise], 5)
    p.line([790, 690, 772, 640, 812, 600], 5)
  })
}

/** Curled up asleep on the cushion. `rise` is how far his side has risen with a breath. */
export function curl(p: Pen, rise: number): void {
  mound(p, rise)
  p.at(546, 650, () => head(p, { eyes: 'shut', mouth: 'shut', earL: 58, earR: 14 }), { turn: -14 * D, scale: 0.9 })
}

function doze(p: Pen, eyes: 'one' | 'shut'): void {
  mound(p, 0)
  p.at(548, 600, () => head(p, { eyes, mouth: 'shut', earL: 30, earR: 150 }), { turn: -6 * D, scale: 0.9 })
}

type Sitting = { head: Head; tilt?: number; paws?: 'down' | 'up'; hind?: readonly number[]; /** Where his head is, from where it sits when he is upright. */ headAt?: readonly [number, number] }

export function sit(p: Pen, o: Sitting): void {
  p.line([744, 664, 800, 654, 836, 612], 22)
  p.ell(DOG_X - 96, 652, 48, 44)
  p.ell(DOG_X + 96, 652, 48, 44)
  p.ell(DOG_X, 585, 100, 106)
  if (o.hind) {
    p.line(o.hind, 30)
    p.ell(o.hind[o.hind.length - 2], o.hind[o.hind.length - 1], 20, 16)
  }
  if (o.paws === 'up') {
    p.line([DOG_X - 36, 566, DOG_X - 62, 506], 34)
    p.line([DOG_X + 36, 566, DOG_X + 62, 506], 34)
    p.ell(DOG_X - 66, 498, 22, 20)
    p.ell(DOG_X + 66, 498, 22, 20)
    p.cut(() => { p.line([DOG_X - 40, 520, DOG_X - 22, 566], 5); p.line([DOG_X + 40, 520, DOG_X + 22, 566], 5) })
  } else {
    p.line([DOG_X - 34, 600, DOG_X - 36, 670], 40)
    p.line([DOG_X + 34, 600, DOG_X + 36, 670], 40)
    p.ell(DOG_X - 38, 682, 28, 14)
    p.ell(DOG_X + 38, 682, 28, 14)
    p.cut(() => { p.line([DOG_X, 606, DOG_X, 690], 9); p.line([DOG_X - 62, 630, DOG_X - 64, 690], 5); p.line([DOG_X + 62, 630, DOG_X + 64, 690], 5) })
  }
  p.at(DOG_X + (o.headAt?.[0] ?? 0), 432 + (o.headAt?.[1] ?? 0), () => head(p, o.head), { turn: (o.tilt ?? 0) * D })
}

type Standing = { head: Head; tilt?: number; tail?: number }

/** Where the standing dog's head is, which is where his pupils go. */
export const STAND_HEAD = { x: DOG_X, y: 390 }

export function stand(p: Pen, o: Standing): void {
  p.about(742, 566, () => p.line([742, 566, 792, 548, 832, 482], 24), { turn: (o.tail ?? 0) * D })
  p.ell(DOG_X - 92, 612, 44, 56)
  p.ell(DOG_X + 92, 612, 44, 56)
  p.ell(DOG_X, 542, 96, 110)
  p.line([DOG_X - 44, 588, DOG_X - 46, 666], 46)
  p.line([DOG_X + 44, 588, DOG_X + 46, 666], 46)
  p.ell(DOG_X - 50, 678, 32, 16)
  p.ell(DOG_X + 50, 678, 32, 16)
  p.cut(() => {
    p.line([DOG_X, 606, DOG_X, 690], 10)
    p.line([DOG_X - 76, 636, DOG_X - 74, 688], 5)
    p.line([DOG_X + 76, 636, DOG_X + 74, 688], 5)
  })
  p.at(STAND_HEAD.x, STAND_HEAD.y, () => head(p, o.head), { turn: (o.tilt ?? 0) * D })
}

function coil(p: Pen): void {
  p.line([800, 636, 818, 566], 22)
  p.ell(722, 624, 72, 52)
  p.ell(DOG_X, 660, 176, 50)
  p.cut(() => p.line([660, 640, 700, 600, 760, 590], 5))
  p.at(580, 630, () => head(p, { eyes: 'wide', mouth: 'shut', earL: 55, earR: 55 }), { scale: 0.85 })
}

function leap(p: Pen): void {
  p.line([DOG_X, 340, DOG_X + 12, 404], 20)
  for (const side of [-1, 1] as const) {
    p.line([DOG_X + side * 50, 242, DOG_X + side * 128, 172], 34)
    p.ell(DOG_X + side * 134, 166, 22, 20)
    p.line([DOG_X + side * 44, 318, DOG_X + side * 108, 384], 34)
    p.ell(DOG_X + side * 114, 390, 22, 20)
  }
  // His body is one filled mass with the crease of his belly cut into it: never a ring.
  p.ell(DOG_X, 276, 88, 78)
  p.cut(() => p.line([DOG_X - 40, 296, DOG_X - 8, 318, DOG_X + 34, 304], 5))
  p.at(DOG_X, 184, () => head(p, { eyes: 'wide', mouth: 'open', earL: 140, earR: 140 }), { scale: 0.9 })
}

function land(p: Pen): void {
  for (const side of [-1, 1] as const) {
    p.line([DOG_X + side * 130, 664, DOG_X + side * 212, 642], 30)
    p.ell(DOG_X + side * 218, 640, 20, 16)
    p.line([DOG_X + side * 96, 694, DOG_X + side * 152, 716], 28)
    p.ell(DOG_X + side * 158, 718, 20, 14)
  }
  p.ell(DOG_X, 672, 204, 44)
  p.at(DOG_X, 612, () => head(p, { eyes: 'dizzy', mouth: 'tongue', earL: 88, earR: 88 }), { scale: 0.9 })
}

const AWAKE: Head = { eyes: 'follow', mouth: 'tongue', earL: 0, earR: 0 }
const SPINNING: Head = { eyes: 'wide', mouth: 'open', earL: 60, earR: 60 }

/** One quarter of a spin: the standing dog turned about his middle, a little smaller, and set where he clears the bed and the chest. */
function spin(p: Pen, degrees: number, dx: number): void {
  p.at(dx, 0, () => p.about(DOG_X, 700, () => p.about(DOG_X, 530, () => stand(p, { head: SPINNING }), { turn: degrees * D }), { scale: 0.9 }))
}

/** Facing the wall with the blanket over his head: a mound, a tail, and two ears that stick out of the blanket. */
function wall(p: Pen): void {
  p.blob([520, 706, 516, 610, 580, 556, 700, 540, 800, 566, 846, 640, 850, 706])
  p.line([848, 646, 874, 694, 800, 716, 716, 706], 22)
  p.cut(() => {
    p.line([548, 690, 600, 610, 700, 578, 800, 600], 5)
    p.line([560, 640, 640, 600, 740, 604], 5)
    p.line([848, 646, 872, 692, 800, 712, 720, 704], 5)
  })
  p.ell(566, 566, 20, 30, -0.5)
  p.ell(610, 548, 20, 30, 0.2)
}

/**
 * The dog who has eaten the pies: a ball with four short legs, a stub of a tail and his head on top. `roll` turns
 * the ball and its legs, in degrees.
 */
export function round(p: Pen, o: { head: Head; roll?: number; tilt?: number }): void {
  const cy = 574
  p.about(DOG_X, cy, () => {
    for (const [dx, dy, turn] of [[-70, 104, 20], [70, 104, -20], [-124, 36, 70], [124, 36, -70]]) p.ell(DOG_X + dx, cy + dy, 22, 30, turn * D)
    p.line([DOG_X + 104, cy - 50, DOG_X + 142, cy - 78], 20)
    p.ell(DOG_X, cy, 120, 118)
    p.cut(() => {
      p.line([DOG_X - 78, cy + 30, DOG_X, cy + 62, DOG_X + 78, cy + 30], 6)
      p.ell(DOG_X + 4, cy + 20, 7, 9)
    })
  }, { turn: (o.roll ?? 0) * D })
  p.at(DOG_X, cy - 142, () => head(p, o.head), { turn: (o.tilt ?? 0) * D, scale: 0.84 })
}

/**
 * Draws a pose of the dog, which is written about his own column with his feet on y 692, with his feet at `x`,
 * `footY` instead, scaled, and mirrored when he looks the other way.
 */
export function dogAt(p: Pen, x: number, footY: number, scale: number, picture: () => void, mirror = false): void {
  p.at(x, footY, () => p.at(-DOG_X, -692, picture), { scale, mirror })
}

const GLAD: Head = { eyes: 'open', mouth: 'tongue', earL: 0, earR: 0 }

/**
 * The dog as he is found in a room he has trotted or rolled into: sitting by the food with his tongue out,
 * barking, ducking, and round. The names start with `prefix`.
 */
export function visitor(prefix: string, x: number, footY: number, scale: number, mirror = false, clip?: { x: number; y: number; w: number; h: number }): Record<string, (p: Pen) => void> {
  const whole = (picture: (p: Pen) => void) => (p: Pen) => dogAt(p, x, footY, scale, () => picture(p), mirror)
  // In a room where he hides, only the part of him inside `clip` shows.
  const put = (picture: (p: Pen) => void) => (clip ? (p: Pen) => p.within(clip.x, clip.y, clip.w, clip.h, () => whole(picture)(p)) : whole(picture))
  return {
    [`${prefix}Sit`]: put((p) => sit(p, { head: GLAD, tilt: 8 })),
    [`${prefix}SitB`]: put((p) => sit(p, { head: { ...GLAD, earR: 34 }, tilt: 14 })),
    [`${prefix}In`]: put((p) => stand(p, { head: { eyes: 'glad', mouth: 'tongue', earL: 30, earR: 30 }, tail: 30 })),
    [`${prefix}Bark`]: put((p) => sit(p, { head: { eyes: 'glad', mouth: 'bark', earL: 26, earR: 26 }, tilt: -8 })),
    // He snaps at the fly: his head thrown up and forward with his jaws wide, and he misses.
    [`${prefix}Snap`]: put((p) => sit(p, { head: { eyes: 'open', mouth: 'bark', earL: 40, earR: 40 }, tilt: -20, headAt: [10, -14] })),
    [`${prefix}Duck`]: put((p) => sit(p, { head: { eyes: 'shut', mouth: 'shut', earL: -30, earR: -30 }, tilt: 0 })),
    [`${prefix}Beg`]: put((p) => sit(p, { head: { eyes: 'plead', mouth: 'shut', earL: 0, earR: 0 }, paws: 'up' })),
    [`${prefix}Round`]: put((p) => round(p, { head: { eyes: 'glad', mouth: 'tongue', earL: 0, earR: 0 } })),
    [`${prefix}RoundB`]: put((p) => round(p, { head: { eyes: 'shut', mouth: 'open', earL: 20, earR: 20 }, roll: 14, tilt: -8 })),
    [`${prefix}RoundC`]: put((p) => round(p, { head: { eyes: 'dizzy', mouth: 'open', earL: 70, earR: 70 }, roll: -160, tilt: 10 })),
  }
}

/** Every pose of the dog in the bedroom, by the name a frame lights it with. */
export const DOG: Record<string, (p: Pen) => void> = {
  dogWall: wall,
  dogRound: (p) => round(p, { head: { eyes: 'glad', mouth: 'tongue', earL: 0, earR: 0 } }),
  dogRoundB: (p) => round(p, { head: { eyes: 'shut', mouth: 'open', earL: 20, earR: 20 }, roll: 14, tilt: -8 }),
  dogRoundC: (p) => round(p, { head: { eyes: 'dizzy', mouth: 'open', earL: 70, earR: 70 }, roll: -160, tilt: 10 }),
  dogNose: (p) => { mound(p, 0); p.at(552, 640, () => head(p, { eyes: 'shut', mouth: 'shut', earL: 58, earR: 40 }), { turn: -30 * D, scale: 0.9 }) },
  dogCurlLow: (p) => curl(p, 0),
  dogCurlHigh: (p) => curl(p, 18),
  dogDoze: (p) => doze(p, 'one'),
  dogDozeShut: (p) => doze(p, 'shut'),
  dogSit: (p) => sit(p, { head: { eyes: 'half', mouth: 'shut', earL: 0, earR: 0 } }),
  dogYawn: (p) => sit(p, { head: { eyes: 'shut', mouth: 'yawn', earL: 12, earR: 12 }, tilt: -4 }),
  dogCoil: coil,
  dogLeap: leap,
  dogLand: land,
  dogShakeA: (p) => stand(p, { head: { eyes: 'shut', mouth: 'shut', earL: -62, earR: 74 }, tilt: -14, tail: -18 }),
  dogShakeB: (p) => stand(p, { head: { eyes: 'shut', mouth: 'shut', earL: 74, earR: -62 }, tilt: 14, tail: 30 }),
  dogStandA: (p) => stand(p, { head: AWAKE }),
  dogStandB: (p) => stand(p, { head: AWAKE, tail: 30 }),
  dogBark: (p) => {
    stand(p, { head: { eyes: 'glad', mouth: 'bark', earL: 26, earR: 26 }, tilt: -10, tail: -14 })
    p.ell(548, 334, 20, 9, -32 * D)
    p.ell(512, 292, 27, 12, -32 * D)
  },
  dogSpinA: (p) => spin(p, 90, -14),
  dogSpinB: (p) => spin(p, 180, 20),
  dogSpinC: (p) => spin(p, 270, 30),
  dogScratchA: (p) => sit(p, { head: { eyes: 'glad', mouth: 'tongue', earL: 0, earR: 30 }, tilt: 16, hind: [736, 662, 778, 566, 730, 478] }),
  dogScratchB: (p) => sit(p, { head: { eyes: 'glad', mouth: 'tongue', earL: 0, earR: 8 }, tilt: 16, hind: [736, 662, 784, 590, 744, 512] }),
  dogBeg: (p) => sit(p, { head: { eyes: 'plead', mouth: 'shut', earL: 0, earR: 0 }, paws: 'up' }),
  // Thrown up and a little to the right, clear of the foot of the big bed.
  dogBounce: (p) => p.at(54, -88, () => p.about(660, 648, () => curl(p, 0), { turn: 7 * D })),
  dogUpside: (p) => p.at(0, -8, () => p.about(660, 648, () => curl(p, 0), { turn: 180 * D })),
  dogPupL: (p) => pupils(p, -6),
  dogPupC: (p) => pupils(p, 0),
  dogPupR: (p) => pupils(p, 6),
  bubS: (p) => bubble(p, 590, 566, 10),
  bubM: (p) => bubble(p, 604, 540, 18),
  bubL: (p) => bubble(p, 622, 500, 30),
  bubPop: (p) => {
    p.ell(596, 472, 11, 5, 50 * D)
    p.ell(634, 458, 12, 5, -76 * D)
    p.ell(662, 494, 9, 4, -14 * D)
  },
}

function pupils(p: Pen, dx: number): void {
  p.ell(STAND_HEAD.x - EYE_X + dx, STAND_HEAD.y + EYE_Y + 2, 7, 8)
  p.ell(STAND_HEAD.x + EYE_X + dx, STAND_HEAD.y + EYE_Y + 2, 7, 8)
}

/** A snore bubble: a filled drop with its tail toward the nose and a glint cut in it, never a ring. */
function bubble(p: Pen, x: number, y: number, r: number): void {
  p.ell(x, y, r, r * 0.94)
  p.poly([x - r * 0.86, y + r * 0.42, x - r * 1.5, y + r * 1.5, x - r * 0.2, y + r * 0.92])
  p.cut(() => p.ell(x + r * 0.3, y - r * 0.34, r * 0.34, r * 0.2, 40 * D))
}

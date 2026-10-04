// The five visitors, the beetle that keeps the journal and the
// worm: natural-history drawings in pen and wash, each standing on the origin
// and facing left, towards the plants.
//
// Each creature is drawn in two parts. `body` is everything that holds still,
// and the page keeps it as a sprite. `live` is the little that moves at idle
// and says where the creature is looking: eye-stalks, feelers and pupils, a
// few pen strokes a frame. A pose leans the whole drawing about its feet,
// swells it with a breath and turns its eyes.

import { INK, WASH, curve, dot, hatch, oval, pen, seedOf, trace, wash, type Ctx, type Pt } from './ink'

export type Pose = {
  /** A lean about the feet, in radians: negative leans towards the plants. */
  lean: number
  /** Where the eyes look, in radians: 0 straight ahead, positive upwards. */
  look: number
  /** 0 to 1: one breath, which swells the body a little. */
  breath: number
  /** 0 to 1, round and round: the idle sway of feelers and eye-stalks. */
  sway?: number
  /**
   * The brow, which is the flat upper lid every creature has: 0 as it is drawn, deadpan; up to 1 lifted off the pupil,
   * wide-eyed (startled, or pleased); down to -1 lowered and slanted towards the face, cross. It is the one thing
   * about a face that changes, and it stays dry: no creature smiles.
   */
  mood?: number
}
export const AT_REST: Pose = { lean: 0, look: 0, breath: 0, sway: 0 }

export type CreatureKind = 'snail' | 'bee' | 'moth' | 'ladybird' | 'ant' | 'beetle' | 'worm'

export const TINT = { slug: '#9ea58c', shell: '#cb9a40', moth: '#a8937a', coat: '#e4532b', ant: '#6a4a36', wing: '#2f7263', worm: '#dc9282' } as const

/** The hand that draws one creature: every stroke gets the next seed, so a creature is the same drawing each time. */
export type Hand = {
  ctx: Ctx
  /** While set, nothing is drawn and every seed is still used up: a part left out leaves the rest of the drawing its lines. */
  off: boolean
  line(pts: readonly Pt[], w?: number, taper?: number): void
  fill(pts: readonly Pt[], colour: string, alpha?: number, rim?: number): void
  /** Clears what is under a shape, so the part drawn next stands in front. Only for a drawing kept as a sprite. */
  clear(pts: readonly Pt[]): void
  /** An eye's white: a cleared ring. The pupil is live. */
  eye(x: number, y: number, r: number): void
  /** With `skip` the legs are left out and their seeds still used up, so the rest of the drawing keeps its lines. */
  legs(sets: readonly (readonly Pt[])[], w?: number, skip?: boolean): void
  hatch(pts: readonly Pt[], o?: Parameters<typeof hatch>[2]): void
  dot(x: number, y: number, r: number): void
}

/** What of a body is drawn, as flags: without the legs that walk, without the part that moves, or that part alone. folk.ts draws the rest in motion. */
export const LEGLESS = 1, CORE = 2, PART = 4

export function hand(ctx: Ctx, lw: number, kind: CreatureKind, part: number): Hand {
  let seed = seedOf(kind.length * 31 + kind.charCodeAt(1), part)
  const self: Hand = {
    ctx, off: false,
    line: (pts, w = 1.2, taper = 0.15) => { const at = seed++; if (!self.off) pen(ctx, pts, { w: w * lw, seed: at, taper }) },
    fill: (pts, colour, alpha = 0.75, rim = 0.3) => { const at = seed++; if (!self.off) wash(ctx, pts, colour, { alpha, rim, seed: at, loose: 1.1 }) },
    hatch: (pts, o) => { if (!self.off) hatch(ctx, pts, o) },
    dot: (x, y, r) => { if (!self.off) dot(ctx, x, y, r) },
    clear: (pts) => {
      if (self.off) return
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      trace(ctx, pts, true)
      ctx.fill()
      ctx.restore()
    },
    eye: (x, y, r) => {
      const ring = oval(x, y, r, r, 0, 14)
      self.clear(ring)
      self.line(ring, 1.1, 0)
    },
    legs: (sets, w = 1.5, skip = false) => { for (const leg of sets) skip ? seed++ : self.line(leg, w, 0.12) },
  }
  return self
}

/** A pupil that looks along `look`, with a flat upper lid: the deadpan every creature shares. */
export function pupil(h: Hand, x: number, y: number, r: number, look: number, mood = 0): void {
  const wide = Math.max(0, Math.min(1, mood)), cross = Math.max(0, Math.min(1, -mood))
  // Wide-eyed, the pupil is a little smaller and sits lower in more white; cross, it sits under the lowered lid.
  h.dot(x - Math.cos(look) * r * 0.36, y + r * (0.2 + 0.08 * cross) - Math.sin(look) * r * 0.3, r * (0.44 - 0.08 * wide))
  // The lid: lifted for wide eyes, and for cross ones lower at the end that faces the way the creature looks.
  const front = y - r * (0.12 + 0.62 * wide - 0.5 * cross), back = y - r * (0.22 + 0.62 * wide + 0.22 * cross)
  h.line([[x - r * 1.2, front], [x + r * 1.15, back]], 1.5 + 0.5 * cross, 0.1)
  h.hatch([[x - r, y - r], [x + r, y - r], [x + r, Math.max(y - r, back + r * 0.02)], [x - r, Math.max(y - r, front + r * 0.02)]], { gap: 1.1, angle: 1.3, w: 0.55, alpha: 0.6 })
}

/** A feeler from its root: a springy curve that sways, with an optional club or comb at its tip. */
export function feeler(h: Hand, root: Pt, length: number, angle: number, sway: number, tip: 'plain' | 'club' | 'comb' | 'elbow' = 'plain'): void {
  const a = angle + Math.sin(sway * Math.PI * 2) * 0.14, bendTo = a + (tip === 'elbow' ? 0.9 : 0.35)
  const mid: Pt = [root[0] - Math.cos(a) * length * 0.55, root[1] - Math.sin(a) * length * 0.55]
  const end: Pt = [mid[0] - Math.cos(bendTo) * length * 0.45, mid[1] - Math.sin(bendTo) * length * 0.45]
  const path = tip === 'elbow' ? [root, mid, end] : curve([root, mid, end])
  h.line(path, 1.1, 0.05)
  if (tip === 'club') h.line(oval(end[0], end[1], 2.6, 1.7, bendTo, 8), 1.2, 0)
  if (tip === 'comb') for (let i = 2; i < path.length; i += 2) h.line([path[i], [path[i][0] + 1.5, path[i][1] - 4.5]], 0.8, 0.3)
}

/** A creature's drawing: its box, where it carries its wish sketch (the middle of the sketch's foot), and its two parts. */
type Drawing = { w: number; h: number; hold: Pt; body(h: Hand, mode?: number): void; live(h: Hand, pose: Pose, part?: number, part2?: number): void }

/** The outlines of the parts that move, which folk.ts lays bare paper under. */
export const OUTLINE = {
  rump: oval(17, -31, 19, 13.5, 0.22, 20), chest: oval(-6, -34, 11, 10, 0, 16),
  wing: curve([[-16, -30], [8, -40], [34, -30], [38, -8], [10, -4], [-12, -14]], true),
  coat: curve([[-17, -5], [-14, -22], [2, -31], [20, -22], [26, -5], [4, -3]], true),
  cases: curve([[-12, -44], [10, -52], [34, -44], [46, -24], [34, -13], [-8, -12], [-16, -26]], true),
}

const SNAIL: Drawing = {
  w: 136, h: 104, hold: [16, -72],
  body(h) {
    const foot = curve([[58, -1], [22, 0], [-26, 0], [-42, -5], [-49, -24], [-55, -46], [-49, -56], [-40, -50], [-35, -30], [-22, -15], [8, -10], [40, -7]], true)
    h.fill(foot, TINT.slug, 0.8)
    h.line(foot, 1.35, 0)
    h.hatch([[54, -1], [-30, 0], [-46, -12], [-40, -16], [-24, -6], [50, -5]], { gap: 3.2, angle: -1.2, alpha: 0.55 })
    const shell = oval(14, -44, 33, 30, -0.35, 22)
    h.clear(shell)
    h.fill(shell, TINT.shell, 0.85)
    const coil: Pt[] = []
    for (let i = 0; i <= 44; i++) {
      const a = 0.5 + i * 0.3, r = 30 * Math.pow(1 - i / 52, 1.25)
      coil.push([10 + Math.cos(a) * r * 1.06 + i * 0.1, -43 + Math.sin(a) * r])
    }
    h.fill(coil.slice(0, 22), WASH.wood, 0.5, 0)
    h.line(shell, 1.45, 0)
    h.line(coil, 1.15, 0.1)
    // Growth ribs, each inside the outer whorl: from just under the coil's line inwards, and none across it. A rib through the line would be a small cross.
    for (let i = 0; i < 7; i++) {
      const a = 2.5 + i * 0.42, turn = (a - 0.5) / 0.3, r = 30 * Math.pow(1 - turn / 52, 1.25)
      const on = (rr: number, by: number): Pt => [10 + Math.cos(a + by) * rr * 1.06 + turn * 0.1, -43 + Math.sin(a + by) * rr]
      h.line(curve([on(r - 1.8, 0), on(r - 4.6, 0.07), on(r - 7.4, 0.06)]), 0.75, 0.3)
    }
    h.line([[-53, -36], [-46, -34.5]], 1.2, 0.2)
    h.line(curve([[-54, -41], [-60, -40], [-62, -36]]), 1, 0.1)
    for (let i = 0; i < 26; i++) h.dot(-44 + i * 3.6 + (i % 3), -4 - (i % 4) * 2.1 - Math.max(0, 6 - i) * 5, 0.5)
  },
  live(h, pose, part = 0, part2 = 0) {
    const sway = pose.sway ?? 0
    // A stalk that is pulled in is short, down to a stump with the eye on it.
    const stalks: [Pt, number, number][] = [[[-51, -55], 30 * (1 - 0.84 * part), 1.25 + pose.look * 0.5], [[-43, -53], 25 * (1 - 0.84 * part2), 1.9 + pose.look * 0.25]]
    stalks.forEach(([root, length, angle], i) => {
      const a = angle + Math.sin(sway * Math.PI * 2 + i * 1.9) * 0.1
      const mid: Pt = [root[0] - Math.cos(a) * length * 0.5 + 2, root[1] - Math.sin(a) * length * 0.5]
      const end: Pt = [root[0] - Math.cos(a) * length, root[1] - Math.sin(a) * length]
      h.line(curve([[root[0] - 1.6, root[1]], [mid[0] - 1.3, mid[1]], end, [mid[0] + 1.3, mid[1]], [root[0] + 1.6, root[1]]]), 1.1, 0.02)
      h.line(oval(end[0], end[1] - 2, 3.7, 3.7, 0, 12), 1.2, 0)
      pupil(h, end[0], end[1] - 2, 3.7, i === 0 ? pose.look : pose.look + 1.3, pose.mood)
    })
  },
}

const BEE: Drawing = {
  w: 84, h: 78, hold: [-2, -6],
  body(h, mode = 0) {
    h.off = mode > 1
    for (const [turn, long] of [[-0.95, 30], [-0.5, 25]]) {
      const wing = oval(4 + Math.cos(turn) * long * 0.55, -44 + Math.sin(turn) * long * 0.55, long * 0.56, 8.5, turn, 16)
      h.fill(wing, WASH.glass, 0.45, 0.4)
      h.line(wing, 0.9, 0)
      h.line([[2, -41], [4 + Math.cos(turn) * long * 0.9, -44 + Math.sin(turn) * long * 0.9]], 0.6, 0.3)
    }
    const rump = OUTLINE.rump
    h.off = (mode & CORE) > 0
    h.fill(rump, WASH.gold, 0.95)
    for (const x of [8, 17, 26]) {
      const band = curve([[x - 3, -44], [x + 1.5, -31], [x, -18], [x + 6.5, -19], [x + 8, -31], [x + 3.5, -44]], true)
      h.ctx.save(); trace(h.ctx, rump, true); h.ctx.clip()
      h.fill(band, INK, 0.75, 0)
      h.hatch(band, { gap: 1.7, angle: 1.3, w: 0.8 })
      h.ctx.restore()
    }
    h.line(rump, 1.35, 0)
    h.line([[35, -27], [41, -24]], 1.3, 0.3)
    const chest = OUTLINE.chest
    h.off = (mode & PART) > 0
    h.clear(chest)
    h.fill(chest, WASH.gold, 0.7)
    h.fill(chest, WASH.wood, 0.45, 0)
    for (let i = 0; i < 16; i++) { const a = i * 0.39; h.line([[-6 + Math.cos(a) * 9.5, -34 + Math.sin(a) * 8.6], [-6 + Math.cos(a) * 13, -34 + Math.sin(a) * 12]], 0.8, 0.4) }
    const head = oval(-20, -32, 8, 8.6, 0, 14)
    h.clear(head)
    h.fill(head, INK, 0.5)
    h.line(head, 1.3, 0)
    h.eye(-23, -34, 3.4)
    h.legs([[[-10, -25], [-14, -17], [-11, -11]], [[-4, -24], [-5, -15], [-1, -9]], [[4, -24], [8, -15], [13, -10]]], 1.3)
  },
  live(h, pose) {
    pupil(h, -23, -34, 3.4, pose.look, pose.mood)
    feeler(h, [-24, -40], 13, 1.0, pose.sway ?? 0, 'elbow')
    feeler(h, [-20, -41], 12, 1.35, (pose.sway ?? 0) + 0.3, 'elbow')
  },
}

const MOTH: Drawing = {
  w: 84, h: 62, hold: [12, -38],
  body(h, mode = 0) {
    const wing = OUTLINE.wing
    h.off = (mode & CORE) > 0
    h.fill(wing, TINT.moth, 0.8)
    h.fill(curve([[2, -36], [18, -37], [22, -6], [8, -5]], true), WASH.wood, 0.5, 0)
    h.line(wing, 1.3, 0)
    h.hatch(wing, { gap: 4.2, angle: 0.25, alpha: 0.45 })
    h.line(curve([[-12, -24], [10, -22], [36, -18]]), 0.8, 0.2)
    const head = oval(-20, -24, 7.5, 7, 0, 12)
    h.off = (mode & PART) > 0
    h.clear(head)
    h.fill(head, TINT.moth, 0.9)
    h.line(head, 1.25, 0)
    for (let i = 0; i < 9; i++) { const a = 1.2 + i * 0.5; h.line([[-20 + Math.cos(a) * 7, -24 + Math.sin(a) * 6.5], [-20 + Math.cos(a) * 10.5, -24 + Math.sin(a) * 10]], 0.8, 0.4) }
    h.eye(-23, -25, 3.4)
    h.legs([[[-14, -15], [-18, -7], [-22, 0]], [[-4, -9], [-5, -3], [-9, 0]], [[12, -5], [15, -1], [12, 0]]], 1.1)
  },
  live(h, pose) {
    pupil(h, -23, -25, 3.4, pose.look, pose.mood)
    feeler(h, [-23, -30], 22, 1.0, pose.sway ?? 0, 'comb')
    feeler(h, [-19, -31], 21, 1.5, (pose.sway ?? 0) + 0.4, 'comb')
  },
}

/** The legs of the two that walk, as they stand: hip, knee and foot. */
export const LADYBIRD_LEGS: readonly (readonly Pt[])[] = [[[-10, -6], [-15, -3], [-17, 0]], [[2, -5], [2, -2], [5, 0]], [[14, -6], [19, -3], [22, 0]]]
export const ANT_LEGS: readonly (readonly Pt[])[] = [[[-9, -18], [-17, -24], [-24, 0]], [[-4, -17], [-3, -26], [4, 0]], [[1, -17], [12, -27], [22, 0]]]

const LADYBIRD: Drawing = {
  w: 70, h: 50, hold: [4, -30],
  body(h, mode = 0) {
    h.legs(LADYBIRD_LEGS, 1.3, mode > 0)
    const coat = OUTLINE.coat
    h.off = (mode & CORE) > 0
    h.fill(coat, TINT.coat, 0.95)
    h.line(coat, 1.4, 0)
    h.line(curve([[-3, -30], [3, -17], [5, -4]]), 0.9, 0.15)
    for (const [x, y, r] of [[-7, -16, 3.6], [11, -20, 4.2], [16, -9, 3.2], [1, -8, 2.6]]) h.dot(x, y, r)
    const head = oval(-20, -10, 7, 7.5, 0, 12)
    h.off = (mode & PART) > 0
    h.clear(head)
    h.fill(head, INK, 0.6)
    h.line(head, 1.3, 0)
    h.eye(-23, -12, 3.2)
  },
  live(h, pose) {
    pupil(h, -23, -12, 3.2, pose.look, pose.mood)
    feeler(h, [-24, -16], 9, 0.9, pose.sway ?? 0, 'club')
    feeler(h, [-21, -17], 9, 1.4, (pose.sway ?? 0) + 0.5, 'club')
  },
}

const ANT: Drawing = {
  w: 74, h: 52, hold: [-10, -34],
  body(h, mode = 0) {
    h.legs(ANT_LEGS, 1.35, mode > 0)
    for (const [part, alpha] of [[oval(15, -20, 12, 8.5, 0.25, 14), 0.9], [oval(-3, -18, 8.5, 5, -0.1, 12), 0.8], [oval(-18, -22, 7.5, 7, 0, 12), 0.85]] as const) {
      h.clear(part)
      h.fill(part, TINT.ant, alpha)
      h.line(part, 1.3, 0)
    }
    h.hatch(oval(15, -20, 12, 8.5, 0.25, 14), { gap: 3, angle: 1.3, alpha: 0.5 })
    h.line(curve([[-24, -18], [-27, -15], [-25, -12]]), 1, 0.2)
    h.eye(-20, -24, 3.2)
  },
  live(h, pose) {
    pupil(h, -20, -24, 3.2, pose.look, pose.mood)
    feeler(h, [-21, -29], 16, 0.7, pose.sway ?? 0, 'elbow')
    feeler(h, [-17, -29], 15, 1.1, (pose.sway ?? 0) + 0.35, 'elbow')
  },
}

/** The beetle's legs as they stand: the two back legs, its funniest part, two in front, and the two that hide behind the others until all six are going. */
const BACK: readonly (readonly Pt[])[] = [[[18, -20], [34, -38], [44, -14], [52, 0], [57, -1]], [[8, -17], [20, -30], [26, -8], [31, 0], [36, -1]]]
const FRONT: readonly (readonly Pt[])[] = [[[-10, -16], [-14, -6], [-10, 0], [-15, 0]], [[-24, -20], [-36, -12], [-44, -16]]]
const MIDDLE: readonly (readonly Pt[])[] = [[[0, -14], [5, -6], [1, 0], [-4, 0]], [[-17, -17], [-23, -8], [-20, 0], [-25, 0]]]

const BEETLE: Drawing = {
  w: 116, h: 88, hold: [10, -52],
  body(h, mode = 0) {
    h.legs(BACK, 2, (mode & 5) > 0)
    h.legs(FRONT, 1.6, (mode & 5) > 0)
    const cases = OUTLINE.cases
    h.off = (mode & CORE) > 0
    h.fill(cases, TINT.wing, 0.95)
    h.fill(curve([[8, -50], [34, -43], [45, -24], [34, -14], [22, -15], [30, -30]], true), INK, 0.3, 0)
    h.line(cases, 1.5, 0)
    for (let i = 0; i < 4; i++) h.line(curve([[-8 + i * 5, -44 - i * 1.6], [10 + i * 8, -40 + i * 3], [28 + i * 4, -15]]), 0.8, 0.2)
    const shield = curve([[-14, -44], [-27, -40], [-33, -27], [-27, -15], [-12, -13], [-15, -28]], true)
    h.off = (mode & PART) > 0
    h.clear(shield)
    h.fill(shield, TINT.wing, 0.8)
    h.fill(shield, WASH.gold, 0.35, 0)
    h.line(shield, 1.45, 0)
    const head = oval(-38, -26, 8.5, 9, 0, 14)
    h.clear(head)
    h.fill(head, INK, 0.55)
    h.line(head, 1.4, 0)
    h.line(curve([[-45, -22], [-50, -21], [-49, -17]]), 1.2, 0.15)
    h.eye(-40, -29, 3.5)
  },
  live(h, pose) {
    pupil(h, -40, -29, 3.5, pose.look, pose.mood)
    feeler(h, [-42, -35], 17, 0.75, pose.sway ?? 0, 'club')
    feeler(h, [-37, -36], 16, 1.25, (pose.sway ?? 0) + 0.45, 'club')
  },
}

const WORM: Drawing = {
  w: 44, h: 44, hold: [0, -34],
  body(h) {
    const spine = curve([[2, 4], [3.5, -7], [1.5, -17], [-5, -24.5], [-14, -26]], false, 2), out: Pt[] = [], back: Pt[] = []
    spine.forEach(([x, y], i) => {
      const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)], long = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      const r = 5.4 - (i / spine.length) * 0.9, nx = (-(b[1] - a[1]) / long) * r, ny = ((b[0] - a[0]) / long) * r
      out.push([x + nx, y + ny]); back.push([x - nx, y - ny])
    })
    const tube = [...out, [-18.6, -27.6] as const, [-18.8, -24.4] as const, ...back.reverse()]
    h.fill(tube, TINT.worm, 0.9)
    h.fill([...out.slice(9, 15), ...back.slice(-15, -9)], TINT.coat, 0.45, 0)
    h.line(tube, 1.25, 0.02)
    for (let i = 3; i < spine.length - 3; i += 2) h.line([out[i], [(out[i][0] + spine[i][0]) / 2, (out[i][1] + spine[i][1]) / 2]], 0.7, 0.3)
  },
  live(h, pose) {
    for (const [x, y] of [[-12.5, -28.6], [-16.2, -27.4]]) {
      h.dot(x - Math.cos(pose.look) * 0.5, y - Math.sin(pose.look) * 0.5, 1.25)
      h.line([[x - 2, y - 1.7], [x + 2, y - 2.1]], 1, 0.1)
    }
  },
}

export const CREATURES: Record<CreatureKind, Drawing> = { snail: SNAIL, bee: BEE, moth: MOTH, ladybird: LADYBIRD, ant: ANT, beetle: BEETLE, worm: WORM }

/** Leans and swells whatever is drawn next about the origin, as the pose says. */
export function applyPose(ctx: Ctx, pose: Pose): void {
  ctx.rotate(pose.lean)
  ctx.scale(1 - 0.012 * pose.breath, 1 + 0.03 * pose.breath)
}

/** The still part of a creature at scale `s`, for a sprite. `mode` leaves out what is drawn in motion: `true` or LEGLESS the legs, CORE the part that moves; PART draws that part alone. */
export function drawBody(ctx: Ctx, kind: CreatureKind, s: number, mode: number | boolean = 0): void {
  ctx.save()
  ctx.scale(s, s)
  CREATURES[kind].body(hand(ctx, (0.55 + 0.45 * s) / s, kind, 1), Number(mode))
  ctx.restore()
}

/**
 * The beetle's legs in motion, over a legless body. `phase` runs 0 to 1 for one turn of each leg. On its feet the four
 * it stands on step, and at phase 0 stand as they are drawn at rest. On its back (`air`) all six go round above its
 * belly: a thigh to a knee that bows towards the tail on a back leg and towards the head on the others, a shin, a toe.
 */
export function drawLegs(ctx: Ctx, s: number, phase: number, air: boolean): void {
  const h = hand(ctx, (0.55 + 0.45 * s) / s, 'beetle', 4)
  ctx.save()
  ctx.scale(s, s)
  ;(air ? [...BACK, ...MIDDLE, ...FRONT] : [...BACK, ...FRONT]).forEach((leg, i) => {
    const back = i < 2, rest = i % 2 ? Math.PI * 2 - 0.4 : Math.PI + 0.4, a = rest + phase * Math.PI * 2, [hx, hy] = leg[0], last = Math.max(1, leg.length - 2)
    if (air) {
      const reach = back ? 9 : 6, fx = hx + (back ? 15 : -5) + Math.cos(a + i) * reach, fy = (back ? 14 : 7) + Math.sin(a + i) * reach
      h.line([[hx, hy], [(hx + fx) / 2 + (back ? 12 : -6), (hy + fy) / 2 - 2], [fx, fy], [fx + (back ? 5 : -4), fy - 2.5]], back ? 2.2 : 1.7, 0.08)
    } else {
      const dx = (Math.cos(a) - Math.cos(rest)) * (back ? 6 : 4), dy = -4 * Math.max(0, Math.sin(a))
      h.line(leg.map(([x, y], j) => { const u = Math.min(1, j / last); return [x + dx * u * u, y + dy * u] as const }), back ? 2 : 1.6, 0.12)
    }
  })
  ctx.restore()
}

/** The moving part of a creature at scale `s`: call it inside `applyPose`, over the body. */
export function drawLive(ctx: Ctx, kind: CreatureKind, s: number, pose: Pose, part = 0, part2 = 0): void {
  ctx.save()
  ctx.scale(s, s)
  CREATURES[kind].live(hand(ctx, (0.55 + 0.45 * s) / s, kind, 2), pose, part, part2)
  ctx.restore()
}

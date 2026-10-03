// The five visitors, the beetle that keeps the journal, its loupe and the
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
}
export const AT_REST: Pose = { lean: 0, look: 0, breath: 0, sway: 0 }

export type CreatureKind = 'snail' | 'bee' | 'moth' | 'ladybird' | 'ant' | 'beetle' | 'worm'

const TINT = { slug: '#9ea58c', shell: '#cb9a40', moth: '#a8937a', coat: '#e4532b', ant: '#6a4a36', wing: '#2f7263', worm: '#dc9282' } as const

/** The hand that draws one creature: every stroke gets the next seed, so a creature is the same drawing each time. */
type Hand = {
  ctx: Ctx
  line(pts: readonly Pt[], w?: number, taper?: number): void
  fill(pts: readonly Pt[], colour: string, alpha?: number, rim?: number): void
  /** Clears what is under a shape, so the part drawn next stands in front. Only for a drawing kept as a sprite. */
  clear(pts: readonly Pt[]): void
  /** An eye's white: a cleared ring. The pupil is live. */
  eye(x: number, y: number, r: number): void
  legs(sets: readonly (readonly Pt[])[], w?: number): void
}

function hand(ctx: Ctx, lw: number, kind: CreatureKind, part: number): Hand {
  let seed = seedOf(kind.length * 31 + kind.charCodeAt(1), part)
  const self: Hand = {
    ctx,
    line: (pts, w = 1.2, taper = 0.15) => pen(ctx, pts, { w: w * lw, seed: seed++, taper }),
    fill: (pts, colour, alpha = 0.75, rim = 0.3) => wash(ctx, pts, colour, { alpha, rim, seed: seed++, loose: 1.1 }),
    clear: (pts) => {
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
    legs: (sets, w = 1.5) => { for (const leg of sets) self.line(leg, w, 0.12) },
  }
  return self
}

/** A pupil that looks along `look`, with a flat upper lid: the deadpan every creature shares. */
function pupil(h: Hand, x: number, y: number, r: number, look: number): void {
  dot(h.ctx, x - Math.cos(look) * r * 0.36, y + r * 0.2 - Math.sin(look) * r * 0.3, r * 0.44)
  h.line([[x - r * 1.2, y - r * 0.12], [x + r * 1.15, y - r * 0.22]], 1.5, 0.1)
  hatch(h.ctx, [[x - r, y - r], [x + r, y - r], [x + r, y - r * 0.2], [x - r, y - r * 0.1]], { gap: 1.1, angle: 1.3, w: 0.55, alpha: 0.6 })
}

/** A feeler from its root: a springy curve that sways, with an optional club or comb at its tip. */
function feeler(h: Hand, root: Pt, length: number, angle: number, sway: number, tip: 'plain' | 'club' | 'comb' | 'elbow' = 'plain'): void {
  const a = angle + Math.sin(sway * Math.PI * 2) * 0.14, bendTo = a + (tip === 'elbow' ? 0.9 : 0.35)
  const mid: Pt = [root[0] - Math.cos(a) * length * 0.55, root[1] - Math.sin(a) * length * 0.55]
  const end: Pt = [mid[0] - Math.cos(bendTo) * length * 0.45, mid[1] - Math.sin(bendTo) * length * 0.45]
  const path = tip === 'elbow' ? [root, mid, end] : curve([root, mid, end])
  h.line(path, 1.1, 0.05)
  if (tip === 'club') h.line(oval(end[0], end[1], 2.6, 1.7, bendTo, 8), 1.2, 0)
  if (tip === 'comb') for (let i = 2; i < path.length; i += 2) h.line([path[i], [path[i][0] + 1.5, path[i][1] - 4.5]], 0.8, 0.3)
}

/** A creature's drawing: its box, where it carries its wish sketch (the middle of the sketch's foot), and its two parts. */
type Drawing = { w: number; h: number; hold: Pt; body(h: Hand): void; live(h: Hand, pose: Pose): void }

const SNAIL: Drawing = {
  w: 136, h: 104, hold: [16, -72],
  body(h) {
    const foot = curve([[58, -1], [22, 0], [-26, 0], [-42, -5], [-49, -24], [-55, -46], [-49, -56], [-40, -50], [-35, -30], [-22, -15], [8, -10], [40, -7]], true)
    h.fill(foot, TINT.slug, 0.8)
    h.line(foot, 1.35, 0)
    hatch(h.ctx, [[54, -1], [-30, 0], [-46, -12], [-40, -16], [-24, -6], [50, -5]], { gap: 3.2, angle: -1.2, alpha: 0.55 })
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
    for (let i = 0; i < 7; i++) {
      const a = 2.5 + i * 0.42
      h.line(curve([[14 + Math.cos(a) * 31, -44 + Math.sin(a) * 28], [14 + Math.cos(a + 0.12) * 26, -44 + Math.sin(a + 0.12) * 23], [14 + Math.cos(a + 0.1) * 21, -44 + Math.sin(a + 0.1) * 19]]), 0.75, 0.3)
    }
    h.line([[-53, -36], [-46, -34.5]], 1.2, 0.2)
    h.line(curve([[-54, -41], [-60, -40], [-62, -36]]), 1, 0.1)
    for (let i = 0; i < 26; i++) dot(h.ctx, -44 + i * 3.6 + (i % 3), -4 - (i % 4) * 2.1 - Math.max(0, 6 - i) * 5, 0.5)
  },
  live(h, pose) {
    const sway = pose.sway ?? 0
    const stalks: [Pt, number, number][] = [[[-51, -55], 30, 1.25 + pose.look * 0.5], [[-43, -53], 25, 1.9 + pose.look * 0.25]]
    stalks.forEach(([root, length, angle], i) => {
      const a = angle + Math.sin(sway * Math.PI * 2 + i * 1.9) * 0.1
      const mid: Pt = [root[0] - Math.cos(a) * length * 0.5 + 2, root[1] - Math.sin(a) * length * 0.5]
      const end: Pt = [root[0] - Math.cos(a) * length, root[1] - Math.sin(a) * length]
      h.line(curve([[root[0] - 1.6, root[1]], [mid[0] - 1.3, mid[1]], end, [mid[0] + 1.3, mid[1]], [root[0] + 1.6, root[1]]]), 1.1, 0.02)
      h.line(oval(end[0], end[1] - 2, 3.7, 3.7, 0, 12), 1.2, 0)
      pupil(h, end[0], end[1] - 2, 3.7, i === 0 ? pose.look : pose.look + 1.3)
    })
  },
}

const BEE: Drawing = {
  w: 84, h: 78, hold: [-2, -6],
  body(h) {
    for (const [turn, long] of [[-0.95, 30], [-0.5, 25]]) {
      const wing = oval(4 + Math.cos(turn) * long * 0.55, -44 + Math.sin(turn) * long * 0.55, long * 0.56, 8.5, turn, 16)
      h.fill(wing, WASH.glass, 0.45, 0.4)
      h.line(wing, 0.9, 0)
      h.line([[2, -41], [4 + Math.cos(turn) * long * 0.9, -44 + Math.sin(turn) * long * 0.9]], 0.6, 0.3)
    }
    const rump = oval(17, -31, 19, 13.5, 0.22, 20)
    h.fill(rump, WASH.gold, 0.95)
    for (const x of [8, 17, 26]) {
      const band = curve([[x - 3, -44], [x + 1.5, -31], [x, -18], [x + 6.5, -19], [x + 8, -31], [x + 3.5, -44]], true)
      h.ctx.save(); trace(h.ctx, rump, true); h.ctx.clip()
      h.fill(band, INK, 0.75, 0)
      hatch(h.ctx, band, { gap: 1.7, angle: 1.3, w: 0.8 })
      h.ctx.restore()
    }
    h.line(rump, 1.35, 0)
    h.line([[35, -27], [41, -24]], 1.3, 0.3)
    const chest = oval(-6, -34, 11, 10, 0, 16)
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
    pupil(h, -23, -34, 3.4, pose.look)
    feeler(h, [-24, -40], 13, 1.0, pose.sway ?? 0, 'elbow')
    feeler(h, [-20, -41], 12, 1.35, (pose.sway ?? 0) + 0.3, 'elbow')
  },
}

const MOTH: Drawing = {
  w: 84, h: 62, hold: [12, -38],
  body(h) {
    const wing = curve([[-16, -30], [8, -40], [34, -30], [38, -8], [10, -4], [-12, -14]], true)
    h.fill(wing, TINT.moth, 0.8)
    h.fill(curve([[2, -36], [18, -37], [22, -6], [8, -5]], true), WASH.wood, 0.5, 0)
    h.line(wing, 1.3, 0)
    hatch(h.ctx, wing, { gap: 4.2, angle: 0.25, alpha: 0.45 })
    h.line(curve([[-12, -24], [10, -22], [36, -18]]), 0.8, 0.2)
    const head = oval(-20, -24, 7.5, 7, 0, 12)
    h.clear(head)
    h.fill(head, TINT.moth, 0.9)
    h.line(head, 1.25, 0)
    for (let i = 0; i < 9; i++) { const a = 1.2 + i * 0.5; h.line([[-20 + Math.cos(a) * 7, -24 + Math.sin(a) * 6.5], [-20 + Math.cos(a) * 10.5, -24 + Math.sin(a) * 10]], 0.8, 0.4) }
    h.eye(-23, -25, 3.4)
    h.legs([[[-14, -15], [-18, -7], [-22, 0]], [[-4, -9], [-5, -3], [-9, 0]], [[12, -5], [15, -1], [12, 0]]], 1.1)
  },
  live(h, pose) {
    pupil(h, -23, -25, 3.4, pose.look)
    feeler(h, [-23, -30], 22, 1.0, pose.sway ?? 0, 'comb')
    feeler(h, [-19, -31], 21, 1.5, (pose.sway ?? 0) + 0.4, 'comb')
  },
}

const LADYBIRD: Drawing = {
  w: 70, h: 50, hold: [4, -30],
  body(h) {
    h.legs([[[-10, -6], [-15, -3], [-17, 0]], [[2, -5], [2, -2], [5, 0]], [[14, -6], [19, -3], [22, 0]]], 1.3)
    const coat = curve([[-17, -5], [-14, -22], [2, -31], [20, -22], [26, -5], [4, -3]], true)
    h.fill(coat, TINT.coat, 0.95)
    h.line(coat, 1.4, 0)
    h.line(curve([[-3, -30], [3, -17], [5, -4]]), 0.9, 0.15)
    for (const [x, y, r] of [[-7, -16, 3.6], [11, -20, 4.2], [16, -9, 3.2], [1, -8, 2.6]]) dot(h.ctx, x, y, r)
    const head = oval(-20, -10, 7, 7.5, 0, 12)
    h.clear(head)
    h.fill(head, INK, 0.6)
    h.line(head, 1.3, 0)
    h.eye(-23, -12, 3.2)
  },
  live(h, pose) {
    pupil(h, -23, -12, 3.2, pose.look)
    feeler(h, [-24, -16], 9, 0.9, pose.sway ?? 0, 'club')
    feeler(h, [-21, -17], 9, 1.4, (pose.sway ?? 0) + 0.5, 'club')
  },
}

const ANT: Drawing = {
  w: 74, h: 52, hold: [-10, -34],
  body(h) {
    h.legs([[[-9, -18], [-17, -24], [-24, 0]], [[-4, -17], [-3, -26], [4, 0]], [[1, -17], [12, -27], [22, 0]]], 1.35)
    for (const [part, alpha] of [[oval(15, -20, 12, 8.5, 0.25, 14), 0.9], [oval(-3, -18, 8.5, 5, -0.1, 12), 0.8], [oval(-18, -22, 7.5, 7, 0, 12), 0.85]] as const) {
      h.clear(part)
      h.fill(part, TINT.ant, alpha)
      h.line(part, 1.3, 0)
    }
    hatch(h.ctx, oval(15, -20, 12, 8.5, 0.25, 14), { gap: 3, angle: 1.3, alpha: 0.5 })
    h.line(curve([[-24, -18], [-27, -15], [-25, -12]]), 1, 0.2)
    h.eye(-20, -24, 3.2)
  },
  live(h, pose) {
    pupil(h, -20, -24, 3.2, pose.look)
    feeler(h, [-21, -29], 16, 0.7, pose.sway ?? 0, 'elbow')
    feeler(h, [-17, -29], 15, 1.1, (pose.sway ?? 0) + 0.35, 'elbow')
  },
}

const BEETLE: Drawing = {
  w: 116, h: 88, hold: [10, -52],
  body(h) {
    h.legs([[[18, -20], [34, -38], [44, -14], [52, 0], [57, -1]], [[8, -17], [20, -30], [26, -8], [31, 0], [36, -1]]], 2)
    h.legs([[[-10, -16], [-14, -6], [-10, 0], [-15, 0]], [[-24, -20], [-36, -12], [-44, -16]]], 1.6)
    const cases = curve([[-12, -44], [10, -52], [34, -44], [46, -24], [34, -13], [-8, -12], [-16, -26]], true)
    h.fill(cases, TINT.wing, 0.95)
    h.fill(curve([[8, -50], [34, -43], [45, -24], [34, -14], [22, -15], [30, -30]], true), INK, 0.3, 0)
    h.line(cases, 1.5, 0)
    for (let i = 0; i < 4; i++) h.line(curve([[-8 + i * 5, -44 - i * 1.6], [10 + i * 8, -40 + i * 3], [28 + i * 4, -15]]), 0.8, 0.2)
    const shield = curve([[-14, -44], [-27, -40], [-33, -27], [-27, -15], [-12, -13], [-15, -28]], true)
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
    pupil(h, -40, -29, 3.5, pose.look)
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
      dot(h.ctx, x - Math.cos(pose.look) * 0.5, y - Math.sin(pose.look) * 0.5, 1.25)
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

/** The still part of a creature at scale `s`, for a sprite. */
export function drawBody(ctx: Ctx, kind: CreatureKind, s: number): void {
  ctx.save()
  ctx.scale(s, s)
  CREATURES[kind].body(hand(ctx, (0.55 + 0.45 * s) / s, kind, 1))
  ctx.restore()
}

/** The moving part of a creature at scale `s`: call it inside `applyPose`, over the body. */
export function drawLive(ctx: Ctx, kind: CreatureKind, s: number, pose: Pose): void {
  ctx.save()
  ctx.scale(s, s)
  CREATURES[kind].live(hand(ctx, (0.55 + 0.45 * s) / s, kind, 2), pose)
  ctx.restore()
}

/** The loupe, its rim standing on the origin: a brass ring round a glass, and a turned handle. `turn` rolls it. */
export function drawLoupe(ctx: Ctx, s: number, turn: number): void {
  const h = hand(ctx, (0.55 + 0.45 * s) / s, 'beetle', 3)
  ctx.save()
  ctx.scale(s, s)
  ctx.translate(0, -27)
  ctx.rotate(turn)
  const grip = curve([[24, -4], [34, -5.5], [58, -6.5], [63, 0], [58, 6.5], [34, 5.5], [24, 4]], true)
  h.fill(grip, WASH.wood, 0.95)
  h.line(grip, 1.3, 0)
  hatch(ctx, grip, { gap: 4, angle: 1.45, alpha: 0.5 })
  const rim = oval(0, 0, 27, 27, 0, 28), glass = oval(0, 0, 21.5, 21.5, 0, 24)
  h.fill(rim, WASH.brass, 0.95)
  h.clear(glass)
  h.fill(glass, WASH.glass, 0.5, 0.5)
  h.line(rim, 1.5, 0)
  h.line(glass, 1.2, 0)
  h.line(curve([[-15, -6], [-11, -13], [-4, -16]]), 1, 0.3)
  h.line(curve([[-16, 1], [-15, -2]]), 0.9, 0.3)
  h.fill([[22, -5], [29, -6], [29, 6], [22, 5]], WASH.brass, 0.9, 0)
  h.line([[26, -5.5], [26, 5.5]], 1, 0.1)
  ctx.restore()
}

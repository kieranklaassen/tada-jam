// The visitors and the beetle on the page: at rest, and in motion.
//
// At rest a creature is its kept drawing and the little that moves at idle
// (creatures.ts). In motion it is drawn from `live` (live.ts): feet at a point,
// lifted, turned about the middle of its body, mirrored when it faces away,
// with its two parts and its legs or wings where the numbers put them. What
// keeps its shape stays a kept drawing: a part that swings is the body's own
// drawing cut in two and laid turned. A piece in motion is laid over its own
// shape in bare paper, so that the washes of two pieces never show through
// each other and a visitor on a plant hides what is behind it. Only what
// changes shape is drawn each frame, in a few pen strokes: legs, beating
// wings, a tongue.
//
// A visitor's wish is a scrap on a dry stalk, a plant label that stands in the
// wish's own place just behind it. It comes and goes with the visitor. Where
// the visitor has a fuller wish, that is a second sketch rolled under its arm,
// which unrolls up over the first.

import { ANT_LEGS, CORE, CREATURES, LADYBIRD_LEGS, LEGLESS, OUTLINE, PART, TINT, applyPose, drawBody, drawLegs, drawLive, hand, type CreatureKind, type Pose } from './creatures'
import { beetleHome } from './hit'
import { INK, PAPER, WASH, curve, hash as hashOf, oval, pen, trace, type Ctx, type Pt } from './ink'
import type { Layout, PotPlace } from './layout'
import type { Live, VisitorLive } from './live'
import type { Look } from './plant'
import { WISH_SLANT, paintRoll, paintWish } from './specimen'
import type { PageView, VisitorKind } from './spikePage'
import { goldDust, pencilGround, type Easel, type Sprite } from './stage'
import { loupeOf, solidOf } from './tools'
import { BITE, visitorSpot, waitingSpot, SAT } from './walker'

const TAU = Math.PI * 2
const clamp = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)
const lineOf = (s: number) => (0.55 + 0.45 * s) / s
/** What lies under a part that lifts: a kept drawing of its own, laid before the part. */
const UNDER = 8
/** A fuller wish is drawn this much larger than the first. */
const BIG = 1.1
/** Where each visitor tucks its rolled sketch, in its own drawing's measure. */
const ARM: Record<VisitorKind, Pt> = { snail: [-34, -14], bee: [-13, -9], moth: [-13, -5], ladybird: [-15, -4], ant: [-15, -6] }
/** Where each visitor's label stands behind it, in its own drawing's measure: how far behind its feet, where the stalk goes in behind its back, and where it shows again under its belly. */
const STALK: Record<VisitorKind, readonly [x: number, top: number, under: number]> = { snail: [12, -71, 0], bee: [12, -42, -19], moth: [10, -38, -5], ladybird: [3, -29, -4], ant: [15, -27, -12] }
/** The white of each eye, which a body's kept drawing leaves bare: a body laid as a solid has it filled in. */
const EYE: Partial<Record<CreatureKind, readonly [number, number, number]>> = { bee: [-23, -34, 3.4], moth: [-23, -25, 3.4], ladybird: [-23, -12, 3.2], ant: [-20, -24, 3.2], beetle: [-40, -29, 3.5] }

/** The belly of the ladybird and of the beetle, which shows when the wing cases lift. */
function belly(ctx: Ctx, kind: CreatureKind, s: number): void {
  const h = hand(ctx, lineOf(s), kind, 5), lady = kind === 'ladybird'
  const shape = lady ? oval(4, -10.5, 15, 5.5, 0.03, 16) : curve([[-10, -32], [8, -38], [30, -34], [42, -23], [32, -14.5], [-7, -13.5], [-12, -24]], true)
  ctx.save()
  ctx.scale(s, s)
  h.fill(shape, INK, 0.5)
  if (!lady) h.fill(shape, TINT.wing, 0.4, 0)
  h.line(shape, 1.2, 0)
  for (let i = 0; i < 4; i++) h.line(lady ? curve([[-5 + i * 6, -15], [-3.5 + i * 6, -10.5], [-5 + i * 6, -6]]) : curve([[i * 10, -36 + i], [3 + i * 10, -25], [1 + i * 9, -14]]), 0.7, 0.2)
  ctx.restore()
}

/** A creature's kept drawing at scale `s`: whole, or by the flags of creatures.ts less its legs, less its moving part, or that part alone. `solid` gives its shape in bare paper instead. */
function piece(e: Easel, kind: CreatureKind, s: number, mode = 0, solid = false): Sprite {
  const { w, h } = CREATURES[kind], x = -w * 0.62 * s, y = -h * 1.12 * s, eye = EYE[kind]
  if (!solid) return e.sprite(`body ${kind} ${mode ? `${mode} ` : ''}${s.toFixed(3)}`, x, y, w * 1.24 * s, h * 1.24 * s, (on) => (mode === UNDER ? belly(on, kind, s) : drawBody(on, kind, s, mode)))
  // The white of an eye is bare in the drawing, and is filled in in its shape.
  return solidOf(e, `${kind} ${mode} ${s.toFixed(3)}`, piece(e, kind, s, mode), eye && !(mode & PART) && mode !== UNDER ? (on) => { on.beginPath(); on.arc(eye[0] * s, eye[1] * s, eye[2] * s, 0, TAU); on.fill() } : undefined)
}

/** Lays a piece of a creature in motion, turned about a point of the drawing and narrowed there: first its shape in bare paper, then the piece. */
function lay(e: Easel, kind: CreatureKind, s: number, mode = 0, about: Pt = [0, 0], turn = 0, wide = 1): void {
  const { ctx } = e
  ctx.save()
  ctx.translate(about[0] * s, about[1] * s)
  ctx.rotate(turn)
  ctx.scale(wide || 0.02, 1)
  ctx.translate(-about[0] * s, -about[1] * s)
  e.put(piece(e, kind, s, mode, true), 0, 0, 'source-over')
  e.put(piece(e, kind, s, mode), 0, 0)
  ctx.restore()
}

/** Pen strokes in the creature's own units, over what is there. */
function inked(ctx: Ctx, s: number, draw: () => void): void {
  ctx.save()
  ctx.scale(s, s)
  ctx.globalCompositeOperation = 'source-over'
  draw()
  ctx.restore()
}

/** A thin flat wash for a part that is drawn each frame: a wing in the air. */
function tinted(ctx: Ctx, pts: readonly Pt[], colour: string, alpha: number): void {
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha *= alpha
  ctx.fillStyle = colour
  trace(ctx, pts, true)
  ctx.fill()
  ctx.restore()
}

const turned = (pts: readonly Pt[], about: Pt, a: number): Pt[] => pts.map(([x, y]) => [about[0] + (x - about[0]) * Math.cos(a) - (y - about[1]) * Math.sin(a), about[1] + (x - about[0]) * Math.sin(a) + (y - about[1]) * Math.cos(a)])

/** Legs stepping: each foot goes round a low loop, alternate legs half a turn apart; at phase 0 every leg stands as it is drawn. `stay` holds a leg's foot down, 1 fully. */
function stepping(legs: readonly (readonly Pt[])[], phase: number, stride: number, rise: number, stay: (leg: number) => number = () => 0): Pt[][] {
  return legs.map((leg, i) => {
    const rest = i % 2 ? TAU - 0.4 : Math.PI + 0.4, a = rest + phase * TAU, free = 1 - stay(i), dx = (Math.cos(a) - Math.cos(rest)) * stride * free, dy = -rise * Math.max(0, Math.sin(a)) * free
    return leg.map(([x, y], j) => { const u = j / (leg.length - 1); return [x + dx * u * u, y + dy * u] as const })
  })
}

/** The thin wings under a pair of wing cases, and the far case, hinged at `at` and lifted by `lift` radians. */
function underCases(ctx: Ctx, kind: 'ladybird' | 'beetle', s: number, at: Pt, long: number, lift: number, wings: readonly number[]): void {
  inked(ctx, s, () => {
    const h = hand(ctx, lineOf(s), kind, 6), far = turned(kind === 'beetle' ? OUTLINE.cases : OUTLINE.coat, at, -lift * 1.28)
    tinted(ctx, far, kind === 'beetle' ? TINT.wing : TINT.coat, 0.6)
    h.line(far, 1.1, 0)
    for (const a of wings) {
      const wing = oval(at[0] + Math.cos(a) * long * 0.52, at[1] + Math.sin(a) * long * 0.52, long * 0.52, long * 0.15, a, 18)
      tinted(ctx, wing, WASH.glass, 0.5)
      h.line(wing, 0.8, 0)
      h.line([at, [at[0] + Math.cos(a) * long * 0.9, at[1] + Math.sin(a) * long * 0.9]], 0.55, 0.3)
    }
  })
}

type Mover = (e: Easel, s: number, v: VisitorLive) => void

/** Each visitor in motion, standing on the origin and already turned and posed: what its two parts and its legs or wings do. */
const MOVERS: Record<VisitorKind, Mover> = {
  /** Its eye-stalks pull in, the near one by `part` and the far one by `part2`, and the edge of its foot ripples from tail to head. */
  snail(e, s, v) {
    const { ctx } = e
    lay(e, 'snail', s)
    ctx.globalCompositeOperation = 'source-over'
    drawLive(ctx, 'snail', s, v.pose, clamp(v.part), clamp(v.part2))
    inked(ctx, s, () => {
      const edge: Pt[] = []
      for (let x = 55; x >= -41; x -= 3) edge.push([x, 1.1 + 1.6 * Math.sin((v.legs + x / 30) * TAU)])
      hand(ctx, lineOf(s), 'snail', 6).line(edge, 1.15, 0.15)
    })
  },
  /** Its rump swings by `part`, its nose tips down by `part2`, and its wings beat: a few strokes more when it is in the air. */
  bee(e, s, v) {
    const { ctx } = e, beat = Math.sin(v.legs * TAU), swing = Math.max(-1, Math.min(1, v.part))
    ctx.translate(0, -32 * s)
    ctx.rotate(-0.62 * clamp(v.part2))
    ctx.translate(0, 32 * s)
    inked(ctx, s, () => {
      const h = hand(ctx, lineOf(s), 'bee', 1)
      for (const [turn, long] of [[-0.95, 30], [-0.5, 25]]) {
        const wing = (a: number) => oval(4 + Math.cos(a) * long * 0.55, -44 + Math.sin(a) * long * 0.55, long * 0.56, 8.5, a, 16), a = turn + 0.65 * beat
        if (v.lift > 1) for (const off of [-0.55, 0.5]) pen(ctx, wing(a + off * (1 - 0.4 * beat)), { w: 0.6 * lineOf(s), seed: 7 + long, taper: 0.3, alpha: 0.6 })
        h.fill(wing(a), WASH.glass, 0.45, 0.4)
        h.line(wing(a), 0.9, 0)
        h.line([[2, -41], [4 + Math.cos(a) * long * 0.9, -44 + Math.sin(a) * long * 0.9]], 0.6, 0.3)
      }
    })
    lay(e, 'bee', s, PART, [3, -33], 0.55 * swing, 1 - 0.1 * Math.abs(swing))
    lay(e, 'bee', s, CORE)
    ctx.globalCompositeOperation = 'source-over'
    drawLive(ctx, 'bee', s, v.pose)
  },
  /** Its near wing swings forward over its head by `part`, like a page turned, until only wings show; its tongue unrolls by `part2`; both wings lift with a flutter. */
  moth(e, s, v) {
    const { ctx } = e, fold = clamp(v.part), out = clamp(v.part2), beat = Math.sin(v.legs * TAU)
    lay(e, 'moth', s, PART, [-12, -22], -0.3 * Math.max(0, beat))
    lay(e, 'moth', s, CORE)
    ctx.globalCompositeOperation = 'source-over'
    drawLive(ctx, 'moth', s, v.pose)
    if (out > 0.01) inked(ctx, s, () => {
      // So much of the tongue hangs straight, and the rest is still wound up at its end.
      const long = 34, down = long * out, wound = long - down, r = 0.6 + wound / 10, tip: Pt = [-27 - 2 * Math.sin(down / 9), -20.5 + down], path: Pt[] = []
      for (let d = 0; d < down; d += 3) path.push([-27 - 2 * Math.sin(d / 9), -20.5 + d])
      for (let a = 0; a <= wound / 2.4; a += 0.4) { const far = r * (1 - 0.75 * (a / (wound / 2.4 + 0.4))); path.push([tip[0] - r + Math.cos(a) * far, tip[1] + Math.sin(a) * far]) }
      hand(ctx, lineOf(s), 'moth', 6).line(path.length > 1 ? path : [[-27, -20.5], tip], 1.15, 0.05)
    })
    if (fold > 0 || beat !== 0) lay(e, 'moth', s, PART, [-12 + 14 * fold, -22], 0.14 * beat * (1 - fold), 1 - 2 * fold)
  },
  /** Its wing cases pop open by `part`, the thin wings under them; it rears up on its back legs by `part2`; its legs walk. */
  ladybird(e, s, v) {
    const { ctx } = e, open = clamp(v.part), rear = clamp(v.part2), hinge: Pt = [-13, -20]
    ctx.translate(22 * s, 0)
    ctx.rotate(0.8 * rear)
    ctx.translate(-22 * s, 0)
    inked(ctx, s, () => hand(ctx, lineOf(s), 'ladybird', 1).legs(stepping(LADYBIRD_LEGS, v.legs, 3.2, 2.6, (leg) => (leg === 2 ? rear : 0)), 1.3))
    lay(e, 'ladybird', s, UNDER)
    if (open > 0) underCases(ctx, 'ladybird', s, hinge, 40, open, [-0.5 * open, -0.24 * open])
    lay(e, 'ladybird', s, PART, hinge, -0.95 * open)
    lay(e, 'ladybird', s, CORE | LEGLESS)
    ctx.globalCompositeOperation = 'source-over'
    drawLive(ctx, 'ladybird', s, v.pose)
  },
  /** Its front legs go up overhead by `part`, as under a load, and it rises a little on the others; its knees give by `part2` and its body sinks; its legs walk. */
  ant(e, s, v) {
    const { ctx } = e, up = clamp(v.part), give = clamp(v.part2), drop = 8 * give, tip = 0.3 * up
    const at = (p: Pt): Pt => { const [x, y] = turned([p], [14, -19], tip)[0]; return [x, y + drop] }
    inked(ctx, s, () => {
      const h = hand(ctx, lineOf(s), 'ant', 1), legs = stepping(ANT_LEGS, v.legs, 5, 4, (leg) => (leg === 0 ? up : 0)).map((leg, i) => {
        const hip = at(ANT_LEGS[i][0]), knee: Pt = [leg[1][0] + (i ? 5 : -5) * give, leg[1][1] + drop * 0.7 + (hip[1] - drop - ANT_LEGS[i][0][1]) * 0.6]
        // The front leg becomes an arm: elbow out in front of its head, hand cupped above it.
        return i === 0 && up > 0 ? [hip, mix(knee, at([-24, -34]), up), mix(leg[2], at([-18, -50]), up)] : [hip, knee, leg[2]]
      })
      // Its other front leg comes up beside the first, and each ends in a flat hand under the load.
      if (up > 0) legs.push([at([-5, -18]), mix(at([-8, -21]), at([3, -35]), up), mix(at([-12, -17]), at([-3, -50]), up)])
      h.legs(legs, 1.35)
      // Each hand is cupped under the load: a level bar on the end of an arm would read as a sign.
      if (up > 0.5) for (const arm of [legs[0], legs[3]]) h.line(curve([[arm[2][0] - 4, arm[2][1] - 2.2], [arm[2][0], arm[2][1] + 0.8], [arm[2][0] + 4, arm[2][1] - 2.2]]), 1.4, 0.1)
    })
    ctx.translate(0, drop * s)
    lay(e, 'ant', s, LEGLESS, [14, -19], tip)
    ctx.translate(14 * s, -19 * s)
    ctx.rotate(tip)
    ctx.translate(-14 * s, 19 * s)
    ctx.globalCompositeOperation = 'source-over'
    drawLive(ctx, 'ant', s, v.pose)
  },
}

const mix = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/** A creature at rest: its kept drawing leant and swollen by the pose, and its live strokes over it. `more` draws on top, in the same pose. */
export function creature(e: Easel, kind: CreatureKind, x: number, y: number, s: number, pose: Pose, mode = 0, more?: () => void, solid = false): void {
  const { ctx } = e
  ctx.save()
  ctx.translate(x, y)
  applyPose(ctx, pose)
  // One that stands in front of something is laid over its own shape in bare paper first, so that it is not seen through.
  if (solid) e.put(piece(e, kind, s, mode, true), 0, 0, 'source-over')
  e.put(piece(e, kind, s, mode), 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  drawLive(ctx, kind, s, pose)
  more?.()
  e.mark()
  ctx.restore()
}

/** A visitor in motion, from `live`: feet at (x, y) raised by `lift`, turned about the middle of its body, mirrored when it faces away. */
function mover(e: Easel, v: VisitorLive, s: number): void {
  const { ctx } = e, mid = CREATURES[v.kind].h * 0.42 * s
  ctx.save()
  ctx.translate(v.x, v.y - v.lift)
  // One that is on its way between two places is drawn from the kept drawings of its place, scaled: a size of its own each frame would make them all again each frame.
  const zoom = v.s && s > 0 ? v.s / s : 1
  if (zoom !== 1) ctx.scale(zoom, zoom)
  if (v.away) ctx.scale(-1, 1)
  // Sat down: lower and broader on its feet. The house leans it back and lifts its eyes.
  if (v.sat) ctx.scale(1 + SAT.wide * v.sat, 1 - SAT.low * v.sat)
  if (v.turn) {
    ctx.translate(0, -mid)
    ctx.rotate(v.turn)
    ctx.translate(0, mid)
  }
  applyPose(ctx, v.pose)
  MOVERS[v.kind](e, s, v)
  // Dust that was let go on it lies on its back for a while, gold; water stands on it in drops until it has shaken dry.
  if (v.gold) speckle(ctx, v.kind, s, v.gold, false)
  if (v.wet) speckle(ctx, v.kind, s, v.wet, true)
  e.mark()
  ctx.restore()
}

/** Specks lying on a visitor's back, in its own drawing's measure: gold dust, or drops of water. More lie high on it than down its sides. */
function speckle(ctx: Ctx, kind: VisitorKind, s: number, amount: number, wet: boolean): void {
  const d = CREATURES[kind], count = Math.round(clamp(amount) * (wet ? 14 : 40))
  ctx.globalCompositeOperation = 'source-over'
  for (let tone = 0; tone < 2; tone++) {
    ctx.fillStyle = wet ? (tone ? 'rgba(255,255,255,0.75)' : 'rgba(96,150,190,0.8)') : tone ? '#9a6a10' : WASH.gold
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      if (!wet && (i % 5 === 3 ? 1 : 0) !== tone) continue
      const high = hashOf(71 + (wet ? 9 : 0), i) ** 1.5, y = -d.h * (0.88 - 0.5 * high), half = d.w * 0.3 * Math.sqrt(Math.max(0.05, 1 - (1 - high * 1.4) ** 2)), x = d.w * 0.04 + (hashOf(72, i) * 2 - 1) * half
      const r = wet ? (tone ? 0.7 : 2.1 + 1.2 * hashOf(73, i)) : 0.9 + 1.3 * hashOf(73, i)
      const px = (x + (wet && tone ? -0.6 : 0)) * s, py = (y + (wet && tone ? -0.7 : 0)) * s
      ctx.moveTo(px + r * s, py)
      ctx.arc(px, py, r * s, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

/** The size of the sketch that one who waits at the edge holds open over its head, against the label it becomes; and the size the first visitor of a page holds it at, which waits larger and nearer. */
export const PLACARD = 0.62, PLACARD_FIRST = 0.85

/** The size of the sketch a visitor of the size `s` holds over its head: the larger the visitor waits, the larger its sketch, up to the first visitor's. */
export function placardSize(layout: Layout, kind: VisitorKind, s: number): number {
  const full = visitorSpot(layout, kind).s, edge = waitingSpot(layout, kind).s, first = waitingSpot(layout, kind, true).s
  return PLACARD + (PLACARD_FIRST - PLACARD) * (first > edge ? clamp((s - edge) / (first - edge)) : 0) * (full > 0 ? 1 : 0)
}

/** Where a visitor holds its sketch up: the foot of the scrap, just over its head. `x` and `y` are its feet, less any lift, and `s` its size. */
export function placardAt(layout: Layout, kind: VisitorKind, x: number, y: number, s: number): { x: number; y: number } {
  return { x: x + 2 * s, y: y - CREATURES[kind].h * s - 5 * layout.k }
}

/** The kept drawing of a wish scrap at a share of the label's size: its point is the foot of the scrap, by the tape. */
function wishSheet(e: Easel, layout: Layout, wish: Partial<Look>, count: number, by: number): Sprite {
  const scrap = layout.wish, k = e.k
  return e.sprite(`wish ${JSON.stringify(wish)} ${count} ${by}`, -scrap.w * by, -scrap.h * by, scrap.w * 1.5 * by, (scrap.h + 24 * k) * by, (on) => paintWish(on, { wish, count }, { x: 0, y: 0, w: scrap.w * by, h: scrap.h * by }, k * by))
}

/** A stalk of dry straw between two heights at `x`. */
function straw(ctx: Ctx, k: number, x: number, from: number, to: number, w = 1): void {
  if (to - from < 2) return
  tinted(ctx, [[x - 1.5 * k * w, from], [x + 1.5 * k * w, from], [x + 1.7 * k * w, to], [x - 1.7 * k * w, to]], '#d6bf7a', 0.9)
  for (const side of [-1, 1]) pen(ctx, [[x + side * 1.5 * k * w, from], [x + side * 1.6 * k * w + 0.5, (from + to) / 2], [x + side * 1.7 * k * w, to]], { w: 0.9, seed: 400 + side, taper: 0.03 })
}

/**
 * Where the visitor's label stands: the foot of its scrap, by the tape, and the ground under its stalk. It stays in
 * the wish's place. `carried` is how far a visitor on its way in still has it over its head, as it held it while it
 * waited: 1 at the edge, 0 where it stands, and the label is stuck in the ground.
 */
function labelOf(view: PageView, layout: Layout, live: Live | null) {
  const v = view.visitor, m = live?.visitor ?? null
  if (!v || v.settled) return null
  // The nearer of the two places a visitor can come in from: the first of a page waits on the visitors' own ground.
  const spot = visitorSpot(layout, v.kind), edge = waitingSpot(layout, v.kind, true), [behind, top, under] = STALK[v.kind], box = layout.wish
  const carried = m && edge.x > spot.x ? clamp((m.x - spot.x) / (edge.x - spot.x)) : 0
  // The scrap keeps inside the wish's place, which is where a finger looks for it.
  const home = { x: Math.min(spot.x + behind * spot.s, box.x + box.w - Math.min(box.w * 0.74, 108 * layout.k) / 2 + 2 * layout.k), y: layout.wish.y + layout.wish.h - 3 * layout.k }
  const held = m ? placardAt(layout, v.kind, m.x, m.y - m.lift, m.s ?? spot.s) : home
  return {
    v, m, carried, by: 1 - (1 - (m ? placardSize(layout, v.kind, m.s ?? spot.s) : 1)) * carried,
    x: home.x + (held.x - home.x) * carried, y: home.y + (held.y - home.y) * carried,
    // In the ground where the visitor stands; while it is carried, the stalk ends in the visitor's grip, at its back.
    ground: carried > 0 && m ? m.y - m.lift - CREATURES[v.kind].h * (m.s ?? spot.s) * 0.45 : spot.y,
    top: spot.y + top * spot.s, under: spot.y + under * spot.s, big: v.big ? clamp(live?.wish.big ?? 0) : 0,
  }
}

/** How the visitor's label hangs, in radians: crooked as it was stuck in the ground, which is the slant its scrap is drawn on (`WISH_SLANT`), and turned back to upright by the beetle. */
export const WISH_HANG = { askew: 0, true: -WISH_SLANT }

/**
 * The visitor's wish, laid before the plants so that a plant it is offered stands in front of it: the stalk, and on it
 * the scrap, which swings about its tape by `wish.shake`. A fuller wish unrolls up over the first by `wish.big`.
 * A visitor on its way in still holds it over its head, small, as it did at the edge; it grows to a label as the
 * visitor comes to its place and sticks it in the ground.
 */
export function drawWish(e: Easel, view: PageView, layout: Layout, live: Live | null): void {
  const label = labelOf(view, layout, live), { ctx, k } = e, scrap = layout.wish
  if (!label) return
  // The label hangs a little crooked as the visitor stuck it in the ground, and true once the beetle has put it straight:
  // the scrap is cut on a slant of its own (`paintWish`), which the straight label is turned back by.
  const askew = live?.wish.askew ?? 1, hang = WISH_HANG.askew * askew + WISH_HANG.true * (1 - askew)
  const { v, x, y, big, by } = label, tilt = hang + 0.13 * (live?.wish.shake ?? 0)
  // At rest the stalk goes in behind the visitor's back and shows again under its belly; a visitor in motion hides what it hides.
  ctx.globalCompositeOperation = 'source-over'
  if (label.m) straw(ctx, k, x, y, label.ground)
  else { straw(ctx, k, x, y, label.top); straw(ctx, k, x, label.under, label.ground) }
  // It is stuck in the ground: a short pencil line at its foot.
  if (label.carried === 0) pencilGround(ctx, x, label.ground - 1, 8 * k)
  e.mark()
  const sheet = (wish: Partial<Look>, size: number) => wishSheet(e, layout, wish, v.count, size)
  if (big < 1 && (tilt || by !== 1)) e.placed(x - 4 * k * by, y, tilt, by, by, () => e.put(sheet(v.wish, 1), 0, 0, 'source-over'))
  else if (big < 1) e.put(sheet(v.wish, 1), x - 4 * k, y, 'source-over')
  if (v.big && big > 0.2) e.placed(x - 4 * k * by, y, tilt, by, by, () => {
    const full = sheet(v.big!, BIG)
    if (big >= 1) e.put(full, 0, 0, 'source-over')
    else e.band(full, -((big - 0.2) / 0.8) * Math.min(scrap.h * 0.94, 190 * k) * BIG, full.y + full.h, 'source-over')
  })
}

/**
 * The visitor on the page with the plants it has kept and its rolled second sketch, and the visitor that waits at
 * the edge. Where each stands at rest and how big it is drawn come from the logic (walker.ts); one with an entry in
 * `live` is drawn from it, at that same size.
 */
export function drawVisitors(e: Easel, view: PageView, layout: Layout, live: Live | null, t: number): void {
  const { ctx, k } = e, sway = (t * 0.21) % 1, breath = 0.5 - 0.5 * Math.cos(t * 1.3), wait = layout.waiting
  const roll = (by: number) => e.sprite(`roll ${by}`, -22 * k * by, -10 * k * by, 44 * k * by, 20 * k * by, (on) => paintRoll(on, k * 1.25 * by))
  if (view.visitor) {
    const v = view.visitor, spot = visitorSpot(layout, v.kind), s = spot.s, m = live?.visitor ?? null, label = labelOf(view, layout, live)
    const x = m ? m.x : spot.x, y = m ? m.y - m.lift : spot.y, f = m?.away ? -1 : 1, given = v.given ?? [], row = layout.given
    if (given.length) {
      pencilGround(ctx, row.x + ((given.length - 1) * row.step) / 2, row.y, (given.length * row.step) / 2 + 5 * k)
      e.mark()
      given.forEach((look, i) => e.put(e.plant(look, layout.small), row.x + i * row.step, row.y))
      // The plant the snail has settled with is the one it ate from: the bite is out of the edge of its lowest leaf.
      if (v.kind === 'snail' && v.settled) {
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = PAPER
        ctx.beginPath()
        ctx.arc(row.x + (given.length - 1) * row.step + BITE.x * layout.small, row.y + BITE.y * layout.small, BITE.r * layout.small, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (m) mover(e, m, s)
    // With no live visitor (a still of the page at rest) the settled one is drawn sat down as the live one sits.
    else if (v.settled) e.placed(x, y, 0, 1 + SAT.wide, 1 - SAT.low, () => creature(e, v.kind, 0, 0, s, { lean: SAT.lean, look: SAT.look, breath: 0.5 - 0.5 * Math.cos(t * 0.8), sway: (t * 0.09) % 1 }))
    else creature(e, v.kind, x, y, s, { lean: -0.05, look: 0.15, breath: breath * 0.6, sway })
    if (label && v.big && label.big < 1) {
      // The second sketch waits rolled under its arm; opened, the roll goes up to the foot of the first and unrolls up over it.
      const [ax, ay] = ARM[v.kind], go = Math.min(1, label.big / 0.2), top = -Math.max(0, (label.big - 0.2) / 0.8) * Math.min(layout.wish.h * 0.94, 190 * k) * BIG
      const from = { x: x + f * ax * s, y: y + ay * s }, to = { x: label.x - 4 * k, y: label.y + top }
      e.placed(from.x + (to.x - from.x) * go, from.y + (to.y - from.y) * go, (-0.45 * f) * (1 - go) - 0.06 * go, 1 + 1.3 * go, 1 + 0.25 * go, () => e.put(roll(1.15), 0, 0, 'source-over'))
    }
  } else if (live?.visitor) mover(e, live.visitor, visitorSpot(layout, live.visitor.kind).s)
  if (view.waiting) {
    // With nobody on the page it is the first visitor, which waits on the visitors' own ground.
    const v = view.waiting, d = CREATURES[v.kind], spot = waitingSpot(layout, v.kind, !view.visitor && !live?.visitor), s = spot.s, m = live?.waiting ?? null
    // One that flies waits in the air and bobs; one that walks waits on a pencil line. Either holds its wish sketch open
    // over its head, turned to the child: a small scrap on a short stalk of straw, which it grips at its back.
    const flies = v.kind === 'bee' || v.kind === 'moth'
    const rest = spot.y + (flies ? Math.sin(t * 2.2) * 1.5 * k : 0), x = m ? m.x : spot.x, y = m ? m.y - m.lift : rest
    if (!flies) { pencilGround(ctx, spot.x, rest, Math.min(wait.w * 0.42, d.w * s * 0.6)); e.mark() }
    const held = placardAt(layout, v.kind, x, y, s), by = placardSize(layout, v.kind, s)
    ctx.globalCompositeOperation = 'source-over'
    straw(ctx, k, held.x, held.y, y - d.h * s * 0.45, 0.8)
    e.put(wishSheet(e, layout, v.wish, v.count, by), held.x - 4 * k * by, held.y, 'source-over')
    if (m) mover(e, m, s)
    else creature(e, v.kind, x, y, s, { lean: 0.04, look: 0, breath: 0.5 - 0.5 * Math.cos(t * 2.6), sway: (t * 0.6) % 1 })
  } else if (live?.waiting) mover(e, live.waiting, waitingSpot(layout, live.waiting.kind, !view.visitor && !live.visitor).s)
}

/**
 * The beetle, on its pencil line with its loupe beside it, and all it does: on its back with its legs going, gold with
 * dust, reared back for a sneeze, its wing cases held up as an umbrella with the thin wings under them, or dug into the
 * soil it stands on, cut off at the soil line. With the loupe in the hand, none lies beside it.
 */
export function drawBeetle(e: Easel, view: PageView, layout: Layout, live: Live | null, t: number, pots: readonly PotPlace[]): void {
  const { ctx } = e, home = beetleHome(layout), beside = view.beetle.at === 'pot' ? pots[view.beetle.pot] : null, { made: loupe, s, rim } = loupeOf(e, layout)
  const x = beside ? beside.x + 60 * s : home.x, y = beside ? beside.foot : home.y
  const idle: Pose = { lean: 0.03 * Math.sin(t * 0.5), look: -0.1, breath: 0.5 - 0.5 * Math.cos(t * 1.3), sway: (t * 0.21) % 1 }, b = live?.beetle
  pencilGround(ctx, x - 20 * s, y, 78 * s)
  e.mark()
  // The loupe rolls on its rim, away from the beetle for a turn that is counted up.
  if (!live?.loupe && !b?.loupe) e.put(loupe, x - 72 * s, y)
  else if (!live?.loupe && b) e.placed(x - 72 * s - b.loupe * rim, y - rim, -b.loupe, 1, 1, () => e.put(loupe, 0, rim))
  if (!b || !(b.at || b.flip || b.pedal || b.gold || b.sneeze || b.cases || b.sink || b.pose.lean || b.pose.look || b.pose.breath || b.pose.mood)) return creature(e, 'beetle', x, y, s, idle)
  // A pose that is all at rest leaves the beetle its idle breath; a sneeze rears it back about its back feet.
  const given = b.pose.lean || b.pose.look || b.pose.breath ? b.pose : { ...idle, mood: b.pose.mood }, flip = clamp(b.flip), legs = flip > 0 || b.at !== null || b.pedal !== 0
  const pose: Pose = { lean: given.lean, look: given.look + 0.7 * b.sneeze, breath: Math.max(given.breath, clamp(b.sneeze)), sway: given.sway || idle.sway, mood: b.pose.mood }
  const open = clamp(b.cases || 0), sink = clamp(b.sink || 0), bx = b.at?.x ?? x, by = b.at?.y ?? y, hinge: Pt = [-13, -38]
  ctx.save()
  if (sink > 0) {
    // Dug in, it is cut off at the soil: along the near edge of the pot's mouth, and level with the rim beside it.
    ctx.beginPath()
    ctx.rect(bx - 90 * s, by - 130 * s, 180 * s, 130 * s)
    ctx.ellipse(bx, by, 27 * e.k, 5.6 * e.k, 0, 0, Math.PI)
    ctx.clip()
  }
  // As it digs it draws itself in, so that what is left above the soil fits the pot.
  ctx.translate(bx + sink * 4 * s, by - Math.sin(Math.PI * flip) * 20 * s + sink * 41 * s)
  if (sink > 0) ctx.scale(1 - 0.5 * sink, 1)
  // On its way off the page it is turned about, its head towards the edge.
  if (b.turned) ctx.scale(-1, 1)
  if (flip > 0) {
    // Over onto its back about the middle of its body, lifted a little on the way, and not quite flat: its head stays off the ground.
    ctx.translate(10 * s, -26 * s)
    ctx.rotate((Math.PI - 0.12) * flip)
    ctx.translate(-10 * s, 26 * s)
  }
  ctx.translate(46 * s, 0)
  ctx.rotate(0.3 * clamp(b.sneeze))
  creature(e, 'beetle', -46 * s, 0, s, pose, (legs ? LEGLESS : 0) | (open > 0 ? CORE : 0), () => {
    if (legs) drawLegs(ctx, s, b.pedal, flip > 0.5)
    if (open > 0) {
      e.put(piece(e, 'beetle', s, UNDER), 0, 0)
      underCases(ctx, 'beetle', s, hinge, 66, open * 0.62, [0.17 - 0.2 * open, 0.3 - 0.1 * open])
      lay(e, 'beetle', s, PART, hinge, -0.62 * open)
    }
    if (b.gold > 0) goldDust(ctx, s, b.gold)
  }, b.at !== null)
  ctx.restore()
}

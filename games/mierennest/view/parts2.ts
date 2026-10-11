import { HIGHLIGHT } from './palette'
import { blob, bow, edged, enter, eyes, feeler, limb, line, mouth, oval, place, shape, shine, toLocal, TONGUE } from './parts'
import type { Ctx, Face, Held, Legs, Look, P, Stance } from './parts'

// Two more body plans built from the shared brushes: the ant's, and at the foot of the file the fly's.

// The ant plan: rump, waist and head in a row with six legs under the waist. The child's ant, the workers and
// the raiders are all built on it. The kingdom's ants are round all over, with a round rump and soft feelers that
// end in a bobble; a raider is long and low, with a rump that ends in a point, banded like a wasp, a spiked helmet
// over a dark mask, elbowed feelers and pale hooked jaws. The two can be told by colour and by outline both.

/** What only a raider wears: the helmet, its shaded brim, the mask and the bands of the rump, the tint of its eyes. */
export type Gear = { helmet: string; brim: string; mask: string; eye: string }
/** The build of one kind of ant: its colours (the body and its shaded side, the dark edge of legs and feelers and
 *  their lit core, the jaws), the half width and half height of rump, waist and head, the size of its eye and the
 *  thickness of its legs. A blush on the cheek and a neckerchief [cloth, shade] are the child's ant's. */
export type AntBuild = {
  body: string; dark: string; leg: string; lit: string; jaw: string
  ab: P; th: P; hd: P; eye: number; limb: number
  cheek?: string; scarf?: readonly [string, string]; spark?: boolean; gear?: Gear
}
/** A pose. A body part is [x, y, turn]; a leg is [footX, footY, kneeDx, kneeDy, sharp], near legs from back to
 *  front; `feel` is how far the tips of the feelers reach from the brow, and their curl, and `flick` moves the tip
 *  of the near one alone; `puff` swells or flattens the rump; `tails` turns the two ends of a neckerchief down. */
export type AntPose = { ab: readonly number[]; th: readonly number[]; hd: readonly number[]; legs: Legs; far?: Legs; feel: readonly number[]; flick?: P; puff?: number; tails?: number; face?: Face; held?: Held }

/** The raider's rump in its own frame: a drop that ends in a point behind, with two dark bands round it. */
function pointedRump(ctx: Ctx, a: AntBuild, rx: number, ry: number, band: string): void {
  const drop = (fill: string) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(rx * 0.95, 0)
    ctx.bezierCurveTo(rx * 0.9, -ry * 1.4, -rx * 0.4, -ry * 1.35, -rx * 1.22, -ry * 0.5)
    ctx.bezierCurveTo(-rx * 0.5, ry * 1.2, rx * 0.9, ry * 1.35, rx * 0.95, 0)
    ctx.fill()
  }
  const [ux, uy] = toLocal(ctx, 0, -1)
  drop(a.dark)
  ctx.save()
  ctx.clip()
  ctx.translate(ux * ry * 0.22, uy * ry * 0.22)
  drop(a.body)
  for (const k of [-0.5, 0.08]) line(ctx, band, rx * 0.2, [k * rx + 3, -ry * 1.5, k * rx - 3, 0, k * rx + 3, ry * 1.5], true)
  ctx.restore()
  bow(ctx, HIGHLIGHT, 2, rx * 0.34, -ry * 0.1, rx * 0.4, ry * 0.62, 0, -2.4, -1.5)
}

/** The raider's helmet in the frame of its head: a dome with a brim that sits low over the eyes, and a spike. */
function helmet(ctx: Ctx, g: Gear, rx: number, ry: number): void {
  const rim = -ry * 0.5
  shape(ctx, g.helmet, [-rx * 0.42, -ry * 1.2, rx * 0.12, -ry * 1.24, -rx * 0.3, -ry * 2.05])
  ctx.fillStyle = g.helmet
  ctx.beginPath()
  ctx.moveTo(-rx * 1.04, rim + 1.5)
  ctx.bezierCurveTo(-rx * 1.1, -ry * 1.62, rx * 0.72, -ry * 1.66, rx * 0.98, rim - 0.5)
  ctx.closePath()
  ctx.fill()
  line(ctx, g.brim, 3.4, [-rx * 1.12, rim + 2, rx * 1.16, rim - 0.5])
  bow(ctx, HIGHLIGHT, 2, -rx * 0.1, rim, rx * 0.66, ry * 0.72, 0, -2.2, -1.5)
}

/** The child's ant's neckerchief, in a frame whose x runs from the waist to the head: a band round the neck, a
 *  point of cloth on the chest and, at the nape, a knot with two ends that fly out behind and flap. */
function neckerchief(ctx: Ctx, cloth: string, shade: string, h: number, tails: number, t: number): void {
  const flap = Math.sin(t * 5) * 1.6
  // One end of the cloth: a soft leaf from the knot to its tip and back.
  const end = (fill: string, pts: readonly number[]) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5])
    ctx.quadraticCurveTo(pts[6], pts[7], pts[8], pts[9])
    ctx.fill()
  }
  ctx.save()
  ctx.translate(0, -h)
  ctx.rotate(tails)
  end(shade, [-1, -2, -9, -14 + flap, -20, -10 + flap, -11, -1 + flap * 0.5, -2, 3])
  end(cloth, [-1, 0, -12, -5 - flap, -22, 4 - flap, -11, 10 - flap * 0.5, -1, 5])
  ctx.restore()
  shape(ctx, shade, [-4.6, -h * 0.2, 5.4, -h * 0.3, 2.4, h * 1.3])
  shape(ctx, cloth, [-4.4, -h, 3.6, -h - 0.6, 5.6, h * 0.42, -5, h * 0.5])
  line(ctx, shade, 1.3, [-3.2, -h * 0.5, -3.6, h * 0.4])
  oval(ctx, -0.5, -h, 3.6, 3.2, 0, cloth)
  line(ctx, HIGHLIGHT, 1.4, [1.6, -h * 0.5, 2.6, h * 0.1])
}

export function antFigure(ctx: Ctx, a: AntBuild, p: AntPose, look: Look, t: number): void {
  const g = a.gear
  const breath = Math.sin(t * 2.4) * 0.5
  const twitch = Math.sin(t * 3.1) * 2
  const [ax, ay, ar = 0] = p.ab
  const [tx, ty, tr = 0] = p.th
  const [hx, hy, hr = 0] = p.hd
  const hip = (i: number): P => {
    const lx = (i - 1) * a.th[0] * 0.55
    const ly = a.th[1] * (i === 1 ? 0.6 : 0.4)
    return [tx + lx * Math.cos(tr) - ly * Math.sin(tr), ty + lx * Math.sin(tr) + ly * Math.cos(tr)]
  }
  const leg = (l: readonly number[], i: number, core: string, dx: number) => {
    const [x0, y0] = hip(i)
    // A foot is given by the point of the ground it stands on, so its round end is lifted by its own radius.
    edged(ctx, a.leg, core, a.limb, x0 + dx, y0, l[0], l[1] - a.limb * 0.5, l[2] ?? 0, l[3] ?? -5, !!l[4])
  }
  // The far legs first, a little forward of the near ones and darker, then the body from the rump to the head.
  const far = p.far ?? p.legs.map((l) => [l[0] + a.limb * 1.2, l[1], l[2] ?? 0, l[3] ?? -5, l[4] ?? 0])
  far.forEach((l, i) => leg(l, i, a.dark, 2))
  ctx.save()
  ctx.translate(ax, ay)
  ctx.rotate(ar)
  const ry = a.ab[1] * (p.puff ?? 1) + breath
  if (g) pointedRump(ctx, a, a.ab[0], ry, g.mask)
  else {
    blob(ctx, 0, 0, a.ab[0], ry, 0, a.body, a.dark, false)
    // Two seams across the rump, each a bow that follows its roundness.
    for (const k of [-0.3, 0.22]) bow(ctx, a.dark, a.limb * 0.3, k * a.ab[0] + 4, -1, 5, ry * Math.sqrt(1 - k * k) * 0.86, 0, Math.PI * 0.55, Math.PI * 1.45)
    shine(ctx, 0, 0, a.ab[0], ry, 0)
  }
  ctx.restore()
  blob(ctx, tx, ty, a.th[0], a.th[1], tr, a.body, a.dark)
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(hr)
  antHead(ctx, a, p, look, twitch)
  ctx.restore()
  if (a.scarf) {
    // The neck is where the waist meets the head, and the cloth is tied square across it.
    const k = a.th[0] / (a.th[0] + a.hd[0])
    ctx.save()
    ctx.translate(tx + (hx - tx) * k, ty + (hy - ty) * k)
    ctx.rotate(Math.atan2(hy - ty, hx - tx))
    neckerchief(ctx, a.scarf[0], a.scarf[1], Math.min(a.th[1], a.hd[1]) * 1.06, p.tails ?? 0, t)
    ctx.restore()
  }
  p.held?.(ctx)
  p.legs.forEach((l, i) => leg(l, i, a.lit, 0))
}

/** The head of an ant in its own frame: feelers, jaws, the face, and on a raider the mask and the helmet. */
function antHead(ctx: Ctx, a: AntBuild, p: AntPose, look: Look, twitch: number): void {
  const f = p.face ?? {}
  const g = a.gear
  const [rx, ry] = a.hd
  const [fx, fy, curl = 0.3] = p.feel
  const [qx, qy] = p.flick ?? [0, 0]
  const w = a.limb * 0.62
  // A soft feeler with a bobble for the kingdom; for a raider a thin one with an elbow and a point.
  const feel = (x0: number, y0: number, x1: number, y1: number, core: string) => {
    if (!g) return feeler(ctx, a.leg, w, x0, y0, x1, y1, curl, core)
    const pts = [x0, y0, x0 + (x1 - x0) * 0.4 + (y1 - y0) * curl * 1.5, y0 + (y1 - y0) * 0.4 - (x1 - x0) * curl * 1.5, x1, y1]
    line(ctx, a.leg, w, pts)
    line(ctx, core, w * 0.4, pts)
  }
  const bx = g ? rx * 1.12 : rx * 0.5
  const by = g ? -ry * 0.46 : -ry * 0.7
  feel(bx, by, bx + fx + 6, by + fy + 3 + twitch, a.dark)
  // The jaws: two claws hinged at the mouth that swing apart, a little below the line of the head. The far one is
  // painted first, behind the head. A raider's are longer, and pale.
  const wide = f.jaws ?? 0.3
  const reach = rx * (0.6 + 0.12 * wide) * (g ? 1.35 : 1)
  const jaw = (s: number, back: number) => {
    ctx.save()
    ctx.translate(rx * 0.95 - back, ry * 0.45)
    ctx.rotate(0.3 + s * wide * 0.85)
    ctx.fillStyle = a.jaw
    ctx.strokeStyle = a.leg
    ctx.lineWidth = 1.2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-3, s * 2.6)
    ctx.quadraticCurveTo(reach * 0.62, s * reach * 0.5, reach, -s * reach * 0.12)
    ctx.quadraticCurveTo(reach * 0.5, s * reach * 0.1, -1, -s * 1.6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
  if (!f.hidden) jaw(-1, 1.5)
  blob(ctx, 0, 0, rx, ry, 0, a.body, a.dark, false)
  if (!g) shine(ctx, -rx * 0.3, 0, rx * 0.7, ry, 0)
  if (!f.hidden) jaw(1, 0)
  if (a.cheek) oval(ctx, -rx * 0.12, ry * 0.42, rx * 0.22, ry * 0.17, 0, a.cheek)
  mouth(ctx, rx * 0.52, ry * 0.58, rx * 0.5, f.mouth ?? 'smile')
  if (g) {
    // The mask: a dark band across both eyes, cut to the roundness of the head. The eyes sit low in it, the brim of
    // the helmet comes down over them, and what is shut or a brow is drawn pale so that it shows on the dark.
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.clip()
    line(ctx, g.mask, a.eye * 2.2, [-rx, -ry * 0.16, rx * 1.2, -ry * 0.12])
    ctx.restore()
    eyes(ctx, rx * 0.26, -ry * 0.08, a.eye, a.eye * 1.36, look, f, g.mask, g.mask, g.eye, { ink: g.eye })
    helmet(ctx, g, rx, ry)
  } else eyes(ctx, rx * 0.16, -ry * 0.36, a.eye, a.eye * 1.3, look, f, a.body, a.dark, undefined, { spark: a.spark })
  const nx = bx - rx * (g ? 0.14 : 0.4)
  const ny = by - ry * (g ? 0.1 : 0.15)
  feel(nx, ny, nx + fx + qx, ny + fy + qy - twitch, a.lit)
}

// The fly plan: a striped rump, a round chest, a head that is mostly eye, glassy wings and thin legs. The fly and
// the dung fly are built on it. Nothing of a fly reaches more than 62 above its feet: at rest the wings lie back
// along the body, and in flight their blur is a low fan behind the shoulder.

export type FlyBuild = { body: string; dark: string; wing: string; wingEdge: string; eye: string; goggles?: string; strap?: string }
/** A pose. `wings` at rest, dazed, folded flat on the back, or one of the two halves of a beat; `nod` tips the head
 *  on its neck. */
export type FlyPose = { at: Stance; wings: 'rest' | 'droop' | 'flat' | 'up' | 'down'; legs: Legs; far?: Legs; face?: Face; bump?: boolean; nod?: number }

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

export function flyFigure(ctx: Ctx, f: FlyBuild, p: FlyPose, look: Look, t: number): void {
  const face = p.face ?? {}
  const hips: readonly P[] = [[0, -15], [9, -13], [19, -15]]
  const legs = (list: Legs, colour: string, dx: number) =>
    list.forEach((l, i) => {
      const [x, y] = place(p.at, hips[i][0] + dx, hips[i][1])
      limb(ctx, colour, 3.4, x, y, l[0], l[1] - 1.8, l[2] ?? 0, l[3] ?? 0)
    })
  const beat = Math.sin(t * 40) * 0.08
  const wings = (near: boolean) => {
    // At rest the wings lie back along the body, the far one a little higher; dazed, one sticks up; folded flat,
    // both lie down along the rump.
    if (p.wings === 'rest' || p.wings === 'droop' || p.wings === 'flat') {
      const lift = p.wings === 'rest' ? [0.3, 0.1] : p.wings === 'droop' ? [0.42, -0.12] : [-0.14, -0.3]
      return wing(ctx, f, near ? 6 : 8, -38, near ? 55 : 50, 12, lift[near ? 1 : 0])
    }
    // In flight they are a blur: a glassy fan with two streaks in it, and the wing itself at one end of its beat,
    // above the back on the up stroke and across the rump on the down stroke.
    const up = p.wings === 'up'
    const from = Math.PI + (up ? 0 : -0.5)
    if (!near) {
      ctx.fillStyle = f.wing
      ctx.beginPath()
      ctx.moveTo(6, -38)
      ctx.arc(6, -38, 46, from, from + 0.42)
      ctx.closePath()
      ctx.fill()
      for (const r of [30, 39]) bow(ctx, HIGHLIGHT, 2, 6, -38, r, r, 0, from + 0.1 + beat, from + 0.32 + beat)
    }
    wing(ctx, f, 6, -38, 48, 8.5, (up ? 0.1 : -0.46) + (near ? beat : 0.2 - beat), true)
  }
  legs(p.far ?? p.legs.map((l) => [l[0] + 8, l[1], l[2] ?? 0, l[3] ?? 0]), f.dark, 5)
  enter(ctx, p.at)
  wings(false)
  blob(ctx, -22, -21, 25, 14 + Math.sin(t * 2.6) * 0.6, -0.1, f.body, f.dark, false)
  // Two dark stripes round the rump.
  for (const x of [-31, -18]) line(ctx, f.dark, 3.2, [x + 2, -33.5 + (x + 31) * 0.1, x - 3, -21, x + 1, -9], true)
  shine(ctx, -22, -21, 25, 14, -0.1)
  blob(ctx, 8, -27, 17, 17, 0, f.body, f.dark)
  wings(true)
  // The head on its neck: two short bristles, a round skull, and the eyes that are most of it.
  ctx.translate(22, -22)
  ctx.rotate(p.nod ?? 0)
  ctx.translate(-22, 22)
  feeler(ctx, f.dark, 2, 43, -39, 50, -43.5, 0.3)
  feeler(ctx, f.dark, 2, 38, -41, 43, -46.5, 0.3)
  blob(ctx, 33, -25, 15, 16, 0, f.body, f.dark, false)
  if (p.bump) {
    oval(ctx, 21, -40, 6, 6, -0.4, TONGUE)
    line(ctx, HIGHLIGHT, 2, [18, -42.5, 20.5, -44])
  }
  mouth(ctx, 42, -13.5, 10, face.mouth ?? 'smile')
  eyes(ctx, 30, -32, 12, 14.2, look, face, f.body, f.dark, f.eye)
  if (f.goggles) {
    // Aviator goggles: the strap round the back of the head, and a pale rim round each eye.
    line(ctx, f.strap ?? f.dark, 3.4, [20, -36, 17, -30, 19, -22], true)
    for (const [x, y, r] of [[44.2, -30.6, 10.6], [30, -32, 12.6]]) bow(ctx, f.goggles, 3.2, x, y, r, r, 0, 0, Math.PI * 2)
  }
  ctx.restore()
  legs(p.legs, f.dark, 0)
}

import { EYE, HIGHLIGHT, INK } from './palette'

// The shared brushes of the creatures: flat glossy blobs with one hard highlight, thick tapered legs with round
// ends, springy feelers and large eyes. Nothing here knows a creature; the three body plans at the foot of the
// file (ant, beetle, fly) are built from these and posed by the two creature files.

/** Where the eyes look, x and y each from -1 to 1. */
export type Look = { x: number; y: number }
export type CreatureKind = 'ant' | 'queen' | 'worker' | 'raider' | 'beetle' | 'fly' | 'dungBeetle' | 'dungBall' | 'dungFly'
export type Ctx = CanvasRenderingContext2D
export type P = readonly [number, number]
/** One painter per kind: the pose, where the eyes look, and the seconds of game time. */
export type Painter = (ctx: Ctx, pose: string, look: Look, t: number) => void

export const TAU = Math.PI * 2
/** The inside of a mouth and a tongue. No creature colour of the palette is this pink. */
export const TONGUE = '#f2838f'

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v))

/** The direction of the current drawing frame that points at (wx, wy) on the stage. Light and weight keep their
 *  direction this way in a body that is tilted, mirrored or lying on its back. */
export function toLocal(ctx: Ctx, wx: number, wy: number): P {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : undefined
  if (!m || typeof m.a !== 'number') return [wx, wy]
  const det = m.a * m.d - m.b * m.c || 1
  const x = (m.d * wx - m.c * wy) / det
  const y = (m.a * wy - m.b * wx) / det
  const len = Math.hypot(x, y) || 1
  return [x / len, y / len]
}

export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0, fill?: string): void {
  if (fill) ctx.fillStyle = fill
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU)
  ctx.fill()
}

/** A filled shape through points: straight edges, for small flat things such as a leaf, a pillow or a rag. */
export function shape(ctx: Ctx, fill: string, pts: readonly number[]): void {
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.closePath()
  ctx.fill()
}

/** A stroke with round ends through points: a twig, a straw, a seam. With `curve` the middle points pull it into
 *  a bow instead of making a corner. */
export function line(ctx: Ctx, colour: string, width: number, pts: readonly number[], curve = false): void {
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  if (curve && pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5])
  else if (curve && pts.length === 8) ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7])
  else for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.stroke()
}

/** The one hard highlight of a glossy part: a short bright bow on the side the light comes from, and a dot. */
export function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  const [lx, ly] = toLocal(ctx, -0.5, -0.86)
  const a = Math.atan2(ly, lx) - rot
  const small = Math.min(rx, ry)
  ctx.strokeStyle = HIGHLIGHT
  ctx.lineCap = 'round'
  ctx.lineWidth = clamp(small * 0.22, 1.4, 5)
  ctx.beginPath()
  ctx.ellipse(x, y, rx * 0.66, ry * 0.6, rot, a - 0.42, a + 0.3)
  ctx.stroke()
  if (small < 8) return
  ctx.beginPath()
  ctx.ellipse(x, y, rx * 0.66, ry * 0.6, rot, a + 0.72, a + 0.74)
  ctx.stroke()
}

/** A glossy body part: a flat oval, a darker flat underside on the side of the ground, and its highlight. */
export function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, fill: string, dark?: string, gloss = true): void {
  if (dark) {
    // The lit oval sits inside the dark one, pushed toward the sky, so the dark shows as a rim that is widest below.
    const [ux, uy] = toLocal(ctx, 0, -1)
    const k = Math.min(rx, ry) * 0.2
    oval(ctx, x, y, rx, ry, rot, dark)
    oval(ctx, x + ux * k, y + uy * k, rx - k * 0.6, ry - k, rot, fill)
  } else oval(ctx, x, y, rx, ry, rot, fill)
  if (gloss) shine(ctx, x, y, rx, ry, rot)
}

/** A leg or an arm: one springy bow, thick from the hip to the knee and thinner from the knee to the foot, round
 *  at every end, with a small round foot or fist. The knee is the middle of the limb moved by (kx, ky). */
export function limb(ctx: Ctx, colour: string, width: number, x0: number, y0: number, x1: number, y1: number, kx = 0, ky = 0): void {
  const mx = (x0 + x1) / 2 + kx
  const my = (y0 + y1) / 2 + ky
  // The whole bow at the width of the shin, then its first half again at the width of the thigh.
  line(ctx, colour, width * 0.7, [x0, y0, mx + kx, my + ky, x1, y1], true)
  line(ctx, colour, width, [x0, y0, (x0 + mx + kx) / 2, (y0 + my + ky) / 2, mx, my], true)
  oval(ctx, x1, y1, width * 0.52, width * 0.52, 0, colour)
}

/** A feeler: a springy curve from the head to a blob at its tip. `curl` bows it forward or back. */
export function feeler(ctx: Ctx, colour: string, width: number, x0: number, y0: number, x1: number, y1: number, curl = 0.3): void {
  const dx = x1 - x0
  const dy = y1 - y0
  line(ctx, colour, width, [x0, y0, x0 + dx * 0.5 + dy * curl, y0 + dy * 0.5 - dx * curl, x1, y1], true)
  oval(ctx, x1, y1, width * 1.15, width * 1.15, 0, colour)
}

/** A wash over a shut eye, so that the lid is a shade paler than the head it is on. */
const LID = 'rgba(255,255,255,0.2)'

export type Shut = 'sleep' | 'joy' | 'squeeze'
export type EyeOpts = { white?: string; lid?: number; tilt?: number; skin?: string; shut?: Shut; pupil?: number }

/** A large round eye. The pupil shifts by `look`, so the eyes can follow the finger. `lid` from 0 to 1 lowers a
 *  flat lid in the colour of the skin, tilted by `tilt`; `shut` closes the eye to a curve instead. */
export function eye(ctx: Ctx, x: number, y: number, r: number, look: Look, o: EyeOpts = {}): void {
  const skin = o.skin ?? INK
  if (o.shut) {
    oval(ctx, x, y, r, r, 0, skin)
    oval(ctx, x, y, r, r, 0, LID)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(o.tilt ?? 0)
    // Asleep the lid hangs like a hammock, pleased it arches, squeezed it is a short hard crease.
    if (o.shut === 'sleep') line(ctx, INK, r * 0.3, [-r * 0.6, -r * 0.05, 0, r * 0.6, r * 0.6, -r * 0.05], true)
    else if (o.shut === 'joy') line(ctx, INK, r * 0.3, [-r * 0.6, r * 0.25, 0, -r * 0.6, r * 0.6, r * 0.25], true)
    else line(ctx, INK, r * 0.36, [-r * 0.65, -r * 0.1, 0, r * 0.25, r * 0.65, -r * 0.1], true)
    ctx.restore()
    return
  }
  oval(ctx, x, y, r, r, 0, o.white ?? EYE.white)
  const pr = r * (o.pupil ?? 0.48)
  const reach = r - pr - r * 0.06
  const lx = clamp(look.x)
  const ly = clamp(look.y)
  const far = Math.max(1, Math.hypot(lx, ly))
  const px = x + (lx / far) * reach
  const py = y + (ly / far) * reach
  oval(ctx, px, py, pr, pr, 0, EYE.pupil)
  oval(ctx, px - pr * 0.36, py - pr * 0.4, pr * 0.34, pr * 0.34, 0, EYE.white)
  const lid = clamp(o.lid ?? 0, 0, 0.95)
  if (lid <= 0) return
  // The lid is the top slice of the eye's circle, cut off by a straight edge.
  const half = Math.acos(1 - 2 * lid)
  const mid = -Math.PI / 2 + (o.tilt ?? 0)
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(x, y, r + 0.4, mid - half, mid + half)
  ctx.closePath()
  ctx.fill()
}

/** An eyebrow: one thick stroke over an eye. A positive angle drops its front end, which reads as cross. */
export function brow(ctx: Ctx, x: number, y: number, length: number, angle: number, width = 2.2, colour: string = INK): void {
  const dx = (Math.cos(angle) * length) / 2
  const dy = (Math.sin(angle) * length) / 2
  line(ctx, colour, width, [x - dx, y - dy, x + dx, y + dy])
}

export type Mouth = 'smile' | 'grin' | 'teeth' | 'o' | 'flat' | 'frown' | 'wavy' | 'tongue' | 'none'

/** A mouth of width `w` with its middle at (x, y). Each shape is a different mood. */
export function mouth(ctx: Ctx, x: number, y: number, w: number, kind: Mouth, ink: string = INK): void {
  const h = w / 2
  const pen = Math.max(1.3, w * 0.2)
  if (kind === 'none') return
  if (kind === 'smile') line(ctx, ink, pen, [x - h, y - h * 0.35, x, y + h * 0.75, x + h, y - h * 0.5], true)
  else if (kind === 'frown') line(ctx, ink, pen, [x - h, y + h * 0.4, x, y - h * 0.7, x + h, y + h * 0.4], true)
  else if (kind === 'flat') line(ctx, ink, pen, [x - h, y, x + h, y - h * 0.1])
  else if (kind === 'wavy') line(ctx, ink, pen, [x - h, y, x - h * 0.4, y - h * 0.7, x + h * 0.3, y + h * 0.7, x + h, y - h * 0.1], true)
  else if (kind === 'o') oval(ctx, x, y, h * 0.6, h * 0.75, 0, ink)
  else {
    // An open mouth: a dark bowl hanging from a straight lip, with a tongue or a row of teeth in it.
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.moveTo(x - h, y - h * 0.4)
    ctx.quadraticCurveTo(x - h * 0.9, y + h * 1.1, x, y + h * 1.1)
    ctx.quadraticCurveTo(x + h * 0.9, y + h * 1.1, x + h, y - h * 0.55)
    ctx.closePath()
    ctx.fill()
    if (kind === 'teeth') line(ctx, EYE.white, h * 0.5, [x - h * 0.55, y - h * 0.1, x + h * 0.6, y - h * 0.22])
    else if (kind === 'tongue') oval(ctx, x + h * 0.35, y + h * 0.95, h * 0.55, h * 0.75, -0.3, TONGUE)
    else oval(ctx, x, y + h * 0.7, h * 0.5, h * 0.32, 0, TONGUE)
  }
}

// The ant plan: rump, waist and head in a row with six legs under the waist. The child's ant, the workers and
// the raiders are all built on it, each with its own colours, proportions and poses.

export type Face = { brows?: P; lid?: number; tilt?: number; shut?: Shut; mouth?: Mouth; jaws?: number; bias?: P; dizzy?: boolean }
/** The build of one kind of ant: its colours, the half width and half height of rump, waist and head, the size of
 *  its eye and the thickness of its legs. A mask is the raider's. */
export type AntBuild = { body: string; dark: string; leg: string; ab: P; th: P; hd: P; eye: number; limb: number; mask?: string }
/** A pose. A body part is [x, y, turn]; a leg is [footX, footY, kneeDx, kneeDy], near legs from back to front;
 *  `feel` is how far the tips of the feelers reach from the brow, and their curl. */
export type AntPose = {
  ab: readonly number[]
  th: readonly number[]
  hd: readonly number[]
  legs: readonly (readonly number[])[]
  far?: readonly (readonly number[])[]
  feel: readonly number[]
  face?: Face
  /** Something held under an arm: painted over the body and under the near legs. */
  held?: (ctx: Ctx) => void
}

/** The eyes of a head, in the head's own frame: the far one first, then the near one over it, then the brows.
 *  `dizzy` sends the two pupils different ways, whatever there is to look at. */
export function eyes(ctx: Ctx, x: number, y: number, r: number, gap: number, look: Look, f: Face, skin: string, rim: string, white?: string): void {
  const lx = clamp(look.x + (f.bias?.[0] ?? 0))
  const ly = clamp(look.y + (f.bias?.[1] ?? 0))
  // The head may be tilted or mirrored, and the pupils must still look at the same place on the stage.
  const far = Math.hypot(lx, ly)
  const [dx, dy] = toLocal(ctx, lx, ly)
  const at = { x: dx * far, y: dy * far }
  const o: EyeOpts = { lid: f.lid, tilt: f.tilt, shut: f.shut, skin, white }
  eye(ctx, x + gap, y + r * 0.12, r * 0.84, f.dizzy ? { x: 0.8, y: 0.7 } : at, { ...o, tilt: -(f.tilt ?? 0) })
  // A dark sliver round the near eye keeps the two from running into one.
  oval(ctx, x, y, r * 1.14, r * 1.14, 0, rim)
  eye(ctx, x, y, r, f.dizzy ? { x: -0.7, y: -0.8 } : at, o)
  if (!f.brows) return
  brow(ctx, x + gap + r * 0.1, y - r * 0.78, r * 1.3, f.brows[1], r * 0.3)
  brow(ctx, x - r * 0.1, y - r * 0.95, r * 1.5, f.brows[0], r * 0.34)
}

export function antFigure(ctx: Ctx, a: AntBuild, p: AntPose, look: Look, t: number): void {
  const f = p.face ?? {}
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
  const leg = (l: readonly number[], i: number, colour: string, dx: number) => {
    const [x0, y0] = hip(i)
    // A foot is given by the point of the ground it stands on, so its round end is lifted by its own radius.
    limb(ctx, colour, a.limb, x0 + dx, y0, l[0], l[1] - a.limb * 0.5, l[2] ?? 0, l[3] ?? -5)
  }
  // The far legs first, a little forward of the near ones and darker, then the body from the rump to the head.
  const far = p.far ?? p.legs.map((l) => [l[0] + a.limb * 1.2, l[1], l[2] ?? 0, l[3] ?? -5])
  far.forEach((l, i) => leg(l, i, a.leg, 2))
  ctx.save()
  ctx.translate(ax, ay)
  ctx.rotate(ar)
  blob(ctx, 0, 0, a.ab[0], a.ab[1] + breath, 0, a.body, a.dark, false)
  // Two seams across the rump, each a bow that follows its roundness.
  for (const k of [-0.3, 0.22]) {
    ctx.strokeStyle = a.dark
    ctx.lineWidth = a.limb * 0.36
    ctx.beginPath()
    ctx.ellipse(k * a.ab[0] + 4, -1, 5, a.ab[1] * Math.sqrt(1 - k * k) * 0.86, 0, Math.PI * 0.55, Math.PI * 1.45)
    ctx.stroke()
  }
  shine(ctx, 0, 0, a.ab[0], a.ab[1], 0)
  ctx.restore()
  blob(ctx, tx, ty, a.th[0], a.th[1], tr, a.body, a.dark)
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(hr)
  const [rx, ry] = a.hd
  const [fx, fy, curl = 0.3] = p.feel
  feeler(ctx, a.leg, a.limb * 0.5, rx * 0.5, -ry * 0.7, rx * 0.5 + fx + 6, -ry * 0.7 + fy + 3 + twitch, curl)
  // The jaws: two dark claws at the front of the head that close on each other. The far one goes behind the head.
  const open = (f.jaws ?? 0.3) * ry
  const jaw = (s: number, back: number) => {
    const y = ry * 0.56
    ctx.fillStyle = a.leg
    ctx.beginPath()
    ctx.moveTo(rx * 0.72, y)
    ctx.quadraticCurveTo(rx * 1.14 - back, y + s * (ry * 0.42 + open), rx * 1.36 - back, y + s * open * 0.55)
    ctx.quadraticCurveTo(rx * 1.1 - back, y + s * (ry * 0.1 + open * 0.5), rx * 0.86, y + s * ry * 0.2)
    ctx.closePath()
    ctx.fill()
  }
  jaw(-1, 1.5)
  blob(ctx, 0, 0, rx, ry, 0, a.body, a.dark, false)
  shine(ctx, -rx * 0.3, 0, rx * 0.7, ry, 0)
  jaw(1, 0)
  if (a.mask) {
    // The raider's mask: a dark band across both eyes, with the two ends of its knot flying behind the head.
    line(ctx, a.mask, a.eye * 1.5, [-rx * 0.62, -ry * 0.4, rx * 0.86, -ry * 0.3])
    line(ctx, a.mask, a.limb * 0.6, [-rx * 0.8, -ry * 0.45, -rx * 1.25, -ry * 0.75 + twitch * 0.5])
    line(ctx, a.mask, a.limb * 0.6, [-rx * 0.8, -ry * 0.4, -rx * 1.3, -ry * 0.2 - twitch * 0.5])
  }
  mouth(ctx, rx * 0.52, ry * 0.58, rx * 0.5, f.mouth ?? 'smile')
  eyes(ctx, rx * 0.16, -ry * 0.36, a.eye, a.eye * 1.3, look, f, a.body, a.dark)
  feeler(ctx, a.dark, a.limb * 0.5, rx * 0.1, -ry * 0.85, rx * 0.1 + fx, -ry * 0.85 + fy - twitch, curl)
  ctx.restore()
  p.held?.(ctx)
  p.legs.forEach((l, i) => leg(l, i, a.dark, 0))
}

// The beetle plan: a domed shell over a pale belly, a neck plate, a low head and six short legs. The beetle and
// the dung beetle are both built on it.

export type Legs = readonly (readonly number[])[]
/** Where a body stands and how it is tipped: [x, y, turn, mirror, upturn]. The last two are 1, or -1 to face left
 *  and to lie on its back. */
export type Stance = readonly number[]
export type BeetleBuild = { shell: string; dark: string; belly: string; leg: string; horn?: string; lash?: boolean }
/** A pose. Legs are [footX, footY, kneeDx, kneeDy] on the stage, the near ones from back to front; `hd` nudges and
 *  tilts the head on its neck; `held` is painted over the body and under the near legs. */
export type BeetlePose = { at: Stance; legs: Legs; far?: Legs; hd?: readonly number[]; face?: Face; held?: (ctx: Ctx) => void }

/** Where a point of a tipped body lands on the stage. */
export function place(at: Stance, lx: number, ly: number): P {
  const [x, y, r = 0, sx = 1, sy = 1] = at
  return [x + lx * sx * Math.cos(r) - ly * sy * Math.sin(r), y + lx * sx * Math.sin(r) + ly * sy * Math.cos(r)]
}

/** Moves the drawing frame into a tipped body. The caller restores it. */
export function enter(ctx: Ctx, at: Stance): void {
  ctx.save()
  ctx.translate(at[0], at[1])
  ctx.rotate(at[2] ?? 0)
  ctx.scale(at[3] ?? 1, at[4] ?? 1)
}

export function beetleFigure(ctx: Ctx, b: BeetleBuild, p: BeetlePose, look: Look, t: number): void {
  const f = p.face ?? {}
  const breath = Math.sin(t * 1.8) * 0.7
  const hips: readonly P[] = [[-33, -10], [-9, -8], [16, -11]]
  const legs = (list: Legs, colour: string, dx: number) =>
    list.forEach((l, i) => {
      const [x, y] = place(p.at, hips[i][0] + dx, hips[i][1])
      limb(ctx, colour, 6.5, x, y, l[0], l[1] - 3.4, l[2] ?? 0, l[3] ?? 0)
    })
  legs(p.far ?? p.legs.map((l) => [l[0] + 10, l[1], l[2] ?? 0, l[3] ?? 0]), b.dark, 8)
  enter(ctx, p.at)
  oval(ctx, -8, -15, 43, 11.5, 0, b.belly)
  blob(ctx, -14, -31, 46, 25 + breath, 0, b.shell, b.dark, false)
  // The edge of the wing case: one bow low on the shell.
  ctx.strokeStyle = b.dark
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(-14, -40, 40, 22, 0, Math.PI * 0.14, Math.PI * 0.8)
  ctx.stroke()
  shine(ctx, -14, -31, 46, 25)
  // The neck plate, with a dark sliver behind it where it lies on the shell.
  oval(ctx, 22, -29, 15, 19.5, 0.15, b.dark)
  blob(ctx, 25.5, -29, 15, 19.5, 0.15, b.shell, b.dark)
  const [hx = 0, hy = 0, hr = 0] = p.hd ?? []
  ctx.translate(45 + hx, -22 + hy)
  ctx.rotate(hr)
  const twitch = Math.sin(t * 2.6) * 1.5
  if (b.horn) {
    // The short horn of a stag beetle: one thick tine bent upward and a small one under it.
    line(ctx, b.horn, 4.5, [10, -9, 19, -10, 22, -13])
    line(ctx, b.horn, 7, [5, -10, 18, -14, 19, -27], true)
  } else {
    feeler(ctx, b.leg, 2.6, 11, -10, 21, -18 + twitch, 0.3)
    feeler(ctx, b.leg, 2.6, 6, -12, 13, -23 - twitch, 0.3)
  }
  blob(ctx, 0, 0, 16.5, 15.5, 0, b.shell, b.dark, false)
  shine(ctx, -6, 0, 10, 15)
  mouth(ctx, 8.5, 9.5, 9, f.mouth ?? 'flat')
  eyes(ctx, 0, -5, 8.4, 10.8, look, f, b.shell, b.dark)
  // The dung beetle's lashes: three short strokes at the outer corner of its near eye.
  if (b.lash) for (const a of [-2.75, -2.3, -1.85]) line(ctx, INK, 1.6, [Math.cos(a) * 8, -5 + Math.sin(a) * 8, Math.cos(a) * 12.5, -5 + Math.sin(a) * 12.5])
  ctx.restore()
  p.held?.(ctx)
  legs(p.legs, b.leg, 0)
}

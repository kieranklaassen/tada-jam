import { HAT_RISE, drawBody, drawFoot, drawHat } from './garments'
import { C, type Pen } from './lacquer'
import type { Pose } from './motion'
import { steps, type Frame, type Sprites } from './sprites'
import { SLOT, type Garment, type Sleeper } from './things'

// The five, standing on their beds, seen from the front. The origin is between the feet on the sole. Each is its
// own drawing: what they share is only where a hat, a garment and a shoe can sit.

export type Build = {
  skin: string
  /** Half the body, and where shoulders, hips and neck are above the sole. */
  half: number; shoulder: number; hip: number; neck: number
  /** The feet and the legs. */
  footX: number; foot: number; leg: number
  /** An arm's thickness and length. */
  arm: number; reach: number
  /** A hat's brim on the head, above the neck, and how wide. */
  hatY: number; hat: number
  /** Where the eyes are above the neck: hands go there to hide them. */
  eyes: number
}

export const BUILD: Record<Sleeper, Build> = {
  goat: { skin: C.ivory, half: 40, shoulder: 196, hip: 84, neck: 198, footX: 24, foot: 38, leg: 17, arm: 16, reach: 92, hatY: 100, hat: 74, eyes: 72 },
  hippo: { skin: C.sky, half: 84, shoulder: 176, hip: 56, neck: 168, footX: 42, foot: 56, leg: 38, arm: 30, reach: 74, hatY: 112, hat: 82, eyes: 86 },
  hen: { skin: C.saffron, half: 66, shoulder: 150, hip: 58, neck: 152, footX: 26, foot: 46, leg: 10, arm: 30, reach: 64, hatY: 80, hat: 70, eyes: 52 },
  croc: { skin: C.emerald, half: 46, shoulder: 206, hip: 72, neck: 208, footX: 26, foot: 44, leg: 26, arm: 18, reach: 86, hatY: 106, hat: 72, eyes: 86 },
  pig: { skin: C.rose, half: 72, shoulder: 164, hip: 52, neck: 158, footX: 34, foot: 46, leg: 30, arm: 24, reach: 70, hatY: 96, hat: 78, eyes: 64 },
}

/** How far from its middle a hand and a garment may reach. */
export const ARM_ROOM = 96, CLOTH_ROOM = 108

/** How far a stack of shoes lifts its wearer. */
export const lift = (worn: readonly Garment[]) => worn.filter((garment) => SLOT[garment] === 'feet').length * 13

export type Show = { garment: Garment; pop: number } | null

/** The steps an expression is rounded to: a head is painted once for each, and stamped from then on. */
function plain(pose: Pose): Pose {
  return {
    ...pose, eyes: pose.eyes < 0.12 ? 0 : pose.eyes <= 1 ? Math.max(0.3, steps(pose.eyes, 0.25)) : steps(pose.eyes, 0.4), lookX: steps(pose.lookX, 0.5), lookY: steps(pose.lookY, 0.5),
    brow: steps(pose.brow, 0.5), mouth: steps(pose.mouth, 0.25), smile: steps(pose.smile, 0.5), own: steps(pose.own, 0.25),
  }
}

const HEAD: Frame = { left: -100, top: -142, width: 200, height: 236 }
const BODY: Frame = { left: -112, top: -230, width: 224, height: 232 }

export function drawFigure(sprites: Sprites, sleeper: Sleeper, pose: Pose, worn: readonly Garment[], show: Show): void {
  const { ctx, pen } = sprites, b = BUILD[sleeper], raise = lift(worn), face = plain(pose)
  const shoes = worn.filter((garment) => SLOT[garment] === 'feet')
  const layers = worn.filter((garment) => SLOT[garment] === 'body')
  const hats = worn.filter((garment) => SLOT[garment] === 'head')
  /** A garment as it is worn. One that shows off has a picture for each twelfth of its trick. */
  const cloth = (garment: Garment, key: string, frame: Frame, paint: (pen: Pen, pop: number) => void) => {
    const pop = show && show.garment === garment ? steps(show.pop, 1 / 12) : 0
    sprites.stamp(`${sleeper} ${garment} ${key} ${pop}`, frame, 0, (to) => paint(to, pop))
  }
  ctx.save()
  ctx.translate(pose.x, -pose.up)
  ctx.rotate(pose.turn)
  if (pose.flip !== 0) { ctx.translate(0, -116); ctx.rotate(pose.flip); ctx.translate(0, 116) }
  ctx.scale(pose.wide, pose.tall)
  if (sleeper === 'croc') {
    ctx.save()
    ctx.translate(0, -raise)
    ctx.rotate(Math.max(-0.1, Math.min(0.1, pose.turn + pose.headTurn * 0.25)))
    sprites.stamp('croc tail', { left: -112, top: -120, width: 120, height: 124 }, 0, (to) => tail(to))
    ctx.restore()
  }
  // Both legs at once: a gold line and the skin over it.
  ctx.beginPath()
  for (const side of [-1, 1]) {
    const up = (side < 0 ? pose.legL : pose.legR) * 30, x = side * b.footX
    ctx.moveTo(side * b.half * 0.42, -b.hip - 12 - raise)
    ctx.quadraticCurveTo(x * 1.05, -b.hip * 0.5 - raise, x, -14 - raise - up)
  }
  pen.limbs(b.leg, sleeper === 'hen' ? C.ember : b.skin)
  for (const side of [-1, 1]) {
    const up = (side < 0 ? pose.legL : pose.legR) * 30
    ctx.save()
    ctx.translate(side * b.footX, -up)
    ctx.rotate(side * up * 0.006)
    if (shoes.length === 0) sprites.stamp(`${sleeper} foot ${side}`, { left: -b.foot, top: -32, width: b.foot * 2, height: 40 }, 0, (to) => bareFoot(to, sleeper, side, b.foot))
    const turning = Math.abs(pose.wide) < 0.9
    shoes.forEach((garment, i) => {
      ctx.save()
      ctx.translate(0, -(shoes.length - 1 - i) * 22)
      const w = b.foot * 1.12
      cloth(garment, `${side} ${turning}`, { left: -w * 0.75, top: -w * 1.15, width: w * 1.5, height: w * 1.3 }, (to, pop) => drawFoot(to, garment, w, side, pop, pop * 2, turning))
      ctx.restore()
    })
    ctx.restore()
  }
  ctx.translate(0, -raise)
  const own = sleeper === 'hippo' || sleeper === 'pig' ? steps(pose.own, 0.5) : 0
  sprites.stamp(`${sleeper} body ${own} ${layers.length === 0}`, BODY, 0, (to) => body(to, sleeper, b, own, layers.length === 0))
  layers.forEach((garment, i) => {
    ctx.save()
    ctx.translate(0, -b.shoulder + 4)
    const w = Math.min(b.half * 2.06 * (1 + i * 0.13), CLOTH_ROOM * 2 / 1.26), h = b.shoulder - b.hip + 8
    cloth(garment, `${i}`, { left: -124, top: -24, width: 248, height: h * 1.2 + 56 }, (to, pop) => drawBody(to, garment, w, h, pop, pop * 4))
    ctx.restore()
  })
  // Arms go behind the head, and over it when they hide the face.
  const hiding = pose.cover > 0.3
  if (!hiding) arms(sprites, sleeper, b, pose)
  ctx.save()
  ctx.translate(pose.headX, -b.neck + pose.headY)
  ctx.rotate(pose.headTurn)
  sprites.stamp(`${sleeper} head ${face.eyes} ${face.lookX} ${face.lookY} ${face.brow} ${face.mouth} ${face.smile} ${face.own}`, HEAD, 0, (to) => HEADS[sleeper](to, face))
  let y = -b.hatY
  for (const garment of hats) {
    ctx.save()
    ctx.translate(0, y)
    cloth(garment, '', { left: -b.hat * 1.2, top: -b.hat * 1.15, width: b.hat * 2.6, height: b.hat * (garment === 'feather' ? 2.7 : 1.5) }, (to, pop) => drawHat(to, garment, b.hat, pop, pop * 4))
    y -= HAT_RISE[garment]! * b.hat
    ctx.restore()
  }
  ctx.restore()
  if (hiding) arms(sprites, sleeper, b, pose)
  ctx.restore()
}

function arms(sprites: Sprites, sleeper: Sleeper, b: Build, pose: Pose): void {
  const { ctx, pen } = sprites, hands: number[] = []
  ctx.beginPath()
  for (const side of [-1, 1]) {
    const k = side < 0 ? pose.armL : pose.armR, a = 0.3 + k * (Math.PI - 0.62)
    const sx = side * b.half * 0.86, sy = -b.shoulder + 18
    let hx = sx + side * Math.sin(a) * b.reach * (0.72 + k * 0.16), hy = sy + Math.cos(a) * b.reach
    const cx = side * 15, cy = -b.neck + pose.headY - b.eyes + 4
    // An arm stays over its own bed.
    hx = Math.max(-ARM_ROOM, Math.min(ARM_ROOM, hx))
    hx += (cx - hx) * pose.cover
    hy += (cy - hy) * pose.cover
    const ex = (sx + hx) / 2 + side * 12, ey = (sy + hy) / 2 + 8
    if (sleeper === 'hen') {
      // A wing: three feathers.
      for (let i = 2; i >= 0; i--) { ctx.moveTo(sx, sy + i * 8); ctx.quadraticCurveTo(ex + side * i * 2, ey + i * 12, hx + side * (4 - i * 4), hy + i * 13 - 8) }
      continue
    }
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(ex, ey, hx, hy)
    hands.push(hx, hy)
  }
  pen.limbs(sleeper === 'hen' ? 17 : b.arm, sleeper === 'hen' ? C.cream : b.skin)
  for (let i = 0; i < hands.length; i += 2) {
    ctx.save()
    ctx.translate(hands[i], hands[i + 1])
    sprites.stamp(`${sleeper} hand`, { left: -24, top: -24, width: 48, height: 48 }, 0, (to) => hand(to, sleeper))
    ctx.restore()
  }
}

function hand(pen: Pen, sleeper: Sleeper): void {
  if (sleeper === 'goat') pen.ell(0, 1, 10, 11, C.brown, 1.8)
  else if (sleeper === 'pig') pen.ell(0, 1, 13, 12, C.blush, 1.8)
  else if (sleeper === 'hippo') pen.ell(0, 0, 19, 17, C.sky, 1.8)
  else {
    pen.ell(0, 0, 13, 12, C.emerald, 1.8)
    for (const i of [-1, 0, 1]) pen.ell(i * 8, 9 - Math.abs(i) * 2, 3, 4, C.ivory, 1)
  }
}

export function bareFoot(pen: Pen, sleeper: Sleeper, side: number, w: number): void {
  const s = w / 2
  if (sleeper === 'goat') {
    pen.poly([-s * 0.6, -24, s * 0.6, -24, s * 0.9, 0, 2, 0, 0, -10, -2, 0, -s * 0.9, 0], C.brown)
  } else if (sleeper === 'hen') {
    for (const i of [-1, 0, 1]) pen.limb(0, -12, i * s * 0.5, -8, i * s * 0.95, -3, 6, C.ember)
  } else if (sleeper === 'pig') {
    pen.poly([-s * 0.75, -20, s * 0.75, -20, s * 0.85, 0, 2, 0, 0, -10, -2, 0, -s * 0.85, 0], C.blush)
  } else if (sleeper === 'hippo') {
    pen.blob([-s, 0, -s, -26, s, -26, s, 0, 0, 3], C.sky)
    for (const i of [-1, 0, 1]) pen.ell(i * s * 0.5 + side * 2, -6, 6, 5, C.ivory, 1.4)
  } else {
    pen.blob([-s, 0, -s * 0.8, -20, s * 0.8, -20, s, 0, 0, 3], C.emerald)
    for (const i of [-1, 0, 1]) pen.poly([i * s * 0.55 - 5, -5, i * s * 0.55 + 5, -5, i * s * 0.6, 4], C.ivory, 1)
  }
}

function tail(pen: Pen): void {
  pen.blob([-20, -100, -60, -70, -78, -16, -86, -4, -70, 0, -50, -22, -8, -60], C.emerald)
}

function body(pen: Pen, sleeper: Sleeper, b: Build, own: number, pants: boolean): void {
  const w = b.half, top = -b.shoulder, low = -b.hip
  if (sleeper === 'goat') {
    pen.blob([-w * 0.7, top - 8, -w * 1.08, top + 40, -w, low - 10, -w * 0.7, low + 10, w * 0.7, low + 10, w, low - 10, w * 1.08, top + 40, w * 0.7, top - 8], b.skin)
    // Locks of wool in gold.
    for (let i = 0; i < 4; i++) for (const x of [-0.5, 0, 0.5]) pen.wire([w * x - 7, top + 26 + i * 19, w * x, top + 36 + i * 19, w * x + 7, top + 26 + i * 19], 1.6)
  } else if (sleeper === 'hippo') {
    const belly = own * 2
    pen.blob([-w * 0.7, top - 8, -w * 1.06, top + 20, -w * 1.1 - belly, low - 30, -w * 0.8, low + 22, 0, low + 26, w * 0.8, low + 22, w * 1.1 + belly, low - 30, w * 1.06, top + 20, w * 0.7, top - 8], b.skin)
    pen.ell(0, (top + low) / 2 + 12, w * 0.68, (low - top) * 0.36, C.ivory, 1.6)
    pen.ell(0, (top + low) / 2 + 24, 4, 6, C.lapis, 0)
  } else if (sleeper === 'hen') {
    pen.blob([-w * 0.5, top - 14, -w * 0.95, top + 22, -w * 1.1, low - 20, -w * 0.6, low + 22, w * 0.6, low + 22, w * 1.1, low - 20, w * 0.95, top + 22, w * 0.5, top - 14], b.skin)
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - (row % 2); i++) {
      const x = (i - (3 - (row % 2)) / 2) * 26, y = top + 34 + row * 21
      pen.wire([x - 12, y, x, y + 13, x + 12, y], 1.8)
    }
  } else if (sleeper === 'croc') {
    pen.blob([-w * 0.6, top - 8, -w * 0.94, top + 30, -w * 1.06, low - 24, -w * 0.7, low + 14, w * 0.7, low + 14, w * 1.06, low - 24, w * 0.94, top + 30, w * 0.6, top - 8], b.skin)
    pen.blob([-w * 0.3, top + 2, -w * 0.52, top + 50, -w * 0.5, low - 8, w * 0.5, low - 8, w * 0.52, top + 50, w * 0.3, top + 2], C.leaf, 1.6)
    for (let i = 0; i < 5; i++) pen.wire([-w * 0.42, top + 22 + i * 20, 0, top + 28 + i * 20, w * 0.42, top + 22 + i * 20], 1.5)
  } else {
    const wob = own * 4
    pen.blob([-w * 0.66, top - 8, -w * 1.02, top + 20, -w * 1.12, low - 28 + wob, -w * 0.7, low + 22, w * 0.7, low + 22, w * 1.12, low - 28 - wob, w * 1.02, top + 20, w * 0.66, top - 8], b.skin)
    pen.ell(wob, (top + low) / 2 + 14, w * 0.62, (low - top) * 0.34, C.blush, 1.6)
    pen.ell(wob, (top + low) / 2 + 22, 3, 4.5, C.scarlet, 0)
  }
  if (!pants) return
  // Nightly underwear, each in its own cloth.
  const y = low - (b.shoulder - b.hip) * 0.2, cloth = { goat: C.scarlet, hippo: C.white, hen: C.lapis, croc: C.saffron, pig: C.turquoise }[sleeper]
  const dots = { goat: C.white, hippo: C.scarlet, hen: C.white, croc: C.violet, pig: C.white }[sleeper]
  pen.blob([-w * 1.08, y - 4, -w * 1.12, low - 4, -w * 0.5, low + 30, -w * 0.16, low + 22, 0, low + 14, w * 0.16, low + 22, w * 0.5, low + 30, w * 1.12, low - 4, w * 1.08, y - 4, 0, y + 6], cloth)
  for (let i = -2; i <= 2; i++) pen.ell(i * w * 0.36, low - 2 + (i % 2 === 0 ? 4 : -7), 4.4, 4.4, dots, 0)
}

/** A pair of eyes `gap` apart and `r` big. */
function eyes(pen: Pen, x: number, y: number, gap: number, r: number, pose: Pose, lid: string): void {
  const open = Math.max(0, pose.eyes), big = open > 1 ? 1 + (open - 1) * 0.5 : 1
  for (const side of [-1, 1]) {
    const ex = x + side * gap / 2
    if (open < 0.12) {
      pen.wire([ex - r, y, ex, y + r * 0.5, ex + r, y], 3, pen.tone(C.ink))
      continue
    }
    const ry = r * Math.min(1, open) * big
    pen.ell(ex, y, r * big, r * big, lid, 1.6)
    if (ry > 0) pen.ell(ex, y + (r * big - ry) * 0.5, r * big * 0.94, ry * 0.94, C.white, 0)
    const p = r * (open > 1.2 ? 0.34 : 0.48)
    pen.ell(ex + pose.lookX * r * 0.46, y + (r * big - ry) * 0.5 + pose.lookY * Math.min(ry, r) * 0.46, p, Math.min(p * 1.15, ry * 0.8), C.ink, 0)
    const b = pose.brow * r * 0.5, by = y - r * big - 5
    if (Math.abs(pose.brow) > 0.1) pen.wire([ex - side * r * 1.0, by + b, ex, by - 2, ex + side * r * 1.0, by - b], 3.4, pen.tone(C.ink))
  }
}

function mouth(pen: Pen, x: number, y: number, w: number, pose: Pose): void {
  if (pose.mouth > 0.08) {
    pen.ell(x, y + pose.mouth * 4, w * (0.62 + pose.smile * 0.2), 3 + pose.mouth * w * 0.62, C.ember, 2)
    pen.ell(x, y + pose.mouth * w * 0.5 + 2, w * 0.36, 1 + pose.mouth * w * 0.22, C.scarlet, 0)
  } else pen.wire([x - w, y - pose.smile * w * 0.3, x, y + pose.smile * w * 0.5 + 1, x + w, y - pose.smile * w * 0.3], 3, pen.tone(C.ink))
}

const HEADS: Record<Sleeper, (pen: Pen, pose: Pose) => void> = {
  goat(pen, pose) {
    const beard = pose.own
    for (const side of [-1, 1]) {
      pen.blob([side * 14, -96, side * 34, -118, side * 62, -116, side * 70, -88, side * 60, -92, side * 46, -100, side * 26, -84], C.brown)
      for (let i = 0; i < 3; i++) pen.wire([side * (34 + i * 10), -104 + i * 1, side * (38 + i * 10), -114 + i * 2], 1.6)
      pen.ell(side * 46, -72 + Math.abs(beard) * 4, 20, 9, C.blush, 2, side * (0.3 + beard * 0.2))
    }
    // The beard goes where the goat's opinion goes.
    pen.blob([-15, -12, -13 + beard * 4, 14, beard * 20, 46 - Math.abs(beard) * 14, 13 + beard * 4, 14, 15, -12], C.white)
    pen.wire([0, 0, beard * 8, 14, beard * 16, 30 - Math.abs(beard) * 8], 1.6)
    pen.blob([-30, -104, -40, -70, -26, -18, -20, 2, 20, 2, 26, -18, 40, -70, 30, -104, 0, -112], C.ivory)
    pen.blob([-21, -32, -24, -8, -10, 4, 10, 4, 24, -8, 21, -32, 0, -38], C.blush, 1.6)
    pen.ell(-7, -24, 2.6, 4, C.brown, 0)
    pen.ell(7, -24, 2.6, 4, C.brown, 0)
    eyes(pen, 0, -72, 36, 14, pose, C.cream)
    mouth(pen, 0, -8, 12, pose)
  },
  hippo(pen, pose) {
    const ear = pose.own
    for (const side of [-1, 1]) {
      pen.ell(side * 50, -112 + ear * 6, 15, 18, C.sky, 2, side * (0.5 + ear * 0.4))
      pen.ell(side * 50, -110 + ear * 6, 7, 10, C.blush, 0, side * (0.5 + ear * 0.4))
    }
    pen.blob([-46, -116, -62, -82, -60, -52, 60, -52, 62, -82, 46, -116, 0, -124], C.sky)
    const drop = pose.mouth * 34
    if (pose.mouth > 0.08) {
      pen.blob([-66, -30, -72, 6 + drop, -40, 24 + drop, 40, 24 + drop, 72, 6 + drop, 66, -30], C.sky)
      pen.blob([-52, -14, -54, 6 + drop, 0, 14 + drop, 54, 6 + drop, 52, -14], C.ember)
      pen.box(-32, -2 + drop * 0.6, 14, 14, 4, C.ivory, 1.4)
      pen.box(18, -2 + drop * 0.6, 14, 14, 4, C.ivory, 1.4)
    }
    pen.blob([-60, -58, -88, -34, -82, 4, -40, 14, 40, 14, 82, 4, 88, -34, 60, -58, 0, -66], C.sky)
    pen.ell(-28, -40, 8, 6, C.lapis, 1.6)
    pen.ell(28, -40, 8, 6, C.lapis, 1.6)
    pen.ell(-60, -12, 14, 9, C.blush, 0)
    pen.ell(60, -12, 14, 9, C.blush, 0)
    if (pose.mouth <= 0.08) pen.wire([-42, -6 - pose.smile * 12, 0, 2 + pose.smile * 8, 42, -6 - pose.smile * 12], 3, pen.tone(C.ink))
    eyes(pen, 0, -88, 54, 15, pose, C.lapis)
  },
  hen(pen, pose) {
    const comb = pose.own * 8
    for (let i = -1; i <= 1; i++) pen.ell(i * 15, -84 - (i === 0 ? 8 : 0) - comb, 12, 16 + comb * 0.4, C.scarlet, 2, i * 0.3)
    pen.blob([-32, -80, -44, -40, -48, 10, 48, 10, 44, -40, 32, -80, 0, -90], C.saffron)
    for (const side of [-1, 1]) pen.ell(side * 34, -30, 9, 7, C.scarlet, 0)
    eyes(pen, 0, -54, 40, 15, pose, C.cream)
    const gape = pose.mouth * 15
    pen.poly([-17, -34 + gape * 0.3, 17, -34 + gape * 0.3, 0, -14 + gape * 1.6], C.ember)
    pen.poly([-18, -36, 18, -36, 0, -18 - gape * 0.4], C.white)
    pen.ell(-6, -2 + gape, 7, 12, C.scarlet, 1.8, 0.2)
    pen.ell(6, -2 + gape, 7, 12, C.scarlet, 1.8, -0.2)
  },
  croc(pen, pose) {
    const jaw = pose.own * 44
    // The lower jaw, its tongue and its teeth.
    if (jaw > 2) {
      pen.blob([-40, -50, -46, 4 + jaw, 0, 18 + jaw, 46, 4 + jaw, 40, -50], C.emerald)
      pen.blob([-32, -40, -35, jaw - 2, 0, 8 + jaw, 35, jaw - 2, 32, -40], C.ember)
      pen.ell(0, jaw - 8, 18, Math.min(16, jaw * 0.5), C.scarlet, 1.4)
      for (let i = -2; i <= 2; i++) pen.poly([i * 13 - 5, jaw + 2 - Math.abs(i) * 2, i * 13 + 5, jaw + 2 - Math.abs(i) * 2, i * 13, jaw - 9 - Math.abs(i) * 2], C.white, 1)
    } else pen.blob([-40, -30, -40, 8, 0, 16, 40, 8, 40, -30], C.emerald)
    // The long muzzle, seen from in front, and the two bumps its eyes sit on.
    pen.blob([-30, -110, -44, -84, -52, -40, -50, -6, 0, 4, 50, -6, 52, -40, 44, -84, 30, -110], C.emerald)
    for (const side of [-1, 1]) pen.ell(side * 24, -98, 20, 19, C.emerald)
    for (let i = -3; i <= 3; i++) pen.poly([i * 13 - 5, -4 + (3 - Math.abs(i)) * 1.4, i * 13 + 5, -4 + (3 - Math.abs(i)) * 1.4, i * 13, 9 + (3 - Math.abs(i)) * 1.4], C.white, 1)
    pen.ell(-16, -28, 8, 5, C.leaf, 1.6)
    pen.ell(16, -28, 8, 5, C.leaf, 1.6)
    for (const [x, y] of [[-30, -58], [30, -58], [0, -66], [-12, -50], [12, -50]] as const) pen.ell(x, y, 4, 3, C.leaf, 0)
    eyes(pen, 0, -98, 48, 14, pose, C.leaf)
    if (Math.abs(pose.smile) > 0.2) for (const side of [-1, 1]) pen.wire([side * 40, -10 - pose.smile * 2, side * 52, -14 - pose.smile * 12], 3, pen.tone(C.ink))
  },
  pig(pen, pose) {
    const flap = pose.own * 0.4
    for (const side of [-1, 1]) {
      pen.ctx.save()
      pen.ctx.translate(side * 40, -92)
      pen.ctx.rotate(side * (0.4 + flap))
      pen.blob([-16, 0, -14, -30, side * 8, -42, 18, -26, 18, 4, 0, 14], C.rose)
      pen.blob([-7, 2, -6, -18, side * 5, -28, 9, -14, 8, 4], C.blush, 0)
      pen.ctx.restore()
    }
    pen.blob([-48, -98, -66, -60, -60, -10, -24, 10, 24, 10, 60, -10, 66, -60, 48, -98, 0, -106], C.rose)
    pen.ell(-44, -24, 12, 9, C.scarlet, 0)
    pen.ell(44, -24, 12, 9, C.scarlet, 0)
    pen.ell(0, -38, 27 + pose.mouth * 2, 20, C.blush)
    pen.ell(-9, -38, 5, 8, C.ember, 0)
    pen.ell(9, -38, 5, 8, C.ember, 0)
    eyes(pen, 0, -68, 58, 13, pose, C.blush)
    mouth(pen, 0, -8, 15, pose)
  },
}

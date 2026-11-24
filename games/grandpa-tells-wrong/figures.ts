import { blob, clamp, INK, lerp, limb, line, lit, shape, soft } from './draw'
import { dye, type G } from './loom'
import type { Coat, Who, Worn } from './tale'

// The five, each drawn from the feet up (the moon from its middle), facing
// right. A pose says how a body is held this frame; what is worn goes between
// the body and the face.

export type Mouth = 'shut' | 'open' | 'smile' | 'grit' | 'round'
export type Pose = {
  x: number
  y: number
  sx: number
  sy: number
  turn: number
  /** Where the eyes look, each -1 to 1. */
  look: { x: number; y: number }
  /** 0 shut to 1 open; over 1 is wide. */
  eyes: number
  /** -1 cross to 1 astonished. */
  brow: number
  mouth: Mouth
  /** The funniest part of each: neck, ears, bun, moustache. */
  quirk: number
  /** Legs kicking, 0 to 1 round. */
  kick: number
  /** How far a coat has crept over them, 0 to 1. */
  coated: number
}

export function restPose(): Pose {
  return { x: 0, y: 0, sx: 1, sy: 1, turn: 0, look: { x: 0, y: 0 }, eyes: 1, brow: 0, mouth: 'shut', quirk: 0, kick: 0, coated: 1 }
}

const CREAM = dye('cream', 3)

/** An eye with a lid that comes down in the colour of the face. */
function eye(g: G, x: number, y: number, r: number, pose: Pose, lid: string): void {
  const wide = Math.max(1, pose.eyes)
  blob(g, x, y, r * wide, r * wide, CREAM)
  const open = clamp(pose.eyes)
  const p = r * 0.56
  blob(g, x + pose.look.x * r * 0.42, y + pose.look.y * r * 0.4, p, p, INK)
  if (open < 0.95) {
    g.save()
    g.beginPath()
    g.ellipse(x, y, r + 2, r + 2, 0, 0, Math.PI * 2)
    g.clip()
    g.fillStyle = lid
    g.fillRect(x - r - 3, y - r - 3, r * 2 + 6, (r * 2 + 4) * (1 - open))
    g.restore()
    if (open < 0.3) line(g, [[x - r, y + r * 0.35], [x, y + r * 0.6], [x + r, y + r * 0.35]], INK, 7)
  }
}

function brows(g: G, x: number, y: number, gap: number, pose: Pose, colour: string, width = 9): void {
  const lift = -pose.brow * 10, tilt = pose.brow < 0 ? -pose.brow * 9 : -pose.brow * 3
  line(g, [[x - gap - 16, y + lift - tilt], [x - gap + 14, y + lift + tilt]], colour, width)
  line(g, [[x + gap - 14, y + lift + tilt], [x + gap + 16, y + lift - tilt]], colour, width)
}

function mouth(g: G, x: number, y: number, w: number, kind: Mouth, inside: string): void {
  if (kind === 'shut') line(g, [[x - w, y], [x + w, y]], INK, 7)
  else if (kind === 'smile') {
    soft(g, [[x - w * 1.2, y - 6], [x, y - 2], [x + w * 1.2, y - 6], [x + w * 0.7, y + w * 0.9], [x - w * 0.7, y + w * 0.9]], inside)
  } else if (kind === 'grit') {
    g.fillStyle = INK
    g.fillRect(x - w * 1.1, y - 9, w * 2.2, 20)
    g.fillStyle = CREAM
    g.fillRect(x - w * 1.1 + 5, y - 4, w * 2.2 - 10, 10)
  } else {
    const k = kind === 'open' ? 1 : 0.6
    blob(g, x, y + 4, w * k, w * 1.05 * k, inside)
  }
}

const COAT_INK: Record<Coat, readonly [string, string]> = {
  bare: ['', ''],
  mud: [dye('walnut', 2), dye('walnut', 1)],
  jam: [dye('madder', 2), dye('madder', 1)],
  feathers: [dye('ochre', 3), dye('ochre', 1)],
}

/** Mud or jam poured over the top of an outline that is the current clip. */
function pour(g: G, coat: Coat, left: number, right: number, top: number, bottom: number, k: number): void {
  const [light, dark] = COAT_INK[coat]
  const wide = right - left, deep = (bottom - top) * k
  g.fillStyle = light
  g.beginPath()
  g.moveTo(left, top - 30)
  g.lineTo(right, top - 30)
  const drips = 5
  for (let i = drips; i >= 0; i--) {
    const x = left + (wide * i) / drips
    const far = top + deep * (0.62 + 0.38 * Math.abs(Math.sin(i * 2.3 + 0.7)))
    g.lineTo(x + wide * 0.07, top + deep * 0.5)
    g.quadraticCurveTo(x, far * 2 - (top + deep * 0.5), x - wide * 0.07, top + deep * 0.5)
  }
  g.closePath()
  g.fill()
  // Runs of shade, and for jam its shine.
  for (let i = 0; i < 3; i++) {
    const x = left + wide * (0.2 + i * 0.3)
    if (coat === 'jam') blob(g, x, top + deep * 0.22, 9, 13, dye('madder', 3))
    else blob(g, x + 8, top + deep * (0.3 + 0.1 * (i % 2)), 12, 9, dark)
  }
}

/** Tufts round a set of points on the body, sticking outwards. */
function tufts(g: G, points: readonly (readonly [number, number])[], cx: number, cy: number, k: number, size: number): void {
  points.forEach(([x, y], i) => {
    const a = Math.atan2(y - cy, x - cx)
    const long = size * k * (0.85 + 0.3 * ((i * 37) % 10) / 10)
    const nx = -Math.sin(a) * size * 0.42, ny = Math.cos(a) * size * 0.42
    shape(g, [[x - nx, y - ny], [x + Math.cos(a) * long, y + Math.sin(a) * long], [x + nx, y + ny]], i % 2 ? dye('ochre', 3) : dye('cream', 3))
  })
}

function ring(cx: number, cy: number, rx: number, ry: number, n: number, from = 0): (readonly [number, number])[] {
  return Array.from({ length: n }, (_, i) => {
    const a = from + (i / n) * Math.PI * 2
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const
  })
}

/** Long striped underpants on a head: band round the brow, legs up and out like two ears. */
export function underpants(g: G, x: number, y: number, w: number, flop: number): void {
  const leg = (side: -1 | 1) => {
    const bend = flop * 18
    const tip: [number, number] = [x + side * (w * 0.82 + bend), y - w * 1.0 + Math.abs(bend) * 0.6]
    const mid: [number, number] = [x + side * w * 0.46, y - w * 1.32]
    limb(g, [x + side * w * 0.2, y - w * 0.4], mid, tip, dye('cream', 3), w * 0.46)
    line(g, [[tip[0] - side * w * 0.12, tip[1] - w * 0.06], [tip[0] + side * w * 0.16, tip[1] + w * 0.04]], dye('indigo', 1), w * 0.2)
  }
  leg(-1)
  leg(1)
  soft(g, [[x - w * 0.56, y + w * 0.14], [x - w * 0.5, y - w * 0.5], [x, y - w * 0.74], [x + w * 0.5, y - w * 0.5], [x + w * 0.56, y + w * 0.14], [x, y + w * 0.2]], dye('cream', 3))
  for (const i of [-1, 0, 1]) line(g, [[x + i * w * 0.27, y - w * 0.5], [x + i * w * 0.3, y]], dye('indigo', 2), Math.max(5, w * 0.1))
  line(g, [[x - w * 0.52, y + w * 0.12], [x, y + w * 0.16], [x + w * 0.52, y + w * 0.12]], dye('indigo', 1), Math.max(6, w * 0.15))
}

export function balloon(g: G, x: number, y: number, r: number, full = 1): void {
  if (full <= 0.02) return
  blob(g, x, y, r * full, r * 1.16 * full, lit(g, x, y, r * full, dye('violet', 3), dye('violet', 1)))
  shape(g, [[x - 9, y + r * 1.24 * full + 8], [x, y + r * 1.08 * full], [x + 9, y + r * 1.24 * full + 8]], dye('violet', 1))
  blob(g, x - r * 0.36 * full, y - r * 0.46 * full, r * 0.17 * full, r * 0.26 * full, CREAM, 0.4)
}

type Parts = {
  /** Where underpants sit, and how wide. */
  hat: readonly [number, number, number]
  /** Where a string is tied. */
  tie: readonly [number, number]
  behind?(g: G, pose: Pose): void
  body(g: G, pose: Pose): void
  /** The outline a coat runs down, as a path. */
  outline(g: G, pose: Pose): void
  box: readonly [left: number, right: number, top: number, bottom: number]
  tufts(pose: Pose): readonly (readonly [number, number])[]
  middle: readonly [number, number]
  face(g: G, pose: Pose, coat: Coat): void
  over?(g: G, pose: Pose): void
}

/** The goose's head, wherever her neck has put it. */
function gooseHead(pose: Pose): [number, number] {
  const q = pose.quirk
  return q >= 0 ? [lerp(62, 70, q), -252 - q * 46] : [lerp(62, 112, -q), -252 + -q * 150]
}

function grandpaFace(g: G, pose: Pose): void {
  const skin = dye('rose', 2)
  eye(g, -26, -352, 19, pose, skin)
  eye(g, 26, -352, 19, pose, skin)
  brows(g, 0, -384, 27, pose, dye('cream', 2), 14)
  // The moustache: two sails that flutter, curl and droop.
  const q = pose.quirk
  const wide = 92, up = q * 46
  if (pose.mouth === 'open' || pose.mouth === 'round') mouth(g, 0, -296, 26, pose.mouth, INK)
  else if (pose.mouth === 'grit') mouth(g, 0, -298, 24, 'grit', INK)
  for (const side of [-1, 1]) {
    const light = lit(g, side * 40, -318, 90, dye('cream', 3), dye('cream', 2))
    const sail = (d: number): (readonly [number, number])[] => [[0, -332 - d], [side * 40, -340 - d], [side * (wide * 0.86 + d), -330 - up * 0.7 - d], [side * (wide + 10 + d), -316 - up * 1.5], [side * wide * 0.72, -300 - up * 0.5 + d], [side * 34, -296 + d], [0, -312 + d]]
    soft(g, sail(6), dye('walnut', 3))
    soft(g, sail(0), light)
  }
  blob(g, 0, -334, 24, 21, lit(g, 0, -334, 22, dye('rose', 3), dye('rose', 1)))
}

const PARTS: Record<Who, Parts> = {
  goose: {
    hat: [60, -272, 62],
    tie: [-10, -150],
    behind(g, pose) {
      const kick = Math.sin(pose.kick * Math.PI * 2) * 16
      for (const side of [-1, 1]) {
        const x = side * 24 - 8, dx = kick * side
        line(g, [[x, -48], [x + dx, -8]], dye('ochre', 1), 13)
        shape(g, [[x + dx - 12, 0], [x + dx + 2, -16], [x + dx + 34, 0]], dye('ochre', 2))
      }
    },
    body(g, pose) {
      const [hx, hy] = gooseHead(pose)
      const white = lit(g, -14, -104, 112, dye('cream', 3), dye('cream', 1))
      soft(g, [[-96, -138], [-142, -176], [-124, -112], [-92, -82]], dye('cream', 2))
      limb(g, [44, -118], [lerp(18, 84, clamp(-pose.quirk)), lerp(-206, -220, clamp(pose.quirk))], [hx, hy], dye('cream', 2), 46)
      limb(g, [40, -124], [lerp(12, 80, clamp(-pose.quirk)), lerp(-208, -222, clamp(pose.quirk))], [hx - 4, hy], dye('cream', 3), 34)
      blob(g, -18, -100, 102, 68, white, -0.12)
      blob(g, hx, hy, 40, 36, dye('cream', 3))
    },
    outline(g, pose) {
      const [hx, hy] = gooseHead(pose)
      g.beginPath()
      g.ellipse(-18, -100, 102, 68, -0.12, 0, Math.PI * 2)
      g.moveTo(hx + 40, hy)
      g.ellipse(hx, hy, 40, 36, 0, 0, Math.PI * 2)
      g.moveTo(56, -110)
      g.quadraticCurveTo(38, -206, hx + 18, hy)
      g.lineTo(hx - 24, hy)
      g.quadraticCurveTo(-4, -206, 20, -110)
    },
    box: [-126, 108, -292, -36],
    tufts: () => ring(-18, -100, 98, 64, 13, 0.2),
    middle: [-18, -100],
    face(g, pose, coat) {
      const [hx, hy] = gooseHead(pose)
      // Wing.
      soft(g, [[-74, -134], [14, -126], [30, -92], [-30, -66], [-104, -92]], coat === 'bare' || coat === 'feathers' ? dye('cream', 1) : COAT_INK[coat][1])
      soft(g, [[-70, -132], [8, -126], [20, -100], [-30, -80], [-92, -96]], coat === 'bare' || coat === 'feathers' ? dye('cream', 2) : COAT_INK[coat][0])
      const gape = pose.mouth === 'open' ? 17 : pose.mouth === 'smile' ? 8 : pose.mouth === 'round' ? 11 : 0
      shape(g, [[hx + 26, hy - 12], [hx + 96, hy + 4 - gape * 0.5], [hx + 28, hy + 10]], dye('ochre', 2))
      shape(g, [[hx + 26, hy + 8], [hx + 84, hy + 10 + gape], [hx + 24, hy + 22]], dye('ochre', 1))
      if (gape) shape(g, [[hx + 30, hy + 9], [hx + 78, hy + 8 + gape * 0.4], [hx + 30, hy + 14 + gape * 0.3]], INK)
      eye(g, hx + 8, hy - 8, 15, pose, dye('cream', 2))
      const b = pose.brow
      line(g, [[hx - 10, hy - 28 - b * 8 - (b < 0 ? -b * 5 : 0)], [hx + 24, hy - 28 - b * 8 + (b < 0 ? -b * 9 : 0)]], INK, 8)
    },
  },
  pig: {
    hat: [2, -166, 92],
    tie: [0, -176],
    behind(g, pose) {
      const kick = Math.sin(pose.kick * Math.PI * 2) * 12
      ;[-62, -24, 28, 64].forEach((x, i) => {
        const dx = kick * (i % 2 ? 1 : -1)
        line(g, [[x, -44], [x + dx, -14]], dye('rose', i % 3 ? 1 : 2), 30)
        g.fillStyle = dye('walnut', 1)
        g.fillRect(x + dx - 15, -10, 30, 11)
      })
      limb(g, [-104, -110], [-150, -152], [-126, -92], dye('rose', 1), 12)
    },
    body(g) {
      blob(g, 0, -100, 116, 88, lit(g, 0, -100, 116, dye('rose', 3), dye('rose', 1)))
    },
    outline(g) {
      g.beginPath()
      g.ellipse(0, -100, 116, 88, 0, 0, Math.PI * 2)
    },
    box: [-116, 116, -188, -20],
    tufts: () => ring(0, -100, 112, 84, 15),
    middle: [0, -100],
    face(g, pose) {
      const q = pose.quirk * 22
      soft(g, [[-82, -158], [-92, -206 + q], [-36, -176]], dye('rose', 1))
      soft(g, [[82, -158], [92, -206 + q], [36, -176]], dye('rose', 1))
      blob(g, 4, -92, 46, 34, dye('rose', 1))
      blob(g, 4, -96, 44, 31, dye('rose', 2))
      blob(g, -10, -94, 8, 12, INK)
      blob(g, 18, -94, 8, 12, INK)
      eye(g, -40, -136, 17, pose, dye('rose', 2))
      eye(g, 44, -136, 17, pose, dye('rose', 2))
      brows(g, 2, -164, 42, pose, dye('rose', 0))
      if (pose.mouth !== 'shut') mouth(g, 4, -46, 24, pose.mouth, dye('madder', 0))
      else line(g, [[-18, -48], [4, -42], [26, -48]], dye('rose', 0), 7)
    },
  },
  granny: {
    hat: [0, -236, 88],
    tie: [0, -160],
    behind(g, pose) {
      const kick = Math.sin(pose.kick * Math.PI * 2) * 18
      for (const side of [-1, 1]) {
        line(g, [[side * 26, -40], [side * 26 + kick * side, -8]], dye('walnut', 2), 16)
        blob(g, side * 28 + kick * side + 6, -6, 24, 12, dye('walnut', 0))
      }
    },
    body(g, pose) {
      const blue = g.createLinearGradient(-100, 0, 110, 0)
      blue.addColorStop(0, dye('indigo', 2))
      blue.addColorStop(1, dye('indigo', 0))
      shape(g, [[-46, -176], [46, -176], [98, -18], [-98, -18]], blue)
      shape(g, [[-28, -130], [30, -130], [48, -22], [-46, -22]], dye('cream', 2))
      line(g, [[-92, -22], [92, -22]], dye('madder', 2), 8)
      blob(g, 0, -222, 52, 52, lit(g, 0, -222, 52, dye('rose', 3), dye('rose', 2)))
      // Hair, and the bun that has a mind of its own.
      soft(g, [[-56, -226], [-44, -276], [0, -284], [44, -276], [56, -226], [30, -258], [-30, -258]], dye('cream', 1))
      blob(g, pose.quirk * 22, -290 - Math.abs(pose.quirk) * 12, 27, 23, dye('cream', 1))
      blob(g, pose.quirk * 22 - 7, -296 - Math.abs(pose.quirk) * 12, 11, 9, dye('cream', 2))
    },
    outline(g) {
      g.beginPath()
      g.moveTo(-46, -176)
      g.lineTo(46, -176)
      g.lineTo(98, -18)
      g.lineTo(-98, -18)
      g.closePath()
      g.moveTo(52, -222)
      g.ellipse(0, -222, 54, 60, 0, 0, Math.PI * 2)
    },
    box: [-92, 92, -300, -24],
    tufts: () => [[-92, -30], [-80, -66], [-68, -102], [-56, -138], [-52, -180], [-56, -222], [-40, -262], [0, -282], [40, -262], [56, -222], [52, -180], [56, -138], [68, -102], [80, -66], [92, -30]],
    middle: [0, -120],
    face(g, pose, coat) {
      const sleeve = coat === 'mud' || coat === 'jam' ? COAT_INK[coat][1] : dye('indigo', 1)
      limb(g, [-46, -160], [-66, -116], [22, -114], sleeve, 26)
      limb(g, [46, -160], [66, -106], [-18, -104], dye('indigo', 2), 26)
      blob(g, -26, -104, 14, 12, dye('rose', 3))
      eye(g, -22, -226, 16, pose, dye('rose', 2))
      eye(g, 24, -226, 16, pose, dye('rose', 2))
      for (const x of [-22, 24]) {
        g.beginPath()
        g.ellipse(x, -226, 21, 21, 0, 0, Math.PI * 2)
        g.strokeStyle = dye('walnut', 1)
        g.lineWidth = 6
        g.stroke()
      }
      brows(g, 1, -254, 23, pose, dye('walnut', 2), 8)
      blob(g, 1, -206, 9, 9, dye('rose', 1))
      mouth(g, 1, -189, pose.mouth === 'shut' ? 14 : 15, pose.mouth, dye('madder', 0))
    },
  },
  grandpa: {
    hat: [0, -392, 112],
    tie: [-110, -270],
    behind(g) {
      // The armchair, as big as a cart.
      const green = lit(g, -20, -180, 240, dye('sage', 2), dye('sage', 0))
      soft(g, [[-138, -30], [-150, -250], [-120, -366], [0, -392], [120, -366], [150, -250], [138, -30]], green)
      for (const side of [-1, 1]) {
        g.fillStyle = dye('walnut', 1)
        g.fillRect(side * 112 - 14, -22, 28, 24)
      }
    },
    body(g) {
      // Legs out front, belly, waistcoat.
      for (const side of [-1, 1]) {
        line(g, [[side * 52, -90], [side * 66, -26]], dye('walnut', 2), 54)
        soft(g, [[side * 36, -22], [side * 70, -44], [side * 118, -22], [side * 116, 4], [side * 34, 4]], dye('madder', 1))
      }
      blob(g, 0, -180, 118, 112, lit(g, 0, -190, 118, dye('cream', 3), dye('cream', 1)))
      soft(g, [[-112, -220], [-64, -286], [-30, -270], [-14, -120], [-60, -74], [-118, -130]], lit(g, -70, -190, 90, dye('madder', 2), dye('madder', 1)))
      soft(g, [[112, -220], [64, -286], [30, -270], [14, -120], [60, -74], [118, -130]], dye('madder', 1))
      for (const y of [-232, -192, -152]) blob(g, -27, y, 7, 7, dye('ochre', 2))
      // Head: bald, with a tuft over each ear.
      for (const side of [-1, 1]) {
        blob(g, side * 74, -346, 24, 30, dye('cream', 2))
        blob(g, side * 66, -340, 16, 20, dye('rose', 1))
      }
      blob(g, 0, -348, 72, 78, lit(g, 0, -356, 76, dye('rose', 3), dye('rose', 2)))
    },
    outline(g) {
      g.beginPath()
      g.ellipse(0, -190, 120, 120, 0, 0, Math.PI * 2)
      g.moveTo(72, -348)
      g.ellipse(0, -348, 74, 80, 0, 0, Math.PI * 2)
    },
    box: [-122, 122, -428, -70],
    tufts: () => [...ring(0, -190, 116, 112, 15, 0.1), ...ring(0, -352, 72, 74, 7, Math.PI * 1.05).slice(0, 4)],
    middle: [0, -240],
    face: (g, pose) => grandpaFace(g, pose),
    over(g) {
      // The arms of the chair.
      for (const side of [-1, 1]) {
        soft(g, [[side * 104, -34], [side * 100, -168], [side * 132, -186], [side * 164, -164], [side * 160, -34]], lit(g, side * 130, -150, 110, dye('sage', 2), dye('sage', 1)))
        blob(g, side * 132, -164, 32, 22, dye('sage', 3))
      }
    },
  },
  moon: {
    hat: [0, -44, 84],
    tie: [-58, -8],
    body(g) {
      blob(g, 0, 0, 72, 70, lit(g, -8, -8, 72, dye('ochre', 3), dye('ochre', 2)))
      blob(g, 34, 26, 13, 10, dye('ochre', 2))
      blob(g, -44, 22, 9, 8, dye('ochre', 2))
    },
    outline(g) {
      g.beginPath()
      g.ellipse(0, 0, 72, 70, 0, 0, Math.PI * 2)
    },
    box: [-72, 72, -72, 64],
    tufts: () => ring(0, 0, 70, 68, 14),
    middle: [0, 0],
    face(g, pose) {
      eye(g, -24, -8, 16, pose, dye('ochre', 2))
      eye(g, 26, -8, 16, pose, dye('ochre', 2))
      brows(g, 1, -34, 25, pose, dye('ochre', 0), 8)
      blob(g, 0, 12, 9, 8, dye('ochre', 1))
      if (pose.quirk > 0.05) {
        // Blushing.
        blob(g, -46, 14, 14 * pose.quirk, 9 * pose.quirk, dye('madder', 3))
        blob(g, 48, 14, 14 * pose.quirk, 9 * pose.quirk, dye('madder', 3))
      }
      mouth(g, 1, 34, 18, pose.mouth, dye('madder', 0))
    },
  },
}

const PUPPET_COAT: Record<Who, number> = { goose: 0.6, pig: 0.55, granny: 0.22, grandpa: 0.22, moon: 0.45 }

/** Where the goose's head is, for a hat and a throw. */
function hatOf(who: Who, pose: Pose): readonly [number, number, number] {
  if (who !== 'goose') return PARTS[who].hat
  const [x, y] = gooseHead(pose)
  return [x - 2, y - 22, 66]
}

export function paintFigure(g: G, who: Who, pose: Pose, worn: Worn, t: number, was: Coat = 'bare', puppet = false, filling = false): void {
  const parts = PARTS[who]
  g.save()
  g.translate(pose.x, pose.y)
  g.rotate(pose.turn)
  g.scale(pose.sx, pose.sy)
  const [tx, ty] = parts.tie
  if (worn.up && !puppet) {
    const sway = Math.sin(t * 1.3 + tx) * 12
    limb(g, [tx, ty], [tx - sway, ty - 40], [tx + sway, ty - (who === 'moon' ? 40 : BALLOON_UP)], dye('walnut', 1), 6)
  }
  if (!(puppet && who === 'grandpa')) parts.behind?.(g, pose)
  parts.body(g, pose)
  if (puppet && who === 'grandpa') {
    // The yard's Grandpa has arms of his own, painted over him; a puppet's hang.
    for (const side of [-1, 1]) {
      limb(g, [side * 92, -246], [side * 168, -210], [side * 136, -120], dye('cream', 2), 44)
      blob(g, side * 134, -114, 26, 24, dye('rose', 2))
    }
  }
  const [left, right, top, bottom] = parts.box
  const show = (coat: Coat, k: number) => {
    if (coat === 'mud' || coat === 'jam') {
      g.save()
      parts.outline(g, pose)
      g.clip()
      pour(g, coat, left, right, top, bottom, k)
      g.restore()
    } else if (coat === 'feathers') tufts(g, parts.tufts(pose), parts.middle[0], parts.middle[1], k, who === 'moon' ? 22 : 30)
  }
  if (pose.coated < 1 && was !== 'bare') show(was, worn.coat === 'bare' ? 1 - pose.coated : 1)
  // A puppet is small: its coat stops above the face, so that it can be told who it is.
  if (worn.coat !== 'bare') show(worn.coat, pose.coated * (puppet && worn.coat !== 'feathers' ? PUPPET_COAT[who] : 1))
  parts.face(g, pose, worn.coat)
  if (worn.pants) {
    const [hx, hy, w] = hatOf(who, pose)
    underpants(g, hx, hy, w, Math.sin(t * 2.1 + left) * 0.35 + pose.turn * 3 + pose.y * 0.01)
  }
  if (!(puppet && who === 'grandpa')) parts.over?.(g, pose)
  if (worn.up && !puppet) {
    const sway = Math.sin(t * 1.3 + tx) * 12
    balloon(g, tx + sway, ty - (who === 'moon' ? 62 : BALLOON_UP + 46), who === 'moon' ? 26 : 42, filling ? clamp(pose.coated) : 1)
  }
  g.restore()
}

/** How long a string is for anyone on the ground's side of the sky. */
const BALLOON_UP = 118



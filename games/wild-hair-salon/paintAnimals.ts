import { BESIDE_X, COLLAR_Y, FLOOR_Y, FRIEND_HEAD, HEAD, STOOL } from './layout'
import { dot } from './paintRoom'
import type { Rng } from './rng'
import { PAPER, blob, lift, type Ctx, type Point, type Watercolour } from './wash'

// The two characters of the spike: the lion in the chair and the poodle who
// is his model. They carry the look: wet washes with blooms, pooled edges
// and a pencil face. Their locks are not painted here; those are plain strips
// (paintStrips.ts).

export const LION = {
  fur: '#f3c668', furEdge: '#cf9a36', mane: '#ee8232', maneBloom: '#cf4f1f', maneGlow: '#f8b04a', maneEdge: '#b9501d',
  nose: '#b5532d', blush: '#f29a8a', lock: '#e96a2a', lockEdge: '#a9441a',
} as const

export const POODLE = {
  fur: '#f8dfe2', furEdge: '#dca6b4', pom: '#f09ab8', pomBloom: '#dd6394', pomEdge: '#c25a86',
  lock: '#e4588c', lockEdge: '#a8366a',
} as const

/** One tuft of a mane: a flame of hair that leaves the head at an angle, as long as its length says, hooked to one side at its tip. */
export function plume(baseX: number, baseY: number, angle: number, length: number, width: number, curl: number): Point[] {
  const dx = Math.sin(angle), dy = -Math.cos(angle), nx = Math.cos(angle), ny = Math.sin(angle)
  const at = (along: number, across: number): Point => {
    const bend = curl * along * along * length
    return { x: baseX + dx * along * length + nx * (across + bend), y: baseY + dy * along * length + ny * (across + bend) }
  }
  const w = width / 2, hook = Math.sign(curl || 1) * w * 0.5
  return [
    at(-0.12, -w * 0.9), at(0.22, -w * 1.15), at(0.55, -w * 0.7), at(0.82, -w * 0.34 + hook * 0.4), at(1, hook),
    at(0.86, w * 0.2 + hook * 0.5), at(0.6, w * 0.62), at(0.26, w * 1.1), at(-0.12, w * 0.9),
  ]
}

/** The nine tufts of a mane, from the left cheek over the top to the right cheek. Lengths are in steps, 4 to 100. */
export function manePlumes(rng: Rng, lengths: readonly number[]): Point[][] {
  return lengths.map((steps, i) => {
    const t = lengths.length === 1 ? 0.5 : i / (lengths.length - 1)
    const angle = (-108 + t * 216) * (Math.PI / 180)
    const baseX = HEAD.x + Math.sin(angle) * HEAD.rx * 0.82, baseY = HEAD.y - Math.cos(angle) * HEAD.ry * 0.82
    return plume(baseX, baseY, angle + rng.range(-0.22, 0.22), 40 + steps * 1.3, rng.range(84, 104), rng.pick([-1, 1]) * rng.range(0.18, 0.42))
  })
}

export function paintLion(g: Ctx, paint: Watercolour, rng: Rng, mane: readonly number[]): void {
  // The tail, out from under the cape, with its tuft.
  paint.pencil(g, [{ x: 322, y: FLOOR_Y - 20 }, { x: 268, y: FLOOR_Y - 46 }, { x: 250, y: FLOOR_Y - 108 }, { x: 276, y: FLOOR_Y - 150 }], false, 1.6)
  paint.wash(g, plume(276, FLOOR_Y - 146, 0.5, 66, 52, 0.3), { color: LION.mane, edge: LION.maneEdge, blooms: [LION.maneBloom], reserve: true })

  // The mane goes down first: a shaggy ruff round the head, then the nine tufts over it, each wet enough to bloom.
  const ruff = blob(rng, HEAD.x, HEAD.y + 4, HEAD.rx + 30, HEAD.ry + 24, 0.09, 22)
  const plumes = manePlumes(rng, mane)
  lift(g, ruff)
  for (const tuft of plumes) lift(g, tuft)
  paint.wash(g, ruff, { color: LION.mane, edge: LION.maneEdge, blooms: [LION.maneGlow, LION.maneBloom], strength: 0.78 })
  for (const tuft of plumes) paint.wash(g, tuft, { color: LION.mane, edge: LION.maneEdge, blooms: [LION.maneBloom, LION.maneGlow], strength: 0.82 })
  // Two strands in pencil up each tuft from its root, either side of the middle, as hair is drawn and a leaf is not.
  for (const tuft of plumes) {
    paint.pencil(g, [mid(tuft[0], mid(tuft[0], tuft[8])), mid(tuft[1], mid(tuft[1], tuft[7])), mid(tuft[2], mid(tuft[2], tuft[6]))], false, 0.55)
    paint.pencil(g, [mid(tuft[8], mid(tuft[0], tuft[8])), mid(tuft[7], mid(tuft[1], tuft[7])), mid(tuft[6], mid(tuft[2], tuft[6]))], false, 0.55)
  }

  for (const side of [-1, 1]) {
    const ear = blob(rng, HEAD.x + side * 78, HEAD.y - 74, 30, 28, 0.05, 10)
    paint.wash(g, ear, { color: LION.fur, edge: LION.furEdge, blooms: [LION.blush], reserve: true })
    paint.pencil(g, ear, true, 0.8)
  }
  // The face is a patch of paper put back over the mane, then one warm wash.
  const face = blob(rng, HEAD.x, HEAD.y, HEAD.rx, HEAD.ry, 0.035, 18)
  paint.wash(g, face, { color: LION.fur, edge: LION.furEdge, blooms: [LION.blush, LION.maneGlow], strength: 0.9, grain: 0.14, reserve: true })
  paint.pencil(g, face, true)

  // He looks down at the two locks.
  for (const side of [-1, 1]) {
    const ex = HEAD.x + side * 40, ey = HEAD.y - 14
    dot(g, ex + 4, ey + 4, 12)
    glint(g, ex + 1, ey - 1, 4)
    paint.pencil(g, [{ x: ex - 17, y: ey - 27 - side * 5 }, { x: ex, y: ey - 33 }, { x: ex + 17, y: ey - 27 + side * 5 }], false, 1.2)
    paint.wash(g, blob(rng, HEAD.x + side * 66, HEAD.y + 22, 20, 14, 0.06, 8), { color: LION.blush, strength: 0.5 })
  }
  const nose: Point[] = [{ x: HEAD.x - 15, y: HEAD.y + 18 }, { x: HEAD.x, y: HEAD.y + 14 }, { x: HEAD.x + 15, y: HEAD.y + 18 }, { x: HEAD.x + 6, y: HEAD.y + 31 }, { x: HEAD.x, y: HEAD.y + 34 }, { x: HEAD.x - 6, y: HEAD.y + 31 }]
  paint.wash(g, nose, { color: LION.nose, strength: 0.95 })
  // A small worried mouth: he has seen that his lock is the longer one.
  paint.pencil(g, [{ x: HEAD.x, y: HEAD.y + 34 }, { x: HEAD.x, y: HEAD.y + 46 }], false, 1.1)
  paint.pencil(g, [{ x: HEAD.x - 20, y: HEAD.y + 56 }, { x: HEAD.x - 8, y: HEAD.y + 47 }, { x: HEAD.x, y: HEAD.y + 46 }, { x: HEAD.x + 9, y: HEAD.y + 48 }, { x: HEAD.x + 20, y: HEAD.y + 57 }], false, 1.2)
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) dot(g, HEAD.x + side * (34 + i * 9), HEAD.y + 40 + (i % 2) * 6, 1.6)
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** A touch of white in an eye. */
function glint(g: Ctx, x: number, y: number, r: number): void {
  g.save()
  g.fillStyle = PAPER
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** A pom: a cloud of curls. */
function pom(g: Ctx, paint: Watercolour, rng: Rng, x: number, y: number, r: number): void {
  const cloud = blob(rng, x, y, r, r * 0.94, 0.11, 13)
  paint.wash(g, cloud, { color: POODLE.pom, edge: POODLE.pomEdge, blooms: [POODLE.pomBloom, POODLE.fur], strength: 0.85, reserve: true })
  // A few loose curls in pencil.
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, Math.PI * 2), d = r * rng.range(0.15, 0.6), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, c = r * 0.2
    paint.pencil(g, [{ x: cx - c, y: cy }, { x: cx, y: cy - c }, { x: cx + c, y: cy }, { x: cx, y: cy + c * 0.6 }], false, 0.6)
  }
}

export function paintPoodle(g: Ctx, paint: Watercolour, rng: Rng): void {
  const h = FRIEND_HEAD
  // She stands on the stool, leaning in until the two cheeks touch.
  pom(g, paint, rng, STOOL.x + 62, STOOL.seatY - 62, 24)
  const body = blob(rng, STOOL.x + 6, STOOL.seatY - 78, 44, 66, 0.04, 12)
  paint.wash(g, body, { color: POODLE.fur, edge: POODLE.furEdge, blooms: [POODLE.pom], reserve: true })
  paint.pencil(g, body, true, 0.8)
  for (const side of [-1, 1]) {
    paint.wash(g, [{ x: STOOL.x + side * 20 - 8, y: STOOL.seatY - 26 }, { x: STOOL.x + side * 20 + 8, y: STOOL.seatY - 26 }, { x: STOOL.x + side * 22 + 7, y: STOOL.seatY - 4 }, { x: STOOL.x + side * 22 - 7, y: STOOL.seatY - 4 }], { color: POODLE.fur, edge: POODLE.furEdge, sharp: true, reserve: true })
    pom(g, paint, rng, STOOL.x + side * 23, STOOL.seatY - 6, 15)
  }
  // Her lock comes round from behind her ear to her paw, and hangs from there as a plain strip (paintStrips.ts).
  const band: Point[] = [{ x: h.x - 52, y: h.y + 44 }, { x: h.x - 78, y: h.y + 70 }, { x: BESIDE_X + 10, y: COLLAR_Y - 2 }, { x: BESIDE_X - 6, y: COLLAR_Y - 12 }, { x: h.x - 84, y: h.y + 52 }, { x: h.x - 60, y: h.y + 30 }]
  paint.wash(g, band, { color: POODLE.lock, edge: POODLE.lockEdge, flat: true })
  // The arm that holds the top of her lock at the collar line, beside his.
  const arm: Point[] = [{ x: STOOL.x - 22, y: COLLAR_Y + 4 }, { x: STOOL.x - 24, y: COLLAR_Y + 26 }, { x: BESIDE_X + 6, y: COLLAR_Y + 12 }, { x: BESIDE_X + 4, y: COLLAR_Y - 6 }]
  paint.wash(g, arm, { color: POODLE.fur, edge: POODLE.furEdge, reserve: true })
  pom(g, paint, rng, BESIDE_X + 1, COLLAR_Y - 1, 17)

  // Ears, then the face over them, then the top-knot.
  pom(g, paint, rng, h.x - 62, h.y + 26, 34)
  pom(g, paint, rng, h.x + 64, h.y + 22, 34)
  const face = blob(rng, h.x, h.y, h.rx, h.ry, 0.035, 16)
  paint.wash(g, face, { color: POODLE.fur, edge: POODLE.furEdge, blooms: [LION.blush], grain: 0.12, reserve: true })
  paint.pencil(g, face, true)
  pom(g, paint, rng, h.x + 4, h.y - 68, 44)
  for (const side of [-1, 1]) {
    dot(g, h.x + side * 24 - 6, h.y - 6, 7)
    glint(g, h.x + side * 24 - 8, h.y - 9, 2.4)
  }
  dot(g, h.x - 8, h.y + 18, 8)
  paint.pencil(g, [{ x: h.x - 28, y: h.y + 30 }, { x: h.x - 14, y: h.y + 40 }, { x: h.x - 2, y: h.y + 36 }, { x: h.x + 8, y: h.y + 28 }], false, 1.2)
}

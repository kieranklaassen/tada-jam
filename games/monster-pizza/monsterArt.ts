import { CHARACTERS, type Customer } from './customers'
import { INK, colourIn, figure, line, outline, plain, solid, sprite, stamp, type Pen, type Sprite } from './marker'
import { restPose, type Pose } from './pose'
import { makeRng, seedFrom } from './rng'
import { bounds, ellipse, smooth, type Ring } from './shapes'

// How each customer is drawn. A customer stands with its feet at (0, 0) and
// grows upwards, so y is negative up its body. The coloured-in body is drawn
// once into a sprite; eyes, mouth, arms and the funniest part are pen lines
// drawn each frame from the pose, so they can move.

export { restPose, type Pose }

function bodyRing(who: Customer): Ring {
  const { halfWidth: W, height: H } = CHARACTERS[who]
  switch (who) {
    case 'bim':
      return smooth([-0.86 * W, 20, -1.0 * W, -0.5 * H, -0.62 * W, -0.94 * H, 0, -H, 0.62 * W, -0.94 * H, 1.0 * W, -0.5 * H, 0.86 * W, 20], 5)
    case 'grum':
      return smooth([-0.84 * W, 20, -1.0 * W, -0.36 * H, -0.74 * W, -0.8 * H, -0.3 * W, -H, 0.3 * W, -H, 0.74 * W, -0.8 * H, 1.0 * W, -0.36 * H, 0.84 * W, 20], 5)
    case 'fizz':
      return smooth([-0.9 * W, 20, -0.86 * W, -0.3 * H, -0.44 * W, -0.44 * H, -0.4 * W, -0.68 * H, -0.86 * W, -0.84 * H, -0.5 * W, -H, 0.5 * W, -H, 0.86 * W, -0.84 * H, 0.4 * W, -0.68 * H, 0.44 * W, -0.44 * H, 0.86 * W, -0.3 * H, 0.9 * W, 20], 4)
    case 'mops': {
      // Fur: the outline goes in and out all the way round.
      const ring = ellipse(0, -0.48 * H, W, 0.56 * H, 44)
      for (let i = 0; i < ring.length; i += 2) {
        const k = (i / 2) % 2 === 0 ? 1.05 : 0.95
        ring[i] *= k
        ring[i + 1] = -0.48 * H + (ring[i + 1] + 0.48 * H) * k
      }
      return ring
    }
    case 'ooze':
      return smooth([-0.7 * W, 20, -1.02 * W, -0.06 * H, -0.84 * W, -0.3 * H, -1.0 * W, -0.52 * H, -0.6 * W, -0.9 * H, -0.2 * W, -0.86 * H, 0.1 * W, -H, 0.56 * W, -0.9 * H, 0.98 * W, -0.56 * H, 0.86 * W, -0.26 * H, 1.04 * W, -0.04 * H, 0.72 * W, 20], 5)
  }
}

/** Where the eyes sit, in its own units, and how big they are. */
function eyes(who: Customer): { x: number; y: number; r: number }[] {
  const { halfWidth: W, height: H } = CHARACTERS[who]
  switch (who) {
    case 'bim':
      return [{ x: 0, y: -H - 74, r: 36 }]
    case 'grum':
      return [{ x: -0.2 * W, y: -0.82 * H, r: 20 }, { x: 0.2 * W, y: -0.82 * H, r: 20 }]
    case 'fizz':
      return [{ x: -0.34 * W, y: -0.88 * H, r: 19 }, { x: 0.34 * W, y: -0.88 * H, r: 19 }]
    case 'mops':
      return [{ x: -0.34 * W, y: -0.66 * H, r: 24 }, { x: 0.34 * W, y: -0.66 * H, r: 24 }]
    case 'ooze':
      return [{ x: -0.36 * W, y: -0.8 * H, r: 25 }, { x: 0.3 * W, y: -0.86 * H, r: 30 }]
  }
}

export type CustomerSprites = { body: Sprite }

/** Draws the parts of a customer that never change shape, once, at `density` device pixels to a unit. */
export function customerSprites(who: Customer, density: number): CustomerSprites {
  const c = CHARACTERS[who]
  const ring = bodyRing(who)
  const seed = seedFrom(who)
  const body = sprite(bounds(ring), density, 30, (g) => {
    const rng = makeRng(seed)
    colourIn(g, ring, c.body, rng, who === 'grum' ? 0.35 : -0.5, 17)
    // The paler patch on its front, coloured in the other way.
    const patch = who === 'fizz' ? ellipse(0, -0.2 * c.height, 0.5 * c.halfWidth, 0.14 * c.height) : ellipse(0, -0.24 * c.height, 0.56 * c.halfWidth, 0.2 * c.height)
    g.save()
    g.globalCompositeOperation = 'source-over'
    solid(g, patch, c.patch)
    g.restore()
    line(g, patch.slice(0, patch.length / 2 + 4), rng, 4, INK)
    outline(g, ring, rng, 7)
  })
  return { body }
}

function eye(g: Pen, x: number, y: number, r: number, pose: Pose): void {
  const open = Math.max(0.08, 1 - pose.blink)
  g.save()
  g.translate(x, y)
  g.scale(1, open)
  plain(g, ellipse(0, 0, r, r, 18), '#ffffff', 5)
  solid(g, ellipse(pose.lookX * r * 0.42, pose.lookY * r * 0.42, r * 0.44, r * 0.44, 12), INK)
  g.restore()
}

function mouth(g: Pen, who: Customer, pose: Pose): void {
  const c = CHARACTERS[who]
  const y = -c.mouthAt * c.height
  const w = c.halfWidth * (who === 'fizz' ? 0.36 : 0.5)
  const rng = makeRng(seedFrom(who) + 7)
  if (pose.mouth < 0.06) {
    line(g, [-w, y - 4, -w * 0.4, y + 12, w * 0.4, y + 12, w, y - 4], rng, 6)
    return
  }
  const h = 10 + pose.mouth * w * 0.9
  const hole = smooth([-w, y, -w * 0.5, y + h, w * 0.5, y + h, w, y, w * 0.4, y - h * 0.16, -w * 0.4, y - h * 0.16], 4)
  plain(g, hole, '#5c1f33', 6)
  if (pose.tongue > 0.02) {
    const out = pose.tongue * c.height * (c.funniest === 'tongue' ? 0.62 : 0.3)
    plain(g, smooth([-w * 0.42, y + h * 0.5, -w * 0.36, y + h * 0.6 + out, 0, y + h * 0.7 + out * 1.08, w * 0.36, y + h * 0.6 + out, w * 0.42, y + h * 0.5], 4), '#ff7d9c', 5)
  }
  // Two blunt teeth: a monster, and a friendly one.
  solid(g, [-w * 0.5, y - 2, -w * 0.22, y - 2, -w * 0.36, y + h * 0.3], '#ffffff')
  solid(g, [w * 0.5, y - 2, w * 0.22, y - 2, w * 0.36, y + h * 0.3], '#ffffff')
}

function arm(g: Pen, who: Customer, side: -1 | 1, hand: { x: number; y: number } | null): void {
  const c = CHARACTERS[who]
  const sx = side * c.halfWidth * 0.86, sy = -c.height * (who === 'fizz' ? 0.36 : 0.44)
  // At rest a hand lies on the counter's edge.
  const to = hand ?? { x: side * (c.halfWidth + 22), y: -34 }
  const rng = makeRng(seedFrom(who) + 11 + side)
  const mx = (sx + to.x) / 2 + side * 14, my = Math.max(sy, to.y) + 26
  line(g, [sx, sy, mx, my, to.x, to.y], rng, 9, INK)
  plain(g, ellipse(to.x, to.y, 15, 15, 12), c.body, 5)
}

/** The part of each customer that overdoes everything. */
function funniest(g: Pen, who: Customer, pose: Pose, under: boolean): void {
  const c = CHARACTERS[who]
  const rng = makeRng(seedFrom(who) + 3)
  const W = c.halfWidth, H = c.height, p = pose.part
  if (who === 'bim' && under) line(g, [0, -H + 6, p * 26, -H - 30, p * 8, -H - 52], rng, 8)
  if (who === 'grum' && !under) {
    figure(g, [-0.5 * W, -0.96 * H, -0.42 * W, -1.12 * H - p * 8, -0.28 * W, -0.99 * H], '#fff2c9', rng, 0.4, 5, 8)
    figure(g, [0.5 * W, -0.96 * H, 0.42 * W, -1.12 * H - p * 8, 0.28 * W, -0.99 * H], '#fff2c9', rng, 0.4, 5, 8)
  }
  if (who === 'fizz' && under) {
    for (const k of [-1, 0, 1]) {
      const tx = k * 0.5 * W + p * 14 * (k + 0.5), ty = -H - 62 + Math.abs(k) * 14
      line(g, [k * 0.26 * W, -H + 6, (k * 0.3 * W + tx) / 2 + 6, -H - 30, tx, ty], rng, 6)
      plain(g, ellipse(tx, ty, 10, 10, 10), '#ffd21f', 4)
    }
  }
  if (who === 'mops' && !under) {
    for (const side of [-1, 1]) {
      const lift = p * 0.9
      const ex = side * (0.8 * W + lift * 20), ey = -0.86 * H - lift * 70
      figure(g, smooth([side * 0.62 * W, -0.92 * H, ex + side * 30, ey - 6, ex + side * 46, ey + 80 - lift * 60, ex + side * 12, ey + 96 - lift * 70], 4), c.body, rng, side * 0.6, 6, 12)
    }
  }
}

function place(g: Pen, x: number, y: number, size: number, pose: Pose): void {
  g.translate(x, y)
  g.scale(size, size)
  g.translate(0, -pose.lift)
  g.rotate(pose.lean)
  g.scale(pose.sx, pose.sy)
}

/**
 * Draws one customer with its feet at (x, y), `size` times its own size: the
 * body and the face. The view clips this at the counter, so the feet are
 * behind it. Returns how many figures it drew, for the grown-up handle.
 */
export function drawCustomer(g: Pen, who: Customer, sprites: CustomerSprites, x: number, y: number, size: number, pose: Pose): number {
  g.save()
  place(g, x, y, size, pose)
  funniest(g, who, pose, true)
  stamp(g, sprites.body)
  funniest(g, who, pose, false)
  for (const e of eyes(who)) eye(g, e.x + (who === 'bim' ? pose.part * 8 : 0), e.y, e.r, pose)
  mouth(g, who, pose)
  g.restore()
  return 4
}

/** The arms, drawn after the counter so a hand can reach over it onto the table. */
export function drawArms(g: Pen, who: Customer, x: number, y: number, size: number, pose: Pose): number {
  g.save()
  place(g, x, y, size, pose)
  arm(g, who, -1, pose.handL)
  arm(g, who, 1, pose.handR)
  g.restore()
  return 2
}

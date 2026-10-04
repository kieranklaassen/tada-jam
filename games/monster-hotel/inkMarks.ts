// The marks the toy lays over the page, each drawn afresh every frame as a few
// pen strokes: the glow on what can be touched, the rough edge of a sweep, a
// knock on a wall, and the shadow under a guest that is being carried.

import { fixed } from './inkAirs'
import { INK, PAPER, SPOT } from './inkHatch'

const TAU = Math.PI * 2

/**
 * The glow: a ring of short pen strokes in the spot colour, radiating, over a
 * thin halo of bare paper so that it reads on dense hatching as well as on
 * the page. It breathes slowly. No blur and no gradient.
 */
export function glowRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, strength: number, seconds: number, seed: number, u: number): void {
  if (strength <= 0.02) return
  const count = Math.max(14, Math.round((rx + ry) / (6.5 * u)))
  const breath = 0.5 + 0.5 * Math.sin(seconds * 1.7 + seed)
  const trace = () => {
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + seed * 0.37, c = Math.cos(a), s = Math.sin(a)
      // Long and short by turns, and all of them a little longer on the in-breath.
      const length = (i % 2 ? 6 : 11) * u * strength * (0.65 + 0.35 * breath) * (0.85 + 0.3 * fixed(seed, i))
      const out = (2 + 3 * breath) * u
      ctx.moveTo(cx + c * (rx + out), cy + s * (ry + out))
      ctx.lineTo(cx + c * (rx + out + length), cy + s * (ry + out + length))
    }
  }
  trace()
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 6 * u
  ctx.stroke()
  trace()
  ctx.strokeStyle = SPOT
  ctx.lineWidth = 2.3 * u
  ctx.stroke()
}

/** A knock: three short curved strokes round the point, widening and thinning over half a second. */
export function knockMarks(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, u: number): boolean {
  const t = age / 0.5
  if (t < 0 || t >= 1) return false
  ctx.beginPath()
  for (const [index, heading] of [-2.5, -1.57, -0.64].entries()) {
    const r = (12 + 30 * t + index % 2 * 3) * u, half = 0.34 + 0.2 * t
    ctx.moveTo(x + Math.cos(heading - half) * r, y + Math.sin(heading - half) * r)
    ctx.arc(x, y, r, heading - half, heading + half)
    const inner = r - 6 * u
    ctx.moveTo(x + Math.cos(heading - half * 0.6) * inner, y + Math.sin(heading - half * 0.6) * inner)
    ctx.arc(x, y, inner, heading - half * 0.6, heading + half * 0.6)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(0.6, 3.2 * (1 - t)) * u
  ctx.stroke()
  return true
}

/** The outline of a sweep's circle, as points: rough, and never twice the same for two different turns of the pen. */
function roughCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rough: number, seed: number): void {
  const points = Math.max(24, Math.min(96, Math.round(radius / 9)))
  for (let i = 0; i <= points; i++) {
    const k = i % points, a = (k / points) * TAU
    const r = Math.max(0, radius + (fixed(seed, k) - 0.5) * 2 * rough)
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
}

/** The path of a sweep's circle, to clip to. */
export function sweepPath(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, radius), 0, TAU)
}

/** The edge of a sweep: a few rough turns of the pen round the circle, in ink. Not a fade. */
export function sweepEdge(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, seconds: number, u: number): void {
  if (radius <= 0) return
  const flick = Math.floor(seconds * 12)
  for (const [index, weight] of [1.2, 3.2, 1.4, 0.9].entries()) {
    ctx.beginPath()
    roughCircle(ctx, x, y, radius + (index - 1) * 5 * u, (2.5 + index * 1.5) * u, flick * 5 + index)
    ctx.strokeStyle = INK
    ctx.lineWidth = weight * u
    ctx.stroke()
  }
}

/** How far a sweep's circle must reach to cover the surface from where it starts. */
export function sweepReach(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
}

/** The shadow under a carried guest: a small blot of ink strokes on the floor beneath it. */
export function shadowBlot(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, u: number): void {
  ctx.beginPath()
  for (let i = -2; i <= 2; i++) {
    const reach = half * Math.sqrt(1 - (i * i) / 7.5)
    ctx.moveTo(x - reach, y + i * 1.9 * u)
    ctx.lineTo(x + reach, y + i * 1.9 * u + 0.6 * u)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5 * u
  ctx.stroke()
}

/**
 * The room a guest with no room yet asks for, on that guest's page: a ring of
 * dots in the spot colour going slowly round it, each on a spot of bare
 * paper so it is seen on the dark of the walls. Dots in the spot colour are
 * the page's way of drawing what a guest wants and has not got; a ruled frame
 * is kept for the room a guest has, so a newcomer does not take the room that
 * is asked for as a room that is chosen. Returns how many fills it made.
 */
export function askedRing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seconds: number, u: number): number {
  const out = 6 * u, left = x - out, top = y - out, wide = w + 2 * out, high = h + 2 * out
  const round = 2 * (wide + high), count = Math.max(8, Math.round(round / (13 * u))), gap = round / count
  const start = (seconds * 5 * u) % gap
  const dots = (r: number) => {
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      let d = start + i * gap, px = left, py = top
      if (d < wide) px = left + d
      else if ((d -= wide) < high) { px = left + wide; py = top + d }
      else if ((d -= high) < wide) { px = left + wide - d; py = top + high }
      else py = top + high - (d - wide)
      ctx.moveTo(px + r, py)
      ctx.arc(px, py, r, 0, TAU)
    }
  }
  dots(3.6 * u)
  ctx.fillStyle = PAPER
  ctx.fill()
  dots(2.3 * u)
  ctx.fillStyle = SPOT
  ctx.fill()
  return 2
}

/**
 * The stare of a guest who waits in the lobby: a row of small pen dots from
 * its eyes to the door it asks for, closer together near the door, where two
 * guests' stares meet when they ask for the same one. Dots, not dashes: a
 * short bar by itself could be read as a sign.
 */
export function gaze(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, u: number): void {
  const length = Math.hypot(x2 - x1, y2 - y1)
  if (length < 24 * u) return
  const ux = (x2 - x1) / length, uy = (y2 - y1) / length, r = 1.35 * u
  ctx.beginPath()
  // It starts clear of the face and stops on the door.
  for (let at = 16 * u; at < length - 2 * u; at += (10 - 4.5 * (at / length)) * u) {
    const x = x1 + ux * at, y = y1 + uy * at
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, TAU)
  }
  ctx.fillStyle = INK
  ctx.fill()
}

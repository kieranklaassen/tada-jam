// What is seen for a moment after a touch, each drawn afresh every frame as a
// few pen strokes and gone when its time is up: feathers, a sneeze, a breath
// out of the standing pipe, the puff of a tooted pipe with whatever was
// passing through it, and the patch a stove scorches or an ice box frosts.

import { fixed } from './inkAirs'
import { INK, PAPER } from './inkHatch'
import type { InkMoment } from './inkScene'

const TAU = Math.PI * 2
const clamp = (t: number) => Math.max(0, Math.min(1, t))
const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c) }

type Ctx = CanvasRenderingContext2D

/** A dozen feathers thrown up out of the quilt, each turning as it drifts down. */
function feathers(ctx: Ctx, moment: InkMoment, u: number): void {
  const age = moment.age, out = 1 - Math.exp(-4 * age)
  ctx.beginPath()
  for (let i = 0; i < 12; i++) {
    const heading = -Math.PI * (0.12 + 0.76 * fixed(71, i)), reach = (34 + 46 * fixed(72, i)) * u
    const x = moment.x + Math.cos(heading) * reach * out + Math.sin(age * 3 + i) * 5 * u
    const y = moment.y + Math.sin(heading) * reach * out + 30 * u * age * age
    const turn = heading + age * (2 + 3 * fixed(73, i)) * (i % 2 ? 1 : -1), half = 5.5 * u
    const cx = Math.cos(turn), cy = Math.sin(turn)
    // A feather is a narrow leaf: two bowed edges that meet at both tips, and nothing drawn across them (a stroke crossed by a shorter one would read as a sign).
    const bow = 2.6 * u
    ctx.moveTo(x - cx * half, y - cy * half)
    ctx.quadraticCurveTo(x - cy * bow, y + cx * bow, x + cx * half, y + cy * half)
    ctx.quadraticCurveTo(x + cy * bow, y - cx * bow, x - cx * half, y - cy * half)
    // Its quill, a short tail beyond one tip.
    ctx.lineTo(x - cx * (half + 3 * u), y - cy * (half + 3 * u))
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.2 * u
  ctx.stroke()
}

/** A sneeze: short strokes flying out to one side, and a few drops beyond them. */
function sneeze(ctx: Ctx, moment: InkMoment, u: number): void {
  const t = moment.age / moment.lasts, side = moment.side
  ctx.beginPath()
  for (let k = -3; k <= 3; k++) {
    const heading = k * 0.17 - 0.12, near = (8 + 58 * t) * u, far = near + (15 - 9 * t) * u
    ctx.moveTo(moment.x + side * Math.cos(heading) * near, moment.y + Math.sin(heading) * near)
    ctx.lineTo(moment.x + side * Math.cos(heading) * far, moment.y + Math.sin(heading) * far)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5 * u
  ctx.stroke()
  // The drops beyond them, filled: a small ring by itself could be read as a numeral.
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const heading = (fixed(74, i) - 0.5) * 1.1, r = (20 + 70 * t * (0.6 + 0.6 * fixed(75, i))) * u
    const x = moment.x + side * Math.cos(heading) * r, y = moment.y + Math.sin(heading) * r + 16 * u * t * t
    ctx.moveTo(x + 1.6 * u, y)
    ctx.arc(x, y, 1.6 * u, 0, TAU)
  }
  ctx.fillStyle = INK
  ctx.fill()
}

/** A breath coming back out of the mouth of the standing pipe: three small bows, one behind another, toward whoever listens. */
function breath(ctx: Ctx, moment: InkMoment, u: number): void {
  const t = moment.age / moment.lasts, heading = -Math.PI / 2 + moment.side * 0.75
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const r = (7 + 30 * t - i * 7) * u
    if (r <= 2 * u) continue
    ctx.moveTo(moment.x + Math.cos(heading - 0.55) * r, moment.y + Math.sin(heading - 0.55) * r)
    ctx.arc(moment.x, moment.y, r, heading - 0.55, heading + 0.55)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.4 * u
  ctx.stroke()
}

/**
 * The puff a tooted pipe gives: a small cloud that leaves its mouth, rises
 * and grows, and in it a mark of whatever was passing through, or of what the
 * guest blowing it makes: a bow of jagged teeth for noise, a coil of small
 * loops for smell, three wavy lines for warmth, five short falling strokes
 * for cold. With nothing passing, the cloud is empty.
 */
function puff(ctx: Ctx, moment: InkMoment, u: number): void {
  const t = moment.age / moment.lasts
  const x = moment.x + moment.side * (8 + 22 * t) * u, y = moment.y - (10 + 30 * t) * u, r = (11 + 9 * t) * u
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, bx = x + Math.cos(a) * r * 0.72, by = y + Math.sin(a) * r * 0.6
    ctx.moveTo(bx + r * 0.5, by)
    ctx.arc(bx, by, r * 0.5, 0, TAU)
  }
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.3 * u
  ctx.stroke()
  // The inside of the cloud again, so the bumps read as one outline.
  ctx.beginPath()
  ctx.ellipse(x, y, r * 0.86, r * 0.74, 0, 0, TAU)
  ctx.fill()
  const of = moment.of ?? null
  if (of === null) return
  const s = r * 0.5
  ctx.beginPath()
  // Each is the page's own mark for that air, small: none is a shape that could be read as a letter or a numeral.
  if (of === 'din') {
    // A bow of jagged teeth, as the noise marks are.
    for (let k = 0; k <= 8; k++) { const a = -2.5 + (k / 8) * 1.9, rr = s * (1.15 + (k % 2 ? 0.28 : -0.1)); const px = x + s * 0.55 + Math.cos(a) * rr, py = y + s * 0.75 + Math.sin(a) * rr; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
  } else if (of === 'pong') {
    // A coil of five small loops drifting up to one side, as the smell marks are.
    for (let k = 0; k <= 50; k++) { const t = k / 50, a = t * TAU * 5; const px = x - s * 0.95 + t * s * 1.9 - Math.sin(a) * s * 0.2, py = y + s * 0.35 - t * s * 0.5 + Math.cos(a) * s * 0.22; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
  } else if (of === 'warm') {
    // Three shallow wavy lines rising, broken, as the warmth marks are.
    for (const [line, lift] of [[-0.7, 0.1], [0, -0.25], [0.7, 0.15]] as const) for (let k = 0; k <= 10; k++) { const px = x + line * s + Math.sin(k * 1.9 + line * 4) * s * 0.12, py = y + s * (0.75 + lift) - (1.3 * s * k) / 10; if (k === 0 || k === 6) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
  } else {
    // Five short strokes falling at their own heights, as the cold marks are.
    for (let i = 0; i < 5; i++) { const px = x + (i - 2) * s * 0.42, py = y + (fixed(89, i) - 0.5) * s * 1.1; ctx.moveTo(px, py - s * 0.22); ctx.lineTo(px, py + s * 0.22) }
  }
  ctx.lineWidth = 1.5 * u
  ctx.stroke()
}

/**
 * A scorched patch: a blot hatched two ways, with a wisp or two of smoke off
 * it while it is fresh. It fades by growing paler and smaller, and always
 * keeps all its strokes: thinned to one stroke each way it would be two bars
 * that cross.
 */
function scorch(ctx: Ctx, moment: InkMoment, u: number): void {
  const left = 1 - smooth((moment.age - 0.4) / (moment.lasts - 0.4)), r = 25 * u * (0.5 + 0.5 * left)
  const before = ctx.globalAlpha
  ctx.globalAlpha = before * (0.25 + 0.75 * left)
  ctx.beginPath()
  for (let pass = 0; pass < 2; pass++) {
    const lines = pass ? 9 : 13
    for (let i = 0; i < lines; i++) {
      // Chords of a rough round blot, every one a little off its neighbour.
      const d = ((i + 0.5) / lines - 0.5) * 2 * r, half = Math.sqrt(Math.max(0, r * r - d * d)) * (0.75 + 0.35 * fixed(81 + pass, i))
      const ax = pass ? 0.7 : -0.7, ay = 0.72
      ctx.moveTo(moment.x + d * ay - half * ax, moment.y - d * ax - half * ay)
      ctx.lineTo(moment.x + d * ay + half * ax, moment.y - d * ax + half * ay)
    }
  }
  if (moment.age < 0.9) {
    for (let i = 0; i < 3; i++) {
      const x = moment.x + (i - 1) * 11 * u, rise = (18 + 44 * moment.age) * u
      for (let k = 0; k <= 8; k++) { const py = moment.y - r * 0.6 - (rise * k) / 8, px = x + Math.sin(k * 1.1 + moment.age * 9 + i) * 3.5 * u; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
    }
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.7 * u
  ctx.stroke()
  ctx.globalAlpha = before
}

/**
 * A frosted patch: cracks that run out from the middle faster than the eye,
 * each jointed and with its twigs, and drops off it as it melts. Every crack
 * has all its joints from the first frame to the last (a ring of straight
 * spokes would read as a sign): it grows by lengthening and melts by paling.
 */
function frost(ctx: Ctx, moment: InkMoment, u: number): void {
  const grown = 0.25 + 0.75 * clamp(moment.age / 0.25), left = 1 - smooth((moment.age - 0.5) / (moment.lasts - 0.5))
  const trace = () => {
    ctx.beginPath()
    for (let ray = 0; ray < 9; ray++) {
      let px = moment.x, py = moment.y
      const heading = (ray / 9) * TAU + fixed(85, ray) * 0.5
      ctx.moveTo(px, py)
      for (let k = 0; k < 4; k++) {
        const a = heading + (fixed(86 + ray, k) - 0.5) * 0.9, step = (6 + 6 * fixed(87 + ray, k)) * u * grown
        px += Math.cos(a) * step
        py += Math.sin(a) * step
        ctx.lineTo(px, py)
        if (k % 2 === 0) { ctx.lineTo(px + Math.cos(a + 1.1) * 5 * u * grown, py + Math.sin(a + 1.1) * 5 * u * grown); ctx.moveTo(px, py) }
      }
    }
  }
  const before = ctx.globalAlpha
  ctx.globalAlpha = before * (0.2 + 0.8 * left)
  // Paper under the ink, so the cracks read on a hatched wall as well as on a bare one.
  trace()
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 3.4 * u
  ctx.stroke()
  trace()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.2 * u
  ctx.stroke()
  if (moment.age > 0.5) {
    const fall = moment.age - 0.5
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      const x = moment.x + (i - 1) * 10 * u, y = moment.y + (8 + 60 * fall * fall * (0.7 + 0.5 * fixed(88, i))) * u
      ctx.moveTo(x + 1.8 * u, y)
      ctx.arc(x, y, 1.8 * u, 0, TAU)
    }
    // Drops are filled: a small ring by itself could be read as a numeral.
    ctx.fillStyle = INK
    ctx.fill()
  }
  ctx.globalAlpha = before
}

/** A touch on bare paper: the paper creases under the finger. A few short bent strokes fan out from the point, each a little further than the last, and are gone. */
function rustle(ctx: Ctx, moment: InkMoment, u: number): void {
  const t = moment.age / moment.lasts
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const heading = -2.6 + i * 0.52 + (fixed(90, i) - 0.5) * 0.3, near = (9 + 16 * t + fixed(91, i) * 4) * u, far = near + (9 + 5 * fixed(92, i)) * u
    const cx = Math.cos(heading), cy = Math.sin(heading), bend = (i % 2 ? 1 : -1) * 2.6 * u
    ctx.moveTo(moment.x + cx * near, moment.y + cy * near)
    ctx.quadraticCurveTo(moment.x + cx * (near + far) / 2 - cy * bend, moment.y + cy * (near + far) / 2 + cx * bend, moment.x + cx * far, moment.y + cy * far)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.2 * u
  ctx.stroke()
}

/** Draws one moment where it is. Returns false when it has not begun or is over. */
export function drawMoment(ctx: Ctx, moment: InkMoment, u: number): boolean {
  if (moment.age < 0 || moment.age >= moment.lasts) return false
  // The last fifth of its time it goes faint, and is gone.
  const before = ctx.globalAlpha
  ctx.globalAlpha = before * (1 - smooth((moment.age / moment.lasts - 0.8) / 0.2))
  if (moment.kind === 'feathers') feathers(ctx, moment, u)
  else if (moment.kind === 'sneeze') sneeze(ctx, moment, u)
  else if (moment.kind === 'breath') breath(ctx, moment, u)
  else if (moment.kind === 'puff') puff(ctx, moment, u)
  else if (moment.kind === 'scorch') scorch(ctx, moment, u)
  else if (moment.kind === 'rustle') rustle(ctx, moment, u)
  else frost(ctx, moment, u)
  ctx.globalAlpha = before
  return true
}

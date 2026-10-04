import type { RiderLife } from './cast'
import { CHALKS, ORANGE, type Ink } from './chalk'
import { CAT_EARS, RIDER_PARTS } from './riderFigures'
import type { RiderBearing } from './riderMotion'
import { stamp, type Sprites } from './sprites'
import type { RiderKind } from './tastes'

// A rider, put together each frame from its kept picture and its own moving
// parts: the body takes the rider's bearing (hop, squash, lean, spin, shiver),
// its eyes are drawn as the bearing has them, and the one part of it that is
// funniest is drawn where the bearing swings it.

type G = CanvasRenderingContext2D

/** Riders stand this much larger than they are drawn. */
export const RIDER = 1.3
const DARK = '#3b3f44'
const WHITE = CHALKS[0]

/** The part of each rider that is funniest, swung by `part`, -1 to 1. Drawn in the rider's own frame. */
function funniest(g: G, kind: RiderKind, part: number, white: Ink): void {
  const at = RIDER_PARTS[kind].part
  g.lineCap = 'round'
  g.lineJoin = 'round'
  if (kind === 'frog') {
    // Its throat: a pouch that swells.
    const swell = Math.max(0, part)
    if (swell < 0.05) return
    g.fillStyle = CHALKS[1]
    g.strokeStyle = white
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(at.x, at.y + swell * 4, 12 + swell * 12, 8 + swell * 11, 0, 0, Math.PI * 2)
    g.fill()
    g.stroke()
  } else if (kind === 'chick') {
    // Its stub wing: up when it flaps, out when it is held.
    g.save()
    g.translate(at.x, at.y)
    g.rotate(0.5 - part * 1.6)
    g.fillStyle = ORANGE
    g.strokeStyle = white
    g.lineWidth = 2.6
    g.beginPath()
    g.ellipse(-8 - Math.abs(part) * 5, 2, 11 + Math.abs(part) * 5, 6.5, 0, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.restore()
  } else if (kind === 'snail') {
    // Its eye stalks: swaying together, or streaming out behind.
    for (const eye of RIDER_PARTS.snail.eyes) {
      const root = { x: eye.x + (eye.x < 45 ? 3 : -8), y: -33 }
      const tip = { x: eye.x - part * 26, y: eye.y + Math.abs(part) * 14 }
      g.strokeStyle = CHALKS[4]
      g.lineWidth = 4.5
      g.beginPath()
      g.moveTo(root.x, root.y)
      g.quadraticCurveTo(root.x - part * 6, (root.y + tip.y) / 2, tip.x, tip.y + 5)
      g.stroke()
    }
  } else {
    // Its tail: curled up behind, swishing, flat back or stiff as a brush.
    const swing = part * 0.9, stiff = Math.abs(part) > 0.95
    g.strokeStyle = ORANGE
    g.lineWidth = stiff ? 13 : 8
    g.beginPath()
    g.moveTo(at.x, at.y)
    g.quadraticCurveTo(at.x - 24, at.y - 8 - swing * 10, at.x - 26 - swing * 14, at.y - 34)
    g.quadraticCurveTo(at.x - 18 - swing * 22, at.y - 50, at.x - 22 - swing * 26, at.y - 56 + Math.abs(swing) * 8)
    g.stroke()
  }
}

/** The eyes as the bearing has them, over the figure's own. `look` is where they look, -1 to 1 each way. */
function eyes(g: G, kind: RiderKind, bearing: RiderBearing, look: { x: number; y: number }, part: number, white: Ink, clock: number): void {
  const parts = RIDER_PARTS[kind]
  for (const at of parts.eyes) {
    // The snail's eyes ride the tips of its stalks.
    const x = kind === 'snail' ? at.x - part * 26 : at.x, y = kind === 'snail' ? at.y + Math.abs(part) * 14 : at.y
    const wide = bearing.eyes === 'wide', r = at.r * (wide ? 1.3 : 1)
    if (parts.ball || bearing.eyes === 'wide' || bearing.eyes === 'spiral') {
      g.fillStyle = white
      g.beginPath()
      g.ellipse(x, y, parts.ball ? r : r * 1.9, parts.ball ? r * 1.08 : r * 1.9, 0, 0, Math.PI * 2)
      g.fill()
    } else {
      // A dot of an eye: covered with the body's own chalk before it is drawn again.
      g.fillStyle = parts.body
      g.beginPath()
      g.arc(x, y, at.r * 1.5, 0, Math.PI * 2)
      g.fill()
    }
    const size = parts.ball ? r : r * 1.9
    if (bearing.eyes === 'shut') {
      g.strokeStyle = parts.ball ? DARK : WHITE
      g.lineWidth = 3
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(x - size * 0.75, y)
      g.quadraticCurveTo(x, y + size * 0.5, x + size * 0.75, y)
      g.stroke()
    } else if (bearing.eyes === 'spiral') {
      g.strokeStyle = DARK
      g.lineWidth = 2.2
      g.beginPath()
      for (let i = 0; i <= 18; i++) {
        const a = i * 0.6 + clock * 9, d = (i / 18) * size * 0.75
        if (i) g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
        else g.moveTo(x, y)
      }
      g.stroke()
    } else {
      const pupil = parts.ball ? r * (wide ? 0.3 : 0.5) : at.r * (wide ? 0.7 : 1)
      const px = x + look.x * size * 0.34, py = y + look.y * size * 0.34
      g.fillStyle = DARK
      g.beginPath()
      g.arc(px, py, pupil, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = WHITE
      g.beginPath()
      g.arc(px - pupil * 0.3, py - pupil * 0.35, pupil * 0.3, 0, Math.PI * 2)
      g.fill()
    }
  }
}

/**
 * One rider, drawn about its feet at the origin of `g`, facing right. The
 * caller has put the origin where the rider stands or sits, turned it, and
 * mirrored it to face the other way.
 */
export function drawRiderLive(g: G, sprites: Sprites, white: Ink, life: RiderLife, bearing: RiderBearing, look: { x: number; y: number }, version: number, clock: number, size = RIDER): number {
  const kind = life.kind, high = RIDER_PARTS[kind].high
  g.save()
  g.globalAlpha *= life.shown
  g.scale(size, size)
  g.translate(bearing.shake + bearing.stride, -bearing.hop / size)
  if (bearing.spin) {
    g.translate(0, -high / 2)
    g.rotate(bearing.spin)
    g.translate(0, high / 2)
  }
  g.rotate(bearing.tilt)
  // Flattened against what is behind it; puffed up; drawn in on itself.
  const puff = 1 + bearing.puff, small = 1 - bearing.hide * (kind === 'snail' ? 0 : 0.45)
  g.translate(-bearing.flat * 14, 0)
  g.scale((1 + bearing.squash) * puff * (1 - bearing.flat * 0.45), (1 - bearing.squash) * puff * small)
  const part = bearing.hide > 0.5 && kind === 'snail' ? 0 : bearing.part
  // Behind the body: the cat's tail. In front of it: the others' parts.
  if (kind === 'cat') {
    funniest(g, kind, part, white)
    // Its ears, pricked, or laid back flat on a fast run.
    for (const ear of CAT_EARS) {
      g.save()
      g.translate(ear.root.x, ear.root.y)
      g.rotate(-bearing.ears * 1.25)
      g.scale(1, 1 - bearing.ears * 0.35)
      g.fillStyle = ORANGE
      g.strokeStyle = white
      g.lineWidth = 3.4
      g.lineJoin = 'round'
      g.beginPath()
      g.moveTo(ear.pts[0].x, ear.pts[0].y)
      g.lineTo(ear.pts[1].x, ear.pts[1].y)
      g.lineTo(ear.pts[2].x, ear.pts[2].y)
      g.closePath()
      g.fill()
      g.stroke()
      g.restore()
    }
  }
  if (kind === 'snail' && bearing.hide > 0.5) {
    // In its shell: only the shell is there, its foot and head drawn in.
    g.save()
    g.beginPath()
    g.arc(-8, -36, 31, 0, Math.PI * 2)
    g.clip()
    stamp(g, sprites.riders[kind][version % sprites.riders[kind].length])
    g.restore()
  } else stamp(g, sprites.riders[kind][version % sprites.riders[kind].length])
  if (kind !== 'cat' && !(kind === 'snail' && bearing.hide > 0.5)) funniest(g, kind, part, white)
  // The cat's paw, batting at the dust of a scribble.
  if (kind === 'cat' && life.doing === 'scribble') {
    g.fillStyle = ORANGE
    g.strokeStyle = white
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(34 + part * 9, -66 - Math.abs(part) * 12, 8, 6.5, part * 0.5, 0, Math.PI * 2)
    g.fill()
    g.stroke()
  }
  // A snail in its shell shows no eyes at all.
  if (!(kind === 'snail' && bearing.hide > 0.5)) eyes(g, kind, bearing, look, part, white, clock)
  if (bearing.pale > 0.03) {
    // White with chalk dust: a pale wash over the whole of it.
    g.globalAlpha *= Math.min(0.8, bearing.pale)
    g.fillStyle = white
    g.beginPath()
    g.ellipse(0, -high / 2, 44, high / 2 + 4, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
  if (life.doing !== 'hoop') return 6
  // A chalk hoop spun round its middle: it wobbles as the rider turns, and drops to its feet at the end.
  const turned = bearing.spin / (Math.PI * 6), drop = Math.max(0, (turned - 0.85) / 0.15) * (high / 2 - 6)
  g.save()
  g.globalAlpha *= life.shown
  g.scale(size, size)
  g.strokeStyle = white
  g.lineWidth = 5
  g.beginPath()
  g.ellipse(0, -high / 2 + drop - bearing.hop / size, 50, 13, Math.sin(bearing.spin) * 0.3 * (1 - turned), 0, Math.PI * 2)
  g.stroke()
  g.restore()
  return 7
}

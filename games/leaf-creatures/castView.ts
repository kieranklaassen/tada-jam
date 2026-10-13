import { GUST_SECONDS, type Air } from './air'
import { TOAD_FACE, WIND_FACE } from './castArt'
import type { Cast, Toad, Wind } from './cast'
import { CAST, FERN } from './clearing'
import { leafKey, partKey, type Pen } from './pen'

// How the three who are always there are laid on the clearing: each a kept
// picture with its face finished live, so eyes follow, cheeks fill, lids
// sink and mouths change. And what is in the air: loose leaves and the gust.
// Every number the cast keeps (cast.ts) is read here.

const spot = { x: 0, y: 0 }
/** A point of a wind child's face, turned with the child when it spins itself round. */
function on(cx: number, cy: number, whirl: number, x: number, y: number): { x: number; y: number } {
  const c = Math.cos(whirl), s = Math.sin(whirl)
  spot.x = cx + x * c - y * s; spot.y = cy + x * s + y * c
  return spot
}

/** How far below the bottom of an eye the middle of a hand sinks for a peek: the hand is 28 high above its middle, a pupil 8 round. */
export const PEEK_SINK = 22

function drawWind(pen: Pen, who: 'big' | 'small', wind: Wind): void {
  const home = CAST[who], f = WIND_FACE[who], whirl = wind.whirl
  // Fuller cheeks lift the whole child a little; a blow squashes it forward; straining swells it.
  const cx = home.x, cy = home.y - 8 - (wind.puff - 0.9) * 10
  pen.stamp(`wind-${who}`, cx, cy, whirl, 1 + wind.blow * 0.03 + wind.strain * 0.05, 1 + (wind.puff - 0.9) * 0.05 - wind.blow * 0.04 + wind.strain * 0.05)
  if (wind.strain > 0.04) pen.stamp('flush', cx, cy + 2, whirl, 1, 1, Math.min(0.85, wind.strain))
  const full = Math.max(0.55, 0.7 + (wind.puff - 0.7) * 1.5) + wind.strain * 0.25
  for (const side of [-1, 1]) {
    const size = (f.cheekR / 26) * full, at = on(cx, cy, whirl, side * f.cheekX * (1 + (full - 1) * 0.22), f.cheekY)
    pen.stamp('cheek', at.x, at.y, whirl, size, size * 0.96, 0.9)
  }
  const shut = wind.blink > 0.35 || wind.blow > 0.5 || wind.strain > 0.6
  const hard = Math.max(0, (wind.puff - 0.98) * 5) + wind.blow * 0.6 + wind.strain
  for (const side of [-1, 1]) {
    const eye = on(cx, cy, whirl, side * f.eyeX, f.eyeY), ex = eye.x, ey = eye.y
    if (wind.hide > 0.04) {
      // Afraid: a hand comes up over each eye. For a peek both hands sink until its eyes show over them, the whole
      // of each pupil clear of its hand, so the peek that is heard is seen.
      const apart = wind.peek * 13
      if (wind.peek > 0.5) pen.stamp('pupil', ex + wind.lookX * (f.eyeR - 9), ey - 3 + wind.lookY * 3, 0, f.eyeR / 15, f.eyeR / 15)
      pen.stamp('mitt', ex + side * (apart + (1 - wind.hide) * 48), ey + (1 - wind.hide) * 62 + wind.peek * (f.eyeR + PEEK_SINK), side * (0.2 + wind.peek * 0.35), 1, 1)
    } else if (shut) {
      pen.stamp('shut', ex, ey, whirl + side * 0.08, f.eyeR / 15, f.eyeR / 15)
    } else {
      const reach = f.eyeR - 9
      pen.stamp('pupil', ex + wind.lookX * reach, ey + wind.lookY * reach, 0, f.eyeR / 15, f.eyeR / 15)
    }
    // Brows only when the breath gets hard to hold: pulled down in the middle, one each, never level.
    if (hard > 0.15 && wind.hide <= 0.04) {
      const a = on(cx, cy, whirl, side * (f.eyeX + f.eyeR * 0.9), f.browY - 2 - hard * 6), ax = a.x, ay = a.y
      const b = on(cx, cy, whirl, side * (f.eyeX - f.eyeR * 0.7), f.browY + hard * 7)
      pen.line([ax, ay, b.x, b.y], 'cloudEdge', 3.2)
    }
  }
  const mouth = on(cx, cy, whirl, 0, f.mouthY), mx = mouth.x, my = mouth.y
  if (wind.blow > 0.12) pen.dot(mx, my + 3, 7 + wind.blow * 8, 9 + wind.blow * 9, 'dark', 0.9)
  else pen.line([mx - 7, my, mx, my + 2 + (wind.puff - 0.9) * 4 - wind.strain * 5, mx + 7, my], 'blush', 3.4)
  if (who === 'small' && wind.hide <= 0.04) {
    // Its want: an open hand that stirs the air, round and round.
    const turn = wind.stir * Math.PI * 2, at = on(cx, cy, whirl, -104 + Math.cos(turn) * 17, -30 + Math.sin(turn) * 17)
    pen.stamp('stir', at.x, at.y, whirl - 0.3 + Math.cos(turn) * 0.2)
  }
}

function drawToad(pen: Pen, toad: Toad): void {
  const home = CAST.toad, f = TOAD_FACE
  const sy = (1 + toad.squash) * (1 - 0.42 * toad.flat), sx = (1 - toad.squash * 0.5) * (1 + 0.28 * toad.flat)
  // It sits: its feet stay where they are and the rest sinks, stretches or is flattened above them.
  const feet = home.y + 62, at = (y: number): number => feet + (y - 62) * sy
  pen.stamp('toad', home.x, at(0), 0, sx, sy)
  const pulse = Math.sin(toad.throat * Math.PI * 2)
  pen.dot(home.x, at(f.throatY), 30 * sx * (1 + 0.06 * pulse), 13 * sy * (1 + 0.3 * pulse), 'belly', 0.92)
  for (const side of [-1, 1]) {
    const ex = home.x + side * f.eyeX * sx, ey = at(f.eyeY)
    // Under a hat its eyes cross; otherwise they go where it looks.
    const lx = toad.hat ? -side * 0.8 : toad.lookX
    pen.stamp('pupil', ex + lx * 9, ey + toad.lookY * 7 + 2, 0, 1.7, 1.05)
    // The lids sink as it dozes; glaring, they come down slanted over the eyes.
    const lids = Math.max(toad.lids, toad.glare * 0.42)
    if (lids > 0.04) pen.stamp('lid', ex, ey - 25 * sy + 25 * sy * lids, side * 0.5 * toad.glare, sx, sy * lids)
  }
  const hat = toad.hat
  if (hat) {
    // The part pressed on to it, worn on top, settling with a wobble.
    const wobble = Math.exp(-hat.age * 3) * Math.sin(hat.age * 16) * 0.25
    pen.stamp(partKey(hat.kind, hat.look), home.x, at(-74), hat.turn + wobble, 0.8 * sx, 0.8)
  }
}

/** The two front fronds of the fern, which sway, and sink over whoever sleeps under them. */
export function drawFern(pen: Pen, cast: Cast, time: number): void {
  const sway = cast.fern.sway + Math.sin(time * 0.9) * 0.025, sunk = cast.fern.sunk
  pen.stamp('frond', FERN.x - 30, FERN.y + 100, -0.3 + sway * 0.6 - sunk * 0.16, 1, 1 - sunk * 0.1)
  pen.stamp('frond', FERN.x + 26, FERN.y + 104, 0.24 + sway + sunk * 0.2, 1, 1 - sunk * 0.14)
}

export function drawCast(pen: Pen, cast: Cast): void {
  drawToad(pen, cast.toad)
  drawWind(pen, 'big', cast.big)
  drawWind(pen, 'small', cast.small)
}

const streak: number[] = []
/** The least a stretch of a gust line bends away from the straight line between its ends for it to be drawn: one that does not is a dash. */
export const GUST_BEND = 3

/**
 * The straight way line `i` of a gust sweeps along: from beside one of the wind children across the earth to the far
 * side, leaning down as it goes. It goes much further across than down, so with its wave on it no stretch of it is
 * steeper than half-way between level and upright, and it is never a long wave stood on end. Odd lines come from the
 * small child, even ones from the big one.
 */
export function gustAxis(i: number): { x0: number; y0: number; x1: number; y1: number } {
  const from = i % 2 === 0 ? CAST.big : CAST.small, side = i % 2 === 0 ? 1 : -1
  const x0 = from.x + side * 70, y0 = from.y + 50 + i * 22
  return { x0, y0, x1: x0 + side * (600 + (i % 3) * 50), y1: y0 + 90 + i * 28 + ((i * 7) % 5) * 8 }
}

/** The loose leaves, and the gust as a few wavy crayon lines that sweep from the wind children across the earth, no two alike. */
export function drawAir(pen: Pen, air: Air, gustLines: number): void {
  for (const leaf of air.leaves) {
    const fade = Math.min(1, leaf.age * 3, (leaf.lasts - leaf.age) * 1.5)
    pen.stamp(leafKey(leaf.hue), leaf.x, leaf.y, leaf.turn, 1, 0.55 + 0.45 * Math.cos(leaf.sway * 1.7), fade)
  }
  if (air.gust < 0) return
  const u = air.gust / GUST_SECONDS
  for (let i = 0; i < gustLines; i++) {
    // The small child's lines come a beat later.
    const head = Math.min(1, Math.max(0, u * 1.5 - (i % 2) * 0.18 - i * 0.03)), tail = Math.max(0, head - 0.26 - 0.05 * ((i * 3) % 4))
    if (head <= 0 || tail >= 0.98) continue
    const axis = gustAxis(i), dx = axis.x1 - axis.x0, dy = axis.y1 - axis.y0, long = Math.hypot(dx, dy)
    streak.length = 0
    for (let k = 0; k <= 9; k++) {
      const p = tail + ((head - tail) * k) / 9
      // A wave rides along the line, to one side of its way and the other, deeper on some lines than on others. The
      // line only ever goes on along its way, so it never loops.
      const wave = Math.sin(p * (12 + i * 1.5) + i) * (11 + (i % 3) * 2)
      streak.push(axis.x0 + dx * p - (dy / long) * wave, axis.y0 + dy * p + (dx / long) * wave)
    }
    // A stretch too short to show its wave is a straight dash: it is not drawn.
    const ex = streak[18] - streak[0], ey = streak[19] - streak[1], chord = Math.hypot(ex, ey) || 1
    let bend = 0
    for (let k = 2; k < 18; k += 2) bend = Math.max(bend, Math.abs((streak[k] - streak[0]) * ey - (streak[k + 1] - streak[1]) * ex) / chord)
    if (bend < GUST_BEND) continue
    pen.line(streak, 'gust', 4.5 + (i % 3), 0.75 * Math.sin(Math.min(1, u * 1.2) * Math.PI))
  }
}

import type { Ink } from './chalk'
import { CAP_AT, CHEEK, EYES, MOUTH, WAGON_WHEELS, WHEELS } from './figures'
import type { Pose } from './gait'
import type { Bearing } from './life'
import { stamp, type Sprites } from './sprites'

// The train, put together each frame from its kept pictures and its own
// moving parts: the body takes the engine's bearing (squash, lean, hop, spin),
// the wheels turn with the distance travelled, and the eyes, the mouth and
// the funnel cap are drawn where the bearing puts them.

type G = CanvasRenderingContext2D

/** Figures stand this much larger than they are drawn, and ride this far above the middle of the rail. */
export const TRAIN = 1.15
const LIFT = 9
/** The colour of bare tar in shade: pupils and open mouths, since there is no black chalk. */
const DARK = '#3b3f44'

export type Inks = { white: Ink; pink: Ink; orange: Ink }

function eye(g: G, inks: Inks, x: number, y: number, r: number, bearing: Bearing, inward: number, clock: number) {
  if (bearing.blink > 0.5) {
    // Shut: one curved line.
    g.strokeStyle = inks.white
    g.lineWidth = 3.4
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x - r * 0.8, y)
    g.quadraticCurveTo(x, y + r * 0.55, x + r * 0.8, y)
    g.stroke()
    return
  }
  g.fillStyle = inks.white
  g.beginPath()
  g.ellipse(x, y, r, r * 1.08, 0, 0, Math.PI * 2)
  g.fill()
  if (bearing.dizzy > 0.05) {
    // Giddy: the pupil is a spiral going round.
    g.strokeStyle = DARK
    g.lineWidth = 2.6
    g.beginPath()
    for (let i = 0; i <= 22; i++) {
      const a = i * 0.55 + clock * 9, d = (i / 22) * r * 0.72
      if (i) g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
      else g.moveTo(x, y)
    }
    g.stroke()
    return
  }
  const px = x + (bearing.eyeX * (1 - bearing.cross) + inward * bearing.cross * 1.1) * r * 0.4, py = y + bearing.eyeY * (1 - bearing.cross * 0.5) * r * 0.4
  g.fillStyle = DARK
  g.beginPath()
  g.ellipse(px, py, r * 0.5, r * 0.54, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#f6f3ea'
  g.beginPath()
  g.arc(px - r * 0.16, py - r * 0.2, r * 0.15, 0, Math.PI * 2)
  g.fill()
}

/** Places a figure on the rail at a pose: `g` is in tar units before and after. */
function onRail(g: G, pose: Pose, draw: () => void) {
  g.save()
  g.translate(pose.x, pose.y)
  g.rotate(pose.angle)
  g.scale(pose.facing * TRAIN, TRAIN)
  g.translate(0, -LIFT / TRAIN)
  draw()
  g.restore()
}

/** The engine. Returns how many pictures and paths it drew. */
export function drawEngineLive(g: G, sprites: Sprites, inks: Inks, pose: Pose, bearing: Bearing, travelled: number, version: number, clock: number, beard: boolean): number {
  onRail(g, pose, () => {
    g.translate(bearing.shake, -bearing.hop)
    if (bearing.spin) {
      g.translate(0, -52)
      g.rotate(bearing.spin)
      g.translate(0, 52)
    }
    g.rotate(bearing.lean)
    if (bearing.rear) {
      g.translate(-44, 0)
      g.rotate(-bearing.rear)
      g.translate(44, 0)
    }
    g.scale(1 + bearing.squash, 1 - bearing.squash)
    stamp(g, sprites.engine[version])
    if (bearing.dusted > 0.02) {
      g.globalAlpha = Math.min(1, bearing.dusted)
      stamp(g, sprites.dusted)
      g.globalAlpha = 1
    }
    // The wheels turn with the way gone, and the rod rides on two of them.
    const turn = (r: number) => travelled / (r * TRAIN) + bearing.wheelspin
    for (const w of WHEELS) {
      g.save()
      g.translate(w.x, -w.r)
      g.rotate(turn(w.r))
      stamp(g, sprites.wheels[w.r][version])
      g.restore()
    }
    const a = turn(23), b = turn(15)
    g.strokeStyle = inks.orange
    g.lineWidth = 4.5
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(WHEELS[0].x + Math.cos(a) * 12, -WHEELS[0].r + Math.sin(a) * 12)
    g.lineTo(WHEELS[2].x + Math.cos(b) * 8, -WHEELS[2].r + Math.sin(b) * 8)
    g.stroke()
    // The face.
    eye(g, inks, EYES[0].x, EYES[0].y, EYES[0].r, bearing, 1, clock)
    eye(g, inks, EYES[1].x, EYES[1].y, EYES[1].r, bearing, -1, clock)
    g.fillStyle = inks.pink
    g.beginPath()
    g.arc(CHEEK.x, CHEEK.y + bearing.cheek * 2.5, 4.4, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = inks.white
    g.lineWidth = 3.2
    if (bearing.toot > 0.25) {
      g.fillStyle = DARK
      g.beginPath()
      g.ellipse(MOUTH.x, MOUTH.y, 4 + bearing.toot * 4, 2 + bearing.toot * 6, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    } else {
      g.beginPath()
      g.moveTo(MOUTH.x - 12, MOUTH.y - 3)
      g.quadraticCurveTo(MOUTH.x, MOUTH.y + 6, MOUTH.x + 12, MOUTH.y - 2)
      g.stroke()
    }
    if (beard) {
      // A beard of dandelion seeds on its front.
      g.fillStyle = '#fafaf4'
      for (let i = 0; i < 16; i++) {
        g.beginPath()
        g.arc(70 + Math.sin(i * 2.4) * 9, -26 + (i % 5) * 4 + Math.cos(i * 1.7) * 3, 2.2, 0, Math.PI * 2)
        g.fill()
      }
    }
    // The funnel cap, which comes off along the engine's own up.
    g.save()
    g.translate(CAP_AT.x, CAP_AT.y - bearing.capOff)
    g.rotate(bearing.capTurn)
    stamp(g, sprites.cap[version])
    g.restore()
  })
  return 12
}

/** One wagon, shivering where its line is a rumble strip. Whoever rides in it is drawn by `rider`, in front of the back board and behind the tub. */
export function drawWagonLive(g: G, sprites: Sprites, pose: Pose, index: number, travelled: number, version: number, chatter: number, clock: number, rider?: () => void, hop = 0): number {
  onRail(g, pose, () => {
    if (chatter > 0) g.translate(0, Math.sin(clock * 70 + index) * 3 * chatter)
    // Empty and touched, it hops on its wheels like a knocked tub and rocks once as it lands.
    if (hop > 0) {
      g.translate(0, -Math.sin(hop * Math.PI) * 12)
      g.rotate(Math.sin(hop * Math.PI * 2) * 0.09)
    }
    stamp(g, sprites.wagonBack[version])
    if (rider) {
      g.save()
      g.translate(0, -30)
      g.scale(1 / TRAIN, 1 / TRAIN)
      rider()
      g.restore()
    }
    stamp(g, sprites.wagons[index % sprites.wagons.length][version])
    for (const w of WAGON_WHEELS) {
      g.save()
      g.translate(w.x, -w.r)
      g.rotate(travelled / (w.r * TRAIN))
      stamp(g, sprites.wheels[w.r][version])
      g.restore()
    }
  })
  return rider ? 10 : 4
}

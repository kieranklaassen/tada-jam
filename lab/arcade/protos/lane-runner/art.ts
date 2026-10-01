// Everything on the track that is drawn from shapes: the fox, the obstacles,
// coins, pickups and the rainbow arch between zones. All of it is drawn at
// scale 1 around a ground point; the caller places and scales it.

import { circle, ellipse, eyes, line, rrect, shadow, sprite, star, volume } from '../../kit/draw.ts'
import { TAU, clamp, lerp } from '../../kit/math.ts'
import { ZNEAR, scaleAt, sx, sy } from './cam.ts'
import type { Cam } from './cam.ts'
import { drawTextSprite, textSprite } from './text.ts'
import type { Zone } from './zones.ts'

const ORANGE = '#f98a2e'
const ORANGE_D = '#de6a16'
const DARK = '#4a2618'
const CREAM = '#fff4e0'
const SCARF = '#19c3b1'
const SCARF_D = '#0e9a8b'
const INK = '#1e1428'

export type FoxMood = 'happy' | 'wow' | 'dizzy' | 'grin'

export interface FoxPose {
  time: number
  // Run cycle, radians.
  run: number
  // -1..1: which way the body tips in a lane change.
  lean: number
  // Squash spring: 1 is neutral, more is tall.
  stretch: number
  // 0 on the ground, 1 in the air (legs tuck).
  air: number
  // Above 0.5 the fox is a rolling ball.
  roll: number
  rollSpin: number
  // 0 looks up the track (we see the back of the head), 1 looks at the camera.
  face: number
  mood: FoxMood
  // Extra tail swing from a lane change, -1..1.
  tail: number
  jet: number
  star: number
  magnet: boolean
  // Whole-body rotation during a crash, and stars round the head after it.
  tumble: number
  dizzy: number
  blink: number
  ghost: boolean
  // Sat down facing the camera after a crash.
  sit: boolean
}

function tri(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.lineTo(x3, y3)
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

function foxBall(g: CanvasRenderingContext2D, P: FoxPose): void {
  // Speed arcs behind the ball.
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.lineWidth = 6
  for (let i = 0; i < 2; i++) {
    g.beginPath()
    g.arc(0, -48, 60 + i * 12, P.rollSpin * 0.5 + i * 2.4, P.rollSpin * 0.5 + i * 2.4 + 1.1)
    g.stroke()
  }
  g.save()
  g.translate(0, -48)
  g.rotate(P.rollSpin)
  circle(g, 0, 0, 48, ORANGE)
  // Ear tips, the cream belly, the scarf and the tail tip whirl round.
  tri(g, -22, -40, -6, -62, 4, -42, DARK)
  tri(g, 8, -42, 26, -60, 30, -36, DARK)
  ellipse(g, 12, 14, 26, 20, CREAM, 0.4)
  g.strokeStyle = SCARF
  g.lineWidth = 12
  g.beginPath()
  g.arc(0, 0, 40, 2.4, 3.9)
  g.stroke()
  circle(g, -30, 30, 15, CREAM)
  g.restore()
  // A fixed highlight keeps it reading as a ball.
  ellipse(g, -16, -70, 14, 8, 'rgba(255,255,255,0.35)', -0.5)
}

function foxHead(g: CanvasRenderingContext2D, P: FoxPose, b: number): void {
  const front = P.face > 0.5
  const turn = Math.max(0.12, Math.abs(Math.cos(P.face * Math.PI)))
  const hy = -160 + b * 0.6
  g.save()
  g.translate(0, hy)
  g.scale(turn, 1)
  const flop = Math.sin(P.run * 2) * 3 - P.air * 6
  for (const side of [-1, 1]) {
    // Ears: orange, dark tips, pink inside when we see the front.
    const bx1 = side * 14
    const bx2 = side * 47
    const tx = side * (42 + flop * 0.4)
    const ty = -88 + flop
    tri(g, bx1, -30, bx2, -18, tx, ty, ORANGE)
    tri(g, lerp(bx1, tx, 0.55), lerp(-30, ty, 0.55), lerp(bx2, tx, 0.55), lerp(-18, ty, 0.55), tx, ty, DARK)
    if (front) tri(g, side * 24, -30, side * 40, -24, side * 38, -62, '#ffb3c1')
    // Cheek fluff pokes out either side.
    tri(g, side * 44, -2, side * 70, 12, side * 42, 24, CREAM)
  }
  ellipse(g, 0, 0, 53, 45, ORANGE)
  if (front) {
    ellipse(g, -22, 16, 27, 22, CREAM)
    ellipse(g, 22, 16, 27, 22, CREAM)
    ellipse(g, 0, 20, 20, 16, CREAM)
    if (P.mood === 'dizzy') {
      g.strokeStyle = INK
      g.lineWidth = 4
      for (const side of [-1, 1]) {
        const ex = side * 19
        g.beginPath()
        g.moveTo(ex - 8, -16)
        g.lineTo(ex + 8, 0)
        g.moveTo(ex + 8, -16)
        g.lineTo(ex - 8, 0)
        g.stroke()
      }
    } else {
      eyes(g, 0, -8, 11, 0, 0.2, P.blink, 1.7)
    }
    ellipse(g, 0, 10, 8, 6, '#2b1a14')
    g.strokeStyle = INK
    g.fillStyle = INK
    g.lineWidth = 3.5
    g.beginPath()
    if (P.mood === 'wow') {
      g.ellipse(0, 27, 7, 9, 0, 0, TAU)
      g.fill()
    } else if (P.mood === 'dizzy') {
      g.moveTo(-12, 27)
      g.quadraticCurveTo(-6, 20, 0, 27)
      g.quadraticCurveTo(6, 34, 12, 27)
      g.stroke()
      // Tongue out.
      ellipse(g, 9, 33, 6, 8, '#ff6b8a', 0.3)
    } else {
      g.arc(0, 18, 13, 0.18 * Math.PI, 0.82 * Math.PI)
      g.stroke()
    }
  } else {
    // Back of the head: a tuft and a soft highlight.
    tri(g, -12, -40, 0, -60, 12, -40, ORANGE)
    ellipse(g, -16, -14, 18, 12, 'rgba(255,255,255,0.16)', -0.4)
  }
  g.restore()
  if (P.dizzy > 0) {
    for (let i = 0; i < 3; i++) {
      const a = P.time * 7 + (i * TAU) / 3
      star(g, Math.cos(a) * 62, hy - 58 + Math.sin(a) * 14, 13, '#ffe14d', a)
    }
  }
}

// The fox, feet at (x, y).
export function drawFox(g: CanvasRenderingContext2D, x: number, y: number, scale: number, P: FoxPose): void {
  g.save()
  g.translate(x, y)
  g.scale(scale, scale)
  if (P.ghost && Math.floor(P.time * 12) % 2 === 0) g.globalAlpha = 0.45
  if (P.star > 0) {
    const hue = (P.time * 420) % 360
    const pulse = Math.sin(P.time * 16) * 8
    circle(g, 0, -105, 150 + pulse, `hsla(${hue},100%,65%,${0.22 * P.star})`)
    circle(g, 0, -105, 112 - pulse, `hsla(${(hue + 120) % 360},100%,70%,${0.3 * P.star})`)
  }
  if (P.tumble !== 0) {
    g.translate(0, -95)
    g.rotate(P.tumble)
    g.translate(0, 95)
  } else {
    g.rotate(P.lean * 0.24)
  }
  if (P.roll > 0.5) {
    foxBall(g, P)
    g.restore()
    return
  }
  const [qx, qy] = volume(P.stretch * (1 - P.roll * 0.5))
  g.scale(qx, qy)
  const ground = 1 - P.air
  const b = -Math.abs(Math.sin(P.run)) * 6 * ground * (1 - P.jet)

  // Legs: a kicked-back foot shows its sole and a pink pad.
  for (const side of [-1, 1]) {
    if (P.sit) {
      // Sat on its bottom, feet out, soles to the camera.
      line(g, side * 18, -40, side * 46, -10, DARK, 18)
      ellipse(g, side * 50, -10, 15, 17, DARK)
      ellipse(g, side * 50, -8, 8, 8, '#ff9eb5')
      continue
    }
    let a = Math.sin(P.run + (side > 0 ? Math.PI : 0))
    if (P.jet > 0.5) a = -0.2 + Math.sin(P.time * 5 + side) * 0.15
    else if (P.air > 0.5) a = 0.75
    const lift = Math.max(0, a)
    const fx = side * (17 + lift * 3)
    const fy = -7 - lift * 36 + (P.jet > 0.5 ? 10 : 0)
    line(g, side * 15, -58 + b, fx, fy, DARK, 17)
    if (lift > 0.08) {
      ellipse(g, fx, fy, 14, 10 + lift * 5, DARK)
      ellipse(g, fx, fy + 1, 7, 4 + lift * 3, '#ff9eb5')
    } else {
      ellipse(g, fx, fy + 2, 13, 8, DARK)
    }
  }

  // Body.
  ellipse(g, 0, -92 + b, 38, 47, ORANGE)
  if (P.face > 0.5) ellipse(g, 0, -80 + b, 24, 32, CREAM)
  else ellipse(g, -12, -108 + b, 14, 20, 'rgba(255,255,255,0.14)', -0.3)

  // Jetpack on the back, flames out of the bottom.
  if (P.jet > 0) {
    for (const side of [-1, 1]) {
      const len = (34 + Math.sin(P.time * 50 + side * 2) * 10 + Math.random() * 10) * P.jet
      ellipse(g, side * 15, -58 + b + len * 0.55, 11, len * 0.75, '#ff7a1a')
      ellipse(g, side * 15, -58 + b + len * 0.4, 6, len * 0.5, '#ffe14d')
      rrect(g, side * 15 - 11, -72 + b, 22, 16, 5, '#5b6470')
    }
    rrect(g, -30, -132 + b, 60, 64, 14, '#aab4c0', '#6f7a88', 4)
    rrect(g, -18, -122 + b, 36, 12, 6, '#ff5d5d')
    circle(g, 0, -92 + b, 8, '#ffe14d')
  }

  // Arms swing against the legs; up in the air, out like wings on the jetpack.
  for (const side of [-1, 1]) {
    const sw = Math.sin(P.run + (side > 0 ? 0 : Math.PI))
    let hx = side * (46 + Math.abs(sw) * 4)
    let hy = -84 + b - sw * 16
    if (P.jet > 0.5) {
      hx = side * 78
      hy = -112 + Math.sin(P.time * 9 + side) * 5
    } else if (P.air > 0.5) {
      hx = side * 58
      hy = -150
    }
    line(g, side * 31, -114 + b, hx, hy, ORANGE, 15)
    circle(g, hx, hy, 9, DARK)
  }

  // Tail: a fat brush with a cream tip that swings with the stride.
  const sway = clamp(Math.sin(P.run * 0.5) * 0.95 * ground + P.tail + (P.sit ? 0.9 : 0), -1.35, 1.35)
  const tailUp = lerp(1, -0.35, Math.max(P.air, P.jet))
  const bx = 0
  const by = -62 + b
  const ex = sway * 78
  const ey = by - (62 + (1 - Math.min(1, Math.abs(sway))) * 22) * tailUp
  const cx = sway * 74
  const cy = by + 10
  g.lineCap = 'round'
  g.strokeStyle = ORANGE_D
  g.lineWidth = 38
  g.beginPath()
  g.moveTo(bx, by)
  g.quadraticCurveTo(cx, cy, ex, ey)
  g.stroke()
  g.strokeStyle = ORANGE
  g.lineWidth = 30
  g.beginPath()
  g.moveTo(bx, by)
  g.quadraticCurveTo(cx, cy, ex, ey)
  g.stroke()
  // The tip is the last third of the same curve.
  const t = 0.72
  const mx = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * ex
  const my = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * ey
  line(g, mx, my, ex, ey, CREAM, 30)

  // Scarf: a band and two tails that flap away from the lean.
  const flapX = -P.lean * 34
  g.strokeStyle = SCARF_D
  g.lineWidth = 11
  for (let k = 0; k < 2; k++) {
    const w = Math.sin(P.time * 15 + k * 1.9) * 8
    g.strokeStyle = k === 0 ? SCARF_D : SCARF
    g.beginPath()
    g.moveTo(20, -128 + b)
    g.quadraticCurveTo(44 + flapX * 0.6, -142 + w + b, 66 + flapX + k * 6, -128 - k * 18 + w * 1.6 + b)
    g.stroke()
  }
  rrect(g, -32, -137 + b, 64, 18, 9, SCARF)

  foxHead(g, P, b)

  if (P.magnet) sprite(g, '🧲', 0, -292 + Math.sin(P.time * 6) * 6, 54, Math.sin(P.time * 4) * 0.25)
  g.restore()
}

// A low barrier. The chevrons point the way over it.
export function drawBarrier(g: CanvasRenderingContext2D, zone: Zone, time: number): void {
  const [base, mark] = zone.barrier
  shadow(g, 0, 2, 112, 1, 0.24)
  for (const side of [-1, 1]) {
    rrect(g, side * 78 - 11, -44, 22, 44, 5, '#59616e')
    rrect(g, side * 78 - 24, -12, 48, 13, 6, '#3e4550')
  }
  rrect(g, -106, -104, 212, 66, 14, base, 'rgba(0,0,0,0.28)', 5)
  rrect(g, -100, -99, 200, 16, 8, 'rgba(255,255,255,0.22)')
  g.strokeStyle = mark
  g.lineWidth = 12
  g.lineJoin = 'round'
  for (let i = -1; i <= 1; i++) {
    g.beginPath()
    g.moveTo(i * 62 - 20, -58)
    g.lineTo(i * 62, -82)
    g.lineTo(i * 62 + 20, -58)
    g.stroke()
  }
  const on = Math.floor(time * 3) % 2 === 0
  for (const side of [-1, 1]) {
    circle(g, side * 88, -112, 12, (side > 0) === on ? '#ffe14d' : '#c98a00', 'rgba(0,0,0,0.3)', 3)
  }
}

// A high beam on two posts. The chevrons point under it.
export function drawBeam(g: CanvasRenderingContext2D, zone: Zone, time: number): void {
  const [base, mark, post] = zone.beam
  ellipse(g, 0, 2, 126, 15, 'rgba(0,0,0,0.2)')
  for (const side of [-1, 1]) {
    rrect(g, side * 108 - 11, -240, 22, 240, 6, post)
    rrect(g, side * 108 - 20, -12, 40, 13, 6, '#3e4550')
  }
  // Streamers hang off the bar so the gap under it reads as a gap.
  for (let i = -3; i <= 3; i++) {
    const swing = Math.sin(time * 5 + i) * 5
    line(g, i * 28, -170, i * 28 + swing, -142, i % 2 === 0 ? base : mark, 6)
  }
  rrect(g, -126, -250, 252, 82, 14, base, 'rgba(0,0,0,0.28)', 5)
  rrect(g, -120, -245, 240, 18, 9, 'rgba(255,255,255,0.25)')
  g.strokeStyle = mark
  g.lineWidth = 12
  g.lineJoin = 'round'
  for (let i = -1; i <= 1; i++) {
    g.beginPath()
    g.moveTo(i * 66 - 20, -222)
    g.lineTo(i * 66, -196)
    g.lineTo(i * 66 + 20, -222)
    g.stroke()
  }
}

function poly(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, fill: string): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.lineTo(x3, y3)
  g.lineTo(x4, y4)
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

const BOX_HALF = 100
const BOX_HALF_LANES = BOX_HALF / 232

// The back of a parked cart, asleep. Origin at the ground, centre.
function cartFace(g: CanvasRenderingContext2D, zone: Zone, time: number, seed: number): void {
  const [body, roof, , topper] = zone.cart
  const H = 205
  for (const side of [-1, 1]) rrect(g, side * 72 - 18, -30, 36, 32, 8, '#23262d')
  rrect(g, -BOX_HALF, -H, BOX_HALF * 2, H - 14, 22, body, 'rgba(0,0,0,0.25)', 5)
  rrect(g, -BOX_HALF + 8, -H + 6, BOX_HALF * 2 - 16, 20, 10, roof)
  // Rear window with sleeping eyes.
  rrect(g, -74, -172, 148, 72, 16, '#2c3e57')
  g.strokeStyle = '#ffffff'
  g.lineWidth = 6
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(side * 34, -140, 15, 0.12 * Math.PI, 0.88 * Math.PI)
    g.stroke()
  }
  // Bumper, lights, a little snoring mouth.
  rrect(g, -BOX_HALF + 4, -50, BOX_HALF * 2 - 8, 26, 10, 'rgba(0,0,0,0.25)')
  for (const side of [-1, 1]) rrect(g, side * 70 - 16, -84, 32, 20, 8, '#ff4d4d', '#b92d2d', 3)
  ellipse(g, 0, -74, 9 + Math.sin(time * 2 + seed * 9) * 3, 7 + Math.sin(time * 2 + seed * 9) * 3, '#1e1428')
  // The thing on the roof, and a drifting Z.
  sprite(g, topper, 0, -H - 30, 76)
  const zt = (time * 0.6 + seed) % 1
  g.globalAlpha = 1 - zt
  drawTextSprite(g, textSprite('z', 52, '#ffffff', 'rgba(30,20,40,0.7)'), 70 + zt * 30, -H - 40 - zt * 70, (30 + zt * 22) / 52)
  g.globalAlpha = 1
}

// The front of a train, wide awake and cross.
function trainFace(g: CanvasRenderingContext2D, zone: Zone, time: number, look: number): void {
  const [body, roof, , stripe] = zone.train
  const H = 255
  rrect(g, -BOX_HALF, -H, BOX_HALF * 2, H - 10, 30, body, 'rgba(0,0,0,0.3)', 6)
  rrect(g, -BOX_HALF + 10, -H + 6, BOX_HALF * 2 - 20, 22, 11, roof)
  // Windscreen with eyes and angry brows.
  rrect(g, -80, -222, 160, 96, 22, '#1f2a3d')
  eyes(g, 0, -176, 25, look, 0.35, 0, 1.3)
  g.strokeStyle = '#1e1428'
  g.lineWidth = 10
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(side * 66, -214)
    g.lineTo(side * 14, -196)
    g.stroke()
  }
  rrect(g, -BOX_HALF + 4, -120, BOX_HALF * 2 - 8, 18, 6, stripe)
  // Headlights flare.
  const flare = 0.5 + Math.sin(time * 18) * 0.2
  for (const side of [-1, 1]) {
    circle(g, side * 66, -78, 30, `rgba(255,244,170,${0.35 * flare + 0.15})`)
    circle(g, side * 66, -78, 17, '#fff6b0', '#c9a400', 4)
  }
  // Grille as a grumpy mouth.
  rrect(g, -42, -64, 84, 40, 10, '#2b2f38')
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = 4
  for (let i = -2; i <= 2; i++) {
    g.beginPath()
    g.moveTo(i * 14, -58)
    g.lineTo(i * 14, -30)
    g.stroke()
  }
}

// A box in perspective (a cart or a train): roof, the side that faces the
// camera, then the near face with its drawing. `zTrue` is the near face, which
// may already be behind the camera; the box is clipped there.
export function drawBox(
  g: CanvasRenderingContext2D,
  cam: Cam,
  kind: 'cart' | 'train',
  zone: Zone,
  x: number,
  lift: number,
  zTrue: number,
  lenTrue: number,
  time: number,
  seed: number,
  look: number,
): void {
  const z0 = Math.max(zTrue, ZNEAR)
  const zEnd = zTrue + lenTrue
  if (zEnd <= z0) return
  const colors = kind === 'cart' ? zone.cart : zone.train
  const height = kind === 'cart' ? 205 : 255
  const s1 = scaleAt(z0)
  const s2 = scaleAt(zEnd)
  const l1 = sx(cam, x - BOX_HALF_LANES, s1)
  const r1 = sx(cam, x + BOX_HALF_LANES, s1)
  const l2 = sx(cam, x - BOX_HALF_LANES, s2)
  const r2 = sx(cam, x + BOX_HALF_LANES, s2)
  const b1 = sy(lift, s1)
  const b2 = sy(lift, s2)
  const t1 = sy(lift + height, s1)
  const t2 = sy(lift + height, s2)
  if (lift < 1) {
    // Ground shadow under the whole length.
    poly(g, l1 - 8 * s1, b1 + 5 * s1, r1 + 8 * s1, b1 + 5 * s1, r2 + 8 * s2, b2, l2 - 8 * s2, b2, 'rgba(0,0,0,0.2)')
  }
  // A strip of the box between two depths, at a given pair of heights, on one
  // vertical plane (the side) or across the roof.
  const sideStrip = (ex: number, za: number, zb: number, h1: number, h2: number, fill: string) => {
    const a = Math.max(za, z0)
    const b = Math.min(zb, zEnd)
    if (b <= a) return
    const sa = scaleAt(a)
    const sb = scaleAt(b)
    const xa = sx(cam, ex, sa)
    const xb = sx(cam, ex, sb)
    poly(g, xa, sy(lift + h2, sa), xa, sy(lift + h1, sa), xb, sy(lift + h1, sb), xb, sy(lift + h2, sb), fill)
  }
  const roofStrip = (xa: number, xb: number, za: number, zb: number, fill: string) => {
    const a = Math.max(za, z0)
    const b = Math.min(zb, zEnd)
    if (b <= a) return
    const sa = scaleAt(a)
    const sb = scaleAt(b)
    const ya = sy(lift + height, sa)
    const yb = sy(lift + height, sb)
    poly(g, sx(cam, x + xa, sa), ya, sx(cam, x + xb, sa), ya, sx(cam, x + xb, sb), yb, sx(cam, x + xa, sb), yb, fill)
  }
  const edge = x + BOX_HALF_LANES < cam.x ? 1 : x - BOX_HALF_LANES > cam.x ? -1 : 0
  if (edge !== 0) {
    const ex = x + edge * BOX_HALF_LANES
    sideStrip(ex, zTrue, zEnd, 0, height, colors[2])
    if (kind === 'train') {
      // Three carriages: windows, a stripe, and dark gaps between them.
      const car = lenTrue / 3
      for (let i = 0; i < 3; i++) {
        const c0 = zTrue + i * car
        sideStrip(ex, c0 + car * 0.08, c0 + car * 0.46, 120, 205, 'rgba(20,30,50,0.55)')
        sideStrip(ex, c0 + car * 0.54, c0 + car * 0.92, 120, 205, 'rgba(20,30,50,0.55)')
        if (i > 0) sideStrip(ex, c0 - 16, c0 + 16, 0, height, 'rgba(0,0,0,0.35)')
      }
      sideStrip(ex, zTrue, zEnd, 92, 108, colors[3])
    } else {
      sideStrip(ex, zTrue + lenTrue * 0.12, zTrue + lenTrue * 0.88, 118, 182, 'rgba(20,30,50,0.5)')
    }
  }
  poly(g, l1, t1, r1, t1, r2, t2, l2, t2, colors[1])
  if (kind === 'train') {
    const car = lenTrue / 3
    roofStrip(-BOX_HALF_LANES * 0.3, BOX_HALF_LANES * 0.3, zTrue, zEnd, 'rgba(0,0,0,0.1)')
    for (let i = 0; i < 3; i++) {
      const c0 = zTrue + i * car
      if (i > 0) roofStrip(-BOX_HALF_LANES, BOX_HALF_LANES, c0 - 16, c0 + 16, 'rgba(0,0,0,0.35)')
      roofStrip(-BOX_HALF_LANES * 0.55, BOX_HALF_LANES * 0.55, c0 + car * 0.35, c0 + car * 0.65, 'rgba(255,255,255,0.35)')
    }
  } else {
    roofStrip(-BOX_HALF_LANES * 0.62, BOX_HALF_LANES * 0.62, zTrue + lenTrue * 0.22, zTrue + lenTrue * 0.8, 'rgba(0,0,0,0.12)')
  }
  // Once the near face is behind the camera only the roof and side show.
  if (zTrue < ZNEAR) return
  g.save()
  g.translate((l1 + r1) / 2, b1)
  g.scale(s1, s1)
  if (kind === 'cart') cartFace(g, zone, time, seed)
  else trainFace(g, zone, time, look)
  g.restore()
}

// A coin seen at scale 1, spinning on its vertical axis.
export function drawCoin(g: CanvasRenderingContext2D, x: number, y: number, s: number, spin: number, gold: boolean): void {
  const r = 24 * s
  const w = Math.max(0.16, Math.abs(Math.cos(spin)))
  if (s < 0.22) {
    ellipse(g, x, y, r * w, r, gold ? '#ffd23f' : '#ffe680')
    return
  }
  ellipse(g, x, y, r * w + 2 * s, r + 2 * s, '#c97f00')
  ellipse(g, x, y, r * w, r, '#ffd23f')
  ellipse(g, x, y, r * w * 0.68, r * 0.68, '#ffe680')
  if (w > 0.5) ellipse(g, x - r * 0.28 * w, y - r * 0.3, r * 0.16 * w, r * 0.26, 'rgba(255,255,255,0.85)', 0.5)
}

// A power-up floating in a bubble with rays behind it. Origin at its centre.
export function drawPickup(g: CanvasRenderingContext2D, char: string, time: number, color: string): void {
  g.save()
  g.rotate(time * 1.4)
  g.fillStyle = color
  g.globalAlpha = 0.45
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8
    g.beginPath()
    g.moveTo(Math.cos(a - 0.16) * 60, Math.sin(a - 0.16) * 60)
    g.lineTo(Math.cos(a) * 108, Math.sin(a) * 108)
    g.lineTo(Math.cos(a + 0.16) * 60, Math.sin(a + 0.16) * 60)
    g.closePath()
    g.fill()
  }
  g.globalAlpha = 1
  g.restore()
  const pulse = 1 + Math.sin(time * 7) * 0.06
  circle(g, 0, 0, 62 * pulse, 'rgba(255,255,255,0.35)', '#ffffff', 6)
  ellipse(g, -24, -30, 16, 9, 'rgba(255,255,255,0.7)', -0.6)
  sprite(g, char, 0, 0, 78 * pulse, Math.sin(time * 3) * 0.2)
}

const ARCH = ['#ff5d6c', '#ff9f43', '#ffd93d', '#4cd97b', '#38bdf8', '#8b7bff']

// The rainbow over the track where one zone ends and the next begins.
export function drawArch(g: CanvasRenderingContext2D, char: string, time: number): void {
  const R = 500
  g.lineCap = 'butt'
  ARCH.forEach((color, i) => {
    g.strokeStyle = color
    g.lineWidth = 27
    g.beginPath()
    g.arc(0, 0, R - i * 26, Math.PI, TAU)
    g.stroke()
  })
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    // A cloud at each foot.
    const cx = side * (R - 65)
    circle(g, cx, -30, 66, '#ffffff')
    circle(g, cx - 60, -10, 46, '#ffffff')
    circle(g, cx + 60, -10, 46, '#ffffff')
  }
  const bob = Math.sin(time * 4) * 10
  circle(g, 0, -R - 20 + bob, 78, '#ffffff', 'rgba(0,0,0,0.15)', 6)
  sprite(g, char, 0, -R - 20 + bob, 104)
}

// A "train coming" sign for the lane, drawn at scale 1 around its centre.
export function drawWarning(g: CanvasRenderingContext2D, time: number): void {
  const pulse = 1 + Math.sin(time * 14) * 0.12
  g.save()
  g.scale(pulse, pulse)
  g.beginPath()
  g.moveTo(0, -46)
  g.lineTo(44, 32)
  g.lineTo(-44, 32)
  g.closePath()
  g.fillStyle = '#ffd23f'
  g.fill()
  g.lineJoin = 'round'
  g.strokeStyle = '#d62828'
  g.lineWidth = 9
  g.stroke()
  rrect(g, -5, -20, 10, 28, 5, '#1e1428')
  circle(g, 0, 20, 6, '#1e1428')
  g.restore()
}

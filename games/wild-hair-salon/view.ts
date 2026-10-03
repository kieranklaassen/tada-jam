import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'
import type { Hair } from './hair'
import { BLADES } from './hand'
import { COLLAR_Y, FLOOR_Y, HEAD, LOCK_X, STEP, STRIP_W, fit } from './layout'
import { LION } from './paintAnimals'
import { SPOT_Y, clippingBox, tuftPose, type Point } from './poses'
import type { Puppet } from './puppet'
import type { Sprite, Sprites } from './sprites'
import { GRAPHITE, PAPER, type Ctx } from './wash'
import type { Salon } from './world'

// One frame of the toy. The painted pieces are stamped where the puppet and
// the hair say they are; the plain pieces (the lock and the clippings) and
// the face's features are drawn fresh, flat, each frame, which is cheap and
// lets them change length and expression freely. Returns how many pieces it
// drew, for the grown-up overlay.

const INK = '#3b3136'
/** How far above the collar the lock comes out of the mane. */
const ROOT = 30
const STEEL = '#cfd2dc', STEEL_EDGE = '#8a8fa0', HANDLE = '#ee7c62'
const HUE: Record<string, { fill: string; edge: string }> = {
  lion: { fill: LION.lock, edge: LION.lockEdge },
  poodle: { fill: '#e4588c', edge: '#a8366a' },
  yak: { fill: '#8a5a3a', edge: '#5d3a22' },
  rabbit: { fill: '#b9aea6', edge: '#857a72' },
  ribbon: { fill: '#3fa58f', edge: '#27705f' },
}

export type Frame = {
  salon: Salon | null
  puppet: Puppet
  hair: Hair
  guidance: Guidance | null
  /** Seconds of play, for the things that breathe. */
  time: number
}

const pose: HandPose = { travel: 0, press: 0, opacity: 0 }

export function drawFrame(g: Ctx, width: number, height: number, sprites: Sprites, frame: Frame): number {
  let drawn = 1
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.drawImage(sprites.backdrop.canvas, 0, 0)
  const { salon, puppet, hair } = frame
  // Before the slot has been read, and with nobody in the chair, the room is all there is.
  if (!salon || salon.chair === null) return drawn

  const f = fit(width, height)
  g.setTransform(f.scale, 0, 0, f.scale, f.dx, f.dy)
  const stamp = (sprite: Sprite): void => { g.drawImage(sprite.sheet.canvas, sprite.box.x, sprite.box.y, sprite.box.w, sprite.box.h); drawn++ }
  const breath = Math.sin(puppet.breath * Math.PI * 2)

  // The tail, behind the cape: a pencil line and its tuft, which swishes.
  const swish = puppet.at('tail') * 0.55, tailX = 276 + Math.sin(swish) * 26, tailY = FLOOR_Y - 150 - Math.abs(Math.sin(swish)) * 8
  pencil(g, [{ x: 322, y: FLOOR_Y - 20 }, { x: 268, y: FLOOR_Y - 46 }, { x: 250 + Math.sin(swish) * 10, y: FLOOR_Y - 108 }, { x: tailX, y: tailY }], 1.6)
  g.save()
  g.translate(tailX, tailY)
  g.rotate(0.5 + swish)
  stamp(sprites.tailTuft)
  g.restore()

  // The head: everything on it moves with it.
  const headX = HEAD.x + puppet.lean.x.x + puppet.cheek.x.x * 0.3
  const headY = HEAD.y + puppet.lean.y.x + puppet.cheek.y.x * 0.3 + puppet.at('sink') * 64 + puppet.at('bob') * 12 + breath * 1.6
  g.save()
  g.translate(headX, headY)
  g.rotate(puppet.at('tilt') * 0.17)
  const count = salon.mane.length
  salon.mane.forEach((steps, index) => {
    const tuft = hair.tufts[index]
    if (!tuft) return
    const at = tuftPose(index, steps, count)
    const painted = sprites.tuft(index, steps, count, hair.holdsTuft === index)
    const frizz = 1 + tuft.frizz * 0.22
    g.save()
    g.translate(at.base.x, at.base.y)
    g.rotate(at.angle + tuft.lean.x + tuft.frizz * 0.25 * Math.sin(frame.time * 31 + index * 2.3))
    // A tuft that is longer or shorter than its sheet is stretched along itself until it is painted again.
    g.scale(frizz, (at.reach / tuftPose(index, painted.steps, count).reach) * Math.max(0.3, tuft.stretch.x) * frizz)
    stamp(painted.sprite)
    g.restore()
  })
  stamp(sprites.ruff)
  for (const side of [-1, 1]) {
    g.save()
    g.translate(side * 78, -60)
    g.scale(side, 1)
    g.rotate(puppet.at(side < 0 ? 'earL' : 'earR') * 0.42)
    stamp(sprites.ear)
    g.restore()
  }
  // A pulled cheek draws the whole face out like dough.
  const cx = puppet.cheek.x.x, cy = puppet.cheek.y.x
  g.save()
  g.transform(1 + Math.abs(cx) / 230, 0, 0, 1 + Math.abs(cy) / 230 - breath * 0.006, cx * 0.25, cy * 0.25)
  stamp(sprites.face)
  drawn += features(g, puppet)
  for (const piece of salon.clippings) if (piece.on === 'face' && piece.who === 'chair' && !hair.flights.has(piece) && hair.carried?.piece !== piece) drawn += strip(g, 0, SPOT_Y[piece.spot], (piece.len * STEP) / 2, 0, piece.hue)
  g.restore()
  g.restore()

  // The cape, over the chin when he ducks; it breathes a little.
  g.save()
  g.translate(HEAD.x, COLLAR_Y)
  g.scale(1 + breath * 0.004, 1 + breath * 0.006)
  g.translate(-HEAD.x, -COLLAR_Y)
  stamp(sprites.cape)
  g.restore()

  drawn += guide(g, sprites, frame, salon)
  drawn += lock(g, salon, hair, frame.time)

  // The pieces that lie still on the floor are drawn together, one path for each colour; a piece in the air is drawn by itself.
  const lying = new Map<string, { x: number; y: number; half: number; turn: number }[]>()
  salon.clippings.forEach((piece, index) => {
    if (piece.on !== 'floor' || hair.carried?.piece === piece) return
    const flight = hair.flights.get(piece)
    if (flight) { drawn += strip(g, flight.x, flight.y, (piece.len * STEP) / 2, flight.turn, piece.hue); return }
    const box = clippingBox(piece)
    const group = lying.get(piece.hue) ?? []
    group.push({ x: box.x, y: box.y, half: box.half, turn: ((index % 5) - 2) * 0.05 })
    lying.set(piece.hue, group)
  })
  for (const [hue, group] of lying) drawn += strips(g, group, hue)
  for (const [piece, flight] of hair.flights) if (piece.on === 'face') drawn += strip(g, flight.x, flight.y, (piece.len * STEP) / 2, flight.turn, piece.hue)
  if (hair.carried) drawn += strip(g, hair.carried.at.x, hair.carried.at.y - 18, (hair.carried.piece.len * STEP) / 2, Math.sin(frame.time * 26) * 0.22, hair.carried.piece.hue)

  for (const puff of hair.puffs) {
    const fade = 1 - puff.age / puff.life
    g.globalAlpha = Math.max(0, fade) * 0.85
    g.fillStyle = puff.hue
    g.beginPath()
    g.arc(puff.x, puff.y, puff.r * (puff.rolls ? fade : 1 + (1 - fade) * 0.6), 0, Math.PI * 2)
    g.fill()
    drawn++
  }
  g.globalAlpha = 1

  if (hair.scissors.shown > 0) drawn += scissors(g, hair.scissors.at, hair.scissors.open.x, hair.scissors.shown)
  g.setTransform(1, 0, 0, 1, 0, 0)
  return drawn
}

/** A pencil line through some points. */
function pencil(g: Ctx, points: readonly Point[], weight = 1.2, alpha = 0.6): void {
  g.save()
  g.strokeStyle = GRAPHITE
  g.globalAlpha *= alpha
  g.lineWidth = weight
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length - 1; i++) g.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2)
  g.lineTo(points[points.length - 1].x, points[points.length - 1].y)
  g.stroke()
  g.restore()
}

/** A flat strip lying about a point: a clipping, or a worn piece. One colour and a darker rim. */
function strip(g: Ctx, x: number, y: number, half: number, turn: number, hue: string): number {
  const colour = HUE[hue] ?? HUE.lion, h = STRIP_W / 2
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.fillStyle = colour.fill
  g.strokeStyle = colour.edge
  g.lineWidth = 2.4
  g.beginPath()
  g.rect(-half, -h, half * 2, h * 2)
  g.fill()
  g.stroke()
  g.restore()
  return 2
}

/** Several flat strips of one colour in one path: the pieces that lie on the floor. */
function strips(g: Ctx, group: readonly { x: number; y: number; half: number; turn: number }[], hue: string): number {
  const colour = HUE[hue] ?? HUE.lion, h = STRIP_W / 2
  g.fillStyle = colour.fill
  g.strokeStyle = colour.edge
  g.lineWidth = 2.4
  g.beginPath()
  for (const piece of group) {
    const c = Math.cos(piece.turn), s = Math.sin(piece.turn)
    const corner = (u: number, w: number): void => { const x = piece.x + u * c - w * s, y = piece.y + u * s + w * c; if (u < 0 && w < 0) g.moveTo(x, y); else g.lineTo(x, y) }
    corner(-piece.half, -h)
    corner(piece.half, -h)
    corner(piece.half, h)
    corner(-piece.half, h)
    g.closePath()
  }
  g.fill()
  g.stroke()
  return 2
}

/** The lock: a flat strip from the collar, as long as the model says, swinging from its root. Fanned out while it is ruffled. */
function lock(g: Ctx, salon: Salon, hair: Hair, time: number): number {
  const colour = HUE[salon.chair ?? 'lion'] ?? HUE.lion
  const length = Math.max(6, salon.lock * STEP * Math.max(0.3, hair.lockStretch.x)), half = STRIP_W / 2
  const strands = hair.lockFlutter > 0 ? 3 : 1
  let drawn = 0
  // Where the lock comes out of the mane, above the collar: this part does not swing, and is no part of its length.
  g.fillStyle = colour.fill
  g.strokeStyle = colour.edge
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(LOCK_X - half * 0.7, COLLAR_Y - ROOT)
  g.lineTo(LOCK_X + half * 0.7, COLLAR_Y - ROOT)
  g.lineTo(LOCK_X + half, COLLAR_Y + 1)
  g.lineTo(LOCK_X - half, COLLAR_Y + 1)
  g.closePath()
  g.fill()
  g.stroke()
  drawn += 2
  for (let i = 0; i < strands; i++) {
    const spread = strands === 1 ? 0 : (i - 1) * 0.3 * hair.lockFlutter + Math.sin(time * 38 + i * 2.1) * 0.07 * hair.lockFlutter
    const w = strands === 1 ? half : half * 0.62
    g.save()
    g.translate(LOCK_X, COLLAR_Y)
    g.rotate(-(hair.lockSwing.x + spread))
    g.fillStyle = colour.fill
    g.strokeStyle = colour.edge
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(-w, 0)
    g.lineTo(w, 0)
    g.lineTo(w, length - Math.min(w, length))
    g.arc(0, length - Math.min(w, length), w, 0, Math.PI)
    g.closePath()
    g.fill()
    g.stroke()
    g.strokeStyle = GRAPHITE
    g.globalAlpha = 0.5
    g.lineWidth = 1.1
    g.stroke()
    g.restore()
    drawn += 3
  }
  return drawn
}

/** The face: eyes, brows, nose, mouth and whiskers, in pencil and a few dark dots, where the puppet's parts put them. */
function features(g: Ctx, puppet: Puppet): number {
  const blink = Math.max(0, Math.min(1, puppet.at('blink'))), wide = puppet.at('wide'), cross = puppet.at('cross')
  const lookX = puppet.at('lookX') * 9, lookY = puppet.at('lookY') * 8, brow = puppet.at('brow')
  for (const side of [-1, 1]) {
    const ex = side * 40 + lookX - side * cross * 15, ey = -14 + lookY
    const r = 13 * (1 + wide * 0.3)
    if (blink > 0.75) pencil(g, [{ x: ex - 15, y: ey }, { x: ex, y: ey + 7 }, { x: ex + 15, y: ey }], 2.4, 0.9)
    else {
      g.fillStyle = INK
      g.beginPath()
      g.ellipse(ex, ey + blink * 4, r, r * (1 - blink * 0.85), 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = PAPER
      g.beginPath()
      g.arc(ex - 4, ey - 4, 4.2, 0, Math.PI * 2)
      g.fill()
    }
    // Brows: the inner end goes up when he wonders and down when he is cross-eyed with effort.
    pencil(g, [{ x: side * 40 - 19, y: -44 - brow * 7 + side * 2 - side * brow * 5 }, { x: side * 40, y: -51 - brow * 12 }, { x: side * 40 + 19, y: -44 - brow * 7 - side * 2 + side * brow * 5 }], 2, 0.8)
  }
  const nx = puppet.at('nose') * 3.5
  g.fillStyle = LION.nose
  g.beginPath()
  g.moveTo(-15 + nx, 18)
  g.quadraticCurveTo(nx, 12, 15 + nx, 18)
  g.quadraticCurveTo(8 + nx, 33, nx, 34)
  g.quadraticCurveTo(-8 + nx, 33, -15 + nx, 18)
  g.fill()
  // The mouth: a curve that smiles or droops, and opens.
  const smile = puppet.at('smile'), open = Math.max(0, puppet.at('mouthOpen'))
  pencil(g, [{ x: nx, y: 34 }, { x: 0, y: 44 }], 1.3, 0.7)
  if (open > 0.08) {
    g.fillStyle = '#a5483a'
    g.beginPath()
    g.ellipse(0, 52 + open * 9, 15 + open * 7, 4 + open * 17, 0, 0, Math.PI * 2)
    g.fill()
  }
  pencil(g, [{ x: -27, y: 47 - smile * 11 }, { x: -11, y: 46 + smile * 6 }, { x: 0, y: 44 }, { x: 11, y: 46 + smile * 6 }, { x: 27, y: 47 - smile * 11 }], 2, 0.85)
  g.fillStyle = INK
  g.beginPath()
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const wx = side * (34 + i * 9) + nx * 0.5, wy = 40 + (i % 2) * 6
    g.moveTo(wx + 1.7, wy)
    g.arc(wx, wy, 1.7, 0, Math.PI * 2)
  }
  g.fill()
  // Two eyes of two marks each, two brows, the nose, three marks for the mouth and the whiskers.
  return 11
}

/** The scissors in the hand: two flat blades that cross above the finger, and two loops, big enough to read as scissors at a glance. */
function scissors(g: Ctx, at: Point, open: number, shown: number): number {
  const angle = 0.12 + Math.max(0, open) * 0.4
  g.save()
  g.globalAlpha = shown
  g.translate(at.x + BLADES.x, at.y + BLADES.y)
  g.rotate(-0.5)
  for (const side of [-1, 1]) {
    g.save()
    g.rotate(side * angle)
    g.fillStyle = STEEL
    g.strokeStyle = STEEL_EDGE
    g.lineWidth = 2.2
    g.beginPath()
    g.moveTo(-9, 14)
    g.lineTo(-1, -84)
    g.quadraticCurveTo(7, -60, 10, 14)
    g.closePath()
    g.fill()
    g.stroke()
    g.strokeStyle = HANDLE
    g.lineWidth = 9
    g.beginPath()
    g.ellipse(side * 5, 46, 16, 22, 0, 0, Math.PI * 2)
    g.stroke()
    g.restore()
  }
  g.fillStyle = STEEL_EDGE
  g.beginPath()
  g.arc(0, 0, 4.5, 0, Math.PI * 2)
  g.fill()
  g.restore()
  return 5
}

/** The idle ladder's first form: a breathing glow on the lock, then a ghost hand that shows one move on it. */
function guide(g: Ctx, sprites: Sprites, frame: Frame, salon: Salon): number {
  const guidance = frame.guidance
  if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return 0
  let drawn = 0
  if (guidance.glow > 0) {
    // Tight on the lock, so it marks one thing and does not haze the scene.
    const length = Math.max(60, salon.lock * STEP)
    g.save()
    g.globalAlpha = guidance.glow * (0.8 + 0.2 * Math.sin(frame.time * 2.4))
    g.translate(LOCK_X, COLLAR_Y + length / 2)
    g.scale(0.95, (length + 70) / 120)
    g.drawImage(sprites.glow.sheet.canvas, sprites.glow.box.x, sprites.glow.box.y, sprites.glow.box.w, sprites.glow.box.h)
    g.restore()
    drawn++
  }
  if (guidance.demo !== null) {
    // The toy has no answer to give away, so the hand shows the verb on the lock itself: it pulls it longer, and
    // every other time it comes in from the side with the scissors and crosses it. A lock that is already down
    // to the floor is only ever snipped.
    const length = salon.lock * STEP, snip = guidance.demoIndex % 2 === 1 || salon.lock > 90
    handPose(guidance.demo, true, pose)
    const from = snip ? { x: LOCK_X + 120, y: COLLAR_Y + length * 0.55 } : { x: LOCK_X, y: COLLAR_Y + Math.max(24, length * 0.7) }
    const to = snip ? { x: LOCK_X - 110, y: COLLAR_Y + length * 0.55 } : { x: LOCK_X + 14, y: Math.min(FLOOR_Y + 40, COLLAR_Y + length + 90) }
    const x = from.x + (to.x - from.x) * pose.travel, y = from.y + (to.y - from.y) * pose.travel
    if (snip) drawn += scissors(g, { x, y: y - BLADES.y }, Math.abs(pose.travel - 0.52) < 0.08 ? 0 : 1, pose.opacity * 0.8)
    drawn += ghostHand(g, x, snip ? y - BLADES.y : y, pose.press, pose.opacity)
  }
  return drawn
}

/** A pale hand with one finger out, pressed down a little while it works. */
function ghostHand(g: Ctx, x: number, y: number, press: number, opacity: number): number {
  g.save()
  g.globalAlpha = opacity * 0.85
  g.translate(x, y + 6 - press * 6)
  g.scale(1.3 - press * 0.08, 1.3 - press * 0.08)
  g.fillStyle = '#fff6e6'
  g.strokeStyle = GRAPHITE
  g.lineWidth = 2
  g.beginPath()
  // The finger, whose tip is the point, and the palm below it.
  g.moveTo(-9, 4)
  g.quadraticCurveTo(-10, -8, 0, -8)
  g.quadraticCurveTo(10, -8, 9, 4)
  g.lineTo(10, 34)
  g.quadraticCurveTo(34, 34, 34, 56)
  g.quadraticCurveTo(34, 86, 6, 88)
  g.quadraticCurveTo(-24, 88, -26, 60)
  g.quadraticCurveTo(-26, 44, -10, 40)
  g.closePath()
  g.fill()
  g.stroke()
  g.restore()
  return 2
}

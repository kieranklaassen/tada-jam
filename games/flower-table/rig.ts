import { MANNER, neutral, type Act, type Pose } from './acting'
import { RIG, type VisitorId } from './cast'
import { stamp, type Figures } from './figures'
import { drawStretch, type Flora } from './flora'
import type { G } from './paint'
import { PLANTS, type Kind } from './plants'

// How a visitor is put together on the canvas: its painted parts (figures.ts)
// moved by a pose (acting.ts). The four share nothing but the order of the
// parts: each has its own body, its own head, its own special part and its
// own way of standing still. Drawn about the middle of the head, at full
// size; the caller places and scales it.

const TAU = Math.PI * 2
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

/** What the rig needs to know of a visitor this frame. */
export type Look = {
  who: VisitorId
  pose: Pose
  act: Act | null
  /** Game time, for the way it stands still; a painted portrait passes 0. */
  time: number
  /** Where its eyes are turned, -1 to 1 each way. */
  gazeX: number
  gazeY: number
  blink: boolean
  /** How far it leans in to the vase, 0 to 1. */
  lean: number
  yellow: boolean
  loose: boolean
  /** The goat's own: its jaw, its ears, its tongue. */
  chew: number
  perk: number
  flick: number
  lick: number
}

export function restLook(who: VisitorId): Look {
  return { who, pose: neutral(), act: null, time: 0, gazeX: 0, gazeY: 0, blink: false, lean: 0, yellow: false, loose: false, chew: 0, perk: 0, flick: 0, lick: 0 }
}

/** The colours and sizes of the parts that are drawn each frame, by visitor. */
const FACE: Record<VisitorId, { white: string | null; eyeRx: number; eyeRy: number; pupil: number; lid: string; rest: number; mouthRx: number; faceR: number; noseR: number }> = {
  goat: { white: null, eyeRx: 20, eyeRy: 16, pupil: 8, lid: '#e2d2b0', rest: 0.4, mouthRx: 17, faceR: 60, noseR: 14 },
  beekeeper: { white: '#fbf7ea', eyeRx: 9, eyeRy: 9, pupil: 4.6, lid: '#5f6456', rest: 0, mouthRx: 6, faceR: 28, noseR: 7 },
  bride: { white: '#fffaf2', eyeRx: 6.5, eyeRy: 5.5, pupil: 3.2, lid: '#f3cfae', rest: 0.12, mouthRx: 6, faceR: 30, noseR: 6 },
  aunt: { white: '#fbf6ee', eyeRx: 7, eyeRy: 4.6, pupil: 2.6, lid: '#ecd6c0', rest: 0.3, mouthRx: 5, faceR: 28, noseR: 6 },
}

/** The head of a flower alone, standing on the origin: what sits on a nose, a head or a behind for a moment. */
function flower(g: G, flora: Flora, density: number, kind: Kind, x: number, y: number, rot: number, scale: number): void {
  const sprite = flora[kind].whole
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(scale, scale)
  g.translate(0, sprite.full - PLANTS[kind].head - 6)
  drawStretch(g, sprite, density, sprite.full - PLANTS[kind].head - 6, sprite.full)
  g.restore()
}

/** Draws the visitor about the middle of its head and returns how many stamps and paths it took. */
export function drawVisitor(g: G, figures: Figures, flora: Flora, density: number, look: Look): number {
  const { who, pose, time: t } = look
  const rig = RIG[who], face = FACE[who], size = MANNER[who].size
  let calls = 0
  const lean = look.lean
  const hx = pose.headX - 30 * size * lean, hy = pose.headY + 14 * size * lean
  let tilt = pose.tilt - 0.14 * size * lean
  const act = look.act, u = act ? act.u : 0
  const during = (from: number, to: number): boolean => u >= from && u < to
  const fill = (color: string): void => { g.fillStyle = color; g.fill(); calls++ }

  // --- The body, and how each one stands still ---------------------------------
  g.save()
  if (who === 'goat') {
    // Restless: it breathes hard and shifts its weight.
    g.translate(Math.sin(t * 0.9) * 2, figures.floors.goat)
    g.scale(1, 1 + Math.sin(t * 1.3) * 0.012)
    g.translate(0, -figures.floors.goat)
    stamp(g, figures.goatBody)
  } else if (who === 'beekeeper') {
    // Slow: she rocks from boot to boot.
    g.translate(0, figures.floors.beekeeper)
    g.rotate(Math.sin(t * 0.7) * 0.018)
    g.translate(0, -figures.floors.beekeeper)
    stamp(g, figures.keeperBody)
  } else if (who === 'bride') {
    // Floating: she rises and sinks, and her veil drifts behind her.
    g.translate(0, Math.sin(t * 1.1) * 4)
    g.save()
    g.translate(hx, hy - 46)
    g.rotate(tilt * 0.5 + Math.sin(t * 0.8) * 0.05 + pose.special * Math.PI)
    stamp(g, figures.brideVeil)
    g.restore()
    stamp(g, figures.brideBody)
    calls++
  } else {
    // Stiff: nothing moves but her eyes and, now and then, the eyebrow.
    stamp(g, figures.auntBody)
  }
  calls++

  // What a piece let go on it does below the head: a burr behind, a scarf round the neck.
  if (act?.name === 'drop' && during(0, 0.78)) {
    if (act.plant === 'thistle') { flower(g, flora, density, 'thistle', rig.behind.x, rig.behind.y, 1.2, 0.7); calls++ }
    if (act.plant === 'ivy') {
      const wound = clamp(u / 0.3, 0, 1) * clamp((0.78 - u) / 0.2, 0, 1)
      g.beginPath()
      for (let i = 0; i <= 24 * wound; i++) {
        const a = (i / 24) * TAU * 2.5
        const x = rig.neck.x + Math.sin(a) * (26 + size * 16), y = rig.neck.y - 8 + (i / 24) * 26 + Math.cos(a) * 5
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y)
      }
      g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#3f8a44'; g.stroke(); calls++
    }
  }

  // --- The head ------------------------------------------------------------------
  g.translate(hx, hy)
  g.rotate(tilt)
  const cross = pose.cross, gx = look.gazeX, gy = look.gazeY
  if (who === 'goat') {
    const perk = clamp(Math.max(look.perk * 1.6, pose.special), 0, 1)
    // The ears hang, go up at a snip, and one of them flicks now and then.
    for (const side of [-1, 1]) {
      const flick = look.flick !== 0 && Math.sign(look.flick) === side ? Math.sin(Math.abs(look.flick) * TAU) * 0.38 : 0
      g.save()
      g.translate(side * 48, -50)
      g.scale(side, 1)
      g.rotate(0.34 - 0.8 * perk + flick)
      stamp(g, figures.goatEar)
      g.restore()
    }
    // It chews sideways without end; the beard arrives a beat behind the jaw.
    const open = 3 + Math.cos(look.chew * 2) * 2 + 22 * pose.mouth
    if (pose.mouth > 0.05) { g.beginPath(); g.ellipse(0, 98 + open * 0.4, 17, open * 0.5, 0, 0, TAU); fill('#3a1612') }
    g.save()
    g.translate(Math.sin(look.chew) * 7, 88 + open)
    g.rotate(Math.sin(look.chew - 0.9) * 0.1)
    stamp(g, figures.goatJaw)
    g.restore()
    stamp(g, figures.goatHead)
    calls += 4
  } else if (who === 'beekeeper') {
    stamp(g, figures.keeperFace)
    // The veil hangs from the brim; a tendril can gather it up under the hat.
    g.save()
    g.translate(0, -52)
    g.scale(1, 1 - 0.8 * pose.special)
    g.translate(0, 52)
    stamp(g, figures.keeperVeil)
    g.restore()
    calls += 2
  } else if (who === 'bride') {
    stamp(g, figures.brideHead)
    calls++
  } else {
    // The bun: tight, or shaken loose and hanging off the back of her head; at a neat bunch it winds itself tighter.
    const bun = bunOf(look)
    g.save()
    g.translate(bun.x, bun.y)
    g.rotate(bun.turn)
    g.scale(bun.wide, bun.high)
    stamp(g, figures.auntBun)
    g.restore()
    stamp(g, figures.auntHead)
    calls += 2
  }

  // The eyes: where they look, crossed, rolled up, wide, shut.
  const wide = 1 + 0.3 * pose.wide
  if (face.white) {
    g.beginPath()
    for (const eye of rig.eyes) { g.moveTo(eye.x + face.eyeRx * wide, eye.y); g.ellipse(eye.x, eye.y, face.eyeRx * wide, face.eyeRy * wide, 0, 0, TAU) }
    fill(face.white)
  }
  const reachX = face.eyeRx - face.pupil * 0.7, reachY = face.eyeRy - face.pupil * 0.5
  g.beginPath()
  rig.eyes.forEach((eye, index) => {
    const side = index === 0 ? -1 : 1
    // The aunt's eyes do not drift: they snap from one thing to the next.
    const px = eye.x + (who === 'aunt' ? Math.sign(gx) * Math.min(1, Math.abs(gx) * 3) : gx) * reachX * (1 - cross) - side * cross * reachX
    const py = eye.y + gy * reachY * (1 - pose.roll) - pose.roll * face.eyeRy * 0.8
    // The goat's pupils are level bars.
    g.moveTo(px + face.pupil, py)
    g.ellipse(px, py, face.pupil, who === 'goat' ? face.pupil * 0.5 : face.pupil, 0, 0, TAU)
  })
  fill('#1c110a')
  const shut = look.blink ? 1 : clamp(Math.max(pose.shut, face.rest * (1 - pose.wide) - (who === 'goat' ? look.perk * 0.36 : 0)), 0, 1)
  if (shut > 0.04) {
    const k = Math.asin(clamp(1 - 2 * shut, -1, 1))
    g.beginPath()
    for (const eye of rig.eyes) {
      g.moveTo(eye.x + Math.cos(Math.PI + k) * face.eyeRx * wide, eye.y + Math.sin(Math.PI + k) * face.eyeRy * wide)
      g.ellipse(eye.x, eye.y, face.eyeRx * wide + 0.6, face.eyeRy * wide + 0.6, 0, Math.PI + k, TAU - k)
      g.closePath()
    }
    fill(face.lid)
  }
  if (who !== 'goat' && pose.mouth > 0.05) { g.beginPath(); g.ellipse(rig.mouth.x, rig.mouth.y, face.mouthRx, 2 + pose.mouth * 9, 0, 0, TAU); fill('#4a1a18') }
  if (who === 'goat' && look.lick > 0.12 && look.lick < 0.56) {
    // Its tongue goes round its lips after a sniff.
    const lu = (0.56 - look.lick) / 0.44
    g.beginPath(); g.ellipse(-15 + 30 * lu, 96 - Math.sin(lu * Math.PI) * 4, 7.5, 4.6, 0, 0, TAU); fill('#e0787a')
  }
  if (pose.purple > 0.02) { g.beginPath(); g.ellipse(0, (rig.eyes[0].y + rig.mouth.y) / 2, face.faceR, face.faceR * 1.15, 0, 0, TAU); fill(`rgba(140,70,190,${(0.5 * pose.purple).toFixed(3)})`) }
  if (look.yellow) { g.beginPath(); g.ellipse(rig.nose.x, rig.nose.y, face.noseR, face.noseR * 0.8, 0, 0, TAU); fill('#ffd23a') }
  if (pose.tears > 0.02) {
    g.beginPath()
    for (const eye of rig.eyes) { const r = 2 + pose.tears * face.eyeRx * 0.45; g.moveTo(eye.x + r, eye.y + face.eyeRy); g.ellipse(eye.x, eye.y + face.eyeRy + r * 0.6, r, r * 1.3, 0, 0, TAU) }
    fill('rgba(190,228,246,0.9)')
  }

  // The part that is its own: a hat that jumps, an eyebrow that leaves her face.
  if (who === 'beekeeper') {
    g.save()
    g.translate(0, -pose.special * 16)
    g.rotate(Math.sin(t * 0.7 - 0.9) * 0.03)
    stamp(g, figures.keeperHat)
    g.restore()
    calls++
  } else if (who === 'aunt') {
    const twitch = Math.max(0, Math.sin(t * 0.9) - 0.96) * 60
    const by = -25 - pose.special * 56 - twitch
    g.beginPath()
    g.moveTo(-24, by + 3)
    g.quadraticCurveTo(-4, by - 9 - pose.special * 6, 24, by - 1)
    g.lineWidth = 4.5; g.lineCap = 'round'; g.strokeStyle = '#55504a'; g.stroke(); calls++
  }

  // What a flower does to the nose that sniffs it, and what a piece let go on the visitor does to its head.
  if (act?.name === 'sniff') {
    if (act.plant === 'poppy' && during(0.2, 0.45)) { g.beginPath(); g.ellipse(rig.nose.x + 2, rig.nose.y - 2, 10, 7, 0.4, 0, TAU); fill('#e03c1f') }
    if (act.plant === 'thistle' && during(0.3, 0.95)) { flower(g, flora, density, 'thistle', rig.nose.x - 4, rig.nose.y, -1.3, 0.62); calls++ }
  }
  // The laugh begins with the thistle's prick: its head is on her nose until the sneeze blows it off.
  if (act?.name === 'laugh' && during(0.05, 0.4)) { flower(g, flora, density, 'thistle', rig.nose.x - 4, rig.nose.y, -1.3, 0.62); calls++ }
  if ((act?.name === 'sniff' && act.plant === 'ivy' && during(0.2, 0.73)) || (act?.name === 'unveil' && during(0.1, 0.9))) {
    // A tendril comes over from the bouquet and takes hold.
    const to = act.name === 'unveil' ? { x: -40, y: 60 - 90 * pose.special } : rig.ivy
    const grown = clamp((u - (act.name === 'unveil' ? 0.1 : 0.2)) / 0.2, 0, 1)
    g.beginPath()
    g.moveTo(-150, 150)
    for (let i = 1; i <= 12; i++) {
      const s = (i / 12) * grown
      g.lineTo(-150 + (to.x + 150) * s + Math.sin(s * 14) * 9, 150 + (to.y - 150) * s + Math.cos(s * 11) * 7)
    }
    g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#4f9440'; g.stroke(); calls++
  }
  if (act?.name === 'drop') {
    if (act.plant === 'sunflower' && during(0.02, 0.78)) { flower(g, flora, density, 'sunflower', rig.top.x, rig.top.y + 34, 0, 0.9); calls++ }
    if (act.plant === 'poppy' && during(0.06, 0.78)) {
      g.beginPath()
      for (const eye of rig.eyes) { g.moveTo(eye.x + face.eyeRx + 4, eye.y); g.ellipse(eye.x, eye.y - 1, face.eyeRx + 4, face.eyeRy + 2, 0.2, 0, TAU) }
      fill('#e03c1f')
    }
    if (act.plant === 'onion' && during(0, 0.2)) { flower(g, flora, density, 'onion', rig.mouth.x - 8, rig.mouth.y, -1.4, 0.7); calls++ }
    if (act.plant === 'dandelion' && during(0.02, 0.56)) { flower(g, flora, density, 'dandelion', rig.nose.x, rig.nose.y + 6, 0, 0.7); calls++ }
  }
  g.restore()
  return calls
}

/**
 * The aunt's bun this frame: where it sits on her head, how it is turned and how large. Loose, it hangs off the
 * back of her head. At a neat bunch (her `loves`) it winds a quarter turn and draws in tight with the squeak,
 * and stays so until her nod is over.
 */
export function bunOf(look: Look): { x: number; y: number; turn: number; wide: number; high: number } {
  if (look.loose) return { x: 16, y: -62 + Math.sin(look.time * 9) * 2, turn: 0.5, wide: 1.35, high: 1.2 }
  const u = look.act?.name === 'loves' ? look.act.u : 0
  const tight = clamp((u - 0.3) / 0.1, 0, 1) * (1 - clamp((u - 0.9) / 0.1, 0, 1))
  return { x: 0, y: -72 + 3 * tight, turn: 1.6 * tight, wide: 1 - 0.26 * tight, high: 1 - 0.26 * tight }
}

/** How each visitor's arms are drawn: where they leave the body, how thick, in what, and what they end in. */
export const ARMS: Record<VisitorId, { out: number; down: number; width: number; sleeve: string; hand: string; handR: number }> = {
  goat: { out: 62, down: 74, width: 26, sleeve: '#e3d4b6', hand: '#43311f', handR: 13 },
  beekeeper: { out: 104, down: 126, width: 34, sleeve: '#e2d9c2', hand: '#c9b98f', handR: 20 },
  bride: { out: 36, down: 70, width: 11, sleeve: '#f3cfae', hand: '#f3cfae', handR: 7 },
  aunt: { out: 31, down: 88, width: 10, sleeve: '#4b2b45', hand: '#ecd6c0', handR: 6.5 },
}

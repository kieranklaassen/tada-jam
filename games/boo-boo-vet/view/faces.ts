// The five faces of a well animal, drawn the same way on every head so the six
// read as one family: the same plum ink, the same eye, the same cheek. A face
// says how the animal takes a thing and never anything about the child.

import { ell, eye, fill, puff, within, type Pen } from './paint'
import { PAL } from './palette'

/**
 * The first five are how a well animal takes a thing. The last five go with a
 * need (signs.ts): worn out with thirst, miserable with cold, hurting at a
 * sore paw, bothered by an itch, afraid. A feeling is in the face and the
 * body and nowhere else: no tear, no drop, no mark over the head.
 */
export type Face = 'calm' | 'glad' | 'wow' | 'bliss' | 'wary' | 'worn' | 'miserable' | 'hurting' | 'bothered' | 'afraid'

/** Where a face sits on a head, in the drawing's units. */
export type FaceAt = {
  /** Half the distance between the eyes, their height, and their radius. */
  eyes: number
  eyeY: number
  r: number
  /** The middle of the mouth and half its width. */
  mouthY: number
  wide: number
  /** The colour round the eyes, for a lid. */
  fur: string
}

function stroke({ g }: Pen, width: number, color: string, path: () => void): void {
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  path()
  g.stroke()
}

/** A curved line from one side to the other of `(x, y)`, `half` to each side, bowed down by `sag` (up if negative). */
function bow(pen: Pen, x: number, y: number, half: number, sag: number, width: number, color: string = PAL.ink): void {
  stroke(pen, width, color, () => {
    pen.g.moveTo(x - half, y)
    pen.g.quadraticCurveTo(x, y + sag * 2, x + half, y)
  })
}

/** A wavering line across `(x, y)`, `half` to each side, in `humps` alternating bends `tall` high: a mouth that will not hold still. */
export function wave(pen: Pen, x: number, y: number, half: number, tall: number, humps: number, width: number, color: string = PAL.ink): void {
  const step = (half * 2) / humps
  stroke(pen, width, color, () => {
    pen.g.moveTo(x - half, y)
    for (let i = 0; i < humps; i++) {
      const from = x - half + i * step
      pen.g.quadraticCurveTo(from + step / 2, y + (i % 2 ? tall : -tall), from + step, y)
    }
  })
}

/** The eyes of a face. `shut` is the blink over any face; bliss is shut already, in its own happy arcs. */
export function eyes(pen: Pen, at: FaceAt, face: Face, shut: boolean): void {
  const { r } = at, y = at.eyeY
  pen.mute++
  for (const s of [-1, 1]) {
    const x = s * at.eyes
    if (face === 'bliss') {
      bow(pen, x, y + r * 0.35, r, -r * 0.6, r * 0.52)
    } else if (shut) {
      bow(pen, x, y - r * 0.1, r, r * 0.42, r * 0.5)
    } else if (face === 'wow') {
      fill(pen, ell(x, y, r * 1.34, r * 1.34), PAL.white)
      fill(pen, ell(x, y, r * 0.66, r * 0.7), PAL.ink)
      fill(pen, ell(x - r * 0.24, y - r * 0.26, r * 0.22, r * 0.22), PAL.white)
    } else if (face === 'wary') {
      const white = ell(x, y, r * 1.2, r * 0.98)
      fill(pen, white, PAL.white)
      within(pen, white, () => {
        fill(pen, ell(x + r * 0.52, y + r * 0.12, r * 0.62, r * 0.66), PAL.ink)
        // A lid drawn half down: the look of someone not sure of this.
        pen.g.fillStyle = at.fur
        pen.g.fillRect(x - r * 2, y - r * 2, r * 4, r * 1.55)
      })
      stroke(pen, r * 0.3, PAL.ink, () => { pen.g.moveTo(x - r * 1.16, y - r * 0.45); pen.g.lineTo(x + r * 1.16, y - r * 0.45) })
    } else if (face === 'afraid') {
      // Wide whites and small pupils: the whites carry it, also in the dark.
      fill(pen, ell(x, y, r * 1.5, r * 1.5), PAL.white)
      fill(pen, ell(x, y + r * 0.08, r * 0.42, r * 0.46), PAL.ink)
    } else if (face === 'bothered') {
      const white = ell(x, y, r * 1.2, r)
      fill(pen, white, PAL.white)
      within(pen, white, () => fill(pen, ell(x - r * 0.56, y + r * 0.2, r * 0.6, r * 0.64), PAL.ink))
    } else if (face === 'worn') {
      eye(pen, x, y, r, PAL.ink, at.fur, 0.56, 0)
      bow(pen, x, y + r * 1.3, r * 0.72, r * 0.16, r * 0.24, 'rgba(67, 48, 90, 0.38)')
    } else if (face === 'miserable') {
      eye(pen, x, y, r, PAL.ink, at.fur, 0.34, s * 0.42)
    } else if (face === 'hurting' && s < 0) {
      // The wince: one eye squeezed shut, a short thick lid curved down hard and tipped in towards the nose.
      stroke(pen, r * 0.58, PAL.ink, () => {
        pen.g.moveTo(x - r * 0.85, y - r * 0.3)
        pen.g.quadraticCurveTo(x + r * 0.05, y + r * 0.95, x + r * 0.8, y + r * 0.12)
      })
    } else if (face === 'hurting') {
      eye(pen, x, y, r, PAL.ink, at.fur, 0.3, s * 0.5)
    } else {
      fill(pen, ell(x, y, r * 0.86, r), PAL.ink)
      fill(pen, ell(x - r * 0.3, y - r * 0.34, r * 0.3, r * 0.3), PAL.white)
    }
    // Brows: up and round in surprise; one pressed down and one lifted in doubt.
    if (face === 'wow') bow(pen, x, y - r * 2.05, r * 0.9, -r * 0.4, r * 0.4)
    if (face === 'wary' && s < 0) stroke(pen, r * 0.46, PAL.ink, () => { pen.g.moveTo(x - r * 1.2, y - r * 1.65); pen.g.lineTo(x + r * 1.1, y - r * 1.15) })
    if (face === 'wary' && s > 0) bow(pen, x, y - r * 2.0, r, -r * 0.45, r * 0.42)
    // Sloped sadly; pinched up in the middle; pressed down unevenly; high and worried.
    const brow = (inX: number, inY: number, outX: number, outY: number, width: number) =>
      stroke(pen, r * width, PAL.ink, () => { pen.g.moveTo(x - s * r * inX, y - r * inY); pen.g.lineTo(x + s * r * outX, y - r * outY) })
    if (face === 'miserable') brow(1.2, 2.08, 0.92, 1.46, 0.42)
    if (face === 'hurting') brow(1.05, 2.4, 1.0, 1.35, 0.44)
    // Bothered, not cross: one brow pressed low and nearly level, the other drawn up steeply at the nose.
    if (face === 'bothered' && s < 0) brow(1.15, 1.22, 1.15, 1.5, 0.46)
    if (face === 'bothered' && s > 0) brow(0.9, 2.15, 1.2, 1.35, 0.44)
    if (face === 'afraid') brow(0.95, 2.85, 0.95, 2.4, 0.36)
  }
  pen.mute--
}

/** The mouth of a face, centred on `x`. An animal with a muzzle or a bill of its own may draw its own instead. */
export function mouth(pen: Pen, at: FaceAt, face: Face, x = 0): void {
  const { g } = pen, w = at.wide, y = at.mouthY, pen2 = Math.max(2.6, w * 0.24)
  pen.mute++
  if (face === 'calm') bow(pen, x, y, w * 0.62, w * 0.24, pen2)
  if (face === 'bliss') bow(pen, x, y - w * 0.1, w * 1.05, w * 0.5, pen2 * 1.1)
  if (face === 'wary') stroke(pen, pen2, PAL.ink, () => { g.moveTo(x - w * 0.1, y + w * 0.34); g.lineTo(x + w * 0.85, y + w * 0.08) })
  if (face === 'wow') fill(pen, ell(x, y + w * 0.34, w * 0.36, w * 0.44), PAL.mouth)
  // Slack and a little open; a small frown; a wide lopsided grimace; a short lopsided curve; a tiny round mouth.
  if (face === 'worn') fill(pen, ell(x, y + w * 0.34, w * 0.44, w * 0.3), PAL.mouth)
  if (face === 'miserable') bow(pen, x, y + w * 0.4, w * 0.55, -w * 0.2, pen2)
  if (face === 'afraid') fill(pen, ell(x, y + w * 0.36, w * 0.2, w * 0.18), PAL.mouth)
  // A wince pulls the mouth wide and down at one corner; a bothered mouth is pulled down at one side, shorter.
  if (face === 'hurting') stroke(pen, pen2, PAL.ink, () => { g.moveTo(x - w * 0.8, y + w * 0.56); g.quadraticCurveTo(x - w * 0.15, y + w * 0.02, x + w * 0.8, y + w * 0.34) })
  if (face === 'bothered') stroke(pen, pen2, PAL.ink, () => { g.moveTo(x - w * 0.5, y + w * 0.24); g.quadraticCurveTo(x + w * 0.1, y + w * 0.18, x + w * 0.5, y + w * 0.5) })
  if (face === 'glad') {
    const open = new Path2D()
    open.moveTo(x - w, y)
    open.quadraticCurveTo(x, y - w * 0.16, x + w, y)
    open.bezierCurveTo(x + w * 0.96, y + w * 1.3, x - w * 0.96, y + w * 1.3, x - w, y)
    open.closePath()
    fill(pen, open, PAL.mouth)
    within(pen, open, () => fill(pen, ell(x, y + w * 0.98, w * 0.62, w * 0.44), PAL.tongue))
  }
  pen.mute--
}

/** A cheek: pinker when the animal is pleased. */
export function cheeks(pen: Pen, x: number, y: number, r: number, face: Face): void {
  const alpha = face === 'glad' || face === 'bliss' ? 0.9 : face === 'afraid' || face === 'worn' ? 0.36 : 0.62
  pen.mute++
  for (const s of [-1, 1]) fill(pen, ell(s * x, y, r, r * 0.66), `rgba(255, 143, 163, ${alpha})`)
  pen.mute--
}

/** A tongue hanging out below a mouth: the dog's, in its glad and blissful faces. */
export function tongueOut(pen: Pen, x: number, y: number, w: number, length: number): void {
  pen.mute++
  const path = new Path2D()
  path.roundRect(x - w / 2, y, w, length, w / 2)
  puff(pen, path, PAL.tongue, 0.6)
  stroke(pen, Math.max(2, w * 0.12), PAL.dog.tongueLine, () => { pen.g.moveTo(x, y + w * 0.4); pen.g.lineTo(x, y + length - w * 0.55) })
  pen.mute--
}

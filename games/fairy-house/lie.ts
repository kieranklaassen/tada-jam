import type { Form } from './cells'
import type { Kind } from './kinds'

// How a found thing lies on the stage, with no canvas in it: which picture
// of it is used and the one transform that puts the picture in its place.
// The view stamps a thing through this, the toy takes a touch by it, and the
// overlap tests measure it, so a thing is drawn, touched and tested in one
// place.

export type Box = { x: number; y: number; w: number; h: number }

/** A thing as it is shown: its middle along the stage, its underside, its turn, and how it is pressed. */
export type Lying = {
  kind: Kind
  form: Form | 'loose'
  x: number
  y: number
  /** Its turn, in radians. */
  angle: number
  side: -1 | 1
  /** The swing of a thing that hangs from its top, in radians. */
  swing: number
  /** Its width and height, each as a share of its own. */
  sx: number
  sy: number
  /** A twig the fat one has snapped: half as long. */
  snapped: boolean
}

/** A transform as a canvas takes it: x' = a x + c y + e, y' = b x + d y + f. */
export type Matrix = readonly [number, number, number, number, number, number]

export type ThingSprite = 'leafLoose' | 'leafFlat' | 'leafSag' | 'leafTent' | 'leafDrape' | 'capUp' | 'capDown' | 'pebble' | 'bark' | 'twig' | 'stump' | 'moss' | 'mossSag' | 'feather'

/** The room the pencil of each picture takes round its own origin, which is the middle of its underside. */
export const INK: Record<ThingSprite, Box> = {
  leafLoose: { x: -72, y: -20, w: 140, h: 20 },
  leafFlat: { x: -72, y: -14, w: 140, h: 14 },
  leafSag: { x: -72, y: -22, w: 140, h: 24 },
  leafTent: { x: -72, y: -34, w: 140, h: 32 },
  leafDrape: { x: -70, y: -19, w: 140, h: 19 },
  capUp: { x: -26, y: -34, w: 52, h: 36 },
  capDown: { x: -26, y: -33, w: 52, h: 33 },
  pebble: { x: -33, y: -44, w: 66, h: 44 },
  bark: { x: -78, y: -24, w: 156, h: 25 },
  twig: { x: -7, y: -116, w: 14, h: 116 },
  stump: { x: -7, y: -58, w: 14, h: 58 },
  moss: { x: -52, y: -44, w: 104, h: 44 },
  mossSag: { x: -54, y: -32, w: 108, h: 46 },
  feather: { x: -56, y: -19, w: 112, h: 20 },
}

/** How far the middle of a slide lies from the middle of its stone. */
export const SLIDE_SHIFT = 40
/** How far the middle of a see-saw lies from the top of its stone, along the slab, toward the end that comes down. */
export const SEESAW_SHIFT = 30
/** A thing let go within this of the stone under a see-saw lies level over the stone. */
export const SEESAW_MIDDLE = 22
/** How far along the slab from the stone a thing lies on the low end of a see-saw. */
export const SEESAW_LOW = 44
/** How far past the high end of a see-saw a thing that stays up on it may reach: its high end is the short one. */
export const SEESAW_PAST = 6
/** The widest thing that sits on one end of a see-saw. A wider one lies along the slab, on the middle of it. */
export const SEESAW_SITS = 70
/** How long a feather is, from its quill to its tip: a flag hangs by this much. */
export const FLAG_LENGTH = 112
/** How steeply a flag hangs from the tip it is tied to, in radians from level. */
export const FLAG_HANG = 1.26
/** How much of its length a hanging flag shows where there is `room` under the tip: all of it over free room, and less where it hangs down onto something, bunched up on it. */
export function flagPress(room: number): number {
  // Its end is as thick as the feather is wide, so it is held that much short of what is under it.
  return Math.min(1, Math.max(0.34, (room - 8) / (FLAG_LENGTH * Math.sin(FLAG_HANG))))
}
/** How high a stone stands over the ground it is sunk in: a slide starts there. */
const STONE_TOP = 34

/** How a moss cushion is pressed in each of its forms: its width and height as shares of its own. */
const MOSS: Partial<Record<Form | 'loose', readonly [number, number]>> = { heaped: [1.04, 0.91], draped: [0.87, 0.78], pressed: [1.1, 0.77], slung: [1.04, 1] }

const move = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y]
const turn = (a: number): Matrix => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]
const size = (sx: number, sy: number): Matrix => [sx, 0, 0, sy, 0, 0]

/** The transforms in the order a canvas would be given them. */
export function chain(...steps: Matrix[]): Matrix {
  let m: Matrix = [1, 0, 0, 1, 0, 0]
  for (const n of steps) {
    m = [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]
  }
  return m
}

/** Which picture a thing is drawn with as it lies, and the transform that puts it there. */
export function placement(t: Lying): { sprite: ThingSprite; m: Matrix } {
  const pressed = size(t.sx, t.sy)
  switch (t.kind) {
    case 'leaf': {
      // A slide leans from the top of its stone down to the ground on the side it lies to.
      if (t.form === 'ramp') return { sprite: 'leafFlat', m: chain(move(t.x - t.side * SLIDE_SHIFT, t.y - STONE_TOP), turn(t.angle), move(t.side * SLIDE_SHIFT, 0), pressed) }
      const sprite = t.form === 'sag' ? 'leafSag' : t.form === 'tent' ? 'leafTent' : t.form === 'drape' ? 'leafDrape' : t.form === 'loose' ? 'leafLoose' : 'leafFlat'
      // A tablecloth hangs over the edge of what it lies on.
      return { sprite, m: chain(move(t.x, t.y), turn(t.angle), move(0, t.form === 'drape' ? 8 : 0), pressed) }
    }
    case 'cap':
      // A bell hangs over the twig's tip and swings from its own top.
      if (t.form === 'hung') return { sprite: 'capDown', m: chain(move(t.x, t.y - 12), turn(t.swing), move(0, 29), pressed) }
      return { sprite: t.form === 'down' ? 'capDown' : 'capUp', m: chain(move(t.x, t.y), turn(t.angle), pressed) }
    case 'pebble':
    case 'bark':
      return { sprite: t.kind, m: chain(move(t.x, t.y), turn(t.angle), pressed) }
    case 'moss': {
      const press = MOSS[t.form] ?? [1, 1]
      // Slung between two tops it has a picture of its own: high over each top and sagging between them.
      return { sprite: t.form === 'slung' ? 'mossSag' : 'moss', m: chain(move(t.x, t.y), turn(t.angle), size(t.sx * press[0], t.sy * press[1])) }
    }
    case 'twig': {
      const sprite = t.snapped ? 'stump' : 'twig'
      const half = t.snapped ? 29 : 58
      if (t.form === 'upright') return { sprite, m: chain(move(t.x, t.y), turn(t.angle), pressed) }
      // Lying, or in the hand: it turns about its own middle, with its underside where the thing is.
      const by = t.form === 'loose' ? t.angle : Math.PI / 2 + t.angle
      return { sprite, m: chain(move(t.x, t.y - half * Math.abs(Math.cos(by)) - 7 * Math.abs(Math.sin(by))), turn(by), pressed, move(0, half)) }
    }
    case 'feather':
      // Standing on its quill.
      if (t.form === 'quill' || t.form === 'sail') return { sprite: 'feather', m: chain(move(t.x, t.y), turn(-Math.PI / 2 + t.angle), pressed, move(56, 2)) }
      // Tied by its quill to the twig's tip, on the side it was set on: `swing` is how steeply it hangs from there.
      if (t.form === 'flag') return { sprite: 'feather', m: chain(move(t.x, t.y - 4), size(t.side, 1), turn(t.swing), pressed, move(56, 2)) }
      return { sprite: 'feather', m: chain(move(t.x, t.y), turn(t.angle), pressed) }
  }
}

/** The room a thing's pencil takes on the stage as it lies. */
export function drawnBox(t: Lying): Box {
  const { sprite, m } = placement(t)
  const ink = INK[sprite]
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [px, py] of [[ink.x, ink.y], [ink.x + ink.w, ink.y], [ink.x, ink.y + ink.h], [ink.x + ink.w, ink.y + ink.h]]) {
    const x = m[0] * px + m[2] * py + m[4], y = m[1] * px + m[3] * py + m[5]
    x0 = Math.min(x0, x); x1 = Math.max(x1, x)
    y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * The smallest room a finger is given on a thing: narrower or lower things are touched in a box this big about
 * their middle. 74 stage units are 48 px on the smallest tablet surface, 768 by 1024, where a unit is 0.65 px.
 * The box is the whole of what a finger is given: there is no grace round it.
 */
export const FINGER = { w: 74, h: 74 } as const

/** Where a finger takes a thing: where it is drawn, and never less than a finger's room. */
export function touchBox(t: Lying): Box {
  const drawn = drawnBox(t)
  const w = Math.max(FINGER.w, drawn.w), h = Math.max(FINGER.h, drawn.h)
  return { x: drawn.x + drawn.w / 2 - w / 2, y: drawn.y + drawn.h / 2 - h / 2, w, h }
}

// The six animals as they sit when they need nothing: upright, facing front,
// well. Each is one sticker with ten faces, and its ears up or hanging. Motion is the whole sticker's;
// a face or a blink is a second drawing, baked as its own sprite.

import type { Species } from '../cast'
import type { Face } from './faces'
import { bear, dog, rabbit } from './figures-a'
import { cat, duck, hedgehog } from './figures-b'
import type { Spot } from './layout'
import type { Pen } from './paint'
import type { Bounds } from './sticker'

export type { Face } from './faces'

export type Figure = {
  bounds: Bounds
  /** `hang` is how many of its ears hang, 0 to 2: with one, the ear on the right of the screen still hangs. The duck has no ears to see: its wings hang. */
  paint: (pen: Pen, face: Face, shut: boolean, hang?: number) => void
  /**
   * Places on the drawing, in its own units (origin = where it sits: bottom centre, y up is negative): the top of
   * the skull, the mouth, in front of the belly at seat height, behind the shoulder on the animal's left (screen
   * right), and where a held-up paw joins the body at its right side (screen left), about a third of the way up.
   */
  anchors: { head: Spot; mouth: Spot; lap: Spot; back: Spot; side: Spot }
}

export const FACES: readonly Face[] = ['calm', 'glad', 'wow', 'bliss', 'wary', 'worn', 'miserable', 'hurting', 'bothered', 'afraid']

export const FIGURES: Readonly<Record<Species, Figure>> = { bear, rabbit, cat, dog, hedgehog, duck }

import { paintBadger } from './lookBadger'
import { paintGoat } from './lookGoat'
import { Press, type Sprite } from './lookInk'
import { SPOTS, layout, type Box, type Layout, type Spot } from './lookLayout'
import { paintDough, paintFire, paintJug, paintLoaf, paintPeel, paintSack, paintSparrow } from './lookProps'
import { paintRoom } from './lookRoom'

// The look of Bread Day: a linocut. One sheet of cream paper, three flat inks
// and a dark key block that is carved, not drawn. Everything is printed once
// per size into cached sprites (lookInk.ts); a frame only lays those sprites
// down: the room first, which is the one full-surface composite, and then a
// dozen pieces placed by the layout.

/** The fire's three stills, in the order it flickers through them, eight a second. Time 0 shows the first. */
const FLICKER = [0, 1, 2, 1, 0, 2, 1, 0, 2, 0, 1, 2, 2, 1]

export type Look = {
  /**
   * Sizes the look for a surface. The pieces are reprinted when the surface changes size or the pixel ratio rises
   * above what they were printed at; a lower ratio (a cheaper quality tier) only scales the same prints down, so a
   * tier change costs no printing. Does nothing when neither changed.
   */
  resize(width: number, height: number, dpr: number): void
  /** Lays one frame at `seconds` of attended time and returns how many sprites it drew. Time 0 is the canonical still. */
  draw(g: CanvasRenderingContext2D, seconds: number): number
  /** Where each piece is, in logical pixels, once the look has a size. */
  readonly layout: Layout | null
}

type Pieces = {
  room: Sprite; peel: Sprite; dough: Sprite; sack: Sprite; jug: Sprite; loaf: Sprite; goat: Sprite
  badger: Sprite[]; fire: Sprite[]; sparrows: Sprite[]
}

export function createLook(): Look {
  /** `ratio` is the surface's pixel ratio now; `printed` is the ratio the pieces were printed at. */
  let width = 0, height = 0, ratio = 0, printed = 0
  let plan: Layout | null = null, pieces: Pieces | null = null

  const print = (): Pieces => {
    const at = plan!, press = new Press(at.scale * printed, printed, Math.ceil(width * printed) + 2, Math.ceil(height * printed) + 2)
    const piece = (spot: Spot, seed: number, paint: Parameters<Press['print']>[3]) => press.print(SPOTS[spot][2], SPOTS[spot][3], seed, paint)
    const made = {
      room: press.print(width / at.scale, height / at.scale, 1, (p) => paintRoom(p, at.view), -at.ox / at.scale, -at.oy / at.scale, true),
      peel: piece('peel', 2, paintPeel),
      dough: piece('dough', 3, paintDough),
      sack: piece('sack', 4, paintSack),
      jug: piece('jug', 5, paintJug),
      loaf: piece('loaf', 6, paintLoaf),
      goat: piece('goat', 7, paintGoat),
      // The same seed for both, so only the eyes differ between them.
      badger: [false, true].map((blink) => piece('badger', 8, (p) => paintBadger(p, blink))),
      fire: [0, 1, 2].map((frame) => piece('fire', 9 + frame, (p) => paintFire(p, frame))),
      sparrows: [false, true, false].map((peck, i) => piece('sparrow', 12 + i, (p) => paintSparrow(p, peck))),
    }
    press.done()
    return made
  }

  return {
    get layout() { return plan },

    resize(w, h, dpr) {
      if (w <= 0 || h <= 0 || dpr <= 0 || (w === width && h === height && dpr === ratio)) return
      const reprint = w !== width || h !== height || dpr > printed
      width = w; height = h; ratio = dpr
      if (!reprint) return
      printed = dpr
      plan = layout(w, h)
      pieces = print()
    },

    draw(g, seconds) {
      if (!plan || !pieces) return 0
      const at = plan, made = pieces, snap = (v: number) => Math.round(v * ratio) / ratio
      let count = 0
      const put = (sprite: Sprite, box: Box) => { g.drawImage(sprite.canvas, snap(box.x), snap(box.y), sprite.w, sprite.h); count++ }
      g.setTransform(ratio, 0, 0, ratio, 0, 0)
      g.globalCompositeOperation = 'source-over'
      g.drawImage(made.room.canvas, 0, 0, made.room.w, made.room.h); count++
      // The sparrows are out in the lane, so the goat at the hatch stands in front of them.
      made.sparrows.forEach((sparrow, i) => put(sparrow, at.sparrows[i]))
      put(made.goat, at.boxes.goat)
      put(made.loaf, at.rack[0])
      put(made.fire[FLICKER[Math.floor(seconds * 8) % FLICKER.length]], at.boxes.fire)
      // A blink now and then, and never at time 0.
      const blink = seconds % 4.3 > 4.16 || (seconds % 11.7 > 7.9 && seconds % 11.7 < 8.02)
      put(made.badger[blink ? 1 : 0], at.boxes.badger)
      put(made.sack, at.boxes.sack)
      put(made.jug, at.boxes.jug)
      put(made.peel, at.boxes.peel)
      // The dough breathes: a hundredth taller and a little narrower, about its foot, so it keeps its amount.
      const breath = Math.sin(seconds * 1.6), box = at.boxes.dough, w = made.dough.w * (1 - 0.004 * breath), h = made.dough.h * (1 + 0.01 * breath)
      g.drawImage(made.dough.canvas, snap(box.x) + (made.dough.w - w) / 2, snap(box.y) + made.dough.h - h, w, h); count++
      return count
    },
  }
}

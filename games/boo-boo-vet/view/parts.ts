// The parts of a sign that are laid on or beside an animal (signs.ts): a paw
// held up, the arms hugged round itself, the tongue, a burr, a puff of breath,
// the dark under the table and the eyes in it. And three things of the room:
// the carrier, the den, the foam. A need is in the body; nothing here is an
// icon, and nothing here is frightening.

import type { Species } from '../cast'
import { blob, box, ell, fill, line, poly, puff, tube, within, type Pen } from './paint'
import { PAL } from './palette'
import { carrier } from './parts-room'
import type { Bounds, Paint } from './sticker'

export { CARRIER } from './parts-room'

type Part = { paint: Paint; bounds: Bounds }
/**
 * A part baked bare: no white border and no shadow (the sixth argument of
 * `Sheet.get`). The dark and the eyes in it are bare because they are not
 * vinyl. The arms, the tongue, a burr and the beard are bare because they lie
 * on the animal's own sticker and belong to it: with a border of their own
 * they read as something stuck on. A paw held up beside the body, the puff,
 * the foam, the den and the carrier are stickers and keep their border.
 */
type Bare = Part & { bare: true }

/** Each animal's limb: its colours, and how large its paw and its hug are drawn against the rabbit's (which is 1). */
const LIMB: Readonly<Record<Species, { limb: string; paw: string; pad: string; size: number; hug: number }>> = {
  bear: { limb: '#c4854d', paw: '#d0935a', pad: PAL.bear.pad, size: 1.15, hug: 1.34 },
  rabbit: { limb: PAL.rabbit.arm, paw: PAL.rabbit.paw, pad: PAL.rabbit.inner, size: 0.8, hug: 0.78 },
  cat: { limb: '#8d9dc8', paw: PAL.cat.belly, pad: PAL.cat.inner, size: 0.85, hug: 0.76 },
  dog: { limb: '#ffa94f', paw: PAL.dog.paw, pad: '#e9a07a', size: 1, hug: 1.06 },
  hedgehog: { limb: '#f6c890', paw: PAL.hedgehog.face, pad: '#f0a988', size: 0.6, hug: 0.58 },
  duck: { limb: PAL.duck.wing, paw: PAL.duck.bill, pad: '#e06f24', size: 0.85, hug: 0.72 },
}

/** One paw on its forearm, standing up from the wrist at the origin. The duck's is its webbed foot on its leg. */
function paw(species: Species): Part {
  const c = LIMB[species], s = c.size
  const paint = (pen: Pen) => {
    pen.g.scale(s, s)
    if (species === 'duck') {
      puff(pen, box(-7, -30, 14, 30, 6), c.paw, 0.5)
      puff(pen, blob([-10, -26, -27, -46, -19, -60, -9, -50, 0, -64, 9, -50, 19, -60, 27, -46, 10, -26], 0.8), c.paw, 0.8)
      pen.mute++
      line(pen, [-6, -34, -13, -50], c.pad, 2.6, false)
      line(pen, [6, -34, 13, -50], c.pad, 2.6, false)
      pen.mute--
      return
    }
    puff(pen, box(-14, -40, 28, 40, 13), c.limb, 0.7)
    puff(pen, ell(0, -44, 26, 21), c.paw, 0.8)
    // The pads: one big, three small, as on the underside of a paw held up to be seen.
    pen.mute++
    fill(pen, ell(0, -39, 10, 7.5), c.pad)
    for (const x of [-13, 0, 13]) fill(pen, ell(x, -53 + Math.abs(x) * 0.22, 4.6, 4.6), c.pad)
    pen.mute--
  }
  return { paint, bounds: { x0: -28 * s, y0: -66 * s, x1: 28 * s, y1: 0 } }
}

/**
 * The hug of the one that is cold: both forearms wrapped round its own middle,
 * one lying over the other along the same sagging line, each paw holding the
 * far side. The two never cross: together they are one band round the body
 * with a paw at each end. Origin: the middle of the band.
 */
function arms(species: Species): Bare {
  const c = LIMB[species], s = c.hug
  const paint = (pen: Pen) => {
    pen.g.scale(s, s)
    // The arm behind comes from the right and reaches the left side; the arm in front comes from the left, a little
    // lower, and its paw closes over the right side.
    puff(pen, tube([58, -14, 40, 2, 4, 9, -34, 4], 26, 22), c.limb, 0.7)
    puff(pen, ell(-45, 0, 16, 14), c.paw, 0.6)
    puff(pen, tube([-58, -10, -40, 8, -4, 16, 34, 11], 28, 24), c.limb, 0.8)
    puff(pen, ell(46, 6, 17, 15), c.paw, 0.6)
  }
  return { paint, bounds: { x0: -74 * s, y0: -30 * s, x1: 74 * s, y1: 32 * s }, bare: true }
}

/** How long each tongue hangs from its root. */
export const TONGUE: Readonly<Record<1 | 2, number>> = { 1: 40, 2: 72 }

/** A tongue hanging from its root at the origin: a little, or down to the table. */
function tongue(length: 1 | 2): Bare {
  const long = TONGUE[length]
  const paint = (pen: Pen) => {
    puff(pen, box(-11, 0, 22, long, 11), PAL.tongue, 0.7)
    pen.mute++
    line(pen, [0, 7, 0, long - 13], PAL.dog.tongueLine, 3, false)
    pen.mute--
  }
  return { paint, bounds: { x0: -11, y0: 0, x1: 11, y1: long }, bare: true }
}

/** A burr: a seed head of hooked points, each a different length, so it is a prickly lump and never a regular star. Green, so it shows on every fur. */
const burr: Bare = {
  paint(pen: Pen) {
    const points: number[] = [], long = [13, 9.5, 12, 10.5, 12.8, 9, 11.5, 12.4]
    for (let i = 0; i < 16; i++) {
      const a = ((i + (i % 2 ? 0.18 : 0)) / 16) * Math.PI * 2, r = i % 2 ? long[(i - 1) / 2] : 6.6
      points.push(Math.sin(a) * r, -Math.cos(a) * r)
    }
    puff(pen, poly(points), '#6fb536', 0.6)
  },
  bounds: { x0: -13, y0: -13, x1: 13, y1: 13 },
  bare: true,
}

/** A puff of breath in the cold: a small soft cloud, drifting off to the right of its origin. */
const breath: Part = {
  paint(pen: Pen) {
    const cloud = '#e3f3fd'
    puff(pen, ell(12, 3, 12, 10), cloud, 0.5)
    puff(pen, ell(34, 2, 12, 11), cloud, 0.5)
    puff(pen, ell(23, -3, 14, 12), cloud, 0.6)
  },
  bounds: { x0: 0, y0: -15, x1: 46, y1: 15 },
}

/** The space under the table's top, between its legs and down to the floor (room.ts: the legs stand 105 from the middle, the edge of the top is 50 deep). */
export const SHADE = { half: 104, deep: 124 } as const

/** The dark under the table: deepest up under the top, thinning to the floor, soft at every edge. Light, not vinyl: baked bare. */
const shade: Bare = {
  paint({ g, k }: Pen) {
    const far = 4000, soft = (inset: number, top: number, bottom: number, blur: number, color: string) => {
      g.save()
      g.shadowColor = color
      g.shadowBlur = blur * k
      g.shadowOffsetX = far * k
      // Only the shadow lands on the sprite: the shape that casts it is far off to the left.
      g.fillStyle = '#000'
      g.beginPath()
      g.roundRect(-SHADE.half + inset - far, top, (SHADE.half - inset) * 2, bottom - top, 18)
      g.fill()
      g.restore()
    }
    soft(8, -6, SHADE.deep - 8, 9, 'rgba(58, 44, 122, 0.62)')
    soft(20, -6, SHADE.deep - 46, 14, 'rgba(40, 28, 96, 0.6)')
  },
  bounds: { x0: -SHADE.half, y0: 0, x1: SHADE.half, y1: SHADE.deep },
  bare: true,
}

/** Two eyes alone, for the dark under the table and the carrier's window: bright whites, ink pupils. Shut, two pale lids. */
function eyes(shut: boolean): Bare {
  const paint = (pen: Pen) => {
    const { g } = pen
    for (const s of [-1, 1]) {
      if (shut) {
        g.strokeStyle = '#efeaff'
        g.lineWidth = 4.5
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(s * 19 - 11, 0)
        g.quadraticCurveTo(s * 19, 9, s * 19 + 11, 0)
        g.stroke()
        continue
      }
      fill(pen, ell(s * 19, 0, 12.5, 12.5), PAL.white)
      fill(pen, ell(s * 19, 1, 5, 5.6), PAL.ink)
    }
  }
  return { paint, bounds: { x0: -32, y0: -13, x1: 32, y1: 13 }, bare: true }
}

/** One eye alone in the dark, watching something to its left: a bright white with the pupil turned that way. */
const eye: Bare = {
  paint(pen: Pen) {
    fill(pen, ell(0, 0, 13.5, 13.5), PAL.white)
    fill(pen, ell(-5.5, 1.5, 5.2, 5.8), PAL.ink)
  },
  bounds: { x0: -14, y0: -14, x1: 14, y1: 14 },
  bare: true,
}

/** The colour of each animal's coat, and the middle and half-size of the round of it that fur on end stands out from. */
const COAT: Readonly<Record<Species, { color: string; cy: number; rx: number; ry: number }>> = {
  bear: { color: PAL.bear.fur, cy: -122, rx: 124, ry: 124 },
  rabbit: { color: PAL.rabbit.fur, cy: -84, rx: 66, ry: 86 },
  cat: { color: PAL.cat.fur, cy: -98, rx: 72, ry: 100 },
  dog: { color: PAL.dog.fur, cy: -108, rx: 96, ry: 110 },
  hedgehog: { color: PAL.hedgehog.spines, cy: -68, rx: 78, ry: 74 },
  duck: { color: PAL.duck.body, cy: -86, rx: 70, ry: 84 },
}
/** How far the tufts stand out past the coat. */
const TUFT = 34

/**
 * Fur on end: a ring of soft uneven tufts in the animal's own coat, standing
 * out all round it. It lies behind the animal's sticker, so only the tufts
 * past its edge show. Origin: where the animal sits.
 */
function fur(species: Species): Part {
  const c = COAT[species], count = 19
  const paint = (pen: Pen) => {
    const points: number[] = []
    for (let i = 0; i < count * 3; i++) {
      // Broad tufts of three lengths in turn, each with a wide foot and a soft tip, so the ring is ragged, shows the
      // coat's own colour, and is never a regular star.
      const angle = ((i + (i % 3 === 1 ? 0.25 : 0)) / (count * 3)) * Math.PI * 2, tuft = Math.floor(i / 3) % 3
      const out = i % 3 === 1 ? TUFT * [1, 0.6, 0.8][tuft] : 2
      points.push(Math.sin(angle) * (c.rx + out), c.cy - Math.cos(angle) * (c.ry + out))
    }
    puff(pen, blob(points, 0.55), c.color, 0.6)
  }
  return { paint, bounds: { x0: -c.rx - TUFT, y0: c.cy - c.ry - TUFT, x1: c.rx + TUFT, y1: c.cy + c.ry + TUFT } }
}

/** The den: the blanket draped over the basket, with a dark way in and its flap turned back. Origin: its centre. */
const den: Part = {
  paint(pen: Pen) {
    const b = PAL.blanket, w = PAL.basket
    // The basket shows below the cloth: its wicker front.
    const front = blob([-80, 22, -74, 60, -44, 74, 44, 74, 74, 60, 80, 22], 0.8)
    puff(pen, front, w.wicker)
    within(pen, front, () => {
      line(pen, [-80, 40, -40, 50, 0, 53, 40, 50, 80, 40], w.weave, 3.5)
      line(pen, [-78, 56, -40, 65, 0, 68, 40, 65, 78, 56], w.weave, 3.5)
    })
    // The blanket over it: a round roof with a hem that hangs in folds over the rim.
    const cloth = blob([-85, 36, -82, -12, -56, -58, 0, -75, 56, -58, 82, -12, 85, 36, 58, 28, 30, 38, 0, 28, -30, 38, -58, 28], 0.85)
    puff(pen, cloth, b.cloth, 1.1)
    within(pen, cloth, () => {
      line(pen, [-88, 16, -58, 10, -30, 20, 0, 10, 30, 20, 58, 10, 88, 16], b.trim, 9)
      line(pen, [-30, -62, -52, -30, -60, 2], b.fold, 4)
      line(pen, [34, -60, 56, -28, 64, 2], b.fold, 4)
      // The way in, dark and warm, and the flap of cloth turned back beside it.
      fill(pen, blob([-26, 40, -26, -4, -14, -26, 14, -26, 26, -4, 26, 40], 0.8), '#5a3a6e')
      puff(pen, blob([26, 40, 24, -6, 12, -27, 44, -14, 50, 34], 0.6), '#ffe389', 0.7)
      line(pen, [27, 22, 50, 18], b.trim, 7, false)
    })
  },
  bounds: { x0: -85, y0: -75, x1: 85, y1: 75 },
}

/** A heap of foam: soft bubbles `[x, y, radius]`, each with its glint. */
function suds(pen: Pen, bubbles: readonly (readonly [number, number, number])[]): void {
  const pale = '#edf8ff'
  for (const [x, y, r] of bubbles) puff(pen, ell(x, y, r, r * 0.92), pale, 0.55)
  pen.mute++
  for (const [x, y, r] of bubbles) fill(pen, ell(x - r * 0.3, y - r * 0.32, r * 0.22, r * 0.18), PAL.white)
  pen.mute--
}

/** The cap of foam that sits on the bowl's water. Origin: the middle of its foot. */
const foam: Part = {
  paint: (pen) => suds(pen, [[-34, -11, 13], [34, -11, 13], [-15, -13, 15], [15, -13, 15], [0, -24, 18], [-24, -24, 11], [24, -25, 11], [-4, -34, 9]]),
  bounds: { x0: -48, y0: -44, x1: 48, y1: 0 },
}

/** A foam beard, hanging from the chin. Origin: the middle of its top. */
const beard: Bare = {
  paint: (pen) => suds(pen, [[-21, 9, 11], [21, 9, 11], [0, 11, 13], [-12, 22, 12], [12, 22, 12], [0, 32, 11]]),
  bounds: { x0: -32, y0: 0, x1: 32, y1: 44 },
  bare: true,
}

export const PARTS: {
  paw: (species: Species) => Part
  arms: (species: Species) => Bare
  tongue: (length: 1 | 2) => Bare
  burr: Bare
  puff: Part
  shade: Bare
  eyes: (shut: boolean) => Bare
  eye: Bare
  fur: (species: Species) => Part
  carrier: (open: boolean) => Part
  den: Part
  foam: Part
  beard: Bare
} = { paw, arms, tongue, burr, puff: breath, shade, eyes, eye, fur, carrier, den, foam, beard }

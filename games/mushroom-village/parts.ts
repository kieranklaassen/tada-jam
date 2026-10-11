import { CHEEK, DARK, ORANGE, SKIN, STONE, TRUNK, WHITE, YELLOW, coloursOf, mushroomSprite, sprite, type MakeCanvas, type Sprite } from './art'
import { CART, type GnomeId, type Kind } from './ground'
import { band, blob, dab, pot, run, stroke, type Ctx, type Pot } from './paint'
import { makeRng, type Rng } from './rng'
import { STARS, ropeParts } from './marks'
import { chimneyOf, doorOf, shapeOf, windowOf } from './shapes'

// What the full game adds to the painted pieces: a mushroom with its door,
// its window and its chimney or rope ladder, the door cart, a door by itself,
// the face a gnome shows in his window, and the night. All of it is poster
// paint and is painted once; nothing here runs in a frame.

const WOOD = pot('#a0683a', '#c68e58', '#70421f')
const WOOD_2 = pot('#8a5530', '#b07a4c', '#5d3619')
const BRICK = pot('#c4573a', '#e08265', '#8f3420')
const CORK = pot('#d9a760', '#f0c98c', '#aa7a3a')
/** The rope under a bell house's door: its paint, how wide it is laid, and the darker paint of its knots. The view lets it down in the same paint. */
export const ROPE = '#d8b878'
export const ROPE_WIDE = 2.6
export const ROPE_KNOT = pot('#b8935a', '#d8b878', '#8f6d3c')
const PANE = pot('#3b3350', '#5a5072', '#231d33')

/** The paint of a lit window, by kind: orange in the red, pale blue in the bell, warm white in the puffball. */
const LIT: Record<Kind, Pot> = { red: pot('#ffab3d', '#ffd98a', '#e8791f'), bell: pot('#bfe6ff', '#effaff', '#86c2ee'), puff: pot('#fff0b8', '#fffbe6', '#f2cf74') }

/** The colour the night is: everything painted is multiplied by it. */
export const NIGHT = '#6a78c8'

function door(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, paint: Pot, rng: Rng): void {
  const w = x1 - x0, mid = (x0 + x1) / 2
  // A plank door with a round top, a little crooked, and a knob.
  blob(ctx, [{ x: x0, y: y1 }, { x: x0 - w * 0.03, y: y0 + w * 0.42 }, { x: x0 + w * 0.16, y: y0 + w * 0.08 }, { x: mid, y: y0 }, { x: x1 - w * 0.16, y: y0 + w * 0.1 }, { x: x1 + w * 0.03, y: y0 + w * 0.42 }, { x: x1, y: y1 }, { x: mid, y: y1 + 1 }], paint, rng, { along: Math.PI / 2, wobble: 0.7, ridges: 0.9 })
  dab(ctx, x0 + w * 0.74, (y0 + y1) / 2 + 2, Math.max(1.6, w * 0.09), Math.max(1.6, w * 0.09), YELLOW, rng)
}

/** A house's parts, painted over its mushroom: `built` adds the chimney or the rope ladder, `lit` lights the window. */
export function houseParts(kind: Kind, size: number, built: boolean, lit: boolean): (ctx: Ctx, rng: Rng) => void {
  return (ctx, rng) => {
    const box = doorOf(kind, size), pane = windowOf(kind, size)
    if (kind === 'red' && built) {
      // A crooked chimney, painted before the door so that it stands in the cap.
      const chimney = chimneyOf(size)
      blob(ctx, band({ x: chimney.x, y: chimney.y + 6 }, { x: chimney.x - 4, y: chimney.top }, 13 + size * 0.5, 3), BRICK, rng, { along: Math.PI / 2, wobble: 1, ridges: 0.8 })
      blob(ctx, band({ x: chimney.x - 4 - (8 + size * 0.4), y: chimney.top }, { x: chimney.x - 4 + 8 + size * 0.4, y: chimney.top - 1 }, 6, 1), STONE, rng, { along: 0, wobble: 0.6, flat: true })
    }
    if (kind === 'bell' && built) {
      // What its gnome climbs: one knotted rope down from under the door, askew and slack, frayed at its end (marks.ts).
      const rope = ropeParts(size)
      stroke(ctx, rope.line, ROPE_WIDE, ROPE)
      for (const strand of rope.tuft) stroke(ctx, strand, 1.6, ROPE)
      for (const knot of rope.knots) dab(ctx, knot.x, knot.y, knot.r * 1.25, knot.r, ROPE_KNOT, rng, knot.tilt, knot.tilt)
    }
    door(ctx, box.x0, box.y0, box.x1, box.y1, kind === 'red' ? WOOD : kind === 'bell' ? WOOD_2 : CORK, rng)
    // One round window, with a sill of thick paint under it.
    if (lit) run(ctx, pane.x, pane.y, pane.r * 2.4, LIT[kind].light, rng)
    dab(ctx, pane.x, pane.y, pane.r * 1.22, pane.r * 1.22, kind === 'bell' ? WHITE : WOOD, rng)
    dab(ctx, pane.x, pane.y, pane.r, pane.r, lit ? LIT[kind] : PANE, rng)
  }
}

/** A house of a kind and a size, as a mushroom sprite with its parts. */
export function houseSprite(make: MakeCanvas, scale: number, kind: Kind, size: number, built: boolean, lit: boolean): Sprite {
  return mushroomSprite(make, scale, kind, size, houseParts(kind, size, built, lit))
}

/** The door cart, with its wheel at the origin's sides and its doors standing in it: painted round `CART`'s middle. */
export function cartSprite(make: MakeCanvas, scale: number): Sprite {
  const rng = makeRng(0xca27)
  return sprite(make, scale, CART.left - CART.x - 8, CART.top - CART.y - 8, CART.right - CART.x + 8, CART.bottom - CART.y + 8, (ctx) => {
    // Three doors stand in it, each its own height and paint, leaning on one another.
    for (const [x, tall, lean, paint] of [[-26, 48, -0.08, WOOD], [2, 58, 0.05, CORK], [28, 42, 0.12, WOOD_2]] as const) {
      ctx.save()
      ctx.translate(x, -14)
      ctx.rotate(lean)
      door(ctx, -15, -tall, 15, 0, paint, rng)
      ctx.restore()
    }
    // The box, a shaft towards the snail, and two wheels that are not a pair.
    blob(ctx, [{ x: -52, y: -30 }, { x: -46, y: -2 }, { x: 0, y: 2 }, { x: 46, y: -2 }, { x: 52, y: -30 }, { x: 0, y: -26 }], pot('#4f8fb0', '#7fb9d6', '#346a88'), rng, { along: 0.05, wobble: 1.6, drips: 1 })
    stroke(ctx, [{ x: -50, y: -10 }, { x: -62, y: 2 }], 5, TRUNK.dark)
    for (const [x, r] of [[-30, 15], [30, 12]] as const) {
      dab(ctx, x, 2, r, r, TRUNK, rng)
      dab(ctx, x, 2, r * 0.36, r * 0.36, YELLOW, rng)
    }
  })
}

/** A door by itself, in a hand or on its way, with its foot at the origin. */
export function doorSprite(make: MakeCanvas, scale: number): Sprite {
  const rng = makeRng(0xd002)
  return sprite(make, scale, -24, -70, 24, 6, (ctx) => door(ctx, -17, -64, 17, 0, WOOD, rng))
}

/** The face a gnome shows in his window, in a circle of radius 16 round the origin: his hat's colour over his skin and his beard. */
export function faceSprite(make: MakeCanvas, scale: number, who: GnomeId): Sprite {
  const rng = makeRng(0xface + who.charCodeAt(0)), look = coloursOf(who)
  return sprite(make, scale, -20, -22, 20, 20, (ctx) => {
    dab(ctx, 0, 1, 12, 12, SKIN, rng)
    blob(ctx, [{ x: -11, y: 4 }, { x: -9, y: 13 }, { x: 0, y: 17 }, { x: 9, y: 13 }, { x: 11, y: 4 }, { x: 0, y: 8 }], WHITE, rng, { along: Math.PI / 2, wobble: 0.6, flat: true })
    blob(ctx, [{ x: -13, y: -5 }, { x: -6, y: -14 }, { x: who === 'tall' ? 3 : 0, y: -20 }, { x: 7, y: -13 }, { x: 13, y: -5 }, { x: 0, y: -3 }], look.hat, rng, { along: Math.PI / 2, wobble: 0.6, flat: true })
    for (const side of [-1, 1]) {
      dab(ctx, side * 8, 4, 3, 2.4, CHEEK, rng)
      ctx.fillStyle = DARK
      ctx.beginPath()
      ctx.arc(side * 4.4, -0.5, 1.7, 0, Math.PI * 2)
      ctx.fill()
    }
    dab(ctx, 0, 4, who === 'sneezy' ? 4.4 : 3, who === 'sneezy' ? 4 : 2.8, who === 'sneezy' ? look.nose : SKIN, rng)
  })
}

/** The snail's lamp: a small lantern on a crook, with its foot at the origin. */
export function lampSprite(make: MakeCanvas, scale: number): Sprite {
  const rng = makeRng(0x1a4b)
  return sprite(make, scale, -22, -64, 44, 6, (ctx) => {
    stroke(ctx, [{ x: 0, y: 2 }, { x: -2, y: -40 }, { x: 8, y: -54 }, { x: 14, y: -44 }], 4, TRUNK.dark)
    run(ctx, 14, -32, 16, '#ffe9a0', rng)
    dab(ctx, 14, -32, 8, 10, ORANGE, rng)
    dab(ctx, 14, -32, 4.5, 6, YELLOW, rng)
  })
}

/** A painted piece as it is at night: the same paint, multiplied by the night's blue. */
export function nightTwin(make: MakeCanvas, piece: Sprite): Sprite {
  const source = piece.canvas as HTMLCanvasElement
  const canvas = make(source.width, source.height), ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0)
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = NIGHT
  ctx.fillRect(0, 0, source.width, source.height)
  // The multiply filled the clear parts too: keep the paint's own outline.
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(source, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  return { ...piece, canvas }
}

/** A house with its window lit, at night: the house in the night's blue, and the window and its glow in their own paint. A puffball is lit whole, like a paper lantern. */
export function litHouse(make: MakeCanvas, scale: number, kind: Kind, size: number): Sprite {
  if (kind === 'puff') return mushroomSprite(make, scale, kind, size, (ctx, rng) => { const ball = shapeOf(kind, size); run(ctx, 0, -ball.capHeight / 2, (ball.capWidth / 2 + 12) / 1.7, '#ffe9a8', rng); houseParts(kind, size, true, true)(ctx, rng) })
  const dark = nightTwin(make, houseSprite(make, scale, kind, size, true, false))
  const ctx = (dark.canvas as HTMLCanvasElement).getContext('2d')!, pane = windowOf(kind, size), rng = makeRng(0x11 + size)
  ctx.setTransform(scale, 0, 0, scale, -dark.x * scale, -dark.y * scale)
  // A wash reaches 1.7 times its radius: this one stays inside the piece it is painted on.
  run(ctx, pane.x, pane.y, pane.r * 1.3, LIT[kind].base, rng)
  dab(ctx, pane.x, pane.y, pane.r, pane.r, LIT[kind], rng)
  return dark
}

/** The painted place at night: the day's painting in the night's blue, with a few stars in the open sky. */
export function paintNight(ctx: Ctx, day: HTMLCanvasElement, base: readonly [number, number, number, number, number, number]): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(day, 0, 0)
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = '#4f5fb8'
  ctx.fillRect(0, 0, day.width, day.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.setTransform(...base)
  const rng = makeRng(0x57a2)
  // Stars where the sky is open, left of the sun's hill and between the leaves: one plump tilted dab each, no two of a size or a tilt (marks.ts).
  for (const star of STARS) dab(ctx, star.x, star.y, star.rx, star.ry, WHITE, rng, star.tilt, star.tilt)
}

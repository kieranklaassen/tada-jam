import { FULL } from './config'
import { BANK, LOG, POND, SHADE, SNAIL, STREAM, SUN, skyline, type GnomeId, type Kind } from './ground'
import type { Point } from './input'
import { LOG_FACE, LOG_GRAIN } from './marks'
import { band, blob, dab, ellipse, paperTile, pot, run, stroke, trace, wobbled, type Ctx, type Pot } from './paint'
import { makeRng, type Rng } from './rng'
import { shapeOf } from './shapes'
import { STAGE } from './stage'

// What the glade is painted from: the backdrop, painted once for a surface
// size, and the sprites, painted once each and stamped every frame. All of
// it is poster paint (paint.ts). The mushrooms are the working pieces and are
// the plainest things here: no face, no pattern but the red one's spots, no
// motion of their own. The look goes on the gnomes, the snail, the sun and
// the place.

/** A painted piece: its canvas, and where its top left corner lies from its own origin, in stage units. */
export type Sprite = { canvas: CanvasImageSource; x: number; y: number; w: number; h: number }
export type MakeCanvas = (width: number, height: number) => HTMLCanvasElement

/** Paints a sprite covering `x0..x1` by `y0..y1` round its origin, at `scale` pixels to a stage unit. */
export function sprite(make: MakeCanvas, scale: number, x0: number, y0: number, x1: number, y1: number, paint: (ctx: Ctx) => void): Sprite {
  const w = x1 - x0, h = y1 - y0
  const canvas = make(Math.max(1, Math.ceil(w * scale)), Math.max(1, Math.ceil(h * scale)))
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale)
  paint(ctx)
  return { canvas, x: x0, y: y0, w, h }
}

// ---------------------------------------------------------------- the pots

export const PAPER = '#8f7f93'
const SKY = [pot('#f6e4ac', '#fff6d6', '#e3c987'), pot('#f8e9bb', '#fff8de', '#e6cf96'), pot('#f9eecb', '#fffbe8', '#ead7a6')]
const CLOUD = pot('#fffaf0', '#ffffff', '#e4d9cf')
const SUNNY = pot('#9bc947', '#c6e36c', '#6ea236')
const SUNNY_2 = pot('#a9d24f', '#d2ea7c', '#7aaa3a')
const HILL = pot('#b9db5c', '#dcf08a', '#8cb844')
const SHADY = pot('#3b6a36', '#557f44', '#284a26')
const SHADY_2 = pot('#33602f', '#4c773d', '#21421f')
const BANKS = pot('#5cb99b', '#8fd9bd', '#3c9279')
const WATER = pot('#3f7fdb', '#8dc2f5', '#2a5cb0')
export const TRUNK = pot('#7c4c2d', '#a8734a', '#553119')
const LEAF = [pot('#2c6b40', '#48915a', '#1b4a2b'), pot('#3c8746', '#5fae62', '#27602f'), pot('#1f5638', '#3a7b55', '#123a25')]
const FAR = [pot('#4f8f7a', '#72b09a', '#356a59'), pot('#5c9c6a', '#82bb8a', '#3f7549')]
const LOG_BROWN = pot('#8d5b35', '#b98556', '#5f3a1e')
const LOG_END = pot('#dba96c', '#f2cf9b', '#b07f45')
const LITTER = [pot('#b0703a', '#cf9257', '#84501f'), pot('#c79a3f', '#e2bd6a', '#98702a'), pot('#7d5a34', '#9d7a50', '#573b1d')]
const GRASS = pot('#3f8a3c', '#62ad55', '#285f27')
export const STONE = pot('#b9b1ae', '#dcd6d2', '#8c8482')
export const WHITE = pot('#fff6e4', '#ffffff', '#e2d3b8')
export const YELLOW = pot('#ffd33d', '#ffec8f', '#eaa91f')
export const ORANGE = pot('#ff9a2e', '#ffc06b', '#d8721a')
export const DARK = '#2b2440'

export const RED = pot('#e2392c', '#f76a55', '#b02319')
const STEM = pot('#f4e7c9', '#fffaf0', '#d5c39b')
export const BELL = pot('#3d4fd4', '#6f86f2', '#2836a0')
const BELL_STEM = pot('#4f9a3c', '#86c964', '#357526')
export const PUFF = pot('#fbf2dc', '#ffffff', '#dccba6')
const PUFF_WART = pot('#ead9b4', '#f8ecd0', '#cdb98f')

export const SKIN = pot('#f3b896', '#fbd3b8', '#d89574')
export const CHEEK = pot('#f08f84', '#f8b0a4', '#d96e64')
const BOOT = pot('#5a3a26', '#7d573c', '#3a2415')

// ---------------------------------------------------------------- mushrooms

/** Where the red one's spots sit on its cap, across (-1 to 1) and up (0 to 1), in the order they pop out. */
const SPOTS: readonly (readonly [number, number, number])[] = [
  [0.02, 0.56, 1], [-0.52, 0.34, 0.8], [0.5, 0.4, 0.85], [-0.2, 0.84, 0.6], [0.3, 0.8, 0.65], [-0.8, 0.12, 0.55],
  [0.8, 0.12, 0.5], [0.06, 0.2, 0.7], [-0.44, 0.64, 0.5], [0.58, 0.66, 0.5], [-0.16, 0.4, 0.45], [0.3, 0.1, 0.45],
]

/** Where the newest spot of a red mushroom of this size sits, from its foot: the place a popping spot is thrown from. */
export function spotPlace(size: number, index: number): Point {
  const shape = shapeOf('red', size), [u, v] = SPOTS[index % SPOTS.length]
  const dome = shape.capHeight * 0.8
  return { x: u * (shape.capWidth / 2) * Math.sqrt(1 - v * v) * 0.86, y: -shape.stemHeight - v * dome * 0.86 }
}

function footShadow(ctx: Ctx, width: number, rng: Rng): void {
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#1d4a2a'
  trace(ctx, wobbled(ellipse(0, 1, width * 0.5, 7, 10), rng, 1.5))
  ctx.fill()
  ctx.globalAlpha = 1
}

/** One mushroom of a kind and a whole size, with its foot at the origin. */
export function mushroomSprite(make: MakeCanvas, scale: number, kind: Kind, size: number, parts?: (ctx: Ctx, rng: Rng) => void): Sprite {
  const shape = shapeOf(kind, size)
  const rng = makeRng(0x3000 + size * 7 + (kind === 'red' ? 1 : kind === 'bell' ? 2 : 3))
  const half = shape.width / 2 + 16 + (kind === 'bell' ? shape.lean : 0)
  // A house's chimney stands above its cap, so a house is painted with more room over it.
  return sprite(make, scale, -half, -shape.height - (parts ? 36 : 16), half, 30, (ctx) => {
    paintMushroom(ctx, kind, size, rng)
    parts?.(ctx, rng)
  })
}

function paintMushroom(ctx: Ctx, kind: Kind, size: number, rng: Rng): void {
  const shape = shapeOf(kind, size)
  {
    if (kind === 'red') {
      footShadow(ctx, shape.stemWidth * 2.1, rng)
      const top = -shape.stemHeight
      blob(ctx, [{ x: -shape.stemWidth * 0.62, y: 2 }, { x: -shape.stemWidth * 0.5, y: top * 0.5 }, { x: -shape.stemWidth * 0.42, y: top - 4 }, { x: shape.stemWidth * 0.42, y: top - 4 }, { x: shape.stemWidth * 0.5, y: top * 0.5 }, { x: shape.stemWidth * 0.62, y: 2 }, { x: 0, y: 6 }], STEM, rng, { along: Math.PI / 2, wobble: 1.5 })
      const w = shape.capWidth / 2, dome = shape.capHeight * 0.8, under = shape.capHeight * 0.2
      const cap: Point[] = []
      for (let i = 0; i <= 10; i++) { const a = Math.PI - (i / 10) * Math.PI; cap.push({ x: Math.cos(a) * w, y: top - Math.sin(a) ** 0.85 * dome }) }
      cap.push({ x: w * 0.72, y: top + under }, { x: 0, y: top + under * 1.25 }, { x: -w * 0.72, y: top + under })
      blob(ctx, cap, RED, rng, { along: 0.12, wobble: 1.8, drips: size >= 4 ? 1 + (size > 8 ? 1 : 0) : 0 })
      for (let i = 0; i < size; i++) {
        const at = spotPlace(size, i), r = (5 + 0.42 * size) * SPOTS[i][2]
        // The red ran into the white while both were wet.
        run(ctx, at.x, at.y, r * 1.5, '#f6a79b', rng)
        dab(ctx, at.x, at.y, r * 1.15, r, WHITE, rng, 0.3)
      }
      return
    }
    if (kind === 'bell') {
      footShadow(ctx, 44, rng)
      const tip = { x: shape.lean, y: -shape.stemHeight }
      stroke(ctx, [{ x: 0, y: 2 }, { x: -3, y: -shape.stemHeight * 0.5 }, { x: 0, y: -shape.stemHeight - 6 }, { x: shape.lean * 0.7, y: -shape.stemHeight - 9 }, tip], shape.stemWidth, BELL_STEM.base)
      stroke(ctx, [{ x: -shape.stemWidth * 0.2, y: 0 }, { x: -3 - shape.stemWidth * 0.2, y: -shape.stemHeight * 0.5 }, { x: -shape.stemWidth * 0.1, y: -shape.stemHeight - 4 }], shape.stemWidth * 0.26, BELL_STEM.light)
      stroke(ctx, [{ x: shape.stemWidth * 0.3, y: 0 }, { x: -3 + shape.stemWidth * 0.3, y: -shape.stemHeight * 0.5 }, { x: shape.stemWidth * 0.3, y: -shape.stemHeight * 0.9 }], shape.stemWidth * 0.2, BELL_STEM.dark)
      const w = shape.capWidth / 2, length = Math.min(shape.capHeight, shape.stemHeight - 8), y0 = tip.y - 2
      const at = (u: number, v: number): Point => ({ x: tip.x + u * w, y: y0 + v * length })
      const bell: Point[] = [
        at(-0.16, 0), at(-0.44, 0.18), at(-0.62, 0.5), at(-0.74, 0.78), at(-1, 0.94), at(-0.62, 1), at(-0.3, 0.92), at(0, 1), at(0.3, 0.92), at(0.62, 1), at(1, 0.94), at(0.74, 0.78), at(0.62, 0.5), at(0.44, 0.18), at(0.16, 0),
      ]
      // The clapper shows under the lip.
      dab(ctx, tip.x, y0 + length * 0.98, 4 + size * 0.3, 5 + size * 0.36, YELLOW, rng)
      blob(ctx, bell, BELL, rng, { along: Math.PI / 2 + 0.1, wobble: 1.2 })
      blob(ctx, band(at(-0.78, 0.84), at(0.78, 0.84), 5 + size * 0.3, 2), pot(BELL.light, '#a9b8ff', BELL.base), rng, { along: 0, wobble: 0.8, flat: true })
      // The dewdrop that swells on its rim.
      dab(ctx, tip.x - w * 0.3, y0 + length + 2 + size * 0.25, 2.6 + size * 0.22, 3.4 + size * 0.3, pot('#bfe2ff', '#ffffff', '#86b8ea'), rng)
      return
    }
    footShadow(ctx, shape.capWidth * 0.9, rng)
    const w = shape.capWidth / 2, h = shape.capHeight
    const ball: Point[] = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2, up = Math.max(0, -Math.sin(a))
      return { x: Math.cos(a) * w * (1 - 0.2 * up * (size / FULL)), y: Math.min(3, -h / 2 + 2 + Math.sin(a) * h / 2) }
    })
    blob(ctx, ball, PUFF, rng, { along: -0.5, wobble: 1.6, ridges: 0.8 })
    // The skirt it sits on, the warts on its shoulders, and the hole its spores come out of.
    for (let i = 0; i < 3 + Math.floor(size / 2); i++) {
      const a = -Math.PI / 2 + (rng.next() - 0.5) * 2.2, r = 0.35 + 0.5 * rng.next()
      dab(ctx, Math.cos(a) * w * r * 0.9, -h / 2 + Math.sin(a) * h * r * 0.5, 3 + size * 0.2, 2.6 + size * 0.16, PUFF_WART, rng)
    }
    dab(ctx, 0, -h + 6 + size * 0.2, 4 + size * 0.35, 2.6 + size * 0.2, pot('#b9a57c', '#d6c49e', '#8f7c56'), rng)
  }
}

// ---------------------------------------------------------------- gnomes

export type GnomeSprites = { body: Sprite; bundle: Sprite; head: Sprite; hat: Sprite; nose: Sprite | null }

/** Where a gnome's parts hang together, from his seat: what the view needs to pose him. */
export const GNOME = {
  /** The neck, from the seat; the head turns about it. */
  neck: -98,
  /** The middle of the face, from the neck. */
  face: -26,
  /** Where the hat sits, from the neck. */
  brim: -50,
  eye: { x: 14, y: -32, rx: 8.5, ry: 10.5 },
  brow: { y: -47 },
  mouth: { y: -2 },
  nose: { y: -18 },
} as const

type GnomeLook = { coat: Pot; hat: Pot; half: number; shoulder: Point; noseSize: number; nosePot: Pot }

const LOOKS: Record<GnomeId, GnomeLook> = {
  tall: { coat: pot('#30539c', '#5279c6', '#1e3870'), hat: pot('#d83a2b', '#f26b55', '#a5231a'), half: 36, shoulder: { x: 30, y: -80 }, noseSize: 11, nosePot: SKIN },
  baker: { coat: pot('#d79a2b', '#f0c45f', '#a87218'), hat: WHITE, half: 60, shoulder: { x: 50, y: -78 }, noseSize: 13, nosePot: CHEEK },
  sleepy: { coat: pot('#8fc3ea', '#c3e2fa', '#5f97c4'), hat: pot('#8fc3ea', '#c3e2fa', '#5f97c4'), half: 52, shoulder: { x: -44, y: -74 }, noseSize: 12, nosePot: SKIN },
  sneezy: { coat: pot('#8c4fb0', '#b57fd6', '#613283'), hat: ORANGE, half: 46, shoulder: { x: 40, y: -80 }, noseSize: 17, nosePot: pot('#e8402f', '#fa7a66', '#b82a1e') },
}

export function shoulderOf(who: GnomeId): Point {
  return LOOKS[who].shoulder
}

/** The two paints a gnome is known by: his coat and his hat. */
export function coloursOf(who: GnomeId): { coat: Pot; hat: Pot; nose: Pot } {
  return { coat: LOOKS[who].coat, hat: LOOKS[who].hat, nose: LOOKS[who].nosePot }
}

export function noseSizeOf(who: GnomeId): number {
  return LOOKS[who].noseSize
}

export function gnomeSprites(make: MakeCanvas, scale: number, who: GnomeId, hatTop: number): GnomeSprites {
  const look = LOOKS[who], rng = makeRng(0x9000 + who.length * 31 + who.charCodeAt(1))
  const half = look.half

  const body = sprite(make, scale, -half - 26, -112, half + 26, 64, (ctx) => {
    // Two legs that hang in front of the log, and their boots.
    for (const side of [-1, 1]) {
      blob(ctx, band({ x: side * half * 0.42, y: -6 }, { x: side * half * 0.46, y: 30 }, 20), look.coat, rng, { along: Math.PI / 2, wobble: 1.2 })
      blob(ctx, ellipse(side * (half * 0.46 + 5), 40, 17, 11, 10), BOOT, rng, { wobble: 1.2 })
    }
    // The coat: a bell from the shoulders down to the seat.
    blob(ctx, [{ x: -half * 0.5, y: -100 }, { x: -half * 0.86, y: -58 }, { x: -half, y: -8 }, { x: -half * 0.6, y: 8 }, { x: 0, y: 10 }, { x: half * 0.6, y: 8 }, { x: half, y: -8 }, { x: half * 0.86, y: -58 }, { x: half * 0.5, y: -100 }, { x: 0, y: -106 }], look.coat, rng, { along: Math.PI / 2 - 0.15, wobble: 2.2, drips: 1 })
    if (who === 'baker') {
      // An apron with flour on it.
      blob(ctx, [{ x: -half * 0.5, y: -70 }, { x: -half * 0.62, y: -10 }, { x: 0, y: 2 }, { x: half * 0.62, y: -10 }, { x: half * 0.5, y: -70 }, { x: 0, y: -76 }], WHITE, rng, { along: Math.PI / 2, wobble: 2 })
      run(ctx, 6, -20, 16, '#f0c45f', rng)
    }
    if (who === 'tall') for (const y of [-64, -38, -14]) dab(ctx, 0, y, 5, 5, YELLOW, rng)
    if (who === 'sleepy') for (const [x, y] of [[-22, -50], [20, -30], [-8, -16], [26, -66]]) dab(ctx, x, y, 4.5, 4.5, WHITE, rng)
    if (who === 'sneezy') blob(ctx, band({ x: -half * 0.8, y: -34 }, { x: half * 0.8, y: -34 }, 12, 2), YELLOW, rng, { along: 0, wobble: 1 })
  })

  // The arm and what he holds out, turning about the shoulder at the origin.
  const bundle = sprite(make, scale, -90, -96, 90, 96, (ctx) => {
    if (who === 'tall') {
      // A bundle on a stick over his shoulder, on the side away from the frame's edge.
      ctx.scale(-1, 1)
      stroke(ctx, [{ x: 8, y: 30 }, { x: -22, y: -30 }, { x: -44, y: -70 }], 6, TRUNK.base)
      blob(ctx, ellipse(-48, -62, 24, 21, 12), pot('#f2c230', '#ffe07a', '#c8961a'), rng, { wobble: 2 })
      for (const [x, y] of [[-56, -68], [-42, -54], [-40, -72]]) dab(ctx, x, y, 4, 4, RED, rng)
      blob(ctx, band({ x: 0, y: 0 }, { x: 6, y: 32 }, 17), look.coat, rng, { along: Math.PI / 2, wobble: 1 })
      dab(ctx, 7, 36, 9, 8, SKIN, rng)
    } else if (who === 'baker') {
      // An empty bucket, held out towards the stream.
      blob(ctx, band({ x: 0, y: 0 }, { x: 40, y: 14 }, 18), look.coat, rng, { along: 0.3, wobble: 1 })
      dab(ctx, 46, 16, 9, 8, SKIN, rng)
      ctx.strokeStyle = '#5b6470'; ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(28, 30); ctx.quadraticCurveTo(48, 4, 68, 30); ctx.stroke()
      blob(ctx, [{ x: 24, y: 28 }, { x: 30, y: 74 }, { x: 48, y: 78 }, { x: 66, y: 74 }, { x: 72, y: 28 }, { x: 48, y: 33 }], pot('#8fa0b3', '#c0cedc', '#647588'), rng, { along: Math.PI / 2, wobble: 1.4 })
      blob(ctx, ellipse(48, 29, 23, 6, 10), pot('#4e5a68', '#72808f', '#343d48'), rng, { wobble: 0.8, flat: true })
    } else if (who === 'sleepy') {
      // His pillow, under his arm.
      blob(ctx, [{ x: -64, y: -6 }, { x: -56, y: 44 }, { x: -28, y: 52 }, { x: 0, y: 46 }, { x: 6, y: -4 }, { x: -28, y: -12 }], WHITE, rng, { along: 0.2, wobble: 2.6 })
      for (const [x, y] of [[-44, 10], [-22, 30], [-46, 34], [-16, 6]]) dab(ctx, x, y, 3.5, 3.5, pot('#8fc3ea', '#c3e2fa', '#5f97c4'), rng)
      blob(ctx, band({ x: 0, y: 0 }, { x: -30, y: 26 }, 17), look.coat, rng, { along: 2.4, wobble: 1 })
      dab(ctx, -34, 29, 9, 8, SKIN, rng)
    } else {
      // A large handkerchief, held up.
      blob(ctx, band({ x: 0, y: 0 }, { x: 22, y: -26 }, 17), look.coat, rng, { along: -0.6, wobble: 1 })
      blob(ctx, [{ x: 14, y: -38 }, { x: 22, y: -76 }, { x: 40, y: -58 }, { x: 58, y: -72 }, { x: 54, y: -30 }, { x: 34, y: -20 }], WHITE, rng, { along: -0.9, wobble: 2.4 })
      dab(ctx, 26, -30, 9, 8, SKIN, rng)
    }
  })

  // The head, turning about the neck at the origin: skin, a beard, cheeks and the whites of the eyes.
  const head = sprite(make, scale, -70, -84, 70, 96, (ctx) => {
    const cy = GNOME.face
    blob(ctx, ellipse(0, cy, who === 'tall' ? 33 : 40, who === 'tall' ? 40 : 37, 14), SKIN, rng, { along: 0.4, wobble: 1.6 })
    for (const side of [-1, 1]) dab(ctx, side * 27, cy + 8, 8, 6, CHEEK, rng)
    // Each beard is its own: long and pointed, round and curly, a bib, a fork.
    const b = cy + 12
    const beards: Record<GnomeId, Point[]> = {
      tall: [{ x: -30, y: b - 6 }, { x: -24, y: b + 40 }, { x: -8, y: b + 84 }, { x: 0, y: b + 100 }, { x: 8, y: b + 84 }, { x: 24, y: b + 40 }, { x: 30, y: b - 6 }, { x: 0, y: b + 6 }],
      baker: [{ x: -42, y: b - 8 }, { x: -48, y: b + 24 }, { x: -26, y: b + 50 }, { x: 0, y: b + 56 }, { x: 26, y: b + 50 }, { x: 48, y: b + 24 }, { x: 42, y: b - 8 }, { x: 0, y: b + 4 }],
      sleepy: [{ x: -40, y: b - 6 }, { x: -44, y: b + 44 }, { x: -30, y: b + 70 }, { x: 0, y: b + 62 }, { x: 30, y: b + 70 }, { x: 44, y: b + 44 }, { x: 40, y: b - 6 }, { x: 0, y: b + 6 }],
      sneezy: [{ x: -38, y: b - 8 }, { x: -40, y: b + 30 }, { x: -24, y: b + 66 }, { x: -6, y: b + 40 }, { x: 0, y: b + 30 }, { x: 6, y: b + 40 }, { x: 24, y: b + 66 }, { x: 40, y: b + 30 }, { x: 38, y: b - 8 }, { x: 0, y: b + 4 }],
    }
    blob(ctx, beards[who], WHITE, rng, { along: Math.PI / 2, wobble: 2, drips: who === 'sleepy' ? 1 : 0 })
    if (who === 'baker') for (const side of [-1, 1]) blob(ctx, band({ x: side * 4, y: b + 2 }, { x: side * 34, y: b - 4 }, 13, side * -5), WHITE, rng, { along: 0, wobble: 1 })
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#fffdf6'
      trace(ctx, wobbled(ellipse(side * GNOME.eye.x, GNOME.eye.y, GNOME.eye.rx, GNOME.eye.ry, 10), rng, 0.6))
      ctx.fill()
    }
    if (who !== 'sneezy') dab(ctx, 0, GNOME.nose.y, look.noseSize * 1.1, look.noseSize, look.nosePot, rng)
  })

  const nose = who === 'sneezy' ? sprite(make, scale, -26, -26, 26, 26, (ctx) => dab(ctx, 0, 0, look.noseSize * 1.1, look.noseSize, look.nosePot, rng)) : null

  // The hat, turning about the middle of its brim at the origin. `rise` is how far its tip stands above the brim.
  const rise = -hatTop + GNOME.neck + GNOME.brim
  const hat = sprite(make, scale, -84, -rise - 24, 96, 44, (ctx) => {
    if (who === 'baker') {
      blob(ctx, band({ x: -30, y: -4 }, { x: 30, y: -4 }, 26), WHITE, rng, { along: Math.PI / 2, wobble: 1.2 })
      for (const [x, y, r] of [[-26, -30, 24], [26, -30, 24], [0, -40, 30]] as const) blob(ctx, ellipse(x, y - (rise - 62) * 0.5, r, r * 0.92, 12), WHITE, rng, { along: 0.8, wobble: 2 })
      return
    }
    if (who === 'sleepy') {
      // A nightcap that has fallen over to one side, with a tassel.
      blob(ctx, [{ x: -40, y: 6 }, { x: -34, y: -22 }, { x: -10, y: -rise }, { x: 30, y: -rise + 4 }, { x: 62, y: -rise + 36 }, { x: 70, y: -8 }, { x: 56, y: -rise + 54 }, { x: 36, y: -rise + 36 }, { x: 40, y: 6 }, { x: 0, y: 12 }], look.hat, rng, { along: Math.PI / 2 - 0.5, wobble: 1.6 })
      blob(ctx, band({ x: -40, y: 6 }, { x: 40, y: 6 }, 15, 3), WHITE, rng, { along: 0, wobble: 1 })
      dab(ctx, 71, 2, 11, 11, WHITE, rng)
      return
    }
    // A cone, the tall one's twice as tall as he is, with a tip that has had a knock.
    const bent = who === 'tall' ? 14 : 5
    blob(ctx, [{ x: -42, y: 8 }, { x: -22, y: -rise * 0.5 }, { x: bent - 5, y: -rise + 4 }, { x: bent + 5, y: -rise }, { x: 24, y: -rise * 0.5 }, { x: 42, y: 8 }, { x: 0, y: 14 }], look.hat, rng, { along: Math.PI / 2 - 0.1, wobble: 1.6, drips: 0 })
    if (who === 'tall') for (const y of [-rise * 0.3, -rise * 0.62]) blob(ctx, band({ x: -24 + (-y / rise) * 16, y }, { x: 24 - (-y / rise) * 12, y: y + 3 }, 9, 2), YELLOW, rng, { along: 0, wobble: 0.8 })
  })

  return { body, bundle, head, hat, nose }
}

// ---------------------------------------------------------------- the snail, the sun, the frog, the hand

export function snailSprites(make: MakeCanvas, scale: number): { body: Sprite; shell: Sprite } {
  const rng = makeRng(0x511a)
  const peach = pot('#f1c79c', '#fbe2c4', '#cf9c6c')
  // It faces the glade, to the left.
  const body = sprite(make, scale, -110, -70, 96, 30, (ctx) => {
    blob(ctx, [{ x: 84, y: 10 }, { x: 40, y: -6 }, { x: -30, y: -10 }, { x: -62, y: -40 }, { x: -84, y: -50 }, { x: -96, y: -34 }, { x: -92, y: -4 }, { x: -60, y: 14 }, { x: 20, y: 16 }], peach, rng, { along: 0.1, wobble: 2, drips: 0 })
    dab(ctx, -78, -22, 6, 4.5, CHEEK, rng)
  })
  const shell = sprite(make, scale, -76, -84, 84, 76, (ctx) => {
    blob(ctx, ellipse(0, 0, 62, 58, 16), pot('#f0863a', '#ffb673', '#c35f1f'), rng, { along: 0.8, wobble: 2.4, drips: 1 })
    // The whorl, left by the tip of the brush.
    const whorl: Point[] = []
    for (let i = 0; i <= 26; i++) { const a = i * 0.48, r = 46 - i * 1.6; whorl.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.94 }) }
    stroke(ctx, whorl, 7, '#fff0d0')
    run(ctx, 10, 8, 22, '#f6c1d0', rng)
  })
  return { body, shell }
}

export function sunSprites(make: MakeCanvas, scale: number): { rays: Sprite; disc: Sprite } {
  const rng = makeRng(0x50a), r = SUN.r
  const rays = sprite(make, scale, -r * 1.9, -r * 1.9, r * 1.9, r * 1.9, (ctx) => {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2, long = i % 2 ? 1.62 : 1.78
      blob(ctx, band({ x: Math.cos(a) * r * 1.16, y: Math.sin(a) * r * 1.16 }, { x: Math.cos(a) * r * long, y: Math.sin(a) * r * long }, 15), ORANGE, rng, { along: a, wobble: 1.6 })
    }
  })
  const disc = sprite(make, scale, -r * 1.2, -r * 1.2, r * 1.2, r * 1.3, (ctx) => {
    blob(ctx, ellipse(0, 0, r, r * 0.97, 16), YELLOW, rng, { along: -0.7, wobble: 2, drips: 1 })
    for (const side of [-1, 1]) dab(ctx, side * r * 0.5, r * 0.22, r * 0.2, r * 0.15, ORANGE, rng)
    ctx.strokeStyle = '#b3441c'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.34); ctx.quadraticCurveTo(0, r * 0.62, r * 0.3, r * 0.34); ctx.stroke()
  })
  return { rays, disc }
}

export function frogSprites(make: MakeCanvas, scale: number): { dome: Sprite; frog: Sprite } {
  const rng = makeRng(0xf409)
  const dome = sprite(make, scale, -60, -64, 60, 14, (ctx) => {
    blob(ctx, [{ x: -52, y: 6 }, { x: -44, y: -26 }, { x: -20, y: -52 }, { x: 0, y: -58 }, { x: 20, y: -52 }, { x: 44, y: -26 }, { x: 52, y: 6 }, { x: 0, y: 10 }], WATER, rng, { along: 0.2, wobble: 1.6 })
    stroke(ctx, [{ x: -30, y: -30 }, { x: -18, y: -44 }, { x: -4, y: -50 }], 5, '#eaf6ff')
  })
  const green = pot('#5bb548', '#8ad873', '#3a8a2e')
  const frog = sprite(make, scale, -44, -56, 44, 16, (ctx) => {
    blob(ctx, [{ x: -36, y: 6 }, { x: -38, y: -14 }, { x: -22, y: -30 }, { x: 0, y: -34 }, { x: 22, y: -30 }, { x: 38, y: -14 }, { x: 36, y: 6 }, { x: 0, y: 10 }], green, rng, { along: 0.2, wobble: 1.4 })
    dab(ctx, 0, -2, 20, 8, pot('#e9f2b4', '#f8fbd8', '#c3d286'), rng)
    for (const side of [-1, 1]) {
      dab(ctx, side * 17, -36, 11, 11, green, rng)
      dab(ctx, side * 17, -37, 7, 7.5, WHITE, rng)
      ctx.fillStyle = DARK
      ctx.beginPath(); ctx.arc(side * 17, -36, 3.4, 0, Math.PI * 2); ctx.fill()
    }
    stroke(ctx, [{ x: -22, y: -14 }, { x: 0, y: -8 }, { x: 22, y: -14 }], 3.5, '#27591f')
  })
  return { dome, frog }
}

/** The ghost hand: a pale painted hand with one finger out, its tip at the origin. */
export function handSprite(make: MakeCanvas, scale: number): Sprite {
  const rng = makeRng(0x4a2d)
  const pale = pot('#fff3e2', '#ffffff', '#e6d2ba')
  return sprite(make, scale, -30, -10, 84, 120, (ctx) => {
    blob(ctx, band({ x: 4, y: 6 }, { x: 22, y: 56 }, 24), pale, rng, { along: 1.2, wobble: 1 })
    blob(ctx, ellipse(40, 78, 34, 30, 12), pale, rng, { along: 1, wobble: 1.6 })
    blob(ctx, band({ x: 10, y: 74 }, { x: -6, y: 52 }, 18), pale, rng, { along: 1, wobble: 1 })
  })
}

// ---------------------------------------------------------------- the place

/** How far past the stage's edges the painting goes, for a surface of another shape. */
const PAST = { x: 420, y: 260 }

function meander(ctx: Ctx, offset: number, width: number, colour: string, alpha: number, from = 0): void {
  ctx.strokeStyle = colour
  ctx.globalAlpha = alpha
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let i = from; i < STREAM.length; i++) {
    const s = STREAM[i], next = STREAM[Math.min(STREAM.length - 1, i + 1)], prev = STREAM[Math.max(0, i - 1)]
    const dx = next.x - prev.x, dy = next.y - prev.y, length = Math.hypot(dx, dy) || 1
    const x = s.x - (dy / length) * offset * (s.half / 26), y = s.y + (dx / length) * offset * (s.half / 26)
    if (i === from) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** A band as wide as the water (plus `more` on each side) along the whole stream, as one filled shape. */
function streamShape(more: number): Point[] {
  const left: Point[] = [], right: Point[] = []
  for (let i = 0; i < STREAM.length; i += 2) {
    const s = STREAM[i], next = STREAM[Math.min(STREAM.length - 1, i + 1)], prev = STREAM[Math.max(0, i - 1)]
    const dx = next.x - prev.x, dy = next.y - prev.y, length = Math.hypot(dx, dy) || 1
    const reach = s.half + more
    left.push({ x: s.x - (dy / length) * reach, y: s.y + (dx / length) * reach })
    right.push({ x: s.x + (dy / length) * reach, y: s.y - (dx / length) * reach })
  }
  const head = STREAM[0]
  return [{ x: head.x, y: head.y - head.half - more * 0.5 }, ...right, ...left.reverse()]
}

/** Paints the whole place, from edge to edge and past it, in stage units on a context already set to the stage's fit. */
export function paintPlace(ctx: Ctx, make: MakeCanvas): void {
  const rng = makeRng(0x91ade)
  const x0 = -PAST.x, x1 = STAGE.width + PAST.x, y0 = -PAST.y, y1 = STAGE.height + PAST.y

  // The sugar paper, under everything.
  const tile = make(256, 256)
  paperTile(tile.getContext('2d')!, 256, PAPER)
  const paper = ctx.createPattern(tile, 'repeat')
  ctx.fillStyle = paper ?? PAPER
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)

  // The sky: long passes of a fat brush, with the paper showing between them.
  for (let row = 0, y = y0 + 20; y < 330; row++, y += 51) {
    const shift = rng.next() * 200
    for (let x = x0 - shift; x < x1; x += 560 + rng.next() * 160) {
      const length = 480 + rng.next() * 220
      blob(ctx, band({ x, y: y + (rng.next() - 0.5) * 10 }, { x: x + length, y: y + (rng.next() - 0.5) * 14 }, 54, (rng.next() - 0.5) * 8, 8), SKY[row % SKY.length], rng, { along: 0.02, wobble: 3, ridges: 0.8, dry: PAPER })
    }
  }
  // Two clouds, away from the middle of the top edge.
  for (const [cx, cy, s] of [[404, 118, 1], [1120, 250, 0.7], [-120, 90, 1]] as const) {
    for (const [dx, dy, r] of [[-44, 8, 30], [0, -8, 40], [46, 6, 32], [8, 18, 34]] as const) blob(ctx, ellipse(cx + dx * s, cy + dy * s, r * s * 1.2, r * s * 0.8, 12), CLOUD, rng, { along: 0.1, wobble: 2.4, ridges: 0.6 })
  }
  // The sun's yellow has run into the sky round it.
  run(ctx, SUN.x, SUN.y, SUN.r * 2.3, '#ffe58a', rng)

  // Far trees along the skyline, behind the moss.
  for (let x = x0 + 40; x < x1; x += 74 + rng.next() * 50) {
    if (Math.abs(x - SUN.x) < 150) continue
    const base = skyline(x) + 8, tall = 70 + rng.next() * 70, paint = FAR[Math.floor(rng.next() * FAR.length)]
    stroke(ctx, [{ x, y: base }, { x: x + 2, y: base - tall * 0.6 }], 9, TRUNK.dark)
    blob(ctx, ellipse(x, base - tall, 34 + rng.next() * 18, 44 + rng.next() * 20, 12), paint, rng, { along: Math.PI / 2, wobble: 4, ridges: 0.7, drips: rng.next() < 0.3 ? 1 : 0 })
  }

  // The moss, in the sun: one field up to the skyline, then the passes of the brush across it.
  const field: Point[] = []
  for (let x = x0; x <= x1; x += 44) field.push({ x, y: skyline(x) })
  field.push({ x: x1, y: y1 }, { x: x0, y: y1 })
  blob(ctx, field, SUNNY, rng, { along: 0.03, wobble: 3, ridges: 0.5, flat: true })
  blob(ctx, [{ x: SUN.x - 330, y: skyline(SUN.x - 330) + 26 }, { x: SUN.x - 170, y: skyline(SUN.x - 170) + 4 }, { x: SUN.x, y: skyline(SUN.x) + 2 }, { x: SUN.x + 190, y: skyline(SUN.x + 190) + 6 }, { x: x1, y: skyline(x1) + 30 }, { x: x1, y: 380 }, { x: SUN.x, y: 352 }, { x: SUN.x - 300, y: 372 }], HILL, rng, { along: -0.05, wobble: 4, ridges: 0.8 })
  for (let y = 372; y < y1; y += 66) {
    for (let x = x0 - rng.next() * 300; x < x1; x += 420 + rng.next() * 260) {
      if (rng.next() < 0.35) continue
      const length = 300 + rng.next() * 260
      blob(ctx, band({ x, y: y + (rng.next() - 0.5) * 24 }, { x: x + length, y: y + (rng.next() - 0.5) * 24 }, 50 + rng.next() * 14, (rng.next() - 0.5) * 12, 8), SUNNY_2, rng, { along: 0.03, wobble: 3, ridges: 0.8 })
    }
  }

  // The shade under the big tree, painted over the sunny green while it was wet.
  const shade = ellipse(SHADE.x, SHADE.y, SHADE.rx, SHADE.ry, 22)
  blob(ctx, [...shade.filter((p) => p.x > -30), { x: -PAST.x, y: SHADE.y + SHADE.ry }, { x: -PAST.x, y: SHADE.y - SHADE.ry }], SHADY, rng, { along: 0.1, wobble: 4, ridges: 0.9 })
  for (let i = 0; i < 5; i++) {
    const y = SHADE.y - SHADE.ry * 0.62 + i * SHADE.ry * 0.31, reach = SHADE.rx * Math.sqrt(Math.max(0.05, 1 - ((y - SHADE.y) / SHADE.ry) ** 2)) * 0.86
    blob(ctx, band({ x: SHADE.x - reach - 60, y }, { x: SHADE.x + reach * 0.74 - rng.next() * 50, y: y + (rng.next() - 0.5) * 12 }, 40, (rng.next() - 0.5) * 8, 8), SHADY_2, rng, { along: 0.05, wobble: 2.4, ridges: 0.9 })
  }
  // Dark green ran out into the sunny green at its edge, and last year's leaves lie about in it: it is earth and litter, not water.
  for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.26; run(ctx, SHADE.x + Math.cos(a) * SHADE.rx, SHADE.y + Math.sin(a) * SHADE.ry, 22, SHADY.dark, rng) }
  for (let i = 0; i < 26; i++) {
    const a = rng.next() * Math.PI * 2, r = Math.sqrt(rng.next()) * 0.9
    const x = SHADE.x + Math.cos(a) * SHADE.rx * r, y = SHADE.y + Math.sin(a) * SHADE.ry * r
    if (x < 40 || y > 600) continue
    dab(ctx, x, y, 5 + rng.next() * 5, 2.6 + rng.next() * 2, LITTER[i % LITTER.length], rng, rng.next() * Math.PI)
  }

  // The wet bank, the stream in it, and the pond the stream ends in.
  const pondBank = ellipse(POND.x, POND.y, POND.rx + BANK - 6, POND.ry + BANK - 6, 18)
  blob(ctx, streamShape(BANK - 5), BANKS, rng, { along: Math.PI / 2 + 0.2, wobble: 5, ridges: 0.8 })
  blob(ctx, pondBank, BANKS, rng, { along: 0.1, wobble: 4, ridges: 0.8 })
  blob(ctx, streamShape(-1), WATER, rng, { along: Math.PI / 2 + 0.2, wobble: 2.4, ridges: 0 })
  blob(ctx, ellipse(POND.x, POND.y, POND.rx, POND.ry, 18), WATER, rng, { along: 0.1, wobble: 3, ridges: 0.8 })
  for (const [offset, colour, alpha] of [[-12, WATER.light, 0.6], [-4, WATER.dark, 0.4], [5, WATER.light, 0.5], [13, WATER.dark, 0.35]] as const) meander(ctx, offset, 3, colour, alpha)
  // Blue ran into the green at the water's edge.
  for (let i = 4; i < STREAM.length; i += 6) { const s = STREAM[i]; run(ctx, s.x + (i % 12 ? 1 : -1) * (s.half + 4), s.y, 13, WATER.light, rng) }
  // Reeds on the bank, below where a foot can stand.
  for (const [x, y] of [[902, 668], [922, 684], [700, 668], [716, 650]] as const) {
    stroke(ctx, [{ x, y }, { x: x + 4, y: y - 40 }, { x: x + 10, y: y - 78 }], 5, GRASS.dark)
    blob(ctx, band({ x: x + 9, y: y - 74 }, { x: x + 13, y: y - 98 }, 11), TRUNK, rng, { along: Math.PI / 2, wobble: 0.8 })
  }

  // Ferns in the shade and daisies in the sun, in the strips above and below where mushrooms stand.
  for (const [x, y] of [[58, 318], [150, 330], [262, 322], [372, 334], [36, 610], [330, 622], [120, 596], [236, 606], [404, 560]] as const) {
    for (let i = -3; i <= 3; i++) blob(ctx, band({ x, y }, { x: x + i * 13, y: y - 34 + Math.abs(i) * 7 }, 9), i % 2 ? LEAF[1] : LEAF[0], rng, { along: Math.PI / 2, wobble: 1, ridges: 0.6, flat: true })
  }
  for (const [x, y] of [[512, 318], [600, 326], [832, 318], [1004, 328], [1128, 322], [1000, 610], [1124, 598], [560, 606], [930, 596]] as const) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; dab(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 7, 6, 4.4, WHITE, rng, a) }
    dab(ctx, x, y, 5, 4.4, YELLOW, rng)
  }
  for (const [x, y] of [[450, 592], [640, 330], [1090, 372], [1150, 520], [20, 520], [486, 356]] as const) {
    for (let i = -1; i <= 1; i++) blob(ctx, band({ x: x + i * 8, y }, { x: x + i * 15, y: y - 20 }, 7), GRASS, rng, { along: Math.PI / 2, wobble: 0.8, ridges: 0.5, flat: true })
  }

  // The big tree: its trunk at the left edge, and its leaves across the top left.
  blob(ctx, [{ x: -86, y: 40 }, { x: -70, y: 380 }, { x: -110, y: 640 }, { x: -20, y: 660 }, { x: 34, y: 628 }, { x: 18, y: 380 }, { x: 30, y: 40 }], TRUNK, rng, { along: Math.PI / 2, wobble: 4, drips: 0 })
  blob(ctx, band({ x: 10, y: 250 }, { x: 150, y: 150 }, 34, -8), TRUNK, rng, { along: -0.6, wobble: 3 })
  const crowns: readonly (readonly [number, number, number, number, number])[] = [
    [-140, 40, 190, 130, 0], [60, -10, 180, 110, 1], [250, 20, 170, 100, 2], [-40, 170, 150, 86, 1], [150, 130, 150, 80, 0], [330, 110, 120, 64, 1], [430, -6, 130, 76, 0], [40, 80, 120, 70, 2],
  ]
  for (const [cx, cy, rx, ry, which] of crowns) blob(ctx, ellipse(cx, cy, rx, ry, 16), LEAF[which], rng, { along: 0.5 + which * 0.4, wobble: 9, drips: 2 })
  // Leaves hanging in along the top edge and down the right side, so the frame is closed all round.
  for (const [cx, cy, rx, ry, which] of [[700, -44, 120, 70, 1], [860, -60, 110, 66, 0], [1190, 60, 110, 150, 2], [1240, 300, 90, 120, 0], [1060, -70, 130, 70, 1]] as const) blob(ctx, ellipse(cx, cy, rx, ry, 14), LEAF[which], rng, { along: 0.9, wobble: 8, drips: 2 })
  blob(ctx, [{ x: 1196, y: 100 }, { x: 1180, y: 420 }, { x: 1196, y: 700 }, { x: 1290, y: 700 }, { x: 1270, y: 100 }], TRUNK, rng, { along: Math.PI / 2, wobble: 4 })

  // The front: dark grass along the bottom edge, the log the gnomes wait on, and the snail's stone.
  for (let x = x0; x < x1; x += 150 + rng.next() * 60) {
    if (x > POND.x - POND.rx - 40 && x < POND.x + POND.rx - 20) continue
    blob(ctx, band({ x, y: 806 + rng.next() * 10 }, { x: x + 190, y: 808 + rng.next() * 12 }, 44, 0, 6), GRASS, rng, { along: 0.02, wobble: 3, ridges: 0.9 })
  }
  blob(ctx, band({ x: LOG.left - 60, y: LOG.seat + 22 }, { x: LOG.right - 34, y: LOG.seat + 24 }, 62, 2, 10), LOG_BROWN, rng, { along: 0.01, wobble: 3, drips: 2 })
  for (const x of [190, 360, 530]) dab(ctx, x, LOG.seat + 30, 13, 9, pot('#6d4426', '#8d5b35', '#4b2c14'), rng)
  blob(ctx, ellipse(LOG.right - 18, LOG.seat + 24, LOG_FACE.rx, LOG_FACE.ry, 12), LOG_END, rng, { along: 0.6, wobble: 1.6 })
  // The grain on its end: a few short broken pieces of year rings round a heart that lies off the middle, each on another side of it (marks.ts).
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(LOG.right - 18, LOG.seat + 24, LOG_FACE.rx - 2.5, LOG_FACE.ry - 2.5, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.strokeStyle = LOG_END.dark
  ctx.globalAlpha = 0.7
  ctx.lineCap = 'round'
  for (const piece of LOG_GRAIN.pieces) { ctx.lineWidth = piece.wide; ctx.beginPath(); ctx.arc(LOG.right - 18 + LOG_GRAIN.dx, LOG.seat + 24 + LOG_GRAIN.dy, piece.r, (piece.from * Math.PI) / 180, (piece.to * Math.PI) / 180); ctx.stroke() }
  ctx.restore()
  blob(ctx, ellipse(SNAIL.x + 6, SNAIL.y + 24, 118, 30, 14), STONE, rng, { along: 0.05, wobble: 3, drips: 1 })
  for (const [x, y] of [[962, 792], [1160, 760]] as const) for (let i = -1; i <= 1; i++) blob(ctx, band({ x: x + i * 8, y }, { x: x + i * 16, y: y - 26 }, 8), GRASS, rng, { along: Math.PI / 2, wobble: 0.8, ridges: 0.5, flat: true })
}

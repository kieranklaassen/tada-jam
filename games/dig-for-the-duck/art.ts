// What every still thing and every body part looks like, each painted once
// into a sprite. Sizes are in stage units; `ax`, `ay` is the point of the
// sprite that is put on its place (feet, a neck, a peg on the line). The
// look is written up in ART.md: everything behind the pane is dyed sand,
// flat strong colours with visible grains and no outline.

type C = CanvasRenderingContext2D
const TAU = Math.PI * 2

/** The sand's five dyes, the colours of the bands, as red, green, blue. */
export const DYES: readonly (readonly [number, number, number])[] = [
  [247, 200, 44], // sunflower
  [240, 124, 30], // tangerine
  [232, 62, 120], // raspberry
  [120, 76, 196], // violet
  [248, 236, 208], // cream
]
/** The painted board behind the hill, where it shows as sky, and the dark of the case where sand has been dug away. */
export const SKY: readonly [number, number, number] = [196, 228, 238]
export const HOLLOW: readonly [number, number, number] = [36, 30, 56]
export const WATER_BLUE: readonly [number, number, number] = [38, 150, 236]
export const WATER_TOP: readonly [number, number, number] = [150, 220, 255]
export const TIN_WHITE: readonly [number, number, number] = [242, 244, 238]
export const TIN_RIM: readonly [number, number, number] = [44, 92, 170]
export const MUD_BROWN = '#6b4a34'
export const WOOD = '#c98a3c'

const INK = '#241e38'
const DUCK = '#ffd23c', DUCK_DARK = '#f0ae1a', BEAK = '#ff7a1a'
const MOLE = '#4a3b52', MOLE_LIGHT = '#6b5a73', PINK = '#ff9fb0', NOSE = '#ff5f86'
const TEAL = '#1f8f7f', TEAL_LIGHT = '#2bab97', TEAL_DARK = '#17705f'
export const WORM = '#ff8fa3', WORM_LIGHT = '#ffb7c3'
const BADGER = '#3d3f47', BADGER_LIGHT = '#f4f1e8'

function oval(c: C, x: number, y: number, rx: number, ry: number, fill: string, turn = 0): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, turn, 0, TAU); c.fillStyle = fill; c.fill()
}
function poly(c: C, points: readonly number[], fill: string): void {
  c.beginPath(); c.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1])
  c.closePath(); c.fillStyle = fill; c.fill()
}
function box(c: C, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill()
}
function line(c: C, points: readonly number[], stroke: string, width: number): void {
  c.beginPath(); c.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1])
  c.strokeStyle = stroke; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke()
}
function dots(c: C, spots: readonly number[], r: number, fill: string): void {
  c.fillStyle = fill; c.beginPath()
  for (let i = 0; i < spots.length; i += 2) { c.moveTo(spots[i] + r, spots[i + 1]); c.arc(spots[i], spots[i + 1], r, 0, TAU) }
  c.fill()
}

export type Art = { w: number; h: number; ax: number; ay: number; paint: (c: C) => void; /** Left without grains: glass, light and the wooden frame. */ smooth?: boolean; /** What it is, for the tests that look at where things are drawn. */ name?: string }

// --- The duck ---------------------------------------------------------------

export const duckBody: Art = { w: 130, h: 92, ax: 66, ay: 90, paint(c) {
  poly(c, [22, 44, 2, 14, 40, 30], DUCK_DARK)
  oval(c, 66, 54, 52, 35, DUCK)
  oval(c, 58, 58, 26, 16, DUCK_DARK, -0.2)
  oval(c, 84, 76, 26, 9, '#ffe27a')
} }
export const duckHead: Art = { w: 96, h: 92, ax: 38, ay: 78, paint(c) {
  oval(c, 44, 52, 27, 26, DUCK)
  // The beak, open a little.
  oval(c, 76, 54, 17, 7, BEAK, -0.12)
  oval(c, 74, 62, 13, 5, '#e85f0c', 0.14)
  // The shower cap: a dome with a frill.
  c.beginPath(); c.moveTo(13, 44); c.bezierCurveTo(8, 4, 80, 4, 75, 44); c.closePath(); c.fillStyle = '#9fe0f5'; c.fill()
  dots(c, [28, 26, 46, 16, 62, 28, 40, 34, 56, 38], 3.2, '#ffffff')
  for (let i = 0; i < 7; i++) oval(c, 15 + i * 10, 44, 6.5, 5, '#ffffff')
  // The white of the eye: the view draws the pupil that moves on it.
  oval(c, 50, 44, 5.2, 5.2, '#ffffff')
} }
/** The duck after a muddy bath: brown, with a clean ring where the cap sat. */
export const duckBodyMud: Art = { w: 130, h: 92, ax: 66, ay: 90, paint(c) {
  poly(c, [22, 44, 2, 14, 40, 30], '#7a5636')
  oval(c, 66, 54, 52, 35, '#96693f')
  oval(c, 58, 58, 26, 16, '#7a5636', -0.2)
  oval(c, 84, 76, 26, 9, '#b98a58')
} }
export const duckHeadMud: Art = { w: 96, h: 92, ax: 38, ay: 78, paint(c) {
  oval(c, 44, 52, 27, 26, '#96693f')
  oval(c, 76, 54, 17, 7, BEAK, -0.12)
  oval(c, 74, 62, 13, 5, '#e85f0c', 0.14)
  // The clean ring: a band of the duck's own yellow under the cap.
  c.beginPath(); c.moveTo(14, 50); c.bezierCurveTo(20, 38, 68, 38, 74, 50); c.lineTo(75, 44); c.lineTo(13, 44); c.closePath(); c.fillStyle = DUCK; c.fill()
  c.beginPath(); c.moveTo(13, 44); c.bezierCurveTo(8, 4, 80, 4, 75, 44); c.closePath(); c.fillStyle = '#9fe0f5'; c.fill()
  dots(c, [28, 26, 46, 16, 62, 28, 40, 34, 56, 38], 3.2, '#ffffff')
  for (let i = 0; i < 7; i++) oval(c, 15 + i * 10, 44, 6.5, 5, '#ffffff')
  // The white of the eye: the view draws the pupil that moves on it.
  oval(c, 50, 44, 5.2, 5.2, '#ffffff')
} }
export const brush: Art = { w: 30, h: 84, ax: 15, ay: 78, paint(c) {
  box(c, 11, 26, 8, 56, 4, '#a8642a')
  box(c, 3, 4, 24, 26, 6, '#f6ead0')
  for (let i = 0; i < 5; i++) line(c, [6 + i * 4.5, 0, 6 + i * 4.5, 8], '#8fd6ee', 3)
} }

// --- The mole ---------------------------------------------------------------

/** The sitting room behind the mole: the rug, the lamp's stand and its light, the picture and the table. The floor is the sprite's bottom edge. */
export const moleDen: Art = { w: 228, h: 144, ax: 0, ay: 144, paint(c) {
  // The lamp's light on the wall behind.
  const glow = c.createRadialGradient(194, 60, 4, 194, 60, 34)
  glow.addColorStop(0, 'rgba(255,220,110,0.55)'); glow.addColorStop(1, 'rgba(255,220,110,0)')
  c.beginPath(); c.arc(194, 60, 34, 0, TAU); c.fillStyle = glow; c.fill()
  // A picture of a carrot: the root and a tuft of leaves.
  box(c, 8, 34, 38, 46, 4, '#f0ae1a'); box(c, 13, 39, 28, 36, 2, '#f8ecd0')
  poly(c, [20, 52, 34, 52, 27, 72], '#f07c1e'); oval(c, 23, 47, 5, 4, '#2bab97', -0.5); oval(c, 31, 47, 5, 4, '#2bab97', 0.5); oval(c, 27, 45, 4, 5, '#3cc0a8')
  // The rug: one band with a wavy edge.
  box(c, 14, 134, 200, 10, 5, '#e83e78')
  c.beginPath(); c.moveTo(22, 139)
  for (let x = 22; x <= 206; x += 4) c.lineTo(x, 139 + 2.4 * Math.sin(x / 9))
  c.strokeStyle = '#f7c82c'; c.lineWidth = 3; c.lineCap = 'round'; c.stroke()
  // The lamp's stand.
  line(c, [198, 50, 198, 138], '#7a4a1e', 5); oval(c, 198, 140, 16, 4, '#7a4a1e')
  // The table.
  box(c, 4, 104, 34, 6, 3, '#a8642a'); line(c, [21, 110, 21, 140], '#a8642a', 5)
} }
/** The armchair, its feet on the sprite's bottom edge. */
export const armchair: Art = { w: 132, h: 116, ax: 66, ay: 114, paint(c) {
  box(c, 20, 100, 10, 14, 3, '#7a4a1e'); box(c, 104, 100, 10, 14, 3, '#7a4a1e')
  box(c, 12, 2, 110, 104, 34, TEAL)
  box(c, 24, 14, 86, 60, 24, TEAL_LIGHT)
  box(c, 4, 68, 126, 36, 14, TEAL_LIGHT)
  oval(c, 8, 72, 17, 26, TEAL_DARK); oval(c, 126, 72, 17, 26, TEAL_DARK)
  dots(c, [8, 54, 126, 54], 5, '#f7c82c')
} }
/** The lampshade, which is also a boat. Its lower edge is the anchor. */
export const lampShade: Art = { w: 56, h: 36, ax: 28, ay: 34, paint(c) {
  poly(c, [12, 2, 44, 2, 54, 34, 2, 34], '#f7c82c'); poly(c, [12, 2, 44, 2, 46, 10, 10, 10], '#f07c1e')
} }
export const teacup: Art = { w: 26, h: 18, ax: 9, ay: 16, paint(c) {
  box(c, 1, 2, 16, 14, 4, '#ffffff'); line(c, [17, 6, 22, 8, 17, 12], '#ffffff', 3)
  oval(c, 9, 4, 6, 2, '#b8763a')
} }
/** The mole's slippers, side by side, and one of them alone for wringing and for wiping glasses. */
/** The sitting room with the teacup on its table, with the shade on its lamp, or with both: one picture for as long as neither is in use. */
const denWith = (cup: boolean, shade: boolean): Art => ({ w: 228, h: 144, ax: 0, ay: 144, paint(c) {
  moleDen.paint(c)
  if (cup) { c.save(); c.translate(21 - teacup.ax, 104 - teacup.ay); teacup.paint(c); c.restore() }
  if (shade) { c.save(); c.translate(198 - lampShade.ax, 54 - lampShade.ay); lampShade.paint(c); c.restore() }
} })
export const moleDenCup = denWith(true, false)
export const moleDenShade = denWith(false, true)
export const moleDenBoth = denWith(true, true)
export const slippers: Art = { w: 96, h: 30, ax: 48, ay: 26, paint(c) {
  oval(c, 24, 16, 21, 12, '#f7c82c'); oval(c, 72, 16, 21, 12, '#f7c82c')
  dots(c, [34, 12, 82, 12], 6, '#e83e78')
} }
export const slipper: Art = { w: 46, h: 28, ax: 23, ay: 14, paint(c) {
  oval(c, 23, 14, 21, 12, '#f7c82c'); dots(c, [33, 10], 6, '#e83e78')
} }
/** His paws, for putting fingers in ears. */
export const molePaw: Art = { w: 26, h: 22, ax: 13, ay: 11, paint(c) {
  oval(c, 13, 11, 12, 10, PINK); oval(c, 13, 8, 7, 4, '#ffc2cd')
} }
/** A small watering can, held by its handle at the anchor. */
export const wateringCan: Art = { w: 60, h: 40, ax: 14, ay: 14, paint(c) {
  box(c, 10, 10, 30, 26, 6, '#2a78d6')
  line(c, [38, 26, 56, 8], '#2a78d6', 6); oval(c, 56, 8, 6, 4, '#184a8a', -0.7)
  line(c, [12, 12, 4, 20, 12, 30], '#184a8a', 4)
} }
export const moleBody: Art = { w: 104, h: 88, ax: 52, ay: 84, paint(c) {
  oval(c, 52, 46, 42, 40, MOLE)
  oval(c, 56, 54, 27, 26, MOLE_LIGHT)
  // A waistcoat button or two, because he dressed for it.
  dots(c, [58, 44, 60, 58], 3, '#f7c82c')
} }
/** The mole's head. The whites of his eyes are behind his glasses for as long as he reads; `whites` leaves them out, for when the view draws them rising over the rims. */
const moleHeadWith = (whites: boolean): Art => ({ w: 112, h: 84, ax: 44, ay: 70, paint(c) {
  oval(c, 22, 20, 9, 8, MOLE); oval(c, 60, 14, 9, 8, MOLE)
  oval(c, 44, 42, 34, 29, MOLE)
  oval(c, 84, 50, 23, 10, PINK, 0.08)
  oval(c, 105, 52, 6, 6, NOSE)
  line(c, [82, 58, 70, 62], '#d8798c', 2.5)
  // Round glasses.
  c.strokeStyle = '#ffffff'; c.lineWidth = 3.5
  c.beginPath(); c.arc(44, 36, 11, 0, TAU); c.stroke()
  c.beginPath(); c.arc(69, 39, 11, 0, TAU); c.stroke()
  line(c, [55, 36, 58, 38], '#ffffff', 3.5); line(c, [33, 34, 18, 28], '#ffffff', 3)
  oval(c, 44, 36, 9, 9, 'rgba(190,230,255,0.35)'); oval(c, 69, 39, 9, 9, 'rgba(190,230,255,0.35)')
  if (whites) { oval(c, 44, 36, 4.2, 4.2, '#ffffff'); oval(c, 69, 39, 4.2, 4.2, '#ffffff') }
} })
export const moleHead = moleHeadWith(true)
export const moleHeadBare = moleHeadWith(false)
export const moleBook: Art = { w: 84, h: 62, ax: 42, ay: 56, paint(c) {
  box(c, 6, 4, 72, 46, 5, '#f07c1e')
  box(c, 10, 8, 30, 38, 2, '#f8ecd0'); box(c, 44, 8, 30, 38, 2, '#fff7e4')
  // Grains for the print: plain bars of unequal length at unequal steps, nothing that can be read or counted.
  const print = [14, 13, 21, 14, 21.5, 12, 14, 28, 17, 14, 37, 9, 48, 14, 16, 48, 20, 22, 48, 29.5, 11, 48, 36, 19]
  for (let i = 0; i < print.length; i += 3) box(c, print[i], print[i + 1], print[i + 2], 2.5, 1, '#d9c9a4')
  oval(c, 9, 48, 10, 9, PINK); oval(c, 75, 48, 10, 9, PINK)
} }
/** His bare feet; the slippers are their own sprite. */
export const moleFeet: Art = { w: 96, h: 34, ax: 48, ay: 30, paint(c) {
  oval(c, 22, 16, 15, 10, PINK); oval(c, 70, 16, 15, 10, PINK)
  oval(c, 30, 12, 6, 4, '#ffc2cd'); oval(c, 78, 12, 6, 4, '#ffc2cd')
} }

// --- The worm ---------------------------------------------------------------

/** How many boots stand in the row, and where: the worm lives in one and looks out of another. */
export const BOOTS = [
  { x: 22, tall: 44, fill: '#e83e78', sole: '#9c1f4a' },
  { x: 60, tall: 34, fill: '#f7c82c', sole: '#b8860b' },
  { x: 100, tall: 56, fill: '#2a78d6', sole: '#184a8a' },
  { x: 140, tall: 40, fill: '#2bab97', sole: '#17705f' },
  { x: 178, tall: 60, fill: '#f07c1e', sole: '#a84e08' },
  { x: 216, tall: 30, fill: '#784cc4', sole: '#48287f' },
] as const
/** The boot the worm lives in, and the one it looks out of when tapped. */
export const HOME_BOOT = 2
export const PEEK_BOOT = 4

/** The back of the boot room: a shelf of hat boxes and an umbrella on a hook. */
export const wormShelf: Art = { w: 246, h: 60, ax: 0, ay: 0, paint(c) {
  box(c, 120, 44, 112, 7, 3, '#a8642a')
  box(c, 132, 18, 34, 26, 5, '#e83e78'); box(c, 128, 12, 42, 9, 4, '#f7c82c')
  box(c, 176, 26, 26, 18, 4, '#2bab97'); box(c, 173, 21, 32, 7, 3, '#f8ecd0')
  oval(c, 218, 36, 9, 8, '#784cc4'); box(c, 209, 38, 18, 6, 2, '#784cc4')
  // The umbrella, rolled.
  line(c, [30, 10, 30, 20], '#a8642a', 4)
  poly(c, [22, 18, 38, 18, 32, 58, 28, 58], '#2a78d6')
  line(c, [30, 58, 30, 50], '#7a4a1e', 3)
} }
const paintBoot = (c: C, boot: (typeof BOOTS)[number], x: number, floor: number): void => {
  box(c, x - 12, floor - boot.tall, 24, boot.tall - 6, 6, boot.fill)
  box(c, x - 12, floor - 20, 38, 16, 8, boot.fill)
  box(c, x - 13, floor - 6, 40, 6, 3, boot.sole)
  box(c, x - 14, floor - boot.tall - 2, 28, 7, 3.5, boot.sole)
  oval(c, x - 5, floor - boot.tall + 16, 3, 7, 'rgba(255,255,255,0.45)')
}
/** The row of boots as it stands when nothing is happening to any of them, floor at the bottom edge. */
export const wormBoots: Art = { w: 246, h: 70, ax: 0, ay: 70, paint(c) {
  for (const boot of BOOTS) paintBoot(c, boot, boot.x, 70)
} }
/** Each boot by itself, its sole's middle at the anchor, for when it is worn, knocked, tipped or shrunk. */
export const boots: readonly Art[] = BOOTS.map((boot) => ({ w: 46, h: boot.tall + 6, ax: 17, ay: boot.tall + 6, paint: (c: C) => paintBoot(c, boot, 17, boot.tall + 6) }))
/** A sock for wringing, and a wet one for throwing. */
export const sock: Art = { w: 34, h: 50, ax: 14, ay: 4, paint(c) {
  box(c, 6, 3, 16, 34, 5, '#2bab97'); box(c, 6, 26, 24, 16, 8, '#2bab97'); box(c, 6, 8, 16, 5, 0, '#f7c82c')
} }
export const wormHead: Art = { w: 50, h: 50, ax: 23, ay: 30, paint(c) {
  oval(c, 23, 27, 17, 16, WORM)
  oval(c, 20, 37, 9, 3.5, '#e0607c')
  // A beret, worn well back.
  oval(c, 20, 12, 17, 6.5, '#2a78d6', -0.25); line(c, [22, 6, 25, 1], '#2a78d6', 3)
  // The polishing cloth, held in the mouth.
  poly(c, [30, 34, 48, 36, 44, 49, 32, 44], '#f7c82c')
  // The white of the eye: the view draws the pupil that moves on it.
  oval(c, 16, 24, 4.4, 4.4, '#ffffff'); oval(c, 31, 23, 4.4, 4.4, '#ffffff')
} }

// --- The badger -------------------------------------------------------------

/** The drying ground: two posts, the rope and the basket. The ground is the sprite's bottom edge. */
export const dryingLine: Art = { w: 378, h: 150, ax: 0, ay: 150, paint(c) {
  line(c, [124, 150, 124, 22], '#7a4a1e', 8); line(c, [362, 150, 362, 22], '#7a4a1e', 8)
  dots(c, [124, 22, 362, 22], 6, '#f7c82c')
  c.beginPath(); c.moveTo(124, 30); c.quadraticCurveTo(243, 44, 362, 30); c.strokeStyle = '#f8ecd0'; c.lineWidth = 3; c.stroke()
  // The basket, heaped.
  oval(c, 184, 126, 22, 12, '#f8ecd0'); oval(c, 198, 124, 14, 10, '#9fe0f5')
  box(c, 156, 124, 64, 26, 9, '#c98a3c')
  box(c, 158, 137, 60, 4, 2, '#a8642a')
  box(c, 154, 122, 68, 7, 3.5, '#a8642a')
} }
/** Where each garment hangs along the rope, measured from the sprite's left, and how far the rope has sagged there. */
export const PEGS = [{ x: 160, y: 34 }, { x: 206, y: 36 }, { x: 256, y: 37 }, { x: 314, y: 34 }] as const

const garment = (w: number, h: number, paint: (c: C) => void): Art => ({ w, h, ax: w / 2, ay: 2, paint })
export const garments: readonly Art[] = [
  // One sock, the smallest piece, nearest to her.
  garment(30, 54, (c) => {
    box(c, 6, 3, 16, 38, 5, '#2a78d6'); box(c, 6, 30, 24, 16, 8, '#2a78d6')
    box(c, 6, 9, 16, 9, 0, '#f7c82c')
    oval(c, 25, 40, 5, 6, '#f7c82c'); dots(c, [14, 4], 3, '#a8642a')
  }),
  // A very small shirt.
  garment(48, 46, (c) => {
    poly(c, [8, 4, 40, 4, 48, 20, 40, 24, 38, 44, 10, 44, 8, 24, 0, 20], '#f8ecd0')
    poly(c, [18, 4, 30, 4, 24, 14], '#e83e78'); dots(c, [24, 22, 24, 31], 2.2, '#e83e78')
    dots(c, [12, 4, 36, 4], 3, '#a8642a')
  }),
  // Long johns, striped.
  garment(46, 88, (c) => {
    poly(c, [4, 4, 42, 4, 44, 86, 28, 86, 23, 40, 18, 86, 2, 86], '#f8ecd0')
    box(c, 3, 20, 17, 16, 0, '#e83e78'); box(c, 26, 20, 17, 16, 0, '#e83e78'); box(c, 3, 58, 17, 9, 0, '#e83e78'); box(c, 26, 58, 17, 9, 0, '#e83e78')
    box(c, 3, 3, 40, 7, 2, '#e83e78'); dots(c, [10, 4, 36, 4], 3, '#a8642a')
  }),
  // A big pair of spotted pants.
  garment(78, 52, (c) => {
    c.beginPath(); c.moveTo(4, 4); c.lineTo(74, 4); c.bezierCurveTo(82, 30, 72, 50, 52, 50); c.lineTo(39, 30); c.lineTo(26, 50); c.bezierCurveTo(6, 50, -4, 30, 4, 4); c.closePath(); c.fillStyle = '#ff6fa0'; c.fill()
    dots(c, [18, 18, 36, 14, 56, 20, 26, 34, 52, 36, 66, 14, 14, 32], 3.6, '#ffffff')
    box(c, 4, 2, 70, 7, 3, '#ffffff'); dots(c, [14, 4, 64, 4], 3, '#a8642a')
  }),
]
export const badgerBody: Art = { w: 100, h: 104, ax: 50, ay: 102, paint(c) {
  oval(c, 30, 96, 17, 8, BADGER); oval(c, 68, 96, 17, 8, BADGER)
  oval(c, 50, 58, 39, 42, BADGER)
  // The apron and its pocket.
  box(c, 26, 40, 50, 52, 16, BADGER_LIGHT)
  box(c, 38, 62, 26, 18, 5, '#9fe0f5')
  // One peg and the corner of a cloth stick out of it.
  box(c, 43, 54, 5, 11, 2, '#a8642a'); oval(c, 56, 61, 5, 3.5, '#ff6fa0', -0.4)
  line(c, [30, 42, 40, 30, 60, 30, 70, 42], BADGER_LIGHT, 4)
} }
export const badgerHead: Art = { w: 96, h: 70, ax: 42, ay: 62, paint(c) {
  oval(c, 18, 14, 9, 9, BADGER); oval(c, 52, 9, 9, 9, BADGER)
  oval(c, 42, 38, 33, 25, BADGER_LIGHT)
  poly(c, [84, 50, 60, 36, 44, 30, 22, 20, 8, 30, 20, 46, 46, 44, 62, 50], BADGER_LIGHT)
  // The two dark stripes, from the nose back over the eyes.
  poly(c, [78, 42, 54, 22, 26, 12, 14, 20, 40, 30, 62, 42], BADGER)
  poly(c, [76, 52, 54, 46, 28, 48, 14, 42, 18, 54, 44, 58, 66, 58], BADGER)
  oval(c, 84, 47, 8, 7, INK)
  // A peg, held in the mouth for the next piece.
  box(c, 70, 54, 20, 6, 2, '#c98a3c')
  // The white of the eye: the view draws the pupil that moves on it.
  oval(c, 55, 29, 4.6, 4.6, '#ffffff')
} }
export const badgerArm: Art = { w: 26, h: 70, ax: 13, ay: 62, paint(c) {
  box(c, 5, 10, 16, 58, 8, BADGER)
  oval(c, 13, 11, 10, 9, '#5a5d68')
} }

// --- The sky ----------------------------------------------------------------

export const cloud: Art = { w: 160, h: 60, ax: 80, ay: 30, paint(c) {
  oval(c, 46, 38, 40, 18, '#ffffff'); oval(c, 84, 28, 38, 24, '#ffffff'); oval(c, 122, 40, 32, 16, '#ffffff')
  oval(c, 80, 46, 60, 9, '#e6f3f7')
} }
export const pinwheel: Art = { w: 76, h: 76, ax: 38, ay: 38, paint(c) {
  const fills = ['#e83e78', '#f7c82c', '#2bab97', '#f07c1e']
  for (let i = 0; i < 4; i++) {
    c.save(); c.translate(38, 38); c.rotate((i * TAU) / 4)
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, -36, 34, -22); c.quadraticCurveTo(18, -12, 0, 0); c.fillStyle = fills[i]; c.fill()
    c.restore()
  }
  oval(c, 38, 38, 5, 5, '#ffffff')
} }

// --- The case ---------------------------------------------------------------

/** A strip of the wooden frame, `w` by `h`, with its grain running the long way and a dark lip on the side that meets the glass. */
export function frameStrip(w: number, h: number, lip: 'top' | 'bottom' | 'left' | 'right'): Art {
  return { w, h, ax: 0, ay: 0, smooth: true, paint(c) {
    c.fillStyle = WOOD; c.fillRect(0, 0, w, h)
    const along = w > h
    // Grain: long pale and dark streaks, the same on every machine.
    let s = (w * 31 + h * 17) | 0
    const next = (): number => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff }
    for (let i = 0; i < 26; i++) {
      const across = next() * (along ? h : w), from = next() * (along ? w : h), far = 120 + next() * 380
      c.strokeStyle = next() < 0.5 ? 'rgba(120,70,20,0.28)' : 'rgba(255,220,160,0.25)'; c.lineWidth = 1 + next() * 2.5
      c.beginPath()
      if (along) { c.moveTo(from, across); c.bezierCurveTo(from + far / 3, across + 3, from + (far * 2) / 3, across - 3, from + far, across) }
      else { c.moveTo(across, from); c.bezierCurveTo(across + 3, from + far / 3, across - 3, from + (far * 2) / 3, across, from + far) }
      c.stroke()
    }
    // A bevel on the outside and a shadowed lip against the glass.
    const shade = (x: number, y: number, bw: number, bh: number, fill: string): void => { c.fillStyle = fill; c.fillRect(x, y, bw, bh) }
    if (lip === 'bottom') { shade(0, 0, w, 4, 'rgba(255,235,190,0.5)'); shade(0, h - 7, w, 7, 'rgba(70,36,8,0.55)') }
    if (lip === 'top') { shade(0, h - 4, w, 4, 'rgba(70,36,8,0.45)'); shade(0, 0, w, 7, 'rgba(70,36,8,0.55)') }
    if (lip === 'right') { shade(0, 0, 4, h, 'rgba(255,235,190,0.5)'); shade(w - 7, 0, 7, h, 'rgba(70,36,8,0.55)') }
    if (lip === 'left') { shade(w - 4, 0, 4, h, 'rgba(70,36,8,0.45)'); shade(0, 0, 7, h, 'rgba(70,36,8,0.55)') }
  } }
}
/** A brass screw for a corner of the frame. */
export const screw: Art = { w: 22, h: 22, ax: 11, ay: 11, smooth: true, paint(c) {
  oval(c, 11, 11, 9, 9, '#8a6a1c'); oval(c, 10, 10, 8, 8, '#e9c75a'); oval(c, 8, 8, 3, 2, '#fff1b8', -0.6)
} }
/** The pane's reflection: one slanted bar of light, soft at both ends. */
export const glare: Art = { w: 300, h: 360, ax: 0, ay: 0, smooth: true, paint(c) {
  const fade = c.createLinearGradient(0, 0, 0, 360)
  fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(0.3, 'rgba(255,255,255,0.16)'); fade.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = fade
  poly(c, [150, 0, 210, 0, 60, 360, 0, 360], 'rgba(0,0,0,0)')
  c.fillStyle = fade; c.fill()
  c.beginPath(); c.moveTo(240, 0); c.lineTo(262, 0); c.lineTo(112, 360); c.lineTo(90, 360); c.closePath(); c.fill()
} }
/** The ghost hand of the idle ladder: a pale mitten with one finger out, its tip at the anchor. */
export const hand: Art = { w: 70, h: 96, ax: 22, ay: 6, smooth: true, paint(c) {
  c.shadowColor = 'rgba(20,10,40,0.35)'; c.shadowBlur = 6
  box(c, 12, 4, 20, 54, 10, '#fff7e4')
  box(c, 10, 40, 50, 50, 18, '#fff7e4')
  oval(c, 58, 56, 9, 16, '#fff7e4', 0.5)
} }

// --- Things of the scenes ---------------------------------------------------

/** A garment as it hangs wet: the same piece, darker. */
const wet = (dry: Art): Art => ({ ...dry, paint(c) {
  dry.paint(c)
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(30,40,110,0.3)'; c.fillRect(0, 0, dry.w, dry.h); c.globalCompositeOperation = 'source-over'
} })
export const garmentsWet: readonly Art[] = garments.map(wet)
/** The badger's umbrella, open, on a long handle held by its end at the anchor: the canopy stands a sock's height above her paw. */
export const umbrella: Art = { w: 84, h: 114, ax: 42, ay: 112, paint(c) {
  line(c, [42, 20, 42, 110], '#7a4a1e', 4)
  c.beginPath(); c.moveTo(2, 34); c.bezierCurveTo(6, -6, 78, -6, 82, 34); c.quadraticCurveTo(68, 26, 62, 34); c.quadraticCurveTo(52, 26, 42, 34); c.quadraticCurveTo(32, 26, 22, 34); c.quadraticCurveTo(14, 26, 2, 34); c.closePath()
  c.fillStyle = '#2a78d6'; c.fill()
  c.beginPath(); c.moveTo(22, 34); c.bezierCurveTo(24, 6, 60, 6, 62, 34); c.quadraticCurveTo(52, 26, 42, 34); c.quadraticCurveTo(32, 26, 22, 34); c.closePath(); c.fillStyle = '#f7c82c'; c.fill()
} }
/** The spring: a bamboo pipe on a forked stick, its mouth at the anchor. */
export const spout: Art = { w: 70, h: 56, ax: 62, ay: 22, paint(c) {
  line(c, [22, 54, 22, 26], '#7a4a1e', 6); line(c, [22, 30, 14, 20], '#7a4a1e', 5); line(c, [22, 30, 30, 20], '#7a4a1e', 5)
  c.save(); c.translate(34, 20); c.rotate(0.12)
  box(c, -32, -7, 62, 14, 6, '#a9c34a'); box(c, -12, -7, 5, 14, 2, '#7f9a2c'); box(c, 26, -7, 6, 14, 3, '#5d7a1c')
  c.restore()
} }
/** How far the knob's middle is above the plug's foot, in stage units: the cord between them never stretches. */
export const CHAIN_LONG = 112
/** The bath's plug on its chain, one thing that comes up whole: the red knob at the top, the cord, and the plug with its rubber foot at the anchor. */
export const chain: Art = { w: 26, h: CHAIN_LONG + 14, ax: 13, ay: CHAIN_LONG + 13, paint(c) {
  line(c, [13, 13, 13, CHAIN_LONG + 1], '#8a8f98', 3)
  c.save(); c.translate(0, CHAIN_LONG - 2)
  poly(c, [3, 4, 23, 4, 20, 15, 6, 15], INK); box(c, 9, 0, 8, 6, 3, '#8a8f98')
  c.restore()
  oval(c, 13, 13, 12, 12, '#e8442c'); oval(c, 9, 9, 4, 3, '#ff9a80', -0.6)
} }

/** Every sprite carries its own name, for the tests that look at where things are drawn. */
export function named(arts: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(arts)) {
    if (Array.isArray(value)) value.forEach((item, i) => { if (item && typeof item === 'object' && 'paint' in item) (item as Art).name = `${name}${i}` })
    else if (value && typeof value === 'object' && 'paint' in value) (value as Art).name = name
  }
}

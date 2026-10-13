import type { Face } from './answers'
import type { Figure, Wearer } from './kinds'
import { ARMS, CREASE_Y } from './layout'
import { KEY_LINE, boundsOf, mirrored, printed, ring, round, sprite, type Pen, type PieceArt, type Ring, type Sprite } from './paper'

// The three paper figures and the dog. Each is one piece of printed paper on
// a stand, drawn round the middle of that stand, in its underclothes: the
// garments are separate paper. The printed face is the one part that moves
// by itself, and it is drawn fresh each frame (drawFace), each figure's in
// its own manner.

const stroke = (g: Pen, width = 1.6, colour = KEY_LINE): void => {
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.stroke()
}
const poly = (g: Pen, r: Ring): void => {
  g.moveTo(r[0], r[1])
  for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1])
  g.closePath()
}
const fill = (g: Pen, colour: string, ...rings: Ring[]): void => {
  g.beginPath()
  for (const r of rings) poly(g, r)
  g.fillStyle = colour
  g.fill()
}
const both = (r: Ring): Ring[] => [r, mirrored(r)]

const SKIN = { child: '#e6ae7e', grandfather: '#dba987', baby: '#efc199' }
const BLUSH = 'rgba(226, 92, 92, 0.34)'
const STAND = '#e9dfc6'

// --- The child ---------------------------------------------------------------

const CHILD_ARM = ring(46, -296, 68, -298, 114, -180, 108, -160, 90, -160, 86, -176, 46, -268)
const CHILD_LEG = ring(6, -158, 52, -158, 46, -36, 60, -8, 60, 0, 8, 0, 12, -36)
const CHILD_HAND = round(ARMS.child.hand.x, ARMS.child.hand.y, 15, 15, 8)
/** The child's ear, on the viewer's right of its head: the paper is cut round it, and it is where the child goes red. */
export const CHILD_EAR = { x: 76, y: -388, rx: 10, ry: 13 }
/** How much bigger the red of a cheek is when it is puffed out. */
export const PUFFED = 1.45
const CHILD_TRUNK: Ring[] = [round(0, -392, 75, 75, 16), ...both(round(CHILD_EAR.x, CHILD_EAR.y, CHILD_EAR.rx, CHILD_EAR.ry, 6)), ring(-15, -330, 15, -330, 17, -300, -17, -300), ring(-58, -306, 58, -306, 62, -288, 54, -150, -54, -150, -62, -288), ...both(CHILD_LEG), ring(-76, -6, 76, -6, 66, 14, -66, 14)]
const CHILD: PieceArt = {
  rings: [...CHILD_TRUNK, ...both(CHILD_ARM), ...both(CHILD_HAND)],
  colour: SKIN.child,
  shade: '#b77f52',
  flat: true,
  print: (g) => {
    // A white vest, pale shorts, striped socks and the stand.
    fill(g, '#fbf9f0', ring(-58, -306, -30, -306, -18, -288, 18, -288, 30, -306, 58, -306, 62, -288, 54, -150, -54, -150, -62, -288))
    fill(g, '#bcd4e4', ring(-56, -192, 56, -192, 54, -110, 5, -110, 0, -138, -5, -110, -54, -110))
    for (const side of [1, -1]) {
      fill(g, '#fbf9f0', ring(side * 6, -60, side * 52, -60, side * 46, -36, side * 62, -8, side * 62, 0, side * 6, 0))
      fill(g, '#d9534c', ring(side * 6, -52, side * 52, -52, side * 50, -42, side * 8, -42), ring(side * 9, -30, side * 49, -30, side * 54, -20, side * 9, -20))
    }
    fill(g, STAND, ring(-80, -6, 80, -6, 70, 16, -70, 16))
    // A mop of hair with a tuft that will not lie down.
    fill(g, '#4d3022', ring(-80, -398, -74, -444, -44, -470, 0, -474, 44, -470, 74, -442, 80, -396, 62, -424, 34, -436, 6, -428, -22, -440, -52, -422))
    fill(g, BLUSH, round(-48, -366, 12, 10, 10), round(48, -366, 12, 10, 10))
    g.beginPath()
    // The vest's hem and straps, the shorts' legs, a nose, knees and fingers.
    g.moveTo(-58, -306); g.lineTo(-30, -306); g.lineTo(-18, -288); g.lineTo(18, -288); g.lineTo(30, -306); g.lineTo(58, -306)
    g.moveTo(-56, -192); g.lineTo(56, -192)
    g.moveTo(-54, -110); g.lineTo(-5, -110); g.lineTo(0, -138); g.lineTo(5, -110); g.lineTo(54, -110)
    g.moveTo(-5, -380); g.quadraticCurveTo(0, -372, 6, -380)
    g.moveTo(-36, -92); g.quadraticCurveTo(-30, -86, -24, -92)
    g.moveTo(24, -92); g.quadraticCurveTo(30, -86, 36, -92)
    g.moveTo(-76, -6); g.lineTo(76, -6)
    g.moveTo(8, -474); g.quadraticCurveTo(20, -484, 12, -462)
    stroke(g)
  },
}

// --- The grandfather -----------------------------------------------------------

export { CREASE_Y }

const GRAND_ARM = ring(34, -486, 54, -486, 94, -290, 90, -262, 72, -262, 70, -284, 36, -440)
const GRAND_LEG = ring(2, -262, 40, -262, 36, -36, 50, -8, 50, 0, 4, 0, 8, -36)
const GRAND_HAND = round(ARMS.grandfather.hand.x, ARMS.grandfather.hand.y, 13, 13, 8)
const GRAND_TRUNK: Ring[] = [round(0, -552, 44, 50, 14), ...both(round(45, -550, 7, 11, 6)), ring(-11, -508, 11, -508, 13, -484, -13, -484), ring(-44, -490, 44, -490, 48, -470, 40, -256, -40, -256, -48, -470), ...both(GRAND_LEG), ring(-64, -6, 64, -6, 56, 14, -56, 14)]
const GRANDFATHER: PieceArt = {
  rings: [...GRAND_TRUNK, ...both(GRAND_ARM), ...both(GRAND_HAND)],
  // Long underwear from neck to ankle.
  colour: '#f1e6cc',
  shade: '#c7b58b',
  flat: true,
  print: (g) => {
    fill(g, SKIN.grandfather, round(0, -552, 46, 52, 14), ...both(round(45, -550, 9, 13, 6)), ring(-13, -510, 13, -510, 15, -488, 0, -476, -15, -488), ...both(round(82, -270, 15, 15, 8)))
    for (const side of [1, -1]) fill(g, '#7c8f5a', ring(side * 2, -54, side * 40, -54, side * 36, -36, side * 52, -8, side * 52, 0, side * 2, 0))
    fill(g, STAND, ring(-68, -6, 68, -6, 60, 16, -60, 16))
    // Two tufts of white hair and a shine of bald head between them.
    fill(g, '#f6f3ea', ring(-46, -560, -40, -584, -30, -572, -34, -548), ring(46, -560, 40, -584, 30, -572, 34, -548))
    g.beginPath()
    // Thin red stripes down the long underwear, the way the sheet was printed.
    for (let x = -84; x <= 84; x += 12) { g.moveTo(x, -480); g.lineTo(x, -60) }
    stroke(g, 1, 'rgba(201, 84, 72, 0.4)')
    g.beginPath()
    // The button flap, the cuffs, a long nose, round glasses and the stand.
    g.moveTo(0, -476); g.lineTo(0, -262)
    for (let y = -456; y <= -280; y += 44) { g.moveTo(-4, y); g.lineTo(-9, y) }
    g.moveTo(-40, -256); g.lineTo(40, -256)
    g.moveTo(2, -54); g.lineTo(40, -54); g.moveTo(-2, -54); g.lineTo(-40, -54)
    g.moveTo(-2, -552); g.quadraticCurveTo(-8, -536, 2, -536)
    g.moveTo(-64, -6); g.lineTo(64, -6)
    g.moveTo(-5, -556); g.lineTo(5, -556)
    g.moveTo(29, -556); g.lineTo(42, -560); g.moveTo(-29, -556); g.lineTo(-42, -560)
    stroke(g)
    g.beginPath()
    g.arc(17, -556, 12, 0, Math.PI * 2)
    g.moveTo(-5, -556)
    g.arc(-17, -556, 12, 0, Math.PI * 2)
    stroke(g, 2.2, '#6d5a3c')
    // The fold: a pale dashed line right across.
    g.beginPath()
    g.moveTo(-100, CREASE_Y); g.lineTo(100, CREASE_Y)
    g.setLineDash([7, 5])
    stroke(g, 1.2, 'rgba(74, 63, 58, 0.45)')
    g.setLineDash([])
  },
}

// --- The baby --------------------------------------------------------------------

const BABY_ARM = ring(58, -112, 96, -96, 108, -76, 96, -58, 60, -76)
const BABY_HAND = round(ARMS.baby.hand.x, ARMS.baby.hand.y, 15, 15, 8)
const BABY_TRUNK: Ring[] = [round(0, -182, 68, 66, 16), round(0, -72, 82, 70, 14), ...both(round(44, -12, 28, 15, 8)), ring(-92, -8, 92, -8, 64, 14, 0, 24, -64, 14)]
const BABY: PieceArt = {
  rings: [...BABY_TRUNK, ...both(BABY_ARM), ...both(BABY_HAND)],
  // A sleep suit.
  colour: '#c4e6d6',
  shade: '#86b9a2',
  flat: true,
  print: (g) => {
    fill(g, SKIN.baby, round(0, -182, 70, 68, 16), ...both(round(100, -76, 15, 15, 8)))
    fill(g, STAND, ring(-96, -8, 96, -8, 66, 16, 0, 27, -66, 16))
    fill(g, '#fbf9f0', ...both(round(44, -12, 30, 17, 8)))
    fill(g, BLUSH, round(-44, -160, 14, 11, 10), round(44, -160, 14, 11, 10))
    g.beginPath()
    // The suit's poppers and collar, one curl, and the rocker of the stand.
    g.moveTo(-34, -124); g.quadraticCurveTo(0, -104, 34, -124)
    g.moveTo(0, -112); g.lineTo(0, -16)
    g.moveTo(-92, -8); g.lineTo(92, -8)
    g.moveTo(0, -248); g.bezierCurveTo(22, -262, 26, -232, 8, -236)
    g.moveTo(14, -18); g.quadraticCurveTo(44, -30, 72, -16)
    g.moveTo(-14, -18); g.quadraticCurveTo(-44, -30, -72, -16)
    stroke(g)
    g.beginPath()
    for (let y = -96; y <= -32; y += 22) { g.moveTo(3, y); g.arc(0, y, 3, 0, Math.PI * 2) }
    stroke(g, 1.3)
  },
}

// --- The dog -----------------------------------------------------------------------

const DOG: PieceArt = {
  rings: [ring(-42, 0, 32, 0, 38, -40, 22, -86, -4, -98, -32, -82, -50, -40), ring(12, -96, 16, -130, 50, -136, 70, -118, 88, -108, 86, -92, 62, -84, 30, -78), ring(8, 2, 34, 2, 30, -54, 12, -54), ring(-56, -6, 46, -6, 40, 12, -50, 12)],
  colour: '#d7a45f',
  shade: '#9c6f33',
  flat: true,
  print: (g) => {
    fill(g, '#fbf6ea', ring(8, -84, 34, -78, 36, -30, 30, 2, 10, 2, 6, -40))
    fill(g, '#8a5a2c', ring(16, -132, 36, -134, 32, -92, 14, -90))
    fill(g, '#d9534c', ring(8, -86, 36, -80, 36, -72, 8, -78))
    fill(g, STAND, ring(-58, -6, 48, -6, 42, 14, -52, 14))
    fill(g, '#3a2e2a', round(86, -103, 5, 4, 8))
    g.beginPath()
    g.moveTo(20, 2); g.lineTo(20, -50)
    g.moveTo(-56, -6); g.lineTo(46, -6)
    g.moveTo(-30, -30); g.quadraticCurveTo(-10, -52, 6, -34)
    stroke(g)
  },
}

/** The lead the dog holds in its mouth: a separate strip, since the dog can drop it. */
const LEAD: PieceArt = { rings: [ring(-4, 0, 4, 0, 6, 50, -2, 52), round(2, 58, 9, 9, 8)], colour: '#d9534c', shade: '#9a2f2a', corner: 2, flat: true }
/** Where the lead hangs from, in the dog's mouth. */
export const LEAD_AT = { x: 74, y: -92 }

const TAIL: PieceArt = { rings: [ring(-2, 4, -30, -26, -38, -20, -10, 10)], colour: '#d7a45f', shade: '#9c6f33', corner: 4, flat: true }
/** Where the dog's tail is pinned to its body. */
export const TAIL_AT = { x: -42, y: -10 }

export type FigureSprites = {
  child: Sprite
  /** The grandfather in two halves, above and below his crease. */
  grandfatherTop: Sprite
  grandfatherLegs: Sprite
  baby: Sprite
  dog: Sprite
  /** The dog's head by itself: it comes through whatever is laid on its back, so its face is never covered. */
  dogHead: Sprite
  tail: Sprite
  lead: Sprite
  /** The baby's head by itself: it comes through a garment worn on its body, so a coat on the baby is a tent with a face in the collar. */
  babyHead: Sprite
  /** Each figure cut without its arms, for the moments an arm is lifted off the sheet: the grandfather again in his two halves. */
  armless: { child: Sprite; baby: Sprite; grandfatherTop: Sprite; grandfatherLegs: Sprite }
  /** One arm of each figure without its hand, the one on the viewer's right, where it hangs; and that hand, where it hangs. */
  arm: Record<Figure, Sprite>
  hand: Record<Figure, Sprite>
}

export function makeFigureSprites(density: number): FigureSprites {
  const whole = (art: PieceArt, seed: number) => sprite(boundsOf(art.rings), density, (g) => printed(g, art, seed))
  const half = (top: boolean, art: PieceArt = GRANDFATHER) => {
    const box = boundsOf(GRANDFATHER.rings)
    const part = top ? { ...box, y1: CREASE_Y } : { ...box, y0: CREASE_Y }
    return sprite(part, density, (g) => {
      g.beginPath()
      g.rect(part.x0 - 12, top ? part.y0 - 12 : CREASE_Y, part.x1 - part.x0 + 24, top ? CREASE_Y - part.y0 + 12 : part.y1 - CREASE_Y + 12)
      g.clip()
      printed(g, art, 31)
    })
  }
  // The same paper with other cuts: without the arms, one arm alone, one hand alone. The print is the figure's own, kept to each cut.
  const cut = (art: PieceArt, rings: Ring[]): PieceArt => ({ ...art, rings })
  const armless = { child: whole(cut(CHILD, CHILD_TRUNK), 21), baby: whole(cut(BABY, BABY_TRUNK), 41), grandfatherTop: half(true, cut(GRANDFATHER, GRAND_TRUNK)), grandfatherLegs: half(false, cut(GRANDFATHER, GRAND_TRUNK)) }
  const arm = { child: whole(cut(CHILD, [CHILD_ARM]), 22), grandfather: whole(cut(GRANDFATHER, [GRAND_ARM]), 32), baby: whole(cut(BABY, [BABY_ARM]), 42) }
  const hand = { child: whole(cut(CHILD, [CHILD_HAND]), 23), grandfather: whole(cut(GRANDFATHER, [GRAND_HAND]), 33), baby: whole(cut(BABY, [BABY_HAND]), 43) }
  const head = { x0: 8, y0: -140, x1: 92, y1: -80 }
  const dogHead = sprite(head, density, (g) => {
    g.beginPath()
    g.rect(head.x0 - 12, head.y0 - 12, head.x1 - head.x0 + 24, head.y1 - head.y0 + 10)
    g.clip()
    printed(g, DOG, 51)
  })
  const top = { x0: -72, y0: -252, x1: 72, y1: -122 }
  const babyHead = sprite(top, density, (g) => {
    g.beginPath()
    g.ellipse(0, -182, 70, 68, 0, 0, Math.PI * 2)
    g.clip()
    printed(g, BABY, 41, false)
  })
  return { armless, arm, hand, babyHead, dogHead, lead: whole(LEAD, 71), child: whole(CHILD, 21), grandfatherTop: half(true), grandfatherLegs: half(false), baby: whole(BABY, 41), dog: whole(DOG, 51), tail: whole(TAIL, 61) }
}

// --- Faces ---------------------------------------------------------------------------

type Eyes = 'open' | 'wide' | 'crossed' | 'down' | 'arcs' | 'low'
type Mouth = 'smile' | 'grin' | 'o' | 'wavy' | 'tuck' | 'tongue' | 'pout'
type Look = { eyes: Eyes; brow: number; lift: number; mouth: Mouth; blush?: boolean }

/** What each face is made of. Every figure pulls the same faces, each on its own features. */
const LOOKS: Record<Face, Look> = {
  rest: { eyes: 'open', brow: 0, lift: 0, mouth: 'smile' },
  grin: { eyes: 'open', brow: 0.15, lift: 3, mouth: 'grin' },
  oh: { eyes: 'wide', brow: 0.2, lift: 7, mouth: 'o' },
  crossed: { eyes: 'crossed', brow: -0.3, lift: 5, mouth: 'wavy' },
  chin: { eyes: 'down', brow: 0.1, lift: 2, mouth: 'tuck' },
  down: { eyes: 'down', brow: 0, lift: 0, mouth: 'smile' },
  wide: { eyes: 'wide', brow: 0.1, lift: 6, mouth: 'o' },
  tongue: { eyes: 'down', brow: 0.1, lift: 2, mouth: 'tongue' },
  cosy: { eyes: 'arcs', brow: 0.1, lift: 1, mouth: 'smile', blush: true },
  proud: { eyes: 'arcs', brow: 0.2, lift: 5, mouth: 'grin' },
  giggle: { eyes: 'arcs', brow: 0.25, lift: 4, mouth: 'grin', blush: true },
  huff: { eyes: 'low', brow: -0.4, lift: -2, mouth: 'pout', blush: true },
}

type Features = { eyeX: number; eyeY: number; eyeR: number; pupilR: number; browY: number; browW: number; browThick: number; browColour: string; mouthX: number; mouthY: number; mouthW: number; oneEye?: boolean }

const FEATURES: Record<Wearer, Features> = {
  child: { eyeX: 27, eyeY: -398, eyeR: 13, pupilR: 6.5, browY: -421, browW: 22, browThick: 3.2, browColour: '#4d3022', mouthX: 0, mouthY: -360, mouthW: 36 },
  grandfather: { eyeX: 17, eyeY: -556, eyeR: 8, pupilR: 4, browY: -574, browW: 20, browThick: 5, browColour: '#f6f3ea', mouthX: 0, mouthY: -520, mouthW: 16 },
  baby: { eyeX: 27, eyeY: -186, eyeR: 14, pupilR: 8.5, browY: -209, browW: 13, browThick: 2.4, browColour: '#8a5a3c', mouthX: 0, mouthY: -152, mouthW: 26 },
  dog: { eyeX: 50, eyeY: -116, eyeR: 6.5, pupilR: 4, browY: -127, browW: 11, browThick: 2.6, browColour: '#6b4522', mouthX: 70, mouthY: -90, mouthW: 22, oneEye: true },
}

const DARK = '#3a2a2a'
const TONGUE = '#e8707e'

/**
 * Draws a face at the pen's origin (the middle of the figure's stand). `eyeX` and `eyeY` say where the eyes
 * point, as an offset no longer than 1; `shut` is a blink. Returns how many fills and strokes it made.
 */
export function drawFace(g: Pen, who: Wearer, face: Face, eyeX: number, eyeY: number, shut: boolean): number {
  const f = FEATURES[who], look = LOOKS[face]
  const sides = f.oneEye ? [1] : [-1, 1]
  let calls = 0
  const lines = () => {
    g.strokeStyle = KEY_LINE
    g.lineWidth = who === 'grandfather' ? 1.8 : 2.4
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.stroke()
    calls += 1
  }
  const open = !shut && look.eyes !== 'arcs'
  if (open) {
    const wide = look.eyes === 'wide' ? 1.22 : 1
    g.beginPath()
    for (const side of sides) {
      const x = f.oneEye ? f.eyeX : side * f.eyeX
      g.moveTo(x + f.eyeR * wide, f.eyeY)
      g.ellipse(x, f.eyeY, f.eyeR * wide, f.eyeR * wide * (look.eyes === 'low' ? 0.62 : 1), 0, 0, Math.PI * 2)
    }
    g.fillStyle = '#fffdf7'
    g.fill()
    lines()
    calls += 1
    g.beginPath()
    for (const side of sides) {
      const x = f.oneEye ? f.eyeX : side * f.eyeX
      const room = f.eyeR * wide - f.pupilR * 0.8
      let px = eyeX * room, py = eyeY * room
      if (look.eyes === 'crossed') { px = -side * room * 0.75; py = -room * 0.55 }
      if (look.eyes === 'down') { px = eyeX * room * 0.4; py = room * 0.8 }
      if (look.eyes === 'low') py = Math.max(py, 0) * 0.5
      const r = f.pupilR * (look.eyes === 'wide' ? 0.78 : 1)
      g.moveTo(x + px + r, f.eyeY + py)
      g.arc(x + px, f.eyeY + py, r, 0, Math.PI * 2)
    }
    g.fillStyle = DARK
    g.fill()
    calls += 1
  }
  // The brows, and the eyes when they are lines: a blink, or the two arcs of a face screwed up with pleasure.
  g.beginPath()
  for (const side of sides) {
    const x = f.oneEye ? f.eyeX : side * f.eyeX
    const tip = Math.sin(look.brow) * f.browW * (face === 'crossed' ? side : 1)
    g.moveTo(x - (side * f.browW) / 2, f.browY - look.lift + tip * 0.5)
    g.lineTo(x + (side * f.browW) / 2, f.browY - look.lift - tip * 0.5)
  }
  g.strokeStyle = f.browColour
  g.lineWidth = f.browThick
  g.lineCap = 'round'
  g.stroke()
  calls += 1
  if (!open) {
    g.beginPath()
    for (const side of sides) {
      const x = f.oneEye ? f.eyeX : side * f.eyeX
      g.moveTo(x - f.eyeR, f.eyeY + 2)
      if (shut && look.eyes !== 'arcs') g.lineTo(x + f.eyeR, f.eyeY + 2)
      else g.quadraticCurveTo(x, f.eyeY - f.eyeR * 1.1, x + f.eyeR, f.eyeY + 2)
    }
    lines()
  }
  if (look.blush && who !== 'dog') {
    g.beginPath()
    // A face that huffs has its cheeks puffed out; the child, who cannot stand being hot, is red to the ears as well.
    const puff = face === 'huff' ? PUFFED : 1
    for (const side of [-1, 1]) {
      const x = side * (f.eyeX + f.eyeR * 1.5), y = f.eyeY + f.eyeR * 2.1
      g.moveTo(x + f.eyeR * 1.1 * puff, y)
      g.ellipse(x, y, f.eyeR * 1.1 * puff, f.eyeR * 0.8 * puff, 0, 0, Math.PI * 2)
      if (who === 'child' && face === 'huff') {
        g.moveTo(side * CHILD_EAR.x + CHILD_EAR.rx, CHILD_EAR.y)
        g.ellipse(side * CHILD_EAR.x, CHILD_EAR.y, CHILD_EAR.rx, CHILD_EAR.ry, 0, 0, Math.PI * 2)
      }
    }
    g.fillStyle = 'rgba(226, 80, 80, 0.5)'
    g.fill()
    calls += 1
  }
  // The mouth, on each figure's own features.
  const w = f.mouthW, mx = f.mouthX, my = f.mouthY
  if (who === 'grandfather') {
    // His mouth is his moustache: its two ends lift when he is pleased and droop when he is not.
    const liftBy = look.mouth === 'grin' || look.mouth === 'smile' ? (face === 'rest' ? 0 : -9) : look.mouth === 'pout' || look.mouth === 'wavy' ? 10 : 2
    g.beginPath()
    for (const side of [-1, 1]) {
      g.moveTo(mx, my - 6)
      g.quadraticCurveTo(mx + side * 16, my - 14, mx + side * 34, my + liftBy)
      g.quadraticCurveTo(mx + side * 16, my + 8, mx, my + 4)
    }
    g.fillStyle = '#f6f3ea'
    g.fill()
    lines()
    calls += 1
    if (look.mouth === 'o' || look.mouth === 'tongue') {
      g.beginPath()
      g.ellipse(mx, my + 12, 6, look.mouth === 'o' ? 8 : 5, 0, 0, Math.PI * 2)
      g.fillStyle = look.mouth === 'o' ? DARK : TONGUE
      g.fill()
      calls += 1
    }
    return calls
  }
  if (who === 'baby' && face === 'rest') {
    // At rest the baby has its dummy in.
    g.beginPath()
    g.arc(mx, my, 13, 0, Math.PI * 2)
    g.fillStyle = '#f2a6bd'
    g.fill()
    lines()
    calls += 1
    g.beginPath()
    g.arc(mx, my, 5, 0, Math.PI * 2)
    lines()
    return calls
  }
  const tilt = who === 'dog' ? -0.18 : 0
  g.save()
  g.translate(mx, my)
  g.rotate(tilt)
  g.beginPath()
  switch (look.mouth) {
    case 'smile':
      g.moveTo(-w / 2, 0); g.quadraticCurveTo(0, w * 0.42, w / 2, 0)
      lines()
      break
    case 'grin':
      g.moveTo(-w / 2, -2); g.quadraticCurveTo(0, w * 0.86, w / 2, -2); g.closePath()
      g.fillStyle = DARK
      g.fill()
      lines()
      calls += 1
      break
    case 'o':
      g.ellipse(0, 3, w * 0.2, w * 0.3, 0, 0, Math.PI * 2)
      g.fillStyle = DARK
      g.fill()
      calls += 1
      break
    case 'wavy':
      g.moveTo(-w / 2, 2); g.bezierCurveTo(-w / 4, -6, -w / 8, 9, 0, 2); g.bezierCurveTo(w / 8, -6, w / 4, 9, w / 2, 1)
      lines()
      break
    case 'tuck':
      g.moveTo(-w / 4, 0); g.lineTo(w / 4, 0)
      g.moveTo(-w / 3, 12); g.quadraticCurveTo(0, 18, w / 3, 12)
      lines()
      break
    case 'tongue':
      g.moveTo(-w / 2, 0); g.quadraticCurveTo(0, w * 0.3, w / 2, 0)
      lines()
      g.beginPath()
      g.moveTo(-w * 0.18, 4); g.quadraticCurveTo(-w * 0.2, w * 0.62, 0, w * 0.64); g.quadraticCurveTo(w * 0.2, w * 0.62, w * 0.18, 4); g.closePath()
      g.fillStyle = TONGUE
      g.fill()
      calls += 1
      break
    case 'pout':
      g.moveTo(-w / 3, 5); g.quadraticCurveTo(0, -6, w / 3, 5)
      lines()
      break
  }
  g.restore()
  return calls
}

/** Where each figure's face is, for the things that look at it. */
export function faceHeight(who: Wearer): number {
  return FEATURES[who].eyeY
}

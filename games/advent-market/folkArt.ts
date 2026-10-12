import { FOLK, POT, type Who } from './hall'
import { alpha, brush, candlelit, daub, dot, mix, oval, sprite, type Light, type Pen, type Sprite } from './paint'
import { makeRng } from './rng'

// The five fair-goers as paint: each a body painted once, with the parts that
// move by themselves (her fist, his bell, his moustache and hat, the pompom
// and mittens, the jaw and ears) painted apart. Every painter draws round the
// body's foot, in stage units, and is lit from the pot.

const SKIN = '#dc9c70'
const CREAM = '#e9dfc6'
const GOLD = '#dfa63a'
const VIOLET = '#7a5596'
const HIDE = '#d4c8b0'

export type FolkSprites = Record<Who, Sprite> & { fist: Sprite; bell: Sprite; moustache: Sprite; hat: Sprite; pompom: Sprite; mitten: Sprite; jaw: Sprite; ear: Sprite }

/** Where each one's own parts hang on its body, round its foot. */
export const JOINTS = {
  fist: { x: 96, y: -190 },
  bell: { x: -70, y: -470 },
  moustache: { x: -8, y: -300 },
  hat: { x: -8, y: -392 },
  pompom: { x: -2, y: -262 },
  mitten: { x: 80, y: -92 },
  /** The hinge of the goat's jaw, under its cheek. */
  jaw: { x: 52, y: -50 },
  earLeft: { x: -40, y: -118 },
  earRight: { x: 52, y: -132 },
  /** His cheeks, which puff. */
  cheeks: { x: 30, y: -378, gap: 30 },
} as const

function paintMaker(g: Pen): void {
  const rng = makeRng(11), L: Light = { x: 1, y: 0.45 }
  // The dress, the widest thing in the hall, and the far arm hanging at her side.
  daub(g, [-170, 70, -162, -120, -130, -236, -40, -274, 60, -274, 138, -236, 166, -120, 172, 70], '#6a3550', L, rng)
  daub(g, oval(-150, -150, 34, 92, rng), '#5a2c44', L, rng)
  // The apron, spotted with every wax she has dipped.
  daub(g, [-86, 70, -74, -198, 0, -214, 80, -198, 92, 70], '#d6c298', L, rng, 0.8)
  brush(g, [-62, -202, -50, -264], '#c8b488', 13)
  brush(g, [68, -202, 58, -264], '#c8b488', 13)
  for (const [x, y, r, c] of [[-40, -150, 9, GOLD], [22, -110, 12, GOLD], [-10, -40, 8, '#c8452f'], [48, -170, 7, '#5f9a4c'], [-52, -70, 10, GOLD], [40, -30, 9, GOLD], [4, -176, 6, '#c8452f']] as const) dot(g, x, y, r, c)
  // The head, sunk into the shoulders: rosy cheeks, a round nose, grey hair under a flat black hat.
  daub(g, oval(-68, -348, 24, 30, rng), '#9a9186')
  daub(g, oval(86, -348, 22, 28, rng), '#9a9186')
  daub(g, oval(8, -318, 84, 76, rng), SKIN, L, rng)
  dot(g, -36, -296, 18, '#d6735c')
  dot(g, 54, -296, 18, '#d6735c')
  daub(g, oval(10, -304, 17, 15, rng), '#c97a5a', L, rng)
  daub(g, oval(6, -384, 106, 18, rng), '#2b3328', L, rng)
  daub(g, [-52, -386, -46, -420, 58, -420, 64, -386], '#2b3328', L, rng)
  // The fat candle stub that burns on her hat.
  daub(g, [-18, -416, -18, -436, 4, -440, 26, -436, 26, -416], '#f4d48a', L, rng)
  brush(g, [-14, -430, -16, -412], '#fff0c0', 6)
  brush(g, [4, -440, 4, -446], '#3a2a1c', 2.5)
}

/** Her forearm and her huge open hand, held out toward the pot. The handle is the elbow. */
function paintFist(g: Pen): void {
  const rng = makeRng(12), L: Light = { x: 1, y: 0.5 }
  brush(g, [-20, -14, 30, 12], '#6a3550', 58)
  daub(g, oval(66, 30, 42, 36, rng, 0.3), SKIN, L, rng)
  for (let k = 0; k < 4; k++) daub(g, oval(48 + k * 15, 0 - k * 2, 9, 17, rng, 0.2), mix(SKIN, '#f0c098', 0.4), L, rng, 0.6)
  daub(g, oval(32, 40, 12, 20, rng, -0.8), SKIN, L, rng, 0.6)
}

function paintTuba(g: Pen): void {
  const rng = makeRng(21), L: Light = { x: 1, y: 0.4 }
  // The tube that goes up behind him to the bell.
  brush(g, [-40, -150, -92, -260, -74, -430], mix(GOLD, '#6a4416', 0.3), 24)
  // A long thin coat, buttoned to the neck in gold.
  daub(g, [-74, 70, -82, -290, -48, -346, 70, -346, 98, -290, 90, 70], '#2a4a34', L, rng)
  brush(g, [12, -338, 16, 60], alpha('#12241a', 0.7), 5)
  for (let k = 0; k < 5; k++) dot(g, 34, -306 + k * 52, 8, GOLD)
  daub(g, oval(86, -330, 28, 11, rng), GOLD, L, rng, 0.7)
  // A long face with a long nose, under a band cap with a plume.
  daub(g, oval(32, -398, 52, 70, rng), '#d4a47e', L, rng)
  brush(g, [36, -394, 68, -376, 50, -366], '#bd8562', 13)
  daub(g, [-18, -450, -14, -522, 82, -522, 86, -450], '#22334a', L, rng)
  brush(g, [-16, -458, 84, -458], GOLD, 9)
  daub(g, oval(62, -446, 42, 9, rng), '#141c28')
  brush(g, [34, -522, 28, -562, 48, -580], CREAM, 12)
  // The tuba: the tube round his body, three valves, and his hand on them.
  brush(g, [66, -352, 122, -330, 132, -220, 72, -128, -40, -150], GOLD, 24)
  brush(g, [70, -356, 120, -336, 126, -226], mix(GOLD, '#fff0b0', 0.6), 6)
  daub(g, oval(60, -352, 12, 9, rng), mix(GOLD, '#fff0b0', 0.4))
  for (let k = 0; k < 3; k++) brush(g, [98 + k * 12, -276 + k * 22, 108 + k * 12, -262 + k * 22], mix(GOLD, '#fff0b0', 0.5), 9)
  daub(g, oval(122, -238, 24, 19, rng, 0.4), '#d4a47e', L, rng, 0.7)
}

/** The bell of the tuba, turned to the child and empty. The handle is its middle. */
function paintBell(g: Pen): void {
  const rng = makeRng(22), L: Light = { x: 1, y: 0.5 }
  daub(g, oval(0, 0, 84, 76, rng, 0, 14), GOLD, L, rng)
  daub(g, oval(5, 3, 60, 54, rng, 0, 12), '#8a5a1e', L, rng, 0.7)
  daub(g, oval(9, 6, 30, 27, rng), '#33200c')
  brush(g, [-62, -36, -30, -62, 10, -70], mix(GOLD, '#fff0b0', 0.7), 7)
}

function paintBaker(g: Pen): void {
  const rng = makeRng(31), L: Light = { x: -1, y: 0.45 }
  // A round white belly, the far arm at his side, and three buttons that do not quite line up.
  daub(g, oval(136, -150, 36, 90, rng), '#d8ccb0', L, rng)
  daub(g, oval(0, -128, 160, 190, rng, 0, 14), '#e6dabe', L, rng)
  for (const [bx, by] of [[18, -206], [34, -146], [22, -84]] as const) dot(g, bx, by, 8, '#b9a888')
  // The near arm, and a floury hand cupped out toward the pot.
  brush(g, [-104, -214, -150, -186], '#e6dabe', 50)
  daub(g, oval(-166, -172, 32, 25, rng, -0.3), SKIN, L, rng, 0.8)
  for (let k = 0; k < 4; k++) daub(g, oval(-190 + k * 3, -192 + k * 13, 15, 8, rng, -0.2), mix(SKIN, '#f0c098', 0.4), L, rng, 0.5)
  for (const [x, y, r] of [[-176, -180, 6], [-160, -166, 5], [-150, -182, 4]] as const) dot(g, x, y, r, '#f6f0e0')
  // The red neckerchief, and a head that is mostly cheeks and nose.
  daub(g, [-58, -272, 40, -272, 30, -236, -8, -206, -44, -236], '#c23a2a', L, rng)
  daub(g, oval(-8, -332, 78, 72, rng), '#e3a476', L, rng)
  dot(g, -52, -314, 21, '#d9553f')
  dot(g, 36, -314, 21, '#d9553f')
  daub(g, oval(-8, -322, 19, 17, rng), '#cf3f2c', L, rng)
  // Flour on his shoulders.
  for (const [x, y, r] of [[-96, -250, 9], [-70, -262, 6], [84, -254, 8], [60, -40, 12], [-40, -60, 9]] as const) dot(g, x, y, r, alpha('#fbf6ea', 0.7))
}

/** His moustache, which twitches. The handle is under his nose. */
function paintMoustache(g: Pen): void {
  const c = '#3a2418'
  brush(g, [0, 0, -24, 8, -50, -6, -58, -20], c, 15)
  brush(g, [0, 0, 24, 8, 50, -6, 58, -20], c, 15)
  brush(g, [-12, 3, -30, 6], mix(c, '#8a6040', 0.6), 4)
}

/** His tall hat, which flops. The handle is the middle of its band. */
function paintHat(g: Pen): void {
  const rng = makeRng(33), L: Light = { x: -1, y: 0.5 }
  const c = '#efe6d0'
  daub(g, oval(-38, -74, 48, 46, rng), c, L, rng)
  daub(g, oval(40, -64, 44, 42, rng), c, L, rng)
  daub(g, oval(6, -96, 56, 50, rng), c, L, rng)
  daub(g, [-64, 6, -62, -30, 62, -30, 64, 6], mix(c, '#b9a888', 0.25), L, rng, 0.7)
}

function paintBundle(g: Pen): void {
  const rng = makeRng(41), L: Light = { x: -1, y: 0.2 }
  // Boots that dangle over the counter's edge, and a coat far too big.
  daub(g, oval(-38, 20, 25, 17, rng), '#3a2a22', L, rng)
  daub(g, oval(40, 20, 25, 17, rng), '#3a2a22', L, rng)
  daub(g, [-90, 10, -98, -66, -66, -146, 0, -168, 66, -146, 98, -66, 90, 10], '#2f7480', L, rng)
  // One big horn button holds the coat shut: a plain disc with a small shine near its upper edge, and no hole in it.
  // A line under it would be a smile, and a dot in its middle a target.
  dot(g, 0, -56, 13, CREAM)
  dot(g, -5, -62, 3.5, mix(CREAM, '#ffffff', 0.6))
  // The scarf, wound up to the eyes, and its tail, which ends in the scarf's other colour: one end, not stripes.
  brush(g, [44, -122, 68, -70, 58, -28], CREAM, 26)
  brush(g, [60, -44, 58, -28], VIOLET, 26)
  brush(g, [-70, -126, 0, -112, 70, -126], CREAM, 32)
  brush(g, [-66, -150, 0, -138, 66, -150], VIOLET, 26)
  // All that shows of the face, under a knitted hood.
  daub(g, oval(-4, -170, 54, 26, rng), '#e8b088', L, rng, 0.6)
  daub(g, [-68, -180, -66, -224, -32, -252, 24, -252, 60, -224, 64, -180, 0, -196], VIOLET, L, rng)
  brush(g, [-64, -186, 0, -200, 62, -186], CREAM, 15)
}

function paintPompom(g: Pen): void {
  const rng = makeRng(42)
  dot(g, 0, 0, 23, CREAM)
  for (let k = 0; k < 14; k++) {
    const a = rng.next() * Math.PI * 2
    brush(g, [Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * 26, Math.sin(a) * 26], mix(CREAM, k % 2 ? '#fff8e6' : '#b8a888', 0.5), 5)
  }
}

/** A tiny mitten, held up. The handle is its middle. */
function paintMitten(g: Pen): void {
  const rng = makeRng(43)
  daub(g, oval(0, -4, 19, 24, rng), VIOLET, { x: -1, y: 0.2 }, rng)
  daub(g, oval(-17, 2, 8, 11, rng, 0.5), VIOLET)
  brush(g, [-15, 20, 15, 20], CREAM, 11)
}

function paintGoat(g: Pen): void {
  const rng = makeRng(51), L: Light = { x: 1, y: 0.1 }
  // It stands at the end of the counter, its body out of sight: a thick neck reaches in from the edge to the head.
  daub(g, [-290, -4, -290, -176, -170, -170, -70, -150, 4, -128, 20, -84, -8, -44, -110, -16], '#b5a88e', L, rng)
  // Fur along the neck, soft and in its own colour.
  for (let k = 0; k < 7; k++) brush(g, [-262 + k * 34, -150 + (k % 2) * 20, -240 + k * 34, -100 + (k % 2) * 24], mix('#b5a88e', k % 2 ? '#a29478' : '#c8bca2', 0.6), 16)
  brush(g, [-14, -144, -42, -180, -78, -186], '#8d7858', 16)
  brush(g, [20, -148, 6, -190, -22, -208], '#9c8766', 15)
  daub(g, oval(8, -98, 66, 52, rng), HIDE, L, rng)
  daub(g, oval(88, -70, 52, 31, rng, 0.2), '#e8dfcc', L, rng)
  daub(g, oval(128, -80, 15, 11, rng, 0.2), '#a3705e')
  dot(g, 124, -84, 2.6, '#4a2c22')
  dot(g, 134, -78, 2.6, '#4a2c22')
}

/**
 * The goat's lower jaw with its beard, and the fir twig it is already chewing. The handle is the hinge: the jaw
 * swings open about it. It is stamped under the head, so shut it lies behind the muzzle and open it drops below.
 */
function paintJaw(g: Pen): void {
  const rng = makeRng(52), L: Light = { x: 1, y: 0.2 }
  daub(g, [-4, -12, 44, -16, 82, -12, 90, 0, 76, 13, 28, 16, -4, 8], '#d9cfba', L, rng, 0.6)
  // A short beard under the chin, its tip green from what it has been eating.
  daub(g, [40, 10, 72, 8, 68, 30, 56, 44, 46, 28], '#bfb298', L, rng, 0.6)
  dot(g, 56, 38, 5, '#7da262')
  dot(g, 70, -12, 4.5, '#f6f0dc')
  dot(g, 80, -11, 4.5, '#f6f0dc')
  brush(g, [80, -4, 124, -16], '#2d5a3a', 5)
  for (let k = 0; k < 5; k++) brush(g, [90 + k * 8, -8 - k * 2.4, 96 + k * 8, -20 - k * 2 + (k % 2) * 16], '#3f7a4a', 3)
}

/** One ear. The handle is its root; the other ear is this one turned over. */
function paintEar(g: Pen): void {
  const rng = makeRng(53)
  daub(g, [0, -8, -30, -16, -70, 2, -36, 18, 0, 10], '#beb198', { x: 1, y: 0.1 }, rng, 0.7)
  brush(g, [-12, 2, -48, 4], '#c99a8a', 7)
}

/** A painter for every sprite of the five, at one density, each lit from where the bench is beside it. The view runs them all at once on load and a few a frame after that. */
export function folkPainters(density: number): Record<keyof FolkSprites, () => Sprite> {
  const lit = (who: Who, w: number, h: number, ox: number, oy: number, paint: (g: Pen) => void, reach: number) => (): Sprite =>
    sprite(w, h, ox, oy, density, (g) => {
      paint(g)
      candlelit(g, POT.x - FOLK[who].x, POT.y - 60 - FOLK[who].foot, reach)
    })
  const part = (who: Who, at: { x: number; y: number }, w: number, h: number, ox: number, oy: number, paint: (g: Pen) => void, reach: number) => (): Sprite =>
    sprite(w, h, ox, oy, density, (g) => {
      paint(g)
      candlelit(g, POT.x - FOLK[who].x - at.x, POT.y - 60 - FOLK[who].foot - at.y, reach)
    })
  return {
    maker: lit('maker', 370, 540, 186, 462, paintMaker, 600),
    tuba: lit('tuba', 260, 670, 110, 592, paintTuba, 760),
    baker: lit('baker', 412, 500, 230, 420, paintBaker, 600),
    bundle: lit('bundle', 216, 310, 108, 266, paintBundle, 760),
    goat: lit('goat', 440, 264, 290, 228, paintGoat, 700),
    fist: part('maker', JOINTS.fist, 170, 130, 54, 50, paintFist, 600),
    bell: part('tuba', JOINTS.bell, 190, 174, 95, 87, paintBell, 800),
    moustache: part('baker', JOINTS.moustache, 140, 50, 70, 32, paintMoustache, 600),
    hat: part('baker', JOINTS.hat, 190, 170, 95, 156, paintHat, 640),
    pompom: part('bundle', JOINTS.pompom, 64, 64, 32, 32, paintPompom, 800),
    mitten: part('bundle', JOINTS.mitten, 60, 66, 32, 34, paintMitten, 760),
    jaw: part('goat', JOINTS.jaw, 150, 90, 14, 30, paintJaw, 700),
    ear: part('goat', JOINTS.earLeft, 90, 50, 78, 24, paintEar, 700),
  }
}

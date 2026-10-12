import { blank, box, fromRows, outlined, oval, peak, put, stamp, type Plaque } from './beads'
import type { BeadKey } from './palette'

// Every character, as plaques of fused beads joined like a cut-out puppet: a
// figure is a few flat plaques, each turning about one joint. Nothing here
// draws; the view stands the plaques on the board and motion.ts moves the
// joints. A character has a dark line round every plaque, so its shape reads
// from across a room; the setting (scenery.ts) has none and stays quieter.
//
// Lengths are in pegs. A figure's origin is the middle of its feet on the
// board: x to the right, y up, z towards the child. Every plaque stands
// upright and faces the child, or lies flat on the board, and each has a
// layer of its own, so no two ever share a place however their joints turn
// and none ever passes through another: they only slide past, each in its
// own plane, like the pieces of a toy theatre.

/** An eye: a block of two by two pegs in a plaque. The view recolours it to look about and to blink. */
export type Eye = {
  /** The top left peg of the block, in the plaque's own pegs. */
  x: number
  y: number
  /** The colour round the pupil. */
  white: BeadKey
  /** The colour of the lid, which is the fur round the eye. */
  lid: BeadKey
}

export type Part = {
  name: string
  plaque: Plaque
  /** The joint the plaque turns about, in its own pegs from its top left. */
  pivot: readonly [number, number]
  /** Where that joint sits in the figure at rest. */
  at: readonly [number, number, number]
  /** Radians the plaque is turned at rest, anticlockwise as the child sees it. */
  turn?: number
  eyes?: readonly Eye[]
  /** The plaque lies on the board, its top row away from the child; `at` is then its joint's place right, above the board and towards the child. */
  flat?: boolean
  /** Not shown at rest: a motion shows it when the state of play calls for it. */
  hidden?: boolean
  /** Loose beads laid on another plaque (mud, burrs, drops), which need not hang together. */
  loose?: boolean
}

export type Figure = {
  name: string
  parts: readonly Part[]
}

/** What one eye shows: the colour of each of its four pegs, row by row from the top left. `lookX` and `lookY` are -1, 0 or 1. */
export function eyeKeys(eye: Eye, lookX: number, lookY: number, shut: boolean): readonly [BeadKey, BeadKey, BeadKey, BeadKey] {
  if (shut) return [eye.lid, eye.lid, 'K', 'K']
  // The pupil sits in one peg of the four: the side it looks to, and the lower row unless it looks up.
  const right = lookX > 0, top = lookY > 0
  const pupil = (top ? 0 : 2) + (right ? 1 : 0)
  const keys: [BeadKey, BeadKey, BeadKey, BeadKey] = [eye.white, eye.white, eye.white, eye.white]
  keys[pupil] = 'K'
  return keys
}

const line = (plaque: Plaque): Plaque => outlined(plaque, 'K')

// --- The fox ---------------------------------------------------------------

const FOX_FACE = line(fromRows([
  '.O...........O.',
  'OOO.........OOO',
  'OPOO.......OOPO',
  'OPOOO.....OOOPO',
  'OOOOOOOOOOOOOOO',
  'OOOOOOOOOOOOOOO',
  'OOWWOOOOOOOWWOO',
  'OOWWOOOOOOOWWOO',
  'WWOOOOOOOOOOOWW',
  'WWWWOOKKKOOWWWW',
  '.WWWWWWKWWWWWW.',
  '..WWWWWWWWWWW..',
]))

const FOX_NAPE = line(fromRows([
  '.K...........K.',
  'KKK.........KKK',
  'OKKO.......OKKO',
  'OOKOO.....OOKOO',
  'OOOOOOOOOOOOOOO',
  'OOOOOOOOOOOOOOO',
  'OOOOOOOOOOOOOOO',
  'OOOOOOOOOOOOOOO',
  'oOOOOOOOOOOOOOo',
  'ooOOOOOOOOOOOoo',
  '.oOOOOOOOOOOOo.',
  '..OOOOOOOOOOO..',
]))

const FOX_CHEST = line(fromRows([
  '..OOOOO..',
  '.OOWWWOO.',
  'OOWWWWWOO',
  'OOWWWWWOO',
  'OOWWWWWOO',
  'OOWWWWWOO',
  'OOOWWWOOO',
  'OOOOOOOOO',
  '.OOOOOOO.',
]))

/** Its back, with a paler saddle that runs down to a point on one side: a patch of fur, and no sign. */
const FOX_BACK = line(fromRows([
  '..OOOOO..',
  '.OOOOOOO.',
  'OOoooOOOO',
  'OOooooOOO',
  'OOOoooOOO',
  'OOOOooOOO',
  'OOOOOoOOO',
  'OOOOOOOOO',
  '.OOOOOOO.',
]))

const FOX_LEG = line(fromRows(['OOO', 'OOO', 'OOO', 'KKK', 'KKK', 'KKK']))
const FOX_ARM = line(fromRows(['OO', 'OO', 'OO', 'OO', 'KK', 'KK']))

const FOX_TAIL = line(fromRows([
  '....W....',
  '...WWW...',
  '..WWWWW..',
  '..WWWWW..',
  '.OWWWWWO.',
  '.OOOWOOO.',
  'OOOOOOOOO',
  'OOOOOOOOO',
  'OOOOOOOOO',
  '.OOOOOOO.',
  '.OOOOOOO.',
  '..OOOOO..',
  '...OOO...',
  '...OOO...',
]))

/** The fox tucked into a ball, for a roll: one plaque that spins. */
const FOX_BALL = line((() => {
  const ball = blank(13, 13)
  oval(ball, 6, 6, 6.4, 6.4, 'O')
  // A white tail tip and a black sock go round with it, so the spin shows.
  oval(ball, 3, 3, 2.2, 2.2, 'W')
  box(ball, 8, 9, 10, 10, 'K')
  oval(ball, 9, 4, 1.6, 1.6, 'o')
  return ball
})())

const FOX_EYES: readonly Eye[] = [{ x: 3, y: 7, white: 'W', lid: 'O' }, { x: 12, y: 7, white: 'W', lid: 'O' }]

/** The same ball after the mud, and after the thorns. */
const FOX_BALL_MUD = line((() => {
  const ball = blank(13, 13)
  oval(ball, 6, 6, 6.4, 6.4, 'B')
  oval(ball, 3, 3, 2.2, 2.2, 'T')
  box(ball, 8, 9, 10, 10, 'D')
  oval(ball, 9, 4, 1.6, 1.6, 'O')
  return ball
})())

const FOX_BALL_BURRS = line((() => {
  const ball = blank(13, 13)
  oval(ball, 6, 6, 6.4, 6.4, 'O')
  oval(ball, 3, 3, 2.2, 2.2, 'W')
  for (const [x, y] of [[6, 1], [10, 3], [11, 7], [9, 11], [5, 11], [1, 8], [2, 5], [6, 6], [8, 5], [4, 8]]) put(ball, x, y, (x + y) % 2 === 0 ? 'D' : 'T')
  return ball
})())

/** The crumbs of a cake: on the bear's plate when it has eaten, and on the fox's hands when the cake is all gone. */
const CRUMBS = fromRows(['.y..p.y..', 'p..y...p.'])

/** What a lap leaves on the fox: mud on its legs and belly, burrs in its fur, drops flying off it, a hat of leaves. Loose beads, laid on the fox on whichever side the child sees. */
const FOX_MUD = fromRows(['....B....', '..B...D..', '.........', '.B..D..B.', '...B.B...', '.D.....D.', '.BD...DB.', 'DDB...BDD'])
const FOX_BURRS = fromRows(['.D.....T.', '....D....', '.T.....D.', '...D.T...'])
const FOX_DROPS = fromRows(['u.................u', '...................', '.u...............u.', '...................', 'u.................u', '...................', '..u.............u..'])
const FOX_HAT = fromRows(['...l.G...', '..GGGlG..', '.GlGGGGG.', '..GGgGG..'])

/**
 * The fox. It has a face side and a back side: `face` and `chest` show when it is turned to the child, `nape`
 * and `back` when it is turned to the trail, and the view swaps them at the moment the turning plaque is edge on.
 * The tail hangs on the side that is away from the child's view of the face, so it lies over the back. Each mark
 * is there twice, once for each side.
 */
export const FOX: Figure = {
  name: 'fox',
  parts: [
    { name: 'legLeft', plaque: FOX_LEG, pivot: [2.5, 1], at: [-3, 7, -1.6] },
    { name: 'legRight', plaque: FOX_LEG, pivot: [2.5, 1], at: [3, 7, -2] },
    { name: 'chest', plaque: FOX_CHEST, pivot: [5.5, 10], at: [0, 6, 0] },
    { name: 'back', plaque: FOX_BACK, pivot: [5.5, 10], at: [0, 6, 0] },
    { name: 'mudFront', plaque: FOX_MUD, pivot: [4.5, 8], at: [0, 1, 0.6], hidden: true, loose: true },
    { name: 'mudBack', plaque: FOX_MUD, pivot: [4.5, 8], at: [0, 1, -0.6], hidden: true, loose: true },
    { name: 'burrsFront', plaque: FOX_BURRS, pivot: [4.5, 4], at: [0, 8, 1], hidden: true, loose: true },
    { name: 'burrsBack', plaque: FOX_BURRS, pivot: [4.5, 4], at: [0, 8, -1], hidden: true, loose: true },
    { name: 'armLeft', plaque: FOX_ARM, pivot: [2, 1], at: [-6, 14, 1.6], turn: -0.25 },
    { name: 'armRight', plaque: FOX_ARM, pivot: [2, 1], at: [6, 14, 2], turn: 0.25 },
    { name: 'face', plaque: FOX_FACE, pivot: [8.5, 13], at: [0, 15, 3.2], eyes: FOX_EYES },
    { name: 'nape', plaque: FOX_NAPE, pivot: [8.5, 13], at: [0, 15, 3.2] },
    { name: 'tail', plaque: FOX_TAIL, pivot: [5.5, 15], at: [0, 8, -3.2], turn: -0.5 },
    { name: 'hatFront', plaque: FOX_HAT, pivot: [4.5, 4], at: [0, 24, 3.8], hidden: true, loose: true },
    { name: 'hatBack', plaque: FOX_HAT, pivot: [4.5, 4], at: [0, 24, -3.8], hidden: true, loose: true },
    { name: 'dropsFront', plaque: FOX_DROPS, pivot: [9.5, 7], at: [0, 14, 4.4], hidden: true, loose: true },
    { name: 'dropsBack', plaque: FOX_DROPS, pivot: [9.5, 7], at: [0, 14, -4.4], hidden: true, loose: true },
    // The crumbs of a cake that is all gone, on the hands it holds out: the bear licks them off.
    { name: 'crumbs', plaque: CRUMBS, pivot: [4.5, 2], at: [0, 17, 4.9], hidden: true, loose: true },
    { name: 'ball', plaque: FOX_BALL, pivot: [7.5, 7.5], at: [0, 7.5, 0], hidden: true },
    { name: 'ballMud', plaque: FOX_BALL_MUD, pivot: [7.5, 7.5], at: [0, 7.5, 0], hidden: true },
    { name: 'ballBurrs', plaque: FOX_BALL_BURRS, pivot: [7.5, 7.5], at: [0, 7.5, 0], hidden: true },
  ],
}

// --- The goose -------------------------------------------------------------

const GOOSE_BODY = line(fromRows([
  '..........WWW...',
  '.......WWWWWWW..',
  '.....WWWWWWWWWW.',
  '...WWWWWWWWWWWW.',
  '..WWWWWWWWWWWWW.',
  '.WWWWWWWaaaWWWW.',
  '.WWWWWWaaaaaWWW.',
  '..WWWWWWaaaWWW..',
  '...WWWWWWWWWW...',
  '....WWWWWWWW....',
]))

const GOOSE_NECK = line(fromRows([
  '..WWWW..',
  '.WWKWWW.',
  'OOOWWWW.',
  'OOWWWWW.',
  '...WWWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWWW',
  '....WWWW',
  '.....WWW',
]))

/** The same neck with the beak wide open, shown for a honk. */
const GOOSE_HONK = line(fromRows([
  'OOWWWW..',
  'OWWKWWW.',
  '.RRWWWW.',
  'OOWWWWW.',
  'OO.WWWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWWW',
  '....WWWW',
  '.....WWW',
]))

const GOOSE_WING = line(fromRows([
  'aaaa....',
  'aaaaaa..',
  'WaaaaaaW',
  '.WWaaaWW',
  '..WWWWW.',
]))

/** Her two feet, webbed, soles up: tucked under her on the nest and seen only when she is knocked off it. */
const GOOSE_FEET = fromRows([
  'OOO.OOO',
  'OOO.OOO',
  '.O...O.',
  '.O...O.',
  '.O...O.',
  '.O...O.',
])

/** Her nest, lying flat on the board: a ring of twigs with straw in it. */
const GOOSE_NEST = (() => {
  const nest = blank(22, 13)
  oval(nest, 10.5, 6, 10.6, 6.2, 'B')
  oval(nest, 10.5, 6, 7.6, 3.8, 'T')
  for (let x = 1; x < 21; x += 3) put(nest, x, 6 + ((x % 2) * 2 - 1) * 4, 'D')
  for (let x = 5; x < 17; x += 2) put(nest, x, 5 + (x % 3), 't')
  return nest
})()

const GOOSE_EGG = fromRows(['.WW.', 'WWWW', 'WWWW', '.WW.'])

/** The neck with a tier of cake in the beak. */
const GOOSE_FULL = line(fromRows([
  'PPWWWW..',
  'PPWKWWW.',
  'OOOWWWW.',
  'OOWWWWW.',
  '...WWWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWW.',
  '....WWWW',
  '....WWWW',
  '.....WWW',
]))

/** The goose on her nest in the middle lane, in profile, looking to the left of the trail. */
export const GOOSE: Figure = {
  name: 'goose',
  parts: [
    { name: 'body', plaque: GOOSE_BODY, pivot: [9, 11], at: [1, 5, 0] },
    { name: 'neck', plaque: GOOSE_NECK, pivot: [6.5, 13], at: [-4, 12, 1.6] },
    { name: 'honk', plaque: GOOSE_HONK, pivot: [6.5, 13], at: [-4, 12, 1.6], hidden: true },
    { name: 'full', plaque: GOOSE_FULL, pivot: [6.5, 13], at: [-4, 12, 1.6], hidden: true },
    { name: 'wing', plaque: GOOSE_WING, pivot: [1.5, 2], at: [1, 10, 3.2] },
    { name: 'feet', plaque: GOOSE_FEET, pivot: [3.5, 6], at: [-5, 7, 2.4], hidden: true, loose: true },
  ],
}

/** What stays behind when she rides off: the nest, flat on the board, and the egg she was sitting on. */
export const NEST: Figure = {
  name: 'nest',
  parts: [
    { name: 'nest', plaque: GOOSE_NEST, pivot: [11, 6.5], at: [0, 0.31, 0], flat: true },
    { name: 'egg', plaque: GOOSE_EGG, pivot: [2, 2], at: [0, 0.38, 0], flat: true, hidden: true },
  ],
}

// --- The five who wait at the clearing --------------------------------------

const BEAR_HEAD = line((() => {
  const head = fromRows([
    '.....................',
    '.....................',
    '.....................',
    '.....................',
    '.....................',
    '...BB..........BB....',
    '..BBBB........BBBB...',
    '..BPPBBBBBBBBBBPPB...',
    '..BBBBBBBBBBBBBBBB...',
    '..BBBBBBBBBBBBBBBB...',
    '..BBWWBBBBBBBBWWBB...',
    '..BBWWBBBBBBBBWWBB...',
    '..BBBBBCCCCCCBBBBB...',
    '..BBBBCCCKKCCCBBBB...',
    '..BBBBCCCCCCCCBBBB...',
    '...BBBCCKCCKCCBBB....',
    '....BBBCCKKCCBBB.....',
    '.....BBBBBBBBBB......',
  ])
  // A party hat, tipped to one side.
  peak(head, 12, 0, 6, 3, 'R')
  for (let y = 1; y <= 6; y += 2) for (let x = 9; x <= 15; x++) if (head.cells[y * head.w + x] !== 0) put(head, x, y, 'Y')
  put(head, 12, 0, 'W')
  return head
})())

const BEAR_BODY = line((() => {
  const body = blank(24, 20)
  oval(body, 11.5, 10, 11.5, 10, 'B')
  oval(body, 11.5, 11, 6.5, 7, 'C')
  oval(body, 4, 18, 3.6, 2, 'D')
  oval(body, 19, 18, 3.6, 2, 'D')
  return body
})())

/** The bear's arm with the empty plate it holds out. */
const BEAR_PLATE = line(fromRows([
  '.aaaaaaaaaaaa.',
  'WWWWWWWWWWWWWW',
  '.aaWWWWWWWWaa.',
  '.....BBBB.....',
  '.....BBBB.....',
  '.....BBBB.....',
  '.....BBBB.....',
  '.....BBBB.....',
]))

const tier = (wide: number, key: BeadKey, top: BeadKey): Plaque => {
  const cake = blank(wide, 3)
  box(cake, 0, 0, wide - 1, 2, key)
  box(cake, 0, 0, wide - 1, 0, top)
  for (let x = 1; x < wide; x += 3) put(cake, x, 1, top)
  return line(cake)
}

/** The three tiers of the cake: the widest at the bottom. The same plaques are the cake the fox carries. */
export const TIERS: readonly Plaque[] = [tier(11, 'p', 'W'), tier(9, 'y', 'W'), tier(7, 'P', 'W')]
export const TIER_MUD: Plaque = tier(7, 'B', 'D')

const BEAR_EYES: readonly Eye[] = [{ x: 5, y: 11, white: 'W', lid: 'B' }, { x: 15, y: 11, white: 'W', lid: 'B' }]

export const BEAR: Figure = {
  name: 'bear',
  parts: [
    { name: 'body', plaque: BEAR_BODY, pivot: [13, 21], at: [0, 0, 0] },
    { name: 'head', plaque: BEAR_HEAD, pivot: [11, 18], at: [0, 17, 1.6], eyes: BEAR_EYES },
    { name: 'plate', plaque: BEAR_PLATE, pivot: [8, 9], at: [9, 10, 3.2], turn: -0.35 },
    { name: 'crumbs', plaque: CRUMBS, pivot: [4.5, 2], at: [9, 19, 4.8], hidden: true, loose: true },
  ],
}

const FROG_HEAD = line(fromRows([
  '..GGG......GGG..',
  '.GWWGG....GGWWG.',
  '.GWWGGGGGGGGWWG.',
  '.GGGGGGGGGGGGGG.',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGG',
  'GKGGGGGGGGGGGGKG',
  'GGKKKKKKKKKKKKGG',
  '.GGGllllllllGGG.',
  '..GGllllllllGG..',
  '..GGGllllllGGG..',
  '..GGGGGGGGGGGG..',
]))

const FROG_ARM = line(fromRows(['GG', 'GG', 'GG', 'GG', 'll', 'll']))

const FROG_TUB = line((() => {
  const tub = blank(28, 12)
  for (let y = 0; y < 12; y++) {
    const inset = Math.round(y * 0.3)
    box(tub, inset, y, 27 - inset, y, y < 2 ? 'a' : 'A')
  }
  // Two hoops and a handle at each end: an old tin tub.
  box(tub, 2, 5, 25, 5, 'a')
  box(tub, 3, 9, 24, 9, 'a')
  return tub
})())

/** Water standing in the tub to its brim, the frog's pale belly when it floats on its back, and the bucket worn as a hat. */
const FROG_WATER = (() => {
  const water = blank(26, 3)
  box(water, 0, 1, 25, 2, 'U')
  for (let x = 0; x < 26; x++) if (x % 4 < 2) put(water, x, 0, 'u')
  for (let x = 2; x < 26; x += 5) put(water, x, 1, 'u')
  return water
})()
const FROG_BELLY = line((() => {
  const belly = blank(16, 5)
  oval(belly, 7.5, 3.5, 7.6, 3.6, 'G')
  oval(belly, 7.5, 3.8, 5, 2.4, 'l')
  return belly
})())
export const BUCKET: Plaque = line((() => {
  const pail = blank(11, 9)
  for (let y = 0; y < 9; y++) {
    const inset = Math.round(y * 0.2)
    box(pail, inset, y, 10 - inset, y, 'A')
  }
  box(pail, 0, 0, 10, 0, 'a')
  box(pail, 1, 4, 9, 4, 'a')
  return pail
})())

const FROG_EYES: readonly Eye[] = [{ x: 3, y: 2, white: 'W', lid: 'G' }, { x: 13, y: 2, white: 'W', lid: 'G' }]

/** The frog's legs, folded under it: they show only when it is out of its tub. */
const FROG_LEGS = line(fromRows([
  '..GGGGGGGG..',
  '.GGllllllGG.',
  'GGGllllllGGG',
  'GG.GGGGGG.GG',
  'GGG......GGG',
  'lll......lll',
]))

/** The frog: it looks over the rim of its dry tub, which stands in front of it (TUB). */
export const FROG: Figure = {
  name: 'frog',
  parts: [
    { name: 'legs', plaque: FROG_LEGS, pivot: [7, 8], at: [0, 0, -0.4], hidden: true },
    { name: 'head', plaque: FROG_HEAD, pivot: [9, 13], at: [0, 9, 0], eyes: FROG_EYES },
    { name: 'belly', plaque: FROG_BELLY, pivot: [9, 7], at: [0, 12, 0.6], hidden: true },
    { name: 'hat', plaque: BUCKET, pivot: [6.5, 11], at: [0, 19, 1], turn: Math.PI, hidden: true },
    { name: 'arm', plaque: FROG_ARM, pivot: [2, 1], at: [8, 14, 1.6], turn: 0.5 },
  ],
}

/** Its tub, and the water that stands in it once it has some. */
export const TUB: Figure = {
  name: 'tub',
  parts: [
    { name: 'water', plaque: FROG_WATER, pivot: [13, 3], at: [0, 12, 2.4], hidden: true },
    { name: 'tub', plaque: FROG_TUB, pivot: [15, 13], at: [0, 0, 3.2] },
  ],
}

const OWL_BODY = line(fromRows([
  '.BB........BB.',
  'BBBB......BBBB',
  'BBBBBBBBBBBBBB',
  'BWWWWBBBBWWWWB',
  'BWYYWBBBBWYYWB',
  'BWYYWBOOBWYYWB',
  'BWWWWBOOBWWWWB',
  'BBBBBBBBBBBBBB',
  'BBTTBTTBTTBTTB',
  'BBBTTBTTBTTBBB',
  'BBTTBTTBTTBTTB',
  'BBBTTBTTBTTBBB',
  '.BBBBBBBBBBBB.',
  '..BBBBBBBBBB..',
  '...OO....OO...',
]))

const OWL_WING = line(fromRows(['DDD.', 'DDDD', 'DDDD', 'DDDD', 'DDDD', 'DDDD', '.DDD', '.DDD', '..DD']))

const OWL_POST = line((() => {
  const post = blank(12, 30)
  box(post, 1, 0, 10, 29, 'T')
  box(post, 0, 0, 11, 1, 'B')
  for (let y = 3; y < 30; y += 4) put(post, 3 + (y % 3) * 2, y, 'B')
  // The hollow the baby belongs in, dark and empty.
  oval(post, 5.5, 9, 3.2, 3.6, 'D')
  oval(post, 5.5, 9.5, 2, 2.4, 'K')
  return post
})())

/** The baby owl asleep: a round ball of down with its eyes shut. The same plaque is the owl the fox carries. */
export const OWLET: Plaque = line(fromRows([
  '.TT...TT.',
  'TTTTTTTTT',
  'TKKTTTKKT',
  'TTTTOTTTT',
  'TCCCCCCCT',
  'TCTCCCTCT',
  '.TCCCCCT.',
  '..TTTTT..',
]))
/** The same, awake: wide yellow eyes. */
export const OWLET_AWAKE: Plaque = line(fromRows([
  '.TT...TT.',
  'TYYTTTYYT',
  'TYKTTTKYT',
  'TTTTOTTTT',
  'TCCCCCCCT',
  'TCTCCCTCT',
  '.TCCCCCT.',
  '..TTTTT..',
]))

const OWL_EYES: readonly Eye[] = [{ x: 3, y: 5, white: 'Y', lid: 'B' }, { x: 11, y: 5, white: 'Y', lid: 'B' }]

/** The mother owl, who sits on top of her post (PERCH), one wing held open over the empty hollow. */
export const OWL: Figure = {
  name: 'owl',
  parts: [
    { name: 'body', plaque: OWL_BODY, pivot: [8, 16], at: [0, 30, 1.6], eyes: OWL_EYES },
    { name: 'wing', plaque: OWL_WING, pivot: [2, 1], at: [7, 41, 3.2], turn: 0.9 },
  ],
}

/** Her post, and the baby in its hollow once it is home. */
export const PERCH: Figure = {
  name: 'perch',
  parts: [
    { name: 'post', plaque: OWL_POST, pivot: [7, 31], at: [0, 0, 0] },
    { name: 'baby', plaque: OWLET, pivot: [5.5, 10], at: [-0.5, 16, 0.8], hidden: true },
  ],
}

/** The hedgehog from the side: a dome of spines with pale tips, a pointed snout with a black nose at its end, one ear and small feet. */
const HEDGEHOG_BODY = line(fromRows([
  '.........D...D...D...D........',
  '......D.DDD.DDD.DDD.DDD.D.....',
  '.....DDTDDDTDDDTDDDTDDDTDD....',
  '..D.DDDDDDDDDDDDDDDDDDDDDDD.D.',
  '..DDDDTDDDTDDDTDDDTDDDTDDDDDD.',
  '...DDDDDDDDDDDDDDDDDDDDDDDDDDD',
  '....CCCDDTDDDTDDDTDDDTDDDTDDD.',
  '...CCPCCDDDDDDDDDDDDDDDDDDDDDD',
  '..CCCCCCCDTDDDTDDDTDDDTDDDTDD.',
  '.CCCWWCCCDDDDDDDDDDDDDDDDDDDDD',
  'CCCCWWCCCCDDTDDDTDDDTDDDTDDDD.',
  'KKCCCCCCCCDDDDDDDDDDDDDDDDDDDD',
  'KKCCCCCCCCCDDTDDDTDDDTDDDTDD..',
  '.CCCCCPCCCCCCDDDDDDDDDDDDDDD..',
  '..CCCCCCCCCCCCCCDDDDDDDDDDD...',
  '....CCCCCCCCCCCCCCCCCCCCC.....',
  '.....BBB.BBB.......BBB.BBB....',
]))

const HEDGEHOG_ARM = line(fromRows(['CCC', 'CCC', 'CCC', 'CCC', 'CCC', 'CCC', 'CCC']))

/** A balloon, in one of four colours. The same plaques are the balloons the fox carries. */
const balloon = (key: BeadKey, pale: BeadKey): Plaque => {
  const skin = blank(7, 9)
  oval(skin, 3, 3.4, 3.3, 3.8, key)
  put(skin, 2, 2, pale)
  put(skin, 2, 3, pale)
  put(skin, 3, 8, key)
  return line(skin)
}
export const BALLOONS: readonly Plaque[] = [balloon('R', 'p'), balloon('Y', 'y'), balloon('U', 'u'), balloon('V', 'v')]
/** A string, from a hand up to a balloon. */
export const STRING: Plaque = fromRows(['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'])

const HEDGEHOG_EYES: readonly Eye[] = [{ x: 5, y: 10, white: 'W', lid: 'C' }]

/** The small hedgehog, turned to the trail, reaching up with both arms. */
export const HEDGEHOG: Figure = {
  name: 'hedgehog',
  parts: [
    { name: 'body', plaque: HEDGEHOG_BODY, pivot: [16, 18], at: [0, 0, 0], eyes: HEDGEHOG_EYES },
    { name: 'armLeft', plaque: HEDGEHOG_ARM, pivot: [2.5, 8], at: [-9, 4, 1.6], turn: 0.7 },
    { name: 'armRight', plaque: HEDGEHOG_ARM, pivot: [2.5, 8], at: [-4, 4, 2], turn: 0.35 },
  ],
}

const CAT_HEAD = line(fromRows([
  'A..........A',
  'AA........AA',
  'APA......APA',
  'AAAAAAAAAAAA',
  'AAAAAAAAAAAA',
  'AGGAAAAAAGGA',
  'AGGAAAAAAGGA',
  'AAAAAPPAAAAA',
  'AAWWWKKWWWAA',
  '.AAWWWWWWAA.',
  '..AAAAAAAA..',
]))

const CAT_BODY = line(fromRows([
  '..AAAAAAAA..',
  '.AAAWWWWAAA.',
  'AAAWWWWWWAAA',
  'AAAWWWWWWAAA',
  'AAAWWWWWWAAA',
  'AAAAWWWWAAAA',
  'AAAAAAAAAAAA',
  'AAAAAAAAAAAA',
  'AAWWAAAAWWAA',
]))

const CAT_ARM = line(fromRows(['WW', 'AA', 'AA', 'AA', 'AA', 'AA', 'AA']))

const CAT_TAIL = line(fromRows(['.AA', 'AAA', 'AA.', 'AA.', 'AA.', 'AAA', '.AA', '.AA']))

const KITTEN = line(fromRows([
  'O.......O',
  'OO.....OO',
  'OOOOOOOOO',
  'OWWOOOWWO',
  'OWWOOOWWO',
  'OOOOPOOOO',
  '.OOWWWOO.',
  '..OWWWO..',
]))

/** How high the cat's gatepost is: a little more than the ladder is long, and low enough that the kitten on it is seen under the shelf. */
export const POST_TOP = 26

const GATEPOST = line((() => {
  const post = blank(8, POST_TOP)
  box(post, 1, 2, 6, POST_TOP - 1, 'T')
  box(post, 0, 0, 7, 2, 'B')
  for (let y = 6; y < POST_TOP; y += 5) put(post, 2 + (y % 2) * 2, y, 'B')
  return post
})())

/** The ladder: two rails and five rungs. The same plaque is the ladder the fox carries. */
export const LADDER: Plaque = (() => {
  const ladder = blank(8, 21)
  box(ladder, 0, 0, 1, 20, 'T')
  box(ladder, 6, 0, 7, 20, 'T')
  for (let y = 2; y < 20; y += 4) box(ladder, 2, y, 5, y, 'B')
  return ladder
})()
export const LADDER_MUD: Plaque = (() => {
  const mud = blank(8, 11)
  box(mud, 0, 0, 1, 10, 'D')
  box(mud, 6, 0, 7, 10, 'D')
  for (let y = 1; y < 11; y += 4) box(mud, 2, y, 5, y, 'D')
  return mud
})()

const CAT_EYES: readonly Eye[] = [{ x: 2, y: 6, white: 'G', lid: 'A' }, { x: 10, y: 6, white: 'G', lid: 'A' }]
const KITTEN_EYES: readonly Eye[] = [{ x: 2, y: 4, white: 'W', lid: 'O' }, { x: 7, y: 4, white: 'W', lid: 'O' }]

/** The mother cat, one arm pointing up at her kitten on top of the gatepost beside her (GATEPOST_FIGURE). */
export const CAT: Figure = {
  name: 'cat',
  parts: [
    { name: 'tail', plaque: CAT_TAIL, pivot: [3, 9], at: [-6, 2, -1.2], turn: 0.4 },
    { name: 'body', plaque: CAT_BODY, pivot: [7, 10], at: [0, 0, 0] },
    { name: 'head', plaque: CAT_HEAD, pivot: [7, 12], at: [0, 9, 1.6], eyes: CAT_EYES },
    { name: 'arm', plaque: CAT_ARM, pivot: [2, 8], at: [5, 8, 3.2], turn: -0.45 },
  ],
}

/** The gatepost with the kitten on top of it, the ladder once it is propped there, and the kitten once it is down. */
export const GATEPOST_FIGURE: Figure = {
  name: 'gatepost',
  parts: [
    { name: 'ladder', plaque: LADDER, pivot: [4, 21], at: [22, 0, -3.2], turn: 0.16, hidden: true },
    { name: 'ladderMud', plaque: LADDER_MUD, pivot: [4, 11], at: [22, 0, -2.8], turn: 0.16, hidden: true, loose: true },
    { name: 'post', plaque: GATEPOST, pivot: [5, POST_TOP + 1], at: [13, 0, -1.6] },
    { name: 'kitten', plaque: KITTEN, pivot: [5.5, 9], at: [13, POST_TOP, 0.4], eyes: KITTEN_EYES },
    { name: 'kittenDown', plaque: KITTEN, pivot: [5.5, 10], at: [-13, 0, 3.6], eyes: KITTEN_EYES, hidden: true },
  ],
}

/** The five who wait, in the order they stand round the clearing from left to right. */
export const WAITING: readonly Figure[] = [OWL, BEAR, HEDGEHOG, FROG, CAT]

/** What three of them keep beside them, which stays where it is when they step in. */
export const FIXTURES: readonly Figure[] = [PERCH, TUB, GATEPOST_FIGURE]

export const CHARACTERS: readonly Figure[] = [FOX, GOOSE, ...WAITING]

export function flattened(figure: Figure, hide: readonly string[] = []): Plaque {
  let left = 0, right = 0, top = 0
  for (const part of figure.parts) {
    if (part.hidden || part.flat) continue
    left = Math.min(left, Math.floor(part.at[0] - part.pivot[0]))
    right = Math.max(right, Math.ceil(part.at[0] - part.pivot[0] + part.plaque.w))
    top = Math.max(top, Math.ceil(part.at[1] + part.pivot[1]))
  }
  const sheet = blank(right - left, top + 1)
  const ordered = [...figure.parts].sort((a, b) => a.at[2] - b.at[2])
  for (const part of ordered) {
    if (hide.includes(part.name) || part.hidden || part.flat) continue
    stamp(sheet, part.plaque, Math.round(part.at[0] - part.pivot[0]) - left, Math.round(top - part.at[1] - part.pivot[1]))
  }
  return sheet
}

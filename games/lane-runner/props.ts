import { blank, box, fromRows, outlined, oval, put, type Plaque } from './beads'
import { BALLOONS, LADDER, LADDER_MUD, OWLET, OWLET_AWAKE, STRING, TIERS, TIER_MUD, type Eye, type Figure } from './figures'
import type { Load } from './lapState'
import type { BeadKey } from './palette'
import { CLEAR, LANE_WIDTH, PLACES, SHELF_REACH, STEP, TRAIL_HALF, ZONES, laneX, type Lane, type Obstacle } from './trail'

// Everything on the trail that is not a character: the five loads, the shelf
// they stand on, the six obstacles and those who live beside the trail
// between them. Like the characters, each is a few plaques of beads, upright
// and facing the child or lying flat on the board. Nothing here draws.
//
// A figure's origin is on the trail's middle line at its place along the
// trail, so a part's `at` is pegs to the right of the middle, pegs up, and
// pegs towards the child.

const line = (plaque: Plaque): Plaque => outlined(plaque, 'K')
const soft = (plaque: Plaque): Plaque => outlined(plaque, 'D')

// --- The five loads ----------------------------------------------------------
// A load's origin is the middle of its foot: it stands on the shelf, on the
// fox's hands, or where a tumble threw it.

const PLATE = line(fromRows(['aaaaaaaaaaaaa']))
const CHERRY = line(fromRows(['.G.', 'RRR', 'RRR']))
const PIPS = fromRows(['.V....R..', '....V....', '.R.....V.', '...V.R...', 'V.......R', '....R....', '..V...V..'])
const DRIPS = fromRows(['u.....u', '.......', '...u...', '.......', '.u...u.'])

const CAKE: Figure = {
  name: 'cake',
  parts: [
    { name: 'plate', plaque: PLATE, pivot: [7.5, 3], at: [0, 0, 0] },
    { name: 'tier1', plaque: TIERS[0], pivot: [6.5, 5], at: [0, 3, 0.4] },
    { name: 'tier2', plaque: TIERS[1], pivot: [5.5, 5], at: [0, 8, 0.8] },
    { name: 'tier3', plaque: TIERS[2], pivot: [4.5, 5], at: [0, 13, 1.2] },
    { name: 'mud', plaque: TIER_MUD, pivot: [4.5, 5], at: [0, 13, 1.6], hidden: true },
    { name: 'cherry', plaque: CHERRY, pivot: [2.5, 5], at: [0, 18, 2] },
    { name: 'berries', plaque: PIPS, pivot: [4.5, 7], at: [0, 4, 2.4], hidden: true, loose: true },
    { name: 'drops', plaque: DRIPS, pivot: [3.5, 5], at: [0, 2, 2.8], hidden: true, loose: true },
  ],
}

const LADDER_LOAD: Figure = {
  name: 'ladder',
  parts: [
    { name: 'ladder', plaque: LADDER, pivot: [4, 21], at: [0, 0, 0] },
    { name: 'mud', plaque: LADDER_MUD, pivot: [4, 11], at: [0, 0, 0.4], hidden: true, loose: true },
  ],
}

const BALLOON_LOAD: Figure = {
  name: 'balloons',
  parts: [
    { name: 'string1', plaque: STRING, pivot: [0.5, 8], at: [0, 0, 0], turn: 0.75, loose: true },
    { name: 'string2', plaque: STRING, pivot: [0.5, 8], at: [0, 0, 0.4], turn: 0.25, loose: true },
    { name: 'string3', plaque: STRING, pivot: [0.5, 8], at: [0, 0, 0.8], turn: -0.25, loose: true },
    { name: 'string4', plaque: STRING, pivot: [0.5, 8], at: [0, 0, 1.2], turn: -0.75, loose: true },
    { name: 'balloon1', plaque: BALLOONS[0], pivot: [4.5, 10], at: [-7, 6, 1.6] },
    { name: 'balloon2', plaque: BALLOONS[1], pivot: [4.5, 10], at: [-2.5, 9, 2] },
    { name: 'balloon3', plaque: BALLOONS[2], pivot: [4.5, 10], at: [2.5, 8, 2.4] },
    { name: 'balloon4', plaque: BALLOONS[3], pivot: [4.5, 10], at: [7, 6, 2.8] },
  ],
}

const BASKET = soft(fromRows(['T.T.T.T.T.T', 'BTBTBTBTBTB', '.BTBTBTBTB.']))
// Feathers out of place: a bent one, a leaning one with a pale tip, and a short spike. No two are alike, and how
// many show says only that the owlet is ruffled, not how often it woke.
const RUFFLES = [fromRows(['.T', 'T.', 'T.']), fromRows(['..C', '.T.', 'T..']), fromRows(['T', 'T'])]
const SPLOTCH = fromRows(['.D...B.', 'B..D...', '..B..D.'])

const OWL_LOAD: Figure = {
  name: 'owlet',
  parts: [
    { name: 'basket', plaque: BASKET, pivot: [6.5, 5], at: [0, 0, 0.8] },
    { name: 'asleep', plaque: OWLET, pivot: [5.5, 10], at: [0, 2, 0] },
    { name: 'awake', plaque: OWLET_AWAKE, pivot: [5.5, 10], at: [0, 2, 0], hidden: true },
    { name: 'ruffle1', plaque: RUFFLES[0], pivot: [1, 3], at: [-3, 11, 0.4], hidden: true, loose: true },
    { name: 'ruffle2', plaque: RUFFLES[1], pivot: [0.5, 3], at: [2.5, 10.5, 1.6], hidden: true, loose: true },
    { name: 'ruffle3', plaque: RUFFLES[2], pivot: [0.5, 2], at: [0, 12, 1.2], hidden: true, loose: true },
    { name: 'drops', plaque: DRIPS, pivot: [3.5, 5], at: [0, 3, 2], hidden: true, loose: true },
    { name: 'mud', plaque: SPLOTCH, pivot: [3.5, 3], at: [0, 5, 2.4], hidden: true, loose: true },
  ],
}

/** The pail the fox carries, narrower at the foot than at the rim, with its front open so the water in it shows: pale inside, so that each level of water is seen against it. */
const PAIL = line((() => {
  const pail = blank(11, 9)
  for (let y = 0; y < 9; y++) {
    const inset = y < 3 ? 0 : 1
    box(pail, inset, y, 10 - inset, y, 'A')
    if (y > 0 && y < 8) box(pail, 2, y, 8, y, 'a')
  }
  box(pail, 0, 0, 10, 0, 'a')
  box(pail, 2, 1, 8, 1, 'W')
  return pail
})())
const HANDLE = fromRows(['..AAAAA..', '.A.....A.', 'A.......A', 'A.......A'])
/** One level of water, and the uneven top of whatever water there is. */
const LEVEL = fromRows(['UUUUUUU', 'UUUUUUU'])
const WAVE = fromRows(['u.uu.u.', 'UuUUuUu'])

const BUCKET_LOAD: Figure = {
  name: 'bucket',
  parts: [
    { name: 'handle', plaque: HANDLE, pivot: [4.5, 4], at: [0, 10, -0.4], loose: true },
    { name: 'pail', plaque: PAIL, pivot: [6.5, 11], at: [0, 0, 0] },
    { name: 'water1', plaque: LEVEL, pivot: [3.5, 2], at: [0, 2, 0.4], hidden: true },
    { name: 'water2', plaque: LEVEL, pivot: [3.5, 2], at: [0, 4, 0.8], hidden: true },
    { name: 'water3', plaque: LEVEL, pivot: [3.5, 2], at: [0, 6, 1.2], hidden: true },
    { name: 'wave', plaque: WAVE, pivot: [3.5, 2], at: [0, 2, 1.6], hidden: true, loose: true },
  ],
}

export const LOAD_FIGURES: Record<Exclude<Load, 'none'>, Figure> = { cake: CAKE, ladder: LADDER_LOAD, balloons: BALLOON_LOAD, owl: OWL_LOAD, bucket: BUCKET_LOAD }

/** A slop of the bucket's water out of the pail: one body of water with a glint on it, which comes down on whatever is under it. */
export const SLOP: Figure = {
  name: 'slop',
  parts: [{ name: 'water', plaque: fromRows(['..uu.....', '.uUUu.uu.', 'uUUUUUUUu', 'UUWWUUUUU', '.UUUUUUU.', '..UUUUU..']), pivot: [4.5, 6], at: [0, 0, 0] }],
}

// --- The shelf ---------------------------------------------------------------

/** How high the shelf's board is, and how far before the shelf's place along the trail the gate stands: the fox waits just beyond it and is seen through it. */
export const SHELF_HEIGHT = 58
export const SHELF_BEFORE = 8
/**
 * The gate is a flat of stage scenery. It stands for exactly as long as a load can be taken from its board: the
 * fox within three steps beyond it. From there on it is flown, with what is still on its board, higher than the
 * camera ever stands, so the camera rises and passes under it and never through it; and it is down again when
 * the fox comes round. Whether it is flown follows only where the fox is (`along` is pegs from the shelf by the
 * shorter way), so a fox found standing anywhere finds the gate where that place puts it. Only the flight itself
 * takes time: `GATE_SECONDS` from the board to the top.
 */
export const GATE_FLOWN = 240
export const GATE_SECONDS = 0.4
export function gateFlown(along: number): boolean {
  return along >= SHELF_REACH && along <= 200
}
/** How high it hangs when it is `up` of the way there, 0 to 1. */
export function gateLift(up: number): number {
  const k = Math.min(1, Math.max(0, up))
  return GATE_FLOWN * k * k * (3 - 2 * k)
}
/** How far to each side of the trail's middle its two posts stand: outside the five who wait, at the edges of the frame, so that the clearing is seen whole through the gateway. */
export const GATE_HALF = 62
/**
 * Where each load stands on it: pegs to the right of the trail's middle, five pegs or more of bare board between
 * any two. Three stand to the left of the middle and two to the right, and the middle of the board is bare for
 * `SHELF_CLEAR` pegs to each side: the top centre of the frame is where a shell puts its own control, and on a
 * short surface the board is up there.
 */
export const SHELF_SLOTS: Record<Exclude<Load, 'none'>, number> = { ladder: -53, bucket: -34, owl: -15, cake: 16, balloons: 41 }
export const SHELF_CLEAR = 8
/** The ladder does not stand upright on the board: it leans against the gatepost beside it, as a ladder is put away. */
export const LADDER_LEANS = 0.2

const POST = soft((() => {
  const post = blank(4, SHELF_HEIGHT)
  box(post, 0, 0, 3, SHELF_HEIGHT - 1, 'B')
  for (let y = 4; y < SHELF_HEIGHT; y += 7) put(post, 1 + (y % 2), y, 'T')
  return post
})())
const BOARD = soft((() => {
  const board = blank(GATE_HALF * 2 + 8, 3)
  box(board, 0, 0, board.w - 1, 2, 'T')
  for (let x = 3; x < board.w; x += 11) put(board, x, 1, 'B')
  return board
})())

export const SHELF: Figure = {
  name: 'shelf',
  parts: [
    { name: 'postLeft', plaque: POST, pivot: [3, SHELF_HEIGHT + 2], at: [-GATE_HALF, 0, 0] },
    { name: 'postRight', plaque: POST, pivot: [3, SHELF_HEIGHT + 2], at: [GATE_HALF, 0, 0] },
    { name: 'board', plaque: BOARD, pivot: [GATE_HALF + 4, 5], at: [0, SHELF_HEIGHT - 5, 0.4] },
  ],
}

// --- The six obstacles ---------------------------------------------------------
// Each is large and already funny at rest. An obstacle's origin is at the
// middle of its stretch of trail, except the mud's, which is at its start.

const FISH = line(fromRows([
  '..OOOO...O',
  '.OOOOOO.OO',
  'OWKOOOOOOO',
  '.OOOOOO.OO',
  '..OOOO...O',
]))
const REEDS = (() => {
  const bed = blank(12, 18)
  for (let i = 0; i < 4; i++) {
    const tall = 10 + ((i * 5) % 7)
    box(bed, i * 3 + 1, 18 - tall, i * 3 + 1, 17, 'G')
    box(bed, i * 3 + 1, 18 - tall, i * 3 + 1, 18 - tall + 3, 'D')
  }
  box(bed, 0, 17, 11, 17, 'g')
  return bed
})()

const STREAM: Figure = {
  name: 'stream',
  parts: [
    { name: 'reedsLeft', plaque: REEDS, pivot: [6, 18], at: [-44, 0, 12.5] },
    { name: 'reedsRight', plaque: REEDS, pivot: [6, 18], at: [42, 0, -12.5] },
    { name: 'fish', plaque: FISH, pivot: [5.5, 3.5], at: [52, 4, 0.5], hidden: true },
    { name: 'boat', plaque: TIERS[2], pivot: [4.5, 5], at: [0, 0, 1.5], hidden: true },
  ],
}

const TRUNK = (() => {
  const trunk = blank(10, 46)
  box(trunk, 1, 0, 8, 45, 'B')
  box(trunk, 7, 0, 8, 45, 'D')
  box(trunk, 0, 42, 9, 45, 'B')
  for (let y = 5; y < 44; y += 6) put(trunk, 3 + (y % 3), y, 'D')
  return trunk
})()
/** The limb that hangs over the left and middle lanes: its underside is as low as the sheet's low branch. */
const LIMB = (() => {
  const limb = blank(52, 4)
  box(limb, 0, 0, 51, 3, 'B')
  box(limb, 0, 3, 51, 3, 'D')
  for (let x = 4; x < 52; x += 9) put(limb, x, 1, 'T')
  return limb
})()
const LEAVES = (() => {
  const leaves = blank(50, 12)
  for (let i = 0; i < 6; i++) oval(leaves, 5 + i * 8, 7 - (i % 2) * 2, 5.5, 4.6, i % 2 === 0 ? 'G' : 'g')
  for (let i = 0; i < 6; i++) oval(leaves, 3.5 + i * 8, 5 - (i % 2) * 2, 2, 1.6, 'l')
  for (let x = 3; x < 50; x += 7) put(leaves, x, 9, 'R')
  return leaves
})()
const CROWN = (() => {
  const crown = blank(44, 26)
  oval(crown, 21.5, 13, 21.6, 12.8, 'g')
  oval(crown, 20, 11.5, 18, 10, 'G')
  oval(crown, 13, 7.5, 8, 5, 'l')
  for (const [x, y] of [[8, 14], [18, 19], [30, 9], [35, 16], [24, 5]]) put(crown, x, y, 'R')
  return crown
})()
const BIRD = line(fromRows([
  '..UUU..',
  'YUKUUU.',
  '.UUUuuU',
  '..UuuUU',
  '...O.O.',
]))

const BRANCH: Figure = {
  name: 'branch',
  parts: [
    { name: 'trunk', plaque: TRUNK, pivot: [5, 46], at: [-48, 0, 0.5] },
    { name: 'limb', plaque: LIMB, pivot: [0, 4], at: [-44, CLEAR.branchUnder, 0.9] },
    { name: 'leaves', plaque: LEAVES, pivot: [0, 12], at: [-42, CLEAR.branchUnder + 4, 1.3] },
    { name: 'crown', plaque: CROWN, pivot: [22, 26], at: [-52, 40, 1.7] },
    { name: 'bird', plaque: BIRD, pivot: [4.5, 7], at: [-45, CLEAR.branchUnder + 3, 9.7] },
    // A tier that stayed on the branch lies on it over the lane it was lost in: in front of everything the fox
    // that lost it carries, which is going away under it at that moment.
    { name: 'tierOn', plaque: TIERS[2], pivot: [4.5, 5], at: [0, CLEAR.branchUnder + 4, 9.3], hidden: true },
  ],
}
/** How far to the left of a tier on the branch the bird sits to eat it, and where the bird sits by itself. */
export const BIRD_AT = -45
export const BIRD_BY_TIER = -9.5

const PIG = line(fromRows([
  '.PP..........PP.....',
  'PPPP........PPPP....',
  'PPPPPPPPPPPPPPPP....',
  'PPWWPPPPPPPPWWPP....',
  'PPWWPPPPPPPPWWPPPP..',
  'PPPPPpppppPPPPPPPPP.',
  'PPPPppKpKppPPPPPPPPP',
  'BPPPPpppppPPPPPPPPBB',
  'BBBPPPPPPPPPPPPBBBBB',
]))
const PIG_TAIL = fromRows(['.PP', 'P.P', 'P..', '.P.', '..P'])
/** A bubble in the mud: a dome with a glint, never a ring. */
const BUBBLE = fromRows(['.BBB.', 'BTBBB', 'BBBBB'])
const WALLOW = (() => {
  const wallow = blank(30, 14)
  oval(wallow, 14.5, 6.5, 14.6, 6.8, 'B')
  oval(wallow, 13, 6, 10, 4, 'D')
  return wallow
})()
const PIG_EYES: readonly Eye[] = [{ x: 3, y: 4, white: 'W', lid: 'P' }, { x: 13, y: 4, white: 'W', lid: 'P' }]

const MUD: Figure = {
  name: 'mud',
  parts: [
    { name: 'wallow', plaque: WALLOW, pivot: [15, 7], at: [54, 0.45, -38], flat: true },
    { name: 'pig', plaque: PIG, pivot: [11, 11], at: [54, 0, -38.5], eyes: PIG_EYES },
    { name: 'tail', plaque: PIG_TAIL, pivot: [1.5, 5], at: [66, 6, -38.1], loose: true },
    { name: 'bubble1', plaque: BUBBLE, pivot: [2.5, 3], at: [laneX(0) + 3, 0.36, -22.5], flat: true, hidden: true },
    { name: 'bubble2', plaque: BUBBLE, pivot: [2.5, 3], at: [laneX(2) - 2, 0.36, -52.5], flat: true, hidden: true },
    { name: 'bubble3', plaque: BUBBLE, pivot: [2.5, 3], at: [laneX(0) - 3, 0.36, -66.5], flat: true, hidden: true },
  ],
}

/** An arch of thorny canes over one lane: a ball rolls under it, a standing fox does not fit. It scowls. */
const ARCH = (() => {
  const arch = blank(LANE_WIDTH, CLEAR.archTop)
  box(arch, 0, 0, LANE_WIDTH - 1, CLEAR.archTop - 1, 'g')
  // The tunnel.
  box(arch, 2, CLEAR.archTop - CLEAR.tunnel, LANE_WIDTH - 3, CLEAR.archTop - 1, null)
  for (let x = 0; x < LANE_WIDTH; x += 3) put(arch, x, 0, null)
  for (let x = 1; x < LANE_WIDTH; x += 5) put(arch, x, 2, 'V')
  for (let x = 3; x < LANE_WIDTH; x += 5) put(arch, x, 3, 'r')
  for (let y = 6; y < CLEAR.archTop; y += 3) {
    put(arch, 0, y, 'E')
    put(arch, LANE_WIDTH - 1, y + 1, 'E')
  }
  // Two eyes under a heavy brow.
  box(arch, 5, 1, 8, 1, 'K')
  box(arch, 11, 1, 14, 1, 'K')
  box(arch, 6, 2, 7, 3, 'W')
  box(arch, 12, 2, 13, 3, 'W')
  return arch
})()
const ARCH_EYES: readonly Eye[] = [{ x: 6, y: 2, white: 'W', lid: 'g' }, { x: 12, y: 2, white: 'W', lid: 'g' }]
const BLOOM = (() => {
  const bloom = blank(LANE_WIDTH, 5)
  for (let i = 0; i < 5; i++) {
    const x = 2 + i * 4, y = 1 + (i % 2) * 2
    const key: BeadKey = i % 3 === 0 ? 'W' : 'P'
    // A blossom is a ring of petals round a yellow middle with two of its corners missing, high and low by turns:
    // never four petals in a cross.
    const open = i % 2 === 0 ? 1 : -1
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx !== open * dy || dx === 0) put(bloom, x + dx, y + dy, key)
    put(bloom, x, y, 'Y')
  }
  return bloom
})()
/** The thicket the two arches grow out of, on the verge: a heap of thorny canes with berries on it and a scowl of its own. */
const THICKET = (() => {
  const thicket = blank(32, 30)
  oval(thicket, 9, 19, 8, 10, 'g')
  oval(thicket, 21, 17, 9, 12, 'g')
  oval(thicket, 15, 9, 8, 8, 'g')
  box(thicket, 3, 24, 28, 29, 'g')
  // Lit from the upper left, like every bush on the board.
  oval(thicket, 7, 18, 4, 5, 'G')
  oval(thicket, 20, 16, 5, 6, 'G')
  oval(thicket, 13, 6, 4, 3, 'G')
  for (const [x, y] of [[6, 16], [19, 13], [12, 5], [22, 15]] as const) put(thicket, x, y, 'l')
  // Thorns stand out of it all round, at uneven places.
  for (const [x, y] of [[2, 12], [6, 5], [11, 0], [19, 0], [25, 3], [30, 9], [31, 18], [0, 21], [14, 1], [28, 6]] as const) put(thicket, x, y, 'E')
  for (const [x, y] of [[5, 16], [12, 21], [24, 12], [18, 25], [27, 22], [9, 8]] as const) put(thicket, x, y, 'V')
  for (const [x, y] of [[8, 24], [21, 6], [15, 15], [26, 17], [4, 27]] as const) put(thicket, x, y, 'r')
  // Two eyes under one heavy brow.
  box(thicket, 9, 10, 22, 10, 'K')
  box(thicket, 10, 11, 12, 13, 'W')
  box(thicket, 19, 11, 21, 13, 'W')
  return thicket
})()
const THICKET_EYES: readonly Eye[] = [{ x: 10, y: 11, white: 'W', lid: 'g' }, { x: 19, y: 11, white: 'W', lid: 'g' }]
/** Where the thicket stands: on the left verge, its side against the first arch. */
export const THICKET_AT = laneX(0) - LANE_WIDTH / 2 - 16
const skin = (key: BeadKey): Plaque => fromRows([`${key}.`, `${key}${key}`, `.${key}`])

const BRAMBLES: Figure = {
  name: 'brambles',
  parts: [
    { name: 'thicket', plaque: THICKET, pivot: [16, 30], at: [THICKET_AT, 0, 0.1], eyes: THICKET_EYES },
    { name: 'arch0', plaque: ARCH, pivot: [LANE_WIDTH / 2, CLEAR.archTop], at: [laneX(0), 0, 0.5], eyes: ARCH_EYES },
    { name: 'arch1', plaque: ARCH, pivot: [LANE_WIDTH / 2, CLEAR.archTop], at: [laneX(1), 0, 0.9], eyes: ARCH_EYES },
    { name: 'bloom0', plaque: BLOOM, pivot: [LANE_WIDTH / 2, 5], at: [laneX(0), CLEAR.tunnel, 1.3], hidden: true, loose: true },
    { name: 'bloom1', plaque: BLOOM, pivot: [LANE_WIDTH / 2, 5], at: [laneX(1), CLEAR.tunnel, 1.7], hidden: true, loose: true },
    // Where each hangs is set from the lane its balloon popped in (`SKIN_AT`).
    { name: 'skin1', plaque: skin('R'), pivot: [1, 3], at: [0, 0, 2.1], hidden: true, loose: true },
    { name: 'skin2', plaque: skin('Y'), pivot: [1, 3], at: [0, 0, 2.5], hidden: true, loose: true },
    { name: 'skin3', plaque: skin('U'), pivot: [1, 3], at: [0, 0, 2.9], hidden: true, loose: true },
    // Skewered on a post of the arch over the lane it fell in (`KEBAB_AT`): on the thorns, never in a tunnel and never over one.
    { name: 'kebab', plaque: TIERS[2], pivot: [4.5, 5], at: [0, CLEAR.tunnel, 3.3], hidden: true },
  ],
}
/**
 * The three thorns of each arch that a balloon's skin hangs on, in the order they pop: pegs right of the
 * trail's middle and pegs up. All are on the two posts of the arch over that lane, lower than the tunnel is
 * high, so nothing hangs in a tunnel or over one.
 */
export const SKIN_AT: Record<0 | 1, readonly (readonly [number, number])[]> = {
  0: [[laneX(0) - 9, 10], [laneX(0) + 9, 6], [laneX(0) - 9, 3]],
  1: [[laneX(1) + 9, 11], [laneX(1) - 9, 8], [laneX(1) + 9, 4]],
}
/** Where a tier of cake is speared, by the lane it fell in: on the outer post of that lane's arch. */
export const KEBAB_AT: Record<0 | 1, number> = { 0: laneX(0) - LANE_WIDTH / 2, 1: laneX(1) + LANE_WIDTH / 2 }
/** The lane of the brambles a thing was left in: they fill the left and the middle. */
export const thornLane = (lane: Lane): 0 | 1 => (lane === 0 ? 0 : 1)

/** The log across all three lanes. Over the left lane it is a hollow shell: there is room under it for a fox rolled up and squashed flat. */
const LOG = (() => {
  const wide = TRAIL_HALF * 2 + 6
  const log = blank(wide, CLEAR.logTop)
  box(log, 0, 0, wide - 1, CLEAR.logTop - 1, 'B')
  box(log, 0, 0, wide - 1, 0, 'T')
  box(log, 0, CLEAR.logTop - 2, wide - 1, CLEAR.logTop - 1, 'D')
  for (let x = 5; x < wide; x += 8) box(log, x, 3 + (x % 3), x + 2, 3 + (x % 3), 'D')
  // The hollow end: an opening as wide as the left lane and as high as the sheet's roll through it.
  box(log, 6, CLEAR.logTop - CLEAR.hollow, 6 + LANE_WIDTH - 1, CLEAR.logTop - 1, null)
  // The end grain at the far right.
  oval(log, wide - 6, 5, 4.4, 4.4, 'T')
  oval(log, wide - 6, 5, 2.4, 2.4, 'C')
  put(log, wide - 6, 5, 'B')
  return log
})()
// Three caps, no two alike: each a dome of two unequal rows on a stem that is not under its middle. Each is a
// plaque of its own, since they come up one at a time.
const CAPS = [fromRows(['.RR.', 'RWRR', '..C.']), fromRows(['..RR.', 'RRRWR', '.C...']), fromRows(['RW.', 'RRR', 'C..'])]
/** The names of the three, in the order they come up: along the log from the fox's left. */
export const CAP_NAMES = ['cap1', 'cap2', 'cap3'] as const
const SQUIRREL = line(fromRows([
  '.BB.BB..',
  'BBBBBBB.',
  'BWWBWWB.',
  'BWWBWWB.',
  'BBBKBBB.',
  '.BCCCB..',
  '.BCTCBB.',
  '.BCCCB..',
  '.BB.BB..',
]))
const BUSHY = line(fromRows([
  '..BBB.',
  '.BBTBB',
  'BBTTBB',
  'BBTBB.',
  'BBBB..',
  '.BBB..',
  '..BB..',
  '..BB..',
]))
const SQUIRREL_EYES: readonly Eye[] = [{ x: 2, y: 3, white: 'W', lid: 'B' }, { x: 5, y: 3, white: 'W', lid: 'B' }]

const LOG_FIGURE: Figure = {
  name: 'log',
  parts: [
    { name: 'log', plaque: LOG, pivot: [TRAIL_HALF + 3, CLEAR.logTop], at: [0, 0, 0.5] },
    { name: 'cap1', plaque: CAPS[0], pivot: [2, 3], at: [1.5, CLEAR.logTop, 0.9], hidden: true },
    { name: 'cap2', plaque: CAPS[1], pivot: [2.5, 3], at: [8, CLEAR.logTop, 0.9], hidden: true },
    { name: 'cap3', plaque: CAPS[2], pivot: [1.5, 3], at: [14, CLEAR.logTop, 0.9], hidden: true },
    // A tier that flew off in a jump sits on the log in the lane it flew off in.
    { name: 'tierOn', plaque: TIERS[2], pivot: [4.5, 5], at: [0, CLEAR.logTop, 1.3], hidden: true },
    { name: 'tail', plaque: BUSHY, pivot: [4, 10], at: [50, 0, -0.3] },
    { name: 'squirrel', plaque: SQUIRREL, pivot: [4.5, 11], at: [45, 0, 1.7], eyes: SQUIRREL_EYES },
  ],
}

/** The five obstacles that are not the goose. */
export type Fixed = Exclude<Obstacle, 'goose'>
export const OBSTACLE_FIGURES: Record<Fixed, Figure> = { stream: STREAM, branch: BRANCH, mud: MUD, brambles: BRAMBLES, log: LOG_FIGURE }
/** Where each obstacle's figure has its origin along the trail. */
export const OBSTACLE_AT: Record<Fixed, number> = { stream: ZONES.stream.mid, branch: ZONES.branch.mid, mud: ZONES.mud.from, brambles: ZONES.brambles.mid, log: ZONES.log.mid }

// --- What lies flat on the board ------------------------------------------------
// Large plaques of beads lying on their sides: the stream with its stones,
// the mud with its plank, the puddle, and the pond. Each is drawn once and
// laid on the board, `x` the middle of it and `s` its near edge.

export type Laid = { name: string; plaque: Plaque; x: number; s: number; lift: number }

const STREAM_HALF = 110

function streamPlaque(): Plaque {
  const long = ZONES.stream.to - ZONES.stream.from
  const water = blank(STREAM_HALF * 2, long)
  for (let y = 0; y < long; y++) {
    for (let x = 0; x < water.w; x++) {
      // A bank that wanders a little, and a paler bead here and there for the light on the water.
      const bank = Math.round(1.5 + 1.5 * Math.sin(x * 0.21))
      if (y < bank || y >= long - bank) continue
      put(water, x, y, (x * 7 + y * 13) % 11 === 0 || (x + y * 3) % 17 === 0 ? 'u' : 'U')
    }
  }
  // Three stepping stones in the left lane.
  for (let i = 0; i < 3; i++) {
    const cx = STREAM_HALF + laneX(0) + (i % 2 === 0 ? -2 : 2), cy = long - 5 - i * 9
    oval(water, cx, cy, 5.2, 3.4, 'A')
    oval(water, cx - 1, cy - 1, 2.6, 1.2, 'a')
  }
  return water
}

function mudPlaque(): Plaque {
  const long = ZONES.mud.to - ZONES.mud.from, wide = TRAIL_HALF * 2
  const mud = blank(wide, long)
  for (let y = 0; y < long; y++) {
    for (let x = 3; x < wide - 3; x++) {
      const lane = Math.floor((x - 3) / LANE_WIDTH)
      if (lane === 1) {
        // The plank down the middle, with a nail at each end of every board.
        const inPlank = x - 3 - LANE_WIDTH
        if (inPlank < 3 || inPlank >= LANE_WIDTH - 3) continue
        put(mud, x, y, y % 16 === 0 ? 'B' : (y % 16 === 2 || y % 16 === 14) && (inPlank === 5 || inPlank === 14) ? 'A' : 'T')
        continue
      }
      const edge = Math.round(1 + Math.sin(y * 0.4 + lane) * 1)
      if (y < edge || y >= long - edge) continue
      put(mud, x, y, (x * 5 + y * 3) % 13 === 0 ? 'D' : (x + y * 7) % 19 === 0 ? 'T' : 'B')
    }
  }
  return mud
}

function puddlePlaque(): Plaque {
  const puddle = blank(16, 34)
  oval(puddle, 7.5, 16.5, 7.6, 16.8, 'u')
  oval(puddle, 6.5, 14, 4, 9, 'W')
  oval(puddle, 8, 18, 5, 11, 'u')
  return puddle
}

/** What lies on the trail at the stream and at the mud, made once. The puddle is laid over the mud's two lanes when a slop has made it. */
export function laidOut(): { stream: Laid; mud: Laid; puddles: Laid[] } {
  const puddle = puddlePlaque()
  return {
    stream: { name: 'stream-water', plaque: streamPlaque(), x: 0, s: ZONES.stream.from, lift: 0.12 },
    mud: { name: 'mud-patch', plaque: mudPlaque(), x: 0, s: ZONES.mud.from, lift: 0.12 },
    puddles: [0, 2].map((lane) => ({ name: `puddle-${lane}`, plaque: puddle, x: laneX(lane), s: ZONES.mud.from + 22, lift: 0.2 })),
  }
}

// --- Those who live beside the trail ----------------------------------------------
// One in each stretch between two obstacles, on the verge, each with a move
// of its own. A fox that runs by is looked at and nothing more.

export type Neighbour = 'snail' | 'rabbit' | 'ducklings' | 'bees' | 'tortoise' | 'sheep' | 'caterpillar'

// The eye stalks stand two pegs apart, so the outline between them is a bar and not a cross with the two pupils.
const SNAIL_BODY = line(fromRows(['W..W.....', 'K..K.....', 'T..T.....', 'TTTT.....', 'TTTTTTTTT', '.TTTTTTTT']))
const SNAIL_SHELL = line((() => {
  const shell = blank(8, 8)
  oval(shell, 3.5, 3.5, 3.9, 3.9, 'O')
  oval(shell, 3.5, 3.5, 2.4, 2.4, 'R')
  oval(shell, 3.5, 3.5, 1, 1, 'O')
  put(shell, 5, 2, 'y')
  return shell
})())

const MOUND = (() => {
  const mound = blank(16, 5)
  oval(mound, 7.5, 5, 7.8, 4.8, 'B')
  oval(mound, 7.5, 5, 4, 2.4, 'D')
  for (let x = 1; x < 15; x += 3) put(mound, x, 4, 'G')
  return mound
})()
const RABBIT = line(fromRows([
  '.WW....WW.',
  '.WPW..WPW.',
  '.WPW..WPW.',
  '.WPW..WPW.',
  '.WWW..WWW.',
  'WWWWWWWWWW',
  'WWWWWWWWWW',
  'WWWWWWWWWW',
  'WWWWWWWWWW',
  'WWWWPPWWWW',
  '.WWWKKWWW.',
  '..WWWWWW..',
]))
const RABBIT_EYES: readonly Eye[] = [{ x: 2, y: 7, white: 'p', lid: 'W' }, { x: 8, y: 7, white: 'p', lid: 'W' }]

const DUCKLING = line(fromRows(['.YYY..', 'YKYYO.', 'YYYY..', '.YYYYY', '.YYYYY', '..O.O.']))

const HIVE = soft((() => {
  const hive = blank(13, 18)
  box(hive, 4, 12, 8, 17, 'B')
  for (let y = 0; y < 12; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 6.5) / 6.5) ** 2)) * 6)
    box(hive, 6 - half, y, 6 + half, y, (y + Math.floor(y / 3)) % 3 === 0 ? 'T' : 'Y')
  }
  oval(hive, 6, 8, 1.4, 1.6, 'D')
  return hive
})())
const BEE = fromRows(['aYK', '.YK'])

const SHELL = line((() => {
  const shell = blank(16, 9)
  oval(shell, 7.5, 8.5, 7.8, 8.4, 'g')
  // The plates of the shell: blocks of unequal sizes, none of them a cross.
  for (const [x, y, w, h] of [[3, 5, 2, 2], [7, 2, 3, 2], [11, 5, 2, 3], [6, 6, 3, 1]]) box(shell, x, y, x + w - 1, y + h - 1, 'l')
  box(shell, 0, 8, 15, 8, 'E')
  return shell
})())
const TORTOISE_HEAD = line(fromRows(['.GGG', 'GWKG', 'GGGG', '.GG.', '.GG.']))
const TORTOISE_FEET = fromRows(['GG......GG'])

const FLEECE = line((() => {
  const fleece = blank(18, 12)
  for (const [x, y, r] of [[4, 5, 3.6], [8.5, 4, 4], [13, 5, 3.6], [6, 8, 3.4], [11.5, 8, 3.4]]) oval(fleece, x, y, r, r - 0.4, 'W')
  put(fleece, 5, 4, 'a')
  put(fleece, 12, 7, 'a')
  box(fleece, 4, 11, 5, 11, 'K')
  box(fleece, 12, 11, 13, 11, 'K')
  return fleece
})())
const SHEEP_HEAD = line(fromRows(['K....K', 'KKKKKK', 'KWWKWW', 'KWWKWW', 'KKKKKK', '.KPPK.', '.KKKK.']))
const SHEEP_EYES: readonly Eye[] = [{ x: 2, y: 3, white: 'W', lid: 'K' }, { x: 5, y: 3, white: 'W', lid: 'K' }]

const SEGMENT = line((() => {
  const segment = blank(4, 4)
  oval(segment, 1.5, 1.5, 2, 2, 'l')
  put(segment, 1, 1, 'G')
  return segment
})())
const CATERPILLAR_HEAD = line(fromRows(['K..K', 'GGGG', 'GKlK', 'GGGG', '.GG.']))

/** Each neighbour and where it lives: pegs to the right of the trail's middle and pegs along the trail. */
export const NEIGHBOURS: Record<Neighbour, { figure: Figure; x: number; s: number }> = {
  snail: {
    x: -46, s: 4.5 * STEP,
    figure: { name: 'snail', parts: [{ name: 'body', plaque: SNAIL_BODY, pivot: [5.5, 8], at: [0, 0, 0.5] }, { name: 'shell', plaque: SNAIL_SHELL, pivot: [5, 10], at: [2, 3, 0.9] }] },
  },
  rabbit: {
    x: 46, s: 14.5 * STEP,
    figure: { name: 'rabbit', parts: [{ name: 'rabbit', plaque: RABBIT, pivot: [6, 14], at: [0, 0, 0.5], eyes: RABBIT_EYES, hidden: true }, { name: 'mound', plaque: MOUND, pivot: [8, 5], at: [0, 0, 0.9] }] },
  },
  ducklings: {
    x: -47, s: 24.5 * STEP,
    figure: {
      name: 'ducklings',
      parts: [
        { name: 'duck1', plaque: DUCKLING, pivot: [4, 8], at: [-9, 0, 0.5] },
        { name: 'duck2', plaque: DUCKLING, pivot: [4, 8], at: [0, 0, 0.9] },
        { name: 'duck3', plaque: DUCKLING, pivot: [4, 8], at: [9, 0, 1.3] },
      ],
    },
  },
  bees: {
    x: 47, s: 36 * STEP,
    figure: {
      name: 'bees',
      parts: [
        { name: 'hive', plaque: HIVE, pivot: [7.5, 20], at: [0, 0, 0.5] },
        { name: 'bee1', plaque: BEE, pivot: [1.5, 1], at: [-9, 14, 0.9], loose: true },
        { name: 'bee2', plaque: BEE, pivot: [1.5, 1], at: [9, 10, 1.3], loose: true },
        { name: 'bee3', plaque: BEE, pivot: [1.5, 1], at: [3, 21, 1.7], loose: true },
      ],
    },
  },
  tortoise: {
    x: -46, s: 44.5 * STEP,
    figure: {
      name: 'tortoise',
      parts: [
        { name: 'feet', plaque: TORTOISE_FEET, pivot: [5, 1], at: [0, 0, 0.1], loose: true },
        { name: 'head', plaque: TORTOISE_HEAD, pivot: [5, 4], at: [-8, 5, 0.5] },
        { name: 'shell', plaque: SHELL, pivot: [9, 11], at: [0, 1, 0.9] },
      ],
    },
  },
  sheep: {
    x: 48, s: 54.5 * STEP,
    figure: { name: 'sheep', parts: [{ name: 'fleece', plaque: FLEECE, pivot: [10, 14], at: [0, 0, 0.5] }, { name: 'head', plaque: SHEEP_HEAD, pivot: [4, 2], at: [-8, 11, 0.9], eyes: SHEEP_EYES }] },
  },
  caterpillar: {
    x: -45, s: 65 * STEP,
    figure: {
      name: 'caterpillar',
      parts: [
        { name: 'seg1', plaque: SEGMENT, pivot: [3, 6], at: [9, 0, 0.5] },
        { name: 'seg2', plaque: SEGMENT, pivot: [3, 6], at: [5, 0, 0.9] },
        { name: 'seg3', plaque: SEGMENT, pivot: [3, 6], at: [1, 0, 1.3] },
        { name: 'seg4', plaque: SEGMENT, pivot: [3, 6], at: [-3, 0, 1.7] },
        { name: 'head', plaque: CATERPILLAR_HEAD, pivot: [3, 7], at: [-7, 0, 2.1] },
      ],
    },
  },
}

export const NEIGHBOUR_NAMES = Object.keys(NEIGHBOURS) as Neighbour[]

/** Where nothing of the setting may stand, so that nothing of it shares a place with a neighbour or with what an obstacle keeps beside the trail: boxes of pegs right of the middle and along the trail. */
export const KEPT_CLEAR: readonly { x0: number; x1: number; s0: number; s1: number }[] = [
  { x0: -400, x1: 400, s0: ZONES.stream.from - 6, s1: ZONES.stream.to + 6 },
  { x0: -110, x1: -TRAIL_HALF, s0: ZONES.branch.mid - 14, s1: ZONES.branch.mid + 14 },
  { x0: TRAIL_HALF, x1: 80, s0: ZONES.mud.from + 24, s1: ZONES.mud.from + 54 },
  { x0: THICKET_AT - 22, x1: -TRAIL_HALF, s0: ZONES.brambles.mid - 12, s1: ZONES.brambles.mid + 12 },
  { x0: TRAIL_HALF, x1: 66, s0: ZONES.log.mid - 10, s1: ZONES.log.mid + 10 },
  { x0: -GATE_HALF - 12, x1: GATE_HALF + 12, s0: PLACES.shelf - SHELF_BEFORE - 4, s1: PLACES.shelf },
  ...NEIGHBOUR_NAMES.map((name) => ({ x0: NEIGHBOURS[name].x - 18, x1: NEIGHBOURS[name].x + 18, s0: NEIGHBOURS[name].s - 10, s1: NEIGHBOURS[name].s + 10 })),
]

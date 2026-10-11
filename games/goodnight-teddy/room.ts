import { BEAR, PARTS, inEllipse, partAt, topAt } from './bear'
import type { Point } from './input'
import type { BlanketAt, Phase, PyjamasAt, Wearer } from './save'
import { STAGE } from './stage'

// Where everything in the room stands, in stage units, and what a touch at a point lands on. One room: the bath on
// the left, Teddy in the middle, the bed on the right. No canvas here; the painter, the layers and the game all
// read it, so what is drawn, what is touched and what is tested never disagree.

/** The middle of Teddy's seat on the rug. His own units (bear.ts) start here. */
export const TEDDY = { x: 600, y: 744 } as const

/** Where the wall meets the floor. */
export const FLOOR = 566

/** The five carried things. The three wash things always go home; the two cloths stay where they are let go. */
export type WashId = 'soap' | 'jug' | 'towel'
export type ClothId = 'pyjamas' | 'blanket'
export type ThingId = WashId | ClothId
export const WASH_IDS: readonly WashId[] = ['soap', 'jug', 'towel']
export const CLOTH_IDS: readonly ClothId[] = ['pyjamas', 'blanket']
export const THING_IDS: readonly ThingId[] = ['soap', 'jug', 'towel', 'pyjamas', 'blanket']
export const isCloth = (id: ThingId): id is ClothId => id === 'pyjamas' || id === 'blanket'

export type Spot = Point & { /** Half the width and half the height of what a finger can land on. */ rx: number; ry: number }

export const HOMES: Record<ThingId, Spot> = {
  soap: { x: 322, y: 492, rx: 56, ry: 50 },
  jug: { x: 270, y: 318, rx: 58, ry: 62 },
  towel: { x: 112, y: 296, rx: 66, ry: 92 },
  pyjamas: { x: 962, y: 236, rx: 60, ry: 74 },
  blanket: { x: 892, y: 642, rx: 72, ry: 50 },
}

export const LAMP: Spot = { x: 1104, y: 318, rx: 62, ry: 62 }
export const DUCK: Spot = { x: 166, y: 506, rx: 68, ry: 60 }
export const CAT: Spot = { x: 968, y: 478, rx: 66, ry: 88 }
/** Where the cat sits while Teddy sleeps: at the foot of the bed, under the curtain. */
export const CAT_NIGHT_X = 812

export const TUB = { left: 14, right: 356, rim: 540, water: 552, bottom: 738 } as const
export const BED = { left: 786, right: 1180, top: 566, bottom: 760 } as const
export const DOOR = { left: 372, right: 520, top: 150, bottom: FLOOR, glass: { left: 394, right: 498, top: 176, bottom: 356 } } as const
export const WINDOW = { left: 690, right: 884, top: 92, bottom: 330 } as const
/** The curtain as a finger finds it, and the door. Both are large and clear of the home control and the corner. */
export const CURTAIN: Spot = { x: 787, y: 222, rx: 122, ry: 148 }
export const DOORWAY: Spot = { x: 446, y: 358, rx: 74, ry: 200 }
/** The night-light on the wall behind the rug, which glows while Teddy sleeps. */
export const NIGHT_LIGHT = { x: 604, y: 512 } as const

/** The jam's round home control: 48 across, at the top centre, 10 from the top edge. Nothing a child can touch rests under it. */
export const HOME_CONTROL = { x: STAGE.width / 2, y: 34, r: 24 } as const
/** The grown-up's corner at the top right (overlay.ts). */
export const GROWN_UP = { left: STAGE.width - 72, bottom: 72 } as const
/** Wrists rest on the bottom strip: nothing essential sits in it. */
export const WRIST_STRIP = STAGE.height - 60

/** Where Teddy is and how large: sitting on the rug, lying in bed, or pressed to the door's glass from outside. */
export type Stance = { x: number; y: number; scale: number; turn: number }
export const SITTING: Stance = { x: TEDDY.x, y: TEDDY.y, scale: 1, turn: 0 }
/** Lying with his head on the pillow at the right; his own up is the stage's right. */
export const LYING: Stance = { x: 933, y: 506, scale: 0.46, turn: Math.PI / 2 }
/** Outside: only his head shows, filling the door's glass. The point is where his seat would be. */
export const AT_GLASS: Stance = { x: 446, y: 408, scale: 0.4, turn: 0 }
/** Far out in the garden, small, seen through the glass. */
export const IN_GARDEN: Stance = { x: 446, y: 338, scale: 0.16, turn: 0 }
/** On the floor in front of the door, on his way out or in. */
export const AT_DOOR: Stance = { x: 446, y: 640, scale: 0.7, turn: 0 }
/** The mound Teddy makes in bed under the blanket, as a finger and the overlap tests find it. */
export const SLEEPER: Spot = { x: 1002, y: 506, rx: 112, ry: 68 }

/** Where a cloth lies and can be picked up, for each place it can be. On Teddy it is found by his shape, not by this spot. */
export const CLOTH_SPOTS: Record<ClothId, Record<string, Spot>> = {
  pyjamas: {
    peg: HOMES.pyjamas,
    teddy: { x: TEDDY.x, y: TEDDY.y - 176, rx: 150, ry: 130 },
    duck: DUCK,
    cat: { x: CAT.x, y: CAT.y + 46, rx: 64, ry: 50 },
    lamp: LAMP,
    // The raft on the water, under the duck.
    tub: { x: 166, y: 556, rx: 120, ry: 34 },
  },
  blanket: {
    bed: HOMES.blanket,
    teddy: { x: TEDDY.x, y: TEDDY.y - 150, rx: 190, ry: 150 },
    duck: DUCK,
    cat: CAT,
    lamp: LAMP,
    // Sunk, with one corner over the rim of the tub.
    tub: { x: 230, y: 632, rx: 56, ry: 62 },
  },
}

/** The blanket as a dome on the bath water, under the duck: it stands as high as it is swollen. */
export const blanketDome = (swell: number): Spot => ({ x: DUCK.x, y: TUB.water + 14 - swell * 46, rx: 118, ry: Math.max(30, swell * 46 + 16) })

/** How far the duck is lifted when it rides the raft, and when it sits tucked in on the rim. */
export const DUCK_LIFT = { raft: 24, rim: 14, dome: 104 } as const

export type Who = 'teddy' | 'duck' | 'cat' | 'lamp'
export type Hit =
  | { kind: 'thing'; id: ThingId }
  | { kind: 'who'; id: Who }
  | { kind: 'tub' }
  | { kind: 'curtain' }
  | { kind: 'door' }
  | { kind: 'room' }

/** What a touch needs to know of the room as it stands. */
export type World = {
  phase: Phase
  blanket: BlanketAt
  pyjamas: PyjamasAt
  /** Things that are out of their place (in the hand or in the air) and cannot be picked up from it. */
  away: readonly ThingId[]
  /** Teddy is sitting on the rug where a finger can reach him: false while a scene moves him. */
  sitting: boolean
  /** Where the cat sits now. */
  catX: number
  /** How far the blanket is swollen into a dome on the bath water under the duck, from 0 to a little over 1; 0 once it has sunk. */
  dome?: number
}

export function inSpot(spot: Spot, at: Point, grow = 0): boolean {
  const u = (at.x - spot.x) / (spot.rx + grow), v = (at.y - spot.y) / (spot.ry + grow)
  return u * u + v * v <= 1
}

/** A stage point in Teddy's own units, as he sits on the rug. */
export function toBear(at: Point): Point {
  return { x: at.x - TEDDY.x, y: at.y - TEDDY.y }
}

export function onTeddy(at: Point, grow = 0): boolean {
  const p = toBear(at)
  return p.x >= BEAR.left - grow && p.x <= -BEAR.left + grow && partAt(p.x, p.y, grow) !== null
}

/** Whether a point of him, in his own units, is under the cloth he wears: all but his head under the blanket, his trunk and arms under the pyjamas. */
export function coveredBy(cloth: ClothId, x: number, y: number): boolean {
  const part = partAt(x, y)
  if (part === null || part === 'head') return false
  if (cloth === 'blanket') return true
  return part !== 'body' || inEllipse(PARTS.body[0], x, y)
}

/** Whether a cell or a point of his coat can be reached by a wash thing or a finger, given what he wears. */
export function reachable(x: number, y: number, world: Pick<World, 'blanket' | 'pyjamas'>): boolean {
  if (world.blanket === 'teddy' && coveredBy('blanket', x, y)) return false
  if (world.pyjamas === 'teddy' && coveredBy('pyjamas', x, y)) return false
  return true
}

export const catSpot = (world: Pick<World, 'catX'>): Spot => ({ ...CAT, x: world.catX })
export const duckSpot = (world: Pick<World, 'blanket' | 'pyjamas' | 'dome'>): Spot => ({ ...DUCK, y: DUCK.y - (world.pyjamas === 'tub' ? DUCK_LIFT.raft : world.blanket === 'duck' ? DUCK_LIFT.rim : world.blanket === 'tub' ? (world.dome ?? 0) * DUCK_LIFT.dome : 0) })

/** Where a cloth rests and is picked up, given where it is. On the cat it goes where the cat is. */
export function clothSpot(id: ClothId, world: Pick<World, 'blanket' | 'pyjamas' | 'catX' | 'dome'>): Spot {
  const place = world[id], spot = CLOTH_SPOTS[id][place]
  // While it is a dome on the water it is picked up where it is drawn; once sunk, by its corner over the rim.
  if (id === 'blanket' && place === 'tub' && world.dome) return blanketDome(world.dome)
  return place === 'cat' ? { ...spot, x: world.catX } : spot
}

/** Whether a finger at a point lands on the cloth where it lies now. */
function onCloth(id: ClothId, at: Point, world: World): boolean {
  const place = world[id]
  if (place === 'teddy') {
    // While he sleeps or a scene moves him, what he wears stays on him.
    if (!world.sitting || world.phase !== 'evening') return false
    const p = toBear(at)
    if (partAt(p.x, p.y, 6) === null) return false
    if (id === 'pyjamas' && world.blanket === 'teddy') return false
    return coveredBy(id, p.x, p.y)
  }
  return inSpot(clothSpot(id, world), at)
}

/**
 * What a finger lands on. A carried thing comes before whoever it lies on or stands near, and a thing that is out
 * of its place (`away`) cannot be picked up from it.
 */
export function whatAt(at: Point, world: World): Hit {
  for (const id of WASH_IDS) if (!world.away.includes(id) && inSpot(HOMES[id], at)) return { kind: 'thing', id }
  // The duck on its raft is above the pyjamas, not beneath them.
  if (world.pyjamas === 'tub' && inSpot(duckSpot(world), at) && at.y < CLOTH_SPOTS.pyjamas.tub.y - CLOTH_SPOTS.pyjamas.tub.ry) return { kind: 'who', id: 'duck' }
  // The duck on top of the dome is above the blanket too.
  if (world.dome && world.blanket === 'tub' && inSpot(duckSpot(world), at) && at.y < duckSpot(world).y + 24) return { kind: 'who', id: 'duck' }
  for (const id of ['blanket', 'pyjamas'] as const) if (!world.away.includes(id) && onCloth(id, at, world)) return { kind: 'thing', id }
  if (inSpot(LAMP, at)) return { kind: 'who', id: 'lamp' }
  if (inSpot(duckSpot(world), at)) return { kind: 'who', id: 'duck' }
  if (inSpot(catSpot(world), at)) return { kind: 'who', id: 'cat' }
  if (world.phase === 'evening' && world.sitting && onTeddy(at, 6)) return { kind: 'who', id: 'teddy' }
  if (world.phase === 'night' && inSpot(SLEEPER, at)) return { kind: 'who', id: 'teddy' }
  if (inSpot(CURTAIN, at)) return { kind: 'curtain' }
  if (world.phase !== 'evening' && inSpot(DOORWAY, at)) return { kind: 'door' }
  if (inTub(at)) return { kind: 'tub' }
  return { kind: 'room' }
}

/** The bath as a place to put something in or splash: its water and its front. */
export function inTub(at: Point): boolean {
  return at.x > TUB.left + 8 && at.x < TUB.right - 8 && at.y > TUB.rim - 24 && at.y < TUB.bottom - 20
}

/** Who or what a carried thing is over, for the soap, the towel and a cloth let go: the small ones before the large. */
export function targetAt(at: Point, world: World): Wearer | null {
  if (inSpot(duckSpot(world), at, 16)) return 'duck'
  if (inSpot(catSpot(world), at, 12)) return 'cat'
  if (inSpot(LAMP, at, 18)) return 'lamp'
  if (world.phase === 'evening' && world.sitting && onTeddy(at, 30)) return 'teddy'
  if (inTub(at)) return 'tub'
  return null
}

/** Where the jug's water lands when it falls from `top` straight down at `x`: on whom, and at what height. */
export function landingOf(x: number, top: number, world: World): { on: Wearer | 'floor'; y: number } {
  const hits: { on: Wearer | 'floor'; y: number }[] = []
  const under = (spot: Spot): number | null => {
    const u = (x - spot.x) / spot.rx
    return Math.abs(u) < 1 ? spot.y - spot.ry * Math.sqrt(1 - u * u) : null
  }
  const lamp = under(LAMP), duck = under(duckSpot(world)), cat = under(catSpot(world))
  if (lamp !== null) hits.push({ on: 'lamp', y: lamp + 16 })
  if (duck !== null) hits.push({ on: 'duck', y: duck + 14 })
  if (cat !== null) hits.push({ on: 'cat', y: cat + 10 })
  if (world.phase === 'evening' && world.sitting) {
    const land = topAt(x - TEDDY.x)
    if (land !== null) hits.push({ on: 'teddy', y: TEDDY.y + land })
  }
  if (x > TUB.left + 8 && x < TUB.right - 8) hits.push({ on: 'tub', y: TUB.water })
  // The nearest thing below the spout; water let go beside or below everything falls to the floor.
  const below = hits.filter((hit) => hit.y > top - 40).sort((a, b) => a.y - b.y)[0]
  return below ? { on: below.on, y: Math.max(below.y, top) } : { on: 'floor', y: x > BED.left ? BED.top + 30 : STAGE.height - 64 }
}

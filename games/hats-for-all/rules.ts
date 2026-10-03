import { MOST, TOWER_FALLS_AT, type CreatureKind, type HatKind } from './kinds'
import { holeX, nearestSpot, spotX } from './stage'

// The model of the world: who stands on the mat, which hat is where, and what
// each thing the child can do changes. No renderer and no DOM. Every function
// returns a new world and a list of what happened, which the view and the
// sound play; nothing here knows how any of it looks.
//
// The idea the model holds is one hat on one head (ART.md, "The
// representation"). A hat is in its hole in the tile, on a head, or loose on
// the floor, and never anywhere else. Nothing is refused: every move works,
// and a move that takes the world further from one each is a slip, counted
// only for the hidden position and never shown.

export type Creature = {
  kind: CreatureKind
  /** Which of the five spots of the row it stands on. It keeps its spot when another creature leaves. */
  spot: number
  /** The hats on its head, from the bottom up, each by its hole in the tile. */
  hats: number[]
}

/** A hat lying on the floor with nobody under it, beside a spot of the row. */
export type Loose = { hat: number; spot: number }

/** The changes a cycle can hold: one more creature walks in, or one walks out. Always one creature at a time. */
export type Change = 'come' | 'leave'

export type World = {
  /** The creatures on the mat, in the order of their spots. */
  crew: Creature[]
  /** This cycle's hats, in the order of their holes. A hat is named by its hole. */
  tile: HatKind[]
  loose: Loose[]
  /** The changes the cycle still holds, in order. */
  changes: Change[]
  /** Who comes, while a `come` is held. */
  guest: CreatureKind | null
  /** The spot of the one who leaves, while a `leave` is held. */
  leaver: number | null
  /** The slips of this cycle, capped, read only when the cycle is judged. */
  slips: number
}

export type Place = { at: 'tile' } | { at: 'loose'; spot: number } | { at: 'head'; spot: number; level: number }

/** Where the child lets a dragged hat go. */
export type Drop = { on: 'head'; spot: number } | { on: 'tile' } | { on: 'floor'; spot: number }

export type Happened =
  | { type: 'hatMoved'; hat: number; from: Place; to: Place }
  /** A hat landed on this creature: it reacts to exactly this hat. */
  | { type: 'wore'; spot: number; hat: number }
  /** This creature's last hat left it. */
  | { type: 'bared'; spot: number }
  /** The third hat on one head: the tower falls and every hat of it goes home. */
  | { type: 'towerFell'; spot: number; hats: number[] }
  /** A bare creature was tapped and no hat is free: it pats its head and looks into the holes. */
  | { type: 'noHat'; spot: number }
  /** A hatted creature was tapped: it does its own trick with this hat. */
  | { type: 'trick'; spot: number; hat: number }
  | { type: 'came'; spot: number; kind: CreatureKind }
  | { type: 'left'; spot: number; kind: CreatureKind }
  | { type: 'slip' }

export type Outcome = { world: World; happened: Happened[] }

export const MOST_SLIPS = 9

function copy(world: World): World {
  return {
    ...world,
    crew: world.crew.map((creature) => ({ ...creature, hats: [...creature.hats] })),
    tile: [...world.tile],
    loose: world.loose.map((loose) => ({ ...loose })),
    changes: [...world.changes],
  }
}

export function creatureAt(world: World, spot: number): Creature | undefined {
  return world.crew.find((creature) => creature.spot === spot)
}

/** Where a hat is. A hat that is on no head and not loose is in its hole. */
export function placeOf(world: World, hat: number): Place {
  for (const creature of world.crew) {
    const level = creature.hats.indexOf(hat)
    if (level >= 0) return { at: 'head', spot: creature.spot, level }
  }
  const loose = world.loose.find((entry) => entry.hat === hat)
  return loose ? { at: 'loose', spot: loose.spot } : { at: 'tile' }
}

export function hatsInTile(world: World): number[] {
  return world.tile.map((_, hat) => hat).filter((hat) => placeOf(world, hat).at === 'tile')
}

export function bareSpots(world: World): number[] {
  return world.crew.filter((creature) => creature.hats.length === 0).map((creature) => creature.spot)
}

/** How far the world is from one each: the heads without exactly one hat, and the hats with nobody under them. */
export function off(world: World): number {
  return world.crew.filter((creature) => creature.hats.length !== 1).length + world.loose.length
}

/** As paired as it can be: no tower, no loose hat, and either no head is bare or no hat is left to give. */
export function settled(world: World): boolean {
  if (world.loose.length > 0 || world.crew.some((creature) => creature.hats.length > 1)) return false
  return bareSpots(world).length === 0 || hatsInTile(world).length === 0
}

/** Every head has exactly one hat, no hat is loose and no change is held: the crew parades. */
export function ready(world: World): boolean {
  return world.crew.length > 0 && world.changes.length === 0 && settled(world) && bareSpots(world).length === 0
}

/** The change that is due now, if one is: the cycle's next change comes when the crew is as paired as it can be. */
export function changeDue(world: World): Change | null {
  return world.changes.length > 0 && settled(world) ? world.changes[0] : null
}

function hatX(world: World, hat: number): number {
  const place = placeOf(world, hat)
  return place.at === 'tile' ? holeX(hat, world.tile.length) : spotX(place.spot)
}

/** The bare head nearest to this x; the lower spot wins a tie. */
function nearestBare(world: World, x: number): number | null {
  let best: number | null = null
  for (const spot of bareSpots(world)) if (best === null || Math.abs(spotX(spot) - x) < Math.abs(spotX(best) - x)) best = spot
  return best
}

function take(world: World, hat: number): void {
  for (const creature of world.crew) creature.hats = creature.hats.filter((worn) => worn !== hat)
  world.loose = world.loose.filter((entry) => entry.hat !== hat)
}

/** Puts a hat down, from wherever it was. The one place a hat moves, so a hat is never in two places. */
function move(world: World, hat: number, to: Drop, happened: Happened[]): void {
  const from = placeOf(world, hat)
  take(world, hat)
  if (to.on === 'floor') world.loose.push({ hat, spot: to.spot })
  const wearer = to.on === 'head' ? creatureAt(world, to.spot) : undefined
  if (wearer) wearer.hats.push(hat)
  happened.push({ type: 'hatMoved', hat, from, to: placeOf(world, hat) })
  if (from.at === 'head' && creatureAt(world, from.spot)?.hats.length === 0) happened.push({ type: 'bared', spot: from.spot })
  if (!wearer) return
  if (wearer.hats.length < TOWER_FALLS_AT) {
    happened.push({ type: 'wore', spot: wearer.spot, hat })
    return
  }
  const fallen = wearer.hats
  wearer.hats = []
  happened.push({ type: 'towerFell', spot: wearer.spot, hats: fallen })
}

/** A move of the child's is done: it is a slip when it left the world further from one each than it found it. */
function done(before: World, world: World, happened: Happened[]): Outcome {
  if (off(world) > off(before)) {
    world.slips = Math.min(MOST_SLIPS, world.slips + 1)
    happened.push({ type: 'slip' })
  }
  return { world, happened }
}

/**
 * The child taps a hat. A hat on a head goes home. A hat in the tile or loose
 * on the floor goes to the nearest bare head; with no bare head a hat in the
 * tile comes out loose and a loose hat goes home.
 */
export function tapHat(before: World, hat: number): Outcome {
  if (hat < 0 || hat >= before.tile.length) return { world: before, happened: [] }
  const world = copy(before), happened: Happened[] = []
  const place = placeOf(world, hat)
  if (place.at === 'head') {
    // Any hat of a tower stands for the one on top: that is the one a finger can lift.
    const worn = creatureAt(world, place.spot)!.hats
    move(world, worn[worn.length - 1], { on: 'tile' }, happened)
    return done(before, world, happened)
  }
  const bare = nearestBare(world, hatX(world, hat))
  if (bare !== null) move(world, hat, { on: 'head', spot: bare }, happened)
  else if (place.at === 'tile') move(world, hat, { on: 'floor', spot: nearestSpot(holeX(hat, world.tile.length)) }, happened)
  else move(world, hat, { on: 'tile' }, happened)
  return done(before, world, happened)
}

/**
 * The child taps a creature. A bare one calls the nearest hat that is free,
 * from the tile first and from the floor after that. A hatted one does its
 * trick with the hat it wears.
 */
export function tapCreature(before: World, spot: number): Outcome {
  const creature = creatureAt(before, spot)
  if (!creature) return { world: before, happened: [] }
  if (creature.hats.length > 0) return { world: before, happened: [{ type: 'trick', spot, hat: creature.hats[creature.hats.length - 1] }] }
  const near = (hats: number[]) => hats.reduce<number | null>((best, hat) => (best === null || Math.abs(hatX(before, hat) - spotX(spot)) < Math.abs(hatX(before, best) - spotX(spot)) ? hat : best), null)
  const hat = near(hatsInTile(before)) ?? near(before.loose.map((entry) => entry.hat))
  if (hat === null) return { world: before, happened: [{ type: 'noHat', spot }] }
  const world = copy(before), happened: Happened[] = []
  move(world, hat, { on: 'head', spot }, happened)
  return done(before, world, happened)
}

/** The child drags a hat and lets it go: on a head, on the tile, or anywhere else on the floor. */
export function dropHat(before: World, hat: number, to: Drop): Outcome {
  if (hat < 0 || hat >= before.tile.length) return { world: before, happened: [] }
  const from = placeOf(before, hat)
  // Let go where it already was: nothing changed, and the view answers the touch with a wobble.
  if (to.on === 'tile' && from.at === 'tile') return { world: before, happened: [] }
  if (to.on === 'head' && (!creatureAt(before, to.spot) || (from.at === 'head' && from.spot === to.spot))) return { world: before, happened: [] }
  const world = copy(before), happened: Happened[] = []
  move(world, hat, to, happened)
  return done(before, world, happened)
}

/** The free spot a creature who comes takes: the one after the last of the row, or the one before the first when the row reaches the end. */
export function freeSpot(world: World): number | null {
  if (world.crew.length === 0) return (MOST - 1) / 2
  const spots = world.crew.map((creature) => creature.spot)
  const after = Math.max(...spots) + 1, before = Math.min(...spots) - 1
  if (after < MOST) return after
  if (before >= 0) return before
  for (let spot = 0; spot < MOST; spot++) if (!spots.includes(spot)) return spot
  return null
}

/**
 * The cycle's next change, which is not a move of the child's and is never a
 * slip. One creature walks in bare, or one walks out and leaves its hat loose
 * on its spot. A change that cannot happen (the mat is full, or the last
 * creature would leave) is dropped.
 */
export function applyChange(before: World): Outcome {
  const change = changeDue(before)
  if (!change) return { world: before, happened: [] }
  const world = copy(before), happened: Happened[] = []
  world.changes.shift()
  if (change === 'come') {
    const spot = freeSpot(world), kind = world.guest
    world.guest = null
    if (spot === null || kind === null || world.crew.length >= MOST) return { world, happened }
    world.crew.push({ kind, spot, hats: [] })
    world.crew.sort((a, b) => a.spot - b.spot)
    happened.push({ type: 'came', spot, kind })
    return { world, happened }
  }
  const leaver = creatureAt(world, world.leaver ?? -1) ?? world.crew[world.crew.length - 1]
  world.leaver = null
  if (world.crew.length <= 1) return { world, happened }
  world.crew = world.crew.filter((creature) => creature !== leaver)
  for (const hat of leaver.hats) {
    world.loose.push({ hat, spot: leaver.spot })
    happened.push({ type: 'hatMoved', hat, from: { at: 'head', spot: leaver.spot, level: 0 }, to: { at: 'loose', spot: leaver.spot } })
  }
  happened.push({ type: 'left', spot: leaver.spot, kind: leaver.kind })
  return { world, happened }
}

/** How a finished cycle went (ART.md, "The designed order"): no slip or one is well, four or more is badly. */
export function judge(slips: number): 'well' | 'mixed' | 'badly' {
  return slips <= 1 ? 'well' : slips <= 3 ? 'mixed' : 'badly'
}

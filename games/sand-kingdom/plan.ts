import { type Field, base, builtNear, heightAt } from './field'
import { STAR_REACH, crabRounds, crabTurn, starClearOf, starGap } from './solid'
import { BEACH, FIXED, HANDLE_BOW, type Patch, type Things, bucketPatch, isClear, patchesOf, reach, woodEnds, woodPatches } from './things'
import { type Point, type Water, dugShare, tallest, wall } from './water'

// What the beach holds for each of the sea folk at evening, read from the
// sand, the water and where the things lie. Each has one fixed need, and
// this says where that need is met, or what stands in for it. Nothing here
// moves anyone: folk.ts walks them there, each in its own way.

/** How far out from a groove's middle the crab walks: on the bank, clear of the water. */
export const BANK_WALK = 1.05
/** How big the crab is on the sand, as a patch. */
export const CRAB_PATCH = 0.95
/** How high the crab's back is above the sand it stands on. */
export const CRAB_BACK = 1.1
/** The patch of sand a gull on a wall takes up, and the sand in front of it that it may slide off onto. */
export const GULL_PATCH = 0.6
/** The sand the gulls on a wall take up: where each stands, and in front of each, where one that finds no flat slides off. */
export function wallPatches(perches: readonly Point[]): Patch[] {
  return perches.flatMap((perch) => [{ x: perch.x, z: perch.z, r: GULL_PATCH }, { x: perch.x, z: perch.z + 0.6, r: 0.5 }])
}
/** How much room the crab keeps between its legs and claws and what lies beside its way. */
export const CRAB_GAP = 0.12

export type CrabPlan =
  /** Nothing dug for it: it stays at its day place, walking its empty ring. */
  | { kind: 'home' }
  /**
   * A closed ring of groove: it patrols the bank all the way round. `wet` says the water reached it. `open` says
   * that a rock, or something that lies right across its bank with no way round, keeps it from part of the bank:
   * its line is then the rest, which it walks from end to end and back. The ring is whole all the same.
   */
  | { kind: 'ring'; path: Point[]; wet: boolean; open: boolean }
  /**
   * A groove that closes no ring: it walks the bank to the end, which is the gap, and back. `ends` says of the
   * first and the last point of its line whether the groove ends there: where a rock stops its line short of the
   * groove's end, that is no gap.
   */
  | { kind: 'groove'; path: Point[]; wet: boolean; ends: readonly [boolean, boolean] }

export type StarPlan =
  | { on: 'rock' }
  /** The tallest tower: where its top is. */
  | { on: 'tower'; x: number; z: number }
  /** No tower, and the crab is out walking a bank: its back is the highest place there is. */
  | { on: 'crab' }

export type EelPlan =
  | { kind: 'rock' }
  /**
   * A groove with water in it. `bridge` is where along it driftwood lies across, or null; `wood` is driftwood
   * lying near, to poke. `rests` is where it comes up beyond the bridge, toward the start of its line and toward
   * the end: with a bridge, one of the two at least is a place.
   */
  | { kind: 'groove'; path: Point[]; bridge: number | null; wood: Point | null; rests: readonly [number | null, number | null] }

export type GullPlan =
  | { kind: 'log' }
  /** Raised sand long enough for three: flat, it holds them; lumpy, it holds the first. */
  | { kind: 'wall'; perches: Point[]; flat: boolean }

/** The eel's head and neck as rounds along the way it faces: how far along from the middle of its head, and how wide. Its neck is drawn as far back as the last of them. */
export const EEL_BODY: readonly (readonly [number, number])[] = [[0.35, 0.45], [0, 0.45], [-0.5, 0.4], [-1.0, 0.36], [-1.5, 0.36], [-2.0, 0.36]]
/** How near a bough or the bucket lies to any of it before it is under: a hand's width, so it is down before its neck is beneath the bark. */
export const EEL_LAIN = 0.15
/**
 * How much thinner a bough itself is than the patches it takes up on the sand, which hold its stub and room to
 * rock: the eel keeps clear of a bough lying anywhere by the patches, and of the one that lies still across its
 * own groove by the bough.
 */
const BARK = 0.22
/** How near the middle of its bridge a patch of driftwood is that is the bridge's own: the bough is 2.6 long. */
const BRIDGE_NEAR = 1.45
/**
 * Whether anything that lies on the beach is over any of the eel, from its nose to the end of its neck, with its
 * head at a point and facing `yaw`. `lies` says what lies within `r` of a point. `bridge` is the middle of the
 * bough across its groove, if there is one; `push` is how far its nose is pushed forward.
 */
export function eelUnder(x: number, z: number, yaw: number, lies: (x: number, z: number, r: number) => Patch | null, bridge: Point | null, push = 0): boolean {
  const fx = Math.sin(yaw), fz = Math.cos(yaw)
  return EEL_BODY.some(([along, r]) => {
    const px = x + fx * (along + push), pz = z + fz * (along + push)
    const found = lies(px, pz, r + EEL_LAIN)
    if (found === null) return false
    if (bridge === null || Math.hypot(found.x - bridge.x, found.z - bridge.z) > BRIDGE_NEAR) return true
    return lies(px, pz, r + EEL_LAIN - BARK) !== null
  })
}
/** Which way the eel faces at a whole point of its line, going `way` along it (as `pose` in folk.ts turns it). */
export function eelYaw(path: readonly Point[], index: number, way: number): number {
  const last = path.length - 1, before = path[Math.max(0, index - 1)], after = path[Math.min(last, index + 2)]
  return Math.atan2((after.x - before.x) * way, (after.z - before.z) * way)
}
/**
 * The nearest the eel comes up to a bough laid across its groove, in points of the groove's line, which lie half
 * a stride apart, and how many points further it looks for a place.
 */
export const EEL_PAST = 5
const EEL_TRIES = 5
/**
 * Where the eel comes up beyond the bough across its groove, on the side `way` of it: the nearest point at which
 * the whole of it, facing away from the bough, is out from under everything that lies there. Null where the
 * water on that side is too short for that, or something else lies over it.
 */
function eelRest(path: readonly Point[], bridge: number, way: number, lies: (x: number, z: number, r: number) => Patch | null): number | null {
  for (let off = EEL_PAST; off < EEL_PAST + EEL_TRIES; off++) {
    const index = bridge + way * off
    if (index < 0 || index > path.length - 1) return null
    if (!eelUnder(path[index].x, path[index].z, eelYaw(path, index, way), lies, path[bridge])) return index
  }
  return null
}

export type Plan = { crab: CrabPlan; star: StarPlan; eel: EelPlan; gulls: GullPlan; bored: boolean }

export const DAY_PLAN: Plan = { crab: { kind: 'home' }, star: { on: 'rock' }, eel: { kind: 'rock' }, gulls: { kind: 'log' }, bored: false }

function onBeach(point: Point, margin: number): boolean {
  return Math.abs(point.x) <= reach(point.z) - margin && point.z >= BEACH.z0 && point.z <= BEACH.z1
}

/** How the crab is turned at each point of a line it walks sideways along. */
function turnsAlong(path: readonly Point[], closed: boolean): number[] {
  const last = path.length - 1
  return path.map((_, index) => {
    const before = path[index > 0 ? index - 1 : closed ? last : 0], after = path[index < last ? index + 1 : closed ? 0 : last]
    return crabTurn(after.x - before.x, after.z - before.z)
  })
}

/**
 * Whether the crab can stand at a point of its line, turned as it is there: on the beach, with its legs and its
 * claws clear of everything that is taken. `rider` is the starfish on its back, whose arms reach out across the
 * frame however the crab is turned.
 */
function stands(point: Point, turn: number, taken: readonly Patch[], rider: boolean, field: Field, edge = 0.6): boolean {
  if (!(onBeach(point, edge) && Number.isFinite(turn))) return false
  const own = crabRounds({ x: point.x, z: point.z, turn })
  if (rider) own.push({ x: point.x - 0.78, z: point.z, r: 0.62 }, { x: point.x + 0.78, z: point.z, r: 0.62 })
  // Sand built up into a tower or a wall is in its way like a rock: it goes round it.
  return isClear(own, taken, CRAB_GAP) && own.every((round) => builtNear(field, round.x, round.z, round.r + CRAB_GAP) === null)
}

/** How far out from its line the crab steps to go round what lies on its bank. */
export const STEP_ROUND = 2.4
/** How near the edge of the beach it comes where it steps round a thing: nearer than its line ever runs. */
export const STEP_EDGE = 0.15
/**
 * Its line with every point that something lies on moved straight out, away from the water, to the nearest place
 * it can stand: a bucket, a bough or a tower on its bank is no gap, and it steps round it. `out` gives the way
 * out at a point. A point with no such place within reach is left where it is, for `walkable` to leave out.
 */
function steppedRound(line: readonly Point[], turns: readonly number[], out: (index: number) => Point, taken: readonly Patch[], rider: boolean, field: Field): Point[] {
  return line.map((point, index) => {
    if (!Number.isFinite(point.x) || stands(point, turns[index], taken, rider, field)) return point
    const way = out(index)
    for (let off = 0.15; off <= STEP_ROUND + 1e-6; off += 0.15) {
      const at = { x: point.x + way.x * off, z: point.z + way.z * off }
      if (stands(at, turns[index], taken, rider, field, STEP_EDGE)) return at
    }
    return point
  })
}

/** The longest run of a line that the crab can walk, and where in the line it begins: on the beach and clear of everything that is taken. */
function walkable(path: readonly Point[], taken: readonly Patch[], rider: boolean, field: Field, turns: readonly number[] = turnsAlong(path, false), line: readonly Point[] = path): { run: Point[]; from: number } {
  let best: Point[] = [], bestFrom = 0, run: Point[] = [], from = 0
  path.forEach((point, index) => {
    // A point that was stepped out round a thing may lie nearer the edge of the beach.
    if (stands(point, turns[index], taken, rider, field, point === line[index] ? undefined : STEP_EDGE)) {
      if (run.length === 0) from = index
      run.push(point)
    } else {
      if (run.length > best.length) {
        best = run
        bestFrom = from
      }
      run = []
    }
  })
  return run.length > best.length ? { run, from } : { run: best, from: bestFrom }
}

/** A line beside a groove's middle line, a bank's width out, on the side that keeps more of it walkable. */
function bank(path: readonly Point[], taken: readonly Patch[], rider: boolean, field: Field): { path: Point[]; ends: [boolean, boolean] } {
  let best: Point[] = [], ends: [boolean, boolean] = [true, true]
  for (const side of [1, -1]) {
    // A groove's middle line runs from cell to cell, in steps: which way the bank lies is read over two cells to
    // either side, so the crab's line is a curve and it does not turn its claws out at every step.
    const last = path.length - 1
    const line = path.map((point, index) => {
      const from = path[Math.max(0, index - 2)], to = path[Math.min(last, index + 2)]
      const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz) || 1
      const at = { x: point.x - (dz / length) * BANK_WALK * side, z: point.z + (dx / length) * BANK_WALK * side }
      // Where a step in the middle line leaves it nearer the groove than a bank's width, it is moved straight out from the groove.
      for (let pass = 0; pass < 3; pass++) {
        let near = path[0]
        for (const other of path) if (Math.hypot(other.x - at.x, other.z - at.z) < Math.hypot(near.x - at.x, near.z - at.z)) near = other
        const off = Math.hypot(near.x - at.x, near.z - at.z)
        if (off >= BANK_WALK * 0.98 || off < 1e-6) break
        at.x = near.x + ((at.x - near.x) / off) * BANK_WALK
        at.z = near.z + ((at.z - near.z) / off) * BANK_WALK
      }
      return at
    })
    // On the inside of a tight bend the line would fall into the groove itself: only the part of it that keeps a bank's width from the water is walked.
    const dry = line.map((point) => (path.every((other) => Math.hypot(other.x - point.x, other.z - point.z) >= BANK_WALK * 0.9) ? point : { x: NaN, z: NaN }))
    // What lies on the bank is stepped round, further from the water: the way out at a point is away from the groove.
    const away = (index: number): Point => {
      const at = dry[index]
      let near = path[0]
      for (const other of path) if (Math.hypot(other.x - at.x, other.z - at.z) < Math.hypot(near.x - at.x, near.z - at.z)) near = other
      const off = Math.hypot(at.x - near.x, at.z - near.z) || 1
      return { x: (at.x - near.x) / off, z: (at.z - near.z) / off }
    }
    // It steps out sideways as it is turned on its line, and is held to that: on the way out and back in it goes on
    // as it is turned wherever turning would swing a leg over the thing.
    const turns = turnsAlong(dry, false)
    const round = steppedRound(dry, turns, away, taken, rider, field)
    const { run, from } = walkable(round, taken, rider, field, turns, dry)
    if (run.length > best.length) {
      best = run
      // The line ends at the groove's own end where it is walked to within a step of the last of it.
      ends = [from <= 1, from + run.length >= round.length - 1]
    }
  }
  return { path: best, ends }
}

/**
 * The tallest tower, where the starfish can lie on it: the bucket standing by a tower is a thing like any other,
 * and the starfish lies with a gap between its arms turned to it and the two arms parted. Where the bucket
 * stands or lies so near that there is no room even so, the tower is not a place for it: null.
 */
function towerFor(field: Field, things: Things): Point | null {
  const top = tallest(field)
  if (!top) return null
  const bucket = things.bucket, r = bucket.side ? bucketPatch(bucket).r : HANDLE_BOW + 0.05
  if (Math.hypot(bucket.x - top.x, bucket.z - top.z) > STAR_REACH + r + 0.3) return top
  const lie = starGap(top, 0, -1, bucket)
  return starClearOf({ x: top.x, y: heightAt(field, top.x, top.z), z: top.z }, lie.turn, lie.gap, { x: bucket.x, z: bucket.z, r, top: Infinity }) ? top : null
}

export function planFor(field: Field, water: Water, things: Things): Plan {
  // The crab keeps clear of the two rocks, the log and whatever lies on the sand, but not of its own day place.
  const lying = patchesOf(things)
  // A shell is no obstacle to it: a shell in its way it picks up.
  // Where the gulls will stand is settled first: the crab walks round them as it walks round a rock.
  let gulls: GullPlan = { kind: 'log' }
  // The tower the starfish will lie on is the starfish's: its arms reach out all round the top.
  const top = towerFor(field, things)
  const starRoom: Patch[] = top ? [{ x: top.x, z: top.z, r: STAR_REACH }] : []
  // They take a wall only where the sand they would stand on, and slide off onto, is clear of what lies there
  // and of the starfish on its tower. What keeps them off a row: the bucket, a shell or a bough lying on it or
  // on the sand just in front of it, a rock, or the reach of the starfish's arms. Then they take the next best
  // row that is clear, and stay on their log only when no row of any wall is.
  const taken = [...lying, ...starRoom]
  const row = wall(field, (perches) => isClear(wallPatches(perches), taken))
  if (row) gulls = { kind: 'wall', perches: row.perches, flat: row.flat }
  const forCrab = [...FIXED, bucketPatch(things.bucket), ...things.wood.flatMap(woodPatches), ...(gulls.kind === 'wall' ? wallPatches(gulls.perches) : [])]
  // With no tower the starfish will ride it: its line is then one that the two of them can walk.
  const rider = top === null
  let crab: CrabPlan = { kind: 'home' }
  const rings = water.grooves.filter((groove) => groove.ring !== null)
  const ring = rings.find((groove) => groove.arrives < Infinity) ?? rings[0]
  if (ring) {
    // The ring's line is its middle; the crab walks a bank's width further out, all the way round where it can.
    let x = 0, z = 0
    for (const point of ring.ring!) {
      x += point.x
      z += point.z
    }
    x /= ring.ring!.length
    z /= ring.ring!.length
    const out = ring.ring!.map((point) => {
      const r = Math.hypot(point.x - x, point.z - z) || 1
      return { x: point.x + ((point.x - x) / r) * BANK_WALK, z: point.z + ((point.z - z) / r) * BANK_WALK }
    })
    const turns = turnsAlong(out, true)
    // A bucket, a bough or a tower on its bank is no gap in the ring: its line steps out round it, and where a
    // rock leaves no way round, that part of the line is left out and it walks the rest. It is still a ring.
    const middle = { x, z }
    const round = steppedRound(out, turns, (index) => {
      const r = Math.hypot(out[index].x - middle.x, out[index].z - middle.z) || 1
      return { x: (out[index].x - middle.x) / r, z: (out[index].z - middle.z) / r }
    }, forCrab, rider, field)
    const ok = round.map((point, index) => stands(point, turns[index], forCrab, rider, field, point === out[index] ? undefined : STEP_EDGE))
    if (ok.every(Boolean)) crab = { kind: 'ring', path: round, wet: ring.arrives < Infinity, open: false }
    else {
      // The longest stretch of the bank it can walk, taken round the ring from where it cannot stand.
      const count = round.length, first = ok.indexOf(false)
      let best: Point[] = [], run: Point[] = []
      for (let i = 1; i <= count; i++) {
        const index = (first + i) % count
        if (ok[index]) run.push(round[index])
        else {
          if (run.length > best.length) best = run
          run = []
        }
      }
      if (best.length >= 3) crab = { kind: 'ring', path: best, wet: ring.arrives < Infinity, open: true }
    }
  }
  if (crab.kind === 'home') {
    // No ring: the longest groove there is, walked to its end.
    let longest: Point[] = [], wet = false, ends: [boolean, boolean] = [true, true]
    for (const groove of water.grooves) {
      if (groove.path.length < 5) continue
      const line = bank(groove.path, forCrab, rider, field)
      if (line.path.length > longest.length) {
        longest = line.path
        ends = line.ends
        wet = groove.arrives < Infinity
      }
    }
    if (longest.length >= 4) crab = { kind: 'groove', path: longest, wet, ends }
  }

  // The tallest thing there is that the child does not pick up. A tower, if one stands. With none, the back of
  // the crab where the crab walks a bank, which then stands higher than anything else on the beach; and with
  // nothing dug at all, nothing is higher than where it already is.
  let star: StarPlan = { on: 'rock' }
  if (top) star = { on: 'tower', x: top.x, z: top.z }
  else if (crab.kind !== 'home') star = { on: 'crab' }

  let eel: EelPlan = { kind: 'rock' }
  let chosen = false
  // What lies on the beach in the eel's way, as the game tells the folk (`blocked` in play.ts), without the shells.
  const lies = (x: number, z: number, r: number): Patch | null => {
    for (const patch of FIXED) if (Math.hypot(patch.x - x, patch.z - z) < patch.r + r - 0.25) return patch
    const bucket = bucketPatch(things.bucket)
    if (Math.hypot(bucket.x - x, bucket.z - z) < bucket.r + r) return bucket
    for (const piece of things.wood) for (const patch of woodPatches(piece)) if (Math.hypot(patch.x - x, patch.z - z) < patch.r + r) return patch
    return null
  }
  for (const groove of water.grooves) {
    if (groove.arrives === Infinity || groove.path.length < 4) continue
    // Driftwood across it: a piece whose middle is over the groove and whose ends rest on the banks.
    let bridge: number | null = null, near: Point | null = null
    for (const wood of things.wood) {
      const [end, other] = woodEnds(wood)
      const across = dugShare(field, wood.x, wood.z, 0.35) > 0.3 && heightAt(field, end.x, end.z) > base(end.z) - 0.05 && heightAt(field, other.x, other.z) > base(other.z) - 0.05
      let nearest = 0
      groove.path.forEach((point, index) => {
        if (Math.hypot(point.x - wood.x, point.z - wood.z) < Math.hypot(groove.path[nearest].x - wood.x, groove.path[nearest].z - wood.z)) nearest = index
      })
      const apart = Math.hypot(groove.path[nearest].x - wood.x, groove.path[nearest].z - wood.z)
      if (across && apart < 0.6) bridge = nearest
      else if (apart < 2.6 && !near) near = { x: wood.x, z: wood.z }
    }
    // Where it comes up beyond the bough, on either side. A ditch with a bough across and no such place on
    // either side of it: all of the eel would lie under the water beside the wood, never seen. That is no water
    // for the eel, which keeps to another groove or to its rock, where it is seen.
    const rests: [number | null, number | null] = bridge === null ? [null, null] : [eelRest(groove.path, bridge, -1, lies), eelRest(groove.path, bridge, 1, lies)]
    if (bridge !== null && rests[0] === null && rests[1] === null) continue
    if (!chosen || bridge !== null) {
      eel = { kind: 'groove', path: groove.path, bridge, wood: bridge === null ? near : null, rests }
      chosen = true
      if (bridge !== null) break
    }
  }

  const bored = crab.kind === 'home' && star.on !== 'tower' && eel.kind === 'rock' && gulls.kind === 'log'
  return { crab, star, eel, gulls, bored }
}

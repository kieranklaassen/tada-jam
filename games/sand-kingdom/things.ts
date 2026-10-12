import { BUCKET_RADIUS } from './field'
import { CRAB_HOME, EEL_EXIT, EEL_ROCK, LOG, PEBBLES, STAR_ROCK } from './layout'
import { isRecord } from './state'

// The things the child picks up: one bucket, three shells and two pieces of
// driftwood. Where each lies and how is saved; everything else about them
// (a hop, a rock, a float) is of the moment and lives in play.ts.

export type Holds = 'nothing' | 'sand' | 'water'
export type Bucket = { x: number; z: number; holds: Holds; shell: boolean; side: boolean }
export type ShellState = 'lying' | 'pressed' | 'bucket' | 'tower'
export type Shell = { x: number; z: number; up: boolean; state: ShellState }
export type Wood = { x: number; z: number; turn: number }
export type Things = { bucket: Bucket; shells: Shell[]; wood: Wood[] }

export const SHELLS = 3
export const WOODS = 2
export const SHELL_RADIUS = 0.7
export const WOOD_HALF = 1.2
export const WOOD_RADIUS = 0.18
export const BUCKET_HEIGHT = 0.95
/** How far out from the middle of the bucket the bow of its handle runs: clear of the rim, which reaches 0.645. */
export const HANDLE_BOW = 0.7
/** How big each shell is drawn: no two the same. */
export const SHELL_SIZES: readonly number[] = [1.0, 0.88, 1.08]

/**
 * Where a thing may rest: the sand the frame shows, short of the sea by day and of the bottom strip. The frame
 * shows less of the beach the nearer it is to the child, so the sides come in toward the bottom (`reach`).
 */
export const BEACH = { x0: -6.1, x1: 6.1, z0: -2.2, z1: 7.4 } as const

/** How far to either side a thing may rest at this distance up the beach. */
export function reach(z: number): number {
  return z > 3 ? BEACH.x1 - (z - 3) * 0.3 : BEACH.x1
}

/** The nearest point of the beach to a point. */
export function keep(x: number, z: number): { x: number; z: number } {
  const kz = Math.min(BEACH.z1, Math.max(BEACH.z0, z)), side = reach(kz)
  return { x: Math.min(side, Math.max(-side, x)), z: kz }
}

/** A round patch of sand that something takes up. */
export type Patch = { x: number; z: number; r: number }

/**
 * The crab's day place: the ring it walks, and the sand to either side that its legs and claws reach over as it
 * goes round. Nothing is set down in it.
 */
export const CRAB_ROOM: readonly Patch[] = [
  { x: CRAB_HOME.x, z: CRAB_HOME.z, r: 1.55 },
  { x: CRAB_HOME.x - 1.25, z: CRAB_HOME.z + 0.1, r: 1.0 },
  { x: CRAB_HOME.x + 1.25, z: CRAB_HOME.z + 0.1, r: 1.0 },
]
/**
 * What never moves: the two rocks with the small ones at their feet, the pebbles beside them that a thing on the
 * beach could reach, and the gulls' log. Between them the patches hold every rock as it is drawn (solid.test.ts).
 */
export const FIXED: readonly Patch[] = [
  { x: STAR_ROCK.x, z: STAR_ROCK.z, r: 1.75 },
  { x: STAR_ROCK.x - 1.25, z: STAR_ROCK.z + 0.3, r: 0.8 },
  { x: STAR_ROCK.x + 1.3, z: STAR_ROCK.z + 0.25, r: 0.6 },
  { x: EEL_ROCK.x, z: EEL_ROCK.z, r: 2.3 },
  { x: EEL_ROCK.x + 1.95, z: EEL_ROCK.z + 0.4, r: 0.9 },
  { x: EEL_EXIT.x, z: EEL_EXIT.z, r: 1.0 },
  ...PEBBLES.filter(([x]) => Math.abs(x) < 7).map(([x, z, r]) => ({ x, z, r: r * 1.2 + 0.03 })),
  { x: LOG.x0 + 0.5, z: LOG.z, r: 0.9 },
  { x: (LOG.x0 + LOG.x1) / 2, z: LOG.z, r: 0.9 },
  { x: LOG.x1 - 0.5, z: LOG.z, r: 0.9 },
]
/** The places that are always taken: the crab's day place, the two rocks and the gulls' log. */
export const TAKEN: readonly Patch[] = [...CRAB_ROOM, ...FIXED]

/** A first visit: the bucket, the shells and the wood on the dry sand, well apart. The age sets only how the bucket stands. */
export function firstThings(childAge: number | null): Things {
  return {
    bucket: { x: 2.45, z: 5.45, holds: childAge !== null && childAge >= 5 ? 'nothing' : 'sand', shell: false, side: false },
    shells: [
      { x: -1.6, z: 7.2, up: true, state: 'lying' },
      { x: 0.2, z: 7.3, up: true, state: 'lying' },
      { x: 2.1, z: 7.2, up: true, state: 'lying' },
    ],
    // The two boughs lie as the sea threw them: each well off level, far from parallel, and not one above the
    // other, so that together they read as two boughs and as no sign.
    wood: [
      { x: -0.6, z: 5.35, turn: 0.55 },
      { x: 1.2, z: 4.1, turn: -0.75 },
    ],
  }
}

/**
 * The patches a piece of wood takes up: five along it, which between them hold the whole bough, from the tip of
 * one bleached end to the tip of the other, with its stub.
 */
export function woodPatches(wood: Wood): Patch[] {
  const ax = Math.cos(wood.turn), az = Math.sin(wood.turn)
  return [-0.9, -0.45, 0, 0.45, 0.9].map((along) => ({ x: wood.x + ax * along, z: wood.z + az * along, r: 0.42 }))
}
/** The two places a piece of wood rests on, one toward each end. */
export function woodEnds(wood: Wood): [{ x: number; z: number }, { x: number; z: number }] {
  const ax = Math.cos(wood.turn), az = Math.sin(wood.turn)
  return [{ x: wood.x - ax * 0.8, z: wood.z - az * 0.8 }, { x: wood.x + ax * 0.8, z: wood.z + az * 0.8 }]
}
export function bucketPatch(bucket: Bucket): Patch {
  // On its side it lies with its middle where it stood; the patch holds the whole of it with its handle, and the
  // sweep of its rim as it falls over and is stood up again.
  return { x: bucket.x, z: bucket.z, r: bucket.side ? BUCKET_RADIUS + 0.5 : BUCKET_RADIUS }
}
export function shellPatch(shell: Shell): Patch {
  return { x: shell.x, z: shell.z, r: SHELL_RADIUS }
}

/**
 * What the bucket keeps clear of when it is set down: each shell to the tip of its longest side, and each piece
 * of wood along its whole length with its stub. `skip` leaves out a shell that is not on the sand.
 */
export function roomForBucket(things: Things, skip: (index: number) => boolean = () => false): Patch[] {
  const taken: Patch[] = []
  things.shells.forEach((shell, index) => {
    if (shell.state !== 'bucket' && !skip(index)) taken.push({ x: shell.x, z: shell.z, r: 0.8 })
  })
  for (const wood of things.wood) {
    const ax = Math.cos(wood.turn), az = Math.sin(wood.turn)
    for (const along of [-1.2, -0.6, 0, 0.6, 1.2]) taken.push({ x: wood.x + ax * along, z: wood.z + az * along, r: 0.45 })
  }
  return taken
}

/**
 * The shadow under a piece of wood: an oval whose long way is the wood's own, so it lies under the bough however
 * the bough is turned, and never across it.
 */
export function woodShadow(wood: Wood): { x: number; z: number; ax: number; az: number; long: number; wide: number } {
  return { x: wood.x, z: wood.z, ax: Math.cos(wood.turn), az: Math.sin(wood.turn), long: 1.25, wide: 0.3 }
}

/** How far a point on the sand is from the middle line of a piece of wood, measured to `half` along it. */
export function fromBough(wood: Wood, x: number, z: number, half = 1.1): { off: number; x: number; z: number } {
  const ax = Math.cos(wood.turn), az = Math.sin(wood.turn)
  const along = Math.min(half, Math.max(-half, (x - wood.x) * ax + (z - wood.z) * az))
  const px = wood.x + ax * along, pz = wood.z + az * along
  return { off: Math.hypot(px - x, pz - z), x: px, z: pz }
}

/** Everything the things take up, but for the one named: `skip` is 'bucket', 'shell' or 'wood' with its index. */
export function patchesOf(things: Things, skip?: { kind: 'bucket' | 'shell' | 'wood'; index: number }): Patch[] {
  const taken: Patch[] = []
  if (skip?.kind !== 'bucket') taken.push(bucketPatch(things.bucket))
  things.shells.forEach((shell, index) => {
    if ((skip?.kind === 'shell' && skip.index === index) || shell.state === 'bucket') return
    taken.push(shellPatch(shell))
  })
  things.wood.forEach((wood, index) => {
    if (skip?.kind === 'wood' && skip.index === index) return
    taken.push(...woodPatches(wood))
  })
  return taken
}

/**
 * Where something comes to rest: where it was going if that is on the beach
 * and clear of everything in `taken`, and otherwise the nearest place that
 * is, so it stops beside what is in the way. `own` gives the patches it
 * would take up at a place.
 */
export function settle(x: number, z: number, own: (x: number, z: number) => Patch[], taken: readonly Patch[], gap = 0.06, fit?: (x: number, z: number) => boolean): { x: number; z: number } {
  const start = keep(x, z)
  // `fit` says more about where it may lie, as that the sand there is dry and flat.
  const clear = (px: number, pz: number): boolean => isClear(own(px, pz), taken, gap) && (fit?.(px, pz) ?? true)
  if (clear(start.x, start.z)) return start
  // Round it in widening rings, and of each ring the place nearest to where it was going.
  for (let ring = 1; ring <= 48; ring++) {
    let best: { x: number; z: number } | null = null, nearest = Infinity
    for (let i = 0; i < 20; i++) {
      const turn = (i / 20) * Math.PI * 2
      const at = keep(start.x + Math.cos(turn) * ring * 0.15, start.z + Math.sin(turn) * ring * 0.15)
      const apart = Math.hypot(at.x - start.x, at.z - start.z)
      if (apart < nearest && clear(at.x, at.z)) {
        best = at
        nearest = apart
      }
    }
    if (best) return best
  }
  return start
}

/**
 * Where something under the finger is: where the finger is if that is clear, and otherwise pushed straight out
 * of what is in the way, so it slides along the edge of a rock as the finger goes on and never jumps.
 */
export function slide(x: number, z: number, own: (x: number, z: number) => Patch[], taken: readonly Patch[], gap = 0.06): { x: number; z: number } {
  let at = keep(x, z)
  for (let pass = 0; pass < 8; pass++) {
    let moved = false
    push: for (const mine of own(at.x, at.z)) {
      for (const other of taken) {
        const need = mine.r + other.r + gap, dx = mine.x - other.x, dz = mine.z - other.z, apart = Math.hypot(dx, dz)
        if (apart >= need - 1e-6) continue
        const ux = apart > 1e-4 ? dx / apart : 0, uz = apart > 1e-4 ? dz / apart : 1
        at = keep(at.x + ux * (need - apart), at.z + uz * (need - apart))
        moved = true
        break push
      }
    }
    if (!moved) return at
  }
  return isClear(own(at.x, at.z), taken, gap) ? at : settle(x, z, own, taken, gap)
}

/** Whether a place is clear of everything in `taken`. */
export function isClear(own: readonly Patch[], taken: readonly Patch[], gap = 0): boolean {
  return own.every((mine) => taken.every((other) => Math.hypot(mine.x - other.x, mine.z - other.z) >= mine.r + other.r + gap - 1e-6))
}

function num(value: unknown, low: number, high: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback
}

/** The saved things, each field repaired by itself; whatever cannot be read takes its first-visit place. */
export function readThings(raw: Record<string, unknown>, childAge: number | null): Things {
  const fresh = firstThings(childAge)
  const b = isRecord(raw.bucket) ? raw.bucket : {}
  const bucket: Bucket = {
    ...keep(num(b.x, BEACH.x0, BEACH.x1, fresh.bucket.x), num(b.z, BEACH.z0, BEACH.z1, fresh.bucket.z)),
    holds: b.holds === 'nothing' || b.holds === 'sand' || b.holds === 'water' ? b.holds : fresh.bucket.holds,
    shell: b.shell === true,
    side: b.side === true,
  }
  const rawShells = Array.isArray(raw.shells) ? raw.shells : []
  const shells = fresh.shells.map((first, index): Shell => {
    const s: Record<string, unknown> = isRecord(rawShells[index]) ? rawShells[index] : {}
    const state: ShellState = s.state === 'pressed' || s.state === 'bucket' || s.state === 'tower' || s.state === 'lying' ? s.state : 'lying'
    return { ...keep(num(s.x, BEACH.x0, BEACH.x1, first.x), num(s.z, BEACH.z0, BEACH.z1, first.z)), up: s.up !== false, state }
  })
  // One shell at most is in the bucket, and the bucket knows it.
  let inBucket = false
  for (const shell of shells) {
    if (shell.state !== 'bucket') continue
    if (inBucket || !bucket.shell || bucket.side) shell.state = 'lying'
    else inBucket = true
  }
  bucket.shell = inBucket
  // A bucket on its side holds nothing.
  if (bucket.side) bucket.holds = 'nothing'
  const rawWood = Array.isArray(raw.wood) ? raw.wood : []
  const wood = fresh.wood.map((first, index): Wood => {
    const w: Record<string, unknown> = isRecord(rawWood[index]) ? rawWood[index] : {}
    return { ...keep(num(w.x, BEACH.x0, BEACH.x1, first.x), num(w.z, BEACH.z0, BEACH.z1, first.z)), turn: num(w.turn, -Math.PI, Math.PI, first.turn) }
  })
  return { bucket, shells, wood }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** The things as they are saved: plain numbers, to a hundredth. */
export function writeThings(things: Things): Things {
  return {
    bucket: { x: round(things.bucket.x), z: round(things.bucket.z), holds: things.bucket.holds, shell: things.bucket.shell, side: things.bucket.side },
    shells: things.shells.map((shell) => ({ x: round(shell.x), z: round(shell.z), up: shell.up, state: shell.state })),
    wood: things.wood.map((wood) => ({ x: round(wood.x), z: round(wood.z), turn: round(wood.turn) })),
  }
}

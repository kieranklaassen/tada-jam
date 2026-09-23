// Shape of a game's intersection-audit script, scripts/intersections/games/<key>.ts.
// See docs/solutions/conventions/building-a-jam-game.md and the audit's header
// in scripts/jam-intersections.mjs.

import type { Page } from 'playwright'
import type { Kind, Tolerance } from './core.ts'

export type Frac = readonly [number, number]

export type Driver = {
  page: Page
  // Advance game time, sampling the scene every `sampleMs` on the way.
  wait(ms: number): Promise<void>
  // Touch at a point given as fractions of the canvas (0..1 across, 0..1 down).
  tap(at: Frac): Promise<void>
  // Press, slide over `ms` of game time (sampled on the way), release.
  drag(from: Frac, to: Frac, ms?: number): Promise<void>
  press(at: Frac): Promise<void>
  move(to: Frac, ms?: number): Promise<void>
  release(): Promise<void>
  // Where the first mesh whose path or label matches `pattern` is on screen,
  // as canvas fractions, or null. Name meshes in the game to make this easy.
  find(pattern: string): Promise<Frac | null>
  // Take a sample now (moments end with one anyway).
  sample(): Promise<void>
}

export type Moment = { name: string; run: (driver: Driver) => Promise<void> }

// A contact the game means (a stem planted in soil, a fish under the water
// surface). `a` and `b` are regular expressions against piece ids, labels, and
// object keys; `upTo` caps the depth allowed, as a fraction of the smaller
// piece's middle extent. Every entry says why it is intended.
export type Allowance = { a: string; b?: string; kind?: Kind; upTo?: number; reason: string }

export type GameAudit = {
  // CI fails on any visible finding not allowed below once this is true.
  enforce: boolean
  // Query string added to the game URL, e.g. 'tier=0' to pin the full look.
  query?: string
  childAge?: number
  // Game time between scene samples.
  sampleMs?: number
  moments?: Moment[]
  allow?: Allowance[]
  // Meshes never audited (glows, ghost hand, particles): regexes against path,
  // label, or material type.
  ignore?: string[]
  // Group meshes into one object: every mesh whose path or label matches
  // `match` belongs to the object `as`. Default grouping is the largest
  // ancestor that is still small next to the view; `userData.jamObject` on
  // any ancestor overrides both.
  objects?: Array<{ match: string; as: string }>
  // Instances of an InstancedMesh are separate objects by default. Group them:
  // instance i of a matching mesh belongs to object floor(i / per). A mesh can
  // instead name each instance's object with userData.jamInstanceObjects
  // (one key per instance; a key equal to a group's jamObject joins that group).
  instances?: Array<{ match: string; per: number }>
  // Merged meshes holding many separate things: split into connected parts,
  // each its own object.
  split?: string[]
  tolerance?: Partial<Tolerance>
  // Largest ancestor size, as a fraction of the view, still counted as one object.
  objectFraction?: number
}

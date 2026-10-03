import type { Ride, Train } from './run'
import type { VehicleId } from './sites'

// The characters and their fixed tastes (ART.md, "The characters and their
// fixed tastes"). Pure: a reaction is read from what the model computed for
// the ride and from nothing else, so the same bridge always gets the same
// reaction and a child can learn a taste and test it on purpose. No reaction
// is about the child.

export type Vehicle = {
  id: VehicleId
  /** The crates it shows, each one unit of load. The numeral beside them names this count (symbols, later). */
  crates: number
  /** Each axle's distance behind the front one, in cells. The crates' weight is shared equally between the axles. */
  axles: readonly number[]
}

export const VEHICLES: Readonly<Record<VehicleId, Vehicle>> = {
  'post-van': { id: 'post-van', crates: 2, axles: [0, 1] },
  'jelly-truck': { id: 'jelly-truck', crates: 3, axles: [0, 1.5] },
  'piano-mover': { id: 'piano-mover', crates: 4, axles: [0, 0.5] },
  'giraffe-bus': { id: 'giraffe-bus', crates: 3, axles: [0, 2] },
  'caterpillar-bus': { id: 'caterpillar-bus', crates: 5, axles: [0, 0.5, 1, 1.5, 2, 2.5] },
}

export const trainOf = (vehicle: Vehicle): Train => vehicle.axles.map((behind) => ({ behind, weight: vehicle.crates / vehicle.axles.length }))

/** The test trolley: one axle, one crate for each weight on it, one to six. */
export const TROLLEY_WEIGHTS = { fewest: 1, most: 6 } as const
export const trolleyTrain = (weights: number): Train => [{ behind: 0, weight: Math.max(TROLLEY_WEIGHTS.fewest, Math.min(TROLLEY_WEIGHTS.most, Math.round(weights))) }]

/** What a character does about the ride. `like` and `dislike` are equally worth watching; `plain` is the ride that is neither. */
export type Reaction = {
  mood: 'like' | 'dislike' | 'plain'
  /** Which piece of acting this is. Each names one thing that happens to the cargo or the driver. */
  act: string
  /** How much of it, from 0 to 1: how many parcels, how far the piano rolls. */
  amount: number
  /** The parts the reaction is about: where a hat stays hanging, which prop is scraped. */
  parts: readonly number[]
}

/** The numbers each taste turns on, in the model's own measure: cells of dip, change of slope, rise over run. */
export const TASTE = {
  van: { level: 0.01, deep: 0.025, parcels: 5 },
  jelly: { stiff: 0.004, soft: 0.012, kink: 0.06 },
  piano: { level: 0.02, steep: 0.06 },
  /** The giraffes' heads ride this many cells above the road. */
  bus: { headroom: 3 },
  caterpillar: { fewestGaps: 2 },
} as const

const share = (value: number, from: number, to: number) => Math.max(0, Math.min(1, (value - from) / (to - from)))

/** How the vehicle that crossed took this ride. */
export function reaction(id: VehicleId, ride: Ride): Reaction {
  const none: readonly number[] = []
  switch (id) {
    case 'post-van':
      if (ride.dip <= TASTE.van.level) return { mood: 'like', act: 'parcels-stand', amount: 1, parts: none }
      if (ride.dip > TASTE.van.deep) return { mood: 'dislike', act: 'parcels-slide', amount: share(ride.dip, TASTE.van.deep, 3 * TASTE.van.deep), parts: none }
      return { mood: 'plain', act: 'parcels-lean', amount: share(ride.dip, TASTE.van.level, TASTE.van.deep), parts: none }
    case 'jelly-truck':
      if (ride.kink > TASTE.jelly.kink) return { mood: 'dislike', act: 'jelly-jumps', amount: share(ride.kink, TASTE.jelly.kink, 4 * TASTE.jelly.kink), parts: none }
      if (ride.dip >= TASTE.jelly.soft) return { mood: 'like', act: 'jelly-rolls', amount: share(ride.dip, TASTE.jelly.soft, 4 * TASTE.jelly.soft), parts: none }
      if (ride.dip < TASTE.jelly.stiff) return { mood: 'plain', act: 'driver-yawns', amount: 1, parts: none }
      return { mood: 'plain', act: 'jelly-shivers', amount: share(ride.dip, TASTE.jelly.stiff, TASTE.jelly.soft), parts: none }
    case 'piano-mover':
      if (ride.slope <= TASTE.piano.level) return { mood: 'like', act: 'keys-ripple', amount: 1, parts: none }
      if (ride.slope > TASTE.piano.steep) return { mood: 'dislike', act: 'piano-rolls-back', amount: share(ride.slope, TASTE.piano.steep, 4 * TASTE.piano.steep), parts: none }
      return { mood: 'plain', act: 'piano-creeps', amount: share(ride.slope, TASTE.piano.level, TASTE.piano.steep), parts: none }
    case 'giraffe-bus': {
      const low = ride.low[TASTE.bus.headroom - 1] ?? none
      return low.length ? { mood: 'dislike', act: 'necks-duck', amount: Math.min(1, low.length / 4), parts: low } : { mood: 'like', act: 'necks-stretch', amount: 1, parts: none }
    }
    case 'caterpillar-bus': {
      if (ride.held.length < TASTE.caterpillar.fewestGaps) return { mood: 'plain', act: 'feet-patter', amount: 0, parts: none }
      const even = ride.held.every((gap) => gap === ride.held[0])
      return even ? { mood: 'like', act: 'hums-a-scale', amount: Math.min(1, ride.held.length / 6), parts: none } : { mood: 'dislike', act: 'loses-step', amount: Math.min(1, new Set(ride.held).size / 4), parts: none }
    }
  }
}

/** The barge, on a sheet where one passes: open water mid-river, or a prop to scrape past. */
export const bargeReaction = (ride: Ride): Reaction =>
  ride.blocked.length ? { mood: 'dislike', act: 'scrapes-past', amount: Math.min(1, ride.blocked.length / 3), parts: ride.blocked } : { mood: 'like', act: 'toots', amount: 1, parts: [] }

/** The crew chief: it likes a triangle and dislikes a shape that folds, whoever built it. */
export const chiefReaction = (change: { closedTriangle: boolean; folded: boolean }): Reaction | null =>
  change.folded ? { mood: 'dislike', act: 'feathers-on-end', amount: 1, parts: [] } : change.closedTriangle ? { mood: 'like', act: 'taps-and-nods', amount: 1, parts: [] } : null

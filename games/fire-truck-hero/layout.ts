// Where things stand in a yard, in yard units: x runs left to right from 0 to
// 16 and z from the far edge (0) to the near edge (10), as in ground.ts. The
// rules and the view both read this module, and it holds no renderer.
//
// Every yard uses the same few places, so a child finds things where things
// are found. Each place is big enough for a thing about 100 logical pixels
// across, they stand well apart, and none is in the near strip of the yard,
// which is the bottom of the screen where wrists rest (ART.md, "The band and
// its age rule").

export type Place = { readonly x: number; readonly z: number }

/** The truck stands here in every yard. A touch on it takes no water. */
export const TRUCK: Place = { x: 2.6, z: 5.4 }

/** How far from the truck's middle a touch still counts as on the truck. */
export const TRUCK_REACH = 2.0

/** The nozzle on the truck's roof, where the water leaves: its place and height. */
export const NOZZLE = { x: 3.71, z: 5.68, y: 3.12 } as const

/** The five spots a thing can stand on. An arrangement names them by index. */
export const SPOTS: readonly Place[] = [
  { x: 6.6, z: 2.8 },
  { x: 10.2, z: 2.6 },
  { x: 8.0, z: 6.2 },
  { x: 12.2, z: 6.0 },
  { x: 14.0, z: 3.7 },
]

/**
 * The gate hangs in the far fence straight ahead of the truck's place, so the
 * truck drives on through it without crossing any spot. This is the middle of
 * the gate and half its width.
 */
export const GATE = { x: 2.6, z: -0.85, half: 1.6 } as const

/**
 * The bell, which hangs out over the sand from the gate's right post. Three
 * rings open the gate. It is at the far edge so that what waits beyond the
 * gate shows over the fence. This is the point of the sand under it, where
 * water lands.
 */
export const BELL: Place = { x: 4.6, z: 0.6 }

/** From one yard's far fence to the next yard's: a yard and the lane of grass between two yards. */
export const YARD_PITCH = 15

/** How far from a spot's middle water still lands on the thing that stands there. */
export const THING_REACH = 1.3

/** How far from the bell's post water still rings it. */
export const BELL_REACH = 1.0

/** Nothing the child needs stands nearer the near edge than this. */
export const NEAR_STRIP_FROM_Z = 8.4

/** The least distance between any two of the truck, the spots and the bell. */
export const LEAST_GAP = 2.8

export function distance(a: Place, b: Place): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

/** What a point of the yard is: the truck, a spot by index, the bell, or open ground. */
export type Aim = { on: 'truck' } | { on: 'spot'; spot: number } | { on: 'bell' } | { on: 'ground' }

/** The nearest thing-place within reach of a point wins; a point within reach of none is open ground. */
export function aimAt(point: Place): Aim {
  if (distance(point, TRUCK) <= TRUCK_REACH) return { on: 'truck' }
  let best: Aim = { on: 'ground' }
  let bestGap = Infinity
  SPOTS.forEach((spot, index) => {
    const gap = distance(point, spot)
    if (gap <= THING_REACH && gap < bestGap) {
      best = { on: 'spot', spot: index }
      bestGap = gap
    }
  })
  const bellGap = distance(point, BELL)
  if (bellGap <= BELL_REACH && bellGap < bestGap) best = { on: 'bell' }
  return best
}

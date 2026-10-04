import { LAYOUT } from './props'

// The things of the place that stand still and look as if a finger could do
// something to them: the suds bucket, the two pools of standing water, the
// drain, the window and the pipe. Each answers a touch with a small thing of
// its own, where the finger is, and none of them changes anything of a wash.
// Pure: where each is, for the model and for the picker.

export type Spot = 'bucket' | 'pool' | 'drain' | 'window' | 'pipe'

/** A pool is seen as far as nine tenths of its oval; the rest is its ragged edge. */
const POOL_EDGE = 0.9
/** The drain's grate, a little more than its size each way: half its width and half its depth. */
const GRATE = { x: 0.62, z: 0.32 } as const
/** A finger on the wall is on the pipe within this far above or below its middle: the pipe stands off the wall, so it is seen a little off where it is. */
const PIPE_REACH = 0.3

/** What of the place is on the floor at a point, if anything. */
export function floorSpot(x: number, z: number): 'pool' | 'drain' | null {
  if (Math.abs(x - LAYOUT.drain.x) <= GRATE.x && Math.abs(z - LAYOUT.drain.z) <= GRATE.z) return 'drain'
  for (const pool of LAYOUT.pools) if (Math.hypot((x - pool.x) / pool.rx, (z - pool.z) / pool.rz) <= POOL_EDGE) return 'pool'
  return null
}

/** What of the place is on the back wall at a point, if anything. */
export function wallSpot(x: number, y: number): 'window' | 'pipe' | null {
  const w = LAYOUT.window, pipe = LAYOUT.pipe
  if (x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1) return 'window'
  if (x >= pipe.x0 && x <= pipe.x1 && Math.abs(y - pipe.y) <= PIPE_REACH) return 'pipe'
  return null
}

/** The middle of the bucket's suds: where its answer comes up from. */
export function bucketTop(): readonly [number, number, number] {
  return [LAYOUT.rack.x + LAYOUT.bucket.dx, LAYOUT.bucket.top, LAYOUT.rack.z]
}

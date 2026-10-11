import type { Kind } from './blocks'
import { SIZE } from './layout'
import { SECOND_KNOCK } from './motion'

// Where wool dust comes up when a block lands on the rug. Pure: the view
// throws a puff for each of these when its time comes.

export type Dust = {
  /** Where on the rug it comes up. */
  x: number
  z: number
  /** The way it drifts, as an angle on the floor. */
  angle: number
  /** Seconds after the landing. */
  delay: number
}

/**
 * The dust of one landing. Most kinds raise one ring round their foot. The
 * long one comes down one end first and the other after it, so it raises a
 * puff at each end: the first at its left end as that end lands, the second
 * at its right end at its second knock. `roll` gives numbers from 0 to 1.
 */
export function landingDust(kind: Kind, at: readonly [number, number, number], roll: () => number): Dust[] {
  const [w, , d] = SIZE[kind]
  const dust: Dust[] = []
  if (kind === 'long') {
    for (const end of [-1, 1]) for (let i = 0; i < 6; i++) {
      // A fan round the end: outward and to both sides, never back along the block.
      const angle = (end < 0 ? Math.PI : 0) + ((i + roll()) / 6 - 0.5) * Math.PI * 1.2
      dust.push({ x: at[0] + end * (w / 2) + Math.cos(angle) * 0.12, z: at[2] + Math.sin(angle) * d * 0.5, angle, delay: end < 0 ? 0 : SECOND_KNOCK.long! })
    }
    return dust
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + roll()
    dust.push({ x: at[0] + Math.cos(angle) * w * 0.5, z: at[2] + Math.sin(angle) * d * 0.5, angle, delay: 0 })
  }
  return dust
}

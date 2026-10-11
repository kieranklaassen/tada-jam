import { inWater, type GnomeId } from './ground'
import type { Point } from './input'
import { along, lengthOf } from './paths'

// How a gnome gets over ground where no pebbles lie, as plain numbers: where
// along his way each step falls, where the way is water, and where he hops
// it. A scene plays these as beats and a gnome walking back to the log plays
// them as he goes, so both cross the moss and the stream in the same way,
// seen and heard at every step.

/** Units between two steps on the moss, and who hops the stream where the others wade it. */
export const STRIDE: Readonly<Record<GnomeId, number>> = { tall: 46, baker: 26, sleepy: 30, sneezy: 36 }
export const HOPS: Readonly<Record<GnomeId, boolean>> = { tall: false, baker: true, sleepy: false, sneezy: true }
/** The longest single hop over water, and how high it goes. */
export const HOP_REACH = 90
export const HOP_HIGH = 44

/** What is heard and seen at a point of the way, `d` units along it. */
export type Cue = { d: number; what: 'step' | 'wade' | 'hup' | 'down' | 'stone'; at: Point }
export type Crossing = { way: readonly Point[]; total: number; hops: readonly (readonly [number, number])[]; cues: readonly Cue[] }

/**
 * The way planned. `pebbled(i)` says that the stretch that ends at `way[i]` runs from pebble to pebble: there he
 * walks dry and unheard but for a stepping stone, which sounds as he lands on it. Everywhere else he strides in his
 * own stride, wades where the way is water, or hops it if he is one who hops.
 */
export function crossing(who: GnomeId, way: readonly Point[], pebbled: (i: number) => boolean = () => false): Crossing {
  const total = lengthOf(way)
  if (way.length < 2 || total <= 0) return { way, total: 0, hops: [], cues: [] }
  const ends: number[] = [0]
  for (let i = 1; i < way.length; i++) ends.push(ends[i - 1] + Math.hypot(way[i].x - way[i - 1].x, way[i].y - way[i - 1].y))
  const onPebbles = (d: number): boolean => { for (let i = 1; i < way.length; i++) if (d <= ends[i] + 1e-9) return pebbled(i); return false }
  // The stretches of the way that lie in the water, and for one who hops, each cut into hops he can make.
  const wet: [number, number][] = []
  for (let d = 0, open = -1; d <= total; d += 4) {
    const p = along(way, d / total), inside = !onPebbles(d) && inWater(p.x, p.y)
    if (inside && open < 0) open = d
    if (open >= 0 && (!inside || d + 4 > total)) { wet.push([Math.max(0, open - 6), Math.min(total, d + 6)]); open = -1 }
  }
  const hops: [number, number][] = []
  if (HOPS[who]) for (const [d0, d1] of wet) {
    const count = Math.max(1, Math.ceil((d1 - d0) / HOP_REACH))
    for (let i = 0; i < count; i++) hops.push([d0 + ((d1 - d0) * i) / count, d0 + ((d1 - d0) * (i + 1)) / count])
  }
  const cues: Cue[] = []
  for (const [d0, d1] of hops) {
    cues.push({ d: d0, what: 'hup', at: along(way, d0 / total) })
    const down = along(way, d1 / total)
    // In the middle of wide water he comes down in it and goes straight on; on the far bank he lands.
    cues.push({ d: d1, what: inWater(down.x, down.y) ? 'wade' : 'down', at: down })
  }
  for (let d = STRIDE[who] / 2; d < total; d += STRIDE[who]) {
    if (onPebbles(d) || hops.some(([d0, d1]) => d >= d0 && d <= d1)) continue
    cues.push({ d, what: wet.some(([d0, d1]) => d >= d0 && d <= d1) ? 'wade' : 'step', at: along(way, d / total) })
  }
  for (let i = 1; i < way.length; i++) if (pebbled(i) && inWater(way[i].x, way[i].y)) cues.push({ d: ends[i], what: 'stone', at: way[i] })
  cues.sort((a, b) => a.d - b.d)
  return { way, total, hops, cues }
}

/** How far off the ground he is `d` units along: the arc of the hop he is in, or nothing. */
export function hopLift(c: Crossing, d: number): number {
  const hop = c.hops.find(([d0, d1]) => d >= d0 && d <= d1)
  return hop ? HOP_HIGH * Math.sin((Math.PI * (d - hop[0])) / (hop[1] - hop[0])) : 0
}

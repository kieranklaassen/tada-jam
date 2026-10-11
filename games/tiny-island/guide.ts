import type { Guidance } from './guidance'
import { LAND_Y, RIM_IN, RIM_OUT, TALL, TRAY_SCALE, TRAY_TOP, slotOf, type Kind } from './toys'

// What the idle ladder shows on this island, as plain numbers for the view.
// First the things that can be picked up glow; then a wooden hand shows one
// move and goes away again. It shows a move, never a result: nothing it does
// changes the island. With toys in the tray it taps one and then taps the
// island; with a toy already in the child's hand it taps the island only;
// with the tray empty it slides along the rim.

export type Glow = { x: number; y: number; z: number; r: number }

export type Guide = {
  /** How strong the glow is, 0 to 1, and the rings it lights. */
  glow: number
  rings: Glow[]
  /** The hand's fingertip in the world, how far it is pressed down (0 to 1) and how much of it is there (0 to 1); null when no move is being shown. */
  hand: { x: number; y: number; z: number; press: number; there: number } | null
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
const smooth = (t: number): number => t * t * (3 - 2 * t)
const bump = (t: number, a: number, b: number): number => Math.sin(span(t, a, b) * Math.PI)

/** Where on the island the hand taps: the front of the land, in the world, whichever way the island is turned. */
export const ISLAND_TAP = { x: 0.4, y: LAND_Y, z: 1.5 }
const RIM_R = (RIM_IN + RIM_OUT) / 2
/** The island's glow comes up over this long once a toy is in the hand: begun in the frame the finger lands. */
export const ISLAND_GLOW_S = 0.2

/**
 * `waiting` is the toys in the tray, `held` the toy that hangs in the hand over it and `heldFor` the seconds
 * it has hung there. Writes into `out` and returns it, so a frame makes no garbage.
 */
export function guideOf(guidance: Guidance | null, waiting: readonly Kind[], held: Kind | null, heldFor: number, out: Guide): Guide {
  out.rings.length = 0
  out.hand = null
  out.glow = guidance?.glow ?? 0
  const pickable = waiting.filter((kind) => kind !== held)
  if (held) {
    // A toy in the hand: the island is where it can go, and it glows from the touch that took the toy, not after a wait.
    out.glow = Math.max(out.glow, smooth(span(heldFor, 0, ISLAND_GLOW_S)))
    out.rings.push({ x: 0, y: LAND_Y + 0.03, z: 0, r: 2.3 })
  } else if (out.glow > 0) {
    // Nothing in the hand and nobody touching: the toys that wait.
    for (const kind of pickable) out.rings.push({ ...slotOf(kind), y: TRAY_TOP + 0.02, r: 1.05 })
  }
  if (!guidance) return out
  const p = guidance.demo
  if (p === null) return out
  const there = Math.min(smooth(span(p, 0, 0.1)), 1 - smooth(span(p, 0.88, 1)))
  if (held) {
    out.hand = { ...ISLAND_TAP, press: bump(p, 0.35, 0.6), there }
  } else if (pickable.length > 0) {
    // A different toy each time, so the hand never says which one is right: none is.
    const kind = pickable[guidance.demoIndex % pickable.length], slot = slotOf(kind), top = TRAY_TOP + TALL[kind] * TRAY_SCALE * 0.7
    const t = smooth(span(p, 0.36, 0.62))
    out.hand = {
      x: slot.x + (ISLAND_TAP.x - slot.x) * t,
      y: top + (ISLAND_TAP.y - top) * t + Math.sin(t * Math.PI) * 1.2,
      z: slot.z + (ISLAND_TAP.z - slot.z) * t,
      press: Math.max(bump(p, 0.14, 0.32), bump(p, 0.66, 0.84)),
      there,
    }
  } else {
    // Every toy is out: the hand takes the rim at the front and slides it along.
    const a = Math.PI / 2 + 0.45 - smooth(span(p, 0.22, 0.74)) * 0.9
    out.hand = { x: Math.cos(a) * RIM_R, y: 0.3, z: Math.sin(a) * RIM_R, press: Math.min(span(p, 0.12, 0.2), 1 - span(p, 0.78, 0.86)), there }
  }
  return out
}

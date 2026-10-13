import type { Tier } from '../config'
import { CLOUD_WIDTHS } from '../sky'
import type { Stage } from '../stage'
import { shownAt } from '../trail'

// What one frame draws, counted from the same lists the view draws from and
// by the same rule for what is in sight. Every plaque is one flat rectangle
// of two triangles in one of a handful of meshes, so the cost of a frame is
// how many rectangles are in sight, and that can be counted with no renderer.

/** How far behind the fox things are still drawn: the camera stands about that far back. */
export const BEHIND = 135
/** The longest a thing on the board lies along the trail from where it is put, in pegs: it is drawn until all of it is out of sight. */
export const LONG = 90
/** The most pools of light an idle frame lays. */
export const MOST_LIGHTS = 8
/** The most plaques of everyone on the board that one frame can hold. */
export const MOST_PLAQUES = 512

/** Whether a thing `d` pegs ahead of the fox (minus is behind it) and `long` pegs long is drawn, when the haze closes at `reach`. */
export const inSight = (d: number, reach: number, long = 0): boolean => d < reach && d + long > -BEHIND

/** Every mesh of the scene, by name. Each is one draw: the board, the trail on it and the far sky are one rectangle each, and the rest hold one rectangle for each thing in sight. */
export const MESHES = ['board', 'trail', 'sky', 'sun-and-clouds', 'setting', 'shades', 'plaques', 'loose-beads', 'idle-light', 'ghost-hand'] as const

/**
 * Plaques that are on the stage for a moment only and that a game found standing never holds: the slop of water
 * on its way down from the pail on the trail, the goose's feet while she lies off her nest (which takes balloons,
 * so no pail), or the crumbs on the fox's hands at the hand-over. One at a time.
 */
export const SHORT_LIVED = 1

export type Drawn = { draws: number; triangles: number; setting: number; plaques: number; shades: number }

/**
 * The most a frame draws at a tier with the fox `at` pegs along the trail: every draw and every triangle, were
 * every loose bead in the air and every light and the ghost hand showing at once. `standing` is where each
 * thing of the setting stands and `laid` what lies on the trail (where it begins and how long it is).
 */
export function drawn(tier: Tier, stage: Stage, at: number, standing: readonly { s: number }[], laid: readonly { s: number; long: number }[]): Drawn {
  const ahead = (s: number): number => shownAt(at, s, tier.reach)
  let setting = 0, shades = 0, plaques = 0
  for (const thing of standing) {
    if (!inSight(ahead(thing.s), tier.reach)) continue
    setting += 1
    shades += 1
  }
  for (const one of laid) if (inSight(ahead(one.s), tier.reach, one.long)) setting += 1
  for (const item of stage.items) {
    if (!inSight(item.key === 'fox' ? 0 : ahead(item.s), tier.reach, LONG)) continue
    plaques += item.to - item.from
    if (item.shade > 0) shades += 1
  }
  plaques += SHORT_LIVED
  const rectangles = 3 + 1 + CLOUD_WIDTHS.length + setting + shades + plaques + tier.loose + MOST_LIGHTS + 1
  return { draws: MESHES.length, triangles: rectangles * 2, setting, plaques, shades }
}

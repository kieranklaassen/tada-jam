import { COLS, GOOSE, PIG, SHEEP, SHEPHERD } from './layout'
import type { Env } from './weather'
import type { Shape } from './wool'

// What each figure does where it stands, by its fixed tastes, with no drawing
// in it. The tastes never change: the same place and the same weather give
// the same act every time, so a child can learn them and test them. An act is
// about the picture, the weather or a coat, and never about the child.

export type Act =
  // In the dish, and in the child's hand.
  | 'dish' | 'held'
  // The shepherd as the first drops reach him, in the rain's scene only: a hand held out, looking up.
  | 'feel'
  // The sheep.
  | 'graze' | 'soaked' | 'lost' | 'sneeze' | 'squint' | 'pant' | 'stand'
  // The goose.
  | 'swim' | 'ride' | 'fly' | 'dance' | 'hiss' | 'circle'
  // The shepherd.
  | 'ridge' | 'wet' | 'warm' | 'hat' | 'doze' | 'gaze'
  // The pig.
  | 'wallow' | 'root' | 'gobble' | 'roll' | 'fan' | 'snuffle'
  // A coat of each dye, on any figure: green, white, blue, yellow, russet.
  | 'eat' | 'blind' | 'shiver' | 'strut' | 'muddy'

export const COAT_ACTS: readonly Act[] = ['eat', 'blind', 'shiver', 'strut', 'muddy']
/** Every act a figure can be found in on the sheet, by figure, for the tests and the view. */
export const PLACE_ACTS: readonly (readonly Act[])[] = [
  ['graze', 'soaked', 'lost', 'sneeze', 'squint', 'pant', 'stand'],
  ['swim', 'ride', 'fly', 'dance', 'hiss', 'circle'],
  ['ridge', 'wet', 'warm', 'hat', 'doze', 'gaze'],
  ['wallow', 'root', 'gobble', 'roll', 'fan', 'snuffle'],
]

/**
 * What a figure does: `env` is its place on the sheet, or null in the dish, and `coat` the dye laid on it, or
 * null. A coat comes first, then the weather over it, then the ground under it.
 */
export function actOf(who: number, env: Env | null, coat: number | null): Act {
  if (coat !== null) return COAT_ACTS[coat]
  if (!env) return 'dish'
  const ground = env.ground
  if (who === SHEEP) {
    if (env.mist) return 'lost'
    if (env.wet || ground === 'pond' || ground === 'stream') return 'soaked'
    if (ground === 'corn') return 'sneeze'
    // Under a sun it shuts its eyes, turns its back to it and pants; by a fire it pants.
    if (env.sun) return 'squint'
    if (env.fire) return 'pant'
    return ground === 'hill' || ground === 'bush' ? 'graze' : 'stand'
  }
  if (who === GOOSE) {
    if (env.wet) return 'dance'
    if (ground === 'pond') return 'swim'
    if (ground === 'stream') return 'ride'
    if (env.wind || ground === 'wind') return 'fly'
    if (env.fire || ground === 'fire' || (ground === 'earth' && !env.mud)) return 'hiss'
    return 'circle'
  }
  if (who === SHEPHERD) {
    if (env.wet) return 'wet'
    if (env.fire) return 'warm'
    if (env.wind || ground === 'wind') return 'hat'
    if (env.trunk || ground === 'trunk') return 'doze'
    return ground === 'hill' ? 'ridge' : 'gaze'
  }
  if (who === PIG) {
    if (env.mud) return 'wallow'
    if (ground === 'earth') return 'root'
    if (ground === 'corn') return 'gobble'
    if (env.sun) return 'fan'
    return ground === 'hill' ? 'roll' : 'snuffle'
  }
  return 'dish'
}

/**
 * What an act does at a moment, and is heard doing then: a sneeze, a shake, a bump, a hat blown off, a loop
 * flown, a roll downhill. `at` is when the first comes after the act begins, `every` how far apart they come,
 * and `times` how many there are. After the last the figure holds the act's resting pose, so nothing a figure
 * does at a moment ever comes again without its sound, and a figure found on load is at rest.
 */
export const BEATS: Partial<Record<Act, { at: number; every: number; times: number }>> = {
  sneeze: { at: 1.96, every: 2.8, times: 3 },
  soaked: { at: 0, every: 2.6, times: 2 },
  shiver: { at: 0, every: 2.4, times: 3 },
  blind: { at: 1.1, every: 2.2, times: 3 },
  hat: { at: 0, every: 6, times: 2 },
  fly: { at: 0, every: 5.5, times: 1 },
  roll: { at: 0, every: 7, times: 2 },
}

/** How many of an act's beats have begun by `age` seconds after the act began. */
export function beatsBy(act: Act, age: number): number {
  const beat = BEATS[act]
  if (!beat || age < beat.at) return 0
  return Math.min(beat.times, Math.floor((age - beat.at) / beat.every) + 1)
}

/** Seconds since the latest beat of an act began, at `age` seconds after the act began; Infinity before the first and for an act with none. */
export function sinceBeat(act: Act, age: number): number {
  const beat = BEATS[act], n = beatsBy(act, age)
  return !beat || n === 0 ? Infinity : age - beat.at - (n - 1) * beat.every
}

/** Whether an act is still in a beat it began: `sinceBeat` is less than the gap to the next. Past the last beat's gap the act is at rest. */
export function inBeat(act: Act, age: number): boolean {
  const beat = BEATS[act]
  return beat !== undefined && sinceBeat(act, age) < beat.every
}

/** The shape a walk follows: its box, and for each of its columns the row of its top line. */
export type Geo = { x0: number; x1: number; y0: number; y1: number; top: number[] }

export function geoOf(shape: Shape): Geo {
  const top: number[] = []
  for (let col = shape.x0; col <= shape.x1; col++) {
    let row = shape.y0
    while (row <= shape.y1 && !shape.cells[row * COLS + col]) row++
    top.push(row > shape.y1 ? (top.length > 0 ? top[top.length - 1] : shape.y1) : row)
  }
  return { x0: shape.x0, x1: shape.x1, y0: shape.y0, y1: shape.y1, top }
}

/** Where a walk has taken a figure from the cell it was set on, in cells; whether it faces the other way; a turn and a hat's flight for the pose. */
export type Walk = { x: number; y: number; flip: boolean; turn: number; hat: number }

const TAU = Math.PI * 2
const frac = (x: number): number => ((x % 1) + 1) % 1
const ease = (u: number): number => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t) }
const topAtCol = (geo: Geo, col: number): number => geo.top[Math.max(0, Math.min(geo.top.length - 1, Math.round(col) - geo.x0))]

/**
 * The walk of an act, `age` seconds after it began, for a figure set at (col, row). A walk is a view: the
 * figure is saved where the child set it, and every walk comes back there. `geo` is the shape under it, or
 * null. Acts with no walk leave the figure where it stands.
 */
export function walkOf(act: Act, age: number, col: number, row: number, geo: Geo | null, out: Walk): Walk {
  out.x = 0; out.y = 0; out.flip = false; out.turn = 0; out.hat = 0
  switch (act) {
    case 'ridge': {
      if (!geo) break
      // He climbs to the top line, then walks along it to and fro.
      const span = Math.max(0, Math.min(8, (geo.x1 - geo.x0) / 2 - 1)), climb = ease(age / 1.2)
      const swing = age < 1.2 ? 0 : Math.sin(((age - 1.2) / 7) * TAU)
      const x = Math.max(geo.x0, Math.min(geo.x1, col + span * swing))
      out.x = x - col
      out.y = (topAtCol(geo, x) - row) * climb
      out.flip = age >= 1.2 && Math.cos(((age - 1.2) / 7) * TAU) > 0
      break
    }
    case 'swim': {
      if (!geo) break
      // Rings round the pond's middle.
      const rx = Math.max(1.5, (geo.x1 - geo.x0) / 3.2), ry = Math.max(0.8, (geo.y1 - geo.y0) / 3.6), in1 = ease(age / 1)
      const cx = (geo.x0 + geo.x1 + 1) / 2, cy = (geo.y0 + geo.y1 + 1) / 2, a = (age / 5) * TAU
      out.x = (cx + rx * Math.cos(a) - col) * in1
      out.y = (cy + ry * Math.sin(a) - row) * in1
      out.flip = Math.sin(a) < 0
      break
    }
    case 'ride': {
      if (!geo) break
      // It rides the stream to its end, climbs out, and waddles back.
      const u = frac(age / 7), end = geo.x1 - 1
      if (u < 0.45) { out.x = (end - col) * (u / 0.45); out.flip = true }
      else if (u < 0.55) { out.x = end - col; out.y = -2.5 * ease((u - 0.45) / 0.1); out.flip = true }
      else if (u < 0.92) { out.x = (end - col) * (1 - (u - 0.55) / 0.37); out.y = -2.5 }
      else out.y = -2.5 * (1 - ease((u - 0.92) / 0.08))
      break
    }
    case 'fly': {
      // One loop, and it lands where it was set.
      const u = sinceBeat(act, age) / (5.5 * 0.42)
      if (u < 1) { const a = u * TAU; out.x = 5 * Math.sin(a); out.y = -4.5 * (1 - Math.cos(a)); out.flip = Math.cos(a) > 0; out.turn = 0.25 * Math.sin(a) }
      break
    }
    case 'circle': {
      const a = (age / 5) * TAU
      out.x = 2.2 * Math.sin(a); out.y = 0.9 * (1 - Math.cos(a)); out.flip = Math.cos(a) > 0
      break
    }
    case 'hat': {
      // The hat blows off; he runs after it and comes back with it on. Then he holds it on.
      const u = inBeat(act, age) ? sinceBeat(act, age) / 6 : 1
      if (u < 0.5) { const go = ease(u / 0.42); out.x = 6 * go; out.hat = 1 + 2.6 * Math.sin(Math.min(1, u / 0.46) * Math.PI); out.flip = true }
      else if (u < 0.85) out.x = 6 * (1 - ease((u - 0.5) / 0.35))
      break
    }
    case 'roll': {
      if (!geo) break
      // It rolls down the hill to its nearer foot, lies a moment, and trots back up. Then it stands on the hill.
      const u = inBeat(act, age) ? sinceBeat(act, age) / 7 : 1, toRight = col - geo.x0 > geo.x1 - col, foot = toRight ? geo.x1 : geo.x0
      const down = u < 0.3 ? ease(u / 0.3) : u < 0.42 ? 1 : 1 - ease((u - 0.42) / 0.5)
      const x = col + (foot - col) * down
      out.x = x - col
      out.y = (topAtCol(geo, x) - row) * ease(age / 0.8)
      out.turn = u < 0.3 ? (toRight ? 1 : -1) * TAU * 2 * ease(u / 0.3) : 0
      out.flip = u < 0.42 ? toRight : !toRight
      break
    }
    case 'blind': {
      // It cannot see: it walks from where it was set until it bumps, turns, and bumps again; after the third bump it comes back and stands.
      const u = age < 6.6 ? frac(age / 4.4) : 0
      out.x = 1.6 * (u < 0.25 ? u * 4 : u < 0.75 ? 2 - u * 4 : u * 4 - 4)
      out.flip = u < 0.25 || u >= 0.75
      break
    }
    case 'lost': {
      // It goes looking in the mist, a little way to each side of where it was set.
      const a = (age / 3.6) * TAU
      out.x = 1.3 * Math.sin(a); out.flip = Math.cos(a) > 0
      break
    }
    case 'eat':
      // Round and round after its own back.
      out.flip = frac(age / 1.5) < 0.5
      break
    case 'strut': {
      const a = (age / 4) * TAU
      out.x = 1.8 * Math.sin(a); out.flip = Math.cos(a) > 0
      break
    }
    default:
      break
  }
  return out
}

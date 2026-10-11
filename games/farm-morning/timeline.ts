import type { ThingId } from './layout'
import type { AnimalId } from './state'

// One clock for each answer and each scene. Every time that more than one
// module needs is written here once, in seconds from the touch that starts
// the answer (or from the scene's start): how long the thing stays at the
// animal and what it does there, when a stroke begins, when a glug is
// swallowed, when the door is drummed on. The model moves the thing by these
// numbers (farm.ts), the bodies move by them (motion.ts), the loose bits are
// thrown by them (cells.ts) and the notes are placed by them (voices.ts), so
// what is heard is drawn at the same moment. `sync.test.ts` walks every cell
// and scene and fails when a note sounds while its mover is not doing it.

/** A thing takes this long to leap across to where it is used. */
export const LEAP_S = 0.18
/** And this long to go back up over its place, where it comes up full. */
export const BACK_S = 0.3
/** A scoop the goat has bitten pings out of its mouth more slowly, up and over. */
export const PING_S = 0.55

/** Where a thing is used: tipped out over the animal, at its mouth, along its side, on its head or into the rack. */
export type UseAt = 'over' | 'mouth' | 'side' | 'head' | 'rack'

export type Use = {
  at: UseAt
  /** The thing stays at the animal until this moment of the answer, and then goes back. */
  leaves: number
  /** It is seen empty from this moment. A brush is never empty. */
  empties: number
  /** Strokes of a brush: when each begins, how long it takes and how far it reaches either way, in stage units. */
  strokes?: { at: readonly number[]; lasts: number; reach: number }
  /** A brush that scrubs or tickles without a pause: turns a second, and how far it reaches. */
  scrub?: { turns: number; reach: number }
}

const tipped = (leaves: number): Use => ({ at: 'over', leaves, empties: LEAP_S + 0.12 })

/** Every use of a thing on an animal: where the thing goes, what it does there, and when it leaves. */
export const USES: Record<`${ThingId}-${AnimalId}`, Use> = {
  // The grain runs out of the scoop for as long as it patters.
  'scoop-hens': tipped(1.0),
  // The pony's lip sucks the grain off the scoop: it stays at the lip until the flubber ends.
  'scoop-pony': { at: 'mouth', leaves: 1.0, empties: 0.92 },
  // The goat bites the scoop: it is in its teeth until they clonk on the tin.
  'scoop-goat': { at: 'mouth', leaves: 1.45, empties: 0.5 },
  'scoop-pig': tipped(0.7),

  'bucket-hens': tipped(0.7),
  'bucket-pony': tipped(0.7),
  // The goat drinks the whole bucket: it is at its mouth until the last glug is down.
  'bucket-goat': { at: 'mouth', leaves: 1.95, empties: 1.9 },
  // The water runs into the wallow for as long as it gurgles.
  'bucket-pig': tipped(0.9),

  // Four quick scritches up the back of her head.
  'brush-hens': { at: 'head', leaves: 0.8, empties: 9, strokes: { at: [0.2, 0.34, 0.48, 0.62], lasts: 0.12, reach: 16 } },
  // Four long strokes along the pony's side, a puff of dust at each.
  'brush-pony': { at: 'side', leaves: 2.62, empties: 9, strokes: { at: [0.3, 0.9, 1.5, 2.1], lasts: 0.45, reach: 78 } },
  // The brush crackles through the goat's coat until every hair stands on end.
  'brush-goat': { at: 'side', leaves: 1.84, empties: 9, scrub: { turns: 5, reach: 34 } },
  // It tickles the pig for as long as the pig giggles.
  'brush-pig': { at: 'side', leaves: 1.46, empties: 9, scrub: { turns: 7.7, reach: 24 } },

  'fork-hens': tipped(0.7),
  'fork-pony': { at: 'head', leaves: 0.7, empties: LEAP_S + 0.12 },
  // The hay goes into the rack.
  'fork-goat': { at: 'rack', leaves: 0.75, empties: LEAP_S + 0.12 },
  'fork-pig': tipped(0.7),
}

/** How far along its reach a brush is at a moment of the answer: -1 to 1. Still, before its first stroke and after its last. */
export function brushAt(use: Use, t: number): number {
  if (use.scrub) return Math.sin(t * Math.PI * 2 * use.scrub.turns)
  const strokes = use.strokes
  if (!strokes) return 0
  const ease = (p: number): number => p * p * (3 - 2 * p)
  let at = -1
  for (let i = 0; i < strokes.at.length; i++) {
    const from = strokes.at[i]
    if (t < from) break
    const along = Math.min(1, (t - from) / strokes.lasts)
    // A stroke goes one way; the brush comes back for the next in the gap between them.
    const next = strokes.at[i + 1] ?? Infinity
    const gap = next - (from + strokes.lasts)
    const back = t > from + strokes.lasts && Number.isFinite(next) ? Math.min(1, (t - from - strokes.lasts) / gap) : 0
    at = -1 + 2 * ease(along) - 2 * ease(back)
  }
  return at
}

// --- Times that the cells share between the body, the bits and the voice ----------------------

/** The goat's glugs: when the first is swallowed, how many, and how far apart. */
export const GLUGS = { from: 0.3, count: 6, every: 0.26 }
/** The pig's bubbles after grain: when each is blown and how long it lasts before it bursts with a glop. */
export const BUBBLES = { blown: [0.75, 0.92, 1.15, 1.32, 1.55, 1.7], lasts: 0.5 }
/** A bubble a poked pig pops, and one a content pig blows by itself: blown, and burst this much later. */
export const POP = { blown: 0.1, lasts: 0.45 }
export const IDLE_BUBBLE_S = 0.7
/**
 * The haystack hen walks off after `off` seconds, in a zigzag, and gets to each of the other two hens at one of
 * `bumps`. The bumped hen jumps, and the bonk sounds, in the step she gets there (farm.ts).
 */
export const HAYSTACK = { off: 0.72, bumps: [1.7, 3.0] }
/** The brushed hen's strut: she sets off, and a step lands every so often, with a cluck. */
export const STRUT = { off: 1.6, every: 0.35, steps: 5 }
/** Water on the pony: when the shake throws its spray, and when it reaches the goat. */
export const SPRAY = { thrown: [1.0, 1.3], reaches: 1.42 }
/** When grain begins to land, and how long it goes on landing, for a trough or a mouth. */
export const GRAIN = { lands: 0.3 }

/** How long each hen pecks for, by what she pecks at: the grain in the trough, or what fell by another animal. */
export const PECKS = { trough: 2.4, visit: 1.5 }
/** Seconds from one peck of a hen to her next: the white hen slow, the bantam quick. Her head is down, with a tok, half way through each. */
export const PECK_BEAT = [0.48, 0.31, 0.22] as const
/** How many toks a hen gets into a stretch of pecking. */
export const pecksIn = (seconds: number, hen: number): number => Math.floor(seconds / PECK_BEAT[hen] + 0.5 - 1e-6)

/** The hens set off across the yard this long after grain is used on another animal. */
export const VISIT_AFTER = 0.75
/** Shut in, they drum on the door instead: from this moment, so many knocks, so far apart. */
export const DRUM = { from: 0.7, knocks: 7, every: 0.085 }

/** When a want begins to fill after its right thing is used: as the grain lands, at the first stroke, as the hay drops in, as the water runs. */
export const FILLS_FROM: Record<AnimalId, number> = { hens: 0.3, pony: 0.3, goat: 0.34, pig: 0.3 }

// --- The scenes -------------------------------------------------------------------------------

/** A door takes this long to slide along its rail, and lands with a knock. */
export const DOOR_SLIDE_S = 0.5

export const COMING_OUT = { bantam: 0.12, russet: 0.34, trips: 0.58, white: 0.62, shakes: 1.95, ends: 2.1 }

/** The full morning, from the moment the last animal's own answer is nearly over. */
export const FULL_MORNING = { brightens: 1.6, catOut: 1.3, catStretches: 2.3, settles: 3.5, every: 0.75, ends: 6.6 }

/**
 * The night. Its clock stands still at `doorBy` until the door has shut with its clunk, however far the hens had to
 * come, so the sun never starts down before the door is shut. Each hen's snore is three peeps, and the door she
 * sleeps behind stirs at each.
 */
export const NIGHT = { doorBy: 0.55, shut: 0.6, dusk: 0.9, duskLasts: 1.5, sleeps: 1.5, every: 0.4, moon: 2.9, moonLasts: 1.7, dawn: 4.6, dawnLasts: 1.3, crow: 5.2, wakes: 5.8, ends: 7.6 }
export const HEN_SNORE = { peeps: [0, 0.5, 1.0] }
/** The crow: four notes, the last one long. The white hen's beak is up at her hole for all of it. */
export const CROW = { notes: [0, 0.16, 0.3, 0.52], lasts: 1.1 }
/** Beaks come to the holes: the first is through after this long. */
export const BEAKS_AFTER = 0.25
/** The hens croon by a full trough every so often, and swell a little as they do: the swell begins a breath before the sound. */
export const CROONS = { every: 6.5, offset: 2, lasts: 1.0, leads: 0.1 }

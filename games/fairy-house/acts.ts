import type { ActName, Part } from './evening'
import type { Mouth, Who } from './folk'
import { EVENING, type Voice } from './voices'

// What each of the three does with its thing at evening, as numbers: one act
// for each cell of the second grid in ART.md, and one for a house with none
// of its things. An act is where the body is over its length, what the face
// and the funniest part do, and the moments at which something is seen to
// happen, each with the sound of that moment. Nothing here draws or plays.

/** Where it stands for an act: on top of the thing, on the ground beside it, or hanging under it. */
export type Stands = 'on' | 'beside' | 'under'

/** What one of the folk is told to be at one moment. Its body follows on its own springs. */
export type Direction = {
  /** From where the act stands: along the stage and down, in stage units. `dx` is toward the side the thing leans or the act goes. */
  dx: number
  dy: number
  /** How far down to the ground beside the thing it has come, 0 to 1. */
  fall: number
  /** Its whole body turned about its feet, in radians: lying down is about a quarter turn. */
  turn: number
  lean: number
  bob: number
  part: number
  prop: number
  lid: number
  open: number
  mouth: Mouth
  brow: number
  wide: number
}

export const AT_REST: Direction = { dx: 0, dy: 0, fall: 0, turn: 0, lean: 0, bob: 0, part: 0, prop: 0, lid: 0, open: 0, mouth: 'smile', brow: 0, wide: 1 }

/** What is seen to happen at a moment of an act. */
export type Effect =
  /** The thing gives under it. */
  | 'kick'
  /** The next twig under the roof snaps; with the last of them the roof comes down. */
  | 'snap'
  /** It walks into what stands in its way, which gives. */
  | 'bonk'
  /** The thing rocks, swings or rattles again as its cell does, and is heard through its own knocks. */
  | 'rock'
  /** The house changes as this part leaves it: twigs snap, a cloth goes, water soaks, a slab sails. */
  | 'change'
  /** The thing is taken up (a lamp onto the head, a feather into the hand) and set back. */
  | 'take'
  | 'back'
  | 'dust'
  | 'splash'
  | 'spill'
  | 'fluff'
  /** The fat one sneezes, or is woken. */
  | 'sneeze'
  | 'wake'

/** A moment of an act. `when` holds it to an evening in which its cause is there: a twig left to snap, a slab that sails. A sound is the sound of something seen. */
export type Cue = { at: number; voice: Voice | null; does: readonly Effect[]; when?: (part: Part) => boolean }

/** What of the evening an act's pose depends on: how many twigs snap under the roof, whether the slab sails, how far there is to walk before something is in the way (in the walker's own units), and whether it falls asleep here. */
export type Told = { snaps: number; sails: boolean; reach: number; sleeps: boolean; /** How far the tidy one leans to sweep with its hat, in degrees: as far as the floor beside it is free, and negative to its other side. */ sweep: number }
/** The fullest telling of each act: both twigs snap, the slab sails, there is a good way to walk, and it falls asleep. */
export const FULLEST: Told = { snaps: 2, sails: true, reach: 74, sleeps: true, sweep: 62 }

export type Act = {
  who: Who
  stands: Stands
  /** Seconds the act takes. */
  lasts: number
  /** It ends here, asleep. */
  stays: boolean
  pose(p: number, told?: Told): Direction
  cues: readonly Cue[]
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v))
const ramp = (p: number, a: number, b: number): number => clamp((p - a) / (b - a))
const hump = (p: number): number => Math.sin(Math.PI * clamp(p))
/** Up between `a` and `b`, held, and down again between `c` and `d`. */
const held = (p: number, a: number, b: number, c: number, d: number): number => Math.min(ramp(p, a, b), 1 - ramp(p, c, d))
const strokes = (p: number, a: number, b: number, count: number): number => (p < a || p > b ? 0 : Math.sin(((p - a) / (b - a)) * Math.PI * 2 * count))
const cue = (at: number, voice: Voice | null, ...does: Effect[]): Cue => ({ at, voice, does })
const when = (holds: (part: Part) => boolean, moment: Cue): Cue => ({ ...moment, when: holds })
const act = (who: Who, stands: Stands, lasts: number, pose: (p: number, told: Told) => Partial<Direction>, cues: Cue[], stays = false): Act => ({ who, stands, lasts, stays, pose: (p, told = FULLEST) => ({ ...AT_REST, ...pose(p, told) }), cues })

export const ACTS: Record<ActName, Act> = {
  // --- The fat one, slow and heavy --------------------------------------------
  // Lies down on the rug, finds it hard, and gets up with a hmpf.
  rug: act('fat', 'on', 2.6, (p) => {
    const down = held(p, 0.1, 0.3, 0.72, 0.92)
    return { turn: 1.4 * down, dx: -96 * down, bob: -0.05 * hump(ramp(p, 0.26, 0.5)), lid: 0.5 * down, mouth: p > 0.4 ? 'pout' : 'smile', brow: -0.7 * ramp(p, 0.4, 0.55), part: 0.4 * strokes(p, 0.36, 0.66, 2) }
  }, [cue(0.3, EVENING.rugDown, 'kick', 'dust'), cue(0.74, EVENING.rugHmpf)]),
  // Sinks into the bed and snores at once.
  bed: act('fat', 'on', 2.4, (p) => {
    const sunk = ramp(p, 0.14, 0.38)
    return { dy: 18 * sunk, bob: -0.14 * sunk, lean: 9 * sunk, lid: ramp(p, 0.3, 0.55), mouth: p > 0.55 ? 'o' : 'smile', open: p > 0.55 ? 0.5 + 0.5 * Math.sin((p - 0.55) * 22) : 0, prop: 0.6 * sunk }
  }, [cue(0.36, EVENING.bedSink, 'kick'), cue(0.66, EVENING.snore)], true),
  // Lies on the slide and slides off on its belly with a zip and a bump.
  slide: act('fat', 'on', 2.4, (p) => {
    const down = held(p, 0.08, 0.26, 0.78, 0.95), gone = ramp(p, 0.36, 0.6)
    return { turn: 1.2 * down, dx: -60 * down + 150 * gone * gone, fall: gone, wide: 1 + 0.4 * hump(gone), mouth: gone > 0 && p < 0.7 ? 'o' : 'grin', open: 0.8 * hump(gone), part: 0.8 * hump(ramp(p, 0.6, 0.9)) }
  }, [cue(0.36, EVENING.slideZip), cue(0.6, EVENING.slideBump, 'dust')]),
  // Climbs onto the roof; the twigs snap one after the other, a crack for each in the step it snaps, and it lands
  // sitting, blinking. Over twigs that are already snapped nothing cracks: it climbs on, sits down and blinks.
  roof: act('fat', 'on', 2.8, (p, told) => {
    const sat = ramp(p, 0.5, 0.58), start = told.snaps > 0 ? 1 : 0
    return { dy: -8 * held(p, 0.05, 0.2, 0.3, 0.34), bob: -0.16 * sat * (1 - 0.5 * ramp(p, 0.6, 0.8)), wide: 1 + 0.45 * start * held(p, 0.3, 0.34, 0.6, 0.7), mouth: p > 0.3 && start ? 'o' : 'smile', open: 0.5 * start * held(p, 0.3, 0.34, 0.8, 0.95), lid: p > 0.62 && Math.sin((p - 0.62) * 50) > 0.3 ? 1 : 0, part: 1.2 * hump(ramp(p, 0.52, 0.8)) }
  }, [
    when((part) => part.twigs.length >= 1, cue(0.32, EVENING.crack, 'kick', 'snap')),
    when((part) => part.twigs.length >= 2, cue(0.48, EVENING.crackLow, 'kick', 'snap')),
    cue(0.58, EVENING.sitDown, 'kick'),
    when((part) => part.twigs.length >= 1, cue(0.58, null, 'dust')),
  ]),
  // Lies on the table, which creaks; it rolls off wrapped in the cloth with a flump.
  tablecloth: act('fat', 'on', 2.8, (p) => {
    const down = ramp(p, 0.08, 0.26), roll = ramp(p, 0.46, 0.74), up = ramp(p, 0.84, 0.98)
    return { turn: 1.4 * down * (1 - up) + Math.PI * 2 * roll, dx: -80 * down * (1 - roll) + 130 * roll, fall: roll * roll, lid: 0.4 * down * (1 - roll), mouth: roll > 0 && roll < 1 ? 'o' : 'smile', open: hump(roll), bob: -0.1 * hump(ramp(p, 0.74, 0.9)) }
  }, [cue(0.26, EVENING.tableCreak, 'kick'), cue(0.46, null, 'take'), cue(0.76, EVENING.flump, 'change', 'dust')]),
  // No leaf in the house: it looks for one, shrugs, and goes to lie on the floor.
  noLeaf: act('fat', 'beside', 1.6, (p) => ({ lean: 6 * strokes(p, 0.05, 0.6, 1), brow: 0.8 * hump(ramp(p, 0.5, 0.95)), bob: 0.05 * hump(ramp(p, 0.55, 0.9)), mouth: p > 0.5 ? 'flat' : 'smile' }), [cue(0.62, EVENING.shrug)]),

  // --- The tiny one, fast and bouncy ------------------------------------------
  // Jumps into the bath with a splash and scrubs; the water spills over.
  bath: act('tiny', 'on', 2.4, (p) => {
    const jump = hump(ramp(p, 0.04, 0.24)), out = hump(ramp(p, 0.82, 1))
    return { dy: -64 * jump + 20 * held(p, 0.24, 0.26, 0.82, 0.84) - 40 * out, prop: strokes(p, 0.3, 0.6, 4), part: 0.5 * hump(ramp(p, 0.24, 0.4)), mouth: 'grin', open: 0.6 * held(p, 0.24, 0.3, 0.7, 0.8), bob: 0.06 * strokes(p, 0.3, 0.6, 4) }
  }, [cue(0.24, EVENING.splash, 'kick', 'splash'), cue(0.44, EVENING.scrub), cue(0.62, EVENING.spill, 'spill', 'change')]),
  // Climbs into the cradle and rocks. In the last one it comes to, its eyes fall shut as it rocks and it sighs, asleep.
  // In one before the last it rocks with its eyes open, grinning, and hops out again: no shut eyes and no sigh.
  cradle: act('tiny', 'on', 2.6, (p, told) => {
    const rocks = 10 * strokes(p, 0.22, 0.9, 3) * (1 - ramp(p, 0.6, 0.95)), into = -30 * hump(ramp(p, 0.02, 0.18)) + 16 * ramp(p, 0.18, 0.22)
    if (told.sleeps) return { dy: into, lean: rocks, lid: ramp(p, 0.45, 0.8), part: 0.6 * ramp(p, 0.5, 0.9), mouth: 'smile' }
    return { dy: into - 16 * ramp(p, 0.9, 0.94) - 26 * hump(ramp(p, 0.9, 1)), lean: rocks, lid: 0, part: 0.3 * hump(ramp(p, 0.9, 1)), mouth: 'grin', open: 0.5 * held(p, 0.24, 0.3, 0.8, 0.9) }
  }, [cue(0.22, null, 'rock'), when((part) => part.sleeps, cue(0.8, EVENING.sigh))], true),
  // Lifts the lamp onto its head, walks into things with a bonk and sets it back on its stone.
  lamp: act('tiny', 'beside', 2.6, (p, told) => {
    const walk = held(p, 0.24, 0.48, 0.58, 0.8)
    return { dx: told.reach * walk, bob: 0.05 * Math.abs(strokes(p, 0.24, 0.48, 2)) + 0.05 * Math.abs(strokes(p, 0.58, 0.8, 2)) - 0.12 * hump(ramp(p, 0.48, 0.58)), part: 1.1 * held(p, 0.1, 0.16, 0.84, 0.9), lid: held(p, 0.1, 0.16, 0.84, 0.9), mouth: p > 0.48 && p < 0.6 ? 'o' : 'grin', open: hump(ramp(p, 0.48, 0.6)) }
  }, [cue(0.12, EVENING.lampUp, 'take'), cue(0.48, EVENING.bonk, 'bonk'), cue(0.86, EVENING.lampBack, 'back')]),
  // Swings on the bell, and the fat one snorts awake.
  bell: act('tiny', 'under', 2.4, (p) => ({ turn: 0.5 * strokes(p, 0.16, 0.86, 3) * (1 - 0.5 * ramp(p, 0.6, 0.86)), mouth: 'grin', open: 0.7 * held(p, 0.16, 0.2, 0.8, 0.9), prop: 0.6 * strokes(p, 0.16, 0.86, 3) }), [cue(0.16, EVENING.swing, 'rock'), cue(0.5, null, 'rock', 'wake')]),
  // Sits in the bowl and spins with a rattle until it is dizzy.
  bowl: act('tiny', 'on', 2.6, (p) => ({ dy: -30 * hump(ramp(p, 0.02, 0.16)) + 14 * ramp(p, 0.16, 0.2), lean: 16 * strokes(p, 0.2, 0.7, 6) * (1 - ramp(p, 0.5, 0.7)) + 14 * Math.sin((p - 0.7) * 20) * ramp(p, 0.7, 0.78), part: 0.7 * ramp(p, 0.68, 0.8), wide: 1 + 0.3 * ramp(p, 0.68, 0.8), mouth: p > 0.68 ? 'o' : 'grin', open: 0.4 * ramp(p, 0.68, 0.8) }), [cue(0.2, null, 'rock'), cue(0.72, EVENING.dizzy)]),
  // No acorn cap in the house: it washes its face like a cat.
  noCap: act('tiny', 'beside', 1.8, (p) => ({ lean: 14 * held(p, 0.1, 0.2, 0.8, 0.92), prop: -0.9 * Math.abs(strokes(p, 0.2, 0.8, 1.5)), lid: 0.8 * held(p, 0.15, 0.25, 0.75, 0.85), mouth: 'smile', part: 0.3 * strokes(p, 0.2, 0.8, 3) }), [cue(0.3, EVENING.lick), cue(0.52, EVENING.lick), cue(0.72, EVENING.lick)]),

  // --- The tidy one, quick and exact ------------------------------------------
  // Sweeps the floor in quick strokes, and the dust makes the fat one sneeze.
  broom: act('tidy', 'beside', 2.4, (p) => ({ dx: 46 * strokes(p, 0.2, 0.62, 2), lean: 12 * held(p, 0.12, 0.2, 0.7, 0.8), prop: 0.8 * strokes(p, 0.2, 0.62, 2), mouth: 'flat', brow: -0.3 }), [cue(0.1, EVENING.flagDown, 'take'), cue(0.3, EVENING.swish, 'dust'), cue(0.5, EVENING.swish, 'dust'), cue(0.66, EVENING.fatSneeze, 'sneeze'), cue(0.88, null, 'back')]),
  // Plumps the quilt with pats, and fluff flies.
  quilt: act('tidy', 'beside', 2.2, (p) => ({ lean: 10 * held(p, 0.1, 0.18, 0.8, 0.9), prop: -1.2 * Math.abs(strokes(p, 0.2, 0.74, 1.5)), bob: -0.03 * Math.abs(strokes(p, 0.2, 0.74, 1.5)), mouth: 'smile' }), [cue(0.29, EVENING.quiltPat, 'kick', 'fluff'), cue(0.47, EVENING.quiltPat, 'kick', 'fluff'), cue(0.65, EVENING.quiltPat, 'kick', 'fluff')]),
  // Dusts the stone, tickles its own nose and sneezes.
  tickler: act('tidy', 'beside', 2.4, (p) => ({ lean: 8 * held(p, 0.08, 0.16, 0.4, 0.5) - 14 * hump(ramp(p, 0.66, 0.74)) + 16 * hump(ramp(p, 0.74, 0.86)), part: 1.4 * strokes(p, 0.44, 0.7, 4), wide: 1 - 0.4 * ramp(p, 0.5, 0.72) + 0.8 * hump(ramp(p, 0.74, 0.9)), lid: 0.7 * held(p, 0.56, 0.7, 0.74, 0.76), mouth: p > 0.72 ? 'o' : 'flat', open: hump(ramp(p, 0.72, 0.9)) }), [cue(0.2, EVENING.stoneDust, 'rock', 'dust'), cue(0.46, EVENING.tickle), cue(0.75, EVENING.sneeze, 'fluff')]),
  // Takes the flag down, sweeps the ceiling with high swishes and ties it back.
  flag: act('tidy', 'beside', 2.6, (p) => ({ bob: 0.16 * held(p, 0.2, 0.3, 0.7, 0.8), dx: 34 * strokes(p, 0.3, 0.7, 2), prop: -1.6 * held(p, 0.2, 0.3, 0.7, 0.8), brow: 0.6 * held(p, 0.2, 0.3, 0.7, 0.8), mouth: 'flat' }), [cue(0.12, EVENING.flagDown, 'take'), cue(0.38, EVENING.swishHigh, 'dust'), cue(0.58, EVENING.swishHigh, 'dust'), cue(0.86, EVENING.flagBack, 'back', 'rock')]),
  // Polishes the slab with squeaks; where a bath has spilt over its ground this evening, it sails off standing on it.
  // It stands on the slab, beside the sail. A squeak for each stroke; the whoosh and the start only where the slab does sail.
  sail: act('tidy', 'on', 2.6, (p, told) => {
    const off = told.sails ? held(p, 0.56, 0.6, 0.9, 1) : 0
    return { lean: 16 * held(p, 0.08, 0.16, 0.46, 0.54), prop: 1.1 * strokes(p, 0.16, 0.46, 3), wide: 1 + 0.4 * off, brow: off, mouth: off > 0 ? 'o' : 'smile', open: 0.5 * off }
  }, [cue(0.185, EVENING.squeak), cue(0.285, EVENING.squeak), cue(0.385, EVENING.squeak), when((part) => part.sails !== null, cue(0.56, EVENING.sailOff, 'change'))]),
  // No feather in the house: it sweeps with the tip of its own hat, over the free floor in front of it and no further.
  noFeather: act('tidy', 'beside', 2.2, (p, told) => ({ lean: told.sweep * held(p, 0.1, 0.24, 0.72, 0.86), dx: 30 * (Math.abs(told.sweep) / FULLEST.sweep) * strokes(p, 0.26, 0.7, 2), part: 0.5 * strokes(p, 0.26, 0.7, 2), mouth: 'flat', brow: -0.4 }), [cue(0.37, EVENING.swishHat, 'dust'), cue(0.59, EVENING.swishHat, 'dust')]),
}

/** How each of the three goes from place to place: how long, and in how many steps. */
export const GAIT: Record<Who, { lasts: number; steps: number; lift: number }> = {
  fat: { lasts: 1.1, steps: 2, lift: 26 },
  tidy: { lasts: 0.9, steps: 4, lift: 8 },
  tiny: { lasts: 0.8, steps: 3, lift: 54 },
}

/** How each lies while the evening stands: in its bed or cradle, or in the heap on the floor. */
export function sleeping(who: Who, inBed: boolean, seconds: number): Direction {
  const breath = Math.sin(seconds * (who === 'fat' ? 1.5 : who === 'tidy' ? 2.3 : 3.1))
  if (who === 'fat') return { ...AT_REST, dy: inBed ? 18 : 0, turn: inBed ? 0 : 1.4, dx: inBed ? 0 : -96, bob: -0.12 + 0.03 * breath, lean: inBed ? 9 : 0, lid: 1, mouth: 'o', open: 0.5 + 0.5 * breath, prop: 0.5 }
  if (who === 'tidy') return { ...AT_REST, dx: 70, lean: 24, bob: -0.04 + 0.006 * breath, lid: 1, mouth: 'flat', part: 0.25 * breath }
  return { ...AT_REST, dy: inBed ? 16 : -150, dx: inBed ? 0 : 20, bob: 0.02 * breath, lid: 1, mouth: 'smile', part: 0.8 + 0.1 * breath }
}

/** How each wakes and stretches in the morning, over the stretch's length. */
export const STRETCH: Record<Who, { lasts: number; voice: Voice; pose(p: number): Partial<Direction> }> = {
  // A long yawn, the pillow squeezed, the belly out.
  fat: { lasts: 1.5, voice: EVENING.yawn, pose: (p) => ({ lid: 1 - ramp(p, 0.5, 0.9), mouth: 'yawn', open: hump(p), bob: 0.1 * hump(p), prop: 0.9 * hump(p), part: 0.6 * hump(p) }) },
  // Bolt upright at once, collar straightened, nose twitched.
  tidy: { lasts: 0.7, voice: EVENING.snap, pose: (p) => ({ lean: -5 * hump(p), bob: 0.05 * hump(ramp(p, 0, 0.4)), part: strokes(p, 0.3, 0.9, 2), brow: 0.7 * hump(p), mouth: 'flat' }) },
  // Two bounces, and the hat flies up off its eyes.
  tiny: { lasts: 0.9, voice: EVENING.hop, pose: (p) => ({ dy: -46 * Math.abs(strokes(p, 0, 1, 1)), part: 0.8 * (1 - ramp(p, 0, 0.3)) - 0.4 * hump(ramp(p, 0.3, 0.8)), mouth: 'grin', open: 0.8 * hump(p) }) },
}

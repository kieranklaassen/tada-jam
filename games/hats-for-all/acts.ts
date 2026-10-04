// The acts: every short thing a creature does with its body, by name. Pure
// numbers. An act says, for each moment of its length, how the creature and
// the hat on its head are moved away from rest: a hop, a lean, a turn, hands
// to the head, the hat lifted or tipped. Every act begins and ends at rest,
// so it can start from any moment and leave nothing behind; what lasts (a
// hat worn grumpily, a tower over the eyes) is read from the world each
// frame and is no act. The fifteen acts of the tastes are named in tastes.ts
// and the others in the cells of grid.ts.

export type Mods = {
  /** Moved from its place, in mat units: across, up, and towards the child. */
  dx: number; dy: number; dz: number
  /** Its height times this; its width gives way so the foam keeps its bulk. */
  squash: number
  /** Leaning to one side, and turned about its own upright, in radians. */
  lean: number; turn: number
  /** 0 hands at its sides, 1 both hands on top of its head. */
  pat: number
  /** 0 eyes as they look, 1 crossed. */
  cross: number
  /** Flop's ears, from -1 drooped to 1 flung out. */
  ears: number
  /** Where it looks, each from -1 to 1, when `looks` is 1; less blends with where it would look anyway. */
  gazeX: number; gazeY: number; looks: number
  /** The hat on its head: lifted, tipped, and brought forward of the face so it can come down over the body without passing through it. */
  hatLift: number; hatTilt: number; hatFwd: number
}

export function rest(m: Mods): Mods {
  m.dx = 0; m.dy = 0; m.dz = 0; m.squash = 1; m.lean = 0; m.turn = 0; m.pat = 0; m.cross = 0; m.ears = 0
  m.gazeX = 0; m.gazeY = 0; m.looks = 0; m.hatLift = 0; m.hatTilt = 0; m.hatFwd = 0
  return m
}

export type Act = {
  /** Seconds. No act outlasts the wait before a scene, so no walker meets a creature in the middle of one. */
  lasts: number
  /** Writes how far from rest the creature is at `u`, from 0 to 1 of the act. `m` arrives at rest. `top` is how tall the creature stands. */
  play(u: number, m: Mods, top: number): void
}

const TAU = Math.PI * 2
/** 0 at both ends and 1 in the middle of `a`..`b`. */
const bump = (u: number, a = 0, b = 1): number => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI))
/** Rises to 1 over the first `inFor` of the act and falls back over the last `outFor`. */
const hold = (u: number, inFor = 0.15, outFor = 0.2): number => Math.min(1, u / inFor, (1 - u) / outFor)
const swing = (u: number, times: number): number => Math.sin(u * TAU * times)
/** A hat comes forward of the face before it comes down over it, and goes up again before it goes back: how far forward at `u`. */
const forward = (u: number): number => Math.max(0, Math.min(1, u / 0.07, (1 - u) / 0.07))
/** And how far down, which is none until it is fully forward. */
const down = (u: number): number => Math.max(0, Math.min(1, (u - 0.07) / 0.16, (0.93 - u) / 0.16))
const hops = (u: number, times: number): number => Math.abs(Math.sin(u * Math.PI * times))

export const ACTS: Record<string, Act> = {
  // --- The fifteen acts of the tastes (tastes.ts) ---
  'spins-until-dizzy': { lasts: 1.8, play: (u, m) => { m.turn = TAU * 2 * Math.min(1, u / 0.6) ** 0.8 * (u < 0.6 ? 1 : 0); m.squash = 1 - 0.2 * bump(u, 0.6, 1); m.lean = 0.2 * swing(u, 4) * bump(u, 0.6, 1); m.cross = bump(u, 0.55, 1) } },
  'walks-as-a-hat-with-legs': { lasts: 1.9, play: (u, m, top) => { const low = down(u); m.hatLift = -(top - 0.55) * low; m.hatFwd = forward(u); m.dx = 0.56 * swing(u, 2) * low; m.dy = 0.17 * hops(u, 8) * low; m.pat = bump(u, 0.6, 0.9) } },
  'bounces-twice': { lasts: 0.9, play: (u, m) => { m.dy = 0.5 * hops(u, 2) * (1 - u * 0.4); m.squash = 1 - 0.12 * bump(u, 0.42, 0.58) } },
  'stretches-and-struts': { lasts: 1.8, play: (u, m) => { const tall = hold(u); m.squash = 1 + 0.16 * tall; m.dx = 0.45 * swing(u, 1) * tall; m.lean = -0.08 * swing(u, 3) * tall; m.looks = tall; m.gazeY = 0.6 } },
  'goes-cross-eyed': { lasts: 1.6, play: (u, m) => { const on = hold(u); m.cross = on; m.looks = on; m.gazeY = 0.9; m.hatTilt = 0.18 * swing(u, 3) * on; m.lean = 0.04 * swing(u, 3) * on } },
  'nods-slowly': { lasts: 1.5, play: (u, m) => { m.squash = 1 - 0.07 * hops(u, 2); m.hatTilt = 0.1 * swing(u, 2) * bump(u) } },
  'flaps-ears-out': { lasts: 1.4, play: (u, m) => { m.ears = hops(u, 5) * hold(u); m.dy = 0.14 * hops(u, 5) * hold(u) } },
  'huffs-it-askew': { lasts: 1.3, play: (u, m) => { m.ears = -hold(u); m.squash = 1 + 0.07 * bump(u, 0.1, 0.35) - 0.09 * bump(u, 0.35, 0.6); m.hatTilt = 0.3 * bump(u, 0.35, 0.9) } },
  'tucks-ears-under': { lasts: 1.0, play: (u, m) => { m.ears = -0.6 * hold(u); m.hatLift = 0.25 * bump(u, 0, 0.5); m.pat = bump(u, 0.2, 0.9) } },
  'drums-its-belly': { lasts: 1.6, play: (u, m) => { m.squash = 1 + 0.11 * swing(u, 7) * hold(u); m.lean = 0.06 * swing(u, 7) * hold(u); m.dy = 0.08 * hops(u, 7) * hold(u); m.pat = 0.3 * hops(u, 7) * hold(u) } },
  'pops-it-back-up-with-a-belly-bounce': { lasts: 1.6, play: (u, m) => { m.hatFwd = forward(u); m.hatLift = -0.5 * down(u) * (u < 0.55 ? 1 : 0) * bump(u, 0.07, 0.55) + 1.1 * bump(u, 0.55, 0.9); m.squash = 1 - 0.16 * bump(u, 0.4, 0.56) + 0.12 * bump(u, 0.56, 0.75); m.looks = hold(u); m.gazeY = 1 } },
  'wobbles-once': { lasts: 1.1, play: (u, m) => { m.lean = 0.12 * swing(u, 1.5) * (1 - u); m.squash = 1 + 0.05 * swing(u, 3) * (1 - u) } },
  'tap-dances': { lasts: 1.5, play: (u, m) => { m.dy = 0.12 * hops(u, 12) * hold(u); m.lean = 0.12 * swing(u, 6) * hold(u); m.dx = 0.2 * swing(u, 1.5) * hold(u) } },
  // Twice round a small circle on the mat, under the hat: across and to and fro at once.
  'runs-a-circle-under-it': { lasts: 1.9, play: (u, m, top) => { const under = down(u); m.hatLift = -(top - 0.5) * under; m.hatFwd = forward(u); m.dx = 0.45 * swing(u, 2) * under; m.dz = 0.26 * Math.cos(u * TAU * 2) * under; m.dy = 0.08 * hops(u, 10) * under; m.hatTilt = 0.1 * swing(u, 2) * under } },
  'peeks-from-under': { lasts: 1.3, play: (u, m) => { m.hatFwd = forward(u); m.hatLift = -0.5 * down(u); m.hatTilt = -0.25 * bump(u, 0.45, 0.93); m.pat = bump(u, 0.5, 0.9) } },

  // --- What a creature does in a cell of the grid, or when its hats change ---
  // Its eyes are left to the theatre, which has them on the hats, or on the hole its own hat has just gone into.
  'pats-its-bare-head': { lasts: 1.2, play: (u, m) => { m.pat = hold(u) * (0.8 + 0.2 * hops(u, 4)); m.squash = 1 - 0.05 * hops(u, 4) * hold(u) } },
  'looks-into-the-holes': { lasts: 1.6, play: (u, m) => { m.pat = bump(u, 0, 0.5); m.squash = 1 - 0.08 * bump(u, 0.4, 1); m.lean = 0.1 * swing(u, 1) * bump(u, 0.4, 1); m.looks = hold(u); m.gazeY = -1; m.gazeX = 0.5 * swing(u, 1) } },
  'does-a-trick': { lasts: 0.8, play: (u, m) => { m.dy = 0.45 * bump(u, 0, 0.7); m.hatLift = 0.5 * bump(u, 0.1, 0.9); m.lean = 0.1 * swing(u, 1) } },
  'totters-blind': { lasts: 1.9, play: (u, m) => { m.dx = 0.52 * swing(u, 1.5) * hold(u); m.lean = 0.2 * swing(u, 3) * hold(u); m.pat = 0.55 * hold(u); m.dy = 0.14 * hops(u, 6) * hold(u) } },
  'blinks-in-the-light': { lasts: 1.0, play: (u, m) => { m.cross = 0.6 * bump(u, 0, 0.6); m.squash = 1 + 0.06 * bump(u, 0, 0.5); m.looks = hold(u); m.gazeY = 0.5 } },
  'salutes-and-topples': { lasts: 1.2, play: (u, m) => { m.pat = 0.5 * bump(u, 0, 0.5); m.lean = 0.22 * swing(u, 2) * (1 - u); m.squash = 1 - 0.12 * bump(u, 0.5, 0.8) } },
  // The one who gets none makes a show of it: looks into every hole and at every other head, throws its hands up and jumps to its full height, then sits down with a bump, slumped to one side and cross-eyed. It is bewildered, and it is about the hats: never about the child.
  'makes-a-show-of-it': { lasts: 1.9, play: (u, m) => { m.looks = hold(u, 0.1, 0.15); m.gazeX = swing(u, 1.5); m.gazeY = -0.8 + 1.5 * bump(u, 0.28, 0.6); m.pat = bump(u, 0.2, 0.62); m.squash = 1 + 0.26 * bump(u, 0.24, 0.52) - 0.27 * bump(u, 0.56, 0.93); m.dy = 0.6 * bump(u, 0.3, 0.56); m.lean = 0.34 * bump(u, 0.58, 0.96); m.cross = bump(u, 0.6, 0.92) } },
  // Its eyes are on the hat, wherever it goes: the theatre turns them there.
  'watches-it-go': { lasts: 1.4, play: (u, m) => { m.lean = 0.08 * bump(u); m.squash = 1 + 0.1 * bump(u, 0, 0.5) } },
  'ducks-under': { lasts: 0.8, play: (u, m) => { m.squash = 1 - 0.22 * bump(u, 0, 0.6) + 0.08 * bump(u, 0.6, 1); m.looks = hold(u); m.gazeY = 1 } },
  'waves-it-off': { lasts: 1.2, play: (u, m) => { m.pat = 0.45 * hold(u) * (0.6 + 0.4 * hops(u, 5)); m.lean = 0.08 * swing(u, 2.5) * hold(u); m.looks = hold(u); m.gazeY = -0.7 } },
  // The acts a creature does to another, or to the tile, are written as towards the right; the theatre turns them to face whoever they are for, and holds them short of touching.
  'boings-and-pats': { lasts: 1.3, play: (u, m) => { m.dx = 0.55 * bump(u, 0, 0.36); m.lean = -0.1 * bump(u, 0, 0.3); m.squash = 1 - 0.18 * bump(u, 0.1, 0.3) + 0.12 * bump(u, 0.3, 0.55); m.dy = 0.3 * bump(u, 0.25, 0.6); m.pat = bump(u, 0.55, 1) } },
  'peeks-up-under': { lasts: 1.3, play: (u, m) => { m.dx = 0.4 * hold(u, 0.2, 0.3); m.squash = 1 - 0.14 * hold(u, 0.2, 0.3); m.lean = -0.16 * hold(u, 0.2, 0.3); m.looks = hold(u); m.gazeY = 1; m.gazeX = 0.8 } },
  'lifts-it-like-a-lid': { lasts: 1.3, play: (u, m) => { m.hatLift = 0.6 * hold(u, 0.25, 0.3); m.hatTilt = 0.3 * hold(u, 0.25, 0.3); m.pat = 0.6 * hold(u, 0.25, 0.3) } },
  // It bends down where it stands and looks at the tile: a squashed body is wide, and a step or a lean would bring it into its neighbour.
  'babbles-into-a-hole': { lasts: 1.5, play: (u, m) => { m.squash = 1 - 0.2 * hold(u, 0.25, 0.25); m.lean = 0.05 * swing(u, 6) * hold(u); m.looks = hold(u); m.gazeY = -1; m.gazeX = 0.5 } },
  'twangs-back': { lasts: 0.9, play: (u, m) => { m.lean = 0.3 * swing(u, 3) * (1 - u) ** 2; m.squash = 1 + 0.12 * swing(u, 3) * (1 - u) ** 2 } },
  'bows-and-tips-its-hat': { lasts: 1.3, play: (u, m) => { m.squash = 1 - 0.12 * hold(u, 0.3, 0.3); m.lean = -0.1 * hold(u, 0.3, 0.3); m.hatLift = 0.45 * bump(u, 0.15, 0.85); m.hatTilt = -0.4 * bump(u, 0.15, 0.85); m.pat = 0.5 * bump(u, 0.1, 0.9); m.looks = hold(u); m.gazeX = 0.8 } },
  claps: { lasts: 1.0, play: (u, m) => { m.dy = 0.16 * hops(u, 4) * hold(u); m.pat = 0.35 * hops(u, 4) } },
  'knocks-hats': { lasts: 1.0, play: (u, m) => { m.dx = 0.3 * bump(u, 0, 0.4); m.lean = -0.2 * bump(u, 0, 0.4) + 0.1 * swing(u, 3) * bump(u, 0.4, 1); m.squash = 1 + 0.05 * swing(u, 4) * bump(u, 0.4, 1) } },
  'shakes-its-hat-out': { lasts: 1.6, play: (u, m) => { m.dz = 0.3 * hold(u, 0.2, 0.25); m.hatLift = 0.7 * hold(u, 0.2, 0.25); m.hatTilt = (-0.9 + 0.2 * swing(u, 6)) * hold(u, 0.2, 0.25); m.pat = 0.6 * hold(u, 0.2, 0.25); m.looks = hold(u); m.gazeY = -1 } },
  'twangs-holding-its-hat': { lasts: 1.0, play: (u, m) => { m.lean = 0.3 * swing(u, 3) * (1 - u) ** 2; m.pat = hold(u, 0.1, 0.3) } },

  // --- In the scenes ---
  stamps: { lasts: 0.7, play: (u, m) => { m.dy = 0.5 * bump(u, 0, 0.6); m.squash = 1 - 0.2 * bump(u, 0.6, 1) } },
  'bows-and-tosses': { lasts: 0.9, play: (u, m) => { m.squash = 1 - 0.16 * bump(u, 0, 0.6) + 0.1 * bump(u, 0.6, 1); m.pat = bump(u, 0.4, 1) } },
  shrugs: { lasts: 0.8, play: (u, m) => { m.squash = 1 + 0.08 * bump(u); m.pat = 0.3 * bump(u) } },
  'shows-its-hat-gladly': { lasts: 0.8, play: (u, m) => { m.dy = 0.4 * bump(u); m.hatLift = 0.3 * bump(u, 0.2, 0.9); m.turn = TAU * Math.min(1, u / 0.8) * (u < 0.8 ? 1 : 0) } },
  'shows-its-hat-grumpily': { lasts: 0.8, play: (u, m) => { m.squash = 1 - 0.1 * bump(u); m.lean = 0.07 * swing(u, 4) * bump(u); m.ears = -bump(u) } },
  'shows-its-hat-plainly': { lasts: 0.8, play: (u, m) => { m.pat = 0.7 * bump(u); m.dy = 0.12 * bump(u) } },
}

export type ActName = keyof typeof ACTS

/** Plays an act at `seconds` since it began. Returns whether it is still going. */
export function playAct(name: string, seconds: number, m: Mods, top: number): boolean {
  const act = ACTS[name]
  if (!act || seconds >= act.lasts) return false
  act.play(Math.max(0, seconds) / act.lasts, m, top)
  return true
}

/** The longest any act lasts. */
export const LONGEST_ACT_S = Math.max(...Object.values(ACTS).map((act) => act.lasts))

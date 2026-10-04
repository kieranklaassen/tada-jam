import type { Hand, Patch } from './surface'

// The faces a vehicle makes: a mouth in its bumper, lids that are its brows,
// eyes that cross and squeeze, and a body that joins in. An expression is a
// few numbers held for a moment and then let go. Which one a touch gets is the
// joke of the game: the right use of a tool gets a small pleased face, and
// the wrong use gets the best one. Every face is about what is on the
// vehicle or what is touching it, never about the child, and none is a sad
// one: no mouth turns far down, nothing sags and nothing sighs.

export type Face = {
  /** The mouth's corners: 1 a wide smile, 0 flat, -1 turned right down. */
  smile: number
  /** How far the mouth is open, 0 to 1. */
  open: number
  /** The tongue out, 0 to 1. */
  tongue: number
  /** Lids: 0 wide open, 1 shut. */
  lid: number
  /** One lid lower than the other, as a raised brow: 0 to 1. */
  brow: number
  /** Eyes turned toward each other, 0 to 1. */
  cross: number
  /** How long it is held, in seconds, before the face lets go. */
  seconds: number
  /** What the body does with it: a jump up (or a squat, when negative), a shudder, a nod of the nose. */
  jolt: number
  shake: number
  nod: number
}

const face = (f: Partial<Face> & { seconds: number }): Face => ({ smile: 0.3, open: 0, tongue: 0, lid: 0, brow: 0, cross: 0, jolt: 0, shake: 0, nod: 0, ...f })

export const FACES = {
  /** At rest: a small smile. */
  rest: face({ seconds: 0 }),
  /** Pleased: the right tool on the right thing. */
  pleased: face({ smile: 0.75, open: 0.15, seconds: 0.7 }),
  /** Relief as foam and mud sail away. */
  aah: face({ smile: 0.6, open: 0.55, lid: 0.45, seconds: 0.9 }),
  /** Ticklish: a squeezed grin and a wriggle. */
  giggle: face({ smile: 1, open: 0.5, lid: 0.7, shake: 0.5, seconds: 0.8 }),
  /** Scratchy: the sponge rasps on dried mud and gets nowhere. Teeth together, eyes squeezed, one brow up, a hard wriggle. */
  squirm: face({ smile: 0.5, open: 0.22, lid: 0.8, brow: 0.6, shake: 0.9, seconds: 0.9 }),
  /** Bleh: the tongue out and the eyes crossed at the mess. The cloth in the mud. */
  yuck: face({ smile: -0.25, open: 0.45, tongue: 1, cross: 0.8, lid: 0.25, shake: 0.25, seconds: 1.1 }),
  /** A dust sneeze: eyes shut, mouth wide, the nose nods. The cloth on dried mud. */
  snort: face({ smile: -0.2, open: 0.9, lid: 1, nod: 1.2, jolt: 0.5, seconds: 0.55 }),
  /** Cold water: a jump, round eyes, a round mouth and a shiver. */
  flinch: face({ smile: -0.15, open: 0.8, lid: 0, jolt: 1.4, shake: 1, seconds: 0.8 }),
  /** A breath in before a sneeze: a round mouth and wide eyes. */
  gasp: face({ smile: -0.1, open: 0.6, lid: 0, brow: 0.3, seconds: 0.5 }),
  /** Sputter: water has run the mud down to its lip and it blows it off, tongue out, nose bobbing. The hose on mud. */
  sputter: face({ smile: 0.1, open: 0.7, tongue: 0.7, lid: 0.6, shake: 0.5, nod: 0.6, seconds: 0.9 }),
  /** Peek: something is over its shine and it goes cross-eyed trying to see it. Foam, or a fingerprint. */
  peek: face({ smile: 0.2, open: 0.25, cross: 0.9, brow: 0.8, seconds: 1.0 }),
  /** Boing: a poke on bare metal. */
  boing: face({ smile: 0.5, open: 0.35, lid: 0, jolt: 0.4, seconds: 0.5 }),
  /** Proud: the whole vehicle gleams. */
  proud: face({ smile: 1, open: 0.3, lid: 0.3, jolt: 0.8, seconds: 2.2 }),
  /** Cheeky: off it goes with mud still on it, tongue out. */
  cheeky: face({ smile: 0.9, open: 0.35, tongue: 0.8, lid: 0.2, jolt: 0.4, seconds: 1.2 }),
  /** A lick: left to itself, a muddy vehicle goes cross-eyed at the mud on its own nose and puts its tongue out as far as it will go to reach it. */
  lick: face({ smile: 0.5, open: 0.5, tongue: 1, cross: 0.85, brow: 0.5, seconds: 1.5 }),
  /** Puzzled: a drop on the nose. */
  puzzled: face({ smile: -0.2, open: 0.3, cross: 1, brow: 0.6, seconds: 1.6 }),
} as const

export type FaceName = keyof typeof FACES

/**
 * The face a touch gets, by what the hand met. `landing` is true for the
 * touch that lands (a press) and false for the dabs of a rub that follow it:
 * the cold-water flinch belongs to the landing only.
 */
export function faceFor(hand: Hand, met: Patch, landing: boolean): FaceName {
  const mud = met === 's' || met === 'm', foam = met === 'b' || met === 'f'
  if (hand === 'sponge') return met === 'c' ? 'squirm' : met === 'p' ? 'peek' : foam ? 'giggle' : 'pleased'
  if (hand === 'hose') return met === 'c' || mud ? 'sputter' : foam ? 'aah' : landing ? 'flinch' : 'aah'
  if (hand === 'cloth') return met === 'c' ? 'snort' : mud ? 'yuck' : foam ? 'giggle' : met === 'p' ? 'proud' : 'pleased'
  return met === 'c' ? 'boing' : mud ? 'yuck' : foam || met === 'w' ? 'giggle' : met === 'p' ? 'peek' : 'boing'
}

/** A wrong use: a tool on something it cannot take forward, or a finger on a shine. These get the best faces. */
export function isWrongUse(hand: Hand, met: Patch): boolean {
  if (hand === 'sponge') return met === 'c' || met === 'p' || met === 'f' || met === 'b'
  if (hand === 'hose') return met === 'c' || met === 's' || met === 'm'
  if (hand === 'cloth') return met === 'c' || met === 's' || met === 'm' || met === 'b' || met === 'f'
  return met === 'p'
}

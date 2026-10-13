import type { Note } from './audio'
import { FULL } from './config'
import type { GnomeId, Kind } from './ground'

// Every answer the glade gives to a finger, written once: a list of timed
// beats, each of which pushes what is seen (a kick to a spring, a puff of
// spores, the next phase of a short-lived thing) and plays what is heard
// (notes kept as plain numbers) at the same moment of game time. Sight and
// sound cannot drift apart: neither has a clock of its own, no note carries a
// delay of its own, and a beat that sounds always moves something. Both stand
// still while the game rests.
// Nobody could listen while these were written: they are made from the
// sheet's words (a creak that rises, a boing, a ding, a tshoo), kept short,
// and held in range by a test.

/** A face a gnome pulls for a moment. */
export type Face = 'wide' | 'shut' | 'ooh'

/** What flies when a beat throws something. */
export type Speck = 'spore' | 'spot' | 'drop' | 'flour' | 'leaf' | 'splash' | 'smoke' | 'grit' | 'bubble'

/** What a pebble does when a beat reaches it. */
export type PebbleMove = 'land' | 'hop' | 'sink' | 'rise' | 'turn'

/** What a beat does to the thing it belongs to. Each thing reads the pushes it knows and leaves the rest. */
export type Kick = {
  /** A push down (negative) or up on the squash spring. */
  squash?: number
  /** A push sideways on the swing spring. */
  swing?: number
  /** Where a breath is held: 1 is full of air, 0 is at rest, below 0 is sagging. */
  puff?: number
  /** How far a house's chimney or rope ladder is out, 0 to 1. */
  build?: number
  /** Whether a house's window is lit, 0 or 1. */
  glow?: number
  /** A push on whoever shows in a house's window. */
  jerk?: number
  /** A push up off the seat, or off the moss for a gnome who is walking. */
  hop?: number
  /** A push on a hat: bending it over, or throwing it up. */
  hatBend?: number
  hatFly?: number
  /** A push on a gnome's lean, and on his head alone. */
  lean?: number
  nod?: number
  face?: Face
  /** Seconds the face is held. */
  faceFor?: number
  /** Whether a gnome has both hands on his bare head. */
  hands?: boolean
  /** A snail's eyes: 0 is out, 1 is pulled in. One value for each eye. */
  eyes?: readonly [number, number]
  /** A push on the sun's rays, and how far its cheeks are puffed out, 0 or 1. */
  spin?: number
  cheeks?: number
  specks?: { what: Speck; count: number; power: number; ring?: boolean }
  /** A ring spreads on the water. */
  ring?: boolean
  /** What the pebble at the beat's point does. */
  pebble?: PebbleMove
  /** The next phase of a short-lived thing: a gate that opens, shuts and falls, a cap that sinks back. */
  phase?: string
}

export type Beat = {
  /** Seconds after the answer starts. */
  at: number
  kick?: Kick
  notes?: readonly Note[]
}

export type Answer = readonly Beat[]

const tone = (frequency: number, glideTo: number | undefined, wave: OscillatorType, peak: number, attack: number, decay: number): Note => ({ kind: 'tone', frequency, glideTo, wave, peak, attack, decay })
const hiss = (frequency: number, glideTo: number | undefined, q: number, peak: number, attack: number, decay: number): Note => ({ kind: 'noise', frequency, glideTo, q, peak, attack, decay })

// ---------------------------------------------------------------- a mushroom under a finger

/** One step of swelling: a notch taller with a small squash, and the creak one step higher. `size` is the size the step arrives at. */
export function swell(kind: Kind, size: number): Answer {
  const n = size - 1
  if (kind === 'red') {
    // A rubbed balloon, and the plip of the spot that pops out on the cap.
    const f = 140 * 1.07 ** n
    return [{ at: 0, kick: { squash: -2.6 }, notes: [tone(f, f * 1.1, 'sawtooth', 0.05, 0.012, 0.1), hiss(1800 + 120 * n, undefined, 6, 0.02, 0.01, 0.08), tone(900 + 60 * n, 1400 + 60 * n, 'sine', 0.05, 0.003, 0.06)] }]
  }
  if (kind === 'bell') {
    // A wet finger on glass.
    const f = 300 * 1.06 ** n
    return [{ at: 0, kick: { squash: -2.2, swing: n % 2 ? 0.5 : -0.5 }, notes: [tone(f, f * 1.06, 'triangle', 0.06, 0.01, 0.11), tone(f * 2.76, undefined, 'sine', 0.02, 0.005, 0.2)] }]
  }
  // A balloon being blown up.
  return [{ at: 0, kick: { squash: -1.8, puff: 0.35 }, notes: [hiss(500 + 90 * n, (500 + 90 * n) * 1.25, 2.2, 0.07, 0.05, 0.1), tone(110 * 1.05 ** n, undefined, 'sine', 0.04, 0.02, 0.12)] }]
}

/** The twelfth step is behind it: the mushroom is full and stops with a soft thump. */
export function full(): Answer {
  return [{ at: 0, kick: { squash: -5 }, notes: [tone(92, 60, 'sine', 0.16, 0.005, 0.18)] }]
}

/** A full mushroom under a finger that goes on holding: it trembles and squeaks and grows no bigger. */
export function tremble(): Answer {
  return [{ at: 0, kick: { swing: 1.4, squash: 1 }, notes: [tone(1500, 1720, 'sine', 0.03, 0.01, 0.06)] }, { at: 0.06, kick: { swing: -2.8 } }, { at: 0.12, kick: { swing: 1.4 } }]
}

/** The finger lifts after a hold: the mushroom springs up, wobbles and settles, with its kind's own last sound. */
export function letGo(kind: Kind, size: number): Answer {
  const low = tone(190 - 5 * size, 140 - 4 * size, 'sine', 0.07, 0.01, 0.2)
  // The red one pops out one more spot with the plip: the spot is drawn on the cap as the plip sounds.
  if (kind === 'red') return [{ at: 0, kick: { squash: 4.2, swing: 0.8, phase: 'spot' }, notes: [low, tone(1300, 1900, 'sine', 0.06, 0.003, 0.06)] }]
  if (kind === 'bell') return [{ at: 0, kick: { squash: 3.4, swing: 1.6 }, notes: [low] }, { at: 0.14, kick: { specks: { what: 'drop', count: 1, power: 0 } }, notes: [tone(2100, 2000, 'sine', 0.07, 0.003, 0.25), tone(3150, undefined, 'sine', 0.02, 0.003, 0.12)] }]
  return [{ at: 0, kick: { squash: 3.6, puff: 0, specks: { what: 'spore', count: 3, power: 0.4 } }, notes: [low, hiss(900, undefined, 0.8, 0.06, 0.01, 0.14)] }]
}

/**
 * A finger has stayed on a mushroom that already stood for longer than a tap: the cap begins to stretch under it
 * with the start of a creak, so the child sees that this is no poke any more before the first step comes.
 */
export function stretch(kind: Kind, size: number): Answer {
  const f = (kind === 'red' ? 140 : kind === 'bell' ? 300 : 110) * 1.06 ** (size - 1)
  return [{ at: 0, kick: kind === 'puff' ? { squash: 2.6, puff: 0.5 } : { squash: 3.4 }, notes: [tone(f * 0.8, f, kind === 'bell' ? 'triangle' : 'sawtooth', 0.04, 0.03, 0.1)] }]
}

/** A tap on a mushroom is a poke, and each kind answers in its own way. */
export function poke(kind: Kind, size: number): Answer {
  if (kind === 'red') {
    // Jelly: a boing that is lower the taller it stands.
    const f = 330 - 14 * size
    return [{ at: 0, kick: { squash: -4, swing: 5 }, notes: [tone(f, f * 0.7, 'triangle', 0.1, 0.006, 0.22)] }, { at: 0.16, kick: { swing: -3 }, notes: [tone(f * 0.9, f * 0.75, 'triangle', 0.05, 0.006, 0.18)] }]
  }
  if (kind === 'bell') {
    const f = 1320 * 0.94 ** size
    return [{ at: 0, kick: { swing: 7, squash: -1 }, notes: [tone(f, undefined, 'sine', 0.12, 0.003, 0.7), tone(f * 2.76, undefined, 'sine', 0.04, 0.003, 0.35), tone(f * 4.2, undefined, 'sine', 0.015, 0.003, 0.2)] }]
  }
  // The puffball breathes in, holds it, and sneezes.
  return [
    { at: 0, kick: { puff: 1, squash: 1.5 }, notes: [hiss(400, 1400, 3, 0.05, 0.3, 0.1)] },
    { at: SNEEZE_AT, kick: { puff: 0, squash: -7, specks: { what: 'spore', count: 6 + size, power: 0.6 + size / FULL } }, notes: [hiss(2400, 600, 0.7, 0.14 + 0.004 * size, 0.008, 0.22), tone(520, 180, 'square', 0.05, 0.005, 0.15)] },
  ]
}
/** Seconds from a poke to the puffball's sneeze. */
export const SNEEZE_AT = 0.5

/** A mushroom pulled by its cap stretches in notches, each with its kind's own strain. */
export function strain(kind: Kind, notch: number): Answer {
  if (kind === 'red') return [{ at: 0, kick: { swing: notch % 2 ? 0.6 : -0.6 }, notes: [tone(600 + 70 * notch, (600 + 70 * notch) * 1.12, 'sine', 0.04, 0.02, 0.09)] }]
  if (kind === 'bell') return [{ at: 0, kick: { swing: notch % 2 ? 1.2 : -1.2 }, notes: [tone(220 + 30 * notch, 200 + 30 * notch, 'triangle', 0.06, 0.004, 0.12)] }]
  // A puffball goes flat with one long parp, which starts with the pull and falls as the air goes out of it; the notches after the first only flatten it further.
  if (notch > 1) return [{ at: 0, kick: { puff: -0.1 * notch } }]
  return [{ at: 0, kick: { puff: -0.3, squash: -2 }, notes: [tone(132, 74, 'sawtooth', 0.07, 0.03, PARP_S), hiss(420, 240, 2.5, 0.03, 0.05, PARP_S * 0.8)] }]
}
/** Seconds the puffball's one long parp lasts. */
export const PARP_S = 0.9

/**
 * A pulled mushroom comes loose: the cap leans over with a creak that rises, and from now a finger that lets go
 * has it out. This is what shows a child that the mushroom is about to go, before it goes.
 */
export function loosen(kind: Kind, size: number): Answer {
  const f = kind === 'red' ? 320 : kind === 'bell' ? 440 : 180
  return [{ at: 0, kick: { swing: 3.2, squash: 2 }, notes: [tone(f - 6 * size, (f - 6 * size) * 1.6, 'sawtooth', 0.06, 0.02, 0.16), hiss(1400, 2400, 3, 0.04, 0.01, 0.12)] }]
}

/** The finger came back down before it let go: the mushroom sits tight again, with the creak falling. */
export function tighten(): Answer {
  return [{ at: 0, kick: { swing: -1.6, squash: -2.5 }, notes: [tone(360, 200, 'sawtooth', 0.05, 0.01, 0.12)] }]
}

/** Let go before it came out: it snaps back and wobbles. */
export function snapBack(size: number): Answer {
  return [{ at: 0, kick: { squash: -6, swing: 3, puff: 0 }, notes: [tone(250 - 6 * size, 160 - 4 * size, 'triangle', 0.08, 0.005, 0.18)] }]
}

/** Seconds from the pop to the moment the mushroom is under the moss again. */
export const DIVE_S = 0.8

/** Pulled far enough: it comes out with a pop and dives back into the earth, cap first. */
export function comeOut(kind: Kind, size: number): Answer {
  const pop: Note[] = [tone(420, 980, 'sine', 0.14, 0.004, 0.07), hiss(3000, undefined, 1, 0.05, 0.002, 0.03)]
  if (kind === 'red') {
    // Its spots fly off one after another and patter down like hail.
    const patter: Beat[] = Array.from({ length: 5 }, (_, i) => ({ at: 0.12 + 0.07 * i, kick: { specks: { what: 'spot' as const, count: 1 + Math.floor(size / 5), power: 1 } }, notes: [hiss(5000 - 300 * i, undefined, 4, 0.03, 0.002, 0.025)] }))
    return [{ at: 0, kick: { specks: { what: 'spot', count: 2, power: 1 } }, notes: pop }, ...patter, { at: 0.6, kick: { specks: { what: 'grit', count: 3, power: 0.6 } }, notes: [tone(220, 90, 'sine', 0.12, 0.02, 0.16)] }]
  }
  if (kind === 'bell') {
    const jangle: Beat[] = [1.26, 0.89, 1.5].map((ratio, i) => ({ at: 0.07 * (i + 1), kick: { specks: { what: 'drop' as const, count: 1, power: 0.6 } }, notes: [tone(1100 * ratio * 0.95 ** size, undefined, 'sine', 0.06, 0.003, 0.2)] }))
    return [
      { at: 0, kick: { specks: { what: 'drop', count: 2, power: 0.6 } }, notes: [...pop, tone(1100 * 0.95 ** size, undefined, 'sine', 0.06, 0.003, 0.2)] },
      ...jangle,
      { at: 0.58, kick: { specks: { what: 'grit', count: 2, power: 0.5 } }, notes: [tone(300, 120, 'sine', 0.1, 0.01, 0.1)] },
      { at: 0.7, kick: { specks: { what: 'drop', count: 2, power: 0.4 } }, notes: [tone(260, 110, 'sine', 0.08, 0.01, 0.1)] },
    ]
  }
  // The puffball slips out of the fingers and back into the moss with a slurp.
  return [{ at: 0, kick: { specks: { what: 'spore', count: 5, power: 0.5 } }, notes: pop }, { at: 0.5, kick: { specks: { what: 'grit', count: 3, power: 0.5 } }, notes: [hiss(700, 2200, 5, 0.08, 0.12, 0.08)] }]
}

/** A lifted path comes loose: its pebbles leave the moss and turn, with a rattle down its whole length that rises. */
export function pathLoose(): Answer {
  return [0, 1, 2, 3].map((i) => ({ at: 0.035 * i, kick: { pebble: 'turn' as const }, notes: [tone(700 + 160 * i, 760 + 170 * i, 'triangle', 0.045, 0.003, 0.05), hiss(2600 + 300 * i, undefined, 3, 0.03, 0.002, 0.03)] }))
}

/** The finger brought a loose path back down: it sits in the moss again, with a short clatter that falls. */
export function pathSits(): Answer {
  return [0, 1].map((i) => ({ at: 0.05 * i, kick: { pebble: 'sink' as const }, notes: [tone(520 - 140 * i, 440 - 120 * i, 'triangle', 0.05, 0.003, 0.06)] }))
}

/** A gnome who waits to see whether the finger comes back to its path: he shifts his weight towards it with a small questioning sound. */
export function shiftWeight(who: GnomeId): Answer {
  return [{ at: 0, kick: { lean: 1.6, nod: -1.2, hop: 1.2 }, notes: [tone(VOICE[who] * 1.5, VOICE[who] * 1.9, 'sine', 0.035, 0.02, 0.12)] }]
}

/** Seconds a peeking cap is seen, and when in them it turns and when it sinks. */
export const PEEK_S = 0.8

/** No room for one more: a cap peeks out, turns once and slips back with a low gulp. */
export function peek(): Answer {
  return [{ at: 0, kick: { phase: 'up' }, notes: [tone(500, 700, 'sine', 0.05, 0.004, 0.05)] }, { at: 0.5, kick: { phase: 'sink' }, notes: [tone(160, 110, 'sine', 0.1, 0.03, 0.2)] }]
}

/** A finger that ran off: the button it had started slips back into the earth with a gulp. */
export function slipBack(): Answer {
  return [{ at: 0, kick: { phase: 'sink' }, notes: [tone(190, 120, 'sine', 0.09, 0.02, 0.16)] }]
}

// ---------------------------------------------------------------- doors

/** A door goes into a mushroom, and each kind makes a house of it in its own way. */
export function doorIn(kind: Kind, size: number): Answer {
  if (kind === 'red') {
    // The door thuds in, a crooked chimney pokes out of the cap with a pok, and coughs one smoke ring.
    return [
      { at: 0, kick: { squash: -5, build: 0 }, notes: [tone(150, 80, 'sine', 0.16, 0.004, 0.14), hiss(600, undefined, 1.2, 0.06, 0.003, 0.05)] },
      { at: 0.36, kick: { build: 1, squash: 2.5 }, notes: [tone(700, 1050, 'sine', 0.1, 0.004, 0.05)] },
      { at: 0.78, kick: { squash: -1.2, specks: { what: 'smoke', count: 7, power: 0.7, ring: true } }, notes: [hiss(900, 500, 1.4, 0.08, 0.02, 0.12), tone(210, 170, 'triangle', 0.04, 0.01, 0.08)] },
    ]
  }
  if (kind === 'bell') {
    // The door clicks in with a chime, and a knotted rope unrolls down the stem with a rattle.
    const f = 1568 * 0.96 ** size
    const rattle: Beat[] = [0.25, 0.5, 0.75, 1].map((out, i) => ({ at: 0.3 + 0.14 * i, kick: { build: out, swing: i % 2 ? -0.5 : 0.5 }, notes: [tone(520 - 50 * i, undefined, 'square', 0.03, 0.002, 0.03), hiss(2200, undefined, 5, 0.03, 0.002, 0.03)] }))
    return [{ at: 0, kick: { swing: 2.5, build: 0 }, notes: [tone(2400, undefined, 'square', 0.03, 0.001, 0.02), tone(f, undefined, 'sine', 0.1, 0.003, 0.5), tone(f * 1.5, undefined, 'sine', 0.05, 0.003, 0.4)] }, ...rattle]
  }
  // The door squeaks in like a cork, the ball lets out a sigh and sags, then plumps up again with a pomp.
  return [
    { at: 0, kick: { squash: -3, build: 1 }, notes: [tone(900, 1500, 'sawtooth', 0.04, 0.03, 0.09)] },
    { at: 0.3, kick: { puff: -0.7 }, notes: [hiss(1200, 500, 0.8, 0.07, 0.08, 0.3)] },
    { at: 0.95, kick: { puff: 0, squash: 4 }, notes: [tone(130, 190, 'sine', 0.14, 0.01, 0.12)] },
  ]
}

/** A door is taken off a house: it comes away with a creak, and the house is a mushroom again. */
export function doorOff(): Answer {
  return [{ at: 0, kick: { squash: 3, build: 0, glow: 0 }, notes: [tone(380, 520, 'sawtooth', 0.04, 0.02, 0.1), tone(190, 150, 'sine', 0.08, 0.004, 0.06)] }]
}

/** A tap on a door with nobody behind it: a knock, and the house gives a little. */
export function knockEmpty(kind: Kind): Answer {
  const f = kind === 'red' ? 210 : kind === 'bell' ? 640 : 150
  return [{ at: 0, kick: { squash: -1.6, swing: 0.6 }, notes: [tone(f, f * 0.8, kind === 'bell' ? 'sine' : 'triangle', 0.1, 0.003, 0.07)] }, { at: 0.17, kick: { squash: -1.2, swing: -0.6 }, notes: [tone(f * 1.08, f * 0.85, kind === 'bell' ? 'sine' : 'triangle', 0.08, 0.003, 0.07)] }]
}

/** A door dropped where a door already is: it clacks against the first and goes back. */
export function doorOnDoor(): Answer {
  return [{ at: 0, kick: { swing: 2.2 }, notes: [tone(330, 260, 'square', 0.06, 0.002, 0.04), hiss(1800, undefined, 3, 0.04, 0.002, 0.03)] }]
}

/** A door comes back to the cart with a clack, and the cart rocks. */
export function backOnCart(): Answer {
  return [{ at: 0, kick: { hop: 3 }, notes: [tone(280, 220, 'square', 0.07, 0.002, 0.04), hiss(1400, undefined, 2.5, 0.05, 0.002, 0.04)] }]
}

/** A door on the cart is tapped and there is no mushroom to send it to: the doors rattle. */
export function rattleCart(): Answer {
  return [{ at: 0, kick: { hop: 2 }, notes: [tone(300, undefined, 'square', 0.05, 0.002, 0.03)] }, { at: 0.08, kick: { hop: -1.5 }, notes: [tone(340, undefined, 'square', 0.05, 0.002, 0.03)] }, { at: 0.16, kick: { hop: 1 }, notes: [tone(270, undefined, 'square', 0.04, 0.002, 0.03)] }]
}

/** A door leaves the cart: it is in the hand, or on its way to a mushroom. */
export function doorOut(): Answer {
  return [{ at: 0, kick: { hop: -2 }, notes: [tone(440, 660, 'triangle', 0.06, 0.004, 0.08)] }]
}

/** Seconds a door stands on a path as a gate before it is back on the cart. */
export const GATE_S = 1.9

/** A door on a path is a gate to nowhere: it stands up, creaks open and shut once, falls flat with a clap and goes back to the cart. */
export function gate(): Answer {
  return [
    { at: 0, kick: { phase: 'up' }, notes: [tone(240, 300, 'triangle', 0.06, 0.01, 0.08)] },
    { at: 0.35, kick: { phase: 'open' }, notes: [tone(420, 610, 'sawtooth', 0.035, 0.05, 0.2)] },
    { at: 0.8, kick: { phase: 'shut' }, notes: [tone(600, 400, 'sawtooth', 0.035, 0.05, 0.18)] },
    { at: 1.2, kick: { phase: 'flat', specks: { what: 'grit', count: 4, power: 0.7 } }, notes: [hiss(1500, undefined, 0.8, 0.14, 0.002, 0.07), tone(170, 120, 'sine', 0.1, 0.003, 0.08)] },
    { at: 1.6, kick: { phase: 'home' }, notes: [tone(500, 800, 'sine', 0.04, 0.01, 0.12)] },
  ]
}

/** Seconds a door floats down the stream as a raft before it is back on the cart. */
export const RAFT_S = 2.2

/** A door on the stream is a raft: it floats off downstream, turning, with a gurgle. */
export function raft(): Answer {
  const gurgle: Beat[] = [0.35, 0.7, 1.05, 1.4].map((at, i) => ({ at, kick: { ring: true }, notes: [tone(300 - 30 * i, 420 - 30 * i, 'sine', 0.06, 0.03, 0.08), tone(180 - 12 * i, 250, 'sine', 0.04, 0.02, 0.06)] }))
  return [{ at: 0, kick: { ring: true, specks: { what: 'splash', count: 4, power: 0.6 } }, notes: [tone(230, 340, 'sine', 0.1, 0.006, 0.12), hiss(1200, undefined, 0.8, 0.05, 0.004, 0.1)] }, ...gurgle, { at: 1.8, kick: { phase: 'home' }, notes: [tone(500, 800, 'sine', 0.04, 0.01, 0.12)] }]
}

/** A gnome who waits is handed a door: he holds it up, knocks on it twice, looks behind it and hands it back. */
export const KNOCKED_S = 1.7
export function knockOnDoor(who: GnomeId): Answer {
  const f = VOICE[who]
  return [
    { at: 0, kick: { phase: 'held', hop: 2, face: 'wide', faceFor: 0.3 }, notes: [tone(f * 1.5, f * 1.8, 'sine', 0.05, 0.02, 0.08)] },
    { at: 0.32, kick: { phase: 'knock', hop: -1.5 }, notes: [tone(310, 250, 'triangle', 0.12, 0.002, 0.05)] },
    { at: 0.56, kick: { phase: 'knock', hop: -1.5 }, notes: [tone(310, 250, 'triangle', 0.12, 0.002, 0.05)] },
    { at: 0.95, kick: { phase: 'look', lean: 3, face: 'ooh', faceFor: 0.4 }, notes: [tone(f, f * 1.3, 'sine', 0.04, 0.04, 0.1)] },
    { at: 1.4, kick: { phase: 'home', lean: -2 }, notes: [tone(500, 800, 'sine', 0.04, 0.01, 0.12)] },
  ]
}

// ---------------------------------------------------------------- the water

/** A finger in the water: one ring with a bloop, higher upstream and lower down by the pond. */
export function bloop(along: number): Answer {
  const f = 560 - 260 * along
  return [{ at: 0, kick: { ring: true, specks: { what: 'splash', count: 3, power: 0.5 } }, notes: [tone(f, f * 1.5, 'sine', 0.12, 0.008, 0.12)] }]
}

/** The frog on its dome of water croaks lower the longer the finger stays. `count` is which croak this is, from 0. */
export function croak(count: number): Answer {
  const f = 150 * 0.92 ** Math.min(count, 9)
  return [{ at: 0, kick: { squash: -3 }, notes: [tone(f, f * 0.8, 'square', 0.05, 0.01, 0.07)] }, { at: 0.09, kick: { squash: -2 }, notes: [tone(f * 0.97, f * 0.78, 'square', 0.05, 0.01, 0.12)] }]
}

/** The finger lifts and the frog plops back. */
export function plop(along: number): Answer {
  const f = 300 - 120 * along
  return [{ at: 0, kick: { ring: true, specks: { what: 'splash', count: 6, power: 0.9 } }, notes: [tone(f, f * 1.6, 'sine', 0.12, 0.006, 0.14), hiss(1500, undefined, 0.7, 0.07, 0.004, 0.18)] }]
}

/** Water pulled up by a finger stretches like toffee, a notch at a time. */
export function toffee(notch: number): Answer {
  return [{ at: 0, kick: { specks: { what: 'drop', count: 1, power: 0.3 } }, notes: [tone(240 + 46 * notch, 270 + 46 * notch, 'sine', 0.06, 0.03, 0.1)] }]
}

/** The column of water is let go and falls back with a splat. */
export function splat(): Answer {
  return [{ at: 0, kick: { ring: true, specks: { what: 'splash', count: 9, power: 1.2 } }, notes: [hiss(1100, 500, 0.6, 0.16, 0.003, 0.2), tone(130, 90, 'sine', 0.12, 0.004, 0.12)] }]
}

/** A pebble laid in the water is a flat stepping stone: a deep plonk and a ring. */
export function stone(): Answer {
  return [{ at: 0, kick: { pebble: 'land', ring: true }, notes: [tone(170, 110, 'sine', 0.15, 0.004, 0.16), hiss(700, undefined, 1, 0.04, 0.004, 0.08)] }]
}

// ---------------------------------------------------------------- pebbles

/** The notes the pebbles are tuned to, as a chime bar set: every pebble has its own by where it lies. */
const CHIME = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568]
export function chimeOf(x: number, y: number): number {
  return CHIME[(((x / 20) * 3 + (y / 20) * 5) % CHIME.length + CHIME.length) % CHIME.length]
}

/** A pebble is laid on the moss with a clack. */
export function clack(x: number, y: number): Answer {
  return [{ at: 0, kick: { pebble: 'land' }, notes: [tone(chimeOf(x, y) * 0.5, undefined, 'triangle', 0.07, 0.002, 0.05), hiss(2600, undefined, 3, 0.05, 0.002, 0.03)] }]
}

/** No more pebbles can be laid: one hops up under the finger with a clack and drops back into the moss with a thup. */
export const LOOSE_S = 0.5
export function noMore(): Answer {
  return [{ at: 0, kick: { phase: 'up' }, notes: [tone(300, undefined, 'triangle', 0.07, 0.002, 0.05), hiss(2600, undefined, 3, 0.05, 0.002, 0.03)] }, { at: 0.32, kick: { phase: 'sink' }, notes: [tone(120, 80, 'sine', 0.1, 0.006, 0.09)] }]
}

/** A finger lands on a pebble: it sinks and the ones beside it rise, with a creak down. */
export function seesawDown(): Answer {
  return [{ at: 0, kick: { pebble: 'sink' }, notes: [tone(210, 150, 'sawtooth', 0.045, 0.03, 0.14)] }]
}

/** The finger lifts after a hold: the pebble comes back and its neighbours settle, with a creak up. */
export function seesawUp(): Answer {
  return [{ at: 0, kick: { pebble: 'rise' }, notes: [tone(150, 230, 'sawtooth', 0.045, 0.03, 0.14)] }]
}

/** One pebble of the run that follows a tap: it hops, with its own note. `far` is how many pebbles from the tap it lies. */
export function hopNote(x: number, y: number, far: number): readonly Note[] {
  const f = chimeOf(x, y)
  return [tone(f, undefined, 'sine', 0.09 * 0.86 ** far, 0.003, 0.22), ...(far === 0 ? [hiss(2600, undefined, 3, 0.05, 0.002, 0.03)] : [])]
}
/** Seconds between one pebble's hop and the next along the path, and how many pebbles each way the run reaches. */
export const RUN_STEP_S = 0.07
export const RUN_REACH = 14

/** A path lifted by one pebble rattles like a string of beads, a notch at a time. */
export function beads(notch: number): Answer {
  return [{ at: 0, kick: { pebble: 'turn' }, notes: [tone(700 + 60 * notch, undefined, 'square', 0.03, 0.002, 0.025), hiss(3200, undefined, 5, 0.03, 0.002, 0.03)] }]
}

/** The path is let go from too low to roll away: it drops back with a clack. */
export function dropBack(): Answer {
  return [{ at: 0, kick: { pebble: 'land' }, notes: [tone(260, undefined, 'triangle', 0.08, 0.002, 0.05), hiss(2200, undefined, 2, 0.06, 0.002, 0.04)] }]
}

/** Seconds a path's pebbles take to roll away to the edge. */
export const ROLL_S = 1.1

/** Let go from high enough, the pebbles roll away to the edge with a clatter. */
export function rollAway(): Answer {
  return [0, 0.11, 0.2, 0.31, 0.43, 0.58, 0.78].map((at, i) => ({ at, kick: { specks: { what: 'grit' as const, count: 2, power: 0.6 } }, notes: [tone(880 - 70 * i, undefined, 'square', 0.035 - 0.003 * i, 0.002, 0.03), hiss(2800 - 200 * i, undefined, 4, 0.04 - 0.004 * i, 0.002, 0.03)] }))
}

/** Where two paths meet, the pebbles shuffle round into a small ring with a run of clicks. */
export function shuffle(): Answer {
  return [0, 0.08, 0.16, 0.24, 0.32].map((at, i) => ({ at, kick: { pebble: 'turn' as const }, notes: [tone(1200 + 150 * i, undefined, 'square', 0.03, 0.002, 0.02), hiss(3400, undefined, 6, 0.03, 0.002, 0.02)] }))
}

/** A finger lands on a mushroom that stands: it gives under the finger with a soft pat, lower the taller it is, before the touch turns out to be a poke, a hold or a pull. */
export function give(size: number): Answer {
  return [{ at: 0, kick: { squash: -2.4 }, notes: [tone(210 - 9 * size, 150 - 6 * size, 'sine', 0.06, 0.003, 0.05), hiss(700, undefined, 1.2, 0.02, 0.002, 0.03)] }]
}

/** A path reaches a red mushroom with a door: the last pebble settles under the door as a step with a clunk. */
export function stepUnderDoor(): Answer {
  return [{ at: 0, kick: { squash: -1.5 }, notes: [tone(140, 100, 'sine', 0.15, 0.004, 0.1), hiss(900, undefined, 1.5, 0.05, 0.003, 0.05)] }]
}

/** A path reaches a red mushroom with no door: the pebbles pile against the stem and the mushroom hiccups. */
export function hiccup(): Answer {
  return [{ at: 0, kick: { squash: -1 }, notes: [tone(260, undefined, 'triangle', 0.07, 0.002, 0.05)] }, { at: 0.22, kick: { squash: 5.5, swing: 1 }, notes: [tone(480, 760, 'sine', 0.1, 0.008, 0.07)] }]
}

/** A pebble lands nearer a bell, and it rings a little louder: `near` runs from 0, far off, to 1, at its foot. */
export function ting(size: number, near: number): Answer {
  const f = 1320 * 0.94 ** size
  return [{ at: 0, kick: { swing: 0.6 + 1.6 * near }, notes: [tone(f * 2, undefined, 'sine', 0.02 + 0.07 * near, 0.003, 0.3)] }]
}

/** The last pebble reaches the bell and sets it swinging. */
export function setSwinging(size: number): Answer {
  const f = 1320 * 0.94 ** size
  return [{ at: 0, kick: { swing: 9 }, notes: [tone(f, undefined, 'sine', 0.12, 0.003, 0.6), tone(f * 2, undefined, 'sine', 0.06, 0.003, 0.4)] }, { at: 0.4, kick: { swing: -4 }, notes: [tone(f, undefined, 'sine', 0.06, 0.003, 0.4)] }]
}

/** A pebble sinks into a puffball's soft foot with a muffled thump and squeezes a small ring of spores out of it with a pff. */
export function softThump(): Answer {
  return [{ at: 0, kick: { squash: -2.4, specks: { what: 'spore', count: 6, power: 0.35, ring: true } }, notes: [tone(95, 70, 'sine', 0.14, 0.006, 0.1), hiss(1600, 900, 0.9, 0.05, 0.01, 0.12)] }]
}

// ---------------------------------------------------------------- a gnome

/** Each gnome grumbles, hums and squeaks at his own pitch. */
export const VOICE: Record<GnomeId, number> = { tall: 190, baker: 150, sleepy: 118, sneezy: 240 }

/** A finger lands on a gnome: his hat goes down over his eyes with a grunt. */
export function squashHat(who: GnomeId): Answer {
  const f = VOICE[who]
  return [{ at: 0, kick: { hop: -3, face: 'shut', faceFor: 0.3 }, notes: [tone(f, f * 0.85, 'triangle', 0.07, 0.01, 0.1)] }]
}

/** While the finger stays the grumble rises, step by step. */
export function grumble(who: GnomeId, count: number): Answer {
  const f = VOICE[who] * (1 + 0.08 * Math.min(count, 8))
  return [{ at: 0, kick: { hop: -1.2 }, notes: [tone(f, f * 1.05, 'sawtooth', 0.035, 0.02, 0.14), tone(f * 0.5, undefined, 'sine', 0.04, 0.02, 0.14)] }]
}

/** The finger lifts after a hold and the hat springs back with a twang. */
export function hatBack(who: GnomeId): Answer {
  const f = VOICE[who]
  return [{ at: 0, kick: { hop: 5, hatFly: 3.5, face: 'wide', faceFor: 0.7 }, notes: [tone(f * 2, f * 1.2, 'triangle', 0.08, 0.004, 0.25)] }]
}

/** A tap on a gnome is a poke, and each has his own. */
export function pokeGnome(who: GnomeId): Answer {
  switch (who) {
    case 'tall':
      // The hat bends right over and boings back.
      return [{ at: 0, kick: { hatBend: 9, face: 'wide', faceFor: 0.8 }, notes: [tone(240, 180, 'sine', 0.1, 0.006, 0.14)] }, { at: 0.25, kick: { hatBend: -4 }, notes: [tone(300, 620, 'sine', 0.1, 0.006, 0.2)] }]
    case 'baker':
      // He goes off in a cloud of flour.
      return [{ at: 0, kick: { hop: 7, face: 'ooh', faceFor: 0.7, specks: { what: 'flour', count: 12, power: 0.8 } }, notes: [hiss(700, undefined, 0.6, 0.12, 0.01, 0.25), tone(110, 80, 'sine', 0.08, 0.005, 0.15)] }]
    case 'sleepy':
      // He snorts awake, looks about, and sighs.
      return [{ at: 0, kick: { hop: 4, face: 'wide', faceFor: 1.1 }, notes: [hiss(260, 180, 5, 0.12, 0.02, 0.16)] }, { at: 0.55, kick: { nod: 2 }, notes: [tone(300, 200, 'sine', 0.03, 0.05, 0.3)] }]
    case 'sneezy':
      // His nose honks.
      return [{ at: 0, kick: { hop: 3, face: 'shut', faceFor: 0.35 }, notes: [tone(330, 300, 'square', 0.07, 0.01, 0.2), tone(495, 450, 'square', 0.03, 0.01, 0.2)] }]
  }
}

/** A hat pulled up by a finger strains, a notch at a time, before it comes off. */
export function hatStrain(who: GnomeId, notch: number): Answer {
  const f = VOICE[who] * (1.4 + 0.12 * notch)
  return [{ at: 0, kick: { hop: 1.2 }, notes: [tone(f, f * 1.08, 'sawtooth', 0.03, 0.02, 0.08)] }]
}

/** Seconds from the pop to the plop: how long the hat is off his head. */
export const HAT_OFF_S = 0.75

/**
 * The hat comes off with a cork's pop and flies up, he covers his bare head with both hands and squeaks, and the
 * hat drops back on with a plop.
 */
export function hatPop(who: GnomeId): Answer {
  const f = VOICE[who]
  return [
    { at: 0, kick: { hop: 4, hatFly: 11, face: 'wide', faceFor: 0.6 }, notes: [tone(380, 900, 'sine', 0.15, 0.003, 0.06), hiss(2800, undefined, 1, 0.05, 0.002, 0.03)] },
    { at: 0.16, kick: { hands: true, hop: -2 }, notes: [tone(f * 4.2, f * 5, 'sine', 0.06, 0.01, 0.14)] },
    { at: HAT_OFF_S, kick: { hands: false, hop: -4, face: 'shut', faceFor: 0.25 }, notes: [tone(200, 120, 'sine', 0.13, 0.005, 0.12)] },
  ]
}

/** The sneezy gnome answers spores with a sneeze of his own, and his hat jumps off his head. */
export function sneezeBack(): Answer {
  return [
    { at: 0, kick: { face: 'ooh', faceFor: 0.32, nod: -3 }, notes: [tone(500, 700, 'sine', 0.04, 0.2, 0.05)] },
    { at: 0.32, kick: { hop: 6, hatFly: 7, nod: 5, face: 'shut', faceFor: 0.5, specks: { what: 'drop', count: 4, power: 0.7 } }, notes: [hiss(3000, 800, 0.7, 0.14, 0.006, 0.2), tone(600, 200, 'square', 0.05, 0.005, 0.14)] },
  ]
}
/** Seconds after a puffball's sneeze that the sneezy gnome sneezes back. */
export const SNEEZE_BACK_AFTER = 0.12

/** The sleepy gnome is startled by a pop. */
export function startle(): Answer {
  return [{ at: 0, kick: { hop: 5, face: 'wide', faceFor: 0.9 }, notes: [tone(380, 520, 'sine', 0.05, 0.01, 0.1)] }]
}

/** A gnome who waits tests the first pebble with one toe, tap tap. */
export function toeTaps(): Answer {
  return [{ at: 0, kick: { hop: 2.5, lean: 1.5 }, notes: [tone(330, undefined, 'triangle', 0.06, 0.002, 0.04)] }, { at: 0.22, kick: { hop: 2.5, lean: 1.5 }, notes: [tone(330, undefined, 'triangle', 0.06, 0.002, 0.04)] }]
}

/** A gnome shoulders his bundle and sets off. */
export function setOff(who: GnomeId): Answer {
  const f = VOICE[who]
  return [{ at: 0, kick: { hop: 6, face: 'wide', faceFor: 0.4 }, notes: [tone(f * 1.5, f * 2, 'triangle', 0.06, 0.01, 0.1)] }]
}

/** He lands: on the moss from the log, or on the log again. */
export function land(who: GnomeId): Answer {
  return [{ at: 0, kick: { hop: -4 }, notes: [tone(VOICE[who] * 0.6, Math.max(56, VOICE[who] * 0.4), 'sine', 0.12, 0.004, 0.1)] }]
}

/**
 * One step over the moss where no pebbles lie, each gnome in his own way: the tall one a long slow stride with
 * his hat swinging after it, the baker a bounce, the sleepy one a shuffle, the sneezy one a quick step and a sniff.
 * It plays on the gnome, and the moss under his foot throws up a little grit.
 */
export function mossStep(who: GnomeId): Answer {
  if (who === 'tall') return [{ at: 0, kick: { hatBend: 2.2, lean: 0.8, specks: { what: 'grit', count: 2, power: 0.3 } }, notes: [tone(84, 62, 'sine', 0.12, 0.006, 0.14), hiss(500, undefined, 0.9, 0.03, 0.004, 0.06)] }]
  if (who === 'baker') return [{ at: 0, kick: { hop: 3.4, specks: { what: 'flour', count: 2, power: 0.25 } }, notes: [tone(170, 250, 'triangle', 0.08, 0.004, 0.07), hiss(900, undefined, 1.2, 0.03, 0.003, 0.04)] }]
  if (who === 'sleepy') return [{ at: 0, kick: { nod: 1.6, specks: { what: 'grit', count: 1, power: 0.2 } }, notes: [hiss(420, 300, 0.8, 0.07, 0.03, 0.16)] }]
  return [{ at: 0, kick: { hop: 2, nod: -1.4, specks: { what: 'grit', count: 1, power: 0.3 } }, notes: [tone(260, 300, 'triangle', 0.05, 0.003, 0.04), hiss(2600, 3400, 5, 0.04, 0.01, 0.05)] }]
}

/** A step in the stream for a gnome who wades it: the water rings round his legs and splashes, with a deep slosh. It plays at the place. */
export function wade(): Answer {
  return [{ at: 0, kick: { ring: true, specks: { what: 'splash', count: 4, power: 0.7 } }, notes: [hiss(800, 380, 0.7, 0.1, 0.01, 0.18), tone(150, 96, 'sine', 0.09, 0.006, 0.14)] }]
}

/** A gnome who hops the stream takes off with a hup. */
export function hup(who: GnomeId): Answer {
  const f = VOICE[who]
  return [{ at: 0, kick: { hop: 5, face: 'ooh', faceFor: 0.5 }, notes: [tone(f * 1.4, f * 2.4, 'triangle', 0.07, 0.01, 0.12)] }]
}

/** He comes down on the far bank, and what his heels caught of the water flies. It plays at the place. */
export function splashDown(): Answer {
  return [{ at: 0, kick: { ring: true, specks: { what: 'drop', count: 5, power: 0.9 } }, notes: [tone(120, 80, 'sine', 0.12, 0.004, 0.1), hiss(1300, 700, 0.8, 0.07, 0.004, 0.12)] }]
}

/** At the end of a path that leads nowhere he scratches his head with a rasp. */
export function scratch(): Answer {
  return [0, 0.18, 0.36].map((at, i) => ({ at, kick: { nod: i % 2 ? -2.5 : 2.5, hands: i < 2 }, notes: [hiss(1900 + 200 * i, 1400, 6, 0.06, 0.01, 0.07)] }))
}

/** Round and round a loop until he is dizzy: he sits down with a bump. */
export function sitDown(who: GnomeId): Answer {
  return [{ at: 0, kick: { hop: -7, face: 'shut', faceFor: 0.7, specks: { what: 'grit', count: 3, power: 0.5 } }, notes: [tone(100, 70, 'sine', 0.16, 0.004, 0.14), tone(VOICE[who] * 2, VOICE[who] * 1.2, 'sine', 0.04, 0.01, 0.2)] }]
}

/** He gets up again. */
export function getUp(who: GnomeId): Answer {
  return [{ at: 0, kick: { hop: 5 }, notes: [tone(VOICE[who], VOICE[who] * 1.5, 'triangle', 0.05, 0.02, 0.1)] }]
}

/** He passes a door on his way and gives it a nod. */
export function passDoor(who: GnomeId): Answer {
  return [{ at: 0, kick: { nod: 3, hop: 1.5 }, notes: [tone(VOICE[who] * 2, VOICE[who] * 2.4, 'sine', 0.04, 0.01, 0.07)] }]
}

/** A puffball he brushes past lets off a small puff, and he ducks. */
export function brushPuff(): Answer {
  return [{ at: 0, kick: { squash: -3, specks: { what: 'spore', count: 4, power: 0.4 } }, notes: [hiss(1400, 800, 0.8, 0.07, 0.01, 0.12)] }]
}

/** The tall gnome bumps his hat on a door frame that is too low. */
export function bonk(): Answer {
  return [{ at: 0, kick: { hatBend: -8, hop: -2, face: 'shut', faceFor: 0.3 }, notes: [tone(170, 120, 'sine', 0.16, 0.002, 0.1), tone(520, 390, 'triangle', 0.05, 0.002, 0.08)] }]
}

/** His hat lies on the step already, and he bumps his bare head on the same door frame. */
export function bump(): Answer {
  return [{ at: 0, kick: { hop: -3, nod: 6, face: 'shut', faceFor: 0.3 }, notes: [tone(190, 130, 'sine', 0.14, 0.002, 0.1), tone(420, 330, 'triangle', 0.04, 0.002, 0.07)] }]
}

/** He goes down on hands and knees to crawl in. */
export function crawl(): Answer {
  return [{ at: 0, kick: { hop: -3, lean: 4 }, notes: [tone(160, 110, 'sawtooth', 0.04, 0.03, 0.2)] }]
}

/** He stoops to get through a middling door. */
export function stoop(): Answer {
  return [{ at: 0, kick: { lean: 3, nod: 3 }, notes: [tone(200, 160, 'triangle', 0.05, 0.03, 0.14)] }]
}

/** The baker rattles his empty bucket towards the stream and sighs. */
export function emptyBucket(): Answer {
  return [{ at: 0, kick: { hop: 2, lean: 2 }, notes: [tone(620, undefined, 'square', 0.035, 0.002, 0.03)] }, { at: 0.12, kick: { hop: 1.5 }, notes: [tone(700, undefined, 'square', 0.035, 0.002, 0.03)] }, { at: 0.5, kick: { nod: 3 }, notes: [hiss(900, 500, 0.8, 0.05, 0.08, 0.3)] }]
}

/** The baker fills his bucket. */
export function fillBucket(): Answer {
  return [{ at: 0, kick: { lean: 3, ring: true, specks: { what: 'splash', count: 5, power: 0.7 } }, notes: [tone(260, 520, 'sine', 0.1, 0.02, 0.2), hiss(1300, undefined, 0.8, 0.06, 0.01, 0.16)] }]
}

/** He slops water as he carries it. */
export function slop(): Answer {
  return [{ at: 0, kick: { hop: 2, specks: { what: 'drop', count: 2, power: 0.5 } }, notes: [tone(480, 380, 'sine', 0.05, 0.004, 0.06)] }]
}

/** He looks at the water he cannot reach. */
export function lookAtWater(): Answer {
  return [{ at: 0, kick: { lean: 2.5, nod: 2, face: 'ooh', faceFor: 0.8 }, notes: [tone(170, 130, 'sine', 0.06, 0.06, 0.4)] }]
}

/** The sleepy gnome yawns. */
export function yawn(): Answer {
  return [{ at: 0, kick: { nod: -3, face: 'ooh', faceFor: 0.7 }, notes: [tone(240, 110, 'sine', 0.07, 0.25, 0.35)] }]
}

/** The sleepy gnome is woken by someone passing his door, and pulls his nightcap down over his ears with a groan. */
export function groan(): Answer {
  return [{ at: 0, kick: { jerk: 6 }, notes: [tone(120, 86, 'sawtooth', 0.06, 0.05, 0.35)] }, { at: 0.3, kick: { jerk: -3 }, notes: [tone(100, 78, 'sawtooth', 0.04, 0.04, 0.2)] }]
}

/** A gnome sneezes inside his house, and his hat pops out of the top of it. */
export function sneezeIndoors(): Answer {
  return [
    { at: 0, kick: { jerk: -3, puff: 0.5 }, notes: [tone(500, 700, 'sine', 0.04, 0.2, 0.05)] },
    { at: 0.32, kick: { jerk: 8, puff: 0, squash: 4, phase: 'hat', specks: { what: 'spore', count: 5, power: 0.6 } }, notes: [hiss(3000, 800, 0.7, 0.12, 0.006, 0.2), tone(600, 200, 'square', 0.05, 0.005, 0.14)] },
  ]
}

/** A door opens for a gnome and shuts behind him. */
export function doorOpens(kind: Kind): Answer {
  const f = kind === 'red' ? 300 : kind === 'bell' ? 900 : 220
  return [{ at: 0, kick: { squash: 1.2 }, notes: [tone(f, f * 1.4, 'sawtooth', 0.03, 0.04, 0.16)] }]
}
export function doorShuts(kind: Kind): Answer {
  const f = kind === 'red' ? 170 : kind === 'bell' ? 760 : 120
  return [{ at: 0, kick: { squash: -2.2, jerk: 3 }, notes: [tone(f, f * 0.7, kind === 'bell' ? 'sine' : 'triangle', 0.12, 0.003, 0.09)] }]
}

/** He is in a house to his taste: a pleased sound of his own, and his window shows him. */
export function content(who: GnomeId): Answer {
  const f = VOICE[who]
  const tune: Record<GnomeId, number[]> = { tall: [1, 1.5], baker: [1.5, 2, 2.5], sleepy: [1, 0.75], sneezy: [2, 2.5] }
  return tune[who].map((ratio, i) => ({ at: 0.14 * i, kick: { jerk: i % 2 ? -2 : 3 }, notes: [tone(f * ratio, undefined, 'sine', 0.06, 0.01, 0.16)] }))
}

/** The tall gnome's hat goes back on: the house has been held tall enough. */
export function hatFits(): Answer {
  return [{ at: 0, kick: { jerk: 5, squash: 2 }, notes: [tone(240, 400, 'sine', 0.1, 0.006, 0.12)] }]
}

/** The hat on the doorstep is tapped: it rocks with a boing. */
export function hatBoing(): Answer {
  return [{ at: 0, kick: { phase: 'rock' }, notes: [tone(280, 190, 'triangle', 0.09, 0.005, 0.2)] }]
}

/** A gnome whose house has gone, or whose door was taken, or in whose place another was sent, stands on the moss with his bundle and turns for the log. */
export function turnedOut(who: GnomeId): Answer {
  return [{ at: 0, kick: { hop: 6, face: 'wide', faceFor: 0.6, specks: { what: 'grit', count: 2, power: 0.4 } }, notes: [tone(VOICE[who] * 2, VOICE[who] * 1.6, 'sine', 0.05, 0.01, 0.12), tone(VOICE[who] * 0.6, Math.max(56, VOICE[who] * 0.4), 'sine', 0.06, 0.004, 0.08)] }]
}

/** The sleepy gnome snores at night. */
export function snore(): Answer {
  return [{ at: 0, kick: { nod: 1.5, specks: { what: 'bubble', count: 1, power: 0.3 } }, notes: [hiss(180, 130, 4, 0.07, 0.3, 0.3)] }, { at: 0.8, kick: { nod: -1.5 }, notes: [tone(700, 900, 'sine', 0.015, 0.1, 0.3)] }]
}

// ---------------------------------------------------------------- the sun, the snail, the rest of the place

/** A finger lands on the sun: it gives like a cushion. */
export function sunTouch(): Answer {
  return [{ at: 0, kick: { squash: -3 }, notes: [tone(392, 440, 'sine', 0.05, 0.005, 0.1)] }]
}

/** A finger lands on the cart: it rocks on its wheels with a wooden tok. */
export function cartTouch(): Answer {
  return [{ at: 0, kick: { hop: 1.6 }, notes: [tone(230, 200, 'triangle', 0.07, 0.003, 0.05)] }]
}

/** The sun, tapped, spins its rays once with a shimmer. */
export function shimmer(): Answer {
  return [880, 1100, 1320, 1650, 1980].map((f, i) => ({ at: 0.05 * i, kick: i === 0 ? { spin: 7, squash: -3 } : { spin: 0.4 }, notes: [tone(f, undefined, 'sine', 0.035, 0.004, 0.2)] }))
}

/** The sun, held, puffs out its cheeks and hums. `count` is which hum this is, from 0. */
export function hum(count: number): Answer {
  const f = 196 * (1 + 0.03 * Math.min(count, 6))
  return [{ at: 0, kick: { cheeks: 1, squash: 1 }, notes: [tone(f, undefined, 'sine', 0.07, 0.08, 0.4), tone(f * 1.5, undefined, 'sine', 0.03, 0.08, 0.4)] }]
}

/** The finger lifts and the sun lets its cheeks go. */
export function unpuff(): Answer {
  return [{ at: 0, kick: { cheeks: 0, squash: -2 }, notes: [hiss(1500, 600, 0.8, 0.06, 0.01, 0.2)] }]
}

/** The sun pulled by a finger, a notch at a time. */
export function sunStrain(notch: number, down: boolean): Answer {
  const f = down ? 520 - 40 * notch : 300 + 40 * notch
  return [{ at: 0, kick: { squash: down ? 1.5 : -1.5 }, notes: [tone(f, f * (down ? 0.94 : 1.06), 'sine', 0.04, 0.02, 0.1)] }]
}

/** The sun was let go before it was far enough: it springs back. */
export function sunBack(): Answer {
  return [{ at: 0, kick: { squash: -5, spin: 2 }, notes: [tone(360, 520, 'triangle', 0.08, 0.005, 0.18)] }]
}

/** The sun goes down behind the hill, or comes up over it. */
export function sunGoes(down: boolean): Answer {
  return [{ at: 0, kick: { squash: down ? 2 : -2, cheeks: 0 }, notes: [tone(down ? 660 : 330, down ? 220 : 660, 'sine', 0.07, 0.05, 0.7)] }]
}

/** The sky is painted over, with the long stroke of a wide brush. */
export function wash(down: boolean): Answer {
  return [{ at: 0, kick: { spin: 0.2 }, notes: [hiss(down ? 900 : 500, down ? 300 : 1100, 0.5, 0.06, 0.4, 0.9)] }]
}

/** A window lights at night, each kind with its own glow and note. */
export function lightUp(kind: Kind, size: number): Answer {
  if (kind === 'red') return [{ at: 0, kick: { glow: 1, squash: 1 }, notes: [hiss(2600, 1800, 2.5, 0.05, 0.004, 0.09), tone(392, undefined, 'triangle', 0.05, 0.01, 0.25)] }, { at: 0.1, kick: { squash: 0.5 }, notes: [hiss(3200, 2000, 3, 0.035, 0.004, 0.06)] }]
  if (kind === 'bell') return [{ at: 0, kick: { glow: 1, swing: 0.8 }, notes: [tone(880 * 0.97 ** size, undefined, 'sine', 0.07, 0.12, 0.6), tone(1320 * 0.97 ** size, undefined, 'sine', 0.03, 0.12, 0.5)] }]
  return [{ at: 0, kick: { glow: 1, puff: 0.25 }, notes: [hiss(700, 500, 0.7, 0.05, 0.15, 0.5)] }]
}

/** A window goes dark in the morning. */
export function lightOut(): Answer {
  return [{ at: 0, kick: { glow: 0, puff: 0 }, notes: [tone(500, 300, 'sine', 0.03, 0.01, 0.1)] }]
}

/** A chimney smokes. */
export function smoke(): Answer {
  return [{ at: 0, kick: { specks: { what: 'smoke', count: 3, power: 0.4 } }, notes: [hiss(600, 400, 1, 0.03, 0.05, 0.2)] }]
}

/** The snail's lamp comes on, or goes out. */
export function lamp(on: boolean): Answer {
  return [{ at: 0, kick: { squash: on ? 2 : -2, phase: on ? 'lamp' : 'dark' }, notes: [tone(on ? 1760 : 880, undefined, 'sine', 0.05, 0.003, 0.3)] }]
}

/** The snail, tapped, pulls in its eyes with a squelch and lets them out one after the other. */
export function tuck(): Answer {
  return [
    { at: 0, kick: { eyes: [1, 1], squash: -3 }, notes: [hiss(500, 250, 6, 0.09, 0.02, 0.12)] },
    { at: 0.6, kick: { eyes: [0, 1] }, notes: [tone(700, 1000, 'sine', 0.05, 0.004, 0.05)] },
    { at: 0.9, kick: { eyes: [0, 0] }, notes: [tone(900, 1300, 'sine', 0.05, 0.004, 0.05)] },
  ]
}

/** The snail flicks a pebble off its stone with its tail: the pebble is in the air. */
export function flick(): Answer {
  return [{ at: 0, kick: { squash: -3, phase: 'fly', eyes: [0.5, 0.2] }, notes: [tone(520, 980, 'sine', 0.07, 0.004, 0.09), hiss(1800, undefined, 2, 0.04, 0.003, 0.04)] }]
}

/** The snail sets off, or sets to pulling: a squelch. */
export function squelch(): Answer {
  return [{ at: 0, kick: { squash: 2.5, eyes: [0.4, 0.4] }, notes: [hiss(420, 300, 5, 0.07, 0.03, 0.14)] }]
}

/** The cart's wheels creak as it is pulled. */
export function creak(step: number): Answer {
  return [{ at: 0, kick: { hop: step % 2 ? 1.5 : -1.5 }, notes: [tone(step % 2 ? 330 : 290, step % 2 ? 300 : 320, 'sawtooth', 0.03, 0.04, 0.12)] }]
}

/** The cart stops at its place with a clack, and the snail looks at the mushroom. */
export function cartStops(): Answer {
  return [{ at: 0, kick: { hop: 4 }, notes: [tone(250, 190, 'square', 0.08, 0.002, 0.05), hiss(1300, undefined, 2, 0.06, 0.002, 0.05)] }]
}

/** Leaves and sky: a rustle, and a few leaves come down. */
export function rustle(): Answer {
  return [{ at: 0, kick: { specks: { what: 'leaf', count: 3, power: 0.3 } }, notes: [hiss(3800, undefined, 0.6, 0.05, 0.02, 0.2), hiss(5200, undefined, 0.8, 0.03, 0.02, 0.14)] }]
}

/** The log is knocked on, and everyone on it is jogged. */
export function knock(): Answer {
  return [{ at: 0, kick: { hop: 2.5, specks: { what: 'grit', count: 2, power: 0.4 } }, notes: [tone(240, 200, 'sine', 0.14, 0.003, 0.07), hiss(900, undefined, 3, 0.04, 0.002, 0.03)] }]
}

/** Grass where no mushroom can stand: a pat. */
export function pat(): Answer {
  return [{ at: 0, kick: { specks: { what: 'leaf', count: 1, power: 0.2 } }, notes: [hiss(1200, undefined, 0.9, 0.05, 0.005, 0.08), tone(200, 160, 'sine', 0.04, 0.005, 0.08)] }]
}

/** Every note of an answer, each with the time of its beat as its delay: what a range test reads. */
export function notesOf(answer: Answer): Note[] {
  return answer.flatMap((beat) => (beat.notes ?? []).map((note) => ({ ...note, delay: beat.at })))
}

/** Every answer the glade can give, each at its two ends: what the range test and the sync test read. */
export function everyAnswer(): Answer[] {
  const kinds: Kind[] = ['red', 'bell', 'puff'], gnomes: GnomeId[] = ['tall', 'sleepy', 'sneezy', 'baker']
  const all: Answer[] = [
    full(), tremble(), peek(), slipBack(), doorOff(), doorOnDoor(), backOnCart(), rattleCart(), doorOut(), gate(), raft(), bloop(0), bloop(1), croak(0), croak(20), plop(0), plop(1),
    toffee(1), toffee(8), splat(), stone(), clack(0, 0), clack(1140, 700), noMore(), seesawDown(), seesawUp(), beads(1), beads(8), dropBack(), rollAway(), pathLoose(), pathSits(), shuffle(), stepUnderDoor(), hiccup(), softThump(), give(1), give(12),
    sneezeBack(), startle(), toeTaps(), scratch(), wade(), splashDown(), tighten(), brushPuff(), bonk(), bump(), crawl(), stoop(), emptyBucket(), fillBucket(), slop(), lookAtWater(), yawn(), groan(), sneezeIndoors(), hatFits(), hatBoing(), snore(),
    shimmer(), hum(0), hum(9), unpuff(), sunStrain(1, true), sunStrain(8, true), sunStrain(1, false), sunStrain(8, false), sunBack(), sunGoes(true), sunGoes(false), wash(true), wash(false), lightOut(), smoke(), lamp(true), lamp(false),
    tuck(), squelch(), flick(), creak(0), creak(1), cartStops(), rustle(), knock(), pat(), sunTouch(), cartTouch(),
  ]
  for (const kind of kinds) {
    for (const size of [1, FULL]) all.push(swell(kind, size), stretch(kind, size), loosen(kind, size), letGo(kind, size), poke(kind, size), comeOut(kind, size), doorIn(kind, size), lightUp(kind, size))
    all.push(strain(kind, 1), knockEmpty(kind), doorOpens(kind), doorShuts(kind))
    // A puffball's notches after the first are silent: its one long parp is the first.
    if (kind !== 'puff') all.push(strain(kind, 8))
  }
  all.push(snapBack(1), snapBack(FULL), ting(1, 0), ting(FULL, 1), setSwinging(1), setSwinging(FULL))
  for (const who of gnomes) all.push(squashHat(who), grumble(who, 1), grumble(who, 20), hatBack(who), pokeGnome(who), hatStrain(who, 1), hatStrain(who, 6), hatPop(who), knockOnDoor(who), shiftWeight(who), setOff(who), land(who), mossStep(who), hup(who), sitDown(who), getUp(who), passDoor(who), content(who), turnedOut(who))
  return all
}

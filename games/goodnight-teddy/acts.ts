import type { Sound } from './voices'

// The one timeline of every answer that takes time. An act belongs to one of the room's five (Teddy, the duck,
// the cat, the lamp, the bath), has a length in seconds, and names the sounds it makes and when. The game runs
// the act's clock and plays each sound as the clock passes it; the view draws from the same clock. So a sound
// can never be heard while its maker is not drawn making it: both come from `act.t`.

export type Cue = { at: number; sound: Sound }
export type ActDef = { length: number; cues: readonly Cue[] }

const act = (length: number, ...cues: Cue[]): ActDef => ({ length, cues })
const cue = (at: number, sound: Sound): Cue => ({ at, sound })

export const ACTS = {
  // --- Teddy -------------------------------------------------------------------------------------------------
  /** The pyjamas go on: arms up, head stuck for a beat, then out, then his ears, one after the other. */
  dress: act(1.8, cue(0, { id: 'flump' }), cue(0.35, { id: 'grunt' }), cue(1.1, { id: 'pop', v: 0 }), cue(1.4, { id: 'pop', v: 2 })),
  /** The blanket wraps him to the chin and he sinks into it. */
  wrap: act(1.2, cue(0, { id: 'whump' }), cue(0.45, { id: 'sigh' })),
  /** The blanket on wet fur: a wet patch spreads, drops fall from the hem, he shivers. */
  wrapWet: act(1.4, cue(0, { id: 'whump' }), cue(0.5, { id: 'drip', v: 0 }), cue(0.75, { id: 'chatter' })),
  /** Three yawns, each wider than the last. */
  yawn1: act(1.5, cue(0, { id: 'yawn', size: 1 })),
  yawn2: act(1.8, cue(0, { id: 'yawn', size: 2 })),
  yawn3: act(2.1, cue(0, { id: 'yawn', size: 3 })),
  /** A yawn nobody asked for, while he sits clean and dry. It is quiet. */
  yawnIdle: act(1.5),
  /** With the blanket over the lamp he makes ear shadows on the wall with his paws. */
  shadow: act(3.4),
  /** Touched while he sleeps: he sighs, sinks deeper and sleeps on. */
  stir: act(1.3, cue(0, { id: 'sigh' })),

  // --- The duck ----------------------------------------------------------------------------------------------
  /** Soap: a wig of foam piles up and slides over its eyes, and it blows a bubble out of its beak. */
  wig: act(1.2, cue(0, { id: 'duckRub', v: 0 }), cue(0.35, { id: 'blurp' })),
  /** After the water: a jet squirts back up out of its beak. */
  squirt: act(0.9, cue(0, { id: 'squirt' })),
  /** The towel has polished it enough: it shoots out like a bar of soap and lands back in the bath. */
  shoot: act(1.1, cue(0.9, { id: 'plop' })),
  /** Under the pyjamas: a tent that paddles round the bath with a beak out of the neck. */
  tent: act(3.2, cue(0, { id: 'flump' }), cue(0.4, { id: 'muffSqueak' }), cue(1, { id: 'paddle', v: 0 }), cue(1.5, { id: 'paddle', v: 1 }), cue(2, { id: 'paddle', v: 2 }), cue(2.5, { id: 'paddle', v: 0 })),
  /** Tucked in on the rim with its beak out. */
  tuck: act(1, cue(0, { id: 'whump' }), cue(0.5, { id: 'tinySqueak' })),
  /** Asleep under the blanket with the lamp down: one squeaky snore. */
  snore: act(1.1, cue(0.05, { id: 'snore' })),
  /** The pyjamas puff up into a raft and it climbs aboard. */
  raft: act(2.4, cue(0, { id: 'bloop' }), cue(0.8, { id: 'lap', v: 0 }), cue(1.4, { id: 'lap', v: 1 }), cue(2, { id: 'lap', v: 2 })),
  /** The blanket swells into a dome under it, then sinks with one great bubble. */
  dome: act(2.6, cue(0, { id: 'boom' }), cue(1.5, { id: 'blub' })),

  // --- The cat -----------------------------------------------------------------------------------------------
  /** Soap: it freezes, licks the foam, pulls a sour face with its tongue out and shakes one paw. */
  lick: act(2.3, cue(0, { id: 'fizz' }), cue(0.5, { id: 'chirrup' }), cue(1.2, { id: 'spit' })),
  /** Water: thin, spiky and dripping, it turns its back and looks over its shoulder. */
  drench: act(1.6, cue(0, { id: 'splat' }), cue(0.3, { id: 'hiss' }), cue(0.7, { id: 'yowl' })),
  /** The towel on a wet cat: it comes up as a ball of fluff. */
  ball: act(1.4, cue(0, { id: 'rattle' })),
  /** The towel on a dry cat: it rolls over and pedals its hind legs. */
  roll: act(1.8, cue(0, { id: 'crackleFur', v: 0 }), cue(0.3, { id: 'rattle' })),
  /** Under the blanket: a lump walks about, bumps the bed's post, sits down, and two eyes shine in a fold. */
  lump: act(3.4, cue(0, { id: 'whump' }), cue(0.5, { id: 'muffMew' }), cue(1.9, { id: 'bump' })),

  // --- The lamp ----------------------------------------------------------------------------------------------
  /** Soap on the shade: small bubbles, and the light comes through them. */
  lather: act(0.7, cue(0, { id: 'glassSqueak', v: 0 }), cue(0.3, { id: 'tinkle' })),
  /** Water on the warm shade: steam climbs the wall and the light flutters. */
  steam: act(1.8, cue(0, { id: 'sizzle' }), cue(0.2, { id: 'waver' })),
  /** The towel has let go: the shade flares brighter for a moment with a ring of light. */
  flare: act(0.8, cue(0, { id: 'ting' })),
  /** It wears the pyjamas and throws their stripes across the wall. */
  wear: act(1.4, cue(0, { id: 'flump' }), cue(0.4, { id: 'glassHum' })),
  /** Under the blanket it is a glowing tent. */
  glowTent: act(1.6, cue(0, { id: 'whump' }), cue(0.5, { id: 'warmHum' })),

  // --- The bath ----------------------------------------------------------------------------------------------
  /** Soap: the suds rise a step. */
  suds: act(0.9, cue(0, { id: 'glop' }), cue(0.3, { id: 'crackle' })),
  /** The pour is over: the water rocks, the duck rides the wave, the suds go down a step. */
  slosh: act(1.2, cue(0, { id: 'slosh' })),
  /** The towel goes in and comes out soaked. */
  soak: act(0.6, cue(0, { id: 'slurp' })),
  /** A bare hand: drops fly and rings spread. */
  splash: act(0.8, cue(0, { id: 'splosh' }), cue(0.25, { id: 'plink', v: 0 }), cue(0.45, { id: 'plink', v: 3 })),
} satisfies Record<string, ActDef>

export type ActId = keyof typeof ACTS
export const ACT_IDS = Object.keys(ACTS) as ActId[]
export type Act = { id: ActId; t: number }

/** How far an act is between two of its moments, from 0 to 1; 0 when it is not this act. */
export function span(act: Act | null, id: ActId, from: number, to: number): number {
  if (!act || act.id !== id) return 0
  return Math.min(1, Math.max(0, (act.t - from) / (to - from)))
}

/** Whether an act is this one and between two of its moments. */
export function during(act: Act | null, id: ActId, from = 0, to = Infinity): boolean {
  return act !== null && act.id === id && act.t >= from && act.t < to
}

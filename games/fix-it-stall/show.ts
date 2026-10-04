import { type Beat } from './scene'

// The short scenes, as lists of timed beats over game time (scene.ts). A beat
// only moves numbers in a `Show`; the view draws from those numbers and from
// the stall. Every scene's outcome is in the stall, and saved, before its
// first beat: a put-away in the middle loses nothing, and on load the show is
// set straight to where the scene would have ended (`settled`).

export type Show = {
  /** 0 the gadget lies on the mat; 1 it is in its owner's hands over the counter. */
  take: number
  /** 0 the lid stands open; 1 the owner has shut it as far as it will go. */
  lid: number
  /** 0 off; 1 the owner has thrown the switch and the gadget does what its circuit does. */
  on: number
  /** How far the owner is through the reaction, 0 to 1. */
  react: number
  /** The motion the owner plays, by name (tastes.ts), or null. */
  act: string | null
  /** How far the old hand is through showing a neat way, 0 to 1, or -1 when she shows none. */
  neat: number
  /** How far the change of customers has got, 0 to 1: one walks off, the next comes to the bench, a new one steps up. 1 at rest. */
  walk: number
}

/** The show when nothing is playing: a gadget on the mat or held out, nobody reacting, nobody walking. */
export function atRest(): Show {
  return { take: 0, lid: 0, on: 0, react: 0, act: null, neat: -1, walk: 1 }
}

/** The show as a finished cycle leaves it: the owner stands with the gadget shut and running, and the old hand's board stands mended if she showed a way. */
export function settled(act: string, neat: boolean): Show {
  return { take: 1, lid: 1, on: 1, react: 1, act, neat: neat ? 1 : -1, walk: 1 }
}

const ease = (t: number) => t * t * (3 - 2 * t)
const ramp = (at: number, lasts: number, play: (t: number) => void): Beat => ({ at, lasts, play: (progress) => play(ease(progress)) })

/** How long each scene lasts, in seconds: inside the 4 to 10 the pack asks for, except the change of customers, which is the child's own act and is short. */
export const LENGTH = { handBack: 6.2, laidBack: 4.4, neatWay: 4.8, changeOver: 1.6 } as const

/**
 * The hand-back when the gadget runs. The owner takes it, shuts the lid as
 * far as it will go, throws the switch, and reacts to exactly what it does;
 * then settles, holding it as it runs. Ends in `settled`.
 */
export function handBackScene(show: Show, act: string, neatWayFollows = false): Beat[] {
  return [
    // With a neat way to come, her board stands as the job was, broken, until she mends it.
    { at: 0, lasts: 0, play: () => { show.act = act; show.neat = neatWayFollows ? 0 : -1 } },
    ramp(0, 0.8, (t) => { show.take = t }),
    ramp(0.8, 0.6, (t) => { show.lid = t }),
    ramp(1.6, 0.25, (t) => { show.on = t }),
    { at: 1.7, lasts: LENGTH.handBack - 1.7, play: (t) => { show.react = t } },
  ]
}

/**
 * The hand-back when the gadget does not run. The owner takes it, shuts the
 * lid, throws the switch twice, peers in, and lays it back on the mat with
 * the lid open. While the switch is down the gadget does what its circuit
 * does. Ends where it began, at rest: the cycle goes on.
 */
export function laidBackScene(show: Show, act: string): Beat[] {
  return [
    { at: 0, lasts: 0, play: () => { show.act = act; show.neat = -1 } },
    ramp(0, 0.8, (t) => { show.take = t }),
    ramp(0.8, 0.5, (t) => { show.lid = t }),
    { at: 1.3, lasts: 2, play: (t) => { show.react = t } },
    // The switch is thrown twice. Each time the gadget does whatever its circuit does, which is not what it was
    // brought in to do: nothing at all, a blade that sucks, a flag that pops.
    { at: 1.4, lasts: 0, play: () => { show.on = 1 } },
    { at: 2.0, lasts: 0, play: () => { show.on = 0 } },
    { at: 2.4, lasts: 0, play: () => { show.on = 1 } },
    { at: 3.0, lasts: 0, play: () => { show.on = 0 } },
    ramp(3.3, 0.4, (t) => { show.lid = 1 - t }),
    ramp(3.5, 0.9, (t) => { show.take = 1 - t }),
    { at: LENGTH.laidBack, lasts: 0, play: () => { show.take = 0; show.lid = 0; show.on = 0; show.react = 0; show.act = null } },
  ]
}

/** The old hand shows a neat way on her practice board: she reaches, makes the mend in one plain move, her board runs, and she goes back to her mug. */
export function neatWayScene(show: Show): Beat[] {
  return [{ at: 0, lasts: LENGTH.neatWay, play: (t) => { show.neat = t } }]
}

/** The change of customers after the child touches the one who waits. */
export function changeOverScene(show: Show): Beat[] {
  return [
    { at: 0, lasts: 0, play: () => { show.take = 0; show.lid = 0; show.on = 0; show.react = 0; show.act = null; show.neat = -1 } },
    ramp(0, LENGTH.changeOver, (t) => { show.walk = t }),
  ]
}

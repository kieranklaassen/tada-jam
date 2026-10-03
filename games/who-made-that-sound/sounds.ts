// Every sound that is not a voice, as plain numbers. Nobody can hear on the
// machine this was written on, so each is a short list of bands of noise with
// a pitch, a peak, an attack and a length, held inside ranges by
// sounds.test.ts. The lead and the owner listen.
//
// One rule keeps the listening game clean: a voice is the only thing with a
// pitch (voices.ts). Everything else, a crack, a burst, a thump, is noise, so
// nothing a child hears between two calls can be taken for a call.

/** One band of noise: where its middle is, how narrow, how loud, how fast in and how long out. */
export type Puff = {
  /** Seconds after the sound starts. */
  at: number
  /** The middle of the band, Hz. */
  pitch: number
  /** Where the band slides to, or the same as `pitch`. */
  glideTo: number
  /** How narrow the band is: under 1 a hiss, over 4 close to a knock. */
  q: number
  peak: number
  attack: number
  decay: number
}

export const RANGE = {
  pitch: [200, 4000],
  q: [0.5, 8],
  peak: [0.02, 0.24],
  attack: [0.002, 0.03],
  decay: [0.02, 0.35],
  /** The whole sound, start to silence. */
  seconds: [0.03, 0.6],
} as const

const puff = (at: number, pitch: number, q: number, peak: number, attack: number, decay: number, glideTo = pitch): Puff => ({ at, pitch, glideTo, q, peak, attack, decay })

/** How many ways each sound comes, so that the same thing never sounds quite the same twice running. */
export const WAYS = 3

/** The finger lands on an egg: a soft knock on the shell, lower for a heavier one inside. `weight` runs 0 to 1. */
export function knock(weight: number): Puff[] {
  return [puff(0, 520 - 220 * weight, 2.2, 0.1, 0.003, 0.06)]
}

/** The shell cracks: two or three dry ticks. */
export function crack(way: number): Puff[] {
  const up = [0, 280, -240][way % WAYS]
  return [puff(0, 2400 + up, 5, 0.12, 0.002, 0.035), puff(0.045, 3100 + up, 6, 0.09, 0.002, 0.03), ...(way % WAYS === 2 ? [puff(0.08, 2700, 6, 0.06, 0.002, 0.03)] : [])]
}

/** The egg bursts: a wide rush upwards, and the pieces of shell ticking down after it. */
export function burst(way: number): Puff[] {
  const up = [0, 160, -140][way % WAYS]
  return [
    puff(0, 800 + up, 0.8, 0.2, 0.004, 0.15, 2600 + up * 2),
    puff(0.16, 3000, 5, 0.045, 0.002, 0.03),
    puff(0.25 + way * 0.02, 2500, 5, 0.04, 0.002, 0.03),
    puff(0.36, 3300 - way * 150, 5, 0.03, 0.002, 0.03),
  ]
}

/** Feet come down: on the ground, on the hill. Lower and a little louder for a heavier body. */
export function thump(weight: number): Puff[] {
  return [puff(0, 460 - 230 * weight, 1.2, 0.07 + 0.05 * weight, 0.004, 0.07 + 0.05 * weight)]
}

/** An egg tumbles out of the nest into the row: a hollow plop. `which` is its number in the row. */
export function plop(which: number): Puff[] {
  return [puff(0, 620 - which * 70, 3.5, 0.13, 0.003, 0.08, 380 - which * 40)]
}

/** The finger lands where nothing is: a scrap of paper flicked. `across` runs 0 to 1 over the page, so it sounds a little different everywhere. */
export function flick(across: number): Puff[] {
  return [puff(0, 1500 + 900 * across, 2.5, 0.06, 0.002, 0.04)]
}

/** Someone goes off over the top of the hill: a long soft swish. */
export function swish(): Puff[] {
  return [puff(0, 1300, 1.2, 0.05, 0.03, 0.26, 600)]
}

/** A nest is set down at the edge: a rustle of twigs. */
export function rustle(): Puff[] {
  return [puff(0, 900, 0.8, 0.045, 0.02, 0.14), puff(0.12, 1200, 0.9, 0.04, 0.02, 0.16)]
}

/** Seconds from the start of a sound to its silence. */
export function secondsOf(puffs: readonly Puff[]): number {
  return puffs.reduce((end, one) => Math.max(end, one.at + one.attack + one.decay), 0)
}

// What moves when nobody touches anything. Each one in the room moves like itself: its own tempo, its own body
// part, no curve shared with another. Pure numbers from the toy's seconds; the view maps them onto sprites.

/** Seconds for one cycle of each one's main movement. No two are the same, and none is a multiple of another. */
export const TEMPO = { teddy: 3.4, duck: 2.3, cat: 5.3, lamp: 0.86, curtain: 7.9, drip: 4.9 } as const

const TAU = Math.PI * 2

/** Teddy breathes slowly from the belly and his head sways a little behind the breath. */
export function teddyIdle(t: number): { breath: number; sway: number } {
  return { breath: Math.sin((t / TEMPO.teddy) * TAU), sway: Math.sin((t / TEMPO.teddy) * TAU - 1.1) * 0.016 }
}

/** The duck bobs on the water, quick and light, and tips as it bobs. */
export function duckIdle(t: number): { bob: number; tip: number } {
  return { bob: Math.sin((t / TEMPO.duck) * TAU) * 3.5 + Math.sin((t / TEMPO.duck) * TAU * 0.41) * 1.5, tip: Math.sin((t / TEMPO.duck) * TAU + 0.9) * 0.05 }
}

/** The cat keeps still and lets only its tail speak: a slow curl, then a quick flick at the end of each cycle. Its eyes close slowly once a cycle. */
export function catIdle(t: number): { tail: number; blink: number } {
  const phase = (t / TEMPO.cat) % 1
  const flick = phase > 0.86 ? Math.sin(((phase - 0.86) / 0.14) * Math.PI * 3) * 0.3 : 0
  const blink = phase > 0.4 && phase < 0.52 ? Math.sin(((phase - 0.4) / 0.12) * Math.PI) : 0
  return { tail: Math.sin(phase * TAU) * 0.14 + flick, blink }
}

/** The lamp's halo wavers like a warm bulb, a little and fast. */
export function lampIdle(t: number): number {
  return 1 + Math.sin((t / TEMPO.lamp) * TAU) * 0.012 + Math.sin((t / TEMPO.lamp) * TAU * 0.37) * 0.02
}

/** The curtain drifts in a draught. */
export function curtainIdle(t: number): number {
  return Math.sin((t / TEMPO.curtain) * TAU) * 0.018
}

/** The tap drips: 0 to 1 while a drop falls, and null between drops. */
export function dripIdle(t: number): number | null {
  const phase = (t % TEMPO.drip) / 0.55
  return phase < 1 ? phase : null
}

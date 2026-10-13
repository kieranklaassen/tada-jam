import type { Note } from './audio'

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

// Every sound of the game as plain numbers, written from the design sheet's
// words. Nobody has listened to them yet: a test holds every pitch, peak and
// length in range, and the first person to hear the game tunes them.

/** The pitch of sand by how deep it lies, in hertz: the middle of its hiss, from the top of the hill down. One step of one scale for each band's depth, each lower than the one above, so a rub down the bands is a falling run and a level rub holds one note. */
export const SAND_PITCH = [2093, 1760, 1568, 1319, 1175, 1047, 880, 784, 659, 587, 523, 440, 392] as const
const pitchAt = (depth: number): number => SAND_PITCH[clamp(Math.floor(depth), 0, SAND_PITCH.length - 1)]

/** Sand crumbling under the finger: a gritty hiss at the pitch of its depth, brighter and louder the faster the rub. `depth` is a step of the scale and `speed` is 0 to 1. */
export function hiss(depth: number, speed: number): Note[] {
  // A fast rub is brighter by less than one step of the scale, so a rub downward falls at any speed.
  const pitch = pitchAt(depth) * (1 + 0.08 * clamp(speed, 0, 1))
  const peak = 0.07 + 0.09 * clamp(speed, 0, 1)
  return [
    { kind: 'noise', frequency: pitch, q: 7, peak, attack: 0.006, decay: 0.09 },
    { kind: 'noise', frequency: pitch * 2.6, q: 1.2, peak: peak * 0.35, attack: 0.004, decay: 0.05 },
  ]
}

/** The first bite of a touch: the hiss with a small knock under it, so the landing is felt. */
export function bite(depth: number): Note[] {
  return [...hiss(depth, 0.6), { kind: 'tone', frequency: 170, glideTo: 95, wave: 'sine', peak: 0.16, attack: 0.003, decay: 0.09 }]
}

/** Wet sand coming away as mud: fat blobs that plop one after another. `blobs` is 1 to 3. */
export function mud(blobs: number): Note[] {
  const notes: Note[] = []
  for (let i = 0; i < clamp(blobs, 1, 3); i++) {
    notes.push({ kind: 'tone', frequency: 210 - i * 28, glideTo: 88 - i * 6, wave: 'sine', peak: 0.2, attack: 0.008, decay: 0.13, delay: i * 0.085 })
    notes.push({ kind: 'noise', frequency: 420, q: 2, peak: 0.05, attack: 0.004, decay: 0.05, delay: i * 0.085 })
  }
  return notes
}

/** A pinch of grains hopping and pattering down: a few thin ticks, each lower and softer. */
export function patter(depth: number): Note[] {
  const pitch = pitchAt(depth)
  return [0, 1, 2, 3].map((i) => ({ kind: 'noise' as const, frequency: pitch * (1.5 - i * 0.14), q: 9, peak: 0.1 - i * 0.02, attack: 0.002, decay: 0.035, delay: 0.05 + i * 0.045 }))
}

/** Loose sand pouring down: a soft hush. `amount` is 0 to 1. */
export function hush(amount: number): Note[] {
  return [{ kind: 'noise', frequency: 2400, q: 0.7, peak: 0.02 + 0.05 * clamp(amount, 0, 1), attack: 0.02, decay: 0.16 }]
}

/** The steps of the scale the water's plinks are picked from. */
const PLINK = [1319, 1568, 1760, 2093, 2349, 2637] as const

/** Running water: small bright plinks, more of them the more water moves. `count` is 1 to 4 and `pick` any whole number. */
export function plinks(count: number, pick: number): Note[] {
  const notes: Note[] = []
  for (let i = 0; i < clamp(count, 1, 4); i++) {
    const pitch = PLINK[(pick + i * 5 + ((pick >> 3) % 3) * i) % PLINK.length]
    notes.push({ kind: 'tone', frequency: pitch, glideTo: pitch * 1.25, wave: 'sine', peak: 0.055, attack: 0.004, decay: 0.07, delay: i * 0.031 })
  }
  return notes
}

/** Sand drinking the first of the water: a soft fizz. */
export const fizz: Note[] = [{ kind: 'noise', frequency: 5200, q: 1.5, peak: 0.045, attack: 0.01, decay: 0.2, glideTo: 3600 }]

/** Water landing in the bath: a splash and the tin's ring under it. */
export const splash: Note[] = [
  { kind: 'noise', frequency: 1500, q: 0.8, peak: 0.16, attack: 0.005, decay: 0.22, glideTo: 600 },
  { kind: 'tone', frequency: 640, wave: 'triangle', peak: 0.07, attack: 0.004, decay: 0.3 },
]

/** The bath's tin under the finger: it rings. */
export const tin: Note[] = [
  { kind: 'tone', frequency: 880, wave: 'triangle', peak: 0.16, attack: 0.002, decay: 0.34 },
  { kind: 'tone', frequency: 1326, wave: 'sine', peak: 0.07, attack: 0.002, decay: 0.2 },
]

/** A fingertip on the pane where there is nothing to dig: the glass ticks. */
export const glass: Note[] = [{ kind: 'tone', frequency: 2350, wave: 'sine', peak: 0.07, attack: 0.001, decay: 0.05 }, { kind: 'tone', frequency: 310, wave: 'sine', peak: 0.05, attack: 0.002, decay: 0.04 }]

/** A fingertip on the oak frame: a dry knock. */
export const wood: Note[] = [{ kind: 'tone', frequency: 420, glideTo: 300, wave: 'triangle', peak: 0.13, attack: 0.002, decay: 0.07 }, { kind: 'noise', frequency: 1300, q: 2, peak: 0.05, attack: 0.002, decay: 0.03 }]

/** A fingertip in water: a plip that rises. */
export const plip: Note[] = [{ kind: 'tone', frequency: 520, glideTo: 1350, wave: 'sine', peak: 0.14, attack: 0.004, decay: 0.09 }]

/** The duck squeaks: flat and dusty in a dry bath, bright and wet when afloat. */
export function squeak(afloat: boolean): Note[] {
  if (afloat) return [{ kind: 'tone', frequency: 1250, glideTo: 2100, wave: 'square', peak: 0.1, attack: 0.012, decay: 0.12 }, { kind: 'tone', frequency: 2000, glideTo: 1500, wave: 'square', peak: 0.08, attack: 0.01, decay: 0.13, delay: 0.13 }]
  return [{ kind: 'tone', frequency: 900, glideTo: 620, wave: 'square', peak: 0.07, attack: 0.02, decay: 0.16 }, { kind: 'noise', frequency: 3000, q: 1, peak: 0.03, attack: 0.01, decay: 0.12 }]
}

/** The duck comes off the floor of the bath: a slosh and two squeaks. */
export const afloat: Note[] = [{ kind: 'noise', frequency: 700, q: 0.9, peak: 0.13, attack: 0.03, decay: 0.3, glideTo: 1300 }, ...squeak(true).map((note) => ({ ...note, delay: (note.delay ?? 0) + 0.22 }))]

/** The mole behind his book: a low harrumph. */
export const harrumph: Note[] = [
  { kind: 'tone', frequency: 132, glideTo: 96, wave: 'sawtooth', peak: 0.12, attack: 0.03, decay: 0.16 },
  { kind: 'tone', frequency: 118, glideTo: 82, wave: 'sawtooth', peak: 0.13, attack: 0.03, decay: 0.24, delay: 0.2 },
]

/** The worm shooting into a boot: a pop, and a smaller one as it looks out of another. */
export const pop: Note[] = [
  { kind: 'tone', frequency: 380, glideTo: 1100, wave: 'sine', peak: 0.2, attack: 0.003, decay: 0.06 },
  { kind: 'tone', frequency: 620, glideTo: 1500, wave: 'sine', peak: 0.12, attack: 0.003, decay: 0.05, delay: 0.3 },
]

/** The badger snaps a peg and flaps a shirt straight. */
export const flap: Note[] = [
  { kind: 'tone', frequency: 1900, wave: 'square', peak: 0.07, attack: 0.001, decay: 0.03 },
  { kind: 'noise', frequency: 520, q: 0.8, peak: 0.16, attack: 0.012, decay: 0.12, delay: 0.1 },
  { kind: 'noise', frequency: 760, q: 0.8, peak: 0.1, attack: 0.01, decay: 0.1, delay: 0.24 },
]

// --- The other five grounds, cell by cell of the design sheet's grid --------

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const noise = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

/** Clay peeled dry: a low creak. */
export const creak: Note[] = [tone(150, 0.12, 0.03, 0.2, { wave: 'sawtooth', glideTo: 118 }), noise(900, 3, 0.04, 0.02, 0.12)]
/** A finger skidding on wet clay: a rubbery squeak. */
export const rubber: Note[] = [tone(620, 0.1, 0.02, 0.16, { wave: 'triangle', glideTo: 980 }), tone(990, 0.05, 0.02, 0.1, { glideTo: 760, delay: 0.14 })]
/** A thumb pressed into clay: a dull thud. */
export const dull: Note[] = [tone(120, 0.2, 0.004, 0.14, { glideTo: 78 }), noise(300, 1, 0.06, 0.004, 0.06)]
/** A pool on clay taking more water: a glug. */
export const glug: Note[] = [tone(240, 0.13, 0.02, 0.09, { glideTo: 420 }), tone(210, 0.1, 0.02, 0.1, { glideTo: 380, delay: 0.13 })]
/** A clay shelf left hanging over a gap: one groan. */
export const groan: Note[] = [tone(96, 0.14, 0.08, 0.5, { wave: 'sawtooth', glideTo: 80 }), tone(143, 0.05, 0.1, 0.4, { wave: 'triangle', glideTo: 121 })]

/** Rock scraped: a clack. */
export const clack: Note[] = [noise(2100, 6, 0.16, 0.002, 0.04), tone(540, 0.1, 0.002, 0.05, { wave: 'square' })]
/** Wet rock rubbed: it squeaks like a washed plate. */
export const plate: Note[] = [tone(1500, 0.07, 0.03, 0.14, { glideTo: 2300 }), tone(2300, 0.05, 0.02, 0.12, { glideTo: 1700, delay: 0.15 })]
/** Rock knocked like a door, and two knocks back from inside the hill, lower and further off. */
export const knock: Note[] = [tone(330, 0.2, 0.002, 0.08, { wave: 'triangle', glideTo: 240 }), noise(900, 2, 0.06, 0.002, 0.04)]
export const knockBack: Note[] = [...knock, tone(190, 0.1, 0.004, 0.1, { wave: 'triangle', glideTo: 150, delay: 0.42 }), tone(190, 0.1, 0.004, 0.1, { wave: 'triangle', glideTo: 150, delay: 0.62 })]
/** Water round rock: it patters like rain on a roof. `pick` is any whole number. */
export function roof(pick: number): Note[] {
  return [0, 1, 2].map((i) => noise(2600 + ((pick * 7 + i * 13) % 5) * 260, 8, 0.05, 0.002, 0.03, { delay: i * 0.045 + ((pick + i) % 3) * 0.01 }))
}
/** A stone landing: a thud that the whole hill feels. `cells` is how big the stone is. */
export function thud(cells: number): Note[] {
  const weight = clamp(cells / 90, 0.3, 1)
  return [tone(110 - 30 * weight, 0.16 + 0.08 * weight, 0.004, 0.28, { glideTo: 70 }), noise(240, 0.8, 0.1 + 0.08 * weight, 0.004, 0.2)]
}

/** Moss torn off in tufts: a rip. */
export const rip: Note[] = [noise(1500, 1.4, 0.12, 0.01, 0.13, { glideTo: 3400 })]
/** Swollen moss squeezed: a squelch. */
export const squelch: Note[] = [noise(520, 2.4, 0.14, 0.02, 0.14, { glideTo: 240 }), tone(180, 0.1, 0.02, 0.12, { glideTo: 320, delay: 0.08 })]
/** Moss tapped: a soft boing. */
export const boing: Note[] = [tone(250, 0.13, 0.006, 0.26, { glideTo: 420 }), tone(500, 0.04, 0.006, 0.2, { glideTo: 840 })]
/** Moss drinking: a slurp. */
export const slurp: Note[] = [noise(700, 3, 0.1, 0.05, 0.12, { glideTo: 1900 }), tone(320, 0.06, 0.04, 0.1, { glideTo: 640 })]

/** A hot stone rubbed: a sizzle. */
export const sizzle: Note[] = [noise(4600, 1.2, 0.09, 0.01, 0.22), noise(2500, 3, 0.04, 0.01, 0.14, { delay: 0.05 })]
/** A steaming stone rubbed: it whistles like a kettle, higher the faster the rub. `speed` is 0 to 1. */
export function kettle(speed: number): Note[] {
  const pitch = 1500 + 1500 * clamp(speed, 0, 1)
  return [tone(pitch, 0.07, 0.04, 0.2, { glideTo: pitch * 1.08 }), noise(pitch * 1.5, 5, 0.04, 0.03, 0.18)]
}
/** A hot stone tapped: it tings like a stove lid. */
export const ting: Note[] = [tone(1180, 0.15, 0.002, 0.3, { wave: 'triangle' }), tone(2790, 0.05, 0.002, 0.16)]
/** Water turning to steam on the stone: a hiss. */
export const steam: Note[] = [noise(5200, 0.9, 0.1, 0.02, 0.3, { glideTo: 3000 })]
/** A hot stone landing: a clonk. */
export const clonk: Note[] = [tone(210, 0.2, 0.003, 0.16, { wave: 'triangle', glideTo: 150 }), tone(630, 0.06, 0.003, 0.2), noise(400, 1, 0.08, 0.003, 0.1)]
/** A pool boiling round a hot stone: blub-blub. `pick` is any whole number. */
export function blub(pick: number): Note[] {
  const pitch = 150 + (pick % 4) * 22
  return [tone(pitch, 0.11, 0.02, 0.09, { glideTo: pitch * 1.9 }), tone(pitch * 0.9, 0.1, 0.02, 0.09, { glideTo: pitch * 1.7, delay: 0.16 })]
}

/** Seed earth crumbling: a muffled puff. */
export const puff: Note[] = [noise(380, 0.9, 0.12, 0.02, 0.16)]
/** A seed popping out of its earth: a tock. */
export const tock: Note[] = [tone(820, 0.13, 0.002, 0.05, { wave: 'triangle', glideTo: 560 })]
/** A root plucked: it twangs like a bass string. */
export const twang: Note[] = [tone(98, 0.2, 0.004, 0.5, { wave: 'sawtooth' }), tone(196, 0.06, 0.004, 0.3, { wave: 'triangle' })]
/** A root snapped by a hard rub: a crack. */
export const crack: Note[] = [noise(3200, 2, 0.2, 0.001, 0.05), tone(260, 0.12, 0.002, 0.07, { wave: 'square', glideTo: 120 })]
/** A seed rattling in its husk like a maraca. */
export const maraca: Note[] = [0, 1, 2, 3].map((i) => noise(4200, 5, 0.08, 0.003, 0.03, { delay: i * 0.07 }))
/** A wet seed putting out its root: a creak that rises. */
export const sprout: Note[] = [tone(260, 0.09, 0.04, 0.3, { wave: 'sawtooth', glideTo: 520 })]
/** Seeds dropping and bouncing like beads: tick, tick, tick. `count` is 1 to 3. */
export function ticks(count: number): Note[] {
  return Array.from({ length: clamp(count, 1, 3) }, (_, i) => tone(1500 - i * 140, 0.09, 0.002, 0.03, { wave: 'triangle', delay: i * 0.09 }))
}
/** Seed earth falling away: a soft tumble. */
export const tumble: Note[] = [noise(300, 0.8, 0.09, 0.03, 0.24, { glideTo: 180 })]

/** Moss that hangs over a gap letting a drop go: plip. */
export const drip: Note[] = [tone(1400, 0.08, 0.003, 0.07, { glideTo: 900 })]

/** Rain from a cloud: a few soft drops. `pick` is any whole number. */
export function rain(pick: number): Note[] {
  return [0, 1].map((i) => tone(880 + ((pick + i * 3) % 5) * 110, 0.045, 0.004, 0.06, { delay: i * 0.07 }))
}

// --- The bath's plug ---------------------------------------------------------

/** The chain pulled taut, and the plug dropping back on it. */
export const chain: Note[] = [0, 1, 2].map((i) => tone(2100 + i * 240, 0.06, 0.002, 0.04, { wave: 'square', delay: i * 0.04 }))
export const plugDrop: Note[] = [tone(300, 0.14, 0.003, 0.08, { glideTo: 200 }), tone(1400, 0.05, 0.002, 0.1, { wave: 'triangle' })]
/** Water leaving by the plughole for as long as the plug is held up: a gurgle. `pick` is any whole number. */
export function gurgling(pick: number): Note[] {
  const pitch = 170 + (pick % 5) * 18
  return [tone(pitch, 0.1, 0.03, 0.12, { glideTo: pitch * 1.6 }), noise(500, 2, 0.05, 0.03, 0.12)]
}

// --- The scenes and the residents' short answers, by the names timeline.ts gives them

const glugAt = (step: number): Note[] => [tone(180 + step * 46, 0.14, 0.02, 0.1, { glideTo: 330 + step * 70 }), tone(150 + step * 40, 0.08, 0.02, 0.08, { glideTo: 260 + step * 60, delay: 0.14 })]

/** Every voice a cue of the timeline can name. */
export const NAMED: Record<string, Note[]> = {
  // The mole afloat and set down.
  bloop: [tone(300, 0.1, 0.02, 0.08, { glideTo: 620 }), tone(360, 0.08, 0.02, 0.08, { glideTo: 700, delay: 0.3 })],
  chairCreak: [tone(170, 0.11, 0.06, 0.4, { wave: 'sawtooth', glideTo: 230 })],
  bob: [tone(520, 0.07, 0.03, 0.14, { glideTo: 680 }), tone(480, 0.06, 0.03, 0.14, { glideTo: 640, delay: 0.4 })],
  page: [noise(2800, 1.5, 0.07, 0.03, 0.12, { glideTo: 4200 })],
  bump: [tone(120, 0.2, 0.004, 0.16, { glideTo: 80 }), noise(260, 1, 0.1, 0.004, 0.1)],
  wring: [noise(900, 3, 0.07, 0.05, 0.2, { glideTo: 1500 }), tone(1200, 0.05, 0.003, 0.05, { delay: 0.3 }), tone(1050, 0.05, 0.003, 0.05, { delay: 0.44 }), tone(1320, 0.05, 0.003, 0.05, { delay: 0.6 })],
  // The worm's boots.
  glug0: glugAt(0), glug1: glugAt(1), glug2: glugAt(2), glug3: glugAt(3), glug4: glugAt(4), glug5: glugAt(5),
  pullOn: [noise(600, 2, 0.1, 0.05, 0.14, { glideTo: 1300 }), tone(240, 0.12, 0.006, 0.08, { glideTo: 420, delay: 0.2 })],
  squelch,
  // The badger's washing.
  sag: [tone(700, 0.06, 0.004, 0.07, { glideTo: 480 }), noise(1200, 2, 0.04, 0.01, 0.08, { delay: 0.05 })],
  wringOut: [noise(900, 3, 0.07, 0.04, 0.16, { glideTo: 1500 }), tone(1200, 0.05, 0.003, 0.05, { delay: 0.18 }), tone(1050, 0.05, 0.003, 0.05, { delay: 0.29 })],
  fwop: [noise(500, 0.9, 0.16, 0.02, 0.12, { glideTo: 1100 }), tone(180, 0.1, 0.004, 0.08, { delay: 0.1 })],
  // The first showings.
  pour: [tone(900, 0.06, 0.02, 0.1, { glideTo: 500 }), tone(760, 0.06, 0.02, 0.1, { glideTo: 420, delay: 0.14 }), tone(640, 0.06, 0.02, 0.12, { glideTo: 360, delay: 0.28 })],
  knock,
  flap,
  // The ending and the plug.
  slosh: [noise(700, 0.9, 0.13, 0.03, 0.3, { glideTo: 1300 })],
  squeakWet: squeak(true),
  squeakDry: squeak(false),
  swirl: [noise(900, 1.2, 0.08, 0.2, 0.5, { glideTo: 1800 })],
  squirt: [noise(3200, 2, 0.09, 0.02, 0.4, { glideTo: 2200 }), tone(1700, 0.04, 0.02, 0.3, { glideTo: 1200 })],
  gurgle: [tone(160, 0.12, 0.05, 0.2, { glideTo: 300 }), tone(150, 0.11, 0.05, 0.2, { glideTo: 280, delay: 0.3 }), tone(140, 0.1, 0.05, 0.2, { glideTo: 250, delay: 0.6 }), noise(420, 2, 0.06, 0.1, 0.6)],
  rumble: [noise(120, 0.8, 0.16, 0.2, 0.6), tone(82, 0.12, 0.2, 0.6, { wave: 'triangle' })],
  // The residents' short answers.
  harrumph,
  pop,
  sneeze: [noise(2400, 1, 0.05, 0.12, 0.05, { glideTo: 3600 }), noise(1500, 0.8, 0.16, 0.006, 0.14, { delay: 0.2 }), tone(1300, 0.08, 0.006, 0.08, { wave: 'square', glideTo: 800, delay: 0.2 })],
  sigh: [noise(900, 0.8, 0.08, 0.2, 0.6, { glideTo: 500 }), tone(700, 0.05, 0.15, 0.5, { glideTo: 420 })],
  flump: [noise(700, 1, 0.1, 0.006, 0.1), tone(200, 0.1, 0.006, 0.1, { delay: 0.22 })],
  wipe: [tone(1700, 0.05, 0.03, 0.1, { glideTo: 2200, delay: 0.42 }), tone(1700, 0.05, 0.03, 0.1, { glideTo: 2200, delay: 0.66 })],
  shrink: [tone(900, 0.09, 0.02, 0.4, { glideTo: 2400 })],
  tipOut: [noise(2600, 0.9, 0.07, 0.05, 0.4)],
  press: [noise(4800, 1, 0.07, 0.05, 0.5, { glideTo: 3000 })],
}

/** Every voice with fixed notes, by name, for the range test. */
export const FIXED: Record<string, Note[]> = {
  fizz, splash, tin, glass, wood, plip, afloat, creak, rubber, dull, glug, groan, clack, plate, knock, knockBack, rip, squelch, boing, slurp, sizzle, ting, steam, clonk,
  puff, tock, twang, crack, maraca, sprout, tumble, drip, chain, plugDrop, ...NAMED,
}

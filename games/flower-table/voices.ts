import type { Note } from './audio'
import type { VisitorId } from './cast'
import type { VaseId } from './layout'
import type { Kind } from './plants'

// Every sound of the toy as plain numbers. Nothing here touches Web Audio, so
// a test holds each voice inside a stated range on a machine that cannot hear
// (voices.test.ts). The Mount turns the notes of one touch into one voice with
// `voiceOf` (audio.ts).

export type Sound = readonly Note[]

/** What every voice is held to. */
export const LIMITS = { minFrequency: 60, maxFrequency: 6500, maxPeak: 0.2, minAttack: 0.002, maxSeconds: 1.2 } as const

/** How long a sound lasts, in seconds. */
export function seconds(sound: Sound): number {
  return sound.reduce((end, note) => Math.max(end, (note.delay ?? 0) + note.attack + note.decay), 0)
}

/** The same sound, starting later. */
export function later(sound: Sound, delay: number): Note[] {
  return sound.map((note) => ({ ...note, delay: (note.delay ?? 0) + delay }))
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

/** The blades spring open as the finger lands: a bright double tick of steel. */
export const bladesOpen: Sound = [
  { kind: 'noise', frequency: 5200, q: 6, peak: 0.07, attack: 0.002, decay: 0.03 },
  { kind: 'tone', frequency: 2900, wave: 'triangle', peak: 0.05, attack: 0.002, decay: 0.04, delay: 0.035 },
]

/** The blades shut on nothing: a snick. */
export const snick: Sound = [
  { kind: 'noise', frequency: 4200, q: 5, peak: 0.08, attack: 0.002, decay: 0.035 },
  { kind: 'tone', frequency: 2300, wave: 'triangle', peak: 0.06, attack: 0.002, decay: 0.05, glideTo: 1700 },
]

/**
 * The snip of each plant, pitched by where the cut is: `low` is 0 for a cut at the very top of the stem and 1
 * for one at the earth, and the lower the cut the higher the snip.
 */
export function snip(kind: Kind, low: number): Sound {
  const up = 1 + clamp(low, 0, 1) * 0.5
  const blade: Note = { kind: 'noise', frequency: 3800 * up, q: 5, peak: 0.09, attack: 0.002, decay: 0.03 }
  switch (kind) {
    // A thick fibrous crunch.
    case 'sunflower':
      return [blade, { kind: 'noise', frequency: 520 * up, q: 1.2, peak: 0.16, attack: 0.004, decay: 0.13, glideTo: 240 * up }, { kind: 'tone', frequency: 150 * up, wave: 'triangle', peak: 0.12, attack: 0.004, decay: 0.1, glideTo: 95 * up }]
    // A soft furred tear with one high drip.
    case 'poppy':
      return [{ ...blade, peak: 0.05 }, { kind: 'noise', frequency: 1700 * up, q: 0.8, peak: 0.08, attack: 0.012, decay: 0.09 }, { kind: 'tone', frequency: 1250 * up, peak: 0.09, attack: 0.003, decay: 0.07, glideTo: 1900 * up, delay: 0.11 }]
    // A wet squeak, like a finger on glass.
    case 'onion':
      return [blade, { kind: 'tone', frequency: 680 * up, peak: 0.12, attack: 0.01, decay: 0.11, glideTo: 1500 * up }]
    // A dry crackle of three quick ticks.
    case 'thistle':
      return [blade, { kind: 'noise', frequency: 4600, q: 9, peak: 0.1, attack: 0.002, decay: 0.018, delay: 0.03 }, { kind: 'noise', frequency: 3600 * up, q: 9, peak: 0.09, attack: 0.002, decay: 0.018, delay: 0.058 }, { kind: 'noise', frequency: 5200, q: 9, peak: 0.07, attack: 0.002, decay: 0.02, delay: 0.084 }]
    // A wiry twang.
    case 'ivy':
      return [blade, { kind: 'tone', frequency: 300 * up, wave: 'triangle', peak: 0.14, attack: 0.003, decay: 0.34, glideTo: 262 * up }, { kind: 'tone', frequency: 603 * up, peak: 0.05, attack: 0.003, decay: 0.2, glideTo: 520 * up }]
    // A hollow pop, as from a cut straw.
    case 'dandelion':
      return [{ ...blade, peak: 0.05 }, { kind: 'tone', frequency: 880 * up, peak: 0.15, attack: 0.003, decay: 0.07, glideTo: 300 * up }]
  }
}

/**
 * How each plant lands on the path. A poppy has three landings: `own`, the fall that costs it its petals; `bare`,
 * a pod that had none left; `whole`, one a vase spilled, which lies as it was.
 */
export function landing(kind: Kind, poppy: 'own' | 'bare' | 'whole' = 'own'): Sound {
  if (kind === 'poppy' && poppy === 'whole') return [{ kind: 'noise', frequency: 620, q: 0.7, peak: 0.09, attack: 0.006, decay: 0.07 }]
  if (kind === 'poppy' && poppy === 'bare') return [0, 0.06, 0.11, 0.17, 0.24].map((delay, i): Note => ({ kind: 'noise', frequency: 3000 + i * 180, q: 12, peak: 0.06 - i * 0.008, attack: 0.002, decay: 0.02, delay }))
  switch (kind) {
    // A flump, and three seeds that tick away.
    case 'sunflower':
      return [{ kind: 'noise', frequency: 220, q: 0.7, peak: 0.18, attack: 0.006, decay: 0.16, glideTo: 120 }, { kind: 'tone', frequency: 2100, wave: 'triangle', peak: 0.05, attack: 0.002, decay: 0.03, delay: 0.14 }, { kind: 'tone', frequency: 2500, wave: 'triangle', peak: 0.045, attack: 0.002, decay: 0.03, delay: 0.23 }, { kind: 'tone', frequency: 1900, wave: 'triangle', peak: 0.04, attack: 0.002, decay: 0.03, delay: 0.35 }]
    // A paf as the petals come off, and the pod rattles as it rolls.
    case 'poppy':
      return [{ kind: 'noise', frequency: 900, q: 0.6, peak: 0.13, attack: 0.004, decay: 0.08 }, ...[0.1, 0.16, 0.21, 0.27, 0.34].map((delay, i): Note => ({ kind: 'noise', frequency: 3000 + i * 180, q: 12, peak: 0.06 - i * 0.008, attack: 0.002, decay: 0.02, delay }))]
    // Bonk, bonk: it bounces twice like a ball, and rolls a little way.
    case 'onion':
      return [{ kind: 'tone', frequency: 330, peak: 0.16, attack: 0.003, decay: 0.09, glideTo: 220 }, { kind: 'tone', frequency: 370, peak: 0.12, attack: 0.003, decay: 0.08, glideTo: 250, delay: 0.3 }, { kind: 'noise', frequency: 300, q: 0.8, peak: 0.05, attack: 0.03, decay: 0.16, glideTo: 180, delay: 0.56 }]
    // Tok: it sticks in the path like a dart.
    case 'thistle':
      return [{ kind: 'tone', frequency: 760, wave: 'triangle', peak: 0.16, attack: 0.002, decay: 0.05, glideTo: 420 }, { kind: 'noise', frequency: 2400, q: 3, peak: 0.07, attack: 0.002, decay: 0.03 }, { kind: 'tone', frequency: 190, wave: 'triangle', peak: 0.06, attack: 0.004, decay: 0.2, delay: 0.03 }]
    // Boing-oing: it springs along its own length.
    case 'ivy':
      return [{ kind: 'tone', frequency: 240, peak: 0.15, attack: 0.004, decay: 0.2, glideTo: 520 }, { kind: 'tone', frequency: 300, peak: 0.1, attack: 0.004, decay: 0.2, glideTo: 620, delay: 0.2 }, { kind: 'tone', frequency: 360, peak: 0.06, attack: 0.004, decay: 0.16, glideTo: 680, delay: 0.38 }]
    // A whisper, as light as nothing.
    case 'dandelion':
      return [{ kind: 'noise', frequency: 2600, q: 0.6, peak: 0.07, attack: 0.05, decay: 0.3, glideTo: 4200 }]
  }
}

/** How each plant goes into the vase. The vase's own knock is added by `intoBoot`. */
export function standing(kind: Kind): Sound {
  switch (kind) {
    // Its head creaks round to the window.
    case 'sunflower':
      return [0, 0.09, 0.17, 0.26, 0.34].map((delay, i): Note => ({ kind: 'tone', frequency: 150 + i * 14, wave: 'sawtooth', peak: 0.06, attack: 0.004, decay: 0.045, delay: 0.12 + delay }))
    // Nods, and lets a petal go with a pat.
    case 'poppy':
      return [{ kind: 'noise', frequency: 700, q: 0.8, peak: 0.1, attack: 0.004, decay: 0.05, delay: 0.3 }]
    // A long squeak.
    case 'onion':
      return [{ kind: 'tone', frequency: 520, peak: 0.1, attack: 0.02, decay: 0.24, glideTo: 1250 }]
    // A tink on the rim.
    case 'thistle':
      return [{ kind: 'tone', frequency: 2350, peak: 0.1, attack: 0.002, decay: 0.2 }, { kind: 'tone', frequency: 3530, peak: 0.04, attack: 0.002, decay: 0.12 }]
    // A rustle, and the small creaks of a tendril on its way out.
    case 'ivy':
      return [{ kind: 'noise', frequency: 3200, q: 0.7, peak: 0.08, attack: 0.02, decay: 0.16 }, ...[0.3, 0.5, 0.72].map((delay, i): Note => ({ kind: 'tone', frequency: 420 + i * 60, wave: 'sawtooth', peak: 0.035, attack: 0.004, decay: 0.04, delay }))]
    // A pip, as it bobs on the rim.
    case 'dandelion':
      return [{ kind: 'tone', frequency: 1400, peak: 0.1, attack: 0.003, decay: 0.06, glideTo: 1800 }]
  }
}

/** A piece slides down into the boot: old leather, a soft thup. `count` is how many then stand in it, and each is a little lower. */
export function intoBoot(count: number): Sound {
  const f = 210 - clamp(count, 1, 7) * 12
  return [{ kind: 'tone', frequency: f, peak: 0.15, attack: 0.004, decay: 0.11, glideTo: f * 0.7 }, { kind: 'noise', frequency: 420, q: 0.8, peak: 0.09, attack: 0.004, decay: 0.07 }]
}

/** A piece too short for the vase drops down inside it: a hollow tonk. */
export const tonk: Sound = [{ kind: 'tone', frequency: 196, peak: 0.17, attack: 0.003, decay: 0.24, glideTo: 150 }, { kind: 'tone', frequency: 392, peak: 0.06, attack: 0.003, decay: 0.1 }]

/** One piece too many bounces off the bunch. */
export const boing: Sound = [{ kind: 'tone', frequency: 190, peak: 0.16, attack: 0.004, decay: 0.3, glideTo: 560 }, { kind: 'tone', frequency: 285, peak: 0.06, attack: 0.004, decay: 0.24, glideTo: 840 }]

/** A cut stalk shoots up with a rising whistle, and its flower opens with a pop. */
export const growBack: Sound = [{ kind: 'tone', frequency: 320, peak: 0.11, attack: 0.02, decay: 0.26, glideTo: 1250 }, { kind: 'tone', frequency: 620, peak: 0.16, attack: 0.003, decay: 0.07, glideTo: 1100, delay: 0.3 }]

/** A piece is taken up from the path or drawn out of the vase. */
export function pickUp(len: number): Sound {
  const f = clamp(1500 - len * 2.4, 500, 1500)
  return [{ kind: 'noise', frequency: 2400, q: 0.8, peak: 0.07, attack: 0.008, decay: 0.07 }, { kind: 'tone', frequency: f, peak: 0.07, attack: 0.004, decay: 0.06, glideTo: f * 1.3 }]
}

/** A bee lifts off its flower and zigzags. */
export const buzz: Sound = [0, 0.07, 0.14, 0.21].map((delay, i): Note => ({ kind: 'tone', frequency: i % 2 ? 236 : 208, wave: 'sawtooth', peak: 0.035, attack: 0.01, decay: 0.06, delay: 0.1 + delay }))

/** The goat's bleat: a wavering, cracked note. */
export const bleat: Sound = [0, 0.08, 0.16, 0.24, 0.32, 0.4].map((delay, i): Note => ({ kind: 'tone', frequency: (i % 2 ? 372 : 412) - i * 6, wave: 'sawtooth', peak: 0.085, attack: 0.012, decay: 0.075, delay }))

/** The goat sniffs at what was just put in its boot: snff, snff, and a lick of the lips. */
export const sniff: Sound = [{ kind: 'noise', frequency: 1300, q: 1.4, peak: 0.07, attack: 0.03, decay: 0.07, glideTo: 2100, delay: 0.25 }, { kind: 'noise', frequency: 1300, q: 1.4, peak: 0.07, attack: 0.03, decay: 0.07, glideTo: 2100, delay: 0.43 }, { kind: 'tone', frequency: 520, peak: 0.05, attack: 0.01, decay: 0.08, glideTo: 300, delay: 0.72 }]

/** One sniff, and no more: the reach. */
export const sniffOnce: Sound = [{ kind: 'noise', frequency: 1300, q: 1.4, peak: 0.07, attack: 0.03, decay: 0.09, glideTo: 2100 }]

/** The cat's mrrp. */
export const mrrp: Sound = [{ kind: 'tone', frequency: 470, wave: 'triangle', peak: 0.1, attack: 0.02, decay: 0.16, glideTo: 760 }, { kind: 'tone', frequency: 104, wave: 'sawtooth', peak: 0.03, attack: 0.02, decay: 0.16 }]

/** The robin's tsip. */
export const tsip: Sound = [{ kind: 'tone', frequency: 3300, peak: 0.07, attack: 0.004, decay: 0.045, glideTo: 4500 }, { kind: 'tone', frequency: 3600, peak: 0.06, attack: 0.004, decay: 0.04, glideTo: 4700, delay: 0.09 }]

/** The robin's wings as it comes down for a piece and carries it off. */
export const flutter: Sound = [0, 0.05, 0.1, 0.15, 0.2, 0.25].map((delay, i): Note => ({ kind: 'noise', frequency: 900 + (i % 2) * 500, q: 1.5, peak: 0.05, attack: 0.008, decay: 0.03, delay }))

// --- The vases ----------------------------------------------------------------

const tone = (frequency: number, peak: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack: 0.004, decay, ...more })
const hiss = (frequency: number, peak: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q: 1, peak, attack: 0.006, decay, ...more })

/** A piece goes into a vase: leather for the boot, a glass clink for the jar, a china ring for the tall vase. Each piece is a little lower. */
export function intoVase(vase: VaseId, count: number): Sound {
  const n = clamp(count, 1, 7)
  if (vase === 'boot') return intoBoot(count)
  if (vase === 'jar') return [tone(1480 - n * 60, 0.11, 0.12), tone(2960 - n * 120, 0.04, 0.07), hiss(2600, 0.04, 0.03)]
  return [tone(880 - n * 30, 0.12, 0.3), tone(1326 - n * 45, 0.05, 0.22, { delay: 0.01 })]
}

/** A vase is set down on the stone table: that vase's own knock. */
export function setDown(vase: VaseId): Sound {
  if (vase === 'boot') return [tone(120, 0.18, 0.12, { glideTo: 84 }), hiss(380, 0.1, 0.06)]
  if (vase === 'jar') return [tone(640, 0.13, 0.1), tone(1620, 0.07, 0.16, { delay: 0.012 }), hiss(1900, 0.05, 0.03)]
  return [tone(392, 0.15, 0.34), tone(1176, 0.06, 0.4, { delay: 0.008 })]
}

/** A vase goes over: the jar rolls and rings, the tall vase comes down with a clonk. */
export function clonk(vase: VaseId): Sound {
  if (vase === 'jar') return [tone(520, 0.17, 0.14, { glideTo: 380 }), ...[0.16, 0.27, 0.36, 0.43].map((delay, i) => tone(1300 + i * 70, 0.07 - i * 0.012, 0.06, { delay }))]
  return [tone(250, 0.19, 0.2, { glideTo: 150 }), tone(742, 0.08, 0.3, { delay: 0.01 }), hiss(700, 0.1, 0.08), tone(230, 0.08, 0.14, { delay: 0.3, glideTo: 170 })]
}

/** One head short of going over, a vase rocks and creaks. */
export const creak: Sound = [0, 0.07, 0.15, 0.24, 0.34].map((delay, i) => tone(205 + (i % 2) * 34, 0.07, 0.05, { wave: 'sawtooth', delay }))
/** The water runs out over the table and soaks into the earth. */
export const water: Sound = [hiss(900, 0.1, 0.5, { attack: 0.05, glideTo: 420, q: 0.6 }), ...[0.1, 0.24, 0.41, 0.6].map((delay, i) => tone(700 + i * 130, 0.05, 0.05, { delay, glideTo: 1100 + i * 100 }))]
/** A finger takes the vase up off the table. */
export const potLift: Sound = [hiss(600, 0.07, 0.07), tone(330, 0.08, 0.08, { glideTo: 440 })]
/** A vase let go short of the visitor slides back to its place. */
export const slideBack: Sound = [hiss(1100, 0.08, 0.22, { attack: 0.03, glideTo: 500, q: 0.7 }), tone(150, 0.12, 0.08, { delay: 0.24, glideTo: 110 })]

// --- The visitors -------------------------------------------------------------

/** The bee-keeper's hum from under her veil. */
export const hum: Sound = [tone(196, 0.1, 0.34, { attack: 0.04, wave: 'triangle' }), tone(247, 0.07, 0.3, { attack: 0.05, delay: 0.16, wave: 'triangle' })]
/** The bride's hiccup. */
export const hiccup: Sound = [tone(720, 0.11, 0.05, { glideTo: 1180 }), tone(520, 0.05, 0.07, { delay: 0.09 })]
/** The aunt's sniff: dry, down her nose. */
export const dry: Sound = [hiss(2400, 0.08, 0.1, { attack: 0.02, glideTo: 3400, q: 2 }), hiss(2000, 0.04, 0.06, { delay: 0.16, q: 2 })]

/** A finger lands on a visitor: its own answer. */
export function pokeVoice(who: VisitorId): Sound {
  return who === 'goat' ? bleat : who === 'beekeeper' ? hum : who === 'bride' ? hiccup : dry
}

/** How each visitor walks: hooves that clatter, padded boots that thud slowly, a train that swishes, heels that click evenly. */
export function steps(who: VisitorId): Sound {
  switch (who) {
    case 'goat': return [0, 0.11, 0.25, 0.36, 0.52, 0.63, 0.8].map((delay, i) => tone(i % 2 ? 620 : 540, 0.08, 0.03, { wave: 'triangle', delay, attack: 0.002 }))
    case 'beekeeper': return [0, 0.3, 0.6, 0.9].map((delay) => tone(110, 0.13, 0.1, { delay, glideTo: 80 }))
    case 'bride': return [hiss(3000, 0.06, 0.4, { attack: 0.15, q: 0.5 }), hiss(2600, 0.05, 0.4, { attack: 0.15, delay: 0.5, q: 0.5 })]
    case 'aunt': return [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.96].map((delay) => tone(1250, 0.07, 0.018, { delay, attack: 0.002 }))
  }
}

/** The one who waits lifts its vase a little. */
export function gateLift(who: VisitorId): Sound {
  const f = who === 'goat' ? 392 : who === 'beekeeper' ? 262 : who === 'bride' ? 660 : 494
  return [tone(f, 0.09, 0.09, { glideTo: f * 1.25 }), tone(f * 1.25, 0.06, 0.1, { delay: 0.12, glideTo: f })]
}

/** The sneeze, each visitor's own: a whole-body bleat, a muffled one inside a veil, a high a-choo, one dry tut. */
export function sneeze(who: VisitorId): Sound {
  const draw = hiss(1500, 0.06, 0.2, { attack: 0.12, glideTo: 3200, q: 1.5 })
  switch (who) {
    case 'goat': return [draw, ...[0.3, 0.37, 0.44, 0.51, 0.58].map((delay, i) => tone(520 - i * 40, 0.13 - i * 0.012, 0.07, { wave: 'sawtooth', delay })), hiss(1800, 0.14, 0.12, { delay: 0.3, q: 0.6 })]
    case 'beekeeper': return [draw, hiss(600, 0.15, 0.16, { delay: 0.3, q: 0.6 }), tone(180, 0.1, 0.14, { delay: 0.3, glideTo: 120 })]
    case 'bride': return [draw, tone(1350, 0.13, 0.12, { delay: 0.3, glideTo: 820 }), hiss(3600, 0.12, 0.14, { delay: 0.3, q: 0.6 })]
    case 'aunt': return [{ ...draw, decay: 0.08, attack: 0.05 }, hiss(2800, 0.1, 0.03, { delay: 0.3, q: 4, attack: 0.002 })]
  }
}

// --- Sniffed, and let go on the visitor: the last two columns of the grid ------

/** What a flower does to the nose that sniffs it. The dandelion's is the visitor's sneeze. */
export function sniffed(kind: Kind, who: VisitorId): Sound {
  switch (kind) {
    // A low boop, nose to nose.
    case 'sunflower': return [tone(174, 0.17, 0.16, { glideTo: 131, attack: 0.01 })]
    // Pfff: the petal is blown up off the nose.
    case 'poppy': return [hiss(2200, 0.1, 0.22, { attack: 0.03, glideTo: 4200, q: 0.7 })]
    // A rising whine, and psst, psst.
    case 'onion': return [tone(480, 0.07, 0.4, { attack: 0.1, glideTo: 1500 }), hiss(4800, 0.1, 0.05, { delay: 0.5, q: 3 }), hiss(5200, 0.1, 0.05, { delay: 0.64, q: 3 })]
    // Ping.
    case 'thistle': return [tone(2640, 0.13, 0.22, { attack: 0.002 }), tone(3960, 0.04, 0.12, { attack: 0.002 })]
    // The tendril lets go: thwip.
    case 'ivy': return [hiss(3000, 0.1, 0.05, { glideTo: 5600, q: 2, attack: 0.004 }), tone(900, 0.07, 0.05, { glideTo: 2400 })]
    case 'dandelion': return sneeze(who)
  }
}

/** What a piece does when it is let go on the visitor. */
export function dropped(kind: Kind): Sound {
  switch (kind) {
    // Whump, and a grunt as the head is wound round.
    case 'sunflower': return [hiss(260, 0.17, 0.14, { q: 0.6 }), tone(96, 0.14, 0.12, { glideTo: 70 }), tone(132, 0.09, 0.3, { wave: 'sawtooth', delay: 0.5, attack: 0.05, glideTo: 104 })]
    // Plip, plip under the petals.
    case 'poppy': return [tone(1560, 0.1, 0.045, { delay: 0.2, glideTo: 2200 }), tone(1760, 0.1, 0.045, { delay: 0.86, glideTo: 2400 })]
    // Crunch, and a long wheeze out.
    case 'onion': return [hiss(1300, 0.16, 0.07, { q: 0.8 }), hiss(900, 0.11, 0.06, { delay: 0.07, q: 0.8 }), hiss(700, 0.07, 0.5, { delay: 0.6, attack: 0.1, glideTo: 380, q: 2 })]
    // Yip.
    case 'thistle': return [tone(880, 0.14, 0.08, { glideTo: 1680 }), tone(1680, 0.06, 0.05, { delay: 0.09, glideTo: 1320 })]
    // Zip, round and round, and back.
    case 'ivy': return [tone(300, 0.1, 0.24, { glideTo: 1400, wave: 'triangle' }), tone(1400, 0.08, 0.24, { delay: 0.8, glideTo: 320, wave: 'triangle' })]
    // Pfoo.
    case 'dandelion': return [hiss(1400, 0.1, 0.26, { delay: 0.6, attack: 0.04, glideTo: 2600, q: 0.6 }), tone(520, 0.05, 0.16, { delay: 0.62, glideTo: 400 })]
  }
}

// --- The answers --------------------------------------------------------------

/** The goat eats a piece: a crisp for a thistle, celery for a bare stalk, a munch for the rest. */
export function eaten(kind: Kind, head: boolean): Sound {
  if (!head) return [hiss(1900, 0.14, 0.05, { q: 1.4 }), hiss(1500, 0.1, 0.05, { delay: 0.09, q: 1.4 }), tone(170, 0.07, 0.05, { delay: 0.02 })]
  if (kind === 'thistle') return [hiss(4200, 0.15, 0.03, { q: 2, attack: 0.002 }), hiss(3400, 0.11, 0.03, { delay: 0.06, q: 2, attack: 0.002 }), hiss(4800, 0.08, 0.03, { delay: 0.11, q: 2, attack: 0.002 })]
  return [hiss(700, 0.13, 0.07, { q: 0.8 }), hiss(560, 0.1, 0.07, { delay: 0.13, q: 0.8 })]
}

/** The goat's bleat cracks: onion on its breath. */
export const crackedBleat: Sound = [0, 0.08, 0.16, 0.27, 0.35, 0.46].map((delay, i) => tone(i === 3 ? 640 : (i % 2 ? 340 : 400) - i * 8, 0.085, 0.07, { wave: 'sawtooth', delay, attack: 0.012 }))
/** The goat's eyes roll up: a low pleased rumble. */
export const relish: Sound = [tone(140, 0.12, 0.4, { attack: 0.06, wave: 'triangle', glideTo: 170 }), tone(280, 0.05, 0.3, { attack: 0.06, delay: 0.1 })]

const HUM = [262, 330, 392, 494, 587, 659, 784]
/** A bee moves into the bee-keeper's hat with its own hummed note. */
export function humNote(index: number): Sound {
  return [tone(HUM[index % HUM.length], 0.09, 0.2, { attack: 0.03, wave: 'triangle' }), tone(HUM[index % HUM.length] * 0.5, 0.03, 0.12, { attack: 0.02, wave: 'sawtooth' })]
}
/** With three bees or more she hums the chord with them. */
export const humChord: Sound = [262, 330, 392].map((frequency, i) => tone(frequency, 0.08, 0.6, { attack: 0.08, wave: 'triangle', delay: i * 0.03 }))
/** No bee: she shakes the bouquet at her ear. */
export const rattle: Sound = [0, 0.09, 0.18, 0.27, 0.36].map((delay, i) => hiss(2600 + (i % 2) * 500, 0.07, 0.03, { delay, q: 3 }))
/** The bees in her hat sag. */
export const sag: Sound = [tone(230, 0.07, 0.5, { attack: 0.05, wave: 'sawtooth', glideTo: 150 })]
/** Her glass, held to a stalk. */
export const glass: Sound = [tone(1860, 0.08, 0.14, { attack: 0.002 }), tone(2790, 0.03, 0.1, { attack: 0.002, delay: 0.3 })]
/** The veil lifts, and a very small face says peep. */
export const peep: Sound = [hiss(2400, 0.05, 0.2, { attack: 0.08, q: 0.6 }), tone(1900, 0.09, 0.07, { delay: 0.5, glideTo: 2300 })]

/** The bride turns once on the spot. */
export const swirl: Sound = [hiss(2000, 0.08, 0.6, { attack: 0.25, glideTo: 3800, q: 0.6 }), tone(784, 0.07, 0.14, { delay: 0.3 }), tone(988, 0.07, 0.14, { delay: 0.48 }), tone(1175, 0.07, 0.2, { delay: 0.66 })]
/** As proudly as roses. */
export const proud: Sound = [tone(523, 0.08, 0.16, { attack: 0.02 }), tone(659, 0.08, 0.16, { delay: 0.2, attack: 0.02 }), tone(784, 0.09, 0.4, { delay: 0.4, attack: 0.02 })]

/** The aunt's bun tightens. */
export const squeak: Sound = [tone(1500, 0.09, 0.12, { attack: 0.03, glideTo: 2500 })]
/** Her eyebrow goes up off her face. */
export const brow: Sound = [tone(420, 0.09, 0.28, { attack: 0.02, glideTo: 1250, wave: 'triangle' })]
/** A piece straightened with one fingertip sinks back. */
export const sinkBack: Sound = [tone(700, 0.08, 0.3, { delay: 0.5, attack: 0.03, glideTo: 300, wave: 'triangle' }), tone(1300, 0.06, 0.03, { delay: 0.3, attack: 0.002 })]
/** She squares her bouquet to the edge of the table at her window: two small pushes. */
export const squareUp: Sound = [tone(900, 0.07, 0.035, { attack: 0.002, delay: 0.1 }), tone(1050, 0.07, 0.035, { attack: 0.002, delay: 0.36 })]
/** She measures the stalks against each other. */
export const tick: Sound = [0, 0.2, 0.4, 0.6, 0.8].map((delay, i) => tone(i % 2 ? 1500 : 1700, 0.06, 0.02, { delay, attack: 0.002 }))
/** One stiff nod. */
export const nod: Sound = [tone(330, 0.1, 0.07, { glideTo: 262 })]
/** The aunt laughs: high and hiccuping, heard at no other time. */
export const laugh: Sound = [0, 0.11, 0.22, 0.36, 0.47, 0.58, 0.72, 0.83].map((delay, i) => tone([1320, 1480, 1245, 1660, 1320, 1570, 1175, 1400][i], 0.1, 0.05, { delay, glideTo: [1320, 1480, 1245, 1660, 1320, 1570, 1175, 1400][i] * 1.18 }))
/** A sniff that finds nothing to say. */
export const plain: Sound = [hiss(1500, 0.07, 0.08, { attack: 0.03, glideTo: 2200, q: 1.4 }), hiss(1500, 0.07, 0.08, { attack: 0.03, delay: 0.4, glideTo: 2200, q: 1.4 })]

/** Every voice with a fixed shape, by name, for the test that holds them in range. */
export const FIXED: Record<string, Sound> = { sniffOnce, squareUp, bladesOpen, snick, tonk, boing, growBack, buzz, bleat, sniff, mrrp, tsip, flutter, creak, water, potLift, slideBack, hum, hiccup, dry, crackedBleat, relish, humChord, rattle, sag, glass, peep, swirl, proud, squeak, brow, sinkBack, tick, nod, laugh, plain }

import type { Note } from './audio'
import type { Act } from './acts'
import { DYE_NOTE, folkVoice, type Cue, type Part } from './voices'

// The sounds of the game beyond laying wool, as plain numbers written from the
// sheet's words: the comb, the veils, the coats, what each figure does where
// it stands, and the five scenes. Nobody has listened to them yet. As in
// voices.ts a sound with parts in time is a cue, and the toy's own clock
// releases each part when it falls due: no note carries a delay.

const tone = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number, wave: OscillatorType = 'sine'): Note => ({ kind: 'tone', frequency, peak, attack, decay, glideTo, wave })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, glideTo })
const now = (...notes: Note[]): Cue => [{ after: 0, notes }]
const run = (from: number, gap: number, make: (i: number) => Note, count: number): Part[] => Array.from({ length: count }, (_, i) => ({ after: from + i * gap, notes: [make(i)] }))
const then = (cue: Cue, after: number): Part[] => cue.map((part) => ({ after: part.after + after, notes: part.notes }))

// --- The comb ----------------------------------------------------------------

/** One grain of the comb's rasp on wool, by the third of the sheet it works in (0 low, 1 middle, 2 high). */
export function rasp(height: number): Note[] {
  return [hiss([420, 900, 1900][height], 3, [0.07, 0.06, 0.045][height], 0.004, 0.05, [300, 1300, 2600][height])]
}
/** What the fluff does after a comb lifts: low it rolls away (a soft rolling patter), in the middle it drifts (a ripping zip), high it floats off (rising tinkles). */
export const FLUFF: readonly Cue[] = [
  run(0, 0.07, (i) => hiss(260 + i * 14, 1, 0.04, 0.008, 0.05), 6),
  now(hiss(1500, 2, 0.07, 0.01, 0.22, 4200)),
  run(0, 0.09, (i) => tone(1700 + i * 330, 0.035, 0.004, 0.09), 4),
]
/** The comb on bare felt: dust that rolls, the nap standing up, stray fibres on end. */
export function bareRasp(height: number): Note[] {
  return [hiss([300, 700, 1500][height], 1.2, 0.035, 0.006, 0.07, [220, 900, 2300][height])]
}
/** The comb wriggling on the table by itself: its teeth tick on the wood, six quick dry ticks. */
export const combTeeth: Cue = run(0, 0.05, (i) => tone(900 + (i % 2) * 180, 0.035, 0.002, 0.04, undefined, 'triangle'), 6)
/** The comb picked up: its teeth ring, low to high. */
export const combPluck: Cue = run(0, 0.028, (i) => tone(640 + i * 150, 0.05, 0.003, 0.07, undefined, 'triangle'), 5)
/** A veil lifted: a peeling rip. The thing underneath then sounds as itself. */
export const peel: Cue = now(hiss(900, 2.5, 0.08, 0.02, 0.3, 3400))

// --- The veils -----------------------------------------------------------------

/** What a veil of each dye sounds like as it settles on the thing under it. */
export const VEIL: readonly Cue[] = [
  // Overgrown: a creeping run of small pops that climbs.
  run(0, 0.085, (i) => tone(240 + i * 46, 0.05, 0.004, 0.05, 260 + i * 46, 'triangle'), 7),
  // Hazed: a faint glassy tinkle.
  run(0, 0.11, (i) => tone(2300 + ((i * 410) % 900), 0.03, 0.003, 0.16), 4),
  // Wet: spaced drips, each lower than the last.
  run(0, 0.24, (i) => tone(980 - i * 150, 0.06, 0.004, 0.11, 760 - i * 150), 4),
  // Lit: a shimmer of quick high notes.
  run(0, 0.05, (i) => tone(1500 + ((i * 370) % 700), 0.035, 0.004, 0.07), 8),
  // Weathered: a long groan downward with a crumble.
  [{ after: 0, notes: [tone(150, 0.07, 0.25, 0.7, 70, 'sawtooth')] }, ...run(0.6, 0.09, (i) => hiss(280 + i * 30, 0.8, 0.04, 0.01, 0.06), 4)],
]

// --- The coats -----------------------------------------------------------------

/** Wool laid on a figure, by dye: what the wearer does about it, with its plain voice where the sheet gives it one. */
export function coatOn(who: number, dye: number): Cue {
  const own = folkVoice(who, 'look', dye)
  switch (dye) {
    // Chomping at its own back, and then the wearer's plain voice.
    case 0: return [...run(0, 0.13, (i) => hiss(700 + (i % 2) * 260, 2, 0.06, 0.006, 0.05), 4), ...then(own, 0.6)]
    // The patter of its own small rain. Each bump sounds when the wearer walks into something (`beatVoice`).
    case 1: return run(0, 0.07, (i) => tone(1600 + ((i * 290) % 600), 0.03, 0.003, 0.04), 6)
    // Plinks, after the flapping shudder of its first shake (`beatVoice`).
    case 2: return run(0.42, 0.1, (i) => tone(1900 - i * 210, 0.04, 0.003, 0.06), 4)
    // A rising hum, and the moth's flutter.
    case 3: return [{ after: 0, notes: [tone(DYE_NOTE[3] / 2, 0.08, 0.4, 0.5, DYE_NOTE[3])] }, ...run(0.5, 0.06, (i) => hiss(4600 + i * 220, 3, 0.045, 0.004, 0.04), 5)]
    // A squelch and the pig's plain grunt as it rolls, or a squelch and a huff.
    default: return [{ after: 0, notes: [hiss(380, 1.2, 0.09, 0.02, 0.16, 160), tone(130, 0.06, 0.01, 0.14, 70)] }, ...(who === 3 ? then(own, 0.25) : [{ after: 0.3, notes: [hiss(900, 0.8, 0.06, 0.03, 0.2, 500)] }])]
  }
}
/** A coat combed off in one tuft: a soft tearing puff. */
export const coatOff: Cue = now(hiss(1300, 1.2, 0.08, 0.03, 0.26, 600), hiss(3000, 3, 0.035, 0.005, 0.1))
/** A tickle: each figure laughs in its own way, in its own voice, in quick hops. */
export function giggle(who: number): Cue {
  const base = [330, 470, 200, 620][who], gap = [0.11, 0.07, 0.16, 0.09][who], count = [4, 6, 3, 5][who]
  return run(0, gap, (i) => tone(base * (1 + 0.12 * (i % 2)), 0.06, 0.006, gap * 0.7, base * 1.2, who === 1 ? 'square' : 'triangle'), count)
}

// --- A figure and its place ------------------------------------------------------

/** A figure set down on the sheet: a soft thud of felt on felt, lower for the heavier ones. */
export function setDown(who: number): Note[] {
  return [tone([120, 170, 95, 105][who], 0.11, 0.004, 0.11, 70), hiss(500, 1, 0.04, 0.004, 0.05)]
}
/** A figure back in the dish: it lands with a little knock of its own. */
export function homeLanding(who: number): Note[] {
  return [tone([150, 210, 110, 130][who], 0.08, 0.004, 0.09, 90, 'triangle')]
}
/** A figure lifted: a small upward sweep. */
export const liftUp: Note[] = [hiss(900, 2, 0.04, 0.02, 0.1, 2200)]

/**
 * What a figure sounds like as it starts what its place makes it do: the sound of that doing, and nothing else.
 * On a place it is drawn to that is a munch, a splash, a gulp, a snore, a breath of the air, and never a brighter
 * voice of its own: no figure has a voice that says it is pleased, and none has an angry one. What it makes of
 * rain, mist, a sun or a wind is heard the same way (a sniff and a drip as he sits, a puff after his hat, breath).
 * Where a place makes it do nothing in particular it gives its plain voice once, as when it looks at a thing.
 * What an act does at a moment is not here: it sounds each time it happens (`beatVoice`).
 */
export function actVoice(who: number, act: Act): Cue {
  const mild = folkVoice(who, 'look', 0)
  switch (act) {
    // It tears at the grass three times, and munches.
    case 'graze': return [...run(0, 0.2, () => hiss(1900, 3, 0.05, 0.006, 0.05), 3), ...run(0.7, 0.18, (i) => hiss(520 - i * 40, 1.2, 0.05, 0.012, 0.07), 3)]
    // Its fleece sags: slow drips off it. The shake is a beat.
    case 'soaked': return run(0.7, 0.26, (i) => tone(820 - i * 120, 0.045, 0.004, 0.09, 640 - i * 120), 3)
    // It shivers and goes looking: a tremble, and soft steps to and fro.
    case 'lost': return [...run(0, 0.05, (i) => hiss(700 + (i % 2) * 180, 1.4, 0.035, 0.004, 0.035), 5), ...run(0.45, 0.3, () => tone(140, 0.05, 0.005, 0.07, 110), 3)]
    // The breath it draws before the first sneeze. Each sneeze is a beat.
    case 'sneeze': return now(hiss(2600, 1, 0.05, 0.3, 0.05, 3400))
    // Its back to the sun and its eyes shut: two soft steps as it turns, and slow breath.
    case 'squint': return [...run(0, 0.18, () => tone(140, 0.05, 0.005, 0.07, 110), 2), ...run(0.4, 0.22, (i) => hiss(1000 + (i % 2) * 260, 2, 0.04, 0.04, 0.08), 3)]
    case 'pant': return run(0, 0.16, (i) => hiss(1100 + (i % 2) * 300, 2, 0.04, 0.03, 0.06), 4)
    // It lets itself down onto the pond: a plop, the splash, and two ripples.
    case 'swim': return [{ after: 0, notes: [tone(200, 0.1, 0.005, 0.2, 90)] }, { after: 0.12, notes: [hiss(1800, 1, 0.06, 0.01, 0.2, 900)] }, ...run(0.36, 0.14, (i) => tone(620 - i * 90, 0.035, 0.01, 0.1, 520 - i * 90), 2)]
    // The stream carries it off: the water's quick notes, and the wash against its breast.
    case 'ride': return [...run(0, 0.07, (i) => tone(760 + ((i * 290) % 500), 0.04, 0.005, 0.06), 5), { after: 0.4, notes: [hiss(1500, 1, 0.055, 0.02, 0.22, 800)] }]
    // The wind lifts it: the loop it flies is a beat, and its wingbeats are heard there.
    case 'fly': return []
    // Its wings go out with two flaps, and its feet slap in the wet.
    case 'dance': return [...run(0, 0.11, (i) => hiss(1000 + i * 160, 1.5, 0.055, 0.01, 0.06), 2), ...run(0.4, 0.14, (i) => tone(520 + (i % 2) * 130, 0.04, 0.005, 0.07), 4)]
    case 'hiss': return now(hiss(5200, 2, 0.08, 0.05, 0.5, 3800))
    // He climbs: four steps in the grass, and a long breath of the air at the top.
    case 'ridge': return [...run(0, 0.22, (i) => hiss(420, 1, 0.045, 0.006, 0.05 + 0.01 * (i % 2)), 4), { after: 0.95, notes: [hiss(1500, 1, 0.045, 0.25, 0.2, 2400)] }]
    // A hand held out to the first drops: his plain hum, the one he looks at a thing with.
    case 'feel': return mild
    // He sits down in the rain: drops on his hat, a sniff, a drip off his nose, and the thump as he sits.
    case 'wet': return [...run(0, 0.09, (i) => tone(1500 + ((i * 370) % 800), 0.035, 0.003, 0.05), 5), { after: 0.45, notes: [hiss(2200, 2, 0.05, 0.05, 0.1, 3000)] }, { after: 0.7, notes: [tone(900, 0.045, 0.004, 0.1, 700)] }, { after: 0.9, notes: [tone(98, 0.08, 0.006, 0.14, 70)] }]
    // The fire crackles, and he rubs his mittens together.
    case 'warm': return [...run(0, 0.11, (i) => hiss(2300 + ((i * 530) % 900), 4, 0.04, 0.003, 0.035), 4), ...run(0.5, 0.13, () => hiss(1300, 0.9, 0.04, 0.03, 0.07), 3)]
    // The wind takes his hat: every flight of it is a beat.
    case 'hat': return []
    // He dozes against the trunk: two slow snores.
    case 'doze': return run(0, 0.9, () => tone(92, 0.05, 0.3, 0.4, 78, 'triangle'), 2)
    // It goes over onto its back: a squelch, a slower one as it sinks in, and three bubbles.
    case 'wallow': return [{ after: 0, notes: [hiss(380, 1.2, 0.09, 0.02, 0.18, 150)] }, { after: 0.25, notes: [hiss(300, 1, 0.07, 0.05, 0.25, 140)] }, ...run(0.6, 0.15, (i) => tone(210 + i * 40, 0.035, 0.01, 0.06, 300 + i * 40), 3)]
    case 'root': return [...run(0, 0.12, () => hiss(340, 1.5, 0.05, 0.008, 0.06), 3), { after: 0.6, notes: [hiss(700, 0.7, 0.05, 0.15, 0.4, 400)] }]
    // Five chomps and a gulp.
    case 'gobble': return [...run(0, 0.1, (i) => hiss(800 + (i % 2) * 240, 2, 0.06, 0.005, 0.045), 5), { after: 0.6, notes: [tone(190, 0.07, 0.01, 0.12, 95)] }]
    // It sets off down the hill: each roll is a beat, and its tumble is heard there.
    case 'roll': return []
    // It fans itself with its ears: the flaps, and a puff of breath.
    case 'fan': return [...run(0, 0.13, () => hiss(700, 1, 0.05, 0.03, 0.06), 4), { after: 0.6, notes: [hiss(900, 0.8, 0.05, 0.03, 0.2, 500)] }]
    default: return mild
  }
}

/**
 * What an act does at a moment, heard at that moment: the toy releases this in the tick the beat begins
 * (`BEATS` in acts.ts), which is the tick its pose begins. Every part of it is over before the pose is.
 */
export function beatVoice(who: number, act: Act): Cue {
  switch (act) {
    // The sneeze itself.
    case 'sneeze': return now(hiss(1400, 0.7, 0.12, 0.004, 0.14, 500))
    // It shakes itself like a dog: a flapping rattle.
    case 'soaked': return run(0, 0.05, (i) => hiss(600 + (i % 2) * 200, 1.4, 0.05, 0.004, 0.04), 6)
    // A shudder in a blue coat, higher for the smaller wearers.
    case 'shiver': return run(0, 0.045, (i) => hiss([500, 640, 420, 560][who] + (i % 2) * 300, 1.5, 0.06, 0.004, 0.035), 8)
    // It walks into something: one soft bump.
    case 'blind': return now(tone([110, 150, 92, 120][who], 0.09, 0.006, 0.1, 80))
    // The wind takes his hat (a gust), and he puffs as he sets off after it.
    case 'hat': return [{ after: 0, notes: [hiss(600, 6, 0.07, 0.2, 0.3, 2200)] }, ...run(0.35, 0.2, () => hiss(900, 0.8, 0.055, 0.03, 0.12, 520), 3)]
    // One loop on the wind: its wings beat.
    case 'fly': return run(0, 0.08, (i) => hiss(900 + i * 120, 1.5, 0.06, 0.01, 0.06), 6)
    // It tumbles down the hill.
    case 'roll': return run(0, 0.13, (i) => tone(150 - i * 8, 0.06, 0.008, 0.08, 110 - i * 8), 5)
    default: return []
  }
}

// --- The frame, the wall and the five scenes -----------------------------------

/** The yarn loop, touched: a soft twang. Let go short of a peg, it springs back with a lower one. */
export const loopTwang: Note[] = [tone(392, 0.09, 0.004, 0.2, 370, 'triangle')]
export const loopBack: Note[] = [tone(294, 0.07, 0.004, 0.16, 262, 'triangle')]
/** A hung picture, tapped: wood on the wall. */
export const pictureKnock: Note[] = [tone(180, 0.1, 0.003, 0.1, 150, 'triangle'), hiss(700, 1, 0.03, 0.003, 0.04)]
/** The moth eating fluff: three tiny dry bites. */
export const mothBite: Cue = run(0, 0.11, (i) => hiss(5200 + i * 200, 6, 0.03, 0.003, 0.03), 3)

/** Rain: the cloud gathers (a hollow swell), the first drops, the steady patter. */
export const rainGather: Cue = now(tone(131, 0.1, 0.5, 0.6), hiss(360, 0.6, 0.05, 0.4, 0.6))
export const rainFirst: Cue = run(0, 0.22, (i) => tone(1300 + ((i * 410) % 700), 0.05, 0.003, 0.06), 4)
export const rainSteady: Cue = run(0, 0.075, (i) => tone(1500 + ((i * 370) % 800), 0.035, 0.003, 0.05), 10)
/** The sun dries: the rays reach out (two notes a fifth apart, swelling), drops hiss into steam, what was wet dries with small cracks. */
export const sunReach: Cue = now(tone(330, 0.08, 0.5, 0.8), tone(495, 0.055, 0.6, 0.7))
/** Rain on a fire: it spits and hisses as its embers go dull. */
export const fireHiss: Cue = [{ after: 0, notes: [hiss(4200, 1.2, 0.08, 0.02, 0.7, 2400)] }, ...run(0.1, 0.13, (i) => hiss(2600 + ((i * 610) % 1100), 5, 0.045, 0.003, 0.03), 4)]
export const steamHiss: Cue = now(hiss(3200, 1, 0.06, 0.3, 0.9, 5200))
export const dryCracks: Cue = run(0, 0.16, (i) => hiss(1800 + ((i * 450) % 900), 5, 0.04, 0.003, 0.03), 5)
/** The bow: one rising note for each dye's strand, then a held chord while it hangs. */
export const bowStrands: Cue = run(0, 0.22, (i) => tone(DYE_NOTE[[4, 0, 2, 3, 1][i]] * 2, 0.06, 0.03, 0.4, DYE_NOTE[[4, 0, 2, 3, 1][i]] * 2.25), 5)
export const bowHang: Cue = now(tone(392, 0.045, 0.5, 1.2), tone(494, 0.04, 0.5, 1.2), tone(587, 0.035, 0.5, 1.2))
/** The wall was full: the oldest picture is unhooked (a small knock) and tucked behind the stack (felt on felt). */
export const unhook: Note[] = [tone(260, 0.08, 0.003, 0.08, 210, 'triangle')]
export const tuck: Note[] = [hiss(420, 0.8, 0.09, 0.008, 0.16, 200)]
/** The frame swings up (a creak of yarn) and settles on its peg (a knock). */
export const swingUp: Cue = now(tone(170, 0.05, 0.3, 0.6, 250, 'sawtooth'))
export const settleOnPeg: Note[] = [tone(220, 0.12, 0.003, 0.12, 180, 'triangle'), tone(440, 0.05, 0.003, 0.06)]
/** The light lowers and warms: a low chord that sinks. */
export const eveningLight: Cue = now(tone(196, 0.06, 0.8, 1.4, 165), tone(247, 0.045, 0.8, 1.4, 208))
/** Each shape of the picture takes its evening way: four soft bell notes, falling. */
export const eveningWays: Cue = run(0, 0.3, (i) => tone(880 - i * 110, 0.035, 0.01, 0.35), 4)
/** A fresh felt turns round: a soft whoosh, and a thump of felt when it stands. Then daylight: a chord that rises. */
export const turnRound: Cue = now(hiss(500, 0.8, 0.06, 0.25, 0.5, 1100))
export const feltThump: Note[] = [tone(88, 0.14, 0.004, 0.16, 60), hiss(360, 0.8, 0.06, 0.004, 0.08)]
export const daylight: Cue = now(tone(262, 0.05, 0.6, 1, 294), tone(392, 0.04, 0.6, 1, 440))

import { LIMITS, type Part, type VoiceSpec } from './voices'
import type { GuestId } from './world'

// The rest of the toy's sounds, continuing voices.ts: one voice for every
// cell of the grid in ART.md that voices.ts does not already answer, and the
// guests' own sounds. The same rules hold (the ranges are LIMITS in voices.ts
// and the test beside this file checks every part against them), and for the
// same reason: the machine these were written on cannot be listened to. So
// each voice says which real sound it imitates, and its numbers follow from
// that sound: glazed pottery rings high and short, cloth is dull noise with
// no ring, tea is a low bubble or a band of noise that moves, a spoon is
// thin and higher than any cup.
//
// A voice that repeats while the finger moves takes a `turn`, a counter, and
// its first part is never at the same pitch on two neighbouring turns.

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** A tone: when it starts, its pitch, where it glides to (the same pitch for no glide), peak, attack, decay, and its wave. */
function tone(at: number, pitch: number, to: number, peak: number, attack: number, decay: number, wave: 'sine' | 'triangle' = 'sine'): Part {
  return to === pitch ? { kind: 'tone', at, pitch, wave, peak, attack, decay } : { kind: 'tone', at, pitch, to, wave, peak, attack, decay }
}

/** A band of noise: when it starts, its middle, where the middle glides to, how narrow it is, peak, attack, decay. */
function noise(at: number, pitch: number, to: number, q: number, peak: number, attack: number, decay: number): Part {
  return to === pitch ? { kind: 'noise', at, pitch, q, peak, attack, decay } : { kind: 'noise', at, pitch, to, q, peak, attack, decay }
}

/** Between about -1.45 and 1.45, and never the same on two neighbouring turns: two sines that do not line up. */
const waver = (turn: number, rate: number) => Math.sin(turn * rate) + 0.45 * Math.sin(turn * rate * 2.13)

// ---- A cup ----

/** A cup slid across the cloth: the unglazed foot of a cup dragged over linen, a dry hiss high up with a little of the cloth under it. */
export function ceramicHiss(turn: number): VoiceSpec {
  return [noise(0, 3200 + 300 * waver(turn, 2.3), 3200, 1.2, 0.05, 0.02, 0.11), noise(0.01, 900, 760, 0.8, 0.03, 0.02, 0.09)]
}

/** The tea in a carried cup: a small wave runs up the wall and falls back, as in a cup walked across a room. Heavier and lower with more tea; `amount` is 0 to 1. */
export function slosh(amount: number): VoiceSpec {
  const a = clamp(amount, 0, 1)
  const wall = 760 - 220 * a
  return [noise(0, wall * 0.7, wall * 1.25, 2, 0.04 + 0.07 * a, 0.03, 0.11), noise(0.13, wall * 1.15, wall * 0.6, 2, 0.03 + 0.05 * a, 0.03, 0.13), tone(0.04, wall * 0.42, wall * 0.5, 0.02 + 0.04 * a, 0.02, 0.08)]
}

/** A cup set down on its saucer: glaze on glaze, a bright clink far shorter than the ring of a tapped cup, and a smaller one as the cup rocks home. */
export const seatClink: VoiceSpec = [tone(0, 2350, 2350, 0.13, 0.002, 0.12), tone(0, 3900, 3900, 0.04, 0.002, 0.05), noise(0, 4800, 4800, 4, 0.05, 0.002, 0.015), tone(0.036, 2520, 2520, 0.05, 0.002, 0.06)]

/** A cup tipped into another cup, the bowl or the pot: three bubbles of air going back up into the cup and the splash under them, as a jug emptied in one go. More tea is lower, louder and longer; `amount` is 0 to 1. */
export function tipGlug(amount: number): VoiceSpec {
  const a = clamp(amount, 0, 1)
  const air = 215 - 70 * a
  return [...[0, 0.13, 0.25].map((at, i) => tone(at, air * (1 + 0.09 * i), air * 0.62, 0.1 + 0.1 * a - 0.02 * i, 0.012, 0.08 + 0.05 * a)), noise(0.03, 950, 520, 1.5, 0.04 + 0.05 * a, 0.02, 0.2 + 0.1 * a)]
}

/** A cup set upside down on a guest's head: the air shut inside it gives a hollow pop, like a cupped hand clapped on a knee. */
export const hatPlop: VoiceSpec = [tone(0, 430, 265, 0.2, 0.004, 0.1), noise(0, 540, 540, 9, 0.08, 0.004, 0.07), noise(0.004, 300, 300, 1, 0.05, 0.004, 0.05)]

/** A cup spun on its foot with the tea turning in it: the low hum of a top, one stretch of it for each turn of the rub. */
export function whirlHum(turn: number): VoiceSpec {
  const hum = 168 + 11 * waver(turn, 1.7)
  return [tone(0, hum, hum * 1.06, 0.09, 0.04, 0.17), tone(0.01, hum * 2, hum * 2.12, 0.03, 0.04, 0.13), noise(0.02, 720, 900, 3, 0.025, 0.05, 0.12)]
}

// ---- A saucer ----

/** The stream falling into the shallow pool of a bare saucer: rain on a plate, three flat ticks close together with no ring and no climb, lower and wider than the stream in a cup. */
export function poolPatter(turn: number): VoiceSpec {
  const plate = 760 + 60 * waver(turn, 3.7)
  return [noise(0, plate, plate, 1, 0.08, 0.003, 0.05), noise(0.03, 640, 640, 1, 0.06, 0.003, 0.05), noise(0.062, 700, 700, 1, 0.05, 0.003, 0.045)]
}

/** A saucer skimming over the cloth like a puck: a smooth glazed foot going fast, a narrow band that is nearly a whistle and sinks as the saucer slows. */
export function glassyWhirr(turn: number): VoiceSpec {
  const glass = 2300 + 170 * waver(turn, 2.9)
  return [noise(0, glass, glass * 0.86, 10, 0.07, 0.015, 0.13), noise(0, 4400, 4000, 6, 0.03, 0.015, 0.1)]
}

/** A saucer clapped onto the stack: two flat plates meeting, a clap with a short body, and the stack chattering twice after it. */
export const stackClap: VoiceSpec = [noise(0, 1500, 1500, 1, 0.16, 0.002, 0.045), tone(0, 620, 520, 0.1, 0.002, 0.06, 'triangle'), noise(0.05, 2900, 2900, 5, 0.05, 0.002, 0.03), noise(0.086, 3100, 3100, 5, 0.03, 0.002, 0.03)]

/** A cup hops onto the saucer pushed under it: two quick clinks, the far side of the foot and then the near side, the second a little higher. */
export const hopOn: VoiceSpec = [tone(0, 2100, 2100, 0.12, 0.002, 0.09), noise(0, 4500, 4500, 4, 0.04, 0.002, 0.015), tone(0.09, 2640, 2640, 0.1, 0.002, 0.1), noise(0.09, 4900, 4900, 4, 0.03, 0.002, 0.015)]

/** A saucer slides off a guest's head: glaze whistling down a slope, falling in pitch, then the saucer rattling to rest on the cloth with one soft thud under the first tick. */
export const hatSlide: VoiceSpec = [noise(0, 2600, 950, 12, 0.07, 0.02, 0.24), tone(0, 2400, 880, 0.04, 0.02, 0.22), tone(0.3, 190, 130, 0.1, 0.004, 0.07), ...[0.3, 0.37, 0.43, 0.48, 0.52].map((at, i) => noise(at, 2300 + 140 * i, 2300 + 140 * i, 6, 0.09 - 0.014 * i, 0.002, 0.03))]

/**
 * A saucer rubbed clean: a dry fingertip on clean glaze. It differs from the
 * sponge's `squeak` in voices.ts in four ways: it is about twice as high (it
 * starts between 2300 and 3100 Hz, the sponge's between 970 and 1330), a
 * pure sine and not a triangle, in two chirps of under 50 ms (up, then back down) where the
 * sponge's is one rise of 110 ms, and dry: no band of noise sinks under it,
 * only a tick of glaze at the start.
 */
export function cleanSqueak(turn: number): VoiceSpec {
  const pitch = 2700 + 260 * waver(turn, 2.6)
  return [tone(0, pitch, pitch * 1.18, 0.06, 0.008, 0.04), tone(0.052, pitch * 1.22, pitch * 1.04, 0.045, 0.006, 0.035), noise(0, 5200, 5200, 6, 0.02, 0.002, 0.02)]
}

// ---- A spoon ----

/** A spoon flipped end over end: the air it turns in, then a teaspoon dropped on a table, four thin high notes that come closer together and fade. */
export const spoonTinkle: VoiceSpec = [noise(0, 1800, 2600, 2, 0.03, 0.03, 0.1), ...[0.16, 0.25, 0.31, 0.35].map((at, i) => tone(at, [3300, 4100, 3700, 4500][i], [3300, 4100, 3700, 4500][i], 0.11 - 0.023 * i, 0.002, 0.12 - 0.02 * i)), noise(0.16, 5200, 5200, 5, 0.04, 0.002, 0.015)]

/** The stream hits the bowl of a spoon and fans out in a sheet: a tap run over the back of a spoon, a wide high hiss with the spoon singing faintly in it. */
export function sheetHiss(turn: number): VoiceSpec {
  return [noise(0, 4200 + 330 * waver(turn, 3.3), 4200, 0.8, 0.07, 0.012, 0.14), noise(0.01, 2900, 2900, 5, 0.03, 0.01, 0.1)]
}

/** A spoon dragged over the cloth: a thin metal edge catching on the weave, two short narrow grains at different pitches, far thinner than a cup's hiss. */
export function thinScrape(turn: number): VoiceSpec {
  const edge = 3700 + 260 * waver(turn, 3.7)
  return [noise(0, edge, edge * 0.94, 8, 0.05, 0.008, 0.07), noise(0.05, edge * 0.88, edge * 0.93, 8, 0.035, 0.008, 0.06)]
}

/** A spoon stirring: it tings the wall of the cup, a higher and shorter bell than the cup's own ring, over the tea going round. */
export function stirTing(turn: number): VoiceSpec {
  const ting = 1950 + 180 * waver(turn, 2.1)
  return [tone(0, ting, ting, 0.1, 0.002, 0.22), tone(0, ting * 2.4, ting * 2.4, 0.03, 0.002, 0.08), noise(0.01, 600, 860, 2, 0.035, 0.04, 0.12)]
}

/** A spoon laid on a saucer: the bowl of the spoon touches with a click, then the handle comes down with a smaller, lower one. */
export const restClick: VoiceSpec = [noise(0, 3600, 3600, 5, 0.1, 0.002, 0.02), tone(0, 2900, 2900, 0.06, 0.002, 0.05), noise(0.06, 3000, 3000, 5, 0.05, 0.002, 0.02), tone(0.06, 1700, 1700, 0.03, 0.002, 0.04)]

/** A spoon balanced on a nose: the soft boop of the nose, and one long clean ting with a second tone 40 Hz above it, so that it trembles as the spoon does. */
export const noseTing: VoiceSpec = [tone(0, 3520, 3520, 0.1, 0.002, 0.5), tone(0.004, 3560, 3560, 0.04, 0.002, 0.4), tone(0, 520, 610, 0.05, 0.01, 0.06)]

/** A spoon rattled on the spot: a spoon drummed on a laid table, three quick uneven taps of metal with the dull cloth under them. */
export function tableRattle(turn: number): VoiceSpec {
  const tap = 2800 + 240 * waver(turn, 4.1)
  return [
    noise(0, tap, tap, 5, 0.09, 0.002, 0.025),
    tone(0, 1500, 1500, 0.04, 0.002, 0.03, 'triangle'),
    noise(0.046, tap * 1.1, tap * 1.1, 5, 0.06, 0.002, 0.025),
    noise(0.084, tap * 0.93, tap * 0.93, 5, 0.075, 0.002, 0.025),
    tone(0.002, 240, 180, 0.05, 0.003, 0.05),
  ]
}

// ---- The pot ----

/** The lid hops and a puff of steam toots: the lid's tick, a toy whistle's short breathy note that rises a little as a kettle's does, and the lid landing. */
export const steamToot: VoiceSpec = [noise(0, 3300, 3300, 5, 0.07, 0.002, 0.025), tone(0.02, 780, 865, 0.11, 0.03, 0.2, 'triangle'), noise(0.02, 2400, 2700, 1, 0.05, 0.03, 0.2), noise(0.3, 3000, 3000, 5, 0.05, 0.002, 0.03)]

/** The tea inside the carried pot: the same wave as in a cup but shut in a belly, so it is lower and duller and the hollow answers after it. */
export function insideSlosh(turn: number): VoiceSpec {
  return [noise(0, 380 + 45 * waver(turn, 1.9), 260, 3, 0.08, 0.04, 0.16), tone(0.05, 150, 190, 0.07, 0.03, 0.12)]
}

/** A guest drinking from the spout: air going up a narrow spout in three quick bubbles, each rising, as when drinking from a bottle. */
export function spoutGurgle(turn: number): VoiceSpec {
  const air = 300 + 28 * waver(turn, 2.7)
  return [tone(0, air, air * 1.4, 0.09, 0.008, 0.05), tone(0.07, air * 1.2, air * 1.65, 0.08, 0.008, 0.05), tone(0.13, air * 0.93, air * 1.35, 0.07, 0.008, 0.06), noise(0, 1200, 1500, 2, 0.03, 0.02, 0.16)]
}

/** The pot drinks the bowl empty: a sink draining, four bubbles that sink in pitch and then the last suck, which rises. */
export const bowlGurgle: VoiceSpec = [...[0, 0.1, 0.19, 0.27].map((at, i) => tone(at, 260 - 20 * i, 180 - 13 * i, 0.12 - 0.01 * i, 0.01, 0.07)), tone(0.36, 180, 520, 0.09, 0.03, 0.13), noise(0.36, 600, 2400, 3, 0.06, 0.03, 0.13)]

/** The painted fish swims round the pot: seven bubbles let go under water, each a short blip that rises and each a little higher and quieter than the last. */
export const risingBubbles: VoiceSpec = [0, 1, 2, 3, 4, 5, 6].map((i) => tone(i * 0.085, 520 * 1.14 ** i, 520 * 1.14 ** i * 1.35, 0.1 - 0.008 * i, 0.006, 0.05))

// ---- The sponge ----

/** The sponge drinks the stream: a soft slurp, a band of noise drawn upward and cut short, as through a straw. */
export function slurp(turn: number): VoiceSpec {
  return [noise(0, 520 + 60 * waver(turn, 2.5), 1400, 3, 0.06, 0.05, 0.1), tone(0.01, 200, 265, 0.03, 0.04, 0.09)]
}

/** The full sponge leaks at its edges: two slow fat drops onto wet cloth, lower than a plip into tea and with a pat under each. */
export function slowDrip(turn: number): VoiceSpec {
  const drop = 480 + 45 * waver(turn, 3.5)
  return [tone(0, drop, drop * 1.5, 0.09, 0.006, 0.09), noise(0.008, 380, 380, 1.2, 0.04, 0.004, 0.06), tone(0.34, drop * 0.9, drop * 1.3, 0.06, 0.006, 0.09), noise(0.348, 360, 360, 1.2, 0.03, 0.004, 0.06)]
}

/** The sponge dragged over the cloth: a wet rag pulled across a table, a wide low shush that sinks, with none of the dry brush's top. */
export function wetShush(turn: number): VoiceSpec {
  return [noise(0, 1000 + 110 * waver(turn, 2.2), 750, 0.9, 0.07, 0.04, 0.16), noise(0.02, 320, 280, 1.5, 0.03, 0.04, 0.12)]
}

/** The sponge dabbed in a cup: a small suck, drawn up and cut off, and the little pop as it comes away from the tea. */
export const dabSuck: VoiceSpec = [noise(0, 700, 1900, 4, 0.08, 0.05, 0.05), tone(0.1, 520, 330, 0.05, 0.004, 0.04)]

/** The sponge squeezed over a cup: a thin thread of tea, a narrow band far quieter than the pot's stream, and one small drop in it. */
export function giveBack(turn: number): VoiceSpec {
  const thread = 1500 + 140 * waver(turn, 3.1)
  return [noise(0, thread, thread, 9, 0.045, 0.01, 0.1), tone(0.04, thread * 0.6, thread, 0.035, 0.004, 0.04)]
}

/** The sponge wipes a face: a wet cloth pressed and drawn off, the noise squeezed up and let down again. */
export const squidge: VoiceSpec = [noise(0, 600, 1300, 3, 0.1, 0.04, 0.08), tone(0.03, 330, 250, 0.05, 0.02, 0.1), noise(0.12, 1300, 500, 3, 0.08, 0.02, 0.12)]

// ---- The gate, and two cups together ----

/** A small bell at the garden gate: a brass hand bell swung once each way, two bright short notes a fourth apart, the second lower. */
export const gateBell: VoiceSpec = [
  tone(0, 2093, 2093, 0.14, 0.002, 0.3),
  tone(0, 5780, 5780, 0.04, 0.002, 0.1),
  noise(0, 4600, 4600, 4, 0.04, 0.002, 0.015),
  tone(0.2, 1568, 1568, 0.13, 0.002, 0.42),
  tone(0.2, 4330, 4330, 0.035, 0.002, 0.12),
]

/**
 * Two cups clinked together. Each rings at the pitch of how full it is, by
 * the law of `cupRing` in voices.ts for a house cup (a fuller cup lower),
 * so two cups filled alike clink in one note and two filled differently in
 * two. The second cup is touched 12 ms after the first and is 1.2 percent
 * sharp, as no two thrown cups are alike: filled alike, the pair shimmers
 * and cannot cancel. Levels are 0 to 1.
 */
export function cupsClink(levelA: number, levelB: number): VoiceSpec {
  const a = 1320 * (1 - 0.34 * clamp(levelA, 0, 1))
  const b = 1320 * 1.012 * (1 - 0.34 * clamp(levelB, 0, 1))
  return [
    tone(0, a, a, 0.14, 0.002, 0.6),
    tone(0.012, b, b, 0.14, 0.002, 0.6),
    tone(0, Math.min(a * 2.76, LIMITS.maxPitch - 200), Math.min(a * 2.76, LIMITS.maxPitch - 200), 0.04, 0.002, 0.2),
    tone(0.012, Math.min(b * 2.76, LIMITS.maxPitch - 200), Math.min(b * 2.76, LIMITS.maxPitch - 200), 0.04, 0.002, 0.2),
    noise(0, 4400, 4400, 3, 0.06, 0.002, 0.02),
  ]
}

// ---- The guests ----
//
// No guest says a word. Each kind has a voice of its own, and the kinds
// differ in rhythm, in how many notes they make and in which way a note
// bends, so they can be told apart with the pitch taken away:
// - the Bear is a large chest: 90 to 190 Hz, slow, one or two long notes. His
//   notes are triangles, because a small speaker gives little under 200 Hz
//   and a triangle's upper partials carry him;
// - the Mouse is tiny and quick: 1500 to 2800 Hz, notes of a few hundredths
//   of a second, often many;
// - the Hen clucks: 480 to 950 Hz, each cluck a puff of noise from the beak
//   and a sharp short bend of the note;
// - the Ducklings peep: 1000 to 1900 Hz, in twos.

export type VoiceKind = 'bear' | 'mouse' | 'hen' | 'duckling'

/** Both Ducklings peep alike. */
export function voiceKindOf(who: GuestId): VoiceKind {
  return who === 'bear' || who === 'mouse' || who === 'hen' ? who : 'duckling'
}

const BEAR = 'triangle'

/** One cluck of the Hen: the puff from the beak and a note that bends from one pitch to another in a few hundredths of a second. */
const cluck = (at: number, from: number, to: number, peak: number, decay = 0.05): Part[] => [noise(at, 1900, 1900, 2, peak * 0.5, 0.002, 0.02), tone(at + 0.005, from, to, peak, 0.004, decay, 'triangle')]

/** A poke. The Bear's belly hums, the Mouse squeaks, the Hen clucks, the Ducklings peep one after the other; each has two. */
export function pokeCall(kind: VoiceKind, variant: 0 | 1): VoiceSpec {
  const first = variant === 0
  return {
    // A hum behind closed lips, with its octave; or a slower "hm-hmm" that steps down.
    bear: first ? [tone(0, 115, 130, 0.2, 0.06, 0.42, BEAR), tone(0.02, 230, 260, 0.05, 0.06, 0.3)] : [tone(0, 140, 150, 0.18, 0.05, 0.2, BEAR), tone(0.3, 112, 100, 0.18, 0.05, 0.34, BEAR)],
    // One squeak flicked upward; or three in a hurry.
    mouse: first ? [tone(0, 2100, 2700, 0.1, 0.006, 0.06)] : [tone(0, 2500, 1900, 0.09, 0.005, 0.04), tone(0.06, 2000, 2600, 0.09, 0.005, 0.04), tone(0.12, 2300, 2800, 0.08, 0.005, 0.05)],
    // A cluck and its falling tail; or three clucks, the last one long.
    hen: first ? [...cluck(0, 560, 860, 0.14), tone(0.09, 800, 520, 0.09, 0.004, 0.07, 'triangle')] : [...cluck(0, 600, 780, 0.12, 0.04), ...cluck(0.1, 620, 800, 0.12, 0.04), ...cluck(0.2, 560, 940, 0.14, 0.11)],
    // Two peeps, one Duckling and then the other.
    duckling: first ? [tone(0, 1300, 1700, 0.11, 0.008, 0.07), tone(0.11, 1500, 1850, 0.1, 0.008, 0.07)] : [tone(0, 1750, 1400, 0.11, 0.008, 0.07), tone(0.12, 1250, 1650, 0.1, 0.008, 0.08)],
  }[kind]
}

/** The pot pours on a guest. */
export function streamCall(kind: VoiceKind): VoiceSpec {
  return {
    // Three slow gulps, each a note that drops as the throat closes.
    bear: [0, 0.22, 0.44].map((at, i) => tone(at, 158 - 8 * i, 100, 0.2, 0.012, 0.1, BEAR)),
    // A surprised trill: six notes hopping between two pitches and climbing.
    mouse: [0, 1, 2, 3, 4, 5].map((i) => tone(i * 0.045, (i % 2 ? 2500 : 2100) + 50 * i, (i % 2 ? 2500 : 2100) + 50 * i, 0.08, 0.004, 0.03)),
    // A flustered run of clucks that come faster and climb, ending in one that falls.
    hen: [...[0, 0.1, 0.19, 0.27].flatMap((at, i) => cluck(at, 580 + 50 * i, 780 + 50 * i, 0.12, 0.04)), ...cluck(0.34, 940, 560, 0.14, 0.14)],
    // A happy double peep, both rising, with the splash it stands in.
    duckling: [tone(0, 1200, 1800, 0.12, 0.008, 0.08), tone(0.14, 1300, 1900, 0.12, 0.008, 0.1), noise(0.04, 2600, 1800, 1.5, 0.03, 0.01, 0.08)],
  }[kind]
}

/** One step of a guest's walk to another seat; `turn` counts the steps. */
export function footstep(kind: VoiceKind, turn: number): VoiceSpec {
  return {
    // A heavy paw: a thud that drops, and the cloth under it.
    bear: [tone(0, 88 + 5 * waver(turn, 2.3), 62, 0.24, 0.005, 0.13, BEAR), noise(0, 240, 240, 0.9, 0.07, 0.005, 0.07)],
    // Claws on the table: a tick and a smaller one right behind it.
    mouse: [tone(0, 2500 + 130 * waver(turn, 3.9), 2500 + 130 * waver(turn, 3.9), 0.06, 0.002, 0.02), noise(0.03, 4500, 4500, 6, 0.03, 0.002, 0.015)],
    // A hen's foot raking the cloth: two scratches of noise that drop, and the toe tapping down.
    hen: [noise(0, 2200 + 150 * waver(turn, 3.1), 1300, 3, 0.08, 0.004, 0.06), tone(0, 620, 500, 0.04, 0.003, 0.03, 'triangle'), noise(0.07, 2600, 1500, 3, 0.05, 0.004, 0.05)],
    // A wet webbed foot: a flat slap and the small wet sound as it lifts.
    duckling: [noise(0, 900 + 70 * waver(turn, 2.7), 900, 1.2, 0.12, 0.003, 0.04), tone(0, 330, 240, 0.08, 0.003, 0.05), noise(0.05, 1600, 1600, 2, 0.03, 0.004, 0.03)],
  }[kind]
}

/** Two guests swap seats and squeeze past each other. */
export function squeezePast(kind: VoiceKind): VoiceSpec {
  return {
    // "Oof": one grunt that sinks, and the breath that goes with it.
    bear: [tone(0, 150, 105, 0.2, 0.02, 0.22, BEAR), noise(0.02, 400, 300, 1, 0.04, 0.03, 0.15)],
    // "Eep": a squeak shot upward and its short fall.
    mouse: [tone(0, 1900, 2700, 0.1, 0.005, 0.05), tone(0.07, 2700, 2300, 0.07, 0.005, 0.06)],
    // A cluck that goes up as she is jostled and one that settles.
    hen: [...cluck(0, 520, 900, 0.13), ...cluck(0.13, 760, 560, 0.1, 0.07)],
    // Two peeps: one pressed downward, and one that springs up when it is through.
    duckling: [tone(0, 1600, 1250, 0.1, 0.008, 0.06), tone(0.1, 1300, 1800, 0.11, 0.008, 0.08)],
  }[kind]
}

/** A tickle: each guest's giggle; `turn` counts the rubs. */
export function giggle(kind: VoiceKind, turn: number): VoiceSpec {
  const lift = waver(turn, 2.9)
  return {
    // "Ho, ho, ho": three slow notes that each fall.
    bear: [0, 0.2, 0.4].map((at, i) => tone(at, 160 + 9 * lift - 10 * i, 118 - 6 * i, 0.19, 0.02, 0.12, BEAR)),
    // A titter: six tiny chirps upward, hopping between two pitches.
    mouse: [0, 1, 2, 3, 4, 5].map((i) => tone(i * 0.05, (i % 2 ? 2450 : 2150) + 60 * lift, (i % 2 ? 2700 : 2400) + 60 * lift, 0.08, 0.004, 0.03)),
    // One puff, then four clucks tumbling out faster and higher.
    hen: [noise(0, 1900 + 120 * lift, 1900 + 120 * lift, 2, 0.06, 0.002, 0.02), ...[0.005, 0.085, 0.155, 0.215].map((at, i) => tone(at, 600 + 25 * lift + 50 * i, 760 + 25 * lift + 50 * i, 0.12, 0.004, 0.04, 'triangle'))],
    // Two pairs of peeps, each pair low then high.
    duckling: [0, 0.07, 0.2, 0.27].map((at, i) => tone(at, (i % 2 ? 1600 : 1300) + 50 * lift, (i % 2 ? 1800 : 1500) + 50 * lift, 0.1, 0.006, 0.045)),
  }[kind]
}

/** A guest drinks a cup that is to its taste: a slurp, and a pleased sound of its own. */
export function sipCall(kind: VoiceKind): VoiceSpec {
  return {
    // One long slurp and a long "mmm" that lifts a little.
    bear: [noise(0, 400, 900, 3, 0.07, 0.08, 0.2), tone(0.36, 120, 134, 0.18, 0.08, 0.5, BEAR)],
    // A sip no longer than a blink and two tiny squeaks.
    mouse: [noise(0, 1800, 3200, 4, 0.05, 0.03, 0.05), tone(0.12, 2200, 2600, 0.08, 0.006, 0.05), tone(0.2, 2400, 2800, 0.08, 0.006, 0.06)],
    // She dips her beak twice, tips her head back, and coos twice, falling.
    hen: [noise(0, 900, 1600, 3, 0.06, 0.04, 0.07), noise(0.15, 950, 1700, 3, 0.06, 0.04, 0.07), tone(0.32, 720, 560, 0.1, 0.02, 0.1, 'triangle'), tone(0.47, 640, 520, 0.08, 0.02, 0.14, 'triangle')],
    // Three quick dabbles of the bill and a double peep.
    duckling: [...[0, 0.07, 0.14].map((at) => noise(at, 1300, 2100, 3, 0.05, 0.01, 0.035)), tone(0.26, 1250, 1700, 0.11, 0.008, 0.07), tone(0.37, 1400, 1850, 0.11, 0.008, 0.09)],
  }[kind]
}

/** Too little tea: a small question with a rising end. Bewildered, never cross. */
export function shortCall(kind: VoiceKind): VoiceSpec {
  return {
    // "Hm... hm?": a flat hum, then one that climbs slowly.
    bear: [tone(0, 108, 108, 0.15, 0.05, 0.16, BEAR), tone(0.28, 112, 185, 0.16, 0.06, 0.3, BEAR)],
    // One small "eep?" that only goes up.
    mouse: [tone(0, 1700, 2600, 0.08, 0.01, 0.09)],
    // A low cluck and then one that bends far up.
    hen: [...cluck(0, 500, 560, 0.1, 0.04), tone(0.1, 560, 940, 0.11, 0.004, 0.09, 'triangle')],
    // Two peeps: one level and low, one sliding up.
    duckling: [tone(0, 1150, 1150, 0.09, 0.008, 0.07), tone(0.13, 1200, 1850, 0.1, 0.008, 0.12)],
  }[kind]
}

/** Too much tea: the Mouse sneezes, the Hen blows bubbles, the Bear and the Duckling say a surprised "oh". */
export function overCall(kind: VoiceKind): VoiceSpec {
  return {
    // "Oh": a quick step up and a long slide down.
    bear: [tone(0, 140, 185, 0.18, 0.03, 0.07, BEAR), tone(0.1, 185, 105, 0.2, 0.02, 0.4, BEAR)],
    // Tea on her whiskers: two breaths in, each higher, and the sneeze, a burst of noise that drops with a squeak in it.
    mouse: [tone(0, 1800, 2100, 0.05, 0.02, 0.06), tone(0.12, 2000, 2500, 0.07, 0.02, 0.08), noise(0.3, 4200, 2200, 1.2, 0.16, 0.004, 0.09), tone(0.3, 2800, 1600, 0.08, 0.004, 0.06)],
    // Her beak is in too deep: six bubbles at uneven moments over the fizz of them.
    hen: [noise(0, 700, 900, 2, 0.05, 0.02, 0.34), ...[0.005, 0.06, 0.13, 0.18, 0.26, 0.31].map((at, i) => tone(at, [560, 700, 520, 820, 640, 880][i], [560, 700, 520, 820, 640, 880][i] * 1.08, 0.1, 0.004, 0.035))],
    // "Oh" in a peep: a short high note, a long lower one that falls, and a small one after.
    duckling: [tone(0, 1800, 1750, 0.11, 0.006, 0.05), tone(0.09, 1400, 1050, 0.11, 0.008, 0.18), tone(0.32, 1300, 1500, 0.06, 0.008, 0.06)],
  }[kind]
}

/** A guest waits, looking from its cup to what is missing: a soft "hm, hm", the second higher. */
export function waitCall(kind: VoiceKind): VoiceSpec {
  return {
    // Two level hums, far apart.
    bear: [tone(0, 122, 122, 0.12, 0.05, 0.25, BEAR), tone(0.42, 152, 152, 0.12, 0.05, 0.3, BEAR)],
    // Two notes close together, the second tipping up.
    mouse: [tone(0, 2000, 2000, 0.05, 0.008, 0.05), tone(0.09, 2300, 2450, 0.05, 0.008, 0.06)],
    // A soft cluck up, and a longer note that sinks back.
    hen: [...cluck(0, 620, 700, 0.07, 0.06), tone(0.16, 760, 700, 0.06, 0.006, 0.1, 'triangle')],
    // Two peeps, both sliding up.
    duckling: [tone(0, 1200, 1350, 0.06, 0.01, 0.08), tone(0.18, 1450, 1700, 0.06, 0.01, 0.1)],
  }[kind]
}

/** A tile of the wall is touched: a small glazed ring, at a pitch of its own for each picture, with the tick of the finger on it. */
export function tileRing(picture: number): VoiceSpec {
  const pitch = [1320, 990, 1480, 880, 1175][((Math.round(picture) % 5) + 5) % 5]
  return [tone(0.004, pitch, pitch * 0.995, 0.11, 0.003, 0.28), tone(0.004, pitch * 2.76, pitch * 2.74, 0.03, 0.003, 0.12), noise(0, 3200, 3200, 3, 0.05, 0.002, 0.02)]
}

/** A guest's own small joke, done by itself at a quiet table: the Bear's belly rumbles, the Mouse hiccups, the Hen nods off and starts awake, a Duckling yawns. */
export function jokeCall(kind: VoiceKind): VoiceSpec {
  return {
    // A long low rumble with a growl in it, and a small "hm?" after.
    bear: [tone(0.02, 100, 92, 0.13, 0.08, 0.5, BEAR), noise(0.04, 220, 160, 1.2, 0.06, 0.08, 0.5), tone(0.78, 150, 200, 0.1, 0.03, 0.14, BEAR)],
    // "Hic", and "hic" again a little higher: each a squeak that leaps up and is gone.
    mouse: [tone(0.02, 1500, 2900, 0.08, 0.004, 0.05), tone(0.74, 1650, 3100, 0.08, 0.004, 0.05)],
    // A coo that sinks as she nods off, and the cluck she starts awake with.
    hen: [tone(0.02, 520, 400, 0.05, 0.1, 0.9, 'triangle'), ...cluck(1.4, 760, 1000, 0.1, 0.05)],
    // A yawn in a peep: a slow rise, a long fall, and a small pip as it lands on its tail.
    duckling: [tone(0.02, 1100, 1700, 0.07, 0.12, 0.25), tone(0.4, 1700, 1000, 0.06, 0.02, 0.3), tone(1.2, 1500, 1600, 0.05, 0.006, 0.05)],
  }[kind]
}

/** The sitting is over and the guest is content. */
export function settleCall(kind: VoiceKind): VoiceSpec {
  return {
    // A long low sigh with the breath in it, and a last small hum.
    bear: [tone(0, 160, 95, 0.16, 0.12, 0.8, BEAR), noise(0.05, 500, 250, 0.8, 0.05, 0.15, 0.7), tone(0.98, 100, 92, 0.06, 0.06, 0.3, BEAR)],
    // Two tiny squeaks, each settling downward.
    mouse: [tone(0, 2300, 2000, 0.05, 0.008, 0.06), tone(0.16, 2100, 1800, 0.04, 0.008, 0.08)],
    // A soft coo in three falling steps, as a hen going to roost, with the faintest puff to start it.
    hen: [noise(0, 1500, 1500, 2, 0.03, 0.01, 0.03), tone(0.01, 820, 640, 0.09, 0.03, 0.22), tone(0.3, 700, 560, 0.07, 0.03, 0.2), tone(0.55, 600, 490, 0.05, 0.03, 0.3)],
    // A sleepy peep: a slow rise and a long fall.
    duckling: [tone(0, 1250, 1500, 0.07, 0.03, 0.2), tone(0.3, 1400, 1050, 0.06, 0.03, 0.4)],
  }[kind]
}

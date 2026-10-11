import type { Note } from './audio'
import { GRID, SOAKED, type AnswerId, type BitKind, type CellId } from './cells'
import type { ThingId } from './layout'
import { ANIMALS, type AnimalId } from './state'
import { BEAKS_AFTER, BUBBLES, CROW, DOOR_SLIDE_S, DRUM, GLUGS, GRAIN, HEN_SNORE, IDLE_BUBBLE_S, PECKS, PECK_BEAT, POP, STRUT, USES, pecksIn } from './timeline'

// Every sound of the game as plain numbers: lists of notes that audio.ts
// turns into a voice. Nobody could listen while these were written, so they
// are kept short and quiet, a test holds every pitch, peak and length in
// range, and each is written from the words of the design sheet's grid.
// One touch is one voice: everything a touch sets off is joined into one
// list, each part with its own delay.
//
// Every note says who makes it: the thing as it leaps or while it is at the
// animal, a kind of loose bit in the air, the animal's own body, a door, a
// hen. Its time comes from the answer's or the scene's one clock
// (timeline.ts), and `sync.test.ts` fails when a note would sound while its
// maker is not drawn doing it. A sound that depends on something that takes
// as long as it takes (a hen arriving, a door that waited) is a sound of its
// own, sent by the model at the moment it happens.

type N = Note

const tone = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, delay = 0, wave: OscillatorType = 'sine'): N => ({ kind: 'tone', frequency, glideTo, wave, peak, attack, decay, delay })
const hiss = (frequency: number, glideTo: number | undefined, q: number, peak: number, attack: number, decay: number, delay = 0): N => ({ kind: 'noise', frequency, glideTo, q, peak, attack, decay, delay })
const later = (notes: readonly N[], by: number): N[] => notes.map((note) => ({ ...note, delay: (note.delay ?? 0) + by }))
/** The same few notes again and again, each time `step` later and `drift` times the pitch. */
const run = (notes: readonly N[], times: number, step: number, drift = 1): N[] => Array.from({ length: times }, (_, i) => later(notes.map((note) => ({ ...note, frequency: note.frequency * drift ** i, glideTo: note.glideTo ? note.glideTo * drift ** i : undefined })), i * step)).flat()

// --- Building blocks, each one animal's or one material's own ----------------

/** A thing leaps across the page. */
const leap: N[] = [hiss(900, 2600, 1.2, 0.05, 0.02, 0.13)]
/** Grain on a hard place: a run of dry ticks. */
const patter = (times: number, pitch: number, delay = 0.2): N[] => later(run([hiss(pitch, undefined, 5, 0.09, 0.002, 0.03)], times, 0.045, 1.03), delay)
const splash = (delay = 0.2, peak = 0.26): N[] => later([hiss(1500, 420, 0.7, peak, 0.01, 0.34), tone(320, 150, 0.1, 0.005, 0.16)], delay)
const flump = (delay = 0.2): N[] => later([hiss(520, 260, 0.8, 0.2, 0.02, 0.2), hiss(2600, 1800, 2, 0.05, 0.03, 0.22)], delay)
const peck = (delay: number, pitch = 980): N => tone(pitch, pitch * 0.55, 0.14, 0.002, 0.045, delay, 'triangle')
const cluck = (delay: number, pitch = 520): N[] => [tone(pitch, pitch * 1.5, 0.12, 0.01, 0.07, delay, 'triangle')]
const squawk = (delay: number, pitch = 700): N[] => [tone(pitch, pitch * 1.9, 0.16, 0.012, 0.16, delay, 'sawtooth'), tone(pitch * 1.9, pitch * 1.2, 0.1, 0.01, 0.12, delay + 0.17, 'sawtooth')]
const peep = (delay: number, pitch = 1700): N => tone(pitch, pitch * 1.3, 0.09, 0.005, 0.06, delay)
/** Loose lips: a low buzz chopped into flaps. */
const flubber = (delay: number, flaps: number, pitch = 92): N[] => later(run([tone(pitch, pitch * 0.8, 0.16, 0.004, 0.035, 0, 'sawtooth'), hiss(260, undefined, 1.5, 0.07, 0.004, 0.03)], flaps, 0.052), delay)
const crunch = (delay: number, pitch = 2400): N[] => [hiss(pitch, pitch * 0.6, 1.4, 0.13, 0.004, 0.09, delay)]
const whinny = (delay: number, from = 1150): N[] => later(run([tone(from, from * 0.86, 0.12, 0.008, 0.07, 0, 'sawtooth')], 7, 0.075, 0.92), delay)
const nicker = (delay: number): N[] => later(run([tone(118, 104, 0.15, 0.01, 0.07, 0, 'triangle')], 6, 0.085, 0.985), delay)
/** A bleat is one flat reedy note with a shake in it. */
const bleat = (delay: number, pitch = 430, shakes = 4): N[] => later(run([tone(pitch, pitch * 0.96, 0.13, 0.006, 0.06, 0, 'sawtooth')], shakes, 0.07), delay)
const oink = (delay: number, pitch = 190): N[] => [tone(pitch, pitch * 0.62, 0.17, 0.01, 0.11, delay, 'sawtooth'), hiss(420, 300, 3, 0.08, 0.01, 0.1, delay)]
const glop = (delay: number, pitch = 240): N => tone(pitch, pitch * 2.4, 0.13, 0.004, 0.06, delay)

// --- Who makes a note --------------------------------------------------------------

/**
 * The maker of a note, which must be drawn doing it when the note sounds:
 * - `leap`, `thing`, `back`: the thing in the hand as it leaps across, while it is at the animal, and on its way back;
 * - `bits-…`: loose bits of that kind in the air;
 * - `body`: the answering animal's own body (any hen, for the hens); `lead` and `others`: the touched hen, and the other two;
 * - `touch`: the finger itself, for a sound that is over within the touch;
 * - the rest name one moving thing of a scene or a chain.
 */
export type Who =
  | 'leap' | 'thing' | 'back' | `bits-${BitKind}` | 'body' | 'lead' | 'others' | 'touch'
  | 'door' | 'door-shakes' | 'hens-move' | 'trip' | 'shake' | 'beaks' | 'sun-dips' | 'crow' | 'cat-stretch' | 'mew' | 'croon'
  | `peck-${0 | 1 | 2}` | `run-${0 | 1 | 2}` | `bumped-${0 | 1 | 2}` | `asleep-${AnimalId}` | `yawn-${Exclude<AnimalId, 'hens'>}` | `settled-${AnimalId}`

export type Segment = { who: Who; notes: readonly N[] }
const by = (who: Who, ...notes: (N | readonly N[])[]): Segment => ({ who, notes: notes.flat() })

/** The leap of the thing, which opens every use. */
const leaps = by('leap', leap)
const strokes = (cell: 'brush-hens' | 'brush-pony'): readonly number[] => USES[cell].strokes!.at

// --- The grid: one voice for each cell ------------------------------------------

const CELL_SEGMENTS: Record<AnswerId, Segment[]> = {
  // Rain on a tin roof, for as long as the grain lands. Each hen's pecks are her own sound, sent when she is there (`peck-…`).
  'scoop-hens': [leaps, by('bits-grain', patter(16, 4200, GRAIN.lands))],
  // A wet flubber of the lip on the scoop, two crunches, a breath in, and a sneeze that blasts it out.
  'scoop-pony': [leaps, by('bits-grain', patter(5, 3400)), by('thing', flubber(0.45, 9)), by('body', crunch(1.1), crunch(1.35, 2000), tone(520, 900, 0.08, 0.25, 0.05, 1.5)), by('bits-grain', hiss(2600, 700, 0.6, 0.3, 0.01, 0.32, 1.9))],
  // One gritty mouthful, teeth on tin, and the scoop pings away.
  'scoop-goat': [leaps, by('bits-grain', patter(5, 3000)), by('body', run(crunch(0.5, 1700), 4, 0.13)), by('thing', tone(1480, 1460, 0.2, 0.002, 0.2, USES['scoop-goat'].leaves - 0.02, 'triangle'), tone(2960, undefined, 0.07, 0.002, 0.12, USES['scoop-goat'].leaves - 0.02)), by('back', tone(2300, 3400, 0.12, 0.004, 0.16, USES['scoop-goat'].leaves + 0.06))],
  // Grain into the mud, snuffling through it, and a row of bubbles that each glop as they burst.
  'scoop-pig': [leaps, by('bits-grain', patter(5, 1600)), by('body', later(run([hiss(340, 520, 3.5, 0.13, 0.03, 0.09)], 5, 0.16), 0.5), oink(2.7, 150)), by('bits-bubble', BUBBLES.blown.map((at, i) => glop(at + BUBBLES.lasts, [240, 300, 210, 330, 260, 380][i])))],

  // A splash, a scatter of squawks, a rattle of feathers, three small sneezes.
  'bucket-hens': [leaps, by('bits-drop', splash()), by('body', squawk(0.4, 760), squawk(0.56, 640), squawk(0.7, 980), later(run([hiss(3200, undefined, 2.5, 0.07, 0.003, 0.025)], 14, 0.04), 1.45), peep(2.5), peep(2.72, 1500), peep(2.95, 2100))],
  // A slosh, a long flapping shudder, the spray hissing across, and a whinny. The goat's cross bleat is the goat's own sound, sent when the spray reaches it.
  'bucket-pony': [leaps, by('bits-drop', splash(0.2, 0.3), hiss(4200, 2600, 0.8, 0.14, 0.05, 0.5, 1.0)), by('body', flubber(0.95, 12, 70), whinny(2.6, 1300))],
  // Glug after glug with the bucket at its mouth, each lower, a slosh in a round belly, and a hiccup with a little fountain.
  'bucket-goat': [leaps, by('thing', later(run([tone(330, 190, 0.2, 0.01, 0.1)], GLUGS.count, GLUGS.every, 0.9), GLUGS.from)), by('body', hiss(600, 380, 1.2, 0.1, 0.08, 0.3, 2.05), hiss(520, 700, 1.2, 0.08, 0.08, 0.25, 2.4), tone(480, 1050, 0.2, 0.004, 0.07, 2.95)), by('bits-drop', hiss(2400, 3400, 1.5, 0.08, 0.01, 0.3, 3.0))],
  // A gurgle into the wallow, a great splat, and grunts that go lower and lower.
  'bucket-pig': [leaps, by('thing', hiss(700, 1300, 2.2, 0.16, 0.05, 0.6, 0.2)), by('bits-drop', run([glop(0.3, 420)], 4, 0.12)), by('bits-mud', hiss(300, 110, 0.6, 0.4, 0.008, 0.4, 1.0), tone(110, 55, 0.24, 0.006, 0.26, 1.0)), by('body', oink(1.6, 210), oink(2.0, 180), oink(2.45, 150), oink(2.95, 122))],

  // A bristly scritch at each stroke, one squawk, then a cluck to each step of her strut.
  'brush-hens': [leaps, by('thing', strokes('brush-hens').map((at) => hiss(3600, 2400, 3, 0.11, 0.01, 0.07, at))), by('lead', squawk(0.85, 620), Array.from({ length: STRUT.steps }, (_, i) => cluck(STRUT.off + i * STRUT.every, i % 2 ? 600 : 560)).flat())],
  // Long soft strokes, a puff of dust at each, and a low rumbling nicker.
  'brush-pony': [leaps, by('thing', strokes('brush-pony').map((at) => hiss(1900, 950, 1, 0.13, 0.1, 0.3, at))), by('bits-dust', strokes('brush-pony').map((at) => hiss(500, undefined, 0.5, 0.05, 0.02, 0.18, at + 0.3))), by('body', nicker(1.1), nicker(2.5), flubber(3.05, 4, 80))],
  // A crackle through the coat, one zap off a horn, and a yelp.
  'brush-goat': [leaps, by('thing', [0.3, 0.42, 0.5, 0.71, 0.8, 0.95, 1.12, 1.2, 1.41, 1.5, 1.68, 1.76].map((at, i) => hiss(5200 + (i % 3) * 700, undefined, 6, 0.08, 0.001, 0.018, at))), by('bits-spark', hiss(4200, 900, 7, 0.24, 0.002, 0.11, 1.95), tone(1500, 380, 0.12, 0.002, 0.09, 1.95, 'square')), by('body', tone(560, 940, 0.16, 0.008, 0.14, 2.08, 'sawtooth'))],
  // Squeals in rising giggles under the brush, a squelch as it rolls, and a sigh.
  'brush-pig': [leaps, by('thing', later(run([tone(820, 1250, 0.13, 0.008, 0.07, 0, 'triangle')], 9, 0.13, 1.06), 0.3)), by('bits-mud', hiss(380, 190, 1.2, 0.24, 0.03, 0.3, 1.5)), by('body', hiss(900, 500, 0.6, 0.09, 0.3, 0.7, 2.6), tone(250, 150, 0.07, 0.3, 0.6, 2.6))],

  // A flump, clucks muffled inside the hay, a bonk, and a pop as her head comes out.
  'fork-hens': [leaps, by('bits-straw', flump()), by('lead', [0.8, 1.15, 1.5, 1.85].map((at) => tone(300, 380, 0.14, 0.012, 0.08, at)), cluck(2.75, 300), cluck(3.05, 300), tone(420, 1500, 0.2, 0.004, 0.07, 3.4), cluck(3.6, 640))],
  // A flump on the head, a proud whinny, and slow chomps.
  'fork-pony': [leaps, by('bits-straw', flump()), by('body', whinny(0.75, 1250), [2.0, 2.45, 2.9, 3.35].flatMap((at) => [...crunch(at, 1300), tone(140, 110, 0.08, 0.01, 0.1, at)]))],
  // A rustle into the rack, a boing, and a jaw that crunches round and round.
  'fork-goat': [leaps, by('bits-straw', hiss(2800, 1900, 1.6, 0.14, 0.04, 0.3, 0.2)), by('body', tone(170, 560, 0.2, 0.01, 0.24, 0.5), bleat(0.85, 500, 3), [1.4, 1.72, 2.04, 2.36, 2.68].flatMap((at, i) => crunch(at, i % 2 ? 2100 : 1700)), bleat(3.0, 360, 5))],
  // A flump, a squelch as it turns to look, three sniffs, and a sneeze that fires the straw off.
  'fork-pig': [leaps, by('bits-straw', flump()), by('body', hiss(360, 220, 1.4, 0.16, 0.04, 0.25, 0.9), [1.9, 2.2, 2.5].map((at, i) => hiss(1500 + i * 300, 2300 + i * 300, 3, 0.09, 0.05, 0.05, at)), hiss(1800, 500, 0.5, 0.34, 0.006, 0.3, 3.0), oink(3.02, 260)), by('bits-straw', hiss(3000, 5200, 1, 0.1, 0.02, 0.4, 3.05))],

  // The bare finger: each animal's own small answer.
  'finger-hens': [by('lead', squawk(0, 840)), by('others', cluck(0.45, 500), cluck(0.7, 580))],
  'finger-pony': [by('body', hiss(700, 300, 0.8, 0.2, 0.01, 0.2), flubber(0.22, 8, 100))],
  'finger-goat': [by('body', bleat(0, 470, 4), tone(210, 150, 0.14, 0.004, 0.08, 0.34, 'triangle'))],
  'finger-pig': [by('body', oink(0, 200), oink(0.2, 230)), by('bits-bubble', glop(POP.blown + POP.lasts, 280))],

  // The pony's spray lands on the goat: a spatter, and one cross bleat.
  [SOAKED]: [by('body', hiss(1800, 900, 0.8, 0.1, 0.01, 0.18), bleat(0.85, 392, 6))],
}

// --- Everything else a touch can set off -------------------------------------------

type HenId = 'white' | 'russet' | 'bantam'
type Big = Exclude<AnimalId, 'hens'>

export type SoundId =
  | AnswerId
  | `lift-${ThingId}`
  | 'lay' | 'clink' | 'drift'
  | 'door-open' | 'hens-in' | 'door-slide' | 'door-clunk' | 'rattle'
  | `run-${HenId}` | `bonk-${HenId}` | 'hens-drum' | `tok-${HenId}` | `peck-${HenId}`
  | 'knock' | 'sun' | 'cloud' | 'mew' | 'cat-stretch'
  | 'trip' | 'shake' | 'beaks'
  | `snore-${AnimalId}` | `yawn-${Big}` | `settled-${AnimalId}`
  | 'nightfall' | 'crow' | 'croon' | 'bubble'

const PECK_PITCH = [860, 980, 1180] as const
/** A hen's pecks over a stretch of pecking: one tok as her head comes down, half way through each beat of her own. */
const bonk = (hen: 0 | 1 | 2, pitch: number): Segment => by(`bumped-${hen}`, tone(180, 120, 0.22, 0.003, 0.09, 0, 'triangle'), squawk(0.07, pitch))
const toks = (hen: 0 | 1 | 2, seconds: number): Segment => by(`peck-${hen}`, Array.from({ length: pecksIn(seconds, hen) }, (_, n) => peck(PECK_BEAT[hen] * (n + 0.5), PECK_PITCH[hen])))

export const SEGMENTS: Record<SoundId, readonly Segment[]> = {
  ...CELL_SEGMENTS,
  // The scoop digs into the sack with a crunch.
  'lift-scoop': [by('touch', hiss(2600, 1500, 1.2, 0.17, 0.01, 0.12), hiss(3400, 2600, 2, 0.08, 0.02, 0.1, 0.11), tone(880, 1320, 0.06, 0.004, 0.09, 0.14, 'triangle'))],
  // The pump squeaks twice and gushes into the bucket.
  'lift-bucket': [by('touch', tone(1250, 1600, 0.09, 0.03, 0.07), tone(1500, 1150, 0.08, 0.03, 0.07, 0.13), hiss(900, 520, 0.9, 0.2, 0.03, 0.3, 0.2), tone(260, 420, 0.1, 0.05, 0.2, 0.24))],
  // The brush thrums.
  'lift-brush': [by('touch', run([hiss(2900, undefined, 4, 0.1, 0.002, 0.02)], 9, 0.022, 1.02))],
  // The fork twangs out of the heap.
  'lift-fork': [by('touch', tone(196, 185, 0.2, 0.003, 0.4, 0, 'sawtooth'), tone(392, 388, 0.09, 0.003, 0.3), hiss(2400, 1600, 1.6, 0.08, 0.02, 0.16))],
  // A thing laid down, a thing that stays up, and a thing that drifts back over its place.
  lay: [by('touch', tone(300, 190, 0.14, 0.002, 0.06, 0, 'triangle'), hiss(1500, undefined, 2, 0.08, 0.002, 0.035))],
  clink: [by('touch', tone(1900, 1880, 0.1, 0.002, 0.1), tone(2850, undefined, 0.04, 0.002, 0.07))],
  drift: [by('touch', hiss(1400, 700, 1.2, 0.05, 0.05, 0.16))],
  // The door rumbles along its rail and lands with a knock, and the hens tumble out in a squabble.
  'door-open': [by('door', hiss(150, 110, 1.4, 0.3, 0.04, 0.4), tone(74, 66, 0.16, 0.02, 0.36, 0, 'triangle'), tone(128, 90, 0.2, 0.003, 0.09, DOOR_SLIDE_S - 0.02, 'triangle')), by('hens-move', cluck(0.4, 760), squawk(0.7, 600), cluck(0.86, 520), cluck(1.0, 700), cluck(1.25, 430))],
  // The hens hurry in ahead of the door.
  'hens-in': [by('hens-move', cluck(0, 700), cluck(0.14, 560), cluck(0.3, 760))],
  // The shutting door rumbles along its rail from the moment it moves, and clunks the moment it is shut.
  'door-slide': [by('door', hiss(150, 120, 1.4, 0.28, 0.04, 0.38), tone(70, 78, 0.16, 0.02, 0.34, 0, 'triangle'))],
  'door-clunk': [by('door', tone(104, 60, 0.3, 0.003, 0.14, 0, 'triangle'), hiss(900, undefined, 1.5, 0.1, 0.002, 0.05))],
  // A door that is still sliding.
  rattle: [by('touch', run([tone(150, 120, 0.12, 0.002, 0.03, 0, 'triangle'), hiss(1100, undefined, 2, 0.06, 0.002, 0.025)], 4, 0.05))],
  // A hen sets off for spilled grain with two quick clucks of her own, sent as she starts to run (farm.ts).
  'run-white': [by('run-0', cluck(0, 540), cluck(0.12, 620))], 'run-russet': [by('run-1', cluck(0, 620), cluck(0.12, 700))], 'run-bantam': [by('run-2', cluck(0, 760), cluck(0.12, 860))],
  // Each hen's pecks, a quick tok-tok at her own speed and pitch, sent when she gets there: at what fell by another animal, and at the trough.
  'tok-white': [toks(0, PECKS.visit)], 'tok-russet': [toks(1, PECKS.visit)], 'tok-bantam': [toks(2, PECKS.visit)],
  'peck-white': [toks(0, PECKS.trough)], 'peck-russet': [toks(1, PECKS.trough)], 'peck-bantam': [toks(2, PECKS.trough)],
  // The haystack walks into a hen: a bonk, and her squawk as she jumps, sent in the step she is walked into (farm.ts).
  'bonk-white': [bonk(0, 620)], 'bonk-russet': [bonk(1, 700)], 'bonk-bantam': [bonk(2, 820)],
  // Shut in, they drum on the door, which shakes for as long as they drum.
  'hens-drum': [by('door-shakes', later(run([tone(210, 150, 0.15, 0.002, 0.04, 0, 'triangle')], DRUM.knocks, DRUM.every, 1.02), DRUM.from + 0.02))],
  // A knock on the bare page.
  knock: [by('touch', tone(150, 84, 0.2, 0.003, 0.11), hiss(320, undefined, 1.2, 0.08, 0.003, 0.06))],
  sun: [by('touch', tone(1320, undefined, 0.09, 0.004, 0.5), tone(1760, undefined, 0.07, 0.004, 0.42, 0.07), tone(2640, undefined, 0.04, 0.004, 0.36, 0.14))],
  cloud: [by('touch', hiss(520, 380, 0.5, 0.1, 0.06, 0.24))],
  // The hatch is up and the cat looks out.
  mew: [by('mew', tone(640, 1010, 0.1, 0.03, 0.14, 0.3, 'triangle'), tone(1010, 720, 0.09, 0.02, 0.24, 0.47, 'triangle'))],
  // The cat out on the roof: a long stretch of a mew that slides up and down.
  'cat-stretch': [by('cat-stretch', tone(520, 880, 0.09, 0.05, 0.3, 0, 'triangle'), tone(880, 600, 0.08, 0.04, 0.4, 0.34, 'triangle'), tone(190, 170, 0.05, 0.05, 0.5, 0.2))],
  // The russet hen trips over the sill, and the white hen shakes herself.
  trip: [by('trip', tone(260, 150, 0.14, 0.002, 0.05, 0, 'triangle'), squawk(0.05, 880))],
  shake: [by('shake', run([hiss(3000, undefined, 2.5, 0.06, 0.003, 0.025)], 9, 0.045))],
  // Beaks come to the holes in the door.
  beaks: [by('beaks', later([peck(0, 860), peck(0.16, 1040), peck(0.3, 1240)], BEAKS_AFTER))],
  // The night: each sleeper has its own snore, in and out. The hens' is three peeps behind the door, which stirs at each.
  'snore-pony': [by('asleep-pony', hiss(210, 150, 1.2, 0.09, 0.3, 0.5), flubber(0.95, 7, 70))],
  'snore-goat': [by('asleep-goat', tone(300, 330, 0.06, 0.2, 0.3, 0, 'sawtooth'), tone(520, 440, 0.05, 0.1, 0.4, 0.6))],
  'snore-pig': [by('asleep-pig', tone(74, 60, 0.14, 0.25, 0.45, 0, 'sawtooth'), hiss(300, 220, 3, 0.07, 0.2, 0.4), tone(900, 1300, 0.04, 0.1, 0.35, 0.85))],
  'snore-hens': [by('door-shakes', HEN_SNORE.peeps.map((at, i) => peep(at, [900, 800, 720][i])))],
  // Waking: one small sound each, with a yawn. The hens wake as their beaks come to the holes.
  'yawn-pony': [by('yawn-pony', tone(170, 300, 0.1, 0.12, 0.2, 0, 'triangle'), tone(300, 140, 0.09, 0.05, 0.4, 0.3, 'triangle'))],
  'yawn-goat': [by('yawn-goat', bleat(0, 520, 2), tone(520, 380, 0.07, 0.02, 0.22, 0.2, 'triangle'))],
  'yawn-pig': [by('yawn-pig', oink(0, 240), tone(240, 380, 0.07, 0.05, 0.2, 0.2))],
  // The ending: each animal's own settled sound.
  'settled-hens': [by('settled-hens', tone(392, 350, 0.08, 0.08, 0.3, 0, 'triangle'), tone(440, 392, 0.07, 0.08, 0.3, 0.3, 'triangle'), tone(370, 330, 0.07, 0.08, 0.36, 0.62, 'triangle'))],
  'settled-pony': [by('settled-pony', nicker(0), hiss(240, 160, 1, 0.08, 0.2, 0.45, 0.55))],
  'settled-goat': [by('settled-goat', run(crunch(0, 1300), 3, 0.3), bleat(0.9, 350, 2))],
  'settled-pig': [by('settled-pig', oink(0, 130), tone(98, 70, 0.14, 0.1, 0.5, 0.2, 'triangle'), glop(0.85, 200))],
  // The sun slides down, and the white hen crows it up again.
  nightfall: [by('sun-dips', tone(660, 330, 0.07, 0.05, 0.9), tone(495, 247, 0.06, 0.05, 0.9, 0.3), tone(330, 165, 0.06, 0.05, 1.0, 0.6))],
  crow: [by('crow', tone(620, 680, 0.14, 0.02, 0.12, CROW.notes[0], 'sawtooth'), tone(780, 800, 0.15, 0.02, 0.1, CROW.notes[1], 'sawtooth'), tone(800, 1080, 0.17, 0.02, 0.2, CROW.notes[2], 'sawtooth'), tone(1080, 640, 0.15, 0.02, 0.55, CROW.notes[3], 'sawtooth'))],
  // A quiet yard: the hens croon by the full trough, and a bubble swells in the mud and bursts with a glop.
  croon: [by('croon', tone(330, 300, 0.05, 0.1, 0.4, 0, 'triangle'), tone(350, 310, 0.045, 0.1, 0.45, 0.5, 'triangle'))],
  bubble: [by('bits-bubble', glop(IDLE_BUBBLE_S, 170), hiss(900, undefined, 2, 0.03, 0.003, 0.03, IDLE_BUBBLE_S))],
}

export const VOICES = Object.fromEntries(Object.entries(SEGMENTS).map(([sound, segments]) => [sound, segments.flatMap((segment) => segment.notes)])) as unknown as Record<SoundId, readonly N[]>

// --- Channels: whose voice a sound is ------------------------------------------------

/**
 * A channel carries what one maker still has to sound, so that it can be stopped: an animal's answer when a new
 * use replaces it, the flock's run and each hen's pecks when they are sent somewhere else, and a scene's sounds
 * when a touch ends it.
 */
export type Channel = AnimalId | 'flock' | `hen-${HenId}` | 'scene'

const SCENE_SOUNDS: readonly SoundId[] = ['door-open', 'hens-in', 'door-slide', 'door-clunk', 'trip', 'shake', 'beaks', 'nightfall', 'crow', 'yawn-pony', 'yawn-goat', 'yawn-pig', ...ANIMALS.flatMap((animal): SoundId[] => [`snore-${animal}`, `settled-${animal}`])]

/** The channel a sound plays on, and whether it takes the channel over (an answer) or joins what is on it. */
export function channelOf(sound: SoundId): { channel: Channel | null; replace: boolean } {
  if (sound in CELL_SEGMENTS) return { channel: sound.slice(sound.indexOf('-') + 1) as AnimalId, replace: true }
  if (sound.startsWith('tok-') || sound.startsWith('peck-') || sound.startsWith('run-') || sound.startsWith('bonk-')) return { channel: `hen-${sound.slice(sound.indexOf('-') + 1) as HenId}`, replace: true }
  if (sound === 'hens-drum') return { channel: 'flock', replace: true }
  if (sound === 'croon') return { channel: 'hens', replace: false }
  if (sound === 'bubble') return { channel: 'pig', replace: false }
  if (SCENE_SOUNDS.includes(sound)) return { channel: 'scene', replace: false }
  return { channel: null, replace: false }
}

/** Everything one touch set off, as the parts of one voice, each on its channel. */
export function partsOf(sounds: readonly SoundId[]): { channel: Channel | null; replace: boolean; notes: readonly N[] }[] {
  return sounds.map((sound) => ({ ...channelOf(sound), notes: VOICES[sound] }))
}

/** Everything one touch set off, as one list of notes for one voice. */
export function notesOf(sounds: readonly SoundId[]): N[] {
  return sounds.flatMap((sound) => VOICES[sound])
}

/** Seconds from a voice's start to the end of its last note. */
export function lengthOf(notes: readonly N[]): number {
  return notes.reduce((end, note) => Math.max(end, (note.delay ?? 0) + note.attack + note.decay), 0)
}

export const CELL_SOUNDS: readonly CellId[] = GRID

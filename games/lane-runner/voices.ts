import type { Note } from './audio'
import type { Actor } from './handover'
import type { ActKind, Gag, LapEvent, Surface, Watcher } from './lap'
import type { Load } from './lapState'
import type { Obstacle } from './trail'

// Every sound of the game, as plain numbers. Nobody at the machine it was
// built on could hear them, so they are written from the sheet's words and
// a test holds every pitch, peak and length in range.
//
// One rule above the rest: a voice is the sound of one motion and starts on
// the frame of that motion. No note carries a delay. A thing that happens
// later (the landing after a jump, the second pop, the honk after a duck) is
// its own event on its own frame, with its own voice, so sight and sound
// share one clock and a game that is put away in between plays nothing late.
//
// The fox's sounds are beads on a board: clacks, rattles and scrapes. Each
// of the others has a voice of its own shape, and every cell of the grid has
// one that no other cell has.

type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth'

/** A tone: from one pitch to another. */
const tone = (frequency: number, glideTo: number, wave: Wave, peak: number, attack: number, decay: number): Note => ({ kind: 'tone', frequency, glideTo, wave, peak, attack, decay })
/** A band of noise: from one middle to another, `q` how narrow. */
const hiss = (frequency: number, glideTo: number, q: number, peak: number, attack: number, decay: number): Note => ({ kind: 'noise', frequency, glideTo, q, peak, attack, decay })

const clack = (pitch: number, peak: number): Note[] => [tone(pitch, pitch * 0.72, 'triangle', peak, 0.002, 0.045), hiss(pitch * 2.6, pitch * 2.6, 5, peak * 0.6, 0.001, 0.025)]

/** A footfall on the trail: a bead dropped on the board. The pitch follows the lane, left to right, and the two feet differ. */
const STEP_PITCH: readonly number[] = [620, 740, 880]

const EVENTS = {
  start: [hiss(700, 2600, 2, 0.16, 0.01, 0.12), tone(190, 300, 'triangle', 0.2, 0.005, 0.09)],
  stop: [hiss(2600, 480, 3, 0.24, 0.004, 0.2), tone(230, 120, 'triangle', 0.2, 0.003, 0.1)],
  laneRight: [hiss(700, 2400, 4, 0.2, 0.008, 0.1), tone(520, 780, 'sine', 0.12, 0.005, 0.09)],
  laneLeft: [hiss(2400, 700, 4, 0.2, 0.008, 0.1), tone(780, 520, 'sine', 0.12, 0.005, 0.09)],
  teeter: [tone(420, 860, 'sine', 0.2, 0.03, 0.38), hiss(3200, 3200, 6, 0.08, 0.01, 0.3)],
  jump: [tone(300, 640, 'sine', 0.26, 0.012, 0.26), hiss(1200, 2200, 2, 0.07, 0.01, 0.12)],
  dive: [tone(900, 260, 'sine', 0.2, 0.008, 0.2)],
  land: [tone(150, 72, 'sine', 0.34, 0.003, 0.16), hiss(3000, 3000, 3, 0.14, 0.002, 0.14)],
  landHard: [tone(120, 55, 'sine', 0.4, 0.003, 0.2), hiss(2200, 2200, 2, 0.2, 0.002, 0.2)],
  roll: [hiss(1300, 900, 3, 0.18, 0.02, 0.42), tone(210, 170, 'triangle', 0.1, 0.02, 0.4)],
  unroll: [tone(480, 820, 'triangle', 0.18, 0.004, 0.08)],
  turn: [tone(880, 990, 'sine', 0.08, 0.01, 0.09)],
  honk: [tone(430, 370, 'sawtooth', 0.22, 0.015, 0.3), tone(860, 745, 'square', 0.07, 0.015, 0.26)],
  honkAfter: [tone(360, 300, 'sawtooth', 0.2, 0.02, 0.4), tone(725, 600, 'square', 0.06, 0.02, 0.34)],
  fright: [tone(980, 1500, 'sine', 0.16, 0.006, 0.14)],
  duck: [tone(700, 240, 'sine', 0.14, 0.01, 0.2)],
  bump: [hiss(5200, 5200, 1.5, 0.24, 0.02, 0.4), tone(170, 80, 'triangle', 0.3, 0.003, 0.18), tone(470, 520, 'sawtooth', 0.16, 0.01, 0.3)],
  squawk: [tone(540, 900, 'sawtooth', 0.22, 0.006, 0.2), tone(200, 420, 'sine', 0.2, 0.004, 0.16)],
  up: [tone(340, 560, 'triangle', 0.16, 0.006, 0.1)],
  toss: [tone(520, 1040, 'sine', 0.14, 0.01, 0.2)],
  catch: [tone(700, 520, 'triangle', 0.18, 0.003, 0.07), tone(180, 150, 'sine', 0.14, 0.003, 0.08)],
  pickup: [tone(392, 587, 'triangle', 0.2, 0.006, 0.12), hiss(1800, 2600, 3, 0.08, 0.004, 0.08)],
  arrive: [hiss(3000, 420, 2.5, 0.28, 0.004, 0.34), tone(260, 110, 'triangle', 0.22, 0.003, 0.2)],
  begin: [tone(330, 495, 'triangle', 0.18, 0.006, 0.14), hiss(900, 2000, 2, 0.08, 0.008, 0.1)],
  // One more balloon on a thorn.
  pop: [hiss(2900, 800, 0.7, 0.36, 0.001, 0.09), tone(500, 130, 'square', 0.14, 0.001, 0.06)],
  // The bucket's water coming down over the fox.
  douse: [hiss(1300, 420, 1.1, 0.24, 0.004, 0.3), tone(210, 120, 'sine', 0.1, 0.004, 0.16)],
} satisfies Record<string, Note[]>

/** What each of the six who watch says when a finger lands on it. */
const POKES: Record<Watcher, Note[]> = {
  goose: [tone(500, 440, 'sawtooth', 0.16, 0.01, 0.16)],
  owl: [tone(392, 350, 'sine', 0.24, 0.04, 0.34)],
  bear: [tone(105, 82, 'triangle', 0.34, 0.03, 0.3), hiss(300, 300, 2, 0.08, 0.03, 0.2)],
  hedgehog: [hiss(4200, 4200, 4, 0.14, 0.004, 0.07), tone(1250, 1500, 'sine', 0.12, 0.004, 0.08)],
  frog: [tone(165, 118, 'square', 0.14, 0.008, 0.2)],
  cat: [tone(640, 980, 'triangle', 0.16, 0.05, 0.3)],
}

/** A load taken from the shelf: each has its own. */
const TAKES: Record<Exclude<Load, 'none'>, Note[]> = {
  cake: [tone(660, 620, 'sine', 0.2, 0.004, 0.16), tone(990, 930, 'sine', 0.1, 0.004, 0.2)],
  ladder: [...clack(300, 0.24), tone(450, 430, 'triangle', 0.14, 0.002, 0.07)],
  balloons: [tone(300, 900, 'sine', 0.16, 0.03, 0.2), hiss(2500, 4000, 6, 0.06, 0.02, 0.14)],
  owl: [tone(310, 260, 'sine', 0.18, 0.08, 0.36)],
  bucket: [tone(520, 500, 'square', 0.1, 0.002, 0.12), hiss(900, 500, 3, 0.14, 0.01, 0.16)],
}

/** A load thrown by a tumble, as it leaves the fox's hands. */
const THROWS: Record<Exclude<Load, 'none'>, Note[]> = {
  cake: [tone(900, 300, 'sine', 0.16, 0.01, 0.3)],
  ladder: [hiss(1500, 700, 4, 0.2, 0.005, 0.3), tone(260, 200, 'triangle', 0.14, 0.004, 0.2)],
  balloons: [tone(500, 1300, 'sine', 0.14, 0.02, 0.3)],
  owl: [tone(700, 1100, 'triangle', 0.14, 0.01, 0.22)],
  bucket: [tone(600, 560, 'square', 0.12, 0.002, 0.2), hiss(700, 300, 2, 0.2, 0.01, 0.3)],
}

/** An obstacle making itself known to a fox three steps off: its own sound, with its own motion. */
const NEAR: Record<Obstacle, Note[]> = {
  stream: [hiss(900, 400, 2, 0.14, 0.01, 0.22), tone(700, 300, 'sine', 0.1, 0.004, 0.12)],
  branch: [tone(2400, 3200, 'sine', 0.12, 0.01, 0.08), tone(3000, 2500, 'sine', 0.08, 0.03, 0.1)],
  mud: [tone(110, 190, 'sine', 0.22, 0.02, 0.12), hiss(260, 180, 2, 0.12, 0.02, 0.2)],
  brambles: [hiss(5200, 3800, 7, 0.12, 0.004, 0.16), tone(170, 150, 'sawtooth', 0.08, 0.02, 0.2)],
  goose: [tone(300, 280, 'sawtooth', 0.12, 0.03, 0.22)],
  log: [...clack(230, 0.22), tone(150, 140, 'sine', 0.12, 0.002, 0.1)],
}

/** A footfall on something that is not the trail. `n` counts the footfalls there, for a run that rises. */
function underfoot(surface: Exclude<Surface, 'trail'>, n: number, foot: 0 | 1): Note[] {
  const rise = Math.min(n, 12)
  switch (surface) {
    case 'stone':
      return [tone(1500 + foot * 180, 1300, 'sine', 0.18, 0.001, 0.05), hiss(5200, 5200, 8, 0.07, 0.001, 0.03)]
    case 'plank':
      return [tone(190 + foot * 24, 150, 'triangle', 0.24, 0.002, 0.08), hiss(700, 700, 3, 0.08, 0.001, 0.05)]
    case 'mud':
      return [hiss(320, 150, 2, 0.24, 0.02, 0.2), tone(95 + foot * 12, 60, 'sine', 0.18, 0.02, 0.16)]
    case 'rung':
      // Over the laid ladder the knocks rise, rung by rung.
      return clack(360 * 2 ** (rise / 12), 0.22)
    case 'board':
      // Out of the mud each rung comes with a sucking pop.
      return [tone(130, 420, 'sine', 0.24, 0.03, 0.07), hiss(500, 1400, 3, 0.1, 0.02, 0.06)]
    case 'plink':
      return [tone(1900 + foot * 300, 2500, 'sine', 0.14, 0.001, 0.09)]
    case 'tiptoe':
      return [tone(1100 + foot * 90, 1000, 'triangle', 0.08, 0.001, 0.04)]
  }
}

/** Every cell of the grid: one voice each, and no two alike. */
const GAGS: Record<Gag, Note[]> = {
  // Empty hands.
  splash: [hiss(1400, 300, 1.2, 0.34, 0.006, 0.42), tone(240, 90, 'sine', 0.24, 0.004, 0.2)],
  stones: [tone(1320, 1760, 'sine', 0.14, 0.003, 0.1)],
  bonk: [tone(180, 70, 'triangle', 0.4, 0.002, 0.2), hiss(600, 600, 4, 0.16, 0.001, 0.07)],
  leafhat: [hiss(4800, 3000, 2, 0.2, 0.02, 0.34)],
  wade: [hiss(280, 120, 1.5, 0.26, 0.03, 0.34), tone(80, 55, 'sine', 0.2, 0.03, 0.26)],
  flop: [tone(110, 45, 'sine', 0.38, 0.004, 0.3), hiss(220, 100, 1, 0.3, 0.01, 0.4)],
  mudball: [hiss(420, 200, 2, 0.22, 0.03, 0.4), tone(140, 100, 'triangle', 0.12, 0.03, 0.34)],
  burrs: [tone(900, 1700, 'square', 0.14, 0.004, 0.14), hiss(6000, 6000, 8, 0.1, 0.002, 0.1)],
  tailhang: [tone(220, 330, 'sawtooth', 0.2, 0.004, 0.3)],
  burrball: [hiss(5600, 4200, 6, 0.18, 0.004, 0.36), tone(300, 240, 'triangle', 0.08, 0.02, 0.3)],
  trip: [tone(700, 200, 'triangle', 0.22, 0.004, 0.22), hiss(1800, 600, 3, 0.14, 0.004, 0.2)],
  hollow: [tone(82, 70, 'sine', 0.36, 0.02, 0.5), hiss(160, 120, 4, 0.16, 0.02, 0.44)],
  shove: [hiss(5200, 5200, 1.5, 0.2, 0.02, 0.3), tone(300, 240, 'sawtooth', 0.12, 0.01, 0.14)],
  // The cake.
  sail: [tone(500, 170, 'sine', 0.26, 0.004, 0.1), hiss(600, 900, 5, 0.12, 0.05, 0.4)],
  sway: [tone(210, 250, 'sawtooth', 0.1, 0.06, 0.3)],
  birdTier: [tone(2600, 3400, 'sine', 0.14, 0.008, 0.07), tone(3100, 2200, 'triangle', 0.1, 0.02, 0.12)],
  flat: [tone(1200, 1500, 'sine', 0.1, 0.03, 0.16)],
  mudTier: [hiss(500, 1500, 3, 0.2, 0.06, 0.24), tone(120, 260, 'sine', 0.16, 0.06, 0.2)],
  berries: [tone(1760, 1760, 'sine', 0.16, 0.002, 0.07), tone(2217, 2217, 'sine', 0.1, 0.002, 0.07)],
  kebab: [hiss(900, 300, 2, 0.22, 0.01, 0.16), tone(330, 180, 'triangle', 0.14, 0.01, 0.12)],
  snatch: [tone(470, 300, 'sawtooth', 0.14, 0.02, 0.3), hiss(400, 300, 1, 0.16, 0.02, 0.3)],
  splat: [hiss(700, 200, 1, 0.3, 0.003, 0.18), tone(160, 90, 'sine', 0.2, 0.003, 0.12)],
  hum: [tone(196, 196, 'sine', 0.22, 0.08, 0.5), tone(294, 294, 'sine', 0.1, 0.08, 0.5)],
  // The ladder.
  bridge: [...clack(240, 0.26), hiss(900, 900, 3, 0.1, 0.004, 0.14)],
  snag: [tone(150, 210, 'sawtooth', 0.2, 0.01, 0.3), ...clack(420, 0.2)],
  drag: [hiss(1100, 800, 5, 0.2, 0.01, 0.5), tone(250, 230, 'triangle', 0.1, 0.01, 0.4)],
  duckboard: [tone(150, 110, 'triangle', 0.24, 0.004, 0.16), hiss(300, 200, 2, 0.16, 0.01, 0.2)],
  climb: [...clack(520, 0.22)],
  ride: [tone(460, 520, 'sawtooth', 0.2, 0.01, 0.2), tone(920, 1040, 'square', 0.06, 0.01, 0.16)],
  vault: [tone(170, 200, 'sawtooth', 0.18, 0.02, 0.22)],
  // The balloons.
  dangle: [tone(260, 520, 'sine', 0.16, 0.05, 0.3), tone(2000, 2400, 'sine', 0.06, 0.01, 0.1)],
  squeak: [tone(1500, 2300, 'square', 0.1, 0.02, 0.26)],
  sigh: [tone(900, 500, 'sine', 0.12, 0.2, 0.7)],
  tiptoe: [tone(1300, 1600, 'triangle', 0.08, 0.01, 0.12)],
  pops: [hiss(2600, 800, 0.7, 0.4, 0.001, 0.09), tone(400, 120, 'square', 0.16, 0.001, 0.06)],
  bang: [hiss(1800, 500, 0.6, 0.42, 0.001, 0.14), tone(300, 80, 'square', 0.2, 0.001, 0.1), tone(520, 880, 'sawtooth', 0.14, 0.02, 0.3)],
  creak: [tone(330, 250, 'sawtooth', 0.1, 0.1, 0.5)],
  // The baby owl.
  snore: [hiss(170, 130, 3, 0.2, 0.1, 0.3)],
  cling: [hiss(190, 150, 3, 0.18, 0.12, 0.4), tone(2400, 2400, 'sine', 0.05, 0.02, 0.1)],
  cradle: [hiss(85, 65, 3, 0.26, 0.14, 0.44)],
  prrrt: [tone(1300, 2100, 'triangle', 0.18, 0.006, 0.2), hiss(3200, 3200, 12, 0.12, 0.004, 0.24)],
  thorn: [tone(2000, 2900, 'sine', 0.2, 0.004, 0.12)],
  shriek: [tone(1700, 2600, 'sawtooth', 0.2, 0.006, 0.3), tone(2550, 3900, 'sine', 0.1, 0.006, 0.26)],
  turnover: [tone(700, 1400, 'sine', 0.14, 0.14, 0.3)],
  // The bucket.
  scoop: [tone(300, 150, 'sine', 0.22, 0.02, 0.2), hiss(700, 1700, 2, 0.2, 0.03, 0.3)],
  clang: [tone(820, 800, 'square', 0.2, 0.001, 0.5), tone(1237, 1210, 'sine', 0.14, 0.001, 0.6), hiss(900, 400, 1.5, 0.2, 0.004, 0.24)],
  puddle: [hiss(1000, 2400, 1.5, 0.22, 0.02, 0.4), tone(880, 1320, 'sine', 0.08, 0.04, 0.3)],
  mudpie: [tone(90, 50, 'sine', 0.36, 0.006, 0.34), hiss(260, 600, 1.2, 0.26, 0.02, 0.4), tone(180, 300, 'sine', 0.12, 0.1, 0.2)],
  // The first chime of the run; the others are in CHIME, each on its own frame.
  flowers: [tone(1047, 1047, 'sine', 0.16, 0.004, 0.5), hiss(1500, 2600, 2, 0.08, 0.01, 0.14)],
  floomp: [hiss(500, 250, 0.8, 0.22, 0.04, 0.3), tone(150, 120, 'sine', 0.14, 0.04, 0.2)],
  sulk: [tone(250, 520, 'sawtooth', 0.22, 0.12, 0.3), hiss(3000, 1500, 2, 0.16, 0.1, 0.4)],
  // The first bloop of three; the others are in BLOOP, each on the frame its mushroom comes up.
  mushrooms: [tone(300, 600, 'sine', 0.24, 0.02, 0.1)],
  spill: [hiss(1500, 500, 1, 0.24, 0.004, 0.24)],
}

/** The moments inside what carries the fox: one voice for each, in the order they come. */
const CUES: Record<ActKind, readonly Note[][]> = {
  thrown: [],
  // It shakes itself dry: three rattles.
  splash: [0, 1, 2].map((i) => [hiss(3600 + i * 500, 2600, 5, 0.16, 0.004, 0.09), ...clack(900 + i * 120, 0.1)]),
  bonk: [[tone(130, 70, 'sine', 0.3, 0.003, 0.16), hiss(2400, 2400, 3, 0.12, 0.002, 0.12)]],
  flop: [],
  burrs: [[tone(1100, 1500, 'square', 0.1, 0.004, 0.1)], [tone(330, 500, 'triangle', 0.16, 0.006, 0.12)]],
  tailhang: [[tone(196, 392, 'sawtooth', 0.22, 0.002, 0.34), tone(392, 784, 'triangle', 0.1, 0.002, 0.3)], [tone(140, 70, 'sine', 0.32, 0.003, 0.18), hiss(2600, 2600, 3, 0.12, 0.002, 0.12)]],
  trip: [[tone(105, 50, 'sine', 0.4, 0.003, 0.24), hiss(1600, 1600, 2, 0.2, 0.002, 0.2)]],
  snag: [[tone(170, 150, 'sawtooth', 0.16, 0.03, 0.2)], [tone(150, 175, 'sawtooth', 0.16, 0.03, 0.2)], [tone(220, 440, 'sawtooth', 0.22, 0.002, 0.26), tone(120, 60, 'sine', 0.2, 0.003, 0.16)]],
  // Tok, tok, tok up the rungs, and a slide down the far side.
  climb: [[...clack(560, 0.24)], [...clack(660, 0.24)], [...clack(780, 0.24)], [tone(1200, 400, 'sine', 0.2, 0.02, 0.5)]],
  vault: [[tone(110, 440, 'sine', 0.26, 0.02, 0.5)], [tone(140, 66, 'sine', 0.34, 0.003, 0.18), hiss(2800, 2800, 3, 0.14, 0.002, 0.14)]],
  catch: [[tone(1700, 2100, 'square', 0.1, 0.02, 0.16)], [tone(2100, 1600, 'square', 0.1, 0.02, 0.16)], [hiss(700, 1600, 1.5, 0.22, 0.01, 0.14), tone(300, 500, 'sine', 0.12, 0.01, 0.1)]],
  blind: [[tone(760, 740, 'square', 0.14, 0.001, 0.22)], [tone(700, 680, 'square', 0.12, 0.001, 0.22)]],
  // Five flaps, and then it nods off again.
  flight: [...[0, 1, 2, 3, 4].map((i) => [hiss(700 + i * 60, 300, 1.5, 0.2, 0.02, 0.14)]), [hiss(170, 120, 3, 0.16, 0.12, 0.36)]],
  trot: [[...clack(740, 0.18)], [...clack(830, 0.18)]],
}

/** The second and third mushroom coming up on the log: each a bloop higher than the one before, one to a frame. */
const BLOOP: readonly Note[][] = [[400, 800], [520, 1040]].map(([from, to]) => [tone(from, to, 'sine', 0.22, 0.02, 0.1)])
/** The run of chimes of thorns coming into flower, after the first: up the chord, one bell to a frame. */
const CHIME: readonly Note[][] = [1319, 1568, 2093].map((pitch) => [tone(pitch, pitch, 'sine', 0.14, 0.004, 0.5)])

/** The steps of the hand-over: what each of them sounds like doing each thing. */
const STEPS: Record<string, Note[]> = {
  'goose.perch': [tone(450, 500, 'sawtooth', 0.18, 0.01, 0.2), hiss(1200, 600, 1.5, 0.14, 0.02, 0.2)],
  // The bear: low and round.
  'bear.greet': [tone(90, 104, 'triangle', 0.24, 0.05, 0.3)],
  'bear.come': [tone(92, 120, 'triangle', 0.3, 0.04, 0.3), hiss(240, 240, 2, 0.08, 0.03, 0.2)],
  'bear.take': [tone(130, 175, 'triangle', 0.26, 0.03, 0.22)],
  'bear.home': [tone(110, 98, 'triangle', 0.22, 0.04, 0.24)],
  'bear.wring': [hiss(900, 2200, 4, 0.2, 0.05, 0.4), tone(700, 900, 'sine', 0.06, 0.05, 0.3)],
  'bear.bite': [hiss(500, 300, 2, 0.24, 0.004, 0.1), tone(140, 120, 'triangle', 0.2, 0.004, 0.1)],
  'bear.spit': [hiss(1600, 3200, 2, 0.26, 0.004, 0.14), tone(220, 110, 'triangle', 0.2, 0.004, 0.16)],
  'bear.lick': [hiss(1400, 2600, 5, 0.14, 0.06, 0.4), tone(196, 262, 'triangle', 0.18, 0.06, 0.4)],
  'bear.crumbs': [hiss(1800, 2800, 6, 0.14, 0.04, 0.36), tone(147, 175, 'triangle', 0.16, 0.05, 0.36)],
  'bear.sigh': [tone(123, 82, 'triangle', 0.24, 0.1, 0.5)],
  // The cat: narrow and rising.
  'cat.greet': [tone(620, 740, 'triangle', 0.14, 0.04, 0.2)],
  'cat.come': [tone(600, 900, 'triangle', 0.16, 0.04, 0.26)],
  'cat.take': [...clack(330, 0.22)],
  'cat.home': [tone(820, 700, 'triangle', 0.12, 0.03, 0.2)],
  'cat.prop': [...clack(260, 0.26), tone(390, 370, 'triangle', 0.12, 0.002, 0.1)],
  'cat.slide': [tone(1600, 500, 'sine', 0.2, 0.02, 0.4), hiss(2400, 900, 4, 0.1, 0.02, 0.36)],
  'cat.wash': [hiss(2200, 3400, 6, 0.14, 0.04, 0.3)],
  'cat.ridedown': [tone(1400, 1900, 'sine', 0.16, 0.01, 0.14), tone(430, 370, 'sawtooth', 0.14, 0.02, 0.24)],
  'cat.down': [tone(1500, 2000, 'sine', 0.16, 0.01, 0.16)],
  'cat.purr': [tone(82, 82, 'sawtooth', 0.2, 0.1, 0.6), hiss(164, 164, 6, 0.1, 0.1, 0.5)],
  // The hedgehog: tiny and quick.
  'hedgehog.greet': [tone(1300, 1600, 'sine', 0.12, 0.004, 0.1)],
  'hedgehog.come': [hiss(4200, 4200, 4, 0.12, 0.004, 0.08), tone(1250, 1700, 'sine', 0.12, 0.004, 0.12)],
  'hedgehog.take': [tone(1100, 1650, 'sine', 0.16, 0.006, 0.14)],
  'hedgehog.home': [tone(1400, 1100, 'sine', 0.1, 0.004, 0.1)],
  'hedgehog.hug': [tone(900, 1100, 'sine', 0.12, 0.05, 0.3), hiss(2400, 2400, 9, 0.06, 0.05, 0.3)],
  'hedgehog.pop': [hiss(2800, 900, 0.7, 0.4, 0.001, 0.1), tone(460, 130, 'square', 0.16, 0.001, 0.07), tone(1800, 2400, 'sine', 0.1, 0.004, 0.1)],
  'hedgehog.laugh': [tone(1500, 1900, 'triangle', 0.14, 0.01, 0.1), tone(1900, 1500, 'sine', 0.08, 0.06, 0.2)],
  'hedgehog.float': [tone(800, 1600, 'sine', 0.14, 0.1, 0.5)],
  'hedgehog.skip': [hiss(3000, 5000, 5, 0.12, 0.01, 0.12), tone(1300, 1500, 'sine', 0.1, 0.004, 0.08)],
  // The owl: soft and hollow.
  'owl.look': [tone(370, 330, 'sine', 0.2, 0.05, 0.3)],
  'owl.greet': [tone(330, 392, 'sine', 0.2, 0.05, 0.3)],
  'owl.come': [hiss(600, 300, 1.5, 0.18, 0.03, 0.2), tone(392, 440, 'sine', 0.14, 0.05, 0.3)],
  'owl.take': [tone(440, 392, 'sine', 0.2, 0.04, 0.3)],
  'owl.home': [hiss(560, 280, 1.5, 0.16, 0.03, 0.2)],
  'owl.flyoff': [hiss(800, 300, 1.5, 0.22, 0.03, 0.3), tone(392, 330, 'sine', 0.16, 0.05, 0.4)],
  'owl.fetch': [hiss(400, 700, 1.5, 0.2, 0.03, 0.24), tone(330, 392, 'sine', 0.16, 0.05, 0.3)],
  'owl.dry': [hiss(1500, 900, 2, 0.18, 0.04, 0.5)],
  'owl.shakeout': [hiss(2600, 1400, 3, 0.2, 0.01, 0.4), tone(300, 260, 'triangle', 0.08, 0.02, 0.3)],
  'owl.preen': [tone(1900, 2500, 'sine', 0.12, 0.002, 0.06), hiss(3000, 3000, 8, 0.1, 0.01, 0.12)],
  'owl.tuck': [tone(294, 262, 'sine', 0.2, 0.08, 0.4)],
  // They snore a third apart.
  'owl.snore': [tone(98, 92, 'sine', 0.2, 0.2, 0.5), tone(123, 116, 'sine', 0.16, 0.2, 0.5), hiss(160, 120, 3, 0.1, 0.2, 0.4)],
  // The frog: square and short.
  'frog.greet': [tone(130, 164, 'square', 0.12, 0.008, 0.16)],
  'frog.come': [tone(140, 210, 'square', 0.14, 0.008, 0.14)],
  'frog.take': [tone(520, 500, 'square', 0.08, 0.002, 0.12), tone(175, 233, 'square', 0.12, 0.008, 0.14)],
  'frog.home': [tone(210, 140, 'square', 0.12, 0.008, 0.14)],
  'frog.pour': [hiss(1200, 500, 1.5, 0.26, 0.04, 0.5), tone(600, 240, 'sine', 0.12, 0.04, 0.4)],
  'frog.dive': [tone(500, 130, 'sine', 0.26, 0.004, 0.14), hiss(1500, 400, 1.2, 0.3, 0.01, 0.4)],
  'frog.float': [tone(175, 131, 'square', 0.12, 0.05, 0.4), hiss(800, 1000, 5, 0.08, 0.05, 0.4)],
  'frog.sit': [hiss(900, 400, 1.5, 0.18, 0.004, 0.14), tone(165, 147, 'square', 0.12, 0.008, 0.2)],
  'frog.hat': [tone(780, 760, 'square', 0.16, 0.001, 0.3), tone(196, 147, 'square', 0.12, 0.02, 0.2)],
}

/** A step that comes more than once rises a little each time: the bear's rumble, the kitten's rungs, the skipping. */
function rising(notes: readonly Note[], n: number): Note[] {
  const up = 2 ** ((n * 2) / 12)
  return notes.map((note) => ({ ...note, frequency: note.frequency * up, glideTo: note.glideTo === undefined ? undefined : note.glideTo * up }))
}

const EAT: Note[] = [tone(98, 131, 'triangle', 0.3, 0.03, 0.3), hiss(420, 300, 2, 0.14, 0.004, 0.1)]
const RUNG: Note[] = [...clack(700, 0.2), tone(1400, 1700, 'sine', 0.08, 0.004, 0.06)]
const PREEN: Note[] = STEPS['owl.preen']

/** The notes of one step of the hand-over. */
export function stepNotes(who: Actor, step: string, n = 0): readonly Note[] {
  if (who === 'bear' && step === 'eat') return rising(EAT, n * 2)
  if (who === 'cat' && step === 'rung') return rising(RUNG, n)
  if (who === 'owl' && step === 'preen') return rising(PREEN, n)
  if (who === 'hedgehog' && step === 'skip') return rising(STEPS['hedgehog.skip'], n)
  if (who === 'cat' && step === 'wash') return rising(STEPS['cat.wash'], n)
  return STEPS[`${who}.${step}`] ?? []
}

/** What a footfall carries besides the foot: a sleeping owl snores in time with it, and a goose on the ladder honks. */
function withFootfall(notes: Note[], event: Extract<LapEvent, { type: 'step' }>): Note[] {
  if (event.load === 'owl') notes.push(hiss(event.surface === 'mud' ? 80 : 170, event.surface === 'mud' ? 62 : 130, 3, 0.12, 0.03, 0.12))
  if (event.rides) notes.push(tone(event.foot === 0 ? 440 : 392, event.foot === 0 ? 400 : 360, 'sawtooth', 0.1, 0.01, 0.1))
  return notes
}

/** The notes of one thing the lap did, or none for a thing that makes no sound of its own. */
export function notesFor(event: LapEvent): readonly Note[] {
  switch (event.type) {
    case 'step':
      return withFootfall(event.surface === 'trail' ? clack(STEP_PITCH[event.lane] * (event.foot === 0 ? 1 : 1.12), 0.2) : underfoot(event.surface, event.n, event.foot), event)
    case 'lane':
      return event.dir > 0 ? EVENTS.laneRight : EVENTS.laneLeft
    case 'land':
      return event.hard ? EVENTS.landHard : EVENTS.land
    case 'honk':
      return event.after ? EVENTS.honkAfter : EVENTS.honk
    case 'poke':
      return POKES[event.who]
    case 'take':
      return event.load === 'none' ? [] : TAKES[event.load]
    case 'throw':
      return event.load === 'none' ? [] : THROWS[event.load]
    case 'near':
      return NEAR[event.obstacle]
    case 'gag':
      return GAGS[event.gag]
    case 'cue':
      return CUES[event.act][event.index] ?? []
    case 'chime':
      return CHIME[event.index - 1] ?? []
    case 'bloop':
      return BLOOP[event.index - 1] ?? []
    default:
      return EVENTS[event.type]
  }
}

export const GAG_NAMES = Object.keys(GAGS) as Gag[]

/** Every voice there is, by a name, for the test that holds them in range. */
export function everyVoice(): { name: string; notes: readonly Note[] }[] {
  const all: { name: string; notes: readonly Note[] }[] = []
  for (const name of Object.keys(EVENTS) as (keyof typeof EVENTS)[]) all.push({ name, notes: EVENTS[name] })
  for (const who of Object.keys(POKES) as Watcher[]) all.push({ name: `poke-${who}`, notes: POKES[who] })
  for (const load of Object.keys(TAKES) as (keyof typeof TAKES)[]) {
    all.push({ name: `take-${load}`, notes: TAKES[load] })
    all.push({ name: `throw-${load}`, notes: THROWS[load] })
  }
  for (const obstacle of Object.keys(NEAR) as Obstacle[]) all.push({ name: `near-${obstacle}`, notes: NEAR[obstacle] })
  for (const gag of GAG_NAMES) all.push({ name: `gag-${gag}`, notes: GAGS[gag] })
  for (const act of Object.keys(CUES) as ActKind[]) CUES[act].forEach((notes, i) => all.push({ name: `cue-${act}-${i}`, notes }))
  CHIME.forEach((notes, i) => all.push({ name: `chime-${i + 1}`, notes }))
  BLOOP.forEach((notes, i) => all.push({ name: `bloop-${i + 1}`, notes }))
  for (const name of Object.keys(STEPS)) all.push({ name: `step-${name}`, notes: STEPS[name] })
  all.push({ name: 'step-bear.eat', notes: EAT }, { name: 'step-cat.rung', notes: RUNG })
  for (const lane of [0, 1, 2] as const) for (const foot of [0, 1] as const) all.push({ name: `foot-${lane}-${foot}`, notes: notesFor({ type: 'step', foot, lane, surface: 'trail', n: 1, load: 'none', rides: false }) })
  for (const surface of ['stone', 'plank', 'mud', 'rung', 'board', 'plink', 'tiptoe'] as const) all.push({ name: `foot-${surface}`, notes: underfoot(surface, 3, 0) })
  return all
}

import type { Note } from './audio'

// Every sound of the game, as plain numbers. A pocket game has one small
// buzzer, so the voices are short square beeps, slides and ticks of noise.
// Sight and sound run on one clock: a sound belongs to the pose it is heard
// with, and the game asks for it in the frame that lights that pose. So no
// note here has a delay: a run of sounds is a run of poses, each with its own
// cue, and never one voice that plays on after its picture.
// Nobody has listened to these yet: they are written from the design sheet's
// words, and a test holds every pitch, peak and length in range.

const sq = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'tone', wave: 'square', frequency, peak, attack, decay, glideTo })
const tri = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'tone', wave: 'triangle', frequency, peak, attack, decay, glideTo })
const saw = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'tone', wave: 'sawtooth', frequency, peak, attack, decay, glideTo })
const sine = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'tone', frequency, peak, attack, decay, glideTo })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, glideTo })

export const VOICES = {
  // The dog. Asleep: a slow low snore. Then the three taps that wake him, and his tricks.
  dogSnore: [saw(104, 0.03, 0.22, 0.5, 78)],
  dogSnort: [hiss(320, 2.5, 0.16, 0.006, 0.11, 180), sq(1568, 0.1, 0.003, 0.06)],
  dogYawn: [tri(640, 0.13, 0.07, 0.46, 250)],
  dogCoil: [sq(196, 0.1, 0.004, 0.06, 150)],
  dogYip: [sq(520, 0.15, 0.008, 0.22, 1480)],
  dogThud: [hiss(150, 1.2, 0.26, 0.004, 0.17), sine(92, 0.2, 0.004, 0.2, 48)],
  dogFlapA: [hiss(900, 0.8, 0.1, 0.004, 0.06)],
  dogFlapB: [hiss(1300, 0.8, 0.1, 0.004, 0.06)],
  dogPant: [hiss(2200, 1.4, 0.05, 0.01, 0.07)],
  /** His jaws shut on air where the fly was. */
  dogSnap: [hiss(1500, 3, 0.035, 0.002, 0.04), sq(300, 0.03, 0.002, 0.04)],
  dogBarkA: [sq(430, 0.16, 0.004, 0.09, 330)],
  dogBarkB: [sq(480, 0.16, 0.004, 0.1, 350)],
  dogWhirr: [saw(300, 0.08, 0.02, 0.2, 940)],
  dogWhirrDown: [saw(900, 0.07, 0.01, 0.12, 420)],
  dogPaws: [hiss(320, 1, 0.14, 0.003, 0.08)],
  dogTick: [sq(1900, 0.06, 0.002, 0.03)],
  dogWhine: [tri(880, 0.09, 0.14, 0.5, 1240)],
  dogFlop: [hiss(220, 1, 0.12, 0.006, 0.16)],
  // The cushion.
  boingUp: [sine(180, 0.16, 0.008, 0.2, 540)],
  boingDown: [sine(430, 0.16, 0.008, 0.24, 140)],
  // The baker. Asleep: a deeper snore than the dog's and a thin whistle out.
  bakerSnore: [saw(74, 0.03, 0.3, 0.6, 62)],
  bakerWhistle: [sine(1500, 0.012, 0.2, 0.3, 1900)],
  bakerSnort: [hiss(520, 3, 0.15, 0.01, 0.18, 240), sq(196, 0.07, 0.01, 0.16)],
  bakerGrumble: [saw(98, 0.11, 0.05, 0.5, 70)],
  bakerHonk: [sq(233, 0.14, 0.01, 0.3, 220)],
  bakerFlop: [hiss(180, 1, 0.17, 0.005, 0.2)],
  bakerHide: [hiss(700, 0.7, 0.08, 0.03, 0.2, 300)],
  // The hen.
  henSquawk: [sq(980, 0.14, 0.004, 0.16, 1580), hiss(2600, 4, 0.05, 0.004, 0.1)],
  henClatter: [hiss(700, 2, 0.17, 0.003, 0.22), sq(300, 0.08, 0.004, 0.14, 150)],
  henCluck: [sq(740, 0.09, 0.004, 0.07, 560)],
  henRustle: [hiss(1500, 1, 0.06, 0.02, 0.12)],
  // The owl.
  owlHoo: [sine(392, 0.13, 0.04, 0.4, 349)],
  owlFlip: [sine(349, 0.12, 0.03, 0.28, 540)],
  owlWings: [hiss(600, 0.7, 0.11, 0.02, 0.25), sine(330, 0.08, 0.03, 0.3)],
  // The fly.
  flyDodge: [saw(240, 0.07, 0.02, 0.15, 340)],
  flyHop: [saw(230, 0.018, 0.02, 0.1, 290)],
  // The lamp.
  lampClick: [sq(2400, 0.1, 0.001, 0.03), sine(880, 0.05, 0.005, 0.3)],
  lampClack: [sq(1200, 0.09, 0.002, 0.05, 600)],
  // The three doors, and what peeps round each.
  potLid: [hiss(3000, 3, 0.1, 0.004, 0.09), sq(1320, 0.05, 0.003, 0.05)],
  duckSqueak: [sq(1100, 0.1, 0.01, 0.12, 1680)],
  weedPluck: [sine(660, 0.1, 0.004, 0.18, 990)],
  latch: [sq(300, 0.08, 0.002, 0.04), hiss(1200, 2, 0.05, 0.002, 0.05)],
  // The dog by day: asleep facing the wall, trotting ahead, and round.
  dogSnoreUp: [saw(96, 0.03, 0.2, 0.4, 132)],
  dogSnoreDown: [saw(128, 0.03, 0.2, 0.5, 70)],
  dogTrot: [hiss(2400, 1.4, 0.06, 0.006, 0.05), sq(1700, 0.04, 0.002, 0.03)],
  dogRoll: [sine(110, 0.14, 0.02, 0.3, 70), hiss(300, 1, 0.06, 0.02, 0.26)],
  dogBurp: [saw(140, 0.13, 0.01, 0.22, 86)],
  dogGobble: [hiss(900, 3, 0.13, 0.004, 0.07, 400), sq(260, 0.06, 0.004, 0.06)],
  // The bedroom's own things.
  bedPuff: [hiss(900, 0.6, 0.07, 0.03, 0.22, 400)],
  drawerKnock: [sine(170, 0.12, 0.003, 0.09, 120), hiss(700, 2, 0.05, 0.002, 0.04)],
  bakerYawn: [tri(330, 0.12, 0.09, 0.5, 140)],
  bakerHum: [tri(196, 0.1, 0.03, 0.3, 208)],
  bakerGiggle: [sq(620, 0.09, 0.006, 0.3, 880), tri(660, 0.06, 0.006, 0.3, 930)],
  bakerTrill: [sq(784, 0.09, 0.006, 0.34, 1175), tri(830, 0.06, 0.006, 0.34, 1100)],
  // The lamp, its cord and the doors.
  lampSwing: [sine(700, 0.07, 0.004, 0.16, 620)],
  lampOut: [sq(1800, 0.09, 0.001, 0.03), sine(440, 0.06, 0.006, 0.5, 220)],
  cordTickA: [sq(1320, 0.07, 0.002, 0.04)],
  cordTickB: [sq(1760, 0.08, 0.002, 0.05)],
  cordBack: [sine(900, 0.07, 0.003, 0.12, 1400)],
  doorCreak: [saw(210, 0.07, 0.02, 0.12, 330)],
  doorSwing: [hiss(500, 0.8, 0.08, 0.01, 0.16, 260)],
  // The fair: the pump, the balloon and the rubber.
  pumpWheezeA: [hiss(700, 3, 0.13, 0.05, 0.34, 1300)],
  pumpWheezeB: [hiss(950, 3, 0.14, 0.05, 0.34, 1800)],
  pumpWheezeC: [hiss(1300, 3, 0.15, 0.05, 0.34, 2600)],
  pumpEmpty: [hiss(500, 2, 0.08, 0.03, 0.18, 420)],
  burstCrack: [hiss(2800, 0.6, 0.24, 0.001, 0.09), sq(180, 0.14, 0.001, 0.08, 90)],
  rubberRasp: [saw(170, 0.13, 0.01, 0.42, 96)],
  rubberFlap: [hiss(420, 2, 0.1, 0.004, 0.07), saw(150, 0.05, 0.004, 0.08)],
  /** The second flap of the double flap: a little lower and softer. */
  rubberFlapB: [hiss(360, 2, 0.08, 0.004, 0.07), saw(132, 0.04, 0.004, 0.08)],
  balloonSqueak: [sine(1250, 0.1, 0.02, 0.22, 1900)],
  balloonRasp: [saw(260, 0.12, 0.01, 0.4, 110)],
  // The kitchen: the swatter, the fly, the ladle and the pot.
  swatSlap: [hiss(1600, 1, 0.2, 0.002, 0.07)],
  swatSplat: [hiss(600, 1.2, 0.22, 0.002, 0.12), saw(300, 0.08, 0.004, 0.3, 60)],
  ladleSalute: [sq(880, 0.09, 0.004, 0.12, 1320)],
  flyBuzzUp: [saw(210, 0.08, 0.02, 0.24, 420)],
  flyBzzt: [saw(250, 0.07, 0.006, 0.09, 190)],
  flyLazy: [saw(170, 0.06, 0.05, 0.4, 150), saw(177, 0.05, 0.05, 0.4, 162)],
  noseHonk: [sq(277, 0.15, 0.008, 0.22, 262)],
  soupPlop: [sine(520, 0.14, 0.004, 0.14, 150)],
  potBob: [sine(210, 0.11, 0.02, 0.28, 260)],
  potClink: [sq(2100, 0.06, 0.002, 0.05)],
  floodSlosh: [hiss(420, 0.8, 0.12, 0.12, 0.5, 700), sine(120, 0.05, 0.1, 0.5, 150)],
  pieHum: [tri(147, 0.09, 0.06, 0.34, 139)],
  // The henhouse.
  henShriek: [sq(1180, 0.15, 0.004, 0.2, 1960), hiss(3000, 4, 0.06, 0.004, 0.12)],
  henCluckLow: [sq(520, 0.07, 0.006, 0.09, 400)],
  henCluckLower: [sq(410, 0.06, 0.006, 0.11, 300)],
  eggTock: [sine(330, 0.16, 0.002, 0.1, 250)],
  eggCrack: [hiss(3600, 2, 0.17, 0.001, 0.05), sq(1500, 0.07, 0.001, 0.04)],
  eggRattle: [hiss(1100, 3, 0.1, 0.01, 0.2, 700), sine(240, 0.07, 0.01, 0.2, 200)],
  basketKnock: [sine(140, 0.15, 0.003, 0.13, 100)],
  chickPeep: [sine(2600, 0.08, 0.004, 0.07, 3100)],
  chickPeeps: [sine(2400, 0.08, 0.004, 0.3, 3400), sq(2900, 0.03, 0.004, 0.24, 3600)],
  rootTwang: [saw(196, 0.11, 0.003, 0.3, 233), sine(392, 0.06, 0.003, 0.3, 466)],
  // The bakery.
  pieFall: [sine(1100, 0.08, 0.004, 0.13, 520)],
  pieThump: [hiss(240, 1, 0.2, 0.004, 0.13), sine(110, 0.12, 0.004, 0.16, 70)],
  pieWobble: [sine(294, 0.09, 0.02, 0.34), sine(301, 0.08, 0.02, 0.34)],
  towerWhistle: [sine(1900, 0.11, 0.02, 0.33, 500)],
  pieSplat: [hiss(380, 0.9, 0.24, 0.002, 0.2), sine(86, 0.14, 0.004, 0.22, 58)],
  /** The second and the third splat of the three, each with the splat that lands. */
  pieSplatB: [hiss(460, 0.9, 0.2, 0.002, 0.16), sine(98, 0.12, 0.004, 0.18, 64)],
  pieSplatC: [hiss(320, 0.9, 0.22, 0.002, 0.22), sine(74, 0.14, 0.004, 0.24, 50)],
  tiptoeA: [sq(2200, 0.05, 0.002, 0.03)],
  tiptoeB: [sq(2500, 0.05, 0.002, 0.03)],
  trayWobble: [sine(240, 0.09, 0.02, 0.26), sine(249, 0.07, 0.02, 0.26)],
  piePuff: [hiss(700, 1.2, 0.09, 0.03, 0.26, 2200)],
  pieServe: [sq(660, 0.08, 0.006, 0.16, 990), hiss(500, 1, 0.07, 0.004, 0.1)],
  // The bathroom.
  wipeA: [sine(1900, 0.09, 0.01, 0.1, 2300)],
  wipeB: [sine(1600, 0.09, 0.01, 0.1, 1950)],
  wipeC: [sine(1350, 0.09, 0.01, 0.1, 1650)],
  wipeD: [sine(1120, 0.09, 0.01, 0.1, 1380)],
  batherYelp: [sq(900, 0.15, 0.004, 0.26, 1700)],
  batherGlug: [sine(300, 0.14, 0.01, 0.3, 90)],
  batherSquirt: [hiss(2600, 2, 0.1, 0.02, 0.26, 4200)],
  tapHiss: [hiss(4200, 0.6, 0.13, 0.03, 0.44)],
  dripA: [sine(1400, 0.08, 0.002, 0.06, 900)],
  dripB: [sine(1250, 0.08, 0.002, 0.06, 800)],
  dripC: [sine(1100, 0.08, 0.002, 0.07, 700)],
  // The garden.
  weedCreak: [saw(120, 0.09, 0.03, 0.34, 190)],
  weedCreakHi: [saw(190, 0.09, 0.02, 0.2, 300)],
  weedTwang: [saw(300, 0.11, 0.003, 0.22, 150)],
  weedPop: [sine(220, 0.2, 0.002, 0.1, 700), hiss(1800, 1, 0.1, 0.002, 0.06)],
  weedToot: [sq(233, 0.11, 0.006, 0.16)],
  wormPop: [sine(900, 0.07, 0.003, 0.07, 1300)],
  flowerPluck: [sine(740, 0.12, 0.003, 0.14, 1110)],
  petalGasp: [sine(523, 0.07, 0.01, 0.3), sine(659, 0.07, 0.01, 0.3), sine(784, 0.07, 0.01, 0.3)],
  owlHootDown: [sine(349, 0.13, 0.03, 0.4, 233)],
  // The dining room.
  soupGlug: [sine(180, 0.14, 0.01, 0.2, 330)],
  spoonTinkA: [sq(2637, 0.06, 0.001, 0.07)],
  spoonTinkB: [sq(3136, 0.06, 0.001, 0.08)],
  spoonRingOut: [sine(2637, 0.07, 0.002, 0.6), sine(2660, 0.04, 0.002, 0.6)],
  bowlTing: [sine(1760, 0.08, 0.002, 0.3)],
  soupPour: [hiss(900, 0.7, 0.11, 0.08, 0.6, 1700)],
  soupPatter: [hiss(2600, 2, 0.11, 0.004, 0.5, 1500), sine(150, 0.05, 0.004, 0.4)],
  soupGargle: [saw(110, 0.09, 0.02, 0.3, 140), saw(117, 0.07, 0.02, 0.3, 131)],
  soupSpray: [hiss(3200, 0.7, 0.17, 0.004, 0.22, 1800)],
  soupSplosh: [hiss(700, 0.8, 0.17, 0.004, 0.2, 300)],
  ladleBong: [sine(196, 0.16, 0.003, 0.5), sine(392, 0.05, 0.003, 0.3)],
  ladleDrip: [sine(1000, 0.07, 0.002, 0.08, 600)],
  dinerYelp: [sq(740, 0.13, 0.004, 0.2, 1240)],
  clonk: [sine(260, 0.15, 0.002, 0.12, 180), hiss(900, 2, 0.06, 0.002, 0.05)],
  // The glass, the case and its two buttons.
  glassThock: [sine(150, 0.13, 0.003, 0.1, 90)],
  caseKnock: [hiss(500, 2, 0.13, 0.002, 0.06), sine(200, 0.08, 0.003, 0.08)],
  buttonDown: [sq(1500, 0.08, 0.002, 0.04)],
  buttonUp: [sq(1000, 0.06, 0.002, 0.04)],
} as const satisfies Record<string, readonly Note[]>

export type Cue = keyof typeof VOICES

/** The notes of every cue of one moment, as one list: one touch, one voice. */
export function notesOf(cues: readonly Cue[]): Note[] {
  return cues.flatMap((cue) => VOICES[cue])
}

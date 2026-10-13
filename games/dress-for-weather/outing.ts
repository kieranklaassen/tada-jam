import type { Face } from './answers'
import { BUTTONS, PARTS, TUG_STEPS, ZIP_TEETH, type Figure, type Garment, type Part } from './kinds'
import type { Mark, Weather } from './save'
import { hiss, tone, up, type Sound } from './voices'

// The weather's answers: the last four columns of the design sheet's grid,
// the socks' row, and each figure's fixed tastes. Pure data and pure rules.
// A cell says how the garment moves (weathering.ts turns the name into
// numbers), what small things appear round it (the view draws them), what the
// figure and the dog do, and its sounds at their moments within the cell.
// outing.test.ts fails when two cells share a motion or a sound.

/** How a garment moves in a cell. Every move starts and ends at rest, except `blowoff`, which ends with the hat gone. */
export type Move =
  | 'none' | 'drum' | 'hang' | 'stiff' | 'sail' | 'hood' | 'stretch' | 'gape' | 'rattle' | 'droopy' | 'slosh' | 'whistle' | 'pulloff'
  | 'droop' | 'blowoff' | 'itch' | 'limp' | 'ruler' | 'stream' | 'mop' | 'wring' | 'pat' | 'kites' | 'peel' | 'stick' | 'prod' | 'bendump' | 'invert' | 'reed' | 'shade' | 'twirl' | 'tremble'

/** Where on a garment's paper small things appear. */
export type Anchor = 'top' | 'hem' | 'sides' | 'front'

/** The small things the weather adds round a garment or at the feet, drawn fresh while the cell plays. */
export type Bits =
  | { kind: 'drops'; at: Anchor; way: 'fall' | 'bounce' | 'jet' | 'burst'; n: number }
  | { kind: 'mound'; at: Anchor; shape: 'heap' | 'cone' | 'pile' | 'ball'; falls: boolean }
  | { kind: 'dots'; at: Anchor; way: 'in' | 'prints' | 'holes' | 'frost' }
  | { kind: 'streaks'; at: Anchor; way: 'gust' | 'hoot' | 'strings' }
  | { kind: 'wisps'; at: Anchor }
  | { kind: 'spark'; at: Anchor }
  | { kind: 'pool'; way: 'puddle' | 'shade' | 'grass' | 'soak' | 'blue' | 'toes' | 'flags' | 'trail' }

/** What the figure does in a cell, in its own manner (weathering.ts). */
export type Act =
  | 'strut' | 'hunch' | 'stiffstep' | 'towed' | 'fan' | 'sag' | 'sink' | 'leap' | 'planted' | 'wilt' | 'jump' | 'stomp' | 'onefoot' | 'peer' | 'chase' | 'scratch'
  | 'leanaway' | 'bite' | 'walk' | 'dumped' | 'lifted' | 'liedown' | 'squish' | 'hopfoot' | 'curl'
  | 'stamp' | 'tug' | 'straighten' | 'heron' | 'pats' | 'cower' | 'look' | 'togate'

/** What the dog does beside the figure. */
export type DogAct = 'soaked' | 'fetch' | 'squeeze' | 'flump' | 'shake'

export type Cell = {
  move: Move
  bits: Bits | null
  act: Act | null
  dog: DogAct | null
  /** The face the figure pulls while the cell plays, if the cell gives it one. */
  face: Face | null
  /** The sounds, each at its moment within the cell, 0 to 1. */
  notes: readonly (readonly [number, readonly Sound[]])[]
}

/** Seconds one cell plays, and the figure's own beat after them. */
export const CELL_SECONDS = 1.05
export const TASTE_SECONDS = 1.2
/** Seconds of the figure's own beat when it neither loves nor minds anything here: a look at the sky. */
export const PLAIN_SECONDS = 0.6

const cell = (move: Move, bits: Bits | null, act: Act | null, notes: Cell['notes'], more: Partial<Pick<Cell, 'dog' | 'face'>> = {}): Cell => ({ move, bits, act, dog: more.dog ?? null, face: more.face ?? null, notes })
const drops = (at: Anchor, way: 'fall' | 'bounce' | 'jet' | 'burst', n: number): Bits => ({ kind: 'drops', at, way, n })
const gust = (at: Anchor): Bits => ({ kind: 'streaks', at, way: 'gust' })

// Small sounds the cells are made of.
const tok = (i: number): Sound[] => [tone(up(700, i * 2), 0.11, 0.002, 0.045, 'square'), hiss(2000, 4, 0.04, 0.002, 0.02)]
const plip = (i: number): Sound[] => [tone(up(1300, -i * 3), 0.09, 0.003, 0.09, 'sine', up(1900, -i * 3))]
const creak = (from: number, to: number): Sound[] => [tone(from, 0.07, 0.03, 0.2, 'sawtooth', to), hiss(1200, 8, 0.04, 0.02, 0.16, 1500)]
const flap = (i: number): Sound[] => [hiss(500 + i * 90, 0.8, 0.13, 0.004, 0.07, 1400)]
const tickle = (f: number): Sound[] => [tone(f, 0.05, 0.002, 0.02, 'square')]
const sizzle: Sound[] = [hiss(4200, 0.7, 0.07, 0.08, 0.5, 3000)]
const squelch: Sound[] = [hiss(420, 2.5, 0.14, 0.02, 0.26, 180), tone(140, 0.08, 0.02, 0.22, 'sine', 90)]
const purr: Sound[] = [tone(82, 0.12, 0.08, 0.5, 'sawtooth', 76), tone(123, 0.05, 0.08, 0.5, 'triangle')]
const squeak: Sound[] = [tone(1500, 0.11, 0.004, 0.12, 'sine', 2600)]
const jingle = (i: number): Sound[] => [hiss(4600, 6, 0.07, 0.002, 0.04), tone(up(2100, i % 3), 0.04, 0.002, 0.05, 'triangle')]
const sigh: Sound[] = [hiss(1400, 0.6, 0.08, 0.1, 0.5, 500), tone(330, 0.04, 0.1, 0.5, 'sine', 180)]
const splosh: Sound[] = [hiss(700, 0.6, 0.18, 0.004, 0.4, 2200), tone(120, 0.14, 0.004, 0.2, 'sine', 70)]
const glug = (i: number): Sound[] => [tone(up(180, i * 3), 0.13, 0.01, 0.1, 'sine', up(300, i * 3))]
const crunch: Sound[] = [hiss(1800, 0.9, 0.14, 0.003, 0.11, 900), hiss(3600, 3, 0.05, 0.003, 0.05)]
const hoot = (f: number): Sound[] => [tone(f, 0.1, 0.06, 0.3, 'sine'), hiss(f * 2, 9, 0.03, 0.06, 0.24)]
const pop: Sound[] = [tone(380, 0.15, 0.002, 0.07, 'sine', 900), hiss(2400, 2, 0.05, 0.002, 0.03)]
const blub: Sound[] = [tone(240, 0.12, 0.02, 0.2, 'sine', 150), tone(200, 0.06, 0.02, 0.12, 'sine', 260)]
const poof: Sound[] = [hiss(900, 0.5, 0.15, 0.01, 0.3, 300)]
const whee: Sound[] = [tone(600, 0.1, 0.05, 0.5, 'sine', 1800)]
const skritch = (i: number): Sound[] => [hiss(3200 - i * 300, 5, 0.09, 0.004, 0.06, 2200)]
const slurp: Sound[] = [hiss(600, 4, 0.12, 0.04, 0.34, 1700), tone(200, 0.05, 0.04, 0.3, 'sine', 420)]
const ting: Sound[] = [tone(2637, 0.12, 0.002, 0.5, 'sine'), tone(3951, 0.05, 0.002, 0.3, 'sine')]
const crack: Sound[] = [hiss(3000, 0.7, 0.18, 0.002, 0.05), tone(900, 0.08, 0.002, 0.04, 'square', 300)]
const wipe = (i: number): Sound[] => [hiss(1100 + i * 250, 2, 0.08, 0.03, 0.14, 1700)]
const trickle: Sound[] = [tone(1700, 0.05, 0.004, 0.06, 'sine', 1200), tone(1500, 0.04, 0.004, 0.07, 'sine', 1000)]
const pst = (i: number): Sound[] => [hiss(3800 + i * 500, 3, 0.11, 0.004, 0.09)]
const pat = (i: number): Sound[] => [tone(150 + i * 14, 0.11, 0.004, 0.05, 'sine', 110), hiss(500, 1, 0.05, 0.004, 0.04)]
const flump: Sound[] = [hiss(260, 0.6, 0.17, 0.008, 0.26), tone(90, 0.12, 0.008, 0.2, 'sine', 64)]
const flutter = (i: number): Sound[] => [hiss(2600 + (i % 2) * 700, 1.5, 0.08, 0.004, 0.05)]
const smack: Sound[] = [hiss(1900, 2, 0.12, 0.002, 0.03), tone(520, 0.09, 0.002, 0.07, 'sine', 820)]
const drum = (i: number): Sound[] => [tone(up(230, (i * 5) % 7), 0.1, 0.002, 0.05, 'triangle'), hiss(1400, 1.5, 0.06, 0.002, 0.03)]
const tap: Sound[] = [tone(1000, 0.1, 0.002, 0.035, 'triangle', 700), hiss(2600, 3, 0.04, 0.002, 0.02)]
const pfft: Sound[] = [hiss(1500, 1, 0.09, 0.006, 0.09, 700)]
const fwop: Sound[] = [hiss(450, 0.7, 0.18, 0.004, 0.14, 1500), tone(170, 0.1, 0.004, 0.12, 'triangle', 300)]
const whistleUp: Sound[] = [tone(700, 0.09, 0.06, 0.5, 'sine', 2400)]
const reed: Sound[] = [tone(196, 0.09, 0.05, 0.5, 'sawtooth'), tone(198, 0.05, 0.05, 0.5, 'square')]
const hum: Sound[] = [tone(174, 0.1, 0.12, 0.45, 'sine', 196), tone(261, 0.04, 0.12, 0.45, 'sine')]
const whirr: Sound[] = [tone(300, 0.07, 0.05, 0.4, 'triangle', 520), hiss(2200, 6, 0.03, 0.05, 0.4)]
const squish = (i: number): Sound[] => [hiss(520 + i * 120, 3, 0.12, 0.012, 0.13, 300)]
const chatter = (i: number): Sound[] => [tone(1800 + (i % 2) * 300, 0.05, 0.002, 0.015, 'square')]
const patter = (i: number): Sound[] => [hiss(2900, 4, 0.06, 0.002, 0.025), tone(700 + (i % 3) * 120, 0.03, 0.002, 0.02, 'triangle')]
const happyCreak: Sound[] = [tone(300, 0.07, 0.04, 0.3, 'sawtooth', 460)]

type Pair = { fast: Cell; loose: Cell }

/**
 * Garment by weather. Where the sheet gives two answers, `fast` is the garment done up (the raincoat zipped to
 * the top, all three buttons through, the boots tugged right on wherever they are worn, the umbrella open) and `loose` is
 * it otherwise.
 */
export const CELLS: Record<Garment, Record<Weather, Cell | Pair>> = {
  raincoat: {
    rain: {
      fast: cell('drum', drops('top', 'bounce', 6), 'strut', [[0.08, tok(0)], [0.34, tok(1)], [0.6, tok(2)]], { face: 'proud' }),
      loose: cell('hang', drops('hem', 'fall', 3), 'hunch', [[0.25, plip(0)], [0.62, plip(1)]], { face: 'oh' }),
    },
    snow: cell('stiff', { kind: 'dots', at: 'front', way: 'frost' }, 'stiffstep', [[0.15, creak(180, 240)], [0.6, creak(210, 150)]], { face: 'wide' }),
    wind: {
      fast: cell('hood', gust('top'), null, [[0.1, tickle(1500)], [0.22, tickle(1700)], [0.34, tickle(1500)], [0.46, tickle(1800)], [0.58, tickle(1600)]], { face: 'chin' }),
      loose: cell('sail', gust('sides'), 'towed', [[0.05, flap(0)], [0.25, flap(2)], [0.45, flap(1)], [0.65, flap(3)]], { face: 'wide' }),
    },
    sun: cell('none', { kind: 'wisps', at: 'top' }, 'fan', [[0.1, sizzle]], { face: 'huff' }),
  },
  duffel: {
    rain: cell('stretch', drops('hem', 'fall', 5), 'sag', [[0.2, squelch]], { face: 'down' }),
    snow: {
      fast: cell('none', { kind: 'mound', at: 'top', shape: 'heap', falls: false }, 'sink', [[0.2, purr]], { face: 'cosy' }),
      loose: cell('gape', { kind: 'dots', at: 'front', way: 'in' }, 'leap', [[0.35, squeak]], { face: 'wide' }),
    },
    wind: cell('rattle', gust('front'), 'planted', [0.05, 0.2, 0.35, 0.5, 0.65, 0.8].map((at, i) => [at, jingle(i)] as const), { face: 'proud' }),
    sun: cell('droopy', { kind: 'pool', way: 'puddle' }, 'wilt', [[0.1, sigh]], { face: 'huff' }),
  },
  boots: {
    rain: {
      fast: cell('none', drops('hem', 'burst', 12), 'jump', [[0.42, splosh]], { dog: 'soaked', face: 'giggle' }),
      loose: cell('slosh', drops('top', 'fall', 4), null, [[0.15, glug(0)], [0.4, glug(1)], [0.65, glug(2)]], { face: 'down' }),
    },
    snow: cell('none', { kind: 'dots', at: 'hem', way: 'prints' }, 'stomp', [[0.2, crunch], [0.62, crunch]], { face: 'grin' }),
    wind: cell('whistle', { kind: 'streaks', at: 'top', way: 'hoot' }, null, [[0.1, hoot(392)], [0.52, hoot(330)]], { face: 'down' }),
    sun: cell('pulloff', { kind: 'pool', way: 'toes' }, 'onefoot', [[0.4, pop]], { face: 'tongue' }),
  },
  hat: {
    rain: cell('droop', drops('top', 'fall', 3), null, [[0.2, blub]], { face: 'crossed' }),
    snow: cell('none', { kind: 'mound', at: 'top', shape: 'cone', falls: true }, 'peer', [[0.72, poof]], { face: 'crossed' }),
    wind: cell('blowoff', gust('top'), 'chase', [[0.05, whee]], { dog: 'fetch', face: 'oh' }),
    sun: cell('itch', { kind: 'spark', at: 'top' }, 'scratch', [[0.15, skritch(0)], [0.4, skritch(1)], [0.65, skritch(2)]], { face: 'crossed' }),
  },
  scarf: {
    rain: cell('limp', { kind: 'pool', way: 'trail' }, null, [[0.3, slurp]], { face: 'down' }),
    snow: cell('ruler', { kind: 'spark', at: 'hem' }, 'togate', [[0.55, ting]], { face: 'oh' }),
    wind: cell('stream', gust('hem'), 'leanaway', [[0.5, crack]], { face: 'wide' }),
    sun: cell('mop', drops('hem', 'fall', 4), null, [[0.1, wipe(0)], [0.35, wipe(1)], [0.7, trickle]], { face: 'huff' }),
  },
  mittens: {
    rain: cell('wring', drops('sides', 'jet', 6), null, [[0.3, pst(0)], [0.6, pst(1)]], { face: 'grin' }),
    snow: cell('pat', { kind: 'mound', at: 'front', shape: 'ball', falls: true }, null, [[0.08, pat(0)], [0.24, pat(1)], [0.4, pat(2)], [0.86, flump]], { dog: 'flump', face: 'giggle' }),
    wind: cell('kites', { kind: 'streaks', at: 'hem', way: 'strings' }, null, [0.1, 0.25, 0.4, 0.55, 0.7].map((at, i) => [at, flutter(i)] as const), { face: 'oh' }),
    sun: cell('peel', null, 'bite', [[0.55, smack]], { face: 'tongue' }),
  },
  umbrella: {
    rain: {
      fast: cell('tremble', drops('top', 'bounce', 9), null, [0.04, 0.16, 0.28, 0.4, 0.52, 0.64, 0.76].map((at, i) => [at, drum(i)] as const), { dog: 'squeeze', face: 'cosy' }),
      loose: cell('stick', null, 'walk', [[0.25, tap], [0.65, tap]], { face: 'proud' }),
    },
    snow: {
      fast: cell('bendump', { kind: 'mound', at: 'top', shape: 'pile', falls: true }, 'dumped', [[0.74, flump], [0.78, poof]], { face: 'wide' }),
      loose: cell('prod', { kind: 'dots', at: 'hem', way: 'holes' }, null, [[0.25, pfft], [0.65, pfft]], { face: 'down' }),
    },
    wind: {
      fast: cell('invert', gust('top'), 'lifted', [[0.08, fwop], [0.2, whistleUp]], { face: 'wide' }),
      loose: cell('reed', gust('sides'), null, [[0.1, reed]], { face: 'chin' }),
    },
    sun: {
      fast: cell('shade', { kind: 'pool', way: 'shade' }, 'liedown', [[0.3, hum]], { face: 'cosy' }),
      loose: cell('twirl', null, null, [[0.1, whirr]], { face: 'proud' }),
    },
  },
}

/** Bare feet in socks, by weather. */
export const SOCKS: Record<Weather, Cell> = {
  rain: cell('none', { kind: 'pool', way: 'soak' }, 'squish', [[0.2, squish(0)], [0.6, squish(1)]]),
  snow: cell('none', { kind: 'pool', way: 'blue' }, 'hopfoot', [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((at, i) => [at, chatter(i)] as const)),
  wind: cell('none', { kind: 'pool', way: 'flags' }, null, [0.15, 0.27, 0.39, 0.55, 0.67, 0.79].map((at, i) => [at, patter(i)] as const)),
  sun: cell('none', { kind: 'pool', way: 'grass' }, 'curl', [[0.3, happyCreak]]),
}

/** What a figure has on and how it is done up, as it steps out: a copy, so the outing shows what went out whatever is saved meanwhile. */
export type Outfit = {
  who: Figure
  /** What it wears, from the head down to the feet. */
  worn: readonly { garment: Garment; part: Part }[]
  zip: number
  buttons: readonly boolean[]
  tug: number
  open: boolean
  weather: Weather
  /** What the dog has on its back. */
  dog: Garment | null
}

/** Whether a garment counts as done up in this outfit. */
export function fastened(outfit: Outfit, garment: Garment): boolean {
  switch (garment) {
    case 'raincoat':
      return outfit.zip >= ZIP_TEETH
    case 'duffel':
      return outfit.buttons.length >= BUTTONS && outfit.buttons.every(Boolean)
    case 'boots':
      return outfit.tug >= TUG_STEPS
    case 'umbrella':
      return outfit.open
    default:
      return false
  }
}

/** The baby's squeal, `i` squeals in: each starts where the last one ended and goes higher. */
const squeal = (i: number): Sound[] => [tone(up(880, i * 4), 0.1, 0.02, 0.26, 'sine', up(1480, i * 4))]

/**
 * The open umbrella in the wind is the one thing that makes the baby forget the noise: carried off the lawn it
 * squeals all the way over the hedge, with a face to match. The same cell for the baby, with its squeals laid
 * on the lift.
 */
export function squealing(cell: Cell): Cell {
  return { ...cell, face: 'giggle', notes: [...cell.notes, [0.3, squeal(0)], [0.5, squeal(1)], [0.7, squeal(2)]] }
}

export function cellOf(outfit: Outfit, garment: Garment): Cell {
  const found = CELLS[garment][outfit.weather]
  const cell = 'fast' in found ? (fastened(outfit, garment) ? found.fast : found.loose) : found
  return outfit.who === 'baby' && cell.move === 'invert' ? squealing(cell) : cell
}

/** The garments that count as wool for a figure that minds the heat. */
export const WOOL: readonly Garment[] = ['duffel', 'hat', 'scarf', 'mittens']
/** The garments the grandfather feels wrapped up in. */
export const WRAPS: readonly Garment[] = ['scarf', 'duffel', 'hat']

/** What a figure shows of its own at the end of an outing: the one thing it minds here, or else the thing it loves, or else a look at the sky. */
export type Taste = { feels: 'minds' | 'loves' | 'plain'; act: Act; face: Face; notes: Cell['notes']; /** The baby's hands go over its ears. */ ears: boolean }

const has = (outfit: Outfit, garment: Garment): boolean => outfit.worn.some((w) => w.garment === garment)
const on = (outfit: Outfit, part: Part): Garment | null => outfit.worn.find((w) => w.part === part)?.garment ?? null

export function tasteOf(outfit: Outfit): Taste {
  const w = outfit.weather
  switch (outfit.who) {
    case 'child':
      // Minds being hot in wool; loves water.
      if (w === 'sun' && WOOL.some((garment) => has(outfit, garment))) return { feels: 'minds', act: 'tug', face: 'huff', ears: false, notes: [[0.1, [hiss(900, 1, 0.1, 0.05, 0.3, 500)]], [0.55, [hiss(900, 1, 0.1, 0.05, 0.3, 500)]]] }
      if (w === 'rain') return { feels: 'loves', act: 'stamp', face: on(outfit, 'feet') === 'boots' ? 'grin' : 'giggle', ears: false, notes: [[0.1, squish(2)], [0.35, squish(3)], [0.6, squish(2)], [0.62, [tone(880, 0.07, 0.01, 0.1, 'sine', 1320)]]] }
      break
    case 'grandfather':
      // Minds wet feet; loves being wrapped up, in any weather.
      if ((w === 'rain' || w === 'snow') && on(outfit, 'feet') !== 'boots') return { feels: 'minds', act: 'heron', face: 'huff', ears: false, notes: [[0.2, squish(0)], [0.7, squish(1)], [0.72, [tone(196, 0.06, 0.05, 0.3, 'triangle', 147)]]] }
      if (WRAPS.some((garment) => has(outfit, garment))) return { feels: 'loves', act: 'straighten', face: 'proud', ears: false, notes: [[0.15, [tone(147, 0.09, 0.08, 0.4, 'triangle', 165), tone(220, 0.04, 0.08, 0.4, 'sine')]]] }
      break
    case 'baby':
      // Minds the noise of the wind, unless an open umbrella has carried it off; loves anything on its head.
      if (w === 'wind' && !(has(outfit, 'umbrella') && outfit.open)) return { feels: 'minds', act: 'cower', face: 'huff', ears: true, notes: [[0.1, [tone(520, 0.08, 0.04, 0.3, 'sine', 400)]], [0.55, [tone(480, 0.07, 0.04, 0.3, 'sine', 360)]]] }
      if (on(outfit, 'head')) return { feels: 'loves', act: 'pats', face: 'giggle', ears: false, notes: [[0.05, [tone(880, 0.09, 0.02, 0.14, 'sine', 1320)]], [0.3, [tone(990, 0.09, 0.02, 0.14, 'sine', 1480)]], [0.55, pat(4)], [0.72, pat(5)]] }
      break
  }
  return { feels: 'plain', act: 'look', face: 'rest', ears: false, notes: [[0.2, [tone(392, 0.05, 0.05, 0.25, 'sine', 440)]]] }
}

/** Whether the wind takes the hat: it does wherever the hat is worn. */
export function hatBlows(outfit: Outfit): boolean {
  return outfit.weather === 'wind' && has(outfit, 'hat')
}

/** What an outing leaves on a garment that was out in it. */
export function markAfter(weather: Weather, before: Mark): Mark {
  return weather === 'rain' ? 'wet' : weather === 'snow' ? 'snowy' : before
}

/** One thing the outing plays: a garment's cell on the part it is worn on, the socks' cell, or the figure's own beat. */
export type Step = { kind: 'cell'; garment: Garment; part: Part; cell: Cell } | { kind: 'socks'; cell: Cell } | { kind: 'taste'; taste: Taste }

/** What the outing plays, in order: each part that holds a garment from the head down, the socks if the feet are bare, then the figure's own beat. */
export function stepsOf(outfit: Outfit): Step[] {
  const steps: Step[] = []
  for (const part of PARTS) {
    const garment = on(outfit, part)
    if (garment) steps.push({ kind: 'cell', garment, part, cell: cellOf(outfit, garment) })
  }
  if (!on(outfit, 'feet')) steps.push({ kind: 'socks', cell: SOCKS[outfit.weather] })
  steps.push({ kind: 'taste', taste: tasteOf(outfit) })
  return steps
}

/** Seconds one step plays. */
export function lastsOf(step: Step): number {
  return step.kind !== 'taste' ? CELL_SECONDS : step.taste.feels === 'plain' ? PLAIN_SECONDS : TASTE_SECONDS
}

/** Seconds the steps take, without the sheet turning over and back. */
export function secondsOf(steps: readonly Step[]): number {
  return steps.reduce((sum, step) => sum + lastsOf(step), 0)
}

/** Every cell there is, with a name, for the tests and the view's own checks. */
export function everyCell(): { name: string; cell: Cell }[] {
  const out: { name: string; cell: Cell }[] = []
  for (const [garment, row] of Object.entries(CELLS)) {
    for (const [weather, found] of Object.entries(row)) {
      if ('fast' in found) out.push({ name: `${garment} ${weather} done up`, cell: found.fast }, { name: `${garment} ${weather} loose`, cell: found.loose })
      else out.push({ name: `${garment} ${weather}`, cell: found })
    }
  }
  for (const [weather, found] of Object.entries(SOCKS)) out.push({ name: `socks ${weather}`, cell: found })
  return out
}

/** The one cell a figure plays with sounds of its own: the baby carried off by the open umbrella. */
export function babyCarried(): Cell {
  const found = CELLS.umbrella.wind
  return squealing('fast' in found ? found.fast : found)
}

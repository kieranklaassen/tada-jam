// The world of Rocket Penguin: a strip of snow that goes on for ever, with
// things to land on along the ground and things to fly through above it, laid
// out by a hash so the same session always has the same seal in the same place
// (a second try can aim for it).

export const PX = 10 // pixels per metre
export const CHUNK = 700
export const ALT_CLOUDS = 1600
export const ALT_HIGH = 4000
export const ALT_SPACE = 8000
export const ALT_MOON = 16000

export type Kind =
  | 'seal'
  | 'tramp'
  | 'spring'
  | 'whale'
  | 'snowman'
  | 'bear'
  | 'coin'
  | 'balloon'
  | 'bird'
  | 'cloud'
  | 'plane'
  | 'star'
  | 'sat'
  | 'ufo'
  | 'fuel'

export interface Item {
  kind: Kind
  x: number
  // Altitude in pixels; 0 is the snow.
  y: number
  taken: boolean
  // stage.time of the last hit, for squash and cooldown.
  hitAt: number
  seed: number
}

// How wide and tall a ground thing catches the penguin. Wider than it is drawn.
export const GROUND: Partial<Record<Kind, { hw: number; h: number }>> = {
  seal: { hw: 140, h: 75 },
  tramp: { hw: 145, h: 62 },
  spring: { hw: 115, h: 85 },
  whale: { hw: 140, h: 300 },
  snowman: { hw: 110, h: 150 },
  bear: { hw: 135, h: 170 },
}

// How close the penguin's path must pass to touch a thing in the air.
export const REACH: Partial<Record<Kind, number>> = {
  coin: 100,
  balloon: 105,
  bird: 95,
  cloud: 150,
  plane: 115,
  star: 105,
  sat: 105,
  ufo: 125,
  fuel: 110,
}

export function hash(a: number, b: number, seed: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export function genChunk(ci: number, seed: number): Item[] {
  const out: Item[] = []
  if (ci < 0) return out
  const x0 = ci * CHUNK
  const add = (kind: Kind, x: number, y: number) => {
    out.push({ kind, x, y, taken: false, hitAt: -10, seed: hash(out.length, ci, seed + 7) })
  }
  const coinArc = (cx: number, alt: number) => {
    for (let j = -2; j <= 2; j++) add('coin', cx + j * 85, alt + (4 - j * j) * 20)
  }
  const coinLine = (cx: number, alt: number, slope: number) => {
    for (let j = 0; j < 5; j++) add('coin', cx + j * 90, alt + j * slope)
  }

  // The ground. The first 420 metres are laid out by hand, so a first run
  // meets a seal, a snowman to smash and a trampoline in that order, and a
  // spring is the prize for getting further. After that the hash decides, and
  // what it can choose widens with distance.
  const m = x0 / PX
  const START: (readonly [Kind, number] | null)[] = [['seal', 600], ['snowman', 1130], ['tramp', 1560], ['seal', 2420], ['snowman', 3080], ['spring', 3820]]
  if (ci < START.length) {
    const first = START[ci]
    if (first) add(first[0], first[1], 0)
    if (ci === 0) {
      // Coins along a good first shot: the arc shows where a launch goes.
      for (let j = 0; j < 6; j++) {
        const t = 0.2 + j * 0.13
        add('coin', 110 + 640 * t, 325 + 330 * t - 270 * t * t)
      }
    }
  } else if (hash(ci, 1, seed) < 0.64) {
    const k = hash(ci, 2, seed)
    let kind: Kind = 'seal'
    if (m < 800) kind = k < 0.34 ? 'seal' : k < 0.6 ? 'tramp' : k < 0.8 ? 'snowman' : k < 0.92 ? 'spring' : 'whale'
    else kind = k < 0.28 ? 'seal' : k < 0.5 ? 'tramp' : k < 0.68 ? 'snowman' : k < 0.8 ? 'spring' : k < 0.9 ? 'whale' : 'bear'
    add(kind, x0 + 130 + hash(ci, 3, seed) * (CHUNK - 260), 0)
  }
  if (ci > 0 && hash(ci, 4, seed) < 0.35) {
    // A few coins lying low, for a skid to sweep up.
    const cx = x0 + hash(ci, 5, seed) * 300
    for (let j = 0; j < 4; j++) add('coin', cx + j * 80, 55)
  }

  // The air, in rows of altitude. Each band has its own things.
  for (let row = 0; row < 26; row++) {
    const alt = 330 + row * 640 + hash(ci, 10 + row, seed) * 320
    if (alt > ALT_MOON - 1100) break
    if (ci === 0 && alt < 1300) continue
    const r = hash(ci, 40 + row, seed)
    const x = x0 + hash(ci, 70 + row, seed) * (CHUNK - 100)
    if (alt < 1150) {
      if (r < 0.4) coinArc(x, alt)
      else if (r < 0.52) add('balloon', x, alt)
      else if (r < 0.64) add('bird', x, alt)
      else if (r < 0.68) add('fuel', x, alt)
    } else if (alt < ALT_HIGH) {
      if (r < 0.28) add('cloud', x, alt)
      else if (r < 0.54) coinLine(x, alt, 28)
      else if (r < 0.64) add('bird', x, alt)
      else if (r < 0.7) add('balloon', x, alt)
      else if (r < 0.74) add('fuel', x, alt)
    } else if (alt < ALT_SPACE) {
      if (r < 0.2) add('plane', x, alt)
      else if (r < 0.48) coinLine(x, alt, -20)
      else if (r < 0.58) add('cloud', x, alt)
      else if (r < 0.63) add('fuel', x, alt)
    } else {
      if (r < 0.4) add('star', x, alt)
      else if (r < 0.54) add('sat', x, alt)
      else if (r < 0.6) add('ufo', x, alt)
      else if (r < 0.62) add('fuel', x, alt)
      else if (r < 0.8) coinArc(x, alt)
    }
  }
  return out
}

// The right-hand altitude strip is not to scale: each landmark gets a quarter.
export function altFrac(alt: number): number {
  const marks = [0, ALT_CLOUDS, ALT_HIGH, ALT_SPACE, ALT_MOON]
  if (alt <= 0) return 0
  for (let i = 1; i < marks.length; i++) {
    if (alt <= marks[i]!) return (i - 1 + (alt - marks[i - 1]!) / (marks[i]! - marks[i - 1]!)) / 4
  }
  return 1
}
